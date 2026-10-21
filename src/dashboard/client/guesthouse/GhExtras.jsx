import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { BellRing, CheckCircle2, ConciergeBell, Download, Loader2, Plus, Printer, Send, ShieldCheck, Trash2, Unplug, Users } from "lucide-react";
import { guestHouseService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { printReceipt } from "../../../pos/guesthouse/GhReceipt";
import { addDays, fmtDate, fmtDay, money, todayKH } from "./text";
import { x3 } from "./gh3-text";
import { SVC_EMOJI, StayModal } from "./GhStay";

// Owner: Telegram alerts (gh_telegram) · foreign guest report (gh_police) · extra services menu (gh_services)

export function Hero({ icon: Icon, title, sub, addon, ctx, yearly, extra, on }) {
  const t = x3(ctx.lang);
  const a = { ...(ctx.data.addons?.[addon] || {}), ...(on !== undefined ? { active: on } : {}) };
  return (
    <section className="panel-card ghpr-hero">
      <span className="rs-addon-ic">
        <Icon size={24} />
      </span>
      <div>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <p className="rs-muted" style={{ margin: "4px 0 0" }}>
          {sub}
        </p>
      </div>
      {extra}
      {(!a.active || (yearly && a.status === "expiring")) && (
        <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon })} disabled={ctx.readOnly}>
          <CoinIcon size={15} /> {a.active ? t.renew : (yearly ? t.unlockYear : t.unlock).replace("{coins}", a.price ?? "")}
        </button>
      )}
    </section>
  );
}
export const Perks = ({ ctx, addon }) => (
  <section className="panel-card">
    <p className="rs-muted" style={{ marginTop: 0 }}>
      {ctx.g.addonInfo[addon].what}
    </p>
    <ul className="at-perks">
      {ctx.g.addonInfo[addon].perks.map((p) => (
        <li key={p}>
          <CheckCircle2 size={14} /> {p}
        </li>
      ))}
    </ul>
  </section>
);

