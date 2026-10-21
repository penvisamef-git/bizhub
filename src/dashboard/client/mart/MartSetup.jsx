import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Link2, Lock, MonitorSmartphone, Plus, UserRound } from "lucide-react";
import { martService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import { DeleteButton, Field, ImagePick } from "../restaurant/parts";
import { fmtDayTime } from "./text";
import { PayMethods } from "./MartPayMethods";
import { PosLooks } from "./MartPosLooks";
import { DisplayCard, ScaleCard } from "./MartScale";

const run = async (ctx, fn, msg) => {
  try {
    const r = await fn();
    if (msg) ctx.notify({ type: "success", text: msg });
    return r || true;
  } catch (e) {
    ctx.notify({ type: "error", text: e.message });
    return null;
  }
};

// Owner: cashiers, linked POS devices, payment QR
export function PosTab({ ctx }) {
  const { m, data, readOnly, lang } = ctx;
  const [staff, setStaff] = useState(null);
  const [devices, setDevices] = useState(null);
  const [editing, setEditing] = useState(null);
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [qrLabel, setQrLabel] = useState(data.settings.pay_qr_label || "");
  const load = useCallback(() => {
    martService
      .staff(ctx.id)
      .then((r) => setStaff(r.data))
      .catch(() => setStaff([]));
    martService
      .devices(ctx.id)
      .then((r) => setDevices(r.data))
      .catch(() => setDevices([]));
  }, [ctx.id]);
  useEffect(() => {
    load();
  }, [load]);
  const full = staff && staff.length >= data.limits.staff;
  const r = { upload: m.uploadQr, change: m.changeQr, uploading: m.uploading, remove: m.remove };

  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="pe-list-head">
          <div>
            <h2 style={{ margin: 0 }}>{m.posTitle}</h2>
            <small className="rs-muted">
              {m.posSub.split("{link}")[0]}
              <b>/pos/mini-mart</b>
              {m.posSub.split("{link}")[1]}
            </small>
          </div>
          <div className="gh-head-btns">
            <a className="md-btn md-btn-ghost sa-btn-sm" href="/pos/mini-mart" target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> {m.openPos}
            </a>
            <button
              type="button"
              className="md-btn md-btn-primary sa-btn-sm"
              disabled={readOnly || busy}
              onClick={async () => {
                setBusy(true);
                const x = await run(ctx, () => martService.pairCode(ctx.id));
                setBusy(false);
                if (x) setCode(x.data);
              }}
            >
              <Link2 size={14} /> {m.linkDevice}
            </button>
          </div>
        </div>
        {code && (
          <div className="ghs-code mt-code">
            <small>{m.pairCode}</small>
            <b>{code.code.replace(/(\d{3})(\d{3})/, "$1 $2")}</b>
            <small className="rs-muted">{m.pairExpires}</small>
          </div>
        )}
        <h3 className="mt-h">{m.devices}</h3>
        {!devices ? (
          <p className="rs-muted">…</p>
        ) : !devices.length ? (
          <p className="rs-muted">{m.noDevices}</p>
        ) : (
          devices.map((d) => (
            <div key={d._id} className="gh-row">
              <span className="gh-row-room">
                <MonitorSmartphone size={18} />
              </span>
              <span className="gh-row-text" style={{ flex: 1 }}>
                <b>{d.name}</b>
                <small>{m.lastSeen.replace("{time}", fmtDayTime(d.last_seen || d.created_date, lang))}</small>
              </span>
              {!readOnly && <DeleteButton r={{ confirmDelete: m.sure, remove: m.removeDevice }} small onDelete={async () => (await run(ctx, () => martService.removeDevice(ctx.id, d._id))) && load()} />}
            </div>
          ))
        )}
      </section>

      <section className="panel-card">
        <div className="pe-list-head">
          <div>
            <h2 style={{ margin: 0 }}>{m.staffTitle}</h2>
            <small className="rs-muted">{data.addons?.mart_staff?.active ? `${staff?.length ?? 0} · ${m.addonInfo.mart_staff.name}` : m.staffSub.replace("{n}", staff?.length ?? 0).replace("{max}", data.limits.staff)}</small>
          </div>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => (full ? ctx.askBuy({ addon: "mart_staff" }) : setEditing({}))} disabled={readOnly || !staff}>
            {full ? <Lock size={14} /> : <Plus size={15} />} {m.addStaff}
          </button>
        </div>
        {staff && !staff.length && <p className="rs-muted">{m.noStaff}</p>}
        <div className="ghs-staff">
          {(staff || []).map((s) => (
            <button key={s._id} type="button" className={`ghs-person ${s.active ? "" : "off"}`} onClick={() => setEditing(s)} disabled={readOnly}>
              <span className="ghs-av">
                <UserRound size={18} />
              </span>
              <span>
                <b>{s.name}</b>
                <small>
                  {m.staffRoles[s.role]}
                  {s.phone ? ` · ${s.phone}` : ""}
                </small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <h2 style={{ margin: 0 }}>{m.payQrTitle}</h2>
        <p className="rs-muted" style={{ margin: "6px 0 12px" }}>
          {m.payQrSub}
        </p>
        <div className="mt-qr-row">
          <ImagePick
            value={data.settings.pay_qr?.url}
            r={r}
            disabled={readOnly}
            maxSize={900}
            onPick={async (fl) => (await run(ctx, () => martService.uploadPayQr(ctx.id, fl), m.saved)) && ctx.reload()}
            onRemove={async () => (await run(ctx, () => martService.removePayQr(ctx.id), m.saved)) && ctx.reload()}
          />
          <Field label={m.qrLabel} htmlFor="mq-label">
            <input
              id="mq-label"
              maxLength={60}
              placeholder={m.qrLabelPh}
              value={qrLabel}
              disabled={readOnly}
              onChange={(e) => setQrLabel(e.target.value)}
              onBlur={() => qrLabel !== (data.settings.pay_qr_label || "") && run(ctx, () => martService.saveSettings(ctx.id, { pay_qr_label: qrLabel }), m.saved).then(ctx.reload)}
            />
          </Field>
        </div>
      </section>
      <PosLooks ctx={ctx} />
      {!ctx.pos && <DisplayCard ctx={ctx} />}
      {editing && <StaffModal ctx={ctx} row={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

function StaffModal({ ctx, row, onClose, onSaved }) {
  const { m } = ctx;
  const isNew = !row._id;
  const [f, setF] = useState({ name: row.name || "", role: row.role || "cashier", phone: row.phone || "", pin: "", active: row.active !== false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pinOk = isNew ? /^\d{4}$/.test(f.pin) : f.pin === "" || /^\d{4}$/.test(f.pin);
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
  const submit = (e) => {
    e.preventDefault();
    const body = { name: f.name, role: f.role, phone: f.phone, active: f.active, ...(f.pin ? { pin: f.pin } : {}) };
    go(() => (isNew ? martService.addStaff(ctx.id, body) : martService.saveStaff(ctx.id, row._id, body)));
  };
  return (
    <Modal
      title={isNew ? m.addStaff : m.editStaff}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {!isNew && (
            <span style={{ marginRight: "auto" }}>
              <DeleteButton onDelete={() => go(() => martService.removeStaff(ctx.id, row._id))} r={{ confirmDelete: m.sure, remove: m.remove }} disabled={busy} small />
            </span>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="submit" form="mt-staff" className="md-btn md-btn-primary" disabled={busy || !f.name.trim() || !pinOk}>
            {busy ? m.saving : m.save}
          </button>
        </>
      }
    >
      <form id="mt-staff" className="md-fields" onSubmit={submit}>
        <div className="md-fields-grid">
          <Field label={m.staffName} htmlFor="ms-name">
            <input id="ms-name" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
          </Field>
          <Field label={m.phone} htmlFor="ms-phone">
            <input id="ms-phone" type="tel" maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
        </div>
        <Field label={m.staffRole} hint={m.staffRoleHint}>
          <div className="at-seg">
            {["cashier", "manager"].map((k) => (
              <button key={k} type="button" className={f.role === k ? "on" : ""} onClick={() => setF({ ...f, role: k })}>
                {m.staffRoles[k]}
              </button>
            ))}
          </div>
        </Field>
        <Field label={isNew ? m.pin : m.newPin} htmlFor="ms-pin">
          <input id="ms-pin" className="rs-pin" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
        </Field>
        <label className="md-switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{m.staffActive}</span>
        </label>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

export function SettingsTab({ ctx }) {
  const { m, data, readOnly } = ctx;
  const s = data.settings;
  const b = data.business;
  const start = { name: b.name, phone: b.phone || "", address: b.address || "", currency: s.currency, khr_rate: s.khr_rate, khr_round: s.khr_round || 100, methods: s.methods, receipt_note: s.receipt_note || "" };
  const [f, setF] = useState(start);
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const dirty = JSON.stringify(f) !== JSON.stringify(start);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok =
      (await run(ctx, () => martService.saveProfile(ctx.id, { name: f.name, phone: f.phone, address: f.address }))) &&
      (await run(ctx, () => martService.saveSettings(ctx.id, { currency: f.currency, khr_rate: Number(f.khr_rate), khr_round: Number(f.khr_round), methods: f.methods, receipt_note: f.receipt_note }), m.saved));
    setBusy(false);
    if (ok) ctx.reload();
  };
  return (
    <form className="rs-col" onSubmit={save}>
      <section className="panel-card">
        <h2 style={{ marginTop: 0 }}>{m.shop}</h2>
        <div className="md-fields">
          <Field label={m.logo}>
            <ImagePick
              value={b.logo_url}
              busy={logoBusy}
              round
              disabled={readOnly}
              r={{ upload: m.upload, change: m.change2, uploading: m.uploading, remove: m.remove }}
              onPick={async (fl) => {
                setLogoBusy(true);
                if (await run(ctx, () => martService.uploadLogo(ctx.id, fl), m.saved)) await ctx.reload();
                setLogoBusy(false);
              }}
              onRemove={async () => (await run(ctx, () => martService.removeLogo(ctx.id), m.saved)) && ctx.reload()}
            />
          </Field>
          <div className="md-fields-grid">
            <Field label={m.shopName} htmlFor="mt-name">
              <input id="mt-name" maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} disabled={readOnly} />
            </Field>
            <Field label={m.phone} htmlFor="mt-phone">
              <input id="mt-phone" type="tel" maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} disabled={readOnly} />
            </Field>
          </div>
          <Field label={m.address} htmlFor="mt-addr">
            <input id="mt-addr" maxLength={300} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} disabled={readOnly} />
          </Field>
        </div>
      </section>
      <section className="panel-card">
        <h2 style={{ marginTop: 0 }}>{m.money}</h2>
        <div className="md-fields">
          <Field label={m.currency} hint={m.currencyHint}>
            <div className="at-seg">
              {["USD", "KHR"].map((k) => (
                <button key={k} type="button" className={f.currency === k ? "on" : ""} onClick={() => setF({ ...f, currency: k })} disabled={readOnly}>
                  {k === "USD" ? "USD ($)" : "KHR (៛)"}
                </button>
              ))}
            </div>
          </Field>
          <div className="md-fields-grid">
            <Field label={m.rate} htmlFor="mt-rate">
              <input id="mt-rate" type="number" min="1000" max="10000" step="10" value={f.khr_rate} onChange={(e) => setF({ ...f, khr_rate: e.target.value })} disabled={readOnly} />
            </Field>
            <Field label={m.khrRound}>
              <div className="at-seg">
                {[100, 500, 1000].map((k) => (
                  <button key={k} type="button" className={Number(f.khr_round) === k ? "on" : ""} onClick={() => setF({ ...f, khr_round: k })} disabled={readOnly}>
                    {k.toLocaleString("en-US")}៛
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <Field label={m.payMethods}>
            <PayMethods ctx={ctx} methods={f.methods} setMethods={(v) => setF((x) => ({ ...x, methods: v }))} />
          </Field>
          <Field label={m.receiptNote} htmlFor="mt-note">
            <textarea id="mt-note" rows={2} maxLength={300} placeholder={m.receiptNotePh} value={f.receipt_note} onChange={(e) => setF({ ...f, receipt_note: e.target.value })} disabled={readOnly} />
          </Field>
        </div>
      </section>
      <div className="mt-save">
        <button type="submit" className="md-btn md-btn-primary" disabled={readOnly || busy || !dirty || !f.name.trim()}>
          {busy ? m.saving : m.save}
        </button>
      </div>
      {!ctx.pos && <ScaleCard ctx={ctx} />}
    </form>
  );
}
