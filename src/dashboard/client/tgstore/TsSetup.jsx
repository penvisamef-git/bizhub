import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Copy, Download, ExternalLink, ImagePlus, MessageSquare, Package, Pencil, Plus, Printer, QrCode, Search, Send, Settings, Share2, Store, Trash2, Unplug, Users, X } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { Head, Switch } from "../menuqr/parts";
import { ago, fill, fmtNum, money } from "./text";

const copy = (ctx, text) => {
  navigator.clipboard?.writeText(text).catch(() => {});
  ctx.notify({ type: "success", text: ctx.x.copied });
};

// a QR drawn as SVG (the library loads only when needed)
export function Qr({ text, size = 168 }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let on = true;
    import("qrcode")
      .then((m) => m.default.toString(text, { type: "svg", margin: 1, color: { dark: "#1F1A16", light: "#FFFFFF" } }))
      .then((s) => on && setSvg(s))
      .catch(() => on && setSvg(""));
    return () => {
      on = false;
    };
  }, [text]);
  return <div className="ts-qr" style={{ width: size, height: size }} role="img" aria-label="QR" dangerouslySetInnerHTML={{ __html: svg }} />;
}

// ---------------------------------------------------------------- Products (+ categories)
const blankProduct = (cat = "") => ({ name: "", name_km: "", price: "", about: "", category_id: cat, stock: "", sold_out: false, hidden: false, options: [] });

