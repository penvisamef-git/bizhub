// Restaurant POS looks: "classic" is free, the 12 others are bought once each (rest_pos_theme, 45 coins, forever).
// Same keys as the API (api/src/biz/restaurant/restaurant.models.js POS_THEMES_*).
// Each look: colours, the top bar (light | brand | dark), the dish cards (card | photo | list | round | bold | flat),
// the ticket (plain | paper | dark), corner radius, font, and dark = the whole POS in dark colours.
const T = (en, km, d_en, d_km, o) => ({ en, km, d_en, d_km, ...o });
export const REST_POS_LOOKS = {
  classic: T("Classic", "បុរាណ", "Clean white and blue. Free.", "ពណ៌សស្អាត និងខៀវ។ ឥតគិតថ្លៃ។", { brand: "#2563eb", bg: "#f4f6f9", card: "#ffffff", ink: "#0f172a", head: "light", tile: "card", ticket: "plain", r: 12, font: "" }),
  ocean: T("Ocean", "សមុទ្រ", "Deep blue bar, soft sea tint, rounded cards.", "របារខៀវជ្រៅ ពណ៌សមុទ្រស្រាល កាតមូល។", {
    brand: "#0369a1",
    bg: "#eaf4fb",
    card: "#ffffff",
    ink: "#0c2a3f",
    head: "brand",
    tile: "card",
    ticket: "plain",
    r: 16,
    font: "Lexend",
  }),
  sunset: T("Sunset", "ថ្ងៃលិច", "Warm orange, big food photos with the name on top.", "ពណ៌ទឹកក្រូចកក់ក្តៅ រូបម្ហូបធំ ឈ្មោះលើរូប។", {
    brand: "#ea580c",
    brand2: "#e11d48",
    bg: "#fff4ec",
    card: "#ffffff",
    ink: "#431407",
    head: "brand",
    tile: "photo",
    ticket: "plain",
    r: 18,
    font: "Poppins",
  }),
  forest: T("Forest", "ព្រៃឈើ", "Dark green bar, dishes as a quick list.", "របារបៃតងចាស់ ម្ហូបជាបញ្ជីរហ័ស។", { brand: "#15803d", bg: "#f0f5ef", card: "#ffffff", ink: "#14290f", head: "dark", tile: "list", ticket: "plain", r: 10, font: "DM Sans" }),
  night: T("Night", "យប់", "Dark screen, easy on the eyes in the evening.", "អេក្រង់ងងឹត ស្រួលភ្នែកពេលយប់។", {
    brand: "#818cf8",
    bg: "#0b1020",
    card: "#151b2e",
    ink: "#e5e9f5",
    head: "dark",
    tile: "card",
    ticket: "dark",
    r: 14,
    font: "Sora",
    dark: true,
  }),
  coffee: T("Coffee", "កាហ្វេ", "Cream and coffee brown, round dish pictures.", "ពណ៌ក្រែម និងកាហ្វេ រូបម្ហូបមូល។", {
    brand: "#7c4a2d",
    bg: "#f6efe6",
    card: "#fffaf3",
    ink: "#3b2416",
    head: "brand",
    tile: "round",
    ticket: "paper",
    r: 20,
    font: "Nunito",
  }),
  neon: T("Neon", "នីអុង", "Black with bright lime — bold price tags.", "ខ្មៅ និងបៃតងភ្លឺ — តម្លៃដិតធំ។", {
    brand: "#a3e635",
    onbrand: "#111827",
    bg: "#09090b",
    card: "#18181b",
    ink: "#f4f4f5",
    head: "dark",
    tile: "bold",
    ticket: "dark",
    r: 8,
    font: "Space Grotesk",
    dark: true,
  }),
  berry: T("Berry", "ផ្លែបឺរី", "Pink and violet, soft round shapes.", "ផ្កាឈូក និងស្វាយ រាងមូលទន់។", {
    brand: "#c026d3",
    brand2: "#db2777",
    bg: "#fdf2fb",
    card: "#ffffff",
    ink: "#3b0a3f",
    head: "light",
    tile: "round",
    ticket: "plain",
    r: 22,
    font: "Quicksand",
  }),
  angkor: T("Angkor", "អង្គរ", "Gold and stone, Khmer letters first.", "មាស និងថ្ម អក្សរខ្មែរមុន។", {
    brand: "#b45309",
    brand2: "#7c2d12",
    bg: "#f8f1e4",
    card: "#fffbf3",
    ink: "#3d2208",
    head: "brand",
    tile: "list",
    ticket: "paper",
    r: 6,
    font: "Kantumruy Pro",
  }),
  mint: T("Mint", "ជីអង្កាម", "Fresh teal with full photo cards.", "បៃតងខៀវស្រស់ កាតរូបពេញ។", { brand: "#0d9488", bg: "#ecfdf8", card: "#ffffff", ink: "#063b36", head: "light", tile: "photo", ticket: "plain", r: 16, font: "Manrope" }),
  slate: T("Slate", "ថ្មខៀវ", "Grey and steel — calm, flat and professional.", "ប្រផេះ និងដែក — ស្ងប់ រាបស្មើ និងអាជីព។", {
    brand: "#334155",
    bg: "#eef1f5",
    card: "#ffffff",
    ink: "#0f172a",
    head: "dark",
    tile: "flat",
    ticket: "plain",
    r: 6,
    font: "IBM Plex Sans",
  }),
  candy: T("Candy", "ស្ករគ្រាប់", "Pastel colours and big round buttons — fun!", "ពណ៌ស្រាល និងប៊ូតុងមូលធំ — សប្បាយ!", {
    brand: "#ec4899",
    brand2: "#06b6d4",
    bg: "#fff0f7",
    card: "#ffffff",
    ink: "#4a044e",
    head: "brand",
    tile: "round",
    ticket: "plain",
    r: 24,
    font: "Baloo 2",
  }),
  paper: T("Paper", "ក្រដាស", "Black and white like a printed menu.", "ខ្មៅ និងស ដូចម៉ឺនុយបោះពុម្ព។", { brand: "#111111", bg: "#f5f2ea", card: "#fffdf8", ink: "#111111", head: "light", tile: "flat", ticket: "paper", r: 2, font: "Courier Prime" }),
};
export const REST_POS_KEYS = Object.keys(REST_POS_LOOKS);
export const restPosLookOf = (k) => REST_POS_LOOKS[k] || REST_POS_LOOKS.classic;
export const restPosName = (k, lang) => restPosLookOf(k)[lang === "km" ? "km" : "en"];
export const restPosDesc = (k, lang) => restPosLookOf(k)[lang === "km" ? "d_km" : "d_en"];

