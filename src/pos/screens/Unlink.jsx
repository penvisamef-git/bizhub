import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, Unplug } from "lucide-react";
import { usePosText } from "../text";
import { openShift, pending, syncNow, unlink, usePos } from "../engine";
import { nameOf } from "../util";
import Keypad, { PinDots } from "./Keypad";
import { Sheet } from "./Modals";

// Unlink this device from the shop. A manager types their PIN (any staff PIN when the shop has no manager).
// Sales not sent yet must go first; offline, the staff has to accept losing them.
export default function UnlinkSheet({ onClose }) {
  const { t, lang } = usePosText();
  const s = usePos();
  const waiting = pending(s);
  const shift = s.setup ? openShift(s) : null;
  const hasManager = (s.setup?.staff || []).some((x) => x.role === "manager");
  const needPin = !!s.setup; // no menu downloaded yet → nothing to protect
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lose, setLose] = useState(false);
  const blocked = waiting > 0 && (s.online ? true : !lose);

  const go = async (p) => {
    setBusy(true);
    setError("");
    try {
      await unlink(p);
    } catch (e) {
      setError(e.code === "manager" ? t.unlinkNeedManager : t.wrongPin);
      setTimeout(() => setPin(""), 600);
      setBusy(false);
    }
  };
  useEffect(() => {
    if (pin.length === 4 && !blocked && !busy) go(pin);
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet title={t.unlink} onClose={onClose}>
      <div className="pos-unlink">
        <span className="pos-big-ic danger">
          <Unplug size={24} />
        </span>
        <p>{t.unlinkWhat.replace("{shop}", nameOf(s.setup?.restaurant || {}, lang) || "—").replace("{device}", s.device?.name || "POS")}</p>
        {shift && <p className="pos-alert soft">{t.unlinkShiftOpen}</p>}
        {waiting > 0 && s.online && (
          <div className="pos-alert soft">
            {t.unlinkWaiting.replace("{n}", waiting)}
            <div className="pos-row-btns">
              <button type="button" className="pos-btn small primary" onClick={() => syncNow()} disabled={s.syncing}>
                <RefreshCw size={15} className={s.syncing ? "md-spin" : ""} /> {t.syncNow}
              </button>
            </div>
          </div>
        )}
        {waiting > 0 && !s.online && (
          <div className="pos-alert">
            <CloudOff size={15} /> {t.unlinkOfflineLose.replace("{n}", waiting)}
            <label className="pos-check">
              <input type="checkbox" checked={lose} onChange={(e) => setLose(e.target.checked)} /> {t.unlinkLoseOk}
            </label>
          </div>
        )}
        {!s.online && waiting === 0 && <p className="pos-muted small">{t.unlinkOffline}</p>}
        {needPin ? (
          <>
            <p className="pos-muted">{error || (hasManager ? t.unlinkPinManager : t.unlinkPinAny)}</p>
            <PinDots length={pin.length} error={!!error} />
            <Keypad value={pin} onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))} max={4} disabled={busy || blocked} />
          </>
        ) : (
          <button type="button" className="pos-btn danger big" onClick={() => go("")} disabled={busy}>
            <Unplug size={18} /> {t.unlink}
          </button>
        )}
      </div>
    </Sheet>
  );
}
