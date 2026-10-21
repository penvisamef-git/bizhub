import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownRight, ArrowUpRight, BarChart3, Ban, ChevronLeft, ChevronRight, Download, History, Printer, ReceiptText, RefreshCw, Search, ShoppingBasket, TrendingUp, Users, Wallet, X } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { Receipt, ReceiptPaper } from "../../../pos/receipt";
import { useReportText } from "./report-text";

const TZ = 7; // Cambodia
const fmtMoney = (n, c) => (c === "KHR" ? `${new Intl.NumberFormat("en-US").format(Math.round(n || 0))}៛` : `$${(Number(n) || 0).toFixed(2)}`);
const fmtNum = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const localToday = () => new Date(Date.now() + TZ * 3600000).toISOString().slice(0, 10);
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const nameOf = (x, lang) => (lang === "km" ? x?.name_km || x?.name_en : x?.name_en || x?.name_km) || "";

// the days of a preset, in Cambodia time
function presetRange(key, today) {
  const [y, m] = today.split("-").map(Number);
  const first = (yy, mm) => `${yy}-${String(mm).padStart(2, "0")}-01`;
  if (key === "yesterday") return { from: addDays(today, -1), to: addDays(today, -1) };
  if (key === "d7") return { from: addDays(today, -6), to: today };
  if (key === "d30") return { from: addDays(today, -29), to: today };
  if (key === "month") return { from: first(y, m), to: today };
  if (key === "lastMonth") {
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    return { from: first(py, pm), to: addDays(first(y, m), -1) };
  }
  return { from: today, to: today };
}

// Reports: sales of every POS, by day / hour / method / item / category / staff, all bills, shifts
export default function ReportsTab({ ctx }) {
  const R = useReportText();
  const { lang } = ctx;
  const [view, setView] = useState("overview");
  const [preset, setPreset] = useState("today");
  const [range, setRange] = useState(() => presetRange("today", localToday()));
  const fullHistory = ctx.addonOn("rest_history");

  const pick = (key) => {
    setPreset(key);
    if (key !== "custom") setRange(presetRange(key, localToday()));
  };

  return (
    <div className="rs-col rp">
      <section className="panel-card rp-head">
        <span className="pt-ic">
          <BarChart3 size={26} />
        </span>
        <div>
          <h2>{R.title}</h2>
          <p className="rs-muted">{R.sub}</p>
        </div>
      </section>

      <div className="rp-bar">
        <div className="rp-views" role="tablist">
          {Object.entries(R.views).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} className={view === k ? "on" : ""} onClick={() => setView(k)}>
              {label}
            </button>
          ))}
        </div>
        {view !== "shifts" && (
          <div className="rp-range">
            <select value={preset} onChange={(e) => pick(e.target.value)} aria-label={R.ranges.custom}>
              {Object.entries(R.ranges).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            {preset === "custom" && (
              <>
                <input type="date" value={range.from} max={localToday()} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} aria-label={R.from} />
                <span className="rs-muted">→</span>
                <input type="date" value={range.to} max={localToday()} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} aria-label={R.to} />
              </>
            )}
          </div>
        )}
      </div>

      {!fullHistory && view !== "shifts" && (
        <div className="rp-history">
          <History size={17} />
          <span>{R.historyFree.replace("{n}", 30)}</span>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy("rest_history")} disabled={ctx.readOnly}>
            {R.getHistory}
          </button>
        </div>
      )}

      {view === "overview" && <Overview ctx={ctx} range={range} R={R} lang={lang} />}
      {view === "invoices" && <Invoices ctx={ctx} range={range} R={R} lang={lang} />}
      {view === "shifts" && <Shifts ctx={ctx} R={R} lang={lang} />}
    </div>
  );
}

