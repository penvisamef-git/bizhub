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

const UPDATED = "2026-10-11";

// Terms of Service — written for how BizHub works (coins, business types, add-ons, POS, customer data).
// Each section: [id, title, [paragraphs / bullet lists]]; a list is an array of strings.
const TEXT = {
  en: {
    title: "Terms of Service",
    updated: "Last updated: 11 October 2026",
    intro:
      "These terms are the agreement between you and BizHub when you create an account or use any BizHub service — the website, the dashboard, the POS, public pages (name cards, menus, websites) and the app. Please read them. By creating an account you agree to them.",
    back: "Back",
    contents: "Contents",
    contactTitle: "Contact us",
    sections: [
      ["about", "1. What BizHub is", ["BizHub is one account for the businesses you run. You can add different business types — for example a Digital Name Card, Website, Menu QR, Restaurant, Mini Mart, Guest House, Attendance or Debt Book — and turn on extra features (add-ons) when you need them. New business types and features may be added over time; these terms apply to all of them."]],
      [
        "account",
        "2. Your account",
        [
          [
            "You must give true information. Your email is confirmed through Google (Google sign-in or an email link). If you add a phone number, it must be yours.",
            "Keep your password secret. You are responsible for everything done with your account, including by staff you give access to (for example POS PINs).",
            "One account belongs to one person or company. You must be old enough to make a contract where you live.",
            "Tell us quickly if you think someone else is using your account.",
          ],
        ],
      ],
      [
        "coins",
        "3. Coins",
        [
          "Coins are BizHub's prepaid credit. You use them to add a business, unlock features and themes, and renew yearly services. The price in coins is always shown before you confirm.",
          [
            "You can get coins by top-up (for example KHQR, ABA or card, as shown on the website), with top-up cards, or as a gift such as the sign-up bonus.",
            "Coins are not money. They cannot be exchanged for cash, sold, or moved to another account unless BizHub offers a way to do so.",
            "Coins that were used are not refunded, except when the law requires it or when the charge was our mistake.",
            "Free / bonus coins may have conditions and can be removed if they were received by abuse.",
            "We may change coin prices and prices in coins in the future. Changes never affect what you already bought.",
          ],
        ],
      ],
      [
        "services",
        "4. Business types, add-ons and how long they last",
        [
          [
            "Some business types and add-ons are yearly: they work for 365 days from the day you buy them. Renewing adds another year on top, so you lose nothing by renewing early.",
            "When a yearly service ends, its features stop or lock until you renew. Your data stays saved, unless the account is closed (see section 11).",
            "One-time items (for example themes and looks) stay unlocked for as long as the business and your account exist.",
            "Some features are marked “Coming soon”. We do not promise a date for them.",
            "We keep improving BizHub. We may change, rename or replace features; if we remove a paid feature you are still using, we will offer a fair replacement, extra time or coins back.",
          ],
        ],
      ],
      [
        "content",
        "5. Your content and your customers' data",
        [
          "Everything you put into BizHub — names, logos, photos, menus, prices, products, staff, sales, bookings, member lists — stays yours. You give BizHub permission to store, show and process it only to run the service for you (for example to show your public menu or print your receipts).",
          [
            "You are responsible for your content: prices, taxes (such as VAT), receipts, product information and anything you publish on public pages must be correct and legal.",
            "When you collect your customers' information (for example phone numbers for reward points, guest names, staff details), you must have their permission and use it only for your business.",
            "Do not upload anything you have no right to use (photos, logos, music) or that is illegal.",
            "We may remove content that breaks these terms or the law.",
          ],
        ],
      ],
      [
        "use",
        "6. Fair use",
        [
          "You agree not to:",
          [
            "sell or advertise illegal goods or services, or use BizHub for fraud, scams or money laundering;",
            "send spam, harass people, or pretend to be another person or business;",
            "try to break into, overload, copy or reverse-engineer BizHub, or get around coin payments and limits;",
            "create accounts automatically or share one paid feature across businesses it was not bought for.",
          ],
        ],
      ],
      [
        "pos",
        "7. POS, offline use and your devices",
        [
          "The POS can keep selling without internet and sends sales when it is back online. Sales saved on a device that never reconnects, that is reset, or that is unlinked before sending, can be lost. Keep devices connected regularly, close shifts, and check your reports.",
          "You are responsible for your own devices, printers, cash and the people who use them.",
        ],
      ],
      [
        "others",
        "8. Services from other companies",
        [
          "BizHub uses trusted services to work: for example Google Firebase (sign-in and email confirmation), Cloudinary (photos), Telegram (messages you turn on), MongoDB (database) and payment providers. Using those parts of BizHub also means their own terms apply. We are not responsible for their outages.",
        ],
      ],
      [
        "privacy",
        "9. Privacy",
        [
          [
            "We collect what we need to run your account: your name, email, phone (if given), login devices, and the business data you enter.",
            "We use it to provide BizHub, keep it secure, send important account messages and improve the service. We do not sell your personal data.",
            "We share data only with the service providers in section 8, or when the law requires it.",
            "You can see and update your details in My account. To close your account or ask about your data, contact us.",
          ],
        ],
      ],
      [
        "liability",
        "10. Availability and responsibility",
        [
          "We work hard to keep BizHub running, fast and safe, but we cannot promise it will never stop or never have errors. BizHub is provided “as is”.",
          "As far as the law allows, BizHub is not responsible for lost profits, lost sales or indirect damage. If we are responsible for a problem, the most we will pay is the value of the coins you spent in the 12 months before it happened.",
        ],
      ],
      [
        "ending",
        "11. Suspending or closing an account",
        [
          [
            "You can stop using BizHub at any time and ask us to close your account.",
            "We may suspend or close an account that breaks these terms, puts others at risk, or is used illegally. Where possible we will tell you first and give you a chance to fix it.",
            "When an account is closed, unused coins and remaining service time are lost, except when the closing was not your fault. We may keep some records when the law requires it.",
          ],
        ],
      ],
      [
        "changes",
        "12. Changes and law",
        [
          "We may update these terms. When the change is important we will tell you in the dashboard or by email before it starts. Using BizHub after that means you accept the new terms.",
          "These terms follow the laws of the Kingdom of Cambodia. If there is a disagreement, we will first try to solve it together; if that fails, it goes to the competent courts of Cambodia.",
          "If this English text and the Khmer text differ, the Khmer text applies in Cambodia.",
        ],
      ],
    ],
  },
  km: {
    title: "លក្ខខណ្ឌប្រើប្រាស់",
    updated: "ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ១១ តុលា ២០២៦",
    intro:
      "លក្ខខណ្ឌនេះជាកិច្ចព្រមព្រៀងរវាងអ្នក និង BizHub នៅពេលអ្នកបង្កើតគណនី ឬប្រើសេវាណាមួយរបស់ BizHub — គេហទំព័រ ផ្ទាំងគ្រប់គ្រង POS ទំព័រសាធារណៈ (ប័ណ្ណឈ្មោះ ម៉ឺនុយ គេហទំព័រ) និងកម្មវិធី។ សូមអានឲ្យបានល្អ។ ការបង្កើតគណនី មានន័យថាអ្នកយល់ព្រមតាមលក្ខខណ្ឌនេះ។",
    back: "ត្រឡប់",
    contents: "មាតិកា",
    contactTitle: "ទាក់ទងយើង",
    sections: [
      ["about", "១. BizHub ជាអ្វី", ["BizHub ជាគណនីតែមួយសម្រាប់អាជីវកម្មទាំងអស់ដែលអ្នកដំណើរការ។ អ្នកអាចបន្ថែមប្រភេទអាជីវកម្មផ្សេងៗ — ឧ. ប័ណ្ណឈ្មោះឌីជីថល គេហទំព័រ ម៉ឺនុយ QR ភោជនីយដ្ឋាន ម៉ាត ផ្ទះសំណាក់ វត្តមាន ឬសៀវភៅបំណុល — ហើយបើកមុខងារបន្ថែម (add-ons) ពេលត្រូវការ។ ប្រភេទអាជីវកម្ម និងមុខងារថ្មីៗអាចនឹងបន្ថែមជាបន្តបន្ទាប់ ហើយលក្ខខណ្ឌនេះអនុវត្តចំពោះទាំងអស់។"]],
      [
        "account",
        "២. គណនីរបស់អ្នក",
        [
          [
            "អ្នកត្រូវផ្តល់ព័ត៌មានពិត។ អ៊ីមែលរបស់អ្នកត្រូវបានបញ្ជាក់តាមរយៈ Google (ចូលជាមួយ Google ឬតំណតាមអ៊ីមែល)។ បើអ្នកបញ្ចូលលេខទូរស័ព្ទ វាត្រូវតែជារបស់អ្នក។",
            "រក្សាពាក្យសម្ងាត់ជាការសម្ងាត់។ អ្នកទទួលខុសត្រូវលើអ្វីៗដែលធ្វើដោយគណនីរបស់អ្នក រួមទាំងបុគ្គលិកដែលអ្នកផ្តល់សិទ្ធិ (ឧ. PIN របស់ POS)។",
            "គណនីមួយសម្រាប់មនុស្សម្នាក់ ឬក្រុមហ៊ុនមួយ។ អ្នកត្រូវមានអាយុគ្រប់គ្រាន់ដើម្បីចុះកិច្ចសន្យាតាមច្បាប់នៅកន្លែងអ្នករស់នៅ។",
            "សូមប្រាប់យើងភ្លាមៗ បើអ្នកគិតថាមានអ្នកផ្សេងកំពុងប្រើគណនីរបស់អ្នក។",
          ],
        ],
      ],
      [
        "coins",
        "៣. កាក់",
        [
          "កាក់ជាឥណទានបង់ប្រាក់មុនរបស់ BizHub។ អ្នកប្រើវាដើម្បីបន្ថែមអាជីវកម្ម បើកមុខងារ និងរចនា ហើយបន្តសេវាប្រចាំឆ្នាំ។ តម្លៃជាកាក់តែងតែបង្ហាញមុនពេលអ្នកបញ្ជាក់។",
          [
            "អ្នកអាចទទួលកាក់តាមរយៈការបញ្ចូល (ឧ. KHQR, ABA ឬកាត តាមដែលបង្ហាញលើគេហទំព័រ) កាតបញ្ចូលកាក់ ឬជាអំណោយ ដូចជាកាក់ឥតគិតថ្លៃពេលចុះឈ្មោះ។",
            "កាក់មិនមែនជាប្រាក់ទេ។ វាមិនអាចប្តូរជាសាច់ប្រាក់ លក់ ឬផ្ទេរទៅគណនីផ្សេងបានទេ លុះត្រាតែ BizHub ផ្តល់មធ្យោបាយសម្រាប់ការនោះ។",
            "កាក់ដែលបានប្រើហើយ មិនត្រូវបានសងវិញទេ លើកលែងតែច្បាប់តម្រូវ ឬការគិតប្រាក់នោះជាកំហុសរបស់យើង។",
            "កាក់ឥតគិតថ្លៃ / កាក់អំណោយ អាចមានលក្ខខណ្ឌ ហើយអាចត្រូវដកវិញ បើទទួលបានដោយការបំពាន។",
            "យើងអាចផ្លាស់ប្តូរតម្លៃកាក់ និងតម្លៃជាកាក់នាពេលអនាគត។ ការផ្លាស់ប្តូរមិនប៉ះពាល់ដល់អ្វីដែលអ្នកបានទិញរួចទេ។",
          ],
        ],
      ],
      [
        "services",
        "៤. ប្រភេទអាជីវកម្ម មុខងារបន្ថែម និងរយៈពេល",
        [
          [
            "ប្រភេទអាជីវកម្ម និងមុខងារបន្ថែមខ្លះជាប្រចាំឆ្នាំ៖ ដំណើរការ ៣៦៥ ថ្ងៃ ចាប់ពីថ្ងៃទិញ។ ការបន្តនឹងបន្ថែមមួយឆ្នាំទៀតពីលើ ដូច្នេះការបន្តមុនពេលមិនធ្វើឲ្យអ្នកខាតទេ។",
            "ពេលសេវាប្រចាំឆ្នាំផុតកំណត់ មុខងាររបស់វានឹងឈប់ ឬត្រូវចាក់សោ រហូតដល់អ្នកបន្ត។ ទិន្នន័យរបស់អ្នកនៅតែរក្សាទុក លើកលែងតែគណនីត្រូវបានបិទ (មើលផ្នែកទី ១១)។",
            "របស់ទិញម្តង (ឧ. រចនា និងទម្រង់) នៅតែបើក ដរាបណាអាជីវកម្ម និងគណនីរបស់អ្នកនៅមាន។",
            "មុខងារខ្លះមានសញ្ញា «ឆាប់ៗនេះ»។ យើងមិនសន្យាកាលបរិច្ឆេទសម្រាប់មុខងារទាំងនោះទេ។",
            "យើងបន្តកែលម្អ BizHub។ យើងអាចផ្លាស់ប្តូរ ប្តូរឈ្មោះ ឬជំនួសមុខងារ។ បើយើងដកមុខងារបង់ប្រាក់ដែលអ្នកកំពុងប្រើ យើងនឹងផ្តល់ការជំនួសសមរម្យ ពេលវេលាបន្ថែម ឬសងកាក់វិញ។",
          ],
        ],
      ],
      [
        "content",
        "៥. ខ្លឹមសាររបស់អ្នក និងទិន្នន័យអតិថិជនរបស់អ្នក",
        [
          "អ្វីៗទាំងអស់ដែលអ្នកបញ្ចូលក្នុង BizHub — ឈ្មោះ ឡូហ្គោ រូបភាព ម៉ឺនុយ តម្លៃ ផលិតផល បុគ្គលិក ការលក់ ការកក់ បញ្ជីសមាជិក — នៅតែជារបស់អ្នក។ អ្នកអនុញ្ញាតឲ្យ BizHub រក្សាទុក បង្ហាញ និងដំណើរការវា តែដើម្បីផ្តល់សេវាជូនអ្នកប៉ុណ្ណោះ (ឧ. បង្ហាញម៉ឺនុយសាធារណៈ ឬបោះពុម្ពវិក្កយបត្រ)។",
          [
            "អ្នកទទួលខុសត្រូវលើខ្លឹមសាររបស់អ្នក៖ តម្លៃ ពន្ធ (ដូចជា VAT) វិក្កយបត្រ ព័ត៌មានផលិតផល និងអ្វីៗដែលអ្នកផ្សព្វផ្សាយលើទំព័រសាធារណៈ ត្រូវតែត្រឹមត្រូវ និងស្របច្បាប់។",
            "ពេលអ្នកប្រមូលព័ត៌មានអតិថិជន (ឧ. លេខទូរស័ព្ទសម្រាប់ពិន្ទុរង្វាន់ ឈ្មោះភ្ញៀវ ព័ត៌មានបុគ្គលិក) អ្នកត្រូវមានការយល់ព្រមពីពួកគេ ហើយប្រើវាសម្រាប់អាជីវកម្មរបស់អ្នកតែប៉ុណ្ណោះ។",
            "កុំបញ្ចូលអ្វីដែលអ្នកគ្មានសិទ្ធិប្រើ (រូបភាព ឡូហ្គោ តន្ត្រី) ឬអ្វីដែលខុសច្បាប់។",
            "យើងអាចលុបខ្លឹមសារដែលបំពានលក្ខខណ្ឌនេះ ឬច្បាប់។",
          ],
        ],
      ],
      [
        "use",
        "៦. ការប្រើប្រាស់ត្រឹមត្រូវ",
        [
          "អ្នកយល់ព្រមមិន៖",
          [
            "លក់ ឬផ្សព្វផ្សាយទំនិញ ឬសេវាខុសច្បាប់ ឬប្រើ BizHub សម្រាប់ការក្លែងបន្លំ ការបោកប្រាស់ ឬការលាងលុយ។",
            "ផ្ញើសាររំខាន យាយីអ្នកដទៃ ឬក្លែងខ្លួនជាមនុស្ស ឬអាជីវកម្មផ្សេង។",
            "ព្យាយាមលួចចូល ធ្វើឲ្យលើសទម្ងន់ ចម្លង ឬបំបែកកូដ BizHub ឬគេចពីការបង់កាក់ និងដែនកំណត់។",
            "បង្កើតគណនីដោយស្វ័យប្រវត្តិ ឬចែកមុខងារបង់ប្រាក់មួយទៅអាជីវកម្មដែលមិនបានទិញ។",
          ],
        ],
      ],
      [
        "pos",
        "៧. POS ការប្រើពេលគ្មានអ៊ីនធឺណិត និងឧបករណ៍របស់អ្នក",
        [
          "POS អាចលក់បានទោះគ្មានអ៊ីនធឺណិត ហើយផ្ញើការលក់ពេលមានអ៊ីនធឺណិតវិញ។ ការលក់ដែលរក្សាទុកលើឧបករណ៍ដែលមិនដែលភ្ជាប់វិញ ត្រូវបានកំណត់ឡើងវិញ ឬត្រូវបានផ្តាច់មុនពេលផ្ញើ អាចបាត់បង់។ សូមភ្ជាប់ឧបករណ៍ឲ្យបានទៀងទាត់ បិទវេន និងពិនិត្យរបាយការណ៍។",
          "អ្នកទទួលខុសត្រូវលើឧបករណ៍ ម៉ាស៊ីនព្រីន សាច់ប្រាក់ និងអ្នកដែលប្រើវា។",
        ],
      ],
      [
        "others",
        "៨. សេវាពីក្រុមហ៊ុនផ្សេង",
        [
          "BizHub ប្រើសេវាដែលទុកចិត្តបាន ដើម្បីដំណើរការ៖ ឧ. Google Firebase (ការចូលគណនី និងការបញ្ជាក់អ៊ីមែល) Cloudinary (រូបភាព) Telegram (សារដែលអ្នកបើក) MongoDB (មូលដ្ឋានទិន្នន័យ) និងអ្នកផ្តល់សេវាទូទាត់។ ការប្រើផ្នែកទាំងនោះនៃ BizHub មានន័យថាលក្ខខណ្ឌរបស់ពួកគេក៏អនុវត្តដែរ។ យើងមិនទទួលខុសត្រូវលើការរអាក់រអួលរបស់ពួកគេទេ។",
        ],
      ],
      [
        "privacy",
        "៩. ឯកជនភាព",
        [
          [
            "យើងប្រមូលអ្វីដែលចាំបាច់ដើម្បីដំណើរការគណនីរបស់អ្នក៖ ឈ្មោះ អ៊ីមែល លេខទូរស័ព្ទ (បើផ្តល់) ឧបករណ៍ដែលចូលគណនី និងទិន្នន័យអាជីវកម្មដែលអ្នកបញ្ចូល។",
            "យើងប្រើវាដើម្បីផ្តល់ BizHub រក្សាសុវត្ថិភាព ផ្ញើសារសំខាន់ៗអំពីគណនី និងកែលម្អសេវា។ យើងមិនលក់ទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នកទេ។",
            "យើងចែករំលែកទិន្នន័យតែជាមួយអ្នកផ្តល់សេវាក្នុងផ្នែកទី ៨ ឬពេលច្បាប់តម្រូវប៉ុណ្ណោះ។",
            "អ្នកអាចមើល និងកែព័ត៌មានរបស់អ្នកនៅក្នុង «គណនីរបស់ខ្ញុំ»។ ដើម្បីបិទគណនី ឬសួរអំពីទិន្នន័យរបស់អ្នក សូមទាក់ទងយើង។",
          ],
        ],
      ],
      [
        "liability",
        "១០. ភាពអាចប្រើបាន និងការទទួលខុសត្រូវ",
        [
          "យើងខិតខំរក្សា BizHub ឲ្យដំណើរការ លឿន និងមានសុវត្ថិភាព ប៉ុន្តែយើងមិនអាចសន្យាថាវានឹងមិនដែលឈប់ ឬគ្មានកំហុសទេ។ BizHub ត្រូវបានផ្តល់ «ដូចដែលមាន»។",
          "តាមដែលច្បាប់អនុញ្ញាត BizHub មិនទទួលខុសត្រូវលើការបាត់បង់ប្រាក់ចំណេញ ការលក់ ឬការខូចខាតដោយប្រយោល។ បើយើងទទួលខុសត្រូវលើបញ្ហាណាមួយ ចំនួនអតិបរមាដែលយើងនឹងសង គឺតម្លៃកាក់ដែលអ្នកបានចំណាយក្នុងរយៈពេល ១២ ខែមុនពេលបញ្ហាកើតឡើង។",
        ],
      ],
      [
        "ending",
        "១១. ការផ្អាក ឬបិទគណនី",
        [
          [
            "អ្នកអាចឈប់ប្រើ BizHub នៅពេលណាក៏បាន ហើយស្នើឲ្យយើងបិទគណនីរបស់អ្នក។",
            "យើងអាចផ្អាក ឬបិទគណនីដែលបំពានលក្ខខណ្ឌនេះ ធ្វើឲ្យអ្នកដទៃមានហានិភ័យ ឬត្រូវបានប្រើខុសច្បាប់។ បើអាចធ្វើបាន យើងនឹងប្រាប់អ្នកជាមុន ហើយផ្តល់ឱកាសឲ្យកែតម្រូវ។",
            "ពេលគណនីត្រូវបានបិទ កាក់ដែលមិនទាន់ប្រើ និងរយៈពេលសេវាដែលនៅសល់នឹងបាត់ លើកលែងតែការបិទនោះមិនមែនជាកំហុសរបស់អ្នក។ យើងអាចរក្សាកំណត់ត្រាខ្លះ ពេលច្បាប់តម្រូវ។",
          ],
        ],
      ],
      [
        "changes",
        "១២. ការផ្លាស់ប្តូរ និងច្បាប់",
        [
          "យើងអាចធ្វើបច្ចុប្បន្នភាពលក្ខខណ្ឌនេះ។ ពេលការផ្លាស់ប្តូរសំខាន់ យើងនឹងប្រាប់អ្នកក្នុងផ្ទាំងគ្រប់គ្រង ឬតាមអ៊ីមែល មុនពេលវាចាប់ផ្តើម។ ការបន្តប្រើ BizHub បន្ទាប់ពីនោះ មានន័យថាអ្នកទទួលយកលក្ខខណ្ឌថ្មី។",
          "លក្ខខណ្ឌនេះអនុវត្តតាមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា។ បើមានការមិនយល់ស្រប យើងនឹងព្យាយាមដោះស្រាយជាមួយគ្នាជាមុនសិន បើមិនបានសម្រេច នឹងបញ្ជូនទៅតុលាការមានសមត្ថកិច្ចនៃកម្ពុជា។",
          "បើអត្ថបទអង់គ្លេស និងអត្ថបទខ្មែរខុសគ្នា អត្ថបទខ្មែរត្រូវអនុវត្តនៅកម្ពុជា។",
        ],
      ],
    ],
  },
};

