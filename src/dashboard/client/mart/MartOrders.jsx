import { useCallback, useEffect, useRef, useState } from "react";
import { Banknote, BellRing, Check, Music, Play, ClipboardList, Copy, ExternalLink, Globe, Lock, MapPin, Phone, Plus, QrCode, Search, ShoppingBag, Store, Truck, UserX, Users, X } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { ImagePick } from "../restaurant/parts";
import CoinIcon from "../../../components/CoinIcon";
import { MP_LOOKS, MP_LOOK_KEYS, mpLookName } from "../../../msite/looks";
import { MpThumb } from "../../../msite/portal/MpView";
import { fmtDate, fmtDayTime, money } from "./text";
import { xText } from "./xtext";
import { OrderDriver } from "./MartDelivery";
import { useWText } from "./wtext";
import { CustomerModal } from "./MartCustomer";

const OPEN = ["new", "accepted", "ready", "delivering"];
const COLOR_PRESETS = ["#0F766E", "#0369A1", "#2563EB", "#4F46E5", "#7C3AED", "#BE185D", "#E11D48", "#DC2626", "#EA580C", "#D97706", "#65A30D", "#16A34A", "#334155", "#18181B"];
const TONE = { new: "warn", accepted: "info", ready: "ok", delivering: "info", done: "", declined: "bad", cancelled: "" };
export const shopOn = (ctx) => (ctx.pos ? !!ctx.data.shop : !!ctx.data.addons?.mart_shop?.active);

// a ring that repeats while new orders wait (Web Audio — no sound file)
let audio = null;
function ring() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    const now = audio.currentTime;
    [0, 0.16, 0.32, 0.48].forEach((t, i) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = "triangle";
      o.frequency.value = i % 2 ? 1320 : 990;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.3, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.14);
      o.connect(g).connect(audio.destination);
      o.start(now + t);
      o.stop(now + t + 0.16);
    });
  } catch {
    /* no audio */
  }
}
// the owner's own alarm (mp3) when there is one, else the ring above
let player = null;
export function playAlarm(url) {
  if (!url) return ring();
  try {
    if (!player || player.dataset.src !== url) {
      player = new Audio(url);
      player.dataset.src = url;
    }
    player.currentTime = 0;
    player.play().catch(() => ring());
  } catch {
    ring();
  }
}
// polls the new-order count; rings every few seconds until it is 0 = every new order accepted (or declined)
export function useOrderAlert(api, id, enabled = true) {
  const [count, setCount] = useState(0);
  const [sound, setSound] = useState("");
  const [muteUntil, setMuteUntil] = useState(0);
  const check = useCallback(() => {
    if (!enabled) return Promise.resolve();
    return api
      .orderCount(id)
      .then((r) => {
        setCount(r.data.pending || 0);
        setSound(r.data.sound || "");
      })
      .catch(() => {});
  }, [api, id, enabled]);
  useEffect(() => {
    if (!enabled) return undefined;
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, [check, enabled]);
  useEffect(() => {
    if (!count || Date.now() < muteUntil) return undefined;
    playAlarm(sound);
    const t = setInterval(() => Date.now() >= muteUntil && playAlarm(sound), sound ? 8000 : 5000);
    return () => {
      clearInterval(t);
      player?.pause();
    };
  }, [count, muteUntil, sound]);
  return { count, refresh: check, mute: () => setMuteUntil(Date.now() + 120000), muted: Date.now() < muteUntil };
}
export function OrderAlertBar({ w, alert, onOpen }) {
  if (!alert.count) return null;
  return (
    <div className="ghq-alert" role="alert" data-testid="mo-alert">
      <BellRing size={20} className="ghq-bell" />
      <b>{alert.count === 1 ? w.alertOne : w.alertMany.replace("{n}", alert.count)}</b>
      <button type="button" className="ghq-alert-open" onClick={onOpen}>
        {w.alertOpen}
      </button>
    </div>
  );
}
// the POS tab: just the list
export function PosOrdersTab({ ctx }) {
  const w = useWText();
  const [view, setView] = useState("orders");
  // the cashier sees online customers only when the owner allows it
  if (!ctx.data.pos_customers) return <OrdersList ctx={ctx} onChange={ctx.onOrders} />;
  return (
    <div className="rs-col">
      <div className="ghw-tabs" role="tablist">
        {["orders", "customers"].map((k) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} className={view === k ? "on" : ""} onClick={() => setView(k)}>
            {w.shopTabs[k]}
          </button>
        ))}
      </div>
      {view === "orders" ? <OrdersList ctx={ctx} onChange={ctx.onOrders} /> : <Customers ctx={ctx} w={w} />}
    </div>
  );
}
const canSeeCustomers = (ctx) => !ctx.pos || !!ctx.data.pos_customers;

