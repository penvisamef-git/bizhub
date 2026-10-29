// Bizi on the homepage (v3.2.0): the "Meet Bizi" demo (sample data, it types by itself) and the visitor guide — the
// questions people ask before they sign up. No AI, nothing from anybody's account: the answers are written here, the
// prices come from the homepage settings ({bonus} {pack} {price} {payments} are filled in like the other texts).
//
// A guide answer: { id, words, popular, en: { q, steps }, km: { q, steps }, show?, go? }
//   show  "prices" (each service's price) · "services" (the services, each opens its sheet) · "contact" (how to reach us)
//   go    where its button goes: "signup" | "#pos" | "#app" | "#coins" | "#services" | "#talk" | "#follow"

export const GUIDE = [
  {
    id: "what",
    popular: true,
    words: "what is bizhub about who explain business platform system all in one · BizHub ជាអ្វី អំពី ប្រព័ន្ធ អាជីវកម្ម",
    en: {
      q: "What is BizHub?",
      steps: [
        "BizHub runs your whole business in one app, made in Cambodia for Cambodian businesses.",
        "Restaurant and mini mart POS, guest house, a Telegram shop, online menus, websites, name cards, staff attendance, debt book, stamp cards, events and more.",
        "Use it on the website, the BizHub app and the POS app (phone, tablet, Mac, Windows) — in Khmer or English.",
      ],
    },
    km: {
      q: "តើ BizHub ជាអ្វី?",
      steps: [
        "BizHub ដំណើរការអាជីវកម្មទាំងមូលរបស់អ្នកក្នុងកម្មវិធីតែមួយ ផលិតនៅកម្ពុជាសម្រាប់អាជីវកម្មកម្ពុជា។",
        "POS ភោជនីយដ្ឋាន និងហាងលក់ទំនិញ ផ្ទះសំណាក់ ហាង Telegram ម៉ឺនុយអនឡាញ គេហទំព័រ កាតឈ្មោះ វត្តមានបុគ្គលិក សៀវភៅបំណុល កាតត្រា ព្រឹត្តិការណ៍ និងច្រើនទៀត។",
        "ប្រើលើគេហទំព័រ កម្មវិធី BizHub និងកម្មវិធី POS (ទូរស័ព្ទ ថេប្លេត Mac Windows) — ជាភាសាខ្មែរ ឬអង់គ្លេស។",
      ],
    },
    show: "services",
    go: "signup",
  },
  {
    id: "price",
    popular: true,
    words: "price prices cost costs how much pay money fee expensive cheap coins coin plan · តម្លៃ ថ្លៃ ប៉ុន្មាន លុយ កាក់ បង់",
    en: {
      q: "How much does it cost?",
      steps: ["You pay with BizHub coins: {pack} coins = ${price}. You get {bonus} free coins when you sign up.", "Each business type has its own price — some once, some per year:"],
    },
    km: {
      q: "តើតម្លៃប៉ុន្មាន?",
      steps: ["អ្នកបង់ដោយកាក់ BizHub៖ {pack} កាក់ = ${price}។ អ្នកទទួល {bonus} កាក់ឥតគិតថ្លៃពេលចុះឈ្មោះ។", "ប្រភេទអាជីវកម្មនីមួយៗមានតម្លៃរៀងៗខ្លួន — ខ្លះបង់ម្តង ខ្លះបង់រៀងរាល់ឆ្នាំ៖"],
    },
    show: "prices",
    go: "#coins",
  },
  {
    id: "free",
    popular: true,
    words: "free trial try test demo bonus no money gift · ឥតគិតថ្លៃ សាកល្បង សាក ដោយឥតគិតថ្លៃ ថ្លៃដើម",
    en: {
      q: "Can I try it for free?",
      steps: ["Yes. Sign up and you get {bonus} free coins — enough to add a business and try it.", "The POS app also has “Try demo”: a sample shop with the staff PIN 1234, no account needed."],
    },
    km: {
      q: "តើខ្ញុំអាចសាកល្បងដោយឥតគិតថ្លៃបានទេ?",
      steps: ["បាន។ ចុះឈ្មោះ ហើយអ្នកទទួល {bonus} កាក់ឥតគិតថ្លៃ — គ្រប់គ្រាន់ដើម្បីបន្ថែមអាជីវកម្ម និងសាកល្បង។", "កម្មវិធី POS ក៏មាន “សាកល្បង” ដែរ៖ ហាងគំរូជាមួយ PIN បុគ្គលិក 1234 មិនចាំបាច់មានគណនី។"],
    },
    go: "signup",
  },
  {
    id: "start",
    popular: true,
    words: "start begin sign up signup register account open how to start first step · ចាប់ផ្តើម ចុះឈ្មោះ បង្កើតគណនី គណនី",
    en: {
      q: "How do I start?",
      steps: ["Sign up with your phone or Google — you get {bonus} free coins.", "Add your business (restaurant, shop, guest house…) and turn on what you need.", "Open the POS or the app and start selling. Bizi shows you what isn't set up yet."],
    },
    km: {
      q: "តើខ្ញុំចាប់ផ្តើមយ៉ាងម៉េច?",
      steps: ["ចុះឈ្មោះដោយលេខទូរស័ព្ទ ឬ Google — អ្នកទទួល {bonus} កាក់ឥតគិតថ្លៃ។", "បន្ថែមអាជីវកម្មរបស់អ្នក (ភោជនីយដ្ឋាន ហាង ផ្ទះសំណាក់…) ហើយបើកអ្វីដែលអ្នកត្រូវការ។", "បើក POS ឬកម្មវិធី ហើយចាប់ផ្តើមលក់។ Bizi ប្រាប់អ្នកពីអ្វីដែលមិនទាន់រៀបចំ។"],
    },
    go: "signup",
  },
  {
    id: "types",
    words: "which business types kinds services what can run shop restaurant cafe mart store guest house hotel support · អាជីវកម្មអ្វីខ្លះ ប្រភេទ សេវាកម្ម ហាង",
    en: { q: "Which businesses can I run with it?", steps: ["Tap one to see what it does and its price:"] },
    km: { q: "តើខ្ញុំអាចដំណើរការអាជីវកម្មអ្វីខ្លះ?", steps: ["ចុចមួយដើម្បីមើលអ្វីដែលវាធ្វើ និងតម្លៃ៖"] },
    show: "services",
    go: "#services",
  },
  {
    id: "pos",
    popular: true,
    words: "pos cashier counter sell selling offline internet no internet printer receipt tablet ipad mac windows computer · POS គិតលុយ លក់ គ្មានអ៊ីនធឺណិត ព្រីន វិក្កយបត្រ កុំព្យូទ័រ",
    en: {
      q: "Is there a POS? Does it work offline?",
      steps: ["Yes — the BizHub POS for restaurants, mini marts, guest houses, Telegram shops and events.", "It keeps selling without internet and sends everything when the internet is back.", "Phones, tablets, Mac and Windows; receipt printers, cash drawers, barcode scanners and a customer screen."],
    },
    km: {
      q: "តើមាន POS ទេ? ដំណើរការដោយគ្មានអ៊ីនធឺណិតបានទេ?",
      steps: ["មាន — BizHub POS សម្រាប់ភោជនីយដ្ឋាន ហាងលក់ទំនិញ ផ្ទះសំណាក់ ហាង Telegram និងព្រឹត្តិការណ៍។", "វានៅតែលក់បានដោយគ្មានអ៊ីនធឺណិត ហើយបញ្ជូនទាំងអស់ពេលមានអ៊ីនធឺណិតវិញ។", "ទូរស័ព្ទ ថេប្លេត Mac និង Windows; ម៉ាស៊ីនព្រីនវិក្កយបត្រ ថតលុយ ម៉ាស៊ីនស្កេនបាកូដ និងអេក្រង់អតិថិជន។"],
    },
    go: "#pos",
  },
  {
    id: "pay",
    words: "how pay buy coins top up payment khqr aba bank card wing acleda method · បង់ ទិញកាក់ បញ្ចូលលុយ KHQR ABA ធនាគារ",
    en: { q: "How do I buy coins?", steps: ["In your account: Wallet → Buy coins.", "Pay with {payments}. The coins come right after the payment is checked."] },
    km: { q: "តើខ្ញុំទិញកាក់យ៉ាងម៉េច?", steps: ["ក្នុងគណនីរបស់អ្នក៖ កាបូប → ទិញកាក់។", "បង់តាម {payments}។ កាក់ចូលភ្លាមបន្ទាប់ពីពិនិត្យការបង់ប្រាក់។"] },
    go: "#coins",
  },
  {
    id: "app",
    words: "app mobile phone android iphone ios play store download application · កម្មវិធី ទូរស័ព្ទ ទាញយក Android iPhone",
    en: { q: "Is there a phone app?", steps: ["Yes — the BizHub app for owners (Android, iPhone soon) and the BizHub POS app for the counter.", "Everything is the same as on the website: your businesses, wallet, reports and Bizi."] },
    km: { q: "តើមានកម្មវិធីទូរស័ព្ទទេ?", steps: ["មាន — កម្មវិធី BizHub សម្រាប់ម្ចាស់ (Android, iPhone ឆាប់ៗ) និងកម្មវិធី BizHub POS សម្រាប់កន្លែងគិតលុយ។", "អ្វីៗដូចគ្នានឹងគេហទំព័រ៖ អាជីវកម្ម កាបូប របាយការណ៍ និង Bizi។"] },
    go: "#app",
  },
  {
    id: "telegram",
    words: "telegram bot channel group order online shop alert message notify · Telegram តេឡេក្រាម ហាងអនឡាញ សារ ជូនដំណឹង",
    en: { q: "Does it work with Telegram?", steps: ["Yes. Customers order in your Telegram shop, your staff group gets every order, and you get the daily report.", "Bizi can send you a morning summary and alerts on Telegram too."] },
    km: { q: "តើវាដំណើរការជាមួយ Telegram ទេ?", steps: ["បាទ/ចាស។ អតិថិជនកុម្ម៉ង់ក្នុងហាង Telegram របស់អ្នក ក្រុមបុគ្គលិកទទួលការកុម្ម៉ង់ទាំងអស់ ហើយអ្នកទទួលរបាយការណ៍ប្រចាំថ្ងៃ។", "Bizi ក៏អាចផ្ញើសេចក្តីសង្ខេបពេលព្រឹក និងការជូនដំណឹងលើ Telegram ដែរ។"] },
  },
  {
    id: "khmer",
    words: "khmer language english cambodian riel dollar currency · ខ្មែរ ភាសា អង់គ្លេស រៀល ដុល្លារ",
    en: { q: "Is it in Khmer? Riel and dollars?", steps: ["Khmer and English everywhere — switch any time.", "Prices and receipts in dollars and riel, with your own exchange rate."] },
    km: { q: "តើមានភាសាខ្មែរទេ? រៀល និងដុល្លារ?", steps: ["ភាសាខ្មែរ និងអង់គ្លេសគ្រប់កន្លែង — ប្តូរបានគ្រប់ពេល។", "តម្លៃ និងវិក្កយបត្រជាដុល្លារ និងរៀល តាមអត្រាប្តូរប្រាក់របស់អ្នក។"] },
  },
  {
    id: "team",
    words: "staff team employee cashier manager many users share access role · បុគ្គលិក ក្រុម អ្នកគិតលុយ អ្នកគ្រប់គ្រង",
    en: { q: "Can my staff use it?", steps: ["Yes. Cashiers log in on the POS with their own PIN.", "Add your team to a business: Admin (can do everything) or View only."] },
    km: { q: "តើបុគ្គលិករបស់ខ្ញុំអាចប្រើបានទេ?", steps: ["បាន។ អ្នកគិតលុយចូល POS ដោយ PIN ផ្ទាល់ខ្លួន។", "បន្ថែមក្រុមរបស់អ្នកទៅអាជីវកម្ម៖ Admin (ធ្វើបានទាំងអស់) ឬ មើលប៉ុណ្ណោះ។"] },
  },
  {
    id: "bizi",
    words: "bizi helper assistant robot ai who are you · Bizi ជំនួយការ អ្នកណា",
    en: { q: "Who is Bizi?", steps: ["I'm the BizHub helper! In your account I find anything in all your businesses, tell you what's waiting, and do things for you — I always ask first.", "Type or say it, in Khmer or English: “#12 paid”, “coke +24”, “check out Dara”."] },
    km: { q: "តើ Bizi ជានរណា?", steps: ["ខ្ញុំជាជំនួយការ BizHub! ក្នុងគណនីរបស់អ្នក ខ្ញុំរកអ្វីៗក្នុងអាជីវកម្មទាំងអស់ ប្រាប់អ្នកពីអ្វីដែលកំពុងរង់ចាំ ហើយធ្វើការងារឲ្យអ្នក — ខ្ញុំតែងតែសួរជាមុនសិន។", "វាយ ឬនិយាយ ជាភាសាខ្មែរ ឬអង់គ្លេស៖ “#12 បានបង់” “កូកា +24” “ចាកចេញ ដារ៉ា”។"] },
    go: "#bizi",
  },
  {
    id: "contact",
    popular: true,
    words: "contact talk call phone person human support help team chat question email · ទាក់ទង និយាយ ទូរស័ព្ទ ជំនួយ ក្រុមការងារ សួរ",
    en: { q: "Can I talk to a person?", steps: ["Of course — the BizHub team answers on Telegram and by phone:"] },
    km: { q: "តើខ្ញុំអាចនិយាយជាមួយមនុស្សបានទេ?", steps: ["ពិតណាស់ — ក្រុមការងារ BizHub ឆ្លើយតាម Telegram និងទូរស័ព្ទ៖"] },
    show: "contact",
    go: "#talk",
  },
  {
    id: "follow",
    words: "follow facebook tiktok youtube coolapp telegram channel social news video · តាមដាន ហ្វេសប៊ុក យូធូប ប៉ុស្តិ៍ វីដេអូ ព័ត៌មាន",
    en: { q: "Where can I follow BizHub?", steps: ["Facebook, TikTok, YouTube, CoolApp and our Telegram channel — news, tips and short videos."] },
    km: { q: "តើខ្ញុំអាចតាមដាន BizHub នៅឯណា?", steps: ["Facebook, TikTok, YouTube, CoolApp និងប៉ុស្តិ៍ Telegram របស់យើង — ព័ត៌មាន គន្លឹះ និងវីដេអូខ្លីៗ។"] },
    go: "#follow",
  },
];

