import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Check, Copy, Hourglass, Image as ImageIcon, Layers, Loader2, Megaphone, MessageSquareText, Plus, RotateCcw, Send, Star, Tag, Timer, Trash2, Undo2, Users, Wallet, X as XIcon, Handshake, MapPin, Repeat } from "lucide-react";
import { LockedBox, Section } from "./EvMore";
import SearchSelect from "./SearchSelect";
import { eventUrl, fmt, fmtWhen, fromLocalInput, toLocalInput, usd } from "./text";

const errOf = (e) => e?.response?.message || e?.message || "Error";
export const CATEGORIES = ["music", "workshop", "seminar", "sport", "party", "festival", "food", "art", "business", "kids", "religion", "other"];
const copyText = (v, ctx) => {
  navigator.clipboard?.writeText(v).catch(() => {});
  ctx.notify({ type: "success", text: ctx.x.copied || "Copied" });
};
function useRun(ctx, reload = true) {
  const [busy, setBusy] = useState("");
  const run = async (k, fn, ok) => {
    setBusy(k);
    try {
      const r = await fn();
      if (reload) await ctx.reload?.();
      ctx.notify({ type: "success", text: typeof ok === "function" ? ok(r) : ok || ctx.x.saved });
      return r || true;
    } catch (e) {
      ctx.notify({ type: "error", text: errOf(e) });
      return null;
    } finally {
      setBusy("");
    }
  };
  return [busy, run];
}
function Head({ icon: Icon, title, sub, children }) {
  return (
    <div className="ev-head">
      <span className="ev-head-ic">
        <Icon size={20} />
      </span>
      <div>
        <h3>{title}</h3>
        {sub && <small className="rs-muted">{sub}</small>}
      </div>
      {children && <div className="ev-head-acts">{children}</div>}
    </div>
  );
}

