// Menu QR — the QR code itself, drawn as SVG in 23 styles (1 free: "classic").
// qrSvg({ text, style, color, bg, accent, logo, size }) → an <svg> string (also used for PNG download).
import QRCode from "qrcode";

// dot = body modules · eye = the 3 corner squares · grad = colour fade · eyeColor = eyes in the accent colour
export const QR_STYLES = {
  classic: { dot: "square", eye: "square", en: "Classic", km: "បុរាណ" },
  dots: { dot: "dot", eye: "rounded", en: "Dots", km: "ចំណុច" },
  rounded: { dot: "rounded", eye: "rounded", en: "Rounded", km: "ជ្រុងមូល" },
  diamond: { dot: "diamond", eye: "square", en: "Diamond", km: "ពេជ្រ" },
  vbars: { dot: "vbar", eye: "rounded", en: "Vertical lines", km: "បន្ទាត់ឈរ" },
  hbars: { dot: "hbar", eye: "rounded", en: "Horizontal lines", km: "បន្ទាត់ដេក" },
  tiny: { dot: "tiny", eye: "square", en: "Tiny dots", km: "ចំណុចតូច" },
  fluid: { dot: "fluid", eye: "rounded", en: "Fluid", km: "រលូន" },
  bubble: { dot: "bubble", eye: "circle", en: "Bubbles", km: "ពពុះ" },
  star: { dot: "star", eye: "leaf", en: "Stars", km: "ផ្កាយ" },
  heart: { dot: "heart", eye: "rounded", en: "Hearts", km: "បេះដូង" },
  plus: { dot: "plus", eye: "square", en: "Plus", km: "បូក" },
  leaf: { dot: "rounded", eye: "leaf", en: "Leaf", km: "ស្លឹក" },
  circle: { dot: "dot", eye: "circle", en: "Circles", km: "រង្វង់" },
  sunset: { dot: "dot", eye: "circle", grad: ["#f97316", "#db2777"], en: "Sunset fade", km: "ពណ៌ថ្ងៃលិច" },
  ocean: { dot: "rounded", eye: "rounded", grad: ["#0ea5e9", "#1e3a8a"], en: "Ocean fade", km: "ពណ៌សមុទ្រ" },
  mint: { dot: "fluid", eye: "leaf", grad: ["#10b981", "#0f766e"], en: "Mint fade", km: "ពណ៌មីន" },
  berry: { dot: "diamond", eye: "leaf", grad: ["#86198f", "#be123c"], en: "Berry fade", km: "ពណ៌បឺរី" },
  twotone: { dot: "square", eye: "rounded", eyeColor: true, en: "Two colours", km: "ពីរពណ៌" },
  outline: { dot: "outline", eye: "square", en: "Stitch", km: "ថ្នេរ" },
  mosaic: { dot: "mosaic", eye: "square", en: "Mosaic", km: "ម៉ូសាអ៊ិច" },
  pixel: { dot: "pixel", eye: "rounded", eyeColor: true, en: "Pixel", km: "ភីកសែល" },
  royal: { dot: "rounded", eye: "leaf", grad: ["#713f12", "#b45309"], en: "Royal gold", km: "មាសរាជ" },
};
export const QR_KEYS = Object.keys(QR_STYLES);
export const qrStyleName = (k, lang) => (lang === "km" ? QR_STYLES[k]?.km : QR_STYLES[k]?.en) || k;

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const hash = (r, c) => ((r * 73856093) ^ (c * 19349663)) >>> 0;

