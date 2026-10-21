import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { UserRound } from "lucide-react";
import AuthShell from "./AuthShell";
import PasswordInput from "./PasswordInput";
import { GoogleButton, usePhoneText } from "./phone";
import { googleSignIn, preloadFirebase, normalizePhone, phoneErrorKey, SMS_ON } from "../../lib/phoneAuth";
import { useI18n } from "../../i18n/I18nProvider";
import usePageTitle from "../../components/usePageTitle";
import { authService, customerAuthService } from "../../api/services";
import { auth } from "../../lib/auth";
import { ROUTES } from "../../config";
import { homeFor } from "../../lib/permission";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// only allow redirects inside the app (no external URLs); the route guards
// send anyone who can't open that page to their own first screen
function safeNext(next, user) {
  return next && next.startsWith("/app/") && !next.startsWith("//") ? next : homeFor(user);
}

// One login form for everyone: BizHub team first (email only), then customers (phone or email)
async function loginAny(email, password) {
  if (!email.includes("@")) return (await customerAuthService.login(email, password)).data;
  try {
    const res = await authService.login(email, password);
    return { ...res.data, account_type: "team" };
  } catch (err) {
    if (err.status !== 401 && err.status !== 400) throw err;
    const res = await customerAuthService.login(email, password);
    return res.data;
  }
}

export default function LoginPage() {
  const { t } = useI18n();
  const { p } = usePhoneText();
  usePageTitle(t.loginBtn);
  const navigate = useNavigate();
  useEffect(() => preloadFirebase(), []); // so the Google window opens straight from the click
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [bad, setBad] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const fail = (message, fields) => {
    setError(message);
    setBad(fields);
    (fields.email ? emailRef : passwordRef).current?.focus();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return fail(t.fillAll, { email: !email, password: !password });
    const id = email.trim();
    if (!SMS_ON && !id.includes("@")) return fail(t.badEmail, { email: true, password: false });
    if (id.includes("@") ? !EMAIL_RE.test(id) : !normalizePhone(id)) return fail(id.includes("@") ? t.badEmail : p.badPhone, { email: true, password: false });

    setLoading(true);
    try {
      const user = await loginAny(email.trim(), password);
      auth.setClientLogin(user);
      // team: first login / password reset by admin → change password first
      navigate(user.is_first_login ? `${ROUTES.account}?first=1` : safeNext(params.get("next"), user), { replace: true });
    } catch (err) {
      const message =
        err.code === "NETWORK" ? t.networkError : err.status === 400 || err.status === 401 ? t.badLogin : err.status === 429 ? t.tooManyTries : err.message || t.badLogin;
      fail(message, { email: true, password: true });
    } finally {
      setLoading(false);
    }
  };

  // Google button: account with that email → in; none yet → finish signing up
  const withGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      const g = await googleSignIn();
      try {
        const res = await customerAuthService.loginGoogle(g.token);
        auth.setClientLogin(res.data);
        navigate(safeNext(params.get("next"), res.data), { replace: true });
      } catch (err) {
        if (err.status === 404) return navigate(ROUTES.signUp, { state: { google: g } });
        throw err;
      }
    } catch (err) {
      const key = phoneErrorKey(err);
      if (key !== "cancelled") setError(err.status === 403 ? err.message : `${p[key] || err.message}${(key === "smsFailed" || key === "smsNotReady") && err?.code ? ` (${err.code})` : ""}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div>
        <h1>{t.loginTitle}</h1>
        <p className="sub">{t.loginSub}</p>
      </div>
      <GoogleButton onClick={withGoogle} disabled={loading} label={p.google} />
      <div className="auth-or">{p.or}</div>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <label className="field">
          {SMS_ON ? p.loginId : p.emailLabel}
          <span className="input-wrap">
            <UserRound size={18} className="lead-icon" aria-hidden="true" />
            <input
              ref={emailRef}
              id="login-id"
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder={SMS_ON ? p.loginIdPh : t.emailPh}
              value={email}
              aria-invalid={bad.email}
              disabled={loading}
              onChange={(e) => {
                setEmail(e.target.value);
                setBad((b) => ({ ...b, email: false }));
              }}
            />
          </span>
        </label>
        <label className="field">
          <span className="field-row">
            {t.password}
            <Link to={ROUTES.forgot} className="field-link">
              {p.forgot}
            </Link>
          </span>
          <PasswordInput
            ref={passwordRef}
            autoComplete="current-password"
            placeholder={t.passwordPh}
            value={password}
            aria-invalid={bad.password}
            disabled={loading}
            onChange={(e) => {
              setPassword(e.target.value);
              setBad((b) => ({ ...b, password: false }));
            }}
          />
        </label>
        {error && (
          <div className="form-alert error" role="alert">
            {error}
          </div>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? t.loggingIn : t.loginBtn}
        </button>
      </form>
      <p className="auth-switch">
        {t.noAccount} <Link to={ROUTES.signUp}>{t.signUpBtn}</Link>
      </p>
    </AuthShell>
  );
}
