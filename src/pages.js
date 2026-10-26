// Every page loads in its own small file (fast first visit).
// After login we download the pages this account can open in the background,
// so moving between menus is instant instead of waiting for a download.
import { memo } from "./lib/memo";

export const PAGES = {
  login: () => import("./homepage/auth/LoginPage"),
  signUp: () => import("./homepage/auth/SignUpPage"),
  forgot: () => import("./homepage/auth/ForgotPasswordPage"),
  terms: () => import("./public/TermsPage"),
  privacy: () => import("./public/PrivacyPage"),
  deleteAccount: () => import("./public/DeleteAccountPage"),
  phoneSignUp: () => import("./homepage/auth/PhoneSignUpPage"), // SMS (VITE_SMS_SIGNUP=1)
  phoneForgot: () => import("./homepage/auth/PhoneForgotPage"),
  appLayout: () => import("./dashboard/layout/AppLayout"),
  // customer
  dashboard: () => import("./dashboard/client/DashboardPage"),
  nameCard: () => import("./dashboard/client/NameCardPage"),
  wallet: () => import("./dashboard/client/WalletPage"),
  myBusinesses: () => import("./dashboard/client/BusinessesPage"),
  nameCardEditor: () => import("./dashboard/client/namecard/NameCardEditor"),
  businessPage: () => import("./dashboard/client/BusinessPage"),
  teamPage: () => import("./dashboard/client/team/TeamPage"), // v1.5 Team access
  joinPage: () => import("./dashboard/client/team/JoinPage"),
  updates: () => import("./dashboard/client/updates/UpdatesPage"), // System activity (changelog)
  restaurant: () => import("./dashboard/client/restaurant/RestaurantDashboard"),
  attendance: () => import("./dashboard/client/attendance/AttendanceDashboard"),
  guestHouse: () => import("./dashboard/client/guesthouse/GuestHouseDashboard"),
  mart: () => import("./dashboard/client/mart/MartDashboard"),
  menuQr: () => import("./dashboard/client/menuqr/MenuQrDashboard"),
  flipbook: () => import("./dashboard/client/flipbook/FlipBookDashboard"),
  qrGen: () => import("./dashboard/client/qrgen/QrGenDashboard"),
  website: () => import("./dashboard/client/website/WebsiteDashboard"),
  debt: () => import("./dashboard/client/debt/DebtDashboard"),
  note: () => import("./dashboard/client/note/NoteDashboard"),
  stamp: () => import("./dashboard/client/stamp/StampDashboard"),
  event: () => import("./dashboard/client/event/EventDashboard"),
  tgStore: () => import("./dashboard/client/tgstore/TgStoreDashboard"), // v2.0 Telegram Store
  publicTgStore: () => import("./tgstore/StorePage"),
  publicTgOrder: () => import("./tgstore/OrderPage"),
  publicEvent: () => import("./evpub/EventPage"),
  publicEvOrder: () => import("./evpub/OrderPage"),
  publicEvTicket: () => import("./evpub/TicketPage"),
  publicEvCert: () => import("./evpub/Certificate"),
  publicEvMore: () => import("./evpub/MorePages"),
  evDoor: () => import("./pos/event/EvDoorApp"),
  tsPos: () => import("./pos/tgstore/TsPosApp"), // v2.0 Telegram Store staff screen
  publicWebsite: () => import("./wsite/WsPage"),
  publicDebt: () => import("./debt/StatementPage"),
  publicNote: () => import("./note/NotePage"),
  publicNoteGroup: () => import("./note/GroupPage"),
  publicStampShop: () => import("./stamp/ShopPage"),
  publicStampCard: () => import("./stamp/CardPage"),
  stampDesk: () => import("./stamp/DeskPage"),
  publicMenu: () => import("./public/MenuPage"),
  publicOrder: () => import("./public/OrderPage"),
  publicMember: () => import("./public/MemberPage"),
  publicPoints: () => import("./public/PointsCheckPage"),
  publicSite: () => import("./site/SitePage"),
  publicWeb: () => import("./web/WebPage"),
  publicStay: () => import("./gsite/GsPage"),
  publicStayAccount: () => import("./gsite/portal/GpPage"),
  publicReview: () => import("./gsite/GsReview"),
  publicMart: () => import("./msite/MsPage"),
  publicMenuQr: () => import("./qmenu/MenuPage"),
  publicShelf: () => import("./fbook/ShelfPage"),
  publicBook: () => import("./fbook/BookPage"),
  publicQr: () => import("./qrgen/QrPage"),
  publicQrRedeem: () => import("./qrgen/QrPage").then((x) => ({ default: x.RedeemPage })),
  publicMartAccount: () => import("./msite/portal/MpPage"),
  pos: () => import("./pos/PosApp"),
  attendStaff: () => import("./attend/StaffApp"),
  attendKiosk: () => import("./attend/KioskPage"),
  posDisplay: () => import("./pos/CustomerDisplay"),
  ghPos: () => import("./pos/guesthouse/GhPosApp"),
  ghDisplay: () => import("./pos/guesthouse/GhDisplay"),
  martPos: () => import("./pos/mart/MartPosApp"),
  martDisplay: () => import("./pos/mart/MartDisplay"),
  settings: () => import("./dashboard/client/SettingsPage"),
  account: () => import("./dashboard/client/account/AccountPage"),
  // super admin
  superDashboard: () => import("./dashboard/super_admin/SuperDashboardPage"),
  customers: () => import("./dashboard/super_admin/CustomersPage"),
  businesses: () => import("./dashboard/super_admin/BusinessesPage"),
  coins: () => import("./dashboard/super_admin/CoinsPage"),
  // team
  homepageSettings: () => import("./dashboard/admin/homepage/HomepageSettingsPage"),
  prices: () => import("./dashboard/admin/prices/PricesPage"),
  groups: () => import("./dashboard/admin/groups/GroupsPage"),
  users: () => import("./dashboard/admin/users/UsersPage"),
  activityLog: () => import("./dashboard/admin/ActivityLogPage"),
  publicCard: () => import("./public/PublicCardPage"),
  publicPortfolio: () => import("./public/PortfolioPage"),
  licenses: () => import("./dashboard/client/licenses/LicensesPage"),
  superLicenses: () => import("./dashboard/super_admin/LicensesAdminPage"),
  superHolidays: () => import("./dashboard/super_admin/HolidaysAdminPage"),
  support: () => import("./dashboard/support/SupportPage"), // Chat with BizHub
  superCoinOrders: () => import("./dashboard/support/CoinOrdersPage"),
  superInbox: () => import("./dashboard/support/InboxPage"),
};

