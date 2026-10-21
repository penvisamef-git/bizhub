import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ChefHat, Clock3, Loader2, MapPin, Minus, Plus, ShoppingBag, Trash2, Wifi, X } from "lucide-react";
import { publicGet, publicPost } from "../api/client";
import Logo from "../components/Logo";
import LangSwitch from "../components/LangSwitch";
import { useI18n } from "../i18n/I18nProvider";
import { CardPageSkeleton } from "../components/skeleton/Skeleton";
import "./menu.css";
import "./order.css";
import "./order-themes.css";

const TEXT = {
  en: {
    table: "Table",
    soldOut: "Sold out",
    left: "{n} left",
    add: "Add",
    addToCart: "Add to order · {p}",
    size: "Size",
    pickOne: "pick 1",
    required: "required",
    upTo: "up to {n}",
    note: "Note for the kitchen",
    notePh: "No chilli, less ice…",
    cart: "Your order",
    viewCart: "View order",
    items: (n) => (n === 1 ? "1 item" : `${n} items`),
    total: "Total",
    yourName: "Your name (so staff know who ordered)",
    phonePoints: "Phone number — collect reward points",
    phonePh: "Optional, e.g. 012 345 678",
    namePh: "Optional",
    send: "Send order",
    sending: "Sending…",
    locating: "Checking you're in the shop…",
    empty: "Nothing here yet. Tap a dish to add it.",
    notOpen: "This table isn't open yet. Please ask staff to open it, then you can order.",
    sentTitle: "Order sent!",
    sentSub: "It's on its way to staff. Follow it below, or order more.",
    orderMore: "Order more",
    mine: "Table bill",
    tableBill: "Table bill",
    you: "You",
    guest: "Guest",
    staff: "Staff",
    subtotal: "Subtotal",
    discount: "Discount",
    service: "Service",
    vat: "VAT",
    vatIncl: "VAT included",
    billClosed: "This table's bill is closed. Thank you!",
    menu: "Menu",
    waiting: "Sent · waiting for staff",
    accepted: "Received by staff",
    rejected: "Not accepted",
    noOrders: "Nothing on this table's bill yet.",
    readOnly: "Sent orders can't be changed. Need a change? Ask staff.",
    locHelp: "Your phone's location is only used to check you're in the shop. Allow it in your browser, then send again.",
    locNo: "This phone can't share its location. Please ask staff to take your order.",
    closed: "Ordering is closed",
    tooFar: "You seem to be {d} m from the shop. Orders only work inside the shop — if you are here, turn on precise location and try again.",
    network: "No internet. Check your connection and try again.",
    closedSub: "This table's QR doesn't take orders right now. Please ask staff.",
    retry: "Try again",
    choose: "Choose",
    removeAll: "Clear",
  },
  km: {
    table: "តុ",
    soldOut: "អស់ហើយ",
    left: "នៅសល់ {n}",
    add: "បន្ថែម",
    addToCart: "ដាក់ក្នុងការកុម្ម៉ង់ · {p}",
    size: "ទំហំ",
    pickOne: "ជ្រើស 1",
    required: "ត្រូវជ្រើស",
    upTo: "ជ្រើសបាន {n}",
    note: "សម្គាល់សម្រាប់ផ្ទះបាយ",
    notePh: "កុំដាក់ម្ទេស ទឹកកកតិច…",
    cart: "ការកុម្ម៉ង់របស់អ្នក",
    viewCart: "មើលការកុម្ម៉ង់",
    items: (n) => `${n} មុខ`,
    total: "សរុប",
    yourName: "ឈ្មោះរបស់អ្នក (ឲ្យបុគ្គលិកដឹងថាអ្នកណាកុម្ម៉ង់)",
    phonePoints: "លេខទូរស័ព្ទ — សន្សំពិន្ទុរង្វាន់",
    phonePh: "មិនចាំបាច់ ឧ. 012 345 678",
    namePh: "មិនចាំបាច់",
    send: "ផ្ញើការកុម្ម៉ង់",
    sending: "កំពុងផ្ញើ…",
    locating: "កំពុងពិនិត្យថាអ្នកនៅក្នុងហាង…",
    empty: "មិនទាន់មានអ្វីទេ។ ចុចលើមុខម្ហូបដើម្បីបន្ថែម។",
    notOpen: "តុនេះមិនទាន់បើកទេ។ សូមហៅបុគ្គលិកឲ្យបើកតុ រួចអ្នកអាចកុម្ម៉ង់បាន។",
    sentTitle: "បានផ្ញើការកុម្ម៉ង់!",
    sentSub: "កំពុងផ្ញើទៅបុគ្គលិក។ តាមដាននៅខាងក្រោម ឬកុម្ម៉ង់បន្ថែម។",
    orderMore: "កុម្ម៉ង់បន្ថែម",
    mine: "វិក្កយបត្រតុ",
    tableBill: "វិក្កយបត្រតុ",
    you: "អ្នក",
    guest: "ភ្ញៀវ",
    staff: "បុគ្គលិក",
    subtotal: "សរុបរង",
    discount: "បញ្ចុះតម្លៃ",
    service: "សេវា",
    vat: "អាករ",
    vatIncl: "រួមអាករ",
    billClosed: "វិក្កយបត្ររបស់តុនេះបានបិទហើយ។ សូមអរគុណ!",
    menu: "ម៉ឺនុយ",
    waiting: "បានផ្ញើ · កំពុងរង់ចាំបុគ្គលិក",
    accepted: "បុគ្គលិកបានទទួល",
    rejected: "មិនបានទទួល",
    noOrders: "មិនទាន់មានអ្វីលើវិក្កយបត្រតុនេះទេ។",
    readOnly: "ការកុម្ម៉ង់ដែលបានផ្ញើមិនអាចកែបានទេ។ ចង់ប្តូរ? សូមប្រាប់បុគ្គលិក។",
    locHelp: "ទីតាំងទូរស័ព្ទប្រើតែដើម្បីពិនិត្យថាអ្នកនៅក្នុងហាងប៉ុណ្ណោះ។ សូមអនុញ្ញាតក្នុងកម្មវិធីរុករក រួចផ្ញើម្តងទៀត។",
    locNo: "ទូរស័ព្ទនេះមិនអាចផ្តល់ទីតាំងបានទេ។ សូមឲ្យបុគ្គលិកកត់ការកុម្ម៉ង់។",
    closed: "ការកុម្ម៉ង់បានបិទ",
    tooFar: "អ្នកហាក់ដូចជានៅឆ្ងាយពីហាង {d} m។ ការកុម្ម៉ង់ដំណើរការតែក្នុងហាងប៉ុណ្ណោះ — បើអ្នកនៅទីនេះ សូមបើកទីតាំងច្បាស់លាស់ ហើយព្យាយាមម្តងទៀត។",
    network: "គ្មានអ៊ីនធឺណិត។ សូមពិនិត្យការភ្ជាប់ ហើយព្យាយាមម្តងទៀត។",
    closedSub: "QR របស់តុនេះមិនទទួលការកុម្ម៉ង់ទេពេលនេះ។ សូមហៅបុគ្គលិក។",
    retry: "ព្យាយាមម្តងទៀត",
    choose: "ជ្រើស",
    removeAll: "សម្អាត",
  },
};
const usd = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const khr = (n) => `${new Intl.NumberFormat("en-US").format(Math.round(n))}៛`;
const store = {
  get: (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      // private mode: keep it in memory only
    }
  },
};
const newKey = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`);
const lineTotal = (l) => (l.unit_price + l.addons.reduce((a, x) => a + x.price, 0)) * l.qty;
const sameLine = (a, b) => a.item_id === b.item_id && a.size === b.size && a.note === b.note && JSON.stringify(a.addons) === JSON.stringify(b.addons);

// where the phone is (only to check the guest is in the shop)
const locate = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(Object.assign(new Error("no"), { code: "none" }));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy || 0) }),
      (e) => reject(Object.assign(new Error(e.message), { code: e.code === 1 ? "denied" : "none" })),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });

// A guest orders from the QR on their table: /public/order/:token
export default function OrderPage() {
  const { token } = useParams();
  const { lang } = useI18n();
  const t = TEXT[lang] || TEXT.en;
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState("menu"); // menu | mine
  const [active, setActive] = useState("");
  const [picking, setPicking] = useState(null); // item in the sheet
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState(() => store.get(`bh_cart_${token}`, []));
  const [name, setName] = useState(() => store.get("bh_guest_name", ""));
  const [phone, setPhone] = useState(() => store.get("bh_guest_phone", ""));
  const [sending, setSending] = useState(""); // "" | locating | sending
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [mine, setMine] = useState(null);
  const guest = useMemo(() => {
    let k = store.get("bh_guest", "");
    if (!k) {
      k = newKey();
      store.set("bh_guest", k);
    }
    return k;
  }, []);
  const refs = useRef({});

  const load = useCallback(
    () =>
      publicGet(`/order/${encodeURIComponent(token)}`)
        .then((r) => setData(r.data))
        .catch(() => setMissing(true)),
    [token],
  );
  const loadMine = useCallback(
    () =>
      publicGet(`/order/${encodeURIComponent(token)}/mine?guest=${encodeURIComponent(guest)}`)
        .then((r) => {
          setMine({ orders: r.data.orders || [], waiting: r.data.waiting || [], bill: r.data.bill || null });
          setData((d) => (d ? { ...d, open: r.data.open } : d));
        })
        .catch(() => {}),
    [token, guest],
  );
  useEffect(() => {
    load();
    loadMine();
  }, [load, loadMine]);
  // keep the status fresh (table opened by staff, order received…)
  useEffect(() => {
    const i = setInterval(() => document.visibilityState === "visible" && loadMine(), 8000);
    return () => clearInterval(i);
  }, [loadMine]);
  useEffect(() => store.set(`bh_cart_${token}`, cart), [cart, token]);
  useEffect(() => store.set("bh_guest_name", name), [name]);
  useEffect(() => store.set("bh_guest_phone", phone), [phone]);

  const R = data?.restaurant;
  // the owner previews a look from the dashboard with ?preview=<theme>
  const preview = new URLSearchParams(window.location.search).get("preview");
  const theme = (preview && /^[a-z]{3,12}$/.test(preview) ? preview : data?.theme) || "fresh";
  // two looks use a special font: load it only for them
  useEffect(() => {
    const fam = { elegant: "Cormorant+Garamond:wght@500;600;700", angkor: "Moul" }[theme];
    if (!fam || document.getElementById(`mo-font-${theme}`)) return;
    const l = document.createElement("link");
    l.id = `mo-font-${theme}`;
    l.rel = "stylesheet";
    l.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
    document.head.appendChild(l);
  }, [theme]);
  const shopName = R ? (lang === "km" ? R.name_km || R.name_en : R.name_en || R.name_km) : "";
  useEffect(() => {
    if (shopName) document.title = shopName;
  }, [shopName]);
  const price = (n) => (R?.currency === "KHR" ? khr(n) : usd(n));
  const other = (n) => (R.currency === "KHR" ? usd(n / R.khr_rate) : khr(Math.round((n * R.khr_rate) / (R.khr_rounding || 100)) * (R.khr_rounding || 100)));
  const nm = (x) => (lang === "km" ? x.name_km || x.name_en : x.name_en || x.name_km);
  const nm2 = (x) => (lang === "km" ? x.name_en : x.name_km);

  if (missing) {
    return (
      <div className="standalone-page">
        <Logo height={34} />
        <h1>{t.closed}</h1>
        <p>{t.closedSub}</p>
      </div>
    );
  }
  if (!data) return <CardPageSkeleton />;

  const cats = data.categories.filter((c) => data.items.some((i) => String(i.category_id) === c._id));
  const groups = Object.fromEntries(data.addon_groups.map((g) => [g._id, g]));
  const count = cart.reduce((a, l) => a + l.qty, 0);
  const sum = cart.reduce((a, l) => a + lineTotal(l), 0);
  const blocked = data.rules.require_open && !data.open;
  const inCart = (id) => cart.filter((l) => l.item_id === id).reduce((a, l) => a + l.qty, 0);

  const addToCart = (line) => {
    setCart((c) => {
      const same = c.find((l) => sameLine(l, line));
      return same ? c.map((l) => (l === same ? { ...l, qty: Math.min(50, l.qty + line.qty) } : l)) : [...c, line];
    });
    setPicking(null);
    setSent(false);
  };
  const tapItem = (i) => {
    if (!i.available) return;
    const simple = !i.sizes?.length && !(i.addon_group_ids || []).some((g) => groups[g]);
    if (simple) addToCart({ key: newKey(), item_id: i._id, name_km: i.name_km, name_en: i.name_en, photo: i.photo, size: "", unit_price: i.price, addons: [], qty: 1, note: "" });
    else setPicking(i);
  };
  const setQty = (key, qty) => setCart((c) => (qty <= 0 ? c.filter((l) => l.key !== key) : c.map((l) => (l.key === key ? { ...l, qty: Math.min(50, qty) } : l))));

  const send = async () => {
    setError("");
    let where = {};
    try {
      if (data.rules.needs_location) {
        setSending("locating");
        where = await locate();
      }
      setSending("sending");
      await publicPost(`/order/${encodeURIComponent(token)}`, {
        guest,
        name: name.trim(),
        ...(data.rules.points && phone.trim() ? { phone: phone.trim() } : {}),
        ...where,
        lines: cart.map((l) => ({ item_id: l.item_id, size: l.size, addons: l.addons.map((a) => ({ group: a.group_id, name: a.name })), qty: l.qty, note: l.note })),
      });
      setCart([]);
      setCartOpen(false);
      setSent(true);
      setTab("mine");
      loadMine();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const code = e.body?.code;
      if (e.code === "denied" || code === "location") setError(t.locHelp);
      else if (e.code === "none") setError(t.locNo);
      else if (e.code === "NETWORK") setError(t.network);
      else if (code === "far") setError(t.tooFar.replace("{d}", e.body.distance));
      else if (code === "not_open") setError(t.notOpen);
      else setError(e.message);
      if (e.status === 409) loadMine();
    } finally {
      setSending("");
    }
  };

  const jump = (id) => {
    setActive(id);
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={`mn mo mo-t-${theme}`} style={{ "--c": R.color }}>
      <header className="mn-hero mo-hero" style={R.cover ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.2), rgba(0,0,0,.7)), url("${R.cover}")` } : undefined}>
        <div className="mn-lang">
          <LangSwitch />
        </div>
        <div className="mn-hero-in">
          <span className="mn-logo">{R.logo ? <img src={R.logo} alt="" /> : <ChefHat size={30} />}</span>
          <h1>{shopName}</h1>
          {R.wifi_name && (
            <div className="mn-facts">
              <span>
                <Wifi size={13} /> {R.wifi_name}
              </span>
            </div>
          )}
        </div>
      </header>
      <div className="mn-table mo-table">
        {t.table} <b>{data.table.name}</b>
        {data.rules.needs_location && (
          <small>
            <MapPin size={12} /> {data.rules.radius} m
          </small>
        )}
      </div>

      <div className="mo-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "menu"} className={tab === "menu" ? "on" : ""} onClick={() => setTab("menu")}>
          {t.menu}
        </button>
        <button type="button" role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>
          {t.mine}
          {mine && (mine.bill?.lines.length || 0) + mine.waiting.length > 0 && <span className="mo-count">{(mine.bill?.lines.reduce((a, l) => a + l.qty, 0) || 0) + mine.waiting.reduce((a, o) => a + o.lines.reduce((x, l) => x + l.qty, 0), 0)}</span>}
        </button>
      </div>

      {blocked && <div className="mo-warn">{t.notOpen}</div>}

      {tab === "mine" ? (
        <main className="mn-main mo-mine">
          {sent && (
            <div className="mo-sent">
              <CheckCircle2 size={28} />
              <div>
                <b>{t.sentTitle}</b>
                <p>{t.sentSub}</p>
              </div>
            </div>
          )}
          {mine === null ? (
            <Loader2 className="md-spin" />
          ) : (
            <>
              {mine.waiting.map((o) => (
                <section key={o._id} className="mo-order s-new">
                  <header>
                    <span className="mo-status">
                      <Clock3 size={15} /> {t.waiting}
                    </span>
                    <small>
                      {o.mine ? t.you : o.guest_name || t.guest} · {new Date(o.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </small>
                  </header>
                  {o.lines.map((l, i) => (
                    <BillLine key={i} l={l} amount={lineTotal(l)} nm={nm} price={price} />
                  ))}
                </section>
              ))}
              {mine.bill ? (
                <section className="mo-order mo-bill">
                  <header>
                    <b>
                      {t.tableBill} · {t.table} {data.table.name}
                    </b>
                    <small>{mine.bill.numbers.map((n) => `#${n}`).join(" ")}</small>
                  </header>
                  {mine.bill.lines.map((l, i) => (
                    <BillLine key={i} l={l} amount={l.amount} full={l.full} nm={nm} price={price} who={l.from === "guest" ? l.guest_name || t.guest : t.staff} guest={l.from === "guest"} />
                  ))}
                  <div className="mo-bill-sums">
                    {(mine.bill.discount > 0 || mine.bill.service > 0 || (mine.bill.vat > 0 && !mine.bill.vat_included)) && (
                      <div>
                        <span>{t.subtotal}</span>
                        <span>{price(mine.bill.subtotal)}</span>
                      </div>
                    )}
                    {mine.bill.discount > 0 && (
                      <div>
                        <span>{t.discount}</span>
                        <span>−{price(mine.bill.discount)}</span>
                      </div>
                    )}
                    {mine.bill.service > 0 && (
                      <div>
                        <span>{t.service}</span>
                        <span>{price(mine.bill.service)}</span>
                      </div>
                    )}
                    {mine.bill.vat > 0 && (
                      <div>
                        <span>{mine.bill.vat_included ? t.vatIncl : t.vat}</span>
                        <span>{price(mine.bill.vat)}</span>
                      </div>
                    )}
                  </div>
                  <footer>
                    <span>{t.total}</span>
                    <b>
                      {price(mine.bill.total)} <em>{other(mine.bill.total)}</em>
                    </b>
                  </footer>
                </section>
              ) : (
                mine.waiting.length === 0 && <p className="mo-muted">{mine.orders.length ? t.billClosed : t.noOrders}</p>
              )}
              {(mine.bill || mine.waiting.length > 0) && <p className="mo-muted small">{t.readOnly}</p>}
            </>
          )}
          <button type="button" className="mo-btn" onClick={() => setTab("menu")}>
            <Plus size={18} /> {t.orderMore}
          </button>
        </main>
      ) : (
        <>
          <nav className="mn-cats" aria-label="Categories">
            {cats.map((c) => (
              <button key={c._id} type="button" className={active === c._id ? "on" : ""} onClick={() => jump(c._id)}>
                {nm(c)}
              </button>
            ))}
          </nav>
          <main className="mn-main">
            {cats.map((c) => (
              <section key={c._id} ref={(el) => (refs.current[c._id] = el)} className="mn-section">
                <h2>
                  <i style={{ background: c.color }} /> {nm(c)}
                  {nm2(c) && <small>{nm2(c)}</small>}
                </h2>
                <div className="mn-items">
                  {data.items
                    .filter((i) => String(i.category_id) === c._id)
                    .map((i) => {
                      const n = inCart(i._id);
                      return (
                        <button key={i._id} type="button" className={`mn-item mo-item ${i.available ? "" : "sold"}`} onClick={() => tapItem(i)} disabled={!i.available}>
                          <span className="mn-item-text">
                            <b>{nm(i)}</b>
                            {nm2(i) && <small>{nm2(i)}</small>}
                            {i.description && <span className="mn-desc">{i.description}</span>}
                            <span className="mn-price">
                              {i.sizes?.length ? `${price(Math.min(...i.sizes.map((s) => s.price)))}+` : price(i.price)}
                              <em>{other(i.price)}</em>
                            </span>
                            {i.left !== null && i.left > 0 && i.left <= 5 && <span className="mo-left">{t.left.replace("{n}", i.left)}</span>}
                          </span>
                          {i.photo && <img src={i.photo} alt="" loading="lazy" />}
                          {!i.available ? (
                            <span className="mn-sold">{t.soldOut}</span>
                          ) : (
                            <span className={`mo-add ${n ? "has" : ""}`} aria-hidden="true">
                              {n ? n : <Plus size={18} />}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </section>
            ))}
            <footer className="mn-foot">
              <Logo height={20} />
            </footer>
          </main>
        </>
      )}

      {count > 0 && !cartOpen && (
        <div className="mo-bar">
          <button type="button" onClick={() => setCartOpen(true)}>
            <ShoppingBag size={19} />
            <span>
              {t.viewCart} · {t.items(count)}
            </span>
            <b>{price(sum)}</b>
          </button>
        </div>
      )}

      {picking && <PickSheet item={picking} groups={groups} t={t} nm={nm} nm2={nm2} price={price} onAdd={addToCart} onClose={() => setPicking(null)} />}

      {cartOpen && (
        <div className="mn-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}>
          <div className="mn-sheet mo-cart" role="dialog" aria-modal="true" aria-label={t.cart}>
            <button type="button" className="mn-close" onClick={() => setCartOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
            <div className="mn-sheet-body">
              <h3>
                {t.cart} · {t.table} {data.table.name}
              </h3>
              {cart.length === 0 ? (
                <p className="mo-muted">{t.empty}</p>
              ) : (
                <div className="mo-lines">
                  {cart.map((l) => (
                    <div key={l.key} className="mo-line">
                      {l.photo ? <img src={l.photo} alt="" /> : <span className="mo-line-ph" />}
                      <span className="mo-line-text">
                        <b>{nm(l)}</b>
                        {(l.size || l.addons.length > 0 || l.note) && <small>{[l.size, ...l.addons.map((a) => `+ ${a.name}`), l.note && `“${l.note}”`].filter(Boolean).join(" · ")}</small>}
                        <span>{price(lineTotal(l))}</span>
                      </span>
                      <span className="mo-qty">
                        <button type="button" onClick={() => setQty(l.key, l.qty - 1)} aria-label="−">
                          {l.qty === 1 ? <Trash2 size={15} /> : <Minus size={15} />}
                        </button>
                        <b>{l.qty}</b>
                        <button type="button" onClick={() => setQty(l.key, l.qty + 1)} aria-label="+">
                          <Plus size={15} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <label className="mo-field">
                <span>{t.yourName}</span>
                <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder={t.namePh} />
              </label>
              {data.rules.points && (
                <label className="mo-field">
                  <span>⭐ {t.phonePoints}</span>
                  <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 20))} placeholder={t.phonePh} />
                </label>
              )}
              <div className="mo-total">
                <span>{t.total}</span>
                <b>
                  {price(sum)} <em>{other(sum)}</em>
                </b>
              </div>
              {blocked && <div className="mo-warn inline">{t.notOpen}</div>}
              {error && <div className="mo-error">{error}</div>}
              <button type="button" className="mo-btn big" onClick={send} disabled={!cart.length || !!sending || blocked}>
                {sending ? <Loader2 size={18} className="md-spin" /> : <CheckCircle2 size={18} />}
                {sending === "locating" ? t.locating : sending ? t.sending : `${t.send} · ${price(sum)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// choose size / add-ons / quantity / note for one dish
function PickSheet({ item, groups, t, nm, nm2, price, onAdd, onClose }) {
  const [size, setSize] = useState(item.sizes?.[0]?.name || "");
  const [picked, setPicked] = useState({}); // groupId → [option names]
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const myGroups = (item.addon_group_ids || []).map((g) => groups[g]).filter(Boolean);
  const unit = item.sizes?.length ? item.sizes.find((s) => s.name === size)?.price ?? item.price : item.price;
  const addons = myGroups.flatMap((g) => (picked[g._id] || []).map((n) => ({ group_id: g._id, group: g.name, name: n, price: Number(g.options.find((o) => o.name === n)?.price) || 0 })));
  const each = unit + addons.reduce((a, x) => a + x.price, 0);
  const missing = myGroups.find((g) => (picked[g._id] || []).length < (g.required ? Math.max(1, g.min || 1) : g.min || 0));
  const toggle = (g, n) =>
    setPicked((p) => {
      const cur = p[g._id] || [];
      if (cur.includes(n)) return { ...p, [g._id]: cur.filter((x) => x !== n) };
      if (g.max === 1) return { ...p, [g._id]: [n] };
      if (g.max && cur.length >= g.max) return p;
      return { ...p, [g._id]: [...cur, n] };
    });
  return (
    <div className="mn-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mn-sheet" role="dialog" aria-modal="true" aria-label={nm(item)}>
        <button type="button" className="mn-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        {item.photo && <img className="mn-sheet-photo" src={item.photo} alt="" />}
        <div className="mn-sheet-body">
          <h3>{nm(item)}</h3>
          {nm2(item) && <p className="mn-second dark">{nm2(item)}</p>}
          {item.description && <p className="mn-desc">{item.description}</p>}
          {item.sizes?.length > 0 && (
            <div className="mn-opts mo-opts">
              <b>
                {t.size} <small>{t.pickOne}</small>
              </b>
              {item.sizes.map((s) => (
                <label key={s.name}>
                  <input type="radio" name="size" checked={size === s.name} onChange={() => setSize(s.name)} />
                  <span>{s.name}</span>
                  <span>{price(s.price)}</span>
                </label>
              ))}
            </div>
          )}
          {myGroups.map((g) => (
            <div key={g._id} className="mn-opts mo-opts">
              <b>
                {g.name} <small>{g.required ? t.required : g.max ? t.upTo.replace("{n}", g.max) : ""}</small>
              </b>
              {g.options.map((o) => (
                <label key={o.name}>
                  <input type={g.max === 1 ? "radio" : "checkbox"} name={`g-${g._id}`} checked={(picked[g._id] || []).includes(o.name)} onChange={() => toggle(g, o.name)} onClick={() => g.max === 1 && (picked[g._id] || []).includes(o.name) && toggle(g, o.name)} />
                  <span>{o.name}</span>
                  <span>{o.price ? `+${price(o.price)}` : ""}</span>
                </label>
              ))}
            </div>
          ))}
          <label className="mo-field">
            <span>{t.note}</span>
            <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 120))} placeholder={t.notePh} />
          </label>
          <div className="mo-pick-foot">
            <span className="mo-qty big">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="−">
                <Minus size={17} />
              </button>
              <b>{qty}</b>
              <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="+">
                <Plus size={17} />
              </button>
            </span>
            <button
              type="button"
              className="mo-btn"
              disabled={!!missing}
              onClick={() => onAdd({ key: `${Date.now()}-${Math.random()}`, item_id: item._id, name_km: item.name_km, name_en: item.name_en, photo: item.photo, size, unit_price: unit, addons, qty, note: note.trim() })}
            >
              {missing ? `${t.choose} ${missing.name}` : t.addToCart.replace("{p}", price(each * qty))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// one line on the table bill (read only)
function BillLine({ l, amount, full, nm, price, who, guest }) {
  return (
    <div className="mo-order-line">
      <span>
        <span>
          <b>{l.qty}×</b> {nm(l)}
          {l.size && <em> · {l.size}</em>}
        </span>
        {(l.addons?.length > 0 || l.note) && <small>{[...(l.addons || []).map((a) => `+ ${a.name}`), l.note && `“${l.note}”`].filter(Boolean).join(" · ")}</small>}
        {who && <small className={`mo-who ${guest ? "guest" : ""}`}>{who}</small>}
      </span>
      <span className="mo-amt">
        {full > amount && <s>{price(full)}</s>}
        {price(amount)}
      </span>
    </div>
  );
}
