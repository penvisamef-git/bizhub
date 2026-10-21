import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  BadgePercent,
  CalendarX,
  ClipboardCheck,
  Gift,
  MapPinned,
  Network,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Inbox,
  Boxes,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Globe,
  HandCoins,
  Lock,
  MonitorSmartphone,
  Package,
  Printer,
  Puzzle,
  Settings2,
  Send,
  ShoppingBag,
  ShoppingBasket,
  Sun,
  Truck,
  X,
} from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../restaurant/restaurant.css";
import "../attendance/attendance.css";
import "../guesthouse/guesthouse.css";
import "./mart.css";
import { licenseService, martService } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import { memo } from "../../../lib/memo";
import { fmtDate, fmtDayTime, money, setCustomMethods, useMartText } from "./text";
import { martThemeName } from "../../../pos/mart/themes";
import { mpLookName, msLookName } from "../../../msite/looks";
import { posLookName } from "../../../pos/mart/posThemes";
import { OrderAlertBar, useOrderAlert } from "./MartOrders";
import { wText } from "./wtext";
import MyBusinesses from "../../../components/MyBusinesses";

const sales = () => import("./MartSales");
const TodayTab = lazy(() => sales().then((x) => ({ default: x.TodayTab })));
const SalesTab = lazy(() => sales().then((x) => ({ default: x.SalesTab })));
const ProductsTab = lazy(() => import("./MartProducts").then((x) => ({ default: x.ProductsTab })));
const PosTab = lazy(() => import("./MartSetup").then((x) => ({ default: x.PosTab })));
const SettingsTab = lazy(() => import("./MartSetup").then((x) => ({ default: x.SettingsTab })));
const StockTab = lazy(() => import("./MartStock").then((x) => ({ default: x.StockTab })));
const SuppliersTab = lazy(() => import("./MartSuppliers").then((x) => ({ default: x.SuppliersTab })));
const DebtTab = lazy(() => import("./MartDebt").then((x) => ({ default: x.DebtTab })));
const PrintTab = lazy(() => import("./MartExtras").then((x) => ({ default: x.PrintTab })));
const AddonsTab = lazy(() => import("./MartExtras").then((x) => ({ default: x.AddonsTab })));
const WebsiteTab = lazy(() => import("./MartWebsite").then((x) => ({ default: x.WebsiteTab })));
const OrdersTab = lazy(() => import("./MartOrders").then((x) => ({ default: x.OrdersTab })));
const TelegramTab = lazy(() => import("./MartTelegram").then((x) => ({ default: x.TelegramTab })));
const ExpiryTab = lazy(() => import("./MartExpiry").then((x) => ({ default: x.ExpiryTab })));
const ProfitTab = lazy(() => import("./MartProfit").then((x) => ({ default: x.ProfitTab })));
const PurchaseTab = lazy(() => import("./MartPurchase").then((x) => ({ default: x.PurchaseTab })));
const PromosTab = lazy(() => import("./MartPromos").then((x) => ({ default: x.PromosTab })));
const LoyaltyTab = lazy(() => import("./MartLoyalty").then((x) => ({ default: x.LoyaltyTab })));
const DeliveryTab = lazy(() => import("./MartDelivery").then((x) => ({ default: x.DeliveryTab })));
const BranchesTab = lazy(() => import("./MartBranches").then((x) => ({ default: x.BranchesTab })));

