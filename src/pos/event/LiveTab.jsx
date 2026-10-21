import { useEffect, useState } from "react";
import { CheckCircle2, Clock, CloudOff, MapPin, ReceiptText, ShieldCheck, Smartphone, Ticket, TrendingUp, Users, Wifi, XCircle } from "lucide-react";
import { local } from "./evDoorApi";

const usd = (n) => `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n) || 0)}`;
const hhmm = (d, lang) => (d ? new Date(d).toLocaleTimeString(lang === "km" ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
// "in 2 h 15 min" / "35 min ago"
function span(ms, t) {
  const m = Math.round(Math.abs(ms) / 60000);
  const txt = m < 60 ? t.mins.replace("{n}", m) : m < 48 * 60 ? t.hoursMins.replace("{h}", Math.floor(m / 60)).replace("{m}", m % 60) : t.days.replace("{n}", Math.round(m / 1440));
  return ms > 0 ? t.startsIn.replace("{t}", txt) : t.startedAgo.replace("{t}", txt);
}
export const histKey = (eid) => `ev_hist_${eid}`;
// every scan on this phone (Live tab)
export function remember(eid, r) {
  const list = local.get(histKey(eid), []);
  list.unshift({ at: Date.now(), kind: r.kind, holder: r.ticket?.holder || "", type: r.ticket?.type || r.ticket?.type_name || "", seat: r.ticket?.seat_label || "", code: r.code || r.ticket?.code || "" });
  local.set(histKey(eid), list.slice(0, 300));
}

export default function LiveTab({ t, lang, ev, info, codes, queue, online, lastSync, role, show, onGo, device, me }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, []);
  const hist = local.get(histKey(ev._id), []);
  const cached = Object.values(codes.current || {});
  const used = info?.counts?.used ?? cached.filter((c) => c.status === "used").length;
  const total = info?.counts?.tickets ?? cached.filter((c) => c.status !== "cancelled").length;
  const left = Math.max(0, total - used);
  const pct = total ? Math.round((used / total) * 100) : 0;
  const start = (show ? (ev.shows || []).find((s) => s.key === show)?.starts_at : null) || ev.starts_at;
  const ok15 = hist.filter((h) => h.kind === "ok" && now - h.at < 15 * 60000).length;
  const mineOk = hist.filter((h) => h.kind === "ok" && new Date(h.at).toDateString() === new Date(now).toDateString()).length;
  const refused = hist.filter((h) => !["ok"].includes(h.kind) && new Date(h.at).toDateString() === new Date(now).toDateString()).length;
  const perHour = ok15 * 4;
  const eta = perHour && left ? Math.round((left / perHour) * 60) : 0;
  const R = 54;
  const C = 2 * Math.PI * R;
  return (
    <div className="evd-col evd-live" data-testid="evd-live">
      <section className="evd-card evd-clock">
        <div>
          <b>{new Date(now).toLocaleTimeString(lang === "km" ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</b>
          <small>{new Date(now).toLocaleDateString(lang === "km" ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long" })}</small>
        </div>
        <div className="evd-clock-ev">
          <span>
            <Clock size={14} /> {hhmm(start, lang)} · {span(new Date(start).getTime() - now, t)}
          </span>
          {ev.venue && (
            <span>
              <MapPin size={14} /> {ev.venue}
            </span>
          )}
        </div>
      </section>

      <section className="evd-card evd-ring-card">
        <svg viewBox="0 0 128 128" className="evd-ring" aria-hidden="true">
          <circle cx="64" cy="64" r={R} className="bg" />
          <circle cx="64" cy="64" r={R} className="fg" strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} />
          <text x="64" y="62" textAnchor="middle" className="big">
            {pct}%
          </text>
          <text x="64" y="82" textAnchor="middle" className="small">
            {t.inside}
          </text>
        </svg>
        <div className="evd-nums">
          <div>
            <small>{t.inside}</small>
            <b>{used}</b>
          </div>
          <div>
            <small>{t.notYet}</small>
            <b>{left}</b>
          </div>
          <div>
            <small>{t.soldN}</small>
            <b>{total}</b>
          </div>
        </div>
      </section>

      <section className="evd-card">
        <h3>
          <TrendingUp size={16} /> {t.pace}
        </h3>
        <div className="evd-stats3">
          <div>
            <b>{ok15}</b>
            <small>{t.last15}</small>
          </div>
          <div>
            <b>{perHour}</b>
            <small>{t.perHour}</small>
          </div>
          <div>
            <b>{!eta ? "—" : eta < 60 ? `${eta}′` : `${Math.floor(eta / 60)} h ${String(eta % 60).padStart(2, "0")}`}</b>
            <small>{t.eta}</small>
          </div>
        </div>
      </section>

      {info?.by_type?.length > 0 && (
        <section className="evd-card">
          <h3>
            <Ticket size={16} /> {t.byType}
          </h3>
          {info.by_type.map((ty) => (
            <div key={ty.key} className="evd-type-row">
              <span>{ty.name}</span>
              <div className="evd-type-bar">
                <i style={{ width: `${ty.sold ? (ty.used / ty.sold) * 100 : 0}%`, background: ty.color || undefined }} />
              </div>
              <b>
                {ty.used}/{ty.sold}
              </b>
            </div>
          ))}
        </section>
      )}

      {role === "manager" && info?.counts && (
        <section className="evd-card evd-money">
          <div>
            <small>{t.money}</small>
            <b>{usd(info.counts.money)}</b>
          </div>
          <button type="button" className={`evd-btn small ${info.counts.review ? "" : "ghost"}`} onClick={() => onGo("orders")}>
            <ReceiptText size={15} /> {t.toCheck.replace("{n}", info.counts.review || 0)}
          </button>
        </section>
      )}

      <section className="evd-card">
        <h3>
          <Users size={16} /> {t.thisPhone}
        </h3>
        <div className="evd-stats3">
          <div>
            <b className="good">{mineOk}</b>
            <small>{t.letIn}</small>
          </div>
          <div>
            <b className="bad">{refused}</b>
            <small>{t.refused}</small>
          </div>
          <div>
            <b>{cached.length}</b>
            <small>{t.offlineReady}</small>
          </div>
        </div>
        {hist.length > 0 ? (
          <div className="evd-hist">
            {hist.slice(0, 12).map((h) => (
              <div key={`${h.at}${h.code}`} className={`evd-hist-row k-${h.kind}`}>
                {h.kind === "ok" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>
                  <b>{h.holder || h.code || "—"}</b>
                  <small>
                    {[h.type, h.seat, h.kind !== "ok" ? t.kinds[h.kind] || h.kind : ""].filter(Boolean).join(" · ")}
                  </small>
                </span>
                <em>{hhmm(h.at, lang)}</em>
              </div>
            ))}
          </div>
        ) : (
          <p className="evd-muted">{t.noScansYet}</p>
        )}
      </section>

      <section className="evd-card evd-status">
        <span className={online ? "good" : "bad"}>
          {online ? <Wifi size={15} /> : <CloudOff size={15} />} {online ? t.online : t.offline}
        </span>
        <span>
          <ShieldCheck size={15} /> {queue.length ? t.queued.replace("{n}", queue.length) : t.allSent}
        </span>
        {lastSync && (
          <span>
            <Clock size={15} /> {t.updatedAt.replace("{t}", hhmm(lastSync, lang))}
          </span>
        )}
        <span>
          <Smartphone size={15} /> {device || "—"} · {me}
        </span>
      </section>
    </div>
  );
}
