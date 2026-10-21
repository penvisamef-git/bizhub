import { useEffect, useState } from "react";
import { Bike, MapPinned, Phone, Plus, Send, X } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { DeleteButton, Field } from "../restaurant/parts";
import { money, todayKH } from "./text";
import { useXText } from "./xtext";
import { AddonHead, addonOn, useLoad, useSave } from "./MartGrowKit";

// Delivery zones + drivers (mart_delivery)
export function DeliveryTab({ ctx }) {
  const x = useXText();
  const { cur, readOnly } = ctx;
  const on = addonOn(ctx, "mart_delivery");
  const [data, load] = useLoad(ctx, () => ctx.api.delivery(ctx.id), []);
  const [zones, setZones] = useState(null);
  const [month, setMonth] = useState(todayKH().slice(0, 7));
  const [report, setReport] = useState(null);
  const [modal, setModal] = useState(null);
  useEffect(() => {
    if (data && !zones) setZones(data.zones.map((z) => ({ ...z })));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!on) return;
    ctx.api.driverReport(ctx.id, month).then(
      (r) => setReport(r.data),
      () => setReport(null),
    );
  }, [on, month]); // eslint-disable-line react-hooks/exhaustive-deps
  const head = <AddonHead ctx={ctx} addon="mart_delivery" icon={MapPinned} title={x.delTitle} sub={x.delSub} perks={x.delPerks} />;
  if (!on) return <div className="rs-col">{head}</div>;
  const dirty = data && zones && JSON.stringify(zones) !== JSON.stringify(data.zones);
  const saveZones = async () => {
    try {
      const r = await ctx.api.saveZones(
        ctx.id,
        zones.filter((z) => z.name.trim()).map((z) => ({ ...z, fee: Number(z.fee) || 0, min_order: Number(z.min_order) || 0 })),
      );
      setZones(r.data.map((z) => ({ ...z })));
      ctx.notify({ type: "success", text: x.saved });
      load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const setZ = (i, k, v) => setZones(zones.map((z, n) => (n === i ? { ...z, [k]: v } : z)));
  return (
    <div className="rs-col">
      {head}
      <section className="panel-card">
        <h3 style={{ margin: 0 }}>{x.zones}</h3>
        <p className="rs-muted" style={{ margin: "4px 0 12px" }}>
          {x.zonesSub}
        </p>
        {!zones ? (
          <p className="rs-muted">…</p>
        ) : (
          <>
            {!zones.length && <p className="rs-muted">{x.noZones}</p>}
            <div className="xs-lines">
              {zones.map((z, i) => (
                <div key={z.key || i} className="xs-line zone" data-testid="zone-row">
                  <label className="grow">
                    <small>{x.zoneName}</small>
                    <input maxLength={60} value={z.name} onChange={(e) => setZ(i, "name", e.target.value)} disabled={readOnly} />
                  </label>
                  <label>
                    <small>{x.fee}</small>
                    <input type="number" min="0" step="any" value={z.fee} onChange={(e) => setZ(i, "fee", e.target.value)} disabled={readOnly} />
                  </label>
                  <label>
                    <small>{x.minOrder}</small>
                    <input type="number" min="0" step="any" value={z.min_order} onChange={(e) => setZ(i, "min_order", e.target.value)} disabled={readOnly} />
                  </label>
                  <label>
                    <small>{x.eta}</small>
                    <input maxLength={40} value={z.eta} onChange={(e) => setZ(i, "eta", e.target.value)} placeholder="30 min" disabled={readOnly} />
                  </label>
                  <label className="md-switch" title={x.active}>
                    <input type="checkbox" checked={z.active !== false} onChange={(e) => setZ(i, "active", e.target.checked)} disabled={readOnly} />
                    <span className="md-switch-track" />
                  </label>
                  <button type="button" className="md-icon-btn" onClick={() => setZones(zones.filter((_, n) => n !== i))} disabled={readOnly} aria-label={x.remove}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div className="tg-save">
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setZones([...zones, { name: "", fee: 0, min_order: 0, eta: "", active: true }])} disabled={readOnly || zones.length >= 50} data-testid="zone-add">
                <Plus size={14} /> {x.addZone}
              </button>
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={saveZones} disabled={readOnly || !dirty} data-testid="zone-save">
                {x.save}
              </button>
            </div>
          </>
        )}
      </section>
      <div className="xs-two">
        <section className="panel-card">
          <div className="xs-bar">
            <h3 style={{ margin: 0 }}>{x.drivers}</h3>
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setModal({})} disabled={readOnly} data-testid="drv-add">
              <Plus size={14} /> {x.addDriver}
            </button>
          </div>
          {!data?.drivers.length ? (
            <p className="rs-muted">{x.noDrivers}</p>
          ) : (
            <div className="xs-list">
              {data.drivers.map((d) => (
                <button key={d._id} type="button" className="xs-row btn" onClick={() => setModal(d)}>
                  <span className="xs-pic round">
                    <Bike size={18} />
                  </span>
                  <span className="mt-prod-text">
                    <b>{d.name}</b>
                    <small className="rs-muted">
                      {d.phone && (
                        <>
                          <Phone size={11} /> {d.phone}
                        </>
                      )}
                      {d.telegram ? ` · @${d.telegram}` : ""}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="panel-card">
          <div className="xs-bar">
            <h3 style={{ margin: 0 }}>{x.driverReport}</h3>
            <input type="month" className="mt-date" value={month} max={todayKH().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label={x.month} />
          </div>
          {!report?.rows.length ? (
            <p className="rs-muted">—</p>
          ) : (
            <div className="xs-moves">
              {report.rows.map((r) => (
                <div key={r.driver_id || "none"}>
                  <span>
                    <b>{r.name || x.noDriver}</b>
                    <small className="rs-muted">
                      {x.fees} {money(r.fees, cur)} · {x.total} {money(r.total, cur)}
                    </small>
                  </span>
                  <b>{r.orders}</b>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {modal && <DriverModal ctx={ctx} row={modal} onClose={() => setModal(null)} onSaved={load} />}
    </div>
  );
}

function DriverModal({ ctx, row, onClose, onSaved }) {
  const x = useXText();
  const isNew = !row._id;
  const [f, setF] = useState({ name: row.name || "", phone: row.phone || "", telegram: row.telegram || "" });
  const { busy, error, go } = useSave(ctx, onSaved, onClose);
  return (
    <Modal
      title={isNew ? x.addDriver : row.name}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {!isNew && (
            <span style={{ marginRight: "auto" }}>
              <DeleteButton onDelete={() => go(() => ctx.api.removeDriver(ctx.id, row._id))} r={{ confirmDelete: x.sure, remove: x.remove }} disabled={busy} small />
            </span>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {x.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" disabled={busy || !f.name.trim()} onClick={() => go(() => (isNew ? ctx.api.addDriver(ctx.id, f) : ctx.api.saveDriver(ctx.id, row._id, f)))} data-testid="drv-save">
            {busy ? x.saving : x.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <Field label={x.name} htmlFor="dv-name">
          <input id="dv-name" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </Field>
        <Field label={x.phone} htmlFor="dv-phone">
          <input id="dv-phone" inputMode="tel" maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </Field>
        <Field label={x.driverTg} htmlFor="dv-tg">
          <input id="dv-tg" maxLength={60} value={f.telegram} onChange={(e) => setF({ ...f, telegram: e.target.value })} placeholder="@username" />
        </Field>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

// in an online order (delivery): pick the driver, send them the order
export function OrderDriver({ ctx, o, onChanged }) {
  const x = useXText();
  const [drivers, setDrivers] = useState(null);
  const [cur, setCur] = useState(o.driver_id ? String(o.driver_id) : "");
  useEffect(() => {
    ctx.api.delivery(ctx.id).then(
      (r) => setDrivers(r.data.drivers),
      () => setDrivers([]),
    );
  }, [ctx]);
  if (!drivers) return null;
  const pick = async (did) => {
    setCur(did);
    try {
      await ctx.api.setDriver(ctx.id, o._id, did || null);
      onChanged?.();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const d = drivers.find((v) => v._id === cur);
  const text = [
    `🛵 ${o.no} · ${ctx.data.business?.name || ""}`,
    `👤 ${o.name} · ${o.phone}`,
    `📍 ${o.address?.address || ""}${o.address?.note ? ` (${o.address.note})` : ""}`,
    o.address?.map ? `🗺 ${/^https?:/i.test(o.address.map) ? o.address.map : `https://maps.google.com/?q=${encodeURIComponent(o.address.map)}`}` : "",
    ...o.items.map((l) => `• ${l.qty}× ${l.name}`),
    `💰 ${money(o.total, o.currency)}${o.pay_method === "qr" ? " (paid QR)" : " (cash)"}`,
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <div className="xs-driver">
      <Bike size={15} />
      <select value={cur} onChange={(e) => pick(e.target.value)} aria-label={x.driver} data-testid="ord-driver">
        <option value="">{x.pickDriver}</option>
        {drivers.map((v) => (
          <option key={v._id} value={v._id}>
            {v.name}
          </option>
        ))}
      </select>
      {d && (
        <a
          className="md-btn md-btn-ghost sa-btn-sm"
          href={d.telegram ? `https://t.me/${d.telegram}` : `https://t.me/share/url?url=${encodeURIComponent(" ")}&text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => navigator.clipboard?.writeText(text).catch(() => {})}
        >
          <Send size={13} /> {x.sendDriver}
        </a>
      )}
    </div>
  );
}
