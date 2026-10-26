import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, Loader2, Lock, RotateCcw, Trash2, X } from "lucide-react";
import { useI18n } from "../../../i18n/I18nProvider";
import { accountDeleteService } from "../../../api/services";
import { auth } from "../../../lib/auth";
import { googleSignIn, phoneErrorKey } from "../../../lib/phoneAuth";
import { GoogleIcon, usePhoneText } from "../../../homepage/auth/phone";
import { ROUTES } from "../../../config";

// "Delete my account" (business owners). Google Play / App Store need it in the app + on the web (/delete-account).
// Asked → 30 days to change your mind (logging in again cancels) → then businesses, files and coins are erased.
export const DEL_TEXT = {
  en: {
    title: "Delete my account",
    sub: "Erase your BizHub account and everything in it.",
    lost: "What you lose",
    lostList: [
      "Every business in this account, with all its data (menus, products, orders, notes, staff, customers…)",
      "All files and pictures you uploaded",
      "Your coins and every add-on and theme you bought — coins are not refunded",
      "Your chat with BizHub, your profile and your login",
    ],
    grace: "You have 30 days to change your mind. Log in again before then (or tap “Cancel deletion”) and nothing is lost. After 30 days it can't be undone.",
    kept: "Coin purchase and payment records are kept without your name, because the law asks us to keep money records.",
    start: "Delete my account…",
    confirmTitle: "Delete your BizHub account?",
    understand: "I understand my businesses, files and coins will be erased after 30 days.",
    password: "Your password",
    orGoogle: "or confirm with Google",
    google: "Confirm with Google",
    confirm: "Delete my account",
    cancel: "Keep my account",
    pendingTitle: "Your account will be deleted",
    pendingSub: "On {date} ({days} days left), your account, businesses, files and coins will be erased.",
    pendingHint: "Changed your mind? Cancel now, or just log in again before that day.",
    undo: "Cancel deletion",
    undone: "Deletion cancelled. Your account stays.",
    welcomeBack: "Welcome back! Your account deletion was cancelled.",
    banner: "Your account will be deleted on {date}.",
    bannerLink: "Cancel",
    help: "How account deletion works",
  },
  km: {
    title: "លុបគណនីរបស់ខ្ញុំ",
    sub: "លុបគណនី BizHub និងអ្វីៗទាំងអស់នៅក្នុងនោះ។",
    lost: "អ្វីដែលអ្នកនឹងបាត់បង់",
    lostList: [
      "អាជីវកម្មទាំងអស់ក្នុងគណនីនេះ ព្រមទាំងទិន្នន័យ (ម៉ឺនុយ ទំនិញ ការកម្ម៉ង់ កំណត់ត្រា បុគ្គលិក អតិថិជន…)",
      "ឯកសារ និងរូបភាពទាំងអស់ដែលអ្នកបានដាក់",
      "កាក់របស់អ្នក និងមុខងារបន្ថែម/រចនាប័ទ្មដែលបានទិញ — កាក់មិនត្រូវបានសងវិញទេ",
      "ការជជែកជាមួយ BizHub ប្រវត្តិរូប និងការចូលគណនីរបស់អ្នក",
    ],
    grace: "អ្នកមាន 30 ថ្ងៃដើម្បីប្តូរចិត្ត។ ចូលគណនីម្តងទៀតមុនថ្ងៃនោះ (ឬចុច “បោះបង់ការលុប”) នោះគ្មានអ្វីបាត់ទេ។ ក្រោយ 30 ថ្ងៃ មិនអាចត្រឡប់វិញបានទេ។",
    kept: "កំណត់ត្រាទិញកាក់ និងការបង់ប្រាក់ត្រូវបានរក្សាទុកដោយគ្មានឈ្មោះរបស់អ្នក ព្រោះច្បាប់តម្រូវឲ្យរក្សាកំណត់ត្រាហិរញ្ញវត្ថុ។",
    start: "លុបគណនីរបស់ខ្ញុំ…",
    confirmTitle: "លុបគណនី BizHub របស់អ្នក?",
    understand: "ខ្ញុំយល់ថា អាជីវកម្ម ឯកសារ និងកាក់របស់ខ្ញុំនឹងត្រូវលុបក្រោយ 30 ថ្ងៃ។",
    password: "ពាក្យសម្ងាត់របស់អ្នក",
    orGoogle: "ឬបញ្ជាក់ដោយ Google",
    google: "បញ្ជាក់ដោយ Google",
    confirm: "លុបគណនីរបស់ខ្ញុំ",
    cancel: "រក្សាគណនីរបស់ខ្ញុំ",
    pendingTitle: "គណនីរបស់អ្នកនឹងត្រូវលុប",
    pendingSub: "នៅថ្ងៃ {date} (នៅសល់ {days} ថ្ងៃ) គណនី អាជីវកម្ម ឯកសារ និងកាក់របស់អ្នកនឹងត្រូវលុប។",
    pendingHint: "ប្តូរចិត្តហើយ? បោះបង់ឥឡូវនេះ ឬគ្រាន់តែចូលគណនីម្តងទៀតមុនថ្ងៃនោះ។",
    undo: "បោះបង់ការលុប",
    undone: "បានបោះបង់ការលុប។ គណនីរបស់អ្នកនៅដដែល។",
    welcomeBack: "សូមស្វាគមន៍ការត្រឡប់មកវិញ! ការលុបគណនីរបស់អ្នកត្រូវបានបោះបង់។",
    banner: "គណនីរបស់អ្នកនឹងត្រូវលុបនៅថ្ងៃ {date}។",
    bannerLink: "បោះបង់",
    help: "របៀបលុបគណនី",
  },
};

