// Names and short descriptions of the paid looks (receipt + customer display), in both languages.
export const RECEIPT_THEMES = {
  classic: { en: "Classic", km: "បុរាណ", d_en: "The standard BizHub receipt. Free.", d_km: "វិក្កយបត្រស្តង់ដារ BizHub។ ឥតគិតថ្លៃ។" },
  modern: { en: "Modern", km: "ទំនើប", d_en: "Clean letters, solid lines, big total.", d_km: "អក្សរស្អាត បន្ទាត់ពេញ សរុបធំ។" },
  mono: { en: "Typewriter", km: "ម៉ាស៊ីនអង្គុលីលេខ", d_en: "Old-school typewriter letters, double lines.", d_km: "អក្សរម៉ាស៊ីនអង្គុលីលេខ បន្ទាត់ពីរជាន់។" },
  bold: { en: "Bold", km: "ដិតខ្លាំង", d_en: "Black title band and black total box.", d_km: "ក្បាលខ្មៅ និងប្រអប់សរុបខ្មៅ។" },
  compact: { en: "Compact", km: "តូចសន្សំក្រដាស", d_en: "Small and tight — saves paper.", d_km: "តូច និងតឹង — សន្សំក្រដាស។" },
  elegant: { en: "Elegant", km: "ប្រណីត", d_en: "Serif letters, double lines — for fine dining.", d_km: "អក្សរមានជើង បន្ទាត់ពីរជាន់ — សម្រាប់ភោជនីយដ្ឋានប្រណីត។" },
  boxed: { en: "Boxed", km: "ប្រអប់", d_en: "Each part in a neat box.", d_km: "ផ្នែកនីមួយៗនៅក្នុងប្រអប់ស្អាត។" },
  columns: { en: "Columns", km: "ជួរឈរ", d_en: "Qty · item · amount in clear columns.", d_km: "ចំនួន · មុខម្ហូប · តម្លៃ ជាជួរឈរច្បាស់។" },
  biglogo: { en: "Big logo", km: "ឡូហ្គោធំ", d_en: "Large round logo — for strong brands.", d_km: "ឡូហ្គោមូលធំ — សម្រាប់ម៉ាកល្បី។" },
  minimal: { en: "Minimal", km: "សាមញ្ញ", d_en: "No lines, lots of air, very light.", d_km: "គ្មានបន្ទាត់ ស្រឡះ ស្រាល។" },
  khmer: { en: "Khmer first", km: "ខ្មែរមុន", d_en: "Khmer dish names first and bigger.", d_km: "ឈ្មោះម្ហូបជាភាសាខ្មែរមុន និងធំជាង។" },
};

export const DISPLAY_THEMES = {
  clean: { en: "Clean", km: "ស្អាត", d_en: "Order on the left, pictures and total on the right. Free.", d_km: "ការកុម្ម៉ង់ខាងឆ្វេង រូបភាព និងសរុបខាងស្តាំ។ ឥតគិតថ្លៃ។", swatch: ["#f6f8fb", "#2563eb", "#0f172a"] },
  midnight: { en: "Spotlight", km: "ពន្លឺចាំង", d_en: "Dark. Big pictures on top with a glowing total, dishes as cards below.", d_km: "ងងឹត។ រូបភាពធំខាងលើ តម្លៃសរុបភ្លឺ ម្ហូបជាកាតខាងក្រោម។", swatch: ["#0b1220", "#38bdf8", "#e2e8f0"] },
  sunset: { en: "Paper receipt", km: "វិក្កយបត្រក្រដាស", d_en: "Warm. Pictures on the left, the order printed on a paper receipt.", d_km: "កក់ក្តៅ។ រូបភាពខាងឆ្វេង ការកុម្ម៉ង់លើវិក្កយបត្រក្រដាស។", swatch: ["#fff7ed", "#ea580c", "#431407"] },
  nature: { en: "Item cards", km: "កាតម្ហូប", d_en: "Fresh. Each dish as a card, pictures at the side, total bar at the bottom.", d_km: "ស្រស់។ ម្ហូបនីមួយៗជាកាត រូបភាពខាងចំហៀង របារសរុបខាងក្រោម។", swatch: ["#f0fdf4", "#16a34a", "#14532d"] },
  luxe: { en: "Menu board", km: "ក្តារម៉ឺនុយ", d_en: "Black and gold. A centred menu board with dotted lines, framed pictures.", d_km: "ខ្មៅ និងមាស។ ក្តារម៉ឺនុយកណ្តាល បន្ទាត់ចុចៗ រូបភាពមានស៊ុម។", swatch: ["#0c0a09", "#d4af37", "#f5f0e1"] },
  playful: { en: "Bubbles", km: "ពពុះ", d_en: "Bright and round. Dishes in colourful bubbles, total in a big circle.", d_km: "ភ្លឺ និងមូល។ ម្ហូបក្នុងពពុះចម្រុះពណ៌ សរុបក្នុងរង្វង់ធំ។", swatch: ["#fdf4ff", "#c026d3", "#3b0764"] },
};

