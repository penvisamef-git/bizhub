import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Camera, Coins, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, Phone, Shield, ShieldCheck, User, X } from "lucide-react";
import { customerAuthService } from "../../../api/services";
import { authFor, isCustomer } from "../../../lib/permission";
import { auth } from "../../../lib/auth";
import { roleText } from "../../../lib/roles";
import "../../admin/master_data/masterdata.css";
import "./account.css";
import ChangeEmail from "./ChangeEmail";
import AppQrLogin from "./AppQrLogin";

function InfoRow({ icon, label, value, tone = "" }) {
  return (
    <div className={`ac-tile ${tone}`}>
      <span className="ac-tile-icon">{icon}</span>
      <div className="ac-tile-text">
        <dt>{label}</dt>
        <dd>{value || "-"}</dd>
      </div>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, show, autoComplete }) {
  return (
    <div className="ac-field">
      <label htmlFor={id}>{label}</label>
      <div className="ac-input">
        <Lock size={16} className="ac-input-icon" />
        <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} placeholder="••••••••" />
      </div>
    </div>
  );
}

// display only: how strong the new password looks (0 – 4)
function strengthOf(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd) || pwd.length >= 12) score++;
  return score;
}
const STRENGTH_TEXT = ["", "ខ្សោយ", "មធ្យម", "ល្អ", "ខ្លាំង"];

