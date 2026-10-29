import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Clock, MapPin, Menu as MenuIcon, Minus, Phone, Plus, Search, Send, ShoppingBag, ShoppingBasket, Store, Truck, User, X } from "lucide-react";
import { MS_LOOKS, loadFonts, msClass, msVars } from "./looks";
import { MS_TEXT, cartStore, msMoney, unitOf } from "./text";
import { publicPost } from "../api/client";
import "./msite.css";
import PoweredBy from "../components/PoweredBy";

function Facebook({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21h3Z" />
    </svg>
  );
}
const telHref = (p) => `tel:${String(p).replace(/[^\d+]/g, "")}`;
const tgHref = (v) => (/^https?:\/\//i.test(v) ? v : `https://t.me/${String(v).replace(/^@/, "")}`);
const initials = (s) =>
  String(s || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

// The shop website (pure: data in → page out). Used by the public page, the owner's live preview and the look thumbnails.
export default function MsView({ data, lang = "en", preview = false, compact = false, langSwitch = null, page = "", onPage = null }) {
  const t = MS_TEXT[lang] || MS_TEXT.en;
  const root = useRef(null);
  const [navOpen, setNavOpen] = useState(false);
  const [pg, setPg] = useState(page || ""); // an extra page (?p=key) or "" = the home page
  useEffect(() => setPg(page || ""), [page]);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState(() => (preview ? {} : cartStore.get(data.slug)));
  const look = MS_LOOKS[data.theme] || MS_LOOKS.classic;
  useEffect(() => loadFonts([look.head, look.body]), [look.head, look.body]);

  const cur = data.currency;
  const shopOpen = !!data.shop?.open;
  const show = data.show || {};
  const products = data.products || [];
  const cats = data.categories || [];
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => (cat === "all" || String(p.category_id) === cat) && (!s || p.name.toLowerCase().includes(s)));
  }, [products, cat, q]);
  const shelves = useMemo(() => {
    if (look.grid !== "shelf" || cat !== "all" || q.trim()) return null;
    const rows = cats.map((c) => ({ c, items: list.filter((p) => String(p.category_id) === String(c._id)) })).filter((r) => r.items.length);
    const other = list.filter((p) => !p.category_id || !cats.some((c) => String(c._id) === String(p.category_id)));
    if (other.length) rows.push({ c: { _id: "other", name: t.all }, items: other });
    return rows;
  }, [look.grid, cat, q, cats, list, t.all]);
  const pages = data.pages || [];
  const current = pg ? pages.find((x) => x.key === pg) : null;
  const has = {
    products: show.products !== false,
    about: !!data.about,
    contact: show.contact_form !== false && !compact,
    visit: !!(data.hours || data.map_url || data.business?.phone || data.business?.address || data.business?.facebook || data.business?.telegram),
  };
  const count = Object.values(cart).reduce((a, n) => a + n, 0);
  const total = Object.entries(cart).reduce((a, [id, n]) => a + (products.find((p) => p._id === id)?.price || 0) * n, 0);
  const accountHref = preview ? "#" : `/m/${data.slug}/account`;

  const openPage = (key) => {
    setNavOpen(false);
    setPg(key);
    onPage?.(key);
    if (!preview) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const go = (id) => {
    setNavOpen(false);
    const scroll = () => root.current?.querySelector(`#ms-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (current) {
      openPage("");
      setTimeout(scroll, 60);
    } else scroll();
  };
  const setQty = (id, n) => {
    if (preview) return;
    const prod = products.find((x) => x._id === id);
    const max = prod?.soldout ? 0 : (prod?.stock ?? 999); // never more than the shop has
    const next = { ...cart, [id]: Math.max(0, Math.min(999, max, n)) };
    if (!next[id]) delete next[id];
    setCart(next);
    cartStore.set(data.slug, next);
  };
  const ext = preview ? { onClick: (e) => e.preventDefault() } : { target: "_blank", rel: "noreferrer" };
  const link = preview ? { onClick: (e) => e.preventDefault() } : {};
  const logo = data.business?.logo ? <img src={data.business.logo} alt="" /> : <ShoppingBasket size={22} />;
  const cover = data.cover;

  const nav = (
    <header className="ms-nav">
      <div className="ms-wrap ms-nav-in">
        <button type="button" className="ms-brand" onClick={() => (current ? openPage("") : root.current?.scrollIntoView({ behavior: "smooth" }))}>
          <span className="ms-logo">{logo}</span>
          <b>{data.business?.name}</b>
        </button>
        <nav className={`ms-links ${navOpen ? "open" : ""}`}>
          {has.products && (
            <button type="button" onClick={() => go("products")}>
              {t.products}
            </button>
          )}
          {has.about && (
            <button type="button" onClick={() => go("about")}>
              {t.about}
            </button>
          )}
          {(has.visit || has.contact) && (
            <button type="button" onClick={() => go("visit")}>
              {has.contact ? t.contact : t.visit}
            </button>
          )}
          {pages.map((x) => (
            <button key={x.key} type="button" className={pg === x.key ? "on" : ""} onClick={() => openPage(x.key)}>
              {x.title}
            </button>
          ))}
        </nav>
        <span className="ms-nav-right">
          {langSwitch}
          {shopOpen && (
            <a className="ms-icon-btn" href={accountHref} {...link} aria-label={t.myAccount} title={t.myAccount}>
              <User size={18} />
            </a>
          )}
          {shopOpen && (
            <a className="ms-cart-btn" href={`${accountHref}${preview ? "" : "?tab=cart"}`} {...link} aria-label={t.cart}>
              <ShoppingBag size={18} />
              {count > 0 && <em>{count}</em>}
            </a>
          )}
          <button type="button" className="ms-icon-btn ms-menu" onClick={() => setNavOpen((o) => !o)} aria-label="menu">
            {navOpen ? <X size={18} /> : <MenuIcon size={18} />}
          </button>
        </span>
      </div>
    </header>
  );

  const heroBtns = (
    <div className="ms-hero-btns">
      {has.products && (
        <button type="button" className="ms-btn" onClick={() => go("products")}>
          {t.shopNow} <ArrowRight size={17} />
        </button>
      )}
      {shopOpen && (
        <a className="ms-btn ghost" href={accountHref} {...link}>
          <ShoppingBag size={17} /> {t.orderOnline}
        </a>
      )}
    </div>
  );
  const heroText = (
    <div className="ms-hero-text">
      {data.hours && (
        <span className="ms-kicker">
          <Clock size={14} /> {data.hours}
        </span>
      )}
      <h1>{data.business?.name}</h1>
      {data.tagline && <p className="ms-tagline">{data.tagline}</p>}
      {shopOpen && (
        <div className="ms-chips">
          {data.shop.pickup && (
            <span>
              <Store size={14} /> {t.pickup}
            </span>
          )}
          {data.shop.delivery && (
            <span>
              <Truck size={14} /> {data.shop.delivery_fee > 0 ? t.deliveryFee.replace("{fee}", msMoney(data.shop.delivery_fee, cur)) : t.delivery}
            </span>
          )}
          {data.shop.min_order > 0 && <span>{t.minOrder.replace("{amt}", msMoney(data.shop.min_order, cur))}</span>}
        </div>
      )}
      {heroBtns}
    </div>
  );
  const art = cover ? <img className="ms-hero-img" src={cover} alt="" /> : <div className="ms-hero-art">{logo}</div>;
  const hero = (
    <section className="ms-hero" style={look.hero === "full" || look.hero === "banner" ? (cover ? { "--ms-cover": `url("${cover}")` } : undefined) : undefined}>
      <div className="ms-wrap ms-hero-in">
        {heroText}
        {(look.hero === "split" || look.hero === "center") && <div className="ms-hero-pic">{art}</div>}
      </div>
      {(look.flags || []).includes("wave") && (
        <svg className="ms-wave" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 30 C 200 70 400 -10 600 30 S 1000 70 1200 30 L1200 60 L0 60 Z" />
        </svg>
      )}
    </section>
  );

  const card = (p) => {
    const n = cart[p._id] || 0;
    const unit = unitOf(p, lang);
    return (
      <article key={p._id} className={`ms-p ${p.soldout ? "out" : ""}`}>
        <div className="ms-p-pic">
          {p.photo ? <img src={p.photo} alt="" loading="lazy" /> : <span className="ms-p-ph">{initials(p.name)}</span>}
          {p.soldout ? <em className="ms-badge out">{t.soldout}</em> : p.left ? <em className="ms-badge">{t.left.replace("{n}", p.left)}</em> : null}
        </div>
        <div className="ms-p-body">
          <b className="ms-p-name">{p.name}</b>
          {unit && <small className="ms-p-unit">{unit}</small>}
          <div className="ms-p-foot">
            {p.price !== undefined && <span className="ms-p-price">{msMoney(p.price, cur)}</span>}
            {shopOpen &&
              !p.soldout &&
              p.price !== undefined &&
              (n ? (
                <span className="ms-step">
                  <button type="button" onClick={() => setQty(p._id, n - 1)} aria-label="-">
                    <Minus size={14} />
                  </button>
                  <b>{n}</b>
                  <button type="button" onClick={() => setQty(p._id, n + 1)} aria-label="+" disabled={p.stock !== undefined && n >= p.stock}>
                    <Plus size={14} />
                  </button>
                </span>
              ) : (
                <button type="button" className="ms-add" onClick={() => setQty(p._id, 1)}>
                  <Plus size={15} /> <span>{t.add}</span>
                </button>
              ))}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div ref={root} className={`ms ${msClass(data.theme)} ${compact ? "compact" : ""} ${preview ? "preview" : ""}`} style={msVars(data.theme, data.color)}>
      {nav}
      {current ? (
        <section className="ms-sec ms-page">
          <div className="ms-wrap ms-page-in">
            <button type="button" className="ms-back" onClick={() => openPage("")}>
              ← {t.backHome}
            </button>
            <h1>{current.title}</h1>
            {current.image && <img className="ms-page-img" src={current.image} alt="" />}
            {current.body && <div className="ms-page-body">{current.body}</div>}
            {pages.length > 1 && (
              <div className="ms-page-more">
                {pages
                  .filter((x) => x.key !== current.key)
                  .map((x) => (
                    <button key={x.key} type="button" onClick={() => openPage(x.key)}>
                      {x.title} →
                    </button>
                  ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          {hero}
          {data.shop?.paused && <div className="ms-paused">{t.paused}</div>}

          {has.products && (
            <section className="ms-sec ms-products" id="ms-products">
              <div className="ms-wrap">
                <div className="ms-sec-head">
                  <h2>{t.products}</h2>
                  {products.length > 8 && (
                    <label className="ms-search">
                      <Search size={16} />
                      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} />
                    </label>
                  )}
                </div>
                {cats.length > 1 && (
                  <div className="ms-cats" role="tablist">
                    <button type="button" className={cat === "all" ? "on" : ""} onClick={() => setCat("all")}>
                      {t.all}
                    </button>
                    {cats.map((c) => (
                      <button key={c._id} type="button" className={cat === String(c._id) ? "on" : ""} onClick={() => setCat(String(c._id))}>
                        {c.color && <i style={{ background: c.color }} />}
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                {!products.length ? (
                  <p className="ms-empty">{t.noProducts}</p>
                ) : !list.length ? (
                  <p className="ms-empty">{t.noResults}</p>
                ) : shelves ? (
                  shelves.map((r) => (
                    <div key={r.c._id} className="ms-shelf">
                      <h3>{r.c.name}</h3>
                      <div className="ms-grid">{r.items.slice(0, compact ? 6 : 60).map(card)}</div>
                    </div>
                  ))
                ) : (
                  <div className="ms-grid">{list.slice(0, compact ? 8 : 600).map(card)}</div>
                )}
              </div>
            </section>
          )}

          {has.about && (
            <section className="ms-sec ms-about" id="ms-about">
              <div className="ms-wrap ms-about-in">
                <h2>{t.about}</h2>
                <p>{data.about}</p>
              </div>
            </section>
          )}

          {(has.visit || has.contact) && (
            <section className="ms-sec ms-visit" id="ms-visit">
              <div className="ms-wrap">
                <h2>{has.visit ? t.visit : t.contact}</h2>
                <div className="ms-visit-grid">
                  {data.hours && (
                    <div className="ms-info">
                      <Clock size={20} />
                      <span>
                        <small>{t.hours}</small>
                        <b>{data.hours}</b>
                      </span>
                    </div>
                  )}
                  {data.business?.phone && (
                    <a className="ms-info" href={preview ? "#" : telHref(data.business.phone)} {...link}>
                      <Phone size={20} />
                      <span>
                        <small>{t.phone}</small>
                        <b>{data.business.phone}</b>
                      </span>
                    </a>
                  )}
                  {data.business?.address && (
                    <div className="ms-info">
                      <MapPin size={20} />
                      <span>
                        <small>{t.address}</small>
                        <b>{data.business.address}</b>
                      </span>
                    </div>
                  )}
                  {data.business?.telegram && (
                    <a className="ms-info" href={tgHref(data.business.telegram)} {...ext}>
                      <Send size={20} />
                      <span>
                        <small>Telegram</small>
                        <b>{data.business.telegram}</b>
                      </span>
                    </a>
                  )}
                  {data.business?.facebook && (
                    <a className="ms-info" href={data.business.facebook} {...ext}>
                      <Facebook size={20} />
                      <span>
                        <small>Facebook</small>
                        <b>{data.business.facebook.replace(/^https?:\/\/(www\.)?/i, "")}</b>
                      </span>
                    </a>
                  )}
                </div>
                {data.map_url && (
                  <a className="ms-btn ms-map" href={data.map_url} {...ext}>
                    <MapPin size={17} /> {t.map}
                  </a>
                )}
                {has.contact && <ContactForm t={t} slug={data.slug} preview={preview} />}
              </div>
            </section>
          )}
        </>
      )}

      <footer className="ms-foot">
        <div className="ms-wrap ms-foot-in">
          <span>
            © {new Date().getFullYear()} {data.business?.name}
          </span>
          <span className="ms-made">
            <a href={preview ? "#" : "/"} {...link}>
              {t.madeWith}
            </a>
            <PoweredBy as="span" lang={lang} className="ms-powered" />
          </span>
        </div>
      </footer>

      {shopOpen && count > 0 && (
        <a className="ms-cartbar" href={`${accountHref}${preview ? "" : "?tab=cart"}`} {...link}>
          <ShoppingBag size={19} />
          <span>
            {count === 1 ? t.oneItem : t.items.replace("{n}", count)} · <b>{msMoney(total, cur)}</b>
          </span>
          <em>
            {t.checkout} <ArrowRight size={16} />
          </em>
        </a>
      )}
    </div>
  );
}

// "Contact us": goes to the owner's inbox (Website → Inbox) and to Telegram (mart_telegram)
function ContactForm({ t, slug, preview }) {
  const [f, setF] = useState({ name: "", contact: "", message: "", website: "" });
  const [state, setState] = useState(""); // "" | sending | sent
  const [error, setError] = useState("");
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="ms-contact"
      id="ms-contact"
      onSubmit={async (e) => {
        e.preventDefault();
        if (preview) return setError(t.previewOnly);
        setState("sending");
        setError("");
        try {
          await publicPost(`/shop/${encodeURIComponent(slug)}/contact`, f);
          setState("sent");
          setF({ name: "", contact: "", message: "", website: "" });
        } catch (err) {
          setError(err.message);
          setState("");
        }
      }}
    >
      <div className="ms-contact-head">
        <Send size={20} />
        <span>
          <b>{t.contact}</b>
          <small>{t.contactSub}</small>
        </span>
      </div>
      {state === "sent" ? (
        <p className="ms-sent">✓ {t.sentOk}</p>
      ) : (
        <>
          <div className="ms-contact-row">
            <input required maxLength={80} value={f.name} onChange={up("name")} placeholder={t.yourName} aria-label={t.yourName} />
            <input maxLength={120} value={f.contact} onChange={up("contact")} placeholder={t.yourContact} aria-label={t.yourContact} />
          </div>
          <textarea required rows={4} maxLength={2000} value={f.message} onChange={up("message")} placeholder={t.yourMessage} aria-label={t.yourMessage} />
          <input className="ms-hp" tabIndex={-1} autoComplete="off" value={f.website} onChange={up("website")} aria-hidden="true" />
          {error && <p className="ms-err">{error}</p>}
          <button type="submit" className="ms-btn" disabled={state === "sending"}>
            <Send size={16} /> {state === "sending" ? t.sending : t.send}
          </button>
        </>
      )}
    </form>
  );
}

// a small live picture of a look (owner's look picker): the 1200px wide page scaled to fit
export function MsThumb({ data, theme }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.2);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => setScale(el.clientWidth / 1200);
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const d = useMemo(() => ({ ...data, theme, color: "" }), [data, theme]);
  return (
    <div className="ms-thumb" ref={ref}>
      <div className="ms-thumb-in" style={{ transform: `scale(${scale})` }} inert="">
        <MsView data={d} preview compact />
      </div>
    </div>
  );
}
