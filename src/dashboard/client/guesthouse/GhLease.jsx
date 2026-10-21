import { useCallback, useEffect, useState } from "react";
import { BedDouble, Droplets, KeyRound, LogOut, Pencil, Plus, ReceiptText, Trash2, Zap } from "lucide-react";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { Modal } from "../../super_admin/parts";
import { fmtDay, money, todayKH } from "./text";
import { x3 } from "./gh3-text";
import { api, StayModal } from "./GhStay";
import { Hero, Perks } from "./GhExtras";

// Long stay / monthly rent (gh_longstay) — owner dashboard and desk POS
const isOn = (ctx) => !!(ctx.data.addons?.gh_longstay?.active || ctx.data.longstay);
const monthLabel = (m, lang) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
// to bill first, then who owes, then paid up, then moved out
const rank = (x) => (!["in", "booked"].includes(x.status) ? 3 : x.bill_due ? 0 : x.bill.balance > 0 ? 1 : 2);
const round = (v, cur) => (cur === "KHR" ? Math.round(v) : Math.round(v * 100) / 100);

function Num({ label, value, onChange, step = "any", min = 0, ...rest }) {
  return (
    <label className="ghb-field">
      <span>{label}</span>
      <input type="number" inputMode="decimal" min={min} step={step} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </label>
  );
}

