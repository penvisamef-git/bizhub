import { forwardRef, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";

const PasswordInput = forwardRef(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  const { t } = useI18n();
  return (
    <div className="input-wrap">
      <Lock size={18} className="lead-icon" aria-hidden="true" />
      <input ref={ref} type={show ? "text" : "password"} {...props} />
      <button type="button" className="eye" onClick={() => setShow((v) => !v)} aria-label={show ? t.hidePassword : t.showPassword}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
});

export default PasswordInput;