// Online orders (mart_shop): the orders, the customers, the rules (pickup / delivery / payment) and the 24 dashboard looks
export function OrdersTab({ ctx }) {
  const { readOnly, lang } = ctx;
  const w = useWText();
  const [info, setInfo] = useState(null);
  const [tab, setTab] = useState("orders");
  const load = useCallback(
    () =>
      ctx.api
        .shop(ctx.id)
        .then((r) => setInfo(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx],
  );
  useEffect(() => {
    load();
  }, [load]);
  if (!info) return <p className="rs-muted">…</p>;
  const a = info.addon;
  if (!a.active) {
    return (
      <section className="panel-card mt-lock">
        <ShoppingBag size={34} />
        <h2>{w.shopTitle}</h2>
        <p className="rs-muted">{info.website ? w.shopLocked : w.needWebsite}</p>
        <ul className="at-perks mw-perks">
          {w.shopPerks.map((x) => (
            <li key={x}>
              <Check size={14} /> {x}
            </li>
          ))}
        </ul>
        {info.website ? (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon: "mart_shop" })} disabled={readOnly}>
            <CoinIcon size={16} /> {w.unlockYear.replace("{coins}", a.price ?? 75)}
          </button>
        ) : (
          <button type="button" className="md-btn md-btn-primary" onClick={() => ctx.go("website")}>
            <Globe size={16} /> {w.goWebsite}
          </button>
        )}
      </section>
    );
  }
  const url = info.site.slug ? `${window.location.origin}/m/${info.site.slug}/account` : "";
  return (
    <div className="rs-col">
      <section className="panel-card ms-head">
        <div className="ms-head-top">
          <span className="ms-head-ic">
            <ShoppingBag size={24} />
          </span>
          <div className="ms-head-text">
            <h2>{w.shopTitle}</h2>
            <small>{a.expires_at ? w.until.replace("{date}", fmtDate(a.expires_at, lang)) : ""}</small>
          </div>
          <div className="ms-head-btns">
            <label className={`mw-take ${info.settings.shop_on ? "on" : ""}`}>
              <button
                type="button"
                className={`ghw-switch ${info.settings.shop_on ? "on" : ""}`}
                role="switch"
                aria-checked={info.settings.shop_on}
                disabled={readOnly}
                onClick={() =>
                  ctx.api
                    .saveShop(ctx.id, { shop_on: !info.settings.shop_on })
                    .then((r) => setInfo(r.data))
                    .catch((e) => ctx.notify({ type: "error", text: e.message }))
                }
              >
                <i />
              </button>
              <b>{info.settings.shop_on ? w.taking : w.paused}</b>
            </label>
          </div>
        </div>
        {(!info.site.published || !info.website) && (
          <div className="md-notice md-notice-error" style={{ marginTop: 12 }}>
            {w.notLive}
          </div>
        )}
        {url && info.site.published && (
          <div className="ghw-link" style={{ marginTop: 12 }}>
            <a href={url} target="_blank" rel="noreferrer">
              {url}
            </a>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => navigator.clipboard?.writeText(url).then(() => ctx.notify({ type: "success", text: w.copied }))}>
              <Copy size={14} /> {w.copy}
            </button>
            <a className="md-btn md-btn-ghost sa-btn-sm" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> {w.open}
            </a>
          </div>
        )}
        <div className="ms-cards" style={{ marginTop: 14 }}>
          <div className="ms-card c-amber">
            <span className="ms-card-ic">
              <ShoppingBag size={18} />
            </span>
            <b>{info.counts.new}</b>
            <small>{w.status.new}</small>
          </div>
          <div className="ms-card c-blue">
            <span className="ms-card-ic">
              <ClipboardList size={18} />
            </span>
            <b>{info.counts.open}</b>
            <small>{w.inProgress}</small>
          </div>
          <div className="ms-card c-teal">
            <span className="ms-card-ic">
              <Users size={18} />
            </span>
            <b>{info.counts.customers}</b>
            <small>{w.customers}</small>
          </div>
        </div>
      </section>
      <div className="ghw-tabs" role="tablist">
        {["orders", "customers", "rules", "looks"].map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {w.shopTabs[k]}
            {k === "orders" && info.counts.new > 0 && <em>{info.counts.new}</em>}
          </button>
        ))}
      </div>
      {tab === "orders" && <OrdersList ctx={ctx} onChange={load} />}
      {tab === "customers" && <Customers ctx={ctx} w={w} />}
      {tab === "rules" && <Rules ctx={ctx} w={w} info={info} setInfo={setInfo} />}
      {tab === "looks" && <Looks ctx={ctx} w={w} info={info} setInfo={setInfo} reload={load} />}
    </div>
  );
}

