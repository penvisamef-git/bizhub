import { useEffect, useState } from "react";
import { Bell, CalendarPlus, Check, Hourglass, Loader2, MapPin, Navigation, Repeat, Send, Star, Timer, Undo2 } from "lucide-react";
import { PUBLIC_API_BASE } from "../api/client";
import { evPublic } from "../api/services";
import { usd } from "./text";

// ---------- this browser's orders ("My tickets", no account) ----------
const MY_KEY = "ev-my-orders";
export function myTokens() {
  try {
    return JSON.parse(localStorage.getItem(MY_KEY) || "[]").filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}
export function rememberOrder(token) {
  try {
    const list = [token, ...myTokens().filter((t) => t !== token)].slice(0, 60);
    localStorage.setItem(MY_KEY, JSON.stringify(list));
  } catch {
    /* private mode */
  }
}
export function forgetOrder(token) {
  try {
    localStorage.setItem(MY_KEY, JSON.stringify(myTokens().filter((t) => t !== token)));
  } catch {
    /* private mode */
  }
}
// ---------- promoter links (?ref=CODE): kept for this event ----------
export function useRef_(slug) {
  const [ref, setRef] = useState("");
  useEffect(() => {
    if (!slug) return;
    const key = `ev-ref:${slug}`;
    const fromUrl = new URLSearchParams(window.location.search).get("ref");
    let code = "";
    try {
      code = (fromUrl || localStorage.getItem(key) || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
      if (fromUrl && code) {
        localStorage.setItem(key, code);
        evPublic.refClick(slug, code).catch(() => {});
      }
    } catch {
      code = (fromUrl || "").toUpperCase();
    }
    setRef(code);
  }, [slug]);
  return ref;
}

// ---------- prices ----------
// same as the server: the best mix of group deals for qty tickets
export function bundleCost(unit, qty, bundles) {
  const deals = (bundles || []).filter((b) => b.qty >= 2 && b.qty <= qty && b.price < unit * b.qty);
  if (!deals.length) return unit * qty;
  const best = Array(qty + 1).fill(Infinity);
  best[0] = 0;
  for (let n = 1; n <= qty; n += 1) {
    best[n] = best[n - 1] + unit;
    for (const d of deals) if (d.qty <= n) best[n] = Math.min(best[n], best[n - d.qty] + d.price);
  }
  return Math.round(best[qty] * 100) / 100;
}
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
const leftText = (until, now, t) => {
  let s = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  return d > 0 ? t.cdDays.replace("{d}", d).replace("{h}", h) : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
// the price of a type: early-bird (with the normal price crossed out) + a countdown
export function TypePrice({ x, free, t }) {
  const now = useNow(1000);
  const price = x.now ?? x.price;
  if (free || !price) return <b className="evp-price">{t.free}</b>;
  if (!x.tier) return <b className="evp-price">{usd(price)}</b>;
  return (
    <span className="evp-tier">
      <span>
        <s>{usd(x.price)}</s> <b className="evp-price">{usd(price)}</b>
      </span>
      <small className="evp-tier-tag" data-testid="evp-tier">
        <Timer size={11} /> {x.tier.label || t.earlyBird} · {leftText(x.tier.until, now, t)}
      </small>
    </span>
  );
}
export function BundleChips({ x, t }) {
  if (!x.bundles?.length) return null;
  const unit = x.now ?? x.price;
  return (
    <span className="evp-bundles" data-testid="evp-bundles">
      {x.bundles.map((b) => (
        <span key={b.qty}>
          {t.bundle.replace("{n}", b.qty).replace("{price}", usd(b.price))}
          {unit > 0 && <em>−{Math.round((1 - b.price / (unit * b.qty)) * 100)}%</em>}
        </span>
      ))}
    </span>
  );
}

// ---------- waitlist ----------
export function WaitlistBox({ slug, ev, show, t }) {
  const key = `ev-wait:${slug}`;
  const [f, setF] = useState({ name: "", phone: "", type_key: "", qty: 1 });
  const [me, setMe] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (me?.token) evPublic.waitStatus(me.token).then((r) => setMe((m) => ({ ...m, ...r.data }))).catch(() => {});
  }, [me?.token]);
  const join = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await evPublic.waitlist(slug, { ...f, show: show || undefined });
      const v = { token: r.data.token, ahead: r.data.ahead, tg_url: r.data.tg_url, status: "waiting" };
      setMe(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        /* private */
      }
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  if (me?.token && me.status !== "left")
    return (
      <section className="evp-card evp-wait on" data-testid="evp-wait-on">
        <h2>
          <Hourglass size={18} /> {me.status === "told" ? t.wlBack : t.wlOn}
        </h2>
        <p className="evp-muted">{me.status === "told" ? t.wlBackSub : t.wlAhead.replace("{n}", me.ahead ?? 0)}</p>
        {me.tg_url && !me.tg_linked && (
          <a className="evp-btn tg" href={me.tg_url} target="_blank" rel="noreferrer" data-testid="evp-wait-tg">
            <Send size={17} /> {t.wlTg}
          </a>
        )}
        {me.tg_linked && (
          <small className="evp-ok">
            <Check size={14} /> {t.wlTgOn}
          </small>
        )}
      </section>
    );
  const outTypes = ev.types.filter((x) => (show ? ev.shows.find((s) => s.key === show)?.left?.[x.key] ?? 0 : x.left) <= 0);
  return (
    <form className="evp-card evp-wait" onSubmit={join} data-testid="evp-wait">
      <h2>
        <Bell size={18} /> {t.wlTitle}
      </h2>
      <p className="evp-muted">{t.wlSub}</p>
      <div className="evp-wait-row">
        <input value={f.name} maxLength={80} placeholder={t.name} onChange={(e) => setF({ ...f, name: e.target.value })} required data-testid="evp-wait-name" />
        <input value={f.phone} inputMode="tel" maxLength={20} placeholder="012 345 678" onChange={(e) => setF({ ...f, phone: e.target.value })} required data-testid="evp-wait-phone" />
      </div>
      <div className="evp-wait-row">
        {outTypes.length > 1 && (
          <select value={f.type_key} onChange={(e) => setF({ ...f, type_key: e.target.value })}>
            <option value="">{t.wlAny}</option>
            {outTypes.map((x) => (
              <option key={x.key} value={x.key}>
                {x.name}
              </option>
            ))}
          </select>
        )}
        <select value={f.qty} onChange={(e) => setF({ ...f, qty: Number(e.target.value) })} aria-label={t.wlQty}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {t.ticketsN.replace("{n}", n)}
            </option>
          ))}
        </select>
      </div>
      {err && <div className="evp-err">{err}</div>}
      <button type="submit" className="evp-btn" disabled={busy || !f.name.trim() || f.phone.replace(/\D/g, "").length < 8} data-testid="evp-wait-join">
        {busy ? <Loader2 size={18} className="evp-spin" /> : <Bell size={18} />} {t.wlJoin}
      </button>
    </form>
  );
}

