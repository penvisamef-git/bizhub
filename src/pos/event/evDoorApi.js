import { API_AUTH_KEY, API_HOST } from "../../config";

// Event Tickets door phone: a paired device (x-ev-device) + a team member's PIN session (x-ev-session)
const DEVICE_KEY = "bizhub_ev_device";
const SESSION_KEY = "bizhub_ev_session";
const store = {
  get: (k) => {
    try {
      return localStorage.getItem(k) || "";
    } catch {
      return "";
    }
  },
  set: (k, v) => {
    try {
      if (v) localStorage.setItem(k, v);
      else localStorage.removeItem(k);
    } catch {
      /* private mode */
    }
  },
};
export const device = { get: () => store.get(DEVICE_KEY), set: (v) => store.set(DEVICE_KEY, v) };
export const session = { get: () => store.get(SESSION_KEY), set: (v) => store.set(SESSION_KEY, v) };
export const local = {
  get: (k, def) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : def;
    } catch {
      return def;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* full / private */
    }
  },
};

async function send(method, path, body) {
  let res;
  try {
    res = await fetch(`${API_HOST}/api/evdoor${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(API_AUTH_KEY ? { "x-api-key": API_AUTH_KEY } : {}), ...(device.get() ? { "x-ev-device": device.get() } : {}), ...(session.get() ? { "x-ev-session": session.get() } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error("network"), { code: "network" });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw Object.assign(new Error(json.message || `Error ${res.status}`), { status: res.status, code: json.code || "", body: json });
  return json;
}
const q = (params = {}) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));
  return s.toString() ? `?${s}` : "";
};

export const evDoor = {
  pair: (code, name) => send("POST", "/pair", { code, name }),
  login: (pin) => send("POST", "/login", { pin }),
  boot: () => send("GET", "/boot"),
  event: (eid, codes) => send("GET", `/events/${eid}${codes ? "?codes=1" : ""}`),
  scan: (eventId, code, show) => send("POST", "/scan", { event_id: eventId, code, show: show || undefined }),
  sync: (eventId, scans, show) => send("POST", "/sync", { event_id: eventId, scans, show: show || undefined }),
  guests: (eid, params) => send("GET", `/events/${eid}/guests${q(params)}`),
  sell: (eid, body) => send("POST", `/events/${eid}/sell`, body),
  orders: (params) => send("GET", `/orders${q(params)}`),
  approve: (oid) => send("POST", `/orders/${oid}/approve`),
  reject: (oid, reason) => send("POST", `/orders/${oid}/reject`, { reason }),
};
