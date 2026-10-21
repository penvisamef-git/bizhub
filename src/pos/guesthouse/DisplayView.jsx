import { useEffect, useRef, useState } from "react";
import { BedDouble } from "lucide-react";
import "./ghpos.css";
import "./ghthemes.css";

// The guest display picture in one of 12 looks (the first is free). Pure: state in → screen out.
export const DISPLAY_THEMES = ["classic", "paper", "resort", "gold", "sunrise", "minimal", "neon", "khmer", "ocean", "boutique", "forest", "split"];
const LAYOUT = { classic: "split", paper: "receipt", resort: "hero", gold: "center", sunrise: "split", minimal: "total", neon: "split", khmer: "split", ocean: "stack", boutique: "center", forest: "split", split: "total" };
export const THEME_NAMES = {
  en: {
    classic: "Classic",
    paper: "Paper receipt",
    resort: "Resort",
    gold: "Black & gold",
    sunrise: "Sunrise",
    minimal: "Minimal",
    neon: "Neon night",
    khmer: "Khmer heritage",
    ocean: "Ocean",
    boutique: "Boutique",
    forest: "Forest lodge",
    split: "Bold split",
  },
  km: { classic: "បុរាណ", paper: "វិក្កយបត្រក្រដាស", resort: "រីសត", gold: "ខ្មៅ & មាស", sunrise: "ថ្ងៃរះ", minimal: "សាមញ្ញ", neon: "រាត្រីនីអុង", khmer: "បេតិកភណ្ឌខ្មែរ", ocean: "សមុទ្រ", boutique: "ប៊ូទិក", forest: "ផ្ទះព្រៃ", split: "ពីរផ្នែក" },
};
const T = {
  en: {
    welcome: "Welcome",
    checkIn: "Check-in from",
    checkOut: "Check-out by",
    room: "Room",
    nights: "{n} night(s)",
    discount: "Discount",
    total: "Total",
    paid: "Paid",
    toPay: "To pay",
    change: "Change",
    scan: "Scan to pay",
    thanks: "Thank you!",
    trip: "Have a good trip",
  },
  km: {
    welcome: "សូមស្វាគមន៍",
    checkIn: "ចូលពីម៉ោង",
    checkOut: "ចេញមុនម៉ោង",
    room: "បន្ទប់",
    nights: "{n} យប់",
    discount: "បញ្ចុះតម្លៃ",
    total: "សរុប",
    paid: "បានបង់",
    toPay: "ត្រូវបង់",
    change: "អាប់",
    scan: "ស្កេនដើម្បីបង់",
    thanks: "អរគុណ!",
    trip: "ដំណើរសុខសាន្ត",
  },
};
const money = (v, cur) => (cur === "KHR" ? `${Math.round(Number(v) || 0).toLocaleString("en-US")}៛` : `$${(Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const day = (d, lang) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

// a made-up bill for previews in the dashboard
export const SAMPLE = (name = "Mekong View", lang = "en", theme = "classic", image = "") => ({
  business: { name, logo: "" },
  theme,
  image,
  cur: "USD",
  lang,
  check_in: "14:00",
  check_out: "12:00",
  mode: "bill",
  pay_qr: "",
  pay_qr_label: "ABA · " + name,
  stay: { no: "B-0042", room: "201", guest: "John Smith", from: "2026-10-12", to: "2026-10-14", nights: 2, rate: 25, room_total: 50, lines: [{ label: "Laundry × 2", amount: 6 }], discount: 0, total: 56, paid: 20, balance: 36 },
});

function FakeQr() {
  // a QR-looking pattern for previews (not scannable)
  const cells = [];
  for (let y = 0; y < 21; y++)
    for (let x = 0; x < 21; x++) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      const on = finder ? x % 6 === 0 || y % 6 === 0 || (x % 7 > 1 && x % 7 < 5 && y % 7 > 1 && y % 7 < 5) || x === 20 || y === 20 : (x * 7 + y * 13 + x * y) % 3 === 0;
      if (on) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  return (
    <svg viewBox="-1 -1 23 23" className="ghd-fakeqr" aria-hidden="true">
      <rect x="-1" y="-1" width="23" height="23" fill="#fff" />
      <g fill="#111">{cells}</g>
    </svg>
  );
}

export function DisplayView({ state, clock = "", fakeQr = false }) {
  const lang = state?.lang === "km" ? "km" : "en";
  const t = T[lang];
  const cur = state?.cur || "USD";
  const theme = DISPLAY_THEMES.includes(state?.theme) ? state.theme : "classic";
  const layout = LAYOUT[theme];
  const cls = `ghd t-${theme} l-${layout}`;
  const logo = state.business.logo ? <img src={state.business.logo} alt="" /> : <BedDouble size={30} />;
  const head = (
    <div className="ghd-head">
      <span className="ghd-head-logo">{logo}</span>
      <b>{state.business.name}</b>
      {clock && <span className="ghd-clock">{clock}</span>}
    </div>
  );

  if (state.mode === "idle" || state.mode === "thanks" || !state.stay) {
    const thanks = state.mode === "thanks" && state.stay;
    return (
      <div className={`${cls} ghd-idle ${state.image ? "has-img" : ""}`} style={state.image ? { "--img": `url(${state.image})` } : undefined}>
        {head}
        <div className="ghd-center">
          <span className="ghd-hero-logo">{state.business.logo ? <img className="ghd-logo" src={state.business.logo} alt="" /> : <BedDouble size={90} />}</span>
          <h1>{thanks ? t.thanks : t.welcome}</h1>
          <h2>{thanks ? `${state.stay.guest} · ${t.trip}` : state.business.name}</h2>
          {!thanks && (
            <p className="ghd-times">
              {t.checkIn} <b>{state.check_in}</b> · {t.checkOut} <b>{state.check_out}</b>
            </p>
          )}
        </div>
      </div>
    );
  }

  const s = state.stay;
  const qr = state.pay_qr ? <img src={state.pay_qr} alt="QR" /> : fakeQr ? <FakeQr /> : null;
  return (
    <div className={cls} style={state.image ? { "--img": `url(${state.image})` } : undefined}>
      {head}
      <div className={`ghd-body ${qr || state.image ? "" : "no-qr"}`}>
        <section className="ghd-big">
          <small>{t.toPay}</small>
          <b>{money(Math.max(0, s.balance), cur)}</b>
          <span>
            {t.room} {s.room} · {s.guest}
          </span>
        </section>
        <section className="ghd-bill">
          <div className="ghd-guest">
            <span className="ghd-room">
              {t.room} {s.room}
            </span>
            <b>{s.guest}</b>
            <small>
              {day(s.from, lang)} → {day(s.to, lang)} · {t.nights.replace("{n}", s.nights)}
            </small>
          </div>
          <div className="ghd-lines">
            <div className="ghd-line">
              <span>
                {t.nights.replace("{n}", s.nights)} × {money(s.rate, cur)}
              </span>
              <b>{money(s.room_total, cur)}</b>
            </div>
            {s.lines.map((l, i) => (
              <div key={i} className="ghd-line">
                <span>{l.label}</span>
                <b>{money(l.amount, cur)}</b>
              </div>
            ))}
            {s.discount > 0 && (
              <div className="ghd-line">
                <span>{t.discount}</span>
                <b>−{money(s.discount, cur)}</b>
              </div>
            )}
          </div>
          <div className="ghd-line total">
            <span>{t.total}</span>
            <b>{money(s.total, cur)}</b>
          </div>
          {s.paid !== 0 && (
            <div className="ghd-line">
              <span>{t.paid}</span>
              <b>{money(s.paid, cur)}</b>
            </div>
          )}
          <div className={`ghd-due ${s.balance > 0 ? "owe" : "ok"}`}>
            <span>{s.balance >= 0 ? t.toPay : t.change}</span>
            <b>{money(Math.abs(s.balance), cur)}</b>
          </div>
        </section>
        {qr ? (
          <section className="ghd-qr">
            <span>{t.scan}</span>
            {qr}
            <b>{money(Math.max(0, s.balance), cur)}</b>
            {state.pay_qr_label && <small>{state.pay_qr_label}</small>}
          </section>
        ) : state.image ? (
          <section className="ghd-pic" style={{ backgroundImage: `url(${state.image})` }} />
        ) : null}
      </div>
    </div>
  );
}

// a small live preview of a look (dashboard theme picker): the 1280×720 screen scaled to fit
export function DisplayPreview({ state }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.25);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setScale(el.clientWidth / 1280);
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  return (
    <div className="ghd-preview" ref={box}>
      <div className="ghd-preview-in" style={{ transform: `scale(${scale})` }}>
        <DisplayView state={state} clock="09:41" fakeQr />
      </div>
    </div>
  );
}
