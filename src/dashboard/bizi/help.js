// Bizi how-tos (v3.0.0, layer 6 — no AI). One entry = one question with its steps, in English and Khmer.
//   id       stays the same (tests, links)
//   types    the business types it is about (the "Open" button goes to my first one of them); none = BizHub itself
//   tab      the section to open: one key, or one per type ({ restaurant: "pos", mart: "pos" })
//   path     a page under the business instead of a tab (team → /app/business/<id>/team)
//   href     a BizHub page (no business)
//   words    more words people may type (English · Khmer)
//   popular  shown as a one-tap question when the box is empty
// The button names in the steps are the ones on the screens (EN + KM) — keep them the same when a screen changes.
export const HELP = [
  {
    id: "pos_pair",
    popular: true,
    types: ["restaurant", "mart", "tg_store", "guest_house"],
    tab: { restaurant: "pos", mart: "pos", tg_store: "staff", guest_house: "pos" },
    words: "pair link connect pos device tablet ipad phone mac windows app screen 6-digit six digit code · ភ្ជាប់ ឧបករណ៍ អេក្រង់ លេខកូដ កម្មវិធី ថេប្លេត",
    en: {
      q: "How do I pair a POS device?",
      open: "Open POS devices",
      steps: [
        "Open your business: Restaurant → POS, Mini mart → Cashiers & POS, Guest house → Staff & POS, Telegram Store → Staff screen.",
        "Press “Get a code” (or “Link a device” / “Pair a screen”). The 6-digit code works for 10 minutes.",
        "On the tablet, phone, Mac or Windows computer, open the BizHub POS app and choose what the device does (the business type).",
        "Type the 6-digit code and a device name, then tap “Link device”. You see “Linked to” your shop.",
        "Your staff log in on it with their 4-digit PIN.",
      ],
    },
    km: {
      q: "តើភ្ជាប់ឧបករណ៍ POS យ៉ាងម៉េច?",
      open: "បើកឧបករណ៍ POS",
      steps: [
        "បើកអាជីវកម្មរបស់អ្នក៖ ភោជនីយដ្ឋាន → POS, ម៉ាត → អ្នកគិតលុយ និង POS, ផ្ទះសំណាក់ → បុគ្គលិក និង POS, ហាង Telegram → អេក្រង់បុគ្គលិក។",
        "ចុច “យកលេខកូដ” (ឬ “ភ្ជាប់ឧបករណ៍” / “ភ្ជាប់អេក្រង់”)។ លេខកូដ ៦ ខ្ទង់ប្រើបាន 10 នាទី។",
        "លើថេប្លេត ទូរស័ព្ទ Mac ឬកុំព្យូទ័រ Windows បើកកម្មវិធី BizHub POS ហើយជ្រើស “ឧបករណ៍នេះប្រើសម្រាប់អ្វី?” (ប្រភេទអាជីវកម្ម)។",
        "វាយ “លេខកូដ ៦ ខ្ទង់” និង “ឈ្មោះឧបករណ៍” រួចចុច “ភ្ជាប់ឧបករណ៍”។ អ្នកនឹងឃើញ “បានភ្ជាប់ជាមួយ” ហាងរបស់អ្នក។",
        "បុគ្គលិកចូលដោយប្រើ PIN 4 ខ្ទង់របស់ខ្លួន។",
      ],
    },
  },
  {
    id: "coins_buy",
    popular: true,
    href: "/app/licenses?tab=coins",
    words: "buy coins top up topup recharge pay bank aba acleda transfer screenshot wallet balance · ទិញកាក់ បញ្ចូលកាក់ កាក់ ធនាគារ ផ្ទេរប្រាក់",
    en: {
      q: "How do I buy coins (top up)?",
      open: "Open Buy coins",
      steps: [
        "Open Licenses → “Buy coins” (or tap “Top up” on the dashboard).",
        "Pick a package, tap “Add to cart”, then “Checkout”.",
        "Choose the bank you pay with, scan the QR and pay the exact amount.",
        "Upload the transfer screenshot and tap “Send order”.",
        "The BizHub team checks the transfer and adds your coins — see “My coin orders”.",
      ],
    },
    km: {
      q: "តើទិញកាក់ (បញ្ចូលកាក់) យ៉ាងម៉េច?",
      open: "បើកទិញកាក់",
      steps: [
        "បើក អាជ្ញាប័ណ្ណ → “ទិញកាក់” (ឬចុច “បញ្ចូលកាក់” លើផ្ទាំងគ្រប់គ្រង)។",
        "ជ្រើសកញ្ចប់ ចុច “ដាក់ចូលកន្ត្រក” រួច “ទូទាត់”។",
        "ជ្រើសរើសធនាគារដែលអ្នកបង់ ស្កេន QR ហើយបង់ឲ្យត្រូវចំនួន។",
        "បញ្ចូលរូបវិក្កយបត្រផ្ទេរប្រាក់ ហើយចុច “ផ្ញើការកម្ម៉ង់”។",
        "ក្រុម BizHub ពិនិត្យការផ្ទេរ ហើយបញ្ចូលកាក់ឱ្យអ្នក — មើលនៅ “ការកម្ម៉ង់កាក់របស់ខ្ញុំ”។",
      ],
    },
  },
  {
    id: "business_add",
    popular: true,
    href: "/app/businesses",
    words: "add new business create open shop start restaurant mart guest house store type · បន្ថែមអាជីវកម្ម បង្កើត អាជីវកម្មថ្មី ហាងថ្មី",
    en: {
      q: "How do I add a new business?",
      open: "Open My businesses",
      steps: ["Tap “Add business” on the dashboard or in My businesses.", "Choose the type (restaurant, mini mart, Telegram Store…).", "Type the business name.", "Tap “Pay & create” — the price includes the first year. Free types just save."],
    },
    km: {
      q: "តើបន្ថែមអាជីវកម្មថ្មីយ៉ាងម៉េច?",
      open: "បើកអាជីវកម្មរបស់ខ្ញុំ",
      steps: ["ចុច “បន្ថែមអាជីវកម្ម” លើផ្ទាំងគ្រប់គ្រង ឬក្នុង អាជីវកម្មរបស់ខ្ញុំ។", "ជ្រើស “ប្រភេទ” (ភោជនីយដ្ឋាន ម៉ាត ហាង Telegram…)។", "វាយ “ឈ្មោះអាជីវកម្ម”។", "ចុច “បង់ និងបង្កើត” — តម្លៃរួមទាំងឆ្នាំដំបូង។ ប្រភេទឥតគិតថ្លៃគ្រាន់តែរក្សាទុក។"],
    },
  },
  {
    id: "renew",
    href: "/app/licenses",
    words: "renew renewal extend licence license year expire expired ending pay again · បន្ត អាជ្ញាប័ណ្ណ ផុតកំណត់ ឆ្នាំ",
    en: {
      q: "How do I renew a business year or licence?",
      open: "Open Licenses",
      steps: ["Open Licenses (the “Ending soon” filter helps).", "Find the business or add-on and tap “Renew for …”.", "Tap “Yes, pay” — the new year starts after the old one ends, so you lose nothing."],
    },
    km: {
      q: "តើបន្តឆ្នាំ ឬអាជ្ញាប័ណ្ណអាជីវកម្មយ៉ាងម៉េច?",
      open: "បើកអាជ្ញាប័ណ្ណ",
      steps: ["បើក អាជ្ញាប័ណ្ណ (តម្រង “ជិតផុតកំណត់” ជួយរកបានលឿន)។", "រកអាជីវកម្ម ឬមុខងារបន្ថែម ហើយចុច “បន្ត …”។", "ចុច “បាទ/ចាស បង់” — ឆ្នាំថ្មីចាប់ផ្តើមបន្ទាប់ពីឆ្នាំចាស់ ដូច្នេះអ្នកមិនខាតទេ។"],
    },
  },
  {
    id: "addon_unlock",
    types: ["restaurant", "mart", "tg_store", "guest_house", "attendance", "event", "stamp_card", "debt_book", "website", "menu_qr", "flipbook", "digital_note", "qr_gen"],
    tab: "addons",
    words: "unlock add-on addon extra feature buy more option · ដោះសោ មុខងារបន្ថែម",
    en: {
      q: "How do I unlock an add-on?",
      open: "Open Add-ons",
      steps: ["Open your business → “Add-ons”.", "Tap “Unlock” on the add-on you want.", "Tap “Yes, pay” to pay with coins (not enough coins? the box offers “Top up coins”).", "The new feature opens at once."],
    },
    km: {
      q: "តើដោះសោមុខងារបន្ថែមយ៉ាងម៉េច?",
      open: "បើកមុខងារបន្ថែម",
      steps: ["បើកអាជីវកម្មរបស់អ្នក → “មុខងារបន្ថែម”។", "ចុច “ដោះសោ” លើមុខងារដែលអ្នកចង់បាន។", "ចុច “បាទ/ចាស បង់” ដើម្បីបង់ដោយកាក់ (កាក់មិនគ្រប់? ចុច “បញ្ចូលកាក់”)។", "មុខងារថ្មីបើកភ្លាមៗ។"],
    },
  },
  {
    id: "staff_pin",
    types: ["restaurant", "mart", "tg_store"],
    tab: { restaurant: "staff", mart: "pos", tg_store: "staff" },
    words: "add staff cashier waiter kitchen employee worker pin login role manager · បន្ថែមបុគ្គលិក អ្នកគិតលុយ បុគ្គលិក អ្នករត់តុ ចុងភៅ",
    en: {
      q: "How do I add staff with a PIN?",
      open: "Open Staff",
      steps: [
        "Open your business: Restaurant → Staff, Mini mart → Cashiers & POS, Telegram Store → Staff screen.",
        "Tap “Add staff” (“Add cashier” in a mini mart).",
        "Type the name, choose the role and a 4-digit PIN — each person needs a different PIN.",
        "Save and tell the person their PIN; they use it to log in on the POS.",
      ],
    },
    km: {
      q: "តើបន្ថែមបុគ្គលិកជាមួយ PIN យ៉ាងម៉េច?",
      open: "បើកបុគ្គលិក",
      steps: [
        "បើកអាជីវកម្មរបស់អ្នក៖ ភោជនីយដ្ឋាន → បុគ្គលិក, ម៉ាត → អ្នកគិតលុយ និង POS, ហាង Telegram → អេក្រង់បុគ្គលិក។",
        "ចុច “បន្ថែមបុគ្គលិក” (“បន្ថែមអ្នកគិតលុយ” ក្នុងម៉ាត)។",
        "វាយឈ្មោះ ជ្រើសតួនាទី និង PIN 4 ខ្ទង់ — ម្នាក់ៗត្រូវមាន PIN ខុសគ្នា។",
        "រក្សាទុក ហើយប្រាប់ PIN ដល់បុគ្គលិក ដើម្បីចូលលើ POS។",
      ],
    },
  },
  {
    id: "printer",
    types: ["restaurant", "mart", "guest_house"],
    tab: { restaurant: "money", mart: "print", guest_house: "print" },
    words: "printer print receipt bill kitchen paper ip network usb setup set up 58mm 80mm · ម៉ាស៊ីនព្រីន ម៉ាស៊ីនបោះពុម្ព បោះពុម្ព វិក្កយបត្រ ក្រដាស",
    en: {
      q: "How do I set up a receipt printer?",
      open: "Open printer settings",
      steps: [
        "Printing needs the “Printing” add-on (Add-ons tab).",
        "Restaurant: open “Money” → “Printers”, set the “Bill printer” to Network (type its IP address) or USB. Kitchen printers are set per kitchen station in the Menu.",
        "Mini mart / guest house: open “Print”, choose the paper width and “Print the receipt after each sale” — it uses the printer your computer or tablet already has.",
        "Print a test bill from the POS to check.",
      ],
    },
    km: {
      q: "តើដំឡើងម៉ាស៊ីនបោះពុម្ពវិក្កយបត្រយ៉ាងម៉េច?",
      open: "បើកការកំណត់ម៉ាស៊ីនព្រីន",
      steps: [
        "ការបោះពុម្ពត្រូវការមុខងារបន្ថែម “បោះពុម្ព” (ផ្ទាំង មុខងារបន្ថែម)។",
        "ភោជនីយដ្ឋាន៖ បើក “លុយ” → “ម៉ាស៊ីនព្រីន” ដាក់ “ម៉ាស៊ីនព្រីនវិក្កយបត្រ” ជា Network (វាយអាសយដ្ឋាន IP) ឬ USB។ ម៉ាស៊ីនព្រីនផ្ទះបាយកំណត់តាម “ផ្នែកផ្ទះបាយ” ក្នុងម៉ឺនុយ។",
        "ម៉ាត / ផ្ទះសំណាក់៖ បើក “បោះពុម្ព” ជ្រើស “ទំហំក្រដាស” និង “បោះពុម្ពវិក្កយបត្រក្រោយការលក់នីមួយៗ” — ប្រើម៉ាស៊ីនព្រីនដែលកុំព្យូទ័រ ឬថេប្លេតមានស្រាប់។",
        "បោះពុម្ពវិក្កយបត្រសាកល្បងពី POS ដើម្បីពិនិត្យ។",
      ],
    },
  },
  {
    id: "tg_group",
    popular: true,
    types: ["tg_store"],
    tab: "share",
    words: "telegram group orders notify alert bot staff chat connect receive · ក្រុម Telegram បុត ការកម្ម៉ង់ ជូនដំណឹង",
    en: {
      q: "How do I get Telegram Store orders in my Telegram group?",
      open: "Open Share & Telegram",
      steps: [
        "Open your Telegram Store → “Share & Telegram” → “Orders in your Telegram group”.",
        "Tap “Connect a group”, then “Add the bot to a group” (or “Send to my own chat”).",
        "Within 15 minutes, open the link in Telegram and pick your staff group (or press Start).",
        "Back here, tap “I've done it — check”, then “Send a test”. Every new order now comes with Accept · Ready · Done · Paid buttons.",
      ],
    },
    km: {
      q: "តើទទួលការកម្ម៉ង់ហាង Telegram ក្នុងក្រុម Telegram យ៉ាងម៉េច?",
      open: "បើកចែករំលែក និង Telegram",
      steps: [
        "បើកហាង Telegram → “ចែករំលែក និង Telegram” → “ការកម្ម៉ង់ក្នុងក្រុម Telegram របស់អ្នក”។",
        "ចុច “ភ្ជាប់ក្រុម” រួច “បន្ថែមបុតទៅក្រុម” (ឬ “ផ្ញើទៅឆាតខ្ញុំ”)។",
        "ក្នុងរយៈពេល 15 នាទី បើកតំណក្នុង Telegram ហើយជ្រើសក្រុមបុគ្គលិក (ឬចុច Start)។",
        "ត្រឡប់មកវិញ ចុច “ធ្វើរួចហើយ — ពិនិត្យ” រួច “ផ្ញើសារសាកល្បង”។ ការកម្ម៉ង់ថ្មីនីមួយៗមកជាមួយប៊ូតុង ទទួល · រួចរាល់ · បានបញ្ចប់ · បានបង់។",
      ],
    },
  },
  {
    id: "tg_share",
    types: ["tg_store"],
    tab: "share",
    words: "share link url qr poster table channel customers copy download where store address · ចែករំលែក តំណ QR ហាង ឆានែល",
    en: {
      q: "Where is my Telegram Store link and QR?",
      open: "Open Share & Telegram",
      steps: [
        "Open your Telegram Store → “Share & Telegram”.",
        "“Copy link” copies the Telegram link that opens the store inside Telegram — send it or pin it in your channel.",
        "“Store QR” → “Download” for a poster; “Table QRs” for one QR per table.",
        "Your own link name and QR colours with your logo come with the “Own link & QR” add-on.",
      ],
    },
    km: {
      q: "តើតំណ និង QR ហាង Telegram របស់ខ្ញុំនៅឯណា?",
      open: "បើកចែករំលែក និង Telegram",
      steps: [
        "បើកហាង Telegram → “ចែករំលែក និង Telegram”។",
        "“ចម្លងតំណ” ចម្លងតំណ Telegram ដែលបើកហាងក្នុង Telegram — ផ្ញើ ឬខ្ទាស់វាក្នុងឆានែលរបស់អ្នក។",
        "“QR ហាង” → “ទាញយក” សម្រាប់ផ្ទាំងរូបភាព; “QR លើតុ” សម្រាប់ QR មួយក្នុងមួយតុ។",
        "ឈ្មោះតំណផ្ទាល់ខ្លួន និងពណ៌ QR ជាមួយឡូហ្គោ មកជាមួយមុខងារបន្ថែម “តំណ និង QR ផ្ទាល់ខ្លួន”។",
      ],
    },
  },
  {
    id: "products_add",
    types: ["tg_store", "mart", "restaurant"],
    tab: { tg_store: "products", mart: "products", restaurant: "menu" },
    words: "add product item menu food drink dish category price photo picture size choice option topping sugar · បន្ថែមទំនិញ ទំនិញ មុខម្ហូប ម៉ឺនុយ តម្លៃ ប្រភេទ រូបភាព ជម្រើស",
    en: {
      q: "How do I add products or menu items?",
      open: "Open Products",
      steps: [
        "Open your business: Telegram Store / Mini mart → Products, Restaurant → Menu.",
        "Tap “Add category” first (for example Coffee, Snacks).",
        "Tap “Add product” (“Add item” in a restaurant): name in Khmer and English, price, category.",
        "Optional: choices or sizes (“Add a choice group”, “Sizes”) — then save and add a photo.",
      ],
    },
    km: {
      q: "តើបន្ថែមទំនិញ ឬមុខម្ហូបយ៉ាងម៉េច?",
      open: "បើកទំនិញ",
      steps: [
        "បើកអាជីវកម្មរបស់អ្នក៖ ហាង Telegram / ម៉ាត → ទំនិញ, ភោជនីយដ្ឋាន → ម៉ឺនុយ។",
        "ចុច “បន្ថែមប្រភេទ” ជាមុនសិន (ឧ. កាហ្វេ នំ)។",
        "ចុច “បន្ថែមទំនិញ” (“បន្ថែមមុខម្ហូប” ក្នុងភោជនីយដ្ឋាន)៖ ឈ្មោះខ្មែរ និងអង់គ្លេស តម្លៃ ប្រភេទ។",
        "ស្រេចចិត្ត៖ ជម្រើស ឬទំហំ (“បន្ថែមក្រុមជម្រើស” “ទំហំ”) — រួចរក្សាទុក ហើយបន្ថែមរូបភាព។",
      ],
    },
  },
  {
    id: "tg_delivery",
    types: ["tg_store"],
    tab: "store",
    words: "delivery fee shipping free delivery minimum smallest order pickup zone km · ថ្លៃដឹក ដឹកជញ្ជូន ដឹកឥតគិតថ្លៃ មកយក",
    en: {
      q: "How do I set the delivery fee?",
      open: "Open Store settings",
      steps: [
        "Open your Telegram Store → “Store settings” → “How people get their order”.",
        "Switch on “Delivery” and type the “Delivery fee”.",
        "Optional: “Free delivery from” an amount and the “Smallest order”.",
        "Tap “Save”. A fee by area or by km comes with the “Delivery zones” add-on.",
      ],
    },
    km: {
      q: "តើកំណត់ថ្លៃដឹកយ៉ាងម៉េច?",
      open: "បើកការកំណត់ហាង",
      steps: ["បើកហាង Telegram → “ការកំណត់ហាង” → “របៀបទទួលទំនិញ”។", "បើក “ដឹកជញ្ជូន” ហើយវាយ “ថ្លៃដឹក”។", "ស្រេចចិត្ត៖ “ដឹកឥតគិតថ្លៃចាប់ពី” ចំនួនណាមួយ និង “ការកម្ម៉ង់អប្បបរមា”។", "ចុច “រក្សាទុក”។ ថ្លៃតាមតំបន់ ឬតាម km មកជាមួយមុខងារបន្ថែម “តំបន់ដឹកជញ្ជូន”។"],
    },
  },
  {
    id: "khqr",
    types: ["tg_store", "event"],
    tab: { tg_store: "store", event: "payment" },
    words: "khqr bakong qr payment pay online bank aba account receive money · KHQR បាគង បង់ប្រាក់ ធនាគារ គណនី",
    en: {
      q: "How do I turn on KHQR payments?",
      open: "Open payment settings",
      steps: [
        "Telegram Store: open “Store settings” → “How people pay”, switch on “KHQR”.",
        "Type your “Bakong ID” (like name@aba) and the account name shown in the bank app, then “Save”. Each order gets a QR with the exact amount.",
        "Events: open “Payment” and type the Bakong ID (automatic KHQR needs its add-on).",
        "Mini marts and guest houses show your own payment QR picture instead (set in their settings).",
      ],
    },
    km: {
      q: "តើបើកការបង់ប្រាក់ KHQR យ៉ាងម៉េច?",
      open: "បើកការកំណត់បង់ប្រាក់",
      steps: [
        "ហាង Telegram៖ បើក “ការកំណត់ហាង” → “របៀបបង់ប្រាក់” បើក “KHQR”។",
        "វាយ “Bakong ID” (ដូចជា name@aba) និង “ឈ្មោះគណនី (បង្ហាញក្នុងកម្មវិធីធនាគារ)” រួច “រក្សាទុក”។ ការកម្ម៉ង់នីមួយៗមាន QR ចំនួនពិតប្រាកដ។",
        "កម្មវិធី៖ បើក “ការបង់ប្រាក់” ហើយវាយ Bakong ID (KHQR ស្វ័យប្រវត្តិត្រូវការមុខងារបន្ថែម)។",
        "ម៉ាត និងផ្ទះសំណាក់ បង្ហាញរូប QR បង់ប្រាក់ផ្ទាល់ខ្លួនជំនួសវិញ (កំណត់ក្នុងការកំណត់)។",
      ],
    },
  },
  {
    id: "tg_promo",
    types: ["tg_store"],
    tab: "promos",
    words: "promo code discount coupon voucher percent off sale offer · កូដបញ្ចុះតម្លៃ បញ្ចុះតម្លៃ កូដ ប្រូម៉ូសិន",
    en: {
      q: "How do I make a promo code?",
      open: "Open Promo codes",
      steps: [
        "Promo codes need the “Promo codes” add-on (Add-ons tab of your Telegram Store).",
        "Open “Promo codes” and tap “New code”.",
        "Type the code (like SAVE10), choose “% off” or “Money off” and how much.",
        "Optional: from an order of, last day, how many times (0 = no limit). Save — customers type the code in the cart.",
      ],
    },
    km: {
      q: "តើបង្កើតកូដបញ្ចុះតម្លៃយ៉ាងម៉េច?",
      open: "បើកកូដបញ្ចុះតម្លៃ",
      steps: [
        "កូដបញ្ចុះតម្លៃត្រូវការមុខងារបន្ថែម “កូដបញ្ចុះតម្លៃ” (ផ្ទាំង មុខងារបន្ថែម នៃហាង Telegram)។",
        "បើក “កូដបញ្ចុះតម្លៃ” ហើយចុច “កូដថ្មី”។",
        "វាយ “កូដ” (ដូចជា SAVE10) ជ្រើស “បញ្ចុះ %” ឬ “បញ្ចុះលុយ” និង “ប៉ុន្មាន”។",
        "ស្រេចចិត្ត៖ “ចាប់ពីការកម្ម៉ង់” “ថ្ងៃចុងក្រោយ” “ប្រើបានប៉ុន្មានដង (0 = គ្មានកំណត់)”។ រក្សាទុក — អតិថិជនវាយកូដក្នុងកន្ត្រក។",
      ],
    },
  },
  {
    id: "report_excel",
    types: ["restaurant", "mart", "tg_store"],
    tab: { restaurant: "reports", mart: "sales", tg_store: "report" },
    words: "report excel csv export download sales income spreadsheet file · របាយការណ៍ Excel ទាញយក ការលក់ ចំណូល",
    en: {
      q: "How do I download a sales report (Excel)?",
      open: "Open the sales report",
      steps: [
        "Restaurant: open “Reports” → “Bills” → “Download CSV”.",
        "Mini mart: open “Sales” → “Download CSV”.",
        "Telegram Store: open “Sales report” → “Download Excel” (needs the “Sales report” add-on).",
        "Open the file with Excel or Google Sheets.",
      ],
    },
    km: {
      q: "តើទាញយករបាយការណ៍លក់ (Excel) យ៉ាងម៉េច?",
      open: "បើករបាយការណ៍លក់",
      steps: [
        "ភោជនីយដ្ឋាន៖ បើក “របាយការណ៍” → “វិក្កយបត្រ” → “ទាញយក CSV”។",
        "ម៉ាត៖ បើក “ការលក់” → “ទាញយក CSV”។",
        "ហាង Telegram៖ បើក “របាយការណ៍លក់” → “ទាញយក Excel” (ត្រូវការមុខងារបន្ថែម “របាយការណ៍លក់”)។",
        "បើកឯកសារជាមួយ Excel ឬ Google Sheets។",
      ],
    },
  },
  {
    id: "currency",
    types: ["restaurant", "mart"],
    tab: { restaurant: "money", mart: "settings" },
    words: "currency riel dollar usd khr exchange rate rounding round · រូបិយប័ណ្ណ រៀល ដុល្លារ អត្រាប្តូរប្រាក់ បង្គត់",
    en: {
      q: "How do I change the currency or riel rate?",
      open: "Open money settings",
      steps: [
        "Restaurant: open “Money” → “Main currency” and “Exchange rate”.",
        "Mini mart: open “Settings” → “Prices in” and “Riel per 1 USD”.",
        "Choose how riel change is rounded, then save.",
        "Prices you already typed are not converted — check them after a change.",
      ],
    },
    km: {
      q: "តើប្តូររូបិយប័ណ្ណ ឬអត្រាប្តូរប្រាក់រៀលយ៉ាងម៉េច?",
      open: "បើកការកំណត់លុយ",
      steps: ["ភោជនីយដ្ឋាន៖ បើក “លុយ” → “រូបិយប័ណ្ណចម្បង” និង “អត្រាប្តូរប្រាក់”។", "ម៉ាត៖ បើក “ការកំណត់” → “តម្លៃជា” និង “រៀលក្នុង 1 ដុល្លារ”។", "ជ្រើសរបៀបបង្គត់ប្រាក់រៀល រួចរក្សាទុក។", "តម្លៃដែលអ្នកបានវាយរួច មិនត្រូវបានប្តូរទេ — ពិនិត្យវាក្រោយពេលប្តូរ។"],
    },
  },
  {
    id: "team_add",
    types: ["restaurant", "mart", "tg_store", "guest_house", "attendance", "event", "stamp_card", "debt_book", "website", "namecard", "menu_qr", "flipbook", "digital_note", "qr_gen"],
    path: "team",
    words: "team member share business partner manager invite admin view only access account · ក្រុមការងារ សមាជិក ចែករំលែក អញ្ជើញ",
    en: {
      q: "How do I add a team member?",
      open: "Open Team",
      steps: [
        "Open your business → “Team” (unlock Team first — coins per year).",
        "Tap “Add member” and choose Admin or View only.",
        "Add them “By BizHub ID” (they find it in Account) → “Send invite”, or “Make invite link” (works once, for 7 days).",
        "They accept under My businesses → “Shared with me”.",
      ],
    },
    km: {
      q: "តើបន្ថែមសមាជិកក្រុមការងារយ៉ាងម៉េច?",
      open: "បើកក្រុមការងារ",
      steps: [
        "បើកអាជីវកម្មរបស់អ្នក → “ក្រុមការងារ” (បើកក្រុមការងារជាមុន — កាក់ក្នុងមួយឆ្នាំ)។",
        "ចុច “បន្ថែមសមាជិក” ហើយជ្រើស អ្នកគ្រប់គ្រង ឬ មើលតែប៉ុណ្ណោះ។",
        "បន្ថែម “តាម BizHub ID” (គេរកឃើញក្នុង គណនី) → “ផ្ញើការអញ្ជើញ” ឬ “បង្កើតតំណអញ្ជើញ” (ប្រើបានម្តង 7 ថ្ងៃ)។",
        "គេទទួលនៅ អាជីវកម្មរបស់ខ្ញុំ → “ចែករំលែកជាមួយខ្ញុំ”។",
      ],
    },
  },
  {
    id: "gh_checkin",
    types: ["guest_house"],
    tab: "today",
    words: "check in check out checkin checkout guest walk-in booking arrival departure room stay · ចូលស្នាក់នៅ ចេញ ភ្ញៀវ ភ្ញៀវដើរចូល កក់ បន្ទប់",
    en: {
      q: "How do I check a guest in or out?",
      open: "Open Today",
      steps: [
        "Open your guest house → “Today”.",
        "A guest with a booking: find them under “Arrivals” and tap “Check in”. No booking: tap “Walk-in” → “Check in now”.",
        "When they leave: under “Departures” tap “Check out” — take payment first with “Take payment”.",
        "Not paid but leaving? “Check out anyway” lets them go.",
      ],
    },
    km: {
      q: "តើឱ្យភ្ញៀវចូលស្នាក់នៅ ឬចេញយ៉ាងម៉េច?",
      open: "បើកថ្ងៃនេះ",
      steps: [
        "បើកផ្ទះសំណាក់ → “ថ្ងៃនេះ”។",
        "ភ្ញៀវមានការកក់៖ រកនៅ “ភ្ញៀវមកដល់” ហើយចុច “ចូលស្នាក់នៅ”។ គ្មានការកក់៖ ចុច “ភ្ញៀវដើរចូល” → “ចូលស្នាក់នៅឥឡូវ”។",
        "ពេលចេញ៖ នៅ “ភ្ញៀវចេញ” ចុច “ចេញ” — ទទួលប្រាក់ជាមុនជាមួយ “ទទួលប្រាក់”។",
        "មិនទាន់បង់ តែត្រូវចេញ? “ចេញទោះយ៉ាងណា” អនុញ្ញាតឱ្យចេញ។",
      ],
    },
  },
  {
    id: "gh_rooms",
    types: ["guest_house"],
    tab: "rooms",
    words: "rooms room types bed price floor setup first start · បន្ទប់ ប្រភេទបន្ទប់ តម្លៃ",
    en: {
      q: "How do I add rooms to my guest house?",
      open: "Open Rooms",
      steps: ["Open your guest house → “Rooms”.", "Tap “Add room types” first (Single, Double… with the price).", "Then “Add rooms” — each room number with its type.", "Rooms now show in Today and the calendar for bookings."],
    },
    km: {
      q: "តើបន្ថែមបន្ទប់ក្នុងផ្ទះសំណាក់យ៉ាងម៉េច?",
      open: "បើកបន្ទប់",
      steps: ["បើកផ្ទះសំណាក់ → “បន្ទប់”។", "ចុច “បន្ថែមប្រភេទបន្ទប់” ជាមុន (គ្រែមួយ គ្រែពីរ… ជាមួយតម្លៃ)។", "រួច “បន្ថែមបន្ទប់” — លេខបន្ទប់នីមួយៗជាមួយប្រភេទរបស់វា។", "បន្ទប់បង្ហាញក្នុង ថ្ងៃនេះ និងប្រតិទិនសម្រាប់ការកក់។"],
    },
  },
  {
    id: "att_clock",
    types: ["attendance"],
    tab: "settings",
    words: "attendance clock in clock out kiosk door sticker scan staff link employee time punch · វត្តមាន ស្កេន តំណសម្រាប់បុគ្គលិក ស្ទីកឃ័រ មាត់ទ្វារ",
    en: {
      q: "How do staff clock in (attendance)?",
      open: "Open Rules & link",
      steps: [
        "Open your attendance business → “Staff” → “Add staff” with their phone number and a 4-digit PIN.",
        "Open “Rules & link” → “Staff link”: “Copy link”, “Download QR” or “Print sticker”.",
        "Staff open the link on their phone, log in and press Clock in / Clock out.",
        "A tablet at the door? With the “Door QR kiosk” add-on, open “Door kiosk” on it (or the POS app → Attendance → Door tablet).",
      ],
    },
    km: {
      q: "តើបុគ្គលិកស្កេនវត្តមានយ៉ាងម៉េច?",
      open: "បើកច្បាប់ និងតំណ",
      steps: [
        "បើកអាជីវកម្មវត្តមាន → “បុគ្គលិក” → “បន្ថែមបុគ្គលិក” ជាមួយ “លេខទូរស័ព្ទ” និង “PIN (4 ខ្ទង់)”។",
        "បើក “ច្បាប់ និងតំណ” → “តំណសម្រាប់បុគ្គលិក”៖ “ចម្លងតំណ” “ទាញយក QR” ឬ “បោះពុម្ពស្ទីកឃ័រ”។",
        "បុគ្គលិកបើកតំណលើទូរស័ព្ទ ចូល ហើយចុច ចូលធ្វើការ / ចេញពីការងារ។",
        "មានថេប្លេតនៅមាត់ទ្វារ? ជាមួយមុខងារបន្ថែម “QR មាត់ទ្វារ” បើក “QR មាត់ទ្វារ” លើវា (ឬកម្មវិធី POS → វត្តមាន)។",
      ],
    },
  },
  {
    id: "tables_qr",
    types: ["restaurant"],
    tab: "tables",
    words: "tables table qr sticker zone floor seat order from table · តុ QR ស្ទីគ័រ",
    en: {
      q: "How do I add tables and print table QR stickers?",
      open: "Open Tables",
      steps: ["Open your restaurant → “Tables” and add your zones and tables.", "Open “QR” → “Print stickers”.", "Stick one QR on each table — customers scan it to see the menu or order."],
    },
    km: {
      q: "តើបន្ថែមតុ និងបោះពុម្ពស្ទីគ័រ QR លើតុយ៉ាងម៉េច?",
      open: "បើកតុ",
      steps: ["បើកភោជនីយដ្ឋាន → “តុ” ហើយបន្ថែមតំបន់ និងតុ។", "បើក “QR” → “បោះពុម្ពស្ទីគ័រ”។", "បិទ QR មួយលើតុនីមួយៗ — អតិថិជនស្កេនដើម្បីមើលម៉ឺនុយ ឬកម្ម៉ង់។"],
    },
  },
  {
    id: "my_id",
    href: "/app/account",
    words: "my bizhub id account id share with me profile password email phone photo · BizHub ID គណនី ពាក្យសម្ងាត់",
    en: {
      q: "Where is my BizHub ID and account?",
      open: "Open Account",
      steps: ["Open Account (your name at the top of the menu).", "Your BizHub ID is there — give it to an owner who wants to add you to their team.", "Change your name, photo, phone or password on the same page."],
    },
    km: {
      q: "តើ BizHub ID និងគណនីរបស់ខ្ញុំនៅឯណា?",
      open: "បើកគណនី",
      steps: ["បើក គណនី (ឈ្មោះរបស់អ្នកនៅខាងលើម៉ឺនុយ)។", "BizHub ID របស់អ្នកនៅទីនោះ — ឱ្យវាដល់ម្ចាស់ដែលចង់បន្ថែមអ្នកក្នុងក្រុមការងារ។", "ប្តូរឈ្មោះ រូបថត លេខទូរស័ព្ទ ឬពាក្យសម្ងាត់ នៅទំព័រដដែល។"],
    },
  },
  {
    id: "bizi_do",
    popular: true,
    words: "bizi do command control tell quick action what can bizi do change price stock sold out check out paid owes stamp · Bizi ធ្វើ បញ្ជា ប្រាប់ អាចធ្វើអ្វី ប្តូរតម្លៃ ស្តុក អស់ ចាកចេញ បានបង់ ជំពាក់ ត្រា",
    en: {
      q: "What can Bizi do for me?",
      steps: [
        "Type (or say) what to do and what it is for — Bizi always asks “Yes / No” first.",
        "Orders: “#12 paid”, “accept #12”, “cancel #12”, “approve #0042”. Products: “sold out iced coffee”, “price coke 1.5”, “hide coke”, “coke +24” (stock in), “stock coke 30”.",
        "Guest house: “check in Dara”, “check out Dara”, “room 101 clean”. Attendance: “approve leave Sophea”.",
        "Debt book: “Dara owes 10$”, “Dara paid 5000៛”. Stamp card: “stamp Dara”, “Dara +2”. Telegram store: “close” / “open”. Website: “publish” / “unpublish”.",
        "Found in several businesses? “Do it for all” does them together. View only team members can look, not change.",
      ],
    },
    km: {
      q: "តើ Bizi អាចធ្វើអ្វីខ្លះឲ្យខ្ញុំ?",
      steps: [
        "វាយ (ឬនិយាយ) អ្វីដែលត្រូវធ្វើ និងសម្រាប់អ្វី — Bizi តែងតែសួរ “បាទ/ចាស / ទេ” ជាមុនសិន។",
        "ការកម្ម៉ង់៖ “#12 បានបង់” “ទទួល #12” “បោះបង់ #12” “អនុម័ត #0042”។ ទំនិញ៖ “អស់ កាហ្វេទឹកកក” “តម្លៃ កូកា 1.5” “លាក់ កូកា” “កូកា +24” (ចូលស្តុក) “ស្តុក កូកា 30”។",
        "ផ្ទះសំណាក់៖ “ចូលស្នាក់ ដារ៉ា” “ចាកចេញ ដារ៉ា” “បន្ទប់ 101 ស្អាត”។ វត្តមាន៖ “អនុម័តច្បាប់ សុភា”។",
        "សៀវភៅបំណុល៖ “ដារ៉ា ជំពាក់ 10$” “ដារ៉ា បានបង់ 5000៛”។ កាតត្រា៖ “ត្រា ដារ៉ា” “ដារ៉ា +2”។ ហាង Telegram៖ “បិទហាង” / “បើកហាង”។ គេហទំព័រ៖ “ផ្សាយ” / “បិទការផ្សាយ”។",
        "រកឃើញក្នុងអាជីវកម្មច្រើន? “ធ្វើសម្រាប់ទាំងអស់” ធ្វើវាព្រមគ្នា។ សមាជិកក្រុម “មើលប៉ុណ្ណោះ” អាចមើល មិនអាចប្តូរ។",
      ],
    },
  },
  {
    id: "look",
    href: "/app/settings",
    words: "change dark mode light night language khmer english colour color theme style look · ប្តូរ ម៉ូដងងឹត ភាសា ពណ៌ រចនាប័ទ្ម ភ្លឺ ងងឹត",
    en: {
      q: "How do I change dark mode, language or colour?",
      open: "Open Preferences",
      steps: ["Open Settings → “Preferences”.", "“Mode”: Light or Dark. “Language”: Khmer or English.", "“Colour” and “Style” change how the dashboard looks.", "Quick way: type “dark” or “language” here in Bizi."],
    },
    km: {
      q: "តើប្តូរម៉ូដងងឹត ភាសា ឬពណ៌យ៉ាងម៉េច?",
      open: "បើកចំណូលចិត្ត",
      steps: ["បើក ការកំណត់ → “ចំណូលចិត្ត”។", "“របៀប”៖ ភ្លឺ ឬ ងងឹត។ “ភាសា”៖ ខ្មែរ ឬ អង់គ្លេស។", "“ពណ៌” និង “រចនាប័ទ្ម” ប្តូររូបរាងផ្ទាំងគ្រប់គ្រង។", "វិធីលឿន៖ វាយ “ងងឹត” ឬ “ភាសា” នៅទីនេះក្នុង Bizi។"],
    },
  },
  {
    id: "support",
    href: "/app/support",
    words: "support help contact chat talk bizhub team problem bug message voice call · ជំនួយ ជជែក ទាក់ទង បញ្ហា",
    en: {
      q: "How do I contact BizHub support?",
      open: "Chat with BizHub",
      steps: ["Open “Chat with BizHub” in the menu.", "Write a message — you can attach up to 5 files or record a voice message.", "Tap “Send”; the team answers in the same chat."],
    },
    km: {
      q: "តើទាក់ទងក្រុមជំនួយ BizHub យ៉ាងម៉េច?",
      open: "ជជែកជាមួយ BizHub",
      steps: ["បើក “ជជែកជាមួយ BizHub” ក្នុងម៉ឺនុយ។", "សរសេរសារ — អ្នកអាចភ្ជាប់ឯកសាររហូតដល់ 5 ឬថតសារជាសំឡេង។", "ចុច “ផ្ញើ”; ក្រុមឆ្លើយក្នុងការជជែកដដែល។"],
    },
  },
];
