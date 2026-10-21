import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, Landmark, Search, X } from "lucide-react";
import { coinAdminService, customerAdminService } from "../../api/services";
import { fmt, useSaText } from "./text";
import { coinsChanged } from "../../lib/events";

// ---------- small pieces ----------
export function StatusBadge({ on }) {
  const { s } = useSaText();
  return <span className={`sa-badge ${on ? "on" : "off"}`}>{on ? s.active : s.suspended}</span>;
}

export function Initial({ name }) {
  return (
    <span className="sa-initial" aria-hidden="true">
      {Array.from(String(name || "?").trim() || "?")[0].toUpperCase()}
    </span>
  );
}

export function Pager({ pagination, onPage }) {
  const { s } = useSaText();
  if (!pagination || pagination.totalPages <= 1) {
    return pagination ? (
      <div className="sa-pager">
        <span>
          {fmt(pagination.total)} {s.total}
        </span>
      </div>
    ) : null;
  }
  const { currentPage, totalPages, total } = pagination;
  return (
    <div className="sa-pager">
      <span>
        {fmt(total)} {s.total}
      </span>
      <div>
        <button type="button" className="md-icon-btn" disabled={currentPage <= 1} onClick={() => onPage(currentPage - 1)} aria-label={s.prev}>
          <ChevronLeft size={16} />
        </button>
        <span>
          {s.page} {currentPage} {s.of} {totalPages}
        </span>
        <button type="button" className="md-icon-btn" disabled={currentPage >= totalPages} onClick={() => onPage(currentPage + 1)} aria-label={s.next}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, size = "", busy = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);
  return (
    <div className="md-modal-backdrop" onMouseDown={() => !busy && onClose()}>
      <div className={`md-modal ${size}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="md-modal-header">
          <h3>{title}</h3>
          <button type="button" className="md-icon-btn" onClick={onClose} disabled={busy} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="md-modal-body">{children}</div>
        {footer && <div className="md-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Toast-like message at the top of a page
export function useNotice() {
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const view = notice ? (
    <div className={`md-notice md-notice-${notice.type}`} role="status">
      {notice.text}
    </div>
  ) : null;
  return [view, setNotice];
}

// ---------- pick "treasury" or a customer ----------
function WalletPicker({ label, value, onChange, allowTreasury = true, treasuryBalance }) {
  const { s } = useSaText();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      customerAdminService
        .list({ q, limit: 8, status: "active" })
        .then((r) => setResults(r.data || []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (v) => {
    onChange(v);
    setOpen(false);
    setQ("");
  };

  return (
    <div className="md-field" ref={boxRef}>
      <label>{label}</label>
      {value && !open ? (
        <button type="button" className="sa-wallet-chip" onClick={() => setOpen(true)}>
          {value === "treasury" ? (
            <>
              <span className="sa-initial gold">
                <Landmark size={15} />
              </span>
              <span>
                <b>{s.treasuryWallet}</b>
                {treasuryBalance !== undefined && (
                  <small>
                    {s.balance}: {fmt(treasuryBalance)}
                  </small>
                )}
              </span>
            </>
          ) : (
            <>
              <Initial name={value.name} />
              <span>
                <b>{value.name}</b>
                <small>
                  {value.email} · {s.balance}: {fmt(value.coin_balance)}
                </small>
              </span>
            </>
          )}
        </button>
      ) : (
        <div className="sa-picker">
          <div className="md-search" style={{ width: "100%" }}>
            <Search size={16} />
            <input autoFocus={open} value={q} placeholder={s.pickCustomer} onFocus={() => setOpen(true)} onChange={(e) => setQ(e.target.value)} />
          </div>
          {open && (
            <div className="sa-picker-list" role="listbox">
              {allowTreasury && (
                <button type="button" role="option" aria-selected={value === "treasury"} onClick={() => choose("treasury")}>
                  <span className="sa-initial gold">
                    <Landmark size={15} />
                  </span>
                  <span>
                    <b>{s.treasuryWallet}</b>
                    {treasuryBalance !== undefined && (
                      <small>
                        {s.balance}: {fmt(treasuryBalance)}
                      </small>
                    )}
                  </span>
                </button>
              )}
              {results.map((c) => (
                <button key={c._id} type="button" role="option" aria-selected={value?._id === c._id} onClick={() => choose(c)}>
                  <Initial name={c.name} />
                  <span>
                    <b>{c.name}</b>
                    <small>
                      {c.email} · {s.balance}: {fmt(c.coin_balance)}
                    </small>
                  </span>
                </button>
              ))}
              {results.length === 0 && <span className="sa-picker-empty">{s.noResults}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Generate coins ----------
export function GenerateModal({ onClose, onDone }) {
  const { s } = useSaText();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await coinAdminService.generate({ amount: Number(amount), note });
      coinsChanged();
      onDone?.(s.generatedOk);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={s.generateCoins}
      onClose={onClose}
      busy={busy}
      size="md-modal-sm"
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {s.cancel}
          </button>
          <button type="submit" form="sa-generate" className="md-btn md-btn-primary" disabled={busy || !amount || !note.trim()}>
            {busy ? s.saving : s.generateCoins}
          </button>
        </>
      }
    >
      <form id="sa-generate" onSubmit={submit} className="md-fields">
        <p className="md-hint" style={{ margin: 0 }}>
          {s.generateHint}
        </p>
        <div className="md-field">
          <label htmlFor="g-amount">
            {s.amount}
            <span className="md-required">*</span>
          </label>
          <input id="g-amount" type="number" min="1" max="1000000" step="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </div>
        <div className="md-field">
          <label htmlFor="g-note">
            {s.note}
            <span className="md-required">*</span>
          </label>
          <input id="g-note" maxLength={300} placeholder={s.noteHint} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

// ---------- Transfer coins ----------
// initialTo / initialFrom: "treasury" or a customer object { _id, name, email, coin_balance }
export function TransferModal({ onClose, onDone, initialFrom = "treasury", initialTo = null }) {
  const { s } = useSaText();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [usd, setUsd] = useState("");
  const [treasury, setTreasury] = useState(undefined);
  const [methods, setMethods] = useState(["KHQR", "ABA", "Card", "Cash", "Other"]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    coinAdminService
      .treasury()
      .then((r) => {
        setTreasury(r.data.treasury_balance);
        if (r.data.payment_methods) setMethods(r.data.payment_methods);
      })
      .catch(() => {});
  }, []);

  const fromBalance = from === "treasury" ? treasury : from?.coin_balance;
  const toId = (w) => (w === "treasury" ? "treasury" : w?._id);
  const same = from && to && toId(from) === toId(to);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await coinAdminService.transfer({
        from: toId(from),
        to: toId(to),
        amount: Number(amount),
        note,
        payment: method ? { method, reference, amount_usd: usd === "" ? null : Number(usd) } : undefined,
      });
      coinsChanged();
      onDone?.(s.transferredOk);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const ready = from && to && !same && Number(amount) > 0 && note.trim();

  return (
    <Modal
      title={s.transferCoins}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {s.cancel}
          </button>
          <button type="submit" form="sa-transfer" className="md-btn md-btn-primary" disabled={busy || !ready}>
            {busy ? s.saving : s.transferCoins}
          </button>
        </>
      }
    >
      <form id="sa-transfer" onSubmit={submit} className="md-fields">
        <p className="md-hint" style={{ margin: 0 }}>
          {s.transferHint}
        </p>
        <WalletPicker label={s.from} value={from} onChange={setFrom} treasuryBalance={treasury} />
        <div className="sa-swap">
          <button
            type="button"
            className="md-btn md-btn-ghost"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            disabled={!from || !to}
          >
            <ArrowDownUp size={15} /> {s.swap}
          </button>
        </div>
        <WalletPicker label={s.to} value={to} onChange={setTo} treasuryBalance={treasury} />
        <div className="md-field">
          <label htmlFor="t-amount">
            {s.amount}
            <span className="md-required">*</span>
            {fromBalance !== undefined && (
              <span className="md-hint">
                {" "}
                · {s.max}: {fmt(fromBalance)}
              </span>
            )}
          </label>
          <input id="t-amount" type="number" min="1" step="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="md-field">
          <label htmlFor="t-note">
            {s.note}
            <span className="md-required">*</span>
          </label>
          <input id="t-note" maxLength={300} placeholder={s.noteHint} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="md-fields-grid">
          <div className="md-field md-field-full">
            <label htmlFor="t-method">{s.paymentMethod}</label>
            <select id="t-method" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">{s.paymentNone}</option>
              {methods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {method && (
            <>
              <div className="md-field">
                <label htmlFor="t-ref">{s.reference}</label>
                <input id="t-ref" maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
              <div className="md-field">
                <label htmlFor="t-usd">{s.amountUsd}</label>
                <input id="t-usd" type="number" min="0" step="0.01" inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value)} />
              </div>
            </>
          )}
        </div>
        {same && (
          <div className="md-form-error">
            {s.from} = {s.to}
          </div>
        )}
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

// ---------- who / where a coin move went ----------
export function walletName(customer, s) {
  return customer ? customer.name || customer.email : s.treasuryWallet;
}
