import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { auth } from "./lib/auth";
import { ACCESS, canAccess, homeFor } from "./lib/permission";
import { ROUTES } from "./config";
import RequireAuth from "./components/RequireAuth";
import HomePage from "./homepage/HomePage";
import NotFoundPage from "./common/NotFoundPage";
import { PAGES } from "./pages";
import { CardPageSkeleton, FullPageSkeleton, PortfolioPageSkeleton } from "./components/skeleton/Skeleton";

// Load the logged-in app and auth pages only when needed (smaller homepage download)
const LoginPage = lazy(PAGES.login);
const SignUpPage = lazy(PAGES.signUp);
const ForgotPasswordPage = lazy(PAGES.forgot);
const TermsPage = lazy(PAGES.terms);
const PrivacyPage = lazy(PAGES.privacy);
const DeleteAccountPage = lazy(PAGES.deleteAccount);
const PhoneSignUpPage = lazy(PAGES.phoneSignUp);
const PhoneForgotPage = lazy(PAGES.phoneForgot);
const SMS_ON = import.meta.env.VITE_SMS_SIGNUP === "1"; // SMS sign-up needs Firebase billing
const AppLayout = lazy(PAGES.appLayout);
const MyBusinessesPage = lazy(PAGES.myBusinesses);
// client dashboard (each business service gets its own folder here later)
const DashboardPage = lazy(PAGES.dashboard);
const WalletPage = lazy(PAGES.wallet);
const BusinessPage = lazy(PAGES.businessPage);
const MenuPage = lazy(PAGES.publicMenu);
const OrderPage = lazy(PAGES.publicOrder);
const MemberPage = lazy(PAGES.publicMember);
const PointsCheckPage = lazy(PAGES.publicPoints);
const SitePage = lazy(PAGES.publicSite);
const WebPage = lazy(PAGES.publicWeb);
const StayPage = lazy(PAGES.publicStay);
const StayAccount = lazy(PAGES.publicStayAccount);
const StayReview = lazy(PAGES.publicReview);
const MartSitePage = lazy(PAGES.publicMart);
const MenuQrPage = lazy(PAGES.publicMenuQr);
const ShelfPage = lazy(PAGES.publicShelf);
const BookPage = lazy(PAGES.publicBook);
const EvEventPage = lazy(PAGES.publicEvent);
const EvOrderPage = lazy(PAGES.publicEvOrder);
const EvTicketPage = lazy(PAGES.publicEvTicket);
const EvCertPage = lazy(PAGES.publicEvCert);
const EvMyPage = lazy(() => PAGES.publicEvMore().then((m) => ({ default: m.MyTicketsPage })));
const EvFeedbackPage = lazy(() => PAGES.publicEvMore().then((m) => ({ default: m.FeedbackPage })));
const EvDiscoverPage = lazy(() => PAGES.publicEvMore().then((m) => ({ default: m.DiscoverPage })));
const EvDoorApp = lazy(PAGES.evDoor);
const QrPage = lazy(PAGES.publicQr);
const WebsitePage = lazy(PAGES.publicWebsite);
const DebtStatement = lazy(PAGES.publicDebt);
const NotePublic = lazy(PAGES.publicNote);
const NoteGroupPublic = lazy(PAGES.publicNoteGroup);
const StampShop = lazy(PAGES.publicStampShop);
const StampCardPage = lazy(PAGES.publicStampCard);
const StampDesk = lazy(PAGES.stampDesk);
const QrRedeemPage = lazy(PAGES.publicQrRedeem);
const MartAccount = lazy(PAGES.publicMartAccount);
const PosApp = lazy(PAGES.pos);
const AttendStaffApp = lazy(PAGES.attendStaff);
const AttendKiosk = lazy(PAGES.attendKiosk);
const CustomerDisplay = lazy(PAGES.posDisplay);
const GhPosApp = lazy(PAGES.ghPos);
const MartPosApp = lazy(PAGES.martPos);
const MartDisplay = lazy(PAGES.martDisplay);
const GhDisplay = lazy(PAGES.ghDisplay);
const SettingsPage = lazy(PAGES.settings);
const SupportPage = lazy(PAGES.support);
const CoinOrdersPage = lazy(PAGES.superCoinOrders);
const InboxPage = lazy(PAGES.superInbox);
const AccountPage = lazy(PAGES.account);
// super admin dashboard
const SuperDashboardPage = lazy(PAGES.superDashboard);
const CustomersPage = lazy(PAGES.customers);
const BusinessesPage = lazy(PAGES.businesses);
const CoinsPage = lazy(PAGES.coins);
// BizHub team pages
const HomepageSettingsPage = lazy(PAGES.homepageSettings);
const PricesPage = lazy(PAGES.prices);
const GroupsPage = lazy(PAGES.groups);
const UsersPage = lazy(PAGES.users);
const ActivityLogPage = lazy(PAGES.activityLog);
const PublicCardPage = lazy(PAGES.publicCard);
const PortfolioPage = lazy(PAGES.publicPortfolio);
const LicensesPage = lazy(PAGES.licenses);
const LicensesAdminPage = lazy(PAGES.superLicenses);
const HolidaysAdminPage = lazy(PAGES.superHolidays);

