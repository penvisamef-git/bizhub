// Read a KHQR / ABA QR picture in the browser: the amount and currency written inside the QR (EMV tags 54 and 53).
// Used by the super admin's "QR with the amount already in it" so the amount fills in by itself.
const CUR = { 840: "USD", 116: "KHR" };

function tagsOf(s) {
  const t = {};
  let i = 0;
  while (i + 4 <= s.length) {
    const id = s.slice(i, i + 2);
    const n = Number(s.slice(i + 2, i + 4));
    if (!Number.isFinite(n)) break;
    t[id] = s.slice(i + 4, i + 4 + n);
    i += 4 + n;
  }
  return t;
}

// → { found: bool, amount: number|null, currency: "USD"|"KHR"|"" }
export async function readKhqr(file) {
  const { default: jsQR } = await import("jsqr");
  const bmp = await createImageBitmap(file);
  // try the picture as it is, then smaller (big posters read faster and often better smaller)
  for (const max of [1400, 900, 2200]) {
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k);
    const h = Math.round(bmp.height * k);
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    cx.drawImage(bmp, 0, 0, w, h);
    const r = jsQR(cx.getImageData(0, 0, w, h).data, w, h);
    if (r?.data) {
      const t = tagsOf(r.data);
      const amount = t["54"] ? Number(t["54"]) : null;
      return { found: true, amount: Number.isFinite(amount) && amount > 0 ? amount : null, currency: CUR[t["53"]] || "" };
    }
  }
  return { found: false, amount: null, currency: "" };
}
