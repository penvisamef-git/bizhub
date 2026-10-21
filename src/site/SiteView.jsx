import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, Clock, Mail, MapPin, Menu as MenuIcon, Navigation, Phone, Send, UtensilsCrossed, X } from "lucide-react";
import { publicPost } from "../api/client";
import { SITE_TEXT, loadThemeFonts } from "./text";
import "./site.css";

// The restaurant website. Used by the public page (/s/<slug>) and by the editor's live preview.
//   data   → GET /api/public/site/<slug> (or the editor's preview data with unsaved changes)
//   view   → "home" | "menu" | "item"      itemId → for "item"
//   go(view, itemId, anchor) → navigate (public: URL; preview: local state)
//   preview → inside the editor (no language switch, links don't leave)
//   langSwitch → element shown in the top bar (public page only)
const usd = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const khr = (n) => `${new Intl.NumberFormat("en-US").format(Math.round(n))}៛`;

function Brand({ name }) {
  const P = {
    facebook: "M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7H16l.5-4h-3V9c0-.6.4-1 1-1z",
    instagram: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.5-1.5h.01",
    tiktok: "M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.6 2.4 4.4 5 4.6",
  };
  if (name === "telegram") return <Send size={18} />;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}

export default function SiteView({ data, lang = "en", view = "home", itemId = null, go, preview = false, langSwitch = null }) {
  const t = SITE_TEXT[lang] || SITE_TEXT.en;
  const R = data.restaurant;
  const root = useRef(null);
  const [navOpen, setNavOpen] = useState(false);
  const [cat, setCat] = useState("");
  const [photo, setPhoto] = useState(null); // gallery lightbox

  useEffect(() => loadThemeFonts(data.theme), [data.theme]);
  useEffect(() => setNavOpen(false), [view, itemId]);

  const nm = (x) => (lang === "km" ? x?.name_km || x?.name_en : x?.name_en || x?.name_km) || "";
  const nm2 = (x) => (lang === "km" ? x?.name_en : x?.name_km) || "";
  const name = nm(R) || "Restaurant";
  const second = nm2(R);
  const money = (n) => (R.currency === "KHR" ? khr(n) : usd(n));
  const other = (n) => (R.currency === "KHR" ? usd(n / (R.khr_rate || 4100)) : khr(Math.round((n * (R.khr_rate || 4100)) / (R.khr_rounding || 100)) * (R.khr_rounding || 100)));
  const showPrices = data.menu.show_prices;

  const cats = useMemo(() => data.categories.filter((c) => data.items.some((i) => String(i.category_id) === String(c._id))), [data.categories, data.items]);
  const featured = useMemo(() => data.menu.featured_ids.map((id) => data.items.find((i) => String(i._id) === String(id))).filter(Boolean), [data.menu.featured_ids, data.items]);
  const groups = useMemo(() => Object.fromEntries((data.addon_groups || []).map((g) => [String(g._id), g])), [data.addon_groups]);
  const hasAbout = data.about.enabled && (data.about.title || data.about.text || data.about.image);
  const hasGallery = data.gallery.enabled && data.gallery.images.length > 0;
  const C = data.contact;
  const socials = ["facebook", "instagram", "tiktok", "telegram"].filter((k) => C[k]);
  const featuredMode = data.menu.mode === "featured" && featured.length > 0;

  // jump to a part of the home page (or to another page)
  const scrollTo = (id) => {
    const el = root.current?.querySelector(`#st-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const nav = (key) => {
    setNavOpen(false);
    if (key === "menu" && (featuredMode || view !== "home")) return go("menu");
    if (key === "home") return view === "home" ? root.current?.scrollIntoView({ behavior: "smooth" }) : go("home");
    if (view !== "home") return go("home", null, key);
    scrollTo(key);
  };
  const hasForm = data.form?.enabled !== false && !!data.form;
  // top menu: the owner's order / names / hidden parts; a part with nothing to show hides by itself
  const available = { home: true, menu: data.menu.enabled, about: hasAbout, gallery: hasGallery, message: hasForm, contact: C.enabled };
  const standard = { home: t.home, menu: t.menu, about: t.about, gallery: t.gallery, message: t.writeUsNav, contact: t.contact };
  const links = (data.nav || ["home", "menu", "about", "gallery", "message", "contact"].map((key) => ({ key, show: true }))).filter((n) => n.show !== false && available[n.key]).map((n) => [n.key, n.label || standard[n.key]]);

  const style = data.color ? { "--st-accent": data.color } : undefined;
  const itemHref = (id) => (preview ? undefined : `/s/${data.slug}/item/${id}`);
  const openItem = (e, id) => {
    e.preventDefault();
    go("item", id);
  };

  const price = (i) => {
    if (!showPrices) return null;
    const all = [i.price, ...(i.sizes || []).map((s) => s.price)];
    const min = Math.min(...all);
    return (
      <span className="st-price">
        {all.some((p) => p !== min) && <small>{t.from} </small>}
        {money(min)}
      </span>
    );
  };

  const card = (i) => (
    <a key={i._id} href={itemHref(i._id)} onClick={(e) => openItem(e, i._id)} className={`st-item ${i.available === false ? "sold" : ""}`}>
      <span className="st-item-photo">
        {i.photo ? <img src={i.photo} alt="" loading="lazy" /> : <UtensilsCrossed size={26} />}
        {i.available === false && <em className="st-sold">{t.soldOut}</em>}
      </span>
      <span className="st-item-text">
        <b>{nm(i)}</b>
        {nm2(i) && <small className="st-item-second">{nm2(i)}</small>}
        {i.description && <small className="st-item-desc">{i.description}</small>}
        <span className="st-item-foot">
          {price(i)}
          <ChevronRight size={16} className="st-go" />
        </span>
      </span>
    </a>
  );

  const fullMenu = (
    <>
      {cats.length > 1 && (
        <div className="st-chips" role="tablist">
          <button type="button" className={!cat ? "on" : ""} onClick={() => setCat("")}>
            {t.allItems}
          </button>
          {cats.map((c) => (
            <button key={c._id} type="button" className={cat === String(c._id) ? "on" : ""} onClick={() => setCat(String(c._id))}>
              {nm(c)}
            </button>
          ))}
        </div>
      )}
      {cats.length === 0 && <p className="st-empty">{t.noItems}</p>}
      {cats
        .filter((c) => !cat || String(c._id) === cat)
        .map((c) => (
          <div key={c._id} className="st-cat">
            <h3 className="st-cat-title">
              <span>{nm(c)}</span>
              {nm2(c) && <small>{nm2(c)}</small>}
            </h3>
            <div className="st-items">{data.items.filter((i) => String(i.category_id) === String(c._id)).map(card)}</div>
          </div>
        ))}
    </>
  );

  // ---------- pages ----------
  let page;
  if (view === "item") {
    const item = data.items.find((i) => String(i._id) === String(itemId));
    const c = item && data.categories.find((x) => String(x._id) === String(item.category_id));
    const more = item ? data.items.filter((i) => String(i.category_id) === String(item.category_id) && i._id !== item._id).slice(0, 4) : [];
    page = (
      <main className="st-page st-detail">
        <div className="st-wrap">
          <button type="button" className="st-back" onClick={() => go("menu")}>
            <ArrowLeft size={16} /> {t.backToMenu}
          </button>
          {!item ? (
            <p className="st-empty">{t.itemMissing}</p>
          ) : (
            <>
              <article className="st-dish">
                <div className="st-dish-photo">{item.photo ? <img src={item.photo} alt={nm(item)} /> : <UtensilsCrossed size={56} />}</div>
                <div className="st-dish-text">
                  {c && <span className="st-kicker">{nm(c)}</span>}
                  <h1>{nm(item)}</h1>
                  {nm2(item) && <p className="st-dish-second">{nm2(item)}</p>}
                  {showPrices && (
                    <p className="st-dish-price">
                      {money(item.price)} <small>{other(item.price)}</small>
                    </p>
                  )}
                  {item.available === false && <em className="st-sold inline">{t.soldOut}</em>}
                  {item.description && <p className="st-dish-desc">{item.description}</p>}
                  {item.sizes?.length > 0 && (
                    <div className="st-opts">
                      <h4>{t.sizes}</h4>
                      {item.sizes.map((s) => (
                        <div key={s.name} className="st-opt">
                          <span>{s.name}</span>
                          {showPrices && <b>{money(s.price)}</b>}
                        </div>
                      ))}
                    </div>
                  )}
                  {(item.addon_group_ids || [])
                    .map((g) => groups[String(g)])
                    .filter(Boolean)
                    .map((g) => (
                      <div key={g._id} className="st-opts">
                        <h4>
                          {g.name} <small>{g.required ? t.required : t.pickUpTo.replace("{n}", g.max)}</small>
                        </h4>
                        {g.options.map((o) => (
                          <div key={o.name} className="st-opt">
                            <span>{o.name}</span>
                            {showPrices && o.price > 0 && <b>+{money(o.price)}</b>}
                          </div>
                        ))}
                      </div>
                    ))}
                  {C.phone && (
                    <a className="st-btn" href={preview ? undefined : `tel:${C.phone.replace(/\s+/g, "")}`}>
                      <Phone size={16} /> {t.call}
                    </a>
                  )}
                </div>
              </article>
              {more.length > 0 && (
                <section className="st-more">
                  <h3 className="st-cat-title">
                    <span>{t.more.replace("{name}", nm(c))}</span>
                  </h3>
                  <div className="st-items">{more.map(card)}</div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    );
  } else if (view === "menu") {
    page = (
      <main className="st-page">
        <section className="st-section st-menu">
          <div className="st-wrap">
            <span className="st-kicker">{name}</span>
            <h2 className="st-h2">{data.menu.title || t.ourMenu}</h2>
            {fullMenu}
          </div>
        </section>
      </main>
    );
  } else {
    const heroImg = data.hero.image || R.cover;
    page = (
      <main className="st-page">
        <section className={`st-hero ${heroImg ? "has-img" : ""}`} id="st-home">
          {heroImg && <div className="st-hero-img" style={{ backgroundImage: `url("${heroImg}")` }} />}
          <div className="st-wrap st-hero-in">
            {R.logo && <img className="st-hero-logo" src={R.logo} alt="" />}
            <span className="st-kicker">{second || name}</span>
            <h1>{data.hero.title || name}</h1>
            {data.hero.subtitle && <p>{data.hero.subtitle}</p>}
            <div className="st-hero-btns">
              {data.menu.enabled && (
                <button type="button" className="st-btn" onClick={() => nav("menu")}>
                  {data.hero.button || t.seeMenu}
                </button>
              )}
              {C.phone && (
                <a className="st-btn ghost" href={preview ? undefined : `tel:${C.phone.replace(/\s+/g, "")}`}>
                  <Phone size={16} /> {C.phone}
                </a>
              )}
            </div>
          </div>
        </section>

        {hasAbout && (
          <section className="st-section st-about" id="st-about">
            <div className={`st-wrap st-about-in ${data.about.image ? "" : "no-img"} ${data.about.image_side === "right" ? "img-right" : ""}`}>
              {data.about.image && (
                <div className="st-about-img">
                  <img src={data.about.image} alt="" loading="lazy" />
                </div>
              )}
              <div>
                <span className="st-kicker">{t.about}</span>
                <h2 className="st-h2">{data.about.title || t.aboutUs}</h2>
                {data.about.text
                  .split(/\n+/)
                  .filter(Boolean)
                  .map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                {data.about.highlights?.length > 0 && (
                  <div className="st-facts">
                    {data.about.highlights.map((h, i) => (
                      <div key={i} className="st-fact">
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

        {data.menu.enabled && (
          <section className="st-section st-menu" id="st-menu">
            <div className="st-wrap">
              <span className="st-kicker">{t.menu}</span>
              <h2 className="st-h2">{data.menu.title || (featuredMode ? t.favorites : t.ourMenu)}</h2>
              {featuredMode ? (
                <>
                  <div className="st-items">{featured.map(card)}</div>
                  <div className="st-center">
                    <button type="button" className="st-btn" onClick={() => go("menu")}>
                      {t.fullMenu} <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              ) : (
                fullMenu
              )}
            </div>
          </section>
        )}

        {hasGallery && (
          <section className="st-section st-gallery" id="st-gallery">
            <div className="st-wrap">
              <span className="st-kicker">{t.gallery}</span>
              <h2 className="st-h2">{data.gallery.title || t.gallery}</h2>
              <div className={`st-grid ${[5, 9].includes(data.gallery.images.length) ? "big" : ""}`}>
                {data.gallery.images.map((src, i) => (
                  <button key={src + i} type="button" onClick={() => !preview && setPhoto(src)} className="st-shot">
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {hasForm && <MessageForm data={data} t={t} preview={preview} />}
      </main>
    );
  }

  return (
    <div className={`st st-${data.theme} ${preview ? "st-preview" : ""}`} style={style} ref={root}>
      <header className="st-bar">
        <div className="st-wrap st-bar-in">
          <button type="button" className="st-logo" onClick={() => nav("home")}>
            {R.logo ? <img src={R.logo} alt="" /> : <UtensilsCrossed size={20} />}
            <span>{name}</span>
          </button>
          <nav className={`st-nav ${navOpen ? "open" : ""}`}>
            {links.map(([k, label]) => (
              <button key={k} type="button" onClick={() => nav(k)} className={(view === "menu" || view === "item") && k === "menu" ? "on" : ""}>
                {label}
              </button>
            ))}
            {data.links.map((l) => (
              <a key={l.url + l.label} href={preview ? undefined : l.url} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
            {langSwitch && <span className="st-lang">{langSwitch}</span>}
          </nav>
          <button type="button" className="st-burger" onClick={() => setNavOpen(!navOpen)} aria-label={navOpen ? t.close : t.openMenu} aria-expanded={navOpen}>
            {navOpen ? <X size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </header>

      {page}

      <footer className="st-foot" id="st-contact">
        {C.enabled && (
          <div className="st-wrap st-foot-in">
            <div className="st-foot-brand">
              <span className="st-logo static">
                {R.logo ? <img src={R.logo} alt="" /> : <UtensilsCrossed size={20} />}
                <span>{name}</span>
              </span>
              {second && <small>{second}</small>}
              {data.footer_note && <p>{data.footer_note}</p>}
              {socials.length > 0 && (
                <div className="st-socials" aria-label={t.follow}>
                  {socials.map((k) => (
                    <a key={k} href={preview ? undefined : C[k]} target="_blank" rel="noreferrer" aria-label={k}>
                      <Brand name={k} />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="st-foot-col">
              <h4>{C.title || t.visit}</h4>
              {C.address && (
                <p>
                  <MapPin size={15} /> {C.address}
                </p>
              )}
              {C.phone && (
                <p>
                  <Phone size={15} /> <a href={preview ? undefined : `tel:${C.phone.replace(/\s+/g, "")}`}>{C.phone}</a>
                </p>
              )}
              {C.email && (
                <p>
                  <Mail size={15} /> <a href={preview ? undefined : `mailto:${C.email}`}>{C.email}</a>
                </p>
              )}
              {C.map_url && (
                <a className="st-btn small" href={preview ? undefined : C.map_url} target="_blank" rel="noreferrer">
                  <Navigation size={15} /> {t.directions}
                </a>
              )}
            </div>
            {C.hours && (
              <div className="st-foot-col">
                <h4>{t.hours}</h4>
                {C.hours.split(/\n|·|;/).map((h, i) => (
                  <p key={i}>
                    {i === 0 && <Clock size={15} />} {h.trim()}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="st-wrap st-copy">
          © {new Date().getFullYear()} {name}. {t.rights}
        </div>
      </footer>

      {photo && (
        <div className="st-lightbox" onClick={() => setPhoto(null)} role="dialog" aria-modal="true">
          <button type="button" aria-label={t.close}>
            <X size={24} />
          </button>
          <img src={photo} alt="" />
        </div>
      )}
    </div>
  );
}

// "Send us a message": name, email or phone, kind, message → the restaurant's inbox
function MessageForm({ data, t, preview }) {
  const empty = { name: "", contact: "", kind: "feedback", message: "", website: "" };
  const [f, setF] = useState(empty);
  const [state, setState] = useState(""); // "" | sending | sent
  const [error, setError] = useState("");
  const kinds = [
    ["feedback", t.kindFeedback],
    ["request", t.kindRequest],
    ["booking", t.kindBooking],
    ["other", t.kindOther],
  ];
  const submit = async (e) => {
    e.preventDefault();
    if (preview) return setError(t.previewOnly);
    setState("sending");
    setError("");
    try {
      await publicPost(`/site/${encodeURIComponent(data.slug)}/message`, f);
      setState("sent");
      setF(empty);
    } catch (err) {
      setError(err.message);
      setState("");
    }
  };
  return (
    <section className="st-section st-message" id="st-message">
      <div className="st-wrap st-message-in">
        <div>
          <span className="st-kicker">{t.writeUsNav}</span>
          <h2 className="st-h2">{data.form.title || t.writeUs}</h2>
          <p className="st-message-sub">{data.form.text || t.writeUsSub}</p>
        </div>
        {state === "sent" ? (
          <div className="st-sent" role="status">
            <CheckCircle2 size={40} />
            <b>{t.sentTitle}</b>
            <p>{t.sentSub}</p>
            <button type="button" className="st-btn small" onClick={() => setState("")}>
              {t.sendAnother}
            </button>
          </div>
        ) : (
          <form className="st-form" onSubmit={submit}>
            <div className="st-kinds" role="radiogroup">
              {kinds.map(([k, label]) => (
                <label key={k} className={f.kind === k ? "on" : ""}>
                  <input type="radio" name="st-kind" checked={f.kind === k} onChange={() => setF({ ...f, kind: k })} />
                  {label}
                </label>
              ))}
            </div>
            <div className="st-form-row">
              <label>
                <span>{t.yourName}</span>
                <input required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
              </label>
              <label>
                <span>{t.yourContact}</span>
                <input required maxLength={100} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} autoComplete="email" inputMode="email" />
              </label>
            </div>
            <label>
              <span>{t.yourMessage}</span>
              <textarea required maxLength={2000} rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
            </label>
            {/* people never see this field; bots fill it */}
            <input className="st-hp" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} aria-hidden="true" />
            {error && <p className="st-form-error">{error}</p>}
            <button type="submit" className="st-btn" disabled={state === "sending"}>
              <Send size={16} /> {state === "sending" ? t.sending : t.sendMsg}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
