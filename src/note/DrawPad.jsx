import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Eraser, Loader2, PenLine, Signature, Undo2, X } from "lucide-react";
import "./drawpad.css";

// The "Signature & pen" pop-up: sign on a line or draw freely with a finger, mouse or stylus.
// Saves a PNG (white paper; a signature gets "Signed by <name> · date" under the line) → onSave(file).
// Used by the owner's note editor (a "draw" block) and the public page (a signature on a reply). No onSave = just a try-out.
const W = 900; // drawing space (the canvas is scaled to fit the screen)
const H = { sign: 400, draw: 600 };
const INK = ["#16171b", "#1d4ed8", "#d93025"];
const WIDTH = { sign: [3.2, 5.5], draw: [4, 10] };
const LINE_Y = 0.68; // the signing line, as a share of the height

const two = (n) => String(n).padStart(2, "0");
const stamp = (d = new Date()) => `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}`;

function strokePath(ctx, s) {
  const p = s.points;
  if (!p.length) return;
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (p.length === 1) {
    ctx.beginPath();
    ctx.arc(p[0][0], p[0][1], (s.width * (p[0][2] || 1)) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // smooth: a curve through the middle of each pair of points; the width follows the pen pressure
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1];
    const b = p[i];
    const ma = i === 1 ? a : [(p[i - 2][0] + a[0]) / 2, (p[i - 2][1] + a[1]) / 2];
    const mb = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.lineWidth = s.width * ((a[2] + b[2]) / 2 || 1);
    ctx.beginPath();
    ctx.moveTo(ma[0], ma[1]);
    ctx.quadraticCurveTo(a[0], a[1], mb[0], mb[1]);
    ctx.stroke();
  }
  const last = p[p.length - 1];
  const prev = p[p.length - 2];
  ctx.beginPath();
  ctx.moveTo((prev[0] + last[0]) / 2, (prev[1] + last[1]) / 2);
  ctx.lineTo(last[0], last[1]);
  ctx.stroke();
}

function paint(ctx, { strokes, mode, h, guide, caption }) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, h);
  if (mode === "sign") {
    const y = Math.round(h * LINE_Y);
    ctx.strokeStyle = guide ? "#c9ccd4" : "#9aa0ad";
    ctx.lineWidth = 2;
    ctx.setLineDash(guide ? [10, 8] : []);
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(W - 60, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#9aa0ad";
    ctx.font = "600 34px system-ui, sans-serif";
    ctx.fillText("×", 62, y - 14);
    if (caption) {
      ctx.fillStyle = "#4b5060";
      ctx.font = "500 26px 'Kantumruy Pro', 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillText(caption, 60, y + 46, W - 120);
    }
  }
  for (const s of strokes) strokePath(ctx, s);
  ctx.restore();
}

