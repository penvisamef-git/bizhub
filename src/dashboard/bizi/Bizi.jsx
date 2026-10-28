import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../../i18n/I18nProvider";
import BiziFace from "./BiziFace";
import { biziText } from "./text";
import "./bizi.css";

// the search box downloads the first time it opens (the bubble itself is tiny)
const BiziSearch = lazy(() => import("./BiziSearch"));
const TIP_KEY = "bizi_tip_seen";
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
export default function Bizi() {
  const { lang } = useI18n();
  const x = biziText(lang);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(readPos);
  const [, setTick] = useState(0); // re-place on a window resize
  const [dragging, setDragging] = useState(false);
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

  const px = pos ? toPx(pos) : null;
  // the note sits on the side with more room
  const tipLeft = px && px.left > window.innerWidth / 2;
  const tipStyle = px ? { position: "fixed", top: px.top + SIZE / 2, ...(tipLeft ? { right: window.innerWidth - px.left + 10 } : { left: px.left + SIZE + 10 }), transform: "translateY(-50%)" } : undefined;

  return (
    <>
      <div className={`bizi-corner${open ? " is-open" : ""}${px ? " is-placed" : ""}`}>
        {tip && !open && !dragging && (
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
          <BiziFace mood={dragging ? "happy" : "idle"} size={52} title="Bizi" />
        </button>
      </div>
      {open && (
        <Suspense fallback={null}>
          <BiziSearch onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
