import { useI18n } from "../../i18n/I18nProvider";

export default function ComingSoon({ icon: Icon, title, text }) {
  const { t } = useI18n();
  return (
    <div className="panel-card soon-card">
      <span className="soon-icon">
        <Icon size={38} aria-hidden="true" />
      </span>
      <span className="badge" style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "var(--active)", color: "var(--accent)" }}>
        {t.comingSoon}
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