function AccountPage() {
  const login = useMemo(() => auth.getClientLogin() || {}, []);
  const customer = isCustomer(login);
  const service = authFor(login); // team or customer API

  const [profile, setProfile] = useState({});
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const pickPhoto = React.useRef(null);
  const setPhoto = async (file) => {
    setPhotoBusy(true);
    setError("");
    try {
      const res = file ? await customerAuthService.uploadPhoto(file) : await customerAuthService.removePhoto();
      setProfile((p) => ({ ...p, photo: res.data.photo }));
      auth.setClientLogin({ ...auth.getClientLogin(), photo: res.data.photo });
      window.dispatchEvent(new Event("bizhub-profile"));
      setNotice(res.message || "Saved");
    } catch (err) {
      setError(err.message);
    } finally {
      setPhotoBusy(false);
    }
  };

  // must change password (first login / reset by admin)
  const [mustChange, setMustChange] = useState(!!login.is_first_login || new URLSearchParams(window.location.search).get("first") === "1");

  useEffect(() => {
    let alive = true;
    service
      .me()
      .then((res) => alive && setProfile(res.data || {}))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [service]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // saved login info is the base; the live profile fills in / overrides
  const me = { ...login, ...profile };
  const fullName = customer ? me.name || "" : `${me.firstname || ""} ${me.lastname || ""}`.trim();
  const initial = Array.from(fullName || me.email || "?")[0].toUpperCase();
  const roleName = customer ? "Business owner" : me.is_super_admin ? "Super Admin" : roleText(me.role);
  const strength = strengthOf(password);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!oldPassword) {
      setError("សូមបញ្ចូលពាក្យសម្ងាត់ចាស់");
      return;
    }
    if (!password) {
      setError("សូមបញ្ចូលពាក្យសម្ងាត់ថ្មី");
      return;
    }
    if (password.length < 8) {
      setError("ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 8 តួអក្សរ!");
      return;
    }
    if (password !== confirm) {
      setError("ពាក្យសម្ងាត់បញ្ជាក់មិនត្រូវគ្នា");
      return;
    }
    setSaving(true);
    try {
      const res = await service.changePassword({ old_password: oldPassword, new_password: password });
      setNotice(res?.message || "បានប្តូរពាក្យសម្ងាត់ថ្មី!");
      setOldPassword("");
      setPassword("");
      setConfirm("");
      setMustChange(false);
      auth.setClientLogin({ ...auth.getClientLogin(), is_first_login: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="md-page ac-page">
      {notice && <div className="md-notice md-notice-success">{notice}</div>}
      {mustChange && <div className="md-notice md-notice-error">សូមប្តូរពាក្យសម្ងាត់របស់អ្នកជាមុនសិន ដើម្បីសុវត្ថិភាពគណនី។</div>}

      {/* ---------- profile header ---------- */}
      <section className="ac-profile">
        <div className="ac-cover">
          <span className="ac-cover-word" aria-hidden="true">
            BizHub
          </span>
        </div>
        <div className="ac-profile-body">
          <div className={`ac-avatar ${me.photo ? "has-photo" : ""}`}>
            {me.photo ? <img src={me.photo} alt="" /> : initial}
            {customer && (
              <>
                <button type="button" className="ac-avatar-cam" onClick={() => pickPhoto.current?.click()} disabled={photoBusy} aria-label="Profile photo" title="Profile photo" data-testid="ac-photo">
                  {photoBusy ? <Loader2 size={16} className="md-spin" /> : <Camera size={16} />}
                </button>
                <input
                  ref={pickPhoto}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  data-testid="ac-photo-file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) setPhoto(f);
                  }}
                />
                {me.photo && (
                  <button type="button" className="ac-avatar-del" onClick={() => setPhoto(null)} disabled={photoBusy} aria-label="Remove photo" title="Remove photo">
                    <X size={13} />
                  </button>
                )}
              </>
            )}
          </div>
          <div className="ac-profile-text">
            <h2>{fullName || "គណនីរបស់ខ្ញុំ"}</h2>
            <p>
              <Mail size={14} /> {me.email || "-"}
            </p>
          </div>
          <div className="ac-chips">
            {roleName && (
              <span className="ac-chip">
                <Shield size={13} />
                {roleName}
              </span>
            )}
            {me.job_title && (
              <span className="ac-chip ac-chip-soft">
                <Briefcase size={13} />
                {me.job_title}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="ac-grid">
        {/* ---------- personal info ---------- */}
        <section className="ac-card">
          <header className="ac-card-head">
            <span className="ac-card-icon">
              <User size={18} />
            </span>
            <div>
              <h3>ព័ត៌មានផ្ទាល់ខ្លួន</h3>
              <p>ព័ត៌មានគណនីរបស់អ្នកក្នុងប្រព័ន្ធ</p>
            </div>
          </header>
          <dl className="ac-tiles">
            {customer ? (
              <>
                <InfoRow icon={<User size={16} />} label="ឈ្មោះ" value={me.name} tone="wide" />
                <InfoRow icon={<Mail size={16} />} label="អ៊ីមែល" value={me.email ? `${me.email}${me.email_verified ? " ✓" : ""}` : ""} tone="wide" />
                <InfoRow icon={<Phone size={16} />} label="លេខទូរស័ព្ទ" value={me.phone ? `${me.phone}${me.phone_verified ? " ✓" : ""}` : ""} />
                <InfoRow icon={<Coins size={16} />} label="កាក់" value={new Intl.NumberFormat("en-US").format(me.coin_balance || 0)} tone="accent" />
              </>
            ) : (
              <>
                <InfoRow icon={<User size={16} />} label="គោត្តនាម" value={me.firstname} />
                <InfoRow icon={<User size={16} />} label="នាម" value={me.lastname} />
                <InfoRow icon={<Mail size={16} />} label="អ៊ីមែល" value={me.email} tone="wide" />
                <InfoRow icon={<Phone size={16} />} label="លេខទំនាក់ទំនង" value={me.contact} />
                <InfoRow icon={<Briefcase size={16} />} label="មុខតំណែង" value={me.job_title} />
                <InfoRow icon={<Shield size={16} />} label="តួនាទី" value={roleName} tone="wide accent" />
              </>
            )}
          </dl>
          {customer && (
            <div className="ac-actions">
              <ChangeEmail
                current={me.email}
                onChanged={(data, msg) => {
                  setProfile((x) => ({ ...x, ...data }));
                  setNotice(msg);
                }}
              />
            </div>
          )}
        </section>

        {/* ---------- password ---------- */}
        <section className={`ac-card ac-card-password ${mustChange ? "is-required" : ""}`}>
          <header className="ac-card-head">
            <span className="ac-card-icon">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h3>ប្តូរពាក្យសម្ងាត់</h3>
              <p>បញ្ចូលពាក្យសម្ងាត់ចាស់ ហើយពាក្យសម្ងាត់ថ្មី (យ៉ាងតិច 8 តួ)</p>
            </div>
          </header>
          <form className="ac-form" onSubmit={submit} noValidate>
            <PasswordField id="ac-old" label="ពាក្យសម្ងាត់ចាស់" value={oldPassword} onChange={setOldPassword} show={showPwd} autoComplete="current-password" />
            <PasswordField id="ac-new" label="ពាក្យសម្ងាត់ថ្មី" value={password} onChange={setPassword} show={showPwd} autoComplete="new-password" />
            {password && (
              <div className={`ac-strength s${strength}`}>
                <div className="ac-strength-bars">
                  {[1, 2, 3, 4].map((n) => (
                    <i key={n} className={strength >= n ? "on" : ""} />
                  ))}
                </div>
                <span>{STRENGTH_TEXT[strength]}</span>
              </div>
            )}
            <PasswordField id="ac-confirm" label="បញ្ជាក់ពាក្យសម្ងាត់ថ្មី" value={confirm} onChange={setConfirm} show={showPwd} autoComplete="new-password" />
            {error && <div className="ac-form-error">{error}</div>}
            <div className="ac-form-actions">
              <button type="button" className="ac-btn ac-btn-ghost" onClick={() => setShowPwd((v) => !v)}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                {showPwd ? "លាក់" : "បង្ហាញ"}
              </button>
              <button type="submit" className="ac-btn ac-btn-primary" disabled={saving}>
                <KeyRound size={16} />
                {saving ? "កំពុងរក្សាទុក..." : "ប្តូរពាក្យសម្ងាត់"}
              </button>
            </div>
          </form>
        </section>

        {/* ---------- log in on the BizHub app (owners + super admin: the app is for them) ---------- */}
        {(customer || me.is_super_admin) && <AppQrLogin service={service} />}
      </div>
    </div>
  );
}

export default AccountPage;
