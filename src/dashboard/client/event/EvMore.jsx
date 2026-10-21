import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CalendarClock, Check, Copy, ExternalLink, FileText, Link2, Loader2, Lock, Megaphone, MessageSquareText, Pencil, Plus, Send, Tag, Trash2, Unlink, Upload, X } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import SearchSelect from "./SearchSelect";
import { fmt, fmtTime, fmtWhen, fromLocalInput, toLocalInput, usd } from "./text";

const errOf = (e) => e?.response?.message || e?.message || "Error";
const rowName = (i) => {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};
const rid = (p) => `${p}${Math.random().toString(36).slice(2, 8)}`;

// an add-on that isn't bought yet: what it does + Unlock
export function LockedBox({ ctx, addon, children }) {
  const { x, data } = ctx;
  if (ctx.on(addon)) return children;
  const a = data.addons[addon];
  return (
    <div className="ev-locked-box">
      <Lock size={16} />
      <div>
        <b>{x.addonNames[addon]}</b>
        <small className="rs-muted">{x.addonWhat[addon]}</small>
      </div>
      <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon })} disabled={ctx.readOnly}>
        <CoinIcon size={14} /> {x.unlock.replace("{coins}", fmt(a?.price))}
      </button>
    </div>
  );
}
export function Section({ icon: Icon, title, sub, children }) {
  return (
    <div className="ev-xbox">
      <div className="ev-xbox-head">
        <Icon size={17} />
        <div>
          <b>{title}</b>
          {sub && <small className="rs-muted">{sub}</small>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ============================================================ in the event editor ============================================================
// the extra parts of an event, kept in the editor's form: shows, seating, questions, ask_names
export const extrasOf = (ev) => ({
  shows: (ev?.shows || []).map((s) => ({ key: s.key, starts_at: toLocalInput(s.starts_at), ends_at: toLocalInput(s.ends_at), label: s.label || "", active: s.active !== false })),
  seating: { on: !!ev?.seating?.on, sections: (ev?.seating?.sections || []).map((s) => ({ ...s, blocked: [...(s.blocked || [])] })) },
  questions: (ev?.questions || []).map((q) => ({ ...q, options: (q.options || []).join("\n") })),
  ask_names: !!ev?.ask_names,
});
// what to send (only the add-ons that are on)
export const extrasBody = (ctx, f) => ({
  ...(ctx.on("ev_shows") ? { shows: f.shows.filter((s) => s.starts_at).map((s) => ({ ...s, starts_at: fromLocalInput(s.starts_at), ends_at: fromLocalInput(s.ends_at) })) } : {}),
  ...(ctx.on("ev_seats") ? { seating: f.seating } : {}),
  ...(ctx.on("ev_questions") ? { questions: f.questions.map((q) => ({ ...q, options: String(q.options || "").split("\n") })), ask_names: f.ask_names } : {}),
});

export function ShowsBox({ ctx, f, setF }) {
  const m = ctx.x.more;
  const set = (i, patch) => setF((p) => ({ ...p, shows: p.shows.map((s, k) => (k === i ? { ...s, ...patch } : s)) }));
  return (
    <Section icon={CalendarClock} title={m.shows} sub={m.showsSub}>
      <LockedBox ctx={ctx} addon="ev_shows">
        {f.shows.map((s, i) => (
          <div key={s.key || i} className="ev-show-row" data-testid="ev-show">
            <input type="datetime-local" value={s.starts_at} onChange={(e) => set(i, { starts_at: e.target.value })} aria-label={m.showStart} />
            <input value={s.label} maxLength={60} onChange={(e) => set(i, { label: e.target.value })} placeholder={m.showLabelPh} aria-label={m.showLabel} />
            <label className="md-switch" title={m.showOn}>
              <input type="checkbox" checked={s.active} onChange={(e) => set(i, { active: e.target.checked })} />
              <span className="md-switch-track" />
            </label>
            <button type="button" className="md-icon-btn" onClick={() => setF((p) => ({ ...p, shows: p.shows.filter((_, k) => k !== i) }))} aria-label={ctx.x.remove}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setF((p) => ({ ...p, shows: [...p.shows, { key: "", starts_at: p.shows.at(-1)?.starts_at || p.starts_at || "", ends_at: "", label: "", active: true }] }))} disabled={f.shows.length >= 60} data-testid="ev-add-show">
          <Plus size={14} /> {m.addShow}
        </button>
        {f.shows.length > 0 && <small className="rs-muted">{m.showsHint}</small>}
      </LockedBox>
    </Section>
  );
}

// a section's seats: click to take a seat off the map (aisle, pillar…); sold seats can't be changed
function SeatGrid({ sec, sold, onToggle, pick, picked, small }) {
  const rows = Array.from({ length: sec.rows }, (_, r) => rowName(r));
  return (
    <div className={`ev-seatgrid ${small ? "small" : ""}`} style={{ "--cols": sec.cols }}>
      <div className="ev-stage">STAGE</div>
      {rows.map((r) => (
        <div key={r} className="ev-seatrow">
          <span className="ev-rowname">{r}</span>
          {Array.from({ length: sec.cols }, (_, c) => {
            const seat = `${r}${c + 1}`;
            const id = `${sec.key}:${seat}`;
            const off = (sec.blocked || []).includes(seat);
            const isSold = sold?.includes(id);
            const isPicked = picked?.includes(id);
            return (
              <button
                key={seat}
                type="button"
                className={`ev-seat ${off ? "off" : ""} ${isSold ? "sold" : ""} ${isPicked ? "picked" : ""}`}
                onClick={() => (pick ? !off && !isSold && pick(id) : !isSold && onToggle?.(seat))}
                disabled={isSold && !onToggle}
                title={seat}
                data-seat={id}
              >
                {small ? "" : c + 1}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
export { SeatGrid };

export function SeatsBox({ ctx, f, setF, ev }) {
  const { x, api } = ctx;
  const m = x.more;
  const [sold, setSold] = useState([]);
  useEffect(() => {
    if (ev?._id && ctx.on("ev_seats")) api.seats(ev._id, (ev.shows || [])[0]?.key || "").then((r) => setSold(r.data.taken)).catch(() => {});
  }, [ev?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = f.seating;
  const put = (seating) => setF((p) => ({ ...p, seating }));
  const setSec = (i, patch) => put({ ...st, sections: st.sections.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const toggle = (i, seat) => {
    const s = st.sections[i];
    setSec(i, { blocked: s.blocked.includes(seat) ? s.blocked.filter((b) => b !== seat) : [...s.blocked, seat] });
  };
  const count = (s) => s.rows * s.cols - s.blocked.length;
  return (
    <Section icon={Tag} title={m.seats} sub={m.seatsSub}>
      <LockedBox ctx={ctx} addon="ev_seats">
        <label className="md-switch-row">
          <span className="md-switch">
            <input type="checkbox" checked={st.on} onChange={(e) => put({ ...st, on: e.target.checked, sections: st.sections.length ? st.sections : [{ key: rid("z"), name: m.secDefault, type_key: f.types[0]?.key || "", rows: 5, cols: 10, blocked: [] }] })} data-testid="ev-seats-on" />
            <span className="md-switch-track" />
          </span>
          <span>{m.seatsOn}</span>
        </label>
        {st.on &&
          st.sections.map((s, i) => (
            <div key={s.key} className="ev-sec" data-testid="ev-sec">
              <div className="ev-sec-fields">
                <input value={s.name} maxLength={40} onChange={(e) => setSec(i, { name: e.target.value })} placeholder={m.secName} aria-label={m.secName} />
                <select value={s.type_key} onChange={(e) => setSec(i, { type_key: e.target.value })} aria-label={m.secType}>
                  <option value="">{m.secTypePick}</option>
                  {f.types
                    .filter((t) => t.key)
                    .map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.name}
                      </option>
                    ))}
                </select>
                <label>
                  {m.rows}
                  <input type="number" min="1" max="40" value={s.rows} onChange={(e) => setSec(i, { rows: Math.max(1, Math.min(40, Number(e.target.value) || 1)) })} />
                </label>
                <label>
                  {m.cols}
                  <input type="number" min="1" max="60" value={s.cols} onChange={(e) => setSec(i, { cols: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })} />
                </label>
                <button type="button" className="md-icon-btn" onClick={() => put({ ...st, sections: st.sections.filter((_, k) => k !== i) })} aria-label={x.remove}>
                  <Trash2 size={14} />
                </button>
              </div>
              <small className="rs-muted">
                {m.seatsCount.replace("{n}", fmt(count(s)))} · {m.seatsClick}
              </small>
              <SeatGrid sec={s} sold={sold} onToggle={(seat) => toggle(i, seat)} />
            </div>
          ))}
        {st.on && (
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => put({ ...st, sections: [...st.sections, { key: rid("z"), name: "", type_key: f.types[1]?.key || f.types[0]?.key || "", rows: 4, cols: 8, blocked: [] }] })} disabled={st.sections.length >= 20}>
            <Plus size={14} /> {m.addSec}
          </button>
        )}
        {st.on && f.types.some((t) => !t.key) && <small className="rs-muted">{m.saveTypesFirst}</small>}
      </LockedBox>
    </Section>
  );
}

const QKINDS = ["text", "long", "choice", "yesno", "email", "number"];
export function QuestionsBox({ ctx, f, setF }) {
  const m = ctx.x.more;
  const set = (i, patch) => setF((p) => ({ ...p, questions: p.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)) }));
  return (
    <Section icon={MessageSquareText} title={m.questions} sub={m.questionsSub}>
      <LockedBox ctx={ctx} addon="ev_questions">
        <label className="md-switch-row">
          <span className="md-switch">
            <input type="checkbox" checked={f.ask_names} onChange={(e) => setF((p) => ({ ...p, ask_names: e.target.checked }))} data-testid="ev-ask-names" />
            <span className="md-switch-track" />
          </span>
          <span>{m.askNames}</span>
        </label>
        {f.questions.map((q, i) => (
          <div key={q.key || i} className="ev-q" data-testid="ev-q">
            <div className="ev-q-row">
              <input value={q.label} maxLength={120} onChange={(e) => set(i, { label: e.target.value })} placeholder={m.qLabel} aria-label={m.qLabel} />
              <select value={q.kind} onChange={(e) => set(i, { kind: e.target.value })} aria-label={m.qKind}>
                {QKINDS.map((k) => (
                  <option key={k} value={k}>
                    {m.qKinds[k]}
                  </option>
                ))}
              </select>
              <label className="ev-q-req">
                <input type="checkbox" checked={!!q.required} onChange={(e) => set(i, { required: e.target.checked })} /> {m.qRequired}
              </label>
              <button type="button" className="md-icon-btn" onClick={() => setF((p) => ({ ...p, questions: p.questions.filter((_, k) => k !== i) }))} aria-label={ctx.x.remove}>
                <Trash2 size={14} />
              </button>
            </div>
            {q.kind === "choice" && <textarea rows={3} value={q.options} onChange={(e) => set(i, { options: e.target.value })} placeholder={m.qOptionsPh} aria-label={m.qOptions} />}
          </div>
        ))}
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setF((p) => ({ ...p, questions: [...p.questions, { key: "", label: "", kind: "text", options: "", required: false }] }))} disabled={f.questions.length >= 15} data-testid="ev-add-q">
          <Plus size={14} /> {m.addQ}
        </button>
      </LockedBox>
    </Section>
  );
}

// ============================================================ Telegram tab ============================================================
export function TelegramTab({ ctx }) {
  const { x, api, readOnly, notify } = ctx;
  const m = x.more;
  const [t, setT] = useState(null);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(() => api.telegram().then((r) => setT(r.data)).catch((e) => notify({ type: "error", text: errOf(e) })), [api]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);
  // waiting for Start in Telegram
  useEffect(() => {
    if (!link || t?.org?.connected) return undefined;
    const h = setInterval(load, 3000);
    return () => clearInterval(h);
  }, [link, t?.org?.connected, load]);
  const go = async (k, fn) => {
    setBusy(k);
    try {
      const r = await fn();
      if (r?.data?.org) setT(r.data);
      if (r?.message) notify({ type: "success", text: r.message });
      return r;
    } catch (e) {
      notify({ type: "error", text: errOf(e) });
      return null;
    } finally {
      setBusy("");
    }
  };
  if (!t)
    return (
      <div className="panel-card ev-empty">
        <Loader2 size={22} className="md-spin" />
      </div>
    );
  const sw = (on, label, onChange, testid) => (
    <label className="md-switch-row">
      <span className="md-switch">
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} disabled={readOnly} data-testid={testid} />
        <span className="md-switch-track" />
      </span>
      <span>{label}</span>
    </label>
  );
  return (
    <div className="rs-col">
      <div className="ev-head">
        <span className="ev-head-ic">
          <Send size={20} />
        </span>
        <div>
          <h3>{m.tgTitle}</h3>
          <small className="rs-muted">{m.tgSub}</small>
        </div>
      </div>
      {!t.configured && <div className="ev-warn">{m.tgNotReady}</div>}
      <section className="panel-card md-fields">
        <h3 className="dk-h3">
          <BellRing size={16} /> {x.addonNames.ev_telegram}
        </h3>
        <LockedBox ctx={ctx} addon="ev_telegram">
          {t.org.connected ? (
            <>
              <div className="ev-tg-on">
                <Check size={16} /> {m.tgConnected.replace("{name}", t.org.chat_name)}
              </div>
              {sw(t.org.new_orders, m.tgNewOrders, (v) => go("s", () => api.saveTelegram({ new_orders: v })), "ev-tg-new")}
              {sw(t.org.daily, m.tgDaily, (v) => go("s", () => api.saveTelegram({ daily: v })), "ev-tg-daily")}
              <div className="ev-btn-row">
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => go("test", api.testTelegram)} disabled={readOnly || !!busy}>
                  {busy === "test" ? <Loader2 size={14} className="md-spin" /> : <Send size={14} />} {m.tgTest}
                </button>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={() => window.confirm(m.tgOffSure) && go("off", api.removeTelegram).then(() => setLink(null))} disabled={readOnly || !!busy}>
                  <Unlink size={14} /> {m.tgDisconnect}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="rs-muted" style={{ margin: 0 }}>
                {m.tgHow}
              </p>
              {link ? (
                <div className="ev-btn-row">
                  <a className="md-btn md-btn-primary" href={link.url} target="_blank" rel="noreferrer" data-testid="ev-tg-open">
                    <Send size={15} /> {m.tgOpen}
                  </a>
                  <a className="md-btn md-btn-ghost" href={link.group_url} target="_blank" rel="noreferrer">
                    {m.tgGroup}
                  </a>
                  <small className="rs-muted">
                    <Loader2 size={12} className="md-spin" /> {m.tgWaiting}
                  </small>
                </div>
              ) : (
                <button type="button" className="md-btn md-btn-primary" onClick={() => go("link", api.linkTelegram).then((r) => r && setLink(r.data))} disabled={readOnly || !!busy || !t.configured} data-testid="ev-tg-link">
                  {busy === "link" ? <Loader2 size={15} className="md-spin" /> : <Link2 size={15} />} {m.tgConnect}
                </button>
              )}
            </>
          )}
        </LockedBox>
      </section>
      <section className="panel-card md-fields">
        <h3 className="dk-h3">
          <Send size={16} /> {x.addonNames.ev_guest_tg}
        </h3>
        <LockedBox ctx={ctx} addon="ev_guest_tg">
          <p className="rs-muted" style={{ margin: 0 }}>
            {m.gtHow}
          </p>
          <div className="ev-tg-on">
            <Check size={16} /> {m.gtLinked.replace("{n}", fmt(t.guests.linked))}
          </div>
          {sw(t.guests.remind_day, m.gtDay, (v) => go("s", () => api.saveTelegram({ remind_day: v })), "ev-gt-day")}
          {sw(t.guests.remind_hours, m.gtHours, (v) => go("s", () => api.saveTelegram({ remind_hours: v })), "ev-gt-hours")}
          <button type="button" className="sa-link" onClick={() => ctx.go("updates")}>
            <Megaphone size={14} /> {m.gtGoUpdates}
          </button>
        </LockedBox>
      </section>
    </div>
  );
}

// ============================================================ Promo codes tab ============================================================
const newPromo = () => ({ code: "", kind: "percent", value: 10, max_uses: 0, min_qty: 1, event_id: "", ends_at: "", active: true });
export function PromosTab({ ctx }) {
  const { x, api, data, readOnly, notify } = ctx;
  const m = x.more;
  const [rows, setRows] = useState(null);
  const [f, setF] = useState(null); // the form (new / edit)
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.promos().then((r) => setRows(r.data)).catch(() => setRows([]));
  }, [api]);
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...f, ends_at: fromLocalInput(f.ends_at), event_id: f.event_id || null };
      const r = f._id ? await api.savePromo(f._id, body) : await api.addPromo(body);
      setRows(r.data);
      setF(null);
      notify({ type: "success", text: x.saved });
    } catch (e) {
      notify({ type: "error", text: errOf(e) });
    } finally {
      setBusy(false);
    }
  };
  const remove = async (p) => {
    if (!window.confirm(m.promoDelSure)) return;
    const r = await api.removePromo(p._id).catch((e) => notify({ type: "error", text: errOf(e) }));
    if (r) setRows(r.data);
  };
  return (
    <div className="rs-col">
      <div className="ev-head">
        <span className="ev-head-ic">
          <Tag size={20} />
        </span>
        <div>
          <h3>{m.promosTitle}</h3>
          <small className="rs-muted">{m.promosSub}</small>
        </div>
        {ctx.on("ev_promos") && (
          <div className="ev-head-acts">
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setF(newPromo())} disabled={readOnly} data-testid="ev-promo-new">
              <Plus size={15} /> {m.promoNew}
            </button>
          </div>
        )}
      </div>
      <LockedBox ctx={ctx} addon="ev_promos">
        {f && (
          <section className="panel-card md-fields ev-promo-form" data-testid="ev-promo-form">
            <div className="ev-two">
              <label className="md-field">
                <span>{m.promoCode}</span>
                <input value={f.code} maxLength={24} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} placeholder="EARLYBIRD" data-testid="ev-promo-code" />
              </label>
              <label className="md-field">
                <span>{m.promoValue}</span>
                <div className="ev-promo-val">
                  <input type="number" min="0" step="0.5" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} data-testid="ev-promo-value" />
                  <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                    <option value="percent">%</option>
                    <option value="amount">$</option>
                  </select>
                </div>
              </label>
            </div>
            <div className="ev-two">
              <label className="md-field">
                <span>{m.promoEvent}</span>
                <SearchSelect value={f.event_id || ""} onChange={(v) => setF({ ...f, event_id: v })} options={[{ value: "", label: m.promoAll }, ...data.events.map((e) => ({ value: e._id, label: e.title, sub: fmtWhen(e.starts_at, ctx.lang) }))]} placeholder={m.promoAll} searchPh={x.searchEvent} noMatch={x.noMatch} testid="ev-promo-event" />
              </label>
              <label className="md-field">
                <span>{m.promoEnds}</span>
                <input type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} />
              </label>
            </div>
            <div className="ev-two">
              <label className="md-field">
                <span>{m.promoMax}</span>
                <input type="number" min="0" value={f.max_uses} onChange={(e) => setF({ ...f, max_uses: e.target.value })} />
                <small className="rs-muted">{m.promoMaxSub}</small>
              </label>
              <label className="md-field">
                <span>{m.promoMinQty}</span>
                <input type="number" min="1" max="50" value={f.min_qty} onChange={(e) => setF({ ...f, min_qty: e.target.value })} />
              </label>
            </div>
            <div className="ev-btn-row">
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setF(null)}>
                {x.cancel}
              </button>
              <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || f.code.length < 3} data-testid="ev-promo-save">
                {busy ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {x.save}
              </button>
            </div>
          </section>
        )}
        {!rows ? (
          <div className="panel-card ev-empty">
            <Loader2 size={22} className="md-spin" />
          </div>
        ) : !rows.length ? (
          <div className="panel-card ev-empty">
            <Tag size={30} />
            <p>{m.promoNone}</p>
          </div>
        ) : (
          <div className="ev-promos">
            {rows.map((p) => (
              <article key={p._id} className={`panel-card ev-promo ${p.active ? "" : "off"}`} data-testid="ev-promo">
                <code className="ev-promo-code">{p.code}</code>
                <div className="ev-promo-main">
                  <b>{p.kind === "percent" ? `−${p.value}%` : `−${usd(p.value)}`}</b>
                  <small className="rs-muted">
                    {p.event || m.promoAll} · {m.promoUsedN.replace("{n}", fmt(p.used)).replace("{max}", p.max_uses ? fmt(p.max_uses) : "∞")}
                    {p.ends_at && ` · ${m.promoUntil.replace("{d}", fmtTime(p.ends_at, ctx.lang))}`}
                    {p.min_qty > 1 && ` · ${m.promoMinN.replace("{n}", p.min_qty)}`}
                  </small>
                </div>
                <label className="md-switch" title={m.promoOn}>
                  <input type="checkbox" checked={p.active} onChange={async (e) => setRows((await api.savePromo(p._id, { active: e.target.checked })).data)} disabled={readOnly} />
                  <span className="md-switch-track" />
                </label>
                <button type="button" className="md-icon-btn" onClick={() => setF({ ...newPromo(), ...p, event_id: p.event_id || "", ends_at: toLocalInput(p.ends_at) })} disabled={readOnly} aria-label={x.edit}>
                  <Pencil size={14} />
                </button>
                <button type="button" className="md-icon-btn" onClick={() => remove(p)} disabled={readOnly} aria-label={x.remove}>
                  <Trash2 size={14} />
                </button>
              </article>
            ))}
          </div>
        )}
      </LockedBox>
    </div>
  );
}