const TABS = [
  ["today", Sun, TodayTab],
  ["sales", ClipboardList, SalesTab],
  ["stock", Boxes, StockTab],
  ["expiry", CalendarX, ExpiryTab],
  ["purchase", ClipboardCheck, PurchaseTab],
  ["suppliers", Truck, SuppliersTab],
  ["debt", HandCoins, DebtTab],
  ["profit", TrendingUp, ProfitTab],
  ["promos", BadgePercent, PromosTab],
  ["loyalty", Gift, LoyaltyTab],
  ["orders", ShoppingBag, OrdersTab],
  ["website", Globe, WebsiteTab],
  ["delivery", MapPinned, DeliveryTab],
  ["products", Package, ProductsTab],
  ["pos", MonitorSmartphone, PosTab],
  ["print", Printer, PrintTab],
  ["telegram", Send, TelegramTab],
  ["settings", Settings2, SettingsTab],
  ["branches", Network, BranchesTab],
  ["addons", Puzzle, AddonsTab],
];
const GROUPS = [
  ["daily", ["today", "sales", "stock", "expiry", "purchase", "suppliers", "debt", "profit"]],
  ["grow", ["promos", "loyalty"]],
  ["online", ["orders", "website", "delivery"]],
  ["setup", ["products", "pos", "print", "telegram", "settings", "branches"]],
  [null, ["addons"]],
];
const YEARLY = ["mart_staff", "mart_stock", "mart_history", "mart_debt", "mart_website", "mart_shop", "mart_telegram", "mart_expiry", "mart_loyalty", "mart_promos", "mart_profit", "mart_delivery", "mart_branches"];
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// Mini Mart: products with barcodes, the POS sale screen, sales and reports
export default function MartDashboard() {
  const { id } = useParams();
  const { m, lang } = useMartText();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(() => memo.get(`mart:${id}`) || null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "today";
  // online orders (mart_shop): the dashboard rings too, until the order is accepted
  const orderAlert = useOrderAlert(martService, id, !!data?.addons?.mart_shop?.active);

  const reload = useCallback(
    () =>
      martService
        .get(id)
        .then((res) => {
          memo.set(`mart:${id}`, res.data);
          setData(res.data);
          setError("");
          return res.data;
        })
        .catch((e) => setError(e.message || m.loadFail)),
    [id, m.loadFail],
  );
  useEffect(() => {
    reload();
  }, [reload]);
  const go = useCallback(
    (key) => {
      setParams(key === "today" ? {} : { tab: key }, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setParams],
  );
  const ctx = useMemo(() => {
    if (!data) return null;
    setCustomMethods((data.settings.custom_methods || []).map((x) => ({ key: x.key, name: x.name, color: x.color, qr: x.qr?.url || "" })));
    const b = data.business;
    return {
      id,
      m,
      lang,
      data,
      cur: data.settings.currency,
      readOnly: !b.status || !!data.license.locked,
      role: "owner",
      api: martService,
      shop: { name: b.name, logo_url: b.logo_url, address: b.address, phone: b.phone, receipt_note: data.settings.receipt_note },
      reload,
      notify: setNotice,
      askBuy: (x) => setBuying(x),
      go,
      onOrders: () => orderAlert.refresh(),
    };
  }, [data, id, m, lang, reload, setNotice, go]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !data) {
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
  }
  if (!ctx) return <BusinessSkeleton />;

  const lic = data.license;
  const graceLeft = lic.grace_until ? Math.max(0, Math.ceil((new Date(lic.grace_until) - Date.now()) / 86400000)) : 0;
  const [, CurrentIcon, Current] = TABS.find(([k]) => k === tab);
  const navList = GROUPS.map(([group, keys]) => (
    <div key={group || "more"} className="rs-nav-group">
      {group && <span className="rs-nav-label">{m.navGroups[group]}</span>}
      {keys.map((key) => {
        const Icon = TABS.find(([k]) => k === key)[1];
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
            <span className="rs-nav-text">{m.tabs[key]}</span>
            {key === "products" && !data.counts.products && <span className="rs-dot" aria-hidden="true" />}
            {key === "orders" && orderAlert.count > 0 && <em className="mt-nav-badge">{orderAlert.count}</em>}
            {key === "website" && data.counts.unread > 0 && <em className="mt-nav-badge soft">{data.counts.unread}</em>}
          </button>
        );
      })}
    </div>
  ));

  return (
    <div className="md-page rs-page at-page gh-page mt-page">
      {notice}
      <div className="rs-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="rs-head">
          <span className="rs-logo mt-logo">{data.business.logo_url ? <img src={data.business.logo_url} alt="" /> : <ShoppingBasket size={26} />}</span>
          <div className="rs-head-text">
            <h2>{data.business.name}</h2>
            <div className="rs-head-meta">
              <span className="rs-chip">{m.type}</span>
              {lic.expires_at && (
                <span className={`rs-chip s-${lic.locked ? "expired" : lic.status}`}>
                  <CalendarClock size={13} /> {m.endsOn.replace("{date}", fmtDate(lic.expires_at, lang))}
                </span>
              )}
              <span className="rs-chip">
                <Package size={13} /> {m.productsLine.replace("{n}", data.counts.products).replace("{max}", data.limits.products)}
              </span>
            </div>
          </div>
          {data.addons?.mart_shop?.active && <OrderBell ctx={ctx} count={orderAlert.count} unread={data.counts.unread || 0} />}
          {(lic.status === "expiring" || lic.in_grace || lic.locked) && (
            <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => setBuying("renew")}>
              <CoinIcon size={16} /> {m.renew}
            </button>
          )}
        </div>
      </div>
      {!data.business.status && <div className="md-notice md-notice-error">{m.suspended}</div>}
      {lic.in_grace && (
        <div className="rs-banner warn">
          <AlertTriangle size={18} />
          <span>
            <b>{m.graceTitle}</b> {m.graceSub.replace("{n}", graceLeft)}
          </span>
        </div>
      )}
      {lic.locked && (
        <div className="rs-banner bad">
          <Lock size={18} />
          <span>
            <b>{m.lockedTitle}</b> {m.lockedSub}
          </span>
        </div>
      )}
      {tab !== "orders" && <OrderAlertBar w={wText(lang)} alert={orderAlert} onOpen={() => go("orders")} />}
      <div className="rs-body">
        <nav className="rs-nav" aria-label={m.type}>
          {navList}
        </nav>
        <button type="button" className="rs-nav-btn" onClick={() => setNavOpen(true)} aria-haspopup="dialog">
          <CurrentIcon size={17} /> <b>{m.tabs[tab]}</b>
          <span className="rs-nav-btn-all">
            {m.allSections} <ChevronDown size={16} />
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
      {buying === "renew" && (
        <PurchaseModal
          stage={
            <div className="rs-stage">
              <CalendarClock size={64} />
              <b>{m.renewTitle}</b>
              <small>{data.business.name}</small>
            </div>
          }
          badge={m.renew}
          title={m.renewTitle}
          sub={m.renewSub}
          perks={[]}
          price={data.renew_price ?? 0}
          buyLabel={`${m.renew} · ${fmt(data.renew_price)} ${m.coins}`}
          buy={() => licenseService.buy(id, "mart", lic.expires_at ?? null)}
          onDone={async (res) => {
            await reload();
            if (res?.data) setNotice({ type: "success", text: m.renewDone.replace("{date}", fmtDate(res.data.expires_at, lang)) });
          }}
          onClose={() => setBuying(null)}
        />
      )}
      {buying?.addon && <AddonBuy ctx={ctx} x={buying} onClose={() => setBuying(null)} />}
    </div>
  );
}

