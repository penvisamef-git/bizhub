import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BellRing, BookOpen, NotebookPen, ChevronDown, FileSpreadsheet, History, Lock, Puzzle, Settings, Users, X } from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../restaurant/restaurant.css";
import "../menuqr/menuqr.css";
import "../qrgen/qrgen.css";
import "../website/website.css";
import "./debt.css";
import { debtApi, licenseService } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import MyBusinesses from "../../../components/MyBusinesses";
import { memo } from "../../../lib/memo";
import { CustomersTab } from "./DebtCustomers";
import TeamNavLink from "../team/TeamNavLink";
import { fmt, useDebtText } from "./text";

const LOAD = { more: () => import("./DebtMore") };
const tab = (name) => lazy(() => LOAD.more().then((x) => ({ default: x[name] })));
const HistoryTab = tab("HistoryTab");
const RemindersTab = tab("RemindersTab");
const ExcelTab = tab("ExcelTab");
const SettingsTab = tab("SettingsTab");
const AddonsTab = tab("AddonsTab");

const TABS = [
  ["customers", Users, CustomersTab],
  ["history", History, HistoryTab],
  ["reminders", BellRing, RemindersTab],
  ["excel", FileSpreadsheet, ExcelTab],
  ["settings", Settings, SettingsTab],
  ["addons", Puzzle, AddonsTab],
];
const NEEDS = { reminders: "debt_remind", excel: "debt_excel" };
const ADDON_ICON = { debt_remind: BellRing, debt_more: Users, debt_excel: FileSpreadsheet, debt_nobrand: BookOpen };
const GROUPS = [
  ["book", ["customers", "history"]],
  ["tools", ["reminders", "excel"]],
  ["more", ["settings", "addons"]],
];

