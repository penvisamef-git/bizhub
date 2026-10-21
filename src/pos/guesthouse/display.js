import { ghPosApi } from "./ghApi";

// The guest display: a second window on the same computer (BroadcastChannel), or a tablet that reads a key
const CHANNEL = "bizhub-gh-display";
let channel = null;
let last = null;
let remote = false;
let timer = null;
const chan = () => {
  if (!channel && typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (e) => e.data?.type === "hello" && last && channel.postMessage({ type: "state", state: last });
  }
  return channel;
};

// what the guest sees, from the desk's boot data + the open bill (or null)
export function pictureOf(boot, stay, lang) {
  const s = boot.settings;
  const base = {
    business: { name: boot.business.name, logo: boot.business.logo_url, phone: boot.business.phone },
    image: s.display_image || s.cover || "",
    theme: boot.display?.theme || "classic",
    cur: s.currency,
    lang,
    check_in: s.check_in,
    check_out: s.check_out,
    at: Date.now(),
  };
  if (!stay || ["cancelled", "no_show"].includes(stay.status)) return { ...base, mode: "idle" };
  const b = stay.bill;
  return {
    ...base,
    mode: b.balance === 0 && stay.status === "out" ? "thanks" : "bill",
    pay_qr: b.balance > 0 ? s.pay_qr : "",
    pay_qr_label: s.pay_qr_label,
    stay: {
      no: stay.no,
      room: stay.room_name,
      guest: stay.guest.name,
      from: stay.from,
      to: stay.to,
      nights: b.nights,
      rate: stay.rate,
      room_total: b.room,
      lines: (stay.charges || []).map((c) => ({ label: c.qty > 1 ? `${c.label} × ${c.qty}` : c.label, amount: c.amount * c.qty })),
      discount: b.discount,
      total: b.total,
      paid: b.paid,
      balance: b.balance,
    },
  };
}

export function showOnDisplay(state) {
  last = state;
  chan()?.postMessage({ type: "state", state });
  if (remote) {
    clearTimeout(timer);
    timer = setTimeout(() => ghPosApi.pushDisplay(state).catch(() => {}), 400);
  }
}
export const openDisplayWindow = () => window.open("/pos/guest-house/display", "bizhub-gh-display", "popup,width=1024,height=640");
export async function remoteKey() {
  const r = await ghPosApi.displayKey();
  remote = true;
  if (last) showOnDisplay(last);
  return r.data.key;
}
export const listen = (fn) => {
  const c = chan();
  if (!c) return () => {};
  const h = (e) => e.data?.type === "state" && fn(e.data.state);
  c.addEventListener("message", h);
  c.postMessage({ type: "hello" });
  return () => c.removeEventListener("message", h);
};
