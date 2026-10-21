import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, CalendarClock, Database, MessageCircle, ShieldBan, ShieldCheck, Store, TrendingUp, UserRound } from "lucide-react";
import { businessAdminService, platformAdminService } from "../../api/services";
import { Modal, StatusBadge } from "./parts";
import { useI18n } from "../../i18n/I18nProvider";
import { useLicenseText } from "../client/licenses/text";
import { bizTypeName } from "./BizTypes";
import CoinIcon from "../../components/CoinIcon";
import "./bizdetail.css";

const TEXT = {
  en: {
    owner: "Owner",
    created: "Created {date}",
    today: "Today",
    month: "This month",
    d30: "Last 30 days",
    avg: "Average bill",
    bills: "{n} bills",
    noSales: "No sales in the last 30 days.",
    lastSale: "Last sale {date}",
    licenses: "Licenses & add-ons",
    forever: "Forever",
    until: "Until {date}",
    ended: "Ended {date}",
    coins: "Coins spent on it",
    payments: "{n} payments",
    data: "Its data",
    records: "{n} records",
    others: "Other businesses of this owner",
    chat: "Chat with the owner",
    openOwner: "Open owner",
    suspend: "Suspend",
    activate: "Activate",
    note: "Admin note",
    noData: "Nothing yet.",
  },
  km: {
    owner: "ម្ចាស់",
    created: "បង្កើត {date}",
    today: "ថ្ងៃនេះ",
    month: "ខែនេះ",
    d30: "30 ថ្ងៃចុងក្រោយ",
    avg: "វិក្កយបត្រមធ្យម",
    bills: "{n} វិក្កយបត្រ",
    noSales: "គ្មានការលក់ក្នុង 30 ថ្ងៃចុងក្រោយ។",
    lastSale: "លក់ចុងក្រោយ {date}",
    licenses: "អាជ្ញាប័ណ្ណ & មុខងារបន្ថែម",
    forever: "ជារៀងរហូត",
    until: "ដល់ {date}",
    ended: "បានផុត {date}",
    coins: "កាក់ដែលបានចំណាយ",
    payments: "{n} ដង",
    data: "ទិន្នន័យរបស់វា",
    records: "{n} ទិន្នន័យ",
    others: "អាជីវកម្មផ្សេងទៀតរបស់ម្ចាស់",
    chat: "ជជែកជាមួយម្ចាស់",
    openOwner: "បើកម្ចាស់",
    suspend: "ផ្អាក",
    activate: "បើកវិញ",
    note: "កំណត់ចំណាំ",
    noData: "មិនទាន់មាន។",
  },
};
const money = (v, cur) => (cur === "KHR" ? `${Math.round(Number(v) || 0).toLocaleString("en-US")}៛` : `$${(Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
// MartSaleItem → "Mart sale item"
const modelName = (m) =>
  m
    .replace(/^(Rest|Mart|Gh|Att)(?=[A-Z])/, (p) => `${{ Rest: "Restaurant", Mart: "Mini mart", Gh: "Guest house", Att: "Attendance" }[p]} · `)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

// Super admin: one business in detail (sales, licenses, coins, its data, the owner)
export default function BizDetail({ id, onClose, onStatus }) {
  const { lang } = useI18n();
  const x = TEXT[lang] || TEXT.en;
  const { l } = useLicenseText();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    businessAdminService
      .report(id)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, [id]);
  const fmtDate = (d) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d)) : "");
  const b = data?.business;
  const s = data?.sales;
  const max = s ? Math.max(1, ...s.series.map((d) => d.sales)) : 1;
  const nameOf = (lc) => `${l.products[lc.product] || lc.product}${lc.item ? ` · ${lc.item}` : ""}`;
  return (
    <Modal title={b ? b.name : "…"} onClose={onClose} size="md-modal-lg bd-modal">
      {error ? (
        <div className="md-form-error">{error}</div>
      ) : !data ? (
        <p className="md-hint">…</p>
      ) : (
        <div className="bd">
          <div className="bd-head">
            <span className={`sa-type t-${b.category}`}>{bizTypeName(b.category, lang)}</span>
            <StatusBadge on={b.status} />
            <small className="md-hint">{x.created.replace("{date}", fmtDate(b.created_date))}</small>
            {b.admin_note && <small className="bd-note">📝 {b.admin_note}</small>}
            <span className="bd-acts">
              {b.status ? (
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={() => onStatus(b, false)}>
                  <ShieldBan size={14} /> {x.suspend}
                </button>
              ) : (
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => onStatus(b, true)}>
                  <ShieldCheck size={14} /> {x.activate}
                </button>
              )}
            </span>
          </div>
          <div className="bd-owner">
            <span className="bd-av">
              <UserRound size={18} />
            </span>
            <span className="bd-owner-main">
              <small className="md-hint">{x.owner}</small>
              <b>{b.owner_id?.name || "—"}</b>
              <small>{[b.owner_id?.email, b.owner_id?.phone].filter(Boolean).join(" · ")}</small>
            </span>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => navigate(`/app/super-admin/customers?open=${b.owner_id?._id}`)}>
              {x.openOwner}
            </button>
            <button
              type="button"
              className="md-btn md-btn-primary sa-btn-sm"
              onClick={() =>
                platformAdminService
                  .startChat(b.owner_id?._id)
                  .then((r) => navigate(`/app/super-admin/inbox?t=${r.data._id}`))
                  .catch(() => {})
              }
            >
              <MessageCircle size={14} /> {x.chat}
            </button>
          </div>
          {s && (
            <section className="bd-sec">
              <h4>
                <TrendingUp size={16} /> {x.d30}
              </h4>
              <div className="bd-kpis">
                <span>
                  <small>{x.today}</small>
                  <b>{money(s.today, s.currency)}</b>
                  <small>{x.bills.replace("{n}", s.today_bills)}</small>
                </span>
                <span>
                  <small>{x.month}</small>
                  <b>{money(s.month, s.currency)}</b>
                  <small>{x.bills.replace("{n}", s.month_bills)}</small>
                </span>
                <span>
                  <small>{x.d30}</small>
                  <b data-testid="bd-d30">{money(s.d30, s.currency)}</b>
                  <small>{x.bills.replace("{n}", s.d30_bills)}</small>
                </span>
                <span>
                  <small>{x.avg}</small>
                  <b>{money(s.avg, s.currency)}</b>
                  <small>{s.last_sale ? x.lastSale.replace("{date}", fmtDate(s.last_sale)) : ""}</small>
                </span>
              </div>
              {s.d30 > 0 ? (
                <div className="bd-chart" aria-hidden="true">
                  {s.series.map((d) => (
                    <i key={d.day} style={{ height: `${Math.max(2, (d.sales / max) * 100)}%` }} title={`${d.day} · ${money(d.sales, s.currency)}`} />
                  ))}
                </div>
              ) : (
                <p className="md-hint">{x.noSales}</p>
              )}
            </section>
          )}
          <div className="bd-two">
            <section className="bd-sec">
              <h4>
                <BadgeCheck size={16} /> {x.licenses} ({data.licenses.length})
              </h4>
              {!data.licenses.length ? (
                <p className="md-hint">{x.noData}</p>
              ) : (
                <div className="bd-list">
                  {data.licenses.map((lc) => (
                    <div key={lc._id} className={`bd-row s-${lc.status}`}>
                      <span>{nameOf(lc)}</span>
                      <small>
                        {lc.status === "forever" ? (
                          x.forever
                        ) : (
                          <>
                            <CalendarClock size={12} /> {(lc.status === "expired" ? x.ended : x.until).replace("{date}", fmtDate(lc.expires_at))}
                          </>
                        )}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="bd-sec">
              <h4>
                <CoinIcon size={16} /> {x.coins}
              </h4>
              <div className="bd-coins">
                <b>{fmt(data.coins.spent)}</b>
                <small className="md-hint">{x.payments.replace("{n}", data.coins.payments)}</small>
              </div>
              <div className="bd-list">
                {data.coins.recent.map((t) => (
                  <div key={t._id} className="bd-row">
                    <span>{(t.note || t.service || "").replace(/^([a-z]+_[a-z_]+)\b/, (k) => l.products[k] || k)}</span>
                    <small>
                      −{fmt(t.amount)} · {fmtDate(t.created_date)}
                    </small>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="bd-two">
            <section className="bd-sec">
              <h4>
                <Database size={16} /> {x.data} · {x.records.replace("{n}", fmt(data.records))}
              </h4>
              <div className="bd-list">
                {data.data.slice(0, 14).map((d) => (
                  <div key={d.model} className="bd-row">
                    <span>{modelName(d.model)}</span>
                    <b>{fmt(d.n)}</b>
                  </div>
                ))}
              </div>
            </section>
            <section className="bd-sec">
              <h4>
                <Store size={16} /> {x.others} ({data.others.length})
              </h4>
              {!data.others.length ? (
                <p className="md-hint">{x.noData}</p>
              ) : (
                <div className="bd-list">
                  {data.others.map((o) => (
                    <div key={o._id} className="bd-row">
                      <span>{o.name}</span>
                      <small>
                        {bizTypeName(o.category, lang)}
                        {!o.status ? " · ⛔" : ""}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </Modal>
  );
}
