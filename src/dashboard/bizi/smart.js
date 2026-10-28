// Bizi search (v3.0.0): what makes the page search "smart" without asking the server
//   • more words for each section, EN + KM ("fee" finds Delivery, "printer" finds Print, "ពណ៌" finds Design)
//   • the BizHub pages outside a business (wallet, buy coins, settings…) and a few actions (dark mode, language)
//   • small typing mistakes ("delivry", "custmers")
//   • the smart words the server understands, as one-tap suggestions
import { MESSAGES } from "../../i18n/messages";

// more words for a section, by its tab key (any business type): English · Khmer
export const TAB_WORDS = {
  orders: "order orders bill receipt sale buy kitchen · ការកម្ម៉ង់ វិក្កយបត្រ លក់",
  products: "product item price stock photo add new menu · ទំនិញ តម្លៃ ស្តុក មុខទំនិញ",
  menu: "menu item food drink dish price · ម៉ឺនុយ ម្ហូប ភេសជ្ជៈ តម្លៃ",
  customers: "customer client people contact member phone · អតិថិជន មនុស្ស លេខទូរស័ព្ទ",
  staff: "staff employee worker cashier pin screen tablet · បុគ្គលិក អ្នកគិតលុយ",
  promos: "promo discount coupon code sale offer percent · បញ្ចុះតម្លៃ កូដ ប្រូម៉ូសិន",
  messages: "message broadcast send telegram announce · សារ ផ្ញើ",
  remind: "reminder cart abandoned · រំលឹក កន្ត្រក",
  report: "report sales income money excel export chart revenue profit · របាយការណ៍ ចំណូល លុយ",
  reports: "report sales income money excel export chart revenue bills · របាយការណ៍ ចំណូល វិក្កយបត្រ",
  store: "settings shop name logo address phone hours open close khqr payment pay cash fee delivery fee pickup table · ការកំណត់ ហាង ម៉ោង បង់ប្រាក់ ថ្លៃដឹក",
  delivery: "delivery fee zone area km rider driver map · ដឹក ថ្លៃដឹក តំបន់ អ្នកដឹក",
  design: "design theme colour color look style template · រចនា ពណ៌ ម៉ូដ",
  looks: "design theme colour color look style template · រចនា ពណ៌ ម៉ូដ",
  style: "design theme colour color look font · រចនា ពណ៌ ម៉ូដ",
  poslook: "pos look theme colour · ពណ៌ ម៉ូដ",
  share: "share link qr telegram channel bot post · ចែករំលែក តំណ QR",
  addons: "addon add-on unlock buy coins feature extra · មុខងារបន្ថែម ដោះសោ កាក់",
  telegram: "telegram bot group alert notify · តេឡេក្រាម ជូនដំណឹង",
  pos: "pos device tablet phone pair code app cashier · ឧបករណ៍ ភ្ជាប់",
  print: "print printer receipt paper · បោះពុម្ព ម៉ាស៊ីនបោះពុម្ព",
  receipt: "receipt print printer bill paper · វិក្កយបត្រ បោះពុម្ព",
  money: "money currency riel dollar khr usd rate payment khqr · លុយ រូបិយប័ណ្ណ អត្រា",
  tables: "table zone floor qr seat · តុ",
  stock: "stock inventory count low out · ស្តុក ចំនួន",
  sales: "sales receipts bills history today · ការលក់ វិក្កយបត្រ",
  today: "today now dashboard · ថ្ងៃនេះ",
  bookings: "booking reservation guest check in out stay · ការកក់ ភ្ញៀវ",
  rooms: "room price bed floor · បន្ទប់ តម្លៃ",
  calendar: "calendar dates month week · ប្រតិទិន",
  settings: "settings options · ការកំណត់",
  profile: "profile business info name logo address phone · ព័ត៌មាន ឈ្មោះ ឡូហ្គោ អាសយដ្ឋាន",
  website: "website site web page online · គេហទំព័រ",
  branches: "branch branches shop location · សាខា",
  events: "event concert show ticket · កម្មវិធី សំបុត្រ",
  guests: "guest check in door scan ticket · ភ្ញៀវ ចូល ស្កេន",
  team: "team door phone staff scan · ក្រុម",
  payment: "payment bank khqr aba organiser payout · បង់ប្រាក់ ធនាគារ",
  stamp: "stamp give add card · បោះត្រា",
  shopqr: "qr shop poster · QR",
  desk: "desk staff pin · បុគ្គលិក",
  payroll: "payroll salary pay wages · ប្រាក់ខែ",
  leave: "leave holiday day off sick · ច្បាប់ ឈប់",
  roster: "roster schedule shift plan · កាលវិភាគ វេន",
  shifts: "shift time hours · វេន ម៉ោង",
  kiosk: "kiosk door tablet clock in qr · ថេប្លេត",
  history: "history log past · ប្រវត្តិ",
  stats: "stats statistics visits scans numbers · ស្ថិតិ",
  inbox: "inbox messages contact form · សារ",
  rewards: "rewards points loyalty members · ពិន្ទុ រង្វាន់",
  loyalty: "loyalty points members rewards · ពិន្ទុ សមាជិក",
  debt: "debt owe credit · ជំពាក់ បំណុល",
  expiry: "expiry expire date · ផុតកំណត់",
  purchase: "purchase order buy supplier stock in · ទិញចូល",
  suppliers: "supplier vendor · អ្នកផ្គត់ផ្គង់",
  profit: "profit cost margin · ប្រាក់ចំណេញ",
  reminders: "reminder telegram remind owe · រំលឹក",
  excel: "excel import export csv · នាំចូល នាំចេញ",
  notes: "notes note write · កំណត់ត្រា",
  books: "book pdf flip upload · សៀវភៅ",
  codes: "qr code generator link · កូដ QR",
  pages: "pages page edit text · ទំព័រ",
  blog: "blog news post article · ព័ត៌មាន",
  housekeeping: "housekeeping clean room · សម្អាត",
  police: "police report foreign guest · ប៉ូលីស",
  ota: "booking.com agoda airbnb ota calendar sync · កក់",
};

