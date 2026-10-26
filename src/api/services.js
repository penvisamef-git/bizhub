import apiClient, { PUBLIC_API_BASE, publicGet, publicPost, userApiClient } from "./client";
import { memo } from "../lib/memo";

/**
 * Standard CRUD endpoints for a resource.
 * List params: page, limit, sort, order ("asc" | "desc"), q, q_key, q_id, q_key_id, includeDeleted
 */
export function createResource(route) {
  return {
    list: (params) => apiClient.get(`/${route}`, params),
    all: (params) => apiClient.get(`/${route}-all`, params),
    get: (id) => apiClient.get(`/${route}/${id}`),
    create: (data) => apiClient.post(`/${route}`, data),
    update: (id, data) => apiClient.put(`/${route}/${id}`, data),
    remove: (id) => apiClient.delete(`/${route}/${id}`),
    restore: (id) => apiClient.put(`/${route}/restore/${id}`),
    sort: (items) => apiClient.put(`/${route}-sort`, { items }),
  };
}

// ================= Auth =================
export const authService = {
  login: (email, password) => apiClient.post("/auth/login", { email, password }, { skipAuth: true }),
  me: () => apiClient.get("/auth/me"),
  logout: () => apiClient.post("/auth/logout", {}),
  changePassword: (data) => apiClient.put("/auth/change-password", data), // { old_password, new_password }
  loginQr: () => apiClient.post("/auth/login-qr", {}), // super admin: QR code for the BizHub app → { id, code, seconds }
  loginQrState: (id) => apiClient.get(`/auth/login-qr/${id}`), // → { state: waiting | used | expired }
};

// ================= Users =================
export const userService = {
  ...createResource("users"),
  roles: () => apiClient.get("/users-roles"),
  resetPassword: (id, data) => apiClient.put(`/users/reset-password/${id}`, data),
};

// ================= Upload (Cloudinary, through the API) =================
export const uploadService = {
  upload: (formData) => apiClient.post("/upload", formData),
  remove: (public_id) => apiClient.delete("/upload", { public_id }),
};

// ================= Session & Log =================
export const sessionService = {
  list: (params) => apiClient.get("/session", params),
  remove: (id) => apiClient.delete(`/session/${id}`),
};

export const activityLogService = {
  list: (params) => apiClient.get("/activity_log", params),
  categories: () => apiClient.get("/activity_log/category-all"),
};

// ================= Homepage (website) settings — super admin =================
// get() → full settings; update(data) → partial update (only the parts you send change)
// super admin: is the BizHub Telegram bot working?
export const telegramAdminService = {
  status: () => apiClient.get("/telegram"),
  fixWebhook: () => apiClient.post("/telegram/webhook"),
};

export const homepageService = {
  get: () => apiClient.get("/homepage"),
  update: (data) => apiClient.put("/homepage", data),
};

// ================= Customers (business owners) — /api/user =================
export const customerAuthService = {
  check: (data) => userApiClient.post("/check", data, { skipAuth: true }), // { phone?, email? } → taken?
  signUp: (data) => userApiClient.post("/sign-up", data, { skipAuth: true }), // { name, firebase_token, password, email? }
  login: (login, password) => userApiClient.post("/login", { login, password }, { skipAuth: true }), // login = email (or checked phone)
  loginGoogle: (firebase_token) => userApiClient.post("/login-google", { firebase_token }, { skipAuth: true }), // 404 = no account yet
  resetPassword: (data) => userApiClient.post("/reset-password", data, { skipAuth: true }), // { firebase_token, new_password }
  me: () => userApiClient.get("/me"),
  logout: () => userApiClient.post("/logout", {}),
  updateProfile: (data) => userApiClient.put("/profile", data), // { name, phone }
  uploadPhoto: (file) => {
    const f = new FormData();
    f.append("photo", file, file.name || "photo.jpg");
    return userApiClient.post("/profile/photo", f);
  },
  removePhoto: () => userApiClient.delete("/profile/photo"),
  changePassword: (data) => userApiClient.put("/change-password", data),
  emailStart: (password) => userApiClient.post("/email/start", { password }), // → { ticket } (15 minutes)
  changeEmail: (ticket, firebase_token) => userApiClient.put("/email", { ticket, firebase_token }),
  loginQr: () => userApiClient.post("/login-qr", {}), // QR code for the BizHub app → { id, code, seconds }
  loginQrState: (id) => userApiClient.get(`/login-qr/${id}`), // → { state: waiting | used | expired }
};

// "Delete my account" (30 days to change your mind; logging in again cancels)
export const accountDeleteService = {
  status: () => userApiClient.get("/account/delete"), // { pending, requested_at, delete_at, days }
  request: (body) => userApiClient.post("/account/delete", body), // { password } or { firebase_token }
  cancel: () => userApiClient.delete("/account/delete"),
};

// owner home screen: coins, businesses, sales (restaurants), best sellers, what needs attention
export const dashboardService = {
  get: (fresh) => userApiClient.get(`/dashboard${fresh ? "?fresh=1" : ""}`),
};

export const myBusinessService = {
  list: () => userApiClient.get("/businesses"),
  prices: () => userApiClient.get("/businesses-prices"), // { namecard: 5, restaurant: 100 } (restaurant = per year)
  create: (data) => userApiClient.post("/businesses", data),
  update: (id, data) => userApiClient.put(`/businesses/${id}`, data),
  remove: (id) => userApiClient.delete(`/businesses/${id}`),
  order: (ids) => userApiClient.put("/businesses-order", { ids }), // the owner's own order, top → bottom
};

// Team access (v1.5): Admin / View only members of a business, invite by BizHub ID or link
export const teamService = {
  myId: () => userApiClient.get("/team/my-id"), // { bizhub_id }
  shared: () => userApiClient.get("/team/shared"), // { businesses, invites }
  answer: (memberId, accept) => userApiClient.post(`/team/invites/${memberId}/${accept ? "accept" : "decline"}`, {}),
  leave: (businessId) => userApiClient.post(`/team/shared/${businessId}/leave`, {}),
  joinInfo: (code) => userApiClient.get(`/team/join/${encodeURIComponent(code)}`),
  join: (code) => userApiClient.post(`/team/join/${encodeURIComponent(code)}`, {}),
  // owner
  get: (businessId) => userApiClient.get(`/businesses/${businessId}/team`),
  invite: (businessId, bizhubId, role) => userApiClient.post(`/businesses/${businessId}/team/members`, { bizhub_id: bizhubId, role }),
  setRole: (businessId, memberId, role) => userApiClient.patch(`/businesses/${businessId}/team/members/${memberId}`, { role }),
  remove: (businessId, memberId) => userApiClient.delete(`/businesses/${businessId}/team/members/${memberId}`),
  makeLink: (businessId, role) => userApiClient.post(`/businesses/${businessId}/team/links`, { role }),
  cancelLink: (businessId, linkId) => userApiClient.delete(`/businesses/${businessId}/team/links/${linkId}`),
};

// Digital name card of one of my businesses
export const namecardService = {
  get: (businessId) => userApiClient.get(`/businesses/${businessId}/namecard`),
  update: (businessId, data) => userApiClient.put(`/businesses/${businessId}/namecard`, data),
  uploadImage: (businessId, kind, blob) => {
    const form = new FormData();
    form.append("kind", kind); // photo | cover
    form.append("file", blob, `${kind}.jpg`);
    return userApiClient.post(`/businesses/${businessId}/namecard/image`, form);
  },
  removeImage: (businessId, kind) => userApiClient.delete(`/businesses/${businessId}/namecard/image`, { kind }),
  checkSlug: (slug, businessId) => userApiClient.get("/namecard/slug-check", { slug, business_id: businessId }),
  unlock: (businessId, theme) => userApiClient.post(`/businesses/${businessId}/namecard/unlock`, { theme }),
};

export const myWalletService = {
  get: (params) => userApiClient.get("/wallet", params), // { balance, transactions }
  redeem: (code) => userApiClient.post("/wallet/redeem", { code }), // top-up card
};

// ================= Super admin =================
export const overviewService = {
  get: () => apiClient.get("/overview"),
};

export const customerAdminService = {
  list: (params) => apiClient.get("/customers", params), // page, limit, q, status
  get: (id) => apiClient.get(`/customers/${id}`),
  setStatus: (id, status, admin_note) => apiClient.put(`/customers/${id}/status`, { status, admin_note }),
  resetPassword: (id, password) => apiClient.put(`/customers/${id}/reset-password`, { password }),
};

export const businessAdminService = {
  list: (params) => apiClient.get("/businesses", params), // page, limit, q, status, category, service
  get: (id) => apiClient.get(`/businesses/${id}`),
  report: (id) => apiClient.get(`/businesses/${id}/report`),
  setStatus: (id, status, admin_note) => apiClient.put(`/businesses/${id}/status`, { status, admin_note }),
};

export const coinAdminService = {
  summary: () => apiClient.get("/coins/summary"),
  treasury: () => apiClient.get("/coins/summary", { params: { lite: "1" } }), // only the treasury balance (fast)
  transactions: (params) => apiClient.get("/coins/transactions", params), // page, limit, type, customer_id
  generate: (data) => apiClient.post("/coins/generate", data), // { amount, note }
  transfer: (data) => apiClient.post("/coins/transfer", data), // { from, to, amount, note, payment }
  // top-up cards
  cards: (params) => apiClient.get("/coins/cards", params), // page, limit, status, q, batch_id
  createCards: (data) => apiClient.post("/coins/cards", data), // { amount, quantity, note, expires_at }
  deleteCard: (id) => apiClient.delete(`/coins/cards/${id}`),
};

