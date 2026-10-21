import { ArrowDown, Fingerprint, Loader2, LogIn, LogOut, ScanLine, Users } from "lucide-react";
import { colorVars } from "./looks";
import "./kiosk.css";
import "./kiosk-themes.css";

// The door kiosk screen in one of 23 layouts (looks.js KIOSK_LOOKS). Pure view: the tablet page and the
// small previews in the owner's dashboard both use it.
export const KT = {
  en: {
    scan: "Scan to clock in / out",
    scanShort: "SCAN",
    how: "Open your phone camera and point it at the code.",
    recent: "Just now",
    none: "Nobody yet today",
    in: "in",
    out: "out",
    came: "Came in today",
    last: "Last in",
    time: "Time",
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    welcome: "Welcome",
    hold: "Hold your phone here",
    attendance: "Staff attendance",
    next: "New code in {s}s",
  },
  km: {
    scan: "ស្កេនដើម្បីចុះវត្តមាន",
    scanShort: "ស្កេន",
    how: "បើកកាមេរ៉ាទូរស័ព្ទ ហើយតម្រង់មកកូដនេះ។",
    recent: "ទើបតែចុះ",
    none: "មិនទាន់មាននរណាម្នាក់ថ្ងៃនេះ",
    in: "ចូល",
    out: "ចេញ",
    came: "មកថ្ងៃនេះ",
    last: "ចុងក្រោយ",
    time: "ម៉ោង",
    morning: "អរុណសួស្តី",
    afternoon: "ទិវាសួស្តី",
    evening: "សាយ័ណ្ហសួស្តី",
    welcome: "សូមស្វាគមន៍",
    hold: "ដាក់ទូរស័ព្ទនៅទីនេះ",
    attendance: "វត្តមានបុគ្គលិក",
    next: "កូដថ្មីក្នុង {s} វិនាទី",
  },
};
const hhmm = (d) => new Date(new Date(d).getTime() + 7 * 3600000).toISOString().slice(11, 16);

