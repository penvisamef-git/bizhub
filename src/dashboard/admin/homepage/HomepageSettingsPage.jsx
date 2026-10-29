import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ExternalLink, Plus, RotateCcw, Search, X } from "lucide-react";
import "./homepage-settings.css";
import { useI18n } from "../../../i18n/I18nProvider";
import { homepageService } from "../../../api/services";
import TelegramBotCard from "./TelegramBotCard";
import { DEFAULT_HOMEPAGE } from "../../../homepage/defaults";
import { HOME_TEXT, SERVICE_DETAILS } from "../../../homepage/content";
import { PageSkeleton } from "../../../components/skeleton/Skeleton";

const clone = (v) => JSON.parse(JSON.stringify(v));

// Fill missing parts with defaults so the form always has every field
function normalize(data) {
  const d = DEFAULT_HOMEPAGE;
  const src = data || {};
  return {
    contact: { ...d.contact, ...(src.contact || {}) },
    powered_by: { ...d.powered_by, ...(src.powered_by || {}) },
    coin: { ...d.coin, ...(src.coin || {}) },
    prices: { ...d.prices, ...(src.prices || {}) },
    payment_methods: src.payment_methods?.length ? [...src.payment_methods] : [...d.payment_methods],
    app: { ...d.app, ...(src.app || {}) },
    // saved list (without the old "warehouse") + newer services it doesn't have yet
    services: src.services?.length ? [...clone(src.services).filter((x) => x.key !== "warehouse"), ...clone(d.services).filter((x) => !src.services.some((r) => r.key === x.key))] : clone(d.services),
    texts: { en: { ...(src.texts?.en || {}) }, km: { ...(src.texts?.km || {}) } },
  };
}

function Field({ label, hint, children }) {
  return (
    <label className="hp-field">
      <span>
        {label}
        {hint && <small> · {hint}</small>}
      </span>
      {children}
    </label>
  );
}

/**
 * Super admin: edit everything shown on the public homepage.
 * GET /api/admin/homepage → form; Save → PUT /api/admin/homepage
 */
