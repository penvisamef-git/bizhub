import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import usePageTitle from "../components/usePageTitle";
import Logo from "../components/Logo";
import { ROUTES } from "../config";

export default function NotFoundPage({ inApp = false }) {
  const { t } = useI18n();
  usePageTitle(t.notFound);
  return (
    <div className={inApp ? "empty-state" : "standalone-page"}>
      {!inApp && <Logo height={34} />}
      <h1>{t.notFound}</h1>
      <p>{t.notFoundSub}</p>
      <Link className="btn btn-primary" to={inApp ? ROUTES.app : ROUTES.home}>
        {inApp ? t.navDashboard : t.backHome}
      </Link>
    </div>
  );
}
