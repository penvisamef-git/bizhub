import { toKhmerDigits } from "./useHomepageData";

// a service's price in coins only: "100 coins / year"
export default function PriceTag({ t, price, lang, big = false }) {
  const n = (v) => (lang === "km" ? toKhmerDigits(v) : v);
  if (!price?.coins) return null;
  return (
    <span className={`price-tag${big ? " big" : ""}`}>
      <b>{n(price.coins)}</b> {t.coins} <em>{price.yearly ? t.perYear : `· ${t.oneTime}`}</em>
    </span>
  );
}
