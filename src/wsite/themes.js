// Website looks (353, in 15 style categories) + font pairs (25). Same keys as the API (website.themelist.js).
// A look = colours + shapes + the font pair it starts with. The owner can change colour / font / buttons / light-dark on top.
import { WS_THEME_ALIAS, WS_THEME_CATS, WS_THEME_DATA, WS_THEME_DESC, WS_THEME_STYLES } from "./themeList";

export const WS_THEMES = WS_THEME_DATA;
export { WS_THEME_CATS, WS_THEME_STYLES };
export const WS_FREE = ["clean", "soft", "bold", "night"];
export const WS_THEME_KEYS = Object.keys(WS_THEMES);
// a removed look (too close to another) shows as the look that replaced it
export const wsThemeKey = (k) => (WS_THEMES[k] ? k : WS_THEMES[WS_THEME_ALIAS[k]] ? WS_THEME_ALIAS[k] : "clean");
export const wsTheme = (k) => WS_THEMES[wsThemeKey(k)];
export const wsThemeName = (k, lang) => wsTheme(k)[lang === "km" ? "km" : "en"];
// "Big photo banner, soft shadows, wavy edges — for cafés…" — built from the look's parts
export function wsThemeDesc(k, lang) {
  const t = wsTheme(k);
  const i = lang === "km" ? 1 : 0;
  const D = WS_THEME_DESC;
  const hero = D.hero[t.hero]?.[i] || "";
  const cards = D.cards[t.cards]?.[i] || "";
  const use = D.use[t.cat]?.[i] || "";
  const ex = ["divider", "pics", "bgfx", "type", "width", "sections", "header"].map((d) => D.extra[`${d}:${t[d] || ""}`]).find(Boolean)?.[i];
  if (i) return `${hero} ${cards}${ex ? ` ${ex}` : ""}${t.dark ? " ងងឹត" : ""} — សម្រាប់${use}។`;
  return `${hero}, ${cards}${ex ? `, ${ex}` : ""}${t.dark ? ", dark" : ""} — for ${use}.`;
}

