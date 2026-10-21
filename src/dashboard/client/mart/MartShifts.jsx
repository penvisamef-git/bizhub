import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Banknote, Check, Vault } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { fmtDayTime, fmtTime, money, riel } from "./text";

const shiftsOn = (ctx) => (ctx.pos ? !!ctx.data.shifts : !!ctx.data.addons?.mart_shifts?.active);
const usd = (v) => money(v, "USD");

// Shifts & cash drawer (mart_shifts): open with a float, cash in / out, count at close
export function ShiftsTab({ ctx }) {
  const { m, cur, readOnly, lang } = ctx;
  const [data, setData] = useState(null);
  const load = useCallback(() => {
    if (!shiftsOn(ctx)) return;
    ctx.api
      .shifts(ctx.id)
      .then((r) => setData(r.data))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx]);
  useEffect(() => {
    load();
  }, [load]);

  if (!shiftsOn(ctx)) {
    const a = ctx.data.addons?.mart_shifts;
    return (
      <section className="panel-card mt-lock">
        <Vault size={34} />
        <h2>{m.addonInfo.mart_shifts.name}</h2>
        <p className="rs-muted">{m.shiftsLocked}</p>
        {!ctx.pos && (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon: "mart_shifts" })} disabled={readOnly}>
            <CoinIcon size={16} /> {m.unlock.replace("{coins}", a?.price ?? 40)} · {m.forever}
          </button>
        )}
      </section>
    );
  }
  return (
    <div className="rs-col">
      <section className="panel-card ms-head">
        <div className="ms-head-top">
          <span className="ms-head-ic">
            <Vault size={24} />
          </span>
          <div className="ms-head-text">
            <h2>{m.tabs.shifts}</h2>
            <small>{m.shiftsOnPos}</small>
          </div>
        </div>
        {!data ? (
          <p className="rs-muted" style={{ margin: "14px 0 0" }}>
            …
          </p>
        ) : !data.open?.length ? (
          <p className="rs-muted" style={{ margin: "14px 0 0" }}>
            {m.noOpenShift}
          </p>
        ) : (
          data.open.map((cu) => (
            <div key={cu._id} className="sf-open">
              <p className="md-open-line">
                <em className="sf-live" />
                <b>{cu.no}</b> · {cu.device_name || m.allDevices} · {m.shiftOpenBy.replace("{time}", fmtDayTime(cu.opened_at, lang)).replace("{name}", cu.opened_by)}
              </p>
              <div className="ms-cards">
                <div className="ms-card c-teal md-wide">
                  <span className="ms-card-ic">
                    <Banknote size={18} />
                  </span>
                  <b>
                    {usd(cu.live.expected_usd)} <i className="md-plus">+</i> {riel(cu.live.expected_khr)}
                  </b>
                  <small>{m.expectedCash}</small>
                </div>
                <div className="ms-card c-blue">
                  <span className="ms-card-ic">
                    <Check size={18} />
                  </span>
                  <b>{money(cu.live.sales_total, cur)}</b>
                  <small>
                    {m.salesInShift} · {cu.live.sales_count}
                  </small>
                </div>
              </div>
              {cu.moves.length > 0 && (
                <div className="md-moves">
                  {cu.moves.map((x) => (
                    <span key={x._id} className={`md-move ${x.kind}`}>
                      {x.kind === "in" ? <ArrowDownToLine size={13} /> : <ArrowUpFromLine size={13} />}
                      {[x.amount_usd > 0 && usd(x.amount_usd), x.amount_khr > 0 && riel(x.amount_khr)].filter(Boolean).join(" + ")}
                      {x.note ? ` · ${x.note}` : ""} · {fmtTime(x.at, lang)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      <section className="panel-card">
        <h3 className="mt-h">{m.pastShifts}</h3>
        {!data ? (
          <p className="rs-muted">…</p>
        ) : !data.rows.length ? (
          <p className="rs-muted">{m.noShifts}</p>
        ) : (
          <div className="ms-table">
            <div className="ms-tr ms-th md-sh">
              <span>{m.tabs.shifts}</span>
              <span>{m.expected}</span>
              <span>{m.counted}</span>
              <span>{m.diff}</span>
            </div>
            {data.rows.map((x) => {
              const off = Math.abs(x.diff_usd) >= 0.01 || Math.abs(x.diff_khr) >= 1;
              return (
                <div key={x._id} className="ms-tr md-sh">
                  <span className="mt-prod-text">
                    <b>
                      {x.no}
                      {!ctx.pos ? ` · ${x.device_name || m.allDevices}` : ""}
                    </b>
                    <small>
                      {fmtDayTime(x.opened_at, lang)} → {fmtTime(x.closed_at, lang)} · {x.opened_by}
                      {x.closed_by && x.closed_by !== x.opened_by ? ` → ${x.closed_by}` : ""} · {m.salesInShift}: {money(x.sales_total, cur)} ({x.sales_count})
                    </small>
                  </span>
                  <span className="md-cash">
                    {usd(x.expected_usd)}
                    <small>{riel(x.expected_khr)}</small>
                  </span>
                  <span className="md-cash">
                    {usd(x.counted_usd)}
                    <small>{riel(x.counted_khr)}</small>
                  </span>
                  <span>
                    {!off ? (
                      <em className="ms-pill">
                        <Check size={12} /> {m.exact2}
                      </em>
                    ) : (
                      <span className="md-cash">
                        <b className={x.diff_usd < 0 || (x.diff_usd === 0 && x.diff_khr < 0) ? "mt-neg" : "mt-pos"}>{x.diff_usd !== 0 ? `${x.diff_usd > 0 ? "+" : ""}${usd(x.diff_usd)}` : ""}</b>
                        <small className={x.diff_khr < 0 ? "mt-neg" : "mt-pos"}>{x.diff_khr !== 0 ? `${x.diff_khr > 0 ? "+" : ""}${riel(x.diff_khr)}` : ""}</small>
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
