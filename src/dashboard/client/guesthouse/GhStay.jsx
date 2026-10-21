import { useEffect, useMemo, useState } from "react";
import { Camera, IdCard, Loader2, Star, BedDouble, CalendarPlus, CalendarRange, LogIn, LogOut, Minus, Pencil, Plus, Printer, Trash2, UserPlus, UserRound, X } from "lucide-react";
import { guestHouseService } from "../../../api/services";

// the owner dashboard uses the owner API; the desk POS passes its own (ctx.api)
export const api = (ctx) => ctx.api || guestHouseService;
import { Modal } from "../../super_admin/parts";
import { Field } from "../restaurant/parts";
import { addDays, fmtDay, fmtTime, money, nightsOf, todayKH } from "./text";
import { GhReceipt, printCfg, printReceipt } from "../../../pos/guesthouse/GhReceipt";
import { MemberBox, ReviewShare } from "./GhGuests";
import { x3 } from "./gh3-text";

export const SVC_EMOJI = { laundry: "🧺", bike: "🛵", tour: "🗺️", minibar: "🥤", food: "🍳", coffee: "☕", transfer: "🚐", spa: "💆", other: "✨" };

// which active rooms are free from → to (live stays block; the departure day is free)
export function useFreeRooms(ctx, from, to, exceptId) {
  const [busyRooms, setBusyRooms] = useState(null);
  useEffect(() => {
    if (!from || !to || to <= from) return setBusyRooms(new Set());
    let live = true;
    setBusyRooms(null);
    api(ctx)
      .stays(ctx.id, { from, to })
      .then((r) => live && setBusyRooms(new Set(r.data.filter((s) => ["booked", "in"].includes(s.status) && s._id !== exceptId).map((s) => s.room_id))))
      .catch(() => live && setBusyRooms(new Set()));
    return () => {
      live = false;
    };
  }, [ctx.id, from, to, exceptId]);
  return busyRooms;
}

// room tiles (only the free ones for the chosen dates), grouped by room type
function RoomPicker({ ctx, value, onPick, busyRooms }) {
  const { g, data, cur } = ctx;
  if (!busyRooms) return <div className="ghb-loading">…</div>;
  const rooms = data.rooms.filter((r) => r.active && r.usable !== false);
  const free = rooms.filter((r) => !busyRooms.has(r._id) || r._id === value);
  if (!free.length) return <div className="ghb-empty">{g.noFree}</div>;
  return (
    <div className="ghb-rooms">
      {data.types.map((t) => {
        const list = free.filter((r) => r.type_id === t._id);
        if (!list.length) return null;
        return list.map((r) => (
          <button key={r._id} type="button" className={`ghb-room ${value === r._id ? "on" : ""}`} style={{ "--c": t.color }} onClick={() => onPick(r, t)}>
            <b>{r.name}</b>
            <span>{t.name}</span>
            <small>
              {money(t.price, cur)} {g.perNight}
            </small>
            {value === r._id && <i className="ghb-tick">✓</i>}
          </button>
        ));
      })}
    </div>
  );
}

function Stepper({ value, min = 0, max = 99, onChange, label }) {
  return (
    <span className="ghb-step" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, Number(value) - 1))} disabled={Number(value) <= min} aria-label="−">
        −
      </button>
      <b>{value}</b>
      <button type="button" onClick={() => onChange(Math.min(max, Number(value) + 1))} disabled={Number(value) >= max} aria-label="+">
        +
      </button>
    </span>
  );
}

