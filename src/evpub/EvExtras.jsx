import { useState } from "react";
import { FileText, Loader2, Megaphone, Send, Tag } from "lucide-react";
import { shortWhen, timeOf, usd, whenOf } from "./text";

// Event Tickets extras on the public pages: showtimes, seat map, questions, promo code, news + documents, Telegram
export const rowName = (i) => {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
// "fl:B12" → "Floor · B12"
export const seatLabel = (ev, id) => {
  const [k, seat] = String(id || "").split(":");
  const sec = (ev?.seating?.sections || []).find((s) => s.key === k);
  return sec ? `${sec.name ? `${sec.name} · ` : ""}${seat}` : seat || "";
};
export const showOf = (ev, key) => (ev?.shows || []).find((s) => s.key === key) || null;

export function ShowPicker({ ev, value, onChange, t, lang }) {
  return (
    <div className="evp-shows" role="radiogroup" aria-label={t.pickShow}>
      {ev.shows.map((s) => {
        const left = Object.values(s.left || {}).reduce((a, n) => a + n, 0);
        const off = !s.open || left <= 0;
        return (
          <button key={s.key} type="button" role="radio" aria-checked={value === s.key} className={`evp-show ${value === s.key ? "on" : ""} ${off ? "off" : ""}`} onClick={() => !off && onChange(s.key)} disabled={off} data-testid="evp-show">
            <b>{new Date(s.starts_at).toLocaleDateString(lang === "km" ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Phnom_Penh" })}</b>
            <span>{timeOf(s.starts_at, lang)}</span>
            {s.label && <small>{s.label}</small>}
            {off && <em>{!s.open ? t.showPast : t.showSoldOut}</em>}
          </button>
        );
      })}
    </div>
  );
}

// the map for one ticket type: tap free seats; picked ones are the buyer's
export function SeatPicker({ ev, typeKey, taken, picked, onToggle, max }) {
  const secs = (ev.seating?.sections || []).filter((s) => s.type_key === typeKey);
  return secs.map((sec) => (
    <div key={sec.key} className="evp-seatmap" style={{ "--cols": sec.cols }}>
      {sec.name && <b className="evp-sec-name">{sec.name}</b>}
      <div className="evp-stage">STAGE</div>
      {Array.from({ length: sec.rows }, (_, r) => {
        const row = rowName(r);
        return (
          <div key={row} className="evp-seatrow">
            <span>{row}</span>
            {Array.from({ length: sec.cols }, (_, c) => {
              const seat = `${row}${c + 1}`;
              const id = `${sec.key}:${seat}`;
              const off = (sec.blocked || []).includes(seat);
              const isTaken = taken.includes(id);
              const mine = picked.includes(id);
              if (off) return <i key={seat} className="evp-seat gap" />;
              return (
                <button key={seat} type="button" className={`evp-seat ${isTaken ? "taken" : ""} ${mine ? "mine" : ""}`} disabled={isTaken || (!mine && picked.length >= max)} onClick={() => onToggle(id)} aria-label={seat} aria-pressed={mine} data-seat={id}>
                  {c + 1}
                </button>
              );
            })}
            <span>{row}</span>
          </div>
        );
      })}
    </div>
  ));
}

export function QuestionsForm({ ev, answers, setAnswers, names, setNames, count, t }) {
  if (!ev.questions?.length && !ev.ask_names) return null;
  const set = (k, v) => setAnswers({ ...answers, [k]: v });
  return (
    <div className="evp-qs">
      {ev.ask_names && count > 0 && (
        <div className="evp-names">
          <b>{t.names}</b>
          {Array.from({ length: count }, (_, i) => (
            <label key={i} className="evp-field">
              <span>{t.nameN.replace("{n}", i + 1)}</span>
              <input value={names[i] || ""} maxLength={80} onChange={(e) => setNames(Object.assign([...names], { [i]: e.target.value }))} data-testid="evp-name-n" />
            </label>
          ))}
        </div>
      )}
      {ev.questions?.length > 0 && <b>{t.questions}</b>}
      {(ev.questions || []).map((q) => (
        <label key={q.key} className="evp-field">
          <span>
            {q.label}
            {q.required && " *"}
          </span>
          {q.kind === "long" ? (
            <textarea rows={3} maxLength={1000} value={answers[q.key] || ""} onChange={(e) => set(q.key, e.target.value)} required={q.required} />
          ) : q.kind === "choice" ? (
            <select value={answers[q.key] || ""} onChange={(e) => set(q.key, e.target.value)} required={q.required} data-testid="evp-q-choice">
              <option value="">{t.choose}</option>
              {q.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : q.kind === "yesno" ? (
            <span className="evp-yesno">
              {["yes", "no"].map((v) => (
                <button key={v} type="button" className={answers[q.key] === v ? "on" : ""} onClick={() => set(q.key, v)}>
                  {v === "yes" ? t.yes : t.no}
                </button>
              ))}
            </span>
          ) : (
            <input type={q.kind === "email" ? "email" : q.kind === "number" ? "number" : "text"} maxLength={200} value={answers[q.key] || ""} onChange={(e) => set(q.key, e.target.value)} required={q.required} />
          )}
        </label>
      ))}
    </div>
  );
}

export function PromoField({ slug, lines, applied, onApply, t, api }) {
  const [code, setCode] = useState(applied?.code || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const apply = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await api.promo(slug, { code, lines: lines.map(({ key, qty }) => ({ key, qty })) });
      onApply(r.data);
    } catch (e) {
      onApply(null);
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="evp-promo">
      <label className="evp-field">
        <span>
          <Tag size={13} /> {t.promo}
        </span>
        <span className="evp-promo-row">
          <input value={code} maxLength={24} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" data-testid="evp-promo" />
          <button type="button" className="evp-mini" onClick={apply} disabled={busy || code.length < 3} data-testid="evp-promo-apply">
            {busy ? <Loader2 size={14} className="evp-spin" /> : t.promoApply}
          </button>
        </span>
      </label>
      {applied && <small className="evp-ok">{t.promoOff.replace("{code}", applied.code).replace("{amt}", usd(applied.off))}</small>}
      {err && <small className="evp-bad">{err}</small>}
    </div>
  );
}

export function NewsAndDocs({ ev, t, lang }) {
  if (!ev.updates?.length && !ev.docs?.length) return null;
  return (
    <section className="evp-card evp-news">
      {ev.updates?.length > 0 && (
        <>
          <h2>
            <Megaphone size={18} /> {t.updates}
          </h2>
          {ev.updates.slice(0, 5).map((u) => (
            <div key={u._id} className="evp-news-item">
              <p>{u.text}</p>
              <small className="evp-muted">{shortWhen(u.at, lang)}</small>
            </div>
          ))}
        </>
      )}
      {ev.docs?.length > 0 && (
        <>
          <h3>{t.docs}</h3>
          <div className="evp-docs">
            {ev.docs.map((d) => (
              <a key={d.key} href={d.url} target="_blank" rel="noreferrer" className="evp-doc">
                <FileText size={18} /> {d.name}
              </a>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function TelegramBox({ tg, t }) {
  if (!tg) return null;
  return tg.linked ? (
    <div className="evp-tg on">
      <Send size={16} /> {t.tgLinked}
    </div>
  ) : (
    <a className="evp-tg" href={tg.url} target="_blank" rel="noreferrer" data-testid="evp-tg">
      <Send size={20} />
      <span>
        <b>{t.tgGet}</b>
        <small>{t.tgSub}</small>
      </span>
    </a>
  );
}
export const showWhen = (ev, key, lang) => {
  const s = showOf(ev, key);
  return s ? `${whenOf(s.starts_at, lang)} · ${timeOf(s.starts_at, lang)}` : "";
};