export const themeName = (list, key, lang) => (lang === "km" ? list[key]?.km : list[key]?.en) || key;
export const themeDesc = (list, key, lang) => (lang === "km" ? list[key]?.d_km : list[key]?.d_en) || "";

// table QR sticker looks (Table ordering): classic is free, the others are bought one by one (rest_qr_theme)
export const QR_THEMES = {
  classic: { en: "Classic", km: "បុរាណ", d_en: "Your colour on top, big table name. Free.", d_km: "ពណ៌ហាងខាងលើ ឈ្មោះតុធំ។ ឥតគិតថ្លៃ។" },
  minimal: { en: "Minimal", km: "សាមញ្ញ", d_en: "White, thin lines, lots of space.", d_km: "ពណ៌ស បន្ទាត់ស្តើង ទំនេរច្រើន។" },
  block: { en: "Colour block", km: "ប្លុកពណ៌", d_en: "Full colour card, QR in a white box.", d_km: "កាតពណ៌ពេញ QR ក្នុងប្រអប់ស។" },
  tent: { en: "Table tent", km: "ស្លាកឈរលើតុ", d_en: "Folds into a stand: QR on both sides.", d_km: "បត់ជាស្លាកឈរ៖ QR ទាំងសងខាង។" },
  kraft: { en: "Kraft café", km: "ក្រដាសកាហ្វេ", d_en: "Brown paper look with a stamp, for cafés.", d_km: "រូបរាងក្រដាសត្នោត មានត្រា សម្រាប់ហាងកាហ្វេ។" },
  neon: { en: "Neon night", km: "ភ្លើងនីអុង", d_en: "Black with a glowing frame, for bars.", d_km: "ខ្មៅ ស៊ុមភ្លឺ សម្រាប់បារ។" },
  gold: { en: "Black & gold", km: "ខ្មៅ និងមាស", d_en: "Elegant frame, serif letters.", d_km: "ស៊ុមប្រណីត អក្សរស្រស់។" },
  bubble: { en: "Bubbles", km: "ពពុះ", d_en: "Round and playful, bright dots.", d_km: "មូល និងលេងសើច ចំណុចភ្លឺ។" },
  khmer: { en: "Khmer pattern", km: "ក្បាច់ខ្មែរ", d_en: "Gold Khmer-style border on deep red.", d_km: "ស៊ុមក្បាច់ខ្មែរមាស លើពណ៌ក្រហមចាស់។" },
  polaroid: { en: "Photo frame", km: "ស៊ុមរូបថត", d_en: "QR like an instant photo, handwritten table.", d_km: "QR ដូចរូបថតភ្លាមៗ ឈ្មោះតុដូចសរសេរដៃ។" },
  ticket: { en: "Ticket", km: "សំបុត្រ", d_en: "A ticket with a cut-out edge and dashed line.", d_km: "សំបុត្រមានគែមកាត់ និងបន្ទាត់ដាច់ៗ។" },
};

