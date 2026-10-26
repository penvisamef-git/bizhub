import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bike, Check, CircleDollarSign, Clock, Download, Loader2, MapPin, Phone, ShoppingBag, Store, Upload, UtensilsCrossed, X } from "lucide-react";
import { tgStorePublic } from "../api/services";
import { fill, fmtTime, money, useTgText } from "./text";
import { loadTelegram } from "./tg";
import { loadThemeFont, themeClass, themeVars } from "./themes";
import { Brand } from "./StorePage";
import "./tgstore-public.css";

const MODE_ICON = { delivery: Bike, pickup: ShoppingBag, dine_in: UtensilsCrossed };
const STEPS = { delivery: ["new", "accepted", "on_way", "done"], pickup: ["new", "accepted", "ready", "done"], dine_in: ["new", "accepted", "ready", "done"] };

function KhqrCard({ k, cur, t, name }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    import("qrcode").then((m) => m.default.toString(k.qr, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then(setSvg)).catch(() => setSvg(""));
  }, [k.qr]);
  const save = () =>
    import("qrcode").then((m) =>
      m.default.toDataURL(k.qr, { width: 900, margin: 3 }).then((url) => {
        const a = document.createElement("a");
        a.href = url;
        a.download = "khqr.png";
        a.click();
      }),
    );
  return (
    <div className="tsp-khqr" data-testid="tsp-khqr">
      <div className="tsp-khqr-head">KHQR</div>
      <div className="tsp-khqr-who">
        <span>{name}</span>
        <b>{money(k.amount, cur)}</b>
      </div>
      <div className="tsp-khqr-qr" role="img" aria-label="KHQR" dangerouslySetInnerHTML={{ __html: svg }} />
      {k.expires && <small className="tsp-muted">{fill(t.qrExpires, { time: fmtTime(k.expires) })}</small>}
      <button type="button" className="tsp-btn ghost" onClick={save}>
        <Download size={16} /> {t.saveQr}
      </button>
    </div>
  );
}

