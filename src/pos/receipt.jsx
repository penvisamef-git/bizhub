import { calcOrder, lineOff, lineTotal } from "./calc";
import { fmtMoney } from "./util";
import "./receipt.css";

// The receipt itself — printed by the POS and shown on screen (preview, invoices in reports).
// Pure: everything comes in as props, so the dashboard can show a bill without the POS running.
//   restaurant = { name_km, name_en, logo, address, phone, tin, receipt: { footer, wifi_name, wifi_pass } }
//   money      = { currency, khr_rate, khr_rounding, vat, service_charge }
//   t          = labels (receiptTitle, billTitle, table, takeaway, cashier, subtotal, discount, service, vat, vatIncl,
//                total, change, rate, thanks, cancelledTitle?)

export const receiptWhen = (d) => new Date(d || Date.now()).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function ReceiptHead({ restaurant: R = {}, money: m = {} }) {
  return (
    <div className="pr-head">
      {R.logo && <img src={R.logo} alt="" />}
      {R.name_km && <b className="pr-km">{R.name_km}</b>}
      {R.name_en && <b>{R.name_en}</b>}
      {R.address && <span>{R.address}</span>}
      {R.phone && <span>{R.phone}</span>}
      {R.tin && m.vat?.enabled && <span>TIN: {R.tin}</span>}
    </div>
  );
}

