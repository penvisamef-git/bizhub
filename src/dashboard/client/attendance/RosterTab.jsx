import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Copy, Eraser, RotateCcw, Save } from "lucide-react";
import { attendanceService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { Locked } from "./AddonTabs";

const T = {
  en: {
    title: "Weekly roster",
    sub: "Choose each person's shift day by day, or give a day off. Days you leave on “Usual” keep their normal shift. Staff see their week under “My schedule”.",
    usual: "Usual",
    usualOf: "Usual · {name}",
    off: "Day off",
    save: "Save roster",
    saving: "Saving…",
    undo: "Undo",
    copyPrev: "Copy last week",
    clear: "Back to usual",
    changed: "{n} changes",
    saved: "Roster saved.",
    copied: "Last week copied.",
    cleared: "This week is back to usual shifts.",
    noStaff: "Add staff first.",
    noShifts: "Add shifts first (Setup → Shifts).",
    holiday: "Holiday",
    week: "Week of {date}",
    thisWeek: "This week",
    legend: "Shifts",
  },
  km: {
    title: "តារាងវេនប្រចាំសប្តាហ៍",
    sub: "ជ្រើសវេនរបស់បុគ្គលិកម្នាក់ៗតាមថ្ងៃ ឬឱ្យឈប់។ ថ្ងៃដែលទុក “ធម្មតា” រក្សាវេនធម្មតា។ បុគ្គលិកមើលសប្តាហ៍របស់គេនៅ “កាលវិភាគខ្ញុំ”។",
    usual: "ធម្មតា",
    usualOf: "ធម្មតា · {name}",
    off: "ថ្ងៃឈប់",
    save: "រក្សាទុកតារាងវេន",
    saving: "កំពុងរក្សាទុក…",
    undo: "មិនយក",
    copyPrev: "ចម្លងសប្តាហ៍មុន",
    clear: "ត្រឡប់ទៅធម្មតា",
    changed: "កែ {n}",
    saved: "បានរក្សាទុកតារាងវេន។",
    copied: "បានចម្លងសប្តាហ៍មុន។",
    cleared: "សប្តាហ៍នេះត្រឡប់ទៅវេនធម្មតា។",
    noStaff: "សូមបន្ថែមបុគ្គលិកជាមុនសិន។",
    noShifts: "សូមបន្ថែមវេនជាមុនសិន (រៀបចំ → វេនការងារ)។",
    holiday: "ថ្ងៃឈប់សម្រាក",
    week: "សប្តាហ៍ {date}",
    thisWeek: "សប្តាហ៍នេះ",
    legend: "វេន",
  },
};
const todayKH = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const addDays = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const weekday = (day) => new Date(`${day}T00:00:00Z`).getUTCDay();
const mondayOf = (day) => addDays(day, -((weekday(day) + 6) % 7));
const fmt = (day, lang, opts) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { ...opts, timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

// Weekly roster (att_roster): staff × 7 days, pick a shift or a day off
export default function RosterTab({ ctx }) {
  const { lang, readOnly } = ctx;
  const t = T[lang] || T.en;
  const on = !!ctx.data.addons?.att_roster?.active;
  const [from, setFrom] = useState(() => mondayOf(todayKH()));
  const [data, setData] = useState(null);
  const [edits, setEdits] = useState({}); // "staff|day" → shift id | "off" | "default"
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      attendanceService.roster
        .get(ctx.id, from)
        .then((r) => {
          setData(r.data);
          setEdits({});
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id, from], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const saved = useMemo(() => {
    const m = {};
    for (const e of data?.entries || []) m[`${e.staff_id}|${e.day}`] = e.shift_id ? String(e.shift_id) : "off";
    return m;
  }, [data]);
  const shiftOf = useMemo(() => Object.fromEntries((data?.shifts || []).map((s) => [String(s._id), s])), [data]);
  const valueOf = (sid, day) => {
    const k = `${sid}|${day}`;
    if (edits[k] !== undefined) return edits[k];
    return saved[k] ?? "default";
  };
  const changes = Object.entries(edits).filter(([k, v]) => (saved[k] ?? "default") !== v);

  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      ctx.notify({ type: "success", text: msg });
      await load();
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "att_roster" });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    run(
      () =>
        attendanceService.roster.save(
          ctx.id,
          changes.map(([k, v]) => {
            const [staff_id, day] = k.split("|");
            return { staff_id, day, shift: v };
          }),
        ),
      t.saved,
    );

  const isThisWeek = from === mondayOf(todayKH());
  return (
    <div className="rs-col">
      {!on && <Locked ctx={ctx} addon="att_roster" />}
      <section className="panel-card">
        <div className="at-ro-head">
          <h2 style={{ margin: 0 }}>
            <CalendarRange size={20} /> {t.title}
          </h2>
          <div className="at-ro-week">
            <button type="button" className="md-icon-btn" onClick={() => setFrom(addDays(from, -7))} aria-label="-7">
              <ChevronLeft size={18} />
            </button>
            <b>{isThisWeek ? t.thisWeek : t.week.replace("{date}", fmt(from, lang, { day: "numeric", month: "short" }))}</b>
            <button type="button" className="md-icon-btn" onClick={() => setFrom(addDays(from, 7))} aria-label="+7">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <p className="rs-muted" style={{ margin: "8px 0 0" }}>
          {t.sub}
        </p>
        {on && !readOnly && (
          <div className="at-ro-tools">
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => run(() => attendanceService.roster.copy(ctx.id, addDays(from, -7), from), t.copied)} disabled={busy}>
              <Copy size={14} /> {t.copyPrev}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => run(() => attendanceService.roster.clear(ctx.id, from), t.cleared)} disabled={busy}>
              <Eraser size={14} /> {t.clear}
            </button>
          </div>
        )}
      </section>

      {!data ? (
        <ListSkeleton rows={4} />
      ) : !data.staff.length ? (
        <section className="panel-card rs-empty">
          <p className="rs-muted">{t.noStaff}</p>
        </section>
      ) : !data.shifts.length ? (
        <section className="panel-card rs-empty">
          <p className="rs-muted">{t.noShifts}</p>
        </section>
      ) : (
        <section className="panel-card at-ro-card">
          <div className="at-ro-scroll">
            <table className="at-ro">
              <thead>
                <tr>
                  <th />
                  {data.days.map((d) => (
                    <th key={d} className={`${d === todayKH() ? "today" : ""} ${data.holidays[d] ? "hol" : ""}`} title={data.holidays[d] || ""}>
                      <small>{fmt(d, lang, { weekday: "short" })}</small>
                      <b>{Number(d.slice(8))}</b>
                      {data.holidays[d] && <em>{t.holiday}</em>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.staff.map((s) => {
                  const usual = s.shift_id ? shiftOf[String(s.shift_id)] : null;
                  return (
                    <tr key={s._id}>
                      <th>
                        <b>{s.name}</b>
                        <small>{usual ? `${usual.name} ${usual.start}–${usual.end}` : "—"}</small>
                      </th>
                      {data.days.map((d) => {
                        const v = valueOf(s._id, d);
                        const sh = v === "default" ? (usual && usual.days.includes(weekday(d)) ? usual : null) : v === "off" ? null : shiftOf[v];
                        const changed = edits[`${s._id}|${d}`] !== undefined && (saved[`${s._id}|${d}`] ?? "default") !== v;
                        return (
                          <td key={d}>
                            <label className={`at-ro-cell ${v === "default" ? "usual" : ""} ${sh ? "" : "off"} ${changed ? "changed" : ""}`} style={sh ? { "--c": sh.color || "#2563EB" } : undefined}>
                              <span className="at-ro-name">{sh ? sh.name : t.off}</span>
                              <span className="at-ro-time">{sh ? `${sh.start}–${sh.end}` : v === "default" ? t.usual : ""}</span>
                              <select value={v} onChange={(e) => setEdits({ ...edits, [`${s._id}|${d}`]: e.target.value })} disabled={readOnly || !on}>
                                <option value="default">{usual ? t.usualOf.replace("{name}", usual.days.includes(weekday(d)) ? usual.name : t.off) : t.usual}</option>
                                <option value="off">{t.off}</option>
                                {data.shifts
                                  .filter((x) => x.active !== false)
                                  .map((x) => (
                                    <option key={x._id} value={String(x._id)}>
                                      {x.name} {x.start}–{x.end}
                                    </option>
                                  ))}
                              </select>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="at-ro-legend">
            <small>{t.legend}:</small>
            {data.shifts.map((x) => (
              <span key={x._id} style={{ "--c": x.color || "#2563EB" }}>
                <i /> {x.name} {x.start}–{x.end}
              </span>
            ))}
          </div>
          {changes.length > 0 && (
            <div className="at-save-row">
              <span className="rs-muted">{t.changed.replace("{n}", changes.length)}</span>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setEdits({})} disabled={busy}>
                <RotateCcw size={14} /> {t.undo}
              </button>
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={save} disabled={busy || readOnly}>
                <Save size={14} /> {busy ? t.saving : t.save}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
