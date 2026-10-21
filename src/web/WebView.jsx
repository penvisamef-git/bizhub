import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Clock, Mail, MapPin, Menu as MenuIcon, Navigation, Phone, Send, X } from "lucide-react";
import { publicPost } from "../api/client";
import { WEB_TEXT } from "./text";
import { WEB_LOOKS, loadWebFonts, webVars } from "./themes";
import { BrandIcon, SERVICE_ICONS, SOCIALS } from "./icons";
import "./web.css";

// The company website. Used by the public page (/w/<slug>, /w/<slug>/<page>) and by the editor's live preview.
//   data     → GET /api/public/web/<slug> (or the editor's data with unsaved changes)
//   page     → "" = home, or a page's address
//   go(page, anchor) → move (public: URL; preview: local state)
//   preview  → inside the editor (links don't leave, the form doesn't send)
const FLAGS = ["dark", "glow", "grid", "thin", "upper", "outline", "wave", "gradient", "dashed", "flip", "checks", "khmer", "tilt", "blobs", "hard", "soft", "rules", "sky"];

// owner's text → paragraphs, "## " headings and "- " lists (no html)
function Body({ text }) {
  const blocks = []; // { kind: h | ul | p, lines }
  let cur = null;
  for (const raw of String(text || "")
    .replace(/\r/g, "")
    .split("\n")) {
    const line = raw.trim();
    if (!line) {
      cur = null;
      continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      blocks.push({ kind: "h", lines: [line.replace(/^#{1,3}\s+/, "")] });
      cur = null;
    } else if (/^[-•*]\s/.test(line)) {
      if (cur?.kind !== "ul") blocks.push((cur = { kind: "ul", lines: [] }));
      cur.lines.push(line.replace(/^[-•*]\s+/, ""));
    } else {
      if (cur?.kind !== "p") blocks.push((cur = { kind: "p", lines: [] }));
      cur.lines.push(line);
    }
  }
  return blocks.map((b, i) =>
    b.kind === "h" ? (
      <h2 key={i}>{b.lines[0]}</h2>
    ) : b.kind === "ul" ? (
      <ul key={i}>
        {b.lines.map((l, j) => (
          <li key={j}>{l}</li>
        ))}
      </ul>
    ) : (
      <p key={i}>
        {b.lines.map((l, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {l}
          </span>
        ))}
      </p>
    ),
  );
}

export default function WebView({ data, lang = "en", page = "", go, preview = false, langSwitch = null }) {
  const t = WEB_TEXT[lang] || WEB_TEXT.en;
  const look = WEB_LOOKS[data.theme] || WEB_LOOKS.classic;
  const root = useRef(null);
  const [navOpen, setNavOpen] = useState(false);
  const [photo, setPhoto] = useState(null);
  useEffect(() => loadWebFonts(data.theme), [data.theme]);
  useEffect(() => setNavOpen(false), [page]);

  const name = data.company?.name || "Company";
  const logo = data.company?.logo || "";
  const C = data.contact;
  const socials = SOCIALS.filter((k) => C[k]);
  const pages = data.pages || [];
  const pageById = (id) => pages.find((p) => p._id === id);
  const current = page ? pages.find((p) => p.slug === page) : null;
  const services = (data.services?.items || []).filter((x) => x.title);
  const has = {
    home: true,
    about: data.about.enabled && !!(data.about.title || data.about.text || data.about.image),
    services: data.services.enabled && services.length > 0,
    gallery: data.gallery.enabled && data.gallery.images.length > 0,
    message: data.form.enabled,
    contact: C.enabled,
  };
  const partName = {
    home: t.home,
    about: t.about,
    services: t.services,
    gallery: t.gallery,
    message: t.message,
    contact: t.contact,
  };

  const scrollTo = (id) => {
    const el = root.current?.querySelector(`#cw-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const toPart = (key) => {
    setNavOpen(false);
    if (page) return go("", key === "home" ? null : key);
    if (key === "home") return root.current?.scrollIntoView({ behavior: "smooth" });
    scrollTo(key);
  };
  const toPage = (p) => {
    setNavOpen(false);
    if (p) go(p.slug);
  };
  // a button: "#part", "page:<id>", or a web address
  const follow = (to) => (e) => {
    if (!to) return;
    if (to.startsWith("#")) {
      e.preventDefault();
      return toPart(to.slice(1));
    }
    if (to.startsWith("page:")) {
      e.preventDefault();
      return toPage(pageById(to.slice(5)));
    }
    if (preview) e.preventDefault();
  };
  const hrefOf = (to) => (!to || preview ? undefined : to.startsWith("#") ? `/w/${data.slug}${to}` : to.startsWith("page:") ? `/w/${data.slug}/${pageById(to.slice(5))?.slug || ""}` : to);
  const outside = (to) => (to && !to.startsWith("#") && !to.startsWith("page:") && !/^(tel|mailto):/.test(to) ? { target: "_blank", rel: "noreferrer" } : {});
  const Btn = ({ to, label, ghost }) =>
    label ? (
      <a className={`cw-btn ${ghost ? "ghost" : ""}`} href={hrefOf(to)} onClick={follow(to)} {...outside(to)}>
        {label} {!ghost && <ArrowRight size={16} />}
      </a>
    ) : null;

  const menu = (data.nav || [])
    .filter((n) => n.show !== false)
    .map((n) => {
      if (n.kind === "part")
        return has[n.key]
          ? {
              id: `p-${n.key}`,
              label: n.label || partName[n.key],
              on: !page && n.key === "home",
              click: () => toPart(n.key),
            }
          : null;
      if (n.kind === "page") {
        const p = pageById(n.key);
        return p
          ? {
              id: `g-${p._id}`,
              label: n.label || p.title,
              on: current?._id === p._id,
              click: () => toPage(p),
            }
          : null;
      }
      return n.url ? { id: `l-${n.url}`, label: n.label, href: n.url } : null;
    })
    .filter(Boolean);

  const heroImg = data.hero.image;
  const tel = C.phone ? `tel:${C.phone.replace(/\s+/g, "")}` : "";

  let main;
  if (page) {
    main = !current ? (
      <main className="cw-main">
        <section className="cw-section">
          <div className="cw-wrap">
            <p className="cw-empty">{t.pageMissing}</p>
            <button type="button" className="cw-btn" onClick={() => go("")}>
              <ArrowLeft size={16} /> {t.back}
            </button>
          </div>
        </section>
      </main>
    ) : (
      <main className="cw-main">
        <section className={`cw-page-head ${current.image ? "has-img" : ""}`}>
          {current.image && <div className="cw-page-img" style={{ backgroundImage: `url("${current.image}")` }} />}
          <div className="cw-wrap cw-page-head-in">
            <button type="button" className="cw-back" onClick={() => go("")}>
              <ArrowLeft size={15} /> {t.home}
            </button>
            <h1>{current.title}</h1>
            {current.subtitle && <p>{current.subtitle}</p>}
          </div>
        </section>
        <section className="cw-section">
          <div className="cw-wrap cw-prose">
            <Body text={current.body} />
            {current.button && (
              <div className="cw-btns">
                <Btn to={current.button_to || "#message"} label={current.button} />
              </div>
            )}
          </div>
        </section>
        {has.message && <MessageForm data={data} t={t} preview={preview} />}
      </main>
    );
  } else {
    main = (
      <main className="cw-main">
        <section className={`cw-hero ${heroImg ? "has-img" : "no-img"}`} id="cw-home">
          {heroImg && <div className="cw-hero-bg" style={{ backgroundImage: `url("${heroImg}")` }} />}
          <span className="cw-deco" aria-hidden="true" />
          <div className="cw-wrap cw-hero-in">
            <div className="cw-hero-text">
              {(data.hero.kicker || !heroImg) && <span className="cw-kicker">{data.hero.kicker || name}</span>}
              <h1>{data.hero.title || name}</h1>
              {data.hero.subtitle && <p>{data.hero.subtitle}</p>}
              <div className="cw-btns">
                <Btn to={data.hero.button_to || (has.services ? "#services" : "#message")} label={data.hero.button || (has.services ? t.ourServices : t.getInTouch)} />
                {C.phone && (
                  <a className="cw-btn ghost" href={preview ? undefined : tel}>
                    <Phone size={16} /> {C.phone}
                  </a>
                )}
              </div>
            </div>
            {heroImg && (
              <div className="cw-hero-media">
                <img src={heroImg} alt="" />
              </div>
            )}
          </div>
        </section>

        {has.about && (
          <section className="cw-section cw-about" id="cw-about">
            <div className={`cw-wrap cw-about-in ${data.about.image ? "" : "no-img"}`}>
              {data.about.image && (
                <div className="cw-about-img">
                  <img src={data.about.image} alt="" loading="lazy" />
                </div>
              )}
              <div className="cw-about-text">
                <span className="cw-kicker">{t.about}</span>
                <h2 className="cw-h2">{data.about.title || t.aboutUs}</h2>
                <Body text={data.about.text} />
                {data.about.highlights?.length > 0 && (
                  <div className="cw-facts">
                    {data.about.highlights.map((h, i) => (
                      <div key={i} className="cw-fact">
                        <b>{h.value}</b>
                        <span>{h.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {has.services && (
          <section className="cw-section cw-services" id="cw-services">
            <div className="cw-wrap">
              <div className="cw-head">
                <span className="cw-kicker">{t.services}</span>
                <h2 className="cw-h2">{data.services.title || t.ourServices}</h2>
                {data.services.subtitle && <p className="cw-sub">{data.services.subtitle}</p>}
              </div>
              <div className="cw-svcs">
                {services.map((x, i) => {
                  const Icon = SERVICE_ICONS[x.icon] || SERVICE_ICONS.briefcase;
                  const linked = x.page_id && pageById(x.page_id);
                  return (
                    <article key={x._id || i} className="cw-svc">
                      <span className="cw-svc-num">{String(i + 1).padStart(2, "0")}</span>
                      {x.image ? (
                        <span className="cw-svc-img">
                          <img src={x.image} alt="" loading="lazy" />
                        </span>
                      ) : null}
                      <span className="cw-svc-ic">{look.checks ? <Check size={20} /> : <Icon size={22} />}</span>
                      <div className="cw-svc-text">
                        <h3>{x.title}</h3>
                        {x.text && <p>{x.text}</p>}
                        {(x.price || linked) && (
                          <div className="cw-svc-foot">
                            {x.price && <b className="cw-price">{x.price}</b>}
                            {linked && (
                              <a className="cw-more" href={hrefOf(`page:${linked._id}`)} onClick={follow(`page:${linked._id}`)}>
                                {t.learnMore} <ArrowRight size={14} />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {has.gallery && (
          <section className="cw-section cw-gallery" id="cw-gallery">
            <div className="cw-wrap">
              <div className="cw-head">
                <span className="cw-kicker">{t.gallery}</span>
                <h2 className="cw-h2">{data.gallery.title || t.gallery}</h2>
              </div>
              <div className={`cw-grid n${Math.min(data.gallery.images.length, 6)}`}>
                {data.gallery.images.map((src, i) => (
                  <button key={src + i} type="button" className="cw-shot" onClick={() => !preview && setPhoto(src)}>
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {has.message && <MessageForm data={data} t={t} preview={preview} />}
      </main>
    );
  }

  const flags = FLAGS.filter((f) => look[f])
    .map((f) => `is-${f}`)
    .join(" ");
  return (
    <div className={`cw cw-t-${data.theme} ${flags} ${preview ? "cw-preview" : ""}`} data-nav={look.nav} data-hero={look.hero} data-svc={look.svc} data-about={look.about} style={webVars(data.theme, data.color)} ref={root}>
      <header className={`cw-bar ${page ? "on-page" : ""}`}>
        <div className="cw-wrap cw-bar-in">
          <button type="button" className="cw-logo" onClick={() => toPart("home")}>
            {logo ? <img src={logo} alt="" /> : <Building2 size={20} />}
            <span>{name}</span>
          </button>
          <nav className={`cw-nav ${navOpen ? "open" : ""}`}>
            {menu.map((m) =>
              m.href ? (
                <a key={m.id} href={preview ? undefined : m.href} target="_blank" rel="noreferrer">
                  {m.label}
                </a>
              ) : (
                <button key={m.id} type="button" className={m.on ? "on" : ""} onClick={m.click}>
                  {m.label}
                </button>
              ),
            )}
            {langSwitch && <span className="cw-lang">{langSwitch}</span>}
          </nav>
          <button type="button" className="cw-burger" onClick={() => setNavOpen(!navOpen)} aria-label={navOpen ? t.close : t.openMenu} aria-expanded={navOpen}>
            {navOpen ? <X size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </header>

      {main}

      <footer className="cw-foot" id="cw-contact">
        {C.enabled && (
          <div className="cw-wrap cw-foot-in">
            <div className="cw-foot-brand">
              <span className="cw-logo static">
                {logo ? <img src={logo} alt="" /> : <Building2 size={20} />}
                <span>{name}</span>
              </span>
              {data.footer_note && <p>{data.footer_note}</p>}
              {socials.length > 0 && (
                <div className="cw-socials" aria-label={t.follow}>
                  {socials.map((k) => (
                    <a key={k} href={preview ? undefined : C[k]} target="_blank" rel="noreferrer" aria-label={k}>
                      <BrandIcon name={k} />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="cw-foot-col">
              <h4>{C.title || t.contact}</h4>
              {C.address && (
                <p>
                  <MapPin size={15} /> {C.address}
                </p>
              )}
              {C.phone && (
                <p>
                  <Phone size={15} /> <a href={preview ? undefined : tel}>{C.phone}</a>
                </p>
              )}
              {C.email && (
                <p>
                  <Mail size={15} /> <a href={preview ? undefined : `mailto:${C.email}`}>{C.email}</a>
                </p>
              )}
              {C.map_url && (
                <a className="cw-btn small" href={preview ? undefined : C.map_url} target="_blank" rel="noreferrer">
                  <Navigation size={15} /> {t.directions}
                </a>
              )}
            </div>
            {C.hours && (
              <div className="cw-foot-col">
                <h4>{t.hours}</h4>
                {C.hours.split(/\n|;/).map((h, i) => (
                  <p key={i}>
                    {i === 0 && <Clock size={15} />} {h.trim()}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="cw-wrap cw-copy">
          <span>
            © {new Date().getFullYear()} {name}. {t.rights}
          </span>
          <span>{t.made}</span>
        </div>
      </footer>

      {photo && (
        <div className="cw-lightbox" onClick={() => setPhoto(null)} role="dialog" aria-modal="true">
          <button type="button" aria-label={t.close}>
            <X size={24} />
          </button>
          <img src={photo} alt="" />
        </div>
      )}
    </div>
  );
}

// "Send us a message" → the company's inbox
function MessageForm({ data, t, preview }) {
  const empty = {
    name: "",
    contact: "",
    kind: "question",
    message: "",
    website: "",
  };
  const [f, setF] = useState(empty);
  const [state, setState] = useState("");
  const [error, setError] = useState("");
  const kinds = [
    ["question", t.kindQuestion],
    ["quote", t.kindQuote],
    ["booking", t.kindBooking],
    ["other", t.kindOther],
  ];
  const submit = async (e) => {
    e.preventDefault();
    if (preview) return setError(t.previewOnly);
    setState("sending");
    setError("");
    try {
      await publicPost(`/web/${encodeURIComponent(data.slug)}/message`, f);
      setState("sent");
      setF(empty);
    } catch (err) {
      setError(err.message);
      setState("");
    }
  };
  return (
    <section className="cw-section cw-message" id="cw-message">
      <div className="cw-wrap cw-message-in">
        <div className="cw-message-head">
          <span className="cw-kicker">{t.message}</span>
          <h2 className="cw-h2">{data.form.title || t.writeUs}</h2>
          <p className="cw-sub">{data.form.text || t.writeUsSub}</p>
        </div>
        {state === "sent" ? (
          <div className="cw-sent" role="status">
            <CheckCircle2 size={40} />
            <b>{t.sentTitle}</b>
            <p>{t.sentSub}</p>
            <button type="button" className="cw-btn small" onClick={() => setState("")}>
              {t.sendAnother}
            </button>
          </div>
        ) : (
          <form className="cw-form" onSubmit={submit}>
            <div className="cw-kinds" role="radiogroup">
              {kinds.map(([k, label]) => (
                <label key={k} className={f.kind === k ? "on" : ""}>
                  <input type="radio" name="cw-kind" checked={f.kind === k} onChange={() => setF({ ...f, kind: k })} />
                  {label}
                </label>
              ))}
            </div>
            <div className="cw-form-row">
              <label>
                <span>{t.yourName}</span>
                <input required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
              </label>
              <label>
                <span>{t.yourContact}</span>
                <input required maxLength={100} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} autoComplete="email" />
              </label>
            </div>
            <label>
              <span>{t.yourMessage}</span>
              <textarea required maxLength={2000} rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
            </label>
            <input className="cw-hp" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} aria-hidden="true" />
            {error && <p className="cw-form-error">{error}</p>}
            <button type="submit" className="cw-btn" disabled={state === "sending"}>
              <Send size={16} /> {state === "sending" ? t.sending : t.sendMsg}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
