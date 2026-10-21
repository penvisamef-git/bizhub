// Mini Mart receipt templates. "classic" is free; each other one is bought once (25 coins, mart_print_theme).
// Same keys as the API (api/src/biz/mart/mart.models.js PRINT_THEMES). Every look is black on white, so it prints on thermal printers.
//   font: sans | serif | mono | round | display (Khmer Moul titles)
//   head: center | left | banner (white on black) | boxed | split (logo left) | big
//   rule: dash | solid | double | dots | thick | stars | wave | none
//   total: plain | box | invert | big | underline | double
//   items: list | table | zebra | compact      foot: plain | box | ticket | stamp
//   frame: none | solid | dashed | double      caps: titles in capitals    orn: a small sign around the shop name
import { customMethodOf } from "../../dashboard/client/mart/text";
export const MART_THEMES = [
  { key: "classic", en: "Classic", km: "បុរាណ", font: "sans", head: "center", rule: "dash", total: "plain", items: "list", foot: "plain" },
  { key: "minimal", en: "Minimal", km: "សាមញ្ញបំផុត", font: "sans", head: "left", rule: "none", total: "plain", items: "compact", foot: "plain", base: 11 },
  { key: "bold", en: "Bold", km: "ដិត", font: "sans", head: "center", rule: "thick", total: "invert", items: "list", foot: "plain", caps: true },
  { key: "mono", en: "Mono", km: "ម៉ូណូ", font: "mono", head: "center", rule: "dash", total: "box", items: "list", foot: "plain" },
  { key: "typewriter", en: "Typewriter", km: "ម៉ាស៊ីនអង្គុលីលេខ", font: "mono", head: "left", rule: "dots", total: "underline", items: "compact", foot: "plain", caps: true },
  { key: "serif", en: "Elegant", km: "ប្រណិត", font: "serif", head: "center", rule: "double", total: "plain", items: "list", foot: "plain" },
  { key: "modern", en: "Modern", km: "ទំនើប", font: "sans", head: "split", rule: "solid", total: "big", items: "list", foot: "plain" },
  { key: "market", en: "Market", km: "ផ្សារ", font: "sans", head: "banner", rule: "dash", total: "box", items: "list", foot: "plain", caps: true },
  { key: "banner", en: "Banner", km: "បដា", font: "sans", head: "banner", rule: "solid", total: "invert", items: "list", foot: "plain" },
  { key: "boxed", en: "Boxed", km: "ប្រអប់", font: "sans", head: "boxed", rule: "solid", total: "box", items: "list", foot: "box" },
  { key: "double", en: "Double line", km: "បន្ទាត់ពីរ", font: "serif", head: "center", rule: "double", total: "double", items: "list", foot: "plain", frame: "double" },
  { key: "dotted", en: "Dotted", km: "ចំណុច", font: "sans", head: "center", rule: "dots", total: "plain", items: "list", foot: "plain" },
  { key: "stars", en: "Stars", km: "ផ្កាយ", font: "sans", head: "center", rule: "stars", total: "box", items: "list", foot: "plain", orn: "★" },
  { key: "wave", en: "Wave", km: "រលក", font: "round", head: "center", rule: "wave", total: "plain", items: "list", foot: "plain" },
  { key: "kiosk", en: "Kiosk", km: "តូប", font: "mono", head: "banner", rule: "solid", total: "big", items: "compact", foot: "plain", caps: true },
  { key: "compact", en: "Compact", km: "តូចល្មម", font: "sans", head: "left", rule: "dash", total: "plain", items: "compact", foot: "plain", base: 10.5 },
  { key: "large", en: "Large print", km: "អក្សរធំ", font: "sans", head: "center", rule: "solid", total: "big", items: "list", foot: "plain", base: 14 },
  { key: "table", en: "Table", km: "តារាង", font: "sans", head: "center", rule: "solid", total: "plain", items: "table", foot: "plain" },
  { key: "zebra", en: "Stripes", km: "ឆ្នូត", font: "sans", head: "left", rule: "none", total: "box", items: "zebra", foot: "plain" },
  { key: "ticket", en: "Ticket", km: "សំបុត្រ", font: "mono", head: "boxed", rule: "dash", total: "big", items: "list", foot: "ticket" },
  { key: "coupon", en: "Coupon", km: "គូប៉ុង", font: "sans", head: "center", rule: "dash", total: "box", items: "list", foot: "box", frame: "dashed" },
  { key: "retro", en: "Retro", km: "បែបចាស់", font: "mono", head: "banner", rule: "double", total: "invert", items: "list", foot: "plain", caps: true },
  { key: "cafe", en: "Café", km: "កាហ្វេ", font: "serif", head: "center", rule: "dots", total: "underline", items: "list", foot: "plain", orn: "◆" },
  { key: "bakery", en: "Bakery", km: "នំប៉័ង", font: "round", head: "center", rule: "wave", total: "box", items: "list", foot: "box", orn: "❖" },
  { key: "fresh", en: "Fresh", km: "ស្រស់", font: "round", head: "split", rule: "dots", total: "big", items: "list", foot: "plain" },
  { key: "night", en: "Night", km: "យប់", font: "sans", head: "banner", rule: "thick", total: "invert", items: "zebra", foot: "plain" },
  { key: "corporate", en: "Corporate", km: "ក្រុមហ៊ុន", font: "sans", head: "left", rule: "solid", total: "double", items: "table", foot: "plain" },
  { key: "left", en: "Simple left", km: "ឆ្វេងសាមញ្ញ", font: "sans", head: "left", rule: "dash", total: "plain", items: "list", foot: "plain" },
  { key: "split", en: "Split header", km: "ក្បាលបំបែក", font: "sans", head: "split", rule: "dash", total: "box", items: "list", foot: "plain" },
  { key: "bigtotal", en: "Big total", km: "សរុបធំ", font: "sans", head: "center", rule: "dash", total: "big", items: "compact", foot: "plain" },
  { key: "underline", en: "Underline", km: "គូសបន្ទាត់", font: "serif", head: "left", rule: "solid", total: "underline", items: "list", foot: "plain" },
  { key: "stamp", en: "Paid stamp", km: "ត្រាបានបង់", font: "mono", head: "center", rule: "dash", total: "plain", items: "list", foot: "stamp" },
  { key: "festive", en: "Festive", km: "បុណ្យ", font: "display", head: "center", rule: "stars", total: "invert", items: "list", foot: "box", orn: "✦" },
  { key: "khmer", en: "Khmer classic", km: "ខ្មែរបុរាណ", font: "display", head: "big", rule: "double", total: "box", items: "list", foot: "plain", orn: "❀" },
  { key: "angkor", en: "Angkor", km: "អង្គរ", font: "display", head: "banner", rule: "thick", total: "invert", items: "table", foot: "box", orn: "◆", frame: "solid" },
  { key: "lotus", en: "Lotus", km: "ផ្កាឈូក", font: "serif", head: "center", rule: "wave", total: "box", items: "list", foot: "plain", orn: "❀" },
];
export const themeOf = (key) => MART_THEMES.find((t) => t.key === key) || MART_THEMES[0];
export const martThemeName = (key, lang) => (lang === "km" ? themeOf(key).km : themeOf(key).en);

