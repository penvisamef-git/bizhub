import { Suspense, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, MoreHorizontal } from "lucide-react";
import CoinIcon from "../../components/CoinIcon";
import "./layout.css";
import Logo from "../../components/Logo";
import LangSwitch from "../../components/LangSwitch";
import ThemeToggle from "../../components/ThemeToggle";
import { useI18n } from "../../i18n/I18nProvider";
import { auth } from "../../lib/auth";
import { authFor, canAccess, isCustomer, refreshLoginRole, roleOf } from "../../lib/permission";
import { ROLE, roleText } from "../../lib/roles";
import { coinAdminService, platformAdminService, supportService } from "../../api/services";
import { prefetchPages } from "../../pages";
import { onCoinsChanged } from "../../lib/events";
import { useAppAccent } from "../../theme/ThemeProvider";
import { memo } from "../../lib/memo";
import { ROUTES } from "../../config";
import { ACCOUNT_NAV, ALL_NAV, CLIENT_NAV, SETTINGS_NAV, SUPER_NAV, SUPPORT_NAV, TEAM_NAV, UPDATES_NAV } from "./nav";
import { JoinRouteSkeleton, TeamRouteSkeleton } from "../client/team/TeamSkeleton";
import { UpdatesSkeleton } from "../client/updates/UpdatesSkeleton";
import { ChatPageSkeleton, CoinOrdersPageSkeleton, CoinShopSkeleton, InboxPageSkeleton, PageSkeleton } from "../../components/skeleton/Skeleton";
import { useConfirmSignOut } from "../../components/ConfirmSignOut";
import { DeletionBanner } from "../client/account/DeleteAccount";

const fmtCoins = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

function nameOf(user) {
  return (user?.name || `${user?.firstname || ""} ${user?.lastname || ""}`).trim();
}
function initialsOf(user) {
  return Array.from(nameOf(user) || user?.email || "?")[0].toUpperCase();
}

/**
 * Shell for every screen after login.
 * Desktop: sidebar. Tablet: icon sidebar. Phone: bottom bar + "More" sheet.
 */
