import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../../i18n/I18nProvider";
import { adminBiziService, searchService } from "../../api/services";
import BiziFace from "./BiziFace";
import { biziText } from "./text";
import "./bizi.css";

// the search box downloads the first time it opens (the bubble itself is tiny)
const BiziSearch = lazy(() => import("./BiziSearch"));
const TIP_KEY = "bizi_tip_seen";
const DAY_KEY = "bizi_brief_day"; // the Cambodia day the morning summary was shown
const WEEK_KEY = "bizi_week_seen"; // the Monday of the last weekly report shown
const khDay = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const khHour = () => new Date(Date.now() + 7 * 3600e3).getUTCHours();
const fmtMoney = (v, cur) => (cur === "KHR" ? `${new Intl.NumberFormat("en-US").format(Math.round(Number(v) || 0))}៛` : `$${(Number(v) || 0).toFixed(2)}`);
const POLL = 60000;
const POS_KEY = "bizi_pos"; // where the person put Bizi: { x, y } as parts of the window (0–1), so it survives a resize
const SIZE = 64;
const EDGE = 8;

const readPos = () => {
  try {
    const v = JSON.parse(localStorage.getItem(POS_KEY) || "null");
    return v && Number.isFinite(v.x) && Number.isFinite(v.y) ? v : null;
  } catch {
    return null;
  }
};
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
// the bubble's top-left corner in px, inside the window
const toPx = (p) => ({ left: clamp(p.x * window.innerWidth, EDGE, window.innerWidth - SIZE - EDGE), top: clamp(p.y * window.innerHeight, EDGE, window.innerHeight - SIZE - EDGE) });

