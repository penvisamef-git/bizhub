import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BarChart3, CalendarClock, ChevronDown, Copy, ExternalLink, Lock, Megaphone, MonitorSmartphone, Package, Palette, Puzzle, ReceiptText, Send, Settings, Share2, ShoppingCart, Tag, Truck, Users, X } from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../restaurant/restaurant.css";
import "../menuqr/menuqr.css";
import "../qrgen/qrgen.css";
import "../website/website.css";
import "./tgstore.css";
import { licenseService, tgStoreApi } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import MyBusinesses from "../../../components/MyBusinesses";
import CoinIcon from "../../../components/CoinIcon";
import { memo } from "../../../lib/memo";
import { OrdersTab, startLive } from "./TsOrders";
import { ADDON_ICON } from "./TsGrow";
import { MiniStore } from "./TsDesign";
import { themeName } from "../../../tgstore/themes";
import TeamNavLink from "../team/TeamNavLink";
import { fill, fmtDate, fmtNum, useTsText } from "./text";

const LOAD = { setup: () => import("./TsSetup"), grow: () => import("./TsGrow"), people: () => import("./TsCustomers"), design: () => import("./TsDesign"), more: () => import("./TsMore"), staff: () => import("./TsStaff") };
const later = (file, name) => lazy(() => LOAD[file]().then((x) => ({ default: x[name] })));
const ProductsTab = later("setup", "ProductsTab");
const CustomersTab = later("people", "CustomersTab");
const DesignTab = later("design", "DesignTab");
const StoreTab = later("setup", "StoreTab");
const ShareTab = later("setup", "ShareTab");
const PromosTab = later("grow", "PromosTab");
const MessagesTab = later("grow", "MessagesTab");
const ReportTab = later("grow", "ReportTab");
const AddonsTab = later("grow", "AddonsTab");
const DeliveryTab = later("more", "DeliveryTab");
const RemindTab = later("more", "RemindTab");
const StaffTab = later("staff", "StaffTab");

const TABS = [
  ["orders", ReceiptText, OrdersTab],
  ["products", Package, ProductsTab],
  ["customers", Users, CustomersTab],
  ["staff", MonitorSmartphone, StaffTab],
  ["promos", Tag, PromosTab],
  ["messages", Megaphone, MessagesTab],
  ["remind", ShoppingCart, RemindTab],
  ["report", BarChart3, ReportTab],
  ["store", Settings, StoreTab],
  ["delivery", Truck, DeliveryTab],
  ["design", Palette, DesignTab],
  ["share", Share2, ShareTab],
  ["addons", Puzzle, AddonsTab],
];
const NEEDS = { promos: "ts_promos", messages: "ts_broadcast", remind: "ts_remind", report: "ts_reports" };
const GROUPS = [
  ["sell", ["orders", "products", "customers", "staff"]],
  ["grow", ["promos", "messages", "remind", "report"]],
  ["setup", ["store", "delivery", "design", "share", "addons"]],
];
const GRACE_DAYS = 7;

