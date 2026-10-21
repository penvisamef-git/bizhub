import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

// a dropdown you can type in: options [{ value, label, sub }]. Keyboard: ↑ ↓ Enter Esc.
export default function SearchSelect({ value, onChange, options, placeholder = "", searchPh = "Search…", noMatch = "No match", testid, className = "", disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const box = useRef(null);
  const input = useRef(null);
  const list = useRef(null);
  const current = options.find((o) => o.value === value);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => `${o.label} ${o.sub || ""}`.toLowerCase().includes(s)) : options;
  }, [q, options]);
  useEffect(() => {
    if (!open) return undefined;
    setQ("");
    setHi(Math.max(0, options.findIndex((o) => o.value === value)));
    setTimeout(() => input.current?.focus(), 0);
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    list.current?.children[hi]?.scrollIntoView?.({ block: "nearest" });
  }, [hi]);
  const pick = (o) => {
    onChange(o.value);
    setOpen(false);
  };
  const key = (e) => {
    if (e.key === "ArrowDown") (e.preventDefault(), setHi((h) => Math.min(shown.length - 1, h + 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setHi((h) => Math.max(0, h - 1)));
    else if (e.key === "Enter") (e.preventDefault(), shown[hi] && pick(shown[hi]));
    else if (e.key === "Escape") setOpen(false);
  };
  return (
    <div className={`evss ${open ? "open" : ""} ${className}`} ref={box}>
      <button type="button" className="evss-btn" onClick={() => setOpen((o) => !o)} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} data-testid={testid}>
        <span className={current ? "" : "evss-ph"}>
          {current ? current.label : placeholder}
          {current?.sub && <small>{current.sub}</small>}
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="evss-pop">
          <label className="evss-search">
            <Search size={14} />
            <input
              ref={input}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setHi(0);
              }}
              onKeyDown={key}
              placeholder={searchPh}
              data-testid={testid ? `${testid}-search` : undefined}
            />
          </label>
          <div className="evss-list" role="listbox" ref={list}>
            {!shown.length && <div className="evss-none">{noMatch}</div>}
            {shown.map((o, i) => (
              <button key={o.value || "_"} type="button" role="option" aria-selected={o.value === value} className={`evss-opt ${i === hi ? "hi" : ""} ${o.value === value ? "on" : ""}`} onMouseEnter={() => setHi(i)} onClick={() => pick(o)}>
                <span>
                  {o.label}
                  {o.sub && <small>{o.sub}</small>}
                </span>
                {o.value === value && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
