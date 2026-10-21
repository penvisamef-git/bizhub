import QRCode from "qrcode";
import { PUBLIC_SITE_URL } from "../config";

// Helpers for top-up cards (phone-card style: QR + 12-digit code)

export const formatCode = (code) => String(code || "").replace(/(\d{4})(?=\d)/g, "$1 ");
export const redeemLink = (code) => `${PUBLIC_SITE_URL}/app/wallet?redeem=${code}`;

// Keep only digits, max 12, show as "1234 5678 9012" while typing
export function typeCode(value) {
  const text = String(value || "");
  const fromLink = text.match(/redeem=(\d{12})/);
  return formatCode((fromLink ? fromLink[1] : text).replace(/\D/g, "").slice(0, 12));
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const FONT = '"Plus Jakarta Sans", "Kantumruy Pro", system-ui, sans-serif';
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

/**
 * Draws the card as a PNG (portrait, good for sending in Telegram).
 * Returns a data URL.
 */
export async function drawCardImage(card) {
  const W = 720;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (document.fonts?.ready) await document.fonts.ready;

  // background + card
  ctx.fillStyle = "#eceef2";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.shadowColor = "rgba(22,23,27,0.14)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  roundRect(ctx, 40, 40, W - 80, H - 80, 44);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  // orange header
  ctx.save();
  roundRect(ctx, 40, 40, W - 80, H - 80, 44);
  ctx.clip();
  const grad = ctx.createLinearGradient(40, 40, W - 40, 400);
  grad.addColorStop(0, "#e0581a");
  grad.addColorStop(0.55, "#e8701a");
  grad.addColorStop(1, "#e08a1a");
  ctx.fillStyle = grad;
  ctx.fillRect(40, 40, W - 80, 330);
  // soft rings
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 36;
  ctx.beginPath();
  ctx.arc(W - 70, 70, 130, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const logo = await loadImage("/bizhub-logo-white.svg");
  if (logo) {
    const lh = 46;
    const lw = (logo.width / logo.height) * lh || 160;
    ctx.drawImage(logo, 84, 84, lw, lh);
  } else {
    ctx.fillStyle = "#fff";
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText("BizHub", 84, 124);
  }
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `700 22px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("TOP-UP CARD", W - 84, 118);
  ctx.textAlign = "left";

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 104px ${FONT}`;
  ctx.fillText(fmt(card.amount), 84, 280);
  const amountWidth = ctx.measureText(fmt(card.amount)).width;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText("coins", 84 + amountWidth + 16, 280);
  ctx.font = `600 22px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText("កាក់ BizHub", 86, 326);

  // QR
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, redeemLink(card.code), { width: 400, margin: 1, errorCorrectionLevel: "M", color: { dark: "#16171b", light: "#ffffff" } });
  const qx = (W - 400) / 2;
  const qy = 400;
  ctx.save();
  roundRect(ctx, qx - 18, qy - 18, 436, 436, 28);
  ctx.strokeStyle = "#e6e8ee";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  ctx.drawImage(qr, qx, qy, 400, 400);

  // code
  ctx.textAlign = "center";
  ctx.fillStyle = "#6a6e7a";
  ctx.font = `700 20px ${FONT}`;
  ctx.fillText("CODE · លេខកូដ", W / 2, 872);
  ctx.fillStyle = "#16171b";
  ctx.font = `800 54px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`;
  ctx.fillText(formatCode(card.code), W / 2, 936);

  // footer
  ctx.fillStyle = "#6a6e7a";
  ctx.font = `600 17px ${FONT}`;
  ctx.fillText("Scan with your phone camera, or open BizHub → Wallet → enter the code", W / 2, 980);
  ctx.font = `600 19px ${FONT}`;
  const expiry = card.expires_at ? `Valid until ${new Date(card.expires_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : "";
  ctx.fillText(["ស្កេន ឬបញ្ចូលលេខកូដ ក្នុង BizHub", expiry].filter(Boolean).join("  ·  "), W / 2, 1010);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Share the image (Telegram etc.) on phones that support it; returns false if not possible
export async function shareCardImage(dataUrl, card) {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `bizhub-card-${card.code.slice(-4)}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "BizHub top-up card", text: `${fmt(card.amount)} coins · ${formatCode(card.code)}` });
      return true;
    }
  } catch {
    /* cancelled */
  }
  return false;
}

// Print several cards (2 per row) in a new window
export function printCards(images) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><title>BizHub top-up cards</title>
<style>body{margin:16px;font-family:sans-serif}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
img{width:100%;break-inside:avoid;border-radius:12px}@media print{body{margin:0}}</style></head>
<body><div class="grid">${images.map((src) => `<img src="${src}">`).join("")}</div>
<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  w.document.close();
  return true;
}
