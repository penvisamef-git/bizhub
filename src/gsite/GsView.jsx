import { useEffect, useMemo, useRef, useState } from "react";
import {
  AirVent,
  ArrowRight,
  BadgePercent,
  Baby,
  Bath,
  BedDouble,
  Bike,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  CookingPot,
  CreditCard,
  DoorOpen,
  Fan,
  Mail,
  Map as MapIcon,
  MapPin,
  Menu as MenuIcon,
  MessageCircle,
  Navigation,
  PawPrint,
  Phone,
  Plane,
  Refrigerator,
  Sailboat,
  Send,
  Shirt,
  ShowerHead,
  Star,
  Sun,
  Trees,
  Tv,
  UserRound,
  Users,
  UtensilsCrossed,
  Waves,
  Wifi,
  X,
} from "lucide-react";
import { publicGet, publicPost } from "../api/client";
import { BrandIcon } from "../web/icons";
import { GS_TEXT } from "./text";
import { loadSiteFonts, siteClass, siteVars } from "./looks";
import "./gsite.css";

// The guest house website. Used by the public page (/g/<slug>) and by the owner's live preview / look picker.
//   data     → GET /api/public/stay/<slug> (or the editor's data with unsaved changes)
//   preview  → inside the editor (links don't leave, the form doesn't send)
//   compact  → a small picture of the look (top menu, photo and rooms only)
const FAC_ICON = {
  wifi: Wifi,
  parking: Car,
  ac: AirVent,
  hot_water: ShowerHead,
  breakfast: Coffee,
  restaurant: UtensilsCrossed,
  pool: Waves,
  garden: Trees,
  laundry: Shirt,
  airport: Plane,
  tours: MapIcon,
  bike: Bike,
  motorbike: Navigation,
  family: Baby,
  pets: PawPrint,
  reception24: Clock,
  kitchen: CookingPot,
  terrace: Sun,
  river_view: Sailboat,
  cards: CreditCard,
};
const AMEN_ICON = { ac: AirVent, fan: Fan, wifi: Wifi, tv: Tv, hot_water: ShowerHead, fridge: Refrigerator, balcony: DoorOpen, kitchen: CookingPot, bathtub: Bath, parking: Car };
const SOCIAL = ["facebook", "instagram", "tiktok", "telegram"];

const money = (v, cur) => (cur === "KHR" ? `${Math.round(Number(v) || 0).toLocaleString("en-US")}៛` : `$${(Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: Number(v) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`);
const today = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const addDays = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const nightsOf = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const dealDay = (d, lang) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
// the best deal price for each night (same rule as the server)
function nightPrice(promos, room, day) {
  let best = room.price;
  for (const p of promos || []) {
    if (p.from > day || p.to < day || (p.type_ids.length && !p.type_ids.includes(room._id))) continue;
    const v = p.kind === "percent" ? room.price * (1 - Math.min(100, p.value) / 100) : p.kind === "amount" ? room.price - p.value : Math.min(room.price, p.value);
    best = Math.min(best, Math.max(0, v));
  }
  return best;
}
const stayTotal = (promos, room, from, n) => Array.from({ length: n }, (_, i) => nightPrice(promos, room, addDays(from, i))).reduce((a, b) => a + b, 0);
const telHref = (p) => `tel:${String(p).replace(/[^\d+]/g, "")}`;
const waHref = (p) => `https://wa.me/${String(p).replace(/\D/g, "").replace(/^0/, "855")}`;