export default function KioskView({ theme = "classic", color = "#0F766E", d, qr, now, left, lang = "en", net = "", extra = null }) {
  const t = KT[lang] || KT.en;
  const local = new Date(now + 7 * 3600000).toISOString();
  const hm = local.slice(11, 16);
  const sec = local.slice(17, 19);
  const hour = Number(local.slice(11, 13));
  const date = new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Phnom_Penh" }).format(new Date(now));
  const frac = Math.max(0, Math.min(1, left / (d.seconds || 20)));
  const greet = hour < 12 ? t.morning : hour < 17 ? t.afternoon : t.evening;
  const last = d.recent.find((r) => r.kind === "in");

  // ---------- pieces ----------
  const brand = (cls = "") => (
    <div className={`kq-brand ${cls}`}>
      <span className="kq-logo">{d.business.logo_url ? <img src={d.business.logo_url} alt="" /> : <Fingerprint size={30} />}</span>
      <span>
        <b>{d.business.name}</b>
        <small>{d.branch.name}</small>
      </span>
    </div>
  );
  const clock = (cls = "") => (
    <div className={`kq-clock ${cls}`}>
      <b>{hm}</b>
      <span>{sec}</span>
    </div>
  );
  const dateEl = () => <p className="kq-date">{date}</p>;
  const qrImg = () => (qr ? <img src={qr} alt="QR" /> : <Loader2 size={40} className="kq-spin" />);
  const qrBox = (cls = "") => (
    <div className={`kq-qr ${cls}`}>
      {qrImg()}
      <span className="kq-bar" style={{ width: `${frac * 100}%` }} />
    </div>
  );
  const scan = () => <h1 className="kq-scan">{t.scan}</h1>;
  const how = () => (
    <p className="kq-how">
      {t.how}
      {net && <em className="kq-net"> {net}</em>}
    </p>
  );
  const recentList = (n = 6) => (
    <div className="kq-recent">
      <small>{t.recent}</small>
      {d.recent.length === 0 && <p>{t.none}</p>}
      <ul>
        {d.recent.slice(0, n).map((r, i) => (
          <li key={i}>
            {r.kind === "in" ? <LogIn size={16} /> : <LogOut size={16} />}
            <b>{r.name}</b>
            <span>{t[r.kind]}</span>
            <time>{hhmm(r.at)}</time>
          </li>
        ))}
      </ul>
    </div>
  );
  const recentRow = (n = 5) => (
    <div className="kq-chips">
      {d.recent.length === 0 ? (
        <span className="kq-chip muted">{t.none}</span>
      ) : (
        d.recent.slice(0, n).map((r, i) => (
          <span key={i} className={`kq-chip k-${r.kind}`}>
            {r.kind === "in" ? <LogIn size={14} /> : <LogOut size={14} />} <b>{r.name}</b> {hhmm(r.at)}
          </span>
        ))
      )}
    </div>
  );
  const count = () => (
    <span className="kq-count">
      <Users size={18} /> {d.today_in ?? 0}
      {d.staff_total ? ` / ${d.staff_total}` : ""}
    </span>
  );
  const root = (children, cls = "") => (
    <div className={`kq kq-t-${theme} ${cls}`} style={colorVars(color)}>
      {children}
      {extra}
    </div>
  );

  // ---------- 23 layouts ----------
  switch (theme) {
    case "reverse":
      return root(
        <>
          <section className="kq-main">
            {scan()}
            {qrBox()}
            {how()}
          </section>
          <section className="kq-side">
            {brand()}
            {clock()}
            {dateEl()}
            {recentList()}
          </section>
        </>,
        "kq-split",
      );
    case "center":
      return root(
        <div className="kq-col">
          {brand("center")}
          {scan()}
          {qrBox()}
          <div className="kq-inline">
            {clock("small")}
            {dateEl()}
          </div>
          {recentRow()}
        </div>,
      );
    case "hero":
      return root(
        <>
          <header className="kq-band">
            {brand()}
            <div className="kq-band-time">
              {clock()}
              {dateEl()}
            </div>
          </header>
          <div className="kq-body">
            {qrBox()}
            <div className="kq-body-text">
              {scan()}
              {how()}
              {recentRow(4)}
            </div>
          </div>
        </>,
      );
    case "dark":
      return root(
        <>
          <header className="kq-top">
            {brand()}
            {clock("small")}
          </header>
          <div className="kq-glow-wrap">
            {qrBox("glow")}
            {scan()}
          </div>
          {recentRow()}
        </>,
      );
    case "minimal":
      return root(
        <>
          <section className="kq-min-left">
            {qrBox()}
            {scan()}
          </section>
          <section className="kq-min-right">
            {clock()}
            {dateEl()}
            {recentList(5)}
            {brand("small")}
          </section>
        </>,
      );
    case "bold":
      return root(
        <>
          <section className="kq-bold-left">
            <b className="kq-mega">{t.scanShort}</b>
            {scan()}
            {clock()}
            {brand()}
          </section>
          <section className="kq-bold-right">{qrBox()}</section>
        </>,
      );
    case "card":
      return root(
        <div className="kq-card">
          <div className="kq-card-left">
            {brand()}
            {clock()}
            {dateEl()}
            {recentList(4)}
          </div>
          <div className="kq-card-right">
            {scan()}
            {qrBox()}
            {how()}
          </div>
        </div>,
      );
    case "ring": {
      const R = 300;
      const C = 2 * Math.PI * R;
      return root(
        <div className="kq-col">
          <div className="kq-ring-top">
            {brand()}
            {clock("small")}
          </div>
          <div className="kq-ring">
            <svg viewBox="0 0 660 660" aria-hidden="true">
              <circle cx="330" cy="330" r={R} className="bg" />
              <circle cx="330" cy="330" r={R} className="fg" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
            </svg>
            <div className="kq-qr">{qrImg()}</div>
          </div>
          {scan()}
          {recentRow()}
        </div>,
      );
    }
    case "gradient":
      return root(
        <>
          <span className="kq-blobs" aria-hidden="true" />
          <header className="kq-top">
            {clock("small")}
            {brand()}
          </header>
          <div className="kq-glass">
            {qrBox()}
            <div>
              {scan()}
              {how()}
              {recentRow(3)}
            </div>
          </div>
        </>,
      );
    case "sidebar":
      return root(
        <>
          <aside className="kq-bar-side">
            <span className="kq-logo">{d.business.logo_url ? <img src={d.business.logo_url} alt="" /> : <Fingerprint size={30} />}</span>
            <b className="kq-v-hh">{hm.slice(0, 2)}</b>
            <b className="kq-v-mm">{hm.slice(3)}</b>
            <span className="kq-v-ss">{sec}</span>
          </aside>
          <section className="kq-mid">
            {brand("nologo")}
            {scan()}
            {qrBox()}
            {how()}
          </section>
          <section className="kq-list">
            {dateEl()}
            {count()}
            {recentList(8)}
          </section>
        </>,
      );
    case "ticker":
      return root(
        <>
          <header className="kq-top">
            {brand()}
            {clock("small")}
          </header>
          <div className="kq-col grow">
            {scan()}
            {qrBox()}
            {how()}
          </div>
          <div className="kq-ticker">
            <div className="kq-ticker-move">
              {(d.recent.length ? [...d.recent, ...d.recent] : [{ none: true }]).map((r, i) =>
                r.none ? (
                  <span key={i}>{t.none}</span>
                ) : (
                  <span key={i}>
                    {r.kind === "in" ? "●" : "○"} <b>{r.name}</b> {t[r.kind]} {hhmm(r.at)}
                  </span>
                ),
              )}
            </div>
          </div>
        </>,
      );
    case "poster":
      return root(
        <div className="kq-col">
          <small className="kq-kicker">{t.attendance}</small>
          {scan()}
          <ArrowDown className="kq-arrow" size={54} />
          {qrBox()}
          <footer className="kq-foot">
            {brand()}
            {clock("small")}
          </footer>
        </div>,
      );
    case "welcome":
      return root(
        <>
          <section className="kq-wel">
            {brand()}
            <h2 className="kq-greet">
              {greet}
              <span>{t.welcome} 👋</span>
            </h2>
            <div className="kq-inline">
              {clock("small")}
              {dateEl()}
            </div>
            {recentRow(4)}
          </section>
          <section className="kq-main">
            {qrBox()}
            {scan()}
          </section>
        </>,
      );
    case "stats":
      return root(
        <div className="kq-tiles">
          <div className="kq-tile brand">{brand()}</div>
          <div className="kq-tile big">
            <small>{t.came}</small>
            <b>{d.today_in ?? 0}</b>
            <span>/ {d.staff_total || 0}</span>
          </div>
          <div className="kq-tile">
            <small>{t.last}</small>
            <b className="kq-tile-name">{last ? last.name : "—"}</b>
            <span>{last ? hhmm(last.at) : ""}</span>
          </div>
          <div className="kq-tile time">
            <small>{t.time}</small>
            {clock("small")}
            {dateEl()}
          </div>
          <div className="kq-tile qr">
            {qrBox()}
            {scan()}
          </div>
        </div>,
      );
    case "bento":
      return root(
        <div className="kq-bento">
          <div className="kq-b b-brand">{brand()}</div>
          <div className="kq-b b-clock">{clock()}</div>
          <div className="kq-b b-date">
            {dateEl()}
            {count()}
          </div>
          <div className="kq-b b-qr">
            {qrBox()}
            {scan()}
          </div>
          <div className="kq-b b-list">{recentList(7)}</div>
        </div>,
      );
    case "digital":
      return root(
        <div className="kq-term">
          <div className="kq-term-head">
            <span>
              &gt; {d.business.name.toUpperCase()} · {d.branch.name.toUpperCase()}
            </span>
            <span>● ONLINE</span>
          </div>
          <div className="kq-term-body">
            <div className="kq-term-left">
              {clock()}
              <p className="kq-date">{date.toUpperCase()}</p>
              <div className="kq-log">
                {d.recent.length === 0 && <p>&gt; {t.none}</p>}
                {d.recent.slice(0, 7).map((r, i) => (
                  <p key={i}>
                    [{hhmm(r.at)}] {r.kind === "in" ? "IN " : "OUT"} {r.name}
                  </p>
                ))}
                <p className="kq-cursor">&gt; _</p>
              </div>
            </div>
            <div className="kq-term-right">
              {qrBox()}
              <p className="kq-how">{t.next.replace("{s}", Math.ceil(left))}</p>
            </div>
          </div>
        </div>,
      );
    case "paper":
      return root(
        <div className="kq-paper">
          <div className="kq-paper-left">
            {brand()}
            <h1 className="kq-scan">{t.scan}</h1>
            {how()}
            {clock("small")}
            {dateEl()}
          </div>
          <div className="kq-stamp">{qrBox()}</div>
        </div>,
      );
    case "angkor":
      return root(
        <div className="kq-ak">
          <span className="kq-orn" aria-hidden="true">
            ❖
          </span>
          {brand("center")}
          {scan()}
          <div className="kq-ak-qr">{qrBox()}</div>
          <div className="kq-inline">
            {clock("small")}
            {dateEl()}
          </div>
          {recentRow(4)}
        </div>,
      );
    case "gold":
      return root(
        <div className="kq-lux">
          <section>
            {brand()}
            <span className="kq-rule" />
            {clock()}
            {dateEl()}
            {recentList(4)}
          </section>
          <section>
            {scan()}
            {qrBox()}
            {how()}
          </section>
        </div>,
      );
    case "pastel":
      return root(
        <>
          <span className="kq-dots" aria-hidden="true" />
          <div className="kq-pastel">
            <div>
              {brand()}
              {scan()}
              {clock("small")}
              {recentRow(3)}
            </div>
            {qrBox()}
          </div>
        </>,
      );
    case "diagonal":
      return root(
        <>
          <span className="kq-diag-bg" aria-hidden="true" />
          <section className="kq-diag-left">
            {brand()}
            {clock()}
            {dateEl()}
            {recentRow(3)}
          </section>
          <section className="kq-diag-right">
            {qrBox()}
            {scan()}
          </section>
        </>,
      );
    case "frame":
      return root(
        <>
          <section className="kq-frame-text">
            {brand()}
            {scan()}
            {how()}
            <div className="kq-inline">
              {clock("small")}
              {dateEl()}
            </div>
            {recentList(4)}
          </section>
          <section className="kq-frame-main">
            <div className="kq-phone">
              <span className="kq-notch" />
              {qrBox()}
              <span className="kq-scanline" />
            </div>
            <small className="kq-hold">
              <ScanLine size={16} /> {t.hold}
            </small>
          </section>
        </>,
      );
    default:
      // classic
      return root(
        <>
          <section className="kq-side">
            {brand()}
            {clock()}
            {dateEl()}
            {recentList()}
          </section>
          <section className="kq-main">
            {scan()}
            {qrBox()}
            {how()}
          </section>
        </>,
        "kq-split",
      );
  }
}