// ============================ TELEGRAM ============================
const FLAGS = ["new_booking", "check_in", "check_out", "payment"];
export function TelegramTab({ ctx }) {
  const { lang, data, readOnly } = ctx;
  const t = x3(lang);
  const a = data.addons?.gh_telegram || {};
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState(null);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState("");
  const [slow, setSlow] = useState(false);
  const timer = useRef(null);

  const load = useCallback(
    () =>
      guestHouseService.tg(ctx.id).then((res) => {
        setStatus(res.data);
        setForm((f) => f || { daily_report: res.data.daily_report, report_time: res.data.report_time, ...Object.fromEntries(FLAGS.map((k) => [k, res.data[k]])) });
        return res.data;
      }),
    [ctx.id],
  );
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
    return () => clearInterval(timer.current);
  }, [load, a.active]); // eslint-disable-line react-hooks/exhaustive-deps

  const fail = (e) => (e.status === 402 ? ctx.askBuy({ addon: "gh_telegram" }) : ctx.notify({ type: "error", text: e.message }));
  const connect = async () => {
    setBusy("link");
    try {
      const res = await guestHouseService.tgLink(ctx.id);
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

  const s = t.sample;
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
        <b>🛎 {s.booking}</b>
        <span>🏠 {data.business.name}</span>
        <span>👤 {s.guest}</span>
        <span>🛏 {s.room}</span>
        <span>📅 {s.dates}</span>
        <span>💳 {s.pay}</span>
        <small className="tg-time">14:32</small>
      </div>
      <div className="tg-bubble">
        <b>📊 {s.summary}</b>
        <span>🏠 {data.business.name}</span>
        <hr />
        <span>🛏 {s.inHouse}</span>
        <span>🟢 {s.ins}</span>
        <span>🔴 {s.outs}</span>
        <span>💵 {s.money}</span>
        <small className="tg-time">{form?.report_time || "21:00"}</small>
      </div>
    </div>
  );

  const hero = <Hero icon={Send} title={ctx.g.addonInfo.gh_telegram.name} sub={a.active ? t.tgOn.replace("{date}", fmtDate(a.expires_at, lang)) : t.tgOff.replace("{price}", a.price ?? "")} addon="gh_telegram" ctx={ctx} yearly />;
  if (!a.active)
    return (
      <div className="rs-col">
        {hero}
        <section className="panel-card tg-promo">
          {sample}
          <div>
            <h2>{ctx.g.addonInfo.gh_telegram.name}</h2>
            <p className="rs-muted">{t.tgSub}</p>
            <ul className="tg-list">
              {ctx.g.addonInfo.gh_telegram.perks.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    );
  if (!status || !form) return <ListSkeleton rows={3} />;
  const dirty = ["daily_report", "report_time", ...FLAGS].some((k) => form[k] !== status[k]);

  return (
    <div className="rs-col">
      {hero}
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
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => run("test", () => guestHouseService.tgTest(ctx.id), t.testSent)} disabled={readOnly || !!busy}>
                  {busy === "test" ? <Loader2 size={15} className="md-spin" /> : <BellRing size={15} />} {t.sendTest}
                </button>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm tg-danger" onClick={() => run("off", () => guestHouseService.tgOff(ctx.id), t.disconnected)} disabled={readOnly || !!busy}>
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
            <h2>{t.alertsTitle}</h2>
            <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
              {t.alertsSub}
            </p>
            <div className="tg-more">
              {FLAGS.map((k) => (
                <label key={k} className="tg-toggle">
                  <span>
                    <b>{t[`a_${k}`]}</b>
                    <small className="rs-muted">{t[`a_${k}_sub`]}</small>
                  </span>
                  <span className="md-switch">
                    <input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} disabled={readOnly} aria-label={t[`a_${k}`]} />
                    <span className="md-switch-track" />
                  </span>
                </label>
              ))}
              <label className="tg-toggle">
                <span>
                  <b>{t.dailyReport}</b>
                  <small className="rs-muted">{t.dailyReportSub}</small>
                </span>
                <span className="md-switch">
                  <input type="checkbox" checked={!!form.daily_report} onChange={(e) => setForm({ ...form, daily_report: e.target.checked })} disabled={readOnly} aria-label={t.dailyReport} />
                  <span className="md-switch-track" />
                </span>
              </label>
              {form.daily_report && (
                <label className="ghb-field gh-tg-time">
                  <span>{t.reportTime}</span>
                  <input type="time" value={form.report_time} onChange={(e) => setForm({ ...form, report_time: e.target.value })} disabled={readOnly} />
                </label>
              )}
            </div>
            <div className="tg-save">
              <span />
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" disabled={readOnly || busy === "save" || !dirty} onClick={() => run("save", () => guestHouseService.tgSave(ctx.id, form), t.saved)}>
                {busy === "save" ? t.saving : t.save}
              </button>
            </div>
          </section>
        </div>
        <aside className="rs-side tg-side">
          <small className="rs-muted">{t.preview}</small>
          {sample}
        </aside>
      </div>
    </div>
  );
}

