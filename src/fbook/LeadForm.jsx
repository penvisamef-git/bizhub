import { useState } from "react";
import { BookOpen, Check, Loader2, Send, X } from "lucide-react";
import { publicPost } from "../api/client";

// the owner's contact form card: used in the reader (book form) and on the library ("Contact us")
export default function LeadForm({ path, extra = {}, form, t, cover, before, sendLabel, icon = "book", thanks, onDone, onClose }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", telegram: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await publicPost(path, { ...f, ...extra });
      if (thanks) {
        setSent(true);
        setBusy(false);
      } else onDone(true);
    } catch (x) {
      const code = x.body?.code;
      setErr(code === "lead_name" ? t.leadName : code === "lead_phone" ? t.leadPhone : code === "lead_email" ? t.leadEmail : code === "slow" ? t.slow : code === "lead_off" ? "" : x.message);
      if (code === "lead_off") onDone(false);
      setBusy(false);
    }
  };
  const Icon = icon === "send" ? Send : BookOpen;
  return (
    <div className={`fr-lead ${before ? "before" : ""}`} data-testid="fr-lead" onMouseDown={(e) => onClose && e.target === e.currentTarget && onClose()}>
      {before && cover && <div className="fr-lock-cover" style={{ backgroundImage: `url(${cover})` }} />}
      <form className="fr-lead-card" onSubmit={send}>
        {onClose && (
          <button type="button" className="fr-lead-x" onClick={onClose} aria-label={t.close}>
            <X size={18} />
          </button>
        )}
        {cover && <img src={cover} alt="" className="fr-lead-thumb" />}
        {sent ? (
          <div className="fr-lead-done" data-testid="fr-lead-thanks">
            <span>
              <Check size={26} />
            </span>
            <h2>{t.leadThanks}</h2>
            <p>{t.leadThanksSub}</p>
            <button type="submit" onClick={(e) => (e.preventDefault(), onDone(true))}>
              {t.close}
            </button>
          </div>
        ) : (
          <>
            <h2>{form.title || t.leadTitle}</h2>
            <p>{form.message || t.leadSub}</p>
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t.leadNameF} maxLength={80} autoFocus data-testid="fr-lead-name" />
            <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder={t.leadPhoneF} maxLength={30} inputMode="tel" data-testid="fr-lead-phone" />
            {form.ask_email && <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder={t.leadEmailF} maxLength={120} />}
            {form.ask_telegram && <input value={f.telegram} onChange={(e) => setF({ ...f, telegram: e.target.value })} placeholder={t.leadTelegramF} maxLength={60} />}
            {form.ask_note && <textarea rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={t.leadNoteF} maxLength={500} data-testid="fr-lead-note" />}
            {err && <div className="fr-err">{err}</div>}
            <button type="submit" disabled={busy || !f.name.trim() || !f.phone.trim()} data-testid="fr-lead-send">
              {busy ? <Loader2 size={16} className="fr-spin" /> : <Icon size={16} />} {sendLabel || t.leadSend}
            </button>
            {form.skip && (
              <button type="button" className="fr-lead-skip" onClick={() => onDone(false)} data-testid="fr-lead-skip">
                {t.leadSkip}
              </button>
            )}
            <small className="fr-lead-note">{t.leadPrivacy}</small>
          </>
        )}
      </form>
    </div>
  );
}
