// The blocks a page can have — the same list as the API (api/src/biz/website/website.blocks.js) + what the editor needs:
// a name, an icon, a group, labels for each field, and the content of a new block.
// Field kinds: t = short text in both languages {km, en}   tl = long text in both languages   s = plain text
//              img = picture   to = a link (page:<slug>, https://, tel:, mailto:)   date   bool   [..] = choice
//              { list: {fields}, max } = rows
export const BLOCKS = {
  hero: { title: "t", sub: "tl", image: "img", btn: "t", btn_to: "to", btn2: "t", btn2_to: "to", align: ["center", "left"], size: ["md", "lg", "sm"], overlay: ["dark", "light", "color"] },
  text: { title: "t", body: "tl", align: ["left", "center"] },
  split: { title: "t", body: "tl", image: "img", side: ["left", "right"], btn: "t", btn_to: "to" },
  image: { image: "img", caption: "t", wide: "bool" },
  gallery: { title: "t", images: { list: { image: "img", caption: "t" }, max: 24 }, cols: ["3", "2", "4"] },
  video: { title: "t", url: "s" },
  services: { title: "t", sub: "tl", items: { list: { icon: "s", title: "t", text: "tl", image: "img" }, max: 12 } },
  prices: { title: "t", sub: "tl", items: { list: { name: "t", price: "s", desc: "t" }, max: 40 }, note: "t" },
  team: { title: "t", people: { list: { name: "t", role: "t", photo: "img" }, max: 16 } },
  quotes: { title: "t", items: { list: { text: "tl", name: "t", role: "t", photo: "img" }, max: 12 } },
  faq: { title: "t", items: { list: { q: "t", a: "tl" }, max: 24 } },
  hours: { title: "t", rows: { list: { day: "t", time: "t" }, max: 10 }, note: "t" },
  map: { title: "t", address: "t", map_url: "s" },
  contact: { title: "t", sub: "tl", phone_field: "bool", email_field: "bool", button: "t" },
  buttons: { title: "t", items: { list: { label: "t", to: "to", style: ["solid", "outline"] }, max: 6 }, align: ["center", "left"] },
  social: { title: "t" },
  countdown: { title: "t", date: "date", sub: "t" },
  numbers: { title: "t", items: { list: { value: "s", label: "t" }, max: 6 } },
  logos: { title: "t", images: { list: { image: "img", name: "t", to: "to" }, max: 20 } },
  cta: { title: "t", sub: "tl", btn: "t", btn_to: "to" },
  spacer: { size: ["md", "sm", "lg"], line: "bool" },
  posts: { title: "t", count: ["3", "6"] },
};
export const BLOCK_TYPES = Object.keys(BLOCKS);

// groups in the "Add a block" picker
export const BLOCK_GROUPS = [
  ["top", ["hero", "cta", "buttons", "countdown"]],
  ["content", ["text", "split", "services", "prices", "numbers", "faq"]],
  ["pictures", ["image", "gallery", "video", "logos"]],
  ["people", ["team", "quotes"]],
  ["contact", ["contact", "map", "hours", "social"]],
  ["other", ["posts", "spacer"]],
];

export const BLOCK_NAMES = {
  en: {
    hero: "Big banner",
    text: "Text",
    split: "Picture + text",
    image: "Picture",
    gallery: "Gallery",
    video: "Video",
    services: "Services / features",
    prices: "Price list",
    team: "Team",
    quotes: "Customer words",
    faq: "Questions (FAQ)",
    hours: "Opening hours",
    map: "Map",
    contact: "Contact form",
    buttons: "Buttons",
    social: "Social links",
    countdown: "Countdown",
    numbers: "Numbers",
    logos: "Logos / partners",
    cta: "Call to action",
    spacer: "Space / line",
    posts: "Latest posts",
  },
  km: {
    hero: "បដាធំ",
    text: "អត្ថបទ",
    split: "រូបភាព + អត្ថបទ",
    image: "រូបភាព",
    gallery: "វិចិត្រសាល",
    video: "វីដេអូ",
    services: "សេវាកម្ម / លក្ខណៈ",
    prices: "បញ្ជីតម្លៃ",
    team: "ក្រុមការងារ",
    quotes: "សម្តីអតិថិជន",
    faq: "សំណួរ (FAQ)",
    hours: "ម៉ោងបើក",
    map: "ផែនទី",
    contact: "ទម្រង់ទំនាក់ទំនង",
    buttons: "ប៊ូតុង",
    social: "បណ្តាញសង្គម",
    countdown: "រាប់ថយក្រោយ",
    numbers: "តួលេខ",
    logos: "ឡូហ្គោ / ដៃគូ",
    cta: "អំពាវនាវឲ្យធ្វើសកម្មភាព",
    spacer: "ចន្លោះ / បន្ទាត់",
    posts: "អត្ថបទថ្មីៗ",
  },
};
export const GROUP_NAMES = {
  en: { top: "Top of page", content: "Content", pictures: "Pictures & video", people: "People", contact: "Contact", other: "More" },
  km: { top: "ផ្នែកខាងលើ", content: "មាតិកា", pictures: "រូបភាព និងវីដេអូ", people: "មនុស្ស", contact: "ទំនាក់ទំនង", other: "ផ្សេងៗ" },
};

