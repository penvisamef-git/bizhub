import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Star, BellRing, Smartphone, BarChart3, CalendarClock, CalendarPlus, ChefHat, MonitorUp, Phone, StickyNote, Clock3, CloudOff, CloudUpload, LockKeyhole, LogOut, Menu as MenuIcon, MoreHorizontal, Percent, Printer, RefreshCw, Search, Send, ShoppingBag, Trash2, Unplug, UtensilsCrossed, Wallet, Wifi, X } from "lucide-react";
import LangSwitch from "../../components/LangSwitch";
import { usePosText } from "../text";
import { activeBookings, addBooking, addLine, dismissGuestAlert, pointsFor, rewardsRules, maxLineDiscount, setLineDiscount, stockLeft, blockedReason, cancelBooking, getPos, seatBooking, setNote, lock, markBill, money, newOrder, openShift, pending, removeLine, sendLines, setDiscount, setLineQty, syncNow, totals, usePos, voidLine, voidOrder } from "../engine";
import { lineOff, lineTotal } from "../calc";
import { fmtMoney, nameOf } from "../util";
import { DiscountModal, ItemModal, ManagerPin, Sheet } from "./Modals";
import PayModal from "./PayModal";
import CloseShift from "./CloseShift";
import UnlinkSheet from "./Unlink";
import Today from "./Today";
import DisplaySheet from "./DisplaySheet";
import MemberSheet from "./MemberSheet";
import { PUBLIC_SITE_URL } from "../../config";
import { showOrder } from "../display";
import { previewDoc, ReceiptDoc } from "./Print";
import { useCartSplit } from "../CartSplit";

