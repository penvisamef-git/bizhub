import { martPosApi, session } from "./martApi";
import { saleMoney } from "./calc";
import { applyPromos } from "./promo";

// Offline for the Mini Mart POS:
// - products, settings and cashier PIN checks are kept on the device (and today's sales, so the day total adds up)
// - with no internet a sale is saved here and queued; it gets its real receipt number when the internet is back
// - each sale carries a client_id, so sending it twice adds nothing
const CACHE_KEY = "bizhub_mart_cache";
const QUEUE_KEY = "bizhub_mart_queue";
const SESSIONS_KEY = "bizhub_mart_sessions"; // staffId → session (to send the queue later)

const read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* full or blocked */
  }
};
let cache = read(CACHE_KEY, null); // { boot, staff, sales, at, offline_staff, idmap }
let queue = read(QUEUE_KEY, []);
let online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
let syncing = false;
let failed = [];
let held = false; // the server refuses for now (license ended…): keep the queue
const subs = new Set();
export const status = () => ({ online, pending: queue.length, syncing, at: cache?.at || null, failed, held });
const emit = () => subs.forEach((fn) => fn(status()));
export const subscribe = (fn) => {
  subs.add(fn);
  fn(status());
  return () => subs.delete(fn);
};
const saveCache = () => write(CACHE_KEY, cache);
const saveQueue = () => {
  write(QUEUE_KEY, queue);
  emit();
};
export const clearAll = () => {
  cache = null;
  queue = [];
  write(CACHE_KEY, null);
  write(QUEUE_KEY, []);
  emit();
};
export const hasCache = () => !!cache?.boot;
export const cachedBoot = () => cache?.boot || null;
export const pendingCount = () => queue.length;
let heldPin = "";
export const forgetOffline = () => {
  heldPin = "";
  if (cache?.offline_staff) {
    cache.offline_staff = null;
    saveCache();
  }
};
const setOnline = (v) => {
  if (online !== v) {
    online = v;
    emit();
  }
};
const isNet = (e) => e?.code === "network";
const needLogin = () => !!cache?.offline_staff && !session.get();
const uid = () => (crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, "").slice(0, 24);
const localDay = (t = Date.now()) => new Date(new Date(t).getTime() + 7 * 3600000).toISOString().slice(0, 10);
const bad = (message, code, extra = {}) => Object.assign(new Error(message), { status: 400, code, response: { code, message, ...extra } });
const who = () => cache?.offline_staff || cache?.boot?.staff || {};

const putSale = (s) => {
  if (!cache) return s;
  const list = (cache.sales || []).filter((x) => String(x._id) !== String(s._id) && !(s.client_id && x.client_id === s.client_id));
  cache.sales = [s, ...list].filter((x) => localDay(x.at) >= localDay(Date.now() - 86400000)).slice(0, 3000);
  saveCache();
  return s;
};
const r2 = (cur) => (v) => (cur === "KHR" ? Math.round(v) : Math.round(v * 100) / 100);
function totalsOf(rows, cur) {
  const r = r2(cur);
  const paid = rows.filter((x) => x.status === "paid");
  const by = {};
  for (const x of paid) by[x.method] = r((by[x.method] || 0) + x.total);
  const sales = r(paid.reduce((a, x) => a + x.total, 0));
  return { sales, count: paid.length, voids: rows.length - paid.length, avg: paid.length ? r(sales / paid.length) : 0, discount: 0, by_method: by };
}
const todayRows = (day) => (cache?.sales || []).filter((x) => localDay(x.at) === (day || localDay())).sort((a, b) => (a.at < b.at ? 1 : -1));
function reportLocal(day) {
  const cur = cache.boot.settings.currency;
  const r = r2(cur);
  const rows = todayRows(day);
  const paid = rows.filter((x) => x.status === "paid");
  const series = {};
  const top = new Map();
  const staff = {};
  for (const x of paid) {
    const h = new Date(new Date(x.at).getTime() + 7 * 3600000).toISOString().slice(11, 13);
    series[h] = series[h] || { key: h, sales: 0, count: 0 };
    series[h].sales = r(series[h].sales + x.total);
    series[h].count += 1;
    for (const l of x.items) {
      const k = l.product_id || `n:${l.name}`;
      const t = top.get(k) || { product_id: l.product_id, name: l.name, qty: 0, value: 0 };
      t.qty += l.qty;
      t.value = r(t.value + l.total);
      top.set(k, t);
    }
    const n = x.by || "-";
    staff[n] = staff[n] || { name: n, sales: 0, count: 0 };
    staff[n].sales = r(staff[n].sales + x.total);
    staff[n].count += 1;
  }
  return {
    kind: "day",
    currency: cur,
    totals: totalsOf(rows, cur),
    series: Object.values(series).sort((a, b) => (a.key < b.key ? -1 : 1)),
    top: [...top.values()].sort((a, b) => b.value - a.value).slice(0, 20),
    by_staff: Object.values(staff).sort((a, b) => b.sales - a.sales),
    offline: true,
  };
}

