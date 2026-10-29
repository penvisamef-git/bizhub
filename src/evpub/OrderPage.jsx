import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, CalendarDays, Check, CheckCircle2, Clock, Copy, Download, ExternalLink, Hourglass, Loader2, MapPin, Maximize2, Phone, Send, Ticket, Upload, X, XCircle } from "lucide-react";
import { TicketCard } from "./TicketCard";
import { KhqrCard } from "./Khqr";
import { pageClass, pageStyle } from "./pageThemes";
import { NewsAndDocs, TelegramBox, seatLabel, showOf } from "./EvExtras";
import { CalendarLinks, FeedbackLink, MapCard, RequestBox, Sponsors, rememberOrder } from "./EvGrowPub";
import "./pagethemes.css";
import { evPublic } from "../api/services";
import { timeOf, usd, useEvPubText, whenOf } from "./text";
import "./evpub.css";
import PoweredBy from "../components/PoweredBy";

export { TicketCard } from "./TicketCard";

const left = (until) => {
  const s = Math.max(0, Math.floor((new Date(until).getTime() - Date.now()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// /ev/o/:token — the buyer's order
export default function OrderPage() {
  const { token } = useParams();
  const { t, lang, setLang } = useEvPubText();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");
  const [view, setView] = useState(false);
  const [payKey, setPayKey] = useState("");
  const [manual, setManual] = useState(false);
  const [, tick] = useState(0);
  const pick = useRef(null);
  const payKeyRef = useRef("");
  const load = useCallback(
    () =>
      evPublic
        .view(token)
        .then((r) => {
          setD(r.data);
          document.title = r.data.event.title;
          rememberOrder(token);
        })
        .catch((e) => setError(e.message || "error")),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);
  // waiting for the organiser: look again every 10 s (30 s before the screenshot — the organiser may approve
  // straight from the bank app); the hold timer ticks every second
  const st = d?.order?.status;
  useEffect(() => {
    if (st !== "review" && st !== "pending") return undefined;
    const a = setInterval(() => tick((n) => n + 1), 1000);
    const b = setInterval(load, st === "review" ? 10000 : 30000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [st, load]);
  // automatic KHQR: ask Bakong (through us) every 5 s while the buyer is on the page
  const autoKey = st === "pending" ? d?.khqr?.key : "";
  useEffect(() => {
    if (!autoKey) return undefined;
    let stop = false;
    const c = setInterval(() => {
      if (document.hidden) return;
      evPublic
        .check(token)
        .then((r) => {
          if (!stop && r.data?.status && r.data.status !== "pending") load();
        })
        .catch(() => {});
    }, 5000);
    return () => {
      stop = true;
      clearInterval(c);
    };
  }, [autoKey, token, load]);
  const copy = (v) => {
    navigator.clipboard?.writeText(v).catch(() => {});
    setCopied(v);
    setTimeout(() => setCopied(""), 1500);
  };
  const send = async () => {
    setBusy(true);
    setErr("");
    try {
      await evPublic.proof(token, file, ref, payKeyRef.current);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  const lang_ = (
    <button type="button" className="evp-lang dark" onClick={() => setLang(lang === "km" ? "en" : "km")}>
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
  if (!d)
    return (
      <div className="evp evp-center">
        <Loader2 size={30} className="evp-spin" />
      </div>
    );
  const { order: o, event: ev, pay, tickets, org } = d;
  const at = showOf(ev, o.show)?.starts_at || ev.starts_at;
  // several payment methods: the buyer picks one
  const pays = d.pays?.length ? d.pays : pay ? [pay] : [];
  const pm = pays.find((x) => x.key === payKey) || pays[0] || pay;
  payKeyRef.current = pm?.key || "";
  const kq = d.khqr && pm?.key === d.khqr.key ? d.khqr : null;
  const showManual = !kq || manual;
  const holdOver = o.status === "pending" && o.hold_until && new Date(o.hold_until) < new Date();
  const free = o.total === 0;
  return (
    <div className={`evp evp-light ${pageClass(ev.page_theme)}`} style={pageStyle(ev.page_theme, ev.theme, ev.page_colors, ev.theme_colors)}>
      <header className="evp-top">
        {ev.poster ? <img src={ev.poster} alt="" /> : <span className="evp-top-ic"><Ticket size={22} /></span>}
        <div>
          <b>{ev.title}</b>
          <small>
            <CalendarDays size={13} /> {whenOf(at, lang)} · {timeOf(at, lang)}
          </small>
          {ev.venue && (
            <small>
              <MapPin size={13} /> {ev.venue}
            </small>
          )}
        </div>
        {lang_}
      </header>
      <main className="evp-main">
        <div className="evp-orderno">
          <span>{t.orderNo.replace("{no}", o.no)}</span>
          <b>{free ? t.free : usd(o.total)}</b>
        </div>
        <div className="evp-sum card">
          {o.lines.map((l) => (
            <div key={l.key}>
              <span>
                {l.qty} × {l.name}
              </span>
              <b>{!l.price ? t.free : usd(l.price * l.qty)}</b>
            </div>
          ))}
          {o.seats?.length > 0 && (
            <div>
              <span className="evp-muted">
                {t.seat}: {o.seats.map((id) => seatLabel(ev, id)).join(", ")}
              </span>
            </div>
          )}
          {o.bundle_off > 0 && (
            <div className="evp-sum-off">
              <span>{t.bundleOff}</span>
              <b>−{usd(o.bundle_off)}</b>
            </div>
          )}
          {o.promo && (
            <div className="evp-sum-off">
              <span>{t.promoOff.replace("{code}", o.promo.code).replace("{amt}", "")}</span>
              <b>−{usd(o.promo.off)}</b>
            </div>
          )}
        </div>
        {ev.sale === "cancelled" && <div className="evp-closed">{t.evCancelled}</div>}
        {["pending", "review", "paid"].includes(o.status) && <TelegramBox tg={d.tg} t={t} />}

        {/* ---------- pay + screenshot ---------- */}
        {o.status === "pending" && !holdOver && pm && (
          <section className="evp-card" data-testid="evp-pay">
            <h2>{t.payTitle.replace("{amt}", usd(o.total))}</h2>
            <p className="evp-steps">{kq ? t.khqrSteps : t.paySteps.replaceAll("{amt}", usd(o.total))}</p>
            {pays.length > 1 && (
              <div className="evp-pays" role="tablist">
                {pays.map((x) => (
                  <button key={x.key} type="button" role="tab" aria-selected={pm.key === x.key} className={pm.key === x.key ? "on" : ""} onClick={() => setPayKey(x.key)} data-testid="evp-pay-tab">
                    {x.qr ? <img src={x.qr} alt="" /> : null}
                    {x.bank || x.account_name || "Pay"}
                  </button>
                ))}
              </div>
            )}
            <div className="evp-hold">
              <Hourglass size={15} /> {t.holdLeft.replace("{t}", left(o.hold_until))}
            </div>
            {kq && <KhqrCard k={kq} no={o.no} t={t} />}
            {kq && (
              <button type="button" className="evp-mini center" onClick={() => setManual(!manual)} data-testid="evp-khqr-manual">
                {t.khqrOther}
              </button>
            )}
            {showManual && pm.qr && (
              <button type="button" className="evp-payqr" onClick={() => setView(true)} aria-label={t.viewQr}>
                <img src={pm.qr} alt="QR" data-testid="evp-qr" />
                <span>
                  <Maximize2 size={14} /> {t.viewQr}
                </span>
              </button>
            )}
            {showManual && pm.link && (
              <a className="evp-btn" href={pm.link} target="_blank" rel="noreferrer" data-testid="evp-paylink">
                <ExternalLink size={17} /> {pm.bank ? t.payWith.replace("{bank}", pm.bank) : t.payApp}
              </a>
            )}
            {showManual && pm.qr && (
              <a className="evp-mini center" href={pm.qr} download={`pay-${o.no}`} target="_blank" rel="noreferrer">
                <Download size={14} /> {t.saveQr}
              </a>
            )}
            {showManual && (
            <>
            <div className="evp-acc">
              {pm.account_name && (
                <div>
                  <small>{t.accName}</small>
                  <b>{pm.account_name}</b>
                </div>
              )}
              {pm.account_no && (
                <div>
                  <small>{t.accNo}</small>
                  <b>
                    {pm.account_no}
                    <button type="button" onClick={() => copy(pm.account_no)}>
                      {copied === pm.account_no ? <Check size={13} /> : <Copy size={13} />} {copied === pm.account_no ? t.copied : t.copy}
                    </button>
                  </b>
                </div>
              )}
              {pm.note && <p className="evp-muted">{pm.note}</p>}
            </div>
            <div className="evp-upload">
              <b>{t.upload}</b>
              <button type="button" className={`evp-proof ${file ? "has" : ""}`} onClick={() => pick.current?.click()}>
                {preview ? <img src={preview} alt="" /> : <Upload size={22} />}
                <span>{file ? file.name : t.uploadPick}</span>
              </button>
              <input
                ref={pick}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                data-testid="evp-proof-file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setFile(f);
                  setPreview(URL.createObjectURL(f));
                }}
              />
              <label className="evp-field">
                <span>{t.ref}</span>
                <input value={ref} maxLength={80} onChange={(e) => setRef(e.target.value)} />
              </label>
              {err && <div className="evp-err">{err}</div>}
              <button type="button" className="evp-btn" onClick={send} disabled={!file || busy} data-testid="evp-send">
                {busy ? <Loader2 size={18} className="evp-spin" /> : <Send size={18} />} {t.send}
              </button>
            </div>
            </>
            )}
          </section>
        )}

        {o.status === "review" && (
          <section className="evp-card evp-state" data-testid="evp-review">
            <span className="evp-state-ic wait">
              <Clock size={28} />
            </span>
            <h2>{t.reviewTitle}</h2>
            <p className="evp-muted">{t.reviewSub}</p>
            <button type="button" className="evp-mini center" onClick={() => copy(window.location.href)}>
              {copied === window.location.href ? <Check size={14} /> : <Copy size={14} />} {t.keepLink}
            </button>
          </section>
        )}

        {o.status === "paid" && (
          <>
            <section className="evp-card evp-state ok" data-testid="evp-paid">
              <span className="evp-state-ic ok">
                <CheckCircle2 size={28} />
              </span>
              <h2>{free ? t.freeTitle : t.paidTitle}</h2>
              <p className="evp-muted">{t.paidSub}</p>
            </section>
            <FeedbackLink token={token} fb={d.feedback} t={t} />
            <div className="evp-tickets">
              {tickets.map((tk) => (
                <TicketCard key={tk._id} tk={tk} ev={ev} t={t} lang={lang} of={tickets.length > 1 ? tickets.length : 0} />
              ))}
            </div>
            <section className="evp-card evp-cal-card">
              <CalendarLinks ev={ev} start={at} end={showOf(ev, o.show)?.ends_at} show={o.show} t={t} />
              <Link className="evp-mini center" to="/ev/my">
                {t.myAll}
              </Link>
            </section>
            {o.via !== "invite" && <RequestBox token={token} tickets={tickets} requests={o.requests} t={t} onDone={load} />}
          </>
        )}

        {(o.status === "rejected" || o.status === "expired" || o.status === "cancelled" || holdOver) && (
          <section className="evp-card evp-state bad">
            <span className="evp-state-ic bad">{o.status === "rejected" ? <XCircle size={28} /> : <AlertTriangle size={28} />}</span>
            <h2>{o.status === "rejected" ? t.rejectedTitle : o.status === "cancelled" ? t.cancelledTitle : t.expiredTitle}</h2>
            {o.reason && <p>{o.reason}</p>}
            {(o.status === "expired" || holdOver) && <p className="evp-muted">{t.expiredSub}</p>}
            {ev.slug && (
              <Link className="evp-btn" to={`/ev/${ev.slug}`}>
                {t.orderAgain}
              </Link>
            )}
          </section>
        )}

        <NewsAndDocs ev={ev} t={t} lang={lang} />
        {o.status === "paid" && <MapCard ev={ev} t={t} />}
        <Sponsors list={ev.sponsors} t={t} />
        {(org?.phone || org?.telegram) && (
          <section className="evp-contact">
            <span>{t.contact}</span>
            {org.phone && (
              <a href={`tel:${org.phone.replace(/[^+\d]/g, "")}`}>
                <Phone size={14} /> {org.phone}
              </a>
            )}
            {org.telegram && (
              <a href={`https://t.me/${org.telegram.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "")}`} target="_blank" rel="noreferrer">
                <Send size={14} /> {org.telegram}
              </a>
            )}
          </section>
        )}
        {d.brand && (
          <>
            <a className="evp-brand" href="/" target="_blank" rel="noreferrer">
              {t.madeWith}
            </a>
            <PoweredBy lang={lang} className="evp-powered" />
          </>
        )}
      </main>
      {view &&
        pm?.qr &&
        createPortal(
          <div className="evp-viewer" onClick={() => setView(false)} role="dialog">
            <img src={pm.qr} alt="QR" />
            <button type="button" aria-label="Close">
              <X size={22} />
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
