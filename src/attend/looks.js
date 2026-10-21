// Attendance looks — the first of each list is free, the others are bought one by one (forever).
// Keys must match the API (attendance.models.js APP_THEMES / QR_THEMES).

// staff phone app: each look is its own layout. The colour is chosen apart (free), like the name card.
export const APP_LOOKS = {
  classic: { en: "Classic", km: "បុរាណ", d_en: "Clock card, big round button. Free.", d_km: "កាតនាឡិកា ប៊ូតុងមូលធំ។ ឥតគិតថ្លៃ។" },
  hero: { en: "Hero", km: "ផ្ទាំងធំ", d_en: "Big coloured top with the clock, button rising from the edge.", d_km: "ផ្នែកខាងលើពណ៌ធំ មាននាឡិកា ប៊ូតុងលេចពីគែម។" },
  badge: { en: "ID badge", km: "កាតបុគ្គលិក", d_en: "Your staff card on screen, wide pill button.", d_km: "កាតបុគ្គលិកលើអេក្រង់ ប៊ូតុងវែង។" },
  split: { en: "Two buttons", km: "ប៊ូតុងពីរ", d_en: "Huge clock, In and Out side by side.", d_km: "នាឡិកាធំ ចូល និងចេញនៅជាប់គ្នា។" },
  minimal: { en: "Minimal", km: "សាមញ្ញ", d_en: "Thin giant clock, lots of white space.", d_km: "នាឡិកាធំស្តើង ទំនេរច្រើន។" },
  ring: { en: "Shift ring", km: "រង្វង់វេន", d_en: "A ring fills up as the shift goes by.", d_km: "រង្វង់ពេញឡើងតាមពេលវេន។" },
  timeline: { en: "Timeline", km: "ខ្សែពេលវេលា", d_en: "Your day as a timeline, button at the bottom.", d_km: "ថ្ងៃរបស់អ្នកជាខ្សែពេលវេលា ប៊ូតុងខាងក្រោម។" },
  glass: { en: "Glass", km: "កញ្ចក់", d_en: "Soft glow background, frosted glass cards.", d_km: "ផ្ទៃពន្លឺទន់ កាតកញ្ចក់ព្រិល។" },
  bold: { en: "Bold", km: "ដិតធំ", d_en: "Giant letters, full-width button for the thumb.", d_km: "អក្សរធំៗ ប៊ូតុងពេញទទឹង។" },
  digital: { en: "Digital", km: "ឌីជីថល", d_en: "Dark screen, digital clock, status panel.", d_km: "អេក្រង់ងងឹត នាឡិកាឌីជីថល ផ្ទាំងស្ថានភាព។" },
  ticket: { en: "Ticket", km: "សំបុត្រ", d_en: "Today as a boarding pass, tear-off button.", d_km: "ថ្ងៃនេះដូចសំបុត្រឡើងយន្តហោះ ប៊ូតុងហែក។" },
  angkor: { en: "Angkor", km: "អង្គរ", d_en: "Khmer pattern frame, gold rings.", d_km: "ស៊ុមក្បាច់ខ្មែរ រង្វង់មាស។" },
};

// colours offered (any other with the colour picker)
export const APP_COLORS = ["#4F46E5", "#1A73E8", "#00897B", "#2E7D32", "#E0581A", "#D93025", "#C2185B", "#7B1FA2", "#B8860B", "#16171B"];

// lighter / darker version of a #RRGGBB colour
export function shade(hex, percent) {
  const n = parseInt(String(hex || "#4F46E5").slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (percent / 100) * (percent > 0 ? 255 - c : c))));
  return `#${((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1)}`;
}
export const colorVars = (c = "#4F46E5") => ({ "--c": c, "--c-dark": shade(c, -40), "--c-light": shade(c, 45), "--c-soft": shade(c, 88) });

