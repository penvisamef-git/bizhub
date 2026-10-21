// Mini Mart POS looks: 24 — "classic" is free, each other one is bought once (mart_pos_theme, 15 coins, forever).
// Same keys as the API (api/src/biz/mart/mart.models.js POS_THEMES).
// Each look: accent colours (a = light mode, ad = dark mode), page tint, the top bar (light | accent | dark),
// the product cards (tile | photo | list | round | compact | bold), corner radius and font.
const T = (en, km, o) => ({ en, km, ...o });
export const POS_LOOKS = {
  classic: T("Classic", "បុរាណ", { a: "#0f766e", a2: "#14b8a6", ad: "#2dd4bf", bg: "#f1f4f9", head: "light", card: "tile", r: 14, font: "Plus Jakarta Sans" }),
  ocean: T("Ocean", "សមុទ្រ", { a: "#0369a1", a2: "#0ea5e9", ad: "#38bdf8", bg: "#eef6fb", head: "accent", card: "tile", r: 16, font: "Lexend" }),
  sunset: T("Sunset", "ថ្ងៃលិច", { a: "#ea580c", a2: "#f43f5e", ad: "#fb923c", bg: "#fff4ec", head: "accent", card: "photo", r: 18, font: "Poppins" }),
  forest: T("Forest", "ព្រៃឈើ", { a: "#166534", a2: "#65a30d", ad: "#4ade80", bg: "#f1f5ef", head: "dark", card: "list", r: 10, font: "DM Sans" }),
  berry: T("Berry", "ផ្លែបឺរី", { a: "#be185d", a2: "#7c3aed", ad: "#f472b6", bg: "#fdf2f8", head: "accent", card: "round", r: 20, font: "Quicksand" }),
  midnight: T("Midnight", "ពាក់កណ្តាលអធ្រាត្រ", { a: "#4f46e5", a2: "#22d3ee", ad: "#818cf8", bg: "#eef0fb", head: "dark", card: "tile", r: 14, font: "Sora" }),
  royal: T("Royal", "រាជវង្ស", { a: "#4338ca", a2: "#a855f7", ad: "#a5b4fc", bg: "#f3f2ff", head: "accent", card: "compact", r: 12, font: "Outfit" }),
  coral: T("Coral", "ផ្កាថ្ម", { a: "#e11d48", a2: "#fb923c", ad: "#fb7185", bg: "#fff5f3", head: "light", card: "round", r: 22, font: "Outfit" }),
  mint: T("Mint", "ជីអង្កាម", { a: "#0d9488", a2: "#34d399", ad: "#5eead4", bg: "#effcf8", head: "light", card: "photo", r: 16, font: "Manrope" }),
  amber: T("Amber", "អាំប័រ", { a: "#d97706", a2: "#dc2626", ad: "#fbbf24", bg: "#fffbeb", head: "accent", card: "bold", r: 12, font: "Rubik" }),
  slate: T("Slate", "ថ្មខៀវ", { a: "#334155", a2: "#0ea5e9", ad: "#94a3b8", bg: "#f1f5f9", head: "dark", card: "compact", r: 8, font: "IBM Plex Sans" }),
  rose: T("Rose", "កុលាប", { a: "#e11d48", a2: "#f472b6", ad: "#fb7185", bg: "#fff1f2", head: "light", card: "tile", r: 18, font: "Quicksand" }),
  lime: T("Lime", "ក្រូចឆ្មារ", { a: "#4d7c0f", a2: "#84cc16", ad: "#a3e635", bg: "#f7fee7", head: "accent", card: "list", r: 12, font: "Nunito" }),
  sky: T("Sky", "មេឃ", { a: "#2563eb", a2: "#38bdf8", ad: "#60a5fa", bg: "#f0f7ff", head: "light", card: "photo", r: 20, font: "Nunito" }),
  cocoa: T("Cocoa", "កាកាវ", { a: "#6f4e37", a2: "#c08552", ad: "#d6a77a", bg: "#f6f0ea", head: "dark", card: "list", r: 10, font: "DM Sans" }),
  ink: T("Ink", "ទឹកខ្មៅ", { a: "#18181b", a2: "#52525b", ad: "#e4e4e7", bg: "#f4f4f5", head: "dark", card: "bold", r: 4, font: "Inter" }),
  neon: T("Neon", "នីអុង", { a: "#65a30d", a2: "#c026d3", ad: "#a3e635", bg: "#f5f5f4", head: "dark", card: "tile", r: 10, font: "Space Grotesk" }),
  lotus: T("Lotus", "ផ្កាឈូក", { a: "#db2777", a2: "#16a34a", ad: "#f472b6", bg: "#fdf4f8", head: "light", card: "round", r: 18, font: "Kantumruy Pro" }),
  angkor: T("Angkor", "អង្គរ", { a: "#b45309", a2: "#7c2d12", ad: "#f59e0b", bg: "#fbf5ea", head: "accent", card: "list", r: 6, font: "Kantumruy Pro" }),
  candy: T("Candy", "ស្ករគ្រាប់", { a: "#db2777", a2: "#06b6d4", ad: "#f9a8d4", bg: "#fff0f6", head: "accent", card: "round", r: 24, font: "Baloo 2" }),
  sand: T("Sand", "ខ្សាច់", { a: "#a16207", a2: "#d97706", ad: "#facc15", bg: "#faf6ef", head: "light", card: "compact", r: 8, font: "Karla" }),
  ruby: T("Ruby", "ត្បូងទទឹម", { a: "#b91c1c", a2: "#ea580c", ad: "#f87171", bg: "#fff1f1", head: "dark", card: "bold", r: 12, font: "Work Sans" }),
  jade: T("Jade", "ត្បូងខៀវ", { a: "#059669", a2: "#0d9488", ad: "#34d399", bg: "#f0fdf4", head: "accent", card: "photo", r: 14, font: "Nunito Sans" }),
  paper: T("Paper", "ក្រដាស", { a: "#1f2937", a2: "#6b7280", ad: "#d1d5db", bg: "#f7f4ec", head: "light", card: "list", r: 2, font: "Courier Prime" }),
};
export const POS_LOOK_KEYS = Object.keys(POS_LOOKS);
export const posLookName = (k, lang) => POS_LOOKS[k]?.[lang === "km" ? "km" : "en"] || k;
export const posLookOf = (k) => POS_LOOKS[k] || POS_LOOKS.classic;
export const posLookClass = (k) => `pt-head-${posLookOf(k).head} pt-card-${posLookOf(k).card}`;