function eyePaths(x, y, kind) {
  // outer ring 7×7 (1 thick) + inner 3×3, in module units
  const ring = {
    square: `M${x},${y}h7v7h-7z M${x + 1},${y + 1}v5h5v-5z`,
    rounded: `M${x + 2},${y}h3a2,2 0 0 1 2,2v3a2,2 0 0 1 -2,2h-3a2,2 0 0 1 -2,-2v-3a2,2 0 0 1 2,-2z M${x + 2.2},${y + 1}a1.2,1.2 0 0 0 -1.2,1.2v2.6a1.2,1.2 0 0 0 1.2,1.2h2.6a1.2,1.2 0 0 0 1.2,-1.2v-2.6a1.2,1.2 0 0 0 -1.2,-1.2z`,
    circle: `M${x + 3.5},${y}a3.5,3.5 0 1 1 0,7a3.5,3.5 0 1 1 0,-7z M${x + 3.5},${y + 1}a2.5,2.5 0 1 0 0,5a2.5,2.5 0 1 0 0,-5z`,
    leaf: `M${x + 3},${y}h4v4a3,3 0 0 1 -3,3h-4v-4a3,3 0 0 1 3,-3z M${x + 3},${y + 1}a2,2 0 0 0 -2,2v3h3a2,2 0 0 0 2,-2v-3z`,
  }[kind];
  const ball = {
    square: `M${x + 2},${y + 2}h3v3h-3z`,
    rounded: `M${x + 2.8},${y + 2}h1.4a0.8,0.8 0 0 1 0.8,0.8v1.4a0.8,0.8 0 0 1 -0.8,0.8h-1.4a0.8,0.8 0 0 1 -0.8,-0.8v-1.4a0.8,0.8 0 0 1 0.8,-0.8z`,
    circle: `M${x + 3.5},${y + 2}a1.5,1.5 0 1 1 0,3a1.5,1.5 0 1 1 0,-3z`,
    leaf: `M${x + 3.4},${y + 2}h1.6v1.6a1.4,1.4 0 0 1 -1.4,1.4h-1.6v-1.6a1.4,1.4 0 0 1 1.4,-1.4z`,
  }[kind];
  return { ring, ball };
}

