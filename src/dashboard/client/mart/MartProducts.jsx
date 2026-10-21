import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Barcode, Download, FileSpreadsheet, Lock, Package, Pencil, Plus, Ruler, Search, Star, Tags, Trash2, Upload } from "lucide-react";
import { LabelsGate } from "./MartLabels";
import { martService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import { DeleteButton, Field, ImagePick } from "../restaurant/parts";
import { money, stockOn, unitName } from "./text";
import { xText } from "./xtext";

// ---------------- CSV (Excel → Save as CSV, or copy + paste from Excel) ----------------
const HEADS = {
  name: ["name", "product", "ឈ្មោះ", "ឈ្មោះទំនិញ"],
  barcode: ["barcode", "code", "បាកូដ"],
  price: ["price", "sale price", "តម្លៃ", "តម្លៃលក់"],
  cost: ["cost", "ថ្លៃដើម"],
  unit: ["unit", "ឯកតា"],
  category: ["category", "ប្រភេទ"],
};
const ORDER = ["name", "barcode", "price", "cost", "unit", "category"];
export function parseRows(textIn) {
  const src = String(textIn || "").replace(/^﻿/, "");
  const first = src.split(/\r?\n/)[0] || "";
  const sep = first.includes("\t") ? "\t" : first.split(";").length > first.split(",").length ? ";" : ",";
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const clean = rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
  if (!clean.length) return [];
  const head = clean[0].map((h) => h.toLowerCase());
  const isHead = head.some((h) => Object.values(HEADS).some((list) => list.includes(h)));
  const cols = isHead ? head.map((h) => Object.keys(HEADS).find((k) => HEADS[k].includes(h)) || null) : ORDER;
  return (isHead ? clean.slice(1) : clean).map((r) => {
    const o = {};
    cols.forEach((k, i) => {
      if (k && r[i] !== undefined) o[k] = r[i];
    });
    if (o.price !== undefined) o.price = String(o.price).replace(/[$៛,\s]/g, "");
    if (o.cost !== undefined) o.cost = String(o.cost).replace(/[$៛,\s]/g, "");
    return o;
  });
}
const EXAMPLE = "﻿name,barcode,price,cost,unit,category\nCoca-Cola 330ml,8850999320011,0.60,0.45,can,Drinks\nBread,,1.25,,ដុំ,Bakery\n";

export function ProductsTab({ ctx }) {
  const { m, cur, readOnly } = ctx;
  const api = ctx.api;
  const [rows, setRows] = useState(null);
  const [cats, setCats] = useState(ctx.data.categories || []);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [units, setUnits] = useState(ctx.data.units || []);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const load = useCallback(() => {
    api
      .products(ctx.id)
      .then((r) => setRows(r.data))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
    api
      .categories(ctx.id)
      .then((r) => setCats(r.data))
      .catch(() => {});
    api
      .units(ctx.id)
      .then((r) => setUnits(r.data))
      .catch(() => {});
  }, [api, ctx]);
  useEffect(() => {
    load();
  }, [load]);
  const active = (rows || []).filter((p) => p.active).length;
  const max = ctx.data.limits.products;
  const full = active >= max;
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows || []).filter((p) => (!cat || (cat === "none" ? !p.category_id : String(p.category_id) === cat)) && (!t || p.name.toLowerCase().includes(t) || (p.barcode || "").includes(t)));
  }, [rows, q, cat]);
  const catName = (id) => cats.find((c) => String(c._id) === String(id))?.name || "";
  const uName = (id) =>
    unitName(
      units.find((u) => String(u._id) === String(id)),
      ctx.lang,
    );
  const withStock = stockOn(ctx);
  const changed = () => {
    load();
    ctx.reload?.();
  };

  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="pe-list-head">
          <div>
            <h2 style={{ margin: 0 }}>{m.tabs.products}</h2>
            <small className="rs-muted">{m.productLimit.replace("{n}", active).replace("{max}", max)}</small>
          </div>
          <div className="gh-head-btns">
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setUnitsOpen(true)} disabled={readOnly}>
              <Ruler size={14} /> {m.unitsTitle}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setCatsOpen(true)} disabled={readOnly}>
              <Tags size={14} /> {m.categories}
            </button>
            {!ctx.pos && (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setLabelsOpen(true)} disabled={readOnly || !rows}>
                <Barcode size={14} /> {m.labels}
              </button>
            )}
            {!ctx.pos && (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setImportOpen(true)} disabled={readOnly}>
                <FileSpreadsheet size={14} /> {m.import}
              </button>
            )}
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => (full ? ctx.notify({ type: "error", text: m.limitReached.replace("{max}", max) }) : setEditing({}))} disabled={readOnly || !rows}>
              {full ? <Lock size={14} /> : <Plus size={15} />} {m.addProduct}
            </button>
          </div>
        </div>
        <div className="mt-filter">
          <label className="mt-search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.search} aria-label={m.search} />
          </label>
          <div className="mt-chips">
            {[["", m.allCats], ...cats.map((c) => [String(c._id), c.name]), ["none", m.noCat]].map(([k, label]) => (
              <button key={k || "all"} type="button" className={cat === k ? "on" : ""} onClick={() => setCat(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {!rows ? (
          <p className="rs-muted">…</p>
        ) : !shown.length ? (
          <div className="mt-empty">
            <Package size={30} />
            <p className="rs-muted">{m.noProducts}</p>
          </div>
        ) : (
          <div className="mt-products">
            {shown.map((p) => (
              <button key={p._id} type="button" className={`mt-prod ${p.active ? "" : "off"}`} onClick={() => setEditing(p)} disabled={readOnly}>
                <span className="mt-prod-pic">{p.photo?.url ? <img src={p.photo.url} alt="" loading="lazy" /> : <Package size={20} />}</span>
                <span className="mt-prod-text">
                  <b>
                    {p.fav && <Star size={12} className="mt-star" />} {p.name}
                  </b>
                  <small>
                    {p.barcode || "—"}
                    {p.unit_id ? ` · ${uName(p.unit_id)}` : ""}
                    {p.category_id ? ` · ${catName(p.category_id)}` : ""}
                    {!p.active ? ` · ${m.off}` : ""}
                  </small>
                </span>
                {withStock && p.track_stock && <em className={`mt-stock ${p.stock <= 0 ? "out" : p.stock <= (p.low_stock ?? 5) ? "low" : ""}`}>{p.stock}</em>}
                <b className="mt-prod-price">{money(p.price, cur)}</b>
                <Pencil size={14} className="mt-prod-edit" />
              </button>
            ))}
          </div>
        )}
      </section>
      {editing && <ProductModal ctx={ctx} row={editing} cats={cats} units={units} onClose={() => setEditing(null)} onSaved={changed} />}
      {unitsOpen && <UnitsModal ctx={ctx} units={units} onClose={() => setUnitsOpen(false)} onChanged={changed} />}
      {catsOpen && <CategoriesModal ctx={ctx} cats={cats} onClose={() => setCatsOpen(false)} onChanged={changed} />}
      {importOpen && <ImportModal ctx={ctx} onClose={() => setImportOpen(false)} onDone={changed} />}
      <LabelsGate ctx={ctx} products={rows || []} open={labelsOpen} onClose={() => setLabelsOpen(false)} onChanged={changed} />
    </div>
  );
}

export function ProductModal({ ctx, row, cats, units: unitsIn, onClose, onSaved }) {
  const units = unitsIn || ctx.data.units || [];
  const withStock = stockOn(ctx);
  const { m, cur } = ctx;
  const api = ctx.api;
  const isNew = !row._id;
  const [f, setF] = useState({
    name: row.name || "",
    barcode: row.barcode || "",
    price: row.price ?? "",
    cost: row.cost || "",
    unit_id: row.unit_id ? String(row.unit_id) : units[0]?._id ? String(units[0]._id) : "",
    track_stock: row.track_stock !== false,
    low_stock: row.low_stock ?? 5,
    stock: row._id ? String(row.stock ?? 0) : "",
    category_id: row.category_id ? String(row.category_id) : "",
    fav: !!row.fav,
    active: row.active !== false,
    plu: row.plu || "",
    supplier_id: row.supplier_id ? String(row.supplier_id) : "",
    reorder_qty: row.reorder_qty || "",
  });
  // newer add-ons: scale item code (mart_scale), usual supplier + reorder qty (mart_purchase)
  const x = xText(ctx.lang);
  const scaleOn = ctx.pos ? !!ctx.data.scale : !!ctx.data.addons?.mart_scale?.active;
  const buyOn = ctx.pos ? !!ctx.data.addons_on?.mart_purchase : !!ctx.data.addons?.mart_purchase?.active;
  const supsOn = ctx.pos ? !!ctx.data.addons_on?.mart_suppliers : !!ctx.data.addons?.mart_suppliers?.active;
  const [sups, setSups] = useState([]);
  useEffect(() => {
    if (buyOn && supsOn)
      api.suppliers(ctx.id).then(
        (r) => setSups(r.data),
        () => {},
      );
  }, [buyOn, supsOn]); // eslint-disable-line react-hooks/exhaustive-deps
  const [photo, setPhoto] = useState(row.photo?.url || "");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { stock, plu, supplier_id: sup, reorder_qty: rq, ...rest } = f;
      const body = {
        ...rest,
        ...(scaleOn ? { plu: plu.trim() } : {}),
        ...(buyOn ? { reorder_qty: Number(rq) || 0, ...(supsOn ? { supplier_id: sup || null } : {}) } : {}),
        price: Number(f.price),
        cost: f.cost === "" ? 0 : Number(f.cost),
        category_id: f.category_id || null,
        low_stock: Number(f.low_stock) || 0,
        ...(withStock && stock !== "" && (isNew || Number(stock) !== (row.stock ?? 0)) ? { stock: Number(stock) } : {}),
      };
      if (!body.unit_id) delete body.unit_id;
      const r = isNew ? await api.addProduct(ctx.id, body) : await api.saveProduct(ctx.id, row._id, body);
      if (file) await api.productPhoto(ctx.id, r.data._id, file);
      else if (!photo && row.photo?.url) await api.removeProductPhoto(ctx.id, row._id);
      ctx.notify({ type: "success", text: m.saved });
      onSaved?.(r.data);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api.removeProduct(ctx.id, row._id);
      ctx.notify({ type: "success", text: m.saved });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={isNew ? m.addProduct : m.editProduct}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {!isNew && (
            <span style={{ marginRight: "auto" }}>
              <DeleteButton onDelete={remove} r={{ confirmDelete: m.sure, remove: m.remove }} disabled={busy} small />
            </span>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="submit" form="mt-product" className="md-btn md-btn-primary" disabled={busy || !f.name.trim() || f.price === "" || !(Number(f.price) >= 0)}>
            {busy ? m.saving : m.save}
          </button>
        </>
      }
    >
      <form id="mt-product" className="md-fields" onSubmit={submit}>
        <Field label={m.productName} htmlFor="mp-name">
          <input id="mp-name" maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </Field>
        <Field label={m.barcode} htmlFor="mp-code" hint={m.barcodeHint}>
          <input
            id="mp-code"
            maxLength={40}
            inputMode="numeric"
            autoComplete="off"
            value={f.barcode}
            onChange={(e) => setF({ ...f, barcode: e.target.value.replace(/\s/g, "") })}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} // a scanner ends with Enter: don't submit yet
          />
        </Field>
        <div className="md-fields-grid">
          <Field label={`${m.salePrice} (${cur === "KHR" ? "៛" : "$"})`} htmlFor="mp-price">
            <input id="mp-price" type="number" min="0" step={cur === "KHR" ? "100" : "0.01"} inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          </Field>
          <Field label={m.cost} htmlFor="mp-cost">
            <input id="mp-cost" type="number" min="0" step={cur === "KHR" ? "100" : "0.01"} inputMode="decimal" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} />
          </Field>
          <Field label={m.category} htmlFor="mp-cat">
            <select id="mp-cat" value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
              <option value="">{m.noCat}</option>
              {cats.map((c) => (
                <option key={c._id} value={String(c._id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={m.unit} htmlFor="mp-unit">
            <select id="mp-unit" value={f.unit_id} onChange={(e) => setF({ ...f, unit_id: e.target.value })}>
              {units.map((u) => (
                <option key={u._id} value={String(u._id)}>
                  {[u.name_km, u.name_en].filter(Boolean).join(" / ")}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {withStock && (
          <div className="mt-stock-fields">
            <label className="md-switch">
              <input type="checkbox" checked={f.track_stock} onChange={(e) => setF({ ...f, track_stock: e.target.checked })} />
              <span className="md-switch-track" />
              <span>{m.trackStock}</span>
            </label>
            {f.track_stock && (
              <div className="md-fields-grid">
                <Field
                  label={isNew ? m.startStock : m.inStock}
                  htmlFor="mp-stock"
                  hint={
                    !isNew && f.stock !== "" && Number(f.stock) !== (row.stock ?? 0) ? m.stockEditHint.replace("{diff}", `${Number(f.stock) - (row.stock ?? 0) > 0 ? "+" : ""}${Math.round((Number(f.stock) - (row.stock ?? 0)) * 1000) / 1000}`) : null
                  }
                >
                  <input id="mp-stock" type="number" step="any" inputMode="decimal" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} placeholder="0" />
                </Field>
                <Field label={m.lowLevel} htmlFor="mp-low">
                  <input id="mp-low" type="number" min="0" step="any" value={f.low_stock} onChange={(e) => setF({ ...f, low_stock: e.target.value })} />
                </Field>
              </div>
            )}
          </div>
        )}
        {(scaleOn || buyOn) && (
          <div className="md-fields-grid">
            {scaleOn && (
              <Field label={x.plu} htmlFor="mp-plu" hint={x.pluHint}>
                <input id="mp-plu" inputMode="numeric" maxLength={6} value={f.plu} onChange={(e) => setF({ ...f, plu: e.target.value.replace(/\D/g, "") })} data-testid="mp-plu" />
              </Field>
            )}
            {buyOn && supsOn && (
              <Field label={x.supplier} htmlFor="mp-sup">
                <select id="mp-sup" value={f.supplier_id} onChange={(e) => setF({ ...f, supplier_id: e.target.value })}>
                  <option value="">{x.noSupplier}</option>
                  {sups.map((sp) => (
                    <option key={sp._id} value={sp._id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {buyOn && (
              <Field label={`${x.makePo} · ${x.qty}`} htmlFor="mp-rq">
                <input id="mp-rq" type="number" min="0" step="any" value={f.reorder_qty} onChange={(e) => setF({ ...f, reorder_qty: e.target.value })} placeholder="auto" />
              </Field>
            )}
          </div>
        )}
        <Field label={m.photo}>
          <ImagePick
            value={photo}
            r={{ upload: m.upload, change: m.change2, uploading: m.uploading, remove: m.remove }}
            onPick={(fl) => {
              setFile(fl);
              setPhoto(URL.createObjectURL(fl));
            }}
            onRemove={() => {
              setFile(null);
              setPhoto("");
            }}
            maxSize={600}
          />
        </Field>
        <label className="md-switch">
          <input type="checkbox" checked={f.fav} onChange={(e) => setF({ ...f, fav: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{m.fav}</span>
        </label>
        <label className="md-switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{m.active}</span>
        </label>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

// units the shop makes itself (Khmer + English)
function UnitsModal({ ctx, units, onClose, onChanged }) {
  const { m } = ctx;
  const [f, setF] = useState({ name_km: "", name_en: "" });
  const [edit, setEdit] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      onChanged();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const save = (u, key, v) => {
    const cur = { ...u, ...(edit[u._id] || {}) };
    if (v === u[key]) return;
    run(() => ctx.api.saveUnit(ctx.id, u._id, { name_en: cur.name_en, name_km: cur.name_km }));
  };
  return (
    <Modal
      title={m.unitsTitle}
      onClose={onClose}
      busy={busy}
      footer={
        <button type="button" className="md-btn md-btn-primary" onClick={onClose}>
          {m.close}
        </button>
      }
    >
      <p className="rs-muted" style={{ marginTop: 0 }}>
        {m.unitsSub}
      </p>
      <form
        className="mt-unit-add"
        onSubmit={async (e) => {
          e.preventDefault();
          if ((f.name_km.trim() || f.name_en.trim()) && (await run(() => ctx.api.addUnit(ctx.id, { name_km: f.name_km.trim(), name_en: f.name_en.trim() })))) setF({ name_km: "", name_en: "" });
        }}
      >
        <input maxLength={30} placeholder={m.unitKmPh} value={f.name_km} onChange={(e) => setF({ ...f, name_km: e.target.value })} aria-label={m.unitKm} />
        <input maxLength={30} placeholder={m.unitEnPh} value={f.name_en} onChange={(e) => setF({ ...f, name_en: e.target.value })} aria-label={m.unitEn} />
        <button type="submit" className="md-btn md-btn-primary sa-btn-sm" disabled={busy || !(f.name_km.trim() || f.name_en.trim())}>
          <Plus size={14} /> {m.addUnit}
        </button>
      </form>
      <div className="mt-unit-head">
        <span>{m.unitKm}</span>
        <span>{m.unitEn}</span>
        <span />
      </div>
      {units.map((u) => (
        <div key={u._id} className="mt-unit-row">
          {["name_km", "name_en"].map((k) => (
            <input
              key={k}
              className="mt-cat-name"
              maxLength={30}
              value={edit[u._id]?.[k] ?? u[k] ?? ""}
              onChange={(e) => setEdit({ ...edit, [u._id]: { ...(edit[u._id] || {}), [k]: e.target.value } })}
              onBlur={(e) => save(u, k, e.target.value)}
              aria-label={k === "name_km" ? m.unitKm : m.unitEn}
            />
          ))}
          <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => run(() => ctx.api.removeUnit(ctx.id, u._id))} disabled={busy || units.length <= 1} aria-label={m.remove}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {error && <div className="md-form-error">{error}</div>}
    </Modal>
  );
}

function CategoriesModal({ ctx, cats, onClose, onChanged }) {
  const { m } = ctx;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState({});
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      onChanged();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={m.categories}
      onClose={onClose}
      busy={busy}
      footer={
        <button type="button" className="md-btn md-btn-primary" onClick={onClose}>
          {m.close}
        </button>
      }
    >
      <form
        className="mt-cat-add"
        onSubmit={async (e) => {
          e.preventDefault();
          if (name.trim() && (await run(() => ctx.api.addCategory(ctx.id, { name: name.trim(), sort: cats.length })))) setName("");
        }}
      >
        <input maxLength={60} placeholder={m.newCat} value={name} onChange={(e) => setName(e.target.value)} aria-label={m.catName} />
        <button type="submit" className="md-btn md-btn-primary sa-btn-sm" disabled={busy || !name.trim()}>
          <Plus size={14} /> {m.addCat}
        </button>
      </form>
      {!cats.length && <p className="rs-muted">{m.noCats}</p>}
      {cats.map((c) => (
        <div key={c._id} className="gh-row">
          <input
            className="mt-cat-name"
            maxLength={60}
            value={edit[c._id] ?? c.name}
            onChange={(e) => setEdit({ ...edit, [c._id]: e.target.value })}
            onBlur={() => edit[c._id] !== undefined && edit[c._id].trim() && edit[c._id] !== c.name && run(() => ctx.api.saveCategory(ctx.id, c._id, { name: edit[c._id].trim() }))}
            aria-label={m.catName}
          />
          <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => run(() => ctx.api.removeCategory(ctx.id, c._id))} disabled={busy} aria-label={m.remove}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {error && <div className="md-form-error">{error}</div>}
    </Modal>
  );
}

function ImportModal({ ctx, onClose, onDone }) {
  const { m, cur } = ctx;
  const [rows, setRows] = useState([]);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const pick = useRef(null);
  const read = (t) => {
    setResult(null);
    setRows(parseRows(t).filter((r) => r.name || r.price));
  };
  const go = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await martService.importProducts(ctx.id, rows);
      setResult(r.data);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const example = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([EXAMPLE], { type: "text/csv;charset=utf-8" }));
    a.download = "products-example.csv";
    a.click();
  };
  return (
    <Modal
      title={m.importTitle}
      onClose={onClose}
      busy={busy}
      size="md-modal-lg"
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" style={{ marginRight: "auto" }} onClick={example}>
            <Download size={14} /> {m.template}
          </button>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.close}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={go} disabled={busy || !rows.length || !!result}>
            <Upload size={14} /> {m.importGo.replace("{n}", rows.length)}
          </button>
        </>
      }
    >
      <p className="rs-muted" style={{ marginTop: 0 }}>
        {m.importSub}
      </p>
      <input
        ref={pick}
        type="file"
        accept=".csv,text/csv,.txt"
        hidden
        onChange={async (e) => {
          const fl = e.target.files?.[0];
          e.target.value = "";
          if (fl) read(await fl.text());
        }}
      />
      <div className="mt-pick">
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => pick.current?.click()}>
          <FileSpreadsheet size={14} /> {m.importPick}
        </button>
      </div>
      <textarea
        className="mt-paste"
        rows={4}
        placeholder={m.importPaste}
        value={paste}
        onChange={(e) => {
          setPaste(e.target.value);
          read(e.target.value);
        }}
      />
      {rows.length > 0 && (
        <>
          <b className="mt-import-n">{m.importRows.replace("{n}", rows.length)}</b>
          <div className="mt-import-table">
            <table>
              <thead>
                <tr>
                  <th>{m.productName}</th>
                  <th>{m.barcode}</th>
                  <th>{m.salePrice}</th>
                  <th>{m.category}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td>{r.barcode}</td>
                    <td>{r.price !== "" && !Number.isNaN(Number(r.price)) ? money(r.price, cur) : r.price}</td>
                    <td>{r.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {result && <div className="mt-ok">{m.importDone.replace("{a}", result.added).replace("{u}", result.updated).replace("{s}", result.skipped)}</div>}
      {result?.errors?.length > 0 && (
        <div className="mt-import-err">
          <b>{m.importErrors}</b>
          <ul>
            {result.errors.map((x) => (
              <li key={x.row}>
                {m.row.replace("{n}", x.row)}: {x.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <div className="md-form-error">{error}</div>}
    </Modal>
  );
}
