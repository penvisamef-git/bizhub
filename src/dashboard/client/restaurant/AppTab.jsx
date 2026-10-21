import { BellRing, Clock3, Layers, ReceiptText, Smartphone, WifiOff } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { useI18n } from "../../../i18n/I18nProvider";

const TEXT = {
  en: {
    title: "BizHub app for Android & iOS",
    sub: "One POS app on phones and tablets for every place you run — restaurant, café, shop — all connected to BizHub.",
    f1: "Sell from a phone or tablet: tables, orders, bills",
    f2: "All your businesses in one app, switch with one tap",
    f3: "Keeps selling when the internet drops, syncs later",
    f4: "Kitchen and bill printing from the app",
    f5: "Sales and alerts in your pocket",
    price: "{coins} coins / year",
    soon: "Coming soon",
    note: "We'll tell you when it's ready. Nothing to pay now.",
  },
  km: {
    title: "កម្មវិធី BizHub សម្រាប់ Android និង iOS",
    sub: "កម្មវិធី POS តែមួយលើទូរស័ព្ទ និងថេប្លេត សម្រាប់គ្រប់ទីតាំងដែលអ្នកគ្រប់គ្រង — ភោជនីយដ្ឋាន ហាងកាហ្វេ ហាង — ភ្ជាប់ទាំងអស់ទៅ BizHub។",
    f1: "លក់ពីទូរស័ព្ទ ឬថេប្លេត៖ តុ ការកុម្ម៉ង់ វិក្កយបត្រ",
    f2: "អាជីវកម្មទាំងអស់ក្នុងកម្មវិធីតែមួយ ប្តូរដោយចុចម្តង",
    f3: "នៅតែលក់បាន ពេលដាច់អ៊ីនធឺណិត រួចធ្វើសមកាលកម្មពេលក្រោយ",
    f4: "ព្រីនផ្ទះបាយ និងវិក្កយបត្រពីកម្មវិធី",
    f5: "ការលក់ និងការជូនដំណឹងក្នុងហោប៉ៅរបស់អ្នក",
    price: "{coins} កាក់ / ឆ្នាំ",
    soon: "នឹងមានឆាប់ៗ",
    note: "យើងនឹងប្រាប់អ្នក ពេលវារួចរាល់។ មិនចាំបាច់បង់ឥឡូវនេះទេ។",
  },
};

// App (Android / iOS) — coming soon
export default function AppTab({ ctx }) {
  const { lang } = useI18n();
  const t = TEXT[lang] || TEXT.en;
  const price = ctx.overview.addons.find((a) => a.key === "rest_app")?.price ?? 120;
  const features = [
    [ReceiptText, t.f1],
    [Layers, t.f2],
    [WifiOff, t.f3],
    [Smartphone, t.f4],
    [BellRing, t.f5],
  ];
  return (
    <div className="rs-col">
      <section className="panel-card ap-hero">
        <div className="ap-art" aria-hidden="true">
          <span className="ap-tablet">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="ap-phone">
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="ap-text">
          <span className="rs-pill">
            <Clock3 size={12} /> {t.soon}
          </span>
          <h2>{t.title}</h2>
          <p className="rs-muted">{t.sub}</p>
          <ul className="ap-list">
            {features.map(([Icon, label]) => (
              <li key={label}>
                <Icon size={16} /> {label}
              </li>
            ))}
          </ul>
          <div className="ap-buy">
            <span className="ap-price">
              <CoinIcon size={16} /> {t.price.replace("{coins}", price)}
            </span>
            <button type="button" className="md-btn md-btn-primary" disabled>
              {t.soon}
            </button>
          </div>
          <small className="rs-muted">{t.note}</small>
        </div>
      </section>
    </div>
  );
}
