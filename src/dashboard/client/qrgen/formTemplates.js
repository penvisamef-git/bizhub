// ready-made forms (free with Form QR). Fields with photo / rating / signature / show_if need Form extras.
const T = (en, km) => (lang) => (lang === "km" ? km : en);
const f = (label, kind, extra = {}) => ({ label, kind, ...extra });
export const FORM_TEMPLATES = {
  job: {
    title: { en: "Apply for a job", km: "ដាក់ពាក្យការងារ" },
    fields: (lang) => {
      const t = (en, km) => T(en, km)(lang);
      return [
        f(t("Full name", "ឈ្មោះពេញ"), "text", { required: true }),
        f(t("Phone", "ទូរស័ព្ទ"), "phone", { required: true }),
        f(t("Position", "មុខតំណែង"), "select", { options: [t("Cashier", "អ្នកគិតលុយ"), t("Waiter", "អ្នករត់តុ"), t("Cook", "ចុងភៅ"), t("Other", "ផ្សេងៗ")], required: true }),
        f(t("Can start", "អាចចាប់ផ្តើម"), "date"),
        f(t("Experience", "បទពិសោធន៍"), "textarea"),
        f(t("Your photo or CV", "រូបថត ឬ CV"), "photo"),
      ];
    },
  },
  feedback: {
    title: { en: "How was your visit?", km: "តើអ្នកពេញចិត្តទេ?" },
    fields: (lang) => {
      const t = (en, km) => T(en, km)(lang);
      return [
        f(t("Your rating", "ការវាយតម្លៃ"), "rating", { required: true }),
        f(t("What did you like?", "អ្វីដែលអ្នកចូលចិត្ត?"), "checkbox", { options: [t("Food", "ម្ហូប"), t("Service", "សេវា"), t("Price", "តម្លៃ"), t("Place", "ទីកន្លែង")] }),
        f(t("Comment", "មតិ"), "textarea"),
        f(t("Name (optional)", "ឈ្មោះ (ស្រេចចិត្ត)"), "text"),
        f(t("Phone (optional)", "ទូរស័ព្ទ (ស្រេចចិត្ត)"), "phone"),
      ];
    },
  },
  booking: {
    title: { en: "Book a table", km: "កក់តុ" },
    fields: (lang) => {
      const t = (en, km) => T(en, km)(lang);
      return [
        f(t("Name", "ឈ្មោះ"), "text", { required: true }),
        f(t("Phone", "ទូរស័ព្ទ"), "phone", { required: true }),
        f(t("Date", "កាលបរិច្ឆេទ"), "date", { required: true }),
        f(t("Time", "ម៉ោង"), "select", { options: ["11:00", "12:00", "13:00", "18:00", "19:00", "20:00"], required: true }),
        f(t("People", "ចំនួនមនុស្ស"), "number", { required: true }),
        f(t("Note", "កំណត់ចំណាំ"), "textarea"),
      ];
    },
  },
  register: {
    title: { en: "Event registration", km: "ចុះឈ្មោះចូលរួម" },
    fields: (lang) => {
      const t = (en, km) => T(en, km)(lang);
      return [
        f(t("Full name", "ឈ្មោះពេញ"), "text", { required: true }),
        f(t("Phone", "ទូរស័ព្ទ"), "phone", { required: true }),
        f("Email", "email"),
        f(t("Organization", "ស្ថាប័ន"), "text"),
        f(t("Will you join?", "តើអ្នកចូលរួមទេ?"), "radio", { options: [t("Yes", "បាទ/ចាស"), t("Maybe", "ប្រហែល")], required: true }),
        f(t("Number of guests", "ចំនួនភ្ញៀវ"), "number", { show_if: { key: "f5", value: t("Yes", "បាទ/ចាស") } }),
      ];
    },
  },
  contact: {
    title: { en: "Contact us", km: "ទាក់ទងយើង" },
    fields: (lang) => {
      const t = (en, km) => T(en, km)(lang);
      return [f(t("Name", "ឈ្មោះ"), "text", { required: true }), f(t("Phone", "ទូរស័ព្ទ"), "phone", { required: true }), f("Email", "email"), f(t("Message", "សារ"), "textarea", { required: true })];
    },
  },
  order: {
    title: { en: "Order", km: "កុម្ម៉ង់" },
    fields: (lang) => {
      const t = (en, km) => T(en, km)(lang);
      return [
        f(t("Name", "ឈ្មោះ"), "text", { required: true }),
        f(t("Phone", "ទូរស័ព្ទ"), "phone", { required: true }),
        f(t("What do you want?", "អ្នកចង់បានអ្វី?"), "textarea", { required: true }),
        f(t("Pick up or delivery", "មកយក ឬដឹកជូន"), "radio", { options: [t("Pick up", "មកយក"), t("Delivery", "ដឹកជូន")], required: true }),
        f(t("Address", "អាសយដ្ឋាន"), "textarea", { show_if: { key: "f4", value: t("Delivery", "ដឹកជូន") }, required: true }),
      ];
    },
  },
};