// ============================================================ Updates + documents tab ============================================================
export function UpdatesTab({ ctx, firstEvent, EventPick }) {
  const { x, lang, api, data, readOnly, notify } = ctx;
  const m = x.more;
  const [eid, setEid] = useState(() => firstEvent(ctx));
  const ev = data.events.find((e) => e._id === eid);
  const [text, setText] = useState("");
  const [send, setSend] = useState(true);
  const [busy, setBusy] = useState("");
  const [docName, setDocName] = useState("");
  const file = useRef(null);
  const run = async (k, fn, ok) => {
    setBusy(k);
    try {
      const r = await fn();
      await ctx.reload();
      notify({ type: "success", text: ok ? ok(r) : x.saved });
      return r;
    } catch (e) {
      notify({ type: "error", text: errOf(e) });
      return null;
    } finally {
      setBusy("");
    }
  };
  const updates = useMemo(() => ev?.updates || [], [ev]);
  const [count, setCount] = useState(null);
  useEffect(() => {
    setCount(null);
    if (eid && ctx.on("ev_guest_tg")) api.telegramGuests(eid).then((r) => setCount(r.data)).catch(() => {});
  }, [eid]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="rs-col">
      <div className="ev-head">
        <span className="ev-head-ic">
          <Megaphone size={20} />
        </span>
        <div>
          <h3>{m.updTitle}</h3>
          <small className="rs-muted">{m.updSub}</small>
        </div>
      </div>
      <LockedBox ctx={ctx} addon="ev_guest_tg">
        <section className="panel-card md-fields" data-testid="ev-upd-for">
          <b>{m.updFor}</b>
          <div className="ev-upd-for">
            <EventPick ctx={ctx} value={eid} onChange={setEid} />
            {count && (
              <span className="ev-upd-count" data-testid="ev-upd-count">
                <Send size={14} /> {m.updCount.replace("{n}", fmt(count.linked)).replace("{all}", fmt(count.paid_orders))}
              </span>
            )}
          </div>
          <small className="rs-muted">{m.updForSub}</small>
        </section>
        {!ev ? (
          <div className="panel-card ev-empty">
            <p>{x.design.needEvent}</p>
          </div>
        ) : (
          <>
            <section className="panel-card md-fields" data-testid="ev-upd-form">
              <h3 className="dk-h3">
                <Megaphone size={16} /> {m.updNew}
              </h3>
              <textarea className="ev-input" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={m.updPh} data-testid="ev-upd-text" />
              <label className="md-switch-row">
                <span className="md-switch">
                  <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} />
                  <span className="md-switch-track" />
                </span>
                <span>{m.updSend}</span>
              </label>
              <button type="button" className="md-btn md-btn-primary" onClick={() => run("upd", () => api.addUpdate(ev._id, { text, send }), (r) => m.updDone.replace("{n}", fmt(r.sent || 0))).then((r) => r && setText(""))} disabled={readOnly || !!busy || !text.trim()} data-testid="ev-upd-send">
                {busy === "upd" ? <Loader2 size={15} className="md-spin" /> : <Send size={15} />} {m.updPostTo.replace("{event}", ev.title)}
              </button>
              {updates.map((u) => (
                <div key={u._id} className="ev-upd">
                  <p>{u.text}</p>
                  <small className="rs-muted">
                    {fmtWhen(u.at, lang)} · {m.updSentN.replace("{n}", fmt(u.sent || 0))}
                  </small>
                  <button type="button" className="md-icon-btn" onClick={() => run("del", () => api.removeUpdate(ev._id, u._id))} disabled={readOnly} aria-label={x.remove}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </section>
            <section className="panel-card md-fields" data-testid="ev-docs">
              <h3 className="dk-h3">
                <FileText size={16} /> {m.docsTitle}
              </h3>
              <small className="rs-muted">{m.docsSub}</small>
              <div className="ev-btn-row">
                <input className="ev-input" value={docName} maxLength={80} onChange={(e) => setDocName(e.target.value)} placeholder={m.docName} style={{ flex: 1, minWidth: 160 }} />
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => file.current?.click()} disabled={readOnly || !!busy || (ev.docs || []).length >= 10}>
                  {busy === "doc" ? <Loader2 size={14} className="md-spin" /> : <Upload size={14} />} {m.docAdd}
                </button>
                <input
                  ref={file}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    const fl = e.target.files?.[0];
                    e.target.value = "";
                    if (fl) run("doc", () => api.addDoc(ev._id, fl, docName)).then((r) => r && setDocName(""));
                  }}
                />
              </div>
              {(ev.docs || []).map((d) => (
                <div key={d.key} className="ev-doc">
                  <FileText size={18} />
                  <a href={d.url} target="_blank" rel="noreferrer">
                    {d.name}
                  </a>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => run("sd", () => api.sendDoc(ev._id, d.key), (r) => m.updDone.replace("{n}", fmt(r.sent || 0)))} disabled={readOnly || !!busy}>
                    <Send size={13} /> {m.docSend}
                  </button>
                  <button type="button" className="md-icon-btn" onClick={() => run("dd", () => api.removeDoc(ev._id, d.key))} disabled={readOnly} aria-label={x.remove}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <a className="sa-link" href={`/ev/${ev.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink size={13} /> {x.design.open}
              </a>
            </section>
          </>
        )}
      </LockedBox>
    </div>
  );
}
