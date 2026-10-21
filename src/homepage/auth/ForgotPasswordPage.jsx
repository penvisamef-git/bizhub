import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import AuthShell from "./AuthShell";
import PasswordInput from "./PasswordInput";
import { ResendButton, usePhoneText } from "./phone";
import { useI18n } from "../../i18n/I18nProvider";
import usePageTitle from "../../components/usePageTitle";
import { ROUTES } from "../../config";
import { customerAuthService } from "../../api/services";
import { auth } from "../../lib/auth";
import { completeEmailLink, isEmailLink, phoneErrorKey, savedLinkEmail, sendEmailLink, SMS_ON } from "../../lib/phoneAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Forgot password: email of the account → link by email (Google Firebase) → new password → logged in
export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const { p, lang } = usePhoneText();
  usePageTitle(p.forgotTitle);
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // email | sent | link-email | password
  const [email, setEmail] = useState("");
  const [sentAt, setSentAt] = useState(0);
  const [token, setToken] = useState("");
  const [pw, setPw] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const say = (err) => {
    const key = phoneErrorKey(err);
    if (key === "cancelled") return;
    if (key === "smsFailed") console.warn("reset error", err);
    setError(err?.code === "NETWORK" ? p.networkError : `${p[key] || err?.message || p.smsFailed}${(key === "smsFailed" || key === "smsNotReady") && err?.code ? ` (${err.code})` : ""}`);
  };

  // opened from the email link
  useEffect(() => {
    isEmailLink()
      .then(async (yes) => {
        if (!yes) return;
        const mail = savedLinkEmail();
        if (!mail) return setStep("link-email");
        setLoading(true);
        try {
          setToken(await completeEmailLink(mail));
          setEmail(mail);
          setStep("password");
        } catch (err) {
          say(err);
        } finally {
          setLoading(false);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (e) => {
    e?.preventDefault();
    setError("");
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) return setError(p.badEmail);
    setLoading(true);
    try {
      const r = await customerAuthService.check({ email: mail });
      if (!r.data.email?.taken) return setError(p.noAccountEmail); // no email for an address without an account
      await sendEmailLink(mail, ROUTES.forgot, lang);
      setEmail(mail);
      setSentAt(Date.now());
      setStep("sent");
    } catch (err) {
      say(err);
    } finally {
      setLoading(false);
    }
  };

  const finishLink = async (e) => {
    e?.preventDefault();
    setError("");
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) return setError(p.badEmail);
    setLoading(true);
    try {
      setToken(await completeEmailLink(mail));
      setEmail(mail);
      setStep("password");
    } catch (err) {
      say(err);
    } finally {
      setLoading(false);
    }
  };

  const save = async (e) => {
    e?.preventDefault();
    setError("");
    if (pw.password.length < 8) return setError(t.passwordShort);
    if (pw.password !== pw.confirm) return setError(t.passwordMismatch);
    setLoading(true);
    try {
      const res = await customerAuthService.resetPassword({ firebase_token: token, new_password: pw.password });
      auth.setClientLogin(res.data);
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      if (err.status === 404) setError(p.noAccountEmail);
      else if (err.status === 401) {
        setError(p.checkAgain);
        setStep("email");
      } else if (err.status === 403 || err.status === 400) setError(err.message);
      else say(err);
    } finally {
      setLoading(false);
    }
  };

  const alert = error && (
    <div className="form-alert error" role="alert">
      {error}
    </div>
  );
  const emailField = (autoFocus) => (
    <label className="field">
      {p.emailLabel}
      <span className="input-wrap">
        <Mail size={18} className="lead-icon" aria-hidden="true" />
        <input type="email" autoComplete="email" placeholder={t.emailPh} value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} autoFocus={autoFocus} />
      </span>
    </label>
  );

  return (
    <AuthShell>
      {step === "email" && (
        <>
          <div>
            <Link to={ROUTES.login} className="link-btn back">
              <ArrowLeft size={16} /> {p.backToLogin}
            </Link>
            <h1>{p.forgotTitle}</h1>
            <p className="sub">{p.forgotEmailSub}</p>
          </div>
          <form className="auth-form" onSubmit={send} noValidate>
            {emailField(true)}
            {alert}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading || !email.trim()}>
              {loading && <span className="spinner" aria-hidden="true" />}
              {loading ? p.sendingLink : p.sendLink}
            </button>
            <p className="auth-steps-note">{p.oldEmailHint}</p>
            {SMS_ON && (
              <p className="auth-alt">
                <Link to={`${ROUTES.forgot}/phone`}>{p.usePhone}</Link>
              </p>
            )}
          </form>
        </>
      )}

      {step === "sent" && (
        <>
          <button type="button" className="link-btn back" onClick={() => setStep("email")}>
            <ArrowLeft size={16} /> {p.changeEmail}
          </button>
          <div className="mail-sent">
            <span className="mail-ic">
              <MailCheck size={30} />
            </span>
            <h1>{p.linkTitle}</h1>
            <p>{p.resetLinkSub.replace("{email}", email)}</p>
            <p>{p.linkHint}</p>
            {alert}
            <ResendButton sentAt={sentAt} onClick={send} disabled={loading} waitText={p.resendLinkIn} readyText={p.resendLink} />
          </div>
        </>
      )}

      {step === "link-email" && (
        <>
          <div>
            <h1>{p.forgotTitle}</h1>
            <p className="sub">{p.typeEmailAgain}</p>
          </div>
          <form className="auth-form" onSubmit={finishLink} noValidate>
            {emailField(true)}
            {alert}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {p.confirm}
            </button>
          </form>
        </>
      )}

      {step === "password" && (
        <>
          <div>
            <h1>{p.newPasswordTitle}</h1>
            <p className="sub">{p.newPasswordSub.replace("{email}", email)}</p>
          </div>
          <form className="auth-form" onSubmit={save} noValidate>
            <label className="field">
              <span>
                {p.newPassword} <span className="hint">· {t.passwordMin}</span>
              </span>
              <PasswordInput autoComplete="new-password" value={pw.password} onChange={(e) => setPw((x) => ({ ...x, password: e.target.value }))} disabled={loading} autoFocus />
            </label>
            <label className="field">
              {t.confirmPassword}
              <PasswordInput autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((x) => ({ ...x, confirm: e.target.value }))} disabled={loading} />
            </label>
            {alert}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading && <span className="spinner" aria-hidden="true" />}
              {loading ? p.saving : p.resetBtn}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