// /t/o/<token> — my order: where it is, and paying for it
export default function OrderPage() {
  const { token } = useParams();
  const { t, lang, setLang } = useTgText();
  const [d, setD] = useState(null);
  const [gone, setGone] = useState(false);
  const [wa, setWa] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = useRef(null);

  const load = useCallback(
    () =>
      tgStorePublic
        .follow(token)
        .then((r) => {
          setD(r.data);
          document.title = `#${r.data.order.no} · ${r.data.store.name}`;
        })
        .catch((e) => e.status === 404 && setGone(true)),
    [token],
  );
  useEffect(() => {
    loadTelegram().then((w) => {
      if (w) {
        w.ready();
        setWa(w);
      }
    });
    load();
  }, [load]);
  const finished = d && ["done", "cancelled"].includes(d.order.status) && d.order.pay.status === "paid";
  const over = d && (d.order.status === "cancelled" || (d.order.status === "done" && d.order.pay.status === "paid"));
  useEffect(() => {
    if (!d || over) return undefined;
    const ms = d.khqr?.auto ? 5000 : 10000;
    const i = setInterval(() => document.visibilityState === "visible" && load(), ms);
    return () => clearInterval(i);
  }, [d, over, load]);

  const proof = async (file) => {
    setBusy(true);
    setError("");
    try {
      const r = await tgStorePublic.proof(token, file);
      setD((o) => ({ ...o, order: r.data.order }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (gone)
    return (
      <div className="tsp-page tsp-center">
        <X size={36} />
        <h1>{t.gone}</h1>
      </div>
    );
  if (!d)
    return (
      <div className="tsp-page tsp-center" aria-busy="true">
        <Loader2 size={28} className="tsp-spin" />
      </div>
    );

  const o = d.order;
  const s = d.store;
  const cur = o.currency || s.currency;
  const steps = STEPS[o.mode] || STEPS.pickup;
  const at = o.status === "cancelled" ? -1 : steps.indexOf(o.status);
  const Icon = MODE_ICON[o.mode] || ShoppingBag;
  loadThemeFont(s.theme);
  const theme = themeVars(s.theme, s.color);
  const ownPay = o.pay.method === "custom" ? o.pay.custom : null;

  return (
    <div className={`tsp-page tsp-follow ${themeClass(s.theme)} ${wa ? "in-tg" : ""}`} style={theme}>
      <header className="tsp-follow-head">
        <span className="tsp-logo sm">{s.logo ? <img src={s.logo} alt="" /> : <Store size={20} />}</span>
        <b>{s.name}</b>
        <button type="button" className="tsp-lang" onClick={() => setLang(lang === "km" ? "en" : "km")}>
          {lang === "km" ? "EN" : "ខ្មែរ"}
        </button>
      </header>
      <main className="tsp-main narrow">
        <section className={`tsp-panel tsp-status s-${o.status}`} data-testid="tsp-status">
          <small className="tsp-muted">{fill(t.orderNo, { n: o.no })}</small>
          <h1>{t.statuses[o.status]}</h1>
          {o.status === "accepted" && o.eta_min > 0 && (
            <p>
              <Clock size={15} /> {fill(t.eta, { n: o.eta_min })}
            </p>
          )}
          {o.status === "ready" && <p>{o.mode === "dine_in" ? t.readyTable : t.readyPickup}</p>}
          {o.status === "cancelled" && o.reason && <p>{fill(t.reason, { why: o.reason })}</p>}
          {o.status !== "cancelled" && (
            <ol className="tsp-steps">
              {steps.map((k, i) => (
                <li key={k} className={i < at ? "past" : i === at ? "now" : ""}>
                  <span>{i <= at ? <Check size={13} /> : i + 1}</span>
                  <small>{t.steps[k]}</small>
                </li>
              ))}
            </ol>
          )}
          {!finished && o.status !== "cancelled" && <small className="tsp-muted">{t.keepPage}</small>}
        </section>

        {o.status !== "cancelled" && o.pay.status !== "paid" && ((o.pay.method === "khqr" && d.khqr) || ownPay) && (
          <section className="tsp-panel">
            <h2>{ownPay ? fill(t.payWith, { name: ownPay.name }) : t.payNow}</h2>
            {ownPay ? (
              <div className="tsp-ownpay" data-testid="tsp-ownpay">
                {ownPay.image && <img src={ownPay.image} alt="" />}
                <b>{money(o.total, cur)}</b>
                {ownPay.info && <p>{ownPay.info}</p>}
              </div>
            ) : (
              <>
                <p className="tsp-muted">{t.payNowSub}</p>
                <KhqrCard k={d.khqr} cur={cur} t={t} name={d.khqr.name} />
              </>
            )}
            <p className="tsp-hint">{!ownPay && d.khqr?.auto ? t.payAuto : t.payManual}</p>
            {o.pay.status === "proof" ? (
              <p className="tsp-ok">
                <Check size={15} /> {t.proofSent}
              </p>
            ) : null}
            <input ref={pick} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && proof(e.target.files[0])} />
            <button type="button" className={`tsp-btn wide ${o.pay.status === "proof" ? "ghost" : ""}`} onClick={() => pick.current?.click()} disabled={busy} data-testid="tsp-proof">
              {busy ? <Loader2 size={16} className="tsp-spin" /> : <Upload size={16} />} {t.sendProof}
            </button>
            {error && <p className="tsp-error">{error}</p>}
          </section>
        )}

        <section className="tsp-panel">
          <div className="tsp-pills">
            <span className="tsp-tag">
              <Icon size={13} /> {t.modes[o.mode]}
              {o.mode === "dine_in" && o.table ? ` ${o.table}` : ""}
            </span>
            <span className={`tsp-tag ${o.pay.status === "paid" ? "paid" : ""}`}>
              <CircleDollarSign size={13} /> {o.pay.method === "khqr" ? "KHQR" : ownPay ? ownPay.name : t.payMethods.cash} · {o.pay.status === "paid" ? t.paid : t.unpaid}
            </span>
          </div>
          <ul className="tsp-lines read">
            {o.items.map((l, i) => (
              <li key={i}>
                <span className="tsp-line-text">
                  <b>
                    {l.qty} × {l.name}
                  </b>
                  {l.options?.length > 0 && <small>{l.options.map((c) => c.choice).join(", ")}</small>}
                  {l.note && <small>“{l.note}”</small>}
                </span>
                <span className="tsp-line-price">{money(l.total, cur)}</span>
              </li>
            ))}
          </ul>
          <div className="tsp-sum">
            {o.discount > 0 && (
              <>
                <span className="tsp-off">{fill(t.promoLine, { code: o.promo })}</span>
                <span className="tsp-off">−{money(o.discount, cur)}</span>
              </>
            )}
            {o.fee > 0 && (
              <>
                <span>{t.fee}</span>
                <span>{money(o.fee, cur)}</span>
              </>
            )}
            <b>{t.total}</b>
            <b>{money(o.total, cur)}</b>
          </div>
          {o.pay.method === "cash" && o.pay.status !== "paid" && o.status !== "cancelled" && <p className="tsp-hint">{fill(t.cashToPay, { total: money(o.total, cur) })}</p>}
          {o.mode === "delivery" && o.address && (
            <p className="tsp-addr">
              <MapPin size={13} /> {o.address}
            </p>
          )}
        </section>

        <div className="tsp-follow-acts">
          <Link className="tsp-btn ghost" to={`/t/${s.slug}${o.mode === "dine_in" && o.table ? `?table=${encodeURIComponent(o.table)}` : ""}`}>
            <ShoppingBag size={16} /> {t.orderMore}
          </Link>
          {s.phone && (
            <a className="tsp-btn ghost" href={`tel:${s.phone}`}>
              <Phone size={16} /> {t.call}
            </a>
          )}
        </div>
        {s.brand && <Brand t={t} />}
      </main>
    </div>
  );
}
