import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
  LayoutGrid,
  List,
  ArrowUpDown,
  ChevronsUp,
  BedDouble,
  BellRing,
  BookOpen,
  NotebookPen,
  StickyNote,
  CalendarClock,
  ChefHat,
  ChevronRight,
  Contact,
  Eye,
  Fingerprint,
  Globe,
  History,
  Inbox,
  PackageX,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  ShoppingBasket,
  Sparkles,
  UserPlus,
  X,
  Stamp,
  Ticket,
  Send,
} from "lucide-react";
import "../admin/master_data/masterdata.css";
import { BIZ_TYPES, bizTypeName } from "../super_admin/BizTypes";
import "../super_admin/super-admin.css";
import "./client.css";
import "./dashboard.css";
import { useI18n } from "../../i18n/I18nProvider";
import { auth } from "../../lib/auth";
import { coinsChanged } from "../../lib/events";
import { dashboardService, myBusinessService } from "../../api/services";
import { memo } from "../../lib/memo";
import { prefetchBizTypes } from "../../pages";
import { useSaText } from "../super_admin/text";
import { Initial, StatusBadge, useNotice } from "../super_admin/parts";
import BusinessModal from "./BusinessModal";
import SearchSelect from "../../components/SearchSelect";
import CoinIcon from "../../components/CoinIcon";
import { fmtDay } from "../../namecard/portfolioText";
import { useLicenseText } from "./licenses/text";
import { useDashText } from "./dash-text";
import SharedSection from "./team/SharedSection";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const money = (n, c) => (c === "KHR" ? `${fmt(Math.round(n))}៛` : `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)}`);
// short money for chart axes: $1.2k
const short = (n, c) => {
  const v = Math.abs(n);
  const s = v >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : v >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : `${Math.round(n)}`;
  return c === "KHR" ? `${s}៛` : `$${s}`;
};
const pct = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
const STALE_MS = 60 * 1000; // refetch on focus when older than this

