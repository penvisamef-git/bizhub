// Public page themes (note_theme · 3 coins each, forever, per business). The list is shared with the API: noteThemes.json.
// A note / group stores theme = { key, color } ("" color = the theme's own accent). CSS: .np-th-<key> in themes.css.
import LIST from "./noteThemes.json";
import "./themes.css";

export const NOTE_THEMES = LIST.themes;
export const FREE_THEMES = LIST.free || ["default"];
export const THEME_KEYS = NOTE_THEMES.map((t) => t.key);
export const themeOf = (key) => NOTE_THEMES.find((t) => t.key === key) || NOTE_THEMES[0];
export const themeName = (key, lang) => {
  const t = themeOf(key);
  return lang === "km" ? t.km : t.en;
};
export const isFreeTheme = (key) => FREE_THEMES.includes(key || "default");
// 12 accent swatches for the colour panel
export const ACCENTS = ["#e0581a", "#e11d48", "#db2777", "#9333ea", "#4f46e5", "#2563eb", "#0891b2", "#0d9488", "#16a34a", "#ca8a04", "#a0522d", "#334155"];

export function shade(hex, percent) {
  const n = parseInt(String(hex || "#e0581a").replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (percent / 100) * (percent > 0 ? 255 - c : c))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
const HEX = /^#[0-9a-f]{6}$/i;
export const cleanTheme = (t) => ({ key: THEME_KEYS.includes(t?.key) ? t.key : "default", color: HEX.test(t?.color || "") ? t.color.toLowerCase() : "" });

// the class + css variables for a page root. fallback = the note colour's accent (Default theme without a colour)
export function themeLook(theme) {
  const t = cleanTheme(theme);
  const acc = t.color || themeOf(t.key).accent || "";
  const style = acc ? { "--np-accent": acc, "--acc": acc, "--acc-dark": shade(acc, -35), "--acc-soft": shade(acc, 85) } : undefined;
  return { className: `np-th-${t.key}`, style, key: t.key };
}
