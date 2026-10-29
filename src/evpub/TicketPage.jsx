import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, Ticket } from "lucide-react";
import { evPublic } from "../api/services";
import { TicketCard } from "./TicketCard";
import { pageClass, pageStyle } from "./pageThemes";
import "./pagethemes.css";
import { useEvPubText } from "./text";
import "./evpub.css";
import PoweredBy from "../components/PoweredBy";

// /ev/t/:code — one ticket (the QR on the ticket opens this page when scanned with a normal camera)
export default function TicketPage() {
  const { code } = useParams();
  const { t, lang, setLang } = useEvPubText();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    evPublic
      .ticket(code)
      .then((r) => {
        setD(r.data);
        document.title = r.data.event.title;
      })
      .catch((e) => setError(e.message || "error"));
  }, [code]);
  const lang_ = (
    <button type="button" className="evp-lang dark" onClick={() => setLang(lang === "km" ? "en" : "km")}>
      {lang === "km" ? "EN" : "ខ្មែរ"}
    </button>
  );
  if (error)
    return (
      <div className="evp evp-center">
        {lang_}
        <Ticket size={44} />
        <h1>{t.notFound}</h1>
        <p>{t.notFoundSub}</p>
      </div>
    );
  if (!d)
    return (
      <div className="evp evp-center">
        <Loader2 size={30} className="evp-spin" />
      </div>
    );
  return (
    <div className={`evp evp-light ${pageClass(d.event.page_theme)}`} style={pageStyle(d.event.page_theme, d.event.theme, d.event.page_colors, d.event.theme_colors)}>
      <main className="evp-main evp-one">
        <div className="evp-one-top">{lang_}</div>
        {d.event.sale === "cancelled" && <div className="evp-closed">{t.evCancelled}</div>}
        <TicketCard tk={d.ticket} ev={d.event} t={t} lang={lang} />
        {d.event.slug && (
          <Link className="evp-mini center" to={`/ev/${d.event.slug}`}>
            {d.event.title}
          </Link>
        )}
        {d.brand && (
          <>
            <a className="evp-brand" href="/" target="_blank" rel="noreferrer">
              {t.madeWith}
            </a>
            <PoweredBy lang={lang} className="evp-powered" />
          </>
        )}
      </main>
    </div>
  );
}