// printed staff QR sticker
export const QR_LOOKS = {
  classic: { en: "Classic", km: "បុរាណ", d_en: "Your logo on top, big QR, work hours. Free.", d_km: "ឡូហ្គោខាងលើ QR ធំ ម៉ោងធ្វើការ។ ឥតគិតថ្លៃ។" },
  minimal: { en: "Minimal", km: "សាមញ្ញ", d_en: "White, thin lines, lots of space.", d_km: "ពណ៌ស បន្ទាត់ស្តើង ទំនេរច្រើន។" },
  block: { en: "Colour block", km: "ប្លុកពណ៌", d_en: "Full colour card, QR in a white box.", d_km: "កាតពណ៌ពេញ QR ក្នុងប្រអប់ស។" },
  gradient: { en: "Gradient", km: "ពណ៌ចម្រុះ", d_en: "Blue-to-purple glow, modern office.", d_km: "ពណ៌ខៀវទៅស្វាយ ការិយាល័យទំនើប។" },
  dark: { en: "Dark", km: "ងងឹត", d_en: "Black card, white QR — strong and clean.", d_km: "កាតខ្មៅ QR ស — ខ្លាំង និងស្អាត។" },
  gold: { en: "Black & gold", km: "ខ្មៅ និងមាស", d_en: "Elegant gold frame, serif letters.", d_km: "ស៊ុមមាសប្រណីត អក្សរស្រស់។" },
  angkor: { en: "Khmer pattern", km: "ក្បាច់ខ្មែរ", d_en: "Gold Khmer-style border on deep red.", d_km: "ស៊ុមក្បាច់ខ្មែរមាស លើក្រហមចាស់។" },
  kraft: { en: "Kraft paper", km: "ក្រដាសត្នោត", d_en: "Brown paper look with a stamp.", d_km: "រូបរាងក្រដាសត្នោត មានត្រា។" },
  ticket: { en: "Ticket", km: "សំបុត្រ", d_en: "A pass with cut-out edges and dashed line.", d_km: "សំបុត្រមានគែមកាត់ និងបន្ទាត់ដាច់ៗ។" },
  badge: { en: "ID badge", km: "កាតសម្គាល់", d_en: "Looks like a staff ID card with a clip hole.", d_km: "ដូចកាតបុគ្គលិក មានរន្ធខ្សែ។" },
  photo: { en: "Photo frame", km: "ស៊ុមរូបថត", d_en: "QR like an instant photo, handwritten title.", d_km: "QR ដូចរូបថតភ្លាមៗ ចំណងជើងដូចសរសេរដៃ។" },
  neon: { en: "Neon", km: "នីអុង", d_en: "Black with a glowing frame.", d_km: "ខ្មៅ ស៊ុមភ្លឺ។" },
};

export const lookName = (list, key, lang) => (lang === "km" ? list[key]?.km : list[key]?.en) || key;
export const lookDesc = (list, key, lang) => (lang === "km" ? list[key]?.d_km : list[key]?.d_en) || "";

