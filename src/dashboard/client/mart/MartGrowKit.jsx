import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { fmtDate, todayKH } from "./text";
import { useXText } from "./xtext";

// shared bits for the newer Mini Mart sections (expiry, loyalty, promotions, profit, purchase, delivery, branches)
export const addonOn = (ctx, k) => (ctx.pos ? !!ctx.data.addons_on?.[k] : !!ctx.data.addons?.[k]?.active);

// load once (and again on reload()); errors go to the notice
export function useLoad(ctx, fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(
    () =>
      fn()
        .then((r) => {
          setData(r.data);
          setError(null);
          return r.data;
        })
        .catch((e) => {
          setError(e);
          if (e.status !== 402) ctx.notify({ type: "error", text: e.message });
        }),
    deps, // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load]);
  return [data, load, error, setData];
}

// the head of a section; locked → the pitch + unlock button
export function AddonHead({ ctx, addon, icon: Icon, title, sub, perks, yearly = true, children }) {
  const x = useXText();
  const a = ctx.data.addons?.[addon] || {};
  const on = addonOn(ctx, addon);
  const price = a.price ?? "";
  const buy = !ctx.pos && (!on || a.status === "expiring");
  return (
    <>
      <section className="panel-card ms-head">
        <div className="ms-head-top">
          <span className="ms-head-ic">
            <Icon size={24} />
          </span>
          <div className="ms-head-text">
            <h2>{title}</h2>
            <small>{on ? (a.expires_at ? x.activeUntil.replace("{date}", fmtDate(a.expires_at, ctx.lang)) : sub) : sub}</small>
          </div>
          <div className="ms-head-btns">
            {on && children}
            {buy && (
              <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon })} disabled={ctx.readOnly} data-testid={`buy-${addon}`}>
                <CoinIcon size={15} /> {on ? x.renew : (yearly ? x.unlockYear : x.unlockOnce).replace("{coins}", price)}
              </button>
            )}
          </div>
        </div>
      </section>
      {!on && (
        <section className="panel-card xs-pitch">
          <span className="xs-pitch-ic">
            <Icon size={34} />
          </span>
          <div>
            <p className="rs-muted">{sub}</p>
            <ul className="at-perks">
              {perks.map((p) => (
                <li key={p}>
                  <Check size={14} /> {p}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

// a product picker with search (the dashboard's product list)
export function ProductPick({ products, value, onPick, placeholder, exclude = [] }) {
  const x = useXText();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const chosen = products.find((p) => p._id === value);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => p.active !== false && !exclude.includes(p._id) && (!t || p.name.toLowerCase().includes(t) || (p.barcode || "").startsWith(t))).slice(0, 30);
  }, [products, q, exclude]);
  if (chosen && !open)
    return (
      <div className="xs-pick on">
        <b>{chosen.name}</b>
        <button type="button" className="md-icon-btn" onClick={() => onPick(null)} aria-label={x.remove}>
          <X size={15} />
        </button>
      </div>
    );
  return (
    <div className="xs-pick-wrap">
      <label className="mt-search">
        <Search size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} placeholder={placeholder || x.pickProduct} data-testid="xs-pick" />
      </label>
      {open && (
        <div className="xs-pick-list">
          {list.map((p) => (
            <button
              key={p._id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(p);
                setOpen(false);
                setQ("");
              }}
            >
              <b>{p.name}</b>
              <small className="rs-muted">{p.barcode || ""}</small>
            </button>
          ))}
          {!list.length && <p className="rs-muted">—</p>}
        </div>
      )}
    </div>
  );
}

// chips to choose several (categories / products)
export function MultiPick({ items, value, onChange }) {
  const x = useXText();
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const shown = items.filter((i) => value.includes(i._id) || !t || i.name.toLowerCase().includes(t)).slice(0, 60);
  return (
    <div className="xs-multi">
      {items.length > 12 && (
        <label className="mt-search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={x.search} />
        </label>
      )}
      <div className="mt-chips">
        {shown.map((i) => (
          <button key={i._id} type="button" className={value.includes(i._id) ? "on" : ""} onClick={() => onChange(value.includes(i._id) ? value.filter((v) => v !== i._id) : [...value, i._id])}>
            {value.includes(i._id) && <Check size={12} />} {i.name}
          </button>
        ))}
      </div>
    </div>
  );
}

const monthOf = (d) => d.slice(0, 7);
const prevMonth = (m) => {
  const [y, mm] = m.split("-").map(Number);
  return mm === 1 ? `${y - 1}-12` : `${y}-${String(mm - 1).padStart(2, "0")}`;
};
// day / month picker for reports → params ({ day } or { month })
export function usePeriod() {
  const [mode, setMode] = useState("month");
  const [day, setDay] = useState(todayKH());
  const [month, setMonth] = useState(monthOf(todayKH()));
  const params = mode === "day" ? { day } : { month };
  return { mode, setMode, day, setDay, month, setMonth, params, key: mode === "day" ? day : month };
}
export function PeriodBar({ p }) {
  const x = useXText();
  const now = monthOf(todayKH());
  return (
    <div className="st-range">
      <div className="at-seg">
        <button
          type="button"
          className={p.mode === "day" && p.day === todayKH() ? "on" : ""}
          onClick={() => {
            p.setMode("day");
            p.setDay(todayKH());
          }}
        >
          {x.today}
        </button>
        <button
          type="button"
          className={p.mode === "month" && p.month === now ? "on" : ""}
          onClick={() => {
            p.setMode("month");
            p.setMonth(now);
          }}
        >
          {x.month}
        </button>
        <button
          type="button"
          className={p.mode === "month" && p.month === prevMonth(now) ? "on" : ""}
          onClick={() => {
            p.setMode("month");
            p.setMonth(prevMonth(now));
          }}
        >
          {x.lastMonth}
        </button>
      </div>
      {p.mode === "day" ? (
        <input type="date" className="mt-date" value={p.day} max={todayKH()} onChange={(e) => e.target.value && p.setDay(e.target.value)} aria-label={x.day} />
      ) : (
        <input type="month" className="mt-date" value={p.month} max={now} onChange={(e) => e.target.value && p.setMonth(e.target.value)} aria-label={x.month} />
      )}
    </div>
  );
}

// a modal's save: busy + error, then notice, reload, close
export function useSave(ctx, onSaved, onClose) {
  const x = useXText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = async (fn, okText) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      ctx.notify({ type: "success", text: okText || x.saved });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return { busy, error, go };
}