export const FIELD_NAMES = {
  en: {
    title: "Title",
    sub: "Text under the title",
    body: "Text",
    image: "Picture",
    btn: "Button text",
    btn_to: "Button opens",
    btn2: "Second button text",
    btn2_to: "Second button opens",
    align: "Text position",
    size: "Height",
    overlay: "Over the picture",
    side: "Picture side",
    caption: "Caption",
    wide: "Full width",
    images: "Pictures",
    cols: "Pictures per row",
    url: "Video link (YouTube or Facebook)",
    items: "Rows",
    icon: "Icon",
    text: "Text",
    name: "Name",
    price: "Price",
    desc: "Details",
    note: "Note",
    people: "People",
    role: "Job / role",
    photo: "Photo",
    q: "Question",
    a: "Answer",
    rows: "Rows",
    day: "Day",
    time: "Time",
    address: "Address",
    map_url: "Google Maps link (optional)",
    phone_field: "Ask for a phone number",
    email_field: "Ask for an email",
    button: "Button text",
    label: "Label",
    to: "Opens",
    style: "Style",
    date: "Date and time",
    value: "Number",
    line: "Show a line",
    count: "How many posts",
  },
  km: {
    title: "ចំណងជើង",
    sub: "អត្ថបទក្រោមចំណងជើង",
    body: "អត្ថបទ",
    image: "រូបភាព",
    btn: "អក្សរលើប៊ូតុង",
    btn_to: "ប៊ូតុងបើកទៅ",
    btn2: "អក្សរប៊ូតុងទីពីរ",
    btn2_to: "ប៊ូតុងទីពីរបើកទៅ",
    align: "ទីតាំងអក្សរ",
    size: "កម្ពស់",
    overlay: "ពីលើរូបភាព",
    side: "ខាងរូបភាព",
    caption: "ចំណងជើងរូប",
    wide: "ពេញទទឹង",
    images: "រូបភាព",
    cols: "រូបក្នុងមួយជួរ",
    url: "តំណវីដេអូ (YouTube ឬ Facebook)",
    items: "ជួរ",
    icon: "រូបតំណាង",
    text: "អត្ថបទ",
    name: "ឈ្មោះ",
    price: "តម្លៃ",
    desc: "ព័ត៌មានលម្អិត",
    note: "ចំណាំ",
    people: "មនុស្ស",
    role: "តួនាទី",
    photo: "រូបថត",
    q: "សំណួរ",
    a: "ចម្លើយ",
    rows: "ជួរ",
    day: "ថ្ងៃ",
    time: "ម៉ោង",
    address: "អាសយដ្ឋាន",
    map_url: "តំណ Google Maps (បើមាន)",
    phone_field: "សួរលេខទូរស័ព្ទ",
    email_field: "សួរអ៊ីមែល",
    button: "អក្សរលើប៊ូតុង",
    label: "ឈ្មោះ",
    to: "បើកទៅ",
    style: "ស្ទីល",
    date: "កាលបរិច្ឆេទ និងម៉ោង",
    value: "តួលេខ",
    line: "បង្ហាញបន្ទាត់",
    count: "ចំនួនអត្ថបទ",
  },
};
export const CHOICE_NAMES = {
  en: { center: "Centre", left: "Left", right: "Right", md: "Medium", lg: "Large", sm: "Small", dark: "Dark shade", light: "Light shade", color: "Main colour", solid: "Filled", outline: "Outline", 2: "2", 3: "3", 4: "4", 6: "6" },
  km: { center: "កណ្តាល", left: "ឆ្វេង", right: "ស្តាំ", md: "មធ្យម", lg: "ធំ", sm: "តូច", dark: "ស្រមោលងងឹត", light: "ស្រមោលភ្លឺ", color: "ពណ៌ចម្បង", solid: "ពេញ", outline: "គែម", 2: "2", 3: "3", 4: "4", 6: "6" },
};

