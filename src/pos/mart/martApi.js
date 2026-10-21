import { API_AUTH_KEY, API_HOST } from "../../config";

// Mini Mart POS API: a paired device (x-mart-device) + a cashier PIN session (x-mart-session)
const DEVICE_KEY = "bizhub_mart_device";
const SESSION_KEY = "bizhub_mart_session";
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

const headers = (sess) => ({ ...(API_AUTH_KEY ? { "x-api-key": API_AUTH_KEY } : {}), ...(device.get() ? { "x-mart-device": device.get() } : {}), ...(sess ? { "x-mart-session": sess } : {}) });
async function send(method, path, body, sess, isForm) {
  const ses = sess === undefined ? session.get() : sess;
  let res;
  try {
    res = await fetch(`${API_HOST}/api/martpos${path}`, { method, headers: { ...(isForm ? {} : { "Content-Type": "application/json" }), ...headers(ses) }, body: isForm ? body : body ? JSON.stringify(body) : undefined });
  } catch {
    throw Object.assign(new Error("network"), { code: "network" });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const e = Object.assign(new Error(json.message || `Error ${res.status}`), { status: res.status, code: json.code || "", response: json });
    if (res.status === 401 && sess === undefined) window.dispatchEvent(new CustomEvent("mart-pos-401", { detail: json.code }));
    throw e;
  }
  return json;
}
const q = (params = {}) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));
  return s.toString() ? `?${s}` : "";
};

// same method names as martService, so the dashboard screens work in the POS (the id is ignored)
const make = (c) => ({
  pair: (code, name) => c("POST", "/pair", { code, name }),
  login: (pin) => c("POST", "/login", { pin }),
  boot: () => c("GET", "/boot"),
  sync: () => c("GET", "/sync"),
  sales: (_id, params) => c("GET", `/sales${q(params)}`),
  sale: (_id, sid) => c("GET", `/sales/${sid}`),
  sell: (data) => c("POST", "/sales", data),
  voidSale: (_id, sid, reason) => c("POST", `/sales/${sid}/void`, { reason }),
  report: (_id, params) => c("GET", `/report${q(params)}`),
  products: () => c("GET", "/products"),
  categories: () => c("GET", "/categories"),
  addProduct: (_id, data) => c("POST", "/products", data),
  saveProduct: (_id, pid, data) => c("PUT", `/products/${pid}`, data),
  removeProduct: (_id, pid) => c("DELETE", `/products/${pid}`),
  removeProductPhoto: (_id, pid) => c("DELETE", `/products/${pid}/photo`),
  addCategory: (_id, data) => c("POST", "/categories", data),
  saveCategory: (_id, cid, data) => c("PUT", `/categories/${cid}`, data),
  removeCategory: (_id, cid) => c("DELETE", `/categories/${cid}`),
  units: () => c("GET", "/units"),
  addUnit: (_id, data) => c("POST", "/units", data),
  saveUnit: (_id, uid, data) => c("PUT", `/units/${uid}`, data),
  removeUnit: (_id, uid) => c("DELETE", `/units/${uid}`),
  stock: (_id, params) => c("GET", `/stock${q(params)}`),
  stockIn: (_id, data) => c("POST", "/stock/in", data),
  stockCount: (_id, data) => c("POST", "/stock/count", data),
  stockMoves: (_id, params) => c("GET", `/stock/moves${q(params)}`),
  genBarcode: (_id, pid) => c("POST", `/products/${pid}/barcode`),
  debtors: (_id, qq) => c("GET", `/debtors${q({ q: qq })}`),
  debtor: (_id, did) => c("GET", `/debtors/${did}`),
  addDebtor: (_id, data) => c("POST", "/debtors", data),
  saveDebtor: (_id, did, data) => c("PUT", `/debtors/${did}`, data),
  removeDebtor: (_id, did) => c("DELETE", `/debtors/${did}`),
  debtorPay: (_id, did, data) => c("POST", `/debtors/${did}/payments`, data),
  shifts: () => c("GET", "/shifts"),
  openShift: (_id, data) => c("POST", "/shifts/open", data),
  shiftCash: (_id, sid, data) => c("POST", `/shifts/${sid}/cash`, data),
  closeShift: (_id, sid, data) => c("POST", `/shifts/${sid}/close`, data),
  suppliers: () => c("GET", "/suppliers"),
  orders: (_id, params) => c("GET", `/orders${q(params)}`),
  orderCount: () => c("GET", "/orders/count"),
  customers: (_id, params) => c("GET", `/customers${q(params)}`),
  customer: (_id, cid) => c("GET", `/customers/${cid}`),
  orderStep: (_id, oid, step, data) => c("POST", `/orders/${oid}/${step}`, data || {}),
  expiry: (_id, params) => c("GET", `/expiry${q(params)}`),
  addExpiry: (_id, data) => c("POST", "/expiry", data),
  saveExpiry: (_id, bid, data) => c("PUT", `/expiry/${bid}`, data),
  removeExpiry: (_id, bid) => c("DELETE", `/expiry/${bid}`),
  wasteBatch: (_id, bid, data) => c("POST", `/expiry/${bid}/waste`, data),
  waste: (_id, data) => c("POST", "/waste", data),
  wasteList: (_id, params) => c("GET", `/waste${q(params)}`),
  expiryDays: (_id, days) => c("PUT", "/expiry/settings", { days }),
  lookupMember: (_id, phone) => c("GET", `/loyalty/lookup${q({ phone })}`),
  checkPromos: (_id, data) => c("POST", "/promos/check", data),
  profit: (_id, params) => c("GET", `/profit${q(params)}`),
  reorder: () => c("GET", "/reorder"),
  pos: (_id, params) => c("GET", `/po${q(params)}`),
  addPo: (_id, data) => c("POST", "/po", data),
  savePo: (_id, poid, data) => c("PUT", `/po/${poid}`, data),
  removePo: (_id, poid) => c("DELETE", `/po/${poid}`),
  sendPo: (_id, poid) => c("POST", `/po/${poid}/send`),
  cancelPo: (_id, poid) => c("POST", `/po/${poid}/cancel`),
  receivePo: (_id, poid, data) => c("POST", `/po/${poid}/receive`, data),
  delivery: () => c("GET", "/delivery"),
  addDriver: (_id, data) => c("POST", "/drivers", data),
  saveDriver: (_id, did, data) => c("PUT", `/drivers/${did}`, data),
  removeDriver: (_id, did) => c("DELETE", `/drivers/${did}`),
  driverReport: (_id, month) => c("GET", `/drivers/report${q({ month })}`),
  setDriver: (_id, oid, driver_id) => c("POST", `/orders/${oid}/driver`, { driver_id }),
});
export const martPosApi = {
  ...make((m, p, b) => send(m, p, b)),
  productPhoto: (_id, pid, file) => {
    const form = new FormData();
    form.append("photo", file, file.name || "photo.jpg");
    return send("POST", `/products/${pid}/photo`, form, undefined, true);
  },
  // replay offline sales under the cashier session that made them
  withSession: (sess) => make((m, p, b) => send(m, p, b, sess || "")),
};
