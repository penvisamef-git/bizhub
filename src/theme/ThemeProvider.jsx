import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "bizhub_theme";
const ACCENT_KEY = "bizhub_accent";
const ThemeContext = createContext(null);

// colour themes of the app (Settings → Theme); the look itself is in styles/accents.css
export const ACCENTS = [
  { id: "ember", colors: ["#e0581a", "#e08a1a"] },
  { id: "ocean", colors: ["#2563eb", "#06b6d4"] },
  { id: "forest", colors: ["#15803d", "#65a30d"] },
  { id: "royal", colors: ["#7c3aed", "#c026d3"] },
  { id: "rose", colors: ["#e11d48", "#f472b6"] },
  { id: "lagoon", colors: ["#0d9488", "#0ea5e9"] },
  { id: "gold", colors: ["#b7791f", "#d4a72c"] },
  { id: "graphite", colors: ["#27272a", "#71717a"] },
];
const ACCENT_IDS = [...ACCENTS.map((a) => a.id), "custom"];
const STYLE_KEY = "bizhub_style";
const COLOR_KEY = "bizhub_accent_color";
// looks of the app (Settings → Style): shapes, shadows, fonts, backgrounds — the colour is chosen apart. The look is in styles/app-styles.css
export const STYLES = [
  { id: "floating" }, // default: floating cards
  { id: "flat", font: "" },
  { id: "glass" },
  { id: "sharp", font: "Inter" },
  { id: "soft", font: "Nunito" },
  { id: "outline", font: "DM Sans" },
  { id: "studio", font: "Manrope" },
  { id: "compact", font: "Inter" },
  { id: "bold", font: "Space Grotesk" },
  { id: "paper", font: "Lora" },
  { id: "neumorph", font: "Poppins" },
  { id: "aurora", font: "Outfit" },
];
const STYLE_IDS = STYLES.map((x) => x.id);
const read = (k, ok, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return ok(v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const HEX = /^#[0-9a-f]{6}$/i;
// a colour → the theme variables (lighter / darker shades worked out here)
function mix(hex, other, w) {
  const a = hex.match(/\w\w/g).map((h) => parseInt(h, 16));
  const b = other.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `#${a
    .map((v, i) =>
      Math.round(v * (1 - w) + b[i] * w)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
function rgba(hex, al) {
  const [r, g, b] = hex.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${al})`;
}
export function customAccentCss(c) {
  if (!HEX.test(c || "")) return "";
  const c2 = mix(c, "#ffffff", 0.35);
  const ink = mix(c, "#000000", 0.18);
  const light = mix(c, "#ffffff", 0.25);
  const sel = 'html:root[data-accent="custom"], html:root[data-accent="custom"] .app';
  const dsel = 'html:root[data-accent="custom"][data-theme="dark"], html:root[data-accent="custom"][data-theme="dark"] .app';
  const vars = (b, b2, ink2, al) =>
    `--brand:${b};--brand-2:${b2};--brand-ink:${ink2};--brand-hover:${ink2};--accent:${ink2};--active:${rgba(b, al)};--onbrand:#ffffff;--grad:linear-gradient(135deg, ${c} 0%, ${c2} 100%);--orange-shadow:0 10px 24px ${rgba(b, 0.3)};--focus:0 0 0 3px ${rgba(b, 0.35)};--bar:${rgba(b, 0.3)};--glow1:${rgba(b, 0.28)};`;
  return `${sel}{${vars(c, c2, ink, 0.1)}}${dsel}{${vars(light, mix(c2, "#ffffff", 0.2), mix(c, "#ffffff", 0.4), 0.16)}}`;
}

function initialTheme() {
  const fromHtml = document.documentElement.dataset.theme; // set in index.html before paint
  if (fromHtml === "dark" || fromHtml === "light") return fromHtml;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function initialAccent() {
  return read(ACCENT_KEY, (a) => ACCENT_IDS.includes(a), "ember");
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme);
  const [accent, setAccentState] = useState(initialAccent);
  const [style, setStyleState] = useState(() => read(STYLE_KEY, (v) => STYLE_IDS.includes(v), "floating"));
  const [color, setColorState] = useState(() => read(COLOR_KEY, (v) => HEX.test(v || ""), "#0f766e"));
  useEffect(() => {
    try {
      localStorage.setItem(STYLE_KEY, style);
      localStorage.setItem(COLOR_KEY, color);
    } catch {
      /* storage blocked */
    }
  }, [style, color]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage blocked */
    }
  }, [theme]);
  useEffect(() => {
    try {
      localStorage.setItem(ACCENT_KEY, accent);
    } catch {
      /* storage blocked */
    }
  }, [accent]);

  const setTheme = useCallback((t) => setThemeState(t === "dark" ? "dark" : "light"), []);
  const toggleTheme = useCallback(() => setThemeState((t) => (t === "dark" ? "light" : "dark")), []);
  const setAccent = useCallback((a) => setAccentState(ACCENT_IDS.includes(a) ? a : "ember"), []);
  const setStyle = useCallback((v) => setStyleState(STYLE_IDS.includes(v) ? v : "floating"), []);
  // the owner's own colour (accent = "custom")
  const setColor = useCallback((c) => {
    if (!HEX.test(c || "")) return;
    setColorState(c.toLowerCase());
    setAccentState("custom");
  }, []);
  const value = useMemo(() => ({ theme, setTheme, toggleTheme, accent, setAccent, style, setStyle, color, setColor }), [theme, setTheme, toggleTheme, accent, setAccent, style, setStyle, color, setColor]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

// inside the app only (public pages keep their own colours): <html data-accent="…">
export function useAppAccent() {
  const { accent, style, color } = useTheme();
  useEffect(() => {
    const el = document.documentElement;
    if (accent === "ember") delete el.dataset.accent;
    else el.dataset.accent = accent;
    return () => {
      delete el.dataset.accent;
    };
  }, [accent]);
  // the owner's own colour → a small stylesheet
  useEffect(() => {
    if (accent !== "custom") return undefined;
    let tag = document.getElementById("bizhub-custom-accent");
    if (!tag) {
      tag = document.createElement("style");
      tag.id = "bizhub-custom-accent";
      document.head.appendChild(tag);
    }
    tag.textContent = customAccentCss(color);
    return () => tag.remove();
  }, [accent, color]);
  // the style (shapes, fonts…): <html data-style="…"> + its font from Google Fonts
  useEffect(() => {
    const el = document.documentElement;
    if (style === "floating") delete el.dataset.style;
    else el.dataset.style = style;
    loadStyleFont(style);
    return () => {
      delete el.dataset.style;
    };
  }, [style]);
}
export function loadStyleFont(id) {
  const font = STYLES.find((x) => x.id === id)?.font;
  if (!font || document.getElementById(`bizhub-font-${id}`)) return;
  const link = document.createElement("link");
  link.id = `bizhub-font-${id}`;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, "+")}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
