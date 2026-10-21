// Flip Book library (shelf) designs: 1 free ("classic") + 60 at 15 coins each. The owner colour replaces the accent.
//   layout: shelf (books standing on planks) · grid (cards) · magazine (big first book) · carousel (rows that slide)
//           list (cover + text) · wall (covers only, tight) · spotlight (dark, lit covers) · stack (tilted pile)
const S = (en, km, layout, bg, surface, ink, muted, accent, plank, hf, bf, pat, dark) => ({ en, km, layout, bg, surface, ink, muted, accent, plank, hf, bf, pat, dark: !!dark });
export const SHELVES = {
  classic: S("Library", "\u1794\u178e\u17d2\u178e\u17b6\u179b\u17d0\u1799", "shelf", "#f4f1ec", "#ffffff", "#1f1b16", "#776f64", "#E0581A", "linear-gradient(#c79a63,#9c7243)", "Lora", "Inter", "none", 0),
  wood: S("Wood shelf", "\u1792\u17d2\u1793\u17be\u1788\u17be", "shelf", "#efe4d4", "#fffaf2", "#2e2117", "#7d6a57", "#a0522d", "linear-gradient(#b9814a,#7c4f27)", "Merriweather", "Nunito", "grain", 0),
  oak: S("Oak", "\u1788\u17be\u17a2\u17bc\u1780", "grid", "#f5ecdf", "#fffaf3", "#33261a", "#7e6d5b", "#b7791f", "linear-gradient(#d6a46b,#a8743c)", "Lora", "Nunito", "none", 0),
  walnut: S("Walnut", "\u1788\u17be\u179c\u17c9\u17b6\u179b\u17cb\u178e\u17b6\u178f\u17cb", "shelf", "#2a1d15", "#3a281d", "#f6ebe0", "#c3ab95", "#e0a96d", "linear-gradient(#6b4226,#3e2414)", "Playfair Display", "Inter", "grain", 1),
  cherry: S("Cherry wood", "\u1788\u17be\u1786\u17ba\u179a\u17b8", "stack", "#f7ebe6", "#ffffff", "#3d1d18", "#8f6b64", "#b91c1c", "linear-gradient(#b5543c,#7d3022)", "Cormorant Garamond", "Nunito", "none", 0),
  bamboo: S("Bamboo", "\u17ab\u179f\u17d2\u179f\u17b8", "shelf", "#f1f3e6", "#ffffff", "#2a3216", "#6c7550", "#65a30d", "repeating-linear-gradient(90deg,#c9b46a 0 38px,#a99447 38px 41px)", "Josefin Sans", "Nunito", "none", 0),
  pine: S("Pine", "\u179f\u17d2\u179a\u179b\u17cb", "carousel", "#eef2ea", "#ffffff", "#203024", "#617365", "#2f855a", "linear-gradient(#e2c08d,#b88c4f)", "Merriweather", "Nunito", "leaves", 0),
  ebony: S("Ebony", "\u1788\u17be\u1781\u17d2\u1798\u17c5", "spotlight", "#111010", "#1b1a19", "#f3efe9", "#a8a29b", "#d4af37", "linear-gradient(#2b2522,#0e0c0b)", "Cinzel", "Inter", "none", 1),
  teak: S("Teak", "\u1788\u17be\u1782\u1782\u17b8\u179a", "list", "#f3e9dc", "#fffaf3", "#35251a", "#806b58", "#c2410c", "linear-gradient(#a8693b,#6f4122)", "Lora", "Inter", "grain", 0),
  glass: S(
    "Glass shelf",
    "\u1792\u17d2\u1793\u17be\u1780\u1789\u17d2\u1785\u1780\u17cb",
    "shelf",
    "#e8f1f6",
    "rgba(255,255,255,.7)",
    "#0f2533",
    "#5b7584",
    "#0ea5e9",
    "linear-gradient(rgba(255,255,255,.85),rgba(186,230,253,.6))",
    "Outfit",
    "Outfit",
    "none",
    0,
  ),
  crystal: S(
    "Crystal",
    "\u1782\u17d2\u179a\u17b8\u179f\u17d2\u178f\u17b6\u179b\u17cb",
    "wall",
    "#eef2ff",
    "rgba(255,255,255,.75)",
    "#1e1b4b",
    "#6366a1",
    "#6366f1",
    "linear-gradient(rgba(255,255,255,.9),rgba(199,210,254,.7))",
    "Space Grotesk",
    "Inter",
    "dots",
    0,
  ),
  frost: S("Frost", "\u1791\u17b9\u1780\u1780\u1780", "grid", "#f0f6f9", "rgba(255,255,255,.8)", "#13303d", "#5f7d8a", "#0891b2", "linear-gradient(#ffffff,#cfe8f1)", "Quicksand", "Quicksand", "none", 0),
  aqua: S("Aqua", "\u1791\u17b9\u1780\u179f\u1798\u17bb\u1791\u17d2\u179a", "carousel", "#e6f7f7", "#ffffff", "#0b3536", "#4f7f80", "#0d9488", "linear-gradient(rgba(255,255,255,.9),rgba(153,246,228,.7))", "Comfortaa", "Nunito", "waves", 0),
  marble: S("Marble", "\u1790\u17d2\u1798\u1798\u17c9\u17b6\u1794", "grid", "#f5f5f4", "#ffffff", "#1c1917", "#78716c", "#a16207", "linear-gradient(#f5f5f4,#d6d3d1)", "Cormorant Garamond", "Inter", "marble", 0),
  stone: S("Stone", "\u1790\u17d2\u1798", "shelf", "#e7e5e4", "#f5f5f4", "#1c1917", "#6b6560", "#57534e", "linear-gradient(#a8a29e,#78716c)", "Josefin Sans", "Inter", "grain", 0),
  concrete: S("Concrete", "\u1794\u17c1\u178f\u17bb\u1784", "wall", "#d9d9d6", "#ececea", "#161616", "#606060", "#ea580c", "linear-gradient(#9c9c98,#6e6e6b)", "Bebas Neue", "Inter", "grain", 0),
  slate: S("Slate", "\u1790\u17d2\u1798\u1781\u17c0\u179c", "list", "#1e252d", "#28313b", "#eef2f6", "#9aa7b4", "#38bdf8", "linear-gradient(#475569,#1e293b)", "Space Grotesk", "Inter", "none", 1),
  paper: S("Paper", "\u1780\u17d2\u179a\u178a\u17b6\u179f", "list", "#faf7f0", "#ffffff", "#2a2620", "#7b7466", "#b45309", "linear-gradient(#e8dcc5,#cdbb98)", "Lora", "Lora", "paper", 0),
  kraft: S("Kraft", "\u1780\u17d2\u179a\u178a\u17b6\u179f\u1780\u17d2\u179a\u17b6\u17a0\u17d2\u179c", "stack", "#d9c3a0", "#e8d6b8", "#3a2b1a", "#6d5a43", "#7c2d12", "linear-gradient(#a7865a,#7a5d38)", "Amatic SC", "Josefin Sans", "paper", 0),
  linen: S("Linen", "\u1780\u17d2\u179a\u178e\u17b6\u178f\u17cb", "grid", "#f2eee6", "#faf8f3", "#2e2a24", "#7a7367", "#9a3412", "linear-gradient(#d8cdb8,#b9aa8e)", "Cormorant Garamond", "Nunito", "linen", 0),
  parchment: S("Parchment", "\u1780\u17d2\u179a\u178a\u17b6\u179f\u1785\u17b6\u179f\u17cb", "shelf", "#efe2c4", "#f8eed7", "#3b2a12", "#7e6a48", "#92400e", "linear-gradient(#b08a52,#7d5c2e)", "Cinzel", "Lora", "paper", 0),
  dark: S("Dark", "\u1784\u1784\u17b9\u178f", "spotlight", "#0e0f13", "#181a20", "#f3f4f6", "#9ca3af", "#f97316", "linear-gradient(#2a2d36,#111318)", "Outfit", "Inter", "none", 1),
  midnight: S("Midnight", "\u17a2\u1792\u17d2\u179a\u17b6\u178f\u17d2\u179a", "carousel", "#0b1020", "#141b33", "#eef2ff", "#9aa5c8", "#818cf8", "linear-gradient(#26305a,#121933)", "Space Grotesk", "Outfit", "dots", 1),
  charcoal: S("Charcoal", "\u1792\u17d2\u1799\u17bc\u1784", "shelf", "#1f1f22", "#2a2a2e", "#f4f4f5", "#a1a1aa", "#eab308", "linear-gradient(#3f3f46,#18181b)", "Oswald", "Inter", "grain", 1),
  obsidian: S("Obsidian", "\u1790\u17d2\u1798\u1781\u17d2\u1798\u17c5", "wall", "#050506", "#111114", "#fafafa", "#8b8b93", "#a855f7", "linear-gradient(#1c1c22,#050506)", "Abril Fatface", "Inter", "none", 1),
  neon: S("Neon", "\u1797\u17d2\u179b\u17be\u1784\u1793\u17b8\u17a2\u17bb\u1784", "carousel", "#07070c", "#10101a", "#e9fbff", "#8ba3b0", "#22d3ee", "linear-gradient(#22d3ee,#a855f7)", "Righteous", "Outfit", "grid", 1),
  cyber: S("Cyber", "\u179f\u17ca\u17b8\u1794\u17d0\u179a", "grid", "#0a0f0a", "#111a11", "#e7ffe7", "#86a886", "#22c55e", "linear-gradient(#22c55e,#14532d)", "Space Grotesk", "Space Grotesk", "grid", 1),
  synth: S("Synthwave", "\u179f\u17ca\u17b8\u1793\u179c\u17c1\u179c", "shelf", "#1a0b2e", "#2a1145", "#fde7ff", "#c39bd3", "#f472b6", "linear-gradient(#f472b6,#7c3aed)", "Righteous", "Outfit", "grid", 1),
  arcade: S("Arcade", "\u17a0\u17d2\u1782\u17c1\u1798", "stack", "#120a24", "#1d1236", "#fff7e6", "#c4b38f", "#facc15", "linear-gradient(#facc15,#f97316)", "Bebas Neue", "Rubik", "dots", 1),
  pastel: S("Pastel", "\u1796\u178e\u17cc\u179f\u17d2\u179a\u17b6\u179b", "stack", "#f6f4ff", "#ffffff", "#2d2a4a", "#7f7a9e", "#8b5cf6", "linear-gradient(#ddd6fe,#c4b5fd)", "Quicksand", "Quicksand", "dots", 0),
  candy: S("Candy", "\u179f\u17d2\u1780\u179a\u1782\u17d2\u179a\u17b6\u1794\u17cb", "grid", "#fff1f7", "#ffffff", "#4a1d3a", "#9b7290", "#ec4899", "linear-gradient(#fbcfe8,#f9a8d4)", "Fredoka", "Fredoka", "dots", 0),
  peach: S("Peach", "\u1794\u17c9\u17c2\u179f", "carousel", "#fff5ef", "#ffffff", "#4a2618", "#9a6e5c", "#f97316", "linear-gradient(#fed7aa,#fdba74)", "Nunito", "Nunito", "none", 0),
  lilac: S("Lilac", "\u1795\u17d2\u1780\u17b6\u179f\u17d2\u179c\u17b6\u1799", "shelf", "#f7f3fc", "#ffffff", "#35204a", "#86739a", "#9333ea", "linear-gradient(#e9d5ff,#c084fc)", "Comfortaa", "Nunito", "none", 0),
  gold: S("Gold", "\u1798\u17b6\u179f", "shelf", "#121212", "#1b1b1b", "#f5e9cf", "#b9a98a", "#d4af37", "linear-gradient(#e7c873,#9c7a21)", "Cinzel", "Lora", "none", 1),
  royal: S("Royal", "\u179a\u17b6\u1787\u179c\u1784\u17d2\u179f", "magazine", "#0f1a2e", "#15233d", "#f3ead6", "#b4a88c", "#d4af37", "linear-gradient(#d4af37,#8a6d1c)", "Cinzel", "Cormorant Garamond", "grid", 1),
  ivory: S("Ivory", "\u1797\u17d2\u179b\u17bb\u1780", "grid", "#fbf8f1", "#ffffff", "#2b261d", "#7d7565", "#a16207", "linear-gradient(#efe6d2,#d8c9a6)", "Playfair Display", "Lora", "none", 0),
  champagne: S("Champagne", "\u179f\u17c6\u1794\u17c9\u17b6\u1789", "spotlight", "#1c1712", "#2a221a", "#f8ecd8", "#c7b293", "#e8c37a", "linear-gradient(#e8c37a,#a37b3c)", "Playfair Display", "Nunito", "none", 1),
  magazine: S("Magazine", "\u1791\u179f\u17d2\u179f\u1793\u17b6\u179c\u178a\u17d2\u178f\u17b8", "magazine", "#fafafa", "#ffffff", "#111111", "#6e6e6e", "#e11d48", "linear-gradient(#e5e5e5,#cfcfcf)", "Abril Fatface", "Inter", "none", 0),
  editorial: S("Editorial", "\u179c\u17b7\u1785\u17b6\u179a\u178e\u1780\u1790\u17b6", "magazine", "#f6f3ee", "#ffffff", "#1a1a1a", "#6f6a62", "#1d4ed8", "linear-gradient(#ddd6ca,#c2b9a9)", "Playfair Display", "Inter", "none", 0),
  tabloid: S("Tabloid", "\u1780\u17b6\u179f\u17c2\u178f\u178f\u17bc\u1785", "grid", "#fff8e7", "#ffffff", "#111111", "#5f5a4f", "#dc2626", "linear-gradient(#111,#333)", "Bebas Neue", "Rubik", "none", 0),
  gazette: S("Gazette", "\u1780\u17b6\u179f\u17c2\u178f", "list", "#f4f1e8", "#fbf9f3", "#1b1b1b", "#6b665b", "#111111", "linear-gradient(#cfc7b5,#b0a68f)", "Cormorant Garamond", "Lora", "paper", 0),
  gallery: S("Gallery", "\u179c\u17b7\u1785\u17b7\u178f\u17d2\u179a\u179f\u17b6\u179b", "wall", "#ffffff", "#ffffff", "#111111", "#777777", "#111111", "linear-gradient(#eeeeee,#dddddd)", "Josefin Sans", "Inter", "none", 0),
  museum: S("Museum", "\u179f\u17b6\u179a\u1798\u1793\u17d2\u1791\u17b8\u179a", "spotlight", "#1b1b1d", "#252528", "#f5f5f5", "#a3a3a3", "#d6b36a", "linear-gradient(#3a3a3e,#1b1b1d)", "Cinzel", "Inter", "none", 1),
  studio: S("Studio", "\u179f\u17d2\u1791\u17bc\u178c\u17b8\u1799\u17c4", "grid", "#f3f4f6", "#ffffff", "#111827", "#6b7280", "#2563eb", "linear-gradient(#e5e7eb,#d1d5db)", "Space Grotesk", "Inter", "dots", 0),
  exhibit: S("Exhibit", "\u1796\u17b7\u1796\u17d0\u179a\u178e\u17cd", "carousel", "#f8f5ef", "#ffffff", "#1f1a14", "#7a7062", "#c2410c", "linear-gradient(#e7dfd2,#cdbfa9)", "DM Serif Display", "Inter", "none", 0),
  minimal: S("Minimal", "\u179f\u17b6\u1798\u1789\u17d2\u1789", "grid", "#ffffff", "#ffffff", "#111111", "#777777", "#111111", "linear-gradient(#f2f2f2,#e6e6e6)", "Inter", "Inter", "none", 0),
  nordic: S("Nordic", "\u178e\u17d0\u179a\u178c\u17b7\u1780", "shelf", "#f4f6f6", "#ffffff", "#1f2a2e", "#6a7a80", "#0f766e", "linear-gradient(#e7dccb,#cdbb9f)", "Josefin Sans", "Nunito", "none", 0),
  zen: S("Zen", "\u179f\u17c1\u1793", "list", "#f3f1ea", "#fbfaf6", "#26261f", "#77766b", "#4d7c0f", "linear-gradient(#cdbf9f,#a99a77)", "Cormorant Garamond", "Nunito", "leaves", 0),
  mono: S("Mono", "\u1781\u17d2\u1798\u17c5\u179f", "wall", "#f2f2f2", "#ffffff", "#0a0a0a", "#6b6b6b", "#0a0a0a", "linear-gradient(#0a0a0a,#2a2a2a)", "Space Grotesk", "Space Grotesk", "none", 0),
  ocean: S("Ocean", "\u179f\u1798\u17bb\u1791\u17d2\u179a", "carousel", "#eef6fb", "#ffffff", "#0c2a43", "#5a7690", "#0369a1", "linear-gradient(#7dd3fc,#0369a1)", "Josefin Sans", "Nunito", "waves", 0),
  forest: S("Forest", "\u1796\u17d2\u179a\u17c3", "shelf", "#eef3ee", "#fafcf9", "#1d2e22", "#617465", "#166534", "linear-gradient(#7a5c3a,#4a3520)", "Merriweather", "Nunito", "leaves", 0),
  desert: S("Desert", "\u179c\u17b6\u179b\u1781\u17d2\u179f\u17b6\u1785\u17cb", "stack", "#f6ead8", "#fff9f0", "#3b2a17", "#8a7357", "#c2410c", "linear-gradient(#e0b47c,#b98146)", "Josefin Sans", "Nunito", "waves", 0),
  sunset: S("Sunset", "\u1790\u17d2\u1784\u17c3\u179b\u17b7\u1785", "magazine", "#fff4ee", "#ffffff", "#3a1d14", "#91685a", "#e8590c", "linear-gradient(#fdba74,#e8590c)", "Montserrat", "Montserrat", "none", 0),
  library: S("Old library", "\u1794\u178e\u17d2\u178e\u17b6\u179b\u17d0\u1799\u1785\u17b6\u179f\u17cb", "shelf", "#2a1f17", "#3a2b1f", "#f3e7d6", "#c4ad92", "#d6a35c", "linear-gradient(#7b5232,#4a2f1b)", "Cinzel", "Lora", "grain", 1),
  archive: S("Archive", "\u1794\u178e\u17d2\u178e\u179f\u17b6\u179a", "list", "#ecebe6", "#f8f7f3", "#1f1f1c", "#6c6b63", "#475569", "linear-gradient(#bdb8a8,#9b9583)", "Courier Prime", "Inter", "paper", 0),
  scholar: S("Scholar", "\u17a2\u17d2\u1793\u1780\u1794\u17d2\u179a\u17b6\u1787\u17d2\u1789", "shelf", "#f2ede3", "#fbf8f2", "#1e2a3a", "#6b7280", "#1e3a8a", "linear-gradient(#8b5e34,#5c3b1e)", "Playfair Display", "Lora", "none", 0),
  vintage: S("Vintage", "\u1794\u17bb\u179a\u17b6\u178e", "stack", "#efe6d4", "#f8f1e3", "#3a2c1d", "#7d6d58", "#9a3412", "linear-gradient(#a98457,#76582f)", "Abril Fatface", "Lora", "paper", 0),
  sakura: S("Sakura", "\u1795\u17d2\u1780\u17b6\u179f\u17b6\u1782\u17bc\u179a\u17c9\u17b6", "carousel", "#fff5f8", "#ffffff", "#4d1d30", "#9b7083", "#e11d74", "linear-gradient(#fbcfe8,#f472b6)", "Cormorant Garamond", "Quicksand", "leaves", 0),
  espresso: S("Espresso", "\u17a2\u17c1\u179f\u1794\u17d2\u179a\u17c1\u179f\u179f\u17bc", "shelf", "#21160f", "#2e2017", "#f6ebe0", "#c1a891", "#d08c4f", "linear-gradient(#5b3a22,#2e1c10)", "DM Serif Display", "Nunito", "grain", 1),
  jungle: S("Jungle", "\u1796\u17d2\u179a\u17c3\u179f\u17d2\u179a\u17c4\u1784", "grid", "#0f2417", "#163320", "#e8f7ec", "#9cc2a6", "#4ade80", "linear-gradient(#166534,#052e16)", "Righteous", "Nunito", "leaves", 1),
  arctic: S("Arctic", "\u17a2\u17b6\u1780\u17cb\u1791\u17b7\u1780", "wall", "#f0f9ff", "#ffffff", "#0c2a3d", "#5f8195", "#0284c7", "linear-gradient(#e0f2fe,#bae6fd)", "Quicksand", "Quicksand", "dots", 0),
};
// live designs (animated background), 25 coins each ("fb_shelf_live"): fx = the colour of what moves
const X = (live, fx, en, km, layout, bg, surface, ink, muted, accent, plank, hf, bf, dark) => ({ ...S(en, km, layout, bg, surface, ink, muted, accent, plank, hf, bf, "none", dark), live, fx });
export const LIVE = {
  "snow-night": X("snow", "#ffffff", "Snowy night", "រាត្រីព្រិល", "shelf", "#0f1a2e", "#17243d", "#eef3ff", "#9fb0cc", "#7dd3fc", "linear-gradient(#46597a,#24324a)", "Cinzel", "Inter", 1),
  "snow-cabin": X("snow", "#ffffff", "Snow cabin", "ខ្ទមព្រិល", "shelf", "#2a1d15", "#3a281d", "#f6ebe0", "#c3ab95", "#f59e0b", "linear-gradient(#6b4226,#3e2414)", "Playfair Display", "Nunito", 1),
  "snow-frost": X("snow", "#9cc9e6", "Frosty morning", "ព្រឹកទឹកកក", "grid", "#eef6fb", "#ffffff", "#12324a", "#5f8195", "#0284c7", "linear-gradient(#e0f2fe,#bae6fd)", "Quicksand", "Quicksand", 0),
  "snow-pine": X("snow", "#ffffff", "Pine snow", "ព្រិលលើស្រល់", "carousel", "#11261c", "#183326", "#eaf6ee", "#9cbfa8", "#4ade80", "linear-gradient(#3f6b52,#1d3a2a)", "Merriweather", "Nunito", 1),
  "rain-city": X("rain", "#93c5fd", "Rainy city", "ទីក្រុងភ្លៀង", "list", "#151c25", "#1f2834", "#e8eef6", "#94a3b8", "#38bdf8", "linear-gradient(#475569,#1e293b)", "Space Grotesk", "Inter", 1),
  "rain-window": X("rain", "#64748b", "Rain window", "បង្អួចភ្លៀង", "grid", "#e6ebf0", "#f7f9fb", "#1e293b", "#64748b", "#0f766e", "linear-gradient(#cbd5e1,#94a3b8)", "Josefin Sans", "Inter", 0),
  "rain-cafe": X("rain", "#d6b38a", "Rainy caf\u00e9", "កាហ្វេពេលភ្លៀង", "shelf", "#24180f", "#33241a", "#f5e9dc", "#c4ab90", "#e0a96d", "linear-gradient(#6b4226,#3e2414)", "Lora", "Nunito", 1),
  "rain-neon": X("rain", "#f0abfc", "Neon rain", "ភ្លៀងនីអុង", "carousel", "#130a24", "#1d1236", "#fbe8ff", "#c4a4d6", "#e879f9", "linear-gradient(#e879f9,#7c3aed)", "Righteous", "Outfit", 1),
  "stars-galaxy": X("stars", "#ffffff", "Galaxy", "កាឡាក់ស៊ី", "spotlight", "#0b0620", "#151033", "#efeaff", "#a79fd0", "#a78bfa", "linear-gradient(#2e2366,#120b33)", "Space Grotesk", "Outfit", 1),
  "stars-observatory": X("stars", "#fef3c7", "Observatory", "ក្រុមតារា", "shelf", "#0a1328", "#121d38", "#eaf0ff", "#97a6c9", "#fbbf24", "linear-gradient(#34466e,#16213d)", "Cinzel", "Inter", 1),
  "stars-desert": X("stars", "#fde68a", "Desert night", "រាត្រីវាលខ្សាច់", "magazine", "#1a1230", "#251a40", "#fdf4e3", "#c9b48f", "#f59e0b", "linear-gradient(#5b3a1e,#2e1c0e)", "Josefin Sans", "Nunito", 1),
  "stars-gold": X("stars", "#facc15", "Golden stars", "ផ្កាយមាស", "wall", "#0a0a0a", "#161616", "#f6edd6", "#b9a98a", "#d4af37", "linear-gradient(#e7c873,#9c7a21)", "Cinzel", "Lora", 1),
  "fireflies-forest": X("fireflies", "#bef264", "Firefly forest", "ព្រៃអំពិលអំពែក", "shelf", "#0c1a12", "#14261b", "#e8f5ec", "#9cb9a6", "#a3e635", "linear-gradient(#4a3520,#2a1d10)", "Merriweather", "Nunito", 1),
  "fireflies-garden": X("fireflies", "#fde047", "Night garden", "សួនពេលយប់", "grid", "#0b1c1d", "#12292a", "#e6f6f5", "#94bdbb", "#2dd4bf", "linear-gradient(#2c5654,#143030)", "Lora", "Nunito", 1),
  "fireflies-lantern": X("fireflies", "#fdba74", "Lanterns", "គោមភ្លើង", "spotlight", "#1a0f08", "#26170c", "#fbeee0", "#cdb092", "#fb923c", "linear-gradient(#6b3d1d,#3a1f0c)", "Playfair Display", "Nunito", 1),
  "fireflies-meadow": X("fireflies", "#fef08a", "Summer meadow", "វាលស្មៅរដូវក្តៅ", "carousel", "#18200c", "#222c12", "#f2f7e4", "#b3bf94", "#d9f99d", "linear-gradient(#5c6b2e,#2f3a14)", "Josefin Sans", "Nunito", 1),
  "bubbles-ocean": X("bubbles", "#ffffff", "Ocean bubbles", "ពពុះសមុទ្រ", "carousel", "#0b4f7c", "#0f5f93", "#eaf7ff", "#a6d4ef", "#38bdf8", "linear-gradient(#7dd3fc,#0369a1)", "Comfortaa", "Nunito", 1),
  "bubbles-aqua": X("bubbles", "#0891b2", "Aqua kids", "កុមារទឹក", "stack", "#e3f8fb", "#ffffff", "#0b3536", "#4f7f80", "#06b6d4", "linear-gradient(#a5f3fc,#22d3ee)", "Fredoka", "Fredoka", 0),
  "bubbles-soda": X("bubbles", "#ec4899", "Pink soda", "សូដាផ្កាឈូក", "grid", "#fff0f6", "#ffffff", "#4a1d3a", "#9b7290", "#ec4899", "linear-gradient(#fbcfe8,#f9a8d4)", "Fredoka", "Fredoka", 0),
  "bubbles-deep": X("bubbles", "#7dd3fc", "Deep sea", "សមុទ្រជ្រៅ", "spotlight", "#04121f", "#0a1f33", "#e0f2fe", "#8fb3cc", "#22d3ee", "linear-gradient(#0c4a6e,#082f49)", "Space Grotesk", "Inter", 1),
  "aurora-north": X("aurora", "#34d399", "Northern lights", "ពន្លឺខាងជើង", "wall", "#05101c", "#0b1a2b", "#e6fff6", "#8fbfae", "#34d399", "linear-gradient(#1e3a5f,#0b1a2b)", "Outfit", "Outfit", 1),
  "aurora-borealis": X("aurora", "#a78bfa", "Borealis", "បូរ៉េអាលីស", "magazine", "#070b1e", "#10163a", "#efeaff", "#a5a3d4", "#a78bfa", "linear-gradient(#312e81,#1e1b4b)", "Abril Fatface", "Inter", 1),
  "aurora-polar": X("aurora", "#22d3ee", "Polar night", "រាត្រីប៉ូល", "shelf", "#06121e", "#0c1d2e", "#e5f6ff", "#8fb2c8", "#22d3ee", "linear-gradient(#2b4a66,#13263a)", "Cinzel", "Inter", 1),
  "aurora-dawn": X("aurora", "#f9a8d4", "Dawn glow", "ពន្លឺអរុណ", "grid", "#fdf2f8", "#ffffff", "#3b1d3a", "#8f6b8b", "#db2777", "linear-gradient(#fbcfe8,#e9d5ff)", "Quicksand", "Quicksand", 0),
  "petals-sakura": X("petals", "#f9a8d4", "Sakura", "សាគូរ៉ា", "shelf", "#fdf2f6", "#ffffff", "#4a1d32", "#9b7288", "#db2777", "linear-gradient(#e7b8c8,#c98aa1)", "Cormorant Garamond", "Nunito", 0),
  "petals-night": X("petals", "#f5d0fe", "Blossom night", "រាត្រីផ្កា", "spotlight", "#1b0b1f", "#28122e", "#fdeaff", "#c9a3d0", "#e879f9", "linear-gradient(#5b2a63,#2e1233)", "Playfair Display", "Nunito", 1),
  "petals-spring": X("petals", "#fbcfe8", "Spring", "និទាឃរដូវ", "grid", "#f3faf1", "#ffffff", "#1f3a1d", "#6c8a68", "#16a34a", "linear-gradient(#bbf7d0,#86efac)", "Josefin Sans", "Nunito", 0),
  "petals-tea": X("petals", "#fda4af", "Tea garden", "សួនតែ", "list", "#faf6ee", "#ffffff", "#2e2a20", "#7d7563", "#be123c", "linear-gradient(#e8dcc5,#cdbb98)", "Lora", "Lora", 0),
  "leaves-autumn": X("leaves", "#f97316", "Autumn", "រដូវស្លឹកឈើជ្រុះ", "shelf", "#fbf3e8", "#fffaf3", "#3a2414", "#8a6b52", "#c2410c", "linear-gradient(#b9814a,#7c4f27)", "Merriweather", "Nunito", 0),
  "leaves-maple": X("leaves", "#ef4444", "Maple", "ម៉េផល", "shelf", "#2a120c", "#3a1a12", "#fbe9e2", "#cfa595", "#f87171", "linear-gradient(#6b4226,#3e2414)", "Playfair Display", "Nunito", 1),
  "leaves-forest": X("leaves", "#65a30d", "Forest walk", "ដើរក្នុងព្រៃ", "carousel", "#eef5e9", "#ffffff", "#1d2e17", "#617458", "#4d7c0f", "linear-gradient(#a3b18a,#6b7a4f)", "Merriweather", "Nunito", 0),
  "leaves-harvest": X("leaves", "#d97706", "Harvest", "រដូវច្រូតកាត់", "stack", "#f8efdc", "#fffaf0", "#3b2a12", "#866c45", "#b45309", "linear-gradient(#d9b98a,#a98252)", "Amatic SC", "Josefin Sans", 0),
  "dust-library": X("sparkles", "#fde68a", "Old library light", "ពន្លឺបណ្ណាល័យចាស់", "shelf", "#22170f", "#30221a", "#f6e9d6", "#c9b195", "#e0a96d", "linear-gradient(#6b4226,#3e2414)", "Cinzel", "Lora", 1),
  "dust-archive": X("sparkles", "#d6b98a", "Archive", "បណ្ណសារ", "list", "#f1e8d6", "#faf4e8", "#2f2416", "#7a6a50", "#92400e", "linear-gradient(#cdb994,#a8916a)", "Courier Prime", "Lora", 0),
  "dust-golden": X("sparkles", "#facc15", "Golden hall", "សាលមាស", "spotlight", "#0f0c06", "#1b160b", "#f8eccf", "#c4b087", "#eab308", "linear-gradient(#e7c873,#9c7a21)", "Cinzel", "Cormorant Garamond", 1),
  "dust-museum": X("sparkles", "#e5e7eb", "Museum hall", "សាលសារមន្ទីរ", "magazine", "#1c1c1f", "#27272b", "#f4f4f5", "#a1a1aa", "#d6b36a", "linear-gradient(#3a3a3e,#1b1b1d)", "DM Serif Display", "Inter", 1),
  "clouds-sky": X("clouds", "#ffffff", "Blue sky", "មេឃខៀវ", "grid", "#bfe3fb", "#ffffff", "#0c2a43", "#4f7390", "#0284c7", "linear-gradient(#e0f2fe,#93c5fd)", "Comfortaa", "Nunito", 0),
  "clouds-dream": X("clouds", "#ffffff", "Dreamy", "សុបិន", "stack", "#e9defc", "#ffffff", "#2d2a4a", "#7f7a9e", "#8b5cf6", "linear-gradient(#ddd6fe,#c4b5fd)", "Quicksand", "Quicksand", 0),
  "clouds-sunset": X("clouds", "#fff1e6", "Sunset sky", "មេឃថ្ងៃលិច", "magazine", "#f7b88b", "#fff7f1", "#3a1d14", "#7d4f3f", "#e8590c", "linear-gradient(#fdba74,#e8590c)", "Montserrat", "Montserrat", 0),
  "clouds-kids": X("clouds", "#ffffff", "Cloud kids", "ពពកកុមារ", "shelf", "#c9f0fb", "#ffffff", "#0b3536", "#4f7f80", "#f97316", "linear-gradient(#fde68a,#fbbf24)", "Fredoka", "Fredoka", 0),
  "glow-candle": X("glow", "#fbbf24", "Candlelight", "ពន្លឺទៀន", "shelf", "#120b06", "#1e140c", "#f7e9d4", "#c4a886", "#f59e0b", "linear-gradient(#6b4226,#3e2414)", "Cormorant Garamond", "Lora", 1),
  "glow-reading": X("glow", "#fcd34d", "Reading room", "បន្ទប់អាន", "list", "#141a12", "#1d251a", "#eef2e6", "#a9b59a", "#d9a441", "linear-gradient(#4a3a24,#2a2014)", "Lora", "Nunito", 1),
  "glow-chapel": X("glow", "#fde68a", "Chapel", "វិហារ", "spotlight", "#0b1020", "#141a30", "#eef0fa", "#a3a9c8", "#e8c37a", "linear-gradient(#2b3150,#151a30)", "Cinzel", "Lora", 1),
  "glow-fireplace": X("glow", "#fb923c", "Fireplace", "ចើងរកាន", "shelf", "#1c0c08", "#2a130d", "#fbe6dc", "#cf9f8c", "#f97316", "linear-gradient(#6b4226,#3e2414)", "Playfair Display", "Nunito", 1),
  "rays-sunrise": X("rays", "#fde68a", "Sunrise", "ថ្ងៃរះ", "magazine", "#fff4e0", "#ffffff", "#3a2410", "#8a6a45", "#ea580c", "linear-gradient(#fed7aa,#fb923c)", "Playfair Display", "Nunito", 0),
  "rays-temple": X("rays", "#fcd34d", "Temple gold", "ប្រាសាទមាស", "grid", "#fbf3dc", "#fffbf0", "#3b2c0e", "#8a7444", "#b45309", "linear-gradient(#e7c873,#b48a2c)", "Cinzel", "Lora", 0),
  "rays-heaven": X("rays", "#e0f2fe", "Heavenly", "ឋានសួគ៌", "wall", "#f2f8ff", "#ffffff", "#0f2a44", "#5d7894", "#0369a1", "linear-gradient(#e0f2fe,#bae6fd)", "Cormorant Garamond", "Nunito", 0),
  "rays-summer": X("rays", "#fef08a", "Summer sun", "ព្រះអាទិត្យរដូវក្តៅ", "carousel", "#fffbe0", "#ffffff", "#3a3210", "#857a3f", "#ca8a04", "linear-gradient(#fde68a,#facc15)", "Fredoka", "Nunito", 0),
  "lava-lamp": X("lava", "#c026d3", "Lava lamp", "ចង្កៀងឡាវ៉ា", "grid", "#14061f", "#1f0d2e", "#fbe8ff", "#c4a4d6", "#d946ef", "linear-gradient(#a21caf,#581c87)", "Righteous", "Outfit", 1),
  "lava-retro": X("lava", "#fb923c", "Retro", "រេត្រូ", "stack", "#fdf0e0", "#fffaf2", "#3d2410", "#8a6a4a", "#ea580c", "linear-gradient(#fdba74,#f97316)", "Righteous", "Rubik", 0),
  "lava-candy": X("lava", "#f472b6", "Candy blobs", "ស្ករគ្រាប់", "grid", "#fff1f7", "#ffffff", "#4a1d3a", "#9b7290", "#db2777", "linear-gradient(#fbcfe8,#f472b6)", "Fredoka", "Fredoka", 0),
  "lava-ocean": X("lava", "#2dd4bf", "Ocean blobs", "រលកសមុទ្រ", "carousel", "#e8faf7", "#ffffff", "#0b3532", "#4f7f7a", "#0d9488", "linear-gradient(#99f6e4,#2dd4bf)", "Comfortaa", "Nunito", 0),
  "pages-storm": X("pages", "#ffffff", "Paper storm", "ព្យុះក្រដាស", "shelf", "#efe7d8", "#faf6ee", "#2d2518", "#7c705a", "#b45309", "linear-gradient(#b9814a,#7c4f27)", "Lora", "Lora", 0),
  "pages-study": X("pages", "#ffffff", "Study room", "បន្ទប់សិក្សា", "list", "#e7e9ec", "#f8f9fa", "#1f2937", "#6b7280", "#2563eb", "linear-gradient(#d1d5db,#9ca3af)", "Josefin Sans", "Inter", 0),
  "pages-scholar": X("pages", "#e2e8f0", "Scholar night", "រាត្រីអ្នកសិក្សា", "shelf", "#0f1729", "#18223a", "#edf1f8", "#9aa6c0", "#93c5fd", "linear-gradient(#3b4a6b,#1c2640)", "Cinzel", "Lora", 1),
  "pages-letters": X("pages", "#fef3c7", "Love letters", "សំបុត្រស្នេហ៍", "stack", "#e2cdaa", "#efe2c9", "#3a2b1a", "#6d5a43", "#9f1239", "linear-gradient(#a7865a,#7a5d38)", "Amatic SC", "Josefin Sans", 0),
  "grid-synth": X("synthgrid", "#f472b6", "Synthwave live", "ស៊ីនវេវផ្ទាល់", "shelf", "#1a0b2e", "#2a1145", "#fde7ff", "#c39bd3", "#f472b6", "linear-gradient(#f472b6,#7c3aed)", "Righteous", "Outfit", 1),
  "grid-cyber": X("synthgrid", "#22c55e", "Cyber grid", "ក្រឡាស៊ីបឺរ", "grid", "#050a05", "#0d160d", "#e7ffe7", "#86a886", "#22c55e", "linear-gradient(#22c55e,#14532d)", "Space Grotesk", "Space Grotesk", 1),
  "grid-arcade": X("synthgrid", "#22d3ee", "Arcade live", "អាខេដផ្ទាល់", "carousel", "#0a0f2a", "#121a40", "#e6fbff", "#8fb5c8", "#22d3ee", "linear-gradient(#22d3ee,#6366f1)", "Righteous", "Rubik", 1),
  "grid-outrun": X("synthgrid", "#fb923c", "Outrun", "អោតរ៉ាន", "magazine", "#1f0726", "#2e0d38", "#ffeef5", "#d29ab8", "#fb7185", "linear-gradient(#fb923c,#db2777)", "Bebas Neue", "Outfit", 1),
};
export const LIVE_KEYS = Object.keys(LIVE);
export const STANDARD_KEYS = Object.keys(SHELVES);
Object.assign(SHELVES, LIVE);
export const isLive = (k) => !!LIVE[k];
export const SHELF_KEYS = Object.keys(SHELVES);
export const shelfName = (k, lang) => (lang === "km" ? SHELVES[k]?.km : SHELVES[k]?.en) || k;