// ============================ FOREIGN GUEST REPORT ============================
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function PoliceSheet({ rep, data, lang, t, g }) {
  const b = data.business;
  return (
    <div className="ghpo-print">
      <header>
        <div>
          <b>{b.name}</b>
          <small>{[b.address, b.phone].filter(Boolean).join(" · ")}</small>
        </div>
        <div className="r">
          <b>{t.poPrintTitle}</b>
          <small>{t.poPrintDays.replace("{from}", fmtDay(rep.from, lang, { day: "numeric", month: "short", year: "numeric" })).replace("{to}", fmtDay(rep.to, lang, { day: "numeric", month: "short", year: "numeric" }))}</small>
        </div>
      </header>
      <table>
        <thead>
          <tr>
            <th>{t.poNo}</th>
            <th>{t.poName}</th>
            <th>{t.poGender}</th>
            <th>{t.poDob}</th>
            <th>{t.poNat}</th>
            <th>{t.poDoc}</th>
            <th>{t.poVisa}</th>
            <th>{t.poRoom}</th>
            <th>{t.poIn}</th>
            <th>{t.poOut}</th>
          </tr>
        </thead>
        <tbody>
          {rep.rows.map((r, i) => (
            <tr key={r._id}>
              <td>{i + 1}</td>
              <td>{r.guest.name}</td>
              <td>{r.guest.gender ? g.genders[r.guest.gender] : ""}</td>
              <td>{r.guest.dob}</td>
              <td>{r.guest.nationality}</td>
              <td>{r.guest.id_number}</td>
              <td>{[r.guest.visa_type, r.guest.visa_until].filter(Boolean).join(" · ")}</td>
              <td>{r.room}</td>
              <td>{r.from}</td>
              <td>{r.to}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer>
        <span>{t.poCount.replace("{n}", rep.foreign)}</span>
        <span className="sign">{t.poSign}</span>
      </footer>
    </div>
  );
}
export function PoliceTab({ ctx }) {
  const { lang, data, g } = ctx;
  const t = x3(lang);
  const a = data.addons?.gh_police || {};
  const today = todayKH();
  const [range, setRange] = useState({ from: today, to: today, all: false });
  const [rep, setRep] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(() => {
    if (!a.active) return;
    setRep(null);
    guestHouseService
      .police(ctx.id, { from: range.from, to: range.to, all: range.all ? "1" : "" })
      .then((r) => setRep(r.data))
      .catch((e) => (e.status === 402 ? ctx.askBuy({ addon: "gh_police" }) : ctx.notify({ type: "error", text: e.message })));
  }, [ctx.id, range, a.active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);

  const hero = <Hero icon={ShieldCheck} title={t.poTitle} sub={a.active ? t.poSub : t.poOff.replace("{price}", a.price ?? "")} addon="gh_police" ctx={ctx} />;
  if (!a.active)
    return (
      <div className="rs-col">
        {hero}
        <Perks ctx={ctx} addon="gh_police" />
      </div>
    );

  const download = () => {
    const head = [t.poNo, t.poName, t.poGender, t.poDob, t.poNat, t.poDoc, t.poVisa, g.visaUntil, t.poRoom, t.poIn, t.poOut, t.poPhone];
    const lines = rep.rows.map((r, i) => [i + 1, r.guest.name, r.guest.gender ? g.genders[r.guest.gender] : "", r.guest.dob, r.guest.nationality, r.guest.id_number, r.guest.visa_type, r.guest.visa_until, r.room, r.from, r.to, r.guest.phone]);
    const csv = "﻿" + [head, ...lines].map((l) => l.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const el = document.createElement("a");
    el.href = url;
    el.download = `foreign-guests-${rep.from}${rep.to !== rep.from ? `_${rep.to}` : ""}.csv`;
    el.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const quick = [
    [t.today, today, today],
    [t.yesterday, addDays(today, -1), addDays(today, -1)],
  ];

  return (
    <div className="rs-col">
      {hero}
      <section className="panel-card ghpo-bar">
        <div className="ghpo-quick">
          {quick.map(([label, f, to]) => (
            <button key={label} type="button" className={`rs-pill ${range.from === f && range.to === to ? "ok" : ""}`} onClick={() => setRange({ ...range, from: f, to })}>
              {label}
            </button>
          ))}
        </div>
        <label className="ghb-field">
          <span>{t.poFrom}</span>
          <input type="date" value={range.from} max={today} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value, to: range.to < e.target.value ? e.target.value : range.to })} />
        </label>
        <label className="ghb-field">
          <span>{t.poTo}</span>
          <input type="date" value={range.to} min={range.from} max={addDays(range.from, 92)} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })} />
        </label>
        <label className="md-switch">
          <input type="checkbox" checked={!range.all} onChange={(e) => setRange({ ...range, all: !e.target.checked })} />
          <span className="md-switch-track" />
          <span>{t.onlyForeign}</span>
        </label>
        <div className="ghpo-actions">
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={!rep?.rows.length} onClick={download}>
            <Download size={15} /> {t.download}
          </button>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" disabled={!rep?.rows.length} onClick={() => printReceipt(<PoliceSheet rep={rep} data={data} lang={lang} t={t} g={g} />, "a4")}>
            <Printer size={15} /> {t.print}
          </button>
        </div>
      </section>
      {!rep ? (
        <ListSkeleton rows={4} />
      ) : !rep.rows.length ? (
        <section className="panel-card ghpm-empty">
          <ShieldCheck size={40} />
          <p className="rs-muted">{t.poNone}</p>
        </section>
      ) : (
        <section className="panel-card">
          <div className="ghpo-sum">
            <b>{t.poCount.replace("{n}", rep.foreign)}</b>
            {Object.entries(rep.countries)
              .sort((x, y) => y[1] - x[1])
              .map(([c, n]) => (
                <span key={c} className="rs-pill">
                  {c} · {n}
                </span>
              ))}
          </div>
          {rep.missing > 0 && <div className="rs-banner warn">{t.poMissing.replace("{n}", rep.missing)}</div>}
          <div className="gh-rtable-wrap">
            <table className="gh-rtable ghpo-table">
              <thead>
                <tr>
                  <th>{t.poName}</th>
                  <th>{t.poGender}</th>
                  <th>{t.poDob}</th>
                  <th>{t.poNat}</th>
                  <th>{t.poDoc}</th>
                  <th>{t.poVisa}</th>
                  <th>{t.poRoom}</th>
                  <th>{t.poIn}</th>
                  <th>{t.poOut}</th>
                </tr>
              </thead>
              <tbody>
                {rep.rows.map((r) => {
                  const miss = (k) => r.missing.includes(k) && <em className="ghpo-miss">{t.missing}</em>;
                  return (
                    <tr key={r._id} onClick={() => setOpen(r._id)} className="click">
                      <td>
                        <b>{r.guest.name}</b>
                        {!r.foreign && <small className="rs-muted"> 🇰🇭</small>}
                      </td>
                      <td>{r.guest.gender ? g.genders[r.guest.gender] : miss("gender")}</td>
                      <td>{r.guest.dob || miss("dob")}</td>
                      <td>{r.guest.nationality || miss("nationality")}</td>
                      <td>{r.guest.id_number || miss("id_number")}</td>
                      <td>{[r.guest.visa_type, r.guest.visa_until && fmtDay(r.guest.visa_until, lang)].filter(Boolean).join(" · ")}</td>
                      <td>{r.room}</td>
                      <td>{fmtDay(r.from, lang)}</td>
                      <td>{fmtDay(r.to, lang)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {open && <StayModal ctx={ctx} stayId={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}

// ============================ EXTRA SERVICES ============================
const monthStart = (d) => `${d.slice(0, 7)}-01`;
export function ServicesTab({ ctx }) {
  const { lang, data, readOnly, cur } = ctx;
  const t = x3(lang);
  const a = data.addons?.gh_services || {};
  const [info, setInfo] = useState(null);
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const today = todayKH();
  const lastMonthEnd = addDays(monthStart(today), -1);
  const [period, setPeriod] = useState("this");
  const range = period === "this" ? { from: monthStart(today), to: today } : { from: monthStart(lastMonthEnd), to: lastMonthEnd };
  const [rep, setRep] = useState(null);

  useEffect(() => {
    guestHouseService
      .services(ctx.id)
      .then((r) => {
        setInfo(r.data);
        setList(r.data.list.map((x) => ({ ...x })));
      })
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx.id, a.active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!a.active) return;
    setRep(null);
    guestHouseService
      .servicesReport(ctx.id, range)
      .then((r) => setRep(r.data))
      .catch(() => setRep({ items: [], total: 0, qty: 0 }));
  }, [ctx.id, a.active, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => info && list && JSON.stringify(list) !== JSON.stringify(info.list), [info, list]);
  const hero = <Hero icon={ConciergeBell} title={t.svTitle} sub={a.active ? t.svSub : t.svOff.replace("{price}", a.price ?? "")} addon="gh_services" ctx={ctx} />;
  if (!info || !list) return <ListSkeleton rows={4} />;
  if (!a.active)
    return (
      <div className="rs-col">
        {hero}
        <Perks ctx={ctx} addon="gh_services" />
        <section className="panel-card">
          <div className="gh-svc">
            {t.examples.map(([name, price, icon]) => (
              <button key={name} type="button" disabled>
                <span aria-hidden="true">{SVC_EMOJI[icon]}</span>
                <b>{name}</b>
                <small>{money(price, cur)}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    );

  const set = (i, patch) => setList(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = async () => {
    setBusy(true);
    try {
      const r = await guestHouseService.saveServices(
        ctx.id,
        list.map((x) => ({ ...x, price: Number(x.price) || 0 })),
      );
      setInfo({ ...info, list: r.data.list });
      setList(r.data.list.map((x) => ({ ...x })));
      ctx.notify({ type: "success", text: t.saved });
      ctx.reload();
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "gh_services" });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rs-col">
      {hero}
      <section className="panel-card">
        {!list.length ? (
          <div className="ghpm-empty">
            <ConciergeBell size={40} />
            <p className="rs-muted">{t.svNone}</p>
            <button type="button" className="md-btn md-btn-ghost" disabled={readOnly} onClick={() => setList(t.examples.map(([name, price, icon]) => ({ name, price, icon, active: true })))}>
              <Plus size={15} /> {t.svExamples}
            </button>
          </div>
        ) : (
          <div className="ghsv-list">
            {list.map((x, i) => (
              <div key={x._id || `n${i}`} className={`ghsv-row ${x.active ? "" : "off"}`}>
                <select value={x.icon} onChange={(e) => set(i, { icon: e.target.value })} aria-label={t.svIcon} disabled={readOnly}>
                  {info.icons.map((k) => (
                    <option key={k} value={k}>
                      {SVC_EMOJI[k]} {t.icons[k]}
                    </option>
                  ))}
                </select>
                <input maxLength={60} placeholder={t.svNamePh} value={x.name} onChange={(e) => set(i, { name: e.target.value })} aria-label={t.svName} disabled={readOnly} />
                <input type="number" min={0} step="any" value={x.price} onChange={(e) => set(i, { price: e.target.value })} aria-label={t.svPrice} className="gh-num" disabled={readOnly} />
                <label className="md-switch" title={t.svOnOff}>
                  <input type="checkbox" checked={x.active !== false} onChange={(e) => set(i, { active: e.target.checked })} aria-label={t.svOnOff} disabled={readOnly} />
                  <span className="md-switch-track" />
                </label>
                <button type="button" className="md-icon-btn" onClick={() => setList(list.filter((_, j) => j !== i))} aria-label={t.svRemove} disabled={readOnly}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="ghsv-foot">
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={readOnly || list.length >= 40} onClick={() => setList([...list, { name: "", price: "", icon: "other", active: true }])}>
            <Plus size={14} /> {t.svAdd}
          </button>
          {dirty && <small className="rs-muted">{t.svUnsaved}</small>}
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" disabled={readOnly || busy || !dirty || list.some((x) => !String(x.name).trim() || x.price === "")} onClick={save}>
            {busy ? t.saving : t.save}
          </button>
        </div>
      </section>

      <section className="panel-card gh-list">
        <div className="at-ro-head">
          <h3 style={{ margin: 0 }}>{t.svReport}</h3>
          <div className="ghpo-quick">
            {[
              ["this", t.svThisMonth],
              ["last", t.svLastMonth],
            ].map(([k, label]) => (
              <button key={k} type="button" className={`rs-pill ${period === k ? "ok" : ""}`} onClick={() => setPeriod(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {!rep ? (
          <ListSkeleton rows={3} />
        ) : !rep.items.length ? (
          <p className="rs-muted">{t.svNoSales}</p>
        ) : (
          <>
            {rep.items.map((x) => (
              <div key={x.service_id} className="gh-line">
                <span>
                  {SVC_EMOJI[x.icon] || SVC_EMOJI.other} {x.name} <small className="rs-muted">× {x.qty}</small>
                </span>
                <b>{money(x.total, cur)}</b>
              </div>
            ))}
            <div className="gh-line ghsv-total">
              <span>
                {t.svQty}: {rep.qty}
              </span>
              <b>{money(rep.total, cur)}</b>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
