import { useState } from "react";
import { BedDouble, Check, Lock, MonitorUp, Plus, Save, UserRound, Users, X, Printer, Globe, BadgePercent, Send, ShieldCheck, ConciergeBell, Sparkles, Wallet, CalendarSync, KeyRound, Star, Gift, Network } from "lucide-react";
import { guestHouseService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { DeleteButton, Field } from "../restaurant/parts";
import { money } from "./text";

const COLORS = ["#2563EB", "#16A34A", "#7C3AED", "#DB2777", "#EA580C", "#0891B2", "#CA8A04", "#475569"];

// save / remove one row of a collection, then reload the dashboard
function useSaver(ctx, collection, onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await ctx.reload();
      ctx.notify({ type: "success", text: ctx.g.saved });
      onDone();
    } catch (e) {
      if (e.status === 402 && e.response?.product) {
        onDone();
        ctx.askBuy({ addon: e.response.product });
      } else setError(e.message);
      setBusy(false);
    }
  };
  return {
    busy,
    error,
    save: (row, body) => run(() => (row?._id ? guestHouseService.update(ctx.id, collection, row._id, body) : guestHouseService.create(ctx.id, collection, body))),
    remove: (row) => run(() => guestHouseService.remove(ctx.id, collection, row._id)),
  };
}
const fakeR = (g) => ({ confirmDelete: g.sure, remove: g.remove });
function Footer({ g, busy, onClose, form, canSave, onRemove }) {
  return (
    <>
      {onRemove && (
        <span style={{ marginRight: "auto" }}>
          <DeleteButton onDelete={onRemove} r={fakeR(g)} disabled={busy} small />
        </span>
      )}
      <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
        {g.cancel}
      </button>
      <button type="submit" form={form} className="md-btn md-btn-primary" disabled={busy || !canSave}>
        {busy ? g.saving : g.save}
      </button>
    </>
  );
}

