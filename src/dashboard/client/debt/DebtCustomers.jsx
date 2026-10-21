import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlarmClock,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  BellRing,
  Camera,
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Send,
  Share2,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { SITE, dayOf, daysLate, dueState, fmt, fmtDate, fmtTime, fromDay, money, owed, owes, totalUsd, lineNote, nDays } from "./text";

// ---------------------------------------- small parts ----------------------------------------
export function Avatar({ c, size = 44 }) {
  const letter = (c?.name || "?").trim().slice(0, 1).toUpperCase();
  return (
    <span className="dk-avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {c?.photo ? <img src={c.photo} alt="" /> : letter}
    </span>
  );
}
export function DueChip({ c, m, lang }) {
  const st = dueState(c);
  if (!owes(c.balance)) return <span className="dk-chip ok">{m.paidOff}</span>;
  if (!st) return null;
  if (st === "late") {
    const n = daysLate(c);
    return (
      <span className="dk-chip late">
        <AlarmClock size={12} /> {n === 1 ? m.late1 : m.late.replace("{n}", n)}
      </span>
    );
  }
  if (st === "today") return <span className="dk-chip soon">{m.dueToday}</span>;
  return <span className={`dk-chip ${st}`}>{m.due.replace("{date}", fmtDate(c.due_at, lang))}</span>;
}
const Seg = ({ value, onChange, options, testid }) => (
  <div className="dk-seg" role="group">
    {options.map(([k, label]) => (
      <button key={k} type="button" className={value === k ? "on" : ""} onClick={() => onChange(k)} data-testid={testid ? `${testid}-${k}` : undefined}>
        {label}
      </button>
    ))}
  </div>
);
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  }
}
export const statementUrl = (token) => `${SITE}/d/${token}`;

// ---------------------------------------- the receipt picture ----------------------------------------
export async function receiptCanvas({ entry, customer, book, m, lang, branding = true }) {
  if (document.fonts?.load) await Promise.all(['700 30px "Kantumruy Pro"', '400 20px "Kantumruy Pro"'].map((f) => document.fonts.load(f).catch(() => {})));
  const W = 720;
  const lines = [];
  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  const F = (w, s) => `${w} ${s}px "Kantumruy Pro", "Noto Sans Khmer", system-ui, sans-serif`;
  // measure height first
  const pad = 44;
  let h = pad;
  const add = (kind, text, size, weight = 400, color = "#111827", align = "left", gap = 10) => {
    lines.push({ kind, text, size, weight, color, align, y: h + size });
    h += size + gap;
  };
  add("t", book.shop_name || "", 34, 700, "#111827", "center", 6);
  if (book.phone) add("t", book.phone, 20, 400, "#6b7280", "center", 4);
  if (book.address) add("t", book.address, 18, 400, "#6b7280", "center", 4);
  h += 18;
  add("rule", "", 2, 400, "#e5e7eb", "left", 22);
  const pay = entry.kind === "pay";
  add("t", `${pay ? m.receiptPay : m.receiptDebt}  ·  ${m.receiptNo.replace("{n}", entry.no || "—")}`, 22, 700, pay ? "#047857" : "#b91c1c", "center", 6);
  add("t", fmtTime(entry.date, lang), 20, 400, "#6b7280", "center", 18);
  add("t", customer.name, 30, 700, "#111827", "center", 8);
  if (customer.phone) add("t", customer.phone, 20, 400, "#6b7280", "center", 14);
  add("big", `${pay ? "−" : "+"} ${money(entry.currency, entry.amount)}`, 64, 800, pay ? "#047857" : "#b91c1c", "center", 18);
  if (entry.note) add("t", lineNote(entry, m), 22, 400, "#374151", "center", 6);
  if (entry.method) add("t", entry.method, 20, 400, "#6b7280", "center", 6);
  h += 14;
  add("rule", "", 2, 400, "#e5e7eb", "left", 24);
  add("row", [m.receiptLeft, owed(customer.balance)], 26, 700, "#111827", "left", 12);
  if (customer.due_at && owes(customer.balance)) add("row", [m.dueDate, fmtDate(customer.due_at, lang)], 20, 400, "#6b7280", "left", 10);
  h += 16;
  add("t", m.receiptThanks, 24, 700, "#111827", "center", 8);
  if (branding) add("t", "BizHub", 16, 400, "#9ca3af", "center", 4);
  h += pad;
  const scale = 2;
  c.width = W * scale;
  c.height = h * scale;
  g.scale(scale, scale);
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, h);
  g.fillStyle = pay ? "#10b981" : "#ef4444";
  g.fillRect(0, 0, W, 8);
  for (const l of lines) {
    g.fillStyle = l.color;
    g.font = F(l.weight, l.size);
    if (l.kind === "rule") {
      g.fillRect(pad, l.y, W - pad * 2, 2);
      continue;
    }
    if (l.kind === "row") {
      g.textAlign = "left";
      g.fillText(l.text[0], pad, l.y);
      g.textAlign = "right";
      g.fillText(l.text[1], W - pad, l.y);
      continue;
    }
    g.textAlign = l.align === "center" ? "center" : "left";
    g.fillText(String(l.text).slice(0, 80), l.align === "center" ? W / 2 : pad, l.y, W - pad * 2);
  }
  return c;
}
export function ReceiptModal({ ctx, entry, customer, onClose }) {
  const { m, lang, data } = ctx;
  const [url, setUrl] = useState("");
  const blobRef = useRef(null);
  useEffect(() => {
    let alive = true;
    receiptCanvas({ entry, customer, book: data.book, m, lang, branding: !data.addons?.debt_nobrand?.active }).then((c) =>
      c.toBlob((b) => {
        if (!alive || !b) return;
        blobRef.current = b;
        setUrl(URL.createObjectURL(b));
      }, "image/png"),
    );
    return () => {
      alive = false;
    };
  }, [entry, customer]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = `receipt-${entry.no || "x"}.png`;
  const canShare = typeof navigator !== "undefined" && navigator.canShare && blobRef.current && navigator.canShare({ files: [new File([blobRef.current], name, { type: "image/png" })] });
  return (
    <Modal
      title={m.receiptTitle}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose}>
            {m.close}
          </button>
          {canShare && (
            <button type="button" className="md-btn md-btn-ghost" onClick={() => navigator.share({ files: [new File([blobRef.current], name, { type: "image/png" })] }).catch(() => {})}>
              <Share2 size={15} /> {m.share}
            </button>
          )}
          <a className={`md-btn md-btn-primary ${url ? "" : "is-disabled"}`} href={url || undefined} download={name} data-testid="dk-receipt-download">
            <Download size={15} /> {m.download}
          </a>
        </>
      }
    >
      <div className="dk-receipt">{url ? <img src={url} alt={m.receiptTitle} data-testid="dk-receipt-img" /> : <Loader2 size={22} className="md-spin" />}</div>
    </Modal>
  );
}

