import { useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  Baby,
  BookOpen,
  Briefcase,
  Building2,
  CakeSlice,
  CalendarDays,
  Camera,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  CreditCard,
  Droplet,
  Dumbbell,
  FlaskConical,
  Flower2,
  Gift,
  Globe,
  GraduationCap,
  Handshake,
  Heart,
  House,
  ImageIcon,
  Laptop,
  Leaf,
  Lightbulb,
  Mail,
  MapPin,
  Megaphone,
  Monitor,
  Music,
  Package,
  Palette,
  PawPrint,
  PenTool,
  Phone,
  Pill,
  Pizza,
  Plane,
  Play,
  Quote,
  Rocket,
  Scissors,
  Send,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Smile,
  Sparkles,
  Star,
  Stethoscope,
  Target,
  ThumbsUp,
  Trophy,
  Truck,
  Users,
  Utensils,
  Wifi,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { tx } from "./blocks";

// icons a service card can have (key → icon); the editor shows the same list
export const WS_ICONS = {
  star: Star,
  heart: Heart,
  zap: Zap,
  coffee: Coffee,
  cake: CakeSlice,
  utensils: Utensils,
  pizza: Pizza,
  wifi: Wifi,
  truck: Truck,
  shield: ShieldCheck,
  card: CreditCard,
  scissors: Scissors,
  sparkles: Sparkles,
  book: BookOpen,
  award: Award,
  clock: Clock,
  stethoscope: Stethoscope,
  pill: Pill,
  flask: FlaskConical,
  calendar: CalendarDays,
  droplet: Droplet,
  music: Music,
  gift: Gift,
  pen: PenTool,
  camera: Camera,
  monitor: Monitor,
  laptop: Laptop,
  phone: Phone,
  map: MapPin,
  users: Users,
  leaf: Leaf,
  flower: Flower2,
  home: House,
  car: Car,
  plane: Plane,
  bag: ShoppingBag,
  shirt: Shirt,
  package: Package,
  smile: Smile,
  baby: Baby,
  paw: PawPrint,
  dumbbell: Dumbbell,
  school: GraduationCap,
  briefcase: Briefcase,
  building: Building2,
  handshake: Handshake,
  idea: Lightbulb,
  megaphone: Megaphone,
  palette: Palette,
  rocket: Rocket,
  target: Target,
  thumbs: ThumbsUp,
  trophy: Trophy,
  wrench: Wrench,
  globe: Globe,
};

// "first paragraph\n\nsecond" → paragraphs (always plain text, never HTML)
export function Paras({ text, className = "" }) {
  const s = String(text || "").trim();
  if (!s) return null;
  return (
    <div className={`ws-paras ${className}`}>
      {s.split(/\n\s*\n/).map((p, i) => (
        <p key={i}>
          {p.split("\n").map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {line}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
// a picture, or a soft placeholder while there is none
export function Pic({ src, alt = "", className = "", ratio }) {
  if (src) return <img className={`ws-pic ${className}`} src={src} alt={alt} loading="lazy" style={ratio ? { aspectRatio: ratio } : undefined} />;
  return (
    <span className={`ws-pic ws-ph ${className}`} style={ratio ? { aspectRatio: ratio } : undefined} aria-hidden="true">
      <ImageIcon size={26} />
    </span>
  );
}
// a link that works on the live site and inside the editor preview
export function Go({ to, nav, className, children, ...rest }) {
  if (!to) return <span className={className}>{children}</span>;
  return (
    <a className={className} {...nav(to)} {...rest}>
      {children}
    </a>
  );
}
const Head = ({ title, sub, lang, center = true }) =>
  tx(title, lang) || tx(sub, lang) ? (
    <header className={`ws-head ${center ? "c" : ""}`}>
      {tx(title, lang) && <h2>{tx(title, lang)}</h2>}
      {sub !== undefined && <Paras text={tx(sub, lang)} className="ws-sub" />}
    </header>
  ) : null;

function youTubeId(u) {
  const m = String(u || "").match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : "";
}
function Countdown({ date, lang }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const end = date ? new Date(date.length === 10 ? `${date}T00:00:00+07:00` : `${date}:00+07:00`).getTime() : NaN;
  const left = Number.isFinite(end) ? Math.max(0, end - now) : 0;
  const parts = [
    [Math.floor(left / 864e5), lang === "km" ? "ថ្ងៃ" : "days"],
    [Math.floor(left / 36e5) % 24, lang === "km" ? "ម៉ោង" : "hours"],
    [Math.floor(left / 6e4) % 60, lang === "km" ? "នាទី" : "min"],
    [Math.floor(left / 1e3) % 60, lang === "km" ? "វិនាទី" : "sec"],
  ];
  return (
    <div className="ws-count">
      {parts.map(([v, l]) => (
        <span key={l}>
          <b>{String(v).padStart(2, "0")}</b>
          <small>{l}</small>
        </span>
      ))}
    </div>
  );
}
function Gallery({ d, lang }) {
  const [open, setOpen] = useState(-1);
  const imgs = d.images || [];
  return (
    <>
      <div className={`ws-gallery cols-${d.cols || 3}`}>
        {imgs.map((g, i) => (
          <figure key={i}>
            <button type="button" onClick={() => g.image && setOpen(i)} aria-label={tx(g.caption, lang) || `Picture ${i + 1}`}>
              <Pic src={g.image} alt={tx(g.caption, lang)} ratio="4 / 3" />
            </button>
            {tx(g.caption, lang) && <figcaption>{tx(g.caption, lang)}</figcaption>}
          </figure>
        ))}
      </div>
      {open >= 0 && imgs[open] && (
        <div className="ws-lightbox" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setOpen(-1)}>
          <button type="button" className="ws-lb-x" onClick={() => setOpen(-1)} aria-label="Close">
            <X size={22} />
          </button>
          {imgs.length > 1 && (
            <button type="button" className="ws-lb-prev" onClick={() => setOpen((open - 1 + imgs.length) % imgs.length)} aria-label="Previous">
              <ChevronLeft size={26} />
            </button>
          )}
          <img src={imgs[open].image} alt={tx(imgs[open].caption, lang)} />
          {imgs.length > 1 && (
            <button type="button" className="ws-lb-next" onClick={() => setOpen((open + 1) % imgs.length)} aria-label="Next">
              <ChevronRight size={26} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
function ContactForm({ d, lang, onSend, preview, page }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", text: "" });
  const [state, setState] = useState(""); // "" | sending | sent | error text
  const k = lang === "km";
  const set = (key) => (e) => setF((x) => ({ ...x, [key]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (preview || !onSend) return;
    if (f.text.trim().length < 2) return setState(k ? "សូមសរសេរសាររបស់អ្នក។" : "Please write your message.");
    setState("sending");
    try {
      await onSend({ ...f, page });
      setState("sent");
      setF({ name: "", phone: "", email: "", text: "" });
    } catch (err) {
      setState(err.message || (k ? "មិនអាចផ្ញើបានទេ។" : "Could not send."));
    }
  };
  if (state === "sent")
    return (
      <div className="ws-sent" role="status">
        <ThumbsUp size={28} />
        <b>{k ? "បានផ្ញើ! អរគុណ។" : "Sent — thank you!"}</b>
        <span>{k ? "យើងនឹងឆ្លើយតបឆាប់ៗ។" : "We'll get back to you soon."}</span>
      </div>
    );
  return (
    <form className="ws-form" onSubmit={submit}>
      <label>
        <span>{k ? "ឈ្មោះ" : "Name"}</span>
        <input value={f.name} onChange={set("name")} maxLength={80} autoComplete="name" />
      </label>
      {d.phone_field && (
        <label>
          <span>{k ? "លេខទូរស័ព្ទ" : "Phone"}</span>
          <input value={f.phone} onChange={set("phone")} maxLength={30} inputMode="tel" autoComplete="tel" />
        </label>
      )}
      {d.email_field && (
        <label>
          <span>{k ? "អ៊ីមែល" : "Email"}</span>
          <input value={f.email} onChange={set("email")} maxLength={120} type="email" autoComplete="email" />
        </label>
      )}
      <label className="wide">
        <span>{k ? "សារ" : "Message"}</span>
        <textarea value={f.text} onChange={set("text")} rows={4} maxLength={2000} required />
      </label>
      {state && state !== "sending" && <p className="ws-form-err">{state}</p>}
      <button type="submit" className="ws-btn" disabled={state === "sending" || preview} data-testid="ws-send">
        <Send size={16} /> {tx(d.button, lang) || (k ? "ផ្ញើ" : "Send")}
      </button>
      {preview && <small className="ws-mute">{k ? "ទម្រង់ដំណើរការពេលផ្សព្វផ្សាយ។" : "The form works on the published site."}</small>}
    </form>
  );
}

// social / contact links from the site settings
export function socialLinks(c = {}) {
  const tg = String(c.telegram || "").trim();
  const tgUrl = tg ? (/^https?:\/\//.test(tg) ? tg : /^@?[a-z0-9_]{4,}$/i.test(tg) ? `https://t.me/${tg.replace(/^@/, "")}` : /^[+\d\s]{6,}$/.test(tg) ? `https://t.me/+${tg.replace(/\D/g, "")}` : "") : "";
  const web = (u) => (u && /^https?:\/\//.test(u) ? u : u ? `https://${u}` : "");
  return [
    c.phone && { key: "phone", icon: Phone, label: c.phone, href: `tel:${String(c.phone).replace(/[^\d+]/g, "")}` },
    tgUrl && { key: "telegram", icon: Send, label: "Telegram", href: tgUrl },
    c.facebook && { key: "facebook", icon: Globe, label: "Facebook", href: web(c.facebook) },
    c.instagram && { key: "instagram", icon: Camera, label: "Instagram", href: web(c.instagram) },
    c.tiktok && { key: "tiktok", icon: Music, label: "TikTok", href: web(c.tiktok) },
    c.youtube && { key: "youtube", icon: Play, label: "YouTube", href: web(c.youtube) },
    c.email && { key: "email", icon: Mail, label: c.email, href: `mailto:${c.email}` },
  ].filter(Boolean);
}

// one block → its section
export function Block({ b, lang, nav, site, posts = [], blog, onSend, preview, page }) {
  const d = b.data || {};
  const t = (v) => tx(v, lang);
  switch (b.type) {
    case "hero":
      return (
        <div className={`ws-hero a-${d.align} s-${d.size} o-${d.overlay} ${d.image ? "has-img" : "no-img"}`}>
          {d.image && <div className="ws-hero-bg" style={{ backgroundImage: `url("${d.image}")` }} aria-hidden="true" />}
          <div className="ws-in ws-hero-in">
            <div className="ws-hero-text">
              {t(d.title) && <h1>{t(d.title)}</h1>}
              <Paras text={t(d.sub)} className="ws-hero-sub" />
              {(t(d.btn) || t(d.btn2)) && (
                <div className="ws-btns">
                  {t(d.btn) && (
                    <Go to={d.btn_to} nav={nav} className="ws-btn">
                      {t(d.btn)} <ArrowRight size={16} />
                    </Go>
                  )}
                  {t(d.btn2) && (
                    <Go to={d.btn2_to} nav={nav} className="ws-btn ghost">
                      {t(d.btn2)}
                    </Go>
                  )}
                </div>
              )}
            </div>
            <div className="ws-hero-art">
              <Pic src={d.image} ratio="4 / 3" />
            </div>
          </div>
        </div>
      );
    case "text":
      return (
        <div className={`ws-in ws-text a-${d.align}`}>
          {t(d.title) && <h2>{t(d.title)}</h2>}
          <Paras text={t(d.body)} />
        </div>
      );
    case "split":
      return (
        <div className={`ws-in ws-split side-${d.side}`}>
          <Pic src={d.image} ratio="4 / 3" className="ws-card-pic" />
          <div>
            {t(d.title) && <h2>{t(d.title)}</h2>}
            <Paras text={t(d.body)} />
            {t(d.btn) && (
              <Go to={d.btn_to} nav={nav} className="ws-btn">
                {t(d.btn)} <ArrowRight size={16} />
              </Go>
            )}
          </div>
        </div>
      );
    case "image":
      return (
        <figure className={d.wide ? "ws-image wide" : "ws-in ws-image"}>
          <Pic src={d.image} alt={t(d.caption)} ratio={d.wide ? "21 / 9" : "16 / 9"} />
          {t(d.caption) && <figcaption>{t(d.caption)}</figcaption>}
        </figure>
      );
    case "gallery":
      return (
        <div className="ws-in">
          <Head title={d.title} lang={lang} />
          <Gallery d={d} lang={lang} />
        </div>
      );
    case "video": {
      const yt = youTubeId(d.url);
      const fb = !yt && /facebook\.com|fb\.watch/.test(d.url || "") ? d.url : "";
      return (
        <div className="ws-in ws-video">
          <Head title={d.title} lang={lang} />
          {yt || fb ? (
            <div className="ws-frame">
              <iframe
                src={yt ? `https://www.youtube-nocookie.com/embed/${yt}` : `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fb)}&show_text=false`}
                title={t(d.title) || "Video"}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="ws-frame ws-ph">
              <Play size={36} />
            </div>
          )}
        </div>
      );
    }
    case "services":
      return (
        <div className="ws-in">
          <Head title={d.title} sub={d.sub} lang={lang} />
          <div className="ws-cards">
            {(d.items || []).map((x, i) => {
              const Icon = WS_ICONS[x.icon] || Star;
              return (
                <article key={i} className="ws-card">
                  {x.image ? (
                    <Pic src={x.image} ratio="16 / 10" className="ws-card-pic" />
                  ) : (
                    <span className="ws-ic">
                      <Icon size={24} />
                    </span>
                  )}
                  {t(x.title) && <h3>{t(x.title)}</h3>}
                  <Paras text={t(x.text)} />
                </article>
              );
            })}
          </div>
        </div>
      );
    case "prices":
      return (
        <div className="ws-in ws-narrow">
          <Head title={d.title} sub={d.sub} lang={lang} />
          <ul className="ws-prices">
            {(d.items || []).map((x, i) => (
              <li key={i}>
                <div className="ws-price-row">
                  <b>{t(x.name)}</b>
                  <i aria-hidden="true" />
                  <span>{x.price}</span>
                </div>
                {t(x.desc) && <small>{t(x.desc)}</small>}
              </li>
            ))}
          </ul>
          {t(d.note) && <p className="ws-mute ws-note">{t(d.note)}</p>}
        </div>
      );
    case "team":
      return (
        <div className="ws-in">
          <Head title={d.title} lang={lang} />
          <div className="ws-team">
            {(d.people || []).map((p, i) => (
              <figure key={i}>
                {p.photo ? <img src={p.photo} alt={t(p.name)} loading="lazy" /> : <span className="ws-initial">{(t(p.name) || "?").slice(0, 1)}</span>}
                <figcaption>
                  <b>{t(p.name)}</b>
                  <small>{t(p.role)}</small>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      );
    case "quotes":
      return (
        <div className="ws-in">
          <Head title={d.title} lang={lang} />
          <div className="ws-quotes">
            {(d.items || []).map((q, i) => (
              <blockquote key={i} className="ws-card">
                <Quote size={22} className="ws-q-ic" />
                <Paras text={t(q.text)} />
                <footer>
                  {q.photo ? <img src={q.photo} alt="" loading="lazy" /> : <span className="ws-initial sm">{(t(q.name) || "?").slice(0, 1)}</span>}
                  <span>
                    <b>{t(q.name)}</b>
                    {t(q.role) && <small>{t(q.role)}</small>}
                  </span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      );
    case "faq":
      return (
        <div className="ws-in ws-narrow">
          <Head title={d.title} lang={lang} />
          <div className="ws-faq">
            {(d.items || []).map((x, i) => (
              <details key={i}>
                <summary>{t(x.q)}</summary>
                <Paras text={t(x.a)} />
              </details>
            ))}
          </div>
        </div>
      );
    case "hours":
      return (
        <div className="ws-in ws-narrow">
          <Head title={d.title} lang={lang} />
          <ul className="ws-hours">
            {(d.rows || []).map((r, i) => (
              <li key={i}>
                <span>{t(r.day)}</span>
                <b>{t(r.time)}</b>
              </li>
            ))}
          </ul>
          {t(d.note) && <p className="ws-mute ws-note">{t(d.note)}</p>}
        </div>
      );
    case "map": {
      const addr = t(d.address) || tx(site?.contact?.address, lang);
      return (
        <div className="ws-in">
          <Head title={d.title} lang={lang} />
          <div className="ws-map">
            {addr ? (
              <iframe title={t(d.title) || "Map"} src={`https://maps.google.com/maps?q=${encodeURIComponent(addr)}&z=15&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            ) : (
              <div className="ws-ph">
                <MapPin size={32} />
              </div>
            )}
          </div>
          <div className="ws-map-foot">
            {addr && (
              <span>
                <MapPin size={16} /> {addr}
              </span>
            )}
            {(d.map_url || addr) && (
              <a className="ws-btn ghost sm" href={d.map_url && /^https?:\/\//.test(d.map_url) ? d.map_url : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`} target="_blank" rel="noopener noreferrer">
                {lang === "km" ? "បើកក្នុង Google Maps" : "Open in Google Maps"}
              </a>
            )}
          </div>
        </div>
      );
    }
    case "contact":
      return (
        <div className="ws-in ws-narrow" id="contact">
          <Head title={d.title} sub={d.sub} lang={lang} />
          <ContactForm d={d} lang={lang} onSend={onSend} preview={preview} page={page} />
        </div>
      );
    case "buttons":
      return (
        <div className={`ws-in ws-buttons a-${d.align}`}>
          {t(d.title) && <h2>{t(d.title)}</h2>}
          <div className="ws-btns">
            {(d.items || []).map((x, i) => (
              <Go key={i} to={x.to} nav={nav} className={`ws-btn ${x.style === "outline" ? "ghost" : ""}`}>
                {t(x.label)}
              </Go>
            ))}
          </div>
        </div>
      );
    case "social": {
      const links = socialLinks(site?.contact);
      return (
        <div className="ws-in ws-social-b">
          {t(d.title) && <h2>{t(d.title)}</h2>}
          <div className="ws-social">
            {links.length ? (
              links.map(({ key, icon: Icon, label, href }) => (
                <a key={key} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                  <Icon size={18} /> {label}
                </a>
              ))
            ) : (
              <span className="ws-mute">{lang === "km" ? "បន្ថែមតំណក្នុង ការកំណត់ → ទំនាក់ទំនង" : "Add links in Settings → Contact"}</span>
            )}
          </div>
        </div>
      );
    }
    case "countdown":
      return (
        <div className="ws-in ws-countdown">
          {t(d.title) && <h2>{t(d.title)}</h2>}
          <Countdown date={d.date} lang={lang} />
          {t(d.sub) && <p className="ws-mute">{t(d.sub)}</p>}
        </div>
      );
    case "numbers":
      return (
        <div className="ws-in">
          <Head title={d.title} lang={lang} />
          <div className="ws-numbers">
            {(d.items || []).map((x, i) => (
              <div key={i}>
                <b>{x.value}</b>
                <span>{t(x.label)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "logos":
      return (
        <div className="ws-in">
          <Head title={d.title} lang={lang} />
          <div className="ws-logos">
            {(d.images || []).map((x, i) => (
              <Go key={i} to={x.to} nav={nav} className="ws-logo" title={t(x.name)}>
                {x.image ? <img src={x.image} alt={t(x.name)} loading="lazy" /> : <span>{t(x.name) || "Logo"}</span>}
              </Go>
            ))}
          </div>
        </div>
      );
    case "cta":
      return (
        <div className="ws-in">
          <div className="ws-cta">
            <div>
              {t(d.title) && <h2>{t(d.title)}</h2>}
              <Paras text={t(d.sub)} />
            </div>
            {t(d.btn) && (
              <Go to={d.btn_to} nav={nav} className="ws-btn inv">
                {t(d.btn)} <ArrowRight size={16} />
              </Go>
            )}
          </div>
        </div>
      );
    case "spacer":
      return <div className={`ws-spacer s-${d.size}`}>{d.line && <hr />}</div>;
    case "posts": {
      if (!blog && !preview) return null;
      const list = posts.slice(0, Number(d.count) || 3);
      return (
        <div className="ws-in">
          <Head title={d.title} lang={lang} />
          {list.length ? (
            <div className="ws-posts">
              {list.map((p) => (
                <PostCard key={p._id || p.slug} p={p} lang={lang} nav={nav} />
              ))}
            </div>
          ) : (
            <p className="ws-mute ws-note">{blog ? (lang === "km" ? "មិនទាន់មានអត្ថបទ។" : "No posts yet.") : lang === "km" ? "ត្រូវការ “ប្លុក / ព័ត៌មាន”។" : "Needs the Blog add-on."}</p>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}

export function PostCard({ p, lang, nav }) {
  return (
    <Go to={`post:${p.slug}`} nav={nav} className="ws-card ws-post">
      <Pic src={p.cover} ratio="16 / 10" className="ws-card-pic" />
      <small className="ws-mute">
        {new Date(p.date).toLocaleDateString(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}
        {p.category ? ` · ${p.category}` : ""}
      </small>
      <h3>{tx(p.title, lang)}</h3>
      {tx(p.excerpt, lang) && <p>{tx(p.excerpt, lang)}</p>}
    </Go>
  );
}
