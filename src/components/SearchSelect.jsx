import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import "./searchselect.css";

// A select you can type in to find an option (many business types later).
// options: [{ value, label, hint?, icon? }]. Looks like the select it replaces: pass that select's className.
export default function SearchSelect({ value, onChange, options, className = "", placeholder = "", searchPh = "Search…", empty = "Nothing found", ariaLabel, testid }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const box = useRef(null);
  const input = useRef(null);
  const listId = useId();
  const cur = options.find((o) => o.value === value);
  const qq = q.trim().toLowerCase();
  const shown = useMemo(() => (qq ? options.filter((o) => `${o.label} ${o.value}`.toLowerCase().includes(qq)) : options), [options, qq]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setHi(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setHi(0), [qq]);
  useEffect(() => {
    box.current?.querySelector(".ss-opt.hi")?.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  const pick = (o) => {
    onChange(o.value);
    setOpen(false);
  };
  const key = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(shown.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[hi]) pick(shown[hi]);
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className={`ss ${open ? "open" : ""}`} ref={box}>
      <button type="button" className={`ss-btn ${className}`} onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} data-testid={testid ? `${testid}-btn` : undefined}>
        {cur?.icon}
        <span className="ss-val">{cur ? cur.label : placeholder}</span>
        {cur?.hint && <small className="ss-hint">{cur.hint}</small>}
        <ChevronDown size={15} className="ss-chev" />
      </button>
      {open && (
        <div className="ss-pop" role="dialog">
          <label className="ss-q">
            <Search size={15} />
            <input ref={input} autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder={searchPh} aria-label={searchPh} aria-controls={listId} data-testid={testid ? `${testid}-q` : undefined} />
          </label>
          <ul className="ss-list" id={listId} role="listbox">
            {shown.map((o, i) => (
              <li key={o.value || "_all"} role="option" aria-selected={o.value === value} className={`ss-opt ${i === hi ? "hi" : ""} ${o.value === value ? "on" : ""}`} onPointerEnter={() => setHi(i)} onClick={() => pick(o)}>
                {o.icon}
                <span className="ss-val">{o.label}</span>
                {o.hint && <small className="ss-hint">{o.hint}</small>}
                {o.value === value && <Check size={15} className="ss-check" />}
              </li>
            ))}
            {!shown.length && <li className="ss-empty">{empty}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