// ---------------------------------------- add / edit a customer ----------------------------------------
export function CustomerModal({ ctx, customer, onClose, onSaved }) {
  const { m, api, owner, notify } = ctx;
  const editing = !!customer;
  const [f, setF] = useState(() => ({
    name: customer?.name || "",
    phone: customer?.phone || "",
    telegram: customer?.telegram || "",
    address: customer?.address || "",
    note: customer?.note || "",
    limit_usd: customer?.limit?.usd || "",
    limit_khr: customer?.limit?.khr || "",
    open_usd: "",
    open_khr: "",
    due: customer?.due_at ? dayOf(customer.due_at) : "",
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const go = async () => {
    if (!f.name.trim()) return setErr(m.name);
    setBusy(true);
    setErr("");
    try {
      const body = { name: f.name, phone: f.phone, telegram: f.telegram, address: f.address, note: f.note };
      if (owner) body.limit = { usd: Number(f.limit_usd) || 0, khr: Number(f.limit_khr) || 0 };
      if (!editing) {
        body.opening = { usd: Number(f.open_usd) || 0, khr: Number(f.open_khr) || 0 };
        body.due_at = fromDay(f.due);
      } else if (owes(customer.balance)) body.due_at = fromDay(f.due);
      const r = editing ? await api.saveCustomer(customer._id, body) : await api.addCustomer(body);
      onSaved(r.data);
      onClose();
    } catch (e) {
      if (e.status === 402 && e.response?.product && ctx.askBuy) {
        ctx.askBuy({ addon: e.response.product });
        onClose();
      } else setErr(e.message);
      notify?.({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={editing ? m.editCustomer : m.newCustomer}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={go} disabled={busy || !f.name.trim()} data-testid="dk-cust-save">
            {busy ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {m.save}
          </button>
        </>
      }
    >
      <div className="dk-form">
        <label className="wide">
          <span>{m.name} *</span>
          <input value={f.name} onChange={set("name")} maxLength={80} autoFocus data-testid="dk-cust-name" />
        </label>
        <label>
          <span>{m.phone}</span>
          <input value={f.phone} onChange={set("phone")} maxLength={40} inputMode="tel" data-testid="dk-cust-phone" />
        </label>
        <label>
          <span>{m.telegram}</span>
          <input value={f.telegram} onChange={set("telegram")} maxLength={60} />
        </label>
        <label className="wide">
          <span>{m.address}</span>
          <input value={f.address} onChange={set("address")} maxLength={200} />
        </label>
        <label className="wide">
          <span>{m.note}</span>
          <input value={f.note} onChange={set("note")} maxLength={500} />
        </label>
        {!editing && (
          <fieldset className="wide dk-fs">
            <legend>{m.opening}</legend>
            <label>
              <span>$</span>
              <input type="number" min="0" step="0.01" value={f.open_usd} onChange={set("open_usd")} inputMode="decimal" data-testid="dk-cust-open-usd" />
            </label>
            <label>
              <span>៛</span>
              <input type="number" min="0" step="100" value={f.open_khr} onChange={set("open_khr")} inputMode="numeric" />
            </label>
          </fieldset>
        )}
        {(!editing || owes(customer.balance)) && (
          <label>
            <span>{m.dueDate}</span>
            <input type="date" value={f.due} onChange={set("due")} />
          </label>
        )}
        {owner && (
          <fieldset className="wide dk-fs">
            <legend>{m.limit}</legend>
            <label>
              <span>$</span>
              <input type="number" min="0" step="1" value={f.limit_usd} onChange={set("limit_usd")} inputMode="decimal" data-testid="dk-cust-limit" />
            </label>
            <label>
              <span>៛</span>
              <input type="number" min="0" step="1000" value={f.limit_khr} onChange={set("limit_khr")} inputMode="numeric" />
            </label>
            <small className="rs-muted">{m.limitHint}</small>
          </fieldset>
        )}
        {err && <p className="dk-err wide">{err}</p>}
      </div>
    </Modal>
  );
}

// ---------------------------------------- add a debt / take a payment ----------------------------------------
const plusDays = (n) => dayOf(new Date(Date.now() + n * 86400000));
const endOfMonth = () => {
  const d = new Date(Date.now() + 7 * 3600000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
};
export function EntryModal({ ctx, customer, kind: kind0, onClose, onSaved }) {
  const { m, api, data, owner } = ctx;
  const [kind, setKind] = useState(kind0);
  const firstCur = kind0 === "pay" && !(customer.balance?.[data.book.main === "KHR" ? "khr" : "usd"] > 0) && owes(customer.balance) ? (customer.balance.usd > 0 ? "USD" : "KHR") : data.book.main || "USD";
  const [currency, setCurrency] = useState(firstCur);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("cash");
  const [due, setDue] = useState(customer.due_at && owes(customer.balance) ? "" : "");
  const [date, setDate] = useState(dayOf(new Date()));
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(null); // { text, force }
  const [err, setErr] = useState("");
  const bal = customer.balance?.[currency === "KHR" ? "khr" : "usd"] || 0;
  const save = async (force = false) => {
    setBusy(true);
    setErr("");
    try {
      const body = { kind, currency, amount: Number(amount), note, date: date === dayOf(new Date()) ? undefined : fromDay(date), force };
      if (kind === "debt") body.due_at = fromDay(due);
      else body.method = m.methods[method] || method;
      const r = await api.addEntry(customer._id, body);
      onSaved(r.data, kind);
      onClose();
    } catch (e) {
      const code = e.response?.code;
      if (code === "over_limit") setAsk({ text: m.overLimitAsk.replace("{limit}", money(currency, e.response.limit)).replace("{balance}", money(currency, e.response.balance)), force: owner });
      else if (code === "too_much") setAsk({ text: m.tooMuchAsk.replace("{balance}", money(currency, e.response.balance)), force: true });
      else setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const ok = Number(amount) > 0;
  const quick = currency === "KHR" ? [5000, 10000, 20000, 50000, 100000] : [1, 5, 10, 20, 50];
  return (
    <Modal
      title={(kind === "pay" ? m.payTitle : m.debtTitle).replace("{name}", customer.name)}
      onClose={onClose}
      busy={busy}
      footer={
        ask ? (
          <>
            <button type="button" className="md-btn md-btn-ghost" onClick={() => setAsk(null)} disabled={busy}>
              {m.cancel}
            </button>
            {ask.force && (
              <button type="button" className="md-btn md-btn-primary" onClick={() => save(true)} disabled={busy} data-testid="dk-entry-force">
                {busy ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {m.yes}
              </button>
            )}
          </>
        ) : (
          <>
            <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
              {m.cancel}
            </button>
            <button type="button" className={`md-btn md-btn-primary ${kind === "pay" ? "dk-btn-pay" : "dk-btn-debt"}`} onClick={() => save(false)} disabled={busy || !ok} data-testid="dk-entry-save">
              {busy ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {kind === "pay" ? m.savePay : m.saveDebt}
            </button>
          </>
        )
      }
    >
      {ask ? (
        <p className="dk-ask" data-testid="dk-entry-ask">
          {ask.text}
        </p>
      ) : (
        <div className="dk-entry">
          <Seg
            value={kind}
            onChange={setKind}
            testid="dk-kind"
            options={[
              ["debt", m.lineDebt],
              ["pay", m.linePay],
            ]}
          />
          <div className={`dk-amount k-${kind}`}>
            <Seg
              value={currency}
              onChange={setCurrency}
              testid="dk-cur"
              options={[
                ["USD", "$ USD"],
                ["KHR", "៛ KHR"],
              ]}
            />
            <input
              type="number"
              min="0"
              step={currency === "KHR" ? "100" : "0.01"}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={currency === "KHR" ? "0 ៛" : "$0.00"}
              autoFocus
              aria-label={m.amount}
              data-testid="dk-entry-amount"
              onKeyDown={(e) => e.key === "Enter" && ok && save(false)}
            />
            <div className="dk-quick">
              {kind === "pay" && bal > 0 && (
                <button type="button" onClick={() => setAmount(String(bal))} data-testid="dk-pay-all">
                  {m.payAll.replace("{v}", money(currency, bal))}
                </button>
              )}
              {quick.map((q) => (
                <button key={q} type="button" onClick={() => setAmount(String((Number(amount) || 0) + q))}>
                  +{currency === "KHR" ? fmt(q) : `$${q}`}
                </button>
              ))}
            </div>
          </div>
          {kind === "debt" ? (
            <>
              <label className="dk-field">
                <span>{m.what}</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={m.whatPh} maxLength={300} data-testid="dk-entry-note" />
              </label>
              <div className="dk-field">
                <span>{m.dueIn}</span>
                <div className="dk-quick">
                  <button type="button" className={!due ? "on" : ""} onClick={() => setDue("")}>
                    {m.noDue}
                  </button>
                  {[7, 15, 30].map((n) => (
                    <button key={n} type="button" className={due === plusDays(n) ? "on" : ""} onClick={() => setDue(plusDays(n))} data-testid={`dk-due-${n}`}>
                      {nDays(m, n)}
                    </button>
                  ))}
                  <button type="button" className={due === endOfMonth() ? "on" : ""} onClick={() => setDue(endOfMonth())}>
                    {m.endMonth}
                  </button>
                  <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label={m.dueDate} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="dk-field">
                <span>{m.howPaid}</span>
                <div className="dk-quick">
                  {Object.keys(m.methods).map((k) => (
                    <button key={k} type="button" className={method === k ? "on" : ""} onClick={() => setMethod(k)}>
                      {m.methods[k]}
                    </button>
                  ))}
                </div>
              </div>
              <label className="dk-field">
                <span>{m.payNote}</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
              </label>
            </>
          )}
          <label className="dk-field dk-date">
            <span>{m.date}</span>
            <input type="date" value={date} max={dayOf(new Date())} onChange={(e) => setDate(e.target.value || dayOf(new Date()))} />
          </label>
          {err && <p className="dk-err">{err}</p>}
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------- reminder by hand ----------------------------------------
export function RemindModal({ ctx, customer, texts, onClose, onDone }) {
  const { m, lang, api, notify } = ctx;
  const [l, setL] = useState(lang === "en" ? "en" : "km");
  const [text, setText] = useState(texts[l]);
  const [busy, setBusy] = useState(false);
  useEffect(() => setText(texts[l]), [l, texts]);
  const mark = () =>
    api
      .reminded(customer._id)
      .then((r) => onDone?.(r.data))
      .catch(() => {});
  const phone = String(customer.phone || "").replace(/[^\d+]/g, "");
  const auto = ctx.on("debt_remind") && customer.tg_linked;
  return (
    <Modal title={m.remindTitle} onClose={onClose} busy={busy}>
      <div className="dk-remind">
        <p className="rs-muted">{m.remindSub}</p>
        <Seg
          value={l}
          onChange={setL}
          options={[
            ["km", "ខ្មែរ"],
            ["en", "English"],
          ]}
        />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} data-testid="dk-remind-text" />
        <div className="dk-remind-acts">
          <a
            className="md-btn md-btn-primary"
            href={`https://t.me/share/url?url=${encodeURIComponent(statementUrl(customer.token))}&text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={mark}
            data-testid="dk-remind-tg"
          >
            <Send size={15} /> {m.shareTg}
          </a>
          {phone && (
            <a className="md-btn md-btn-ghost" href={`sms:${phone}?body=${encodeURIComponent(text)}`} onClick={mark}>
              <MessageSquare size={15} /> {m.sms}
            </a>
          )}
          <button
            type="button"
            className="md-btn md-btn-ghost"
            onClick={async () => {
              if (await copyText(text)) notify?.({ type: "success", text: m.copied });
              mark();
            }}
            data-testid="dk-remind-copy"
          >
            <Copy size={15} /> {m.copyText}
          </button>
          {auto && (
            <button
              type="button"
              className="md-btn md-btn-ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.remindNow(customer._id, l);
                  notify?.({ type: "success", text: m.autoSent });
                  onDone?.();
                  onClose();
                } catch (e) {
                  notify?.({ type: "error", text: e.message });
                } finally {
                  setBusy(false);
                }
              }}
              data-testid="dk-remind-bot"
            >
              {busy ? <Loader2 size={15} className="md-spin" /> : <BellRing size={15} />} {m.autoSend}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------- one customer ----------------------------------------
function CustomerView({ ctx, cid, onBack, onChanged }) {
  const { m, lang, api, owner, readOnly, notify, data } = ctx;
  const [d, setD] = useState(null);
  const [modal, setModal] = useState(null); // { kind: "debt"|"pay"|"edit"|"remind"|"receipt"|"void"|"delete"|"link", ... }
  const [err, setErr] = useState("");
  const fileRef = useRef(null);
  const load = useCallback(
    () =>
      api
        .customer(cid)
        .then((r) => setD(r.data))
        .catch((e) => setErr(e.message)),
    [api, cid],
  );
  useEffect(() => {
    load();
  }, [load]);
  if (err) return <p className="dk-err">{err}</p>;
  if (!d)
    return (
      <div className="dk-loading">
        <Loader2 size={22} className="md-spin" />
      </div>
    );
  const c = d.customer;
  const changed = (cust) => {
    if (cust) setD((x) => ({ ...x, customer: { ...x.customer, ...cust } }));
    onChanged?.();
  };
  const over = (c.limit?.usd > 0 && c.balance.usd > c.limit.usd) || (c.limit?.khr > 0 && c.balance.khr > c.limit.khr);
  const link = statementUrl(c.token);
  return (
    <div className="rs-col dk-person" data-testid="dk-person">
      <button type="button" className="sa-link dk-back" onClick={onBack} data-testid="dk-back">
        <ArrowLeft size={14} /> {m.tabs.customers}
      </button>
      <section className={`panel-card dk-hero ${owes(c.balance) ? "owing" : "clear"}`}>
        <div className="dk-hero-top">
          <button type="button" className="dk-photo" onClick={() => owner && !readOnly && fileRef.current?.click()} disabled={!owner || readOnly} aria-label={m.photo}>
            <Avatar c={c} size={64} />
            {owner && !readOnly && (
              <span className="dk-photo-ic">
                <Camera size={13} />
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const r = await api.customerPhoto(c._id, file);
                changed(r.data);
              } catch (er) {
                notify({ type: "error", text: er.message });
              }
            }}
          />
          <div className="dk-hero-name">
            <h2 data-testid="dk-person-name">{c.name}</h2>
            <div className="dk-hero-meta">
              {c.phone && (
                <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone size={13} /> {c.phone}
                </a>
              )}
              {c.telegram && (
                <a href={`https://t.me/${c.telegram.replace(/^@/, "").replace(/^\+?855/, "+855")}`} target="_blank" rel="noopener noreferrer">
                  <Send size={13} /> {c.telegram}
                </a>
              )}
              {c.address && <span>{c.address}</span>}
            </div>
            {c.note && <p className="rs-muted dk-note">{c.note}</p>}
          </div>
          {owner && !readOnly && !c.deleted && (
            <button type="button" className="md-icon-btn" onClick={() => setModal({ kind: "edit" })} aria-label={m.edit} data-testid="dk-person-edit">
              <Pencil size={16} />
            </button>
          )}
        </div>
        <div className="dk-balance">
          <span className="dk-balance-label">{m.owes}</span>
          <b data-testid="dk-person-balance">{owed(c.balance)}</b>
          {c.balance.usd > 0 && c.balance.khr > 0 && <small className="rs-muted">{m.total.replace("{v}", money("USD", Math.round(totalUsd(c.balance, data.book.rate) * 100) / 100))}</small>}
          <div className="dk-balance-chips">
            <DueChip c={c} m={m} lang={lang} />
            {(c.limit?.usd > 0 || c.limit?.khr > 0) && (
              <span className={`dk-chip ${over ? "late" : ""}`}>
                {over ? `${m.overLimitNow} · ` : ""}
                {m.limitIs.replace("{v}", owed(c.limit))}
              </span>
            )}
          </div>
        </div>
        {!c.deleted && (
          <div className="dk-hero-acts">
            <button type="button" className="md-btn md-btn-primary dk-btn-debt" onClick={() => setModal({ kind: "debt" })} disabled={readOnly} data-testid="dk-add-debt">
              <ArrowUpRight size={16} /> {m.addDebt}
            </button>
            <button type="button" className="md-btn md-btn-primary dk-btn-pay" onClick={() => setModal({ kind: "pay" })} disabled={readOnly} data-testid="dk-take-pay">
              <ArrowDownLeft size={16} /> {m.takePay}
            </button>
            <button type="button" className="md-btn md-btn-ghost" onClick={() => setModal({ kind: "remind" })} disabled={readOnly || !owes(c.balance)} data-testid="dk-remind">
              <BellRing size={16} /> {m.remind}
            </button>
          </div>
        )}
        {owner && c.deleted && (
          <button
            type="button"
            className="md-btn md-btn-primary"
            onClick={async () => {
              const r = await api.restoreCustomer(c._id).catch((e) => notify({ type: "error", text: e.message }));
              if (r) changed(r.data);
            }}
            data-testid="dk-person-restore"
          >
            <RotateCcw size={15} /> {m.restoreCustomer}
          </button>
        )}
      </section>

      <section className="panel-card dk-link">
        <div>
          <b>
            <Link2 size={15} /> {m.statement}
          </b>
          <p className="rs-muted">{m.statementSub}</p>
          <code data-testid="dk-statement-url">{link}</code>
          <div className="dk-tg-state">
            {c.tg_linked ? (
              <span className="dk-chip ok">
                <Send size={12} /> {m.tgLinked}
              </span>
            ) : (
              <small className="rs-muted">{m.tgNotLinked}</small>
            )}
            {c.reminds > 0 && <small className="rs-muted">{m.reminded.replace("{n}", c.reminds).replace("{date}", fmtDate(c.last_remind_at, lang))}</small>}
          </div>
        </div>
        <div className="dk-link-acts">
          <button
            type="button"
            className="md-btn md-btn-ghost sa-btn-sm"
            onClick={async () => {
              if (await copyText(link)) notify({ type: "success", text: m.copied });
            }}
            data-testid="dk-link-copy"
          >
            <Copy size={14} /> {m.copy}
          </button>
          <a className="md-btn md-btn-ghost sa-btn-sm" href={link} target="_blank" rel="noopener noreferrer" data-testid="dk-link-open">
            <ExternalLink size={14} /> {m.open}
          </a>
          {owner && !readOnly && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setModal({ kind: "link" })}>
              <RotateCcw size={14} /> {m.newLink}
            </button>
          )}
        </div>
      </section>

      <section className="panel-card dk-lines">
        <h3>{m.history}</h3>
        {!d.entries.length && <p className="rs-muted">{m.noLines}</p>}
        <ul>
          {d.entries.map((e) => (
            <li key={e._id} className={`k-${e.kind} ${e.void ? "void" : ""}`} data-testid="dk-line">
              <span className="dk-line-ic">{e.kind === "pay" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span>
              <div className="dk-line-main">
                <b>{lineNote(e, m)}</b>
                <small className="rs-muted">
                  {fmtTime(e.date, lang)}
                  {e.method ? ` · ${e.method}` : ""}
                  {e.due_at ? ` · ${m.due.replace("{date}", fmtDate(e.due_at, lang))}` : ""}
                  {e.void ? ` · ${m.voided}${e.void_reason ? ` (${e.void_reason})` : ""}` : ""}
                </small>
              </div>
              <span className="dk-line-amt">
                {e.kind === "pay" ? "−" : "+"}
                {money(e.currency, e.amount)}
              </span>
              <div className="dk-line-acts">
                {!e.void && (
                  <button type="button" className="md-icon-btn" onClick={() => setModal({ kind: "receipt", entry: e })} aria-label={m.receipt} title={m.receipt} data-testid="dk-line-receipt">
                    <Receipt size={15} />
                  </button>
                )}
                {owner &&
                  !readOnly &&
                  (e.void ? (
                    <button
                      type="button"
                      className="md-icon-btn"
                      onClick={async () => {
                        const r = await api.restoreEntry(e._id).catch((er) => notify({ type: "error", text: er.message }));
                        if (r) {
                          changed(r.data.customer);
                          load();
                        }
                      }}
                      aria-label={m.restore}
                      title={m.restore}
                    >
                      <RotateCcw size={15} />
                    </button>
                  ) : (
                    <button type="button" className="md-icon-btn" onClick={() => setModal({ kind: "void", entry: e })} aria-label={m.voidLine} title={m.voidLine} data-testid="dk-line-void">
                      <Trash2 size={15} />
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {owner && !readOnly && !c.deleted && (
        <button type="button" className="md-btn md-btn-ghost dk-danger" onClick={() => setModal({ kind: "delete" })} data-testid="dk-person-delete">
          <Trash2 size={15} /> {m.deleteCustomer}
        </button>
      )}

      {(modal?.kind === "debt" || modal?.kind === "pay") && (
        <EntryModal
          ctx={ctx}
          customer={c}
          kind={modal.kind}
          onClose={() => setModal(null)}
          onSaved={(r, kind) => {
            changed(r.customer);
            load();
            notify({ type: "success", text: kind === "pay" ? m.savedPay : m.savedDebt });
            if (kind === "pay") setTimeout(() => setModal({ kind: "receipt", entry: r.entry, customer: r.customer }), 0);
          }}
        />
      )}
      {modal?.kind === "edit" && <CustomerModal ctx={ctx} customer={c} onClose={() => setModal(null)} onSaved={(x) => changed(x)} />}
      {modal?.kind === "remind" && <RemindModal ctx={ctx} customer={c} texts={d.remind_text} onClose={() => setModal(null)} onDone={(x) => changed(x)} />}
      {modal?.kind === "receipt" && <ReceiptModal ctx={ctx} entry={modal.entry} customer={modal.customer || c} onClose={() => setModal(null)} />}
      {modal?.kind === "void" && <VoidModal ctx={ctx} entry={modal.entry} onClose={() => setModal(null)} onDone={(cust) => (changed(cust), load())} />}
      {modal?.kind === "delete" && (
        <SimpleConfirm
          m={m}
          title={m.deleteCustomer}
          sub={m.deleteSub}
          onYes={async () => {
            await api.removeCustomer(c._id);
            onChanged?.();
            onBack();
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "link" && (
        <SimpleConfirm
          m={m}
          title={m.newLink}
          sub={m.newLinkSub}
          danger={false}
          onYes={async () => {
            const r = await api.newLink(c._id);
            changed(r.data);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
export function SimpleConfirm({ m, title, sub, onYes, onClose, danger = true }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Modal
      title={title}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button
            type="button"
            className={`md-btn ${danger ? "md-btn-danger" : "md-btn-primary"}`}
            disabled={busy}
            data-testid="dk-confirm-yes"
            onClick={async () => {
              setBusy(true);
              try {
                await onYes();
                onClose();
              } catch (e) {
                setErr(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 size={15} className="md-spin" /> : null} {m.yes}
          </button>
        </>
      }
    >
      <p className="rs-muted">{sub}</p>
      {err && <p className="dk-err">{err}</p>}
    </Modal>
  );
}
function VoidModal({ ctx, entry, onClose, onDone }) {
  const { m, api } = ctx;
  const [reason, setReason] = useState("");
  return (
    <SimpleConfirm
      m={m}
      title={`${m.voidLine} · ${entry.kind === "pay" ? "−" : "+"}${money(entry.currency, entry.amount)}`}
      sub={
        <>
          {m.voidSub}
          <input className="dk-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={m.reason} maxLength={200} />
        </>
      }
      onYes={async () => {
        const r = await api.voidEntry(entry._id, reason);
        onDone(r.data.customer);
      }}
      onClose={onClose}
    />
  );
}

// ---------------------------------------- the list ----------------------------------------
export function CustomersTab({ ctx }) {
  const { m, lang, api, data, owner, readOnly } = ctx;
  const [params, setParams] = useSearchParams();
  const cid = params.get("c") || "";
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const t = data.totals;
  const open = (id) => {
    const next = new URLSearchParams(params);
    if (id) next.set("c", id);
    else next.delete("c");
    setParams(next, { replace: false });
    window.scrollTo({ top: 0 });
  };
  const load = useCallback(
    async (p = 1) => {
      setBusy(true);
      try {
        const r = await api.customers({ filter, q: q.trim(), sort, page: p });
        setRows((old) => (p === 1 ? r.data : [...(old || []), ...r.data]));
        setPage(p);
        setPages(r.pagination.totalPages || 1);
        setTotal(r.pagination.total || 0);
      } catch (e) {
        ctx.notify?.({ type: "error", text: e.message });
      } finally {
        setBusy(false);
      }
    },
    [api, filter, q, sort], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    const tm = setTimeout(() => load(1), q ? 250 : 0);
    return () => clearTimeout(tm);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = () => {
    load(1);
    ctx.reload?.();
  };
  const filters = useMemo(() => ["all", "owing", "overdue", "week", "paid", ...(owner ? ["deleted"] : [])], [owner]);
  if (cid) return <CustomerView ctx={ctx} cid={cid} onBack={() => open("")} onChanged={refresh} />;
  const full = t.customers >= data.limits.customers;
  return (
    <div className="rs-col dk-list">
      <div className="dk-tiles">
        <div className="panel-card dk-tile t-owed" data-testid="dk-tile-owed">
          <Wallet size={18} />
          <small>{m.owedNow}</small>
          <b>{owed(t.owed)}</b>
          {t.owed.usd > 0 && t.owed.khr > 0 && <span className="rs-muted">{m.aboutUsd.replace("{v}", money("USD", Math.round(totalUsd(t.owed, data.book.rate))))}</span>}
        </div>
        <div className="panel-card dk-tile">
          <Users size={18} />
          <small>{m.peopleOwing}</small>
          <b>{fmt(t.people)}</b>
          <span className="rs-muted">{m.ofCustomers.replace("{n}", fmt(t.customers))}</span>
        </div>
        <button type="button" className={`panel-card dk-tile t-late ${t.overdue ? "hot" : ""}`} onClick={() => setFilter("overdue")} data-testid="dk-tile-late">
          <AlarmClock size={18} />
          <small>{m.lateNow}</small>
          <b>{fmt(t.overdue)}</b>
        </button>
        <div className="panel-card dk-tile t-paid">
          <ArrowDownLeft size={18} />
          <small>{m.paidMonth}</small>
          <b>{owed(t.month.paid)}</b>
          <span className="rs-muted">
            {m.lentMonth}: {owed(t.month.lent)}
          </span>
        </div>
      </div>

      <section className="panel-card dk-bar">
        <label className="db-biz-search dk-search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.search} aria-label={m.search} data-testid="dk-search" />
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={m.sortBy} className="dk-sort">
          <option value="">{m.sortBy}</option>
          {Object.entries(m.sorts).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="button" className="md-btn md-btn-primary" onClick={() => (full && ctx.askBuy ? ctx.askBuy({ addon: "debt_more" }) : setModal("add"))} disabled={readOnly} data-testid="dk-add-customer">
          <UserPlus size={16} /> {m.addCustomer}
        </button>
        <div className="wst-chips dk-filters">
          {filters.map((k) => (
            <button key={k} type="button" className={filter === k ? "on" : ""} onClick={() => setFilter(k)} data-testid={`dk-filter-${k}`}>
              {m.filters[k]}
              {k === "overdue" && t.overdue > 0 && <small>{t.overdue}</small>}
            </button>
          ))}
        </div>
        {full && owner && <p className="dk-note-full">{m.limitFull.replace("{n}", fmt(data.limits.customers))}</p>}
      </section>

      <section className="panel-card dk-people">
        {rows === null ? (
          <div className="dk-loading">
            <Loader2 size={22} className="md-spin" />
          </div>
        ) : !rows.length ? (
          <div className="dk-empty">
            <Users size={28} />
            <p className="rs-muted">{t.customers || q || filter !== "all" ? m.noMatch : m.noCustomers}</p>
            {!t.customers && !readOnly && (
              <button type="button" className="md-btn md-btn-primary" onClick={() => setModal("add")}>
                <Plus size={15} /> {m.addCustomer}
              </button>
            )}
          </div>
        ) : (
          <ul>
            {rows.map((c) => (
              <li key={c._id} className={`dk-row ${dueState(c) === "late" ? "late" : ""}`}>
                <button type="button" className="dk-row-main" onClick={() => open(c._id)} data-testid="dk-row">
                  <Avatar c={c} />
                  <span className="dk-row-name">
                    <b>{c.name}</b>
                    <small className="rs-muted">
                      {c.phone || c.telegram || c.note || "—"}
                      {c.last_at ? ` · ${fmtDate(c.last_at, lang)}` : ""}
                    </small>
                  </span>
                  <span className="dk-row-right">
                    <b className={owes(c.balance) ? "owing" : "clear"}>{owes(c.balance) ? owed(c.balance) : m.nothing}</b>
                    <DueChip c={c} m={m} lang={lang} />
                  </span>
                </button>
                {!c.deleted && !readOnly && (
                  <span className="dk-row-acts">
                    <button type="button" className="dk-mini debt" onClick={() => setModal({ kind: "debt", c })} aria-label={m.addDebt} title={m.addDebt} data-testid="dk-row-debt">
                      <ArrowUpRight size={15} />
                    </button>
                    <button type="button" className="dk-mini pay" onClick={() => setModal({ kind: "pay", c })} aria-label={m.takePay} title={m.takePay} disabled={!owes(c.balance)} data-testid="dk-row-pay">
                      <ArrowDownLeft size={15} />
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {page < pages && (
          <button type="button" className="md-btn md-btn-ghost dk-more" onClick={() => load(page + 1)} disabled={busy}>
            {busy ? <Loader2 size={14} className="md-spin" /> : null} {m.more} ({fmt(total - rows.length)})
          </button>
        )}
      </section>

      {modal === "add" && <CustomerModal ctx={ctx} onClose={() => setModal(null)} onSaved={(c) => (refresh(), open(c._id))} />}
      {(modal?.kind === "debt" || modal?.kind === "pay") && (
        <EntryModal
          ctx={ctx}
          customer={modal.c}
          kind={modal.kind}
          onClose={() => setModal(null)}
          onSaved={(r, kind) => {
            refresh();
            ctx.notify?.({ type: "success", text: kind === "pay" ? m.savedPay : m.savedDebt });
            if (kind === "pay") setTimeout(() => setModal({ kind: "receipt", entry: r.entry, customer: r.customer }), 0);
          }}
        />
      )}
      {modal?.kind === "receipt" && <ReceiptModal ctx={ctx} entry={modal.entry} customer={modal.customer} onClose={() => setModal(null)} />}
    </div>
  );
}