export default function AppLayout() {
  const { t } = useI18n();
  useAppAccent(); // colour theme from Settings
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => auth.getClientLogin() || {});
  // the profile photo changed (Account page): show it in the header at once
  useEffect(() => {
    const on = () => setUser(auth.getClientLogin() || {});
    window.addEventListener("bizhub-profile", on);
    return () => window.removeEventListener("bizhub-profile", on);
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef(null);

  const customer = isCustomer(user);
  const role = roleOf(user);
  const mainNav = [...(customer ? CLIENT_NAV : SUPER_NAV).filter((n) => canAccess(user, n.access)), SETTINGS_NAV, ...(customer ? [SUPPORT_NAV] : []), UPDATES_NAV];
  // badges: unread replies (customers), coin orders + chats waiting (super admin) — checked every 30 s and when the tab comes back
  const [badges, setBadges] = useState({});
  useEffect(() => {
    if (!customer && role !== ROLE.SUPER) return undefined;
    const check = () => {
      if (document.visibilityState === "hidden") return;
      (customer ? supportService.unread().then((r) => ({ support: r.data.n })) : platformAdminService.badges().then((r) => r.data)).then(setBadges).catch(() => {});
    };
    check();
    const t = setInterval(check, 30000);
    const onSeen = () => setTimeout(check, 400);
    window.addEventListener("bizhub-badges", onSeen);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(t);
      window.removeEventListener("bizhub-badges", onSeen);
      document.removeEventListener("visibilitychange", check);
    };
  }, [customer, role, location.pathname]);
  const adminNav = customer ? [] : TEAM_NAV.filter((n) => canAccess(user, n.access));
  const current = ALL_NAV.find((n) => location.pathname.startsWith(n.to));
  // pages that are not in the menu
  const pageTitle = current ? t[current.label] : location.pathname.startsWith("/app/business/") ? t.navBusiness || t.navNameCard : "BizHub";
  const fullName = nameOf(user);
  const accountLabel = customer ? t.personal : role === ROLE.SUPER ? t.superAdmin : roleText(user.role) || t.teamMember;

  // download the other pages in the background → menus open instantly
  useEffect(() => {
    prefetchPages(customer ? "customer" : role === ROLE.SUPER ? "super" : "team");
  }, [customer, role]);

  // keep role / coins in sync with the server: when the app opens, when the tab
  // comes back into view, and right after coins change (not on every click)
  const [treasury, setTreasury] = useState(null); // super admin: coins in the treasury
  useEffect(() => {
    const sync = () => {
      // always re-read the saved login: other screens may have updated it (e.g. coins after a top-up)
      refreshLoginRole(auth).then(() => setUser(auth.getClientLogin() || {}));
      if (role === ROLE.SUPER) {
        coinAdminService
          .treasury()
          .then((r) => setTreasury(r.data.treasury_balance))
          .catch(() => {});
      }
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      sync();
    };
    sync();
    document.addEventListener("visibilitychange", onVisible);
    const stop = onCoinsChanged(sync);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      stop();
    };
  }, [role]);

  // close menus when the page changes
  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // click outside closes the avatar menu
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    document.title = `${pageTitle} · BizHub`;
  }, [pageTitle]);

  const logout = async () => {
    try {
      await authFor(user).logout();
    } catch {
      /* log out locally even if the server is unreachable */
    }
    auth.removeClientLogin();
    memo.clear();
    navigate(ROUTES.login, { replace: true });
  };
  const [askLogout, logoutDialog] = useConfirmSignOut(logout);

  const today = new Intl.DateTimeFormat(t.langName === "English" ? "en-GB" : "km-KH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Phnom_Penh",
  }).format(new Date());

  const lit = (n) => !!n.match && location.pathname.startsWith(n.match);
  const navItem = (n) => (
    <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-link${isActive || lit(n) ? " active" : ""}`} title={t[n.label]}>
      <n.icon size={20} aria-hidden="true" />
      <span>{t[n.label]}</span>
      {n.badge && badges[n.badge] > 0 && <em className="nav-badge">{badges[n.badge]}</em>}
    </NavLink>
  );

  const tabs = mainNav.filter((n) => n.tab);
  const moreItems = [...mainNav.filter((n) => !n.tab), ...adminNav, ACCOUNT_NAV];
  const tabLink = (n) => (
    <NavLink key={n.to} to={n.to} className={({ isActive }) => `tab-link${isActive || lit(n) ? " active" : ""}`}>
      <n.icon size={22} aria-hidden="true" />
      <span className="tab-txt">{t[n.label]}</span>
    </NavLink>
  );

  return (
    <div className="app">
      {logoutDialog}
      <aside className="sidebar">
        <Link to={ROUTES.home} className="side-card logo-card" aria-label="BizHub home">
          <span className="logo">
            <Logo height={30} />
          </span>
          <img className="logo-mark" src="/bizhub-icon.svg" alt="BizHub" width="34" height="34" />
        </Link>
        <Link to={ACCOUNT_NAV.to} className="side-card biz-switch" title={accountLabel}>
          <span className="av">{user.photo ? <img src={user.photo} alt="" /> : initialsOf(user)}</span>
          <span className="txt">
            <small>{t.hello},</small>
            <b>{fullName || accountLabel}</b>
            <small className="role">{accountLabel}</small>
          </span>
          <span className="chev" aria-hidden="true">
            <ChevronDown size={16} />
          </span>
        </Link>
        <div className="side-card nav-card">
          <nav className="nav-group" aria-label="Main">
            {mainNav.map(navItem)}
          </nav>
          {adminNav.length > 0 && (
            <nav className="nav-group" aria-label={t.adminSection}>
              <span className="nav-label">{t.adminSection}</span>
              {adminNav.map(navItem)}
            </nav>
          )}
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <span className="biz-mini">
            <img src="/bizhub-icon.svg" alt="" width="32" height="32" />
          </span>
          <div className="head-title">
            <h1>{pageTitle}</h1>
            <p>{today}</p>
          </div>
          <span className="hide-phone">
            <LangSwitch />
          </span>
          {(customer || role === ROLE.SUPER) && (
            <Link
              to={customer ? "/app/wallet" : "/app/super-admin/coins"}
              className="coin-pill"
              title={customer ? t.coinBalance : t.treasuryCoins}
              aria-label={`${customer ? t.coinBalance : t.treasuryCoins}: ${customer ? user.coin_balance || 0 : (treasury ?? "—")}`}
            >
              <CoinIcon size={30} />
              <b>{customer ? fmtCoins(user.coin_balance) : treasury === null ? "—" : fmtCoins(treasury)}</b>
            </Link>
          )}
          <ThemeToggle />
          <div ref={menuRef} style={{ position: "relative" }}>
            <button type="button" className="avatar-btn" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} aria-label={t.navAccount}>
              {user.photo ? <img src={user.photo} alt="" /> : initialsOf(user)}
            </button>
            {menuOpen && (
              <div className="menu-pop" role="menu">
                <div className="who">
                  <b>{fullName || t.navAccount}</b>
                  <small>{user.email}</small>
                </div>
                <Link role="menuitem" className="menu-item" to={ACCOUNT_NAV.to}>
                  <ACCOUNT_NAV.icon size={18} /> {t.navAccount}
                </Link>
                <button
                  role="menuitem"
                  type="button"
                  className="menu-item danger"
                  onClick={() => {
                    setMenuOpen(false);
                    askLogout();
                  }}
                >
                  <LogOut size={18} /> {t.logout}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="app-content">
          {isCustomer(user) && <DeletionBanner user={user} />}
          {/* only this part waits while a page downloads; the menu stays on screen */}
          <Suspense fallback={<RouteSkeleton path={location.pathname} search={location.search} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* phone bottom bar */}
      <nav className="bottom-bar" aria-label="Main">
        {tabs.slice(0, 4).map(tabLink)}
        <button type="button" className="tab-link" onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
          <MoreHorizontal size={22} aria-hidden="true" />
          {Object.values(badges).some((v) => v > 0) && <i className="tab-dot" aria-hidden="true" />}
          <span className="tab-txt">{t.navMore}</span>
        </button>
      </nav>

      {moreOpen && (
        <>
          <div className="more-overlay" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div className="more-sheet" role="dialog" aria-label={t.navMore}>
            <div className="grab" />
            {moreItems.map((n) => (
              <Link key={n.to} to={n.to} className="menu-item">
                <n.icon size={20} /> {t[n.label]}
                {n.badge && badges[n.badge] > 0 && <em className="nav-badge">{badges[n.badge]}</em>}
              </Link>
            ))}
            <div className="setting-row" style={{ padding: "10px" }}>
              <span>{t.language}</span>
              <LangSwitch />
            </div>
            <button
              type="button"
              className="menu-item danger"
              onClick={() => {
                setMenuOpen(false);
                askLogout();
              }}
            >
              <LogOut size={20} /> {t.logout}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// while a page downloads: a skeleton that looks like that page
function RouteSkeleton({ path, search }) {
  if (path.startsWith("/app/support")) return <ChatPageSkeleton />;
  if (/^\/app\/business\/[^/]+\/team/.test(path)) return <TeamRouteSkeleton />;
  if (path.startsWith("/app/join/")) return <JoinRouteSkeleton />;
  if (path.startsWith("/app/updates")) return <UpdatesSkeleton />;
  if (path.startsWith("/app/super-admin/inbox")) return <InboxPageSkeleton />;
  if (path.startsWith("/app/super-admin/coin-orders")) return <CoinOrdersPageSkeleton />;
  if (path.startsWith("/app/licenses") && /tab=coins/.test(search)) return <CoinShopSkeleton />;
  return <PageSkeleton />;
}
