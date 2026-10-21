import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Delete, Lock, LogOut, Printer, Vault, X } from "lucide-react";
import { methodName, money, riel } from "../../dashboard/client/mart/text";
import { martPosApi } from "./martApi";

// Shifts & cash drawer on the POS — the same steps as the Restaurant POS:
// PIN → count the drawer (open) → sell → count again (close) → "Shift closed" → next person's PIN
const usd = (v) => money(v, "USD");
const sign = (v, f) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${f(Math.abs(v))}`;

// a number pad: dot for dollars, none for riel
function Pad({ value, onChange, dot, max = 10 }) {
  const press = (k) => {
    if (k === "del") return onChange(value.slice(0, -1));
    if (k === ".") return !value.includes(".") && onChange(value ? `${value}.` : "0.");
    if (value.length >= max) return;
    if (value.includes(".") && value.split(".")[1].length >= 2) return;
    onChange(value === "0" ? k : value + k);
  };
  return (
    <div className="ghp-pad sh-pad">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", dot ? "." : "00", "0", "del"].map((k) => (
        <button key={k} type="button" onClick={() => press(k === "00" ? "00" : k)} aria-label={k}>
          {k === "del" ? <Delete size={22} /> : k}
        </button>
      ))}
    </div>
  );
}

// two amounts (USD + KHR) with one pad, like the Restaurant POS
function TwoAmounts({ p, usdVal, khrVal, setUsd, setKhr, labels }) {
  const [field, setField] = useState("usd");
  return (
    <>
      <div className="sh-two">
        <button type="button" className={`sh-amount ${field === "usd" ? "on" : ""}`} onClick={() => setField("usd")} data-testid="sh-usd">
          <small>{labels?.[0] || p.cashUsd}</small>
          <b>{usd(Number(usdVal) || 0)}</b>
        </button>
        <button type="button" className={`sh-amount ${field === "khr" ? "on" : ""}`} onClick={() => setField("khr")} data-testid="sh-khr">
          <small>{labels?.[1] || p.cashKhr}</small>
          <b>{riel(Number(khrVal) || 0)}</b>
        </button>
      </div>
      <Pad value={field === "usd" ? usdVal : khrVal} onChange={field === "usd" ? setUsd : (v) => setKhr(v.replace(/\D/g, ""))} dot={field === "usd"} max={field === "usd" ? 9 : 11} />
    </>
  );
}

// full screen after the PIN: no selling until the drawer is counted
export function OpenShiftScreen({ p, boot, online, onOpened, onLock, onSkip }) {
  const [u, setU] = useState("");
  const [k, setK] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const start = async () => {
    setBusy(true);
    setError("");
    try {
      await martPosApi.openShift(null, { float_usd: Number(u) || 0, float_khr: Number(k) || 0 });
      await onOpened();
    } catch (e) {
      setError(e.code === "network" ? p.needOnline : e.message);
      setBusy(false);
    }
  };
  return (
    <div className="ghp-center mp-center">
      <div className="ghp-card sh-card">
        <div className="ghp-card-top">
          <span className="ghp-icon">
            <Vault size={26} />
          </span>
          <small className="ghp-kicker">{boot.business.name}</small>
        </div>
        <h1>{p.openShiftTitle}</h1>
        <p className="ghp-muted">
          <b>{boot.staff.name}</b> · {p.openShiftSub}
        </p>
        <TwoAmounts p={p} usdVal={u} khrVal={k} setUsd={setU} setKhr={setK} />
        {error && <div className="md-form-error">{error}</div>}
        <button type="button" className="md-btn md-btn-primary ghp-big" onClick={start} disabled={busy} data-testid="sh-start">
          {p.startShift}
        </button>
        <small className="ghp-muted sh-rate">1 USD = {riel(boot.settings.khr_rate)}</small>
        {!online && (
          <button type="button" className="ghp-link-btn" onClick={onSkip}>
            {p.skipOffline}
          </button>
        )}
        <button type="button" className="ghp-link-btn" onClick={onLock} disabled={busy}>
          <LogOut size={14} /> {p.notYou.replace("{name}", boot.staff.name)}
        </button>
      </div>
    </div>
  );
}

// count again and close (a sheet over the sale screen)
export function CloseShiftSheet({ p, m, boot, onClose, onClosed }) {
  const [cur, setCur] = useState(null);
  const [u, setU] = useState("");
  const [k, setK] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [move, setMove] = useState(null); // "in" | "out"
  const load = () =>
    martPosApi
      .shifts()
      .then((r) => setCur(r.data.current))
      .catch((e) => setError(e.code === "network" ? p.needOnline : e.message));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const c = boot.settings.currency;
  const close = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await martPosApi.closeShift(null, cur._id, { counted_usd: Number(u) || 0, counted_khr: Number(k) || 0, note });
      onClosed(r.data);
    } catch (e) {
      setError(e.code === "network" ? p.needOnline : e.message);
      setBusy(false);
    }
  };
  const L = cur?.live;
  const dU = L ? Math.round(((Number(u) || 0) - L.expected_usd) * 100) / 100 : 0;
  const dK = L ? (Number(k) || 0) - L.expected_khr : 0;
  return (
    <div className="md-modal-backdrop" onMouseDown={() => !busy && onClose()}>
      <div className="md-modal md-modal-lg sh-sheet" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="md-modal-header">
          <h3>
            {p.closeShift}
            {cur ? ` · ${cur.no}` : ""}
          </h3>
          <button type="button" className="md-icon-btn" onClick={onClose} disabled={busy} aria-label={p.close}>
            <X size={18} />
          </button>
        </div>
        <div className="md-modal-body">
          {!cur ? (
            <p className="rs-muted">{error || "…"}</p>
          ) : (
            <div className="sh-close">
              <div className="sh-left">
                <p className="rs-muted" style={{ margin: 0 }}>
                  {p.closeShiftSub}
                </p>
                <div className="sh-stats">
                  <div>
                    <small>{p.receipts}</small>
                    <b>{L.sales_count}</b>
                  </div>
                  <div>
                    <small>{p.salesTotal}</small>
                    <b>{money(L.sales_total, c)}</b>
                  </div>
                </div>
                {Object.keys(L.by_method).length > 0 && (
                  <div className="sh-lines">
                    {Object.entries(L.by_method).map(([key, v]) => (
                      <div key={key}>
                        <span>{methodName(m, key)}</span>
                        <b>{money(v, c)}</b>
                      </div>
                    ))}
                  </div>
                )}
                <table className="sh-cash">
                  <thead>
                    <tr>
                      <th />
                      <th>USD</th>
                      <th>KHR</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="sub">
                      <td>{p.float}</td>
                      <td>{usd(cur.float_usd)}</td>
                      <td>{riel(cur.float_khr)}</td>
                    </tr>
                    <tr className="sub">
                      <td>{p.cashSales}</td>
                      <td>+{usd(L.cash_usd)}</td>
                      <td>+{riel(L.cash_khr)}</td>
                    </tr>
                    {L.change_khr > 0 && (
                      <tr className="sub">
                        <td>{p.changeOut}</td>
                        <td />
                        <td>−{riel(L.change_khr)}</td>
                      </tr>
                    )}
                    {(L.in_usd > 0 || L.in_khr > 0) && (
                      <tr className="sub">
                        <td>{p.moneyIn}</td>
                        <td>{L.in_usd ? `+${usd(L.in_usd)}` : ""}</td>
                        <td>{L.in_khr ? `+${riel(L.in_khr)}` : ""}</td>
                      </tr>
                    )}
                    {(L.out_usd > 0 || L.out_khr > 0) && (
                      <tr className="sub">
                        <td>{p.moneyOut}</td>
                        <td>{L.out_usd ? `−${usd(L.out_usd)}` : ""}</td>
                        <td>{L.out_khr ? `−${riel(L.out_khr)}` : ""}</td>
                      </tr>
                    )}
                    <tr>
                      <td>{p.expected}</td>
                      <td>{usd(L.expected_usd)}</td>
                      <td>{riel(L.expected_khr)}</td>
                    </tr>
                    <tr>
                      <td>{p.counted}</td>
                      <td>{usd(Number(u) || 0)}</td>
                      <td>{riel(Number(k) || 0)}</td>
                    </tr>
                    <tr className="diff">
                      <td>{p.difference}</td>
                      <td className={dU < 0 ? "neg" : dU > 0 ? "pos" : ""}>{sign(dU, usd)}</td>
                      <td className={dK < 0 ? "neg" : dK > 0 ? "pos" : ""}>{sign(dK, riel)}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="sh-moves">
                  <button type="button" className="ms-act" onClick={() => setMove("in")} disabled={busy}>
                    <ArrowDownToLine size={14} /> {p.moneyIn}
                  </button>
                  <button type="button" className="ms-act" onClick={() => setMove("out")} disabled={busy}>
                    <ArrowUpFromLine size={14} /> {p.moneyOut}
                  </button>
                </div>
                <input className="ghp-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={p.note} maxLength={300} />
                {error && <div className="md-form-error">{error}</div>}
                <button type="button" className="md-btn md-btn-primary ghp-big" onClick={close} disabled={busy} data-testid="sh-close">
                  <Lock size={16} /> {p.closeNow}
                </button>
              </div>
              <div className="sh-right">
                <TwoAmounts p={p} usdVal={u} khrVal={k} setUsd={setU} setKhr={setK} labels={[`${p.counted} · USD`, `${p.counted} · KHR`]} />
              </div>
            </div>
          )}
        </div>
      </div>
      {move && cur && (
        <MoveSheet
          p={p}
          kind={move}
          onClose={() => setMove(null)}
          onSave={async (a, b, n) => {
            await martPosApi.shiftCash(null, cur._id, { kind: move, amount_usd: a, amount_khr: b, note: n });
            setMove(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function MoveSheet({ p, kind, onClose, onSave }) {
  const [u, setU] = useState("");
  const [k, setK] = useState("");
  const [n, setN] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="md-modal-backdrop" onMouseDown={onClose}>
      <div className="md-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="md-modal-header">
          <h3>{kind === "in" ? p.moneyIn : p.moneyOut}</h3>
          <button type="button" className="md-icon-btn" onClick={onClose} aria-label={p.close}>
            <X size={18} />
          </button>
        </div>
        <div className="md-modal-body sh-move">
          <TwoAmounts p={p} usdVal={u} khrVal={k} setUsd={setU} setKhr={setK} labels={["USD", "KHR"]} />
          <input className="ghp-input" value={n} onChange={(e) => setN(e.target.value)} placeholder={p.note} maxLength={200} />
          {error && <div className="md-form-error">{error}</div>}
          <button
            type="button"
            className="md-btn md-btn-primary ghp-big"
            disabled={busy || (!(Number(u) > 0) && !(Number(k) > 0))}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(Number(u) || 0, Number(k) || 0, n);
              } catch (e) {
                setError(e.message);
                setBusy(false);
              }
            }}
          >
            {kind === "in" ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />} {kind === "in" ? p.moneyIn : p.moneyOut}
          </button>
        </div>
      </div>
    </div>
  );
}

// after closing: the shift summary, print, Done → PIN screen for the next person
export function ShiftDoneScreen({ p, m, boot, shift, canPrint, onDone }) {
  const c = boot.settings.currency;
  const off = Math.abs(shift.diff_usd) >= 0.01 || Math.abs(shift.diff_khr) >= 1;
  return (
    <div className="ghp-center mp-center">
      <div className="ghp-card sh-card sh-done">
        <span className="sh-ok">
          <CheckCircle2 size={52} />
        </span>
        <h1>{p.shiftClosedTitle}</h1>
        <p className="ghp-muted">
          {p.shiftNo.replace("{no}", shift.no)} · {shift.closed_by}
        </p>
        <b className="sh-big">{money(shift.sales_total, c)}</b>
        <small className="ghp-muted">
          {p.receipts}: {shift.sales_count}
        </small>
        <table className="sh-cash small">
          <tbody>
            <tr>
              <td>{p.expected}</td>
              <td>{usd(shift.expected_usd)}</td>
              <td>{riel(shift.expected_khr)}</td>
            </tr>
            <tr>
              <td>{p.counted}</td>
              <td>{usd(shift.counted_usd)}</td>
              <td>{riel(shift.counted_khr)}</td>
            </tr>
            <tr className="diff">
              <td>{p.difference}</td>
              <td className={shift.diff_usd < 0 ? "neg" : shift.diff_usd > 0 ? "pos" : ""}>{sign(shift.diff_usd, usd)}</td>
              <td className={shift.diff_khr < 0 ? "neg" : shift.diff_khr > 0 ? "pos" : ""}>{sign(shift.diff_khr, riel)}</td>
            </tr>
          </tbody>
        </table>
        {!off && <em className="ms-pill">{m.exact2}</em>}
        <div className="sh-btns">
          {canPrint && (
            <button type="button" className="md-btn md-btn-ghost sh-btn" onClick={() => printShift({ shift, boot, p, m })}>
              <Printer size={16} /> {p.printShift}
            </button>
          )}
          <button type="button" className="ghp-big sh-btn" onClick={onDone} data-testid="sh-done">
            {p.doneNext}
          </button>
        </div>
        <small className="ghp-muted">{p.nextPerson}</small>
      </div>
    </div>
  );
}

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;");
function printShift({ shift, boot, p, m }) {
  const c = boot.settings.currency;
  const when = (d) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(d));
  const row = (a, b, cc = "") => `<tr${cc ? ` class="${cc}"` : ""}><td>${a}</td><td class="r">${b}</td></tr>`;
  const methods = Object.entries(shift.by_method || {})
    .map(([k, v]) => row(esc(methodName(m, k)), money(v, c)))
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:80mm auto;margin:0}body{margin:0;padding:3mm;width:72mm;font:12px/1.4 "Kantumruy Pro",system-ui,sans-serif}h2{margin:0;text-align:center;font-size:15px}.c{text-align:center}table{width:100%;border-collapse:collapse}.r{text-align:right}hr{border:0;border-top:1px dashed #000;margin:5px 0}.b td{font-weight:700}</style></head><body>
<h2>${esc(boot.business.name)}</h2><div class="c">${esc(p.shiftNo.replace("{no}", shift.no))}</div><hr>
<table>${row(when(shift.opened_at), esc(shift.opened_by))}${row(when(shift.closed_at), esc(shift.closed_by))}</table><hr>
<table>${row(p.receipts, shift.sales_count)}${row(p.salesTotal, money(shift.sales_total, c), "b")}${methods}</table><hr>
<table>${row(p.float, `${usd(shift.float_usd)} · ${riel(shift.float_khr)}`)}${row(p.expected, `${usd(shift.expected_usd)} · ${riel(shift.expected_khr)}`)}${row(p.counted, `${usd(shift.counted_usd)} · ${riel(shift.counted_khr)}`)}${row(p.difference, `${sign(shift.diff_usd, usd)} · ${sign(shift.diff_khr, riel)}`, "b")}</table>
${shift.note ? `<hr><div>${esc(shift.note)}</div>` : ""}</body></html>`;
  const f = document.createElement("iframe");
  Object.assign(f.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(f);
  f.contentWindow.document.open();
  f.contentWindow.document.write(html);
  f.contentWindow.document.close();
  setTimeout(() => {
    f.contentWindow.focus();
    f.contentWindow.print();
    setTimeout(() => f.remove(), 60000);
  }, 300);
}