export default function GsView({ data, lang = "en", preview = false, compact = false, langSwitch = null }) {
  const t = GS_TEXT[lang] || GS_TEXT.en;
  const root = useRef(null);
  const [navOpen, setNavOpen] = useState(false);
  const [box, setBox] = useState(null); // { images, i }
  const [form, setForm] = useState(() => ({ from: today(), to: addDays(today(), 1), guests: 2, type_id: "", name: "", contact: "", message: "", website: "" }));
  const [free, setFree] = useState(null); // { from, to, free }
  const [state, setState] = useState(""); // "" | sending | sent
  const [error, setError] = useState("");
  useEffect(() => loadSiteFonts(data.theme), [data.theme]);

  const cur = data.currency;
  const name = data.business?.name || "Guest House";
  const logo = data.business?.logo || "";
  const C = data.contact;
  const rooms = data.rooms.items || [];
  const has = {
    rooms: data.rooms.enabled && rooms.length > 0,
    about: data.about.enabled && !!(data.about.title || data.about.text || data.about.image),
    facilities: data.facilities.enabled && data.facilities.keys.length + data.facilities.extra.length > 0,
    gallery: data.gallery.enabled && data.gallery.images.length > 0,
    book: data.booking.enabled,
    contact: C.enabled,
    reviews: !!data.reviews?.count,
  };
  const parts = ["rooms", "about", "facilities", "gallery", "reviews", "book", "contact"].filter((k) => has[k]);
  const lowest = rooms.length ? Math.min(...rooms.map((r) => (r.deal ? r.deal.price : r.price))) : 0;
  const nights = form.from && form.to ? nightsOf(form.from, form.to) : 0;
  const datesOk = nights > 0 && form.from >= today();
  const chosen = rooms.find((r) => r._id === form.type_id);

  // free rooms for the dates (public site only)
  useEffect(() => {
    if (preview || !data.slug || !data.booking.show_free || !datesOk) return undefined;
    const timer = setTimeout(() => {
      publicGet(`/stay/${encodeURIComponent(data.slug)}/free?from=${form.from}&to=${form.to}`)
        .then((r) => setFree(r.data))
        .catch(() => setFree(null));
    }, 350);
    return () => clearTimeout(timer);
  }, [preview, data.slug, data.booking.show_free, form.from, form.to, datesOk]);
  const freeOf = (id) => (free && free.from === form.from && free.to === form.to ? free.free[id] || 0 : null);

  const go = (id) => {
    setNavOpen(false);
    const el = root.current?.querySelector(`#gs-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const pickRoom = (id) => {
    setForm((f) => ({ ...f, type_id: id }));
    go("book");
  };
  const submit = async (e) => {
    e.preventDefault();
    if (preview) return setError(t.previewOnly);
    if (!datesOk) return setError(t.badDates);
    setState("sending");
    setError("");
    try {
      await publicPost(`/stay/${encodeURIComponent(data.slug)}/request`, { ...form, guests: Number(form.guests) || 1 });
      setState("sent");
    } catch (err) {
      setError(err.message);
      setState("");
    }
  };
  const ext = preview ? { onClick: (e) => e.preventDefault() } : { target: "_blank", rel: "noreferrer" };

  const dateFields = (cls) => (
    <>
      <label className={cls}>
        <span>{t.checkIn}</span>
        <input type="date" min={today()} value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value, to: f.to <= e.target.value ? addDays(e.target.value, 1) : f.to }))} />
      </label>
      <label className={cls}>
        <span>{t.checkOut}</span>
        <input type="date" min={form.from ? addDays(form.from, 1) : today()} value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} />
      </label>
    </>
  );

  const quick = has.book && (
    <form
      className="gs-quick"
      onSubmit={(e) => {
        e.preventDefault();
        go("book");
      }}
    >
      {dateFields("gs-q")}
      <label className="gs-q gs-q-n">
        <span>{t.guests}</span>
        <input type="number" min={1} max={50} value={form.guests} onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))} />
      </label>
      <button type="submit" className="gs-btn">
        {t.check} <ArrowRight size={17} />
      </button>
    </form>
  );

  const roomCard = (r) => {
    const n = freeOf(r._id);
    const img = r.images[0];
    return (
      <article key={r._id} className="gs-room">
        <button type="button" className="gs-room-media" onClick={() => r.images.length && setBox({ images: r.images, i: 0 })} aria-label={r.name} style={!img ? { "--tc": r.color || "var(--gs-accent)" } : undefined}>
          {img ? <img src={img} alt={r.name} loading="lazy" /> : <BedDouble size={48} strokeWidth={1.4} />}
          {r.images.length > 1 && <span className="gs-room-count">+{r.images.length - 1}</span>}
          {r.deal && data.rooms.show_prices && <span className="gs-deal">{r.deal.badge || t.deal}</span>}
          {n !== null && <span className={`gs-free ${n ? "" : "none"}`}>{n ? t.freeN.replace("{n}", n) : t.full}</span>}
        </button>
        <div className="gs-room-body">
          <div className="gs-room-top">
            <h3>{r.name}</h3>
            <span className="gs-room-lead" aria-hidden="true" />
            {data.rooms.show_prices && (
              <span className="gs-price">
                {r.deal && <s>{money(r.price, cur)}</s>}
                <b>{money(r.deal ? r.deal.price : r.price, cur)}</b>
                <small>{t.perNight}</small>
              </span>
            )}
          </div>
          <div className="gs-room-meta">
            <span>
              <Users size={15} /> {t.upTo.replace("{n}", r.capacity)}
            </span>
            {r.beds && (
              <span>
                <BedDouble size={15} /> {r.beds}
              </span>
            )}
          </div>
          {r.text && <p className="gs-room-text">{r.text}</p>}
          {r.amenities.length > 0 && (
            <ul className="gs-amen">
              {r.amenities.map((a) => {
                const I = AMEN_ICON[a] || Check;
                return (
                  <li key={a}>
                    <I size={14} /> {t.amen[a] || a}
                  </li>
                );
              })}
            </ul>
          )}
          {has.book && (
            <button type="button" className="gs-btn gs-btn-line" onClick={() => pickRoom(r._id)}>
              {t.bookThis} <ArrowRight size={16} />
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div ref={root} className={`gs ${siteClass(data.theme)} ${preview ? "is-preview" : ""} ${compact ? "is-compact" : ""}`} style={siteVars(data.theme, data.color)}>
      {/* ---------- top menu ---------- */}
      <header className="gs-nav">
        <div className="gs-wrap gs-nav-in">
          <button type="button" className="gs-brand" onClick={() => root.current?.scrollIntoView({ behavior: "smooth" })}>
            {logo ? <img src={logo} alt="" /> : <BedDouble size={22} />}
            <b>{name}</b>
          </button>
          <nav className={`gs-links ${navOpen ? "open" : ""}`} aria-label={name}>
            {parts.map((k) => (
              <button key={k} type="button" onClick={() => go(k)}>
                {t[k]}
              </button>
            ))}
            {langSwitch && <span className="gs-lang">{langSwitch}</span>}
          </nav>
          {data.portal && (
            <a className="gs-btn gs-btn-ghost gs-nav-sign" href={preview ? undefined : `/g/${data.slug}/account`} onClick={preview ? (e) => e.preventDefault() : undefined}>
              <UserRound size={16} /> <span>{t.signIn}</span>
            </a>
          )}
          {has.book && (
            <button type="button" className="gs-btn gs-nav-book" onClick={() => go("book")}>
              {t.bookNow}
            </button>
          )}
          <button type="button" className="gs-menu" onClick={() => setNavOpen((v) => !v)} aria-label={navOpen ? t.close : t.openMenu}>
            {navOpen ? <X size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </header>

      {/* ---------- big photo ---------- */}
      <section id="gs-home" className={`gs-hero ${data.hero.image ? "has-img" : "no-img"}`} style={data.hero.image ? { "--hero": `url("${data.hero.image}")` } : undefined}>
        <div className="gs-hero-media" aria-hidden="true">
          {data.hero.image ? <img src={data.hero.image} alt="" /> : <BedDouble size={96} strokeWidth={1} />}
        </div>
        <div className="gs-wrap gs-hero-in">
          <div className="gs-hero-text">
            <span className="gs-kicker">{data.hero.kicker || t.welcome}</span>
            <h1>{data.hero.title || name}</h1>
            {data.hero.subtitle && <p>{data.hero.subtitle}</p>}
            <div className="gs-hero-btns">
              {has.book && (
                <button type="button" className="gs-btn" onClick={() => go("book")}>
                  {data.hero.button || t.bookNow} <ArrowRight size={17} />
                </button>
              )}
              {has.rooms && (
                <button type="button" className="gs-btn gs-btn-ghost" onClick={() => go("rooms")}>
                  {t.rooms}
                  {data.rooms.show_prices && lowest > 0 && (
                    <small>
                      {" "}
                      · {t.from} {money(lowest, cur)}
                    </small>
                  )}
                </button>
              )}
            </div>
            <div className="gs-times">
              <span>
                <Clock size={15} /> {t.checkInFrom.replace("{t}", data.check_in)}
              </span>
              <span>{t.checkOutBy.replace("{t}", data.check_out)}</span>
            </div>
          </div>
          {quick}
        </div>
      </section>

      {/* ---------- deals ---------- */}
      {data.promos?.length > 0 && data.rooms.show_prices && (
        <section id="gs-deals" className="gs-deals-sec">
          <div className="gs-wrap gs-deals">
            {data.promos.map((pr) => (
              <article key={pr._id} className="gs-dealcard">
                <span className="gs-deal-badge">{pr.badge || <BadgePercent size={22} />}</span>
                <div>
                  <b>{pr.name}</b>
                  <small>
                    {dealDay(pr.from, lang)} – {dealDay(pr.to, lang)}
                    {pr.note ? ` · ${pr.note}` : ""}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ---------- rooms ---------- */}
      {has.rooms && (
        <section id="gs-rooms" className="gs-sec gs-rooms-sec">
          <div className="gs-wrap">
            <div className="gs-head">
              <h2>{data.rooms.title || t.roomsTitle}</h2>
              <p>{data.rooms.subtitle || t.roomsSub}</p>
            </div>
            <div className="gs-rooms">{(compact ? rooms.slice(0, 3) : rooms).map(roomCard)}</div>
          </div>
        </section>
      )}

      {!compact && (
        <>
          {/* ---------- about ---------- */}
          {has.about && (
            <section id="gs-about" className={`gs-sec gs-about ${data.about.image ? "has-img" : ""}`}>
              <div className="gs-wrap gs-about-in">
                {data.about.image && (
                  <div className="gs-about-img">
                    <img src={data.about.image} alt="" loading="lazy" />
                  </div>
                )}
                <div className="gs-about-text">
                  <h2>{data.about.title || t.aboutTitle}</h2>
                  {String(data.about.text || "")
                    .split(/\n{2,}/)
                    .filter(Boolean)
                    .map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  {data.about.highlights.length > 0 && (
                    <div className="gs-highs">
                      {data.about.highlights.map((h, i) => (
                        <div key={i}>
                          <b>{h.value}</b>
                          <small>{h.label}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ---------- facilities ---------- */}
          {has.facilities && (
            <section id="gs-facilities" className="gs-sec gs-fac-sec">
              <div className="gs-wrap">
                <div className="gs-head">
                  <h2>{data.facilities.title || t.facilitiesTitle}</h2>
                </div>
                <ul className="gs-fac">
                  {data.facilities.keys.map((k) => {
                    const I = FAC_ICON[k] || Check;
                    return (
                      <li key={k}>
                        <span>
                          <I size={22} />
                        </span>
                        {t.fac[k] || k}
                      </li>
                    );
                  })}
                  {data.facilities.extra.map((x, i) => (
                    <li key={`x${i}`}>
                      <span>
                        <Check size={22} />
                      </span>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* ---------- photos ---------- */}
          {has.gallery && (
            <section id="gs-gallery" className="gs-sec gs-gal-sec">
              <div className="gs-wrap">
                <div className="gs-head">
                  <h2>{data.gallery.title || t.galleryTitle}</h2>
                </div>
                <div className="gs-gal">
                  {data.gallery.images.map((src, i) => (
                    <button key={src + i} type="button" onClick={() => setBox({ images: data.gallery.images, i })}>
                      <img src={src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ---------- guest reviews ---------- */}
          {has.reviews && (
            <section id="gs-reviews" className="gs-sec gs-rev-sec">
              <div className="gs-wrap">
                <div className="gs-head">
                  <h2>{t.reviewsTitle}</h2>
                  <div className="gs-rev-sum">
                    <b>{data.reviews.avg.toFixed(1)}</b>
                    <span className="gs-rev-stars" aria-label={`${data.reviews.avg} / 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={18} className={n <= Math.round(data.reviews.avg) ? "" : "off"} />
                      ))}
                    </span>
                    <span>{t.reviewsCount.replace("{n}", data.reviews.count)}</span>
                  </div>
                </div>
                <div className="gs-revs">
                  {data.reviews.items.map((r, i) => (
                    <article key={i} className="gs-rev">
                      <span className="gs-rev-stars">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={15} className={n <= r.rating ? "" : "off"} />
                        ))}
                      </span>
                      {r.text && <p>“{r.text}”</p>}
                      {r.reply && (
                        <blockquote>
                          <b>{t.replyFrom}:</b> {r.reply}
                        </blockquote>
                      )}
                      <footer>
                        <b>{r.name}</b>
                        <span>{r.at ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { month: "short", year: "numeric" }).format(new Date(r.at)) : ""}</span>
                      </footer>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ---------- booking request ---------- */}
          {has.book && (
            <section id="gs-book" className="gs-sec gs-book">
              <div className="gs-wrap gs-book-in">
                <div className="gs-book-info">
                  <h2>{data.booking.title || t.bookTitle}</h2>
                  <p>{data.booking.text || t.bookText}</p>
                  <ul className="gs-book-facts">
                    <li>
                      <Clock size={17} /> {t.checkInFrom.replace("{t}", data.check_in)} · {t.checkOutBy.replace("{t}", data.check_out)}
                    </li>
                    {C.phone && (
                      <li>
                        <Phone size={17} />{" "}
                        <a href={telHref(C.phone)} {...(preview ? ext : {})}>
                          {C.phone}
                        </a>
                      </li>
                    )}
                  </ul>
                  <div className="gs-book-quick">
                    {C.phone && (
                      <a className="gs-btn gs-btn-ghost" href={telHref(C.phone)} {...(preview ? ext : {})}>
                        <Phone size={16} /> {t.call}
                      </a>
                    )}
                    {C.telegram && (
                      <a className="gs-btn gs-btn-ghost" href={C.telegram} {...ext}>
                        <Send size={16} /> Telegram
                      </a>
                    )}
                    {C.whatsapp && (
                      <a className="gs-btn gs-btn-ghost" href={waHref(C.whatsapp)} {...ext}>
                        <MessageCircle size={16} /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
                {state === "sent" ? (
                  <div className="gs-form gs-sent">
                    <CheckCircle2 size={44} />
                    <h3>{t.sentTitle}</h3>
                    <p>{t.sentSub}</p>
                    <button
                      type="button"
                      className="gs-btn gs-btn-line"
                      onClick={() => {
                        setState("");
                        setForm((f) => ({ ...f, message: "" }));
                      }}
                    >
                      {t.another}
                    </button>
                  </div>
                ) : (
                  <form className="gs-form" onSubmit={submit}>
                    <div className="gs-row2">{dateFields("gs-f")}</div>
                    <div className="gs-row2">
                      <label className="gs-f">
                        <span>{t.roomType}</span>
                        <select value={form.type_id} onChange={(e) => setForm((f) => ({ ...f, type_id: e.target.value }))}>
                          <option value="">{t.anyRoom}</option>
                          {rooms.map((r) => {
                            const n = freeOf(r._id);
                            return (
                              <option key={r._id} value={r._id} disabled={n === 0}>
                                {r.name}
                                {data.rooms.show_prices ? ` · ${money(r.price, cur)}` : ""}
                                {n !== null ? ` · ${n ? t.freeN.replace("{n}", n) : t.full}` : ""}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <label className="gs-f">
                        <span>{t.guests}</span>
                        <input type="number" min={1} max={50} value={form.guests} onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))} />
                      </label>
                    </div>
                    <label className="gs-f">
                      <span>{t.name}</span>
                      <input required maxLength={80} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
                    </label>
                    <label className="gs-f">
                      <span>{t.contactField}</span>
                      <input required maxLength={100} value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} autoComplete="tel" />
                    </label>
                    <label className="gs-f">
                      <span>{t.message}</span>
                      <textarea rows={3} maxLength={1000} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
                    </label>
                    <input className="gs-hp" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} aria-hidden="true" />
                    {chosen && datesOk && data.rooms.show_prices && <p className="gs-est">{t.estimate.replace("{total}", money(stayTotal(data.promos, chosen, form.from, nights), cur)).replace("{n}", nights)}</p>}
                    {error && <p className="gs-err">{error}</p>}
                    <button type="submit" className="gs-btn gs-btn-big" disabled={state === "sending"}>
                      {state === "sending" ? t.sending : t.send}
                    </button>
                  </form>
                )}
              </div>
            </section>
          )}

          {/* ---------- contact + footer ---------- */}
          {has.contact && (
            <section id="gs-contact" className="gs-sec gs-contact">
              <div className="gs-wrap gs-contact-in">
                <div>
                  <h2>{C.title || t.contactTitle}</h2>
                  <ul className="gs-clist">
                    {C.address && (
                      <li>
                        <MapPin size={18} /> {C.address}
                      </li>
                    )}
                    {C.phone && (
                      <li>
                        <Phone size={18} />{" "}
                        <a href={telHref(C.phone)} {...(preview ? ext : {})}>
                          {C.phone}
                        </a>
                      </li>
                    )}
                    {C.email && (
                      <li>
                        <Mail size={18} />{" "}
                        <a href={`mailto:${C.email}`} {...(preview ? ext : {})}>
                          {C.email}
                        </a>
                      </li>
                    )}
                  </ul>
                  {C.map_url && (
                    <a className="gs-btn" href={C.map_url} {...ext}>
                      <Navigation size={16} /> {t.directions}
                    </a>
                  )}
                </div>
                {SOCIAL.some((k) => C[k]) && (
                  <div>
                    <h3>{t.follow}</h3>
                    <div className="gs-social">
                      {SOCIAL.filter((k) => C[k]).map((k) => (
                        <a key={k} href={C[k]} {...ext} aria-label={k}>
                          <BrandIcon name={k} size={20} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          <footer className="gs-foot">
            <div className="gs-wrap gs-foot-in">
              <span>
                © {new Date().getFullYear()} {name}. {data.footer_note || t.rights}
              </span>
              <a href="/" {...(preview ? ext : {})}>
                {t.made}
              </a>
            </div>
          </footer>
        </>
      )}

      {box && (
        <div className="gs-box" role="dialog" aria-modal="true" onClick={() => setBox(null)}>
          <button type="button" className="gs-box-x" aria-label={t.close} onClick={() => setBox(null)}>
            <X size={26} />
          </button>
          {box.images.length > 1 && (
            <button
              type="button"
              className="gs-box-nav prev"
              onClick={(e) => {
                e.stopPropagation();
                setBox((b) => ({ ...b, i: (b.i + b.images.length - 1) % b.images.length }));
              }}
            >
              <ChevronLeft size={30} />
            </button>
          )}
          <img src={box.images[box.i]} alt="" onClick={(e) => e.stopPropagation()} />
          {box.images.length > 1 && (
            <button
              type="button"
              className="gs-box-nav next"
              onClick={(e) => {
                e.stopPropagation();
                setBox((b) => ({ ...b, i: (b.i + 1) % b.images.length }));
              }}
            >
              <ChevronRight size={30} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// a small live picture of a look (owner's look picker): the 1200px wide page scaled to fit
export function GsThumb({ data, theme }) {
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
  const d = useMemo(() => ({ ...data, theme }), [data, theme]);
  return (
    <div className="gs-thumb" ref={ref}>
      <div className="gs-thumb-in" style={{ transform: `scale(${scale})` }} inert="">
        <GsView data={d} preview compact />
      </div>
    </div>
  );
}
