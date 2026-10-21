import { useCallback, useEffect, useState } from "react";
import { KeyRound, Lock, Plus } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { AddonPrompt, DeleteButton, Field } from "./parts";

const ROLES = ["manager", "cashier", "waiter", "kitchen"];
const initial = (n) => Array.from(String(n || "?").trim() || "?")[0].toUpperCase();

// Staff: 2 accounts included (any role); more with the "More staff" add-on. POS login = 4-digit PIN.
export default function StaffTab({ ctx }) {
  const { r, readOnly, overview } = ctx;
  const [staff, setStaff] = useState(() => restaurantService.cached(ctx.id, "staff") || null);
  const [editing, setEditing] = useState(null);
  const limit = overview.limits.staff;

  const load = useCallback(() => restaurantService.list(ctx.id, "staff").then((res) => setStaff(res.data)), [ctx.id]);
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!staff) return <ListSkeleton rows={3} />;
  const full = limit !== null && staff.length >= limit;
  const add = () => (full ? ctx.askBuy("rest_staff") : setEditing({}));

  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="pe-list-head">
          <div>
            <h2 style={{ margin: 0 }}>{r.tabs.staff}</h2>
            <small className="rs-muted">{limit === null ? r.staffUnlimited.replace("{n}", staff.length) : r.staffCount.replace("{n}", staff.length).replace("{max}", limit)}</small>
          </div>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={add} disabled={readOnly}>
            {full ? <Lock size={14} /> : <Plus size={15} />} {r.addStaff}
          </button>
        </div>
        <p className="rs-muted" style={{ margin: "8px 0 0" }}>
          {r.staffSub}
        </p>
        {limit !== null && (
          <div className="rs-meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (staff.length / limit) * 100)}%` }} />
          </div>
        )}
      </section>

      {staff.length === 0 && (
        <section className="panel-card rs-empty">
          <KeyRound size={30} />
          <p>{r.noStaff}</p>
          <button type="button" className="md-btn md-btn-primary" onClick={add} disabled={readOnly}>
            <Plus size={15} /> {r.addStaff}
          </button>
        </section>
      )}

      {staff.length > 0 && (
        <div className="rs-staff-grid">
          {staff.map((s) => (
            <button key={s._id} type="button" className={`panel-card rs-staff ${s.active ? "" : "off"}`} onClick={() => setEditing(s)} disabled={readOnly}>
              <span className={`rs-avatar role-${s.role}`}>{initial(s.name)}</span>
              <span className="rs-staff-text">
                <b>{s.name}</b>
                <small>
                  {r.roles[s.role]}
                  {s.phone ? ` · ${s.phone}` : ""}
                </small>
              </span>
              {!s.active && <span className="rs-pill">{r.hidden}</span>}
            </button>
          ))}
        </div>
      )}

      {full && <AddonPrompt addonKey="rest_staff" ctx={ctx} title={r.staffLimitTitle.replace("{max}", limit)} sub={r.staffLimitSub} />}

      {editing && (
        <StaffModal
          ctx={ctx}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            ctx.reload();
          }}
        />
      )}
    </div>
  );
}

function StaffModal({ ctx, row, onClose, onSaved }) {
  const { r } = ctx;
  const isNew = !row._id;
  const [f, setF] = useState({ name: row.name || "", role: row.role || "cashier", phone: row.phone || "", pin: "", active: row.active !== false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pinOk = isNew ? /^\d{4}$/.test(f.pin) : f.pin === "" || /^\d{4}$/.test(f.pin);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = { name: f.name, role: f.role, phone: f.phone, active: f.active, ...(f.pin ? { pin: f.pin } : {}) };
      if (isNew) await restaurantService.create(ctx.id, "staff", data);
      else await restaurantService.update(ctx.id, "staff", row._id, data);
      onSaved();
    } catch (err) {
      if (err.status === 402 && err.response?.product) {
        onClose();
        ctx.askBuy(err.response.product);
      } else setError(err.message);
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await restaurantService.remove(ctx.id, "staff", row._id);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={isNew ? r.addStaff : r.editStaff}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {!isNew && (
            <span style={{ marginRight: "auto" }}>
              <DeleteButton onDelete={remove} r={r} disabled={busy} small />
            </span>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {r.cancel}
          </button>
          <button type="submit" form="rs-staff-form" className="md-btn md-btn-primary" disabled={busy || !f.name.trim() || !pinOk}>
            {busy ? r.saving : r.save}
          </button>
        </>
      }
    >
      <form id="rs-staff-form" className="md-fields" onSubmit={submit}>
        <Field label={r.staffName} htmlFor="st-name">
          <input id="st-name" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </Field>
        <Field label={r.role}>
          <div className="rs-roles">
            {ROLES.map((k) => (
              <label key={k} className={f.role === k ? "on" : ""}>
                <input type="radio" name="role" checked={f.role === k} onChange={() => setF({ ...f, role: k })} />
                <b>{r.roles[k]}</b>
                <small>{r.roleHints[k]}</small>
              </label>
            ))}
          </div>
        </Field>
        <div className="md-fields-grid">
          <Field label={isNew ? r.pin : r.newPin} hint={r.pinHint} htmlFor="st-pin">
            <input id="st-pin" className="rs-pin" inputMode="numeric" autoComplete="off" maxLength={4} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="••••" />
          </Field>
          <Field label={`${r.phone} (${r.optional})`} htmlFor="st-phone">
            <input id="st-phone" type="tel" maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
        </div>
        <label className="md-switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{r.active}</span>
        </label>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}