function GuestFields({ ctx, f, setF, lookup = true }) {
  const { g, data } = ctx;
  const [hits, setHits] = useState([]);
  const policeOn = !!(data.addons?.gh_police?.active || data.police);
  const [more, setMore] = useState(!!(f.guest.id_number || f.guest.nationality || (policeOn && f.guest.id_type === "passport")));
  useEffect(() => {
    if (!lookup) return undefined;
    const q = (f.guest.name || "").trim().length >= 2 ? f.guest.name : (f.guest.phone || "").trim().length >= 3 ? f.guest.phone : "";
    if (!q) return setHits([]);
    const t = setTimeout(() => {
      api(ctx)
        .guests(ctx.id, q)
        .then((r) => setHits(r.data || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [ctx.id, f.guest.name, f.guest.phone, lookup]); // eslint-disable-line react-hooks/exhaustive-deps
  const setG = (k) => (e) => setF({ ...f, guest: { ...f.guest, [k]: e.target.value } });
  const shown = hits.filter((h) => !(h.name === f.guest.name && h.phone === f.guest.phone));
  return (
    <div className="ghb-guest">
      <div className="ghb-two">
        <label className="ghb-field">
          <span>{g.guestName} *</span>
          <input id="gb-name" maxLength={80} value={f.guest.name} onChange={setG("name")} autoComplete="off" placeholder="Sok Dara" />
        </label>
        <label className="ghb-field">
          <span>{g.phone}</span>
          <input id="gb-phone" type="tel" inputMode="tel" maxLength={30} value={f.guest.phone} onChange={setG("phone")} autoComplete="off" placeholder="012 345 678" />
        </label>
      </div>
      {shown.length > 0 && (
        <div className="ghb-hits">
          <small>{g.past}</small>
          {shown.slice(0, 4).map((h) => (
            <button
              key={`${h.name}|${h.phone}`}
              type="button"
              onClick={() =>
                setF({
                  ...f,
                  guest: {
                    name: h.name,
                    phone: h.phone || "",
                    id_type: h.id_type || "id_card",
                    id_number: h.id_number || "",
                    nationality: h.nationality || "",
                    gender: h.gender || "",
                    dob: h.dob || "",
                    visa_type: h.visa_type || "",
                    visa_until: h.visa_until || "",
                  },
                })
              }
            >
              <UserRound size={14} /> {h.name} {h.phone ? `· ${h.phone}` : ""}
            </button>
          ))}
        </div>
      )}
      <div className="ghb-people">
        <span>
          {g.adults} <Stepper value={f.adults} min={1} max={20} onChange={(v) => setF({ ...f, adults: v })} label={g.adults} />
        </span>
        <span>
          {g.children} <Stepper value={f.children} min={0} max={20} onChange={(v) => setF({ ...f, children: v })} label={g.children} />
        </span>
        <button type="button" className="ghb-more" onClick={() => setMore(!more)}>
          {more ? "−" : "+"} {g.idType} / {g.nationality}
        </button>
      </div>
      {more && (
        <>
          <div className="ghb-chips">
            {data.lists.id_types.map((k) => (
              <button key={k} type="button" className={f.guest.id_type === k ? "on" : ""} onClick={() => setF({ ...f, guest: { ...f.guest, id_type: k } })}>
                {g.idTypes[k]}
              </button>
            ))}
          </div>
          <div className="ghb-two">
            <label className="ghb-field">
              <span>{g.idNumber}</span>
              <input maxLength={40} value={f.guest.id_number} onChange={setG("id_number")} />
            </label>
            <label className="ghb-field">
              <span>{g.nationality}</span>
              <input maxLength={40} placeholder="Cambodia" value={f.guest.nationality} onChange={setG("nationality")} />
            </label>
          </div>
          {policeOn && (
            <div className="ghb-police">
              <small>{g.passportBox}</small>
              <div className="ghb-two">
                <div className="ghb-field">
                  <span>{g.gender}</span>
                  <div className="ghb-chips">
                    {["m", "f"].map((k) => (
                      <button key={k} type="button" className={f.guest.gender === k ? "on" : ""} onClick={() => setF({ ...f, guest: { ...f.guest, gender: f.guest.gender === k ? "" : k } })}>
                        {g.genders[k]}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="ghb-field">
                  <span>{g.dob}</span>
                  <input type="date" value={f.guest.dob || ""} max={todayKH()} onChange={setG("dob")} />
                </label>
              </div>
              <div className="ghb-two">
                <label className="ghb-field">
                  <span>{g.visaType}</span>
                  <input maxLength={30} placeholder="T · E · K" value={f.guest.visa_type || ""} onChange={setG("visa_type")} />
                </label>
                <label className="ghb-field">
                  <span>{g.visaUntil}</span>
                  <input type="date" value={f.guest.visa_until || ""} onChange={setG("visa_until")} />
                </label>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================ ID CARD / PASSPORT PHOTOS (optional) ============================
function IdPhotos({ ctx, s, onStay }) {
  const { g, readOnly } = ctx;
  const [busy, setBusy] = useState(false);
  const [big, setBig] = useState(null);
  const photos = s.id_photos || [];
  const add = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const r = await api(ctx).addIdPhoto(ctx.id, s._id, file);
      if (r?.data) onStay(r.data);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const remove = async (pid) => {
    try {
      const r = await api(ctx).removeIdPhoto(ctx.id, s._id, pid);
      if (r?.data) onStay(r.data);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  if (s.status === "cancelled" && !photos.length) return null;
  return (
    <div className="gh-idp">
      <div className="gh-idp-head">
        <IdCard size={15} /> <b>{g.idPhotos}</b>
        {!photos.length && <small className="rs-muted">{g.idPhotosHint}</small>}
      </div>
      <div className="gh-idp-list">
        {photos.map((p) => (
          <span key={p._id} className="gh-idp-ph">
            <button type="button" onClick={() => setBig(p.url)} aria-label={g.idPhotos}>
              <img src={p.url} alt="" />
            </button>
            {!readOnly && (
              <button type="button" className="gh-idp-x" onClick={() => remove(p._id)} aria-label={g.remove}>
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {!readOnly && photos.length < 4 && (
          <label className={`gh-idp-add ${busy ? "busy" : ""}`}>
            <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={(e) => (add(e.target.files?.[0]), (e.target.value = ""))} />
            {busy ? <Loader2 size={18} className="md-spin" /> : <Camera size={18} />}
            <small>{busy ? g.idUploading : g.idAdd}</small>
          </label>
        )}
      </div>
      {big && (
        <div className="gh-idp-big" onClick={() => setBig(null)} role="presentation">
          <img src={big} alt="" />
        </div>
      )}
    </div>
  );
}

// ============================ NEW BOOKING / WALK-IN ============================
export function BookModal({ ctx, init = {}, onClose, onDone }) {
  const { g, data, cur, lang } = ctx;
  const today = todayKH();
  const walkIn = !!init.walkIn;
  const [f, setF] = useState(() => {
    const room = data.rooms.find((r) => r._id === init.room_id);
    const type = room && data.types.find((t) => t._id === room.type_id);
    const from = walkIn ? today : init.from || today;
    return {
      from,
      to: init.to || addDays(from, 1),
      room_id: init.room_id || "",
      rate: type ? type.price : "",
      guest: { name: "", phone: "", id_type: "id_card", id_number: "", nationality: "", gender: "", dob: "", visa_type: "", visa_until: "" },
      adults: 1,
      children: 0,
      source: walkIn ? "walk_in" : "phone",
      note: "",
      deposit: "",
      method: data.settings.methods[0] || "cash",
    };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRooms = useFreeRooms(ctx, f.from, f.to);
  const nights = f.to > f.from ? nightsOf(f.from, f.to) : 0;
  const roomTaken = f.room_id && busyRooms?.has(f.room_id);
  const total = nights * (Number(f.rate) || 0);
  const can = f.room_id && !roomTaken && nights > 0 && f.guest.name.trim() && f.rate !== "";
  const room = data.rooms.find((r) => r._id === f.room_id);
  const setNights = (n) => setF({ ...f, to: addDays(f.from, Math.max(1, Math.min(366, n))) });

  useEffect(() => {
    if (roomTaken) setF((x) => ({ ...x, room_id: "" }));
  }, [roomTaken]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!can) return;
    setBusy(true);
    setError("");
    try {
      const r = await api(ctx).book(ctx.id, { ...f, rate: Number(f.rate), adults: Number(f.adults) || 1, children: Number(f.children) || 0, deposit: Number(f.deposit) || 0, check_in_now: walkIn });
      ctx.notify({ type: "success", text: walkIn ? g.checkedIn : g.booked.replace("{no}", r.data.no) });
      onDone?.(r.data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  const step = (n, title, done) => (
    <h4 className={`ghb-h ${done ? "done" : ""}`}>
      <i>{done ? "✓" : n}</i> {title}
    </h4>
  );
  return (
    <div className="ghb-back" onMouseDown={() => !busy && onClose()}>
      <form className={`ghb ${walkIn ? "walk" : ""}`} role="dialog" aria-modal="true" aria-label={walkIn ? g.walkInTitle : g.bookTitle} onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="ghb-top">
          <span className="ghb-top-ic">{walkIn ? <UserPlus size={22} /> : <CalendarPlus size={22} />}</span>
          <div>
            <b>{walkIn ? g.walkIn : g.bookTitle}</b>
            <small>{walkIn ? g.checkInNow : g.bookSub}</small>
          </div>
          <button type="button" className="ghb-x" onClick={onClose} disabled={busy} aria-label={g.close}>
            <X size={22} />
          </button>
        </header>
        <div className="ghb-body">
          <div className="ghb-main">
            {step(1, g.stayDates, nights > 0)}
            <div className="ghb-dates">
              <label className="ghb-field">
                <span>{g.arrive}</span>
                <input type="date" value={f.from} min={addDays(today, -1)} disabled={walkIn} onChange={(e) => e.target.value && setF({ ...f, from: e.target.value, to: addDays(e.target.value, Math.max(1, nights)) })} />
              </label>
              <span className="ghb-nights">
                <small>{g.nightsLabel}</small>
                <Stepper value={nights} min={1} max={366} onChange={setNights} label={g.nightsLabel} />
              </span>
              <label className="ghb-field">
                <span>{g.leave}</span>
                <input type="date" value={f.to} min={addDays(f.from, 1)} onChange={(e) => e.target.value && setF({ ...f, to: e.target.value })} />
              </label>
            </div>
            {step(2, g.room, !!f.room_id)}
            <RoomPicker ctx={ctx} value={f.room_id} busyRooms={busyRooms} onPick={(r, t) => setF({ ...f, room_id: r._id, rate: f.room_id && data.rooms.find((x) => x._id === f.room_id)?.type_id === t._id ? f.rate : t.price })} />
            {step(3, g.guest, !!f.guest.name.trim())}
            <GuestFields ctx={ctx} f={f} setF={setF} />
            {!walkIn && (
              <>
                <h4 className="ghb-h sub">{g.source}</h4>
                <div className="ghb-chips">
                  {data.lists.sources
                    .filter((k) => k !== "walk_in")
                    .map((k) => (
                      <button key={k} type="button" className={f.source === k ? "on" : ""} onClick={() => setF({ ...f, source: k })}>
                        {g.sources[k]}
                      </button>
                    ))}
                </div>
              </>
            )}
            <label className="ghb-field">
              <span>{g.note}</span>
              <input maxLength={500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
            </label>
          </div>

          <aside className="ghb-side">
            {step(4, g.payNow, Number(f.deposit) > 0)}
            <div className="ghb-sum">
              <div>
                <span>{room ? `${g.room} ${room.name}` : g.pickRoom}</span>
                <b>
                  {f.from ? fmtDay(f.from, lang) : ""} → {f.to ? fmtDay(f.to, lang) : ""}
                </b>
              </div>
              <div>
                <span>{g.rate}</span>
                <span className="ghb-rate">
                  <input type="number" min={0} step="any" inputMode="decimal" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} aria-label={g.rate} />
                  <small>{cur}</small>
                </span>
              </div>
              <div className="ghb-total">
                <span>{g.nights.replace("{n}", nights)}</span>
                <b>{money(total, cur)}</b>
              </div>
            </div>
            <label className="ghb-field">
              <span>{g.deposit}</span>
              <input className="ghb-big" type="number" min={0} step="any" inputMode="decimal" placeholder="0" value={f.deposit} onChange={(e) => setF({ ...f, deposit: e.target.value })} />
            </label>
            <div className="ghb-chips quick">
              <button type="button" className={!Number(f.deposit) ? "on" : ""} onClick={() => setF({ ...f, deposit: "" })}>
                0
              </button>
              {Number(f.rate) > 0 && nights > 1 && (
                <button type="button" className={Number(f.deposit) === Number(f.rate) ? "on" : ""} onClick={() => setF({ ...f, deposit: String(f.rate) })}>
                  {g.oneNight} · {money(f.rate, cur)}
                </button>
              )}
              {total > 0 && (
                <button type="button" className={Number(f.deposit) === total ? "on" : ""} onClick={() => setF({ ...f, deposit: String(total) })}>
                  {g.payAll} · {money(total, cur)}
                </button>
              )}
            </div>
            {Number(f.deposit) > 0 && (
              <div className="ghb-chips">
                {data.settings.methods.map((k) => (
                  <button key={k} type="button" className={f.method === k ? "on" : ""} onClick={() => setF({ ...f, method: k })}>
                    {g.methods[k]}
                  </button>
                ))}
              </div>
            )}
            <div className="ghb-left">
              <span>{g.balance}</span>
              <b>{money(Math.max(0, total - (Number(f.deposit) || 0)), cur)}</b>
            </div>
            {error && <div className="md-form-error">{error}</div>}
            <button type="submit" className="ghb-go" disabled={busy || !can}>
              {walkIn ? <LogIn size={20} /> : <CalendarRange size={20} />} {busy ? g.saving : walkIn ? g.checkInNow : g.book}
            </button>
            <button type="button" className="ghb-cancel" onClick={onClose} disabled={busy}>
              {g.cancel}
            </button>
          </aside>
        </div>
      </form>
    </div>
  );
}

// ============================ ONE STAY: details + bill + actions ============================
export function StayModal({ ctx, stayId, onClose, onChanged }) {
  const { g, data, cur, lang, readOnly } = ctx;
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ask, setAsk] = useState(null); // { code, balance } from a refused check-out
  const [sure, setSure] = useState("");
  const [edit, setEdit] = useState(false);
  const [charge, setCharge] = useState(null);
  const [pay, setPay] = useState(null);
  const [disc, setDisc] = useState("");
  const [share, setShare] = useState(false); // review link (gh_reviews)
  const reviewsOn = !!(data.addons?.gh_reviews?.active || data.reviews);
  const desk = ctx.role === "desk"; // desk staff in the POS: no removing lines, no discounts
  // the guest display (POS) shows this bill while it is open
  useEffect(() => {
    if (s) ctx.onBill?.(s);
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => ctx.onBill?.(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api(ctx)
      .stay(ctx.id, stayId)
      .then((r) => {
        setS(r.data);
        setDisc(String(r.data.discount || ""));
      })
      .catch((e) => setError(e.message));
  }, [ctx.id, stayId]);

  const run = async (fn, msg) => {
    setBusy(true);
    setError("");
    try {
      const r = await fn();
      if (r?.data) {
        setS(r.data);
        setDisc(String(r.data.discount || ""));
      }
      if (msg) ctx.notify({ type: "success", text: msg });
      onChanged?.();
      return r || true;
    } catch (e) {
      const code = e.response?.code;
      if (e.status === 409 && ["unpaid", "refund"].includes(code)) setAsk({ code, balance: e.response.balance, nights: e.response.nights, total: e.response.total });
      else setError(e.message);
      return false;
    } finally {
      setBusy(false);
      setSure("");
    }
  };
  if (!s)
    return (
      <Modal title="…" onClose={onClose}>
        {error ? <div className="md-form-error">{error}</div> : <p className="rs-muted">…</p>}
      </Modal>
    );

  const today = todayKH();
  const b = s.bill;
  const live = ["booked", "in"].includes(s.status);
  const type = data.types.find((t) => t._id === s.type_id);
  const open = !readOnly && s.status !== "cancelled";

  const pc = printCfg(data);
  const printNow = (stay = s) => printReceipt(<GhReceipt stay={stay} data={data} lang={lang} theme={pc.theme} size={pc.size} qr={pc.qr} methods={g.methods} staff={data.staff?.name || ""} />, pc.size);
  const print = () => (pc.on ? printNow() : ctx.askBuy({ addon: "gh_printer" }));
  const checkOut = async (body) => {
    const r = await run(() => api(ctx).action(ctx.id, s._id, "check-out", body), g.checkedOut);
    if (r?.data && pc.on && pc.auto) printNow(r.data);
  };

  return (
    <Modal
      size="lg"
      title={g.stayTitle.replace("{no}", s.no)}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {reviewsOn && ["in", "out"].includes(s.status) && (
            <button type="button" className="md-btn md-btn-ghost" onClick={() => setShare(true)}>
              <Star size={15} /> {x3(lang).rvSend}
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={print} style={{ marginRight: "auto" }}>
            <Printer size={15} /> {g.printBill}
          </button>
          {open && s.status === "booked" && (
            <>
              {sure === "cancel" ? (
                <button type="button" className="md-btn md-btn-danger" onClick={() => run(() => api(ctx).action(ctx.id, s._id, "cancel"))} disabled={busy} autoFocus onBlur={() => setSure("")}>
                  {g.sure}
                </button>
              ) : (
                <button type="button" className="md-btn md-btn-ghost sa-danger-text" onClick={() => setSure("cancel")} disabled={busy}>
                  {g.cancelBooking}
                </button>
              )}
              {s.from <= today &&
                (sure === "noshow" ? (
                  <button type="button" className="md-btn md-btn-danger" onClick={() => run(() => api(ctx).action(ctx.id, s._id, "no-show"))} disabled={busy} autoFocus onBlur={() => setSure("")}>
                    {g.sure}
                  </button>
                ) : (
                  <button type="button" className="md-btn md-btn-ghost" onClick={() => setSure("noshow")} disabled={busy}>
                    {g.noShow}
                  </button>
                ))}
              <button type="button" className="md-btn md-btn-primary" onClick={() => run(() => api(ctx).action(ctx.id, s._id, "check-in"), g.checkedIn)} disabled={busy || s.from > today}>
                <LogIn size={15} /> {g.checkIn}
              </button>
            </>
          )}
          {open && s.status === "in" && !s.lease && (
            <button type="button" className="md-btn md-btn-primary" onClick={() => checkOut()} disabled={busy}>
              <LogOut size={15} /> {g.checkOut}
            </button>
          )}
        </>
      }
    >
      <div className="gh-stay">
        <div className="gh-stay-head">
          <span className="gh-stay-room" style={{ "--c": type?.color || "#2563EB" }}>
            <BedDouble size={18} /> {s.room_name}
          </span>
          <div>
            <b>{s.guest.name}</b>
            <small className="rs-muted">{[s.guest.phone, s.guest.id_number && `${g.idTypes[s.guest.id_type]} ${s.guest.id_number}`, s.guest.nationality].filter(Boolean).join(" · ")}</small>
            <small>
              {s.lease
                ? `🔑 ${fmtDay(s.from, lang, { day: "numeric", month: "short", year: "numeric" })} → ${s.lease.end ? fmtDay(s.lease.end, lang, { day: "numeric", month: "short", year: "numeric" }) : "…"}`
                : `${fmtDay(s.from, lang, { weekday: "short", day: "numeric", month: "short" })} → ${fmtDay(s.to, lang, { weekday: "short", day: "numeric", month: "short" })} · ${g.nights.replace("{n}", b.nights)}`}{" "}
              · {s.adults}
              {s.children ? ` + ${s.children}` : ""} 👤 · {g.sources[s.source]}
            </small>
          </div>
          <span className={`gh-st st-${s.status}`}>{g.status[s.status]}</span>
        </div>
        {s.note && <p className="gh-note">{s.note}</p>}
        <IdPhotos ctx={ctx} s={s} onStay={(d) => setS(d)} />
        {live && !readOnly && !edit && !s.lease && (
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setEdit(true)}>
            <Pencil size={14} /> {g.move}
          </button>
        )}
        {edit && <EditStay ctx={ctx} s={s} busy={busy} onCancel={() => setEdit(false)} onSave={async (body) => (await run(() => api(ctx).updateStay(ctx.id, s._id, body), g.saved)) && setEdit(false)} />}

        {ask && (
          <div className="rs-banner warn gh-ask">
            <span>
              {ask.nights !== undefined && ask.nights !== b.nights && <b>{g.leavingEarly.replace("{n}", ask.nights).replace("{total}", money(ask.total, cur))} </b>}
              {(ask.code === "refund" ? g.refundAsk : g.unpaidAsk).replace("{amt}", money(Math.abs(ask.balance), cur))}
            </span>
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              onClick={async () => {
                setAsk(null);
                await checkOut({ force: true });
              }}
              disabled={busy}
            >
              {g.forceOut}
            </button>
            <button
              type="button"
              className="md-btn md-btn-primary sa-btn-sm"
              onClick={() => {
                setPay({ method: ask.code === "refund" ? "cash" : data.settings.methods[0] || "cash", amount: String(ask.balance), note: ask.code === "refund" ? g.refund : "" });
                setAsk(null);
              }}
            >
              {ask.code === "refund" ? g.refund : g.takePayment}
            </button>
          </div>
        )}

        <MemberBox
          ctx={ctx}
          stay={s}
          busy={busy}
          onStay={(d) => {
            setS(d);
            setDisc(String(d.discount || ""));
            onChanged?.();
          }}
        />
        {share && <ReviewShare ctx={ctx} stay={s} onClose={() => setShare(false)} />}
        <div className="gh-bill">
          <h4>{g.bill}</h4>
          {!s.lease && (
            <div className="gh-line">
              <span>{g.roomCharge.replace("{n}", b.nights).replace("{rate}", money(s.rate, cur))}</span>
              <b>{money(b.room, cur)}</b>
            </div>
          )}
          {s.charges.map((c) => (
            <div key={c._id} className="gh-line">
              <span>
                {c.label}
                {c.qty > 1 ? ` × ${c.qty}` : ""} <small className="rs-muted">{fmtTime(c.at, lang)}</small>
              </span>
              <b>{money(c.amount * c.qty, cur)}</b>
              {open && !desk && (
                <button type="button" className="md-icon-btn" onClick={() => run(() => api(ctx).removeCharge(ctx.id, s._id, c._id))} aria-label={g.remove} disabled={busy}>
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {open && data.services?.length > 0 && !charge && (
            <div className="gh-svc" aria-label={g.services}>
              {data.services.map((x) => (
                <button key={x._id} type="button" disabled={busy} title={g.services} onClick={() => run(() => api(ctx).addCharge(ctx.id, s._id, { service_id: x._id, label: x.name, amount: x.price, qty: 1 }))}>
                  <span aria-hidden="true">{SVC_EMOJI[x.icon] || SVC_EMOJI.other}</span>
                  <b>{x.name}</b>
                  <small>{money(x.price, cur)}</small>
                </button>
              ))}
            </div>
          )}
          {open &&
            (charge ? (
              <form
                className="gh-inline"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await run(() => api(ctx).addCharge(ctx.id, s._id, { label: charge.label, amount: Number(charge.amount), qty: Number(charge.qty) || 1 }))) setCharge(null);
                }}
              >
                <div className="gh-presets">
                  {g.chargePresets.map((p) => (
                    <button key={p} type="button" className={`rs-pill ${charge.label === p ? "ok" : ""}`} onClick={() => setCharge({ ...charge, label: p })}>
                      {p}
                    </button>
                  ))}
                </div>
                <input maxLength={80} placeholder={g.chargePh} value={charge.label} onChange={(e) => setCharge({ ...charge, label: e.target.value })} aria-label={g.chargeLabel} autoFocus />
                <input type="number" min={0} step="any" placeholder={g.amount} value={charge.amount} onChange={(e) => setCharge({ ...charge, amount: e.target.value })} aria-label={g.amount} className="gh-num" />
                <input type="number" min={1} max={1000} value={charge.qty} onChange={(e) => setCharge({ ...charge, qty: e.target.value })} aria-label={g.qty} className="gh-qty" />
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setCharge(null)}>
                  <X size={14} />
                </button>
                <button type="submit" className="md-btn md-btn-primary sa-btn-sm" disabled={busy || !charge.label.trim() || charge.amount === ""}>
                  <Plus size={14} /> {g.addCharge}
                </button>
              </form>
            ) : (
              <button type="button" className="gh-add" onClick={() => setCharge({ label: "", amount: "", qty: 1 })}>
                <Plus size={13} /> {g.addCharge}
              </button>
            ))}
          <div className="gh-line">
            <span>{g.discount}</span>
            {open && !desk ? (
              <span className="gh-disc">
                −
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={disc}
                  onChange={(e) => setDisc(e.target.value)}
                  onBlur={() => Number(disc || 0) !== (s.discount || 0) && run(() => api(ctx).discount(ctx.id, s._id, Number(disc) || 0))}
                  aria-label={g.discount}
                />
              </span>
            ) : (
              <b>{b.discount ? `−${money(b.discount, cur)}` : "—"}</b>
            )}
          </div>
          <div className="gh-line total">
            <span>{g.total}</span>
            <b>{money(b.total, cur)}</b>
          </div>

          <h4>{g.payments}</h4>
          {s.payments.map((p) => (
            <div key={p._id} className={`gh-line ${p.amount < 0 ? "neg" : ""}`}>
              <span>
                {g.methods[p.method]}
                {p.note ? ` · ${p.note}` : ""} <small className="rs-muted">{fmtTime(p.at, lang)}</small>
              </span>
              <b>{money(p.amount, cur)}</b>
              {!readOnly && !desk && (
                <button type="button" className="md-icon-btn" onClick={() => run(() => api(ctx).removePayment(ctx.id, s._id, p._id))} aria-label={g.remove} disabled={busy}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {!readOnly &&
            (pay ? (
              <form
                className="gh-inline"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await run(() => api(ctx).addPayment(ctx.id, s._id, { method: pay.method, amount: Number(pay.amount), note: pay.note }))) setPay(null);
                }}
              >
                <div className="at-seg small gh-wrap">
                  {data.settings.methods.map((k) => (
                    <button key={k} type="button" className={pay.method === k ? "on" : ""} onClick={() => setPay({ ...pay, method: k })}>
                      {g.methods[k]}
                    </button>
                  ))}
                </div>
                <input type="number" step="any" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} aria-label={g.amount} className="gh-num" autoFocus />
                <input maxLength={120} placeholder={g.note} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} aria-label={g.note} />
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setPay(null)}>
                  <X size={14} />
                </button>
                <button type="submit" className="md-btn md-btn-primary sa-btn-sm" disabled={busy || !Number(pay.amount)}>
                  {Number(pay.amount) < 0 ? <Minus size={14} /> : <Plus size={14} />} {Number(pay.amount) < 0 ? g.refund : g.takePayment}
                </button>
              </form>
            ) : (
              <button type="button" className="gh-add" onClick={() => setPay({ method: data.settings.methods[0] || "cash", amount: b.balance > 0 ? String(b.balance) : "", note: "" })}>
                <Plus size={13} /> {g.takePayment}
              </button>
            ))}
          <div className={`gh-line due ${b.balance > 0 ? "owe" : b.balance < 0 ? "back" : "ok"}`}>
            <span>{b.balance > 0 ? g.balance : b.balance < 0 ? g.change : g.settled}</span>
            <b>{money(Math.abs(b.balance), cur)}</b>
          </div>
        </div>
        {s.by && (
          <small className="rs-muted">
            {g.by.replace("{name}", s.by)} · {fmtTime(s.created_date, lang)}
          </small>
        )}
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

function EditStay({ ctx, s, busy, onCancel, onSave }) {
  const { g, cur } = ctx;
  const [f, setF] = useState({ from: s.from, to: s.to, room_id: s.room_id, rate: s.rate, adults: s.adults, children: s.children, note: s.note || "", guest: { ...s.guest } });
  const busyRooms = useFreeRooms(ctx, f.from, f.to, s._id);
  const nights = f.to > f.from ? nightsOf(f.from, f.to) : 0;
  const changedRoom = useMemo(() => f.room_id !== s.room_id, [f.room_id, s.room_id]);
  return (
    <div className="gh-edit md-fields">
      <div className="md-fields-grid">
        <Field label={g.arrive} htmlFor="ge-from">
          <input id="ge-from" type="date" value={f.from} disabled={s.status === "in"} onChange={(e) => e.target.value && setF({ ...f, from: e.target.value, to: f.to <= e.target.value ? addDays(e.target.value, 1) : f.to })} />
        </Field>
        <Field label={`${g.leave}${nights ? ` · ${g.nights.replace("{n}", nights)}` : ""}`} htmlFor="ge-to">
          <input id="ge-to" type="date" value={f.to} min={addDays(f.from, 1)} onChange={(e) => e.target.value && setF({ ...f, to: e.target.value })} />
        </Field>
      </div>
      <Field label={g.room}>
        <RoomPicker ctx={ctx} value={f.room_id} busyRooms={busyRooms} onPick={(r) => setF({ ...f, room_id: r._id })} />
      </Field>
      <GuestFields ctx={ctx} f={f} setF={setF} lookup={false} />
      <div className="md-fields-grid gh-three">
        <Field label={`${g.rate} (${cur})`} htmlFor="ge-rate">
          <input id="ge-rate" type="number" min={0} step="any" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} />
        </Field>
        <Field label={g.adults} htmlFor="ge-ad">
          <input id="ge-ad" type="number" min={1} max={20} value={f.adults} onChange={(e) => setF({ ...f, adults: e.target.value })} />
        </Field>
        <Field label={g.children} htmlFor="ge-ch">
          <input id="ge-ch" type="number" min={0} max={20} value={f.children} onChange={(e) => setF({ ...f, children: e.target.value })} />
        </Field>
      </div>
      <Field label={g.note} htmlFor="ge-note">
        <input id="ge-note" maxLength={500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      <div className="at-save-row">
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={onCancel} disabled={busy}>
          {g.cancel}
        </button>
        <button
          type="button"
          className="md-btn md-btn-primary sa-btn-sm"
          disabled={busy || !nights || !f.guest.name.trim()}
          onClick={() =>
            onSave({ ...(s.status === "booked" ? { from: f.from } : {}), to: f.to, ...(changedRoom ? { room_id: f.room_id } : {}), rate: Number(f.rate), adults: Number(f.adults) || 1, children: Number(f.children) || 0, note: f.note, guest: f.guest })
          }
        >
          {busy ? g.saving : g.save}
        </button>
      </div>
    </div>
  );
}
