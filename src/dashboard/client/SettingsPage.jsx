import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Check, ChevronRight, Moon, Plus, Sun } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import { ACCENTS, STYLES, loadStyleFont, useTheme } from "../../theme/ThemeProvider";
import LangSwitch from "../../components/LangSwitch";
import "./settings.css";

const TEXT = {
  en: {
    colorTheme: "Colour theme",
    colorSub: "Changes the colours of your dashboard. Your public pages keep their own look.",
    mode: "Mode",
    names: { ember: "Ember", ocean: "Ocean", forest: "Forest", royal: "Royal", rose: "Rose", lagoon: "Lagoon", gold: "Angkor gold", graphite: "Graphite" },
    preview: "Preview",
    sales: "Sales today",
    styleTitle: "Style",
    styleSub: "The shape of everything: corners, shadows, fonts and background. Every style works with every colour.",
    colorTitle: "Colour",
    custom: "Your colour",
    styles: { floating: "Floating (default)", flat: "Flat", glass: "Glass", sharp: "Sharp", soft: "Soft", outline: "Outline", studio: "Studio", compact: "Compact", bold: "Bold", paper: "Paper", neumorph: "Neumorph", aurora: "Aurora" },
    styleNotes: {
      floating: "Soft floating cards",
      flat: "No shadows, thin lines",
      glass: "Frosted glass on colour",
      sharp: "Square corners · Inter",
      soft: "Very round · Nunito",
      outline: "Clear borders · DM Sans",
      studio: "Dark menu · Manrope",
      compact: "More on screen",
      bold: "Thick lines · Space Grotesk",
      paper: "Warm paper · serif titles",
      neumorph: "Raised surfaces · Poppins",
      aurora: "Colour wash · Outfit",
    },
  },
  km: {
    colorTheme: "ពណ៌ផ្ទាំង",
    colorSub: "ប្តូរពណ៌ផ្ទាំងគ្រប់គ្រងរបស់អ្នក។ ទំព័រសាធារណៈរក្សារចនាផ្ទាល់ខ្លួន។",
    mode: "របៀប",
    names: { ember: "ភ្លើង", ocean: "សមុទ្រ", forest: "ព្រៃឈើ", royal: "រាជវង្ស", rose: "ផ្កាកុលាប", lagoon: "បឹង", gold: "មាសអង្គរ", graphite: "ក្រាហ្វីត" },
    preview: "មើលជាមុន",
    sales: "ការលក់ថ្ងៃនេះ",
    styleTitle: "រចនាប័ទ្ម",
    styleSub: "រូបរាងទាំងអស់៖ ជ្រុង ស្រមោល ពុម្ពអក្សរ និងផ្ទៃខាងក្រោយ។ រចនាប័ទ្មនីមួយៗប្រើបានជាមួយគ្រប់ពណ៌។",
    colorTitle: "ពណ៌",
    custom: "ពណ៌របស់អ្នក",
    styles: { floating: "អណ្តែត (លំនាំដើម)", flat: "រាបស្មើ", glass: "កញ្ចក់", sharp: "ជ្រុងមុត", soft: "ទន់", outline: "បន្ទាត់ជុំវិញ", studio: "ស្ទូឌីយោ", compact: "បង្រួម", bold: "ដិត", paper: "ក្រដាស", neumorph: "ផុសឡើង", aurora: "អូរ៉ូរ៉ា" },
    styleNotes: {
      floating: "កាតអណ្តែតទន់ៗ",
      flat: "គ្មានស្រមោល បន្ទាត់ស្តើង",
      glass: "កញ្ចក់ព្រិលលើពណ៌",
      sharp: "ជ្រុងការ៉េ · Inter",
      soft: "មូលខ្លាំង · Nunito",
      outline: "បន្ទាត់ច្បាស់ · DM Sans",
      studio: "ម៉ឺនុយងងឹត · Manrope",
      compact: "ឃើញច្រើនលើអេក្រង់",
      bold: "បន្ទាត់ក្រាស់ · Space Grotesk",
      paper: "ក្រដាសកក់ក្តៅ · ចំណងជើង serif",
      neumorph: "ផ្ទៃផុស · Poppins",
      aurora: "ពណ៌លាប · Outfit",
    },
  },
};

