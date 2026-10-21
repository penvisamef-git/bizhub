import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Copy } from "lucide-react";
import { Modal } from "../super_admin/parts";
import { fmt, fmtDate, useSaText } from "../super_admin/text";
import { useLicenseText } from "./licenses/text";
import "./txdetail.css";

// One coin transaction in a small window: in / out, when, what for (business, product, period),
// how it was paid, balance after. Owner wallet ("me") and super admin ("admin") use the same window.
const TX = {
  en: {
    title: "Transaction",
    in: "Coins in",
    out: "Coins out",
    when: "Date & time",
    kind: "Type",
    what: "For",
    business: "Business",
    period: "Period",
    days: "{n} days",
    forever: "Forever",
    item: "Item",
    from: "From",
    to: "To",
    bizhub: "BizHub",
    cards: "Top-up cards",
    balanceAfter: "Balance after",
    payment: "Payment",
    reference: "Reference",
    paid: "Paid",
    order: "Coin order",
    orderCoins: "{coins} coins + {bonus} free",
    note: "Note",
    by: "Done by",
    id: "Transaction ID",
    copy: "Copy",
    copied: "Copied",
    close: "Close",
    newBiz: "New business",
    buyCoins: "Buy coins",
    deleted: "deleted",
  },
  km: {
    title: "ប្រតិបត្តិការ",
    in: "កាក់ចូល",
    out: "កាក់ចេញ",
    when: "កាលបរិច្ឆេទ និងម៉ោង",
    kind: "ប្រភេទ",
    what: "សម្រាប់",
    business: "អាជីវកម្ម",
    period: "រយៈពេល",
    days: "{n} ថ្ងៃ",
    forever: "ជារៀងរហូត",
    item: "ធាតុ",
    from: "ពី",
    to: "ទៅ",
    bizhub: "BizHub",
    cards: "កាតបញ្ចូលកាក់",
    balanceAfter: "សមតុល្យក្រោយ",
    payment: "ការទូទាត់",
    reference: "លេខយោង",
    paid: "បានបង់",
    order: "ការកុម្ម៉ង់កាក់",
    orderCoins: "{coins} កាក់ + {bonus} ឥតគិតថ្លៃ",
    note: "កំណត់ចំណាំ",
    by: "ធ្វើដោយ",
    id: "លេខប្រតិបត្តិការ",
    copy: "ចម្លង",
    copied: "បានចម្លង",
    close: "បិទ",
    newBiz: "អាជីវកម្មថ្មី",
    buyCoins: "ទិញកាក់",
    deleted: "បានលុប",
  },
};

export function useTxText() {
  const { s, t, lang } = useSaText();
  const { l } = useLicenseText();
  const x = TX[lang] || TX.en;
  const products = l?.products || {};
  return { x, s, t, lang, products };
}

// a readable title for a transaction row (list + window)
export function txTitle(tx, { x, s, t, products }) {
  if (tx.order?.no) return `${x.buyCoins} · ${tx.order.no}`;
  if (tx.type === "spend") {
    if (tx.product === "new_business") return `${x.newBiz} · ${s.categoryNames?.[tx.service] || tx.service || ""}`;
    if (tx.product && products[tx.product]) return products[tx.product];
    return tx.note || s.typeNames?.spend;
  }
  if (tx.type === "signup_bonus") return t?.txBonus || s.typeNames.signup_bonus;
  if (tx.type === "card_redeem") return t?.txCard || s.typeNames.card_redeem;
  return tx.note || s.typeNames?.[tx.type] || tx.type;
}

const who = (c, x) => (c ? c.name || c.email || "—" : x.bizhub);

export default function TxDetail({ tx, view = "me", meId, onClose }) {
  const tt = useTxText();
  const { x, s, t } = tt;
  const [copied, setCopied] = useState(false);
  const incoming = view === "me" ? tx.direction === "in" : meId ? String(tx.to_customer?._id || tx.to_customer) === String(meId) : tx.type === "generate" || tx.type === "signup_bonus";
  const sign = view === "admin" && !meId ? "" : incoming ? "+" : "−";
  const typeName = view === "me" && tx.type === "transfer" ? (incoming ? t?.txIn || x.in : t?.txOut || x.out) : s.typeNames?.[tx.type] || tx.type;
  const pay = tx.payment?.method ? tx.payment : null;
  const rows = [
    [x.when, fmtDate(tx.created_date, true)],
    [x.kind, typeName],
    tx.business && [x.business, `${tx.business.name}${tx.business.deleted ? ` (${x.deleted})` : ""} · ${s.categoryNames?.[tx.business.category] || tx.business.category}`],
    tx.product && tx.product !== "new_business" && [x.what, tt.products[tx.product] || tx.product],
    tx.item && [x.item, tx.item],
    tx.type === "spend" && tx.product && tx.product !== "new_business" && [x.period, tx.days ? x.days.replace("{n}", tx.days) : x.forever],
    view === "admin" && [x.from, tx.type === "generate" || tx.type === "signup_bonus" ? "—" : tx.type === "card_redeem" || tx.type === "card_cancel" ? x.cards : who(tx.from_customer, x)],
    view === "admin" && [x.to, tx.type === "card_create" ? x.cards : who(tx.to_customer, x)],
    view === "me" && tx.other && [incoming ? x.from : x.to, tx.other.kind === "customer" ? tx.other.name || "—" : x.bizhub],
    tx.order && [x.order, `${tx.order.no} · ${x.orderCoins.replace("{coins}", fmt(tx.order.coins)).replace("{bonus}", fmt(tx.order.bonus))}`],
    pay && [x.payment, `${pay.method}${pay.amount_usd !== null && pay.amount_usd !== undefined ? ` · $${pay.amount_usd}` : ""}`],
    pay?.reference && [x.reference, pay.reference],
    tx.cards > 0 && [x.cards, fmt(tx.cards)],
    view === "me" && tx.balance_after !== null && tx.balance_after !== undefined && [x.balanceAfter, fmt(tx.balance_after)],
    view === "admin" && tx.from_balance_after !== null && tx.from_balance_after !== undefined && tx.from_customer && [`${x.balanceAfter} · ${who(tx.from_customer, x)}`, fmt(tx.from_balance_after)],
    view === "admin" && tx.to_balance_after !== null && tx.to_balance_after !== undefined && [`${x.balanceAfter} · ${who(tx.to_customer, x)}`, fmt(tx.to_balance_after)],
    tx.note && [x.note, tx.note],
    view === "admin" && tx.by_user && [x.by, `${tx.by_user.firstname || ""} ${tx.by_user.lastname || ""}`.trim() || tx.by_user.email],
  ].filter(Boolean);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(tx._id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no clipboard */
    }
  };
  return (
    <Modal
      title={x.title}
      onClose={onClose}
      size="md-modal-sm"
      footer={
        <button type="button" className="md-btn md-btn-ghost" onClick={onClose}>
          {x.close}
        </button>
      }
    >
      <div className="txd" data-testid="tx-detail">
        <div className={`txd-top ${incoming || !sign ? "in" : "out"}`}>
          <span className="txd-ic">{incoming ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}</span>
          <b className="txd-amt">
            {sign}
            {fmt(tx.amount)}
          </b>
          <span className="txd-what">{txTitle(tx, tt)}</span>
          <span className={`sa-tx-type t-${tx.type}`}>{typeName}</span>
        </div>
        <dl className="txd-rows">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          <div>
            <dt>{x.id}</dt>
            <dd className="txd-id">
              <code>{String(tx._id)}</code>
              <button type="button" className="md-icon-btn" onClick={copy} aria-label={x.copy} title={copied ? x.copied : x.copy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}