// stock control: the shelf count on this device follows offline sales until the server sends the real one
function moveStock(items, sign) {
  if (!cache?.boot?.stock) return;
  for (const l of items || []) {
    const p = cache.boot.products.find((x) => String(x._id) === String(l.product_id));
    if (p && p.stock !== undefined) p.stock = Math.round((p.stock + sign * l.qty) * 1000) / 1000;
  }
  cache.boot = { ...cache.boot, products: [...cache.boot.products] };
  saveCache();
  emit();
}

// ---------------- queue ----------------
const enqueue = (op) => {
  queue.push({ id: uid(), at: Date.now(), staff: who()._id || "", ...op });
  saveQueue();
};
export async function flush() {
  if (syncing || !queue.length) return;
  syncing = true;
  emit();
  const sessions = read(SESSIONS_KEY, {});
  try {
    while (queue.length) {
      const op = queue[0];
      const sess = sessions[op.staff] || session.get();
      if (!sess) break; // someone must log in with the internet on
      try {
        const api = martPosApi.withSession(sess);
        if (op.kind === "sale") {
          const r = await api.sell({ ...op.body, offline: true });
          if (cache) {
            cache.idmap = { ...(cache.idmap || {}), [op.sid]: r.data._id };
            cache.sales = (cache.sales || []).filter((x) => String(x._id) !== String(op.sid));
            putSale(r.data);
          }
        } else if (op.kind === "void") {
          const sid = cache?.idmap?.[op.sid] || op.sid;
          const r = await api.voidSale(null, sid, op.reason);
          if (r?.data) putSale(r.data);
        }
        held = false;
        setOnline(true);
      } catch (e) {
        if (isNet(e)) {
          setOnline(false);
          break;
        }
        if (e.status === 401) {
          delete sessions[op.staff];
          write(SESSIONS_KEY, sessions);
          if (session.get() && session.get() !== sess) continue;
          break;
        }
        if (e.status === 402 || e.status === 403) {
          // license ended / shop suspended: keep the sales on the device until it is fixed
          held = true;
          failed = [...failed.filter((f) => f.code !== "held"), { code: "held", message: e.message, at: Date.now() }].slice(-20);
          break;
        }
        failed = [...failed, { kind: op.kind, label: op.label || "", message: e.message, at: Date.now() }].slice(-20);
      }
      queue.shift();
      saveQueue();
    }
  } finally {
    syncing = false;
    emit();
  }
  if (!queue.length) await pull().catch(() => {});
}

// fresh copy from the server (products, settings, PIN checks, today's sales)
export async function pull() {
  const [boot, sync] = await Promise.all([martPosApi.boot(), martPosApi.sync()]);
  const waiting = (cache?.sales || []).filter((x) => x.pending);
  cache = { ...(cache || {}), boot: boot.data, staff: sync.data.staff, sales: [...waiting, ...sync.data.sales], at: Date.now(), offline_staff: null };
  saveCache();
  setOnline(true);
  emit();
}
export const rememberSession = (staffId, sess) => {
  const all = read(SESSIONS_KEY, {});
  all[staffId] = sess;
  write(SESSIONS_KEY, all);
};
export const dismissFailed = () => {
  failed = [];
  emit();
};

// PIN check with no internet (the PIN is never stored: sha256(salt:pin) is compared)
export async function offlineLogin(pin) {
  for (const s of cache?.staff || []) {
    const data = new TextEncoder().encode(`${s.pin_salt}:${pin}`);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hash === s.pin_check) {
      heldPin = pin;
      cache.offline_staff = { _id: s._id, name: s.name, role: s.role };
      cache.boot = { ...cache.boot, staff: { _id: s._id, name: s.name, role: s.role } };
      saveCache();
      return cache.offline_staff;
    }
  }
  return null;
}

