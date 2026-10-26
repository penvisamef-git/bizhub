import { useCallback, useEffect, useRef, useState } from "react";
import { Bike, Check, ChevronLeft, ChevronRight, CircleDollarSign, Clock, ExternalLink, History, Image as ImageIcon, Lock, Map as MapIcon, MapPin, MessageSquareText, Package, Phone, ReceiptText, Search, Send, Share2, ShoppingBag, ShoppingCart, Tag, UtensilsCrossed, X } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { Head } from "../menuqr/parts";
import CoinIcon from "../../../components/CoinIcon";
import { ago, fill, fmtNum, fmtTime, money } from "./text";

const MODE_ICON = { delivery: Bike, pickup: ShoppingBag, dine_in: UtensilsCrossed };
const payName = (o, x) => (o.pay.method === "custom" ? o.pay.custom?.name || "" : x.payMethods[o.pay.method]);

// one order: what, who, where, how paid + the buttons for its next step
export function OrderCard({ ctx, o, busy, act, plain = false }) {
  const { x, readOnly } = ctx;
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const Icon = MODE_ICON[o.mode] || ShoppingBag;
  const open = !["done", "cancelled"].includes(o.status);
  const b = (key, label, fn, kind = "ghost", icon = null) => (
    <button type="button" className={`md-btn md-btn-${kind} sa-btn-sm`} disabled={readOnly || !!busy} onClick={fn} data-testid={`ts-o${o.no}-${key}`}>
      {icon} {label}
    </button>
  );
  return (
    <article className={`${plain ? "" : "panel-card"} ts-order s-${o.status} ${plain ? "is-plain" : ""}`} data-testid={`ts-order-${o.no}`}>
      <header className="ts-order-head">
        <b className="ts-order-no">#{o.no}</b>
        <span className={`ts-pill st-${o.status}`}>{x.statuses[o.status]}</span>
        <span className="ts-pill">
          <Icon size={13} /> {x.modes[o.mode]}
          {o.mode === "dine_in" && o.table ? ` ${o.table}` : ""}
        </span>
        <span className={`ts-pill pay-${o.pay.status}`}>
          <CircleDollarSign size={13} /> {payName(o, x)} · {x.payStates[o.pay.status]}
        </span>
        <span className="ts-order-time" title={new Date(o.created_date).toLocaleString()}>
          {fmtTime(o.created_date)} · {ago(o.created_date, x)}
        </span>
        {o.from_remind && (
          <span className="ts-pill st-accepted" title={x.wonBackHint}>
            <ShoppingCart size={13} /> {x.wonBack}
          </span>
        )}
      </header>
      <ul className="ts-lines">
        {o.items.map((l, i) => (
          <li key={i}>
            <span>
              <b>{l.qty} ×</b> {l.name}
              {l.options?.length > 0 && <small> · {l.options.map((c) => c.choice).join(", ")}</small>}
              {l.note && <em> — {l.note}</em>}
            </span>
            <span>{money(l.total, o.currency)}</span>
          </li>
        ))}
        {o.discount > 0 && (
          <li className="ts-line-fee">
            <span>
              <Tag size={12} /> {fill(x.discount, { code: o.promo })}
            </span>
            <span>−{money(o.discount, o.currency)}</span>
          </li>
        )}
        {o.fee > 0 && (
          <li className="ts-line-fee">
            <span>{x.deliveryFee}</span>
            <span>{money(o.fee, o.currency)}</span>
          </li>
        )}
        <li className="ts-line-total">
          <span>{x.total}</span>
          <span>{money(o.total, o.currency)}</span>
        </li>
      </ul>
      <div className="ts-order-who">
        {o.customer?.name && <b>{o.customer.name}</b>}
        {o.customer?.phone && (
          <a href={`tel:${o.customer.phone}`}>
            <Phone size={13} /> {o.customer.phone}
          </a>
        )}
        {o.customer?.username && (
          <a href={`https://t.me/${o.customer.username}`} target="_blank" rel="noreferrer">
            @{o.customer.username}
          </a>
        )}
        <span className="rs-muted">{o.via === "telegram" ? x.viaTelegram : x.viaWeb}</span>
      </div>
      {o.mode === "delivery" && o.address && (
        <p className="ts-order-line">
          <MapPin size={14} /> {o.address}
        </p>
      )}
      {o.mode === "delivery" && o.zone && (
        <p className="ts-order-line">
          <MapIcon size={14} /> {[o.zone.name && !/ km$/.test(o.zone.name) ? o.zone.name : "", o.zone.km !== null ? `${o.zone.km} km` : ""].filter(Boolean).join(" · ")}
          {o.zone.lat !== null && (
            <a href={`https://maps.google.com/?q=${o.zone.lat},${o.zone.lng}`} target="_blank" rel="noreferrer" className="ts-map-link">
              <ExternalLink size={12} /> {x.openMap}
            </a>
          )}
        </p>
      )}
      {o.rider && (
        <p className="ts-order-line" data-testid={`ts-o${o.no}-rider`}>
          <Bike size={14} /> <b>{o.rider.name}</b>
          {o.rider.username ? ` @${o.rider.username}` : ""} · {o.rider.delivered_at ? x.riderDone : o.rider.picked_at ? x.riderPicked : x.riderTook}
          <span className="rs-muted"> · {fmtTime(o.rider.delivered_at || o.rider.picked_at || o.rider.taken_at)}</span>
        </p>
      )}
      {o.mode === "delivery" && !o.rider && o.riders_sent && open && (
        <p className="ts-order-line rs-muted">
          <Bike size={14} /> {x.ridersWaiting}
        </p>
      )}
      {o.note && (
        <p className="ts-order-line">
          <MessageSquareText size={14} /> {o.note}
        </p>
      )}
      {o.status === "accepted" && o.eta_min > 0 && (
        <p className="ts-order-line">
          <Clock size={14} /> {fill(x.eta, { n: o.eta_min })}
        </p>
      )}
      {o.status === "cancelled" && o.reason && (
        <p className="ts-order-line bad">
          <X size={14} /> {o.reason}
        </p>
      )}
      {!rejecting && (open || o.pay.proof || o.pay.status !== "paid") && (
        <div className="ts-order-acts">
          {o.status === "new" && (
            <>
              {b("accept", x.accept, () => act(o, "accepted"), "primary", <Check size={14} />)}
              {b("eta15", fill(x.min, { n: 15 }), () => act(o, "accepted", { eta: 15 }), "ghost", <Clock size={14} />)}
              {b("eta30", fill(x.min, { n: 30 }), () => act(o, "accepted", { eta: 30 }), "ghost", <Clock size={14} />)}
              {b("reject", x.reject, () => setRejecting(true), "ghost", <X size={14} />)}
            </>
          )}
          {o.status === "accepted" && o.mode !== "delivery" && b("ready", x.ready, () => act(o, "ready"), "primary")}
          {o.status === "accepted" && o.mode === "delivery" && b("on_way", x.onWay, () => act(o, "on_way"), "primary", <Bike size={14} />)}
          {["accepted", "ready", "on_way"].includes(o.status) && b("done", x.doneBtn, () => act(o, "done"), o.status === "accepted" ? "ghost" : "primary", <Check size={14} />)}
          {o.pay.status !== "paid" && o.status !== "cancelled" && b("paid", x.markPaid, () => act(o, "paid"), "ghost", <CircleDollarSign size={14} />)}
          {o.mode === "delivery" && ["accepted", "ready"].includes(o.status) && !o.riders_sent && ctx.on("ts_riders") && ctx.data.riders?.connected && b("riders", x.toRiders, () => act(o, "riders"), "ghost", <Send size={14} />)}
          {o.pay.proof && (
            <a className="md-btn md-btn-ghost sa-btn-sm" href={o.pay.proof} target="_blank" rel="noreferrer">
              <ImageIcon size={14} /> {x.seeProof}
            </a>
          )}
        </div>
      )}
      {rejecting && (
        <form
          className="ts-reject"
          onSubmit={(e) => {
            e.preventDefault();
            act(o, "cancelled", { reason }).then(() => setRejecting(false));
          }}
        >
          <label htmlFor={`rj-${o._id}`}>{x.rejectAsk}</label>
          <input id={`rj-${o._id}`} value={reason} maxLength={160} placeholder={x.rejectPh} onChange={(e) => setReason(e.target.value)} autoFocus />
          <div className="ts-order-acts">
            <button type="submit" className="md-btn md-btn-danger sa-btn-sm" disabled={!!busy} data-testid={`ts-o${o.no}-reject-yes`}>
              {x.reject}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setRejecting(false)}>
              {x.cancel}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

// moving an order on (shared by the live board, the history and a customer's page)
export function useOrderActs(ctx, after) {
  const [busy, setBusy] = useState("");
  const act = async (o, status, extra = {}) => {
    setBusy(o._id);
    try {
      const r = status === "paid" ? await ctx.api.paid(o._id) : status === "riders" ? await ctx.api.toRiders(o._id) : await ctx.api.move(o._id, status, extra);
      if (status === "riders") ctx.notify({ type: "success", text: r.message });
      await after?.(r?.data);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
      await after?.();
    } finally {
      setBusy("");
    }
  };
  return { busy, act };
}

// one order in a window (from the history or a customer)
export function OrderModal({ ctx, order, onClose, onChanged }) {
  const [o, setO] = useState(order);
  const { busy, act } = useOrderActs(ctx, async (fresh) => {
    if (fresh) setO(fresh);
    onChanged?.();
  });
  return (
    <Modal title={fill(ctx.x.orderTitle, { n: o.no })} onClose={onClose} size="md-modal-lg">
      <OrderCard ctx={ctx} o={o} busy={busy === o._id} act={act} plain />
    </Modal>
  );
}

// ---------------------------------------------------------------- live board
function LiveView({ ctx }) {
  const { x, api, data, put, cur } = ctx;
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const live = useRef(true);
  const load = useCallback(
    () =>
      api
        .orders({ status: "open" })
        .then((r) => {
          if (!live.current) return;
          setRows(r.data);
          setError("");
          if (r.counts) put((d) => ({ counts: { ...d.counts, ...r.counts } }));
        })
        .catch((e) => live.current && setError(e.message)),
    [api], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    live.current = true;
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 12000);
    return () => {
      live.current = false;
      clearInterval(t);
    };
  }, [load]);
  const { busy, act } = useOrderActs(ctx, load);
  const c = data.counts;
  const noProducts = !c.products;
  return (
    <>
      <div className="ts-kpis">
        {[
          [x.todayOrders, fmtNum(c.today_orders)],
          [x.todaySales, money(c.today_total, cur)],
          [x.openOrders, fmtNum(c.open)],
          [x.waiting, fmtNum(c.new)],
        ].map(([k, v], i) => (
          <div key={k} className={`panel-card ts-kpi ${i === 3 && c.new > 0 ? "hot" : ""}`}>
            <small>{k}</small>
            <b>{v}</b>
          </div>
        ))}
      </div>
      {error && <div className="md-form-error">{error}</div>}
      {rows === null ? (
        <div className="ts-order-skels">
          {[0, 1].map((i) => (
            <div key={i} className="panel-card ts-skel" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <section className="panel-card ts-empty">
          <ReceiptText size={30} />
          <p>{x.noOpen}</p>
          <button type="button" className="md-btn md-btn-primary" onClick={() => ctx.go(noProducts ? "products" : "share")}>
            {noProducts ? <Package size={15} /> : <Share2 size={15} />} {noProducts ? x.addFirst : x.shareStore}
          </button>
        </section>
      ) : (
        <div className="ts-order-list">
          {rows.map((o) => (
            <OrderCard key={o._id} ctx={ctx} o={o} busy={busy === o._id} act={act} />
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- the history: a table with filters
const NONE = { q: "", status: "", mode: "", pay: "", paid: "", from: "", to: "" };
export function OrderTable({ ctx, rows, onOpen, hideWho = false }) {
  const { x, lang } = ctx;
  return (
    <div className="ts-table-wrap">
      <table className="ts-table">
        <thead>
          <tr>
            <th>{x.cols.no}</th>
            <th>{x.cols.when}</th>
            {!hideWho && <th>{x.cols.who}</th>}
            <th>{x.cols.items}</th>
            <th>{x.cols.how}</th>
            <th>{x.cols.pay}</th>
            <th className="num">{x.cols.total}</th>
            <th>{x.cols.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const Icon = MODE_ICON[o.mode] || ShoppingBag;
            const items = o.items.map((l) => `${l.qty}× ${l.name}`).join(", ");
            return (
              <tr key={o._id} onClick={() => onOpen(o)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen(o)} data-testid={`ts-row-${o.no}`}>
                <td className="ts-td-no">#{o.no}</td>
                <td>
                  <span className="ts-td-main">{new Date(o.created_date).toLocaleDateString(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short" })}</span>
                  <small>{fmtTime(o.created_date)}</small>
                </td>
                {!hideWho && (
                  <td>
                    <span className="ts-td-main">{o.customer?.name || "—"}</span>
                    <small>{o.customer?.phone || (o.customer?.username ? `@${o.customer.username}` : "")}</small>
                  </td>
                )}
                <td className="ts-td-items" title={items}>
                  {items}
                </td>
                <td>
                  <span className="ts-pill">
                    <Icon size={12} /> {x.modes[o.mode]}
                    {o.mode === "dine_in" && o.table ? ` ${o.table}` : ""}
                  </span>
                </td>
                <td>
                  <span className={`ts-pill pay-${o.pay.status}`}>
                    {payName(o, x)} · {x.payStates[o.pay.status]}
                  </span>
                </td>
                <td className="num">
                  <b>{money(o.total, o.currency)}</b>
                  {o.discount > 0 && <small>−{money(o.discount, o.currency)}</small>}
                </td>
                <td>
                  <span className={`ts-pill st-${o.status}`}>{x.statuses[o.status]}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
function HistoryView({ ctx }) {
  const { x, api, cur, data } = ctx;
  const [f, setF] = useState(NONE);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [r, setR] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries({ ...f, q, status: f.status || "all", page }).filter(([, v]) => v !== ""));
    return api
      .orders(params)
      .then((res) => setR(res))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [api, f, q, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  const set = (k, v) => {
    setPage(1);
    setF((o) => ({ ...o, [k]: v }));
  };
  const pages = r ? Math.max(1, Math.ceil(r.pagination.total / r.pagination.limit)) : 1;
  const h = r?.history;
  const filtered = Object.values(f).some(Boolean) || q;
  const sel = (k, opts, all) => (
    <select value={f[k]} onChange={(e) => set(k, e.target.value)} aria-label={all}>
      <option value="">{all}</option>
      {opts.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
  return (
    <>
      {h && !h.all && (
        <div className="ts-locked-row ts-history-note">
          <Lock size={15} />
          <span>
            {fill(x.historyLimited, { n: h.days })} {h.hidden > 0 && fill(x.historyHidden, { n: fmtNum(h.hidden) })}
          </span>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "ts_history" })} disabled={ctx.readOnly} data-testid="ts-unlock-ts_history">
            <CoinIcon size={14} /> {x.historyAll} · {fmtNum(data.addons.ts_history?.price)}
          </button>
        </div>
      )}
      <section className="panel-card ts-filters-card">
        <label className="ts-search">
          <Search size={16} />
          <input value={q} onChange={(e) => (setPage(1), setQ(e.target.value))} placeholder={x.searchOrders} aria-label={x.searchOrders} data-testid="ts-hist-q" />
        </label>
        <div className="ts-filter-row">
          {sel("status", ["new", "accepted", "ready", "on_way", "done", "cancelled"].map((k) => [k, x.statuses[k]]), x.allStatus)}
          {sel("mode", ["delivery", "pickup", "dine_in"].map((k) => [k, x.modes[k]]), x.allModes)}
          {sel("pay", [["khqr", "KHQR"], ["cash", x.payMethods.cash], ["custom", x.ownPay]], x.allPay)}
          {sel("paid", [["yes", x.paidYes], ["no", x.paidNo]], `${x.paidYes} / ${x.paidNo}`)}
          <label className="ts-date">
            <span>{x.fromDate}</span>
            <input type="date" value={f.from} onChange={(e) => set("from", e.target.value)} />
          </label>
          <label className="ts-date">
            <span>{x.toDate}</span>
            <input type="date" value={f.to} onChange={(e) => set("to", e.target.value)} />
          </label>
          {filtered && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => (setF(NONE), setQ(""), setPage(1))}>
              <X size={14} /> {x.clear}
            </button>
          )}
        </div>
      </section>
      <section className="panel-card ts-table-card">
        {!r ? (
          <div className="ts-skel" style={{ minHeight: 240 }} />
        ) : r.data.length === 0 ? (
          <div className="ts-empty">
            <History size={28} />
            <p>{x.noOrders}</p>
          </div>
        ) : (
          <>
            <div className="ts-table-top">
              <b>{fill(x.foundN, { n: fmtNum(r.pagination.total), total: money(r.sum, cur) })}</b>
            </div>
            <OrderTable ctx={ctx} rows={r.data} onOpen={setOpen} />
            {pages > 1 && (
              <div className="ts-pager">
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={14} /> {x.prev}
                </button>
                <span>{fill(x.pageOf, { p: page, n: pages })}</span>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  {x.next} <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </section>
      {open && <OrderModal ctx={ctx} order={open} onClose={() => setOpen(null)} onChanged={load} />}
    </>
  );
}

export function OrdersTab({ ctx }) {
  const { x, data } = ctx;
  const [view, setView] = useState("live");
  return (
    <div className="rs-col ts-orders">
      <Head icon={ReceiptText} title={x.tabs.orders} sub={x.ordersSub} />
      <div className="ts-filters" role="tablist">
        {[
          ["live", x.live, data.counts.open],
          ["history", x.history, 0],
        ].map(([k, label, n]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} className={view === k ? "on" : ""} onClick={() => setView(k)} data-testid={`ts-view-${k}`}>
            {k === "history" && <History size={14} />} {label}
            {n > 0 && <span className="rs-badge">{n}</span>}
          </button>
        ))}
      </div>
      {view === "live" ? <LiveView ctx={ctx} /> : <HistoryView ctx={ctx} />}
    </div>
  );
}
