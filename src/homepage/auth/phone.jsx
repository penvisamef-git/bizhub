// Shared bits of the phone sign-up / forgot-password pages: texts, phone input, SMS code step.
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Phone, XCircle } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import { customerAuthService } from "../../api/services";
import { normalizePhone } from "../../lib/phoneAuth";

const TEXT = {
  en: {
    // email / Google
    google: "Continue with Google",
    or: "or",
    emailLabel: "Email",
    sendLink: "Send confirm link",
    sendingLink: "Sending…",
    linkTitle: "Check your email",
    linkSub: "We sent a link to {email}. Open it on this device to confirm your email.",
    linkHint: "Can't find it? Look in Spam or Promotions.",
    resendLinkIn: "Send again in {s}s",
    resendLink: "Send the link again",
    changeEmail: "Change email",
    typeEmailAgain: "Type the email you used, to finish confirming it.",
    confirm: "Confirm",
    confirmed: "Confirmed",
    finishTitle: "Almost done",
    finishSub: "Your email is confirmed. Add your name and a password.",
    phoneOptional: "Phone number",
    createAccount: "Create account",
    creating: "Creating account…",
    checkAgain: "Please confirm your email again (it took too long).",
    popupBlocked: "The Google window was blocked. Allow pop-ups for this site and try again.",
    linkUsed: "This link was already used or has expired. Send a new one.",
    badEmail: "Please enter a valid email.",
    cancelled: "",
    noAccountEmail: "No account uses this email.",
    googleNoAccount: "No account for {email} yet — finish signing up below.",
    usePhone: "Sign up with phone (SMS) instead",
    useEmail: "Sign up with email instead",
    forgotEmailSub: "Type the email of your account. We'll send a link to set a new password.",
    resetLinkSub: "We sent a link to {email}. Open it on this device to set a new password.",
    newPasswordTitle: "Set a new password",
    newPasswordSub: "Your email {email} is confirmed.",
    oldEmailHint: "No email on your account? Ask BizHub to reset your password.",
    phone: "Phone number",
    phoneHint: "We send a code by SMS to check it",
    emailOptional: "optional",
    available: "Available",
    phoneTaken: "This number already has an account.",
    emailTaken: "This email already has an account.",
    loginInstead: "Log in",
    forgotInstead: "Forgot password?",
    sendCode: "Send SMS code",
    sending: "Sending code…",
    codeTitle: "Enter the code",
    codeSent: "We sent a 6-digit code to {phone}.",
    code: "SMS code",
    verifyCreate: "Verify & create account",
    verifying: "Checking…",
    resendIn: "Send again in {s}s",
    resend: "Send the code again",
    changeNumber: "Change number",
    codeWrong: "That code is not right. Check the SMS and try again.",
    codeExpired: "The code has expired. Send a new one.",
    smsTooMany: "Too many codes were sent. Please wait a while and try again.",
    smsNotReady: "This sign-in method isn't set up yet. Please contact BizHub.",
    fbEnvMissing: "Sign-in isn't set up on this website yet (Firebase settings missing). Please contact BizHub.",
    smsDomain: "SMS can't be sent from this website address yet (Firebase authorized domains).",
    authDomain: "Sign-in isn't allowed on this website address yet. Please try again later or contact BizHub.",
    smsFailed: "The SMS could not be sent. Please try again.",
    smsSdkMissing: "The sign-in tool didn't load. Developer: run npm install in the bizhub folder, then restart.",
    badPhone: "Please enter a valid phone number.",
    networkError: "Can't reach the server. Check your internet.",
    // login
    loginId: "Phone or email",
    loginIdPh: "012 345 678 or you@example.com",
    forgot: "Forgot password?",
    // forgot password
    forgotTitle: "Reset your password",
    forgotSub: "Type the phone number of your account. We'll send an SMS code.",
    noAccountPhone: "No account uses this number.",
    newPassword: "New password",
    resetBtn: "Save new password",
    saving: "Saving…",
    backToLogin: "Back to log in",
    oldAccounts: "Signed up with email only? Ask BizHub to reset your password.",
  },
  km: {
    google: "បន្តជាមួយ Google",
    or: "ឬ",
    emailLabel: "អ៊ីមែល",
    sendLink: "ផ្ញើតំណបញ្ជាក់",
    sendingLink: "កំពុងផ្ញើ…",
    linkTitle: "ពិនិត្យអ៊ីមែលរបស់អ្នក",
    linkSub: "យើងបានផ្ញើតំណទៅ {email}។ សូមបើកវានៅលើឧបករណ៍នេះ ដើម្បីបញ្ជាក់អ៊ីមែល។",
    linkHint: "រកមិនឃើញ? សូមមើលក្នុង Spam ឬ Promotions។",
    resendLinkIn: "ផ្ញើម្តងទៀតក្នុង {s} វិនាទី",
    resendLink: "ផ្ញើតំណម្តងទៀត",
    changeEmail: "ប្តូរអ៊ីមែល",
    typeEmailAgain: "វាយអ៊ីមែលដែលអ្នកបានប្រើ ដើម្បីបញ្ចប់ការបញ្ជាក់។",
    confirm: "បញ្ជាក់",
    confirmed: "បានបញ្ជាក់",
    finishTitle: "ជិតរួចហើយ",
    finishSub: "អ៊ីមែលរបស់អ្នកត្រូវបានបញ្ជាក់។ បញ្ចូលឈ្មោះ និងពាក្យសម្ងាត់។",
    phoneOptional: "លេខទូរស័ព្ទ",
    createAccount: "បង្កើតគណនី",
    creating: "កំពុងបង្កើតគណនី…",
    checkAgain: "សូមបញ្ជាក់អ៊ីមែលម្តងទៀត (យូរពេក)។",
    popupBlocked: "ផ្ទាំង Google ត្រូវបានរារាំង។ សូមអនុញ្ញាត pop-up សម្រាប់គេហទំព័រនេះ ហើយព្យាយាមម្តងទៀត។",
    linkUsed: "តំណនេះបានប្រើរួច ឬផុតកំណត់ហើយ។ សូមផ្ញើតំណថ្មី។",
    badEmail: "អ៊ីមែលមិនត្រឹមត្រូវ។",
    cancelled: "",
    noAccountEmail: "គ្មានគណនីប្រើអ៊ីមែលនេះទេ។",
    googleNoAccount: "មិនទាន់មានគណនីសម្រាប់ {email} — សូមបញ្ចប់ការចុះឈ្មោះខាងក្រោម។",
    usePhone: "ចុះឈ្មោះដោយលេខទូរស័ព្ទ (SMS) ជំនួសវិញ",
    useEmail: "ចុះឈ្មោះដោយអ៊ីមែលជំនួសវិញ",
    forgotEmailSub: "វាយអ៊ីមែលនៃគណនីរបស់អ្នក។ យើងនឹងផ្ញើតំណដើម្បីកំណត់ពាក្យសម្ងាត់ថ្មី។",
    resetLinkSub: "យើងបានផ្ញើតំណទៅ {email}។ សូមបើកវានៅលើឧបករណ៍នេះ ដើម្បីកំណត់ពាក្យសម្ងាត់ថ្មី។",
    newPasswordTitle: "កំណត់ពាក្យសម្ងាត់ថ្មី",
    newPasswordSub: "អ៊ីមែល {email} ត្រូវបានបញ្ជាក់។",
    oldEmailHint: "គណនីគ្មានអ៊ីមែល? សូមស្នើ BizHub ឲ្យកំណត់ពាក្យសម្ងាត់ឡើងវិញ។",
    phone: "លេខទូរស័ព្ទ",
    phoneHint: "យើងផ្ញើលេខកូដតាម SMS ដើម្បីផ្ទៀងផ្ទាត់",
    emailOptional: "មិនចាំបាច់",
    available: "អាចប្រើបាន",
    phoneTaken: "លេខនេះមានគណនីរួចហើយ។",
    emailTaken: "អ៊ីមែលនេះមានគណនីរួចហើយ។",
    loginInstead: "ចូលគណនី",
    forgotInstead: "ភ្លេចពាក្យសម្ងាត់?",
    sendCode: "ផ្ញើលេខកូដ SMS",
    sending: "កំពុងផ្ញើលេខកូដ…",
    codeTitle: "បញ្ចូលលេខកូដ",
    codeSent: "យើងបានផ្ញើលេខកូដ 6 ខ្ទង់ទៅ {phone}។",
    code: "លេខកូដ SMS",
    verifyCreate: "ផ្ទៀងផ្ទាត់ និងបង្កើតគណនី",
    verifying: "កំពុងពិនិត្យ…",
    resendIn: "ផ្ញើម្តងទៀតក្នុង {s} វិនាទី",
    resend: "ផ្ញើលេខកូដម្តងទៀត",
    changeNumber: "ប្តូរលេខ",
    codeWrong: "លេខកូដមិនត្រឹមត្រូវ។ សូមពិនិត្យ SMS ហើយព្យាយាមម្តងទៀត។",
    codeExpired: "លេខកូដផុតកំណត់ហើយ។ សូមផ្ញើលេខកូដថ្មី។",
    smsTooMany: "បានផ្ញើលេខកូដច្រើនពេក។ សូមរង់ចាំបន្តិចហើយព្យាយាមម្តងទៀត។",
    smsNotReady: "វិធីចូលនេះមិនទាន់បានរៀបចំទេ។ សូមទាក់ទង BizHub។",
    fbEnvMissing: "ការចូលគណនីមិនទាន់បានរៀបចំលើគេហទំព័រនេះទេ (ខ្វះការកំណត់ Firebase)។ សូមទាក់ទង BizHub។",
    smsDomain: "មិនទាន់អាចផ្ញើ SMS ពីអាសយដ្ឋានគេហទំព័រនេះបានទេ (Firebase authorized domains)។",
    authDomain: "មិនទាន់អាចចូលគណនីពីអាសយដ្ឋានគេហទំព័រនេះបានទេ។ សូមព្យាយាមម្តងទៀតពេលក្រោយ ឬទាក់ទង BizHub។",
    smsFailed: "មិនអាចផ្ញើ SMS បានទេ។ សូមព្យាយាមម្តងទៀត។",
    smsSdkMissing: "ឧបករណ៍ចូលគណនីមិនបានផ្ទុកទេ។ អ្នកអភិវឌ្ឍ៖ ដំណើរការ npm install ក្នុង folder bizhub រួចចាប់ផ្តើមឡើងវិញ។",
    badPhone: "លេខទូរស័ព្ទមិនត្រឹមត្រូវ។",
    networkError: "មិនអាចភ្ជាប់ម៉ាស៊ីនមេបានទេ។ សូមពិនិត្យអ៊ីនធឺណិត។",
    loginId: "លេខទូរស័ព្ទ ឬអ៊ីមែល",
    loginIdPh: "012 345 678 ឬ you@example.com",
    forgot: "ភ្លេចពាក្យសម្ងាត់?",
    forgotTitle: "កំណត់ពាក្យសម្ងាត់ថ្មី",
    forgotSub: "វាយលេខទូរស័ព្ទនៃគណនីរបស់អ្នក។ យើងនឹងផ្ញើលេខកូដ SMS។",
    noAccountPhone: "គ្មានគណនីប្រើលេខនេះទេ។",
    newPassword: "ពាក្យសម្ងាត់ថ្មី",
    resetBtn: "រក្សាទុកពាក្យសម្ងាត់ថ្មី",
    saving: "កំពុងរក្សាទុក…",
    backToLogin: "ត្រឡប់ទៅចូលគណនី",
    oldAccounts: "ចុះឈ្មោះដោយអ៊ីមែលតែប៉ុណ្ណោះ? សូមស្នើ BizHub ឲ្យកំណត់ពាក្យសម្ងាត់ឡើងវិញ។",
  },
};
export function usePhoneText() {
  const { lang } = useI18n();
  return { p: TEXT[lang] || TEXT.en, lang };
}