// Screens only some accounts may open (others go to their own first screen)
function Guard({ access, children }) {
  const user = auth.getClientLogin();
  return canAccess(user, access) ? children : <Navigate to={homeFor(user)} replace />;
}

// Logged-in users skip /login and /sign-up
function GuestOnly({ children }) {
  const user = auth.getClientLogin();
  return user ? <Navigate to={homeFor(user)} replace /> : children;
}

// /app → the right first screen for this account
function AppHome() {
  return <Navigate to={homeFor(auth.getClientLogin())} replace />;
}

// What to show while a page's code downloads (looks like the page that is coming)
function RouteFallback() {
  const path = window.location.pathname;
  if (path.startsWith("/public/portfolio/")) return <PortfolioPageSkeleton />;
  if (path.startsWith("/public/card/") || path.startsWith("/public/menu/") || path.startsWith("/public/order/") || path.startsWith("/public/member/") || path.startsWith("/public/points/")) return <CardPageSkeleton />;
  if (path.startsWith("/app")) return <FullPageSkeleton />;
  if (path.startsWith("/pos")) return <div aria-busy="true" style={{ minHeight: "100vh", background: "#f6f4f0" }} />;
  if (path.startsWith("/w/")) return <div aria-busy="true" style={{ minHeight: "100vh", background: "#f5f6f8" }} />;
  if (path.startsWith("/s/")) return <div className="st-loading" aria-busy="true" style={{ minHeight: "100vh", background: "#f6f4f0" }} />;
  return <div className="page-loading" aria-busy="true" />;
}

