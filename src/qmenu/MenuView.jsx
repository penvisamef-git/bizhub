import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Camera, Copy, Globe, MapPin, Music2, ThumbsUp, MessageSquareHeart, Phone, Search, Send, Star, Wifi, X } from "lucide-react";
import { MQ_THEMES, loadThemeFonts, themeClass, themeVars } from "./themes";
import "./qmenu.css";
import PoweredBy from "../components/PoweredBy";

export const QM_TEXT = {
  en: {
    search: "Search the menu",
    all: "All",
    soldOut: "Sold out",
    reco: "⭐ Recommended",
    noItems: "Nothing here yet.",
    noMatch: "No dish matches.",
    contact: "Find us",
    hours: "Opening hours",
    wifi: "Wi-Fi",
    password: "Password",
    copied: "Copied!",
    call: "Call",
    map: "Map",
    feedback: "Tell us how it was",
    feedbackSub: "Your stars and a few words help us get better.",
    message: "Your message (optional)",
    name: "Your name (optional)",
    phone: "Phone (optional)",
    send: "Send",
    thanks: "Thank you! 🙏",
    off: "−{v}%",
    offAmount: "−{v}",
    until: "until {t}",
    made: "Menu by",
    tags: { new: "New", hot: "Popular", spicy: "Spicy", veg: "Vegetarian", best: "Best seller", chef: "Chef's pick" },
    close: "Close",
  },
  km: {
    search: "ស្វែងរកមុខម្ហូប",
    all: "ទាំងអស់",
    soldOut: "អស់ហើយ",
    reco: "⭐ ម្ហូបណែនាំ",
    noItems: "មិនទាន់មានទេ។",
    noMatch: "រកមិនឃើញមុខម្ហូប។",
    contact: "ទំនាក់ទំនងយើង",
    hours: "ម៉ោងបើក",
    wifi: "Wi-Fi",
    password: "លេខសម្ងាត់",
    copied: "បានចម្លង!",
    call: "ហៅ",
    map: "ផែនទី",
    feedback: "ប្រាប់យើងពីបទពិសោធន៍",
    feedbackSub: "ផ្កាយ និងមតិរបស់អ្នក ជួយឱ្យយើងកាន់តែប្រសើរ។",
    message: "មតិរបស់អ្នក (ស្រេចចិត្ត)",
    name: "ឈ្មោះ (ស្រេចចិត្ត)",
    phone: "លេខទូរស័ព្ទ (ស្រេចចិត្ត)",
    send: "ផ្ញើ",
    thanks: "អរគុណ! 🙏",
    off: "−{v}%",
    offAmount: "−{v}",
    until: "ដល់ម៉ោង {t}",
    made: "ម៉ឺនុយដោយ",
    tags: { new: "ថ្មី", hot: "ពេញនិយម", spicy: "ហឹរ", veg: "បួស", best: "លក់ដាច់", chef: "ចុងភៅណែនាំ" },
    close: "បិទ",
  },
};
const TAG_ICON = { new: "✨", hot: "🔥", spicy: "🌶️", veg: "🥬", best: "⭐", chef: "👨‍🍳" };

export const money = (v, cur) => (cur === "KHR" ? `${Math.round(Number(v) || 0).toLocaleString("en-US")}៛` : `$${(Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const other = (v, d) => (d.currency === "KHR" ? money(v / (d.khr_rate || 4100), "USD") : money(Math.round((v * (d.khr_rate || 4100)) / 100) * 100, "KHR"));
const pick = (o, base, lang) => (lang === "en" ? o[`${base}_en`] || o[`${base}_km`] : o[`${base}_km`] || o[`${base}_en`]) || "";
const telLink = (t) => {
  const v = String(t || "").trim();
  if (!v) return "";
  if (/^https?:/.test(v)) return v;
  return `https://t.me/${v.replace(/^@/, "").replace(/^t\.me\//, "")}`;
};
const webLink = (v) => (!v ? "" : /^https?:/.test(v) ? v : `https://${v}`);

