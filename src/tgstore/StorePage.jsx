import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Bike, Check, ChevronLeft, ChevronRight, Clock, Tag, Image as ImageIcon, Loader2, LocateFixed, MapPin, Minus, Phone, Plus, ReceiptText, RotateCcw, ShoppingBag, Store, UtensilsCrossed, X } from "lucide-react";
import { tgStorePublic } from "../api/services";
import { fill, money, round, useTgText } from "./text";
import { askWrite, getLocation, haptic, loadTelegram, store as keep } from "./tg";
import { loadThemeFont, themeClass, themeKind, themeName, themeOf, themeVars } from "./themes";
import "./tgstore-public.css";

const MODE_ICON = { delivery: Bike, pickup: ShoppingBag, dine_in: UtensilsCrossed };
const lineKey = (l) => `${l.product_id}|${JSON.stringify(l.options)}|${l.note || ""}`;
const pName = (p, lang) => (lang === "km" && p.name_km) || p.name;
const unitOf = (p, options) => p.price + options.reduce((a, o) => a + (o.price || 0), 0);
const sendLines = (cart) => cart.map((l) => ({ product_id: l.product_id, qty: l.qty, options: l.options.map((o) => ({ group: o.group, choice: o.choice })), note: l.note || "" }));
// saved lines (a cart left in Telegram, an old order) → cart lines with today's prices; what is gone is left out
function linesFrom(items, products, lang) {
  const byId = new Map(products.filter((p) => !p.sold_out).map((p) => [String(p._id), p]));
  const out = [];
  let dropped = 0;
  for (const it of items || []) {
    const p = byId.get(String(it.product_id));
    if (!p) {
      dropped += 1;
      continue;
    }
    const options = [];
    for (const o of it.options || []) {
      const g = p.options.find((x) => x.name === o.group);
      const c = g?.choices.find((x) => x.name === o.choice);
      if (c) options.push({ group: g.name, choice: c.name, price: c.price || 0 });
    }
    if (p.options.some((g) => g.required && !options.some((o) => o.group === g.name))) {
      dropped += 1;
      continue;
    }
    const line = { product_id: p._id, options, note: it.note || "", qty: Math.min(99, Math.max(1, Number(it.qty) || 1)), unit: unitOf(p, options), name: pName(p, lang) };
    const same = out.find((l) => lineKey(l) === lineKey(line));
    if (same) same.qty = Math.min(99, same.qty + line.qty);
    else out.push(line);
  }
  return { lines: out, dropped };
}
// a pin typed or pasted: "11.55, 104.92" or a Google Maps link
function pinFrom(text) {
  let v = String(text || "");
  try {
    v = decodeURIComponent(v);
  } catch {
    /* as it is */
  }
  const m = /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/.exec(v) || /[?&](?:q|query|ll|destination)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/.exec(v) || /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/.exec(v);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}