// BizHub pages outside a business: [path, message key, more words]
export const GLOBAL_PAGES = [
  ["/app/dashboard", "navDashboard", "home today sales overview · ទំព័រដើម ថ្ងៃនេះ"],
  ["/app/businesses", "navBusinesses", "my businesses shops list · អាជីវកម្ម ហាង"],
  ["/app/businesses", "addBusiness", "add new business create open shop · បន្ថែម បង្កើត ហាងថ្មី"],
  ["/app/wallet", "navWallet", "coins wallet balance history card · កាក់ កាបូប"],
  ["/app/licenses?tab=coins", "buyCoins", "buy coins top up topup khqr pay · ទិញកាក់ បញ្ចូលកាក់"],
  ["/app/licenses", "navLicenses", "licenses renew year plan expire · អាជ្ញាប័ណ្ណ បន្ត"],
  ["/app/account", "navAccount", "account profile password email phone photo delete · គណនី ពាក្យសម្ងាត់"],
  ["/app/settings", "navSettings", "settings colour color theme language · ការកំណត់ ពណ៌ ភាសា"],
  ["/app/support", "navSupport", "help support chat contact bizhub problem · ជំនួយ ជជែក"],
  ["/app/updates", "navUpdates", "system activity changelog version what's new updates · កំណែ អ្វីថ្មី"],
];
export const pageName = (key, lang) => MESSAGES[lang]?.[key] || MESSAGES.en?.[key] || (key === "buyCoins" ? (lang === "km" ? "ទិញកាក់" : "Buy coins") : key);

// one small typing mistake (a letter missing, extra, wrong or swapped)
export function near(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || a.length < 4) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const ra = a.slice(i + 1);
  const rb = b.slice(i + 1);
  return ra === rb || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
}

// does the word appear in the text (inside a word, or one mistake away from a whole word)?
export function hit(word, text, fuzzy = true) {
  if (text.includes(word)) return 2;
  if (!fuzzy || word.length < 4) return 0;
  return text.split(/[\s·,/&()-]+/).some((t) => near(word, t)) ? 1 : 0;
}

// the smart words, as one-tap suggestions when the box is empty
export const SUGGEST = {
  en: [
    ["new orders", "New orders"],
    ["unpaid", "Not paid yet"],
    ["orders today", "Today's orders"],
    ["sold out", "Sold out"],
    ["low stock", "Low stock"],
    ["staying", "Guests staying"],
  ],
  km: [
    ["ការកម្ម៉ង់ថ្មី", "ការកម្ម៉ង់ថ្មី"],
    ["មិនទាន់បង់", "មិនទាន់បង់"],
    ["ការកម្ម៉ង់ ថ្ងៃនេះ", "ការកម្ម៉ង់ថ្ងៃនេះ"],
    ["អស់ស្តុក", "អស់ស្តុក"],
    ["ស្តុកតិច", "ស្តុកតិច"],
    ["កំពុងស្នាក់", "ភ្ញៀវកំពុងស្នាក់"],
  ],
};
