import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, EyeOff, ImagePlus, Loader2, Lock, Pencil, Plus, Search, Star, Trash2, UtensilsCrossed, X } from "lucide-react";
import { menuQrService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import { Field } from "../restaurant/parts";
import CoinIcon from "../../../components/CoinIcon";
import { money } from "../../../qmenu/MenuView";
import { Switch } from "./parts";
import { MediaPicker } from "./MqMedia";
import { fmt } from "./text";

const TAGS = ["new", "hot", "spicy", "veg", "best", "chef"];
const TAG_ICON = { new: "✨", hot: "🔥", spicy: "🌶️", veg: "🥬", best: "⭐", chef: "👨‍🍳" };
const catsOf = (i) => (i.category_ids?.length ? i.category_ids : [i.category_id]).map(String);
const nameOf = (o, lang) => (lang === "en" ? o.name_en || o.name_km : o.name_km || o.name_en) || "—";

// Menu: categories on the left, their items on the right
export default function MqMenu({ ctx }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const [cats, setCats] = useState(null);
  const [items, setItems] = useState(null);
  const [cat, setCat] = useState("");
  const [editCat, setEditCat] = useState(null); // {} = new
  const [editItem, setEditItem] = useState(null);
  const [q, setQ] = useState("");
  const load = () =>
    Promise.all([menuQrService.categories(id), menuQrService.items(id)])
      .then(([c, i]) => {
        setCats(c.data);
        setItems(i.data);
        setCat((cur) => (c.data.some((x) => x._id === cur) ? cur : c.data[0]?._id || ""));
      })
      .catch((e) => notify({ type: "error", text: e.message }));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = () => ctx.reload();
  const fail = (e) => {
    if (e.status === 402 && e.response?.product?.startsWith("mq_")) ctx.askBuy({ addon: e.response.product });
    else notify({ type: "error", text: e.message });
  };
  const L = data.limits;
  const catFull = cats && cats.length >= L.categories && !ctx.on("mq_categories");
  const itemFull = items && items.length >= L.items && !ctx.on("mq_items");
  const move = async (list, idx, dir, save, set) => {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[idx], next[j]] = [next[j], next[idx]];
    set(next);
    try {
      await save(next.map((x) => x._id));
    } catch (e) {
      notify({ type: "error", text: e.message });
    }
  };
  if (!cats || !items) return <div className="panel-card">…</div>;
  const shown = q.trim() ? items.filter((i) => `${i.name_km} ${i.name_en}`.toLowerCase().includes(q.trim().toLowerCase())) : items.filter((i) => catsOf(i).includes(cat));
  const current = cats.find((c) => c._id === cat);
  const limitLine = (n, max, unlimited, key) =>
    unlimited ? (
      m.noLimit.replace("{n}", fmt(n))
    ) : (
      <>
        {m[key].replace("{n}", n).replace("{max}", max)}
        {n >= max && (
          <button type="button" className="mq-more" onClick={() => ctx.askBuy({ addon: key === "catLimit" ? "mq_categories" : "mq_items" })}>
            <CoinIcon size={13} /> {m.getMore}
          </button>
        )}
      </>
    );
  return (
    <div className="mq-menu">
      <section className="panel-card mq-cats">
        <div className="mq-cats-head">
          <h3>{m.categories}</h3>
          <small className="rs-muted">{limitLine(cats.length, L.categories, ctx.on("mq_categories"), "catLimit")}</small>
        </div>
        {!cats.length && <p className="rs-muted">{m.noCats}</p>}
        <div className="mq-cat-list">
          {cats.map((c, i) => (
            <div key={c._id} className={`mq-cat ${c._id === cat && !q ? "on" : ""} ${c.active ? "" : "off"}`}>
              <button type="button" className="mq-cat-main" onClick={() => (setCat(c._id), setQ(""))} data-testid="mq-cat">
                <span className="mq-cat-ic">{c.icon || <UtensilsCrossed size={15} />}</span>
                <span className="mq-cat-name">{nameOf(c, lang)}</span>
                <small>{items.filter((x) => catsOf(x).includes(c._id)).length}</small>
              </button>
              <span className="mq-cat-acts">
                <button type="button" className="md-icon-btn" onClick={() => move(cats, i, -1, (ids) => menuQrService.orderCategories(id, ids), setCats)} disabled={readOnly || i === 0} aria-label={m.moveUp}>
                  <ArrowUp size={13} />
                </button>
                <button type="button" className="md-icon-btn" onClick={() => move(cats, i, 1, (ids) => menuQrService.orderCategories(id, ids), setCats)} disabled={readOnly || i === cats.length - 1} aria-label={m.moveDown}>
                  <ArrowDown size={13} />
                </button>
                <button type="button" className="md-icon-btn" onClick={() => setEditCat(c)} disabled={readOnly} aria-label={m.edit}>
                  <Pencil size={13} />
                </button>
              </span>
            </div>
          ))}
        </div>
        <button type="button" className="md-btn md-btn-ghost mq-add" onClick={() => (catFull ? ctx.askBuy({ addon: "mq_categories" }) : setEditCat({}))} disabled={readOnly} data-testid="mq-add-cat">
          {catFull ? <Lock size={14} /> : <Plus size={15} />} {m.addCategory}
        </button>
      </section>

      <section className="panel-card mq-items">
        <div className="mq-items-head">
          <div>
            <h3>{q ? m.search : current ? `${current.icon ? `${current.icon} ` : ""}${nameOf(current, lang)}` : m.items}</h3>
            <small className="rs-muted">{limitLine(items.length, L.items, ctx.on("mq_items"), "itemLimit")}</small>
          </div>
          <label className="mq-search">
            <Search size={14} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.search} />
          </label>
          <button
            type="button"
            className="md-btn md-btn-primary sa-btn-sm"
            onClick={() => (itemFull ? ctx.askBuy({ addon: "mq_items" }) : setEditItem({ category_ids: cat ? [cat] : [] }))}
            disabled={readOnly || !cats.length}
            data-testid="mq-add-item"
          >
            {itemFull ? <Lock size={14} /> : <Plus size={15} />} {m.addItem}
          </button>
        </div>
        {!shown.length ? (
          <p className="rs-muted mq-empty">{cats.length ? m.noItems : m.noCats}</p>
        ) : (
          <div className="mq-item-list">
            {shown.map((it) => {
              const idx = items.indexOf(it);
              const sameCat = q ? [] : items.filter((x) => catsOf(x).includes(cat));
              const k = sameCat.indexOf(it);
              return (
                <div key={it._id} className={`mq-item ${it.active ? "" : "off"}`} data-testid="mq-item">
                  <span className="mq-thumb">{it.photos?.[0] ? <img src={it.photos[0].url} alt="" /> : <UtensilsCrossed size={18} />}</span>
                  <button type="button" className="mq-item-main" onClick={() => setEditItem(it)}>
                    <b>{nameOf(it, lang)}</b>
                    <small className="rs-muted">
                      {lang === "km" ? it.name_en : it.name_km}
                      {it.photos?.length > 1 ? ` · 📷 ${it.photos.length}` : ""}
                    </small>
                    <span className="mq-item-flags">
                      {!it.available && <em className="rs-pill warn">{m.soldOut}</em>}
                      {!it.active && (
                        <em className="rs-pill">
                          <EyeOff size={11} /> {m.hidden}
                        </em>
                      )}
                      {(it.tags || []).map((t) => (
                        <em key={t} className="mq-tagchip">
                          {TAG_ICON[t]} {m.tagNames[t]}
                        </em>
                      ))}
                    </span>
                  </button>
                  <span className="mq-item-price">
                    {it.sale_price !== null && it.sale_price !== undefined && <s>{money(it.price, data.settings.currency)}</s>}
                    <b>{money(it.sale_price ?? it.price, data.settings.currency)}</b>
                  </span>
                  {!q && (
                    <span className="mq-cat-acts">
                      <button type="button" className="md-icon-btn" disabled={readOnly || k === 0} onClick={() => move(items, idx, items.indexOf(sameCat[k - 1]) - idx, (ids) => menuQrService.orderItems(id, ids), setItems)} aria-label={m.moveUp}>
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        className="md-icon-btn"
                        disabled={readOnly || k === sameCat.length - 1}
                        onClick={() => move(items, idx, items.indexOf(sameCat[k + 1]) - idx, (ids) => menuQrService.orderItems(id, ids), setItems)}
                        aria-label={m.moveDown}
                      >
                        <ArrowDown size={13} />
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {editCat && (
        <CatModal
          ctx={ctx}
          cat={editCat}
          count={editCat._id ? items.filter((x) => catsOf(x).length === 1 && catsOf(x)[0] === editCat._id).length : 0}
          onClose={() => setEditCat(null)}
          onSaved={(row, removed) => {
            setEditCat(null);
            load();
            counts();
            if (row && !editCat._id) setCat(row._id);
            if (removed) notify({ type: "success", text: m.saved });
          }}
          onFail={fail}
        />
      )}
      {editItem && (
        <ItemModal
          ctx={ctx}
          item={editItem}
          cats={cats}
          onClose={() => {
            setEditItem(null);
            load();
            counts();
          }}
          onChange={(row) => {
            setItems((list) => (list.some((x) => x._id === row._id) ? list.map((x) => (x._id === row._id ? row : x)) : [...list, row]));
            setEditItem(row);
          }}
          onFail={fail}
        />
      )}
    </div>
  );
}

function CatModal({ ctx, cat, count, onClose, onSaved, onFail }) {
  const { id, m, readOnly } = ctx;
  const [f, setF] = useState({ name_km: cat.name_km || "", name_en: cat.name_en || "", icon: cat.icon || "", active: cat.active !== false });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const save = async () => {
    setBusy("save");
    setError("");
    try {
      const r = cat._id ? await menuQrService.saveCategory(id, cat._id, f) : await menuQrService.addCategory(id, f);
      onSaved(r.data);
    } catch (e) {
      if (e.status === 402) {
        onClose();
        onFail(e);
      } else setError(e.message);
      setBusy("");
    }
  };
  const remove = async () => {
    if (!window.confirm(count ? m.deleteCatItems.replace("{name}", f.name_km || f.name_en).replace("{n}", count) : m.sure.replace("{name}", f.name_km || f.name_en))) return;
    setBusy("remove");
    try {
      await menuQrService.removeCategory(id, cat._id);
      onSaved(null, true);
    } catch (e) {
      setError(e.message);
      setBusy("");
    }
  };
  const EMOJI = ["☕", "🍵", "🧋", "🥤", "🍹", "🍺", "🍜", "🍚", "🍛", "🍲", "🥗", "🍔", "🍕", "🍗", "🥩", "🦐", "🍰", "🍦", "🥐", "🍳"];
  return (
    <Modal
      title={cat._id ? m.edit : m.addCategory}
      onClose={onClose}
      busy={!!busy}
      footer={
        <>
          {cat._id && (
            <button type="button" className="md-btn md-btn-ghost sa-danger-text" style={{ marginRight: "auto" }} onClick={remove} disabled={!!busy || readOnly}>
              {busy === "remove" ? <Loader2 size={14} className="md-spin" /> : <Trash2 size={14} />} {m.delete}
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={!!busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={!!busy || readOnly || (!f.name_km.trim() && !f.name_en.trim())} data-testid="mq-cat-save">
            {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {m.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <div className="md-fields-grid">
          <Field label={m.nameKm}>
            <input value={f.name_km} maxLength={60} onChange={(e) => setF({ ...f, name_km: e.target.value })} autoFocus data-testid="mq-cat-km" />
          </Field>
          <Field label={m.nameEn}>
            <input value={f.name_en} maxLength={60} onChange={(e) => setF({ ...f, name_en: e.target.value })} data-testid="mq-cat-en" />
          </Field>
        </div>
        <Field label={m.icon}>
          <div className="mq-emoji">
            <input value={f.icon} maxLength={8} onChange={(e) => setF({ ...f, icon: e.target.value })} className="mq-emoji-in" />
            {EMOJI.map((e) => (
              <button key={e} type="button" className={f.icon === e ? "on" : ""} onClick={() => setF({ ...f, icon: f.icon === e ? "" : e })}>
                {e}
              </button>
            ))}
          </div>
        </Field>
        <Switch checked={f.active} onChange={(v) => setF({ ...f, active: v })} label={m.show} />
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

function ItemModal({ ctx, item, cats, onClose, onChange, onFail }) {
  const { id, m, readOnly, data } = ctx;
  const promos = ctx.on("mq_promos");
  const [f, setF] = useState(() => ({
    name_km: item.name_km || "",
    name_en: item.name_en || "",
    desc_km: item.desc_km || "",
    desc_en: item.desc_en || "",
    category_ids: item.category_ids?.length ? item.category_ids.map(String) : item.category_id ? [String(item.category_id)] : cats[0] ? [cats[0]._id] : [],
    price: item.price ?? "",
    sale_price: item.sale_price ?? "",
    tags: item.tags || [],
    available: item.available !== false,
    active: item.active !== false,
  }));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const photos = item.photos || [];
  const save = async (close = true) => {
    setBusy("save");
    setError("");
    const body = { ...f, price: Number(f.price) || 0, sale_price: promos ? (f.sale_price === "" ? null : Number(f.sale_price)) : undefined };
    try {
      const r = item._id ? await menuQrService.saveItem(id, item._id, body) : await menuQrService.addItem(id, body);
      onChange(r.data);
      ctx.notify({ type: "success", text: m.saved });
      if (close && item._id) onClose();
    } catch (e) {
      if (e.status === 402) {
        onClose();
        onFail(e);
      } else setError(e.message);
    } finally {
      setBusy("");
    }
  };
  const [picking, setPicking] = useState(false);
  // link pictures chosen in the media library
  const attach = async (list) => {
    let row = item;
    setBusy("photo");
    for (const x of list.slice(0, data.limits.photos - photos.length)) {
      try {
        row = (await menuQrService.usePhoto(id, row._id, x._id)).data;
        onChange(row);
      } catch (e) {
        setError(e.message);
        break;
      }
    }
    setBusy("");
    setPicking(false);
  };
  const removePhoto = async (p) => {
    setBusy(`del-${p._id}`);
    try {
      onChange((await menuQrService.removePhoto(id, item._id, p._id)).data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  const cover = async (p) => {
    try {
      onChange((await menuQrService.orderPhotos(id, item._id, [p._id, ...photos.filter((x) => x._id !== p._id).map((x) => x._id)])).data);
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async () => {
    if (!window.confirm(m.sure.replace("{name}", f.name_km || f.name_en))) return;
    setBusy("remove");
    try {
      await menuQrService.removeItem(id, item._id);
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy("");
    }
  };
  const cur = data.settings.currency;
  return (
    <Modal
      title={item._id ? f.name_km || f.name_en || m.edit : m.addItem}
      onClose={onClose}
      busy={!!busy}
      size="md-modal-lg"
      footer={
        <>
          {item._id && (
            <button type="button" className="md-btn md-btn-ghost sa-danger-text" style={{ marginRight: "auto" }} onClick={remove} disabled={!!busy || readOnly}>
              {busy === "remove" ? <Loader2 size={14} className="md-spin" /> : <Trash2 size={14} />} {m.delete}
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={!!busy}>
            {m.close}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={() => save(true)} disabled={!!busy || readOnly || (!f.name_km.trim() && !f.name_en.trim()) || !f.category_ids.length} data-testid="mq-item-save">
            {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {m.save}
          </button>
        </>
      }
    >
      <div className="md-fields mq-item-form">
        <div className="md-fields-grid">
          <Field label={m.nameKm}>
            <input value={f.name_km} maxLength={80} onChange={(e) => setF({ ...f, name_km: e.target.value })} autoFocus data-testid="mq-item-km" />
          </Field>
          <Field label={m.nameEn}>
            <input value={f.name_en} maxLength={80} onChange={(e) => setF({ ...f, name_en: e.target.value })} data-testid="mq-item-en" />
          </Field>
          <Field label={`${m.price} (${cur === "KHR" ? "៛" : "$"})`}>
            <input type="number" min="0" step={cur === "KHR" ? 100 : 0.01} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} data-testid="mq-item-price" />
          </Field>
          <Field label={m.salePrice} hint={promos ? m.salePriceHint : null}>
            {promos ? (
              <input type="number" min="0" step={cur === "KHR" ? 100 : 0.01} value={f.sale_price} onChange={(e) => setF({ ...f, sale_price: e.target.value })} placeholder="—" />
            ) : (
              <button type="button" className="mq-lockfield" onClick={() => ctx.askBuy({ addon: "mq_promos" })}>
                <Lock size={13} /> {m.salePriceLocked}
              </button>
            )}
          </Field>
          <div className="mq-switches">
            <Switch checked={f.available} onChange={(v) => setF({ ...f, available: v })} label={m.available} />
            <Switch checked={f.active} onChange={(v) => setF({ ...f, active: v })} label={m.show} />
          </div>
        </div>
        <div className="md-fields-grid">
          <Field label={m.descKm}>
            <textarea rows={2} maxLength={400} value={f.desc_km} onChange={(e) => setF({ ...f, desc_km: e.target.value })} />
          </Field>
          <Field label={m.descEn}>
            <textarea rows={2} maxLength={400} value={f.desc_en} onChange={(e) => setF({ ...f, desc_en: e.target.value })} />
          </Field>
        </div>
        <Field label={m.categoriesPick} hint={m.categoriesHint}>
          <div className="mq-tagpick">
            {cats.map((c) => {
              const k = f.category_ids.indexOf(c._id);
              return (
                <button key={c._id} type="button" className={k >= 0 ? "on" : ""} onClick={() => setF({ ...f, category_ids: k >= 0 ? f.category_ids.filter((x) => x !== c._id) : [...f.category_ids, c._id] })} data-testid="mq-item-cat">
                  {k === 0 && "★ "}
                  {c.icon} {c.name_km || c.name_en}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label={m.tags}>
          <div className="mq-tagpick">
            {TAGS.map((t) => (
              <button key={t} type="button" className={f.tags.includes(t) ? "on" : ""} onClick={() => setF({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] })}>
                {TAG_ICON[t]} {m.tagNames[t]}
              </button>
            ))}
          </div>
        </Field>
        <Field label={`${m.photos} (${photos.length}/${data.limits.photos})`} hint={m.photosHint.replace("{n}", data.limits.photos)}>
          {!item._id ? (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => save(false)} disabled={!!busy || readOnly || (!f.name_km.trim() && !f.name_en.trim())} data-testid="mq-item-save-photos">
              <ImagePlus size={14} /> {m.save} → {m.addPhoto}
            </button>
          ) : (
            <div className="mq-photos">
              {photos.map((p, i) => (
                <div key={p._id} className={`mq-photo ${i === 0 ? "cover" : ""}`}>
                  <img src={p.url} alt="" />
                  {i === 0 && <em>★</em>}
                  <span>
                    {i > 0 && (
                      <button type="button" onClick={() => cover(p)} title={m.makeCover} aria-label={m.makeCover} disabled={readOnly}>
                        <Star size={13} />
                      </button>
                    )}
                    <button type="button" onClick={() => removePhoto(p)} aria-label={m.remove} disabled={readOnly || !!busy}>
                      {busy === `del-${p._id}` ? <Loader2 size={13} className="md-spin" /> : <X size={13} />}
                    </button>
                  </span>
                </div>
              ))}
              {photos.length < data.limits.photos && (
                <button type="button" className="mq-photo add" onClick={() => setPicking(true)} disabled={readOnly || !!busy} data-testid="mq-add-photo">
                  {busy === "photo" ? <Loader2 size={20} className="md-spin" /> : <ImagePlus size={20} />}
                  <small>{busy === "photo" ? m.uploading : m.fromMedia}</small>
                </button>
              )}
              {picking && <MediaPicker ctx={ctx} max={data.limits.photos - photos.length} onClose={() => setPicking(false)} onPick={attach} />}
            </div>
          )}
        </Field>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}
