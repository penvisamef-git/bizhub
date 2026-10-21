import { BriefcaseBusiness, Globe, Mail, MapPin, Phone, Send } from "lucide-react";
import "./cardview.css";
import "./cardview-premium.css";
import "./cardview-recipes.css";
import RECIPES from "./themeRecipes.json";

// The digital name card itself. Same component on the public page and in the editor preview.
// card = { name, job_title, company, bio, photo, cover, theme, color, phone1, phone2, email, website,
//          address, telegram, facebook, extras: [{label, value}], slug,
//          portfolio (true = show "View portfolio") }
export const FREE_THEMES = ["classic", "modern", "minimal", "bold", "gradient", "elegant"];
// the 100 recipe themes (themeRecipes.json, spec: THEME_RECIPES.md): key → { en, km, bg, pat, hd, … }
export const CARD_RECIPES = Object.fromEntries(RECIPES.card.themes.map((t) => [t.key, t]));
export const RECIPE_PARTS = RECIPES.card.parts;
export const RECIPE_THEMES = RECIPES.card.themes.map((t) => t.key);
export const OLD_PREMIUM_THEMES = ["aurora", "neon", "glass", "luxury", "split", "wave", "polaroid", "sunset", "mono", "retro", "nature", "tech"];
export const PREMIUM_THEMES = [...OLD_PREMIUM_THEMES, ...RECIPE_THEMES];
export const THEMES = [...FREE_THEMES, ...PREMIUM_THEMES];
// the class list for a recipe theme: nc-r rb-… rp-… rh-… rf-… rph-… ra-… rc-… rt-… rn-… rr-… rbt-…
const PREFIX = { bg: "rb", pat: "rp", hd: "rh", hf: "rf", ph: "rph", al: "ra", ct: "rc", ft: "rt", nm: "rn", rl: "rr", btn: "rbt" };
export function recipeClass(key) {
  const r = CARD_RECIPES[key];
  return r ? ["nc-r", ...RECIPE_PARTS.map((p) => `${PREFIX[p]}-${r[p]}`)].join(" ") : "";
}
// light / dark / colour (for the gallery filters)
export function recipeTone(key) {
  const bg = CARD_RECIPES[key]?.bg;
  return ["dark", "black", "navy"].includes(bg) ? "dark" : ["color", "grad", "deep"].includes(bg) ? "color" : "light";
}
export const COLORS = ["#E0581A", "#D93025", "#C2185B", "#7B1FA2", "#1A73E8", "#00897B", "#2E7D32", "#16171B"];

const initialOf = (name) => Array.from(String(name || "?").trim() || "?")[0].toUpperCase();

// lighter / darker version of a #RRGGBB color (for gradients)
export function shade(hex, percent) {
  const n = parseInt(String(hex || "#E0581A").slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (percent / 100) * (percent > 0 ? 255 - c : c))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function FacebookIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21h3Z" />
    </svg>
  );
}

const telOf = (v) => String(v).replace(/[^\d+]/g, "");
const tgOf = (v) => String(v).trim().replace(/^@/, "").replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "");
const hostOf = (url) => String(url).replace(/^https?:\/\//i, "").replace(/\/$/, "");

// every contact line on the card: [key, icon, href, shown text]
export function contactsOf(card) {
  const list = [];
  if (card?.phone1) list.push(["phone1", Phone, `tel:${telOf(card.phone1)}`, card.phone1]);
  if (card?.phone2) list.push(["phone2", Phone, `tel:${telOf(card.phone2)}`, card.phone2]);
  if (card?.email) list.push(["email", Mail, `mailto:${card.email}`, card.email]);
  if (card?.website) list.push(["website", Globe, card.website, hostOf(card.website)]);
  if (card?.telegram) list.push(["telegram", Send, `https://t.me/${tgOf(card.telegram)}`, `@${tgOf(card.telegram)}`]);
  if (card?.facebook) list.push(["facebook", FacebookIcon, card.facebook, hostOf(card.facebook).replace(/^(www\.)?facebook\.com\//i, "")]);
  if (card?.address) list.push(["address", MapPin, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.address)}`, card.address]);
  return list;
}

export default function CardView({ card, labels = {}, compact = false }) {
  const theme = THEMES.includes(card?.theme) ? card.theme : "classic";
  const color = card?.color || "#E0581A";
  const style = { "--c": color, "--c-dark": shade(color, -35), "--c-light": shade(color, 55), "--c-soft": shade(color, 88) };
  const role = [card?.job_title, card?.company].filter(Boolean).join(" · ");
  const contacts = compact ? [] : contactsOf(card);
  const extras = compact ? [] : (card?.extras || []).filter((x) => x?.label || x?.value);
  const L = labels.fields || {};

  return (
    <article className={`nc nc-${theme} ${recipeClass(theme)}`} style={style}>
      <div className="nc-fx" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="nc-cover" style={card?.cover ? { backgroundImage: `url("${card.cover}")` } : undefined} aria-hidden="true" />
      <div className="nc-body">
        <div className="nc-photo">{card?.photo ? <img src={card.photo} alt={card.name || ""} /> : <span>{initialOf(card?.name)}</span>}</div>
        <h1 className="nc-name">{card?.name || labels.yourName || "Your name"}</h1>
        {role && <p className="nc-role">{role}</p>}
        {card?.bio && <p className="nc-bio">{card.bio}</p>}

        {contacts.length > 0 && (
          <ul className="nc-contacts">
            {contacts.map(([key, Icon, href, text]) => (
              <li key={key}>
                <a className="nc-ct" href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  <span className="nc-ct-ic">
                    <Icon size={18} />
                  </span>
                  <span className="nc-ct-tx">
                    <small>{L[key] || key}</small>
                    <b>{text}</b>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {extras.length > 0 && (
          <dl className="nc-extras">
            {extras.map((x, i) => (
              <div key={i}>
                <dt>{x.label}</dt>
                <dd>{x.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {!compact && card?.portfolio && card?.slug && (
          <a className="nc-save" href={`/public/portfolio/${card.slug}`}>
            <BriefcaseBusiness size={18} /> {labels.viewPortfolio || "View portfolio"}
          </a>
        )}
      </div>
      <div className="nc-foot-space" />
    </article>
  );
}
