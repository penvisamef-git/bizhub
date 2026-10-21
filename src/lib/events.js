// Tiny app-wide signals (no library needed)
const COINS = "bizhub:coins-changed";

// Call after generate / transfer so the sidebar balance updates right away
export const coinsChanged = () => window.dispatchEvent(new Event(COINS));

export function onCoinsChanged(fn) {
  window.addEventListener(COINS, fn);
  return () => window.removeEventListener(COINS, fn);
}
