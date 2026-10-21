import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AuthShell from "./AuthShell";
import PasswordInput from "./PasswordInput";
import { CodeInput, PhoneInput, prettyPhone, usePhoneText } from "./phone";
import { useI18n } from "../../i18n/I18nProvider";
import usePageTitle from "../../components/usePageTitle";
import { ROUTES } from "../../config";
import { customerAuthService } from "../../api/services";
import { auth } from "../../lib/auth";
import { normalizePhone, phoneErrorKey, sendCode } from "../../lib/phoneAuth";

// Forgot password by SMS (only when VITE_SMS_SIGNUP=1): phone of the account → SMS code → new password → logged in
export default function PhoneForgotPage() {
  const { t } = useI18n();
  const { p, lang } = usePhoneText();
  usePageTitle(p.forgotTitle);
  const navigate = useNavigate();
  const [step, setStep] = useState("phone"); // phone | code
  const [input, setInput] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(null);
  const [sentAt, setSentAt] = useState(0);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const say = (err) => {
    const key = phoneErrorKey(err);
    if (key === "smsFailed") console.warn("SMS error", err); // full details for the developer
    setError(err?.code === "NETWORK" ? p.networkError : `${p[key] || err?.message || p.smsFailed}${(key === "smsFailed" || key === "smsNotReady") && err?.code ? ` (${err.code})` : ""}`);
  };

  const send = async (e) => {
    e?.preventDefault();
    setError("");
    const e164 = normalizePhone(input);
    if (!e164) return setError(p.badPhone);
    setLoading(true);
    try {
      const r = await customerAuthService.check({ phone: e164 });
      if (!r.data.phone?.taken) return setError(p.noAccountPhone); // no SMS for a number without an account
      setSent(await sendCode(e164, "recaptcha-box", lang));
      setPhone(e164);
      setSentAt(Date.now());
      setCode("");
      setStep("code");
    } catch (err) {
      say(err);
    } finally {
      setLoading(false);
    }
  };

  const save = async (e) => {
    e?.preventDefault();
    setError("");
    if (code.length !== 6) return setError(p.codeWrong);
    if (pw.password.length < 8) return setError(t.passwordShort);
    if (pw.password !== pw.confirm) return setError(t.passwordMismatch);
    setLoading(true);
    try {
      const firebase_token = await sent.confirm(code);
      const res = await customerAuthService.resetPassword({ firebase_token, new_password: pw.password });
      auth.setClientLogin(res.data);
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      if (err.status === 404) setError(p.noAccountPhone);
      else if (err.status === 401) setError(p.codeExpired);
      else if (err.status === 403 || err.status === 400) setError(err.message);
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
      <div>
        {step === "code" ? (
          <button type="button" className="link-btn back" onClick={() => setStep("phone")} disabled={loading}>
            <ArrowLeft size={16} /> {p.changeNumber}
          </button>
        ) : (
          <Link to={ROUTES.login} className="link-btn back">
            <ArrowLeft size={16} /> {p.backToLogin}
          </Link>
        )}
        <h1>{p.forgotTitle}</h1>
        <p className="sub">{step === "code" ? p.codeSent.replace("{phone}", prettyPhone(phone)) : p.forgotSub}</p>
      </div>
      {step === "phone" ? (
        <form className="auth-form" onSubmit={send} noValidate>
          <div className="field">
            <label htmlFor="fp-phone">{p.phone}</label>
            <PhoneInput id="fp-phone" value={input} onChange={setInput} disabled={loading} autoFocus />
          </div>
          {error && (
            <div className="form-alert error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading || !input.trim()}>
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading ? p.sending : p.sendCode}
          </button>
          <p className="auth-alt">
            <Link to={ROUTES.forgot}>{p.useEmail}</Link>
          </p>
        </form>
      ) : (
        <form className="auth-form" onSubmit={save} noValidate>
          <CodeInput value={code} onChange={setCode} disabled={loading} onResend={resend} sentAt={sentAt} resending={loading} />
          <label className="field">
            <span>
              {p.newPassword} <span className="hint">· {t.passwordMin}</span>
            </span>
            <PasswordInput autoComplete="new-password" value={pw.password} onChange={(e) => setPw((x) => ({ ...x, password: e.target.value }))} disabled={loading} />
          </label>
          <label className="field">
            {t.confirmPassword}
            <PasswordInput autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((x) => ({ ...x, confirm: e.target.value }))} disabled={loading} />
          </label>
          {error && (
            <div className="form-alert error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading || code.length !== 6}>
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading ? p.saving : p.resetBtn}
          </button>
        </form>
      )}
      <div id="recaptcha-box" />
    </AuthShell>
  );
}