// time at the table: 05:12 → 1:05:12 (ticks every second)
const elapsed = (d, now) => {
  const sec = Math.max(0, Math.floor((now - new Date(d)) / 1000));
  const h = Math.floor(sec / 3600);
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return now;
}
const hhmm = (d) => (d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
const clock = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// items guests ordered from the table QR that staff haven't sent yet
const guestNew = (orders) => orders.reduce((n, o) => n + o.lines.filter((l) => l.from === "guest" && l.status === "new").reduce((a, l) => a + l.qty, 0), 0);

export default function Main() {
  const s = usePos();
  const { t } = usePosText();
  const [view, setView] = useState(null); // { orderId } | { table } | { takeaway: true }
  const [closing, setClosing] = useState(false);
  const [today, setToday] = useState(false);
  const blocked = blockedReason(s);
  const noTables = s.setup?.restaurant?.no_tables;

  // an order paid or cancelled on another device closes here too
  const current = view?.orderId ? s.orders[view.orderId] : null;
  useEffect(() => {
    if (view?.orderId && current && current.status !== "open" && !view.paying) setView(null);
  }, [current?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pos">
      <TopBar
        onClose={() => setClosing(true)}
        onToday={() => {
          setView(null);
          setToday(true);
        }}
        todayOn={today && !view}
      />
      {blocked && (
        <div className="pos-blocked">
          <LockKeyhole size={20} />
          <span>{blocked === "locked" ? t.locked : blocked === "offline_off" ? t.offlineOff : t.offlineLong}</span>
          <button type="button" className="pos-btn small" onClick={() => syncNow()}>
            <RefreshCw size={15} /> {t.retry}
          </button>
        </div>
      )}
      {!blocked && s.setup?.pos?.sync_mode === "shift" && pending(s) > 0 && <div className="pos-note">{t.shiftModeWarn}</div>}
      {s.guestAlerts.length > 0 && (
        <div className="pos-guest-alerts" role="status">
          {s.guestAlerts.map((a) => (
            <div key={a.id} className="pos-guest-alert">
              <BellRing size={18} />
              <span>{(a.guest_name ? t.guestAlertBy : t.guestAlert).replace("{table}", a.table_name || t.takeaway1).replace("{n}", a.count).replace("{name}", a.guest_name)}</span>
              <button
                type="button"
                className="pos-btn small primary"
                onClick={() => {
                  dismissGuestAlert(a.id);
                  setToday(false);
                  if (s.orders[a.order_id]) setView({ key: a.order_id, orderId: a.order_id });
                }}
              >
                <Check size={16} /> {t.guestAccept}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="pos-body">
        {today && !view ? (
          <Today onBack={() => setToday(false)} />
        ) : view ? (
          <OrderScreen key={view.key} view={view} setView={setView} disabled={!!blocked} />
        ) : noTables ? (
          <OrdersOnly onOpen={(o) => setView({ key: o._id, orderId: o._id })} onNew={() => setView({ key: `new-${Date.now()}`, takeaway: true })} disabled={!!blocked} />
        ) : (
          <Floor onTable={(table, order) => setView(order ? { key: order._id, orderId: order._id } : { key: `new-${Date.now()}`, table })} onTakeaway={() => setView({ key: `new-${Date.now()}`, takeaway: true })} onOpen={(o) => setView({ key: o._id, orderId: o._id })} disabled={!!blocked} />
        )}
      </div>
      {closing && <CloseShift onClose={() => setClosing(false)} />}
    </div>
  );
}

function TopBar({ onClose, onToday, todayOn }) {
  const s = usePos();
  const { t, lang } = usePosText();
  const [menu, setMenu] = useState(false);
  const [time, setTime] = useState(clock());
  const [unlinking, setUnlinking] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  useEffect(() => {
    const i = setInterval(() => setTime(clock()), 20000);
    return () => clearInterval(i);
  }, []);
  const R = s.setup?.restaurant || {};
  const waiting = pending(s);
  const lic = s.setup?.license || {};
  const graceDays = !lic.active && lic.grace_until ? Math.max(0, Math.ceil((new Date(lic.grace_until) - Date.now()) / 86400000)) : 0;
  return (
    <>
      <header className="pos-top">
        <span className="pos-top-logo">{R.logo ? <img src={R.logo} alt="" /> : <ChefHat size={20} />}</span>
        <div className="pos-top-name">
          <b>{nameOf(R, lang)}</b>
          <small>
            {s.device?.name} · {s.device?.prefix}
          </small>
        </div>
        <button type="button" className={`pos-status ${s.online ? (waiting ? "wait" : "ok") : "off"}`} onClick={() => syncNow()} title={t.syncNow}>
          {s.online ? s.syncing ? <RefreshCw size={15} className="md-spin" /> : waiting ? <CloudUpload size={15} /> : <Wifi size={15} /> : <CloudOff size={15} />}
          <span>{s.online ? (s.syncing ? t.syncing : waiting ? t.waiting.replace("{n}", waiting) : t.online) : `${t.offline}${waiting ? ` · ${t.waiting.replace("{n}", waiting)}` : ""}`}</span>
        </button>
        <button type="button" className={`pos-top-today ${todayOn ? "on" : ""}`} onClick={onToday}>
          <BarChart3 size={16} /> <span>{t.reportsTitle}</span>
        </button>
        <span className="pos-top-staff">{s.staff?.name}</span>
        <span className="pos-top-time">
          <Clock3 size={14} /> {time}
        </span>
        <button type="button" className="pos-icon" onClick={() => setMenu(true)} aria-label={t.more}>
          <MenuIcon size={22} />
        </button>
      </header>
      {displayOpen && <DisplaySheet onClose={() => setDisplayOpen(false)} />}
      {unlinking && <UnlinkSheet onClose={() => setUnlinking(false)} />}
      {graceDays > 0 && <div className="pos-note warn">{t.graceWarn.replace("{n}", graceDays)}</div>}
      {menu && (
        <Sheet title={nameOf(R, lang)} onClose={() => setMenu(false)}>
          <div className="pos-menu">
            <div className="pos-menu-status">
              <span>{s.online ? t.online : t.offline}</span>
              <span>{waiting ? t.waiting.replace("{n}", waiting) : t.allSent}</span>
              {s.lastSync > 0 && <span>{t.lastSync.replace("{t}", new Date(s.lastSync).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }))}</span>}
            </div>
            <button
              type="button"
              className="pos-menu-btn"
              onClick={() => {
                setMenu(false);
                onToday();
              }}
            >
              <BarChart3 size={18} /> {t.reportsTitle}
            </button>
            <button
              type="button"
              className="pos-menu-btn"
              onClick={() => {
                setMenu(false);
                setDisplayOpen(true);
              }}
            >
              <MonitorUp size={18} /> {t.customerDisplay}
            </button>
            <button type="button" className="pos-menu-btn" onClick={() => syncNow()}>
              <RefreshCw size={18} /> {t.syncNow}
            </button>
            <button
              type="button"
              className="pos-menu-btn"
              onClick={() => {
                setMenu(false);
                onClose();
              }}
            >
              <Wallet size={18} /> {t.closeShift}
            </button>
            <button
              type="button"
              className="pos-menu-btn"
              onClick={() => {
                setMenu(false);
                lock();
              }}
            >
              <LogOut size={18} /> {t.switchStaff}
            </button>
            <div className="pos-menu-lang">
              <LangSwitch />
            </div>
            <button
              type="button"
              className="pos-menu-btn danger"
              onClick={() => {
                setMenu(false);
                setUnlinking(true);
              }}
            >
              <Unplug size={18} /> {t.unlink}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}

// ---------- floor: tables + takeaway ----------
function Floor({ onTable, onTakeaway, onOpen, disabled }) {
  const s = usePos();
  const { t } = usePosText();
  const now = useNow();
  const [zone, setZone] = useState("");
  const [show, setShow] = useState("all"); // all | sitting | booked | free
  const [booking, setBooking] = useState(null); // { table? } new booking | { id } one booking
  const zones = s.setup?.zones || [];
  const open = Object.values(s.orders).filter((o) => o.status === "open");
  const byTable = {};
  for (const o of open) if (o.table_id) (byTable[o.table_id] = byTable[o.table_id] || []).push(o);
  const booked = {};
  for (const b of activeBookings(s).sort((a, b2) => new Date(a.time || a.created_at || 0) - new Date(b2.time || b2.created_at || 0))) if (b.table_id && !booked[b.table_id]) booked[b.table_id] = b;
  const stateOf = (tb) => (byTable[tb._id] ? "sitting" : booked[tb._id] ? "booked" : "free");
  const inZone = (s.setup?.tables || []).filter((x) => !zone || String(x.zone_id) === zone);
  const count = { all: inZone.length, sitting: 0, booked: 0, free: 0 };
  for (const tb of inZone) count[stateOf(tb)] += 1;
  const tables = inZone.filter((tb) => show === "all" || stateOf(tb) === show);
  const takeaways = open.filter((o) => !o.table_id).sort((a, b) => new Date(a.opened_at) - new Date(b.opened_at));
  const c = money().currency;
  return (
    <div className="pos-floor">
      <div className="pos-floor-main">
        <div className="pos-floor-bar">
          {zones.length > 0 && (
            <div className="pos-chips">
              <button type="button" className={!zone ? "on" : ""} onClick={() => setZone("")}>
                {t.allZones}
              </button>
              {zones.map((z) => (
                <button key={z._id} type="button" className={zone === z._id ? "on" : ""} onClick={() => setZone(z._id)}>
                  {z.name}
                </button>
              ))}
            </div>
          )}
          <div className="pos-chips pos-show">
            {[
              ["all", t.filterAll],
              ["sitting", t.filterSitting],
              ["booked", t.filterBooked],
              ["free", t.filterFree],
            ].map(([k, label]) => (
              <button key={k} type="button" className={`s-${k} ${show === k ? "on" : ""}`} onClick={() => setShow(k)}>
                {label} <small>{count[k]}</small>
              </button>
            ))}
          </div>
        </div>
        {tables.length === 0 && <p className="pos-muted pos-empty">{t.noTablesHere}</p>}
        <div className="pos-tables">
          {tables.map((tb) => {
            const orders = byTable[tb._id] || [];
            const o = orders[0];
            const bk = booked[tb._id];
            const sum = orders.reduce((a, x) => a + totals(x).total, 0);
            const note = o?.note || "";
            return (
              <button
                key={tb._id}
                type="button"
                className={`pos-table ${o ? "busy" : bk ? "booked" : ""} ${o?.bill_printed ? "bill" : ""}`}
                onClick={() => (o ? onTable(tb, o) : bk ? setBooking({ id: bk._id }) : onTable(tb))}
                disabled={disabled && !o}
              >
                <span className="pos-table-top">
                  <b>{tb.name}</b>
                  {guestNew(orders) > 0 && (
                    <span className="pos-table-guest" title={t.guestNewOrders}>
                      <Smartphone size={12} /> {guestNew(orders)}
                    </span>
                  )}
                  {o && <span className="pos-table-time">{elapsed(o.opened_at, now)}</span>}
                </span>
                {o ? (
                  <>
                    <span className="pos-table-sum">{fmtMoney(sum, c)}</span>
                    <small>
                      {o.bill_printed ? t.billPrinted : `${o.opened_by?.name || ""}`}
                      {orders.length > 1 ? ` · ×${orders.length}` : ""}
                    </small>
                    {note && <small className="pos-table-note">📝 {note}</small>}
                  </>
                ) : bk ? (
                  <>
                    <span className="pos-table-who">{bk.name}</span>
                    <small>
                      {bk.time ? `${t.bookedAt} ${hhmm(bk.time)}` : t.booked}
                      {bk.guests ? ` · ${bk.guests}👤` : ""}
                    </small>
                  </>
                ) : (
                  <small>
                    {t.free}
                    {tb.seats ? ` · ${tb.seats}👤` : ""}
                  </small>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <aside className="pos-floor-side">
        <button type="button" className="pos-btn primary big" onClick={onTakeaway} disabled={disabled}>
          <ShoppingBag size={18} /> {t.newTakeaway}
        </button>
        <button type="button" className="pos-btn big" onClick={() => setBooking({})} disabled={disabled}>
          <CalendarPlus size={18} /> {t.bookTable}
        </button>
        <h3>
          {t.takeaway} <small>{takeaways.length}</small>
        </h3>
        {takeaways.length === 0 && <p className="pos-muted">{t.noOrders}</p>}
        {takeaways.map((o) => (
          <button key={o._id} type="button" className="pos-order-row" onClick={() => onOpen(o)}>
            <b>#{o.number}</b>
            <span>{elapsed(o.opened_at, now)}</span>
            <span className="pos-order-sum">{fmtMoney(totals(o).total, c)}</span>
          </button>
        ))}
        {activeBookings(s).length > 0 && (
          <>
            <h3>
              {t.bookings} <small>{activeBookings(s).length}</small>
            </h3>
            {activeBookings(s).map((b) => (
              <button key={b._id} type="button" className="pos-order-row booked" onClick={() => setBooking({ id: b._id })}>
                <b>{b.table_name || "—"}</b>
                <span>
                  {b.name}
                  {b.time ? ` · ${hhmm(b.time)}` : ""}
                </span>
                <CalendarClock size={16} />
              </button>
            ))}
          </>
        )}
      </aside>
      {booking && !booking.id && <BookingForm tables={s.setup?.tables || []} busy={byTable} booked={booked} onClose={() => setBooking(null)} />}
      {booking?.id && s.bookings[booking.id] && (
        <BookingSheet
          b={s.bookings[booking.id]}
          disabled={disabled}
          onClose={() => setBooking(null)}
          onSeat={async () => {
            const o = await seatBooking(booking.id);
            setBooking(null);
            onOpen(o);
          }}
        />
      )}
    </div>
  );
}

// new booking: table, name, phone (+ time, guests if known)
function BookingForm({ tables, busy, booked, onClose }) {
  const { t } = usePosText();
  const [form, setForm] = useState({ table: "", name: "", phone: "", time: "", guests: "", note: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const table = tables.find((x) => x._id === form.table);
  const ok = form.name.trim() && form.table;
  const save = async () => {
    let time = null;
    if (form.time) {
      const [h, m] = form.time.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      if (d.getTime() < Date.now() - 3 * 3600000) d.setDate(d.getDate() + 1); // a time already gone today → tomorrow
      time = d.toISOString();
    }
    await addBooking({ table, name: form.name, phone: form.phone, time, guests: form.guests, note: form.note });
    onClose();
  };
  return (
    <Sheet
      title={t.bookTable}
      onClose={onClose}
      footer={
        <div className="pos-row-btns">
          <button type="button" className="pos-btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="pos-btn primary" disabled={!ok} onClick={save}>
            <CalendarPlus size={17} /> {t.saveBooking}
          </button>
        </div>
      }
    >
      <div className="pos-form">
        <span className="pos-label">
          {t.table} <small className="pos-muted">· {t.onlyFreeHint}</small>
        </span>
        <div className="pos-chips wrap">
          {tables.map((x) => (
            <button
              key={x._id}
              type="button"
              className={`${form.table === x._id ? "on" : ""} ${busy[x._id] ? "is-busy" : booked[x._id] ? "is-booked" : ""}`}
              onClick={() => setForm({ ...form, table: x._id })}
              disabled={!!busy[x._id] || !!booked[x._id]} // only a free table can be booked
              title={busy[x._id] ? t.busy : booked[x._id] ? t.booked : t.free}
            >
              {x.name}
            </button>
          ))}
        </div>
        <label className="pos-label" htmlFor="bk-name">
          {t.guestName} *
        </label>
        <input id="bk-name" className="pos-input" value={form.name} onChange={set("name")} maxLength={60} autoFocus />
        <label className="pos-label" htmlFor="bk-phone">
          {t.phone}
        </label>
        <input id="bk-phone" className="pos-input" value={form.phone} onChange={set("phone")} maxLength={30} inputMode="tel" placeholder="012 345 678" />
        <div className="pos-form-2">
          <label>
            <span className="pos-label">{t.time}</span>
            <input className="pos-input" type="time" value={form.time} onChange={set("time")} />
          </label>
          <label>
            <span className="pos-label">{t.guests}</span>
            <input className="pos-input" type="number" min="0" max="999" value={form.guests} onChange={set("guests")} inputMode="numeric" />
          </label>
        </div>
        <label className="pos-label" htmlFor="bk-note">
          {t.noteItem}
        </label>
        <input id="bk-note" className="pos-input" value={form.note} onChange={set("note")} maxLength={200} placeholder={t.tableNotePh} />
      </div>
    </Sheet>
  );
}

function BookingSheet({ b, onClose, onSeat, disabled }) {
  const { t } = usePosText();
  const [sure, setSure] = useState(false);
  return (
    <Sheet title={`${t.booked} · ${b.table_name}`} onClose={onClose}>
      <div className="pos-booking">
        <div className="pos-booking-card">
          <b>{b.name}</b>
          {b.phone && (
            <a href={`tel:${b.phone.replace(/\s/g, "")}`}>
              <Phone size={15} /> {b.phone}
            </a>
          )}
          <span>
            {b.time ? `${t.bookedAt} ${hhmm(b.time)}` : t.noTime}
            {b.guests ? ` · ${b.guests} ${t.guests.toLowerCase()}` : ""}
          </span>
          {b.note && <em>{b.note}</em>}
          <small className="pos-muted">
            {t.bookedBy} {b.created_by}
          </small>
        </div>
        <button type="button" className="pos-btn primary big" onClick={onSeat} disabled={disabled}>
          <UtensilsCrossed size={18} /> {t.guestsArrived}
        </button>
        {sure ? (
          <button
            type="button"
            className="pos-btn danger"
            onClick={async () => {
              await cancelBooking(b._id);
              onClose();
            }}
          >
            {t.cancelBookingSure}
          </button>
        ) : (
          <button type="button" className="pos-btn" onClick={() => setSure(true)}>
            <X size={17} /> {t.cancelBooking}
          </button>
        )}
      </div>
    </Sheet>
  );
}

function OrdersOnly({ onOpen, onNew, disabled }) {
  const s = usePos();
  const now = useNow();
  const { t } = usePosText();
  const c = money().currency;
  const open = Object.values(s.orders)
    .filter((o) => o.status === "open")
    .sort((a, b) => new Date(a.opened_at) - new Date(b.opened_at));
  return (
    <div className="pos-orders-only">
      <button type="button" className="pos-btn primary big" onClick={onNew} disabled={disabled}>
        <ShoppingBag size={18} /> {t.newOrder}
      </button>
      <h3>
        {t.openOrders} <small>{open.length}</small>
      </h3>
      {open.length === 0 && <p className="pos-muted">{t.noOrders}</p>}
      <div className="pos-tables">
        {open.map((o) => (
          <button key={o._id} type="button" className="pos-table busy" onClick={() => onOpen(o)}>
            <b>#{o.number}</b>
            <span className="pos-table-sum">{fmtMoney(totals(o).total, c)}</span>
            <small className="pos-table-time">{elapsed(o.opened_at, now)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- one order: menu on the left, ticket on the right ----------
function OrderScreen({ view, setView, disabled }) {
  const s = usePos();
  const { t, lang } = usePosText();
  const [orderId, setOrderId] = useState(view.orderId || null);
  const order = orderId ? s.orders[orderId] : null;
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [item, setItem] = useState(null);
  const [lineSheet, setLineSheetRaw] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const setLineSheet = (l) => {
    setVoidReason("");
    setLineSheetRaw(l);
  };
  const [mgr, setMgr] = useState(null); // { action, line? }
  const [discount, setDiscountOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [more, setMore] = useState(false);
  const [phoneTab, setPhoneTab] = useState("menu");
  const m = money();
  const c = m.currency;
  const payFirst = s.setup?.restaurant?.pay_mode === "before";
  const items = s.setup?.items || [];
  const photoOf = useMemo(() => Object.fromEntries(items.filter((i) => i.photo).map((i) => [String(i._id), i.photo])), [items]);
  const cats = (s.setup?.categories || []).filter((x) => items.some((i) => String(i.category_id) === String(x._id)));
  const groups = s.setup?.addon_groups || [];
  const shown = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((i) => (!cat || String(i.category_id) === cat) && (!qq || `${i.name_en} ${i.name_km} ${i.code || ""}`.toLowerCase().includes(qq)));
  }, [items, cat, q]);
  const tableName = order?.table_name || view.table?.name;
  const [noteOpen, setNoteOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  // the guest's screen follows the order open here
  useEffect(() => {
    showOrder(orderId);
    return () => showOrder(null);
  }, [orderId]);
  const tot = order ? totals(order) : null;
  const lines = (order?.lines || []).filter((l) => l.void_reason !== "removed");
  const hasNew = lines.some((l) => l.status === "new");

  const add = async (choice) => {
    let id = orderId;
    if (!id) {
      const o = await newOrder({ table: view.table, type: view.table ? "dine_in" : "takeaway" });
      id = o._id;
      setOrderId(id);
    }
    await addLine(id, choice);
    setItem(null);
  };
  const tapItem = (i) => {
    if (i.available === false || disabled) return;
    const left = stockLeft(i);
    if (left !== null && left <= 0) return; // sold out
    if ((i.sizes || []).length || (i.addon_group_ids || []).length) setItem(i);
    else add({ item: i, qty: 1 });
  };
  const back = () => setView(null);
  // the cashier moves the order panel: wider / narrower, left / right (kept for them in this browser)
  const split = useCartSplit({ scope: "rest", who: s.staff?._id, whoName: s.staff?.name, thing: "order", normal: 380, lang });

  return (
    <div className={`pos-order tab-${phoneTab} ${split.className}`} style={split.style}>
      <section className="pos-menu-side">
        <div className="pos-menu-top">
          <button type="button" className="pos-btn small" onClick={back}>
            <ArrowLeft size={16} /> {t.back}
          </button>
          <div className="pos-search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label={t.clear}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="pos-chips scroll">
          <button type="button" className={!cat ? "on" : ""} onClick={() => setCat("")}>
            {t.all}
          </button>
          {cats.map((x) => (
            <button key={x._id} type="button" className={cat === String(x._id) ? "on" : ""} onClick={() => setCat(String(x._id))} style={x.color ? { "--chip-c": x.color } : undefined}>
              {nameOf(x, lang)}
            </button>
          ))}
        </div>
        <div className="pos-items">
          {shown.map((i) => {
            const left = stockLeft(i, s);
            const out = i.available === false || (left !== null && left <= 0);
            const low = left !== null && left > 0 && left <= (i.low_stock ?? 5);
            return (
              <button key={i._id} type="button" className={`pos-item ${out ? "sold" : ""}`} onClick={() => tapItem(i)} disabled={disabled}>
                <span className="pos-item-img">
                  {i.photo ? <img src={i.photo} alt="" loading="lazy" /> : <UtensilsCrossed size={22} />}
                  {left !== null && <span className={`pos-stock ${out ? "out" : low ? "low" : ""}`}>{out ? t.soldOut : t.left.replace("{n}", left)}</span>}
                </span>
                <b>{nameOf(i, lang)}</b>
                <span className="pos-item-price">{out ? t.soldOut : fmtMoney(Math.min(i.price, ...(i.sizes || []).map((x) => x.price)), c)}</span>
              </button>
            );
          })}
        </div>
      </section>
      {split.handle}

      <section className="pos-ticket">
        <div className="pos-ticket-head">
          <div>
            <b>{tableName ? `${t.table} ${tableName}` : t.takeaway}</b>
            <small>{order ? `#${order.number} · ${order.opened_by?.name || ""}` : s.staff?.name}</small>
          </div>
          {rewardsRules() && (
            <button type="button" className={`pos-icon ${order?.member?.id ? "on" : ""}`} onClick={() => setMemberOpen(true)} aria-label={t.member} title={t.member} disabled={disabled}>
              <Star size={19} />
            </button>
          )}
          <button type="button" className={`pos-icon ${order?.note ? "on" : ""}`} onClick={() => setNoteOpen(true)} aria-label={t.tableNote} title={t.tableNote} disabled={disabled}>
            <StickyNote size={19} />
          </button>
          {order && (
            <button type="button" className="pos-icon" onClick={() => setMore(true)} aria-label={t.more} disabled={disabled}>
              <MoreHorizontal size={20} />
            </button>
          )}
        </div>
        {order?.note && (
          <button type="button" className="pos-ticket-note" onClick={() => setNoteOpen(true)}>
            📝 {order.note}
          </button>
        )}
        {order?.member?.id && rewardsRules() && (
          <button type="button" className="pos-ticket-member" onClick={() => setMemberOpen(true)}>
            <Star size={14} /> <b>{order.member.name || order.member.phone}</b>
            <small>{order.member.phone}</small>
            {pointsFor(order) > 0 && <em>{t.earnThisBill.replace("{n}", pointsFor(order))}</em>}
          </button>
        )}
        <div className="pos-lines">
          {lines.length === 0 && <p className="pos-muted pos-empty">{t.emptyTicket}</p>}
          {lines.map((l) => (
            <div key={l.id} className={`pos-line s-${l.status}`}>
              <span className="pos-line-img" aria-hidden="true">
                {photoOf[l.item_id] ? <img src={photoOf[l.item_id]} alt="" loading="lazy" /> : <UtensilsCrossed size={16} />}
              </span>
              <button type="button" className="pos-line-main" onClick={() => !disabled && l.status !== "void" && setLineSheet(l)}>
                <span className="pos-line-name">
                  {l.qty > 1 && <b className="pos-line-qty">{l.qty}×</b>}
                  {l.name_en && lang !== "km" ? l.name_en : l.name_km || l.name_en}
                  {l.size && <em> · {l.size}</em>}
                </span>
                {(l.addons?.length > 0 || l.note) && <small>{[...(l.addons || []).map((a) => `+ ${a.name}`), l.note && `“${l.note}”`].filter(Boolean).join(" · ")}</small>}
                {l.from === "guest" && (
                  <small className="pos-line-guest">
                    <Smartphone size={11} /> {t.guestTag}
                    {l.guest_name ? ` · ${l.guest_name}` : ""}
                  </small>
                )}
                {l.status === "void" && <small className="void">{t.statusVoid}</small>}
              </button>
              {(() => {
                const off = lineOff(l);
                const full = lineTotal(l) || l.qty * l.unit_price;
                return (
                  <span className="pos-line-price">
                    {off > 0 && <s>{fmtMoney(full, c)}</s>}
                    {fmtMoney(full - off, c)}
                    {off > 0 && <small className="pos-line-off">{l.discount?.kind ? `−${l.discount.kind === "percent" ? `${l.discount.value}%` : fmtMoney(l.discount.value, c)}${l.discount.reason ? ` · ${l.discount.reason}` : ""}` : `🏷 ${l.promo?.name}`}</small>}
                  </span>
                );
              })()}
              {l.status === "new" && <span className="pos-line-badge">{t.statusNew}</span>}
            </div>
          ))}
        </div>
        {order && (
          <div className="pos-totals">
            <div>
              <span>{t.subtotal}</span>
              <span>{fmtMoney(tot.subtotal, c)}</span>
            </div>
            {tot.item_discount > 0 && (
              <div className="pos-tot-off">
                <span>{t.itemDiscounts}</span>
                <span>−{fmtMoney(tot.item_discount, c)}</span>
              </div>
            )}
            {tot.reward_discount > 0 && (
              <div className="pos-tot-off">
                <span>★ {order.reward_discount?.name || t.reward}</span>
                <span>−{fmtMoney(tot.reward_discount, c)}</span>
              </div>
            )}
            {tot.bill_discount > 0 && (
              <div>
                <span>
                  {t.discount}
                  {order.discount.kind === "percent" ? ` ${order.discount.value}%` : ""}
                </span>
                <span>−{fmtMoney(tot.bill_discount, c)}</span>
              </div>
            )}
            {tot.service > 0 && (
              <div>
                <span>{t.service}</span>
                <span>{fmtMoney(tot.service, c)}</span>
              </div>
            )}
            {tot.vat > 0 && (
              <div>
                <span>{tot.vat_included ? t.vatIncl : t.vat}</span>
                <span>{fmtMoney(tot.vat, c)}</span>
              </div>
            )}
            <div className="grand">
              <span>{t.total}</span>
              <span>
                {fmtMoney(tot.total, c)}
                <small>{fmtMoney(tot.other, c === "USD" ? "KHR" : "USD")}</small>
              </span>
            </div>
          </div>
        )}
        <div className="pos-actions">
          {!payFirst && (
            <>
              <button type="button" className="pos-btn" disabled={!order || !hasNew || disabled} onClick={() => sendLines(order._id).then(back)}>
                <Send size={17} /> {t.send}
              </button>
              <button
                type="button"
                className="pos-btn"
                disabled={!order || !lines.some((l) => l.status !== "void") || disabled}
                onClick={() =>
                  previewDoc(<ReceiptDoc order={order} t={t} />, `${t.billTitle} · #${order.number}`, async () => {
                    const o = await markBill(order._id);
                    return <ReceiptDoc order={o} t={t} />;
                  })
                }
              >
                <Printer size={17} /> {t.bill}
              </button>
            </>
          )}
          <button
            type="button"
            className="pos-btn primary pay"
            disabled={!order || !tot || tot.total <= 0 || disabled}
            onClick={() => {
              setView({ ...view, orderId: order._id, paying: true });
              setPaying(true);
            }}
          >
            <Wallet size={18} /> {t.pay} {tot ? fmtMoney(tot.total, c) : ""}
          </button>
        </div>
      </section>

      <div className="pos-phone-bar">
        <button type="button" className={phoneTab === "menu" ? "on" : ""} onClick={() => setPhoneTab("menu")}>
          {t.menu}
        </button>
        <button type="button" className={phoneTab === "ticket" ? "on" : ""} onClick={() => setPhoneTab("ticket")}>
          {t.order} {tot ? `· ${fmtMoney(tot.total, c)}` : ""} {lines.length ? `(${lines.filter((l) => l.status !== "void").length})` : ""}
        </button>
      </div>

      {memberOpen && (
        <MemberSheet
          order={order}
          siteUrl={PUBLIC_SITE_URL}
          onClose={() => setMemberOpen(false)}
          ensureOrder={async () => {
            if (orderId) return orderId;
            const o = await newOrder({ table: view.table, type: view.table ? "dine_in" : "takeaway" });
            setOrderId(o._id);
            return o._id;
          }}
        />
      )}
      {noteOpen && (
        <NoteSheet
          value={order?.note || ""}
          onClose={() => setNoteOpen(false)}
          onSave={async (text) => {
            let id = orderId;
            if (!id) {
              if (!text.trim()) return setNoteOpen(false);
              const o = await newOrder({ table: view.table, type: view.table ? "dine_in" : "takeaway" });
              id = o._id;
              setOrderId(id);
            }
            await setNote(id, text.trim());
            setNoteOpen(false);
          }}
        />
      )}
      {item && <ItemModal item={item} groups={groups} onAdd={add} onClose={() => setItem(null)} />}
      {lineSheet && (
        <Sheet title={l10nLine(lineSheet, lang)} onClose={() => setLineSheet(null)}>
          <div className="pos-line-sheet">
            <LineDiscount order={order} lineId={lineSheet.id} />
            {lineSheet.status === "new" ? (
              <>
                <div className="pos-qty big">
                  <button type="button" className="pos-icon" onClick={() => setLineQty(order._id, lineSheet.id, lineSheet.qty - 1).then(() => setLineSheet({ ...lineSheet, qty: Math.max(1, lineSheet.qty - 1) }))}>
                    −
                  </button>
                  <b>{lineSheet.qty}</b>
                  <button
                    type="button"
                    className="pos-icon"
                    disabled={(() => {
                      const it = items.find((x) => x._id === lineSheet.item_id);
                      const left = stockLeft(it, s, lineSheet.id);
                      return left !== null && lineSheet.qty + 1 > left;
                    })()}
                    onClick={() => setLineQty(order._id, lineSheet.id, lineSheet.qty + 1).then(() => setLineSheet({ ...lineSheet, qty: lineSheet.qty + 1 }))}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="pos-btn danger"
                  onClick={() => {
                    removeLine(order._id, lineSheet.id);
                    setLineSheet(null);
                  }}
                >
                  <Trash2 size={17} /> {t.cancelItem}
                </button>
              </>
            ) : (
              // already sent: anyone can cancel it (no PIN); the reason and who did it are kept on the bill
              <>
                <input className="pos-input" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder={t.cancelReason} aria-label={t.cancelReason} maxLength={120} />
                <button
                  type="button"
                  className="pos-btn danger"
                  onClick={() => {
                    voidLine(order._id, lineSheet.id, voidReason.trim() || t.statusVoid);
                    setLineSheet(null);
                  }}
                >
                  <Trash2 size={17} /> {t.cancelItem}
                </button>
              </>
            )}
          </div>
        </Sheet>
      )}
      {more && (
        <Sheet title={`#${order.number}`} onClose={() => setMore(false)}>
          <div className="pos-menu">
            <button
              type="button"
              className="pos-menu-btn"
              onClick={() => {
                setMore(false);
                setDiscountOpen(getPos().staff || true); // no manager PIN: the cashier gives it, their name is kept
              }}
            >
              <Percent size={18} /> {t.addDiscount}
            </button>
            <button
              type="button"
              className="pos-menu-btn danger"
              onClick={() => {
                setMore(false);
                setVoidReason("");
                setCancelling(true);
              }}
            >
              <Trash2 size={18} /> {t.cancelOrder}
            </button>
          </div>
        </Sheet>
      )}
      {cancelling && (
        // cancel the whole order: no manager PIN, the reason and who did it are kept on the bill
        <Sheet title={`${t.cancelOrder} · #${order.number}`} onClose={() => setCancelling(false)}>
          <div className="pos-line-sheet">
            <input className="pos-input" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder={t.cancelReason} aria-label={t.cancelReason} maxLength={120} autoFocus />
            <button
              type="button"
              className="pos-btn danger"
              onClick={async () => {
                setCancelling(false);
                await voidOrder(order._id, voidReason.trim() || t.statusVoid);
                back();
              }}
            >
              <Trash2 size={17} /> {t.cancelOrder}
            </button>
          </div>
        </Sheet>
      )}
      {mgr && (
        <ManagerPin
          withReason={mgr.action !== "discount"}
          onClose={() => setMgr(null)}
          onOk={async (manager, reason) => {
            const a = mgr;
            setMgr(null);
            if (a.action === "void-line") await voidLine(order._id, a.line.id, reason, manager);
            if (a.action === "void-order") {
              await voidOrder(order._id, reason, manager);
              back();
            }
            if (a.action === "discount") setDiscountOpen(manager);
          }}
        />
      )}
      {discount && (
        <DiscountModal
          order={order}
          onClose={() => setDiscountOpen(false)}
          onApply={async (kind, value) => {
            await setDiscount(order._id, kind, value, discount);
            setDiscountOpen(false);
          }}
        />
      )}
      {paying && order && (
        <PayModal
          order={order}
          onClose={() => {
            setPaying(false);
            setView({ ...view, orderId: order._id, paying: false });
          }}
          onDone={() => {
            setPaying(false);
            back();
          }}
        />
      )}
    </div>
  );
}

// a discount on one item: % or $ off, with a reason (the owner sets the biggest % allowed)
function LineDiscount({ order, lineId }) {
  const { t } = usePosText();
  const line = order?.lines.find((l) => l.id === lineId);
  const [kind, setKind] = useState(line?.discount?.kind || "percent");
  const [value, setValue] = useState(line?.discount?.value ? String(line.discount.value) : "");
  const [reason, setReason] = useState(line?.discount?.reason || "");
  if (!line) return null;
  const c = money().currency;
  const cap = maxLineDiscount();
  const full = lineTotal(line);
  if (cap <= 0) return null;
  const apply = (k, v) => setLineDiscount(order._id, lineId, k, v, reason.trim());
  const quick = [10, 20, 50, 100].filter((p) => p <= cap);
  if (!quick.includes(cap)) quick.push(cap); // the owner's limit is always one tap away
  return (
    <div className="pos-line-disc">
      <div className="pos-line-disc-head">
        <b>
          <Percent size={15} /> {t.itemDiscount}
        </b>
        {line.promo?.off > 0 && !line.discount?.kind && <small className="pos-line-off">🏷 {line.promo.name} · −{fmtMoney(line.promo.off, c)}</small>}
      </div>
      <div className="pos-chips">
        {quick.map((p) => (
          <button key={p} type="button" className={line.discount?.kind === "percent" && Number(line.discount.value) === p ? "on" : ""} onClick={() => apply("percent", p)}>
            {p === 100 ? t.free : `${p}%`}
          </button>
        ))}
      </div>
      <div className="pos-line-disc-row">
        <div className="pos-seg">
          <button type="button" className={kind === "percent" ? "on" : ""} onClick={() => setKind("percent")}>
            %
          </button>
          <button type="button" className={kind === "amount" ? "on" : ""} onClick={() => setKind("amount")}>
            {c === "KHR" ? "៛" : "$"}
          </button>
        </div>
        <input className="pos-input" type="number" min="0" step={kind === "percent" ? 1 : c === "KHR" ? 100 : 0.05} value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === "percent" ? `≤ ${cap}` : `≤ ${fmtMoney((full * cap) / 100, c)}`} aria-label={t.itemDiscount} />
        <button type="button" className="pos-btn small primary" disabled={!(Number(value) > 0)} onClick={() => apply(kind, Number(value))}>
          {t.apply}
        </button>
      </div>
      <input className="pos-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.discountReasonPh} maxLength={80} aria-label={t.reason} />
      {line.discount?.kind && (
        <button type="button" className="pos-btn small" onClick={() => apply("", 0)}>
          <X size={15} /> {t.removeItemDiscount}
        </button>
      )}
      {cap < 100 && <small className="pos-muted">{t.maxDiscountHint.replace("{n}", cap)}</small>}
    </div>
  );
}

function NoteSheet({ value, onSave, onClose }) {
  const { t } = usePosText();
  const [text, setText] = useState(value);
  return (
    <Sheet
      title={t.tableNote}
      onClose={onClose}
      footer={
        <div className="pos-row-btns">
          <button type="button" className="pos-btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="pos-btn primary" onClick={() => onSave(text)}>
            {t.save}
          </button>
        </div>
      }
    >
      <textarea className="pos-input pos-textarea" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} rows={4} placeholder={t.tableNotePh} autoFocus />
      <div className="pos-chips wrap pos-note-quick">
        {t.noteQuick.map((q) => (
          <button key={q} type="button" onClick={() => setText((x) => (x ? `${x}, ${q}` : q))}>
            {q}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

const l10nLine = (l, lang) => `${l.qty}× ${lang === "km" ? l.name_km || l.name_en : l.name_en || l.name_km}${l.size ? ` · ${l.size}` : ""}`;
