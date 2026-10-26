import { API_AUTH_KEY, API_HOST } from "../../config";

// Telegram Store staff screen: a paired device (x-ts-device) + a staff member's PIN session (x-ts-session)
const DEVICE_KEY = "bizhub_ts_device";
const SESSION_KEY = "bizhub_ts_session";
const keep = (k) => ({
  get: () => {
    try {
      return localStorage.getItem(k) || "";
    } catch {
      return "";
    }
  },
  set: (v) => {
    try {
      if (v) localStorage.setItem(k, v);
      else localStorage.removeItem(k);
    } catch {
      /* private mode */
    }
  },
});
export const device = keep(DEVICE_KEY);
export const session = keep(SESSION_KEY);
export const pref = {
  get: (k, def) => {
    try {
      const v = localStorage.getItem(`bizhub_ts_${k}`);
      return v === null ? def : JSON.parse(v);
    } catch {
      return def;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(`bizhub_ts_${k}`, JSON.stringify(v));
    } catch {
      /* full / private */
    }
  },
};

async function send(method, path, body) {
  let res;
  try {
    res = await fetch(`${API_HOST}/api/tspos${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(API_AUTH_KEY ? { "x-api-key": API_AUTH_KEY } : {}), ...(device.get() ? { "x-ts-device": device.get() } : {}), ...(session.get() ? { "x-ts-session": session.get() } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw Object.assign(new Error("network"), { code: "network" });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw Object.assign(new Error(json.message || `Error ${res.status}`), { status: res.status, code: json.code || "" });
  return json;
}

export const tsPos = {
  pair: (code, name) => send("POST", "/pair", { code, name }),
  login: (pin) => send("POST", "/login", { pin }),
  shop: () => send("GET", "/shop"),
  boot: () => send("GET", "/boot"),
  orders: (view = "open") => send("GET", `/orders?view=${view}`),
  move: (oid, status, extra = {}) => send("POST", `/orders/${oid}/status`, { status, ...extra }),
  paid: (oid) => send("POST", `/orders/${oid}/paid`),
  toRiders: (oid) => send("POST", `/orders/${oid}/riders`),
  products: () => send("GET", "/products"),
  soldOut: (pid, sold_out) => send("PUT", `/products/${pid}`, { sold_out }),
  setOpen: (open) => send("PUT", "/open", { open }),
  today: () => send("GET", "/today"),
};
