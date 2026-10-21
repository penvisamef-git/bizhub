import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BedDouble,
  Building2,
  CalendarClock,
  CalendarRange,
  ChevronDown,
  ClipboardList,
  Lock,
  MonitorSmartphone,
  Printer,
  BadgePercent,
  Users,
  Puzzle,
  Store,
  Settings2,
  Sun,
  X,
  Globe,
  Send,
  ShieldCheck,
  ConciergeBell,
  Sparkles,
  Wallet,
  CalendarSync,
  KeyRound,
  Star,
  Gift,
  Network,
} from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../namecard/namecard-editor.css";
import "../restaurant/restaurant.css";
import "../attendance/attendance.css";
import "./guesthouse.css";
import { guestHouseService, licenseService } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import { memo } from "../../../lib/memo";
import { fmtDate, useGhText } from "./text";
import { THEME_NAMES } from "../../../pos/guesthouse/DisplayView";
import { printName } from "../../../pos/guesthouse/GhReceipt";
import { siteLookName } from "../../../gsite/looks";
import { WS_TEXT } from "./ws-text";
import { PORTAL_LOOKS } from "../../../gsite/portal/ptext";
import { cuText } from "./gh2-text";
import { BookingAlertBar, RequestsSheet, useBookingAlert } from "./GhRequests";
import MyBusinesses from "../../../components/MyBusinesses";

const LOAD = { daily: () => import("./GhDaily"), setup: () => import("./GhSetup") };
const TodayTab = lazy(() => LOAD.daily().then((m) => ({ default: m.TodayTab })));
const CalendarTab = lazy(() => LOAD.daily().then((m) => ({ default: m.CalendarTab })));
const BookingsTab = lazy(() => LOAD.daily().then((m) => ({ default: m.BookingsTab })));
const ReportTab = lazy(() => LOAD.daily().then((m) => ({ default: m.ReportTab })));
const RoomsTab = lazy(() => LOAD.setup().then((m) => ({ default: m.RoomsTab })));
const AddonsTab = lazy(() => LOAD.setup().then((m) => ({ default: m.AddonsTab })));
const ProfileTab = lazy(() => import("./GhProfile").then((m) => ({ default: m.ProfileTab })));
const PosTab = lazy(() => import("./GhPosSetup").then((m) => ({ default: m.PosTab })));
const SettingsTab = lazy(() => LOAD.setup().then((m) => ({ default: m.SettingsTab })));
const PrintTab = lazy(() => import("./GhPrint").then((m) => ({ default: m.PrintTab })));
const WebsiteTab = lazy(() => import("./GhWebsite").then((m) => ({ default: m.WebsiteTab })));
const PromosTab = lazy(() => import("./GhPromos").then((m) => ({ default: m.PromosTab })));
const CustomersTab = lazy(() => import("./GhCustomers").then((m) => ({ default: m.CustomersTab })));
const TelegramTab = lazy(() => import("./GhExtras").then((m) => ({ default: m.TelegramTab })));
const PoliceTab = lazy(() => import("./GhExtras").then((m) => ({ default: m.PoliceTab })));
const ServicesTab = lazy(() => import("./GhExtras").then((m) => ({ default: m.ServicesTab })));
const ReviewsTab = lazy(() => import("./GhGuests").then((m) => ({ default: m.ReviewsTab })));
const LoyaltyTab = lazy(() => import("./GhGuests").then((m) => ({ default: m.LoyaltyTab })));
const LeasesTab = lazy(() => import("./GhLease").then((m) => ({ default: m.LeasesTab })));
const OtaTab = lazy(() => import("./GhOta").then((m) => ({ default: m.OtaTab })));
const HousekeepingTab = lazy(() => import("./GhOps").then((m) => ({ default: m.HousekeepingTab })));
const ExpensesTab = lazy(() => import("./GhOps").then((m) => ({ default: m.ExpensesTab })));
// several guest houses (gh_branches): the shared group + report screen
const BranchesTab = lazy(() =>
  import("../branches/BranchesTab").then((m) => ({
    default: function GhBranches({ ctx }) {
      const a = ctx.data.addons?.gh_branches || {};
      return <m.default id={ctx.id} category="guest_house" lang={ctx.lang} owned={!!a.active} price={a.price} readOnly={ctx.readOnly} onBuy={() => ctx.askBuy({ addon: "gh_branches" })} notify={ctx.notify} />;
    },
  })),
);