const T = (en, km = "") => ({ en, km });
// a new block, ready to edit
export function newBlock(type) {
  const id = Math.random().toString(36).slice(2, 10);
  const d = {
    hero: { title: T("Your big headline", "ចំណងជើងធំរបស់អ្នក"), sub: T("One or two lines about what you do.", "មួយ ឬពីរបន្ទាត់អំពីអ្វីដែលអ្នកធ្វើ។"), btn: T("Contact us", "ទាក់ទងយើង"), btn_to: "", align: "center", size: "md", overlay: "dark" },
    text: { title: T("A title", "ចំណងជើង"), body: T("Write your text here.", "សរសេរអត្ថបទរបស់អ្នកនៅទីនេះ។"), align: "left" },
    split: { title: T("About us", "អំពីយើង"), body: T("Tell your story next to a picture.", "ប្រាប់រឿងរបស់អ្នកជាមួយរូបភាព។"), side: "right" },
    image: { caption: T("", ""), wide: false },
    gallery: { title: T("Gallery", "វិចិត្រសាល"), cols: "3", images: [] },
    video: { title: T("Watch", "មើល"), url: "" },
    services: {
      title: T("What we do", "អ្វីដែលយើងធ្វើ"),
      items: [
        { icon: "star", title: T("Service one", "សេវាទី 1"), text: T("A short line about it.", "ពិពណ៌នាខ្លី។") },
        { icon: "heart", title: T("Service two", "សេវាទី 2"), text: T("A short line about it.", "ពិពណ៌នាខ្លី។") },
        { icon: "zap", title: T("Service three", "សេវាទី 3"), text: T("A short line about it.", "ពិពណ៌នាខ្លី។") },
      ],
    },
    prices: {
      title: T("Prices", "តម្លៃ"),
      items: [
        { name: T("Item one", "មុខទី 1"), price: "$5", desc: T("", "") },
        { name: T("Item two", "មុខទី 2"), price: "$8", desc: T("", "") },
      ],
    },
    team: { title: T("Our team", "ក្រុមការងារ"), people: [{ name: T("Name", "ឈ្មោះ"), role: T("Role", "តួនាទី") }] },
    quotes: { title: T("What people say", "អ្វីដែលអតិថិជននិយាយ"), items: [{ text: T("Great place, friendly people!", "កន្លែងល្អ មនុស្សរួសរាយ!"), name: T("A happy customer", "អតិថិជនពេញចិត្ត") }] },
    faq: { title: T("Questions", "សំណួរ"), items: [{ q: T("A question?", "សំណួរ?"), a: T("The answer.", "ចម្លើយ។") }] },
    hours: { title: T("Opening hours", "ម៉ោងបើក"), rows: [{ day: T("Monday – Sunday", "ច័ន្ទ – អាទិត្យ"), time: T("8:00 – 20:00", "8:00 – 20:00") }] },
    map: { title: T("Find us", "ស្វែងរកយើង"), address: T("Phnom Penh, Cambodia", "ភ្នំពេញ កម្ពុជា"), map_url: "" },
    contact: { title: T("Send us a message", "ផ្ញើសារមកយើង"), phone_field: true, email_field: false, button: T("Send", "ផ្ញើ") },
    buttons: { items: [{ label: T("Call us", "ទូរស័ព្ទមកយើង"), to: "", style: "solid" }], align: "center" },
    social: { title: T("Follow us", "តាមដានយើង") },
    countdown: { title: T("Opening soon", "បើកឆាប់ៗ"), date: "", sub: T("", "") },
    numbers: {
      items: [
        { value: "100+", label: T("Customers", "អតិថិជន") },
        { value: "5★", label: T("Rating", "ការវាយតម្លៃ") },
      ],
    },
    logos: { title: T("Our partners", "ដៃគូរបស់យើង"), images: [] },
    cta: { title: T("Ready to start?", "ត្រៀមចាប់ផ្តើមហើយឬនៅ?"), sub: T("We're happy to help.", "យើងរីករាយជួយ។"), btn: T("Contact us", "ទាក់ទងយើង"), btn_to: "" },
    spacer: { size: "md", line: false },
    posts: { title: T("Latest news", "ព័ត៌មានថ្មីៗ"), count: "3" },
  }[type];
  return { id, type, hidden: false, data: fill(BLOCKS[type], d || {}) };
}
// every field present (empty values where none given)
export function fill(fields, data) {
  const out = {};
  for (const [k, kind] of Object.entries(fields)) {
    const v = data?.[k];
    if (Array.isArray(kind)) out[k] = kind.includes(v) ? v : kind[0];
    else if (kind && typeof kind === "object") out[k] = (Array.isArray(v) ? v : []).map((row) => fill(kind.list, row));
    else if (kind === "t" || kind === "tl") out[k] = v && typeof v === "object" ? { en: v.en || "", km: v.km || "" } : { en: String(v || ""), km: "" };
    else if (kind === "bool") out[k] = v === true;
    else out[k] = v ?? "";
  }
  return out;
}
// text in the visitor's language (the other one when empty)
export const tx = (v, lang) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  return (lang === "km" ? v.km || v.en : v.en || v.km) || "";
};
