import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, BookOpen, Globe, Lock, Mail, Phone, Search, Send, ThumbsUp, X } from "lucide-react";
import { SHELVES, loadFonts, shelfClass, shelfVars } from "./shelves";
import { FB_TEXT, keepLang, startLang } from "./text";
import LiveBg from "./LiveBg";
import LeadForm from "./LeadForm";
import "./fbook.css";

const tg = (v) => (/^https?:\/\//.test(v) ? v : `https://t.me/${String(v).replace(/^@/, "")}`);
const web = (v) => (/^https?:\/\//.test(v) ? v : `https://${v}`);

// the "book opens" move: the cover flies to the middle, the cover swings open, then the reader takes over
export function flyOpen(coverEl, onDone) {
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !coverEl?.animate) return onDone();
  const r = coverEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ratio = r.width / Math.max(1, r.height) || 0.72;
  let h = Math.min(vh * 0.64, 560);
  let w = h * ratio;
  if (w * 2 > vw * 0.92) {
    w = (vw * 0.92) / 2;
    h = w / ratio;
  }
  const img = coverEl.querySelector("img")?.src || "";
  const style = getComputedStyle(coverEl);
  const accent = style.getPropertyValue("--f-accent").trim() || "#E0581A";
  document.querySelectorAll(".flo").forEach((x) => x.remove());
  const ov = document.createElement("div");
  ov.className = "flo";
  ov.style.setProperty("--f-accent", accent);
  ov.innerHTML = `<div class="flo-back"></div><div class="flo-move"><div class="flo-book"><div class="flo-page"><b></b><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="flo-cover"><div class="flo-front">${img ? `<img src="${img}" alt="">` : ""}<span class="flo-gloss"></span></div><div class="flo-inside"></div></div></div></div>`;
  document.body.appendChild(ov);
  const move = ov.querySelector(".flo-move");
  const bookEl = ov.querySelector(".flo-book");
  Object.assign(move.style, { left: `${vw / 2 - w / 2}px`, top: `${vh / 2 - h / 2}px`, width: `${w}px`, height: `${h}px` });
  const dx = r.left - (vw / 2 - w / 2);
  const dy = r.top - (vh / 2 - h / 2);
  const s = r.width / w;
  coverEl.style.visibility = "hidden";
  const ease = "cubic-bezier(.2,.8,.2,1)";
  ov.querySelector(".flo-back").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, fill: "forwards" });
  bookEl.animate(
    [
      { transform: `translate(${dx}px,${dy}px) scale(${s}) rotateY(0deg)`, offset: 0 },
      { transform: `translate(${dx * 0.3}px,${dy * 0.3 - 30}px) scale(${(s + 1) / 2}) rotateY(-12deg)`, offset: 0.6 },
      { transform: "translate(0,0) scale(1) rotateY(0deg)", offset: 1 },
    ],
    { duration: 560, easing: ease, fill: "forwards" },
  );
  move.animate([{ transform: "translateX(0)" }, { transform: `translateX(${w / 2}px)` }], { delay: 560, duration: 760, easing: "cubic-bezier(.45,.05,.25,1)", fill: "forwards" });
  ov.querySelector(".flo-cover").animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(-172deg)" }], { delay: 560, duration: 760, easing: "cubic-bezier(.45,.05,.25,1)", fill: "forwards" });
  ov.querySelector(".flo-page").animate([{ filter: "brightness(.55)" }, { filter: "brightness(1)" }], { delay: 560, duration: 760, fill: "forwards" });
  setTimeout(() => {
    bookEl.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }], { duration: 300, easing: ease, fill: "forwards" });
  }, 1320);
  setTimeout(() => {
    coverEl.style.visibility = "";
    onDone();
  }, 1450);
  setTimeout(() => ov.remove(), 6000); // the reader fades it out sooner
}
// the reader calls this once its first page is shown
export function landOpen() {
  const ov = document.querySelector(".flo");
  if (!ov) return;
  const a = ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: "forwards" });
  a.onfinish = () => ov.remove();
}

