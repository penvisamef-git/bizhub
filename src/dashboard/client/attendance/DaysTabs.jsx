import { useCallback, useEffect, useState } from "react";
import { CalendarHeart, Check, Clock8, Lock, ChevronLeft, ChevronRight, LogIn, LogOut, PencilLine, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { attendanceService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";

const T = {
  en: {
    title: "Holidays",
    sub: "Holidays are not work days: nobody is counted absent, and leave doesn't use them. Working on a holiday counts as an extra day (Payroll pays it × {rate}).",
    auto: "This year's Cambodia public holidays are added by themselves, free. Delete any your company works, or add your own days off.",
    add: "Add a day off",
    day: "Date",
    name: "Name",
    namePh: "e.g. Company trip",
    save: "Add",
    none: "No holidays this year yet. Add your company's days off here.",
    missing: "Put back Cambodia's list ({n} missing)",
    days: "{n} days",
    preset: "Cambodia",
    own: "Company",
    edit: "Rename",
    remove: "Remove",
    fixTitle: "Asked to fix",
    fixSub: "Staff who forgot to clock in or out asked to add the record. Approve to add it with their reason.",
    inAt: "clock-in at",
    outAt: "clock-out at",
    notePh: "Note (optional)",
    approve: "Approve",
    reject: "Reject",
    asked: "asked {date}",
    lockedTitle: "Cambodia's public holidays {year}",
    lockedSub: "Plan {year} now: {n} national holidays ready to put in your calendar. This year's list is free; next year's is {coins} coins, one time.",
    unlock: "Unlock {year} · {coins} coins",
    buyTitle: "Unlock public holidays {year}",
    buySub: "All {n} national holidays of {year}, added to your calendar now — plan leave, shifts and pay early.",
    perk1: "{n} days, in Khmer and English",
    perk2: "Not counted as absent; worked days pay × your holiday rate",
    perk3: "One time for {year}",
    done: "{year}'s holidays are in your calendar.",
    freeNote: "This year's national holidays are free.",
    soonNote: "These are the days known so far. Khmer New Year is checked, and Visak Bochea, Royal Ploughing, Pchum Ben and the Water Festival are added to your calendar automatically as soon as the government announces them.",
  },
  km: {
    title: "ថ្ងៃឈប់សម្រាក",
    sub: "ថ្ងៃឈប់សម្រាក មិនមែនជាថ្ងៃធ្វើការ៖ គ្មាននរណារាប់ជាអវត្តមាន ហើយច្បាប់មិនកាត់ថ្ងៃទាំងនេះ។ ធ្វើការថ្ងៃឈប់ រាប់ជាថ្ងៃបន្ថែម (ប្រាក់ខែបង់ × {rate})។",
    auto: "ថ្ងៃឈប់សម្រាកសាធារណៈកម្ពុជាឆ្នាំនេះ បញ្ចូលដោយខ្លួនឯង ឥតគិតថ្លៃ។ លុបថ្ងៃដែលក្រុមហ៊ុនអ្នកធ្វើការ ឬបន្ថែមថ្ងៃឈប់ផ្ទាល់ខ្លួន។",
    add: "បន្ថែមថ្ងៃឈប់",
    day: "កាលបរិច្ឆេទ",
    name: "ឈ្មោះ",
    namePh: "ឧ. ដំណើរកម្សាន្តក្រុមហ៊ុន",
    save: "បន្ថែម",
    none: "មិនទាន់មានថ្ងៃឈប់ក្នុងឆ្នាំនេះ។ បន្ថែមថ្ងៃឈប់របស់ក្រុមហ៊ុននៅទីនេះ។",
    missing: "ដាក់បញ្ជីកម្ពុជាវិញ (ខ្វះ {n})",
    days: "{n} ថ្ងៃ",
    preset: "កម្ពុជា",
    own: "ក្រុមហ៊ុន",
    edit: "ប្តូរឈ្មោះ",
    remove: "លុប",
    fixTitle: "សំណើកែវត្តមាន",
    fixSub: "បុគ្គលិកដែលភ្លេចចុះចូល ឬចេញ ស្នើបន្ថែមកំណត់ត្រា។ យល់ព្រមដើម្បីបន្ថែមជាមួយមូលហេតុរបស់គេ។",
    inAt: "ចុះចូលម៉ោង",
    outAt: "ចុះចេញម៉ោង",
    notePh: "កំណត់ចំណាំ (ស្រេចចិត្ត)",
    approve: "យល់ព្រម",
    reject: "បដិសេធ",
    asked: "ស្នើ {date}",
    lockedTitle: "ថ្ងៃឈប់សម្រាកសាធារណៈកម្ពុជា {year}",
    lockedSub: "រៀបចំឆ្នាំ {year} ឥឡូវ៖ ថ្ងៃឈប់សម្រាកជាតិ {n} ថ្ងៃ រួចរាល់ដាក់ក្នុងប្រតិទិន។ បញ្ជីឆ្នាំនេះឥតគិតថ្លៃ បញ្ជីឆ្នាំក្រោយ {coins} កាក់ បង់ម្តង។",
    unlock: "ដោះសោ {year} · {coins} កាក់",
    buyTitle: "ដោះសោថ្ងៃឈប់សម្រាក {year}",
    buySub: "ថ្ងៃឈប់សម្រាកជាតិទាំង {n} ថ្ងៃនៃឆ្នាំ {year} បញ្ចូលក្នុងប្រតិទិនភ្លាមៗ — រៀបចំច្បាប់ វេន និងប្រាក់ខែជាមុន។",
    perk1: "{n} ថ្ងៃ ជាភាសាខ្មែរ និងអង់គ្លេស",
    perk2: "មិនរាប់ជាអវត្តមាន ធ្វើការបង់ × អត្រាថ្ងៃឈប់",
    perk3: "បង់ម្តងសម្រាប់ឆ្នាំ {year}",
    done: "ថ្ងៃឈប់សម្រាកឆ្នាំ {year} នៅក្នុងប្រតិទិនហើយ។",
    freeNote: "ថ្ងៃឈប់សម្រាកជាតិឆ្នាំនេះ ឥតគិតថ្លៃ។",
    soonNote: "នេះជាថ្ងៃដែលដឹងរួច។ ចូលឆ្នាំខ្មែរនឹងត្រូវពិនិត្យ ហើយវិសាខបូជា ច្រត់ព្រះនង្គ័ល ភ្ជុំបិណ្ឌ និងអុំទូក នឹងបញ្ចូលក្នុងប្រតិទិនដោយស្វ័យប្រវត្តិ ភ្លាមៗពេលរដ្ឋាភិបាលប្រកាស។",
  },
};
const fmtDay = (day, lang, opts = { weekday: "short", day: "numeric", month: "short" }) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
};
const monthName = (m, lang) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, m - 1, 1)));