// font pairs: Latin + Khmer for headings and for text
const F = (en, km, head, body, google) => ({ en, km, head, body, google });
export const WS_FONTS = {
  modern: F("Modern", "ទំនើប", `"Inter", "Kantumruy Pro"`, `"Inter", "Kantumruy Pro"`, ["Inter:wght@400;600;800", "Kantumruy Pro:wght@400;600;700"]),
  friendly: F("Friendly", "រួសរាយ", `"Nunito", "Kantumruy Pro"`, `"Nunito", "Kantumruy Pro"`, ["Nunito:wght@400;700;800", "Kantumruy Pro:wght@400;600;700"]),
  classic: F("Classic", "បុរាណ", `"Playfair Display", "Noto Serif Khmer"`, `"Inter", "Kantumruy Pro"`, ["Playfair Display:wght@600;800", "Noto Serif Khmer:wght@500;700", "Inter:wght@400;600", "Kantumruy Pro:wght@400;600"]),
  bold: F("Bold", "ដិត", `"Montserrat", "Koulen"`, `"Montserrat", "Kantumruy Pro"`, ["Montserrat:wght@400;600;800;900", "Koulen", "Kantumruy Pro:wght@400;600"]),
  elegant: F("Elegant", "ថ្លៃថ្នូរ", `"Cormorant Garamond", "Hanuman"`, `"Lato", "Battambang"`, ["Cormorant Garamond:wght@500;700", "Hanuman:wght@400;700", "Lato:wght@400;700", "Battambang:wght@400;700"]),
  tech: F("Tech", "បច្ចេកវិទ្យា", `"Space Grotesk", "Kantumruy Pro"`, `"Inter", "Kantumruy Pro"`, ["Space Grotesk:wght@500;700", "Inter:wght@400;600", "Kantumruy Pro:wght@400;600;700"]),
  magazine: F("Magazine", "ទស្សនាវដ្តី", `"DM Serif Display", "Noto Serif Khmer"`, `"Source Sans 3", "Noto Sans Khmer"`, ["DM Serif Display", "Noto Serif Khmer:wght@500;700", "Source Sans 3:wght@400;600", "Noto Sans Khmer:wght@400;600"]),
  playful: F("Playful", "សប្បាយ", `"Fredoka", "Kantumruy Pro"`, `"Nunito", "Kantumruy Pro"`, ["Fredoka:wght@500;700", "Nunito:wght@400;700", "Kantumruy Pro:wght@400;600;700"]),
  corporate: F("Corporate", "ក្រុមហ៊ុន", `"IBM Plex Sans", "Noto Sans Khmer"`, `"IBM Plex Sans", "Noto Sans Khmer"`, ["IBM Plex Sans:wght@400;600;700", "Noto Sans Khmer:wght@400;600;700"]),
  soft: F("Soft", "ទន់", `"Quicksand", "Kantumruy Pro"`, `"Quicksand", "Kantumruy Pro"`, ["Quicksand:wght@500;700", "Kantumruy Pro:wght@400;600;700"]),
  heritage: F("Heritage", "បេតិកភណ្ឌ", `"Lora", "Moul"`, `"Lora", "Battambang"`, ["Lora:wght@400;600;700", "Moul", "Battambang:wght@400;700"]),
  clean: F("Clean", "ស្អាត", `"DM Sans", "Noto Sans Khmer"`, `"DM Sans", "Noto Sans Khmer"`, ["DM Sans:wght@400;600;800", "Noto Sans Khmer:wght@400;600;700"]),
  geometric: F("Geometric", "ធរណីមាត្រ", `"Poppins", "Kantumruy Pro"`, `"Poppins", "Kantumruy Pro"`, ["Poppins:wght@400;600;800", "Kantumruy Pro:wght@400;600;700"]),
  grotesk: F("Grotesk", "ក្រាស់ទំនើប", `"Archivo", "Nokora"`, `"Archivo", "Nokora"`, ["Archivo:wght@400;600;800;900", "Nokora:wght@400;700;900"]),
  display: F("Poster", "ផ្ទាំងរូប", `"Bebas Neue", "Bayon"`, `"Inter", "Kantumruy Pro"`, ["Bebas Neue", "Bayon", "Inter:wght@400;600", "Kantumruy Pro:wght@400;600"]),
  condensed: F("Sport", "កីឡា", `"Oswald", "Dangrek"`, `"Barlow", "Kantumruy Pro"`, ["Oswald:wght@500;700", "Dangrek", "Barlow:wght@400;600", "Kantumruy Pro:wght@400;600"]),
  slab: F("Slab", "ស្លាប", `"Roboto Slab", "Kdam Thmor Pro"`, `"Source Sans 3", "Suwannaphum"`, ["Roboto Slab:wght@500;700;800", "Kdam Thmor Pro", "Source Sans 3:wght@400;600", "Suwannaphum:wght@400;700"]),
  mono: F("Code", "កូដ", `"Space Mono", "Kantumruy Pro"`, `"IBM Plex Sans", "Noto Sans Khmer"`, ["Space Mono:wght@400;700", "Kantumruy Pro:wght@400;600;700", "IBM Plex Sans:wght@400;600", "Noto Sans Khmer:wght@400;600"]),
  rounded: F("Rounded", "មូល", `"Baloo 2", "Kantumruy Pro"`, `"Nunito Sans", "Kantumruy Pro"`, ["Baloo 2:wght@500;700;800", "Nunito Sans:wght@400;700", "Kantumruy Pro:wght@400;600;700"]),
  editorial: F("Editorial", "អត្ថបទ", `"Fraunces", "Noto Serif Khmer"`, `"Newsreader", "Noto Serif Khmer"`, ["Fraunces:wght@400;600;800", "Newsreader:wght@400;600", "Noto Serif Khmer:wght@400;600;700"]),
  script: F("Script", "សរសេរដៃ", `"Dancing Script", "Moulpali"`, `"Lato", "Battambang"`, ["Dancing Script:wght@600;700", "Moulpali", "Lato:wght@400;700", "Battambang:wght@400;700"]),
  typewriter: F("Typewriter", "អង្គុលីលេខ", `"Courier Prime", "Siemreap"`, `"Work Sans", "Siemreap"`, ["Courier Prime:wght@400;700", "Siemreap", "Work Sans:wght@400;600"]),
  fashion: F("Fashion", "ម៉ូដ", `"Bodoni Moda", "Preahvihear"`, `"Jost", "Kantumruy Pro"`, ["Bodoni Moda:wght@500;700", "Preahvihear", "Jost:wght@400;500;600", "Kantumruy Pro:wght@400;600"]),
  handmade: F("Handmade", "ធ្វើដោយដៃ", `"Patrick Hand", "Freehand"`, `"Nunito", "Kantumruy Pro"`, ["Patrick Hand", "Freehand", "Nunito:wght@400;700", "Kantumruy Pro:wght@400;600"]),
  temple: F("Temple", "ប្រាសាទ", `"Cinzel", "Angkor"`, `"Lora", "Battambang"`, ["Cinzel:wght@600;800", "Angkor", "Lora:wght@400;600", "Battambang:wght@400;700"]),
};
export const WS_FONT_KEYS = Object.keys(WS_FONTS);
export const WS_FREE_FONTS = ["modern", "friendly", "classic", "bold"];
export const WS_COLORS = ["#E0581A", "#DC2626", "#DB2777", "#9333EA", "#4F46E5", "#2563EB", "#0891B2", "#0D9488", "#16A34A", "#CA8A04", "#78350F", "#111827"];

