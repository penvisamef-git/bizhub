// Customer display: what the guest sees on a second screen (their order, the total, "thank you").
//   same computer → a second window (BroadcastChannel, instant, no internet needed)
//   another tablet → this POS sends the same picture to the cloud; the tablet reads it (needs internet)
import { db } from "./db";
import { posApi } from "./api";
import { calcOrder, lineOff, lineTotal, otherCurrency } from "./calc";
import { getPos, money, subscribe, pointsFor } from "./engine";

export const CHANNEL = "bizhub-pos-display";
const THANKS_MS = 12000;
let channel = null;
let current = { orderId: null, thanks: null }; // thanks = { orderId, change, until }
let remoteKey = null;
let lastSent = "";
let timer = null;
let pushTimer = null;
let pushing = false;

// what the screen should show right now
function picture() {
  const s = getPos();
  const R = s.setup?.restaurant || {};
  const m = money();
  const restaurant = { name_km: R.name_km || "", name_en: R.name_en || "", logo: R.logo || "", color: R.color || "" };
  const other = m.currency === "USD" ? "KHR" : "USD";
  const orderOf = (o) => {
    const t = calcOrder(o, m);
    return {
      number: o.number,
      table: o.table_name || "",
      lines: (o.lines || [])
        .filter((l) => l.status !== "void")
        .map((l) => ({ id: l.id, qty: l.qty, name_km: l.name_km, name_en: l.name_en, size: l.size, addons: (l.addons || []).map((a) => a.name), total: lineTotal(l) - lineOff(l), full: lineTotal(l), promo: lineOff(l) > 0 ? (l.discount?.kind ? "−" + (l.discount.kind === "percent" ? `${l.discount.value}%` : "") : l.promo?.name || "") : "" })),
      totals: { subtotal: t.subtotal, discount: t.discount, service: t.service, vat: t.vat, vat_included: t.vat_included, total: t.total, other: otherCurrency(t.total, m), paid: t.paid, items: t.items },
      // reward points: the member on this bill and what it earns
      member: o.member?.id ? { name: o.member.name || "", earn: pointsFor(o) } : null,
    };
  };
  const look = s.setup?.display || null; // null = the "Customer display" add-on isn't bought
  const base = { v: 1, restaurant, look, currency: m.currency, other, rate: m.khr_rate };
  if (!look) return { ...base, mode: "locked" };
  if (current.thanks && Date.now() < current.thanks.until) {
    const o = s.orders[current.thanks.orderId];
    if (o) return { ...base, mode: "thanks", order: orderOf(o), change: current.thanks.change };
  }
  const o = current.orderId ? s.orders[current.orderId] : null;
  if (o && o.status === "open" && o.lines.some((l) => l.status !== "void")) return { ...base, mode: "order", order: orderOf(o) };
  return { ...base, mode: "idle" };
}

function publish() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const pic = picture();
    const text = JSON.stringify(pic);
    if (text === lastSent) return;
    lastSent = text;
    try {
      channel?.postMessage(pic);
    } catch {
      /* window closed */
    }
    if (remoteKey) pushRemote();
  }, 120);
}
// the cloud copy: at most about once a second
function pushRemote() {
  if (pushTimer) return;
  pushTimer = setTimeout(async () => {
    pushTimer = null;
    if (pushing || !getPos().online) return;
    pushing = true;
    try {
      await posApi.displayPush(getPos().token, JSON.parse(lastSent));
    } catch {
      /* try again on the next change */
    } finally {
      pushing = false;
    }
  }, 900);
}

let started = false;
export async function startDisplayFeed() {
  if (started) return;
  started = true;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL);
    // a display window that just opened asks for the current picture
    channel.onmessage = (e) => {
      if (e.data?.type === "hello") {
        lastSent = "";
        publish();
      }
    };
  }
  remoteKey = (await db.get("displayKey")) || null;
  subscribe(publish);
  publish();
}

// the order on screen (the POS calls this when an order opens / closes)
export function showOrder(orderId) {
  current = { ...current, orderId: orderId || null };
  publish();
}
// paid: "thank you" (and the change) for a few seconds
export function showThanks(orderId, change) {
  current = { orderId: null, thanks: { orderId, change: change || { usd: 0, khr: 0 }, until: Date.now() + THANKS_MS } };
  publish();
  setTimeout(publish, THANKS_MS + 200);
}

// another tablet as the display
export async function remoteDisplay(renew) {
  const { key } = await posApi.displayKey(getPos().token, renew);
  remoteKey = key;
  await db.set("displayKey", key);
  lastSent = "";
  publish();
  return key;
}
export async function remoteDisplayOff() {
  remoteKey = null;
  await db.del("displayKey");
}
export const remoteDisplayKey = () => remoteKey;