// "+85512345678" → "+855 12 345 678" (for showing)
export const prettyPhone = (e164) => {
  const m = String(e164 || "").match(/^\+855(\d{2})(\d{3})(\d{3,4})$/);
  return m ? `+855 ${m[1]} ${m[2]} ${m[3]}` : e164;
};

// Ask the API whether a phone / email is free while the person types (after a short pause).
// → status: "" | "checking" | "ok" | "taken" | "invalid"
export function useTakenCheck(kind, value, enabled = true) {
  const [status, setStatus] = useState("");
  const seq = useRef(0);
  useEffect(() => {
    const v = String(value || "").trim();
    if (!enabled || !v || (kind === "phone" && !normalizePhone(v)) || (kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
      setStatus("");
      return undefined;
    }
    const id = ++seq.current;
    setStatus("checking");
    const timer = setTimeout(() => {
      customerAuthService
        .check({ [kind]: v })
        .then((r) => {
          if (id !== seq.current) return;
          const x = r.data[kind];
          setStatus(!x.valid ? "invalid" : x.taken ? "taken" : "ok");
        })
        .catch(() => id === seq.current && setStatus(""));
    }, 450);
    return () => clearTimeout(timer);
  }, [kind, value, enabled]);
  return status;
}

export function CheckMark({ status, okText, takenText, children }) {
  if (status === "checking")
    return (
      <span className="check-note">
        <Loader2 size={14} className="spin" />
      </span>
    );
  if (status === "ok")
    return (
      <span className="check-note ok">
        <CheckCircle2 size={14} /> {okText}
      </span>
    );
  if (status === "taken")
    return (
      <span className="check-note bad">
        <XCircle size={14} /> {takenText} {children}
      </span>
    );
  return null;
}

// countries in the picker (Cambodia first = default); code without "+"
export const COUNTRIES = [
  ["KH", "855", "🇰🇭", "Cambodia"],
  ["TH", "66", "🇹🇭", "Thailand"],
  ["VN", "84", "🇻🇳", "Vietnam"],
  ["LA", "856", "🇱🇦", "Laos"],
  ["MY", "60", "🇲🇾", "Malaysia"],
  ["SG", "65", "🇸🇬", "Singapore"],
  ["ID", "62", "🇮🇩", "Indonesia"],
  ["PH", "63", "🇵🇭", "Philippines"],
  ["MM", "95", "🇲🇲", "Myanmar"],
  ["CN", "86", "🇨🇳", "China"],
  ["HK", "852", "🇭🇰", "Hong Kong"],
  ["TW", "886", "🇹🇼", "Taiwan"],
  ["JP", "81", "🇯🇵", "Japan"],
  ["KR", "82", "🇰🇷", "South Korea"],
  ["IN", "91", "🇮🇳", "India"],
  ["AU", "61", "🇦🇺", "Australia"],
  ["NZ", "64", "🇳🇿", "New Zealand"],
  ["US", "1", "🇺🇸", "USA / Canada"],
  ["GB", "44", "🇬🇧", "United Kingdom"],
  ["FR", "33", "🇫🇷", "France"],
  ["DE", "49", "🇩🇪", "Germany"],
  ["AE", "971", "🇦🇪", "UAE"],
];
// "+66 81 234 5678" → { iso: "TH", local: "81 234 5678" }  (longest matching code wins)
function splitPhone(v) {
  const s = String(v || "").trim();
  if (!s.startsWith("+")) return { iso: "KH", local: s };
  const digits = s.slice(1).replace(/\D/g, "");
  const hit = [...COUNTRIES].sort((a, b) => b[1].length - a[1].length).find((c) => digits.startsWith(c[1]));
  if (!hit) return { iso: "KH", local: s };
  return { iso: hit[0], local: s.replace(/^\+\s*/, "").slice(hit[1].length).trim() };
}

// Country picker + number. Gives the parent "+<code> <number>" (the first 0 of the number dropped),
// so the API / normalizePhone get the full international number. Empty number → "".
export function PhoneInput({ value, onChange, disabled, invalid, autoFocus, id }) {
  const [start] = useState(() => splitPhone(value));
  const [iso, setIso] = useState(start.iso);
  const [local, setLocal] = useState(start.local);
  const c = COUNTRIES.find((x) => x[0] === iso) || COUNTRIES[0];
  const emit = (code, num) => {
    const clean = num.replace(/[^\d\s\-()]/g, "").trim();
    onChange(clean ? `+${code} ${clean.replace(/^0+/, "")}` : "");
  };
  return (
    <span className="input-wrap phone-wrap">
      <Phone size={18} className="lead-icon" aria-hidden="true" />
      <span className="cc-pick">
        <span className="cc-face" aria-hidden="true">
          {c[2]} +{c[1]}
        </span>
        <select
          aria-label="Country"
          value={iso}
          disabled={disabled}
          onChange={(e) => {
            const next = COUNTRIES.find((x) => x[0] === e.target.value) || COUNTRIES[0];
            setIso(next[0]);
            emit(next[1], local);
          }}
        >
          {COUNTRIES.map(([k, code, flag, name]) => (
            <option key={k} value={k}>
              {flag} {name} (+{code})
            </option>
          ))}
        </select>
      </span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={iso === "KH" ? "012 345 678" : ""}
        value={local}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d\s\-()]/g, "").slice(0, 18);
          setLocal(v);
          emit(c[1], v);
        }}
        disabled={disabled}
        aria-invalid={invalid}
        autoFocus={autoFocus}
      />
    </span>
  );
}

