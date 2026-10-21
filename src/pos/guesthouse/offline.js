import { ghPosApi, session } from "./ghApi";

// Offline for the Guest House desk POS (like the Restaurant POS):
// - a copy of the screens' data is kept on the device (rooms, staff PIN checks, bookings that matter)
// - with no internet, bookings / check-in / check-out / extras / payments are saved here and queued
// - when the internet is back, the queue is sent in order (each item carries a client_id, so a repeat adds nothing)
const CACHE_KEY = "bizhub_gh_cache";
const QUEUE_KEY = "bizhub_gh_queue";
const SESSIONS_KEY = "bizhub_gh_sessions"; // staffId → session (to send the queue later)
const DAY = 86400000;

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
let cache = read(CACHE_KEY, null); // { boot, stays, staff, at }
let queue = read(QUEUE_KEY, []);
let online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
let syncing = false;
let failed = [];
const subs = new Set();
const emit = () => subs.forEach((fn) => fn(status()));
export const status = () => ({ online, pending: queue.length, syncing, at: cache?.at || null, failed });
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
// locked / logged out: drop the offline login
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
// a PIN typed with no internet is kept in memory only (never saved), to log in for real once the internet is back
let heldPin = "";
const needLogin = () => !!cache?.offline_staff && !session.get();

// ---------------- local maths (same rules as the server) ----------------
const localDay = (t = Date.now()) => new Date(t + 7 * 3600000).toISOString().slice(0, 10);
const addDays = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const nightsOf = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
const uid = () => (crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, "").slice(0, 24);
export function billOf(s, currency = "USD") {
  const r = (v) => (currency === "KHR" ? Math.round(v) : Math.round(v * 100) / 100);
  const nights = Math.max(0, nightsOf(s.from, s.to));
  const room = r(nights * s.rate);
  const extras = r((s.charges || []).reduce((a, c) => a + c.amount * (c.qty || 1), 0));
  const total = r(Math.max(0, room + extras - (s.discount || 0)));
  const paid = r((s.payments || []).reduce((a, p) => a + p.amount, 0));
  return { nights, room, extras, discount: s.discount || 0, total, paid, balance: r(total - paid) };
}
const cur = () => cache?.boot?.settings?.currency || "USD";
const roomOf = (id) => cache?.boot?.rooms?.find((r) => String(r._id) === String(id));
const dress = (s) => {
  const room = roomOf(s.room_id);
  return { ...s, room_name: room?.name || s.room_name || "?", type_id: room?.type_id || s.type_id || null, bill: billOf(s, cur()) };
};
const putStay = (s) => {
  if (!cache) return s;
  const d = dress(s);
  const i = cache.stays.findIndex((x) => String(x._id) === String(s._id) || (s.client_id && x.client_id === s.client_id));
  if (i >= 0) cache.stays[i] = d;
  else cache.stays.unshift(d);
  saveCache();
  return d;
};
const findStay = (sid) => cache?.stays.find((x) => String(x._id) === String(sid));
const bad = (message, code, extra = {}) => Object.assign(new Error(message), { status: 409, code, response: { code, message, ...extra } });
const LIVE = ["booked", "in"];
const takenLocal = (roomId, from, to, except) => cache.stays.some((x) => String(x.room_id) === String(roomId) && LIVE.includes(x.status) && x.from < to && x.to > from && String(x._id) !== String(except));
const who = () => cache?.offline_staff?.name || cache?.boot?.staff?.name || "desk";

