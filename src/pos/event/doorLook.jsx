import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Palette, Sun, X } from "lucide-react";
import { local } from "./evDoorApi";

// the door phone's look: 6 colours × light / dark / auto (the phone's setting). Saved on this phone.
export const LOOKS = {
  ember: { a: "#f0662b", b: "#ff9a3c" },
  ocean: { a: "#0284c7", b: "#38bdf8" },
  jade: { a: "#059669", b: "#34d399" },
  royal: { a: "#7c3aed", b: "#a78bfa" },
  rose: { a: "#e11d48", b: "#fb7185" },
  gold: { a: "#ca8a04", b: "#facc15" },
};
const KEY = "ev_door_look";
const systemDark = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export function useLook() {
  const [look, setLookState] = useState(() => ({ look: "ember", mode: "dark", ...local.get(KEY, {}) }));
  const [sysDark, setSysDark] = useState(systemDark);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const on = () => setSysDark(mq.matches);
    mq?.addEventListener?.("change", on);
    return () => mq?.removeEventListener?.("change", on);
  }, []);
  const dark = look.mode === "auto" ? sysDark : look.mode === "dark";
  useEffect(() => {
    const b = document.body.classList;
    Object.keys(LOOKS).forEach((k) => b.remove(`evd-look-${k}`));
    b.add(`evd-look-${LOOKS[look.look] ? look.look : "ember"}`);
    b.toggle("evd-dk", dark);
    b.toggle("evd-lt", !dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0f1015" : "#f5f5f8");
    return () => {
      Object.keys(LOOKS).forEach((k) => b.remove(`evd-look-${k}`));
      b.remove("evd-dk", "evd-lt");
    };
  }, [look.look, dark]);
  const setLook = (patch) =>
    setLookState((o) => {
      const next = { ...o, ...patch };
      local.set(KEY, next);
      return next;
    });
  return { ...look, dark, setLook };
}

export function LookButton({ onClick, t }) {
  return (
    <button type="button" className="evd-icon" onClick={onClick} aria-label={t.look} title={t.look} data-testid="evd-look">
      <Palette size={18} />
    </button>
  );
}

export function LookSheet({ t, look, onClose }) {
  return (
    <div className="evd-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="evd-sheet" role="dialog" aria-label={t.look}>
        <div className="evd-sheet-head">
          <b>{t.look}</b>
          <button type="button" className="evd-icon" onClick={onClose} aria-label={t.close}>
            <X size={18} />
          </button>
        </div>
        <small className="evd-muted">{t.lookColour}</small>
        <div className="evd-looks">
          {Object.entries(LOOKS).map(([k, c]) => (
            <button key={k} type="button" className={look.look === k ? "on" : ""} onClick={() => look.setLook({ look: k })} data-testid={`evd-look-${k}`}>
              <i style={{ background: `linear-gradient(135deg, ${c.a}, ${c.b})` }}>{look.look === k && <Check size={18} />}</i>
              <span>{t.looks[k]}</span>
            </button>
          ))}
        </div>
        <small className="evd-muted">{t.lookMode}</small>
        <div className="evd-modes">
          {[
            ["light", Sun, t.light],
            ["dark", Moon, t.dark],
            ["auto", Monitor, t.auto],
          ].map(([k, Icon, label]) => (
            <button key={k} type="button" className={look.mode === k ? "on" : ""} onClick={() => look.setLook({ mode: k })} data-testid={`evd-mode-${k}`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
