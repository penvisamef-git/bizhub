import { useCallback, useEffect, useState } from "react";
import { Armchair, Pencil, Plus, Wand2 } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { DeleteButton, Field } from "./parts";

// Floor & tables: zones, tables (quick add A1–A10), or takeaway only
export default function TablesTab({ ctx }) {
  const { r, settings, readOnly } = ctx;
  const [zones, setZones] = useState(() => restaurantService.cached(ctx.id, "zones") || null);
  const [tables, setTables] = useState(() => restaurantService.cached(ctx.id, "tables") || null);
  const [quick, setQuick] = useState({ prefix: "A", from: 1, to: 10, seats: 4, zone_id: "" });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // table | {} new | { zone } for zone edit
  const [zoneEdit, setZoneEdit] = useState(null); // zone | {} new

  const load = useCallback(async () => {
    const [z, t] = await Promise.all([restaurantService.list(ctx.id, "zones"), restaurantService.list(ctx.id, "tables")]);
    setZones(z.data);
    setTables(t.data);
  }, [ctx.id]);
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const fail = (e) => ctx.notify({ type: "error", text: e.status === 409 && /លុប|delete/i.test(e.message) ? r.inUse : e.message });
  const refreshSetup = () => ctx.reload();

  const toggleNoTables = async (on) => {
    try {
      const res = await restaurantService.saveSettings(ctx.id, { no_tables: on });
      ctx.setSettings(res.data, res.setup);
    } catch (e) {
      fail(e);
    }
  };
  const runQuick = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await restaurantService.bulkTables(ctx.id, { ...quick, zone_id: quick.zone_id || null });
      setTables(res.data);
      ctx.notify({ type: "success", text: `${r.tablesAdded.replace("{n}", res.added)}${res.skipped ? ` · ${r.tablesSkipped.replace("{n}", res.skipped)}` : ""}` });
      refreshSetup();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  if (!zones || !tables) return <ListSkeleton rows={4} />;
  const groups = [...zones.map((z) => [z, tables.filter((t) => String(t.zone_id) === String(z._id))]), [null, tables.filter((t) => !t.zone_id || !zones.some((z) => String(z._id) === String(t.zone_id)))]].filter(([z, list]) => z || list.length);

  return (
    <div className="rs-col">
      <section className="panel-card">
        <h2>{r.tabs.tables}</h2>
        <p className="rs-muted" style={{ margin: "-6px 0 14px" }}>
          {r.tablesSub}
        </p>
        <label className="md-switch ne-switch" style={{ margin: 0 }}>
          <input type="checkbox" checked={!!settings.no_tables} onChange={(e) => toggleNoTables(e.target.checked)} disabled={readOnly} />
          <span className="md-switch-track" />
          <span>
            <b>{r.noTables}</b>
            <small>{r.noTablesHint}</small>
          </span>
        </label>
      </section>

      {!settings.no_tables && (
        <>
          <section className="panel-card">
            <div className="pe-list-head">
              <h2 style={{ margin: 0 }}>{r.zones}</h2>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setZoneEdit({})} disabled={readOnly}>
                <Plus size={15} /> {r.addZone}
              </button>
            </div>
            <div className="rs-chips">
              {zones.map((z) => (
                <button key={z._id} type="button" className="rs-zone-chip" onClick={() => setZoneEdit(z)} disabled={readOnly}>
                  {z.name} <span>{tables.filter((t) => String(t.zone_id) === String(z._id)).length}</span> <Pencil size={12} />
                </button>
              ))}
              {zones.length === 0 && <span className="rs-muted">{r.zonePh}, VIP…</span>}
            </div>
          </section>

          <section className="panel-card">
            <h2>
              <Wand2 size={18} style={{ verticalAlign: -3 }} /> {r.quickAdd}
            </h2>
            <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
              {r.quickAddHint}
            </p>
            <form className="rs-quick" onSubmit={runQuick}>
              <Field label={r.prefix} htmlFor="q-prefix">
                <input id="q-prefix" maxLength={10} value={quick.prefix} onChange={(e) => setQuick({ ...quick, prefix: e.target.value })} disabled={readOnly} />
              </Field>
              <Field label={r.from} htmlFor="q-from">
                <input id="q-from" type="number" min="0" max="999" value={quick.from} onChange={(e) => setQuick({ ...quick, from: e.target.value })} disabled={readOnly} />
              </Field>
              <Field label={r.to} htmlFor="q-to">
                <input id="q-to" type="number" min="0" max="999" value={quick.to} onChange={(e) => setQuick({ ...quick, to: e.target.value })} disabled={readOnly} />
              </Field>
              <Field label={r.seats} htmlFor="q-seats">
                <input id="q-seats" type="number" min="1" max="50" value={quick.seats} onChange={(e) => setQuick({ ...quick, seats: e.target.value })} disabled={readOnly} />
              </Field>
              <Field label={r.zones} htmlFor="q-zone">
                <select id="q-zone" value={quick.zone_id} onChange={(e) => setQuick({ ...quick, zone_id: e.target.value })} disabled={readOnly}>
                  <option value="">{r.noZone}</option>
                  {zones.map((z) => (
                    <option key={z._id} value={z._id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </Field>
              <button type="submit" className="md-btn md-btn-primary" disabled={busy || readOnly}>
                {busy ? r.saving : `${r.makeTables} · ${quick.prefix}${quick.from}–${quick.prefix}${quick.to}`}
              </button>
            </form>
          </section>

          <section className="panel-card">
            <div className="pe-list-head">
              <h2 style={{ margin: 0 }}>
                {r.tabs.tables} <small className="rs-count">{tables.length}</small>
              </h2>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setEditing({})} disabled={readOnly}>
                <Plus size={15} /> {r.addTable}
              </button>
            </div>
            {tables.length === 0 && <p className="rs-muted">{r.noTablesYet}</p>}
            {groups.map(([z, list]) => (
              <div key={z?._id || "none"} className="rs-zone">
                <h3 className="rs-zone-name">{z ? z.name : r.noZone}</h3>
                <div className="rs-table-grid">
                  {list.map((t) => (
                    <button key={t._id} type="button" className={`rs-table ${t.active ? "" : "off"}`} onClick={() => setEditing(t)} disabled={readOnly}>
                      <b>{t.name}</b>
                      <small>
                        <Armchair size={12} /> {t.seats}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      {editing && (
        <TableModal
          ctx={ctx}
          table={editing}
          zones={zones}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            refreshSetup();
          }}
          fail={fail}
        />
      )}
      {zoneEdit && (
        <ZoneModal
          ctx={ctx}
          zone={zoneEdit}
          onClose={() => setZoneEdit(null)}
          onSaved={() => {
            setZoneEdit(null);
            load();
          }}
          fail={fail}
        />
      )}
    </div>
  );
}

function TableModal({ ctx, table, zones, onClose, onSaved, fail }) {
  const { r } = ctx;
  const isNew = !table._id;
  const [form, setForm] = useState({ name: table.name || "", seats: table.seats || 4, zone_id: table.zone_id || "", active: table.active !== false });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = { ...form, seats: Number(form.seats), zone_id: form.zone_id || null };
      if (isNew) await restaurantService.create(ctx.id, "tables", data);
      else await restaurantService.update(ctx.id, "tables", table._id, data);
      onSaved();
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await restaurantService.remove(ctx.id, "tables", table._id);
      onSaved();
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={isNew ? r.addTable : r.editTable}
      onClose={onClose}
      busy={busy}
      size="md-modal-sm"
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
          <button type="submit" form="rs-table-form" className="md-btn md-btn-primary" disabled={busy || !form.name.trim()}>
            {busy ? r.saving : r.save}
          </button>
        </>
      }
    >
      <form id="rs-table-form" className="md-fields" onSubmit={submit}>
        <Field label={r.tableName} htmlFor="t-name">
          <input id="t-name" maxLength={20} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>
        <Field label={r.seats} htmlFor="t-seats">
          <input id="t-seats" type="number" min="1" max="50" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
        </Field>
        <Field label={r.zones} htmlFor="t-zone">
          <select id="t-zone" value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: e.target.value })}>
            <option value="">{r.noZone}</option>
            {zones.map((z) => (
              <option key={z._id} value={z._id}>
                {z.name}
              </option>
            ))}
          </select>
        </Field>
        <label className="md-switch">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{r.active}</span>
        </label>
      </form>
    </Modal>
  );
}

function ZoneModal({ ctx, zone, onClose, onSaved, fail }) {
  const { r } = ctx;
  const isNew = !zone._id;
  const [name, setName] = useState(zone.name || "");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isNew) await restaurantService.create(ctx.id, "zones", { name });
      else await restaurantService.update(ctx.id, "zones", zone._id, { name });
      onSaved();
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await restaurantService.remove(ctx.id, "zones", zone._id);
      onSaved();
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={isNew ? r.addZone : r.edit}
      onClose={onClose}
      busy={busy}
      size="md-modal-sm"
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
          <button type="submit" form="rs-zone-form" className="md-btn md-btn-primary" disabled={busy || !name.trim()}>
            {busy ? r.saving : r.save}
          </button>
        </>
      }
    >
      <form id="rs-zone-form" className="md-fields" onSubmit={submit}>
        <Field label={r.zoneName} htmlFor="z-name">
          <input id="z-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder={r.zonePh} autoFocus />
        </Field>
      </form>
    </Modal>
  );
}
