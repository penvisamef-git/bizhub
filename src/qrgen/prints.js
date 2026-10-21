// Print templates (qr_print, 5 coins each, one-time). Each makes one A4 page of HTML with the QR code (SVG) and the owner's texts.
export const PRINTS = [
  { key: "tent", en: "Table tent", km: "ស្លាកលើតុ", landscape: true },
  { key: "poster", en: "A4 poster", km: "ផ្ទាំង A4" },
  { key: "poster_bold", en: "Bold poster", km: "ផ្ទាំងពណ៌ដិត" },
  { key: "a5_card", en: "A5 cards (2 per page)", km: "កាត A5 (2 ក្នុងមួយទំព័រ)" },
  { key: "stickers", en: "Square stickers (12)", km: "ស្ទីកឃ័រការ៉េ (12)" },
  { key: "round_stickers", en: "Round stickers (20)", km: "ស្ទីកឃ័រមូល (20)" },
  { key: "wifi_card", en: "Small cards (8)", km: "កាតតូច (8)" },
  { key: "badge", en: "Name badges (4)", km: "ស្លាកឈ្មោះ (4)" },
];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const FONT = "'Kantumruy Pro', 'Inter', system-ui, sans-serif";

// the page body for one template
function body(key, { svg, logo, t1, t2, t3, color, business }) {
  const L = logo ? `<img class="lg" src="${esc(logo)}" alt="">` : "";
  const T1 = esc(t1);
  const T2 = esc(t2);
  const T3 = esc(t3);
  const B = esc(business);
  switch (key) {
    case "tent": {
      const half = `<div class="half"><div class="band"></div>${L}<h1>${T1}</h1><div class="q">${svg}</div><p>${T2}</p>${T3 ? `<small>${T3}</small>` : ""}<em>${B}</em></div>`;
      return `<div class="tent"><div class="flip">${half}</div><div class="fold"></div>${half}</div>`;
    }
    case "poster":
      return `<div class="poster"><header>${L}<span>${B}</span></header><h1>${T1}</h1><p class="sub">${T2}</p><div class="q">${svg}</div>${T3 ? `<p class="note">${T3}</p>` : ""}<footer></footer></div>`;
    case "poster_bold":
      return `<div class="bold"><h1>${T1}</h1><div class="card"><div class="q">${svg}</div><p>${T2}</p></div>${T3 ? `<p class="note">${T3}</p>` : ""}<div class="who">${L}<span>${B}</span></div></div>`;
    case "a5_card": {
      const one = `<div class="a5">${L}<h1>${T1}</h1><div class="q">${svg}</div><p>${T2}</p>${T3 ? `<small>${T3}</small>` : ""}</div>`;
      return `<div class="a5s">${one}${one}</div>`;
    }
    case "stickers":
      return `<div class="grid g12">${Array.from({ length: 12 }, () => `<div class="st"><div class="q">${svg}</div><b>${T1}</b>${T2 ? `<small>${T2}</small>` : ""}</div>`).join("")}</div>`;
    case "round_stickers":
      return `<div class="grid g20">${Array.from({ length: 20 }, () => `<div class="rs"><div class="q">${svg}</div><b>${T1}</b></div>`).join("")}</div>`;
    case "wifi_card":
      return `<div class="grid g8">${Array.from({ length: 8 }, () => `<div class="wc"><div class="q">${svg}</div><div class="tx"><b>${T1}</b><small>${T2}</small>${T3 ? `<i>${T3}</i>` : ""}</div></div>`).join("")}</div>`;
    case "badge":
      return `<div class="grid g4">${Array.from({ length: 4 }, () => `<div class="bd"><div class="top">${L}<span>${B}</span></div><h1>${T1}</h1><p>${T2}</p><div class="q">${svg}</div>${T3 ? `<small>${T3}</small>` : ""}</div>`).join("")}</div>`;
    default:
      return `<div class="q">${svg}</div>`;
  }
}

