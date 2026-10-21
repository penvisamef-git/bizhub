// Certificate designs: 3 free (classic, modern, royal) + 100 to buy once (10 styles × 10 colours, ev_cert_theme, 35 coins).
// Keep CERT_LAYOUTS / CERT_PALETTES in sync with bizhub-api/src/biz/event/event.themes.js. Look: cert.css (.evc-p .evc-L-*)
export const CERT_FREE = ["classic", "modern", "royal"];
export const CERT_LAYOUTS = [
  { key: "frame", en: "Frame", km: "ស៊ុម" },
  { key: "band", en: "Band", km: "ឆ្នូត" },
  { key: "ornate", en: "Ornate", km: "លម្អ" },
  { key: "ribbon", en: "Ribbon", km: "ខ្សែបូ" },
  { key: "wave", en: "Wave", km: "រលក" },
  { key: "geo", en: "Geometric", km: "ធរណីមាត្រ" },
  { key: "minimal", en: "Minimal", km: "សាមញ្ញ" },
  { key: "kbach", en: "Kbach", km: "ក្បាច់" },
  { key: "medal", en: "Medal", km: "មេដាយ" },
  { key: "night", en: "Night gold", km: "រាត្រីមាស" },
];
// c1 = main colour, c2 = accent (gold…), bg = paper
export const CERT_PALETTES = [
  { key: "navy", en: "Navy", km: "ខៀវចាស់", c1: "#1e3a8a", c2: "#c9a227", bg: "#fffdf7" },
  { key: "emerald", en: "Emerald", km: "បៃតងត្បូង", c1: "#065f46", c2: "#d4af37", bg: "#f7fdf9" },
  { key: "crimson", en: "Crimson", km: "ក្រហមចាស់", c1: "#9f1239", c2: "#d4a017", bg: "#fffaf5" },
  { key: "violet", en: "Violet", km: "ស្វាយ", c1: "#5b21b6", c2: "#e0b84f", bg: "#fcfaff" },
  { key: "teal", en: "Teal", km: "បៃតងខៀវ", c1: "#0f766e", c2: "#f59e0b", bg: "#f6fefd" },
  { key: "sunset", en: "Sunset", km: "ថ្ងៃលិច", c1: "#c2410c", c2: "#f2b33d", bg: "#fffaf3" },
  { key: "rose", en: "Rose", km: "ផ្កាឈូក", c1: "#be185d", c2: "#d9a38b", bg: "#fff7fa" },
  { key: "slate", en: "Slate", km: "ប្រផេះ", c1: "#334155", c2: "#94a3b8", bg: "#fafafa" },
  { key: "olive", en: "Olive", km: "អូលីវ", c1: "#4d5a1e", c2: "#b08d3c", bg: "#fbfaf2" },
  { key: "sky", en: "Sky", km: "មេឃ", c1: "#0369a1", c2: "#38bdf8", bg: "#f5fbff" },
];
const FREE_NAMES = { classic: { en: "Classic", km: "បុរាណ" }, modern: { en: "Modern", km: "ទំនើប" }, royal: { en: "Royal", km: "រាជ" } };
export const CERT_ALL = [...CERT_FREE, ...CERT_LAYOUTS.flatMap((l) => CERT_PALETTES.map((p) => `${l.key}-${p.key}`))];
export const certParts = (key) => {
  const [l, p] = String(key || "").split("-");
  const layout = CERT_LAYOUTS.find((x) => x.key === l);
  const pal = CERT_PALETTES.find((x) => x.key === p);
  return layout && pal ? { layout, pal } : null;
};
export const isFreeCert = (key) => CERT_FREE.includes(key);
export const certName = (key, lang = "en") => {
  if (FREE_NAMES[key]) return FREE_NAMES[key][lang === "km" ? "km" : "en"];
  const p = certParts(key);
  return p ? `${p.layout[lang === "km" ? "km" : "en"]} · ${p.pal[lang === "km" ? "km" : "en"]}` : key;
};
// class + CSS variables for one design
export const certLook = (key) => {
  if (FREE_NAMES[key]) return { className: `evc-${key}`, style: {} };
  const p = certParts(key);
  if (!p) return { className: "evc-classic", style: {} };
  return { className: `evc-p evc-L-${p.layout.key}`, style: { "--c1": p.pal.c1, "--c2": p.pal.c2, "--bg": p.pal.bg } };
};