// ---------------- overview ----------------
function Overview({ ctx, range, R, lang }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allItems, setAllItems] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return restaurantService.report
      .get(ctx.id, range.from, range.to)
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message || R.loadFail))
      .finally(() => setLoading(false));
  }, [ctx.id, range.from, range.to, R.loadFail]);
  useEffect(() => {
    load();
  }, [load]);

  if (!data) return error ? <LoadError text={error} onRetry={load} R={R} /> : <ListSkeleton rows={5} />;
  const rep = data.report;
  const c = data.money?.currency || "USD";
  const m = (v) => fmtMoney(v, c);
  const change = data.prev && data.prev.sales > 0 ? ((rep.sales - data.prev.sales) / data.prev.sales) * 100 : null;
  const items = allItems ? rep.by_item : rep.by_item.slice(0, 10);
  const maxQty = Math.max(1, ...rep.by_item.map((x) => x.qty));
  const methodsTotal = rep.by_method.reduce((a, x) => a + Math.max(0, x.value), 0) || 1;
  const catsTotal = rep.by_category.reduce((a, x) => a + x.sales, 0) || 1;

  return (
    <div className={`rs-col ${loading ? "rp-loading" : ""}`}>
      {data.history.limited && <div className="md-notice">{R.historyCut.replace("{n}", data.history.free_days)}</div>}
      {rep.truncated && <div className="md-notice md-notice-error">{R.truncated}</div>}

      <div className="rp-kpis">
        <div className="rp-kpi main">
          <span>
            <TrendingUp size={15} /> {R.sales}
          </span>
          <b>{m(rep.sales)}</b>
          {change !== null && (
            <small className={change >= 0 ? "up" : "down"}>
              {change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {(data.range.days === 1 ? R.vsBefore1 : R.vsBefore).replace("{p}", `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`).replace("{n}", data.range.days)}
            </small>
          )}
        </div>
        <Kpi icon={ReceiptText} label={R.bills} value={fmtNum(rep.bills)} />
        <Kpi icon={Wallet} label={R.avg} value={m(rep.avg)} />
        {rep.cost > 0 ? (
          <Kpi icon={TrendingUp} label={R.profit} value={m(rep.profit)} sub={R.profitSub.replace("{p}", rep.sales ? Math.round((rep.profit / (rep.sales - rep.vat || 1)) * 100) : 0)} good />
        ) : (
          <Kpi icon={Users} label={R.guests} value={fmtNum(rep.guests)} />
        )}
        <Kpi icon={ArrowDownRight} label={R.discounts} value={m(rep.discounts)} />
        <Kpi icon={Ban} label={R.cancelled} value={fmtNum(rep.void_orders)} sub={rep.void_orders ? R.cancelledSub.replace("{v}", m(rep.void_value)) : ""} warn={rep.void_orders > 0} />
        {rep.cost > 0 ? <Kpi icon={ShoppingBasket} label={R.costSold} value={m(rep.cost)} sub={R.itemsSoldN.replace("{n}", fmtNum(rep.items))} /> : <Kpi icon={ShoppingBasket} label={R.itemsSold} value={fmtNum(rep.items)} />}
      </div>

      {rep.bills === 0 && rep.void_orders === 0 ? (
        <section className="panel-card rp-empty">
          <BarChart3 size={34} />
          <b>{R.empty}</b>
          <p className="rs-muted">{R.emptySub}</p>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("pos")}>
            {R.openPos}
          </button>
        </section>
      ) : (
        <>
          <section className="panel-card">
            <div className="pe-list-head">
              <h2 style={{ margin: 0 }}>{data.range.days === 1 ? R.salesByHour : R.salesByDay}</h2>
              <button type="button" className="md-icon-btn" onClick={load} aria-label={R.refresh}>
                <RefreshCw size={16} className={loading ? "md-spin" : ""} />
              </button>
            </div>
            {data.range.days === 1 ? <HourChart hours={rep.by_hour} m={m} /> : <DayChart days={rep.by_day} from={data.range.from} to={data.range.to} m={m} lang={lang} />}
            {(rep.vat > 0 || rep.service > 0) && <p className="rs-muted rp-taxes">{R.taxes.replace("{v}", m(rep.vat)).replace("{s}", m(rep.service))}</p>}
          </section>

          <div className="rp-grid">
            <section className="panel-card">
              <h2>{R.methods}</h2>
              {rep.by_method.map((x) => (
                <Bar key={x.name} label={x.name} sub={`×${x.count}`} value={m(x.value)} pct={(Math.max(0, x.value) / methodsTotal) * 100} />
              ))}
            </section>
            <section className="panel-card">
              <h2>{R.types}</h2>
              {[
                ["dine_in", R.dineIn],
                ["takeaway", R.takeaway],
              ].map(([k, label]) => (
                <Bar key={k} label={label} sub={R.billsN(rep.by_type[k].bills)} value={m(rep.by_type[k].sales)} pct={rep.sales ? (rep.by_type[k].sales / rep.sales) * 100 : 0} />
              ))}
            </section>
          </div>

          <section className="panel-card">
            <h2>{R.items}</h2>
            <div className="pt-table-wrap">
              <table className="pt-table rp-items">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{R.items}</th>
                    <th className="num">{R.qty}</th>
                    <th className="num">{R.amount}</th>
                    {rep.cost > 0 && <th className="num hide-sm">{R.profit}</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((x, i) => (
                    <tr key={x.key}>
                      <td className="rs-muted">{i + 1}</td>
                      <td>
                        <div className="rp-item-name">
                          <span>
                            {nameOf(x, lang)}
                            {x.size ? <em> · {x.size}</em> : null}
                          </span>
                          <i style={{ "--w": `${(x.qty / maxQty) * 100}%` }} />
                        </div>
                      </td>
                      <td className="num">{fmtNum(x.qty)}</td>
                      <td className="num">{m(x.sales)}</td>
                      {rep.cost > 0 && <td className={`num hide-sm ${x.profit < 0 ? "neg" : ""}`}>{x.cost ? m(x.profit) : "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rep.by_item.length > 10 && (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm rp-more" onClick={() => setAllItems(!allItems)}>
                {allItems ? R.showLess : R.showAll.replace("{n}", rep.by_item.length)}
              </button>
            )}
          </section>

          {rep.by_promo?.length > 0 && (
            <section className="panel-card">
              <h2>{R.promos}</h2>
              {rep.by_promo.map((x) => (
                <Bar key={x.id} label={x.id === "manual" ? R.manualDisc : x.name || R.promo} sub={R.promoUsed.replace("{n}", fmtNum(x.qty))} value={`−${m(x.off)}`} pct={rep.discounts ? (x.off / rep.discounts) * 100 : 0} />
              ))}
            </section>
          )}

          <div className="rp-grid">
            <section className="panel-card">
              <h2>{R.categories}</h2>
              {rep.by_category.map((x) => (
                <Bar key={x.category_id || "-"} label={nameOf(x, lang) || R.noCategory} sub={`×${fmtNum(x.qty)}`} value={m(x.sales)} pct={(x.sales / catsTotal) * 100} color={x.color} />
              ))}
            </section>
            <section className="panel-card">
              <h2>{R.staff}</h2>
              {rep.by_staff.map((x) => (
                <Bar key={x.name} label={x.name} sub={R.billsN(x.bills)} value={m(x.sales)} pct={rep.sales ? (x.sales / rep.sales) * 100 : 0} />
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, warn, good }) {
  return (
    <div className={`rp-kpi ${warn ? "warn" : ""} ${good ? "good" : ""}`}>
      <span>
        <Icon size={15} /> {label}
      </span>
      <b>{value}</b>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

function Bar({ label, sub, value, pct, color }) {
  return (
    <div className="rp-bar-row">
      <span className="rp-bar-label">
        {label} {sub && <small>{sub}</small>}
      </span>
      <b>{value}</b>
      <small className="rp-pct">{Math.round(pct)}%</small>
      <i style={{ "--w": `${Math.max(0, Math.min(100, pct))}%`, ...(color ? { "--bar-c": color } : {}) }} />
    </div>
  );
}

function DayChart({ days, from, to, m, lang }) {
  // every day of the range, even the ones without sales
  const all = [];
  const byDay = new Map(days.map((d) => [d.day, d]));
  for (let d = from; d <= to && all.length < 400; d = addDays(d, 1)) all.push(byDay.get(d) || { day: d, sales: 0, bills: 0 });
  const max = Math.max(1, ...all.map((d) => d.sales));
  const fmtDay = (d) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const every = Math.ceil(all.length / 12);
  return (
    <div className="rp-chart" style={{ "--n": all.length }}>
      {all.map((d, i) => (
        <div key={d.day} className="rp-col" title={`${fmtDay(d.day)} · ${m(d.sales)} · ${d.bills}`}>
          <span className="rp-col-bar" style={{ "--h": `${(d.sales / max) * 100}%` }} />
          <small>{i % every === 0 ? fmtDay(d.day) : ""}</small>
        </div>
      ))}
    </div>
  );
}

function HourChart({ hours, m }) {
  const used = hours.map((v, h) => [h, v]).filter(([, v]) => v > 0);
  const lo = used.length ? Math.min(7, used[0][0]) : 7;
  const hi = used.length ? Math.max(21, used.at(-1)[0]) : 21;
  const list = hours.slice(lo, hi + 1).map((v, i) => [lo + i, v]);
  const max = Math.max(1, ...list.map(([, v]) => v));
  return (
    <div className="rp-chart" style={{ "--n": list.length }}>
      {list.map(([h, v]) => (
        <div key={h} className="rp-col" title={`${String(h).padStart(2, "0")}:00 · ${m(v)}`}>
          <span className="rp-col-bar" style={{ "--h": `${(v / max) * 100}%` }} />
          <small>{h % 2 === 0 ? `${h}h` : ""}</small>
        </div>
      ))}
    </div>
  );
}

function LoadError({ text, onRetry, R }) {
  return (
    <div className="panel-card sa-empty-state">
      <p>{text}</p>
      <button type="button" className="md-btn md-btn-primary" onClick={onRetry}>
        {R.refresh}
      </button>
    </div>
  );
}

// ---------------- invoices ----------------
function Invoices({ ctx, range, R, lang }) {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null); // bill id
  const [downloading, setDownloading] = useState(false);

  // typing waits a moment before searching
  useEffect(() => {
    const timer = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => setPage(1), [status, query, range.from, range.to]);
  const params = useMemo(() => ({ from: range.from, to: range.to, status, q: query, page }), [range.from, range.to, status, query, page]);
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return restaurantService.report
      .invoices(ctx.id, params)
      .then(setData)
      .catch((e) => setError(e.message || R.loadFail))
      .finally(() => setLoading(false));
  }, [ctx.id, params, R.loadFail]);
  useEffect(() => {
    load();
  }, [load]);

  const time = (d) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(d)) : "—");
  const c = ctx.settings?.currency || "USD";
  const pg = data?.pagination;

  return (
    <section className="panel-card">
      <div className="rp-inv-tools">
        <div className="rp-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={R.search} aria-label={R.search} />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Clear">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="rp-views small">
          {["all", "paid", "void", "open"].map((k) => (
            <button key={k} type="button" className={status === k ? "on" : ""} onClick={() => setStatus(k)}>
              {R[k]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="md-btn md-btn-ghost sa-btn-sm"
          disabled={downloading || !data?.data?.length}
          onClick={async () => {
            setDownloading(true);
            try {
              await restaurantService.report.csv(ctx.id, { from: params.from, to: params.to, status, q: query });
            } catch (e) {
              ctx.notify({ type: "error", text: e.message });
            } finally {
              setDownloading(false);
            }
          }}
        >
          <Download size={15} /> {R.csv}
        </button>
      </div>
      {data?.history?.limited && <div className="md-notice">{R.historyCut.replace("{n}", 30)}</div>}
      {error && !data && <LoadError text={error} onRetry={load} R={R} />}
      {!data && !error ? (
        <ListSkeleton rows={6} bare />
      ) : data && data.data.length === 0 ? (
        <p className="rs-muted rp-none">{R.noBills}</p>
      ) : (
        data && (
          <div className={`pt-table-wrap ${loading ? "rp-loading" : ""}`}>
            <table className="pt-table rp-inv">
              <thead>
                <tr>
                  <th>{R.colNo}</th>
                  <th>{R.colTime}</th>
                  <th>{R.colWhere}</th>
                  <th className="hide-sm">{R.colStaff}</th>
                  <th className="hide-sm">{R.colPay}</th>
                  <th className="num">{R.colTotal}</th>
                  <th>{R.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((o) => (
                  <tr key={o._id} onClick={() => setOpen(o._id)} className="rp-row" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(o._id)}>
                    <td>
                      <b>#{o.number}</b>
                    </td>
                    <td>{time(o.paid_at || o.opened_at)}</td>
                    <td>{o.table_name || R.takeaway}</td>
                    <td className="hide-sm">{o.closed_by || o.opened_by}</td>
                    <td className="hide-sm">{o.methods.join(" + ") || "—"}</td>
                    <td className="num">{fmtMoney(o.total, c)}</td>
                    <td>
                      <span className={`rp-pill s-${o.status}`}>{o.status === "paid" ? R.paid : o.status === "void" ? R.void : R.open}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      {pg && pg.totalPages > 1 && (
        <div className="rp-pager">
          <button type="button" className="md-icon-btn" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label={R.prev}>
            <ChevronLeft size={16} />
          </button>
          <span className="rs-muted">
            {R.page.replace("{p}", pg.currentPage).replace("{n}", pg.totalPages)} · {fmtNum(pg.total)}
          </span>
          <button type="button" className="md-icon-btn" onClick={() => setPage(page + 1)} disabled={page >= pg.totalPages} aria-label={R.next}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      {open && <BillModal ctx={ctx} id={open} R={R} lang={lang} onClose={() => setOpen(null)} />}
    </section>
  );
}

// one bill: the receipt as printed + who / when / where
function BillModal({ ctx, id, R, lang, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    restaurantService.report
      .invoice(ctx.id, id)
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message));
  }, [ctx.id, id]);
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  useEffect(() => {
    if (!printing) return undefined;
    document.body.classList.add("pos-printing");
    const timer = setTimeout(() => window.print(), 150);
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
      document.body.classList.remove("pos-printing");
    };
  }, [printing]);

  const o = data?.order;
  const time = (d) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Phnom_Penh" }).format(new Date(d)) : "—");
  const receipt = o && <Receipt order={o} t={R.receipt} paidView={o.status === "paid"} restaurant={data.restaurant} money={data.money} showVoid />;
  const size = data?.restaurant?.receipt?.size === 58 ? 58 : 80;
  // kept inside the page (not moved to <body>) so it gets the dashboard's colours
  return (
    <div className="md-modal-backdrop" onMouseDown={onClose}>
      <div className="md-modal md-modal-wide rp-bill" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={o ? R.bill.replace("{n}", o.number) : ""}>
        <div className="md-modal-header">
          <h3>{o ? R.bill.replace("{n}", o.number) : "…"}</h3>
          <button type="button" className="md-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="md-modal-body">
          {error && <div className="md-form-error">{error}</div>}
          {!o && !error && <ListSkeleton rows={4} bare />}
          {o && (
            <div className="rp-bill-grid">
              <div className="rp-bill-paper">
                <ReceiptPaper size={size}>{receipt}</ReceiptPaper>
              </div>
              <dl className="rp-bill-meta">
                <dt>{R.colStatus}</dt>
                <dd>
                  <span className={`rp-pill s-${o.status}`}>{o.status === "paid" ? R.paid : o.status === "void" ? R.void : R.open}</span>
                </dd>
                <dt>{R.colWhere}</dt>
                <dd>{o.table_name || R.takeaway}</dd>
                <dt>{R.openedBy}</dt>
                <dd>{o.opened_by?.name || "—"}</dd>
                <dt>{R.openedAt}</dt>
                <dd>{time(o.opened_at)}</dd>
                {o.paid_at && (
                  <>
                    <dt>{R.paidAt}</dt>
                    <dd>
                      {time(o.paid_at)} · {o.closed_by?.name}
                    </dd>
                  </>
                )}
                {o.device_name && (
                  <>
                    <dt>{R.device}</dt>
                    <dd>{o.device_name}</dd>
                  </>
                )}
                {o.guests > 0 && (
                  <>
                    <dt>{R.guests}</dt>
                    <dd>{o.guests}</dd>
                  </>
                )}
                {o.void_reason && (
                  <>
                    <dt>{R.reason}</dt>
                    <dd>
                      {o.void_reason} · {o.closed_by?.name}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          )}
        </div>
        <div className="md-modal-footer">
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose}>
            {R.close}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={() => setPrinting(true)} disabled={!o}>
            <Printer size={16} /> {R.print}
          </button>
        </div>
      </div>
      {printing && receipt && createPortal(<div className={`pos-print w${size}`}>{receipt}</div>, document.body)}
    </div>
  );
}

// ---------------- shifts ----------------
function Shifts({ ctx, R, lang }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      restaurantService.pos
        .shifts(ctx.id, page)
        .then(setData)
        .catch((e) => setError(e.message || R.loadFail)),
    [ctx.id, page, R.loadFail],
  );
  useEffect(() => {
    load();
  }, [load]);
  if (!data) return error ? <LoadError text={error} onRetry={load} R={R} /> : <ListSkeleton rows={5} />;
  const c = ctx.settings?.currency || "USD";
  const time = (d) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(d)) : "—");
  const pg = data.pagination;
  return (
    <section className="panel-card">
      <p className="rs-muted" style={{ marginTop: 0 }}>
        {R.shiftsSub}
      </p>
      {data.data.length === 0 ? (
        <p className="rs-muted rp-none">{R.noShifts}</p>
      ) : (
        <div className="pt-table-wrap">
          <table className="pt-table">
            <thead>
              <tr>
                <th>{R.colOpened}</th>
                <th>{R.colClosed}</th>
                <th>{R.colDevice}</th>
                <th>{R.colStaff}</th>
                <th className="num">{R.bills}</th>
                <th className="num">{R.colSales}</th>
                <th className="num">{R.colDiff}</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((s) => {
                const du = (s.counted?.usd || 0) - (s.expected?.usd || 0);
                const dk = (s.counted?.khr || 0) - (s.expected?.khr || 0);
                const closed = s.status === "closed";
                return (
                  <tr key={s._id}>
                    <td>{time(s.opened_at)}</td>
                    <td>{closed ? time(s.closed_at) : <span className="rp-pill s-open">{R.shiftOpen}</span>}</td>
                    <td>{s.device_name || "—"}</td>
                    <td>{s.closed_by?.name || s.opened_by?.name}</td>
                    <td className="num">{closed ? (s.totals?.bills ?? 0) : "—"}</td>
                    <td className="num">{closed ? fmtMoney(s.totals?.sales, c) : "—"}</td>
                    <td className={`num ${du < 0 || dk < 0 ? "neg" : ""}`}>{closed ? `${du >= 0 ? "+" : "−"}${fmtMoney(Math.abs(du), "USD")} · ${dk >= 0 ? "+" : "−"}${fmtMoney(Math.abs(dk), "KHR")}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pg.totalPages > 1 && (
        <div className="rp-pager">
          <button type="button" className="md-icon-btn" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label={R.prev}>
            <ChevronLeft size={16} />
          </button>
          <span className="rs-muted">{R.page.replace("{p}", pg.currentPage).replace("{n}", pg.totalPages)}</span>
          <button type="button" className="md-icon-btn" onClick={() => setPage(page + 1)} disabled={page >= pg.totalPages} aria-label={R.next}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
