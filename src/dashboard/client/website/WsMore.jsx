import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  Copy,
  Download,
  ExternalLink,
  EyeOff,
  Files,
  Globe,
  Inbox,
  Link2,
  Loader2,
  Lock,
  Mail,
  Monitor,
  Newspaper,
  Paintbrush,
  Palette,
  Pencil,
  Phone,
  Plus,
  Puzzle,
  RotateCcw,
  Search,
  Send,
  Settings,
  Smartphone,
  Store,
  Trash2,
  Unplug,
  Upload,
  WifiOff,
} from "lucide-react";
import { licenseService, websiteService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { qrDesignSvg } from "../../../qrgen/qrDesign";
import { downloadPng } from "../menuqr/qrArt";
import { tx } from "../../../wsite/blocks";
import { WS_COLORS, WS_FONTS, WS_FONT_KEYS, WS_FREE, WS_FREE_FONTS, WS_THEME_CATS, WS_THEME_KEYS, WS_THEME_STYLES, WS_THEMES, loadWsFont, wsLook, wsThemeDesc } from "../../../wsite/themes";
import SiteView from "../../../wsite/SiteView";
import { Confirm, Head, ImageField, MediaPicker, Switch, TrInput } from "./WsFields";
import { TemplatePicker } from "./WsEditor";
import { SITE, fmt, fmtDate } from "./text";

export const ADDON_ICON = { web_telegram: Send, web_brand: Paintbrush, web_pages: Files, web_blog: Newspaper, web_nobrand: EyeOff, web_slug: Link2 };

// save part of the site settings, keep the dashboard in step
async function saveSite(ctx, body) {
  try {
    const r = await websiteService.save(ctx.id, body);
    ctx.put((d) => ({ site: { ...d.site, ...r.data } }));
    return r.data;
  } catch (e) {
    if (e.status === 402 && e.response?.product) ctx.askBuy(e.response.product === "web_theme" ? { theme: e.response.item } : { addon: e.response.product });
    else ctx.notify({ type: "error", text: e.message });
    throw e;
  }
}

export function Locked({ ctx, addon, children }) {
  const { m, data, readOnly } = ctx;
  const a = data.addons[addon] || {};
  const Icon = ADDON_ICON[addon] || Lock;
  return (
    <section className="panel-card mq-locked">
      <Icon size={24} />
      <b>{m.addonNames[addon]}</b>
      <p className="rs-muted">{m.addonWhat[addon]}</p>
      {children}
      <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon })} disabled={readOnly} data-testid={`ws-unlock-${addon}`}>
        <CoinIcon size={16} /> {m.unlock.replace("{coins}", `${fmt(a.price)} ${m.coins}${a.days ? ` ${m.perYear}` : ""}`)}
      </button>
    </section>
  );
}

