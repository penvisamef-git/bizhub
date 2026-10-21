import { Award, BriefcaseBusiness, ExternalLink, FileText, FolderOpen, Globe, GraduationCap, Languages, Mail, MapPin, Phone, Send, Sparkles, UserRound } from "lucide-react";
import { shade } from "./CardView";
import "./portfolio.css";
import "./portfolio-themes.css";
import "./portfolio-recipes.css";
import RECIPES from "./themeRecipes.json";

// the 100 recipe themes: one choice per part (spec: THEME_RECIPES.md, shared with the API and the app)
export const PF_RECIPES = Object.fromEntries(RECIPES.portfolio.themes.map((r) => [r.key, r]));
export const PF_RECIPE_PARTS = RECIPES.portfolio.parts;
const DARK_BG = ["dark", "black", "navy", "warm"];
const PALE_HERO = ["soft", "plain"];
export const pfRecipeTone = (r) => ({ dark: DARK_BG.includes(r.bg), colour: !PALE_HERO.includes(r.hero) });

export const PF_FREE_THEMES = ["classic", "minimal", "sidebar"];
export const PF_PREMIUM_THEMES = ["midnight", "magazine", "glass", "terminal", "bento", "executive", "corporate", "professional", "enterprise", ...Object.keys(PF_RECIPES)];
export const PF_THEMES = [...PF_FREE_THEMES, ...PF_PREMIUM_THEMES];

// class names for one recipe theme: qb-<bg> qh-<hero> qs-<hs> ql-<hl> qp-<pat> qph-<ph> qc-<sec> qt-<h2> qtl-<tl> qch-<chip> qf-<ft>
const PREFIX = { bg: "qb", hero: "qh", hs: "qs", hl: "ql", pat: "qp", ph: "qph", sec: "qc", h2: "qt", tl: "qtl", chip: "qch", ft: "qf" };
function recipeClass(key) {
  const r = PF_RECIPES[key];
  if (!r) return "";
  const tone = pfRecipeTone(r);
  return ["pf-r", ...PF_RECIPE_PARTS.map((p) => `${PREFIX[p]}-${r[p]}`), tone.dark ? "pf-r-D" : "pf-r-L", tone.colour ? "pf-r-col" : "pf-r-pale"].join(" ");
}

// The personal web portfolio. Same component on the public page and in the editor preview.
// data = { theme, color ("" = card color), files[], headline, about, skills[], experience[], education[], projects[], certifications[], languages[] }
// card = public card fields (name, photo, color, job_title, company, contacts, slug)
const initialOf = (name) => Array.from(String(name || "?").trim() || "?")[0].toUpperCase();
const telOf = (v) => String(v).replace(/[^\d+]/g, "");
const hostOf = (url) =>
  String(url)
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");

