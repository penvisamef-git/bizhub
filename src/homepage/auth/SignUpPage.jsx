import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, MailCheck, User } from "lucide-react";
import AuthShell from "./AuthShell";
import PasswordInput from "./PasswordInput";
import { CheckMark, GoogleButton, PhoneInput, ResendButton, usePhoneText, useTakenCheck } from "./phone";
import { useI18n } from "../../i18n/I18nProvider";
import useHomepageData from "../useHomepageData";
import usePageTitle from "../../components/usePageTitle";
import { ROUTES } from "../../config";
import { customerAuthService } from "../../api/services";
import { auth } from "../../lib/auth";
import { completeEmailLink, googleSignIn, preloadFirebase, isEmailLink, normalizePhone, phoneErrorKey, savedLinkEmail, sendEmailLink, SMS_ON } from "../../lib/phoneAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign-up for business owners. The email is confirmed by Google:
//   "Continue with Google" (one tap)  or  a confirm link sent to any email.
// Then: name, phone (optional, not checked), password → POST /api/user/sign-up (logged in, free coins).
export default function SignUpPage() {
  const { t } = useI18n();
  const { p, lang } = usePhoneText();
  const bonus = useHomepageData().vars.bonus; // from Website settings
  usePageTitle(t.signUpBtn);
  const navigate = useNavigate();
  useEffect(() => preloadFirebase(), []); // so the Google window opens straight from the click
  const location = useLocation();
  const [step, setStep] = useState("start"); // start | sent | link-email | finish
  const [email, setEmail] = useState("");
  const [sentAt, setSentAt] = useState(0);
  const [token, setToken] = useState(""); // Firebase token with the confirmed email
  const [confirmed, setConfirmed] = useState(""); // the confirmed email
  const [form, setForm] = useState({ name: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const emailStatus = useTakenCheck("email", email, step === "start");

  const say = (err) => {
    const key = phoneErrorKey(err);
    if (key === "cancelled") return;
    if (key === "smsFailed") console.warn("sign-in error", err);
    setError(err?.code === "NETWORK" ? p.networkError : `${p[key] || err?.message || p.smsFailed}${(key === "smsFailed" || key === "smsNotReady") && err?.code ? ` (${err.code})` : ""}`);
  };
  const toFinish = (tok, mail, name = "") => {
    setToken(tok);
    setConfirmed(mail);
    setForm((f) => ({ ...f, name: f.name || name }));
    setStep("finish");
  };

  // came from the log-in page: Google said there is no account yet
  useEffect(() => {
    const g = location.state?.google;
    if (g?.token) {
      setInfo(p.googleNoAccount.replace("{email}", g.email));
      toFinish(g.token, g.email, g.name);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // opened from the email link
  useEffect(() => {
    let alive = true;
    isEmailLink()
      .then(async (yes) => {
        if (!yes || !alive) return;
        const mail = savedLinkEmail();
        if (!mail) {
          setStep("link-email"); // opened on another device / browser: ask which email
          return;
        }
        setLoading(true);
        try {
          toFinish(await completeEmailLink(mail), mail);
        } catch (err) {
          say(err);
        } finally {
          setLoading(false);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const withGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const g = await googleSignIn();
      // already has an account → just log in
      try {
        const res = await customerAuthService.loginGoogle(g.token);
        auth.setClientLogin(res.data);
        return navigate("/app/dashboard", { replace: true });
      } catch (err) {
        if (err.status !== 404) throw err;
      }
      toFinish(g.token, g.email, g.name);
    } catch (err) {
      say(err);
    } finally {
      setLoading(false);
    }
  };

  const sendLink = async (e) => {
    e?.preventDefault();
    setError("");
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) return setError(p.badEmail);
    setLoading(true);
    try {
      const r = await customerAuthService.check({ email: mail });
      if (r.data.email?.taken) return setError(p.emailTaken);
      await sendEmailLink(mail, ROUTES.signUp, lang);
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
      toFinish(await completeEmailLink(mail), mail);
    } catch (err) {
      say(err);
    } finally {
      setLoading(false);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.password || !form.confirm) return setError(t.fillAll);
    if (form.name.trim().length < 2) return setError(t.nameShort);
    if (form.phone.trim() && !normalizePhone(form.phone)) return setError(p.badPhone);
    if (form.password.length < 8) return setError(t.passwordShort);
    if (form.password !== form.confirm) return setError(t.passwordMismatch);
    setLoading(true);
    try {
      const res = await customerAuthService.signUp({ name: form.name.trim(), phone: form.phone.trim(), password: form.password, firebase_token: token });
      auth.setClientLogin(res.data);
      navigate("/app/dashboard?welcome=1", { replace: true });
    } catch (err) {
      if (err.status === 409) setError(p.emailTaken);
      else if (err.status === 401) {
        setError(p.checkAgain);
        setStep("start");
      } else if (err.status === 429) setError(t.tooManyTries);
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

  return (
    <AuthShell>
      {step === "start" && (
        <>
          <div>
            <h1>{t.signUpTitle}</h1>
            <p className="sub">{t.signUpSub.replace("{bonus}", bonus)}</p>
          </div>
          <div className="auth-form">
            <GoogleButton onClick={withGoogle} disabled={loading} label={p.google} />
            <div className="auth-or">{p.or}</div>
            <form className="auth-form" onSubmit={sendLink} noValidate>
              <label className="field">
                {p.emailLabel}
                <span className="input-wrap">
                  <Mail size={18} className="lead-icon" aria-hidden="true" />
                  <input type="email" autoComplete="email" placeholder={t.emailPh} value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} aria-invalid={emailStatus === "taken"} />
                </span>
                <CheckMark status={emailStatus} okText={p.available} takenText={p.emailTaken}>
                  <Link to={ROUTES.login}>{p.loginInstead}</Link> · <Link to={ROUTES.forgot}>{p.forgotInstead}</Link>
                </CheckMark>
              </label>
              {alert}
              <button type="submit" className="btn btn-primary btn-block" disabled={loading || emailStatus === "taken"}>
                {loading && <span className="spinner" aria-hidden="true" />}
                {loading ? p.sendingLink : p.sendLink}
              </button>
            </form>
            <p className="auth-note">
              {t.agreePre}{" "}
              <Link to={ROUTES.terms} target="_blank" rel="noreferrer">
                {t.agreeLink}
              </Link>
              {t.agreePost}
            </p>
            {SMS_ON && (
              <p className="auth-alt">
                <Link to={`${ROUTES.signUp}/phone`}>{p.usePhone}</Link>
              </p>
            )}
          </div>
          <p className="auth-switch">
            {t.haveAccount} <Link to={ROUTES.login}>{t.loginBtn}</Link>
          </p>
        </>
      )}

      {step === "sent" && (
        <>
          <button type="button" className="link-btn back" onClick={() => setStep("start")}>
            <ArrowLeft size={16} /> {p.changeEmail}
          </button>
          <div className="mail-sent">
            <span className="mail-ic">
              <MailCheck size={30} />
            </span>
            <h1>{p.linkTitle}</h1>
            <p>{p.linkSub.replace("{email}", email)}</p>
            <p>{p.linkHint}</p>
            {alert}
            <ResendButton sentAt={sentAt} onClick={sendLink} disabled={loading} waitText={p.resendLinkIn} readyText={p.resendLink} />
          </div>
        </>
      )}

      {step === "link-email" && (
        <>
          <div>
            <h1>{p.linkTitle}</h1>
            <p className="sub">{p.typeEmailAgain}</p>
          </div>
          <form className="auth-form" onSubmit={finishLink} noValidate>
            <label className="field">
              {p.emailLabel}
              <span className="input-wrap">
                <Mail size={18} className="lead-icon" aria-hidden="true" />
                <input type="email" autoComplete="email" placeholder={t.emailPh} value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} autoFocus />
              </span>
            </label>
            {alert}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading && <span className="spinner" aria-hidden="true" />}
              {p.confirm}
            </button>
          </form>
        </>
      )}

      {step === "finish" && (
        <>
          <div>
            <h1>{p.finishTitle}</h1>
            <p className="sub">{info || p.finishSub}</p>
          </div>
          <form className="auth-form" onSubmit={create} noValidate>
            <div className="confirmed-chip">
              <CheckCircle2 size={18} /> {confirmed}
              <small>{p.confirmed}</small>
            </div>
            <label className="field">
              {t.fullName}
              <span className="input-wrap">
                <User size={18} className="lead-icon" aria-hidden="true" />
                <input type="text" autoComplete="name" placeholder={t.fullNamePh} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={loading} />
              </span>
            </label>
            <div className="field">
              <label htmlFor="su-phone">
                {p.phoneOptional} <span className="hint">· {p.emailOptional}</span>
              </label>
              <PhoneInput id="su-phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} disabled={loading} />
            </div>
            <label className="field">
              <span>
                {t.password} <span className="hint">· {t.passwordMin}</span>
              </span>
              <PasswordInput autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} disabled={loading} />
            </label>
            <label className="field">
              {t.confirmPassword}
              <PasswordInput autoComplete="new-password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} disabled={loading} />
            </label>
            {alert}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading && <span className="spinner" aria-hidden="true" />}
              {loading ? p.creating : p.createAccount}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
