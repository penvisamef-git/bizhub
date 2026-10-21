import { useEffect, useRef, useState } from "react";
import { CameraOff, Loader2 } from "lucide-react";

// A camera QR reader that works on every phone: the browser's own BarcodeDetector when there is one
// (Android Chrome), otherwise jsQR on video frames (iPhone Safari, Firefox…). Keeps scanning until unmounted;
// the same code is reported again only after `repeatMs`.
export default function QrScanner({ onCode, paused = false, repeatMs = 2500, className = "", texts = {} }) {
  const video = useRef(null);
  const [state, setState] = useState("starting"); // starting | on | denied | none
  const last = useRef({ code: "", at: 0 });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const cb = useRef(onCode);
  cb.current = onCode;

  useEffect(() => {
    let stream = null;
    let stop = false;
    let raf = 0;
    let timer = 0;
    const found = (code) => {
      if (!code || pausedRef.current) return;
      const now = Date.now();
      if (code === last.current.code && now - last.current.at < repeatMs) return;
      last.current = { code, at: now };
      if (navigator.vibrate) navigator.vibrate(60);
      cb.current(code);
    };
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setState("none");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch {
        return setState("denied");
      }
      if (stop) return stream.getTracks().forEach((t) => t.stop());
      const v = video.current;
      v.srcObject = stream;
      v.setAttribute("playsinline", "true");
      await v.play().catch(() => {});
      setState("on");
      let detector = null;
      if ("BarcodeDetector" in window) {
        try {
          detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        } catch {
          detector = null;
        }
      }
      if (detector) {
        const loop = async () => {
          if (stop) return;
          if (v.readyState >= 2 && !pausedRef.current) {
            try {
              const codes = await detector.detect(v);
              if (codes[0]?.rawValue) found(codes[0].rawValue);
            } catch {
              /* frame not ready */
            }
          }
          timer = setTimeout(() => (raf = requestAnimationFrame(loop)), 120);
        };
        loop();
        return;
      }
      const { default: jsQR } = await import("jsqr");
      const canvas = document.createElement("canvas");
      const cx = canvas.getContext("2d", { willReadFrequently: true });
      const loop = () => {
        if (stop) return;
        if (v.readyState >= 2 && !pausedRef.current && v.videoWidth) {
          // the middle of the picture, made smaller: fast enough on older phones
          const size = Math.min(v.videoWidth, v.videoHeight);
          const sx = (v.videoWidth - size) / 2;
          const sy = (v.videoHeight - size) / 2;
          const out = Math.min(640, size);
          canvas.width = out;
          canvas.height = out;
          cx.drawImage(v, sx, sy, size, size, 0, 0, out, out);
          const r = jsQR(cx.getImageData(0, 0, out, out).data, out, out, { inversionAttempts: "dontInvert" });
          if (r?.data) found(r.data);
        }
        timer = setTimeout(() => (raf = requestAnimationFrame(loop)), 150);
      };
      loop();
    })();
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [repeatMs]);

  return (
    <div className={`qrs ${className}`}>
      <video ref={video} muted playsInline />
      {state === "on" && <span className="qrs-frame" />}
      {state === "starting" && (
        <span className="qrs-msg">
          <Loader2 size={26} className="qrs-spin" />
        </span>
      )}
      {(state === "denied" || state === "none") && (
        <span className="qrs-msg">
          <CameraOff size={30} />
          <small>{state === "denied" ? texts.denied || "Allow the camera to scan tickets." : texts.none || "This browser can't open the camera — type the code below."}</small>
        </span>
      )}
    </div>
  );
}