// ============================ HOLIDAYS ============================
export function HolidaysTab({ ctx }) {
  const { lang, readOnly } = ctx;
  const t = T[lang] || T.en;
  const [year, setYear] = useState(() => new Date(Date.now() + 7 * 3600000).getUTCFullYear());
  const [res, setRes] = useState(null);
  const [form, setForm] = useState({ day: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // { _id, name }
  const [buying, setBuying] = useState(false);

  const load = useCallback(
    () =>
      attendanceService.holidays
        .list(ctx.id, year)
        .then(setRes)
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id, year], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    setRes(null);
    load();
  }, [load]);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const add = (e) => {
    e.preventDefault();
    run(async () => {
      await attendanceService.holidays.add(ctx.id, form);
      setForm({ day: "", name: "" });
    });
  };

  const rows = res?.data || [];
  const months = [];
  for (const h of rows) {
    const m = Number(h.day.slice(5, 7));
    if (!months.length || months[months.length - 1].m !== m) months.push({ m, list: [] });
    months[months.length - 1].list.push(h);
  }
  const rate = ctx.data.holiday_rate || 2;

  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="at-hol-head">
          <h2 style={{ margin: 0 }}>
            <CalendarHeart size={20} /> {t.title}
          </h2>
          <div className="sa-month at-year">
            <button type="button" className="md-icon-btn" onClick={() => setYear(year - 1)} aria-label="-1">
              <ChevronLeft size={18} />
            </button>
            <b>{year}</b>
            <button type="button" className="md-icon-btn" onClick={() => setYear(year + 1)} aria-label="+1">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <p className="rs-muted" style={{ margin: "8px 0 0" }}>
          {t.sub.replace("{rate}", rate)}
        </p>
        <p className="rs-muted" style={{ margin: "6px 0 0" }}>
          {t.auto}
        </p>
        {!readOnly && (
          <form className="at-hol-add" onSubmit={add}>
            <label>
              <small>{t.day}</small>
              <input type="date" required value={form.day} min={`${year}-01-01`} max={`${year}-12-31`} onChange={(e) => setForm({ ...form, day: e.target.value })} />
            </label>
            <label className="grow">
              <small>{t.name}</small>
              <input required maxLength={80} value={form.name} placeholder={t.namePh} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <button type="submit" className="md-btn md-btn-primary" disabled={busy}>
              <Plus size={16} /> {t.save}
            </button>
          </form>
        )}
        {res?.locked && res.can_buy && (
          <div className="at-hol-lock">
            <span className="rs-addon-ic">
              <Lock size={20} />
            </span>
            <div>
              <b>{t.lockedTitle.replace("{year}", year)}</b>
              <p className="rs-muted">{t.lockedSub.replace("{year}", year).replace("{n}", res.preset).replace("{coins}", res.price)}</p>
              {!res.official && <p className="rs-muted at-hol-soon">{t.soonNote}</p>}
            </div>
            <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => setBuying(true)} disabled={readOnly}>
              <CoinIcon size={16} /> {t.unlock.replace("{year}", year).replace("{coins}", res.price)}
            </button>
          </div>
        )}
        {res && res.free && res.preset > 0 && <p className="at-hol-free">✓ {t.freeNote}</p>}
        {res && res.missing > 0 && !readOnly && (
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" style={{ marginTop: 10 }} onClick={() => run(() => attendanceService.holidays.preset(ctx.id, year))} disabled={busy}>
            <RotateCcw size={14} /> {t.missing.replace("{n}", res.missing)}
          </button>
        )}
      </section>

      {!res ? (
        <ListSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <section className="panel-card rs-empty">
          <p className="rs-muted">{t.none}</p>
        </section>
      ) : (
        <section className="panel-card">
          <span className="rs-pill on">
            <CalendarHeart size={12} /> {t.days.replace("{n}", rows.length)}
          </span>
          <div className="at-hols">
            {months.map(({ m, list }) => (
              <div key={m} className="at-hol-month">
                <h3>{monthName(m, lang)}</h3>
                <ul>
                  {list.map((h) => (
                    <li key={h._id}>
                      <span className="at-hol-date">
                        <b>{Number(h.day.slice(8, 10))}</b>
                        <small>{fmtDay(h.day, lang, { weekday: "short" })}</small>
                      </span>
                      {editing?._id === h._id ? (
                        <form
                          className="at-hol-edit"
                          onSubmit={(e) => {
                            e.preventDefault();
                            run(async () => {
                              await attendanceService.holidays.rename(ctx.id, h._id, editing.name);
                              setEditing(null);
                            });
                          }}
                        >
                          <input autoFocus required maxLength={80} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                          <button type="submit" className="md-icon-btn" aria-label={t.save} disabled={busy}>
                            <Check size={15} />
                          </button>
                          <button type="button" className="md-icon-btn" aria-label="x" onClick={() => setEditing(null)}>
                            <X size={15} />
                          </button>
                        </form>
                      ) : (
                        <span className="at-hol-name">
                          {h.name}
                          <small className={`at-tag ${h.preset ? "" : "own"}`}>{h.preset ? t.preset : t.own}</small>
                        </span>
                      )}
                      {!readOnly && editing?._id !== h._id && (
                        <span className="at-hol-act">
                          <button type="button" className="md-icon-btn" onClick={() => setEditing({ _id: h._id, name: h.name })} aria-label={t.edit} title={t.edit}>
                            <PencilLine size={15} />
                          </button>
                          <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => run(() => attendanceService.holidays.remove(ctx.id, h._id))} aria-label={t.remove} title={t.remove} disabled={busy}>
                            <Trash2 size={15} />
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
      {buying && res && (
        <PurchaseModal
          stage={
            <div className="rs-stage">
              <span className="at-hol-stage">
                <CalendarHeart size={34} />
                <b>{year}</b>
              </span>
              <b>{t.lockedTitle.replace("{year}", year)}</b>
            </div>
          }
          badge={t.title}
          title={t.buyTitle.replace("{year}", year)}
          sub={t.buySub.replace("{n}", res.preset).replace("{year}", year)}
          perks={[t.perk1.replace("{n}", res.preset), t.perk2, t.perk3.replace("{year}", year)]}
          price={res.price}
          buyLabel={t.unlock.replace("{year}", year).replace("{coins}", res.price)}
          buy={() => attendanceService.holidays.unlock(ctx.id, year)}
          doneSub={t.done.replace("{year}", year)}
          onDone={() => {
            load();
            ctx.reload();
          }}
          onClose={() => setBuying(false)}
        />
      )}
    </div>
  );
}

// ============================ CORRECTION REQUESTS (in Needs review) ============================
export function FixRequests({ ctx, onChange }) {
  const { lang, readOnly } = ctx;
  const t = T[lang] || T.en;
  const [rows, setRows] = useState(null);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState("");
  useEffect(() => {
    attendanceService.fixes
      .list(ctx.id)
      .then((r) => setRows(r.data))
      .catch(() => setRows([]));
  }, [ctx.id]);
  const decide = async (f, status) => {
    setBusy(f._id);
    try {
      await attendanceService.fixes.decide(ctx.id, f._id, status, notes[f._id] || "");
      setRows((list) => list.filter((x) => x._id !== f._id));
      onChange?.();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  if (!rows || !rows.length) return null;
  const asked = (d) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(d));
  return (
    <section className="panel-card">
      <h3 className="at-h3">
        <PencilLine size={17} /> {t.fixTitle} <span className="rs-badge">{rows.length}</span>
      </h3>
      <p className="rs-muted" style={{ margin: "0 0 10px" }}>
        {t.fixSub}
      </p>
      <ul className="at-review">
        {rows.map((f) => (
          <li key={f._id}>
            <div className="at-review-top">
              <span className="at-av">{(f.staff?.name || "?").trim().slice(0, 1).toUpperCase()}</span>
              <span className="at-who">
                <b>{f.staff?.name}</b>
                <small>
                  {fmtDay(f.day, lang)} · {f.kind === "in" ? <LogIn size={12} /> : <LogOut size={12} />} {f.kind === "in" ? t.inAt : t.outAt} <b>{f.time}</b>
                </small>
              </span>
              <small className="rs-muted">{t.asked.replace("{date}", asked(f.created_date))}</small>
            </div>
            <div className="at-review-why">
              <span className="at-tag">“{f.reason}”</span>
            </div>
            {!readOnly && (
              <div className="at-review-act">
                <input placeholder={t.notePh} maxLength={300} value={notes[f._id] || ""} onChange={(e) => setNotes({ ...notes, [f._id]: e.target.value })} />
                <button type="button" className="md-btn md-btn-ghost sa-danger-text sa-btn-sm" onClick={() => decide(f, "rejected")} disabled={busy === f._id}>
                  <X size={15} /> {t.reject}
                </button>
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => decide(f, "approved")} disabled={busy === f._id}>
                  <Check size={15} /> {t.approve}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ============================ OVERTIME REQUESTS (in Needs review) ============================
const OT = {
  en: {
    title: "Overtime requests",
    sub: "Staff asking to stay late. With “Only pay approved overtime” on (Payroll → Pay rules), overtime is paid up to the approved time.",
    until: "until {t}",
    approve: "Approve",
    reject: "Reject",
    notePh: "Note (optional)",
  },
  km: {
    title: "សំណើថែមម៉ោង",
    sub: "បុគ្គលិកស្នើនៅធ្វើការយូរ។ ពេលបើក “បង់តែថែមម៉ោងដែលបានយល់ព្រម” (ប្រាក់ខែ → ច្បាប់ប្រាក់ខែ) ថែមម៉ោងបង់ដល់ម៉ោងដែលបានយល់ព្រម។",
    until: "ដល់ម៉ោង {t}",
    approve: "យល់ព្រម",
    reject: "បដិសេធ",
    notePh: "កំណត់ចំណាំ (ស្រេចចិត្ត)",
  },
};
export function OvertimeRequests({ ctx, onChange }) {
  const { lang, readOnly } = ctx;
  const t = OT[lang] || OT.en;
  const [rows, setRows] = useState(null);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState("");
  useEffect(() => {
    attendanceService.overtime
      .list(ctx.id)
      .then((r) => setRows(r.data))
      .catch(() => setRows([]));
  }, [ctx.id]);
  const decide = async (o, status) => {
    setBusy(o._id);
    try {
      await attendanceService.overtime.decide(ctx.id, o._id, status, notes[o._id] || "");
      setRows((list) => list.filter((x) => x._id !== o._id));
      onChange?.();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  if (!rows || !rows.length) return null;
  return (
    <section className="panel-card">
      <h3 className="at-h3">
        <Clock8 size={17} /> {t.title} <span className="rs-badge">{rows.length}</span>
      </h3>
      <p className="rs-muted" style={{ margin: "0 0 10px" }}>
        {t.sub}
      </p>
      <ul className="at-review">
        {rows.map((o) => (
          <li key={o._id}>
            <div className="at-review-top">
              <span className="at-av">{(o.staff?.name || "?").trim().slice(0, 1).toUpperCase()}</span>
              <span className="at-who">
                <b>{o.staff?.name}</b>
                <small>
                  {fmtDay(o.day, lang)} · {t.until.replace("{t}", o.until)}
                </small>
              </span>
            </div>
            <div className="at-review-why">
              <span className="at-tag">“{o.reason}”</span>
            </div>
            {!readOnly && (
              <div className="at-review-act">
                <input placeholder={t.notePh} maxLength={300} value={notes[o._id] || ""} onChange={(e) => setNotes({ ...notes, [o._id]: e.target.value })} />
                <button type="button" className="md-btn md-btn-ghost sa-danger-text sa-btn-sm" onClick={() => decide(o, "rejected")} disabled={busy === o._id}>
                  <X size={15} /> {t.reject}
                </button>
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => decide(o, "approved")} disabled={busy === o._id}>
                  <Check size={15} /> {t.approve}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
