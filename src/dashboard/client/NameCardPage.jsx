import { IdCard } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import ComingSoon from "./ComingSoon";

// Digital Name Card service (first service to build) → dashboard/client/name_card later
export default function NameCardPage() {
  const { t } = useI18n();
  return <ComingSoon icon={IdCard} title={t.navNameCard} text={t.nameCardSoon} />;
}
