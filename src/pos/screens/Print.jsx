import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { getPos, money, pointsFor } from "../engine";
import { fmtMoney } from "../util";
import { usePosText } from "../text";
import { Receipt, ReceiptHead, ReceiptPaper, receiptWhen } from "../receipt";
import { Sheet } from "./Modals";

// Print through the browser's print window (receipt printers installed on this computer work).
// With the Shop Hub (later) it prints straight to network / USB printers instead.
let show = null;
export const printDoc = (node) => show?.(node);

export function PrintHost() {
  const [doc, setDoc] = useState(null);
  show = setDoc;
  useEffect(() => {
    if (!doc) return undefined;
    document.body.classList.add("pos-printing");
    const timer = setTimeout(() => window.print(), 150);
    const done = () => setDoc(null);
    window.addEventListener("afterprint", done);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
      document.body.classList.remove("pos-printing");
    };
  }, [doc]);
  if (!doc) return null;
  const size = getPos().setup?.restaurant?.receipt?.size || 80;
  return createPortal(<div className={`pos-print w${size}`}>{doc}</div>, document.body);
}

const when = receiptWhen;
const Head = () => <ReceiptHead restaurant={getPos().setup?.restaurant} money={money()} />;

// bill (before paying) or receipt (paid), with this POS's restaurant + money settings
export function ReceiptDoc({ order, t, paidView }) {
  const R = getPos().setup?.restaurant;
  return <Receipt order={order} t={t} paidView={paidView} restaurant={R} money={money()} theme={R?.receipt?.theme} points={pointsFor(order)} cashier={paidView ? order.closed_by?.name || "" : getPos().staff?.name || ""} />;
}

// see the receipt on screen first, then print it
let preview = null;
export const previewDoc = (node, title, onPrint) => preview?.({ node, title, onPrint });
export function PreviewHost() {
  const { t } = usePosText();
  const [doc, setDoc] = useState(null);
  preview = setDoc;
  if (!doc) return null;
  const size = getPos().setup?.restaurant?.receipt?.size || 80;
  return (
    <Sheet
      title={doc.title || t.preview}
      onClose={() => setDoc(null)}
      footer={
        <div className="pos-row-btns">
          <button type="button" className="pos-btn" onClick={() => setDoc(null)}>
            {t.close}
          </button>
          <button
            type="button"
            className="pos-btn primary"
            onClick={async () => {
              const node = doc.onPrint ? (await doc.onPrint()) || doc.node : doc.node;
              setDoc(null);
              printDoc(node);
            }}
          >
            <Printer size={18} /> {t.print}
          </button>
        </div>
      }
    >
      <div className="pos-preview">
        <ReceiptPaper size={size}>{doc.node}</ReceiptPaper>
        <small className="pos-muted">{t.printHint}</small>
      </div>
    </Sheet>
  );
}

export function ShiftDoc({ shift, sum, t }) {
  const c = money().currency;
  const diffUsd = (Number(shift.counted?.usd) || 0) - sum.expected.usd;
  const diffKhr = (Number(shift.counted?.khr) || 0) - sum.expected.khr;
  return (
    <div className="pr">
      <Head />
      <div className="pr-title">{t.shiftClosed}</div>
      <div className="pr-meta">
        <span>{getPos().device?.name}</span>
        <span>{shift.closed_by?.name || shift.opened_by?.name}</span>
      </div>
      <div className="pr-meta">
        <span>{when(shift.opened_at)}</span>
        <span>→ {when(shift.closed_at)}</span>
      </div>
      <div className="pr-rule" />
      <div className="pr-row">
        <span>{t.bills}</span>
        <span>{sum.bills}</span>
      </div>
      <div className="pr-row pr-total">
        <span>{t.sales}</span>
        <span>{fmtMoney(sum.sales, c)}</span>
      </div>
      {sum.discounts > 0 && (
        <div className="pr-row">
          <span>{t.discounts}</span>
          <span>{fmtMoney(sum.discounts, c)}</span>
        </div>
      )}
      <div className="pr-rule" />
      {Object.entries(sum.by_method).map(([k, v]) => (
        <div key={k} className="pr-row">
          <span>{k}</span>
          <span>{fmtMoney(v, c)}</span>
        </div>
      ))}
      <div className="pr-rule" />
      <div className="pr-row">
        <span>{t.expected}</span>
        <span>
          {fmtMoney(sum.expected.usd, "USD")} · {fmtMoney(sum.expected.khr, "KHR")}
        </span>
      </div>
      <div className="pr-row">
        <span>{t.counted}</span>
        <span>
          {fmtMoney(shift.counted?.usd || 0, "USD")} · {fmtMoney(shift.counted?.khr || 0, "KHR")}
        </span>
      </div>
      <div className="pr-row pr-total">
        <span>{t.difference}</span>
        <span>
          {diffUsd >= 0 ? "+" : "−"}
          {fmtMoney(Math.abs(diffUsd), "USD")} · {diffKhr >= 0 ? "+" : "−"}
          {fmtMoney(Math.abs(diffKhr), "KHR")}
        </span>
      </div>
      {(sum.void_orders > 0 || sum.void_lines > 0) && (
        <div className="pr-row">
          <span>{t.cancelled}</span>
          <span>
            {sum.void_orders} / {sum.void_lines}
          </span>
        </div>
      )}
    </div>
  );
}
