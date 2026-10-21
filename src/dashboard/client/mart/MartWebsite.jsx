import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Globe, ImagePlus, Loader2, Lock, Plus, Save, Trash2 } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import MsView, { MsThumb } from "../../../msite/MsView";
import { MS_LOOKS, MS_LOOK_KEYS, msLookDesc, msLookName } from "../../../msite/looks";
import { InboxPanel, PagesPanel } from "./MartSitePages";
import { fmtDate } from "./text";
import { useWText } from "./wtext";

const SHOW_KEYS = ["products", "prices", "stock", "about", "hours", "contact", "map", "contact_form"];
const PRESETS = ["#0F766E", "#16A34A", "#2563EB", "#7C3AED", "#DB2777", "#DC2626", "#EA580C", "#CA8A04", "#0891B2", "#111827"];
const pick = (s) => ({
  slug: s.slug || "",
  published: !!s.published,
  theme: s.theme || "classic",
  color: s.color || "",
  tagline: s.tagline || "",
  about: s.about || "",
  hours: s.hours || "",
  map_url: s.map_url || "",
  facebook: s.facebook || "",
  telegram: s.telegram || "",
  show: { products: true, prices: true, stock: false, about: true, hours: true, contact: true, map: true, contact_form: true, ...(s.show || {}) },
  hidden_categories: (s.hidden_categories || []).map(String),
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Website (mart_website): the shop's own page at /m/<slug> — info, parts on/off, which products, 36 looks
export function WebsiteTab({ ctx }) {
  const { readOnly, lang } = ctx;
  const w = useWText();
  const [info, setInfo] = useState(null);
  const [f, setF] = useState(null);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState("edit");
  const [busy, setBusy] = useState("");
  const [slugState, setSlugState] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(
    () =>
      ctx.api
        .site(ctx.id)
        .then((r) => {
          setInfo(r.data);
          setF((old) => old || pick({ ...r.data.site, slug: r.data.site.slug || r.data.suggested_slug }));
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx],
  );
  useEffect(() => {
    load();
    ctx.api
      .products(ctx.id)
      .then((r) => setProducts(Array.isArray(r.data) ? r.data : r.data?.rows || []))
      .catch(() => {});
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  // is the address free? (after typing stops)
  useEffect(() => {
    if (!f || !info || f.slug === (info.site.slug || "")) return setSlugState(null);
    const timer = setTimeout(() => {
      ctx.api
        .checkSlug(ctx.id, f.slug)
        .then((r) => setSlugState(r.data))
        .catch(() => setSlugState(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [f?.slug, info?.site?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // the live preview: unsaved changes on top of the shop's real products
  const preview = useMemo(() => {
    if (!info || !f) return null;
    const units = new Map((ctx.data.units || []).map((u) => [String(u._id), u]));
    const hidden = new Set(f.hidden_categories);
    const stockOn = !!info.stock_on;
    const prods = products
      .filter((p) => p.active !== false && (!p.category_id || !hidden.has(String(p.category_id))))
      .slice(0, 60)
      .map((p) => {
        const u = units.get(String(p.unit_id));
        const tracked = stockOn && p.track_stock;
        return {
          _id: p._id,
          name: p.name,
          category_id: p.category_id || null,
          ...(f.show.prices ? { price: p.price } : {}),
          unit_en: u ? u.name_en || u.name_km : "",
          unit_km: u ? u.name_km || u.name_en : "",
          photo: p.photo?.url || p.photo || "",
          ...(tracked ? { soldout: p.stock <= 0, ...(f.show.stock && p.stock > 0 && p.stock <= (p.low_stock ?? 5) ? { left: p.stock } : {}) } : {}),
        };
      });
    const used = new Set(prods.map((p) => String(p.category_id)));
    const b = info.business;
    return {
      slug: f.slug,
      theme: f.theme,
      color: f.color,
      business: { name: b.name, logo: b.logo_url, ...(f.show.contact ? { phone: b.phone, address: b.address, facebook: f.facebook, telegram: f.telegram } : {}) },
      tagline: f.tagline,
      cover: info.site.cover?.url || "",
      pages: (info.site.pages || []).filter((x) => x.visible !== false).map((x) => ({ key: x.key, title: x.title, body: x.body, image: x.image?.url || "" })),
      about: f.show.about ? f.about : "",
      hours: f.show.hours ? f.hours : "",
      map_url: f.show.map ? f.map_url : "",
      show: f.show,
      currency: ctx.data.settings.currency,
      categories: f.show.products ? info.categories.filter((c) => !hidden.has(String(c._id)) && used.has(String(c._id))) : [],
      products: f.show.products ? prods : [],
      shop: { open: !!info.shop?.active, pickup: ctx.data.settings.pickup_on !== false, delivery: ctx.data.settings.delivery_on !== false, delivery_fee: ctx.data.settings.delivery_fee || 0, min_order: ctx.data.settings.min_order || 0 },
    };
  }, [info, f, products, ctx.data]);

  if (!info || !f) return <p className="rs-muted">…</p>;
  const addon = info.addon;
  const on = !!addon.active;
  const site = info.site;
  const saved = pick(site);
  const dirty = !same(saved, f);
  const url = site.slug ? `${window.location.origin}/m/${site.slug}` : "";
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));
  const save = async (patch) => {
    setBusy("save");
    try {
      const r = await ctx.api.saveSite(ctx.id, patch || f);
      setInfo(r.data);
      setF(pick(r.data.site));
      ctx.notify({ type: "success", text: w.saved });
    } catch (e) {
      if (e.status === 402 && e.response?.product) ctx.askBuy({ addon: e.response.product, item: e.response.item, onDone: load });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const cover = async (file) => {
    setBusy("cover");
    try {
      const r = file ? await ctx.api.siteCover(ctx.id, file) : await ctx.api.removeSiteCover(ctx.id);
      setInfo(r.data);
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "mart_website" });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const togglePublish = () => {
    if (!on && !f.published) return ctx.askBuy({ addon: "mart_website" });
    save({ ...f, published: !f.published });
  };

  return (
    <div className="rs-col ghw">
      <section className="panel-card ghw-top">
        <span className="rs-addon-ic">
          <Globe size={24} />
        </span>
        <div className="ghw-top-text">
          <h2 style={{ margin: 0 }}>{w.siteTitle}</h2>
          <p className="rs-muted" style={{ margin: "4px 0 0" }}>
            {on ? w.siteOn.replace("{date}", fmtDate(addon.expires_at, lang)) : w.siteOff.replace("{price}", addon.price ?? 110)}
          </p>
        </div>
        {(!on || addon.status === "expiring") && (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon: "mart_website" })} disabled={readOnly}>
            <CoinIcon size={15} /> {on ? w.renew : w.unlockYear.replace("{coins}", addon.price ?? 110)}
          </button>
        )}
      </section>

      <section className="panel-card ghw-addr">
        <div className="ghw-addr-row">
          <label className="ghw-addr-field">
            <b>{w.address}</b>
            <span className="ghw-url">
              <small>{window.location.host}/m/</small>
              <input
                value={f.slug}
                onChange={(e) =>
                  set("slug")(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "")
                      .slice(0, 40),
                  )
                }
                disabled={readOnly}
                placeholder="my-shop"
                aria-label={w.address}
              />
            </span>
            <small className={`ghw-slug ${slugState ? (slugState.available ? "ok" : "bad") : ""}`}>{slugState ? (slugState.available ? `✓ ${w.slugFree}` : slugState.reason === "format" ? w.slugFormat : w.slugTaken) : w.addressHint}</small>
          </label>
          <div className="ghw-pub">
            <button type="button" className={`ghw-switch ${f.published ? "on" : ""}`} role="switch" aria-checked={f.published} onClick={togglePublish} disabled={readOnly || !!busy} data-testid="mw-publish">
              <i />
            </button>
            <span>
              <b>{f.published ? w.published : w.hidden}</b>
              <small className="rs-muted">{f.published ? w.publishedSub : w.hiddenSub}</small>
            </span>
          </div>
        </div>
        {url && site.published && site.slug === f.slug && (
          <div className="ghw-link">
            <a href={url} target="_blank" rel="noreferrer">
              {url}
            </a>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => navigator.clipboard?.writeText(url).then(() => ctx.notify({ type: "success", text: w.copied }))}>
              <Copy size={14} /> {w.copy}
            </button>
            <a className="md-btn md-btn-ghost sa-btn-sm" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> {w.open}
            </a>
          </div>
        )}
      </section>

      <div className="ghw-tabs" role="tablist">
        {["edit", "pages", "looks", "inbox"].map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {w.siteTabs[k]}
            {k === "inbox" && info.unread > 0 && <em>{info.unread}</em>}
            {k === "pages" && (site.pages || []).length > 0 && <em className="mw-count">{site.pages.length}</em>}
          </button>
        ))}
      </div>

      {tab === "edit" && (
        <div className="ghw-split">
          <div className="ghw-form">
            <section className="panel-card ghw-panel">
              <div className="ghw-panel-head">
                <b className="ghw-panel-title">{w.shopInfo}</b>
              </div>
              <div className="ghw-panel-body">
                <div className="ghw-pics-box">
                  <small className="ghw-label">{w.cover}</small>
                  <small className="rs-muted">{w.coverHint}</small>
                  <div className="ghw-pics wide">
                    {site.cover?.url && (
                      <div className="ghw-pic">
                        <img src={site.cover.url} alt="" />
                        <button type="button" onClick={() => cover(null)} disabled={!!busy || readOnly} aria-label="remove">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    {busy === "cover" && (
                      <div className="ghw-pic" aria-busy="true">
                        <span className="gh-uploading">
                          <Loader2 size={22} className="gh-spin" />
                        </span>
                      </div>
                    )}
                    {!site.cover?.url && busy !== "cover" && (
                      <button type="button" className="ghw-pic add" onClick={() => (on ? fileRef.current?.click() : ctx.askBuy({ addon: "mart_website" }))} disabled={!!busy || readOnly}>
                        <ImagePlus size={22} />
                        <small>{w.addPhoto}</small>
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) cover(file);
                    }}
                  />
                </div>
                <In label={w.tagline} value={f.tagline} onChange={set("tagline")} max={140} ph={w.taglinePh} />
                <In label={w.about} value={f.about} onChange={set("about")} max={2000} area rows={4} />
                <In label={w.hours} value={f.hours} onChange={set("hours")} max={300} ph={w.hoursPh} />
                <div className="ghw-grid2">
                  <In label={w.mapLink} value={f.map_url} onChange={set("map_url")} max={500} ph="https://maps.app.goo.gl/…" />
                  <In label="Facebook" value={f.facebook} onChange={set("facebook")} max={200} ph="https://facebook.com/…" />
                  <In label="Telegram" value={f.telegram} onChange={set("telegram")} max={100} ph="@myshop" />
                </div>
                <small className="rs-muted">{w.contactFrom}</small>
              </div>
            </section>

            <section className="panel-card ghw-panel">
              <div className="ghw-panel-head">
                <b className="ghw-panel-title">{w.color}</b>
              </div>
              <div className="ghw-panel-body">
                <small className="rs-muted">{w.colorSub}</small>
                <div className="ws-color mw-colors">
                  <button type="button" className={`ws-swatch ${!f.color ? "on" : ""}`} onClick={() => set("color")("")} style={{ background: MS_LOOKS[f.theme]?.accent }} disabled={readOnly} title={w.colorLook}>
                    {!f.color && <Check size={14} />}
                  </button>
                  <span className="rs-muted mw-sw-label">{w.colorLook}</span>
                  <i className="mw-sep" />
                  {PRESETS.map((c) => (
                    <button key={c} type="button" className={`ws-swatch ${f.color === c ? "on" : ""}`} onClick={() => set("color")(c)} style={{ background: c }} disabled={readOnly} aria-label={c}>
                      {f.color === c && <Check size={14} />}
                    </button>
                  ))}
                  <i className="mw-sep" />
                  <label className={`ws-swatch custom ${f.color && !PRESETS.includes(f.color) ? "on" : ""}`} style={f.color && !PRESETS.includes(f.color) ? { background: f.color } : undefined} title={w.colorCustom}>
                    <input type="color" value={f.color || MS_LOOKS[f.theme]?.accent || "#0F766E"} onChange={(e) => set("color")(e.target.value.toUpperCase())} disabled={readOnly} />
                    {f.color && !PRESETS.includes(f.color) ? <Check size={14} /> : <Plus size={14} />}
                  </label>
                  <span className="rs-muted mw-sw-label">{w.colorCustom}</span>
                </div>
              </div>
            </section>

            <section className="panel-card ghw-panel">
              <div className="ghw-panel-head">
                <b className="ghw-panel-title">{w.showTitle}</b>
              </div>
              <div className="ghw-panel-body">
                <small className="rs-muted">{w.showSub}</small>
                <div className="mw-toggles">
                  {SHOW_KEYS.map((k) => {
                    const lockStock = k === "stock" && !info.stock_on;
                    return (
                      <label key={k} className={`mw-toggle ${f.show[k] && !lockStock ? "on" : ""} ${lockStock ? "off" : ""}`}>
                        <input type="checkbox" checked={!!f.show[k] && !lockStock} disabled={readOnly || lockStock} onChange={(e) => setF((x) => ({ ...x, show: { ...x.show, [k]: e.target.checked } }))} />
                        <span>
                          <b>{w.show[k]}</b>
                          <small className="rs-muted">{lockStock ? w.needStock : w.showHint[k]}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {f.show.products && info.categories.length > 0 && (
                  <>
                    <small className="ghw-label" style={{ marginTop: 10 }}>
                      {w.cats}
                    </small>
                    <div className="ghw-chips">
                      {info.categories.map((c) => {
                        const shown = !f.hidden_categories.includes(String(c._id));
                        return (
                          <button
                            key={c._id}
                            type="button"
                            className={shown ? "on" : ""}
                            onClick={() => setF((x) => ({ ...x, hidden_categories: shown ? [...x.hidden_categories, String(c._id)] : x.hidden_categories.filter((y) => y !== String(c._id)) }))}
                            disabled={readOnly}
                          >
                            {shown && <Check size={14} />} {c.name}
                          </button>
                        );
                      })}
                    </div>
                    <small className="rs-muted">{w.catsHint}</small>
                  </>
                )}
              </div>
            </section>
          </div>

          <aside className="ghw-preview">
            <div className="ghw-preview-bar">
              <span>
                <i />
                <i />
                <i />
              </span>
              <small>{url || w.preview}</small>
            </div>
            <ScaledView data={preview} lang={lang} width={1200} />
          </aside>

          <div className={`ghw-savebar ${dirty ? "dirty" : ""}`}>
            <span>{dirty ? w.unsaved : w.allSaved}</span>
            <button type="button" className="md-btn md-btn-primary" onClick={() => save()} disabled={readOnly || !!busy || !dirty} data-testid="mw-save">
              <Save size={16} /> {busy === "save" ? w.saving : w.save}
            </button>
          </div>
        </div>
      )}

      {tab === "pages" && <PagesPanel ctx={ctx} w={w} site={site} setInfo={setInfo} />}
      {tab === "inbox" && (
        <InboxPanel
          ctx={ctx}
          w={w}
          onUnread={(n) => {
            setInfo((x) => ({ ...x, unread: n }));
            if (n !== ctx.data.counts.unread) ctx.reload(); // the menu badge
          }}
        />
      )}

      {tab === "looks" && (
        <section className="panel-card">
          <h2 style={{ margin: 0 }}>{w.looksTitle}</h2>
          <p className="rs-muted" style={{ margin: "6px 0 16px" }}>
            {w.siteLooksSub.replace("{price}", info.themes.price)}
          </p>
          <div className="ghw-looks">
            {MS_LOOK_KEYS.map((k) => {
              const owned = k === "classic" || info.themes.owned.includes(k);
              const current = (site.theme || "classic") === k;
              return (
                <article key={k} className={`ghw-look ${current ? "on" : ""}`} data-look={k}>
                  <MsThumb data={preview} theme={k} />
                  {!owned && (
                    <span className="ghl-lock">
                      <Lock size={12} />
                    </span>
                  )}
                  {k === "classic" && <span className="ghl-free">{w.free}</span>}
                  <div className="ghw-look-meta">
                    <b>{msLookName(k, lang)}</b>
                    <small className="rs-muted">{msLookDesc(k, lang)}</small>
                  </div>
                  <div className="ghw-look-act">
                    {current ? (
                      <span className="rs-pill ok">
                        <Check size={12} /> {w.inUse}
                      </span>
                    ) : owned ? (
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={readOnly || !!busy} onClick={() => save({ ...f, theme: k })}>
                        {w.use}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="md-btn md-btn-primary rs-gold-btn sa-btn-sm"
                        onClick={() => ctx.askBuy({ addon: "mart_site_theme", item: k, onDone: () => ctx.api.site(ctx.id).then((r) => (setInfo(r.data), setF((x) => ({ ...x, theme: r.data.site.theme })))) })}
                        disabled={readOnly}
                      >
                        <CoinIcon size={13} /> {info.themes.price}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// the preview at a fixed width (1200 desktop / 390 phone), scaled to the column
function ScaledView({ data, lang, width }) {
  const box = useRef(null);
  const inner = useRef(null);
  const [boxW, setBoxW] = useState(500);
  const [h, setH] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setBoxW(el.clientWidth);
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  useEffect(() => {
    const el = inner.current;
    if (!el) return undefined;
    const measure = () => setH(el.offsetHeight);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const scale = Math.min(1, boxW / width);
  return (
    <div className="ghw-scale" ref={box}>
      <div style={{ height: h * scale, width: width * scale, margin: "0 auto" }}>
        <div className="ghw-scale-in" ref={inner} style={{ transform: `scale(${scale})`, width }}>
          {data && <MsView data={data} lang={lang} preview />}
        </div>
      </div>
    </div>
  );
}

function In({ label, value, onChange, max, area, rows = 3, ph = "" }) {
  return (
    <label className="ghw-in">
      <small className="ghw-label">{label}</small>
      {area ? <textarea rows={rows} value={value} maxLength={max} onChange={onChange} placeholder={ph} /> : <input value={value} maxLength={max} onChange={onChange} placeholder={ph} />}
    </label>
  );
}
