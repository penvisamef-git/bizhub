import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownUp, Boxes, ClipboardCheck, History, Package, PackagePlus, PackageX, Plus, Search, Trash2, Wallet } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { Field } from "../restaurant/parts";
import CoinIcon from "../../../components/CoinIcon";
import { fmtDayTime, money, stockOn, unitName } from "./text";
import { xText } from "./xtext";

const r3 = (v) => Math.round(v * 1000) / 1000;

// Stock control (mart_stock): what is on the shelf, receive stock, count, history
export function StockTab({ ctx }) {
  const { m, cur, readOnly, lang } = ctx;
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const load = useCallback(() => {
    if (!stockOn(ctx)) return;
    ctx.api
      .stock(ctx.id, {})
      .then((r) => setData(r.data))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx]);
  useEffect(() => {
    load();
  }, [load]);
  const units = ctx.data.units || [];
  const cats = ctx.data.categories || [];
  const uName = (id) =>
    unitName(
      units.find((u) => String(u._id) === String(id)),
      lang,
    );
  const cName = (id) => cats.find((c) => String(c._id) === String(id))?.name || "";
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = (data?.rows || []).filter((p) => (filter === "all" || p.state === filter) && (!t || p.name.toLowerCase().includes(t) || (p.barcode || "").includes(t)));
    const val = (p) => (p.track_stock ? Math.max(0, p.stock) * (p.cost || 0) : 0);
    const order = { out: 0, low: 1, ok: 2, off: 3 };
    if (sort === "low") list.sort((a, b) => order[a.state] - order[b.state] || a.stock - b.stock);
    else if (sort === "value") list.sort((a, b) => val(b) - val(a));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [data, filter, q, sort]);
  const canEdit = !readOnly && ctx.role !== "cashier";

  if (!stockOn(ctx)) {
    const a = ctx.data.addons?.mart_stock;
    return (
      <section className="panel-card mt-lock">
        <Package size={34} />
        <h2>{m.addonInfo.mart_stock.name}</h2>
        <p className="rs-muted">{m.stockLocked}</p>
        {!ctx.pos && (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon: "mart_stock" })} disabled={readOnly}>
            <CoinIcon size={16} /> {m.unlock.replace("{coins}", a?.price ?? 115)} {m.perYear}
          </button>
        )}
      </section>
    );
  }
  const tracked = data ? data.counts.all - data.counts.off : 0;
  const cards = data
    ? [
        ["all", Boxes, tracked, m.tracked, "c-teal"],
        ["low", AlertTriangle, data.counts.low, m.lowStock, "c-amber"],
        ["out", PackageX, data.counts.out, m.outStock, "c-red"],
      ]
    : [];
  return (
    <div className="rs-col">
      <section className="panel-card ms-head">
        <div className="ms-head-top">
          <span className="ms-head-ic">
            <Boxes size={24} />
          </span>
          <div className="ms-head-text">
            <h2>{m.tabs.stock}</h2>
            <small>{m.stockSub}</small>
          </div>
          <div className="ms-head-btns">
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setModal({ history: true })}>
              <History size={15} /> {m.history}
            </button>
            {canEdit && (
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setModal({ receive: true })} disabled={!data}>
                <PackagePlus size={15} /> {m.receive}
              </button>
            )}
          </div>
        </div>
        {data && (
          <div className="ms-cards">
            {cards.map(([k, Icon, n, label, cls]) => (
              <button key={k} type="button" className={`ms-card ${cls} ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>
                <span className="ms-card-ic">
                  <Icon size={18} />
                </span>
                <b>{n}</b>
                <small>{label}</small>
              </button>
            ))}
            <div className="ms-card c-blue">
              <span className="ms-card-ic">
                <Wallet size={18} />
              </span>
              <b>{money(data.value, cur)}</b>
              <small>{m.stockValue}</small>
            </div>
          </div>
        )}
      </section>

      <section className="panel-card ms-body">
        <div className="ms-tools">
          <label className="mt-search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.search} aria-label={m.search} />
          </label>
          <div className="at-seg ms-seg">
            {[
              ["all", m.allCats],
              ["low", m.lowStock],
              ["out", m.outStock],
              ["off", m.notTracked],
            ].map(([k, label]) => (
              <button key={k} type="button" className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                {label}
                {data && k !== "all" && data.counts[k] > 0 && <em>{data.counts[k]}</em>}
              </button>
            ))}
          </div>
          <label className="ms-sort">
            <ArrowDownUp size={15} />
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={m.sortBy}>
              <option value="name">{m.sortName}</option>
              <option value="low">{m.sortLow}</option>
              <option value="value">{m.sortValue}</option>
            </select>
          </label>
        </div>
        {!data ? (
          <p className="rs-muted">…</p>
        ) : !rows.length ? (
          <div className="mt-empty">
            <Package size={30} />
            <p className="rs-muted">{m.noProducts}</p>
          </div>
        ) : (
          <div className="ms-table">
            <div className="ms-tr ms-th">
              <span>{m.item}</span>
              <span>{m.inStock}</span>
              <span>{m.valueCol}</span>
              <span>{m.statusCol}</span>
              <span />
            </div>
            {rows.map((p) => {
              const low = p.low_stock ?? 5;
              const pct = p.state === "off" ? 0 : Math.max(p.stock > 0 ? 4 : 0, Math.min(100, (p.stock / Math.max(1, low * 4)) * 100));
              return (
                <div key={p._id} className={`ms-tr s-${p.state}`}>
                  <span className="ms-prod">
                    <span className="mt-prod-pic">{p.photo?.url ? <img src={p.photo.url} alt="" loading="lazy" /> : <Package size={18} />}</span>
                    <span className="mt-prod-text">
                      <b>{p.name}</b>
                      <small>{[p.barcode, cName(p.category_id)].filter(Boolean).join(" · ") || "—"}</small>
                    </span>
                  </span>
                  <span className="ms-qty">
                    {p.state === "off" ? (
                      <small className="rs-muted">—</small>
                    ) : (
                      <>
                        <span className="ms-qty-n">
                          <b>{r3(p.stock)}</b> <small>{uName(p.unit_id)}</small>
                        </span>
                        <span className="ms-bar">
                          <i style={{ width: `${pct}%` }} />
                        </span>
                        <small className="ms-low">{m.lowAt.replace("{n}", low)}</small>
                      </>
                    )}
                  </span>
                  <span className="ms-val">{p.state === "off" ? "—" : money(Math.max(0, p.stock) * (p.cost || 0), cur)}</span>
                  <span>
                    <em className={`ms-pill s-${p.state}`}>{{ ok: m.okStock, low: m.lowStock, out: m.outStock, off: m.notTracked }[p.state]}</em>
                  </span>
                  <span className="ms-acts">
                    {canEdit && p.state !== "off" && (
                      <>
                        <button type="button" className="ms-act" onClick={() => setModal({ receive: true, first: p })} title={m.receive}>
                          <Plus size={15} /> <span>{m.receiveShort}</span>
                        </button>
                        <button type="button" className="ms-act" onClick={() => setModal({ count: p })} title={m.countBtn}>
                          <ClipboardCheck size={15} /> <span>{m.countBtn}</span>
                        </button>
                      </>
                    )}
                    {p.state !== "off" && (
                      <button type="button" className="ms-act ic" onClick={() => setModal({ history: true, product: p })} title={m.history} aria-label={m.history}>
                        <History size={15} />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {modal?.receive && <ReceiveModal ctx={ctx} products={(data?.rows || []).filter((p) => p.state !== "off")} first={modal.first} onClose={() => setModal(null)} onDone={load} />}
      {modal?.count && <CountModal ctx={ctx} p={modal.count} onClose={() => setModal(null)} onDone={load} />}
      {modal?.history && <HistoryModal ctx={ctx} product={modal.product} onClose={() => setModal(null)} />}
    </div>
  );
}

function ReceiveModal({ ctx, products, first, onClose, onDone }) {
  const { m, cur } = ctx;
  const [lines, setLines] = useState(first ? [{ product_id: String(first._id), qty: "", cost: first.cost || "" }] : []);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // suppliers add-on: who brought it + their invoice number
  const supOn = ctx.pos ? false : !!ctx.data.addons?.mart_suppliers?.active;
  // expiry dates add-on: the expiry day of each line (makes a batch)
  const expOn = ctx.pos ? !!ctx.data.addons_on?.mart_expiry : !!ctx.data.addons?.mart_expiry?.active;
  const [sups, setSups] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  useEffect(() => {
    if (supOn) ctx.api.suppliers(ctx.id).then((r) => setSups(r.data)).catch(() => {}); // prettier-ignore
  }, [supOn, ctx]);
  const found = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const exact = products.find((p) => p.barcode === q.trim());
    if (exact) return [exact];
    return products.filter((p) => p.name.toLowerCase().includes(t) || (p.barcode || "").startsWith(t)).slice(0, 8);
  }, [q, products]);
  const add = (p) => {
    setQ("");
    setLines((ls) => (ls.some((l) => l.product_id === String(p._id)) ? ls : [...ls, { product_id: String(p._id), qty: "", cost: p.cost || "" }]));
  };
  const nameOf = (id) => products.find((p) => String(p._id) === id)?.name || "?";
  const ok = lines.length && lines.every((l) => Number(l.qty) > 0);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await ctx.api.stockIn(ctx.id, {
        items: lines.map((l) => ({ product_id: l.product_id, qty: Number(l.qty), ...(l.cost !== "" ? { cost: Number(l.cost) } : {}), ...(expOn && l.expires ? { expires: l.expires } : {}) })),
        note,
        ...(supOn && supplierId ? { supplier_id: supplierId, invoice_no: invoiceNo } : {}),
      });
      ctx.notify({ type: "success", text: m.saved });
      onDone();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={m.receive}
      onClose={onClose}
      busy={busy}
      size="md-modal-lg"
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || !ok}>
            {busy ? m.saving : m.save}
          </button>
        </>
      }
    >
      <div className="mt-rec-find">
        <label className="mt-search">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (found[0]) add(found[0]);
              }
            }}
            placeholder={m.pickProduct}
            aria-label={m.pickProduct}
            autoFocus
          />
        </label>
        {found.length > 0 && (
          <div className="mt-rec-pop">
            {found.map((p) => (
              <button key={p._id} type="button" onClick={() => add(p)}>
                <b>{p.name}</b>
                <small>
                  {p.barcode || ""} · {p.stock}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>
      {lines.length > 0 && (
        <div className={`mt-rec-lines ${expOn ? "with-exp" : ""}`}>
          <div className="mt-rec-row head">
            <span>{m.item}</span>
            <span>{m.qtyIn}</span>
            <span>
              {m.costEach} ({cur === "KHR" ? "៛" : "$"})
            </span>
            {expOn && <span>{xText(ctx.lang).expiryOpt}</span>}
            <span />
          </div>
          {lines.map((l, i) => (
            <div key={l.product_id} className="mt-rec-row">
              <b>{nameOf(l.product_id)}</b>
              <input type="number" min="0" step="any" inputMode="decimal" value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} aria-label={m.qtyIn} autoFocus={i === lines.length - 1} />
              <input type="number" min="0" step="any" inputMode="decimal" value={l.cost} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, cost: e.target.value } : x)))} aria-label={m.costEach} />
              {expOn && <input type="date" value={l.expires || ""} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, expires: e.target.value } : x)))} aria-label={xText(ctx.lang).expires} data-testid="rec-exp" />}
              <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label={m.remove}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      {supOn && (
        <div className="md-fields-grid" style={{ marginBottom: 10 }}>
          <Field label={m.supplierCol} htmlFor="mt-rec-sup">
            <select id="mt-rec-sup" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">{m.noSupplier}</option>
              {sups.map((x) => (
                <option key={x._id} value={x._id}>
                  {x.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={m.invoiceNo} htmlFor="mt-rec-inv">
            <input id="mt-rec-inv" maxLength={60} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} disabled={!supplierId} />
          </Field>
        </div>
      )}
      <Field label={m.stockNote} htmlFor="mt-rec-note">
        <input id="mt-rec-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error && <div className="md-form-error">{error}</div>}
    </Modal>
  );
}

function CountModal({ ctx, p, onClose, onDone }) {
  const { m } = ctx;
  const [count, setCount] = useState(String(p.stock));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const diff = Math.round((Number(count) - p.stock) * 1000) / 1000;
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await ctx.api.stockCount(ctx.id, { product_id: p._id, count: Number(count), note });
      ctx.notify({ type: "success", text: m.saved });
      onDone();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`${m.countTitle} · ${p.name}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="submit" form="mt-count" className="md-btn md-btn-primary" disabled={busy || count === "" || Number.isNaN(Number(count))}>
            {busy ? m.saving : m.save}
          </button>
        </>
      }
    >
      <form id="mt-count" className="md-fields" onSubmit={save}>
        <p className="rs-muted" style={{ margin: 0 }}>
          {m.inStock}: <b>{p.stock}</b>
        </p>
        <Field label={m.counted} htmlFor="mt-cnt">
          <input id="mt-cnt" className="mp-big-input" type="number" step="any" inputMode="decimal" value={count} onChange={(e) => setCount(e.target.value)} autoFocus onFocus={(e) => e.target.select()} />
        </Field>
        {count !== "" && diff !== 0 && <b className={diff < 0 ? "mt-neg" : "mt-pos"}>{diff > 0 ? `+${diff}` : diff}</b>}
        <Field label={m.stockNote} htmlFor="mt-cnt-note">
          <input id="mt-cnt-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

function HistoryModal({ ctx, product, onClose }) {
  const { m, lang } = ctx;
  const [rows, setRows] = useState(null);
  useEffect(() => {
    ctx.api
      .stockMoves(ctx.id, product ? { product_id: product._id } : {})
      .then((r) => setRows(r.data))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx, product]);
  return (
    <Modal title={`${m.history}${product ? ` · ${product.name}` : ""}`} onClose={onClose} size="md-modal-lg">
      {!rows ? (
        <p className="rs-muted">…</p>
      ) : !rows.length ? (
        <p className="rs-muted">{m.noMoves}</p>
      ) : (
        rows.map((x) => (
          <div key={x._id} className="gh-row mt-move">
            <span className={`mt-move-kind k-${x.kind}`}>{m.moveKinds[x.kind]}</span>
            <span className="gh-row-text" style={{ flex: 1 }}>
              <b>{x.name}</b>
              <small>
                {fmtDayTime(x.created_date, lang)} · {x.by}
                {x.sale_no ? ` · ${x.sale_no}` : ""}
                {x.supplier ? ` · ${x.supplier}` : ""}
                {x.invoice_no ? ` #${x.invoice_no}` : ""}
                {x.note ? ` · ${x.note}` : ""}
              </small>
            </span>
            <b className={x.qty < 0 ? "mt-neg" : "mt-pos"}>{x.qty > 0 ? `+${x.qty}` : x.qty}</b>
            <small className="mt-move-after">→ {x.stock_after}</small>
          </div>
        ))
      )}
    </Modal>
  );
}
