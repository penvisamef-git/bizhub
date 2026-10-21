import { Gift } from "lucide-react";
import { iconOf, themeOf } from "./themes";
import "./stamp.css";

const name = (l, lang) => (lang === "km" ? l?.km || l?.en : l?.en || l?.km) || "";
// stamps a little crooked, like a real rubber stamp (same tilt every time)
const tilt = (i) => [-12, 8, -4, 14, -9, 5, -15, 10, -6, 12][i % 10];

// The card itself: shop, stamps (filled / empty), small rewards on the way, the last reward.
// shop = { name, logo, theme, color, icon, goal, levels:[{at,en,km}] } · member = { name, no, stamps, claimed } (optional: a preview)
export default function StampCard({ shop, member, lang = "en", compact = false, pop = -1 }) {
  const t = themeOf(shop.theme);
  const accent = shop.color || t.accent;
  const Icon = iconOf(shop.icon);
  const goal = Math.max(3, Math.min(20, shop.goal || 10));
  const levels = shop.levels?.length ? shop.levels : [{ at: goal, en: "Reward", km: "រង្វាន់" }];
  const last = levels[levels.length - 1];
  const have = Math.min(member?.stamps ?? Math.round(goal * 0.6), goal);
  const extra = Math.max(0, (member?.stamps ?? 0) - goal);
  const cols = goal <= 5 ? goal : goal <= 10 ? 5 : goal <= 12 ? 6 : 5;
  const ready = member && (member.stamps || 0) >= last.at;
  return (
    <div className={`sc-card ${t.dark ? "dark" : ""} ${compact ? "compact" : ""}`} style={{ "--sc-bg": t.bg, "--sc-ink": t.ink, "--sc-muted": t.muted, "--sc-accent": accent, "--sc-slot": t.slot, "--sc-line": t.line }} data-testid="sc-card">
      {t.pat && <span className={`sc-pat p-${t.pat}`} aria-hidden="true" />}
      <div className="sc-card-head">
        <span className="sc-card-logo">{shop.logo ? <img src={shop.logo} alt="" /> : <Icon size={20} />}</span>
        <div className="sc-card-shop">
          <b>{shop.name || "—"}</b>
          <small>{member ? `${member.name || ""}${member.no ? ` · #${member.no}` : ""}` : lang === "km" ? "កាតប្រមូលត្រា" : "Stamp card"}</small>
        </div>
        <span className="sc-card-count">
          <b>{member?.stamps ?? have}</b>/{goal}
        </span>
      </div>
      <div className="sc-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: goal }, (_, i) => {
          const at = i + 1;
          const filled = at <= have;
          const level = levels.find((l) => l.at === at);
          const given = level && (member?.claimed || []).includes(at);
          return (
            <span key={at} className={`sc-slot ${filled ? "on" : ""} ${level ? "gift" : ""} ${pop === i ? "pop" : ""}`} aria-label={filled ? `${at} ✓` : String(at)}>
              {filled ? <Icon size={compact ? 15 : 19} style={{ transform: `rotate(${tilt(i)}deg)` }} /> : level ? <Gift size={compact ? 13 : 16} /> : <em>{at}</em>}
              {level && level.at !== goal && <i className={`sc-slot-tag ${given ? "given" : ""}`}>{name(level, lang)}</i>}
            </span>
          );
        })}
      </div>
      <div className={`sc-card-foot ${ready ? "ready" : ""}`}>
        <Gift size={15} />
        <span>
          {ready ? (lang === "km" ? `🎉 ${name(last, lang)} រួចរាល់!` : `🎉 ${name(last, lang)} is ready!`) : lang === "km" ? `${goal} ត្រា = ${name(last, lang)}` : `${goal} stamps = ${name(last, lang)}`}
        </span>
        {extra > 0 && <small>+{extra}</small>}
      </div>
    </div>
  );
}
