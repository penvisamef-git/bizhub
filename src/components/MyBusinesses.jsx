import { useI18n } from "../i18n/I18nProvider";

// the label of the link at the top of every business page, back to the owner's list
export default function MyBusinesses() {
  const { lang } = useI18n();
  return lang === "km" ? "អាជីវកម្មរបស់ខ្ញុំ" : "My businesses";
}