export default function HomepageSettingsPage() {
  const { t, lang } = useI18n();
  const [saved, setSaved] = useState(null); // last saved copy
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ loading: true, saving: false, error: "", ok: "" });
  const [textLang, setTextLang] = useState(lang);
  const [query, setQuery] = useState("");
  const [newMethod, setNewMethod] = useState("");

  const load = async () => {
    setStatus({ loading: true, saving: false, error: "", ok: "" });
    try {
      const res = await homepageService.get();
      const data = normalize(res.data);
      setSaved(data);
      setForm(clone(data));
      setStatus({ loading: false, saving: false, error: "", ok: "" });
    } catch (err) {
      setStatus({ loading: false, saving: false, error: err.code === "NETWORK" ? t.networkError : err.message || t.loadFail, ok: "" });
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = useMemo(() => form && saved && JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  // warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return undefined;
    const onLeave = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const set = (section, key) => (e) => {
    const value = e.target.type === "number" ? e.target.value : e.target.value;
    setForm((f) => ({ ...f, [section]: { ...f[section], [key]: value } }));
  };

  const save = async () => {
    setStatus((s) => ({ ...s, saving: true, error: "", ok: "" }));
    // send numbers as numbers and drop empty text overrides
    const texts = { en: {}, km: {} };
    ["en", "km"].forEach((l) =>
      Object.entries(form.texts[l]).forEach(([k, v]) => {
        if (typeof v === "string" && v.trim() !== "") texts[l][k] = v;
      }),
    );
    const payload = {
      contact: {
        ...form.contact,
        phones: (Array.isArray(form.contact.phones) ? form.contact.phones : String(form.contact.phones).split("\n")).map((p) => p.trim()).filter(Boolean),
      },
      powered_by: { name: String(form.powered_by.name || "").trim(), url: String(form.powered_by.url || "").trim(), on: form.powered_by.on !== false },
      payment_methods: form.payment_methods.map((m) => m.trim()).filter(Boolean),
      app: form.app,
      services: form.services.map((s, i) => ({ ...s, sort_order: i })),
      texts,
    };
    try {
      const res = await homepageService.update(payload);
      const data = normalize(res.data);
      setSaved(data);
      setForm(clone(data));
      setStatus({ loading: false, saving: false, error: "", ok: t.saved });
    } catch (err) {
      setStatus({ loading: false, saving: false, error: err.code === "NETWORK" ? t.networkError : err.message, ok: "" });
    }
  };

  useEffect(() => {
    if (!status.ok) return undefined;
    const timer = setTimeout(() => setStatus((s) => ({ ...s, ok: "" })), 3500);
    return () => clearTimeout(timer);
  }, [status.ok]);

  if (status.loading) {
    return <PageSkeleton />;
  }
  if (!form) {
    return (
      <div className="panel-card hp-state">
        <p className="form-alert error">{status.error || t.loadFail}</p>
        <button type="button" className="btn btn-primary" onClick={load}>
          {t.retry}
        </button>
      </div>
    );
  }

  const phonesText = Array.isArray(form.contact.phones) ? form.contact.phones.join("\n") : form.contact.phones;
  const names = { namecard: "cCard", restaurant: "cRestaurant", mart: "cMart", guest: "cGuest", warehouse: "cWarehouse", attend: "cAttend", website: "cWeb", menu_qr: "cMenuQr", flipbook: "cFlip", qr_gen: "cQr", debt_book: "cDebt", digital_note: "cNote", stamp_card: "cStamp", event: "cEvent", tg_store: "cTgStore" };
  const serviceName = (key) => HOME_TEXT[lang][names[key]] || SERVICE_DETAILS[lang][key]?.title || key;

  const moveService = (i, dir) =>
    setForm((f) => {
      const list = [...f.services];
      const j = i + dir;
      if (j < 0 || j >= list.length) return f;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...f, services: list };
    });
  const toggleService = (i, key) => setForm((f) => ({ ...f, services: f.services.map((s, idx) => (idx === i ? { ...s, [key]: !s[key] } : s)) }));

  const textKeys = Object.keys(HOME_TEXT[textLang]).filter((k) => typeof HOME_TEXT[textLang][k] === "string");
  const q = query.trim().toLowerCase();
  const shownKeys = textKeys.filter((k) => !q || k.toLowerCase().includes(q) || HOME_TEXT[textLang][k].toLowerCase().includes(q) || (form.texts[textLang][k] || "").toLowerCase().includes(q));
  const setText = (k, v) => setForm((f) => ({ ...f, texts: { ...f.texts, [textLang]: { ...f.texts[textLang], [k]: v } } }));

  return (
    <div className="hp">
      <div className="page-head hp-head">
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{t.hpTitle}</h2>
          <p>{t.hpSub}</p>
        </div>
        <a className="btn btn-secondary" href="/" target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> {t.viewSite}
        </a>
      </div>

      <div className="hp-grid">
        {/* ---------- contact ---------- */}
        <section className="panel-card">
          <h2>{t.hpContact}</h2>
          <div className="hp-fields">
            <Field label={t.hpPhones} hint={t.hpPhonesHint}>
              <textarea rows={2} value={phonesText} onChange={(e) => setForm((f) => ({ ...f, contact: { ...f.contact, phones: e.target.value.split("\n") } }))} />
            </Field>
            <Field label={t.hpEmail}>
              <input type="email" value={form.contact.email} onChange={set("contact", "email")} />
            </Field>
            <Field label={t.hpTelegram}>
              <input value={form.contact.telegram} onChange={set("contact", "telegram")} />
            </Field>
            <Field label={t.hpTelegramUrl}>
              <input type="url" placeholder="https://t.me/..." value={form.contact.telegram_url} onChange={set("contact", "telegram_url")} />
            </Field>
            <Field label={t.hpFacebook}>
              <input type="url" placeholder="https://facebook.com/..." value={form.contact.facebook_url} onChange={set("contact", "facebook_url")} />
            </Field>
            <p className="muted small" style={{ gridColumn: "1 / -1", margin: "8px 0 0" }}>
              {t.hpFollow}
            </p>
            <Field label={t.hpTgChannel}>
              <input type="url" placeholder="https://t.me/..." value={form.contact.tg_channel_url || ""} onChange={set("contact", "tg_channel_url")} data-testid="hp-tg-channel" />
            </Field>
            <Field label={t.hpTiktok}>
              <input type="url" placeholder="https://www.tiktok.com/@..." value={form.contact.tiktok_url || ""} onChange={set("contact", "tiktok_url")} data-testid="hp-tiktok" />
            </Field>
            <Field label={t.hpYoutube}>
              <input type="url" placeholder="https://www.youtube.com/@..." value={form.contact.youtube_url || ""} onChange={set("contact", "youtube_url")} data-testid="hp-youtube" />
            </Field>
            <Field label={t.hpCoolapp}>
              <input type="url" placeholder="https://channel.coolapp.com.kh/@..." value={form.contact.coolapp_url || ""} onChange={set("contact", "coolapp_url")} data-testid="hp-coolapp" />
            </Field>
            <Field label={t.hpMap}>
              <input type="url" value={form.contact.map_url} onChange={set("contact", "map_url")} />
            </Field>
            <Field label={t.hpAddress}>
              <input value={form.contact.address} onChange={set("contact", "address")} />
            </Field>
          </div>
        </section>

        {/* ---------- coins + prices: moved to their own page (Super admin → Prices) ---------- */}
        <section className="panel-card hp-moved">
          <h2>{t.hpCoins}</h2>
          <p className="hp-preview" style={{ marginTop: 0 }}>
            {t.hpPricesMoved}{" "}
            <Link to="/app/super-admin/prices" className="sa-link">
              {t.navPrices} →
            </Link>
          </p>
        </section>

        {/* ---------- Powered by (v3.3.0) ---------- */}
        <section className="panel-card">
          <h2>{t.hpPowered}</h2>
          <p className="hp-hint">{t.hpPoweredHint}</p>
          <div className="hp-fields">
            <Field label={t.hpPoweredName}>
              <input value={form.powered_by.name} maxLength={60} onChange={set("powered_by", "name")} data-testid="hp-powered-name" />
            </Field>
            <Field label={t.hpPoweredUrl}>
              <input type="url" placeholder="https://..." value={form.powered_by.url} onChange={set("powered_by", "url")} data-testid="hp-powered-url" />
            </Field>
            <label className="hp-check">
              <input type="checkbox" checked={form.powered_by.on !== false} onChange={(e) => setForm((f) => ({ ...f, powered_by: { ...f.powered_by, on: e.target.checked } }))} data-testid="hp-powered-on" />
              {t.hpPoweredOn}
            </label>
          </div>
        </section>

        {/* ---------- app ---------- */}
        <section className="panel-card">
          <h2>{t.hpApp}</h2>
          <div className="hp-fields">
            <Field label={t.hpAppStatus}>
              <select value={form.app.status} onChange={set("app", "status")}>
                <option value="coming_soon">{t.hpAppSoon}</option>
                <option value="live">{t.hpAppLive}</option>
              </select>
            </Field>
            <Field label={t.hpAndroid}>
              <input type="url" value={form.app.android_url} onChange={set("app", "android_url")} />
            </Field>
            <Field label={t.hpIos}>
              <input type="url" value={form.app.ios_url} onChange={set("app", "ios_url")} />
            </Field>
          </div>
        </section>

        {/* ---------- services ---------- */}
        <section className="panel-card">
          <h2>{t.hpServices}</h2>
          <p className="hp-hint">{t.hpServicesHint}</p>
          <ul className="hp-services">
            {form.services.map((s, i) => (
              <li key={s.key} className={s.enabled === false ? "off" : ""}>
                <span className="order">{i + 1}</span>
                <b>{serviceName(s.key)}</b>
                <label className="hp-check">
                  <input type="checkbox" checked={s.enabled !== false} onChange={() => toggleService(i, "enabled")} />
                  {t.hpShow}
                </label>
                <label className="hp-check">
                  <input type="checkbox" checked={!!s.coming_soon} onChange={() => toggleService(i, "coming_soon")} />
                  {t.hpSoonLabel}
                </label>
                <span className="moves">
                  <button type="button" className="icon-btn" aria-label={t.hpUp} disabled={i === 0} onClick={() => moveService(i, -1)}>
                    <ArrowUp size={16} />
                  </button>
                  <button type="button" className="icon-btn" aria-label={t.hpDown} disabled={i === form.services.length - 1} onClick={() => moveService(i, 1)}>
                    <ArrowDown size={16} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <TelegramBotCard lang={lang} />

      {/* ---------- texts ---------- */}
      <section className="panel-card" style={{ marginTop: 16 }}>
        <div className="hp-texts-head">
          <h2 style={{ margin: 0 }}>{t.hpTexts}</h2>
          <div className="lang-switch" role="group" aria-label={t.language}>
            <button type="button" aria-pressed={textLang === "en"} onClick={() => setTextLang("en")}>
              English
            </button>
            <button type="button" aria-pressed={textLang === "km"} onClick={() => setTextLang("km")}>
              ខ្មែរ
            </button>
          </div>
        </div>
        <p className="hp-hint">{t.hpTextsHint}</p>
        <label className="hp-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder={t.hpSearch} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t.hpSearch} />
        </label>
        <div className="hp-texts">
          {shownKeys.map((k) => {
            const value = form.texts[textLang][k] || "";
            const changed = value.trim() !== "";
            return (
              <div key={k} className={`hp-text${changed ? " changed" : ""}`}>
                <div className="hp-text-top">
                  <code>{k}</code>
                  {changed && <span className="hp-tag">{t.hpChanged}</span>}
                  {changed && (
                    <button type="button" className="hp-reset" onClick={() => setText(k, "")}>
                      <RotateCcw size={13} /> {t.hpReset}
                    </button>
                  )}
                </div>
                <textarea rows={HOME_TEXT[textLang][k].length > 70 ? 3 : 1} value={value} placeholder={HOME_TEXT[textLang][k]} onChange={(e) => setText(k, e.target.value)} lang={textLang} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- save bar ---------- */}
      {(dirty || status.ok || status.error) && (
        <div className="hp-savebar" role="status">
          <span className={status.error ? "err" : status.ok ? "ok" : ""}>{status.error || status.ok || t.unsaved}</span>
          {dirty && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setForm(clone(saved))} disabled={status.saving}>
                {t.discard}
              </button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={status.saving}>
                {status.saving && <span className="spinner" aria-hidden="true" />}
                {status.saving ? t.saving : t.save}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
