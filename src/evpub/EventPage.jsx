import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Armchair, CalendarDays, ChevronLeft, Clock, Loader2, MapPin, Minus, Phone, Plus, Send, Ticket, UserPlus } from "lucide-react";
import { evPublic } from "../api/services";
import { timeOf, usd, useEvPubText, whenOf } from "./text";
import { pageClass, pageStyle } from "./pageThemes";
import { NewsAndDocs, PromoField, QuestionsForm, SeatPicker, ShowPicker, seatLabel } from "./EvExtras";
import { BundleChips, CalendarLinks, MapCard, Sponsors, TypePrice, WaitlistBox, bundleCost, useRef_ } from "./EvGrowPub";
import "./pagethemes.css";
import "./evpub.css";
import PoweredBy from "../components/PoweredBy";

// /ev/:slug — an event: (pick a showtime) pick tickets (or seats), give your name + phone (+ answers, promo code)
//             → the order page (pay + screenshot, or free tickets at once)
export default function EventPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { t, lang, setLang } = useEvPubText();
  const [ev, setEv] = useState(null);
  const [error, setError] = useState("");
  const [qty, setQty] = useState({});
  const [show, setShow] = useState("");
  const [seats, setSeats] = useState([]);
  const [taken, setTaken] = useState([]);
  const [step, setStep] = useState("pick"); // pick | info
  const [f, setF] = useState({ name: "", phone: "", note: "" });
  const [answers, setAnswers] = useState({});
  const [names, setNames] = useState([]);
  const [promo, setPromo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef_(slug);
  const load = useCallback(
    () =>
      evPublic
        .event(slug)
        .then((r) => {
          setEv(r.data);
          document.title = r.data.title;
          // the first show still on sale
          if (r.data.shows?.length) setShow((cur) => cur || r.data.shows.find((s) => s.open && Object.values(s.left || {}).some((n) => n > 0))?.key || "");
        })
        .catch((e) => setError(e.message || "error")),
    [slug],
  );
  useEffect(() => {
    load();
  }, [load]);
  const seated = useCallback((key) => !!ev?.seating?.on && (ev.seating.sections || []).some((s) => s.type_key === key), [ev]);
  const hasMap = !!ev?.seating?.on && ev.types.some((x) => seated(x.key));
  const loadTaken = useCallback(() => {
    if (hasMap) evPublic.seats(slug, show).then((r) => setTaken(r.data.taken)).catch(() => {});
  }, [hasMap, slug, show]);
  useEffect(() => {
    loadTaken();
  }, [loadTaken]);
  const pickShow = (k) => {
    setShow(k);
    setQty({});
    setSeats([]);
    setPromo(null);
  };
  const free = ev?.kind === "free";
  const sh = ev?.shows?.find((s) => s.key === show);
  const leftOf = (x) => (ev?.shows?.length ? (sh?.left?.[x.key] ?? 0) : x.left);
  // seated types count their seats, the others their stepper
  const seatsOf = (key) => seats.filter((id) => (ev.seating.sections || []).some((s) => s.type_key === key && id.startsWith(`${s.key}:`)));
  const lines = useMemo(
    () =>
      ev
        ? ev.types
            .map((x) => ({ key: x.key, qty: seated(x.key) ? seatsOf(x.key).length : qty[x.key] || 0, price: x.now ?? x.price, name: x.name, bundles: x.bundles || [] }))
            .filter((l) => l.qty > 0)
        : [],
    [ev, qty, seats, seated], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((a, l) => a + l.qty * l.price, 0);
  // group deals: what the best mix saves
  const bundleOff = Math.round(lines.reduce((a, l) => a + (l.bundles.length ? l.qty * l.price - bundleCost(l.price, l.qty, l.bundles) : 0), 0) * 100) / 100;
  const total = Math.max(0, subtotal - bundleOff - (promo?.off || 0));
  const max = ev?.max_per_order || 10;
  const change = (x, d) =>
    setQty((q) => {
      const cur = q[x.key] || 0;
      const next = Math.max(0, Math.min(leftOf(x), cur + d, max - count + cur));
      return { ...q, [x.key]: next };
    });
  const toggleSeat = (id) => {
    setSeats((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    setPromo(null);
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await evPublic.order(slug, { ...f, show: show || undefined, lines: lines.map(({ key, qty: n }) => ({ key, qty: n })), seats, answers, names, promo: promo?.code, ref: ref || undefined });
      nav(`/ev/o/${r.data.token}`);
    } catch (x) {
      setErr(x.message);
      setBusy(false);
      const code = x.body?.code;
      if (code === "seat_taken") {
        setSeats([]);
        setStep("pick");
        loadTaken();
      }
      if (["sold_out", "seat_taken", "show_closed"].includes(code)) load();
      if (code?.startsWith("promo")) setPromo(null);
    }
  };

  const lang_ = (
    <button type="button" className="evp-lang" onClick={() => setLang(lang === "km" ? "en" : "km")}>
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
  if (!ev)
    return (
      <div className="evp evp-center">
        <Loader2 size={30} className="evp-spin" />
      </div>
    );
  const open = ev.sale === "open" && (!ev.shows?.length || !!sh);
  const when = sh?.starts_at || ev.starts_at;
  // every ticket type sold out (for this show) → the waitlist
  const soldOut = ev.types.length > 0 && ev.types.every((x) => leftOf(x) <= 0);
  return (
    <div className={`evp ${pageClass(ev.page_theme)}`} style={pageStyle(ev.page_theme, ev.theme, ev.page_colors, ev.theme_colors)}>
      <header className="evp-hero">
        {ev.poster && <div className="evp-hero-bg" style={{ backgroundImage: `url(${ev.poster})` }} />}
        <div className="evp-hero-in">
          {lang_}
          {ev.poster ? <img className="evp-poster" src={ev.poster} alt="" /> : <div className="evp-poster none"><Ticket size={48} /></div>}
          <div className="evp-hero-text">
            {ev.sale === "cancelled" && <span className="evp-flag bad">{t.cancelled}</span>}
            <h1 data-testid="evp-title">{ev.title}</h1>
            <div className="evp-facts">
              <span>
                <CalendarDays size={16} /> {whenOf(when, lang)}
              </span>
              <span>
                <Clock size={16} /> {timeOf(when, lang)}
                {!ev.shows?.length && ev.ends_at ? ` – ${timeOf(ev.ends_at, lang)}` : ""}
              </span>
              {ev.venue && (
                <span>
                  <MapPin size={16} /> {ev.venue}
                  {ev.map_url && (
                    <a href={ev.map_url} target="_blank" rel="noreferrer">
                      {t.map}
                    </a>
                  )}
                </span>
              )}
            </div>
            <CalendarLinks ev={ev} start={when} end={sh?.ends_at} show={show} t={t} />
            {ev.org?.name && (
              <div className="evp-org">
                {ev.org.logo && <img src={ev.org.logo} alt="" />}
                <span>{t.by.replace("{name}", ev.org.name)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="evp-main">
        {step === "pick" ? (
          <>
            {ev.shows?.length > 0 && ev.sale === "open" && (
              <section className="evp-card">
                <h2>{t.pickShow}</h2>
                <ShowPicker ev={ev} value={show} onChange={pickShow} t={t} lang={lang} />
              </section>
            )}
            <section className="evp-card">
              <h2>{free ? t.register : t.pick}</h2>
              {!open && <div className="evp-closed">{ev.sale === "cancelled" ? t.cancelled : t.notSelling}</div>}
              <div className="evp-types">
                {ev.types.map((x) => {
                  const isSeat = seated(x.key);
                  const n = isSeat ? seatsOf(x.key).length : qty[x.key] || 0;
                  const left = leftOf(x);
                  const out = left <= 0;
                  return (
                    <div key={x.key} className={`evp-type ${n ? "on" : ""} ${out ? "out" : ""}`} data-testid="evp-type">
                      <div className="evp-type-info">
                        <b>{x.name}</b>
                        {x.note && <small>{x.note}</small>}
                        {!free && <BundleChips x={x} t={t} />}
                        <span className="evp-type-left">{out ? t.soldOut : left <= 10 ? t.fewLeft.replace("{n}", left) : t.left.replace("{n}", left)}</span>
                      </div>
                      <div className="evp-type-side">
                        <TypePrice x={x} free={free} t={t} />
                        {open && !out && !isSeat && (
                          <div className="evp-stepper">
                            <button type="button" onClick={() => change(x, -1)} disabled={!n} aria-label="-">
                              <Minus size={16} />
                            </button>
                            <b data-testid="evp-qty">{n}</b>
                            <button type="button" onClick={() => change(x, 1)} disabled={n >= left || count >= max} aria-label="+" data-testid="evp-plus">
                              <Plus size={16} />
                            </button>
                          </div>
                        )}
                        {open && !out && isSeat && (
                          <span className="evp-seat-count">
                            <Armchair size={15} /> {n}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {open && <small className="evp-muted">{t.maxPer.replace("{n}", max)}</small>}
            </section>
            {open && hasMap && (
              <section className="evp-card" data-testid="evp-seatmap">
                <h2>
                  <Armchair size={18} /> {t.pickSeats}
                </h2>
                <p className="evp-muted">{t.pickSeatsSub.replace("{n}", seats.length)}</p>
                <div className="evp-seat-legend">
                  <span>
                    <i className="evp-seat" /> {t.seatFree}
                  </span>
                  <span>
                    <i className="evp-seat taken" /> {t.seatTaken}
                  </span>
                  <span>
                    <i className="evp-seat mine" /> {t.seatYours}
                  </span>
                </div>
                {ev.types
                  .filter((x) => seated(x.key) && leftOf(x) > 0)
                  .map((x) => (
                    <div key={x.key} className="evp-seat-type">
                      <b>
                        {x.name} · {free || !(x.now ?? x.price) ? t.free : usd(x.now ?? x.price)}
                      </b>
                      <SeatPicker ev={ev} typeKey={x.key} taken={taken} picked={seats} onToggle={toggleSeat} max={max - count + seatsOf(x.key).length} />
                    </div>
                  ))}
              </section>
            )}
          </>
        ) : (
          <form className="evp-card" onSubmit={submit}>
            <button type="button" className="evp-back" onClick={() => setStep("pick")}>
              <ChevronLeft size={16} /> {t.back}
            </button>
            <h2>{t.yourInfo}</h2>
            <p className="evp-muted">{t.yourInfoSub}</p>
            <div className="evp-sum">
              {sh && (
                <div>
                  <span>
                    <CalendarDays size={14} /> {whenOf(sh.starts_at, lang)} · {timeOf(sh.starts_at, lang)}
                  </span>
                </div>
              )}
              {lines.map((l) => (
                <div key={l.key}>
                  <span>
                    {l.qty} × {l.name}
                    {seated(l.key) && <small className="evp-muted"> · {seatsOf(l.key).map((id) => seatLabel(ev, id)).join(", ")}</small>}
                  </span>
                  <b>{free || !l.price ? t.free : usd(l.price * l.qty)}</b>
                </div>
              ))}
              {bundleOff > 0 && (
                <div className="evp-sum-off" data-testid="evp-bundle-off">
                  <span>{t.bundleOff}</span>
                  <b>−{usd(bundleOff)}</b>
                </div>
              )}
              {promo && (
                <div className="evp-sum-off">
                  <span>{t.promoOff.replace("{code}", promo.code).replace("{amt}", "")}</span>
                  <b>−{usd(promo.off)}</b>
                </div>
              )}
              {!free && subtotal > 0 && (
                <div className="evp-sum-total">
                  <span>{t.total}</span>
                  <b>{usd(total)}</b>
                </div>
              )}
            </div>
            <label className="evp-field">
              <span>{t.name}</span>
              <input value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" required data-testid="evp-name" />
            </label>
            <label className="evp-field">
              <span>{t.phone}</span>
              <input value={f.phone} inputMode="tel" maxLength={20} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" placeholder="012 345 678" required data-testid="evp-phone" />
            </label>
            <QuestionsForm ev={ev} answers={answers} setAnswers={setAnswers} names={names} setNames={setNames} count={count} t={t} />
            {ev.promos && !free && subtotal > 0 && <PromoField slug={slug} lines={lines} applied={promo} onApply={setPromo} t={t} api={evPublic} />}
            <label className="evp-field">
              <span>{t.note}</span>
              <input value={f.note} maxLength={300} onChange={(e) => setF({ ...f, note: e.target.value })} />
            </label>
            {err && <div className="evp-err">{err}</div>}
            <button type="submit" className="evp-btn" disabled={busy || !f.name.trim() || f.phone.replace(/\D/g, "").length < 8} data-testid="evp-buy">
              {busy ? <Loader2 size={18} className="evp-spin" /> : free || total === 0 ? <UserPlus size={18} /> : <Send size={18} />} {busy ? t.sending : free || total === 0 ? t.getTickets : t.buy}
            </button>
          </form>
        )}

        {step === "pick" && ev.waitlist && open && soldOut && <WaitlistBox slug={slug} ev={ev} show={show} t={t} />}
        {step === "pick" && <NewsAndDocs ev={ev} t={t} lang={lang} />}
        {step === "pick" && <Sponsors list={ev.sponsors} t={t} />}
        {step === "pick" && <MapCard ev={ev} t={t} />}
        {(ev.about || ev.terms) && step === "pick" && (
          <section className="evp-card evp-about">
            {ev.about && (
              <>
                <h2>{t.about}</h2>
                <p>{ev.about}</p>
              </>
            )}
            {ev.terms && (
              <>
                <h3>{t.rules}</h3>
                <p className="evp-muted">{ev.terms}</p>
              </>
            )}
          </section>
        )}
        {(ev.org?.phone || ev.org?.telegram) && (
          <section className="evp-contact">
            <span>{t.contact}</span>
            {ev.org.phone && (
              <a href={`tel:${ev.org.phone.replace(/[^+\d]/g, "")}`}>
                <Phone size={14} /> {ev.org.phone}
              </a>
            )}
            {ev.org.telegram && (
              <a href={`https://t.me/${ev.org.telegram.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "")}`} target="_blank" rel="noreferrer">
                <Send size={14} /> {ev.org.telegram}
              </a>
            )}
          </section>
        )}
        {ev.brand && (
          <>
            <a className="evp-brand" href="/" target="_blank" rel="noreferrer">
              {t.madeWith}
            </a>
            <PoweredBy lang={lang} className="evp-powered" />
          </>
        )}
      </main>

      {step === "pick" && count > 0 && (
        <div className="evp-bar">
          <div>
            <small>{t.ticketsN.replace("{n}", count)}</small>
            <b>{free || !subtotal ? t.free : usd(subtotal - bundleOff)}</b>
            {bundleOff > 0 && <small className="evp-bar-save">{t.youSave.replace("{amt}", usd(bundleOff))}</small>}
          </div>
          <button type="button" className="evp-btn" onClick={() => (setStep("info"), window.scrollTo({ top: 0, behavior: "smooth" }))} data-testid="evp-continue">
            {t.continue}
          </button>
        </div>
      )}
    </div>
  );
}
