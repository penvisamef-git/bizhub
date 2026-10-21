import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  BarChart3,
  BellRing,
  Check,
  Copy,
  Download,
  Eraser,
  ExternalLink,
  Gift,
  History,
  ImagePlus,
  Link2,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  Palette,
  Plus,
  Printer,
  Puzzle,
  QrCode,
  RotateCcw,
  Search,
  Send,
  Stamp,
  Trash2,
  Undo2,
  Unplug,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { Head, Switch } from "../menuqr/parts";
import StampCard from "../../../stamp/StampCard";
import DeskCore, { CardQr } from "../../../stamp/DeskCore";
import { SC_THEMES, SC_THEME_KEYS, iconOf, themeName, themeOf } from "../../../stamp/themes";
import { POSTER_KEYS, POSTER_TEXT, drawPoster, posterName, posterOf, qrCanvas } from "../../../stamp/posters";
import { ago, cardUrl, deskUrl, fmt, fmtDate, fmtTime, levelName, prettyPhone, shopUrl } from "./text";

export const ADDON_ICON = { sc_check: Search, sc_telegram: BellRing, sc_more: Users, sc_levels: Gift, sc_expiry: History };

const copy = (text, ctx) => {
  navigator.clipboard?.writeText(text).catch(() => {});
  ctx.notify({ type: "success", text: ctx.x.copied });
};
const shopOf = (data, over = {}) => ({ name: data.program.shop_name || data.business.name, logo: data.program.logo, theme: data.program.theme, color: data.program.color, icon: data.program.icon, goal: data.program.goal, levels: data.levels, ...over });

export function Locked({ ctx, addon, small }) {
  const { x, data, readOnly } = ctx;
  const a = data.addons[addon] || {};
  const Icon = ADDON_ICON[addon] || Lock;
  if (small)
    return (
      <div className="sc-msg warn">
        <Lock size={15} /> {x.addonWhat[addon]}
        <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon })} disabled={readOnly}>
          <CoinIcon size={14} /> {x.unlock.replace("{coins}", fmt(a.price))}
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
      <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon })} disabled={readOnly} data-testid={`sc-unlock-${addon}`}>
        <CoinIcon size={16} /> {x.unlock.replace("{coins}", `${fmt(a.price)} ${x.coins}${a.days ? ` ${x.perYear}` : ""}`)}
      </button>
    </section>
  );
}

