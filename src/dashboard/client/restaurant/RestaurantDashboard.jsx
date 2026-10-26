import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  ChefHat,
  CircleCheck,
  CreditCard,
  LayoutGrid,
  Lock,
  Puzzle,
  QrCode,
  Store,
  Users,
  UtensilsCrossed,
  Globe,
  Send,
  Inbox,
  Smartphone,
  ChevronDown,
  X,
  MonitorSmartphone,
  MonitorUp,
  ReceiptText,
  Package,
  BadgePercent,
  Network,
  HandPlatter,
  Star,
  Palette,
} from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../namecard/namecard-editor.css";
import "./restaurant.css";
import { restaurantService, licenseService } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import { useRestText } from "./text";
import { memo } from "../../../lib/memo";
import { ADDON_ICONS, fmtDate } from "./parts";
import TeamNavLink from "../team/TeamNavLink";
import MyBusinesses from "../../../components/MyBusinesses";

// each tab is its own small file; all of them are fetched quietly once the dashboard is open
const LOAD = {
  setup: () => import("./SetupTab"),
  profile: () => import("./ProfileTab"),
  money: () => import("./MoneyTab"),
  tables: () => import("./TablesTab"),
  menu: () => import("./MenuTab"),
  staff: () => import("./StaffTab"),
  pos: () => import("./PosTab"),
  poslook: () => import("./PosLookTab"),
  reports: () => import("./ReportsTab"),
  stock: () => import("./StockTab"),
  promos: () => import("./PromotionsTab"),
  rewards: () => import("./RewardsTab"),
  tableorder: () => import("./TableOrderTab"),
  receipt: () => import("./ReceiptTab"),
  display: () => import("./DisplayTab"),
  qr: () => import("./QrTab"),
  website: () => import("./WebsiteTab"),
  telegram: () => import("./TelegramTab"),
  inbox: () => import("./InboxTab"),
  app: () => import("./AppTab"),
  addons: () => import("./AddonsTab"),
  branches: () => import("../branches/BranchesTab"),
};
const SetupTab = lazy(LOAD.setup);
const ProfileTab = lazy(LOAD.profile);
const MoneyTab = lazy(LOAD.money);
const TablesTab = lazy(LOAD.tables);
const MenuTab = lazy(LOAD.menu);
const StaffTab = lazy(LOAD.staff);
const PosTab = lazy(LOAD.pos);
const PosLookTab = lazy(LOAD.poslook);
const ReportsTab = lazy(LOAD.reports);
const StockTab = lazy(LOAD.stock);
const PromotionsTab = lazy(LOAD.promos);
const RewardsTab = lazy(LOAD.rewards);
const TableOrderTab = lazy(LOAD.tableorder);
const ReceiptTab = lazy(LOAD.receipt);
const DisplayTab = lazy(LOAD.display);
const QrTab = lazy(LOAD.qr);
const WebsiteTab = lazy(LOAD.website);
const TelegramTab = lazy(LOAD.telegram);
const InboxTab = lazy(LOAD.inbox);
const AppTab = lazy(LOAD.app);
const AddonsTab = lazy(LOAD.addons);
// several restaurants (rest_branches): the shared group + report screen
const BranchesTab = lazy(() =>
  LOAD.branches().then((m) => ({
    default: function RestBranches({ ctx }) {
      const a = ctx.overview.addons.find((x) => x.key === "rest_branches");
      return <m.default id={ctx.id} category="restaurant" lang={ctx.lang} owned={!!a?.active} price={a?.price} readOnly={ctx.readOnly} onBuy={() => ctx.askBuy("rest_branches")} notify={ctx.notify} />;
    },
  })),
);

