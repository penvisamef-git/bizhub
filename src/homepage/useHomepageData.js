import { useEffect, useMemo, useState } from "react";
import { publicGet } from "../api/client";
import { useI18n } from "../i18n/I18nProvider";
import { DEFAULT_HOMEPAGE } from "./defaults";
import { HOME_TEXT, SERVICE_DETAILS, START_STEPS, SERVICE_ORDER, typeOf } from "./content";

const KM_DIGITS = "០១២៣៤៥៦៧៨៩";
export const toKhmerDigits = (value) => String(value).replace(/\d/g, (d) => KM_DIGITS[d]);

// "KHQR, ABA or Card" / "KHQR, ABA ឬ Card"
function joinMethods(list, lang) {
  const items = (list || []).filter(Boolean);
  if (items.length <= 1) return items.join("");
  const last = items[items.length - 1];
  return `${items.slice(0, -1).join(", ")} ${lang === "km" ? "ឬ" : "or"} ${last}`;
}

// Replace {pack} {price} {bonus} {payments} in every string (also inside arrays / objects)
export function fill(value, vars) {
  if (typeof value === "string") return value.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  if (Array.isArray(value)) return value.map((v) => fill(v, vars));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, vars)]));
  }
  return value;
}

function mergeSettings(remote) {
  const d = DEFAULT_HOMEPAGE;
  if (!remote) return d;
  return {
    ...d,
    ...remote,
    contact: { ...d.contact, ...(remote.contact || {}) },
    powered_by: { ...d.powered_by, ...(remote.powered_by || {}) },
    coin: { ...d.coin, ...(remote.coin || {}) },
    app: { ...d.app, ...(remote.app || {}) },
    payment_methods: remote.payment_methods?.length ? remote.payment_methods : d.payment_methods,
    prices: { ...d.prices, ...(remote.prices || {}) },
    yearly: remote.yearly?.length ? remote.yearly : d.yearly,
    // the admin's list + any newer service it doesn't have yet (shown, at the end)
    services: remote.services?.length ? [...remote.services, ...d.services.filter((x) => !remote.services.some((r) => r.key === x.key))] : d.services,
    groups: Array.isArray(remote.groups) && remote.groups.length ? withNewTypes(remote.groups, d.groups) : d.groups,
    texts: { en: { ...(remote.texts?.en || {}) }, km: { ...(remote.texts?.km || {}) } },
  };
}

// a service added after the admin saved the groups (e.g. Event Tickets) goes into its default group
function withNewTypes(groups, defaults) {
  const used = new Set(groups.flatMap((g) => g.types || []));
  return groups.map((g) => {
    const def = defaults.find((x) => x.key === g.key);
    const add = (def?.types || []).filter((k) => !used.has(k));
    return add.length ? { ...g, types: [...(g.types || []), ...add] } : g;
  });
}

let cache = null; // keep the settings while the visitor moves between pages
// after the super admin saves (e.g. Business groups): pages opened next use the new values
export function setHomepageCache(patch) {
  if (cache) cache = { ...cache, ...patch };
}

// groups → [{ key, label, keys: [homepage service keys] }] (+ "More" for services in no group)
export function groupsOf(settings, lang, all = SERVICE_ORDER) {
  const out = (settings.groups || []).map((g) => ({ key: g.key, label: (lang === "km" ? g.km : g.en) || g.en || g.key, keys: (g.types || []).filter((k) => all.includes(k)) }));
  const used = new Set(out.flatMap((g) => g.keys));
  const rest = all.filter((k) => !used.has(k));
  if (rest.length) out.push({ key: "more", label: lang === "km" ? "ផ្សេងៗ" : "More", keys: rest });
  return out.filter((g) => g.keys.length);
} // keep the settings while the visitor moves between pages

/**
 * Homepage data = defaults + what the super admin saved (GET /api/public/homepage).
 * Returns text for the current language with placeholders filled in.
 */
export default function useHomepageData() {
  const { lang } = useI18n();
  const [remote, setRemote] = useState(cache);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    publicGet("/homepage")
      .then((res) => {
        cache = res.data || null;
        if (alive) setRemote(cache);
      })
      .catch(() => {
        /* keep defaults when the API is offline */
      });
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const settings = mergeSettings(remote);
    const km = lang === "km";
    const num = (n) => (km ? toKhmerDigits(n) : String(n));
    const vars = {
      pack: num(settings.coin.pack_coins),
      price: num(settings.coin.pack_price_usd),
      bonus: num(settings.coin.signup_bonus),
      payments: joinMethods(settings.payment_methods, lang),
    };
    const t = fill({ ...HOME_TEXT[lang], ...(settings.texts?.[lang] || {}) }, vars);
    const details = fill(SERVICE_DETAILS[lang], vars);
    const steps = fill(START_STEPS[lang], vars);

    // services the admin turned on, in the admin's order
    const known = new Set(SERVICE_ORDER);
    const services = settings.services
      .filter((s) => s.enabled !== false && known.has(s.key))
      .map((s) => {
        const type = typeOf(s.key);
        const coins = Number(settings.prices?.[type]) || 0;
        const usd = Math.round(((coins * settings.coin.pack_price_usd) / (settings.coin.pack_coins || 100)) * 100) / 100;
        return { ...s, ...details[s.key], type, price: { coins, usd, yearly: settings.yearly.includes(type) } };
      });

    return { settings, t, services, steps, vars, lang, groups: groupsOf(settings, lang) };
  }, [remote, lang]);
}