function todayLocal() {
  const today = localDay();
  const b = cache.boot;
  const rooms = b.rooms.filter((r) => r.active);
  const typeOf = new Map(b.types.map((t) => [String(t._id), t]));
  const live = cache.stays.filter((s) => LIVE.includes(s.status));
  const arrivals = live.filter((s) => s.status === "booked" && s.from <= today).sort((a, c) => (a.from < c.from ? -1 : 1));
  const inHouse = live.filter((s) => s.status === "in");
  const departures = inHouse.filter((s) => s.to <= today);
  const board = rooms.map((r) => {
    const here = inHouse.find((s) => String(s.room_id) === String(r._id));
    const next = live.filter((s) => s.status === "booked" && String(s.room_id) === String(r._id)).sort((a, c) => (a.from < c.from ? -1 : 1))[0];
    const state = here ? (here.to <= today ? "due_out" : "occupied") : next && next.from <= today ? "arriving" : "free";
    const t = typeOf.get(String(r.type_id));
    return {
      _id: r._id,
      name: r.name,
      floor: r.floor,
      type: t?.name || "",
      color: t?.color || "",
      state,
      stay: here ? dress(here) : next && next.from <= today ? dress(next) : null,
      next: !here && next && next.from > today ? { _id: next._id, from: next.from, to: next.to, guest: next.guest.name } : null,
    };
  });
  const dayStart = Date.parse(`${today}T00:00:00Z`) - 7 * 3600000;
  const money = {};
  let total = 0;
  for (const s of cache.stays)
    for (const p of s.payments || [])
      if (new Date(p.at).getTime() >= dayStart) {
        money[p.method] = (money[p.method] || 0) + p.amount;
        total += p.amount;
      }
  return {
    day: today,
    rooms: board,
    arrivals: arrivals.map(dress),
    departures: departures.map(dress),
    in_house: inHouse.map(dress),
    counts: { rooms: rooms.length, occupied: inHouse.length, free: board.filter((x) => x.state === "free").length, arrivals: arrivals.length, departures: departures.length },
    money: { total, by_method: money },
    currency: cur(),
    offline: true,
  };
}
function staysLocal(params = {}) {
  let list = cache.stays;
  if (params.from && params.to) list = list.filter((s) => s.from < params.to && s.to > params.from && ["booked", "in", "out"].includes(s.status));
  if (params.status) list = list.filter((s) => s.status === params.status);
  if (params.q) {
    const q = String(params.q).toLowerCase();
    list = list.filter((s) =>
      [s.guest?.name, s.guest?.phone, s.no, s.guest?.id_number].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }
  return list.map(dress);
}

// ---------------- queue ----------------
const enqueue = (op) => {
  queue.push({ id: uid(), at: Date.now(), staff: cache?.offline_staff?._id || cache?.boot?.staff?._id || "", ...op });
  saveQueue();
};
function applyLocal(kind, sid, body) {
  const s = findStay(sid);
  if (!s) throw bad("Not found", "not_found");
  const today = localDay();
  const st = { ...s };
  if (kind === "check-in") {
    if (st.status !== "booked") throw bad("Not booked", "not_booked");
    if (st.from > today) throw bad("Too early", "too_early");
    if (st.from < today && today < st.to) st.from = today;
    st.status = "in";
    st.checked_in_at = new Date().toISOString();
  } else if (kind === "check-out") {
    if (st.status !== "in") throw bad("Not in", "not_in");
    if (st.to > today) st.to = today > st.from ? today : addDays(st.from, 1);
    const b = billOf(st, cur());
    if (b.balance !== 0 && body?.force !== true) throw bad(b.balance > 0 ? "Unpaid" : "Refund", b.balance > 0 ? "unpaid" : "refund", { balance: b.balance, nights: b.nights, total: b.total, to: st.to });
    st.status = "out";
    st.checked_out_at = new Date().toISOString();
  } else if (kind === "cancel" || kind === "no-show") {
    if (st.status !== "booked") throw bad("Not booked", "not_booked");
    st.status = kind === "cancel" ? "cancelled" : "no_show";
  }
  return putStay(st);
}

// replay the queue (in order); a local booking's id becomes the server's
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
      const ids = cache?.idmap || {};
      const sid = op.sid && ids[op.sid] ? ids[op.sid] : op.sid;
      try {
        let r;
        if (op.kind === "book") r = await ghPosApi.withSession(sess).book(null, op.body);
        else if (op.kind === "update") r = await ghPosApi.withSession(sess).updateStay(null, sid, op.body);
        else if (op.kind === "charge") r = await ghPosApi.withSession(sess).addCharge(null, sid, op.body);
        else if (op.kind === "payment") r = await ghPosApi.withSession(sess).addPayment(null, sid, op.body);
        else if (op.kind === "remove-charge") r = await ghPosApi.withSession(sess).removeCharge(null, sid, op.lid);
        else if (op.kind === "remove-payment") r = await ghPosApi.withSession(sess).removePayment(null, sid, op.lid);
        else if (op.kind === "discount") r = await ghPosApi.withSession(sess).discount(null, sid, op.body.discount);
        else r = await ghPosApi.withSession(sess).action(null, sid, op.kind, op.body);
        if (r?.data && cache) {
          if (op.kind === "book" && op.sid) {
            cache.idmap = { ...(cache.idmap || {}), [op.sid]: r.data._id };
            cache.stays = cache.stays.filter((x) => String(x._id) !== String(op.sid));
          }
          putStay(r.data);
        }
        setOnline(true);
      } catch (e) {
        if (isNet(e)) {
          setOnline(false);
          break;
        }
        if (e.status === 401) {
          // that staff session ended: forget it and try with whoever is logged in now
          delete sessions[op.staff];
          write(SESSIONS_KEY, sessions);
          if (session.get() && session.get() !== sess) continue;
          break;
        }
        // the server said no (room taken meanwhile, already checked in…): keep a note, move on
        const already = e.status === 409 && ["not_booked", "not_in"].includes(e.code);
        if (!already) failed = [...failed, { kind: op.kind, guest: op.label || "", message: e.message, at: Date.now() }].slice(-20);
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

// fresh copy from the server
export async function pull() {
  const [boot, sync] = await Promise.all([ghPosApi.boot(), ghPosApi.sync()]);
  if (queue.length) return; // don't overwrite local changes that are still waiting
  cache = { ...(cache || {}), boot: boot.data, stays: sync.data.stays, staff: sync.data.staff, at: Date.now(), offline_staff: null };
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
  const list = cache?.staff || [];
  for (const s of list) {
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

// ---------------- the API the screens use (same names as guestHouseService) ----------------
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
const write1 = async (serverFn, localFn) => {
  if (online && !queue.length && !needLogin()) {
    try {
      const r = await serverFn();
      if (r?.data?._id) putStay(r.data);
      setOnline(true);
      return r;
    } catch (e) {
      if (!isNet(e)) throw e;
      setOnline(false);
    }
  }
  if (!cache?.boot) throw Object.assign(new Error("network"), { code: "network" });
  return { data: localFn(), offline: true };
};

export const offlineApi = {
  // these need the internet
  report: (_id, month) => ghPosApi.report(null, month),
  housekeeping: () => ghPosApi.housekeeping(),
  setHk: (_id, rid, data) => ghPosApi.setHk(null, rid, data),
  expenses: (_id, month) => ghPosApi.expenses(null, month),
  addExpense: (_id, data) => ghPosApi.addExpense(null, data),
  saveExpense: (_id, eid, data) => ghPosApi.saveExpense(null, eid, data),
  removeExpense: (_id, eid) => ghPosApi.removeExpense(null, eid),
  profit: (_id, month) => ghPosApi.profit(null, month),
  leases: () => ghPosApi.leases(),
  addLease: (_id, data) => ghPosApi.addLease(null, data),
  saveLease: (_id, sid, data) => ghPosApi.saveLease(null, sid, data),
  leaseBill: (_id, sid, data) => ghPosApi.leaseBill(null, sid, data),
  endLease: (_id, sid, data) => ghPosApi.endLease(null, sid, data),
  stayReview: (_id, sid) => ghPosApi.stayReview(null, sid),
  addIdPhoto: (_id, sid, file) => ghPosApi.addIdPhoto(null, sid, file),
  removeIdPhoto: (_id, sid, pid) => ghPosApi.removeIdPhoto(null, sid, pid),
  members: (_id, qq) => ghPosApi.members(null, qq),
  stayMember: (_id, sid) => ghPosApi.stayMember(null, sid),
  linkMember: (_id, sid, cid) => ghPosApi.linkMember(null, sid, cid),
  usePoints: (_id, sid, p) => ghPosApi.usePoints(null, sid, p),
  undoPoints: (_id, sid) => ghPosApi.undoPoints(null, sid),
  boot: () =>
    tryServer(
      async () => {
        const r = await ghPosApi.boot();
        if (cache) {
          cache.boot = r.data;
          saveCache();
        }
        return r;
      },
      () => ({ data: cache.boot, offline: true }),
    ),
  today: () =>
    tryServer(
      () => ghPosApi.today(),
      () => ({ data: todayLocal() }),
    ),
  stays: (_id, params) =>
    tryServer(
      () => ghPosApi.stays(null, params),
      () => ({ data: staysLocal(params) }),
    ),
  stay: (_id, sid) =>
    tryServer(
      async () => {
        if (String(sid).startsWith("local-")) return { data: dress(findStay(sid)) };
        const r = await ghPosApi.stay(null, sid);
        putStay(r.data);
        return r;
      },
      () => {
        const s = findStay(sid);
        if (!s) throw bad("Not found", "not_found");
        return { data: dress(s) };
      },
    ),
  guests: (_id, q) =>
    tryServer(
      () => ghPosApi.guests(null, q),
      () => {
        const t = String(q || "").toLowerCase();
        const seen = new Map();
        for (const s of cache.stays) {
          const g = s.guest || {};
          if (
            ![g.name, g.phone, g.id_number].some((v) =>
              String(v || "")
                .toLowerCase()
                .includes(t),
            )
          )
            continue;
          const k = `${String(g.name).toLowerCase()}|${g.phone}`;
          if (!seen.has(k)) seen.set(k, { ...g, last: s.from, stays: 0 });
          seen.get(k).stays += 1;
        }
        return { data: [...seen.values()].slice(0, 10) };
      },
    ),
  book: (_id, data) => {
    const body = { ...data, client_id: data.client_id || uid() };
    return write1(
      () => ghPosApi.book(null, body),
      () => {
        const today = localDay();
        if (body.check_in_now && body.from !== today) throw bad("Walk-in must start today", "walk_in_today");
        if (takenLocal(body.room_id, body.from, body.to)) throw bad("Room taken", "taken");
        const id = `local-${body.client_id}`;
        const s = {
          _id: id,
          client_id: body.client_id,
          no: `OFF-${body.client_id.slice(0, 4).toUpperCase()}`,
          room_id: body.room_id,
          status: body.check_in_now ? "in" : "booked",
          from: body.from,
          to: body.to,
          rate: Number(body.rate) || 0,
          guest: { name: "", phone: "", id_type: "id_card", id_number: "", nationality: "", ...body.guest },
          adults: body.adults || 1,
          children: body.children || 0,
          source: body.source || (body.check_in_now ? "walk_in" : "phone"),
          note: body.note || "",
          charges: [],
          discount: 0,
          payments: body.deposit > 0 ? [{ _id: `local-${uid()}`, method: body.method || "cash", amount: Number(body.deposit), note: body.check_in_now ? "" : "deposit", at: new Date().toISOString(), by: who() }] : [],
          checked_in_at: body.check_in_now ? new Date().toISOString() : null,
          by: who(),
          created_date: new Date().toISOString(),
          offline: true,
        };
        enqueue({ kind: "book", sid: id, body, label: s.guest.name });
        return putStay(s);
      },
    );
  },
  updateStay: (_id, sid, data) =>
    write1(
      () => ghPosApi.updateStay(null, sid, data),
      () => {
        const s = findStay(sid);
        if (!s) throw bad("Not found", "not_found");
        const next = { ...s, ...data, guest: { ...s.guest, ...(data.guest || {}) } };
        if (takenLocal(next.room_id, next.from, next.to, sid)) throw bad("Room taken", "taken");
        enqueue({ kind: "update", sid, body: data, label: s.guest.name });
        return putStay(next);
      },
    ),
  action: (_id, sid, action, body = {}) =>
    write1(
      () => ghPosApi.action(null, sid, action, body),
      () => {
        const s = applyLocal(action, sid, body);
        enqueue({ kind: action, sid, body, label: s.guest?.name });
        return s;
      },
    ),
  addCharge: (_id, sid, data) => {
    const body = { ...data, client_id: uid() };
    return write1(
      () => ghPosApi.addCharge(null, sid, body),
      () => {
        const s = findStay(sid);
        if (!s) throw bad("Not found", "not_found");
        enqueue({ kind: "charge", sid, body, label: s.guest.name });
        return putStay({ ...s, charges: [...(s.charges || []), { _id: `local-${body.client_id}`, label: body.label, amount: Number(body.amount), qty: Number(body.qty) || 1, at: new Date().toISOString(), by: who(), client_id: body.client_id }] });
      },
    );
  },
  addPayment: (_id, sid, data) => {
    const body = { ...data, client_id: uid() };
    return write1(
      () => ghPosApi.addPayment(null, sid, body),
      () => {
        const s = findStay(sid);
        if (!s) throw bad("Not found", "not_found");
        enqueue({ kind: "payment", sid, body, label: s.guest.name });
        return putStay({
          ...s,
          payments: [...(s.payments || []), { _id: `local-${body.client_id}`, method: body.method || "cash", amount: Number(body.amount), note: body.note || "", at: new Date().toISOString(), by: who(), client_id: body.client_id }],
        });
      },
    );
  },
  removeCharge: (_id, sid, cid) =>
    write1(
      () => ghPosApi.removeCharge(null, sid, cid),
      () => {
        const s = findStay(sid);
        if (String(cid).startsWith("local-")) queue = queue.filter((q) => !(q.kind === "charge" && `local-${q.body.client_id}` === cid));
        else enqueue({ kind: "remove-charge", sid, lid: cid, label: s?.guest?.name });
        saveQueue();
        return putStay({ ...s, charges: (s.charges || []).filter((c) => c._id !== cid) });
      },
    ),
  removePayment: (_id, sid, pid) =>
    write1(
      () => ghPosApi.removePayment(null, sid, pid),
      () => {
        const s = findStay(sid);
        if (String(pid).startsWith("local-")) queue = queue.filter((q) => !(q.kind === "payment" && `local-${q.body.client_id}` === pid));
        else enqueue({ kind: "remove-payment", sid, lid: pid, label: s?.guest?.name });
        saveQueue();
        return putStay({ ...s, payments: (s.payments || []).filter((p) => p._id !== pid) });
      },
    ),
  discount: (_id, sid, discount) =>
    write1(
      () => ghPosApi.discount(null, sid, discount),
      () => {
        const s = findStay(sid);
        enqueue({ kind: "discount", sid, body: { discount }, label: s?.guest?.name });
        return putStay({ ...s, discount: Number(discount) || 0 });
      },
    ),
};

// keep trying: every 20 s, and as soon as the browser says it is online again
let timer = null;
export function startSync() {
  if (timer) return;
  const tick = async () => {
    if (needLogin() && heldPin) {
      try {
        const r = await ghPosApi.login(heldPin);
        session.set(r.data.session);
        rememberSession(r.data.staff._id, r.data.session);
        cache.offline_staff = null;
        saveCache();
        try {
          localStorage.removeItem("bizhub_gh_offline_staff");
        } catch {
          /* private mode */
        }
        setOnline(true);
      } catch (e) {
        if (isNet(e)) return setOnline(false);
        heldPin = ""; // PIN changed meanwhile: the PIN screen will ask
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
