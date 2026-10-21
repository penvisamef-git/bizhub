// Customer screen (mart_display): the POS tells a second window (same computer, BroadcastChannel, works offline)
// what the customer should see: idle → the cart + total → paying (QR) → thank you (+ change)
export const CHANNEL = "bizhub-mart-display";
let channel = null;
let last = { mode: "idle" };
let timer = null;

function open() {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  channel = new BroadcastChannel(CHANNEL);
  // a screen that just opened asks for the picture now
  channel.onmessage = (e) => {
    if (e.data?.type === "hello") channel.postMessage(last);
  };
  return channel;
}
export function showOnDisplay(pic) {
  last = { v: 1, at: Date.now(), ...pic };
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      open()?.postMessage(last);
    } catch {
      /* window closed */
    }
  }, 80);
}
export function openDisplayWindow() {
  open();
  const w = window.open("/pos/mini-mart/display", "bizhub-mart-display", "popup,width=1024,height=700");
  w?.focus();
}
