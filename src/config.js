// App information. To release a new version, change only this file.
export const APP_NAME = "BizHub";
export const APP_VERSION = "1.0.0";

// The API address comes only from .env (VITE_API_HOST), exactly as written there — e.g. https://bizhub-api-eight.vercel.app
// or, for local work, http://localhost:<port>. Nothing is added or changed here.
export const API_HOST = (import.meta.env.VITE_API_HOST || "").replace(/\/+$/, "");
if (!API_HOST && typeof console !== "undefined") console.error("VITE_API_HOST is not set in .env");
export const API_AUTH_KEY = import.meta.env.VITE_API_AUTH_KEY || "";
// Public website address (used in top-up card QR codes). Empty = the address in the browser.
export const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/+$/, "");
export const LOGIN_STORAGE_KEY = import.meta.env.VITE_LOGIN_STORAGE_KEY || "bizhub_login";

// Contact details shown on the website
export const CONTACT = {
  phones: "089 288 105",
  tel: "+85589288105",
  telegram: "@bizhubcambodia",
  telegramUrl: "https://t.me/bizhubcambodia",
  email: "bizhubcambodia@gmail.com",
};

// Main routes (keep in one place)
export const ROUTES = {
  home: "/",
  login: "/login",
  signUp: "/sign-up",
  forgot: "/forgot-password",
  terms: "/terms",
  privacy: "/privacy",
  deleteAccount: "/delete-account",
  app: "/app",
  dashboard: "/app/dashboard",
  account: "/app/account",
};
