import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  BellRing,
  CalendarClock,
  Check,
  CheckCheck,
  Download,
  FileDown,
  FileSpreadsheet,
  GripVertical,
  LayoutTemplate,
  Loader2,
  Lock,
  Mic,
  Plus,
  Printer,
  Search,
  Send,
  Trash2,
  Unplug,
  UserCheck,
  X,
} from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { Head, Switch } from "../menuqr/parts";
import { BlockView } from "../../../note/blocks";
import { themeLook } from "../../../note/themes";
import { downloadXlsx } from "../../../lib/xlsx";
import { Avatar, Modal } from "./NoteParts";
import "./v4.css";
import "../../../note/print.css";
import { ago, fmt, fmtDate, fmtTime } from "./text";

// Digital Note v4 (owner): Telegram alerts · "I've read it" · sign-up form fields + Excel · views per day · my templates · PDF
export const owns4 = (data) => ({
  telegram: !!data?.addons?.note_telegram?.active,
  ack: !!data?.addons?.note_ack?.active,
  form: !!data?.addons?.note_form?.active,
  voice: !!data?.addons?.note_voice?.active,
  pdf: !!data?.addons?.note_pdf?.active,
});
export const FIELD_TYPES = ["text", "number", "phone", "email", "date", "choice", "checkbox"];
// a safe file name: no path characters, dashes as "-" (a "—" in the name makes the browser drop the whole name), Khmer kept
const fileName = (s, ext) =>
  `${
    String(s || "note")
      .replace(/[\u2010-\u2015\u2212]/g, "-")
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "note"
  }.${ext}`;
