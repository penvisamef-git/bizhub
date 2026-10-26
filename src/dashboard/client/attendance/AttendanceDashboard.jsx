import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CalendarHeart,
  CalendarRange,
  ChevronDown,
  CircleCheck,
  Clock,
  Coins,
  FileText,
  Fingerprint,
  Globe,
  Inbox,
  Lock,
  MapPin,
  Megaphone,
  Award,
  Palette,
  Puzzle,
  ScanLine,
  Send,
  Settings2,
  Sun,
  Users,
  X,
} from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../namecard/namecard-editor.css";
import "../restaurant/restaurant.css";
import "./attendance.css";
import { attendanceService, licenseService } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import { memo } from "../../../lib/memo";
import { fmtDate, useAttText } from "./text";
import { ADDON_ICONS, ADDON_TAB, addonText } from "./addon-info";
import TeamNavLink from "../team/TeamNavLink";
import MyBusinesses from "../../../components/MyBusinesses";

const LOAD = {
  daily: () => import("./DailyTabs"),
  report: () => import("./ReportTab"),
  setup: () => import("./SetupTabs"),
  looks: () => import("./LooksTab"),
  addons: () => import("./AddonsTab"),
  more: () => import("./AddonTabs"),
  website: () => import("./WebsiteTab"),
  days: () => import("./DaysTabs"),
  roster: () => import("./RosterTab"),
  engage: () => import("./EngageTabs"),
};
const TodayTab = lazy(() => LOAD.daily().then((m) => ({ default: m.TodayTab })));
const ReviewTab = lazy(() => LOAD.daily().then((m) => ({ default: m.ReviewTab })));
const ReportTab = lazy(LOAD.report);
const StaffTab = lazy(() => LOAD.setup().then((m) => ({ default: m.StaffTab })));
const BranchesTab = lazy(() => LOAD.setup().then((m) => ({ default: m.BranchesTab })));
const ShiftsTab = lazy(() => LOAD.setup().then((m) => ({ default: m.ShiftsTab })));
const SettingsTab = lazy(() => LOAD.setup().then((m) => ({ default: m.SettingsTab })));
const LooksTab = lazy(LOAD.looks);
const AddonsTab = lazy(LOAD.addons);
const LeaveTab = lazy(() => LOAD.more().then((m) => ({ default: m.LeaveTab })));
const PayrollTab = lazy(() => LOAD.more().then((m) => ({ default: m.PayrollTab })));
const TelegramTab = lazy(() => LOAD.more().then((m) => ({ default: m.TelegramTab })));
const KioskTab = lazy(() => LOAD.more().then((m) => ({ default: m.KioskTab })));
const WebsiteTab = lazy(LOAD.website);
const RosterTab = lazy(LOAD.roster);
const NewsTab = lazy(() => LOAD.engage().then((m) => ({ default: m.NewsTab })));
const RewardsTab = lazy(() => LOAD.engage().then((m) => ({ default: m.RewardsTab })));
const HolidaysTab = lazy(() => LOAD.days().then((m) => ({ default: m.HolidaysTab })));