const tryServer = async (fn, local) => {
  if (online && !queue.length && !needLogin()) {
    try {
      const r = await fn();
      setOnline(true);
      return r;
    } catch (e) {
      if (!isNet(e)) throw e;
      setOnline(false);
    }
  }
  if (!cache?.boot) throw Object.assign(new Error("network"), { code: "network" });
  return local();
};

// ---------------- the API the screens use (same names as martService) ----------------
// the member's points kept on this device follow each sale (used − earned), so the next lookup is right offline too
function memberPoints(sale) {
  if (!cache?.boot?.loyalty || !sale?.member_phone) return;
  const list = (cache.boot.members = cache.boot.members || []);
  let m = list.find((x) => x.phone === sale.member_phone);
  if (!m) {
    m = { _id: sale.member_id || "", phone: sale.member_phone, name: sale.member_name || "", points: 0 };
    list.unshift(m);
  }
  m.points = Math.max(0, (m.points || 0) - (sale.points_used || 0) + (sale.points_earned || 0));
  saveCache();
}

export const offlineApi = {
  // these need the internet
  sale: (_id, sid) => martPosApi.sale(null, sid),
  products: () => martPosApi.products(),
  categories: () => martPosApi.categories(),
  addProduct: (_id, d) => martPosApi.addProduct(null, d),
  saveProduct: (_id, pid, d) => martPosApi.saveProduct(null, pid, d),
  removeProduct: (_id, pid) => martPosApi.removeProduct(null, pid),
  productPhoto: (_id, pid, f) => martPosApi.productPhoto(null, pid, f),
  removeProductPhoto: (_id, pid) => martPosApi.removeProductPhoto(null, pid),
  addCategory: (_id, d) => martPosApi.addCategory(null, d),
  saveCategory: (_id, cid, d) => martPosApi.saveCategory(null, cid, d),
  removeCategory: (_id, cid) => martPosApi.removeCategory(null, cid),
  units: () =>
    tryServer(
      () => martPosApi.units(),
      () => ({ data: cache.boot.units || [] }),
    ),
  addUnit: (_id, d) => martPosApi.addUnit(null, d),
  saveUnit: (_id, uid, d) => martPosApi.saveUnit(null, uid, d),
  removeUnit: (_id, uid) => martPosApi.removeUnit(null, uid),
  orders: (_id, p) => martPosApi.orders(null, p),
  orderCount: () => martPosApi.orderCount(),
  customers: (_id, p) => martPosApi.customers(null, p),
  customer: (_id, cid) => martPosApi.customer(null, cid),
  orderStep: (_id, oid, step, d) => martPosApi.orderStep(null, oid, step, d),
  expiry: (...a) => martPosApi.expiry(...a),
  addExpiry: (...a) => martPosApi.addExpiry(...a),
  saveExpiry: (...a) => martPosApi.saveExpiry(...a),
  removeExpiry: (...a) => martPosApi.removeExpiry(...a),
  wasteBatch: (...a) => martPosApi.wasteBatch(...a),
  waste: (...a) => martPosApi.waste(...a),
  wasteList: (...a) => martPosApi.wasteList(...a),
  expiryDays: (...a) => martPosApi.expiryDays(...a),
  checkPromos: (...a) => martPosApi.checkPromos(...a),
  profit: (...a) => martPosApi.profit(...a),
  reorder: (...a) => martPosApi.reorder(...a),
  pos: (...a) => martPosApi.pos(...a),
  addPo: (...a) => martPosApi.addPo(...a),
  savePo: (...a) => martPosApi.savePo(...a),
  removePo: (...a) => martPosApi.removePo(...a),
  sendPo: (...a) => martPosApi.sendPo(...a),
  cancelPo: (...a) => martPosApi.cancelPo(...a),
  receivePo: (...a) => martPosApi.receivePo(...a),
  delivery: (...a) => martPosApi.delivery(...a),
  addDriver: (...a) => martPosApi.addDriver(...a),
  saveDriver: (...a) => martPosApi.saveDriver(...a),
  removeDriver: (...a) => martPosApi.removeDriver(...a),
  driverReport: (...a) => martPosApi.driverReport(...a),
  setDriver: (...a) => martPosApi.setDriver(...a),
  lookupMember: (_id, phone) =>
    tryServer(
      () => martPosApi.lookupMember(null, phone),
      () => {
        const k = String(phone || "").replace(/\D/g, "");
        const m = (cache.boot.members || []).find((x) => x.phone === k || x.phone === `0${k.replace(/^855/, "")}`);
        return { data: m || null, offline: true };
      },
    ),
  stock: (_id, p) => martPosApi.stock(null, p),
  stockIn: (_id, d) => martPosApi.stockIn(null, d),
  stockCount: (_id, d) => martPosApi.stockCount(null, d),
  stockMoves: (_id, p) => martPosApi.stockMoves(null, p),
  genBarcode: (_id, pid) => martPosApi.genBarcode(null, pid),
  debtors: (_id, qq) =>
    tryServer(
      () => martPosApi.debtors(null, qq),
      () => {
        const t = String(qq || "").toLowerCase();
        const rows = (cache.boot.debtors || []).filter((d) => !t || d.name.toLowerCase().includes(t) || (d.phone || "").includes(t));
        return { data: { rows, totals: { owed: rows.reduce((a, d) => a + Math.max(0, d.balance), 0), people: rows.filter((d) => d.balance > 0).length }, offline: true } };
      },
    ),
  debtor: (_id, did) => martPosApi.debtor(null, did),
  addDebtor: (_id, d) => martPosApi.addDebtor(null, d),
  saveDebtor: (_id, did, d) => martPosApi.saveDebtor(null, did, d),
  removeDebtor: (_id, did) => martPosApi.removeDebtor(null, did),
  debtorPay: (_id, did, d) => martPosApi.debtorPay(null, did, d),
  shifts: () => martPosApi.shifts(),
  openShift: (_id, d) => martPosApi.openShift(null, d),
  shiftCash: (_id, sid, d) => martPosApi.shiftCash(null, sid, d),
  closeShift: (_id, sid, d) => martPosApi.closeShift(null, sid, d),
  suppliers: () => martPosApi.suppliers(),
  boot: () =>
    tryServer(
      async () => {
        const r = await martPosApi.boot();
        if (cache) {
          cache.boot = r.data;
          saveCache();
        }
        return r;
      },
      () => ({ data: cache.boot, offline: true }),
    ),
  sales: (_id, params = {}) =>
    tryServer(
      () => martPosApi.sales(null, params),
      () => {
        const rows = todayRows(params.day);
        return { data: { rows, totals: totalsOf(rows, cache.boot.settings.currency), offline: true } };
      },
    ),
  report: (_id, params = {}) =>
    tryServer(
      () => martPosApi.report(null, params),
      () => ({ data: reportLocal(params.day) }),
    ),
  // a sale: online → the server gives the receipt number; offline → saved here, sent later
  sell: async (data) => {
    const body = { ...data, client_id: data.client_id || uid(), at: data.at || new Date().toISOString() };
    if (online && !queue.length && !needLogin()) {
      try {
        const r = await martPosApi.sell(body);
        putSale(r.data);
        moveStock(r.data.items, -1);
        memberPoints(r.data);
        setOnline(true);
        return r;
      } catch (e) {
        if (!isNet(e)) throw e;
        setOnline(false);
      }
    }
    if (!cache?.boot) throw Object.assign(new Error("network"), { code: "network" });
    const s = cache.boot.settings;
    // promotions + loyalty points, the same way the server will work them out
    const categoryOf = Object.fromEntries((cache.boot.products || []).map((x) => [x._id, x.category_id ? String(x.category_id) : ""]));
    const promo = (cache.boot.promos || []).length ? applyPromos({ lines: body.items, promos: cache.boot.promos, at: body.at, where: "pos", coupon: body.coupon || "", currency: s.currency, categoryOf }) : { discount: 0, applied: [], coupon: "" };
    const rules = cache.boot.loyalty;
    const phone = String(body.member_phone || "").replace(/\D/g, "");
    const member = rules && phone ? (cache.boot.members || []).find((x) => x.phone === phone) || null : null;
    let used = 0;
    if (member && body.redeem > 0) {
      used = Math.min(Math.floor(body.redeem), Math.floor(member.points || 0));
      if (used < rules.min_redeem) used = 0;
    }
    const money = saleMoney({
      lines: body.items,
      discount: body.discount,
      promo: promo.discount,
      points: used * (rules?.point_value || 0),
      currency: s.currency,
      rate: s.khr_rate,
      method: body.method,
      paid_usd: body.paid_usd,
      paid_khr: body.paid_khr,
      khr_round: s.khr_round || 100,
    });
    if (money.short > 0) throw bad("Short", "short", { short: money.short });
    const id = `local-${body.client_id}`;
    const sale = {
      _id: id,
      client_id: body.client_id,
      no: `OFF-${body.client_id.slice(0, 5).toUpperCase()}`,
      items: money.items,
      subtotal: money.subtotal,
      discount: money.discount,
      promo_discount: money.promo_discount,
      promos: promo.applied.map((x) => ({ id: x.id, name: x.name, amount: x.amount })),
      coupon: promo.coupon === "ok" ? body.coupon : "",
      member_phone: rules && phone ? phone : "",
      member_name: member ? member.name : body.member_name || "",
      points_used: money.points_value > 0 ? used : 0,
      points_value: money.points_value,
      points_earned: rules && phone ? Math.floor(money.total / (rules.earn_per || 1) + 1e-9) : 0,
      total: money.total,
      currency: s.currency,
      khr_rate: s.khr_rate,
      method: body.method,
      paid_usd: body.method === "cash" ? Number(body.paid_usd) || 0 : 0,
      paid_khr: body.method === "cash" ? Number(body.paid_khr) || 0 : 0,
      change: money.change,
      change_khr: money.change_khr,
      status: "paid",
      at: body.at,
      by: who().name || "",
      offline: true,
      pending: true,
    };
    if (body.method === "debt") {
      const d = (cache.boot.debtors || []).find((x) => String(x._id) === String(body.debtor_id));
      sale.debtor_name = d ? d.name : body.new_debtor?.name || "";
      if (d) d.balance = Math.round((d.balance + sale.total) * 100) / 100;
    }
    enqueue({ kind: "sale", sid: id, body, label: sale.no });
    putSale(sale);
    moveStock(sale.items, -1);
    memberPoints(sale);
    return { data: sale, offline: true };
  },
  voidSale: async (_id, sid, reason) => {
    const local = String(sid).startsWith("local-");
    if (!local && online && !queue.length && !needLogin()) {
      try {
        const was = (cache?.sales || []).find((x) => String(x._id) === String(sid));
        const r = await martPosApi.voidSale(null, sid, reason);
        if (was?.status === "paid" && !r.already) moveStock(r.data.items, 1);
        putSale(r.data);
        return r;
      } catch (e) {
        if (!isNet(e)) throw e;
        setOnline(false);
      }
    }
    if (who().role === "cashier") throw Object.assign(new Error("Manager only"), { status: 403, code: "manager_only" });
    const s = (cache?.sales || []).find((x) => String(x._id) === String(sid));
    if (!s) throw bad("Not found", "not_found");
    enqueue({ kind: "void", sid, reason, label: s.no });
    if (s.status === "paid") moveStock(s.items, 1);
    return { data: putSale({ ...s, status: "void", void_by: who().name || "", void_reason: reason || "", pending: true }), offline: true };
  },
};

// keep trying: every 20 s, and as soon as the browser says it is online again
let timer = null;
export function startSync() {
  if (timer) return;
  const tick = async () => {
    if (needLogin() && heldPin) {
      try {
        const r = await martPosApi.login(heldPin);
        session.set(r.data.session);
        rememberSession(r.data.staff._id, r.data.session);
        cache.offline_staff = null;
        saveCache();
        setOnline(true);
      } catch (e) {
        if (isNet(e)) return setOnline(false);
        heldPin = "";
      }
    }
    if (queue.length) await flush().catch(() => {});
    else if (!cache?.at || Date.now() - cache.at > 60000 || !online)
      await pull().catch((e) => {
        if (isNet(e)) setOnline(false);
      });
  };
  window.addEventListener("online", tick);
  window.addEventListener("offline", () => setOnline(false));
  timer = setInterval(tick, 20000);
  tick();
}