const newFieldId = () => `f${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------- pictures for the unlock windows
export function V4Stage({ kind, m }) {
  if (kind === "note_telegram")
    return (
      <div className="v4-stage tg" aria-hidden="true">
        <div className="v4-phone">
          <div className="v4-chat-top">
            <BellRing size={14} /> BizHub
          </div>
          <div className="v4-bubble">
            <b>💬 {m.tgEx1Title}</b>
            <span>{m.tgEx1}</span>
          </div>
          <div className="v4-bubble">
            <b>📋 {m.tgEx2Title}</b>
            <span>{m.tgEx2}</span>
          </div>
          <div className="v4-bubble">
            <b>⏰ {m.tgEx3Title}</b>
            <span>{m.tgEx3}</span>
          </div>
        </div>
      </div>
    );
  if (kind === "note_ack")
    return (
      <div className="v4-stage ack" aria-hidden="true">
        <div className="v4-ack-btn">
          <CheckCheck size={20} /> {m.ackBtn}
        </div>
        <div className="v4-ack-list">
          {["Sokha", "Dara", "Vanna"].map((n, i) => (
            <span key={n} className={i < 2 ? "on" : ""}>
              {i < 2 ? <Check size={12} /> : <span className="v4-dot" />} {n}
            </span>
          ))}
        </div>
      </div>
    );
  if (kind === "note_form")
    return (
      <div className="v4-stage form" aria-hidden="true">
        <div className="v4-form">
          {[m.fxName, m.fxPhone, m.fxSize].map((l) => (
            <span key={l}>
              <small>{l}</small>
              <i />
            </span>
          ))}
        </div>
        <span className="v4-xls">
          <FileSpreadsheet size={18} /> Excel
        </span>
      </div>
    );
  if (kind === "note_voice")
    return (
      <div className="v4-stage voice" aria-hidden="true">
        <span className="v4-mic">
          <Mic size={26} />
        </span>
        <div className="v4-wave">
          {[30, 60, 42, 80, 54, 92, 40, 70, 36, 64, 48, 76, 30].map((h, i) => (
            <i key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    );
  if (kind === "note_pdf")
    return (
      <div className="v4-stage pdf" aria-hidden="true">
        <div className="v4-page">
          <span className="v4-page-logo" />
          <b />
          <i />
          <i />
          <i className="short" />
          <span className="v4-page-tbl" />
        </div>
        <span className="v4-pdf-badge">
          <FileDown size={16} /> PDF
        </span>
      </div>
    );
  return null;
}

// ---------------------------------------------------------------- 1. Telegram alerts (a page in "More")
export function AlertsTab({ ctx }) {
  const { m, api, data, readOnly, notify, lang } = ctx;
  const owned = owns4(data).telegram;
  const [tg, setTg] = useState(() => data.telegram || {});
  const [busy, setBusy] = useState("");
  const [waiting, setWaiting] = useState(false);
  useEffect(() => setTg(data.telegram || {}), [data.telegram]);
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setInterval(() => {
      api
        .get()
        .then((r) => {
          if (r.data.telegram?.connected) {
            setTg(r.data.telegram);
            setWaiting(false);
            ctx.put({ telegram: r.data.telegram });
          }
        })
        .catch(() => {});
    }, 3000);
    const stop = setTimeout(() => setWaiting(false), 15 * 60000);
    return () => (clearInterval(t), clearTimeout(stop));
  }, [waiting]); // eslint-disable-line react-hooks/exhaustive-deps
  const lic = data.addons?.note_telegram || {};
  if (!owned)
    return (
      <div className="rs-col">
        <Head icon={BellRing} title={m.alertsTitle} sub={m.alertsSub} />
        <section className="panel-card v4-locked" data-testid="nt-alerts-locked">
          <V4Stage kind="note_telegram" m={m} />
          <div className="v4-locked-text">
            <h3>{m.tgCard}</h3>
            <ul className="v4-perks">
              {m.tgPerks.map((p) => (
                <li key={p}>
                  <Check size={14} /> {p}
                </li>
              ))}
            </ul>
            <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy("note_telegram")} disabled={readOnly} data-testid="nt-buy-telegram">
              <CoinIcon size={15} /> {m.tgUnlock.replace("{coins}", fmt(ctx.prices.note_telegram))}
            </button>
          </div>
        </section>
      </div>
    );
  const save = async (patch) => {
    const next = { ...tg, ...patch };
    setTg(next);
    try {
      const r = await api.telegramSave(patch);
      setTg(r.data || next);
      ctx.put({ telegram: r.data || next });
    } catch (e) {
      setTg(tg);
      ctx.onError(e);
    }
  };
  const link = async (group) => {
    setBusy("link");
    try {
      const r = await api.telegramLink();
      window.open(group ? r.data.group_url : r.data.url, "_blank", "noopener");
      setWaiting(true);
    } catch (e) {
      ctx.onError(e);
    }
    setBusy("");
  };
  const replyMode = tg.replies === false ? "off" : tg.replies_batch ? "batch" : "now";
  const sw = (key, label, sub) => (
    <div className={`nt-safe v4-sw ${tg[key] !== false ? "on" : ""}`}>
      <span>
        <b>{label}</b>
        <small>{sub}</small>
      </span>
      <Switch checked={tg[key] !== false} onChange={(v) => save({ [key]: v })} label="" disabled={readOnly || !tg.connected} testid={`nt-tg-${key}`} />
    </div>
  );
  return (
    <div className="rs-col">
      <Head icon={BellRing} title={m.alertsTitle} sub={m.alertsSub}>
        {lic.expires_at && (
          <span className={`rs-pill ${lic.active ? "on" : "bad"}`}>
            <CalendarClock size={12} /> {(lic.active ? m.planActive : m.planEnded).replace("{date}", fmtDate(lic.expires_at, lang))}
          </span>
        )}
      </Head>
      <section className="panel-card qg-tg" data-testid="nt-tg">
        <h3 className="v4-h3">{m.tgChat}</h3>
        <p className="rs-muted">{m.tgChatSub}</p>
        {tg.configured === false ? (
          <p className="rs-muted">{m.tgNotConfigured}</p>
        ) : tg.connected ? (
          <div className="v4-tg-on">
            <span className="rs-pill on">
              <Check size={13} /> {m.tgConnected.replace("{name}", tg.chat_name || "Telegram")}
            </span>
            <div className="qg-bulk-acts">
              <button
                type="button"
                className="md-btn md-btn-primary sa-btn-sm"
                disabled={!!busy || readOnly}
                onClick={async () => {
                  setBusy("test");
                  try {
                    await api.telegramTest();
                    notify({ type: "success", text: m.tgSentOk });
                  } catch (e) {
                    ctx.onError(e);
                  }
                  setBusy("");
                }}
                data-testid="nt-tg-test"
              >
                {busy === "test" ? <Loader2 size={14} className="md-spin" /> : <Send size={14} />} {m.tgTest}
              </button>
              <button
                type="button"
                className="md-btn md-btn-ghost sa-btn-sm"
                disabled={!!busy || readOnly}
                onClick={async () => {
                  try {
                    const r = await api.telegramOff();
                    setTg(r.data || { ...tg, connected: false });
                    ctx.put({ telegram: r.data || { ...tg, connected: false } });
                  } catch (e) {
                    ctx.onError(e);
                  }
                }}
              >
                <Unplug size={14} /> {m.tgDisconnect}
              </button>
            </div>
          </div>
        ) : (
          <div className="qg-bulk-acts">
            <button type="button" className="md-btn md-btn-primary" onClick={() => link(false)} disabled={!!busy || readOnly} data-testid="nt-tg-connect">
              {busy === "link" ? <Loader2 size={15} className="md-spin" /> : <Send size={15} />} {m.tgConnect}
            </button>
            <button type="button" className="md-btn md-btn-ghost" onClick={() => link(true)} disabled={!!busy || readOnly}>
              {m.tgGroup}
            </button>
            {waiting && (
              <small className="rs-muted v4-wait">
                <Loader2 size={13} className="md-spin" /> {m.tgWaiting}
              </small>
            )}
          </div>
        )}
      </section>
      <section className={`panel-card v4-tg-opts ${tg.connected ? "" : "is-off"}`}>
        <h3 className="v4-h3">{m.tgWhatH}</h3>
        {!tg.connected && <p className="rs-muted">{m.tgConnectFirst}</p>}
        <div className="v4-sw v4-replies">
          <span>
            <b>{m.tgReplies}</b>
            <small>{m.tgRepliesSub}</small>
          </span>
          <div className="v4-seg" role="radiogroup" aria-label={m.tgReplies}>
            {["now", "batch", "off"].map((k) => (
              <button key={k} type="button" role="radio" aria-checked={replyMode === k} className={replyMode === k ? "on" : ""} onClick={() => save(k === "off" ? { replies: false } : { replies: true, replies_batch: k === "batch" })} disabled={readOnly || !tg.connected} data-testid={`nt-tg-replies-${k}`}>
                {m.tgRepliesOpts[k]}
              </button>
            ))}
          </div>
        </div>
        {sw("signups", m.tgSignups, m.tgSignupsSub)}
        {sw("edits", m.tgEdits, m.tgEditsSub)}
        {sw("acks", m.tgAcks, m.tgAcksSub)}
        {sw("reminders", m.tgReminders, m.tgRemindersSub)}
        {sw("daily", m.tgDaily, m.tgDailySub)}
        <div className="v4-sw v4-replies">
          <span>
            <b>{m.tgLang}</b>
            <small>{m.tgLangSub}</small>
          </span>
          <div className="v4-seg" role="radiogroup" aria-label={m.tgLang}>
            {["km", "en"].map((k) => (
              <button key={k} type="button" role="radio" aria-checked={(tg.lang || "km") === k} className={(tg.lang || "km") === k ? "on" : ""} onClick={() => save({ lang: k })} disabled={readOnly || !tg.connected}>
                {k === "km" ? "ខ្មែរ" : "English"}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="panel-card">
        <h3 className="v4-h3">{m.howItWorks}</h3>
        <p className="rs-muted">{m.tgHow}</p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- 2. "I've read it": who confirmed
export function AckTab({ ctx, note, onShare }) {
  const { m, api, lang } = ctx;
  const [d, setD] = useState(null);
  const on = !!note.share?.ack;
  useEffect(() => {
    if (!on) return;
    api
      .acks(note._id)
      .then((r) => setD({ rows: r.data || [], not: r.not_confirmed || [], counts: r.counts || {} }))
      .catch((e) => (setD({ rows: [], not: [], counts: {} }), ctx.notify({ type: "error", text: e.message })));
  }, [api, note._id, on]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!on)
    return (
      <section className="panel-card nt-tab v4-ack-off" data-testid="nt-ack-off">
        <V4Stage kind="note_ack" m={m} />
        <h3>{m.ackTitle}</h3>
        <p className="rs-muted">{m.ackOffSub}</p>
        {owns4(ctx.data).ack ? (
          <button type="button" className="md-btn md-btn-primary" onClick={onShare}>
            {m.ackTurnOn}
          </button>
        ) : (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy("note_ack")} disabled={ctx.readOnly}>
            <CoinIcon size={15} /> {m.ackUnlock.replace("{coins}", fmt(ctx.prices.note_ack))}
          </button>
        )}
      </section>
    );
  const rows = d?.rows || [];
  const not = d?.not || [];
  // the server's CSV: everyone (not only what is on screen), cells safe for Excel
  const csv = () => api.acksCsv(note._id, fileName(`${note.title || "note"} - ${m.ackTitle}`, "csv")).catch((er) => ctx.notify({ type: "error", text: er.message }));
  return (
    <section className="panel-card nt-tab" data-testid="nt-ack-tab">
      <div className="nt-tab-head">
        <div>
          <h3>{m.ackTitle}</h3>
          {d && <p className="rs-muted">{m.ackCount.replace("{n}", fmt(d.counts.confirmed ?? rows.length)).replace("{k}", fmt(d.counts.opened_not_confirmed ?? not.length))}</p>}
        </div>
        {(rows.length > 0 || not.length > 0) && (
          <button type="button" className="md-btn md-btn-ghost" onClick={csv}>
            <Download size={15} /> {m.csv}
          </button>
        )}
      </div>
      {!d && (
        <div className="nt-loading">
          <Loader2 size={22} className="md-spin" />
        </div>
      )}
      {d && (
        <div className="v4-ack-meter" aria-hidden="true">
          <i style={{ width: `${rows.length + not.length ? Math.round((rows.length / (rows.length + not.length)) * 100) : 0}%` }} />
        </div>
      )}
      {d && !rows.length && !not.length && <p className="nt-none">{m.ackNone}</p>}
      {rows.length > 0 && (
        <>
          <h4 className="v4-sub-h">
            <UserCheck size={15} /> {m.ackDone}
          </h4>
          <ul className="nt-seen">
            {rows.map((r, i) => (
              <li key={i}>
                <Avatar name={r.name || m.guest} />
                <span className="nt-seen-name">
                  <b>{r.name || m.guest}</b>
                  <small>
                    {fmtTime(r.at, lang)}
                    {r.by_group ? ` · ${m.ackByGroup}` : ""}
                  </small>
                </span>
                <span className="v4-ack-ok">
                  <CheckCheck size={15} /> {m.ackYes}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {not.length > 0 && (
        <>
          <h4 className="v4-sub-h">{m.ackNotYet}</h4>
          <ul className="nt-seen v4-not">
            {not.map((r, i) => (
              <li key={i}>
                <Avatar name={r.name || m.guest} />
                <span className="nt-seen-name">
                  <b>{r.name || m.guest}</b>
                  <small>
                    {m.ackOpened} {ago(r.last_at, m, lang)}
                  </small>
                </span>
                <span className="v4-ack-wait">{m.ackNo}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- 3. sign-up form fields
export function FormFieldsDialog({ ctx, note, onClose, onSaved }) {
  const { m, api } = ctx;
  const owned = owns4(ctx.data).form;
  const [fields, setFields] = useState(() => (note.form?.fields || []).map((f) => ({ ...f, options: f.options || [] })));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const drag = useRef(-1);
  const [over, setOver] = useState(-1);
  const put = (i, p) => setFields((l) => l.map((f, k) => (k === i ? { ...f, ...p } : f)));
  const move = (i, d) =>
    setFields((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const n = [...l];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const add = (type = "text") => {
    if (!owned) return ctx.askBuy("note_form");
    if (fields.length >= 20) return;
    setFields((l) => [...l, { id: newFieldId(), label: "", type, required: false, options: type === "choice" ? [m.fxOpt1, m.fxOpt2] : [] }]);
  };
  const save = async () => {
    setErr("");
    const clean = fields.map((f) => ({ ...f, label: f.label.trim(), options: f.type === "choice" ? f.options.map((o) => o.trim()).filter(Boolean) : [] }));
    if (clean.some((f) => !f.label)) return setErr(m.fxNeedLabel);
    if (clean.some((f) => f.type === "choice" && f.options.length < 1)) return setErr(m.fxNeedOptions);
    setBusy(true);
    try {
      const r = await api.save(note._id, { form: { fields: clean.map(({ id, label, type, required, options, max }) => ({ id, label, type, required: !!required, options, ...(max ? { max: Number(max) } : {}) })) } });
      onSaved(r.data);
      ctx.notify({ type: "success", text: m.fxSaved });
      onClose();
    } catch (e) {
      if (e.response?.code === "need_form") ctx.askBuy("note_form");
      else setErr(e.message);
    }
    setBusy(false);
  };
  return (
    <Modal
      title={m.fxTitle}
      onClose={onClose}
      size="md-modal-lg"
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy} data-testid="nt-fx-save">
            {busy && <Loader2 size={15} className="md-spin" />} {m.save}
          </button>
        </>
      }
    >
      <p className="rs-muted">{m.fxSub}</p>
      {!owned && (
        <div className="v4-lockbar">
          <Lock size={14} /> <span>{m.fxLocked}</span>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy("note_form")}>
            <CoinIcon size={14} /> {m.fxUnlock.replace("{coins}", fmt(ctx.prices.note_form))}
          </button>
        </div>
      )}
      <div className="v4-fields" data-testid="nt-fx-list">
        {fields.length === 0 && <p className="nt-none">{m.fxNone}</p>}
        {fields.map((f, i) => (
          <div
            key={f.id}
            className={`v4-field ${over === i ? "over" : ""}`}
            draggable
            onDragStart={() => (drag.current = i)}
            onDragOver={(e) => (e.preventDefault(), setOver(i))}
            onDragLeave={() => setOver(-1)}
            onDrop={() => {
              const from = drag.current;
              setOver(-1);
              if (from < 0 || from === i) return;
              setFields((l) => {
                const n = [...l];
                const [x] = n.splice(from, 1);
                n.splice(i, 0, x);
                return n;
              });
            }}
          >
            <span className="v4-grip" aria-hidden="true">
              <GripVertical size={16} />
            </span>
            <div className="v4-field-main">
              <div className="v4-field-row">
                <input className="md-input" value={f.label} onChange={(e) => put(i, { label: e.target.value.slice(0, 80) })} placeholder={m.fxLabelPh} aria-label={m.fxLabel} data-testid="nt-fx-label" />
                <select className="md-input v4-type" value={f.type} onChange={(e) => put(i, { type: e.target.value, options: e.target.value === "choice" && !f.options.length ? [m.fxOpt1, m.fxOpt2] : f.options })} aria-label={m.fxType}>
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {m.fxTypes[t]}
                    </option>
                  ))}
                </select>
              </div>
              {f.type === "choice" && (
                <div className="v4-opts">
                  {f.options.map((o, k) => (
                    <span key={k} className="v4-opt">
                      <input value={o} onChange={(e) => put(i, { options: f.options.map((x, j) => (j === k ? e.target.value.slice(0, 60) : x)) })} aria-label={m.fxOption} />
                      <button type="button" onClick={() => put(i, { options: f.options.filter((_, j) => j !== k) })} aria-label={m.removeBlock}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {f.options.length < 30 && (
                    <button type="button" className="v4-opt-add" onClick={() => put(i, { options: [...f.options, ""] })}>
                      <Plus size={13} /> {m.fxAddOption}
                    </button>
                  )}
                </div>
              )}
              <div className="v4-field-foot">
                <Switch checked={!!f.required} onChange={(v) => put(i, { required: v })} label={m.fxRequired} />
                {f.type === "text" && (
                  <label className="v4-max">
                    {m.fxMax}
                    <input type="number" min={1} max={1000} value={f.max || ""} placeholder="200" onChange={(e) => put(i, { max: e.target.value ? Math.min(1000, Math.max(1, Number(e.target.value))) : undefined })} />
                  </label>
                )}
              </div>
            </div>
            <span className="v4-field-acts">
              <button type="button" className="md-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={m.moveUp}>
                <ArrowUp size={15} />
              </button>
              <button type="button" className="md-icon-btn" onClick={() => move(i, 1)} disabled={i === fields.length - 1} aria-label={m.moveDown}>
                <ArrowDown size={15} />
              </button>
              <button type="button" className="md-icon-btn" onClick={() => setFields((l) => l.filter((_, k) => k !== i))} aria-label={m.delete}>
                <Trash2 size={15} />
              </button>
            </span>
          </div>
        ))}
      </div>
      <div className="v4-addfield">
        {FIELD_TYPES.map((t) => (
          <button key={t} type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => add(t)} disabled={fields.length >= 20} data-testid={`nt-fx-add-${t}`}>
            {!owned && <Lock size={12} />} <Plus size={13} /> {m.fxTypes[t]}
          </button>
        ))}
      </div>
      {err && <div className="md-notice md-notice-error">{err}</div>}
    </Modal>
  );
}

// a field value as text (table, CSV, Excel)
export const fieldText = (f, v, m) => {
  if (v === undefined || v === null || v === "") return "";
  if (f.type === "checkbox") return v === true || v === "true" ? m.yes : m.no;
  return String(v);
};

// the sign-up rows as a table: sort by a column, search, CSV (free) / Excel (with the form add-on)
export function FormTable({ ctx, note, rows }) {
  const { m, lang } = ctx;
  const fields = note.form?.fields || [];
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ by: "time", dir: -1 });
  const cols = useMemo(() => [{ id: "name", label: m.ackColName }, ...fields.map((f) => ({ id: f.id, label: f.label, f })), { id: "text", label: m.fxText }, { id: "files", label: m.fxFiles }, { id: "time", label: m.fxTime }], [fields, m]);
  const valOf = (r, c) => {
    if (c.id === "name") return r.name || "";
    if (c.id === "text") return r.text || "";
    if (c.id === "files") return (r.files || []).length;
    if (c.id === "time") return r.created_date || "";
    return fieldText(c.f, r.fields?.[c.id], m);
  };
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) => !needle || cols.some((c) => String(valOf(r, c)).toLowerCase().includes(needle)));
    const c = cols.find((x) => x.id === sort.by) || cols[cols.length - 1];
    const f = c.f;
    return [...list].sort((a, b) => {
      let x = valOf(a, c);
      let y = valOf(b, c);
      if ((f && f.type === "number") || c.id === "files") {
        x = Number(x) || 0;
        y = Number(y) || 0;
        return (x - y) * sort.dir;
      }
      return String(x).localeCompare(String(y), lang === "km" ? "km" : "en", { numeric: true }) * sort.dir;
    });
  }, [rows, q, sort, cols, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const owned = owns4(ctx.data).form;
  const [xBusy, setXBusy] = useState(false);
  const excel = async () => {
    if (!owned) return ctx.askBuy("note_form");
    setXBusy(true);
    try {
      const r = await ctx.api.exportRows(note._id, "xlsx");
      const d = r.data || r;
      // times from the server (ISO) → the owner's own clock, as "2026-10-21 09:55"
      const p2 = (n) => String(n).padStart(2, "0");
      const local = (v) => {
        if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return v;
        const t = new Date(v);
        return Number.isNaN(t.getTime()) ? v : `${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())} ${p2(t.getHours())}:${p2(t.getMinutes())}`;
      };
      downloadXlsx(fileName(note.title, "xlsx"), note.title || m.collectTitle, [d.columns || [], ...(d.rows || []).map((row) => row.map(local))]);
    } catch (e) {
      ctx.onError(e);
    }
    setXBusy(false);
  };
  return (
    <div className="v4-table-wrap" data-testid="nt-form-table">
      <div className="v4-table-bar">
        <label className="nt-search">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.fxSearch} aria-label={m.fxSearch} />
        </label>
        <span className="rs-muted">{m.people.replace("{n}", fmt(shown.length))}</span>
        <span className="v4-grow" />
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.api.exportCsv(note._id, fileName(note.title, "csv")).catch((er) => ctx.notify({ type: "error", text: er.message }))}>
          <Download size={14} /> {m.csv}
        </button>
        <button type="button" className={`md-btn sa-btn-sm ${owned ? "md-btn-primary" : "md-btn-ghost"}`} onClick={excel} disabled={xBusy} data-testid="nt-xlsx">
          {xBusy ? <Loader2 size={14} className="md-spin" /> : owned ? <FileSpreadsheet size={14} /> : <Lock size={13} />} {m.excel}
        </button>
      </div>
      <div className="v4-table-scroll">
        <table className="v4-table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.id} onClick={() => setSort((s) => ({ by: c.id, dir: s.by === c.id ? -s.dir : c.id === "time" ? -1 : 1 }))} aria-sort={sort.by === c.id ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>
                  {c.label}
                  {sort.by === c.id && (sort.dir > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r._id} className={r.hidden ? "is-hidden" : ""}>
                {cols.map((c) => (
                  <td key={c.id} className={`c-${c.f?.type || c.id}`}>
                    {c.id === "time" ? ago(r.created_date, m, lang) : c.id === "files" ? (r.files || []).length || "" : valOf(r, c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="nt-none">{q ? m.fxNoMatch : m.noResponses}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 9. views per day (30 days)
export function StatsChart({ ctx, load, title }) {
  const { m, lang } = ctx;
  const [d, setD] = useState(null);
  useEffect(() => {
    let live = true;
    load()
      .then((r) => live && setD({ rows: r.days || r.data?.days || r.data || [], total: r.total || r.data?.total || {}, best: r.best || r.data?.best || null }))
      .catch(() => live && setD({ rows: [], total: {}, best: null }));
    return () => {
      live = false;
    };
  }, [load]);
  // every day of the last 30, also days without views
  const days = useMemo(() => {
    if (!d) return [];
    const by = Object.fromEntries((d.rows || []).map((r) => [r.day, r]));
    const out = [];
    const now = Date.now() + 7 * 3600000;
    for (let i = 29; i >= 0; i--) {
      const t = new Date(now - i * 86400000);
      const key = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
      out.push({ day: key, views: by[key]?.views || 0, people: by[key]?.people || 0 });
    }
    return out;
  }, [d]);
  const max = Math.max(1, ...days.map((x) => x.views));
  const total = d?.total?.views ?? days.reduce((a, x) => a + x.views, 0);
  const people = d?.total?.people ?? days.reduce((a, x) => a + x.people, 0);
  const best = d?.best?.views ? d.best : days.reduce((a, x) => (x.views > (a?.views || 0) ? x : a), null);
  const [tip, setTip] = useState(-1);
  const label = (day) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T05:00:00Z`));
  return (
    <section className="panel-card v4-stats" data-testid="nt-stats">
      <div className="nt-tab-head">
        <div>
          <h3>
            <BarChart3 size={17} /> {title || m.statsTitle}
          </h3>
          <p className="rs-muted">{m.statsSub}</p>
        </div>
      </div>
      {!d ? (
        <div className="nt-loading">
          <Loader2 size={20} className="md-spin" />
        </div>
      ) : (
        <>
          <div className="v4-stat-nums">
            <span>
              <b>{fmt(total)}</b>
              <small>{m.statsViews}</small>
            </span>
            <span>
              <b>{fmt(people)}</b>
              <small>{m.statsPeople}</small>
            </span>
            <span>
              <b>{best?.views ? label(best.day) : "—"}</b>
              <small>{best?.views ? m.statsBest.replace("{n}", fmt(best.views)) : m.statsBestNone}</small>
            </span>
          </div>
          <div className="v4-chart" onMouseLeave={() => setTip(-1)} role="img" aria-label={`${m.statsTitle}: ${fmt(total)} ${m.statsViews}`}>
            {days.map((x, i) => (
              <span key={x.day} className={`v4-bar ${tip === i ? "on" : ""}`} onMouseEnter={() => setTip(i)} onClick={() => setTip(i)}>
                <i style={{ height: `${x.views ? Math.max(6, Math.round((x.views / max) * 100)) : 2}%` }} />
                {x.people > 0 && <em style={{ bottom: `${Math.max(4, Math.round((x.people / max) * 100))}%` }} />}
              </span>
            ))}
            {tip >= 0 && days[tip] && (
              <span className="v4-tip" style={{ left: `${((tip + 0.5) / days.length) * 100}%` }}>
                <b>{label(days[tip].day)}</b>
                {m.statsTip.replace("{v}", fmt(days[tip].views)).replace("{p}", fmt(days[tip].people))}
              </span>
            )}
          </div>
          <div className="v4-chart-axis">
            <span>{label(days[0].day)}</span>
            <span className="v4-legend">
              <i className="b" /> {m.statsViews} <i className="p" /> {m.statsPeople}
            </span>
            <span>{label(days[days.length - 1].day)}</span>
          </div>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- 6. save a note as one of my templates
export function SaveTemplateDialog({ ctx, note, onClose }) {
  const { m, api } = ctx;
  const [name, setName] = useState((note.title || "").slice(0, 60));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    if (!name.trim()) return setErr(m.tplNeedName);
    setBusy(true);
    try {
      await api.saveTemplate({ note_id: note._id, name: name.trim().slice(0, 60) });
      ctx.notify({ type: "success", text: m.tplSaved });
      onClose();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={m.tplSaveTitle}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={go} disabled={busy || !name.trim()} data-testid="nt-tpl-save">
            {busy ? <Loader2 size={15} className="md-spin" /> : <LayoutTemplate size={15} />} {m.save}
          </button>
        </>
      }
    >
      <p className="rs-muted">{m.tplSaveSub}</p>
      <input className="md-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={m.tplNamePh} autoFocus onKeyDown={(e) => e.key === "Enter" && go()} aria-label={m.tplNamePh} data-testid="nt-tpl-name" />
      {err && <div className="md-notice md-notice-error">{err}</div>}
    </Modal>
  );
}

// ---------------------------------------------------------------- 8. a branded PDF (the browser's "Save as PDF": real text, Khmer works)
export function PdfDialog({ ctx, note, title, blocks, onClose }) {
  const { m, api } = ctx;
  const collect = note.share?.level === "collect";
  const [d, setD] = useState(null); // GET /notes/:nid/print → { note, business, entries, acks, theme, printed_at }
  const [withEntries, setWithEntries] = useState(true);
  const [withAcks, setWithAcks] = useState(true);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    api
      .print(note._id)
      .then((r) => live && setD(r.data || r))
      .catch((e) => {
        if (!live) return;
        if (e.response?.code === "need_pdf") {
          onClose();
          return ctx.askBuy("note_pdf");
        }
        setErr(e.message);
        setD({ entries: [], acks: [] });
      });
    return () => {
      live = false;
    };
  }, [api, note._id]); // eslint-disable-line react-hooks/exhaustive-deps
  const entries = (d?.entries || []).filter((e) => !e.hidden);
  const acks = d?.acks || [];
  const src = { ...note, ...(d?.note || {}), theme: d?.theme || d?.note?.theme || note.theme };
  const doc = d && <PrintDoc ctx={ctx} note={src} business={d.business} printedAt={d.printed_at} title={title} blocks={blocks} entries={withEntries ? entries : null} acks={withAcks ? acks : null} collect={collect} />;
  const print = async () => {
    setBusy(true);
    setPrinting(true);
    // wait for the pictures in the page, then the browser's print window ("Save as PDF")
    await new Promise((r) => setTimeout(r, 80));
    const imgs = [...document.querySelectorAll(".nt-print-root img")];
    await Promise.race([Promise.all(imgs.map((i) => (i.complete ? null : new Promise((ok) => ((i.onload = ok), (i.onerror = ok)))))), new Promise((r) => setTimeout(r, 6000))]);
    const old = document.title;
    document.title = (title || note.title || m.untitled).slice(0, 80);
    window.print();
    document.title = old;
    setPrinting(false);
    setBusy(false);
  };
  return (
    <>
      <Modal
        title={m.pdfTitle}
        onClose={onClose}
        size="md-modal-lg"
        busy={busy}
        footer={
          <>
            <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
              {m.close}
            </button>
            <button type="button" className="md-btn md-btn-primary" onClick={print} disabled={busy || !d} data-testid="nt-pdf-print">
              {busy || !d ? <Loader2 size={15} className="md-spin" /> : <Printer size={15} />} {m.pdfPrint}
            </button>
          </>
        }
      >
        <p className="rs-muted">{m.pdfSub}</p>
        <div className="mq-switches v4-pdf-opts">
          {entries.length > 0 && <Switch checked={withEntries} onChange={setWithEntries} label={(collect ? m.pdfWithRows : m.pdfWithReplies).replace("{n}", fmt(entries.length))} />}
          {acks.length > 0 && <Switch checked={withAcks} onChange={setWithAcks} label={m.pdfWithAcks.replace("{n}", fmt(acks.length))} />}
        </div>
        <div className="v4-pdf-preview" data-testid="nt-pdf-preview">
          {d ? (
            <div className="v4-pdf-sheet">{doc}</div>
          ) : (
            <div className="nt-loading">
              <Loader2 size={22} className="md-spin" />
            </div>
          )}
        </div>
        <small className="rs-hint">{m.pdfHint}</small>
        {err && <div className="md-notice md-notice-error">{err}</div>}
      </Modal>
      {printing && doc && createPortal(<div className="nt-print-root">{doc}</div>, document.body)}
    </>
  );
}

