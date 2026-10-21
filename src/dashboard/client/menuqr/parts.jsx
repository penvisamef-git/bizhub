import { BarChart3, Lock, MessageSquareHeart, Tag, UtensilsCrossed } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { fmt } from "./text";

export const ADDON_ICON = { mq_categories: UtensilsCrossed, mq_items: UtensilsCrossed, mq_promos: Tag, mq_feedback: MessageSquareHeart, mq_stats: BarChart3 };

export function Switch({ checked, onChange, label, disabled, testid }) {
  return (
    <label className="md-switch">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} data-testid={testid} />
      <span className="md-switch-track" />
      <span>{label}</span>
    </label>
  );
}

// a section title card
export function Head({ icon: Icon, title, sub, children }) {
  return (
    <section className="panel-card mq-headcard">
      {Icon && (
        <span className="mq-headcard-ic">
          <Icon size={22} />
        </span>
      )}
      <div className="mq-headcard-text">
        <h2>{title}</h2>
        {sub && <p className="rs-muted">{sub}</p>}
      </div>
      {children && <div className="mq-headcard-acts">{children}</div>}
    </section>
  );
}

// "this needs an add-on" card with an unlock button
export function Locked({ ctx, addon }) {
  const { m, data, readOnly } = ctx;
  const a = data.addons[addon] || {};
  return (
    <section className="panel-card mq-locked">
      <Lock size={22} />
      <b>{m.addonNames[addon]}</b>
      <p className="rs-muted">{m.addonWhat[addon]}</p>
      <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon })} disabled={readOnly} data-testid={`mq-unlock-${addon}`}>
        <CoinIcon size={16} /> {m.unlock.replace("{coins}", `${fmt(a.price)} ${m.coins}${a.days ? ` ${m.perYear}` : ""}`)}
      </button>
    </section>
  );
}
