import { useEffect, useState } from "react";
import { Camera, Check, Clock, Copy, Palette, Printer, Crosshair, Download, ExternalLink, Link2, Loader2, Lock, MapPin, Plus, RefreshCw, Share2, ShieldCheck, Smartphone, Users } from "lucide-react";
import { attendanceService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { DeleteButton, Field } from "../restaurant/parts";
import { fmtDate, staffLink } from "./text";
import { hoursOf, PrintSticker, StickerPreview } from "./LooksTab";
import { ManagerNote, PROFILE_KEYS, ProfileFields, StaffDocs } from "./StaffExtras";

const initial = (n) => Array.from(String(n || "?").trim() || "?")[0].toUpperCase();
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const COLORS = ["#2563EB", "#16A34A", "#F59E0B", "#DC2626", "#7C3AED", "#0891B2", "#DB2777", "#475569"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// shared save for the 3 lists: create or update, 402 → offer to buy, keeps the dashboard numbers fresh
function useSaver(ctx, collection, onSaved) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (row, data) => {
    setBusy(true);
    setError("");
    try {
      const res = row?._id ? await attendanceService.update(ctx.id, collection, row._id, data) : await attendanceService.create(ctx.id, collection, data);
      await ctx.reload();
      onSaved(res);
    } catch (err) {
      if (err.status === 402 && (err.response?.product === "att_branch" || err.response?.product === "att_staff")) {
        onSaved(null);
        ctx.askBuy(err.response.product === "att_staff" ? { kind: "staff" } : {});
      } else setError(err.message);
      setBusy(false);
    }
  };
  const remove = async (row) => {
    setBusy(true);
    try {
      const res = await attendanceService.remove(ctx.id, collection, row._id);
      if (res.kept) ctx.notify({ type: "success", text: ctx.a.keptOff });
      await ctx.reload();
      onSaved(res);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return { busy, error, setError, save, remove };
}

function Footer({ a, busy, onClose, form, canSave, onRemove }) {
  return (
    <>
      {onRemove && (
        <span style={{ marginRight: "auto" }}>
          <DeleteButton onDelete={onRemove} r={a} disabled={busy} small />
        </span>
      )}
      <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
        {a.cancel}
      </button>
      <button type="submit" form={form} className="md-btn md-btn-primary" disabled={busy || !canSave}>
        {busy ? a.saving : a.save}
      </button>
    </>
  );
}

// ============================ STAFF ============================
export function StaffTab({ ctx }) {
  const { a, data, readOnly, lang } = ctx;
  const [editing, setEditing] = useState(null);
  const staff = data.staff;
  const activeCount = staff.filter((s) => s.active).length;
  const full = activeCount >= data.limits.staff;
  const shiftOf = Object.fromEntries(data.shifts.map((s) => [s._id, s]));

  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="pe-list-head">
          <div>
            <h2 style={{ margin: 0 }}>{a.tabs.staff}</h2>
            <small className="rs-muted">{a.staffCount.replace("{n}", activeCount).replace("{max}", data.limits.staff)}</small>
          </div>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setEditing({ active: !full })} disabled={readOnly}>
            <Plus size={15} /> {a.addStaff}
          </button>
        </div>
        <p className="rs-muted" style={{ margin: "8px 0 0" }}>
          {a.staffSub}
        </p>
        <div className="rs-meter" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (activeCount / data.limits.staff) * 100)}%` }} />
        </div>
      </section>

      {staff.length === 0 && (
        <section className="panel-card rs-empty">
          <Users size={30} />
          <p>{a.noStaff}</p>
          <button type="button" className="md-btn md-btn-primary" onClick={() => setEditing({})} disabled={readOnly}>
            <Plus size={15} /> {a.addStaff}
          </button>
        </section>
      )}

      {staff.length > 0 && (
        <div className="rs-staff-grid">
          {staff.map((s) => {
            const sh = s.shift_id ? shiftOf[s.shift_id] : null;
            return (
              <button key={s._id} type="button" className={`panel-card rs-staff at-staff ${s.active ? "" : "off"}`} onClick={() => setEditing(s)} disabled={readOnly}>
                <span className="at-av big" style={sh?.color ? { background: sh.color } : undefined}>
                  {initial(s.name)}
                </span>
                <span className="rs-staff-text">
                  <b>{s.name}</b>
                  <small>
                    {s.phone}
                    {s.position ? ` · ${s.position}` : ""}
                  </small>
                  <small className={s.device_bound ? "at-ok" : "rs-muted"}>
                    <Smartphone size={12} /> {s.device_bound ? a.phoneLocked.replace("{label}", short(s.device_label)) : a.phoneFree}
                  </small>
                  {s.last_seen && <small className="rs-muted">{a.seen.replace("{date}", fmtDate(s.last_seen, lang))}</small>}
                </span>
                {!s.active && <span className="rs-pill">{a.off}</span>}
                {s.role === "manager" && s.active && <span className="rs-pill">{a.roles.manager}</span>}
              </button>
            );
          })}
        </div>
      )}

      {full && (
        <section className="panel-card at-limit">
          <Lock size={18} />
          <span>
            <b>{a.staffLimitTitle.replace("{max}", data.limits.staff)}</b>
            <small>{a.staffLimitSub.replace("{coins}", fmt(data.addons?.att_staff?.price))}</small>
          </span>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ kind: "staff" })} disabled={readOnly}>
            <CoinIcon size={15} /> {a.buyStaff.replace("{coins}", fmt(data.addons?.att_staff?.price))}
          </button>
        </section>
      )}
      {(data.staff_slots || []).length > 0 && (
        <section className="panel-card">
          <ul className="at-slots">
            {data.staff_slots.map((s) => (
              <li key={s.item}>
                <Users size={16} />
                <b>{a.staffSlot.replace("{n}", s.item.split("-")[1])}</b>
                <small className={s.active ? "" : "at-bad"}>{s.active ? a.slotEnds.replace("{date}", fmtDate(s.expires_at, lang)) : a.slotEnded}</small>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ kind: "staff", item: s.item })} disabled={readOnly}>
                  <CoinIcon size={14} /> {a.renewSlot}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && <StaffModal ctx={ctx} row={editing} full={full} onClose={() => setEditing(null)} />}
    </div>
  );
}
const short = (label) => {
  const s = String(label || "");
  const m = s.match(/iPhone|iPad|Android[^;)]*|Windows|Mac OS X|Linux/);
  return (m ? m[0] : s).slice(0, 30) || "✓";
};

const profileLabel = (lang) => (lang === "km" ? "ប្រវត្តិរូប & HR" : "Profile & HR");

function StaffModal({ ctx, row, full, onClose }) {
  const { a, data } = ctx;
  const isNew = !row._id;
  const [f, setF] = useState({
    name: row.name || "",
    phone: row.phone || "",
    pin: "",
    position: row.position || "",
    role: row.role || "staff",
    shift_id: row.shift_id || (isNew && data.shifts.length === 1 ? data.shifts[0]._id : ""),
    branch_ids: row.branch_ids || [],
    active: row.active !== false && !(isNew && full),
    salary: row.salary || "",
    pay_type: row.pay_type || "monthly",
    dependents: row.dependents || 0,
    resident: row.resident !== false,
    contract: row.contract || "udc",
    bank_name: row.bank_name || "",
    bank_account: row.bank_account || "",
    account_name: row.account_name || "",
    ...Object.fromEntries(PROFILE_KEYS.map((k) => [k, row[k] || ""])),
  });
  const [more, setMore] = useState(false);
  const [prof, setProf] = useState(false);
  const { busy, error, save, remove, setError } = useSaver(ctx, "staff", onClose);
  const [resetting, setResetting] = useState(false);
  const pinOk = isNew ? /^\d{4}$/.test(f.pin) : f.pin === "" || /^\d{4}$/.test(f.pin);

  const submit = (e) => {
    e.preventDefault();
    save(row, {
      name: f.name,
      phone: f.phone,
      position: f.position,
      role: f.role,
      shift_id: f.shift_id || null,
      branch_ids: f.branch_ids,
      active: f.active,
      ...(f.pin ? { pin: f.pin } : {}),
      ...(f.salary !== "" ? { salary: Number(f.salary) } : {}),
      pay_type: f.pay_type,
      dependents: Number(f.dependents) || 0,
      resident: f.resident,
      contract: f.contract,
      bank_name: f.bank_name,
      bank_account: f.bank_account,
      account_name: f.account_name,
      ...Object.fromEntries(PROFILE_KEYS.map((k) => [k, f[k]])),
    });
  };
  const resetPhone = async () => {
    setResetting(true);
    try {
      await attendanceService.resetDevice(ctx.id, row._id);
      await ctx.reload();
      ctx.notify({ type: "success", text: a.resetDone });
      onClose();
    } catch (err) {
      setError(err.message);
      setResetting(false);
    }
  };
  const toggleBranch = (id) => setF((x) => ({ ...x, branch_ids: x.branch_ids.includes(id) ? x.branch_ids.filter((b) => b !== id) : [...x.branch_ids, id] }));

  return (
    <Modal title={isNew ? a.addStaff : a.editStaff} onClose={onClose} busy={busy} footer={<Footer a={a} busy={busy} onClose={onClose} form="at-staff" canSave={f.name.trim() && f.phone.trim() && pinOk} onRemove={isNew ? null : () => remove(row)} />}>
      <form id="at-staff" className="md-fields" onSubmit={submit}>
        <Field label={a.staffName} htmlFor="as-name">
          <input id="as-name" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </Field>
        <div className="md-fields-grid">
          <Field label={a.phone} hint={a.phoneHint} htmlFor="as-phone">
            <input id="as-phone" type="tel" inputMode="tel" maxLength={20} placeholder="012 345 678" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
          <Field label={isNew ? a.pin : a.newPin} hint={a.pinHint} htmlFor="as-pin">
            <input id="as-pin" className="rs-pin" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          </Field>
        </div>
        <div className="md-fields-grid">
          <Field label={`${a.position} (${a.optional})`} htmlFor="as-pos">
            <input id="as-pos" maxLength={60} placeholder={a.positionPh} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} />
          </Field>
          <Field label={a.shift} htmlFor="as-shift">
            <select id="as-shift" value={f.shift_id} onChange={(e) => setF({ ...f, shift_id: e.target.value })}>
              <option value="">{a.noShiftOpt}</option>
              {data.shifts.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} · {s.start}–{s.end}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={`${a.salary} (${a.optional})`} htmlFor="as-salary" hint={a.salaryHint}>
          <div className="at-salary-row">
            <input id="as-salary" type="number" min={0} step="any" inputMode="decimal" placeholder="0" value={f.salary} onChange={(e) => setF({ ...f, salary: e.target.value })} />
            <select value={f.pay_type} onChange={(e) => setF({ ...f, pay_type: e.target.value })} aria-label={a.payType}>
              {["monthly", "daily", "hourly"].map((k) => (
                <option key={k} value={k}>
                  {a.payTypes[k]}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm at-more-btn" onClick={() => setMore(!more)}>
          {more ? "−" : "+"} {a.payDetails}
        </button>
        {more && (
          <div className="md-fields-grid at-more">
            <Field label={a.bankName} htmlFor="as-bank">
              <input id="as-bank" maxLength={40} placeholder="ABA, ACLEDA, Wing…" value={f.bank_name} onChange={(e) => setF({ ...f, bank_name: e.target.value })} />
            </Field>
            <Field label={a.bankAccount} htmlFor="as-acc">
              <input id="as-acc" maxLength={40} inputMode="numeric" value={f.bank_account} onChange={(e) => setF({ ...f, bank_account: e.target.value })} />
            </Field>
            <Field label={a.accountName} htmlFor="as-accname">
              <input id="as-accname" maxLength={80} placeholder={f.name} value={f.account_name} onChange={(e) => setF({ ...f, account_name: e.target.value })} />
            </Field>
            <Field label={a.dependents} htmlFor="as-deps" hint={a.dependentsHint}>
              <input id="as-deps" type="number" min={0} max={10} value={f.dependents} onChange={(e) => setF({ ...f, dependents: e.target.value })} />
            </Field>
            <Field label={a.contract}>
              <div className="at-seg">
                {["udc", "fdc"].map((k) => (
                  <button key={k} type="button" className={f.contract === k ? "on" : ""} onClick={() => setF({ ...f, contract: k })}>
                    {a.contracts[k]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={a.residentLabel}>
              <div className="at-seg">
                {[true, false].map((v) => (
                  <button key={String(v)} type="button" className={f.resident === v ? "on" : ""} onClick={() => setF({ ...f, resident: v })}>
                    {v ? a.resident : a.nonResident}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm at-more-btn" onClick={() => setProf(!prof)}>
          {prof ? "−" : "+"} {profileLabel(ctx.lang)}
        </button>
        {prof && <ProfileFields lang={ctx.lang} f={f} setF={setF} />}
        <Field label={a.role}>
          <div className="at-seg">
            {["staff", "manager"].map((k) => (
              <button key={k} type="button" className={f.role === k ? "on" : ""} onClick={() => setF({ ...f, role: k })}>
                {a.roles[k]}
              </button>
            ))}
          </div>
          {f.role === "manager" && <ManagerNote ctx={ctx} />}
        </Field>
        {data.branches.length > 1 && (
          <Field label={a.branchesLabel}>
            <div className="at-checks">
              <label className={f.branch_ids.length === 0 ? "on" : ""}>
                <input type="checkbox" checked={f.branch_ids.length === 0} onChange={() => setF({ ...f, branch_ids: [] })} /> {a.allBranches}
              </label>
              {data.branches.map((b) => (
                <label key={b._id} className={f.branch_ids.includes(b._id) ? "on" : ""}>
                  <input type="checkbox" checked={f.branch_ids.includes(b._id)} onChange={() => toggleBranch(b._id)} /> {b.name}
                </label>
              ))}
            </div>
          </Field>
        )}
        {!isNew && (
          <div className="at-device">
            <Smartphone size={16} />
            <span>{row.device_bound ? a.phoneLocked.replace("{label}", short(row.device_label)) : a.phoneFree}</span>
            {row.device_bound && (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={resetPhone} disabled={resetting || busy}>
                <RefreshCw size={14} /> {a.resetPhone}
              </button>
            )}
          </div>
        )}
        {!isNew && <StaffDocs ctx={ctx} staffId={row._id} />}
        <label className="md-switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{a.active}</span>
        </label>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

// ============================ BRANCHES ============================
export function BranchesTab({ ctx }) {
  const { a, data, readOnly } = ctx;
  const [editing, setEditing] = useState(null);
  const activeCount = data.branches.filter((b) => b.active).length;
  const full = activeCount >= data.limits.branches;

  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="pe-list-head">
          <div>
            <h2 style={{ margin: 0 }}>{a.tabs.branches}</h2>
            <small className="rs-muted">{a.branchCount.replace("{n}", activeCount).replace("{max}", data.limits.branches)}</small>
          </div>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => (full && data.branches.length ? ctx.askBuy({}) : setEditing({}))} disabled={readOnly}>
            {full && data.branches.length ? <Lock size={14} /> : <Plus size={15} />} {a.addBranch}
          </button>
        </div>
        <p className="rs-muted" style={{ margin: "8px 0 0" }}>
          {a.branchSub}
        </p>
      </section>

      {data.branches.length === 0 && (
        <section className="panel-card rs-empty">
          <MapPin size={30} />
          <p>{a.noBranch}</p>
          <button type="button" className="md-btn md-btn-primary" onClick={() => setEditing({})} disabled={readOnly}>
            <Plus size={15} /> {a.addBranch}
          </button>
        </section>
      )}

      <div className="at-branches">
        {data.branches.map((b) => {
          const has = Number.isFinite(b.lat) && Number.isFinite(b.lng);
          return (
            <button key={b._id} type="button" className={`panel-card at-branch ${b.active ? "" : "off"}`} onClick={() => setEditing(b)} disabled={readOnly}>
              <span className={`at-pin ${has ? "ok" : ""}`}>
                <MapPin size={20} />
              </span>
              <span className="rs-staff-text">
                <b>{b.name}</b>
                <small>{b.address || (has ? `${b.lat.toFixed(5)}, ${b.lng.toFixed(5)}` : a.noLocation)}</small>
                <small className="rs-muted">{a.radiusHint.replace("{m}", b.radius_m).split(".")[0]}</small>
              </span>
              {!b.active && <span className="rs-pill">{a.off}</span>}
              {b.active && !b.usable && <span className="rs-pill warn">{a.overLimit}</span>}
            </button>
          );
        })}
      </div>

      {full && data.branches.length > 0 && (
        <section className="panel-card at-limit">
          <MapPin size={18} />
          <span>
            <b>{a.branchLimitTitle}</b>
            <small>{a.branchLimitSub.replace("{coins}", fmt(data.slot_price))}</small>
          </span>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({})} disabled={readOnly}>
            <CoinIcon size={15} /> {a.buyBranch.replace("{coins}", fmt(data.slot_price))}
          </button>
        </section>
      )}

      {editing && <BranchModal ctx={ctx} row={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function BranchModal({ ctx, row, onClose }) {
  const { a } = ctx;
  const isNew = !row._id;
  const [f, setF] = useState({ name: row.name || "", address: row.address || "", lat: row.lat ?? "", lng: row.lng ?? "", radius_m: row.radius_m || 100, active: row.active !== false });
  const { busy, error, setError, save, remove } = useSaver(ctx, "branches", onClose);
  const [locating, setLocating] = useState(false);
  const [acc, setAcc] = useState(null);

  const locate = () => {
    if (!navigator.geolocation) return setError(a.locFail);
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setF((x) => ({ ...x, lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) }));
        setAcc(Math.round(pos.coords.accuracy));
        setLocating(false);
      },
      () => {
        setError(a.locFail);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };
  // "11.5564, 104.9282" pasted into the latitude box fills both
  const onLat = (v) => {
    const m = String(v).match(/(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)/);
    if (m) setF((x) => ({ ...x, lat: m[1], lng: m[2] }));
    else setF((x) => ({ ...x, lat: v }));
  };
  const has = f.lat !== "" && f.lng !== "" && Number.isFinite(Number(f.lat)) && Number.isFinite(Number(f.lng));
  const submit = (e) => {
    e.preventDefault();
    save(row, { name: f.name, address: f.address, lat: f.lat === "" ? null : Number(f.lat), lng: f.lng === "" ? null : Number(f.lng), radius_m: Number(f.radius_m), active: f.active });
  };

  return (
    <Modal title={isNew ? a.addBranch : a.editBranch} onClose={onClose} busy={busy} footer={<Footer a={a} busy={busy} onClose={onClose} form="at-branch" canSave={f.name.trim()} onRemove={isNew ? null : () => remove(row)} />}>
      <form id="at-branch" className="md-fields" onSubmit={submit}>
        <Field label={a.branchName} htmlFor="ab-name">
          <input id="ab-name" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </Field>
        <Field label={`${a.address} (${a.optional})`} htmlFor="ab-addr">
          <input id="ab-addr" maxLength={200} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </Field>
        <Field label={a.location} hint={a.pasteHint}>
          <button type="button" className="md-btn md-btn-ghost at-locate" onClick={locate} disabled={locating}>
            {locating ? <Loader2 size={16} className="md-spin" /> : <Crosshair size={16} />} {locating ? a.locating : a.useMyLocation}
            {acc !== null && !locating && <small>±{acc} m</small>}
          </button>
          <div className="md-fields-grid">
            <input inputMode="decimal" placeholder={a.lat} aria-label={a.lat} value={f.lat} onChange={(e) => onLat(e.target.value)} />
            <input inputMode="decimal" placeholder={a.lng} aria-label={a.lng} value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} />
          </div>
          {has && (
            <a className="sa-link at-maplink" href={`https://www.google.com/maps?q=${f.lat},${f.lng}`} target="_blank" rel="noreferrer">
              <ExternalLink size={13} /> {a.openMap}
            </a>
          )}
        </Field>
        <Field label={a.radius} hint={a.radiusHint.replace("{m}", f.radius_m)}>
          <div className="at-range">
            <input type="range" min={20} max={1000} step={10} value={f.radius_m} onChange={(e) => setF({ ...f, radius_m: Number(e.target.value) })} aria-label={a.radius} />
            <b>{f.radius_m} m</b>
          </div>
        </Field>
        <label className="md-switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{a.active}</span>
        </label>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

