import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import BizDetail from "./BizDetail";
import SearchSelect from "../../components/SearchSelect";
import { RefreshCw, Search, ShieldBan, ShieldCheck } from "lucide-react";
import "../admin/master_data/masterdata.css";
import "./super-admin.css";
import { businessAdminService } from "../../api/services";
import { memo } from "../../lib/memo";
import { CATEGORY_KEYS, fmtDate, useSaText } from "./text";
import { Initial, Modal, Pager, StatusBadge, useNotice } from "./parts";
import { TableSkeletonRows } from "../../components/skeleton/Skeleton";

export default function BusinessesPage() {
  const { s } = useSaText();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const saved = memo.get("businesses") || {};
  const [rows, setRows] = useState(saved.rows || []);
  const [pagination, setPagination] = useState(saved.pagination || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [target, setTarget] = useState(null); // business to suspend
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useNotice();
  // one business in detail: ?open=<id>
  const [params, setParams] = useSearchParams();
  const openId = params.get("open") || "";
  const openBiz = (id) => setParams(id ? { open: id } : {}, { replace: true });

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    businessAdminService
      .list({ q, status, category, page, limit: 20 })
      .then((r) => {
        setRows(r.data || []);
        setPagination(r.pagination);
        if (!q && !status && !category && page === 1) memo.set("businesses", { rows: r.data || [], pagination: r.pagination });
      })
      .catch((e) => setError(e.message || s.loadFail))
      .finally(() => setLoading(false));
  }, [q, status, category, page, s.loadFail]);

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

  const changeStatus = async (b, on, adminNote) => {
    setBusy(true);
    setFormError("");
    try {
      const r = await businessAdminService.setStatus(b._id, on, adminNote);
      setNotice({ type: "success", text: r.message || s.done });
      setTarget(null);
      load();
    } catch (e) {
      if (target) setFormError(e.message);
      else setNotice({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const resetPage = (fn) => (e) => {
    fn(e.target.value);
    setPage(1);
  };

  return (
    <div className="md-page sa-page">
      {notice}

      <div className="md-toolbar">
        <div className="sa-filters">
          <div className="md-search">
            <Search size={16} />
            <input value={q} placeholder={s.searchBiz} onChange={resetPage(setQ)} aria-label={s.searchBiz} />
          </div>
          <select className="sa-select" value={status} onChange={resetPage(setStatus)} aria-label={s.status}>
            <option value="">{s.all}</option>
            <option value="active">{s.active}</option>
            <option value="suspended">{s.suspended}</option>
          </select>
          <SearchSelect
            className="sa-select"
            value={category}
            onChange={(v) => resetPage(setCategory)({ target: { value: v } })}
            ariaLabel={s.category}
            searchPh={s.typeSearch}
            empty={s.typeNoMatch}
            testid="sa-biz-type"
            options={[{ value: "", label: s.allCategories }, ...CATEGORY_KEYS.map((k) => ({ value: k, label: s.categoryNames[k] }))]}
          />
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
                <th>{s.owner}</th>
                <th>{s.category}</th>
                <th>{s.created}</th>
                <th>{s.status}</th>
                <th className="md-col-actions">{s.actions}</th>
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
              {rows.map((b) => (
                <tr key={b._id}>
                  <td>
                    <button type="button" className="sa-cell-person sa-row-open" onClick={() => openBiz(b._id)} data-testid="sa-biz-open">
                      <Initial name={b.name} />
                      <span>
                        <b>{b.name}</b>
                      </span>
                    </button>
                  </td>
                  <td>
                    {b.owner_id ? (
                      <Link className="sa-link" to={`/app/super-admin/customers?open=${b.owner_id._id}`}>
                        {b.owner_id.name}
                      </Link>
                    ) : (
                      "-"
                    )}
                    <small className="sa-block">{b.owner_id?.email}</small>
                  </td>
                  <td>
                    <span className={`sa-type t-${b.category}`}>{s.categoryNames[b.category] || b.category}</span>
                  </td>
                  <td>{fmtDate(b.created_date)}</td>
                  <td>
                    <StatusBadge on={b.status} />
                  </td>
                  <td className="md-col-actions">
                    {b.status ? (
                      <button
                        type="button"
                        className="md-btn md-btn-ghost sa-btn-sm sa-danger-text"
                        onClick={() => {
                          setTarget(b);
                          setNote(b.admin_note || "");
                          setFormError("");
                        }}
                      >
                        <ShieldBan size={15} /> {s.suspend}
                      </button>
                    ) : (
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => changeStatus(b, true)} disabled={busy}>
                        <ShieldCheck size={15} /> {s.activate}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager pagination={pagination} onPage={setPage} />
      </div>

      {openId && (
        <BizDetail
          key={openId}
          id={openId}
          onClose={() => openBiz("")}
          onStatus={(b, on) => {
            if (on) changeStatus(b, true).then(() => openBiz(""));
            else {
              openBiz("");
              setTarget(b);
              setNote(b.admin_note || "");
              setFormError("");
            }
          }}
        />
      )}
      {target && (
        <Modal
          title={s.suspend}
          size="md-modal-sm"
          busy={busy}
          onClose={() => setTarget(null)}
          footer={
            <>
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setTarget(null)} disabled={busy}>
                {s.cancel}
              </button>
              <button type="button" className="md-btn md-btn-danger" onClick={() => changeStatus(target, false, note)} disabled={busy}>
                {busy ? s.saving : s.suspend}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            <b>{target.name}</b> · {target.owner_id?.name}
          </p>
          <p className="md-hint" style={{ margin: 0 }}>
            {s.suspendBizConfirm}
          </p>
          <div className="md-field">
            <label htmlFor="b-note">{s.adminNote}</label>
            <input id="b-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {formError && <div className="md-form-error">{formError}</div>}
        </Modal>
      )}
    </div>
  );
}
