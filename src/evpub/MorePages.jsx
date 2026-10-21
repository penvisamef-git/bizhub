import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, Check, Loader2, MapPin, Rocket, Search, Star, Ticket, Trash2, X } from "lucide-react";
import { evPublic } from "../api/services";
import { forgetOrder, myTokens } from "./EvGrowPub";
import { timeOf, usd, useEvPubText, whenOf } from "./text";
import "./evpub.css";

const LangBtn = ({ lang, setLang, dark }) => (
  <button type="button" className={`evp-lang ${dark ? "dark" : ""}`} onClick={() => setLang(lang === "km" ? "en" : "km")}>
    {lang === "km" ? "EN" : "ខ្មែរ"}
  </button>
);
const dayOf = (d, lang) => (d ? new Date(d).toLocaleDateString(lang === "km" ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Phnom_Penh" }) : "");

// ======================================== /ev/my — the tickets of this phone ========================================
export function MyTicketsPage() {
  const { t, lang, setLang } = useEvPubText();
  const [rows, setRows] = useState(null);
  const load = useCallback(() => {
    const tokens = myTokens();
    if (!tokens.length) return setRows([]);
    evPublic
      .my(tokens)
      .then((r) => setRows(r.data))
      .catch(() => setRows([]));
  }, []);
  useEffect(() => {
    document.title = t.myTitle;
    load();
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  const now = Date.now();
  const end = (r) => new Date(r.event.ends_at || new Date(r.event.starts_at).getTime() + 4 * 3600000).getTime();
  const soon = (rows || []).filter((r) => end(r) >= now && !["rejected", "expired", "cancelled"].includes(r.status));
  const past = (rows || []).filter((r) => !soon.includes(r)).reverse();
  const card = (r) => (
    <div key={r.token} className="evp-my-row">
      <Link to={`/ev/o/${r.token}`} className="evp-my" data-testid="evp-my">
        <span className="evp-my-pic">{r.event.poster ? <img src={r.event.poster} alt="" /> : <Ticket size={22} />}</span>
        <span className="evp-my-main">
          <b>{r.event.title}</b>
          <small>
            <CalendarDays size={12} /> {dayOf(r.event.starts_at, lang)} · {timeOf(r.event.starts_at, lang)}
          </small>
          {r.event.venue && (
            <small>
              <MapPin size={12} /> {r.event.venue}
            </small>
          )}
        </span>
        <span className="evp-my-side">
          <b>{t.ticketsN.replace("{n}", r.qty)}</b>
          <em className={`st-${r.status}`}>{t.myStatus?.[r.status] || r.status}</em>
        </span>
      </Link>
      <button type="button" className="evp-my-x" onClick={() => (forgetOrder(r.token), load())} aria-label={t.myRemove} title={t.myRemove}>
        <Trash2 size={14} />
      </button>
    </div>
  );
  return (
    <div className="evp evp-light">
      <main className="evp-main evp-one">
        <div className="evp-one-top">
          <h1 className="evp-page-h">
            <Ticket size={22} /> {t.myTitle}
          </h1>
          <LangBtn lang={lang} setLang={setLang} dark />
        </div>
        <p className="evp-muted">{t.mySub}</p>
        {!rows ? (
          <div className="evp-center-in">
            <Loader2 size={26} className="evp-spin" />
          </div>
        ) : !rows.length ? (
          <section className="evp-card evp-state">
            <Ticket size={34} />
            <p>{t.myNone}</p>
            <Link className="evp-btn" to="/events">
              {t.discTitle}
            </Link>
          </section>
        ) : (
          <>
            {soon.length > 0 && <h2 className="evp-my-h">{t.myUpcoming}</h2>}
            {soon.map(card)}
            {past.length > 0 && <h2 className="evp-my-h">{t.myPast}</h2>}
            {past.map(card)}
          </>
        )}
        <p className="evp-muted center">{t.myTg}</p>
      </main>
    </div>
  );
}

// ======================================== /ev/f/:token — feedback ========================================
export function FeedbackPage() {
  const { token } = useParams();
  const { t, lang, setLang } = useEvPubText();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [f, setF] = useState({ rating: 0, answer: "", comment: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    evPublic
      .feedback(token)
      .then((r) => {
        setD(r.data);
        document.title = `${t.fbTitle} · ${r.data.event.title}`;
        if (r.data.mine) setF({ rating: r.data.mine.rating, answer: r.data.mine.answer || "", comment: r.data.mine.comment || "" });
      })
      .catch((e) => setError(e.message || "error"));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await evPublic.sendFeedback(token, f);
      setDone(true);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  if (error)
    return (
      <div className="evp evp-center">
        <LangBtn lang={lang} setLang={setLang} />
        <Star size={44} />
        <h1>{t.notFound}</h1>
      </div>
    );
  if (!d)
    return (
      <div className="evp evp-center">
        <Loader2 size={30} className="evp-spin" />
      </div>
    );
  return (
    <div className="evp evp-light">
      <main className="evp-main evp-one">
        <div className="evp-one-top">
          <LangBtn lang={lang} setLang={setLang} dark />
        </div>
        <section className="evp-card evp-fb-head">
          {d.event.poster ? <img src={d.event.poster} alt="" /> : <Ticket size={28} />}
          <div>
            <b>{d.event.title}</b>
            <small className="evp-muted">
              {whenOf(d.event.starts_at, lang)} {d.org.name ? `· ${d.org.name}` : ""}
            </small>
          </div>
        </section>
        {done ? (
          <section className="evp-card evp-state ok" data-testid="evp-fb-done">
            <span className="evp-state-ic ok">
              <Check size={28} />
            </span>
            <h2>{t.fbDone}</h2>
            <Link className="evp-mini center" to={`/ev/o/${token}`}>
              {t.myAll}
            </Link>
          </section>
        ) : !d.open ? (
          <section className="evp-card evp-state">
            <p>{t.fbNotYet}</p>
          </section>
        ) : (
          <form className="evp-card evp-fb-form" onSubmit={send} data-testid="evp-fb-form">
            <h2>{t.fbAsk}</h2>
            <div className="evp-fb-stars" role="radiogroup" aria-label={t.fbStars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={f.rating >= n ? "on" : ""} onClick={() => setF({ ...f, rating: n })} aria-label={`${n}`} data-testid={`evp-star-${n}`}>
                  <Star size={36} fill={f.rating >= n ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            {d.question && (
              <label className="evp-field">
                <span>{d.question}</span>
                <input value={f.answer} maxLength={500} onChange={(e) => setF({ ...f, answer: e.target.value })} />
              </label>
            )}
            <label className="evp-field">
              <span>{t.fbComment}</span>
              <textarea rows={4} value={f.comment} maxLength={1000} placeholder={t.fbCommentPh} onChange={(e) => setF({ ...f, comment: e.target.value })} />
            </label>
            {err && <div className="evp-err">{err}</div>}
            <button type="submit" className="evp-btn" disabled={busy || !f.rating} data-testid="evp-fb-send">
              {busy ? <Loader2 size={18} className="evp-spin" /> : <Star size={18} />} {t.fbSend}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

// ======================================== /events — Events in Cambodia ========================================
export function DiscoverPage() {
  const { t, lang, setLang } = useEvPubText();
  const qs = new URLSearchParams(window.location.search);
  const [q, setQ] = useState(qs.get("q") || "");
  const [cat, setCat] = useState(qs.get("category") || "");
  const [city, setCity] = useState(qs.get("city") || "");
  const [when, setWhen] = useState(qs.get("when") || "");
  const [free, setFree] = useState(qs.get("kind") === "free");
  const [d, setD] = useState({ rows: null, page: 1, pages: 1, cities: [], categories: [] });
  const [more, setMore] = useState(false);
  const params = useMemo(() => ({ q: q.trim(), category: cat, city, when, kind: free ? "free" : "" }), [q, cat, city, when, free]);
  useEffect(() => {
    document.title = t.discTitle;
    const h = setTimeout(() => {
      evPublic
        .discover({ ...params, page: 1 })
        .then((r) => setD((p) => ({ rows: r.data, page: 1, pages: r.pages, cities: r.cities?.length ? r.cities : p.cities, categories: r.categories || p.categories })))
        .catch(() => setD((p) => ({ ...p, rows: [] })));
      const u = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
      window.history.replaceState(null, "", `${window.location.pathname}${u.toString() ? `?${u}` : ""}`);
    }, 250);
    return () => clearTimeout(h);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadMore = async () => {
    setMore(true);
    try {
      const r = await evPublic.discover({ ...params, page: d.page + 1 });
      setD((p) => ({ ...p, rows: [...p.rows, ...r.data], page: r.page, pages: r.pages }));
    } finally {
      setMore(false);
    }
  };
  return (
    <div className="evp evp-light evp-disc">
      <header className="evp-disc-hero">
        <div className="evp-disc-in">
          <div className="evp-disc-top">
            <Link to="/" className="evp-disc-brand">
              BizHub
            </Link>
            <span style={{ display: "flex", gap: 8 }}>
              <Link to="/ev/my" className="evp-disc-my">
                <Ticket size={15} /> {t.myTitle}
              </Link>
              <LangBtn lang={lang} setLang={setLang} />
            </span>
          </div>
          <h1>{t.discTitle}</h1>
          <p>{t.discSub}</p>
          <label className="evp-disc-search">
            <Search size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.discSearch} data-testid="evp-disc-q" />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="clear">
                <X size={16} />
              </button>
            )}
          </label>
        </div>
      </header>
      <main className="evp-disc-in evp-disc-main">
        <div className="evp-disc-chips">
          {["", ...(d.categories || [])].map((c) => (
            <button key={c || "all"} type="button" className={cat === c ? "on" : ""} onClick={() => setCat(c)}>
              {c ? t.cats[c] || c : t.discAll}
            </button>
          ))}
        </div>
        <div className="evp-disc-filters">
          <select value={when} onChange={(e) => setWhen(e.target.value)}>
            {Object.entries(t.discWhen).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">{t.discAnyCity}</option>
            {d.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="evp-disc-free">
            <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} /> {t.discFree}
          </label>
        </div>
        {!d.rows ? (
          <div className="evp-center-in">
            <Loader2 size={26} className="evp-spin" />
          </div>
        ) : !d.rows.length ? (
          <section className="evp-card evp-state">
            <Search size={30} />
            <p>{t.discNone}</p>
          </section>
        ) : (
          <div className="evp-disc-grid">
            {d.rows.map((e) => (
              <Link key={e.slug} to={`/ev/${e.slug}`} className={`evp-disc-card ${e.featured ? "feat" : ""}`} data-testid="evp-disc-card">
                <span className="evp-disc-pic">
                  {e.poster ? <img src={e.poster} alt="" loading="lazy" /> : <Ticket size={34} />}
                  <span className="evp-disc-date">
                    <b>{new Date(e.starts_at).toLocaleDateString("en-GB", { day: "numeric", timeZone: "Asia/Phnom_Penh" })}</b>
                    <small>{new Date(e.starts_at).toLocaleDateString(lang === "km" ? "km-KH" : "en-GB", { month: "short", timeZone: "Asia/Phnom_Penh" })}</small>
                  </span>
                  {e.featured && (
                    <span className="evp-disc-feat">
                      <Rocket size={11} /> {t.discFeatured}
                    </span>
                  )}
                  {e.sold_out && <span className="evp-disc-out">{t.discSoldOut}</span>}
                </span>
                <span className="evp-disc-body">
                  {e.category && <small className="evp-disc-cat">{t.cats[e.category] || e.category}</small>}
                  <b>{e.title}</b>
                  <small>
                    <CalendarDays size={12} /> {dayOf(e.starts_at, lang)} · {timeOf(e.starts_at, lang)}
                    {e.shows > 1 ? ` · ${t.discShows.replace("{n}", e.shows)}` : ""}
                  </small>
                  {(e.venue || e.city) && (
                    <small>
                      <MapPin size={12} /> {[e.venue, e.city].filter(Boolean).join(" · ")}
                    </small>
                  )}
                  <span className="evp-disc-foot">
                    <em>{e.org.name}</em>
                    <b>{e.kind === "free" || !e.from ? t.free : t.discFrom.replace("{price}", usd(e.from))}</b>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
        {d.rows && d.page < d.pages && (
          <button type="button" className="evp-btn ghost evp-disc-more" onClick={loadMore} disabled={more}>
            {more ? <Loader2 size={17} className="evp-spin" /> : null} {t.discMore}
          </button>
        )}
        <a className="evp-brand" href="/" target="_blank" rel="noreferrer">
          {t.madeWith}
        </a>
      </main>
    </div>
  );
}
