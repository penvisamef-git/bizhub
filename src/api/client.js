import { auth } from "../lib/auth";
import { API_AUTH_KEY, API_HOST, ROUTES } from "../config";

export const API_BASE = `${API_HOST}/api/admin`; // BizHub team + super admin
export const USER_API_BASE = `${API_HOST}/api/user`; // customers (business owners)
export const PUBLIC_API_BASE = `${API_HOST}/api/public`;

// Build "?a=1&b=2" from an object, skipping empty values
function toQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.append(key, typeof value === "object" ? JSON.stringify(value) : value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// Session expired / invalid token → clear login and go to the login page
function handleUnauthorized() {
  auth.removeClientLogin();
  if (window.location.pathname !== ROUTES.login) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `${ROUTES.login}?next=${next}`;
  }
}

/**
 * Call the BizHub API. Returns the JSON body ({ success, data, pagination, message }).
 * Throws an Error with the server message when the request fails.
 */
async function request(path, { method = "GET", body, params, skipAuth = false, base = API_BASE } = {}) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = { "x-api-key": API_AUTH_KEY };
  if (!isForm) headers["Content-Type"] = "application/json";

  const token = auth.getClientLogin()?.access_token;
  if (token && !skipAuth) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${base}${path}${toQueryString(params)}`, {
      method,
      headers,
      body: body !== undefined ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    const error = new Error("network");
    error.code = "NETWORK";
    throw error;
  }

  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && !skipAuth) handleUnauthorized();

  if (!res.ok || json.success === false) {
    const error = new Error(json.message || `Request failed (${res.status})`);
    error.status = res.status;
    error.response = json;
    throw error;
  }
  return json;
}

// Public (no login) GET: never sends the token, never redirects
export async function publicGet(path) {
  let res;
  try {
    res = await fetch(`${PUBLIC_API_BASE}${path}`);
  } catch {
    const error = new Error("network");
    error.code = "NETWORK";
    throw error;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const error = new Error(json.message || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return json;
}

const apiClient = {
  get: (path, params) => request(path, { params }),
  post: (path, body, options) => request(path, { method: "POST", body, ...options }),
  put: (path, body) => request(path, { method: "PUT", body }),
  delete: (path, body) => request(path, { method: "DELETE", body }),
};

// Same calls for customer routes (/api/user/...)
export const userApiClient = {
  get: (path, params) => request(path, { params, base: USER_API_BASE }),
  post: (path, body, options) => request(path, { method: "POST", body, base: USER_API_BASE, ...options }),
  put: (path, body) => request(path, { method: "PUT", body, base: USER_API_BASE }),
  patch: (path, body) => request(path, { method: "PATCH", body, base: USER_API_BASE }),
  delete: (path, body) => request(path, { method: "DELETE", body, base: USER_API_BASE }),
  // a file (CSV…) from a customer route, saved by the browser
  download: async (path, params, filename) => {
    const headers = { "x-api-key": API_AUTH_KEY };
    const token = auth.getClientLogin()?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${USER_API_BASE}${path}${toQueryString(params)}`, { headers });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};

export default apiClient;

// Public (no login) POST, e.g. the contact form on a restaurant website
export async function publicPost(path, body) {
  let res;
  try {
    res = await fetch(`${PUBLIC_API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  } catch {
    const error = new Error("network");
    error.code = "NETWORK";
    throw error;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const error = new Error(json.message || `Request failed (${res.status})`);
    error.status = res.status;
    error.body = json;
    throw error;
  }
  return json;
}
