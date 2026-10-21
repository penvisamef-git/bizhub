import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Coins, CreditCard, ScanLine, X } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import { myWalletService } from "../../api/services";
import { coinsChanged } from "../../lib/events";
import { typeCode } from "../../lib/topupCard";
import { auth } from "../../lib/auth";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const canScan = typeof window !== "undefined" && "BarcodeDetector" in window;

// Camera QR scanner (Chrome / Android). Phones without it use the camera app: the QR is a link.
function Scanner({ onCode, onClose, t }) {
  const videoRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream;
    let stop = false;
    (async () => {
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const tick = async () => {
          if (stop) return;
          try {
            const found = await detector.detect(videoRef.current);
            const value = found[0]?.rawValue;
            if (value && typeCode(value).replace(/\D/g, "").length === 12) {
              onCode(value);
              return;
            }
          } catch {
            /* frame not ready */
          }
          setTimeout(tick, 250);
        };
        tick();
      } catch {
        setError(t.scanNoSupport);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onCode, t]);

  return (
    <div className="md-modal-backdrop" onMouseDown={onClose}>
      <div className="md-modal md-modal-sm" role="dialog" aria-modal="true" aria-label={t.scanQr} onMouseDown={(e) => e.stopPropagation()}>
        <div className="md-modal-header">
          <h3>{t.scanQr}</h3>
          <button type="button" className="md-icon-btn" onClick={onClose} aria-label={t.close}>
            <X size={18} />
          </button>
        </div>
        <div className="md-modal-body">
          {error ? (
            <div className="md-form-error">{error}</div>
          ) : (
            <p className="md-hint" style={{ margin: 0 }}>
              {t.scanHint}
            </p>
          )}
          <video ref={videoRef} className="rc-video" muted playsInline />
        </div>
      </div>
    </div>
  );
}

// The wallet's 3 big buttons: buy coins online · type a top-up card code · scan the card QR (scanned = redeemed at once)
export default function RedeemCard({ onRedeemed }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(() => typeCode(params.get("redeem") || ""));
  const [fromLink] = useState(() => !!params.get("redeem"));
  const [open, setOpen] = useState(() => !!params.get("redeem"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scanning, setScanning] = useState(false);
  const [noScan, setNoScan] = useState(false);
  const inputRef = useRef(null);
  const digits = code.replace(/\D/g, "");

  // opened from a QR link: keep the code, clean the address bar
  useEffect(() => {
    if (params.get("redeem")) setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const submit = async (e, value) => {
    e?.preventDefault();
    const d = (value ?? code).replace(/\D/g, "");
    setError("");
    setSuccess("");
    if (d.length !== 12) return setError(t.cardSub);
    setBusy(true);
    try {
      const r = await myWalletService.redeem(d);
      setSuccess(t.redeemOk.replace("{coins}", fmt(r.data.amount)));
      setCode("");
      setOpen(false);
      auth.setClientLogin({ ...auth.getClientLogin(), coin_balance: r.data.balance });
      coinsChanged();
      onRedeemed?.(r.data);
    } catch (err) {
      setOpen(true);
      setError(err.code === "NETWORK" ? t.networkError : err.status === 429 ? t.tooManyTries : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cl-actions-wrap">
      <section className="cl-actions" aria-label={t.buyCoins}>
        <button type="button" className="cl-action" onClick={() => navigate("/app/licenses?tab=coins")} data-testid="wallet-buy">
          <i>
            <Coins size={22} />
          </i>
          <b>{t.buyCoins}</b>
        </button>
        <button type="button" className="cl-action" onClick={() => (setError(""), setSuccess(""), setOpen(true))} data-testid="wallet-card">
          <i>
            <CreditCard size={22} />
          </i>
          <b>{t.walletCard}</b>
        </button>
        <button type="button" className="cl-action" onClick={() => (setSuccess(""), canScan ? setScanning(true) : setNoScan(true))} data-testid="wallet-scan">
          <i>
            <ScanLine size={22} />
          </i>
          <b>{t.scanQr}</b>
        </button>
      </section>
      {success && (
        <div className="rc-success" role="status">
          {success}
        </div>
      )}
      {noScan && (
        <div className="md-form-error" role="alert">
          {t.scanNoSupport}
        </div>
      )}
      {open && (
        <div className="md-modal-backdrop" onMouseDown={() => !busy && setOpen(false)}>
          <form className="md-modal md-modal-sm rc-card" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.cardTitle}>
            <div className="md-modal-header">
              <div className="rc-head">
                <span className="rc-icon">
                  <CreditCard size={20} />
                </span>
                <div>
                  <h2>{t.cardTitle}</h2>
                  <p>{t.cardSub}</p>
                </div>
              </div>
              <button type="button" className="md-icon-btn" onClick={() => setOpen(false)} aria-label={t.close} disabled={busy}>
                <X size={18} />
              </button>
            </div>
            <div className="md-modal-body rc-form">
              <input
                ref={inputRef}
                className="rc-input"
                value={code}
                onChange={(e) => {
                  setCode(typeCode(e.target.value));
                  setError("");
                }}
                placeholder={t.cardCodePh}
                inputMode="numeric"
                autoComplete="off"
                aria-label={t.cardTitle}
                disabled={busy}
              />
              {fromLink && !error && digits.length === 12 && <p className="rc-info">{t.redeemFromLink}</p>}
              {error && (
                <div className="md-form-error" role="alert">
                  {error}
                </div>
              )}
              <button type="submit" className="md-btn md-btn-primary" disabled={busy || digits.length !== 12}>
                {busy ? t.redeeming : t.redeemBtn}
              </button>
            </div>
          </form>
        </div>
      )}
      {scanning && (
        <Scanner
          t={t}
          onClose={() => setScanning(false)}
          onCode={(value) => {
            setScanning(false);
            setCode(typeCode(value));
            submit(null, typeCode(value)); // the card is in hand: top up straight away
          }}
        />
      )}
    </div>
  );
}