// door kiosk (the tablet at the entrance): 23 layouts, classic free; colour chosen apart (free)
export const KIOSK_LOOKS = {
  classic: { en: "Classic", km: "បុរាណ", d_en: "Clock on a colour side, QR on white. Free.", d_km: "នាឡិកាផ្នែកពណ៌ QR លើផ្ទៃស។ ឥតគិតថ្លៃ។" },
  reverse: { en: "Mirror", km: "ឆ្លុះ", d_en: "QR on the left, a tall colour panel on the right.", d_km: "QR ខាងឆ្វេង ផ្ទាំងពណ៌ខាងស្តាំ។" },
  center: { en: "Centre stage", km: "កណ្តាលឆាក", d_en: "Everything centred: logo, huge QR, clock below.", d_km: "អ្វីៗនៅកណ្តាល៖ ឡូហ្គោ QR ធំ នាឡិកាខាងក្រោម។" },
  hero: { en: "Hero band", km: "ផ្ទាំងធំ", d_en: "A wide colour band on top, the QR rising from it.", d_km: "ផ្ទាំងពណ៌ធំខាងលើ QR លេចចេញពីវា។" },
  dark: { en: "Night glow", km: "ពន្លឺយប់", d_en: "Dark screen, glowing QR frame in your colour.", d_km: "អេក្រង់ងងឹត ស៊ុម QR ភ្លឺតាមពណ៌របស់អ្នក។" },
  minimal: { en: "Minimal", km: "សាមញ្ញ", d_en: "White, thin giant clock, lots of space.", d_km: "ពណ៌ស នាឡិកាស្តើងធំ ទំនេរច្រើន។" },
  bold: { en: "Bold", km: "ដិតធំ", d_en: "Giant SCAN letters and a thick black QR frame.", d_km: "អក្សរ SCAN ធំ និងស៊ុម QR ខ្មៅក្រាស់។" },
  card: { en: "Floating card", km: "កាតអណ្តែត", d_en: "One big white card with the QR and the clock.", d_km: "កាតសធំមួយ មាន QR និងនាឡិកា។" },
  ring: { en: "Countdown ring", km: "រង្វង់រាប់ថយក្រោយ", d_en: "The QR inside a ring that counts down to the next code.", d_km: "QR នៅក្នុងរង្វង់ដែលរាប់ថយក្រោយដល់កូដបន្ទាប់។" },
  gradient: { en: "Glass glow", km: "កញ្ចក់ពន្លឺ", d_en: "Soft colour blobs behind a frosted glass card.", d_km: "ពពុះពណ៌ទន់ៗ នៅពីក្រោយកាតកញ្ចក់ព្រិល។" },
  sidebar: { en: "Sidebar", km: "របារចំហៀង", d_en: "Clock in a slim side bar, QR and live list side by side.", d_km: "នាឡិកាក្នុងរបារចំហៀង QR និងបញ្ជីផ្ទាល់នៅជាប់គ្នា។" },
  ticker: { en: "News ticker", km: "ព័ត៌មានរត់", d_en: "Who just clocked in scrolls along the bottom.", d_km: "អ្នកទើបចុះវត្តមាន រត់នៅខាងក្រោម។" },
  poster: { en: "Poster", km: "ផ្ទាំងរូបភាព", d_en: "Big title and an arrow pointing to the QR.", d_km: "ចំណងជើងធំ និងព្រួញចង្អុលទៅ QR។" },
  welcome: { en: "Welcome", km: "សូមស្វាគមន៍", d_en: "A warm Good morning / Good afternoon greeting.", d_km: "ការស្វាគមន៍ អរុណសួស្តី / ទិវាសួស្តី។" },
  stats: { en: "Live stats", km: "ស្ថិតិផ្ទាល់", d_en: "Tiles: how many came today, last in, the clock.", d_km: "ប្រអប់៖ ចំនួនមកថ្ងៃនេះ អ្នកចុងក្រោយ នាឡិកា។" },
  bento: { en: "Bento", km: "ប្រអប់បេនតូ", d_en: "A bento grid of tiles in different sizes.", d_km: "ក្រឡាប្រអប់ទំហំផ្សេងៗគ្នា។" },
  digital: { en: "Terminal", km: "ទែមីណាល់", d_en: "Dark digital screen, log lines like a terminal.", d_km: "អេក្រង់ឌីជីថលងងឹត បញ្ជីដូចទែមីណាល់។" },
  paper: { en: "Paper", km: "ក្រដាស", d_en: "Warm paper, serif letters, QR like a stamp.", d_km: "ក្រដាសកក់ក្តៅ អក្សរស្រស់ QR ដូចត្រា។" },
  angkor: { en: "Angkor", km: "អង្គរ", d_en: "Khmer pattern frame in gold.", d_km: "ស៊ុមក្បាច់ខ្មែរពណ៌មាស។" },
  gold: { en: "Black & gold", km: "ខ្មៅ និងមាស", d_en: "Luxury black with thin gold frames.", d_km: "ខ្មៅប្រណីត ស៊ុមមាសស្តើង។" },
  pastel: { en: "Pastel", km: "ពណ៌ទន់", d_en: "Round, soft and friendly.", d_km: "មូល ទន់ និងរួសរាយ។" },
  diagonal: { en: "Diagonal", km: "អង្កត់ទ្រូង", d_en: "A bold diagonal split across the screen.", d_km: "ការបែងចែកអង្កត់ទ្រូងលើអេក្រង់។" },
  frame: { en: "Phone frame", km: "ស៊ុមទូរស័ព្ទ", d_en: "A phone drawn around the QR with a moving scan line.", d_km: "រូបទូរស័ព្ទជុំវិញ QR មានបន្ទាត់ស្កេនរត់។" },
};
export const KIOSK_COLORS = ["#0F766E", "#4F46E5", "#1A73E8", "#2E7D32", "#E0581A", "#D93025", "#C2185B", "#7B1FA2", "#B8860B", "#16171B"];
