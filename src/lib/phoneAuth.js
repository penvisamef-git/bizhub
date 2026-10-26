// Google Firebase Authentication: confirm an email (Google button or email link) or a phone (SMS code).
// Firebase is downloaded only when it's used (sign-up / log in / forgot password), not on every page.
// Every flow ends with a Firebase ID token that our API checks itself.
//   Google:      googleSignIn() → { token, email, name }
//   Email link:  sendEmailLink(email, path) → the person opens the link → completeEmailLink(email) → token
//   SMS:         sendCode(phone) → confirm(code) → token          (only with VITE_SMS_SIGNUP=1: needs billing)
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
// test builds only: no SMS, the code is 123456 (the API accepts these tokens only in its test mode)
const FAKE = import.meta.env.VITE_FAKE_PHONE_AUTH === "1";

// SMS sign-up costs money (Firebase billing) → off unless VITE_SMS_SIGNUP=1
export const SMS_ON = import.meta.env.VITE_SMS_SIGNUP === "1";
export const phoneAuthReady = () => FAKE || !!(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);

let fb = null; // { auth, mod }
async function firebase() {
  if (fb) return fb;
  let loaded;
  try {
    loaded = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  } catch (err) {
    // the "firebase" package isn't installed (npm install) or the download failed
    throw Object.assign(new Error(err?.message || "firebase not loaded"), { code: "app/sdk-missing" });
  }
  const [{ initializeApp, getApps }, mod] = loaded;
  const app = getApps()[0] || initializeApp(cfg);
  fb = { auth: mod.getAuth(app), mod };
  return fb;
}

let verifier = null;
// containerId: an empty <div id="…"> on the page for Google's invisible "I'm not a robot" check
export async function sendCode(phone, containerId, lang = "en") {
  if (FAKE) {
    await new Promise((r) => setTimeout(r, 300));
    return { confirm: async (code) => (code === "123456" ? `test:${phone}` : Promise.reject(Object.assign(new Error("bad code"), { code: "auth/invalid-verification-code" }))) };
  }
  if (!phoneAuthReady()) throw Object.assign(new Error("not set up"), { code: "app/not-configured" });
  const { auth, mod } = await firebase();
  auth.languageCode = lang === "km" ? "km" : "en";
  if (verifier) {
    try {
      verifier.clear();
    } catch {
      /* already gone */
    }
  }
  verifier = new mod.RecaptchaVerifier(auth, containerId, { size: "invisible" });
  const result = await mod.signInWithPhoneNumber(auth, phone, verifier);
  return {
    // → Firebase ID token for our API; then sign out of Firebase (our own login is used after this)
    async confirm(code) {
      const cred = await result.confirm(code);
      const token = await cred.user.getIdToken();
      mod.signOut(auth).catch(() => {});
      return token;
    },
  };
}

// ---------- Google ----------
// Browsers only allow a pop-up opened straight from the click. So Firebase is loaded
// when the page opens (preloadFirebase), and the click opens the Google window with no waiting.
export function preloadFirebase() {
  if (FAKE || !phoneAuthReady()) return;
  firebase().catch(() => {});
}
export function googleSignIn() {
  if (FAKE) {
    const email = (localStorage.getItem("fake_google_email") || "fake.google@gmail.com").toLowerCase();
    return new Promise((r) => setTimeout(() => r({ token: `test-email:${email}`, email, name: "Fake Google" }), 200));
  }
  if (!phoneAuthReady()) return Promise.reject(Object.assign(new Error("not set up"), { code: "app/not-configured" }));
  const open = ({ auth, mod }) => {
    const provider = new mod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return mod.signInWithPopup(auth, provider).then(async (cred) => {
      const token = await cred.user.getIdToken();
      const out = { token, email: (cred.user.email || "").toLowerCase(), name: cred.user.displayName || "" };
      mod.signOut(auth).catch(() => {});
      return out;
    });
  };
  // loaded already → the window opens inside this click (no await before it)
  if (fb) return open(fb);
  return firebase().then(open);
}

