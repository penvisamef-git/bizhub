import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowRightLeft, Building2, Coins, Landmark, PlusCircle, RefreshCw, Users } from "lucide-react";
import "../admin/master_data/masterdata.css";
import "./super-admin.css";
import { overviewService } from "../../api/services";
import { memo } from "../../lib/memo";
import { fmt, fmtDate, useSaText } from "./text";
import { GenerateModal, Initial, StatusBadge, TransferModal, useNotice, walletName } from "./parts";
import { PageSkeleton } from "../../components/skeleton/Skeleton";
import TxDetail from "../client/TxDetail";

// Ring chart: value 0–100
function Donut({ value, size = 104, stroke = 12, tone = "brand", label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={`sa-donut ${tone}`} style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(v)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="track" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} className="value" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <b>{Math.round(v)}%</b>
    </div>
  );
}

function Card({ title, sub, to, s, className = "", children }) {
  return (
    <section className={`panel-card sa-section ${className}`}>
      <div className="sa-section-head">
        <div>
          <h2>{title}</h2>
          {sub && <small>{sub}</small>}
        </div>
        {to && (
          <Link to={to} className="sa-more" aria-label={`${s.viewAll}: ${title}`}>
            <ArrowRight size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const pct = (part, total) => (total ? (part / total) * 100 : 0);

export default function SuperDashboardPage() {
  const { s } = useSaText();
  const [data, setData] = useState(() => memo.get("overview") || null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // "generate" | "transfer"
  const [openTx, setOpenTx] = useState(null); // the transaction in the details window
  const [notice, setNotice] = useNotice();

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    overviewService
      .get()
      .then((r) => {
        memo.set("overview", r.data);
        setData(r.data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const done = (text) => {
    setNotice({ type: "success", text });
    load();
  };

  if (error && !data) {
    return (
      <div className="panel-card sa-empty-state">
        <p>{s.loadFail}</p>
        <button type="button" className="md-btn md-btn-primary" onClick={load}>
          {s.retry}
        </button>
      </div>
    );
  }

  const d = data;
  const signups = d?.signups_14d || [];
  const maxSignup = Math.max(1, ...signups.map((x) => x.count));
  const peak = signups.reduce((best, x, i) => (x.count > (signups[best]?.count || 0) ? i : best), -1);
  const totalCoins = d ? d.coins.treasury + d.coins.in_wallets : 0;
  const serviceTotal = Math.max(1, ...(d?.types || []).map((x) => x.count));
  const signups14 = signups.reduce((n, x) => n + x.count, 0);

  if (!d && !error) return <PageSkeleton />;

  return (
    <div className="md-page sa-page" aria-busy={loading}>
      {notice}

      <div className="sa-toolbar">
        <p className="sa-muted" style={{ margin: 0 }}>
          {s.saSub}
        </p>
        <button type="button" className="md-btn md-btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? "md-spin" : ""} /> {s.refresh}
        </button>
      </div>

      {/* row 1: chart + donuts */}
      <div className="sa-row sa-row-main">
        <Card title={s.signups14} sub={`${fmt(signups14)} ${s.total}`} s={s} to="/app/super-admin/customers" className="sa-chart-card">
          <div className="sa-chart">
            <div className="sa-chart-side">
              <span>{s.customers}</span>
              <b>{d ? fmt(d.customers.total) : "—"}</b>
              <small>{d ? `+${fmt(d.customers.new_7d)} ${s.newThisWeek}` : ""}</small>
            </div>
            <div className="sa-bars" role="img" aria-label={s.signups14}>
              {signups.map((x, i) => (
                <div key={x.date} className={`sa-bar ${i === peak && x.count ? "peak" : ""}`} title={`${x.date}: ${x.count}`}>
                  <span className="sa-bar-track">
                    {i === peak && x.count > 0 && <span className="sa-bar-tip">{x.count}</span>}
                    <i style={{ height: `${(x.count / maxSignup) * 100}%` }} />
                  </span>
                  <span className="sa-bar-day">{x.date.slice(8)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title={s.status} s={s}>
          <div className="sa-donuts">
            <div className="sa-donut-row">
              <Donut value={pct(d?.customers.active, d?.customers.total)} label={s.customers} />
              <div>
                <b>{s.customers}</b>
                <ul className="sa-legend">
                  <li>
                    <i className="dot brand" /> {s.active} <span>{d ? fmt(d.customers.active) : "—"}</span>
                  </li>
                  <li>
                    <i className="dot muted" /> {s.suspended} <span>{d ? fmt(d.customers.suspended) : "—"}</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="sa-donut-row">
              <Donut value={pct(d?.businesses.active, d?.businesses.total)} tone="dark" label={s.businesses} />
              <div>
                <b>{s.businesses}</b>
                <ul className="sa-legend">
                  <li>
                    <i className="dot dark" /> {s.active} <span>{d ? fmt(d.businesses.active) : "—"}</span>
                  </li>
                  <li>
                    <i className="dot muted" /> {s.suspended} <span>{d ? fmt(d.businesses.suspended) : "—"}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* row 2: key numbers */}
      <section className="panel-card sa-strip">
        {[
          [Users, s.customers, d?.customers.total, d && `+${fmt(d.customers.new_7d)} ${s.newThisWeek}`, "/app/super-admin/customers"],
          [Building2, s.businesses, d?.businesses.total, d && `+${fmt(d.businesses.new_7d)} ${s.newThisWeek}`, "/app/super-admin/businesses"],
          [Landmark, s.treasury, d?.coins.treasury, d && `${s.generated}: ${fmt(d.coins.generated_total)}`, "/app/super-admin/coins"],
          [Coins, s.inWallets, d?.coins.in_wallets, d && `${s.signupBonus}: ${fmt(d.coins.signup_bonus_total)}`, "/app/super-admin/coins"],
        ].map(([Icon, label, value, sub, to]) => (
          <Link key={label} to={to} className="sa-strip-item">
            <span className="sa-round-icon">
              <Icon size={20} />
            </span>
            <span className="sa-strip-text">
              <small>{label}</small>
              <b>{value === undefined ? "—" : fmt(value)}</b>
              {sub && <em>{sub}</em>}
            </span>
          </Link>
        ))}
      </section>

      {/* row 3 */}
      <div className="sa-row sa-row-3">
        <Card title={s.servicesUsed} s={s} to="/app/super-admin/businesses">
          <ul className="sa-progress">
            {(d?.types || []).map((x, i) => (
              <li key={x.key}>
                <div>
                  <i className={`dot c${i % 6}`} />
                  <span>{s.categoryNames[x.key] || x.key}</span>
                  <b>{fmt(x.count)}</b>
                </div>
                <span className="sa-progress-track">
                  <i className={`c${i % 6}`} style={{ width: `${(x.count / serviceTotal) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={s.recentCustomers} s={s} to="/app/super-admin/customers">
          {d?.recent_customers?.length ? (
            <ul className="sa-list">
              {d.recent_customers.slice(0, 5).map((c) => (
                <li key={c._id}>
                  <Link to={`/app/super-admin/customers?open=${c._id}`} className="sa-list-row">
                    <Initial name={c.name} />
                    <span className="sa-list-main">
                      <b>{c.name}</b>
                      <small>{c.email}</small>
                    </span>
                    <span className="sa-list-side">
                      <StatusBadge on={c.status} />
                      <small>{fmtDate(c.created_date)}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sa-muted">{s.nothingYet}</p>
          )}
        </Card>

        <section className="sa-treasury">
          <div className="sa-treasury-top">
            <div>
              <span>{s.treasury}</span>
              <b>{d ? fmt(d.coins.treasury) : "—"}</b>
              <small>
                {s.inWallets}: {d ? fmt(d.coins.in_wallets) : "—"}
              </small>
            </div>
            <Donut value={pct(d?.coins.treasury, totalCoins)} size={92} stroke={11} tone="white" label={s.treasury} />
          </div>
          <div className="sa-treasury-actions">
            <button type="button" onClick={() => setModal("generate")}>
              <PlusCircle size={16} /> {s.generateCoins}
            </button>
            <button type="button" onClick={() => setModal("transfer")}>
              <ArrowRightLeft size={16} /> {s.transferCoins}
            </button>
          </div>
        </section>
      </div>

      {/* row 4 */}
      <div className="sa-row sa-row-3">
        <Card title={s.recentBusinesses} s={s} to="/app/super-admin/businesses">
          {d?.recent_businesses?.length ? (
            <ul className="sa-list">
              {d.recent_businesses.slice(0, 5).map((b) => (
                <li key={b._id} className="sa-list-row">
                  <Initial name={b.name} />
                  <span className="sa-list-main">
                    <b>{b.name}</b>
                    <small>
                      {s.categoryNames[b.category] || b.category} · {b.owner_id?.name || "-"}
                    </small>
                  </span>
                  <StatusBadge on={b.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="sa-muted">{s.nothingYet}</p>
          )}
        </Card>

        <Card title={s.recentCoins} s={s} to="/app/super-admin/coins">
          {d?.recent_transactions?.length ? (
            <ul className="sa-list">
              {d.recent_transactions.slice(0, 5).map((x) => (
                <li key={x._id} className="sa-list-row tx-click" role="button" tabIndex={0} onClick={() => setOpenTx(x)} onKeyDown={(e) => e.key === "Enter" && setOpenTx(x)}>
                  <span className={`sa-tx-type t-${x.type}`}>{s.typeNames[x.type] || x.type}</span>
                  <span className="sa-list-main">
                    <b>
                      {x.type === "generate" || x.type === "signup_bonus" ? "+" : ""}
                      {fmt(x.amount)}
                    </b>
                    <small>{x.type === "generate" ? s.treasuryWallet : x.type === "signup_bonus" ? walletName(x.to_customer, s) : `${walletName(x.from_customer, s)} → ${walletName(x.to_customer, s)}`}</small>
                  </span>
                  <span className="sa-list-side">
                    <small>{fmtDate(x.created_date, true)}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sa-muted">{s.nothingYet}</p>
          )}
        </Card>

        <Card title={s.recentActivity} s={s} to="/app/admin/activity-log">
          {d?.recent_activity?.length ? (
            <ul className="sa-list sa-activity">
              {d.recent_activity.slice(0, 5).map((a) => (
                <li key={a._id}>
                  <b>{a.title}</b>
                  <small>
                    {a.time} {a.description ? `· ${a.description}` : ""}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sa-muted">{s.nothingYet}</p>
          )}
        </Card>
      </div>

      {modal === "generate" && <GenerateModal onClose={() => setModal(null)} onDone={done} />}
      {modal === "transfer" && <TransferModal onClose={() => setModal(null)} onDone={done} />}
      {openTx && <TxDetail tx={openTx} view="admin" onClose={() => setOpenTx(null)} />}
    </div>
  );
}