// bill (before paying), receipt (paid) or a cancelled bill (reports)
export function Receipt({ order, t, paidView, restaurant, money: m, cashier, showVoid, theme, points }) {
  const tot = calcOrder(order, m);
  const R = restaurant || {};
  const c = m.currency;
  const other = c === "USD" ? "KHR" : "USD";
  const cancelled = order.status === "void";
  const lines = (order.lines || []).filter((l) => (showVoid ? l.void_reason !== "removed" : l.status !== "void"));
  const look = theme || R.receipt?.theme || "classic";
  const khmerFirst = look === "khmer";
  const columns = look === "columns";
  return (
    <div className={`pr pr-t-${look}`}>
      <ReceiptHead restaurant={R} money={m} />
      <div className="pr-title">{paidView ? t.receiptTitle : t.billTitle}</div>
      {cancelled && <div className="pr-stamp">{t.cancelledTitle || "CANCELLED"}</div>}
      <div className="pr-meta">
        <span>#{order.number}</span>
        <span>{order.table_name ? `${t.table} ${order.table_name}` : t.takeaway}</span>
      </div>
      <div className="pr-meta">
        <span>{receiptWhen(paidView ? order.paid_at || order.opened_at : order.paid_at || Date.now())}</span>
        <span>
          {t.cashier}: {cashier ?? (order.closed_by?.name || order.opened_by?.name || "")}
        </span>
      </div>
      <div className="pr-rule" />
      {columns && (
        <div className="pr-cols pr-cols-head">
          <span>{t.qty || "Qty"}</span>
          <span>{t.item || "Item"}</span>
          <span>{t.amount || "Amount"}</span>
        </div>
      )}
      {lines.map((l) => {
        const main = khmerFirst ? l.name_km || l.name_en : l.name_en || l.name_km;
        const sub = khmerFirst ? (l.name_km ? l.name_en : "") : l.name_en ? l.name_km : "";
        const price = fmtMoney(l.status === "void" ? lineTotal({ ...l, status: "" }) : lineTotal(l), c);
        return (
          <div key={l.id} className={`pr-line ${l.status === "void" ? "pr-void" : ""}`}>
            {columns ? (
              <div className="pr-cols">
                <span>{l.qty}</span>
                <span>
                  {main}
                  {l.size ? ` (${l.size})` : ""}
                </span>
                <span>{price}</span>
              </div>
            ) : (
              <div className="pr-row">
                <span>
                  {l.qty} × {main}
                  {l.size ? ` (${l.size})` : ""}
                </span>
                <span>{price}</span>
              </div>
            )}
            {sub && <div className="pr-sub">{sub}</div>}
            {l.addons?.map((a, i) => (
              <div key={i} className="pr-sub">
                + {a.name}
                {a.price ? ` ${fmtMoney(a.price, c)}` : ""}
              </div>
            ))}
            {l.note && <div className="pr-sub">“{l.note}”</div>}
            {l.status !== "void" && lineOff(l) > 0 && (
              <div className="pr-row pr-sub pr-off">
                <span>{l.discount?.kind ? `${t.discount}${l.discount.kind === "percent" ? ` ${l.discount.value}%` : ""}${l.discount.reason ? ` · ${l.discount.reason}` : ""}` : l.promo?.name}</span>
                <span>−{fmtMoney(lineOff(l), c)}</span>
              </div>
            )}
            {l.status === "void" && l.void_reason && <div className="pr-sub">✕ {l.void_reason}</div>}
          </div>
        );
      })}
      <div className="pr-rule" />
      <div className="pr-row">
        <span>{t.subtotal}</span>
        <span>{fmtMoney(tot.subtotal, c)}</span>
      </div>
      {tot.discount > 0 && (
        <div className="pr-row">
          <span>{t.discount}</span>
          <span>−{fmtMoney(tot.discount, c)}</span>
        </div>
      )}
      {tot.service > 0 && (
        <div className="pr-row">
          <span>
            {t.service} {m.service_charge?.rate}%
          </span>
          <span>{fmtMoney(tot.service, c)}</span>
        </div>
      )}
      {tot.vat > 0 && (
        <div className="pr-row">
          <span>
            {tot.vat_included ? t.vatIncl : t.vat} {m.vat?.rate}%
          </span>
          <span>{fmtMoney(tot.vat, c)}</span>
        </div>
      )}
      <div className="pr-row pr-total">
        <span>{t.total}</span>
        <span>{fmtMoney(tot.total, c)}</span>
      </div>
      <div className="pr-row pr-other">
        <span />
        <span>{fmtMoney(tot.other, other)}</span>
      </div>
      {paidView && (
        <>
          <div className="pr-rule" />
          {(order.payments || []).map((p) => (
            <div key={p.id} className="pr-row">
              <span>{p.method}</span>
              <span>{fmtMoney(p.amount, p.currency)}</span>
            </div>
          ))}
          {(order.change?.usd > 0 || order.change?.khr > 0) && (
            <div className="pr-row">
              <span>{t.change}</span>
              <span>{[order.change.usd > 0 && fmtMoney(order.change.usd, "USD"), order.change.khr > 0 && fmtMoney(order.change.khr, "KHR")].filter(Boolean).join(" + ")}</span>
            </div>
          )}
        </>
      )}
      {order.member?.id && (
        <>
          <div className="pr-rule" />
          <div className="pr-row">
            <span>★ {t.member || "Member"}</span>
            <span>
              {order.member.name} {order.member.phone}
            </span>
          </div>
          {(order.redemptions || []).map((r) => (
            <div key={r.id} className="pr-row pr-off">
              <span>{r.name}</span>
              <span>{r.code ? r.code : `−${r.points} ${t.pts || "pts"}`}</span>
            </div>
          ))}
          {(order.points_applied ? order.points_earned : points) > 0 && (
            <div className="pr-row">
              <span>{t.pointsEarned || "Points earned"}</span>
              <span>+{order.points_applied ? order.points_earned : points}</span>
            </div>
          )}
        </>
      )}
      <div className="pr-rule" />
      <div className="pr-foot">
        <span>
          {t.rate}: 1 USD = {fmtMoney(m.khr_rate, "KHR")}
        </span>
        {R.receipt?.footer && <span>{R.receipt.footer}</span>}
        {R.receipt?.wifi_name && (
          <span>
            Wi-Fi: {R.receipt.wifi_name}
            {R.receipt.wifi_pass ? ` · ${R.receipt.wifi_pass}` : ""}
          </span>
        )}
        {!R.receipt?.footer && <span>{t.thanks}</span>}
      </div>
    </div>
  );
}

// on screen: the receipt on a strip of paper, the width of the shop's printer roll
export function ReceiptPaper({ size = 80, children }) {
  return <div className={`pr-paper w${size === 58 ? 58 : 80}`}>{children}</div>;
}