function ProductModal({ ctx, product, categories, onClose, onSaved }) {
  const { x, api, cur } = ctx;
  const [f, setF] = useState(() => (product ? { ...product, price: String(product.price), stock: product.stock ?? "", category_id: product.category_id || "", options: product.options.map((g) => ({ ...g, choices: g.choices.map((c) => ({ ...c, price: c.price ? String(c.price) : "" })) })) } : blankProduct()));
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = useRef(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : product?.photo || ""), [file, product]);
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const setOpt = (i, patch) => setF((o) => ({ ...o, options: o.options.map((g, j) => (j === i ? { ...g, ...patch } : g)) }));
  const setChoice = (i, k, patch) => setOpt(i, { choices: f.options[i].choices.map((c, j) => (j === k ? { ...c, ...patch } : c)) });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        name: f.name,
        name_km: f.name_km,
        price: Number(f.price),
        about: f.about,
        category_id: f.category_id || null,
        stock: f.stock === "" ? null : Number(f.stock),
        sold_out: f.sold_out,
        hidden: f.hidden,
        options: f.options.map((g) => ({ name: g.name, multi: g.multi, required: g.required, choices: g.choices.filter((c) => c.name.trim()).map((c) => ({ name: c.name, price: Number(c.price) || 0 })) })).filter((g) => g.name.trim() && g.choices.length),
      };
      let r = product ? await api.saveProduct(product._id, body) : await api.addProduct(body);
      if (file) r = await api.productPhoto(r.data._id, file);
      onSaved(r.data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={product ? x.editProduct : x.addProduct}
      onClose={onClose}
      busy={busy}
      size="md-modal-lg"
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {x.cancel}
          </button>
          <button type="submit" form="ts-product" className="md-btn md-btn-primary" disabled={busy || !f.name.trim() || f.price === ""} data-testid="ts-product-save">
            {x.save}
          </button>
        </>
      }
    >
      <form id="ts-product" className="md-fields" onSubmit={save}>
        {error && <div className="md-form-error">{error}</div>}
        <div className="ts-photo-row">
          <button type="button" className="ts-photo" onClick={() => pick.current?.click()} aria-label={preview ? x.changePhoto : x.addPhoto}>
            {preview ? <img src={preview} alt="" /> : <ImagePlus size={26} />}
          </button>
          <input ref={pick} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
          <div className="ts-two" style={{ flex: 1 }}>
            <div className="md-field">
              <label htmlFor="tp-name">{x.name}</label>
              <input id="tp-name" value={f.name} maxLength={80} onChange={(e) => set("name", e.target.value)} required autoFocus data-testid="ts-p-name" />
            </div>
            <div className="md-field">
              <label htmlFor="tp-price">
                {x.price} ({cur === "KHR" ? "៛" : "$"})
              </label>
              <input id="tp-price" value={f.price} inputMode="decimal" onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} required data-testid="ts-p-price" />
            </div>
          </div>
        </div>
        <div className="ts-two">
          <div className="md-field">
            <label htmlFor="tp-km">{x.nameKm}</label>
            <input id="tp-km" value={f.name_km} maxLength={120} onChange={(e) => set("name_km", e.target.value)} />
          </div>
          <div className="md-field">
            <label htmlFor="tp-cat">{x.category}</label>
            <select id="tp-cat" value={f.category_id} onChange={(e) => set("category_id", e.target.value)}>
              <option value="">{x.noCategory}</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="md-field">
          <label htmlFor="tp-about">{x.about}</label>
          <input id="tp-about" value={f.about} maxLength={300} onChange={(e) => set("about", e.target.value)} />
        </div>
        <div className="ts-two">
          <div className="md-field">
            <label htmlFor="tp-stock">{x.stock}</label>
            <input id="tp-stock" value={f.stock} inputMode="numeric" onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} />
            <span className="md-hint">{x.stockHint}</span>
          </div>
          <div className="ts-switches">
            <Switch checked={f.sold_out} onChange={(v) => set("sold_out", v)} label={x.soldOut} />
            <Switch checked={f.hidden} onChange={(v) => set("hidden", v)} label={x.hidden} />
          </div>
        </div>
        <div className="ts-opts">
          <div className="ts-opts-head">
            <b>{x.options}</b>
            <span className="md-hint">{x.optionsHint}</span>
          </div>
          {f.options.map((g, i) => (
            <div key={i} className="ts-opt">
              <div className="ts-opt-top">
                <input aria-label={x.optionName} value={g.name} placeholder={x.optionNamePh} maxLength={40} onChange={(e) => setOpt(i, { name: e.target.value })} />
                <Switch checked={g.required} onChange={(v) => setOpt(i, { required: v, multi: v ? false : g.multi })} label={x.required} />
                <Switch checked={g.multi} onChange={(v) => setOpt(i, { multi: v, required: v ? false : g.required })} label={x.multi} />
                <button type="button" className="md-icon-btn" aria-label={x.delete} onClick={() => setF((o) => ({ ...o, options: o.options.filter((_, j) => j !== i) }))}>
                  <Trash2 size={15} />
                </button>
              </div>
              {g.choices.map((c, k) => (
                <div key={k} className="ts-choice">
                  <input aria-label={x.choice} value={c.name} placeholder={x.choicePh} maxLength={40} onChange={(e) => setChoice(i, k, { name: e.target.value })} />
                  <input aria-label={x.extra} value={c.price} placeholder={x.extra} inputMode="decimal" onChange={(e) => setChoice(i, k, { price: e.target.value.replace(/[^\d.]/g, "") })} />
                  <button type="button" className="md-icon-btn" aria-label={x.delete} onClick={() => setOpt(i, { choices: g.choices.filter((_, j) => j !== k) })}>
                    <X size={15} />
                  </button>
                </div>
              ))}
              {g.choices.length < 12 && (
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setOpt(i, { choices: [...g.choices, { name: "", price: "" }] })}>
                  <Plus size={14} /> {x.addChoice}
                </button>
              )}
            </div>
          ))}
          {f.options.length < 6 && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setF((o) => ({ ...o, options: [...o.options, { name: "", required: false, multi: false, choices: [{ name: "", price: "" }, { name: "", price: "" }] }] }))} data-testid="ts-add-option">
              <Plus size={14} /> {x.addOption}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