// the bell in the header: new website orders (and unread messages) at a glance
function OrderBell({ ctx, count, unread }) {
  const w = wText(ctx.lang);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    martService
      .orders(ctx.id, { status: "new" })
      .then((r) => setRows(r.data.slice(0, 6)))
      .catch(() => setRows([]));
    const off = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open, ctx.id, count]);
  const total = count + unread;
  return (
    <span className="mt-bell-wrap" ref={box}>
      <button type="button" className={`mt-bell ${count ? "ring" : ""}`} onClick={() => setOpen((o) => !o)} aria-label={w.bellTitle} title={w.bellTitle} data-testid="mt-bell">
        <Bell size={19} />
        {total > 0 && <em>{total}</em>}
      </button>
      {open && (
        <div className="mt-bell-pop" role="dialog" aria-label={w.bellTitle}>
          <b className="mt-bell-h">{w.bellTitle}</b>
          {!rows ? (
            <p className="rs-muted">…</p>
          ) : !rows.length ? (
            <p className="rs-muted mt-bell-empty">{w.bellNone}</p>
          ) : (
            rows.map((o) => (
              <button
                key={o._id}
                type="button"
                className="mt-bell-row"
                onClick={() => {
                  setOpen(false);
                  ctx.go("orders");
                }}
              >
                <span className="mt-bell-ic">
                  <ShoppingBag size={15} />
                </span>
                <span className="mt-prod-text">
                  <b>
                    {o.no} · {o.name}
                  </b>
                  <small>
                    {o.items.length} × · {o.fulfil === "delivery" ? w.delivery : w.pickup} · {fmtDayTime(o.created_date, ctx.lang)}
                  </small>
                </span>
                <b>{money(o.total, o.currency)}</b>
              </button>
            ))
          )}
          {unread > 0 && (
            <button
              type="button"
              className="mt-bell-row msg"
              onClick={() => {
                setOpen(false);
                ctx.go("website");
              }}
            >
              <span className="mt-bell-ic">
                <Inbox size={15} />
              </span>
              <span className="mt-prod-text">
                <b>{w.bellMessages.replace("{n}", unread)}</b>
              </span>
            </button>
          )}
          <button
            type="button"
            className="md-btn md-btn-primary sa-btn-sm mt-bell-all"
            onClick={() => {
              setOpen(false);
              ctx.go("orders");
            }}
          >
            {w.bellAll}
          </button>
        </div>
      )}
    </span>
  );
}

// buy one add-on (or one receipt template)
function AddonBuy({ ctx, x, onClose }) {
  const { m, data, id, lang } = ctx;
  const key = x.addon;
  const theme = ["mart_print_theme", "mart_site_theme", "mart_portal_theme", "mart_pos_theme"].includes(key);
  const info = m.addonInfo[key];
  const a = data.addons?.[key] || {};
  const price = a.price ?? 0;
  const name =
    key === "mart_print_theme" ? m.templateName.replace("{name}", martThemeName(x.item, lang)) : theme ? `${info.name} · ${(key === "mart_site_theme" ? msLookName : key === "mart_pos_theme" ? posLookName : mpLookName)(x.item, lang)}` : info.name;
  const buyTheme = () =>
    key === "mart_pos_theme" ? martService.buyPosTheme(id, x.item) : key === "mart_site_theme" ? martService.buySiteTheme(id, x.item) : key === "mart_portal_theme" ? martService.buyPortalTheme(id, x.item) : martService.buyPrintTheme(id, x.item);
  return (
    <PurchaseModal
      stage={
        <div className="rs-stage">
          <Puzzle size={64} />
          <b>{name}</b>
          <small>{data.business.name}</small>
        </div>
      }
      badge={m.tabs.addons}
      title={name}
      sub={info.what}
      perks={[...info.perks, `${fmt(price)} ${m.coins} · ${YEARLY.includes(key) ? m.perYear : m.forever}`]}
      price={price}
      buyLabel={`${a.active ? m.renew : m.unlock.replace(" · {coins}", "")} · ${fmt(price)} ${m.coins}`}
      buy={() => (theme ? buyTheme() : licenseService.buy(id, key, a.expires_at ?? null))}
      doneSub={m.unlocked.replace("{name}", name)}
      onDone={() => {
        x.onDone?.();
        ctx.reload();
      }}
      onClose={onClose}
    />
  );
}
