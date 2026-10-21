import { useCallback, useEffect, useState } from "react";
import { Ban, Download, ExternalLink, History, Lock, PackagePlus, Printer, ReceiptText, WifiOff } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { Field } from "../restaurant/parts";
import { ReceiptView, printReceipt } from "../../../pos/mart/receipt";
import CoinIcon from "../../../components/CoinIcon";
import { fmtDay, fmtDayTime, fmtTime, methodName, money, printOf, todayKH } from "./text";

function useLoad(fn, deps) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    return fn()
      .then((r) => setData(r.data))
      .catch((e) => {
        setData(null);
        setError(e);
      });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);
  return [data, load, error];
}

// free: the last 30 days; "Full report history" (mart_history, yearly) shows everything
const sinceOf = (ctx) => {
  const n = ctx.pos ? null : ctx.data.limits?.history_days;
  return n ? new Date(Date.parse(`${todayKH()}T00:00:00Z`) - (n - 1) * 86400000).toISOString().slice(0, 10) : null;
};
function HistoryNote({ ctx }) {
  const { m, lang } = ctx;
  const since = sinceOf(ctx);
  if (!since) return null;
  const a = ctx.data.addons?.mart_history;
  return (
    <div className="at-mgr-note mt-hist">
      <History size={16} />
      <span>{m.historyNote.replace("{n}", ctx.data.limits.history_days).replace("{date}", fmtDay(since, lang))}</span>
      <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy?.({ addon: "mart_history" })} disabled={ctx.readOnly}>
        <CoinIcon size={14} /> {m.unlock.replace("{coins}", a?.price ?? 35)} {m.perYear}
      </button>
    </div>
  );
}

function Kpis({ m, t, cur }) {
  return (
    <div className="at-tiles mt-kpis">
      <div className="at-tile t-blue">
        <b>{money(t.sales, cur)}</b>
        <small>{m.todaySales}</small>
      </div>
      <div className="at-tile">
        <b>{t.count}</b>
        <small>{m.receipts}</small>
      </div>
      <div className="at-tile">
        <b>{money(t.avg, cur)}</b>
        <small>{m.avgSale}</small>
      </div>
      <div className={`at-tile ${t.voids ? "t-warn" : ""}`}>
        <b>{t.voids}</b>
        <small>{m.voids}</small>
      </div>
    </div>
  );
}

function Methods({ m, by, cur }) {
  const list = Object.entries(by || {}).sort((a, b) => b[1] - a[1]);
  const all = list.reduce((a, [, v]) => a + v, 0) || 1;
  if (!list.length) return null;
  return (
    <div className="mt-bars">
      {list.map(([k, v]) => (
        <div key={k} className="mt-bar">
          <span>{methodName(m, k)}</span>
          <i style={{ width: `${Math.max(4, (v / all) * 100)}%` }} />
          <b>{money(v, cur)}</b>
        </div>
      ))}
    </div>
  );
}

export function SaleRow({ ctx, s, onOpen }) {
  const { m, lang } = ctx;
  return (
    <button type="button" className={`mt-sale ${s.status === "void" ? "void" : ""}`} onClick={() => onOpen(s)}>
      <span className="mt-sale-time">{fmtTime(s.at, lang)}</span>
      <span className="mt-sale-text">
        <b>
          {s.no || "—"} · {(s.items.length === 1 ? m.oneItem : m.nItems).replace("{n}", s.items.length)}
        </b>
        <small>
          {methodName(m, s.method, s.method_name)}
          {s.by ? ` · ${s.by}` : ""}
          {s.status === "void" ? ` · ${m.voided}` : ""}
          {s.offline && s.pending ? " · ⏳" : ""}
        </small>
      </span>
      <b className="mt-sale-total">{money(s.total, s.currency || ctx.cur)}</b>
    </button>
  );
}

