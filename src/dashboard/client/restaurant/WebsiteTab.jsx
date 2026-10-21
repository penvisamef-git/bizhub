import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, Globe, ImagePlus, Inbox, Loader2, Lock, Monitor, Plus, Smartphone, Trash2, X } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { PUBLIC_SITE_URL } from "../../../config";
import { resizeImage } from "../../../lib/image";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import SiteView from "../../../site/SiteView";
import { SITE_TEXT, SITE_THEMES, loadThemeFonts } from "../../../site/text";
import { AddonPrompt, Field, ImagePick, SaveBar } from "./parts";
import { useWsText } from "./ws-text";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const CONTACT_KEYS = ["title", "phone", "email", "address", "hours", "map_url", "facebook", "instagram", "tiktok", "telegram"];
const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 40);

const NAV_KEYS = ["home", "menu", "about", "gallery", "message", "contact"];
const navOf = (nav) => {
  const list = (nav || []).filter((n) => NAV_KEYS.includes(n.key)).map((n) => ({ key: n.key, label: n.label || "", show: n.show !== false }));
  for (const key of NAV_KEYS) if (!list.some((n) => n.key === key)) list.push({ key, label: "", show: true });
  return list;
};

// the parts of the site the form edits (images are saved straight away, not here)
function formOf(site) {
  return {
    slug: site.slug || "",
    published: !!site.published,
    theme: site.theme || "classic",
    color: site.color || "",
    hero: { title: site.hero?.title || "", subtitle: site.hero?.subtitle || "", button: site.hero?.button || "" },
    nav: navOf(site.nav),
    about: {
      enabled: site.about?.enabled !== false,
      title: site.about?.title || "",
      text: site.about?.text || "",
      image_side: site.about?.image_side || "left",
      highlights: (site.about?.highlights || []).map((h) => ({ value: h.value || "", label: h.label || "" })),
    },
    form: { enabled: site.form?.enabled !== false, title: site.form?.title || "", text: site.form?.text || "", notify_telegram: site.form?.notify_telegram !== false },
    menu: { enabled: site.menu?.enabled !== false, title: site.menu?.title || "", mode: site.menu?.mode || "all", featured_ids: (site.menu?.featured_ids || []).map(String), show_prices: site.menu?.show_prices !== false },
    gallery: { enabled: site.gallery?.enabled !== false, title: site.gallery?.title || "" },
    contact: { enabled: site.contact?.enabled !== false, ...Object.fromEntries(CONTACT_KEYS.map((k) => [k, site.contact?.[k] || ""])) },
    links: (site.links || []).map((l) => ({ label: l.label, url: l.url })),
    footer_note: site.footer_note || "",
    seo: { title: site.seo?.title || "", description: site.seo?.description || "" },
  };
}