// Licenses: paid features of a business (forever, or until a date → renew)
export const licenseService = {
  // expect = the end date the customer saw (stops a double click from paying twice)
  buy: (businessId, product, expect, item = "") => userApiClient.post(`/businesses/${businessId}/licenses/${product}`, { ...(expect === undefined ? {} : { expect }), ...(item ? { item } : {}) }),
  mine: () => userApiClient.get("/licenses"),
};
// Buying coins by bank transfer + "Chat with BizHub" (customer side)
const formOf = (fields = {}, files = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) f.append(k, typeof v === "string" ? v : JSON.stringify(v));
  for (const [k, list] of Object.entries(files)) for (const file of [].concat(list || [])) f.append(k, file, file.name || "file");
  return f;
};
// Menu QR (view-only menu behind a QR code)
export const menuQrService = {
  get: (id) => userApiClient.get(`/businesses/${id}/menuqr`),
  save: (id, body) => userApiClient.put(`/businesses/${id}/menuqr/settings`, body),
  picture: (id, field, file) => userApiClient.post(`/businesses/${id}/menuqr/${field}`, formOf({}, { photo: file })),
  removePicture: (id, field) => userApiClient.delete(`/businesses/${id}/menuqr/${field}`),
  categories: (id) => userApiClient.get(`/businesses/${id}/menuqr/categories`),
  addCategory: (id, body) => userApiClient.post(`/businesses/${id}/menuqr/categories`, body),
  saveCategory: (id, cid, body) => userApiClient.put(`/businesses/${id}/menuqr/categories/${cid}`, body),
  removeCategory: (id, cid) => userApiClient.delete(`/businesses/${id}/menuqr/categories/${cid}`),
  orderCategories: (id, ids) => userApiClient.put(`/businesses/${id}/menuqr/categories-order`, { ids }),
  items: (id) => userApiClient.get(`/businesses/${id}/menuqr/items`),
  addItem: (id, body) => userApiClient.post(`/businesses/${id}/menuqr/items`, body),
  saveItem: (id, iid, body) => userApiClient.put(`/businesses/${id}/menuqr/items/${iid}`, body),
  removeItem: (id, iid) => userApiClient.delete(`/businesses/${id}/menuqr/items/${iid}`),
  orderItems: (id, ids) => userApiClient.put(`/businesses/${id}/menuqr/items-order`, { ids }),
  addPhoto: (id, iid, file) => userApiClient.post(`/businesses/${id}/menuqr/items/${iid}/photos`, formOf({}, { photo: file })),
  removePhoto: (id, iid, pid) => userApiClient.delete(`/businesses/${id}/menuqr/items/${iid}/photos/${pid}`),
  orderPhotos: (id, iid, ids) => userApiClient.put(`/businesses/${id}/menuqr/items/${iid}/photos-order`, { ids }),
  promos: (id) => userApiClient.get(`/businesses/${id}/menuqr/promos`),
  addPromo: (id, body) => userApiClient.post(`/businesses/${id}/menuqr/promos`, body),
  savePromo: (id, pid, body) => userApiClient.put(`/businesses/${id}/menuqr/promos/${pid}`, body),
  removePromo: (id, pid) => userApiClient.delete(`/businesses/${id}/menuqr/promos/${pid}`),
  promoPhoto: (id, pid, file) => userApiClient.post(`/businesses/${id}/menuqr/promos/${pid}/photo`, formOf({}, { photo: file })),
  feedback: (id, page = 1) => userApiClient.get(`/businesses/${id}/menuqr/feedback`, { page }),
  readFeedback: (id, fid, read = true) => userApiClient.put(`/businesses/${id}/menuqr/feedback/${fid}`, { read }),
  readAllFeedback: (id) => userApiClient.put(`/businesses/${id}/menuqr/feedback-read-all`, {}),
  removeFeedback: (id, fid) => userApiClient.delete(`/businesses/${id}/menuqr/feedback/${fid}`),
  stats: (id, days = 30) => userApiClient.get(`/businesses/${id}/menuqr/stats`, { days }),
  buyTheme: (id, key) => userApiClient.post(`/businesses/${id}/menuqr/themes/${key}`, {}),
  buyQr: (id, key) => userApiClient.post(`/businesses/${id}/menuqr/qr-styles/${key}`, {}),
  // media library: every picture lives here, the menu links to it
  media: (id) => userApiClient.get(`/businesses/${id}/menuqr/media`),
  uploadMedia: (id, files) => userApiClient.post(`/businesses/${id}/menuqr/media`, formOf({}, { photos: files })),
  removeMedia: (id, mid) => userApiClient.delete(`/businesses/${id}/menuqr/media/${mid}`),
  buySlots: (id, n) => userApiClient.post(`/businesses/${id}/menuqr/media/slots`, { n }),
  usePicture: (id, field, media_id) => userApiClient.post(`/businesses/${id}/menuqr/${field}`, { media_id }),
  usePhoto: (id, iid, media_id) => userApiClient.post(`/businesses/${id}/menuqr/items/${iid}/photos`, { media_id }),
  refreshLink: (id) => userApiClient.post(`/businesses/${id}/menuqr/link/refresh`, {}),
  usePromoPhoto: (id, pid, media_id) => userApiClient.post(`/businesses/${id}/menuqr/promos/${pid}/photo`, { media_id }),
};
// Flip Book: PDFs become flip books on a public library
export const flipbookService = {
  get: (id) => userApiClient.get(`/businesses/${id}/flipbook`),
  save: (id, body) => userApiClient.put(`/businesses/${id}/flipbook/settings`, body),
  logo: (id, file) => userApiClient.post(`/businesses/${id}/flipbook/logo`, formOf({}, { photo: file })),
  removeLogo: (id) => userApiClient.delete(`/businesses/${id}/flipbook/logo`),
  uploadSign: (id) => userApiClient.get(`/businesses/${id}/flipbook/upload-sign`),
  books: (id) => userApiClient.get(`/businesses/${id}/flipbook/books`),
  addBook: (id, body) => userApiClient.post(`/businesses/${id}/flipbook/books`, body),
  saveBook: (id, bid, body) => userApiClient.put(`/businesses/${id}/flipbook/books/${bid}`, body),
  removeBook: (id, bid) => userApiClient.delete(`/businesses/${id}/flipbook/books/${bid}`),
  replaceBook: (id, bid, body) => userApiClient.post(`/businesses/${id}/flipbook/books/${bid}/replace`, body),
  orderBooks: (id, ids) => userApiClient.put(`/businesses/${id}/flipbook/books-order`, { ids }),
  unlockPassword: (id, bid) => userApiClient.post(`/businesses/${id}/flipbook/books/${bid}/password-unlock`, {}),
  setPassword: (id, bid, password) => userApiClient.post(`/businesses/${id}/flipbook/books/${bid}/password`, { password }),
  removePassword: (id, bid) => userApiClient.delete(`/businesses/${id}/flipbook/books/${bid}/password`),
  categories: (id) => userApiClient.get(`/businesses/${id}/flipbook/categories`),
  addCategory: (id, body) => userApiClient.post(`/businesses/${id}/flipbook/categories`, body),
  saveCategory: (id, cid, body) => userApiClient.put(`/businesses/${id}/flipbook/categories/${cid}`, body),
  removeCategory: (id, cid) => userApiClient.delete(`/businesses/${id}/flipbook/categories/${cid}`),
  buySlots: (id, kind, n) => userApiClient.post(`/businesses/${id}/flipbook/slots`, { kind, n }),
  buyShelf: (id, key) => userApiClient.post(`/businesses/${id}/flipbook/shelf-themes/${key}`, {}),
  buyReader: (id, key) => userApiClient.post(`/businesses/${id}/flipbook/reader-themes/${key}`, {}),
  stats: (id, days = 30, book = "") => userApiClient.get(`/businesses/${id}/flipbook/stats`, book ? { days, book } : { days }),
  saveLinks: (id, bid, links) => userApiClient.put(`/businesses/${id}/flipbook/books/${bid}/links`, { links }),
  leads: (id, params = {}) => userApiClient.get(`/businesses/${id}/flipbook/leads`, params),
  removeLead: (id, lid) => userApiClient.delete(`/businesses/${id}/flipbook/leads/${lid}`),
  newLink: (id, kind, rid) => userApiClient.post(`/businesses/${id}/flipbook/new-link`, { kind, id: rid }),
};
// QR Code Generator
export const qrgenService = {
  get: (id) => userApiClient.get(`/businesses/${id}/qrgen`),
  save: (id, body) => userApiClient.put(`/businesses/${id}/qrgen/settings`, body),
  logo: (id, file) => userApiClient.post(`/businesses/${id}/qrgen/logo`, formOf({}, { photo: file })),
  removeLogo: (id) => userApiClient.delete(`/businesses/${id}/qrgen/logo`),
  addFolder: (id, name) => userApiClient.post(`/businesses/${id}/qrgen/folders`, { name }),
  saveFolder: (id, fid, name) => userApiClient.put(`/businesses/${id}/qrgen/folders/${fid}`, { name }),
  removeFolder: (id, fid) => userApiClient.delete(`/businesses/${id}/qrgen/folders/${fid}`),
  codes: (id, params = {}) => userApiClient.get(`/businesses/${id}/qrgen/codes`, params),
  code: (id, cid) => userApiClient.get(`/businesses/${id}/qrgen/codes/${cid}`),
  addCode: (id, body) => userApiClient.post(`/businesses/${id}/qrgen/codes`, body),
  saveCode: (id, cid, body) => userApiClient.put(`/businesses/${id}/qrgen/codes/${cid}`, body),
  removeCode: (id, cid) => userApiClient.delete(`/businesses/${id}/qrgen/codes/${cid}`),
  uploadFile: (id, cid, file) => userApiClient.post(`/businesses/${id}/qrgen/codes/${cid}/file`, formOf({}, { file })),
  buyTheme: (id, key) => userApiClient.post(`/businesses/${id}/qrgen/themes/${key}`, {}),
  buyPrint: (id, key) => userApiClient.post(`/businesses/${id}/qrgen/print/${key}`, {}),
  copyCode: (id, cid) => userApiClient.post(`/businesses/${id}/qrgen/codes/${cid}/copy`, {}),
  setSlug: (id, cid, slug) => userApiClient.post(`/businesses/${id}/qrgen/codes/${cid}/slug`, { slug }),
  trash: (id) => userApiClient.get(`/businesses/${id}/qrgen/trash`),
  restore: (id, cid) => userApiClient.post(`/businesses/${id}/qrgen/codes/${cid}/restore`, {}),
  purge: (id, cid) => userApiClient.delete(`/businesses/${id}/qrgen/trash/${cid}`),
  emptyTrash: (id) => userApiClient.delete(`/businesses/${id}/qrgen/trash`),
  coupons: (id, cid, params = {}) => userApiClient.get(`/businesses/${id}/qrgen/codes/${cid}/coupons`, params),
  redeemCoupon: (id, cid, code) => userApiClient.post(`/businesses/${id}/qrgen/codes/${cid}/coupons/redeem`, { code }),
  setPassword: (id, cid, password) => userApiClient.post(`/businesses/${id}/qrgen/codes/${cid}/password`, { password }),
  removePassword: (id, cid) => userApiClient.delete(`/businesses/${id}/qrgen/codes/${cid}/password`),
  bulk: (id, body) => userApiClient.post(`/businesses/${id}/qrgen/bulk`, body),
  buyDesign: (id, key) => userApiClient.post(`/businesses/${id}/qrgen/designs/${key}`, {}),
  buyFiles: (id, n) => userApiClient.post(`/businesses/${id}/qrgen/file-packs`, { n }),
  replies: (id, params = {}) => userApiClient.get(`/businesses/${id}/qrgen/replies`, params),
  readReply: (id, rid, read = true) => userApiClient.put(`/businesses/${id}/qrgen/replies/${rid}`, { read }),
  readAll: (id, code) => userApiClient.put(`/businesses/${id}/qrgen/replies-read-all`, code ? { code } : {}),
  removeReply: (id, rid) => userApiClient.delete(`/businesses/${id}/qrgen/replies/${rid}`),
  stats: (id, params = {}) => userApiClient.get(`/businesses/${id}/qrgen/stats`, params),
  scans: (id, params = {}) => userApiClient.get(`/businesses/${id}/qrgen/scans`, params),
  telegram: (id) => userApiClient.get(`/businesses/${id}/qrgen/telegram`),
  telegramLink: (id) => userApiClient.post(`/businesses/${id}/qrgen/telegram/link`, {}),
  telegramTest: (id) => userApiClient.post(`/businesses/${id}/qrgen/telegram/test`, {}),
  telegramOff: (id) => userApiClient.delete(`/businesses/${id}/qrgen/telegram`),
};
// several places (restaurants / guest houses): one group + one report for all
export const branchesService = {
  get: (id) => userApiClient.get(`/businesses/${id}/branches`),
  link: (id, business_id) => userApiClient.post(`/businesses/${id}/branches`, { business_id }),
  unlink: (id, bid) => userApiClient.delete(`/businesses/${id}/branches/${bid}`),
  report: (id, params) => userApiClient.get(`/businesses/${id}/branches/report`, params),
};
export const coinShopService = {
  shop: () => userApiClient.get("/coin-shop"),
  order: ({ items, bank, reference, note, proof }) => userApiClient.post("/coin-orders", formOf({ items, bank, reference, note }, { proof })),
  orders: () => userApiClient.get("/coin-orders"),
  cancel: (oid) => userApiClient.post(`/coin-orders/${oid}/cancel`, {}),
};
export const supportService = {
  get: (params) => userApiClient.get("/support", params),
  unread: () => userApiClient.get("/support/unread"),
  send: (text, files) => userApiClient.post("/support", formOf({ text }, { files })),
};
// super admin: coin orders, bank accounts, hotline, Telegram, inbox
export const platformAdminService = {
  get: () => apiClient.get("/platform"),
  save: (data) => apiClient.put("/platform", data),
  addBank: (fields, qr) => apiClient.post("/platform/banks", formOf(fields, { qr })),
  saveBank: (key, fields, qr) => apiClient.put(`/platform/banks/${key}`, formOf(fields, qr ? { qr } : {})),
  removeBank: (key) => apiClient.delete(`/platform/banks/${key}`),
  addAmountQr: (key, usd, qr, link = "") => apiClient.post(`/platform/banks/${key}/amount-qrs`, formOf({ usd: String(usd), link }, { qr })),
  setAmountQrLink: (key, usd, link) => apiClient.put(`/platform/banks/${key}/amount-qrs/${usd}`, { link }),
  removeAmountQr: (key, usd) => apiClient.delete(`/platform/banks/${key}/amount-qrs/${usd}`),
  tgLink: () => apiClient.post("/platform/telegram/link", {}),
  tgTest: () => apiClient.post("/platform/telegram/test", {}),
  tgOff: () => apiClient.delete("/platform/telegram"),
  badges: () => apiClient.get("/platform/badges"),
  orders: (params) => apiClient.get("/coin-orders", params),
  approve: (oid) => apiClient.post(`/coin-orders/${oid}/approve`, {}),
  reject: (oid, reason) => apiClient.post(`/coin-orders/${oid}/reject`, { reason }),
  threads: (params) => apiClient.get("/support", params),
  thread: (tid, params) => apiClient.get(`/support/${tid}`, params),
  reply: (tid, text, files) => apiClient.post(`/support/${tid}`, formOf({ text }, { files })),
  startChat: (cid) => apiClient.post(`/support-start/${cid}`, {}),
};
export const holidayAdminService = {
  years: () => apiClient.get("/holiday-years"),
  save: (year, data) => apiClient.put(`/holiday-years/${year}`, data),
};
export const licenseAdminService = {
  list: (params) => apiClient.get("/licenses", params),
};

