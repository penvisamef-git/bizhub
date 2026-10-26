import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarClock, CheckCircle2, Mail, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import Logo from "../components/Logo";
import LangSwitch from "../components/LangSwitch";
import ThemeToggle from "../components/ThemeToggle";
import { useI18n } from "../i18n/I18nProvider";
import { auth } from "../lib/auth";
import { ROUTES } from "../config";
import { CONTACT_EMAIL, OPERATOR } from "./PrivacyPage";
import "./terms.css";

// Public: /delete-account — the "account deletion" link for Google Play / App Store.
// Logged out: how it works + where to do it + help by email. Logged in: straight to My account → Delete my account.
const TEXT = {
  en: {
    title: "Delete your BizHub account",
    intro: `BizHub is operated by ${OPERATOR}. You can delete your BizHub account and the data in it at any time — in the BizHub app or on this website.`,
    back: "Back",
    goNow: "Go to Delete my account",
    login: "Log in to delete your account",
    howTitle: "How to delete your account",
    inApp: "In the BizHub app",
    inAppSteps: ["Open the BizHub app and log in.", "Tap your account (My account).", "Tap “Delete my account”, read the warning and confirm with your password or Google."],
    onWeb: "On the website",
    onWebSteps: ["Log in at bizhubcambodia.com.", "Open My account.", "Click “Delete my account”, read the warning and confirm with your password or Google."],
    graceTitle: "30 days to change your mind",
    grace: "After you ask, your account is kept for 30 days. Log in again (or tap “Cancel deletion”) during that time and nothing is lost. Other devices are logged out at once.",
    deletedTitle: "What is deleted after 30 days",
    deleted: [
      "Your account: name, email, phone number, profile photo and password.",
      "Every business in your account and all its data (menus, products, orders, customers, staff, notes, tickets and more).",
      "All files, photos, documents and voice notes you uploaded.",
      "Your coins, add-ons and themes (coins are not refunded), and your chat with BizHub.",
      "Your logins on every device.",
      "The links and QR codes of your businesses (name cards, menus, notes, events…) stop working.",
    ],
    keptTitle: "What is kept",
    kept: "Coin purchase and payment records (including Google Play purchases) are kept for 5 years without your name or contact details, for accounting and tax. Login and error logs are kept for up to 90 days, then deleted. Nothing else is kept.",
    helpTitle: "Can't log in?",
    help: `Email us from the email address of your account at ${CONTACT_EMAIL} with the subject “Delete my account”. We will confirm it is you and delete the account for you.`,
    privacy: "Privacy Policy",
  },
  km: {
    title: "លុបគណនី BizHub របស់អ្នក",
    intro: `BizHub ត្រូវបានគ្រប់គ្រងដោយ ${OPERATOR}។ អ្នកអាចលុបគណនី BizHub និងទិន្នន័យក្នុងនោះបានគ្រប់ពេល — ក្នុងកម្មវិធី BizHub ឬលើគេហទំព័រនេះ។`,
    back: "ត្រឡប់ក្រោយ",
    goNow: "ទៅកាន់ “លុបគណនីរបស់ខ្ញុំ”",
    login: "ចូលគណនីដើម្បីលុប",
    howTitle: "របៀបលុបគណនីរបស់អ្នក",
    inApp: "ក្នុងកម្មវិធី BizHub",
    inAppSteps: ["បើកកម្មវិធី BizHub ហើយចូលគណនី។", "ចុចលើគណនីរបស់អ្នក (គណនីរបស់ខ្ញុំ)។", "ចុច “លុបគណនីរបស់ខ្ញុំ” អានការព្រមាន ហើយបញ្ជាក់ដោយពាក្យសម្ងាត់ ឬ Google។"],
    onWeb: "លើគេហទំព័រ",
    onWebSteps: ["ចូលគណនីនៅ bizhubcambodia.com។", "បើក “គណនីរបស់ខ្ញុំ”។", "ចុច “លុបគណនីរបស់ខ្ញុំ” អានការព្រមាន ហើយបញ្ជាក់ដោយពាក្យសម្ងាត់ ឬ Google។"],
    graceTitle: "30 ថ្ងៃដើម្បីប្តូរចិត្ត",
    grace: "បន្ទាប់ពីអ្នកស្នើសុំ គណនីរបស់អ្នកត្រូវបានរក្សាទុក 30 ថ្ងៃ។ ចូលគណនីម្តងទៀត (ឬចុច “បោះបង់ការលុប”) ក្នុងរយៈពេលនោះ នោះគ្មានអ្វីបាត់ទេ។ ឧបករណ៍ផ្សេងទៀតត្រូវបានចាកចេញភ្លាមៗ។",
    deletedTitle: "អ្វីដែលត្រូវលុបក្រោយ 30 ថ្ងៃ",
    deleted: [
      "គណនីរបស់អ្នក៖ ឈ្មោះ អ៊ីមែល លេខទូរស័ព្ទ រូបថតប្រវត្តិរូប និងពាក្យសម្ងាត់។",
      "អាជីវកម្មទាំងអស់ក្នុងគណនី និងទិន្នន័យទាំងអស់ (ម៉ឺនុយ ទំនិញ ការកម្ម៉ង់ អតិថិជន បុគ្គលិក កំណត់ត្រា សំបុត្រ និងច្រើនទៀត)។",
      "ឯកសារ រូបភាព និងសារជាសំឡេងទាំងអស់ដែលអ្នកបានដាក់។",
      "កាក់ មុខងារបន្ថែម និងរចនាប័ទ្មរបស់អ្នក (កាក់មិនត្រូវបានសងវិញទេ) និងការជជែកជាមួយ BizHub។",
      "ការចូលគណនីលើគ្រប់ឧបករណ៍។",
      "តំណ និងកូដ QR នៃអាជីវកម្មរបស់អ្នក (កាតឈ្មោះ មុខម្ហូប កំណត់ត្រា ព្រឹត្តិការណ៍…) នឹងលែងដំណើរការ។",
    ],
    keptTitle: "អ្វីដែលត្រូវរក្សាទុក",
    kept: "កំណត់ត្រាទិញកាក់ និងការបង់ប្រាក់ (រួមទាំងការទិញតាម Google Play) ត្រូវបានរក្សាទុក 5 ឆ្នាំ ដោយគ្មានឈ្មោះ ឬព័ត៌មានទំនាក់ទំនងរបស់អ្នក សម្រាប់គណនេយ្យ និងពន្ធ។ កំណត់ត្រាចូលគណនី និងកំហុសប្រព័ន្ធ ត្រូវបានរក្សាទុករហូតដល់ 90 ថ្ងៃ រួចលុបចោល។ គ្មានអ្វីផ្សេងទៀតត្រូវបានរក្សាទុកទេ។",
    helpTitle: "មិនអាចចូលគណនីបាន?",
    help: `សូមផ្ញើអ៊ីមែលពីអាសយដ្ឋានអ៊ីមែលនៃគណនីរបស់អ្នក មក ${CONTACT_EMAIL} ដោយដាក់ប្រធានបទ “Delete my account”។ យើងនឹងបញ្ជាក់ថាជាអ្នក ហើយលុបគណនីជូនអ្នក។`,
    privacy: "គោលការណ៍ឯកជនភាព",
  },
};