// Website (add-on): address, theme, sections — with a live preview
export default function WebsiteTab({ ctx }) {
  const { r, readOnly, settings } = ctx;
  const w = useWsText();
  // the website's own words in the dashboard language (shown as placeholders)
  const st = SITE_TEXT[ctx.lang] || SITE_TEXT.en;
  const siteText = { t: st, navLabel: (k) => ({ home: st.home, menu: st.menu, about: st.about, gallery: st.gallery, message: st.writeUsNav, contact: st.contact })[k] };
  const on = ctx.addonOn("rest_website");
  const [res, setRes] = useState(null); // { data: site, themes, suggested_slug, preview }
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(""); // image slot uploading
  const [buyTheme, setBuyTheme] = useState(null);
  const [slugState, setSlugState] = useState(""); // "" | checking | ok | taken | format
  const [copied, setCopied] = useState(false);

  const load = useCallback(
    () =>
      restaurantService.site.get(ctx.id).then((x) => {
        setRes(x);
        return x;
      }),
    [ctx.id],
  );
  useEffect(() => {
    if (!on) return;
    load()
      .then((x) => setForm({ ...formOf(x.data), slug: x.data.slug || x.suggested_slug || "" }))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [on, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = useMemo(() => (res ? formOf(res.data) : null), [res]);
  const dirty = !!form && !!saved && JSON.stringify(form) !== JSON.stringify(saved);

  // check the address while typing (a little after the last key)
  useEffect(() => {
    if (!form || !on) return undefined;
    const slug = form.slug;
    if (!slug || slug === res?.data?.slug) return setSlugState(slug ? "ok" : "");
    if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(slug) || slug.includes("--")) return setSlugState("format");
    setSlugState("checking");
    const timer = setTimeout(() => {
      restaurantService.site
        .checkSlug(ctx.id, slug)
        .then((x) => setSlugState(x.data.available ? "ok" : x.data.reason === "taken" ? "taken" : "format"))
        .catch(() => setSlugState(""));
    }, 400);
    return () => clearTimeout(timer);
  }, [form?.slug, on]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    Object.keys(SITE_THEMES).forEach(loadThemeFonts);
  }, []);

  if (!on) {
    return (
      <div className="rs-col">
        <section className="panel-card ws-promo">
          <div className="ws-promo-art" aria-hidden="true">
            <div className="ws-browser">
              <span className="ws-dots">
                <i />
                <i />
                <i />
              </span>
              <span className="ws-url">/s/{slugify(settings.name_en) || "your-restaurant"}</span>
            </div>
            <div className="ws-promo-hero">
              <b>{settings.name_km || settings.name_en}</b>
              <span />
            </div>
            <div className="ws-promo-cards">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div>
            <h2>{r.addonNames.rest_website}</h2>
            <p className="rs-muted">{w.promo}</p>
            <ul className="tg-list">
              <li>{w.p1.replace("{url}", `${PUBLIC_SITE_URL.replace(/^https?:\/\//, "")}/s/${slugify(settings.name_en) || "your-restaurant"}`)}</li>
              <li>{w.p2}</li>
              <li>{w.p3}</li>
            </ul>
          </div>
        </section>
        <AddonPrompt addonKey="rest_website" ctx={ctx} />
      </div>
    );
  }
  if (!res || !form) return <ListSkeleton rows={4} />;

  const site = res.data;
  const themes = res.themes;
  const owns = (k) => themes.free.includes(k) || themes.owned.includes(k);
  const set = (part, key) => (e) => {
    const value = e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => (key ? { ...f, [part]: { ...f[part], [key]: value } } : { ...f, [part]: value }));
  };
  const setNav = (i, patch) => setForm((f) => ({ ...f, nav: f.nav.map((n, j) => (j === i ? { ...n, ...patch } : n)) }));
  const moveNav = (i, d) =>
    setForm((f) => {
      const nav = [...f.nav];
      [nav[i], nav[i + d]] = [nav[i + d], nav[i]];
      return { ...f, nav };
    });
  const setHl = (i, patch) => setForm((f) => ({ ...f, about: { ...f.about, highlights: f.about.highlights.map((h, j) => (j === i ? { ...h, ...patch } : h)) } }));
  const liveUrl = site.slug ? `${PUBLIC_SITE_URL}/s/${site.slug}` : "";

  const save = async () => {
    if (!owns(form.theme)) return setBuyTheme(form.theme);
    setSaving(true);
    try {
      const x = await restaurantService.site.save(ctx.id, form);
      setRes((old) => ({ ...old, data: x.data }));
      setForm(formOf(x.data));
      ctx.notify({ type: "success", text: r.saved });
    } catch (e) {
      if (e.status === 402 && e.response?.product === "rest_site_theme") setBuyTheme(e.response.item);
      else if (e.status === 402 && e.response?.product) ctx.askBuy(e.response.product);
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };
  const upload = async (slot, files) => {
    setBusy(slot);
    try {
      let x;
      for (const file of files) x = await restaurantService.site.uploadImage(ctx.id, slot, file instanceof Blob && !(file instanceof File) ? file : await resizeImage(file, 1600));
      if (x) setRes((old) => ({ ...old, data: x.data }));
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const removeImage = async (slot, index) => {
    setBusy(slot);
    try {
      const x = await restaurantService.site.removeImage(ctx.id, slot, index);
      setRes((old) => ({ ...old, data: x.data }));
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };

  // preview = saved public data + what's typed now
  const base = res.preview;
  const preview = {
    ...base,
    slug: form.slug,
    theme: form.theme,
    color: form.color,
    hero: { ...form.hero, image: site.hero?.image?.url || "" },
    nav: form.nav,
    about: { ...form.about, highlights: form.about.highlights.filter((h) => h.value || h.label), image: site.about?.image?.url || "" },
    form: form.form,
    menu: form.menu,
    gallery: { ...form.gallery, images: (site.gallery?.images || []).map((i) => i.url) },
    contact: {
      ...Object.fromEntries(CONTACT_KEYS.map((k) => [k, form.contact[k]])),
      enabled: form.contact.enabled,
      phone: form.contact.phone || settings.phone || "",
      address: form.contact.address || settings.address || "",
      hours: form.contact.hours || settings.hours || "",
      map_url: form.contact.map_url || settings.map_url || "",
    },
    links: form.links.filter((l) => l.label && l.url),
    footer_note: form.footer_note,
    restaurant: { ...base.restaurant, name_km: settings.name_km, name_en: settings.name_en || base.restaurant.name_en, logo: settings.logo?.url || "", cover: settings.cover?.url || "" },
  };
  const themeName = (k) => SITE_THEMES[k]?.name || k;
  const items = base.items;

  return (
    <div className="ws-grid">
      <div className="rs-form">
        {/* address + online */}
        <section className="panel-card">
          <h2>{w.address}</h2>
          <div className="ws-slug">
            <span className="ws-slug-pre">{PUBLIC_SITE_URL.replace(/^https?:\/\//, "")}/s/</span>
            <input value={form.slug} onChange={(e) => set("slug")(slugify(e.target.value))} maxLength={40} aria-label={w.address} disabled={readOnly} spellCheck={false} />
            <span className={`ws-slug-state s-${slugState}`}>
              {slugState === "checking" && <Loader2 size={14} className="md-spin" />}
              {slugState === "ok" && <Check size={14} />}
              {(slugState === "taken" || slugState === "format") && <X size={14} />}
              {slugState === "checking" ? w.checking : slugState === "ok" ? w.available : slugState === "taken" ? w.taken : slugState === "format" ? w.badFormat : ""}
            </span>
          </div>
          <small className="rs-hint">{w.addressHint}</small>
          <div className="ws-online">
            <label className="md-switch">
              <input type="checkbox" checked={form.published} onChange={set("published")} disabled={readOnly} />
              <span className="md-switch-track" />
              <span>
                <b>{w.published}</b>
                <small className="rs-muted" style={{ display: "block" }}>
                  {w.publishedHint}
                </small>
              </span>
            </label>
            <div className="ws-online-btns">
              {site.published && liveUrl ? (
                <>
                  <a className="md-btn md-btn-primary sa-btn-sm" href={liveUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} /> {w.open}
                  </a>
                  <button
                    type="button"
                    className="md-btn md-btn-ghost sa-btn-sm"
                    onClick={() =>
                      navigator.clipboard?.writeText(liveUrl).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      })
                    }
                  >
                    <Copy size={15} /> {copied ? w.copied : w.copy}
                  </button>
                </>
              ) : (
                <span className="rs-pill">
                  <Globe size={12} /> {w.notOnline}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* theme */}
        <section className="panel-card">
          <h2>{w.theme}</h2>
          <div className="ws-themes">
            {[...themes.free, ...themes.paid].map((k) => {
              const d = SITE_THEMES[k];
              const mine = owns(k);
              return (
                <button key={k} type="button" className={`ws-theme ${form.theme === k ? "on" : ""}`} onClick={() => set("theme")(k)} disabled={readOnly} aria-pressed={form.theme === k}>
                  <span className="ws-theme-art" style={{ background: d.bg, color: d.fg }}>
                    <span className="ws-theme-bar" style={{ background: d.fg }} />
                    <b style={{ fontFamily: d.font }}>Aa</b>
                    <span className="ws-theme-dots">
                      <i style={{ background: d.accent }} />
                      <i style={{ background: d.fg, opacity: 0.25 }} />
                      <i style={{ background: d.fg, opacity: 0.25 }} />
                    </span>
                  </span>
                  <span className="ws-theme-name">
                    {d.name}
                    {themes.free.includes(k) ? (
                      <small>{w.free}</small>
                    ) : mine ? (
                      <small className="mine">
                        <Check size={11} /> {w.owned}
                      </small>
                    ) : (
                      <small className="paid">
                        <Lock size={11} /> {themes.price}
                      </small>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {!owns(form.theme) && (
            <div className="ws-theme-lock">
              <span>{w.themeLocked.replace("{name}", themeName(form.theme))}</span>
              <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuyTheme(form.theme)} disabled={readOnly}>
                <CoinIcon size={15} /> {w.unlockTheme.replace("{coins}", themes.price)}
              </button>
            </div>
          )}
          <Field label={w.color}>
            <div className="ws-color">
              <button type="button" className={`ws-swatch ${!form.color ? "on" : ""}`} onClick={() => set("color")("")} style={{ background: SITE_THEMES[form.theme]?.accent }} disabled={readOnly}>
                {!form.color && <Check size={14} />}
              </button>
              <span className="rs-muted">{w.colorTheme}</span>
              <label className={`ws-swatch custom ${form.color ? "on" : ""}`} style={form.color ? { background: form.color } : undefined}>
                <input type="color" value={form.color || SITE_THEMES[form.theme]?.accent || "#c2552b"} onChange={(e) => set("color")(e.target.value.toUpperCase())} disabled={readOnly} />
                {form.color ? <Check size={14} /> : <Plus size={14} />}
              </label>
              <span className="rs-muted">{w.custom}</span>
            </div>
          </Field>
        </section>

        {/* top */}
        <section className="panel-card">
          <h2>{w.top}</h2>
          <div className="md-fields-grid">
            <Field label={w.heroTitle} full htmlFor="ws-h-title">
              <input id="ws-h-title" maxLength={80} value={form.hero.title} onChange={set("hero", "title")} placeholder={settings.name_en || w.heroTitlePh} disabled={readOnly} />
            </Field>
            <Field label={w.heroSub} full htmlFor="ws-h-sub">
              <input id="ws-h-sub" maxLength={200} value={form.hero.subtitle} onChange={set("hero", "subtitle")} disabled={readOnly} />
            </Field>
            <Field label={w.heroButton} htmlFor="ws-h-btn">
              <input id="ws-h-btn" maxLength={30} value={form.hero.button} onChange={set("hero", "button")} placeholder={w.heroButtonPh} disabled={readOnly} />
            </Field>
            <Field label={w.heroImage} hint={w.heroImageHint}>
              <ImagePick value={site.hero?.image?.url} busy={busy === "hero"} onPick={(b) => upload("hero", [b])} onRemove={() => removeImage("hero")} r={r} wide maxSize={1920} disabled={readOnly} />
            </Field>
          </div>
        </section>

        {/* top menu */}
        <section className="panel-card">
          <h2>{w.navTitle}</h2>
          <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
            {w.navSub}
          </p>
          <div className="ws-nav">
            {form.nav.map((n, i) => (
              <div key={n.key} className={`ws-nav-row ${n.show ? "" : "off"}`}>
                <div className="ws-nav-move">
                  <button type="button" className="md-icon-btn" onClick={() => moveNav(i, -1)} disabled={readOnly || i === 0} aria-label={r.moveUp}>
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" className="md-icon-btn" onClick={() => moveNav(i, 1)} disabled={readOnly || i === form.nav.length - 1} aria-label={r.moveDown}>
                    <ArrowDown size={14} />
                  </button>
                </div>
                <label className="md-switch" title={w.show}>
                  <input type="checkbox" checked={n.show} onChange={(e) => setNav(i, { show: e.target.checked })} disabled={readOnly} aria-label={w.show} />
                  <span className="md-switch-track" />
                </label>
                <span className="ws-nav-name">{w.navNames[n.key]}</span>
                <input value={n.label} maxLength={30} placeholder={siteText.navLabel(n.key)} onChange={(e) => setNav(i, { label: e.target.value })} aria-label={w.navRename} disabled={readOnly || !n.show} />
              </div>
            ))}
          </div>
          <small className="rs-hint">{w.navHint}</small>
          <div style={{ height: 14 }} />
          <Field label={w.links} hint={w.linksHint}>
            <div className="ws-links">
              {form.links.map((l, i) => (
                <div key={i} className="ws-link">
                  <input value={l.label} maxLength={30} placeholder={w.linkLabel} aria-label={w.linkLabel} onChange={(e) => set("links")(form.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} disabled={readOnly} />
                  <input value={l.url} maxLength={300} placeholder="https://" aria-label={w.linkUrl} onChange={(e) => set("links")(form.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} disabled={readOnly} />
                  <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => set("links")(form.links.filter((_, j) => j !== i))} aria-label={r.remove} disabled={readOnly}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {form.links.length < 6 && (
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => set("links")([...form.links, { label: "", url: "" }])} disabled={readOnly}>
                  <Plus size={15} /> {w.addLink}
                </button>
              )}
            </div>
          </Field>
        </section>

        {/* about */}
        <Part title={w.about} on={form.about.enabled} onToggle={set("about", "enabled")} w={w} disabled={readOnly}>
          <div className="md-fields-grid">
            <Field label={w.aboutTitle} full htmlFor="ws-a-title">
              <input id="ws-a-title" maxLength={60} value={form.about.title} onChange={set("about", "title")} placeholder={w.aboutTitlePh} disabled={readOnly} />
            </Field>
            <Field label={w.aboutText} full htmlFor="ws-a-text">
              <textarea id="ws-a-text" rows={5} maxLength={1500} value={form.about.text} onChange={set("about", "text")} placeholder={w.aboutTextPh} disabled={readOnly} />
            </Field>
            <Field label={w.aboutImage}>
              <ImagePick value={site.about?.image?.url} busy={busy === "about"} onPick={(b) => upload("about", [b])} onRemove={() => removeImage("about")} r={r} maxSize={1400} disabled={readOnly} />
            </Field>
            <Field label={w.photoSide}>
              <div className="rs-choice">
                {[
                  ["left", w.left],
                  ["right", w.right],
                ].map(([v, label]) => (
                  <label key={v} className={form.about.image_side === v ? "on" : ""}>
                    <input type="radio" name="ws-side" checked={form.about.image_side === v} onChange={() => set("about", "image_side")(v)} disabled={readOnly} />
                    {label}
                  </label>
                ))}
              </div>
            </Field>
          </div>
          <Field label={w.highlights} hint={w.highlightsHint}>
            <div className="ws-links">
              {form.about.highlights.map((h, i) => (
                <div key={i} className="ws-link ws-hl">
                  <input value={h.value} maxLength={20} placeholder={["1998", "40+", "4.9★", "100%"][i]} aria-label={w.hlValue} onChange={(e) => setHl(i, { value: e.target.value })} disabled={readOnly} />
                  <input value={h.label} maxLength={40} placeholder={w.hlLabelPh[i]} aria-label={w.hlLabel} onChange={(e) => setHl(i, { label: e.target.value })} disabled={readOnly} />
                  <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => set("about", "highlights")(form.about.highlights.filter((_, j) => j !== i))} aria-label={r.remove} disabled={readOnly}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {form.about.highlights.length < 4 && (
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => set("about", "highlights")([...form.about.highlights, { value: "", label: "" }])} disabled={readOnly}>
                  <Plus size={15} /> {w.addHighlight}
                </button>
              )}
            </div>
          </Field>
        </Part>

        {/* menu */}
        <Part title={w.menu} on={form.menu.enabled} onToggle={set("menu", "enabled")} w={w} disabled={readOnly}>
          <div className="md-fields-grid">
            <Field label={w.menuTitle} htmlFor="ws-m-title">
              <input id="ws-m-title" maxLength={60} value={form.menu.title} onChange={set("menu", "title")} placeholder={w.menuTitlePh} disabled={readOnly} />
            </Field>
            <Field label={w.menuMode} full>
              <div className="rs-choice">
                {[
                  ["all", w.modeAll],
                  ["featured", w.modeFeatured],
                ].map(([v, label]) => (
                  <label key={v} className={form.menu.mode === v ? "on" : ""}>
                    <input type="radio" name="ws-mode" checked={form.menu.mode === v} onChange={() => set("menu", "mode")(v)} disabled={readOnly} />
                    {label}
                  </label>
                ))}
              </div>
            </Field>
          </div>
          {form.menu.mode === "featured" && (
            <Field label={w.pickDishes.replace("{n}", form.menu.featured_ids.length)}>
              {items.length === 0 ? (
                <p className="rs-muted">{w.noDishes}</p>
              ) : (
                <div className="ws-dishes">
                  {items.map((i) => {
                    const picked = form.menu.featured_ids.includes(String(i._id));
                    return (
                      <label key={i._id} className={`ws-dish ${picked ? "on" : ""}`}>
                        <input
                          type="checkbox"
                          checked={picked}
                          disabled={readOnly || (!picked && form.menu.featured_ids.length >= 24)}
                          onChange={() => set("menu", "featured_ids")(picked ? form.menu.featured_ids.filter((x) => x !== String(i._id)) : [...form.menu.featured_ids, String(i._id)])}
                        />
                        <span className="ws-dish-img">{i.photo ? <img src={i.photo} alt="" /> : null}</span>
                        <span>{i.name_en || i.name_km}</span>
                        {picked && <Check size={14} />}
                      </label>
                    );
                  })}
                </div>
              )}
            </Field>
          )}
          <label className="md-switch" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={form.menu.show_prices} onChange={set("menu", "show_prices")} disabled={readOnly} />
            <span className="md-switch-track" />
            <span>{w.showPrices}</span>
          </label>
        </Part>

        {/* gallery */}
        <Part title={w.gallery} on={form.gallery.enabled} onToggle={set("gallery", "enabled")} w={w} disabled={readOnly}>
          <Field label={w.galleryTitle} htmlFor="ws-g-title">
            <input id="ws-g-title" maxLength={60} value={form.gallery.title} onChange={set("gallery", "title")} placeholder={w.galleryTitlePh} disabled={readOnly} />
          </Field>
          <Gallery images={site.gallery?.images || []} busy={busy === "gallery"} onAdd={(files) => upload("gallery", files)} onRemove={(i) => removeImage("gallery", i)} w={w} r={r} disabled={readOnly} />
        </Part>

        {/* send us a message */}
        <Part title={w.formTitle} on={form.form.enabled} onToggle={set("form", "enabled")} w={w} disabled={readOnly}>
          <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
            {w.formSub}
          </p>
          <div className="md-fields-grid">
            <Field label={w.formHeading} htmlFor="ws-f-title">
              <input id="ws-f-title" maxLength={60} value={form.form.title} onChange={set("form", "title")} placeholder={siteText.t.writeUs} disabled={readOnly} />
            </Field>
            <Field label={w.formText} htmlFor="ws-f-text">
              <input id="ws-f-text" maxLength={200} value={form.form.text} onChange={set("form", "text")} placeholder={siteText.t.writeUsSub} disabled={readOnly} />
            </Field>
          </div>
          <label className="md-switch">
            <input type="checkbox" checked={form.form.notify_telegram} onChange={set("form", "notify_telegram")} disabled={readOnly} />
            <span className="md-switch-track" />
            <span>
              {w.notifyTelegram}
              {!ctx.addonOn("rest_telegram") && (
                <small className="rs-muted" style={{ display: "block" }}>
                  {w.notifyNeedsTelegram}
                </small>
              )}
            </span>
          </label>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" style={{ marginTop: 12 }} onClick={() => ctx.go("inbox")}>
            <Inbox size={15} /> {w.openInbox}
            {ctx.overview.inbox_unread > 0 && <span className="rs-badge">{ctx.overview.inbox_unread}</span>}
          </button>
        </Part>

        {/* contact */}
        <Part title={w.contact} on={form.contact.enabled} onToggle={set("contact", "enabled")} w={w} disabled={readOnly}>
          <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
            {w.contactHint}
          </p>
          <div className="md-fields-grid">
            <Field label={w.contactTitle} htmlFor="ws-c-title">
              <input id="ws-c-title" maxLength={60} value={form.contact.title} onChange={set("contact", "title")} placeholder={w.contactTitlePh} disabled={readOnly} />
            </Field>
            <Field label={w.phone} htmlFor="ws-c-phone">
              <input id="ws-c-phone" type="tel" maxLength={30} value={form.contact.phone} onChange={set("contact", "phone")} placeholder={settings.phone} disabled={readOnly} />
            </Field>
            <Field label={w.email} htmlFor="ws-c-email">
              <input id="ws-c-email" type="email" maxLength={80} value={form.contact.email} onChange={set("contact", "email")} disabled={readOnly} />
            </Field>
            <Field label={w.hours} htmlFor="ws-c-hours">
              <input id="ws-c-hours" maxLength={120} value={form.contact.hours} onChange={set("contact", "hours")} placeholder={settings.hours || w.hoursPh} disabled={readOnly} />
            </Field>
            <Field label={w.address2} full htmlFor="ws-c-address">
              <input id="ws-c-address" maxLength={200} value={form.contact.address} onChange={set("contact", "address")} placeholder={settings.address} disabled={readOnly} />
            </Field>
            <Field label={w.map} full htmlFor="ws-c-map">
              <input id="ws-c-map" maxLength={300} value={form.contact.map_url} onChange={set("contact", "map_url")} placeholder={settings.map_url || "https://maps.app.goo.gl/…"} disabled={readOnly} />
            </Field>
            {["facebook", "instagram", "tiktok", "telegram"].map((k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)} htmlFor={`ws-c-${k}`}>
                <input id={`ws-c-${k}`} maxLength={300} value={form.contact[k]} onChange={set("contact", k)} placeholder={k === "telegram" ? "t.me/yourname" : `${k}.com/yourpage`} disabled={readOnly} />
              </Field>
            ))}
            <Field label={w.footerNote} full htmlFor="ws-foot">
              <input id="ws-foot" maxLength={200} value={form.footer_note} onChange={set("footer_note")} disabled={readOnly} />
            </Field>
          </div>
        </Part>

        {/* seo */}
        <section className="panel-card">
          <h2>{w.seo}</h2>
          <div className="md-fields-grid">
            <Field label={w.seoTitle} full htmlFor="ws-seo-title">
              <input id="ws-seo-title" maxLength={70} value={form.seo.title} onChange={set("seo", "title")} placeholder={settings.name_en || settings.name_km} disabled={readOnly} />
            </Field>
            <Field label={w.seoDesc} full htmlFor="ws-seo-desc">
              <textarea id="ws-seo-desc" rows={2} maxLength={160} value={form.seo.description} onChange={set("seo", "description")} placeholder={w.seoDescPh} disabled={readOnly} />
            </Field>
          </div>
        </section>

        <SaveBar dirty={dirty} saving={saving} onSave={save} onUndo={() => setForm(saved)} r={r} disabled={readOnly || slugState === "taken" || slugState === "format" || slugState === "checking"} />
      </div>

      <aside className="ws-side">
        <Preview data={preview} lang={ctx.lang} w={w} />
      </aside>

      {buyTheme && (
        <PurchaseModal
          stage={
            <div className="rs-stage">
              <span className="ws-theme-art big" style={{ background: SITE_THEMES[buyTheme].bg, color: SITE_THEMES[buyTheme].fg }}>
                <b style={{ fontFamily: SITE_THEMES[buyTheme].font }}>Aa</b>
                <span className="ws-theme-dots">
                  <i style={{ background: SITE_THEMES[buyTheme].accent }} />
                </span>
              </span>
              <b>{themeName(buyTheme)}</b>
              <small>{settings.name_km || settings.name_en}</small>
            </div>
          }
          badge={w.theme}
          title={w.themeBuyTitle.replace("{name}", themeName(buyTheme))}
          sub={w.themeBuySub}
          perks={[w.themePerk, `${r.oneTime} · ${r.forever}`]}
          price={themes.price}
          buyLabel={r.buy.replace("{coins}", `${fmt(themes.price)} ${r.coins}`)}
          buy={() => restaurantService.site.buyTheme(ctx.id, buyTheme)}
          doneSub={w.themeDone.replace("{name}", themeName(buyTheme))}
          onDone={() => {
            setForm((f) => ({ ...f, theme: buyTheme }));
            load();
          }}
          onClose={() => setBuyTheme(null)}
        />
      )}
    </div>
  );
}

// a section with an on/off switch in its header
function Part({ title, on, onToggle, w, disabled, children }) {
  return (
    <section className={`panel-card ws-part ${on ? "" : "off"}`}>
      <div className="ws-part-head">
        <h2>{title}</h2>
        <label className="md-switch" title={w.show}>
          <input type="checkbox" checked={on} onChange={onToggle} disabled={disabled} aria-label={w.show} />
          <span className="md-switch-track" />
        </label>
      </div>
      {on && <div className="ws-part-body">{children}</div>}
    </section>
  );
}

function Gallery({ images, busy, onAdd, onRemove, w, r, disabled }) {
  const ref = useRef(null);
  return (
    <div className="ws-gallery">
      {images.map((img, i) => (
        <span key={img.public_id || img.url} className="ws-shot">
          <img src={img.url} alt="" />
          <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => onRemove(i)} aria-label={r.remove} disabled={disabled || busy}>
            <Trash2 size={14} />
          </button>
        </span>
      ))}
      {images.length < 12 && (
        <button type="button" className="ws-shot add" onClick={() => ref.current?.click()} disabled={disabled || busy}>
          {busy ? <Loader2 size={20} className="md-spin" /> : <ImagePlus size={20} />}
          <small>{w.addPhotos}</small>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files || [])].slice(0, 12 - images.length);
          e.target.value = "";
          if (files.length) onAdd(files);
        }}
      />
      <small className="rs-hint ws-gallery-hint">{w.galleryHint}</small>
    </div>
  );
}

// the website drawn inside a frame: phone (390 px) or computer (1200 px shrunk to fit)
function Preview({ data, lang, w }) {
  const [mode, setMode] = useState("phone");
  const [page, setPage] = useState({ view: "home", itemId: null });
  const box = useRef(null);
  const [width, setWidth] = useState(420);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const size = mode === "phone" ? 390 : 1200;
  const zoom = Math.min(1, (width - 2) / size);
  const go = (view, itemId = null, anchor) => {
    setPage({ view, itemId });
    const frame = box.current?.querySelector(".ws-frame-scroll");
    setTimeout(() => {
      const el = anchor && frame?.querySelector(`#st-${anchor}`);
      if (el) el.scrollIntoView({ block: "start" });
      else frame?.scrollTo({ top: 0 });
    }, 30);
  };
  return (
    <div className="ws-preview">
      <div className="ws-preview-head">
        <b>{w.preview}</b>
        <div className="ws-devices" role="tablist">
          <button type="button" className={mode === "phone" ? "on" : ""} onClick={() => setMode("phone")} aria-pressed={mode === "phone"}>
            <Smartphone size={15} /> {w.phoneView}
          </button>
          <button type="button" className={mode === "desktop" ? "on" : ""} onClick={() => setMode("desktop")} aria-pressed={mode === "desktop"}>
            <Monitor size={15} /> {w.desktopView}
          </button>
        </div>
      </div>
      <div className={`ws-frame m-${mode}`} ref={box}>
        <div className="ws-frame-scroll">
          <div style={{ width: size, zoom }}>
            <SiteView data={data} lang={lang} view={page.view} itemId={page.itemId} go={go} preview />
          </div>
        </div>
      </div>
      <small className="rs-muted">{w.previewNote}</small>
    </div>
  );
}