// Portfolio (web CV) of a digital name card
export const portfolioService = {
  get: (businessId) => userApiClient.get(`/businesses/${businessId}/portfolio`),
  update: (businessId, data) => userApiClient.put(`/businesses/${businessId}/portfolio`, data),
  unlock: (businessId, theme) => userApiClient.post(`/businesses/${businessId}/portfolio/unlock`, { theme }),
  uploadFile: (businessId, file, title, name) => {
    const form = new FormData();
    form.append("file", file, name || file.name || "file");
    if (title) form.append("title", title);
    return userApiClient.post(`/businesses/${businessId}/portfolio/files`, form);
  },
  renameFile: (businessId, fileId, title) => userApiClient.patch(`/businesses/${businessId}/portfolio/files/${fileId}`, { title }),
  deleteFile: (businessId, fileId) => userApiClient.delete(`/businesses/${businessId}/portfolio/files/${fileId}`),
};

// Restaurant setup (menu, tables, staff…) — /api/user/businesses/:id/restaurant
const rest = (id, path = "") => `/businesses/${id}/restaurant${path}`;
const restChanged = (id, collections, request) => {
  [].concat(collections).forEach((c) => memo.set(`rest:${id}:${c}`, undefined));
  return request;
};
export const restaurantService = {
  get: (id) => userApiClient.get(rest(id)),
  saveSettings: (id, data) => userApiClient.put(rest(id, "/settings"), data),
  uploadImage: (id, kind, blob) => {
    const form = new FormData();
    form.append("kind", kind); // logo | cover
    form.append("file", blob, `${kind}.jpg`);
    return userApiClient.post(rest(id, "/image"), form);
  },
  removeImage: (id, kind) => userApiClient.delete(rest(id, "/image"), { kind }),
  // collection = zones | tables | categories | items | addon-groups | stations | staff
  // every list is remembered, so a tab opens at once with the last data while fresh data loads
  list: (id, collection) =>
    userApiClient.get(rest(id, `/${collection}`)).then((res) => {
      memo.set(`rest:${id}:${collection}`, res.data);
      return res;
    }),
  cached: (id, collection) => memo.get(`rest:${id}:${collection}`),
  // load every list in the background (after the dashboard opens)
  prefetch: (id) => Promise.allSettled(["zones", "tables", "categories", "items", "addon-groups", "stations", "staff"].map((c) => restaurantService.list(id, c))),
  // a change forgets the remembered list (deleting a station or group also changes items)
  create: (id, collection, data) => restChanged(id, collection, userApiClient.post(rest(id, `/${collection}`), data)),
  update: (id, collection, rid, data) => restChanged(id, collection, userApiClient.put(rest(id, `/${collection}/${rid}`), data)),
  remove: (id, collection, rid) => restChanged(id, [collection, "items", "tables"], userApiClient.delete(rest(id, `/${collection}/${rid}`))),
  reorder: (id, collection, ids) => restChanged(id, collection, userApiClient.put(rest(id, `/${collection}/order`), { ids })),
  bulkTables: (id, data) => restChanged(id, "tables", userApiClient.post(rest(id, "/tables/bulk"), data)),
  uploadItemPhoto: (id, rid, blob) => {
    const form = new FormData();
    form.append("file", blob, "photo.jpg");
    return restChanged(id, "items", userApiClient.post(rest(id, `/items/${rid}/photo`), form));
  },
  removeItemPhoto: (id, rid) => restChanged(id, "items", userApiClient.delete(rest(id, `/items/${rid}/photo`))),
  // POS: linked devices + settings + shifts
  pos: {
    get: (id) => userApiClient.get(rest(id, "/pos")),
    saveSettings: (id, data) => userApiClient.put(rest(id, "/pos/settings"), data),
    pairCode: (id) => userApiClient.post(rest(id, "/pos/pair-code")),
    renameDevice: (id, did, name) => userApiClient.put(rest(id, `/pos/devices/${did}`), { name }),
    removeDevice: (id, did) => userApiClient.delete(rest(id, `/pos/devices/${did}`)),
    shifts: (id, page = 1) => userApiClient.get(rest(id, `/pos/shifts?page=${page}`)),
  },
  // stock per item ("Stock" add-on): list, stock in / out / count, history, 10 sample items
  stock: {
    get: (id) => userApiClient.get(rest(id, "/stock")),
    move: (id, rid, data) => restChanged(id, "items", userApiClient.post(rest(id, `/stock/${rid}`), data)), // { kind: in|out|count, qty, cost?, note? }
    moves: (id, params) => userApiClient.get(rest(id, "/stock/moves"), params), // { item, kind, page }
    sample: (id) => restChanged(id, ["items", "categories"], userApiClient.post(rest(id, "/stock/sample"))),
  },
  forget: (id, collections) => restChanged(id, collections, null),
  // receipt looks (1 free + 10 paid, bought once)
  receiptThemes: {
    get: (id) => userApiClient.get(rest(id, "/receipt-themes")),
    use: (id, theme) => userApiClient.put(rest(id, "/receipt-themes/current"), { theme }),
    buy: (id, theme) => userApiClient.post(rest(id, `/receipt-themes/${theme}`)),
  },
  posThemes: {
    get: (id) => userApiClient.get(rest(id, "/pos-themes")),
    use: (id, theme) => userApiClient.put(rest(id, "/pos-themes/current"), { theme }),
    buy: (id, theme) => userApiClient.post(rest(id, `/pos-themes/${theme}`)),
  },
  // reward points add-on: rules, members, points (the catalogue is the generic collection "reward-list")
  rewards: {
    get: (id) => userApiClient.get(rest(id, "/rewards")),
    save: (id, data) => userApiClient.put(rest(id, "/rewards"), data),
    itemPoints: (id, points) => restChanged(id, "items", userApiClient.put(rest(id, "/rewards/items"), { points })),
    members: (id, params) => userApiClient.get(rest(id, "/rewards/members"), params), // { q, sort, page }
    addMember: (id, data) => userApiClient.post(rest(id, "/rewards/members"), data),
    member: (id, mid) => userApiClient.get(rest(id, `/rewards/members/${mid}`)),
    updateMember: (id, mid, data) => userApiClient.put(rest(id, `/rewards/members/${mid}`), data),
    adjust: (id, mid, points, note) => userApiClient.post(rest(id, `/rewards/members/${mid}/adjust`), { points, note }),
    reset: (id, mid, note) => userApiClient.post(rest(id, `/rewards/members/${mid}/reset`), { note }),
    resetAll: (id, note) => userApiClient.post(rest(id, "/rewards/reset-all"), { note, confirm: "RESET" }),
    useTheme: (id, theme) => userApiClient.put(rest(id, "/rewards/themes/current"), { theme }),
    buyTheme: (id, theme) => userApiClient.post(rest(id, `/rewards/themes/${theme}`)),
    exportCsv: (id) => userApiClient.download(rest(id, "/rewards/members/export.csv"), {}, "members.csv"),
  },
  // table ordering add-on: guests order from the QR on their table
  tableOrder: {
    get: (id) => userApiClient.get(rest(id, "/table-order")),
    save: (id, data) => userApiClient.put(rest(id, "/table-order"), data),
    uploadSound: (id, file) => {
      const form = new FormData();
      form.append("file", file);
      return userApiClient.post(rest(id, "/table-order/sound"), form);
    },
    removeSound: (id) => userApiClient.delete(rest(id, "/table-order/sound")),
    renew: (id, tid) => userApiClient.post(rest(id, `/table-order/tables/${tid}/renew`)),
    useTheme: (id, kind, theme) => userApiClient.put(rest(id, `/table-order/themes/${kind}/current`), { theme }), // kind: qr | order
    buyTheme: (id, kind, theme) => userApiClient.post(rest(id, `/table-order/themes/${kind}/${theme}`)),
  },
  // customer display add-on: texts, pictures, looks
  display: {
    get: (id) => userApiClient.get(rest(id, "/display")),
    save: (id, data) => userApiClient.put(rest(id, "/display"), data),
    uploadImage: (id, blob, slot = "banner") => {
      const form = new FormData();
      form.append("slot", slot); // banner (waiting) | side (beside the order) | thanks (behind "thank you")
      form.append("file", blob, `${slot}.jpg`);
      return userApiClient.post(rest(id, "/display/image"), form);
    },
    removeImage: (id, index, slot = "banner") => userApiClient.delete(rest(id, "/display/image"), { index, slot }),
    buyTheme: (id, theme) => userApiClient.post(rest(id, `/display/themes/${theme}`)),
  },
  // sales reports + invoices
  report: {
    get: (id, from, to) => userApiClient.get(rest(id, "/report"), { from, to }),
    invoices: (id, params) => userApiClient.get(rest(id, "/report/invoices"), params), // { from, to, status, q, page }
    invoice: (id, oid) => userApiClient.get(rest(id, `/report/invoices/${oid}`)),
    csv: (id, params) => userApiClient.download(rest(id, "/report/invoices"), { ...params, format: "csv" }, `invoices-${params.from}-${params.to}.csv`),
  },
  // Telegram add-on
  telegram: {
    get: (id) => userApiClient.get(rest(id, "/telegram")),
    link: (id) => userApiClient.post(rest(id, "/telegram/link")),
    save: (id, data) => userApiClient.put(rest(id, "/telegram"), data),
    test: (id) => userApiClient.post(rest(id, "/telegram/test")),
    disconnect: (id) => userApiClient.delete(rest(id, "/telegram")),
  },
  // Website add-on
  site: {
    get: (id) => userApiClient.get(rest(id, "/site")),
    save: (id, data) => userApiClient.put(rest(id, "/site"), data),
    checkSlug: (id, value) => userApiClient.get(rest(id, `/site/slug?value=${encodeURIComponent(value)}`)),
    uploadImage: (id, slot, blob) => {
      const form = new FormData();
      form.append("slot", slot); // hero | about | gallery
      form.append("file", blob, `${slot}.jpg`);
      return userApiClient.post(rest(id, "/site/image"), form);
    },
    removeImage: (id, slot, index) => userApiClient.delete(rest(id, "/site/image"), { slot, index }),
    buyTheme: (id, theme) => userApiClient.post(rest(id, `/site/themes/${theme}`)),
    // inbox (messages from the website's contact form)
    messages: (id, { page = 1, unread = false } = {}) => userApiClient.get(rest(id, `/site/messages?page=${page}${unread ? "&unread=1" : ""}`)),
    readMessage: (id, mid, read = true) => userApiClient.put(rest(id, `/site/messages/${mid}`), { read }),
    readAll: (id) => userApiClient.post(rest(id, "/site/messages/read-all")),
    removeMessage: (id, mid) => userApiClient.delete(rest(id, `/site/messages/${mid}`)),
  },
};

