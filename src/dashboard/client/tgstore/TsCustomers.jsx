import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, MessageCircle, Phone, Search, Send, Users } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { Head } from "../menuqr/parts";
import { ago, fill, fmtDate, fmtNum, money } from "./text";
import { OrderModal, OrderTable } from "./TsOrders";

const initial = (n) => (n || "?").trim().slice(0, 1).toUpperCase();

function CustomerModal({ ctx, id, onClose, onSaved }) {
  const { x, api, lang, cur, readOnly } = ctx;
  const [d, setD] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const load = useCallback(
    () =>
      api.customer(id).then((r) => {
        setD(r.data);
        setNote(r.data.customer.note || "");
      }),
    [api, id],
  );
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveNote = async () => {
    setBusy(true);
    try {
      await api.saveCustomer(id, { note });
      ctx.notify({ type: "success", text: x.saved });
      onSaved();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const c = d?.customer;
  return (
    <Modal title={c?.name || c?.phone || "…"} onClose={onClose} size="md-modal-lg">
      {!d ? (
        <div className="ts-skel" style={{ minHeight: 220 }} />
      ) : (
        <div className="ts-cust-detail">
          <div className="ts-cust-head">
            <span className="ts-av big">{initial(c.name || c.phone)}</span>
            <div>
              <b>{c.name || c.phone}</b>
              <small className="rs-muted">{fill(x.since, { date: fmtDate(c.created_date, lang) })}</small>
              <div className="ts-product-meta">
                {c.phone && (
                  <a className="ts-pill" href={`tel:${c.phone}`}>
                    <Phone size={12} /> {c.phone}
                  </a>
                )}
                {c.username && (
                  <a className="ts-pill" href={`https://t.me/${c.username}`} target="_blank" rel="noreferrer">
                    <Send size={12} /> @{c.username}
                  </a>
                )}
                {c.can_message && (
                  <span className="ts-pill pay-paid">
                    <MessageCircle size={12} /> {x.canMessage}
                  </span>
                )}
              </div>
              {c.address && (
                <p className="ts-order-line">
                  <MapPin size={14} /> {c.address}
                </p>
              )}
            </div>
          </div>
          <div className="ts-kpis">
            {[
              [x.custCols.orders, `${fmtNum(c.orders)}${c.placed > c.orders ? ` / ${fmtNum(c.placed)}` : ""}`],
              [x.custCols.spent, money(c.spent, cur)],
              [x.avg, c.orders ? money(c.spent / c.orders, cur) : "—"],
              [x.custCols.last, c.last_order_at ? ago(c.last_order_at, x) : x.never],
            ].map(([k, v]) => (
              <div key={k} className="panel-card ts-kpi flat">
                <small>{k}</small>
                <b>{v}</b>
              </div>
            ))}
          </div>
          {d.favourites.length > 0 && (
            <div>
              <h3 className="ts-h3">{x.favourites}</h3>
              <div className="ts-product-meta" style={{ marginTop: 8 }}>
                {d.favourites.map((f) => (
                  <span key={f.name} className="ts-pill">
                    {f.name} × {fmtNum(f.qty)}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="md-field">
            <label htmlFor="ts-cnote">{x.custNote}</label>
            <div className="ts-promo-row">
              <input id="ts-cnote" value={note} maxLength={300} placeholder={x.custNotePh} onChange={(e) => setNote(e.target.value)} disabled={readOnly} data-testid="ts-cust-note" />
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={saveNote} disabled={readOnly || busy || note === (c.note || "")}>
                {x.save}
              </button>
            </div>
          </div>
          <div>
            <h3 className="ts-h3">{x.theirOrders}</h3>
            {d.orders.length === 0 ? <p className="rs-muted">{x.noOrders}</p> : <OrderTable ctx={ctx} rows={d.orders} onOpen={setOpen} hideWho />}
          </div>
        </div>
      )}
      {open && <OrderModal ctx={ctx} order={open} onClose={() => setOpen(null)} onChanged={load} />}
    </Modal>
  );
}

export function CustomersTab({ ctx }) {
  const { x, api, cur } = ctx;
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [r, setR] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(
    () =>
      api
        .customers({ q, sort, page, ...(kind === "all" ? {} : { kind }) })
        .then(setR)
        .catch(() => setR({ data: [], stats: {}, pagination: { total: 0, limit: 30 } })),
    [api, q, sort, page, kind],
  );
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  const st = r?.stats || {};
  const pages = r ? Math.max(1, Math.ceil(r.pagination.total / r.pagination.limit)) : 1;
  return (
    <div className="rs-col">
      <Head icon={Users} title={x.tabs.customers} sub={x.customersSub} />
      <div className="ts-kpis five">
        {["all", "telegram", "repeat", "new_month", "spent"].map((k) => (
          <div key={k} className="panel-card ts-kpi">
            <small>{x.custStats[k]}</small>
            <b>{r ? (k === "spent" ? money(st.spent || 0, cur) : fmtNum(st[k] || 0)) : "…"}</b>
          </div>
        ))}
      </div>
      <section className="panel-card ts-filters-card">
        <label className="ts-search">
          <Search size={16} />
          <input value={q} onChange={(e) => (setPage(1), setQ(e.target.value))} placeholder={x.search} aria-label={x.search} />
        </label>
        <div className="ts-filter-row">
          <div className="ts-chips">
            {["all", "telegram", "web", "repeat", "message"].map((k) => (
              <button key={k} type="button" className={kind === k ? "on" : ""} onClick={() => (setPage(1), setKind(k))}>
                {x.kinds2[k]}
              </button>
            ))}
          </div>
          <label className="ts-date">
            <span>{x.sortBy}</span>
            <select value={sort} onChange={(e) => (setPage(1), setSort(e.target.value))}>
              {Object.entries(x.sorts).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className="panel-card ts-table-card">
        {!r ? (
          <div className="ts-skel" style={{ minHeight: 200 }} />
        ) : r.data.length === 0 ? (
          <div className="ts-empty">
            <Users size={28} />
            <p>{x.noCustomers}</p>
          </div>
        ) : (
          <>
            <div className="ts-table-wrap">
              <table className="ts-table">
                <thead>
                  <tr>
                    <th>{x.custCols.who}</th>
                    <th>{x.custCols.contact}</th>
                    <th className="num">{x.custCols.orders}</th>
                    <th className="num">{x.custCols.spent}</th>
                    <th>{x.custCols.last}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.data.map((c) => (
                    <tr key={c._id} onClick={() => setOpen(c._id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(c._id)} data-testid="ts-cust-row">
                      <td>
                        <span className="ts-who-cell">
                          <span className="ts-av">{initial(c.name || c.phone)}</span>
                          <span>
                            <span className="ts-td-main">{c.name || c.phone}</span>
                            {c.note && <small>{c.note}</small>}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="ts-td-main">{c.phone || "—"}</span>
                        <small>
                          {c.username ? `@${c.username}` : ""}
                          {c.telegram ? `${c.username ? " · " : ""}Telegram` : x.viaWeb}
                        </small>
                      </td>
                      <td className="num">
                        <b>{fmtNum(c.orders)}</b>
                        {c.placed > c.orders && <small>/ {fmtNum(c.placed)}</small>}
                      </td>
                      <td className="num">
                        <b>{money(c.spent, cur)}</b>
                      </td>
                      <td>{c.last_order_at ? ago(c.last_order_at, x) : x.never}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="ts-pager">
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={14} /> {x.prev}
                </button>
                <span>{fill(x.pageOf, { p: page, n: pages })}</span>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  {x.next} <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </section>
      {open && <CustomerModal ctx={ctx} id={open} onClose={() => setOpen(null)} onSaved={load} />}
    </div>
  );
}
