// Talks to the BizHub cloud as a linked POS device (header x-device-token).
import { API_AUTH_KEY, API_HOST } from "../config";

const BASE = `${API_HOST}/api/pos`;

export class PosError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function call(path, { method = "GET", body, token, timeout = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(API_AUTH_KEY ? { "x-api-key": API_AUTH_KEY } : {}), ...(token ? { "x-device-token": token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new PosError("offline", 0);
  } finally {
    clearTimeout(timer);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new PosError(json.message || `Error ${res.status}`, res.status, json);
  return json.data;
}

export const posApi = {
  pair: (code, name) => call("/pair", { method: "POST", body: { code, name, kind: "web" } }),
  bootstrap: (token) => call("/bootstrap", { token, timeout: 30000 }),
  staffPin: (token, pin) => call("/staff-pin", { method: "POST", token, body: { pin } }),
  unlink: (token, pin) => call("/unlink", { method: "POST", token, body: { pin } }),
  sync: (token, body) => call("/sync", { method: "POST", token, body, timeout: 30000 }),
  displayKey: (token, renew) => call("/display/key", { method: "POST", token, body: { renew: !!renew } }),
  displayPush: (token, state) => call("/display", { method: "PUT", token, body: { state }, timeout: 8000 }),
  displayGet: (key) => call(`/display/${encodeURIComponent(key)}`, { timeout: 8000 }),
  // reward points
  memberFind: (token, phone) => call(`/members?phone=${encodeURIComponent(phone)}`, { token }),
  memberSearch: (token, q) => call(`/members?q=${encodeURIComponent(q)}`, { token }),
  memberGet: (token, id) => call(`/members/${id}`, { token }),
  memberCreate: (token, body) => call("/members", { method: "POST", token, body }),
  redeem: (token, body) => call("/rewards/redeem", { method: "POST", token, body }),
  undoRedeem: (token, id) => call("/rewards/undo", { method: "POST", token, body: { redemption_id: id } }),
  useCoupon: (token, body) => call("/coupons/use", { method: "POST", token, body }),
  guestOrders: (token, body) => call("/guest-orders", { method: "POST", token, body, timeout: 10000 }),
  report: (token, from, to) => call(`/report?from=${from}&to=${to}`, { token, timeout: 20000 }),
};