// Attendance (business type "attendance") — /api/user/businesses/:id/attendance
// Guest House: rooms, bookings, check-in / check-out, room bills
const gh = (id, path = "") => `/businesses/${id}/guesthouse${path}`;
export const guestHouseService = {
  get: (id) => userApiClient.get(gh(id)),
  saveSettings: (id, data) => userApiClient.put(gh(id, "/settings"), data),
  // collection = room-types | rooms
  create: (id, collection, data) => userApiClient.post(gh(id, `/${collection}`), data),
  update: (id, collection, rid, data) => userApiClient.put(gh(id, `/${collection}/${rid}`), data),
  remove: (id, collection, rid) => userApiClient.delete(gh(id, `/${collection}/${rid}`)),
  stays: (id, params) => userApiClient.get(gh(id, "/stays"), params),
  stay: (id, sid) => userApiClient.get(gh(id, `/stays/${sid}`)),
  book: (id, data) => userApiClient.post(gh(id, "/stays"), data),
  updateStay: (id, sid, data) => userApiClient.put(gh(id, `/stays/${sid}`), data),
  action: (id, sid, action, data = {}) => userApiClient.post(gh(id, `/stays/${sid}/${action}`), data), // check-in | check-out | cancel | no-show
  addCharge: (id, sid, data) => userApiClient.post(gh(id, `/stays/${sid}/charges`), data),
  removeCharge: (id, sid, cid) => userApiClient.delete(gh(id, `/stays/${sid}/charges/${cid}`)),
  addPayment: (id, sid, data) => userApiClient.post(gh(id, `/stays/${sid}/payments`), data),
  removePayment: (id, sid, pid) => userApiClient.delete(gh(id, `/stays/${sid}/payments/${pid}`)),
  discount: (id, sid, discount) => userApiClient.put(gh(id, `/stays/${sid}/discount`), { discount }),
  today: (id, params) => userApiClient.get(gh(id, "/today"), params),
  report: (id, month, params) => userApiClient.get(gh(id, "/report"), { month, ...params }),
  guests: (id, q) => userApiClient.get(gh(id, "/guests"), { q }),
  // desk POS: staff, devices, payment QR (staff use create/update/remove with "staff")
  staff: (id) => userApiClient.get(gh(id, "/staff")),
  pairCode: (id) => userApiClient.post(gh(id, "/pos/pair-code")),
  devices: (id) => userApiClient.get(gh(id, "/pos/devices")),
  removeDevice: (id, did) => userApiClient.delete(gh(id, `/pos/devices/${did}`)),
  uploadPayQr: (id, file) => {
    const form = new FormData();
    form.append("file", file, file.name || "qr.png");
    return userApiClient.post(gh(id, "/pay-qr"), form);
  },
  removePayQr: (id) => userApiClient.delete(gh(id, "/pay-qr")),
  // the guest's ID card / passport photos (optional)
  addIdPhoto: (id, sid, file) => {
    const form = new FormData();
    form.append("photo", file);
    return userApiClient.post(gh(id, `/stays/${sid}/id-photos`), form);
  },
  removeIdPhoto: (id, sid, pid) => userApiClient.delete(gh(id, `/stays/${sid}/id-photos/${pid}`)),
  // pictures: kind = logo | cover | display-image | pay-qr
  upload: (id, kind, file) => {
    const form = new FormData();
    form.append("file", file, file.name || "image.png");
    return userApiClient.post(gh(id, `/${kind}`), form);
  },
  removePic: (id, kind) => userApiClient.delete(gh(id, `/${kind}`)),
  saveProfile: (id, data) => userApiClient.put(gh(id, "/profile"), data),
  displayThemes: (id) => userApiClient.get(gh(id, "/display-themes")),
  buyTheme: (id, theme) => userApiClient.post(gh(id, `/display-themes/${theme}/buy`)),
  setTheme: (id, theme) => userApiClient.put(gh(id, "/display-theme"), { theme }),
  print: (id) => userApiClient.get(gh(id, "/print")),
  setPrint: (id, data) => userApiClient.put(gh(id, "/print"), data),
  buyPrintTheme: (id, theme) => userApiClient.post(gh(id, `/print-themes/${theme}/buy`)),
  // website (/g/<slug>)
  site: (id) => userApiClient.get(gh(id, "/site")),
  saveSite: (id, data) => userApiClient.put(gh(id, "/site"), data),
  siteSlug: (id, value) => userApiClient.get(gh(id, "/site/slug"), { value }),
  siteImage: (id, slot, file, typeId) => {
    const form = new FormData();
    form.append("slot", slot);
    if (typeId) form.append("type_id", typeId);
    form.append("file", file, file.name || "image.jpg");
    return userApiClient.post(gh(id, "/site/image"), form);
  },
  removeSiteImage: (id, data) => userApiClient.delete(gh(id, "/site/image"), data),
  buySiteTheme: (id, theme) => userApiClient.post(gh(id, `/site/themes/${theme}`)),
  siteRequests: (id, params) => userApiClient.get(gh(id, "/site/requests"), params),
  setSiteRequest: (id, rid, status) => userApiClient.put(gh(id, `/site/requests/${rid}`), { status }),
  removeSiteRequest: (id, rid) => userApiClient.delete(gh(id, `/site/requests/${rid}`)),
  // promotions (season / date deals)
  promos: (id) => userApiClient.get(gh(id, "/promos")),
  addPromo: (id, data) => userApiClient.post(gh(id, "/promos"), data),
  savePromo: (id, pid, data) => userApiClient.put(gh(id, `/promos/${pid}`), data),
  removePromo: (id, pid) => userApiClient.delete(gh(id, `/promos/${pid}`)),
  promoPreview: (id, params) => userApiClient.get(gh(id, "/promos/preview"), params),
  // customer accounts
  portal: (id) => userApiClient.get(gh(id, "/portal")),
  savePortal: (id, data) => userApiClient.put(gh(id, "/portal"), data),
  buyPortalTheme: (id, theme) => userApiClient.post(gh(id, `/portal-themes/${theme}`)),
  customers: (id, params) => userApiClient.get(gh(id, "/customers"), params),
  customer: (id, cid) => userApiClient.get(gh(id, `/customers/${cid}`)),
  setCustomer: (id, cid, data) => userApiClient.put(gh(id, `/customers/${cid}`), data),
  custRequests: (id, params) => userApiClient.get(gh(id, "/cust-requests"), params),
  custCount: (id) => userApiClient.get(gh(id, "/cust-requests/count")),
  custRooms: (id, rid) => userApiClient.get(gh(id, `/cust-requests/${rid}/rooms`)),
  custAccept: (id, rid, data) => userApiClient.post(gh(id, `/cust-requests/${rid}/accept`), data),
  custDecline: (id, rid, data) => userApiClient.post(gh(id, `/cust-requests/${rid}/decline`), data),
  // Telegram alerts
  tg: (id) => userApiClient.get(gh(id, "/telegram")),
  tgLink: (id) => userApiClient.post(gh(id, "/telegram/link")),
  tgSave: (id, data) => userApiClient.put(gh(id, "/telegram"), data),
  tgTest: (id) => userApiClient.post(gh(id, "/telegram/test")),
  tgOff: (id) => userApiClient.delete(gh(id, "/telegram")),
  // extra services menu + foreign guest report
  services: (id) => userApiClient.get(gh(id, "/services")),
  saveServices: (id, list) => userApiClient.put(gh(id, "/services"), { list }),
  servicesReport: (id, params) => userApiClient.get(gh(id, "/services/report"), params),
  police: (id, params) => userApiClient.get(gh(id, "/police"), params),
  // housekeeping + expenses (same names in the desk POS api)
  housekeeping: (id, params) => userApiClient.get(gh(id, "/housekeeping"), params),
  setHk: (id, rid, data) => userApiClient.put(gh(id, `/rooms/${rid}/hk`), data),
  expenses: (id, month) => userApiClient.get(gh(id, "/expenses"), { month }),
  addExpense: (id, data) => userApiClient.post(gh(id, "/expenses"), data),
  saveExpense: (id, eid, data) => userApiClient.put(gh(id, `/expenses/${eid}`), data),
  removeExpense: (id, eid) => userApiClient.delete(gh(id, `/expenses/${eid}`)),
  profit: (id, month) => userApiClient.get(gh(id, "/profit"), { month }),
  // Booking.com / Agoda calendar links
  ical: (id) => userApiClient.get(gh(id, "/ical")),
  addIcal: (id, data) => userApiClient.post(gh(id, "/ical/feeds"), data),
  saveIcal: (id, fid, data) => userApiClient.put(gh(id, `/ical/feeds/${fid}`), data),
  removeIcal: (id, fid) => userApiClient.delete(gh(id, `/ical/feeds/${fid}`)),
  syncIcal: (id) => userApiClient.post(gh(id, "/ical/sync")),
  icalToken: (id) => userApiClient.post(gh(id, "/ical/token")),
  // monthly rent (same names in the desk POS api)
  leases: (id) => userApiClient.get(gh(id, "/leases")),
  addLease: (id, data) => userApiClient.post(gh(id, "/leases"), data),
  saveLease: (id, sid, data) => userApiClient.put(gh(id, `/leases/${sid}`), data),
  leaseBill: (id, sid, data) => userApiClient.post(gh(id, `/leases/${sid}/bill`), data),
  endLease: (id, sid, data) => userApiClient.post(gh(id, `/leases/${sid}/end`), data),
  // guest reviews + loyalty points (stay ones have the same names in the desk POS api)
  reviews: (id) => userApiClient.get(gh(id, "/reviews")),
  saveReview: (id, rid, data) => userApiClient.put(gh(id, `/reviews/${rid}`), data),
  removeReview: (id, rid) => userApiClient.delete(gh(id, `/reviews/${rid}`)),
  reviewSettings: (id, data) => userApiClient.put(gh(id, "/reviews-settings"), data),
  stayReview: (id, sid) => userApiClient.get(gh(id, `/stays/${sid}/review`)),
  loyalty: (id) => userApiClient.get(gh(id, "/loyalty")),
  saveLoyalty: (id, data) => userApiClient.put(gh(id, "/loyalty"), data),
  addPoints: (id, cid, data) => userApiClient.post(gh(id, `/customers/${cid}/points`), data),
  members: (id, q) => userApiClient.get(gh(id, "/members"), { q }),
  stayMember: (id, sid) => userApiClient.get(gh(id, `/stays/${sid}/member`)),
  linkMember: (id, sid, customer_id) => userApiClient.put(gh(id, `/stays/${sid}/customer`), { customer_id }),
  usePoints: (id, sid, points) => userApiClient.post(gh(id, `/stays/${sid}/points`), { points }),
  undoPoints: (id, sid) => userApiClient.delete(gh(id, `/stays/${sid}/points`)),
};

