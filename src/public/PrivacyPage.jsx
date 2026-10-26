import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "../components/Logo";
import LangSwitch from "../components/LangSwitch";
import ThemeToggle from "../components/ThemeToggle";
import { useI18n } from "../i18n/I18nProvider";
import useHomepageData from "../homepage/useHomepageData";
import { ROUTES } from "../config";
import "./terms.css";

const UPDATED = "2026-10-21";
export const OPERATOR = "Blackcorp Enterprise";
export const CONTACT_EMAIL = "bizhubcambodia@gmail.com";

// Privacy Policy — what BizHub (operated by Blackcorp Enterprise) collects, why, who helps us, how long, your choices.
// Each section: [id, title, [paragraphs / bullet lists]]; a list is an array of strings. Same layout as TermsPage.
const TEXT = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: 21 October 2026",
    intro: `BizHub is operated by ${OPERATOR} ("we", "us"). This policy explains what information we collect when you use BizHub — the website bizhubcambodia.com, the dashboard, the POS, public pages (name cards, menus, websites, notes, tickets) and the BizHub apps — why we use it, who helps us run the service, and the choices you have.`,
    back: "Back",
    contents: "Contents",
    contactTitle: "Contact us",
    contactOperator: `BizHub is operated by ${OPERATOR}.`,
    sections: [
      [
        "collect",
        "1. Information we collect",
        [
          "Information you give us:",
          [
            "Account: your name, email address, password (stored only as a secure hash), phone number if you add one, and profile photo.",
            "Business content: everything you add to your businesses — names, logos, menus, products, prices, orders, invoices, customers, staff, notes, files, documents, photos and voice notes you upload or record.",
            "Payments: coin purchases and the payment proof (screenshot or reference) you send us, and the coins you spend on business types, add-ons and themes. Card or bank details are handled by your bank or payment app; we do not receive card numbers.",
            "Messages: what you write to BizHub support (“Chat with BizHub”), including files and voice messages.",
          ],
          "Information collected when you use BizHub:",
          [
            "Login and security: the device type, operating system and browser you log in from, your IP address, and the time of logins, so we can show you your active sessions and protect your account.",
            "Usage: basic technical logs (for example errors and slow requests) to keep the service working.",
          ],
          "Information from the people who use your business pages: when your customers or staff use a BizHub page you created (for example ordering from a table QR, replying to a shared note, buying a ticket or checking in to work), the information they enter is stored in your business so you can see it.",
        ],
      ],
      [
        "device",
        "2. Camera, photos, microphone and location",
        [
          [
            "Camera: only when you choose to scan a QR code (for example to log in, redeem a top-up card or check a ticket) or take a photo to upload.",
            "Photos and files: only the pictures and files you pick to upload.",
            "Microphone: only while you record a voice note or voice message yourself.",
            "Location: only in features that need it and only with your permission — for example staff checking in for attendance, or a restaurant that asks guests to be at the restaurant to order. The BizHub owner app does not track your location.",
          ],
          "You can turn these permissions off at any time in your phone or browser settings; the rest of BizHub keeps working.",
        ],
      ],
      [
        "use",
        "3. How we use it",
        [
          [
            "To provide BizHub: create your account, run your businesses and show your public pages.",
            "To keep it secure: confirm logins, prevent abuse and fraud, and show you your sessions.",
            "To process coins and purchases, and keep the money records the law asks us to keep.",
            "To answer you when you contact support, and to send important account messages (for example a login code or a deletion notice).",
            "To improve BizHub and fix problems.",
          ],
          "We do not sell your personal information, and we do not show third-party ads in BizHub.",
        ],
      ],
      [
        "share",
        "4. Who we share it with",
        [
          "We use trusted service providers to run BizHub. They process data only on our behalf:",
          [
            "Google Firebase — sign-in with Google, email links and phone codes.",
            "MongoDB Atlas — the database where account and business data is stored.",
            "Cloudinary — storage and delivery of the files, photos, documents and voice notes you upload.",
            "Vercel and Google Firebase Hosting — hosting of the BizHub servers and website.",
            "Telegram — only if you choose to connect Telegram for alerts or reports; the messages you turn on are sent through Telegram.",
          ],
          "Information you put on public pages (for example your name card, menu, website or a note you share by link) is visible to anyone you share it with. We may also share information if the law requires it, or to protect the rights and safety of our users and BizHub.",
        ],
      ],
      [
        "keep",
        "5. How long we keep it",
        [
          "We keep your information for as long as your account exists. If you delete a business, its data is removed. If you delete your account, everything is erased 30 days later (see below). Coin purchase and payment records (including Google Play purchases) are kept for 5 years without your name or contact details, for accounting and tax. Login and error logs are kept for up to 90 days.",
        ],
      ],
      [
        "delete",
        "6. Deleting your account",
        [
          "You can delete your account at any time: in the app (My account → Delete my account) or on the website (My account → Delete my account). You then have 30 days to change your mind — logging in again cancels the deletion. After 30 days your businesses, files, coins, chat and profile are erased and cannot be recovered.",
          "Full details and help: bizhubcambodia.com/delete-account.",
        ],
      ],
      [
        "rights",
        "7. Your choices",
        [
          [
            "See and change your account information in My account.",
            "Download or delete your business content from each business.",
            "Ask us for a copy of your information, or ask us to correct or delete it, by emailing us.",
          ],
        ],
      ],
      ["security", "8. Security", ["Your password is stored only as a secure hash, connections use HTTPS, and files are delivered through signed links where needed. No system is perfectly safe, so please keep your password secret and tell us if you think your account was used by someone else."]],
      ["children", "9. Children", ["BizHub is for business owners and is not meant for children under 13. We do not knowingly collect information from children. If you believe a child has given us information, contact us and we will delete it."]],
      ["changes", "10. Changes to this policy", ["We may update this policy when BizHub changes. We will change the date at the top, and tell you in BizHub if the change is important."]],
    ],
  },
  km: {
    title: "គោលការណ៍ឯកជនភាព",
    updated: "ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ២១ តុលា ២០២៦",
    intro: `BizHub ត្រូវបានគ្រប់គ្រងដោយ ${OPERATOR} ("យើង")។ គោលការណ៍នេះពន្យល់ពីព័ត៌មានដែលយើងប្រមូល នៅពេលអ្នកប្រើ BizHub — គេហទំព័រ bizhubcambodia.com ផ្ទាំងគ្រប់គ្រង ប្រព័ន្ធ POS ទំព័រសាធារណៈ (ប័ណ្ណឈ្មោះ ម៉ឺនុយ គេហទំព័រ កំណត់ត្រា សំបុត្រ) និងកម្មវិធី BizHub — មូលហេតុដែលយើងប្រើវា អ្នកណាជួយយើងដំណើរការសេវាកម្ម និងជម្រើសដែលអ្នកមាន។`,
    back: "ត្រឡប់ក្រោយ",
    contents: "មាតិកា",
    contactTitle: "ទាក់ទងយើង",
    contactOperator: `BizHub ត្រូវបានគ្រប់គ្រងដោយ ${OPERATOR}។`,
    sections: [
      [
        "collect",
        "១. ព័ត៌មានដែលយើងប្រមូល",
        [
          "ព័ត៌មានដែលអ្នកផ្តល់ឲ្យយើង៖",
          [
            "គណនី៖ ឈ្មោះ អាសយដ្ឋានអ៊ីមែល ពាក្យសម្ងាត់ (រក្សាទុកតែជាទម្រង់ hash សុវត្ថិភាព) លេខទូរស័ព្ទ ប្រសិនបើអ្នកបញ្ចូល និងរូបថតប្រវត្តិរូប។",
            "ខ្លឹមសារអាជីវកម្ម៖ អ្វីៗទាំងអស់ដែលអ្នកបញ្ចូលក្នុងអាជីវកម្មរបស់អ្នក — ឈ្មោះ ឡូហ្គោ ម៉ឺនុយ ទំនិញ តម្លៃ ការកម្ម៉ង់ វិក្កយបត្រ អតិថិជន បុគ្គលិក កំណត់ត្រា ឯកសារ រូបភាព និងសារជាសំឡេងដែលអ្នកដាក់ ឬថត។",
            "ការបង់ប្រាក់៖ ការទិញកាក់ និងភស្តុតាងបង់ប្រាក់ (រូបថតអេក្រង់ ឬលេខយោង) ដែលអ្នកផ្ញើមកយើង និងកាក់ដែលអ្នកចាយលើប្រភេទអាជីវកម្ម មុខងារបន្ថែម និងរចនាប័ទ្ម។ ព័ត៌មានកាត ឬគណនីធនាគារ ត្រូវបានគ្រប់គ្រងដោយធនាគារ ឬកម្មវិធីបង់ប្រាក់របស់អ្នក យើងមិនទទួលលេខកាតទេ។",
            "សារ៖ អ្វីដែលអ្នកសរសេរទៅផ្នែកជំនួយ BizHub (“ជជែកជាមួយ BizHub”) រួមទាំងឯកសារ និងសារជាសំឡេង។",
          ],
          "ព័ត៌មានដែលប្រមូលនៅពេលអ្នកប្រើ BizHub៖",
          [
            "ការចូលគណនី និងសុវត្ថិភាព៖ ប្រភេទឧបករណ៍ ប្រព័ន្ធប្រតិបត្តិការ និងកម្មវិធីរុករកដែលអ្នកប្រើចូល អាសយដ្ឋាន IP និងពេលវេលាចូល ដើម្បីបង្ហាញឧបករណ៍ដែលកំពុងចូល និងការពារគណនីរបស់អ្នក។",
            "ការប្រើប្រាស់៖ កំណត់ហេតុបច្ចេកទេសមូលដ្ឋាន (ឧ. កំហុស និងការឆ្លើយតបយឺត) ដើម្បីរក្សាសេវាកម្មឲ្យដំណើរការល្អ។",
          ],
          "ព័ត៌មានពីអ្នកដែលប្រើទំព័រអាជីវកម្មរបស់អ្នក៖ នៅពេលអតិថិជន ឬបុគ្គលិករបស់អ្នកប្រើទំព័រ BizHub ដែលអ្នកបានបង្កើត (ឧ. កម្ម៉ង់ពី QR តុ ឆ្លើយតបកំណត់ត្រាដែលបានចែករំលែក ទិញសំបុត្រ ឬចុះវត្តមាន) ព័ត៌មានដែលពួកគេបញ្ចូលត្រូវបានរក្សាទុកក្នុងអាជីវកម្មរបស់អ្នក ដើម្បីឲ្យអ្នកអាចមើលឃើញ។",
        ],
      ],
      [
        "device",
        "២. កាមេរ៉ា រូបភាព មីក្រូហ្វូន និងទីតាំង",
        [
          [
            "កាមេរ៉ា៖ តែនៅពេលអ្នកជ្រើសរើសស្កេន QR (ឧ. ដើម្បីចូលគណនី ប្រើកាតបញ្ចូលកាក់ ឬពិនិត្យសំបុត្រ) ឬថតរូបដើម្បីដាក់។",
            "រូបភាព និងឯកសារ៖ តែរូបភាព និងឯកសារដែលអ្នកជ្រើសរើសដាក់ប៉ុណ្ណោះ។",
            "មីក្រូហ្វូន៖ តែពេលអ្នកថតសារជាសំឡេងដោយខ្លួនឯងប៉ុណ្ណោះ។",
            "ទីតាំង៖ តែក្នុងមុខងារដែលត្រូវការ និងតែពេលអ្នកអនុញ្ញាត — ឧ. បុគ្គលិកចុះវត្តមាន ឬភោជនីយដ្ឋានដែលតម្រូវឲ្យភ្ញៀវនៅក្នុងហាងដើម្បីកម្ម៉ង់។ កម្មវិធី BizHub សម្រាប់ម្ចាស់អាជីវកម្ម មិនតាមដានទីតាំងរបស់អ្នកទេ។",
          ],
          "អ្នកអាចបិទការអនុញ្ញាតទាំងនេះបានគ្រប់ពេល ក្នុងការកំណត់ទូរស័ព្ទ ឬកម្មវិធីរុករក ហើយផ្នែកផ្សេងទៀតរបស់ BizHub នៅតែដំណើរការ។",
        ],
      ],
      [
        "use",
        "៣. របៀបដែលយើងប្រើប្រាស់",
        [
          [
            "ដើម្បីផ្តល់សេវា BizHub៖ បង្កើតគណនី ដំណើរការអាជីវកម្ម និងបង្ហាញទំព័រសាធារណៈរបស់អ្នក។",
            "ដើម្បីរក្សាសុវត្ថិភាព៖ បញ្ជាក់ការចូលគណនី ការពារការរំលោភ និងការក្លែងបន្លំ និងបង្ហាញឧបករណ៍ដែលកំពុងចូល។",
            "ដើម្បីដំណើរការកាក់ និងការទិញ ហើយរក្សាកំណត់ត្រាហិរញ្ញវត្ថុតាមច្បាប់តម្រូវ។",
            "ដើម្បីឆ្លើយតបនៅពេលអ្នកទាក់ទងផ្នែកជំនួយ និងផ្ញើសារសំខាន់ៗអំពីគណនី (ឧ. លេខកូដចូល ឬការជូនដំណឹងអំពីការលុប)។",
            "ដើម្បីកែលម្អ BizHub និងដោះស្រាយបញ្ហា។",
          ],
          "យើងមិនលក់ព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នកទេ ហើយយើងមិនបង្ហាញការផ្សាយពាណិជ្ជកម្មពីភាគីទីបីក្នុង BizHub ទេ។",
        ],
      ],
      [
        "share",
        "៤. អ្នកដែលយើងចែករំលែកជាមួយ",
        [
          "យើងប្រើអ្នកផ្តល់សេវាដែលទុកចិត្តបាន ដើម្បីដំណើរការ BizHub។ ពួកគេដំណើរការទិន្នន័យតែក្នុងនាមយើងប៉ុណ្ណោះ៖",
          [
            "Google Firebase — ការចូលគណនីដោយ Google តំណភ្ជាប់អ៊ីមែល និងលេខកូដទូរស័ព្ទ។",
            "MongoDB Atlas — មូលដ្ឋានទិន្នន័យដែលរក្សាទុកគណនី និងទិន្នន័យអាជីវកម្ម។",
            "Cloudinary — ការរក្សាទុក និងចែកចាយឯកសារ រូបភាព និងសារជាសំឡេងដែលអ្នកដាក់។",
            "Vercel និង Google Firebase Hosting — ម៉ាស៊ីនមេ និងគេហទំព័រ BizHub។",
            "Telegram — តែនៅពេលអ្នកជ្រើសរើសភ្ជាប់ Telegram សម្រាប់ការជូនដំណឹង ឬរបាយការណ៍ប៉ុណ្ណោះ។",
          ],
          "ព័ត៌មានដែលអ្នកដាក់លើទំព័រសាធារណៈ (ឧ. ប័ណ្ណឈ្មោះ ម៉ឺនុយ គេហទំព័រ ឬកំណត់ត្រាដែលអ្នកចែករំលែកតាមតំណ) អាចមើលឃើញដោយអ្នកដែលអ្នកចែករំលែកឲ្យ។ យើងក៏អាចចែករំលែកព័ត៌មាន ប្រសិនបើច្បាប់តម្រូវ ឬដើម្បីការពារសិទ្ធិ និងសុវត្ថិភាពរបស់អ្នកប្រើ និង BizHub។",
        ],
      ],
      ["keep", "៥. រយៈពេលរក្សាទុក", ["យើងរក្សាព័ត៌មានរបស់អ្នក ដរាបណាគណនីរបស់អ្នកនៅមាន។ ប្រសិនបើអ្នកលុបអាជីវកម្ម ទិន្នន័យរបស់វាត្រូវបានលុប។ ប្រសិនបើអ្នកលុបគណនី អ្វីៗទាំងអស់ត្រូវបានលុបក្រោយ 30 ថ្ងៃ (មើលខាងក្រោម)។ កំណត់ត្រាទិញកាក់ និងការបង់ប្រាក់ (រួមទាំងការទិញតាម Google Play) ត្រូវបានរក្សាទុក 5 ឆ្នាំ ដោយគ្មានឈ្មោះ ឬព័ត៌មានទំនាក់ទំនងរបស់អ្នក សម្រាប់គណនេយ្យ និងពន្ធ។ កំណត់ត្រាចូលគណនី និងកំហុសប្រព័ន្ធ ត្រូវបានរក្សាទុករហូតដល់ 90 ថ្ងៃ។"]],
      [
        "delete",
        "៦. ការលុបគណនីរបស់អ្នក",
        [
          "អ្នកអាចលុបគណនីបានគ្រប់ពេល៖ ក្នុងកម្មវិធី (គណនីរបស់ខ្ញុំ → លុបគណនីរបស់ខ្ញុំ) ឬលើគេហទំព័រ (គណនីរបស់ខ្ញុំ → លុបគណនីរបស់ខ្ញុំ)។ បន្ទាប់មកអ្នកមាន 30 ថ្ងៃដើម្បីប្តូរចិត្ត — ការចូលគណនីម្តងទៀតនឹងបោះបង់ការលុប។ ក្រោយ 30 ថ្ងៃ អាជីវកម្ម ឯកសារ កាក់ ការជជែក និងប្រវត្តិរូបរបស់អ្នកត្រូវបានលុប ហើយមិនអាចយកមកវិញបានទេ។",
          "ព័ត៌មានលម្អិត និងជំនួយ៖ bizhubcambodia.com/delete-account។",
        ],
      ],
      [
        "rights",
        "៧. ជម្រើសរបស់អ្នក",
        [
          [
            "មើល និងកែប្រែព័ត៌មានគណនីរបស់អ្នក នៅក្នុង “គណនីរបស់ខ្ញុំ”។",
            "ទាញយក ឬលុបខ្លឹមសារអាជីវកម្មពីអាជីវកម្មនីមួយៗ។",
            "ស្នើសុំច្បាប់ចម្លងព័ត៌មានរបស់អ្នក ឬស្នើឲ្យកែ ឬលុបវា ដោយផ្ញើអ៊ីមែលមកយើង។",
          ],
        ],
      ],
      ["security", "៨. សុវត្ថិភាព", ["ពាក្យសម្ងាត់របស់អ្នកត្រូវបានរក្សាទុកតែជាទម្រង់ hash សុវត្ថិភាព ការតភ្ជាប់ប្រើ HTTPS ហើយឯកសារត្រូវបានចែកចាយតាមតំណដែលមានហត្ថលេខានៅពេលចាំបាច់។ គ្មានប្រព័ន្ធណាមានសុវត្ថិភាពពេញលេញទេ ដូច្នេះសូមរក្សាពាក្យសម្ងាត់ឲ្យសម្ងាត់ ហើយប្រាប់យើង ប្រសិនបើអ្នកគិតថាមាននរណាម្នាក់ប្រើគណនីរបស់អ្នក។"]],
      ["children", "៩. កុមារ", ["BizHub សម្រាប់ម្ចាស់អាជីវកម្ម មិនមែនសម្រាប់កុមារអាយុក្រោម 13 ឆ្នាំទេ។ យើងមិនប្រមូលព័ត៌មានពីកុមារដោយចេតនាទេ។ ប្រសិនបើអ្នកគិតថាកុមារបានផ្តល់ព័ត៌មានមកយើង សូមទាក់ទងយើង ហើយយើងនឹងលុបវា។"]],
      ["changes", "១០. ការផ្លាស់ប្តូរគោលការណ៍នេះ", ["យើងអាចធ្វើបច្ចុប្បន្នភាពគោលការណ៍នេះ នៅពេល BizHub មានការផ្លាស់ប្តូរ។ យើងនឹងប្តូរកាលបរិច្ឆេទខាងលើ ហើយប្រាប់អ្នកក្នុង BizHub ប្រសិនបើការផ្លាស់ប្តូរនោះសំខាន់។"]],
    ],
  },
};

