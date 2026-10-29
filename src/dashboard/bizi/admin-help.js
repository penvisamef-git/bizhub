// Bizi for the BizHub team (super admin): its pages, how-tos and smart-word chips (the same shape as help.js / smart.js).
// The button names in the steps are the ones on the screens (EN + KM) — keep them the same when a screen changes.

// [path, English, Khmer, more words]
export const ADMIN_PAGES = [
  ["/app/super-admin/dashboard", "Dashboard", "ផ្ទាំងគ្រប់គ្រង", "home overview numbers today · ទំព័រដើម"],
  ["/app/super-admin/coin-orders?status=pending", "Coin orders", "ការកម្ម៉ង់កាក់", "coin orders bank transfer approve reject pending waiting screenshot · បញ្ជាក់ បដិសេធ រង់ចាំ"],
  ["/app/super-admin/inbox", "Inbox", "ប្រអប់សារ", "chat support messages reply customers unread · ជជែក សារ ឆ្លើយ"],
  ["/app/super-admin/customers", "Customers", "អតិថិជន", "customers owners people accounts suspend phone email · អតិថិជន គណនី ផ្អាក"],
  ["/app/super-admin/businesses", "Businesses", "អាជីវកម្ម", "businesses shops suspend owner · អាជីវកម្ម ហាង"],
  ["/app/super-admin/coins", "Coins", "កាក់", "coins treasury transfer generate send history · កាក់ ផ្ទេរ បង្កើត"],
  ["/app/super-admin/coins?tab=cards", "Top-up cards", "កាតបញ្ចូលកាក់", "top up cards print codes · កាត បោះពុម្ព"],
  ["/app/super-admin/licenses", "Licenses", "អាជ្ញាប័ណ្ណ", "licenses licences expire expired years add-ons · អាជ្ញាប័ណ្ណ ផុតកំណត់"],
  ["/app/super-admin/prices", "Prices", "តម្លៃ", "prices coins pack sign-up bonus services add-ons · តម្លៃ កញ្ចប់"],
  ["/app/super-admin/coin-orders?tab=setup", "Payment & hotline", "ការបង់ប្រាក់ & លេខទំនាក់ទំនង", "bank account qr aba payway hotline packages · ធនាគារ QR គណនី"],
  ["/app/super-admin/coin-orders?tab=telegram", "Telegram alerts", "ការជូនដំណឹងលើ Telegram", "telegram alerts notifications bot · ជូនដំណឹង"],
  ["/app/super-admin/holidays", "Holidays", "ថ្ងៃឈប់សម្រាក", "public holidays sub-decree attendance · ថ្ងៃឈប់សម្រាក អនុក្រឹត្យ"],
  ["/app/super-admin/website", "Website settings", "ការកំណត់គេហទំព័រ", "website homepage texts contact app links services · គេហទំព័រ អត្ថបទ"],
  ["/app/admin/users", "Team users", "អ្នកប្រើប្រាស់", "team users staff admin password roles · អ្នកប្រើប្រាស់ បុគ្គលិក"],
  ["/app/admin/activity-log", "Activity log", "កំណត់ហេតុសកម្មភាព", "activity log history who did what · កំណត់ហេតុ"],
];

export const ADMIN_SUGGEST = {
  en: [
    ["pending", "Coin orders to check"],
    ["unread", "Chats to answer"],
    ["new", "New today"],
  ],
  km: [
    ["រង់ចាំ", "ការកម្ម៉ង់កាក់ត្រូវពិនិត្យ"],
    ["មិនទាន់អាន", "សារត្រូវឆ្លើយ"],
    ["ថ្ងៃនេះ", "ថ្មីថ្ងៃនេះ"],
  ],
};

