// The POS engine: keeps setup, orders and shifts on this device (IndexedDB) and syncs them with the cloud.
// Every change is saved on the device first, then sent in the background — selling never waits for the internet.
//   sync_mode "instant": send right away + check for other devices' changes every few seconds
//   "5" / "15" / "30": every N minutes · "shift": only when the shift closes (or "Sync now")
import { useSyncExternalStore } from "react";
import { db, keepStorage } from "./db";
import { posApi } from "./api";
import { applyPromos, calcOrder, lineTotal, paymentValue, shiftSummary } from "./calc";
import { sha256, today, uuid } from "./util";

const INSTANT_MS = 4000;
const listeners = new Set();
let state = {
  phase: "loading", // loading | pair | nosetup | ready
  token: "",
  device: null,
  setup: null, // bootstrap data without orders / shifts
  orders: {},
  shifts: {},
  bookings: {}, // table bookings of every device (kept in kv "bookings")
  staff: null, // who is logged in on the POS
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  syncing: false,
  lastContact: 0, // last time the cloud answered
  lastSync: 0,
  cursor: 0,
  setupRev: 0,
  error: "",
  unlinked: false, // the owner unlinked this device in the dashboard
  selfUnlinked: "", // "cloud" | "local": staff unlinked it here (local = offline, the dashboard may still list it)
  shiftDone: null, // the shift just closed: { shift, sum, synced } — its summary shows until "Done", then the PIN screen
  members: {}, // reward points: what the POS last heard about members on bills { [id]: { member, rewards, coupons } }
  guestAlerts: [], // table ordering: orders guests just sent [{ id, order_id, table_name, guest_name, count, at }]
};

function set(patch) {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  listeners.forEach((l) => l());
}
export const usePos = () => useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => state);
export const getPos = () => state;
export const subscribe = (l) => (listeners.add(l), () => listeners.delete(l));

// ---------- derived ----------
export const money = () => state.setup?.money || { currency: "USD", khr_rate: 4100, khr_rounding: 100, vat: {}, service_charge: {} };
export const pending = (s = state) => Object.values(s.orders).filter((o) => o._dirty).length + Object.values(s.shifts).filter((x) => x._dirty).length + Object.values(s.bookings).filter((x) => x._dirty).length;
export const activeBookings = (s = state) => Object.values(s.bookings).filter((b) => b.status === "active");
export const openShift = (s = state) => Object.values(s.shifts).find((x) => x.status === "open" && (!x.device_id || String(x.device_id) === String(s.device?._id))) || null;
export const totals = (order) => calcOrder(order, money());

// how many of a tracked item can still be sold: the cloud's count, minus what open bills hold
// and what paid bills on this device haven't taken out in the cloud yet. null = not tracked.
export function stockLeft(item, s = state, exceptLine = null) {
  if (!item?.track_stock) return null;
  let held = 0;
  for (const o of Object.values(s.orders)) {
    const counts = o.status === "open" || (o.status === "paid" && !o.stock_applied);
    if (!counts) continue;
    for (const l of o.lines || []) if (l.item_id === item._id && l.status !== "void" && l.id !== exceptLine) held += Number(l.qty) || 0;
  }
  return (Number(item.stock) || 0) - held;
}
const itemOf = (id) => (state.setup?.items || []).find((i) => i._id === id);

// may this device sell right now? (offline limits + licence)
export function blockedReason(s = state) {
  if (!s.setup) return "";
  const lic = s.setup.license || {};
  const now = Date.now();
  if (lic.locked || (lic.grace_until && now > new Date(lic.grace_until).getTime() && lic.expires_at && now > new Date(lic.expires_at).getTime())) return "locked";
  if (!s.online) {
    const pos = s.setup.pos || {};
    if (pos.allow_offline === false) return "offline_off";
    if (s.lastContact && now - s.lastContact > (pos.max_offline_hours || 24) * 3600 * 1000) return "offline_long";
  }
  return "";
}