const GROUPS = {
  customer: ["dashboard", "myBusinesses", "wallet", "businessPage", "licenses", "settings", "support", "account", "updates"],
  super: ["superDashboard", "customers", "businesses", "coins", "superCoinOrders", "superInbox", "superLicenses", "homepageSettings", "users", "activityLog", "settings", "account"],
  team: ["users", "activityLog", "settings", "account"],
};

// business type → its dashboard (big files: only downloaded for the types the owner has)
const BIZ_PAGE = { namecard: "nameCardEditor", restaurant: "restaurant", attendance: "attendance", guest_house: "guestHouse", mart: "mart", menu_qr: "menuQr", flipbook: "flipbook", qr_gen: "qrGen", website: "website", debt_book: "debt", digital_note: "note", stamp_card: "stamp", event: "event", tg_store: "tgStore" };
const bizDone = new Set();
// background downloads wait until the page on screen has its own files and data (they share the phone's line)
const later = (run, wait) => {
  const go = () => setTimeout(() => ("requestIdleCallback" in window ? window.requestIdleCallback(run, { timeout: 3000 }) : run()), wait);
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
};
export function prefetchBizTypes(categories = []) {
  const todo = [...new Set(categories)].map((c) => BIZ_PAGE[c]).filter((n) => n && !bizDone.has(n));
  if (!todo.length) return;
  todo.forEach((n) => bizDone.add(n));
  later(() => todo.forEach((n) => PAGES[n]().catch(() => {})), 2000);
}

let done = false;
export function prefetchPages(kind) {
  if (done) return;
  done = true;
  const run = () => (GROUPS[kind] || GROUPS.team).forEach((name) => PAGES[name]().catch(() => {}));
  // owners: the dashboards of the business types they had last time (the list is saved on the device)
  if (kind === "customer") {
    prefetchBizTypes((memo.get("myBusinesses") || []).map((b) => b.category));
  }
  later(run, 3500);
}
