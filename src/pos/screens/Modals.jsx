import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, ShieldCheck, X } from "lucide-react";
import { usePosText } from "../text";
import { managerPin, money, stockLeft } from "../engine";
import { fmtMoney, nameOf } from "../util";
import Keypad, { PinDots } from "./Keypad";

export function Sheet({ title, onClose, children, wide, footer }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return createPortal(
    <div className="pos-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`pos-sheet ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="pos-sheet-head">
          <b>{title}</b>
          <button type="button" className="pos-icon" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="pos-sheet-body">{children}</div>
        {footer && <div className="pos-sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// a manager approves (cancel a sent item, cancel an order, discount)
export function ManagerPin({ onOk, onClose, withReason }) {
  const { t } = usePosText();
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    if (pin.length !== 4) return;
    const m = managerPin(pin);
    if (m && (!withReason || reason.trim())) onOk(m, reason.trim());
    else if (!m) {
      setError(true);
      setTimeout(() => {
        setError(false);
        setPin("");
      }, 600);
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet title={t.managerPin} onClose={onClose}>
      <div className="pos-mgr">
        <ShieldCheck size={26} />
        <p className="pos-muted">{error ? t.notManager : t.managerPinSub}</p>
        {withReason && <input className="pos-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.reasonPh} aria-label={t.reason} maxLength={120} autoFocus />}
        <PinDots length={pin.length} error={error} />
        <Keypad value={pin} onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))} max={4} disabled={withReason && !reason.trim()} />
      </div>
    </Sheet>
  );
}

// choose size, add-ons, note, qty
export function ItemModal({ item, groups, onAdd, onClose }) {
  const { t, lang } = usePosText();
  const c = money().currency;
  const [size, setSize] = useState(item.sizes?.length ? null : undefined); // null = base price chosen
  const [picked, setPicked] = useState({}); // groupId → [option names]
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const left = stockLeft(item); // null = stock not tracked
  const myGroups = useMemo(() => (item.addon_group_ids || []).map((id) => groups.find((g) => g._id === id)).filter(Boolean), [item, groups]);
  const sizes = item.sizes || [];
  const toggle = (g, o) =>
    setPicked((p) => {
      const cur = p[g._id] || [];
      if (cur.includes(o.name)) return { ...p, [g._id]: cur.filter((x) => x !== o.name) };
      if (g.max === 1) return { ...p, [g._id]: [o.name] };
      if (g.max && cur.length >= g.max) return p;
      return { ...p, [g._id]: [...cur, o.name] };
    });
  const missing = myGroups.some((g) => (picked[g._id] || []).length < Math.max(g.required ? 1 : 0, g.min || 0));
  const addons = myGroups.flatMap((g) => (picked[g._id] || []).map((name) => ({ group: g.name, name, price: g.options.find((o) => o.name === name)?.price || 0 })));
  const unit = (size ? Number(size.price) : Number(item.price)) + addons.reduce((a, x) => a + x.price, 0);
  return (
    <Sheet
      title={nameOf(item, lang)}
      onClose={onClose}
      footer={
        <>
          <div className="pos-qty">
            <button type="button" className="pos-icon" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="−">
              <Minus size={18} />
            </button>
            <b>{qty}</b>
            <button type="button" className="pos-icon" onClick={() => setQty(qty + 1)} aria-label="+" disabled={left !== null && qty >= left}>
              <Plus size={18} />
            </button>
          </div>
          {left !== null && <small className="pos-left-note">{t.onlyLeft.replace("{n}", left)}</small>}
          <button type="button" className="pos-btn primary" disabled={missing || (left !== null && qty > left)} onClick={() => onAdd({ item, size: size || null, addons, qty, note: note.trim() })}>
            {t.add} · {fmtMoney(unit * qty, c)}
          </button>
        </>
      }
    >
      {sizes.length > 0 && (
        <div className="pos-opt-group">
          <h4>{t.size}</h4>
          <div className="pos-chips">
            <button type="button" className={!size ? "on" : ""} onClick={() => setSize(null)}>
              {t.regular} · {fmtMoney(item.price, c)}
            </button>
            {sizes.map((s) => (
              <button key={s.name} type="button" className={size?.name === s.name ? "on" : ""} onClick={() => setSize(s)}>
                {s.name} · {fmtMoney(s.price, c)}
              </button>
            ))}
          </div>
        </div>
      )}
      {myGroups.map((g) => (
        <div key={g._id} className="pos-opt-group">
          <h4>
            {g.name}{" "}
            <small>
              {g.required || g.min ? t.pickAtLeast.replace("{n}", Math.max(1, g.min || 0)) : ""} {g.max ? `· ${t.pickUpTo.replace("{n}", g.max)}` : ""}
            </small>
          </h4>
          <div className="pos-chips">
            {g.options.map((o) => (
              <button key={o.name} type="button" className={(picked[g._id] || []).includes(o.name) ? "on" : ""} onClick={() => toggle(g, o)}>
                {o.name}
                {o.price > 0 ? ` +${fmtMoney(o.price, c)}` : ""}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="pos-opt-group">
        <h4>{t.noteItem}</h4>
        <input className="pos-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePh} maxLength={200} />
      </div>
    </Sheet>
  );
}

// discount: percent or amount (manager approves first)
export function DiscountModal({ order, onApply, onClose }) {
  const { t } = usePosText();
  const c = money().currency;
  const [kind, setKind] = useState(order.discount?.kind || "percent");
  const [value, setValue] = useState(order.discount?.value ? String(order.discount.value) : "");
  return (
    <Sheet
      title={t.addDiscount}
      onClose={onClose}
      footer={
        <>
          {order.discount?.kind && (
            <button type="button" className="pos-btn" onClick={() => onApply("", 0)}>
              {t.removeDiscount}
            </button>
          )}
          <button type="button" className="pos-btn primary" disabled={!Number(value)} onClick={() => onApply(kind, Number(value))}>
            {t.apply}
          </button>
        </>
      }
    >
      <div className="pos-chips">
        <button type="button" className={kind === "percent" ? "on" : ""} onClick={() => setKind("percent")}>
          {t.percent}
        </button>
        <button type="button" className={kind === "amount" ? "on" : ""} onClick={() => setKind("amount")}>
          {t.amount} ({c === "KHR" ? "៛" : "$"})
        </button>
      </div>
      <div className="pos-display">{kind === "percent" ? `${value || 0}%` : fmtMoney(Number(value) || 0, c)}</div>
      <Keypad value={value} onChange={setValue} dot={c === "USD" || kind === "percent"} max={8} />
      {[5, 10, 15, 20].length && kind === "percent" && (
        <div className="pos-chips center">
          {[5, 10, 15, 20, 50].map((p) => (
            <button key={p} type="button" onClick={() => setValue(String(p))}>
              {p}%
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