// ---------- start ----------
export async function init() {
  keepStorage();
  const [token, device, setup, cursor, setupRev, lastContact, orders, shifts, bookings, guestAlerts] = await Promise.all([db.get("token"), db.get("device"), db.get("setup"), db.get("cursor"), db.get("setupRev"), db.get("lastContact"), db.allOrders(), db.allShifts(), db.get("bookings"), db.get("guestAlerts")]);
  const byId = (list) => Object.fromEntries(list.map((x) => [x._id, x]));
  set({ token: token || "", device: device || null, setup: setup || null, cursor: cursor || 0, setupRev: setupRev || 0, lastContact: lastContact || 0, orders: byId(orders), shifts: byId(shifts), bookings: bookings || {}, guestAlerts: guestAlerts || [] });
  if (!token) return set({ phase: "pair" });
  if (setup) set({ phase: "ready" });
  try {
    await bootstrap();
  } catch (e) {
    if (!setup) set({ phase: e.status === 401 ? "pair" : "nosetup", error: e.status === 401 ? "" : e.message });
  }
  prune();
  startLoop();
  updateRing(); // guest orders not accepted before a reload keep ringing (sound starts after the first tap)
}

export async function pair(code, name) {
  const data = await posApi.pair(code, name);
  await db.set("token", data.token);
  await db.set("device", data.device);
  set({ token: data.token, device: data.device, unlinked: false, selfUnlinked: "" });
  await bootstrap();
  startLoop();
}

async function bootstrap() {
  const data = await posApi.bootstrap(state.token);
  const { orders, shifts, bookings, cursor, setup_rev: setupRev, ...setup } = data;
  await db.set("setup", setup);
  await db.set("device", data.device);
  await db.set("lastContact", Date.now());
  // server copies replace local ones, unless this device still has changes to send
  const mergeIn = (local, list) => {
    const next = { ...local };
    for (const x of list) if (!next[x._id]?._dirty) next[x._id] = { ...x, _dirty: false };
    return next;
  };
  const nextOrders = mergeIn(state.orders, orders);
  const nextShifts = mergeIn(state.shifts, shifts);
  // bookings: the cloud's active list, plus what this device still has to send
  const nextBookings = Object.fromEntries(Object.values(state.bookings).filter((x) => x._dirty).map((x) => [x._id, x]));
  for (const x of bookings || []) if (!nextBookings[x._id]) nextBookings[x._id] = { ...x, _dirty: false };
  await db.set("bookings", nextBookings);
  await db.putOrders(Object.values(nextOrders));
  await db.putShifts(Object.values(nextShifts));
  const nextCursor = state.cursor || cursor;
  await db.set("cursor", nextCursor);
  await db.set("setupRev", setupRev);
  set({ setup, device: data.device, orders: nextOrders, shifts: nextShifts, bookings: nextBookings, cursor: nextCursor, setupRev, phase: "ready", online: true, lastContact: Date.now(), error: "" });
}

// keep the device light: paid / cancelled bills already in the cloud and older than 2 days are removed here
async function prune() {
  const cut = Date.now() - 2 * 86400000;
  const old = Object.values(state.orders).filter((o) => !o._dirty && o.status !== "open" && new Date(o.paid_at || o.opened_at).getTime() < cut && o.shift_id !== openShift()?._id);
  if (!old.length) return;
  await db.delOrders(old.map((o) => o._id));
  set((s) => {
    const orders = { ...s.orders };
    old.forEach((o) => delete orders[o._id]);
    return { orders };
  });
}

// ---------- sync ----------
let loop = null;
let soon = null;
let lastTick = 0;
let lastGuest = 0;
const GUEST_MS = 5000;
function intervalMs() {
  const mode = state.setup?.pos?.sync_mode || "instant";
  if (mode === "instant") return INSTANT_MS;
  if (mode === "shift") return 0;
  return Number(mode) * 60000;
}
function startLoop() {
  if (loop) return;
  lastTick = Date.now();
  loop = setInterval(() => {
    // table ordering: look for guests' orders every few seconds, whatever the sync mode
    if (state.setup?.table_order && state.token && Date.now() - lastGuest >= GUEST_MS) {
      lastGuest = Date.now();
      pollGuests();
    }
    const every = intervalMs();
    if (every && Date.now() - lastTick >= every) {
      lastTick = Date.now();
      syncNow();
    }
  }, 1000);
  window.addEventListener("online", () => {
    set({ online: true });
    if (intervalMs()) syncNow();
  });
  window.addEventListener("offline", () => set({ online: false }));
  syncNow();
}
// after a change: in instant mode send it a moment later
function scheduleSync() {
  if ((state.setup?.pos?.sync_mode || "instant") !== "instant") return;
  clearTimeout(soon);
  soon = setTimeout(() => syncNow(), 400);
}

let running = null;
export function syncNow() {
  if (!state.token) return Promise.resolve(false);
  if (running) return running;
  running = doSync().finally(() => {
    running = null;
  });
  return running;
}

