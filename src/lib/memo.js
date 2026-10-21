// Remembers the last data of each screen, so coming back to a screen shows it instantly;
// fresh data then loads quietly in the background.
// Keys in PERSIST are also kept in localStorage (per account), so even a reload or a new tab
// opens with the last numbers at once. Cleared on logout (see AppLayout).
import { auth } from "./auth";

const store = new Map();
const PERSIST = new Set(["dashboard", "myBusinesses"]);
const PREFIX = "bh_memo:";
const uid = () => {
  const u = auth.getClientLogin();
  return u?._id || u?.id || u?.email || "";
};

export const memo = {
  get(key) {
    if (store.has(key)) return store.get(key);
    if (!PERSIST.has(key)) return undefined;
    try {
      const raw = JSON.parse(localStorage.getItem(PREFIX + key) || "null");
      if (raw && raw.uid === uid()) {
        store.set(key, raw.value);
        return raw.value;
      }
    } catch {
      /* storage blocked or bad JSON */
    }
    return undefined;
  },
  set(key, value) {
    store.set(key, value);
    if (!PERSIST.has(key)) return;
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify({ uid: uid(), value }));
    } catch {
      /* full or blocked: memory only */
    }
  },
  clear() {
    store.clear();
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* blocked */
    }
  },
};
