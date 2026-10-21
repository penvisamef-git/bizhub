import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CardsPanel from "./CardsPanel";
import { ArrowRightLeft, Coins, CreditCard, Landmark, PlusCircle, RefreshCw, Send, Sparkles } from "lucide-react";
import "../admin/master_data/masterdata.css";
import "./super-admin.css";
import { coinAdminService } from "../../api/services";
import { memo } from "../../lib/memo";
import { fmt, fmtDate, useSaText } from "./text";
import { GenerateModal, Pager, TransferModal, useNotice, walletName } from "./parts";
import TxDetail from "../client/TxDetail";
import { TableSkeletonRows } from "../../components/skeleton/Skeleton";

const TYPES = ["generate", "transfer", "signup_bonus", "card_create", "card_redeem", "card_cancel", "spend"];

export default function CoinsPage() {
  const { s } = useSaText();
  const saved = memo.get("coins") || {};
  const [summary, setSummary] = useState(saved.summary || null);
  const [rows, setRows] = useState(saved.rows || []);
  const [pagination, setPagination] = useState(saved.pagination || null);
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // the transaction in the details window
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useNotice();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "cards" ? "cards" : "history";

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([coinAdminService.summary(), coinAdminService.transactions({ type, page, limit: 20 })])
      .then(([sum, tx]) => {
        setSummary(sum.data);
        setRows(tx.data || []);
        setPagination(tx.pagination);
        if (!type && page === 1) memo.set("coins", { summary: sum.data, rows: tx.data || [], pagination: tx.pagination });
      })
      .catch((e) => setError(e.message || s.loadFail))
      .finally(() => setLoading(false));
  }, [type, page, s.loadFail]);

  useEffect(load, [load]);

  const done = (text) => {
    setNotice({ type: "success", text });
    load();
  };

  const sum = summary;
  const cards = [
    [Landmark, s.treasury, sum?.treasury_balance, "gold"],
    [Coins, s.inWallets, sum?.customer_balance],
    [Sparkles, s.generated, sum?.generated_total],
    [CreditCard, s.onCards, sum?.cards_balance],
    [Send, s.sold30, sum?.treasury_out_30d?.coins, "", sum && `$${fmt(sum.treasury_out_30d.usd)} · ${fmt(sum.treasury_out_30d.count)}×`],
  ];

  return (
    <div className="md-page sa-page">
      {notice}
      <div className="sa-head">
        <p className="sa-muted" style={{ margin: 0 }}>
          {s.coinsSub}
        </p>
        <div className="sa-head-actions">
          <button type="button" className="md-btn md-btn-ghost" onClick={() => setModal("generate")}>
            <PlusCircle size={16} /> {s.generateCoins}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={() => setModal("transfer")}>
            <ArrowRightLeft size={16} /> {s.transferCoins}
          </button>
        </div>
      </div>

      <div className="sa-stats">
        {cards.map(([Icon, label, value, tone, sub]) => (
          <div key={label} className={`sa-stat ${tone || ""}`}>
            <span className="sa-stat-icon">
              <Icon size={20} />
            </span>
            <span className="sa-stat-label">{label}</span>
            <b>{value === undefined ? "—" : fmt(value)}</b>
            {sub && <small>{sub}</small>}
          </div>
        ))}
      </div>
      {sum && (
        <p className="sa-muted" style={{ margin: 0 }}>
          {s.signupBonus}: {fmt(sum.signup_bonus_total)} · {s.spent}: {fmt(sum.spent_total)}
        </p>
      )}

      <div className="cd-tabs" role="tablist">
        {[
          ["history", s.tabHistory],
          ["cards", s.tabCards],
        ].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setParams(key === "cards" ? { tab: "cards" } : {})}>
            {label}
          </button>
        ))}
      </div>

      {tab === "cards" ? (
        <CardsPanel treasury={sum?.treasury_balance} onChanged={load} notify={setNotice} />
      ) : (
        <>
          <div className="md-toolbar">
            <div className="lang-switch sa-type-switch" role="group" aria-label={s.type}>
              {["", ...TYPES].map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={type === v}
                  onClick={() => {
                    setType(v);
                    setPage(1);
                  }}
                >
                  {v ? s.typeNames[v] : s.all}
                </button>
              ))}
            </div>
            <button type="button" className="md-btn md-btn-ghost" onClick={load} disabled={loading}>
              <RefreshCw size={16} className={loading ? "md-spin" : ""} /> {s.refresh}
            </button>
          </div>

          <div className="md-card">
            <div className="md-table-scroll">
              <table className="md-table sa-table">
                <thead>
                  <tr>
                    <th>{s.date}</th>
                    <th>{s.type}</th>
                    <th className="num">{s.amount}</th>
                    <th>{s.from}</th>
                    <th>{s.to}</th>
                    <th>{s.note}</th>
                    <th>{s.payment}</th>
                    <th>{s.by}</th>
                  </tr>
                </thead>
                <tbody>
                  {error && (
                    <tr>
                      <td colSpan={8} className="md-empty md-empty-error">
                        {error}
                      </td>
                    </tr>
                  )}
                  {loading && !error && rows.length === 0 && <TableSkeletonRows cols={8} />}
                  {!error && !loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="md-empty">
                        {s.nothingYet}
                      </td>
                    </tr>
                  )}
                  {rows.map((x) => {
                    const minted = x.type === "generate" || x.type === "signup_bonus";
                    return (
                      <tr key={x._id} className="tx-click" onClick={() => setOpen(x)} data-testid="tx-row">
                        <td className="sa-nowrap">{fmtDate(x.created_date, true)}</td>
                        <td>
                          <span className={`sa-tx-type t-${x.type}`}>{s.typeNames[x.type] || x.type}</span>
                        </td>
                        <td className="num">
                          <b>{fmt(x.amount)}</b>
                        </td>
                        <td>{minted ? "—" : x.type === "card_redeem" || x.type === "card_cancel" ? s.tabCards : walletName(x.from_customer, s)}</td>
                        <td>
                          {x.type === "card_create" ? s.tabCards : walletName(x.to_customer, s)}
                          {x.to_balance_after !== null && x.to_balance_after !== undefined && (
                            <small className="sa-block">
                              {s.afterMove}: {fmt(x.to_balance_after)}
                            </small>
                          )}
                        </td>
                        <td className="sa-note-cell">{x.note || "-"}</td>
                        <td className="sa-nowrap">
                          {x.payment?.method ? (
                            <>
                              {x.payment.method}
                              {x.payment.amount_usd !== null && x.payment.amount_usd !== undefined && ` · $${x.payment.amount_usd}`}
                              {x.payment.reference && <small className="sa-block">{x.payment.reference}</small>}
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="sa-nowrap">{x.by_user ? `${x.by_user.firstname} ${x.by_user.lastname}` : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager pagination={pagination} onPage={setPage} />
          </div>
        </>
      )}

      {modal === "generate" && <GenerateModal onClose={() => setModal(null)} onDone={done} />}
      {modal === "transfer" && <TransferModal onClose={() => setModal(null)} onDone={done} />}
      {open && <TxDetail tx={open} view="admin" onClose={() => setOpen(null)} />}
    </div>
  );
}
