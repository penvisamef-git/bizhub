import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Coins, KeyRound, RefreshCw, Search, ShieldBan, ShieldCheck, X } from "lucide-react";
import "../admin/master_data/masterdata.css";
import "./super-admin.css";
import { customerAdminService } from "../../api/services";
import { memo } from "../../lib/memo";
import { fmt, fmtDate, useSaText } from "./text";
import { Initial, Modal, Pager, StatusBadge, TransferModal, useNotice } from "./parts";
import TxDetail from "../client/TxDetail";
import { PageSkeleton, TableSkeletonRows } from "../../components/skeleton/Skeleton";

// Customer detail: businesses, coins, actions
function CustomerDrawer({ id, onClose, onChanged, notify }) {
  const { s } = useSaText();
  const [c, setC] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); // "suspend" | "password" | "coins"
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [openTx, setOpenTx] = useState(null); // the transaction in the details window

  const load = useCallback(() => {
    customerAdminService
      .get(id)
      .then((r) => {
        setC(r.data);
        setNote(r.data.admin_note || "");
      })
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !dialog && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, dialog]);

  const setStatus = async (status) => {
    setBusy(true);
    setFormError("");
    try {
      await customerAdminService.setStatus(c._id, status, note);
      setDialog(null);
      load();
      onChanged();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setFormError("");
    if (password.length < 8) return setFormError(s.passwordMin);
    setBusy(true);
    try {
      await customerAdminService.resetPassword(c._id, password);
      setDialog(null);
      setPassword("");
      notify({ type: "success", text: s.passwordReset });
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sa-drawer-backdrop" onMouseDown={onClose} />
      <aside className="sa-drawer" role="dialog" aria-modal="true" aria-label={s.detail}>
        <div className="sa-drawer-head">
          <h3>{s.detail}</h3>
          <button type="button" className="md-icon-btn" onClick={onClose} aria-label={s.close}>
            <X size={18} />
          </button>
        </div>
        {error && <div className="md-form-error">{error}</div>}
        {!c && !error && <PageSkeleton />}
        {c && (
          <div className="sa-drawer-body">
            <div className="sa-person">
              <Initial name={c.name} />
              <div>
                <b>{c.name}</b>
                <small>{c.email}</small>
                <small>{c.phone || "-"}</small>
              </div>
              <StatusBadge on={c.status} />
            </div>

            <div className="sa-mini-stats">
              <div>
                <span>{s.coins}</span>
                <b>{fmt(c.coin_balance)}</b>
              </div>
              <div>
                <span>{s.businesses}</span>
                <b>{fmt(c.businesses.length)}</b>
              </div>
              <div>
                <span>{s.activeSessions}</span>
                <b>{fmt(c.active_sessions)}</b>
              </div>
            </div>
            <p className="sa-muted">
              {s.joined}: {fmtDate(c.created_date)} · {s.lastLogin}: {fmtDate(c.last_login_date, true)}
            </p>
            {c.admin_note && <p className="sa-note">{c.admin_note}</p>}

            <div className="sa-actions">
              <button type="button" className="md-btn md-btn-primary" onClick={() => setDialog("coins")} disabled={!c.status}>
                <Coins size={16} /> {s.sendCoins}
              </button>
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setDialog("password")}>
                <KeyRound size={16} /> {s.resetPassword}
              </button>
              {c.status ? (
                <button type="button" className="md-btn md-btn-ghost sa-danger-text" onClick={() => setDialog("suspend")}>
                  <ShieldBan size={16} /> {s.suspend}
                </button>
              ) : (
                <button type="button" className="md-btn md-btn-ghost" onClick={() => setStatus(true)} disabled={busy}>
                  <ShieldCheck size={16} /> {s.activate}
                </button>
              )}
            </div>

            <h4>{s.businesses}</h4>
            {c.businesses.length === 0 ? (
              <p className="sa-muted">{s.noBusinesses}</p>
            ) : (
              <ul className="sa-list">
                {c.businesses.map((b) => (
                  <li key={b._id} className="sa-list-row">
                    <Initial name={b.name} />
                    <span className="sa-list-main">
                      <b>{b.name}</b>
                      <small>{s.categoryNames[b.category] || b.category}</small>
                    </span>
                    <StatusBadge on={b.status} />
                  </li>
                ))}
              </ul>
            )}

            <h4>{s.coinHistory}</h4>
            {c.transactions.length === 0 ? (
              <p className="sa-muted">{s.nothingYet}</p>
            ) : (
              <ul className="sa-list">
                {c.transactions.map((x) => {
                  const incoming = String(x.to_customer?._id || x.to_customer) === String(c._id);
                  return (
                    <li key={x._id} className="sa-list-row tx-click" role="button" tabIndex={0} onClick={() => setOpenTx(x)} onKeyDown={(e) => e.key === "Enter" && setOpenTx(x)}>
                      <span className={`sa-tx-type t-${x.type}`}>{s.typeNames[x.type] || x.type}</span>
                      <span className="sa-list-main">
                        <b className={incoming ? "sa-in" : "sa-out"}>
                          {incoming ? "+" : "−"}
                          {fmt(x.amount)}
                        </b>
                        <small>
                          {x.note}
                          {x.payment?.method ? ` · ${x.payment.method}${x.payment.amount_usd ? ` $${x.payment.amount_usd}` : ""}` : ""}
                        </small>
                      </span>
                      <span className="sa-list-side">
                        <small>{fmtDate(x.created_date, true)}</small>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </aside>
      {openTx && c && <TxDetail tx={openTx} view="admin" meId={c._id} onClose={() => setOpenTx(null)} />}

      {dialog === "suspend" && c && (
        <Modal
          title={s.suspend}
          size="md-modal-sm"
          busy={busy}
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setDialog(null)} disabled={busy}>
                {s.cancel}
              </button>
              <button type="button" className="md-btn md-btn-danger" onClick={() => setStatus(false)} disabled={busy}>
                {busy ? s.saving : s.suspend}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            <b>{c.name}</b> ({c.email})
          </p>
          <p className="md-hint" style={{ margin: 0 }}>
            {s.suspendConfirm}
          </p>
          <div className="md-field">
            <label htmlFor="c-note">{s.adminNote}</label>
            <input id="c-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {formError && <div className="md-form-error">{formError}</div>}
        </Modal>
      )}

      {dialog === "password" && c && (
        <Modal
          title={s.resetPassword}
          size="md-modal-sm"
          busy={busy}
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setDialog(null)} disabled={busy}>
                {s.cancel}
              </button>
              <button type="submit" form="c-reset" className="md-btn md-btn-primary" disabled={busy}>
                {busy ? s.saving : s.save}
              </button>
            </>
          }
        >
          <form id="c-reset" onSubmit={resetPassword} className="md-fields">
            <p style={{ margin: 0 }}>
              <b>{c.name}</b> ({c.email})
            </p>
            <div className="md-field">
              <label htmlFor="c-pass">
                {s.newPassword} <span className="md-hint">· {s.passwordMin}</span>
              </label>
              <input id="c-pass" type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            </div>
            {formError && <div className="md-form-error">{formError}</div>}
          </form>
        </Modal>
      )}

      {dialog === "coins" && c && (
        <TransferModal
          initialFrom="treasury"
          initialTo={{ _id: c._id, name: c.name, email: c.email, coin_balance: c.coin_balance }}
          onClose={() => setDialog(null)}
          onDone={(text) => {
            notify({ type: "success", text });
            load();
            onChanged();
          }}
        />
      )}
    </>
  );
}

export default function CustomersPage() {
  const { s } = useSaText();
  const [params, setParams] = useSearchParams();
  const urlQ = params.get("q");
  const [q, setQ] = useState(urlQ || "");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const saved = memo.get("customers") || {};
  const [rows, setRows] = useState(saved.rows || []);
  const [pagination, setPagination] = useState(saved.pagination || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useNotice();
  const openId = params.get("open");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    customerAdminService
      .list({ q, status, page, limit: 20 })
      .then((r) => {
        setRows(r.data || []);
        setPagination(r.pagination);
        if (!q && !status && page === 1) memo.set("customers", { rows: r.data || [], pagination: r.pagination });
      })
      .catch((e) => setError(e.message || s.loadFail))
      .finally(() => setLoading(false));
  }, [q, status, page, s.loadFail]);

  // wait while typing a search; load right away otherwise
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      load();
      return undefined;
    }
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const open = (id) => setParams(id ? { open: id } : {});

  // search from the header (?q=...)
  useEffect(() => {
    if (urlQ !== null) {
      setQ(urlQ);
      setPage(1);
    }
  }, [urlQ]);

  return (
    <div className="md-page sa-page">
      {notice}

      <div className="md-toolbar">
        <div className="sa-filters">
          <div className="md-search">
            <Search size={16} />
            <input
              value={q}
              placeholder={s.search}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              aria-label={s.search}
            />
          </div>
          <div className="lang-switch" role="group" aria-label={s.status}>
            {[
              ["", s.all],
              ["active", s.active],
              ["suspended", s.suspended],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={status === v}
                onClick={() => {
                  setStatus(v);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
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
                <th>{s.name}</th>
                <th>{s.phone}</th>
                <th className="num">{s.businesses}</th>
                <th className="num">{s.coins}</th>
                <th>{s.joined}</th>
                <th>{s.status}</th>
              </tr>
            </thead>
            <tbody>
              {error && (
                <tr>
                  <td colSpan={6} className="md-empty md-empty-error">
                    {error}
                  </td>
                </tr>
              )}
              {loading && !error && rows.length === 0 && <TableSkeletonRows cols={6} />}
              {!error && !loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="md-empty">
                    {s.noResults}
                  </td>
                </tr>
              )}
              {rows.map((c) => (
                <tr key={c._id} className="sa-click" onClick={() => open(c._id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && open(c._id)}>
                  <td>
                    <span className="sa-cell-person">
                      <Initial name={c.name} />
                      <span>
                        <b>{c.name}</b>
                        <small>{c.email}</small>
                      </span>
                    </span>
                  </td>
                  <td>{c.phone || "-"}</td>
                  <td className="num">{fmt(c.business_count)}</td>
                  <td className="num">
                    <b>{fmt(c.coin_balance)}</b>
                  </td>
                  <td>{fmtDate(c.created_date)}</td>
                  <td>
                    <StatusBadge on={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager pagination={pagination} onPage={setPage} />
      </div>

      {openId && <CustomerDrawer id={openId} onClose={() => open(null)} onChanged={load} notify={setNotice} />}
    </div>
  );
}
