import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Ban, CalendarDays, Printer, ReceiptText, RefreshCw, Search, TrendingUp, Users, Wallet, X } from "lucide-react";
import { usePosText } from "../text";
import { getPos, money, openShift, totals, usePos } from "../engine";
import { posApi } from "../api";
import { otherCurrency, salesReport } from "../calc";
import { fmtMoney, nameOf } from "../util";
import { previewDoc, ReceiptDoc } from "./Print";

const fmtDay = (d, lang) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
const hhmm = (d) => (d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
const dayTime = (d, multi) => (d ? new Date(d).toLocaleString("en-GB", multi ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit" }) : "");

const TZ = 7; // Cambodia
const localToday = () => new Date(Date.now() + TZ * 3600000).toISOString().slice(0, 10);
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const rangeOf = (key, custom) => {
  const today = localToday();
  if (key === "yesterday") return { from: addDays(today, -1), to: addDays(today, -1) };
  if (key === "d7") return { from: addDays(today, -6), to: today };
  if (key === "d30") return { from: addDays(today, -29), to: today };
  if (key === "custom") return custom;
  return { from: today, to: today };
};

// The POS's own reports: sales of every device on any days (or just this shift, offline) + every bill, reprintable
export default function Today({ onBack }) {
  const s = usePos();
  const { t, lang } = usePosText();
  const [scope, setScope] = useState("today"); // shift | today | yesterday | d7 | d30 | custom
  const [custom, setCustom] = useState(() => ({ from: localToday(), to: localToday() }));
  const [remote, setRemote] = useState(null); // { report, orders, at, range, history, total }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const m = money();
  const c = m.currency;
  const shift = openShift(s);

  // this shift: worked out on the device (works offline too)
  const local = useMemo(() => {
    const orders = Object.values(s.orders).filter((o) => shift && o.shift_id === shift._id);
    return { orders, report: salesReport(orders, m) };
  }, [s.orders, shift?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const range = scope === "shift" ? null : rangeOf(scope, custom);
  const loadRange = useCallback(async () => {
    if (!range) return;
    setLoading(true);
    setError("");
    try {
      const data = await posApi.report(getPos().token, range.from, range.to);
      const byId = new Map(data.orders.map((o) => [o._id, o]));
      if (data.range.to === data.range.today) {
        // bills still waiting on this device are newer than the cloud's copy
        for (const o of Object.values(getPos().orders)) if (o._dirty && (byId.has(o._id) || o.status !== "open")) byId.set(o._id, o);
        // open bills of every device are already on this one
        for (const o of Object.values(getPos().orders)) if (o.status === "open" && !byId.has(o._id)) byId.set(o._id, o);
      }
      setRemote({ report: data.report, orders: [...byId.values()], at: Date.now(), range: data.range, history: data.history, total: data.bills_total });
    } catch (e) {
      setError(e.status === 0 ? t.needInternet : e.message);
    } finally {
      setLoading(false);
    }
  }, [range?.from, range?.to, t.needInternet]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadRange();
  }, [loadRange]);

  const showDay = scope !== "shift" && remote && !error && !loading;
  // offline (or still loading): this shift, worked out on the device
  const report = showDay ? remote.report : local.report;
  const orders = showDay ? remote.orders : local.orders;
  const moreBills = showDay && remote.total > remote.orders.length ? remote.total - remote.orders.length : 0;
  const open = orders.filter((o) => o.status === "open").length;
  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return orders
      .filter((o) => filter === "all" || o.status === filter)
      .filter((o) => !qq || `${o.number} ${o.table_name || ""}`.toLowerCase().includes(qq))
      .sort((a, b) => new Date(b.paid_at || b.opened_at) - new Date(a.paid_at || a.opened_at));
  }, [orders, q, filter]);
  const items = report.by_item.slice(0, 8);
  const maxQty = Math.max(1, ...items.map((i) => i.qty));
  const methodsTotal = report.by_method.reduce((a, x) => a + Math.max(0, x.value), 0) || 1;

  const openBill = (o) => {
    const paid = o.status === "paid";
    const title = `${paid ? t.receipt : o.status === "void" ? t.fCancelled : t.billTitle} · #${o.number}`;
    previewDoc(<ReceiptDoc order={o} t={t} paidView={paid} />, title);
  };

  return (
    <div className="pos-today">
      <div className="pos-today-top">
        <button type="button" className="pos-btn small" onClick={onBack}>
          <ArrowLeft size={16} /> {t.back}
        </button>
        <h2>{t.reportsTitle}</h2>
        {scope !== "shift" && (
          <button type="button" className="pos-icon" onClick={loadRange} disabled={loading} aria-label={t.refresh}>
            <RefreshCw size={18} className={loading ? "md-spin" : ""} />
          </button>
        )}
      </div>
      <div className="pos-chips scroll pos-today-range">
        {[
          ["today", t.today],
          ["yesterday", t.yesterday],
          ["d7", t.last7],
          ["d30", t.last30],
          ["custom", t.pickDates],
          ["shift", t.myShift],
        ].map(([k, label]) => (
          <button key={k} type="button" className={scope === k ? "on" : ""} onClick={() => setScope(k)}>
            {k === "custom" && <CalendarDays size={15} />} {label}
          </button>
        ))}
      </div>
      {scope === "custom" && (
        <div className="pos-dates">
          <label>
            <span>{t.from}</span>
            <input type="date" value={custom.from} max={localToday()} onChange={(e) => e.target.value && setCustom((x) => ({ ...x, from: e.target.value }))} />
          </label>
          <label>
            <span>{t.to}</span>
            <input type="date" value={custom.to} max={localToday()} onChange={(e) => e.target.value && setCustom((x) => ({ ...x, to: e.target.value }))} />
          </label>
        </div>
      )}
      {scope !== "shift" && error && <div className="pos-note warn">{error}</div>}
      {showDay && remote.history.limited && <div className="pos-note">{t.historyCut.replace("{n}", remote.history.free_days)}</div>}
      <p className="pos-muted pos-today-sub">
        {scope === "shift"
          ? shift
            ? `${t.shiftStarted.replace("{t}", hhmm(shift.opened_at))} · ${shift.opened_by?.name || ""}`
            : ""
          : showDay
            ? `${fmtDay(remote.range.from, lang)}${remote.range.from !== remote.range.to ? ` → ${fmtDay(remote.range.to, lang)}` : ""} · ${t.allDevicesShort} · ${t.updated.replace("{t}", hhmm(remote.at))}`
            : error
              ? t.shiftInstead
              : t.loadingReport}
      </p>

      <div className="pos-today-grid">
        <div className="pos-today-stats">
          <div className="pos-kpis">
            <Kpi icon={TrendingUp} label={t.sales} value={fmtMoney(report.sales, c)} sub={fmtMoney(otherCurrency(report.sales, m), c === "USD" ? "KHR" : "USD")} main />
            <Kpi icon={ReceiptText} label={t.bills} value={report.bills} sub={open ? `${open} ${t.fOpen.toLowerCase()}` : ""} />
            <Kpi icon={Users} label={t.avgBill} value={fmtMoney(report.avg, c)} />
            <Kpi icon={Ban} label={t.cancelledBills} value={report.void_orders} sub={report.void_value ? fmtMoney(report.void_value, c) : ""} warn={report.void_orders > 0} />
          </div>

          <section className="pos-panel">
            <h3>
              <Wallet size={16} /> {t.byMethod}
            </h3>
            {report.by_method.length === 0 && <p className="pos-muted">—</p>}
            {report.by_method.map((x) => (
              <div key={x.name} className="pos-bar-row">
                <span>
                  {x.name} <small>×{x.count}</small>
                </span>
                <b>{fmtMoney(x.value, c)}</b>
                <i style={{ "--w": `${Math.round((Math.max(0, x.value) / methodsTotal) * 100)}%` }} />
              </div>
            ))}
          </section>

          <section className="pos-panel">
            <h3>{t.topItems}</h3>
            {items.length === 0 && <p className="pos-muted">—</p>}
            {items.map((x) => (
              <div key={x.key} className="pos-bar-row">
                <span>
                  {nameOf(x, lang)}
                  {x.size ? ` · ${x.size}` : ""}
                </span>
                <b>×{x.qty}</b>
                <i style={{ "--w": `${Math.round((x.qty / maxQty) * 100)}%` }} />
              </div>
            ))}
          </section>

          {showDay && report.by_staff.length > 0 && (
            <section className="pos-panel">
              <h3>{t.byStaff}</h3>
              {report.by_staff.map((x) => (
                <div key={x.name} className="pos-kv">
                  <span>
                    {x.name} <small>· {x.bills}</small>
                  </span>
                  <b>{fmtMoney(x.sales, c)}</b>
                </div>
              ))}
            </section>
          )}
          <section className="pos-panel">
            <h3>{t.byType}</h3>
            <div className="pos-kv">
              <span>
                {t.dineIn} <small>· {report.by_type.dine_in.bills}</small>
              </span>
              <b>{fmtMoney(report.by_type.dine_in.sales, c)}</b>
            </div>
            <div className="pos-kv">
              <span>
                {t.takeaway} <small>· {report.by_type.takeaway.bills}</small>
              </span>
              <b>{fmtMoney(report.by_type.takeaway.sales, c)}</b>
            </div>
            {report.discounts > 0 && (
              <div className="pos-kv">
                <span>{t.discounts}</span>
                <b>−{fmtMoney(report.discounts, c)}</b>
              </div>
            )}
          </section>
        </div>

        <section className="pos-panel pos-today-bills">
          <h3>
            <ReceiptText size={16} /> {t.invoices} <small>{list.length}</small>
          </h3>
          <div className="pos-search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchBills} aria-label={t.searchBills} />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label={t.clear}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="pos-chips">
            {[
              ["all", t.all],
              ["paid", t.fPaid],
              ["open", t.fOpen],
              ["void", t.fCancelled],
            ].map(([k, label]) => (
              <button key={k} type="button" className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                {label}
              </button>
            ))}
          </div>
          <div className="pos-bill-list">
            {list.length === 0 && <p className="pos-muted pos-empty">{t.noBills}</p>}
            {moreBills > 0 && <p className="pos-muted pos-empty">{t.moreBills.replace("{n}", moreBills)}</p>}
            {list.map((o) => {
              const total = totals(o).total;
              return (
                <button key={o._id} type="button" className={`pos-bill-row s-${o.status}`} onClick={() => openBill(o)}>
                  <b>#{o.number}</b>
                  <span className="pos-bill-where">
                    {o.table_name ? `${t.table} ${o.table_name}` : t.takeaway}
                    <small>
                      {dayTime(o.paid_at || o.opened_at, showDay && remote.range.days > 1)} · {o.closed_by?.name || o.opened_by?.name || ""}
                      {o.device_name ? ` · ${o.device_name}` : ""}
                    </small>
                  </span>
                  <span className="pos-bill-sum">
                    {fmtMoney(total, c)}
                    <small className={`pos-pill s-${o.status}`}>{o.status === "paid" ? t.fPaid : o.status === "void" ? t.fCancelled : t.fOpen}</small>
                  </span>
                  <Printer size={16} className="pos-bill-print" />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, main, warn }) {
  return (
    <div className={`pos-kpi ${main ? "main" : ""} ${warn ? "warn" : ""}`}>
      <span>
        <Icon size={15} /> {label}
      </span>
      <b>{value}</b>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}
