import { useI18n } from "../../i18n/I18nProvider";

// Shared words of the coin purchase modal (EN / KM). Callers pass their own title, perks and button text.
const TEXT = {
  en: {
    yourBalance: "Your balance",
    after: "After paying",
    notEnough: "You need {coins} more coins.",
    topUp: "Top up coins",
    maybeLater: "Maybe later",
    paying: "Paying…",
    coins: "coins",
    done: "Done!",
    great: "Great",
    sure: "Pay with coins?",
    sureSub: "{coins} coins will be taken from your wallet for “{name}”.",
    yesPay: "Yes, pay {coins}",
    no: "No",
  },
  km: {
    yourBalance: "កាក់របស់អ្នក",
    after: "បន្ទាប់ពីបង់",
    notEnough: "អ្នកត្រូវការកាក់ {coins} ទៀត។",
    topUp: "បញ្ចូលកាក់",
    maybeLater: "ពេលក្រោយ",
    paying: "កំពុងបង់…",
    coins: "កាក់",
    done: "រួចរាល់!",
    great: "ល្អណាស់",
    sure: "បង់ដោយកាក់?",
    sureSub: "កាក់ {coins} នឹងត្រូវកាត់ពីកាបូបរបស់អ្នក សម្រាប់ «{name}»។",
    yesPay: "បាទ/ចាស បង់ {coins}",
    no: "ទេ",
  },
};

export function usePurchaseText() {
  const { lang } = useI18n();
  return TEXT[lang] || TEXT.en;
}
