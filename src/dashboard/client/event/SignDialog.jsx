import { useEffect, useRef, useState } from "react";
import { Eraser, Loader2, PenLine, Upload, X } from "lucide-react";

const INKS = ["#111827", "#1e3a8a", "#0f766e"];
// sign on screen (finger, pen or mouse) or upload a picture of a signature → a PNG file
export function SignDialog({ t, onClose, onSave }) {
  const [tab, setTab] = useState("draw");
  const [ink, setInk] = useState(INKS[0]);
  const [has, setHas] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const cv = useRef(null);
  const last = useRef(null);
  const pick = useRef(null);
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const r = window.devicePixelRatio || 1;
    c.width = c.clientWidth * r;
    c.height = c.clientHeight * r;
    const g = c.getContext("2d");
    g.scale(r, r);
    g.lineCap = "round";
    g.lineJoin = "round";
  }, [tab]);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const at = (e) => {
    const b = cv.current.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top, p: e.pressure || 0.5 };
  };
  const down = (e) => {
    cv.current.setPointerCapture(e.pointerId);
    last.current = at(e);
  };
  const move = (e) => {
    if (!last.current) return;
    const p = at(e);
    const g = cv.current.getContext("2d");
    g.strokeStyle = ink;
    g.lineWidth = 1.6 + (e.pointerType === "pen" ? p.p * 3 : 1.6);
    g.beginPath();
    g.moveTo(last.current.x, last.current.y);
    g.lineTo(p.x, p.y);
    g.stroke();
    last.current = p;
    setHas(true);
  };
  const up = () => (last.current = null);
  const clear = () => {
    const c = cv.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setHas(false);
  };
  // cut the empty space around the drawing so the signature sits well on the certificate
  const drawn = () =>
    new Promise((ok) => {
      const c = cv.current;
      const g = c.getContext("2d");
      const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
      let x0 = width, y0 = height, x1 = 0, y1 = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
          if (data[(y * width + x) * 4 + 3] > 10) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
      const pad = 8;
      x0 = Math.max(0, x0 - pad);
      y0 = Math.max(0, y0 - pad);
      const w = Math.min(width, x1 + pad) - x0;
      const h = Math.min(height, y1 + pad) - y0;
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      out.getContext("2d").drawImage(c, x0, y0, w, h, 0, 0, w, h);
      out.toBlob((b) => ok(new File([b], "signature.png", { type: "image/png" })), "image/png");
    });
  const save = async () => {
    setBusy(true);
    try {
      const f = tab === "draw" ? await drawn() : file;
      if (f && (await onSave(f))) onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ev-sign-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ev-sign panel-card" role="dialog" aria-modal="true" data-testid="ev-sign">
        <div className="ev-sign-head">
          <b>{t.signTitle}</b>
          <button type="button" className="md-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="ev-seg" role="tablist">
          <button type="button" className={tab === "draw" ? "on" : ""} onClick={() => setTab("draw")} data-testid="ev-sign-draw">
            <PenLine size={14} /> {t.signDraw}
          </button>
          <button type="button" className={tab === "upload" ? "on" : ""} onClick={() => setTab("upload")} data-testid="ev-sign-upload">
            <Upload size={14} /> {t.signUpload}
          </button>
        </div>
        {tab === "draw" ? (
          <>
            <div className="ev-sign-pad">
              <canvas ref={cv} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} data-testid="ev-sign-canvas" />
              {!has && <span>{t.signHere}</span>}
              <i />
            </div>
            <div className="ev-sign-tools">
              {INKS.map((c) => (
                <button key={c} type="button" className={`ev-ink ${ink === c ? "on" : ""}`} style={{ background: c }} onClick={() => setInk(c)} aria-label={c} />
              ))}
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" style={{ marginLeft: "auto" }} onClick={clear} disabled={!has}>
                <Eraser size={14} /> {t.signClear}
              </button>
            </div>
          </>
        ) : (
          <>
            <button type="button" className={`ev-sign-file ${preview ? "has" : ""}`} onClick={() => pick.current?.click()}>
              {preview ? <img src={preview} alt="" /> : <Upload size={26} />}
              <span>{file ? file.name : t.signPick}</span>
            </button>
            <small className="rs-muted">{t.signTip}</small>
            <input
              ref={pick}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setFile(f);
                setPreview(URL.createObjectURL(f));
              }}
            />
          </>
        )}
        <div className="ev-btn-row">
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" style={{ marginLeft: "auto" }} onClick={save} disabled={busy || (tab === "draw" ? !has : !file)} data-testid="ev-sign-save">
            {busy ? <Loader2 size={14} className="md-spin" /> : <PenLine size={14} />} {t.signSave}
          </button>
        </div>
      </div>
    </div>
  );
}
export default SignDialog;