export default function SettingsPage() {
  const { t, lang } = useI18n();
  const x = TEXT[lang] || TEXT.en;
  const { theme, setTheme, accent, setAccent, style, setStyle, color, setColor } = useTheme();
  const [pending, setPending] = useState(color);
  const [touched, setTouched] = useState(false);
  // the colour picker sends many values while dragging: use the last one
  useEffect(() => {
    if (!touched) return undefined;
    const t = setTimeout(() => setColor(pending), 350);
    return () => clearTimeout(t);
  }, [pending, touched, setColor]);
  // the cards show each style in its own font
  useEffect(() => STYLES.forEach((v) => loadStyleFont(v.id)), []);
  return (
    <div className="st-page">
      <section className="panel-card">
        <h2>{t.settingsTitle}</h2>
        <div className="setting-row">
          <span>{t.language}</span>
          <LangSwitch />
        </div>
        <div className="setting-row">
          <span>{x.mode}</span>
          <div className="lang-switch" role="group" aria-label={x.mode}>
            <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
              <Sun size={14} /> {t.themeLight}
            </button>
            <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
              <Moon size={14} /> {t.themeDark}
            </button>
          </div>
        </div>
        <div className="setting-row">
          <span>{t.accountLink}</span>
          <Link to="/app/account" className="icon-btn" aria-label={t.accountLink}>
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      <section className="panel-card">
        <h2>{x.styleTitle}</h2>
        <p className="st-sub">{x.styleSub}</p>
        <div className="st-themes st-styles" role="radiogroup" aria-label={x.styleTitle}>
          {STYLES.map((v) => (
            <button key={v.id} type="button" role="radio" aria-checked={style === v.id} className={`st-theme ${style === v.id ? "on" : ""}`} onClick={() => setStyle(v.id)} data-testid={`st-style-${v.id}`}>
              <span className={`st-mock sm-${v.id}`} style={{ "--a1": "var(--brand)", "--a2": "var(--brand-2)", fontFamily: v.font ? `'${v.font}', sans-serif` : undefined }} aria-hidden="true">
                <i className="st-mock-side">
                  <b />
                  <b className="on" />
                  <b />
                </i>
                <i className="st-mock-main">
                  <b className="st-mock-card">Aa</b>
                  <b className="st-mock-bars">
                    <u style={{ height: "40%" }} />
                    <u style={{ height: "70%" }} />
                    <u style={{ height: "55%" }} />
                    <u className="now" style={{ height: "90%" }} />
                  </b>
                </i>
              </span>
              <span className="st-theme-name">
                {x.styles[v.id]}
                {style === v.id && <Check size={15} />}
              </span>
              <small className="st-note">{x.styleNotes[v.id]}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <h2>{x.colorTitle}</h2>
        <p className="st-sub">{x.colorSub}</p>
        <div className="st-themes" role="radiogroup" aria-label={x.colorTheme}>
          {ACCENTS.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={accent === a.id} className={`st-theme ${accent === a.id ? "on" : ""}`} onClick={() => setAccent(a.id)}>
              <span className="st-mock" style={{ "--a1": a.colors[0], "--a2": a.colors[1] }} aria-hidden="true">
                <i className="st-mock-side">
                  <b />
                  <b className="on" />
                  <b />
                </i>
                <i className="st-mock-main">
                  <b className="st-mock-card" />
                  <b className="st-mock-bars">
                    <u style={{ height: "40%" }} />
                    <u style={{ height: "70%" }} />
                    <u style={{ height: "55%" }} />
                    <u className="now" style={{ height: "90%" }} />
                  </b>
                </i>
              </span>
              <span className="st-theme-name">
                <span className="st-dot" style={{ background: `linear-gradient(135deg, ${a.colors[0]}, ${a.colors[1]})` }} />
                {x.names[a.id]}
                {accent === a.id && <Check size={15} />}
              </span>
            </button>
          ))}
          <label className={`st-theme st-custom ${accent === "custom" ? "on" : ""}`} data-testid="st-custom">
            <span className="st-mock st-custom-mock" style={{ "--a1": accent === "custom" ? color : pending, "--a2": accent === "custom" ? color : pending }} aria-hidden="true">
              <Plus size={26} />
              <input
                type="color"
                value={accent === "custom" ? color : pending}
                onChange={(e) => {
                  setTouched(true);
                  setPending(e.target.value);
                }}
                aria-label={x.custom}
              />
            </span>
            <span className="st-theme-name">
              <span className="st-dot" style={{ background: accent === "custom" ? color : pending }} />
              {x.custom}
              {accent === "custom" && <Check size={15} />}
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}