// looks of the guest's ordering page (Table ordering): fresh is free, the others are bought one by one (rest_order_theme)
export const ORDER_THEMES = {
  fresh: { en: "Fresh", km: "ស្រស់", d_en: "Light, your colour, photos on the right. Free.", d_km: "ភ្លឺ ពណ៌ហាង រូបខាងស្តាំ។ ឥតគិតថ្លៃ។", swatch: ["#f6f5f2", "#e0581a", "#17181c"] },
  midnight: { en: "Midnight", km: "ពាក់កណ្តាលអធ្រាត្រ", d_en: "Dark screen, soft glow — easy on the eyes at night.", d_km: "អេក្រង់ងងឹត ពន្លឺទន់ — ស្រួលភ្នែកពេលយប់។", swatch: ["#0f1117", "#7c9cff", "#e8eaf2"] },
  latte: { en: "Café latte", km: "កាហ្វេឡាតេ", d_en: "Warm cream and coffee brown, rounded serif titles.", d_km: "ពណ៌ក្រែម និងត្នោតកាហ្វេ ចំណងជើងស្រស់។", swatch: ["#f5ede3", "#8b5a3c", "#3b2a20"] },
  matcha: { en: "Matcha", km: "តែបៃតង", d_en: "Calm green and white, clean lines.", d_km: "បៃតងស្ងប់ និងស បន្ទាត់ស្អាត។", swatch: ["#eef4ea", "#5b8c4a", "#22331c"] },
  ocean: { en: "Ocean", km: "សមុទ្រ", d_en: "Blue waves on top, bright and airy.", d_km: "រលកខៀវខាងលើ ភ្លឺ និងស្រឡះ។", swatch: ["#eef6fb", "#1e7ab8", "#0d2a3f"] },
  sakura: { en: "Sakura", km: "ផ្កាសាគូរ៉ា", d_en: "Soft pink, round cards — sweet shops and desserts.", d_km: "ផ្កាឈូកស្រាល កាតមូល — ហាងបង្អែម។", swatch: ["#fdf1f4", "#d9567a", "#4a1d2b"] },
  street: { en: "Street food", km: "អាហារតាមផ្លូវ", d_en: "Bold yellow and black, big prices, chunky buttons.", d_km: "លឿង និងខ្មៅដិត តម្លៃធំ ប៊ូតុងធំ។", swatch: ["#fff6cc", "#111111", "#ffcc00"] },
  elegant: { en: "Fine dining", km: "ភោជនីយដ្ឋានប្រណីត", d_en: "Black and gold, serif menu with dotted price lines.", d_km: "ខ្មៅ និងមាស ម៉ឺនុយអក្សរស្រស់ បន្ទាត់តម្លៃចុចៗ។", swatch: ["#0d0c0b", "#c9a45c", "#f3ead7"] },
  mono: { en: "Mono", km: "ខ្មៅស", d_en: "Black and white only, sharp corners, very clear.", d_km: "តែខ្មៅ និងស ជ្រុងស្រួច ច្បាស់ណាស់។", swatch: ["#ffffff", "#111111", "#6b6b6b"] },
  angkor: { en: "Angkor", km: "អង្គរ", d_en: "Deep red and gold with a Khmer-style pattern.", d_km: "ក្រហមចាស់ និងមាស មានក្បាច់ខ្មែរ។", swatch: ["#fbf3e6", "#9e1b1b", "#c99a2e"] },
  tropical: { en: "Tropical", km: "ត្រូពិក", d_en: "Teal and coral, sunny and fun.", d_km: "ខៀវបៃតង និងផ្កាឈូកទឹកក្រូច ភ្លឺ និងរីករាយ។", swatch: ["#effaf7", "#0f9b8e", "#ff6f59"] },
  neon: { en: "Neon bar", km: "បារនីអុង", d_en: "Black with neon pink and cyan, for bars and nights out.", d_km: "ខ្មៅ នីអុងផ្កាឈូក និងខៀវ សម្រាប់បារ។", swatch: ["#0a0a12", "#ff2ea6", "#25e2ff"] },
  gallery: { en: "Photo gallery", km: "វិចិត្រសាលរូបភាព", d_en: "Big photo tiles, two per row — shows off your food.", d_km: "រូបភាពធំ ពីរក្នុងមួយជួរ — បង្ហាញម្ហូបឲ្យស្អាត។", swatch: ["#f4f4f4", "#ff5a36", "#1a1a1a"] },
};

// looks of the members' pages (points page + shop "check my points"): classic free, the others yearly (rest_points_theme)
export const POINTS_THEMES = {
  classic: { en: "Classic", km: "បុរាណ", d_en: "Your shop colour. Free.", d_km: "ពណ៌ហាងរបស់អ្នក។ ឥតគិតថ្លៃ។", swatch: ["#f6f5f2", "#e0581a", "#ffffff"] },
  gold: { en: "Gold card", km: "កាតមាស", d_en: "A black and gold VIP card.", d_km: "កាត VIP ខ្មៅ និងមាស។", swatch: ["#111111", "#d4af37", "#f5ecd2"] },
  midnight: { en: "Midnight", km: "ពាក់កណ្តាលអធ្រាត្រ", d_en: "Dark page, glowing blue card.", d_km: "ទំព័រងងឹត កាតខៀវភ្លឺ។", swatch: ["#0d1020", "#5b7cff", "#e6e9ff"] },
  pastel: { en: "Pastel", km: "ពណ៌ស្រាល", d_en: "Soft pink and mint, round and friendly.", d_km: "ផ្កាឈូក និងបៃតងស្រាល មូលស្និទ្ធស្នាល។", swatch: ["#fff4f6", "#ff8fab", "#7ed9c3"] },
  kraft: { en: "Kraft café", km: "ក្រដាសកាហ្វេ", d_en: "Brown paper card with a stamp, for cafés.", d_km: "កាតក្រដាសត្នោត មានត្រា សម្រាប់ហាងកាហ្វេ។", swatch: ["#efe4d2", "#8b5a3c", "#3b2a20"] },
  neon: { en: "Neon", km: "នីអុង", d_en: "Black with neon pink and cyan.", d_km: "ខ្មៅ នីអុងផ្កាឈូក និងខៀវ។", swatch: ["#08080f", "#ff2ea6", "#25e2ff"] },
  khmer: { en: "Khmer", km: "ខ្មែរ", d_en: "Deep red and gold with a Khmer-style border.", d_km: "ក្រហមចាស់ និងមាស ស៊ុមក្បាច់ខ្មែរ។", swatch: ["#fbf3e6", "#8f1414", "#c99a2e"] },
};
