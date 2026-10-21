// Paid page themes for the page people see after scanning (one-time each). The colour stays the owner's choice.
// base = the free layout it builds on (card · banner · minimal); dark = light text on a dark page
export const PAGE_THEMES = [
  { key: "aurora", base: "card", en: "Aurora", km: "អារ៉ូរ៉ា" },
  { key: "glass", base: "card", en: "Glass", km: "កញ្ចក់" },
  { key: "midnight", base: "card", dark: true, en: "Midnight", km: "អាធ្រាត្រ" },
  { key: "neon", base: "minimal", dark: true, en: "Neon", km: "នីអុង" },
  { key: "paper", base: "minimal", en: "Paper", km: "ក្រដាស" },
  { key: "marble", base: "minimal", en: "Marble", km: "ថ្មម៉ាប" },
  { key: "wave", base: "banner", en: "Wave", km: "រលក" },
  { key: "curve", base: "banner", en: "Curve", km: "ខ្សែកោង" },
  { key: "angle", base: "banner", en: "Angle", km: "ជ្រុង" },
  { key: "dots", base: "card", en: "Polka dots", km: "ចំណុច" },
  { key: "grid", base: "card", en: "Grid", km: "ក្រឡា" },
  { key: "stripes", base: "card", en: "Stripes", km: "ឆ្នូត" },
  { key: "split", base: "banner", en: "Split", km: "ពុះពីរ" },
  { key: "bubbles", base: "card", en: "Bubbles", km: "ពពុះ" },
  { key: "ticket", base: "card", en: "Ticket", km: "សំបុត្រ" },
  { key: "badge", base: "minimal", en: "Badge", km: "ស្លាក" },
  { key: "retro", base: "minimal", en: "Retro", km: "រេត្រូ" },
  { key: "pastel", base: "card", en: "Pastel", km: "ពណ៌ស្រាល" },
  { key: "mono", base: "minimal", en: "Mono", km: "ខ្មៅស" },
  { key: "luxe", base: "banner", dark: true, en: "Luxe", km: "ប្រណីត" },
  { key: "sunrise", base: "card", en: "Sunrise", km: "ថ្ងៃរះ" },
  { key: "confetti", base: "card", en: "Confetti", km: "ពិធីបុណ្យ" },
  { key: "leaf", base: "banner", en: "Leaf", km: "ស្លឹកឈើ" },
  { key: "tech", base: "minimal", dark: true, en: "Tech", km: "បច្ចេកវិទ្យា" },
];
export const THEME_KEYS = PAGE_THEMES.map((x) => x.key);
export const themeOf = (key) => PAGE_THEMES.find((x) => x.key === key) || null;
export const FREE_TEMPLATES = ["card", "banner", "minimal"];