export default function DrawPad({ m, initialMode = "sign", modes = ["sign", "draw"], name = "", askName = false, saveLabel, onSave, onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [color, setColor] = useState(INK[0]);
  const [thick, setThick] = useState(0);
  const [strokes, setStrokes] = useState([]);
  const [who, setWho] = useState(name);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(""); // "Uploading 40%" while saving
  const [err, setErr] = useState("");
  const canvas = useRef(null);
  const live = useRef(null); // the stroke being drawn
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;
  const h = H[mode];
  const caption = mode === "sign" && who.trim() ? m.signedBy.replace("{name}", who.trim()).replace("{date}", new Date().toLocaleDateString(m.lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" })) : "";

  const redraw = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.setTransform(c.width / W, 0, 0, c.width / W, 0, 0);
    const list = live.current ? [...strokesRef.current, live.current] : strokesRef.current;
    paint(ctx, { strokes: list, mode, h, guide: true, caption });
  }, [mode, h, caption]);

  // sharp on every screen: the canvas has 2× (or the device's) pixels of the drawing space
  useLayoutEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const scale = Math.min(3, Math.max(2, window.devicePixelRatio || 1)) / 2;
    c.width = Math.round(W * scale);
    c.height = Math.round((c.width * h) / W);
    redraw();
  }, [h, redraw]);
  useEffect(() => redraw(), [strokes, redraw]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setStrokes((l) => l.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [busy, onClose]);

  const at = (e) => {
    const r = canvas.current.getBoundingClientRect();
    const pressure = e.pointerType === "pen" && e.pressure > 0 ? 0.55 + e.pressure * 0.9 : 1;
    return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * h) / r.height, pressure];
  };
  const down = (e) => {
    if (busy || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    canvas.current.setPointerCapture?.(e.pointerId);
    live.current = { color, width: WIDTH[mode][thick], points: [at(e)], id: e.pointerId };
    setErr("");
    redraw();
  };
  const move = (e) => {
    const s = live.current;
    if (!s || s.id !== e.pointerId) return;
    e.preventDefault();
    const evs = e.nativeEvent.getCoalescedEvents ? e.nativeEvent.getCoalescedEvents() : [e.nativeEvent];
    for (const ev of evs.length ? evs : [e.nativeEvent]) {
      const p = at(ev);
      const last = s.points[s.points.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 1.2) s.points.push(p);
    }
    redraw();
  };
  const up = (e) => {
    const s = live.current;
    if (!s || s.id !== e.pointerId) return;
    live.current = null;
    setStrokes((l) => [...l, s]);
  };

  const switchMode = (k) => {
    if (k === mode) return;
    setMode(k);
    setStrokes([]);
    setThick(0);
  };
  const save = async () => {
    if (!strokes.length) return setErr(m.padEmpty);
    if (mode === "sign" && askName && !who.trim()) return setErr(m.pubNeedName);
    setBusy(true);
    setErr("");
    try {
      // a clean copy (solid line, no guide marks) at 2× the drawing space
      const out = document.createElement("canvas");
      out.width = W * 2;
      out.height = h * 2;
      const ctx = out.getContext("2d");
      ctx.scale(2, 2);
      paint(ctx, { strokes, mode, h, guide: false, caption });
      const blob = await new Promise((ok) => out.toBlob(ok, "image/png"));
      if (!blob) throw new Error(m.loadFail);
      const file = new File([blob], `${mode === "sign" ? "signature" : "drawing"}-${stamp()}.png`, { type: "image/png" });
      // last resort: whatever happens, the button stops spinning after 4 minutes
      let timer;
      await Promise.race([
        onSave(file, { mode, name: who.trim(), onStep: setStep }),
        new Promise((_, bad) => (timer = setTimeout(() => bad(new Error(m.padTimeout || m.loadFail)), 240000))),
      ]).finally(() => clearTimeout(timer));
      onClose();
    } catch (e) {
      setErr(e?.message || m.loadFail);
      setBusy(false);
      setStep("");
    }
  };

  return createPortal(
    <div className="dp-back" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="dp-modal" role="dialog" aria-modal="true" aria-labelledby="dp-title">
        <div className="dp-head">
          <h2 id="dp-title">
            {mode === "sign" ? <Signature size={19} /> : <PenLine size={19} />} {m.padTitle}
          </h2>
          <button type="button" className="dp-x" onClick={onClose} disabled={busy} aria-label={m.close}>
            <X size={18} />
          </button>
        </div>
        {modes.length > 1 && (
          <div className="dp-modes" role="tablist">
            {modes.map((k) => (
              <button key={k} type="button" role="tab" aria-selected={mode === k} className={mode === k ? "on" : ""} onClick={() => switchMode(k)}>
                {k === "sign" ? <Signature size={15} /> : <PenLine size={15} />} {k === "sign" ? m.modeSign : m.modeDraw}
              </button>
            ))}
          </div>
        )}
        <div className={`dp-paper m-${mode}`}>
          <canvas ref={canvas} className="dp-canvas" style={{ aspectRatio: `${W} / ${h}` }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={(e) => e.pointerType === "mouse" && up(e)} aria-label={mode === "sign" ? m.signHere : m.modeDraw} data-testid="dp-canvas" />
          {!strokes.length && <span className="dp-hint">{mode === "sign" ? m.signHere : m.drawHere}</span>}
        </div>
        <div className="dp-tools">
          <div className="dp-inks" role="radiogroup" aria-label={m.pen}>
            {INK.map((c, i) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} className={`dp-ink ${color === c ? "on" : ""}`} style={{ "--ink": c }} onClick={() => setColor(c)} aria-label={m.inks[i]} title={m.inks[i]} />
            ))}
            <span className="dp-sep" />
            {[0, 1].map((k) => (
              <button key={k} type="button" className={`dp-width ${thick === k ? "on" : ""}`} onClick={() => setThick(k)} aria-pressed={thick === k} title={k ? m.thick : m.thin} aria-label={k ? m.thick : m.thin}>
                <i style={{ height: k ? 6 : 3 }} />
              </button>
            ))}
          </div>
          <div className="dp-acts">
            <button type="button" className="dp-btn ghost" onClick={() => setStrokes((l) => l.slice(0, -1))} disabled={!strokes.length || busy}>
              <Undo2 size={16} /> <span>{m.undo}</span>
            </button>
            <button type="button" className="dp-btn ghost" onClick={() => setStrokes([])} disabled={!strokes.length || busy}>
              <Eraser size={16} /> <span>{m.clear}</span>
            </button>
          </div>
        </div>
        {mode === "sign" && (
          <label className="dp-name">
            <span>{m.padName}</span>
            <input value={who} onChange={(e) => setWho(e.target.value.slice(0, 80))} placeholder={m.pubNamePh} maxLength={80} />
          </label>
        )}
        {err && <p className="dp-err">{err}</p>}
        <div className="dp-foot">
          <button type="button" className="dp-btn ghost" onClick={onClose} disabled={busy}>
            {onSave ? m.cancel : m.close}
          </button>
          {onSave && (
            <button type="button" className="dp-btn" onClick={save} disabled={busy} data-testid="dp-save">
              {busy ? <Loader2 size={16} className="md-spin" /> : <Check size={16} />} {busy && step ? step : saveLabel || m.padSave}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