// Owner home: a bank-style coin card, sales of all restaurants (today / this week / 14 days),
// best sellers, businesses with their own numbers, and what needs attention.
// Shows the last numbers at once (kept per account), then refreshes quietly.
export default function DashboardPage({ only }) {
  const { t } = useI18n();
  const { s } = useSaText();
  const { d, lang } = useDashText();
  const [params, setParams] = useSearchParams();
  const user = auth.getClientLogin() || {};
  const [data, setData] = useState(() => memo.get("dashboard") || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [notice, setNotice] = useNotice();
  const welcome = params.get("welcome") === "1";
  const navigate = useNavigate();
  const lastLoad = useRef(0);

  const load = useCallback((fresh) => {
    setLoading(true);
    lastLoad.current = Date.now();
    dashboardService
      .get(fresh)
      .then((r) => {
        const next = r.data;
        memo.set("dashboard", next);
        memo.set("myBusinesses", next.businesses); // the business picker uses the same list
        prefetchBizTypes((next.businesses || []).map((b) => b.category)); // download the dashboards of these types in the background
        setData(next);
        setError("");
        // keep the coin balance in the top bar right
        const login = auth.getClientLogin();
        if (login && next.coins && login.coin_balance !== next.coins.balance) {
          auth.setClientLogin({ ...login, coin_balance: next.coins.balance });
          coinsChanged();
        }
      })
      .catch((e) => setError(e.message || d.errorLoad))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
    const onFocus = () => document.visibilityState === "visible" && Date.now() - lastLoad.current > STALE_MS && load();
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [load]);

  const hour = new Date().getHours();
  const hello = hour < 12 ? d.morning : hour < 18 ? d.afternoon : d.evening;
  const sales = data?.sales;
  const list = data?.businesses || [];
  // My businesses: search by name + filter by type (owners with many businesses)
  const [bq, setBq] = useState("");
  const [btype, setBtype] = useState("");
  const typeCounts = list.reduce((a, b) => ({ ...a, [b.category]: (a[b.category] || 0) + 1 }), {});
  const types = BIZ_TYPES.filter((k) => typeCounts[k]);
  const qq = bq.trim().toLowerCase();
  // the owner's own order (saved on the server, same on every device) + list / grid view (this browser)
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem("db-biz-view") || "list";
    } catch {
      return "list";
    }
  });
  const pickView = (v) => {
    setView(v);
    try {
      localStorage.setItem("db-biz-view", v);
    } catch {
      /* private mode */
    }
  };
  const [arrange, setArrange] = useState(false);
  const [order, setOrder] = useState(null); // ids while arranging
  const [dragId, setDragId] = useState("");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const byId = useMemo(() => Object.fromEntries(list.map((b) => [b._id, b])), [list]);
  const sorted = order ? [...order.map((id) => byId[id]).filter(Boolean), ...list.filter((b) => !order.includes(b._id))] : list;
  const shown = arrange ? sorted : sorted.filter((b) => (!btype || b.category === btype) && (!qq || b.name.toLowerCase().includes(qq) || (b.namecard?.slug || "").toLowerCase().includes(qq)));
  const saveOrder = (ids) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      myBusinessService
        .order(ids)
        .then((r) => {
          setData((cur) => {
            const next = { ...cur, businesses: r.data };
            memo.set("dashboard", next);
            memo.set("myBusinesses", r.data);
            return next;
          });
        })
        .catch((e) => setNotice({ type: "error", text: e.message || d.errorLoad }))
        .finally(() => setSaving(false));
    }, 500);
  };
  const moveTo = (id, to) => {
    setOrder((cur) => {
      const ids = [...(cur || list.map((b) => b._id))];
      const from = ids.indexOf(id);
      if (from < 0 || to < 0 || to >= ids.length || from === to) return cur;
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      saveOrder(ids);
      return ids;
    });
  };
  const startArrange = () => {
    setBq("");
    setBtype("");
    setOrder(list.map((b) => b._id));
    setArrange(true);
  };
  const endArrange = () => {
    setArrange(false);
    setDragId("");
  };

  const bizList = (
    <section className="panel-card db-biz">
      <div className="db-sec-head">
        <h3>{d.businesses}</h3>
        <div className="db-biz-acts">
          {list.length > 0 && (
            <div className="db-seg" role="tablist" aria-label={d.view}>
              <button type="button" className={view === "list" ? "on" : ""} onClick={() => pickView("list")} aria-label={d.viewList} title={d.viewList} data-testid="db-view-list">
                <List size={16} />
              </button>
              <button type="button" className={view === "grid" ? "on" : ""} onClick={() => pickView("grid")} aria-label={d.viewGrid} title={d.viewGrid} data-testid="db-view-grid">
                <LayoutGrid size={16} />
              </button>
            </div>
          )}
          {list.length > 1 &&
            (arrange ? (
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={endArrange} data-testid="db-arrange-done">
                {saving ? <RefreshCw size={15} className="md-spin" /> : <Check size={15} />} {d.arrangeDone}
              </button>
            ) : (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={startArrange} data-testid="db-arrange">
                <ArrowUpDown size={15} /> {d.arrange}
              </button>
            ))}
          {!arrange && (
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setEditing(null)}>
              <Plus size={16} /> {d.add}
            </button>
          )}
        </div>
      </div>
      {arrange && <p className="db-arrange-hint">{d.arrangeHint}</p>}
      {list.length > 1 && !arrange && (
        <div className="db-biz-tools">
          <label className="db-biz-search">
            <Search size={15} />
            <input value={bq} onChange={(e) => setBq(e.target.value)} placeholder={d.bizSearch} aria-label={d.bizSearch} data-testid="db-biz-q" />
            {bq && (
              <button type="button" onClick={() => setBq("")} aria-label={s.close}>
                <X size={14} />
              </button>
            )}
          </label>
          {types.length > 1 && (
            <SearchSelect
              className="db-biz-type"
              value={btype}
              onChange={setBtype}
              ariaLabel={bizTypeName("", lang)}
              searchPh={d.typeSearch}
              empty={d.typeNoMatch}
              testid="db-biz-type"
              options={[{ value: "", label: bizTypeName("", lang), hint: String(list.length) }, ...types.map((k) => ({ value: k, label: bizTypeName(k, lang), hint: String(typeCounts[k] || 0) }))]}
            />
          )}
        </div>
      )}
      {!data && !error && <div className="db-ghost-rows" />}
      {data && list.length === 0 && <p className="db-muted">{d.none}</p>}
      {data && list.length > 0 && !shown.length && <p className="db-muted">{d.bizNoMatch}</p>}
      <ul className={`db-biz-list ${view === "grid" ? "grid" : ""} ${arrange ? "arranging" : ""}`}>
        {shown.map((b, i) => (
          <BizRow
            key={b._id}
            b={b}
            per={sales?.by_business.find((x) => x.id === b._id)}
            d={d}
            s={s}
            t={t}
            lang={lang}
            grid={view === "grid"}
            onOpen={() => navigate(`/app/business/${b._id}`)}
            onEdit={() => setEditing(b)}
            arrange={
              arrange
                ? {
                    i,
                    n: shown.length,
                    up: () => moveTo(b._id, i - 1),
                    down: () => moveTo(b._id, i + 1),
                    top: () => moveTo(b._id, 0),
                    dragging: dragId === b._id,
                    drag: {
                      draggable: true,
                      onDragStart: (e) => {
                        setDragId(b._id);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", b._id);
                      },
                      onDragOver: (e) => {
                        e.preventDefault();
                        if (dragId && dragId !== b._id) moveTo(dragId, i);
                      },
                      onDragEnd: () => setDragId(""),
                      onDrop: (e) => e.preventDefault(),
                    },
                  }
                : null
            }
          />
        ))}
      </ul>
    </section>
  );
  const modal = editing !== undefined && (
    <BusinessModal
      business={editing}
      onClose={() => setEditing(undefined)}
      onSaved={(text, created) => {
        setNotice({ type: "success", text });
        load(true);
        if (created?._id) navigate(`/app/business/${created._id}`);
      }}
    />
  );
  // "Businesses" tab: only the list
  if (only === "businesses")
    return (
      <div className="md-page sa-page db db-only-biz">
        {notice}
        {error && !data && <div className="md-form-error">{error}</div>}
        {bizList}
        <SharedSection />
        {modal}
      </div>
    );

  return (
    <div className="md-page sa-page db">
      {notice}
      {welcome && (
        <div className="cl-welcome" role="status">
          <span>{t.welcomeBonus.replace("{coins}", fmt(user.coin_balance))}</span>
          <button type="button" className="md-icon-btn" onClick={() => setParams({})} aria-label={s.close}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="db-head">
        <div>
          <h2>
            {hello}, {user.name || user.firstname || user.email}
          </h2>
        </div>
        <button type="button" className="db-refresh" onClick={() => load(true)} disabled={loading} aria-label={d.refresh} title={d.refresh}>
          <RefreshCw size={15} className={loading ? "md-spin" : ""} />
          {data?.at && <span>{d.updated.replace("{t}", new Date(data.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }))}</span>}
        </button>
      </div>
      {error && !data && <div className="md-form-error">{error}</div>}

      <div className={`db-top ${sales ? "" : "no-sales"}`}>
        <CoinCard coins={data?.coins} user={user} d={d} />
        {sales ? (
          <>
            <TodayCard sales={sales} d={d} />
            <WeekCard sales={sales} d={d} />
          </>
        ) : data ? (
          <section className="panel-card db-start">
            <Sparkles size={22} />
            <div>
              <b>{list.length ? d.chartEmpty : d.none}</b>
              <p>{d.noneSub}</p>
            </div>
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setEditing(null)}>
              <Plus size={16} /> {d.add}
            </button>
          </section>
        ) : (
          <>
            <section className="panel-card db-ghost" />
            <section className="panel-card db-ghost" />
          </>
        )}
      </div>

      {sales && (
        <div className="db-mid">
          <SalesChart sales={sales} d={d} lang={lang} />
          <TopItems items={data.top_items} d={d} lang={lang} currency={sales.currency} many={sales.by_business.length > 1} />
        </div>
      )}

      {/* the businesses themselves live on the Businesses page (button in the menu / bottom bar) */}
      <div className="db-bottom solo">
        <RightNow tiles={data?.now} d={d} lang={lang} loading={!data} />
      </div>

      {modal}
    </div>
  );
}