export function loadPosFont(k) {
  const f = posLookOf(k).font;
  if (typeof document === "undefined" || ["Plus Jakarta Sans", "Kantumruy Pro"].includes(f)) return;
  const id = `pt-font-${f.replace(/ /g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${f.replace(/ /g, "+")}:wght@400;500;600;700${f === "Courier Prime" ? "" : ";800"}&display=swap`;
  document.head.appendChild(link);
}
// the css variables of a look (dark = the POS is in dark mode; color = the owner's own colour, "" = the look's)
export function posVars(k, dark, color = "") {
  const d0 = posLookOf(k);
  const d = color ? { ...d0, a: color, a2: `color-mix(in srgb, ${color} 62%, #ffffff)`, ad: `color-mix(in srgb, ${color} 70%, #ffffff)`, bg: `color-mix(in srgb, ${color} 6%, #f4f6f9)` } : d0;
  const a = dark ? d.ad : d.a;
  return {
    "--mp-a": a,
    "--mp-adeep": a,
    "--mp-a2": d.a2,
    "--mp-r": `${d.r}px`,
    "--brand": a,
    "--brand-hover": `color-mix(in srgb, ${a} 85%, ${dark ? "#fff" : "#000"})`,
    "--accent": a,
    "--onbrand": dark ? "#0b0b0b" : "#ffffff",
    "--active": `color-mix(in srgb, ${a} 14%, transparent)`,
    "--app-bg": dark ? `color-mix(in srgb, ${d.ad} 6%, #0e0c0a)` : d.bg,
    "--font": `'${d.font}', 'Kantumruy Pro', system-ui, -apple-system, 'Segoe UI', sans-serif`,
  };
}