// ============================ SHIFTS ============================
export function ShiftsTab({ ctx }) {
  const { a, data, readOnly } = ctx;
  const [editing, setEditing] = useState(null);
  const countOf = (id) => data.staff.filter((s) => s.active && s.shift_id === id).length;
  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="pe-list-head">
          <div>
            <h2 style={{ margin: 0 }}>{a.tabs.shifts}</h2>
          </div>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setEditing({})} disabled={readOnly}>
            <Plus size={15} /> {a.addShift}
          </button>
        </div>
        <p className="rs-muted" style={{ margin: "8px 0 0" }}>
          {a.shiftSub}
        </p>
      </section>
      {data.shifts.length === 0 && (
        <section className="panel-card rs-empty">
          <Clock size={30} />
          <p>{a.noShifts}</p>
          <button type="button" className="md-btn md-btn-primary" onClick={() => setEditing({})} disabled={readOnly}>
            <Plus size={15} /> {a.addShift}
          </button>
        </section>
      )}
      <div className="at-branches">
        {data.shifts.map((s) => (
          <button key={s._id} type="button" className={`panel-card at-shift ${s.active ? "" : "off"}`} onClick={() => setEditing(s)} disabled={readOnly} style={{ "--sc": s.color }}>
            <span className="at-shift-bar" />
            <span className="rs-staff-text">
              <b>{s.name}</b>
              <small className="at-shift-time">
                {s.start} – {s.end}
                {s.end < s.start ? " 🌙" : ""} · {s.break_min}m
              </small>
              {(s.in_from || s.in_to || s.out_from || s.out_to) && (
                <small className="at-shift-win">
                  {a.inShort} {s.in_from || "…"}–{s.in_to || "…"} · {a.outShort} {s.out_from || "…"}–{s.out_to || "…"}
                </small>
              )}
              <span className="at-days">
                {DAY_ORDER.map((d) => (
                  <i key={d} className={s.days.includes(d) ? "on" : ""}>
                    {a.dayShort[d]}
                  </i>
                ))}
              </span>
            </span>
            <span className="rs-pill">{a.staffOnShift.replace("{n}", countOf(s._id))}</span>
          </button>
        ))}
      </div>
      {editing && <ShiftModal ctx={ctx} row={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ShiftModal({ ctx, row, onClose }) {
  const { a } = ctx;
  const isNew = !row._id;
  const [f, setF] = useState({
    name: row.name || "",
    start: row.start || "08:00",
    end: row.end || "17:00",
    break_min: row.break_min ?? 60,
    days: row.days || [1, 2, 3, 4, 5, 6],
    color: row.color || COLORS[0],
    active: row.active !== false,
    in_from: row.in_from || "",
    in_to: row.in_to || "",
    out_from: row.out_from || "",
    out_to: row.out_to || "",
  });
  const { busy, error, save, remove } = useSaver(ctx, "shifts", onClose);
  const [limit, setLimit] = useState(!!(row.in_from || row.in_to || row.out_from || row.out_to));
  // a sensible start when the owner turns the limits on: in 1 h before → 1 h after start, out from 15 min before end → 2 h after
  const shiftTime = (hhmm, min) => {
    const [h, m] = hhmm.split(":").map(Number);
    const t = (((h * 60 + m + min) % 1440) + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  };
  const turnLimit = (v) => {
    setLimit(v);
    if (v && !f.in_from && !f.in_to && !f.out_from && !f.out_to) setF((x) => ({ ...x, in_from: shiftTime(x.start, -60), in_to: shiftTime(x.start, 60), out_from: shiftTime(x.end, -15), out_to: shiftTime(x.end, 120) }));
  };
  const toggle = (d) => setF((x) => ({ ...x, days: x.days.includes(d) ? x.days.filter((y) => y !== d) : [...x.days, d] }));
  const submit = (e) => {
    e.preventDefault();
    save(row, { ...f, break_min: Number(f.break_min) || 0, ...(limit ? {} : { in_from: "", in_to: "", out_from: "", out_to: "" }) });
  };
  return (
    <Modal
      title={isNew ? a.addShift : a.editShift}
      onClose={onClose}
      busy={busy}
      footer={<Footer a={a} busy={busy} onClose={onClose} form="at-shift" canSave={f.name.trim() && f.start && f.end && f.start !== f.end} onRemove={isNew ? null : () => remove(row)} />}
    >
      <form id="at-shift" className="md-fields" onSubmit={submit}>
        <Field label={a.shiftName} htmlFor="sh-name">
          <input id="sh-name" maxLength={60} placeholder={a.shiftNamePh} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </Field>
        <div className="md-fields-grid">
          <Field label={a.start} htmlFor="sh-start">
            <input id="sh-start" type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
          </Field>
          <Field label={a.end} htmlFor="sh-end" hint={f.end < f.start ? a.nightHint : null}>
            <input id="sh-end" type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
          </Field>
        </div>
        <div className="at-window">
          <label className="md-switch">
            <input type="checkbox" checked={limit} onChange={(e) => turnLimit(e.target.checked)} />
            <span className="md-switch-track" />
            <span>{a.limitTimes}</span>
          </label>
          <small className="rs-hint">{a.limitHint}</small>
          {limit && (
            <div className="at-window-grid">
              <b>{a.inAllowed}</b>
              <input type="time" value={f.in_from} onChange={(e) => setF({ ...f, in_from: e.target.value })} aria-label={`${a.inAllowed} ${a.fromWord}`} />
              <span>–</span>
              <input type="time" value={f.in_to} onChange={(e) => setF({ ...f, in_to: e.target.value })} aria-label={`${a.inAllowed} ${a.toWord}`} />
              <b>{a.outAllowed}</b>
              <input type="time" value={f.out_from} onChange={(e) => setF({ ...f, out_from: e.target.value })} aria-label={`${a.outAllowed} ${a.fromWord}`} />
              <span>–</span>
              <input type="time" value={f.out_to} onChange={(e) => setF({ ...f, out_to: e.target.value })} aria-label={`${a.outAllowed} ${a.toWord}`} />
            </div>
          )}
        </div>
        <Field label={a.breakMin} htmlFor="sh-break">
          <input id="sh-break" type="number" min={0} max={480} step={5} value={f.break_min} onChange={(e) => setF({ ...f, break_min: e.target.value })} />
        </Field>
        <Field label={a.days}>
          <div className="at-days pick">
            {DAY_ORDER.map((d) => (
              <button key={d} type="button" className={f.days.includes(d) ? "on" : ""} onClick={() => toggle(d)} aria-pressed={f.days.includes(d)}>
                {a.dayShort[d]}
              </button>
            ))}
          </div>
        </Field>
        <Field label={a.color}>
          <div className="at-colors">
            {COLORS.map((c) => (
              <button key={c} type="button" className={f.color === c ? "on" : ""} style={{ background: c }} onClick={() => setF({ ...f, color: c })} aria-label={c}>
                {f.color === c && <Check size={14} />}
              </button>
            ))}
          </div>
        </Field>
        <label className="md-switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{a.active}</span>
        </label>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

// ============================ RULES & LINK ============================
export function SettingsTab({ ctx }) {
  const { a, data, readOnly, lang } = ctx;
  const link = staffLink(data.code);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [rules, setRules] = useState(data.rules);
  const [saving, setSaving] = useState(false);
  const [sure, setSure] = useState(false);
  const [printing, setPrinting] = useState(false);
  const dirty = Object.keys(a.rules).some((k) => Number(rules[k]) !== Number(data.rules[k]));

  useEffect(() => {
    let alive = true;
    import("qrcode")
      .then((m) => (m.default || m).toDataURL(link, { width: 480, margin: 1, errorCorrectionLevel: "M" }))
      .then((url) => alive && setQr(url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };
  const share = () => navigator.share?.({ title: data.business.name, text: a.linkSub, url: link }).catch(() => {});
  const newLink = async () => {
    setSure(false);
    try {
      await attendanceService.newCode(ctx.id);
      await ctx.reload();
      ctx.notify({ type: "success", text: a.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const toggleSelfie = async (v) => {
    try {
      await attendanceService.saveSelfie(ctx.id, v);
      await ctx.reload();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const saveRules = async () => {
    setSaving(true);
    try {
      const body = Object.fromEntries(Object.keys(a.rules).map((k) => [k, Number(rules[k])]));
      await attendanceService.saveRules(ctx.id, body);
      await ctx.reload();
      ctx.notify({ type: "success", text: a.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rs-col">
      <section className="panel-card at-link">
        <div className="at-link-text">
          <h2>
            <Link2 size={19} /> {a.linkTitle}
          </h2>
          <p className="rs-muted">{a.linkSub}</p>
          <div className="at-link-box">
            <code>{link}</code>
          </div>
          <div className="at-link-btns">
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={copy}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? a.copied : a.copy}
            </button>
            {typeof navigator !== "undefined" && navigator.share && (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={share}>
                <Share2 size={15} /> {a.share}
              </button>
            )}
            {qr && (
              <a className="md-btn md-btn-ghost sa-btn-sm" href={qr} download={`attendance-qr-${data.code}.png`}>
                <Download size={15} /> {a.downloadQr}
              </a>
            )}
            {!readOnly &&
              (sure ? (
                <span className="at-sure">
                  <small>{a.newLinkSure}</small>
                  <button type="button" className="md-btn md-btn-danger sa-btn-sm" onClick={newLink}>
                    {a.newLink}
                  </button>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setSure(false)}>
                    {a.cancel}
                  </button>
                </span>
              ) : (
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setSure(true)}>
                  <RefreshCw size={15} /> {a.newLink}
                </button>
              ))}
          </div>
        </div>
        <div className="at-sticker-side">
          <StickerPreview scale={0.5} theme={data.qr_theme} logo={data.business.logo_url} name={data.business.name} qr={qr} hours={hoursOf(data.shifts)} note={data.qr_note} />
          <div className="at-link-btns">
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setPrinting(true)} disabled={!qr}>
              <Printer size={15} /> {a.printSticker}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("looks")}>
              <Palette size={15} /> {a.changeStyle}
            </button>
          </div>
        </div>
        {printing && <PrintSticker props={{ theme: data.qr_theme, logo: data.business.logo_url, name: data.business.name, qr, hours: hoursOf(data.shifts), note: data.qr_note }} onDone={() => setPrinting(false)} />}
      </section>

      <section className="panel-card">
        <h2 style={{ margin: "0 0 12px" }}>{a.rulesTitle}</h2>
        <div className="at-rules">
          {Object.entries(a.rules).map(([k, [pre, post]]) => (
            <label key={k} className="at-rule">
              <span>{pre}</span>
              <input type="number" min={k === "auto_out_hours" ? 1 : 0} max={k === "max_accuracy_m" ? 1000 : k === "auto_out_hours" ? 12 : 240} value={rules[k]} onChange={(e) => setRules({ ...rules, [k]: e.target.value })} disabled={readOnly} />
              <span>{post}</span>
            </label>
          ))}
        </div>
        <p className="rs-muted" style={{ margin: "12px 0 0" }}>
          {a.rulesNote}
        </p>
        {dirty && (
          <div className="at-save-row">
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setRules(data.rules)} disabled={saving}>
              {a.cancel}
            </button>
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={saveRules} disabled={saving || readOnly}>
              {saving ? a.saving : a.save}
            </button>
          </div>
        )}
      </section>

      <section className="panel-card at-selfie-set">
        <h2 style={{ margin: 0 }}>
          <ShieldCheck size={18} /> {ctx.lang === "km" ? "ពិនិត្យ GPS ក្លែងក្លាយ" : "Fake GPS check"}
        </h2>
        <p className="rs-muted" style={{ margin: "6px 0 12px" }}>
          {ctx.lang === "km"
            ? "ចាប់កម្មវិធីក្លែងទីតាំង៖ GPS ភាពត្រឹមត្រូវ 0 m ទីតាំងដដែលបេះបិទជាមួយថ្ងៃមុន ឬលោតឆ្ងាយលឿនជាង 250 km/h។ កំណត់ត្រាទាំងនោះទៅ “ត្រូវពិនិត្យ”។"
            : "Catches location-faking apps: GPS that claims 0 m accuracy, the exact same spot as another day, or a jump faster than 250 km/h. Those records go to “Needs review”."}
        </p>
        {data.addons?.att_gps_guard?.active ? (
          <span className="rs-pill ok">
            <Check size={13} /> {ctx.lang === "km" ? "កំពុងដំណើរការ" : "On for every clock-in"}
          </span>
        ) : (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "att_gps_guard" })} disabled={readOnly}>
            <CoinIcon size={15} /> {a.unlockFor.replace("{coins}", fmt(data.addons?.att_gps_guard?.price ?? 40))}
          </button>
        )}
      </section>

      <section className="panel-card at-selfie-set">
        <h2 style={{ margin: 0 }}>
          <Camera size={18} /> {a.selfieTitle}
        </h2>
        <p className="rs-muted" style={{ margin: "6px 0 12px" }}>
          {a.selfieSub}
        </p>
        {data.addons?.att_selfie?.active ? (
          <label className="md-switch">
            <input type="checkbox" checked={data.selfie_required !== false} onChange={(e) => toggleSelfie(e.target.checked)} disabled={readOnly} />
            <span className="md-switch-track" />
            <span>{a.selfieOn}</span>
          </label>
        ) : (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "att_selfie" })} disabled={readOnly}>
            <CoinIcon size={15} /> {a.unlockFor.replace("{coins}", fmt(data.addons?.att_selfie?.price))}
          </button>
        )}
      </section>

      <section className="panel-card">
        <h2 style={{ margin: 0 }}>
          <MapPin size={18} /> {a.addonsTitle}
        </h2>
        <p className="rs-muted" style={{ margin: "6px 0 12px" }}>
          {a.addonsSub.replace("{coins}", fmt(data.slot_price))}
        </p>
        {data.slots.length > 0 && (
          <ul className="at-slots">
            {data.slots.map((s) => (
              <li key={s.item}>
                <MapPin size={16} />
                <b>{a.slot.replace("{n}", s.item.split("-")[1])}</b>
                <small className={s.active ? "" : "at-bad"}>{s.active ? a.slotEnds.replace("{date}", fmtDate(s.expires_at, lang)) : a.slotEnded}</small>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ item: s.item })} disabled={readOnly}>
                  <CoinIcon size={14} /> {a.renewSlot}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({})} disabled={readOnly}>
          <CoinIcon size={15} /> {a.buyBranch.replace("{coins}", fmt(data.slot_price))}
        </button>
      </section>
    </div>
  );
}
