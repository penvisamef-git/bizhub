import { useMemo, useState } from "react";
import { Barcode, Minus, Plus, Printer, Search, Wand2 } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { barcodeSvg } from "../../../pos/mart/barcode";
import { money } from "./text";

const SIZES = [
  ["40x30", 40, 30],
  ["50x30", 50, 30],
  ["58x40", 58, 40],
];
const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// print barcode labels on label-roll paper: one label per page
function labelsHtml({ jobs, shop, size, showPrice, showShop, cur }) {
  const [, W, H] = SIZES.find(([k]) => k === size) || SIZES[0];
  const pad = 2;
  const nameSize = H >= 40 ? 3.6 : 3.1;
  const pages = [];
  for (const j of jobs) {
    const svg = barcodeSvg(j.barcode, { ratio: (H * (H >= 40 ? 0.42 : 0.36)) / (W - pad * 2) });
    if (!svg) continue;
    const label = `<div class="lb">
${showShop && shop.name ? `<div class="s">${esc(shop.name)}</div>` : ""}
<div class="n">${esc(j.name)}</div>
<div class="bc">${svg}</div>
${showPrice ? `<div class="p">${esc(money(j.price, cur))}</div>` : ""}
</div>`;
    for (let i = 0; i < j.qty; i++) pages.push(label);
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>labels</title><style>
@page{size:${W}mm ${H}mm;margin:0}
body{margin:0;font-family:"Kantumruy Pro",system-ui,sans-serif;color:#000}
.lb{width:${W}mm;height:${H}mm;box-sizing:border-box;padding:${pad}mm;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;overflow:hidden;page-break-after:always}
.s{font-size:${nameSize - 0.8}mm;line-height:1.1;color:#000;white-space:nowrap;overflow:hidden;max-width:100%}
.n{font-size:${nameSize}mm;font-weight:700;line-height:1.15;max-height:${nameSize * 2.4}mm;overflow:hidden}
.bc{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center}
.bc svg{width:${W - pad * 2}mm;height:auto;max-height:100%}
.p{font-size:${H >= 40 ? 5 : 4.2}mm;font-weight:800;line-height:1}
</style></head><body>${pages.join("")}</body></html>`;
}

export function LabelsModal({ ctx, products, onClose, onChanged }) {
  const { m, cur } = ctx;
  const shop = ctx.shop;
  const [qty, setQty] = useState({});
  const [q, setQ] = useState("");
  const [size, setSize] = useState("40x30");
  const [showPrice, setShowPrice] = useState(true);
  const [showShop, setShowShop] = useState(true);
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => p.active !== false && (!t || p.name.toLowerCase().includes(t) || (p.barcode || "").includes(t)));
  }, [products, q]);
  const jobs = rows.filter((p) => p.barcode && (qty[p._id] || 0) > 0).map((p) => ({ name: p.name, barcode: p.barcode, price: p.price, qty: qty[p._id] }));
  const total = jobs.reduce((a, j) => a + j.qty, 0);
  const bump = (id, n) => setQty((x) => ({ ...x, [id]: Math.max(0, Math.min(999, (x[id] || 0) + n)) }));
  const print = () => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
    document.body.appendChild(frame);
    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(labelsHtml({ jobs, shop, size, showPrice, showShop, cur }));
    doc.close();
    setTimeout(() => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } finally {
        setTimeout(() => frame.remove(), 60000);
      }
    }, 400);
  };
  const makeCode = async (p) => {
    setBusy(true);
    try {
      await ctx.api.genBarcode(ctx.id, p._id);
      ctx.notify({ type: "success", text: m.saved });
      onChanged();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const sample = jobs[0] || (rows.find((p) => p.barcode) ? { ...rows.find((p) => p.barcode), qty: 1 } : null);
  return (
    <Modal
      title={m.labelsTitle}
      onClose={onClose}
      size="md-modal-lg"
      footer={
        <button type="button" className="md-btn md-btn-primary" onClick={print} disabled={!total}>
          <Printer size={15} /> {m.printLabels.replace("{n}", total)}
        </button>
      }
    >
      <p className="rs-muted" style={{ marginTop: 0 }}>
        {m.labelsSub}
      </p>
      <div className="ml-opts">
        <div className="at-seg">
          {SIZES.map(([k, w, h]) => (
            <button key={k} type="button" className={size === k ? "on" : ""} onClick={() => setSize(k)}>
              {w}×{h} mm
            </button>
          ))}
        </div>
        <label className="md-switch">
          <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
          <span className="md-switch-track" />
          <span>{m.showPrice}</span>
        </label>
        <label className="md-switch">
          <input type="checkbox" checked={showShop} onChange={(e) => setShowShop(e.target.checked)} />
          <span className="md-switch-track" />
          <span>{m.showShop}</span>
        </label>
      </div>
      {sample && (
        <div className="ml-preview" aria-hidden="true">
          <span className="ml-paper" style={{ aspectRatio: `${SIZES.find(([k]) => k === size)[1]} / ${SIZES.find(([k]) => k === size)[2]}` }}>
            {showShop && <small>{shop.name}</small>}
            <b>{sample.name}</b>
            {/* eslint-disable-next-line react/no-danger */}
            <span className="ml-bc" dangerouslySetInnerHTML={{ __html: barcodeSvg(sample.barcode, { ratio: 0.36 }) || "" }} />
            {showPrice && <em>{money(sample.price, cur)}</em>}
          </span>
        </div>
      )}
      <label className="mt-search" style={{ margin: "12px 0" }}>
        <Search size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.search} aria-label={m.search} />
      </label>
      <div className="ml-list">
        {rows.map((p) => (
          <div key={p._id} className="ml-row">
            <span className="mt-prod-text" style={{ flex: 1 }}>
              <b>{p.name}</b>
              <small>{p.barcode || m.noBarcodeYet}</small>
            </span>
            <b className="mt-prod-price">{money(p.price, cur)}</b>
            {p.barcode ? (
              <span className="mp-qty">
                <button type="button" onClick={() => bump(p._id, -1)} aria-label="-">
                  <Minus size={14} />
                </button>
                <input
                  inputMode="numeric"
                  value={qty[p._id] || 0}
                  onChange={(e) => setQty((x) => ({ ...x, [p._id]: Math.max(0, Math.min(999, Number(e.target.value.replace(/\D/g, "")) || 0)) }))}
                  onFocus={(e) => e.target.select()}
                  aria-label={m.qty}
                />
                <button type="button" onClick={() => bump(p._id, 1)} aria-label="+">
                  <Plus size={14} />
                </button>
              </span>
            ) : (
              <button type="button" className="ms-act" onClick={() => makeCode(p)} disabled={busy || ctx.readOnly}>
                <Wand2 size={14} /> <span>{m.makeBarcode}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

// the gate: open the modal when owned, the buy window when not
export function LabelsGate({ ctx, products, open, onClose, onChanged }) {
  const { m } = ctx;
  if (!open) return null;
  if (ctx.data.addons?.mart_labels?.active) return <LabelsModal ctx={ctx} products={products} onClose={onClose} onChanged={onChanged} />;
  const a = ctx.data.addons?.mart_labels;
  return (
    <Modal
      title={m.labelsTitle}
      onClose={onClose}
      footer={
        <button
          type="button"
          className="md-btn md-btn-primary rs-gold-btn"
          onClick={() => {
            onClose();
            ctx.askBuy({ addon: "mart_labels" });
          }}
          disabled={ctx.readOnly}
        >
          <CoinIcon size={15} /> {m.unlock.replace("{coins}", a?.price ?? 45)} · {m.forever}
        </button>
      }
    >
      <div className="mt-lock" style={{ padding: "10px 0 4px" }}>
        <Barcode size={34} />
        <p className="rs-muted">{m.labelsLocked}</p>
      </div>
    </Modal>
  );
}