// one product: its photo, choices (size, toppings…), how many, a note
function ItemSheet({ p, cur, lang, t, onAdd, onClose, closed }) {
  const [picked, setPicked] = useState(() => Object.fromEntries(p.options.map((g) => [g.name, g.required ? [g.choices[0]?.name] : []])));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const options = p.options.flatMap((g) => (picked[g.name] || []).map((c) => g.choices.find((x) => x.name === c)).filter(Boolean).map((c) => ({ group: g.name, choice: c.name, price: c.price || 0 })));
  const unit = unitOf(p, options);
  const tap = (g, c) =>
    setPicked((o) => {
      const now = o[g.name] || [];
      if (g.multi) return { ...o, [g.name]: now.includes(c) ? now.filter((x) => x !== c) : [...now, c] };
      if (now[0] === c && !g.required) return { ...o, [g.name]: [] };
      return { ...o, [g.name]: [c] };
    });
  return (
    <div className="tsp-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tsp-sheet" role="dialog" aria-modal="true" aria-label={pName(p, lang)}>
        <button type="button" className="tsp-x" onClick={onClose} aria-label={t.close}>
          <X size={18} />
        </button>
        <div className="tsp-sheet-scroll">
        {p.photo && <img className="tsp-sheet-pic" src={p.photo} alt="" />}
        <div className="tsp-sheet-body">
          <h2>{pName(p, lang)}</h2>
          {p.about && <p className="tsp-muted">{p.about}</p>}
          <b className="tsp-price">{money(p.price, cur)}</b>
          {p.options.map((g) => (
            <fieldset key={g.name} className="tsp-group">
              <legend>
                {g.name} <small>{g.required ? t.required : g.multi ? t.pickMany : t.optional}</small>
              </legend>
              {g.choices.map((c) => {
                const on = (picked[g.name] || []).includes(c.name);
                return (
                  <button key={c.name} type="button" className={`tsp-choice ${on ? "on" : ""}`} onClick={() => tap(g, c.name)} aria-pressed={on}>
                    <span className={`tsp-tick ${g.multi ? "sq" : ""}`}>{on && <Check size={13} />}</span>
                    <span>{c.name}</span>
                    {c.price > 0 && <small>+{money(c.price, cur)}</small>}
                  </button>
                );
              })}
            </fieldset>
          ))}
          <label className="tsp-field">
            <span>{t.note}</span>
            <input value={note} maxLength={120} placeholder={t.notePh} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        </div>
        <div className="tsp-sheet-foot">
          <div className="tsp-qty">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={t.oneLess}>
              <Minus size={16} />
            </button>
            <b>{qty}</b>
            <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label={t.oneMore}>
              <Plus size={16} />
            </button>
          </div>
          <button type="button" className="tsp-btn" disabled={closed || p.sold_out} onClick={() => onAdd({ product_id: p._id, options, note: note.trim(), qty, unit, name: pName(p, lang) })} data-testid="tsp-add">
            {p.sold_out ? t.soldOut : fill(t.addFor, { price: money(round(unit * qty, cur), cur) })}
          </button>
        </div>
      </div>
    </div>
  );
}

