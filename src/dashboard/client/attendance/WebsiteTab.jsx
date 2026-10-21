import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, Copy, ExternalLink, FileText, Globe, ImagePlus, Inbox, Link2, Loader2, Lock, Mail, Monitor, Phone, Plus, Smartphone, Trash2, X } from "lucide-react";
import { attendanceService } from "../../../api/services";
import { PUBLIC_SITE_URL } from "../../../config";
import { resizeImage } from "../../../lib/image";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import { Field, ImagePick, SaveBar } from "../restaurant/parts";
import WebView from "../../../web/WebView";
import { WEB_LOOKS, WEB_THEME_KEYS, loadWebFonts, webLookDesc, webLookName } from "../../../web/themes";
import { SERVICE_ICONS, SOCIALS } from "../../../web/icons";
import { WEB_TEXT } from "../../../web/text";
import { Locked } from "./AddonTabs";
import { fmtDate } from "./text";
import { webEditText } from "./website-text";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const PARTS = ["home", "about", "services", "gallery", "message", "contact"];
const CONTACT = ["title", "phone", "email", "address", "hours", "map_url", ...SOCIALS];
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 40);

// the parts of the site the form edits (photos are saved straight away, not here)
function formOf(site) {
  return {
    slug: site.slug || "",
    published: !!site.published,
    theme: site.theme || "classic",
    color: site.color || "",
    hero: {
      kicker: site.hero?.kicker || "",
      title: site.hero?.title || "",
      subtitle: site.hero?.subtitle || "",
      button: site.hero?.button || "",
      button_to: site.hero?.button_to || "",
    },
    about: {
      enabled: site.about?.enabled !== false,
      title: site.about?.title || "",
      text: site.about?.text || "",
      highlights: (site.about?.highlights || []).map((h) => ({
        value: h.value || "",
        label: h.label || "",
      })),
    },
    services: {
      enabled: site.services?.enabled !== false,
      title: site.services?.title || "",
      subtitle: site.services?.subtitle || "",
      items: (site.services?.items || []).map((x) => ({
        _id: String(x._id),
        icon: x.icon || "briefcase",
        title: x.title || "",
        text: x.text || "",
        price: x.price || "",
        page_id: x.page_id || "",
      })),
    },
    gallery: {
      enabled: site.gallery?.enabled !== false,
      title: site.gallery?.title || "",
    },
    pages: (site.pages || []).map((p) => ({
      _id: String(p._id),
      slug: p.slug || "",
      title: p.title || "",
      subtitle: p.subtitle || "",
      body: p.body || "",
      button: p.button || "",
      button_to: p.button_to || "",
    })),
    nav: (site.nav || []).map((n) => ({
      kind: n.kind,
      key: String(n.key || ""),
      label: n.label || "",
      url: n.url || "",
      show: n.show !== false,
    })),
    form: {
      enabled: site.form?.enabled !== false,
      title: site.form?.title || "",
      text: site.form?.text || "",
      notify_telegram: site.form?.notify_telegram !== false,
    },
    contact: {
      enabled: site.contact?.enabled !== false,
      ...Object.fromEntries(CONTACT.map((k) => [k, site.contact?.[k] || ""])),
    },
    footer_note: site.footer_note || "",
    seo: {
      title: site.seo?.title || "",
      description: site.seo?.description || "",
    },
  };
}

