import { API_AUTH_KEY, API_HOST } from "../../config";

// Guest House desk POS API: a paired device (x-gh-device) + a staff PIN session (x-gh-session)
const DEVICE_KEY = "bizhub_gh_device";
const SESSION_KEY = "bizhub_gh_session";
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

async function call(method, path, body, sess) {
  const ses = sess === undefined ? session.get() : sess;
  let res;
  try {
    res = await fetch(`${API_HOST}/api/ghpos${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(API_AUTH_KEY ? { "x-api-key": API_AUTH_KEY } : {}), ...(device.get() ? { "x-gh-device": device.get() } : {}), ...(ses ? { "x-gh-session": ses } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const e = new Error("network");
    e.code = "network";
    throw e;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const e = new Error(json.message || `Error ${res.status}`);
    e.status = res.status;
    e.code = json.code || "";
    e.response = json;
    if (res.status === 401 && sess === undefined) window.dispatchEvent(new CustomEvent("gh-pos-401", { detail: json.code }));
    throw e;
  }
  return json;
}
// a photo (multipart) — same headers as call()
async function upload(path, file) {
  const form = new FormData();
  form.append("photo", file);
  let res;
  try {
    res = await fetch(`${API_HOST}/api/ghpos${path}`, {
      method: "POST",
      headers: { ...(API_AUTH_KEY ? { "x-api-key": API_AUTH_KEY } : {}), ...(device.get() ? { "x-gh-device": device.get() } : {}), ...(session.get() ? { "x-gh-session": session.get() } : {}) },
      body: form,
    });
  } catch {
    const e = new Error("network");
    e.code = "network";
    throw e;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const e = new Error(json.message || `Error ${res.status}`);
    e.status = res.status;
    e.code = json.code || "";
    throw e;
  }
  return json;
}
const q = (params = {}) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));
  return s.toString() ? `?${s}` : "";
};

// same method names as guestHouseService, so the dashboard screens work in the POS (the id is ignored)
const make = (c) => ({
  pair: (code, name) => c("POST", "/pair", { code, name }),
  login: (pin) => c("POST", "/login", { pin }),
  boot: () => c("GET", "/boot"),
  displayKey: () => c("POST", "/display/key"),
  pushDisplay: (state) => c("PUT", "/display", { state }),
  readDisplay: (key) => c("GET", `/display/${encodeURIComponent(key)}`),
  stays: (_id, params) => c("GET", `/stays${q(params)}`),
  stay: (_id, sid) => c("GET", `/stays/${sid}`),
  book: (_id, data) => c("POST", "/stays", data),
  updateStay: (_id, sid, data) => c("PUT", `/stays/${sid}`, data),
  action: (_id, sid, action, data = {}) => c("POST", `/stays/${sid}/${action}`, data),
  addCharge: (_id, sid, data) => c("POST", `/stays/${sid}/charges`, data),
  removeCharge: (_id, sid, cid) => c("DELETE", `/stays/${sid}/charges/${cid}`),
  addPayment: (_id, sid, data) => c("POST", `/stays/${sid}/payments`, data),
  removePayment: (_id, sid, pid) => c("DELETE", `/stays/${sid}/payments/${pid}`),
  discount: (_id, sid, discount) => c("PUT", `/stays/${sid}/discount`, { discount }),
  today: () => c("GET", "/today"),
  report: (_id, month) => c("GET", `/report${q({ month })}`),
  housekeeping: () => c("GET", "/housekeeping"),
  setHk: (_id, rid, data) => c("PUT", `/rooms/${rid}/hk`, data),
  expenses: (_id, month) => c("GET", `/expenses${q({ month })}`),
  addExpense: (_id, data) => c("POST", "/expenses", data),
  saveExpense: (_id, eid, data) => c("PUT", `/expenses/${eid}`, data),
  removeExpense: (_id, eid) => c("DELETE", `/expenses/${eid}`),
  profit: (_id, month) => c("GET", `/profit${q({ month })}`),
  leases: () => c("GET", "/leases"),
  addLease: (_id, data) => c("POST", "/leases", data),
  saveLease: (_id, sid, data) => c("PUT", `/leases/${sid}`, data),
  leaseBill: (_id, sid, data) => c("POST", `/leases/${sid}/bill`, data),
  endLease: (_id, sid, data) => c("POST", `/leases/${sid}/end`, data),
  stayReview: (_id, sid) => c("GET", `/stays/${sid}/review`),
  addIdPhoto: (_id, sid, file) => upload(`/stays/${sid}/id-photos`, file),
  removeIdPhoto: (_id, sid, pid) => c("DELETE", `/stays/${sid}/id-photos/${pid}`),
  members: (_id, qq) => c("GET", `/members${q({ q: qq })}`),
  stayMember: (_id, sid) => c("GET", `/stays/${sid}/member`),
  linkMember: (_id, sid, customer_id) => c("PUT", `/stays/${sid}/customer`, { customer_id }),
  usePoints: (_id, sid, points) => c("POST", `/stays/${sid}/points`, { points }),
  undoPoints: (_id, sid) => c("DELETE", `/stays/${sid}/points`),
  guests: (_id, qq) => c("GET", `/guests${q({ q: qq })}`),
  sync: () => c("GET", "/sync"),
  // customer booking requests from the website (owner + desk)
  custRequests: (_id, params) => c("GET", `/cust-requests${q(params)}`),
  custCount: () => c("GET", "/cust-requests/count"),
  custRooms: (_id, rid) => c("GET", `/cust-requests/${rid}/rooms`),
  custAccept: (_id, rid, data) => c("POST", `/cust-requests/${rid}/accept`, data),
  custDecline: (_id, rid, data) => c("POST", `/cust-requests/${rid}/decline`, data),
});
export const ghPosApi = {
  ...make((m, p, b) => call(m, p, b)),
  // replay offline work under the staff session that did it
  withSession: (sess) => make((m, p, b) => call(m, p, b, sess || "")),
};
