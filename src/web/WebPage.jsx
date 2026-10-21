import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { publicGet } from "../api/client";
import Logo from "../components/Logo";
import LangSwitch from "../components/LangSwitch";
import { useI18n } from "../i18n/I18nProvider";
import { WEB_TEXT } from "./text";
import WebView from "./WebView";
import "./web.css";

// Public company website: /w/:slug and /w/:slug/:page
export default function WebPage() {
  const { slug, page = "" } = useParams();
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { lang } = useI18n();
  const t = WEB_TEXT[lang] || WEB_TEXT.en;
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    publicGet(`/web/${encodeURIComponent(slug)}`)
      .then((r) => alive && setData(r.data))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  // page title + description for sharing
  useEffect(() => {
    if (!data) return;
    const p = page && data.pages.find((x) => x.slug === page);
    document.title = p ? `${p.title} · ${data.company.name}` : data.seo?.title || data.company.name;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = (p && p.subtitle) || data.seo?.description || data.hero?.subtitle || data.company.name;
  }, [data, page]);

  // new page → top (or the part asked for in #anchor)
  useEffect(() => {
    if (!data) return;
    const id = hash.replace("#", "");
    const el = id && document.getElementById(`cw-${id}`);
    if (el) setTimeout(() => el.scrollIntoView({ block: "start" }), 30);
    else window.scrollTo(0, 0);
  }, [data, pathname, hash]);

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
  if (!data) return <div className="cw-loading" aria-busy="true" />;
  const go = (next, anchor) => navigate(`/w/${data.slug}${next ? `/${next}` : ""}${anchor ? `#${anchor}` : ""}`);
  return <WebView data={data} lang={lang} page={page} go={go} langSwitch={<LangSwitch />} />;
}
