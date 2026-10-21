import { useCallback, useEffect, useState } from "react";
import { Coins } from "lucide-react";
import "../admin/master_data/masterdata.css";
import "../super_admin/super-admin.css";
import "./client.css";
import { useI18n } from "../../i18n/I18nProvider";
import { myWalletService } from "../../api/services";
import { memo } from "../../lib/memo";
import { fmt, fmtDate, useSaText } from "../super_admin/text";
import RedeemCard from "./RedeemCard";
import TxDetail, { txTitle, useTxText } from "./TxDetail";
import { ListSkeleton, Skel } from "../../components/skeleton/Skeleton";

// Customer wallet: balance, 3 buttons (buy coins · top-up card · scan QR), history
export default function WalletPage() {
  const { t } = useI18n();
  const { s } = useSaText();
  const saved = memo.get("wallet") || {};
  const [balance, setBalance] = useState(saved.balance ?? null);
  const [rows, setRows] = useState(saved.rows || []);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // the transaction in the details window
  const tt = useTxText();
  // /app/wallet#history (from the dashboard coin card) → jump to the history list
  useEffect(() => {
    if (window.location.hash !== "#history") return;
    const id = setTimeout(() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    return () => clearTimeout(id);
  }, []);

  const load = useCallback((p) => {
    setLoading(true);
    myWalletService
      .get({ page: p, limit: 20 })
      .then((r) => {
        setBalance(r.data.balance);
        setRows((old) => (p === 1 ? r.data.transactions : [...old, ...r.data.transactions]));
        setPagination(r.pagination);
        if (p === 1) memo.set("wallet", { balance: r.data.balance, rows: r.data.transactions });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(page), [load, page]);

  const label = (x) => {
    if (x.type === "signup_bonus") return t.txBonus;
    if (x.type === "spend") return t.txSpend;
    if (x.type === "card_redeem") return t.txCard;
    return x.direction === "in" ? t.txIn : t.txOut;
  };

  return (
    <div className="md-page sa-page">
      <div className="cl-wallet-top">
        <section className="cl-balance">
          <span>
            <Coins size={18} /> {t.coinBalance}
          </span>
          <b>{balance === null ? <Skel w={110} h={34} className="sk-on-dark" /> : fmt(balance)}</b>
          <small>{t.walletEvery}</small>
        </section>

        <RedeemCard
          onRedeemed={(r) => {
            setBalance(r.balance);
            if (page === 1) load(1);
            else setPage(1);
          }}
        />
      </div>

      <section className="md-card" id="history">
        <div className="sa-section-head" style={{ padding: "16px 16px 0" }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{s.history}</h2>
        </div>
        {error && (
          <div className="md-form-error" style={{ margin: 16 }}>
            {error}
          </div>
        )}
        {loading && !error && rows.length === 0 && (
          <div style={{ padding: 16 }}>
            <ListSkeleton rows={4} />
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <p className="sa-muted" style={{ padding: 16 }}>
            {s.nothingYet}
          </p>
        )}
        <ul className="sa-list cl-history">
          {rows.map((x) => (
            <li key={x._id} className="sa-list-row tx-click" role="button" tabIndex={0} onClick={() => setOpen(x)} onKeyDown={(e) => e.key === "Enter" && setOpen(x)} data-testid="tx-row">
              <span className={`sa-tx-type t-${x.type}`}>{label(x)}</span>
              <span className="sa-list-main">
                <b>{txTitle(x, tt) || label(x)}</b>
                <small>
                  {fmtDate(x.created_date, true)}
                  {x.business ? ` · ${x.business.name}` : ""}
                  {x.payment_method ? ` · ${x.payment_method}` : ""}
                </small>
              </span>
              <span className="sa-list-side">
                <b className={x.direction === "in" ? "sa-in" : "sa-out"}>
                  {x.direction === "in" ? "+" : "−"}
                  {fmt(x.amount)}
                </b>
                {x.balance_after !== null && x.balance_after !== undefined && (
                  <small>
                    {s.balance}: {fmt(x.balance_after)}
                  </small>
                )}
              </span>
            </li>
          ))}
        </ul>
        {pagination && pagination.currentPage < pagination.totalPages && (
          <div style={{ padding: 16, textAlign: "center" }}>
            <button type="button" className="md-btn md-btn-ghost" onClick={() => setPage((p) => p + 1)} disabled={loading}>
              {t.loadMore}
            </button>
          </div>
        )}
      </section>
      {open && <TxDetail tx={open} view="me" onClose={() => setOpen(null)} />}
    </div>
  );
}
