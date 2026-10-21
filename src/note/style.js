// Style pack (note_style): block styles, callout / divider / sticker blocks, note paper.
// block.style = { color, bg, size, align, bold, italic } · callout = { t: "callout", text, icon, style.bg } · divider · sticker = { sticker, style.size }
export const STYLE_COLORS = ["red", "orange", "amber", "green", "teal", "blue", "indigo", "purple", "pink", "gray"];
export const TEXT_SIZES = ["sm", "md", "lg", "xl"];
export const STICKER_SIZES = ["sm", "md", "lg"];
export const ALIGNS = ["left", "center", "right"];
export const PAPERS = ["plain", "lined", "grid", "dots", "kraft", "night"];
export const STYLE_TYPES = ["callout", "divider", "sticker"]; // block types that need the pack
// colour dots (shown in pickers)
export const SWATCH = { red: "#e5484d", orange: "#f76b15", amber: "#f5a524", green: "#30a46c", teal: "#12a594", blue: "#2f6feb", indigo: "#5b5bd6", purple: "#8e4ec6", pink: "#d6409f", gray: "#7c818d" };

const clean = (s = {}) => {
  const o = {};
  if (STYLE_COLORS.includes(s.color)) o.color = s.color;
  if (STYLE_COLORS.includes(s.bg)) o.bg = s.bg;
  if (TEXT_SIZES.includes(s.size)) o.size = s.size;
  if (ALIGNS.includes(s.align) && s.align !== "left") o.align = s.align;
  if (s.bold) o.bold = true;
  if (s.italic) o.italic = true;
  return o;
};
export const cleanStyle = (s) => (s && typeof s === "object" ? clean(s) : {});
// anything from the pack in this block?
export const hasStyle = (b) => !!b && (STYLE_TYPES.includes(b.t) || Object.keys(cleanStyle(b.style)).filter((k) => !(k === "size" && b.style.size === "md")).length > 0);
// css classes for one block
export function styleClass(b) {
  const s = cleanStyle(b?.style);
  const out = [];
  if (s.color) out.push(`nb-c-${s.color}`);
  if (s.bg) out.push(`nb-bg-${s.bg}`);
  if (s.size && s.size !== "md") out.push(`nb-s-${s.size}`);
  if (s.align) out.push(`nb-a-${s.align}`);
  if (s.bold) out.push("nb-bold");
  if (s.italic) out.push("nb-italic");
  return out.join(" ");
}
export const paperOf = (note) => (PAPERS.includes(note?.paper) ? note.paper : "plain");