export const ADMIN_HELP = [
  {
    id: "a_coin_order",
    popular: true,
    href: "/app/super-admin/coin-orders?status=pending",
    words: "approve reject coin order bank transfer screenshot add coins pending waiting · បញ្ជាក់ បដិសេធ ការកម្ម៉ង់កាក់ ផ្ទេរប្រាក់ រង់ចាំ",
    en: {
      q: "How do I approve a coin order?",
      open: "Open Coin orders",
      steps: ["Open Coin orders — “Waiting” is already chosen.", "Tap the screenshot to see it big, and check the money is in your bank.", "Tap “Approve · add coins” — the coins go to the customer's wallet at once.", "Or “Reject”: pick or type why (the customer sees it), then “Reject”."],
    },
    km: {
      q: "តើបញ្ជាក់ការកម្ម៉ង់កាក់យ៉ាងម៉េច?",
      open: "បើកការកម្ម៉ង់កាក់",
      steps: ["បើក ការកម្ម៉ង់កាក់ — “កំពុងរង់ចាំ” បានជ្រើសរួចហើយ។", "ចុចរូបដើម្បីមើលធំ ហើយពិនិត្យថាប្រាក់ចូលធនាគាររបស់អ្នកហើយ។", "ចុច “បញ្ជាក់ · បញ្ចូលកាក់” — កាក់ចូលកាបូបអតិថិជនភ្លាមៗ។", "ឬ “បដិសេធ”៖ ជ្រើស ឬវាយ “មូលហេតុ? (អតិថិជនឃើញ)” រួច “បដិសេធ”។"],
    },
  },
  {
    id: "a_inbox",
    popular: true,
    href: "/app/super-admin/inbox",
    words: "reply answer chat support message customer inbox unread voice file · ឆ្លើយ ជជែក សារ ប្រអប់សារ មិនទាន់អាន",
    en: {
      q: "How do I answer a customer's chat?",
      open: "Open Inbox",
      steps: ["Open Inbox and tap the conversation (“Unread” shows only the new ones).", "Type in the box — Enter sends, Shift+Enter makes a new line.", "Add photos or files (up to 5) with the paperclip, or tap the mic for a voice message, then “Send”."],
    },
    km: {
      q: "តើឆ្លើយសារអតិថិជនយ៉ាងម៉េច?",
      open: "បើកប្រអប់សារ",
      steps: ["បើក ប្រអប់សារ ហើយចុចលើការសន្ទនា (“មិនទាន់អាន” បង្ហាញតែសារថ្មី)។", "វាយក្នុងប្រអប់ — Enter ផ្ញើ Shift+Enter ចុះបន្ទាត់ថ្មី។", "ភ្ជាប់រូប ឬឯកសារ (រហូតដល់ 5) ឬចុចមីក្រូហ្វូនដើម្បីថតសារជាសំឡេង រួច “ផ្ញើ”។"],
    },
  },
  {
    id: "a_send_coins",
    popular: true,
    href: "/app/super-admin/customers",
    words: "give send add coins gift correction take back refund customer wallet transfer · ផ្ញើកាក់ ផ្ទេរកាក់ ជូន កែតម្រូវ",
    en: {
      q: "How do I give coins to a customer (or take them back)?",
      open: "Open Customers",
      steps: ["Find the customer and open them, then tap “Send coins” (from the treasury to them).", "Type the amount and a note — both are needed.", "Leave “No payment (gift / correction)” for a gift, then “Transfer coins”.", "To take coins back: “Swap”, so it goes from the customer to the treasury."],
    },
    km: {
      q: "តើផ្ញើកាក់ទៅអតិថិជន (ឬដកវិញ) យ៉ាងម៉េច?",
      open: "បើកអតិថិជន",
      steps: ["រកអតិថិជន ហើយបើក រួចចុច “ផ្ញើកាក់” (ពីឃ្លាំងទៅគេ)។", "វាយ “ចំនួន” និង “កំណត់ចំណាំ” — ត្រូវការទាំងពីរ។", "ទុក “គ្មានការទូទាត់ (ជូន / កែតម្រូវ)” សម្រាប់ជូន រួច “ផ្ទេរកាក់”។", "ដើម្បីដកកាក់វិញ៖ “ប្តូរទិស” ដើម្បីពីអតិថិជនទៅឃ្លាំង។"],
    },
  },
  {
    id: "a_cards",
    href: "/app/super-admin/coins?tab=cards",
    words: "top up cards make create print codes coin cards · កាតបញ្ចូលកាក់ បង្កើតកាត បោះពុម្ព",
    en: {
      q: "How do I make top-up cards?",
      open: "Open Top-up cards",
      steps: ["Coins → “Top-up cards” → “Create cards”.", "Pick the coins per card, how many cards (up to 100) and an end date if you want one.", "“Create cards” (the coins come from the treasury), then download, share or “Print all”."],
    },
    km: {
      q: "តើបង្កើតកាតបញ្ចូលកាក់យ៉ាងម៉េច?",
      open: "បើកកាតបញ្ចូលកាក់",
      steps: ["កាក់ → “កាតបញ្ចូលកាក់” → “បង្កើតកាត”។", "ជ្រើស “កាក់ក្នុងកាតមួយ” “ចំនួនកាត” (រហូតដល់ 100) និង “សុពលភាពដល់ (មិនចាំបាច់)”។", "“បង្កើតកាត” (កាក់ចេញពីឃ្លាំង) រួចទាញយក ចែករំលែក ឬ “បោះពុម្ពទាំងអស់”។"],
    },
  },
  {
    id: "a_prices",
    href: "/app/super-admin/prices",
    words: "change prices price services add-ons coin pack sign-up bonus free coins · តម្លៃ កញ្ចប់កាក់ កាក់ឥតគិតថ្លៃ",
    en: {
      q: "How do I change prices?",
      open: "Open Prices",
      steps: ["Open Prices; filter by business type or search a service.", "Change the coins (0 = free; the ≈$ shows under each box).", "“Save prices” at the bottom — it counts for new purchases. Coin-shop packages are in Coin orders → Payment & hotline."],
    },
    km: {
      q: "តើប្តូរតម្លៃយ៉ាងម៉េច?",
      open: "បើកតម្លៃ",
      steps: ["បើក តម្លៃ; តម្រងតាមប្រភេទអាជីវកម្ម ឬ “ស្វែងរកសេវាកម្ម…”។", "ប្តូរចំនួនកាក់ (0 = ឥតគិតថ្លៃ; ≈$ បង្ហាញក្រោមប្រអប់នីមួយៗ)។", "“រក្សាទុកតម្លៃ” នៅខាងក្រោម — សម្រាប់ការទិញថ្មី។ កញ្ចប់កាក់នៅ ការកម្ម៉ង់កាក់ → ការបង់ប្រាក់ & លេខទំនាក់ទំនង។"],
    },
  },
  {
    id: "a_bank",
    href: "/app/super-admin/coin-orders?tab=setup",
    words: "bank account qr payment add bank aba payway hotline coin shop · ធនាគារ គណនី QR បន្ថែមធនាគារ",
    en: {
      q: "How do I add a bank account or payment QR?",
      open: "Open Payment & hotline",
      steps: ["Coin orders → “Payment & hotline” → “Add bank”.", "Choose the QR image, type the bank, account name and number (a pay link if you have one).", "Optional: QR pictures with the amount in them. Keep “Shown” on and save."],
    },
    km: {
      q: "តើបន្ថែមគណនីធនាគារ ឬ QR បង់ប្រាក់យ៉ាងម៉េច?",
      open: "បើកការបង់ប្រាក់ & លេខទំនាក់ទំនង",
      steps: ["ការកម្ម៉ង់កាក់ → “ការបង់ប្រាក់ & លេខទំនាក់ទំនង” → “បន្ថែមធនាគារ”។", "“ជ្រើសរើសរូប QR” វាយឈ្មោះធនាគារ “ឈ្មោះគណនី” និង “លេខគណនី” (និងតំណបង់ប្រាក់បើមាន)។", "ស្រេចចិត្ត៖ “QR ដែលមានចំនួនទឹកប្រាក់រួច”។ ទុក “បង្ហាញ” បើក ហើយរក្សាទុក។"],
    },
  },
  {
    id: "a_telegram",
    href: "/app/super-admin/coin-orders?tab=telegram",
    words: "telegram alerts notify connect bot new coin orders chat messages · ការជូនដំណឹង ភ្ជាប់ Telegram",
    en: {
      q: "How do I get team alerts on Telegram?",
      open: "Open Telegram alerts",
      steps: ["Coin orders → “Alerts on your Telegram” → “Connect Telegram” (or “Add to a group” for the team chat).", "Press Start in Telegram — the page shows it is connected by itself.", "“Send a test”, and choose “New coin orders” / “New chat messages”."],
    },
    km: {
      q: "តើទទួលការជូនដំណឹងក្រុមលើ Telegram យ៉ាងម៉េច?",
      open: "បើកការជូនដំណឹងលើ Telegram",
      steps: ["ការកម្ម៉ង់កាក់ → “ការជូនដំណឹងលើ Telegram” → “ភ្ជាប់ Telegram” (ឬ “បន្ថែមទៅក្រុម” សម្រាប់ក្រុម)។", "ចុច Start ក្នុង Telegram — ទំព័រនឹងបង្ហាញថាបានភ្ជាប់ដោយខ្លួនឯង។", "“ផ្ញើសាកល្បង” ហើយជ្រើស “ការកម្ម៉ង់កាក់ថ្មី” / “សារជជែកថ្មី”។"],
    },
  },
  {
    id: "a_suspend",
    href: "/app/super-admin/customers",
    words: "suspend lock block activate unlock customer business account ban · ផ្អាក បើកវិញ",
    en: {
      q: "How do I suspend a customer or a business?",
      open: "Open Customers",
      steps: ["Customer: open them and tap “Suspend” (a team note if you want) — they are logged out and can't log in.", "Business: on Businesses, “Suspend” on its row — the owner can't change it meanwhile.", "“Activate” puts it back at once."],
    },
    km: {
      q: "តើផ្អាកអតិថិជន ឬអាជីវកម្មយ៉ាងម៉េច?",
      open: "បើកអតិថិជន",
      steps: ["អតិថិជន៖ បើក ហើយចុច “ផ្អាក” (“កំណត់ចំណាំក្រុមការងារ (អតិថិជនមើលមិនឃើញ)” បើចង់) — គេត្រូវចេញ ហើយចូលមិនបាន។", "អាជីវកម្ម៖ នៅ អាជីវកម្ម ចុច “ផ្អាក” លើជួររបស់វា — ម្ចាស់មិនអាចកែបានទេពេលនោះ។", "“បើកវិញ” ដាក់ឱ្យដំណើរការភ្លាមៗ។"],
    },
  },
  {
    id: "a_holidays",
    href: "/app/super-admin/holidays",
    words: "public holidays sub-decree add day official year attendance companies · ថ្ងៃឈប់សម្រាក អនុក្រឹត្យ បន្ថែមថ្ងៃ",
    en: {
      q: "How do I set the public holidays?",
      open: "Open Holidays",
      steps: ["Open Holidays and pick the year.", "“Add the fixed days”, then “Add a day” for each moon-calendar holiday.", "Turn on the official switch when the sub-decree is out, then “Save and update companies”."],
    },
    km: {
      q: "តើកំណត់ថ្ងៃឈប់សម្រាកយ៉ាងម៉េច?",
      open: "បើកថ្ងៃឈប់សម្រាក",
      steps: ["បើក ថ្ងៃឈប់សម្រាក ហើយជ្រើសឆ្នាំ។", "“បន្ថែមថ្ងៃថេរ” រួច “បន្ថែមថ្ងៃ” សម្រាប់ថ្ងៃឈប់តាមចន្ទគតិនីមួយៗ។", "បើក “នេះជាបញ្ជីផ្លូវការ (ពីអនុក្រឹត្យ)” ពេលអនុក្រឹត្យចេញ រួច “រក្សាទុក និងធ្វើបច្ចុប្បន្នភាពក្រុមហ៊ុន”។"],
    },
  },
  {
    id: "a_site",
    href: "/app/super-admin/website",
    words: "website homepage text edit change contact app links services · គេហទំព័រ អត្ថបទ",
    en: {
      q: "How do I change the website texts?",
      open: "Open Website settings",
      steps: ["Website settings → “Website text”, pick English or ខ្មែរ.", "Search the text and change it (empty = the default).", "“Save changes” at the bottom."],
    },
    km: {
      q: "តើប្តូរអត្ថបទលើគេហទំព័រយ៉ាងម៉េច?",
      open: "បើកការកំណត់គេហទំព័រ",
      steps: ["ការកំណត់គេហទំព័រ → “អត្ថបទលើគេហទំព័រ” ជ្រើស English ឬ ខ្មែរ។", "“ស្វែងរកអត្ថបទ” ហើយកែ (ទទេ = លំនាំដើម)។", "“រក្សាទុក” នៅខាងក្រោម។"],
    },
  },
  {
    id: "a_team",
    href: "/app/admin/users",
    words: "team user staff member add create role password admin · អ្នកប្រើប្រាស់ បុគ្គលិក តួនាទី",
    en: {
      q: "How do I add a BizHub team member?",
      open: "Open Team users",
      steps: ["Team users → “បង្កើតអ្នកប្រើប្រាស់” (create a user).", "Fill in the names, email and a password (8 letters or more).", "Pick the role — “អ្នកគ្រប់គ្រងប្រព័ន្ធ” (full) or “បុគ្គលិក” (view only) — and save."],
    },
    km: {
      q: "តើបន្ថែមសមាជិកក្រុម BizHub យ៉ាងម៉េច?",
      open: "បើកអ្នកប្រើប្រាស់",
      steps: ["អ្នកប្រើប្រាស់ → “បង្កើតអ្នកប្រើប្រាស់”។", "បំពេញ “គោត្តនាម” “នាម” “អ៊ីមែល” និង “ពាក្យសម្ងាត់ (យ៉ាងតិច 8 តួ)”។", "ជ្រើស “តួនាទី” — “អ្នកគ្រប់គ្រងប្រព័ន្ធ” ឬ “បុគ្គលិក” — ហើយ “រក្សាទុក”។"],
    },
  },
];
