import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, CheckCircle2, Lock, Mail, MailCheck, X } from "lucide-react";
import { useI18n } from "../../../i18n/I18nProvider";
import { customerAuthService } from "../../../api/services";
import { auth } from "../../../lib/auth";
import { completeEmailLink, googleSignIn, isEmailLink, phoneErrorKey, preloadFirebase, savedLinkEmail, sendEmailLink } from "../../../lib/phoneAuth";
import { GoogleIcon, ResendButton, usePhoneText } from "../../../homepage/auth/phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TICKET_KEY = "bizhub_email_ticket"; // kept on this device for 15 minutes: the email link may open a new tab
const RETURN_PATH = "/app/account";

const TEXT = {
  en: {
    change: "Change email",
    title: "Change your email",
    step1: "For your safety, type your password first.",
    password: "Current password",
    next: "Continue",
    checking: "Checking…",
    step2: "Now confirm the new email.",
    google: "Use a Google account",
    or: "or",
    newEmail: "New email",
    sendLink: "Send confirm link",
    sentTitle: "Check the new inbox",
    sentSub: "We sent a link to {email}. Open it on this device to finish.",
    finishing: "Saving your new email…",
    done: "Email changed to {email}. Other devices were logged out.",
    expired: "Too much time passed. Type your password again.",
    typeEmail: "Type the new email you used, to finish.",
    confirm: "Confirm",
    current: "Current: {email}",
    wrongPw: "Wrong password.",
    same: "That is already your email.",
  },
  km: {
    change: "ប្តូរអ៊ីមែល",
    title: "ប្តូរអ៊ីមែលរបស់អ្នក",
    step1: "ដើម្បីសុវត្ថិភាព សូមវាយពាក្យសម្ងាត់ជាមុនសិន។",
    password: "ពាក្យសម្ងាត់បច្ចុប្បន្ន",
    next: "បន្ត",
    checking: "កំពុងពិនិត្យ…",
    step2: "ឥឡូវបញ្ជាក់អ៊ីមែលថ្មី។",
    google: "ប្រើគណនី Google",
    or: "ឬ",
    newEmail: "អ៊ីមែលថ្មី",
    sendLink: "ផ្ញើតំណបញ្ជាក់",
    sentTitle: "ពិនិត្យប្រអប់សំបុត្រថ្មី",
    sentSub: "យើងបានផ្ញើតំណទៅ {email}។ សូមបើកវានៅលើឧបករណ៍នេះ ដើម្បីបញ្ចប់។",
    finishing: "កំពុងរក្សាទុកអ៊ីមែលថ្មី…",
    done: "បានប្តូរអ៊ីមែលទៅ {email}។ ឧបករណ៍ផ្សេងៗត្រូវបានចាកចេញ។",
    expired: "ហួសពេលហើយ។ សូមវាយពាក្យសម្ងាត់ម្តងទៀត។",
    typeEmail: "វាយអ៊ីមែលថ្មីដែលអ្នកបានប្រើ ដើម្បីបញ្ចប់។",
    confirm: "បញ្ជាក់",
    current: "បច្ចុប្បន្ន៖ {email}",
    wrongPw: "ពាក្យសម្ងាត់មិនត្រឹមត្រូវ។",
    same: "នេះជាអ៊ីមែលបច្ចុប្បន្នរបស់អ្នករួចហើយ។",
  },
};

const readTicket = () => {
  try {
    const x = JSON.parse(localStorage.getItem(TICKET_KEY) || "null");
    return x && x.until > Date.now() ? x.ticket : "";
  } catch {
    return "";
  }
};
const saveTicket = (ticket, minutes) => {
  try {
    localStorage.setItem(TICKET_KEY, JSON.stringify({ ticket, until: Date.now() + minutes * 60000 - 30000 }));
  } catch {
    /* storage blocked: Google button still works */
  }
};
const dropTicket = () => {
  try {
    localStorage.removeItem(TICKET_KEY);
  } catch {
    /* ignore */
  }
};

