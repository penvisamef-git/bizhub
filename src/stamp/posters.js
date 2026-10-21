import QRCode from "qrcode";
import { SC_POSTERS, SC_POSTER_PALETTES } from "./designs";
import { themeOf } from "./themes";

// Shop QR posters: "basic" (free, in the card's colours) + 100 premium = 5 layouts × 20 palettes (designs.js)
export const POSTER_KEYS = Object.keys(SC_POSTERS);
export const posterOf = (key) => SC_POSTERS[key] || SC_POSTERS.basic;
export const posterName = (key, lang) => (lang === "km" ? posterOf(key).km : posterOf(key).en);

const FONT = '"Plus Jakarta Sans", "Kantumruy Pro", system-ui, sans-serif';
const W = 1080;
const H = 1500;

// colours of a poster: its palette, or (basic) the card design's
function paletteOf(key, shop) {
  const p = posterOf(key);
  if (p.pal !== "auto" && SC_POSTER_PALETTES[p.pal]) return SC_POSTER_PALETTES[p.pal];
  const t = themeOf(shop.theme);
  const c = String(t.bg).match(/#[0-9a-fA-F]{6}/g) || ["#ffffff"];
  return { bg1: c[0], bg2: c[1] || c[0], ink: t.ink, muted: t.muted, accent: shop.color || t.accent, paper: "#ffffff" };
}
const isDark = (hex) => {
  const v = parseInt(String(hex).slice(1), 16);
  return ((v >> 16) & 255) * 0.299 + ((v >> 8) & 255) * 0.587 + (v & 255) * 0.114 < 140;
};
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
function text(g, s, x, y, size, color, weight = 800, align = "center", max = W - 120) {
  g.font = `${weight} ${size}px ${FONT}`;
  g.fillStyle = color;
  g.textAlign = align;
  let t = String(s || "");
  while (t.length > 3 && g.measureText(t).width > max) t = `${t.slice(0, -2)}…`;
  g.fillText(t, x, y);
}
function stampRow(g, cx, y, r, n, filled, color, empty) {
  const gap = r * 2.6;
  const x0 = cx - ((n - 1) * gap) / 2;
  for (let i = 0; i < n; i += 1) {
    g.beginPath();
    g.arc(x0 + i * gap, y, r, 0, Math.PI * 2);
    if (i < filled) {
      g.fillStyle = color;
      g.fill();
      g.fillStyle = "rgba(255,255,255,.9)";
      g.beginPath();
      g.arc(x0 + i * gap, y, r * 0.35, 0, Math.PI * 2);
      g.fill();
    } else {
      g.setLineDash([8, 7]);
      g.lineWidth = 4;
      g.strokeStyle = empty;
      g.stroke();
      g.setLineDash([]);
    }
  }
}

// the QR once as a canvas (thumbnails reuse it)
export async function qrCanvas(url) {
  const c = document.createElement("canvas");
  await QRCode.toCanvas(c, url, { width: 600, margin: 1, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } });
  return c;
}

// draw one poster → canvas (scale 1 = 1080 × 1500 for print, smaller for the picker)
// the default words on a poster (the owner can change each one in the Shop QR tab)
export const POSTER_TEXT = {
  title: "ប្រមូលត្រា ទទួលរង្វាន់",
  sub: "Collect stamps, get rewards",
  scan: "Scan to get your card · ស្កេនដើម្បីទទួលកាត",
  note: "No app needed · មិនចាំបាច់មានកម្មវិធី",
};

