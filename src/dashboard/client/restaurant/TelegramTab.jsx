import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { BellRing, CheckCircle2, Loader2, Send, Unplug, Users } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { AddonPrompt, Field, fmtDate } from "./parts";
import { useTgText } from "./tg-text";

const fmt = (n) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// Telegram (add-on): connect the BizHub bot to the owner's chat or team group → daily sales report
export default function TelegramTab({ ctx }) {
  const { r, lang, settings, readOnly } = ctx;
  const t = useTgText();
  const on = ctx.addonOn("rest_telegram");
  const [status, setStatus] = useState(null);
  const [link, setLink] = useState(null); // { url, group_url, expires_at, qr }
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState(null); // { daily_report, report_time }
  const timer = useRef(null);
  const [slow, setSlow] = useState(false); // waited long and still not connected
  const name = settings.name_km || settings.name_en;

  const load = useCallback(
    () =>
      restaurantService.telegram.get(ctx.id).then((res) => {
        setStatus(res.data);
        setForm((f) => f || { daily_report: res.data.daily_report, report_time: res.data.report_time, shift_open: res.data.shift_open, shift_close: res.data.shift_close, stock_alerts: res.data.stock_alerts });
        return res.data;
      }),
    [ctx.id],
  );
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
    return () => clearInterval(timer.current);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const fail = (e) => (e.status === 402 && e.response?.product ? ctx.askBuy(e.response.product) : ctx.notify({ type: "error", text: e.message }));

  // get a one-time link, then check every few seconds until the person pressed Start
  const connect = async () => {
    setBusy("link");
    try {
      const res = await restaurantService.telegram.link(ctx.id);
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
          ctx.notify({ type: "success", text: t.connectedTo.replace("{name}", s.chat_name) });
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
      if (e.status === 410) load();
    } finally {
      setBusy("");
    }
  };

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
        <b>📊 {name}</b>
        <span>
          {t.sampleDate} · {t.sampleTitle}
        </span>
        <hr />
        <span>
          💰 {t.sales}: <b>${fmt(486.5)}</b>
        </span>
        <span>🧾 {t.bills}: 62</span>
        <span>
          💵 {t.cash} ${fmt(301)} · 🏦 {t.bank} ${fmt(185.5)}
        </span>
        <hr />
        <span>🔥 {t.top}</span>
        <span>1. Beef noodle soup × 41</span>
        <span>2. Iced coffee × 33</span>
        <small className="tg-time">21:00</small>
      </div>
    </div>
  );

  if (!on) {
    return (
      <div className="rs-col">
        <section className="panel-card tg-promo">
          {sample}
          <div>
            <h2>{r.addonNames.rest_telegram}</h2>
            <p className="rs-muted">{t.promo}</p>
            <ul className="tg-list">
              <li>{t.p1}</li>
              <li>{t.p2}</li>
              <li>{t.p3}</li>
            </ul>
          </div>
        </section>
        <AddonPrompt addonKey="rest_telegram" ctx={ctx} />
      </div>
    );
  }
  if (!status) return <ListSkeleton rows={3} />;

  return (
    <div className="rs-grid">
      <div className="rs-form">
        {!status.configured && <div className="rs-banner warn">{t.notConfigured}</div>}

        {status.connected ? (
          <section className="panel-card tg-connected">
            <span className="tg-ok">
              <CheckCircle2 size={26} />
            </span>
            <div className="tg-who">
              <small>{t.connectedLabel}</small>
              <b>
                {status.chat_type !== "private" && <Users size={15} />} {status.chat_name}
              </b>
              <small className="rs-muted">{t.since.replace("{date}", fmtDate(status.connected_at, lang))}</small>
            </div>
            <div className="tg-actions">
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => run("test", () => restaurantService.telegram.test(ctx.id), t.testSent)} disabled={readOnly || !!busy}>
                {busy === "test" ? <Loader2 size={15} className="md-spin" /> : <BellRing size={15} />} {t.sendTest}
              </button>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm tg-danger" onClick={() => run("off", () => restaurantService.telegram.disconnect(ctx.id), t.disconnected)} disabled={readOnly || !!busy}>
                <Unplug size={15} /> {t.disconnect}
              </button>
            </div>
          </section>
        ) : (
          <section className="panel-card">
            <h2>{t.connectTitle}</h2>
            <ol className="tg-steps">
              <li>{t.step1}</li>
              <li>{t.step2}</li>
              <li>{t.step3}</li>
            </ol>
            {link ? (
              <div className="tg-link">
                <img src={link.qr} alt="" />
                <div>
                  <a className="md-btn md-btn-primary tg-btn" href={link.url} target="_blank" rel="noreferrer">
                    <Send size={16} /> {t.openTelegram}
                  </a>
                  <a className="md-btn md-btn-ghost sa-btn-sm" href={link.group_url} target="_blank" rel="noreferrer">
                    <Users size={15} /> {t.addToGroup}
                  </a>
                  <p className="tg-wait">
                    <Loader2 size={14} className="md-spin" /> {t.waiting}
                  </p>
                  <small className="rs-muted">{t.scanHint}</small>
                  <small className="rs-muted">{t.groupHow}</small>
                  {slow && <small className="tg-slow">{t.slow}</small>}
                </div>
              </div>
            ) : (
              <button type="button" className="md-btn md-btn-primary tg-btn" onClick={connect} disabled={readOnly || busy === "link" || !status.configured}>
                {busy === "link" ? <Loader2 size={16} className="md-spin" /> : <Send size={16} />} {t.connect}
              </button>
            )}
          </section>
        )}

        <section className="panel-card">
          <h2>{t.reportTitle}</h2>
          <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
            {t.reportSub}
          </p>
          <label className="md-switch">
            <input type="checkbox" checked={form.daily_report} onChange={(e) => setForm({ ...form, daily_report: e.target.checked })} disabled={readOnly} />
            <span className="md-switch-track" />
            <span>{t.dailyReport}</span>
          </label>
          {form.daily_report && (
            <div className="md-fields-grid" style={{ marginTop: 12 }}>
              <Field label={t.reportTime} hint={t.reportTimeHint} htmlFor="tg-time">
                <input id="tg-time" type="time" value={form.report_time} onChange={(e) => setForm({ ...form, report_time: e.target.value })} disabled={readOnly} />
              </Field>
            </div>
          )}
          <div className="tg-more">
            {[
              ["shift_open", t.shiftOpen, t.shiftOpenSub],
              ["shift_close", t.shiftClose, t.shiftCloseSub],
              ["stock_alerts", t.stockAlerts, ctx.addonOn("rest_stock") ? t.stockAlertsSub : t.stockAlertsNeed],
            ].map(([k, label, sub]) => (
              <label key={k} className="tg-toggle">
                <span>
                  <b>{label}</b>
                  <small className="rs-muted">{sub}</small>
                </span>
                <span className="md-switch">
                  <input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} disabled={readOnly} aria-label={label} />
                  <span className="md-switch-track" />
                </span>
              </label>
            ))}
          </div>
          <div className="tg-save">
            <small className="rs-muted">{t.posNote}</small>
            <button
              type="button"
              className="md-btn md-btn-primary sa-btn-sm"
              disabled={readOnly || busy === "save" || ["daily_report", "report_time", "shift_open", "shift_close", "stock_alerts"].every((k) => form[k] === status[k])}
              onClick={() => run("save", () => restaurantService.telegram.save(ctx.id, form), r.saved)}
            >
              {busy === "save" ? r.saving : r.save}
            </button>
          </div>
        </section>
      </div>
      <aside className="rs-side tg-side">
        <small className="rs-muted">{t.preview}</small>
        {sample}
      </aside>
    </div>
  );
}
