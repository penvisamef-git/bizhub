import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import "../admin/master_data/masterdata.css";
import "./super-admin.css";
import "../client/licenses/licenses.css";
import { licenseAdminService } from "../../api/services";
import { memo } from "../../lib/memo";
import { fmtDate } from "./text";
import { Initial, Pager } from "./parts";
import { useLicenseText } from "../client/licenses/text";
import CoinIcon from "../../components/CoinIcon";
import { TableSkeletonRows } from "../../components/skeleton/Skeleton";
import { BizTypeChips, bizTypeName } from "./BizTypes";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// Super admin: every license customers bought, what ends soon, what expired
export default function LicensesAdminPage() {
  const { l, lang } = useLicenseText();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [product, setProduct] = useState("");
  const [kind, setKind] = useState(""); // "" | forever | renew
  const [type, setType] = useState(""); // business type
  const [types, setTypes] = useState(() => memo.get("adminLicenses")?.types || []);
  const [productTypes, setProductTypes] = useState(() => memo.get("adminLicenses")?.productTypes || {});
  const [page, setPage] = useState(1);
  const saved = memo.get("adminLicenses") || {};
  const [rows, setRows] = useState(saved.rows || []);
  const [summary, setSummary] = useState(saved.summary || null);
  const [products, setProducts] = useState(saved.products || ["portfolio"]);
  const [pagination, setPagination] = useState(saved.pagination || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    licenseAdminService
      .list({ q, status, kind, type, product, page, limit: 20 })
      .then((r) => {
        setRows(r.data || []);
        setSummary(r.summary);
        setProducts(r.products || []);
        setPagination(r.pagination);
        setTypes(r.types || []);
        setProductTypes(r.product_types || {});
        if (!q && !status && !kind && !type && !product && page === 1) memo.set("adminLicenses", { rows: r.data, summary: r.summary, products: r.products, pagination: r.pagination, types: r.types, productTypes: r.product_types });
      })
      .catch((e) => setError(e.message || l.loadFail))
      .finally(() => setLoading(false));
  }, [q, status, kind, type, product, page, l.loadFail]);

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

  const tiles = [
    ["active", l.active, summary?.active],
    ["expiring", l.expiring, summary?.expiring],
    ["expired", l.expired, summary?.expired],
  ];

  return (
    <div className="md-page sa-page">
      <p className="md-hint" style={{ margin: 0 }}>
        {l.adminSub.replace("{n}", 14)}
      </p>
      <BizTypeChips
        value={type}
        counts={Object.fromEntries(types.map((x) => [x.key, x.count]))}
        total={types.reduce((a, x) => a + x.count, 0) || undefined}
        types={types.length ? types.map((x) => x.key) : undefined}
        onChange={(t) => {
          setType(t);
          setProduct("");
          setPage(1);
        }}
      />
      <div className="lc-tiles" role="tablist" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {tiles.map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={status === key}
            className={`lc-tile t-${key} ${status === key ? "on" : ""}`}
            onClick={() => {
              setStatus(status === key ? "" : key);
              setPage(1);
            }}
          >
            <span>{label}</span>
            <b>{n ?? "—"}</b>
          </button>
        ))}
      </div>

      <div className="md-toolbar">
        <div className="sa-filters">
          <div className="md-search">
            <Search size={16} />
            <input
              value={q}
              placeholder={l.search}
              aria-label={l.search}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="sa-select"
            value={status}
            aria-label={l.status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{l.all}</option>
            <option value="active">{l.active}</option>
            <option value="expiring">{l.expiring}</option>
            <option value="expired">{l.expired}</option>
            <option value="forever">{l.forever}</option>
          </select>
          <select
            className="sa-select"
            value={kind}
            aria-label={l.kindForever}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{l.allKinds}</option>
            <option value="forever">{l.kindForever}</option>
            <option value="renew">{l.kindRenew}</option>
          </select>
          <select
            className="sa-select"
            value={product}
            aria-label={l.product}
            onChange={(e) => {
              setProduct(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{l.allProducts}</option>
            {products.map((p) => (
              <option key={p} value={p}>
                {l.products[p] || p}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="md-btn md-btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? "md-spin" : ""} /> {l.refresh}
        </button>
      </div>

      <div className="md-card">
        <div className="md-table-scroll">
          <table className="md-table sa-table">
            <thead>
              <tr>
                <th>{l.customer}</th>
                <th>{l.business}</th>
                <th>{l.product}</th>
                <th>{l.status}</th>
                <th>{l.end}</th>
                <th>{l.paid}</th>
                <th>{l.renewals}</th>
              </tr>
            </thead>
            <tbody>
              {error && (
                <tr>
                  <td colSpan={7} className="md-empty md-empty-error">
                    {error}
                  </td>
                </tr>
              )}
              {loading && !error && rows.length === 0 && <TableSkeletonRows cols={7} />}
              {!error && !loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="md-empty">
                    {l.noResults}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>
                    <span className="sa-cell-person">
                      <Initial name={r.customer?.name} />
                      <span>
                        {r.customer ? (
                          <Link className="sa-link" to={`/app/super-admin/customers?open=${r.customer._id}`}>
                            {r.customer.name}
                          </Link>
                        ) : (
                          "-"
                        )}
                        <small className="sa-block">{r.customer?.email}</small>
                      </span>
                    </span>
                  </td>
                  <td>
                    {r.business?.name || "-"}
                    {productTypes[r.product] && <small className={`sa-block bt-tag t-${productTypes[r.product]}`}>{bizTypeName(productTypes[r.product], lang)}</small>}
                  </td>
                  <td>
                    {l.products[r.product] || r.product}
                    {r.item && <small className="sa-block">{r.item}</small>}
                    <small className="sa-block">{r.forever ? l.forever : l.productSub?.[r.product] || l.kindRenew}</small>
                  </td>
                  <td>
                    <span className={`lc-badge s-${r.status}`}>{l[r.status] || r.status}</span>
                  </td>
                  <td>
                    {r.expires_at ? fmtDate(r.expires_at) : l.neverEnds}
                    {r.expires_at && r.status !== "expired" && <small className="sa-block">{l.daysLeft.replace("{n}", r.days_left)}</small>}
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <CoinIcon size={14} /> {fmt(r.total_paid)}
                    </span>
                  </td>
                  <td>{r.renewals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager pagination={pagination} onPage={setPage} />
      </div>
    </div>
  );
}
