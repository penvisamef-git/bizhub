import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import { ArrowLeft, BriefcaseBusiness, Check, Copy, Crown, IdCard, Download, ExternalLink, Eye, ImagePlus, Loader2, Lock, Plus, Trash2, Undo2 } from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "./namecard-editor.css";
import { namecardService } from "../../../api/services";
import { PUBLIC_SITE_URL } from "../../../config";
import { resizeImage } from "../../../lib/image";
import CardView, { CARD_RECIPES, COLORS, FREE_THEMES, PREMIUM_THEMES, recipeTone } from "../../../namecard/CardView";
import CoinIcon from "../../../components/CoinIcon";
import UnlockThemeModal from "./UnlockThemeModal";
import PortfolioEditor from "./PortfolioEditor";
import { useCardText } from "../../../namecard/text";
import { useNotice } from "../../super_admin/parts";
import { EditorSkeleton } from "../../../components/skeleton/Skeleton";
import MyBusinesses from "../../../components/MyBusinesses";

const CONTACT_FIELDS = ["phone1", "phone2", "email", "website", "address", "telegram", "facebook"];
const FIELDS = ["name", "job_title", "company", "bio", "theme", "color", "slug", "published", ...CONTACT_FIELDS, "extras"];
const MAX_EXTRAS = 6;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
const SAMPLE = { name: "Sokha", job_title: "Owner", company: "BizHub", bio: "" };

const pick = (card) => Object.fromEntries(FIELDS.map((k) => [k, k === "extras" ? (card?.extras || []).map((x) => ({ label: x.label || "", value: x.value || "" })) : (card?.[k] ?? "")]));
const same = (a, b) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");
const cardLink = (slug) => `${PUBLIC_SITE_URL}/public/card/${slug}`;

function ImageField({ label, value, kind, busy, onPick, onRemove, c, round }) {
  const inputRef = useRef(null);
  return (
    <div className="ne-image">
      <span className="ne-label">{label}</span>
      <div className="ne-image-row">
        <div className={`ne-thumb ${round ? "round" : ""}`}>{value ? <img src={value} alt="" /> : <ImagePlus size={20} />}</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onPick(kind, file);
          }}
        />
        <button type="button" className="md-btn md-btn-ghost" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={16} className="md-spin" /> : <ImagePlus size={16} />} {busy ? c.uploading : value ? c.change : c.upload}
        </button>
        {value && !busy && (
          <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => onRemove(kind)} aria-label={c.remove} title={c.remove}>
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function ThemeTile({ th, on, name, preview, onPick, locked, price, unlockedLabel }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={`ne-theme ${on ? "on" : ""} ${locked ? "locked" : ""}`} onClick={() => onPick(th)}>
      <span className="ne-theme-mini">
        <span className="ne-theme-scale">
          <CardView card={{ ...SAMPLE, ...preview, bio: "", theme: th }} compact />
        </span>
        {locked && (
          <span className="ne-lock">
            <Lock size={13} /> <CoinIcon size={14} /> {price}
          </span>
        )}
        {unlockedLabel && (
          <span className="ne-lock ne-owned">
            <Crown size={12} /> {unlockedLabel}
          </span>
        )}
      </span>
      <b>
        {on && <Check size={14} />} {name}
      </b>
    </button>
  );
}

