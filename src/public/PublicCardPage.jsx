import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Share2 } from "lucide-react";
import { publicGet } from "../api/client";
import Logo from "../components/Logo";
import CardView, { shade } from "../namecard/CardView";
import { useCardText } from "../namecard/text";
import { ROUTES } from "../config";
import "./public-card.css";
import { CardPageSkeleton } from "../components/skeleton/Skeleton";

// Public digital name card: /public/card/:username
export default function PublicCardPage() {
  const { username } = useParams();
  const c = useCardText();
  const [card, setCard] = useState(null);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    publicGet(`/card/${encodeURIComponent(username)}`)
      .then((r) => alive && setCard(r.data))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [username]);

  useEffect(() => {
    if (card) document.title = `${card.name || card.business_name} · BizHub`;
  }, [card]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) return await navigator.share({ title: card?.name, url });
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
        <h1>{c.notFoundTitle}</h1>
        <p>{c.notFoundSub}</p>
        <Link className="btn btn-primary" to={ROUTES.signUp}>
          {c.makeYours}
        </Link>
      </div>
    );
  }
  if (!card) return <CardPageSkeleton />;

  return (
    <main className="pc-page" style={{ "--pc-bg": shade(card.color, 90), "--pc-c": card.color }}>
      <div className="pc-wrap">
        <CardView card={card} labels={{ fields: c.fields, viewPortfolio: c.viewPortfolio }} />
        <div className="pc-actions">
          <button type="button" className="pc-share" onClick={share}>
            <Share2 size={16} /> {copied ? c.copied : c.share}
          </button>
          <Link to={ROUTES.signUp} className="pc-make">
            {c.makeYours}
          </Link>
        </div>
      </div>
    </main>
  );
}