// The menu page itself — used by /q/:slug and by the previews in the dashboard (preview = no network)
export default function MenuView({ data, theme, lang: startLang, preview = false, onHit, onFeedback }) {
  const d = data;
  const key = MQ_THEMES[theme] ? theme : MQ_THEMES[d.theme] ? d.theme : "classic";
  const t = MQ_THEMES[key];
  const [lang, setLang] = useState(startLang || d.lang || "km");
  const x = QM_TEXT[lang] || QM_TEXT.en;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(null);
  const [fb, setFb] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => loadThemeFonts([t.hf, t.bf, "Battambang"]), [t.hf, t.bf]);
  useEffect(() => setLang(startLang || d.lang || "km"), [startLang, d.lang]);
  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? d.items.filter((i) => `${i.name_km} ${i.name_en} ${i.desc_km} ${i.desc_en}`.toLowerCase().includes(s)) : d.items;
  }, [d.items, q]);
  // an item can be in several categories (category_ids)
  const inCat = (i, c) => (i.category_ids?.length ? i.category_ids.map(String) : [String(i.category_id)]).includes(String(c._id));
  const groups = d.categories.map((c) => ({ c, list: items.filter((i) => inCat(i, c)) })).filter((g) => g.list.length || !q);
  // best sellers + chef's picks on top
  const reco = q ? [] : d.items.filter((i) => (i.tags || []).some((t) => t === "best" || t === "chef")).slice(0, 12);
  const sections = useRef({});
  const go = (id) => {
    setCat(id);
    const el = sections.current[id];
    if (el && !preview) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: "smooth" });
    else if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const c = d.contact || {};
  const openItem = (i) => {
    setOpen(i);
    if (!preview) onHit?.(i._id);
  };
  const promoOf = (i) => (i.promo_id ? d.promos.find((p) => String(p._id) === String(i.promo_id)) : null);
  const priceBox = (i) => (
    <span className="qm-price">
      {i.price_now !== null && i.price_now !== undefined ? (
        <>
          <s>{money(i.price, d.currency)}</s>
          <b>{money(i.price_now, d.currency)}</b>
        </>
      ) : (
        <b>{money(i.price, d.currency)}</b>
      )}
      {d.show_both && <small>{other(i.price_now ?? i.price, d)}</small>}
    </span>
  );
  return (
    <div className={`qm ${themeClass(key)} ${preview ? "qm-preview" : ""}`} style={themeVars(key, d.color)} lang={lang}>
      <header className="qm-head">
        {d.cover && <div className="qm-cover" style={{ backgroundImage: `url(${d.cover})` }} />}
        <div className="qm-brand">
          {d.logo ? <img className="qm-logo" src={d.logo} alt="" /> : <span className="qm-logo qm-logo-x">{(d.name || "?").slice(0, 1)}</span>}
          <div className="qm-brand-text">
            <h1>{d.name}</h1>
            {d.tagline && <p>{d.tagline}</p>}
          </div>
          <div className="qm-lang" role="group" aria-label="Language">
            {["km", "en"].map((l) => (
              <button key={l} type="button" className={lang === l ? "on" : ""} onClick={() => setLang(l)}>
                {l === "km" ? "ខ្មែរ" : "EN"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {d.promos?.length > 0 && (
        <div className="qm-promos">
          {d.promos.map((p) => (
            <div key={p._id} className={`qm-promo ${p.photo ? "has-pic" : ""}`} style={p.photo ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.6), rgba(0,0,0,.1)), url(${p.photo})` } : undefined}>
              {p.kind !== "banner" && p.value > 0 && <em>{p.kind === "percent" ? x.off.replace("{v}", p.value) : x.offAmount.replace("{v}", money(p.value, d.currency))}</em>}
              <b>{pick(p, "title", lang)}</b>
              {(p.note || p.to) && (
                <small>
                  {p.note}
                  {p.note && p.to ? " · " : ""}
                  {p.to ? x.until.replace("{t}", p.to) : ""}
                </small>
              )}
            </div>
          ))}
        </div>
      )}

      {reco.length > 0 && (
        <section className="qm-reco" data-testid="qm-reco">
          <h2>{x.reco}</h2>
          <div className="qm-reco-list">
            {reco.map((i) => (
              <button key={i._id} type="button" className="qm-reco-card" onClick={() => openItem(i)}>
                <span className="qm-reco-pic">
                  {i.photos?.[0] ? <img src={i.photos[0].url} alt="" loading="lazy" /> : "🍽️"}
                  <em>{(i.tags || []).includes("best") ? `⭐ ${x.tags.best}` : `👨‍🍳 ${x.tags.chef}`}</em>
                </span>
                <b>{pick(i, "name", lang)}</b>
                {priceBox(i)}
              </button>
            ))}
          </div>
        </section>
      )}

      <nav className="qm-nav">
        <label className="qm-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={x.search} aria-label={x.search} />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label={x.close}>
              <X size={14} />
            </button>
          )}
        </label>
        <div className="qm-tabs">
          {d.categories.map((cc) => (
            <button key={cc._id} type="button" className={cat === cc._id ? "on" : ""} onClick={() => go(cc._id)}>
              {cc.icon && <span>{cc.icon}</span>} {pick(cc, "name", lang)}
            </button>
          ))}
        </div>
      </nav>

      <main className="qm-main">
        {!d.items.length && <p className="qm-empty">{x.noItems}</p>}
        {d.items.length > 0 && q && !items.length && <p className="qm-empty">{x.noMatch}</p>}
        {groups.map(({ c: cc, list }) =>
          list.length ? (
            <section key={cc._id} className="qm-sec" ref={(el) => (sections.current[cc._id] = el)}>
              <h2>
                {cc.icon && <span className="qm-sec-ic">{cc.icon}</span>}
                {pick(cc, "name", lang)}
              </h2>
              <div className="qm-items">
                {list.map((i, n) => {
                  const pr = promoOf(i);
                  return (
                    <article
                      key={i._id}
                      className={`qm-item ${i.available === false ? "out" : ""} ${i.photos?.length ? "has-pic" : "no-pic"}`}
                      style={{ "--tilt": `${((n % 5) - 2) * 1.2}deg` }}
                      onClick={() => openItem(i)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && openItem(i)}
                    >
                      {i.photos?.length > 0 && (
                        <span className="qm-pic">
                          <img src={i.photos[0].url} alt="" loading="lazy" />
                          {i.photos.length > 1 && <i className="qm-pic-n">+{i.photos.length - 1}</i>}
                        </span>
                      )}
                      <span className="qm-body">
                        <span className="qm-name">
                          <b>{pick(i, "name", lang)}</b>
                          {t.price === "dotted" && <i className="qm-dots" aria-hidden="true" />}
                          {t.price === "dotted" && priceBox(i)}
                        </span>
                        {pick(i, "desc", lang) && <small className="qm-desc">{pick(i, "desc", lang)}</small>}
                        {(i.tags?.length > 0 || i.available === false || pr) && (
                          <span className="qm-tags">
                            {i.available === false && <em className="qm-tag out">{x.soldOut}</em>}
                            {pr && pr.kind === "percent" && <em className="qm-tag promo">{x.off.replace("{v}", pr.value)}</em>}
                            {(i.tags || []).map((tg) => (
                              <em key={tg} className={`qm-tag t-${tg}`}>
                                {TAG_ICON[tg]} {x.tags[tg]}
                              </em>
                            ))}
                          </span>
                        )}
                        {t.price !== "dotted" && priceBox(i)}
                      </span>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null,
        )}
      </main>

      {(c.phone || c.telegram || c.address || d.hours || c.wifi_name || c.facebook || c.instagram || c.tiktok || c.website || d.about) && (
        <footer className="qm-contact">
          <h2>{x.contact}</h2>
          {d.about && <p className="qm-about">{d.about}</p>}
          <div className="qm-contact-grid">
            {d.hours && (
              <div className="qm-ci">
                <Clock size={16} />
                <span>
                  <small>{x.hours}</small>
                  {d.hours}
                </span>
              </div>
            )}
            {c.address && (
              <a className="qm-ci" href={c.map_url || `https://maps.google.com/?q=${encodeURIComponent(c.address)}`} target="_blank" rel="noreferrer">
                <MapPin size={16} />
                <span>
                  <small>{x.map}</small>
                  {c.address}
                </span>
              </a>
            )}
            {c.wifi_name && (
              <button
                type="button"
                className="qm-ci"
                onClick={() => {
                  if (!c.wifi_pass) return;
                  navigator.clipboard?.writeText(c.wifi_pass).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                <Wifi size={16} />
                <span>
                  <small>{x.wifi}</small>
                  {c.wifi_name}
                  {c.wifi_pass && (
                    <i className="qm-wifi">
                      {x.password}: <b>{c.wifi_pass}</b> {copied ? x.copied : <Copy size={12} />}
                    </i>
                  )}
                </span>
              </button>
            )}
          </div>
          <div className="qm-links">
            {c.phone && (
              <a href={`tel:${c.phone.replace(/\s/g, "")}`}>
                <Phone size={16} /> {c.phone}
              </a>
            )}
            {c.phone2 && (
              <a href={`tel:${c.phone2.replace(/\s/g, "")}`}>
                <Phone size={16} /> {c.phone2}
              </a>
            )}
            {c.telegram && (
              <a href={telLink(c.telegram)} target="_blank" rel="noreferrer">
                <Send size={16} /> Telegram
              </a>
            )}
            {c.facebook && (
              <a href={webLink(c.facebook)} target="_blank" rel="noreferrer">
                <ThumbsUp size={16} /> Facebook
              </a>
            )}
            {c.instagram && (
              <a href={webLink(c.instagram)} target="_blank" rel="noreferrer">
                <Camera size={16} /> Instagram
              </a>
            )}
            {c.tiktok && (
              <a href={webLink(c.tiktok)} target="_blank" rel="noreferrer">
                <Music2 size={16} /> TikTok
              </a>
            )}
            {c.website && (
              <a href={webLink(c.website)} target="_blank" rel="noreferrer">
                <Globe size={16} /> {c.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </footer>
      )}
      <p className="qm-made">
        {x.made} <b>BizHub</b>
      </p>
      <PoweredBy lang={lang} className="qm-powered" />

      {d.feedback && (
        <button type="button" className="qm-fb-btn" onClick={() => setFb(true)} data-testid="qm-fb">
          <MessageSquareHeart size={18} /> {x.feedback}
        </button>
      )}
      {open && <ItemSheet item={open} d={d} lang={lang} x={x} priceBox={priceBox} onClose={() => setOpen(null)} />}
      {fb && <FeedbackSheet x={x} onClose={() => setFb(false)} onSend={onFeedback} preview={preview} />}
    </div>
  );
}

function ItemSheet({ item, d, lang, x, priceBox, onClose }) {
  const [n, setN] = useState(0);
  const strip = useRef(null);
  const photos = item.photos || [];
  const to = (k) => {
    const i = Math.max(0, Math.min(photos.length - 1, k));
    setN(i);
    strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: "smooth" });
  };
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="qm-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qm-sheet" role="dialog" aria-modal="true" aria-label={pick(item, "name", lang)}>
        <button type="button" className="qm-x" onClick={onClose} aria-label={x.close}>
          <X size={18} />
        </button>
        {photos.length > 0 && (
          <div className="qm-gal">
            <div className="qm-gal-strip" ref={strip} onScroll={(e) => setN(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
              {photos.map((p) => (
                <img key={p._id || p.url} src={p.url} alt="" />
              ))}
            </div>
            {photos.length > 1 && (
              <>
                <button type="button" className="qm-gal-btn l" onClick={() => to(n - 1)} aria-label="‹" disabled={n === 0}>
                  <ChevronLeft size={18} />
                </button>
                <button type="button" className="qm-gal-btn r" onClick={() => to(n + 1)} aria-label="›" disabled={n === photos.length - 1}>
                  <ChevronRight size={18} />
                </button>
                <span className="qm-gal-dots">
                  {photos.map((p, i) => (
                    <i key={p._id || i} className={i === n ? "on" : ""} />
                  ))}
                </span>
              </>
            )}
          </div>
        )}
        <div className="qm-sheet-body">
          <h3>{pick(item, "name", lang)}</h3>
          {lang === "km" && item.name_en && item.name_km && <small className="qm-alt">{item.name_en}</small>}
          {lang === "en" && item.name_km && item.name_en && <small className="qm-alt">{item.name_km}</small>}
          {pick(item, "desc", lang) && <p>{pick(item, "desc", lang)}</p>}
          <div className="qm-sheet-foot">
            {priceBox(item)}
            {item.available === false && <em className="qm-tag out">{x.soldOut}</em>}
          </div>
          {item.tags?.length > 0 && (
            <span className="qm-tags">
              {item.tags.map((tg) => (
                <em key={tg} className={`qm-tag t-${tg}`}>
                  {TAG_ICON[tg]} {x.tags[tg]}
                </em>
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackSheet({ x, onClose, onSend, preview }) {
  const [stars, setStars] = useState(0);
  const [f, setF] = useState({ text: "", name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const send = async () => {
    if (!stars || busy) return;
    setBusy(true);
    setError("");
    try {
      if (!preview) await onSend?.({ stars, ...f });
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="qm-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qm-sheet qm-fb" role="dialog" aria-modal="true" aria-label={x.feedback}>
        <button type="button" className="qm-x" onClick={onClose} aria-label={x.close}>
          <X size={18} />
        </button>
        <div className="qm-sheet-body">
          {done ? (
            <h3 className="qm-thanks">{x.thanks}</h3>
          ) : (
            <>
              <h3>{x.feedback}</h3>
              <p>{x.feedbackSub}</p>
              <div className="qm-stars" role="radiogroup">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={stars === s} className={s <= stars ? "on" : ""} onClick={() => setStars(s)} aria-label={`${s}`} data-testid={`qm-star-${s}`}>
                    <Star size={30} />
                  </button>
                ))}
              </div>
              <textarea rows={3} maxLength={600} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder={x.message} />
              <div className="qm-fb-two">
                <input maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={x.name} />
                <input maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder={x.phone} inputMode="tel" />
              </div>
              {error && <p className="qm-err">{error}</p>}
              <button type="button" className="qm-send" onClick={send} disabled={!stars || busy} data-testid="qm-fb-send">
                <Send size={16} /> {x.send}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