// Change email (business owners): 1) password again → 2) new email confirmed by Google or an email link
export default function ChangeEmail({ current, onChanged }) {
  const { lang } = useI18n();
  const x = TEXT[lang] || TEXT.en;
  const { p } = usePhoneText();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("password"); // password | choose | sent | link-email | finishing
  const [password, setPassword] = useState("");
  const [ticket, setTicket] = useState("");
  const [email, setEmail] = useState("");
  const [sentAt, setSentAt] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const say = (err) => {
    const key = phoneErrorKey(err);
    if (key === "cancelled") return;
    if (err?.status === 401 && err.response?.code === "ticket_old") {
      dropTicket();
      setStep("password");
      return setError(x.expired);
    }
    const code = err?.response?.code;
    if (code === "wrong_password") return setError(x.wrongPw);
    if (code === "email_taken") return setError(p.emailTaken);
    if (code === "same_email") return setError(x.same);
    if (err?.status) return setError(err.message);
    setError(`${p[key] || err?.message || p.smsFailed}${(key === "smsFailed" || key === "smsNotReady") && err?.code ? ` (${err.code})` : ""}`);
  };

  const save = async (tk, firebaseToken) => {
    const res = await customerAuthService.changeEmail(tk, firebaseToken);
    dropTicket();
    auth.setClientLogin({ ...auth.getClientLogin(), email: res.data.email, email_verified: true });
    onChanged?.(res.data, x.done.replace("{email}", res.data.email));
    setOpen(false);
  };

  // came back from the email link
  useEffect(() => {
    isEmailLink()
      .then(async (yes) => {
        const tk = readTicket();
        if (!yes || !tk) return;
        setTicket(tk);
        setOpen(true);
        const mail = savedLinkEmail();
        if (!mail) return setStep("link-email");
        setStep("finishing");
        setBusy(true);
        try {
          await save(tk, await completeEmailLink(mail));
        } catch (err) {
          setStep("choose");
          say(err);
        } finally {
          setBusy(false);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    setError("");
    setPassword("");
    setEmail("");
    const tk = readTicket();
    setTicket(tk);
    setStep(tk ? "choose" : "password");
    setOpen(true);
    preloadFirebase(); // so the Google window opens straight from the click
  };

  const checkPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (!password) return;
    setBusy(true);
    try {
      const r = await customerAuthService.emailStart(password);
      saveTicket(r.data.ticket, r.data.minutes);
      setTicket(r.data.ticket);
      setStep("choose");
    } catch (err) {
      say(err);
    } finally {
      setBusy(false);
    }
  };

  const withGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      const g = await googleSignIn();
      await save(ticket, g.token);
    } catch (err) {
      say(err);
    } finally {
      setBusy(false);
    }
  };

  const sendLink = async (e) => {
    e?.preventDefault();
    setError("");
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) return setError(p.badEmail);
    if (mail === String(current || "").toLowerCase()) return setError(x.same);
    setBusy(true);
    try {
      const r = await customerAuthService.check({ email: mail });
      if (r.data.email?.taken) return setError(p.emailTaken);
      await sendEmailLink(mail, RETURN_PATH, lang);
      setEmail(mail);
      setSentAt(Date.now());
      setStep("sent");
    } catch (err) {
      say(err);
    } finally {
      setBusy(false);
    }
  };

  const finishTyped = async (e) => {
    e.preventDefault();
    setError("");
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) return setError(p.badEmail);
    setBusy(true);
    try {
      await save(ticket, await completeEmailLink(mail));
    } catch (err) {
      say(err);
    } finally {
      setBusy(false);
    }
  };

  const alert = error && <div className="md-form-error">{error}</div>;

  return (
    <>
      <button type="button" className="ac-link-btn" onClick={start}>
        <Mail size={14} /> {x.change}
      </button>
      {open &&
        createPortal(
          <div className="md-modal-backdrop" onMouseDown={() => !busy && setOpen(false)}>
            <div className="md-modal md-modal-sm ce-modal" role="dialog" aria-modal="true" aria-label={x.title} onMouseDown={(e) => e.stopPropagation()}>
              <div className="md-modal-header">
                <h3>{x.title}</h3>
                <button type="button" className="md-icon-btn" onClick={() => setOpen(false)} disabled={busy} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="md-modal-body">
                {current && <p className="ce-current">{x.current.replace("{email}", current)}</p>}

                {step === "password" && (
                  <form className="ce-form" onSubmit={checkPassword}>
                    <p className="ce-sub">
                      <Lock size={14} /> {x.step1}
                    </p>
                    <label className="ce-label" htmlFor="ce-pw">
                      {x.password}
                    </label>
                    <input id="ce-pw" className="ce-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} autoFocus />
                    {alert}
                    <button type="submit" className="md-btn md-btn-primary" disabled={busy || !password}>
                      {busy ? x.checking : x.next}
                    </button>
                  </form>
                )}

                {step === "choose" && (
                  <div className="ce-form">
                    <p className="ce-sub">
                      <CheckCircle2 size={14} /> {x.step2}
                    </p>
                    <button type="button" className="md-btn ce-google" onClick={withGoogle} disabled={busy}>
                      <GoogleIcon /> {x.google}
                    </button>
                    <div className="ce-or">{x.or}</div>
                    <form className="ce-form" onSubmit={sendLink}>
                      <label className="ce-label" htmlFor="ce-email">
                        {x.newEmail}
                      </label>
                      <input id="ce-email" className="ce-input" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
                      {alert}
                      <button type="submit" className="md-btn md-btn-primary" disabled={busy || !email.trim()}>
                        {busy ? p.sendingLink : x.sendLink}
                      </button>
                    </form>
                  </div>
                )}

                {step === "sent" && (
                  <div className="ce-sent">
                    <button type="button" className="ac-link-btn" onClick={() => setStep("choose")}>
                      <ArrowLeft size={14} /> {p.changeEmail}
                    </button>
                    <span className="ce-sent-ic">
                      <MailCheck size={28} />
                    </span>
                    <b>{x.sentTitle}</b>
                    <p>{x.sentSub.replace("{email}", email)}</p>
                    <p className="ce-hint">{p.linkHint}</p>
                    {alert}
                    <ResendButton sentAt={sentAt} onClick={sendLink} disabled={busy} waitText={p.resendLinkIn} readyText={p.resendLink} />
                  </div>
                )}

                {step === "link-email" && (
                  <form className="ce-form" onSubmit={finishTyped}>
                    <p className="ce-sub">{x.typeEmail}</p>
                    <input className="ce-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} autoFocus />
                    {alert}
                    <button type="submit" className="md-btn md-btn-primary" disabled={busy}>
                      {x.confirm}
                    </button>
                  </form>
                )}

                {step === "finishing" && <p className="ce-sub">{x.finishing}</p>}
              </div>
            </div>
          </div>,
          document.querySelector(".app") || document.body, // inside the app: same theme colours
        )}
    </>
  );
}