function Book({ b, t, onOpen, preview, big, i }) {
  const ref = useRef(null);
  return (
    <button type="button" className={`fl-book ${big ? "fl-big" : ""}`} style={{ "--i": i }} onClick={() => !preview && onOpen?.(b, ref.current)} data-testid={`fl-book-${b.slug}`} title={b.title}>
      <span className="fl-cover" ref={ref}>
        {b.cover ? <img src={b.cover} alt="" loading="lazy" /> : <BookOpen size={30} />}
        <span className="fl-gloss" />
        {b.locked && (
          <span className="fl-lock" title={t.locked}>
            <Lock size={13} />
          </span>
        )}
        <span className="fl-read">
          <BookOpen size={15} /> {t.read}
        </span>
      </span>
      <span className="fl-plank" aria-hidden="true" />
      <span className="fl-meta">
        <b>{b.title}</b>
        {b.pages ? <small>{t.pages.replace("{n}", b.pages)}</small> : null}
        {b.about ? <em>{b.about}</em> : null}
      </span>
    </button>
  );
}

// the public library: header, category tabs, books in the chosen design
export default function ShelfView({ data, theme, color, preview = false, onOpen, lang: forceLang }) {
  const key = SHELVES[theme] ? theme : SHELVES[data.shelf_theme] ? data.shelf_theme : "classic";
  const design = SHELVES[key];
  const [lang, setLang] = useState(() => forceLang || startLang(data.lang));
  const t = FB_TEXT[lang];
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [contact, setContact] = useState(false);
  useEffect(() => loadFonts([design.hf, design.bf]), [design.hf, design.bf]);
  useEffect(() => {
    if (forceLang) setLang(forceLang);
  }, [forceLang]);
  const cats = useMemo(() => (data.categories || []).filter((c) => data.books.some((b) => (b.category_ids || []).map(String).includes(String(c._id)))), [data]);
  const words = q.trim().toLowerCase();
  const shown = data.books.filter((b) => (!cat || (b.category_ids || []).map(String).includes(cat)) && (!words || `${b.title} ${b.about || ""}`.toLowerCase().includes(words)));
  // carousel looks show one sliding row per category
  const groups =
    design.layout === "carousel" && !cat && !words && cats.length
      ? [
          ...cats.map((c) => ({ key: String(c._id), name: c.name, about: c.about, books: data.books.filter((b) => (b.category_ids || []).map(String).includes(String(c._id))) })),
          { key: "rest", name: t.allBooks, books: data.books.filter((b) => !(b.category_ids || []).some((id) => cats.some((c) => String(c._id) === String(id)))) },
        ].filter((g) => g.books.length)
      : [{ key: "all", name: "", books: shown }];
  const c = data.contact || {};
  const contacts = [
    c.phone && [Phone, c.phone, `tel:${c.phone.replace(/\s+/g, "")}`],
    c.telegram && [Send, "Telegram", tg(c.telegram)],
    c.facebook && [ThumbsUp, "Facebook", web(c.facebook)],
    c.website && [Globe, c.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), web(c.website)],
    c.email && [Mail, c.email, `mailto:${c.email}`],
  ].filter(Boolean);
  const heading = data.category ? data.category.name : data.title;
  const about = data.category ? data.category.about : data.about;
  return (
    <div className={`${shelfClass(key)} ${preview ? "fl-preview" : ""}`} style={shelfVars(key, color || data.color)} data-testid="fl-shelf">
      {design.live && <LiveBg effect={design.live} fx={design.fx} small={preview} />}
      <header className="fl-head">
        <div className="fl-head-in">
          {data.logo ? <img className="fl-logo" src={data.logo} alt="" /> : <span className="fl-logo fl-logo-x">{(data.title || "B").slice(0, 1)}</span>}
          <div className="fl-head-text">
            {data.category && (
              <a className="fl-crumb" href={preview ? undefined : `/f/${data.slug}`}>
                {data.title} · {t.library}
              </a>
            )}
            <h1>{heading}</h1>
            {about && <p>{about}</p>}
            <span className="fl-count">{t.books.replace("{n}", data.books.length)}</span>
          </div>
          {!forceLang && (
            <div className="fl-lang">
              {["km", "en"].map((l) => (
                <button
                  key={l}
                  type="button"
                  className={lang === l ? "on" : ""}
                  onClick={() => {
                    setLang(l);
                    keepLang(l);
                  }}
                >
                  {l === "km" ? "ខ្មែរ" : "EN"}
                </button>
              ))}
            </div>
          )}
        </div>
        {(contacts.length > 0 || data.lead) && (
          <div className="fl-contacts">
            {data.lead && (
              <button type="button" className="fl-contact-us" onClick={() => !preview && setContact(true)} data-testid="fl-contact-us">
                <MessageCircle size={14} /> <span>{t.contactUs}</span>
              </button>
            )}
            {contacts.map(([Icon, label, href]) => (
              <a key={href} href={preview ? undefined : href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                <Icon size={14} /> <span>{label}</span>
              </a>
            ))}
          </div>
        )}
      </header>
      <div className="fl-tools">
        {cats.length > 0 && !data.category && (
          <nav className="fl-tabs" aria-label={t.library}>
            <button type="button" className={!cat ? "on" : ""} onClick={() => setCat("")}>
              {t.all}
            </button>
            {cats.map((x) => (
              <button key={x._id} type="button" className={cat === String(x._id) ? "on" : ""} onClick={() => setCat(String(x._id))} data-testid="fl-tab">
                {x.name}
              </button>
            ))}
          </nav>
        )}
        {data.books.length > 4 && (
          <label className="fl-search">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label={t.close}>
                <X size={14} />
              </button>
            )}
          </label>
        )}
      </div>
      {cat && cats.find((x) => String(x._id) === cat)?.about && (
        <div className="fl-cat-about" data-testid="fl-cat-about">
          <b>{cats.find((x) => String(x._id) === cat).name}</b>
          <p>{cats.find((x) => String(x._id) === cat).about}</p>
        </div>
      )}
      <main className="fl-main">
        {groups.map((g) => (
          <section key={`${g.key}-${cat}-${words}`} className="fl-group">
            {g.name && <h2 className="fl-group-title">{g.name}</h2>}
            {g.about && <p className="fl-group-about">{g.about}</p>}
            {!g.books.length ? (
              <div className="fl-empty">
                <BookOpen size={34} />
                <span>{data.books.length ? t.noMatch : t.empty}</span>
              </div>
            ) : (
              <div className="fl-books">
                {g.books.map((b, i) => (
                  <Book key={b._id || b.slug} b={b} t={t} preview={preview} onOpen={onOpen} big={design.layout === "magazine" && i === 0} i={i} />
                ))}
              </div>
            )}
          </section>
        ))}
      </main>
      <footer className="fl-foot">
        <a href={preview ? undefined : "/"} target="_blank" rel="noreferrer">
          {t.madeWith}
        </a>
      </footer>
      {contact && data.lead && (
        <div className="fl-modal">
          <LeadForm
            path={`/fb/${encodeURIComponent(data.slug)}/lead`}
            extra={{ category: data.category?.slug || cats.find((x) => String(x._id) === cat)?.slug || "" }}
            form={{ ...data.lead, title: data.lead.title || t.contactTitle, message: data.lead.message || t.contactSub }}
            t={t}
            icon="send"
            sendLabel={t.contactSend}
            thanks
            onDone={() => setContact(false)}
            onClose={() => setContact(false)}
          />
        </div>
      )}
    </div>
  );
}
