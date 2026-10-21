import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BedDouble, Star } from "lucide-react";
import { publicGet, publicPost } from "../api/client";
import LangSwitch from "../components/LangSwitch";
import { useI18n } from "../i18n/I18nProvider";
import { GS_TEXT } from "./text";
import "./gsite.css";

const day = (d, lang) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`)) : "");

// Public: a guest reviews their stay — /r/:token (the link comes from the desk after check-out)
export default function GsReview() {
  const { token } = useParams();
  const { lang } = useI18n();
  const t = GS_TEXT[lang] || GS_TEXT.en;
  const [d, setD] = useState(null);
  const [missing, setMissing] = useState(false);
  const [f, setF] = useState({ rating: 0, text: "", name: "" });
  const [hover, setHover] = useState(0);
  const [state, setState] = useState(""); // "" | sending | sent
  const [error, setError] = useState("");
  useEffect(() => {
    publicGet(`/review/${encodeURIComponent(token)}`)
      .then((r) => {
        setD(r.data);
        setF((x) => ({ ...x, name: r.data.guest_name || "" }));
      })
      .catch(() => setMissing(true));
  }, [token]);
  const send = async (e) => {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      await publicPost(`/review/${encodeURIComponent(token)}`, f);
      setState("sent");
    } catch (err) {
      setError(err.message);
      setState("");
    }
  };
  const shown = hover || f.rating;
  return (
    <div className="gsr-page" style={d?.color ? { "--gsr": d.color } : undefined}>
      <div className="gsr-lang">
        <LangSwitch />
      </div>
      <main className="gsr-card">
        {missing ? (
          <p className="gsr-muted">{t.rvMissing}</p>
        ) : !d ? (
          <div className="gs-loading" aria-busy="true" />
        ) : (
          <>
            <span className="gsr-logo">{d.business.logo ? <img src={d.business.logo} alt="" /> : <BedDouble size={28} />}</span>
            <b className="gsr-biz">{d.business.name}</b>
            {state === "sent" || d.done ? (
              <div className="gsr-done">
                <div className="gsr-stars big" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={34} className={n <= (f.rating || d.rating) ? "on" : ""} />
                  ))}
                </div>
                <h1>{state === "sent" ? t.rvThanks : t.rvDone}</h1>
                {state === "sent" && <p className="gsr-muted">{t.rvThanksSub}</p>}
                {d.slug && (
                  <a className="gsr-btn ghost" href={`/g/${d.slug}`}>
                    {t.rvSite}
                  </a>
                )}
              </div>
            ) : (
              <form onSubmit={send} className="gsr-form">
                <h1>{t.rvTitle}</h1>
                <p className="gsr-muted">{t.rvSub.replace("{room}", d.room_name).replace("{from}", day(d.from, lang)).replace("{to}", day(d.to, lang))}</p>
                <div className="gsr-stars" onMouseLeave={() => setHover(0)} role="radiogroup">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={f.rating === n} aria-label={t.rvStars[n - 1]} onMouseEnter={() => setHover(n)} onClick={() => setF({ ...f, rating: n })}>
                      <Star size={40} className={n <= shown ? "on" : ""} />
                    </button>
                  ))}
                </div>
                <b className="gsr-word">{shown ? t.rvStars[shown - 1] : " "}</b>
                <label className="gsr-field">
                  <span>{t.rvText}</span>
                  <textarea rows={4} maxLength={1000} value={f.text} placeholder={t.rvTextPh} onChange={(e) => setF({ ...f, text: e.target.value })} />
                </label>
                <label className="gsr-field">
                  <span>{t.rvName}</span>
                  <input maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                </label>
                {error && <p className="gsr-error">{error}</p>}
                <button type="submit" className="gsr-btn" disabled={!f.rating || state === "sending"}>
                  {state === "sending" ? t.rvSending : t.rvSend}
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
