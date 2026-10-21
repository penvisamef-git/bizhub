import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ExternalLink, Lock, MonitorUp, RefreshCw, Tablet } from "lucide-react";
import { usePosText } from "../text";
import { usePos } from "../engine";
import { remoteDisplay, remoteDisplayKey, remoteDisplayOff } from "../display";
import { Sheet } from "./Modals";

const DISPLAY_PATH = "/pos/restaurant/display";

// Customer display: open it on a 2nd monitor of this computer, or link another tablet
export default function DisplaySheet({ onClose }) {
  const { t } = usePosText();
  const s = usePos();
  const [key, setKey] = useState(remoteDisplayKey());
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const link = key ? `${location.origin}${DISPLAY_PATH}?key=${key}` : "";
  useEffect(() => {
    if (link) QRCode.toDataURL(link, { width: 260, margin: 1 }).then(setQr);
    else setQr("");
  }, [link]);

  const linkTablet = async (renew) => {
    setBusy(true);
    setError("");
    try {
      setKey(await remoteDisplay(renew));
    } catch (e) {
      setError(e.status === 0 ? t.needInternetShort : e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!s.setup?.display) {
    return (
      <Sheet title={t.customerDisplay} onClose={onClose}>
        <div className="pos-display-locked">
          <span className="pos-display-ic">
            <Lock size={22} />
          </span>
          <b>{t.displayLocked}</b>
          <p className="pos-muted">{t.displayLockedSub}</p>
        </div>
      </Sheet>
    );
  }
  return (
    <Sheet title={t.customerDisplay} onClose={onClose}>
      <div className="pos-display-opts">
        <section className="pos-display-opt">
          <span className="pos-display-ic">
            <MonitorUp size={22} />
          </span>
          <div>
            <b>{t.displaySame}</b>
            <p className="pos-muted">{t.displaySameSub}</p>
          </div>
          <button type="button" className="pos-btn primary" onClick={() => window.open(DISPLAY_PATH, "bizhub-display", "popup,width=1024,height=700")}>
            <ExternalLink size={17} /> {t.openDisplay}
          </button>
        </section>

        <section className="pos-display-opt">
          <span className="pos-display-ic">
            <Tablet size={22} />
          </span>
          <div>
            <b>{t.displayTablet}</b>
            <p className="pos-muted">{t.displayTabletSub}</p>
          </div>
          {!key && (
            <button type="button" className="pos-btn" onClick={() => linkTablet(false)} disabled={busy || !s.online}>
              {busy ? t.loadingReport : t.linkTablet}
            </button>
          )}
        </section>
        {error && <div className="pos-note warn">{error}</div>}
        {key && (
          <div className="pos-display-link">
            {qr && <img src={qr} alt="" />}
            <div>
              <p className="pos-muted">{t.scanDisplay}</p>
              <code>{link}</code>
              <div className="pos-row-btns">
                <button type="button" className="pos-btn small" onClick={() => linkTablet(true)} disabled={busy}>
                  <RefreshCw size={15} /> {t.newLink}
                </button>
                <button
                  type="button"
                  className="pos-btn small danger"
                  onClick={async () => {
                    await remoteDisplayOff();
                    setKey(null);
                  }}
                >
                  {t.turnOff}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