// ---------------------------------------- look & style ----------------------------------------
// the main colours of a picture (for "colours from my logo")
async function logoColors(url) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 48;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0, 48, 48);
  const px = g.getImageData(0, 0, 48, 48).data;
  const buckets = new Map();
  for (let i = 0; i < px.length; i += 4) {
    const [r, gg, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
    if (a < 128) continue;
    const max = Math.max(r, gg, b);
    const min = Math.min(r, gg, b);
    if (max > 240 && min > 225) continue; // white
    if (max < 25) continue; // black
    const sat = max ? (max - min) / max : 0;
    const key = `${r >> 4},${gg >> 4},${b >> 4}`;
    const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0, sat: 0 };
    e.n += 1;
    e.r += r;
    e.g += gg;
    e.b += b;
    e.sat += sat;
    buckets.set(key, e);
  }
  const hex = (e) => `#${[e.r / e.n, e.g / e.n, e.b / e.n].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  const list = [...buckets.values()].sort((a, b) => b.n * (0.4 + b.sat / b.n) - a.n * (0.4 + a.sat / a.n));
  if (!list.length) return null;
  const first = list[0];
  const far = (e) => Math.abs(e.r / e.n - first.r / first.n) + Math.abs(e.g / e.n - first.g / first.n) + Math.abs(e.b / e.n - first.b / first.n) > 120;
  const second = list.find(far) || first;
  return [hex(first), hex(second)];
}

function ThemeCard({ k, site, on, owned, price, picked, onPick, m, lang }) {
  const t = WS_THEMES[k];
  const look = useMemo(() => wsLook({ ...site, theme: k, style: {} }), [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <button type="button" className={`wst-theme ${on ? "on" : ""} ${picked ? "picked" : ""}`} onClick={() => onPick(k)} data-testid={`ws-theme-${k}`}>
      <span className="wst-mini" style={look.vars} {...look.attrs} aria-hidden="true">
        <span className="wst-mini-top">
          <i />
          <em />
        </span>
        <span className="wst-mini-hero">
          <b style={{ fontFamily: "var(--ws-head)" }}>{tx(site.name, lang) || "Aa"}</b>
          <span className="wst-mini-btn" />
        </span>
        <span className="wst-mini-cards">
          <i />
          <i />
          <i />
        </span>
      </span>
      <span className="wst-meta">
        <b>{lang === "km" ? t.km : t.en}</b>
        {on ? (
          <span className="xt-tag own">
            <Check size={11} /> {m.inUse}
          </span>
        ) : WS_FREE.includes(k) ? (
          <span className="xt-tag">{m.free}</span>
        ) : owned ? (
          <span className="xt-tag own">{m.owned}</span>
        ) : (
          <span className="wst-price">
            <CoinIcon size={12} /> {fmt(price)}
          </span>
        )}
      </span>
    </button>
  );
}

// your own pages in a look, before buying it
function ThemePreview({ ctx, k, onUse, busy }) {
  const { m, lang, data, readOnly } = ctx;
  const s = data.site;
  const t = WS_THEMES[k];
  const current = s.theme === k;
  const owned = data.themes.owned.includes(k);
  const site = useMemo(() => (current ? s : { ...s, theme: k, style: {} }), [current, s, k]);
  const [device, setDevice] = useState("computer");
  const [slug, setSlug] = useState("");
  const pages = data.pages;
  const frame = useRef(null);
  const [zoom, setZoom] = useState(0.4);
  useEffect(() => {
    const el = frame.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setZoom(Math.min(1, e.contentRect.width / (device === "phone" ? 390 : 1280))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [device]);
  const nav = (to) => ({
    href: "#",
    onClick: (e) => {
      e.preventDefault();
      if (String(to).startsWith("page:")) setSlug(String(to).slice(5));
    },
  });
  const cat = WS_THEME_CATS.find((c) => c.key === t.cat);
  return (
    <aside className="panel-card wst-preview" data-testid="ws-theme-preview">
      <div className="wst-pv-head">
        <div>
          <small className="rs-muted">{cat ? (lang === "km" ? cat.km : cat.en) : ""}</small>
          <h3>{lang === "km" ? t.km : t.en}</h3>
          <p className="rs-muted">{wsThemeDesc(k, lang)}</p>
        </div>
        {current ? (
          <span className="xt-state">
            <Check size={15} /> {m.inUse}
          </span>
        ) : (
          <button type="button" className={`md-btn ${owned ? "md-btn-primary" : "md-btn-primary rs-gold-btn"}`} onClick={() => onUse(k)} disabled={readOnly || !!busy} data-testid="ws-theme-apply">
            {busy === k ? <Loader2 size={15} className="md-spin" /> : owned ? <Check size={15} /> : <CoinIcon size={15} />} {owned ? m.useLook : m.buyLook.replace("{coins}", fmt(data.themes.price))}
          </button>
        )}
      </div>
      <div className="wst-pv-bar">
        <small className="rs-muted">{m.previewHint}</small>
        <div className="wse-device">
          <button type="button" className={device === "phone" ? "on" : ""} onClick={() => setDevice("phone")} aria-label={m.phone}>
            <Smartphone size={15} />
          </button>
          <button type="button" className={device === "computer" ? "on" : ""} onClick={() => setDevice("computer")} aria-label={m.computer}>
            <Monitor size={15} />
          </button>
        </div>
      </div>
      <div className={`wst-pv-frame d-${device}`} ref={frame}>
        <div className="wst-pv-scroll">
          {pages.length ? (
            <div style={{ width: device === "phone" ? 390 : 1280, zoom }}>
              <SiteView site={site} pages={pages} view={{ kind: "page", slug }} lang={s.langs?.[0] || lang} setLang={() => {}} blog={ctx.on("web_blog")} posts={data.postsPreview || []} branding={!ctx.on("web_nobrand")} nav={nav} preview />
            </div>
          ) : (
            <p className="rs-muted wst-pv-empty">{m.noPagesYet}</p>
          )}
        </div>
      </div>
    </aside>
  );
}

export function StyleTab({ ctx }) {
  const { m, lang, data, readOnly, notify } = ctx;
  const s = data.site;
  const st = s.style || {};
  const brand = ctx.on("web_brand");
  const [busy, setBusy] = useState("");
  const [picked, setPicked] = useState(s.theme);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [fam, setFam] = useState("");
  const [limit, setLimit] = useState(48);
  useEffect(() => setLimit(48), [cat, q, fam]);
  const themeFont = WS_THEMES[s.theme]?.font;
  const set = async (patch, key) => {
    setBusy(key || "x");
    try {
      await saveSite(ctx, { style: patch });
    } catch {
      /* shown */
    } finally {
      setBusy("");
    }
  };
  const useTheme = async (k) => {
    if (!data.themes.owned.includes(k)) return ctx.askBuy({ theme: k });
    setBusy(k);
    try {
      const r = await websiteService.buyTheme(ctx.id, k);
      ctx.put(r.data);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  useEffect(() => {
    WS_FONT_KEYS.forEach(loadWsFont);
  }, []);
  const qq = q.trim().toLowerCase();
  const shown = WS_THEME_KEYS.filter((k) => {
    const t = WS_THEMES[k];
    if (cat === "free" && !WS_FREE.includes(k)) return false;
    if (cat === "owned" && !data.themes.owned.includes(k)) return false;
    if (!["all", "free", "owned"].includes(cat) && t.cat !== cat) return false;
    if (fam && t.style !== fam) return false;
    return !qq || `${t.en} ${t.km} ${k} ${wsThemeDesc(k, "en")} ${wsThemeDesc(k, "km")}`.toLowerCase().includes(qq);
  });
  const chips = [
    ["all", m.allLooks, WS_THEME_KEYS.length],
    ["free", m.free, WS_FREE.length],
    ["owned", m.owned, data.themes.owned.length],
    ...WS_THEME_CATS.map((c) => [c.key, lang === "km" ? c.km : c.en, WS_THEME_KEYS.filter((k) => WS_THEMES[k].cat === c.key).length]),
  ];
  return (
    <div className="wst-layout">
      <div className="rs-col wst-left">
        <Head icon={Palette} title={m.looksTitle} sub={m.looksSub.replace("{coins}", fmt(data.themes.price)).replace("{n}", WS_THEME_KEYS.length)} />
        <section className="panel-card wst-filter">
          <label className="db-biz-search wst-search">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.searchLooks} aria-label={m.searchLooks} data-testid="ws-theme-q" />
          </label>
          <div className="wst-chips">
            {chips.map(([k, label, n]) => (
              <button key={k} type="button" className={cat === k ? "on" : ""} onClick={() => setCat(k)} data-testid={`ws-cat-${k}`}>
                {label} <small>{n}</small>
              </button>
            ))}
          </div>
          <select className="wst-fam" value={fam} onChange={(e) => setFam(e.target.value)} aria-label={m.allStyles} data-testid="ws-theme-style">
            <option value="">{m.allStyles}</option>
            {WS_THEME_STYLES.map((f) => (
              <option key={f.key} value={f.key}>
                {lang === "km" ? f.km : f.en} ({WS_THEME_KEYS.filter((k) => WS_THEMES[k].style === f.key).length})
              </option>
            ))}
          </select>
        </section>
        <div className="wst-grid">
          {shown.slice(0, limit).map((k) => (
            <ThemeCard key={k} k={k} site={s} on={s.theme === k} owned={data.themes.owned.includes(k)} price={data.themes.price} picked={picked === k} onPick={setPicked} m={m} lang={lang} />
          ))}
          {!shown.length && <p className="rs-muted">{m.noLooks}</p>}
        </div>
        {shown.length > limit && (
          <button type="button" className="md-btn md-btn-ghost wst-more" onClick={() => setLimit((n) => n + 48)} data-testid="ws-theme-more">
            {m.moreLooks.replace("{n}", shown.length - limit)}
          </button>
        )}

        <section className="panel-card wst-sec">
          <h3>{m.colorTitle}</h3>
          <p className="rs-muted">{m.colorSub}</p>
          <div className="wst-colors">
            <button type="button" className={`wst-swatch theme ${!st.color ? "on" : ""}`} style={{ "--sw": WS_THEMES[s.theme]?.c }} onClick={() => set({ color: "" })} disabled={readOnly} title={m.colorTheme}>
              {!st.color && <Check size={14} />}
            </button>
            {WS_COLORS.map((c) => (
              <button key={c} type="button" className={`wst-swatch ${st.color?.toUpperCase() === c ? "on" : ""}`} style={{ "--sw": c }} onClick={() => set({ color: c })} disabled={readOnly} aria-label={c} data-testid={`ws-color-${c.slice(1)}`}>
                {st.color?.toUpperCase() === c && <Check size={14} />}
              </button>
            ))}
          </div>
          <div className={`wst-brand ${brand ? "" : "locked"}`}>
            {!brand && (
              <button type="button" className="wst-brand-lock" onClick={() => ctx.askBuy({ addon: "web_brand" })} disabled={readOnly} data-testid="ws-brand-lock">
                <Lock size={14} /> {m.brandLock} · <CoinIcon size={13} /> {fmt(data.addons.web_brand.price)}
              </button>
            )}
            {[
              ["color", m.colorTitle],
              ["accent", m.accent],
              ["bg", m.bg],
            ].map(([key, label]) => (
              <label key={key} className="wst-pick">
                <input
                  type="color"
                  value={st[key] || (key === "bg" ? WS_THEMES[s.theme]?.bg : key === "accent" ? WS_THEMES[s.theme]?.c2 : WS_THEMES[s.theme]?.c) || "#ffffff"}
                  disabled={!brand || readOnly}
                  onChange={(e) => set({ [key]: e.target.value.toUpperCase() })}
                  data-testid={`ws-pick-${key}`}
                />
                <span>{label}</span>
                {st[key] && brand && (
                  <button type="button" className="md-icon-btn" onClick={() => set({ [key]: "" })} aria-label="Reset">
                    <RotateCcw size={13} />
                  </button>
                )}
              </label>
            ))}
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              disabled={!brand || readOnly || busy === "logo"}
              data-testid="ws-from-logo"
              onClick={async () => {
                if (!s.logo) return notify({ type: "error", text: m.fromLogoNone });
                setBusy("logo");
                try {
                  const cols = await logoColors(s.logo);
                  if (cols) {
                    await saveSite(ctx, { style: { color: cols[0], accent: cols[1] } });
                    notify({ type: "success", text: m.fromLogoDone });
                  }
                } catch (e) {
                  notify({ type: "error", text: e.message || "Logo" });
                } finally {
                  setBusy("");
                }
              }}
            >
              {busy === "logo" ? <Loader2 size={14} className="md-spin" /> : <Paintbrush size={14} />} {m.fromLogo}
            </button>
          </div>
        </section>

        <section className="panel-card wst-sec">
          <h3>{m.fontTitle}</h3>
          <p className="rs-muted">{m.fontSub}</p>
          <div className="wst-fonts">
            {WS_FONT_KEYS.map((k) => {
              const f = WS_FONTS[k];
              const allowed = brand || WS_FREE_FONTS.includes(k) || k === themeFont;
              const on = (st.font || themeFont) === k;
              return (
                <button
                  key={k}
                  type="button"
                  className={`wst-font ${on ? "on" : ""} ${allowed ? "" : "locked"}`}
                  onClick={() => (allowed ? set({ font: k === themeFont ? "" : k }) : ctx.askBuy({ addon: "web_brand" }))}
                  disabled={readOnly}
                  data-testid={`ws-font-${k}`}
                >
                  <span className="wst-font-art" style={{ fontFamily: f.head }}>
                    Aa ក
                  </span>
                  <span style={{ fontFamily: f.body }}>
                    {lang === "km" ? f.km : f.en}
                    {k === themeFont && <small> · {m.fontTheme}</small>}
                  </span>
                  {!allowed && <Lock size={12} className="wst-font-lock" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel-card wst-sec wst-row2">
          <div>
            <h3>{m.buttonsTitle}</h3>
            <div className="ws-seg">
              {[
                ["", m.btnTheme],
                ["round", m.btnRound],
                ["pill", m.btnPill],
                ["square", m.btnSquare],
              ].map(([v, l]) => (
                <button key={v || "t"} type="button" className={(st.buttons || "") === v ? "on" : ""} onClick={() => set({ buttons: v })} disabled={readOnly}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3>{m.modeTitle}</h3>
            <div className="ws-seg">
              {[
                ["", m.modeAuto],
                ["light", m.modeLight],
                ["dark", m.modeDark],
              ].map(([v, l]) => (
                <button key={v || "t"} type="button" className={(st.mode || "") === v ? "on" : ""} onClick={() => set({ mode: v })} disabled={readOnly} data-testid={`ws-mode-${v || "auto"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
      <ThemePreview ctx={ctx} k={picked} onUse={useTheme} busy={busy} />
    </div>
  );
}