// ============================ ROOMS ============================
export function RoomsTab({ ctx }) {
  const { g, data, readOnly, cur, lang } = ctx;
  const [type, setType] = useState(null);
  const [room, setRoom] = useState(null);
  const typeOf = new Map(data.types.map((t) => [t._id, t]));
  const full = data.counts.rooms >= data.limits.rooms;
  const typesFull = data.types.length >= data.limits.types;
  const roomsOn = !!data.addons?.gh_rooms?.active;
  const typesOn = !!data.addons?.gh_types?.active;
  const groups = [{ key: "", rooms: data.rooms }];

  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="pe-list-head">
          <div>
            <h2 style={{ margin: 0 }}>{g.typesTitle}</h2>
            <small className="rs-muted">
              {g.typesSub} {!typesOn && g.typesFree.replace("{n}", data.types.length).replace("{max}", data.limits.types)}
            </small>
          </div>
          <div className="gh-head-btns">
            {!typesOn && (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ addon: "gh_types" })} disabled={readOnly}>
                <CoinIcon size={14} /> {g.unlockTypes} · {data.addons?.gh_types?.price}
              </button>
            )}
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => (typesFull ? ctx.askBuy({ addon: "gh_types" }) : setType({}))} disabled={readOnly}>
              {typesFull ? <Lock size={14} /> : <Plus size={15} />} {g.addType}
            </button>
          </div>
        </div>
        {data.types.length > 0 && (
          <div className="gh-types">
            {data.types.map((t) => (
              <button key={t._id} type="button" className={`gh-type ${t.active === false ? "off" : ""}`} style={{ "--c": t.color }} onClick={() => setType(t)} disabled={readOnly}>
                <span className="gh-type-bar" />
                <b>{t.name}</b>
                <span className="gh-type-price">
                  {money(t.price, cur)} <small>{g.perNight}</small>
                </span>
                <small className="rs-muted">
                  <Users size={12} /> {t.capacity} {t.beds ? `· ${t.beds}` : ""}
                </small>
                {t.amenities?.length > 0 && <small className="gh-amen">{t.amenities.map((k) => g.amenities[k]).join(" · ")}</small>}
                <small className="rs-muted">
                  {data.rooms.filter((r) => r.type_id === t._id && r.active).length} × {g.room.toLowerCase()}
                </small>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel-card">
        <div className="pe-list-head">
          <div>
            <h2 style={{ margin: 0 }}>{g.roomsTitle}</h2>
            <small className="rs-muted">{roomsOn ? g.roomsUnlimited.replace("{n}", data.counts.rooms) : g.freeRooms5.replace("{n}", data.counts.rooms).replace("{max}", data.limits.rooms)}</small>
          </div>
          <div className="gh-head-btns">
            {!roomsOn && (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ addon: "gh_rooms" })} disabled={readOnly}>
                <CoinIcon size={14} /> {g.unlockRooms} · {data.addons?.gh_rooms?.price}
              </button>
            )}
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => (full ? ctx.askBuy({ addon: "gh_rooms" }) : setRoom({}))} disabled={readOnly || !data.types.length}>
              {full ? <Lock size={14} /> : <Plus size={15} />} {g.addRoom}
            </button>
          </div>
        </div>
        {!data.types.length && <p className="rs-muted">{g.noTypes}</p>}
        {groups.map((grp) => {
          const floors = [...new Set(grp.rooms.map((r) => r.floor || ""))];
          return (
            <div key={grp.key || "all"} className="gh-room-group">
              {floors.map((f) => (
                <div key={f || "-"} className="gh-floor">
                  {floors.length > 1 && <small className="gh-floor-label">{f ? `${g.floor} ${f}` : "—"}</small>}
                  <div className="gh-rooms">
                    {grp.rooms
                      .filter((r) => (r.floor || "") === f)
                      .map((r) => {
                        const t = typeOf.get(r.type_id);
                        return (
                          <button
                            key={r._id}
                            type="button"
                            className={`gh-room ${r.active ? "" : "off"} ${r.usable === false ? "over" : ""}`}
                            style={{ "--c": t?.color || "#64748B" }}
                            onClick={() => setRoom(r)}
                            disabled={readOnly}
                            title={[r.note, ...(r.details || []).map((d) => `${d.label}: ${d.value}`)].filter(Boolean).join("\n")}
                          >
                            <b>{r.name}</b>
                            <small>{t?.name || "?"}</small>
                            {!r.active && <em>{g.off}</em>}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </section>

      {type && <TypeModal ctx={ctx} row={type} onClose={() => setType(null)} />}
      {room && <RoomModal ctx={ctx} row={room} onClose={() => setRoom(null)} />}
    </div>
  );
}

function TypeModal({ ctx, row, onClose }) {
  const { g, data } = ctx;
  const isNew = !row._id;
  const [f, setF] = useState({
    name: row.name || "",
    price: row.price ?? "",
    capacity: row.capacity || 2,
    beds: row.beds || "",
    amenities: row.amenities || [],
    color: row.color || COLORS[data.types.length % COLORS.length],
    active: row.active !== false,
  });
  const { busy, error, save, remove } = useSaver(ctx, "room-types", onClose);
  const toggle = (k) => setF({ ...f, amenities: f.amenities.includes(k) ? f.amenities.filter((x) => x !== k) : [...f.amenities, k] });
  const submit = (e) => {
    e.preventDefault();
    save(row, { ...f, price: Number(f.price), capacity: Number(f.capacity) || 1 });
  };
  return (
    <Modal title={isNew ? g.addType : g.editType} onClose={onClose} busy={busy} footer={<Footer g={g} busy={busy} onClose={onClose} form="gh-type" canSave={f.name.trim() && f.price !== ""} onRemove={isNew ? null : () => remove(row)} />}>
      <form id="gh-type" className="md-fields" onSubmit={submit}>
        <Field label={g.typeName} htmlFor="gt-name">
          <input id="gt-name" maxLength={60} placeholder={g.typeNamePh} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </Field>
        <div className="md-fields-grid">
          <Field label={`${g.price} (${ctx.cur})`} htmlFor="gt-price">
            <input id="gt-price" type="number" min={0} step="any" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          </Field>
          <Field label={g.capacity} htmlFor="gt-cap">
            <input id="gt-cap" type="number" min={1} max={20} value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} />
          </Field>
        </div>
        <Field label={g.beds} htmlFor="gt-beds">
          <input id="gt-beds" maxLength={60} placeholder={g.bedsPh} value={f.beds} onChange={(e) => setF({ ...f, beds: e.target.value })} />
        </Field>
        <Field label={g.facilities}>
          <div className="gh-checks">
            {data.lists.amenities.map((k) => (
              <label key={k} className={f.amenities.includes(k) ? "on" : ""}>
                <input type="checkbox" checked={f.amenities.includes(k)} onChange={() => toggle(k)} />
                <span>{g.amenities[k]}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label={g.color}>
          <div className="gh-colors">
            {COLORS.map((c) => (
              <button key={c} type="button" className={f.color === c ? "on" : ""} style={{ background: c }} onClick={() => setF({ ...f, color: c })} aria-label={c} />
            ))}
          </div>
        </Field>
        <label className="md-switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{g.active}</span>
        </label>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

function RoomModal({ ctx, row, onClose }) {
  const { g, data } = ctx;
  const isNew = !row._id;
  const last = data.rooms[data.rooms.length - 1];
  const nextName = isNew && last && /^\d+$/.test(last.name) ? String(Number(last.name) + 1) : "";
  const [f, setF] = useState({
    name: row.name || nextName,
    floor: row.floor ?? last?.floor ?? "",
    type_id: row.type_id || last?.type_id || data.types[0]?._id || "",
    note: row.note || "",
    details: row.details?.length ? row.details.map((d) => ({ ...d })) : [{ label: "", value: "" }],
    active: row.active !== false,
  });
  const setDetail = (i, k, v) => setF({ ...f, details: f.details.map((d, j) => (j === i ? { ...d, [k]: v } : d)) });
  const { busy, error, save, remove } = useSaver(ctx, "rooms", onClose);
  const submit = (e) => {
    e.preventDefault();
    save(row, { ...f, details: f.details.filter((d) => d.label.trim() || d.value.trim()) });
  };
  return (
    <Modal title={isNew ? g.addRoom : g.editRoom} onClose={onClose} busy={busy} footer={<Footer g={g} busy={busy} onClose={onClose} form="gh-room" canSave={f.name.trim() && f.type_id} onRemove={isNew ? null : () => remove(row)} />}>
      <form id="gh-room" className="md-fields" onSubmit={submit}>
        <div className="md-fields-grid">
          <Field label={g.roomName} htmlFor="gr-name">
            <input id="gr-name" maxLength={20} placeholder="101" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
          </Field>
          <Field label={g.floor} htmlFor="gr-floor">
            <input id="gr-floor" maxLength={20} placeholder="1" value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value })} />
          </Field>
        </div>
        <Field label={g.roomType}>
          <div className="gh-pick-type">
            {data.types.map((t) => (
              <button key={t._id} type="button" className={f.type_id === t._id ? "on" : ""} style={{ "--c": t.color }} onClick={() => setF({ ...f, type_id: t._id })}>
                <BedDouble size={15} /> {t.name} · {money(t.price, ctx.cur)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={g.description} htmlFor="gr-note">
          <textarea id="gr-note" rows={2} maxLength={500} placeholder={g.descriptionPh} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        <Field label={g.details} hint={g.detailsHint}>
          <div className="gh-details">
            {f.details.map((d, i) => (
              <div key={i} className="gh-detail">
                <input maxLength={40} placeholder={g.detailLabel} value={d.label} onChange={(e) => setDetail(i, "label", e.target.value)} aria-label={g.detailLabel} />
                <input maxLength={120} placeholder={g.detailValue} value={d.value} onChange={(e) => setDetail(i, "value", e.target.value)} aria-label={g.detailValue} />
                <button type="button" className="md-icon-btn" onClick={() => setF({ ...f, details: f.details.length > 1 ? f.details.filter((_, j) => j !== i) : [{ label: "", value: "" }] })} aria-label={g.remove}>
                  <X size={15} />
                </button>
              </div>
            ))}
            {f.details.length < 12 && (
              <button type="button" className="gh-add" onClick={() => setF({ ...f, details: [...f.details, { label: "", value: "" }] })}>
                <Plus size={13} /> {g.addDetail}
              </button>
            )}
          </div>
        </Field>
        <label className="md-switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{g.active}</span>
        </label>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

// ============================ SETTINGS ============================
export function SettingsTab({ ctx }) {
  const { g, data, readOnly } = ctx;
  const s = data.settings;
  const [f, setF] = useState({ currency: s.currency, check_in: s.check_in, check_out: s.check_out, methods: s.methods, khr_rate: s.khr_rate, receipt_note: s.receipt_note || "" });
  const [busy, setBusy] = useState(false);
  const methodsOn = !!data.addons?.gh_payments?.active;
  const toggle = (k) => {
    if (!f.methods.includes(k) && f.methods.length >= data.limits.methods) return ctx.askBuy({ addon: "gh_payments" });
    setF({ ...f, methods: f.methods.includes(k) ? f.methods.filter((x) => x !== k) : [...f.methods, k] });
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await guestHouseService.saveSettings(ctx.id, { ...f, khr_rate: Number(f.khr_rate) });
      await ctx.reload();
      ctx.notify({ type: "success", text: g.saved });
    } catch (err) {
      ctx.notify({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel-card">
      <h2 style={{ marginTop: 0 }}>{g.setTitle}</h2>
      <form className="md-fields" onSubmit={save}>
        <div className="md-fields-grid">
          <Field label={g.checkInTime} htmlFor="gs-in">
            <input id="gs-in" type="time" value={f.check_in} onChange={(e) => setF({ ...f, check_in: e.target.value })} />
          </Field>
          <Field label={g.checkOutTime} htmlFor="gs-out">
            <input id="gs-out" type="time" value={f.check_out} onChange={(e) => setF({ ...f, check_out: e.target.value })} />
          </Field>
        </div>
        <div className="md-fields-grid">
          <Field label={g.currency}>
            <div className="at-seg">
              {["USD", "KHR"].map((k) => (
                <button key={k} type="button" className={f.currency === k ? "on" : ""} onClick={() => setF({ ...f, currency: k })}>
                  {k === "USD" ? "$ USD" : "៛ KHR"}
                </button>
              ))}
            </div>
          </Field>
          <Field label={g.khrRate} htmlFor="gs-rate">
            <input id="gs-rate" type="number" min={1000} max={10000} value={f.khr_rate} onChange={(e) => setF({ ...f, khr_rate: e.target.value })} />
          </Field>
        </div>
        <Field label={g.methodsLabel} hint={methodsOn ? null : g.methodsFree.replace("{max}", data.limits.methods)}>
          <div className="gh-checks">
            {data.lists.methods.map((k) => {
              const locked = !methodsOn && !f.methods.includes(k) && f.methods.length >= data.limits.methods;
              return (
                <label key={k} className={`${f.methods.includes(k) ? "on" : ""} ${locked ? "locked" : ""}`}>
                  <input type="checkbox" checked={f.methods.includes(k)} onChange={() => toggle(k)} />
                  <span>{g.methods[k]}</span>
                  {locked && <Lock size={13} />}
                </label>
              );
            })}
          </div>
          {!methodsOn && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm gh-unlock" onClick={() => ctx.askBuy({ addon: "gh_payments" })} disabled={readOnly}>
              <CoinIcon size={14} /> {g.unlock.replace("{coins}", data.addons?.gh_payments?.price ?? 60)}
            </button>
          )}
        </Field>
        <Field label={g.receiptNote} htmlFor="gs-note">
          <input id="gs-note" maxLength={300} placeholder={g.receiptNotePh} value={f.receipt_note} onChange={(e) => setF({ ...f, receipt_note: e.target.value })} />
        </Field>
        <div className="at-save-row">
          <button type="submit" className="md-btn md-btn-primary" disabled={busy || readOnly || !f.methods.length}>
            <Save size={15} /> {busy ? g.saving : g.save}
          </button>
        </div>
      </form>
    </section>
  );
}

// ============================ ADD-ONS ============================
const ADDON_ICON = {
  gh_rooms: BedDouble,
  gh_types: Users,
  gh_payments: Check,
  gh_staff: UserRound,
  gh_display: MonitorUp,
  gh_printer: Printer,
  gh_website: Globe,
  gh_promos: BadgePercent,
  gh_customers: UserRound,
  gh_telegram: Send,
  gh_police: ShieldCheck,
  gh_services: ConciergeBell,
  gh_housekeeping: Sparkles,
  gh_expenses: Wallet,
  gh_ical: CalendarSync,
  gh_longstay: KeyRound,
  gh_reviews: Star,
  gh_loyalty: Gift,
  gh_branches: Network,
};
export function AddonsTab({ ctx }) {
  const { g, data, readOnly } = ctx;
  return (
    <div className="rs-col">
      <section className="panel-card">
        <h2 style={{ margin: 0 }}>{g.addonsTitle}</h2>
        <p className="rs-muted" style={{ margin: "6px 0 0" }}>
          {g.addonsSub}
        </p>
      </section>
      <div className="gh-addons">
        {[
          "gh_rooms",
          "gh_types",
          "gh_payments",
          "gh_staff",
          "gh_display",
          "gh_printer",
          "gh_website",
          "gh_promos",
          "gh_customers",
          "gh_telegram",
          "gh_police",
          "gh_services",
          "gh_housekeeping",
          "gh_expenses",
          "gh_ical",
          "gh_longstay",
          "gh_reviews",
          "gh_loyalty",
          "gh_branches",
        ].map((k) => {
          const info = g.addonInfo[k];
          const a = data.addons?.[k] || {};
          const Icon = ADDON_ICON[k];
          return (
            <section key={k} className={`panel-card gh-addon ${a.active ? "on" : ""}`}>
              <span className="rs-addon-ic">
                <Icon size={22} />
              </span>
              <b>{info.name}</b>
              <p className="rs-muted">{info.what}</p>
              <ul className="at-perks">
                {info.perks.map((p) => (
                  <li key={p}>
                    <Check size={14} /> {p}
                  </li>
                ))}
              </ul>
              {a.active ? (
                <span className="rs-pill ok">
                  <Check size={13} /> {g.owned}
                </span>
              ) : (
                <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly}>
                  <CoinIcon size={15} /> {g.unlock.replace("{coins}", a.price ?? "")}
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
