import { useCallback, useEffect, useState } from "react";
import { HrCard } from "./StaffExtras";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CircleCheck, Clock, LogIn, LogOut, MapPin, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { attendanceService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { memo } from "../../../lib/memo";
import { dur, fmtDay, hhmm, todayKH } from "./text";
import { FixRequests, OvertimeRequests } from "./DaysTabs";

const initial = (n) => Array.from(String(n || "?").trim() || "?")[0].toUpperCase();
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const STEPS = [
  ["branch", "branches"],
  ["shift", "shifts"],
  ["staff", "staff"],
  ["link", "settings"],
];

// the 4 setup steps, until all are done
function SetupCard({ ctx }) {
  const { a, data } = ctx;
  if (data.setup.done >= data.setup.total) return null;
  return (
    <section className="panel-card at-setup">
      <div className="at-setup-head">
        <div>
          <h2>{a.setupTitle}</h2>
          <small className="rs-muted">{a.setupSub}</small>
        </div>
        <b className="at-setup-n">
          {data.setup.done}/{data.setup.total}
        </b>
      </div>
      <div className="rs-meter" aria-hidden="true">
        <span style={{ width: `${(data.setup.done / data.setup.total) * 100}%` }} />
      </div>
      <ol className="at-steps">
        {STEPS.map(([key, tab], i) => {
          const done = data.setup.steps[key];
          return (
            <li key={key} className={done ? "done" : ""}>
              <span className="at-step-n">{done ? <Check size={15} /> : i + 1}</span>
              <span className="at-step-text">
                <b>{a.steps[key][0]}</b>
                <small>{a.steps[key][1]}</small>
              </span>
              {done ? (
                <span className="at-step-done">{a.done}</span>
              ) : (
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => ctx.go(tab)}>
                  {a.go}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function StatusPill({ row, a }) {
  return <span className={`at-st st-${row.status}`}>{a.status[row.status]}</span>;
}

export function PunchLine({ p, a, onRemove }) {
  return (
    <li className={`at-punch r-${p.review}`}>
      {p.photo?.url && (
        <a href={p.photo.url} target="_blank" rel="noreferrer" className="at-selfie">
          <img src={p.photo.url} alt="" loading="lazy" />
        </a>
      )}
      {p.kind === "in" ? <LogIn size={14} /> : <LogOut size={14} />}
      <b>{hhmm(p.at)}</b>
      <span>{a.kinds[p.kind]}</span>
      {p.branch_name && (
        <small>
          <MapPin size={12} /> {p.branch_name}
        </small>
      )}
      {p.distance_m !== null && p.distance_m !== undefined && p.flags?.includes("outside") && <small className="at-warn">{a.away.replace("{m}", p.distance_m)}</small>}
      {(p.flags || [])
        .filter((f) => f !== "outside")
        .map((f) => (
          <small key={f} className="at-warn">
            {a.flags[f]}
          </small>
        ))}
      {p.source !== "phone" && <small className="at-src">{a.source[p.source]}</small>}
      {p.kiosk && <small className="at-src">{a.kioskTag}</small>}
      {p.review !== "ok" && <small className={`at-rv rv-${p.review}`}>{a.review[p.review]}</small>}
      {p.note && <small className="at-note">“{p.note}”</small>}
      {onRemove && p.source === "manual" && (
        <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => onRemove(p)} aria-label={a.remove}>
          <Trash2 size={14} />
        </button>
      )}
    </li>
  );
}

// ============================ TODAY ============================
export function TodayTab({ ctx }) {
  const { a, lang, readOnly } = ctx;
  const [day, setDay] = useState(todayKH());
  const [board, setBoard] = useState(() => memo.get(`att:${ctx.id}:today`) || null);
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    return attendanceService
      .today(ctx.id, day)
      .then((res) => {
        setBoard(res.data);
        if (day === todayKH()) memo.set(`att:${ctx.id}:today`, res.data);
      })
      .catch((e) => ctx.notify({ type: "error", text: e.message }))
      .finally(() => setBusy(false));
  }, [ctx.id, day]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
    if (day !== todayKH()) return undefined;
    const t = setInterval(load, 60000); // today refreshes by itself every minute
    return () => clearInterval(t);
  }, [load, day]);

  const removePunch = async (p) => {
    try {
      await attendanceService.removePunch(ctx.id, p._id);
      load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };

  const shown = board && board.day === day ? board : null;
  const isToday = day === todayKH();
  const tiles = shown
    ? [
        ["in", shown.totals.in, "ok"],
        ["working", shown.totals.working, "blue"],
        ["late", shown.totals.late, "warn"],
        [isToday ? "not_yet" : "absent", isToday ? shown.totals.not_yet : shown.totals.absent, "muted"],
        ...(isToday ? [["absent", shown.totals.absent, "bad"]] : []),
      ]
    : [];

  return (
    <div className="rs-col">
      <SetupCard ctx={ctx} />
      {isToday && <HrCard ctx={ctx} />}
      <section className="panel-card at-dayhead">
        <div className="at-daynav">
          <button type="button" className="md-icon-btn" onClick={() => setDay(addDays(day, -1))} aria-label="-1">
            <ChevronLeft size={18} />
          </button>
          <label className="at-daypick">
            <b>{fmtDay(day, lang)}</b>
            <input type="date" value={day} max={todayKH()} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label={a.day} />
          </label>
          <button type="button" className="md-icon-btn" onClick={() => setDay(addDays(day, 1))} disabled={isToday} aria-label="+1">
            <ChevronRight size={18} />
          </button>
          {!isToday && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setDay(todayKH())}>
              {a.todayBtn}
            </button>
          )}
          <span className="at-grow" />
          <button type="button" className="md-icon-btn" onClick={load} aria-label="Refresh" disabled={busy}>
            <RefreshCw size={16} className={busy ? "md-spin" : ""} />
          </button>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setAdding({ day })} disabled={readOnly || !shown?.rows.length}>
            <Plus size={15} /> {a.addRecord}
          </button>
        </div>
        {shown && (
          <div className="at-tiles">
            {tiles.map(([k, n, tone]) => (
              <div key={k} className={`at-tile t-${tone}`}>
                <b>{n}</b>
                <small>{a.tot[k]}</small>
              </div>
            ))}
            {shown.totals.pending > 0 && (
              <button type="button" className="at-tile t-warn as-btn" onClick={() => ctx.go("review")}>
                <b>{shown.totals.pending}</b>
                <small>{a.tot.pending}</small>
              </button>
            )}
          </div>
        )}
      </section>

      {!shown && <ListSkeleton rows={4} />}
      {shown && shown.rows.length === 0 && (
        <section className="panel-card rs-empty">
          <p>{a.noStaffToday}</p>
          <button type="button" className="md-btn md-btn-primary" onClick={() => ctx.go("staff")}>
            <Plus size={15} /> {a.addStaff}
          </button>
        </section>
      )}
      {shown && shown.rows.length > 0 && (
        <section className="panel-card at-board">
          {shown.rows.map((row) => {
            const isOpen = open === row.staff._id;
            return (
              <div key={row.staff._id} className={`at-row ${isOpen ? "open" : ""}`}>
                <button type="button" className="at-row-main" onClick={() => setOpen(isOpen ? null : row.staff._id)} aria-expanded={isOpen}>
                  <span className="at-av" style={row.shift?.color ? { background: row.shift.color } : undefined}>
                    {initial(row.staff.name)}
                  </span>
                  <span className="at-who">
                    <b>{row.staff.name}</b>
                    <small>{row.shift ? `${row.shift.name} · ${row.shift.start}–${row.shift.end}` : a.noShift}</small>
                  </span>
                  <span className="at-times">
                    <span>
                      <small>{a.inAt}</small> <b>{hhmm(row.first_in) || "—"}</b>
                    </span>
                    <span>
                      <small>{a.outAt}</small> <b>{row.status === "missing_out" ? "?" : hhmm(row.last_out) || "—"}</b>
                    </span>
                  </span>
                  <span className="at-tags">
                    <StatusPill row={row} a={a} />
                    {row.late_min > 0 && <span className="at-tag warn">{a.lateBy.replace("{m}", dur(row.late_min))}</span>}
                    {row.early_min > 0 && <span className="at-tag warn">{a.earlyBy.replace("{m}", dur(row.early_min))}</span>}
                    {row.ot_min > 0 && <span className="at-tag blue">{a.otBy.replace("{m}", dur(row.ot_min))}</span>}
                    {row.pending > 0 && (
                      <span className="at-tag bad">
                        <AlertTriangle size={12} /> {row.pending}
                      </span>
                    )}
                  </span>
                </button>
                {isOpen && (
                  <div className="at-row-more">
                    {row.worked_min > 0 && <p className="rs-muted">{a.worked.replace("{m}", dur(row.worked_min))}</p>}
                    {row.punches.length > 0 ? (
                      <ul className="at-punches">
                        {row.punches.map((p) => (
                          <PunchLine key={p._id} p={p} a={a} onRemove={readOnly ? null : removePunch} />
                        ))}
                      </ul>
                    ) : (
                      <p className="rs-muted">—</p>
                    )}
                    {!readOnly && (
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setAdding({ day, staff_id: row.staff._id, kind: row.status === "working" || row.status === "missing_out" ? "out" : "in" })}>
                        <Plus size={14} /> {a.addRecord}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {adding && (
        <ManualModal
          ctx={ctx}
          init={adding}
          staff={(shown?.rows || []).map((r) => r.staff)}
          onClose={() => setAdding(null)}
          onSaved={() => {
            setAdding(null);
            load();
            ctx.reload();
          }}
        />
      )}
    </div>
  );
}

// ============================ MANUAL RECORD ============================
// datetime-local value in Cambodia time ↔ ISO
const toLocalInput = (d) => new Date(new Date(d).getTime() + 7 * 3600000).toISOString().slice(0, 16);
const fromLocalInput = (v) => new Date(Date.parse(`${v}:00Z`) - 7 * 3600000).toISOString();

export function ManualModal({ ctx, init, staff, onClose, onSaved }) {
  const { a } = ctx;
  const defaultAt = init.at ? toLocalInput(init.at) : init.day && init.day !== todayKH() ? `${init.day}T${init.kind === "out" ? "17:00" : "08:00"}` : toLocalInput(Date.now());
  const [f, setF] = useState({ staff_id: init.staff_id || staff[0]?._id || "", kind: init.kind || "in", at: defaultAt, note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!f.note.trim()) return setError(a.needReason);
    setBusy(true);
    setError("");
    try {
      await attendanceService.addPunch(ctx.id, { staff_id: f.staff_id, kind: f.kind, at: fromLocalInput(f.at), note: f.note.trim(), ...(init.forDay ? { day: init.forDay } : {}) });
      ctx.notify({ type: "success", text: a.saved });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={a.manualTitle}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {a.cancel}
          </button>
          <button type="submit" form="at-manual" className="md-btn md-btn-primary" disabled={busy || !f.staff_id || !f.at}>
            {busy ? a.saving : a.save}
          </button>
        </>
      }
    >
      <form id="at-manual" className="md-fields" onSubmit={submit}>
        <p className="rs-muted" style={{ margin: 0 }}>
          {a.manualSub}
        </p>
        <div className="md-field">
          <label htmlFor="mn-who">{a.who}</label>
          <select id="mn-who" value={f.staff_id} onChange={(e) => setF({ ...f, staff_id: e.target.value })} disabled={!!init.lockStaff}>
            {staff.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md-field">
          <label>{a.kind}</label>
          <div className="at-seg">
            {["in", "out"].map((k) => (
              <button key={k} type="button" className={f.kind === k ? "on" : ""} onClick={() => setF({ ...f, kind: k })}>
                {k === "in" ? <LogIn size={15} /> : <LogOut size={15} />} {a.kinds[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="md-field">
          <label htmlFor="mn-at">{a.when}</label>
          <input id="mn-at" type="datetime-local" value={f.at} max={toLocalInput(Date.now())} onChange={(e) => setF({ ...f, at: e.target.value })} />
        </div>
        <div className="md-field">
          <label htmlFor="mn-note">{a.reason}</label>
          <input id="mn-note" maxLength={300} value={f.note} placeholder={a.reasonPh} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </div>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

// ============================ REVIEW ============================
export function ReviewTab({ ctx }) {
  const { a, lang, readOnly } = ctx;
  const [list, setList] = useState(null);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState("");
  const [adding, setAdding] = useState(null);
  const [staff, setStaff] = useState([]);

  const load = useCallback(
    () =>
      attendanceService
        .review(ctx.id)
        .then((res) => setList(res.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
    attendanceService
      .list(ctx.id, "staff")
      .then((r) => setStaff(r.data))
      .catch(() => {});
  }, [load, ctx.id]);

  const decide = async (p, review) => {
    setBusy(p._id);
    try {
      await attendanceService.decide(ctx.id, p._id, review, notes[p._id] || "");
      setList((l) => ({ ...l, pending: l.pending.filter((x) => x._id !== p._id) }));
      ctx.reload();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };

  if (!list) return <ListSkeleton rows={3} />;
  const empty = !list.pending.length && !list.missing_out.length && !ctx.data.counts?.fix_pending && !ctx.data.counts?.ot_pending;

  return (
    <div className="rs-col">
      <section className="panel-card">
        <h2 style={{ margin: 0 }}>{a.tabs.review}</h2>
        <p className="rs-muted" style={{ margin: "6px 0 0" }}>
          {a.reviewSub}
        </p>
      </section>
      {empty && (
        <section className="panel-card rs-empty at-clear">
          <CircleCheck size={34} />
          <p>{a.allClear}</p>
        </section>
      )}
      <FixRequests ctx={ctx} onChange={() => ctx.reload()} />
      <OvertimeRequests ctx={ctx} onChange={() => ctx.reload()} />
      {list.pending.length > 0 && (
        <section className="panel-card">
          <h3 className="at-h3">
            <AlertTriangle size={17} /> {a.pendingTitle} <span className="rs-badge">{list.pending.length}</span>
          </h3>
          <ul className="at-review">
            {list.pending.map((p) => (
              <li key={p._id}>
                <div className="at-review-top">
                  {p.photo?.url ? (
                    <a href={p.photo.url} target="_blank" rel="noreferrer" className="at-selfie big">
                      <img src={p.photo.url} alt="" loading="lazy" />
                    </a>
                  ) : (
                    <span className="at-av">{initial(p.staff_name)}</span>
                  )}
                  <span className="at-who">
                    <b>{p.staff_name}</b>
                    <small>
                      {fmtDay(p.day, lang)} · {p.kind === "in" ? <LogIn size={12} /> : <LogOut size={12} />} {a.kinds[p.kind]} <b>{hhmm(p.at)}</b>
                    </small>
                  </span>
                </div>
                <div className="at-review-why">
                  {p.flags.map((f) => (
                    <span key={f} className="at-tag bad">
                      {f === "outside" && p.distance_m !== null ? `${a.flags[f]} · ${a.away.replace("{m}", p.distance_m)}` : a.flags[f]}
                    </span>
                  ))}
                  {p.branch_name && (
                    <span className="at-tag">
                      <MapPin size={12} /> {p.branch_name}
                    </span>
                  )}
                  {p.accuracy !== null && p.accuracy !== undefined && <span className="at-tag">GPS ±{p.accuracy} m</span>}
                  {Number.isFinite(p.lat) && (
                    <a className="at-tag link" href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">
                      <MapPin size={12} /> {a.openMap}
                    </a>
                  )}
                </div>
                {!readOnly && (
                  <div className="at-review-act">
                    <input placeholder={a.notePh} maxLength={300} value={notes[p._id] || ""} onChange={(e) => setNotes({ ...notes, [p._id]: e.target.value })} aria-label={a.note} />
                    <button type="button" className="md-btn md-btn-ghost sa-danger-text sa-btn-sm" onClick={() => decide(p, "rejected")} disabled={busy === p._id}>
                      <X size={15} /> {a.reject}
                    </button>
                    <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => decide(p, "ok")} disabled={busy === p._id}>
                      <Check size={15} /> {a.approve}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {list.missing_out.length > 0 && (
        <section className="panel-card">
          <h3 className="at-h3">
            <Clock size={17} /> {a.missingTitle} <span className="rs-badge">{list.missing_out.length}</span>
          </h3>
          <p className="rs-muted" style={{ margin: "0 0 10px" }}>
            {a.missingSub}
          </p>
          <ul className="at-review">
            {list.missing_out.map((m) => (
              <li key={`${m.staff_id}-${m.day}`}>
                <div className="at-review-top">
                  <span className="at-av">{initial(m.staff_name)}</span>
                  <span className="at-who">
                    <b>{m.staff_name}</b>
                    <small>
                      {fmtDay(m.day, lang)} · {a.inAt} <b>{hhmm(m.first_in)}</b> · {a.outAt} ?
                    </small>
                  </span>
                  {!readOnly && (
                    <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setAdding({ staff_id: m.staff_id, kind: "out", at: m.end || m.first_in, forDay: m.day, lockStaff: true })}>
                      <LogOut size={14} /> {a.addOut}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {adding && (
        <ManualModal
          ctx={ctx}
          init={adding}
          staff={staff}
          onClose={() => setAdding(null)}
          onSaved={() => {
            setAdding(null);
            load();
          }}
        />
      )}
    </div>
  );
}
