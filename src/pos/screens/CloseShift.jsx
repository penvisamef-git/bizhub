import { useState } from "react";
import { CheckCircle2, CloudOff, Loader2, Printer } from "lucide-react";
import { usePosText } from "../text";
import { endShift, finishShift, money, openShift, shiftNumbers, usePos } from "../engine";
import { fmtMoney } from "../util";
import Keypad from "./Keypad";
import { Sheet } from "./Modals";
import { printDoc, ShiftDoc } from "./Print";

// count the drawer → close → send → (print) → back to the PIN screen
export default function CloseShift({ onClose }) {
  const { t } = usePosText();
  const s = usePos();
  const shift = openShift(s);
  const sum = shift ? shiftNumbers(shift) : null;
  const c = money().currency;
  const [usd, setUsd] = useState("");
  const [khr, setKhr] = useState("");
  const [field, setField] = useState("usd");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (!shift) return null;

  const close = async () => {
    setBusy(true);
    await endShift(shift, { usd: Number(usd) || 0, khr: Number(khr) || 0 }, note); // → ShiftDone screen
  };
  const diff = (cur) => (cur === "usd" ? (Number(usd) || 0) - sum.expected.usd : (Number(khr) || 0) - sum.expected.khr);
  const sign = (v, cur) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtMoney(Math.abs(v), cur)}`;

  return (
    <Sheet title={t.closeShift} onClose={onClose} wide>
      <div className="pos-pay">
        <div className="pos-pay-left">
          <p className="pos-muted" style={{ margin: 0 }}>
            {t.closeShiftSub}
          </p>
          <div className="pos-stats">
            <div>
              <small>{t.bills}</small>
              <b>{sum.bills}</b>
            </div>
            <div>
              <small>{t.sales}</small>
              <b>{fmtMoney(sum.sales, c)}</b>
            </div>
            {sum.discounts > 0 && (
              <div>
                <small>{t.discounts}</small>
                <b>{fmtMoney(sum.discounts, c)}</b>
              </div>
            )}
          </div>
          {Object.keys(sum.by_method).length > 0 && (
            <div className="pos-pay-lines">
              {Object.entries(sum.by_method).map(([k, v]) => (
                <div key={k} className="pos-pay-line">
                  <span>{k}</span>
                  <b>{fmtMoney(v, c)}</b>
                </div>
              ))}
            </div>
          )}
          <table className="pos-cash">
            <thead>
              <tr>
                <th />
                <th>USD</th>
                <th>KHR</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{t.expected}</td>
                <td>{fmtMoney(sum.expected.usd, "USD")}</td>
                <td>{fmtMoney(sum.expected.khr, "KHR")}</td>
              </tr>
              <tr>
                <td>{t.counted}</td>
                <td>{fmtMoney(Number(usd) || 0, "USD")}</td>
                <td>{fmtMoney(Number(khr) || 0, "KHR")}</td>
              </tr>
              <tr className="diff">
                <td>{t.difference}</td>
                <td className={diff("usd") < 0 ? "neg" : ""}>{sign(diff("usd"), "USD")}</td>
                <td className={diff("khr") < 0 ? "neg" : ""}>{sign(diff("khr"), "KHR")}</td>
              </tr>
            </tbody>
          </table>
          {sum.open_orders > 0 && <p className="pos-alert soft">{t.openBillsWarn.replace("{n}", sum.open_orders)}</p>}
          {!s.online && <p className="pos-alert soft">{t.closingOffline}</p>}
          <input className="pos-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.note} maxLength={300} />
          <button type="button" className="pos-btn primary big" onClick={close} disabled={busy}>
            {busy ? t.syncing : t.closeAndSend}
          </button>
        </div>
        <div className="pos-pay-right">
          <div className="pos-two">
            <button type="button" className={`pos-amount ${field === "usd" ? "on" : ""}`} onClick={() => setField("usd")}>
              <small>{t.cashUsd}</small>
              <b>{fmtMoney(Number(usd) || 0, "USD")}</b>
            </button>
            <button type="button" className={`pos-amount ${field === "khr" ? "on" : ""}`} onClick={() => setField("khr")}>
              <small>{t.cashKhr}</small>
              <b>{fmtMoney(Number(khr) || 0, "KHR")}</b>
            </button>
          </div>
          <Keypad value={field === "usd" ? usd : khr} onChange={field === "usd" ? setUsd : (v) => setKhr(v.replace(/\D/g, ""))} dot={field === "usd"} max={10} />
        </div>
      </div>
    </Sheet>
  );
}

// after closing: the shift summary as its own screen, then "Done" → PIN screen for the next person
export function ShiftDone() {
  const { t } = usePosText();
  const s = usePos();
  const done = s.shiftDone;
  const c = money().currency;
  const sending = done.synced === null;
  return (
    <div className="pos-center pos-start">
      <div className="pos-card pos-shift-done">
        <h1>{t.shiftClosed}</h1>
        <div className="pos-paid">
          {sending ? <Loader2 size={52} className="md-spin" /> : done.synced ? <CheckCircle2 size={52} /> : <CloudOff size={52} className="warn" />}
          <b>{fmtMoney(done.sum.sales, c)}</b>
          <p className="pos-muted">{sending ? t.sending : done.synced ? t.shiftSent : t.shiftWaiting}</p>
          <div className="pos-paid-btns">
            <button type="button" className="pos-btn" onClick={() => printDoc(<ShiftDoc shift={done.shift} sum={done.sum} t={t} />)}>
              <Printer size={18} /> {t.printShift}
            </button>
            <button type="button" className="pos-btn primary" onClick={finishShift} disabled={sending}>
              {t.done}
            </button>
          </div>
          <small className="pos-muted">{t.shiftDoneNext}</small>
        </div>
      </div>
    </div>
  );
}