async function doSync() {
  set({ syncing: true });
  try {
    for (let round = 0; round < 10; round++) {
      const dirtyOrders = Object.values(state.orders)
        .filter((o) => o._dirty)
        .slice(0, 150);
      const dirtyShifts = Object.values(state.shifts).filter((x) => x._dirty);
      const dirtyBookings = Object.values(state.bookings).filter((x) => x._dirty).slice(0, 100);
      const sent = new Map([...dirtyOrders, ...dirtyShifts, ...dirtyBookings].map((x) => [x._id, x.version]));
      const strip = ({ _dirty, ...x }) => x; // eslint-disable-line no-unused-vars
      const res = await posApi.sync(state.token, { since: state.cursor, orders: dirtyOrders.map(strip), shifts: dirtyShifts.map(strip), bookings: dirtyBookings.map(strip), pending: pending() });
      // what we sent is now in the cloud (unless it changed again meanwhile)
      const orders = { ...state.orders };
      const shifts = { ...state.shifts };
      const bookings = { ...state.bookings };
      for (const [id, v] of sent) {
        if (orders[id] && orders[id].version === v) orders[id] = { ...orders[id], _dirty: false };
        if (shifts[id] && shifts[id].version === v) shifts[id] = { ...shifts[id], _dirty: false };
        if (bookings[id] && bookings[id].version === v) bookings[id] = { ...bookings[id], _dirty: false };
      }
      // changes from the cloud (other devices too)
      for (const o of res.orders) if (!orders[o._id]?._dirty) orders[o._id] = { ...o, _dirty: false };
      for (const x of res.shifts) if (!shifts[x._id]?._dirty) shifts[x._id] = { ...x, _dirty: false };
      for (const x of res.bookings || []) if (!bookings[x._id]?._dirty) bookings[x._id] = { ...x, _dirty: false };
      // keep only bookings still waiting (seated / cancelled ones are done)
      for (const [id, x] of Object.entries(bookings)) if (x.status !== "active" && !x._dirty) delete bookings[id];
      await db.set("bookings", bookings);
      await db.putOrders(Object.values(orders).filter((o) => sent.has(o._id) || res.orders.some((r) => r._id === o._id)));
      await db.putShifts(Object.values(shifts));
      await db.set("cursor", res.cursor);
      await db.set("lastContact", Date.now());
      // stock left of every tracked item (after other devices' sales too)
      const items = res.stock ? (state.setup?.items || []).map((i) => (res.stock[i._id] !== undefined ? { ...i, stock: res.stock[i._id] } : i)) : state.setup?.items;
      const setup = { ...state.setup, items, license: res.license, pos: res.pos, table_order: res.table_order ?? state.setup?.table_order ?? null };
      const rewardsChanged = res.rewards_on !== undefined && !!res.rewards_on !== !!state.setup?.rewards;
      await db.set("setup", setup);
      set({ orders, shifts, bookings, cursor: res.cursor, setup, online: true, lastContact: Date.now(), lastSync: Date.now(), error: "" });
      if (res.setup_rev !== state.setupRev || rewardsChanged) await bootstrap().catch(() => {});
      if (!res.more && pending() === 0) break;
      if (!res.more && dirtyOrders.length < 150) break;
    }
    set({ syncing: false });
    return true;
  } catch (e) {
    if (e.status === 401 && e.body?.code === "device") {
      // the owner unlinked this device in the dashboard
      await db.del("token");
      set({ syncing: false, token: "", phase: "pair", unlinked: true, staff: null });
      return false;
    }
    set({ syncing: false, online: e.status !== 0 ? state.online : false, error: e.status === 0 ? "" : e.message });
    return false;
  }
}

