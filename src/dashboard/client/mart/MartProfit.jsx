import { useState } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { money } from "./text";
import { useXText } from "./xtext";
import { AddonHead, PeriodBar, addonOn, useLoad, usePeriod } from "./MartGrowKit";

const pct = (v) => `${Math.round(v * 10) / 10}%`;

// Profit report (mart_profit): revenue vs cost, per product and category
export function ProfitTab({ ctx }) {
  const x = useXText();
  const { cur } = ctx;
  const on = addonOn(ctx, "mart_profit");
  const p = usePeriod();
  const [data, , err] = useLoad(ctx, () => (on ? ctx.api.profit(ctx.id, p.params) : Promise.resolve({ data: null })), [on, p.key, p.mode]);
  const [sort, setSort] = useState("profit");
  const head = <AddonHead ctx={ctx} addon="mart_profit" icon={TrendingUp} title={x.prfTitle} sub={x.prfSub} perks={x.prfPerks} />;
  if (!on) return <div className="rs-col">{head}</div>;
  const t = data?.totals;
  const max = data ? Math.max(1, ...data.series.map((s) => Math.max(s.revenue, 0))) : 1;
  const products = data ? [...data.products].sort((a, b) => (sort === "margin" ? b.margin - a.margin : sort === "revenue" ? b.revenue - a.revenue : b.profit - a.profit)) : [];
  return (
    <div className="rs-col">
      {head}
      <section className="panel-card">
        <div className="st-head">
          <h3 style={{ margin: 0 }}>{x.prfTitle}</h3>
          <PeriodBar p={p} />
        </div>
        {err?.status === 402 && err.response?.code === "history" && <p className="rs-muted">{err.message}</p>}
        {!data ? (
          <p className="rs-muted">…</p>
        ) : (
          <>
            <div className="xs-kpis">
              <span>
                <b>{money(t.revenue, cur)}</b>
                <small>{x.revenue}</small>
              </span>
              <span>
                <b>{money(t.cost, cur)}</b>
                <small>{x.cost}</small>
              </span>
              <span className={t.profit >= 0 ? "ok" : "bad"}>
                <b data-testid="pf-profit">{money(t.profit, cur)}</b>
                <small>{x.profit}</small>
              </span>
              <span>
                <b>{pct(t.margin)}</b>
                <small>{x.margin}</small>
              </span>
              <span>
                <b>{t.receipts}</b>
                <small>{x.receipts}</small>
              </span>
            </div>
            {t.estimated > 0 && <p className="rs-muted xs-hint">{x.estimated.replace("{n}", t.estimated)}</p>}
            {!t.receipts ? (
              <p className="rs-muted">{x.noProfit}</p>
            ) : (
              <div className="xs-chart" aria-hidden="true">
                {data.series.map((s) => (
                  <span key={s.key} title={`${s.key} · ${money(s.revenue, cur)} · ${money(s.profit, cur)}`}>
                    <i className="rev" style={{ height: `${(Math.max(0, s.revenue) / max) * 100}%` }}>
                      <i className="pro" style={{ height: `${s.revenue > 0 ? (Math.max(0, s.profit) / s.revenue) * 100 : 0}%` }} />
                    </i>
                    <small>{data.kind === "day" ? s.key : s.key.slice(8)}</small>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </section>
      {data && t.receipts > 0 && (
        <>
          {data.no_cost.length > 0 && (
            <section className="panel-card xs-warn">
              <AlertTriangle size={18} />
              <div>
                <b>{x.noCost}</b>
                <p className="rs-muted">{data.no_cost.map((r) => r.name).join(", ")}</p>
              </div>
            </section>
          )}
          <div className="xs-two">
            <section className="panel-card">
              <h3 style={{ marginTop: 0 }}>{x.byCategory}</h3>
              <div className="xs-bars">
                {data.categories.map((c) => (
                  <div key={c.category_id}>
                    <span>
                      <i style={{ background: c.color || "var(--mp-a, #0f766e)" }} /> {c.category_id === "x" ? x.otherLines : c.name || x.noCategory}
                    </span>
                    <b>{money(c.profit, cur)}</b>
                    <small className="rs-muted">{pct(c.margin)}</small>
                    <em style={{ width: `${t.revenue > 0 ? Math.max(2, (c.revenue / t.revenue) * 100) : 0}%` }} />
                  </div>
                ))}
              </div>
            </section>
            <section className="panel-card">
              <h3 style={{ marginTop: 0 }}>{x.lowMargin}</h3>
              {!data.low_margin.length ? (
                <p className="rs-muted">—</p>
              ) : (
                <div className="xs-moves">
                  {data.low_margin.map((r) => (
                    <div key={r.product_id}>
                      <span>
                        <b>{r.name}</b>
                        <small className="rs-muted">
                          {money(r.revenue, cur)} − {money(r.cost, cur)}
                        </small>
                      </span>
                      <b className={r.margin < 0 ? "minus" : ""}>{pct(r.margin)}</b>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
          <section className="panel-card">
            <div className="xs-bar">
              <h3 style={{ margin: 0 }}>{x.byProduct}</h3>
              <div className="at-seg">
                {["profit", "margin", "revenue"].map((k) => (
                  <button key={k} type="button" className={sort === k ? "on" : ""} onClick={() => setSort(k)}>
                    {x[k]}
                  </button>
                ))}
              </div>
            </div>
            <div className="st-wrap">
              <table className="st-table">
                <thead>
                  <tr>
                    <th>{x.product}</th>
                    <th className="num">{x.qty}</th>
                    <th className="num">{x.revenue}</th>
                    <th className="num">{x.cost}</th>
                    <th className="num">{x.profit}</th>
                    <th className="num">{x.margin}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((r) => (
                    <tr key={r.product_id || r.name}>
                      <td>
                        {r.name} {r.no_cost && <AlertTriangle size={12} className="xs-warn-ic" />}
                      </td>
                      <td className="num">{r.qty}</td>
                      <td className="num">{money(r.revenue, cur)}</td>
                      <td className="num">{money(r.cost, cur)}</td>
                      <td className="num">
                        <b>{money(r.profit, cur)}</b>
                      </td>
                      <td className="num">{pct(r.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
