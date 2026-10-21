import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Check, Crown, Loader2, Sparkles, X } from "lucide-react";
import CoinIcon from "../CoinIcon";
import { auth } from "../../lib/auth";
import { coinsChanged } from "../../lib/events";
import { usePurchaseText } from "./text";
import "./purchase-modal.css";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const CONFETTI = ["#FFD54A", "#FF8A3D", "#E8457C", "#7C4DFF", "#22C55E", "#38BDF8", "#FFFFFF"];

// Pay coins for something (theme, remove branding, portfolio year, renewal…).
// Left: a "stage" showing what they get, with floating coins. Right: price, balance before/after, big gold button.
// After paying: confetti + done message.
//   buy()        → API call; result may have { balance }
//   onDone(r)    → after a successful payment (r = API result, or null if it was already bought)
//   onClose(ok)  → ok = true when paid
export default function PurchaseModal({ stage, badge, title, sub, perks = [], price, buyLabel, buy, doneTitle, doneSub, doneButton, onDone, onClose }) {
  const p = usePurchaseText();
  const [balance, setBalance] = useState(() => auth.getClientLogin()?.coin_balance ?? 0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false); // "Pay X coins?" — asked once before paying
  const buttonRef = useRef(null);
  const short = Math.max(0, price - balance);

  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        "--x": `${(Math.random() * 2 - 1) * 260}px`,
        "--y": `${-120 - Math.random() * 260}px`,
        "--r": `${Math.random() * 720 - 360}deg`,
        "--d": `${Math.random() * 0.25}s`,
        "--bg": CONFETTI[i % CONFETTI.length],
        "--w": `${6 + Math.random() * 6}px`,
      })),
    [],
  );

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const stateRef = useRef({ busy, done });
  stateRef.current = { busy, done };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !stateRef.current.busy && closeRef.current(stateRef.current.done);
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);
  useEffect(() => buttonRef.current?.focus(), [done, short]);

  const setCoins = (n) => {
    auth.setClientLogin({ ...auth.getClientLogin(), coin_balance: n });
    setBalance(n);
    coinsChanged();
  };

  const pay = async () => {
    setAsking(false);
    setBusy(true);
    setError("");
    try {
      const r = await buy();
      if (r?.balance !== undefined) setCoins(r.balance);
      else coinsChanged();
      setDone(true);
      onDone?.(r);
    } catch (e) {
      if (e.status === 402 && e.response?.balance !== undefined) setCoins(e.response.balance);
      else if (e.status === 409) {
        setDone(true); // already paid (double click / other tab)
        onDone?.(null);
      } else setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="ul-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose(done)}>
      <div className={`ul-modal ${done ? "is-done" : ""}`} role="dialog" aria-modal="true" aria-labelledby="ul-title">
        <button type="button" className="ul-close" onClick={() => onClose(done)} disabled={busy} aria-label={p.maybeLater}>
          <X size={18} />
        </button>

        <div className="ul-stage">
          <div className="ul-rays" aria-hidden="true" />
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`ul-float ul-float-${i}`} aria-hidden="true">
              <CoinIcon size={i % 2 ? 22 : 30} />
            </span>
          ))}
          <div className="ul-card">{stage}</div>
          {done && (
            <div className="ul-confetti" aria-hidden="true">
              {pieces.map((style, i) => (
                <i key={i} style={style} />
              ))}
            </div>
          )}
        </div>

        <div className="ul-body">
          {!done ? (
            <>
              {badge && (
                <span className="ul-badge">
                  <Crown size={14} /> {badge}
                </span>
              )}
              <h2 id="ul-title">{title}</h2>
              {sub && <p className="ul-sub">{sub}</p>}
              {perks.length > 0 && (
                <ul className="ul-perks">
                  {perks.map((x) => (
                    <li key={x}>
                      <Check size={15} /> {x}
                    </li>
                  ))}
                </ul>
              )}
              <div className="ul-wallet">
                <div>
                  <small>{p.yourBalance}</small>
                  <b>
                    <CoinIcon size={16} /> {fmt(balance)}
                  </b>
                </div>
                <span className="ul-arrow">→</span>
                <div className={short ? "bad" : ""}>
                  <small>{p.after}</small>
                  <b>
                    <CoinIcon size={16} /> {short ? "—" : fmt(balance - price)}
                  </b>
                </div>
              </div>
              {error && <div className="md-form-error">{error}</div>}
              {short ? (
                <>
                  <div className="ul-short">{p.notEnough.replace("{coins}", fmt(short))}</div>
                  <Link ref={buttonRef} to="/app/wallet" className="ul-buy">
                    <CoinIcon size={20} /> {p.topUp}
                  </Link>
                </>
              ) : (
                <button ref={buttonRef} type="button" className="ul-buy" onClick={() => (price > 0 ? setAsking(true) : pay())} disabled={busy} data-testid="ul-buy">
                  {busy ? <Loader2 size={20} className="md-spin" /> : <CoinIcon size={22} />}
                  {busy ? p.paying : buyLabel || `${fmt(price)} ${p.coins}`}
                  <span className="ul-shine" aria-hidden="true" />
                </button>
              )}
              <button type="button" className="ul-later" onClick={() => onClose(false)} disabled={busy}>
                {p.maybeLater}
              </button>
              {asking && (
                <div className="ul-ask" role="alertdialog" aria-labelledby="ul-ask-title">
                  <div className="ul-ask-box">
                    <span className="ul-ask-ic">
                      <CoinIcon size={30} />
                    </span>
                    <b id="ul-ask-title">{p.sure}</b>
                    <p>{p.sureSub.replace("{coins}", fmt(price)).replace("{name}", title)}</p>
                    <div className="ul-ask-row">
                      <button type="button" className="ul-ask-no" onClick={() => setAsking(false)} autoFocus>
                        {p.no}
                      </button>
                      <button type="button" className="ul-ask-yes" onClick={pay} data-testid="ul-yes">
                        <CoinIcon size={16} /> {p.yesPay.replace("{coins}", fmt(price))}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="ul-done">
              <span className="ul-done-icon">
                <Sparkles size={28} />
              </span>
              <h2 id="ul-title">{doneTitle || p.done}</h2>
              {doneSub && <p className="ul-sub">{doneSub}</p>}
              <button ref={buttonRef} type="button" className="ul-buy" onClick={() => onClose(true)}>
                <Check size={20} /> {doneButton || p.great}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
