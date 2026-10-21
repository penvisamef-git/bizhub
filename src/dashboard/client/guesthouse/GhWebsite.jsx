import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BedDouble, Check, Copy, ExternalLink, Globe, ImagePlus, Lock, Phone, Save, Trash2, Loader2 } from "lucide-react";
import { guestHouseService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import GsView, { GsThumb } from "../../../gsite/GsView";
import { SITE_THEME_KEYS, siteLookDesc, siteLookName } from "../../../gsite/looks";
import { GS_TEXT } from "../../../gsite/text";
import { fmtDate } from "./text";
import { WS_TEXT } from "./ws-text";

// Owner: the guest house website (gh_website, yearly) — address, content, 24 looks, booking requests
const FACILITY_KEYS = ["wifi", "parking", "ac", "hot_water", "breakfast", "restaurant", "pool", "garden", "laundry", "airport", "tours", "bike", "motorbike", "family", "pets", "reception24", "kitchen", "terrace", "river_view", "cards"];

// what the editor edits (texts only — pictures are saved straight away)
function draftOf(site) {
  return {
    slug: site.slug || "",
    published: !!site.published,
    theme: site.theme || "classic",
    color: site.color || "",
    hero: { kicker: site.hero?.kicker || "", title: site.hero?.title || "", subtitle: site.hero?.subtitle || "", button: site.hero?.button || "" },
    about: { enabled: site.about?.enabled !== false, title: site.about?.title || "", text: site.about?.text || "", highlights: [0, 1, 2, 3].map((i) => site.about?.highlights?.[i] || { value: "", label: "" }) },
    rooms: {
      enabled: site.rooms?.enabled !== false,
      title: site.rooms?.title || "",
      subtitle: site.rooms?.subtitle || "",
      show_prices: site.rooms?.show_prices !== false,
      items: (site.rooms?.items || []).map((x) => ({ type_id: String(x.type_id), text: x.text || "", hidden: !!x.hidden })),
    },
    facilities: { enabled: site.facilities?.enabled !== false, title: site.facilities?.title || "", keys: site.facilities?.keys || [], extra: (site.facilities?.extra || []).join(", ") },
    gallery: { enabled: site.gallery?.enabled !== false, title: site.gallery?.title || "" },
    booking: { enabled: site.booking?.enabled !== false, title: site.booking?.title || "", text: site.booking?.text || "", show_free: site.booking?.show_free !== false },
    contact: { enabled: site.contact?.enabled !== false, ...Object.fromEntries(["title", "phone", "email", "address", "map_url", "facebook", "telegram", "instagram", "tiktok", "whatsapp"].map((k) => [k, site.contact?.[k] || ""])) },
    footer_note: site.footer_note || "",
    seo: { title: site.seo?.title || "", description: site.seo?.description || "" },
  };
}
const bodyOf = (f) => ({
  ...f,
  about: { ...f.about, highlights: f.about.highlights.filter((h) => h.value || h.label) },
  facilities: {
    ...f.facilities,
    extra: f.facilities.extra
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  },
});

export function WebsiteTab({ ctx }) {
  const { lang, data, readOnly } = ctx;
  const w = WS_TEXT[lang] || WS_TEXT.en;
  const gs = GS_TEXT[lang] || GS_TEXT.en;
  const [info, setInfo] = useState(null); // GET /site
  const [f, setF] = useState(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState("");
  const [tab, setTab] = useState("edit");
  const [slugState, setSlugState] = useState(null);

  const load = useCallback(
    (keepDraft) =>
      guestHouseService
        .site(ctx.id)
        .then((r) => {
          setInfo(r);
          if (!keepDraft) {
            const d = draftOf(r.data);
            if (!d.slug) d.slug = r.suggested_slug || "";
            setF(d);
            setSaved(JSON.stringify(draftOf(r.data)));
          }
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load(false);
  }, [load]);
  // after buying (add-on or a look) the dashboard reloads: refresh looks + add-on, keep the draft
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    load(true);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // address check
  useEffect(() => {
    if (!f?.slug || f.slug === info?.data?.slug) return setSlugState(null);
    const t = setTimeout(() => {
      guestHouseService
        .siteSlug(ctx.id, f.slug)
        .then((r) => setSlugState(r.data))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [f?.slug, info?.data?.slug, ctx.id]);

  // the live preview: the server's picture of the site + this draft on top
  const preview = useMemo(() => {
    if (!info || !f) return null;
    const p = info.preview;
    const site = info.data;
    const count = {};
    for (const r of data.rooms || []) if (r.active) count[String(r.type_id)] = (count[String(r.type_id)] || 0) + 1;
    const imgs = new Map((site.rooms?.items || []).map((x) => [String(x.type_id), (x.images || []).map((i) => i.url).filter(Boolean)]));
    const items = new Map(f.rooms.items.map((x) => [x.type_id, x]));
    const deals = new Map((p.rooms?.items || []).map((x) => [x._id, x.deal]));
    return {
      ...p,
      slug: f.slug,
      theme: f.theme,
      color: f.color,
      hero: { ...p.hero, kicker: f.hero.kicker, title: f.hero.title, subtitle: f.hero.subtitle || data.settings.description?.slice(0, 240) || "", button: f.hero.button },
      about: { ...p.about, enabled: f.about.enabled, title: f.about.title, text: f.about.text || data.settings.description || "", highlights: f.about.highlights.filter((h) => h.value || h.label) },
      rooms: {
        enabled: f.rooms.enabled,
        title: f.rooms.title,
        subtitle: f.rooms.subtitle,
        show_prices: f.rooms.show_prices,
        items: (data.types || [])
          .filter((t) => t.active !== false && count[String(t._id)] && !items.get(String(t._id))?.hidden)
          .map((t) => ({
            _id: String(t._id),
            name: t.name,
            price: t.price,
            capacity: t.capacity || 2,
            beds: t.beds || "",
            amenities: t.amenities || [],
            color: t.color || "",
            rooms: count[String(t._id)],
            text: items.get(String(t._id))?.text || "",
            images: imgs.get(String(t._id)) || [],
            deal: deals.get(String(t._id)) || null,
          })),
      },
      facilities: {
        enabled: f.facilities.enabled,
        title: f.facilities.title,
        keys: f.facilities.keys,
        extra: f.facilities.extra
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      },
      gallery: { ...p.gallery, enabled: f.gallery.enabled, title: f.gallery.title },
      booking: { ...f.booking },
      contact: {
        enabled: f.contact.enabled,
        title: f.contact.title,
        phone: f.contact.phone || data.business.phone || "",
        email: f.contact.email || data.settings.email || "",
        address: f.contact.address || data.business.address || "",
        map_url: f.contact.map_url || data.settings.map_url || "",
        facebook: f.contact.facebook || data.settings.facebook || "",
        telegram: f.contact.telegram || data.settings.telegram || "",
        instagram: f.contact.instagram,
        tiktok: f.contact.tiktok,
        whatsapp: f.contact.whatsapp,
      },
      footer_note: f.footer_note,
    };
  }, [info, f, data]);

  if (!info || !f) return <ListSkeleton rows={5} />;
  const addon = info.addon || {};
  const on = !!addon.active;
  const dirty = JSON.stringify(f) !== saved;
  const url = f.slug ? `${window.location.origin}/g/${f.slug}` : "";
  const set = (part, key) => (e) => {
    const v = e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setF((x) => (key ? { ...x, [part]: { ...x[part], [key]: v } } : { ...x, [part]: v }));
  };

  const save = async (extra = {}) => {
    setBusy("save");
    try {
      const r = await guestHouseService.saveSite(ctx.id, { ...bodyOf(f), ...extra });
      const d = draftOf(r.data);
      setF(d);
      setSaved(JSON.stringify(d));
      setInfo((i) => ({ ...i, data: r.data, preview: r.preview }));
      ctx.notify({ type: "success", text: w.saved });
      return true;
    } catch (e) {
      if (e.status === 402) ctx.askBuy(e.response?.product === "gh_site_theme" ? { addon: "gh_site_theme", item: e.response.item } : { addon: "gh_website" });
      else ctx.notify({ type: "error", text: e.message });
      return false;
    } finally {
      setBusy("");
    }
  };
  // pictures go up straight away
  const pic = async (fn) => {
    setBusy("pic");
    try {
      const r = await fn();
      setInfo((i) => ({ ...i, data: r.data }));
      await load(true);
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "gh_website" });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const upload = (slot, typeId) => (file) => pic(() => guestHouseService.siteImage(ctx.id, slot, file, typeId));
  const drop = (body) => () => pic(() => guestHouseService.removeSiteImage(ctx.id, body));
  const roomItem = (id) => f.rooms.items.find((x) => x.type_id === id) || { type_id: id, text: "", hidden: false };
  const setRoom = (id, patch) =>
    setF((x) => {
      const items = x.rooms.items.some((i) => i.type_id === id) ? x.rooms.items.map((i) => (i.type_id === id ? { ...i, ...patch } : i)) : [...x.rooms.items, { type_id: id, text: "", hidden: false, ...patch }];
      return { ...x, rooms: { ...x.rooms, items } };
    });
  const site = info.data;
  const imgsOf = (id) => (site.rooms?.items || []).find((x) => String(x.type_id) === id)?.images || [];

  return (
    <div className="rs-col ghw">
      {/* ---------- add-on + address ---------- */}
      <section className="panel-card ghw-top">
        <span className="rs-addon-ic">
          <Globe size={24} />
        </span>
        <div className="ghw-top-text">
          <h2 style={{ margin: 0 }}>{w.title}</h2>
          <p className="rs-muted" style={{ margin: "4px 0 0" }}>
            {on ? w.on.replace("{date}", fmtDate(addon.expires_at, lang)) : w.off.replace("{price}", addon.price ?? 85)}
          </p>
        </div>
        {(!on || addon.status === "expiring") && (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon: "gh_website" })} disabled={readOnly}>
            <CoinIcon size={15} /> {on ? w.renew : w.unlock.replace("{coins}", addon.price ?? 85)}
          </button>
        )}
      </section>

      <section className="panel-card ghw-addr">
        <div className="ghw-addr-row">
          <label className="ghw-addr-field">
            <b>{w.address}</b>
            <span className="ghw-url">
              <small>{window.location.host}/g/</small>
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
                placeholder="my-guest-house"
                aria-label={w.address}
              />
            </span>
            <small className={`ghw-slug ${slugState ? (slugState.available ? "ok" : "bad") : ""}`}>{slugState ? (slugState.available ? `✓ ${w.free}` : slugState.reason === "format" ? w.badFormat : w.taken) : w.addressHint}</small>
          </label>
          <div className="ghw-pub">
            <button
              type="button"
              className={`ghw-switch ${f.published ? "on" : ""}`}
              role="switch"
              aria-checked={f.published}
              onClick={() => (!on && !f.published ? ctx.askBuy({ addon: "gh_website" }) : set("published")(!f.published))}
              disabled={readOnly}
            >
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
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(url).then(() => ctx.notify({ type: "success", text: w.copied }));
              }}
            >
              <Copy size={14} /> {w.copy}
            </button>
            <a className="md-btn md-btn-ghost sa-btn-sm" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> {w.open}
            </a>
          </div>
        )}
      </section>

      <div className="ghw-tabs" role="tablist">
        {["edit", "looks", "requests"].map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {w.tabs[k]}
            {k === "requests" && info.unread > 0 && <em>{info.unread}</em>}
          </button>
        ))}
      </div>

      {tab === "edit" && (
        <div className="ghw-split">
          <div className="ghw-form">
            <Panel title={w.color}>
              <div className="ghw-color">
                <input type="color" value={f.color || "#0F766E"} onChange={(e) => set("color")(e.target.value.toUpperCase())} disabled={readOnly} aria-label={w.color} />
                <code>{f.color || "—"}</code>
                {f.color && (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => set("color")("")}>
                    {w.colorReset}
                  </button>
                )}
              </div>
            </Panel>

            <Panel title={w.hero}>
              <Pics label={w.heroImg} hint={w.heroImgHint} list={site.hero?.image?.url ? [site.hero.image.url] : []} max={1} wide onAdd={upload("hero")} onDrop={() => drop({ slot: "hero" })()} busy={!!busy} readOnly={readOnly} w={w} />
              <In label={w.kicker} value={f.hero.kicker} onChange={set("hero", "kicker")} max={60} ph={gs.welcome} />
              <In label={w.heroTitle} value={f.hero.title} onChange={set("hero", "title")} max={90} ph={data.business.name} />
              <In label={w.heroSub} value={f.hero.subtitle} onChange={set("hero", "subtitle")} max={240} area />
              <In label={w.heroBtn} value={f.hero.button} onChange={set("hero", "button")} max={30} ph={gs.bookNow} />
            </Panel>

            <Panel title={w.rooms} enabled={f.rooms.enabled} onToggle={set("rooms", "enabled")} w={w}>
              <In label={w.roomsTitle} value={f.rooms.title} onChange={set("rooms", "title")} max={70} ph={gs.roomsTitle} />
              <In label={w.roomsSub} value={f.rooms.subtitle} onChange={set("rooms", "subtitle")} max={200} ph={gs.roomsSub} />
              <Check2 label={w.showPrices} checked={f.rooms.show_prices} onChange={set("rooms", "show_prices")} />
              {!(data.types || []).length && <p className="rs-muted">{w.noTypes}</p>}
              {(data.types || []).map((t) => {
                const id = String(t._id);
                const it = roomItem(id);
                const imgs = imgsOf(id);
                return (
                  <div key={id} className={`ghw-room ${it.hidden ? "off" : ""}`}>
                    <div className="ghw-room-head">
                      <span className="ghw-room-dot" style={{ background: t.color || "#2563EB" }}>
                        <BedDouble size={15} />
                      </span>
                      <b>{t.name}</b>
                      <small className="rs-muted">
                        {t.price} {data.settings.currency}
                        {gs.perNight}
                      </small>
                      <label className="ghw-mini">
                        <input type="checkbox" checked={it.hidden} onChange={(e) => setRoom(id, { hidden: e.target.checked })} /> {w.hideRoom}
                      </label>
                    </div>
                    <In label={w.roomText} value={it.text} onChange={(e) => setRoom(id, { text: e.target.value })} max={400} area />
                    <Pics label={w.roomPhotos.replace("{n}", imgs.length)} list={imgs.map((i) => i.url)} max={6} onAdd={upload("room", id)} onDrop={(i) => drop({ slot: "room", type_id: id, index: i })()} busy={!!busy} readOnly={readOnly} w={w} />
                  </div>
                );
              })}
            </Panel>

            <Panel title={w.about} enabled={f.about.enabled} onToggle={set("about", "enabled")} w={w}>
              <In label={w.aboutTitle} value={f.about.title} onChange={set("about", "title")} max={70} ph={gs.aboutTitle} />
              <In label={w.aboutText} value={f.about.text} onChange={set("about", "text")} max={2000} area rows={5} ph={data.settings.description || ""} />
              <Pics label={w.aboutImg} list={site.about?.image?.url ? [site.about.image.url] : []} max={1} wide onAdd={upload("about")} onDrop={() => drop({ slot: "about" })()} busy={!!busy} readOnly={readOnly} w={w} />
              <small className="ghw-label">{w.highlights}</small>
              <div className="ghw-highs">
                {f.about.highlights.map((h, i) => (
                  <div key={i}>
                    <input value={h.value} maxLength={20} placeholder={w.hValue} onChange={(e) => setF((x) => ({ ...x, about: { ...x.about, highlights: x.about.highlights.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)) } }))} />
                    <input value={h.label} maxLength={40} placeholder={w.hLabel} onChange={(e) => setF((x) => ({ ...x, about: { ...x.about, highlights: x.about.highlights.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) } }))} />
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title={w.facilities} enabled={f.facilities.enabled} onToggle={set("facilities", "enabled")} w={w}>
              <In label={w.facTitle} value={f.facilities.title} onChange={set("facilities", "title")} max={70} ph={gs.facilitiesTitle} />
              <div className="ghw-chips">
                {FACILITY_KEYS.map((k) => {
                  const onK = f.facilities.keys.includes(k);
                  return (
                    <button key={k} type="button" className={onK ? "on" : ""} onClick={() => setF((x) => ({ ...x, facilities: { ...x.facilities, keys: onK ? x.facilities.keys.filter((y) => y !== k) : [...x.facilities.keys, k] } }))}>
                      {onK && <Check size={14} />} {gs.fac[k]}
                    </button>
                  );
                })}
              </div>
              <In label={w.facExtra} value={f.facilities.extra} onChange={set("facilities", "extra")} max={500} />
            </Panel>

            <Panel title={w.gallery} enabled={f.gallery.enabled} onToggle={set("gallery", "enabled")} w={w}>
              <In label={w.galTitle} value={f.gallery.title} onChange={set("gallery", "title")} max={70} ph={gs.galleryTitle} />
              <Pics
                label={`${(site.gallery?.images || []).length}/16`}
                list={(site.gallery?.images || []).map((i) => i.url)}
                max={16}
                onAdd={upload("gallery")}
                onDrop={(i) => drop({ slot: "gallery", index: i })()}
                busy={!!busy}
                readOnly={readOnly}
                w={w}
              />
            </Panel>

            <Panel title={w.booking} enabled={f.booking.enabled} onToggle={set("booking", "enabled")} w={w}>
              <In label={w.bookTitle} value={f.booking.title} onChange={set("booking", "title")} max={70} ph={gs.bookTitle} />
              <In label={w.bookText} value={f.booking.text} onChange={set("booking", "text")} max={300} area ph={gs.bookText} />
              <Check2 label={w.showFree} checked={f.booking.show_free} onChange={set("booking", "show_free")} />
            </Panel>

            <Panel title={w.contact} enabled={f.contact.enabled} onToggle={set("contact", "enabled")} w={w}>
              <In label={w.cTitle} value={f.contact.title} onChange={set("contact", "title")} max={70} ph={gs.contactTitle} />
              <div className="ghw-grid2">
                <In label={w.phone} value={f.contact.phone} onChange={set("contact", "phone")} max={30} ph={data.business.phone || ""} />
                <In label={w.email} value={f.contact.email} onChange={set("contact", "email")} max={80} ph={data.settings.email || ""} />
                <In label={w.whatsapp} value={f.contact.whatsapp} onChange={set("contact", "whatsapp")} max={30} />
                <In label="Telegram" value={f.contact.telegram} onChange={set("contact", "telegram")} max={300} ph={data.settings.telegram || "https://t.me/…"} />
                <In label="Facebook" value={f.contact.facebook} onChange={set("contact", "facebook")} max={300} ph={data.settings.facebook || "https://facebook.com/…"} />
                <In label="Instagram" value={f.contact.instagram} onChange={set("contact", "instagram")} max={300} />
                <In label="TikTok" value={f.contact.tiktok} onChange={set("contact", "tiktok")} max={300} />
                <In label={w.map} value={f.contact.map_url} onChange={set("contact", "map_url")} max={300} ph={data.settings.map_url || "https://maps.app.goo.gl/…"} />
              </div>
              <In label={w.address2} value={f.contact.address} onChange={set("contact", "address")} max={200} ph={data.business.address || ""} />
            </Panel>

            <Panel title={w.footer}>
              <In label={w.footerNote} value={f.footer_note} onChange={set("footer_note")} max={200} />
              <In label={w.seoTitle} value={f.seo.title} onChange={set("seo", "title")} max={70} ph={data.business.name} />
              <In label={w.seoDesc} value={f.seo.description} onChange={set("seo", "description")} max={160} area />
            </Panel>
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
            <ScaledView data={preview} lang={lang} />
          </aside>

          <div className={`ghw-savebar ${dirty ? "dirty" : ""}`}>
            <span>{dirty ? w.unsaved : w.saved}</span>
            <button type="button" className="md-btn md-btn-primary" onClick={() => save()} disabled={readOnly || !!busy || !dirty}>
              <Save size={16} /> {busy === "save" ? w.saving : w.save}
            </button>
          </div>
        </div>
      )}

      {tab === "looks" && (
        <section className="panel-card">
          <h2 style={{ margin: 0 }}>{w.looksTitle}</h2>
          <p className="rs-muted" style={{ margin: "6px 0 16px" }}>
            {w.looksSub.replace("{price}", info.themes.price)}
          </p>
          <div className="ghw-looks">
            {SITE_THEME_KEYS.map((k) => {
              const owned = k === "classic" || info.themes.owned.includes(k);
              const current = (site.theme || "classic") === k;
              return (
                <article key={k} className={`ghw-look ${current ? "on" : ""}`} data-look={k}>
                  <GsThumb data={preview} theme={k} />
                  {!owned && (
                    <span className="ghl-lock">
                      <Lock size={12} />
                    </span>
                  )}
                  {k === "classic" && <span className="ghl-free">{ctx.g.free}</span>}
                  <div className="ghw-look-meta">
                    <b>{siteLookName(k, lang)}</b>
                    <small className="rs-muted">{siteLookDesc(k, lang)}</small>
                  </div>
                  <div className="ghw-look-act">
                    {current ? (
                      <span className="rs-pill ok">
                        <Check size={12} /> {w.inUse}
                      </span>
                    ) : owned ? (
                      <button
                        type="button"
                        className="md-btn md-btn-ghost sa-btn-sm"
                        disabled={readOnly || !!busy}
                        onClick={async () => {
                          setF((x) => ({ ...x, theme: k }));
                          await save({ theme: k });
                        }}
                      >
                        {w.use}
                      </button>
                    ) : (
                      <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "gh_site_theme", item: k })} disabled={readOnly}>
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

      {tab === "requests" && <Requests ctx={ctx} w={w} onCount={(n) => setInfo((i) => ({ ...i, unread: n }))} />}
    </div>
  );
}

// the preview at 1200px wide, scaled to the column
function ScaledView({ data, lang }) {
  const box = useRef(null);
  const inner = useRef(null);
  const [scale, setScale] = useState(0.45);
  const [h, setH] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setScale(el.clientWidth / 1200);
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
  return (
    <div className="ghw-scale" ref={box}>
      <div style={{ height: h * scale }}>
        <div className="ghw-scale-in" ref={inner} style={{ transform: `scale(${scale})` }}>
          {data && <GsView data={data} lang={lang} preview />}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, enabled, onToggle, w, children }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`panel-card ghw-panel ${enabled === false ? "off" : ""}`}>
      <div className="ghw-panel-head">
        <button type="button" className="ghw-panel-title" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <b>{title}</b>
        </button>
        {onToggle && (
          <label className="ghw-mini">
            <input type="checkbox" checked={enabled} onChange={onToggle} /> {w.show}
          </label>
        )}
      </div>
      {open && <div className="ghw-panel-body">{children}</div>}
    </section>
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
function Check2({ label, checked, onChange }) {
  return (
    <label className="ghw-mini ghw-check">
      <input type="checkbox" checked={checked} onChange={onChange} /> {label}
    </label>
  );
}
function Pics({ label, hint, list, max, wide, onAdd, onDrop, busy, readOnly, w }) {
  const pick = useRef(null);
  const [adding, setAdding] = useState(""); // preview of the photo going up
  const [dropping, setDropping] = useState(-1);
  return (
    <div className="ghw-pics-box">
      <small className="ghw-label">{label}</small>
      {hint && <small className="rs-muted">{hint}</small>}
      <div className={`ghw-pics ${wide ? "wide" : ""}`}>
        {list.map((src, i) => (
          <div key={src + i} className="ghw-pic">
            <img src={src} alt="" />
            <button
              type="button"
              onClick={async () => {
                setDropping(i);
                try {
                  await onDrop(i);
                } finally {
                  setDropping(-1);
                }
              }}
              disabled={busy || readOnly}
              aria-label="remove"
            >
              <Trash2 size={14} />
            </button>
            {dropping === i && (
              <span className="gh-uploading">
                <Loader2 size={22} className="gh-spin" />
              </span>
            )}
          </div>
        ))}
        {adding && (
          <div className="ghw-pic" aria-busy="true">
            <img src={adding} alt="" />
            <span className="gh-uploading">
              <Loader2 size={22} className="gh-spin" />
              <small>{w.uploading}</small>
            </span>
          </div>
        )}
        {list.length + (adding ? 1 : 0) < max && (
          <button type="button" className="ghw-pic add" onClick={() => pick.current?.click()} disabled={busy || readOnly}>
            <ImagePlus size={22} />
            <small>{w.addPhoto}</small>
          </button>
        )}
      </div>
      <input
        ref={pick}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setAdding(URL.createObjectURL(file));
          try {
            await onAdd(file);
          } finally {
            setAdding("");
          }
        }}
      />
    </div>
  );
}

function Requests({ ctx, w, onCount }) {
  const { lang } = ctx;
  const [status, setStatus] = useState("new");
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const load = useCallback(
    (p = 1) =>
      guestHouseService
        .siteRequests(ctx.id, { status: status === "all" ? "" : status, page: p })
        .then((r) => {
          setRows((old) => (p === 1 ? r.data : [...(old || []), ...r.data]));
          setPage(p);
          setPages(r.pagination.totalPages);
          onCount(r.unread);
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id, status], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    setRows(null);
    load(1);
  }, [load]);
  const act = async (fn) => {
    try {
      const r = await fn();
      onCount(r.unread);
      load(1);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const day = (d) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`)) : "");
  const nights = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
  return (
    <section className="panel-card">
      <div className="ghw-req-head">
        <div>
          <h2 style={{ margin: 0 }}>{w.reqTitle}</h2>
          <p className="rs-muted" style={{ margin: "4px 0 0" }}>
            {w.reqSub}
          </p>
        </div>
        <div className="ghpr-seg">
          {["new", "all"].map((k) => (
            <button key={k} type="button" className={status === k ? "on" : ""} onClick={() => setStatus(k)}>
              {k === "new" ? w.reqNew : w.reqAll}
            </button>
          ))}
        </div>
      </div>
      {!rows ? (
        <ListSkeleton rows={3} />
      ) : !rows.length ? (
        <p className="rs-muted ghw-empty">{w.reqNone}</p>
      ) : (
        <div className="ghw-reqs">
          {rows.map((r) => (
            <article key={r._id} className={`ghw-req ${r.status}`}>
              <div className="ghw-req-main">
                <b>{r.name}</b>
                <a href={/@/.test(r.contact) ? `mailto:${r.contact}` : `tel:${r.contact.replace(/[^\d+]/g, "")}`}>{r.contact}</a>
                <span className="ghw-req-dates">
                  {day(r.from)} → {day(r.to)} · {w.nights.replace("{n}", nights(r.from, r.to))}
                </span>
                <small className="rs-muted">
                  {r.type_name || w.anyRoom} · {w.guests.replace("{n}", r.guests)} · {fmtDate(r.created_date, lang)}
                </small>
                {r.message && <p>{r.message}</p>}
              </div>
              <div className="ghw-req-act">
                {!/@/.test(r.contact) && (
                  <a className="md-btn md-btn-ghost sa-btn-sm" href={`tel:${r.contact.replace(/[^\d+]/g, "")}`}>
                    <Phone size={14} /> {w.call}
                  </a>
                )}
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => act(() => guestHouseService.setSiteRequest(ctx.id, r._id, r.status === "new" ? "done" : "new"))}>
                  <Check size={14} /> {r.status === "new" ? w.markDone : w.markNew}
                </button>
                <button type="button" className="md-btn md-btn-ghost sa-danger-text sa-btn-sm" onClick={() => act(() => guestHouseService.removeSiteRequest(ctx.id, r._id))} aria-label={w.del}>
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
          {page < pages && (
            <button type="button" className="md-btn md-btn-ghost" onClick={() => load(page + 1)}>
              {w.more}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
