// Emoji picker list (Style pack). Typing emoji from the keyboard is always free — only this picker is part of the pack.
const split = (s) => Array.from(s.replace(/\s+/g, " ").trim().split(" "));

export const EMOJI = {
  smileys: split("😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😜 🤪 😎 🤩 🥳 😏 😌 😔 😢 😭 😤 😡 🤯 😳 🥺 😱 🤔 🤫 🤭 😴 🤒 🤗 😶 🙄"),
  people: split("👍 👎 👌 ✌️ 🤞 🤝 🙏 👏 🙌 💪 👋 ✋ 👆 👇 👉 👈 ✍️ 💅 🧑‍🏫 🧑‍💼 🧑‍🍳 🧑‍🔧 🧑‍⚕️ 🧑‍🎓 👨‍👩‍👧 👶 👵 👴 🙋 🙆 🙅 🤷 💁 🏃 🧘"),
  nature: split("🌸 🌺 🌻 🌷 🌹 🪷 🌿 🍀 🌴 🌳 🌵 🍁 🍂 🌾 🌞 🌙 ⭐ 🌈 ☁️ 🌧️ ⛈️ ❄️ 🔥 💧 🌊 🐶 🐱 🐭 🐰 🐼 🐘 🐟 🐓 🦋 🐝"),
  food: split("🍚 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍗 🍖 🥩 🥗 🥪 🍔 🍟 🍕 🌮 🍳 🥖 🍞 🥭 🍌 🍉 🍍 🥥 🍊 🍎 🍇 🍓 🧋 ☕ 🍵 🥤 🍺 🎂 🍰 🍩 🍦"),
  activities: split("⚽ 🏀 🏐 🏸 🏓 🥊 🏊 🚴 🎮 🎲 🎯 🎨 🎤 🎧 🎵 🎶 🎸 🥁 🎬 📸 🎉 🎊 🎈 🎁 🏆 🥇 🥈 🥉 🎗️ 🧧 🪔 🎆 🎇"),
  travel: split("🏠 🏡 🏢 🏫 🏥 🏦 🏪 🏨 🛕 ⛪ 🕌 🗼 🏝️ 🏖️ ⛰️ 🗺️ 🚗 🚕 🛺 🏍️ 🚲 🚌 🚚 🚢 ⛵ 🛶 ✈️ 🚀 🚦 ⛽ 🧳 🎫 🛣️"),
  objects: split("📱 💻 🖥️ ⌨️ 🖨️ 📷 📞 🔋 💡 🔦 🕯️ 📦 📫 ✉️ 📝 📄 📑 📊 📈 📉 📌 📍 📎 ✂️ 🗂️ 📁 📅 🗓️ ⏰ ⌛ 🔑 🔒 🔓 🧾 💵 💰 💳 🛒 🛍️ 🧰 🔧 🔨 🧹 🧺"),
  symbols: split("❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💯 ✅ ☑️ ✔️ ❌ ❎ ⭕ ❗ ❓ ⚠️ 🚫 ⛔ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🔺 🔻 ➡️ ⬅️ ⬆️ ⬇️ 🔁 🆕 🆗 🆓 💲 ♻️ ⭐ ✨ 💥 💤"),
  flags: split("🇰🇭 🇹🇭 🇻🇳 🇱🇦 🇲🇾 🇸🇬 🇮🇩 🇵🇭 🇲🇲 🇨🇳 🇯🇵 🇰🇷 🇮🇳 🇺🇸 🇬🇧 🇫🇷 🇩🇪 🇦🇺 🏁 🚩 🏳️"),
};
export const EMOJI_GROUPS = Object.keys(EMOJI);
export const EMOJI_TAB = { recent: "🕘", smileys: "😀", people: "👍", nature: "🌸", food: "🍜", activities: "🎉", travel: "🛺", objects: "📝", symbols: "❤️", flags: "🇰🇭" };
export const EMOJI_GROUP_NAMES = {
  en: { recent: "Recent", smileys: "Smileys", people: "People", nature: "Nature", food: "Food", activities: "Activities", travel: "Places", objects: "Objects", symbols: "Symbols", flags: "Flags" },
  km: { recent: "ថ្មីៗ", smileys: "ទឹកមុខ", people: "មនុស្ស", nature: "ធម្មជាតិ", food: "អាហារ", activities: "សកម្មភាព", travel: "ទីកន្លែង", objects: "វត្ថុ", symbols: "និមិត្តសញ្ញា", flags: "ទង់ជាតិ" },
};

const RECENT_KEY = "bh_note_emoji_recent";
export function recentEmoji() {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 24) : [];
  } catch {
    return [];
  }
}
export function rememberEmoji(e) {
  try {
    const list = [e, ...recentEmoji().filter((x) => x !== e)].slice(0, 24);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* private mode */
  }
}
// a few emoji for the callout box icon
export const CALLOUT_ICONS = split("💡 ⚠️ 📌 ✅ ❗ ℹ️ 📣 🗓️ ⏰ 💰 🎉 ❤️ 🔒 📝 🛺 🪷");
