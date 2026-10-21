import { useCallback, useEffect, useState } from "react";
import { BedDouble, ChevronLeft, ChevronRight, Plus, RefreshCw, Sparkles, Trash2, Wallet } from "lucide-react";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { Modal } from "../../super_admin/parts";
import { fmtDay, fmtTime, money, todayKH } from "./text";
import { x3 } from "./gh3-text";
import { api } from "./GhStay";
import { Hero, Perks } from "./GhExtras";

// Housekeeping (gh_housekeeping) + Expenses & profit (gh_expenses) — owner dashboard and desk POS
const isOn = (ctx, key) => !!(ctx.data.addons?.[`gh_${key}`]?.active || ctx.data[key]);
const monthNow = () => todayKH().slice(0, 7);
const shiftMonth = (m, n) => {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mm - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const monthLabel = (m, lang, long = true) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { month: long ? "long" : "short", ...(long ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
const signed = (v, cur) => (v < 0 ? `−${money(-v, cur)}` : money(v, cur));
const CAT_ICON = { salary: "👥", electricity: "⚡", water: "💧", internet: "📶", supplies: "🧴", laundry: "🧺", repair: "🔧", food: "🍽️", rent: "🏠", tax: "🧾", marketing: "📣", commission: "🌐", other: "📦" };

// ============================ HOUSEKEEPING ============================
const NEXT = { dirty: ["cleaning", "hkStart"], cleaning: ["ready", "hkDone"], ready: ["dirty", "hkDirty"] };
export function HousekeepingTab({ ctx }) {
  const { lang, readOnly } = ctx;
  const t = x3(lang);
  const on = isOn(ctx, "housekeeping");
  const [d, setD] = useState(null);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const load = useCallback(
    () =>
      api(ctx)
        .housekeeping(ctx.id)
        .then((r) => setD(r.data))
        .catch((e) => (e.status === 402 ? setD(null) : ctx.notify({ type: "error", text: e.message }))),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    if (!on) return undefined;
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load, on]);

  const hero = <Hero icon={Sparkles} title={t.hkTitle} sub={on ? t.hkSub : t.hkOff.replace("{price}", ctx.data.addons?.gh_housekeeping?.price ?? "")} addon="gh_housekeeping" ctx={ctx} on={ctx.pos ? true : undefined} />;
  if (!on)
    return (
      <div className="rs-col">
        {hero}
        <Perks ctx={ctx} addon="gh_housekeeping" />
      </div>
    );
  if (!d) return <ListSkeleton rows={4} />;
  const set = async (r, state) => {
    setBusy(r._id);
    try {
      const res = await api(ctx).setHk(ctx.id, r._id, { state });
      setD({ ...d, rooms: d.rooms.map((x) => (x._id === r._id ? { ...x, ...res.data } : x)), counts: { ...d.counts, [r.hk]: d.counts[r.hk] - 1, [state]: d.counts[state] + 1 } });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const rooms = d.rooms.filter((r) => filter === "all" || r.hk === filter);
  const housekeeper = ctx.role === "housekeeper";
  return (
    <div className="rs-col">
      {!housekeeper && hero}
      <section className="panel-card ghhk-bar">
        <div className="ghhk-filters">
          {["all", "dirty", "cleaning", "ready"].map((k) => (
            <button key={k} type="button" className={`ghhk-chip k-${k} ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>
              {k === "all" ? t.hkAll : t.hk[k]} <em>{k === "all" ? d.rooms.length : d.counts[k]}</em>
            </button>
          ))}
        </div>
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={load} aria-label={t.hkRefresh}>
          <RefreshCw size={15} /> <span className="ghp-hide-sm">{t.hkRefresh}</span>
        </button>
      </section>
      {!rooms.length ? (
        <section className="panel-card ghpm-empty">
          <Sparkles size={36} />
          <p className="rs-muted">{t.hkNone}</p>
        </section>
      ) : (
        <div className="ghhk-grid">
          {rooms.map((r) => {
            const [next, label] = NEXT[r.hk];
            return (
              <article key={r._id} className={`ghhk-card s-${r.hk}`}>
                <header>
                  <b>{r.name}</b>
                  <span className="ghhk-state">{t.hk[r.hk]}</span>
                </header>
                <div className="ghhk-body">
                  <small className="ghhk-type">
                    <BedDouble size={13} /> {r.type}
                    {r.floor ? ` · ${r.floor}` : ""}
                  </small>
                  <span className={`ghhk-guest g-${r.leaving ? "leaving" : r.guest}`}>
                    {r.leaving ? t.hkLeaving : r.guest === "in" ? t.hkIn : r.guest === "arriving" ? t.hkArriving : t.hkEmpty}
                    {r.stay && r.guest !== "empty" ? ` · ${r.stay.name}` : ""}
                  </span>
                  {r.hk_at && <small className="rs-muted">{t.hkBy.replace("{who}", r.hk_by || "—").replace("{time}", fmtTime(r.hk_at, lang))}</small>}
                </div>
                <button type="button" className={`ghhk-btn to-${next}`} disabled={readOnly || busy === r._id} onClick={() => set(r, next)}>
                  {t[label]}
                </button>
              </article>
            );
          })}
        </div>
      )}
      {!ctx.pos && <p className="rs-muted ghhk-hint">{t.hkStaffHint}</p>}
    </div>
  );
}

// ============================ EXPENSES & PROFIT ============================
function ExpenseModal({ ctx, row, cats, onClose, onDone }) {
  const t = x3(ctx.lang);
  const desk = ctx.role === "desk";
  const [f, setF] = useState(() => ({ day: row?.day || todayKH(), category: row?.category || "supplies", amount: row ? String(row.amount) : "", method: row?.method || "cash", note: row?.note || "" }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sure, setSure] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const save = () => run(() => (row ? api(ctx).saveExpense(ctx.id, row._id, { ...f, amount: Number(f.amount) }) : api(ctx).addExpense(ctx.id, { ...f, amount: Number(f.amount) })));
  return (
    <Modal
      title={row ? t.exEdit : t.exAdd}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {row &&
            !desk &&
            (sure ? (
              <button type="button" className="md-btn md-btn-danger" style={{ marginRight: "auto" }} onClick={() => run(() => api(ctx).removeExpense(ctx.id, row._id))} disabled={busy}>
                {t.exSure}
              </button>
            ) : (
              <button type="button" className="md-btn md-btn-ghost sa-danger-text" style={{ marginRight: "auto" }} onClick={() => setSure(true)} disabled={busy}>
                <Trash2 size={15} /> {t.exDel}
              </button>
            ))}
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || !(Number(f.amount) > 0) || (row && desk)}>
            {busy ? t.saving : t.save}
          </button>
        </>
      }
    >
      <div className="ghex-form">
        {error && <div className="md-form-error">{error}</div>}
        <div className="ghb-two">
          <label className="ghb-field">
            <span>{t.exAmount} *</span>
            <input type="number" min={0} step="any" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} autoFocus placeholder={ctx.cur === "KHR" ? "40000" : "25"} />
          </label>
          <label className="ghb-field">
            <span>{t.exDay}</span>
            <input type="date" value={f.day} max={todayKH()} onChange={(e) => e.target.value && setF({ ...f, day: e.target.value })} />
          </label>
        </div>
        <div className="ghb-field">
          <span>{t.exCat}</span>
          <div className="ghex-cats">
            {cats.map((k) => (
              <button key={k} type="button" className={f.category === k ? "on" : ""} onClick={() => setF({ ...f, category: k })}>
                <span aria-hidden="true">{CAT_ICON[k]}</span> {t.cats[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="ghb-two">
          <div className="ghb-field">
            <span>{t.exMethod}</span>
            <div className="ghb-chips">
              {["cash", "bank"].map((k) => (
                <button key={k} type="button" className={f.method === k ? "on" : ""} onClick={() => setF({ ...f, method: k })}>
                  {t.exMethods[k]}
                </button>
              ))}
            </div>
          </div>
          <label className="ghb-field">
            <span>{t.exNote}</span>
            <input maxLength={200} value={f.note} placeholder={t.exNotePh} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </label>
        </div>
      </div>
    </Modal>
  );
}

export function ExpensesTab({ ctx }) {
  const { lang, readOnly, cur } = ctx;
  const t = x3(lang);
  const on = isOn(ctx, "expenses");
  const [month, setMonth] = useState(monthNow());
  const [ex, setEx] = useState(null);
  const [pf, setPf] = useState(null);
  const [edit, setEdit] = useState(null); // {} new | row
  const load = useCallback(() => {
    if (!on) return;
    Promise.all([api(ctx).expenses(ctx.id, month), api(ctx).profit(ctx.id, month)])
      .then(([a, b]) => {
        setEx(a.data);
        setPf(b.data);
      })
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx.id, month, on]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setEx(null);
    setPf(null);
    load();
  }, [load]);

  const hero = (
    <Hero
      icon={Wallet}
      title={t.exTitle}
      sub={on ? t.exSub : t.exOff.replace("{price}", ctx.data.addons?.gh_expenses?.price ?? "")}
      addon="gh_expenses"
      ctx={ctx}
      on={ctx.pos ? true : undefined}
      extra={
        on && (
          <button type="button" className="md-btn md-btn-primary" onClick={() => setEdit({})} disabled={readOnly}>
            <Plus size={16} /> {t.exAdd}
          </button>
        )
      }
    />
  );
  if (!on)
    return (
      <div className="rs-col">
        {hero}
        <Perks ctx={ctx} addon="gh_expenses" />
      </div>
    );
  const max = pf ? Math.max(1, ...pf.series.map((s) => Math.max(s.income, s.expenses))) : 1;
  const catMax = ex ? Math.max(1, ...Object.values(ex.by_category)) : 1;
  return (
    <div className="rs-col">
      {hero}
      <section className="panel-card">
        <div className="at-ro-head">
          <div className="at-ro-week">
            <button type="button" className="md-icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="-1">
              <ChevronLeft size={18} />
            </button>
            <b>{month === monthNow() ? t.thisMonth : monthLabel(month, lang)}</b>
            <button type="button" className="md-icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthNow()} aria-label="+1">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        {pf && (
          <div className="at-tiles gh-kpis ghex-kpis">
            <div className="at-tile t-blue">
              <b>{money(pf.income, cur)}</b>
              <small>{t.exIncome}</small>
            </div>
            <div className="at-tile t-bad">
              <b>{money(pf.expenses, cur)}</b>
              <small>{t.exOut}</small>
            </div>
            <div className={`at-tile ${pf.profit >= 0 ? "t-ok" : "t-bad"}`}>
              <b>{signed(pf.profit, cur)}</b>
              <small>
                {t.exProfit}
                {pf.income > 0 ? ` · ${t.exMargin.replace("{n}", pf.margin)}` : ""}
              </small>
            </div>
          </div>
        )}
      </section>
      {!ex || !pf ? (
        <ListSkeleton rows={4} />
      ) : (
        <>
          <div className="gh-cols">
            <section className="panel-card">
              <h3 style={{ marginTop: 0 }}>{t.exMonths}</h3>
              <div className="ghex-chart">
                {pf.series.map((s) => (
                  <div key={s.month} className="ghex-col" title={`${monthLabel(s.month, lang)} · ${t.exIncome} ${money(s.income, cur)} · ${t.exOut} ${money(s.expenses, cur)} · ${t.exProfit} ${signed(s.profit, cur)}`}>
                    <div className="ghex-bars">
                      <i className="in" style={{ height: `${Math.max(2, (s.income / max) * 100)}%` }} />
                      <i className="out" style={{ height: `${Math.max(2, (s.expenses / max) * 100)}%` }} />
                    </div>
                    <small className={s.profit < 0 ? "neg" : ""}>{signed(s.profit, cur)}</small>
                    <span>{monthLabel(s.month, lang, false)}</span>
                  </div>
                ))}
              </div>
              <div className="ghex-legend">
                <span>
                  <i className="in" /> {t.exIncome}
                </span>
                <span>
                  <i className="out" /> {t.exOut}
                </span>
              </div>
            </section>
            <section className="panel-card gh-list">
              <h3>{t.exByCat}</h3>
              {!Object.keys(ex.by_category).length && <p className="rs-muted">—</p>}
              {Object.entries(ex.by_category)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <div key={k} className="ghex-cat">
                    <span>
                      {CAT_ICON[k]} {t.cats[k]}
                    </span>
                    <b>{money(v, cur)}</b>
                    <i style={{ width: `${(v / catMax) * 100}%` }} />
                  </div>
                ))}
            </section>
          </div>
          <section className="panel-card gh-list">
            <h3>
              {t.exOut} · {money(ex.total, cur)}
            </h3>
            {!ex.rows.length ? (
              <p className="rs-muted">{t.exNone}</p>
            ) : (
              ex.rows.map((x) => (
                <button key={x._id} type="button" className="ghex-row" onClick={() => setEdit(x)} disabled={readOnly}>
                  <span className="ghex-ic" aria-hidden="true">
                    {CAT_ICON[x.category]}
                  </span>
                  <span className="ghex-main">
                    <b>{t.cats[x.category]}</b>
                    <small className="rs-muted">{[fmtDay(x.day, lang, { weekday: "short", day: "numeric", month: "short" }), t.exMethods[x.method], x.note, x.by].filter(Boolean).join(" · ")}</small>
                  </span>
                  <b className="ghex-amt">−{money(x.amount, cur)}</b>
                </button>
              ))
            )}
          </section>
        </>
      )}
      {edit && (
        <ExpenseModal
          ctx={ctx}
          row={edit._id ? edit : null}
          cats={ex?.categories || ["salary", "electricity", "water", "internet", "supplies", "laundry", "repair", "food", "rent", "tax", "marketing", "commission", "other"]}
          onClose={() => setEdit(null)}
          onDone={() => {
            setEdit(null);
            ctx.notify({ type: "success", text: t.saved });
            load();
          }}
        />
      )}
    </div>
  );
}