// ---------- table ordering (guests order from the QR on their table) ----------
// The cloud gives this POS the orders guests sent; each one goes onto that table's open bill (a new bill if none),
// lines marked "from guest" and not sent yet, then the POS confirms. Line ids come from the guest order,
// so adding the same one twice (after a reload) never doubles it.
let guestBusy = false;
async function pollGuests() {
  if (guestBusy) return;
  guestBusy = true;
  try {
    const acks = (await db.get("guestAcks")) || [];
    const openTables = [...new Set(Object.values(state.orders).filter((o) => o.status === "open" && o.table_id).map((o) => String(o.table_id)))];
    const res = await posApi.guestOrders(state.token, { acks, open_tables: openTables });
    const done = new Set(res.acked || []);
    let left = ((await db.get("guestAcks")) || []).filter((a) => !done.has(a.id));
    const fresh = [];
    for (const g of res.orders || []) {
      const placed = await placeGuestOrder(g);
      if (!placed) continue;
      left = [...left.filter((a) => a.id !== g._id), { id: g._id, order_id: placed.order._id, order_number: placed.order.number }];
      if (placed.added) fresh.push({ id: g._id, order_id: placed.order._id, table_name: g.table_name, guest_name: g.guest_name || "", count: g.lines.reduce((a, l) => a + (Number(l.qty) || 0), 0), at: Date.now() });
    }
    await db.set("guestAcks", left);
    const info = res.table_order ?? null;
    if (JSON.stringify(info) !== JSON.stringify(state.setup?.table_order ?? null)) set((s) => ({ setup: { ...s.setup, table_order: info } }));
    if (fresh.length) {
      set((s) => ({ guestAlerts: [...fresh, ...s.guestAlerts].slice(0, 8) }));
      db.set("guestAlerts", state.guestAlerts);
      updateRing();
      if (left.length) setTimeout(() => (lastGuest = 0), 300); // confirm right away
    }
  } catch {
    // offline or a hiccup: next round
  } finally {
    guestBusy = false;
  }
}
async function placeGuestOrder(g) {
  const ids = g.lines.map((_, i) => `g-${g._id}-${i}`);
  const already = Object.values(state.orders).find((o) => o.lines.some((l) => l.id === ids[0]));
  if (already) return { order: already, added: false };
  const open = Object.values(state.orders)
    .filter((o) => o.status === "open" && String(o.table_id) === String(g.table_id))
    .sort((a, b) => String(b.opened_at).localeCompare(String(a.opened_at)));
  let order = open[0];
  if (!order) {
    const table = (state.setup?.tables || []).find((x) => String(x._id) === String(g.table_id)) || { _id: g.table_id, name: g.table_name };
    order = await newOrder({ table });
  }
  const lines = g.lines.map((l, i) => ({
    id: ids[i],
    item_id: l.item_id,
    name_km: l.name_km || "",
    name_en: l.name_en || "",
    size: l.size || "",
    unit_price: Number(l.unit_price) || 0,
    addons: (l.addons || []).map((a) => ({ group: a.group, name: a.name, price: Number(a.price) || 0 })),
    qty: Math.max(1, Number(l.qty) || 1),
    note: l.note || "",
    status: "new",
    station_id: l.station_id || "",
    created_at: g.created_date || new Date().toISOString(),
    created_by: g.guest_name || "Guest",
    from: "guest",
    guest_name: g.guest_name || "",
    cost: Number(l.cost) || 0,
  }));
  const latest = state.orders[order._id] || order;
  // reward points: the phone the guest gave puts their member card on the bill (if none yet)
  const member = latest.member?.id ? latest.member : g.member?.id ? g.member : latest.member;
  return { order: await saveOrder({ ...latest, member, lines: [...latest.lines, ...lines] }), added: true };
}
// the cashier accepted it (or all of them): when none are left, the ringing stops
export function dismissGuestAlert(id) {
  set((s) => ({ guestAlerts: id ? s.guestAlerts.filter((a) => a.id !== id) : [] }));
  db.set("guestAlerts", state.guestAlerts);
  updateRing();
}
// keeps ringing while a guest order hasn't been accepted on this POS
let ringTimer = null;
let ringAudio = null;
function updateRing() {
  if (state.guestAlerts.length && !ringTimer) ringOnce();
  if (!state.guestAlerts.length) {
    clearTimeout(ringTimer);
    ringTimer = null;
    if (ringAudio) {
      ringAudio.pause();
      ringAudio = null;
    }
  }
}
function ringOnce() {
  const again = (ms) => {
    ringTimer = setTimeout(() => {
      ringTimer = null;
      if (state.guestAlerts.length) ringOnce();
    }, ms);
  };
  ringTimer = -1; // ringing now
  const url = state.setup?.table_order?.sound;
  if (url) {
    const a = new Audio(url);
    ringAudio = a;
    let next = false;
    const go = () => {
      if (next) return;
      next = true;
      ringAudio = null;
      again(2000);
    };
    a.addEventListener("ended", go);
    a.addEventListener("error", () => {
      chime();
      go();
    });
    a.play().catch(() => {
      chime();
      go();
    });
    setTimeout(go, 15000); // a very long sound: ring again anyway
  } else {
    chime();
    again(3500);
  }
}
// the owner's sound (dashboard → Table ordering), or a built-in chime
export function playAlert() {
  const url = state.setup?.table_order?.sound;
  if (url) {
    const a = new Audio(url);
    a.play().catch(() => chime());
  } else chime();
}
let audioCtx = null;
function chime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    const t0 = audioCtx.currentTime;
    [[880, 0], [1175, 0.18], [1568, 0.36], [880, 0.9], [1175, 1.08], [1568, 1.26]].forEach(([f, at]) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.32);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + at);
      o.stop(t0 + at + 0.35);
    });
  } catch {
    // no sound on this device
  }
}

