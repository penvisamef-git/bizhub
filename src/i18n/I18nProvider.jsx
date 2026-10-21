import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MESSAGES } from "./messages";
import { HOME_TEXT } from "../homepage/content";

const STORAGE_KEY = "bizhub_lang";
const I18nContext = createContext(null);

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "km" || saved === "en") return saved;
  } catch {
    /* storage blocked */
  }
  return (navigator.language || "").toLowerCase().startsWith("km") ? "km" : "en";
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage blocked */
    }
  }, [lang]);

  const setLang = useCallback((l) => setLangState(l === "km" ? "km" : "en"), []);
  const toggleLang = useCallback(() => setLangState((l) => (l === "km" ? "en" : "km")), []);

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t: { ...HOME_TEXT[lang], ...MESSAGES[lang] } }),
    [lang, setLang, toggleLang]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
