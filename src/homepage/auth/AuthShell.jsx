import { Link } from "react-router-dom";
import "./auth.css";
import Logo from "../../components/Logo";
import LangSwitch from "../../components/LangSwitch";
import ThemeToggle from "../../components/ThemeToggle";
import { useI18n } from "../../i18n/I18nProvider";
import useHomepageData from "../useHomepageData";
import AuthSlides from "./AuthSlides";

// Shared layout for login and sign-up: brand panel on the left (desktop), form on the right.
export default function AuthShell({ children }) {
  const { t } = useI18n();
  const { vars, services } = useHomepageData(); // sign-up bonus + business types from Website settings
  return (
    <div className="auth">
      <aside className="auth-aside">
        <span className="glow" />
        <Link to="/" style={{ position: "relative", alignSelf: "flex-start" }}>
          <Logo height={32} white />
        </Link>
        <AuthSlides services={services} />
        <h2>{t.authAside}</h2>
        <p>{t.authAsideSub}</p>
        <span className="bonus">{t.freeCoins.replace("{bonus}", vars.bonus)}</span>
      </aside>
      <main className="auth-main">
        <div className="auth-top">
          <Link to="/" className="auth-logo-sm">
            <Logo height={28} />
          </Link>
          <div className="tools">
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
        <div className="auth-form-wrap">{children}</div>
      </main>
    </div>
  );
}