// ---------- reward points ----------
// Finding a member, rewards and coupons need the internet (points can't be spent twice);
// points for a paid bill are added by the cloud when the bill syncs, so selling offline is fine.
export const rewardsRules = () => state.setup?.rewards || null;
const keepMember = (data) => {
  if (data?.member?._id) set((s) => ({ members: { ...s.members, [data.member._id]: data } }));
  return data;
};
export const findMember = async (phone) => keepMember(await posApi.memberFind(state.token, phone));
export const searchMembers = async (q) => posApi.memberSearch(state.token, q); // name or phone → { results }
export const refreshMember = async (id) => keepMember(await posApi.memberGet(state.token, id));
export const createMember = async (body) => keepMember(await posApi.memberCreate(state.token, body));
export function attachMember(orderId, member) {
  const o = get(orderId);
  return saveOrder({ ...o, member: member ? { id: member._id, name: member.name || "", phone: member.phone || "" } : { id: "", name: "", phone: "" } });
}
// what a reward does to the bill
async function applyReward(orderId, x) {
  const o = state.orders[orderId];
  const entry = { id: x.id, reward_id: x.reward_id, name: x.name, kind: x.kind, points: x.points, item_id: x.item_id || "", code: x.code || "" };
  const next = { ...o, redemptions: [...(o.redemptions || []), entry] };
  if (x.kind === "free_item") {
    const item = itemOf(x.item_id);
    next.lines = [
      ...o.lines,
      {
        id: uuid(),
        item_id: x.item_id,
        name_km: item?.name_km || "",
        name_en: item?.name_en || x.name,
        size: "",
        unit_price: Number(item?.price) || 0,
        addons: [],
        qty: 1,
        note: "",
        status: "new",
        station_id: item?.station_id || "",
        created_at: new Date().toISOString(),
        created_by: me().name,
        cost: Number(item?.cost) || 0,
        discount: { kind: "percent", value: 100, by: me().name, reason: `★ ${x.name}` },
        reward_id: x.id,
      },
    ];
  } else if (x.kind === "amount" || x.kind === "percent") {
    next.reward_discount = { kind: x.kind, value: Number(x.value) || 0, name: x.name, redemption_id: x.id };
  }
  return saveOrder(next);
}
// one money-off reward per bill ($ or %), any number of free items and gifts
export const billRewardTaken = (orderId) => !!state.orders[orderId]?.reward_discount?.kind;
export async function redeemReward(orderId, rewardId) {
  const o = get(orderId);
  const data = keepMember(await posApi.redeem(state.token, { member_id: o.member.id, reward_id: rewardId, order_id: o._id, order_number: o.number }));
  if (!data.redemption.coupon) await applyReward(orderId, data.redemption);
  return data;
}
export async function useCoupon(orderId, redemptionId) {
  const o = get(orderId);
  const data = keepMember(await posApi.useCoupon(state.token, { member_id: o.member.id, redemption_id: redemptionId, order_id: o._id, order_number: o.number }));
  await applyReward(orderId, data.redemption);
  return data;
}
export async function undoRedemption(orderId, redemptionId) {
  const data = keepMember(await posApi.undoRedeem(state.token, redemptionId));
  const o = get(orderId);
  await saveOrder({
    ...o,
    redemptions: (o.redemptions || []).filter((r) => r.id !== redemptionId),
    reward_discount: o.reward_discount?.redemption_id === redemptionId ? { kind: "", value: 0, name: "", redemption_id: "" } : o.reward_discount,
    lines: o.lines.map((l) => (l.reward_id === redemptionId && l.status !== "void" ? { ...l, status: "void", void_reason: "removed", void_by: me().name } : l)),
  });
  return data;
}
// points this bill should give (the cloud works out the real number when it's paid)
export function pointsFor(order) {
  const r = rewardsRules();
  if (!r || !order?.member?.id) return 0;
  const t = calcOrder(order, money());
  let pts = 0;
  const spent = t.subtotal - t.discount;
  if (r.by_amount && r.points_per_step > 0 && spent >= (r.min_bill || 0)) pts += Math.floor((spent / (r.step || 1)) * r.points_per_step + 1e-9);
  if (r.by_item) for (const l of order.lines) if (l.status !== "void" && !l.reward_id) pts += (Number(itemOf(l.item_id)?.reward_points) || 0) * (Number(l.qty) || 0);
  return Math.max(0, Math.floor(pts));
}