// ======================================== in the event editor ========================================
// a ticket type: early-bird / timed prices + group deals
export const dealsOf = (t) => ({ tiers: (t?.tiers || []).map((x) => ({ label: x.label || "", price: x.price, until: toLocalInput(x.until) })), bundles: (t?.bundles || []).map((x) => ({ qty: x.qty, price: x.price })) });
export const dealsBody = (ctx, t) => ({
  tiers: ctx.on("ev_pricing") ? (t.tiers || []).filter((x) => x.until && x.price !== "").map((x) => ({ label: x.label, price: Number(x.price) || 0, until: fromLocalInput(x.until) })) : undefined,
  bundles: ctx.on("ev_bundles") ? (t.bundles || []).filter((x) => Number(x.qty) >= 2 && Number(x.price) > 0).map((x) => ({ qty: Number(x.qty), price: Number(x.price) })) : undefined,
});
export function TypeDeals({ ctx, t, onChange }) {
  const g = ctx.x.grow;
  const [open, setOpen] = useState(!!(t.tiers?.length || t.bundles?.length));
  const tiers = t.tiers || [];
  const bundles = t.bundles || [];
  const setTier = (i, p) => onChange({ tiers: tiers.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  const setB = (i, p) => onChange({ bundles: bundles.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  const unit = Number(t.price) || 0;
  if (!open)
    return (
      <button type="button" className="ev-deals-open" onClick={() => setOpen(true)} data-testid="ev-deals-open">
        <Timer size={13} /> {g.dealsOpen}
      </button>
    );
  return (
    <div className="ev-deals" data-testid="ev-deals">
      <div className="ev-deals-col">
        <b>
          <Timer size={14} /> {g.tiers}
        </b>
        <LockedBox ctx={ctx} addon="ev_pricing">
          {tiers.map((x, i) => (
            <div key={i} className="ev-deal-row">
              <input value={x.label} maxLength={40} placeholder={g.tierLabelPh} onChange={(e) => setTier(i, { label: e.target.value })} aria-label={g.tierLabel} />
              <input type="number" min="0" step="0.5" value={x.price} onChange={(e) => setTier(i, { price: e.target.value })} aria-label={g.price} placeholder="$" />
              <input type="datetime-local" value={x.until} onChange={(e) => setTier(i, { until: e.target.value })} aria-label={g.until} />
              <button type="button" className="md-icon-btn" onClick={() => onChange({ tiers: tiers.filter((_, k) => k !== i) })} aria-label={ctx.x.remove}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => onChange({ tiers: [...tiers, { label: tiers.length ? "" : g.earlyBird, price: Math.max(0, unit - 5 * (tiers.length + 1)), until: "" }] })} disabled={tiers.length >= 6} data-testid="ev-add-tier">
            <Plus size={13} /> {g.addTier}
          </button>
          {tiers.length > 0 && <small className="rs-muted">{g.tiersHint.replace("{price}", usd(unit))}</small>}
        </LockedBox>
      </div>
      <div className="ev-deals-col">
        <b>
          <Layers size={14} /> {g.bundles}
        </b>
        <LockedBox ctx={ctx} addon="ev_bundles">
          {bundles.map((x, i) => (
            <div key={i} className="ev-deal-row two">
              <input type="number" min="2" max="50" value={x.qty} onChange={(e) => setB(i, { qty: e.target.value })} aria-label={g.bQty} />
              <span className="rs-muted">{g.ticketsFor}</span>
              <input type="number" min="0" step="0.5" value={x.price} onChange={(e) => setB(i, { price: e.target.value })} aria-label={g.price} placeholder="$" />
              {Number(x.qty) >= 2 && Number(x.price) > 0 && unit > 0 && <small className="ev-save">−{Math.max(0, Math.round((1 - Number(x.price) / (unit * Number(x.qty))) * 100))}%</small>}
              <button type="button" className="md-icon-btn" onClick={() => onChange({ bundles: bundles.filter((_, k) => k !== i) })} aria-label={ctx.x.remove}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => onChange({ bundles: [...bundles, { qty: 4, price: Math.round(unit * 4 * 0.85) }] })} disabled={bundles.length >= 5} data-testid="ev-add-bundle">
            <Plus size={13} /> {g.addBundle}
          </button>
        </LockedBox>
      </div>
    </div>
  );
}

// category + city (for the public events page), feedback, sponsors
export function EventGrowBox({ ctx, f, setF, ev }) {
  const g = ctx.x.grow;
  return (
    <>
      <div className="ev-two">
        <label className="md-field">
          <span>{g.category}</span>
          <select className="ev-input" value={f.category || ""} onChange={(e) => setF((p) => ({ ...p, category: e.target.value }))}>
            <option value="">—</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {g.cats[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="md-field">
          <span>
            <MapPin size={13} /> {g.city}
          </span>
          <input value={f.city || ""} maxLength={40} list="ev-cities" placeholder="Phnom Penh" onChange={(e) => setF((p) => ({ ...p, city: e.target.value }))} />
          <datalist id="ev-cities">
            {["Phnom Penh", "Siem Reap", "Battambang", "Sihanoukville", "Kampot", "Kep", "Kampong Cham", "Takeo", "Kandal", "Koh Kong", "Mondulkiri", "Ratanakiri"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>
      <Section icon={Star} title={g.fbTitle} sub={g.fbSub}>
        <LockedBox ctx={ctx} addon="ev_feedback">
          <label className="ev-check">
            <input type="checkbox" checked={!!f.feedback?.on} onChange={(e) => setF((p) => ({ ...p, feedback: { ...(p.feedback || {}), on: e.target.checked } }))} data-testid="ev-fb-on" />
            <span>{g.fbOn}</span>
          </label>
          {f.feedback?.on && (
            <label className="md-field">
              <span>{g.fbQuestion}</span>
              <input value={f.feedback?.question || ""} maxLength={160} placeholder={g.fbQuestionPh} onChange={(e) => setF((p) => ({ ...p, feedback: { ...(p.feedback || {}), question: e.target.value } }))} />
            </label>
          )}
        </LockedBox>
      </Section>
      <Section icon={Handshake} title={g.spTitle} sub={g.spSub}>
        <LockedBox ctx={ctx} addon="ev_sponsors">{ev?._id ? <SponsorsEditor ctx={ctx} ev={ev} /> : <small className="rs-muted">{g.spSaveFirst}</small>}</LockedBox>
      </Section>
    </>
  );
}
function SponsorsEditor({ ctx, ev }) {
  const g = ctx.x.grow;
  const { api } = ctx;
  const [list, setList] = useState(ev.sponsors || []);
  const [nf, setNf] = useState({ name: "", link: "", tier: "partner" });
  const [file, setFile] = useState(null);
  const pick = useRef(null);
  const [busy, run] = useRun(ctx, false);
  const after = (r) => r?.data?.sponsors && setList(r.data.sponsors);
  return (
    <div className="ev-sp" data-testid="ev-sponsors">
      {list.map((s) => (
        <div key={s.key} className="ev-sp-row">
          <img src={s.logo} alt="" />
          <div>
            <b>{s.name}</b>
            <small className="rs-muted">{s.link || "—"}</small>
          </div>
          <select className="ev-input" value={s.tier} onChange={async (e) => after(await run(`t:${s.key}`, () => api.saveSponsor(ev._id, s.key, { tier: e.target.value })))} disabled={ctx.readOnly}>
            {["main", "gold", "partner"].map((t) => (
              <option key={t} value={t}>
                {g.tiers_[t]}
              </option>
            ))}
          </select>
          <button type="button" className="md-icon-btn" onClick={async () => after(await run(`d:${s.key}`, () => api.removeSponsor(ev._id, s.key)))} disabled={ctx.readOnly || !!busy} aria-label={ctx.x.remove}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {list.length < 12 && (
        <div className="ev-sp-add">
          <button type="button" className={`ev-sp-pick ${file ? "has" : ""}`} onClick={() => pick.current?.click()} aria-label={g.spLogo}>
            {file ? <img src={URL.createObjectURL(file)} alt="" /> : <ImageIcon size={20} />}
          </button>
          <input ref={pick} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <input value={nf.name} maxLength={60} placeholder={g.spName} onChange={(e) => setNf({ ...nf, name: e.target.value })} />
          <input value={nf.link} maxLength={300} placeholder={g.spLink} onChange={(e) => setNf({ ...nf, link: e.target.value })} />
          <select className="ev-input" value={nf.tier} onChange={(e) => setNf({ ...nf, tier: e.target.value })}>
            {["main", "gold", "partner"].map((t) => (
              <option key={t} value={t}>
                {g.tiers_[t]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="md-btn md-btn-primary sa-btn-sm"
            disabled={!file || !nf.name.trim() || !!busy || ctx.readOnly}
            onClick={async () => {
              const r = await run("add", () => api.addSponsor(ev._id, file, nf));
              if (r) {
                after(r);
                setNf({ name: "", link: "", tier: "partner" });
                setFile(null);
              }
            }}
            data-testid="ev-sp-add"
          >
            {busy === "add" ? <Loader2 size={14} className="md-spin" /> : <Plus size={14} />} {g.spAdd}
          </button>
        </div>
      )}
    </div>
  );
}

// ======================================== tabs ========================================
// --- waitlist ---
export function WaitlistTab({ ctx, firstEvent, EventPick }) {
  const g = ctx.x.grow;
  const { api, lang } = ctx;
  const [eid, setEid] = useState(() => firstEvent(ctx));
  const [d, setD] = useState(null);
  const [busy, run] = useRun(ctx, false);
  const load = () => eid && api.waitlist(eid).then((r) => setD(r.data)).catch(() => setD({ list: [], counts: {}, left: {} }));
  useEffect(() => {
    setD(null);
    load();
  }, [eid]); // eslint-disable-line react-hooks/exhaustive-deps
  const ev = ctx.data.events.find((e) => e._id === eid);
  const typeName = (k) => ev?.types.find((t) => t.key === k)?.name || g.anyType;
  return (
    <div className="rs-col">
      <Head icon={Hourglass} title={g.wlTitle} sub={g.wlSub} />
      <LockedBox ctx={ctx} addon="ev_waitlist">
        <div className="ev-filter-row">
          <EventPick ctx={ctx} value={eid} onChange={setEid} />
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={async () => (await run("n", () => api.waitNotify(eid, 10), (r) => g.wlTold.replace("{n}", r.told))) && load()} disabled={!d?.counts?.waiting || !!busy || ctx.readOnly} data-testid="ev-wl-notify">
            {busy === "n" ? <Loader2 size={14} className="md-spin" /> : <Send size={14} />} {g.wlNotify}
          </button>
        </div>
        {!d ? (
          <div className="panel-card ev-empty">
            <Loader2 size={22} className="md-spin" />
          </div>
        ) : (
          <>
            <div className="ev-att-stats">
              <div>
                <small>{g.wlWaiting}</small>
                <b>{fmt(d.counts.waiting || 0)}</b>
              </div>
              <div className="warn">
                <small>{g.wlToldN}</small>
                <b>{fmt(d.counts.told || 0)}</b>
              </div>
              <div className="ok">
                <small>{g.wlBought}</small>
                <b>{fmt(d.counts.bought || 0)}</b>
              </div>
              <div>
                <small>{g.wlLeft}</small>
                <b>{fmt(Object.values(d.left || {}).reduce((a, n) => a + n, 0))}</b>
              </div>
            </div>
            {!d.list.length ? (
              <div className="panel-card ev-empty">
                <Hourglass size={28} />
                <p>{g.wlNone}</p>
              </div>
            ) : (
              <section className="panel-card ev-att-list">
                {d.list.map((w, i) => (
                  <div key={w._id} className={`ev-att-row ${w.status === "bought" ? "in" : ""}`}>
                    <span className="ev-wl-no">{i + 1}</span>
                    <div>
                      <b>{w.name}</b>
                      <small className="rs-muted">
                        {w.phone} · {w.qty} × {typeName(w.type_key)} {w.tg ? "· Telegram ✓" : ""}
                      </small>
                    </div>
                    <span className={`ev-chip-mini ${w.status === "bought" ? "ok" : w.status === "told" ? "warn" : ""}`}>{g.wlStatus[w.status]}</span>
                    <small className="ev-att-when">{fmtWhen(w.created_date, lang)}</small>
                    <a className="md-icon-btn" href={`tel:${w.phone}`} aria-label="Call">
                      📞
                    </a>
                    <button type="button" className="md-icon-btn" onClick={async () => (await run(`r:${w._id}`, () => api.waitRemove(w._id))) && load()} disabled={ctx.readOnly} aria-label={ctx.x.remove}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </LockedBox>
    </div>
  );
}

// --- promoters ---
export function PromotersTab({ ctx }) {
  const g = ctx.x.grow;
  const { api, data } = ctx;
  const [list, setList] = useState(null);
  const [nf, setNf] = useState({ name: "", code: "", event_id: "", kind: "percent", value: 10 });
  const [linkEv, setLinkEv] = useState(() => data.events.find((e) => e.status === "published")?.slug || "");
  const [busy, run] = useRun(ctx, false);
  useEffect(() => {
    api.refs().then((r) => setList(r.data)).catch(() => setList([]));
  }, [api]);
  const after = (r) => r?.data && setList(r.data);
  const evOpts = useMemo(() => data.events.filter((e) => e.status !== "draft").map((e) => ({ value: e._id, label: e.title, sub: fmtWhen(e.starts_at, ctx.lang) })), [data.events, ctx.lang]);
  const totals = useMemo(() => (list || []).reduce((a, r) => ({ tickets: a.tickets + r.tickets, money: a.money + r.money, owed: a.owed + r.owed }), { tickets: 0, money: 0, owed: 0 }), [list]);
  const linkFor = (r) => {
    const slug = r.event?.slug || linkEv;
    return slug ? `${eventUrl(slug)}?ref=${r.code}` : "";
  };
  return (
    <div className="rs-col">
      <Head icon={Megaphone} title={g.prTitle} sub={g.prSub} />
      <LockedBox ctx={ctx} addon="ev_referrals">
        <section className="panel-card md-fields" data-testid="ev-pr-form">
          <b>{g.prAdd}</b>
          <div className="ev-pr-form">
            <input value={nf.name} maxLength={60} placeholder={g.prName} onChange={(e) => setNf({ ...nf, name: e.target.value })} />
            <input value={nf.code} maxLength={24} placeholder={g.prCode} onChange={(e) => setNf({ ...nf, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />
            <SearchSelect options={[{ value: "", label: g.prAnyEvent }, ...evOpts]} value={nf.event_id} onChange={(v) => setNf({ ...nf, event_id: v })} />
            <div className="ev-pr-com">
              <input type="number" min="0" step="0.5" value={nf.value} onChange={(e) => setNf({ ...nf, value: e.target.value })} aria-label={g.prCommission} />
              <select className="ev-input" value={nf.kind} onChange={(e) => setNf({ ...nf, kind: e.target.value })}>
                <option value="percent">{g.prPercent}</option>
                <option value="amount">{g.prPerTicket}</option>
              </select>
            </div>
            <button
              type="button"
              className="md-btn md-btn-primary sa-btn-sm"
              disabled={!nf.name.trim() || !!busy || ctx.readOnly}
              onClick={async () => {
                const r = await run("add", () => api.addRef({ name: nf.name, code: nf.code || undefined, event_id: nf.event_id || null, commission: { kind: nf.kind, value: Number(nf.value) || 0 } }));
                if (r) {
                  after(r);
                  setNf({ name: "", code: "", event_id: "", kind: nf.kind, value: nf.value });
                }
              }}
              data-testid="ev-pr-add"
            >
              {busy === "add" ? <Loader2 size={14} className="md-spin" /> : <Plus size={14} />} {g.prAddBtn}
            </button>
          </div>
        </section>
        <div className="ev-glance">
          <div className="ev-gl">
            <small>{g.prCount}</small>
            <b>{fmt(list?.length || 0)}</b>
          </div>
          <div className="ev-gl">
            <small>{g.prSold}</small>
            <b>{fmt(totals.tickets)}</b>
            <span>{usd(totals.money)}</span>
          </div>
          <div className={`ev-gl ${totals.owed > 0 ? "warn" : ""}`}>
            <small>{g.prOwed}</small>
            <b>{usd(totals.owed)}</b>
          </div>
          <div className="ev-gl">
            <small>{g.prLinkFor}</small>
            <SearchSelect options={data.events.filter((e) => e.status === "published").map((e) => ({ value: e.slug, label: e.title }))} value={linkEv} onChange={setLinkEv} />
          </div>
        </div>
        {!list ? (
          <div className="panel-card ev-empty">
            <Loader2 size={22} className="md-spin" />
          </div>
        ) : !list.length ? (
          <div className="panel-card ev-empty">
            <Megaphone size={28} />
            <p>{g.prNone}</p>
          </div>
        ) : (
          <div className="ev-pr-list">
            {[...list]
              .sort((a, b) => b.money - a.money)
              .map((r, i) => (
                <article key={r._id} className={`panel-card ev-pr ${r.active ? "" : "off"}`} data-testid="ev-pr">
                  <div className="ev-pr-top">
                    <span className="ev-pr-rank">{i + 1}</span>
                    <div>
                      <b>{r.name}</b>
                      <small className="rs-muted">
                        <Tag size={11} /> {r.code} · {r.commission.kind === "percent" ? `${r.commission.value}%` : `${usd(r.commission.value)} / ${g.ticket}`}
                        {r.event ? ` · ${r.event.title}` : ""}
                      </small>
                    </div>
                    <label className="md-switch" style={{ marginLeft: "auto" }}>
                      <input type="checkbox" checked={r.active} onChange={async (e) => after(await run(`a:${r._id}`, () => api.saveRef(r._id, { active: e.target.checked })))} disabled={ctx.readOnly} />
                      <span className="md-switch-track" />
                    </label>
                  </div>
                  <div className="ev-pr-nums">
                    <span>
                      <small>{g.prClicks}</small>
                      <b>{fmt(r.clicks)}</b>
                    </span>
                    <span>
                      <small>{g.prTickets}</small>
                      <b>{fmt(r.tickets)}</b>
                    </span>
                    <span>
                      <small>{g.prMoney}</small>
                      <b>{usd(r.money)}</b>
                    </span>
                    <span>
                      <small>{g.prEarned}</small>
                      <b>{usd(r.earned)}</b>
                    </span>
                    <span className={r.owed > 0 ? "warn" : ""}>
                      <small>{g.prOwedOne}</small>
                      <b>{usd(r.owed)}</b>
                    </span>
                  </div>
                  <div className="ev-btn-row">
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => linkFor(r) && copyText(linkFor(r), ctx)} disabled={!linkFor(r)} data-testid="ev-pr-copy">
                      <Copy size={14} /> {g.prCopy}
                    </button>
                    {r.owed > 0 && (
                      <button
                        type="button"
                        className="md-btn md-btn-ghost sa-btn-sm"
                        onClick={async () => {
                          const v = window.prompt(g.prPayAsk.replace("{name}", r.name), String(r.owed));
                          if (v !== null && Number(v) > 0) after(await run(`p:${r._id}`, () => api.payRef(r._id, Number(v))));
                        }}
                        disabled={ctx.readOnly}
                      >
                        <Wallet size={14} /> {g.prPay}
                      </button>
                    )}
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" style={{ marginLeft: "auto" }} onClick={async () => window.confirm(g.prDelSure) && after(await run(`d:${r._id}`, () => api.removeRef(r._id)))} disabled={ctx.readOnly}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}
          </div>
        )}
      </LockedBox>
    </div>
  );
}

// --- feedback ---
export function FeedbackTab({ ctx, firstEvent, EventPick }) {
  const g = ctx.x.grow;
  const { api, lang } = ctx;
  const [eid, setEid] = useState(() => firstEvent(ctx));
  const [d, setD] = useState(null);
  const [busy, run] = useRun(ctx, false);
  useEffect(() => {
    setD(null);
    if (eid) api.feedback(eid).then((r) => setD(r.data)).catch(() => setD({ n: 0, dist: [0, 0, 0, 0, 0], list: [] }));
  }, [eid, api]);
  const ev = ctx.data.events.find((e) => e._id === eid);
  const max = Math.max(1, ...(d?.dist || []));
  return (
    <div className="rs-col">
      <Head icon={Star} title={g.fbTabTitle} sub={g.fbTabSub} />
      <LockedBox ctx={ctx} addon="ev_feedback">
        <div className="ev-filter-row">
          <EventPick ctx={ctx} value={eid} onChange={setEid} />
          {ev?.feedback?.on && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => run("s", () => api.feedbackSend(eid), (r) => g.fbSent.replace("{n}", r.sent))} disabled={!!busy || ctx.readOnly}>
              {busy === "s" ? <Loader2 size={14} className="md-spin" /> : <Send size={14} />} {g.fbSend}
            </button>
          )}
        </div>
        {ev && !ev.feedback?.on && <div className="panel-card ev-hint">{g.fbOff}</div>}
        {!d ? (
          <div className="panel-card ev-empty">
            <Loader2 size={22} className="md-spin" />
          </div>
        ) : (
          <>
            <section className="panel-card ev-fb-sum" data-testid="ev-fb-sum">
              <div className="ev-fb-avg">
                <b>{d.avg ?? "—"}</b>
                <span className="ev-stars">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={18} fill={d.avg >= n - 0.25 ? "currentColor" : "none"} />)}</span>
                <small className="rs-muted">{g.fbCount.replace("{n}", d.n).replace("{of}", d.paid ?? 0)}</small>
              </div>
              <div className="ev-fb-dist">
                {[5, 4, 3, 2, 1].map((n) => (
                  <div key={n}>
                    <span>{n}★</span>
                    <i>
                      <em style={{ width: `${(d.dist[n - 1] / max) * 100}%` }} />
                    </i>
                    <small>{d.dist[n - 1]}</small>
                  </div>
                ))}
              </div>
            </section>
            {!d.list.length ? (
              <div className="panel-card ev-empty">
                <MessageSquareText size={28} />
                <p>{g.fbNone}</p>
              </div>
            ) : (
              <div className="ev-fb-list">
                {d.list.map((f) => (
                  <article key={f._id} className="panel-card ev-fb">
                    <div>
                      <span className="ev-stars sm">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} fill={f.rating >= n ? "currentColor" : "none"} />)}</span>
                      <b>{f.name || "—"}</b>
                      <small className="rs-muted">{fmtWhen(f.at, lang)}</small>
                    </div>
                    {f.answer && (
                      <p className="ev-fb-ans">
                        <small>{ev?.feedback?.question}</small>
                        {f.answer}
                      </p>
                    )}
                    {f.comment && <p>{f.comment}</p>}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </LockedBox>
    </div>
  );
}

// --- refunds + transfers ---
export function RequestsTab({ ctx }) {
  const g = ctx.x.grow;
  const { api, lang } = ctx;
  const [status, setStatus] = useState("open");
  const [rows, setRows] = useState(null);
  const [busy, run] = useRun(ctx, false);
  const load = () => api.requests(status).then((r) => setRows(r.data)).catch(() => setRows([]));
  useEffect(() => {
    setRows(null);
    load();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const decide = async (row, ok) => {
    const q = row.request;
    let body = { ok };
    if (ok && q.kind === "refund") {
      const sum = row.tickets.reduce((a, t) => a + (t.price || 0), 0);
      const v = window.prompt(g.rqAmount, String(sum));
      if (v === null) return;
      body.amount = Number(v) || 0;
    } else if (!ok) {
      const v = window.prompt(g.rqWhy, "");
      if (v === null) return;
      body.reply = v;
    } else if (!window.confirm(g.rqTransferSure.replace("{name}", q.to_name))) return;
    if (await run(`d:${q._id}`, () => api.decide(row.order._id, q._id, body), g.rqDone)) load();
  };
  return (
    <div className="rs-col">
      <Head icon={Repeat} title={g.rqTitle} sub={g.rqSub} />
      <div className="ev-seg" role="tablist">
        {["open", "done", "declined"].map((k) => (
          <button key={k} type="button" className={status === k ? "on" : ""} onClick={() => setStatus(k)}>
            {g.rqStatus[k]}
          </button>
        ))}
      </div>
      {!rows ? (
        <div className="panel-card ev-empty">
          <Loader2 size={22} className="md-spin" />
        </div>
      ) : !rows.length ? (
        <div className="panel-card ev-empty">
          <Repeat size={28} />
          <p>{g.rqNone}</p>
        </div>
      ) : (
        <div className="ev-rq-list">
          {rows.map((row) => {
            const q = row.request;
            return (
              <article key={q._id} className={`panel-card ev-rq k-${q.kind}`} data-testid="ev-rq">
                <div className="ev-rq-top">
                  <span className={`ev-chip-mini ${q.kind === "refund" ? "warn" : "ok"}`}>{q.kind === "refund" ? <Undo2 size={11} /> : <Repeat size={11} />} {g.rqKind[q.kind]}</span>
                  <b>#{row.order.no}</b>
                  <small className="rs-muted">
                    {row.event?.title} · {fmtWhen(q.at, lang)}
                  </small>
                </div>
                <div className="ev-rq-body">
                  <div>
                    <small>{g.rqBuyer}</small>
                    <b>{row.order.buyer?.name}</b>
                    <a href={`tel:${row.order.buyer?.phone}`}>{row.order.buyer?.phone}</a>
                  </div>
                  <div>
                    <small>{g.rqTickets}</small>
                    {row.tickets.map((t) => (
                      <span key={t.code} className="ev-rq-t">
                        {t.type_name} · {t.holder} {t.price ? `· ${usd(t.price)}` : ""} {t.status !== "valid" ? `(${t.status})` : ""}
                      </span>
                    ))}
                  </div>
                  {q.kind === "transfer" && (
                    <div>
                      <small>{g.rqTo}</small>
                      <b>{q.to_name}</b>
                      <span>{q.to_phone}</span>
                    </div>
                  )}
                </div>
                {q.note && <p className="ev-rq-note">“{q.note}”</p>}
                {q.status === "open" ? (
                  <div className="ev-btn-row">
                    <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => decide(row, true)} disabled={!!busy || ctx.readOnly} data-testid="ev-rq-ok">
                      {busy === `d:${q._id}` ? <Loader2 size={14} className="md-spin" /> : <Check size={14} />} {q.kind === "refund" ? g.rqRefund : g.rqTransfer}
                    </button>
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => decide(row, false)} disabled={!!busy || ctx.readOnly}>
                      <XIcon size={14} /> {g.rqDecline}
                    </button>
                  </div>
                ) : (
                  <small className="rs-muted">
                    {g.rqStatus[q.status]} · {q.decided_by} · {fmtWhen(q.decided_at, lang)} {q.reply ? `· “${q.reply}”` : ""} {q.kind === "refund" && row.order.refunded ? `· ${usd(row.order.refunded)}` : ""}
                  </small>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- the all-events report ---
export function OverviewReport({ ctx }) {
  const g = ctx.x.grow;
  const { api, lang } = ctx;
  const [months, setMonths] = useState(12);
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(null);
    api.overview(months).then((r) => setD(r.data)).catch(() => setD(null));
  }, [months, api]);
  const max = Math.max(1, ...(d?.series || []).map((m) => m.money));
  const maxT = Math.max(1, ...(d?.series || []).map((m) => m.tickets));
  const mName = (k) => new Date(`${k}-01T00:00:00`).toLocaleDateString(lang === "km" ? "km-KH" : "en-GB", { month: "short", year: "2-digit" });
  return (
    <div className="rs-col" data-testid="ev-overview">
      <div className="ev-filter-row">
        <div className="ev-seg" role="tablist">
          {[3, 6, 12, 24].map((n) => (
            <button key={n} type="button" className={months === n ? "on" : ""} onClick={() => setMonths(n)}>
              {g.ovMonths.replace("{n}", n)}
            </button>
          ))}
        </div>
      </div>
      {!d ? (
        <div className="panel-card ev-empty">
          <Loader2 size={22} className="md-spin" />
        </div>
      ) : (
        <>
          <div className="ev-glance">
            <div className="ev-gl">
              <small>{g.ovMoney}</small>
              <b>{usd(d.totals.money)}</b>
              <span>{d.totals.refunded ? g.ovRefunded.replace("{m}", usd(d.totals.refunded)) : g.ovNoRefund}</span>
            </div>
            <div className="ev-gl">
              <small>{g.ovTickets}</small>
              <b>{fmt(d.totals.tickets)}</b>
              <span>{g.ovOrders.replace("{n}", fmt(d.totals.orders))}</span>
            </div>
            <div className="ev-gl">
              <small>{g.ovIn}</small>
              <b>{fmt(d.totals.used)}</b>
              <span>{d.totals.tickets ? `${Math.round((d.totals.used / d.totals.tickets) * 100)}%` : "—"}</span>
            </div>
            <div className="ev-gl">
              <small>{g.ovEvents}</small>
              <b>{fmt(d.totals.events)}</b>
              <span>{d.totals.events ? g.ovAvg.replace("{m}", usd(d.totals.money / d.totals.events)) : "—"}</span>
            </div>
            <div className="ev-gl">
              <small>{g.ovScore}</small>
              <b>{d.feedback.avg ? `${d.feedback.avg} ★` : "—"}</b>
              <span>{g.ovReviews.replace("{n}", d.feedback.n)}</span>
            </div>
          </div>
          <section className="panel-card">
            <b>{g.ovChart}</b>
            <div className="ev-ov-chart">
              {d.series.map((m) => (
                <div key={m.month} className="ev-ov-col" title={`${mName(m.month)} · ${usd(m.money)} · ${m.tickets}`}>
                  <small className="ev-ov-v">{m.money ? usd(m.money) : ""}</small>
                  <i style={{ height: `${(m.money / max) * 100}%` }} />
                  <em style={{ height: `${(m.tickets / maxT) * 100}%` }} />
                  <span>{mName(m.month)}</span>
                </div>
              ))}
            </div>
            <div className="ev-ov-legend">
              <span>
                <i /> {g.ovMoney}
              </span>
              <span>
                <em /> {g.ovTickets}
              </span>
            </div>
          </section>
          <div className="ev-two-cols">
            <section className="panel-card">
              <b>{g.ovTop}</b>
              {!d.top.length ? (
                <p className="rs-muted">—</p>
              ) : (
                <table className="ev-table">
                  <tbody>
                    {d.top.map((t, i) => (
                      <tr key={String(t.event._id)}>
                        <td>{i + 1}</td>
                        <td>
                          <b>{t.event.title}</b>
                          <small className="rs-muted">{t.event.starts_at ? fmtWhen(t.event.starts_at, lang) : ""}</small>
                        </td>
                        <td>{fmt(t.tickets)}</td>
                        <td>
                          <b>{usd(t.money)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section className="panel-card">
              <b>{g.ovPay}</b>
              {!d.pay.length ? (
                <p className="rs-muted">—</p>
              ) : (
                d.pay.map((p) => (
                  <div key={p.label} className="ev-ov-bar">
                    <span>{p.label}</span>
                    <i>
                      <em style={{ width: `${(p.money / Math.max(1, d.pay[0].money)) * 100}%` }} />
                    </i>
                    <b>{usd(p.money)}</b>
                  </div>
                ))
              )}
              <b style={{ marginTop: 14, display: "block" }}>{g.ovVia}</b>
              {d.via.map((v) => (
                <div key={v.via} className="ev-ov-bar">
                  <span>{g.via[v.via] || v.via}</span>
                  <i>
                    <em style={{ width: `${(v.tickets / Math.max(1, ...d.via.map((x) => x.tickets))) * 100}%` }} />
                  </i>
                  <b>{fmt(v.tickets)}</b>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