// premium gallery: filter chips (light / dark / colour / serif / mono / owned) + "show more" in chunks of 24
const OLD_LOOK = {
  aurora: ["dark"], neon: ["dark"], luxury: ["dark", "serif"], tech: ["dark", "mono"], glass: ["color"], sunset: ["color"],
  split: ["light"], wave: ["light"], polaroid: ["light"], mono: ["light"], retro: ["light"], nature: ["light", "serif"],
};
const FILTERS = ["all", "light", "dark", "color", "serif", "mono", "owned"];
const CHUNK = 24;
function looksOf(th) {
  const r = CARD_RECIPES[th];
  if (!r) return OLD_LOOK[th] || [];
  return [recipeTone(th), ...(r.ft === "serif" || r.ft === "mono" ? [r.ft] : [])];
}
function PremiumGallery({ list, c, form, preview, isLocked, unlocked, price, onPick }) {
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(12 + CHUNK);
  const pass = (th) => filter === "all" || (filter === "owned" ? unlocked.includes(th) : looksOf(th).includes(filter));
  const shown = list.filter(pass);
  const F = c.themeFilters || {};
  return (
    <>
      <div className="ne-filters" role="tablist" aria-label={c.premiumThemes}>
        {FILTERS.map((f) => {
          const n = f === "all" ? list.length : list.filter((th) => (f === "owned" ? unlocked.includes(th) : looksOf(th).includes(f))).length;
          if (f === "owned" && n === 0) return null;
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={`ne-filter ${filter === f ? "on" : ""}`}
              onClick={() => {
                setFilter(f);
                setLimit(12 + CHUNK);
              }}
            >
              {F[f] || f} <small>{n}</small>
            </button>
          );
        })}
      </div>
      {shown.length === 0 && <p className="ne-none">{c.noThemes}</p>}
      <div className="ne-themes" role="radiogroup" aria-label={c.premiumThemes}>
        {shown.slice(0, limit).map((th) => (
          <ThemeTile key={th} th={th} on={form.theme === th} name={c.themeNames[th] || CARD_RECIPES[th]?.[c.lang] || CARD_RECIPES[th]?.en || th} preview={preview} onPick={onPick} locked={isLocked(th)} price={price} unlockedLabel={!isLocked(th) ? c.unlockedTag : ""} />
        ))}
      </div>
      {shown.length > limit && (
        <button type="button" className="md-btn ne-more" onClick={() => setLimit((n) => n + CHUNK)}>
          {(c.showMore || "Show more ({n})").replace("{n}", shown.length - limit)}
        </button>
      )}
    </>
  );
}

