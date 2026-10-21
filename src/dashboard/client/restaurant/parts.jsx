import { useRef, useState } from "react";
import { BadgeCheck, Gift, HandPlatter, ChefHat, CreditCard, History, ImagePlus, Loader2, Lock, Package, QrCode, Trash2, Users, Printer, RotateCcw, Globe, Send, Smartphone, MonitorUp, BadgePercent, Network } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { resizeImage } from "../../../lib/image";

export const ADDON_ICONS = {
  rest_website: Globe,
  rest_telegram: Send,
  rest_display: MonitorUp,
  rest_promos: BadgePercent,
  rest_app: Smartphone,
  rest_printer: Printer,
  rest_kitchen: ChefHat,
  rest_qr_menu: QrCode,
  rest_payments: CreditCard,
  rest_staff: Users,
  rest_history: History,
  rest_stock: Package,
  rest_table_order: HandPlatter,
  rest_rewards: Gift,
  rest_branches: Network,
};
export const fmtDate = (d, lang) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d)) : "");

// A labelled form field
export function Field({ label, hint, children, full, htmlFor }) {
  return (
    <div className={`md-field ${full ? "md-field-full" : ""}`}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && <small className="rs-hint">{hint}</small>}
    </div>
  );
}

// Upload / change / remove one image (logo, cover, item photo)
export function ImagePick({ value, onPick, onRemove, busy, r, round, wide, maxSize = 1000, disabled }) {
  const ref = useRef(null);
  return (
    <div className="rs-image">
      <span className={`rs-thumb ${round ? "round" : ""} ${wide ? "wide" : ""}`}>{value ? <img src={value} alt="" /> : <ImagePlus size={22} />}</span>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPick(await resizeImage(file, maxSize));
        }}
      />
      <div className="rs-image-actions">
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ref.current?.click()} disabled={busy || disabled}>
          {busy ? <Loader2 size={15} className="md-spin" /> : <ImagePlus size={15} />} {busy ? r.uploading : value ? r.change : r.upload}
        </button>
        {value && !busy && onRemove && (
          <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={onRemove} aria-label={r.remove} title={r.remove} disabled={disabled}>
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// "This needs an add-on" card with a buy button
export function AddonPrompt({ addonKey, ctx, title, sub }) {
  const { r } = ctx;
  const a = ctx.overview.addons.find((x) => x.key === addonKey);
  const Icon = ADDON_ICONS[addonKey] || Lock;
  return (
    <div className="rs-addon-prompt">
      <span className="rs-addon-ic">
        <Icon size={22} />
      </span>
      <div className="rs-addon-text">
        <b>{title || r.lockedFeature.replace("{name}", r.addonNames[addonKey])}</b>
        <small>{sub || r.addonWhat[addonKey]}</small>
      </div>
      {a && !a.soon && (
        <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy(addonKey)} disabled={ctx.readOnly}>
          <CoinIcon size={16} /> {r.buy.replace("{coins}", a.price)}
          {a.days ? ` ${r.perYear}` : ""}
        </button>
      )}
    </div>
  );
}

// small "On" / "Locked" pill
export function AddonPill({ on, r }) {
  return on ? (
    <span className="rs-pill on">
      <BadgeCheck size={12} /> {r.unlockedTag}
    </span>
  ) : (
    <span className="rs-pill">
      <Lock size={12} /> {r.locked}
    </span>
  );
}

// Save bar shared by the form tabs
export function SaveBar({ dirty, saving, onSave, onUndo, r, disabled }) {
  return (
    <div className={`ne-savebar ${dirty ? "is-dirty" : ""}`} role="region" aria-live="polite">
      <span className="ne-savebar-text">{dirty ? r.unsaved : r.allSaved}</span>
      {dirty && (
        <button type="button" className="md-btn md-btn-ghost" onClick={onUndo} disabled={saving} aria-label={r.cancel} title={r.cancel}>
          <RotateCcw size={16} />
        </button>
      )}
      <button type="button" className="md-btn md-btn-primary" onClick={onSave} disabled={!dirty || saving || disabled}>
        {saving ? r.saving : r.save}
      </button>
    </div>
  );
}

// remember-the-first-click delete button
export function DeleteButton({ onDelete, r, disabled, small }) {
  const [sure, setSure] = useState(false);
  return sure ? (
    <button type="button" className={`md-btn md-btn-danger ${small ? "sa-btn-sm" : ""}`} onClick={onDelete} onBlur={() => setSure(false)} disabled={disabled} autoFocus>
      {r.confirmDelete}
    </button>
  ) : (
    <button type="button" className="md-btn md-btn-ghost sa-danger-text sa-btn-sm" onClick={() => setSure(true)} disabled={disabled}>
      <Trash2 size={15} /> {r.remove}
    </button>
  );
}
