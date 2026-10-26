// Telegram Store designs (v2.0): 8 layouts × 15 colour sets = 120. Same keys as the API (tgstore.themes.js).
// A design = how the page is laid out (layout) + its colours and letters (palette). The shop colour, when set, replaces the palette's accent.
export const LAYOUTS = [
  { key: "grid", en: "Grid", km: "ក្រឡា" },
  { key: "list", en: "List", km: "បញ្ជី" },
  { key: "big", en: "Big photos", km: "រូបធំ" },
  { key: "compact", en: "Compact", km: "តូចៗ" },
  { key: "menu", en: "Menu", km: "ម៉ឺនុយ" },
  { key: "magazine", en: "Magazine", km: "ទស្សនាវដ្តី" },
  { key: "bubble", en: "Bubble", km: "មូល" },
  { key: "shelf", en: "Shelf", km: "ធ្នើ" },
];
const F = {
  jakarta: "'Plus Jakarta Sans', 'Kantumruy Pro', system-ui, sans-serif",
  fraunces: "'Fraunces', 'Kantumruy Pro', Georgia, serif",
  nunito: "'Nunito', 'Kantumruy Pro', system-ui, sans-serif",
  grotesk: "'Space Grotesk', 'Kantumruy Pro', system-ui, sans-serif",
  playfair: "'Playfair Display', 'Kantumruy Pro', Georgia, serif",
  dmsans: "'DM Sans', 'Kantumruy Pro', system-ui, sans-serif",
  poppins: "'Poppins', 'Kantumruy Pro', system-ui, sans-serif",
};
const LOAD = { fraunces: "Fraunces:wght@500;700;800", nunito: "Nunito:wght@500;700;800", grotesk: "Space+Grotesk:wght@500;700", playfair: "Playfair+Display:wght@600;700;800", dmsans: "DM+Sans:wght@500;700", poppins: "Poppins:wght@500;600;700" };
export const PALETTES = [
  { key: "cream", en: "Cream", km: "ក្រែម", page: "#F4F1EC", bg: "#FFFFFF", ink: "#1F1A16", muted: "#7A7068", line: "#E8E2DA", accent: "#C4470F", font: "jakarta" },
  { key: "snow", en: "Snow", km: "ព្រិល", page: "#F5F6F8", bg: "#FFFFFF", ink: "#111827", muted: "#6B7280", line: "#E5E7EB", accent: "#2563EB", font: "dmsans" },
  { key: "paper", en: "Paper", km: "ក្រដាស", page: "#FBF7EE", bg: "#FFFDF7", ink: "#2B2620", muted: "#857A6A", line: "#EAE1CF", accent: "#8B5E34", font: "fraunces" },
  { key: "mint", en: "Mint", km: "ជីអង្កាម", page: "#EAF7F1", bg: "#FFFFFF", ink: "#0F2E24", muted: "#5E7D71", line: "#D3EBE0", accent: "#10A37F", font: "nunito" },
  { key: "sky", en: "Sky", km: "មេឃ", page: "#E9F4FD", bg: "#FFFFFF", ink: "#0B2540", muted: "#5B7590", line: "#D5E7F6", accent: "#229ED9", font: "poppins" },
  { key: "lilac", en: "Lilac", km: "ស្វាយ", page: "#F3EFFB", bg: "#FFFFFF", ink: "#251A3D", muted: "#76699A", line: "#E4DCF5", accent: "#7C3AED", font: "poppins" },
  { key: "peach", en: "Peach", km: "ប៉ែស", page: "#FFF1EA", bg: "#FFFFFF", ink: "#3A1F14", muted: "#9A6E5E", line: "#F7DDD0", accent: "#F97316", font: "nunito" },
  { key: "sand", en: "Sand", km: "ខ្សាច់", page: "#F5EEDF", bg: "#FFFBF2", ink: "#3B3222", muted: "#8C7E62", line: "#E6DAC1", accent: "#B7791F", font: "playfair" },
  { key: "forest", en: "Forest", km: "ព្រៃ", page: "#E8F0E5", bg: "#FAFDF8", ink: "#1B2E1A", muted: "#5F7A5C", line: "#D2E1CD", accent: "#2F6B2F", font: "fraunces" },
  { key: "ocean", en: "Ocean", km: "សមុទ្រ", page: "#E5EFF4", bg: "#FFFFFF", ink: "#0D2A38", muted: "#557687", line: "#CFE1EA", accent: "#0E7490", font: "dmsans" },
  { key: "night", en: "Night", km: "យប់", page: "#0F1115", bg: "#1A1D24", ink: "#F3F4F6", muted: "#9CA3AF", line: "#2A2E37", accent: "#F59E0B", font: "grotesk", dark: true },
  { key: "coffee", en: "Coffee", km: "កាហ្វេ", page: "#2A1E17", bg: "#3A2A20", ink: "#F5E9DC", muted: "#C2A992", line: "#4D392C", accent: "#E0A96D", font: "playfair", dark: true },
  { key: "rose", en: "Rose", km: "ផ្កាកុលាប", page: "#FDEFF3", bg: "#FFFFFF", ink: "#3B1220", muted: "#9A6676", line: "#F5D7E0", accent: "#E11D48", font: "fraunces" },
  { key: "lime", en: "Lime", km: "ក្រូចឆ្មារ", page: "#F3F9E4", bg: "#FFFFFF", ink: "#1F2A0E", muted: "#6B7A4E", line: "#E1EDC7", accent: "#65A30D", font: "grotesk" },
  { key: "charcoal", en: "Charcoal", km: "ធ្យូង", page: "#1C1C1E", bg: "#2C2C2E", ink: "#FFFFFF", muted: "#A1A1A6", line: "#3A3A3C", accent: "#34C759", font: "jakarta", dark: true },
];
export const FREE = ["grid-cream", "list-snow", "menu-paper"];
export const DEFAULT = "grid-cream";
export const THEMES = LAYOUTS.flatMap((l) => PALETTES.map((p) => ({ key: `${l.key}-${p.key}`, layout: l, palette: p })));
export const themeOf = (key) => THEMES.find((t) => t.key === key) || THEMES.find((t) => t.key === DEFAULT);
export const themeName = (key, lang) => {
  const t = themeOf(key);
  return `${t.layout[lang] || t.layout.en} · ${t.palette[lang] || t.palette.en}`;
};
// the CSS variables of a design (+ the shop colour when the owner set one)
export function themeVars(key, color) {
  const p = themeOf(key).palette;
  return { "--ts-page": p.page, "--ts-bg": p.bg, "--ts-ink": p.ink, "--ts-muted": p.muted, "--ts-line": p.line, "--ts-accent": color || p.accent, "--ts-font": F[p.font] };
}
// the font of a design, loaded once from Google Fonts
const loaded = new Set();
export function loadThemeFont(key) {
  const f = themeOf(key).palette.font;
  if (!LOAD[f] || loaded.has(f) || typeof document === "undefined") return;
  loaded.add(f);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${LOAD[f]}&display=swap`;
  document.head.appendChild(link);
}
