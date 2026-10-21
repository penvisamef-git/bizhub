import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  ArrowRight,
  Banknote,
  Check,
  Clock,
  ClipboardList,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Send,
  ShoppingBag,
  ShoppingBasket,
  Store,
  Trash2,
  Truck,
  Upload,
  User,
  Wallet,
  X,
  Gift,
  Tag,
} from "lucide-react";
import { MP_LOOKS, loadFonts, mpClass, mpVars } from "../looks";
import { MP_TEXT, msMoney, unitOf } from "../text";
import "./mportal.css";

// The customer's shop dashboard (pure: state in → screens out). Used by the real page and by the owner's look previews.
//   s   = { info, me, tab, cart, orders, busy, msg, error }
//   act = { setTab, setQty, clearCart, place, cancel, again, saveMe, savePass, logout }
const fmtDay = (d, lang) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(d)) : "");
const fmtDate = (d, lang) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d)) : "");
const initials = (s) =>
  String(s || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
const OPEN = ["new", "accepted", "ready", "delivering"];
const TONE = { new: "wait", accepted: "live", ready: "ok", delivering: "live", done: "done", declined: "bad", cancelled: "done" };
const TAB_ICON = { home: LayoutDashboard, shop: Store, cart: ShoppingBag, orders: ClipboardList, addresses: MapPin, profile: User };

// a password box with an eye to show / hide what was typed
function PassInput({ value, onChange, placeholder, autoComplete, minLength, required = true, label }) {
  const [show, setShow] = useState(false);
  return (
    <span className="mc-pass">
      <input required={required} type={show ? "text" : "password"} minLength={minLength} maxLength={100} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} aria-label={label || placeholder} />
      <button type="button" onClick={() => setShow((x) => !x)} aria-label={show ? "hide" : "show"} tabIndex={-1}>
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </span>
  );
}