// Website add-on (att_website): address, look, top, menu, pages, services, about, gallery, form, contact — with a live preview
export default function WebsiteTab({ ctx }) {
  const { lang, readOnly } = ctx;
  const w = webEditText(lang);
  const st = WEB_TEXT[lang] || WEB_TEXT.en;
  const on = !!ctx.data.addons?.att_website?.active;
  const [view, setView] = useState("edit"); // edit | inbox
  const [res, setRes] = useState(null); // { data, themes, suggested_slug, unread, preview }
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [buyLook, setBuyLook] = useState(null);
  const [slugState, setSlugState] = useState("");
  const [copied, setCopied] = useState(false);
  const [openPage, setOpenPage] = useState(null);
  const [openSvc, setOpenSvc] = useState(null);

  const load = useCallback(
    () =>
      attendanceService.site.get(ctx.id).then((x) => {
        setRes(x);
        return x;
      }),
    [ctx.id],
  );
  useEffect(() => {
    if (!on) return;
    load()
      .then((x) =>
        setForm({
          ...formOf(x.data),
          slug: x.data.slug || x.suggested_slug || "",
        }),
      )
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [on, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = useMemo(() => (res ? formOf(res.data) : null), [res]);
  const dirty = !!form && !!saved && JSON.stringify(form) !== JSON.stringify(saved);

  useEffect(() => {
    if (!form || !on) return undefined;
    const slug = form.slug;
    if (!slug || slug === res?.data?.slug) return setSlugState(slug ? "ok" : "");
    if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(slug) || slug.includes("--")) return setSlugState("format");
    setSlugState("checking");
    const timer = setTimeout(() => {
      attendanceService.site
        .checkSlug(ctx.id, slug)
        .then((x) => setSlugState(x.data.available ? "ok" : x.data.reason === "taken" ? "taken" : "format"))
        .catch(() => setSlugState(""));
    }, 400);
    return () => clearTimeout(timer);
  }, [form?.slug, on]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (on) WEB_THEME_KEYS.forEach(loadWebFonts);
  }, [on]);

  if (!on) {
    return (
      <div className="rs-col">
        <Locked ctx={ctx} addon="att_website" />
        <section className="panel-card">
          <h2>{w.look}</h2>
          <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
            {w.lookSub.replace("{coins}", fmt(ctx.data.addons?.att_web_theme?.price ?? 35))}
          </p>
          <div className="wt-looks">
            {WEB_THEME_KEYS.map((k) => (
              <div key={k} className="wt-look static">
                <LookArt k={k} />
                <span className="wt-look-name">{webLookName(k, lang)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }
  if (!res || !form) return <ListSkeleton rows={4} />;

  const site = res.data;
  const themes = res.themes;
  const owns = (k) => k === "classic" || themes.owned.includes(k);
  const set = (part, key) => (e) => {
    const value = e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => (key ? { ...f, [part]: { ...f[part], [key]: value } } : { ...f, [part]: value }));
  };
  const savedPage = (id) => site.pages?.find((p) => String(p._id) === id);
  const savedService = (id) => site.services?.items?.find((x) => String(x._id) === id);
  const liveUrl = site.slug ? `${PUBLIC_SITE_URL}/w/${site.slug}` : "";

  // ---- menu ----
  const setNav = (i, patch) =>
    setForm((f) => ({
      ...f,
      nav: f.nav.map((n, j) => (j === i ? { ...n, ...patch } : n)),
    }));
  const moveNav = (i, d) =>
    setForm((f) => {
      const nav = [...f.nav];
      [nav[i], nav[i + d]] = [nav[i + d], nav[i]];
      return { ...f, nav };
    });
  // ---- pages ----
  const addPage = () => {
    const id = newId();
    setForm((f) => ({
      ...f,
      pages: [
        ...f.pages,
        {
          _id: id,
          slug: "",
          title: w.newPage,
          subtitle: "",
          body: "",
          button: "",
          button_to: "",
        },
      ],
      nav: [...f.nav, { kind: "page", key: id, label: "", url: "", show: true }],
    }));
    setOpenPage(id);
  };
  const setPage = (id, patch) =>
    setForm((f) => ({
      ...f,
      pages: f.pages.map((p) => (p._id === id ? { ...p, ...patch } : p)),
    }));
  const removePage = (id) =>
    setForm((f) => {
      const clear = (to) => (to === `page:${id}` ? "" : to);
      return {
        ...f,
        pages: f.pages.filter((p) => p._id !== id).map((p) => ({ ...p, button_to: clear(p.button_to) })),
        nav: f.nav.filter((n) => !(n.kind === "page" && n.key === id)),
        hero: { ...f.hero, button_to: clear(f.hero.button_to) },
        services: {
          ...f.services,
          items: f.services.items.map((x) => (x.page_id === id ? { ...x, page_id: "" } : x)),
        },
      };
    });
  const movePage = (i, d) =>
    setForm((f) => {
      const pages = [...f.pages];
      [pages[i], pages[i + d]] = [pages[i + d], pages[i]];
      return { ...f, pages };
    });
  // ---- services ----
  const setSvc = (i, patch) =>
    setForm((f) => ({
      ...f,
      services: {
        ...f.services,
        items: f.services.items.map((x, j) => (j === i ? { ...x, ...patch } : x)),
      },
    }));
  const moveSvc = (i, d) =>
    setForm((f) => {
      const items = [...f.services.items];
      [items[i], items[i + d]] = [items[i + d], items[i]];
      return { ...f, services: { ...f.services, items } };
    });
  const setHl = (i, patch) =>
    setForm((f) => ({
      ...f,
      about: {
        ...f.about,
        highlights: f.about.highlights.map((h, j) => (j === i ? { ...h, ...patch } : h)),
      },
    }));

  const save = async () => {
    if (!owns(form.theme)) return setBuyLook(form.theme);
    setSaving(true);
    try {
      const x = await attendanceService.site.save(ctx.id, {
        ...form,
        nav: form.nav.filter((n) => n.kind !== "link" || (n.label && n.url)),
      });
      setRes((old) => ({ ...old, data: x.data }));
      setForm(formOf(x.data));
      ctx.notify({ type: "success", text: w.r.saved });
    } catch (e) {
      if (e.status === 402 && e.response?.product === "att_web_theme") setBuyLook(e.response.item);
      else if (e.status === 402 && e.response?.product) ctx.askBuy({ addon: e.response.product });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };
  const upload = async (slot, files, rid) => {
    setBusy(`${slot}${rid || ""}`);
    try {
      let x;
      for (const file of files) x = await attendanceService.site.uploadImage(ctx.id, slot, file instanceof Blob && !(file instanceof File) ? file : await resizeImage(file, 1600), rid);
      if (x) setRes((old) => ({ ...old, data: x.data }));
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const removeImage = async (slot, opts = {}) => {
    setBusy(`${slot}${opts.rid || ""}`);
    try {
      const x = await attendanceService.site.removeImage(ctx.id, slot, opts);
      setRes((old) => ({ ...old, data: x.data }));
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };

  // preview = saved data + what's typed now
  const preview = {
    ...res.preview,
    slug: form.slug,
    theme: form.theme,
    color: form.color,
    hero: { ...form.hero, image: site.hero?.image?.url || "" },
    about: {
      ...form.about,
      highlights: form.about.highlights.filter((h) => h.value || h.label),
      image: site.about?.image?.url || "",
    },
    services: {
      ...form.services,
      items: form.services.items.map((x) => ({
        ...x,
        image: savedService(x._id)?.image?.url || "",
      })),
    },
    gallery: {
      ...form.gallery,
      images: (site.gallery?.images || []).map((i) => i.url),
    },
    pages: form.pages.map((p) => ({
      ...p,
      slug: p.slug || slugify(p.title) || p._id,
      image: savedPage(p._id)?.image?.url || "",
    })),
    nav: form.nav,
    form: form.form,
    contact: { ...form.contact },
    footer_note: form.footer_note,
    company: {
      ...res.preview.company,
      logo: ctx.data.settings?.logo?.url || res.preview.company.logo,
    },
  };
  const targets = [...PARTS.filter((p) => p !== "contact").map((p) => [`#${p}`, w.partNames[p]]), ["#contact", w.partNames.contact], ...form.pages.map((p) => [`page:${p._id}`, `${w.kindPage}: ${p.title || "…"}`])];
  const navName = (n) => (n.kind === "part" ? w.partNames[n.key] : n.kind === "page" ? form.pages.find((p) => p._id === n.key)?.title || "…" : null);
  const navPh = (n) =>
    n.kind === "part"
      ? {
          home: st.home,
          about: st.about,
          services: st.services,
          gallery: st.gallery,
          message: st.message,
          contact: st.contact,
        }[n.key]
      : navName(n);
  const lookName = (k) => webLookName(k, lang);

  return (
    <div className="rs-col">
      <div className="wt-switch" role="tablist">
        <button type="button" className={view === "edit" ? "on" : ""} onClick={() => setView("edit")}>
          <Globe size={15} /> {w.edit}
        </button>
        <button type="button" className={view === "inbox" ? "on" : ""} onClick={() => setView("inbox")}>
          <Inbox size={15} /> {w.inbox}
          {res.unread > 0 && <span className="rs-badge">{res.unread}</span>}
        </button>
      </div>

      {view === "inbox" ? (
        <InboxView ctx={ctx} w={w} onUnread={(n) => setRes((old) => ({ ...old, unread: n }))} />
      ) : (
        <div className="ws-grid">
          <div className="rs-form">
            {/* address + online */}
            <section className="panel-card">
              <h2>{w.address}</h2>
              <div className="ws-slug">
                <span className="ws-slug-pre">{PUBLIC_SITE_URL.replace(/^https?:\/\//, "")}/w/</span>
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

            {/* look */}
            <section className="panel-card">
              <h2>{w.look}</h2>
              <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
                {w.lookSub.replace("{coins}", fmt(themes.price))}
              </p>
              <div className="wt-looks">
                {WEB_THEME_KEYS.map((k) => {
                  const mine = owns(k);
                  return (
                    <button key={k} type="button" className={`wt-look ${form.theme === k ? "on" : ""}`} onClick={() => set("theme")(k)} disabled={readOnly} aria-pressed={form.theme === k} title={webLookDesc(k, lang)}>
                      <LookArt k={k} color={form.theme === k ? form.color : ""} />
                      <span className="wt-look-name">
                        {lookName(k)}
                        {k === "classic" ? (
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
                  <span>{w.lookLocked.replace("{name}", lookName(form.theme))}</span>
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuyLook(form.theme)} disabled={readOnly}>
                    <CoinIcon size={15} /> {w.unlockLook.replace("{coins}", themes.price)}
                  </button>
                </div>
              )}
              <Field label={w.color}>
                <div className="ws-color">
                  <button type="button" className={`ws-swatch ${!form.color ? "on" : ""}`} onClick={() => set("color")("")} style={{ background: WEB_LOOKS[form.theme]?.accent }} disabled={readOnly}>
                    {!form.color && <Check size={14} />}
                  </button>
                  <span className="rs-muted">{w.colorTheme}</span>
                  <label className={`ws-swatch custom ${form.color ? "on" : ""}`} style={form.color ? { background: form.color } : undefined}>
                    <input type="color" value={form.color || WEB_LOOKS[form.theme]?.accent || "#4F46E5"} onChange={(e) => set("color")(e.target.value.toUpperCase())} disabled={readOnly} />
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
                <Field label={w.kicker} htmlFor="wt-kicker">
                  <input id="wt-kicker" maxLength={60} value={form.hero.kicker} onChange={set("hero", "kicker")} placeholder={ctx.data.business.name} disabled={readOnly} />
                </Field>
                <Field label={w.heroTitle} full htmlFor="wt-title">
                  <input id="wt-title" maxLength={90} value={form.hero.title} onChange={set("hero", "title")} placeholder={ctx.data.business.name} disabled={readOnly} />
                </Field>
                <Field label={w.heroSub} full htmlFor="wt-sub">
                  <textarea id="wt-sub" rows={2} maxLength={240} value={form.hero.subtitle} onChange={set("hero", "subtitle")} disabled={readOnly} />
                </Field>
                <Field label={w.heroButton} htmlFor="wt-btn">
                  <input id="wt-btn" maxLength={30} value={form.hero.button} onChange={set("hero", "button")} placeholder={w.heroButtonPh} disabled={readOnly} />
                </Field>
                <Field label={w.goesTo} htmlFor="wt-btn-to">
                  <Target id="wt-btn-to" value={form.hero.button_to} onChange={set("hero", "button_to")} targets={targets} w={w} disabled={readOnly} />
                </Field>
                <Field label={w.heroImage} hint={w.heroImageHint} full>
                  <ImagePick value={site.hero?.image?.url} busy={busy === "hero"} onPick={(b) => upload("hero", [b])} onRemove={() => removeImage("hero")} r={w.r} wide maxSize={1920} disabled={readOnly} />
                </Field>
              </div>
            </section>

            {/* menu */}
            <section className="panel-card">
              <h2>{w.menu}</h2>
              <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
                {w.menuSub}
              </p>
              <div className="ws-nav">
                {form.nav.map((n, i) => (
                  <div key={`${n.kind}-${n.key}-${i}`} className={`ws-nav-row wt-nav-row ${n.show ? "" : "off"}`}>
                    <div className="ws-nav-move">
                      <button type="button" className="md-icon-btn" onClick={() => moveNav(i, -1)} disabled={readOnly || i === 0} aria-label={w.moveUp}>
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" className="md-icon-btn" onClick={() => moveNav(i, 1)} disabled={readOnly || i === form.nav.length - 1} aria-label={w.moveDown}>
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <label className="md-switch" title={w.show}>
                      <input type="checkbox" checked={n.show} onChange={(e) => setNav(i, { show: e.target.checked })} disabled={readOnly} aria-label={w.show} />
                      <span className="md-switch-track" />
                    </label>
                    <span className={`wt-kind k-${n.kind}`}>
                      {n.kind === "page" ? <FileText size={12} /> : n.kind === "link" ? <Link2 size={12} /> : null}
                      {n.kind === "part" ? w.kindPart : n.kind === "page" ? w.kindPage : w.kindLink}
                    </span>
                    {n.kind === "link" ? (
                      <span className="wt-link-edit">
                        <input value={n.label} maxLength={30} placeholder={w.linkLabel} onChange={(e) => setNav(i, { label: e.target.value })} disabled={readOnly} />
                        <input value={n.url} maxLength={300} placeholder="https://" onChange={(e) => setNav(i, { url: e.target.value })} disabled={readOnly} />
                        <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => set("nav")(form.nav.filter((_, j) => j !== i))} aria-label={w.remove} disabled={readOnly}>
                          <Trash2 size={14} />
                        </button>
                      </span>
                    ) : (
                      <>
                        <span className="ws-nav-name">{navName(n)}</span>
                        <input value={n.label} maxLength={30} placeholder={navPh(n)} onChange={(e) => setNav(i, { label: e.target.value })} aria-label={w.rename} disabled={readOnly || !n.show} />
                      </>
                    )}
                  </div>
                ))}
              </div>
              <small className="rs-hint">{w.emptyHidden}</small>
              <div style={{ marginTop: 12 }}>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => set("nav")([...form.nav, { kind: "link", key: "", label: "", url: "", show: true }])} disabled={readOnly || form.nav.length >= 24}>
                  <Plus size={15} /> {w.addLink}
                </button>
              </div>
            </section>

            {/* pages */}
            <section className="panel-card">
              <h2>{w.pages}</h2>
              <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
                {w.pagesSub}
              </p>
              {form.pages.length === 0 && <p className="rs-muted">{w.noPages}</p>}
              <div className="wt-items">
                {form.pages.map((p, i) => {
                  const open = openPage === p._id;
                  const stored = savedPage(p._id);
                  return (
                    <div key={p._id} className={`wt-item ${open ? "open" : ""}`}>
                      <div className="wt-item-head">
                        <button type="button" className="wt-item-toggle" onClick={() => setOpenPage(open ? null : p._id)}>
                          <FileText size={16} />
                          <b>{p.title || "…"}</b>
                          <small>
                            /w/{form.slug || "…"}/{p.slug || slugify(p.title)}
                          </small>
                          <ChevronDown size={16} className="wt-chev" />
                        </button>
                        <button type="button" className="md-icon-btn" onClick={() => movePage(i, -1)} disabled={readOnly || i === 0} aria-label={w.moveUp}>
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" className="md-icon-btn" onClick={() => movePage(i, 1)} disabled={readOnly || i === form.pages.length - 1} aria-label={w.moveDown}>
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => removePage(p._id)} aria-label={w.remove} disabled={readOnly}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {open && (
                        <div className="md-fields-grid wt-item-body">
                          <Field label={w.pageTitle} htmlFor={`pg-t-${p._id}`}>
                            <input id={`pg-t-${p._id}`} maxLength={70} value={p.title} onChange={(e) => setPage(p._id, { title: e.target.value })} disabled={readOnly} />
                          </Field>
                          <Field label={w.pageAddress} htmlFor={`pg-s-${p._id}`}>
                            <input
                              id={`pg-s-${p._id}`}
                              maxLength={40}
                              value={p.slug}
                              placeholder={slugify(p.title)}
                              onChange={(e) =>
                                setPage(p._id, {
                                  slug: slugify(e.target.value),
                                })
                              }
                              disabled={readOnly}
                              spellCheck={false}
                            />
                          </Field>
                          <Field label={w.pageSub} full htmlFor={`pg-sub-${p._id}`}>
                            <input id={`pg-sub-${p._id}`} maxLength={200} value={p.subtitle} onChange={(e) => setPage(p._id, { subtitle: e.target.value })} disabled={readOnly} />
                          </Field>
                          <Field label={w.pageBody} full hint={w.pageBodyHint} htmlFor={`pg-b-${p._id}`}>
                            <textarea id={`pg-b-${p._id}`} rows={9} maxLength={6000} value={p.body} onChange={(e) => setPage(p._id, { body: e.target.value })} disabled={readOnly} />
                          </Field>
                          <Field label={w.pageButton} htmlFor={`pg-btn-${p._id}`}>
                            <input id={`pg-btn-${p._id}`} maxLength={30} value={p.button} placeholder={st.getInTouch} onChange={(e) => setPage(p._id, { button: e.target.value })} disabled={readOnly} />
                          </Field>
                          <Field label={w.goesTo}>
                            <Target value={p.button_to} onChange={(v) => setPage(p._id, { button_to: v })} targets={targets} w={w} disabled={readOnly} />
                          </Field>
                          <Field label={w.pageImage} full hint={stored ? "" : w.saveForPhoto}>
                            {stored ? (
                              <ImagePick value={stored.image?.url} busy={busy === `page${p._id}`} onPick={(b) => upload("page", [b], p._id)} onRemove={() => removeImage("page", { rid: p._id })} r={w.r} wide maxSize={1920} disabled={readOnly} />
                            ) : null}
                          </Field>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" style={{ marginTop: 12 }} onClick={addPage} disabled={readOnly || form.pages.length >= 12}>
                <Plus size={15} /> {w.addPage}
              </button>
            </section>

            {/* services */}
            <Part title={w.services} on={form.services.enabled} onToggle={set("services", "enabled")} w={w} disabled={readOnly}>
              <div className="md-fields-grid">
                <Field label={w.servicesTitle} htmlFor="wt-s-title">
                  <input id="wt-s-title" maxLength={70} value={form.services.title} onChange={set("services", "title")} placeholder={w.servicesTitlePh} disabled={readOnly} />
                </Field>
                <Field label={w.servicesSub} htmlFor="wt-s-sub">
                  <input id="wt-s-sub" maxLength={200} value={form.services.subtitle} onChange={set("services", "subtitle")} disabled={readOnly} />
                </Field>
              </div>
              {form.services.items.length === 0 && <p className="rs-muted">{w.noServices}</p>}
              <div className="wt-items">
                {form.services.items.map((x, i) => {
                  const stored = savedService(x._id);
                  const Icon = SERVICE_ICONS[x.icon] || SERVICE_ICONS.briefcase;
                  return (
                    <div key={x._id} className={`wt-item wt-svc ${openSvc === x._id ? "open" : ""}`}>
                      <div className="wt-item-head">
                        <button type="button" className="wt-item-toggle" onClick={() => setOpenSvc(openSvc === x._id ? null : x._id)}>
                          <span className="wt-svc-ic">
                            <Icon size={18} />
                          </span>
                          <b className="wt-svc-name">{x.title || "…"}</b>
                          {x.price && <small>{x.price}</small>}
                          <ChevronDown size={16} className="wt-chev" />
                        </button>
                        <button type="button" className="md-icon-btn" onClick={() => moveSvc(i, -1)} disabled={readOnly || i === 0} aria-label={w.moveUp}>
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" className="md-icon-btn" onClick={() => moveSvc(i, 1)} disabled={readOnly || i === form.services.items.length - 1} aria-label={w.moveDown}>
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => set("services", "items")(form.services.items.filter((_, j) => j !== i))} aria-label={w.remove} disabled={readOnly}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {openSvc === x._id && (
                        <div className="md-fields-grid wt-item-body">
                          <Field label={w.serviceName}>
                            <input maxLength={70} value={x.title} onChange={(e) => setSvc(i, { title: e.target.value })} disabled={readOnly} />
                          </Field>
                          <Field label={w.servicePrice}>
                            <input maxLength={30} value={x.price} placeholder={w.servicePricePh} onChange={(e) => setSvc(i, { price: e.target.value })} disabled={readOnly} />
                          </Field>
                          <Field label={w.serviceText} full>
                            <textarea rows={2} maxLength={400} value={x.text} onChange={(e) => setSvc(i, { text: e.target.value })} disabled={readOnly} />
                          </Field>
                          <Field label={w.icon} full>
                            <div className="wt-icons">
                              {Object.entries(SERVICE_ICONS).map(([k, I]) => (
                                <button key={k} type="button" className={x.icon === k ? "on" : ""} onClick={() => setSvc(i, { icon: k })} disabled={readOnly} aria-label={k} title={k}>
                                  <I size={16} />
                                </button>
                              ))}
                            </div>
                          </Field>
                          <Field label={w.serviceLink}>
                            <select value={x.page_id} onChange={(e) => setSvc(i, { page_id: e.target.value })} disabled={readOnly || form.pages.length === 0}>
                              <option value="">{w.noLink}</option>
                              {form.pages.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.title}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label={w.photo} hint={stored ? "" : w.saveForPhoto}>
                            {stored ? (
                              <ImagePick value={stored.image?.url} busy={busy === `service${x._id}`} onPick={(b) => upload("service", [b], x._id)} onRemove={() => removeImage("service", { rid: x._id })} r={w.r} maxSize={1200} disabled={readOnly} />
                            ) : null}
                          </Field>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="md-btn md-btn-ghost sa-btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => {
                  const id = newId();
                  set(
                    "services",
                    "items",
                  )([
                    ...form.services.items,
                    {
                      _id: id,
                      icon: "briefcase",
                      title: "",
                      text: "",
                      price: "",
                      page_id: "",
                    },
                  ]);
                  setOpenSvc(id);
                }}
                disabled={readOnly || form.services.items.length >= 24}
              >
                <Plus size={15} /> {w.addService}
              </button>
            </Part>

            {/* about */}
            <Part title={w.about} on={form.about.enabled} onToggle={set("about", "enabled")} w={w} disabled={readOnly}>
              <div className="md-fields-grid">
                <Field label={w.aboutTitle} full htmlFor="wt-a-title">
                  <input id="wt-a-title" maxLength={70} value={form.about.title} onChange={set("about", "title")} placeholder={w.aboutTitlePh} disabled={readOnly} />
                </Field>
                <Field label={w.aboutText} full htmlFor="wt-a-text">
                  <textarea id="wt-a-text" rows={5} maxLength={2000} value={form.about.text} onChange={set("about", "text")} disabled={readOnly} />
                </Field>
                <Field label={w.aboutImage} full>
                  <ImagePick value={site.about?.image?.url} busy={busy === "about"} onPick={(b) => upload("about", [b])} onRemove={() => removeImage("about")} r={w.r} maxSize={1400} disabled={readOnly} />
                </Field>
              </div>
              <Field label={w.highlights} hint={w.highlightsHint}>
                <div className="ws-links">
                  {form.about.highlights.map((h, i) => (
                    <div key={i} className="ws-link ws-hl">
                      <input value={h.value} maxLength={20} placeholder={["15+", "200", "40", "500+"][i]} onChange={(e) => setHl(i, { value: e.target.value })} disabled={readOnly} />
                      <input value={h.label} maxLength={40} placeholder={w.hlLabelPh[i]} onChange={(e) => setHl(i, { label: e.target.value })} disabled={readOnly} />
                      <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => set("about", "highlights")(form.about.highlights.filter((_, j) => j !== i))} aria-label={w.remove} disabled={readOnly}>
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

            {/* gallery */}
            <Part title={w.gallery} on={form.gallery.enabled} onToggle={set("gallery", "enabled")} w={w} disabled={readOnly}>
              <Field label={w.galleryTitle} htmlFor="wt-g-title">
                <input id="wt-g-title" maxLength={70} value={form.gallery.title} onChange={set("gallery", "title")} placeholder={st.gallery} disabled={readOnly} />
              </Field>
              <Gallery images={site.gallery?.images || []} busy={busy === "gallery"} onAdd={(files) => upload("gallery", files)} onRemove={(i) => removeImage("gallery", { index: i })} w={w} disabled={readOnly} />
            </Part>

            {/* message form */}
            <Part title={w.form} on={form.form.enabled} onToggle={set("form", "enabled")} w={w} disabled={readOnly}>
              <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
                {w.formSub}
              </p>
              <div className="md-fields-grid">
                <Field label={w.formTitle} htmlFor="wt-f-title">
                  <input id="wt-f-title" maxLength={70} value={form.form.title} onChange={set("form", "title")} placeholder={st.writeUs} disabled={readOnly} />
                </Field>
                <Field label={w.formText} htmlFor="wt-f-text">
                  <input id="wt-f-text" maxLength={200} value={form.form.text} onChange={set("form", "text")} placeholder={st.writeUsSub} disabled={readOnly} />
                </Field>
              </div>
              <label className="md-switch">
                <input type="checkbox" checked={form.form.notify_telegram} onChange={set("form", "notify_telegram")} disabled={readOnly} />
                <span className="md-switch-track" />
                <span>
                  {w.notifyTelegram}
                  {!ctx.data.addons?.att_telegram?.active && (
                    <small className="rs-muted" style={{ display: "block" }}>
                      {w.notifyNeedsTelegram}
                    </small>
                  )}
                </span>
              </label>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" style={{ marginTop: 12 }} onClick={() => setView("inbox")}>
                <Inbox size={15} /> {w.openInbox}
                {res.unread > 0 && <span className="rs-badge">{res.unread}</span>}
              </button>
            </Part>

            {/* contact */}
            <Part title={w.contact} on={form.contact.enabled} onToggle={set("contact", "enabled")} w={w} disabled={readOnly}>
              <div className="md-fields-grid">
                <Field label={w.contactTitle} htmlFor="wt-c-title">
                  <input id="wt-c-title" maxLength={70} value={form.contact.title} onChange={set("contact", "title")} placeholder={st.contact} disabled={readOnly} />
                </Field>
                <Field label={w.phone} htmlFor="wt-c-phone">
                  <input id="wt-c-phone" type="tel" maxLength={30} value={form.contact.phone} onChange={set("contact", "phone")} disabled={readOnly} />
                </Field>
                <Field label={w.email} htmlFor="wt-c-email">
                  <input id="wt-c-email" type="email" maxLength={80} value={form.contact.email} onChange={set("contact", "email")} disabled={readOnly} />
                </Field>
                <Field label={w.hours} htmlFor="wt-c-hours">
                  <input id="wt-c-hours" maxLength={120} value={form.contact.hours} onChange={set("contact", "hours")} placeholder={w.hoursPh} disabled={readOnly} />
                </Field>
                <Field label={w.addressLine} full htmlFor="wt-c-address">
                  <input id="wt-c-address" maxLength={200} value={form.contact.address} onChange={set("contact", "address")} disabled={readOnly} />
                </Field>
                <Field label={w.map} full htmlFor="wt-c-map">
                  <input id="wt-c-map" maxLength={300} value={form.contact.map_url} onChange={set("contact", "map_url")} placeholder="https://maps.app.goo.gl/…" disabled={readOnly} />
                </Field>
                {SOCIALS.map((k) => (
                  <Field key={k} label={k === "tiktok" ? "TikTok" : k === "linkedin" ? "LinkedIn" : k === "youtube" ? "YouTube" : k[0].toUpperCase() + k.slice(1)} htmlFor={`wt-c-${k}`}>
                    <input id={`wt-c-${k}`} maxLength={300} value={form.contact[k]} onChange={set("contact", k)} placeholder={k === "telegram" ? "t.me/yourname" : `${k}.com/…`} disabled={readOnly} />
                  </Field>
                ))}
                <Field label={w.footerNote} full htmlFor="wt-foot">
                  <input id="wt-foot" maxLength={200} value={form.footer_note} onChange={set("footer_note")} disabled={readOnly} />
                </Field>
              </div>
            </Part>

            {/* seo */}
            <section className="panel-card">
              <h2>{w.seo}</h2>
              <div className="md-fields-grid">
                <Field label={w.seoTitle} full htmlFor="wt-seo-t">
                  <input id="wt-seo-t" maxLength={70} value={form.seo.title} onChange={set("seo", "title")} placeholder={ctx.data.business.name} disabled={readOnly} />
                </Field>
                <Field label={w.seoDesc} full htmlFor="wt-seo-d">
                  <textarea id="wt-seo-d" rows={2} maxLength={160} value={form.seo.description} onChange={set("seo", "description")} placeholder={w.seoDescPh} disabled={readOnly} />
                </Field>
              </div>
            </section>

            <SaveBar dirty={dirty} saving={saving} onSave={save} onUndo={() => setForm(saved)} r={w.r} disabled={readOnly || slugState === "taken" || slugState === "format" || slugState === "checking"} />
          </div>

          <aside className="ws-side">
            <Preview data={preview} lang={lang} w={w} />
          </aside>
        </div>
      )}

      {buyLook && (
        <PurchaseModal
          stage={
            <div className="rs-stage">
              <LookArt k={buyLook} big />
              <b>{lookName(buyLook)}</b>
              <small>{webLookDesc(buyLook, lang)}</small>
            </div>
          }
          badge={w.look}
          title={w.lookBuyTitle.replace("{name}", lookName(buyLook))}
          sub={w.lookBuySub}
          perks={[w.lookPerk, w.oneTime]}
          price={themes.price}
          buyLabel={w.buy.replace("{coins}", fmt(themes.price))}
          buy={async () => {
            const r = await attendanceService.site.buyTheme(ctx.id, buyLook);
            if (r.themes) setRes((old) => ({ ...old, themes: r.themes }));
            return r;
          }}
          doneSub={w.lookDone.replace("{name}", lookName(buyLook))}
          onDone={() => {
            setForm((f) => ({ ...f, theme: buyLook }));
            ctx.reload();
          }}
          onClose={() => setBuyLook(null)}
        />
      )}
    </div>
  );
}

// where a button goes: a part, a page or a web address
function Target({ value, onChange, id, targets, w, disabled }) {
  const isUrl = !!value && !value.startsWith("#") && !value.startsWith("page:");
  const [custom, setCustom] = useState(isUrl);
  return (
    <div className="wt-target">
      <select id={id} value={custom || isUrl ? "url" : value} onChange={(e) => (e.target.value === "url" ? (setCustom(true), onChange("")) : (setCustom(false), onChange(e.target.value)))} disabled={disabled}>
        <option value="">{w.auto}</option>
        {targets.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
        <option value="url">{w.toUrl}</option>
      </select>
      {(custom || isUrl) && <input value={value} maxLength={300} placeholder="https://" onChange={(e) => onChange(e.target.value)} disabled={disabled} />}
    </div>
  );
}

// a little drawing of a look: its colours, font and hero layout
export function LookArt({ k, color = "", big = false }) {
  const d = WEB_LOOKS[k] || WEB_LOOKS.classic;
  const accent = color || d.accent;
  return (
    <span
      className={`wt-art h-${d.hero} n-${d.nav} ${big ? "big" : ""}`}
      style={{
        "--a-bg": d.bg,
        "--a-fg": d.fg,
        "--a-ac": accent,
        "--a-ac2": d.accent2 || accent,
        "--a-card": d.card,
        "--a-r": `${Math.min(d.r, 10)}px`,
        fontFamily: `${d.head}, sans-serif`,
      }}
    >
      <span className="wt-art-bar">
        <i />
        <em />
        <em />
        <em />
      </span>
      <span className="wt-art-hero">
        <span className="wt-art-text">
          <b>Aa</b>
          <u />
          <u className="short" />
          <s />
        </span>
        <span className="wt-art-img" />
      </span>
      <span className="wt-art-cards">
        <i />
        <i />
        <i />
      </span>
    </span>
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

function Gallery({ images, busy, onAdd, onRemove, w, disabled }) {
  const ref = useRef(null);
  return (
    <div className="ws-gallery">
      {images.map((img, i) => (
        <span key={img.public_id || img.url} className="ws-shot">
          <img src={img.url} alt="" />
          <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => onRemove(i)} aria-label={w.remove} disabled={disabled || busy}>
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

// the website drawn in a frame: phone (390 px) or computer (1200 px shrunk to fit)
function Preview({ data, lang, w }) {
  const [mode, setMode] = useState("phone");
  const [page, setPage] = useState("");
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
  const go = (next, anchor) => {
    setPage(next || "");
    const frame = box.current?.querySelector(".ws-frame-scroll");
    setTimeout(() => {
      const el = anchor && frame?.querySelector(`#cw-${anchor}`);
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
            <WebView data={data} lang={lang} page={page} go={go} preview />
          </div>
        </div>
      </div>
      <small className="rs-muted">{w.previewNote}</small>
    </div>
  );
}

// messages sent from the website's form
function InboxView({ ctx, w, onUnread }) {
  const [rows, setRows] = useState(null);
  const [unread, setUnread] = useState(0);
  const load = useCallback(
    () =>
      attendanceService.site
        .messages(ctx.id)
        .then((r) => {
          setRows(r.data);
          setUnread(r.unread);
          onUnread(r.unread);
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx, onUnread],
  );
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const mark = async (m, read) => {
    const r = await attendanceService.site.readMessage(ctx.id, m._id, read);
    setRows((list) => list.map((x) => (x._id === m._id ? r.data : x)));
    setUnread(r.unread);
    onUnread(r.unread);
  };
  const remove = async (m) => {
    const r = await attendanceService.site.removeMessage(ctx.id, m._id);
    setRows((list) => list.filter((x) => x._id !== m._id));
    setUnread(r.unread);
    onUnread(r.unread);
  };
  if (!rows) return <ListSkeleton rows={3} />;
  const isEmail = (c) => /@/.test(c);
  return (
    <section className="panel-card">
      <div className="wt-inbox-head">
        <h2>
          {w.inbox} {unread > 0 && <span className="rs-badge">{w.msgUnread.replace("{n}", unread)}</span>}
        </h2>
        {unread > 0 && (
          <button
            type="button"
            className="md-btn md-btn-ghost sa-btn-sm"
            onClick={() =>
              attendanceService.site.readAll(ctx.id).then(() => {
                setRows((list) => list.map((x) => ({ ...x, read: true })));
                setUnread(0);
                onUnread(0);
              })
            }
          >
            <Check size={15} /> {w.readAll}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="rs-muted">{w.msgEmpty}</p>
      ) : (
        <div className="wt-msgs">
          {rows.map((m) => (
            <article key={m._id} className={`wt-msg ${m.read ? "" : "new"}`}>
              <div className="wt-msg-top">
                <b>{m.name}</b>
                <span className={`rs-pill k-${m.kind}`}>{w.kinds[m.kind] || m.kind}</span>
                <small className="rs-muted">{fmtDate(m.created_date, ctx.lang)}</small>
              </div>
              <p>{m.message}</p>
              <div className="wt-msg-foot">
                <a className="md-btn md-btn-ghost sa-btn-sm" href={isEmail(m.contact) ? `mailto:${m.contact}` : `tel:${m.contact.replace(/\s+/g, "")}`}>
                  {isEmail(m.contact) ? <Mail size={14} /> : <Phone size={14} />} {m.contact}
                </a>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => mark(m, !m.read)}>
                  {m.read ? w.markUnread : w.markRead}
                </button>
                <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => remove(m)} aria-label={w.remove}>
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