export function ProductsTab({ ctx }) {
  const { x, api, readOnly, cur, lang } = ctx;
  const [cats, setCats] = useState(null);
  const [rows, setRows] = useState(null);
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [newCat, setNewCat] = useState(null); // { name, name_km }
  const [error, setError] = useState("");
  const load = useCallback(() => Promise.all([api.categories(), api.products()]).then(([c, p]) => {
    setCats(c.data);
    setRows(p.data);
  }).catch((e) => setError(e.message)), [api]);
  useEffect(() => {
    load();
  }, [load]);
  const run = async (fn, ok) => {
    try {
      await fn();
      await load();
      ctx.reload();
      if (ok) ctx.notify({ type: "success", text: ok });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const shown = (rows || []).filter((p) => !cat || (cat === "none" ? !p.category_id : p.category_id === cat));
  const catName = (c) => (lang === "km" && c.name_km) || c.name;

  return (
    <div className="rs-tab">
      <Head icon={Package} title={x.tabs.products} sub={x.productsSub}>
        <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setEditing(null)} disabled={readOnly} data-testid="ts-add-product">
          <Plus size={15} /> {x.addProduct}
        </button>
      </Head>
      {error && <div className="md-form-error">{error}</div>}
      <section className="panel-card">
        <div className="ts-cats">
          <span className="ts-cats-label">{x.categories}</span>
          <button type="button" className={`ts-cat ${cat === "" ? "on" : ""}`} onClick={() => setCat("")}>
            {x.allCats}
          </button>
          {(cats || []).map((c) => (
            <span key={c._id} className={`ts-cat ${cat === c._id ? "on" : ""}`}>
              <button type="button" onClick={() => setCat(c._id)}>
                {catName(c)}
              </button>
              {!readOnly && (
                <button type="button" className="ts-cat-x" aria-label={x.delete} onClick={() => window.confirm(fill(x.removeCategoryAsk, { name: c.name })) && run(() => api.removeCategory(c._id), x.saved)}>
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
          {rows?.some((p) => !p.category_id) && (cats || []).length > 0 && (
            <button type="button" className={`ts-cat ${cat === "none" ? "on" : ""}`} onClick={() => setCat("none")}>
              {x.noCategory}
            </button>
          )}
          {!readOnly && !newCat && (
            <button type="button" className="ts-cat add" onClick={() => setNewCat({ name: "", name_km: "" })} data-testid="ts-add-cat">
              <Plus size={13} /> {x.addCategory}
            </button>
          )}
        </div>
        {newCat && (
          <form
            className="ts-cat-form"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => api.addCategory(newCat), x.saved).then(() => setNewCat(null));
            }}
          >
            <input aria-label={x.categoryName} placeholder={x.categoryName} value={newCat.name} maxLength={60} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} autoFocus required data-testid="ts-cat-name" />
            <input aria-label={x.categoryNameKm} placeholder={x.categoryNameKm} value={newCat.name_km} maxLength={80} onChange={(e) => setNewCat({ ...newCat, name_km: e.target.value })} />
            <button type="submit" className="md-btn md-btn-primary sa-btn-sm" data-testid="ts-cat-save">
              {x.add}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setNewCat(null)}>
              {x.cancel}
            </button>
          </form>
        )}
      </section>
      {rows === null ? (
        <div className="ts-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel-card ts-skel" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <section className="panel-card sa-empty-state">
          <Package size={26} />
          <p>{x.noProducts}</p>
        </section>
      ) : (
        <div className="ts-grid">
          {shown.map((p) => (
            <article key={p._id} className={`panel-card ts-product ${p.hidden ? "is-hidden" : ""}`} data-testid="ts-product">
              <div className="ts-product-pic">{p.photo ? <img src={p.photo} alt="" /> : <Camera size={22} />}</div>
              <div className="ts-product-body">
                <b>{(lang === "km" && p.name_km) || p.name}</b>
                <span className="ts-price">{money(p.price, cur)}</span>
                <span className="ts-product-meta">
                  {p.sold_out ? <span className="ts-pill st-cancelled">{x.soldOut}</span> : p.stock !== null && <span className="ts-pill">{fill(x.left, { n: fmtNum(p.stock) })}</span>}
                  {p.hidden && <span className="ts-pill">{x.hidden}</span>}
                  {p.options.length > 0 && <span className="ts-pill">{p.options.map((g) => g.name).join(" · ")}</span>}
                </span>
              </div>
              <div className="ts-product-acts">
                <button type="button" className="md-icon-btn" aria-label={x.edit} onClick={() => setEditing(p)} disabled={readOnly}>
                  <Pencil size={15} />
                </button>
                <button type="button" className="md-icon-btn" aria-label={x.delete} onClick={() => window.confirm(fill(x.removeProductAsk, { name: p.name })) && run(() => api.removeProduct(p._id), x.saved)} disabled={readOnly}>
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing !== undefined && (
        <ProductModal
          ctx={ctx}
          product={editing}
          categories={cats || []}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            load();
            ctx.reload();
            ctx.notify({ type: "success", text: x.saved });
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Customers
export function CustomersTab({ ctx }) {
  const { x, api, cur } = ctx;
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => api.customers({ q }).then((r) => setRows(r.data)).catch(() => setRows([])), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [api, q]);
  return (
    <div className="rs-tab">
      <Head icon={Users} title={x.tabs.customers} sub={x.customersSub} />
      <section className="panel-card">
        <label className="ts-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={x.search} aria-label={x.search} />
        </label>
        {rows === null ? null : rows.length === 0 ? (
          <p className="rs-muted">{x.noCustomers}</p>
        ) : (
          <ul className="ts-customers">
            {rows.map((c) => (
              <li key={c._id}>
                <span className="ts-av">{(c.name || "?").slice(0, 1).toUpperCase()}</span>
                <span className="ts-who">
                  <b>{c.name || c.phone}</b>
                  <small>{[c.phone, c.username && `@${c.username}`, c.telegram ? "Telegram" : ""].filter(Boolean).join(" · ")}</small>
                </span>
                <span className="ts-cust-stats">
                  <b>{fill(x.ordersN, { n: c.orders })}</b>
                  <small>
                    {fill(x.spent, { total: money(c.spent, cur) })}
                    {c.last_order_at ? ` · ${ago(c.last_order_at, x)}` : ""}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Store settings
export function StoreTab({ ctx }) {
  const { x, api, data, put, readOnly } = ctx;
  const s = data.store;
  const [f, setF] = useState(() => JSON.parse(JSON.stringify({ shop_name: s.shop_name, phone: s.phone, address: s.address, about: s.about, color: s.color, currency: s.currency, open: s.open, delivery: s.delivery, pickup: s.pickup, dine_in: s.dine_in, pay: s.pay })));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const logoPick = useRef(null);
  const set = (path, v) =>
    setF((o) => {
      const n = JSON.parse(JSON.stringify(o));
      const keys = path.split(".");
      let t = n;
      keys.slice(0, -1).forEach((k) => (t = t[k]));
      t[keys.at(-1)] = v;
      return n;
    });
  const num = (v) => String(v ?? "").replace(/[^\d.]/g, "");
  const save = async (e) => {
    e.preventDefault();
    setBusy("save");
    setError("");
    try {
      const body = { ...f, delivery: { ...f.delivery, fee: Number(f.delivery.fee) || 0, free_from: Number(f.delivery.free_from) || 0, min_order: Number(f.delivery.min_order) || 0 }, dine_in: { ...f.dine_in, tables: Number(f.dine_in.tables) || 1 } };
      const r = await api.save(body);
      put({ store: r.data.store });
      ctx.notify({ type: "success", text: x.saved });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  const logo = async (file) => {
    setBusy("logo");
    try {
      const r = file ? await api.logo(file) : await api.removeLogo();
      put((d) => ({ store: { ...d.store, logo: r.data.logo } }));
    } catch (err) {
      ctx.notify({ type: "error", text: err.message });
    } finally {
      setBusy("");
    }
  };
  const cur = f.currency === "KHR" ? "៛" : "$";
  return (
    <form className="rs-tab" onSubmit={save}>
      <Head icon={Settings} title={x.tabs.store} sub={x.storeSub}>
        <button type="submit" className="md-btn md-btn-primary sa-btn-sm" disabled={readOnly || busy === "save"} data-testid="ts-store-save">
          {x.save}
        </button>
      </Head>
      {error && <div className="md-form-error">{error}</div>}
      <section className="panel-card md-fields">
        <h3 className="ts-h3">
          <Store size={17} /> {x.shop}
        </h3>
        <div className="ts-photo-row">
          <button type="button" className="ts-photo round" onClick={() => logoPick.current?.click()} disabled={readOnly || busy === "logo"} aria-label={x.addLogo} style={{ background: s.logo ? undefined : f.color }}>
            {s.logo ? <img src={s.logo} alt="" /> : <Send size={24} color="#FFFFFF" />}
          </button>
          <input ref={logoPick} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && logo(e.target.files[0])} />
          <div className="ts-two" style={{ flex: 1 }}>
            <div className="md-field">
              <label htmlFor="ts-name">{x.shopName}</label>
              <input id="ts-name" value={f.shop_name} maxLength={80} onChange={(e) => set("shop_name", e.target.value)} />
            </div>
            <div className="md-field">
              <label htmlFor="ts-phone">{x.phone}</label>
              <input id="ts-phone" value={f.phone} maxLength={40} inputMode="tel" onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="md-field">
          <label htmlFor="ts-about">{x.aboutShop}</label>
          <input id="ts-about" value={f.about} maxLength={300} placeholder={x.aboutShopPh} onChange={(e) => set("about", e.target.value)} />
        </div>
        <div className="md-field">
          <label htmlFor="ts-addr">{x.address}</label>
          <input id="ts-addr" value={f.address} maxLength={200} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="ts-two">
          <div className="md-field">
            <label htmlFor="ts-color">{x.color}</label>
            <input id="ts-color" type="color" value={f.color || "#C4470F"} onChange={(e) => set("color", e.target.value.toUpperCase())} className="ts-color" />
          </div>
          <div className="md-field">
            <label htmlFor="ts-cur">{x.currency}</label>
            <select id="ts-cur" value={f.currency} onChange={(e) => set("currency", e.target.value)}>
              <option value="USD">USD $</option>
              <option value="KHR">KHR ៛</option>
            </select>
          </div>
        </div>
        <Switch checked={f.open} onChange={(v) => set("open", v)} label={x.isOpen} testid="ts-open" />
        <span className="md-hint">{x.isOpenHint}</span>
      </section>

      <section className="panel-card md-fields">
        <h3 className="ts-h3">{x.getting}</h3>
        <Switch checked={f.delivery.on} onChange={(v) => set("delivery.on", v)} label={x.delivery} />
        {f.delivery.on && (
          <div className="ts-sub">
            <div className="ts-three">
              <div className="md-field">
                <label htmlFor="ts-fee">
                  {x.fee} ({cur})
                </label>
                <input id="ts-fee" value={f.delivery.fee} inputMode="decimal" onChange={(e) => set("delivery.fee", num(e.target.value))} />
              </div>
              <div className="md-field">
                <label htmlFor="ts-free">
                  {x.freeFrom} ({cur})
                </label>
                <input id="ts-free" value={f.delivery.free_from} inputMode="decimal" onChange={(e) => set("delivery.free_from", num(e.target.value))} />
                <span className="md-hint">{x.freeFromHint}</span>
              </div>
              <div className="md-field">
                <label htmlFor="ts-min">
                  {x.minOrder} ({cur})
                </label>
                <input id="ts-min" value={f.delivery.min_order} inputMode="decimal" onChange={(e) => set("delivery.min_order", num(e.target.value))} />
              </div>
            </div>
            <div className="md-field">
              <label htmlFor="ts-dnote">{x.deliveryNote}</label>
              <input id="ts-dnote" value={f.delivery.note} maxLength={160} placeholder={x.deliveryNotePh} onChange={(e) => set("delivery.note", e.target.value)} />
            </div>
          </div>
        )}
        <Switch checked={f.pickup.on} onChange={(v) => set("pickup.on", v)} label={x.pickup} />
        {f.pickup.on && (
          <div className="ts-sub md-field">
            <label htmlFor="ts-pnote">{x.pickupNote}</label>
            <input id="ts-pnote" value={f.pickup.note} maxLength={160} onChange={(e) => set("pickup.note", e.target.value)} />
          </div>
        )}
        <Switch checked={f.dine_in.on} onChange={(v) => set("dine_in.on", v)} label={x.dineIn} />
        {f.dine_in.on && (
          <div className="ts-sub md-field" style={{ maxWidth: 220 }}>
            <label htmlFor="ts-tables">{x.tables}</label>
            <input id="ts-tables" value={f.dine_in.tables} inputMode="numeric" onChange={(e) => set("dine_in.tables", e.target.value.replace(/\D/g, ""))} />
          </div>
        )}
      </section>

      <section className="panel-card md-fields">
        <h3 className="ts-h3">{x.paying}</h3>
        <Switch checked={f.pay.khqr.on} onChange={(v) => set("pay.khqr.on", v)} label={x.khqr} testid="ts-khqr" />
        <span className="md-hint">
          {x.khqrHint} {data.khqr_auto ? x.khqrAuto : x.khqrManual}
        </span>
        {f.pay.khqr.on && (
          <div className="ts-sub ts-two">
            <div className="md-field">
              <label htmlFor="ts-bakong">{x.bakongId}</label>
              <input id="ts-bakong" value={f.pay.khqr.bakong_id} maxLength={60} placeholder={x.bakongIdPh} onChange={(e) => set("pay.khqr.bakong_id", e.target.value.trim())} data-testid="ts-bakong" />
            </div>
            <div className="md-field">
              <label htmlFor="ts-accname">{x.accountName}</label>
              <input id="ts-accname" value={f.pay.khqr.account_name} maxLength={40} onChange={(e) => set("pay.khqr.account_name", e.target.value)} />
            </div>
          </div>
        )}
        <Switch checked={f.pay.cash.on} onChange={(v) => set("pay.cash.on", v)} label={x.cash} />
      </section>
    </form>
  );
}

// ---------------------------------------------------------------- Share & Telegram
function printTables(name, n, linkOf, label) {
  import("qrcode").then(async (m) => {
    const cells = [];
    for (let i = 1; i <= n; i += 1) cells.push(`<div class="c"><div class="q">${await m.default.toString(linkOf(i), { type: "svg", margin: 1 })}</div><b>${label.replace("{n}", i)}</b><small>${name.replace(/</g, "&lt;")}</small></div>`);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${name.replace(/</g, "&lt;")} — QR</title><style>body{margin:0;font-family:system-ui,sans-serif}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:10mm;padding:10mm}.c{border:1px solid #ddd;border-radius:6mm;padding:6mm;text-align:center;break-inside:avoid}.q svg{width:100%;height:auto}b{display:block;font-size:22pt;margin-top:2mm}small{color:#555}</style></head><body><div class="g">${cells.join("")}</div><script>setTimeout(()=>print(),300)</script></body></html>`);
    w.document.close();
  });
}

export function ShareTab({ ctx }) {
  const { x, api, data, put, readOnly } = ctx;
  const s = data.store;
  const tg = data.telegram;
  const main = data.links.telegram || data.links.web;
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState("");
  const channel = fill(x.channelText, { name: s.shop_name, link: main });
  const run = async (key, fn, ok) => {
    setBusy(key);
    try {
      const r = await fn();
      if (ok) ctx.notify({ type: "success", text: r?.message || ok });
      return r;
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
      return null;
    } finally {
      setBusy("");
    }
  };
  const downloadQr = () =>
    import("qrcode").then((m) =>
      m.default.toDataURL(main, { width: 1024, margin: 2 }).then((url) => {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${s.slug}-qr.png`;
        a.click();
      }),
    );
  return (
    <div className="rs-tab">
      <Head icon={Share2} title={x.tabs.share} sub={x.shareSub} />
      <section className="panel-card ts-share">
        <Qr text={main} />
        <div className="ts-share-links">
          {data.links.telegram ? (
            <div className="ts-link">
              <span className="ts-link-label">
                <Send size={14} /> {x.tgLink}
              </span>
              <code data-testid="ts-tg-link">{data.links.telegram}</code>
              <div className="ts-order-acts">
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => copy(ctx, data.links.telegram)}>
                  <Copy size={14} /> {x.copyLink}
                </button>
                <a className="md-btn md-btn-ghost sa-btn-sm" href={data.links.telegram} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} /> Telegram
                </a>
              </div>
            </div>
          ) : (
            <p className="md-notice">{x.tgNotReady}</p>
          )}
          <div className="ts-link">
            <span className="ts-link-label">
              <ExternalLink size={14} /> {x.webLink}
            </span>
            <code>{data.links.web}</code>
            <div className="ts-order-acts">
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => copy(ctx, data.links.web)}>
                <Copy size={14} /> {x.copyLink}
              </button>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={downloadQr}>
                <Download size={14} /> {x.download} QR
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card md-fields">
        <h3 className="ts-h3">
          <MessageSquare size={17} /> {x.staff}
        </h3>
        <p className="rs-muted">{x.staffSub}</p>
        {!tg.configured ? (
          <p className="md-notice">{x.tgNotReady}</p>
        ) : tg.connected ? (
          <div className="ts-order-acts">
            <span className="ts-pill pay-paid" data-testid="ts-tg-connected">
              {fill(x.connected, { name: tg.chat_name || "Telegram" })}
            </span>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={!!busy || readOnly} onClick={() => run("test", api.tgTest, x.saved)}>
              <Send size={14} /> {x.test}
            </button>
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              disabled={!!busy || readOnly}
              onClick={() => run("off", api.tgOff).then((r) => r && put((d) => ({ telegram: { ...d.telegram, connected: false, chat_name: "" } })))}
            >
              <Unplug size={14} /> {x.disconnect}
            </button>
          </div>
        ) : (
          <>
            <span className="rs-muted">{x.notConnected}</span>
            {!link ? (
              <div>
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" disabled={!!busy || readOnly} onClick={() => run("link", api.tgLink).then((r) => r && setLink(r.data))} data-testid="ts-tg-connect">
                  <Send size={14} /> {x.connect}
                </button>
              </div>
            ) : (
              <div className="ts-sub md-fields">
                <span className="md-hint">{x.connectHint}</span>
                <div className="ts-order-acts">
                  <a className="md-btn md-btn-primary sa-btn-sm" href={link.group_url} target="_blank" rel="noreferrer">
                    <Users size={14} /> {x.connectGroup}
                  </a>
                  <a className="md-btn md-btn-ghost sa-btn-sm" href={link.url} target="_blank" rel="noreferrer">
                    <Send size={14} /> {x.connectMe}
                  </a>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.reload()}>
                    {x.refresh}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel-card md-fields">
        <h3 className="ts-h3">
          <Send size={17} /> {x.channel}
        </h3>
        <p className="rs-muted">{x.channelSub}</p>
        <pre className="ts-channel">{channel}</pre>
        <div>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => copy(ctx, channel)}>
            <Copy size={14} /> {x.copyText}
          </button>
        </div>
      </section>

      {s.dine_in?.on && (
        <section className="panel-card md-fields">
          <h3 className="ts-h3">
            <QrCode size={17} /> {x.tableQrs}
          </h3>
          <p className="rs-muted">{x.tableQrsSub}</p>
          <div className="ts-tables">
            {Array.from({ length: Math.min(s.dine_in.tables || 0, 6) }, (_, i) => (
              <figure key={i}>
                <Qr text={`${data.links.web}?table=${i + 1}`} size={96} />
                <figcaption>{fill(x.table, { n: i + 1 })}</figcaption>
              </figure>
            ))}
          </div>
          <div>
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => printTables(s.shop_name, s.dine_in.tables || 1, (n) => `${data.links.web}?table=${n}`, x.table)}>
              <Printer size={14} /> {x.print} ({s.dine_in.tables})
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