// info = what the owner changes (Shop QR tab): { title, sub, rule, scan, note, phone, address } — phone / address only when shown
export function drawPoster(key, { qr, shop, rule: ruleDefault, scale = 1, info = {} }) {
  let rule = ruleDefault;
  const c = document.createElement("canvas");
  c.width = Math.round(W * scale);
  c.height = Math.round(H * scale);
  const g = c.getContext("2d");
  g.scale(scale, scale);
  const p = paletteOf(key, shop);
  const layout = posterOf(key).layout;
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, p.bg1);
  grad.addColorStop(1, p.bg2);
  // the owner's words (Shop QR tab) — empty = the default text
  const own = (k) => String(info[k] || "").trim();
  const titleKm = own("title") || POSTER_TEXT.title;
  const titleEn = own("sub") || POSTER_TEXT.sub;
  rule = own("rule") || rule;
  const scan = own("scan") || POSTER_TEXT.scan;
  // the bottom line + phone / address
  const extra = [own("note"), info.phone && `☎ ${info.phone}`, info.address].map((v) => String(v || "").trim()).filter(Boolean).join(" · ");
  const noApp = extra || POSTER_TEXT.note;
  const name = shop.name || "";
  const accentInk = isDark(p.accent) ? "#ffffff" : "#111111";
  const qrBox = (x, y, size, radius = 40) => {
    g.fillStyle = "#ffffff";
    rr(g, x, y, size, size, radius);
    g.fill();
    const pad = size * 0.06;
    g.drawImage(qr, x + pad, y + pad, size - pad * 2, size - pad * 2);
  };

  if (layout === "band") {
    g.fillStyle = p.paper;
    g.fillRect(0, 0, W, H);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, 560);
    g.beginPath();
    g.moveTo(0, 560);
    g.quadraticCurveTo(W / 2, 680, W, 560);
    g.lineTo(W, 0);
    g.lineTo(0, 0);
    g.fill();
    text(g, name, W / 2, 150, 66, p.ink);
    text(g, titleKm, W / 2, 270, 74, p.accent === p.ink ? p.ink : p.accent);
    text(g, titleEn, W / 2, 345, 44, p.ink, 700);
    stampRow(g, W / 2, 460, 30, 5, 3, p.accent, p.muted);
    qrBox((W - 600) / 2, 620, 600, 36);
    g.strokeStyle = p.bg1;
    g.lineWidth = 6;
    rr(g, (W - 600) / 2, 620, 600, 600, 36);
    g.stroke();
    text(g, rule, W / 2, 1310, 54, "#1d1d1f");
    text(g, scan, W / 2, 1380, 34, "#6b6b70", 600);
    text(g, noApp, W / 2, 1430, extra ? 32 : 28, "#8a8a90", 600);
  } else if (layout === "frame") {
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = p.accent;
    g.lineWidth = 14;
    rr(g, 50, 50, W - 100, H - 100, 48);
    g.stroke();
    g.lineWidth = 3;
    rr(g, 80, 80, W - 160, H - 160, 36);
    g.stroke();
    for (const [x, y] of [
      [80, 80],
      [W - 80, 80],
      [80, H - 80],
      [W - 80, H - 80],
    ]) {
      g.fillStyle = p.accent;
      g.beginPath();
      g.arc(x, y, 26, 0, Math.PI * 2);
      g.fill();
    }
    text(g, name, W / 2, 200, 64, p.ink);
    text(g, titleKm, W / 2, 300, 70, p.accent);
    text(g, titleEn, W / 2, 370, 42, p.muted, 700);
    qrBox((W - 620) / 2, 440, 620, 30);
    text(g, rule, W / 2, 1180, 56, p.ink);
    text(g, scan, W / 2, 1260, 34, p.muted, 600);
    text(g, noApp, W / 2, 1310, extra ? 32 : 28, p.muted, 600);
  } else if (layout === "ticket") {
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // the ticket
    g.fillStyle = p.paper;
    rr(g, 90, 110, W - 180, H - 220, 40);
    g.fill();
    // punched holes + dashed line
    g.fillStyle = p.bg2;
    for (const x of [90, W - 90]) {
      g.beginPath();
      g.arc(x, 520, 38, 0, Math.PI * 2);
      g.fill();
    }
    g.setLineDash([16, 14]);
    g.strokeStyle = "rgba(0,0,0,.18)";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(150, 520);
    g.lineTo(W - 150, 520);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = p.accent;
    rr(g, 140, 160, W - 280, 90, 45);
    g.fill();
    text(g, "LOYALTY CARD · កាតសមាជិក", W / 2, 220, 38, accentInk, 800);
    text(g, name, W / 2, 340, 62, "#1d1d1f", 800, "center", W - 300);
    text(g, titleKm, W / 2, 430, 48, p.accent === "#ffffff" ? "#1d1d1f" : p.accent, 800, "center", W - 300);
    qrBox((W - 560) / 2, 590, 560, 24);
    text(g, rule, W / 2, 1240, 52, "#1d1d1f", 800, "center", W - 300);
    text(g, scan, W / 2, 1310, 30, "#6b6b70", 600, "center", W - 300);
    text(g, noApp, W / 2, 1356, 26, "#8a8a90", 600, "center", W - 300);
  } else if (layout === "stamps") {
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // big stamp circles in the background
    g.globalAlpha = 0.12;
    for (const [x, y, r] of [
      [120, 160, 120],
      [W - 100, 330, 160],
      [160, H - 260, 170],
      [W - 140, H - 150, 110],
    ]) {
      g.fillStyle = p.accent;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    text(g, name, W / 2, 150, 62, p.ink);
    stampRow(g, W / 2, 270, 40, 5, 4, p.accent, p.muted);
    text(g, titleKm, W / 2, 400, 72, p.ink);
    text(g, titleEn, W / 2, 470, 42, p.muted, 700);
    qrBox((W - 580) / 2, 540, 580, 44);
    g.fillStyle = p.accent;
    rr(g, 150, 1180, W - 300, 110, 55);
    g.fill();
    text(g, rule, W / 2, 1255, 50, accentInk, 800, "center", W - 340);
    text(g, scan, W / 2, 1370, 32, p.ink, 600);
    text(g, noApp, W / 2, 1420, extra ? 32 : 28, p.muted, 600);
  } else {
    // centre (and basic)
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    text(g, name, W / 2, 150, 64, p.ink);
    text(g, titleKm, W / 2, 270, 78, isDark(p.bg1) === isDark(p.accent) ? p.ink : p.accent);
    text(g, titleEn, W / 2, 345, 46, p.ink, 700);
    qrBox((W - 680) / 2, 420, 680, 40);
    text(g, rule, W / 2, 1200, 54, p.ink);
    text(g, scan, W / 2, 1275, 36, p.muted, 600);
    text(g, noApp, W / 2, 1330, extra ? 32 : 28, p.muted, 600);
  }
  text(g, "Biz Hub", W / 2, H - 30, 24, layout === "band" ? "#9a9aa0" : p.muted, 700);
  return c;
}
