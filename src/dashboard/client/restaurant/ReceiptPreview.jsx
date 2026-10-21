import { ChefHat } from "lucide-react";
import { fmtMoney, toKhr } from "./text";

// What a printed receipt will look like (80 mm or 58 mm), built from the settings being edited
export default function ReceiptPreview({ s, r }) {
  const items = r.sampleItems;
  const sub = items.reduce((n, [, q, p]) => n + q * p, 0);
  const service = s.service_charge?.enabled ? (sub * Number(s.service_charge.rate || 0)) / 100 : 0;
  const vat = s.vat?.enabled && !s.vat.included ? ((sub + service) * Number(s.vat.rate || 0)) / 100 : 0;
  const total = sub + service + vat;
  const rate = Number(s.khr_rate) || 4100;
  const rounding = Number(s.khr_rounding) || 100;
  const usd = s.currency !== "KHR";
  const main = (n) => (usd ? fmtMoney(n) : fmtMoney(toKhr(n, rate, rounding), "KHR"));
  return (
    <div className={`rs-receipt w${s.receipt_size || 80}`} aria-label={r.preview}>
      <div className="rs-receipt-head">
        {s.logo?.url ? <img src={s.logo.url} alt="" /> : <ChefHat size={30} />}
        <b>{s.name_km || s.name_en || "—"}</b>
        {s.name_km && s.name_en && <span>{s.name_en}</span>}
        {s.address && <small>{s.address}</small>}
        {s.phone && <small>{s.phone}</small>}
        {s.tin && <small>TIN: {s.tin}</small>}
      </div>
      <div className="rs-receipt-meta">
        <span>#0001 · {r.table} A1</span>
        <span>{r.cashier}: Dara</span>
      </div>
      <div className="rs-receipt-lines">
        {items.map(([name, q, p]) => (
          <div key={name}>
            <span>
              {q} × {name}
            </span>
            <span>{main(q * p)}</span>
          </div>
        ))}
      </div>
      <div className="rs-receipt-totals">
        <div>
          <span>{r.subtotal}</span>
          <span>{main(sub)}</span>
        </div>
        {service > 0 && (
          <div>
            <span>
              {r.service.split(" (")[0]} {s.service_charge.rate}%
            </span>
            <span>{main(service)}</span>
          </div>
        )}
        {s.vat?.enabled && (
          <div>
            <span>
              VAT {s.vat.rate}% {s.vat.included ? `(${r.vatIncluded.toLowerCase()})` : ""}
            </span>
            <span>{s.vat.included ? "—" : main(vat)}</span>
          </div>
        )}
        <div className="big">
          <span>{r.total}</span>
          <span>{main(total)}</span>
        </div>
        <div>
          <span />
          <span>{usd ? fmtMoney(toKhr(total, rate, rounding), "KHR") : fmtMoney(total)}</span>
        </div>
        <small>1 USD = {new Intl.NumberFormat("en-US").format(rate)}៛</small>
      </div>
      <div className="rs-receipt-foot">
        <span>{s.receipt_footer || r.thanks}</span>
        {s.wifi_name && (
          <small>
            Wi-Fi: {s.wifi_name}
            {s.wifi_pass ? ` · ${s.wifi_pass}` : ""}
          </small>
        )}
      </div>
    </div>
  );
}