/**
 * Routes
 *   /                 homepage
 *   /login, /sign-up  auth
 *   /app/*              customer screens (business owners): dashboard, name card, wallet
 *   /app/super-admin/*  super admin: dashboard, customers, businesses, coins, website
 *   /app/admin/*        BizHub team: users, activity log
 *   /app/settings, /app/account  everyone
 *   /public/*         public pages (digital name card, portfolio…)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />
          <Route
            path="/sign-up"
            element={
              <GuestOnly>
                <SignUpPage />
              </GuestOnly>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestOnly>
                <ForgotPasswordPage />
              </GuestOnly>
            }
          />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/delete-account" element={<DeleteAccountPage />} />
          {SMS_ON && (
            <Route
              path="/sign-up/phone"
              element={
                <GuestOnly>
                  <PhoneSignUpPage />
                </GuestOnly>
              }
            />
          )}
          {SMS_ON && (
            <Route
              path="/forgot-password/phone"
              element={
                <GuestOnly>
                  <PhoneForgotPage />
                </GuestOnly>
              }
            />
          )}

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AppHome />} />
            <Route
              path="dashboard"
              element={
                <Guard access={ACCESS.CUSTOMER}>
                  <DashboardPage />
                </Guard>
              }
            />
            {/* the digital name card lives inside a business (type: Digital Name Card) */}
            <Route path="name-card" element={<Navigate to="/app/dashboard" replace />} />
            <Route
              path="businesses"
              element={
                <Guard access={ACCESS.CUSTOMER}>
                  <MyBusinessesPage />
                </Guard>
              }
            />
            <Route
              path="wallet"
              element={
                <Guard access={ACCESS.CUSTOMER}>
                  <WalletPage />
                </Guard>
              }
            />
            <Route
              path="business/:id"
              element={
                <Guard access={ACCESS.CUSTOMER}>
                  <BusinessPage />
                </Guard>
              }
            />
            <Route
              path="licenses"
              element={
                <Guard access={ACCESS.CUSTOMER}>
                  <LicensesPage />
                </Guard>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="support"
              element={
                <Guard access={ACCESS.CUSTOMER}>
                  <SupportPage />
                </Guard>
              }
            />
            <Route
              path="super-admin/coin-orders"
              element={
                <Guard access={ACCESS.SUPER}>
                  <CoinOrdersPage />
                </Guard>
              }
            />
            <Route
              path="super-admin/inbox"
              element={
                <Guard access={ACCESS.SUPER}>
                  <InboxPage />
                </Guard>
              }
            />
            <Route path="account" element={<AccountPage />} />
            <Route path="super-admin" element={<Navigate to="dashboard" replace />} />
            <Route
              path="super-admin/dashboard"
              element={
                <Guard access={ACCESS.SUPER}>
                  <SuperDashboardPage />
                </Guard>
              }
            />
            <Route
              path="super-admin/customers"
              element={
                <Guard access={ACCESS.SUPER}>
                  <CustomersPage />
                </Guard>
              }
            />
            <Route
              path="super-admin/businesses"
              element={
                <Guard access={ACCESS.SUPER}>
                  <BusinessesPage />
                </Guard>
              }
            />
            <Route
              path="super-admin/coins"
              element={
                <Guard access={ACCESS.SUPER}>
                  <CoinsPage />
                </Guard>
              }
            />
            <Route
              path="super-admin/licenses"
              element={
                <Guard access={ACCESS.SUPER}>
                  <LicensesAdminPage />
                </Guard>
              }
            />
            <Route
              path="super-admin/holidays"
              element={
                <Guard access={ACCESS.SUPER}>
                  <HolidaysAdminPage />
                </Guard>
              }
            />
            <Route
              path="super-admin/prices"
              element={
                <Guard access={ACCESS.SUPER}>
                  <PricesPage />
                </Guard>
              }
            />
            <Route
              path="super-admin/groups"
              element={
                <Guard access={ACCESS.SUPER}>
                  <GroupsPage />
                </Guard>
              }
            />
            <Route
              path="super-admin/website"
              element={
                <Guard access={ACCESS.SUPER}>
                  <HomepageSettingsPage />
                </Guard>
              }
            />
            <Route path="admin/homepage" element={<Navigate to="/app/super-admin/website" replace />} />
            <Route
              path="admin/users"
              element={
                <Guard access={ACCESS.ADMIN}>
                  <UsersPage />
                </Guard>
              }
            />
            <Route
              path="admin/activity-log"
              element={
                <Guard access={ACCESS.ADMIN}>
                  <ActivityLogPage />
                </Guard>
              }
            />
            <Route path="*" element={<NotFoundPage inApp />} />
          </Route>

          <Route path="/public/card/:username" element={<PublicCardPage />} />
          <Route path="/public/portfolio/:slug" element={<PortfolioPage />} />
          <Route path="/public/menu/:token" element={<MenuPage />} />
          {/* guests order from the QR on their table (Table ordering add-on) */}
          <Route path="/public/order/:token" element={<OrderPage />} />
          {/* a member's reward points (Reward points add-on) */}
          <Route path="/public/member/:token" element={<MemberPage />} />
          {/* the shop's "check my points" QR */}
          <Route path="/public/points/:token" element={<PointsCheckPage />} />
          {/* the POS (a linked device; works offline) */}
          {/* each kind of business gets its own POS address: /pos/restaurant now, others later */}
          <Route path="/pos" element={<Navigate to="/pos/restaurant" replace />} />
          <Route path="/pos/restaurant" element={<PosApp />} />
          <Route path="/pos/restaurant/display" element={<CustomerDisplay />} />
          <Route path="/pos/guest-house" element={<GhPosApp />} />
          <Route path="/pos/guest-house/display" element={<GhDisplay />} />
          <Route path="/pos/mini-mart" element={<MartPosApp />} />
          <Route path="/pos/mini-mart/display" element={<MartDisplay />} />
          <Route path="/pos/event" element={<EvDoorApp />} />
          <Route path="/pos/*" element={<Navigate to="/pos/restaurant" replace />} />
          {/* attendance: staff clock in / out on their own phone */}
          <Route path="/a/:code" element={<AttendStaffApp />} />
          <Route path="/k/:token" element={<AttendKiosk />} />
          {/* restaurant websites (Website add-on) */}
          <Route path="/s/:slug" element={<SitePage />} />
          <Route path="/s/:slug/menu" element={<SitePage />} />
          <Route path="/s/:slug/item/:itemId" element={<SitePage />} />
          <Route path="/w/:slug" element={<WebPage />} />
          <Route path="/w/:slug/:page" element={<WebPage />} />
          {/* guest house websites (Website add-on) */}
          <Route path="/g/:slug" element={<StayPage />} />
          <Route path="/g/:slug/account" element={<StayAccount />} />
          <Route path="/q/:slug" element={<MenuQrPage />} />
          {/* Flip Book: library, one category, one book */}
          <Route path="/f/:slug" element={<ShelfPage />} />
          <Route path="/fc/:slug" element={<ShelfPage kind="cat" />} />
          <Route path="/b/:slug" element={<BookPage />} />
          <Route path="/ev/o/:token" element={<EvOrderPage />} />
          <Route path="/ev/t/:code" element={<EvTicketPage />} />
          <Route path="/ev/c/:code" element={<EvCertPage />} />
          <Route path="/ev/my" element={<EvMyPage />} />
          <Route path="/ev/f/:token" element={<EvFeedbackPage />} />
          <Route path="/events" element={<EvDiscoverPage />} />
          <Route path="/ev/:slug" element={<EvEventPage />} />
          <Route path="/site/:slug" element={<WebsitePage />} />
          <Route path="/site/:slug/blog" element={<WebsitePage />} />
          <Route path="/site/:slug/blog/:post" element={<WebsitePage />} />
          <Route path="/site/:slug/:page" element={<WebsitePage />} />
          {/* Debt Book: a customer's statement */}
          <Route path="/d/:token" element={<DebtStatement />} />
          <Route path="/n/g/:token" element={<NoteGroupPublic />} />
          <Route path="/n/:token" element={<NotePublic />} />
          {/* Loyalty Stamp Card: the shop QR, a customer's card, the staff desk */}
          <Route path="/stamp/c/:token" element={<StampCardPage />} />
          <Route path="/stamp/desk/:slug" element={<StampDesk />} />
          <Route path="/stamp/:slug" element={<StampShop />} />
          <Route path="/x/:slug" element={<QrPage />} />
          <Route path="/x/:slug/r/:code" element={<QrRedeemPage />} />
          <Route path="/m/:slug" element={<MartSitePage />} />
          <Route path="/m/:slug/account" element={<MartAccount />} />
          <Route path="/r/:token" element={<StayReview />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
