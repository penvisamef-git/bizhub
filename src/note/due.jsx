import { useEffect, useRef, useState } from "react";
import { CalendarClock, Check, UserRound, X } from "lucide-react";

// Checklist items: a due date ("YYYY-MM-DD" or "YYYY-MM-DDTHH:mm", Cambodia time) + who does it (a name).
// Free for everyone. Reminders on Telegram come with the "Telegram alerts" add-on.
const TZ = 7 * 3600000;
const pad = (n) => String(n).padStart(2, "0");
// today in Cambodia (UTC+7), as YYYY-MM-DD
export const todayKh = (now = Date.now()) => {
  const d = new Date(now + TZ);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
export const cleanDue = (v) => {
  const s = String(v || "").trim();
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(s) ? s : "";
};
// the moment it is due (a day without a time = the end of that day)
const dueAt = (due) => {
  const [day, time] = due.split("T");
  const [y, mo, d] = day.split("-").map(Number);
  const [h, mi] = time ? time.split(":").map(Number) : [23, 59];
  return Date.UTC(y, mo - 1, d, h, mi) - TZ;
};
// late | today | soon (within 7 days) | later
export function dueState(due, done, now = Date.now()) {
  const v = cleanDue(due);
  if (!v || done) return "";
  const day = v.slice(0, 10);
  const today = todayKh(now);
  if (dueAt(v) < now) return "late";
  if (day === today) return "today";
  return dueAt(v) - now < 7 * 86400000 ? "soon" : "later";
}
// "Today · 14:00" / "Tomorrow" / "Fri 24 Oct"
export function dueText(due, m, lang = "en", now = Date.now()) {
  const v = cleanDue(due);
  if (!v) return "";
  const [day, time] = v.split("T");
  const today = todayKh(now);
  const tomorrow = todayKh(now + 86400000);
  const yesterday = todayKh(now - 86400000);
  let words;
  if (day === today) words = m.dueToday;
  else if (day === tomorrow) words = m.dueTomorrow;
  else if (day === yesterday) words = m.dueYesterday;
  else {
    const [y, mo, d] = day.split("-").map(Number);
    const date = new Date(Date.UTC(y, mo - 1, d, 5));
    const sameYear = day.slice(0, 4) === today.slice(0, 4);
    words = new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" }).format(date);
  }
  return time ? `${words} · ${time}` : words;
}

// the small line under a checklist item: 📅 Friday · 👤 Dara (a button in the editor)
export function DueLine({ b, m, lang, onClick, compact }) {
  const due = cleanDue(b.due);
  const who = String(b.who || "").trim();
  if (!due && !who) return null;
  const st = dueState(due, b.done);
  const Tag = onClick ? "button" : "span";
  return (
    <Tag type={onClick ? "button" : undefined} className={`nb-due ${st ? `s-${st}` : ""} ${compact ? "compact" : ""}`} onClick={onClick} onMouseDown={onClick ? (e) => e.preventDefault() : undefined} data-testid="nb-due">
      {due && (
        <span className="nb-due-when">
          <CalendarClock size={12} /> {st === "late" ? `${m.dueLate} · ` : ""}
          {dueText(due, m, lang)}
        </span>
      )}
      {who && (
        <span className="nb-due-who">
          <UserRound size={12} /> {who}
        </span>
      )}
    </Tag>
  );
}

// the little window: date, time (optional), who
export function DuePop({ b, m, names = [], onSave, onClose }) {
  const due = cleanDue(b.due);
  const [day, setDay] = useState(due.slice(0, 10));
  const [time, setTime] = useState(due.length > 10 ? due.slice(11) : "");
  const [who, setWho] = useState(b.who || "");
  const ref = useRef(null);
  useEffect(() => {
    const off = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    const esc = (e) => e.key === "Escape" && onClose();
    const t = setTimeout(() => document.addEventListener("mousedown", off), 0);
    document.addEventListener("keydown", esc);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  const done = () => {
    onSave({ due: day ? (time ? `${day}T${time}` : day) : "", who: who.trim().slice(0, 60) });
    onClose();
  };
  const listId = `nb-who-${b.id}`;
  const quick = [
    [m.dueToday, todayKh()],
    [m.dueTomorrow, todayKh(Date.now() + 86400000)],
    [m.dueNextWeek, todayKh(Date.now() + 7 * 86400000)],
  ];
  return (
    <div className="nb-duepop" ref={ref} role="dialog" aria-label={m.dueTitle} data-testid="nb-duepop">
      <div className="nb-duepop-head">
        <b>
          <CalendarClock size={15} /> {m.dueTitle}
        </b>
        <button type="button" className="nb-x" onClick={onClose} aria-label={m.close || "Close"}>
          <X size={15} />
        </button>
      </div>
      <div className="nb-duepop-quick">
        {quick.map(([label, v]) => (
          <button key={label} type="button" className={day === v ? "on" : ""} onClick={() => setDay(v)}>
            {label}
          </button>
        ))}
      </div>
      <label>
        <span>{m.dueDate}</span>
        <input className="nb-din" type="date" value={day} onChange={(e) => setDay(e.target.value)} data-testid="nb-due-day" />
      </label>
      <label>
        <span>{m.dueTime}</span>
        <input className="nb-din" type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!day} />
      </label>
      <label>
        <span>{m.dueWho}</span>
        <input className="nb-din" value={who} onChange={(e) => setWho(e.target.value)} maxLength={60} placeholder={m.dueWhoPh} list={listId} data-testid="nb-due-who" />
        <datalist id={listId}>
          {[...new Set(names.filter(Boolean))].slice(0, 30).map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </label>
      <div className="nb-duepop-acts">
        {(due || b.who) && (
          <button
            type="button"
            className="nb-dbtn ghost"
            onClick={() => {
              onSave({ due: "", who: "" });
              onClose();
            }}
          >
            {m.dueClear}
          </button>
        )}
        <button type="button" className="nb-dbtn" onClick={done} data-testid="nb-due-save">
          <Check size={14} /> {m.dueDone}
        </button>
      </div>
      <small className="nb-duepop-hint">{m.dueHint}</small>
    </div>
  );
}
