import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { BellRing, CheckCircle2, Loader2, Send, Unplug, Users } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { fmtDate } from "./text";
import { useWText } from "./wtext";
import { useXText } from "./xtext";

const FLAGS = ["new_order", "shift_close", "low_stock", "new_message"];

// Telegram alerts (mart_telegram, yearly): website orders, a closed shift, low / sold-out stock, website messages
export function TelegramTab({ ctx }) {
  const { lang, data, readOnly } = ctx;
  const w = useWText();
  const x = useXText();
  const a = data.addons?.mart_telegram || {};
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState(null);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState("");
  const [slow, setSlow] = useState(false);
  const timer = useRef(null);

  const load = useCallback(
    () =>
      ctx.api.tg(ctx.id).then((res) => {
        setStatus(res.data);
        setForm((f) => f || { ...Object.fromEntries(FLAGS.map((k) => [k, res.data[k]])), daily: res.data.daily, report_time: res.data.report_time || "21:00" });
        return res.data;
      }),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
    return () => clearInterval(timer.current);
  }, [load, a.active]); // eslint-disable-line react-hooks/exhaustive-deps

  const fail = (e) => (e.status === 402 ? ctx.askBuy({ addon: "mart_telegram" }) : ctx.notify({ type: "error", text: e.message }));
  const connect = async () => {
    setBusy("link");
    try {
      const res = await ctx.api.tgLink(ctx.id);
      const qr = await QRCode.toDataURL(res.data.url, { width: 360, margin: 1 });
      setLink({ ...res.data, qr });
      setSlow(false);
      const started = Date.now();
      clearInterval(timer.current);
      timer.current = setInterval(async () => {
        if (Date.now() > new Date(res.data.expires_at).getTime()) {
          clearInterval(timer.current);
          setLink(null);
          return;
        }
        if (Date.now() - started > 45000) setSlow(true);
        const s = await load().catch(() => null);
        if (s?.connected) {
          clearInterval(timer.current);
          setLink(null);
          ctx.notify({ type: "success", text: w.tgConnectedTo.replace("{name}", s.chat_name) });
        }
      }, 2500);
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  };
  const run = async (key, fn, okText) => {
    setBusy(key);
    try {
      const res = await fn();
      if (res?.data) setStatus(res.data);
      if (okText) ctx.notify({ type: "success", text: okText });
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  };

  const name = data.business.name;
  const sample = (
    <div className="tg-phone" aria-hidden="true">
      <div className="tg-head">
        <span className="tg-ava">B</span>
        <span>
          <b>BizHub</b>
          <small>bot</small>
        </span>
      </div>
      <div className="tg-bubble">
        <b>🛍 {w.tgSampleOrder}</b>
        <span>🛒 {name}</span>
        <span>👤 Sophea · 012 888 777</span>
        <span>• 2× Coca-Cola — $1.20</span>
        <span>💰 $4.10 · 🚚 St 432</span>
        <small className="tg-time">14:32</small>
      </div>
      <div className="tg-bubble">
        <b>⚠️ {w.tgSampleLow}</b>
        <span>🛒 {name}</span>
        <span>🟠 Oil 1L — 3 left</span>
        <span>⛔️ Eggs (10) — 0 left</span>
        <small className="tg-time">16:05</small>
      </div>
      <div className="tg-bubble">
        <b>🔒 {w.tgSampleShift}</b>
        <span>🧾 $245.50 (61)</span>
        <span>💵 $120 + 84,000៛</span>
        <span>✅ {w.tgExact}</span>
        <small className="tg-time">21:10</small>
      </div>
    </div>
  );
  const hero = (
    <section className="panel-card ghw-top">
      <span className="rs-addon-ic">
        <Send size={24} />
      </span>
      <div className="ghw-top-text">
        <h2 style={{ margin: 0 }}>{w.tgTitle}</h2>
        <p className="rs-muted" style={{ margin: "4px 0 0" }}>
          {a.active ? w.tgOn.replace("{date}", fmtDate(a.expires_at, lang)) : w.tgOff.replace("{price}", a.price ?? 90)}
        </p>
      </div>
      {(!a.active || a.status === "expiring") && (
        <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon: "mart_telegram" })} disabled={readOnly}>
          <CoinIcon size={15} /> {a.active ? w.renew : w.unlockYear.replace("{coins}", a.price ?? 90)}
        </button>
      )}
    </section>
  );
  if (!a.active)
    return (
      <div className="rs-col">
        {hero}
        <section className="panel-card tg-promo">
          {sample}
          <div>
            <h2>{w.tgTitle}</h2>
            <p className="rs-muted">{w.tgSub}</p>
            <ul className="tg-list">
              {w.tgPerks.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    );
  if (!status || !form) return <p className="rs-muted">…</p>;
  const dirty = [...FLAGS, "daily", "report_time"].some((k) => form[k] !== status[k]);
  return (
    <div className="rs-col">
      {hero}
      <div className="rs-grid">
        <div className="rs-form">
          {!status.configured && <div className="rs-banner warn">{w.tgNotConfigured}</div>}
          {status.connected ? (
            <section className="panel-card tg-connected">
              <span className="tg-ok">
                <CheckCircle2 size={26} />
              </span>
              <div className="tg-who">
                <small>{w.tgConnected}</small>
                <b>
                  {status.chat_type !== "private" && <Users size={15} />} {status.chat_name}
                </b>
                <small className="rs-muted">{w.since.replace("{date}", fmtDate(status.connected_at, lang))}</small>
              </div>
              <div className="tg-actions">
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => run("test", () => ctx.api.tgTest(ctx.id), w.tgTestSent)} disabled={readOnly || !!busy}>
                  {busy === "test" ? <Loader2 size={15} className="md-spin" /> : <BellRing size={15} />} {w.tgTest}
                </button>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm tg-danger" onClick={() => run("off", () => ctx.api.tgOff(ctx.id), w.tgOffDone)} disabled={readOnly || !!busy}>
                  <Unplug size={15} /> {w.tgDisconnect}
                </button>
              </div>
            </section>
          ) : (
            <section className="panel-card">
              <h2>{w.tgConnectTitle}</h2>
              <ol className="tg-steps">
                {w.tgSteps.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
              {link ? (
                <div className="tg-link">
                  <img src={link.qr} alt="" />
                  <div>
                    <a className="md-btn md-btn-primary tg-btn" href={link.url} target="_blank" rel="noreferrer">
                      <Send size={16} /> {w.tgOpen}
                    </a>
                    <a className="md-btn md-btn-ghost sa-btn-sm" href={link.group_url} target="_blank" rel="noreferrer">
                      <Users size={15} /> {w.tgGroup}
                    </a>
                    <p className="tg-wait">
                      <Loader2 size={14} className="md-spin" /> {w.tgWaiting}
                    </p>
                    {slow && <small className="tg-slow">{w.tgSlow}</small>}
                  </div>
                </div>
              ) : (
                <button type="button" className="md-btn md-btn-primary tg-btn" onClick={connect} disabled={readOnly || busy === "link" || !status.configured}>
                  {busy === "link" ? <Loader2 size={16} className="md-spin" /> : <Send size={16} />} {w.tgConnect}
                </button>
              )}
            </section>
          )}
          <section className="panel-card">
            <h2>{w.tgAlerts}</h2>
            <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
              {w.tgAlertsSub}
            </p>
            <div className="tg-more">
              {FLAGS.map((k) => (
                <label key={k} className="tg-toggle">
                  <span>
                    <b>{w.tgFlag[k][0]}</b>
                    <small className="rs-muted">{w.tgFlag[k][1]}</small>
                  </span>
                  <span className="md-switch">
                    <input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} disabled={readOnly} aria-label={w.tgFlag[k][0]} />
                    <span className="md-switch-track" />
                  </span>
                </label>
              ))}
            </div>
            <label className="tg-toggle">
              <span>
                <b>{x.tgDaily}</b>
                <small className="rs-muted">{x.tgDailySub}</small>
              </span>
              <span className="md-switch">
                <input type="checkbox" checked={!!form.daily} onChange={(e) => setForm({ ...form, daily: e.target.checked })} disabled={readOnly} aria-label={x.tgDaily} data-testid="tg-daily" />
                <span className="md-switch-track" />
              </span>
            </label>
            {form.daily && (
              <div className="tg-daily">
                <small className="rs-muted">{x.tgDailyAt}</small>
                <input type="time" value={form.report_time} onChange={(e) => e.target.value && setForm({ ...form, report_time: e.target.value })} disabled={readOnly} aria-label={x.tgDailyAt} />
                {status.connected && (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => run("daily", () => ctx.api.tgDaily(ctx.id).then(() => null), w.tgTestSent)} disabled={readOnly || !!busy}>
                    {busy === "daily" ? <Loader2 size={15} className="md-spin" /> : <Send size={15} />} {x.tgDailyNow}
                  </button>
                )}
              </div>
            )}
            <div className="tg-save">
              <span />
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" disabled={readOnly || busy === "save" || !dirty} onClick={() => run("save", () => ctx.api.tgSave(ctx.id, form), w.saved)}>
                {busy === "save" ? w.saving : w.save}
              </button>
            </div>
          </section>
        </div>
        <aside className="rs-side tg-side">
          <small className="rs-muted">{w.preview}</small>
          {sample}
        </aside>
      </div>
    </div>
  );
}