const mart = (id, path = "") => `/businesses/${id}/mart${path}`;
const martForm = (field, file) => {
  const form = new FormData();
  form.append(field, file, file.name || "image.png");
  return form;
};
// Mini Mart (owner). The POS uses the same names through pos/mart/martApi.js
export const martService = {
  get: (id) => userApiClient.get(mart(id)),
  saveSettings: (id, data) => userApiClient.put(mart(id, "/settings"), data),
  saveProfile: (id, data) => userApiClient.put(mart(id, "/profile"), data),
  categories: (id) => userApiClient.get(mart(id, "/categories")),
  addCategory: (id, data) => userApiClient.post(mart(id, "/categories"), data),
  saveCategory: (id, cid, data) => userApiClient.put(mart(id, `/categories/${cid}`), data),
  removeCategory: (id, cid) => userApiClient.delete(mart(id, `/categories/${cid}`)),
  products: (id) => userApiClient.get(mart(id, "/products")),
  addProduct: (id, data) => userApiClient.post(mart(id, "/products"), data),
  saveProduct: (id, pid, data) => userApiClient.put(mart(id, `/products/${pid}`), data),
  removeProduct: (id, pid) => userApiClient.delete(mart(id, `/products/${pid}`)),
  importProducts: (id, rows) => userApiClient.post(mart(id, "/products/import"), { rows }),
  productPhoto: (id, pid, file) => userApiClient.post(mart(id, `/products/${pid}/photo`), martForm("photo", file)),
  removeProductPhoto: (id, pid) => userApiClient.delete(mart(id, `/products/${pid}/photo`)),
  sales: (id, params) => userApiClient.get(mart(id, "/sales"), params),
  sale: (id, sid) => userApiClient.get(mart(id, `/sales/${sid}`)),
  voidSale: (id, sid, reason) => userApiClient.post(mart(id, `/sales/${sid}/void`), { reason }),
  report: (id, params) => userApiClient.get(mart(id, "/report"), params),
  staff: (id) => userApiClient.get(mart(id, "/staff")),
  addStaff: (id, data) => userApiClient.post(mart(id, "/staff"), data),
  saveStaff: (id, rid, data) => userApiClient.put(mart(id, `/staff/${rid}`), data),
  removeStaff: (id, rid) => userApiClient.delete(mart(id, `/staff/${rid}`)),
  pairCode: (id) => userApiClient.post(mart(id, "/pos/pair-code")),
  devices: (id) => userApiClient.get(mart(id, "/pos/devices")),
  removeDevice: (id, did) => userApiClient.delete(mart(id, `/pos/devices/${did}`)),
  uploadPayQr: (id, file) => userApiClient.post(mart(id, "/pay-qr"), martForm("file", file)),
  removePayQr: (id) => userApiClient.delete(mart(id, "/pay-qr")),
  uploadLogo: (id, file) => userApiClient.post(mart(id, "/logo"), martForm("file", file)),
  removeLogo: (id) => userApiClient.delete(mart(id, "/logo")),
  units: (id) => userApiClient.get(mart(id, "/units")),
  addUnit: (id, data) => userApiClient.post(mart(id, "/units"), data),
  saveUnit: (id, uid, data) => userApiClient.put(mart(id, `/units/${uid}`), data),
  removeUnit: (id, uid) => userApiClient.delete(mart(id, `/units/${uid}`)),
  stock: (id, params) => userApiClient.get(mart(id, "/stock"), params),
  stockIn: (id, data) => userApiClient.post(mart(id, "/stock/in"), data),
  stockCount: (id, data) => userApiClient.post(mart(id, "/stock/count"), data),
  stockMoves: (id, params) => userApiClient.get(mart(id, "/stock/moves"), params),
  print: (id) => userApiClient.get(mart(id, "/print")),
  setPrint: (id, data) => userApiClient.put(mart(id, "/print"), data),
  buyPrintTheme: (id, theme) => userApiClient.post(mart(id, `/print-themes/${theme}/buy`)),
  genBarcode: (id, pid) => userApiClient.post(mart(id, `/products/${pid}/barcode`)),
  debtors: (id, q) => userApiClient.get(mart(id, "/debtors"), { q }),
  debtor: (id, did) => userApiClient.get(mart(id, `/debtors/${did}`)),
  addDebtor: (id, data) => userApiClient.post(mart(id, "/debtors"), data),
  saveDebtor: (id, did, data) => userApiClient.put(mart(id, `/debtors/${did}`), data),
  removeDebtor: (id, did) => userApiClient.delete(mart(id, `/debtors/${did}`)),
  debtorPay: (id, did, data) => userApiClient.post(mart(id, `/debtors/${did}/payments`), data),
  shifts: (id) => userApiClient.get(mart(id, "/shifts")),
  openShift: (id, data) => userApiClient.post(mart(id, "/shifts/open"), data),
  shiftCash: (id, sid, data) => userApiClient.post(mart(id, `/shifts/${sid}/cash`), data),
  closeShift: (id, sid, data) => userApiClient.post(mart(id, `/shifts/${sid}/close`), data),
  suppliers: (id) => userApiClient.get(mart(id, "/suppliers")),
  supplier: (id, sid) => userApiClient.get(mart(id, `/suppliers/${sid}`)),
  addSupplier: (id, data) => userApiClient.post(mart(id, "/suppliers"), data),
  saveSupplier: (id, sid, data) => userApiClient.put(mart(id, `/suppliers/${sid}`), data),
  removeSupplier: (id, sid) => userApiClient.delete(mart(id, `/suppliers/${sid}`)),
  // payment methods the shop makes (mart_payments) + POS looks (mart_pos_theme)
  addPayMethod: (id, data) => userApiClient.post(mart(id, "/pay-methods"), data),
  savePayMethod: (id, key, data) => userApiClient.put(mart(id, `/pay-methods/${key}`), data),
  removePayMethod: (id, key) => userApiClient.delete(mart(id, `/pay-methods/${key}`)),
  payMethodQr: (id, key, file) => userApiClient.post(mart(id, `/pay-methods/${key}/qr`), martForm("file", file)),
  removePayMethodQr: (id, key) => userApiClient.delete(mart(id, `/pay-methods/${key}/qr`)),
  addPage: (id, data) => userApiClient.post(mart(id, "/site/pages"), data),
  savePage: (id, pid, data) => userApiClient.put(mart(id, `/site/pages/${pid}`), data),
  removePage: (id, pid) => userApiClient.delete(mart(id, `/site/pages/${pid}`)),
  orderPages: (id, ids) => userApiClient.put(mart(id, "/site/pages-order"), { ids }),
  pageImage: (id, pid, file) => userApiClient.post(mart(id, `/site/pages/${pid}/image`), martForm("file", file)),
  removePageImage: (id, pid) => userApiClient.delete(mart(id, `/site/pages/${pid}/image`)),
  messages: (id, params = {}) => userApiClient.get(mart(id, `/messages?${new URLSearchParams(params)}`)),
  readMessage: (id, mid, read = true) => userApiClient.put(mart(id, `/messages/${mid}`), { read }),
  readAllMessages: (id) => userApiClient.post(mart(id, "/messages/read-all")),
  removeMessage: (id, mid) => userApiClient.delete(mart(id, `/messages/${mid}`)),
  shopQr: (id, file) => userApiClient.post(mart(id, "/shop/qr"), martForm("file", file)),
  removeShopQr: (id) => userApiClient.delete(mart(id, "/shop/qr")),
  shopSound: (id, file) => userApiClient.post(mart(id, "/shop/sound"), martForm("file", file)),
  removeShopSound: (id) => userApiClient.delete(mart(id, "/shop/sound")),
  tg: (id) => userApiClient.get(mart(id, "/telegram")),
  tgLink: (id) => userApiClient.post(mart(id, "/telegram/link")),
  tgSave: (id, data) => userApiClient.put(mart(id, "/telegram"), data),
  tgTest: (id) => userApiClient.post(mart(id, "/telegram/test")),
  tgOff: (id) => userApiClient.delete(mart(id, "/telegram")),
  tgDaily: (id) => userApiClient.post(mart(id, "/telegram/daily")),
  // expiry dates (mart_expiry)
  expiry: (id, params = {}) => userApiClient.get(mart(id, `/expiry?${new URLSearchParams(params)}`)),
  addExpiry: (id, data) => userApiClient.post(mart(id, "/expiry"), data),
  saveExpiry: (id, bid, data) => userApiClient.put(mart(id, `/expiry/${bid}`), data),
  removeExpiry: (id, bid) => userApiClient.delete(mart(id, `/expiry/${bid}`)),
  wasteBatch: (id, bid, data) => userApiClient.post(mart(id, `/expiry/${bid}/waste`), data),
  waste: (id, data) => userApiClient.post(mart(id, "/waste"), data),
  wasteList: (id, params = {}) => userApiClient.get(mart(id, `/waste?${new URLSearchParams(params)}`)),
  expiryDays: (id, days) => userApiClient.put(mart(id, "/expiry/settings"), { days }),
  // loyalty (mart_loyalty)
  loyalty: (id) => userApiClient.get(mart(id, "/loyalty")),
  saveLoyalty: (id, data) => userApiClient.put(mart(id, "/loyalty"), data),
  members: (id, params = {}) => userApiClient.get(mart(id, `/loyalty/members?${new URLSearchParams(params)}`)),
  member: (id, mid) => userApiClient.get(mart(id, `/loyalty/members/${mid}`)),
  addMember: (id, data) => userApiClient.post(mart(id, "/loyalty/members"), data),
  saveMember: (id, mid, data) => userApiClient.put(mart(id, `/loyalty/members/${mid}`), data),
  removeMember: (id, mid) => userApiClient.delete(mart(id, `/loyalty/members/${mid}`)),
  adjustPoints: (id, mid, data) => userApiClient.post(mart(id, `/loyalty/members/${mid}/adjust`), data),
  lookupMember: (id, phone) => userApiClient.get(mart(id, `/loyalty/lookup?phone=${encodeURIComponent(phone)}`)),
  // promotions (mart_promos)
  promos: (id) => userApiClient.get(mart(id, "/promos")),
  addPromo: (id, data) => userApiClient.post(mart(id, "/promos"), data),
  savePromo: (id, pid, data) => userApiClient.put(mart(id, `/promos/${pid}`), data),
  removePromo: (id, pid) => userApiClient.delete(mart(id, `/promos/${pid}`)),
  checkPromos: (id, data) => userApiClient.post(mart(id, "/promos/check"), data),
  // profit (mart_profit)
  profit: (id, params = {}) => userApiClient.get(mart(id, `/profit?${new URLSearchParams(params)}`)),
  // reorder + purchase orders (mart_purchase)
  reorder: (id) => userApiClient.get(mart(id, "/reorder")),
  pos: (id, params = {}) => userApiClient.get(mart(id, `/po?${new URLSearchParams(params)}`)),
  addPo: (id, data) => userApiClient.post(mart(id, "/po"), data),
  savePo: (id, poid, data) => userApiClient.put(mart(id, `/po/${poid}`), data),
  removePo: (id, poid) => userApiClient.delete(mart(id, `/po/${poid}`)),
  sendPo: (id, poid) => userApiClient.post(mart(id, `/po/${poid}/send`)),
  cancelPo: (id, poid) => userApiClient.post(mart(id, `/po/${poid}/cancel`)),
  receivePo: (id, poid, data) => userApiClient.post(mart(id, `/po/${poid}/receive`), data),
  // delivery zones + drivers (mart_delivery)
  delivery: (id) => userApiClient.get(mart(id, "/delivery")),
  saveZones: (id, zones) => userApiClient.put(mart(id, "/delivery/zones"), { zones }),
  addDriver: (id, data) => userApiClient.post(mart(id, "/drivers"), data),
  saveDriver: (id, did, data) => userApiClient.put(mart(id, `/drivers/${did}`), data),
  removeDriver: (id, did) => userApiClient.delete(mart(id, `/drivers/${did}`)),
  driverReport: (id, month) => userApiClient.get(mart(id, `/drivers/report?month=${month}`)),
  setDriver: (id, oid, driver_id) => userApiClient.post(mart(id, `/orders/${oid}/driver`), { driver_id }),
  // several shops (mart_branches)
  branches: (id) => userApiClient.get(mart(id, "/branches")),
  linkBranch: (id, business_id) => userApiClient.post(mart(id, "/branches"), { business_id }),
  unlinkBranch: (id, bid) => userApiClient.delete(mart(id, `/branches/${bid}`)),
  branchReport: (id, params = {}) => userApiClient.get(mart(id, `/branches/report?${new URLSearchParams(params)}`)),
  branchStock: (id, q) => userApiClient.get(mart(id, `/branches/stock?q=${encodeURIComponent(q)}`)),
  transfer: (id, data) => userApiClient.post(mart(id, "/branches/transfer"), data),
  transfers: (id) => userApiClient.get(mart(id, "/branches/transfers")),
  copyProducts: (id, data) => userApiClient.post(mart(id, "/branches/copy"), data),
  // weighing-scale barcodes (mart_scale)
  scale: (id) => userApiClient.get(mart(id, "/scale")),
  saveScale: (id, data) => userApiClient.put(mart(id, "/scale"), data),
  posThemes: (id) => userApiClient.get(mart(id, "/pos-themes")),
  setPosTheme: (id, theme) => userApiClient.put(mart(id, "/pos-theme"), { theme }),
  setPosColor: (id, color) => userApiClient.put(mart(id, "/pos-theme"), { color }),
  buyPosTheme: (id, theme) => userApiClient.post(mart(id, `/pos-themes/${theme}/buy`)),
  // website (/m/<slug>) + online orders
  site: (id) => userApiClient.get(mart(id, "/site")),
  saveSite: (id, data) => userApiClient.put(mart(id, "/site"), data),
  checkSlug: (id, value) => userApiClient.get(mart(id, `/site/slug?value=${encodeURIComponent(value)}`)),
  siteCover: (id, file) => userApiClient.post(mart(id, "/site/cover"), martForm("file", file)),
  removeSiteCover: (id) => userApiClient.delete(mart(id, "/site/cover")),
  buySiteTheme: (id, theme) => userApiClient.post(mart(id, `/site-themes/${theme}/buy`)),
  shop: (id) => userApiClient.get(mart(id, "/shop")),
  saveShop: (id, data) => userApiClient.put(mart(id, "/shop"), data),
  buyPortalTheme: (id, theme) => userApiClient.post(mart(id, `/portal-themes/${theme}/buy`)),
  customers: (id, params = {}) => userApiClient.get(mart(id, `/customers?${new URLSearchParams(params)}`)),
  customer: (id, cid) => userApiClient.get(mart(id, `/customers/${cid}`)),
  saveCustomer: (id, cid, data) => userApiClient.put(mart(id, `/customers/${cid}`), data),
  orders: (id, params = {}) => userApiClient.get(mart(id, `/orders?${new URLSearchParams(params)}`)),
  orderCount: (id) => userApiClient.get(mart(id, "/orders/count")),
  orderStep: (id, oid, step, data) => userApiClient.post(mart(id, `/orders/${oid}/${step}`), data || {}),
};