// Telegram Store: a shop inside Telegram — orders, products, customers, settings, links + the staff's Telegram group
export default function TgStoreDashboard() {
  const { id } = useParams();
  const { x, lang } = useTsText();
  const [params, setParams] = useSearchParams();
  const current = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "orders";
  const [data, setData] = useState(() => memo.get(`tgstore:${id}`) || null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(null); // "renew" | { addon }
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);
  const api = useMemo(() => tgStoreApi({ id }), [id]);

  const reload = useCallback(
    () =>
      api
        .get()
        .then((r) => {
          memo.set(`tgstore:${id}`, r.data);
          setData(r.data);
          setError("");
        })
        .catch((e) => setError(e.message || x.loadFail)),
    [api, id, x.loadFail],
  );
  useEffect(() => {
    if (current === "orders") startLive(api, id); // the open orders come with the rest, not after it
    reload();
    const t = setTimeout(() => Object.values(LOAD).forEach((l) => l().catch(() => {})), 2500); // the other tabs, once this one is up
    return () => clearTimeout(t);
  }, [reload]);

  const go = (key) => {
    setParams(key === "orders" ? {} : { tab: key }, { replace: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const ctx = useMemo(() => {
    if (!data) return null;
    const put = (patch) =>
      setData((d) => {
        const next = { ...d, ...(typeof patch === "function" ? patch(d) : patch) };
        memo.set(`tgstore:${id}`, next);
        return next;
      });
    return { id, x, lang, api, data, put, reload, notify: setNotice, go, askBuy: setBuying, on: (key) => !!data.addons?.[key]?.active, readOnly: !data.business.status || !!data.license.read_only, cur: data.store.currency };
  }, [data, id, x, lang, api, reload, setNotice]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !data)
    return (
      <div className="panel-card sa-empty-state">
        <p>{error}</p>
        <button type="button" className="md-btn md-btn-primary" onClick={reload}>
          {x.retry}
        </button>
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
      </div>
    );
  if (!ctx) return <BusinessSkeleton />;

  const s = data.store;
  const lic = data.license;
  const link = data.links.telegram || data.links.web;
  const graceLeft = lic.expires_at ? Math.max(0, GRACE_DAYS - Math.floor((Date.now() - new Date(lic.expires_at).getTime()) / 86400000)) : 0;
  const [, CurrentIcon, Current] = TABS.find(([k]) => k === current);
  const navList = GROUPS.map(([group, keys]) => (
    <div key={group} className="rs-nav-group">
      <span className="rs-nav-label">{x.groups[group]}</span>
      {keys.flatMap((key) => (key === "addons" ? ["team", key] : [key])).map((key) => {
        if (key === "team") return <TeamNavLink key="team" id={id} onGo={() => setNavOpen(false)} />; // Team, just above Add-ons
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
            data-testid={`ts-tab-${key}`}
          >
            <Icon size={17} />
            <span className="rs-nav-text">{x.tabs[key]}</span>
            {key === "orders" && data.counts.new > 0 && <span className="rs-badge">{data.counts.new}</span>}
            {key === "products" && <small className="rs-nav-count">{fmtNum(data.counts.products)}</small>}
            {key === "customers" && <small className="rs-nav-count">{fmtNum(data.counts.customers)}</small>}
            {key === "share" && !data.telegram.connected && <span className="ts-dot" aria-hidden="true" />}
            {locked && <Lock size={13} className="rs-nav-lock" />}
          </button>
        );
      })}
    </div>
  ));

  let sell = null;
  if (buying === "renew")
    sell = { icon: Send, name: x.renewTitle, title: x.renewTitle, sub: x.renewSub, perks: [`${fmtNum(lic.price)} ${x.coins} ${x.perYear}`], price: lic.price, label: x.renewFor.replace("{coins}", fmtNum(lic.price)), buy: () => licenseService.buy(id, "tg_store", lic.expires_at ?? null) };
  else if (buying?.addon && data.addons?.[buying.addon]) {
    const a = data.addons[buying.addon];
    const name = x.addonNames[buying.addon];
    sell = {
      icon: ADDON_ICON[buying.addon] || Puzzle,
      name,
      title: x.unlockTitle.replace("{name}", name),
      sub: x.addonWhat[buying.addon],
      perks: [...(x.perks[buying.addon] || []), a.days ? `${fmtNum(a.price)} ${x.coins} ${x.perYear}` : `${x.oneTime} · ${x.forever}`],
      price: a.price,
      label: x.buy.replace("{coins}", fmtNum(a.price)),
      buy: () => licenseService.buy(id, buying.addon, a.days ? (a.expires_at ?? null) : null),
      done: x.unlockDone.replace("{name}", name),
    };
  }
  else if (buying?.theme) {
    const name = themeName(buying.theme, lang);
    sell = {
      theme: buying.theme,
      icon: Palette,
      name,
      title: x.unlockTitle.replace("{name}", name),
      sub: x.designWhat,
      perks: [`${x.oneTime} · ${x.forever}`],
      price: data.themes.price,
      label: x.buy.replace("{coins}", fmtNum(data.themes.price)),
      buy: () => api.useTheme(buying.theme),
      done: fill(x.designBought, { name }),
    };
  }
  const SellIcon = sell?.icon;

  return (
    <div className="md-page rs-page mq-page qg-page ws-page ts-page">
      {notice}
      <div className="rs-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="rs-head">
          <span className="rs-logo">{s.logo ? <img src={s.logo} alt="" /> : <Send size={26} />}</span>
          <div className="rs-head-text">
            <h2>{s.shop_name || data.business.name}</h2>
            <div className="rs-head-meta">
              <span className="rs-chip">{x.badge}</span>
              {lic.expires_at && (
                <span className={`rs-chip s-${lic.locked ? "expired" : lic.status}`}>
                  <CalendarClock size={13} /> {x.endsOn.replace("{date}", fmtDate(lic.expires_at, lang))}
                </span>
              )}
              <span className="rs-chip">
                <Package size={13} /> {fmtNum(data.counts.products)}
              </span>
              <span className={`rs-chip ${data.open_now?.open ? "s-active" : "s-expiring"}`}>{data.open_now?.open ? x.openNowChip : x.closedNowChip}</span>
            </div>
          </div>
          <div className="mq-head-acts">
            <a className="md-btn md-btn-ghost sa-btn-sm" href={data.links.web} target="_blank" rel="noreferrer" data-testid="ts-open-store">
              <ExternalLink size={14} /> {x.openStore}
            </a>
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(link).catch(() => {});
                setNotice({ type: "success", text: x.copied });
              }}
            >
              <Copy size={14} /> {x.copyLink}
            </button>
            {(lic.status === "expiring" || lic.in_grace || lic.locked) && (
              <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuying("renew")} disabled={!data.business.status}>
                <CoinIcon size={15} /> {x.renewFor.replace("{coins}", fmtNum(lic.price))}
              </button>
            )}
          </div>
        </div>
      </div>
      {!data.business.status && <div className="md-notice md-notice-error">{x.suspended}</div>}
      {lic.in_grace && (
        <div className="rs-banner warn">
          <AlertTriangle size={18} />
          <span>
            <b>{x.graceTitle}</b> {x.graceSub.replace("{n}", graceLeft)}
          </span>
        </div>
      )}
      {lic.locked && (
        <div className="rs-banner bad">
          <Lock size={18} />
          <span>
            <b>{x.lockedTitle}</b> {x.lockedSub}
          </span>
        </div>
      )}
      <div className="rs-body">
        <nav className="rs-nav" aria-label={x.badge}>
          {navList}
        </nav>
        <button type="button" className="rs-nav-btn" onClick={() => setNavOpen(true)} aria-haspopup="dialog">
          <CurrentIcon size={17} /> <b>{x.tabs[current]}</b>
          <span className="rs-nav-btn-all">
            {x.allSections} <ChevronDown size={16} />
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
          <div className="rs-sheet" role="dialog" aria-modal="true" aria-label={x.allSections}>
            <div className="rs-sheet-head">
              <b>{x.allSections}</b>
              <button type="button" className="md-icon-btn" onClick={() => setNavOpen(false)} aria-label={x.close}>
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
            sell.theme ? (
              <div className="rs-stage ts-buy-stage">
                <MiniStore themeKey={sell.theme} color={s.color} name={s.shop_name} logo={s.logo} />
              </div>
            ) : (
              <div className="rs-stage">
                <SellIcon size={60} />
                <b>{sell.name}</b>
                <small>{s.shop_name || data.business.name}</small>
              </div>
            )
          }
          badge={x.badge}
          title={sell.title}
          sub={sell.sub}
          perks={sell.perks}
          price={sell.price}
          buyLabel={sell.label}
          buy={sell.buy}
          doneSub={sell.done || null}
          onDone={(res) => {
            reload();
            if (buying === "renew" && res?.data) setNotice({ type: "success", text: x.renewDone.replace("{date}", fmtDate(res.data.expires_at, lang)) });
          }}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}
