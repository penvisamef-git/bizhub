import { useCallback, useEffect, useState } from "react";
import { MapPin, Phone, Plus, Truck, UserRound } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { DeleteButton, Field } from "../restaurant/parts";
import CoinIcon from "../../../components/CoinIcon";
import { fmtDate, fmtDayTime, money } from "./text";

export const suppliersOn = (ctx) => !!ctx.data.addons?.mart_suppliers?.active;

// Suppliers (mart_suppliers): contacts, notes, deliveries
export function SuppliersTab({ ctx }) {
  const { m, cur, readOnly, lang } = ctx;
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(null);
  const load = useCallback(() => {
    if (!suppliersOn(ctx)) return;
    ctx.api
      .suppliers(ctx.id)
      .then((r) => setRows(r.data))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx]);
  useEffect(() => {
    load();
  }, [load]);
  if (!suppliersOn(ctx)) {
    const a = ctx.data.addons?.mart_suppliers;
    return (
      <section className="panel-card mt-lock">
        <Truck size={34} />
        <h2>{m.addonInfo.mart_suppliers.name}</h2>
        <p className="rs-muted">{m.supLocked}</p>
        <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon: "mart_suppliers" })} disabled={readOnly}>
          <CoinIcon size={16} /> {m.unlock.replace("{coins}", a?.price ?? 55)} · {m.forever}
        </button>
      </section>
    );
  }
  return (
    <div className="rs-col">
      <section className="panel-card ms-head">
        <div className="ms-head-top">
          <span className="ms-head-ic">
            <Truck size={24} />
          </span>
          <div className="ms-head-text">
            <h2>{m.tabs.suppliers}</h2>
            <small>{m.supSub}</small>
          </div>
          <div className="ms-head-btns">
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setModal({ edit: {} })} disabled={readOnly}>
              <Plus size={15} /> {m.addSupplier}
            </button>
          </div>
        </div>
      </section>
      <section className="panel-card">
        {!rows ? (
          <p className="rs-muted">…</p>
        ) : !rows.length ? (
          <p className="rs-muted">{m.noSuppliers}</p>
        ) : (
          <div className="sp-grid">
            {rows.map((x) => (
              <button key={x._id} type="button" className="sp-card" onClick={() => setModal({ view: x })}>
                <span className="sp-top">
                  <span className="ms-card-ic sp-ic">
                    <Truck size={18} />
                  </span>
                  <span className="mt-prod-text">
                    <b>{x.name}</b>
                    <small>{[x.contact, x.phone].filter(Boolean).join(" · ") || "—"}</small>
                  </span>
                </span>
                {x.note && <span className="sp-note">{x.note}</span>}
                <span className="sp-foot">
                  <span>
                    {m.deliveries}: <b>{x.deliveries}</b>
                  </span>
                  <span>
                    {m.spent}: <b>{money(x.spent, cur)}</b>
                  </span>
                  {x.last && <small>{m.lastDelivery.replace("{date}", fmtDate(x.last, lang))}</small>}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      {modal?.edit && <SupplierModal ctx={ctx} row={modal.edit} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.view && <SupplierView ctx={ctx} row={modal.view} onClose={() => setModal(null)} onEdit={() => setModal({ edit: modal.view })} />}
    </div>
  );
}

function SupplierModal({ ctx, row, onClose, onSaved }) {
  const { m } = ctx;
  const isNew = !row._id;
  const [f, setF] = useState({ name: row.name || "", contact: row.contact || "", phone: row.phone || "", address: row.address || "", note: row.note || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      ctx.notify({ type: "success", text: m.saved });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={isNew ? m.addSupplier : m.editSupplier}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {!isNew && (
            <span style={{ marginRight: "auto" }}>
              <DeleteButton onDelete={() => go(() => ctx.api.removeSupplier(ctx.id, row._id))} r={{ confirmDelete: m.sure, remove: m.remove }} disabled={busy} small />
            </span>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="submit" form="mt-sup" className="md-btn md-btn-primary" disabled={busy || !f.name.trim()}>
            {busy ? m.saving : m.save}
          </button>
        </>
      }
    >
      <form
        id="mt-sup"
        className="md-fields"
        onSubmit={(e) => {
          e.preventDefault();
          go(() => (isNew ? ctx.api.addSupplier(ctx.id, f) : ctx.api.saveSupplier(ctx.id, row._id, f)));
        }}
      >
        <Field label={m.supName} htmlFor="sp-name">
          <input id="sp-name" maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </Field>
        <div className="md-fields-grid">
          <Field label={m.supContact} htmlFor="sp-contact">
            <input id="sp-contact" maxLength={80} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />
          </Field>
          <Field label={m.phone} htmlFor="sp-phone">
            <input id="sp-phone" type="tel" maxLength={40} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
        </div>
        <Field label={m.supAddress} htmlFor="sp-addr">
          <input id="sp-addr" maxLength={300} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </Field>
        <Field label={m.supNote} htmlFor="sp-note">
          <textarea id="sp-note" rows={4} maxLength={1000} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

function SupplierView({ ctx, row, onClose, onEdit }) {
  const { m, cur, lang } = ctx;
  const [data, setData] = useState(null);
  useEffect(() => {
    ctx.api
      .supplier(ctx.id, row._id)
      .then((r) => setData(r.data))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx, row._id]);
  return (
    <Modal
      title={row.name}
      onClose={onClose}
      size="md-modal-lg"
      footer={
        !ctx.readOnly && (
          <button type="button" className="md-btn md-btn-ghost" onClick={onEdit}>
            <UserRound size={15} /> {m.editSupplier}
          </button>
        )
      }
    >
      <div className="sp-info">
        {row.contact && (
          <span>
            <UserRound size={14} /> {row.contact}
          </span>
        )}
        {row.phone && (
          <a href={`tel:${row.phone}`}>
            <Phone size={14} /> {row.phone}
          </a>
        )}
        {row.address && (
          <span>
            <MapPin size={14} /> {row.address}
          </span>
        )}
      </div>
      {row.note && <p className="sp-note big">{row.note}</p>}
      <h3 className="mt-h" style={{ marginTop: 14 }}>
        {m.deliveries}
      </h3>
      {!data ? (
        <p className="rs-muted">…</p>
      ) : !data.deliveries.length ? (
        <p className="rs-muted">{m.noDeliveries}</p>
      ) : (
        data.deliveries.map((d) => (
          <div key={d.batch} className="sp-del">
            <div className="sp-del-head">
              <b>{fmtDayTime(d.at, lang)}</b>
              {d.invoice_no && <em className="rs-chip">#{d.invoice_no}</em>}
              <span className="rs-muted">{d.by}</span>
              <b className="sp-del-total">{money(d.total, cur)}</b>
            </div>
            <small className="rs-muted">
              {d.items.map((x) => `${x.qty}× ${x.name}${x.cost ? ` @ ${money(x.cost, cur)}` : ""}`).join(" · ")}
              {d.note ? ` — ${d.note}` : ""}
            </small>
          </div>
        ))
      )}
    </Modal>
  );
}