export function loadWsFont(key) {
  const f = WS_FONTS[key];
  if (!f || typeof document === "undefined") return;
  const id = `ws-font-${key}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${f.google.map((g) => `family=${g.replace(/ /g, "+")}`).join("&")}&display=swap`;
  document.head.appendChild(link);
}

// light or dark text on a colour
const lum = (hex) => {
  const n = parseInt(String(hex || "#000").slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const onColor = (hex) => (lum(hex) > 0.45 ? "#111111" : "#ffffff");

// the look of a site → { vars (CSS variables), attrs (data-* on the root), font }
export function wsLook(site = {}) {
  const t = wsTheme(site.theme);
  const st = site.style || {};
  const wantDark = st.mode ? st.mode === "dark" : !!t.dark;
  const c = st.color || t.c;
  const c2 = st.accent || t.c2;
  let bg = st.bg || t.bg;
  let sf = t.sf;
  let ink = t.ink;
  // the owner switched light ↔ dark against the look's own
  if (wantDark && !t.dark) {
    bg = st.bg || "#0f1218";
    sf = "#181c25";
    ink = "#e8eaf0";
  } else if (!wantDark && t.dark) {
    bg = st.bg || "#ffffff";
    sf = "#f5f7fa";
    ink = "#0f172a";
  }
  const font = WS_FONTS[st.font] ? st.font : t.font;
  const f = WS_FONTS[font];
  const btn = st.buttons || t.btn;
  const mix = (a, p, b) => `color-mix(in srgb, ${a} ${p}%, ${b})`;
  return {
    font,
    vars: {
      "--ws-c": c,
      "--ws-c2": c2,
      "--ws-on": onColor(c),
      "--ws-bg": bg,
      "--ws-sf": sf,
      "--ws-ink": ink,
      "--ws-mute": mix(ink, 62, bg),
      "--ws-line": mix(ink, wantDark ? 16 : 11, bg),
      "--ws-soft": mix(c, wantDark ? 18 : 9, bg),
      "--ws-c0": c,
      "--ws-bg0": bg,
      "--ws-ink0": ink,
      "--ws-r": `${t.r}px`,
      "--ws-btn-r": btn === "pill" ? "999px" : btn === "square" ? "2px" : `${Math.max(8, Math.min(t.r, 14))}px`,
      "--ws-head": `${f.head}, system-ui, sans-serif`,
      "--ws-body": `${f.body}, system-ui, sans-serif`,
    },
    attrs: {
      "data-header": t.header,
      "data-hero": t.hero,
      "data-sections": t.sections,
      "data-cards": t.cards,
      "data-deco": t.deco || "",
      "data-titles": t.titles || "",
      "data-dark": wantDark ? "1" : "",
      "data-btns": t.btns || "",
      "data-divider": t.divider || "",
      "data-pics": t.pics || "",
      "data-bgfx": t.bgfx || "",
      "data-type": t.type || "",
      "data-width": t.width || "",
      "data-density": t.density || "",
      "data-foot": t.foot || "",
    },
  };
}