function moduleShape(kind, x, y, on) {
  // on(dr, dc) → is the neighbour dark
  switch (kind) {
    case "dot":
      return `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.46"/>`;
    case "tiny":
      return `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.4"/>`;
    case "bubble": {
      const r = 0.4 + (hash(x, y) % 5) * 0.03;
      return `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="${r.toFixed(3)}"/>`;
    }
    case "rounded":
      return `<rect x="${x + 0.06}" y="${y + 0.06}" width="0.88" height="0.88" rx="0.3"/>`;
    case "pixel":
      return `<rect x="${x + 0.1}" y="${y + 0.1}" width="0.8" height="0.8"/>`;
    case "outline": {
      // "stitch": a little X in each square (the middle is dark, so it scans)
      const a = 0.12,
        t = 0.3;
      return `<path d="M${x + a},${y + a + t}l${t},-${t}l${1 - 2 * a - t},${1 - 2 * a - t}l-${t},${t}z"/><path d="M${x + 1 - a},${y + a + t}l-${t},-${t}l-${1 - 2 * a - t},${1 - 2 * a - t}l${t},${t}z"/>`;
    }
    case "diamond":
      return `<path d="M${x + 0.5},${y - 0.12}L${x + 1.12},${y + 0.5}L${x + 0.5},${y + 1.12}L${x - 0.12},${y + 0.5}z"/>`;
    case "plus":
      return `<path d="M${x + 0.25},${y}h0.5v0.25h0.25v0.5h-0.25v0.25h-0.5v-0.25h-0.25v-0.5h0.25z"/>`;
    case "star": {
      const cx = x + 0.5,
        cy = y + 0.5;
      let d = "";
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.34 : 0.62;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        d += `${i ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(3)},${(cy + r * Math.sin(a)).toFixed(3)}`;
      }
      return `<path d="${d}z"/>`;
    }
    case "heart":
      return `<path d="M${x + 0.5},${y + 1.05}C${x - 0.05},${y + 0.7} ${x - 0.12},${y + 0.35} ${x + 0.05},${y + 0.12}C${x + 0.22},${y - 0.08} ${x + 0.44},${y} ${x + 0.5},${y + 0.2}C${x + 0.56},${y} ${x + 0.78},${y - 0.08} ${x + 0.95},${y + 0.12}C${x + 1.12},${y + 0.35} ${x + 1.05},${y + 0.7} ${x + 0.5},${y + 1.05}z"/>`;
    case "vbar": {
      const up = on(-1, 0),
        down = on(1, 0);
      return `<rect x="${x + 0.07}" y="${y + (up ? 0 : 0.06)}" width="0.86" height="${1 - (up ? 0 : 0.06) - (down ? 0 : 0.06)}" rx="${up || down ? 0 : 0.43}"/>`;
    }
    case "hbar": {
      const l = on(0, -1),
        r = on(0, 1);
      return `<rect x="${x + (l ? 0 : 0.06)}" y="${y + 0.07}" width="${1 - (l ? 0 : 0.06) - (r ? 0 : 0.06)}" height="0.86" rx="${l || r ? 0 : 0.43}"/>`;
    }
    case "fluid": {
      // a dot + bridges to the right / down neighbours = a liquid look
      let s = `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.5"/>`;
      if (on(0, 1)) s += `<rect x="${x + 0.5}" y="${y}" width="1" height="1"/>`;
      if (on(1, 0)) s += `<rect x="${x}" y="${y + 0.5}" width="1" height="1"/>`;
      return s;
    }
    case "mosaic": {
      const k = hash(x, y) % 3;
      const m = [0, 0.1, 0.2][k];
      return `<rect x="${x + m}" y="${y + m}" width="${1 - 2 * m}" height="${1 - 2 * m}" rx="${k === 2 ? 0.15 : 0}"/>`;
    }
    default:
      return `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;
  }
}

// the code alone, as an SVG string (viewBox in modules, quiet zone 2)
// centres of the small "alignment" squares (kept solid so every style still scans)
function alignCentres(version) {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = size === 145 ? 26 : Math.ceil((size - 13) / (2 * count - 2)) * 2;
  const pos = [size - 7];
  for (let i = 1; i < count - 1; i++) pos[i] = pos[i - 1] - step;
  pos.push(6);
  pos.reverse();
  const out = [];
  const last = pos.length - 1;
  for (let i = 0; i < pos.length; i++)
    for (let j = 0; j < pos.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      out.push([pos[i], pos[j]]);
    }
  return out;
}
let uid = 0;
export function qrSvg({ text, style = "classic", color = "#111111", bg = "#ffffff", accent = "#E0581A", logo = "", px = 512 }) {
  const gid = `qg${(uid += 1)}`;
  const st = (style && typeof style === "object" ? style : QR_STYLES[style]) || QR_STYLES.classic; // a key, or { dot, eye, grad, eyeColor }
  const qr = QRCode.create(text || " ", { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const get = (r, c) => r >= 0 && c >= 0 && r < n && c < n && qr.modules.get(r, c);
  const aligns = alignCentres(qr.version);
  const isAlign = (r, c) => aligns.some(([ar, ac]) => Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2);
  const isEye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7) || isAlign(r, c);
  // the middle stays clear for the logo
  const hole = logo ? Math.ceil(n * 0.24) | 1 : 0;
  const h0 = Math.floor((n - hole) / 2);
  const inHole = (r, c) => hole && r >= h0 - 1 && r <= h0 + hole && c >= h0 - 1 && c <= h0 + hole;
  let body = "";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (!get(r, c) || isEye(r, c) || inHole(r, c)) continue;
      body += moduleShape(st.dot, c, r, (dr, dc) => get(r + dr, c + dc) && !isEye(r + dr, c + dc) && !inHole(r + dr, c + dc));
    }
  const q = 2;
  const size = n + q * 2;
  const fill = st.grad ? `url(#${gid})` : color;
  const eyeFill = st.eyeColor ? accent : fill;
  let eyes = "";
  for (const [ex, ey] of [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ]) {
    const { ring, ball } = eyePaths(ex, ey, st.eye);
    eyes += `<path d="${ring}" fill-rule="evenodd"/><path d="${ball}"/>`;
  }
  const round = st.eye !== "square";
  for (const [ar, ac] of aligns) {
    const x = ac - 2,
      y = ar - 2;
    eyes += round
      ? `<path d="M${x + 1.2},${y}h2.6a1.2,1.2 0 0 1 1.2,1.2v2.6a1.2,1.2 0 0 1 -1.2,1.2h-2.6a1.2,1.2 0 0 1 -1.2,-1.2v-2.6a1.2,1.2 0 0 1 1.2,-1.2z M${x + 1.4},${y + 1}a0.4,0.4 0 0 0 -0.4,0.4v2.2a0.4,0.4 0 0 0 0.4,0.4h2.2a0.4,0.4 0 0 0 0.4,-0.4v-2.2a0.4,0.4 0 0 0 -0.4,-0.4z" fill-rule="evenodd"/><circle cx="${ac + 0.5}" cy="${ar + 0.5}" r="0.55"/>`
      : `<path d="M${x},${y}h5v5h-5z M${x + 1},${y + 1}v3h3v-3z" fill-rule="evenodd"/><rect x="${ac}" y="${ar}" width="1" height="1"/>`;
  }
  const lw = hole + 1;
  const logoTag = logo
    ? `<rect x="${h0 - 0.5}" y="${h0 - 0.5}" width="${lw}" height="${lw}" rx="${lw * 0.22}" fill="${bg}"/><image href="${esc(logo)}" x="${h0}" y="${h0}" width="${lw - 1}" height="${lw - 1}" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-q} ${-q} ${size} ${size}" width="${px}" height="${px}" shape-rendering="geometricPrecision">${st.grad ? `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${st.grad[0]}"/><stop offset="1" stop-color="${st.grad[1]}"/></linearGradient></defs>` : ""}<rect x="${-q}" y="${-q}" width="${size}" height="${size}" fill="${bg}"/><g fill="${fill}" stroke="${fill}" stroke-width="0" class="b">${body.replace(/class="st"/g, `stroke="${fill}"`).replace(/class="lt"/g, `stroke="${bg}"`)}</g><g fill="${eyeFill}">${eyes}</g>${logoTag}</svg>`;
}

// the printable card: colour band + logo + name, header, the code, footer + info line
export function qrCardSvg({ text, style, color, bg, accent = "#E0581A", logo = "", name = "", header = "", footer = "", info = "", width = 600 }) {
  const w = width;
  const h = Math.round(w * (header ? 1.34 : 1.28));
  const band = h * 0.22;
  const codePx = Math.round(w * 0.66);
  const codeY = Math.round(band + (header ? h * 0.075 : h * 0.04));
  const code = qrSvg({ text, style, color, bg, accent, logo, px: codePx }).replace("<svg ", `<svg x="${Math.round((w - codePx) / 2)}" y="${codeY}" `);
  const below = codeY + codePx;
  const t = (s, y, sz, weight, fillc) =>
    s ? `<text x="${w / 2}" y="${y.toFixed(1)}" text-anchor="middle" font-family="'Kantumruy Pro','Battambang','Inter',sans-serif" font-size="${sz.toFixed(1)}" font-weight="${weight}" fill="${fillc}">${esc(s)}</text>` : "";
  const r = w * 0.075;
  const cy = band * (name ? 0.42 : 0.5);
  const lc = `lc${(uid += 1)}`;
  const logoTag = logo
    ? `<circle cx="${w / 2}" cy="${cy}" r="${r}" fill="#fff"/><clipPath id="${lc}"><circle cx="${w / 2}" cy="${cy}" r="${r * 0.9}"/></clipPath><image href="${esc(logo)}" x="${w / 2 - r * 0.9}" y="${cy - r * 0.9}" width="${r * 1.8}" height="${r * 1.8}" clip-path="url(#${lc})" preserveAspectRatio="xMidYMid slice"/>`
    : "";
  const rad = w * 0.05;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${rad}" fill="#fff"/><path d="M0,${rad}a${rad},${rad} 0 0 1 ${rad},-${rad}h${w - 2 * rad}a${rad},${rad} 0 0 1 ${rad},${rad}v${band - rad}h-${w}z" fill="${accent}"/>${logoTag}${t(name, logo ? band * 0.86 : band * 0.6, w * 0.056, 800, "#fff")}${t(header, band + h * 0.055, w * 0.052, 800, "#111")}${code}${t(footer, below + w * 0.085, w * 0.044, 700, "#111")}${t(info, below + w * 0.145, w * 0.033, 500, "#555")}</svg>`;
}

// SVG string → PNG download (logo fetched into the SVG first so the canvas stays clean)
export async function downloadPng(svg, file, scale = 2) {
  let s = svg;
  const hrefs = [...new Set([...s.matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&")))];
  for (const u of hrefs) {
    try {
      const blob = await (await fetch(u, { mode: "cors" })).blob();
      const data = await new Promise((ok) => {
        const fr = new FileReader();
        fr.onload = () => ok(fr.result);
        fr.readAsDataURL(blob);
      });
      s = s.split(esc(u)).join(data);
    } catch {
      /* keep the link: the picture may be missing in the PNG */
    }
  }
  const img = new Image();
  const url = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" }));
  await new Promise((ok, bad) => {
    img.onload = ok;
    img.onerror = bad;
    img.src = url;
  });
  const c = document.createElement("canvas");
  c.width = img.width * scale;
  c.height = img.height * scale;
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = file;
  a.click();
}
