import { useEffect, useState } from "react";
import { ClipboardCheck, Copy, PackageCheck, Plus, Printer, Send, Trash2, Truck, X } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { Field } from "../restaurant/parts";
import { fmtDate, money } from "./text";
import { useXText } from "./xtext";
import { AddonHead, ProductPick, addonOn, useLoad, useSave } from "./MartGrowKit";

const TONE = { draft: "", sent: "info", partial: "warn", received: "ok", cancelled: "bad" };

// Reorder list + purchase orders (mart_purchase)
export function PurchaseTab({ ctx }) {
  const x = useXText();
  const { cur, lang, readOnly } = ctx;
  const on = addonOn(ctx, "mart_purchase");
  const [re, loadRe] = useLoad(ctx, () => (on ? ctx.api.reorder(ctx.id) : Promise.resolve({ data: null })), [on]);
  const [status, setStatus] = useState("open");
  const [pos, loadPos] = useLoad(ctx, () => (on ? ctx.api.pos(ctx.id, { status }) : Promise.resolve({ data: [] })), [on, status]);
  const [prods] = useLoad(ctx, () => (on ? ctx.api.products(ctx.id) : Promise.resolve({ data: [] })), [on]);
  const [sups, setSups] = useState([]);
  useEffect(() => {
    if (on)
      ctx.api.suppliers(ctx.id).then(
        (r) => setSups(r.data),
        () => setSups([]),
      );
  }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  const [modal, setModal] = useState(null);
  const reload = () => {
    loadRe();
    loadPos();
  };
  const head = (
    <AddonHead ctx={ctx} addon="mart_purchase" icon={ClipboardCheck} title={x.purTitle} sub={x.purSub} perks={x.purPerks} yearly={false}>
      <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setModal({ edit: { items: [] } })} disabled={readOnly}>
        <Plus size={15} /> {x.makePo}
      </button>
    </AddonHead>
  );
  if (!on) return <div className="rs-col">{head}</div>;
  return (
    <div className="rs-col">
      {head}
      <section className="panel-card">
        <h3 style={{ margin: 0 }}>{x.reorder}</h3>
        <p className="rs-muted" style={{ margin: "4px 0 12px" }}>
          {x.reorderSub}
        </p>
        {!re ? (
          <p className="rs-muted">…</p>
        ) : !re.groups.length ? (
          <p className="rs-muted">{x.noReorder}</p>
        ) : (
          <div className="xs-groups">
            {re.groups.map((g) => (
              <div key={g.supplier_id || "none"} className="xs-group" data-testid="po-group">
                <div className="xs-group-head">
                  <span className="xs-card-ic">
                    <Truck size={16} />
                  </span>
                  <b>{g.supplier || x.noSupplier}</b>
                  <small className="rs-muted">{g.phone}</small>
                  <button
                    type="button"
                    className="md-btn md-btn-primary sa-btn-sm"
                    onClick={() => setModal({ edit: { supplier_id: g.supplier_id || "", items: g.items.map((i) => ({ product_id: i.product_id, name: i.name, qty: i.qty, cost: i.cost })) } })}
                    disabled={readOnly}
                    data-testid="po-make"
                  >
                    <Plus size={14} /> {x.makePo}
                  </button>
                </div>
                {g.items.map((i) => (
                  <div key={i.product_id} className="xs-row thin">
                    <span className="mt-prod-text">
                      <b>{i.name}</b>
                      <small className="rs-muted">
                        {x.stockNow.replace("{n}", i.stock)} · {x.lowAt.replace("{n}", i.low_stock)}
                        {i.coming > 0 ? ` · ${x.coming.replace("{n}", i.coming)}` : ""}
                      </small>
                    </span>
                    <span className={`rs-pill ${i.stock <= 0 ? "bad" : "warn"}`}>{i.stock}</span>
                    <b className="xs-amt">+{i.qty}</b>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="panel-card">
        <div className="xs-bar">
          <h3 style={{ margin: 0 }}>{x.orders}</h3>
          <div className="mt-chips">
            {["open", "received", "cancelled", "all"].map((k) => (
              <button key={k} type="button" className={status === k ? "on" : ""} onClick={() => setStatus(k)}>
                {k === "open" ? x.open : k === "all" ? x.all : x.poStatus[k]}
              </button>
            ))}
          </div>
        </div>
        {!pos ? (
          <p className="rs-muted">…</p>
        ) : !pos.length ? (
          <p className="rs-muted">{x.noPos}</p>
        ) : (
          <div className="xs-list">
            {pos.map((po) => (
              <button key={po._id} type="button" className="xs-row btn" onClick={() => setModal({ view: po })} data-testid="po-row">
                <span className="xs-pic">
                  <ClipboardCheck size={18} />
                </span>
                <span className="mt-prod-text">
                  <b>
                    {po.no} · {po.supplier_name || x.noSupplier}
                  </b>
                  <small className="rs-muted">
                    {fmtDate(po.created_date, lang)} · {po.items.length} × ·{" "}
                    {po.items
                      .map((i) => i.name)
                      .slice(0, 3)
                      .join(", ")}
                  </small>
                </span>
                <span className={`rs-pill ${TONE[po.status]}`}>{x.poStatus[po.status]}</span>
                <b className="xs-amt">{money(po.total, cur)}</b>
              </button>
            ))}
          </div>
        )}
      </section>
      {modal?.edit && <PoEdit ctx={ctx} po={modal.edit} products={prods || []} sups={sups} onClose={() => setModal(null)} onSaved={reload} />}
      {modal?.view && <PoView ctx={ctx} po={modal.view} stockOn={re?.stock_on} onClose={() => setModal(null)} onChanged={reload} onEdit={(po) => setModal({ edit: po })} onReceive={(po) => setModal({ receive: po })} />}
      {modal?.receive && <PoReceive ctx={ctx} po={modal.receive} onClose={() => setModal(null)} onSaved={reload} />}
    </div>
  );
}

function PoEdit({ ctx, po, products, sups, onClose, onSaved }) {
  const x = useXText();
  const { cur } = ctx;
  const [sup, setSup] = useState(po.supplier_id ? String(po.supplier_id) : "");
  const [items, setItems] = useState(po.items.map((i) => ({ product_id: String(i.product_id), name: i.name, qty: i.qty, cost: i.cost ?? 0 })));
  const [note, setNote] = useState(po.note || "");
  const { busy, error, go } = useSave(ctx, onSaved, onClose);
  const total = items.reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.cost) || 0), 0);
  const body = { supplier_id: sup || null, note, items: items.filter((i) => Number(i.qty) > 0).map((i) => ({ product_id: i.product_id, qty: Number(i.qty), cost: Number(i.cost) || 0 })) };
  return (
    <Modal
      title={po._id ? po.no : x.makePo}
      onClose={onClose}
      busy={busy}
      size="md-modal-lg"
      footer={
        <>
          <b style={{ marginRight: "auto" }}>
            {x.total}: {money(total, cur)}
          </b>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {x.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" disabled={busy || !body.items.length} onClick={() => go(() => (po._id ? ctx.api.savePo(ctx.id, po._id, body) : ctx.api.addPo(ctx.id, body)))} data-testid="po-save">
            {busy ? x.saving : x.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <Field label={x.supplier} htmlFor="po-sup">
          <select id="po-sup" value={sup} onChange={(e) => setSup(e.target.value)}>
            <option value="">{x.noSupplier}</option>
            {sups.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="xs-lines">
          {items.map((i, n) => (
            <div key={i.product_id} className="xs-line">
              <b>{i.name}</b>
              <label>
                <small>{x.qty}</small>
                <input type="number" min="0" step="any" value={i.qty} onChange={(e) => setItems(items.map((y, k) => (k === n ? { ...y, qty: e.target.value } : y)))} />
              </label>
              <label>
                <small>{x.cost}</small>
                <input type="number" min="0" step="any" value={i.cost} onChange={(e) => setItems(items.map((y, k) => (k === n ? { ...y, cost: e.target.value } : y)))} />
              </label>
              <button type="button" className="md-icon-btn" onClick={() => setItems(items.filter((_, k) => k !== n))} aria-label={x.remove}>
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        <Field label={x.addLine}>
          <ProductPick products={products} value="" exclude={items.map((i) => i.product_id)} onPick={(p) => p && setItems([...items, { product_id: p._id, name: p.name, qty: 1, cost: p.cost || 0 }])} />
        </Field>
        <Field label={x.note} htmlFor="po-note">
          <input id="po-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

function PoView({ ctx, po, stockOn, onClose, onChanged, onEdit, onReceive }) {
  const x = useXText();
  const { cur, lang, readOnly } = ctx;
  const [row, setRow] = useState(po);
  const [busy, setBusy] = useState(false);
  const text = x.poText
    .replace("{no}", row.no)
    .replace("{shop}", ctx.data.business?.name || "")
    .replace("{date}", fmtDate(row.created_date, lang))
    .replace("{lines}", row.items.map((i) => `• ${i.name} × ${i.qty}${i.cost ? ` @ ${money(i.cost, cur)}` : ""}`).join("\n"))
    .replace("{total}", money(row.total, cur))
    .replace("{note}", row.note ? `\n${row.note}` : "");
  const act = async (fn, close) => {
    setBusy(true);
    try {
      const r = await fn();
      if (r?.data) setRow(r.data);
      onChanged();
      if (close) onClose();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const share = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(" ")}&text=${encodeURIComponent(text)}`, "_blank", "noopener");
    if (row.status === "draft") act(() => ctx.api.sendPo(ctx.id, row._id));
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      ctx.notify({ type: "success", text: x.copied });
    } catch {
      /* no clipboard */
    }
    if (row.status === "draft") act(() => ctx.api.sendPo(ctx.id, row._id));
  };
  const print = () => {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
    w.document.write(
      `<html><head><title>${esc(row.no)}</title><style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left}</style></head><body><h2>${esc(ctx.data.business?.name || "")} · ${esc(row.no)}</h2><p>${esc(row.supplier_name || "")} · ${esc(fmtDate(row.created_date, lang))}</p><table><tr><th>${esc(x.product)}</th><th>${esc(x.qty)}</th><th>${esc(x.cost)}</th></tr>${row.items.map((i) => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${esc(money(i.cost, cur))}</td></tr>`).join("")}</table><h3>${esc(x.total)}: ${esc(money(row.total, cur))}</h3><p>${esc(row.note || "")}</p></body></html>`,
    );
    w.document.close();
    w.print();
  };
  const open = ["draft", "sent", "partial"].includes(row.status);
  return (
    <Modal
      title={`${row.no} · ${x.poStatus[row.status]}`}
      onClose={onClose}
      busy={busy}
      size="md-modal-lg"
      footer={
        <>
          {row.status === "draft" && (
            <button type="button" className="md-btn md-btn-ghost sa-danger-text" style={{ marginRight: "auto" }} onClick={() => act(() => ctx.api.removePo(ctx.id, row._id), true)} disabled={busy || readOnly}>
              <Trash2 size={14} /> {x.deletePo}
            </button>
          )}
          {open && row.status !== "draft" && (
            <button type="button" className="md-btn md-btn-ghost sa-danger-text" style={{ marginRight: "auto" }} onClick={() => act(() => ctx.api.cancelPo(ctx.id, row._id))} disabled={busy || readOnly}>
              {x.cancelPo}
            </button>
          )}
          {["draft", "sent"].includes(row.status) && (
            <button type="button" className="md-btn md-btn-ghost" onClick={() => onEdit(row)} disabled={busy || readOnly}>
              {x.edit}
            </button>
          )}
          {open && (
            <button type="button" className="md-btn md-btn-primary" onClick={() => onReceive(row)} disabled={busy || readOnly || !stockOn} title={stockOn ? "" : x.needStock} data-testid="po-receive">
              <PackageCheck size={15} /> {x.receive}
            </button>
          )}
        </>
      }
    >
      <div className="md-fields">
        <div className="xs-tags">
          <span>
            <Truck size={13} /> {row.supplier_name || x.noSupplier}
          </span>
          <span>{fmtDate(row.created_date, lang)}</span>
          {row.invoice_no && (
            <span>
              {x.invoiceNo} {row.invoice_no}
            </span>
          )}
        </div>
        <div className="st-wrap">
          <table className="st-table">
            <thead>
              <tr>
                <th>{x.product}</th>
                <th className="num">{x.ordered}</th>
                <th className="num">{x.received}</th>
                <th className="num">{x.cost}</th>
              </tr>
            </thead>
            <tbody>
              {row.items.map((i) => (
                <tr key={i.product_id}>
                  <td>{i.name}</td>
                  <td className="num">{i.qty}</td>
                  <td className="num">{i.received || 0}</td>
                  <td className="num">{money(i.cost, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="xs-total">
          {x.total}: {money(row.total, cur)}
        </p>
        {row.note && <p className="rs-muted">{row.note}</p>}
        {!stockOn && open && <small className="rs-muted">{x.needStock}</small>}
        <div className="xs-share">
          <button type="button" className="md-btn md-btn-primary sa-btn-sm tg-btn" onClick={share} disabled={busy} data-testid="po-tg">
            <Send size={14} /> {x.sendTg}
          </button>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={copy} disabled={busy}>
            <Copy size={14} /> {x.copy}
          </button>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={print}>
            <Printer size={14} /> {x.print}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PoReceive({ ctx, po, onClose, onSaved }) {
  const x = useXText();
  const expiryOn = !!ctx.data.addons?.mart_expiry?.active || !!ctx.data.addons_on?.mart_expiry;
  const [lines, setLines] = useState(po.items.map((i) => ({ product_id: String(i.product_id), name: i.name, qty: Math.max(0, Math.round((i.qty - (i.received || 0)) * 1000) / 1000), cost: i.cost ?? 0, expires: "" })));
  const [inv, setInv] = useState("");
  const { busy, error, go } = useSave(ctx, onSaved, onClose);
  const body = { invoice_no: inv, items: lines.filter((l) => Number(l.qty) > 0).map((l) => ({ product_id: l.product_id, qty: Number(l.qty), cost: Number(l.cost) || 0, ...(l.expires ? { expires: l.expires } : {}) })) };
  return (
    <Modal
      title={x.receiveTitle.replace("{no}", po.no)}
      onClose={onClose}
      busy={busy}
      size="md-modal-lg"
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {x.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" disabled={busy || !body.items.length} onClick={() => go(() => ctx.api.receivePo(ctx.id, po._id, body))} data-testid="po-receive-ok">
            <PackageCheck size={15} /> {x.receive}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <div className="xs-lines">
          {lines.map((l, n) => (
            <div key={l.product_id} className="xs-line">
              <b>{l.name}</b>
              <label>
                <small>{x.received}</small>
                <input type="number" min="0" step="any" value={l.qty} onChange={(e) => setLines(lines.map((y, k) => (k === n ? { ...y, qty: e.target.value } : y)))} />
              </label>
              <label>
                <small>{x.cost}</small>
                <input type="number" min="0" step="any" value={l.cost} onChange={(e) => setLines(lines.map((y, k) => (k === n ? { ...y, cost: e.target.value } : y)))} />
              </label>
              {expiryOn && (
                <label>
                  <small>{x.expiryOpt}</small>
                  <input type="date" value={l.expires} onChange={(e) => setLines(lines.map((y, k) => (k === n ? { ...y, expires: e.target.value } : y)))} />
                </label>
              )}
            </div>
          ))}
        </div>
        <Field label={x.invoiceNo} htmlFor="po-inv">
          <input id="po-inv" maxLength={60} value={inv} onChange={(e) => setInv(e.target.value)} />
        </Field>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}
