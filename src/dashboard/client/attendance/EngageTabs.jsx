import { useCallback, useEffect, useState } from "react";
import { Award, ChevronLeft, ChevronRight, Flame, Megaphone, Pin, PinOff, Save, Send, Trash2, Trophy } from "lucide-react";
import { attendanceService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { Locked } from "./AddonTabs";
import { Field } from "../restaurant/parts";

// Announcements (att_news) and on-time rewards (att_rewards)
const T = {
  en: {
    newsTitle: "Announcements",
    newsSub: "Post news to your staff. It shows in their staff app and you see who has read it.",
    title: "Title",
    titlePh: "e.g. Team dinner on Friday",
    body: "Message",
    bodyPh: "Details, time, place…",
    to: "Send to",
    everyone: "Everyone",
    pinned: "Pin to the top",
    post: "Post",
    posting: "Posting…",
    posted: "Posted. Staff see it in their app.",
    noNews: "No announcements yet.",
    readBy: "Read by {n} of {m}",
    waiting: "Not read yet: {names}",
    allRead: "Everyone has read it.",
    pin: "Pin",
    unpin: "Unpin",
    remove: "Remove",
    sure: "Remove?",
    rwTitle: "On-time rewards",
    rwSub: "Staff earn streaks and badges for coming on time. A month with no late day, no absence and no missing clock-out is a perfect month.",
    bonus: "Bonus for a perfect month",
    bonusHint: "Added to payroll (0 = no bonus).",
    needPayroll: "Needs Payroll to add the bonus.",
    board: "Staff see the team's top 5",
    save: "Save",
    saved: "Saved.",
    rank: "#",
    staff: "Staff",
    rate: "On time",
    days: "Days",
    late: "Late",
    absent: "Absent",
    streak: "Streak",
    perfect: "Perfect",
    noRows: "No work days yet this month.",
    thisMonth: "This month",
  },
  km: {
    newsTitle: "សេចក្តីជូនដំណឹង",
    newsSub: "ផ្សាយដំណឹងទៅបុគ្គលិក។ បង្ហាញក្នុងកម្មវិធីបុគ្គលិក ហើយអ្នកឃើញអ្នកបានអាន។",
    title: "ចំណងជើង",
    titlePh: "ឧ. ញ៉ាំអាហារជុំគ្នាថ្ងៃសុក្រ",
    body: "សារ",
    bodyPh: "ព័ត៌មានលម្អិត ម៉ោង ទីកន្លែង…",
    to: "ផ្ញើទៅ",
    everyone: "ទាំងអស់គ្នា",
    pinned: "ខ្ទាស់នៅខាងលើ",
    post: "ផ្សាយ",
    posting: "កំពុងផ្សាយ…",
    posted: "បានផ្សាយ។ បុគ្គលិកឃើញក្នុងកម្មវិធី។",
    noNews: "មិនទាន់មានសេចក្តីជូនដំណឹង។",
    readBy: "បានអាន {n} ក្នុង {m}",
    waiting: "មិនទាន់អាន៖ {names}",
    allRead: "អ្នករាល់គ្នាបានអានហើយ។",
    pin: "ខ្ទាស់",
    unpin: "ដោះខ្ទាស់",
    remove: "លុប",
    sure: "លុបមែន?",
    rwTitle: "រង្វាន់មកទាន់ម៉ោង",
    rwSub: "បុគ្គលិកទទួលបានស្លាកសញ្ញាពេលមកទាន់ម៉ោងជាប់ៗគ្នា។ ខែដែលមិនយឺត មិនអវត្តមាន មិនភ្លេចចុះចេញ គឺខែល្អឥតខ្ចោះ។",
    bonus: "ប្រាក់រង្វាន់ខែល្អឥតខ្ចោះ",
    bonusHint: "បន្ថែមលើប្រាក់ខែ (0 = គ្មាន)។",
    needPayroll: "ត្រូវការ “បើកប្រាក់ខែ” ដើម្បីបន្ថែមប្រាក់រង្វាន់។",
    board: "បុគ្គលិកឃើញកំពូល 5 នាក់",
    save: "រក្សាទុក",
    saved: "បានរក្សាទុក។",
    rank: "#",
    staff: "បុគ្គលិក",
    rate: "ទាន់ម៉ោង",
    days: "ថ្ងៃ",
    late: "យឺត",
    absent: "អវត្តមាន",
    streak: "ជាប់ៗ",
    perfect: "ល្អឥតខ្ចោះ",
    noRows: "ខែនេះមិនទាន់មានថ្ងៃធ្វើការ។",
    thisMonth: "ខែនេះ",
  },
};
const monthNow = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 7);
const shiftMonth = (month, n) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const when = (d, lang) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(d));

