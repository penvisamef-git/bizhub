import React, { useEffect, useState } from "react";
import { KeyRound, X } from "lucide-react";
import MasterDataPage, { statusCell } from "../master_data/MasterDataPage";
import { userService } from "../../../api/services";
import { ROLE_OPTIONS, roleText } from "../../../lib/roles";
import { auth } from "../../../lib/auth";

const fullName = (row) => `${row.firstname || ""} ${row.lastname || ""}`.trim();

const COLUMNS = [
  {
    key: "name",
    label: "ឈ្មោះ",
    render: (row) => (
      <>
        <b>{fullName(row) || "-"}</b>
        {row.job_title && <span className="md-sub">{row.job_title}</span>}
      </>
    ),
  },
  { key: "email", label: "អ៊ីមែល" },
  { key: "contact", label: "លេខទំនាក់ទំនង" },
  {
    key: "role",
    label: "តួនាទី",
    render: (row) => <span className="md-badge md-badge-gold">{roleText(row.role) || "-"}</span>,
  },
  { key: "status", label: "ស្ថានភាព", render: statusCell },
];

const FIELDS = [
  { key: "firstname", label: "គោត្តនាម", required: true, placeholder: "បញ្ចូលគោត្តនាម" },
  { key: "lastname", label: "នាម", required: true, placeholder: "បញ្ចូលនាម" },
  { key: "email", label: "អ៊ីមែល", type: "email", required: true, placeholder: "name@example.com" },
  { key: "contact", label: "លេខទំនាក់ទំនង", type: "tel", placeholder: "012345678" },
  {
    key: "password",
    label: "ពាក្យសម្ងាត់ (យ៉ាងតិច 8 តួ)",
    type: "password",
    required: true,
    createOnly: true,
    placeholder: "បញ្ចូលពាក្យសម្ងាត់",
  },
  { key: "job_title", label: "មុខតំណែង", placeholder: "Cashier / Manager" },
  {
    key: "role",
    label: "តួនាទី",
    type: "select",
    required: true,
    placeholder: "-- ជ្រើសរើសតួនាទី --",
    options: ROLE_OPTIONS,
    full: true,
  },
  { key: "note", label: "កំណត់សម្គាល់", type: "textarea" },
];

const SEARCH_KEYS = ["firstname", "lastname", "email", "contact"];

function UsersPage() {
  const currentUserId = auth.getClientLogin()?._id;

  // ---------------- Reset password dialog ----------------
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const openReset = (row) => {
    setResetTarget(row);
    setResetPassword("");
    setResetConfirm("");
    setResetError("");
  };

  const closeReset = () => {
    if (resetSaving) return;
    setResetTarget(null);
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setResetError("");

    if (!resetPassword) {
      setResetError("សូមបញ្ចូលពាក្យសម្ងាត់ថ្មី");
      return;
    }
    if (resetPassword.length < 8) {
      setResetError("ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 8 តួអក្សរ!");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError("ពាក្យសម្ងាត់បញ្ជាក់មិនត្រូវគ្នា");
      return;
    }

    setResetSaving(true);
    try {
      const res = await userService.resetPassword(resetTarget._id, { password: resetPassword });
      setNotice({ type: "success", text: res.message || "បានកំណត់ពាក្យសម្ងាត់ថ្មី!" });
      setResetTarget(null);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetSaving(false);
    }
  };

  return (
    <div className="md-page">
      {notice && <div className={`md-notice md-notice-${notice.type}`}>{notice.text}</div>}

      <MasterDataPage
        title="អ្នកប្រើប្រាស់"
        service={userService}
        fields={FIELDS}
        columns={COLUMNS}
        searchKeys={SEARCH_KEYS}
        getName={fullName}
        canDelete={(row) => row._id !== currentUserId}
        wide
        extraActions={(row) => (
          <button type="button" className="md-icon-btn" onClick={() => openReset(row)} title="កំណត់ពាក្យសម្ងាត់ថ្មី">
            <KeyRound size={15} />
          </button>
        )}
      />

      {resetTarget && (
        <div className="md-modal-backdrop" onMouseDown={closeReset}>
          <form className="md-modal md-modal-sm" onSubmit={submitReset} onMouseDown={(e) => e.stopPropagation()}>
            <div className="md-modal-header">
              <h3>កំណត់ពាក្យសម្ងាត់ថ្មី</h3>
              <button type="button" className="md-icon-btn" onClick={closeReset} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="md-modal-body">
              <p>
                <strong>{fullName(resetTarget)}</strong> ({resetTarget.email})
              </p>

              <div className="md-field">
                <label htmlFor="reset-password">
                  ពាក្យសម្ងាត់ថ្មី<span className="md-required">*</span>
                </label>
                <input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  disabled={resetSaving}
                  autoFocus
                />
              </div>

              <div className="md-field">
                <label htmlFor="reset-confirm">
                  បញ្ជាក់ពាក្យសម្ងាត់<span className="md-required">*</span>
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  disabled={resetSaving}
                />
              </div>

              <div className="md-hint">
                អ្នកប្រើប្រាស់នឹងត្រូវចាកចេញពីគ្រប់ឧបករណ៍ ហើយត្រូវប្តូរពាក្យសម្ងាត់ពេលចូលលើកក្រោយ។
              </div>

              {resetError && <div className="md-form-error">{resetError}</div>}
            </div>

            <div className="md-modal-footer">
              <button type="button" className="md-btn md-btn-ghost" onClick={closeReset} disabled={resetSaving}>
                បោះបង់
              </button>
              <button type="submit" className="md-btn md-btn-primary" disabled={resetSaving}>
                {resetSaving ? "កំពុងរក្សាទុក..." : "រក្សាទុក"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default UsersPage;