// ---------- sponsors ----------
export function Sponsors({ list, t }) {
  if (!list?.length) return null;
  const groups = ["main", "gold", "partner"].map((k) => [k, list.filter((s) => (s.tier || "partner") === k)]).filter(([, l]) => l.length);
  return (
    <section className="evp-card evp-sponsors" data-testid="evp-sponsors">
      <h2>{t.sponsors}</h2>
      {groups.map(([k, l]) => (
        <div key={k} className={`evp-sp-group t-${k}`}>
          {groups.length > 1 && <small>{t.spTier[k]}</small>}
          <div>
            {l.map((s) => {
              const img = <img src={s.logo} alt={s.name} title={s.name} />;
              return s.link ? (
                <a key={s.key || s.name} href={s.link} target="_blank" rel="noreferrer">
                  {img}
                </a>
              ) : (
                <span key={s.key || s.name}>{img}</span>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

// ---------- calendar + map ----------
const gDate = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function CalendarLinks({ ev, start, end, show, t }) {
  const s = start || ev.starts_at;
  const e = end || ev.ends_at || new Date(new Date(s).getTime() + 3 * 3600000);
  const url = `${window.location.origin}/ev/${ev.slug}`;
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${gDate(s)}/${gDate(e)}&location=${encodeURIComponent(ev.venue || "")}&details=${encodeURIComponent(url)}`;
  const ics = `${PUBLIC_API_BASE}/ev/e/${encodeURIComponent(ev.slug)}/ics${show ? `?show=${encodeURIComponent(show)}` : ""}`;
  return (
    <div className="evp-cal" data-testid="evp-cal">
      <a href={google} target="_blank" rel="noreferrer">
        <CalendarPlus size={15} /> {t.calGoogle}
      </a>
      <a href={ics}>
        <CalendarPlus size={15} /> {t.calApple}
      </a>
    </div>
  );
}
export function MapCard({ ev, t }) {
  if (!ev.venue && !ev.map_url) return null;
  const q = encodeURIComponent(ev.venue || "");
  const dir = ev.map_url || `https://www.google.com/maps/search/?api=1&query=${q}`;
  return (
    <section className="evp-card evp-map" data-testid="evp-map">
      <h2>
        <MapPin size={18} /> {t.where}
      </h2>
      {ev.venue && <iframe title="map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://maps.google.com/maps?q=${q}&z=15&output=embed`} />}
      <div className="evp-map-row">
        <b>{ev.venue}</b>
        <a className="evp-btn ghost sm" href={dir} target="_blank" rel="noreferrer">
          <Navigation size={15} /> {t.directions}
        </a>
      </div>
    </section>
  );
}

// ---------- order page: ask for a refund / to give tickets to someone ----------
export function RequestBox({ token, tickets, requests, t, onDone }) {
  const [open, setOpen] = useState("");
  const [pick, setPick] = useState([]);
  const [f, setF] = useState({ to_name: "", to_phone: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const valid = tickets.filter((x) => x.status === "valid");
  const last = [...(requests || [])].sort((a, b) => new Date(b.at) - new Date(a.at))[0];
  if (!valid.length && !last) return null;
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await evPublic.request(token, { kind: open, tickets: pick, ...f });
      setOpen("");
      onDone();
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="evp-card evp-req" data-testid="evp-req">
      {last && (
        <div className={`evp-req-last s-${last.status}`}>
          {last.kind === "refund" ? <Undo2 size={15} /> : <Repeat size={15} />}
          <span>
            <b>{t.rqKind[last.kind]}</b> · {t.rqStatus[last.status]}
            {last.reply ? ` — “${last.reply}”` : ""}
          </span>
        </div>
      )}
      {!open ? (
        valid.length > 0 &&
        last?.status !== "open" && (
          <div className="evp-req-btns">
            <button type="button" onClick={() => (setOpen("transfer"), setPick(valid.map((x) => x.code).slice(0, 1)))} data-testid="evp-req-transfer">
              <Repeat size={15} /> {t.rqGive}
            </button>
            <button type="button" onClick={() => (setOpen("refund"), setPick([]))} data-testid="evp-req-refund">
              <Undo2 size={15} /> {t.rqRefund}
            </button>
          </div>
        )
      ) : (
        <form onSubmit={send} className="evp-req-form">
          <b>{open === "refund" ? t.rqRefund : t.rqGive}</b>
          <div className="evp-req-tix">
            {valid.map((x) => (
              <label key={x.code}>
                <input type="checkbox" checked={pick.includes(x.code)} onChange={(e) => setPick(e.target.checked ? [...pick, x.code] : pick.filter((c) => c !== x.code))} />
                <span>
                  {x.type_name} · {x.holder}
                  {x.seat_label ? ` · ${x.seat_label}` : ""}
                </span>
              </label>
            ))}
          </div>
          {open === "transfer" && (
            <div className="evp-wait-row">
              <input value={f.to_name} maxLength={80} placeholder={t.rqToName} onChange={(e) => setF({ ...f, to_name: e.target.value })} required />
              <input value={f.to_phone} inputMode="tel" maxLength={20} placeholder={t.rqToPhone} onChange={(e) => setF({ ...f, to_phone: e.target.value })} />
            </div>
          )}
          <input className="evp-req-note" value={f.note} maxLength={300} placeholder={t.rqNote} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <small className="evp-muted">{open === "refund" ? t.rqRefundSub : t.rqGiveSub}</small>
          {err && <div className="evp-err">{err}</div>}
          <div className="evp-req-btns">
            <button type="button" onClick={() => setOpen("")}>
              {t.back}
            </button>
            <button type="submit" className="on" disabled={busy || !pick.length || (open === "transfer" && !f.to_name.trim())} data-testid="evp-req-send">
              {busy ? <Loader2 size={15} className="evp-spin" /> : <Send size={15} />} {t.rqSend}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
export function FeedbackLink({ token, fb, t }) {
  if (!fb?.open) return null;
  return (
    <a className={`evp-card evp-fb-link ${fb.done ? "done" : ""}`} href={`/ev/f/${token}`} data-testid="evp-fb-link">
      <Star size={20} />
      <span>
        <b>{fb.done ? t.fbThanks : t.fbAsk}</b>
        <small>{fb.done ? t.fbEdit : t.fbAskSub}</small>
      </span>
    </a>
  );
}
