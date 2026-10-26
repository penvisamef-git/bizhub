import { useCallback, useEffect, useRef, useState } from "react";
import { Bike, Check, CircleDollarSign, Clock, Image as ImageIcon, MapPin, MessageSquareText, Phone, ReceiptText, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import { Head } from "../menuqr/parts";
import { ago, fill, fmtTime, money } from "./text";

const MODE_ICON = { delivery: Bike, pickup: ShoppingBag, dine_in: UtensilsCrossed };

// one order card: what, who, where, how paid + the buttons for its next step
function OrderCard({ ctx, o, busy, act }) {
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
    <article className={`panel-card ts-order s-${o.status}`} data-testid={`ts-order-${o.no}`}>
      <header className="ts-order-head">
        <b className="ts-order-no">#{o.no}</b>
        <span className={`ts-pill st-${o.status}`}>{x.statuses[o.status]}</span>
        <span className="ts-pill">
          <Icon size={13} /> {x.modes[o.mode]}
          {o.mode === "dine_in" && o.table ? ` ${o.table}` : ""}
        </span>
        <span className={`ts-pill pay-${o.pay.status}`}>
          <CircleDollarSign size={13} /> {x.payMethods[o.pay.method]} · {x.payStates[o.pay.status]}
        </span>
        <span className="ts-order-time" title={new Date(o.created_date).toLocaleString()}>
          {fmtTime(o.created_date)} · {ago(o.created_date, x)}
        </span>
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
      {open && !rejecting && (
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
          {o.pay.status !== "paid" && b("paid", x.markPaid, () => act(o, "paid"), "ghost", <CircleDollarSign size={14} />)}
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

// Orders: open ones first (oldest on top), refreshed every 12 s; Done / Cancelled lists
export function OrdersTab({ ctx }) {
  const { x, api, data, put, cur } = ctx;
  const [filter, setFilter] = useState("open");
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const live = useRef(true);
  const load = useCallback(
    () =>
      api
        .orders({ status: filter })
        .then((r) => {
          if (!live.current) return;
          setRows(r.data);
          setError("");
          if (r.counts) put((d) => ({ counts: { ...d.counts, ...r.counts } }));
        })
        .catch((e) => live.current && setError(e.message)),
    [api, filter], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    live.current = true;
    setRows(null);
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 12000);
    return () => {
      live.current = false;
      clearInterval(t);
    };
  }, [load]);

  const act = async (o, status, extra = {}) => {
    setBusy(o._id);
    try {
      if (status === "paid") await api.paid(o._id);
      else await api.move(o._id, status, extra);
      await load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
      load();
    } finally {
      setBusy("");
    }
  };

  const c = data.counts;
  return (
    <div className="rs-tab ts-orders">
      <Head icon={ReceiptText} title={x.tabs.orders} sub={x.ordersSub}>
        <div className="ts-today">
          <b>{x.today}</b>
          <span>{fill(x.todaySub, { n: c.today_orders, total: money(c.today_total, cur) })}</span>
        </div>
      </Head>
      <div className="ts-filters" role="tablist">
        {["open", "done", "cancelled"].map((k) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)} data-testid={`ts-filter-${k}`}>
            {x.filters[k]}
            {k === "open" && c.open > 0 && <span className="rs-badge">{c.open}</span>}
          </button>
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
        <section className="panel-card sa-empty-state">
          <ReceiptText size={26} />
          <p>{filter === "open" ? x.noOpen : x.noOrders}</p>
        </section>
      ) : (
        <div className="ts-order-list">
          {rows.map((o) => (
            <OrderCard key={o._id} ctx={ctx} o={o} busy={busy === o._id} act={act} />
          ))}
        </div>
      )}
    </div>
  );
}
