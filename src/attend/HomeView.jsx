import { AlertTriangle, Check, Clock, Fingerprint, Loader2, LogIn, LogOut, MapPin, Power } from "lucide-react";
import "./attend.css";
import "./staff-themes.css";

// The staff "Today" screen, drawn in one of 12 layouts (looks.js APP_LOOKS). Pure view: the same
// component runs the real app and the small previews in the owner's dashboard.
const hhmm = (d) => (d ? new Date(new Date(d).getTime() + 7 * 3600000).toISOString().slice(11, 16) : "—");
const dur = (min) => {
  const m = Math.round(Number(min) || 0);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}m` : ""}`;
};
const initial = (n) => Array.from(String(n || "?").trim() || "?")[0].toUpperCase();

export function Header({ me, x, langBtn, onLogout }) {
  return (
    <header className="sa-top">
      <span className="sa-brand">
        {me.business.logo_url ? <img src={me.business.logo_url} alt="" /> : <Fingerprint size={18} />} <span>{me.business.name}</span>
      </span>
      {langBtn}
      <button type="button" className="sa-icon" onClick={onLogout} aria-label={x.logout} title={x.logout}>
        <Power size={17} />
      </button>
    </header>
  );
}

export default function HomeView({ theme = "classic", x, lang, me, now, step = "idle", result, error, sureOut, nearest, langBtn, onLogout, onPress, onCancelSure, onSendAnyway, onIdle, kioskReady = false }) {
  const t = me.today;
  const local = new Date(now + 7 * 3600000).toISOString();
  const time = local.slice(11, 19);
  const hm = local.slice(11, 16);
  const sec = local.slice(17, 19);
  const date = new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Phnom_Penh" }).format(new Date(now));
  const isIn = me.next === "out";
  const busy = step === "locating" || step === "sending";
  // the shift's allowed time for this press (set by the owner)
  const winFrom = me.window?.from ? new Date(me.window.from).getTime() : null;
  const winTo = me.window?.to ? new Date(me.window.to).getTime() : null;
  const early = winFrom !== null && now < winFrom;
  const late = winTo !== null && now > winTo;
  const closed = early || late;
  const label = step === "locating" ? x.locating : step === "sending" ? x.sending : early ? x.opensAt.replace("{t}", hhmm(winFrom)) : late ? x.closedAt.replace("{t}", hhmm(winTo)) : isIn ? x.clockOut : x.clockIn;
  const Icon = isIn ? LogOut : LogIn;
  const start = t.start ? new Date(t.start).getTime() : null;
  const end = t.end ? new Date(t.end).getTime() : null;
  const progress = start && end ? Math.max(0, Math.min(1, (now - start) / (end - start))) : 0;
  const leftMin = end ? Math.max(0, Math.round((end - now) / 60000)) : 0;
  const first = me.staff.name.split(/\s+/);

  // ---------- shared pieces (plain functions, so nothing re-mounts every second) ----------
  const header = () => <Header me={me} x={x} langBtn={langBtn} onLogout={onLogout} />;
  const hello = () => (
    <div className="sa-hello">
      <span className="sa-av">{initial(me.staff.name)}</span>
      <span>
        <small>{x.hello}</small>
        <b>{me.staff.name}</b>
      </span>
    </div>
  );
  const shiftChip = () =>
    me.shift && (
      <span className="sa-shift">
        <Clock size={13} /> {me.shift.name} · {me.shift.start}–{me.shift.end}
      </span>
    );
  const winNote = () => me.window && <small className={`sa-win ${closed ? "closed" : ""}`}>{(isIn ? x.outAllowed : x.inAllowed).replace("{from}", winFrom ? hhmm(winFrom) : "…").replace("{to}", winTo ? hhmm(winTo) : "…")}</small>;
  const clock = () => (
    <div className="sa-clock">
      <b>{time}</b>
      <small>{date}</small>
      {shiftChip()}
    </div>
  );
  const stopped = () =>
    me.stopped && (
      <div className="sa-alert bad">
        <AlertTriangle size={18} /> {x.err.stopped}
      </div>
    );
  const bigBtn = (extra = "", size = 46) => (
    <button type="button" className={`sa-big ${isIn ? "out" : "in"} ${closed ? "closed" : ""} ${extra}`} onClick={onPress} disabled={me.stopped || busy || closed}>
      {busy ? <Loader2 size={size} className="sa-spin" /> : closed ? <Clock size={size} /> : <Icon size={size} />}
      <b>{label}</b>
    </button>
  );
  const below = () => (
    <>
      {winNote()}
      {kioskReady && step === "idle" && <div className="sa-kiosk-note">{x.kioskReady}</div>}
      {me.features?.selfie && !kioskReady && step === "idle" && !sureOut && <small className="sa-selfie-note">{x.selfieNote}</small>}
      {sureOut && step === "idle" && (
        <button type="button" className="sa-link" onClick={onCancelSure}>
          {x.cancel}
        </button>
      )}
      {nearest && step !== "confirm-nogps" && (
        <small className={`sa-near ${nearest.d <= nearest.b.radius_m ? "ok" : "far"}`}>
          <MapPin size={13} /> {(nearest.d <= nearest.b.radius_m ? x.atBranch : x.awayFrom).replace("{m}", nearest.d).replace("{name}", nearest.b.name)}
        </small>
      )}
      {error && <div className="sa-error">{error}</div>}
      {step === "confirm-nogps" && (
        <div className="sa-confirm">
          <p>{x.noGpsAsk}</p>
          <div>
            <button type="button" className="sa-btn ghost" onClick={onIdle}>
              {x.cancel}
            </button>
            <button type="button" className="sa-btn" onClick={onSendAnyway}>
              {x.sendAnyway}
            </button>
          </div>
        </div>
      )}
    </>
  );
  const resultCard = () => (
    <div className={`sa-result ${result.review === "ok" ? "ok" : "warn"}`}>
      <span className="sa-result-ic">{result.review === "ok" ? <Check size={44} /> : <AlertTriangle size={40} />}</span>
      <b>{result.kind === "in" ? x.inDone : x.outDone}</b>
      <span className="sa-result-time">{hhmm(result.at)}</span>
      {result.branch_name && (
        <small>
          <MapPin size={13} /> {result.branch_name}
          {result.distance_m !== null && result.distance_m !== undefined ? ` · ${result.distance_m} m` : ""}
        </small>
      )}
      {result.review !== "ok" && (
        <p>
          {x.needsCheck} {result.flags.map((f) => x.flags[f]).join(", ")}
        </p>
      )}
      <button type="button" className="sa-btn ghost" onClick={onIdle}>
        {x.ok}
      </button>
    </div>
  );
  const showResult = step === "done" && result;
  const press = (btn = () => bigBtn()) =>
    showResult ? (
      resultCard()
    ) : (
      <div className="sa-press">
        {btn()}
        {below()}
      </div>
    );
  const tags = () => (
    <div className="sa-tags">
      <span className={`sa-st st-${t.status}`}>{x.status[t.status]}</span>
      {t.late_min > 0 && <span className="sa-tag warn">{x.late.replace("{m}", dur(t.late_min))}</span>}
      {t.early_min > 0 && <span className="sa-tag warn">{x.early.replace("{m}", dur(t.early_min))}</span>}
      {t.ot_min > 0 && <span className="sa-tag blue">{x.ot.replace("{m}", dur(t.ot_min))}</span>}
      {t.pending > 0 && <span className="sa-tag warn">{x.pending}</span>}
    </div>
  );
  const stats = () => (
    <div className="sa-today-row">
      <span>
        <small>{x.in}</small>
        <b>{hhmm(t.first_in)}</b>
      </span>
      <span>
        <small>{x.out}</small>
        <b>{t.status === "missing_out" ? "?" : hhmm(t.last_out)}</b>
      </span>
      <span>
        <small>{x.worked}</small>
        <b>{t.worked_min ? dur(t.worked_min) : "—"}</b>
      </span>
    </div>
  );
  const punches = () =>
    t.punches.length > 0 && (
      <ul className="sa-punches">
        {t.punches.map((p) => (
          <li key={p._id} className={`r-${p.review}`}>
            {p.kind === "in" ? <LogIn size={14} /> : <LogOut size={14} />}
            <b>{hhmm(p.at)}</b>
            <span>{p.kind === "in" ? x.clockIn : x.clockOut}</span>
            {p.review !== "ok" && <small>{x.review[p.review]}</small>}
          </li>
        ))}
      </ul>
    );
  const today = () => (
    <section className="sa-today">
      {stats()}
      {tags()}
      {punches()}
    </section>
  );
  const noBranch = () => me.branches.length === 0 && <p className="sa-note">{x.noBranch}</p>;
  const duty = isIn ? x.onDuty : x.offDuty;

  // ---------- the 12 layouts ----------
  if (theme === "hero") {
    return (
      <>
        <div className="sa-hero">
          {header()}
          <div className="sa-hero-body">
            <span className="sa-av big">{initial(me.staff.name)}</span>
            <small>{x.hello}</small>
            <b className="sa-hero-name">{me.staff.name}</b>
            <b className="sa-hero-time">{time}</b>
            <small>{date}</small>
            {shiftChip()}
          </div>
        </div>
        <main className="sa-main sa-sheet">
          {stopped()}
          {press()}
          {today()}
          {noBranch()}
        </main>
      </>
    );
  }

  if (theme === "badge") {
    return (
      <>
        {header()}
        <main className="sa-main">
          <div className="sa-idcard">
            <span className="sa-id-hole" />
            <div className="sa-id-top">
              {me.business.logo_url ? <img src={me.business.logo_url} alt="" /> : <Fingerprint size={18} />}
              <span>{me.business.name}</span>
            </div>
            <span className="sa-id-photo">{initial(me.staff.name)}</span>
            <b className="sa-id-name">{me.staff.name}</b>
            <small>{me.staff.position || x.staffWord}</small>
            <div className="sa-id-row">
              <span>
                <small>{x.shiftWord}</small>
                <b>{me.shift ? `${me.shift.start}–${me.shift.end}` : "—"}</b>
              </span>
              <span>
                <small>{x.timeWord}</small>
                <b>{hm}</b>
              </span>
              <span>
                <small>{x.statusWord}</small>
                <b className={isIn ? "on" : ""}>{duty}</b>
              </span>
            </div>
          </div>
          {stopped()}
          {press(() => bigBtn("pill", 24))}
          {today()}
          {noBranch()}
        </main>
      </>
    );
  }

  if (theme === "split") {
    const tile = (kind) => {
      const active = (kind === "out") === isIn;
      const KIcon = kind === "in" ? LogIn : LogOut;
      return (
        <button type="button" className={`sa-tile ${kind} ${active ? "active" : ""} ${active && closed ? "closed" : ""}`} onClick={active ? onPress : undefined} disabled={!active || me.stopped || busy || closed}>
          {active && busy ? <Loader2 size={34} className="sa-spin" /> : <KIcon size={34} />}
          <b>{active ? label : kind === "in" ? x.clockIn : x.clockOut}</b>
          <small>{kind === "in" ? hhmm(t.first_in) : t.status === "missing_out" ? "?" : hhmm(t.last_out)}</small>
        </button>
      );
    };
    return (
      <>
        {header()}
        <main className="sa-main">
          <div className="sa-split-clock">
            <b>{hm}</b>
            <span>{sec}</span>
          </div>
          <small className="sa-split-date">{date}</small>
          {shiftChip()}
          {stopped()}
          {showResult ? (
            resultCard()
          ) : (
            <div className="sa-press">
              <div className="sa-tiles">
                {tile("in")}
                {tile("out")}
              </div>
              {below()}
            </div>
          )}
          <section className="sa-today">
            {tags()}
            {punches()}
          </section>
          {noBranch()}
        </main>
      </>
    );
  }

  if (theme === "minimal") {
    return (
      <>
        {header()}
        <main className="sa-main">
          <div className="sa-min-clock">
            <b>{hm}</b>
            <small>{date}</small>
          </div>
          <p className="sa-min-hello">
            {x.hello}, <b>{first[first.length - 1]}</b>
            {me.shift ? ` · ${me.shift.start}–${me.shift.end}` : ""}
          </p>
          {stopped()}
          {press(() => bigBtn("ghostring", 28))}
          {tags()}
          <ul className="sa-min-list">
            {t.punches.map((p) => (
              <li key={p._id} className={`r-${p.review}`}>
                <span>{p.kind === "in" ? x.clockIn : x.clockOut}</span>
                <i />
                <b>{hhmm(p.at)}</b>
              </li>
            ))}
          </ul>
          {noBranch()}
        </main>
      </>
    );
  }

  if (theme === "ring") {
    const R = 116;
    const C = 2 * Math.PI * R;
    return (
      <>
        {header()}
        <main className="sa-main">
          {hello()}
          <div className="sa-ring-time">
            <b>{time}</b>
            <small>{date}</small>
          </div>
          {stopped()}
          {press(() => (
            <div className="sa-ring">
              <svg viewBox="0 0 260 260" aria-hidden="true">
                <circle cx="130" cy="130" r={R} className="sa-ring-bg" />
                <circle cx="130" cy="130" r={R} className={`sa-ring-fg ${progress <= 0 ? "empty" : ""}`} strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
              </svg>
              {bigBtn("", 40)}
            </div>
          ))}
          {start && !showResult && <p className="sa-ring-note">{x.shiftProgress.replace("{p}", Math.round(progress * 100)).replace("{left}", dur(leftMin))}</p>}
          {today()}
          {noBranch()}
        </main>
      </>
    );
  }

  if (theme === "timeline") {
    const firstIn = t.first_in ? new Date(t.first_in).getTime() : null;
    const lastOut = t.last_out ? new Date(t.last_out).getTime() : null;
    const points = [
      start && { at: start, label: x.shiftStarts, kind: "plan" },
      firstIn && { at: firstIn, label: x.clockIn, kind: "in", tag: t.late_min ? x.late.replace("{m}", dur(t.late_min)) : "" },
      { at: now, label: x.nowWord, kind: "now" },
      lastOut && !isIn && { at: lastOut, label: x.clockOut, kind: "out" },
      end && { at: end, label: x.shiftEnds, kind: "plan" },
    ]
      .filter(Boolean)
      .sort((a, b) => a.at - b.at);
    return (
      <>
        {header()}
        <main className="sa-main sa-tl-main">
          <div className="sa-tl-head">
            <span className="sa-av">{initial(me.staff.name)}</span>
            <span>
              <b>{me.staff.name}</b>
              <small>{date}</small>
            </span>
            <b className="sa-tl-clock">{hm}</b>
          </div>
          {stopped()}
          <ol className="sa-tl">
            {points.map((p, i) => (
              <li key={i} className={`k-${p.kind} ${p.at <= now ? "past" : ""}`}>
                <b>{hhmm(p.at)}</b>
                <i />
                <span>
                  {p.label}
                  {p.tag && <small className="sa-tag warn">{p.tag}</small>}
                </span>
              </li>
            ))}
          </ol>
          {tags()}
          {noBranch()}
          <div className="sa-tl-dock">{press(() => bigBtn("pill", 24))}</div>
        </main>
      </>
    );
  }

  if (theme === "bold") {
    return (
      <>
        {header()}
        <main className="sa-main">
          <h1 className="sa-bold-hi">
            {x.hello},
            <br />
            <span>{first[first.length - 1]}</span>
          </h1>
          <div className="sa-bold-row">
            <b>{hm}</b>
            <small>
              {date}
              <br />
              {me.shift ? `${me.shift.name} ${me.shift.start}–${me.shift.end}` : ""}
            </small>
          </div>
          {stopped()}
          {today()}
          {press(() => bigBtn("block", 34))}
          {noBranch()}
        </main>
      </>
    );
  }

  if (theme === "digital") {
    return (
      <>
        {header()}
        <main className="sa-main">
          <div className="sa-lcd">
            <div className="sa-lcd-top">
              <span>{me.staff.name.toUpperCase()}</span>
              <span className={isIn ? "on" : ""}>● {duty.toUpperCase()}</span>
            </div>
            <b className="sa-lcd-time">
              {hm}
              <span>:{sec}</span>
            </b>
            <div className="sa-lcd-bottom">
              <span>{date}</span>
              <span>{me.shift ? `${me.shift.start}–${me.shift.end}` : "--:--"}</span>
            </div>
          </div>
          {stopped()}
          {press(() => bigBtn("square", 38))}
          <section className="sa-today sa-lcd-table">
            {stats()}
            {tags()}
          </section>
          {noBranch()}
        </main>
      </>
    );
  }

  if (theme === "ticket") {
    return (
      <>
        {header()}
        <main className="sa-main">
          <div className="sa-pass">
            <div className="sa-pass-top">
              {me.business.logo_url ? <img src={me.business.logo_url} alt="" /> : <Fingerprint size={18} />}
              <span>{me.business.name}</span>
              <small>{x.workPass}</small>
            </div>
            <div className="sa-pass-route">
              <span>
                <small>{x.in}</small>
                <b>{t.first_in ? hhmm(t.first_in) : me.shift?.start || "—"}</b>
              </span>
              <i>
                <Clock size={18} />
              </i>
              <span>
                <small>{x.out}</small>
                <b>{t.last_out && !isIn ? hhmm(t.last_out) : me.shift?.end || "—"}</b>
              </span>
            </div>
            <div className="sa-pass-info">
              <span>
                <small>{x.nameWord}</small>
                <b>{me.staff.name}</b>
              </span>
              <span>
                <small>{x.timeWord}</small>
                <b>{time}</b>
              </span>
            </div>
            <div className="sa-pass-cut" />
            <div className="sa-pass-stub">
              {showResult ? (
                resultCard()
              ) : (
                <div className="sa-press">
                  {bigBtn("pill", 24)}
                  {below()}
                </div>
              )}
            </div>
          </div>
          {stopped()}
          <section className="sa-today">
            {tags()}
            {punches()}
          </section>
          {noBranch()}
        </main>
      </>
    );
  }

  if (theme === "angkor") {
    return (
      <>
        {header()}
        <main className="sa-main sa-ak">
          <div className="sa-ak-frame">
            <span className="sa-ak-orn" aria-hidden="true">
              ❖
            </span>
            <small>{x.hello}</small>
            <b className="sa-ak-name">{me.staff.name}</b>
            <b className="sa-ak-time">{time}</b>
            <small>{date}</small>
            {shiftChip()}
          </div>
          {stopped()}
          {press(() => (
            <div className="sa-ak-rings">{bigBtn("", 44)}</div>
          ))}
          {today()}
          {noBranch()}
        </main>
      </>
    );
  }

  // classic + glass (glass is the classic order on a glowing background with frosted cards)
  return (
    <>
      {header()}
      <main className="sa-main">
        {theme === "glass" && <span className="sa-blobs" aria-hidden="true" />}
        {hello()}
        {clock()}
        {stopped()}
        {press()}
        {today()}
        {noBranch()}
      </main>
    </>
  );
}