// Public: /privacy — linked from the homepage footer, sign-up, the app and the Google Play listing
export default function PrivacyPage() {
  const { lang } = useI18n();
  const x = TEXT[lang] || TEXT.en;
  const { settings } = useHomepageData();
  const c = settings.contact || {};
  useEffect(() => {
    document.title = `${x.title} · BizHub`;
  }, [x.title]);
  const email = c.email || CONTACT_EMAIL;

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
      <main className="tm-wrap">
        <button type="button" className="tm-back" onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = ROUTES.home))}>
          <ArrowLeft size={16} /> {x.back}
        </button>
        <h1>{x.title}</h1>
        <p className="tm-updated">
          <time dateTime={UPDATED}>{x.updated}</time>
        </p>
        <p className="tm-intro">{x.intro}</p>
        <div className="tm-body">
          <nav className="tm-toc" aria-label={x.contents}>
            <b>{x.contents}</b>
            <ol>
              {x.sections.map(([id, title]) => (
                <li key={id}>
                  <a href={`#${id}`}>{title.replace(/^[0-9០-៩]+\.\s*/, "")}</a>
                </li>
              ))}
              <li>
                <a href="#contact">{x.contactTitle}</a>
              </li>
            </ol>
          </nav>
          <article className="tm-text">
            {x.sections.map(([id, title, parts]) => (
              <section key={id} id={id}>
                <h2>{title}</h2>
                {parts.map((part, i) =>
                  Array.isArray(part) ? (
                    <ul key={i}>
                      {part.map((li) => (
                        <li key={li}>{li}</li>
                      ))}
                    </ul>
                  ) : id === "delete" && part.includes("bizhubcambodia.com/delete-account") ? (
                    <p key={i}>
                      {part.split("bizhubcambodia.com/delete-account")[0]}
                      <Link to={ROUTES.deleteAccount}>bizhubcambodia.com/delete-account</Link>
                      {part.split("bizhubcambodia.com/delete-account")[1]}
                    </p>
                  ) : (
                    <p key={i}>{part}</p>
                  ),
                )}
              </section>
            ))}
            <section id="contact">
              <h2>{x.contactTitle}</h2>
              <p>{x.contactOperator}</p>
              <ul className="tm-contact">
                <li>
                  Email: <a href={`mailto:${email}`}>{email}</a>
                </li>
                <li>
                  Website: <a href="https://bizhubcambodia.com">bizhubcambodia.com</a>
                </li>
                {c.phones?.length > 0 && <li>{c.phones.join(" / ")}</li>}
                {c.telegram && (
                  <li>
                    Telegram:{" "}
                    <a href={c.telegram_url || "#"} target="_blank" rel="noreferrer">
                      {c.telegram}
                    </a>
                  </li>
                )}
              </ul>
              <p>
                <Link to={ROUTES.terms}>{lang === "km" ? "លក្ខខណ្ឌប្រើប្រាស់" : "Terms of Service"}</Link>
              </p>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