// ---------------------------------------- settings ----------------------------------------
export function SettingsTab({ ctx }) {
  const { m, data, readOnly, notify } = ctx;
  const s = data.site;
  const [f, setF] = useState(() => ({ footer: s.footer, contact: s.contact, seo: s.seo }));
  const [busy, setBusy] = useState(false);
  const [slugEdit, setSlugEdit] = useState(null);
  const [starter, setStarter] = useState(false);
  const [offline, setOffline] = useState(false);
  const link = `${SITE}/site/${s.slug}`;
  const qr = useMemo(() => qrDesignSvg({ text: link, design: "plain", size: 220 }), [link]);
  const setC = (k) => (e) => setF((x) => ({ ...x, contact: { ...x.contact, [k]: e.target.value } }));
  const langs = s.langs?.length ? s.langs : ["km", "en"];
  const save = async () => {
    setBusy(true);
    try {
      await saveSite(ctx, f);
      notify({ type: "success", text: m.saved });
    } catch {
      /* shown */
    } finally {
      setBusy(false);
    }
  };
  const setLangs = (next) => saveSite(ctx, { langs: next }).catch(() => {});
  return (
    <div className="rs-col">
      <Head icon={Settings} title={m.tabs.settings} />
      <section className="panel-card wss-link">
        <span className="wss-qr" dangerouslySetInnerHTML={{ __html: qr }} />
        <div className="wss-link-main">
          <h3>{m.linkTitle}</h3>
          <p className="rs-muted">{m.linkSub}</p>
          <code data-testid="ws-link">{link.replace(/^https?:\/\//, "")}</code>
          <div className="wss-acts">
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(link);
                notify({ type: "success", text: m.copied });
              }}
            >
              <Copy size={14} /> {m.copy}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => downloadPng(qrDesignSvg({ text: link, design: "plain", size: 900 }), `${s.slug}-qr.png`, 1.2)}>
              <Download size={14} /> {m.downloadQr}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => (ctx.on("web_slug") ? setSlugEdit(s.slug) : ctx.askBuy({ addon: "web_slug" }))} disabled={readOnly} data-testid="ws-slug-edit">
              {ctx.on("web_slug") ? <Pencil size={14} /> : <Lock size={14} />} {m.slugChange}
            </button>
          </div>
        </div>
      </section>

      <section className="panel-card wss-sec">
        <h3>{m.langsTitle}</h3>
        <p className="rs-muted">{m.langsSub}</p>
        <div className="wss-langs">
          {["km", "en"].map((l) => {
            const on = langs.includes(l);
            return (
              <div key={l} className="wss-lang">
                <Switch checked={on} disabled={readOnly || (on && langs.length === 1)} onChange={(v) => setLangs(v ? [...langs, l] : langs.filter((x) => x !== l))} label={l === "km" ? "ខ្មែរ" : "English"} />
                {on &&
                  langs.length > 1 &&
                  (langs[0] === l ? (
                    <span className="xt-tag own">{m.first}</span>
                  ) : (
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setLangs([l, ...langs.filter((x) => x !== l)])} disabled={readOnly}>
                      {m.makeFirst}
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel-card md-fields wss-sec">
        <h3>{m.contactTitle}</h3>
        <p className="rs-muted">{m.contactSub}</p>
        <div className="wss-two">
          {[
            ["phone", "Phone / ទូរស័ព្ទ", "012 345 678"],
            ["telegram", "Telegram", "@yourname"],
            ["facebook", "Facebook", "facebook.com/…"],
            ["instagram", "Instagram", "instagram.com/…"],
            ["tiktok", "TikTok", "tiktok.com/@…"],
            ["youtube", "YouTube", "youtube.com/@…"],
            ["email", "Email / អ៊ីមែល", "you@example.com"],
            ["map_url", "Google Maps", "https://maps.app.goo.gl/…"],
          ].map(([k, label, ph]) => (
            <label key={k} className="ws-field">
              <span className="ws-field-label">{label}</span>
              <input value={f.contact?.[k] || ""} onChange={setC(k)} placeholder={ph} maxLength={k === "map_url" ? 800 : 300} data-testid={`ws-c-${k}`} />
            </label>
          ))}
          <TrInput value={f.contact?.address} onChange={(v) => setF((x) => ({ ...x, contact: { ...x.contact, address: v } }))} elang="km" label="អាសយដ្ឋាន / Address" max={300} m={m} />
          <TrInput value={f.contact?.address} onChange={(v) => setF((x) => ({ ...x, contact: { ...x.contact, address: v } }))} elang="en" label="អាសយដ្ឋាន / Address" max={300} m={m} />
          <TrInput value={f.footer} onChange={(v) => setF((x) => ({ ...x, footer: v }))} elang="km" label={m.footerText} max={300} m={m} />
          <TrInput value={f.footer} onChange={(v) => setF((x) => ({ ...x, footer: v }))} elang="en" label={m.footerText} max={300} m={m} />
        </div>
      </section>

      <section className="panel-card md-fields wss-sec">
        <h3>{m.seoTitle}</h3>
        <p className="rs-muted">{m.seoSub}</p>
        <div className="wss-two">
          <TrInput value={f.seo?.title} onChange={(v) => setF((x) => ({ ...x, seo: { ...x.seo, title: v } }))} elang="km" label={m.seoName} max={80} m={m} />
          <TrInput value={f.seo?.title} onChange={(v) => setF((x) => ({ ...x, seo: { ...x.seo, title: v } }))} elang="en" label={m.seoName} max={80} m={m} />
          <TrInput value={f.seo?.description} onChange={(v) => setF((x) => ({ ...x, seo: { ...x.seo, description: v } }))} elang="km" label={m.seoDesc} long max={300} m={m} />
          <TrInput value={f.seo?.description} onChange={(v) => setF((x) => ({ ...x, seo: { ...x.seo, description: v } }))} elang="en" label={m.seoDesc} long max={300} m={m} />
        </div>
        <ImageField value={f.seo?.image} onChange={(v) => setF((x) => ({ ...x, seo: { ...x.seo, image: v } }))} label={m.seoImage} ctx={ctx} />
      </section>

      <div className="wss-save">
        <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || readOnly} data-testid="ws-settings-save">
          {busy && <Loader2 size={15} className="md-spin" />} {m.save}
        </button>
      </div>

      <section className="panel-card wss-sec wss-danger">
        <div>
          <h3>{m.changeStarter}</h3>
          <p className="rs-muted">{m.startSub}</p>
        </div>
        <button type="button" className="md-btn md-btn-ghost" onClick={() => setStarter(true)} disabled={readOnly} data-testid="ws-change-starter">
          <RotateCcw size={15} /> {m.changeStarter}
        </button>
      </section>
      {s.published && (
        <section className="panel-card wss-sec wss-danger">
          <div>
            <h3>{m.offlineTitle}</h3>
            <p className="rs-muted">{m.offlineSub}</p>
          </div>
          <button type="button" className="md-btn md-btn-ghost sa-danger-text" onClick={() => setOffline(true)} disabled={readOnly}>
            <WifiOff size={15} /> {m.unpublish}
          </button>
        </section>
      )}
      {slugEdit !== null && <SlugModal ctx={ctx} value={slugEdit} onClose={() => setSlugEdit(null)} />}
      {starter && (
        <Modal title={m.changeStarter} onClose={() => setStarter(false)} size="md-modal-lg">
          <TemplatePicker ctx={ctx} replace onDone={() => setStarter(false)} />
        </Modal>
      )}
      {offline && (
        <Confirm
          m={m}
          title={m.offlineTitle}
          sub={m.offlineSub}
          yes={m.unpublish}
          onYes={async () => {
            const r = await websiteService.unpublish(ctx.id);
            ctx.put((d) => ({ site: { ...d.site, ...r.data } }));
          }}
          onClose={() => setOffline(false)}
        />
      )}
    </div>
  );
}
function SlugModal({ ctx, value, onClose }) {
  const { m } = ctx;
  const [v, setV] = useState(value);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={m.slugChange}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button
            type="button"
            className="md-btn md-btn-primary"
            disabled={busy}
            data-testid="ws-slug-save"
            onClick={async () => {
              if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(v)) return setErr(m.slugBad);
              setBusy(true);
              try {
                const r = await websiteService.save(ctx.id, { slug: v });
                ctx.put((d) => ({ site: { ...d.site, ...r.data } }));
                onClose();
              } catch (e) {
                setErr(e.status === 409 ? m.slugTaken : e.message);
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 size={15} className="md-spin" />} {m.save}
          </button>
        </>
      }
    >
      <p className="rs-muted" style={{ marginTop: 0 }}>
        {m.slugWhat}
      </p>
      <div className="wse-slug">
        <span>/site/</span>
        <input value={v} onChange={(e) => setV(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} maxLength={40} autoFocus data-testid="ws-slug-input" />
      </div>
      {err && (
        <div className="md-form-error" style={{ marginTop: 10 }}>
          {err}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------- profile: logo, name ----------------------------------------
export function ProfileTab({ ctx }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const s = data.site;
  const [f, setF] = useState(() => ({ name: s.name, tagline: s.tagline }));
  const [busy, setBusy] = useState("");
  const [lib, setLib] = useState(false);
  const file = useRef(null);
  const setLogo = async (url) => {
    try {
      await saveSite(ctx, { logo: url });
      notify({ type: "success", text: url ? m.logoSaved : m.saved });
    } catch {
      /* shown */
    }
  };
  const upload = async (fl) => {
    setBusy("logo");
    try {
      const r = await websiteService.upload(id, fl);
      await setLogo(r.data.url);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const name = tx(f.name, lang) || data.business.name;
  return (
    <div className="rs-col">
      <Head icon={Store} title={m.tabs.profile} sub={m.profileSub} />
      <section className="panel-card wsp-logo">
        <div className="wsp-logo-pic">{s.logo ? <img src={s.logo} alt="" data-testid="ws-logo-img" /> : <Globe size={40} />}</div>
        <div className="wsp-logo-main">
          <h3>{m.logo}</h3>
          <p className="rs-muted">{m.logoSub}</p>
          <div className="wss-acts">
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => file.current?.click()} disabled={readOnly || !!busy} data-testid="ws-logo-upload">
              {busy === "logo" ? <Loader2 size={14} className="md-spin" /> : <Upload size={14} />} {s.logo ? m.logoChange : m.logoUpload}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setLib(true)} disabled={readOnly}>
              {m.fromLibrary}
            </button>
            {s.logo && (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={() => setLogo("")} disabled={readOnly}>
                <Trash2 size={14} /> {m.removeImage}
              </button>
            )}
          </div>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} data-testid="ws-logo-input" />
        </div>
      </section>
      <section className="panel-card md-fields wss-sec">
        <h3>{m.siteTitle}</h3>
        <div className="wss-two">
          <TrInput value={f.name} onChange={(v) => setF((x) => ({ ...x, name: v }))} elang="km" label={m.siteName} max={80} m={m} testid="ws-name-km" />
          <TrInput value={f.name} onChange={(v) => setF((x) => ({ ...x, name: v }))} elang="en" label={m.siteName} max={80} m={m} testid="ws-name-en" />
          <TrInput value={f.tagline} onChange={(v) => setF((x) => ({ ...x, tagline: v }))} elang="km" label={m.tagline} max={160} m={m} />
          <TrInput value={f.tagline} onChange={(v) => setF((x) => ({ ...x, tagline: v }))} elang="en" label={m.tagline} max={160} m={m} />
        </div>
        <div className="wss-acts">
          <button
            type="button"
            className="md-btn md-btn-primary"
            disabled={readOnly || busy === "save"}
            data-testid="ws-profile-save"
            onClick={async () => {
              setBusy("save");
              try {
                await saveSite(ctx, f);
                notify({ type: "success", text: m.saved });
              } catch {
                /* shown */
              } finally {
                setBusy("");
              }
            }}
          >
            {busy === "save" && <Loader2 size={15} className="md-spin" />} {m.save}
          </button>
        </div>
      </section>
      <section className="panel-card wsp-where">
        <h3>{m.logoWhere}</h3>
        <div className="wsp-where-row">
          <div className="wsp-chip">
            {s.logo ? (
              <img src={s.logo} alt="" />
            ) : (
              <span className="wsp-mark">
                <Globe size={18} />
              </span>
            )}
            <span>
              <b>{name}</b>
              <small>{m.whereDash}</small>
            </span>
          </div>
          <div className="wsp-chip">
            {s.logo ? <img src={s.logo} alt="" /> : <span className="wsp-mark">{name.slice(0, 1)}</span>}
            <span>
              <b>{name}</b>
              <small>{m.whereSite.replace("{slug}", s.slug)}</small>
            </span>
          </div>
        </div>
      </section>
      {lib && (
        <MediaPicker
          ctx={ctx}
          onClose={() => setLib(false)}
          onPick={(u) => {
            setLib(false);
            setLogo(u);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------- messages ----------------------------------------
export function InboxTab({ ctx }) {
  const { id, m, lang, readOnly, notify } = ctx;
  const [rows, setRows] = useState(null);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const load = (p = page) =>
    websiteService
      .messages(id, { page: p })
      .then((r) => {
        setRows(r.data);
        setUnread(r.unread);
        setPages(r.pagination.totalPages || 1);
        ctx.put((d) => ({ counts: { ...d.counts, unread: r.unread } }));
      })
      .catch((e) => notify({ type: "error", text: e.message }));
  useEffect(() => {
    load(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (fn) => {
    try {
      await fn();
      load();
    } catch (e) {
      notify({ type: "error", text: e.message });
    }
  };
  return (
    <div className="rs-col">
      <Head icon={Inbox} title={m.inboxTitle} sub={m.inboxSub}>
        {unread > 0 && (
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => act(() => websiteService.readAll(id))} disabled={readOnly}>
            <Check size={14} /> {m.readAll}
          </button>
        )}
      </Head>
      {rows && !rows.length && <section className="panel-card sa-empty-state">{m.inboxEmpty}</section>}
      <div className="wsi-list">
        {(rows || []).map((r) => (
          <article key={r._id} className={`panel-card wsi-msg ${r.read ? "" : "new"}`} data-testid="ws-msg">
            <div className="wsi-top">
              <b>{r.name || "—"}</b>
              <small className="rs-muted">
                {new Date(r.created_date).toLocaleString(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                {r.page ? ` · ${m.fromPage.replace("{page}", r.page)}` : ""}
              </small>
            </div>
            <p>{r.text}</p>
            <div className="wsi-foot">
              {r.phone && (
                <a className="md-btn md-btn-ghost sa-btn-sm" href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone size={14} /> {r.phone}
                </a>
              )}
              {r.email && (
                <a className="md-btn md-btn-ghost sa-btn-sm" href={`mailto:${r.email}`}>
                  <Mail size={14} /> {r.email}
                </a>
              )}
              <span className="wsi-acts">
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => act(() => websiteService.readMessage(id, r._id, !r.read))} disabled={readOnly}>
                  {r.read ? m.markUnread : m.markRead}
                </button>
                <button type="button" className="md-icon-btn" onClick={() => act(() => websiteService.removeMessage(id, r._id))} disabled={readOnly} aria-label={m.delete}>
                  <Trash2 size={15} />
                </button>
              </span>
            </div>
          </article>
        ))}
      </div>
      {pages > 1 && (
        <div className="wsi-pager">
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ‹
          </button>
          <span>
            {page} / {pages}
          </span>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            ›
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------- blog ----------------------------------------
function PostModal({ ctx, post, onClose, onSaved }) {
  const { id, m, notify } = ctx;
  const [f, setF] = useState(() => ({
    title: post?.title || { km: "", en: "" },
    excerpt: post?.excerpt || { km: "", en: "" },
    body: post?.body || { km: "", en: "" },
    cover: post?.cover || "",
    category: post?.category || "",
    published: post ? post.published : true,
    date: (post?.date || new Date().toISOString()).slice(0, 10),
  }));
  const [elang, setElang] = useState("km");
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal
      title={post ? m.editPost : m.newPost}
      onClose={onClose}
      busy={busy}
      size="md-modal-lg"
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button
            type="button"
            className="md-btn md-btn-primary"
            disabled={busy || (!f.title.km.trim() && !f.title.en.trim())}
            data-testid="ws-post-save"
            onClick={async () => {
              setBusy(true);
              try {
                const r = post ? await websiteService.savePost(id, post._id, f) : await websiteService.addPost(id, f);
                onSaved(r.data);
                onClose();
              } catch (e) {
                notify({ type: "error", text: e.message });
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 size={15} className="md-spin" />} {m.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <div className="wse-lang">
          <span>{m.editIn}</span>
          {["km", "en"].map((l) => (
            <button key={l} type="button" className={elang === l ? "on" : ""} onClick={() => setElang(l)}>
              {l === "km" ? "ខ្មែរ" : "English"}
            </button>
          ))}
        </div>
        <TrInput value={f.title} onChange={set("title")} elang={elang} label={m.postTitle} max={160} m={m} testid="ws-post-title" />
        <TrInput value={f.excerpt} onChange={set("excerpt")} elang={elang} label={m.postExcerpt} max={400} long m={m} />
        <TrInput value={f.body} onChange={set("body")} elang={elang} label={m.postBody} max={20000} long m={m} testid="ws-post-body" />
        <small className="rs-muted">{m.postBodyHint}</small>
        <ImageField value={f.cover} onChange={set("cover")} label={m.postCover} ctx={ctx} />
        <div className="wss-two">
          <label className="ws-field">
            <span className="ws-field-label">{m.postCategory}</span>
            <input value={f.category} onChange={(e) => set("category")(e.target.value)} maxLength={40} />
          </label>
          <label className="ws-field">
            <span className="ws-field-label">{m.postDate}</span>
            <input type="date" value={f.date} onChange={(e) => set("date")(e.target.value)} />
          </label>
        </div>
        <Switch checked={f.published} onChange={set("published")} label={m.postPublished} />
      </div>
    </Modal>
  );
}
export function BlogTab({ ctx }) {
  const { id, m, lang, readOnly, notify } = ctx;
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const [ask, setAsk] = useState(null);
  const on = ctx.on("web_blog");
  useEffect(() => {
    websiteService
      .posts(id)
      .then((r) => setRows(r.data))
      .catch((e) => notify({ type: "error", text: e.message }));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (rows) ctx.put({ postsPreview: rows.filter((p) => p.published).slice(0, 6) });
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!on)
    return (
      <div className="rs-col">
        <Head icon={Newspaper} title={m.blogTitle} sub={m.blogSub} />
        <Locked ctx={ctx} addon="web_blog" />
      </div>
    );
  return (
    <div className="rs-col">
      <Head icon={Newspaper} title={m.blogTitle} sub={m.blogSub}>
        <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setEdit("new")} disabled={readOnly} data-testid="ws-new-post">
          <Plus size={15} /> {m.newPost}
        </button>
      </Head>
      {rows && !rows.length && <section className="panel-card sa-empty-state">{m.postsEmpty}</section>}
      <div className="wsb-list">
        {(rows || []).map((p) => (
          <article key={p._id} className="panel-card wsb-post" data-testid="ws-post">
            {p.cover ? (
              <img src={p.cover} alt="" />
            ) : (
              <span className="wsb-ph">
                <Newspaper size={22} />
              </span>
            )}
            <div className="wsb-main">
              <b>{tx(p.title, lang)}</b>
              <small className="rs-muted">
                {fmtDate(p.date, lang)} · {p.published ? m.postPublished : m.postDraft} · {m.views.replace("{n}", fmt(p.views))}
              </small>
            </div>
            <a className="md-icon-btn" href={`/site/${ctx.data.site.slug}/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" aria-label={m.viewSite}>
              <ExternalLink size={15} />
            </a>
            <button type="button" className="md-icon-btn" onClick={() => setEdit(p)} disabled={readOnly} aria-label={m.editPost}>
              <Pencil size={15} />
            </button>
            <button type="button" className="md-icon-btn" onClick={() => setAsk(p)} disabled={readOnly} aria-label={m.deletePost}>
              <Trash2 size={15} />
            </button>
          </article>
        ))}
      </div>
      {edit && <PostModal ctx={ctx} post={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={(p) => setRows((x) => (edit === "new" ? [p, ...(x || [])] : x.map((y) => (y._id === p._id ? p : y))))} />}
      {ask && (
        <Confirm
          m={m}
          title={m.deletePost}
          sub={m.deletePostSub.replace("{name}", tx(ask.title, lang))}
          onYes={async () => {
            await websiteService.removePost(id, ask._id);
            setRows((x) => x.filter((y) => y._id !== ask._id));
          }}
          onClose={() => setAsk(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------- visits ----------------------------------------
const flag = (cc) => (/^[A-Z]{2}$/.test(cc || "") ? String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0))) : "🌐");
function countryName(cc, lang) {
  try {
    return new Intl.DisplayNames([lang === "km" ? "km" : "en"], { type: "region" }).of(cc) || cc;
  } catch {
    return cc;
  }
}
// a list with bars (countries, sources…)
function Bars({ title, rows, label, testid }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const total = rows.reduce((a, r) => a + r.n, 0) || 1;
  return (
    <section className="panel-card wsv-list" data-testid={testid}>
      <h3>{title}</h3>
      {rows.length ? (
        <ol>
          {rows.map((r) => (
            <li key={r.key || "_"}>
              <span className="wsv-l-name">{label(r.key)}</span>
              <span className="wsv-l-bar">
                <i style={{ width: `${(r.n / max) * 100}%` }} />
              </span>
              <b>{fmt(r.n)}</b>
              <small>{Math.round((r.n / total) * 100)}%</small>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rs-muted">—</p>
      )}
    </section>
  );
}
export function StatsTab({ ctx }) {
  const { id, m, lang, notify } = ctx;
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);
  const pro = ctx.on("web_stats");
  useEffect(() => {
    websiteService
      .stats(id, days)
      .then((r) => setD(r.data))
      .catch((e) => notify({ type: "error", text: e.message }));
  }, [id, days, pro]); // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(1, ...(d?.series || []).map((x) => x.views));
  const pageName = (slug) => {
    if (slug === "blog") return m.tabs.blog;
    const p = ctx.data.pages.find((x) => x.slug === slug);
    return p ? tx(p.title, lang) : slug;
  };
  const P = d?.pro;
  const hMax = Math.max(1, ...(P?.hours || []));
  const devName = { mobile: m.devMobile, tablet: m.devTablet, desktop: m.devDesktop };
  return (
    <div className="rs-col">
      <Head icon={BarChart3} title={m.statsTitle} sub={m.statsSub}>
        <div className="ws-seg">
          {[7, 30, 90].map((n) => (
            <button key={n} type="button" className={days === n ? "on" : ""} onClick={() => setDays(n)}>
              {m[`days${n}`]}
            </button>
          ))}
        </div>
      </Head>
      {d && (
        <>
          <div className="wsv-tiles">
            {[[m.today, d.today], [m.total.replace("{n}", days), d.total], ...(P ? [[m.uniqueVisitors, P.unique]] : [[m.avg, d.avg]]), [m.allTime, d.all_time]].map(([l, v]) => (
              <section key={l} className="panel-card wsv-tile">
                <small className="rs-muted">{l}</small>
                <b>{fmt(v)}</b>
              </section>
            ))}
          </div>
          <section className="panel-card wsv-chart">
            {d.total ? (
              <div className="wsv-bars" role="img" aria-label={m.statsTitle}>
                {d.series.map((x) => (
                  <span key={x.day} style={{ height: `${Math.max(2, (x.views / max) * 100)}%` }} title={`${x.day}: ${x.views}`} />
                ))}
              </div>
            ) : (
              <p className="rs-muted">{m.noVisits}</p>
            )}
          </section>
          {d.top.length > 0 && (
            <section className="panel-card">
              <h3 style={{ marginTop: 0 }}>{m.topPages}</h3>
              <ol className="wsv-top">
                {d.top.map((x) => (
                  <li key={x.page}>
                    <span>{pageName(x.page)}</span>
                    <b>{fmt(x.views)}</b>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {P ? (
            <>
              <div className="wsv-grid">
                <Bars title={m.countries} rows={P.countries} label={(cc) => `${flag(cc)} ${countryName(cc, lang)}`} testid="ws-countries" />
                <Bars title={m.cities} rows={P.cities} label={(c) => c} />
                <Bars title={m.sources} rows={P.sources} label={(s) => s || m.direct} testid="ws-sources" />
                <Bars title={m.devices} rows={P.devices} label={(k) => devName[k] || k} />
                <Bars title={m.browsers} rows={P.browsers} label={(k) => k} />
                <Bars title={m.systems} rows={P.os} label={(k) => k} />
              </div>
              <section className="panel-card">
                <h3 style={{ marginTop: 0 }}>{m.busyHours}</h3>
                <div className="wsv-hours">
                  {P.hours.map((n, hr) => (
                    <span key={hr} title={`${hr}:00 · ${n}`}>
                      <i style={{ height: `${Math.max(3, (n / hMax) * 100)}%` }} />
                      <small>{hr % 3 === 0 ? hr : ""}</small>
                    </span>
                  ))}
                </div>
              </section>
              <section className="panel-card wsv-recent" data-testid="ws-recent">
                <h3 style={{ marginTop: 0 }}>{m.recentVisits}</h3>
                <p className="rs-muted">{m.ipNote}</p>
                <div className="wsv-table">
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>{m.colTime}</th>
                        <th>{m.colPage}</th>
                        <th>{m.colPlace}</th>
                        <th>{m.colDevice}</th>
                        <th>{m.colFrom}</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {P.recent.map((v, i) => (
                        <tr key={i}>
                          <td>{new Date(v.at).toLocaleString(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                          <td>{pageName(v.page)}</td>
                          <td>{v.country ? `${flag(v.country)} ${[v.city, countryName(v.country, lang)].filter(Boolean).join(", ")}` : m.unknown}</td>
                          <td>{[devName[v.device] || v.device, v.browser, v.os].filter(Boolean).join(" · ")}</td>
                          <td>{v.source || m.direct}</td>
                          <td>
                            <code>{v.ip || "—"}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!P.recent.length && <p className="rs-muted">{m.noVisits}</p>}
                </div>
              </section>
            </>
          ) : (
            <Locked ctx={ctx} addon="web_stats">
              <ul className="wsv-perks">
                {m.statsPerks.map((x) => (
                  <li key={x}>
                    <Check size={14} /> {x}
                  </li>
                ))}
              </ul>
            </Locked>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------- Telegram ----------------------------------------
export function TelegramTab({ ctx }) {
  const { id, m, data, readOnly, notify } = ctx;
  const [tg, setTg] = useState(data.telegram);
  const [busy, setBusy] = useState("");
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setInterval(() => {
      websiteService.telegram(id).then((r) => {
        setTg(r.data);
        if (r.data.connected) {
          setWaiting(false);
          ctx.put({ telegram: r.data });
        }
      });
    }, 3000);
    return () => clearInterval(t);
  }, [waiting, id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ctx.on("web_telegram"))
    return (
      <div className="rs-col">
        <Head icon={Send} title={m.tgTitle} sub={m.tgSub} />
        <Locked ctx={ctx} addon="web_telegram" />
      </div>
    );
  const link = async (group) => {
    setBusy("link");
    try {
      const r = await websiteService.telegramLink(id);
      window.open(group ? r.data.group_url : r.data.url, "_blank", "noopener");
      setWaiting(true);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rs-col">
      <Head icon={Send} title={m.tgTitle} sub={m.tgSub} />
      <section className="panel-card qg-tg">
        {!tg.configured ? (
          <p className="rs-muted">{m.tgNotConfigured}</p>
        ) : tg.connected ? (
          <>
            <span className="rs-pill on">
              <Check size={13} /> {m.tgConnected.replace("{name}", tg.chat_name)}
            </span>
            <div className="qg-bulk-acts">
              <button
                type="button"
                className="md-btn md-btn-primary sa-btn-sm"
                disabled={!!busy || readOnly}
                onClick={async () => {
                  setBusy("test");
                  try {
                    await websiteService.telegramTest(id);
                    notify({ type: "success", text: m.tgSentOk });
                  } catch (e) {
                    notify({ type: "error", text: e.message });
                  } finally {
                    setBusy("");
                  }
                }}
              >
                {busy === "test" ? <Loader2 size={14} className="md-spin" /> : <Send size={14} />} {m.tgTest}
              </button>
              <button
                type="button"
                className="md-btn md-btn-ghost sa-btn-sm"
                disabled={!!busy || readOnly}
                onClick={async () => {
                  const r = await websiteService.telegramOff(id);
                  setTg(r.data);
                  ctx.put({ telegram: r.data });
                }}
              >
                <Unplug size={14} /> {m.tgDisconnect}
              </button>
            </div>
          </>
        ) : (
          <div className="qg-bulk-acts">
            <button type="button" className="md-btn md-btn-primary" onClick={() => link(false)} disabled={!!busy || readOnly} data-testid="ws-tg-connect">
              {busy === "link" ? <Loader2 size={15} className="md-spin" /> : <Send size={15} />} {m.tgConnect}
            </button>
            <button type="button" className="md-btn md-btn-ghost" onClick={() => link(true)} disabled={!!busy || readOnly}>
              {m.tgGroup}
            </button>
            {waiting && <small className="rs-muted">{m.tgWaiting}</small>}
          </div>
        )}
        <p className="rs-muted" style={{ margin: 0 }}>
          {m.tgHow}
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------- add-ons ----------------------------------------
export function AddonsTab({ ctx }) {
  const { m, lang, data, readOnly } = ctx;
  const price = data.addons.web_brand.price;
  return (
    <div className="rs-col">
      <Head icon={Puzzle} title={m.addonsTitle} sub={m.addonsSub.replace("{coins}", fmt(price))} />
      <div className="rs-addons">
        <article className="panel-card rs-addon s-active">
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <Globe size={20} />
            </span>
            <div>
              <h3>{m.renewTitle}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(data.renew_price)} {m.coins} {m.perYear}
              </span>
            </div>
          </div>
          <p>{m.renewSub}</p>
          <div className="rs-addon-foot">
            {data.license.expires_at && <span className={`rs-pill ${data.license.active ? "on" : ""}`}>{m.ends.replace("{date}", fmtDate(data.license.expires_at, lang))}</span>}
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ renew: true })} disabled={readOnly && data.business.status === false}>
              {m.renew.replace("{coins}", fmt(data.renew_price))}
            </button>
          </div>
        </article>
        {Object.entries(data.addons).map(([k, a]) => {
          const Icon = ADDON_ICON[k] || Puzzle;
          return (
            <article key={k} className={`panel-card rs-addon s-${a.active ? "active" : "none"}`} data-testid={`ws-addon-${k}`}>
              <div className="rs-addon-top">
                <span className="rs-addon-ic">
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{m.addonNames[k]}</h3>
                  <span className="rs-addon-price">
                    <CoinIcon size={13} /> {fmt(a.price)} {m.coins} {a.days ? m.perYear : `· ${m.forever}`}
                  </span>
                </div>
              </div>
              <p>{m.addonWhat[k]}</p>
              <div className="rs-addon-foot">
                {a.active ? (
                  <>
                    <span className="rs-pill on">
                      <Check size={13} /> {a.expires_at ? m.ends.replace("{date}", fmtDate(a.expires_at, lang)) : m.unlocked}
                    </span>
                    {a.days && (
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly}>
                        {m.renew.replace("{coins}", fmt(a.price))}
                      </button>
                    )}
                  </>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly} data-testid={`ws-buy-${k}`}>
                    <CoinIcon size={14} /> {m.unlock.replace("{coins}", fmt(a.price))}
                  </button>
                )}
              </div>
            </article>
          );
        })}
        <article className="panel-card rs-addon">
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <Palette size={20} />
            </span>
            <div>
              <h3>{m.premiumLooks}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(data.themes.price)} {m.coins} · {m.forever}
              </span>
            </div>
          </div>
          <p>{m.premiumLooksSub.replace("{coins}", fmt(data.themes.price))}</p>
          <div className="rs-addon-foot">
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("style")}>
              {m.goStyle}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
export const renewBuy = (ctx) => licenseService.buy(ctx.id, "website", ctx.data.license.expires_at ?? null);
