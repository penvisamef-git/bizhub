// Weighing-scale labels (mart_scale): EAN-13 = prefix + item code (the product's PLU) + weight in grams (or the price) + check digit.
//   cfg: { prefix: "21", item_len: 5, mode: "weight" | "price" }
//   → { plu, weight } (kg) or { plu, price } — null when the code is not a scale label
export function parseScale(code, cfg, currency = "USD") {
  const c = String(code || "").trim();
  if (!cfg || !/^\d{13}$/.test(c) || !c.startsWith(cfg.prefix || "2")) return null;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(c[i]) * (i % 2 ? 3 : 1);
  if ((10 - (sum % 10)) % 10 !== Number(c[12])) return null;
  const p = (cfg.prefix || "").length;
  const len = cfg.item_len || 5;
  const plu = c.slice(p, p + len);
  const value = Number(c.slice(p + len, 12));
  if (!value) return null;
  if (cfg.mode === "price") return { plu, price: currency === "KHR" ? value : value / 100 };
  return { plu, weight: value / 1000 };
}
// the product with this scale code (leading zeros don't matter)
export const byPlu = (products, plu) => products.find((x) => x.plu && Number(x.plu) === Number(plu)) || null;