// Debt Book: who owes what, debts + payments, statement links, reminders
export default function DebtDashboard() {
  const { id } = useParams();
  const { m, lang } = useDebtText();
  const [params, setParams] = useSearchParams();
  const current = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "customers";
  const [data, setData] = useState(() => memo.get(`debt:${id}`) || null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(null); // { addon }
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);
  const api = useMemo(() => debtApi({ id }), [id]);

  const reload = useCallback(
    () =>
      api
        .get()
        .then((r) => {
          memo.set(`debt:${id}`, r.data);
          setData(r.data);
          setError("");
        })
        .catch((e) => setError(e.message || m.loadFail)),
    [api, id, m.loadFail],
  );
  useEffect(() => {
    reload();
    const t = setTimeout(() => Object.values(LOAD).forEach((l) => l().catch(() => {})), 400);
    return () => clearTimeout(t);
  }, [reload]);

  const go = (key, extra = {}) => {
    setParams(key === "customers" && !Object.keys(extra).length ? {} : { ...(key === "customers" ? {} : { tab: key }), ...extra }, { replace: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const ctx = useMemo(() => {
    if (!data) return null;
    const put = (patch) =>
      setData((d) => {
        const next = { ...d, ...(typeof patch === "function" ? patch(d) : patch) };
        memo.set(`debt:${id}`, next);
        return next;
      });
    return {
      id,
      m,
      lang,
      api,
      data,
      put,
      owner: true,
      readOnly: !data.business.status,
      reload,
      notify: setNotice,
      askBuy: setBuying,
      go,
      on: (key) => !!data.addons?.[key]?.active,
    };
  }, [data, id, m, lang, api, reload, setNotice]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !data)
    return (
      <div className="panel-card sa-empty-state">
        <p>{error}</p>
        <button type="button" className="md-btn md-btn-primary" onClick={reload}>
          {m.retry}
        </button>
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
      </div>
    );
  if (!ctx) return <BusinessSkeleton />;

  const b = data.book;
  const [, CurrentIcon, Current] = TABS.find(([k]) => k === current);
  const navList = GROUPS.map(([group, keys]) => (
    <div key={group} className="rs-nav-group">
      <span className="rs-nav-label">{m.groups[group]}</span>
      {keys.map((key) => {
        const Icon = TABS.find(([k]) => k === key)[1];
        const locked = NEEDS[key] && !ctx.on(NEEDS[key]);
        return (
          <button
            key={key}
            type="button"
            className={current === key ? "on" : ""}
            onClick={() => {
              setNavOpen(false);
              go(key);
            }}
            aria-current={current === key ? "page" : undefined}
            data-testid={`dk-tab-${key}`}
          >
            <Icon size={17} />
            <span className="rs-nav-text">{m.tabs[key]}</span>
            {key === "customers" && <small className="rs-nav-count">{fmt(data.totals.customers)}</small>}
            {key === "customers" && data.totals.overdue > 0 && <span className="rs-badge">{data.totals.overdue}</span>}
            {locked && <Lock size={13} className="rs-nav-lock" />}
          </button>
        );
      })}
      {keys.includes("addons") && <TeamNavLink id={id} onGo={() => setNavOpen(false)} />}
    </div>
  ));

  let sell = null;
  if (buying?.addon && data.addons[buying.addon]) {
    const a = data.addons[buying.addon];
    sell = {
      icon: ADDON_ICON[buying.addon] || Puzzle,
      name: m.addonNames[buying.addon],
      title: m.unlockTitle.replace("{name}", m.addonNames[buying.addon]),
      sub: m.addonWhat[buying.addon],
      perks: [...(m.perks[buying.addon] || []), a.days ? `${fmt(a.price)} ${m.coins} ${m.perYear}` : `${m.oneTime} · ${m.forever}`],
      price: a.price,
      label: m.buy.replace("{coins}", fmt(a.price)),
      buy: () => licenseService.buy(id, buying.addon, a.days ? (a.expires_at ?? null) : null),
      done: m.unlockDone.replace("{name}", m.addonNames[buying.addon]),
    };
  }
  const BuyIcon = sell?.icon;

  return (
    <div className="md-page rs-page mq-page qg-page ws-page dk-page">
      {notice}
      <div className="rs-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="rs-head">
          <span className="rs-logo">{b.logo ? <img src={b.logo} alt="" /> : <NotebookPen size={26} />}</span>
          <div className="rs-head-text">
            <h2>{b.shop_name || data.business.name}</h2>
            <div className="rs-head-meta">
              <span className="rs-chip">{m.badge}</span>
            </div>
          </div>
        </div>
      </div>
      {!data.business.status && <div className="md-notice md-notice-error">{m.suspended}</div>}
      <div className="rs-body">
        <nav className="rs-nav" aria-label={m.badge}>
          {navList}
        </nav>
        <button type="button" className="rs-nav-btn" onClick={() => setNavOpen(true)} aria-haspopup="dialog">
          <CurrentIcon size={17} /> <b>{m.tabs[current]}</b>
          <span className="rs-nav-btn-all">
            {m.allSections} <ChevronDown size={16} />
          </span>
        </button>
        <main className="rs-main">
          <Suspense fallback={<TabSkeleton />}>
            <Current ctx={ctx} key={current} />
          </Suspense>
        </main>
      </div>
      {navOpen && (
        <div className="rs-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && setNavOpen(false)}>
          <div className="rs-sheet" role="dialog" aria-modal="true" aria-label={m.allSections}>
            <div className="rs-sheet-head">
              <b>{m.allSections}</b>
              <button type="button" className="md-icon-btn" onClick={() => setNavOpen(false)} aria-label={m.close}>
                <X size={18} />
              </button>
            </div>
            <nav className="rs-nav in-sheet">{navList}</nav>
          </div>
        </div>
      )}
      {sell && (
        <PurchaseModal
          stage={
            <div className="rs-stage">
              <BuyIcon size={64} />
              <b>{sell.name}</b>
              <small>{b.shop_name || data.business.name}</small>
            </div>
          }
          badge={m.badge}
          title={sell.title}
          sub={sell.sub}
          perks={sell.perks}
          price={sell.price}
          buyLabel={sell.label}
          buy={sell.buy}
          doneSub={sell.done || null}
          onDone={() => reload()}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}
