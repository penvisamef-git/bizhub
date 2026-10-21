import { useCallback, useEffect, useRef, useState } from "react";
import { BedDouble, BellRing, Check, Mail, Phone, Users, VolumeX, X } from "lucide-react";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { Modal } from "../../super_admin/parts";
import { fmtDate, fmtDay, money } from "./text";
import { cuText } from "./gh2-text";

// Online booking requests from customer accounts — used by the owner (Customers tab + alert) and the desk POS.
//   api: { custRequests, custRooms, custAccept, custDecline, custCount } — guestHouseService or ghPosApi (the id is ignored by the POS)

// a ring that repeats while something waits (Web Audio — no sound file)
let audio = null;
function ring() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    const now = audio.currentTime;
    [0, 0.18, 0.36].forEach((t, i) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = "sine";
      o.frequency.value = i === 1 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.35, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.16);
      o.connect(g).connect(audio.destination);
      o.start(now + t);
      o.stop(now + t + 0.18);
    });
  } catch {
    /* no audio */
  }
}

// polls the waiting count; rings every few seconds until it is 0 (or silenced for 2 minutes)
export function useBookingAlert(api, id, enabled = true) {
  const [count, setCount] = useState(0);
  const [on, setOn] = useState(false);
  const [muteUntil, setMuteUntil] = useState(0);
  const check = useCallback(() => {
    if (!enabled) return Promise.resolve();
    return api
      .custCount(id)
      .then((r) => {
        setCount(r.data.pending);
        setOn(!!r.data.on);
      })
      .catch(() => {});
  }, [api, id, enabled]);
  useEffect(() => {
    if (!enabled) return undefined;
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, [check, enabled]);
  useEffect(() => {
    if (!count || Date.now() < muteUntil) return undefined;
    ring();
    const t = setInterval(() => Date.now() >= muteUntil && ring(), 4000);
    return () => clearInterval(t);
  }, [count, muteUntil]);
  return { count, on, refresh: check, mute: () => setMuteUntil(Date.now() + 120000), muted: Date.now() < muteUntil };
}

// the bar at the top while bookings wait
export function BookingAlertBar({ lang, alert, onOpen }) {
  const c = cuText(lang);
  if (!alert.count) return null;
  return (
    <div className="ghq-alert" role="alert">
      <BellRing size={20} className="ghq-bell" />
      <b>{alert.count === 1 ? c.alertOne : c.alertMany.replace("{n}", alert.count)}</b>
      <button type="button" className="ghq-alert-open" onClick={onOpen}>
        {c.alertOpen}
      </button>
      {!alert.muted && (
        <button type="button" className="ghq-alert-mute" onClick={alert.mute} title={c.alertMute}>
          <VolumeX size={16} /> <span>{c.alertMute}</span>
        </button>
      )}
    </div>
  );
}

export function RequestsList({ api, id, lang, cur, notify, readOnly, onChange, initial = "pending" }) {
  const c = cuText(lang);
  const [status, setStatus] = useState(initial);
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [accepting, setAccepting] = useState(null);
  const [declining, setDeclining] = useState(null);
  const load = useCallback(
    (p = 1) =>
      api
        .custRequests(id, { status: status === "all" ? "" : status, page: p })
        .then((r) => {
          setRows((old) => (p === 1 ? r.data : [...(old || []), ...r.data]));
          setPage(p);
          setPages(r.pagination.totalPages);
        })
        .catch((e) => notify?.({ type: "error", text: e.message })),
    [api, id, status, notify],
  );
  useEffect(() => {
    setRows(null);
    load(1);
  }, [load]);
  const done = () => {
    setAccepting(null);
    setDeclining(null);
    load(1);
    onChange?.();
  };
  const kids = (n) => (n ? c.kids.replace("{n}", n) : "");
  return (
    <div className="ghq">
      <div className="ghpr-seg ghq-seg">
        {["pending", "all"].map((k) => (
          <button key={k} type="button" className={status === k ? "on" : ""} onClick={() => setStatus(k)}>
            {k === "pending" ? c.pending : c.all}
          </button>
        ))}
      </div>
      {!rows ? (
        <ListSkeleton rows={3} />
      ) : !rows.length ? (
        <p className="rs-muted ghq-empty">{c.none}</p>
      ) : (
        <div className="ghq-list">
          {rows.map((r) => (
            <article key={r._id} className={`ghq-row s-${r.status}`}>
              <div className="ghq-when">
                <b>{fmtDay(r.from, lang, { day: "numeric", month: "short" })}</b>
                <span>→ {fmtDay(r.to, lang, { day: "numeric", month: "short" })}</span>
                <small>{c.nights.replace("{n}", r.nights)}</small>
              </div>
              <div className="ghq-main">
                <div className="ghq-top">
                  <b>{r.customer?.name || "—"}</b>
                  <span className={`ghq-state s-${r.status}`}>{c.states[r.status]}</span>
                </div>
                <span className="ghq-line">
                  <BedDouble size={14} /> {r.type_name}
                  {r.stay?.room ? ` · ${c.room.replace("{r}", r.stay.room)}` : ""} · <Users size={14} /> {c.guests.replace("{a}", r.adults).replace("{c}", kids(r.children))}
                </span>
                {r.customer && (
                  <span className="ghq-line">
                    <a href={`tel:${String(r.customer.phone).replace(/[^\d+]/g, "")}`}>
                      <Phone size={13} /> {r.customer.phone}
                    </a>
                    <a href={`mailto:${r.customer.email}`}>
                      <Mail size={13} /> {r.customer.email}
                    </a>
                  </span>
                )}
                <PayTag c={c} r={r} cur={cur} />
                {r.note && <p className="ghq-note">“{r.note}”</p>}
                <small className="rs-muted">
                  {r.estimate > 0 && `${c.estimate.replace("{v}", money(r.estimate, cur))} · `}
                  {fmtDate(r.created_date, lang)}
                  {r.decided_by ? ` · ${c.by.replace("{name}", r.decided_by)}` : ""}
                  {r.reason ? ` · ${r.reason}` : ""}
                </small>
              </div>
              {r.status === "pending" && !readOnly && (
                <div className="ghq-act">
                  <button type="button" className="ghq-btn ok" onClick={() => setAccepting(r)}>
                    <Check size={18} /> {c.accept}
                  </button>
                  <button type="button" className="ghq-btn no" onClick={() => setDeclining(r)}>
                    <X size={18} /> {c.decline}
                  </button>
                </div>
              )}
            </article>
          ))}
          {page < pages && (
            <button type="button" className="md-btn md-btn-ghost" onClick={() => load(page + 1)}>
              {c.more}
            </button>
          )}
        </div>
      )}
      {accepting && <AcceptModal api={api} id={id} c={c} row={accepting} lang={lang} cur={cur} notify={notify} onClose={() => setAccepting(null)} onDone={done} />}
      {declining && <DeclineModal api={api} id={id} c={c} row={declining} notify={notify} onClose={() => setDeclining(null)} onDone={done} />}
    </div>
  );
}

// how the guest pays: at the guest house, or already by KHQR (with the screenshot)
export function PayTag({ c, r, cur }) {
  const proof = r.pay_proof?.url || r.proof || "";
  if (r.pay_method !== "qr") return <span className="ghq-pay">{c.payCash}</span>;
  return (
    <span className="ghq-pay qr">
      {c.paidQr}
      {r.estimate > 0 ? ` · ${money(r.estimate, cur)}` : ""}
      {proof && (
        <a href={proof} target="_blank" rel="noreferrer" className="ghq-proof-thumb" title={c.proof}>
          <img src={proof} alt={c.proof} />
        </a>
      )}
    </span>
  );
}

function AcceptModal({ api, id, c, row, lang, cur, notify, onClose, onDone }) {
  const [rooms, setRooms] = useState(null);
  const [pick, setPick] = useState("");
  const [record, setRecord] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .custRooms(id, row._id)
      .then((r) => {
        setRooms(r.data);
        setPick(r.data[0]?._id || "");
      })
      .catch((e) => setError(e.message));
  }, [api, id, row._id]);
  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      await api.custAccept(id, row._id, { room_id: pick, record_payment: record });
      notify?.({ type: "success", text: c.states.accepted });
      onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`${c.accept} · ${row.customer?.name || ""}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            <X size={15} />
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={accept} disabled={busy || !pick}>
            <Check size={15} /> {c.accept}
          </button>
        </>
      }
    >
      <p className="ghq-sum">
        <b>{row.type_name}</b> · {fmtDay(row.from, lang)} → {fmtDay(row.to, lang)} · {c.nights.replace("{n}", row.nights)}
      </p>
      <small className="ghw-label">{c.pickRoom}</small>
      {!rooms ? (
        <ListSkeleton rows={1} />
      ) : !rooms.length ? (
        <p className="md-form-error">{c.noFree}</p>
      ) : (
        <div className="ghq-rooms">
          {rooms.map((r) => (
            <button key={r._id} type="button" className={pick === r._id ? "on" : ""} onClick={() => setPick(r._id)}>
              <BedDouble size={18} />
              <b>{r.name}</b>
              {r.floor && <small>{r.floor}</small>}
            </button>
          ))}
        </div>
      )}
      {row.pay_method === "qr" && (
        <div className="ghq-proofbox">
          {row.pay_proof?.url && (
            <a href={row.pay_proof.url} target="_blank" rel="noreferrer">
              <img src={row.pay_proof.url} alt={c.proof} />
            </a>
          )}
          <div>
            <b>{c.paidQr}</b>
            <small className="rs-muted">{c.checkProof}</small>
            {row.estimate > 0 && (
              <label className="ghw-mini ghw-check">
                <input type="checkbox" checked={record} onChange={(e) => setRecord(e.target.checked)} /> {c.recordPay.replace("{v}", money(row.estimate, cur))}
              </label>
            )}
          </div>
        </div>
      )}
      {error && <div className="md-form-error">{error}</div>}
    </Modal>
  );
}

function DeclineModal({ api, id, c, row, notify, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);
  const decline = async () => {
    setBusy(true);
    try {
      await api.custDecline(id, row._id, { reason });
      notify?.({ type: "success", text: c.states.declined });
      onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`${c.decline} · ${row.customer?.name || ""}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            <X size={15} />
          </button>
          <button type="button" className="md-btn md-btn-danger" onClick={decline} disabled={busy}>
            {c.decline}
          </button>
        </>
      }
    >
      <label className="ghw-in">
        <small className="ghw-label">{c.reason}</small>
        <input ref={ref} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder={c.reasonPh} />
      </label>
      {error && <div className="md-form-error">{error}</div>}
    </Modal>
  );
}

// the alert's list in a sheet (owner dashboard + POS)
export function RequestsSheet({ api, id, lang, cur, notify, onClose, onChange }) {
  const c = cuText(lang);
  return (
    <Modal title={c.sheetTitle} size="lg" onClose={onClose}>
      <RequestsList api={api} id={id} lang={lang} cur={cur} notify={notify} onChange={onChange} />
    </Modal>
  );
}