const TABS = [
  ["today", Sun, TodayTab],
  ["review", Inbox, ReviewTab],
  ["report", BarChart3, ReportTab],
  ["roster", CalendarRange, RosterTab],
  ["leave", FileText, LeaveTab],
  ["payroll", Coins, PayrollTab],
  ["news", Megaphone, NewsTab],
  ["rewards", Award, RewardsTab],
  ["staff", Users, StaffTab],
  ["branches", MapPin, BranchesTab],
  ["shifts", Clock, ShiftsTab],
  ["holidays", CalendarHeart, HolidaysTab],
  ["settings", Settings2, SettingsTab],
  ["looks", Palette, LooksTab],
  ["telegram", Send, TelegramTab],
  ["kiosk", ScanLine, KioskTab],
  ["website", Globe, WebsiteTab],
  ["addons", Puzzle, AddonsTab],
];
const GROUPS = [
  ["daily", ["today", "review", "report", "roster", "leave", "payroll", "news", "rewards"]],
  ["setup", ["staff", "branches", "shifts", "holidays", "settings", "looks", "telegram", "kiosk", "website"]],
  [null, ["addons"]],
];
const STEP_OF = { branches: "branch", shifts: "shift", staff: "staff", settings: "link" };
const NEEDS = { leave: "att_leave", payroll: "att_payroll", telegram: "att_telegram", kiosk: "att_kiosk", website: "att_website", roster: "att_roster", news: "att_news", rewards: "att_rewards" }; // a lock until bought
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// Attendance: staff clock in / out on their own phone (GPS checked); the owner sees today, reviews, reports
export default function AttendanceDashboard() {
  const { id } = useParams();
  const { a, lang } = useAttText();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(() => memo.get(`att:${id}`) || null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(null); // "renew" | { slot: item? }
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "today";

  const reload = useCallback(
    () =>
      attendanceService
        .get(id)
        .then((res) => {
          memo.set(`att:${id}`, res.data);
          setData(res.data);
          setError("");
          return res.data;
        })
        .catch((e) => setError(e.message || a.loadFail)),
    [id, a.loadFail],
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

  const ctx = useMemo(() => {
    if (!data) return null;
    return {
      id,
      a,
      lang,
      data,
      readOnly: !data.business.status || !!data.license.locked,
      reload,
      notify: setNotice,
      askBuy: setBuying,
      go,
    };
  }, [data, id, a, lang, reload, setNotice, go]);

  if (error && !data) {
    return (
      <div className="panel-card sa-empty-state">
        <p>{error}</p>
        <button type="button" className="md-btn md-btn-primary" onClick={reload}>
          {a.retry}
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
  const pending = (data.counts.pending || 0) + (data.counts.fix_pending || 0) + (data.counts.ot_pending || 0);

  const navList = GROUPS.map(([group, keys]) => (
    <div key={group || "more"} className="rs-nav-group">
      {group && <span className="rs-nav-label">{a.navGroups[group]}</span>}
      {keys.map((key) => {
        const Icon = TABS.find(([k]) => k === key)[1];
        const step = STEP_OF[key] ? data.setup.steps[STEP_OF[key]] : undefined;
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
            <span className="rs-nav-text">{a.tabs[key]}</span>
            {step !== undefined && data.setup.done < data.setup.total && <span className={`rs-dot ${step ? "ok" : ""}`} aria-hidden="true" />}
            {key === "review" && pending > 0 && <span className="rs-badge">{pending > 99 ? "99+" : pending}</span>}
            {key === "leave" && data.counts.leave_pending > 0 && <span className="rs-badge">{data.counts.leave_pending}</span>}
            {NEEDS[key] && !data.addons?.[NEEDS[key]]?.active && <Lock size={13} className="rs-nav-lock" />}
          </button>
        );
      })}
      {keys.includes("addons") && <TeamNavLink id={id} onGo={() => setNavOpen(false)} />}
    </div>
  ));

  // what the purchase window sells: "renew" | { item? } (branch) | { kind: "staff", item? } | { addon: key }
  const ai = addonText(lang);
  const sell = !buying ? null : buying === "renew" ? { key: "renew" } : buying.addon ? { key: buying.addon } : buying.kind === "staff" ? { key: "att_staff", item: buying.item } : { key: "att_branch", item: buying.item };
  const sellKey = sell?.key;
  const price = !sell ? 0 : sellKey === "renew" ? data.renew_price : sellKey === "att_branch" ? data.slot_price : (data.addons?.[sellKey]?.price ?? 0);
  const SellIcon = sellKey === "renew" ? CalendarClock : ADDON_ICONS[sellKey] || Puzzle;
  const sellName = sellKey === "renew" ? a.renewTitle : sellKey === "att_branch" ? a.buyBranchTitle : ai.names[sellKey];
  const sellCurrent = !sell ? null : sellKey === "renew" ? lic : sellKey === "att_branch" ? data.slots.find((x) => x.item === sell.item) : sellKey === "att_staff" ? data.staff_slots?.find((x) => x.item === sell.item) : data.addons?.[sellKey];

  return (
    <div className="md-page rs-page at-page">
      {notice}
      <div className="rs-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="rs-head">
          <span className="rs-logo at-logo">{data.business.logo_url ? <img src={data.business.logo_url} alt="" /> : <Fingerprint size={26} />}</span>
          <div className="rs-head-text">
            <h2>{data.business.name}</h2>
            <div className="rs-head-meta">
              <span className="rs-chip">{a.type}</span>
              {lic.expires_at && (
                <span className={`rs-chip s-${lic.locked ? "expired" : lic.status}`}>
                  <CalendarClock size={13} /> {a.endsOn.replace("{date}", fmtDate(lic.expires_at, lang))}
                </span>
              )}
              <span className="rs-chip">
                <Users size={13} /> {a.planLine.replace("{staff}", `${data.counts.staff}/${data.limits.staff}`).replace("{branches}", `${data.counts.branches}/${data.limits.branches}`)}
              </span>
              {data.setup.done < data.setup.total && (
                <span className="rs-chip">
                  <CircleCheck size={13} /> {a.stepsDone.replace("{done}", data.setup.done).replace("{total}", data.setup.total)}
                </span>
              )}
            </div>
          </div>
          {(lic.status === "expiring" || lic.in_grace || lic.locked) && (
            <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => setBuying("renew")}>
              <CoinIcon size={16} /> {a.renew}
            </button>
          )}
        </div>
      </div>

      {!data.business.status && <div className="md-notice md-notice-error">{a.suspended}</div>}
      {lic.in_grace && (
        <div className="rs-banner warn">
          <AlertTriangle size={18} />
          <span>
            <b>{a.graceTitle}</b> {a.graceSub.replace("{n}", graceLeft)}
          </span>
        </div>
      )}
      {lic.locked && (
        <div className="rs-banner bad">
          <Lock size={18} />
          <span>
            <b>{a.lockedTitle}</b> {a.lockedSub}
          </span>
        </div>
      )}

      <div className="rs-body">
        <nav className="rs-nav" aria-label={a.type}>
          {navList}
        </nav>
        <button type="button" className="rs-nav-btn" onClick={() => setNavOpen(true)} aria-haspopup="dialog">
          <CurrentIcon size={17} /> <b>{a.tabs[tab]}</b>
          <span className="rs-nav-btn-all">
            {a.allSections} <ChevronDown size={16} />
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
          <div className="rs-sheet" role="dialog" aria-modal="true" aria-label={a.allSections}>
            <div className="rs-sheet-head">
              <b>{a.allSections}</b>
              <button type="button" className="md-icon-btn" onClick={() => setNavOpen(false)} aria-label={a.close}>
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
              <SellIcon size={64} />
              <b>{sellName}</b>
              <small>{data.business.name}</small>
            </div>
          }
          badge={sellKey === "renew" ? a.renew : a.tabs.addons}
          title={sellKey === "renew" ? a.renewTitle : sellKey === "att_branch" ? a.buyBranchTitle : a.unlockTitle.replace("{name}", sellName)}
          sub={sellKey === "renew" ? a.renewSub : sellKey === "att_branch" ? a.buyBranchWhat : ai.what[sellKey]}
          perks={sellKey === "renew" ? [] : [...(ai.perks[sellKey] || []), `${fmt(price)} ${a.coins} ${a.perYear}`]}
          price={price ?? 0}
          buyLabel={`${sellKey === "renew" ? a.renew : sellCurrent?.active ? a.renew : a.add} · ${fmt(price)} ${a.coins}`}
          buy={async () => {
            if (sellKey === "renew") return licenseService.buy(id, "attendance", lic.expires_at ?? null);
            if (sellKey === "att_branch" || sellKey === "att_staff") return attendanceService.buySlot(id, sell.item, sell.item ? (sellCurrent?.expires_at ?? null) : undefined, sellKey === "att_staff" ? "staff" : "branch");
            return licenseService.buy(id, sellKey, sellCurrent?.expires_at ?? null);
          }}
          doneSub={sellKey === "att_branch" ? a.branchBought : sellKey === "renew" ? null : a.unlockDone.replace("{name}", sellName)}
          onDone={async (res) => {
            await reload();
            if (sellKey === "renew" && res?.data) setNotice({ type: "success", text: a.renewDone.replace("{date}", fmtDate(res.data.expires_at, lang)) });
            // just unlocked → open its page
            if (sellKey !== "renew" && ADDON_TAB[sellKey] && ADDON_TAB[sellKey] !== tab) go(ADDON_TAB[sellKey]);
          }}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}
