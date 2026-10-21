import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { publicGet } from "../api/client";
import Logo from "../components/Logo";
import LangSwitch from "../components/LangSwitch";
import { useI18n } from "../i18n/I18nProvider";
import { SITE_TEXT } from "./text";
import SiteView from "./SiteView";
import "./site.css";

// Public restaurant website: /s/:slug, /s/:slug/menu, /s/:slug/item/:itemId
export default function SitePage() {
  const { slug, itemId } = useParams();
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { lang } = useI18n();
  const t = SITE_TEXT[lang] || SITE_TEXT.en;
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const view = itemId ? "item" : pathname.replace(/\/+$/, "").endsWith("/menu") ? "menu" : "home";

  useEffect(() => {
    let alive = true;
    publicGet(`/site/${encodeURIComponent(slug)}`)
      .then((r) => alive && setData(r.data))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  // page title + description for sharing
  useEffect(() => {
    if (!data) return;
    const R = data.restaurant;
    const name = (lang === "km" ? R.name_km || R.name_en : R.name_en || R.name_km) || "";
    const item = view === "item" && data.items.find((i) => i._id === itemId);
    document.title = item ? `${lang === "km" ? item.name_km || item.name_en : item.name_en || item.name_km} · ${name}` : data.seo?.title || name;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = data.seo?.description || data.hero?.subtitle || name;
  }, [data, lang, view, itemId]);

  // new page → top (or the part asked for in #anchor)
  useEffect(() => {
    if (!data) return;
    const id = hash.replace("#", "");
    const el = id && document.getElementById(`st-${id}`);
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
  if (!data) return <div className="st-loading" aria-busy="true" />;

  const go = (next, id, anchor) => {
    const base = `/s/${data.slug}`;
    navigate(next === "item" ? `${base}/item/${id}` : next === "menu" ? `${base}/menu` : `${base}${anchor ? `#${anchor}` : ""}`);
  };
  return <SiteView data={data} lang={lang} view={view} itemId={itemId} go={go} langSwitch={<LangSwitch />} />;
}