// a payment-card look: chip, balance, masked wallet number, holder
function CoinCard({ coins, user, d }) {
  const balance = coins?.balance ?? user.coin_balance ?? 0;
  const last4 = (coins?.wallet || "").slice(-4).toUpperCase() || "••••";
  return (
    <div className="db-coin">
      <Link to="/app/wallet" className="db-card" aria-label={`${d.coinCard}: ${fmt(balance)}`}>
        <div className="db-card-top">
          <span className="db-card-brand">
            <CoinIcon size={20} /> {d.coinCard}
          </span>
          <span className="db-chip" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
        <b className="db-card-bal">{fmt(balance)}</b>
        <span className="db-card-no">•••• •••• •••• {last4}</span>
        <div className="db-card-foot">
          <span>
            <small>{d.holder}</small>
            {user.name || user.firstname || user.email}
          </span>
          {coins && (
            <span className="r">
              <small>{d.spent30}</small>
              {fmt(coins.spent_30d)}
            </span>
          )}
        </div>
      </Link>
      <div className="db-coin-btns">
        <Link to="/app/licenses?tab=coins" className="md-btn md-btn-primary sa-btn-sm">
          <Plus size={15} /> {d.topUp}
        </Link>
        <Link to="/app/wallet#history" className="md-btn md-btn-ghost sa-btn-sm">
          <History size={15} /> {d.history}
        </Link>
      </div>
    </div>
  );
}

