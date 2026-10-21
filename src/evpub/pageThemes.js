// Event page themes (event page + order page + ticket page): "standard" is free; 6 styles × 10 colours = 60 premium
// (ev_page_theme, 25 coins each, forever). + 6 live (animated) styles × 10 = 60 more → 120. Keep in sync with bizhub-api/src/biz/event/event.themes.js. CSS: pagethemes.css
import { pageVars } from "./themes";

export const PG_STILL = ["aurora", "editorial", "bold", "midnight", "pastel", "cinema"];
export const PG_LIVE = ["live-glow", "live-confetti", "live-stars", "live-waves", "live-flow", "live-stage"];
export const PG_LAYOUTS = [...PG_STILL, ...PG_LIVE];
export const PG_DARK = ["aurora", "midnight", "cinema", "live-glow", "live-stars", "live-stage"];
export const PG_PALETTES = {
  coral: { a: "#ff5a5f", b: "#ffb199", c: "#7a1f22" },
  lagoon: { a: "#0891b2", b: "#67e8f9", c: "#164e63" },
  forest: { a: "#15803d", b: "#bef264", c: "#14532d" },
  amber: { a: "#d97706", b: "#fde68a", c: "#78350f" },
  violet: { a: "#8b5cf6", b: "#ddd6fe", c: "#2e1065" },
  blush: { a: "#ec4899", b: "#fbcfe8", c: "#831843" },
  crimson: { a: "#dc2626", b: "#fca5a5", c: "#450a0a" },
  sky: { a: "#2563eb", b: "#bfdbfe", c: "#172554" },
  olive: { a: "#65a30d", b: "#d9f99d", c: "#365314" },
  graphite: { a: "#334155", b: "#cbd5e1", c: "#0f172a" },
};
export const PG_PALETTE_KEYS = Object.keys(PG_PALETTES);
export const PG_THEMES = { standard: { key: "standard", tier: "free", layout: "standard", palette: "standard" } };
for (const l of PG_LAYOUTS) for (const p of PG_PALETTE_KEYS) PG_THEMES[`${l}-${p}`] = { key: `${l}-${p}`, tier: "premium", layout: l, palette: p, ...PG_PALETTES[p] };
export const PG_THEME_KEYS = Object.keys(PG_THEMES);
export const pageThemeOf = (key) => PG_THEMES[key] || PG_THEMES.standard;

const LAYOUT_NAMES = {
  standard: { en: "Standard", km: "ស្តង់ដារ" },
  aurora: { en: "Aurora", km: "ពន្លឺអូរ៉ូរ៉ា" },
  editorial: { en: "Magazine", km: "ទស្សនាវដ្តី" },
  bold: { en: "Bold block", km: "ប្លុកដិត" },
  midnight: { en: "Midnight", km: "កណ្តាលអធ្រាត្រ" },
  pastel: { en: "Pastel", km: "ពណ៌ស្រាល" },
  cinema: { en: "Big poster", km: "ផ្ទាំងធំ" },
  "live-glow": { en: "Live glow", km: "ពន្លឺរស់" },
  "live-confetti": { en: "Live confetti", km: "ក្រដាសពណ៌រស់" },
  "live-stars": { en: "Live stars", km: "ផ្កាយរស់" },
  "live-waves": { en: "Live waves", km: "រលករស់" },
  "live-flow": { en: "Live colours", km: "ពណ៌ហូររស់" },
  "live-stage": { en: "Live stage lights", km: "ភ្លើងឆាករស់" },
};
const PALETTE_NAMES = {
  coral: { en: "Coral", km: "ផ្កាថ្ម" },
  lagoon: { en: "Lagoon", km: "បឹងខៀវ" },
  forest: { en: "Forest", km: "ព្រៃឈើ" },
  amber: { en: "Amber", km: "ទឹកឃ្មុំ" },
  violet: { en: "Violet", km: "ស្វាយ" },
  blush: { en: "Blush", km: "ផ្កាឈូក" },
  crimson: { en: "Crimson", km: "ក្រហមចាស់" },
  sky: { en: "Sky", km: "មេឃ" },
  olive: { en: "Olive", km: "អូលីវ" },
  graphite: { en: "Graphite", km: "ប្រផេះ" },
};
const L = (lang) => (lang === "km" ? "km" : "en");
export const pageLayoutName = (l, lang) => (LAYOUT_NAMES[l] || LAYOUT_NAMES.standard)[L(lang)];
export function pageThemeName(key, lang) {
  const t = pageThemeOf(key);
  if (t.layout === "standard") return pageLayoutName("standard", lang);
  return `${pageLayoutName(t.layout, lang)} · ${PALETTE_NAMES[t.palette][L(lang)]}`;
}
// the class + CSS variables for the page root (.evp). No page theme → the ticket design's colours, as before
export const isLive = (key) => PG_LIVE.includes(pageThemeOf(key).layout);
export const pageClass = (key) => {
  const t = pageThemeOf(key);
  if (t.layout === "standard") return "";
  return `evp-pg evp-pg-${t.layout}${PG_DARK.includes(t.layout) ? " evp-pg-dark" : ""}${isLive(key) ? " evp-pg-live" : ""}`;
};
const hex = (v) => (/^#[0-9a-fA-F]{6}$/.test(String(v || "")) ? v : "");
// colors: the owner's own colours { a, b, c } (any empty one keeps the design's colour)
export const pageStyle = (key, ticketTheme, colors, ticketColors) => {
  const t = pageThemeOf(key);
  if (t.layout === "standard") {
    const own = hex(colors?.a);
    return own ? { "--e-accent": own, "--e-accent2": hex(colors?.b) || own } : pageVars(ticketTheme, ticketColors);
  }
  const a = hex(colors?.a) || t.a;
  const b = hex(colors?.b) || t.b;
  const c = hex(colors?.c) || t.c;
  return { "--p-a": a, "--p-b": b, "--p-c": c, "--e-accent": a, "--e-accent2": t.palette === "graphite" && !hex(colors?.b) ? "#64748b" : b };
};
export const pageDefaults = (key) => {
  const t = pageThemeOf(key);
  return t.layout === "standard" ? { a: "#f0662b", b: "#ff9a3c", c: "#7c2d12" } : { a: t.a, b: t.b, c: t.c };
};