// the 6-digit SMS code with "send again" after 60 seconds
export function CodeInput({ value, onChange, disabled, onResend, sentAt, resending }) {
  const { p } = usePhoneText();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const left = Math.max(0, 60 - Math.floor((now - sentAt) / 1000));
  return (
    <div className="code-block">
      <label className="field">
        {p.code}
        <input
          className="code-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={disabled}
          autoFocus
        />
      </label>
      <button type="button" className="link-btn" onClick={onResend} disabled={left > 0 || resending || disabled}>
        {left > 0 ? p.resendIn.replace("{s}", left) : resending ? p.sending : p.resend}
      </button>
    </div>
  );
}

// Google's "G" (multicolour)
export function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

// sign-in button with the Google "G"
export function GoogleButton({ onClick, disabled, label }) {
  return (
    <button type="button" className="btn btn-google btn-block" onClick={onClick} disabled={disabled}>
      <GoogleIcon />
      {label}
    </button>
  );
}

// "Send again in 42s" → "Send the link again"
export function ResendButton({ sentAt, onClick, disabled, waitText, readyText }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const left = Math.max(0, 60 - Math.floor((now - sentAt) / 1000));
  return (
    <button type="button" className="link-btn" onClick={onClick} disabled={left > 0 || disabled}>
      {left > 0 ? waitText.replace("{s}", left) : readyText}
    </button>
  );
}
