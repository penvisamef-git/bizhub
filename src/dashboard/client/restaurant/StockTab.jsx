import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, History, Minus, Package, Plus, Search, Sparkles, X, ClipboardCheck } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { Modal } from "../../super_admin/parts";
import { AddonPrompt, Field } from "./parts";
import { fmtMoney } from "./text";
import { useStockText } from "./stock-text";

const fmtQty = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const nameOf = (x, lang) => (lang === "km" ? x?.name_km || x?.name_en : x?.name_en || x?.name_km) || "—";
const stateOf = (i) => (!i.track_stock ? "none" : i.stock <= 0 ? "out" : i.stock <= (i.low_stock ?? 5) ? "low" : "ok");

// Stock: what's left of each item, stock in / out / count, history, sample items
export default function StockTab({ ctx }) {
  const { r, lang, settings, readOnly } = ctx;
  const s = useStockText();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [move, setMove] = useState(null); // { item, kind }
  const [history, setHistory] = useState(null); // item | "all"
  const [busy, setBusy] = useState("");
  const c = settings.currency || "USD";
  const money = (n) => fmtMoney(n, c);

  const load = useCallback(() => restaurantService.stock.get(ctx.id).then((res) => setData(res.data)), [ctx.id]);
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (key, fn, ok) => {
    setBusy(key);
    try {
      await fn();
      if (ok) ctx.notify({ type: "success", text: ok });
    } catch (e) {
      if (e.status === 402 && e.response?.product) ctx.askBuy(e.response.product);
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };

  const cats = useMemo(() => Object.fromEntries((data?.categories || []).map((x) => [x._id, x])), [data]);
  if (!data) return <ListSkeleton rows={5} />;
  const qq = q.trim().toLowerCase();
  const rows = data.items.filter((i) => (filter === "all" ? i.track_stock : filter === "none" ? !i.track_stock : stateOf(i) === filter)).filter((i) => !qq || `${i.name_en} ${i.name_km}`.toLowerCase().includes(qq));
  const sm = data.summary;

  return (
    <div className="rs-col">
      <section className="panel-card pt-hero">
        <span className="pt-ic">
          <Package size={26} />
        </span>
        <div>
          <h2>{s.title}</h2>
          <p className="rs-muted">{s.sub}</p>
        </div>
        <span className="sk-head-btns">
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setHistory("all")}>
            <History size={15} /> {s.history}
          </button>
          {sm.items <= 40 && (
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              disabled={readOnly || busy === "sample"}
              onClick={() =>
                act(
                  "sample",
                  async () => {
                    const res = await restaurantService.stock.sample(ctx.id);
                    await load();
                    ctx.reload();
                    ctx.notify({
                      type: "success",
                      text: res.tracked ? s.samplesDone : s.samplesDoneNoStock,
                    });
                  },
                  null,
                )
              }
            >
              <Sparkles size={15} /> {busy === "sample" ? r.saving : s.addSamples}
            </button>
          )}
        </span>
      </section>

      {!data.active && (
        <section className="panel-card">
          <AddonPrompt addonKey="rest_stock" ctx={ctx} />
        </section>
      )}

      {data.active && (
        <>
          <div className="sk-kpis">
            <Kpi label={s.kpiTracked} value={fmtQty(sm.tracked)} sub={`/ ${fmtQty(sm.items)}`} />
            <Kpi label={s.kpiLow} value={fmtQty(sm.low)} tone={sm.low ? "low" : ""} onClick={() => setFilter("low")} />
            <Kpi label={s.kpiOut} value={fmtQty(sm.out)} tone={sm.out ? "out" : ""} onClick={() => setFilter("out")} />
            <Kpi label={s.kpiValue} value={money(sm.value)} />
            <Kpi label={s.kpiRetail} value={money(sm.retail)} />
          </div>

          <section className="panel-card">
            <div className="rp-inv-tools">
              <div className="rp-search">
                <Search size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.search} aria-label={s.search} />
                {q && (
                  <button type="button" onClick={() => setQ("")} aria-label="Clear">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="rp-views small">
                {[
                  ["all", s.all],
                  ["low", s.low],
                  ["out", s.out],
                  ["none", s.notTracked],
                ].map(([k, label]) => (
                  <button key={k} type="button" className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {rows.length === 0 ? (
              <p className="rs-muted rp-none">{filter === "all" && sm.tracked === 0 ? s.noneTracked : s.none}</p>
            ) : (
              <div className="pt-table-wrap">
                <table className="pt-table sk-table">
                  <thead>
                    <tr>
                      <th>{s.colItem}</th>
                      {filter !== "none" && <th className="num">{s.colStock}</th>}
                      <th className="num hide-sm">{s.colCost}</th>
                      <th className="num hide-sm">{s.colPrice}</th>
                      <th className="num hide-sm">{s.colMargin}</th>
                      {filter !== "none" && <th className="num hide-sm">{s.colValue}</th>}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((i) => {
                      const st = stateOf(i);
                      const margin = i.price ? Math.round(((i.price - (i.cost || 0)) / i.price) * 100) : 0;
                      return (
                        <tr key={i._id}>
                          <td>
                            <div className="sk-item">
                              <span className="sk-thumb">{i.photo ? <img src={i.photo} alt="" /> : <Package size={16} />}</span>
                              <span>
                                <b>{nameOf(i, lang)}</b>
                                <small className="rs-muted">
                                  <i
                                    style={{
                                      background: cats[i.category_id]?.color,
                                    }}
                                  />{" "}
                                  {nameOf(cats[i.category_id], lang)}
                                </small>
                              </span>
                            </div>
                          </td>
                          {filter !== "none" && (
                            <td className="num">
                              <span className={`sk-badge ${st}`}>{st === "out" ? s.soldOut : fmtQty(i.stock)}</span>
                            </td>
                          )}
                          <td className="num hide-sm">{i.cost ? money(i.cost) : "—"}</td>
                          <td className="num hide-sm">{money(i.price)}</td>
                          <td className={`num hide-sm ${margin < 0 ? "neg" : ""}`}>{i.cost ? `${margin}%` : "—"}</td>
                          {filter !== "none" && <td className="num hide-sm">{money(Math.max(0, i.stock) * (i.cost || 0))}</td>}
                          <td>
                            <div className="sk-actions">
                              {i.track_stock ? (
                                <>
                                  <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setMove({ item: i, kind: "in" })} disabled={readOnly}>
                                    <Plus size={14} /> {s.stockIn}
                                  </button>
                                  <button type="button" className="md-icon-btn" onClick={() => setMove({ item: i, kind: "out" })} disabled={readOnly} title={s.stockOut} aria-label={s.stockOut}>
                                    <Minus size={15} />
                                  </button>
                                  <button type="button" className="md-icon-btn" onClick={() => setMove({ item: i, kind: "count" })} disabled={readOnly} title={s.count} aria-label={s.count}>
                                    <ClipboardCheck size={15} />
                                  </button>
                                  <button type="button" className="md-icon-btn" onClick={() => setHistory(i)} title={s.history} aria-label={s.history}>
                                    <History size={15} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="md-btn md-btn-ghost sa-btn-sm"
                                  disabled={readOnly || busy === i._id}
                                  onClick={() =>
                                    act(i._id, async () => {
                                      await restaurantService.update(ctx.id, "items", i._id, { track_stock: true });
                                      await load();
                                    })
                                  }
                                >
                                  {busy === i._id ? s.tracking : s.track}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {move && (
        <MoveModal
          ctx={ctx}
          s={s}
          {...move}
          onClose={() => setMove(null)}
          onSaved={async () => {
            setMove(null);
            await load();
          }}
        />
      )}
      {history && <HistoryModal ctx={ctx} s={s} item={history === "all" ? null : history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function Kpi({ label, value, sub, tone, onClick }) {
  return (
    <button type="button" className={`rp-kpi sk-kpi ${tone || ""}`} onClick={onClick} disabled={!onClick}>
      <span>{label}</span>
      <b>
        {value} {sub && <small>{sub}</small>}
      </b>
    </button>
  );
}

function MoveModal({ ctx, s, item, kind, onClose, onSaved }) {
  const { r, lang, settings } = ctx;
  const [qty, setQty] = useState(kind === "count" ? String(item.stock) : "");
  const [cost, setCost] = useState(item.cost ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const n = Number(qty);
  const after = kind === "in" ? item.stock + n : kind === "out" ? item.stock - n : n;
  const can = qty !== "" && Number.isFinite(n) && n >= 0 && (kind === "count" || n > 0);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await restaurantService.stock.move(ctx.id, item._id, {
        kind,
        qty: n,
        note,
        ...(kind === "in" && cost !== "" ? { cost: Number(cost) } : {}),
      });
      ctx.notify({ type: "success", text: r.saved });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={s.moveTitle[kind].replace("{name}", nameOf(item, lang))}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {r.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={!can || busy}>
            {busy ? r.saving : s.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <p className="rs-muted" style={{ margin: 0 }}>
          {s.moveSub[kind]}
        </p>
        <Field label={kind === "count" ? s.countedQty : s.qty} htmlFor="st-qty">
          <input id="st-qty" type="number" min="0" step="1" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus inputMode="numeric" />
        </Field>
        {can && (
          <div className="sk-after">
            <span className="rs-muted">{s.colStock}</span>
            <b className={after <= 0 ? "out" : after <= (item.low_stock ?? 5) ? "low" : ""}>{s.nowAfter.replace("{a}", fmtQty(item.stock)).replace("{b}", fmtQty(after))}</b>
          </div>
        )}
        {kind === "in" && (
          <Field label={`${s.costEach} (${settings.currency})`} hint={s.costEachHint} htmlFor="st-cost">
            <input id="st-cost" type="number" min="0" step={settings.currency === "KHR" ? 100 : 0.05} value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
        )}
        <Field label={s.note} htmlFor="st-note">
          <input id="st-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder={s.notePh} />
        </Field>
        {kind === "out" && (
          <div className="sk-reasons">
            {s.reasons.map((x) => (
              <button key={x} type="button" className={note === x ? "on" : ""} onClick={() => setNote(x)}>
                {x}
              </button>
            ))}
          </div>
        )}
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

function HistoryModal({ ctx, s, item, onClose }) {
  const { lang } = ctx;
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  useEffect(() => {
    restaurantService.stock
      .moves(ctx.id, { item: item?._id, page })
      .then(setData)
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx.id, item?._id, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const when = (d) =>
    new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(d));
  const pg = data?.pagination;
  return (
    <Modal title={item ? s.historyTitle.replace("{name}", nameOf(item, lang)) : s.historyAll} onClose={onClose} size="md-modal-lg">
      {!data ? (
        <ListSkeleton rows={4} bare />
      ) : data.data.length === 0 ? (
        <p className="rs-muted">{s.noMoves}</p>
      ) : (
        <div className="pt-table-wrap">
          <table className="pt-table">
            <thead>
              <tr>
                <th>{s.colWhen}</th>
                {!item && <th>{s.colItem}</th>}
                <th>{s.colKind}</th>
                <th className="num">{s.colQty}</th>
                <th className="num">{s.colAfter}</th>
                <th>{s.colBy}</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((m) => (
                <tr key={m._id}>
                  <td>{when(m.created_date)}</td>
                  {!item && <td>{m.item_name}</td>}
                  <td>
                    <span className={`sk-kind k-${m.kind}`}>{s.kinds[m.kind]}</span>
                    {m.note && <small className="rs-muted"> · {m.note}</small>}
                  </td>
                  <td className={`num ${m.qty < 0 ? "neg" : "pos"}`}>
                    {m.qty > 0 ? "+" : ""}
                    {fmtQty(m.qty)}
                  </td>
                  <td className="num">{fmtQty(m.after)}</td>
                  <td>{[m.by, m.order_number && `#${m.order_number}`].filter(Boolean).join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pg && pg.totalPages > 1 && (
        <div className="rp-pager">
          <button type="button" className="md-icon-btn" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Previous">
            <ChevronLeft size={16} />
          </button>
          <span className="rs-muted">{s.page.replace("{p}", pg.currentPage).replace("{n}", pg.totalPages)}</span>
          <button type="button" className="md-icon-btn" onClick={() => setPage(page + 1)} disabled={page >= pg.totalPages} aria-label="Next">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </Modal>
  );
}
