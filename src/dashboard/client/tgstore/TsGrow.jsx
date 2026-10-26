import { useCallback, useEffect, useState } from "react";
import { BarChart3, Bike, Check, CircleDollarSign, Clock, Download, EyeOff, Loader2, Lock, Megaphone, Pencil, Plus, Puzzle, Send, ShoppingBag, Tag, Trash2, UtensilsCrossed } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { Head, Switch } from "../menuqr/parts";
import CoinIcon from "../../../components/CoinIcon";
import { ago, fill, fmtDate, fmtNum, money } from "./text";

export const ADDON_ICON = { ts_promos: Tag, ts_broadcast: Megaphone, ts_reports: BarChart3, ts_hours: Clock, ts_nobrand: EyeOff };

// an add-on that isn't bought yet: what it does + the Unlock button
export function Locked({ ctx, addon, small }) {
  const { x, data, readOnly } = ctx;
  const a = data.addons[addon] || {};
  const Icon = ADDON_ICON[addon] || Lock;
  const label = fill(x.unlock, { coins: `${fmtNum(a.price)} ${x.coins}${a.days ? ` ${x.perYear}` : ""}` });
  if (small)
    return (
      <div className="ts-locked-row">
        <Lock size={15} />
        <span>{x.addonWhat[addon]}</span>
        <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon })} disabled={readOnly} data-testid={`ts-unlock-${addon}`}>
          <CoinIcon size={14} /> {fill(x.unlock, { coins: fmtNum(a.price) })}
        </button>
      </div>
    );
  return (
    <section className="panel-card mq-locked">
      <Icon size={24} />
      <b>{x.addonNames[addon]}</b>
      <p className="rs-muted">{x.addonWhat[addon]}</p>
      <ul className="wsv-perks">
        {(x.perks[addon] || []).map((p) => (
          <li key={p}>
            <Check size={14} /> {p}
          </li>
        ))}
      </ul>
      <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon })} disabled={readOnly} data-testid={`ts-unlock-${addon}`}>
        <CoinIcon size={16} /> {label}
      </button>
    </section>
  );
}