const TABS = [
  ["today", Sun, TodayTab],
  ["calendar", CalendarRange, CalendarTab],
  ["bookings", ClipboardList, BookingsTab],
  ["report", BarChart3, ReportTab],
  ["rooms", BedDouble, RoomsTab],
  ["settings", Settings2, SettingsTab],
  ["pos", MonitorSmartphone, PosTab],
  ["print", Printer, PrintTab],
  ["website", Globe, WebsiteTab],
  ["promos", BadgePercent, PromosTab],
  ["customers", Users, CustomersTab],
  ["police", ShieldCheck, PoliceTab],
  ["housekeeping", Sparkles, HousekeepingTab],
  ["ota", CalendarSync, OtaTab],
  ["longstay", KeyRound, LeasesTab],
  ["reviews", Star, ReviewsTab],
  ["loyalty", Gift, LoyaltyTab],
  ["expenses", Wallet, ExpensesTab],
  ["services", ConciergeBell, ServicesTab],
  ["telegram", Send, TelegramTab],
  ["profile", Store, ProfileTab],
  ["branches", Network, BranchesTab],
  ["addons", Puzzle, AddonsTab],
];
const GROUPS = [
  ["daily", ["today", "calendar", "bookings", "longstay", "housekeeping", "report", "expenses", "police"]],
  ["setup", ["profile", "rooms", "pos", "print", "services", "website", "ota", "promos", "customers", "loyalty", "reviews", "telegram", "settings"]],
  [null, ["branches", "addons"]],
];
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// Guest House: room types, rooms, bookings, check-in / check-out and the room bill
export default function GuestHouseDashboard() {
  const { id } = useParams();
  const { g, lang } = useGhText();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(() => memo.get(`gh:${id}`) || null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(null); // "renew" | { addon: key }
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "today";

  const reload = useCallback(
    () =>
      guestHouseService
        .get(id)
        .then((res) => {
          memo.set(`gh:${id}`, res.data);
          setData(res.data);
          setError("");
          return res.data;
        })
        .catch((e) => setError(e.message || g.loadFail)),
    [id, g.loadFail],
  );
  useEffect(() => {
    reload();
    const t = setTimeout(() => Object.values(LOAD).forEach((l) => l().catch(() => {})), 400);
    return () => clearTimeout(t);
  }, [reload]);

  const go = useCallback(
    (key) => {
      setParams(key === "today" ? {} : { tab: key }, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setParams],
  );

  // online bookings from customer accounts: ring until someone accepts
  const alert = useBookingAlert(guestHouseService, id, !!data?.addons?.gh_customers?.active);
  const [sheet, setSheet] = useState(false);
  const ctx = useMemo(() => {
    if (!data) return null;
    return { id, g, lang, data, cur: data.settings.currency, readOnly: !data.business.status || !!data.license.locked, reload, notify: setNotice, askBuy: setBuying, go };
  }, [data, id, g, lang, reload, setNotice, go]);

  if (error && !data) {
    return (
      <div className="panel-card sa-empty-state">
        <p>{error}</p>
        <button type="button" className="md-btn md-btn-primary" onClick={reload}>
          {g.retry}
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
  const needsSetup = !data.types.length || !data.counts.rooms;

  const navList = GROUPS.map(([group, keys]) => (
    <div key={group || "more"} className="rs-nav-group">
      {group && <span className="rs-nav-label">{g.navGroups[group]}</span>}
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
            <span className="rs-nav-text">{g.tabs[key]}</span>
            {key === "rooms" && needsSetup && <span className="rs-dot" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  ));

  const sellKey = buying === "renew" ? "renew" : buying?.addon;
  const sellInfo =
    !sellKey || sellKey === "renew"
      ? null
      : sellKey === "gh_display_theme"
        ? { name: g.lookName.replace("{name}", (THEME_NAMES[lang] || THEME_NAMES.en)[buying.item] || buying.item), what: g.lookWhat, perks: [] }
        : sellKey === "gh_print_theme"
          ? { name: g.templateName.replace("{name}", printName(buying.item, lang)), what: g.templateWhat, perks: [] }
          : sellKey === "gh_site_theme"
            ? { name: WS_TEXT[lang === "km" ? "km" : "en"].lookName.replace("{name}", siteLookName(buying.item, lang)), what: WS_TEXT[lang === "km" ? "km" : "en"].lookWhat, perks: [] }
            : sellKey === "gh_portal_theme"
              ? { name: cuText(lang).lookName.replace("{name}", PORTAL_LOOKS[buying.item]?.[lang === "km" ? "km" : "en"] || buying.item), what: cuText(lang).lookWhat, perks: [] }
              : g.addonInfo[sellKey];
  const price = sellKey === "renew" ? data.renew_price : (data.addons?.[sellKey]?.price ?? 0);

  return (
    <div className="md-page rs-page at-page gh-page">
      {notice}
      <BookingAlertBar lang={lang} alert={alert} onOpen={() => setSheet(true)} />
      {sheet && (
        <RequestsSheet
          api={guestHouseService}
          id={id}
          lang={lang}
          cur={data.settings.currency}
          notify={setNotice}
          onClose={() => setSheet(false)}
          onChange={() => {
            alert.refresh();
            reload();
          }}
        />
      )}
      <div className="rs-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="rs-head">
          <span className="rs-logo gh-logo">{data.business.logo_url ? <img src={data.business.logo_url} alt="" /> : <BedDouble size={26} />}</span>
          <div className="rs-head-text">
            <h2>{data.business.name}</h2>
            <div className="rs-head-meta">
              <span className="rs-chip">{g.type}</span>
              {lic.expires_at && (
                <span className={`rs-chip s-${lic.locked ? "expired" : lic.status}`}>
                  <CalendarClock size={13} /> {g.endsOn.replace("{date}", fmtDate(lic.expires_at, lang))}
                </span>
              )}
              <span className="rs-chip">
                <Building2 size={13} /> {data.addons?.gh_rooms?.active ? g.roomsAll.replace("{n}", data.counts.rooms) : g.roomsLine.replace("{n}", data.counts.rooms).replace("{max}", data.limits.rooms)}
              </span>
            </div>
          </div>
          {(lic.status === "expiring" || lic.in_grace || lic.locked) && (
            <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => setBuying("renew")}>
              <CoinIcon size={16} /> {g.renew}
            </button>
          )}
        </div>
      </div>

      {!data.business.status && <div className="md-notice md-notice-error">{g.suspended}</div>}
      {lic.in_grace && (
        <div className="rs-banner warn">
          <AlertTriangle size={18} />
          <span>
            <b>{g.graceTitle}</b> {g.graceSub.replace("{n}", graceLeft)}
          </span>
        </div>
      )}
      {lic.locked && (
        <div className="rs-banner bad">
          <Lock size={18} />
          <span>
            <b>{g.lockedTitle}</b> {g.lockedSub}
          </span>
        </div>
      )}

      <div className="rs-body">
        <nav className="rs-nav" aria-label={g.type}>
          {navList}
        </nav>
        <button type="button" className="rs-nav-btn" onClick={() => setNavOpen(true)} aria-haspopup="dialog">
          <CurrentIcon size={17} /> <b>{g.tabs[tab]}</b>
          <span className="rs-nav-btn-all">
            {g.allSections} <ChevronDown size={16} />
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
          <div className="rs-sheet" role="dialog" aria-modal="true" aria-label={g.allSections}>
            <div className="rs-sheet-head">
              <b>{g.allSections}</b>
              <button type="button" className="md-icon-btn" onClick={() => setNavOpen(false)} aria-label={g.close}>
                <X size={18} />
              </button>
            </div>
            <nav className="rs-nav in-sheet">{navList}</nav>
          </div>
        </div>
      )}

      {sellKey && (
        <PurchaseModal
          stage={
            <div className="rs-stage">
              {sellKey === "renew" ? <CalendarClock size={64} /> : <Puzzle size={64} />}
              <b>{sellKey === "renew" ? g.renewTitle : sellInfo.name}</b>
              <small>{data.business.name}</small>
            </div>
          }
          badge={sellKey === "renew" ? g.renew : g.tabs.addons}
          title={sellKey === "renew" ? g.renewTitle : sellInfo.name}
          sub={sellKey === "renew" ? g.renewSub : sellInfo.what}
          perks={
            sellKey === "renew" ? [] : [...sellInfo.perks, `${fmt(price)} ${g.coins} · ${["gh_staff", "gh_website", "gh_customers", "gh_telegram", "gh_ical", "gh_longstay", "gh_reviews", "gh_loyalty"].includes(sellKey) ? g.perYear : g.forever}`]
          }
          price={price ?? 0}
          buyLabel={`${sellKey === "renew" || data.addons?.[sellKey]?.active ? g.renew : g.add} · ${fmt(price)} ${g.coins}`}
          buy={async () =>
            sellKey === "gh_display_theme"
              ? guestHouseService.buyTheme(id, buying.item)
              : sellKey === "gh_print_theme"
                ? guestHouseService.buyPrintTheme(id, buying.item)
                : sellKey === "gh_site_theme"
                  ? guestHouseService.buySiteTheme(id, buying.item)
                  : sellKey === "gh_portal_theme"
                    ? guestHouseService.buyPortalTheme(id, buying.item)
                    : licenseService.buy(id, sellKey === "renew" ? "guest_house" : sellKey, sellKey === "renew" ? (lic.expires_at ?? null) : (data.addons?.[sellKey]?.expires_at ?? null))
          }
          doneSub={sellKey === "renew" ? null : g.unlocked.replace("{name}", sellInfo.name)}
          onDone={async (res) => {
            await reload();
            if (sellKey === "renew" && res?.data) setNotice({ type: "success", text: g.renewDone.replace("{date}", fmtDate(res.data.expires_at, lang)) });
          }}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}
