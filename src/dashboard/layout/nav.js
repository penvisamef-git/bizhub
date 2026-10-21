import { Activity, Store, BadgeCheck, Building2, CalendarHeart, Coins, Globe, Inbox, Layers, LayoutDashboard, MessageCircle, ReceiptText, Settings, Tags, Users, UsersRound, Wallet, UserRound } from "lucide-react";
import { ACCESS } from "../../lib/permission";

// Menus after login. `label` is a key in i18n/messages.js. `tab: true` = phone bottom bar.

// Customers (business owners): /app/*
export const CLIENT_NAV = [
  { to: "/app/dashboard", label: "navDashboard", icon: LayoutDashboard, access: ACCESS.CUSTOMER, tab: true },
  // `match`: also lit while inside one business (/app/business/:id)
  { to: "/app/businesses", label: "navBusinesses", icon: Store, access: ACCESS.CUSTOMER, tab: true, match: "/app/business/" },
  { to: "/app/wallet", label: "navWallet", icon: Wallet, access: ACCESS.CUSTOMER, tab: true },
  { to: "/app/licenses", label: "navLicenses", icon: BadgeCheck, access: ACCESS.CUSTOMER },
];

// Super admin: /app/super-admin/*
export const SUPER_NAV = [
  { to: "/app/super-admin/dashboard", label: "navDashboard", icon: LayoutDashboard, access: ACCESS.SUPER, tab: true },
  { to: "/app/super-admin/customers", label: "navCustomers", icon: Users, access: ACCESS.SUPER, tab: true },
  { to: "/app/super-admin/businesses", label: "navBusinesses", icon: Building2, access: ACCESS.SUPER, tab: true },
  { to: "/app/super-admin/coins", label: "navCoins", icon: Coins, access: ACCESS.SUPER, tab: true },
  { to: "/app/super-admin/coin-orders", label: "navCoinOrders", icon: ReceiptText, access: ACCESS.SUPER, badge: "orders" },
  { to: "/app/super-admin/inbox", label: "navInbox", icon: Inbox, access: ACCESS.SUPER, badge: "chats" },
  { to: "/app/super-admin/licenses", label: "navLicenses", icon: BadgeCheck, access: ACCESS.SUPER },
  { to: "/app/super-admin/prices", label: "navPrices", icon: Tags, access: ACCESS.SUPER },
  { to: "/app/super-admin/groups", label: "navGroups", icon: Layers, access: ACCESS.SUPER },
  { to: "/app/super-admin/holidays", label: "navHolidays", icon: CalendarHeart, access: ACCESS.SUPER },
  { to: "/app/super-admin/website", label: "navWebsite", icon: Globe, access: ACCESS.SUPER },
];

// BizHub team pages: /app/admin/*
export const TEAM_NAV = [
  { to: "/app/admin/users", label: "navUsers", icon: UsersRound, access: ACCESS.ADMIN },
  { to: "/app/admin/activity-log", label: "navActivity", icon: Activity, access: ACCESS.ADMIN },
];

export const SETTINGS_NAV = { to: "/app/settings", label: "navSettings", icon: Settings, access: ACCESS.ALL };
// "Chat with BizHub" (customers), under Settings
export const SUPPORT_NAV = { to: "/app/support", label: "navSupport", icon: MessageCircle, access: ACCESS.CUSTOMER, badge: "support" };
export const ACCOUNT_NAV = { to: "/app/account", label: "navAccount", icon: UserRound, access: ACCESS.ALL };

// page title for the header
export const ALL_NAV = [...CLIENT_NAV, ...SUPER_NAV, ...TEAM_NAV, SETTINGS_NAV, SUPPORT_NAV, ACCOUNT_NAV];
