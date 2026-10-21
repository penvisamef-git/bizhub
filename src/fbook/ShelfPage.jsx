import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { publicGet } from "../api/client";
import ShelfView, { flyOpen } from "./ShelfView";
import { FB_TEXT, startLang } from "./text";

// /f/:slug (the whole library) and /fc/:slug (one category of it)
export default function ShelfPage({ kind = "shelf" }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = () =>
    publicGet(`/${kind === "cat" ? "fb-cat" : "fb"}/${encodeURIComponent(slug)}`)
      .then((r) => {
        setData(r.data);
        setError(null);
        document.title = r.data.category ? `${r.data.category.name} · ${r.data.title}` : r.data.title;
      })
      .catch((e) => setError(e));
  useEffect(() => {
    setData(null);
    load();
    import("./BookPage").catch(() => {}); // the reader is ready when a book is opened
  }, [slug, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  if (error) {
    const t = FB_TEXT[startLang("km")];
    return (
      <div className="fr fr-plain">
        <div className="fr-off">
          <BookOpen size={46} />
          <h1>{t.offTitle}</h1>
          <p>{t.offSub}</p>
          {error.code === "NETWORK" && (
            <button type="button" onClick={load}>
              {t.retry}
            </button>
          )}
        </div>
      </div>
    );
  }
  if (!data)
    return (
      <div className="fr fr-plain">
        <div className="fr-off">
          <span className="fl-loader" />
        </div>
      </div>
    );
  return <ShelfView data={data} onOpen={(b, el) => flyOpen(el, () => navigate(`/b/${b.slug}`))} />;
}
