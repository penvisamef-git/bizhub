// Draw a barcode as SVG (no library): EAN-13 / UPC-A / EAN-8 for digits, Code 128 for everything else.
// Used by the label printing (mart_labels).
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export const ean13Check = (d12) => {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d12[i]) * (i % 2 ? 3 : 1);
  return String((10 - (sum % 10)) % 10);
};
const ean8Check = (d7) => {
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += Number(d7[i]) * (i % 2 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
};

function ean13Bits(code) {
  const first = Number(code[0]);
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += (PARITY[first][i - 1] === "L" ? L : G)[Number(code[i])];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += R[Number(code[i])];
  return bits + "101";
}
function ean8Bits(code) {
  let bits = "101";
  for (let i = 0; i < 4; i++) bits += L[Number(code[i])];
  bits += "01010";
  for (let i = 4; i < 8; i++) bits += R[Number(code[i])];
  return bits + "101";
}

// Code 128 (subsets B and C) — widths of bars/spaces for values 0..106
const C128 =
  "212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232".split(
    " ",
  );
function code128Bits(text) {
  const vals = [];
  const digitsOnly = /^\d+$/.test(text) && text.length >= 4 && text.length % 2 === 0;
  if (digitsOnly) {
    vals.push(105); // start C
    for (let i = 0; i < text.length; i += 2) vals.push(Number(text.slice(i, i + 2)));
  } else {
    vals.push(104); // start B
    for (const ch of text) {
      const c = ch.charCodeAt(0);
      if (c < 32 || c > 126) return null;
      vals.push(c - 32);
    }
  }
  let sum = vals[0];
  for (let i = 1; i < vals.length; i++) sum += vals[i] * i;
  vals.push(sum % 103);
  let bits = "";
  for (const v of vals) {
    let bar = true;
    for (const w of C128[v]) {
      bits += (bar ? "1" : "0").repeat(Number(w));
      bar = !bar;
    }
  }
  return bits + "1100011101011"; // stop
}

// bits for any code; null when it can't be drawn
export function barcodeBits(raw) {
  const code = String(raw || "").trim();
  if (!code) return null;
  if (/^\d{13}$/.test(code) && ean13Check(code.slice(0, 12)) === code[12]) return ean13Bits(code);
  if (/^\d{12}$/.test(code)) {
    const c = `0${code}`;
    if (ean13Check(c.slice(0, 12)) === c[12]) return ean13Bits(c); // UPC-A
  }
  if (/^\d{8}$/.test(code) && ean8Check(code.slice(0, 7)) === code[7]) return ean8Bits(code);
  return code128Bits(code);
}

// one barcode as an <svg> string (white background, black bars, the digits under)
// ratio: bar height ÷ full width (e.g. 0.4 = tall bars for a shelf label); height: bar height in bar units
export function barcodeSvg(code, { height, ratio = 0.32, text = true } = {}) {
  const bits = barcodeBits(code);
  if (!bits) return null;
  const quiet = 6;
  const w = bits.length + quiet * 2;
  height = height || Math.max(10, Math.round(w * ratio));
  const fs = Math.round(w * 0.075 * 10) / 10; // digits grow with the barcode
  const th = text ? fs + 1 : 0;
  let x = quiet;
  let rects = "";
  let i = 0;
  while (i < bits.length) {
    if (bits[i] === "1") {
      let n = 1;
      while (bits[i + n] === "1") n++;
      rects += `<rect x="${x}" y="0" width="${n}" height="${height}"/>`;
      x += n;
      i += n;
    } else {
      x += 1;
      i += 1;
    }
  }
  const label = text
    ? `<text x="${w / 2}" y="${height + fs}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${fs}" letter-spacing="${String(code).length > 14 ? 0 : fs * 0.18}">${String(code).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${height + th}" preserveAspectRatio="xMidYMid meet" fill="#000">${rects}${label}</svg>`;
}
