import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../../i18n/I18nProvider";
import BiziFace from "./BiziFace";
import { biziText } from "./text";
import "./bizi.css";

// the search box downloads the first time it opens (the bubble itself is tiny)
const BiziSearch = lazy(() => import("./BiziSearch"));
const TIP_KEY = "bizi_tip_seen";

// Bizi (v3.0.0): the helper in the corner of every owner page. Tap it, or press ⌘K / Ctrl K anywhere, to search
// everything in all my businesses. The first time, a small "Ask me anything" note says what it is.
export default function Bizi() {
  const { lang } = useI18n();
  const x = biziText(lang);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState(() => {
    try {
      return !localStorage.getItem(TIP_KEY);
    } catch {
      return false;
    }
  });
  const hideTip = useCallback(() => {
    setTip(false);
    try {
      localStorage.setItem(TIP_KEY, "1");
    } catch {
      /* private window */
    }
  }, []);
  const show = useCallback(() => {
    hideTip();
    setOpen(true);
  }, [hideTip]);

  // ⌘K (Mac) / Ctrl K (Windows) anywhere
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        hideTip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hideTip]);
  // the tip goes by itself after a while
  useEffect(() => {
    if (!tip) return undefined;
    const t = setTimeout(hideTip, 12000);
    return () => clearTimeout(t);
  }, [tip, hideTip]);
  // a new page closes the box
  useEffect(() => setOpen(false), [location.pathname, location.search]);

  return (
    <>
      <div className={`bizi-corner${open ? " is-open" : ""}`}>
        {tip && !open && (
          <button type="button" className="bizi-tip" onClick={show}>
            <b>{x.tipTitle}</b>
            <span>{x.tipSub}</span>
          </button>
        )}
        <button type="button" className="bizi-bubble" onClick={show} aria-label={x.open} title={`${x.open} · ${x.keys}`} data-testid="bizi-bubble">
          <BiziFace mood="idle" size={52} title="Bizi" />
        </button>
      </div>
      {open && (
        <Suspense fallback={null}>
          <BiziSearch onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
