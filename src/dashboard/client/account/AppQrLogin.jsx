import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, EyeOff, Loader2, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { useI18n } from "../../../i18n/I18nProvider";

// "Log in on the BizHub app": a QR code the app scans (app → Login → Log in with QR code).
// A code works once, for 60 seconds; a new one comes by itself while the QR is open (up to 5 minutes).
const AUTO_ROUNDS = 5;

const TEXT = {
  en: {
    title: "Log in on the BizHub app",
    sub: "Scan this code with the app instead of typing your password.",
    step1: "Open the BizHub app on your phone.",
    step2: "On the login screen, tap Log in with QR code.",
    step3: "Point the camera at this code.",
    show: "Show QR code",
    hide: "Hide",
    refresh: "New code",
    changesIn: "New code in {s}s",
    paused: "The code was hidden to keep your account safe.",
    used: "Logged in on the app",
    usedOn: "Logged in on {device}",
    again: "Show a new code",
    warn: "Anyone who scans this code gets into your account. Don't share it or post a photo of it.",
  },
  km: {
    title: "ចូលគណនីក្នុងកម្មវិធី BizHub",
    sub: "ស្កេនកូដនេះដោយកម្មវិធី ជំនួសការវាយពាក្យសម្ងាត់។",
    step1: "បើកកម្មវិធី BizHub នៅលើទូរស័ព្ទរបស់អ្នក។",
    step2: "នៅទំព័រចូលគណនី ចុច ចូលដោយ QR កូដ។",
    step3: "តម្រង់កាមេរ៉ាទៅកូដនេះ។",
    show: "បង្ហាញ QR កូដ",
    hide: "លាក់",
    refresh: "កូដថ្មី",
    changesIn: "កូដថ្មីក្នុង {s} វិនាទី",
    paused: "កូដត្រូវបានលាក់ ដើម្បីសុវត្ថិភាពគណនីរបស់អ្នក។",
    used: "បានចូលគណនីក្នុងកម្មវិធី",
    usedOn: "បានចូលគណនីនៅលើ {device}",
    again: "បង្ហាញកូដថ្មី",
    warn: "អ្នកណាស្កេនកូដនេះ អាចចូលគណនីរបស់អ្នកបាន។ កុំចែករំលែក ឬថតរូបវាផ្ញើទៅអ្នកដទៃ។",
  },
};

// service: { loginQr(), loginQrState(id) } — owner or super admin API
export default function AppQrLogin({ service }) {
  const { lang } = useI18n();
  const x = TEXT[lang] || TEXT.en;
  const [state, setState] = useState("idle"); // idle | loading | showing | used | paused
  const [qr, setQr] = useState(null); // { id, img, until, seconds }
  const [left, setLeft] = useState(0);
  const [device, setDevice] = useState("");
  const [error, setError] = useState("");
  const rounds = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const make = useCallback(
    async (auto = false) => {
      rounds.current = auto ? rounds.current + 1 : 0;
      setError("");
      setState((s) => (s === "showing" ? s : "loading"));
      try {
        const r = await service.loginQr();
        const img = await QRCode.toDataURL(r.data.code, { width: 440, margin: 1, errorCorrectionLevel: "M", color: { dark: "#16171b", light: "#ffffff" } });
        if (!alive.current) return;
        setQr({ id: r.data.id, img, seconds: r.data.seconds, until: Date.now() + r.data.seconds * 1000 });
        setLeft(r.data.seconds);
        setState("showing");
      } catch (err) {
        if (!alive.current) return;
        setError(err.message);
        setQr(null);
        setState("idle");
      }
    },
    [service],
  );

  // countdown → a new code (or pause after 5 minutes / when the tab is in the background)
  useEffect(() => {
    if (state !== "showing" || !qr) return undefined;
    const timer = setInterval(() => {
      const s = Math.max(0, Math.ceil((qr.until - Date.now()) / 1000));
      setLeft(s);
      if (s > 0) return;
      clearInterval(timer);
      if (document.hidden || rounds.current + 1 >= AUTO_ROUNDS) {
        setQr(null);
        setState("paused");
      } else make(true);
    }, 250);
    return () => clearInterval(timer);
  }, [state, qr, make]);

  // has the app scanned it?
  useEffect(() => {
    if (state !== "showing" || !qr) return undefined;
    let busy = false;
    const timer = setInterval(async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const r = await service.loginQrState(qr.id);
        if (alive.current && r.data?.state === "used") {
          setDevice(r.data.device || "");
          setQr(null);
          setState("used");
        }
      } catch {
        /* try again next tick */
      } finally {
        busy = false;
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [state, qr, service]);

  const hide = () => {
    setQr(null);
    setState("idle");
  };

  return (
    <section className="ac-card ac-card-qr">
      <header className="ac-card-head">
        <span className="ac-card-icon">
          <Smartphone size={18} />
        </span>
        <div>
          <h3>{x.title}</h3>
          <p>{x.sub}</p>
        </div>
      </header>

      <div className="aq-body">
        <ol className="aq-steps">
          <li>{x.step1}</li>
          <li>{x.step2}</li>
          <li>{x.step3}</li>
        </ol>

        <div className="aq-box">
          <div className={`aq-frame ${state === "showing" ? "is-live" : ""}`} data-testid="aq-frame">
            {state === "showing" && qr && <img src={qr.img} alt="QR" width="220" height="220" data-testid="aq-img" />}
            {state === "loading" && <Loader2 size={28} className="md-spin" />}
            {state === "used" && (
              <div className="aq-done" data-testid="aq-used">
                <CheckCircle2 size={40} />
                <b>{device ? x.usedOn.replace("{device}", device) : x.used}</b>
              </div>
            )}
            {(state === "idle" || state === "paused") && (
              <div className="aq-cover">
                <QrCode size={64} strokeWidth={1.2} />
                {state === "paused" && <p>{x.paused}</p>}
              </div>
            )}
          </div>

          {state === "showing" && qr && (
            <div className="aq-timer" aria-live="off">
              <div className="aq-bar">
                <i style={{ width: `${(left / qr.seconds) * 100}%` }} />
              </div>
              <span>{x.changesIn.replace("{s}", left)}</span>
            </div>
          )}

          {error && <div className="ac-form-error">{error}</div>}

          <div className="aq-actions">
            {state === "showing" ? (
              <>
                <button type="button" className="ac-btn ac-btn-ghost" onClick={hide}>
                  <EyeOff size={16} /> {x.hide}
                </button>
                <button type="button" className="ac-btn ac-btn-primary" onClick={() => make(false)} data-testid="aq-refresh">
                  <RefreshCw size={16} /> {x.refresh}
                </button>
              </>
            ) : (
              <button type="button" className="ac-btn ac-btn-primary" onClick={() => make(false)} disabled={state === "loading"} data-testid="aq-show">
                <QrCode size={16} /> {state === "used" || state === "paused" ? x.again : x.show}
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="aq-warn">{x.warn}</p>
    </section>
  );
}
