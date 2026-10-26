import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, User } from "lucide-react";
import AuthShell from "./AuthShell";
import PasswordInput from "./PasswordInput";
import { CheckMark, CodeInput, PhoneInput, prettyPhone, usePhoneText, useTakenCheck } from "./phone";
import { useI18n } from "../../i18n/I18nProvider";
import useHomepageData from "../useHomepageData";
import usePageTitle from "../../components/usePageTitle";
import { ROUTES } from "../../config";
import { customerAuthService } from "../../api/services";
import { auth } from "../../lib/auth";
import { normalizePhone, phoneErrorKey, sendCode } from "../../lib/phoneAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign-up by phone (SMS code) — only when VITE_SMS_SIGNUP=1 (needs Firebase billing). Name, phone (checked by an SMS code from Google Firebase),
// email (optional, only checked that it's not used), password → POST /api/user/sign-up
export default function PhoneSignUpPage() {
  const { t } = useI18n();
  const { p, lang } = usePhoneText();
  const bonus = useHomepageData().vars.bonus; // from Website settings
  usePageTitle(t.signUpBtn);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [step, setStep] = useState("form"); // form | code
  const [phone, setPhone] = useState(""); // +855… the code was sent to
  const [sent, setSent] = useState(null); // { confirm(code) } from Firebase
  const [sentAt, setSentAt] = useState(0);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const phoneStatus = useTakenCheck("phone", form.phone, step === "form");
  const emailStatus = useTakenCheck("email", form.email, step === "form");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const say = (err) => {
    const key = phoneErrorKey(err);
    if (key === "smsFailed") console.warn("SMS error", err); // full details for the developer
    setError(err?.code === "NETWORK" ? p.networkError : `${p[key] || err?.message || p.smsFailed}${(key === "smsFailed" || key === "smsNotReady") && err?.code ? ` (${err.code})` : ""}`);
  };

  // 1. check the form, make sure phone / email are free, send the SMS
  const send = async (e) => {
    e?.preventDefault();
    setError("");
    const e164 = normalizePhone(form.phone);
    if (!form.name.trim() || !form.phone.trim() || !form.password || !form.confirm) return setError(t.fillAll);
    if (form.name.trim().length < 2) return setError(t.nameShort);
    if (!e164) return setError(p.badPhone);
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) return setError(t.badEmail);
    if (form.password.length < 8) return setError(t.passwordShort);
    if (form.password !== form.confirm) return setError(t.passwordMismatch);
    setLoading(true);
    try {
      const r = await customerAuthService.check({ phone: e164, ...(form.email.trim() ? { email: form.email.trim() } : {}) });
      if (r.data.phone?.taken) return setError(p.phoneTaken);
      if (r.data.email?.taken) return setError(p.emailTaken);
      const s = await sendCode(e164, "recaptcha-box", lang);
      setPhone(e164);
      setSent(s);
      setSentAt(Date.now());
      setCode("");
      setStep("code");
    } catch (err) {
      say(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. the code → Firebase token → create the account
  const verify = async (e) => {
    e?.preventDefault();
    if (code.length !== 6 || !sent) return;
    setError("");
    setLoading(true);
    try {
      const firebase_token = await sent.confirm(code);
      const res = await customerAuthService.signUp({ name: form.name.trim(), email: form.email.trim(), password: form.password, firebase_token });
      auth.setClientLogin(res.data);
      navigate("/app/dashboard?welcome=1", { replace: true });
    } catch (err) {
      if (err.status === 409) {
        setStep("form");
        setError(err.response?.code === "email_taken" ? p.emailTaken : p.phoneTaken);
      } else if (err.status === 401) setError(p.codeExpired);
      else if (err.status === 429) setError(t.tooManyTries);
      else say(err);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError("");
    setLoading(true);
    try {
      setSent(await sendCode(phone, "recaptcha-box", lang));
      setSentAt(Date.now());
      setCode("");
    } catch (err) {
      say(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {step === "form" ? (
        <>
          <div>
            <h1>{t.signUpTitle}</h1>
            <p className="sub">{t.signUpSub.replace("{bonus}", bonus)}</p>
          </div>
          <form className="auth-form" onSubmit={send} noValidate>
            <label className="field">
              {t.fullName}
              <span className="input-wrap">
                <User size={18} className="lead-icon" aria-hidden="true" />
                <input type="text" autoComplete="name" placeholder={t.fullNamePh} value={form.name} onChange={set("name")} disabled={loading} />
              </span>
            </label>
            <div className="field">
              <label htmlFor="su-phone">
                {p.phone} <span className="hint">· {p.phoneHint}</span>
              </label>
              <PhoneInput id="su-phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} disabled={loading} invalid={phoneStatus === "taken"} />
              <CheckMark status={phoneStatus} okText={p.available} takenText={p.phoneTaken}>
                <Link to={ROUTES.login}>{p.loginInstead}</Link> · <Link to={ROUTES.forgot}>{p.forgotInstead}</Link>
              </CheckMark>
            </div>
            <label className="field">
              <span>
                {t.email} <span className="hint">· {p.emailOptional}</span>
              </span>
              <span className="input-wrap">
                <Mail size={18} className="lead-icon" aria-hidden="true" />
                <input type="email" autoComplete="email" placeholder={t.emailPh} value={form.email} onChange={set("email")} disabled={loading} aria-invalid={emailStatus === "taken"} />
              </span>
              <CheckMark status={emailStatus} okText={p.available} takenText={p.emailTaken} />
            </label>
            <label className="field">
              <span>
                {t.password} <span className="hint">· {t.passwordMin}</span>
              </span>
              <PasswordInput autoComplete="new-password" value={form.password} onChange={set("password")} disabled={loading} />
            </label>
            <label className="field">
              {t.confirmPassword}
              <PasswordInput autoComplete="new-password" value={form.confirm} onChange={set("confirm")} disabled={loading} />
            </label>
            {error && (
              <div className="form-alert error" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading || phoneStatus === "taken" || emailStatus === "taken"}>
              {loading && <span className="spinner" aria-hidden="true" />}
              {loading ? p.sending : p.sendCode}
            </button>
            <p className="auth-note">
              {t.agreePre}{" "}
              <Link to={ROUTES.terms} target="_blank" rel="noreferrer">
                {t.agreeLink}
              </Link>{" "}
              {t.agreeAnd}{" "}
              <Link to={ROUTES.privacy} target="_blank" rel="noreferrer">
                {t.privacy}
              </Link>
              {t.agreePost}
            </p>
            <p className="auth-alt">
              <Link to={ROUTES.signUp}>{p.useEmail}</Link>
            </p>
          </form>
          <p className="auth-switch">
            {t.haveAccount} <Link to={ROUTES.login}>{t.loginBtn}</Link>
          </p>
        </>
      ) : (
        <>
          <div>
            <button type="button" className="link-btn back" onClick={() => setStep("form")} disabled={loading}>
              <ArrowLeft size={16} /> {p.changeNumber}
            </button>
            <h1>{p.codeTitle}</h1>
            <p className="sub">{p.codeSent.replace("{phone}", prettyPhone(phone))}</p>
          </div>
          <form className="auth-form" onSubmit={verify} noValidate>
            <CodeInput value={code} onChange={setCode} disabled={loading} onResend={resend} sentAt={sentAt} resending={loading} />
            {error && (
              <div className="form-alert error" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading || code.length !== 6}>
              {loading && <span className="spinner" aria-hidden="true" />}
              {loading ? p.verifying : p.verifyCreate}
            </button>
          </form>
        </>
      )}
      {/* Google's invisible "not a robot" check for the SMS */}
      <div id="recaptcha-box" />
    </AuthShell>
  );
}
