// Event ticket designs: "classic" is free; 12 styles × 10 colours = 120 premium designs (ev_theme, 15 coins each, forever).
// Keep EV_LAYOUTS / EV_PALETTE_KEYS in sync with bizhub-api/src/biz/event/event.themes.js. The CSS lives in themes.css.
export const EV_LAYOUTS = ["gradient", "stub", "pass", "neon", "retro", "vip", "glass", "festival", "minimal", "badge", "khmer", "pop"];
export const EV_PALETTES = {
  ruby: { a: "#e11d48", b: "#fb7185", c: "#881337" },
  ocean: { a: "#0284c7", b: "#38bdf8", c: "#0c4a6e" },
  jungle: { a: "#16a34a", b: "#86efac", c: "#14532d" },
  sunset: { a: "#ea580c", b: "#fbbf24", c: "#7c2d12" },
  royal: { a: "#7c3aed", b: "#c4b5fd", c: "#3b0764" },
  rose: { a: "#db2777", b: "#f9a8d4", c: "#831843" },
  gold: { a: "#b7791f", b: "#f6d365", c: "#4a3300" },
  teal: { a: "#0d9488", b: "#5eead4", c: "#134e4a" },
  indigo: { a: "#4f46e5", b: "#a5b4fc", c: "#1e1b4b" },
  mono: { a: "#27272a", b: "#a1a1aa", c: "#09090b" },
};
export const EV_PALETTE_KEYS = Object.keys(EV_PALETTES);
const CLASSIC = { a: "#f0662b", b: "#ff9a3c", c: "#b03c8f" };

export const EV_THEMES = { classic: { key: "classic", tier: "free", layout: "classic", palette: "classic", ...CLASSIC } };
for (const l of EV_LAYOUTS) for (const p of EV_PALETTE_KEYS) EV_THEMES[`${l}-${p}`] = { key: `${l}-${p}`, tier: "premium", layout: l, palette: p, ...EV_PALETTES[p] };
export const EV_THEME_KEYS = Object.keys(EV_THEMES);
export const themeOf = (key) => EV_THEMES[key] || EV_THEMES.classic;

const LAYOUT_NAMES = {
  classic: { en: "Classic", km: "បុរាណ" },
  gradient: { en: "Gradient", km: "ពណ៌លាយ" },
  stub: { en: "Tear-off", km: "ហែកបាន" },
  pass: { en: "Boarding pass", km: "សំបុត្រជិះ" },
  neon: { en: "Neon night", km: "នីអុង" },
  retro: { en: "Cinema", km: "រោងកុន" },
  vip: { en: "VIP foil", km: "VIP ភ្លឺ" },
  glass: { en: "Glass", km: "កញ្ចក់" },
  festival: { en: "Festival", km: "មហោស្រព" },
  minimal: { en: "Minimal", km: "សាមញ្ញ" },
  badge: { en: "Name badge", km: "កាតឈ្មោះ" },
  khmer: { en: "Khmer art", km: "ក្បាច់ខ្មែរ" },
  pop: { en: "Pop art", km: "ប៉ុបអាត" },
};
const PALETTE_NAMES = {
  ruby: { en: "Ruby", km: "ត្បូងទទឹម" },
  ocean: { en: "Ocean", km: "សមុទ្រ" },
  jungle: { en: "Jungle", km: "ព្រៃ" },
  sunset: { en: "Sunset", km: "ថ្ងៃលិច" },
  royal: { en: "Royal", km: "រាជវង្ស" },
  rose: { en: "Rose", km: "ផ្កាកុលាប" },
  gold: { en: "Gold", km: "មាស" },
  teal: { en: "Teal", km: "ខៀវបៃតង" },
  indigo: { en: "Indigo", km: "ខៀវចាស់" },
  mono: { en: "Mono", km: "ខ្មៅស" },
};
export const layoutName = (l, lang) => (LAYOUT_NAMES[l] || LAYOUT_NAMES.classic)[lang === "km" ? "km" : "en"];
export function themeName(key, lang) {
  const t = themeOf(key);
  if (t.layout === "classic") return layoutName("classic", lang);
  return `${layoutName(t.layout, lang)} · ${PALETTE_NAMES[t.palette][lang === "km" ? "km" : "en"]}`;
}
// CSS variables for one ticket (--t-a main · --t-b light · --t-c deep)
const hex = (v) => (/^#[0-9a-fA-F]{6}$/.test(String(v || "")) ? v : "");
// colors: the owner's own colours { a, b, c } (empty = the design's)
export const themeVars = (key, colors) => {
  const t = themeOf(key);
  return { "--t-a": hex(colors?.a) || t.a, "--t-b": hex(colors?.b) || t.b, "--t-c": hex(colors?.c) || t.c };
};
export const themeDefaults = (key) => {
  const t = themeOf(key);
  return { a: t.a, b: t.b, c: t.c };
};
// the event / order pages take the design's colours for their buttons and highlights
export const pageVars = (key, colors) => {
  const t = themeOf(key);
  const own = hex(colors?.a);
  if (t.layout === "classic" && !own) return undefined;
  return { "--e-accent": own || t.a, "--e-accent2": hex(colors?.b) || (t.palette === "mono" ? "#52525b" : t.b) };
};
