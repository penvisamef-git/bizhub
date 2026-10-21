import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Pause, Play } from "lucide-react";
import { ROUTES } from "../config";
import { DashboardMock, OfflineMock, WalletMock } from "./HeroCarousel";

const SLIDE_MS = 6500;

// a browser building a website block by block, then "Publish"
function WebsiteMock({ t }) {
  return (
    <div className="hx-web panel float">
      <div className="hx-web-bar">
        <i />
        <i />
        <i />
        <span>/site/sokha-coffee</span>
      </div>
      <div className="hx-web-hero">
        <b>Sokha Coffee</b>
        <small>{t.s4b}</small>
      </div>
      <div className="hx-web-cards">
        <span />
        <span />
        <span />
      </div>
      <div className="hx-web-lines">
        <span />
        <span />
      </div>
      <span className="hx-web-pub">
        <Check size={14} strokeWidth={3} /> {t.publish}
      </span>
    </div>
  );
}

// The banner: 4 slides that run by themselves (6.5 s each). Tabs at the bottom show progress and jump to a slide.
// Pauses on hover / keyboard focus / when the tab is hidden; swipe on phones; still for people who ask for less motion.
export default function HeroBanner({ t, methods = ["KHQR", "ABA", "Card"], bonus = "200" }) {
  const slides = [
    { tab: t.dashTitle, a: t.s1a, b: t.s1b, d: t.heroSub, href: "#services", second: t.ctaServices, visual: <DashboardMock t={t} /> },
    { tab: t.s2e, a: t.s2a, b: t.s2b, d: t.s2d, href: "#why", second: t.more, visual: <OfflineMock t={t} /> },
    { tab: t.s4e, a: t.s4a, b: t.s4b, d: t.s4d, href: "#services", second: t.ctaServices, visual: <WebsiteMock t={t} /> },
    { tab: t.s3e, a: t.s3a, b: t.s3b, d: t.s3d, href: "#coins", second: t.coinTitle, visual: <WalletMock t={t} methods={methods} bonus={bonus} /> },
  ];
  const n = slides.length;
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(false); // hover / focus
  const [stopped, setStopped] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [hidden, setHidden] = useState(false);
  const touch = useRef(null);
  const go = useCallback((i) => setIndex(((i % n) + n) % n), [n]);
  const running = !hold && !stopped && !hidden;

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  useEffect(() => {
    if (!running) return undefined;
    const tm = setTimeout(() => go(index + 1), SLIDE_MS);
    return () => clearTimeout(tm);
  }, [index, running, go]);

  return (
    <section
      id="top"
      className={`hx-hero${running ? " running" : ""}`}
      aria-roledescription="carousel"
      aria-label={t.heroLabel}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
    >
      <div className="hx-stage">
        <div className="hx-glow g1" />
        <div className="hx-glow g2" />
        <div className="hx-grid" />
        <div className="hx-slides">
          {slides.map((s, i) => (
            <div key={i} className={`hx-slide${i === index ? " on" : ""}`} aria-hidden={i !== index} role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${n}`}>
              <div className="hx-text">
                <h1>
                  <span>{s.a}</span> <span className="hx-soft">{s.b}</span>
                </h1>
                <p>{s.d}</p>
                <div className="hx-ctas">
                  <Link className="btn hx-btn-main" to={ROUTES.signUp} tabIndex={i === index ? 0 : -1}>
                    {t.ctaStart}
                  </Link>
                  <a className="btn hx-btn-ghost" href={s.href} tabIndex={i === index ? 0 : -1}>
                    {s.second}
                  </a>
                </div>
              </div>
              <div className="hx-visual">{s.visual}</div>
            </div>
          ))}
        </div>
        <div className="hx-tabs" role="tablist">
          {slides.map((s, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === index} className={`hx-tab${i === index ? " on" : ""}${i < index ? " done" : ""}`} onClick={() => go(i)} style={{ "--ms": `${SLIDE_MS}ms` }} data-testid={`hx-tab-${i}`}>
              <span className="hx-bar">
                <i key={`${index}-${running}`} />
              </span>
              <span className="hx-tab-label">{s.tab}</span>
            </button>
          ))}
          <button type="button" className="hx-play" onClick={() => setStopped((v) => !v)} aria-label={stopped ? t.play : t.pause} title={stopped ? t.play : t.pause}>
            {stopped ? <Play size={15} /> : <Pause size={15} />}
          </button>
        </div>
      </div>
    </section>
  );
}