// ---------------------------------------------------------------- Add-ons
export function AddonsTab({ ctx }) {
  const { x, lang, data, readOnly } = ctx;
  const lic = data.license;
  return (
    <div className="rs-col">
      <Head icon={Puzzle} title={x.addonsTitle} sub={x.addonsSub} />
      <div className="rs-addons">
        <article className="panel-card rs-addon s-active">
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <Send size={20} />
            </span>
            <div>
              <h3>{x.badge}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmtNum(lic.price)} {x.coins} {x.perYear}
              </span>
            </div>
          </div>
          <p>{x.baseWhat}</p>
          <div className="rs-addon-foot">
            <span className={`rs-pill ${lic.active ? "on" : ""}`}>
              <Check size={13} /> {lic.expires_at ? x.endsOn.replace("{date}", fmtDate(lic.expires_at, lang)) : x.unlocked}
            </span>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy("renew")} disabled={!data.business.status}>
              {x.renewFor.replace("{coins}", fmtNum(lic.price))}
            </button>
          </div>
        </article>
        {Object.entries(data.addons).map(([k, a]) => {
          const Icon = ADDON_ICON[k] || Puzzle;
          return (
            <article key={k} className={`panel-card rs-addon s-${a.active ? "active" : "none"}`} data-testid={`ts-addon-${k}`}>
              <div className="rs-addon-top">
                <span className="rs-addon-ic">
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{x.addonNames[k]}</h3>
                  <span className="rs-addon-price">
                    <CoinIcon size={13} /> {fmtNum(a.price)} {x.coins} {a.days ? x.perYear : `· ${x.forever}`}
                  </span>
                </div>
              </div>
              <p>{x.addonWhat[k]}</p>
              <div className="rs-addon-foot">
                {a.active ? (
                  <>
                    <span className="rs-pill on">
                      <Check size={13} /> {a.expires_at ? x.endsOn.replace("{date}", fmtDate(a.expires_at, lang)) : x.unlocked}
                    </span>
                    {a.days && (
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly}>
                        {x.renewFor.replace("{coins}", fmtNum(a.price))}
                      </button>
                    )}
                  </>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly} data-testid={`ts-buy-${k}`}>
                    <CoinIcon size={14} /> {fill(x.unlock, { coins: fmtNum(a.price) })}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Promo codes
const blankPromo = { code: "", kind: "percent", value: "", min_order: "", ends_at: "", max_uses: "", on: true };
function PromoModal({ ctx, promo, onClose, onSaved }) {
  const { x, api, cur } = ctx;
  const [f, setF] = useState(() => (promo ? { ...promo, value: String(promo.value), min_order: promo.min_order ? String(promo.min_order) : "", max_uses: promo.max_uses ? String(promo.max_uses) : "", ends_at: promo.ends_at ? String(promo.ends_at).slice(0, 10) : "" } : blankPromo));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const num = (v) => String(v).replace(/[^\d.]/g, "");
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = { code: f.code, kind: f.kind, value: Number(f.value), min_order: Number(f.min_order) || 0, max_uses: Number(f.max_uses) || 0, ends_at: f.ends_at ? `${f.ends_at}T23:59:59+07:00` : null, on: f.on };
    try {
      const r = promo ? await api.savePromo(promo._id, body) : await api.addPromo(body);
      onSaved(r.data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={promo ? x.editPromo : x.addPromo}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {x.cancel}
          </button>
          <button type="submit" form="ts-promo" className="md-btn md-btn-primary" disabled={busy || !f.code.trim() || !f.value} data-testid="ts-promo-save">
            {x.save}
          </button>
        </>
      }
    >
      <form id="ts-promo" className="md-fields" onSubmit={save}>
        {error && <div className="md-form-error">{error}</div>}
        <div className="md-field">
          <label htmlFor="tpr-code">{x.code}</label>
          <input id="tpr-code" value={f.code} maxLength={20} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} autoFocus required className="ts-code-input" data-testid="ts-promo-code" />
          <span className="md-hint">{x.codeHint}</span>
        </div>
        <div className="ts-seg" role="radiogroup">
          {["percent", "amount"].map((k) => (
            <button key={k} type="button" className={f.kind === k ? "on" : ""} aria-pressed={f.kind === k} onClick={() => set("kind", k)}>
              {x.kinds[k]}
            </button>
          ))}
        </div>
        <div className="ts-two">
          <div className="md-field">
            <label htmlFor="tpr-value">
              {x.value} ({f.kind === "percent" ? "%" : cur === "KHR" ? "៛" : "$"})
            </label>
            <input id="tpr-value" value={f.value} inputMode="decimal" onChange={(e) => set("value", num(e.target.value))} required data-testid="ts-promo-value" />
          </div>
          <div className="md-field">
            <label htmlFor="tpr-min">
              {x.promoFrom} ({cur === "KHR" ? "៛" : "$"})
            </label>
            <input id="tpr-min" value={f.min_order} inputMode="decimal" placeholder="0" onChange={(e) => set("min_order", num(e.target.value))} />
          </div>
        </div>
        <div className="ts-two">
          <div className="md-field">
            <label htmlFor="tpr-end">{x.endsAt}</label>
            <input id="tpr-end" type="date" value={f.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
          </div>
          <div className="md-field">
            <label htmlFor="tpr-max">{x.maxUses}</label>
            <input id="tpr-max" value={f.max_uses} inputMode="numeric" placeholder="0" onChange={(e) => set("max_uses", e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function PromosTab({ ctx }) {
  const { x, lang, api, readOnly, cur } = ctx;
  const on = ctx.on("ts_promos");
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(undefined);
  const load = useCallback(() => api.promos().then((r) => setRows(r.data)).catch(() => setRows([])), [api]);
  useEffect(() => {
    load();
  }, [load]);
  const toggle = async (p) => {
    try {
      await api.savePromo(p._id, { on: !p.on });
      load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const remove = async (p) => {
    if (!window.confirm(fill(x.removePromoAsk, { code: p.code }))) return;
    await api.removePromo(p._id).catch((e) => ctx.notify({ type: "error", text: e.message }));
    load();
  };
  return (
    <div className="rs-col">
      <Head icon={Tag} title={x.tabs.promos} sub={x.promosSub}>
        {on && (
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setEdit(null)} disabled={readOnly} data-testid="ts-add-promo">
            <Plus size={15} /> {x.addPromo}
          </button>
        )}
      </Head>
      {!on && <Locked ctx={ctx} addon="ts_promos" />}
      {on &&
        (rows === null ? (
          <div className="panel-card ts-skel" />
        ) : rows.length === 0 ? (
          <section className="panel-card ts-empty">
            <Tag size={30} />
            <p>{x.noPromos}</p>
            <button type="button" className="md-btn md-btn-primary" onClick={() => setEdit(null)} disabled={readOnly}>
              <Plus size={15} /> {x.addPromo}
            </button>
          </section>
        ) : (
          <div className="ts-promos">
            {rows.map((p) => {
              const ended = p.ends_at && new Date(p.ends_at) < new Date();
              const full = p.max_uses && p.used >= p.max_uses;
              return (
                <article key={p._id} className={`panel-card ts-promo ${!p.on || ended || full ? "is-off" : ""}`} data-testid={`ts-promo-${p.code}`}>
                  <div className="ts-promo-top">
                    <span className="ts-ticket">{p.code}</span>
                    <b className="ts-promo-value">{p.kind === "percent" ? `−${p.value}%` : `−${money(p.value, cur)}`}</b>
                  </div>
                  <div className="ts-product-meta">
                    {p.min_order > 0 && <span className="ts-pill">≥ {money(p.min_order, cur)}</span>}
                    {p.ends_at && <span className={`ts-pill ${ended ? "st-cancelled" : ""}`}>{ended ? x.ended : fill(x.until, { date: fmtDate(p.ends_at, lang) })}</span>}
                    <span className={`ts-pill ${full ? "st-cancelled" : ""}`}>{p.max_uses ? fill(x.usedOf, { n: p.used, max: p.max_uses }) : fill(x.usedN, { n: p.used })}</span>
                  </div>
                  <div className="ts-promo-foot">
                    <Switch checked={p.on} onChange={() => toggle(p)} label={p.on ? x.onWord : x.off} disabled={readOnly} />
                    <span className="ts-grow" />
                    <button type="button" className="md-icon-btn" aria-label={x.edit} onClick={() => setEdit(p)} disabled={readOnly}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="md-icon-btn" aria-label={x.delete} onClick={() => remove(p)} disabled={readOnly}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      {edit !== undefined && (
        <PromoModal
          ctx={ctx}
          promo={edit}
          onClose={() => setEdit(undefined)}
          onSaved={() => {
            setEdit(undefined);
            load();
            ctx.notify({ type: "success", text: x.saved });
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Message the customers
export function MessagesTab({ ctx }) {
  const { x, api, readOnly, lang } = ctx;
  const on = ctx.on("ts_broadcast");
  const [d, setD] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.broadcasts().then((r) => setD(r.data)).catch(() => setD({ rows: [], reach: 0, today: 0, per_day: 3 })), [api]);
  useEffect(() => {
    load();
  }, [load]);
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.broadcast(text.trim());
      ctx.notify({ type: "success", text: r.message });
      setText("");
      load();
    } catch (err) {
      ctx.notify({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };
  const full = d && d.today >= d.per_day;
  return (
    <div className="rs-col">
      <Head icon={Megaphone} title={x.tabs.messages} sub={x.messagesSub} />
      {!on && <Locked ctx={ctx} addon="ts_broadcast" />}
      {on && d === null && <div className="panel-card ts-skel" />}
      {on && d && (
        <>
          <form className="panel-card md-fields" onSubmit={send}>
            <div className="ts-reach">
              <span className="ts-reach-ic">
                <Send size={18} />
              </span>
              <span>
                <b>{fill(x.reach, { n: fmtNum(d.reach) })}</b>
                <small className="rs-muted">{d.reach ? x.reachHint : x.reachNone}</small>
              </span>
              <span className="ts-pill">{fill(x.perDay, { n: d.today, max: d.per_day })}</span>
            </div>
            {!d.telegram && <p className="md-notice">{x.tgNotReady}</p>}
            <div className="md-field">
              <label htmlFor="ts-msg">{x.message}</label>
              <textarea id="ts-msg" rows={4} maxLength={1000} value={text} placeholder={x.messagePh} onChange={(e) => setText(e.target.value)} data-testid="ts-msg" />
              <span className="md-hint">{text.length} / 1000</span>
            </div>
            <div>
              <button type="submit" className="md-btn md-btn-primary" disabled={readOnly || busy || !text.trim() || !d.reach || full || !d.telegram} data-testid="ts-msg-send">
                {busy ? <Loader2 size={15} className="md-spin" /> : <Send size={15} />} {busy ? x.sending : fill(x.sendTo, { n: fmtNum(d.reach) })}
              </button>
            </div>
          </form>
          <section className="panel-card">
            <h3 className="ts-h3">{x.history}</h3>
            {d.rows.length === 0 ? (
              <p className="rs-muted">{x.noMessages}</p>
            ) : (
              <ul className="ts-sent">
                {d.rows.map((m) => (
                  <li key={m._id}>
                    <p>{m.text}</p>
                    <small className="rs-muted">
                      {fmtDate(m.created_date, lang)} · {ago(m.created_date, x)} · {fill(x.sentTo, { n: m.sent })}
                      {m.failed > 0 ? ` · ${fill(x.failedN, { n: m.failed })}` : ""} · {m.by}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Sales report
const MODE_ICON = { delivery: Bike, pickup: ShoppingBag, dine_in: UtensilsCrossed };
function Bars({ rows, cur, x }) {
  const max = Math.max(1, ...rows.map((r) => r.sales));
  return (
    <div className="ts-bars" role="img" aria-label={x.byDay}>
      {rows.map((r) => (
        <div key={r.day} className="ts-bar" title={`${r.day} · ${money(r.sales, cur)} · ${r.orders}`}>
          <i style={{ height: `${Math.max(2, (r.sales / max) * 100)}%` }} className={r.sales ? "" : "zero"} />
          {rows.length <= 31 && <small>{Number(r.day.slice(8))}</small>}
        </div>
      ))}
    </div>
  );
}
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function ReportTab({ ctx }) {
  const { x, api, cur } = ctx;
  const on = ctx.on("ts_reports");
  const [days, setDays] = useState(30);
  const [r, setR] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!on) return;
    setR(null);
    api
      .report(days)
      .then((res) => setR(res.data))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [api, days, on]); // eslint-disable-line react-hooks/exhaustive-deps
  const excel = async () => {
    setBusy(true);
    try {
      const res = await api.reportOrders(days);
      const head = ["No", "Date", "Status", "How", "Table", "Customer", "Phone", "Items", "Subtotal", "Discount", "Promo", "Delivery", "Total", "Pay", "Paid"];
      const lines = res.data.map((o) => [o.no, new Date(o.date).toLocaleString("en-GB"), o.status, o.mode, o.table, o.customer, o.phone, o.items, o.subtotal, o.discount, o.promo, o.fee, o.total, o.pay, o.paid ? "yes" : "no"].map(csvCell).join(","));
      const blob = new Blob([`﻿${[head.join(","), ...lines].join("\n")}`], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `telegram-store-${days}-days.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const maxHour = r ? Math.max(1, ...r.hours) : 1;
  const sumOf = (o) => Math.max(1, Object.values(o).reduce((a, b) => a + b, 0));
  return (
    <div className="rs-col">
      <Head icon={BarChart3} title={x.tabs.report} sub={x.reportSub}>
        {on && (
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={excel} disabled={busy || !r} data-testid="ts-excel">
            {busy ? <Loader2 size={14} className="md-spin" /> : <Download size={14} />} {x.excel}
          </button>
        )}
      </Head>
      {!on && <Locked ctx={ctx} addon="ts_reports" />}
      {on && (
        <>
          <div className="ts-filters" role="tablist">
            {[7, 30, 90].map((k) => (
              <button key={k} type="button" role="tab" aria-selected={days === k} className={days === k ? "on" : ""} onClick={() => setDays(k)}>
                {x.ranges[k]}
              </button>
            ))}
          </div>
          {!r ? (
            <div className="ts-kpis">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="panel-card ts-kpi ts-skel" />
              ))}
            </div>
          ) : (
            <>
              <div className="ts-kpis">
                {[
                  [x.sales, money(r.totals.sales, r.currency)],
                  [x.ordersWord, fmtNum(r.totals.orders)],
                  [x.avg, money(r.totals.avg, r.currency)],
                  [r.totals.discount ? x.discounts : x.cancelledN, r.totals.discount ? money(r.totals.discount, r.currency) : fmtNum(r.totals.cancelled)],
                ].map(([k, v]) => (
                  <div key={k} className="panel-card ts-kpi">
                    <small>{k}</small>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
              <section className="panel-card">
                <h3 className="ts-h3">{x.byDay}</h3>
                {r.totals.orders ? <Bars rows={r.by_day} cur={r.currency} x={x} /> : <p className="rs-muted">{x.noSales}</p>}
              </section>
              <div className="ts-two">
                <section className="panel-card">
                  <h3 className="ts-h3">{x.best}</h3>
                  {r.best.length === 0 ? (
                    <p className="rs-muted">{x.noSales}</p>
                  ) : (
                    <ol className="ts-best">
                      {r.best.map((b) => (
                        <li key={b.name}>
                          <span>{b.name}</span>
                          <small className="rs-muted">{fill(x.sold, { n: fmtNum(b.qty) })}</small>
                          <b>{money(b.sales, r.currency)}</b>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
                <section className="panel-card">
                  <h3 className="ts-h3">{x.busy}</h3>
                  <div className="ts-hours-chart">
                    {r.hours.map((n, h) => (
                      <div key={h} title={`${h}:00 · ${n}`}>
                        <i style={{ height: `${Math.max(2, (n / maxHour) * 100)}%` }} className={n ? "" : "zero"} />
                        {h % 3 === 0 && <small>{h}</small>}
                      </div>
                    ))}
                  </div>
                  <h3 className="ts-h3" style={{ marginTop: 14 }}>
                    {x.howGet}
                  </h3>
                  {Object.entries(r.modes).map(([k, n]) => {
                    const Icon = MODE_ICON[k];
                    return (
                      <div key={k} className="ts-share-row">
                        <Icon size={14} /> <span>{x.modes[k]}</span>
                        <i style={{ "--w": `${(n / sumOf(r.modes)) * 100}%` }} />
                        <b>{fmtNum(n)}</b>
                      </div>
                    );
                  })}
                  <h3 className="ts-h3" style={{ marginTop: 14 }}>
                    {x.howPay}
                  </h3>
                  {Object.entries(r.pay).map(([k, n]) => (
                    <div key={k} className="ts-share-row">
                      <CircleDollarSign size={14} /> <span>{x.payMethods[k]}</span>
                      <i style={{ "--w": `${(n / sumOf(r.pay)) * 100}%` }} />
                      <b>{fmtNum(n)}</b>
                    </div>
                  ))}
                </section>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Opening hours (inside Store settings)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first on screen
export function HoursCard({ ctx, hours, setHours }) {
  const { x } = ctx;
  if (!ctx.on("ts_hours"))
    return (
      <section className="panel-card md-fields">
        <h3 className="ts-h3">
          <Clock size={17} /> {x.hours}
        </h3>
        <Locked ctx={ctx} addon="ts_hours" small />
      </section>
    );
  const setDay = (i, patch) => setHours({ ...hours, days: hours.days.map((d, j) => (j === i ? { ...d, ...patch } : d)) });
  const now = ctx.data.open_now;
  return (
    <section className="panel-card md-fields">
      <h3 className="ts-h3">
        <Clock size={17} /> {x.hours}
        {hours.on && <span className={`ts-pill ${now?.open ? "pay-paid" : "st-cancelled"}`}>{now?.open ? x.openNowChip : x.closedNowChip}</span>}
      </h3>
      <span className="md-hint">{x.hoursSub}</span>
      <Switch checked={hours.on} onChange={(v) => setHours({ ...hours, on: v })} label={x.hoursOn} testid="ts-hours-on" />
      {hours.on && (
        <div className="ts-days">
          {DAY_ORDER.map((i) => {
            const d = hours.days[i];
            return (
              <div key={i} className={`ts-day ${d.closed ? "is-closed" : ""}`}>
                <b>{x.days[i]}</b>
                <input type="time" aria-label={`${x.days[i]} open`} value={d.open} disabled={d.closed} onChange={(e) => setDay(i, { open: e.target.value })} />
                <span>–</span>
                <input type="time" aria-label={`${x.days[i]} close`} value={d.close} disabled={d.closed} onChange={(e) => setDay(i, { close: e.target.value })} />
                <Switch checked={d.closed} onChange={(v) => setDay(i, { closed: v })} label={x.closedDay} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
