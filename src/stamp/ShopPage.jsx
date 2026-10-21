import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CreditCard, Gift, Loader2, Phone, Stamp, UserPlus } from "lucide-react";
import StampCard from "./StampCard";
import { stampPublic } from "../api/services";
import { useStampText } from "./text";
import { themeOf } from "./themes";
import "../dashboard/admin/master_data/masterdata.css";
import "./stamp.css";

const saved = (slug) => {
  try {
    return localStorage.getItem(`sc_card:${slug}`) || "";
  } catch {
    return "";
  }
};

// /stamp/<slug>: behind the shop QR — new customers get their card, old ones open it again (self-check add-on)
export default function ShopPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t, lang, setLang } = useStampText();
  const [d, setD] = useState(null);
  const [off, setOff] = useState(false);
  const [mode, setMode] = useState("join");
  const [f, setF] = useState({ name: "", phone: "", last: "" });
  const [needLast, setNeedLast] = useState(false); // found by name → confirm with the last 3 phone digits
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mine = saved(slug);
  useEffect(() => {
    stampPublic
      .shop(slug)
      .then((r) => {
        setD(r.data);
        if (!r.data.join && r.data.check) setMode("find");
        document.title = r.data.shop.name;
      })
      .catch(() => setOff(true));
  }, [slug]);
  const open = (token) => {
    try {
      localStorage.setItem(`sc_card:${slug}`, token);
    } catch {
      /* private mode */
    }
    navigate(`/stamp/c/${token}`);
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = mode === "join" ? await stampPublic.join(slug, { name: f.name, phone: f.phone }) : await stampPublic.find(slug, needLast ? { name: f.phone, last: f.last } : { phone: f.phone });
      if (r.data.need_last) return setNeedLast(true);
      open(r.data.token);
    } catch (err) {
      setError(err.body?.code === "has_card" ? t.hasCard : err.message);
    } finally {
      setBusy(false);
    }
  };
  if (off)
    return (
      <div className="sc-page">
        <div className="sc-sheet sc-off">
          <Stamp size={30} />
          <h1>{t.off}</h1>
          <p>{t.offSub}</p>
        </div>
      </div>
    );
  if (!d)
    return (
      <div className="sc-page">
        <Loader2 size={26} className="md-spin" />
      </div>
    );
  const s = d.shop;
  const th = themeOf(s.theme);
  const last = s.levels[s.levels.length - 1];
  return (
    <div className="sc-page" style={{ "--sc-page": th.dark ? "#0f1220" : "#f6f3ef", "--sc-accent": s.color || th.accent }} data-testid="sc-shop">
      <div className="sc-sheet">
        <div className="sc-top">
          <button type="button" className="sc-lang" onClick={() => setLang(lang === "km" ? "en" : "km")}>
            {lang === "km" ? "EN" : "ខ្មែរ"}
          </button>
        </div>
        <StampCard shop={s} lang={lang} />
        {mine && (
          <button type="button" className="md-btn md-btn-primary sc-wide" onClick={() => navigate(`/stamp/c/${mine}`)} data-testid="sc-open-mine">
            {t.openMine}
          </button>
        )}
        <section className="sc-join">
          <h1>{mode === "join" ? t.getCard : t.haveCard}</h1>
          <p className="sc-sub">{mode === "join" ? t.getCardSub : t.findSub}</p>
          {mode === "join" && d.welcome > 0 && (
            <p className="sc-gift">
              <Gift size={16} /> {t.welcomeGift.replace("{n}", d.welcome)}
            </p>
          )}
          {mode === "join" && !d.join ? (
            <p className="sc-note">{t.joinOff}</p>
          ) : (
            <form onSubmit={submit} className="sc-form">
              {mode === "join" && (
                <label>
                  <span>{t.name}</span>
                  <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={t.namePh} maxLength={80} required autoComplete="name" data-testid="sc-join-name" />
                </label>
              )}
              <label>
                <span>{mode === "join" ? t.phone : t.phoneOrName}</span>
                <input
                  value={f.phone}
                  onChange={(e) => {
                    setF({ ...f, phone: e.target.value, last: "" });
                    setNeedLast(false);
                  }}
                  placeholder={mode === "join" ? t.phonePh : t.phoneOrNamePh}
                  inputMode={mode === "join" ? "tel" : "text"}
                  maxLength={mode === "join" ? 20 : 80}
                  required
                  autoComplete={mode === "join" ? "tel" : "off"}
                  data-testid="sc-join-phone"
                />
              </label>
              {mode === "find" && needLast && (
                <label>
                  <span>{t.last3}</span>
                  <input value={f.last} onChange={(e) => setF({ ...f, last: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="•••" inputMode="numeric" maxLength={3} required autoFocus data-testid="sc-find-last" />
                  <small className="sc-privacy">{t.last3Sub}</small>
                </label>
              )}
              {error && <div className="sc-error">{error}</div>}
              <button type="submit" className="md-btn md-btn-primary sc-wide" disabled={busy} data-testid="sc-join-go">
                {busy ? <Loader2 size={16} className="md-spin" /> : null} {busy ? t.joining : mode === "join" ? t.join : t.find}
              </button>
              <small className="sc-privacy">{t.privacy}</small>
            </form>
          )}
          {d.check && <div className="sc-or">{t.or}</div>}
          {d.check && (
            <button
              type="button"
              className="md-btn sc-wide sc-switch"
              onClick={() => {
                setMode(mode === "join" ? "find" : "join");
                setError("");
                setNeedLast(false);
              }}
              data-testid="sc-switch"
            >
              {mode === "join" ? <CreditCard size={18} /> : <UserPlus size={18} />} {mode === "join" ? t.haveCard : t.newCard}
            </button>
          )}
        </section>
        {(s.terms?.[lang] || s.terms?.en) && <p className="sc-terms">{s.terms[lang] || s.terms.en}</p>}
        <footer className="sc-foot">
          {s.phone && (
            <a href={`tel:${String(s.phone).replace(/[^\d+]/g, "")}`}>
              <Phone size={13} /> {s.phone}
            </a>
          )}
          <span>
            {last && `${s.goal} ★ = ${lang === "km" ? last.km : last.en}`} · {t.made}
          </span>
        </footer>
      </div>
    </div>
  );
}
