import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowDown,
  ArrowUp,
  Award,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Globe,
  GraduationCap,
  Languages,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  Undo2,
  UserRound,
  X,
  FileText,
  ImagePlus,
  Loader2,
  Palette,
} from "lucide-react";
import { portfolioService, licenseService } from "../../../api/services";
import { PUBLIC_SITE_URL } from "../../../config";
import { useI18n } from "../../../i18n/I18nProvider";
import PortfolioView, { PF_FREE_THEMES, PF_PREMIUM_THEMES, PF_RECIPES, pfRecipeTone } from "../../../namecard/PortfolioView";
import { COLORS } from "../../../namecard/CardView";
import { resizeImage } from "../../../lib/image";
import { fmtDay, usePortfolioText } from "../../../namecard/portfolioText";
import CoinIcon from "../../../components/CoinIcon";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import { useNotice } from "../../super_admin/parts";
import "./portfolio-editor.css";
import { EditorSkeleton } from "../../../components/skeleton/Skeleton";

const linkOf = (slug) => `${PUBLIC_SITE_URL}/public/portfolio/${slug}`;
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// list sections: [field, label key, max, placeholder key?]
const LISTS = [
  {
    key: "experience",
    icon: BriefcaseBusiness,
    max: 20,
    fields: [["title", "title", 80], ["company", "company", 80], ["location", "location", 80], ["start", "start", 20, "datePh"], ["end", "end", 20, "datePh"]],
    bool: "current",
    text: ["description", "description", 1000],
  },
  {
    key: "education",
    icon: GraduationCap,
    max: 20,
    fields: [["school", "school", 120], ["degree", "degree", 120], ["field", "field", 120], ["start", "start", 20, "datePh"], ["end", "end", 20, "datePh"]],
    text: ["description", "description", 600],
  },
  { key: "projects", icon: Globe, max: 20, fields: [["title", "ptitle", 100], ["link", "link", 200]], text: ["description", "pdesc", 600] },
  { key: "certifications", icon: Award, max: 20, fields: [["name", "name", 120], ["issuer", "issuer", 120], ["year", "year", 20], ["link", "link", 200]] },
  { key: "languages", icon: Languages, max: 10, fields: [["name", "lang", 40], ["level", "level", 40, "levelPh"]] },
];
const KEYS = ["theme", "color", "headline", "about", "skills", "published", ...LISTS.map((l) => l.key)];
const pick = (d) => {
  const out = { theme: d?.theme || "classic", color: d?.color || "", headline: d?.headline || "", about: d?.about || "", skills: [...(d?.skills || [])], published: d?.published !== false };
  for (const l of LISTS) {
    out[l.key] = (d?.[l.key] || []).map((r) => {
      const row = {};
      for (const [f] of l.fields) row[f] = r[f] || "";
      if (l.text) row[l.text[0]] = r[l.text[0]] || "";
      if (l.bool) row[l.bool] = !!r[l.bool];
      return row;
    });
  }
  return out;
};
const emptyRow = (l) => {
  const row = {};
  for (const [f] of l.fields) row[f] = "";
  if (l.text) row[l.text[0]] = "";
  if (l.bool) row[l.bool] = false;
  return row;
};

// fake mini website, for the promo + purchase modal
function Mock({ card }) {
  return (
    <div className="pe-mock" style={{ "--c": card.color || "#E0581A" }}>
      <div className="pe-mock-bar">
        <i />
        <i />
        <i />
        <span>/{card.slug}</span>
      </div>
      <div className="pe-mock-hero">
        <span className="pe-mock-photo">{card.photo ? <img src={card.photo} alt="" /> : null}</span>
        <b>{card.name || "Your name"}</b>
        <small>{card.job_title || "Your job"}</small>
      </div>
      <div className="pe-mock-body">
        {[0, 1, 2].map((i) => (
          <div key={i} className="pe-mock-row">
            <i />
            <span>
              <em style={{ width: `${70 - i * 12}%` }} />
              <em style={{ width: `${45 + i * 10}%` }} />
            </span>
          </div>
        ))}
        <div className="pe-mock-chips">
          <em />
          <em />
          <em />
        </div>
      </div>
    </div>
  );
}

