import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicGet } from "../api/client";
import Logo from "../components/Logo";
import LangSwitch from "../components/LangSwitch";
import { useI18n } from "../i18n/I18nProvider";
import { GS_TEXT } from "./text";
import GsView from "./GsView";

// Public guest house website: /g/:slug
export default function GsPage() {
  const { slug } = useParams();
  const { lang } = useI18n();
  const t = GS_TEXT[lang] || GS_TEXT.en;
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    publicGet(`/stay/${encodeURIComponent(slug)}`)
      .then((r) => alive && setData(r.data))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  // page title + description for sharing
  useEffect(() => {
    if (!data) return;
    document.title = data.seo?.title || data.business.name;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = data.seo?.description || data.hero?.subtitle || data.business.name;
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
  if (!data) return <div className="gs-loading" aria-busy="true" />;
  return <GsView data={data} lang={lang} langSwitch={<LangSwitch />} />;
}
