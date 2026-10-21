import { useCallback, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useI18n } from "../i18n/I18nProvider";
import "./confirm-signout.css";

const TEXT = {
  en: { title: "Sign out?", sub: "You will need to sign in again to continue.", cancel: "Stay", yes: "Sign out" },
  km: { title: "ចាកចេញ?", sub: "អ្នកនឹងត្រូវចូលម្តងទៀត ដើម្បីបន្ត។", cancel: "នៅបន្ត", yes: "ចាកចេញ" },
};

// ask before signing out (every app: dashboard, customer pages, staff app)
//   const [askSignOut, signOutDialog] = useConfirmSignOut(doLogout);  →  onClick={askSignOut} … {signOutDialog}
export function useConfirmSignOut(onConfirm, opts = {}) {
  const { lang } = useI18n();
  const t = TEXT[lang] || TEXT.en;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ask = useCallback(() => setOpen(true), []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const dialog = open ? (
    <div className={`cso-back ${opts.className || ""}`} onMouseDown={(e) => e.target === e.currentTarget && !busy && setOpen(false)}>
      <div className="cso-card" role="alertdialog" aria-modal="true" aria-labelledby="cso-title">
        <span className="cso-ic">
          <LogOut size={22} />
        </span>
        <h2 id="cso-title">{t.title}</h2>
        <p>{opts.sub || t.sub}</p>
        <div className="cso-btns">
          <button type="button" className="cso-btn ghost" onClick={() => setOpen(false)} disabled={busy} autoFocus>
            {t.cancel}
          </button>
          <button
            type="button"
            className="cso-btn danger"
            data-testid="cso-yes"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
                setOpen(false);
              }
            }}
          >
            <LogOut size={16} /> {busy ? "…" : t.yes}
          </button>
        </div>
      </div>
    </div>
  ) : null;
  return [ask, dialog];
}
