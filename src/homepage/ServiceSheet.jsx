import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import PathIcon from "../components/PathIcon";
import { ICONS, HERO_ICONS } from "./content";
import { ROUTES } from "../config";
import { BIZ_INFO } from "../dashboard/client/bizTypeInfo";
import PriceTag from "./PriceTag";

const KM_NUM = ["១", "២", "៣"];

// Bottom sheet with full details of one service; tabs switch between services.
export default function ServiceSheet({ t, lang, services, steps, openKey, onChange, onClose }) {
  const sheetRef = useRef(null);
  const closeRef = useRef(null);
  const service = services.find((s) => s.key === openKey) || services[0];
  const km = document.documentElement.lang === "km";

  // Esc closes, focus goes into the sheet, page behind does not scroll
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    sheetRef.current?.scrollTo({ top: 0 });
  }, [openKey]);

  if (!service) return null;
  const info = (BIZ_INFO[lang] || BIZ_INFO.en)[service.type] || {};

  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label={service.title}>
      <button type="button" className="sheet-backdrop" aria-label={t.close} onClick={onClose} />
      <div className="sheet" ref={sheetRef}>
        <div className="sheet-top">
          <div className="sheet-tabs" role="tablist">
            {services.map((s) => (
              <button key={s.key} type="button" role="tab" aria-selected={s.key === service.key} className={`tab${s.key === service.key ? " on" : ""}`} onClick={() => onChange(s.key)}>
                {s.title}
              </button>
            ))}
          </div>
          <button ref={closeRef} type="button" className="icon-btn" aria-label={t.close} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={`sheet-hero g-${service.key}`}>
          <div className="blob" style={{ width: 320, height: 320, background: "rgba(255,210,150,0.35)", top: -140, right: -60, animation: "drift1 12s ease-in-out infinite" }} />
          <div className="blob" style={{ width: 260, height: 260, background: "rgba(200,230,80,0.25)", bottom: -140, left: "30%", animation: "drift2 14s ease-in-out infinite" }} />
          <div className="hero-icon float">
            <span className="ring" />
            <span className="ring ring2" />
            <div className="box">
              <PathIcon d={HERO_ICONS[service.key]} size={50} stroke="#FFFFFF" strokeWidth={1.8} />
            </div>
          </div>
          <div style={{ position: "relative", flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2>{service.title}</h2>
            <p>{service.tag}</p>
            <PriceTag t={t} price={service.price} lang={lang} big />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="chip-light">{t.payChip}</span>
              <span className="chip-light">Web · App · POS</span>
              <span className="chip-light">{t.mq3}</span>
            </div>
          </div>
        </div>

        <div className="sheet-body" key={service.key}>
          <h3>{t.featTitle}</h3>
          <div className="feat-grid">
            {service.f.map(([icon, title, desc], i) => (
              <div key={title} className="feat" style={{ animationDelay: `${0.12 + i * 0.08}s` }}>
                <span className="ficon">
                  <PathIcon d={ICONS[icon]} size={24} />
                </span>
                <strong>{title}</strong>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {(info.included?.length > 0 || info.later?.length > 0) && (
          <div className="sheet-body sheet-price" style={{ paddingTop: 0 }}>
            {info.included?.length > 0 && (
              <div>
                <h3>{t.inPrice}</h3>
                <ul className="sheet-list ok">
                  {info.included.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
            {info.later?.length > 0 && (
              <div>
                <h3>{t.addLater}</h3>
                <ul className="sheet-list plus">
                  {info.later.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="sheet-body" style={{ paddingTop: 0 }}>
          <h3>{t.stepsTitle}</h3>
          <ol className="start-steps">
            {steps.map(([title, desc], i) => (
              <li key={title}>
                <span className="step-no" style={{ flexShrink: 0 }}>
                  {km ? KM_NUM[i] : i + 1}
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{desc}</small>
                </span>
              </li>
            ))}
          </ol>
          <div className="cta-row">
            <Link className="btn btn-primary" to={ROUTES.signUp}>
              {t.ctaStart}
            </Link>
            <a className="btn btn-secondary" href="#talk" onClick={onClose}>
              {t.talk}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
