import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { Check, Gift, Loader2, Phone, Send, Stamp } from "lucide-react";
import StampCard from "./StampCard";
import { stampPublic } from "../api/services";
import { useStampText } from "./text";
import { themeOf } from "./themes";
import "../dashboard/admin/master_data/masterdata.css";
import "./stamp.css";

const nm = (l, lang) => (lang === "km" ? l?.km || l?.en : l?.en || l?.km) || "";
const fmtDate = (d, lang) => (d ? new Date(d).toLocaleDateString(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

// /stamp/c/<token>: the customer's own card — stamps, the QR staff scan, rewards, visits (checks again every few seconds)
export default function CardPage() {
  const { token } = useParams();
  const { t, lang, setLang } = useStampText();
  const [d, setD] = useState(null);
  const [off, setOff] = useState(false);
  const [qr, setQr] = useState("");
  const [pop, setPop] = useState(-1);
  const before = useRef(null);
  const load = useCallback(
    () =>
      stampPublic
        .card(token)
        .then((r) => {
          const n = r.data.member.stamps;
          if (before.current !== null && n > before.current) setPop(Math.min(n, r.data.shop.goal) - 1);
          before.current = n;
          setD(r.data);
          try {
            localStorage.setItem(`sc_card:${r.data.shop.slug}`, token);
          } catch {
            /* private mode */
          }
        })
        .catch((e) => e.status === 404 && setOff(true)),
    [token],
  );
  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), 8000);
    return () => clearInterval(id);
  }, [load]);
  useEffect(() => {
    QRCode.toDataURL(window.location.href.split("?")[0], { width: 360, margin: 1, errorCorrectionLevel: "M" }).then(setQr);
  }, [token]);
  useEffect(() => {
    if (d) document.title = `${d.member.name} · ${d.shop.name}`;
  }, [d]);

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
  const me = d.member;
  const th = themeOf(s.theme);
  const levels = s.levels;
  const ready = levels.filter((l) => me.ready.includes(l.at));
  const next = levels.find((l) => me.stamps < l.at && !me.claimed.includes(l.at));
  const ev = (e) => (e.kind === "stamp" ? t.ev.stamp.replace("{n}", e.n) : e.kind === "reward" ? t.ev.reward.replace("{reward}", e.reward.split(" · ")[lang === "km" ? 0 : 1] || e.reward) : t.ev[e.kind] || e.kind);
  return (
    <div className="sc-page" style={{ "--sc-page": th.dark ? "#0f1220" : "#f6f3ef", "--sc-accent": s.color || th.accent }} data-testid="sc-card-page">
      <div className="sc-sheet">
        <div className="sc-top">
          <button type="button" className="sc-lang" onClick={() => setLang(lang === "km" ? "en" : "km")}>
            {lang === "km" ? "EN" : "ខ្មែរ"}
          </button>
        </div>
        <StampCard shop={s} member={me} lang={lang} pop={pop} />
        {ready.length > 0 ? (
          <div className="sc-ready" data-testid="sc-ready">
            <Gift size={20} /> {t.ready.replace("{reward}", nm(ready[ready.length - 1], lang))}
          </div>
        ) : (
          next && <p className="sc-togo">{t.toGo.replace("{n}", next.at - me.stamps).replace("{reward}", nm(next, lang))}</p>
        )}
        <section className="sc-show">
          <b>{t.showStaff}</b>
          <small>{t.showStaffSub}</small>
          {qr && <img src={qr} alt="" className="sc-show-qr" />}
          <span className="sc-show-no">{t.cardNo.replace("{n}", me.no)}</span>
        </section>
        {levels.length > 1 && (
          <section className="sc-box">
            <h2>{t.rewards}</h2>
            {levels.map((l) => (
              <div key={l.at} className={`sc-level ${me.stamps >= l.at ? "on" : ""}`}>
                <span>{t.rewardAt.replace("{n}", l.at)}</span>
                <b>{nm(l, lang)}</b>
                {me.claimed.includes(l.at) && (
                  <small>
                    <Check size={12} /> {t.given}
                  </small>
                )}
              </div>
            ))}
          </section>
        )}
        {d.telegram &&
          (me.tg_linked ? (
            <p className="sc-tg on">
              <Check size={15} /> {t.tgOn}
            </p>
          ) : (
            <a className="md-btn sc-tg-btn sc-wide" href={`https://t.me/${d.telegram.bot}?start=${d.telegram.start}`} target="_blank" rel="noreferrer" data-testid="sc-tg">
              <Send size={16} /> {t.tg}
            </a>
          ))}
        {d.events.length > 0 && (
          <section className="sc-box">
            <h2>{t.history}</h2>
            {d.events.map((e, i) => (
              <div key={i} className={`sc-ev k-${e.kind}`}>
                <span>{ev(e)}</span>
                <small>{fmtDate(e.at, lang)}</small>
              </div>
            ))}
          </section>
        )}
        <section className="sc-box sc-save">
          <b>{t.save}</b>
          <small>{t.saveSub}</small>
        </section>
        {s.expiry_months > 0 && <p className="sc-terms">{t.expiry.replace("{n}", s.expiry_months)}</p>}
        {(s.terms?.[lang] || s.terms?.en) && <p className="sc-terms">{s.terms[lang] || s.terms.en}</p>}
        <footer className="sc-foot">
          {s.phone && (
            <a href={`tel:${String(s.phone).replace(/[^\d+]/g, "")}`}>
              <Phone size={13} /> {t.call}
            </a>
          )}
          <span>
            {t.since.replace("{date}", fmtDate(me.since, lang))} · {t.made}
          </span>
        </footer>
      </div>
    </div>
  );
}
