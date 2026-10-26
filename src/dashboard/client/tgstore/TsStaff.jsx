import { useCallback, useEffect, useState } from "react";
import { ExternalLink, KeyRound, Loader2, MonitorSmartphone, Plus, RefreshCw, Trash2, UserRound } from "lucide-react";
import { Head, Switch } from "../menuqr/parts";
import { Locked } from "./TsGrow";
import { Qr } from "./TsSetup";
import { ago, fill } from "./text";

// ---------------------------------------------------------------- Staff screen (POS): screens + staff PINs
export function StaffTab({ ctx }) {
  const { x, api, readOnly } = ctx;
  const [d, setD] = useState(null);
  const [pair, setPair] = useState(null); // { code, expires_at, url }
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState("");
  const [f, setF] = useState({ name: "", role: "staff", pin: "" });
  const [pinFor, setPinFor] = useState(null); // staff id → new PIN
  const [newPin, setNewPin] = useState("");
  const load = useCallback(() => api.pos().then((r) => setD(r.data)).catch((e) => ctx.notify({ type: "error", text: e.message })), [api]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!pair) return undefined;
    const tick = () => {
      const s = Math.max(0, Math.round((new Date(pair.expires_at).getTime() - Date.now()) / 1000));
      setLeft(s);
      if (!s) setPair(null);
    };
    tick();
    const i = setInterval(tick, 1000);
    // the screen that used the code shows up in the list
    const j = setInterval(load, 4000);
    return () => (clearInterval(i), clearInterval(j));
  }, [pair, load]);
  const run = async (key, fn, ok) => {
    setBusy(key);
    try {
      const r = await fn();
      if (ok) ctx.notify({ type: "success", text: r?.message || ok });
      return r;
    } catch (e) {
      if (e.status === 402 || e.code === "device_limit" || e.code === "staff_limit") ctx.askBuy({ addon: "ts_pos" });
      else ctx.notify({ type: "error", text: e.message });
      return null;
    } finally {
      setBusy("");
    }
  };
  const add = async (e) => {
    e.preventDefault();
    const r = await run("add", () => api.addPosStaff({ name: f.name.trim(), role: f.role, pin: f.pin }), x.saved);
    if (r) {
      setF({ name: "", role: "staff", pin: "" });
      load();
    }
  };
  const moreOn = ctx.on("ts_pos");
  return (
    <div className="rs-col">
      <Head icon={MonitorSmartphone} title={x.tabs.staff} sub={x.staffScreenSub}>
        {d && (
          <a className="md-btn md-btn-ghost sa-btn-sm" href={d.url} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> {x.openScreen}
          </a>
        )}
      </Head>
      {!d ? (
        <div className="panel-card ts-skel" />
      ) : (
        <>
          <section className="panel-card md-fields">
            <ol className="ts-how">
              {x.staffHow.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <div className="ts-order-acts">
              <span className="ts-pill">{fill(x.screensOf, { n: d.devices.length, max: d.limits.devices })}</span>
              <span className="ts-pill">{fill(x.staffOf, { n: d.staff.length, max: d.limits.staff })}</span>
            </div>
            {!moreOn && <Locked ctx={ctx} addon="ts_pos" small />}
          </section>

          <section className="panel-card md-fields" data-testid="ts-screens">
            <h3 className="ts-h3">
              <MonitorSmartphone size={17} /> {x.screens}
            </h3>
            {pair ? (
              <div className="ts-pair">
                <Qr text={pair.url} size={140} />
                <div className="ts-pair-text">
                  <small className="rs-muted">{x.pairCode}</small>
                  <b className="ts-pair-code" data-testid="ts-pair-code">
                    {pair.code.slice(0, 3)} {pair.code.slice(3)}
                  </b>
                  <span className="md-hint">{fill(x.pairHint, { url: pair.url.replace(/\?.*/, "") })}</span>
                  <span className="ts-pill">{fill(x.pairLeft, { m: Math.floor(left / 60), s: String(left % 60).padStart(2, "0") })}</span>
                  {d.devices.length > pair.n && <span className="ts-pill pay-paid" data-testid="ts-paired">{x.pairedOk}</span>}
                </div>
              </div>
            ) : (
              <div>
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => run("pair", api.posPair).then((r) => r && setPair({ ...r.data, n: d.devices.length }))} disabled={readOnly || !!busy} data-testid="ts-pair">
                  {busy === "pair" ? <Loader2 size={14} className="md-spin" /> : <Plus size={14} />} {x.pairScreen}
                </button>
              </div>
            )}
            {d.devices.length === 0 ? (
              <p className="rs-muted">{x.noScreens}</p>
            ) : (
              <ul className="ts-devices">
                {d.devices.map((v) => (
                  <li key={v._id} data-testid="ts-device">
                    <MonitorSmartphone size={18} />
                    <span>
                      <b>{v.name}</b>
                      <small className="rs-muted">{v.last_seen ? fill(x.lastSeen, { when: ago(v.last_seen, x) }) : ""}</small>
                    </span>
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => window.confirm(fill(x.removeScreenAsk, { name: v.name })) && run("rm", () => api.removePosDevice(v._id), x.deleted).then((r) => r && load())} disabled={readOnly || !!busy} aria-label={x.remove}>
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel-card md-fields" data-testid="ts-pos-staff">
            <h3 className="ts-h3">
              <UserRound size={17} /> {x.staffPins}
            </h3>
            {d.staff.length > 0 && (
              <ul className="ts-devices">
                {d.staff.map((s) => (
                  <li key={s._id} className={s.active ? "" : "is-off"} data-testid="ts-staff-row">
                    <span className="ts-av">{(s.name[0] || "?").toUpperCase()}</span>
                    <span>
                      <b>{s.name}</b>
                      <small className="rs-muted">{x.posRoles[s.role]}</small>
                    </span>
                    {pinFor === s._id ? (
                      <span className="ts-promo-row">
                        <input value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="••••" aria-label={x.newPin} style={{ width: 90 }} />
                        <button type="button" className="md-btn md-btn-primary sa-btn-sm" disabled={newPin.length !== 4 || !!busy} onClick={() => run("pin", () => api.savePosStaff(s._id, { pin: newPin }), x.saved).then((r) => r && (setPinFor(null), setNewPin("")))}>
                          {x.save}
                        </button>
                      </span>
                    ) : (
                      <span className="ts-order-acts">
                        <Switch checked={s.active} onChange={(v) => run("on", () => api.savePosStaff(s._id, { active: v })).then((r) => r && load())} disabled={readOnly} label="" />
                        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => (setPinFor(s._id), setNewPin(""))} disabled={readOnly}>
                          <KeyRound size={14} /> {x.newPin}
                        </button>
                        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => window.confirm(fill(x.removeStaffAsk, { name: s.name })) && run("rm", () => api.removePosStaff(s._id), x.deleted).then((r) => r && load())} disabled={readOnly} aria-label={x.remove}>
                          <Trash2 size={14} />
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <form className="ts-staff-add" onSubmit={add}>
              <input value={f.name} maxLength={60} placeholder={x.staffNamePh} onChange={(e) => setF({ ...f, name: e.target.value })} aria-label={x.staffName} data-testid="ts-staff-name" />
              <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} aria-label={x.posRole}>
                <option value="staff">{x.posRoles.staff}</option>
                <option value="manager">{x.posRoles.manager}</option>
              </select>
              <input value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" placeholder={x.staffPinPh} aria-label="PIN" data-testid="ts-staff-pin" />
              <button type="submit" className="md-btn md-btn-primary sa-btn-sm" disabled={readOnly || !!busy || !f.name.trim() || f.pin.length !== 4} data-testid="ts-staff-add">
                {busy === "add" ? <Loader2 size={14} className="md-spin" /> : <Plus size={14} />} {x.addStaff}
              </button>
            </form>
            <span className="md-hint">{x.posRoleHint}</span>
            <div>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={load}>
                <RefreshCw size={14} /> {x.refresh}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