function Delta({ now, before, label, none }) {
  const p = pct(now, before);
  if (p === null) return <span className="db-delta flat">{none}</span>;
  const up = p >= 0;
  return (
    <span className={`db-delta ${up ? "up" : "down"}`}>
      {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {Math.abs(p)}% <em>{label}</em>
    </span>
  );
}

function TodayCard({ sales, d }) {
  const c = sales.currency;
  return (
    <section className="panel-card db-kpi">
      <span className="db-kpi-label">{d.today}</span>
      <b className="db-kpi-num">{money(sales.today, c)}</b>
      <Delta now={sales.today} before={sales.yesterday} label={d.vsYesterday} none={d.noYesterday} />
      <span className="db-kpi-sub">
        {d.yesterday} <b>{money(sales.yesterday, c)}</b>
      </span>
      <dl className="db-kpi-row">
        <div>
          <dt>{d.bills}</dt>
          <dd>{fmt(sales.bills_today)}</dd>
        </div>
        <div>
          <dt>{d.avgBill}</dt>
          <dd>{money(sales.avg_today, c)}</dd>
        </div>
        <div>
          <dt>{d.openNow}</dt>
          <dd>{fmt(sales.open_now)}</dd>
        </div>
      </dl>
    </section>
  );
}

function WeekCard({ sales, d }) {
  const c = sales.currency;
  // this week's days (Monday → today) from the 14-day list
  const week = sales.days.filter((x) => x.day >= sales.week_start);
  const max = Math.max(...week.map((x) => x.sales), 1);
  return (
    <section className="panel-card db-kpi">
      <span className="db-kpi-label">
        {d.week} <small>· {d.sinceMon}</small>
      </span>
      <b className="db-kpi-num">{money(sales.week, c)}</b>
      <Delta now={sales.week} before={sales.last_week} label={d.vsLastWeek} none={d.noLastWeek} />
      <span className="db-kpi-sub">
        {d.lastWeekSame} <b>{money(sales.last_week, c)}</b>
      </span>
      <div className="db-spark" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => {
          const x = week[i];
          return <i key={i} className={x ? (i === week.length - 1 ? "now" : "") : "future"} style={{ height: x ? `${Math.max(6, (x.sales / max) * 100)}%` : "6%" }} />;
        })}
      </div>
      <dl className="db-kpi-row">
        <div>
          <dt>{d.bills}</dt>
          <dd>{fmt(sales.bills_week)}</dd>
        </div>
        <div>
          <dt>{d.month}</dt>
          <dd>{money(sales.month, c)}</dd>
        </div>
      </dl>
    </section>
  );
}

