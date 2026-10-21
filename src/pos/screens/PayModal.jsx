import { useMemo, useState } from "react";
import { CheckCircle2, Printer, Trash2 } from "lucide-react";
import { usePosText } from "../text";
import { getPos, money, pay } from "../engine";
import { calcOrder, otherCurrency, paymentValue, roundStep } from "../calc";
import { fmtMoney } from "../util";
import Keypad from "./Keypad";
import { Sheet } from "./Modals";
import { printDoc, ReceiptDoc } from "./Print";
import { ReceiptPaper } from "../receipt";
import { showThanks } from "../display";

const NOTES = { USD: [1, 5, 10, 20, 50, 100], KHR: [5000, 10000, 20000, 50000, 100000] };

// take payment: one or more methods, USD and riel, change worked out in the currency chosen
export default function PayModal({ order, onClose, onDone }) {
  const { t } = usePosText();
  const m = money();
  const main = m.currency;
  const methods = getPos().setup?.restaurant?.payment_methods?.length ? getPos().setup.restaurant.payment_methods : [{ name: "Cash", kind: "cash" }];
  const [method, setMethod] = useState(methods[0]);
  const [currency, setCurrency] = useState(main);
  const [input, setInput] = useState("");
  const [list, setList] = useState([]);
  const [changeIn, setChangeIn] = useState("KHR");
  const [done, setDone] = useState(null);

  const draft = Number(input) > 0 ? [{ method: method.name, kind: method.kind, currency, amount: Number(input) }] : [];
  const all = [...list, ...draft];
  const tot = useMemo(() => calcOrder({ ...order, payments: [...(order.payments || []), ...all] }, m), [order, all.length, input, currency]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = calcOrder(order, m);
  const remainIn = (cur) => {
    const left = Math.max(0, base.total - (list.reduce((a, p) => a + paymentValue(p, m), 0) + (order.payments || []).reduce((a, p) => a + paymentValue(p, m), 0)));
    if (cur === main) return left;
    return cur === "KHR" ? roundStep(left * m.khr_rate, m.khr_rounding || 100) : Math.ceil((left / m.khr_rate) * 100) / 100;
  };
  const changeOut = () => {
    if (tot.change <= 0) return { usd: 0, khr: 0 };
    if (main === "USD") return changeIn === "KHR" ? { usd: 0, khr: roundStep(tot.change * m.khr_rate, m.khr_rounding || 100) } : { usd: tot.change, khr: 0 };
    return changeIn === "USD" ? { usd: Math.floor((tot.change / m.khr_rate) * 100) / 100, khr: 0 } : { usd: 0, khr: tot.change };
  };
  const add = () => {
    if (!draft.length) return;
    setList([...list, ...draft]);
    setInput("");
  };
  const complete = async () => {
    const change = changeOut();
    const paid = await pay(order._id, all, change);
    showThanks(order._id, change); // the guest's screen says thank you (and shows the change)
    setDone({ order: paid, change });
  };
  const pickMethod = (mm) => {
    setMethod(mm);
    if (mm.kind !== "cash") {
      setCurrency(main);
      setInput(String(remainIn(main)));
    }
  };

  if (done) {
    const ch = done.change;
    return (
      <Sheet title={t.paidDone} onClose={onDone} wide>
        <div className="pos-paid-wrap">
        <div className="pos-paid">
          <CheckCircle2 size={56} />
          <b>{fmtMoney(base.total, main)}</b>
          {(ch.usd > 0 || ch.khr > 0) && <div className="pos-change-big">{t.giveChange.replace("{v}", [ch.usd > 0 && fmtMoney(ch.usd, "USD"), ch.khr > 0 && fmtMoney(ch.khr, "KHR")].filter(Boolean).join(" + "))}</div>}
          <div className="pos-paid-btns">
            <button type="button" className="pos-btn" onClick={() => printDoc(<ReceiptDoc order={done.order} t={t} paidView />)}>
              <Printer size={18} /> {t.printReceipt}
            </button>
            <button type="button" className="pos-btn primary" onClick={onDone}>
              {t.done}
            </button>
          </div>
        </div>
        <div className="pos-paid-receipt" aria-label={t.preview}>
          <ReceiptPaper size={getPos().setup?.restaurant?.receipt?.size || 80}>
            <ReceiptDoc order={done.order} t={t} paidView />
          </ReceiptPaper>
        </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={`${t.payTitle} · #${order.number}`} onClose={onClose} wide>
      <div className="pos-pay">
        <div className="pos-pay-left">
          <div className="pos-due">
            <small>{t.due}</small>
            <b>{fmtMoney(base.total, main)}</b>
            <span>{fmtMoney(otherCurrency(base.total, m), main === "USD" ? "KHR" : "USD")}</span>
          </div>
          <div className="pos-pay-lines">
            {list.map((p, i) => (
              <div key={i} className="pos-pay-line">
                <span>{p.method}</span>
                <b>{fmtMoney(p.amount, p.currency)}</b>
                <button type="button" className="pos-icon" onClick={() => setList(list.filter((_, j) => j !== i))} aria-label="Remove">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="pos-pay-sum">
            <div>
              <span>{t.paid}</span>
              <b>{fmtMoney(tot.paid, main)}</b>
            </div>
            {!tot.settled && (
              <div className="left">
                <span>{t.remaining}</span>
                <b>
                  {fmtMoney(tot.due, main)} <small>· {fmtMoney(otherCurrency(tot.due, m), main === "USD" ? "KHR" : "USD")}</small>
                </b>
              </div>
            )}
            {tot.change > 0 && (
              <div className="change">
                <span>{t.change}</span>
                <b>{[changeOut().usd > 0 && fmtMoney(changeOut().usd, "USD"), changeOut().khr > 0 && fmtMoney(changeOut().khr, "KHR")].filter(Boolean).join(" + ")}</b>
              </div>
            )}
          </div>
          {tot.change > 0 && (
            <div className="pos-chips">
              <small>{t.changeIn}</small>
              {["KHR", "USD"].map((cur) => (
                <button key={cur} type="button" className={changeIn === cur ? "on" : ""} onClick={() => setChangeIn(cur)}>
                  {cur === "KHR" ? "៛ Riel" : "$ USD"}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="pos-btn primary big" disabled={!tot.settled} onClick={complete}>
            {t.complete}
          </button>
        </div>
        <div className="pos-pay-right">
          <div className="pos-chips">
            {methods.map((mm) => (
              <button key={mm.name} type="button" className={method.name === mm.name ? "on" : ""} onClick={() => pickMethod(mm)}>
                {mm.name}
              </button>
            ))}
          </div>
          <div className="pos-chips">
            {["USD", "KHR"].map((cur) => (
              <button key={cur} type="button" className={currency === cur ? "on" : ""} onClick={() => setCurrency(cur)} disabled={method.kind !== "cash" && cur !== main}>
                {cur === "USD" ? "$ USD" : "៛ Riel"}
              </button>
            ))}
          </div>
          <div className="pos-display">{fmtMoney(Number(input) || 0, currency)}</div>
          <div className="pos-notes">
            <button type="button" onClick={() => setInput(String(remainIn(currency)))}>
              {t.exact}
            </button>
            {method.kind === "cash" &&
              NOTES[currency].map((v) => (
                <button key={v} type="button" onClick={() => setInput(String((Number(input) || 0) + v))}>
                  +{currency === "KHR" ? `${v / 1000}k` : `$${v}`}
                </button>
              ))}
          </div>
          <Keypad value={input} onChange={(v) => setInput(currency === "KHR" ? v.replace(/\D/g, "") : v)} dot={currency === "USD"} max={10} onEnter={add} enterLabel={t.addPayment} />
        </div>
      </div>
    </Sheet>
  );
}
