import { useCallback, useEffect, useState } from "react";
import { BadgePercent, CalendarRange, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { guestHouseService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { Modal } from "../../super_admin/parts";
import { fmtDay, money, todayKH } from "./text";
import { prText } from "./gh2-text";

// Owner: Promotions (gh_promos, forever) — season / date deals shown on the website
const after = (kind, value, price) => (kind === "percent" ? Math.max(0, price * (1 - Math.min(100, value) / 100)) : kind === "amount" ? Math.max(0, price - value) : Math.min(price, value));

export function PromosTab({ ctx }) {
  const { lang, data, readOnly, cur } = ctx;
  const p = prText(lang);
  const [info, setInfo] = useState(null);
  const [edit, setEdit] = useState(null); // {} new | row
  const load = useCallback(
    () =>
      guestHouseService
        .promos(ctx.id)
        .then((r) => setInfo(r))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load, data.addons?.gh_promos?.active]);
  if (!info) return <ListSkeleton rows={4} />;
  const today = todayKH();
  const typeName = (id) => data.types.find((t) => t._id === id)?.name || "—";
  const stateOf = (r) => (!r.active ? ["paused", p.paused] : r.to < today ? ["ended", p.ended] : r.from > today ? ["upcoming", p.upcoming.replace("{date}", fmtDay(r.from, lang))] : ["running", p.running]);
  const toggle = async (r) => {
    try {
      await guestHouseService.savePromo(ctx.id, r._id, { active: !r.active });
      load();
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "gh_promos" });
      else ctx.notify({ type: "error", text: e.message });
    }
  };
  return (
    <div className="rs-col">
      <section className="panel-card ghpr-hero">
        <span className="rs-addon-ic">
          <BadgePercent size={24} />
        </span>
        <div>
          <h2 style={{ margin: 0 }}>{p.title}</h2>
          <p className="rs-muted" style={{ margin: "4px 0 0" }}>
            {info.on ? p.sub : p.off.replace("{price}", info.price)}
          </p>
        </div>
        {info.on ? (
          <button type="button" className="md-btn md-btn-primary" onClick={() => setEdit({})} disabled={readOnly}>
            <Plus size={16} /> {p.add}
          </button>
        ) : (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon: "gh_promos" })} disabled={readOnly}>
            <CoinIcon size={15} /> {p.unlock.replace("{coins}", info.price)}
          </button>
        )}
      </section>
      {!info.data.length ? (
        <section className="panel-card ghpm-empty">
          <BadgePercent size={40} />
          <p className="rs-muted">{p.none}</p>
        </section>
      ) : (
        <div className="ghpm-list">
          {info.data.map((r) => {
            const [st, label] = stateOf(r);
            const sample = data.types.find((t) => !r.type_ids.length || r.type_ids.includes(t._id));
            return (
              <article key={r._id} className={`panel-card ghpm s-${st}`}>
                <div className="ghpm-badge">{r.badge || (r.kind === "percent" ? `-${r.value}%` : r.kind === "amount" ? `-${money(r.value, cur)}` : money(r.value, cur))}</div>
                <div className="ghpm-main">
                  <div className="ghpm-top">
                    <b>{r.name}</b>
                    <span className={`ghpm-state s-${st}`}>{label}</span>
                  </div>
                  <span className="ghpm-line">
                    <CalendarRange size={14} /> {p.nights.replace("{from}", fmtDay(r.from, lang)).replace("{to}", fmtDay(r.to, lang))}
                  </span>
                  <span className="ghpm-line">
                    {p.kinds[r.kind]} · {r.type_ids.length ? r.type_ids.map(typeName).join(", ") : p.allTypes}
                  </span>
                  {sample && (
                    <small className="rs-muted">
                      {sample.name}: <s>{money(sample.price, cur)}</s> → <b>{money(after(r.kind, r.value, sample.price), cur)}</b> {p.perNight}
                    </small>
                  )}
                </div>
                <div className="ghpm-act">
                  <button type="button" className={`ghpm-switch ${r.active ? "on" : ""}`} onClick={() => toggle(r)} disabled={readOnly} aria-label={p.active}>
                    <i />
                  </button>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setEdit(r)} disabled={readOnly}>
                    <Pencil size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {edit && (
        <PromoForm
          ctx={ctx}
          p={p}
          row={edit}
          onClose={() => setEdit(null)}
          onDone={() => {
            setEdit(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function PromoForm({ ctx, p, row, onClose, onDone }) {
  const { data, cur, lang } = ctx;
  const today = todayKH();
  const [f, setF] = useState({
    name: row.name || "",
    kind: row.kind || "percent",
    value: row.value ?? "",
    type_ids: row.type_ids || [],
    from: row.from || today,
    to: row.to || today,
    badge: row.badge || "",
    note: row.note || "",
    active: row.active !== false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sure, setSure] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      ctx.notify({ type: "success", text: ctx.g.saved });
      onDone();
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "gh_promos" });
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const save = (e) => {
    e.preventDefault();
    const body = { ...f, value: Number(f.value) };
    run(() => (row._id ? guestHouseService.savePromo(ctx.id, row._id, body) : guestHouseService.addPromo(ctx.id, body)));
  };
  const pick = (id) => setF((x) => ({ ...x, type_ids: x.type_ids.includes(id) ? x.type_ids.filter((y) => y !== id) : [...x.type_ids, id] }));
  const sample = data.types.find((t) => !f.type_ids.length || f.type_ids.includes(t._id));
  return (
    <Modal
      title={row._id ? p.edit : p.add}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {row._id &&
            (sure ? (
              <button type="button" className="md-btn md-btn-danger" style={{ marginRight: "auto" }} onClick={() => run(() => guestHouseService.removePromo(ctx.id, row._id))} disabled={busy}>
                <Trash2 size={15} /> {p.sure}
              </button>
            ) : (
              <button type="button" className="md-btn md-btn-ghost sa-danger-text" style={{ marginRight: "auto" }} onClick={() => setSure(true)} disabled={busy}>
                <Trash2 size={15} /> {p.del}
              </button>
            ))}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {p.cancel}
          </button>
          <button type="submit" form="ghpm-form" className="md-btn md-btn-primary" disabled={busy || !f.name.trim() || !(Number(f.value) > 0)}>
            <Check size={15} /> {p.save}
          </button>
        </>
      }
    >
      <form id="ghpm-form" className="ghpm-form" onSubmit={save}>
        <label className="ghw-in">
          <small className="ghw-label">{p.name}</small>
          <input value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={p.namePh} autoFocus />
        </label>
        <div className="ghw-in">
          <small className="ghw-label">{p.kind}</small>
          <div className="ghpr-seg">
            {["percent", "amount", "price"].map((k) => (
              <button key={k} type="button" className={f.kind === k ? "on" : ""} onClick={() => setF({ ...f, kind: k })}>
                {p.kinds[k]}
              </button>
            ))}
          </div>
        </div>
        <label className="ghw-in">
          <small className="ghw-label">
            {p.value} {f.kind === "percent" ? "(%)" : `(${cur})`}
          </small>
          <input type="number" inputMode="decimal" min={0} max={f.kind === "percent" ? 100 : undefined} step="any" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
        </label>
        <div className="ghw-in">
          <small className="ghw-label">{p.types}</small>
          <div className="ghw-chips">
            <button type="button" className={!f.type_ids.length ? "on" : ""} onClick={() => setF({ ...f, type_ids: [] })}>
              {!f.type_ids.length && <Check size={14} />} {p.allTypes}
            </button>
            {data.types.map((t) => (
              <button key={t._id} type="button" className={f.type_ids.includes(t._id) ? "on" : ""} onClick={() => pick(t._id)}>
                {f.type_ids.includes(t._id) && <Check size={14} />} {t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="ghw-grid2">
          <label className="ghw-in">
            <small className="ghw-label">{p.from}</small>
            <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, to: f.to < e.target.value ? e.target.value : f.to })} />
          </label>
          <label className="ghw-in">
            <small className="ghw-label">{p.to}</small>
            <input type="date" min={f.from} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
          </label>
        </div>
        <div className="ghw-grid2">
          <label className="ghw-in">
            <small className="ghw-label">{p.badge}</small>
            <input value={f.badge} maxLength={24} onChange={(e) => setF({ ...f, badge: e.target.value })} placeholder={p.badgePh} />
          </label>
          <label className="ghw-mini ghw-check" style={{ alignSelf: "end" }}>
            <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> {p.active}
          </label>
        </div>
        <label className="ghw-in">
          <small className="ghw-label">{p.note}</small>
          <input value={f.note} maxLength={200} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </label>
        {sample && Number(f.value) > 0 && (
          <div className="ghpm-preview">
            <BadgePercent size={18} />
            <span>
              {sample.name}: <s>{money(sample.price, cur)}</s> → <b>{money(after(f.kind, Number(f.value), sample.price), cur)}</b> {p.perNight} · {fmtDay(f.from, lang)} → {fmtDay(f.to, lang)}
            </span>
          </div>
        )}
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}