// ---------- staff ----------
export async function loginPin(pin) {
  const staff = state.setup?.staff || [];
  const found = staff.find((s) => s.pin_check && sha256(`${s.pin_salt}:${pin}`) === s.pin_check);
  if (found) {
    set({ staff: found });
    return found;
  }
  // a PIN this device can't check yet (old staff record): ask the cloud once, then it works offline too
  if (state.online) {
    try {
      const s = await posApi.staffPin(state.token, pin);
      const setup = { ...state.setup, staff: [...staff.filter((x) => x._id !== s._id), s] };
      await db.set("setup", setup);
      set({ setup, staff: s });
      return s;
    } catch {
      /* wrong PIN */
    }
  }
  return null;
}
// a manager's PIN for cancelling / discounts (doesn't change who is logged in)
export function managerPin(pin) {
  return (state.setup?.staff || []).find((s) => s.role === "manager" && s.pin_check && sha256(`${s.pin_salt}:${pin}`) === s.pin_check) || null;
}
export const lock = () => set({ staff: null });
const me = () => ({ id: state.staff?._id || "", name: state.staff?.name || "" });

// ---------- saving ----------
// promotions of this restaurant (Promotions add-on) given to an open order's lines
function withPromos(order) {
  if (order.status !== "open") return order;
  const promos = state.setup?.promos || [];
  if (!promos.length && !(order.lines || []).some((l) => l.promo?.off)) return order;
  const cat = new Map((state.setup?.items || []).map((i) => [i._id, String(i.category_id || "")]));
  return applyPromos(order, promos, (id) => cat.get(id) || "");
}
async function saveOrder(input) {
  const order = withPromos(input);
  const next = { ...order, version: (order.version || 0) + 1, device_updated_at: new Date().toISOString(), _dirty: true };
  set((s) => ({ orders: { ...s.orders, [next._id]: next } }));
  await db.putOrders([next]);
  scheduleSync();
  return next;
}
async function saveShift(shift) {
  const next = { ...shift, version: (shift.version || 0) + 1, _dirty: true };
  set((s) => ({ shifts: { ...s.shifts, [next._id]: next } }));
  await db.putShifts([next]);
  scheduleSync();
  return next;
}

async function nextNumber() {
  const daily = (state.setup?.restaurant?.receipt?.numbering || "daily") === "daily";
  const key = daily ? `num:${today()}` : "num:all";
  const n = ((await db.get(key)) || 0) + 1;
  await db.set(key, n);
  return `${state.device?.prefix || "A"}-${String(n).padStart(4, "0")}`;
}

// ---------- shifts ----------
export function startShift(opening) {
  return saveShift({ _id: uuid(), device_id: state.device?._id, opened_by: me(), opened_at: new Date().toISOString(), opening: { usd: Number(opening.usd) || 0, khr: Number(opening.khr) || 0 }, status: "open", version: 0 });
}
export function shiftNumbers(shift) {
  return shiftSummary(shift, Object.values(state.orders), money());
}
export async function endShift(shift, counted, note) {
  const sum = shiftNumbers(shift);
  const draft = { ...shift, status: "closed", closed_at: new Date().toISOString(), closed_by: me(), counted: { usd: Number(counted.usd) || 0, khr: Number(counted.khr) || 0 }, note: note || "", totals: sum, expected: sum.expected };
  set({ shiftDone: { shift: draft, sum, synced: null } }); // summary screen first (null = still sending)
  const closed = await saveShift(draft);
  const ok = await syncNow(); // closing a shift always tries to send everything
  const r = { shift: closed, synced: ok && pending() === 0 };
  set({ shiftDone: { ...r, sum } });
  return r;
}
// "Done" on the shift summary: log out → PIN screen for the next person
export const finishShift = () => set({ shiftDone: null, staff: null });