const TABS = [
  ["setup", CircleCheck, SetupTab],
  ["reports", BarChart3, ReportsTab],
  ["profile", Store, ProfileTab],
  ["money", CreditCard, MoneyTab],
  ["tables", LayoutGrid, TablesTab],
  ["menu", UtensilsCrossed, MenuTab],
  ["staff", Users, StaffTab],
  ["pos", MonitorSmartphone, PosTab],
  ["poslook", Palette, PosLookTab],
  ["stock", Package, StockTab],
  ["promos", BadgePercent, PromotionsTab],
  ["rewards", Star, RewardsTab],
  ["receipt", ReceiptText, ReceiptTab],
  ["display", MonitorUp, DisplayTab],
  ["qr", QrCode, QrTab],
  ["tableorder", HandPlatter, TableOrderTab],
  ["website", Globe, WebsiteTab],
  ["inbox", Inbox, InboxTab],
  ["telegram", Send, TelegramTab],
  ["app", Smartphone, AppTab],
  ["branches", Network, BranchesTab],
  ["addons", Puzzle, AddonsTab],
];
// the sections, grouped (left menu on computers, a list sheet on phones)
const GROUPS = [
  [null, ["setup", "reports"]],
  ["shop", ["profile", "money", "tables", "menu", "staff", "stock", "promos", "rewards", "pos", "poslook", "receipt", "display"]],
  ["online", ["qr", "tableorder", "website", "inbox"]],
  ["connect", ["telegram", "app"]],
  [null, ["branches", "addons"]],
];
// sections that need an add-on (shown with a small lock until it's bought)
const NEEDS = { stock: "rest_stock", promos: "rest_promos", rewards: "rest_rewards", display: "rest_display", qr: "rest_qr_menu", tableorder: "rest_table_order", website: "rest_website", inbox: "rest_website", telegram: "rest_telegram" };
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// Restaurant setup: everything the owner prepares before the POS sells
export default function RestaurantDashboard() {
  const { id } = useParams();
  const { r, lang } = useRestText();
  const [params, setParams] = useSearchParams();
  // last data of this restaurant (if opened before) shows at once; fresh data loads behind it
  const [settings, setSettings] = useState(() => memo.get(`rest:${id}`)?.settings || null);
  const [overview, setOverview] = useState(() => memo.get(`rest:${id}`)?.overview || null); // { business, setup, license, addons, limits, renew_price }
  // once every setup step is done, "Setup" leaves the menu and the restaurant opens on Reports
  const setupDone = !!overview && overview.setup.done >= overview.setup.total;
  const home = setupDone ? "reports" : "setup";
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : home;
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(null); // add-on key | "restaurant"
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);

  const reload = useCallback(
    () =>
      restaurantService
        .get(id)
        .then((res) => {
          const next = { business: res.business, setup: res.setup, license: res.license, addons: res.addons, limits: res.limits, renew_price: res.renew_price };
          memo.set(`rest:${id}`, { settings: res.data, overview: next });
          setSettings(res.data);
          setOverview(next);
          setError("");
        })
        .catch((e) => setError(e.message || r.loadFail)),
    [id, r.loadFail],
  );
  useEffect(() => {
    reload();
  }, [reload]);
  // once open: fetch the other tabs' code and data in the background, so switching tabs is instant
  useEffect(() => {
    const timer = setTimeout(() => {
      Object.values(LOAD).forEach((load) => load().catch(() => {}));
      restaurantService.prefetch(id);
    }, 300);
    return () => clearTimeout(timer);
  }, [id]);

  const go = (key) => {
    setParams(key === home ? {} : { tab: key }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const ctx = useMemo(() => {
    if (!settings || !overview) return null;
    const lic = overview.license;
    return {
      id,
      r,
      lang,
      settings,
      overview,
      readOnly: !overview.business.status || !!lic.locked,
      addonOn: (key) => !!overview.addons.find((a) => a.key === key)?.active,
      setSettings: (data, setup) => {
        setSettings(data);
        if (setup) setOverview((o) => ({ ...o, setup }));
        const saved = memo.get(`rest:${id}`);
        if (saved) memo.set(`rest:${id}`, { settings: data, overview: setup ? { ...saved.overview, setup } : saved.overview });
      },
      reload,
      setUnread: (n) => setOverview((o) => ({ ...o, inbox_unread: n })),
      notify: setNotice,
      askBuy: setBuying,
      go,
    };
  }, [settings, overview, id, r, lang, reload, setNotice]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !settings) {
    return (
      <div className="panel-card sa-empty-state">
        <p>{error}</p>
        <button type="button" className="md-btn md-btn-primary" onClick={reload}>
          {r.retry}
        </button>
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
      </div>
    );
  }
  if (!ctx) return <BusinessSkeleton />;

  const lic = overview.license;
  const name = (lang === "km" ? settings.name_km || settings.name_en : settings.name_en || settings.name_km) || overview.business.name;
  const graceLeft = lic.grace_until ? Math.max(0, Math.ceil((new Date(lic.grace_until) - Date.now()) / 86400000)) : 0;
  const Current = TABS.find(([k]) => k === tab)[2];
  const CurrentIcon = TABS.find(([k]) => k === tab)[1];
  const unread = overview.inbox_unread || 0;
  const navList = GROUPS.map(([group, keys]) => [group, keys.filter((k) => !(k === "setup" && setupDone && tab !== "setup"))]).map(([group, keys], gi) => (
    <div key={gi} className="rs-nav-group">
      {group && <span className="rs-nav-label">{r.navGroups[group]}</span>}
      {keys.map((key) => {
        const Icon = TABS.find(([k]) => k === key)[1];
        const step = overview.setup.steps[key];
        const locked = NEEDS[key] && !ctx.addonOn(NEEDS[key]);
        return (
          <button
            key={key}
            type="button"
            className={tab === key ? "on" : ""}
            onClick={() => {
              setNavOpen(false);
              go(key);
            }}
            aria-current={tab === key ? "page" : undefined}
          >
            <Icon size={17} />
            <span className="rs-nav-text">{r.tabs[key]}</span>
            {key === "setup" && <small className="rs-nav-count">{`${overview.setup.done}/${overview.setup.total}`}</small>}
            {step !== undefined && <span className={`rs-dot ${step ? "ok" : ""}`} aria-hidden="true" />}
            {key === "inbox" && unread > 0 && <span className="rs-badge">{unread > 99 ? "99+" : unread}</span>}
            {key === "app" && <small className="rs-nav-soon">{r.soonShort}</small>}
            {locked && <Lock size={13} className="rs-nav-lock" />}
          </button>
        );
      })}
      {keys.includes("addons") && <TeamNavLink id={id} onGo={() => setNavOpen(false)} />}
    </div>
  ));

  // what the purchase modal sells
  const addon = buying && buying !== "restaurant" ? overview.addons.find((a) => a.key === buying) : null;
  const BuyIcon = addon ? ADDON_ICONS[addon.key] : CalendarClock;
  const price = addon ? addon.price : overview.renew_price;

  return (
    <div className="md-page rs-page" style={{ "--rs-c": settings.color }}>
      {notice}
      <div className="rs-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="rs-head">
          <span className="rs-logo">{settings.logo?.url ? <img src={settings.logo.url} alt="" /> : <ChefHat size={26} />}</span>
          <div className="rs-head-text">
            <h2>{name}</h2>
            <div className="rs-head-meta">
              <span className="rs-chip">{r.types[settings.type]}</span>
              {lic.expires_at && (
                <span className={`rs-chip s-${lic.locked ? "expired" : lic.status}`}>
                  <CalendarClock size={13} /> {r.endsOn.replace("{date}", fmtDate(lic.expires_at, lang))}
                </span>
              )}
              <span className="rs-chip">
                <CircleCheck size={13} /> {r.stepsDone.replace("{done}", overview.setup.done).replace("{total}", overview.setup.total)}
              </span>
            </div>
          </div>
          {(lic.status === "expiring" || lic.in_grace || lic.locked) && (
            <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => setBuying("restaurant")} disabled={!overview.business.status}>
              <CoinIcon size={16} /> {r.renewFor.replace("{coins}", fmt(overview.renew_price))}
            </button>
          )}
        </div>
      </div>

      {!overview.business.status && <div className="md-notice md-notice-error">{r.suspended}</div>}
      {lic.in_grace && (
        <div className="rs-banner warn">
          <AlertTriangle size={18} />
          <span>
            <b>{r.graceTitle}</b> {r.graceSub.replace("{n}", graceLeft)}
          </span>
        </div>
      )}
      {lic.locked && (
        <div className="rs-banner bad">
          <Lock size={18} />
          <span>
            <b>{r.lockedTitle}</b> {r.lockedSub}
          </span>
        </div>
      )}

      <div className="rs-body">
        <nav className="rs-nav" aria-label="Restaurant">
          {navList}
        </nav>
        <button type="button" className="rs-nav-btn" onClick={() => setNavOpen(true)} aria-haspopup="dialog">
          <CurrentIcon size={17} /> <b>{r.tabs[tab]}</b>
          <span className="rs-nav-btn-all">
            {r.allSections} <ChevronDown size={16} />
          </span>
        </button>
        <main className="rs-main">
          <Suspense fallback={<TabSkeleton />}>
            <Current ctx={ctx} key={tab} />
          </Suspense>
        </main>
      </div>
      {navOpen && (
        <div className="rs-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && setNavOpen(false)}>
          <div className="rs-sheet" role="dialog" aria-modal="true" aria-label={r.allSections}>
            <div className="rs-sheet-head">
              <b>{r.allSections}</b>
              <button type="button" className="md-icon-btn" onClick={() => setNavOpen(false)} aria-label={r.close}>
                <X size={18} />
              </button>
            </div>
            <nav className="rs-nav in-sheet">{navList}</nav>
          </div>
        </div>
      )}

      {buying && (
        <PurchaseModal
          stage={
            <div className="rs-stage">
              <BuyIcon size={64} />
              <b>{addon ? r.addonNames[addon.key] : r.renewTitle}</b>
              <small>{name}</small>
            </div>
          }
          badge={addon ? r.tabs.addons : r.renew}
          title={addon ? r.unlockTitle.replace("{name}", r.addonNames[addon.key]) : r.renewTitle}
          sub={addon ? r.addonWhat[addon.key] : r.renewSub}
          perks={addon ? [r.addonFree[addon.key], addon.days ? `${fmt(price)} ${r.coins} ${r.perYear}` : `${r.oneTime} · ${r.forever}`] : []}
          price={price}
          buyLabel={addon ? r.buy.replace("{coins}", `${fmt(price)} ${r.coins}`) : r.renewFor.replace("{coins}", `${fmt(price)} ${r.coins}`)}
          buy={() => {
            const current = addon ? addon : lic;
            return licenseService.buy(id, buying, current?.expires_at ?? null);
          }}
          doneSub={addon ? r.unlockDone.replace("{name}", r.addonNames[addon.key]) : null}
          onDone={(res) => {
            reload();
            if (!addon && res?.data) setNotice({ type: "success", text: r.renewDone.replace("{date}", fmtDate(res.data.expires_at, lang)) });
          }}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}