function LeaseModal({ ctx, row, busyRooms = [], onClose, onDone }) {
  const t = x3(ctx.lang);
  const { g, data } = ctx;
  const L = row?.lease;
  const [f, setF] = useState(() => ({
    room_id: row?.room_id || "",
    guest: { name: row?.guest.name || "", phone: row?.guest.phone || "", id_number: row?.guest.id_number || "" },
    start: L?.start || todayKH(),
    end: L?.end || "",
    rent: L ? String(L.rent) : "",
    deposit: "",
    deposit_method: data.settings.methods?.[0] || "cash",
    elec_rate: L ? String(L.elec_rate) : "",
    water_rate: L ? String(L.water_rate) : "",
    fixed: L?.fixed?.map((x) => ({ ...x, amount: String(x.amount) })) || [],
    bill_day: L ? String(L.bill_day) : "1",
    meter: { elec: "", water: "" },
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const n = (v) => (v === "" ? undefined : Number(v));
  const save = async () => {
    setBusy(true);
    setError("");
    const body = {
      guest: f.guest,
      end: f.end,
      rent: n(f.rent),
      elec_rate: n(f.elec_rate) ?? 0,
      water_rate: n(f.water_rate) ?? 0,
      fixed: f.fixed.filter((x) => x.label.trim()).map((x) => ({ label: x.label, amount: Number(x.amount) || 0 })),
      bill_day: n(f.bill_day) ?? 1,
      ...(row ? {} : { room_id: f.room_id, start: f.start, deposit: n(f.deposit) ?? 0, deposit_method: f.deposit_method, meter: { elec: n(f.meter.elec) ?? 0, water: n(f.meter.water) ?? 0 } }),
    };
    try {
      await (row ? api(ctx).saveLease(ctx.id, row._id, body) : api(ctx).addLease(ctx.id, body));
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const rooms = data.rooms.filter((r) => r.active && r.usable !== false && !busyRooms.includes(r._id));
  return (
    <Modal
      size="lg"
      title={row ? t.lsEdit : t.lsNew}
      onClose={onClose}
      busy={busy}
      footer={
        <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || !f.guest.name.trim() || !(Number(f.rent) > 0) || (!row && !f.room_id)}>
          {busy ? t.saving : t.save}
        </button>
      }
    >
      <div className="ghex-form">
        {error && <div className="md-form-error">{error}</div>}
        {!row && (
          <div className="ghb-field">
            <span>{t.lsRoom} *</span>
            <div className="ghb-chips">
              {rooms.map((r) => (
                <button key={r._id} type="button" className={f.room_id === r._id ? "on" : ""} onClick={() => setF({ ...f, room_id: r._id })}>
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="ghb-two">
          <label className="ghb-field">
            <span>{g.guestName} *</span>
            <input maxLength={80} value={f.guest.name} onChange={(e) => setF({ ...f, guest: { ...f.guest, name: e.target.value } })} autoFocus={!!row} />
          </label>
          <label className="ghb-field">
            <span>{g.phone}</span>
            <input type="tel" maxLength={30} value={f.guest.phone} onChange={(e) => setF({ ...f, guest: { ...f.guest, phone: e.target.value } })} />
          </label>
        </div>
        <div className="ghb-two">
          <label className="ghb-field">
            <span>{t.lsStart}</span>
            <input type="date" value={f.start} disabled={!!row} onChange={(e) => e.target.value && setF({ ...f, start: e.target.value })} />
          </label>
          <label className="ghb-field">
            <span>{t.lsEnd}</span>
            <input type="date" value={f.end} min={f.start} onChange={(e) => setF({ ...f, end: e.target.value })} />
          </label>
        </div>
        <div className="ghls-grid">
          <Num label={`${t.lsRent} *`} value={f.rent} onChange={(v) => setF({ ...f, rent: v })} />
          {!row && <Num label={t.lsDeposit} value={f.deposit} onChange={(v) => setF({ ...f, deposit: v })} />}
          <Num label={t.lsElecRate} value={f.elec_rate} onChange={(v) => setF({ ...f, elec_rate: v })} placeholder="0.25" />
          <Num label={t.lsWaterRate} value={f.water_rate} onChange={(v) => setF({ ...f, water_rate: v })} placeholder="0.5" />
          <Num label={t.lsBillDay} value={f.bill_day} step={1} min={1} max={28} onChange={(v) => setF({ ...f, bill_day: v })} />
        </div>
        {!row && <small className="ghls-sub">{t.lsMeters}</small>}
        {!row && (
          <div className="ghls-grid">
            <Num label={`⚡ ${t.lsElec}`} value={f.meter.elec} onChange={(v) => setF({ ...f, meter: { ...f.meter, elec: v } })} />
            <Num label={`💧 ${t.lsWater}`} value={f.meter.water} onChange={(v) => setF({ ...f, meter: { ...f.meter, water: v } })} />
          </div>
        )}
        <div className="ghb-field">
          <span>{t.lsFixed}</span>
          {f.fixed.map((x, i) => (
            <div key={i} className="ghls-fixed">
              <input maxLength={60} value={x.label} placeholder="Internet" onChange={(e) => setF({ ...f, fixed: f.fixed.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) })} />
              <input type="number" min={0} step="any" value={x.amount} onChange={(e) => setF({ ...f, fixed: f.fixed.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)) })} className="gh-num" />
              <button type="button" className="md-icon-btn" onClick={() => setF({ ...f, fixed: f.fixed.filter((_, j) => j !== i) })} aria-label="remove">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" className="gh-add" onClick={() => setF({ ...f, fixed: [...f.fixed, { label: "", amount: "" }] })} disabled={f.fixed.length >= 10}>
            <Plus size={13} /> {t.lsAddFixed}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function BillModal({ ctx, row, onClose, onDone }) {
  const t = x3(ctx.lang);
  const { cur, lang } = ctx;
  const L = row.lease;
  const month = todayKH().slice(0, 7);
  const [f, setF] = useState({ elec: String(L.meter?.elec ?? 0), water: String(L.meter?.water ?? 0) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const eU = Math.max(0, (Number(f.elec) || 0) - (L.meter?.elec || 0));
  const wU = Math.max(0, (Number(f.water) || 0) - (L.meter?.water || 0));
  const lines = [
    [`${ctx.g.addonInfo.gh_longstay ? t.lsRent.split(" /")[0] : "Rent"}`, L.rent],
    [`⚡ ${t.lsUnits.replace("{n}", eU)}`, round(eU * (L.elec_rate || 0), cur)],
    [`💧 ${t.lsUnits.replace("{n}", wU)}`, round(wU * (L.water_rate || 0), cur)],
    ...(L.fixed || []).map((x) => [x.label, x.amount]),
  ].filter(([, v]) => v > 0);
  const back = (Number(f.elec) || 0) < (L.meter?.elec || 0) || (Number(f.water) || 0) < (L.meter?.water || 0);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api(ctx).leaseBill(ctx.id, row._id, { month, elec: Number(f.elec) || 0, water: Number(f.water) || 0 });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={t.lsBillTitle.replace("{month}", monthLabel(month, lang))}
      onClose={onClose}
      busy={busy}
      footer={
        <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || back}>
          <ReceiptText size={15} /> {t.lsMakeBill} ·{" "}
          {money(
            lines.reduce((a, [, v]) => a + v, 0),
            cur,
          )}
        </button>
      }
    >
      <div className="ghex-form">
        {error && <div className="md-form-error">{error}</div>}
        <p className="rs-muted" style={{ margin: 0 }}>
          <BedDouble size={14} /> {row.room_name} · <b>{row.guest.name}</b>
        </p>
        <div className="ghb-two">
          <label className="ghb-field">
            <span>
              <Zap size={13} /> {t.lsElec} <small className="rs-muted">· {t.lsPrev.replace("{n}", L.meter?.elec ?? 0)}</small>
            </span>
            <input type="number" inputMode="decimal" min={L.meter?.elec || 0} step="any" value={f.elec} onChange={(e) => setF({ ...f, elec: e.target.value })} autoFocus />
          </label>
          <label className="ghb-field">
            <span>
              <Droplets size={13} /> {t.lsWater} <small className="rs-muted">· {t.lsPrev.replace("{n}", L.meter?.water ?? 0)}</small>
            </span>
            <input type="number" inputMode="decimal" min={L.meter?.water || 0} step="any" value={f.water} onChange={(e) => setF({ ...f, water: e.target.value })} />
          </label>
        </div>
        <div className="gh-bill">
          {lines.map(([label, v]) => (
            <div key={label} className="gh-line">
              <span>{label}</span>
              <b>{money(v, cur)}</b>
            </div>
          ))}
          <div className="gh-line gh-total">
            <span>{t.lsTotal}</span>
            <b>
              {money(
                lines.reduce((a, [, v]) => a + v, 0),
                cur,
              )}
            </b>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function EndModal({ ctx, row, onClose, onDone }) {
  const t = x3(ctx.lang);
  const { cur, g } = ctx;
  const dep = (row.lease && row.bill && row.lease.deposit) || 0;
  const [refund, setRefund] = useState(dep > 0);
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const left = row.bill.balance + (refund ? 0 : 0);
  return (
    <Modal
      title={t.lsEndTitle.replace("{name}", row.guest.name)}
      onClose={onClose}
      busy={busy}
      footer={
        <button
          type="button"
          className="md-btn md-btn-danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await api(ctx).endLease(ctx.id, row._id, { refund_deposit: refund, method });
              onDone();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <LogOut size={15} /> {t.lsEndBtn}
        </button>
      }
    >
      <div className="ghex-form">
        {error && <div className="md-form-error">{error}</div>}
        <p className="rs-muted" style={{ margin: 0 }}>
          {t.lsEndNote}
        </p>
        {left > 0 && <div className="rs-banner warn">{t.lsOwes.replace("{amt}", money(left, cur))}</div>}
        {dep > 0 && (
          <>
            <label className="md-switch">
              <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} />
              <span className="md-switch-track" />
              <span>{t.lsRefund.replace("{amt}", money(dep, cur))}</span>
            </label>
            {refund && (
              <div className="ghb-chips">
                {(ctx.data.settings.methods || ["cash"]).map((k) => (
                  <button key={k} type="button" className={method === k ? "on" : ""} onClick={() => setMethod(k)}>
                    {g.methods[k]}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

export function LeasesTab({ ctx }) {
  const { lang, readOnly, cur } = ctx;
  const t = x3(lang);
  const on = isOn(ctx);
  const desk = ctx.role === "desk";
  const [d, setD] = useState(null);
  const [modal, setModal] = useState(null); // { kind: new|edit|bill|end|stay, row }
  const load = useCallback(() => {
    if (!on) return;
    api(ctx)
      .leases(ctx.id)
      .then((r) => setD(r.data))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx.id, on]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);
  const done = () => {
    setModal(null);
    ctx.notify({ type: "success", text: t.saved || ctx.g.saved });
    load();
    ctx.reload?.();
  };
  const hero = (
    <Hero
      icon={KeyRound}
      title={t.lsTitle}
      sub={on ? t.lsSub : t.lsOff.replace("{price}", ctx.data.addons?.gh_longstay?.price ?? "")}
      addon="gh_longstay"
      ctx={ctx}
      yearly
      on={ctx.pos ? true : undefined}
      extra={
        on &&
        !desk && (
          <button type="button" className="md-btn md-btn-primary" onClick={() => setModal({ kind: "new" })} disabled={readOnly}>
            <Plus size={16} /> {t.lsNew}
          </button>
        )
      }
    />
  );
  if (!on)
    return (
      <div className="rs-col">
        {hero}
        <Perks ctx={ctx} addon="gh_longstay" />
      </div>
    );
  if (!d) return <ListSkeleton rows={4} />;
  return (
    <div className="rs-col">
      {hero}
      <div className="at-tiles gh-kpis ghls-kpis">
        <div className="at-tile t-blue">
          <b>{d.counts.tenants}</b>
          <small>{t.lsTenants}</small>
        </div>
        <div className="at-tile">
          <b>{money(d.rent_month, cur)}</b>
          <small>{t.lsRentMonth}</small>
        </div>
        <div className={`at-tile ${d.counts.to_bill ? "t-warn" : ""}`}>
          <b>{d.counts.to_bill}</b>
          <small>{t.lsToBill}</small>
        </div>
        <div className={`at-tile ${d.owed > 0 ? "t-bad" : "t-ok"}`}>
          <b>{money(d.owed, cur)}</b>
          <small>{t.lsOwed}</small>
        </div>
      </div>
      {!d.list.length ? (
        <section className="panel-card ghpm-empty">
          <KeyRound size={40} />
          <p className="rs-muted">{t.lsNone}</p>
        </section>
      ) : (
        <div className="ghls-list">
          {[...d.list]
            .sort((a, b) => rank(a) - rank(b))
            .map((x) => {
              const live = ["in", "booked"].includes(x.status);
              const state = !live ? ["out", t.lsEnded] : x.bill_due ? ["due", t.lsToMake.replace("{month}", monthLabel(d.month, lang))] : x.bill.balance > 0 ? ["owe", t.lsOwes.replace("{amt}", money(x.bill.balance, cur))] : ["ok", t.lsPaid];
              return (
                <article key={x._id} className={`panel-card ghls-card s-${state[0]}`}>
                  <div className="ghls-head">
                    <span className="gh-stay-room">
                      <BedDouble size={16} /> {x.room_name}
                    </span>
                    <div className="ghls-who">
                      <b>{x.guest.name}</b>
                      <small className="rs-muted">
                        {[
                          x.guest.phone,
                          t.lsSince.replace("{date}", fmtDay(x.lease.start, lang, { day: "numeric", month: "short", year: "numeric" })),
                          x.lease.end ? t.lsUntil.replace("{date}", fmtDay(x.lease.end, lang, { day: "numeric", month: "short", year: "numeric" })) : t.lsOpen,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </div>
                    <span className={`ghls-state s-${state[0]}`}>{state[1]}</span>
                  </div>
                  <div className="ghls-terms">
                    <span>
                      <b>{money(x.lease.rent, cur)}</b> / {t.lsMonth.toLowerCase()}
                    </span>
                    {x.lease.elec_rate > 0 && <span>⚡ {money(x.lease.elec_rate, cur)}/kWh</span>}
                    {x.lease.water_rate > 0 && <span>💧 {money(x.lease.water_rate, cur)}/m³</span>}
                    {(x.lease.fixed || []).map((f) => (
                      <span key={f.label}>
                        {f.label} {money(f.amount, cur)}
                      </span>
                    ))}
                    <span className="rs-muted">{t.lsMeterNow.replace("{e}", x.lease.meter?.elec ?? 0).replace("{w}", x.lease.meter?.water ?? 0)}</span>
                  </div>
                  {live && (
                    <div className="ghls-actions">
                      {!x.billed_this && x.status === "in" && (
                        <button type="button" className={`md-btn sa-btn-sm ${x.bill_due ? "md-btn-primary" : "md-btn-ghost"}`} onClick={() => setModal({ kind: "bill", row: x })} disabled={readOnly}>
                          <ReceiptText size={14} /> {t.lsMakeBill}
                        </button>
                      )}
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setModal({ kind: "stay", row: x })}>
                        {t.lsPay}
                      </button>
                      {!desk && (
                        <>
                          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setModal({ kind: "edit", row: x })} disabled={readOnly}>
                            <Pencil size={14} /> {t.lsEdit}
                          </button>
                          <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={() => setModal({ kind: "end", row: x })} disabled={readOnly}>
                            <LogOut size={14} /> {t.lsEndBtn}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
        </div>
      )}
      {(modal?.kind === "new" || modal?.kind === "edit") && <LeaseModal ctx={ctx} row={modal.row} busyRooms={d.list.filter((x) => ["in", "booked"].includes(x.status)).map((x) => x.room_id)} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === "bill" && <BillModal ctx={ctx} row={modal.row} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === "end" && <EndModal ctx={ctx} row={modal.row} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === "stay" && (
        <StayModal
          ctx={ctx}
          stayId={modal.row._id}
          onClose={() => {
            setModal(null);
            load();
          }}
          onChanged={() => {}}
        />
      )}
    </div>
  );
}