// one receipt: print, and void (owner / manager)
export function SaleModal({ ctx, sale, onClose, onChanged }) {
  const { m, lang } = ctx;
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const canVoid = sale.status === "paid" && !ctx.readOnly && ctx.role !== "cashier";
  const pr = printOf(ctx);
  const doVoid = async () => {
    setBusy(true);
    try {
      await ctx.api.voidSale(ctx.id, sale._id, reason);
      ctx.notify({ type: "success", text: m.voided });
      onChanged?.();
      onClose();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`${m.receipt} ${sale.no || ""}`}
      onClose={onClose}
      busy={busy}
      footer={
        voiding ? (
          <>
            <button type="button" className="md-btn md-btn-ghost" onClick={() => setVoiding(false)} disabled={busy}>
              {m.cancel}
            </button>
            <button type="button" className="md-btn md-btn-danger" onClick={doVoid} disabled={busy}>
              <Ban size={15} /> {m.voidBtn}
            </button>
          </>
        ) : (
          <>
            {canVoid && (
              <button type="button" className="md-btn md-btn-ghost sa-danger-text" style={{ marginRight: "auto" }} onClick={() => setVoiding(true)}>
                <Ban size={15} /> {m.voidBtn}
              </button>
            )}
            {pr.on ? (
              <button type="button" className="md-btn md-btn-primary" onClick={() => printReceipt({ sale, shop: ctx.shop, m, lang, size: pr.size, theme: pr.theme })}>
                <Printer size={15} /> {m.print}
              </button>
            ) : (
              <button type="button" className="md-btn md-btn-ghost" onClick={() => (ctx.askBuy ? ctx.askBuy({ addon: "mart_printer" }) : ctx.notify({ type: "error", text: m.printLocked }))} title={m.printLocked}>
                <Lock size={15} /> {m.print}
              </button>
            )}
          </>
        )
      }
    >
      {voiding ? (
        <div className="md-fields">
          <p style={{ margin: 0 }}>
            <b>{m.voidTitle}</b>
            <br />
            <small className="rs-muted">{m.voidSub}</small>
          </p>
          <Field label={m.voidReason} htmlFor="mt-void">
            <input id="mt-void" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </Field>
        </div>
      ) : (
        <>
          <ReceiptView sale={sale} shop={ctx.shop} m={m} lang={lang} theme={pr.theme} size={pr.size} />
          {sale.status === "void" && (
            <p className="rs-muted mt-void-note">
              {m.voidedBy.replace("{name}", sale.void_by || "")}
              {sale.void_reason ? ` · ${sale.void_reason}` : ""}
            </p>
          )}
          {sale.offline && (
            <p className="rs-muted mt-void-note">
              <WifiOff size={13} /> {m.offlineSale}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}

export function TodayTab({ ctx }) {
  const { m, cur } = ctx;
  const day = todayKH();
  const [rep, loadRep] = useLoad(() => ctx.api.report(ctx.id, { day }), [ctx.id]);
  const [list, loadList] = useLoad(() => ctx.api.sales(ctx.id, { day }), [ctx.id]);
  const [open, setOpen] = useState(null);
  const empty = !ctx.pos && ctx.data.counts && !ctx.data.counts.products;
  return (
    <div className="rs-col">
      {empty && (
        <section className="panel-card mt-start">
          <PackagePlus size={26} />
          <span>{m.setupFirst}</span>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => ctx.go("products")}>
            {m.addProducts}
          </button>
        </section>
      )}
      <section className="panel-card">
        <div className="pe-list-head">
          <h2 style={{ margin: 0 }}>{m.tabs.today}</h2>
          {!ctx.pos && (
            <a className="md-btn md-btn-ghost sa-btn-sm" href="/pos/mini-mart" target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> {m.openPos}
            </a>
          )}
        </div>
        {rep ? <Kpis m={m} t={rep.totals} cur={cur} /> : <p className="rs-muted">…</p>}
        {rep && <Methods m={m} by={rep.totals.by_method} cur={cur} />}
      </section>
      <div className="mt-two">
        <section className="panel-card">
          <h3 className="mt-h">{m.recent}</h3>
          {!list ? <p className="rs-muted">…</p> : !list.rows.length ? <p className="rs-muted">{m.noSales}</p> : list.rows.slice(0, 12).map((s) => <SaleRow key={s._id} ctx={ctx} s={s} onOpen={setOpen} />)}
        </section>
        <section className="panel-card">
          <h3 className="mt-h">{m.topProducts}</h3>
          <TopList ctx={ctx} rows={rep?.top} />
        </section>
      </div>
      {open && (
        <SaleModal
          ctx={ctx}
          sale={open}
          onClose={() => setOpen(null)}
          onChanged={() => {
            loadRep();
            loadList();
          }}
        />
      )}
    </div>
  );
}

function TopList({ ctx, rows }) {
  const { m, cur } = ctx;
  if (!rows) return <p className="rs-muted">…</p>;
  if (!rows.length) return <p className="rs-muted">{m.noTop}</p>;
  const max = rows[0].value || 1;
  return (
    <div className="mt-top">
      {rows.slice(0, 10).map((t, i) => (
        <div key={i} className="mt-top-row">
          <span className="mt-top-n">{i + 1}</span>
          <span className="mt-top-text">
            <b>{t.name}</b>
            <small>{m.sold.replace("{n}", t.qty)}</small>
            <i style={{ width: `${Math.max(3, (t.value / max) * 100)}%` }} />
          </span>
          <b>{money(t.value, cur)}</b>
        </div>
      ))}
    </div>
  );
}

// quick ranges for the sales table
const addDaysKH = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const RANGES = {
  today: () => [todayKH(), todayKH()],
  yesterday: () => [addDaysKH(todayKH(), -1), addDaysKH(todayKH(), -1)],
  week: () => [addDaysKH(todayKH(), -6), todayKH()],
  month: () => [`${todayKH().slice(0, 7)}-01`, todayKH()],
};
const csvCell = (v) => {
  const t = String(v ?? "");
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

// Sales: every receipt of a day or a range, with all its details; open one to see / print / void it
export function SalesTab({ ctx }) {
  const { m, cur, lang } = ctx;
  const [range, setRange] = useState("today");
  const [from, setFrom] = useState(todayKH());
  const [to, setTo] = useState(todayKH());
  const since = sinceOf(ctx);
  const params = ctx.pos ? { day: todayKH() } : from === to ? { day: from } : { from, to };
  const [list, load, listErr] = useLoad(() => ctx.api.sales(ctx.id, params), [ctx.id, from, to]);
  const [open, setOpen] = useState(null);
  const pick = (k) => {
    const [a, b] = RANGES[k]();
    setRange(k);
    setFrom(since && a < since ? since : a);
    setTo(b);
  };
  const multi = from !== to;
  const rows = list?.rows || [];
  const hasDisc = rows.some((x) => x.discount > 0);
  const names = (sale) => sale.items.map((l) => l.name).join(", ");
  const paidOf = (sale) =>
    sale.method === "cash" ? [sale.paid_usd > 0 && money(sale.paid_usd, "USD"), sale.paid_khr > 0 && `${Math.round(sale.paid_khr).toLocaleString("en-US")}៛`].filter(Boolean).join(" + ") : sale.method === "debt" ? sale.debtor_name || "" : "";
  const exportCsv = () => {
    const head = [m.colNo, m.day, m.colTime, m.colCashier, m.colPay, m.colItems, m.subtotal, m.discount, m.colTotal, m.received, m.change, m.colStatus];
    const lines = rows.map((x) => [
      x.no,
      new Date(new Date(x.at).getTime() + 7 * 3600000).toISOString().slice(0, 10),
      fmtTime(x.at, "en"),
      x.by,
      methodName(m, x.method, x.method_name) + (x.debtor_name ? ` (${x.debtor_name})` : ""),
      x.items.map((l) => `${l.qty}× ${l.name}`).join("; "),
      x.subtotal,
      x.discount,
      x.total,
      paidOf(x),
      x.change,
      x.status === "void" ? m.voided : m.statusPaid,
    ]);
    const csv = `\uFEFF${[head, ...lines].map((r) => r.map(csvCell).join(",")).join("\n")}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `sales-${from}${multi ? `-${to}` : ""}.csv`;
    a.click();
  };
  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="st-head">
          <div>
            <h2 style={{ margin: 0 }}>{m.tabs.sales}</h2>
            <small className="rs-muted">
              {fmtDay(from, lang)}
              {multi ? ` → ${fmtDay(to, lang)}` : ""}
              {list?.limited ? ` · ${m.historyNote.split(".")[0]}` : ""}
            </small>
          </div>
          {!ctx.pos && (
            <div className="st-range">
              <div className="at-seg">
                {Object.keys(RANGES).map((k) => (
                  <button key={k} type="button" className={range === k ? "on" : ""} onClick={() => pick(k)}>
                    {m.ranges[k]}
                  </button>
                ))}
              </div>
              <input
                type="date"
                className="mt-date"
                value={from}
                min={since || undefined}
                max={to}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setRange("");
                  setFrom(e.target.value);
                }}
                aria-label={m.day}
              />
              <span className="rs-muted">→</span>
              <input
                type="date"
                className="mt-date"
                value={to}
                min={from}
                max={todayKH()}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setRange("");
                  setTo(e.target.value);
                }}
                aria-label={m.day}
              />
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={exportCsv} disabled={!rows.length}>
                <Download size={14} /> {m.exportCsv}
              </button>
            </div>
          )}
        </div>
        {!ctx.pos && <HistoryNote ctx={ctx} />}
        {list && <Kpis m={{ ...m, todaySales: m.total }} t={list.totals} cur={cur} />}
        {list && <Methods m={m} by={list.totals.by_method} cur={cur} />}
      </section>
      <section className="panel-card">
        {!list ? (
          <p className="rs-muted">{listErr ? (listErr.status === 402 ? "" : listErr.message) : "…"}</p>
        ) : !rows.length ? (
          <div className="mt-empty">
            <ReceiptText size={30} />
            <p className="rs-muted">{m.noSales}</p>
          </div>
        ) : (
          <div className="st-wrap">
            <table className="st-table">
              <thead>
                <tr>
                  <th>{m.colNo}</th>
                  <th>{m.colTime}</th>
                  <th>{m.colCashier}</th>
                  <th className="st-items">{m.colItems}</th>
                  <th>{m.colPay}</th>
                  {hasDisc && <th className="st-num">{m.discount}</th>}
                  <th className="st-num">{m.colTotal}</th>
                  <th>{m.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => {
                  const qty = x.items.reduce((a, l) => a + l.qty, 0);
                  return (
                    <tr key={x._id} className={x.status === "void" ? "void" : ""} onClick={() => setOpen(x)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(x)}>
                      <td>
                        <b className="st-no">{x.no || "—"}</b>
                        {x.offline && <WifiOff size={12} className="st-off" title={m.offlineSale} />}
                      </td>
                      <td className="st-time">{multi ? fmtDayTime(x.at, lang) : fmtTime(x.at, lang)}</td>
                      <td>{x.by || "—"}</td>
                      <td className="st-items">
                        <b>{(x.items.length === 1 ? m.oneItem : m.nItems).replace("{n}", x.items.length)}</b>
                        <small>
                          {qty !== x.items.length ? `${Math.round(qty * 1000) / 1000} ${m.qty.toLowerCase()} · ` : ""}
                          {names(x)}
                        </small>
                      </td>
                      <td>
                        <em className={`st-pay p-${x.method}`}>{methodName(m, x.method, x.method_name)}</em>
                        <small className="st-sub">
                          {paidOf(x)}
                          {x.method === "cash" && x.change > 0 ? ` · ${m.change} ${cur === "USD" ? `${Math.round(x.change_khr).toLocaleString("en-US")}៛` : money(x.change, cur)}` : ""}
                        </small>
                      </td>
                      {hasDisc && <td className="st-num">{x.discount > 0 ? `−${money(x.discount, cur)}` : "—"}</td>}
                      <td className="st-num st-total">{money(x.total, x.currency || cur)}</td>
                      <td>{x.status === "void" ? <em className="ms-pill s-out">{m.voided}</em> : <em className="ms-pill">{m.statusPaid}</em>}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>
                    {m.receipts}: <b>{list.totals.count}</b>
                    {list.totals.voids ? ` · ${m.voids}: ${list.totals.voids}` : ""}
                  </td>
                  {hasDisc && <td className="st-num">{list.totals.discount > 0 ? `−${money(list.totals.discount, cur)}` : ""}</td>}
                  <td className="st-num st-total">{money(list.totals.sales, cur)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
      {list && rows.length > 0 && <SalesInsights ctx={ctx} params={params} from={from} to={to} />}
      {open && <SaleModal ctx={ctx} sale={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}

// under the sales table: sales per hour / per day, best sellers, by cashier (what the old Report page showed)
function SalesInsights({ ctx, params, from, to }) {
  const { m, cur, lang } = ctx;
  const [rep] = useLoad(() => ctx.api.report(ctx.id, params), [ctx.id, from, to]);
  // every hour of the day / every day of the range, so one busy hour is not one giant bar
  const series = (() => {
    if (!rep) return [];
    const got = new Map(rep.series.map((x) => [x.key, x]));
    const keys = [];
    if (rep.kind === "day") {
      const hrs = rep.series.map((x) => Number(x.key));
      for (let h = Math.min(7, ...hrs); h <= Math.max(21, ...hrs); h++) keys.push(String(h).padStart(2, "0"));
    } else {
      for (let d = rep.from; d < rep.to && d <= todayKH(); d = new Date(Date.parse(`${d}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)) keys.push(d);
    }
    return keys.map((k) => got.get(k) || { key: k, sales: 0, count: 0 });
  })();
  const max = Math.max(1, ...series.map((x) => x.sales));
  if (!rep || !rep.totals.count) return null;
  return (
    <>
      {series.length > 1 && (
        <section className="panel-card">
          <h3 className="mt-h">{rep.kind === "day" ? m.perHour : m.perDay}</h3>
          <div className="gh-chart mt-chart">
            {series.map((x) => (
              <span key={x.key} title={`${x.key} · ${money(x.sales, cur)}`}>
                <i style={{ height: `${Math.max(2, (x.sales / max) * 100)}%` }} className={x.sales === max ? "hi" : ""} />
                <small>{rep.kind === "day" ? `${x.key}h` : fmtDay(x.key, lang).split(" ")[0]}</small>
              </span>
            ))}
          </div>
        </section>
      )}
      <div className="mt-two">
        <section className="panel-card">
          <h3 className="mt-h">{m.topProducts}</h3>
          <TopList ctx={ctx} rows={rep.top} />
        </section>
        <section className="panel-card">
          <h3 className="mt-h">{m.byCashier}</h3>
          {rep.by_staff.map((s) => (
            <div key={s.name} className="gh-row">
              <span className="gh-row-text" style={{ flex: 1 }}>
                <b>{s.name}</b>
                <small>
                  {s.count} {m.receipts.toLowerCase()}
                </small>
              </span>
              <b>{money(s.sales, cur)}</b>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