const FONTS = {
  sans: "'Kantumruy Pro', system-ui, sans-serif",
  serif: "'Noto Serif Khmer', Georgia, serif",
  mono: "'Courier New', 'Kantumruy Pro', monospace",
  round: "'Nunito', 'Kantumruy Pro', sans-serif",
  display: "'Kantumruy Pro', system-ui, sans-serif",
};
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700&family=Noto+Serif+Khmer:wght@400;700&family=Moul&family=Nunito:wght@400;700;800&display=swap";

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const qtyOf = (q) => (Number.isInteger(Number(q)) ? Number(q) : Number(q).toFixed(3).replace(/0+$/, ""));
const usd = (v) => `$${(Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const khr = (v) => `${Math.round(Number(v) || 0).toLocaleString("en-US")}៛`;
const fmtWhen = (d, lang) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(d)) : "");

function cssOf(t, size) {
  const base = t.base || 12;
  const w = size === "58" ? 48 : 72;
  const rule = {
    dash: "border-top:1px dashed #000",
    solid: "border-top:1px solid #000",
    double: "border-top:3px double #000",
    dots: "border-top:2px dotted #000",
    thick: "border-top:3px solid #000",
    none: "border-top:0;margin:4px 0",
    stars: "border:0",
    wave: "border:0",
  }[t.rule];
  return `