export function MpAuth({ info, lang, mode, setMode, onSubmit, busy, error, langSwitch, siteHref }) {
  const t = MP_TEXT[lang] || MP_TEXT.en;
  const [f, setF] = useState({ name: "", email: "", phone: "", login: "", password: "", confirm: "", website: "" });
  const [mismatch, setMismatch] = useState(false);
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const join = mode === "register";
  const d = MP_LOOKS[info.theme] || MP_LOOKS.classic;
  useEffect(() => loadFonts([d.font]), [d.font]);
  return (
    <div className="mc mc-auth" style={mpVars(info.theme, info.color)}>
      <div className="mc-auth-art" style={info.cover ? { backgroundImage: `linear-gradient(160deg, rgb(0 0 0 / 30%), rgb(0 0 0 / 65%)), url("${info.cover}")` } : undefined}>
        <div className="mc-auth-art-in">
          <span className="mc-logo big">{info.business.logo ? <img src={info.business.logo} alt="" /> : <ShoppingBasket size={30} />}</span>
          <b>{info.business.name}</b>
          <div className="mc-auth-chips">
            {info.rules?.pickup && (
              <span>
                <Store size={14} /> {t.pickup}
              </span>
            )}
            {info.rules?.delivery && (
              <span>
                <Truck size={14} /> {t.delivery}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mc-auth-side">
        <div className="mc-auth-top">
          {siteHref && (
            <a className="mc-link" href={siteHref}>
              <ArrowLeft size={16} /> {t.backSite}
            </a>
          )}
          {langSwitch}
        </div>
        <form
          className="mc-auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (join && f.password !== f.confirm) return setMismatch(true);
            setMismatch(false);
            onSubmit(f);
          }}
        >
          <h1>{join ? t.join : t.welcomeBack}</h1>
          <p className="mc-muted">{join ? t.joinSub : t.loginSub}</p>
          {join ? (
            <>
              <label className="mc-f">
                <span>{t.fullName}</span>
                <input required maxLength={80} value={f.name} onChange={up("name")} autoComplete="name" />
              </label>
              <label className="mc-f">
                <span>{t.email}</span>
                <input required type="email" maxLength={120} value={f.email} onChange={up("email")} autoComplete="email" placeholder="you@mail.com" />
              </label>
              <label className="mc-f">
                <span>{t.phone}</span>
                <input required type="tel" inputMode="tel" maxLength={30} value={f.phone} onChange={up("phone")} autoComplete="tel" placeholder="012 345 678" />
                <small className="mc-muted">{t.phoneHint}</small>
              </label>
            </>
          ) : (
            <label className="mc-f">
              <span>{t.emailOrPhone}</span>
              <input required maxLength={120} value={f.login} onChange={up("login")} autoComplete="username" placeholder="you@mail.com · 012 345 678" />
            </label>
          )}
          <label className="mc-f">
            <span>{t.password}</span>
            <PassInput minLength={6} value={f.password} onChange={up("password")} autoComplete={join ? "new-password" : "current-password"} label={t.password} />
            {join && <small className="mc-muted">{t.passHint}</small>}
          </label>
          {join && (
            <label className="mc-f">
              <span>{t.confirm}</span>
              <PassInput minLength={6} value={f.confirm} onChange={up("confirm")} autoComplete="new-password" label={t.confirm} />
            </label>
          )}
          <input className="mc-hp" tabIndex={-1} autoComplete="off" value={f.website} onChange={up("website")} aria-hidden="true" />
          {(mismatch || error) && <div className="mc-error">{mismatch ? t.noMatch : error}</div>}
          <button type="submit" className="mc-btn wide" disabled={busy}>
            {busy ? "…" : join ? t.signUp : t.signIn}
          </button>
          <p className="mc-switch">
            {join ? t.haveAccount : t.noAccount}{" "}
            <button type="button" onClick={() => setMode(join ? "login" : "register")}>
              {join ? t.signIn : t.signUp}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function MpView({ s, act, lang = "en", langSwitch = null, siteHref = "", preview = false }) {
  const t = MP_TEXT[lang] || MP_TEXT.en;
  const { info, tab, cart, orders } = s;
  const d = MP_LOOKS[info.theme] || MP_LOOKS.classic;
  useEffect(() => loadFonts([d.font]), [d.font]);
  const cur = info.currency;
  const count = Object.values(cart).reduce((a, n) => a + n, 0);
  const open = orders.filter((o) => OPEN.includes(o.status)).length;
  const tabs = ["home", "shop", "cart", "orders", "addresses", "profile"];
  const badge = { cart: count, orders: open };
  const navItems = tabs.map((k) => {
    const Icon = TAB_ICON[k];
    return (
      <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => act.setTab(k)} aria-current={tab === k ? "page" : undefined} title={t.tabs[k]}>
        <Icon size={19} />
        <span>{t.tabs[k]}</span>
        {badge[k] > 0 && <em>{badge[k]}</em>}
      </button>
    );
  });
  return (
    <div className={`mc ${mpClass(info.theme)} ${preview ? "preview" : ""}`} style={{ ...mpVars(info.theme, info.color), ...(info.cover ? { "--mp-cover": `url("${info.cover}")` } : {}) }}>
      <aside className="mc-nav">
        <div className="mc-brand">
          <span className="mc-logo">{info.business.logo ? <img src={info.business.logo} alt="" /> : <ShoppingBasket size={20} />}</span>
          <b>{info.business.name}</b>
        </div>
        <nav className="mc-tabs">{navItems}</nav>
        <div className="mc-nav-foot">
          <button type="button" className="mc-user" onClick={() => act.setTab("profile")} title={s.me?.name}>
            <span className="mc-avatar sm">{s.me?.avatar ? <img src={s.me.avatar} alt="" /> : initials(s.me?.name)}</span>
            <span>{s.me?.name}</span>
          </button>
          {langSwitch}
          {siteHref && (
            <a className="mc-nav-link" href={preview ? "#" : siteHref}>
              <ArrowLeft size={16} /> <span>{t.backSite}</span>
            </a>
          )}
          <button type="button" className="mc-nav-link" onClick={act.logout}>
            <LogOut size={16} /> <span>{t.logout}</span>
          </button>
        </div>
      </aside>
      <main className="mc-main">
        {s.msg && (
          <div className="mc-flash ok">
            <Check size={17} /> {s.msg}
          </div>
        )}
        {s.error && tab !== "cart" && <div className="mc-flash bad">{s.error}</div>}
        {tab === "home" && <HomeTab s={s} act={act} t={t} lang={lang} cur={cur} count={count} />}
        {tab === "shop" && <ShopTab s={s} act={act} t={t} lang={lang} cur={cur} open={open} count={count} />}
        {tab === "cart" && <CartTab s={s} act={act} t={t} lang={lang} cur={cur} />}
        {tab === "orders" && <OrdersTab s={s} act={act} t={t} lang={lang} cur={cur} />}
        {tab === "addresses" && <AddressesTab s={s} act={act} t={t} />}
        {tab === "profile" && <ProfileTab s={s} act={act} t={t} lang={lang} />}
      </main>
      <nav className="mc-bottom">{navItems.filter((_, i) => tabs[i] !== "addresses")}</nav>
      {tab === "shop" && count > 0 && (
        <button type="button" className="mc-cartbar" onClick={() => act.setTab("cart")}>
          <ShoppingBag size={18} />
          <span>
            {count} ·{" "}
            <b>
              {msMoney(
                Object.entries(cart).reduce((a, [id, n]) => a + (info.products.find((p) => p._id === id)?.price || 0) * n, 0),
                cur,
              )}
            </b>
          </span>
          <em>{t.tabs.cart}</em>
        </button>
      )}
    </div>
  );
}

function Stepper({ n, onSet, max }) {
  const full = max !== undefined && n >= max;
  return (
    <span className={`mc-step ${full ? "full" : ""}`}>
      <button type="button" onClick={() => onSet(n - 1)} aria-label="-">
        {n === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
      </button>
      <b>{n}</b>
      <button type="button" onClick={() => onSet(n + 1)} aria-label="+" disabled={full} title={full ? `max ${max}` : undefined}>
        <Plus size={14} />
      </button>
    </span>
  );
}

// the first screen after sign-in: what is going on with my orders, quick ways to go, the shop's details
function HomeTab({ s, act, t, lang, cur, count }) {
  const { info, me, orders } = s;
  const openList = orders.filter((o) => OPEN.includes(o.status));
  const done = orders.filter((o) => o.status === "done");
  const spent = done.reduce((a, o) => a + o.total, 0);
  const live = openList[0];
  const R = info.rules;
  const recent = orders.filter((o) => !OPEN.includes(o.status)).slice(0, 3);
  const tiles = [
    ["shop", Store, t.tabs.shop, t.homeShopSub],
    ["cart", ShoppingBag, t.tabs.cart, count ? t.homeCartSub.replace("{n}", count) : t.homeCartEmpty],
    ["orders", ClipboardList, t.tabs.orders, t.homeOrdersSub.replace("{n}", orders.length)],
    ["addresses", MapPin, t.tabs.addresses, t.homeAddrSub.replace("{n}", (me?.addresses || []).length)],
  ];
  return (
    <div className="mc-home">
      <section className="mc-hello">
        <div>
          <small className="mc-hello-kicker">{info.business.name}</small>
          <h1>{t.hi.replace("{name}", (me?.name || "").split(" ")[0])}</h1>
          <p>{openList.length ? t.openOrders.replace("{n}", openList.length) : t.hiSub}</p>
        </div>
        <div className="mc-hello-btns">
          <button type="button" className="mc-pill solid" onClick={() => act.setTab("shop")}>
            <Store size={16} /> {t.startShop}
          </button>
          {count > 0 && (
            <button type="button" className="mc-pill" onClick={() => act.setTab("cart")}>
              <ShoppingBag size={16} /> {t.tabs.cart} · {count}
            </button>
          )}
        </div>
      </section>
      <div className="mc-stats">
        <div className="mc-stat">
          <span className="mc-stat-ic">
            <Truck size={18} />
          </span>
          <b>{openList.length}</b>
          <small>{t.statOpen}</small>
        </div>
        <div className="mc-stat">
          <span className="mc-stat-ic">
            <PackageCheck size={18} />
          </span>
          <b>{done.length}</b>
          <small>{t.statDone}</small>
        </div>
        <div className="mc-stat">
          <span className="mc-stat-ic">
            <Wallet size={18} />
          </span>
          <b>{msMoney(spent, cur)}</b>
          <small>{t.statSpent}</small>
        </div>
        {me?.loyalty && (
          <div className="mc-stat">
            <span className="mc-stat-ic">
              <Gift size={18} />
            </span>
            <b data-testid="mc-mypoints">{Math.floor(me.loyalty.points)}</b>
            <small>{t.myPoints}</small>
          </div>
        )}
      </div>
      {info.promos?.length > 0 && (
        <section className="mc-card mc-deals">
          <h2>{t.deals}</h2>
          <div className="mc-deal-list">
            {info.promos.map((d) => (
              <span key={d._id}>
                <Tag size={14} /> {d.name}
              </span>
            ))}
          </div>
        </section>
      )}
      <div className="mc-home-grid">
        <div className="mc-col">
          <section className="mc-card">
            <div className="mc-card-head">
              <h2>{t.nowTitle}</h2>
              {live && (
                <button type="button" className="mc-link-btn" onClick={() => act.setTab("orders")}>
                  {t.seeAll} <ArrowRight size={14} />
                </button>
              )}
            </div>
            {live ? (
              <div className="mc-now">
                <div className="mc-order-head">
                  <span>
                    <b>{live.no}</b>
                    <small className="mc-muted">{fmtDay(live.created_date, lang)}</small>
                  </span>
                  <em className={`mc-status ${TONE[live.status]}`}>{t.status[live.status]}</em>
                </div>
                <Tracker o={live} t={t} />
                <p className="mc-muted mc-now-items">
                  {live.items.map((x) => `${x.qty}× ${x.name}`).join(" · ")} — <b>{msMoney(live.total, cur)}</b>
                </p>
              </div>
            ) : (
              <div className="mc-now-empty">
                <PackageCheck size={30} />
                <p className="mc-muted">{t.nothingNow}</p>
                <button type="button" className="mc-btn sm" onClick={() => act.setTab("shop")}>
                  {t.startShop}
                </button>
              </div>
            )}
          </section>
          <div className="mc-tiles">
            {tiles.map(([k, Icon, label, sub]) => (
              <button key={k} type="button" className="mc-tile" onClick={() => act.setTab(k)}>
                <span className="mc-tile-ic">
                  <Icon size={20} />
                </span>
                <b>{label}</b>
                <small className="mc-muted">{sub}</small>
              </button>
            ))}
          </div>
          {recent.length > 0 && (
            <section className="mc-card">
              <h2>{t.recent}</h2>
              <div className="mc-recent">
                {recent.map((o) => (
                  <div key={o._id} className="mc-recent-row">
                    <span>
                      <b>{o.no}</b>
                      <small className="mc-muted">
                        {fmtDay(o.created_date, lang)} · {t.status[o.status]}
                      </small>
                    </span>
                    <b>{msMoney(o.total, cur)}</b>
                    <button type="button" className="mc-btn ghost sm" onClick={() => act.again(o)}>
                      <RotateCcw size={13} /> {t.again}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <section className="mc-card mc-shopcard">
          <div className="mc-shopcard-top" style={info.cover ? { backgroundImage: `url("${info.cover}")` } : undefined}>
            <span className="mc-logo big">{info.business.logo ? <img src={info.business.logo} alt="" /> : <ShoppingBasket size={26} />}</span>
          </div>
          <h2>{info.business.name}</h2>
          <ul className="mc-info-list">
            {info.hours && (
              <li>
                <Clock size={16} /> {info.hours}
              </li>
            )}
            {info.business.address && (
              <li>
                <MapPin size={16} /> {info.business.address}
              </li>
            )}
            {R.pickup && (
              <li>
                <Store size={16} /> {t.pickup}
              </li>
            )}
            {R.delivery && (
              <li>
                <Truck size={16} /> {t.delivery} · {R.delivery_fee > 0 ? msMoney(R.delivery_fee, cur) : t.free}
              </li>
            )}
            {R.min_order > 0 && (
              <li>
                <ShoppingBag size={16} /> {t.minShort.replace("{amt}", msMoney(R.min_order, cur))}
              </li>
            )}
            <li>
              {R.pay.qr ? <QrCode size={16} /> : <Banknote size={16} />} {[R.pay.cash && t.cash, R.pay.qr && t.qr].filter(Boolean).join(" · ")}
            </li>
          </ul>
          {R.note && <p className="mc-shopnote">{R.note}</p>}
          <div className="mc-shop-btns">
            {info.business.phone && (
              <a className="mc-btn sm" href={`tel:${info.business.phone.replace(/[^\d+]/g, "")}`}>
                <Phone size={14} /> {t.call}
              </a>
            )}
            {info.telegram && (
              <a className="mc-btn ghost sm" href={/^https?:/i.test(info.telegram) ? info.telegram : `https://t.me/${info.telegram.replace(/^@/, "")}`} target="_blank" rel="noreferrer">
                <Send size={14} /> Telegram
              </a>
            )}
            {info.map_url && (
              <a className="mc-btn ghost sm" href={info.map_url} target="_blank" rel="noreferrer">
                <MapPin size={14} /> {t.map}
              </a>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ShopTab({ s, act, t, lang, cur, count }) {
  const { info, cart } = s;
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const x = q.trim().toLowerCase();
    return info.products.filter((p) => (cat === "all" || String(p.category_id) === cat) && (!x || p.name.toLowerCase().includes(x)));
  }, [info.products, cat, q]);
  return (
    <>
      <div className="mc-page-head">
        <h1>{t.tabs.shop}</h1>
        <span className="mc-muted">{t.shopSub.replace("{n}", info.products.length)}</span>
        {count > 0 && (
          <button type="button" className="mc-btn sm" onClick={() => act.setTab("cart")}>
            <ShoppingBag size={15} /> {t.tabs.cart} · {count}
          </button>
        )}
      </div>
      <div className="mc-shop-bar">
        <label className="mc-search">
          <Search size={17} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="clear">
              <X size={15} />
            </button>
          )}
        </label>
      </div>
      {info.categories.length > 1 && (
        <div className="mc-cats">
          <button type="button" className={cat === "all" ? "on" : ""} onClick={() => setCat("all")}>
            {t.all}
          </button>
          {info.categories.map((c) => (
            <button key={c._id} type="button" className={cat === String(c._id) ? "on" : ""} onClick={() => setCat(String(c._id))}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      {!list.length ? (
        <p className="mc-empty">{t.noResults}</p>
      ) : (
        <div className="mc-grid">
          {list.map((p) => {
            const n = cart[p._id] || 0;
            return (
              <article key={p._id} className={`mc-p ${p.soldout ? "out" : ""} ${n ? "in" : ""}`}>
                <div className="mc-p-pic">
                  {p.photo ? <img src={p.photo} alt="" loading="lazy" /> : <span>{initials(p.name)}</span>}
                  {p.soldout ? <em className="mc-badge out">{t.soldout}</em> : p.left ? <em className="mc-badge">{t.left.replace("{n}", p.left)}</em> : null}
                </div>
                <b className="mc-p-name">{p.name}</b>
                <small className="mc-muted">{unitOf(p, lang)}</small>
                <div className="mc-p-foot">
                  <span className="mc-price">{msMoney(p.price, cur)}</span>
                  {!p.soldout &&
                    (n ? (
                      <Stepper n={n} max={p.stock} onSet={(v) => act.setQty(p._id, v)} />
                    ) : (
                      <button type="button" className="mc-add" onClick={() => act.setQty(p._id, 1)} aria-label={t.add}>
                        <Plus size={17} />
                      </button>
                    ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function CartTab({ s, act, t, lang, cur }) {
  const { info, me, cart } = s;
  const R = info.rules;
  const lines = Object.entries(cart)
    .map(([id, n]) => ({ p: info.products.find((x) => x._id === id), n }))
    .filter((x) => x.p);
  const [fulfil, setFulfil] = useState(R.pickup ? "pickup" : "delivery");
  const saved = me?.addresses || [];
  const [addrIdx, setAddrIdx] = useState(saved.length ? 0 : -1); // -1 = a new address
  const [addr, setAddr] = useState({ address: "", note: "", map: "" });
  const [pay, setPay] = useState(R.pay.cash ? "cash" : "qr");
  const [proof, setProof] = useState(null);
  const [proofUrl, setProofUrl] = useState("");
  const [note, setNote] = useState("");
  const pick = useRef(null);
  useEffect(() => () => proofUrl && URL.revokeObjectURL(proofUrl), [proofUrl]);
  // delivery zones (mart_delivery), coupon (mart_promos), points (mart_loyalty): the shop works out the price (quote)
  const zones = R.zones || [];
  const [zone, setZone] = useState("");
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState("");
  const [usePts, setUsePts] = useState("");
  const [quote, setQuote] = useState(null);
  const loy = me?.loyalty || null;
  const items = lines.map(({ p, n }) => ({ product_id: p._id, qty: n }));
  const itemsKey = JSON.stringify(items);
  useEffect(() => {
    if (!act.quote || !lines.length) return undefined;
    const tm = setTimeout(() => {
      act
        .quote({ items, fulfil, zone, coupon, points: Number(usePts) || 0 })
        .then(setQuote)
        .catch(() => setQuote(null));
    }, 250);
    return () => clearTimeout(tm);
  }, [itemsKey, fulfil, zone, coupon, usePts]); // eslint-disable-line react-hooks/exhaustive-deps
  const subtotal = lines.reduce((a, x) => a + x.p.price * x.n, 0);
  const zoneRow = zones.find((z) => z.key === zone);
  const fee = fulfil === "delivery" ? (quote ? quote.delivery_fee : zoneRow ? zoneRow.fee : R.delivery_fee) : 0;
  const total = quote ? quote.total : subtotal + fee;
  const short = R.min_order > 0 && subtotal < R.min_order ? R.min_order - subtotal : 0;
  const zoneShort = fulfil === "delivery" && zoneRow?.min_order > 0 && subtotal < zoneRow.min_order ? zoneRow.min_order - subtotal : 0;
  const a = addrIdx >= 0 ? saved[addrIdx] : addr;
  const ptsBad = (Number(usePts) || 0) > 0 && quote?.errors?.some((e) => e.code === "not_enough" || e.code === "min_redeem");
  const ready = lines.length && !short && !zoneShort && !ptsBad && (fulfil === "pickup" || ((a?.address || "").trim() && (!zones.length || zone))) && (pay === "cash" || proof);

  if (!lines.length)
    return (
      <section className="mc-card mc-center">
        <ShoppingBag size={40} />
        <p>{t.cartEmpty}</p>
        <button type="button" className="mc-btn" onClick={() => act.setTab("shop")}>
          {t.goShop}
        </button>
      </section>
    );
  return (
    <div className="mc-checkout">
      <div className="mc-col">
        <section className="mc-card">
          <h2>{t.tabs.cart}</h2>
          <div className="mc-lines">
            {lines.map(({ p, n }) => (
              <div key={p._id} className="mc-line">
                <span className="mc-line-pic">{p.photo ? <img src={p.photo} alt="" /> : initials(p.name)}</span>
                <span className="mc-line-text">
                  <b>{p.name}</b>
                  <small className="mc-muted">
                    {msMoney(p.price, cur)} {unitOf(p, lang) ? `/ ${unitOf(p, lang)}` : ""}
                  </small>
                </span>
                <Stepper n={n} max={p.stock} onSet={(v) => act.setQty(p._id, v)} />
                <b className="mc-line-total">{msMoney(p.price * n, cur)}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="mc-card">
          <h2>{t.howGet}</h2>
          <div className="mc-opts">
            {R.pickup && (
              <button type="button" className={`mc-opt ${fulfil === "pickup" ? "on" : ""}`} onClick={() => setFulfil("pickup")}>
                <Store size={22} />
                <b>{t.pickup}</b>
                <small>{t.pickupSub}</small>
              </button>
            )}
            {R.delivery && (
              <button type="button" className={`mc-opt ${fulfil === "delivery" ? "on" : ""}`} onClick={() => setFulfil("delivery")}>
                <Truck size={22} />
                <b>{t.delivery}</b>
                <small>{t.deliverySub.replace("{fee}", zones.length ? `${msMoney(Math.min(...zones.map((z) => z.fee)), cur)}+` : R.delivery_fee > 0 ? msMoney(R.delivery_fee, cur) : t.free)}</small>
              </button>
            )}
          </div>
          {fulfil === "delivery" && (
            <div className="mc-addr">
              <b className="mc-label">{t.deliverTo}</b>
              {saved.map((x, i) => (
                <label key={i} className={`mc-radio ${addrIdx === i ? "on" : ""}`}>
                  <input type="radio" name="addr" checked={addrIdx === i} onChange={() => setAddrIdx(i)} />
                  <MapPin size={16} />
                  <span>
                    {x.label && <b>{x.label}</b>}
                    <small>{x.address}</small>
                  </span>
                </label>
              ))}
              {saved.length > 0 && (
                <label className={`mc-radio ${addrIdx === -1 ? "on" : ""}`}>
                  <input type="radio" name="addr" checked={addrIdx === -1} onChange={() => setAddrIdx(-1)} />
                  <Plus size={16} />
                  <span>
                    <b>{t.newAddress}</b>
                  </span>
                </label>
              )}
              {zones.length > 0 && (
                <div className="mc-zones">
                  <b className="mc-label">{t.zone}</b>
                  <div className="mc-zone-list">
                    {zones.map((z) => (
                      <button key={z.key} type="button" className={`mc-zone ${zone === z.key ? "on" : ""}`} onClick={() => setZone(z.key)} data-testid="mc-zone">
                        <b>{z.name}</b>
                        <small>
                          {z.fee > 0 ? msMoney(z.fee, cur) : t.free}
                          {z.eta ? ` · ${z.eta}` : ""}
                          {z.min_order > 0 ? ` · ${t.zoneMin.replace("{amt}", msMoney(z.min_order, cur))}` : ""}
                        </small>
                      </button>
                    ))}
                  </div>
                  {!zone && <small className="mc-need">{t.pickZone}</small>}
                </div>
              )}
              {addrIdx === -1 && (
                <div className="mc-fields">
                  <textarea rows={2} maxLength={300} value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} placeholder={t.addressPh} aria-label={t.newAddress} />
                  <input maxLength={200} value={addr.note} onChange={(e) => setAddr({ ...addr, note: e.target.value })} placeholder={t.addressNote} />
                  <input maxLength={300} value={addr.map} onChange={(e) => setAddr({ ...addr, map: e.target.value })} placeholder={t.mapLink} />
                </div>
              )}
            </div>
          )}
        </section>
        <section className="mc-card">
          <h2>{t.pay}</h2>
          <div className="mc-opts">
            {R.pay.cash && (
              <button type="button" className={`mc-opt ${pay === "cash" ? "on" : ""}`} onClick={() => setPay("cash")}>
                <Banknote size={22} />
                <b>{t.cash}</b>
                <small>{fulfil === "delivery" ? t.cashDelivery : t.cashPickup}</small>
              </button>
            )}
            {R.pay.qr && (
              <button type="button" className={`mc-opt ${pay === "qr" ? "on" : ""}`} onClick={() => setPay("qr")}>
                <QrCode size={22} />
                <b>{t.qr}</b>
                <small>{t.qrSub}</small>
              </button>
            )}
          </div>
          {pay === "qr" && (
            <div className="mc-qr">
              <div className="mc-qr-pic">
                <img src={R.pay.qr_image} alt="QR" />
                <a className="mc-btn ghost sm" href={R.pay.qr_image} download="payment-qr" target="_blank" rel="noreferrer">
                  <Download size={14} /> {t.saveQr}
                </a>
              </div>
              <div>
                <b className="mc-qr-amt">{t.scan.replace("{amt}", msMoney(total, cur))}</b>
                {R.pay.qr_label && <small className="mc-muted">{R.pay.qr_label}</small>}
                <ol className="mc-qr-steps">
                  <li>{t.qrStep1}</li>
                  <li>{t.qrStep2.replace("{amt}", msMoney(total, cur))}</li>
                  <li>{t.qrStep3}</li>
                </ol>
                <button type="button" className={`mc-proof ${proof ? "has" : ""}`} onClick={() => pick.current?.click()}>
                  {proofUrl ? <img src={proofUrl} alt="" /> : <Upload size={20} />}
                  <span>{proof ? proof.name : t.addProof}</span>
                </button>
                {!proof && <small className="mc-need">{t.proofNeed}</small>}
                <input
                  ref={pick}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setProof(file);
                    setProofUrl(URL.createObjectURL(file));
                  }}
                />
              </div>
            </div>
          )}
          <label className="mc-f" style={{ marginTop: 14 }}>
            <span>{t.note}</span>
            <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </section>
      </div>
      <aside className="mc-sum">
        <section className="mc-card">
          <div className="mc-sum-row">
            <span>{t.subtotal}</span>
            <b>{msMoney(subtotal, cur)}</b>
          </div>
          {(quote?.promos || []).map((x) => (
            <div key={x.id || x.name} className="mc-sum-row promo">
              <span>🏷 {x.name}</span>
              <b>−{msMoney(x.amount, cur)}</b>
            </div>
          ))}
          {quote?.points_value > 0 && (
            <div className="mc-sum-row promo">
              <span>
                🎁 {t.pointsOff} ({quote.points_used})
              </span>
              <b>−{msMoney(quote.points_value, cur)}</b>
            </div>
          )}
          {fulfil === "delivery" && (
            <div className="mc-sum-row">
              <span>
                {t.deliveryFee}
                {zoneRow ? ` · ${zoneRow.name}` : ""}
              </span>
              <b>{fee > 0 ? msMoney(fee, cur) : t.free}</b>
            </div>
          )}
          <div className="mc-sum-row total">
            <span>{t.total}</span>
            <b data-testid="mc-total">{msMoney(total, cur)}</b>
          </div>
          {R.coupons && (
            <div className="mc-coupon">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t.couponPh} aria-label={t.coupon} maxLength={20} data-testid="mc-coupon" />
              <button type="button" className="mc-btn ghost sm" onClick={() => setCoupon(code.trim())} disabled={!code.trim() && !coupon}>
                {t.apply}
              </button>
            </div>
          )}
          {coupon &&
            quote &&
            (quote.coupon === "ok" ? (
              <small className="mc-ok">
                ✓ {t.couponOk}: {coupon}
              </small>
            ) : (
              <small className="mc-need">{quote.coupon_message}</small>
            ))}
          {loy && (
            <div className="mc-points">
              <small>{t.pointsHave.replace("{n}", Math.floor(loy.points)).replace("{amt}", msMoney(loy.points * loy.point_value, cur))}</small>
              {loy.points >= loy.min_redeem && loy.point_value > 0 && (
                <label>
                  <span>
                    {t.usePoints} <small className="mc-muted">({t.pointsMin.replace("{n}", loy.min_redeem)})</small>
                  </span>
                  <input type="number" min="0" max={Math.floor(loy.points)} value={usePts} onChange={(e) => setUsePts(e.target.value)} data-testid="mc-points" />
                </label>
              )}
              {ptsBad && <small className="mc-need">{quote.errors.find((e) => e.code === "not_enough" || e.code === "min_redeem")?.message}</small>}
              {quote?.earn > 0 && <small className="mc-ok">{t.willEarn.replace("{n}", quote.earn)}</small>}
            </div>
          )}
          {short > 0 && <p className="mc-warn">{t.minOrder.replace("{amt}", msMoney(short, cur)).replace("{min}", msMoney(R.min_order, cur))}</p>}
          {zoneShort > 0 && <p className="mc-warn">{t.zoneMin.replace("{amt}", msMoney(zoneRow.min_order, cur))}</p>}
          {R.note && (
            <p className="mc-shopnote">
              <b>{t.shopNote}:</b> {R.note}
            </p>
          )}
          {s.error && <div className="mc-error">{s.error}</div>}
          <button
            type="button"
            className="mc-btn wide"
            disabled={!ready || s.busy === "place"}
            onClick={() =>
              act.place({
                items: lines.map(({ p, n }) => ({ product_id: p._id, qty: n })),
                fulfil,
                address: fulfil === "delivery" ? a.address : "",
                address_note: fulfil === "delivery" ? a.note || "" : "",
                map: fulfil === "delivery" ? a.map || "" : "",
                note,
                pay_method: pay,
                proof: pay === "qr" ? proof : null,
                ...(fulfil === "delivery" && zone ? { zone } : {}),
                ...(coupon && quote?.coupon === "ok" ? { coupon } : {}),
                ...(Number(usePts) > 0 ? { points: Number(usePts) } : {}),
              })
            }
          >
            {s.busy === "place" ? t.placing : t.place.replace("{amt}", msMoney(total, cur))}
          </button>
        </section>
      </aside>
    </div>
  );
}

function Tracker({ o, t }) {
  if (o.status === "declined" || o.status === "cancelled") return null;
  const mid = o.fulfil === "delivery" ? "delivering" : "ready";
  const steps = ["placed", "accepted", mid, "done"];
  const at = { new: 0, accepted: 1, ready: 2, delivering: 2, done: 3 }[o.status] ?? 0;
  return (
    <ol className="mc-track">
      {steps.map((k, i) => (
        <li key={k} className={i < at ? "done" : i === at ? "now" : ""}>
          <i>{i < at || o.status === "done" ? <Check size={13} /> : i + 1}</i>
          <span>{t.steps[k]}</span>
        </li>
      ))}
    </ol>
  );
}

function OrdersTab({ s, act, t, lang, cur }) {
  const [sure, setSure] = useState("");
  if (!s.orders.length)
    return (
      <section className="mc-card mc-center">
        <PackageCheck size={40} />
        <p>{t.noOrders}</p>
        <button type="button" className="mc-btn" onClick={() => act.setTab("shop")}>
          {t.goShop}
        </button>
      </section>
    );
  return (
    <div className="mc-orders">
      {s.orders.map((o) => (
        <article key={o._id} className={`mc-card mc-order s-${o.status}`}>
          <div className="mc-order-head">
            <span>
              <b>{o.no}</b>
              <small className="mc-muted">{fmtDay(o.created_date, lang)}</small>
            </span>
            <em className={`mc-status ${TONE[o.status]}`}>{t.status[o.status]}</em>
          </div>
          <Tracker o={o} t={t} />
          {o.reason && <p className="mc-reason">{t.reason.replace("{r}", o.reason)}</p>}
          <div className="mc-order-items">
            {o.items.map((x, i) => (
              <span key={i} className="mc-oi">
                <span className="mc-oi-pic">{x.photo ? <img src={x.photo} alt="" /> : initials(x.name)}</span>
                <span>
                  {x.qty}× {x.name}
                </span>
                <b>{msMoney(x.total, cur)}</b>
              </span>
            ))}
          </div>
          <div className="mc-order-foot">
            <span className="mc-tags">
              <span>
                {o.fulfil === "delivery" ? <Truck size={14} /> : <Store size={14} />} {o.fulfil === "delivery" ? t.delivery : t.pickup}
              </span>
              <span>
                {o.pay_method === "qr" ? <QrCode size={14} /> : <Banknote size={14} />} {o.pay_method === "qr" ? t.paidQr : t.payCash}
              </span>
              {o.fulfil === "delivery" && o.address?.address && (
                <span className="mc-tag-addr">
                  <MapPin size={14} /> {o.address.address}
                </span>
              )}
            </span>
            <b className="mc-order-total">
              {o.delivery_fee > 0 && <small className="mc-muted">+{msMoney(o.delivery_fee, cur)} · </small>}
              {msMoney(o.total, cur)}
            </b>
          </div>
          <div className="mc-order-act">
            {o.status === "new" &&
              (sure === o._id ? (
                <>
                  <span className="mc-muted">{t.cancelSure}</span>
                  <button type="button" className="mc-btn danger sm" onClick={() => act.cancel(o._id).then(() => setSure(""))}>
                    {t.cancel}
                  </button>
                  <button type="button" className="mc-btn ghost sm" onClick={() => setSure("")}>
                    <X size={14} />
                  </button>
                </>
              ) : (
                <button type="button" className="mc-btn ghost sm" onClick={() => setSure(o._id)}>
                  <X size={14} /> {t.cancel}
                </button>
              ))}
            {!OPEN.includes(o.status) && (
              <button type="button" className="mc-btn ghost sm" onClick={() => act.again(o)}>
                <RotateCcw size={14} /> {t.again}
              </button>
            )}
            {s.info.business.phone && OPEN.includes(o.status) && (
              <a className="mc-btn ghost sm" href={`tel:${s.info.business.phone.replace(/[^\d+]/g, "")}`}>
                <Phone size={14} /> {t.call}
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function AddressesTab({ s, act, t }) {
  const [list, setList] = useState(() => (s.me?.addresses || []).map((x) => ({ ...x })));
  const [busy, setBusy] = useState(false);
  const set = (i, k, v) => setList((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <section className="mc-card">
      <h2>{t.addresses}</h2>
      <p className="mc-muted" style={{ margin: "4px 0 14px" }}>
        {t.addressesSub}
      </p>
      <div className="mc-addr-list">
        {list.map((x, i) => (
          <div key={i} className="mc-addr-edit">
            <input maxLength={40} value={x.label} onChange={(e) => set(i, "label", e.target.value)} placeholder={t.label} />
            <textarea rows={2} maxLength={300} value={x.address} onChange={(e) => set(i, "address", e.target.value)} placeholder={t.addressPh} />
            <input maxLength={200} value={x.note} onChange={(e) => set(i, "note", e.target.value)} placeholder={t.addressNote} />
            <input maxLength={300} value={x.map} onChange={(e) => set(i, "map", e.target.value)} placeholder={t.mapLink} />
            <button type="button" className="mc-btn ghost sm" onClick={() => setList((l) => l.filter((_, j) => j !== i))}>
              <Trash2 size={14} /> {t.remove}
            </button>
          </div>
        ))}
      </div>
      <div className="mc-row">
        {list.length < 5 && (
          <button type="button" className="mc-btn ghost" onClick={() => setList((l) => [...l, { label: "", address: "", note: "", map: "" }])}>
            <Plus size={16} /> {t.addAddress}
          </button>
        )}
        <button
          type="button"
          className="mc-btn"
          disabled={busy || list.some((x) => !x.address.trim())}
          onClick={async () => {
            setBusy(true);
            await act.saveMe({ addresses: list });
            setBusy(false);
          }}
        >
          {t.save}
        </button>
      </div>
    </section>
  );
}

// the customer's photo: tap to add / change, × to remove
function AvatarPick({ s, act, t }) {
  const pick = useRef(null);
  const [busy, setBusy] = useState(false);
  const url = s.me?.avatar || "";
  return (
    <span className="mc-ava-pick">
      <button type="button" className="mc-avatar big" onClick={() => pick.current?.click()} disabled={busy} title={url ? t.photoChange : t.photoAdd} aria-label={url ? t.photoChange : t.photoAdd}>
        {url ? <img src={url} alt="" /> : initials(s.me?.name)}
        <i className="mc-ava-cam">{busy ? "…" : <Camera size={14} />}</i>
      </button>
      {url && (
        <button
          type="button"
          className="mc-ava-x"
          onClick={async () => {
            setBusy(true);
            await act.removeAvatar();
            setBusy(false);
          }}
          aria-label={t.photoRemove}
          title={t.photoRemove}
        >
          <X size={12} />
        </button>
      )}
      <input
        ref={pick}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          await act.setAvatar(file);
          setBusy(false);
        }}
      />
    </span>
  );
}

function ProfileTab({ s, act, t, lang }) {
  const [me, setMe] = useState({ name: s.me?.name || "", phone: s.me?.phone || "", email: s.me?.email || "", password: "" });
  const emailChanged = me.email.trim().toLowerCase() !== (s.me?.email || "");
  const [p, setP] = useState({ old: "", password: "", confirm: "" });
  const [bad, setBad] = useState(false);
  return (
    <div className="mc-col">
      <section className="mc-card">
        <div className="mc-me">
          <AvatarPick s={s} act={act} t={t} />
          <span>
            <b>{s.me?.name}</b>
            <small className="mc-muted">
              {[s.me?.email, s.me?.phone].filter(Boolean).join(" · ")} · {t.memberSince.replace("{date}", fmtDate(s.me?.created_date, lang))}
            </small>
          </span>
        </div>
        <h2 style={{ marginTop: 18 }}>{t.profile}</h2>
        <form
          className="mc-fields mc-profile"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await act.saveMe({ name: me.name, phone: me.phone, email: me.email, ...(emailChanged ? { password: me.password } : {}) });
            if (ok) setMe((x) => ({ ...x, password: "" }));
          }}
        >
          <label className="mc-f">
            <span>{t.fullName}</span>
            <input required maxLength={80} value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} />
          </label>
          <div className="mc-two">
            <label className="mc-f">
              <span>{t.email}</span>
              <input type="email" required maxLength={120} value={me.email} onChange={(e) => setMe({ ...me, email: e.target.value })} />
            </label>
            <label className="mc-f">
              <span>{t.phone}</span>
              <input type="tel" required maxLength={30} value={me.phone} onChange={(e) => setMe({ ...me, phone: e.target.value })} />
            </label>
          </div>
          {emailChanged && (
            <label className="mc-f">
              <span>{t.passForEmail}</span>
              <PassInput value={me.password} onChange={(e) => setMe({ ...me, password: e.target.value })} autoComplete="current-password" label={t.password} />
            </label>
          )}
          <button type="submit" className="mc-btn" style={{ justifySelf: "start" }}>
            {t.save}
          </button>
        </form>
      </section>
      <section className="mc-card">
        <h2>
          <KeyRound size={18} /> {t.changePass}
        </h2>
        <form
          className="mc-fields"
          onSubmit={async (e) => {
            e.preventDefault();
            if (p.password !== p.confirm) return setBad(true);
            setBad(false);
            if (await act.savePass(p)) setP({ old: "", password: "", confirm: "" });
          }}
        >
          <PassInput value={p.old} onChange={(e) => setP({ ...p, old: e.target.value })} placeholder={t.oldPass} autoComplete="current-password" />
          <PassInput minLength={6} value={p.password} onChange={(e) => setP({ ...p, password: e.target.value })} placeholder={t.newPass} autoComplete="new-password" />
          <PassInput minLength={6} value={p.confirm} onChange={(e) => setP({ ...p, confirm: e.target.value })} placeholder={t.confirm} autoComplete="new-password" />
          {bad && <div className="mc-error">{t.noMatch}</div>}
          <button type="submit" className="mc-btn">
            {t.save}
          </button>
        </form>
      </section>
    </div>
  );
}

// a small live picture of a dashboard look (owner's look picker)
export function MpThumb({ info, theme, lang }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.25);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => setScale(el.clientWidth / 1100);
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const noop = () => {};
  const first = info.products.slice(0, 2);
  const now = new Date().toISOString();
  const s = {
    info: { ...info, theme },
    me: { _id: "x", name: "Sophea", phone: "012 345 678", addresses: [] },
    tab: "home",
    cart: Object.fromEntries(first.map((p) => [p._id, 1])),
    orders: [
      { _id: "o1", no: "W-0012", status: "delivering", fulfil: "delivery", created_date: now, total: 12.5, items: first.map((p) => ({ name: p.name, qty: 1, total: p.price })) },
      { _id: "o2", no: "W-0009", status: "done", fulfil: "pickup", created_date: now, total: 8, items: [] },
    ],
    busy: "",
    msg: "",
    error: "",
  };
  return (
    <div className="mc-thumb" ref={ref}>
      <div className="mc-thumb-in" style={{ transform: `scale(${scale})` }} inert="">
        <MpView s={s} act={{ setTab: noop, setQty: noop, logout: noop }} lang={lang} preview />
      </div>
    </div>
  );
}
