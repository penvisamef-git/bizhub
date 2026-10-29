// "Meet Bizi" on the homepage (v3.2.0): what Bizi is, and a little box where it works by itself on a sample shop —
// it types "#12 paid", finds the order, asks, says Yes… (bizi-home.js DEMO). Nothing real, nothing sent anywhere.
// It only plays while the box is on the screen, and stays still for people who prefer less motion.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, Languages, Search, Sparkles, Wand2 } from "lucide-react";
import { ROUTES } from "../config";
import BiziFace from "../dashboard/bizi/BiziFace";
import { DEMO } from "./bizi-home";

const still = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function Demo({ t, lang }) {
  const steps = DEMO[lang] || DEMO.en;
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(still() ? steps[0].q : "");
  const [phase, setPhase] = useState(still() ? "asked" : "typing"); // typing → found → asked → yes → done
  const [seen, setSeen] = useState(false);
  const box = useRef(null);

  // play only while it can be seen
  useEffect(() => {
    if (!box.current || typeof IntersectionObserver === "undefined") return setSeen(true);
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.35 });
    io.observe(box.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || still()) return undefined;
    let stop = false;
    (async () => {
      let n = i;
      while (!stop) {
        const s = steps[n];
        setI(n);
        setPhase("typing");
        for (let k = 0; k <= s.q.length && !stop; k++) {
          setTyped(s.q.slice(0, k));
          await wait(70);
        }
        await wait(500);
        if (stop) break;
        setPhase("found");
        await wait(s.help ? 3800 : 1100);
        if (stop) break;
        if (!s.help) {
          setPhase("asked");
          await wait(1500);
          if (stop) break;
          setPhase("yes");
          await wait(350);
          setPhase("done");
          await wait(2000);
        }
        n = (n + 1) % steps.length;
      }
    })();
    return () => {
      stop = true;
    };
  }, [seen, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = steps[i];
  const mood = phase === "typing" ? "listening" : phase === "found" ? (s.help ? "talking" : "thinking") : phase === "done" ? "happy" : "talking";
  return (
    <div className="hx-bizi-demo" ref={box} aria-label={t.biziDemoLabel} role="img" data-testid="hx-bizi-demo">
      <div className="hx-bd-top">
        <BiziFace mood={mood} size={44} />
        <span className="hx-bd-input">
          <Search size={16} aria-hidden="true" />
          <span>{typed}</span>
          {phase === "typing" && <i className="hx-bd-caret" />}
        </span>
      </div>
      <div className="hx-bd-body">
        {phase !== "typing" && s.row && (
          <div className="hx-bd-row">
            <span>
              <b>{s.row[0]}</b>
              <small>{s.row[1]}</small>
            </span>
            {s.row[2] && <em>{s.row[2]}</em>}
          </div>
        )}
        {phase === "found" && s.row && <span className="hx-bd-act">{s.act}</span>}
        {(phase === "asked" || phase === "yes") && (
          <div className="hx-bd-ask">
            <span>{s.ask}</span>
            <span className={`hx-bd-btn yes${phase === "yes" ? " press" : ""}`}>{t.biziYes}</span>
            <span className="hx-bd-btn">{t.biziNo}</span>
          </div>
        )}
        {phase === "done" && <div className="hx-bd-ok">✓ {s.ok}</div>}
        {phase !== "typing" && s.help && (
          <ol className="hx-bd-help">
            {s.help.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
        )}
      </div>
      <small className="hx-bd-note">{t.biziDemoLabel}</small>
    </div>
  );
}

export default function MeetBizi({ t, lang, onAsk }) {
  const points = [
    [Search, t.biziP1, t.biziP1d],
    [BellRing, t.biziP2, t.biziP2d],
    [Wand2, t.biziP3, t.biziP3d],
    [Languages, t.biziP4, t.biziP4d],
  ];
  return (
    <section id="bizi" className="hx-section hx-bizi-wrap">
      <div className="wrap hx-bizi">
        <div className="hx-bizi-text">
          <span className="hx-bizi-tag">
            <Sparkles size={14} aria-hidden="true" /> {t.biziTag}
          </span>
          <h2>{t.biziTitle}</h2>
          <p>{t.biziSub}</p>
          <ul>
            {points.map(([Icon, title, desc]) => (
              <li key={title}>
                <Icon size={20} aria-hidden="true" />
                <span>
                  <b>{title}</b>
                  <small>{desc}</small>
                </span>
              </li>
            ))}
          </ul>
          <div className="hx-bizi-acts">
            <Link className="btn btn-primary" to={ROUTES.signUp} data-testid="hx-bizi-signup">
              {t.biziCta}
            </Link>
            <button type="button" className="btn btn-secondary" onClick={onAsk} data-testid="hx-bizi-ask">
              {t.biziAsk}
            </button>
          </div>
        </div>
        <Demo t={t} lang={lang} />
      </div>
    </section>
  );
}