@page{size:${size === "58" ? "58mm" : "80mm"} auto;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:#fff}
body{padding:3mm;color:#000;font:${base}px/1.38 ${FONTS[t.font]};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.r{width:${w}mm;margin:0 auto;${t.frame === "solid" ? "border:2px solid #000;padding:2.5mm" : t.frame === "dashed" ? "border:2px dashed #000;padding:2.5mm;border-radius:3mm" : t.frame === "double" ? "border:4px double #000;padding:2.5mm" : ""}}
.cap{${t.caps ? "text-transform:uppercase;letter-spacing:.06em" : ""}}
.rule{${rule};margin:5px 0;height:0}
.rule.txt{height:auto;text-align:center;overflow:hidden;white-space:nowrap;font-size:${base - 1}px;letter-spacing:.15em;line-height:1}
.h{display:grid;gap:1px}
.h img{max-height:42px;max-width:55%;object-fit:contain}
.h .n{font-weight:700;font-size:${base + 4}px;${t.font === "display" ? "font-family:'Moul',serif;font-weight:400" : ""}}
.h .s{font-size:${base - 1}px}
.h-center,.h-big,.h-boxed,.h-banner{justify-items:center;text-align:center}
.h-left{justify-items:start;text-align:left}
.h-big .n{font-size:${base + 9}px}
.h-boxed{border:2px solid #000;padding:5px;border-radius:4px}
.h-banner{background:#000;color:#fff;padding:6px 4px}
.h-banner img{filter:invert(1) grayscale(1)}
.h-split{grid-template-columns:auto 1fr;align-items:center;gap:8px;text-align:right}
.h-split img{max-height:38px;max-width:22mm;grid-row:span 4}
.h-split .n,.h-split .s{grid-column:2}
.orn{font-family:system-ui,sans-serif}
.meta{display:flex;justify-content:space-between;gap:6px;font-size:${base - 1}px}
table{width:100%;border-collapse:collapse}
td,th{padding:2px 0;vertical-align:top;text-align:left}
.n2{text-align:right;white-space:nowrap;padding-left:6px}
.q{text-align:center;white-space:nowrap;padding:2px 4px}
th{font-size:${base - 1}px;border-bottom:1px solid #000}
.sub{display:block;font-size:${base - 1.5}px;color:#222}
.zebra tr:nth-child(odd) td{background:#e9e9e9}
.zebra td{padding:3px 3px}
.sum td{padding:1.5px 0}
.tot td{font-weight:700;font-size:${base + 3}px;padding:4px 0}
.tot-box td{border:2px solid #000;padding:4px 6px}
.tot-box td:first-child{border-right:0}.tot-box td:last-child{border-left:0}
.tot-invert td{background:#000;color:#fff;padding:5px 6px}
.tot-big td{font-size:${base + 10}px;padding:6px 0}
.tot-underline td{border-bottom:2px solid #000}
.tot-double td{border-top:1px solid #000;border-bottom:4px double #000}
.khr td{font-size:${base - 0.5}px;padding-top:0}
.chg td{font-weight:700}
.void{border:3px solid #000;text-align:center;font-weight:800;font-size:${base + 4}px;letter-spacing:.2em;margin:6px 0;padding:2px}
.f{text-align:center;font-size:${base - 1}px;display:grid;gap:2px}
.f-box{border:1px solid #000;padding:5px;border-radius:4px}
.ticket{text-align:center;margin-top:4px}
.ticket b{display:block;font-size:${base + 8}px;letter-spacing:.12em}
.stamp{margin:8px auto 2px;width:max-content;border:3px solid #000;border-radius:50%;padding:10px 14px;font-weight:800;letter-spacing:.2em;transform:rotate(-8deg)}
`;
}

// one receipt as a full HTML page (printed in a hidden frame; shown on screen in an iframe)
export function receiptHtml({ sale, shop, m, lang, size = "80", theme = "classic" }) {
  const t = themeOf(theme);
  const cur = sale.currency || "USD";
  const money = (v) => (cur === "KHR" ? khr(v) : usd(v));
  const unitOf = (l) => (lang === "km" ? l.unit_km || l.unit_en : l.unit_en || l.unit_km) || "";
  const rule = t.rule === "stars" ? `<div class="rule txt">${"★ ".repeat(30)}</div>` : t.rule === "wave" ? `<div class="rule txt">${"〜".repeat(30)}</div>` : '<div class="rule"></div>';
  const orn = t.orn ? `<span class="orn">${t.orn}</span> ` : "";
  const ornR = t.orn ? ` <span class="orn">${t.orn}</span>` : "";
  const head = `<div class="h h-${t.head}">${shop.logo_url ? `<img src="${esc(shop.logo_url)}" alt="">` : ""}<div class="n cap">${orn}${esc(shop.name)}${ornR}</div>${shop.address ? `<div class="s">${esc(shop.address)}</div>` : ""}${shop.phone ? `<div class="s">${esc(shop.phone)}</div>` : ""}</div>`;
  const lineTotal = (l) => money(l.total ?? l.price * l.qty);
  let items;
  if (t.items === "table") {
    items = `<table><thead><tr><th class="cap">${esc(m.item)}</th><th class="q cap">${esc(m.qty)}</th><th class="n2 cap">${esc(m.total)}</th></tr></thead><tbody>${sale.items.map((l) => `<tr><td>${esc(l.name)}<span class="sub">${money(l.price)}</span></td><td class="q">${qtyOf(l.qty)}${unitOf(l) ? ` ${esc(unitOf(l))}` : ""}</td><td class="n2">${lineTotal(l)}</td></tr>`).join("")}</tbody></table>`;
  } else if (t.items === "compact") {
    items = `<table><tbody>${sale.items.map((l) => `<tr><td>${qtyOf(l.qty)}× ${esc(l.name)}</td><td class="n2">${lineTotal(l)}</td></tr>`).join("")}</tbody></table>`;
  } else {
    items = `<table class="${t.items === "zebra" ? "zebra" : ""}"><tbody>${sale.items.map((l) => `<tr><td>${esc(l.name)}<span class="sub">${qtyOf(l.qty)}${unitOf(l) ? ` ${esc(unitOf(l))}` : ""} × ${money(l.price)}</span></td><td class="n2">${lineTotal(l)}</td></tr>`).join("")}</tbody></table>`;
  }
  const row = (a, b, cls = "") => `<tr class="${cls}"><td class="cap">${a}</td><td class="n2">${b}</td></tr>`;
  const paid = sale.method === "cash" ? [sale.paid_usd > 0 && usd(sale.paid_usd), sale.paid_khr > 0 && khr(sale.paid_khr)].filter(Boolean).join(" + ") || money(sale.total) : sale.method === "debt" ? esc(sale.debtor_name || "") : money(sale.total);
  const sums = `<table class="sum"><tbody>
${sale.discount > 0 || sale.promo_discount > 0 || sale.points_value > 0 ? row(esc(m.subtotal), money(sale.subtotal)) : ""}
${(sale.promos || []).map((p) => row(`🏷 ${esc(p.name)}`, `−${money(p.amount)}`)).join("")}
${sale.discount > 0 ? row(esc(m.discount), `−${money(sale.discount)}`) : ""}
${sale.points_value > 0 ? row(`🎁 ${esc(lang === "km" ? "ពិន្ទុ" : "Points")} (${sale.points_used})`, `−${money(sale.points_value)}`) : ""}
${row(esc(m.total), money(sale.total), `tot tot-${t.total}`)}
${cur === "USD" ? row("", khr(Math.round((sale.total * (sale.khr_rate || 4100)) / 100) * 100), "khr") : ""}
${row(esc(m.methods?.[sale.method] || sale.method_name || customMethodOf(sale.method)?.name || sale.method), paid)}
${sale.method === "cash" && sale.change > 0 ? row(esc(m.change), `${money(sale.change)}${cur === "USD" ? ` = ${khr(sale.change_khr)}` : ""}`, "chg") : ""}
</tbody></table>`;
  const member = sale.member_phone
    ? `<div>${esc(lang === "km" ? "សមាជិក" : "Member")}: ${esc(sale.member_name || "")} ${esc(sale.member_phone.replace(/\d(?=\d{3})/g, "•"))}${sale.points_earned > 0 ? ` · +${sale.points_earned} ${esc(lang === "km" ? "ពិន្ទុ" : "points")}` : ""}</div>`
    : "";
  const foot = `<div class="f ${t.foot === "box" ? "f-box" : ""}">${member}${sale.by ? `<div>${esc(m.cashier)}: ${esc(sale.by)}</div>` : ""}${shop.receipt_note ? `<div>${esc(shop.receipt_note)}</div>` : ""}</div>${t.foot === "ticket" ? `<div class="ticket"><b>${esc(sale.no || "")}</b></div>` : ""}${t.foot === "stamp" && sale.status !== "void" ? `<div class="stamp">${esc(m.paidStamp || "PAID")}</div>` : ""}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(sale.no || "")}</title><link rel="stylesheet" href="${FONT_LINK}"><style>${cssOf(t, size)}</style></head><body><div class="r">
${head}${rule}
<div class="meta"><span>${esc(sale.no || "—")}</span><span>${esc(fmtWhen(sale.at, lang))}</span></div>${rule}
${items}${rule}${sums}
${sale.status === "void" ? `<div class="void">${esc(m.voided)}</div>` : ""}${rule}${foot}
</div></body></html>`;
}

// a made-up sale to show what a template looks like
export const SAMPLE_SALE = {
  no: "S-000128",
  at: "2026-10-12T09:41:00.000Z",
  currency: "USD",
  khr_rate: 4100,
  items: [
    { name: "Coca-Cola 330ml", qty: 2, price: 0.6, total: 1.2, unit_en: "can", unit_km: "កំប៉ុង" },
    { name: "Bread", qty: 1, price: 1.25, total: 1.25, unit_en: "piece", unit_km: "ដុំ" },
    { name: "Lay's Classic", qty: 3, price: 0.75, total: 2.25, unit_en: "pack", unit_km: "កញ្ចប់" },
  ],
  subtotal: 4.7,
  discount: 0,
  total: 4.7,
  method: "cash",
  paid_usd: 5,
  paid_khr: 0,
  change: 0.3,
  change_khr: 1200,
  status: "paid",
  by: "Sokha",
};