const LOADED = new Set(["Kantumruy Pro", "Inter"]);
export function loadFonts(list) {
  if (typeof document === "undefined") return;
  for (const f of list) {
    if (!f || LOADED.has(f)) continue;
    LOADED.add(f);
    const single = ["Bebas Neue", "Righteous", "Abril Fatface", "DM Serif Display", "Amatic SC"].includes(f);
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = `https://fonts.googleapis.com/css2?family=${f.replace(/ /g, "+")}${single ? "" : ":wght@400;600;700"}&display=swap`;
    document.head.appendChild(l);
  }
}
const fam = (f) => `'${f}', 'Kantumruy Pro', 'Battambang', system-ui, sans-serif`;
export function shelfVars(key, color) {
  const t = SHELVES[key] || SHELVES.classic;
  return { "--f-bg": t.bg, "--f-surface": t.surface, "--f-ink": t.ink, "--f-muted": t.muted, "--f-accent": color || t.accent, "--f-plank": t.plank, "--f-hf": fam(t.hf), "--f-bf": fam(t.bf) };
}
export const shelfClass = (key) => {
  const t = SHELVES[key] || SHELVES.classic;
  return `fl fl-l-${t.layout} fl-p-${t.pat} ${t.dark ? "fl-dark" : ""}`;
};
