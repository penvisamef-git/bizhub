import { qrSvg } from "../dashboard/client/menuqr/qrArt";
import { QR_DESIGNS } from "./designs";

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const FONT = "'Kantumruy Pro','Battambang','Inter',system-ui,sans-serif";
let uid = 0;

// what the QR code holds: a short link for the codes we can change later, the raw content for Wi-Fi / call / SMS
const wifiEsc = (s) => String(s || "").replace(/([\\;,:"])/g, "\\$1");
export function payloadOf(code, siteUrl) {
  if (code.type === "wifi") {
    const w = code.wifi || {};
    return `WIFI:T:${w.security === "nopass" ? "nopass" : w.security || "WPA"};S:${wifiEsc(w.ssid)};${w.security === "nopass" ? "" : `P:${wifiEsc(w.password)};`}${w.hidden ? "H:true;" : ""};`;
  }
  if (code.type === "phone") return `tel:${String(code.phone?.number || "").replace(/[^+\d]/g, "")}`;
  if (code.type === "sms") return `SMSTO:${String(code.phone?.number || "").replace(/[^+\d]/g, "")}:${code.phone?.body || ""}`;
  return `${siteUrl}/x/${code.slug || "preview"}`;
}
export const isStatic = (type) => ["wifi", "phone", "sms"].includes(type);

// one QR code in its design (shape + frame), as an SVG string
export function qrDesignSvg({ text, design = "plain", color, bg, accent, label = "", logo = "", size = 320, scanMe = "SCAN ME" }) {
  const d = QR_DESIGNS[design] || QR_DESIGNS.plain;
  const fg = color || d.color;
  const back = bg || d.bg;
  const ac = accent || d.accent;
  const word = label || scanMe;
  const id = `f${(uid += 1)}`;
  const W = size;
  const code = (px, x, y) => qrSvg({ text, style: d.style, color: fg, bg: back, accent: ac, logo, px }).replace("<svg ", `<svg x="${x}" y="${y}" `);
  const t = (s, x, y, sz, fill, weight = 800, spacing = 0) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${sz}" font-weight="${weight}" fill="${fill}"${spacing ? ` letter-spacing="${spacing}"` : ""}>${esc(s)}</text>`;
  const svg = (h, body, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}">${extra}${body}</svg>`;
  switch (d.frame) {
    case "card": {
      const c = W * 0.78;
      const h = W * (label ? 1.12 : 1);
      return svg(h, `<rect x="2" y="2" width="${W - 4}" height="${h - 4}" rx="${W * 0.08}" fill="${back}" stroke="${ac}" stroke-width="${W * 0.012}"/>${code(c, (W - c) / 2, W * 0.11)}${label ? t(label, W / 2, W * 1.0, W * 0.07, ac) : ""}`);
    }
    case "banner": {
      const c = W * 0.76;
      const h = W * 1.16;
      return svg(
        h,
        `<rect width="${W}" height="${h}" rx="${W * 0.06}" fill="${back}"/><path d="M0,${W * 0.06}a${W * 0.06},${W * 0.06} 0 0 1 ${W * 0.06},-${W * 0.06}h${W * 0.88}a${W * 0.06},${W * 0.06} 0 0 1 ${W * 0.06},${W * 0.06}v${W * 0.12}h-${W}z" fill="${ac}"/>${t(word, W / 2, W * 0.125, W * 0.075, "#fff", 800, 1)}${code(c, (W - c) / 2, W * 0.26)}`,
      );
    }
    case "pill": {
      const c = W * 0.86;
      const h = W * 1.16;
      return svg(
        h,
        `<rect width="${W}" height="${h}" rx="${W * 0.05}" fill="${back}"/>${code(c, (W - c) / 2, W * 0.05)}<rect x="${W * 0.18}" y="${W * 0.96}" width="${W * 0.64}" height="${W * 0.14}" rx="${W * 0.07}" fill="${ac}"/>${t(word, W / 2, W * 1.055, W * 0.065, "#fff", 800, 1)}`,
      );
    }
    case "circle": {
      const c = W * 0.6;
      return svg(
        W,
        `<circle cx="${W / 2}" cy="${W / 2}" r="${W / 2 - W * 0.02}" fill="${back}" stroke="${ac}" stroke-width="${W * 0.04}"/><circle cx="${W / 2}" cy="${W / 2}" r="${W / 2 - W * 0.07}" fill="none" stroke="${ac}" stroke-width="${W * 0.006}" stroke-dasharray="${W * 0.02} ${W * 0.015}"/>${code(c, (W - c) / 2, W * 0.17)}${t(word, W / 2, W * 0.88, W * 0.055, ac, 800, 2)}`,
      );
    }
    case "ticket": {
      const c = W * 0.7;
      const h = W * 1.2;
      const r = W * 0.06;
      const cut = W * 0.92;
      return svg(
        h,
        `<path d="M${r},0h${W - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${cut - 2 * r}a${r},${r} 0 0 0 0,${2 * r}v${h - cut - 2 * r}a${r},${r} 0 0 1 -${r},${r}h-${W - 2 * r}a${r},${r} 0 0 1 -${r},-${r}v-${h - cut - 2 * r}a${r},${r} 0 0 0 0,-${2 * r}v-${cut - 2 * r}a${r},${r} 0 0 1 ${r},-${r}z" fill="${ac}"/><rect x="${(W - c) / 2 - W * 0.04}" y="${W * 0.1}" width="${c + W * 0.08}" height="${c + W * 0.08}" rx="${W * 0.03}" fill="${back}"/>${code(c, (W - c) / 2, W * 0.14)}<line x1="${r * 1.5}" y1="${cut + r}" x2="${W - r * 1.5}" y2="${cut + r}" stroke="#fff" stroke-opacity=".6" stroke-width="${W * 0.008}" stroke-dasharray="${W * 0.025} ${W * 0.02}"/>${t(word, W / 2, h - W * 0.07, W * 0.07, "#fff", 800, 1)}`,
      );
    }
    case "phone": {
      const c = W * 0.62;
      const h = W * 1.3;
      return svg(
        h,
        `<rect x="${W * 0.1}" y="2" width="${W * 0.8}" height="${h - 4}" rx="${W * 0.12}" fill="${ac}"/><rect x="${W * 0.14}" y="${W * 0.08}" width="${W * 0.72}" height="${h - W * 0.16}" rx="${W * 0.08}" fill="${back}"/><rect x="${W * 0.4}" y="${W * 0.03}" width="${W * 0.2}" height="${W * 0.025}" rx="${W * 0.0125}" fill="${back}" opacity=".6"/>${code(c, (W - c) / 2, W * 0.2)}${t(word, W / 2, W * 1.0, W * 0.06, ac, 800, 1)}<rect x="${W * 0.38}" y="${h - W * 0.15}" width="${W * 0.24}" height="${W * 0.02}" rx="${W * 0.01}" fill="${ac}" opacity=".5"/>`,
      );
    }
    case "polaroid": {
      const c = W * 0.8;
      const h = W * 1.12;
      return svg(
        h,
        `<rect x="2" y="2" width="${W - 4}" height="${h - 4}" rx="${W * 0.015}" fill="#fff" stroke="#ddd" stroke-width="1" filter="url(#${id})"/>${code(c, W * 0.1, W * 0.08)}${t(word, W / 2, W * 1.03, W * 0.07, ac, 700)}`,
        `<defs><filter id="${id}" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="${W * 0.01}" stdDeviation="${W * 0.012}" flood-opacity=".2"/></filter></defs>`,
      );
    }
    case "bubble": {
      const c = W * 0.7;
      const h = W * 1.12;
      const bh = W * 0.98;
      return svg(
        h,
        `<path d="M${W * 0.07},0h${W * 0.86}a${W * 0.07},${W * 0.07} 0 0 1 ${W * 0.07},${W * 0.07}v${bh - W * 0.14}a${W * 0.07},${W * 0.07} 0 0 1 -${W * 0.07},${W * 0.07}h-${W * 0.32}l-${W * 0.1},${W * 0.12}l-${W * 0.02},-${W * 0.12}h-${W * 0.42}a${W * 0.07},${W * 0.07} 0 0 1 -${W * 0.07},-${W * 0.07}v-${bh - W * 0.14}a${W * 0.07},${W * 0.07} 0 0 1 ${W * 0.07},-${W * 0.07}z" fill="${ac}"/>${t(word, W / 2, W * 0.12, W * 0.07, "#fff", 800, 1)}<rect x="${(W - c) / 2 - W * 0.03}" y="${W * 0.17}" width="${c + W * 0.06}" height="${c + W * 0.06}" rx="${W * 0.04}" fill="${back}"/>${code(c, (W - c) / 2, W * 0.2)}`,
      );
    }
    case "corners": {
      const c = W * 0.74;
      const h = W * (label ? 1.12 : 1);
      const k = W * 0.16;
      const s = W * 0.025;
      const m = W * 0.04;
      const corner = (x, y, dx, dy) => `<path d="M${x},${y + dy * k}V${y}H${x + dx * k}" fill="none" stroke="${ac}" stroke-width="${s}" stroke-linecap="round"/>`;
      return svg(
        h,
        `<rect width="${W}" height="${h}" rx="${W * 0.04}" fill="${back}"/>${corner(m, m, 1, 1)}${corner(W - m, m, -1, 1)}${corner(m, W - m, 1, -1)}${corner(W - m, W - m, -1, -1)}${code(c, (W - c) / 2, (W - c) / 2)}${label ? t(label, W / 2, W * 1.06, W * 0.065, ac) : ""}`,
      );
    }
    default:
      return code(W, 0, 0).replace(`x="0" y="0" `, "");
  }
}
