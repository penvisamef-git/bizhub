import { useCallback, useEffect, useState } from "react";
import { Check, Clock, FileText, Loader2, LogIn, LogOut, MapPin, Palmtree, RefreshCw, X as XIcon } from "lucide-react";

// Manager login (att_manager): the team today + an inbox to approve / reject (staff in the manager's branches)
const T = {
  en: {
    tab: "Team",
    today: "Team today",
    inbox: "To approve",
    empty: "Nothing to approve. 👍",
    approve: "Approve",
    reject: "Reject",
    accept: "Accept",
    note: "Note (optional)",
    me: "you",
    done: "Saved.",
    leave: "Leave",
    fix: "Forgot to clock",
    overtime: "Overtime",
    punch: "Record to check",
    fixIn: "Add clock-in {time}",
    fixOut: "Add clock-out {time}",
    until: "Stay until {time}",
    days: "{n} day(s)",
    counts: "{in} in · {late} late · {out} not in",
  },
  km: {
    tab: "ក្រុម",
    today: "ក្រុមថ្ងៃនេះ",
    inbox: "ត្រូវអនុម័ត",
    empty: "គ្មានអ្វីត្រូវអនុម័តទេ។ 👍",
    approve: "យល់ព្រម",
    reject: "បដិសេធ",
    accept: "ទទួលយក",
    note: "កំណត់ចំណាំ (មិនចាំបាច់)",
    me: "អ្នក",
    done: "បានរក្សាទុក។",
    leave: "ច្បាប់ឈប់",
    fix: "ភ្លេចស្កេន",
    overtime: "ម៉ោងបន្ថែម",
    punch: "កំណត់ត្រាត្រូវពិនិត្យ",
    fixIn: "បន្ថែមចុះចូល {time}",
    fixOut: "បន្ថែមចុះចេញ {time}",
    until: "នៅដល់ម៉ោង {time}",
    days: "{n} ថ្ងៃ",
    counts: "មក {in} · យឺត {late} · មិនទាន់មក {out}",
  },
};
export const teamTab = (lang) => (T[lang] || T.en).tab;
const KINDS = ["leave", "fix", "overtime", "punch"];
const ICON = { leave: Palmtree, fix: FileText, overtime: Clock, punch: MapPin };

export default function TeamView({ x, lang, token, call, logout, errText, hhmm, day, initial }) {
  const t = T[lang] || T.en;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState({});
  const [msg, setMsg] = useState("");
  const load = useCallback(
    () =>
      call("/team", { token })
        .then((d) => (setData(d), setError("")))
        .catch((e) => (e.status === 401 ? logout() : setError(errText(e)))),
    [token], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const decide = async (kind, id, approve) => {
    setBusy(`${kind}:${id}`);
    setMsg("");
    try {
      await call(`/team/${kind}/${id}/decide`, { method: "POST", token, body: { approve, note: notes[id] || "" } });
      setMsg(t.done);
      await load();
    } catch (e) {
      if (e.status === 401) return logout();
      setError(errText(e));
      load();
    } finally {
      setBusy("");
    }
  };

  const items = data ? KINDS.flatMap((k) => (data.inbox[k] || []).map((r) => ({ k, r }))) : [];
  const came = data ? data.team.filter((m) => m.first_in).length : 0;
  const late = data ? data.team.filter((m) => m.late_min > 0).length : 0;
  const notIn = data ? data.team.filter((m) => m.status === "not_yet" || m.status === "absent").length : 0;
  const line = ({ k, r }) => {
    if (k === "leave") return `${x.types?.[r.type] || r.type} · ${day(r.from)}${r.to !== r.from ? ` → ${day(r.to)}` : ""} · ${t.days.replace("{n}", r.days)}`;
    if (k === "fix") return `${day(r.day)} · ${(r.kind === "in" ? t.fixIn : t.fixOut).replace("{time}", r.time)}`;
    if (k === "overtime") return `${day(r.day)} · ${t.until.replace("{time}", r.until)}`;
    return `${day(r.day)} · ${r.kind === "in" ? x.in : x.out} ${hhmm(r.at)} · ${(r.flags || []).map((f) => x.flags?.[f] || f).join(", ")}${r.distance_m ? ` (${r.distance_m} m)` : ""}`;
  };

  return (
    <main className="sa-main sa-team">
      {error && <div className="sa-error">{error}</div>}
      {msg && <div className="sa-ok">{msg}</div>}
      <div className="sa-month">
        <b>{t.inbox}</b>
        <button type="button" className="sa-icon" onClick={load} aria-label="refresh">
          <RefreshCw size={15} />
        </button>
      </div>
      {!data ? (
        <p className="sa-note">
          <Loader2 size={16} className="sa-spin" />
        </p>
      ) : !items.length ? (
        <p className="sa-note">{t.empty}</p>
      ) : (
        <ul className="sa-inbox">
          {items.map(({ k, r }) => {
            const Icon = ICON[k];
            const b = busy === `${k}:${r._id}`;
            return (
              <li key={`${k}${r._id}`} className={`k-${k}`}>
                <div className="sa-inbox-top">
                  <span className="sa-inbox-ic">
                    <Icon size={16} />
                  </span>
                  <span className="sa-inbox-who">
                    <b>{r.staff_name}</b>
                    <small>{t[k]}</small>
                  </span>
                  {r.photo_url && <img src={r.photo_url} alt="" className="sa-inbox-photo" />}
                </div>
                <p className="sa-inbox-line">{line({ k, r })}</p>
                {r.reason && <p className="sa-inbox-reason">“{r.reason}”</p>}
                <input className="sa-input" maxLength={300} placeholder={t.note} value={notes[r._id] || ""} onChange={(e) => setNotes({ ...notes, [r._id]: e.target.value })} />
                <div className="sa-two">
                  <button type="button" className="sa-btn ghost" onClick={() => decide(k, r._id, false)} disabled={!!busy}>
                    <XIcon size={16} /> {t.reject}
                  </button>
                  <button type="button" className="sa-btn" onClick={() => decide(k, r._id, true)} disabled={!!busy}>
                    {b ? <Loader2 size={16} className="sa-spin" /> : <Check size={16} />} {k === "punch" ? t.accept : t.approve}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="sa-month">
        <b>{t.today}</b>
        {data && <small className="sa-muted">{t.counts.replace("{in}", came).replace("{late}", late).replace("{out}", notIn)}</small>}
      </div>
      {data && (
        <ul className="sa-days sa-teamlist">
          {data.team.map((m) => (
            <li key={m._id}>
              <span className="sa-team-av">{initial(m.name)}</span>
              <span className="sa-day">
                {m.name}
                {m.me ? ` (${t.me})` : ""}
                {m.position ? <small> · {m.position}</small> : null}
              </span>
              <span className="sa-day-times">
                {m.first_in ? (
                  <>
                    <LogIn size={12} /> {hhmm(m.first_in)}
                  </>
                ) : null}
                {m.last_out ? (
                  <>
                    {" "}
                    <LogOut size={12} /> {hhmm(m.last_out)}
                  </>
                ) : null}
                {m.late_min > 0 ? <em className="sa-late"> {x.late.replace("{m}", `${m.late_min}m`)}</em> : null}
              </span>
              <span className={`sa-st st-${m.status}`}>{x.status?.[m.status] || m.status}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
