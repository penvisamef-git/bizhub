import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChefHat, ImagePlus, Lock, Pencil, Plus, Printer, Sparkles, Trash2 } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { COLORS } from "../../../namecard/CardView";
import { AddonPrompt, DeleteButton, Field, ImagePick } from "./parts";
import { fmtMoney, toKhr } from "./text";
import { useStockText } from "./stock-text";

const nameOf = (x, lang) => (lang === "km" ? x.name_km || x.name_en : x.name_en || x.name_km) || "—";

// Menu: categories → items (sizes, add-ons, station) · add-on groups · kitchen stations
export default function MenuTab({ ctx }) {
  const { r, lang, settings, readOnly } = ctx;
  const [view, setView] = useState("items");
  const [data, setData] = useState(() => {
    const [categories, items, groups, stations] = ["categories", "items", "addon-groups", "stations"].map((k) => restaurantService.cached(ctx.id, k));
    return categories && items && groups && stations ? { categories, items, groups, stations } : null;
  }); // { categories, items, groups, stations }
  const [catId, setCatId] = useState(() => data?.categories[0]?._id || null);
  const [modal, setModal] = useState(null); // { kind: "category"|"item"|"group"|"station", row }
  const kitchen = ctx.addonOn("rest_kitchen");
  const st = useStockText();
  const [sampling, setSampling] = useState(false);
  // 10 sample items with cost, price and stock (for trying the POS)
  const addSamples = async () => {
    setSampling(true);
    try {
      const res = await restaurantService.stock.sample(ctx.id);
      restaurantService.forget(ctx.id, ["categories", "items"]);
      await load();
      ctx.reload();
      ctx.notify({ type: "success", text: res.tracked ? st.samplesDone : st.samplesDoneNoStock });
    } catch (e) {
      fail(e);
    } finally {
      setSampling(false);
    }
  };

  const load = useCallback(async () => {
    const [c, i, g, s] = await Promise.all(["categories", "items", "addon-groups", "stations"].map((k) => restaurantService.list(ctx.id, k)));
    setData({ categories: c.data, items: i.data, groups: g.data, stations: s.data });
    setCatId((cur) => (cur && c.data.some((x) => x._id === cur) ? cur : c.data[0]?._id || null));
  }, [ctx.id]);
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const fail = (e) => {
    if (e.status === 402 && e.response?.product) ctx.askBuy(e.response.product);
    else ctx.notify({ type: "error", text: e.status === 409 ? r.inUse : e.message });
  };
  const saved = () => {
    setModal(null);
    load();
    ctx.reload();
  };
  const move = async (collection, list, i, d) => {
    const ids = list.map((x) => x._id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    try {
      await restaurantService.reorder(ctx.id, collection, ids);
      load();
    } catch (e) {
      fail(e);
    }
  };
  const toggleAvailable = async (item) => {
    setData((d) => ({ ...d, items: d.items.map((x) => (x._id === item._id ? { ...x, available: !x.available } : x)) }));
    try {
      await restaurantService.update(ctx.id, "items", item._id, { available: !item.available });
    } catch (e) {
      fail(e);
      load();
    }
  };

  const items = useMemo(() => (data ? data.items.filter((x) => String(x.category_id) === String(catId)) : []), [data, catId]);
  if (!data) return <ListSkeleton rows={5} />;
  const khr = (usd) => fmtMoney(toKhr(usd, settings.khr_rate, settings.khr_rounding), "KHR");
  const price = (n) => (settings.currency === "KHR" ? fmtMoney(n, "KHR") : fmtMoney(n));

  return (
    <div className="rs-col">
      <div className="rs-subtabs" role="tablist">
        {Object.entries(r.menuTabs).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} className={view === k ? "on" : ""} onClick={() => setView(k)}>
            {k === "stations" && !kitchen && <Lock size={13} />} {label}
            <small>{k === "items" ? data.items.length : k === "groups" ? data.groups.length : data.stations.length}</small>
          </button>
        ))}
      </div>

      {view === "items" && (
        <div className="rs-menu">
          <section className="panel-card rs-cats">
            <div className="pe-list-head">
              <h2 style={{ margin: 0 }}>{r.categories}</h2>
              <button type="button" className="md-icon-btn" onClick={() => setModal({ kind: "category", row: {} })} aria-label={r.addCategory} title={r.addCategory} disabled={readOnly}>
                <Plus size={18} />
              </button>
            </div>
            {data.categories.length === 0 && <p className="rs-muted">{r.noCategories}</p>}
            <ul>
              {data.categories.map((c, i) => (
                <li key={c._id} className={c._id === catId ? "on" : ""}>
                  <button type="button" className="rs-cat" onClick={() => setCatId(c._id)}>
                    <i style={{ background: c.color }} />
                    <span>{nameOf(c, lang)}</span>
                    <small>{data.items.filter((x) => String(x.category_id) === c._id).length}</small>
                  </button>
                  {c._id === catId && !readOnly && (
                    <span className="rs-cat-tools">
                      <button type="button" className="md-icon-btn" onClick={() => move("categories", data.categories, i, -1)} disabled={i === 0} aria-label={r.moveUp}>
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" className="md-icon-btn" onClick={() => move("categories", data.categories, i, 1)} disabled={i === data.categories.length - 1} aria-label={r.moveDown}>
                        <ArrowDown size={14} />
                      </button>
                      <button type="button" className="md-icon-btn" onClick={() => setModal({ kind: "category", row: c })} aria-label={r.editCategory}>
                        <Pencil size={14} />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="panel-card rs-items">
            <div className="pe-list-head">
              <h2 style={{ margin: 0 }}>{catId ? nameOf(data.categories.find((c) => c._id === catId) || {}, lang) : r.items}</h2>
              <span className="sk-head-btns">
                {data.items.length <= 40 && (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={addSamples} disabled={readOnly || sampling}>
                    <Sparkles size={15} /> {sampling ? r.saving : st.addSamples}
                  </button>
                )}
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setModal({ kind: "item", row: { category_id: catId } })} disabled={readOnly || !catId}>
                  <Plus size={15} /> {r.addItem}
                </button>
              </span>
            </div>
            {catId && items.length === 0 && <p className="rs-muted">{r.noItems}</p>}
            <div className="rs-item-grid">
              {items.map((it) => (
                <article key={it._id} className={`rs-item ${it.available ? "" : "sold"} ${it.active ? "" : "off"}`}>
                  <button type="button" className="rs-item-main" onClick={() => setModal({ kind: "item", row: it })} disabled={readOnly}>
                    <span className="rs-item-photo">{it.photo?.url ? <img src={it.photo.url} alt="" loading="lazy" /> : <ImagePlus size={22} />}</span>
                    <span className="rs-item-text">
                      <b>{nameOf(it, lang)}</b>
                      <span className="rs-item-price">
                        {price(it.price)}
                        {settings.currency === "USD" && <small>{khr(it.price)}</small>}
                      </span>
                      <small className="rs-muted">
                        {[it.code, it.sizes.length ? `${it.sizes.length} ${r.sizes.toLowerCase()}` : "", it.addon_group_ids.length ? `${it.addon_group_ids.length} ${r.options.toLowerCase()}` : ""].filter(Boolean).join(" · ")}
                        {it.track_stock && ctx.addonOn("rest_stock") && (
                          <span className={`sk-badge ${it.stock <= 0 ? "out" : it.stock <= (it.low_stock ?? 5) ? "low" : ""}`}>{it.stock <= 0 ? st.soldOut : st.left.replace("{n}", fmtQty(it.stock))}</span>
                        )}
                      </small>
                    </span>
                  </button>
                  <label className="rs-item-avail md-switch" title={r.available}>
                    <input type="checkbox" checked={it.available} onChange={() => toggleAvailable(it)} disabled={readOnly} />
                    <span className="md-switch-track" />
                    <span>{it.available ? r.available : r.soldOut}</span>
                  </label>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {view === "groups" && (
        <section className="panel-card">
          <div className="pe-list-head">
            <h2 style={{ margin: 0 }}>{r.addonGroups}</h2>
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setModal({ kind: "group", row: {} })} disabled={readOnly}>
              <Plus size={15} /> {r.addGroup}
            </button>
          </div>
          <p className="rs-muted" style={{ margin: "6px 0 12px" }}>
            {r.addonGroupsHint}
          </p>
          {data.groups.length === 0 && <p className="rs-muted">{r.noGroups}</p>}
          <ul className="rs-rows">
            {data.groups.map((g) => (
              <li key={g._id}>
                <button type="button" className="rs-row" onClick={() => setModal({ kind: "group", row: g })} disabled={readOnly}>
                  <b>{g.name}</b>
                  <small className="rs-muted">
                    {g.required ? `${r.groupRequired} · ` : ""}
                    {g.min}–{g.max} · {g.options.map((o) => `${o.name}${o.price ? ` +${price(o.price)}` : ""}`).join(", ")}
                  </small>
                  <Pencil size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === "stations" &&
        (kitchen ? (
          <section className="panel-card">
            <div className="pe-list-head">
              <h2 style={{ margin: 0 }}>{r.stations}</h2>
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setModal({ kind: "station", row: {} })} disabled={readOnly}>
                <Plus size={15} /> {r.addStation}
              </button>
            </div>
            <p className="rs-muted" style={{ margin: "6px 0 12px" }}>
              {r.stationsHint}
            </p>
            {data.stations.length === 0 && <p className="rs-muted">{r.noStations}</p>}
            <ul className="rs-rows">
              {data.stations.map((s) => (
                <li key={s._id}>
                  <button type="button" className="rs-row" onClick={() => setModal({ kind: "station", row: s })} disabled={readOnly}>
                    <ChefHat size={18} />
                    <b>{s.name}</b>
                    <small className="rs-muted">
                      <Printer size={12} /> {r.printerTypes[s.printer?.type || "none"]}
                      {s.printer?.address ? ` · ${s.printer.address}` : ""}
                    </small>
                    <Pencil size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <AddonPrompt addonKey="rest_kitchen" ctx={ctx} />
        ))}

      {modal?.kind === "category" && <CategoryModal ctx={ctx} row={modal.row} onClose={() => setModal(null)} onSaved={saved} fail={fail} />}
      {modal?.kind === "item" && (
        <ItemModal
          ctx={ctx}
          row={modal.row}
          data={data}
          kitchen={kitchen}
          onClose={() => setModal(null)}
          onSaved={saved}
          onCreated={(item) => {
            load();
            ctx.reload();
            setModal({ kind: "item", row: item }); // stay open so a photo can be added
          }}
          fail={fail}
        />
      )}
      {modal?.kind === "group" && <GroupModal ctx={ctx} row={modal.row} onClose={() => setModal(null)} onSaved={saved} fail={fail} />}
      {modal?.kind === "station" && <StationModal ctx={ctx} row={modal.row} onClose={() => setModal(null)} onSaved={saved} fail={fail} />}
    </div>
  );
}

// ---------- modals ----------
function useSave(ctx, collection, row, onSaved, fail, onCreated) {
  const [busy, setBusy] = useState(false);
  const save = async (data) => {
    setBusy(true);
    try {
      if (row._id) {
        await restaurantService.update(ctx.id, collection, row._id, data);
        onSaved();
      } else {
        const res = await restaurantService.create(ctx.id, collection, data);
        if (onCreated) onCreated(res.data);
        else onSaved();
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await restaurantService.remove(ctx.id, collection, row._id);
      onSaved();
    } catch (e) {
      fail(e);
      setBusy(false);
    }
  };
  return { busy, save, remove };
}

function Footer({ r, busy, onClose, onDelete, formId, canSave }) {
  return (
    <>
      {onDelete && (
        <span style={{ marginRight: "auto" }}>
          <DeleteButton onDelete={onDelete} r={r} disabled={busy} small />
        </span>
      )}
      <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
        {r.cancel}
      </button>
      <button type="submit" form={formId} className="md-btn md-btn-primary" disabled={busy || !canSave}>
        {busy ? r.saving : r.save}
      </button>
    </>
  );
}

function CategoryModal({ ctx, row, onClose, onSaved, fail }) {
  const { r } = ctx;
  const [f, setF] = useState({ name_km: row.name_km || "", name_en: row.name_en || "", color: row.color || "#E0581A", active: row.active !== false });
  const { busy, save, remove } = useSave(ctx, "categories", row, onSaved, fail);
  return (
    <Modal
      title={row._id ? r.editCategory : r.addCategory}
      onClose={onClose}
      busy={busy}
      size="md-modal-sm"
      footer={<Footer r={r} busy={busy} onClose={onClose} onDelete={row._id && remove} formId="rs-cat-form" canSave={f.name_km.trim() || f.name_en.trim()} />}
    >
      <form
        id="rs-cat-form"
        className="md-fields"
        onSubmit={(e) => {
          e.preventDefault();
          save(f);
        }}
      >
        <Field label={r.categoryNameKm} htmlFor="c-km">
          <input id="c-km" maxLength={60} value={f.name_km} onChange={(e) => setF({ ...f, name_km: e.target.value })} autoFocus />
        </Field>
        <Field label={r.categoryNameEn} htmlFor="c-en">
          <input id="c-en" maxLength={60} value={f.name_en} onChange={(e) => setF({ ...f, name_en: e.target.value })} />
        </Field>
        <div className="ne-colors">
          {COLORS.map((c) => (
            <button key={c} type="button" className={`ne-color ${f.color.toUpperCase() === c ? "on" : ""}`} style={{ background: c }} onClick={() => setF({ ...f, color: c })} aria-label={c} />
          ))}
        </div>
        <label className="md-switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{r.showOnMenu}</span>
        </label>
      </form>
    </Modal>
  );
}

function PricedRows({ rows, setRows, r, nameLabel, priceLabel, addLabel, max }) {
  return (
    <div className="rs-priced">
      {rows.map((x, i) => (
        <div key={i} className="rs-priced-row">
          <input value={x.name} maxLength={40} placeholder={nameLabel} aria-label={nameLabel} onChange={(e) => setRows(rows.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
          <div className="rs-affix small">
            <span>$</span>
            <input type="number" min="0" step="0.05" value={x.price} aria-label={priceLabel} onChange={(e) => setRows(rows.map((y, j) => (j === i ? { ...y, price: e.target.value } : y)))} />
          </div>
          <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={r.remove}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {rows.length < max && (
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setRows([...rows, { name: "", price: 0 }])}>
          <Plus size={15} /> {addLabel}
        </button>
      )}
    </div>
  );
}

const fmtQty = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
// "Profit $1.20 (60%)" under the cost field
function profitHint(f, settings, s) {
  const price = Number(f.price) || 0;
  const cost = Number(f.cost) || 0;
  if (!price || f.cost === "") return s.costHint;
  const p = price - cost;
  const money = settings.currency === "KHR" ? fmtMoney(p, "KHR") : fmtMoney(p);
  return s.profitHint.replace("{v}", money).replace("{p}", Math.round((p / price) * 100));
}

function ItemModal({ ctx, row, data, kitchen, onClose, onSaved, onCreated, fail }) {
  const { r, settings } = ctx;
  const s = useStockText();
  const [f, setF] = useState({
    name_km: row.name_km || "",
    name_en: row.name_en || "",
    price: row.price ?? "",
    code: row.code || "",
    description: row.description || "",
    category_id: row.category_id || data.categories[0]?._id || "",
    station_id: row.station_id || "",
    sizes: (row.sizes || []).map((s) => ({ name: s.name, price: s.price })),
    addon_group_ids: (row.addon_group_ids || []).map(String),
    available: row.available !== false,
    active: row.active !== false,
    cost: row.cost ?? "",
    track_stock: !!row.track_stock,
    stock: row._id ? (row.stock ?? 0) : "",
    low_stock: row.low_stock ?? 5,
  });
  const stockOn = ctx.addonOn("rest_stock");
  const [photo, setPhoto] = useState(row.photo?.url || "");
  const [uploading, setUploading] = useState(false);
  const { busy, save, remove } = useSave(ctx, "items", row, onSaved, fail, onCreated);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const can = (f.name_km.trim() || f.name_en.trim()) && f.price !== "" && Number(f.price) >= 0 && f.category_id;

  const pickPhoto = async (blob) => {
    setUploading(true);
    try {
      const res = await restaurantService.uploadItemPhoto(ctx.id, row._id, blob);
      setPhoto(res.data.photo.url);
    } catch (e) {
      fail(e);
    } finally {
      setUploading(false);
    }
  };
  const dropPhoto = async () => {
    setUploading(true);
    try {
      await restaurantService.removeItemPhoto(ctx.id, row._id);
      setPhoto("");
    } catch (e) {
      fail(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title={row._id ? r.editItem : r.addItem} onClose={onClose} busy={busy} size="md-modal-lg" footer={<Footer r={r} busy={busy} onClose={onClose} onDelete={row._id && remove} formId="rs-item-form" canSave={can} />}>
      <form
        id="rs-item-form"
        className="md-fields"
        onSubmit={(e) => {
          e.preventDefault();
          const { stock, ...rest } = f;
          save({
            ...rest,
            price: Number(f.price),
            cost: Number(f.cost) || 0,
            low_stock: Number(f.low_stock) || 0,
            track_stock: stockOn ? f.track_stock : undefined,
            ...(row._id || !f.track_stock ? {} : { stock: Number(stock) || 0 }), // first quantity only when created
            station_id: f.station_id || null,
            sizes: f.sizes.filter((s) => s.name.trim()).map((s) => ({ name: s.name, price: Number(s.price) || 0 })),
          });
        }}
      >
        <Field label={r.itemPhoto}>{row._id ? <ImagePick value={photo} busy={uploading} onPick={pickPhoto} onRemove={dropPhoto} r={r} maxSize={900} /> : <small className="rs-hint">{r.savePhotoFirst}</small>}</Field>
        <div className="md-fields-grid">
          <Field label={r.nameKm} htmlFor="i-km">
            <input id="i-km" maxLength={80} value={f.name_km} onChange={set("name_km")} autoFocus />
          </Field>
          <Field label={r.nameEn} htmlFor="i-en">
            <input id="i-en" maxLength={80} value={f.name_en} onChange={set("name_en")} />
          </Field>
          <Field label={`${r.price} (${settings.currency})`} htmlFor="i-price">
            <input id="i-price" type="number" min="0" step={settings.currency === "KHR" ? 100 : 0.05} value={f.price} onChange={set("price")} />
          </Field>
          <Field label={`${s.costLabel} (${settings.currency})`} htmlFor="i-cost" hint={profitHint(f, settings, s)}>
            <input id="i-cost" type="number" min="0" step={settings.currency === "KHR" ? 100 : 0.05} value={f.cost} onChange={set("cost")} placeholder="0" />
          </Field>
          <Field label={r.code} htmlFor="i-code">
            <input id="i-code" maxLength={20} value={f.code} onChange={set("code")} placeholder={r.codePh} />
          </Field>
          <Field label={r.category} htmlFor="i-cat">
            <select id="i-cat" value={f.category_id} onChange={set("category_id")}>
              {data.categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {nameOf(c, ctx.lang)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={r.station} htmlFor="i-station" hint={kitchen ? "" : r.stationLocked}>
            <select id="i-station" value={f.station_id} onChange={set("station_id")} disabled={!kitchen}>
              <option value="">{r.noStation}</option>
              {data.stations.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={r.description} full htmlFor="i-desc">
            <textarea id="i-desc" rows={2} maxLength={300} value={f.description} onChange={set("description")} />
          </Field>
        </div>
        <Field label={r.sizes} hint={r.sizesHint}>
          <PricedRows rows={f.sizes} setRows={(sizes) => setF({ ...f, sizes })} r={r} nameLabel={r.sizeName} priceLabel={r.price} addLabel={r.addSize} max={10} />
        </Field>
        <Field label={r.addonGroups} hint={data.groups.length ? r.addonGroupsHint : r.noGroups}>
          <div className="rs-checks">
            {data.groups.map((g) => (
              <label key={g._id} className={f.addon_group_ids.includes(g._id) ? "on" : ""}>
                <input type="checkbox" checked={f.addon_group_ids.includes(g._id)} onChange={(e) => setF({ ...f, addon_group_ids: e.target.checked ? [...f.addon_group_ids, g._id] : f.addon_group_ids.filter((x) => x !== g._id) })} />
                {g.name}
              </label>
            ))}
          </div>
        </Field>
        <div className="sk-item-stock">
          <div className="sk-item-stock-head">
            <b>{s.stock}</b>
            {stockOn ? (
              <label className="md-switch">
                <input type="checkbox" checked={f.track_stock} onChange={(e) => setF({ ...f, track_stock: e.target.checked })} />
                <span className="md-switch-track" />
                <span>{s.trackStock}</span>
              </label>
            ) : (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy("rest_stock")}>
                <Lock size={14} /> {s.unlockStock}
              </button>
            )}
          </div>
          {!stockOn && <small className="rs-hint">{s.stockLockedHint}</small>}
          {stockOn && f.track_stock && (
            <div className="md-fields-grid">
              {row._id ? (
                <Field label={s.inStock}>
                  <div className="sk-now">
                    <b className={Number(f.stock) <= 0 ? "out" : Number(f.stock) <= Number(f.low_stock) ? "low" : ""}>{fmtQty(f.stock)}</b>
                    <small className="rs-hint">{s.changeInStock}</small>
                  </div>
                </Field>
              ) : (
                <Field label={s.openingQty} htmlFor="i-stock" hint={s.openingHint}>
                  <input id="i-stock" type="number" min="0" step="1" value={f.stock} onChange={set("stock")} placeholder="0" />
                </Field>
              )}
              <Field label={s.lowAlert} htmlFor="i-low" hint={s.lowAlertHint}>
                <input id="i-low" type="number" min="0" step="1" value={f.low_stock} onChange={set("low_stock")} />
              </Field>
            </div>
          )}
        </div>
        <div className="rs-switch-row">
          <label className="md-switch">
            <input type="checkbox" checked={f.available} onChange={(e) => setF({ ...f, available: e.target.checked })} />
            <span className="md-switch-track" />
            <span>{r.available}</span>
          </label>
          <label className="md-switch">
            <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
            <span className="md-switch-track" />
            <span>{r.showOnMenu}</span>
          </label>
        </div>
      </form>
    </Modal>
  );
}

function GroupModal({ ctx, row, onClose, onSaved, fail }) {
  const { r } = ctx;
  const [f, setF] = useState({ name: row.name || "", required: !!row.required, min: row.min ?? 0, max: row.max ?? 1, options: (row.options || []).map((o) => ({ name: o.name, price: o.price })) });
  const { busy, save, remove } = useSave(ctx, "addon-groups", row, onSaved, fail);
  const can = f.name.trim() && Number(f.min) <= Number(f.max);
  return (
    <Modal title={row._id ? r.editGroup : r.addGroup} onClose={onClose} busy={busy} footer={<Footer r={r} busy={busy} onClose={onClose} onDelete={row._id && remove} formId="rs-group-form" canSave={can} />}>
      <form
        id="rs-group-form"
        className="md-fields"
        onSubmit={(e) => {
          e.preventDefault();
          save({ ...f, min: Number(f.min), max: Number(f.max), options: f.options.filter((o) => o.name.trim()).map((o) => ({ name: o.name, price: Number(o.price) || 0 })) });
        }}
      >
        <Field label={r.groupName} htmlFor="g-name">
          <input id="g-name" maxLength={40} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={r.groupNamePh} autoFocus />
        </Field>
        <div className="md-fields-grid">
          <Field label={r.minPick} htmlFor="g-min">
            <input id="g-min" type="number" min="0" max="20" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} />
          </Field>
          <Field label={r.maxPick} htmlFor="g-max">
            <input id="g-max" type="number" min="1" max="20" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} />
          </Field>
        </div>
        <label className="md-switch">
          <input type="checkbox" checked={f.required} onChange={(e) => setF({ ...f, required: e.target.checked, min: e.target.checked && Number(f.min) < 1 ? 1 : f.min })} />
          <span className="md-switch-track" />
          <span>{r.groupRequired}</span>
        </label>
        <Field label={r.options}>
          <PricedRows rows={f.options} setRows={(options) => setF({ ...f, options })} r={r} nameLabel={r.optionName} priceLabel={r.extraPrice} addLabel={r.addOption} max={30} />
        </Field>
      </form>
    </Modal>
  );
}

function StationModal({ ctx, row, onClose, onSaved, fail }) {
  const { r } = ctx;
  const [f, setF] = useState({ name: row.name || "", type: row.printer?.type || "none", address: row.printer?.address || "" });
  const canPrint = ctx.addonOn("rest_printer");
  const { busy, save, remove } = useSave(ctx, "stations", row, onSaved, fail);
  return (
    <Modal title={row._id ? r.editStation : r.addStation} onClose={onClose} busy={busy} size="md-modal-sm" footer={<Footer r={r} busy={busy} onClose={onClose} onDelete={row._id && remove} formId="rs-station-form" canSave={f.name.trim()} />}>
      <form
        id="rs-station-form"
        className="md-fields"
        onSubmit={(e) => {
          e.preventDefault();
          save({ name: f.name, printer: canPrint ? { type: f.type, address: f.address } : { type: "none" } });
        }}
      >
        <Field label={r.stationName} htmlFor="s-name">
          <input id="s-name" maxLength={40} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Kitchen" autoFocus />
        </Field>
        <Field label={r.printer} htmlFor="s-type" hint={canPrint ? undefined : r.printerNeedsAddon}>
          <select id="s-type" value={canPrint ? f.type : "none"} onChange={(e) => setF({ ...f, type: e.target.value })} disabled={!canPrint}>
            {Object.entries(r.printerTypes).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        {!canPrint && (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => ctx.askBuy("rest_printer")} disabled={ctx.readOnly}>
            <Lock size={14} /> {r.addonNames.rest_printer}
          </button>
        )}
        {canPrint && f.type !== "none" && (
          <Field label={r.printerAddress} htmlFor="s-addr">
            <input id="s-addr" maxLength={100} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder={f.type === "network" ? "192.168.1.50" : "USB001"} />
          </Field>
        )}
      </form>
    </Modal>
  );
}