const att = (id, path = "") => `/businesses/${id}/attendance${path}`;
export const attendanceService = {
  get: (id) => userApiClient.get(att(id)),
  saveRules: (id, data) => userApiClient.put(att(id, "/rules"), data),
  newCode: (id) => userApiClient.post(att(id, "/code")),
  // collection = branches | shifts | staff
  list: (id, collection) => userApiClient.get(att(id, `/${collection}`)),
  create: (id, collection, data) => userApiClient.post(att(id, `/${collection}`), data),
  update: (id, collection, rid, data) => userApiClient.put(att(id, `/${collection}/${rid}`), data),
  remove: (id, collection, rid) => userApiClient.delete(att(id, `/${collection}/${rid}`)),
  resetDevice: (id, rid) => userApiClient.post(att(id, `/staff/${rid}/reset-device`)),
  buySlot: (id, item, expect, kind = "branch") => userApiClient.post(att(id, "/slots"), { kind, ...(item ? { item } : {}), ...(expect !== undefined ? { expect } : {}) }),
  today: (id, day) => userApiClient.get(att(id, "/today"), { day }),
  review: (id) => userApiClient.get(att(id, "/review")),
  decide: (id, pid, review, note) => userApiClient.post(att(id, `/punches/${pid}/decide`), { review, note }),
  addPunch: (id, data) => userApiClient.post(att(id, "/punches"), data),
  removePunch: (id, pid) => userApiClient.delete(att(id, `/punches/${pid}`)),
  report: (id, month) => userApiClient.get(att(id, "/report"), { month }),
  csv: (id, month, lang) => userApiClient.download(att(id, "/report"), { month, format: "csv", lang }, `attendance-${month}.csv`),
  holidays: {
    list: (id, year) => userApiClient.get(att(id, `/holidays?year=${year}`)),
    add: (id, data) => userApiClient.post(att(id, "/holidays"), data),
    rename: (id, hid, name) => userApiClient.put(att(id, `/holidays/${hid}`), { name }),
    remove: (id, hid) => userApiClient.delete(att(id, `/holidays/${hid}`)),
    preset: (id, year) => userApiClient.post(att(id, "/holidays/preset"), { year }),
    unlock: (id, year) => userApiClient.post(att(id, "/holidays/unlock"), { year }),
  },
  roster: {
    get: (id, from) => userApiClient.get(att(id, `/roster?from=${from}`)),
    save: (id, entries) => userApiClient.put(att(id, "/roster"), { entries }),
    copy: (id, from, to) => userApiClient.post(att(id, "/roster/copy"), { from, to }),
    clear: (id, from) => userApiClient.post(att(id, "/roster/clear"), { from }),
  },
  fixes: {
    list: (id, status = "pending") => userApiClient.get(att(id, `/fixes?status=${status}`)),
    decide: (id, fid, status, note) => userApiClient.post(att(id, `/fixes/${fid}/decide`), { status, note }),
  },
  // company website (att_website)
  site: {
    get: (id) => userApiClient.get(att(id, "/site")),
    save: (id, data) => userApiClient.put(att(id, "/site"), data),
    checkSlug: (id, value) => userApiClient.get(att(id, `/site/slug?value=${encodeURIComponent(value)}`)),
    uploadImage: (id, slot, blob, rid = "") => {
      const form = new FormData();
      form.append("slot", slot); // hero | about | gallery | page | service
      if (rid) form.append("id", rid);
      form.append("file", blob, `${slot}.jpg`);
      return userApiClient.post(att(id, "/site/image"), form);
    },
    removeImage: (id, slot, { rid, index } = {}) => userApiClient.delete(att(id, "/site/image"), { slot, ...(rid ? { id: rid } : {}), ...(index !== undefined ? { index } : {}) }),
    buyTheme: (id, theme) => userApiClient.post(att(id, `/site/themes/${theme}`)),
    messages: (id, { page = 1, unread = false } = {}) => userApiClient.get(att(id, `/site/messages?page=${page}${unread ? "&unread=1" : ""}`)),
    readMessage: (id, mid, read = true) => userApiClient.put(att(id, `/site/messages/${mid}`), { read }),
    readAll: (id) => userApiClient.post(att(id, "/site/messages/read-all")),
    removeMessage: (id, mid) => userApiClient.delete(att(id, `/site/messages/${mid}`)),
  },
  looks: (id) => userApiClient.get(att(id, "/looks")),
  saveLooks: (id, data) => userApiClient.put(att(id, "/looks"), data), // { app?, qr?, qr_note? }
  buyLook: (id, kind, theme) => userApiClient.post(att(id, `/looks/${kind}/${theme}`)), // kind = app | qr
  uploadLogo: (id, blob) => {
    const form = new FormData();
    form.append("file", blob, "logo.png");
    return userApiClient.post(att(id, "/logo"), form);
  },
  removeLogo: (id) => userApiClient.delete(att(id, "/logo")),
  // add-ons
  telegram: (id) => userApiClient.get(att(id, "/telegram")),
  telegramLink: (id) => userApiClient.post(att(id, "/telegram/link")),
  saveTelegram: (id, data) => userApiClient.put(att(id, "/telegram"), data),
  testTelegram: (id) => userApiClient.post(att(id, "/telegram/test")),
  disconnectTelegram: (id) => userApiClient.delete(att(id, "/telegram")),
  leave: (id, params) => userApiClient.get(att(id, "/leave"), params),
  addLeave: (id, data) => userApiClient.post(att(id, "/leave"), data),
  decideLeave: (id, lid, status, note) => userApiClient.post(att(id, `/leave/${lid}/decide`), { status, note }),
  removeLeave: (id, lid) => userApiClient.delete(att(id, `/leave/${lid}`)),
  leaveSettings: (id, data) => userApiClient.put(att(id, "/leave-settings"), data),
  saveSelfie: (id, required) => userApiClient.put(att(id, "/selfie"), { required }),
  kiosk: (id) => userApiClient.get(att(id, "/kiosk")),
  resetKiosk: (id, rid) => userApiClient.post(att(id, `/kiosk/${rid}/reset`)),
  payroll: (id, month) => userApiClient.get(att(id, "/payroll"), { month }),
  payrollCsv: (id, month, lang) => userApiClient.download(att(id, "/payroll"), { month, format: "csv", lang }, `payroll-${month}.csv`),
  bankCsv: (id, month, lang) => userApiClient.download(att(id, "/payroll"), { month, format: "bank", lang }, `bank-transfer-${month}.csv`),
  docs: {
    list: (id, rid) => userApiClient.get(att(id, `/staff/${rid}/docs`)),
    add: (id, rid, file, fields) => {
      const form = new FormData();
      form.append("file", file, file.name || "doc.jpg");
      for (const [k, v] of Object.entries(fields)) form.append(k, v);
      return userApiClient.post(att(id, `/staff/${rid}/docs`), form);
    },
    update: (id, rid, did, data) => userApiClient.put(att(id, `/staff/${rid}/docs/${did}`), data),
    remove: (id, rid, did) => userApiClient.delete(att(id, `/staff/${rid}/docs/${did}`)),
  },
  hr: (id) => userApiClient.get(att(id, "/hr")),
  news: {
    list: (id) => userApiClient.get(att(id, "/news")),
    add: (id, data) => userApiClient.post(att(id, "/news"), data),
    update: (id, nid, data) => userApiClient.put(att(id, `/news/${nid}`), data),
    remove: (id, nid) => userApiClient.delete(att(id, `/news/${nid}`)),
  },
  rewards: (id, month) => userApiClient.get(att(id, "/rewards"), { month }),
  rewardSettings: (id, data) => userApiClient.put(att(id, "/rewards/settings"), data),
  overtime: {
    list: (id, status = "pending") => userApiClient.get(att(id, `/overtime?status=${status}`)),
    decide: (id, oid, status, note) => userApiClient.post(att(id, `/overtime/${oid}/decide`), { status, note }),
  },
  payrollSettings: (id, data) => userApiClient.put(att(id, "/payroll/settings"), data),
  setSalary: (id, rid, salary, pay_type) => userApiClient.put(att(id, `/payroll/salary/${rid}`), { salary, ...(pay_type ? { pay_type } : {}) }),
  addAdjust: (id, data) => userApiClient.post(att(id, "/payroll/adjust"), data),
  removeAdjust: (id, aid) => userApiClient.delete(att(id, `/payroll/adjust/${aid}`)),
};

// ================= Website Builder (/site/<slug>) =================
const ws = (id, p = "") => `/businesses/${id}/website${p}`;
export const websiteService = {
  get: (id) => userApiClient.get(ws(id)),
  save: (id, body) => userApiClient.put(ws(id, "/settings"), body),
  template: (id, key, keepLook = false) => userApiClient.post(ws(id, "/template"), { key, keep_look: keepLook }),
  addPage: (id, body) => userApiClient.post(ws(id, "/pages"), body),
  savePage: (id, pid, body) => userApiClient.put(ws(id, `/pages/${pid}`), body),
  removePage: (id, pid) => userApiClient.delete(ws(id, `/pages/${pid}`)),
  duplicatePage: (id, pid) => userApiClient.post(ws(id, `/pages/${pid}/duplicate`)),
  homePage: (id, pid) => userApiClient.post(ws(id, `/pages/${pid}/home`)),
  orderPages: (id, ids) => userApiClient.put(ws(id, "/pages-order"), { ids }),
  publish: (id) => userApiClient.post(ws(id, "/publish")),
  unpublish: (id) => userApiClient.post(ws(id, "/unpublish")),
  media: (id) => userApiClient.get(ws(id, "/media")),
  upload: (id, file) => userApiClient.post(ws(id, "/media"), formOf({}, { photo: file })),
  removeMedia: (id, mid) => userApiClient.delete(ws(id, `/media/${mid}`)),
  messages: (id, params = {}) => userApiClient.get(ws(id, "/messages"), params),
  readMessage: (id, mid, read = true) => userApiClient.put(ws(id, `/messages/${mid}`), { read }),
  readAll: (id) => userApiClient.put(ws(id, "/messages-read-all")),
  removeMessage: (id, mid) => userApiClient.delete(ws(id, `/messages/${mid}`)),
  stats: (id, days = 30) => userApiClient.get(ws(id, "/stats"), { days }),
  posts: (id) => userApiClient.get(ws(id, "/posts")),
  addPost: (id, body) => userApiClient.post(ws(id, "/posts"), body),
  savePost: (id, pid, body) => userApiClient.put(ws(id, `/posts/${pid}`), body),
  removePost: (id, pid) => userApiClient.delete(ws(id, `/posts/${pid}`)),
  buyTheme: (id, key) => userApiClient.post(ws(id, `/themes/${key}`)),
  telegram: (id) => userApiClient.get(ws(id, "/telegram")),
  telegramLink: (id) => userApiClient.post(ws(id, "/telegram/link")),
  telegramTest: (id) => userApiClient.post(ws(id, "/telegram/test")),
  telegramOff: (id) => userApiClient.delete(ws(id, "/telegram")),
};
export const websitePublic = {
  get: (slug) => publicGet(`/website/${encodeURIComponent(slug)}`),
  hit: (slug, page, ref = "") => publicPost(`/website/${encodeURIComponent(slug)}/hit`, { page, ref }).catch(() => {}),
  message: (slug, body) => publicPost(`/website/${encodeURIComponent(slug)}/message`, body),
  posts: (slug, page = 1) => publicGet(`/website/${encodeURIComponent(slug)}/posts?page=${page}`),
  post: (slug, post) => publicGet(`/website/${encodeURIComponent(slug)}/posts/${encodeURIComponent(post)}`),
};