const fmtDate = (d, lang) => {
  try {
    return new Date(d).toLocaleDateString(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return String(d || "").slice(0, 10);
  }
};
const setLoginDeleteAt = (delete_at) => {
  const cur = auth.getClientLogin();
  if (cur) auth.setClientLogin({ ...cur, delete_at: delete_at || null, deletion_cancelled: false });
  window.dispatchEvent(new Event("bizhub-profile"));
};

// The top-of-dashboard line: "deletion was cancelled" once after logging in, or "will be deleted on …" while pending
export function DeletionBanner({ user }) {
  const { lang } = useI18n();
  const x = DEL_TEXT[lang] || DEL_TEXT.en;
  const [cancelledMsg, setCancelledMsg] = useState(false);
  useEffect(() => {
    if (!user?.deletion_cancelled) return;
    setCancelledMsg(true);
    const cur = auth.getClientLogin();
    if (cur) auth.setClientLogin({ ...cur, deletion_cancelled: false }); // shown once
    const t = setTimeout(() => setCancelledMsg(false), 8000);
    return () => clearTimeout(t);
  }, [user?.deletion_cancelled]);
  if (cancelledMsg) return <div className="md-notice md-notice-success del-banner">{x.welcomeBack}</div>;
  if (!user?.delete_at) return null;
  return (
    <div className="md-notice md-notice-error del-banner" role="status">
      <AlertTriangle size={16} /> {x.banner.replace("{date}", fmtDate(user.delete_at, lang))}{" "}
      <Link to={`${ROUTES.account}#delete-account`}>{x.bannerLink}</Link>
    </div>
  );
}

// The card on "My account"
export default function DeleteAccount({ onChanged }) {
  const { lang } = useI18n();
  const x = DEL_TEXT[lang] || DEL_TEXT.en;
  const { p } = usePhoneText();
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    accountDeleteService
      .status()
      .then((r) => alive && setStatus(r.data))
      .catch(() => alive && setStatus({ pending: false }));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (window.location.hash === "#delete-account") document.getElementById("delete-account")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [status]);

  const ask = async (body) => {
    setError("");
    try {
      const r = await accountDeleteService.request(body);
      setStatus(r.data);
      setLoginDeleteAt(r.data.delete_at);
      setOpen(false);
      setPassword("");
      setAgree(false);
      onChanged?.(r.data);
    } catch (err) {
      setError(err.response?.code === "wrong_password" ? p.wrongPassword || err.message : err.message);
    }
  };
  const withPassword = async (e) => {
    e.preventDefault();
    if (!agree || !password || busy) return;
    setBusy("password");
    await ask({ password });
    setBusy("");
  };
  const withGoogle = async () => {
    if (!agree || busy) return;
    setBusy("google");
    setError("");
    try {
      const g = await googleSignIn();
      await ask({ firebase_token: g.token });
    } catch (err) {
      const key = phoneErrorKey(err);
      if (key !== "cancelled") setError(p[key] || err.message);
    } finally {
      setBusy("");
    }
  };
  const undo = async () => {
    setBusy("undo");
    setError("");
    try {
      const r = await accountDeleteService.cancel();
      setStatus(r.data);
      setLoginDeleteAt(null);
      setNotice(x.undone);
      onChanged?.(r.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  if (!status) return null;
  return (
    <section className={`ac-card del-card ${status.pending ? "is-pending" : ""}`} id="delete-account">
      <header className="ac-card-head">
        <span className="ac-card-icon del-icon">{status.pending ? <CalendarClock size={18} /> : <Trash2 size={18} />}</span>
        <div>
          <h3>{status.pending ? x.pendingTitle : x.title}</h3>
          <p>{status.pending ? x.pendingSub.replace("{date}", fmtDate(status.delete_at, lang)).replace("{days}", status.days) : x.sub}</p>
        </div>
      </header>
      {notice && <div className="md-notice md-notice-success">{notice}</div>}
      {status.pending ? (
        <div className="del-body">
          <p className="del-hint">{x.pendingHint}</p>
          {error && <div className="md-form-error">{error}</div>}
          <button type="button" className="ac-btn ac-btn-primary" onClick={undo} disabled={!!busy} data-testid="del-undo">
            {busy === "undo" ? <Loader2 size={16} className="md-spin" /> : <RotateCcw size={16} />} {x.undo}
          </button>
        </div>
      ) : (
        <div className="del-body">
          <p className="del-hint">{x.grace}</p>
          <div className="del-actions">
            <button type="button" className="ac-btn del-btn" onClick={() => (setOpen(true), setError(""))} data-testid="del-start">
              <Trash2 size={16} /> {x.start}
            </button>
            <Link className="del-help" to={ROUTES.deleteAccount}>
              {x.help}
            </Link>
          </div>
        </div>
      )}

      {open &&
        createPortal(
          <div className="md-modal-backdrop" onMouseDown={() => !busy && setOpen(false)}>
            <div className="md-modal md-modal-sm del-modal" role="dialog" aria-modal="true" aria-label={x.confirmTitle} onMouseDown={(e) => e.stopPropagation()}>
              <div className="md-modal-header">
                <h3>{x.confirmTitle}</h3>
                <button type="button" className="md-icon-btn" onClick={() => setOpen(false)} disabled={!!busy} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="md-modal-body">
                <div className="del-warn">
                  <AlertTriangle size={18} />
                  <div>
                    <b>{x.lost}</b>
                    <ul>
                      {x.lostList.map((li) => (
                        <li key={li}>{li}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="del-hint">{x.grace}</p>
                <p className="del-kept">{x.kept}</p>
                <label className="del-agree">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={!!busy} data-testid="del-agree" /> <span>{x.understand}</span>
                </label>
                <form onSubmit={withPassword} className="del-form">
                  <label htmlFor="del-pw">{x.password}</label>
                  <div className="ac-input">
                    <Lock size={16} className="ac-input-icon" />
                    <input id="del-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={!agree || !!busy} placeholder="••••••••" data-testid="del-pw" />
                  </div>
                  {error && <div className="md-form-error">{error}</div>}
                  <button type="submit" className="ac-btn del-btn del-btn-full" disabled={!agree || !password || !!busy} data-testid="del-confirm">
                    {busy === "password" ? <Loader2 size={16} className="md-spin" /> : <Trash2 size={16} />} {x.confirm}
                  </button>
                </form>
                <div className="del-or">{x.orGoogle}</div>
                <button type="button" className="ac-btn ac-btn-ghost del-btn-full" onClick={withGoogle} disabled={!agree || !!busy}>
                  {busy === "google" ? <Loader2 size={16} className="md-spin" /> : <GoogleIcon />} {x.google}
                </button>
                <button type="button" className="ac-btn ac-btn-ghost del-btn-full del-keep" onClick={() => setOpen(false)} disabled={!!busy}>
                  {x.cancel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
