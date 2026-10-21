import { useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble, CalendarPlus, ChevronLeft, ChevronRight, CircleCheck, DoorOpen, LogIn, LogOut, RefreshCw, Search, UserPlus } from "lucide-react";
import { guestHouseService } from "../../../api/services";

// the owner dashboard uses the owner API; the desk POS passes its own (ctx.api)
const api = (ctx) => ctx.api || guestHouseService;
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { memo } from "../../../lib/memo";
import { addDays, fmtDay, money, todayKH } from "./text";
import { BookModal, StayModal } from "./GhStay";

// shared: open a booking / a new booking from any tab
function useStayModals(ctx, onChanged) {
  const [stayId, setStayId] = useState(null);
  const [book, setBook] = useState(null);
  const modals = (
    <>
      {book && (
        <BookModal
          ctx={ctx}
          init={book}
          onClose={() => setBook(null)}
          onDone={(s) => {
            setBook(null);
            onChanged();
            setStayId(s._id);
          }}
        />
      )}
      {stayId && <StayModal ctx={ctx} stayId={stayId} onClose={() => setStayId(null)} onChanged={onChanged} />}
    </>
  );
  return { openStay: setStayId, openBook: setBook, modals };
}

function SetupCard({ ctx }) {
  const { g, data } = ctx;
  const steps = [
    ["type", g.stepType, g.stepTypeSub, data.types.length > 0],
    ["room", g.stepRoom, g.stepRoomSub, data.counts.rooms > 0],
  ];
  if (steps.every((s) => s[3])) return null;
  return (
    <section className="panel-card at-setup">
      <h2 style={{ margin: 0 }}>{g.setupTitle}</h2>
      <p className="rs-muted" style={{ margin: "4px 0 12px" }}>
        {g.setupSub}
      </p>
      <ol className="at-steps">
        {steps.map(([k, title, sub, ok], i) => (
          <li key={k} className={ok ? "done" : ""}>
            <span className="at-step-n">{ok ? <CircleCheck size={15} /> : i + 1}</span>
            <span className="at-step-text">
              <b>{title}</b>
              <small>{sub}</small>
            </span>
            {ok ? (
              <span className="at-step-done">{g.done}</span>
            ) : (
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => ctx.go("rooms")}>
                {g.go}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ============================ TODAY ============================
export function TodayTab({ ctx }) {
  const { g, lang, cur, readOnly } = ctx;
  const [d, setD] = useState(() => memo.get(`gh:${ctx.id}:today`) || null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    setBusy(true);
    return api(ctx)
      .today(ctx.id)
      .then((r) => {
        memo.set(`gh:${ctx.id}:today`, r.data);
        setD(r.data);
      })
      .catch((e) => ctx.notify({ type: "error", text: e.message }))
      .finally(() => setBusy(false));
  }, [ctx.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);
  const { openStay, openBook, modals } = useStayModals(ctx, load);
  const quick = async (s, action) => {
    try {
      await api(ctx).action(ctx.id, s._id, action);
      ctx.notify({ type: "success", text: action === "check-in" ? g.checkedIn : g.checkedOut });
      load();
    } catch {
      openStay(s._id); // money left to settle etc. → open the booking
    }
  };
  const ready = ctx.data.types.length > 0 && ctx.data.counts.rooms > 0;

  return (
    <div className="rs-col">
      <SetupCard ctx={ctx} />
      <section className="panel-card at-dayhead">
        <div className="at-daynav">
          <b className="gh-today">{fmtDay(todayKH(), lang, { weekday: "long", day: "numeric", month: "long" })}</b>
          <span className="at-grow" />
          <button type="button" className="md-icon-btn" onClick={load} aria-label="Refresh" disabled={busy}>
            <RefreshCw size={16} className={busy ? "md-spin" : ""} />
          </button>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => openBook({ walkIn: true })} disabled={readOnly || !ready}>
            <UserPlus size={15} /> {g.walkIn}
          </button>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => openBook({})} disabled={readOnly || !ready}>
            <CalendarPlus size={15} /> {g.newBooking}
          </button>
        </div>
        {d && (
          <div className="at-tiles">
            <div className="at-tile t-blue">
              <b>
                {d.counts.occupied}/{d.counts.rooms}
              </b>
              <small>{g.occupied}</small>
            </div>
            <div className="at-tile t-ok">
              <b>{d.counts.free}</b>
              <small>{g.free}</small>
            </div>
            <div className="at-tile t-warn">
              <b>{d.counts.arrivals}</b>
              <small>{g.arrivals}</small>
            </div>
            <div className="at-tile t-muted">
              <b>{d.counts.departures}</b>
              <small>{g.departures}</small>
            </div>
            <div className="at-tile gh-money">
              <b>{money(d.money.total, cur)}</b>
              <small>
                {g.moneyToday}
                {Object.keys(d.money.by_method).length > 0 &&
                  ` · ${Object.entries(d.money.by_method)
                    .map(([k, v]) => `${g.methods[k]} ${money(v, cur)}`)
                    .join(" · ")}`}
              </small>
            </div>
          </div>
        )}
      </section>

      {!d ? (
        <ListSkeleton rows={4} />
      ) : (
        <>
          {d.rooms.length > 0 && <RoomBoard ctx={ctx} rooms={d.rooms} onStay={openStay} onFree={(r) => openBook({ walkIn: true, room_id: r._id })} />}
          <div className="gh-cols">
            <StayList ctx={ctx} title={g.arrivals} rows={d.arrivals} empty={g.noArrivals} onOpen={openStay} action={(s) => (s.from <= d.day ? ["check-in", g.checkIn, LogIn] : null)} onAction={quick} today={d.day} />
            <StayList ctx={ctx} title={g.departures} rows={d.departures} empty={g.noDepartures} onOpen={openStay} action={() => ["check-out", g.checkOut, LogOut]} onAction={quick} today={d.day} />
          </div>
          {d.in_house.length > 0 && <StayList ctx={ctx} title={`${g.inHouse} (${d.in_house.length})`} rows={d.in_house} onOpen={openStay} today={d.day} />}
        </>
      )}
      {modals}
    </div>
  );
}

// room cards, like the restaurant's table map: colour = what is happening in the room now
const STATES = ["free", "arriving", "occupied", "due_out"];
function RoomBoard({ ctx, rooms, onStay, onFree }) {
  const { g, lang, cur, readOnly } = ctx;
  const [filter, setFilter] = useState("");
  const floors = [...new Set(rooms.map((r) => r.floor || ""))];
  const count = (k) => rooms.filter((r) => r.state === k).length;
  const shown = rooms.filter((r) => !filter || r.state === filter);
  return (
    <section className="panel-card gh-rb">
      <div className="gh-rb-filters">
        <button type="button" className={!filter ? "on" : ""} onClick={() => setFilter("")}>
          {g.filterAll} <b>{rooms.length}</b>
        </button>
        {STATES.map((k) => (
          <button key={k} type="button" className={`f-${k} ${filter === k ? "on" : ""}`} onClick={() => setFilter(filter === k ? "" : k)}>
            <i /> {g.states[k]} <b>{count(k)}</b>
          </button>
        ))}
      </div>
      {floors.map((fl) => {
        const list = shown.filter((r) => (r.floor || "") === fl);
        if (!list.length) return null;
        return (
          <div key={fl || "-"} className="gh-rb-floor">
            {floors.length > 1 && <small className="gh-floor-label">{fl ? `${g.floor} ${fl}` : "—"}</small>}
            <div className="gh-rb-grid">
              {list.map((r) => {
                const st = r.stay;
                return (
                  <button key={r._id} type="button" className={`gh-rc s-${r.state}`} style={{ "--c": r.color || "#2563EB" }} onClick={() => (st ? onStay(st._id) : onFree(r))} disabled={readOnly && !st}>
                    <span className="gh-rc-head">
                      <b>{r.name}</b>
                      <em>{g.states[r.state]}</em>
                    </span>
                    <span className="gh-rc-type">{r.type}</span>
                    {st ? (
                      <>
                        <span className="gh-rc-guest">{st.guest.name}</span>
                        <span className="gh-rc-dates">
                          {fmtDay(st.from, lang)} → {fmtDay(st.to, lang)} · {g.nights.replace("{n}", st.bill.nights)}
                        </span>
                        {st.bill.balance > 0 && <span className="gh-rc-owe">{money(st.bill.balance, cur)}</span>}
                      </>
                    ) : (
                      <>
                        <span className="gh-rc-free">
                          <DoorOpen size={22} />
                        </span>
                        {r.next ? <span className="gh-rc-dates">{g.nextBooking.replace("{date}", fmtDay(r.next.from, lang))}</span> : <span className="gh-rc-dates">&nbsp;</span>}
                      </>
                    )}
                    {r.hk && r.hk !== "ready" && <span className={`gh-hk k-${r.hk}`}>🧹 {g.hkStates?.[r.hk] || r.hk}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function StayList({ ctx, title, rows, empty, onOpen, action, onAction, today }) {
  const { g, lang, cur, readOnly } = ctx;
  return (
    <section className="panel-card gh-list">
      <h3>{title}</h3>
      {!rows.length && <p className="rs-muted">{empty}</p>}
      {rows.map((s) => {
        const act = action?.(s);
        return (
          <div key={s._id} className="gh-row">
            <button type="button" className="gh-row-main" onClick={() => onOpen(s._id)}>
              <span className="gh-row-room">{s.room_name}</span>
              <span className="gh-row-text">
                <b>
                  {s.guest.name} {s.status === "booked" && s.from < today && <em className="gh-late">{g.late}</em>}
                </b>
                <small>
                  {fmtDay(s.from, lang)} → {fmtDay(s.to, lang)} · {g.nights.replace("{n}", s.bill.nights)}
                  {s.bill.balance > 0 && (
                    <span className="gh-owe">
                      {" "}
                      · {g.balance} {money(s.bill.balance, cur)}
                    </span>
                  )}
                </small>
              </span>
            </button>
            {act && !readOnly && (
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => onAction(s, act[0])}>
                {(() => {
                  const I = act[2];
                  return <I size={14} />;
                })()}{" "}
                {act[1]}
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

// ============================ CALENDAR ============================
const DAYS = 14;
export function CalendarTab({ ctx }) {
  const { g, data, lang, readOnly } = ctx;
  const [start, setStart] = useState(() => addDays(todayKH(), -1));
  const [stays, setStays] = useState(null);
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(start, i)), [start]);
  const end = addDays(start, DAYS);
  const load = useCallback(
    () =>
      api(ctx)
        .stays(ctx.id, { from: start, to: end })
        .then((r) => setStays(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id, start, end], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load]);
  const { openStay, openBook, modals } = useStayModals(ctx, load);
  const typeOf = new Map(data.types.map((t) => [t._id, t]));
  const rooms = data.rooms.filter((r) => r.active);
  const today = todayKH();
  const idx = (day) => Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);

  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="at-ro-head">
          <div>
            <h2 style={{ margin: 0 }}>{g.calTitle}</h2>
            <small className="rs-muted gh-sub">{g.calSub}</small>
          </div>
          <div className="at-ro-week">
            <button type="button" className="md-icon-btn" onClick={() => setStart(addDays(start, -7))} aria-label="-7">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setStart(addDays(todayKH(), -1))}>
              {g.thisWeek}
            </button>
            <button type="button" className="md-icon-btn" onClick={() => setStart(addDays(start, 7))} aria-label="+7">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
      {!stays ? (
        <ListSkeleton rows={5} />
      ) : !rooms.length ? (
        <section className="panel-card rs-empty">
          <p className="rs-muted">{g.noRooms}</p>
          <button type="button" className="md-btn md-btn-primary" onClick={() => ctx.go("rooms")}>
            {g.addRooms}
          </button>
        </section>
      ) : (
        <section className="panel-card gh-cal-card">
          <div className="gh-cal-scroll">
            <div className="gh-cal" style={{ "--n": DAYS }}>
              <div className="gh-cal-row head">
                <span className="gh-cal-room" />
                {days.map((d) => (
                  <span key={d} className={`gh-cal-day ${d === today ? "today" : ""} ${[0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()) ? "we" : ""}`} style={{ gridColumn: idx(d) + 2 }}>
                    <small>{fmtDay(d, lang, { weekday: "short" })}</small>
                    <b>{Number(d.slice(8))}</b>
                  </span>
                ))}
              </div>
              {rooms.map((r) => {
                const t = typeOf.get(r.type_id);
                const mine = stays.filter((s) => s.room_id === r._id);
                return (
                  <div key={r._id} className="gh-cal-row" style={{ "--c": t?.color || "#2563EB" }}>
                    <span className="gh-cal-room">
                      <b>{r.name}</b>
                      <small>{t?.name}</small>
                    </span>
                    {days.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`gh-cal-cell ${d === today ? "today" : ""}`}
                        style={{ gridColumn: idx(d) + 2 }}
                        onClick={() => !readOnly && d >= addDays(today, -1) && openBook({ from: d, to: addDays(d, 1), room_id: r._id })}
                        aria-label={`${r.name} ${d}`}
                      />
                    ))}
                    {mine.map((s) => {
                      const a = Math.max(0, idx(s.from));
                      const z = Math.min(DAYS, idx(s.to));
                      if (z <= a) return null;
                      return (
                        <button
                          key={s._id}
                          type="button"
                          className={`gh-bar st-${s.status} ${idx(s.from) < 0 ? "cut-l" : ""} ${idx(s.to) > DAYS ? "cut-r" : ""}`}
                          style={{ gridColumn: `${a + 2} / ${z + 2}` }}
                          onClick={() => openStay(s._id)}
                          title={`${s.no} · ${s.guest.name}`}
                        >
                          <b>{s.guest.name}</b>
                          {s.bill.balance > 0 && <i className="gh-dot" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="gh-legend">
            {["booked", "in", "out"].map((k) => (
              <span key={k} className={`st-${k}`}>
                <i /> {g.status[k]}
              </span>
            ))}
            <span>
              <i className="gh-dot" /> {g.balance}
            </span>
          </div>
        </section>
      )}
      {modals}
    </div>
  );
}

// ============================ BOOKINGS ============================
export function BookingsTab({ ctx }) {
  const { g, lang, cur, readOnly } = ctx;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState(null);
  const load = useCallback(
    () =>
      api(ctx)
        .stays(ctx.id, { ...(q.trim() ? { q: q.trim() } : {}), ...(status ? { status } : {}) })
        .then((r) => setRows(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id, q, status], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  const { openStay, openBook, modals } = useStayModals(ctx, load);
  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="gh-search">
          <label className="gh-search-box">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={g.search} />
          </label>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => openBook({})} disabled={readOnly || !ctx.data.counts.rooms}>
            <CalendarPlus size={15} /> {g.newBooking}
          </button>
        </div>
        <div className="at-seg small gh-wrap" style={{ marginTop: 10 }}>
          {["", "booked", "in", "out", "cancelled", "no_show"].map((k) => (
            <button key={k || "all"} type="button" className={status === k ? "on" : ""} onClick={() => setStatus(k)}>
              {k ? g.status[k] : g.all}
            </button>
          ))}
        </div>
      </section>
      {!rows ? (
        <ListSkeleton rows={5} />
      ) : !rows.length ? (
        <section className="panel-card rs-empty">
          <p className="rs-muted">{g.noBookings}</p>
        </section>
      ) : (
        <section className="panel-card gh-list">
          {rows.map((s) => (
            <div key={s._id} className="gh-row">
              <button type="button" className="gh-row-main" onClick={() => openStay(s._id)}>
                <span className="gh-row-room">{s.room_name}</span>
                <span className="gh-row-text">
                  <b>
                    {s.guest.name} <small className="rs-muted">{s.no}</small>
                  </b>
                  <small>
                    {fmtDay(s.from, lang)} → {fmtDay(s.to, lang)} · {g.nights.replace("{n}", s.bill.nights)} · {money(s.bill.total, cur)}
                    {s.bill.balance > 0 && ["booked", "in", "out"].includes(s.status) && (
                      <span className="gh-owe">
                        {" "}
                        · {g.balance} {money(s.bill.balance, cur)}
                      </span>
                    )}
                  </small>
                </span>
              </button>
              <span className={`gh-st st-${s.status}`}>{g.status[s.status]}</span>
            </div>
          ))}
        </section>
      )}
      {modals}
    </div>
  );
}

// ============================ REPORT ============================
const monthNow = () => todayKH().slice(0, 7);
const shiftMonth = (month, n) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
export function ReportTab({ ctx }) {
  const { g, lang } = ctx;
  const [month, setMonth] = useState(monthNow());
  const [r, setR] = useState(null);
  useEffect(() => {
    setR(null);
    api(ctx)
      .report(ctx.id, month)
      .then((x) => setR(x.data))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx.id, month]); // eslint-disable-line react-hooks/exhaustive-deps
  const label = new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const cur = r?.currency || ctx.cur;
  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="at-ro-head">
          <h2 style={{ margin: 0 }}>{g.repTitle}</h2>
          <div className="at-ro-week">
            <button type="button" className="md-icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="-1">
              <ChevronLeft size={18} />
            </button>
            <b>{month === monthNow() ? g.thisMonth : label}</b>
            <button type="button" className="md-icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthNow()} aria-label="+1">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        {r && (
          <div className="at-tiles gh-kpis">
            <div className="at-tile t-blue">
              <b>{r.occupancy}%</b>
              <small>{g.occupancy}</small>
            </div>
            <div className="at-tile">
              <b>{r.nights}</b>
              <small>{g.nightsSold}</small>
            </div>
            <div className="at-tile">
              <b>{money(r.adr, cur)}</b>
              <small>{g.adr}</small>
            </div>
            <div className="at-tile t-ok">
              <b>{money(r.room_revenue + r.extras, cur)}</b>
              <small>
                {g.roomRevenue} {money(r.room_revenue, cur)} · {g.extrasRevenue} {money(r.extras, cur)}
              </small>
            </div>
            <div className="at-tile gh-money">
              <b>{money(r.received, cur)}</b>
              <small>{g.received}</small>
            </div>
          </div>
        )}
      </section>
      {!r ? (
        <ListSkeleton rows={4} />
      ) : (
        <>
          <section className="panel-card">
            <h3 style={{ marginTop: 0 }}>{g.occupancy}</h3>
            <div className="gh-chart">
              {r.days.map((d) => {
                const pct = r.rooms ? Math.round((d.occupied / r.rooms) * 100) : 0;
                return (
                  <span key={d.day} title={`${fmtDay(d.day, lang)} · ${d.occupied}/${r.rooms}`}>
                    <i style={{ height: `${Math.max(pct, 2)}%` }} className={pct >= 80 ? "hi" : ""} />
                    <small>{Number(d.day.slice(8))}</small>
                  </span>
                );
              })}
            </div>
          </section>
          <div className="gh-cols">
            <section className="panel-card gh-list">
              <h3>{g.byType}</h3>
              {r.by_type.map((t) => (
                <div key={t.name} className="gh-line">
                  <span>
                    <BedDouble size={14} /> {t.name} · {g.nights.replace("{n}", t.nights)}
                  </span>
                  <b>{money(t.revenue, cur)}</b>
                </div>
              ))}
            </section>
            <section className="panel-card gh-list">
              <h3>{g.byMethod}</h3>
              {!Object.keys(r.by_method).length && <p className="rs-muted">—</p>}
              {Object.entries(r.by_method).map(([k, v]) => (
                <div key={k} className="gh-line">
                  <span>{g.methods[k]}</span>
                  <b>{money(v, cur)}</b>
                </div>
              ))}
            </section>
          </div>
          {r.by_room?.length > 0 && (
            <section className="panel-card">
              <h3 style={{ marginTop: 0 }}>{g.byRoom}</h3>
              <div className="gh-rtable-wrap">
                <table className="gh-rtable">
                  <thead>
                    <tr>
                      <th>{g.roomCol}</th>
                      <th className="n">{g.nightsCol}</th>
                      <th className="bar">{g.occCol}</th>
                      <th className="n">{g.staysCol}</th>
                      <th className="n">{g.revenueCol}</th>
                      <th className="n">{g.extrasCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.by_room.map((x) => (
                      <tr key={x._id}>
                        <td>
                          <b>{x.name}</b> <small className="rs-muted">{x.type}</small>
                        </td>
                        <td className="n">{x.nights}</td>
                        <td className="bar">
                          <span className="gh-occ">
                            <i style={{ width: `${Math.min(100, x.occupancy)}%` }} className={x.occupancy >= 80 ? "hi" : ""} />
                          </span>
                          <small>{x.occupancy}%</small>
                        </td>
                        <td className="n">{x.stays}</td>
                        <td className="n">
                          <b>{money(x.revenue, cur)}</b>
                        </td>
                        <td className="n">{money(x.extras, cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