export default function NameCardEditor() {
  const { id } = useParams();
  const c = useCardText();
  const [card, setCard] = useState(null); // saved version
  const [form, setForm] = useState(null); // being edited
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(""); // "photo" | "cover"
  const [slugState, setSlugState] = useState(""); // ok | taken | bad
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState("");
  const [themes, setThemes] = useState({ free: FREE_THEMES, premium: PREMIUM_THEMES, price: 15 });
  const [unlocking, setUnlocking] = useState(null); // { theme, previous }
  const [licenses, setLicenses] = useState({});
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "portfolio" ? "portfolio" : "card";
  const [portfolioSeen, setPortfolioSeen] = useState(tab === "portfolio");
  useEffect(() => {
    if (tab === "portfolio") setPortfolioSeen(true);
  }, [tab]);
  const [notice, setNotice] = useNotice();

  const load = useCallback(() => {
    setError("");
    namecardService
      .get(id)
      .then((r) => {
        setCard(r.data);
        setForm(pick(r.data));
        setBusiness(r.business);
        if (r.themes?.free) setThemes(r.themes);
        setLicenses(r.licenses || {});
      })
      .catch((e) => setError(e.message || c.loadFail));
  }, [id, c.loadFail]);
  useEffect(load, [load]);

  const saved = useMemo(() => (card ? pick(card) : null), [card]);
  const dirty = useMemo(() => !!(saved && form && FIELDS.some((k) => !same(form[k], saved[k]))), [saved, form]);
  const unlocked = card?.unlocked_themes || [];
  const isLocked = (th) => themes.premium.includes(th) && !unlocked.includes(th);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));

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

  // live check of the short link
  useEffect(() => {
    if (!form || !card) return undefined;
    const slug = String(form.slug || "").toLowerCase();
    if (slug === card.slug) return setSlugState("ok");
    if (!SLUG_RE.test(slug)) return setSlugState("bad");
    const timer = setTimeout(() => {
      namecardService
        .checkSlug(slug, id)
        .then((r) => setSlugState(r.data.available ? "ok" : r.data.valid ? "taken" : "bad"))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [form?.slug, card, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // QR of the saved link
  useEffect(() => {
    if (!card?.slug) return;
    QRCode.toDataURL(cardLink(card.slug), { width: 600, margin: 2, color: { dark: "#16171b", light: "#ffffff" } }).then(setQr);
  }, [card?.slug]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await namecardService.update(id, { ...form, slug: String(form.slug).toLowerCase() });
      setCard(r.data);
      setForm(pick(r.data));
      setNotice({ type: "success", text: c.saved });
    } catch (e) {
      if (e.status === 402 && e.response?.theme) setUnlocking({ theme: e.response.theme, previous: card.theme });
      else setNotice({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const chooseTheme = (th) => {
    if (isLocked(th)) setUnlocking({ theme: th, previous: isLocked(form.theme) ? card.theme : form.theme });
    set("theme")(th);
  };

  const setExtra = (i, key, value) => setForm((f) => ({ ...f, extras: f.extras.map((x, j) => (j === i ? { ...x, [key]: value } : x)) }));

  const pickImage = async (kind, file) => {
    setUploading(kind);
    try {
      const blob = await resizeImage(file, kind === "cover" ? 1600 : 800);
      const r = await namecardService.uploadImage(id, kind, blob);
      setCard((old) => ({ ...old, [kind]: r.data[kind] }));
      setNotice({ type: "success", text: c.saved });
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setUploading("");
    }
  };

  const removeImage = async (kind) => {
    setUploading(kind);
    try {
      const r = await namecardService.removeImage(id, kind);
      setCard((old) => ({ ...old, [kind]: r.data[kind] }));
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setUploading("");
    }
  };

  if (error) {
    return (
      <div className="panel-card sa-empty-state">
        <p>{error}</p>
        <button type="button" className="md-btn md-btn-primary" onClick={load}>
          {c.retry}
        </button>
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
      </div>
    );
  }
  if (!form) return <EditorSkeleton tabs />;

  const preview = {
    ...form,
    slug: card.slug,
    photo: card.photo?.url || "",
    cover: card.cover?.url || "",
    portfolio: !!licenses.portfolio?.active,
  };
  const locked = business && !business.status;
  const link = cardLink(card.slug);

  return (
    <div className="md-page ne-page">
      {notice}
      <div className="ne-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="ne-top-title">
          <h2>{business?.name}</h2>
          <small>
            <Eye size={13} /> {card.views || 0} {c.views}
          </small>
        </div>
      </div>
      {locked && <div className="md-notice md-notice-error">{c.suspended}</div>}

      <div className="ne-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "card"} className={tab === "card" ? "on" : ""} onClick={() => setParams({}, { replace: true })}>
          <IdCard size={17} /> {c.tabCard}
        </button>
        <button type="button" role="tab" aria-selected={tab === "portfolio"} className={tab === "portfolio" ? "on" : ""} onClick={() => setParams({ tab: "portfolio" }, { replace: true })}>
          <BriefcaseBusiness size={17} /> {c.tabPortfolio}
          {licenses.portfolio?.active ? (
            <span className="ne-tab-dot ok" />
          ) : (
            <span className="ne-tab-pro">
              <Crown size={11} /> PRO
            </span>
          )}
        </button>
      </div>

      {portfolioSeen && (
        <div hidden={tab !== "portfolio"}>
          <PortfolioEditor
            businessId={id}
            card={preview}
            locked={locked}
            license={licenses.portfolio}
            onLicense={(st) => setLicenses((old) => ({ ...old, portfolio: st }))}
            onGoCard={() => {
              setParams({}, { replace: true });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      )}

      <div className="ne-grid" hidden={tab !== "card"}>
        <div className="ne-form">
          {/* ---------- theme ---------- */}
          <section className="panel-card">
            <h2>{c.theme}</h2>
            <div className="ne-themes-head">
              <span className="ne-chip">{c.freeThemes}</span>
            </div>
            <div className="ne-themes" role="radiogroup" aria-label={c.theme}>
              {themes.free.map((th) => (
                <ThemeTile key={th} th={th} on={form.theme === th} name={c.themeNames[th]} preview={preview} onPick={chooseTheme} />
              ))}
            </div>

            <div className="ne-premium">
              <div className="ne-premium-head">
                <span className="ne-premium-icon">
                  <Crown size={18} />
                </span>
                <div>
                  <h3>{c.premiumThemes}</h3>
                  <p>{c.premiumSub}</p>
                </div>
                <span className="ne-price">
                  <CoinIcon size={16} /> {themes.price}
                </span>
              </div>
              <PremiumGallery list={themes.premium} c={c} form={form} preview={preview} isLocked={isLocked} unlocked={unlocked} price={themes.price} onPick={chooseTheme} />
            </div>

            <h3 className="ne-sub">{c.color}</h3>
            <div className="ne-colors">
              {COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  className={`ne-color ${String(form.color).toUpperCase() === col ? "on" : ""}`}
                  style={{ background: col }}
                  onClick={() => set("color")(col)}
                  aria-label={col}
                  aria-pressed={String(form.color).toUpperCase() === col}
                />
              ))}
              <label className="ne-color-custom">
                <input type="color" value={form.color} onChange={(e) => set("color")(e.target.value.toUpperCase())} />
                <span>{c.customColor}</span>
              </label>
            </div>
          </section>

          {/* ---------- profile ---------- */}
          <section className="panel-card">
            <h2>{c.profile}</h2>
            <div className="ne-images">
              <ImageField label={c.photo} kind="photo" value={card.photo?.url} busy={uploading === "photo"} onPick={pickImage} onRemove={removeImage} c={c} round />
              <ImageField label={c.cover} kind="cover" value={card.cover?.url} busy={uploading === "cover"} onPick={pickImage} onRemove={removeImage} c={c} />
            </div>
            <p className="md-hint" style={{ margin: "0 0 14px" }}>
              {c.imageHint}
            </p>
            <div className="md-fields-grid">
              <div className="md-field md-field-full">
                <label htmlFor="ne-name">{c.name}</label>
                <input id="ne-name" maxLength={80} value={form.name} onChange={set("name")} disabled={locked} />
              </div>
              <div className="md-field">
                <label htmlFor="ne-job">{c.jobTitle}</label>
                <input id="ne-job" maxLength={80} value={form.job_title} onChange={set("job_title")} disabled={locked} />
              </div>
              <div className="md-field">
                <label htmlFor="ne-company">{c.company}</label>
                <input id="ne-company" maxLength={80} value={form.company} onChange={set("company")} disabled={locked} />
              </div>
              <div className="md-field md-field-full">
                <label htmlFor="ne-bio">
                  {c.bio} <span className="md-hint">· {String(form.bio).length}/500</span>
                </label>
                <textarea id="ne-bio" rows={4} maxLength={500} value={form.bio} onChange={set("bio")} placeholder={c.bioPh} disabled={locked} />
              </div>
            </div>
          </section>

          {/* ---------- contact ---------- */}
          <section className="panel-card">
            <h2>{c.contact}</h2>
            <p className="md-hint" style={{ margin: "-6px 0 14px" }}>
              {c.contactSub}
            </p>
            <div className="md-fields-grid">
              {[
                ["phone1", "tel", 30, c.phonePh],
                ["phone2", "tel", 30, c.phonePh],
                ["email", "email", 120, "you@example.com"],
                ["website", "url", 200, "www.example.com"],
                ["telegram", "text", 60, c.telegramPh],
                ["facebook", "text", 200, c.facebookPh],
              ].map(([key, type, max, ph]) => (
                <div className="md-field" key={key}>
                  <label htmlFor={`ne-${key}`}>{c[key]}</label>
                  <input id={`ne-${key}`} type={type} inputMode={type === "tel" ? "tel" : undefined} maxLength={max} value={form[key]} onChange={set(key)} placeholder={ph} disabled={locked} />
                </div>
              ))}
              <div className="md-field md-field-full">
                <label htmlFor="ne-address">{c.address}</label>
                <textarea id="ne-address" rows={2} maxLength={200} value={form.address} onChange={set("address")} disabled={locked} />
              </div>
            </div>

            <h3 className="ne-sub">{c.more}</h3>
            <p className="md-hint" style={{ margin: "-4px 0 10px" }}>
              {c.moreSub}
            </p>
            <div className="ne-extras">
              {form.extras.map((x, i) => (
                <div className="ne-extra" key={i}>
                  <input aria-label={c.labelPh} placeholder={c.labelPh} maxLength={40} value={x.label} onChange={(e) => setExtra(i, "label", e.target.value)} disabled={locked} />
                  <input aria-label={c.valuePh} placeholder={c.valuePh} maxLength={200} value={x.value} onChange={(e) => setExtra(i, "value", e.target.value)} disabled={locked} />
                  <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => setForm((f) => ({ ...f, extras: f.extras.filter((_, j) => j !== i) }))} aria-label={c.remove} title={c.remove} disabled={locked}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {form.extras.length < MAX_EXTRAS && (
                <button type="button" className="md-btn md-btn-ghost ne-add" onClick={() => setForm((f) => ({ ...f, extras: [...f.extras, { label: "", value: "" }] }))} disabled={locked}>
                  <Plus size={16} /> {c.addMore}
                </button>
              )}
            </div>
          </section>

          {/* ---------- link ---------- */}
          <section className="panel-card">
            <h2>{c.link}</h2>
            <div className="md-field">
              <label htmlFor="ne-slug">
                {c.slugHint}
                {slugState && form.slug !== card.slug && <span className={`ne-slug-state s-${slugState}`}>{slugState === "ok" ? c.slugOk : slugState === "taken" ? c.slugTaken : c.slugBad}</span>}
              </label>
              <div className="ne-slug">
                <span>{PUBLIC_SITE_URL.replace(/^https?:\/\//, "")}/public/card/</span>
                <input id="ne-slug" value={form.slug} onChange={(e) => set("slug")(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={30} disabled={locked} />
              </div>
            </div>
            <label className="md-switch ne-switch">
              <input type="checkbox" checked={!!form.published} onChange={set("published")} disabled={locked} />
              <span className="md-switch-track" />
              <span>
                <b>{c.published}</b>
                <small>{c.publishedHint}</small>
              </span>
            </label>
            <div className="ne-share">
              {qr && <img src={qr} alt="QR" className="ne-qr" />}
              <div className="ne-share-actions">
                <code>{link}</code>
                <div>
                  <a className="md-btn md-btn-ghost" href={link} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} /> {c.openCard}
                  </a>
                  <button
                    type="button"
                    className="md-btn md-btn-ghost"
                    onClick={() =>
                      navigator.clipboard?.writeText(link).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      })
                    }
                  >
                    <Copy size={16} /> {copied ? c.copied : c.copyLink}
                  </button>
                  {qr && (
                    <a className="md-btn md-btn-ghost" href={qr} download={`bizhub-card-${card.slug}.png`}>
                      <Download size={16} /> {c.downloadQr}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* save bar: sticks to the bottom of the screen while you scroll the form */}
          <div className={`ne-savebar ${dirty ? "is-dirty" : ""}`} role="region" aria-live="polite">
            <span className="ne-savebar-text">
              {dirty ? (
                isLocked(form.theme) ? (
                  <>
                    <Lock size={14} /> {c.lockedSaveHint}
                  </>
                ) : (
                  c.unsaved
                )
              ) : (
                <>
                  <Check size={15} /> {c.allSaved}
                </>
              )}
            </span>
            {dirty && (
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setForm(pick(card))} disabled={saving} aria-label="Undo" title="Undo">
                <Undo2 size={16} />
              </button>
            )}
            {dirty && isLocked(form.theme) ? (
              <button type="button" className="md-btn md-btn-primary ne-unlock-btn" onClick={() => setUnlocking({ theme: form.theme, previous: card.theme })}>
                <CoinIcon size={16} /> {c.unlockFor.replace("{coins}", themes.price)}
              </button>
            ) : (
              <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={!dirty || saving || slugState === "taken" || slugState === "bad" || locked}>
                {saving ? c.saving : c.save}
              </button>
            )}
          </div>
        </div>

        {/* ---------- live preview ---------- */}
        <aside className="ne-preview" aria-label={c.preview}>
          <div className="ne-phone">
            <div className="ne-phone-screen">
              <CardView card={preview} labels={{ yourName: c.yourName, fields: c.fields, viewPortfolio: c.viewPortfolio }} />
            </div>
          </div>
        </aside>
      </div>

      {unlocking && (
        <UnlockThemeModal
          businessId={id}
          theme={unlocking.theme}
          price={themes.price}
          preview={preview}
          c={c}
          onUnlocked={(data) => data && setCard((old) => ({ ...old, unlocked_themes: data.unlocked_themes }))}
          onClose={(ok) => {
            if (ok) set("theme")(unlocking.theme);
            else if (isLocked(unlocking.theme)) set("theme")(unlocking.previous);
            setUnlocking(null);
          }}
        />
      )}
    </div>
  );
}
