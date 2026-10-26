import { useEffect, useMemo, useState } from "react";
import { BookOpen, BedDouble, Coins, Fingerprint, Globe, IdCard, NotebookPen, StickyNote, QrCode, RotateCcw, ScanLine, Search, Send, ShoppingBasket, Stamp, UtensilsCrossed } from "lucide-react";
import "../master_data/masterdata.css";
import "../../client/namecard/namecard-editor.css";
import "./prices.css";
import { useI18n } from "../../../i18n/I18nProvider";
import { homepageService } from "../../../api/services";
import { DEFAULT_HOMEPAGE } from "../../../homepage/defaults";
import { PageSkeleton } from "../../../components/skeleton/Skeleton";
import { PRICE_GROUPS } from "./catalog";
import { BizTypeChips } from "../../super_admin/BizTypes";

const ICONS = { IdCard, UtensilsCrossed, Fingerprint, BedDouble, ShoppingBasket, QrCode, BookOpen, ScanLine, Globe, NotebookPen, Stamp, StickyNote, Send };
const TEXT = {
  en: {
    title: "Prices",
    sub: "Every coin price in one place, by business type. Changes apply to new purchases at once.",
    coins: "Coin pack",
    packCoins: "Coins per pack",
    packPrice: "Pack price (USD)",
    bonus: "Free coins at sign-up",
    shown: "Shown on the website as",
    search: "Search a service…",
    units: { business: "to add", year: "per year", once: "one time · forever", each: "each · forever" },
    soon: "Coming soon",
    free: "Free",
    changed: "changed",
    save: "Save prices",
    saving: "Saving…",
    saved: "Prices saved.",
    undo: "Undo changes",
    unsaved: "{n} unsaved changes",
    allSaved: "All saved",
    usd: "≈ ${v}",
    none: "No service matches.",
  },
  km: {
    title: "តម្លៃ",
    sub: "តម្លៃកាក់ទាំងអស់នៅកន្លែងតែមួយ តាមប្រភេទអាជីវកម្ម។ ការកែប្រែមានប្រសិទ្ធភាពភ្លាមៗ សម្រាប់ការទិញថ្មី។",
    coins: "កញ្ចប់កាក់",
    packCoins: "ចំនួនកាក់ក្នុងមួយកញ្ចប់",
    packPrice: "តម្លៃកញ្ចប់ (ដុល្លារ)",
    bonus: "កាក់ឥតគិតថ្លៃពេលចុះឈ្មោះ",
    shown: "បង្ហាញលើគេហទំព័រ",
    search: "ស្វែងរកសេវាកម្ម…",
    units: { business: "ពេលបន្ថែម", year: "ក្នុងមួយឆ្នាំ", once: "បង់ម្តង · ជារៀងរហូត", each: "មួយៗ · ជារៀងរហូត" },
    soon: "នឹងមានឆាប់ៗ",
    free: "ឥតគិតថ្លៃ",
    changed: "បានកែ",
    save: "រក្សាទុកតម្លៃ",
    saving: "កំពុងរក្សាទុក…",
    saved: "បានរក្សាទុកតម្លៃ។",
    undo: "បោះបង់ការកែប្រែ",
    unsaved: "ការកែប្រែ {n} មិនទាន់រក្សាទុក",
    allSaved: "បានរក្សាទុកទាំងអស់",
    usd: "≈ ${v}",
    none: "រកមិនឃើញសេវាកម្ម។",
  },
};