export default function DeleteAccountPage() {
  const { lang } = useI18n();
  const x = TEXT[lang] || TEXT.en;
  const loggedIn = !!auth.getClientLogin()?.access_token || !!auth.getClientLogin()?.token;
  useEffect(() => {
    document.title = `${x.title} · BizHub`;
  }, [x.title]);
  const cta = loggedIn ? (
    <Link className="tm-cta" to={`${ROUTES.account}#delete-account`} data-testid="del-go">
      <Trash2 size={17} /> {x.goNow}
    </Link>
  ) : (
    <Link className="tm-cta" to={`${ROUTES.login}?next=${encodeURIComponent(`${ROUTES.account}#delete-account`)}`} data-testid="del-login">
      <Trash2 size={17} /> {x.login}
    </Link>
  );

  return (
    <div className="tm">
      <header className="tm-top">
        <Link to={ROUTES.home} className="tm-logo">
          <Logo height={28} />
        </Link>
        <div className="tm-tools">
          <LangSwitch />
          <ThemeToggle />
        </div>
      </header>
      <main className="tm-wrap tm-del">
        <button type="button" className="tm-back" onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = ROUTES.home))}>
          <ArrowLeft size={16} /> {x.back}
        </button>
        <h1>{x.title}</h1>
        <p className="tm-intro">{x.intro}</p>
        <div className="tm-del-cta">{cta}</div>

        <h2 className="tm-del-h">{x.howTitle}</h2>
        <div className="tm-del-grid">
          <section className="tm-del-card">
            <h3>
              <Smartphone size={18} /> {x.inApp}
            </h3>
            <ol>
              {x.inAppSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
          <section className="tm-del-card">
            <h3>
              <ShieldCheck size={18} /> {x.onWeb}
            </h3>
            <ol>
              {x.onWebSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
        </div>

        <section className="tm-del-card tm-del-grace">
          <h3>
            <CalendarClock size={18} /> {x.graceTitle}
          </h3>
          <p>{x.grace}</p>
        </section>

        <div className="tm-del-grid">
          <section className="tm-del-card">
            <h3>
              <Trash2 size={18} /> {x.deletedTitle}
            </h3>
            <ul>
              {x.deleted.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
          <section className="tm-del-card">
            <h3>
              <CheckCircle2 size={18} /> {x.keptTitle}
            </h3>
            <p>{x.kept}</p>
            <h3 className="tm-del-h3">
              <Mail size={18} /> {x.helpTitle}
            </h3>
            <p>{x.help}</p>
            <p>
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Delete my account")}`}>{CONTACT_EMAIL}</a>
            </p>
          </section>
        </div>
        <p className="tm-del-foot">
          <Link to={ROUTES.privacy}>{x.privacy}</Link> · <Link to={ROUTES.terms}>{lang === "km" ? "លក្ខខណ្ឌប្រើប្រាស់" : "Terms of Service"}</Link>
        </p>
      </main>
    </div>
  );
}
