import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Mic, MicOff, Pause, Play, RotateCcw, Square, X } from "lucide-react";
import "./voice.css";

// Voice notes (add-on "Voice notes"): record in the browser (MediaRecorder), listen, then save as a file.
// Used by the owner's note editor (an "audio" block) and the public reply box (one clip per reply).
export const VOICE_MAX = 300; // seconds (5 minutes)
const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg", "audio/aac"];
export const canRecord = () => typeof window !== "undefined" && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia;
const pickType = () => (canRecord() ? TYPES.find((t) => window.MediaRecorder.isTypeSupported?.(t)) || "" : "");
const extOf = (type) => (/mp4|aac/.test(type) ? "m4a" : /ogg/.test(type) ? "ogg" : "webm");
export const clock = (s) => {
  const v = Math.max(0, Math.round(Number(s) || 0));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
};
const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

// the pop-up recorder → onSave(file, { onStep, seconds })
export function VoiceRecorder({ m, onSave, onClose, max = VOICE_MAX, saveLabel }) {
  const [phase, setPhase] = useState(canRecord() ? "ready" : "unsupported"); // ready | asking | rec | paused | done | denied | unsupported
  const [secs, setSecs] = useState(0);
  const [levels, setLevels] = useState(() => Array(28).fill(0.08));
  const [blob, setBlob] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const rec = useRef(null);
  const stream = useRef(null);
  const chunks = useRef([]);
  const ctxRef = useRef(null);
  const timer = useRef(null);
  const raf = useRef(0);
  const startedAt = useRef(0);
  const before = useRef(0); // seconds recorded before a pause
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : ""), [blob]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  const stopAll = () => {
    clearInterval(timer.current);
    cancelAnimationFrame(raf.current);
    try {
      stream.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* already stopped */
    }
    stream.current = null;
    ctxRef.current?.close?.().catch(() => {});
    ctxRef.current = null;
  };
  useEffect(() => () => stopAll(), []);
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && !busy && close();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const tick = () => {
    const s = before.current + (Date.now() - startedAt.current) / 1000;
    setSecs(s);
    if (s >= max) stop();
  };
  const meter = (analyser) => {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128) / 128);
      setLevels((old) => [...old.slice(1), Math.max(0.08, Math.min(1, peak * 1.8))]);
      raf.current = requestAnimationFrame(loop);
    };
    loop();
  };
  const start = async () => {
    setErr("");
    setPhase("asking");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      const type = pickType();
      const r = new window.MediaRecorder(s, type ? { mimeType: type, audioBitsPerSecond: 64000 } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data?.size && chunks.current.push(e.data);
      r.onstop = () => {
        const b = new Blob(chunks.current, { type: r.mimeType || type || "audio/webm" });
        setBlob(b.size ? b : null);
        setPhase(b.size ? "done" : "ready");
        stopAll();
      };
      rec.current = r;
      r.start(500);
      before.current = 0;
      startedAt.current = Date.now();
      setSecs(0);
      timer.current = setInterval(tick, 200);
      try {
        const A = window.AudioContext || window.webkitAudioContext;
        const ac = new A();
        const an = ac.createAnalyser();
        an.fftSize = 512;
        ac.createMediaStreamSource(s).connect(an);
        ctxRef.current = ac;
        meter(an);
      } catch {
        /* no level meter: still records */
      }
      setPhase("rec");
    } catch (e) {
      stopAll();
      setPhase(e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "denied" : "unsupported");
    }
  };
  const pause = () => {
    const r = rec.current;
    if (!r || r.state !== "recording" || !r.pause) return;
    r.pause();
    before.current += (Date.now() - startedAt.current) / 1000;
    clearInterval(timer.current);
    setPhase("paused");
  };
  const resume = () => {
    const r = rec.current;
    if (!r || r.state !== "paused") return;
    r.resume();
    startedAt.current = Date.now();
    timer.current = setInterval(tick, 200);
    setPhase("rec");
  };
  function stop() {
    const r = rec.current;
    clearInterval(timer.current);
    if (r && r.state !== "inactive") {
      if (r.state === "recording") before.current += (Date.now() - startedAt.current) / 1000;
      setSecs(before.current);
      r.stop();
    }
  }
  const again = () => {
    setBlob(null);
    setSecs(0);
    setLevels(Array(28).fill(0.08));
    setPhase("ready");
  };
  function close() {
    if (rec.current && rec.current.state !== "inactive") {
      rec.current.onstop = null;
      try {
        rec.current.stop();
      } catch {
        /* stopped */
      }
    }
    stopAll();
    onClose();
  }
  const save = async () => {
    if (!blob) return;
    setErr("");
    setBusy(m.vcSaving);
    try {
      const type = blob.type || "audio/webm";
      const file = new File([blob], `voice-${stamp()}.${extOf(type)}`, { type: type.split(";")[0] });
      await onSave(file, { onStep: (s) => setBusy(s || m.vcSaving), seconds: Math.round(secs) });
      onClose();
    } catch (e) {
      setErr(e?.message || m.loadFail);
      setBusy("");
    }
  };
  const left = Math.max(0, max - secs);

  return createPortal(
    <div className="vc-back" onMouseDown={(e) => e.target === e.currentTarget && !busy && phase !== "rec" && close()}>
      <div className="vc-card" role="dialog" aria-modal="true" aria-label={m.vcTitle} data-testid="vc-recorder">
        <div className="vc-head">
          <b>
            <Mic size={17} /> {m.vcTitle}
          </b>
          <button type="button" className="vc-x" onClick={close} disabled={!!busy} aria-label={m.close}>
            <X size={18} />
          </button>
        </div>
        {phase === "unsupported" || phase === "denied" ? (
          <div className="vc-empty">
            <span className="vc-empty-ic">
              <MicOff size={28} />
            </span>
            <p>{phase === "denied" ? m.vcDenied : m.vcUnsupported}</p>
            <button type="button" className="vc-btn ghost" onClick={close}>
              {m.close}
            </button>
          </div>
        ) : (
          <>
            <div className={`vc-stage p-${phase}`}>
              <div className="vc-wave" aria-hidden="true">
                {levels.map((v, i) => (
                  <i key={i} style={{ height: `${Math.round(v * 100)}%` }} />
                ))}
              </div>
              <div className="vc-time">
                {phase === "rec" && <span className="vc-dot" />}
                <b>{clock(secs)}</b>
                <small>{phase === "done" ? m.vcDone : m.vcLeft.replace("{t}", clock(left))}</small>
              </div>
            </div>
            {phase === "done" && url && <AudioPlayer src={url} duration={secs} m={m} />}
            {err && <p className="vc-err">{err}</p>}
            <div className="vc-acts">
              {(phase === "ready" || phase === "asking") && (
                <button type="button" className="vc-rec" onClick={start} disabled={phase === "asking"} data-testid="vc-start">
                  {phase === "asking" ? <Loader2 size={22} className="md-spin" /> : <Mic size={22} />}
                  <span>{phase === "asking" ? m.vcAsking : m.vcStart}</span>
                </button>
              )}
              {(phase === "rec" || phase === "paused") && (
                <>
                  {rec.current?.pause && (
                    <button type="button" className="vc-btn ghost" onClick={phase === "rec" ? pause : resume} data-testid="vc-pause">
                      {phase === "rec" ? <Pause size={16} /> : <Play size={16} />} {phase === "rec" ? m.vcPause : m.vcResume}
                    </button>
                  )}
                  <button type="button" className="vc-btn vc-stop" onClick={stop} data-testid="vc-stop">
                    <Square size={15} /> {m.vcStop}
                  </button>
                </>
              )}
              {phase === "done" && (
                <>
                  <button type="button" className="vc-btn ghost" onClick={again} disabled={!!busy}>
                    <RotateCcw size={15} /> {m.vcAgain}
                  </button>
                  <button type="button" className="vc-btn" onClick={save} disabled={!!busy} data-testid="vc-save">
                    {busy ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {busy || saveLabel || m.vcSave}
                  </button>
                </>
              )}
            </div>
            <small className="vc-hint">{m.vcHint.replace("{n}", Math.round(max / 60))}</small>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

const PLAY_WORDS = { vcPlay: "Play", vcPause: "Pause", vcSeek: "Position", vcSpeed: "Speed" };
// a player: play / pause, a wave-like bar to seek, time, speed 1× 1.5× 2× (+ children, e.g. Download)
export function AudioPlayer({ file, src, duration = 0, m: words, onRemove, removeLabel, children, compact }) {
  const m = words || PLAY_WORDS;
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [len, setLen] = useState(duration || file?.duration || 0);
  const [rate, setRate] = useState(1);
  const [bad, setBad] = useState(false);
  const url = src || file?.url || "";
  // a steady pattern of bars from the file id (looks like a voice wave, same every time)
  const bars = useMemo(() => {
    const seed = String(file?._id || url || "x");
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return Array.from({ length: compact ? 28 : 44 }, (_, i) => {
      h = (h * 1103515245 + 12345) >>> 0;
      const v = 0.25 + ((h >>> 8) % 1000) / 1400;
      return Math.min(1, v * (0.55 + 0.45 * Math.sin((i / 44) * Math.PI)));
    });
  }, [file?._id, url, compact]);
  useEffect(() => {
    const a = ref.current;
    if (a) a.playbackRate = rate;
  }, [rate]);
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setBad(true));
    else a.pause();
  };
  const seek = (e) => {
    const a = ref.current;
    const total = len || a?.duration;
    if (!a || !total || !Number.isFinite(total)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, ((e.clientX ?? 0) - r.left) / r.width));
    a.currentTime = x * total;
    setT(a.currentTime);
  };
  const p = len ? Math.min(1, t / len) : 0;
  return (
    <div className={`vc-player ${compact ? "compact" : ""} ${bad ? "bad" : ""}`} data-testid="vc-player">
      <audio
        ref={ref}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => (setPlaying(false), setT(0))}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setLen(d);
        }}
        onError={() => setBad(true)}
      />
      <button type="button" className="vc-play" onClick={toggle} aria-label={playing ? m.vcPause : m.vcPlay} disabled={!url}>
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div className="vc-bars" onClick={seek} role="slider" aria-label={m.vcSeek} aria-valuemin={0} aria-valuemax={Math.round(len)} aria-valuenow={Math.round(t)} tabIndex={0}>
        {bars.map((v, i) => (
          <i key={i} className={i / bars.length < p ? "on" : ""} style={{ height: `${Math.round(v * 100)}%` }} />
        ))}
      </div>
      <span className="vc-ptime">{clock(playing || t ? t : len)}</span>
      <button type="button" className="vc-rate" onClick={() => setRate((r) => (r === 1 ? 1.5 : r === 1.5 ? 2 : 1))} aria-label={m.vcSpeed}>
        {rate}×
      </button>
      {children}
      {onRemove && (
        <button type="button" className="vc-rm" onClick={onRemove} aria-label={removeLabel} title={removeLabel}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}
