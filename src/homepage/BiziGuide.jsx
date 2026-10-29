// Bizi for visitors (v3.2.0): the helper in the corner of the homepage answers what people ask before they sign up —
// prices (from the homepage settings), what BizHub does, the POS, Telegram, how to start — and ends with Sign up or
// "Chat with the BizHub team". No AI and nothing from anybody's account: the answers are in bizi-home.js (GUIDE),
// matched the same way as the dashboard Bizi's how-tos (EN / KM, Khmer written together, small typos).
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Mail, MessageCircle, Phone, Search, Send, X } from "lucide-react";
import { ROUTES } from "../config";
import { auth } from "../lib/auth";
import BiziFace from "../dashboard/bizi/BiziFace";
import { findHelp } from "../dashboard/bizi/help-find";
import { GUIDE } from "./bizi-home";
import { fill } from "./useHomepageData";
import PriceTag from "./PriceTag";

const SEEN = "bizhub_guide_seen";
const seen = () => {
  try {
    return localStorage.getItem(SEEN) === "1";
  } catch {
    return true;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(SEEN, "1");
  } catch {
    /* private window */
  }
};
const tel = (p) =>
  `tel:+855${String(p || "")
    .replace(/\D/g, "")
    .replace(/^0/, "")}`;

export default function BiziGuide({ t, lang, settings, services, vars, names, open, setOpen, onService }) {
  const [q, setQ] = useState("");
  const [pick, setPick] = useState(""); // a question tapped from the list
  const [note, setNote] = useState(false); // "Questions? Ask Bizi" the first time
  const input = useRef(null);
  const loggedIn = !!auth.getClientLogin();
  const list = useMemo(() => fill(GUIDE, vars), [vars]);
  const term = q.trim();

  // the first visit: a small note next to the bubble after a few seconds (once)
  useEffect(() => {
    if (seen()) return undefined;
    const a = setTimeout(() => setNote(true), 6000);
    const b = setTimeout(() => setNote(false), 16000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    markSeen();
    setNote(false);
    const f = setTimeout(() => input.current?.focus({ preventScroll: true }), 60);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => {
      clearTimeout(f);
      document.removeEventListener("keydown", esc);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // what the words are about: the answers, and the services they name ("restaurant", "ផ្ទះសំណាក់")
  const found = useMemo(() => (term.length >= 2 ? findHelp(term, 3, list).map((x) => x.a) : []), [term, list]);
  const svc = useMemo(() => {
    const ws = term.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
    if (!ws.length) return [];
    return services.filter((s) => ws.some((w) => `${names[s.key] || ""} ${s.key} ${s.type}`.toLowerCase().includes(w))).slice(0, 4);
  }, [term, services, names]);
  const answer = pick ? list.find((a) => a.id === pick) : found[0];
  const others = pick ? [] : found.slice(1);
  const popular = list.filter((a) => a.popular);

  const close = () => setOpen(false);
  const ask = (a) => {
    setPick(a.id);
    setQ("");
  };
  const back = () => {
    setPick("");
    setQ("");
    input.current?.focus();
  };
  const goTo = (go) =>
    go === "signup" ? (
      <Link className="btn btn-primary hx-g-btn" to={ROUTES.signUp} data-testid="hx-guide-signup">
        {t.guideSignup}
      </Link>
    ) : (
      <a className="btn btn-secondary hx-g-btn" href={go} onClick={close} data-testid="hx-guide-go">
        {t.guideGo} <ArrowRight size={15} aria-hidden="true" />
      </a>
    );
  const c = settings.contact || {};
  const talkHref = c.telegram_url || (c.phones?.[0] ? tel(c.phones[0]) : "#talk");

  const Answer = ({ a }) => (
    <div className="hx-g-answer" data-testid="hx-guide-answer">
      <b>{a[lang]?.q || a.en.q}</b>
      {(a[lang]?.steps || a.en.steps).map((s) => (
        <p key={s}>{s}</p>
      ))}
      {a.show === "prices" && (
        <ul className="hx-g-prices">
          {services
            .filter((s) => s.price?.coins)
            .map((s) => (
              <li key={s.key}>
                <button type="button" onClick={() => onService(s.key)}>
                  {names[s.key]}
                </button>
                <PriceTag t={t} price={s.price} lang={lang} />
              </li>
            ))}
        </ul>
      )}
      {a.show === "services" && (
        <div className="hx-g-chips">
          {services.map((s) => (
            <button key={s.key} type="button" onClick={() => onService(s.key)} data-testid={`hx-guide-svc-${s.key}`}>
              {names[s.key]}
            </button>
          ))}
        </div>
      )}
      {a.show === "contact" && (
        <div className="hx-g-contact">
          {(c.phones || []).filter(Boolean).map((p) => (
            <a key={p} href={tel(p)}>
              <Phone size={15} aria-hidden="true" /> {p}
            </a>
          ))}
          {c.telegram_url && (
            <a href={c.telegram_url} target="_blank" rel="noreferrer">
              <Send size={15} aria-hidden="true" /> Telegram {c.telegram || ""}
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`}>
              <Mail size={15} aria-hidden="true" /> {c.email}
            </a>
          )}
        </div>
      )}
      <div className="hx-g-acts">
        {a.go && goTo(a.go)}
        {a.go !== "signup" && !loggedIn && goTo("signup")}
      </div>
    </div>
  );

  return (
    <>
      {!open && (
        <div className="hx-guide-dock">
          {note && (
            <button type="button" className="hx-guide-note" onClick={() => setOpen(true)} data-testid="hx-guide-note">
              {t.guideOpen}
            </button>
          )}
          <button type="button" className="hx-guide-bubble" onClick={() => setOpen(true)} aria-label={t.guideOpen} title={t.guideOpen} data-testid="hx-guide-bubble">
            <BiziFace mood="idle" size={50} />
          </button>
        </div>
      )}
      {open && (
        <div className="hx-guide" role="dialog" aria-label="Bizi" data-testid="hx-guide">
          <div className="hx-g-top">
            <BiziFace mood={term && !answer && !svc.length ? "worried" : answer ? "talking" : "happy"} size={42} />
            <span>
              <b>Bizi</b>
              <small>{t.guideHi}</small>
            </span>
            <button type="button" className="hx-g-x" onClick={close} aria-label={t.guideClose} data-testid="hx-guide-close">
              <X size={18} />
            </button>
          </div>
          <div className="hx-g-body">
            {pick && (
              <button type="button" className="hx-g-back" onClick={back}>
                <ArrowLeft size={15} aria-hidden="true" /> {t.guideBack}
              </button>
            )}
            {answer && <Answer a={answer} />}
            {!pick && svc.length > 0 && (
              <div className="hx-g-svc">
                {svc.map((s) => (
                  <button key={s.key} type="button" onClick={() => onService(s.key)} data-testid={`hx-guide-hit-${s.key}`}>
                    <b>{names[s.key]}</b>
                    <PriceTag t={t} price={s.price} lang={lang} />
                  </button>
                ))}
              </div>
            )}
            {others.length > 0 && (
              <div className="hx-g-list">
                {others.map((a) => (
                  <button key={a.id} type="button" onClick={() => ask(a)}>
                    {a[lang]?.q || a.en.q}
                  </button>
                ))}
              </div>
            )}
            {term.length >= 2 && !answer && !svc.length && (
              <div className="hx-g-none" data-testid="hx-guide-none">
                <p>{t.guideNone}</p>
                <a className="btn btn-primary hx-g-btn" href={talkHref} target={talkHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  <MessageCircle size={16} aria-hidden="true" /> {t.guideTalk}
                </a>
              </div>
            )}
            {!term && !pick && (
              <div className="hx-g-list">
                <small>{t.guideTry}</small>
                {popular.map((a) => (
                  <button key={a.id} type="button" onClick={() => ask(a)} data-testid={`hx-guide-q-${a.id}`}>
                    {a[lang]?.q || a.en.q}
                  </button>
                ))}
                {list
                  .filter((a) => !a.popular)
                  .map((a) => (
                    <button key={a.id} type="button" className="quiet" onClick={() => ask(a)} data-testid={`hx-guide-q-${a.id}`}>
                      {a[lang]?.q || a.en.q}
                    </button>
                  ))}
              </div>
            )}
            {loggedIn && (
              <Link className="hx-g-mine" to={ROUTES.app}>
                {t.guideMine} <ArrowRight size={14} aria-hidden="true" />
              </Link>
            )}
          </div>
          <label className="hx-g-field">
            <Search size={17} aria-hidden="true" />
            <input
              ref={input}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPick("");
              }}
              placeholder={t.guidePh}
              aria-label={t.guidePh}
              data-testid="hx-guide-input"
            />
          </label>
        </div>
      )}
    </>
  );
}
