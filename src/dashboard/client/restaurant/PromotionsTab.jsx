import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgePercent, CalendarDays, Clock3, Gift, Pencil, Plus, Search, Tag } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { Modal } from "../../super_admin/parts";
import { promoOn } from "../../../pos/calc";
import { AddonPrompt, DeleteButton, Field } from "./parts";
import { fmtMoney } from "./text";
import { usePromoText } from "./promo-text";

const nameOf = (x, lang) => (lang === "km" ? x?.name_km || x?.name_en : x?.name_en || x?.name_km) || "—";
const localToday = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

// on now / later / ended / off / waiting (right dates, outside its hours)
export function promoStatus(p) {
  if (!p.active) return "off";
  const today = localToday();
  if (p.end_date && today > p.end_date) return "ended";
  if (p.start_date && today < p.start_date) return "later";
  return promoOn(p, Date.now()) ? "on" : "waiting";
}

// Promotions (add-on): % off, $ off, buy X get Y on chosen items, with dates / days / hours
export default function PromotionsTab({ ctx }) {
  const { r, lang, settings, readOnly } = ctx;
  const p = usePromoText();
  const [data, setData] = useState(null); // { promos, items, categories }
  const [edit, setEdit] = useState(null);
  const active = ctx.addonOn("rest_promos");
  const c = settings.currency || "USD";

  const load = useCallback(async () => {
    const [promos, items, categories] = await Promise.all([
      active ? restaurantService.list(ctx.id, "promos").then((x) => x.data) : [],
      restaurantService.list(ctx.id, "items").then((x) => x.data),
      restaurantService.list(ctx.id, "categories").then((x) => x.data),
    ]);
    setData({ promos, items, categories });
  }, [ctx.id, active]);
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = (x) => {
    if (x.kind === "percent") return p.sumPercent.replace("{v}", x.value);
    if (x.kind === "amount") return p.sumAmount.replace("{v}", fmtMoney(x.value, c));
    return (x.get_percent >= 100 ? p.sumBxgy : p.sumBxgyPct).replace("{b}", x.buy).replace("{g}", x.get_qty).replace("{p}", x.get_percent);
  };
  const applies = (x) => {
    if (x.all_items) return p.allItems;
    const cats = (x.category_ids || []).map((id) =>
      nameOf(
        data.categories.find((cc) => cc._id === id),
        lang,
      ),
    );
    const n = (x.item_ids || []).length;
    return [...cats, n ? p.itemsN.replace("{n}", n) : ""].filter(Boolean).join(", ");
  };
  const when = (x) => {
    const fmt = (d) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
    const dates = x.start_date || x.end_date ? `${x.start_date ? fmt(x.start_date) : ""}${x.end_date ? ` – ${fmt(x.end_date)}` : x.start_date ? ` · ${p.noEnd}` : ""}` : "";
    const days = x.days?.length && x.days.length < 7 ? x.days.map((d) => p.dayNames[d]).join(" ") : p.everyDay;
    const hours = x.from && x.to ? `${x.from}–${x.to}` : p.allDay;
    return [dates, days, hours].filter(Boolean).join(" · ");
  };
  const idea = (kind) => {
    const base = { name: "", kind: "percent", value: 20, buy: 1, get_qty: 1, get_percent: 100, all_items: true, item_ids: [], category_ids: [], start_date: "", end_date: "", days: [], from: "", to: "", active: true };
    if (kind === "blank") return { ...base, value: 10 };
    if (kind === "happy") return { ...base, name: p.ideaHappy, from: "14:00", to: "17:00", days: [1, 2, 3, 4, 5] };
    if (kind === "b1g1") return { ...base, name: p.ideaB1G1, kind: "bxgy", all_items: false };
    if (kind === "amount") return { ...base, name: p.ideaAmount, kind: "amount", value: c === "KHR" ? 2000 : 0.5, all_items: false };
    return { ...base, name: p.ideaSecondHalf, kind: "bxgy", get_percent: 50, all_items: false };
  };
  const toggle = async (x) => {
    setData((d) => ({ ...d, promos: d.promos.map((y) => (y._id === x._id ? { ...y, active: !y.active } : y)) }));
    try {
      await restaurantService.update(ctx.id, "promos", x._id, { active: !x.active });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
      load();
    }
  };

  if (!data) return <ListSkeleton rows={4} />;
  return (
    <div className="rs-col">
      <section className="panel-card pt-hero">
        <span className="pt-ic">
          <BadgePercent size={26} />
        </span>
        <div>
          <h2>{p.title}</h2>
          <p className="rs-muted">{p.sub}</p>
        </div>
        {active && (
          <button type="button" className="md-btn md-btn-primary" onClick={() => setEdit(idea("blank"))} disabled={readOnly}>
            <Plus size={16} /> {p.add}
          </button>
        )}
      </section>

      {!active ? (
        <section className="panel-card">
          <AddonPrompt addonKey="rest_promos" ctx={ctx} />
        </section>
      ) : (
        <>
          <section className="panel-card">
            <h2 style={{ marginTop: 0 }}>{p.ideas}</h2>
            {data.promos.length === 0 && <p className="rs-muted">{p.none}</p>}
            <div className="pm-ideas">
              {[
                ["happy", Clock3, p.ideaHappy],
                ["b1g1", Gift, p.ideaB1G1],
                ["half", Gift, p.ideaSecondHalf],
                ["amount", Tag, p.ideaAmount],
              ].map(([k, Icon, label]) => (
                <button key={k} type="button" className="pm-idea" onClick={() => setEdit(idea(k))} disabled={readOnly}>
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
          </section>

          {data.promos.length > 0 && (
            <div className="pm-list">
              {data.promos.map((x) => {
                const st = promoStatus(x);
                return (
                  <article key={x._id} className={`panel-card pm-card s-${st}`}>
                    <span className="pm-ic">{x.kind === "bxgy" ? <Gift size={20} /> : <BadgePercent size={20} />}</span>
                    <div className="pm-text">
                      <b>
                        {x.name} <span className={`pm-pill s-${st}`}>{p.status[st]}</span>
                      </b>
                      <span className="pm-sum">{summary(x)}</span>
                      <small className="rs-muted">
                        <Tag size={12} /> {applies(x)}
                      </small>
                      <small className="rs-muted">
                        <CalendarDays size={12} /> {when(x)}
                      </small>
                    </div>
                    <label className="md-switch" title={p.active}>
                      <input type="checkbox" checked={x.active} onChange={() => toggle(x)} disabled={readOnly} aria-label={p.active} />
                      <span className="md-switch-track" />
                    </label>
                    <button type="button" className="md-icon-btn" onClick={() => setEdit(x)} aria-label={p.edit} disabled={readOnly}>
                      <Pencil size={15} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
          <p className="rs-muted pm-rules">{p.rules}</p>
        </>
      )}

      {edit && (
        <PromoModal
          ctx={ctx}
          p={p}
          row={edit}
          data={data}
          onClose={() => setEdit(null)}
          onSaved={async () => {
            setEdit(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function PromoModal({ ctx, p, row, data, onClose, onSaved }) {
  const { r, lang, settings } = ctx;
  const c = settings.currency || "USD";
  const [f, setF] = useState({
    name: row.name || "",
    kind: row.kind || "percent",
    value: row.value ?? 20,
    buy: row.buy ?? 1,
    get_qty: row.get_qty ?? 1,
    get_percent: row.get_percent ?? 100,
    all_items: !!row.all_items,
    item_ids: (row.item_ids || []).map(String),
    category_ids: (row.category_ids || []).map(String),
    start_date: row.start_date || "",
    end_date: row.end_date || "",
    days: row.days || [],
    from: row.from || "",
    to: row.to || "",
    active: row.active !== false,
  });
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleIn = (k, id) => setF({ ...f, [k]: f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id] });
  const items = useMemo(() => data.items.filter((i) => !q.trim() || `${i.name_en} ${i.name_km}`.toLowerCase().includes(q.trim().toLowerCase())), [data.items, q]);
  const can = f.name.trim() && (f.all_items || f.item_ids.length || f.category_ids.length) && (f.kind === "bxgy" || Number(f.value) > 0) && !f.from === !f.to;

  const save = async () => {
    setBusy(true);
    setError("");
    const body = { ...f, value: Number(f.value) || 0, buy: Number(f.buy) || 1, get_qty: Number(f.get_qty) || 1, get_percent: Number(f.get_percent) || 100 };
    try {
      if (row._id) await restaurantService.update(ctx.id, "promos", row._id, body);
      else await restaurantService.create(ctx.id, "promos", body);
      ctx.notify({ type: "success", text: r.saved });
      onSaved();
    } catch (e) {
      if (e.status === 402) ctx.askBuy("rest_promos");
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await restaurantService.remove(ctx.id, "promos", row._id);
      onSaved();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={row._id ? p.edit : p.add}
      onClose={onClose}
      busy={busy}
      size="md-modal-lg"
      footer={
        <>
          {row._id && <DeleteButton onDelete={remove} r={r} disabled={busy} />}
          <span style={{ flex: 1 }} />
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {r.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={!can || busy}>
            {busy ? r.saving : r.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <Field label={p.name} htmlFor="pm-name">
          <input id="pm-name" maxLength={60} value={f.name} onChange={set("name")} placeholder={p.namePh} autoFocus />
        </Field>
        <Field label={p.type}>
          <div className="rp-views pm-kinds">
            {["percent", "amount", "bxgy"].map((k) => (
              <button key={k} type="button" className={f.kind === k ? "on" : ""} onClick={() => setF({ ...f, kind: k })}>
                {p.kinds[k]}
              </button>
            ))}
          </div>
        </Field>
        {f.kind === "percent" && (
          <Field label={p.percent} htmlFor="pm-val">
            <input id="pm-val" type="number" min="1" max="100" step="1" value={f.value} onChange={set("value")} />
          </Field>
        )}
        {f.kind === "amount" && (
          <Field label={p.amountEach.replace("{c}", c)} htmlFor="pm-amt">
            <input id="pm-amt" type="number" min="0" step={c === "KHR" ? 100 : 0.05} value={f.value} onChange={set("value")} />
          </Field>
        )}
        {f.kind === "bxgy" && (
          <Field label={p.kinds.bxgy} hint={p.bxgyHint}>
            <div className="pm-bxgy">
              <span>{p.buy}</span>
              <input type="number" min="1" max="20" value={f.buy} onChange={set("buy")} aria-label={p.buy} />
              <span>{p.get}</span>
              <input type="number" min="1" max="20" value={f.get_qty} onChange={set("get_qty")} aria-label={p.get} />
              <span>{p.getAt}</span>
              <select value={f.get_percent} onChange={(e) => setF({ ...f, get_percent: Number(e.target.value) })} aria-label={p.getAt}>
                <option value={100}>{p.getFree}</option>
                {[75, 50, 30, 20, 10].map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </div>
          </Field>
        )}

        <Field label={p.appliesTo}>
          <div className="rp-views pm-kinds">
            <button type="button" className={f.all_items ? "on" : ""} onClick={() => setF({ ...f, all_items: true })}>
              {p.allItems}
            </button>
            <button type="button" className={!f.all_items ? "on" : ""} onClick={() => setF({ ...f, all_items: false })}>
              {p.chooseItems}
            </button>
          </div>
        </Field>
        {!f.all_items && (
          <div className="pm-pick">
            <small className="rs-muted">{p.categories}</small>
            <div className="pm-chips">
              {data.categories.map((cc) => (
                <button key={cc._id} type="button" className={f.category_ids.includes(cc._id) ? "on" : ""} onClick={() => toggleIn("category_ids", cc._id)}>
                  <i style={{ background: cc.color }} /> {nameOf(cc, lang)}
                </button>
              ))}
            </div>
            <small className="rs-muted">{p.items}</small>
            <div className="rp-search">
              <Search size={15} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={p.searchItems} aria-label={p.searchItems} />
            </div>
            <div className="pm-items">
              {items.map((i) => (
                <label key={i._id} className={f.item_ids.includes(i._id) ? "on" : ""}>
                  <input type="checkbox" checked={f.item_ids.includes(i._id)} onChange={() => toggleIn("item_ids", i._id)} />
                  <span>{nameOf(i, lang)}</span>
                  <small>{fmtMoney(i.price, c)}</small>
                </label>
              ))}
            </div>
          </div>
        )}

        <Field label={p.when}>
          <div className="md-fields-grid">
            <Field label={p.startDate} htmlFor="pm-start">
              <input id="pm-start" type="date" value={f.start_date} onChange={set("start_date")} />
            </Field>
            <Field label={p.endDate} htmlFor="pm-end">
              <input id="pm-end" type="date" value={f.end_date} min={f.start_date || undefined} onChange={set("end_date")} />
            </Field>
          </div>
        </Field>
        <Field label={p.days}>
          <div className="pm-chips">
            {p.dayNames.map((d, i) => (
              <button key={d} type="button" className={f.days.includes(i) ? "on" : ""} onClick={() => setF({ ...f, days: f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i].sort() })}>
                {d}
              </button>
            ))}
            {f.days.length > 0 && (
              <button type="button" className="ghost" onClick={() => setF({ ...f, days: [] })}>
                {p.everyDay}
              </button>
            )}
          </div>
        </Field>
        <Field label={p.hours} hint={p.hoursHint}>
          <div className="pm-hours">
            <input type="time" value={f.from} onChange={set("from")} aria-label={p.fromTime} />
            <span>→</span>
            <input type="time" value={f.to} onChange={set("to")} aria-label={p.toTime} />
          </div>
        </Field>
        <label className="md-switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{p.active}</span>
        </label>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}
