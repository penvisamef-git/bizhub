import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { publicGet } from "../api/client";
import Logo from "../components/Logo";
import LangSwitch from "../components/LangSwitch";
import { useI18n } from "../i18n/I18nProvider";
import { MS_TEXT } from "./text";
import MsView from "./MsView";

// Public mini mart website: /m/:slug
export default function MsPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { lang } = useI18n();
  const t = MS_TEXT[lang] || MS_TEXT.en;
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    publicGet(`/shop/${encodeURIComponent(slug)}`)
      .then((r) => alive && setData(r.data))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  // page title + description for sharing
  useEffect(() => {
    if (!data) return;
    document.title = data.business.name;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = data.tagline || data.business.name;
  }, [data]);

  if (missing) {
    return (
      <div className="standalone-page">
        <Logo height={34} />
        <h1>{t.notFound}</h1>
        <p>{t.notFoundSub}</p>
        <Link className="btn btn-primary" to="/">
          {t.goHome}
        </Link>
      </div>
    );
  }
  if (!data) return <div className="ms-loading" aria-busy="true" />;
  return <MsView data={data} lang={lang} langSwitch={<LangSwitch />} page={params.get("p") || ""} onPage={(k) => setParams(k ? { p: k } : {}, { replace: false })} />;
}
