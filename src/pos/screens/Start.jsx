import { useEffect, useState } from "react";
import { ChefHat, Link2, Loader2, Lock, LogOut, Unplug, WifiOff } from "lucide-react";
import LangSwitch from "../../components/LangSwitch";
import Logo from "../../components/Logo";
import { usePosText } from "../text";
import { getPos, init, lock, loginPin, money, pair, startShift, usePos } from "../engine";
import { fmtMoney, nameOf } from "../util";
import Keypad, { PinDots } from "./Keypad";
import UnlinkSheet from "./Unlink";

export function Splash({ text }) {
  return (
    <div className="pos-center">
      <Loader2 size={30} className="md-spin" />
      <p>{text}</p>
    </div>
  );
}

// first time on this device: type the code from the dashboard
export function Pair() {
  const { t } = usePosText();
  const s = usePos();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    setError("");
    try {
      await pair(code, name.trim() || "POS");
    } catch (e) {
      setError(e.status === 0 ? t.noSetup : e.message);
      setBusy(false);
    }
  };
  return (
    <div className="pos-center pos-start">
      <div className="pos-card pos-pair">
        <div className="pos-card-top">
          <Logo height={30} />
          <LangSwitch />
        </div>
        <span className="pos-big-ic">
          <Link2 size={26} />
        </span>
        <h1>{t.linkTitle}</h1>
        <p className="pos-muted">{t.linkSub}</p>
        {s.unlinked && <p className="pos-alert">{t.unlinked}</p>}
        {s.selfUnlinked && <p className="pos-alert soft">{s.selfUnlinked === "cloud" ? t.unlinkedDone : t.unlinkedLocal}</p>}
        <label className="pos-label">{t.code}</label>
        <div className="pos-code" aria-live="polite">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={code[i] ? "on" : ""}>
              {code[i] || ""}
            </span>
          ))}
        </div>
        <Keypad value={code} onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} max={6} disabled={busy} />
        <label className="pos-label" htmlFor="pos-dev-name">
          {t.deviceName}
        </label>
        <input id="pos-dev-name" className="pos-input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.deviceNamePh} />
        {error && <p className="pos-alert">{error}</p>}
        <button type="button" className="pos-btn primary big" onClick={submit} disabled={busy || code.length !== 6}>
          {busy ? t.linking : t.link}
        </button>
      </div>
    </div>
  );
}

export function NoSetup() {
  const { t } = usePosText();
  const [busy, setBusy] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  return (
    <div className="pos-center pos-start">
      <div className="pos-card">
        <span className="pos-big-ic warn">
          <WifiOff size={26} />
        </span>
        <p>{t.noSetup}</p>
        {getPos().error && <p className="pos-alert">{getPos().error}</p>}
        <button
          type="button"
          className="pos-btn primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await init().catch(() => {});
            setBusy(false);
          }}
        >
          {t.retry}
        </button>
        <button type="button" className="pos-link-btn" onClick={() => setUnlinking(true)}>
          <Unplug size={15} /> {t.unlink}
        </button>
      </div>
      {unlinking && <UnlinkSheet onClose={() => setUnlinking(false)} />}
    </div>
  );
}

// staff PIN (works offline)
export function PinLock() {
  const { t, lang } = usePosText();
  const s = usePos();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const R = s.setup?.restaurant || {};
  useEffect(() => {
    if (pin.length !== 4) return;
    setBusy(true);
    loginPin(pin).then((staff) => {
      setBusy(false);
      if (!staff) {
        setError(true);
        setTimeout(() => {
          setError(false);
          setPin("");
        }, 600);
      }
    });
  }, [pin]);
  return (
    <div className="pos-center pos-start">
      <div className="pos-card pos-pin">
        <div className="pos-card-top">
          <span className="pos-device">{s.device?.name}</span>
          <LangSwitch />
        </div>
        <span className="pos-logo">{R.logo ? <img src={R.logo} alt="" /> : <ChefHat size={28} />}</span>
        <h1>{nameOf(R, lang)}</h1>
        <p className="pos-muted">
          <Lock size={14} /> {busy ? t.checking : error ? t.wrongPin : t.enterPin}
        </p>
        <PinDots length={pin.length} error={error} />
        <Keypad value={pin} onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))} max={4} disabled={busy} />
        <button type="button" className="pos-link-btn" onClick={() => setUnlinking(true)}>
          <Unplug size={15} /> {t.unlink}
        </button>
      </div>
      {unlinking && <UnlinkSheet onClose={() => setUnlinking(false)} />}
    </div>
  );
}

// count the drawer, start the shift
export function OpenShift() {
  const { t } = usePosText();
  const s = usePos();
  const [usd, setUsd] = useState("");
  const [khr, setKhr] = useState("");
  const [field, setField] = useState("usd");
  const [busy, setBusy] = useState(false);
  const m = money();
  return (
    <div className="pos-center pos-start">
      <div className="pos-card pos-shift">
        <h1>{t.openShift}</h1>
        <p className="pos-muted">
          {s.staff?.name} · {t.openShiftSub}
        </p>
        <div className="pos-two">
          <button type="button" className={`pos-amount ${field === "usd" ? "on" : ""}`} onClick={() => setField("usd")}>
            <small>{t.cashUsd}</small>
            <b>{fmtMoney(Number(usd) || 0, "USD")}</b>
          </button>
          <button type="button" className={`pos-amount ${field === "khr" ? "on" : ""}`} onClick={() => setField("khr")}>
            <small>{t.cashKhr}</small>
            <b>{fmtMoney(Number(khr) || 0, "KHR")}</b>
          </button>
        </div>
        <Keypad value={field === "usd" ? usd : khr} onChange={field === "usd" ? setUsd : (v) => setKhr(v.replace(/\D/g, ""))} dot={field === "usd"} max={field === "usd" ? 9 : 10} />
        <button
          type="button"
          className="pos-btn primary big"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await startShift({ usd: Number(usd) || 0, khr: Number(khr) || 0 });
          }}
        >
          {t.start}
        </button>
        <small className="pos-muted">
          1 USD = {fmtMoney(m.khr_rate, "KHR")}
        </small>
        <button type="button" className="pos-link-btn" onClick={() => lock()} disabled={busy}>
          <LogOut size={15} /> {t.notYou.replace("{name}", s.staff?.name || "")}
        </button>
      </div>
    </div>
  );
}