const CSS = (c, landscape) => `
@page{size:A4 ${landscape ? "landscape" : "portrait"};margin:0}
*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:${FONT};color:#1d1f24;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:${landscape ? "297mm" : "210mm"};height:${landscape ? "210mm" : "297mm"};overflow:hidden;position:relative;background:#fff}
.q svg{width:100%;height:auto;display:block}
.lg{object-fit:cover;border-radius:12px}
h1,p{margin:0}
/* tent */
.tent{height:100%;display:flex;flex-direction:column}
.tent .half{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4mm;position:relative;text-align:center;padding:8mm 20mm}
.tent .flip{flex:1;display:flex;transform:rotate(180deg)}.tent .flip .half{flex:1}
.tent .fold{border-top:1px dashed #bbb}
.tent .band{position:absolute;left:0;right:0;top:0;height:9mm;background:${c}}
.tent .lg{width:16mm;height:16mm}
.tent h1{font-size:30pt;color:${c};line-height:1.1}
.tent .q{width:58mm}
.tent p{font-size:15pt}.tent small{font-size:11pt;color:#555}.tent em{font-style:normal;font-size:10pt;color:#888}
/* poster */
.poster{height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;padding:16mm 18mm}
.poster header{display:flex;align-items:center;gap:4mm;font-size:16pt;font-weight:700;color:${c};margin-bottom:12mm}
.poster .lg{width:18mm;height:18mm}
.poster h1{font-size:44pt;line-height:1.1}
.poster .sub{font-size:20pt;color:#444;margin:6mm 0 10mm}
.poster .q{width:120mm;padding:6mm;border:2mm solid ${c};border-radius:8mm}
.poster .note{margin-top:10mm;font-size:15pt;color:#555}
.poster footer{position:absolute;left:0;right:0;bottom:0;height:12mm;background:${c}}
/* bold */
.bold{height:100%;background:${c};color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:16mm;gap:8mm}
.bold h1{font-size:50pt;font-weight:900;line-height:1.05;text-transform:uppercase}
.bold .card{background:#fff;color:#1d1f24;border-radius:10mm;padding:10mm;width:140mm;display:flex;flex-direction:column;align-items:center;gap:5mm;box-shadow:0 6mm 0 rgba(0,0,0,.18)}
.bold .q{width:110mm}.bold .card p{font-size:20pt;font-weight:700}
.bold .note{font-size:16pt;opacity:.92}
.bold .who{display:flex;align-items:center;gap:4mm;font-size:15pt;font-weight:700}.bold .lg{width:16mm;height:16mm;border:1mm solid #fff}
/* a5 */
.a5s{height:100%;display:grid;grid-template-rows:1fr 1fr}
.a5{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4mm;text-align:center;padding:10mm;border-bottom:1px dashed #bbb;border-top:6mm solid ${c}}
.a5 .lg{width:14mm;height:14mm}.a5 h1{font-size:26pt;color:${c}}.a5 .q{width:70mm}.a5 p{font-size:14pt}.a5 small{color:#666;font-size:10pt}
/* grids */
.grid{display:grid;height:100%;padding:8mm;gap:4mm}
.g12{grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(4,1fr)}
.g20{grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(5,1fr)}
.g8{grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(4,1fr)}
.g4{grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,1fr)}
.st{border:0.6mm solid ${c};border-radius:5mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5mm;padding:3mm;text-align:center}
.st .q{width:42mm}.st b{font-size:11pt;color:${c}}.st small{font-size:8pt;color:#555}
.rs{border-radius:50%;border:0.8mm solid ${c};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm;aspect-ratio:1;margin:auto;width:100%;max-width:46mm}
.rs .q{width:58%}.rs b{font-size:7.5pt;color:${c};max-width:80%;text-align:center;line-height:1.1}
.wc{border:0.5mm dashed #bbb;border-radius:3mm;display:flex;align-items:center;gap:5mm;padding:5mm;border-left:4mm solid ${c}}
.wc .q{width:38mm;flex:none}.wc .tx{display:flex;flex-direction:column;gap:1.5mm}.wc b{font-size:15pt;color:${c}}.wc small{font-size:10pt}.wc i{font-style:normal;font-size:9pt;color:#666}
.bd{border:0.5mm solid #ddd;border-radius:6mm;overflow:hidden;display:flex;flex-direction:column;align-items:center;text-align:center;gap:3mm;padding-bottom:6mm}
.bd .top{width:100%;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;gap:3mm;padding:5mm;font-weight:700;font-size:12pt}
.bd .lg{width:11mm;height:11mm;border:0.6mm solid #fff}
.bd h1{font-size:24pt;margin-top:4mm}.bd p{font-size:13pt;color:${c};font-weight:700}.bd .q{width:44mm}.bd small{font-size:9pt;color:#666}
`;

// the full printable page
export function printHtml(key, opts) {
  const t = PRINTS.find((x) => x.key === key) || PRINTS[0];
  const color = /^#[0-9a-f]{6}$/i.test(opts.color || "") ? opts.color : "#E0581A";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(opts.t1 || t.en)}</title><link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700;800;900&display=swap" rel="stylesheet"><style>${CSS(color, t.landscape)}</style></head><body><div class="page">${body(key, { ...opts, color })}</div></body></html>`;
}
