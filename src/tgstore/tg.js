// Telegram Mini App glue. The Telegram script loads only when the page was opened inside Telegram
// (Telegram adds #tgWebAppData… to the address), so a normal browser visit stays light.
let loading = null;

export const insideTelegram = () => typeof window !== "undefined" && (/tgWebApp/.test(window.location.hash) || !!window.Telegram?.WebApp?.initData);

export function loadTelegram() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Telegram?.WebApp) return Promise.resolve(window.Telegram.WebApp);
  if (!/tgWebApp/.test(window.location.hash)) return Promise.resolve(null);
  if (!loading)
    loading = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://telegram.org/js/telegram-web-app.js";
      s.async = true;
      s.onload = () => resolve(window.Telegram?.WebApp || null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
      setTimeout(() => resolve(window.Telegram?.WebApp || null), 4000);
    });
  return loading;
}

// the Telegram look (light / dark) as our CSS variables; the shop colour stays the accent
export function telegramTheme(wa) {
  const p = wa?.themeParams || {};
  const v = {};
  if (p.bg_color) v["--ts-bg"] = p.bg_color;
  if (p.secondary_bg_color) v["--ts-page"] = p.secondary_bg_color;
  if (p.text_color) v["--ts-ink"] = p.text_color;
  if (p.hint_color) v["--ts-muted"] = p.hint_color;
  if (p.section_separator_color) v["--ts-line"] = p.section_separator_color;
  return v;
}

export const haptic = (kind = "light") => {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(kind);
  } catch {
    /* not in Telegram */
  }
};

// may the bot message this person? (only asked once, inside Telegram)
export const askWrite = (wa) =>
  new Promise((resolve) => {
    if (!wa?.requestWriteAccess) return resolve(false);
    try {
      wa.requestWriteAccess((ok) => resolve(!!ok));
    } catch {
      resolve(false);
    }
  });

export const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* private mode */
    }
  },
};
