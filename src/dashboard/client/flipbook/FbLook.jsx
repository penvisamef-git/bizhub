import { useEffect, useMemo, useState } from "react";
import { Sparkles, BookOpenText, Check, Eye, Info, Library, Loader2, RotateCcw, Save, Volume2 } from "lucide-react";
import { flipbookService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import { Field, ImagePick } from "../restaurant/parts";
import ShelfView from "../../../fbook/ShelfView";
import { LIVE_KEYS, SHELVES, SHELF_KEYS, STANDARD_KEYS, isLive, loadFonts, shelfName } from "../../../fbook/shelves";
import LiveBg from "../../../fbook/LiveBg";
import { READERS, READER_KEYS, readerName } from "../../../fbook/readers";
import { Head, Switch } from "./FbParts";
import { fmt, shelfUrl } from "./text";

const PRESETS = ["#E0581A", "#dc2626", "#db2777", "#9333ea", "#4f46e5", "#0284c7", "#0d9488", "#16a34a", "#ca8a04", "#78350f", "#334155", "#111111"];
const LAYOUTS = ["shelf", "grid", "magazine", "carousel", "list", "wall", "spotlight", "stack"];

// what the public library shows, made from the dashboard data (for the live preview)
export function previewData(data, extra = {}) {
  const s = data.settings;
  return {
    title: s.title || data.business.name,
    about: s.about,
    logo: s.logo?.url || "",
    contact: s.contact,
    color: s.color,
    shelf_theme: s.shelf_theme,
    lang: s.lang,
    slug: s.slug,
    categories: data.categories.filter((c) => c.active !== false),
    books: data.books.filter((b) => b.published).map((b) => ({ _id: b._id, slug: b.slug, title: b.title, about: b.about, pages: b.file.pages, cover: b.cover, locked: b.has_password, category_ids: b.category_ids })),
    ...extra,
  };
}

// a tiny drawing of a design (colours, layout, heading font)
function Thumb({ k, moving }) {
  const t = SHELVES[k];
  return (
    <span className={`fb-th fb-th-${t.layout} ${t.live ? "is-live" : ""}`} style={{ "--b": t.bg, "--s": t.surface, "--i": t.ink, "--a": t.accent, "--p": t.plank, fontFamily: `'${t.hf}', serif` }} aria-hidden="true">
      <em>Aa</em>
      {t.live && moving && (
        <span className="fl-preview fb-th-live">
          <LiveBg effect={t.live} fx={t.fx} small />
        </span>
      )}
      {t.live && <span className="fb-live-tag">LIVE</span>}
      <span className="fb-th-books">
        <i />
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

export function LibraryTab({ ctx }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const s = data.settings;
  const owned = data.shelf_themes || ["classic"];
  const [tryKey, setTryKey] = useState(s.shelf_theme);
  const [color, setColor] = useState(s.color || "");
  const [kind, setKind] = useState(() => (isLive(s.shelf_theme) ? "live" : "standard"));
  const [filter, setFilter] = useState("all");
  const [hover, setHover] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => setTryKey(s.shelf_theme), [s.shelf_theme]);
  useEffect(() => loadFonts([...new Set(SHELF_KEYS.map((k) => SHELVES[k].hf))]), []);
  const design = SHELVES[tryKey] || SHELVES.classic;
  const list = filter === "mine" ? SHELF_KEYS.filter((k) => owned.includes(k)) : kind === "live" ? LIVE_KEYS : STANDARD_KEYS;
  const shown = list.filter((k) => filter === "all" || filter === "mine" || SHELVES[k].layout === filter);
  const priceOf = (k) => (isLive(k) ? data.prices.fb_shelf_live : data.prices.fb_shelf_theme);
  const save = async (body, what) => {
    setBusy(what);
    try {
      const r = await flipbookService.save(id, body);
      ctx.setSettings(r.data);
      notify({ type: "success", text: m.saved });
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const pv = useMemo(() => previewData(data), [data]);
  const action = (k, big) => {
    const using = s.shelf_theme === k;
    if (using)
      return (
        <span className="rs-pill on">
          <Check size={12} /> {m.inUse}
        </span>
      );
    if (owned.includes(k))
      return (
        <button type="button" className={`md-btn ${big ? "md-btn-primary" : "md-btn-ghost"} sa-btn-sm`} onClick={() => save({ shelf_theme: k }, `use-${k}`)} disabled={readOnly || !!busy}>
          {busy === `use-${k}` ? <Loader2 size={13} className="md-spin" /> : <Check size={13} />} {k === "classic" && !big ? `${m.use} · ${m.free}` : m.use}
        </button>
      );
    return (
      <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ shelf: k })} disabled={readOnly} data-testid={big ? "fb-buy-try" : `fb-buy-${k}`}>
        <CoinIcon size={13} /> {fmt(priceOf(k))}
      </button>
    );
  };
  return (
    <div className="rs-col">
      <Head
        icon={Library}
        title={m.libTitle}
        sub={m.libSub2
          .replace("{n}", STANDARD_KEYS.length - 1)
          .replace("{coins}", fmt(data.prices.fb_shelf_theme))
          .replace("{live}", LIVE_KEYS.length)
          .replace("{lcoins}", fmt(data.prices.fb_shelf_live))}
      >
        <a className="md-btn md-btn-ghost sa-btn-sm" href={shelfUrl(s.slug)} target="_blank" rel="noreferrer">
          <Eye size={14} /> {m.openLibrary}
        </a>
      </Head>
      <div className="fb-lib">
        <section className="panel-card fb-lib-list">
          <div className="fb-kinds">
            <button type="button" className={kind === "standard" && filter !== "mine" ? "on" : ""} onClick={() => (setKind("standard"), filter === "mine" && setFilter("all"))} data-testid="fb-kind-standard">
              <Library size={15} /> {m.kindStandard} <small>{STANDARD_KEYS.length}</small>
            </button>
            <button type="button" className={`live ${kind === "live" && filter !== "mine" ? "on" : ""}`} onClick={() => (setKind("live"), filter === "mine" && setFilter("all"))} data-testid="fb-kind-live">
              <Sparkles size={15} /> {m.kindLive} <small>{LIVE_KEYS.length}</small>
            </button>
          </div>
          <div className="rs-addon-filter mq-filter fb-filter">
            {["all", "mine", ...LAYOUTS].map((f) => (
              <button key={f} type="button" className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
                {f === "all" ? m.filterAll : f === "mine" ? `${m.filterMine} (${owned.length})` : m.layouts[f]}
              </button>
            ))}
          </div>
          {kind === "live" && filter !== "mine" && (
            <p className="fb-live-note">
              <Sparkles size={14} /> {m.liveNote.replace("{coins}", fmt(data.prices.fb_shelf_live))}
            </p>
          )}
          <div className="fb-designs">
            {shown.map((k) => (
              <div key={k} className={`fb-design ${s.shelf_theme === k ? "using" : ""} ${tryKey === k ? "trying" : ""}`} data-testid={`fb-design-${k}`} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover("")}>
                <button type="button" className="fb-design-pick" onClick={() => setTryKey(k)} title={m.preview}>
                  <Thumb k={k} moving={isLive(k) && (hover === k || tryKey === k)} />
                </button>
                <b>{shelfName(k, lang)}</b>
                <small className="rs-muted">{m.layouts[SHELVES[k].layout]}</small>
                {action(k)}
              </div>
            ))}
          </div>
        </section>
        <div className="fb-lib-side">
          <section className="panel-card fb-preview-card">
            <div className="fb-preview-top">
              <div>
                <b>
                  {shelfName(tryKey, lang)} {isLive(tryKey) && <span className="fb-live-tag">LIVE</span>}
                </b>
                <small className="rs-muted">
                  {m.preview} · {m.layouts[design.layout]}
                </small>
              </div>
              {action(tryKey, true)}
            </div>
            <div className="fb-preview" data-testid="fb-preview">
              <ShelfView data={pv} theme={tryKey} color={color} preview lang={lang} />
            </div>
          </section>
          <section className="panel-card">
            <h3 className="mq-h3">{m.colour}</h3>
            <p className="rs-muted" style={{ margin: "-4px 0 12px" }}>
              {m.colourSub}
            </p>
            <div className="fb-colours">
              <label className="fb-swatch fb-swatch-pick" style={{ background: color || design.accent }}>
                <input type="color" value={color || design.accent} onChange={(e) => setColor(e.target.value)} disabled={readOnly} data-testid="fb-colour" />
              </label>
              {PRESETS.map((c) => (
                <button key={c} type="button" className={`fb-swatch ${color.toLowerCase() === c.toLowerCase() ? "on" : ""}`} style={{ background: c }} onClick={() => setColor(c)} disabled={readOnly} aria-label={c} />
              ))}
            </div>
            <div className="fb-colour-acts">
              <button type="button" className={`md-btn md-btn-ghost sa-btn-sm ${!color ? "on" : ""}`} onClick={() => setColor("")} disabled={readOnly}>
                <RotateCcw size={13} /> {m.resetColour}
              </button>
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => save({ color }, "colour")} disabled={readOnly || !!busy || color === (s.color || "")} data-testid="fb-colour-save">
                {busy === "colour" ? <Loader2 size={14} className="md-spin" /> : <Save size={14} />} {m.save}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function InfoTab({ ctx }) {
  const { id, m, data, readOnly, notify } = ctx;
  const s = data.settings;
  const [f, setF] = useState(() => ({ title: s.title || "", about: s.about || "", lang: s.lang || "km", slug: s.slug, contact: { phone: "", telegram: "", facebook: "", website: "", email: "", ...(s.contact || {}) } }));
  const [busy, setBusy] = useState("");
  const dirty = JSON.stringify(f) !== JSON.stringify({ title: s.title || "", about: s.about || "", lang: s.lang || "km", slug: s.slug, contact: { phone: "", telegram: "", facebook: "", website: "", email: "", ...(s.contact || {}) } });
  const save = async () => {
    setBusy("save");
    try {
      const r = await flipbookService.save(id, f);
      ctx.setSettings(r.data);
      notify({ type: "success", text: m.saved });
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const logo = async (file) => {
    setBusy("logo");
    try {
      const r = file ? await flipbookService.logo(id, file) : await flipbookService.removeLogo(id);
      ctx.setSettings(r.data);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const c = (k, v) => setF({ ...f, contact: { ...f.contact, [k]: v } });
  return (
    <div className="rs-col">
      <Head icon={Info} title={m.infoTitle} sub={m.infoSub} />
      <section className="panel-card">
        <div className="md-fields">
          <Field label={m.logo}>
            <ImagePick value={s.logo?.url} onPick={logo} onRemove={() => logo(null)} busy={busy === "logo"} r={{ uploading: "…", change: m.upload, upload: m.upload, remove: m.remove }} round disabled={readOnly} maxSize={600} />
          </Field>
          <div className="fb-grid2">
            <Field label={m.libName}>
              <input value={f.title} maxLength={80} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={data.business.name} disabled={readOnly} data-testid="fb-info-title" />
            </Field>
            <Field label={m.lang}>
              <select value={f.lang} onChange={(e) => setF({ ...f, lang: e.target.value })} disabled={readOnly}>
                <option value="km">ខ្មែរ</option>
                <option value="en">English</option>
              </select>
            </Field>
          </div>
          <Field label={m.libAbout}>
            <textarea rows={3} value={f.about} maxLength={600} onChange={(e) => setF({ ...f, about: e.target.value })} disabled={readOnly} />
          </Field>
          <div className="fb-grid2">
            {[
              ["phone", 30, "tel"],
              ["telegram", 120, "text"],
              ["facebook", 200, "url"],
              ["website", 200, "url"],
              ["email", 120, "email"],
            ].map(([k, max, type]) => (
              <Field key={k} label={m[k]}>
                <input type={type} value={f.contact[k]} maxLength={max} onChange={(e) => c(k, e.target.value)} disabled={readOnly} />
              </Field>
            ))}
          </div>
          <Field label={m.slug} hint={m.slugHint}>
            <div className="fb-slug">
              <span>/f/</span>
              <input value={f.slug} maxLength={40} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} disabled={readOnly} />
            </div>
          </Field>
          <button type="button" className="md-btn md-btn-primary" style={{ alignSelf: "flex-end" }} onClick={save} disabled={readOnly || !!busy || !dirty} data-testid="fb-info-save">
            {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Save size={15} />} {m.save}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ReaderTab({ ctx }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const s = data.settings;
  const owned = data.reader_themes || ["classic"];
  const [busy, setBusy] = useState("");
  const accent = s.color || SHELVES[s.shelf_theme]?.accent || "#E0581A";
  const cover = data.books[0]?.cover;
  const save = async (body, what) => {
    setBusy(what);
    try {
      const r = await flipbookService.save(id, body);
      ctx.setSettings(r.data);
      notify({ type: "success", text: m.saved });
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rs-col">
      <Head icon={BookOpenText} title={m.readerTitle} sub={m.readerSub.replace("{coins}", fmt(data.prices.fb_reader_theme))} />
      <section className="panel-card">
        <Switch checked={s.sound} onChange={(v) => save({ sound: v }, "sound")} label={m.sound} disabled={readOnly || busy === "sound"} />
        <small className="rs-muted fb-sub">
          <Volume2 size={12} /> {m.soundSub}
        </small>
      </section>
      <div className="fb-readers">
        {READER_KEYS.map((k) => {
          const r = READERS[k];
          const mine = owned.includes(k);
          const using = s.reader_theme === k;
          return (
            <article key={k} className={`panel-card fb-reader ${using ? "using" : ""}`} data-testid={`fb-reader-${k}`}>
              <div className="fb-reader-art" style={{ background: r.bg, "--bar": r.bar, "--a": accent }}>
                <span className="fb-reader-bar" />
                <span className="fb-reader-book">
                  <i>{cover ? <img src={cover} alt="" /> : null}</i>
                  <i />
                </span>
                <span className="fb-reader-bar bottom">
                  <b />
                </span>
              </div>
              <div className="fb-reader-foot">
                <b>{readerName(k, lang)}</b>
                {using ? (
                  <span className="rs-pill on">
                    <Check size={12} /> {m.inUse}
                  </span>
                ) : mine ? (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => save({ reader_theme: k }, `use-${k}`)} disabled={readOnly || !!busy}>
                    {busy === `use-${k}` ? <Loader2 size={13} className="md-spin" /> : <Check size={13} />} {m.use}
                  </button>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ reader: k })} disabled={readOnly}>
                    <CoinIcon size={13} /> {fmt(data.prices.fb_reader_theme)}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