// the orders + their buttons — the owner dashboard and the POS
export function OrdersList({ ctx, onChange }) {
  const { cur, lang, readOnly } = ctx;
  const w = useWText();
  const deliveryOn = ctx.pos ? !!ctx.data.addons_on?.mart_delivery : !!ctx.data.addons?.mart_delivery?.active;
  const [filter, setFilter] = useState("open");
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState("");
  const [decline, setDecline] = useState(null);
  const [proof, setProof] = useState("");
  const [cust, setCust] = useState(null);
  const load = useCallback(
    () =>
      ctx.api
        .orders(ctx.id, { status: filter })
        .then((r) => setRows(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx, filter],
  );
  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);
  const step = async (o, k, data) => {
    setBusy(`${o._id}:${k}`);
    try {
      await ctx.api.orderStep(ctx.id, o._id, k, data);
      ctx.notify({ type: "success", text: w.stepDone[k].replace("{no}", o.no) });
      await load();
      onChange?.();
      ctx.onOrders?.(); // the alarm stops once nothing is new
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
      load();
    } finally {
      setBusy("");
    }
  };
  const btn = (o, k, label, cls = "md-btn-primary") => (
    <button type="button" className={`md-btn ${cls} sa-btn-sm`} disabled={readOnly || !!busy} onClick={() => (k === "decline" ? setDecline(o) : step(o, k))} data-testid={`mo-${k}`}>
      {busy === `${o._id}:${k}` ? "…" : label}
    </button>
  );
  return (
    <section className="panel-card">
      <div className="mo-filters">
        {["open", "new", "closed", "all"].map((k) => (
          <button key={k} type="button" className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
            {w.filters[k]}
          </button>
        ))}
      </div>
      {!rows ? (
        <p className="rs-muted">…</p>
      ) : !rows.length ? (
        <div className="mo-empty">
          <ShoppingBag size={30} />
          <p className="rs-muted">{filter === "open" || filter === "new" ? w.noOpen : w.noOrders}</p>
        </div>
      ) : (
        <div className="mo-list">
          {rows.map((o) => (
            <article key={o._id} className={`mo-card s-${o.status}`}>
              <div className="mo-head">
                <span className="mo-no">
                  <b>{o.no}</b>
                  <small className="rs-muted">{fmtDayTime(o.created_date, lang)}</small>
                </span>
                <span className={`rs-pill ${TONE[o.status]}`}>{w.status[o.status]}</span>
              </div>
              <div className="mo-who">
                {canSeeCustomers(ctx) ? (
                  <button type="button" className="mo-name" onClick={() => setCust(o.customer_id)} title={w.seeCustomer}>
                    {o.name}
                  </button>
                ) : (
                  <b>{o.name}</b>
                )}
                <a href={`tel:${o.phone}`}>
                  <Phone size={13} /> {o.phone}
                </a>
              </div>
              <div className="mo-tags">
                <span className={`mo-tag ${o.fulfil}`}>
                  {o.fulfil === "delivery" ? <Truck size={14} /> : <Store size={14} />} {o.fulfil === "delivery" ? w.delivery : w.pickup}
                </span>
                <span className={`mo-tag ${o.pay_method}`}>
                  {o.pay_method === "qr" ? <QrCode size={14} /> : <Banknote size={14} />} {o.pay_method === "qr" ? w.paidQr : w.cash}
                </span>
                {o.sale_no && <span className="mo-tag">{o.sale_no}</span>}
              </div>
              {o.fulfil === "delivery" && o.address?.address && (
                <div className="mo-addr">
                  <MapPin size={14} />
                  <span>
                    {o.address.address}
                    {o.address.note ? <small className="rs-muted"> · {o.address.note}</small> : null}
                  </span>
                  {o.address.map && (
                    <a href={/^https?:\/\//i.test(o.address.map) ? o.address.map : `https://maps.google.com/?q=${encodeURIComponent(o.address.map)}`} target="_blank" rel="noreferrer">
                      {w.map}
                    </a>
                  )}
                </div>
              )}
              <ul className="mo-items">
                {o.items.map((x, i) => (
                  <li key={i}>
                    <span>
                      <b>{x.qty}×</b> {x.name}
                      {(lang === "km" ? x.unit_km : x.unit_en) ? <small className="rs-muted"> / {lang === "km" ? x.unit_km : x.unit_en}</small> : null}
                    </span>
                    <span>{money(x.total, o.currency || cur)}</span>
                  </li>
                ))}
                {(o.promos || []).map((p) => (
                  <li key={p.id || p.name} className="mo-fee promo">
                    <span>
                      🏷 {p.name}
                      {o.coupon && p.code === o.coupon ? ` (${o.coupon})` : ""}
                    </span>
                    <span>−{money(p.amount, o.currency || cur)}</span>
                  </li>
                ))}
                {o.points_value > 0 && (
                  <li className="mo-fee promo">
                    <span>
                      🎁 {xText(lang).pointsOff} ({o.points_used})
                    </span>
                    <span>−{money(o.points_value, o.currency || cur)}</span>
                  </li>
                )}
                {o.delivery_fee > 0 && (
                  <li className="mo-fee">
                    <span>
                      {w.deliveryFee}
                      {o.zone_name ? ` · ${o.zone_name}` : ""}
                    </span>
                    <span>{money(o.delivery_fee, o.currency || cur)}</span>
                  </li>
                )}
                <li className="mo-total">
                  <span>{w.total}</span>
                  <b>{money(o.total, o.currency || cur)}</b>
                </li>
              </ul>
              {o.fulfil === "delivery" && deliveryOn && ["accepted", "ready", "delivering", "done"].includes(o.status) && <OrderDriver ctx={ctx} o={o} />}
              {o.fulfil === "delivery" && !deliveryOn && o.driver_name && <p className="rs-muted">🛵 {o.driver_name}</p>}
              {o.note && <p className="mo-note">“{o.note}”</p>}
              {o.reason && <p className="mo-note bad">{o.reason}</p>}
              {o.proof && (
                <button type="button" className="mo-proof" onClick={() => setProof(o.proof)}>
                  <img src={o.proof} alt="" /> <span>{w.seeProof}</span>
                </button>
              )}
              {OPEN.includes(o.status) && (
                <div className="mo-act">
                  {o.status === "new" && (
                    <>
                      {btn(o, "accept", w.accept)}
                      {btn(o, "decline", w.decline, "md-btn-ghost")}
                    </>
                  )}
                  {o.status === "accepted" && (
                    <>
                      {btn(o, "ready", o.fulfil === "delivery" ? w.sendOut : w.markReady)}
                      {btn(o, "decline", w.cancelOrder, "md-btn-ghost")}
                    </>
                  )}
                  {(o.status === "ready" || o.status === "delivering") && (
                    <>
                      {btn(o, "done", o.pay_method === "cash" ? w.doneCash.replace("{amt}", money(o.total, o.currency || cur)) : w.done)}
                      {btn(o, "decline", w.cancelOrder, "md-btn-ghost")}
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {decline && <DeclineModal w={w} order={decline} onClose={() => setDecline(null)} onSend={(reason) => step(decline, "decline", { reason }).then(() => setDecline(null))} />}
      {cust && <CustomerModal ctx={ctx} cid={cust} onClose={() => setCust(null)} />}
      {proof && (
        <Modal title={w.proof} onClose={() => setProof("")}>
          <img src={proof} alt="" style={{ width: "100%", borderRadius: 12 }} />
        </Modal>
      )}
    </section>
  );
}

function DeclineModal({ w, order, onClose, onSend }) {
  const [reason, setReason] = useState("");
  const quick = w.reasons;
  return (
    <Modal
      title={`${order.status === "new" ? w.decline : w.cancelOrder} · ${order.no}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose}>
            <X size={15} /> {w.back}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={() => onSend(reason)} data-testid="mo-decline-send">
            {order.status === "new" ? w.decline : w.cancelOrder}
          </button>
        </>
      }
    >
      <p className="rs-muted" style={{ marginTop: 0 }}>
        {w.declineSub}
      </p>
      <div className="ghw-chips">
        {quick.map((q) => (
          <button key={q} type="button" className={reason === q ? "on" : ""} onClick={() => setReason(q)}>
            {q}
          </button>
        ))}
      </div>
      <textarea className="mo-reason" rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={w.reasonPh} />
    </Modal>
  );
}

function Customers({ ctx, w }) {
  const { cur, lang, readOnly } = ctx;
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const load = useCallback(
    () =>
      ctx.api
        .customers(ctx.id, q ? { q } : {})
        .then((r) => setData(r))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx, q],
  );
  useEffect(() => {
    const timer = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, q]);
  const block = async (c) => {
    try {
      await ctx.api.saveCustomer(ctx.id, c._id, { blocked: !c.blocked });
      load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  return (
    <section className="panel-card">
      <label className="mo-search">
        <Search size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={w.findCustomer} />
      </label>
      {!data ? (
        <p className="rs-muted">…</p>
      ) : !data.data.length ? (
        <p className="rs-muted">{w.noCustomers}</p>
      ) : (
        <div className="ms-table">
          <div className="ms-tr ms-th mo-cu">
            <span>{w.customer}</span>
            <span>{w.orders}</span>
            <span>{w.spent}</span>
            <span>{w.lastOrder}</span>
            <span />
          </div>
          {data.data.map((c) => (
            <div key={c._id} className={`ms-tr mo-cu ${c.blocked ? "mo-blocked" : ""}`}>
              <button type="button" className="mt-prod-text mo-cu-open" onClick={() => setOpen(c._id)}>
                <span className="mo-cu-ava">{c.avatar ? <img src={c.avatar} alt="" /> : c.name.slice(0, 1).toUpperCase()}</span>
                <span>
                  <b>{c.name}</b>
                  <small>
                    {c.phone}
                    {c.email ? ` · ${c.email}` : ""} · {w.since.replace("{date}", fmtDate(c.created_date, lang))}
                  </small>
                </span>
              </button>
              <span>
                {c.orders} <small className="rs-muted">({c.done} ✓)</small>
              </span>
              <span>{money(c.spent, cur)}</span>
              <span className="rs-muted">{c.last_order ? fmtDate(c.last_order, lang) : "—"}</span>
              <span>
                {!ctx.pos && (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => block(c)} disabled={readOnly}>
                    {c.blocked ? <Check size={14} /> : <UserX size={14} />} {c.blocked ? w.unblock : w.block}
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      {open && <CustomerModal ctx={ctx} cid={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Rules({ ctx, w, info, setInfo }) {
  const { readOnly, cur } = ctx;
  const [f, setF] = useState({ ...info.settings, shop_qr_label: info.qr?.label || "" });
  const [busy, setBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState("");
  const soundPick = useRef(null);
  const upload = async (kind, fn) => {
    setFileBusy(kind);
    try {
      const r = await fn();
      setInfo(r.data);
      ctx.notify({ type: "success", text: w.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setFileBusy("");
    }
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await ctx.api.saveShop(ctx.id, { ...f, delivery_fee: Number(f.delivery_fee) || 0, min_order: Number(f.min_order) || 0 });
      setInfo(r.data);
      setF({ ...r.data.settings, shop_qr_label: r.data.qr?.label || "" });
      ctx.notify({ type: "success", text: w.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const tog = (k, label, sub, disabled) => (
    <label className={`mw-toggle ${f[k] ? "on" : ""} ${disabled ? "off" : ""}`}>
      <input type="checkbox" checked={!!f[k]} disabled={readOnly || disabled} onChange={(e) => setF({ ...f, [k]: e.target.checked })} />
      <span>
        <b>{label}</b>
        <small className="rs-muted">{sub}</small>
      </span>
    </label>
  );
  return (
    <section className="panel-card">
      <h3 className="mt-h">{w.getting}</h3>
      <div className="mw-toggles">
        {tog("pickup_on", w.pickup, w.pickupSub)}
        {tog("delivery_on", w.delivery, w.deliverySub)}
      </div>
      <div className="md-fields-grid" style={{ marginTop: 12 }}>
        <div className="md-field">
          <label htmlFor="mo-fee">
            {w.deliveryFee} ({cur})
          </label>
          <input id="mo-fee" type="number" min={0} step={cur === "KHR" ? 100 : 0.25} value={f.delivery_fee} onChange={(e) => setF({ ...f, delivery_fee: e.target.value })} disabled={readOnly || !f.delivery_on} />
        </div>
        <div className="md-field">
          <label htmlFor="mo-min">
            {w.minOrder} ({cur})
          </label>
          <input id="mo-min" type="number" min={0} step={cur === "KHR" ? 1000 : 1} value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} disabled={readOnly} />
          <small className="rs-muted">{w.minOrderHint}</small>
        </div>
      </div>
      <h3 className="mt-h" style={{ marginTop: 18 }}>
        {w.payment}
      </h3>
      <div className="mw-toggles">
        {tog("shop_cash", w.cash, w.cashSub)}
        {tog("shop_qr", w.qr, info.has_qr ? w.qrSub : w.qrNeed, !info.has_qr)}
      </div>
      <h3 className="mt-h" style={{ marginTop: 18 }}>
        {w.posAccess}
      </h3>
      <div className="mw-toggles">{tog("pos_customers", w.posCustomers, w.posCustomersSub)}</div>
      <div className="mo-qr-box">
        <div className="mo-qr-pick">
          <small className="ghw-label">{w.shopQr}</small>
          <ImagePick
            value={info.qr?.url || ""}
            busy={fileBusy === "qr"}
            disabled={readOnly}
            maxSize={900}
            r={{ upload: ctx.m.upload, change: ctx.m.change2, uploading: ctx.m.uploading, remove: ctx.m.remove }}
            onPick={(file) => upload("qr", () => ctx.api.shopQr(ctx.id, file))}
            onRemove={() => upload("qr", () => ctx.api.removeShopQr(ctx.id))}
          />
        </div>
        <div className="mo-qr-text">
          <small className="rs-muted">{info.qr?.url ? w.shopQrHint : info.qr?.pos_url ? w.shopQrPos : w.shopQrNone}</small>
          <div className="md-field">
            <label htmlFor="mo-qr-label">{w.shopQrLabel}</label>
            <input id="mo-qr-label" maxLength={60} value={f.shop_qr_label} onChange={(e) => setF({ ...f, shop_qr_label: e.target.value })} placeholder="ABA · Lucky Mart · 000 123 456" disabled={readOnly} />
          </div>
        </div>
      </div>
      <div className="md-field" style={{ marginTop: 12 }}>
        <label htmlFor="mo-note">{w.shopNote}</label>
        <textarea id="mo-note" rows={2} maxLength={300} value={f.shop_note} onChange={(e) => setF({ ...f, shop_note: e.target.value })} placeholder={w.shopNotePh} disabled={readOnly} />
      </div>
      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={readOnly || busy}>
          {busy ? w.saving : w.save}
        </button>
      </div>
      <h3 className="mt-h" style={{ marginTop: 22 }}>
        {w.alarm}
      </h3>
      <p className="rs-muted" style={{ margin: "0 0 10px" }}>
        {w.alarmSub}
      </p>
      <div className="mo-sound">
        <span className="ms-card-ic">
          <Music size={18} />
        </span>
        <span className="mt-prod-text">
          <b>{info.sound ? w.alarmOwn : w.alarmDefault}</b>
          <small>{info.sound ? decodeURIComponent(info.sound.split("/").pop() || "") : w.alarmDefaultSub}</small>
        </span>
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => playAlarm(info.sound)} data-testid="mo-test-sound">
          <Play size={14} /> {w.alarmTest}
        </button>
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => soundPick.current?.click()} disabled={readOnly || !!fileBusy}>
          <Music size={14} /> {fileBusy === "sound" ? "…" : w.alarmUpload}
        </button>
        {info.sound && (
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => upload("sound", () => ctx.api.removeShopSound(ctx.id))} disabled={readOnly || !!fileBusy}>
            {w.alarmReset}
          </button>
        )}
        <input
          ref={soundPick}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav,audio/ogg"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload("sound", () => ctx.api.shopSound(ctx.id, file));
          }}
        />
      </div>
    </section>
  );
}

function Looks({ ctx, w, info, setInfo, reload }) {
  const { readOnly, lang } = ctx;
  const [sample, setSample] = useState(null);
  useEffect(() => {
    // the dashboard looks show the shop's own name, logo and a few products
    ctx.api
      .products(ctx.id)
      .then((r) => {
        const rows = (Array.isArray(r.data) ? r.data : r.data?.rows || []).filter((p) => p.active !== false).slice(0, 8);
        const b = ctx.data.business;
        setSample({
          business: { name: b.name, logo: b.logo_url || "", phone: b.phone || "" },
          currency: ctx.data.settings.currency,
          categories: [],
          products: rows.map((p) => ({ _id: p._id, name: p.name, price: p.price, photo: p.photo?.url || p.photo || "", unit_en: "", unit_km: "" })),
          rules: { pickup: true, delivery: true, delivery_fee: 0, min_order: 0, pay: { cash: true, qr: false } },
        });
      })
      .catch(() => {});
  }, [ctx]);
  const setColor = async (c) => {
    try {
      const r = await ctx.api.saveShop(ctx.id, { portal_color: c });
      setInfo(r.data);
      ctx.notify({ type: "success", text: w.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const use = async (k) => {
    try {
      const r = await ctx.api.saveShop(ctx.id, { portal_theme: k });
      setInfo(r.data);
      ctx.notify({ type: "success", text: w.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  return (
    <section className="panel-card">
      <h2 style={{ margin: 0 }}>{w.portalLooksTitle}</h2>
      <p className="rs-muted" style={{ margin: "6px 0 16px" }}>
        {w.portalLooksSub.replace("{price}", info.themes.price)}
      </p>
      <div className="pth-colors">
        <small className="ghw-label">{w.portalColor}</small>
        <div className="ws-color">
          <button type="button" className={`ws-swatch ${!info.themes.color ? "on" : ""}`} onClick={() => setColor("")} style={{ background: MP_LOOKS[info.themes.current]?.accent }} disabled={readOnly} title={w.colorLook}>
            {!info.themes.color && <Check size={14} />}
          </button>
          <span className="rs-muted pth-or">{w.colorLookShort}</span>
          {COLOR_PRESETS.map((c) => (
            <button key={c} type="button" className={`ws-swatch ${info.themes.color === c ? "on" : ""}`} onClick={() => setColor(c)} style={{ background: c }} disabled={readOnly} aria-label={c}>
              {info.themes.color === c && <Check size={14} />}
            </button>
          ))}
          <label
            className={`ws-swatch custom ${info.themes.color && !COLOR_PRESETS.includes(info.themes.color) ? "on" : ""}`}
            style={info.themes.color && !COLOR_PRESETS.includes(info.themes.color) ? { background: info.themes.color } : undefined}
            title={w.colorCustom}
          >
            <input type="color" defaultValue={info.themes.color || MP_LOOKS[info.themes.current]?.accent || "#0f766e"} onBlur={(e) => setColor(e.target.value.toUpperCase())} disabled={readOnly} />
            {info.themes.color && !COLOR_PRESETS.includes(info.themes.color) ? <Check size={14} /> : <Plus size={14} />}
          </label>
        </div>
      </div>
      {!sample ? (
        <p className="rs-muted">…</p>
      ) : (
        <div className="ghw-looks">
          {MP_LOOK_KEYS.map((k) => {
            const owned = k === "classic" || info.themes.owned.includes(k);
            const current = info.themes.current === k;
            return (
              <article key={k} className={`ghw-look ${current ? "on" : ""}`} data-look={k}>
                <MpThumb info={{ ...sample, color: info.themes.current === k ? info.themes.color : "" }} theme={k} lang={lang} />
                {!owned && (
                  <span className="ghl-lock">
                    <Lock size={12} />
                  </span>
                )}
                {k === "classic" && <span className="ghl-free">{w.free}</span>}
                <div className="ghw-look-meta">
                  <b>{mpLookName(k, lang)}</b>
                </div>
                <div className="ghw-look-act">
                  {current ? (
                    <span className="rs-pill ok">
                      <Check size={12} /> {w.inUse}
                    </span>
                  ) : owned ? (
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={readOnly} onClick={() => use(k)}>
                      {w.use}
                    </button>
                  ) : (
                    <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "mart_portal_theme", item: k, onDone: reload })} disabled={readOnly}>
                      <CoinIcon size={13} /> {info.themes.price}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
