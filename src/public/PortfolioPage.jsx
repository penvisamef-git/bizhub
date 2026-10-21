import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Share2 } from "lucide-react";
import { publicGet } from "../api/client";
import Logo from "../components/Logo";
import PortfolioView from "../namecard/PortfolioView";
import { usePortfolioText } from "../namecard/portfolioText";
import { ROUTES } from "../config";
import "./public-card.css";
import { PortfolioPageSkeleton } from "../components/skeleton/Skeleton";

// Public personal web portfolio: /public/portfolio/:slug
export default function PortfolioPage() {
  const { slug } = useParams();
  const t = usePortfolioText();
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    publicGet(`/portfolio/${encodeURIComponent(slug)}`)
      .then((r) => alive && setData(r.data))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (data) document.title = `${data.card?.name || "Portfolio"}${data.headline ? ` · ${data.headline}` : ""}`;
  }, [data]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) return await navigator.share({ title: data?.card?.name, url });
    } catch {
      return undefined;
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    return undefined;
  };

  if (missing) {
    return (
      <div className="standalone-page">
        <Logo height={34} />
        <h1>{t.notFoundTitle}</h1>
        <p>{t.notFoundSub}</p>
        <Link className="btn btn-primary" to={ROUTES.signUp}>
          {t.makeYours}
        </Link>
      </div>
    );
  }
  if (!data) return <PortfolioPageSkeleton />;

  return (
    <div className="pp-page">
      <PortfolioView data={data} card={data.card} t={t} />
      <button type="button" className="pp-share" onClick={share} style={{ "--pc-c": data.card?.color }}>
        <Share2 size={18} /> <span>{copied ? t.copied : t.share}</span>
      </button>
    </div>
  );
}
