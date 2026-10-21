import { useState } from "react";
import { CalendarX, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { DeleteButton, Field } from "../restaurant/parts";
import { fmtDay, fmtDayTime, money, todayKH } from "./text";
import { useXText } from "./xtext";
import { AddonHead, ProductPick, addonOn, useLoad, useSave } from "./MartGrowKit";

const daysTo = (day) => Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${todayKH()}T00:00:00Z`)) / 86400000);

// Expiry dates (mart_expiry): batches on the shelf (soonest first), waste record
export function ExpiryTab({ ctx }) {
  const x = useXText();
  const { cur, lang, readOnly } = ctx;
  const on = addonOn(ctx, "mart_expiry");
  const [show, setShow] = useState("soon");
  const [data, load] = useLoad(ctx, () => (on ? ctx.api.expiry(ctx.id) : Promise.resolve({ data: null })), [on]);
  const [prods] = useLoad(ctx, () => (on ? ctx.api.products(ctx.id) : Promise.resolve({ data: [] })), [on]);
  const [month, setMonth] = useState(todayKH().slice(0, 7));
  const [waste, loadWaste] = useLoad(ctx, () => (on ? ctx.api.wasteList(ctx.id, { month }) : Promise.resolve({ data: null })), [on, month]);
  const [modal, setModal] = useState(null);
  const [days, setDays] = useState("");
  const reload = () => {
    load();
    loadWaste();
  };
  const head = <AddonHead ctx={ctx} addon="mart_expiry" icon={CalendarX} title={x.expTitle} sub={x.expSub} perks={x.expPerks} />;
  if (!on) return <div className="rs-col">{head}</div>;
  const rows = data ? data.rows.filter((r) => (show === "all" ? true : show === "expired" ? r.state === "expired" : r.state !== "ok")) : [];
  const saveDays = async () => {
    const n = Number(days);
    if (!(n >= 1 && n <= 365)) return;
    try {
      await ctx.api.expiryDays(ctx.id, n);
      ctx.notify({ type: "success", text: x.saved });
      setDays("");
      load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const when = (r) => (r.days_left === -1 ? x.yesterday : r.days_left === 1 ? x.tomorrow : r.days_left < 0 ? x.agoDays.replace("{n}", -r.days_left) : r.days_left === 0 ? x.todayExp : x.inDays.replace("{n}", r.days_left));
  return (
    <div className="rs-col">
      {head}
      <section className="panel-card">
        {!data ? (
          <p className="rs-muted">…</p>
        ) : (
          <>
            <div className="xs-kpis">
              <span className="bad">
                <b>{data.counts.expired}</b>
                <small>{x.expired}</small>
              </span>
              <span className="warn">
                <b>{data.counts.soon}</b>
                <small>{x.soon}</small>
              </span>
              <span>
                <b>{data.counts.ok}</b>
                <small>{x.okLeft}</small>
              </span>
              <span>
                <b>{money(data.at_risk, cur)}</b>
                <small>{x.atRisk}</small>
              </span>
              <span>
                <b>{money(data.at_risk_sale, cur)}</b>
                <small>{x.atRiskSale}</small>
              </span>
            </div>
            <div className="xs-bar">
              <div className="mt-chips">
                {[
                  ["soon", `${x.sellFirst} (${data.counts.expired + data.counts.soon})`],
                  ["expired", `${x.expired} (${data.counts.expired})`],
                  ["all", `${x.all} (${data.counts.all})`],
                ].map(([k, label]) => (
                  <button key={k} type="button" className={show === k ? "on" : ""} onClick={() => setShow(k)}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="xs-days">
                <small className="rs-muted">{x.warnDays}</small>
                <input type="number" min="1" max="365" value={days || data.days} onChange={(e) => setDays(e.target.value)} onBlur={() => days && Number(days) !== data.days && saveDays()} disabled={readOnly} aria-label={x.warnDays} />
                <small className="rs-muted">{x.warnDaysUnit}</small>
              </span>
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setModal({ add: true })} disabled={readOnly} data-testid="exp-add">
                <Plus size={15} /> {x.addExpiry}
              </button>
            </div>
            <p className="rs-muted xs-hint">{x.expHint}</p>
            {!rows.length ? (
              <p className="rs-muted">{data.counts.all ? x.none : x.noBatches}</p>
            ) : (
              <div className="xs-list">
                {rows.map((r) => (
                  <div key={r._id} className={`xs-row s-${r.state}`} data-testid="exp-row">
                    <span className="xs-pic">{r.photo ? <img src={r.photo} alt="" /> : r.name.slice(0, 2)}</span>
                    <span className="mt-prod-text">
                      <b>{r.name}</b>
                      <small className="rs-muted">
                        {x.expires} {fmtDay(r.expires, lang)} {r.expires.slice(0, 4)} · {x.left} {r.left}
                        {r.note ? ` · ${r.note}` : ""}
                      </small>
                    </span>
                    <span className={`rs-pill ${r.state === "expired" ? "bad" : r.state === "soon" ? "warn" : "ok"}`}>{when(r)}</span>
                    <b className="xs-amt">{money(r.value, cur)}</b>
                    <span className="xs-acts">
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={() => setModal({ waste: r })} disabled={readOnly} data-testid="exp-waste">
                        <Trash2 size={14} /> {x.waste}
                      </button>
                      <button type="button" className="md-icon-btn" onClick={() => setModal({ edit: r })} disabled={readOnly} aria-label={x.edit}>
                        <Pencil size={15} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel-card">
        <div className="xs-bar">
          <h3 style={{ margin: 0 }}>{x.wasteRecord}</h3>
          <input type="month" className="mt-date" value={month} max={todayKH().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label={x.month} />
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setModal({ waste: { free: true } })} disabled={readOnly}>
            <Trash2 size={14} /> {x.wasteOther}
          </button>
        </div>
        {!waste ? (
          <p className="rs-muted">…</p>
        ) : !waste.rows.length ? (
          <p className="rs-muted">{x.noWaste}</p>
        ) : (
          <>
            <p className="xs-total">{x.wasteTotal.replace("{amt}", money(waste.total, cur))}</p>
            <div className="st-wrap">
              <table className="st-table">
                <thead>
                  <tr>
                    <th>{x.day}</th>
                    <th>{x.product}</th>
                    <th>{x.qty}</th>
                    <th>{x.wasteReason}</th>
                    <th className="num">{x.cost}</th>
                  </tr>
                </thead>
                <tbody>
                  {waste.rows.map((w) => (
                    <tr key={w._id}>
                      <td>{fmtDayTime(w.created_date, lang)}</td>
                      <td>{w.name}</td>
                      <td>{w.qty}</td>
                      <td>
                        {w.note} <small className="rs-muted">· {w.by}</small>
                      </td>
                      <td className="num">{money(w.value, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {modal?.add && <AddBatch ctx={ctx} products={prods || []} onClose={() => setModal(null)} onSaved={reload} />}
      {modal?.edit && <EditBatch ctx={ctx} row={modal.edit} onClose={() => setModal(null)} onSaved={reload} />}
      {modal?.waste && <WasteModal ctx={ctx} row={modal.waste} products={prods || []} onClose={() => setModal(null)} onSaved={reload} />}
    </div>
  );
}

function AddBatch({ ctx, products, onClose, onSaved }) {
  const x = useXText();
  const [f, setF] = useState({ product_id: "", qty: "", expires: "", note: "" });
  const { busy, error, go } = useSave(ctx, onSaved, onClose);
  const ok = f.product_id && Number(f.qty) > 0 && f.expires;
  return (
    <Modal
      title={x.addExpiry}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {x.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" disabled={!ok || busy} onClick={() => go(() => ctx.api.addExpiry(ctx.id, { ...f, qty: Number(f.qty) }))} data-testid="exp-save">
            {busy ? x.saving : x.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <Field label={x.product}>
          <ProductPick products={products} value={f.product_id} onPick={(p) => setF({ ...f, product_id: p?._id || "" })} />
        </Field>
        <div className="md-fields-grid">
          <Field label={x.qty} htmlFor="ex-qty">
            <input id="ex-qty" type="number" min="0" step="any" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
          </Field>
          <Field label={x.expires} htmlFor="ex-day">
            <input id="ex-day" type="date" value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} />
          </Field>
        </div>
        <Field label={x.note} htmlFor="ex-note">
          <input id="ex-note" maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        {f.expires && <small className="rs-muted">{daysTo(f.expires) < 0 ? x.agoDays.replace("{n}", -daysTo(f.expires)) : x.inDays.replace("{n}", daysTo(f.expires))}</small>}
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

function EditBatch({ ctx, row, onClose, onSaved }) {
  const x = useXText();
  const [f, setF] = useState({ left: row.left, expires: row.expires, note: row.note || "" });
  const { busy, error, go } = useSave(ctx, onSaved, onClose);
  return (
    <Modal
      title={`${x.batchEdit} · ${row.name}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <span style={{ marginRight: "auto" }}>
            <DeleteButton onDelete={() => go(() => ctx.api.removeExpiry(ctx.id, row._id))} r={{ confirmDelete: x.sure, remove: x.remove }} disabled={busy} small />
          </span>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {x.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" disabled={busy || !f.expires} onClick={() => go(() => ctx.api.saveExpiry(ctx.id, row._id, { ...f, left: Number(f.left) || 0 }))}>
            {busy ? x.saving : x.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <div className="md-fields-grid">
          <Field label={x.left} htmlFor="eb-left">
            <input id="eb-left" type="number" min="0" step="any" value={f.left} onChange={(e) => setF({ ...f, left: e.target.value })} />
          </Field>
          <Field label={x.expires} htmlFor="eb-day">
            <input id="eb-day" type="date" value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} />
          </Field>
        </div>
        <Field label={x.note} htmlFor="eb-note">
          <input id="eb-note" maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

function WasteModal({ ctx, row, products, onClose, onSaved }) {
  const x = useXText();
  const free = !!row.free;
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState(free ? "" : String(row.left));
  const [reason, setReason] = useState(free ? x.wasteReasons[1] : x.wasteReasons[0]);
  const { busy, error, go } = useSave(ctx, onSaved, onClose);
  const n = Number(qty);
  const ok = n > 0 && (free ? !!pid : n <= row.left + 1e-9);
  return (
    <Modal
      title={x.wasteTitle.replace("{name}", free ? "" : row.name)}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {x.cancel}
          </button>
          <button
            type="button"
            className="md-btn md-btn-danger"
            disabled={!ok || busy}
            onClick={() => go(() => (free ? ctx.api.waste(ctx.id, { product_id: pid, qty: n, reason }) : ctx.api.wasteBatch(ctx.id, row._id, { qty: n, reason })), x.wasteDone)}
            data-testid="exp-waste-ok"
          >
            <Trash2 size={15} /> {x.waste}
          </button>
        </>
      }
    >
      <div className="md-fields">
        {free && (
          <Field label={x.product}>
            <ProductPick products={products} value={pid} onPick={(p) => setPid(p?._id || "")} />
          </Field>
        )}
        <Field label={`${x.qty}${free ? "" : ` (${x.left} ${row.left})`}`} htmlFor="ws-qty">
          <input id="ws-qty" type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        </Field>
        <Field label={x.wasteReason} htmlFor="ws-why">
          <div className="mt-chips">
            {x.wasteReasons.map((r) => (
              <button key={r} type="button" className={reason === r ? "on" : ""} onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
          <input id="ws-why" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} style={{ marginTop: 8 }} />
        </Field>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}
