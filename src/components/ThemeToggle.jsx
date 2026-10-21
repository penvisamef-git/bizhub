import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";
import { useI18n } from "../i18n/I18nProvider";

export default function ThemeToggle({ className = "icon-btn" }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  return (
    <button type="button" className={className} onClick={toggleTheme} aria-label={t.themeLabel} title={t.themeLabel}>
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