// ============================ ANNOUNCEMENTS ============================
export function NewsTab({ ctx }) {
  const { lang, readOnly, data: biz } = ctx;
  const t = T[lang] || T.en;
  const on = !!biz.addons?.att_news?.active;
  const [data, setData] = useState(null);
  const [f, setF] = useState({ title: "", body: "", pinned: false, branch_ids: [] });
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(null);
  const load = useCallback(
    () =>
      attendanceService.news
        .list(ctx.id)
        .then((r) => setData(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load]);
  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      if (msg) ctx.notify({ type: "success", text: msg });
      await load();
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "att_news" });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const post = (e) => {
    e.preventDefault();
    run(async () => {
      await attendanceService.news.add(ctx.id, f);
      setF({ title: "", body: "", pinned: false, branch_ids: [] });
    }, t.posted);
  };
  const toggleBranch = (id) => setF((x) => ({ ...x, branch_ids: x.branch_ids.includes(id) ? x.branch_ids.filter((b) => b !== id) : [...x.branch_ids, id] }));
  const branchName = (id) => biz.branches.find((b) => String(b._id) === String(id))?.name || "?";

  return (
    <div className="rs-col">
      {!on && <Locked ctx={ctx} addon="att_news" />}
      {on && (
        <section className="panel-card">
          <h2 style={{ margin: 0 }}>
            <Megaphone size={20} /> {t.newsTitle}
          </h2>
          <p className="rs-muted" style={{ margin: "6px 0 12px" }}>
            {t.newsSub}
          </p>
          <form className="md-fields" onSubmit={post}>
            <Field label={t.title} htmlFor="nw-title">
              <input id="nw-title" maxLength={100} placeholder={t.titlePh} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            </Field>
            <Field label={t.body} htmlFor="nw-body">
              <textarea id="nw-body" rows={3} maxLength={2000} placeholder={t.bodyPh} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
            </Field>
            {biz.branches.length > 1 && (
              <Field label={t.to}>
                <div className="at-checks">
                  <label className={f.branch_ids.length === 0 ? "on" : ""}>
                    <input type="checkbox" checked={f.branch_ids.length === 0} onChange={() => setF({ ...f, branch_ids: [] })} /> {t.everyone}
                  </label>
                  {biz.branches.map((b) => (
                    <label key={b._id} className={f.branch_ids.includes(b._id) ? "on" : ""}>
                      <input type="checkbox" checked={f.branch_ids.includes(b._id)} onChange={() => toggleBranch(b._id)} /> {b.name}
                    </label>
                  ))}
                </div>
              </Field>
            )}
            <div className="at-news-row">
              <label className="md-switch">
                <input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} />
                <span className="md-switch-track" />
                <span>{t.pinned}</span>
              </label>
              <button type="submit" className="md-btn md-btn-primary sa-btn-sm" disabled={busy || readOnly || !f.title.trim()}>
                <Send size={14} /> {busy ? t.posting : t.post}
              </button>
            </div>
          </form>
        </section>
      )}
      {!data ? (
        <ListSkeleton rows={3} />
      ) : !data.rows.length ? (
        on && (
          <section className="panel-card rs-empty">
            <p className="rs-muted">{t.noNews}</p>
          </section>
        )
      ) : (
        data.rows.map((n) => {
          const pct = n.total ? Math.round((n.read / n.total) * 100) : 0;
          return (
            <section key={n._id} className={`panel-card at-news ${n.pinned ? "pinned" : ""}`}>
              <div className="at-news-head">
                <b>
                  {n.pinned && <Pin size={14} />} {n.title}
                </b>
                <small className="rs-muted">{when(n.created_date, lang)}</small>
              </div>
              {n.body && <p className="at-news-body">{n.body}</p>}
              <div className="at-news-meta">
                {n.branch_ids?.length > 0 && <span className="rs-pill">{n.branch_ids.map(branchName).join(", ")}</span>}
                <span className="at-news-read">
                  <span className="at-news-bar">
                    <i style={{ width: `${pct}%` }} />
                  </span>
                  {t.readBy.replace("{n}", n.read).replace("{m}", n.total)}
                </span>
                <span className="at-grow" />
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => run(() => attendanceService.news.update(ctx.id, n._id, { pinned: !n.pinned }))} disabled={busy || readOnly || !on}>
                  {n.pinned ? <PinOff size={14} /> : <Pin size={14} />} {n.pinned ? t.unpin : t.pin}
                </button>
                {sure === n._id ? (
                  <button type="button" className="md-btn md-btn-danger sa-btn-sm" onClick={() => run(() => attendanceService.news.remove(ctx.id, n._id))} onBlur={() => setSure(null)} autoFocus>
                    {t.sure}
                  </button>
                ) : (
                  <button type="button" className="md-btn md-btn-ghost sa-danger-text sa-btn-sm" onClick={() => setSure(n._id)} disabled={busy || readOnly}>
                    <Trash2 size={14} /> {t.remove}
                  </button>
                )}
              </div>
              {n.total > 0 && <small className="rs-muted">{n.waiting.length ? t.waiting.replace("{names}", n.waiting.join(", ")) : t.allRead}</small>}
            </section>
          );
        })
      )}
    </div>
  );
}