// the A4 page itself (also the preview)
export function PrintDoc({ ctx, note, business: biz, printedAt, title, blocks, entries, acks, collect }) {
  const { m, lang, data, business } = ctx;
  const hidden = note.share?.hide_owner;
  const name = biz?.name || data.business?.name || business?.name || "";
  const logo = biz?.logo_url || data.business?.logo_url || business?.logo_url || "";
  const look = themeLook(note.theme);
  const fields = note.form?.fields || [];
  const now = printedAt ? new Date(printedAt) : new Date();
  return (
    <div className={`pd-doc ${look.className || ""}`} style={look.style}>
      <header className="pd-head">
        {!hidden && (
          <span className="pd-brand">
            {logo ? <img src={logo} alt="" /> : <span className="pd-logo-ph">{(name || "B").slice(0, 1)}</span>}
            <b>{name}</b>
          </span>
        )}
        <span className="pd-date">{fmtDate(now, lang)}</span>
      </header>
      <h1 className="pd-title">{title || note.title || m.untitled}</h1>
      <p className="pd-meta">{m.pdfUpdated.replace("{date}", fmtTime(note.updated_date, lang))}</p>
      <div className="pd-body">
        <BlockView blocks={blocks || note.blocks} files={note.files} empty={m.emptyText} lang={lang} m={m} />
      </div>
      {entries && entries.length > 0 && (
        <section className="pd-sec">
          <h2>{collect ? m.collectTitle : m.entriesTitle}</h2>
          {collect && fields.length > 0 ? (
            <table className="pd-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{m.ackColName}</th>
                  {fields.map((f) => (
                    <th key={f.id}>{f.label}</th>
                  ))}
                  <th>{m.fxText}</th>
                  <th>{m.fxTime}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e._id}>
                    <td>{i + 1}</td>
                    <td>{e.name}</td>
                    {fields.map((f) => (
                      <td key={f.id}>{fieldText(f, e.fields?.[f.id], m)}</td>
                    ))}
                    <td>{e.text}</td>
                    <td className="pd-nowrap">{fmtTime(e.created_date, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ol className="pd-replies">
              {entries.map((e) => (
                <li key={e._id}>
                  <b>{e.by_owner ? m.ownerTag : e.name || m.guest}</b> <small>{fmtTime(e.created_date, lang)}</small>
                  {e.text && <p>{e.text}</p>}
                  {(e.files || []).filter((f) => f.sign).map((f) => (
                    <img key={f._id} className="pd-sign" src={f.url} alt="" />
                  ))}
                  {(e.files || []).filter((f) => !f.sign).length > 0 && <small className="pd-files">📎 {(e.files || []).filter((f) => !f.sign).map((f) => f.name).join(", ")}</small>}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
      {acks && acks.length > 0 && (
        <section className="pd-sec">
          <h2>{m.ackTitle}</h2>
          <table className="pd-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{m.ackColName}</th>
                <th>{m.ackColWhen}</th>
              </tr>
            </thead>
            <tbody>
              {acks.map((a, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{a.name}</td>
                  <td className="pd-nowrap">{fmtTime(a.at, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <footer className="pd-foot">
        <span>
          {hidden ? "" : `${name} · `}
          {fmtTime(now, lang)}
        </span>
        <span>{m.pubMade}</span>
      </footer>
    </div>
  );
}
