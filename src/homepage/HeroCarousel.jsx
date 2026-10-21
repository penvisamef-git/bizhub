import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { ROUTES } from "../config";

const SLIDE_MS = 6000;
const BARS = [42, 58, 50, 72, 64, 86, 100];

export function DashboardMock({ t }) {
  const rows = [
    [t.sRestaurant, "$412", "#E0581A", "good", t.online],
    [t.sMart, "$286", "#D9A51A", "warn", t.syncing],
    [t.sGuest, "$180", "#9DB01C", "good", t.online],
    [t.sWarehouse, "—", "var(--muted)", "good", t.online],
  ];
  return (
    <div className="panel dash-mock float">
      <div className="dash-mock-head">
        <strong>{t.dashTitle}</strong>
        <span className="pill">{t.dashCoins} · 1,250</span>
      </div>
      <div className="bars" aria-hidden="true">
        {BARS.map((h, i) => (
          <span key={i} className={i === BARS.length - 1 ? "top" : ""} style={{ height: `${h}%`, animationDelay: `${0.1 + i * 0.08}s` }} />
        ))}
      </div>
      <div>
        {rows.map(([name, amt, color, tone, status]) => (
          <div key={name} className="biz-row">
            <span className="cdot" style={{ background: color }} />
            <span className="name">{name}</span>
            <span className="amt">{amt}</span>
            <span className={`badge ${tone}`}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OfflineMock({ t }) {
  return (
    <>
      <div className="panel receipt float">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <strong style={{ flexGrow: 1, fontSize: 14 }}>{t.cashier}</strong>
          <span className="badge warn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="pulse-dot" />
            {t.offline}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="line">
            <span>Iced latte × 2</span>
            <b>$5.00</b>
          </div>
          <div className="line">
            <span>Fried rice</span>
            <b>$3.50</b>
          </div>
          <div className="line">
            <span>Water</span>
            <b>$0.50</b>
          </div>
        </div>
        <div className="total">
          <span>Total</span>
          <span>$9.00</span>
        </div>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{t.queued}</span>
      </div>
      <div className="panel synced float2">
        <span className="ok">
          <Check size={18} strokeWidth={2.6} />
        </span>
        {t.synced}
      </div>
    </>
  );
}

export function WalletMock({ t, methods, bonus }) {
  return (
    <div className="wallet-card float">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="muted" style={{ flexGrow: 1, fontSize: 15, fontWeight: 700 }}>
          {t.wallet}
        </span>
        <span className="coin">B</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          {t.bonus}
        </span>
        <span className="big">+{bonus}</span>
        <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>
          {t.coinPrice}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {methods.map((m) => (
          <span key={m} className="pay-chip">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HeroCarousel({ t, methods = ["KHQR", "ABA", "Card"], bonus = "200" }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  const go = useCallback((i) => setIndex(((i % 3) + 3) % 3), []);

  useEffect(() => {
    if (paused) return undefined;
    timer.current = setTimeout(() => setIndex((i) => (i + 1) % 3), SLIDE_MS);
    return () => clearTimeout(timer.current);
  }, [index, paused]);

  const slides = [
    {
      eyebrow: "Eco POS by BizHub",
      a: t.s1a,
      b: t.s1b,
      d: t.heroSub,
      second: { label: t.ctaServices, href: "#services" },
      visual: <DashboardMock t={t} />,
    },
    {
      eyebrow: t.s2e,
      a: t.s2a,
      b: t.s2b,
      d: t.s2d,
      second: { label: t.more, href: "#why" },
      visual: <OfflineMock t={t} />,
    },
    {
      eyebrow: t.s3e,
      a: t.s3a,
      b: t.s3b,
      d: t.s3d,
      second: { label: t.coinTitle, href: "#coins" },
      visual: <WalletMock t={t} methods={methods} bonus={bonus} />,
    },
  ];

  return (
    <section
      id="top"
      className={`hero carousel${paused ? " paused" : ""}`}
      aria-roledescription="carousel"
      aria-label={t.heroLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="gridbg" />
      <div className="blob b1" style={{ width: 520, height: 520, top: -160, left: -120 }} />
      <div className="blob b2" style={{ width: 480, height: 480, top: 80, right: -140 }} />
      <div className="wrap" style={{ position: "relative" }}>
        <div className="slides">
          {slides.map((s, i) => (
            <div key={i} className={`slide${i === index ? " on" : ""}`} aria-hidden={i !== index} role="group" aria-roledescription="slide" aria-label={`${i + 1} / 3`}>
              <div className="slide-text">
                <span className="pill up">{s.eyebrow}</span>
                <h1 className="up d1">
                  {s.a} <span className="shine">{s.b}</span>
                </h1>
                <p className="lead up d2">{s.d}</p>
                <div className="cta-row up d3">
                  <Link className="btn btn-primary" to={ROUTES.signUp} tabIndex={i === index ? 0 : -1}>
                    {t.ctaStart}
                  </Link>
                  <a className="btn btn-secondary" href={s.second.href} tabIndex={i === index ? 0 : -1}>
                    {s.second.label}
                  </a>
                </div>
              </div>
              <div className="slide-visual pop">{s.visual}</div>
            </div>
          ))}
        </div>
        <div className="carousel-controls">
          <div className="dots">
            {slides.map((_, i) => (
              <button key={i} type="button" className={`dot${i === index ? " on" : ""}`} aria-label={`Slide ${i + 1}`} aria-current={i === index} onClick={() => go(i)} />
            ))}
          </div>
          <div className="arrows">
            <button type="button" className="icon-btn" aria-label="Previous slide" onClick={() => go(index - 1)}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="icon-btn" aria-label="Next slide" onClick={() => go(index + 1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
