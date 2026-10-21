import { useCallback, useEffect, useState } from "react";
import { Award, CalendarCheck, Crown, Flame, Loader2, Pin, Star, Trophy } from "lucide-react";

// Staff app: announcements (att_news) + on-time rewards card (att_rewards)
const T = {
  en: {
    news: "News",
    noNews: "No news yet.",
    new: "New",
    rewards: "My rewards",
    streak: "On-time streak",
    days: "{n} days",
    best: "Best: {n}",
    month: "This month",
    onTime: "{a} of {b} days on time",
    perfectSoFar: "Perfect so far — keep it up!",
    bonus: "Perfect month bonus: {amt}",
    rank: "You are #{n} of {m}",
    top: "Team top 5",
    you: "you",
    badges: {
      streak_5: "5 days in a row",
      streak_10: "10 days in a row",
      streak_20: "20 days in a row",
      perfect_month: "Perfect month",
      last_perfect: "Last month perfect",
      top: "Top of the team",
    },
    noBadges: "Come on time to earn badges.",
  },
  km: {
    news: "ដំណឹង",
    noNews: "មិនទាន់មានដំណឹង។",
    new: "ថ្មី",
    rewards: "រង្វាន់របស់ខ្ញុំ",
    streak: "មកទាន់ម៉ោងជាប់ៗ",
    days: "{n} ថ្ងៃ",
    best: "ល្អបំផុត៖ {n}",
    month: "ខែនេះ",
    onTime: "ទាន់ម៉ោង {a} ក្នុង {b} ថ្ងៃ",
    perfectSoFar: "ល្អឥតខ្ចោះរហូតមកដល់ពេលនេះ — បន្តទៀត!",
    bonus: "ប្រាក់រង្វាន់ខែល្អឥតខ្ចោះ៖ {amt}",
    rank: "អ្នកលេខ {n} ក្នុង {m}",
    top: "កំពូល 5 នាក់",
    you: "អ្នក",
    badges: {
      streak_5: "5 ថ្ងៃជាប់ៗ",
      streak_10: "10 ថ្ងៃជាប់ៗ",
      streak_20: "20 ថ្ងៃជាប់ៗ",
      perfect_month: "ខែល្អឥតខ្ចោះ",
      last_perfect: "ខែមុនល្អឥតខ្ចោះ",
      top: "លេខ 1 ក្នុងក្រុម",
    },
    noBadges: "មកទាន់ម៉ោង ដើម្បីទទួលស្លាកសញ្ញា។",
  },
};
export const newsTab = (lang) => (T[lang] || T.en).news;
const BADGE_ICON = { streak_5: Flame, streak_10: Flame, streak_20: Flame, perfect_month: Star, last_perfect: CalendarCheck, top: Crown };
const money = (v, cur) => (cur === "KHR" ? `${Math.round(v).toLocaleString("en-US")}៛` : `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);

export function NewsView({ lang, token, call, logout, errText, onRead }) {
  const t = T[lang] || T.en;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const load = useCallback(
    () =>
      call("/news", { token })
        .then(setData)
        .catch((e) => (e.status === 401 ? logout() : setError(errText(e)))),
    [token], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load]);
  const tap = async (n) => {
    setOpen(open === n._id ? null : n._id);
    if (n.read) return;
    try {
      const d = await call(`/news/${n._id}/read`, { method: "POST", token });
      setData(d);
      onRead?.(d.unread);
    } catch {
      /* try again next time */
    }
  };
  const when = (d) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(d));
  return (
    <main className="sa-main">
      {error && <div className="sa-error">{error}</div>}
      {!data ? (
        <Loader2 size={26} className="sa-spin sa-mid" />
      ) : !data.rows.length ? (
        <p className="sa-note">{t.noNews}</p>
      ) : (
        <ul className="sa-news">
          {data.rows.map((n) => (
            <li key={n._id} className={`${n.read ? "" : "unread"} ${open === n._id ? "open" : ""}`}>
              <button type="button" onClick={() => tap(n)}>
                <span className="sa-news-top">
                  <b>
                    {n.pinned && <Pin size={13} />} {n.title}
                  </b>
                  {!n.read && <em>{t.new}</em>}
                </span>
                <small>{when(n.created_date)}</small>
                {n.body && <p>{n.body}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export function RewardsCard({ lang, token, call, logout }) {
  const t = T[lang] || T.en;
  const [d, setD] = useState(null);
  useEffect(() => {
    call("/rewards", { token })
      .then(setD)
      .catch((e) => e.status === 401 && logout());
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return null;
  return (
    <section className="sa-rw">
      <div className="sa-rw-head">
        <Award size={18} /> <b>{t.rewards}</b>
        {d.rank && <small>{t.rank.replace("{n}", d.rank).replace("{m}", d.team_size)}</small>}
      </div>
      <div className="sa-rw-stats">
        <div className="sa-rw-streak">
          <Flame size={26} />
          <span>
            <b>{t.days.replace("{n}", d.streak)}</b>
            <small>{t.streak}</small>
            <small>{t.best.replace("{n}", d.best)}</small>
          </span>
        </div>
        <div className="sa-rw-month">
          <small>{t.month}</small>
          <b>{d.month.rate}%</b>
          <small>{t.onTime.replace("{a}", d.month.on_time).replace("{b}", d.month.work)}</small>
        </div>
      </div>
      {d.month.perfect && <p className="sa-rw-perfect">⭐ {t.perfectSoFar}</p>}
      {d.bonus > 0 && <p className="sa-rw-bonus">🏆 {t.bonus.replace("{amt}", money(d.bonus, d.currency))}</p>}
      <div className="sa-rw-badges">
        {d.badges.length ? (
          d.badges.map((k) => {
            const I = BADGE_ICON[k] || Star;
            return (
              <span key={k} className={`b-${k}`}>
                <I size={14} /> {t.badges[k]}
              </span>
            );
          })
        ) : (
          <small>{t.noBadges}</small>
        )}
      </div>
      {d.board?.length > 0 && (
        <div className="sa-rw-board">
          <small>{t.top}</small>
          <ol>
            {d.board.map((r) => (
              <li key={r.rank} className={r.me ? "me" : ""}>
                {r.rank === 1 ? <Trophy size={14} /> : <span className="n">{r.rank}</span>}
                <span className="nm">
                  {r.name}
                  {r.me ? ` (${t.you})` : ""}
                </span>
                <b>{r.rate}%</b>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
