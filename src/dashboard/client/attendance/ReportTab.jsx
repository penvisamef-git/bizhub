import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { attendanceService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { dur, hhmm, todayKH } from "./text";

const shiftMonth = (month, n) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const monthName = (month, lang) => {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
};
const weekdayOf = (day) => new Date(`${day}T00:00:00Z`).getUTCDay();
// one calendar cell's colour
const cellKind = (d) => {
  if (d.pending) return "pending";
  if (d.status === "missing_out") return "missing_out";
  if (d.status === "absent") return "absent";
  if (d.status === "extra") return "extra";
  if (d.status === "leave") return "leave";
  if (d.status === "holiday") return "holiday";
  if (["present", "working"].includes(d.status)) return d.late_min ? "late" : "present";
  if (d.status === "off") return "off";
  return "none";
};

// Monthly report: a calendar (staff × days, coloured) + totals per staff + Excel (CSV) download
export default function ReportTab({ ctx }) {
  const { a, lang } = ctx;
  const [month, setMonth] = useState(todayKH().slice(0, 7));
  const [rep, setRep] = useState(null);
  const [view, setView] = useState("calendar");
  const [exporting, setExporting] = useState(false);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    let alive = true;
    setRep(null);
    attendanceService
      .report(ctx.id, month)
      .then((res) => alive && setRep(res.data))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
    return () => {
      alive = false;
    };
  }, [ctx.id, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = async () => {
    setExporting(true);
    try {
      await attendanceService.csv(ctx.id, month, lang);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setExporting(false);
    }
  };
  const thisMonth = todayKH().slice(0, 7);

  return (
    <div className="rs-col">
      <section className="panel-card at-dayhead">
        <div className="at-daynav">
          <button type="button" className="md-icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="-1">
            <ChevronLeft size={18} />
          </button>
          <b className="at-month">{monthName(month, lang)}</b>
          <button type="button" className="md-icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth} aria-label="+1">
            <ChevronRight size={18} />
          </button>
          <span className="at-grow" />
          <div className="at-seg small">
            {["calendar", "summary"].map((k) => (
              <button key={k} type="button" className={view === k ? "on" : ""} onClick={() => setView(k)}>
                {a[k]}
              </button>
            ))}
          </div>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={exportCsv} disabled={exporting || !rep?.rows.length}>
            {exporting ? <Loader2 size={15} className="md-spin" /> : <Download size={15} />} {exporting ? a.exporting : a.exportCsv}
          </button>
        </div>
      </section>

      {!rep && <ListSkeleton rows={4} />}
      {rep && rep.rows.length === 0 && (
        <section className="panel-card rs-empty">
          <p>{a.noReport}</p>
        </section>
      )}

      {rep && rep.rows.length > 0 && view === "calendar" && (
        <section className="panel-card at-cal-card">
          <div className="at-cal-scroll">
            <table className="at-cal">
              <thead>
                <tr>
                  <th className="at-cal-name">{a.col.name}</th>
                  {rep.days.map((d) => (
                    <th key={d} className={weekdayOf(d) === 0 ? "sun" : ""}>
                      <small>{a.dayShort[weekdayOf(d)]}</small>
                      {Number(d.slice(8))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rep.rows.map((r) => (
                  <tr key={r.staff._id}>
                    <th className="at-cal-name">
                      <b>{r.staff.name}</b>
                      <small>
                        {r.totals.present}/{r.totals.work_days}
                      </small>
                    </th>
                    {r.days.map((d) => {
                      const kind = cellKind(d);
                      const title = `${d.day} · ${a.status[d.status]}${d.first_in ? ` · ${hhmm(d.first_in)}–${hhmm(d.last_out) || "?"}` : ""}${d.late_min ? ` · ${a.lateBy.replace("{m}", dur(d.late_min))}` : ""}${d.ot_min ? ` · ${a.otBy.replace("{m}", dur(d.ot_min))}` : ""}`;
                      return (
                        <td key={d.day}>
                          <button type="button" className={`at-cell c-${kind}`} title={title} aria-label={title} onClick={() => setTip(tip?.key === `${r.staff._id}${d.day}` ? null : { key: `${r.staff._id}${d.day}`, name: r.staff.name, title })} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tip && (
            <p className="at-tip">
              <b>{tip.name}</b> · {tip.title}
            </p>
          )}
          <div className="at-legend">
            {["present", "late", "absent", "missing_out", "extra", "leave", "holiday", "off", "pending"].map((k) => (
              <span key={k}>
                <i className={`at-cell c-${k}`} /> {a.legend[k]}
              </span>
            ))}
          </div>
        </section>
      )}

      {rep && rep.rows.length > 0 && view === "summary" && (
        <section className="panel-card at-cal-card">
          <div className="at-cal-scroll">
            <table className="at-sum">
              <thead>
                <tr>
                  {["name", "work_days", "present", "late", "late_min", "early", "absent", "leave", "missing_out", "extra", "ot_min", "worked_min"].map((k) => (
                    <th key={k}>{a.col[k]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rep.rows.map((r) => {
                  const t = r.totals;
                  return (
                    <tr key={r.staff._id}>
                      <th>
                        <b>{r.staff.name}</b>
                        {r.staff.position && <small>{r.staff.position}</small>}
                      </th>
                      <td>{t.work_days}</td>
                      <td className="ok">{t.present}</td>
                      <td className={t.late ? "warn" : ""}>{t.late}</td>
                      <td className={t.late_min ? "warn" : ""}>{t.late_min ? dur(t.late_min) : "—"}</td>
                      <td className={t.early ? "warn" : ""}>{t.early}</td>
                      <td className={t.absent ? "bad" : ""}>{t.absent}</td>
                      <td>{t.leave || 0}</td>
                      <td className={t.missing_out ? "bad" : ""}>{t.missing_out}</td>
                      <td>{t.extra}</td>
                      <td className={t.ot_min ? "blue" : ""}>{t.ot_min ? dur(t.ot_min) : "—"}</td>
                      <td>
                        <b>{dur(t.worked_min)}</b>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
