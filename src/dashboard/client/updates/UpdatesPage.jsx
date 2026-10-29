import { useState } from "react";
import { ChevronDown, FlaskConical, Rocket, ShieldCheck, Sparkles, Wrench, Zap } from "lucide-react";
import { useI18n } from "../../../i18n/I18nProvider";
import { CHANGELOG } from "./changelog";
import "./updates.css";
import PoweredBy from "../../../components/PoweredBy";

const TEXT = {
  en: {
    title: "System activity",
    sub: "What we built and changed in BizHub, version by version.",
    live: "Live",
    testing: "Testing · coming soon",
    kinds: { new: "New", better: "Better", fix: "Fixed", safe: "Safer" },
    changes: (n) => `${n} changes`,
    more: "Show all",
    less: "Show less",
    latest: "Latest",
  },
  km: {
    title: "សកម្មភាពក្នុងប្រព័ន្ធ",
    sub: "អ្វីដែលយើងបានបង្កើត និងផ្លាស់ប្តូរក្នុង BizHub តាមកំណែនីមួយៗ។",
    live: "កំពុងប្រើ",
    testing: "កំពុងសាកល្បង · ឆាប់ៗនេះ",
    kinds: { new: "ថ្មី", better: "ល្អជាងមុន", fix: "បានជួសជុល", safe: "សុវត្ថិភាពជាងមុន" },
    changes: (n) => `ការផ្លាស់ប្តូរ ${n}`,
    more: "បង្ហាញទាំងអស់",
    less: "បង្ហាញតិច",
    latest: "ថ្មីបំផុត",
  },
};
const KIND_ICON = { new: Sparkles, better: Zap, fix: Wrench, safe: ShieldCheck };
const KIND_ORDER = ["new", "better", "fix", "safe"];
const SHORT = 6; // older versions open folded after this many lines

const MONTHS = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  km: ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"],
};
const month = (ym, lang) => {
  const [y, m] = String(ym || "").split("-").map(Number);
  if (!y) return "";
  return `${(MONTHS[lang] || MONTHS.en)[(m || 1) - 1]} ${y}`;
};

function Version({ v, first, t, lang }) {
  const [open, setOpen] = useState(first);
  const items = [...v.items].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  const shown = open ? items : items.slice(0, SHORT);
  const Status = v.status === "live" ? Rocket : FlaskConical;
  return (
    <li className={`up-ver ${v.status}`} data-testid={`up-v-${v.version}`}>
      <span className="up-dot" aria-hidden="true">
        <Status size={16} />
      </span>
      <article className="up-card">
        <header className="up-head">
          <span className="up-num">v{v.version}</span>
          <span className={`up-status ${v.status}`}>{v.status === "live" ? t.live : t.testing}</span>
          {first && <span className="up-latest">{t.latest}</span>}
          <span className="up-date">{month(v.date, lang)}</span>
        </header>
        <h3>{v.title[lang] || v.title.en}</h3>
        {v.sub && <p className="up-sub">{v.sub[lang] || v.sub.en}</p>}
        <ul className="up-items">
          {shown.map((it, i) => {
            const Icon = KIND_ICON[it.kind] || Sparkles;
            return (
              <li key={i}>
                <span className={`up-kind ${it.kind}`}>
                  <Icon size={13} /> {t.kinds[it.kind] || it.kind}
                </span>
                <span className="up-text">{it[lang] || it.en}</span>
              </li>
            );
          })}
        </ul>
        {items.length > SHORT && (
          <button type="button" className="up-more" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? t.less : `${t.more} · ${t.changes(items.length)}`}
            <ChevronDown size={16} className={open ? "up-flip" : ""} />
          </button>
        )}
      </article>
    </li>
  );
}

// /app/updates — System activity: the changelog, in the language picked
export default function UpdatesPage() {
  const { lang } = useI18n();
  const t = TEXT[lang] || TEXT.en;
  return (
    <div className="md-page sa-page up-page">
      <p className="up-top">{t.sub}</p>
      <ol className="up-line">
        {CHANGELOG.map((v, i) => (
          <Version key={v.version} v={v} first={i === 0} t={t} lang={lang} />
        ))}
      </ol>
      <PoweredBy lang={lang} className="up-powered" />
    </div>
  );
}