// Super admin → Prices: coin pack + the price of every service, grouped by business type
export default function PricesPage() {
  const { lang } = useI18n();
  const p = TEXT[lang] || TEXT.en;
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState(""); // business type
  const [state, setState] = useState({ saving: false, error: "", ok: "" });

  useEffect(() => {
    homepageService
      .get()
      .then((res) => {
        const d = DEFAULT_HOMEPAGE;
        const data = { coin: { ...d.coin, ...(res.data?.coin || {}) }, prices: { ...d.prices, ...(res.data?.prices || {}) } };
        setSaved(data);
        setForm(JSON.parse(JSON.stringify(data)));
      })
      .catch((e) => setState({ saving: false, error: e.message, ok: "" }));
  }, []);

  const changes = useMemo(() => {
    if (!form || !saved) return 0;
    let n = 0;
    for (const k of Object.keys(form.prices)) if (Number(form.prices[k]) !== Number(saved.prices[k])) n += 1;
    for (const k of Object.keys(form.coin)) if (Number(form.coin[k]) !== Number(saved.coin[k])) n += 1;
    return n;
  }, [form, saved]);

  if (!form) return state.error ? <div className="md-notice md-notice-error">{state.error}</div> : <PageSkeleton />;
  const usdPerCoin = Number(form.coin.pack_price_usd) / Math.max(1, Number(form.coin.pack_coins));
  const setPrice = (k) => (e) => setForm({ ...form, prices: { ...form.prices, [k]: e.target.value } });
  const setCoin = (k) => (e) => setForm({ ...form, coin: { ...form.coin, [k]: e.target.value } });
  const qq = q.trim().toLowerCase();
  const groups = PRICE_GROUPS.filter((g) => !type || g.key === type)
    .map((g) => ({ ...g, items: g.items.filter((i) => !qq || `${i.en} ${i.km} ${i.key} ${g.en} ${g.km}`.toLowerCase().includes(qq)) }))
    .filter((g) => g.items.length);

  const save = async () => {
    setState({ saving: true, error: "", ok: "" });
    try {
      const prices = Object.fromEntries(Object.entries(form.prices).map(([k, v]) => [k, Number(v)]));
      const coin = { pack_coins: Number(form.coin.pack_coins), pack_price_usd: Number(form.coin.pack_price_usd), signup_bonus: Number(form.coin.signup_bonus) };
      await homepageService.update({ prices, coin });
      const next = { coin, prices };
      setSaved(next);
      setForm(JSON.parse(JSON.stringify(next)));
      setState({ saving: false, error: "", ok: p.saved });
    } catch (e) {
      setState({ saving: false, error: e.message, ok: "" });
    }
  };

  return (
    <div className="md-page pr-page">
      <div className="pr-head">
        <p className="pr-muted pr-sub">{p.sub}</p>
        <div className="pr-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={p.search} aria-label={p.search} />
        </div>
      </div>
      <BizTypeChips value={type} onChange={setType} counts={Object.fromEntries(PRICE_GROUPS.map((g) => [g.key, g.items.length]))} total={PRICE_GROUPS.reduce((a, g) => a + g.items.length, 0)} types={PRICE_GROUPS.map((g) => g.key)} />
      {state.error && <div className="md-notice md-notice-error">{state.error}</div>}
      {state.ok && !changes && <div className="md-notice md-notice-success">{state.ok}</div>}

      {!qq && !type && (
        <section className="panel-card pr-group">
          <h2>
            <span className="pr-ic">
              <Coins size={18} />
            </span>
            {p.coins}
          </h2>
          <div className="pr-coin">
            <label>
              <span>{p.packCoins}</span>
              <input type="number" min="1" step="1" value={form.coin.pack_coins} onChange={setCoin("pack_coins")} />
            </label>
            <label>
              <span>{p.packPrice}</span>
              <input type="number" min="0" step="0.01" value={form.coin.pack_price_usd} onChange={setCoin("pack_price_usd")} />
            </label>
            <label>
              <span>{p.bonus}</span>
              <input type="number" min="0" step="1" value={form.coin.signup_bonus} onChange={setCoin("signup_bonus")} />
            </label>
          </div>
          <p className="pr-muted pr-shown">
            {p.shown}:{" "}
            <b>
              {form.coin.pack_coins} coins = ${form.coin.pack_price_usd}
            </b>{" "}
            · <b>+{form.coin.signup_bonus} free coins</b>
          </p>
        </section>
      )}

      {groups.length === 0 && <p className="pr-muted">{p.none}</p>}
      {groups.map((g) => {
        const Icon = ICONS[g.icon] || Coins;
        return (
          <section key={g.key} className="panel-card pr-group">
            <h2>
              <span className="pr-ic">
                <Icon size={18} />
              </span>
              {lang === "km" ? g.km : g.en} <small>{g.items.length}</small>
            </h2>
            <div className="pr-rows">
              {g.items.map((i) => {
                const v = form.prices[i.key];
                const changed = Number(v) !== Number(saved.prices[i.key]);
                return (
                  <label key={i.key} className={`pr-row ${changed ? "changed" : ""}`}>
                    <span className="pr-name">
                      <b>
                        {lang === "km" ? i.km : i.en}
                        {i.soon && <em className="pr-soon">{p.soon}</em>}
                        {changed && <em className="pr-changed">{p.changed}</em>}
                      </b>
                      <small>
                        {p.units[i.unit]}
                        {i.d_en ? ` · ${lang === "km" ? i.d_km : i.d_en}` : ""}
                      </small>
                    </span>
                    <span className="pr-input">
                      <input type="number" min="0" step="1" value={v} onChange={setPrice(i.key)} aria-label={lang === "km" ? i.km : i.en} />
                      <small>{Number(v) === 0 ? p.free : p.usd.replace("{v}", (Number(v) * usdPerCoin).toFixed(2))}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className={`ne-savebar ${changes ? "is-dirty" : ""}`} role="region" aria-live="polite">
        <span className="ne-savebar-text">{changes ? p.unsaved.replace("{n}", changes) : p.allSaved}</span>
        {changes > 0 && (
          <button type="button" className="md-btn md-btn-ghost" onClick={() => setForm(JSON.parse(JSON.stringify(saved)))} disabled={state.saving} aria-label={p.undo} title={p.undo}>
            <RotateCcw size={16} />
          </button>
        )}
        <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={!changes || state.saving}>
          {state.saving ? p.saving : p.save}
        </button>
      </div>
    </div>
  );
}