// ---------------------------------------- Stamp (the counter) ----------------------------------------
export function StampTab({ ctx }) {
  const { x, lang, data, api, readOnly } = ctx;
  const [ready, setReady] = useState(null);
  const [open, setOpen] = useState(null);
  const loadReady = useCallback(
    () =>
      api
        .members({ filter: "ready" })
        .then((r) => setReady(r.data))
        .catch(() => setReady([])),
    [api],
  );
  useEffect(() => {
    loadReady();
  }, [loadReady]);
  const t = data.totals.today;
  const deskApi = useMemo(() => ({ lookup: api.lookup, addMember: api.addMember, stamp: api.stamp, reward: api.reward, reset: api.reset }), [api]);
  return (
    <div className="rs-col">
      <Head icon={Stamp} title={x.stampTitle} sub={x.stampSub} />
      <div className="sc-kpis">
        {[
          [x.visitsToday, t.visits],
          [x.stampsToday, t.stamps],
          [x.rewardsToday, t.rewards],
          [x.joinedToday, t.joined],
        ].map(([k, v]) => (
          <div key={k} className="panel-card sc-kpi">
            <small>
              {x.today} · {k}
            </small>
            <b>{fmt(v)}</b>
          </div>
        ))}
      </div>
      <section className="panel-card">
        <DeskCore
          x={x}
          lang={lang}
          shop={shopOf(data)}
          api={deskApi}
          owner
          canReset
          maxPerVisit={data.program.max_per_visit}
          readOnly={readOnly}
          notify={ctx.notify}
          onOpen={(m) => setOpen(m._id)}
          onChanged={() => {
            ctx.reload();
            loadReady();
          }}
        />
      </section>
      <section className="panel-card">
        <h3 className="dk-h3">
          <Gift size={16} /> {x.readyList} {ready?.length ? `(${ready.length})` : ""}
        </h3>
        {!ready ? (
          <Loader2 size={18} className="md-spin" />
        ) : !ready.length ? (
          <p className="rs-muted">{x.readyNone}</p>
        ) : (
          <div className="sc-ready-list">
            {ready.map((m) => (
              <button key={m._id} type="button" className="sc-ready-row" onClick={() => setOpen(m._id)}>
                <span>
                  <b>{m.name}</b> <small className="rs-muted">#{m.no}</small>
                </span>
                <em>
                  {m.stamps}/{data.program.goal}
                </em>
              </button>
            ))}
          </div>
        )}
      </section>
      {open && (
        <MemberSheet
          ctx={ctx}
          id={open}
          onClose={() => setOpen(null)}
          onChanged={() => {
            ctx.reload();
            loadReady();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------- one customer ----------------------------------------
function MemberSheet({ ctx, id, onClose, onChanged }) {
  const { x, lang, data, api, readOnly, notify } = ctx;
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState("");
  const [qr, setQr] = useState(false);
  const [edit, setEdit] = useState(null);
  const [fix, setFix] = useState(null);
  const load = useCallback(
    () =>
      api
        .member(id)
        .then((r) => setD(r.data))
        .catch((e) => notify({ type: "error", text: e.message })),
    [api, id, notify],
  );
  useEffect(() => {
    load();
  }, [load]);
  const act = async (key, fn, ok) => {
    setBusy(key);
    try {
      await fn();
      if (ok) notify({ type: "success", text: ok });
      await load();
      onChanged?.();
    } catch (e) {
      if (e.body?.code === "too_soon" && window.confirm(x.tooSoonAsk.replace("{ago}", ago(e.body.last_stamp_at, x)))) {
        await api.stamp(id, 1, true).catch((err) => notify({ type: "error", text: err.message }));
        await load();
        onChanged?.();
      } else if (e.body?.code !== "too_soon") notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const m = d?.member;
  const ready = m ? data.levels.filter((l) => m.ready.includes(l.at)) : [];
  const ev = (e) => (e.kind === "stamp" ? x.ev.stamp.replace("{n}", e.n) : e.kind === "reward" ? x.ev.reward.replace("{reward}", e.reward.split(" · ")[lang === "km" ? 0 : 1] || e.reward) : e.kind === "adjust" ? x.ev.adjust.replace("{n}", e.n > 0 ? `+${e.n}` : e.n) : e.kind === "expire" ? x.ev.expire.replace("{n}", Math.abs(e.n)) : x.ev.join);
  return (
    <div className="rs-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rs-sheet sc-sheet-wide" role="dialog" aria-modal="true" aria-label={m?.name || x.seeCustomer} data-testid="sc-member-sheet">
        <div className="rs-sheet-head">
          <b>{m ? `${m.name} · #${m.no}` : "…"}</b>
          <button type="button" className="md-icon-btn" onClick={onClose} aria-label={x.close}>
            <X size={18} />
          </button>
        </div>
        {!m ? (
          <Loader2 size={20} className="md-spin" />
        ) : (
          <div className="rs-col">
            <StampCard shop={shopOf(data)} member={m} lang={lang} compact />
            <div className="sc-member-info">
              <small>
                {m.phone ? prettyPhone(m.phone) : "—"} · {x.joined.replace("{date}", fmtDate(m.created_date, lang))} · {x.via[m.via]}
              </small>
              <small className="rs-muted">
                {fmt(m.total_stamps)} {x.totalStamps.toLowerCase()} · {fmt(m.rewards)} {x.rewardsGot.toLowerCase()} · {fmt(m.rounds)} {x.rounds.toLowerCase()}
                {m.tg_linked ? ` · ${x.tgLinked}` : ""}
              </small>
              {m.note && <p className="rs-muted">{m.note}</p>}
            </div>
            {m.deleted ? (
              <button type="button" className="md-btn md-btn-primary" onClick={() => act("restore", () => api.restoreMember(id), x.restored)} disabled={readOnly || !!busy}>
                <Undo2 size={15} /> {x.restore}
              </button>
            ) : (
              <>
                {ready.map((l) => (
                  <button key={l.at} type="button" className="md-btn sc-reward-btn" onClick={() => act(`r${l.at}`, () => api.reward(id, l.at), x.rewardOk.replace("{name}", levelName(l, lang)))} disabled={readOnly || !!busy}>
                    <Gift size={17} /> {x.giveReward.replace("{name}", levelName(l, lang))}
                  </button>
                ))}
                <div className="qg-bulk-acts">
                  <button type="button" className="md-btn md-btn-primary" onClick={() => act("s1", () => api.stamp(id, 1), x.stampedOk.replace("{n}", 1).replace("{now}", m.stamps + 1).replace("{goal}", data.program.goal))} disabled={readOnly || !!busy} data-testid="sc-sheet-plus1">
                    {busy === "s1" ? <Loader2 size={15} className="md-spin" /> : <Plus size={15} />} {x.addStamp}
                  </button>
                  <button type="button" className="md-btn md-btn-ghost" onClick={() => setQr(true)}>
                    <QrCode size={15} /> {x.showCard}
                  </button>
                  <button type="button" className="md-btn md-btn-ghost" onClick={() => copy(d.link || cardUrl(m.token), ctx)}>
                    <Copy size={15} /> {x.cardLink}
                  </button>
                  <a className="md-btn md-btn-ghost" href={cardUrl(m.token)} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} />
                  </a>
                </div>
                <div className="qg-bulk-acts">
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setEdit({ name: m.name, phone: m.phone, note: m.note })} disabled={readOnly}>
                    {x.edit}
                  </button>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setFix({ n: "", note: "" })} disabled={readOnly}>
                    {x.fix}
                  </button>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => window.confirm(x.newLinkAsk) && act("link", () => api.newLink(id), x.newLinkDone)} disabled={readOnly}>
                    <Link2 size={14} /> {x.newLink}
                  </button>
                  <button
                    type="button"
                    className="md-btn md-btn-ghost sa-btn-sm"
                    onClick={() => {
                      if (!window.confirm(x.deleteAsk)) return;
                      act("del", () => api.removeMember(id), x.deleted).then(onClose);
                    }}
                    disabled={readOnly}
                  >
                    <Trash2 size={14} /> {x.delete}
                  </button>
                </div>
              </>
            )}
            {edit && (
              <form
                className="panel-card md-fields"
                onSubmit={(e) => {
                  e.preventDefault();
                  act("edit", () => api.saveMember(id, edit), x.saved).then(() => setEdit(null));
                }}
              >
                <div className="sc-form-grid">
                  <div className="md-field">
                    <label>{x.name}</label>
                    <input value={edit.name} maxLength={80} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required />
                  </div>
                  <div className="md-field">
                    <label>{x.phone}</label>
                    <input value={edit.phone} inputMode="tel" maxLength={20} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
                  </div>
                </div>
                <div className="md-field">
                  <label>{x.note}</label>
                  <input value={edit.note} maxLength={300} placeholder={x.notePh} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
                </div>
                <div className="qg-bulk-acts">
                  <button type="submit" className="md-btn md-btn-primary sa-btn-sm" disabled={busy === "edit"}>
                    {x.save}
                  </button>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setEdit(null)}>
                    {x.cancel}
                  </button>
                </div>
              </form>
            )}
            {fix && (
              <form
                className="panel-card md-fields"
                onSubmit={(e) => {
                  e.preventDefault();
                  act("fix", () => api.adjust(id, Number(fix.n), fix.note), x.saved).then(() => setFix(null));
                }}
              >
                <p className="rs-muted">{x.fixSub}</p>
                <div className="sc-form-grid">
                  <div className="md-field">
                    <label>{x.fixN}</label>
                    <input type="number" min={-40} max={40} value={fix.n} onChange={(e) => setFix({ ...fix, n: e.target.value })} required data-testid="sc-fix-n" />
                  </div>
                  <div className="md-field">
                    <label>{x.fixNote}</label>
                    <input value={fix.note} maxLength={200} onChange={(e) => setFix({ ...fix, note: e.target.value })} />
                  </div>
                </div>
                <div className="qg-bulk-acts">
                  <button type="submit" className="md-btn md-btn-primary sa-btn-sm" disabled={!Number(fix.n) || busy === "fix"}>
                    {x.save}
                  </button>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setFix(null)}>
                    {x.cancel}
                  </button>
                  <button
                    type="button"
                    className="md-btn md-btn-ghost sa-btn-sm sa-danger-text"
                    style={{ marginLeft: "auto" }}
                    onClick={() => (fix.sure ? act("reset", () => api.reset(id), x.resetDone).then(() => setFix(null)) : setFix({ ...fix, sure: true }))}
                    disabled={busy === "reset" || readOnly}
                    data-testid="sc-sheet-reset"
                  >
                    <Eraser size={14} /> {fix.sure ? x.resetSure : x.resetCard}
                  </button>
                </div>
              </form>
            )}
            <section>
              <h3 className="dk-h3">{x.history}</h3>
              {!d.events.length && <p className="rs-muted">{x.noHistory}</p>}
              {d.events.map((e) => (
                <div key={e._id} className={`sc-ev k-${e.kind}`}>
                  <span>
                    {ev(e)}
                    {e.note ? <small className="rs-muted"> · {e.note}</small> : null}
                  </span>
                  <small>
                    {fmtTime(e.at, lang)} · {x.by[e.by?.kind] || e.by?.kind}
                    {e.by?.name ? ` (${e.by.name})` : ""}
                  </small>
                </div>
              ))}
            </section>
          </div>
        )}
        {qr && m && <CardQr x={x} member={m} onClose={() => setQr(false)} />}
      </div>
    </div>
  );
}

// ---------------------------------------- customers ----------------------------------------
export function CustomersTab({ ctx }) {
  const { x, lang, data, api, readOnly, notify } = ctx;
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(null);
  const [pg, setPg] = useState({ page: 1, pages: 1, total: 0 });
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resetAll, setResetAll] = useState(null); // { typed, note }
  const doResetAll = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.resetAll(resetAll.note);
      notify({ type: "success", text: x.resetAllDone.replace("{n}", fmt(r.data.reset)) });
      setResetAll(null);
      load(1);
      ctx.reload();
    } catch (err) {
      notify({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const load = useCallback(
    (page = 1) =>
      api
        .members({ filter, sort, q: query, page })
        .then((r) => {
          setRows((cur) => (page === 1 ? r.data : [...(cur || []), ...r.data]));
          setPg({ page, pages: r.pagination.totalPages || 1, total: r.pagination.total });
        })
        .catch((e) => notify({ type: "error", text: e.message })),
    [api, filter, sort, query, notify],
  );
  useEffect(() => {
    load(1);
  }, [load]);
  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.addMember({ ...adding, stamps: Number(adding.stamps) || 0 });
      notify({ type: "success", text: x.added });
      setAdding(null);
      load(1);
      ctx.reload();
      setOpen(r.data._id);
    } catch (err) {
      if (err.body?.product) ctx.askBuy({ addon: err.body.product });
      else notify({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };
  const goal = data.program.goal;
  const full = !ctx.on("sc_more") && data.totals.customers >= data.limits.free;
  return (
    <div className="rs-col">
      <Head icon={Users} title={x.customersTitle} sub={ctx.on("sc_more") ? x.customersSubMore : x.customersSub.replace("{n}", fmt(data.totals.customers)).replace("{max}", fmt(data.limits.free))}>
        <button type="button" className="md-btn md-btn-primary" onClick={() => (full ? ctx.askBuy({ addon: "sc_more" }) : setAdding({ name: "", phone: "", note: "", stamps: "" }))} disabled={readOnly} data-testid="sc-add">
          <UserPlus size={16} /> {x.add}
        </button>
        <button type="button" className="md-btn md-btn-ghost sa-danger-text" onClick={() => setResetAll({ typed: "", note: "" })} disabled={readOnly || !data.totals.customers} data-testid="sc-reset-all">
          <Eraser size={16} /> {x.resetAll}
        </button>
      </Head>
      {resetAll && (
        <div className="md-modal-backdrop" onMouseDown={() => setResetAll(null)}>
          <form className="md-modal md-modal-sm" onSubmit={doResetAll} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={x.resetAll}>
            <div className="md-modal-header">
              <h3>{x.resetAll}</h3>
              <button type="button" className="md-icon-btn" onClick={() => setResetAll(null)} aria-label={x.close}>
                <X size={18} />
              </button>
            </div>
            <div className="md-modal-body md-fields">
              <div className="md-form-error">{x.resetAllWarn}</div>
              <div className="md-field">
                <label>{x.fixNote}</label>
                <input value={resetAll.note} maxLength={200} placeholder={x.resetAllNotePh} onChange={(e) => setResetAll({ ...resetAll, note: e.target.value })} />
              </div>
              <div className="md-field">
                <label>{x.resetAllType}</label>
                <input value={resetAll.typed} onChange={(e) => setResetAll({ ...resetAll, typed: e.target.value })} placeholder="RESET" autoComplete="off" data-testid="sc-reset-all-type" />
              </div>
            </div>
            <div className="md-modal-footer">
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setResetAll(null)}>
                {x.cancel}
              </button>
              <button type="submit" className="md-btn md-btn-primary sa-danger-bg" disabled={busy || resetAll.typed.trim().toUpperCase() !== "RESET"} data-testid="sc-reset-all-go">
                {busy ? <Loader2 size={15} className="md-spin" /> : <Eraser size={15} />} {x.resetAllGo}
              </button>
            </div>
          </form>
        </div>
      )}
      {full && (
        <div className="rs-banner warn">
          <Lock size={18} />
          <span>
            <b>{x.limitTitle}</b> {x.limitSub}
          </span>
        </div>
      )}
      <section className="panel-card">
        <div className="md-toolbar">
          <label className="md-search" style={{ flex: "1 1 220px" }}>
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={x.search} aria-label={x.search} data-testid="sc-search" />
          </label>
          <select className="sa-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="sort">
            {Object.entries(x.sort).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="lang-switch sa-type-switch" role="group" style={{ marginTop: 10, flexWrap: "wrap" }}>
          {Object.entries(x.filters).map(([k, v]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} data-testid={`sc-filter-${k}`}>
              {v}
            </button>
          ))}
        </div>
        <div className="sc-rows" style={{ marginTop: 10 }}>
          {!rows ? (
            <Loader2 size={18} className="md-spin" />
          ) : !rows.length ? (
            <p className="rs-muted">{query || filter !== "all" ? x.noResults : x.noCustomers}</p>
          ) : (
            rows.map((m) => (
              <button key={m._id} type="button" className="sc-row" onClick={() => setOpen(m._id)} data-testid="sc-row">
                <span className="sc-av">{String(m.name || "?").trim().slice(0, 1).toUpperCase()}</span>
                <span className="sc-row-main">
                  <b>
                    {m.name} <small className="rs-muted">#{m.no}</small>
                  </b>
                  <small>
                    {m.phone ? `${prettyPhone(m.phone)} · ` : ""}
                    {m.last_visit_at ? x.lastVisit.replace("{ago}", ago(m.last_visit_at, x)) : x.neverVisit}
                  </small>
                </span>
                <span className="sc-row-side">
                  <b>
                    {m.stamps}/{goal}
                  </b>
                  {m.ready.length > 0 ? (
                    <span className="sc-pill-ready">{x.readyNow}</span>
                  ) : (
                    goal <= 12 && (
                      <span className="sc-dots" aria-hidden="true">
                        {Array.from({ length: goal }, (_, i) => (
                          <i key={i} className={i < m.stamps ? "on" : ""} />
                        ))}
                      </span>
                    )
                  )}
                </span>
              </button>
            ))
          )}
        </div>
        {rows && pg.page < pg.pages && (
          <button type="button" className="md-btn md-btn-ghost" style={{ marginTop: 10 }} onClick={() => load(pg.page + 1)}>
            {x.more}
          </button>
        )}
      </section>
      {adding && (
        <div className="md-modal-backdrop" onMouseDown={() => setAdding(null)}>
          <form className="md-modal md-modal-sm" onSubmit={add} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={x.add}>
            <div className="md-modal-header">
              <h3>{x.add}</h3>
              <button type="button" className="md-icon-btn" onClick={() => setAdding(null)} aria-label={x.close}>
                <X size={18} />
              </button>
            </div>
            <div className="md-modal-body md-fields">
              <div className="md-field">
                <label htmlFor="sc-a-name">{x.name}</label>
                <input id="sc-a-name" value={adding.name} maxLength={80} onChange={(e) => setAdding({ ...adding, name: e.target.value })} required autoFocus data-testid="sc-a-name" />
              </div>
              <div className="md-field">
                <label htmlFor="sc-a-phone">{x.phone}</label>
                <input id="sc-a-phone" value={adding.phone} inputMode="tel" maxLength={20} placeholder="012 345 678" onChange={(e) => setAdding({ ...adding, phone: e.target.value })} data-testid="sc-a-phone" />
              </div>
              <div className="md-field">
                <label htmlFor="sc-a-note">{x.note}</label>
                <input id="sc-a-note" value={adding.note} maxLength={300} placeholder={x.notePh} onChange={(e) => setAdding({ ...adding, note: e.target.value })} />
              </div>
              <div className="md-field">
                <label htmlFor="sc-a-st">{x.paperStamps}</label>
                <input id="sc-a-st" type="number" min={0} max={goal * 2} value={adding.stamps} onChange={(e) => setAdding({ ...adding, stamps: e.target.value })} />
                <small className="md-hint">{x.paperHint}</small>
              </div>
            </div>
            <div className="md-modal-footer">
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setAdding(null)}>
                {x.cancel}
              </button>
              <button type="submit" className="md-btn md-btn-primary" disabled={busy || !adding.name.trim()} data-testid="sc-a-save">
                {busy ? <Loader2 size={15} className="md-spin" /> : <UserPlus size={15} />} {x.add}
              </button>
            </div>
          </form>
        </div>
      )}
      {open && (
        <MemberSheet
          ctx={ctx}
          id={open}
          onClose={() => setOpen(null)}
          onChanged={() => {
            load(1);
            ctx.reload();
          }}
        />
      )}
      <span hidden>{lang}</span>
    </div>
  );
}

// ---------------------------------------- history ----------------------------------------
export function HistoryTab({ ctx }) {
  const { x, lang, api, notify } = ctx;
  const [kind, setKind] = useState("");
  const [rows, setRows] = useState(null);
  const [pg, setPg] = useState({ page: 1, pages: 1 });
  const load = useCallback(
    (page = 1) =>
      api
        .history({ kind, page })
        .then((r) => {
          setRows((cur) => (page === 1 ? r.data : [...(cur || []), ...r.data]));
          setPg({ page, pages: r.pagination.totalPages || 1 });
        })
        .catch((e) => notify({ type: "error", text: e.message })),
    [api, kind, notify],
  );
  useEffect(() => {
    load(1);
  }, [load]);
  const ev = (e) => (e.kind === "stamp" ? x.ev.stamp.replace("{n}", e.n) : e.kind === "reward" ? x.ev.reward.replace("{reward}", e.reward.split(" · ")[lang === "km" ? 0 : 1] || e.reward) : e.kind === "adjust" ? x.ev.adjust.replace("{n}", e.n > 0 ? `+${e.n}` : e.n) : e.kind === "expire" ? x.ev.expire.replace("{n}", Math.abs(e.n)) : x.ev.join);
  return (
    <div className="rs-col">
      <Head icon={History} title={x.historyTitle} sub={x.historySub} />
      <section className="panel-card">
        <div className="lang-switch sa-type-switch" role="group" style={{ flexWrap: "wrap" }}>
          {Object.entries(x.kinds).map(([k, v]) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {v}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          {!rows ? (
            <Loader2 size={18} className="md-spin" />
          ) : !rows.length ? (
            <p className="rs-muted">{x.noHistory}</p>
          ) : (
            rows.map((e) => (
              <div key={e._id} className={`sc-ev k-${e.kind}`} data-testid="sc-ev">
                <span>
                  <b>{e.member?.name}</b> <small className="rs-muted">#{e.member?.no}</small> · {ev(e)}
                  {e.note ? <small className="rs-muted"> · {e.note}</small> : null}
                </span>
                <small>
                  {fmtTime(e.at, lang)} · {x.by[e.by?.kind] || e.by?.kind}
                  {e.by?.name ? ` (${e.by.name})` : ""}
                </small>
              </div>
            ))
          )}
        </div>
        {rows && pg.page < pg.pages && (
          <button type="button" className="md-btn md-btn-ghost" style={{ marginTop: 10 }} onClick={() => load(pg.page + 1)}>
            {x.more}
          </button>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------- stats ----------------------------------------
export function StatsTab({ ctx }) {
  const { x, lang, api, notify } = ctx;
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(null);
    api
      .stats(days)
      .then((r) => setD(r.data))
      .catch((e) => notify({ type: "error", text: e.message }));
  }, [api, days, notify]);
  const maxDay = d ? Math.max(1, ...d.days.map((r) => r.visits)) : 1;
  const maxHour = d ? Math.max(1, ...d.hours) : 1;
  return (
    <div className="rs-col">
      <Head icon={BarChart3} title={x.statsTitle} sub={x.statsSub}>
        <div className="lang-switch sa-type-switch" role="group">
          {[7, 30, 90].map((n) => (
            <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)}>
              {x[`days${n}`]}
            </button>
          ))}
        </div>
      </Head>
      {!d ? (
        <section className="panel-card">
          <Loader2 size={18} className="md-spin" />
        </section>
      ) : (
        <>
          <div className="sc-kpis">
            {[
              [x.visits, d.totals.visits],
              [x.stamps, d.totals.stamps],
              [x.rewards, d.totals.rewards],
              [x.newCustomers, d.joined],
            ].map(([k, v]) => (
              <div key={k} className="panel-card sc-kpi">
                <small>{k}</small>
                <b>{fmt(v)}</b>
              </div>
            ))}
          </div>
          <section className="panel-card">
            <h3 className="dk-h3">{x.perDay}</h3>
            {!d.totals.visits ? (
              <p className="rs-muted">{x.noData}</p>
            ) : (
              <>
                <div className="sc-bars" role="img" aria-label={x.perDay}>
                  {d.days.map((r) => (
                    <span key={r.day} className={r.visits ? "" : "zero"} style={{ height: `${(r.visits / maxDay) * 100}%` }} title={`${r.day}: ${r.visits} · ${r.stamps} ★ · ${r.rewards} 🎁`} />
                  ))}
                </div>
                <div className="sc-bars-axis">
                  <span>{fmtDate(d.days[0].day, lang)}</span>
                  <span>{fmtDate(d.days[d.days.length - 1].day, lang)}</span>
                </div>
              </>
            )}
          </section>
          <section className="panel-card">
            <h3 className="dk-h3">{x.busyHours}</h3>
            <div className="sc-bars" role="img" aria-label={x.busyHours}>
              {d.hours.map((v, h) => (
                <span key={h} className={v ? "" : "zero"} style={{ height: `${(v / maxHour) * 100}%` }} title={`${h}:00 · ${v}`} />
              ))}
            </div>
            <div className="sc-bars-axis">
              <span>0:00</span>
              <span>12:00</span>
              <span>23:00</span>
            </div>
          </section>
          <section className="panel-card">
            <h3 className="dk-h3">{x.best}</h3>
            {!d.best.length && <p className="rs-muted">{x.noData}</p>}
            {d.best.map((b, i) => (
              <div key={b._id} className="sc-ev">
                <span>
                  {i + 1}. <b>{b.name}</b> <small className="rs-muted">#{b.no}</small>
                </span>
                <small>
                  {fmt(b.visits)} {x.visits.toLowerCase()} · {fmt(b.period_stamps)} ★
                </small>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

// ---------------------------------------- shop QR (posters) ----------------------------------------
export function ShopQrTab({ ctx }) {
  const { x, lang, data, api, readOnly, notify } = ctx;
  const p = data.program;
  const url = shopUrl(p.slug);
  const last = data.levels[data.levels.length - 1];
  const rule = x.posterRule.replace("{goal}", p.goal).replace("{reward}", levelName(last, lang));
  const owned = data.posters.owned;
  const [pick, setPick] = useState(p.poster || "basic");
  const [qr, setQr] = useState(null);
  const [thumbs, setThumbs] = useState({});
  const [big, setBig] = useState("");
  const [filter, setFilter] = useState("all");
  const shop = useMemo(() => shopOf(data), [data]);
  // what the owner adds on the poster (title, own line, phone, address)
  const savedInfo = { title: "", sub: "", rule: "", scan: "", note: "", phone: true, address: false, ...(p.poster_info || {}) };
  const [info, setInfo] = useState(savedInfo);
  const infoDirty = JSON.stringify(info) !== JSON.stringify(savedInfo);
  const infoOf = (i) => ({ title: i.title, sub: i.sub, rule: i.rule, scan: i.scan, note: i.note, phone: i.phone ? p.phone : "", address: i.address ? p.address : "" });
  const drawInfo = useMemo(() => infoOf(info), [JSON.stringify(info), p.phone, p.address]); // eslint-disable-line react-hooks/exhaustive-deps
  const thumbInfo = useMemo(() => infoOf(savedInfo), [JSON.stringify(p.poster_info), p.phone, p.address]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    qrCanvas(url).then(setQr);
  }, [url]);
  // small pictures for the picker, a few at a time so the page stays smooth
  useEffect(() => {
    if (!qr) return undefined;
    let stop = false;
    const keys = [...POSTER_KEYS];
    const out = {};
    const step = () => {
      if (stop) return;
      for (const k of keys.splice(0, 8)) out[k] = drawPoster(k, { qr, shop, rule, scale: 0.2, info: thumbInfo }).toDataURL("image/jpeg", 0.8);
      setThumbs({ ...out });
      if (keys.length) setTimeout(step, 30);
    };
    step();
    return () => {
      stop = true;
    };
  }, [qr, shop, rule, thumbInfo]);
  useEffect(() => {
    if (qr) setBig(drawPoster(pick, { qr, shop, rule, scale: 0.6, info: drawInfo }).toDataURL("image/png"));
  }, [qr, pick, shop, rule, drawInfo]);
  const has = (k) => owned.includes(k);
  const use = async (k) => {
    setPick(k);
    if (!has(k) || k === p.poster) return;
    try {
      const r = await api.save({ poster: k });
      ctx.put({ program: r.data.program, levels: r.data.levels });
    } catch (e) {
      notify({ type: "error", text: e.message });
    }
  };
  const download = async (onlyQr) => {
    const href = onlyQr ? await QRCode.toDataURL(url, { width: 1000, margin: 2 }) : drawPoster(pick, { qr, shop, rule, scale: 1, info: drawInfo }).toDataURL("image/png");
    const a = document.createElement("a");
    a.href = href;
    a.download = `${p.slug}-${onlyQr ? "qr" : pick}.png`;
    a.click();
  };
  const print = () => {
    const src = drawPoster(pick, { qr, shop, rule, scale: 1, info: drawInfo }).toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><title>${p.slug}</title><style>body{margin:0;display:grid;place-items:center;min-height:100vh}img{max-width:100%;max-height:100vh}</style><img src="${src}"><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>`);
    w.document.close();
  };
  const save = async (body) => {
    try {
      const r = await api.save(body);
      ctx.put({ program: r.data.program, levels: r.data.levels });
      notify({ type: "success", text: x.saved });
    } catch (e) {
      notify({ type: "error", text: e.message });
    }
  };
  const shown = POSTER_KEYS.filter((k) => filter === "all" || (filter === "mine" ? has(k) : posterOf(k).layout === filter));
  const locked = !has(pick);
  return (
    <div className="rs-col">
      <Head icon={QrCode} title={x.qrTitle} sub={x.qrSub}>
        <a className="md-btn md-btn-ghost sa-btn-sm" href={url} target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> {x.openShop}
        </a>
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => copy(url, ctx)}>
          <Copy size={14} /> {x.copyLink}
        </button>
      </Head>
      <div className="sc-design">
        <div className="rs-col">
          <section className="panel-card">
            <h3 className="dk-h3">
              {x.posters} <small className="rs-muted">· {x.postersSub.replace("{n}", fmt(POSTER_KEYS.length - 1)).replace("{coins}", fmt(data.posters.price))}</small>
            </h3>
            <div className="lang-switch sa-type-switch" role="group" style={{ flexWrap: "wrap", margin: "8px 0 12px" }}>
              {["all", "mine", "center", "band", "frame", "ticket", "stamps"].map((k) => (
                <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                  {x.posterFilters[k]}
                </button>
              ))}
            </div>
            <div className="sc-posters" data-testid="sc-posters">
              {shown.map((k) => (
                <button key={k} type="button" className={`sc-poster-pick ${pick === k ? "on" : ""}`} onClick={() => use(k)} data-testid={`sc-poster-${k}`}>
                  {thumbs[k] ? <img src={thumbs[k]} alt="" loading="lazy" /> : <span className="sc-poster-ph" />}
                  <span className="sc-theme-meta">
                    <span>{posterName(k, lang)}</span>
                    {has(k) ? (
                      p.poster === k ? <Check size={14} /> : <small>{posterOf(k).tier === "free" ? x.free : x.unlocked}</small>
                    ) : (
                      <small>
                        <CoinIcon size={11} /> {fmt(data.posters.price)}
                      </small>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="panel-card md-fields" data-testid="sc-poster-info">
            <h3 className="dk-h3">{x.pInfo}</h3>
            <p className="rs-muted" style={{ margin: 0 }}>{x.pInfoSub}</p>
            {[
              ["title", 60, POSTER_TEXT.title],
              ["sub", 80, POSTER_TEXT.sub],
              ["rule", 80, rule],
              ["scan", 90, POSTER_TEXT.scan],
              ["note", 90, POSTER_TEXT.note],
            ].map(([k, max, def]) => (
              <div key={k} className="md-field">
                <label>{x.pLines[k]}</label>
                <input value={info[k]} maxLength={max} placeholder={def} onChange={(e) => setInfo({ ...info, [k]: e.target.value })} disabled={readOnly} data-testid={`sc-pi-${k}`} />
              </div>
            ))}
            <small className="rs-muted">{x.pEmpty}</small>
            <Switch checked={info.phone} onChange={(v) => setInfo({ ...info, phone: v })} label={`${x.pPhone}${p.phone ? ` · ${p.phone}` : ""}`} disabled={readOnly || !p.phone} testid="sc-pi-phone" />
            <Switch checked={info.address} onChange={(v) => setInfo({ ...info, address: v })} label={`${x.pAddress}${p.address ? ` · ${p.address}` : ""}`} disabled={readOnly || !p.address} testid="sc-pi-address" />
            {(!p.phone || !p.address) && <small className="rs-muted">{x.pNoContact}</small>}
            {infoDirty && (
              <button type="button" className="md-btn md-btn-primary" onClick={() => save({ poster_info: info })} disabled={readOnly} data-testid="sc-pi-save">
                <Check size={15} /> {x.save}
              </button>
            )}
          </section>
          <section className="panel-card md-fields">
            <Switch checked={p.join_on !== false} onChange={(v) => save({ join_on: v })} label={x.joinOn} disabled={readOnly} testid="sc-join-on" />
            {p.join_on === false && <p className="rs-muted">{x.qrJoinOff}</p>}
            {ctx.on("sc_check") ? (
              <p className="sc-tg on" style={{ justifyContent: "flex-start" }}>
                <Check size={15} /> {x.checkOn}
              </p>
            ) : (
              <Locked ctx={ctx} addon="sc_check" small />
            )}
          </section>
        </div>
        <aside className="sc-design-preview">
          <b>
            {x.preview} · {posterName(pick, lang)}
          </b>
          {big ? <img src={big} alt="" className="sc-poster" data-testid="sc-poster" /> : <Loader2 size={18} className="md-spin" />}
          {locked ? (
            <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ poster: pick })} disabled={readOnly} data-testid="sc-poster-buy">
              <CoinIcon size={15} /> {x.buyTheme.replace("{coins}", fmt(data.posters.price))}
            </button>
          ) : (
            <>
              <button type="button" className="md-btn md-btn-primary" onClick={() => download(false)} disabled={!qr}>
                <Download size={15} /> {x.download}
              </button>
              <div className="qg-bulk-acts">
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => download(true)}>
                  <QrCode size={14} /> {x.downloadQr}
                </button>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={print} disabled={!qr}>
                  <Printer size={14} /> {x.print}
                </button>
              </div>
            </>
          )}
          <small className="rs-muted" style={{ wordBreak: "break-all" }}>
            {url}
          </small>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------- card & rewards ----------------------------------------
export function DesignTab({ ctx }) {
  const { x, lang, data, api, readOnly, notify } = ctx;
  const p = data.program;
  const [f, setF] = useState(() => ({
    shop_name: p.shop_name || data.business.name,
    phone: p.phone,
    address: p.address,
    theme: p.theme,
    color: p.color,
    icon: p.icon,
    goal: p.goal,
    reward_en: p.reward_en,
    reward_km: p.reward_km,
    levels: (p.levels || []).map((l) => ({ ...l })),
    welcome: p.welcome,
    max_per_visit: p.max_per_visit,
    expiry_months: p.expiry_months,
    terms_en: p.terms_en,
    terms_km: p.terms_km,
  }));
  const [busy, setBusy] = useState("");
  const file = useRef(null);
  const owned = data.themes.owned;
  const levelsOn = ctx.on("sc_levels");
  const previewLevels = [...(levelsOn ? f.levels.filter((l) => Number(l.at) >= 1 && Number(l.at) < f.goal && (l.en || l.km)).map((l) => ({ ...l, at: Number(l.at) })) : []), { at: f.goal, en: f.reward_en, km: f.reward_km }].sort((a, b) => a.at - b.at);
  const save = async () => {
    setBusy("save");
    try {
      const body = { ...f, goal: Number(f.goal) };
      if (!levelsOn) delete body.levels;
      if (!ctx.on("sc_expiry")) delete body.expiry_months;
      if (!owned.includes(f.theme)) delete body.theme;
      const r = await api.save(body);
      ctx.put({ program: r.data.program, levels: r.data.levels });
      notify({ type: "success", text: x.saved });
    } catch (e) {
      if (e.body?.product) ctx.askBuy({ addon: e.body.product });
      else notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const logo = async (fl) => {
    if (!fl) return;
    setBusy("logo");
    try {
      const r = await api.logo(fl);
      ctx.put((d) => ({ program: { ...d.program, logo: r.data.logo } }));
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="rs-col">
      <Head icon={Palette} title={x.designTitle} sub={x.designSub}>
        <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={readOnly || !!busy} data-testid="sc-design-save">
          {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {x.save}
        </button>
      </Head>
      <div className="sc-design">
        <div className="rs-col">
          <section className="panel-card" data-testid="sc-shop-box">
            <h3 className="dk-h3">{x.shopBox}</h3>
            <div className="sc-form-grid">
              <div className="md-field">
                <label>{x.logo}</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="cl-logo-prev" data-testid="sc-logo-prev">{p.logo ? <img src={p.logo} alt="" /> : <ImagePlus size={20} />}</span>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => file.current?.click()} disabled={readOnly || busy === "logo"}>
                    {busy === "logo" ? <Loader2 size={14} className="md-spin" /> : <ImagePlus size={14} />} {x.logoPick}
                  </button>
                  {p.logo && (
                    <button
                      type="button"
                      className="md-btn md-btn-ghost sa-btn-sm"
                      onClick={async () => {
                        await api.removeLogo().catch(() => {});
                        ctx.put((d) => ({ program: { ...d.program, logo: "" } }));
                      }}
                      disabled={readOnly}
                    >
                      {x.logoRemove}
                    </button>
                  )}
                  <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => {
                      logo(e.target.files?.[0]);
                      e.target.value = "";
                    }} />
                </div>
              </div>
              <div className="md-field">
                <label>{x.shopName}</label>
                <input value={f.shop_name} maxLength={80} onChange={set("shop_name")} />
              </div>
            </div>
            <p className="rs-muted" style={{ margin: "6px 0 0" }}>{x.shopBoxHint}</p>
          </section>
          <section className="panel-card">
            <h3 className="dk-h3">{x.look}</h3>
            <div className="sc-themes">
              {SC_THEME_KEYS.map((k) => {
                const t = SC_THEMES[k];
                const Icon = iconOf(f.icon);
                const has = owned.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    className={`sc-theme ${f.theme === k ? "on" : ""}`}
                    onClick={() => (has ? setF({ ...f, theme: k }) : ctx.askBuy({ theme: k }))}
                    disabled={readOnly && !has}
                    data-testid={`sc-theme-${k}`}
                  >
                    <span className="sc-theme-swatch" style={{ background: t.bg }}>
                      {[0, 1, 2].map((i) => (
                        <i key={i} style={{ background: i < 2 ? t.accent : t.slot, color: t.dark ? "#111" : "#fff", border: `1.5px solid ${t.accent}` }}>
                          {i < 2 && <Icon size={11} />}
                        </i>
                      ))}
                    </span>
                    <span className="sc-theme-meta">
                      {themeName(k, lang)}
                      {has ? (
                        f.theme === k ? (
                          <Check size={14} />
                        ) : (
                          <small>{t.tier === "free" ? x.free : x.unlocked}</small>
                        )
                      ) : (
                        <small>
                          <CoinIcon size={11} /> {fmt(data.themes.price)}
                        </small>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <h3 className="dk-h3" style={{ marginTop: 16 }}>
              {x.stampIcon}
            </h3>
            <div className="sc-icons">
              {data.icons.map((k) => {
                const Icon = iconOf(k);
                return (
                  <button key={k} type="button" className={f.icon === k ? "on" : ""} onClick={() => setF({ ...f, icon: k })} aria-label={k} aria-pressed={f.icon === k}>
                    <Icon size={20} />
                  </button>
                );
              })}
            </div>
            <div className="sc-form-grid" style={{ marginTop: 16 }}>
              <div className="md-field">
                <label>{x.color}</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={f.color || themeOf(f.theme).accent.slice(0, 7)} onChange={set("color")} style={{ width: 56, padding: 2 }} />
                  {f.color && (
                    <button type="button" className="sa-link" onClick={() => setF({ ...f, color: "" })}>
                      <RotateCcw size={13} /> {x.colorReset}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="sc-form-grid">
              <div className="md-field">
                <label>{x.shopPhone}</label>
                <input value={f.phone} maxLength={40} inputMode="tel" onChange={set("phone")} />
              </div>
            </div>
            <div className="md-field">
              <label>{x.shopAddress}</label>
              <input value={f.address} maxLength={200} onChange={set("address")} />
            </div>
          </section>

          <section className="panel-card">
            <h3 className="dk-h3">{x.rule}</h3>
            <div className="sc-form-grid">
              <div className="md-field">
                <label>{x.goal}</label>
                <select value={f.goal} onChange={(e) => setF({ ...f, goal: Number(e.target.value) })} data-testid="sc-goal">
                  {Array.from({ length: 18 }, (_, i) => i + 3).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md-field">
                <label>{x.welcome}</label>
                <select value={f.welcome} onChange={(e) => setF({ ...f, welcome: Number(e.target.value) })}>
                  {[0, 1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n || x.welcomeNone}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="sc-form-grid">
              <div className="md-field">
                <label>{x.rewardEn}</label>
                <input value={f.reward_en} maxLength={80} onChange={set("reward_en")} data-testid="sc-reward-en" />
              </div>
              <div className="md-field">
                <label>{x.rewardKm}</label>
                <input value={f.reward_km} maxLength={120} onChange={set("reward_km")} />
              </div>
            </div>
            <h3 className="dk-h3" style={{ marginTop: 12 }}>
              {x.levels}
            </h3>
            {levelsOn ? (
              <>
                <p className="rs-muted">{x.levelsHint}</p>
                {f.levels.map((l, i) => (
                  <div key={i} className="sc-level-row">
                    <select value={l.at} onChange={(e) => setF({ ...f, levels: f.levels.map((v, j) => (j === i ? { ...v, at: Number(e.target.value) } : v)) })} aria-label={x.levelAt}>
                      {Array.from({ length: f.goal - 1 }, (_, k) => k + 1).map((n) => (
                        <option key={n} value={n}>
                          {n} ★
                        </option>
                      ))}
                    </select>
                    <input value={l.en || ""} maxLength={80} placeholder="English" onChange={(e) => setF({ ...f, levels: f.levels.map((v, j) => (j === i ? { ...v, en: e.target.value } : v)) })} />
                    <input value={l.km || ""} maxLength={120} placeholder="ខ្មែរ" onChange={(e) => setF({ ...f, levels: f.levels.map((v, j) => (j === i ? { ...v, km: e.target.value } : v)) })} />
                    <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => setF({ ...f, levels: f.levels.filter((_, j) => j !== i) })} aria-label={x.delete}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {f.levels.length < 4 && (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setF({ ...f, levels: [...f.levels, { at: Math.max(1, Math.floor(f.goal / 2)), en: "", km: "" }] })} data-testid="sc-level-add">
                    <Plus size={14} /> {x.levelAdd}
                  </button>
                )}
              </>
            ) : (
              <Locked ctx={ctx} addon="sc_levels" small />
            )}
          </section>

          <section className="panel-card">
            <div className="sc-form-grid">
              <div className="md-field">
                <label>{x.maxPerVisit}</label>
                <select value={f.max_per_visit} onChange={(e) => setF({ ...f, max_per_visit: Number(e.target.value) })}>
                  {[1, 2, 3, 5, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="md-field">
              <label>{x.expiry}</label>
              {ctx.on("sc_expiry") ? (
                <select value={f.expiry_months} onChange={(e) => setF({ ...f, expiry_months: Number(e.target.value) })}>
                  {[0, 3, 6, 9, 12, 18, 24].map((n) => (
                    <option key={n} value={n}>
                      {n ? x.expiryMonths.replace("{n}", n) : x.expiryNever}
                    </option>
                  ))}
                </select>
              ) : (
                <Locked ctx={ctx} addon="sc_expiry" small />
              )}
            </div>
            <h3 className="dk-h3" style={{ marginTop: 12 }}>
              {x.terms}
            </h3>
            <div className="sc-form-grid">
              <div className="md-field">
                <label>{x.termsEn}</label>
                <textarea rows={2} value={f.terms_en} maxLength={300} placeholder={x.termsPh} onChange={set("terms_en")} />
              </div>
              <div className="md-field">
                <label>{x.termsKm}</label>
                <textarea rows={2} value={f.terms_km} maxLength={400} onChange={set("terms_km")} />
              </div>
            </div>
          </section>
        </div>
        <aside className="sc-design-preview">
          <b>{x.preview}</b>
          <StampCard shop={{ name: f.shop_name, logo: p.logo, theme: f.theme, color: f.color, icon: f.icon, goal: Number(f.goal), levels: previewLevels }} member={{ name: lang === "km" ? "សុខា" : "Sokha", no: 12, stamps: Math.max(1, Math.round(f.goal * 0.6)), claimed: [] }} lang={lang} />
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={readOnly || !!busy}>
            {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {x.save}
          </button>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------- staff desk ----------------------------------------
export function DeskTab({ ctx }) {
  const { x, data, api, readOnly, notify } = ctx;
  const p = data.program;
  const url = deskUrl(p.slug);
  const [pin, setPin] = useState("");
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(url, { width: 360, margin: 1 }).then(setQr);
  }, [url]);
  const save = async (body, ok) => {
    setBusy(true);
    try {
      const r = await api.desk(body);
      ctx.put((d) => ({ program: { ...d.program, desk: r.data } }));
      notify({ type: "success", text: ok || x.saved });
      setPin("");
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rs-col">
      <Head icon={Monitor} title={x.deskTitle} sub={x.deskSub} />
      <section className="panel-card md-fields">
        <Switch checked={p.desk?.on !== false} onChange={(v) => save({ on: v })} label={x.deskOn} disabled={readOnly || busy} />
        <Switch checked={!!p.desk?.can_reset} onChange={(v) => save({ can_reset: v })} label={x.deskCanReset} disabled={readOnly || busy} testid="sc-desk-can-reset" />
        <p className="rs-muted" style={{ margin: 0 }}>{x.deskCanResetSub}</p>
        <p className="rs-muted">{p.desk?.has_pin ? x.deskPinSet : x.deskPinNone}</p>
        <form
          className="qg-bulk-acts"
          onSubmit={(e) => {
            e.preventDefault();
            save({ pin }, x.deskPinSaved);
          }}
        >
          <input className="sa-select" type="password" inputMode="numeric" autoComplete="new-password" pattern="\d{4,8}" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder={x.deskPin} aria-label={x.deskPin} data-testid="sc-pin-input" />
          <button type="submit" className="md-btn md-btn-primary" disabled={readOnly || busy || pin.length < 4} data-testid="sc-pin-save">
            <Lock size={15} /> {x.deskPinSave}
          </button>
          {p.desk?.has_pin && (
            <button type="button" className="md-btn md-btn-ghost" onClick={() => save({ logout_all: true }, x.deskLoggedOut)} disabled={readOnly || busy}>
              <LogOut size={15} /> {x.deskLogoutAll}
            </button>
          )}
        </form>
      </section>
      <section className="panel-card sc-qr-box">
        <b>{x.deskLink}</b>
        {qr && <img src={qr} alt="" style={{ width: 200 }} />}
        <code>{url}</code>
        <div className="qg-bulk-acts" style={{ justifyContent: "center" }}>
          <a className="md-btn md-btn-ghost sa-btn-sm" href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> {x.deskOpen}
          </a>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => copy(url, ctx)}>
            <Copy size={14} /> {x.copyLink}
          </button>
        </div>
        <p className="rs-muted">{x.deskHow}</p>
      </section>
    </div>
  );
}

// ---------------------------------------- Telegram ----------------------------------------
export function TelegramTab({ ctx }) {
  const { x, data, api, readOnly, notify } = ctx;
  const [tg, setTg] = useState(data.telegram);
  const [busy, setBusy] = useState("");
  const [waiting, setWaiting] = useState(false);
  useEffect(() => setTg(data.telegram), [data.telegram]);
  if (!ctx.on("sc_telegram")) return <Locked ctx={ctx} addon="sc_telegram" />;
  const link = async (group) => {
    setBusy("link");
    try {
      const r = await api.telegramLink();
      window.open(group ? r.data.group_url : r.data.url, "_blank", "noopener");
      setWaiting(true);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const saveTg = async (body) => {
    const r = await api.telegramSave(body).catch((e) => notify({ type: "error", text: e.message }));
    if (r) setTg(r.data);
  };
  return (
    <div className="rs-col">
      <Head icon={Send} title={x.tgTitle} sub={x.tgSub} />
      <section className="panel-card md-fields">
        {!tg.configured ? (
          <p className="rs-muted">{x.tgNotReady}</p>
        ) : tg.connected ? (
          <>
            <span className="rs-pill on">
              <Check size={13} /> {x.tgConnected.replace("{name}", tg.chat_name)}
            </span>
            <Switch checked={tg.reward} onChange={(v) => saveTg({ reward: v })} label={x.tgReward} disabled={readOnly} />
            <Switch checked={tg.joined} onChange={(v) => saveTg({ joined: v })} label={x.tgJoined} disabled={readOnly} />
            <Switch checked={tg.daily} onChange={(v) => saveTg({ daily: v })} label={x.tgDaily} disabled={readOnly} />
            {tg.daily && (
              <div className="md-field" style={{ maxWidth: 200 }}>
                <label>{x.tgTime}</label>
                <input type="time" value={tg.time} onChange={(e) => saveTg({ time: e.target.value })} disabled={readOnly} />
              </div>
            )}
            <div className="qg-bulk-acts">
              <button
                type="button"
                className="md-btn md-btn-primary sa-btn-sm"
                disabled={!!busy || readOnly}
                onClick={async () => {
                  setBusy("test");
                  try {
                    await api.telegramTest();
                    notify({ type: "success", text: x.tgSentOk });
                  } catch (e) {
                    notify({ type: "error", text: e.message });
                  } finally {
                    setBusy("");
                  }
                }}
              >
                <Send size={14} /> {x.tgTest}
              </button>
              <button
                type="button"
                className="md-btn md-btn-ghost sa-btn-sm"
                disabled={!!busy || readOnly}
                onClick={async () => {
                  const r = await api.telegramOff().catch((e) => notify({ type: "error", text: e.message }));
                  if (r) setTg(r.data);
                }}
              >
                <Unplug size={14} /> {x.tgOff}
              </button>
            </div>
          </>
        ) : (
          <div className="qg-bulk-acts">
            <button type="button" className="md-btn md-btn-primary" onClick={() => link(false)} disabled={!!busy || readOnly}>
              {busy === "link" ? <Loader2 size={15} className="md-spin" /> : <Send size={15} />} {x.tgConnect}
            </button>
            <button type="button" className="md-btn md-btn-ghost" onClick={() => link(true)} disabled={!!busy || readOnly}>
              {x.tgGroup}
            </button>
            {waiting && (
              <>
                <small className="rs-muted">{x.tgWaiting}</small>
                <button type="button" className="sa-link" onClick={() => ctx.reload()}>
                  <RotateCcw size={13} />
                </button>
              </>
            )}
          </div>
        )}
      </section>
      <section className="panel-card">
        <p className="rs-muted">{x.tgCustomers}</p>
      </section>
    </div>
  );
}

// ---------------------------------------- add-ons ----------------------------------------
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
              <Stamp size={20} />
            </span>
            <div>
              <h3>{x.renewTitle}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(lic.price)} {x.coins} {x.perYear}
              </span>
            </div>
          </div>
          <p>{x.baseWhat}</p>
          <div className="rs-addon-foot">
            <span className={`rs-pill ${lic.active ? "on" : ""}`}>
              <Check size={13} /> {lic.expires_at ? x.endsOn.replace("{date}", fmtDate(lic.expires_at, lang)) : x.unlocked}
            </span>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy("renew")} disabled={!data.business.status}>
              {x.renewFor.replace("{coins}", fmt(lic.price))}
            </button>
          </div>
        </article>
        {Object.entries(data.addons).map(([k, a]) => {
          const Icon = ADDON_ICON[k] || Puzzle;
          return (
            <article key={k} className={`panel-card rs-addon s-${a.active ? "active" : "none"}`} data-testid={`sc-addon-${k}`}>
              <div className="rs-addon-top">
                <span className="rs-addon-ic">
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{x.addonNames[k]}</h3>
                  <span className="rs-addon-price">
                    <CoinIcon size={13} /> {fmt(a.price)} {x.coins} {a.days ? x.perYear : `· ${x.forever}`}
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
                        {x.renewFor.replace("{coins}", fmt(a.price))}
                      </button>
                    )}
                  </>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly} data-testid={`sc-buy-${k}`}>
                    <CoinIcon size={14} /> {x.unlock.replace("{coins}", fmt(a.price))}
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