// Public: /terms — linked from sign-up ("you agree to our terms") and the homepage footer
export default function TermsPage() {
  const { lang } = useI18n();
  const x = TEXT[lang] || TEXT.en;
  const { settings } = useHomepageData();
  const c = settings.contact || {};
  useEffect(() => {
    document.title = `${x.title} · BizHub`;
  }, [x.title]);

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
                  ) : (
                    <p key={i}>{part}</p>
                  ),
                )}
              </section>
            ))}
            <section id="contact">
              <h2>{x.contactTitle}</h2>
              <ul className="tm-contact">
                {c.email && (
                  <li>
                    Email: <a href={`mailto:${c.email}`}>{c.email}</a>
                  </li>
                )}
                {c.phones?.length > 0 && <li>{c.phones.join(" / ")}</li>}
                {c.telegram && (
                  <li>
                    Telegram:{" "}
                    <a href={c.telegram_url || "#"} target="_blank" rel="noreferrer">
                      {c.telegram}
                    </a>
                  </li>
                )}
                {c.address && <li>{c.address}</li>}
              </ul>
              <p>
                <Link to={ROUTES.privacy}>{lang === "km" ? "គោលការណ៍ឯកជនភាព" : "Privacy Policy"}</Link> · <Link to={ROUTES.deleteAccount}>{lang === "km" ? "លុបគណនី" : "Delete account"}</Link>
              </p>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
