import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, ImagePlus, Link2, Lock, MonitorSmartphone, MonitorUp, Plus, Trash2, UserRound, Loader2 } from "lucide-react";
import { guestHouseService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { DeleteButton, Field } from "../restaurant/parts";
import { fmtTime } from "./text";
import { PicBox } from "./GhProfile";
import { DisplayLooks } from "./GhLooks";

// Owner: desk staff, linked POS devices, payment QR for the guest display
export function PosTab({ ctx }) {
  const { g, data, readOnly, lang } = ctx;
  const [staff, setStaff] = useState(null);
  const [devices, setDevices] = useState(null);
  const [editing, setEditing] = useState(null);
  const [code, setCode] = useState(null);
  const [qrLabel, setQrLabel] = useState(data.settings.pay_qr_label || "");
  const [qrBusy, setQrBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const pick = useRef(null);
  const load = useCallback(() => {
    guestHouseService
      .staff(ctx.id)
      .then((r) => setStaff(r.data))
      .catch(() => setStaff([]));
    guestHouseService
      .devices(ctx.id)
      .then((r) => setDevices(r.data))
      .catch(() => setDevices([]));
  }, [ctx.id]);
  useEffect(() => {
    load();
  }, [load]);
  const run = async (fn, msg) => {
    setBusy(true);
    try {
      const r = await fn();
      if (msg) ctx.notify({ type: "success", text: msg });
      return r;
    } catch (e) {
      if (e.status === 402 && e.response?.product) ctx.askBuy({ addon: e.response.product });
      else ctx.notify({ type: "error", text: e.message });
      return null;
    } finally {
      setBusy(false);
    }
  };
  const staffOn = !!data.addons?.gh_staff?.active;
  const full = staff && staff.length >= data.limits.staff;
  const posUrl = `${window.location.origin}/pos/guest-house`;

  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="pe-list-head">
          <div>
            <h2 style={{ margin: 0 }}>{g.posTitle}</h2>
            <small className="rs-muted">
              {g.posSub.split("{link}")[0]}
              <b>/pos/guest-house</b>
              {g.posSub.split("{link}")[1]}
            </small>
          </div>
          <div className="gh-head-btns">
            <a className="md-btn md-btn-ghost sa-btn-sm" href={posUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> {g.openPos}
            </a>
            <button
              type="button"
              className="md-btn md-btn-primary sa-btn-sm"
              disabled={readOnly || busy}
              onClick={async () => {
                const r = await run(() => guestHouseService.pairCode(ctx.id));
                if (r) setCode(r.data);
              }}
            >
              <Link2 size={14} /> {g.linkDevice}
            </button>
          </div>
        </div>
        {code && (
          <div className="ghs-code">
            <small>{g.pairCode}</small>
            <b>{code.code.replace(/(\d{3})(\d{3})/, "$1 $2")}</b>
            <small className="rs-muted">{g.pairExpires}</small>
          </div>
        )}
        <h3 className="ghs-h">{g.devices}</h3>
        {!devices ? (
          <p className="rs-muted">…</p>
        ) : !devices.length ? (
          <p className="rs-muted">{g.noDevices}</p>
        ) : (
          devices.map((d) => (
            <div key={d._id} className="gh-row">
              <span className="gh-row-room">
                <MonitorSmartphone size={18} />
              </span>
              <span className="gh-row-text" style={{ flex: 1 }}>
                <b>{d.name}</b>
                <small>{g.lastSeen.replace("{time}", fmtTime(d.last_seen || d.created_date, lang))}</small>
              </span>
              {!readOnly && (
                <DeleteButton
                  r={{ confirmDelete: g.sure, remove: g.removeDevice }}
                  small
                  onDelete={async () => {
                    if (await run(() => guestHouseService.removeDevice(ctx.id, d._id))) load();
                  }}
                />
              )}
            </div>
          ))
        )}
      </section>

      <section className="panel-card">
        <div className="pe-list-head">
          <div>
            <h2 style={{ margin: 0 }}>{g.staffTitle}</h2>
            <small className="rs-muted">{staffOn ? g.staffSubAll : g.staffSub.replace("{n}", staff?.length ?? 0).replace("{max}", data.limits.staff)}</small>
          </div>
          <div className="gh-head-btns">
            {!staffOn && (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ addon: "gh_staff" })} disabled={readOnly}>
                <CoinIcon size={14} /> {g.addonInfo.gh_staff.name} · {data.addons?.gh_staff?.price}
              </button>
            )}
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => (full ? ctx.askBuy({ addon: "gh_staff" }) : setEditing({}))} disabled={readOnly || !staff}>
              {full ? <Lock size={14} /> : <Plus size={15} />} {g.addStaff}
            </button>
          </div>
        </div>
        {staff && !staff.length && <p className="rs-muted">{g.noStaff}</p>}
        <div className="ghs-staff">
          {(staff || []).map((s) => (
            <button key={s._id} type="button" className={`ghs-person ${s.active ? "" : "off"}`} onClick={() => setEditing(s)} disabled={readOnly}>
              <span className="ghs-av">
                <UserRound size={18} />
              </span>
              <span>
                <b>{s.name}</b>
                <small>
                  {g.staffRoles[s.role]}
                  {s.phone ? ` · ${s.phone}` : ""}
                  {!s.active ? ` · ${g.off}` : ""}
                </small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <h2 style={{ margin: 0 }}>{g.payQrTitle}</h2>
        <p className="rs-muted" style={{ margin: "6px 0 12px" }}>
          {g.payQrSub}
        </p>
        <div className="ghs-qr">
          <span className="ghs-qr-pic">
            {data.settings.pay_qr?.url ? <img src={data.settings.pay_qr.url} alt="QR" /> : <span className="ghs-qr-empty">QR</span>}
            {qrBusy && (
              <span className="gh-uploading">
                <Loader2 size={26} className="gh-spin" />
              </span>
            )}
          </span>
          <div className="md-fields" style={{ flex: 1 }}>
            <Field label={g.qrLabel} htmlFor="gq-label">
              <input
                id="gq-label"
                maxLength={60}
                placeholder={g.qrLabelPh}
                value={qrLabel}
                onChange={(e) => setQrLabel(e.target.value)}
                onBlur={() => qrLabel !== (data.settings.pay_qr_label || "") && run(() => guestHouseService.saveSettings(ctx.id, { pay_qr_label: qrLabel }), g.saved).then(ctx.reload)}
                disabled={readOnly}
              />
            </Field>
            <div className="gh-head-btns">
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => pick.current?.click()} disabled={readOnly || busy}>
                {qrBusy ? <Loader2 size={14} className="gh-spin" /> : <ImagePlus size={14} />} {qrBusy ? g.uploading : data.settings.pay_qr?.url ? g.changeQr : g.uploadQr}
              </button>
              {data.settings.pay_qr?.url && (
                <button type="button" className="md-btn md-btn-ghost sa-danger-text sa-btn-sm" onClick={() => run(() => guestHouseService.removePayQr(ctx.id), g.saved).then(ctx.reload)} disabled={readOnly || busy}>
                  <Trash2 size={14} /> {g.remove}
                </button>
              )}
            </div>
          </div>
          <input
            ref={pick}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setQrBusy(true);
              try {
                if (await run(() => guestHouseService.uploadPayQr(ctx.id, file), g.saved)) await ctx.reload();
              } finally {
                setQrBusy(false);
              }
            }}
          />
        </div>
        <div className="ghs-disp-img">
          <PicBox ctx={ctx} kind="display-image" url={data.settings.display_image?.url} label={g.dispImgTitle} wide />
          <small className="rs-muted">{g.dispImgSub}</small>
        </div>
        <div className={`at-mgr-note ${data.addons?.gh_display?.active ? "on" : ""}`} style={{ marginTop: 14 }}>
          <MonitorUp size={16} />
          <span>{data.addons?.gh_display?.active ? g.displayOn : g.addonInfo.gh_display.what}</span>
          {!data.addons?.gh_display?.active && (
            <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "gh_display" })} disabled={readOnly}>
              <CoinIcon size={14} /> {g.unlock.replace("{coins}", data.addons?.gh_display?.price ?? 65)}
            </button>
          )}
        </div>
      </section>

      <DisplayLooks ctx={ctx} />

      {editing && <StaffModal ctx={ctx} row={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

function StaffModal({ ctx, row, onClose, onSaved }) {
  const { g } = ctx;
  const isNew = !row._id;
  const [f, setF] = useState({ name: row.name || "", role: row.role || "desk", phone: row.phone || "", pin: "", active: row.active !== false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pinOk = isNew ? /^\d{4}$/.test(f.pin) : f.pin === "" || /^\d{4}$/.test(f.pin);
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      ctx.notify({ type: "success", text: g.saved });
      onSaved();
      onClose();
    } catch (e) {
      if (e.status === 402 && e.response?.product) {
        onClose();
        ctx.askBuy({ addon: e.response.product });
      } else setError(e.message);
      setBusy(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    const body = { name: f.name, role: f.role, phone: f.phone, active: f.active, ...(f.pin ? { pin: f.pin } : {}) };
    run(() => (isNew ? guestHouseService.create(ctx.id, "staff", body) : guestHouseService.update(ctx.id, "staff", row._id, body)));
  };
  return (
    <Modal
      title={isNew ? g.addStaff : g.editStaff}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {!isNew && (
            <span style={{ marginRight: "auto" }}>
              <DeleteButton onDelete={() => run(() => guestHouseService.remove(ctx.id, "staff", row._id))} r={{ confirmDelete: g.sure, remove: g.remove }} disabled={busy} small />
            </span>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {g.cancel}
          </button>
          <button type="submit" form="gh-staff" className="md-btn md-btn-primary" disabled={busy || !f.name.trim() || !pinOk}>
            {busy ? g.saving : g.save}
          </button>
        </>
      }
    >
      <form id="gh-staff" className="md-fields" onSubmit={submit}>
        <div className="md-fields-grid">
          <Field label={g.staffName} htmlFor="gs-name">
            <input id="gs-name" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
          </Field>
          <Field label={g.phone} htmlFor="gs-phone">
            <input id="gs-phone" type="tel" maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
        </div>
        <Field label={g.staffRole} hint={g.staffRoleHint}>
          <div className="at-seg">
            {["desk", "manager", ...(ctx.data.addons?.gh_housekeeping?.active || f.role === "housekeeper" ? ["housekeeper"] : [])].map((k) => (
              <button key={k} type="button" className={f.role === k ? "on" : ""} onClick={() => setF({ ...f, role: k })}>
                {g.staffRoles[k]}
              </button>
            ))}
          </div>
        </Field>
        <Field label={isNew ? g.pin : g.newPin} htmlFor="gs-pin">
          <input id="gs-pin" className="rs-pin" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
        </Field>
        <label className="md-switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{g.staffActive}</span>
        </label>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}
