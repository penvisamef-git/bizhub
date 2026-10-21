import { useI18n } from "../i18n/I18nProvider";

export default function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
        EN
      </button>
      <button type="button" aria-pressed={lang === "km"} onClick={() => setLang("km")}>
        ខ្មែរ
      </button>
    </div>
  );
}