// ================= Debt Book (owner + the customer's statement) =================
const db = (id, p = "") => `/businesses/${id}/debt${p}`;
export function debtApi({ id }) {
  const get = (p, params) => userApiClient.get(db(id, p), params);
  const post = (p, body) => userApiClient.post(db(id, p), body);
  const put = (p, body) => userApiClient.put(db(id, p), body);
  const del = (p) => userApiClient.delete(db(id, p));
  const photo = (p, file) => {
    const fd = new FormData();
    fd.append("photo", file);
    return post(p, fd);
  };
  return {
    get: () => get(""),
    customers: (params) => get("/customers", params),
    addCustomer: (body) => post("/customers", body),
    customer: (cid, page = 1) => get(`/customers/${cid}`, { page }),
    saveCustomer: (cid, body) => put(`/customers/${cid}`, body),
    removeCustomer: (cid) => del(`/customers/${cid}`),
    restoreCustomer: (cid) => post(`/customers/${cid}/restore`),
    newLink: (cid) => post(`/customers/${cid}/new-link`),
    customerPhoto: (cid, file) => photo(`/customers/${cid}/photo`, file),
    removeCustomerPhoto: (cid) => del(`/customers/${cid}/photo`),
    addEntry: (cid, body) => post(`/customers/${cid}/entries`, body),
    voidEntry: (eid, reason) => post(`/entries/${eid}/void`, { reason }),
    restoreEntry: (eid) => post(`/entries/${eid}/restore`),
    saveEntry: (eid, body) => put(`/entries/${eid}`, body),
    reminded: (cid) => post(`/customers/${cid}/reminded`),
    remindNow: (cid, lang) => post(`/customers/${cid}/remind`, { lang }),
    history: (params) => get("/history", params),
    save: (body) => put("/settings", body),
    logo: (file) => photo("/logo", file),
    removeLogo: () => del("/logo"),
    exportAll: () => get("/export"),
    importRows: (rows) => post("/import", { rows }),
    telegramLink: () => post("/telegram/link"),
    telegramTest: () => post("/telegram/test"),
    telegramSave: (body) => put("/telegram", body),
    telegramOff: () => del("/telegram"),
  };
}
// Digital Note (owner): notes, sharing, files, replies, seen by, history
const nb = (id, p = "") => `/businesses/${id}/note${p}`;
export function noteApi({ id }) {
  const get = (p, params) => userApiClient.get(nb(id, p), params);
  const post = (p, body) => userApiClient.post(nb(id, p), body);
  const put = (p, body) => userApiClient.put(nb(id, p), body);
  const del = (p) => userApiClient.delete(nb(id, p));
  return {
    get: () => get(""),
    notes: (params) => get("/notes", params),
    create: (body) => post("/notes", body),
    note: (nid) => get(`/notes/${nid}`),
    save: (nid, body) => put(`/notes/${nid}`, body),
    remove: (nid) => del(`/notes/${nid}`),
    restore: (nid) => post(`/notes/${nid}/restore`),
    forever: (nid) => del(`/notes/${nid}/forever`),
    duplicate: (nid) => post(`/notes/${nid}/duplicate`),
    share: (nid, body) => put(`/notes/${nid}/share`, body),
    newLink: (nid) => post(`/notes/${nid}/share/new-link`),
    uploadSign: () => get("/upload-sign"),
    addFile: (nid, body) => post(`/notes/${nid}/files`, body),
    addFileDirect: (nid, file) => {
      const fd = new FormData();
      fd.append("file", file, file.name || "file");
      return post(`/notes/${nid}/files/direct`, fd);
    },
    removeFile: (nid, fid) => del(`/notes/${nid}/files/${fid}`),
    entries: (nid, page = 1) => get(`/notes/${nid}/entries`, { page }),
    reply: (nid, text) => post(`/notes/${nid}/entries`, { text }),
    setEntry: (eid, body) => put(`/entries/${eid}`, body),
    removeEntry: (eid) => del(`/entries/${eid}`),
    seen: (nid) => get(`/notes/${nid}/seen`),
    history: (nid) => get(`/notes/${nid}/history`),
    historyOne: (nid, rid) => get(`/notes/${nid}/history/${rid}`),
    restoreVersion: (nid, rid) => post(`/notes/${nid}/history/${rid}/restore`),
    settings: (body) => put("/settings", body),
    // add-ons: +5 GB storage packs (yearly slots), the signature pad (forever)
    buyStorage: (qty, key) => post("/storage", { qty, ...(key ? { key } : {}) }),
    renewStorage: (item, expect) => post("/storage", { item, expect: expect ?? null }),
    addSign: (nid, body) => post(`/notes/${nid}/files`, { ...body, sign: true }),
    // groups (each one is paid once when it is made)
    groups: (params) => get("/groups", params),
    groupFiles: (gid, params) => get(`/groups/${gid}/files`, params),
    createGroup: (body) => post("/groups", body),
    saveGroup: (gid, body) => put(`/groups/${gid}`, body),
    groupAdd: (gid, note_id) => post(`/groups/${gid}/notes`, { note_id }),
    groupDrop: (gid, nid) => del(`/groups/${gid}/notes/${nid}`),
    groupShare: (gid, body) => put(`/groups/${gid}/share`, body),
    groupNewLink: (gid) => post(`/groups/${gid}/share/new-link`),
    removeGroup: (gid) => del(`/groups/${gid}`),
    restoreGroup: (gid) => post(`/groups/${gid}/restore`),
    groupSeen: (gid) => get(`/groups/${gid}/seen`),
    // v3: business profile (name = myBusinessService.update), group pictures, downloads, media manager, page themes
    logo: (file) => {
      const fd = new FormData();
      fd.append("file", file, file.name || "logo.png");
      return post("/logo", fd);
    },
    removeLogo: () => del("/logo"),
    groupIcon: (gid, file) => {
      const fd = new FormData();
      fd.append("file", file, file.name || "icon.png");
      return post(`/groups/${gid}/icon`, fd);
    },
    removeGroupIcon: (gid) => del(`/groups/${gid}/icon`),
    fileUrl: (nid, fid, inline = false) => get(`/notes/${nid}/files/${fid}/download`, inline ? { inline: 1 } : undefined),
    entryFileUrl: (eid, fid, inline = false) => get(`/entries/${eid}/files/${fid}/download`, inline ? { inline: 1 } : undefined),
    unlockGroupIcon: (gid) => post(`/groups/${gid}/icon/unlock`),
    media: (params) => get("/media", params),
    removeMedia: (items) => userApiClient.delete(nb(id, "/media"), { items }),
    unlockTheme: (key) => post("/themes/unlock", { key }),
    // custom links (note_link): is /n/<slug> free? → { slug, ok, reason, dropped, suggestions, owned }
    linkCheck: (slug, kind, rid) => get(`/link-check?slug=${encodeURIComponent(slug)}&kind=${kind}&id=${rid || ""}`),
    unlockLink: () => post("/link/unlock"),
    // v4: Telegram alerts · "I've read it" · sign-up form export · names · voice · my templates · PDF · views per day
    telegramLink: () => post("/telegram/link"),
    telegramTest: () => post("/telegram/test"),
    telegramSave: (body) => put("/telegram", body),
    telegramOff: () => del("/telegram"),
    acks: (nid) => get(`/notes/${nid}/acks`),
    exportRows: (nid, format = "xlsx") => get(`/notes/${nid}/entries/export`, { format }),
    // the full CSV from the server (every row, not only the ones loaded on screen; cells safe for Excel)
    exportCsv: (nid, filename) => userApiClient.download(nb(id, `/notes/${nid}/entries/export`), { format: "csv" }, filename),
    acksCsv: (nid, filename) => userApiClient.download(nb(id, `/notes/${nid}/acks`), { format: "csv" }, filename),
    people: () => get("/people"),
    addVoice: (nid, body) => post(`/notes/${nid}/files`, { ...body, voice: true }),
    templates: () => get("/templates"),
    saveTemplate: (body) => post("/templates", body),
    renameTemplate: (tid, name) => put(`/templates/${tid}`, { name }),
    removeTemplate: (tid) => del(`/templates/${tid}`),
    print: (nid) => get(`/notes/${nid}/print`),
    stats: (nid, days = 30) => get(`/notes/${nid}/stats`, { days }),
    groupStats: (gid, days = 30) => get(`/groups/${gid}/stats`, { days }),
  };
}
// Digital Note (public /n/<token>): the PIN + the guest key go in headers
async function notePublicCall(token, path, o = {}) {
  return notePublicFetch(`/note/${encodeURIComponent(token)}${path}`, o);
}
async function notePublicFetch(url, { method = "GET", body, pin, guest } = {}) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {};
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";
  if (pin) headers["x-note-pin"] = pin;
  if (guest) headers["x-note-guest"] = guest;
  let res;
  try {
    res = await fetch(`${PUBLIC_API_BASE}${url}`, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) });
  } catch {
    const error = new Error("network");
    error.code = "NETWORK";
    throw error;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const error = new Error(json.message || `Request failed (${res.status})`);
    error.status = res.status;
    error.code = json.code;
    error.response = json;
    throw error;
  }
  return json;
}
export const notePublic = {
  get: (token, o, poll = false) => notePublicCall(token, poll ? "?poll=1" : "", o),
  seen: (token, name, o) => notePublicCall(token, "/seen", { ...o, method: "POST", body: { name } }),
  save: (token, body, o) => notePublicCall(token, "", { ...o, method: "PUT", body }),
  addEntry: (token, body, o) => notePublicCall(token, "/entries", { ...o, method: "POST", body: entryForm(body) }),
  saveEntry: (token, eid, body, o) => notePublicCall(token, `/entries/${eid}`, { ...o, method: "PUT", body }),
  removeEntry: (token, eid, o) => notePublicCall(token, `/entries/${eid}`, { ...o, method: "DELETE" }),
  fileUrl: (token, fid, o, inline = false) => notePublicCall(token, `/files/${fid}/download${inline ? "?inline=1" : ""}`, o),
  entryFileUrl: (token, eid, fid, o, inline = false) => notePublicCall(token, `/entries/${eid}/files/${fid}/download${inline ? "?inline=1" : ""}`, o),
  ack: (token, name, o) => notePublicCall(token, "/ack", { ...o, method: "POST", body: { name } }),
};
// a reply / sign-up row: text, name, files + signature PNGs (field "sign", needs the owner's "Signature & pen")
// + the sign-up form's answers ("fields", JSON) + one voice clip ("voice", needs the owner's "Voice notes")
function entryForm({ text, name, files = [], signs = [], fields, voice }) {
  const fd = new FormData();
  fd.append("text", text || "");
  fd.append("name", name || "");
  for (const f of files) fd.append("files", f, f.name || "file");
  for (const f of signs) fd.append("sign", f, f.name || "signature.png");
  if (fields && Object.keys(fields).length) fd.append("fields", JSON.stringify(fields));
  if (voice) fd.append("voice", voice, voice.name || "voice.webm");
  return fd;
}
// a group of notes sent with one link (/n/g/<token>): the group's PIN + level cover every note in it
const ng = (token, p = "") => `/note-group/${encodeURIComponent(token)}${p}`;
export const noteGroupPublic = {
  get: (token, o, poll = false) => notePublicFetch(ng(token, poll ? "?poll=1" : ""), o),
  // "All files": every file in the group's notes · params { q, kind, sort, page }
  files: (token, params = {}, o) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")).toString();
    return notePublicFetch(ng(token, `/files${qs ? `?${qs}` : ""}`), o);
  },
  seen: (token, name, o) => notePublicFetch(ng(token, "/seen"), { ...o, method: "POST", body: { name } }),
  note: (token, nid, o, poll = false) => notePublicFetch(ng(token, `/notes/${nid}${poll ? "?poll=1" : ""}`), o),
  noteSeen: (token, nid, name, o) => notePublicFetch(ng(token, `/notes/${nid}/seen`), { ...o, method: "POST", body: { name } }),
  save: (token, nid, body, o) => notePublicFetch(ng(token, `/notes/${nid}`), { ...o, method: "PUT", body }),
  addEntry: (token, nid, body, o) => notePublicFetch(ng(token, `/notes/${nid}/entries`), { ...o, method: "POST", body: entryForm(body) }),
  saveEntry: (token, nid, eid, body, o) => notePublicFetch(ng(token, `/notes/${nid}/entries/${eid}`), { ...o, method: "PUT", body }),
  removeEntry: (token, nid, eid, o) => notePublicFetch(ng(token, `/notes/${nid}/entries/${eid}`), { ...o, method: "DELETE" }),
  fileUrl: (token, nid, fid, o, inline = false) => notePublicFetch(ng(token, `/notes/${nid}/files/${fid}/download${inline ? "?inline=1" : ""}`), o),
  entryFileUrl: (token, nid, eid, fid, o, inline = false) => notePublicFetch(ng(token, `/notes/${nid}/entries/${eid}/files/${fid}/download${inline ? "?inline=1" : ""}`), o),
  ack: (token, nid, name, o) => notePublicFetch(ng(token, `/notes/${nid}/ack`), { ...o, method: "POST", body: { name } }),
};
export const debtPublic = { statement: (token) => publicGet(`/debt/${encodeURIComponent(token)}`) };