// the colour variables of a look (the same names the POS styles use)
export function restPosVars(k) {
  const d = restPosLookOf(k);
  const dark = !!d.dark;
  const mix = (c, p, w) => `color-mix(in srgb, ${c} ${p}%, ${w})`;
  return {
    "--brand": d.brand,
    "--brand-hover": mix(d.brand, 85, dark ? "#fff" : "#000"),
    "--onbrand": d.onbrand || "#ffffff",
    "--accent": d.brand2 || d.brand,
    "--active": mix(d.brand, dark ? 22 : 12, d.card),
    "--app-bg": d.bg,
    "--bg": d.card,
    "--bg2": mix(d.ink, dark ? 8 : 4, d.card),
    "--card": d.card,
    "--line": mix(d.ink, dark ? 16 : 10, d.card),
    "--line-strong": mix(d.ink, dark ? 26 : 18, d.card),
    "--ink": d.ink,
    "--muted": mix(d.ink, 58, d.card),
    "--chip": mix(d.ink, dark ? 10 : 5, d.card),
    "--bar": mix(d.brand, 40, d.card),
    "--glow1": mix(d.brand, 14, "transparent"),
    "--glow2": mix(d.brand2 || d.brand, 10, "transparent"),
    "--focus": `0 0 0 3px ${mix(d.brand, 35, "transparent")}`,
    "--rpt-r": `${d.r}px`,
    ...(d.font ? { "--font": `"${d.font}", "Kantumruy Pro", system-ui, sans-serif` } : {}),
  };
}
export const restPosClasses = (k) => {
  const d = restPosLookOf(k);
  return [`rpt`, `rpt-head-${d.head}`, `rpt-tile-${d.tile}`, `rpt-ticket-${d.ticket}`, d.dark ? "rpt-dark" : ""].filter(Boolean);
};

export function loadRestPosFont(k) {
  const f = restPosLookOf(k).font;
  if (!f || typeof document === "undefined" || f === "Kantumruy Pro") return;
  const id = `rpt-font-${f.replace(/ /g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${f.replace(/ /g, "+")}:wght@400;500;600;700${f === "Courier Prime" ? "" : ";800"}&display=swap`;
  document.head.appendChild(link);
}

// put a look on the whole POS page (body classes + a style tag that wins over the default colours)
export function applyRestPosLook(k) {
  if (typeof document === "undefined") return;
  const body = document.body;
  body.className = body.className
    .split(/\s+/)
    .filter((c) => c && !c.startsWith("rpt"))
    .join(" ");
  let tag = document.getElementById("rpt-vars");
  if (!k || k === "classic") {
    tag?.remove();
    return;
  }
  body.classList.add(...restPosClasses(k));
  loadRestPosFont(k);
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "rpt-vars";
    document.head.appendChild(tag);
  }
  const vars = Object.entries(restPosVars(k))
    .map(([n, v]) => `${n}:${v}`)
    .join(";");
  tag.textContent = `html body.pos-body-page, html body .pos, html body .pos-center, html body .pos-sheet-back { ${vars}; color-scheme: ${restPosLookOf(k).dark ? "dark" : "light"}; }`;
}