function SkillsInput({ value, onChange, t, disabled }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim().slice(0, 40);
    if (v && !value.includes(v) && value.length < 40) onChange([...value, v]);
    setText("");
  };
  return (
    <div className="pe-skills">
      {value.map((s) => (
        <span key={s} className="pe-chip">
          {s}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`${t.remove} ${s}`} disabled={disabled}>
            <X size={13} />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={t.skillsPh}
        maxLength={40}
        disabled={disabled}
        aria-label={t.skills}
      />
    </div>
  );
}

function ListSection({ list, rows, onChange, t, disabled }) {
  const setRow = (i, key, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  const move = (i, d) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const Icon = list.icon;
  return (
    <section className="panel-card pe-list">
      <div className="pe-list-head">
        <h2>
          <Icon size={18} /> {t[list.key]}
          {rows.length > 0 && <small>{rows.length}</small>}
        </h2>
        {rows.length < list.max && (
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => onChange([...rows, emptyRow(list)])} disabled={disabled}>
            <Plus size={15} /> {t.add}
          </button>
        )}
      </div>
      {rows.map((r, i) => (
        <div className="pe-row" key={i}>
          <div className="pe-row-tools">
            <span className="pe-row-n">{i + 1}</span>
            <button type="button" className="md-icon-btn" onClick={() => move(i, -1)} disabled={disabled || i === 0} aria-label={t.moveUp} title={t.moveUp}>
              <ArrowUp size={15} />
            </button>
            <button type="button" className="md-icon-btn" onClick={() => move(i, 1)} disabled={disabled || i === rows.length - 1} aria-label={t.moveDown} title={t.moveDown}>
              <ArrowDown size={15} />
            </button>
            <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => onChange(rows.filter((_, j) => j !== i))} disabled={disabled} aria-label={t.remove} title={t.remove}>
              <Trash2 size={15} />
            </button>
          </div>
          <div className="md-fields-grid">
            {list.fields.map(([f, label, max, ph], k) => (
              <div className={`md-field ${k === 0 && list.fields.length % 2 === 1 ? "md-field-full" : ""}`} key={f}>
                <label htmlFor={`pe-${list.key}-${i}-${f}`}>{t.f[label]}</label>
                <input
                  id={`pe-${list.key}-${i}-${f}`}
                  value={r[f]}
                  maxLength={max}
                  placeholder={ph ? t[ph] : undefined}
                  onChange={(e) => setRow(i, f, e.target.value)}
                  disabled={disabled || (list.bool && f === "end" && r[list.bool])}
                />
              </div>
            ))}
            {list.bool && (
              <label className="pe-check md-field-full">
                <input type="checkbox" checked={!!r[list.bool]} onChange={(e) => setRow(i, list.bool, e.target.checked)} disabled={disabled} />
                {t.f[list.bool]}
              </label>
            )}
            {list.text && (
              <div className="md-field md-field-full">
                <label htmlFor={`pe-${list.key}-${i}-${list.text[0]}`}>{t.f[list.text[1]]}</label>
                <textarea
                  id={`pe-${list.key}-${i}-${list.text[0]}`}
                  rows={3}
                  value={r[list.text[0]]}
                  maxLength={list.text[2]}
                  onChange={(e) => setRow(i, list.text[0], e.target.value)}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

// gallery filters (the older premium themes are tagged by hand, the recipes from their parts)
const PF_OLD_TAGS = { midnight: ["dark", "colour"], magazine: ["light", "serif"], glass: ["light", "colour"], terminal: ["dark", "mono"], bento: ["light", "colour"], executive: ["dark", "serif"], corporate: ["light", "colour"], professional: ["light", "serif"], enterprise: ["light", "colour"] };
const PF_FILTERS = ["all", "light", "dark", "colour", "serif", "mono", "owned"];
const PF_CHUNK = 24;
function pfTags(th) {
  const r = PF_RECIPES[th];
  if (!r) return PF_OLD_TAGS[th] || [];
  const tone = pfRecipeTone(r);
  return [tone.dark ? "dark" : "light", tone.colour && "colour", r.ft === "serif" && "serif", r.ft === "mono" && "mono"].filter(Boolean);
}

function PfThemeTile({ th, on, name, data, card, t, onPick, locked, price, owned }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={`ne-theme ${on ? "on" : ""} ${locked ? "locked" : ""}`} onClick={() => onPick(th)}>
      <span className="ne-theme-mini pe-theme-mini">
        <span className="pe-theme-scale">
          <PortfolioView data={{ ...data, theme: th }} card={card} t={t} />
        </span>
        {locked && (
          <span className="ne-lock">
            <Lock size={13} /> <CoinIcon size={14} /> {price}
          </span>
        )}
        {owned && (
          <span className="ne-lock ne-owned">
            <Crown size={12} /> {owned}
          </span>
        )}
      </span>
      <b>
        {on && <Check size={14} />} {name}
      </b>
    </button>
  );
}

// Documents & certificates: upload / rename / delete right away (not part of Save)
function FilesSection({ businessId, files, setFiles, t, disabled, notify }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const full = files.length >= 12;

  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      let blob = file;
      let name = file.name;
      if (file.type.startsWith("image/")) {
        blob = await resizeImage(file, 2000, 0.85); // photos of certificates: keep them sharp but small
        name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      }
      if (blob.size > 4 * 1024 * 1024) throw new Error(t.tooBig);
      const r = await portfolioService.uploadFile(businessId, blob, file.name.replace(/\.[^.]+$/, "").slice(0, 80), name);
      setFiles(r.data);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const rename = async (f, title) => {
    if (title.trim() === (f.title || "")) return;
    try {
      const r = await portfolioService.renameFile(businessId, f._id, title.trim());
      setFiles(r.data);
    } catch (e) {
      notify({ type: "error", text: e.message });
    }
  };
  const remove = async (f) => {
    try {
      const r = await portfolioService.deleteFile(businessId, f._id);
      setFiles(r.data);
      setConfirm(null);
    } catch (e) {
      notify({ type: "error", text: e.message });
    }
  };

  return (
    <section className="panel-card pe-files">
      <div className="pe-list-head">
        <h2>
          <FileText size={18} /> {t.documents}
          {files.length > 0 && <small>{files.length}/12</small>}
        </h2>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            pick(file);
          }}
        />
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => inputRef.current?.click()} disabled={disabled || busy || full}>
          {busy ? <Loader2 size={15} className="md-spin" /> : <ImagePlus size={15} />} {busy ? t.uploading : t.upload}
        </button>
      </div>
      <p className="md-hint" style={{ margin: "6px 0 0" }}>
        {full ? t.filesFull : t.documentsSub}
      </p>
      {files.length > 0 && (
        <ul className="pe-file-list">
          {files.map((f) => (
            <li key={f._id}>
              <a className="pe-file-thumb" href={f.url} target="_blank" rel="noreferrer" title={t.openFile}>
                {f.thumb ? <img src={f.thumb} alt="" loading="lazy" /> : <FileText size={22} />}
                {f.kind === "pdf" && <em>PDF</em>}
              </a>
              <input
                defaultValue={f.title}
                maxLength={80}
                placeholder={t.fileTitlePh}
                aria-label={t.fileTitle}
                onBlur={(e) => rename(f, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                disabled={disabled}
              />
              {confirm === f._id ? (
                <button type="button" className="md-btn md-btn-danger sa-btn-sm" onClick={() => remove(f)}>
                  {t.confirmDelete}
                </button>
              ) : (
                <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => setConfirm(f._id)} aria-label={t.deleteFile} title={t.deleteFile} disabled={disabled}>
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function PortfolioEditor({ businessId, card, locked, license: parentLicense, onLicense, onGoCard }) {
  const t = usePortfolioText();
  const { lang } = useI18n();
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [license, setLicense] = useState(parentLicense || null);
  const [price, setPrice] = useState(50);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [buying, setBuying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState("");
  const [themes, setThemes] = useState({ free: PF_FREE_THEMES, premium: PF_PREMIUM_THEMES, price: 20 });
  const [unlocked, setUnlocked] = useState([]);
  const [unlocking, setUnlocking] = useState(null); // { theme, previous }
  const [themeFilter, setThemeFilter] = useState("all");
  const [themeShown, setThemeShown] = useState(PF_CHUNK);
  const [files, setFiles] = useState([]);
  const [notice, setNotice] = useNotice();
  const startedActive = useRef(null);

  const load = useCallback(() => {
    setError("");
    portfolioService
      .get(businessId)
      .then((r) => {
        setSaved(pick(r.data));
        setForm(pick(r.data));
        setLicense(r.license);
        setPrice(r.price);
        if (r.themes?.free) setThemes(r.themes);
        setUnlocked(r.data?.unlocked_themes || []);
        setFiles(r.data?.files || []);
        onLicense?.(r.license);
      })
      .catch((e) => setError(e.message || t.loadFail));
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);

  const active = !!license?.active;
  const slug = card.slug;
  const link = slug ? linkOf(slug) : "";
  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { width: 600, margin: 2, color: { dark: "#16171b", light: "#ffffff" } }).then(setQr);
  }, [link]);

  const dirty = useMemo(() => !!(saved && form && KEYS.some((k) => JSON.stringify(form[k]) !== JSON.stringify(saved[k]))), [saved, form]);
  useEffect(() => {
    if (!dirty) return undefined;
    const onLeave = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const isLocked = (th) => themes.premium.includes(th) && !unlocked.includes(th);
  const premiumOf = (f) => (f === "all" ? themes.premium : f === "owned" ? themes.premium.filter((th) => unlocked.includes(th)) : themes.premium.filter((th) => pfTags(th).includes(f)));
  const filteredPremium = premiumOf(themeFilter);
  // first the older premium themes, then the recipes in chunks — always far enough to show the chosen one
  const chosenAt = form ? filteredPremium.indexOf(form.theme) : -1;
  const shownPremium = filteredPremium.slice(0, Math.max(themeShown, chosenAt + 1));
  const pickFilter = (f) => {
    setThemeFilter(f);
    setThemeShown(PF_CHUNK);
  };
  const chooseTheme = (th) => {
    if (isLocked(th)) setUnlocking({ theme: th, previous: isLocked(form.theme) ? saved.theme : form.theme });
    set("theme", th);
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await portfolioService.update(businessId, form);
      setSaved(pick(r.data));
      setForm(pick(r.data));
      setNotice({ type: "success", text: t.saved });
    } catch (e) {
      if (e.status === 402 && e.response?.theme) setUnlocking({ theme: e.response.theme, previous: saved.theme });
      else {
        if (e.status === 402) load();
        setNotice({ type: "error", text: e.message });
      }
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="panel-card sa-empty-state">
        <p>{error}</p>
        <button type="button" className="md-btn md-btn-primary" onClick={load}>
          {t.retry}
        </button>
      </div>
    );
  }
  if (!form || !license) return <EditorSkeleton />;

  const expired = license.status === "expired";
  const until = fmtDay(license.expires_at, lang);
  const preview = form;
  const pct = Math.max(3, Math.min(100, Math.round(((license.days_left || 0) / 365) * 100)));
  const purchase = buying && (
    <PurchaseModal
      stage={<Mock card={card} />}
      badge={t.promoBadge}
      title={active ? t.renewTitle : t.buyTitle}
      sub={active ? t.renewSub.replace("{date}", until) : t.buySub}
      perks={active ? [] : t.promoPerks.map((p) => p.replace("{link}", `/portfolio/${slug}`))}
      price={price}
      buyLabel={(active || expired ? t.renewFor : t.unlockFor).replace("{coins}", `${fmt(price)} ${t.coins}`)}
      buy={() => {
        startedActive.current = active;
        return licenseService.buy(businessId, "portfolio", license.expires_at ?? null);
      }}
      doneTitle={startedActive.current ? undefined : t.doneTitle}
      doneSub={startedActive.current ? undefined : t.doneSub}
      doneButton={startedActive.current ? undefined : t.start}
      onDone={(r) => {
        if (r?.data) {
          setLicense(r.data);
          onLicense?.(r.data);
          if (startedActive.current) setNotice({ type: "success", text: t.renewDone.replace("{date}", fmtDay(r.data.expires_at, lang)) });
        } else load();
      }}
      onClose={() => setBuying(false)}
    />
  );

  // ---------- locked: promo ----------
  // (the purchase modal stays in the same place, so it keeps its confetti when the page switches to the editor)
  const content = !active ? (
      <div className="pe-promo">
        <div className="pe-promo-text">
          <span className="pe-badge">
            <Crown size={14} /> {t.promoBadge}
          </span>
          <h2>{expired ? t.expiredTitle : t.promoTitle}</h2>
          <p>{expired ? t.expiredSub.replace("{date}", until) : t.promoSub}</p>
          <ul>
            {t.promoPerks.map((p) => (
              <li key={p}>
                <Check size={15} /> {p.replace("{link}", `/portfolio/${slug}`)}
              </li>
            ))}
          </ul>
          <div className="pe-promo-buy">
            <button type="button" className="ul-buy pe-buy" onClick={() => setBuying(true)} disabled={locked}>
              <CoinIcon size={22} /> {(expired ? t.renewFor : t.unlockFor).replace("{coins}", `${fmt(price)} ${t.coins}`)}
              <span className="ul-shine" aria-hidden="true" />
            </button>
            <span className="pe-per">
              <CalendarClock size={15} /> {t.perYear.replace("{coins}", fmt(price))}
            </span>
          </div>
        </div>
        <div className="pe-promo-art" aria-hidden="true">
          <Mock card={card} />
          <span className="pe-spark s1">
            <Sparkles size={20} />
          </span>
          <span className="pe-spark s2">
            <CoinIcon size={28} />
          </span>
          <span className="pe-spark s3">
            <CoinIcon size={20} />
          </span>
        </div>
      </div>
  ) : (
    // ---------- active: editor ----------
    <div className="ne-grid pe-grid">
      <div className="ne-form">
        <section className={`panel-card pe-status s-${license.status}`}>
          <div className="pe-status-top">
            <span className="pe-status-ic">
              <CalendarClock size={20} />
            </span>
            <span className="pe-status-text">
              <b>{t.activeUntil.replace("{date}", until)}</b>
              <small>{license.status === "expiring" ? t.expiringSoon : t.daysLeft.replace("{n}", license.days_left)}</small>
            </span>
            <button type="button" className="md-btn md-btn-primary ne-unlock-btn" onClick={() => setBuying(true)} disabled={locked}>
              <CoinIcon size={16} /> {t.renew}
            </button>
          </div>
          <div className="pe-meter" role="progressbar" aria-valuenow={license.days_left} aria-valuemin={0} aria-valuemax={365}>
            <span style={{ width: `${pct}%` }} />
          </div>
        </section>

        <section className="panel-card">
          <h2>{t.theme}</h2>
          <p className="md-hint" style={{ margin: "-6px 0 12px" }}>
            {t.themeSub}
          </p>
          <div className="ne-themes-head">
            <span className="ne-chip">{t.freeThemes}</span>
          </div>
          <div className="ne-themes" role="radiogroup" aria-label={t.theme}>
            {themes.free.map((th) => (
              <PfThemeTile key={th} th={th} on={form.theme === th} name={t.themeNames[th] || th} data={form} card={card} t={t} onPick={chooseTheme} />
            ))}
          </div>
          <div className="ne-premium">
            <div className="ne-premium-head">
              <span className="ne-premium-icon">
                <Crown size={18} />
              </span>
              <div>
                <h3>{t.premiumThemes}</h3>
                <p>{t.premiumSub}</p>
              </div>
              <span className="ne-price">
                <CoinIcon size={16} /> {themes.price}
              </span>
            </div>
            <div className="pe-filters" role="tablist" aria-label={t.premiumThemes}>
              {PF_FILTERS.map((f) => (
                <button key={f} type="button" role="tab" aria-selected={themeFilter === f} className={`pe-filter ${themeFilter === f ? "on" : ""}`} onClick={() => pickFilter(f)}>
                  {t.themeFilters[f]}
                  {f !== "all" && <small>{premiumOf(f).length}</small>}
                </button>
              ))}
            </div>
            {shownPremium.length === 0 && <p className="md-hint pe-none">{t.noThemes}</p>}
            <div className="ne-themes" role="radiogroup" aria-label={t.premiumThemes}>
              {shownPremium.map((th) => (
                <PfThemeTile
                  key={th}
                  th={th}
                  on={form.theme === th}
                  name={t.themeNames[th] || th}
                  data={form}
                  card={card}
                  t={t}
                  onPick={chooseTheme}
                  locked={isLocked(th)}
                  price={themes.price}
                  owned={!isLocked(th) ? t.unlockedTag : ""}
                />
              ))}
            </div>
            {filteredPremium.length > shownPremium.length && (
              <button type="button" className="md-btn md-btn-ghost pe-more" onClick={() => setThemeShown((n) => n + PF_CHUNK)}>
                {t.showMore.replace("{n}", filteredPremium.length - shownPremium.length)}
              </button>
            )}
          </div>

          <h3 className="ne-sub">
            <Palette size={15} style={{ verticalAlign: -2 }} /> {t.color}
          </h3>
          <div className="ne-colors">
            <button type="button" className={`pe-same ${form.color ? "" : "on"}`} onClick={() => set("color", "")} aria-pressed={!form.color} disabled={locked}>
              <span style={{ background: card.color || "#E0581A" }} /> {t.sameAsCard}
            </button>
            {COLORS.map((col) => (
              <button
                key={col}
                type="button"
                className={`ne-color ${form.color === col ? "on" : ""}`}
                style={{ background: col }}
                onClick={() => set("color", col)}
                aria-label={col}
                aria-pressed={form.color === col}
                disabled={locked}
              />
            ))}
            <label className="ne-color-custom">
              <input type="color" value={form.color || card.color || "#E0581A"} onChange={(e) => set("color", e.target.value.toUpperCase())} disabled={locked} />
              <span>{t.customColor}</span>
            </label>
          </div>
        </section>

        <section className="panel-card">
          <h2>{t.link}</h2>
          <div className="ne-share">
            {qr && <img src={qr} alt="QR" className="ne-qr" />}
            <div className="ne-share-actions">
              <code>{link}</code>
              <div>
                <a className="md-btn md-btn-ghost" href={link} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} /> {t.open}
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
                  <Copy size={16} /> {copied ? t.copied : t.copy}
                </button>
                {qr && (
                  <a className="md-btn md-btn-ghost" href={qr} download={`bizhub-portfolio-${slug}.png`}>
                    <Download size={16} /> {t.downloadQr}
                  </a>
                )}
              </div>
            </div>
          </div>
          <label className="md-switch ne-switch" style={{ marginBottom: 0 }}>
            <input type="checkbox" checked={!!form.published} onChange={(e) => set("published", e.target.checked)} disabled={locked} />
            <span className="md-switch-track" />
            <span>
              <b>{t.published}</b>
              <small>{t.publishedHint}</small>
            </span>
          </label>
        </section>

        <section className="panel-card">
          <h2>
            <UserRound size={18} style={{ verticalAlign: -3 }} /> {t.intro}
          </h2>
          <div className="pe-photo-row">
            <span className="pe-photo">{card.photo ? <img src={card.photo} alt="" /> : <UserRound size={22} />}</span>
            <span className="pe-photo-text">
              <b>{t.photo}</b>
              <small>{card.photo ? t.photoHint : t.noPhoto}</small>
            </span>
            {onGoCard && (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={onGoCard}>
                {t.changePhoto}
              </button>
            )}
          </div>
          <div className="md-fields-grid">
            <div className="md-field md-field-full">
              <label htmlFor="pe-headline">{t.headline}</label>
              <input id="pe-headline" maxLength={120} value={form.headline} placeholder={card.job_title || t.headlinePh} onChange={(e) => set("headline", e.target.value)} disabled={locked} />
            </div>
            <div className="md-field md-field-full">
              <label htmlFor="pe-about">
                {t.about} <span className="md-hint">· {form.about.length}/2000</span>
              </label>
              <textarea id="pe-about" rows={5} maxLength={2000} value={form.about} placeholder={t.aboutPh} onChange={(e) => set("about", e.target.value)} disabled={locked} />
            </div>
            <div className="md-field md-field-full">
              <label>
                {t.skills} <span className="md-hint">· {form.skills.length}/40</span>
              </label>
              <SkillsInput value={form.skills} onChange={(v) => set("skills", v)} t={t} disabled={locked} />
            </div>
          </div>
        </section>

        {LISTS.map((l) => (
          <ListSection key={l.key} list={l} rows={form[l.key]} onChange={(v) => set(l.key, v)} t={t} disabled={locked} />
        ))}

        <FilesSection businessId={businessId} files={files} setFiles={setFiles} t={t} disabled={locked} notify={setNotice} />

        <div className={`ne-savebar ${dirty ? "is-dirty" : ""}`} role="region" aria-live="polite">
          <span className="ne-savebar-text">
            {dirty ? (
              isLocked(form.theme) ? (
                <>
                  <Lock size={14} /> {t.lockedSaveHint}
                </>
              ) : (
                t.unsaved
              )
            ) : (
              <>
                <Check size={15} /> {t.allSaved}
              </>
            )}
          </span>
          {dirty && (
            <button type="button" className="md-btn md-btn-ghost" onClick={() => setForm(saved)} disabled={saving} aria-label="Undo" title="Undo">
              <Undo2 size={16} />
            </button>
          )}
          {dirty && isLocked(form.theme) ? (
            <button type="button" className="md-btn md-btn-primary ne-unlock-btn" onClick={() => setUnlocking({ theme: form.theme, previous: saved.theme })}>
              <CoinIcon size={16} /> {t.themeUnlockFor.replace("{coins}", themes.price)}
            </button>
          ) : (
            <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={!dirty || saving || locked}>
              {saving ? t.saving : t.save}
            </button>
          )}
        </div>
      </div>

      <aside className="ne-preview" aria-label="Preview">
        <div className="ne-phone">
          <div className="ne-phone-screen pe-phone-screen">
            <PortfolioView data={{ ...preview, files }} card={card} t={t} preview />
          </div>
        </div>
      </aside>
    </div>
  );

  const themeName = unlocking ? t.themeNames[unlocking.theme] || unlocking.theme : "";
  const themePurchase = unlocking && (
    <PurchaseModal
      stage={
        <div className="pe-stage-scale">
          <PortfolioView data={{ ...form, theme: unlocking.theme }} card={card} t={t} preview />
        </div>
      }
      badge={t.premiumThemes}
      title={t.themeTitle.replace("{theme}", themeName)}
      sub={t.themeModalSub}
      perks={t.themePerks}
      price={themes.price}
      buyLabel={t.themeUnlockFor.replace("{coins}", `${fmt(themes.price)} ${t.coins}`)}
      buy={() => portfolioService.unlock(businessId, unlocking.theme)}
      doneTitle={t.unlockedTag + "!"}
      doneSub={t.themeDone.replace("{theme}", themeName)}
      doneButton={t.useTheme}
      onDone={(r) => {
        if (r?.data?.unlocked_themes) setUnlocked(r.data.unlocked_themes);
        else load();
      }}
      onClose={(ok) => {
        if (ok) set("theme", unlocking.theme);
        else if (isLocked(unlocking.theme)) set("theme", unlocking.previous);
        setUnlocking(null);
      }}
    />
  );

  return (
    <>
      {notice}
      {content}
      {purchase}
      {themePurchase}
    </>
  );
}