// what Bizi does, shown in the "Meet Bizi" box (sample shop, nothing real): typed → found → asked → done
export const DEMO = {
  en: [
    { q: "#12 paid", row: ["#12", "Mekong Coffee · Telegram · Dara", "$6.50"], act: "Paid", ask: "Mark order #12 paid?", ok: "Order #12 is paid" },
    { q: "coke +24", row: ["Coca-Cola can", "Lucky Mini Mart · 3 left", "$0.80"], act: "+24 stock", ask: "Add 24 to the stock of “Coca-Cola can”?", ok: "Added 24 to “Coca-Cola can”" },
    { q: "check out Dara", row: ["B-0012 · Dara Sok", "Lotus Guest House · room 101", ""], act: "Check out", ask: "Check out B-0012 · Dara Sok?", ok: "Dara Sok checked out" },
    { q: "how do I pair a POS?", help: ["Open your business → POS (Mini mart: Cashiers & POS)", "Tap “Get a code” — a 6-digit code, good for 10 minutes", "Type it in the BizHub POS app → “Link device”"] },
  ],
  km: [
    { q: "#12 បានបង់", row: ["#12", "Mekong Coffee · Telegram · ដារ៉ា", "$6.50"], act: "បានបង់", ask: "ដាក់ការកម្ម៉ង់ #12 ថាបានបង់?", ok: "ការកម្ម៉ង់ #12 បានបង់" },
    { q: "កូកា +24", row: ["កូកា កំប៉ុង", "Lucky Mini Mart · នៅសល់ 3", "$0.80"], act: "+24 ស្តុក", ask: "បន្ថែម 24 ទៅស្តុក “កូកា កំប៉ុង”?", ok: "បានបន្ថែម 24 ទៅ “កូកា កំប៉ុង”" },
    { q: "ចាកចេញ ដារ៉ា", row: ["B-0012 · ដារ៉ា សុខ", "Lotus Guest House · បន្ទប់ 101", ""], act: "ចាកចេញ", ask: "ឲ្យ B-0012 · ដារ៉ា សុខ ចាកចេញ?", ok: "ដារ៉ា សុខ បានចាកចេញ" },
    { q: "ធ្វើម៉េចភ្ជាប់ POS?", help: ["បើកអាជីវកម្មរបស់អ្នក → POS (ម៉ាត៖ អ្នកគិតលុយ និង POS)", "ចុច “យកលេខកូដ” — លេខកូដ ៦ ខ្ទង់ ប្រើបាន 10 នាទី", "វាយវាក្នុងកម្មវិធី BizHub POS → “ភ្ជាប់ឧបករណ៍”"] },
  ],
};

// the channels on "Follow us" (the links are in Super admin → Homepage settings; an empty link hides the button)
export const CHANNELS = [
  { key: "facebook", url: "facebook_url", color: "#1877F2", act: "fFacebook" },
  { key: "tiktok", url: "tiktok_url", color: "#111111", act: "fTiktok" },
  { key: "youtube", url: "youtube_url", color: "#FF0033", act: "fYoutube" },
  { key: "telegram", url: "tg_channel_url", color: "#229ED9", act: "fTelegram" },
  { key: "coolapp", url: "coolapp_url", color: "#0A7CFF", act: "fCoolapp" },
];
export const CHANNEL_NAME = { facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", telegram: "Telegram", coolapp: "CoolApp" };
// "@bizhubcambodia" from a link (t.me/x → @x); a share link has no handle → the page's name
export function handleOf(url) {
  try {
    const u = new URL(url);
    const first = u.pathname.split("/").filter(Boolean)[0] || "";
    if (first.startsWith("@")) return first;
    if (/(^|\.)t\.me$/.test(u.hostname) && first && first !== "+") return `@${first}`;
  } catch {
    /* not a link */
  }
  return "BizHub Cambodia";
}
