import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { searchService } from "../../api/services";

// Bizi settings (the gear in the box): which alerts Bizi tells me about, the setup tips, the Monday report.
// Saved on the server (GET / PUT /api/user/bizi/prefs), so the website, the app and Telegram all follow it.
// Bizi on Telegram (the owner's own chat) is in the same place — see BiziTelegram.
export default function BiziSettings({ x, onBack, onChanged, children }) {
  const [p, setP] = useState(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    searchService
      .prefs()
      .then((r) => live && setP(r.data))
      .catch((e) => live && setErr(e.message || "Error"));
    return () => {
      live = false;
    };
  }, []);

  const save = (body) => {
    setSaved(false);
    setErr("");
    searchService
      .savePrefs(body)
      .then((r) => {
        setP(r.data);
        setSaved(true);
        onChanged?.();
        setTimeout(() => setSaved(false), 1800);
      })
      .catch((e) => setErr(e.message || "Error"));
  };
  const muted = (k) => (p?.mute || []).includes(k);
  const toggle = (k) => save({ mute: muted(k) ? p.mute.filter((m) => m !== k) : [...(p.mute || []), k] });

  return (
    <div className="bizi-set" data-testid="bizi-settings">
      <div className="bizi-set-top">
        <button type="button" className="bizi-set-back" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> {x.setBack}
        </button>
        <b>{x.settings}</b>
        <span className={`bizi-set-saved${saved ? " on" : ""}`} aria-live="polite">
          {saved ? x.setSaved : ""}
        </span>
      </div>
      {err && <p className="bizi-note">{err}</p>}
      {!p && !err && <p className="bizi-note busy">…</p>}
      {p && (
        <>
          {children ? children({ prefs: p, save, setPrefs: setP }) : null}
          <div className="bizi-head">{x.setTell}</div>
          {(p.keys?.alerts || []).map((k) => (
            <Switch key={k} on={!muted(k)} label={x.alertNames?.[k] || k} onChange={() => toggle(k)} id={`bizi-mute-${k}`} />
          ))}
          <Switch on={!muted("tips")} label={x.setTips} onChange={() => toggle("tips")} id="bizi-mute-tips" />
          <Switch on={p.weekly} label={x.setWeekly} onChange={() => save({ weekly: !p.weekly })} id="bizi-weekly" />
          <p className="bizi-note small">{x.setNote}</p>
        </>
      )}
    </div>
  );
}

export function Switch({ on, label, onChange, id, sub }) {
  return (
    <label className="bizi-switch" htmlFor={id}>
      <span className="bizi-switch-txt">
        <span>{label}</span>
        {sub ? <small>{sub}</small> : null}
      </span>
      <input id={id} type="checkbox" role="switch" checked={!!on} onChange={onChange} data-testid={id} />
      <i aria-hidden="true" />
    </label>
  );
}