// ================= Loyalty Stamp Card (owner, customers' pages, the staff desk) =================
const sc = (id, p = "") => `/businesses/${id}/stamps${p}`;
export function stampApi({ id }) {
  const get = (p, params) => userApiClient.get(sc(id, p), params);
  const post = (p, body) => userApiClient.post(sc(id, p), body);
  const put = (p, body) => userApiClient.put(sc(id, p), body);
  const del = (p) => userApiClient.delete(sc(id, p));
  return {
    get: () => get(""),
    members: (params) => get("/members", params),
    addMember: (body) => post("/members", body),
    member: (mid, page = 1) => get(`/members/${mid}`, { page }),
    saveMember: (mid, body) => put(`/members/${mid}`, body),
    removeMember: (mid) => del(`/members/${mid}`),
    restoreMember: (mid) => post(`/members/${mid}/restore`),
    newLink: (mid) => post(`/members/${mid}/new-link`),
    stamp: (mid, n = 1, force = false) => post(`/members/${mid}/stamp`, { n, force }),
    reward: (mid, at) => post(`/members/${mid}/reward`, { at }),
    adjust: (mid, n, note) => post(`/members/${mid}/adjust`, { n, note }),
    lookup: (code) => post("/lookup", { code }),
    history: (params) => get("/history", params),
    stats: (days) => get("/stats", { days }),
    save: (body) => put("/settings", body),
    logo: (file) => {
      const fd = new FormData();
      fd.append("logo", file);
      return post("/logo", fd);
    },
    removeLogo: () => del("/logo"),
    buyTheme: (key) => post(`/themes/${key}`),
    buyPoster: (key) => post(`/posters/${key}`),
    reset: (mid) => post(`/members/${mid}/reset`),
    resetAll: (note) => post("/reset-all", { confirm: "RESET", note }),
    desk: (body) => put("/desk", body),
    telegramLink: () => post("/telegram/link"),
    telegramTest: () => post("/telegram/test"),
    telegramSave: (body) => put("/telegram", body),
    telegramOff: () => del("/telegram"),
  };
}
export const stampPublic = {
  shop: (slug) => publicGet(`/stamp/shop/${encodeURIComponent(slug)}`),
  join: (slug, body) => publicPost(`/stamp/shop/${encodeURIComponent(slug)}/join`, body),
  find: (slug, body) => publicPost(`/stamp/shop/${encodeURIComponent(slug)}/find`, typeof body === "string" ? { phone: body } : body),
  card: (token) => publicGet(`/stamp/card/${encodeURIComponent(token)}`),
};
// the staff desk: its own login (PIN) → x-desk-token
export function stampDesk(slug, token, staffName = "") {
  const call = async (method, path, body) => {
    let res;
    try {
      res = await fetch(`${PUBLIC_API_BASE}/stamp/desk/${encodeURIComponent(slug)}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { "x-desk-token": token } : {}), ...(staffName ? { "x-desk-name": encodeURIComponent(staffName).slice(0, 120) } : {}) },
        body: method === "GET" ? undefined : JSON.stringify(body || {}),
      });
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
  };
  return {
    login: (pin) => call("POST", "/login", { pin }),
    get: () => call("GET", ""),
    lookup: (code) => call("POST", "/lookup", { code }),
    addMember: (body) => call("POST", "/members", body),
    stamp: (mid, n = 1) => call("POST", `/members/${mid}/stamp`, { n }),
    reward: (mid, at) => call("POST", `/members/${mid}/reward`, { at }),
    reset: (mid) => call("POST", `/members/${mid}/reset`),
    // read only lists (same as the owner's)
    members: (params = {}) => call("GET", `/members?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null)).toString()}`),
    history: (params = {}) => call("GET", `/history?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null)).toString()}`),
    stats: (days) => call("GET", `/stats?days=${days}`),
  };
}

// ================= Event Tickets (owner, public event pages) =================
const evp = (id, p = "") => `/businesses/${id}/events${p}`;
const evFile = (file, extra) => {
  const fd = new FormData();
  fd.append("file", file);
  for (const [k, v] of Object.entries(extra || {})) if (v !== undefined && v !== null) fd.append(k, v);
  return fd;
};
export function eventApi({ id }) {
  const get = (p, params) => userApiClient.get(evp(id, p), params);
  const post = (p, body) => userApiClient.post(evp(id, p), body);
  const put = (p, body) => userApiClient.put(evp(id, p), body);
  const del = (p) => userApiClient.delete(evp(id, p));
  return {
    get: () => get(""),
    save: (body) => put("/settings", body),
    payQr: (file) => post("/pay-qr", evFile(file)),
    removePayQr: () => del("/pay-qr"),
    logo: (file) => post("/logo", evFile(file)),
    removeLogo: () => del("/logo"),
    events: () => get("/events"),
    event: (eid) => get(`/events/${eid}`),
    addEvent: (body) => post("/events", body),
    saveEvent: (eid, body) => put(`/events/${eid}`, body),
    removeEvent: (eid) => del(`/events/${eid}`),
    poster: (eid, file) => post(`/events/${eid}/poster`, evFile(file)),
    removePoster: (eid) => del(`/events/${eid}/poster`),
    orders: (params) => get("/orders", params),
    approve: (oid) => post(`/orders/${oid}/approve`),
    reject: (oid, reason) => post(`/orders/${oid}/reject`, { reason }),
    cancelOrder: (oid, reason) => post(`/orders/${oid}/cancel`, { reason }),
    tickets: (eid, params) => get(`/events/${eid}/tickets`, params),
    checkin: (tid) => post(`/tickets/${tid}/checkin`),
    undo: (tid) => post(`/tickets/${tid}/undo`),
    cancelTicket: (tid) => post(`/tickets/${tid}/cancel`),
    invite: (eid, body) => post(`/events/${eid}/invites`, body),
    report: (eid) => get(`/events/${eid}/report`),
    exportCsv: (eid, name) => userApiClient.download(evp(id, `/events/${eid}/export`), {}, `${name || "guests"}.csv`),
    team: () => get("/team"),
    addMember: (body) => post("/team", body),
    saveMember: (mid, body) => put(`/team/${mid}`, body),
    removeMember: (mid) => del(`/team/${mid}`),
    pairCode: () => post("/pair-code"),
    removeDevice: (did) => del(`/devices/${did}`),
    buyTheme: (key, eventId) => post(`/themes/${key}`, { event_id: eventId || undefined }),
    buyPageTheme: (key, eventId) => post(`/page-themes/${key}`, { event_id: eventId || undefined }),
    duplicate: (eid, body) => post(`/events/${eid}/duplicate`, body || {}),
    feature: (eid) => post(`/events/${eid}/feature`, {}),
    listing: (listed) => put("/listing", { listed }),
    searchEvents: (params) => get("/event-search", params),
    overview: (months) => get("/report/overview", { months }),
    waitlist: (eid) => get(`/events/${eid}/waitlist`),
    waitNotify: (eid, n) => post(`/events/${eid}/waitlist/notify`, { n }),
    waitRemove: (wid) => del(`/waitlist/${wid}`),
    refs: () => get("/refs"),
    addRef: (b) => post("/refs", b),
    saveRef: (rid, b) => put(`/refs/${rid}`, b),
    payRef: (rid, amount) => post(`/refs/${rid}/payout`, { amount }),
    removeRef: (rid) => del(`/refs/${rid}`),
    requests: (status) => get("/requests", { status }),
    decide: (oid, rid, b) => post(`/orders/${oid}/requests/${rid}`, b),
    transfer: (tid, b) => post(`/tickets/${tid}/transfer`, b),
    feedback: (eid) => get(`/events/${eid}/feedback`),
    feedbackSend: (eid) => post(`/events/${eid}/feedback/send`, {}),
    addSponsor: (eid, file, b) => post(`/events/${eid}/sponsors`, evFile(file, b)),
    saveSponsor: (eid, key, b) => put(`/events/${eid}/sponsors/${key}`, b),
    removeSponsor: (eid, key) => del(`/events/${eid}/sponsors/${key}`),
    buyCertTheme: (key, eventId) => post(`/cert-themes/${key}`, { event_id: eventId || undefined }),
    certSignature: (eid, file) => post(`/events/${eid}/cert-signature`, evFile(file)),
    removeCertSignature: (eid) => del(`/events/${eid}/cert-signature`),
    seats: (eid, show) => get(`/events/${eid}/seats`, show ? { show } : {}),
    addPayMethod: (body) => post("/pay-methods", body),
    savePayMethod: (key, body) => put(`/pay-methods/${key}`, body),
    removePayMethod: (key) => del(`/pay-methods/${key}`),
    payMethodQr: (key, file) => post(`/pay-methods/${key}/qr`, evFile(file)),
    removePayMethodQr: (key) => del(`/pay-methods/${key}/qr`),
    telegramGuests: (eid) => get(`/events/${eid}/telegram-guests`),
    attendance: (eid) => get(`/events/${eid}/attendance`),
    sendCerts: (eid) => post(`/events/${eid}/certs/send`, {}),
    promos: () => get("/promos"),
    addPromo: (body) => post("/promos", body),
    savePromo: (pid, body) => put(`/promos/${pid}`, body),
    removePromo: (pid) => del(`/promos/${pid}`),
    addUpdate: (eid, body) => post(`/events/${eid}/updates`, body),
    removeUpdate: (eid, uid) => del(`/events/${eid}/updates/${uid}`),
    addDoc: (eid, file, name) => {
      const fd = evFile(file);
      if (name) fd.append("name", name);
      return post(`/events/${eid}/docs`, fd);
    },
    removeDoc: (eid, key) => del(`/events/${eid}/docs/${key}`),
    sendDoc: (eid, key) => post(`/events/${eid}/docs/${key}/send`),
    telegram: () => get("/telegram"),
    linkTelegram: () => post("/telegram/link"),
    saveTelegram: (body) => put("/telegram", body),
    testTelegram: () => post("/telegram/test"),
    removeTelegram: () => del("/telegram"),
  };
}
export const evPublic = {
  event: (slug) => publicGet(`/ev/e/${encodeURIComponent(slug)}`),
  order: (slug, body) => publicPost(`/ev/e/${encodeURIComponent(slug)}/order`, body),
  view: (token) => publicGet(`/ev/o/${encodeURIComponent(token)}`),
  check: (token) => publicPost(`/ev/o/${encodeURIComponent(token)}/check`, {}),
  waitlist: (slug, body) => publicPost(`/ev/e/${encodeURIComponent(slug)}/waitlist`, body),
  waitStatus: (tok) => publicGet(`/ev/w/${encodeURIComponent(tok)}`),
  refClick: (slug, code) => publicPost(`/ev/e/${encodeURIComponent(slug)}/ref`, { code }),
  request: (token, body) => publicPost(`/ev/o/${encodeURIComponent(token)}/request`, body),
  my: (tokens) => publicPost("/ev/my", { tokens }),
  feedback: (token) => publicGet(`/ev/f/${encodeURIComponent(token)}`),
  sendFeedback: (token, body) => publicPost(`/ev/f/${encodeURIComponent(token)}`, body),
  discover: (params) => publicGet(`/ev/discover?${new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v !== "" && v != null))}`),
  cert: (code) => publicGet(`/ev/c/${encodeURIComponent(code)}`),
  ticket: (code) => publicGet(`/ev/t/${encodeURIComponent(code)}`),
  seats: (slug, show) => publicGet(`/ev/e/${encodeURIComponent(slug)}/seats${show ? `?show=${encodeURIComponent(show)}` : ""}`),
  promo: (slug, body) => publicPost(`/ev/e/${encodeURIComponent(slug)}/promo`, body),
  proof: async (token, file, reference, payKey) => {
    const fd = new FormData();
    fd.append("file", file);
    if (reference) fd.append("reference", reference);
    if (payKey) fd.append("pay_key", payKey);
    let res;
    try {
      res = await fetch(`${PUBLIC_API_BASE}/ev/o/${encodeURIComponent(token)}/proof`, { method: "POST", body: fd });
    } catch {
      throw Object.assign(new Error("network"), { code: "NETWORK" });
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw Object.assign(new Error(json.message || `Request failed (${res.status})`), { status: res.status, body: json });
    return json;
  },
};

// ---------------------------------------------------------------- Telegram Store (v2.0)
const ts = (id, p = "") => `/businesses/${id}/tgstore${p}`;
export function tgStoreApi({ id }) {
  const get = (p, params) => userApiClient.get(ts(id, p), params);
  const post = (p, body) => userApiClient.post(ts(id, p), body);
  const put = (p, body) => userApiClient.put(ts(id, p), body);
  const del = (p) => userApiClient.delete(ts(id, p));
  const image = (p, field, file) => {
    const fd = new FormData();
    fd.append(field, file);
    return post(p, fd);
  };
  return {
    get: () => get(""),
    save: (body) => put("/settings", body),
    logo: (file) => image("/logo", "logo", file),
    removeLogo: () => del("/logo"),
    categories: () => get("/categories"),
    addCategory: (body) => post("/categories", body),
    saveCategory: (cid, body) => put(`/categories/${cid}`, body),
    removeCategory: (cid) => del(`/categories/${cid}`),
    orderCategories: (ids) => put("/categories-order", { ids }),
    products: () => get("/products"),
    addProduct: (body) => post("/products", body),
    saveProduct: (pid, body) => put(`/products/${pid}`, body),
    removeProduct: (pid) => del(`/products/${pid}`),
    productPhoto: (pid, file) => image(`/products/${pid}/photo`, "photo", file),
    removeProductPhoto: (pid) => del(`/products/${pid}/photo`),
    orders: (params) => get("/orders", params),
    order: (oid) => get(`/orders/${oid}`),
    move: (oid, status, extra = {}) => post(`/orders/${oid}/status`, { status, ...extra }),
    paid: (oid) => post(`/orders/${oid}/paid`),
    customers: (params) => get("/customers", params),
    tgLink: () => post("/telegram/link"),
    tgTest: () => post("/telegram/test"),
    tgOff: () => del("/telegram"),
    // add-ons
    promos: () => get("/promos"),
    addPromo: (body) => post("/promos", body),
    savePromo: (pid, body) => put(`/promos/${pid}`, body),
    removePromo: (pid) => del(`/promos/${pid}`),
    broadcasts: () => get("/broadcasts"),
    broadcast: (text) => post("/broadcasts", { text }),
    report: (days) => get("/report", { days }),
    reportOrders: (days) => get("/report/orders", { days }),
    customer: (cid) => get(`/customers/${cid}`),
    saveCustomer: (cid, body) => put(`/customers/${cid}`, body),
    addPay: (body) => post("/pay-methods", body),
    savePay: (mid, body) => put(`/pay-methods/${mid}`, body),
    removePay: (mid) => del(`/pay-methods/${mid}`),
    payImage: (mid, file) => image(`/pay-methods/${mid}/image`, "image", file),
    removePayImage: (mid) => del(`/pay-methods/${mid}/image`),
    useTheme: (key) => post(`/themes/${key}`),
    setLink: (slug) => put("/link", { slug }),
  };
}
// the customer's side: inside Telegram every call carries the signed Telegram data (who is ordering)
const tgInit = () => (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) || "";
async function tgCall(path, { method = "GET", body } = {}) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {};
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";
  if (tgInit()) headers["x-tg-init-data"] = tgInit();
  let res;
  try {
    res = await fetch(`${PUBLIC_API_BASE}/tgstore${path}`, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body), cache: "no-store" });
  } catch {
    throw Object.assign(new Error("network"), { code: "NETWORK" });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw Object.assign(new Error(json.message || `Request failed (${res.status})`), { status: res.status, body: json });
  return json;
}
export const tgStorePublic = {
  store: (slug, theme) => tgCall(`/${encodeURIComponent(slug)}${theme ? `?theme=${encodeURIComponent(theme)}` : ""}`),
  me: (slug) => tgCall(`/${encodeURIComponent(slug)}/me`),
  order: (slug, body) => tgCall(`/${encodeURIComponent(slug)}/orders`, { method: "POST", body }),
  promo: (slug, code, subtotal) => tgCall(`/${encodeURIComponent(slug)}/promo`, { method: "POST", body: { code, subtotal } }),
  follow: (token) => tgCall(`/order/${encodeURIComponent(token)}`),
  proof: (token, file) => {
    const fd = new FormData();
    fd.append("photo", file);
    return tgCall(`/order/${encodeURIComponent(token)}/proof`, { method: "POST", body: fd });
  },
};