// ---------- email link ----------
const LINK_KEY = "bizhub_email_link"; // the email the link was sent to (needed when it's opened)
export const savedLinkEmail = () => {
  try {
    return JSON.parse(localStorage.getItem(LINK_KEY) || "null")?.email || "";
  } catch {
    return "";
  }
};
// path: where the link opens, e.g. "/sign-up" or "/forgot-password"
export async function sendEmailLink(email, path, lang = "en") {
  const save = () => {
    try {
      localStorage.setItem(LINK_KEY, JSON.stringify({ email, at: Date.now() }));
    } catch {
      /* storage blocked: they'll type the email again */
    }
  };
  if (FAKE) {
    await new Promise((r) => setTimeout(r, 200));
    return save();
  }
  if (!phoneAuthReady()) throw Object.assign(new Error("not set up"), { code: "app/not-configured" });
  const { auth, mod } = await firebase();
  auth.languageCode = lang === "km" ? "km" : "en";
  await mod.sendSignInLinkToEmail(auth, email, { url: `${window.location.origin}${path}`, handleCodeInApp: true });
  save();
}
// is this page opened from an email link?
export async function isEmailLink() {
  const href = window.location.href;
  if (FAKE) return /[?&]fake_link=1/.test(href);
  if (!/[?&](oobCode|mode)=/.test(href) || !phoneAuthReady()) return false;
  const { auth, mod } = await firebase();
  return mod.isSignInWithEmailLink(auth, href);
}
// → Firebase ID token (the email is now confirmed)
export async function completeEmailLink(email) {
  const clean = () => {
    try {
      localStorage.removeItem(LINK_KEY);
    } catch {
      /* ignore */
    }
    window.history.replaceState(null, "", window.location.pathname); // the link works once; drop it from the address bar
  };
  if (FAKE) {
    clean();
    return `test-email:${email.toLowerCase()}`;
  }
  const { auth, mod } = await firebase();
  const cred = await mod.signInWithEmailLink(auth, email, window.location.href);
  const token = await cred.user.getIdToken();
  mod.signOut(auth).catch(() => {});
  clean();
  return token;
}

// Firebase error → which message to show
export function phoneErrorKey(err) {
  const c = err?.code || "";
  if (c === "app/not-configured") return "fbEnvMissing";
  // billing-not-enabled: Google sends SMS codes only when the Firebase project has billing on (Blaze plan)
  if (c === "auth/operation-not-allowed" || c === "auth/configuration-not-found" || c === "auth/admin-restricted-operation" || c === "auth/billing-not-enabled") return "smsNotReady";
  if (c === "auth/invalid-phone-number" || c === "auth/missing-phone-number") return "badPhone";
  if (c === "auth/too-many-requests" || c === "auth/quota-exceeded") return "smsTooMany";
  if (c === "auth/invalid-verification-code" || c === "auth/missing-verification-code") return "codeWrong";
  if (c === "auth/code-expired" || c === "auth/session-expired") return "codeExpired";
  // this website address isn't in Firebase → Authentication → Settings → Authorized domains (Google sign-in, email links, SMS)
  if (c === "auth/unauthorized-domain") return "authDomain";
  if (c === "auth/captcha-check-failed" || c === "auth/invalid-app-credential") return "smsDomain";
  if (c === "auth/network-request-failed") return "networkError";
  if (c === "app/sdk-missing") return "smsSdkMissing";
  if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request" || c === "auth/user-cancelled") return "cancelled";
  if (c === "auth/popup-blocked") return "popupBlocked";
  if (c === "auth/invalid-action-code" || c === "auth/expired-action-code") return "linkUsed";
  if (c === "auth/invalid-email" || c === "auth/missing-email") return "badEmail";
  // not a Firebase error (e.g. our API said no) → no SMS text: the pages then show the server's own message
  if (!/^(auth|app)\//.test(c)) return "server";
  console.warn("[phone auth]", c || err?.message); // unknown reason: the exact Firebase code is in the browser console
  return "smsFailed";
}

// "012 345 678" → "+85512345678" (no country code = Cambodia) — same rule as the API
export function normalizePhone(input, country = "855") {
  let s = String(input || "").replace(/[\s\-().]/g, "");
  if (!s) return "";
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("+")) s = `+${s.slice(1).replace(/\D/g, "")}`;
  else if (/^\d+$/.test(s)) s = s.startsWith(country) && s.length > 10 ? `+${s}` : `+${country}${s.replace(/^0+/, "")}`;
  else return "";
  return /^\+\d{8,15}$/.test(s) ? s : "";
}
