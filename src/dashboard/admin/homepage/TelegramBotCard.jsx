import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { telegramAdminService } from "../../../api/services";

const TEXT = {
  en: {
    title: "Telegram bot",
    sub: "The BizHub bot that sends restaurants their reports and website messages.",
    check: "Check again",
    fix: "Connect bot to this server",
    noToken: "Not set up: add TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME to the API .env, then restart the API.",
    bot: "Bot",
    mode: "How messages arrive",
    modes: { webhook: "Webhook ✓ (live server)", polling: "Polling (computer)", other_webhook: "Webhook points to another server", none: "Not receiving messages" },
    ok: "Working — owners can connect.",
    noUrl: "Set API_PUBLIC_URL (the https address of the API) in .env and restart — then press “Connect bot to this server”.",
    pending: "Waiting messages",
    lastError: "Last error from Telegram",
    fixed: "Done — the bot now sends messages to this server.",
  },
  km: {
    title: "Telegram bot",
    sub: "BizHub bot ដែលផ្ញើរបាយការណ៍ និងសារពីគេហទំព័រ ទៅភោជនីយដ្ឋាន។",
    check: "ពិនិត្យម្តងទៀត",
    fix: "ភ្ជាប់ bot ទៅម៉ាស៊ីនមេនេះ",
    noToken: "មិនទាន់រៀបចំ៖ បន្ថែម TELEGRAM_BOT_TOKEN និង TELEGRAM_BOT_USERNAME ក្នុង .env របស់ API រួចចាប់ផ្តើម API ឡើងវិញ។",
    bot: "Bot",
    mode: "របៀបទទួលសារ",
    modes: { webhook: "Webhook ✓ (ម៉ាស៊ីនមេពិត)", polling: "Polling (កុំព្យូទ័រ)", other_webhook: "Webhook ចង្អុលទៅម៉ាស៊ីនមេផ្សេង", none: "មិនទទួលសារ" },
    ok: "ដំណើរការ — ម្ចាស់ហាងអាចភ្ជាប់បាន។",
    noUrl: "កំណត់ API_PUBLIC_URL (អាសយដ្ឋាន https របស់ API) ក្នុង .env រួចចាប់ផ្តើមឡើងវិញ — បន្ទាប់មកចុច “ភ្ជាប់ bot ទៅម៉ាស៊ីនមេនេះ”។",
    pending: "សារកំពុងរង់ចាំ",
    lastError: "កំហុសចុងក្រោយពី Telegram",
    fixed: "រួចរាល់ — bot ផ្ញើសារមកម៉ាស៊ីនមេនេះហើយ។",
  },
};

// Super admin → Website settings: Telegram bot status + one-click fix
export default function TelegramBotCard({ lang }) {
  const t = TEXT[lang] || TEXT.en;
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  const load = useCallback(() => {
    setBusy(true);
    return telegramAdminService
      .status()
      .then((r) => setS(r.data))
      .catch((e) => setMsg({ ok: false, text: e.message }))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const fix = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await telegramAdminService.fixWebhook();
      setS(r.data);
      setMsg({ ok: true, text: t.fixed });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const working = s && (s.mode === "webhook" || s.mode === "polling") && !s.error;
  return (
    <section className="panel-card tgb" style={{ marginTop: 16 }}>
      <div className="tgb-head">
        <span className="tgb-ic">
          <Send size={20} />
        </span>
        <div>
          <h2 style={{ margin: 0 }}>{t.title}</h2>
          <p style={{ margin: "2px 0 0" }}>{t.sub}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={load} disabled={busy}>
          {busy ? <Loader2 size={16} className="md-spin" /> : <RefreshCw size={16} />} {t.check}
        </button>
      </div>
      {s && !s.configured && <p className="tgb-line warn">{t.noToken}</p>}
      {s?.configured && (
        <div className="tgb-grid">
          <div>
            <small>{t.bot}</small>
            <b>{s.bot ? `@${s.bot}` : "—"}</b>
          </div>
          <div>
            <small>{t.mode}</small>
            <b>{t.modes[s.mode] || s.mode}</b>
          </div>
          {s.pending > 0 && (
            <div>
              <small>{t.pending}</small>
              <b>{s.pending}</b>
            </div>
          )}
        </div>
      )}
      {s?.configured && working && (
        <p className="tgb-line ok">
          <CheckCircle2 size={16} /> {t.ok}
        </p>
      )}
      {s?.configured && !working && (
        <>
          {(s.error || s.last_error) && (
            <p className="tgb-line warn">
              <TriangleAlert size={16} /> {t.lastError}: {s.error || s.last_error}
            </p>
          )}
          {!s.public_url && <p className="tgb-line warn">{t.noUrl}</p>}
          <button type="button" className="btn btn-primary" onClick={fix} disabled={busy || !s.public_url}>
            {t.fix}
          </button>
        </>
      )}
      {msg && <p className={`tgb-line ${msg.ok ? "ok" : "warn"}`}>{msg.text}</p>}
    </section>
  );
}