// ============================ ON-TIME REWARDS ============================
export function RewardsTab({ ctx }) {
  const { lang, readOnly } = ctx;
  const t = T[lang] || T.en;
  const on = !!ctx.data.addons?.att_rewards?.active;
  const [month, setMonth] = useState(monthNow());
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      attendanceService
        .rewards(ctx.id, month)
        .then((r) => {
          setData(r.data);
          setForm((x) => x || { bonus: String(r.data.settings.bonus || 0), board: r.data.settings.board });
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id, month], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load]);
  const save = async () => {
    setBusy(true);
    try {
      await attendanceService.rewardSettings(ctx.id, { bonus: Number(form.bonus) || 0, board: form.board });
      ctx.notify({ type: "success", text: t.saved });
      await load();
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "att_rewards" });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const label = new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
  const changed = data && form && (Number(form.bonus) !== (data.settings.bonus || 0) || form.board !== data.settings.board);
  const rows = (data?.rows || []).filter((r) => r.work);

  return (
    <div className="rs-col">
      {!on && <Locked ctx={ctx} addon="att_rewards" />}
      <section className="panel-card">
        <div className="at-ro-head">
          <h2 style={{ margin: 0 }}>
            <Award size={20} /> {t.rwTitle}
          </h2>
          <div className="at-ro-week">
            <button type="button" className="md-icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="-1">
              <ChevronLeft size={18} />
            </button>
            <b>{month === monthNow() ? t.thisMonth : label}</b>
            <button type="button" className="md-icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthNow()} aria-label="+1">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <p className="rs-muted" style={{ margin: "8px 0 0" }}>
          {t.rwSub}
        </p>
        {on && form && (
          <div className="at-rw-set">
            <div className="md-fields at-rw-bonus">
              <Field label={`${t.bonus} (${data?.currency})`} htmlFor="rw-bonus" hint={data?.payroll ? t.bonusHint : t.needPayroll}>
                <input id="rw-bonus" type="number" min={0} step="any" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} disabled={readOnly} />
              </Field>
            </div>
            <label className="md-switch">
              <input type="checkbox" checked={form.board} onChange={(e) => setForm({ ...form, board: e.target.checked })} disabled={readOnly} />
              <span className="md-switch-track" />
              <span>{t.board}</span>
            </label>
            {changed && (
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={save} disabled={busy || readOnly}>
                <Save size={14} /> {t.save}
              </button>
            )}
          </div>
        )}
      </section>
      {!data ? (
        <ListSkeleton rows={4} />
      ) : !rows.length ? (
        <section className="panel-card rs-empty">
          <p className="rs-muted">{t.noRows}</p>
        </section>
      ) : (
        <section className="panel-card at-rw-card">
          <div className="at-ro-scroll">
            <table className="at-rw">
              <thead>
                <tr>
                  <th>{t.rank}</th>
                  <th>{t.staff}</th>
                  <th>{t.rate}</th>
                  <th>{t.days}</th>
                  <th>{t.late}</th>
                  <th>{t.absent}</th>
                  <th>{t.streak}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.staff_id}>
                    <td>{r.rank <= 3 ? <Trophy size={16} className={`at-rw-cup cup-${r.rank}`} /> : r.rank}</td>
                    <td>
                      <b>{r.name}</b>
                      {r.perfect && <span className="rs-pill ok">{t.perfect}</span>}
                    </td>
                    <td>
                      <span className="at-rw-rate">
                        <span className="at-news-bar">
                          <i style={{ width: `${r.rate}%` }} />
                        </span>
                        {r.rate}%
                      </span>
                    </td>
                    <td>
                      {r.on_time}/{r.work}
                    </td>
                    <td className={r.late ? "warn" : ""}>{r.late}</td>
                    <td className={r.absent ? "bad" : ""}>{r.absent}</td>
                    <td>
                      {r.streak > 0 && (
                        <span className="at-rw-streak">
                          <Flame size={14} /> {r.streak}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