function Section({ icon: Icon, title, children }) {
  return (
    <section className="pf-section">
      <h2>
        <span className="pf-section-ic">
          <Icon size={18} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Timeline({ rows, main, sub, t }) {
  return (
    <ol className="pf-timeline">
      {rows.map((r, i) => (
        <li key={i}>
          <span className="pf-dot" aria-hidden="true" />
          <div className="pf-tl-head">
            <b>{r[main]}</b>
            {(r.start || r.end || r.current) && <span className="pf-when">{[r.start, r.current ? t.present : r.end].filter(Boolean).join(" – ")}</span>}
          </div>
          {sub(r) && <div className="pf-tl-sub">{sub(r)}</div>}
          {r.description && <p>{r.description}</p>}
        </li>
      ))}
    </ol>
  );
}

export default function PortfolioView({ data = {}, card = {}, t, preview = false }) {
  const color = data.color || card.color || "#E0581A";
  const style = {
    "--c": color,
    "--c-dark": shade(color, -45),
    "--c-light": shade(color, 55),
    "--c-soft": shade(color, 90),
    "--c-line": shade(color, 75),
  };
  const role = data.headline || [card.job_title, card.company].filter(Boolean).join(" · ");
  const contacts = [
    card.email && [Mail, `mailto:${card.email}`, card.email],
    card.phone1 && [Phone, `tel:${telOf(card.phone1)}`, card.phone1],
    card.website && [Globe, card.website, hostOf(card.website)],
    card.telegram && [Send, `https://t.me/${String(card.telegram).replace(/^@/, "")}`, card.telegram],
  ].filter(Boolean);
  const has = (k) => (data[k] || []).length > 0;
  const isEmpty = !data.about && !["experience", "education", "skills", "projects", "certifications", "languages", "files"].some(has);

  return (
    <div className={`pf pf-t-${PF_THEMES.includes(data.theme) ? data.theme : "classic"} ${recipeClass(data.theme)} ${preview ? "pf-preview" : ""}`} style={style}>
      <div className="pf-shell">
        <header className="pf-hero">
          <div className="pf-hero-fx" aria-hidden="true" />
          {PF_RECIPES[data.theme]?.pat === "confetti" && (
            <>
              <div className="pf-hero-fx pf-fx2" aria-hidden="true" />
              <div className="pf-hero-fx pf-fx3" aria-hidden="true" />
            </>
          )}
          <div className="pf-hero-in">
            <div className="pf-photo">{card.photo ? <img src={card.photo} alt={card.name || ""} /> : <span>{initialOf(card.name)}</span>}</div>
            <div className="pf-hero-text">
              <h1>{card.name || "Your name"}</h1>
              {role && <p className="pf-role">{role}</p>}
              {card.address && (
                <p className="pf-where">
                  <MapPin size={14} /> {card.address}
                </p>
              )}
              {contacts.length > 0 && (
                <div className="pf-contacts">
                  {contacts.map(([Icon, href, text]) => (
                    <a key={href} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                      <Icon size={15} /> <span>{text}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="pf-main">
          {isEmpty && preview && <div className="pf-empty">{t.aboutPh}</div>}
          {data.about && (
            <Section icon={UserRound} title={t.about}>
              <p className="pf-about">{data.about}</p>
            </Section>
          )}
          {has("experience") && (
            <Section icon={BriefcaseBusiness} title={t.experience}>
              <Timeline rows={data.experience} main="title" t={t} sub={(r) => [r.company, r.location].filter(Boolean).join(" · ")} />
            </Section>
          )}
          {has("education") && (
            <Section icon={GraduationCap} title={t.education}>
              <Timeline rows={data.education} main="school" t={t} sub={(r) => [r.degree, r.field].filter(Boolean).join(" · ")} />
            </Section>
          )}
          {has("skills") && (
            <Section icon={Sparkles} title={t.skills}>
              <div className="pf-chips">
                {data.skills.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </Section>
          )}
          {has("projects") && (
            <Section icon={Globe} title={t.projects}>
              <div className="pf-projects">
                {data.projects.map((p, i) => {
                  const Tag = p.link ? "a" : "div";
                  return (
                    <Tag key={i} className="pf-project" {...(p.link ? { href: p.link, target: "_blank", rel: "noreferrer" } : {})}>
                      <b>
                        {p.title} {p.link && <ExternalLink size={14} />}
                      </b>
                      {p.description && <p>{p.description}</p>}
                      {p.link && <small>{hostOf(p.link)}</small>}
                    </Tag>
                  );
                })}
              </div>
            </Section>
          )}
          {(has("certifications") || has("languages")) && (
            <div className="pf-two">
              {has("certifications") && (
                <Section icon={Award} title={t.certifications}>
                  <ul className="pf-list">
                    {data.certifications.map((x, i) => (
                      <li key={i}>
                        <span>
                          {x.link ? (
                            <a href={x.link} target="_blank" rel="noreferrer">
                              {x.name}
                            </a>
                          ) : (
                            <b>{x.name}</b>
                          )}
                          {x.issuer && <small>{x.issuer}</small>}
                        </span>
                        {x.year && <em>{x.year}</em>}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {has("languages") && (
                <Section icon={Languages} title={t.languages}>
                  <ul className="pf-list">
                    {data.languages.map((x, i) => (
                      <li key={i}>
                        <b>{x.name}</b>
                        {x.level && <em>{x.level}</em>}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          )}

          {has("files") && (
            <Section icon={FolderOpen} title={t.documents}>
              <div className="pf-files">
                {data.files.map((f, i) => (
                  <a key={f._id || i} className={`pf-file k-${f.kind}`} href={f.url} target="_blank" rel="noreferrer">
                    <span className="pf-file-thumb">
                      {f.thumb ? <img src={f.thumb} alt="" loading="lazy" /> : <FileText size={28} />}
                      {f.kind === "pdf" && <em>PDF</em>}
                    </span>
                    <b>{f.title || (f.kind === "pdf" ? "PDF" : "")}</b>
                  </a>
                ))}
              </div>
            </Section>
          )}

        </main>
      </div>
    </div>
  );
}