// ---------- orders ----------
export async function newOrder({ table, type = "dine_in", guests = 0 }) {
  const shift = openShift();
  return saveOrder({
    _id: uuid(),
    shift_id: shift?._id || "",
    number: await nextNumber(),
    type,
    table_id: table?._id || "",
    table_name: table?.name || "",
    guests,
    status: "open",
    lines: [],
    payments: [],
    discount: { kind: "", value: 0, by: "" },
    change: { usd: 0, khr: 0 },
    opened_by: me(),
    opened_at: new Date().toISOString(),
    version: 0,
  });
}
const get = (id) => state.orders[id];

export function addLine(orderId, { item, size, addons, qty, note }) {
  const o = get(orderId);
  const left = stockLeft(item);
  if (left !== null && left < Math.max(1, Number(qty) || 1)) return Promise.resolve(o); // sold out: nothing added
  // the same plain dish tapped again → one line with a bigger quantity
  const plain = !size && !(addons || []).length && !note;
  const same = plain && o.lines.find((l) => l.item_id === item._id && l.status === "new" && !l.size && !l.addons?.length && !l.note);
  if (same) return saveOrder({ ...o, lines: o.lines.map((l) => (l.id === same.id ? { ...l, qty: l.qty + Math.max(1, Number(qty) || 1) } : l)) });
  const line = {
    id: uuid(),
    item_id: item._id,
    name_km: item.name_km || "",
    name_en: item.name_en || "",
    size: size?.name || "",
    unit_price: size ? Number(size.price) : Number(item.price),
    addons: (addons || []).map((a) => ({ group: a.group, name: a.name, price: Number(a.price) || 0 })),
    qty: Math.max(1, Number(qty) || 1),
    note: note || "",
    status: "new",
    station_id: item.station_id || "",
    created_at: new Date().toISOString(),
    created_by: me().name,
    cost: Number(item.cost) || 0, // for profit in reports
  };
  return saveOrder({ ...o, lines: [...o.lines, line] });
}
export function setLineQty(orderId, lineId, qty) {
  const o = get(orderId);
  const line = o.lines.find((l) => l.id === lineId);
  const left = line ? stockLeft(itemOf(line.item_id), state, lineId) : null;
  if (left !== null && qty > left) qty = Math.max(1, left); // can't go over what's in stock
  return saveOrder({ ...o, lines: o.lines.map((l) => (l.id === lineId && l.status === "new" ? { ...l, qty: Math.max(1, qty) } : l)) });
}
// a line not sent yet just goes away (kept as "removed" so another device's copy can't bring it back)
export function removeLine(orderId, lineId) {
  const o = get(orderId);
  return saveOrder({ ...o, lines: o.lines.map((l) => (l.id === lineId ? { ...l, status: "void", void_reason: "removed", void_by: me().name } : l)) });
}
export function voidLine(orderId, lineId, reason, manager) {
  const o = get(orderId);
  return saveOrder({ ...o, lines: o.lines.map((l) => (l.id === lineId ? { ...l, status: "void", void_reason: reason || "cancelled", void_by: manager?.name || me().name } : l)) });
}
export function sendLines(orderId) {
  const o = get(orderId);
  return saveOrder({ ...o, lines: o.lines.map((l) => (l.status === "new" ? { ...l, status: "sent" } : l)) });
}
// a discount on one item (by hand): % or amount off that line, never more than the owner's limit
export const maxLineDiscount = () => state.setup?.pos?.max_line_discount ?? 100;
export function setLineDiscount(orderId, lineId, kind, value, reason) {
  const o = get(orderId);
  return saveOrder({
    ...o,
    lines: o.lines.map((l) => {
      if (l.id !== lineId) return l;
      if (!kind || !(Number(value) > 0)) return { ...l, discount: { kind: "", value: 0, by: "", reason: "" } };
      const cap = maxLineDiscount();
      let v = Number(value) || 0;
      if (kind === "percent") v = Math.min(v, cap);
      else v = Math.min(v, (lineTotal(l) * cap) / 100);
      return { ...l, discount: { kind, value: v, by: me().name, reason: reason || "" }, promo: { id: "", name: "", off: 0 } };
    }),
  });
}
export function setDiscount(orderId, kind, value, manager) {
  const o = get(orderId);
  return saveOrder({ ...o, discount: { kind, value: Number(value) || 0, by: manager?.name || me().name } });
}
// a note about the table / guests ("friends of the owner, birthday…")
export function setNote(orderId, note) {
  return saveOrder({ ...get(orderId), note: String(note || "").slice(0, 300) });
}
export function setGuests(orderId, guests) {
  return saveOrder({ ...get(orderId), guests: Math.max(0, Number(guests) || 0) });
}
export function markBill(orderId) {
  return saveOrder({ ...get(orderId), bill_printed: true, lines: get(orderId).lines.map((l) => (l.status === "new" ? { ...l, status: "sent" } : l)) });
}
// payments: [{method, kind, currency, amount}] · change: {usd, khr} handed back
export function pay(orderId, payments, change) {
  const o = get(orderId);
  const m = money();
  const list = payments.map((p) => ({ id: uuid(), method: p.method, kind: p.kind, currency: p.currency, amount: Number(p.amount) || 0, value: paymentValue(p, m), at: new Date().toISOString(), by: me().name }));
  return saveOrder({
    ...o,
    lines: o.lines.map((l) => (l.status === "new" ? { ...l, status: "sent" } : l)),
    payments: [...(o.payments || []), ...list],
    change: { usd: Number(change?.usd) || 0, khr: Number(change?.khr) || 0 },
    status: "paid",
    paid_at: new Date().toISOString(),
    closed_by: me(),
  });
}
export function voidOrder(orderId, reason, manager) {
  const o = get(orderId);
  return saveOrder({ ...o, status: "void", void_reason: reason || "cancelled", closed_by: { id: manager?._id || me().id, name: manager?.name || me().name }, lines: o.lines.map((l) => (l.status === "void" ? l : { ...l, status: "void", void_reason: reason || "cancelled" })) });
}