// 14 bars, one series in the theme colour, today darkest; hover / focus shows the day
function SalesChart({ sales, d, lang }) {
  const c = sales.currency;
  const [hover, setHover] = useState(null);
  const max = Math.max(...sales.days.map((x) => x.sales), 0);
  const top = useMemo(() => {
    if (max <= 0) return 1;
    const step = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / step) * step;
  }, [max]);
  const label = (day, long) => new Date(`${day}T00:00:00`).toLocaleDateString(lang === "km" ? "km-KH" : "en-GB", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });
  const last = sales.days.length - 1;
  const h = hover ?? last;
  const sel = sales.days[h];
  return (
    <section className="panel-card db-chart">
      <div className="db-sec-head">
        <h3>{d.chart}</h3>
        {sales.by_business.some((b) => b.currency !== c) && <small className="db-muted">{d.inUsd}</small>}
      </div>
      {max <= 0 ? (
        <p className="db-muted db-chart-empty">{d.chartEmpty}</p>
      ) : (
        <>
          <div className="db-chart-read" aria-live="polite">
            <b>{money(sel.sales, c)}</b>
            <span>{h === last ? d.todayBar : label(sel.day, true)}</span>
          </div>
          <div className="db-plot" onMouseLeave={() => setHover(null)}>
            <div className="db-grid" aria-hidden="true">
              {[1, 0.5, 0].map((f) => (
                <span key={f}>
                  <em>{short(top * f, c)}</em>
                </span>
              ))}
            </div>
            <div className="db-bars" role="list">
              {sales.days.map((x, i) => (
                <button
                  key={x.day}
                  type="button"
                  role="listitem"
                  className={`db-bar ${i === last ? "now" : ""} ${hover === i ? "on" : ""}`}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`${label(x.day, true)}: ${money(x.sales, c)}`}
                >
                  <i style={{ height: `${x.sales > 0 ? Math.max(2, (x.sales / top) * 100) : 0}%` }} />
                  <span className="db-bar-day">{i % 2 === last % 2 ? (i === last ? d.todayBar : label(x.day)) : ""}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function TopItems({ items, d, lang, currency, many }) {
  const max = Math.max(...(items || []).map((x) => x.qty), 1);
  return (
    <section className="panel-card db-top-items">
      <h3>{d.top}</h3>
      {!items?.length ? (
        <p className="db-muted">{d.topEmpty}</p>
      ) : (
        <ol>
          {items.map((x, i) => (
            <li key={`${x.name_en}-${x.business}-${i}`}>
              <span className="db-rank">{i + 1}</span>
              <span className="db-item-main">
                <b>{(lang === "km" ? x.name_km || x.name_en : x.name_en || x.name_km) || "—"}</b>
                <small>
                  {d.sold.replace("{n}", fmt(x.qty))}
                  {many && x.business ? (
                    <em className={`db-item-biz k-${x.kind || "restaurant"}`}>
                      {x.kind === "mart" ? <ShoppingBasket size={11} /> : x.kind === "tg_store" ? <Send size={11} /> : <ChefHat size={11} />} {x.business}
                    </em>
                  ) : null}
                </small>
                <i className="db-item-bar">
                  <i style={{ width: `${(x.qty / max) * 100}%` }} />
                </i>
              </span>
              <span className="db-item-val">{money(x.value, currency)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function BizRow({ b, per, d, s, t, lang, onOpen, onEdit, grid, arrange }) {
  const rest = b.category === "restaurant";
  return (
    <li className={`db-biz-row ${grid ? "card" : ""} ${arrange?.dragging ? "dragging" : ""}`} {...(arrange?.drag || {})} data-testid="db-biz-row">
      {arrange && (
        <span className="db-grip" aria-hidden="true">
          <GripVertical size={16} />
        </span>
      )}
      <button type="button" className="db-biz-open" onClick={arrange ? undefined : onOpen} tabIndex={arrange ? -1 : 0}>
        {b.photo ? (
          <img className="db-biz-photo" src={b.photo} alt="" loading="lazy" />
        ) : (
          <span className="db-biz-ic">
            {rest ? (
              <ChefHat size={18} />
            ) : b.category === "namecard" ? (
              <Contact size={18} />
            ) : b.category === "attendance" ? (
              <Fingerprint size={18} />
            ) : b.category === "guest_house" ? (
              <BedDouble size={18} />
            ) : b.category === "mart" ? (
              <ShoppingBasket size={18} />
            ) : b.category === "menu_qr" ? (
              <QrCode size={18} />
            ) : b.category === "flipbook" ? (
              <BookOpen size={18} />
            ) : b.category === "qr_gen" ? (
              <ScanLine size={18} />
            ) : b.category === "website" ? (
              <Globe size={18} />
            ) : b.category === "digital_note" ? (
              <StickyNote size={18} />
            ) : b.category === "debt_book" ? (
              <NotebookPen size={18} />
            ) : b.category === "stamp_card" ? (
              <Stamp size={18} />
            ) : b.category === "event" ? (
              <Ticket size={18} />
            ) : b.category === "tg_store" ? (
              <Send size={18} />
            ) : (
              <Initial name={b.name} />
            )}
          </span>
        )}
        <span className="db-biz-main">
          <b>{b.name}</b>
          <small>
            {s.categoryNames[b.category] || b.category}
            {b.namecard ? ` · /${b.namecard.slug}` : ""}
            {b.website ? ` · /site/${b.website.slug}` : ""}
            {b.license && b.license.status !== "none" && (
              <em className={`db-ends s-${b.license.status}`}>
                {" · "}
                {b.license.status === "expired" ? t.bizExpired : (b.license.status === "expiring" ? t.bizEndsSoon : t.bizEnds).replace("{date}", fmtDay(b.license.expires_at, lang))}
              </em>
            )}
          </small>
        </span>
        {(rest || b.category === "guest_house" || b.category === "mart" || b.category === "tg_store") && per && (
          <span className="db-biz-num">
            <b>{money(per.today, per.currency)}</b>
            <small>
              {d.todaySales}
              {per.open_now ? ` · ${per.kind === "guest_house" ? d.inHouse(per.open_now) : d.open(per.open_now)}` : ""}
            </small>
          </span>
        )}
        {b.namecard && (
          <span className="db-biz-num">
            <b>
              <Eye size={13} /> {fmt(b.namecard.views)}
            </b>
          </span>
        )}
        {!b.status && <StatusBadge on={false} />}
        {!grid && !arrange && <ChevronRight size={18} className="db-chev" />}
      </button>
      {arrange ? (
        <span className="db-move">
          <button type="button" className="md-icon-btn" onClick={arrange.top} disabled={arrange.i === 0} aria-label={d.moveTop} title={d.moveTop} data-testid="db-move-top">
            <ChevronsUp size={15} />
          </button>
          <button type="button" className="md-icon-btn" onClick={arrange.up} disabled={arrange.i === 0} aria-label={d.moveUp} title={d.moveUp} data-testid="db-move-up">
            {grid ? <ArrowUp size={15} style={{ transform: "rotate(-90deg)" }} /> : <ArrowUp size={15} />}
          </button>
          <button type="button" className="md-icon-btn" onClick={arrange.down} disabled={arrange.i === arrange.n - 1} aria-label={d.moveDown} title={d.moveDown} data-testid="db-move-down">
            {grid ? <ArrowDown size={15} style={{ transform: "rotate(-90deg)" }} /> : <ArrowDown size={15} />}
          </button>
        </span>
      ) : (
        <button type="button" className="md-icon-btn db-biz-edit" onClick={onEdit} aria-label={d.edit} title={d.edit}>
          <Pencil size={15} />
        </button>
      )}
    </li>
  );
}

const NOW_ICON = { waiting: BellRing, in_house: BedDouble, open_bills: ChefHat, staff_in: Fingerprint, messages: Inbox, stock: PackageX, new_customers: UserPlus, renewals: CalendarClock };
const KIND_ICON = { restaurant: ChefHat, mart: ShoppingBasket, guest_house: BedDouble, attendance: Fingerprint, namecard: Contact, tg_store: Send };

// right now across all businesses: tiles with something to do first (a tap opens that business);
// the quiet ones ("nothing now") shrink to small chips underneath
const busy = (x) => x.n > 0 || (x.key === "staff_in" && (x.late > 0 || x.not_in > 0));
function RightNow({ tiles, d, lang, loading }) {
  const list = tiles || [];
  const active = list.filter(busy);
  const quiet = list.filter((x) => !busy(x));
  return (
    <section className="panel-card db-now">
      <div className="db-sec-head">
        <h3>{d.nowTitle}</h3>
        <small className="db-muted">{d.nowSub}</small>
      </div>
      {loading && <div className="db-ghost-rows" />}
      {tiles && !tiles.length && <p className="db-muted">{d.nowEmpty}</p>}
      {tiles && tiles.length > 0 && !active.length && <p className="db-muted db-good">{d.allQuiet}</p>}
      {active.length > 0 && (
        <div className="db-now-grid">
          {active.map((x) => {
            const Icon = NOW_ICON[x.key] || Sparkles;
            const [title, sub0] = d.now[x.key] || [x.key, ""];
            const warnStaff = x.key === "staff_in" && (x.late > 0 || x.not_in > 0);
            const sub = (warnStaff ? d.staffWarn : sub0)
              .replace("{n}", x.of ?? "")
              .replace("{late}", x.late ?? 0)
              .replace("{notin}", x.not_in ?? 0)
              .replace("{out}", x.out ?? 0)
              .replace("{low}", x.low ?? 0)
              .replace("{date}", x.soonest ? fmtDay(x.soonest, lang) : "—");
            const first = x.by?.[0];
            const tab = first ? x.tab?.[first.kind] : "";
            const to = x.key === "renewals" ? "/app/licenses" : first ? `/app/business/${first.id}${tab ? `?tab=${tab}` : ""}` : null;
            const hot = warnStaff || (x.n > 0 && ["waiting", "messages", "stock", "renewals"].includes(x.key));
            const body = (
              <>
                <span className="db-now-top">
                  <span className="db-now-ic">
                    <Icon size={17} />
                  </span>
                  <b className="db-now-n">
                    {fmt(x.n)}
                    {x.key === "staff_in" && x.of ? <small>/{fmt(x.of)}</small> : null}
                  </b>
                </span>
                <span className="db-now-title">{title}</span>
                <small className={`db-now-sub ${warnStaff ? "warn" : ""}`}>{sub}</small>
                {x.by?.length > 0 && (
                  <span className="db-now-by">
                    {x.by.slice(0, 3).map((b) => {
                      const K = KIND_ICON[b.kind] || Sparkles;
                      return (
                        <em key={b.id}>
                          <K size={11} /> {b.name} · {fmt(b.n)}
                        </em>
                      );
                    })}
                  </span>
                )}
              </>
            );
            return to ? (
              <Link key={x.key} to={to} className={`db-now-tile k-${x.key} ${hot ? "hot" : ""}`}>
                {body}
              </Link>
            ) : (
              <div key={x.key} className={`db-now-tile k-${x.key} ${hot ? "hot" : ""}`}>
                {body}
              </div>
            );
          })}
        </div>
      )}
      {quiet.length > 0 && (
        <div className="db-now-quiet" aria-label={d.nothing}>
          {quiet.map((x) => {
            const Icon = NOW_ICON[x.key] || Sparkles;
            return (
              <span key={x.key} className={`db-now-chip k-${x.key}`}>
                <Icon size={13} /> {(d.now[x.key] || [x.key])[0]} <b>0</b>
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}

// (older) years / add-ons ending, stock running out
export function Attention({ items, d, lang, loading }) {
  const { l } = useLicenseText();
  const day = (x) => fmtDay(x, lang);
  return (
    <section className="panel-card db-att">
      <h3>{d.attention}</h3>
      {loading && <div className="db-ghost-rows" />}
      {items && items.length === 0 && <p className="db-muted db-good">{d.allGood}</p>}
      <ul>
        {(items || []).map((a, i) => {
          const stock = a.kind === "sold_out" || a.kind === "low_stock";
          const bad = a.kind.endsWith("ended") || a.kind === "sold_out";
          const text = stock ? d[a.kind](a.n) : d[a.kind].replace("{date}", day(a.at)).replace("{name}", l.products[a.product] || a.product || "");
          const to = stock ? `/app/business/${a.business_id}?tab=stock` : a.kind.startsWith("year") ? "/app/licenses" : `/app/business/${a.business_id}?tab=addons`;
          return (
            <li key={i} className={bad ? "bad" : "warn"}>
              <span className="db-att-ic">{stock ? <PackageX size={16} /> : <CalendarClock size={16} />}</span>
              <span className="db-att-main">
                <b>{text}</b>
                <small>{a.business}</small>
              </span>
              <Link to={to} className="md-btn md-btn-ghost sa-btn-sm">
                {stock ? d.restock : d.renew}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