// Bizi (v3.0.0): the helper in the corner of every owner page. Tap it, or press ⌘K / Ctrl K anywhere, to search
// everything in all my businesses. Hold and drag it anywhere on the screen (it stays there next time); the first
// time, a small "Ask me anything" note says what it is.
// Layer 1 (no AI): every minute it reads GET /api/user/bizi/brief — worried + a red dot when something waits
// (new orders, guests past check-out, payments to check, sold out…), happy for a moment when a new sale / order
// comes in, and once a day a short summary (yesterday's money, this week vs last week, what needs you).
export default function Bizi({ admin = false }) {
  const { lang } = useI18n();
  const x = biziText(lang);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(readPos);
  const [, setTick] = useState(0); // re-place on a window resize
  const [dragging, setDragging] = useState(false);
  const [brief, setBrief] = useState(null);
  const [note, setNote] = useState(null); // { kind: "sale" | "day", lines }
  const [happy, setHappy] = useState(false);
  const pulse = useRef(null);
  const drag = useRef(null); // { id, sx, sy, left, top, moved }
  const [tip, setTip] = useState(() => {
    try {
      return !localStorage.getItem(TIP_KEY);
    } catch {
      return false;
    }
  });
  const hideTip = useCallback(() => {
    setTip(false);
    try {
      localStorage.setItem(TIP_KEY, "1");
    } catch {
      /* private window */
    }
  }, []);
  const show = useCallback(() => {
    hideTip();
    setNote(null);
    setOpen(true);
  }, [hideTip]);

  // ⌘K (Mac) / Ctrl K (Windows) anywhere
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        hideTip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hideTip]);
  useEffect(() => {
    const on = () => setTick((n) => n + 1);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  // the tip goes by itself after a while
  useEffect(() => {
    if (!tip) return undefined;
    const t = setTimeout(hideTip, 12000);
    return () => clearTimeout(t);
  }, [tip, hideTip]);
  // a new page closes the box
  useEffect(() => setOpen(false), [location.pathname, location.search]);

  // the brief: now, every minute while the page is in front, and when it comes back (and after Bizi settings change)
  const live = useRef(true);
  const load = useCallback(() => {
    if (document.visibilityState === "hidden") return;
    (admin ? adminBiziService : searchService)
      .brief()
      .then((r) => live.current && setBrief(r.data || null))
      .catch(() => {});
  }, [admin]);
  useEffect(() => {
    live.current = true;
    load();
    const t = setInterval(load, POLL);
    document.addEventListener("visibilitychange", load);
    return () => {
      live.current = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", load);
    };
  }, [load]);
  // a new sale / order since the last look → happy for a moment
  useEffect(() => {
    if (!brief) return undefined;
    const before = pulse.current;
    pulse.current = brief.pulse;
    if (before === null || brief.pulse <= before) return undefined;
    setHappy(true);
    setNote({ kind: "sale", lines: [x.newSale] });
    const tm = setTimeout(() => {
      setHappy(false);
      setNote((n) => (n?.kind === "sale" ? null : n));
    }, 6000);
    return () => clearTimeout(tm);
  }, [brief]); // eslint-disable-line react-hooks/exhaustive-deps
  // once a week (the first look in a new week): last week's report — instead of that day's summary
  useEffect(() => {
    const wk = brief?.weekly;
    if (!wk?.week) return undefined;
    let seen = "";
    try {
      seen = localStorage.getItem(WEEK_KEY) || "";
    } catch {
      /* private window */
    }
    if (seen === wk.week) return undefined;
    const pct = wk.change_pct;
    const lines = [x.weekHead, fmtMoney(wk.total, wk.currency) + (pct !== null && pct !== undefined ? ` · ${x.weekChange.replace("{pct}", `${pct > 0 ? "+" : ""}${pct}%`)}` : "")];
    if (wk.best_day) {
      const d = new Date(`${wk.best_day.day}T00:00:00Z`);
      lines.push(x.weekBest.replace("{day}", `${x.days?.[(d.getUTCDay() + 6) % 7] || ""} ${d.getUTCDate()}`).replace("{money}", fmtMoney(wk.best_day.sales, wk.currency)));
    }
    if (wk.top?.[0]) lines.push(x.weekTop.replace("{name}", wk.top[0].name).replace("{qty}", wk.top[0].qty));
    if (wk.down?.[0]) lines.push(x.weekDown.replace("{name}", wk.down[0].name).replace("{pct}", `${wk.down[0].change_pct}%`));
    else if (wk.up?.[0]) lines.push(x.weekUp.replace("{name}", wk.up[0].name).replace("{pct}", `+${wk.up[0].change_pct}%`));
    setTip(false);
    setNote({ kind: "day", lines });
    try {
      localStorage.setItem(WEEK_KEY, wk.week);
      localStorage.setItem(DAY_KEY, khDay()); // the week's report is that day's summary
      localStorage.setItem(TIP_KEY, "1");
    } catch {
      /* private window */
    }
    const tm = setTimeout(() => setNote((v) => (v?.kind === "day" ? null : v)), 20000);
    return () => clearTimeout(tm);
  }, [brief]); // eslint-disable-line react-hooks/exhaustive-deps
  // once a day: the summary
  useEffect(() => {
    if (!brief) return;
    let seen = "";
    let week = "";
    try {
      seen = localStorage.getItem(DAY_KEY) || "";
      week = localStorage.getItem(WEEK_KEY) || "";
    } catch {
      /* private window */
    }
    if (seen === khDay()) return;
    if (brief.weekly?.week && week !== brief.weekly.week) return; // the weekly report goes first
    const s = brief.summary || {};
    const h = khHour();
    const warn = (brief.alerts || []).filter((a) => a.level === "warn").length;
    const lines = [x.hello[h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"]];
    if (admin) {
      // the BizHub team: today's new customers / businesses, coins sold
      lines.push(x.adminToday.replace("{c}", s.new_customers || 0).replace("{b}", s.new_businesses || 0));
      if (s.sold_usd > 0) lines.push(x.adminSold.replace("{money}", fmtMoney(s.sold_usd, "USD")));
    } else if (s.yesterday > 0) lines.push(x.yesterday.replace("{money}", fmtMoney(s.yesterday, s.currency)));
    else if (s.today > 0) lines.push(x.todaySoFar.replace("{money}", fmtMoney(s.today, s.currency)));
    if (s.change_pct !== null && s.change_pct !== undefined) lines.push(x.week.replace("{pct}", `${s.change_pct > 0 ? "+" : ""}${s.change_pct}%`));
    const n = (brief.alerts || []).length;
    lines.push(n === 1 && x.needYou1 ? x.needYou1 : n ? x.needYou.replace("{n}", n) : x.allGood);
    setTip(false);
    setNote({ kind: "day", lines, warn });
    try {
      localStorage.setItem(DAY_KEY, khDay());
      localStorage.setItem(TIP_KEY, "1");
    } catch {
      /* private window */
    }
    const tm = setTimeout(() => setNote((v) => (v?.kind === "day" ? null : v)), 15000);
    return () => clearTimeout(tm);
  }, [brief]); // eslint-disable-line react-hooks/exhaustive-deps

  // hold + move = drag (a small move still counts as a tap)
  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, left: r.left, top: r.top, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      hideTip();
    }
    const left = clamp(d.left + dx, EDGE, window.innerWidth - SIZE - EDGE);
    const top = clamp(d.top + dy, EDGE, window.innerHeight - SIZE - EDGE);
    setPos({ x: left / window.innerWidth, y: top / window.innerHeight });
  };
  const onUp = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (!d.moved) return show();
    setPos((p) => {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(p));
      } catch {
        /* private window */
      }
      return p;
    });
  };
  // keyboard: Enter / Space opens; arrows move it a little (Shift = more); Home puts it back in the corner
  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      return show();
    }
    const step = e.shiftKey ? 80 : 20;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (e.key === "Home") {
      e.preventDefault();
      setPos(null);
      try {
        localStorage.removeItem(POS_KEY);
      } catch {
        /* private window */
      }
      return;
    }
    if (!moves[e.key]) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const left = clamp(r.left + moves[e.key][0], EDGE, window.innerWidth - SIZE - EDGE);
    const top = clamp(r.top + moves[e.key][1], EDGE, window.innerHeight - SIZE - EDGE);
    const p = { x: left / window.innerWidth, y: top / window.innerHeight };
    setPos(p);
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch {
      /* private window */
    }
  };

  const warnN = (brief?.alerts || []).filter((a) => a.level === "warn").length;
  const px = pos ? toPx(pos) : null;
  // the note sits on the side with more room
  const tipLeft = px && px.left > window.innerWidth / 2;
  const tipStyle = px ? { position: "fixed", top: px.top + SIZE / 2, ...(tipLeft ? { right: window.innerWidth - px.left + 10 } : { left: px.left + SIZE + 10 }), transform: "translateY(-50%)" } : undefined;

  return (
    <>
      <div className={`bizi-corner${open ? " is-open" : ""}${px ? " is-placed" : ""}`}>
        {!open && !dragging && note && (
          <button type="button" className={`bizi-tip k-${note.kind}`} onClick={show} style={tipStyle} data-testid="bizi-note">
            <b>{note.lines[0]}</b>
            {note.lines.slice(1).map((l) => (
              <span key={l}>{l}</span>
            ))}
          </button>
        )}
        {tip && !note && !open && !dragging && (
          <button type="button" className="bizi-tip" onClick={show} style={tipStyle}>
            <b>{x.tipTitle}</b>
            <span>{x.tipSub}</span>
          </button>
        )}
        <button
          type="button"
          className={`bizi-bubble${dragging ? " is-dragging" : ""}`}
          style={px ? { position: "fixed", left: px.left, top: px.top } : undefined}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKeyDown}
          onClick={(e) => e.preventDefault() /* a tap opens on pointer-up */}
          aria-label={`${x.open}. ${x.dragHint}`}
          title={`${x.open} · ${x.keys} · ${x.dragHint}`}
          data-testid="bizi-bubble"
        >
          <BiziFace mood={dragging || happy ? "happy" : brief?.mood === "worried" ? "worried" : "idle"} size={52} title="Bizi" />
          {warnN > 0 ? (
            <em className="bizi-dot" aria-label={x.needYou.replace("{n}", warnN)}>
              {warnN > 9 ? "9+" : warnN}
            </em>
          ) : (brief?.alerts || []).length > 0 ? (
            <em className="bizi-dot soft" aria-hidden="true" />
          ) : null}
        </button>
      </div>
      {open && (
        <Suspense fallback={null}>
          <BiziSearch onClose={() => setOpen(false)} brief={brief} onBriefChange={load} admin={admin} />
        </Suspense>
      )}
    </>
  );
}