// the order: lines, how to get it, who, how to pay
function Checkout({ d, cart, setCart, t, lang, table, me, wa, onClose, onPlaced }) {
  const s = d.store;
  const cur = s.currency;
  const modes = ["dine_in", "delivery", "pickup"].filter((m) => s[m]);
  const pays = [...["khqr", "cash"].filter((m) => s.pay[m]).map((m) => ({ key: m, name: t.payMethods[m] })), ...(s.pay.custom || []).map((m) => ({ key: `custom:${m._id}`, name: m.name, info: m.info }))];
  const last = keep.get("tsp_me", {});
  const [f, setF] = useState(() => ({
    mode: table && s.dine_in ? "dine_in" : modes.find((m) => m !== "dine_in") || modes[0],
    table: table || "",
    name: me?.name || last.name || "",
    phone: me?.phone || last.phone || "",
    address: me?.address || last.address || "",
    note: "",
    pay: pays[0]?.key,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState(null); // { code, kind, value, min_order }
  const [promoErr, setPromoErr] = useState("");
  // delivery zones (an area, or the km from the customer's pin) + the pin for the rider
  const z = s.zones;
  const [area, setArea] = useState(() => (z?.areas?.some((a) => a._id === last.area) ? last.area : ""));
  const [pin, setPin] = useState(() => me?.pin || last.pin || null);
  const [quote, setQuote] = useState(null); // { fee, km }
  const [loc, setLoc] = useState({ busy: false, error: "", text: "" });
  const askFee = async (p) => {
    try {
      const r = await tgStorePublic.fee(s.slug, { pin: p });
      setQuote(r.data);
      setLoc((o) => ({ ...o, error: "" }));
    } catch (err) {
      setQuote(null);
      setLoc((o) => ({ ...o, error: err.message }));
    }
  };
  useEffect(() => {
    if (z?.kind === "distance" && pin) askFee(pin);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const usePin = (p) => {
    setPin(p);
    setQuote(null);
    if (p && z?.kind === "distance") askFee(p);
  };
  const locate = async () => {
    setLoc((o) => ({ ...o, busy: true, error: "" }));
    const p = await getLocation(wa);
    setLoc((o) => ({ ...o, busy: false, error: p ? "" : t.locNo }));
    if (p) usePin({ lat: Math.round(p.lat * 1e6) / 1e6, lng: Math.round(p.lng * 1e6) / 1e6 });
  };
  const pasted = () => {
    if (!loc.text.trim()) return;
    const p = pinFrom(loc.text.trim());
    if (!p) return setLoc((o) => ({ ...o, error: t.locNo }));
    setLoc((o) => ({ ...o, text: "" }));
    usePin(p);
  };
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const own = pays.find((m) => m.key === f.pay && m.info);
  const sub = round(cart.reduce((a, l) => a + l.unit * l.qty, 0), cur);
  const zoneArea = z?.kind === "area" ? z.areas.find((a) => a._id === area) : null;
  const baseFee = !s.delivery ? 0 : z ? (z.kind === "area" ? (zoneArea ? zoneArea.fee : null) : quote ? quote.fee : null) : s.delivery.fee;
  const freeNow = !!(s.delivery?.free_from && sub >= s.delivery.free_from);
  const fee = f.mode === "delivery" && s.delivery ? (freeNow ? 0 : baseFee || 0) : 0;
  const zoneMissing = f.mode === "delivery" && !!z && (z.kind === "area" ? !zoneArea : !quote);
  const wantPin = f.mode === "delivery" && (z?.kind === "distance" || s.pin);
  const promoShort = promo && promo.min_order && sub < promo.min_order;
  const off = !promo || promoShort ? 0 : Math.min(sub, round(promo.kind === "percent" ? (sub * promo.value) / 100 : promo.value, cur));
  const total = round(Math.max(0, sub - off) + fee, cur);
  const applyPromo = async () => {
    setPromoErr("");
    try {
      const r = await tgStorePublic.promo(s.slug, code.trim(), sub);
      setPromo(r.data);
    } catch (err) {
      setPromo(null);
      setPromoErr(err.message);
    }
  };
  const minNeed = f.mode === "delivery" ? Math.max(s.delivery?.min_order || 0, zoneArea?.min_order || 0) : 0;
  const short = minNeed > 0 && sub < minNeed;
  const qty = (k, dlt) => setCart((c) => c.map((l) => (lineKey(l) === k ? { ...l, qty: Math.max(0, Math.min(99, l.qty + dlt)) } : l)).filter((l) => l.qty > 0));

  const place = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let can = !!me?.can_message;
      if (wa && me?.telegram && !can) can = await askWrite(wa);
      const r = await tgStorePublic.order(s.slug, {
        items: sendLines(cart),
        mode: f.mode,
        ...(f.mode === "delivery" && z?.kind === "area" ? { area } : {}),
        ...(f.mode === "delivery" && pin ? { pin } : {}),
        table: f.mode === "dine_in" ? f.table : "",
        address: f.mode === "delivery" ? f.address : "",
        name: f.name,
        phone: f.phone,
        note: f.note,
        pay: f.pay,
        promo: promo && !promoShort ? promo.code : "",
        can_message: can,
      });
      keep.set("tsp_me", { name: f.name, phone: f.phone, address: f.address || last.address || "", area: area || last.area || "", pin: pin || last.pin || null });
      keep.set(`tsp_last:${s.slug}`, { no: r.data.no, items: sendLines(cart).map((l, i) => ({ ...l, name: cart[i].name })) });
      const mine = keep.get(`tsp_orders:${s.slug}`, []);
      keep.set(`tsp_orders:${s.slug}`, [{ token: r.data.token, no: r.data.no, total: r.data.total, at: Date.now() }, ...mine].slice(0, 10));
      haptic("medium");
      onPlaced(r.data.token);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="tsp-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form className="tsp-sheet tsp-checkout" role="dialog" aria-modal="true" aria-label={t.cart} onSubmit={place}>
        <div className="tsp-sheet-head">
          <button type="button" className="tsp-icon" onClick={onClose} aria-label={t.back} disabled={busy}>
            <ChevronLeft size={20} />
          </button>
          <h2>{t.cart}</h2>
        </div>
        <div className="tsp-sheet-body">
          {cart.length === 0 ? (
            <p className="tsp-muted">{t.empty}</p>
          ) : (
            <ul className="tsp-lines">
              {cart.map((l) => (
                <li key={lineKey(l)}>
                  <span className="tsp-line-text">
                    <b>{l.name}</b>
                    {l.options.length > 0 && <small>{l.options.map((o) => o.choice).join(", ")}</small>}
                    {l.note && <small>“{l.note}”</small>}
                  </span>
                  <span className="tsp-qty sm">
                    <button type="button" onClick={() => qty(lineKey(l), -1)} aria-label={t.oneLess}>
                      <Minus size={14} />
                    </button>
                    <b>{l.qty}</b>
                    <button type="button" onClick={() => qty(lineKey(l), 1)} aria-label={t.oneMore}>
                      <Plus size={14} />
                    </button>
                  </span>
                  <span className="tsp-line-price">{money(round(l.unit * l.qty, cur), cur)}</span>
                </li>
              ))}
            </ul>
          )}

          <h3>{t.how}</h3>
          <div className="tsp-seg">
            {modes.map((m) => {
              const Icon = MODE_ICON[m];
              return (
                <button key={m} type="button" className={f.mode === m ? "on" : ""} onClick={() => set("mode", m)} aria-pressed={f.mode === m} data-testid={`tsp-mode-${m}`}>
                  <Icon size={17} /> {t.modes[m]}
                </button>
              );
            })}
          </div>
          {f.mode === "dine_in" && (
            <label className="tsp-field">
              <span>{t.table}</span>
              {table ? <b className="tsp-table">{fill(t.tableN, { n: table })}</b> : <input value={f.table} maxLength={10} placeholder={t.tablePh} inputMode="numeric" onChange={(e) => set("table", e.target.value)} required />}
            </label>
          )}
          {f.mode === "delivery" && s.delivery && (
            <>
              <label className="tsp-field">
                <span>{t.address}</span>
                <textarea value={f.address} rows={2} maxLength={200} placeholder={t.addressPh} onChange={(e) => set("address", e.target.value)} required data-testid="tsp-address" />
              </label>
              {z?.kind === "area" && (
                <fieldset className="tsp-group">
                  <legend>
                    {t.area} <small>{t.required}</small>
                  </legend>
                  {z.areas.map((a) => (
                    <button key={a._id} type="button" className={`tsp-choice ${area === a._id ? "on" : ""}`} onClick={() => setArea(a._id)} aria-pressed={area === a._id} data-testid="tsp-area">
                      <span className="tsp-tick">{area === a._id && <Check size={13} />}</span>
                      <span>{a.name}</span>
                      <small>{a.fee ? money(a.fee, cur) : t.free}</small>
                    </button>
                  ))}
                </fieldset>
              )}
              {wantPin && (
                <div className="tsp-loc" data-testid="tsp-loc">
                  <span className="tsp-loc-label">{z?.kind === "distance" ? t.locWhere : t.locHelps}</span>
                  {pin ? (
                    <div className="tsp-loc-ok">
                      <MapPin size={16} />
                      <span>{quote?.km !== undefined && quote?.km !== null ? fill(t.locOk, { km: quote.km }) : `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`}</span>
                      <button type="button" className="tsp-btn ghost sm" onClick={() => usePin(null)}>
                        {t.changeLoc}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button type="button" className="tsp-btn ghost" onClick={locate} disabled={loc.busy} data-testid="tsp-locate">
                        {loc.busy ? <Loader2 size={16} className="tsp-spin" /> : <LocateFixed size={16} />} {loc.busy ? t.locating : t.shareLoc}
                      </button>
                      <input className="tsp-loc-input" value={loc.text} placeholder={t.pasteMap} onChange={(e) => setLoc((o) => ({ ...o, text: e.target.value }))} onBlur={pasted} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), pasted())} data-testid="tsp-map" />
                    </>
                  )}
                  {loc.error && <p className="tsp-error">{loc.error}</p>}
                  {z?.kind === "distance" && !quote && !loc.error && (
                    <p className="tsp-hint">
                      {t.locFor} {z.steps[0] ? fill(t.feeFrom, { amount: money(z.steps[0].fee, cur) }) : ""}
                    </p>
                  )}
                </div>
              )}
              {s.delivery.note && <p className="tsp-hint">{s.delivery.note}</p>}
              {s.delivery.free_from > 0 && <p className="tsp-hint">{fill(t.freeFrom, { amount: money(s.delivery.free_from, cur) })}</p>}
            </>
          )}
          {f.mode === "pickup" && s.pickup?.note && <p className="tsp-hint">{s.pickup.note}</p>}
          <div className="tsp-two">
            <label className="tsp-field">
              <span>{t.name}</span>
              <input value={f.name} maxLength={80} onChange={(e) => set("name", e.target.value)} required={!me?.telegram} autoComplete="name" data-testid="tsp-name" />
            </label>
            <label className="tsp-field">
              <span>{t.phone}</span>
              <input value={f.phone} maxLength={20} inputMode="tel" placeholder={t.phonePh} onChange={(e) => set("phone", e.target.value)} required={f.mode !== "dine_in"} autoComplete="tel" data-testid="tsp-phone" />
            </label>
          </div>
          <label className="tsp-field">
            <span>{t.orderNote}</span>
            <input value={f.note} maxLength={300} onChange={(e) => set("note", e.target.value)} />
          </label>

          <h3>{t.pay}</h3>
          <div className="tsp-seg">
            {pays.map((m) => (
              <button key={m.key} type="button" className={f.pay === m.key ? "on" : ""} onClick={() => set("pay", m.key)} aria-pressed={f.pay === m.key} data-testid={`tsp-pay-${m.key.startsWith("custom:") ? m.name : m.key}`}>
                {m.name}
              </button>
            ))}
          </div>
          {f.pay === "cash" && <p className="tsp-hint">{t.cashHint[f.mode]}</p>}
          {own && <p className="tsp-hint">{own.info}</p>}
          {s.promo && (
            <div className="tsp-promo">
              <label className="tsp-field">
                <span>
                  <Tag size={13} /> {t.promoCode}
                </span>
                <span className="tsp-promo-row">
                  <input value={promo ? promo.code : code} maxLength={20} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={!!promo} placeholder="SAVE10" data-testid="tsp-promo" />
                  {promo ? (
                    <button type="button" className="tsp-btn ghost sm" onClick={() => (setPromo(null), setCode(""))}>
                      {t.remove}
                    </button>
                  ) : (
                    <button type="button" className="tsp-btn sm" onClick={applyPromo} disabled={code.trim().length < 3} data-testid="tsp-promo-apply">
                      {t.apply}
                    </button>
                  )}
                </span>
              </label>
              {promoErr && <p className="tsp-error">{promoErr}</p>}
              {promoShort && <p className="tsp-error">{fill(t.promoFrom, { amount: money(promo.min_order, cur) })}</p>}
            </div>
          )}

          <div className="tsp-sum">
            <span>{t.subtotal}</span>
            <span>{money(sub, cur)}</span>
            {off > 0 && (
              <>
                <span className="tsp-off">{fill(t.promoLine, { code: promo.code })}</span>
                <span className="tsp-off">−{money(off, cur)}</span>
              </>
            )}
            {f.mode === "delivery" && (
              <>
                <span>{t.fee}</span>
                <span data-testid="tsp-fee">{zoneMissing && !freeNow ? "—" : fee ? money(fee, cur) : t.free}</span>
              </>
            )}
            <b>{t.total}</b>
            <b>{money(total, cur)}</b>
          </div>
          {short && <p className="tsp-error">{fill(t.minOrder, { amount: money(minNeed, cur) })}</p>}
          {error && <p className="tsp-error" role="alert">{error}</p>}
        </div>
        <div className="tsp-sheet-foot">
          <button type="submit" className="tsp-btn wide" disabled={busy || !cart.length || short || !s.open || zoneMissing} data-testid="tsp-place">
            {busy ? <Loader2 size={18} className="tsp-spin" /> : null} {busy ? t.placing : fill(t.place, { total: money(total, cur) })}
          </button>
        </div>
      </form>
    </div>
  );
}

// "Made with BizHub" at the bottom (gone with the No BizHub name add-on)
export function Brand({ t }) {
  return (
    <a className="tsp-brand" href="https://bizhubcambodia.com" target="_blank" rel="noreferrer">
      {t.madeWith} <b>BizHub</b>
    </a>
  );
}

// /t/<slug> — the store, inside Telegram or in any browser
export default function StorePage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t, lang, setLang } = useTgText();
  const [d, setD] = useState(null);
  const [off, setOff] = useState(false);
  const [wa, setWa] = useState(null);
  const [me, setMe] = useState(null);
  const [cat, setCat] = useState("");
  const [item, setItem] = useState(null);
  const [checkout, setCheckout] = useState(false);
  const [cart, setCartState] = useState(() => keep.get(`tsp_cart:${slug}`, []));
  const [bump, setBump] = useState(false);
  const [notice, setNotice] = useState("");
  const table = (params.get("table") || "").slice(0, 10);
  const catRefs = useRef({});
  const synced = useRef(undefined); // the cart last sent for the reminder

  const setCart = (fn) =>
    setCartState((c) => {
      const next = typeof fn === "function" ? fn(c) : fn;
      keep.set(`tsp_cart:${slug}`, next);
      return next;
    });

  useEffect(() => {
    let on = true;
    loadTelegram().then((w) => {
      if (!on) return;
      if (w) {
        w.ready();
        w.expand?.();
        setWa(w);
        if (w.initDataUnsafe?.user?.language_code === "km") setLang("km");
      }
      Promise.all([tgStorePublic.store(slug, params.get("theme") || ""), w?.initData ? tgStorePublic.me(slug).catch(() => null) : null])
        .then(([r, m]) => {
          if (!on) return;
          setD(r.data);
          if (m?.data?.telegram) setMe(m.data);
          document.title = r.data.store.name;
          // drop lines whose product is gone or sold out
          const ok = new Map(r.data.products.filter((p) => !p.sold_out).map((p) => [String(p._id), p]));
          setCart((c) => c.filter((l) => ok.has(String(l.product_id))));
          // the cart they left in Telegram (cart reminder add-on), when this phone has none
          if (m?.data?.cart?.length && !keep.get(`tsp_cart:${slug}`, []).length) setCart(linesFrom(m.data.cart, r.data.products, lang).lines);
          // ?again=<order> (the "Order again" button in Telegram): that order in the cart
          const again = params.get("again");
          if (again && r.data.store.again) {
            window.history.replaceState(null, "", window.location.pathname + window.location.search.replace(/[?&]again=[^&]*/, "").replace(/^&/, "?") + window.location.hash);
            tgStorePublic
              .follow(again)
              .then((o) => {
                const { lines, dropped } = linesFrom(o.data.order.items, r.data.products, lang);
                if (!on || !lines.length) return;
                setCart(lines);
                setCheckout(true);
                if (dropped) setNotice(t.againSome);
              })
              .catch(() => {});
          }
          try {
            const look = themeOf(r.data.store.theme).palette;
            w?.setHeaderColor?.(look.bg);
            w?.setBackgroundColor?.(look.page);
          } catch {
            /* old Telegram */
          }
        })
        .catch(() => on && setOff(true));
    });
    return () => {
      on = false;
    };
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // what is in the cart, for the reminder (Telegram + the add-on); a second later, and only when it changed
  useEffect(() => {
    if (!d?.store.again || !wa?.initData) return undefined;
    const items = sendLines(cart);
    const key = JSON.stringify(items);
    if (synced.current === undefined && !items.length) return undefined;
    if (key === synced.current) return undefined;
    const tm = setTimeout(() => {
      synced.current = key;
      tgStorePublic.cart(slug, items).catch(() => {});
    }, 1200);
    return () => clearTimeout(tm);
  }, [cart, d, wa, slug]);

  const groups = useMemo(() => {
    if (!d) return [];
    const byCat = d.categories.map((c) => ({ ...c, items: d.products.filter((p) => String(p.category_id) === String(c._id)) })).filter((c) => c.items.length);
    const rest = d.products.filter((p) => !d.categories.some((c) => String(c._id) === String(p.category_id)));
    return rest.length ? [...byCat, { _id: "other", name: byCat.length ? "…" : "", items: rest }] : byCat;
  }, [d]);

  if (off)
    return (
      <div className="tsp-page tsp-center">
        <Store size={40} />
        <h1>{t.off}</h1>
        <p className="tsp-muted">{t.offSub}</p>
      </div>
    );
  if (!d)
    return (
      <div className="tsp-page tsp-center" aria-busy="true">
        <Loader2 size={28} className="tsp-spin" />
        <span className="tsp-muted">{t.loading}</span>
      </div>
    );

  const s = d.store;
  const cur = s.currency;
  const count = cart.reduce((a, l) => a + l.qty, 0);
  const sum = round(cart.reduce((a, l) => a + l.unit * l.qty, 0), cur);
  const inCart = (pid) => cart.filter((l) => String(l.product_id) === String(pid)).reduce((a, l) => a + l.qty, 0);
  const add = (line) => {
    setCart((c) => {
      const k = lineKey(line);
      return c.some((l) => lineKey(l) === k) ? c.map((l) => (lineKey(l) === k ? { ...l, qty: Math.min(99, l.qty + line.qty) } : l)) : [...c, line];
    });
    haptic();
    setBump(true);
    setTimeout(() => setBump(false), 350);
    setItem(null);
  };
  const quick = (p) => (p.options.length ? setItem(p) : add({ product_id: p._id, options: [], note: "", qty: 1, unit: p.price, name: pName(p, lang) }));
  const th = themeOf(s.theme);
  loadThemeFont(s.theme);
  const theme = themeVars(s.theme, s.color);
  const recent = me?.orders?.length ? me.orders : keep.get(`tsp_orders:${slug}`, []);
  const lastOrder = s.again ? me?.last || keep.get(`tsp_last:${slug}`, null) : null;
  const orderAgain = () => {
    const { lines, dropped } = linesFrom(lastOrder.items, d.products, lang);
    if (!lines.length) return setNotice(t.againSome);
    setCart(lines);
    haptic("medium");
    setNotice(dropped ? t.againSome : "");
    setCheckout(true);
  };

  return (
    <div className={`tsp-page ${themeClass(s.theme)} ${wa ? "in-tg" : ""}`} style={theme}>
      {s.preview && !params.get("embed") && (
        <div className="tsp-preview">
          {themeName(s.theme, lang)} · {themeKind(s.theme, lang)}
        </div>
      )}
      <header className="tsp-hero">
        <span className="tsp-logo">{s.logo ? <img src={s.logo} alt="" /> : <Store size={26} />}</span>
        <div className="tsp-hero-text">
          <h1>{s.name}</h1>
          {s.about && <p>{s.about}</p>}
          <div className="tsp-tags">
            {table && s.dine_in && (
              <span className="tsp-tag on">
                <UtensilsCrossed size={13} /> {fill(t.tableN, { n: table })}
              </span>
            )}
            {s.delivery && (
              <span className="tsp-tag">
                <Bike size={13} /> {t.modes.delivery}
              </span>
            )}
            {s.pickup && (
              <span className="tsp-tag">
                <ShoppingBag size={13} /> {t.modes.pickup}
              </span>
            )}
            {s.phone && (
              <a className="tsp-tag" href={`tel:${s.phone}`}>
                <Phone size={13} /> {s.phone}
              </a>
            )}
          </div>
          {s.address && (
            <p className="tsp-addr">
              <MapPin size={13} /> {s.address}
            </p>
          )}
        </div>
        <button type="button" className="tsp-lang" onClick={() => setLang(lang === "km" ? "en" : "km")}>
          {lang === "km" ? "EN" : "ខ្មែរ"}
        </button>
      </header>
      {!s.open && (
        <div className="tsp-closed">
          <Clock size={16} />
          <span>
            {t.closed}
            {s.opens && <b> {fill(t.opensAt, { when: s.opens.in_days === 0 ? t.today : s.opens.in_days === 1 ? t.tomorrow : t.days[s.opens.day], time: s.opens.time })}</b>}
          </span>
        </div>
      )}
      {recent.length > 0 && (
        <div className="tsp-recent">
          <ReceiptText size={15} />
          <span>{t.myOrders}:</span>
          {recent.slice(0, 3).map((o) => (
            <button key={o.token} type="button" onClick={() => navigate(`/t/o/${o.token}`)}>
              #{o.no}
            </button>
          ))}
        </div>
      )}
      {notice && (
        <div className="tsp-notice" role="status">
          <span>{notice}</span>
          <button type="button" className="tsp-icon" onClick={() => setNotice("")} aria-label={t.close}>
            <X size={16} />
          </button>
        </div>
      )}
      {lastOrder?.items?.length > 0 && count === 0 && s.open && (
        <button type="button" className="tsp-again" onClick={orderAgain} data-testid="tsp-again">
          <span className="tsp-again-ic">
            <RotateCcw size={18} />
          </span>
          <span className="tsp-again-text">
            <b>{t.again}</b>
            <small>{fill(t.againSub, { no: lastOrder.no, what: lastOrder.items.map((l) => `${l.qty}× ${l.name || "…"}`).join(", ") })}</small>
          </span>
          <ChevronRight size={18} />
        </button>
      )}
      {groups.length > 1 && (
        <nav className="tsp-cats" aria-label="Categories">
          {groups.map((g) => (
            <button
              key={g._id}
              type="button"
              className={cat === g._id ? "on" : ""}
              onClick={() => {
                setCat(g._id);
                catRefs.current[g._id]?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {g._id === "other" ? t.all : (lang === "km" && g.name_km) || g.name}
            </button>
          ))}
        </nav>
      )}
      <main className="tsp-main">
        {groups.map((g) => (
          <section key={g._id} ref={(el) => (catRefs.current[g._id] = el)} className="tsp-section">
            {groups.length > 1 && g._id !== "other" && <h2>{(lang === "km" && g.name_km) || g.name}</h2>}
            <div className="tsp-grid">
              {g.items.map((p) => {
                const n = inCart(p._id);
                return (
                  <article key={p._id} className={`tsp-card ${p.sold_out ? "out" : ""}`} data-testid="tsp-product">
                    <button type="button" className="tsp-card-pic" onClick={() => setItem(p)} aria-label={pName(p, lang)}>
                      {p.photo ? <img src={p.photo} alt="" loading="lazy" /> : <ImageIcon size={26} />}
                      {p.sold_out && <span className="tsp-out">{t.soldOut}</span>}
                      {n > 0 && <span className="tsp-count">{n}</span>}
                    </button>
                    <div className="tsp-card-body">
                      <b onClick={() => setItem(p)}>{pName(p, lang)}</b>
                      {p.about && <small className="tsp-card-about">{p.about}</small>}
                      <div className="tsp-card-foot">
                        <span className="tsp-price">{money(p.price, cur)}</span>
                        <button type="button" className="tsp-plus" onClick={() => quick(p)} disabled={p.sold_out || !s.open} aria-label={`${t.add} ${pName(p, lang)}`} data-testid="tsp-plus">
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </main>
      {count > 0 && (
        <div className="tsp-bar">
          <button type="button" className={`tsp-btn wide ${bump ? "bump" : ""}`} onClick={() => setCheckout(true)} data-testid="tsp-cart">
            <span className="tsp-bar-n">{count}</span>
            <span>{t.viewCart}</span>
            <b>{money(sum, cur)}</b>
          </button>
        </div>
      )}
      {s.hours && (
        <details className="tsp-hours">
          <summary>
            <Clock size={14} /> {t.hoursTitle}
          </summary>
          <ul>
            {[1, 2, 3, 4, 5, 6, 0].map((i) => (
              <li key={i} className={new Date().getDay() === i ? "on" : ""}>
                <span>{t.days[i]}</span>
                <b>{s.hours.days[i].closed ? t.closedDay : `${s.hours.days[i].open} – ${s.hours.days[i].close}`}</b>
              </li>
            ))}
          </ul>
        </details>
      )}
      {s.brand && <Brand t={t} />}
      {item && <ItemSheet p={item} cur={cur} lang={lang} t={t} closed={!s.open} onAdd={add} onClose={() => setItem(null)} />}
      {checkout && (
        <Checkout
          d={d}
          cart={cart}
          setCart={setCart}
          t={t}
          lang={lang}
          table={s.dine_in ? table : ""}
          me={me}
          wa={wa}
          onClose={() => setCheckout(false)}
          onPlaced={(token) => {
            setCart([]);
            navigate(`/t/o/${token}`);
          }}
        />
      )}
    </div>
  );
}