// ---------- bookings ----------
async function saveBooking(b) {
  const next = { ...b, version: (b.version || 0) + 1, _dirty: true };
  const bookings = { ...state.bookings, [next._id]: next };
  set({ bookings });
  await db.set("bookings", bookings);
  scheduleSync();
  return next;
}
export function addBooking({ table, name, phone, time, guests, note }) {
  return saveBooking({ _id: uuid(), table_id: table?._id || "", table_name: table?.name || "", name: String(name || "").trim(), phone: String(phone || "").trim(), time: time || null, guests: Number(guests) || 0, note: note || "", status: "active", order_id: "", created_by: me().name, version: 0 });
}
export function updateBooking(id, patch) {
  return saveBooking({ ...state.bookings[id], ...patch });
}
export function cancelBooking(id) {
  return saveBooking({ ...state.bookings[id], status: "cancelled" });
}
// guests arrived: start the table's order with the booking's name on it
export async function seatBooking(id) {
  const b = state.bookings[id];
  const table = (state.setup?.tables || []).find((x) => x._id === b.table_id) || { _id: b.table_id, name: b.table_name };
  const o = await newOrder({ table, type: "dine_in", guests: b.guests || 0 });
  const withNote = await saveOrder({ ...state.orders[o._id], note: [`${b.name}${b.phone ? ` · ${b.phone}` : ""}`, b.note].filter(Boolean).join(" — ") });
  await saveBooking({ ...b, status: "seated", order_id: o._id });
  return withNote;
}

// who may unlink this device: a manager's PIN, or any staff PIN when the shop has no manager
export function unlinkPinOk(pin) {
  const staff = state.setup?.staff || [];
  const ok = (x) => x.pin_check && sha256(`${x.pin_salt}:${pin}`) === x.pin_check;
  return staff.some((x) => x.role === "manager") ? staff.some((x) => x.role === "manager" && ok(x)) : staff.some(ok);
}
// unlink this device. Online: the cloud checks the PIN and removes the device from the dashboard too.
// Offline: the PIN is checked here and only this device forgets the shop (the owner can remove it in the dashboard).
// throws { code: "pin" | "manager" } on a wrong PIN
export async function unlink(pin) {
  let where = "local";
  if (state.token) {
    try {
      await posApi.unlink(state.token, pin || "");
      where = "cloud";
    } catch (e) {
      if (e.status === 401 && e.body?.code === "device") where = "cloud"; // already gone
      else if (e.status === 403) throw Object.assign(new Error(e.message), { code: "manager" });
      else if (e.status !== 0 && e.status < 500) throw Object.assign(new Error(e.message), { code: "pin" });
    }
  }
  if (where === "local" && state.setup && !unlinkPinOk(pin)) throw Object.assign(new Error("pin"), { code: "pin" });
  await db.clear();
  set({ phase: "pair", token: "", device: null, setup: null, orders: {}, shifts: {}, bookings: {}, staff: null, cursor: 0, guestAlerts: [], members: {}, shiftDone: null, unlinked: false, selfUnlinked: where });
  updateRing();
}
