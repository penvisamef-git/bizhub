import { Delete } from "lucide-react";

// Big touch keypad. value = string of digits; onChange(next); dots → allow "."; extra = [label, value] quick keys
export default function Keypad({ value, onChange, max = 12, dot = false, onEnter, enterLabel, disabled }) {
  const press = (k) => {
    if (disabled) return;
    if (k === "back") return onChange(value.slice(0, -1));
    if (k === "." && (!dot || value.includes("."))) return;
    if (value.length >= max) return;
    if (k === "." && !value) return onChange("0.");
    onChange(value + k);
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", dot ? "." : "00", "0", "back"];
  return (
    <div className="pk">
      {keys.map((k) => (
        <button key={k} type="button" className={`pk-key ${k === "back" ? "pk-back" : ""}`} onClick={() => press(k === "00" ? "00" : k)} disabled={disabled} aria-label={k === "back" ? "Delete" : k}>
          {k === "back" ? <Delete size={22} /> : k}
        </button>
      ))}
      {onEnter && (
        <button type="button" className="pk-enter" onClick={onEnter} disabled={disabled}>
          {enterLabel}
        </button>
      )}
    </div>
  );
}

// four dots for a PIN
export function PinDots({ length, error }) {
  return (
    <div className={`pk-dots ${error ? "shake" : ""}`} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={i < length ? "on" : ""} />
      ))}
    </div>
  );
}
