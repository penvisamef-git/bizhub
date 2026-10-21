import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import { Award, CheckCircle2, Clock, Download, Loader2, Printer, XCircle } from "lucide-react";
import { evPublic } from "../api/services";
import { saveTicketImage } from "./TicketCard";
import { useEvPubText } from "./text";
import "./evpub.css";
import "./cert.css";

import { CERT_FREE, certLook } from "./certThemes";

export const CERT_DESIGNS = CERT_FREE;
const W = 1123; // A4 landscape at 96 dpi
const H = 794;
const dateOf = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Phnom_Penh" }) : "");
export const certText = (body, { name, event, date, venue }) =>
  String(body || "")
    .replaceAll("{name}", name || "")
    .replaceAll("{event}", event || "")
    .replaceAll("{date}", date || "")
    .replaceAll("{venue}", venue || "");

// the certificate itself, drawn at A4 size and scaled to fit its box
export function CertView({ cert, name, event, org, code, verifyUrl, sheetRef, thumb, sponsors }) {
  const wrap = useRef(null);
  const [scale, setScale] = useState(0.5);
  const [qr, setQr] = useState("");
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    const fit = () => setScale(Math.min(1, el.clientWidth / W));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!verifyUrl || thumb) return;
    QRCode.toDataURL(verifyUrl, { margin: 0, width: 220 }).then(setQr).catch(() => setQr(""));
  }, [verifyUrl]);
  const look = certLook(cert?.design || "classic");
  const date = dateOf(event?.starts_at);
  return (
    <div className="evc-fit" ref={wrap} style={{ height: H * scale }}>
      <div className={`evc-sheet ${look.className}`} ref={sheetRef} style={{ ...look.style, transform: `scale(${scale})` }} data-testid="evc-sheet">
        <i className="evc-deco evc-d1" />
        <i className="evc-deco evc-d2" />
        <i className="evc-deco evc-d3" />
        <i className="evc-deco evc-d4" />
        <div className="evc-frame">
          <div className="evc-top">
            {org?.logo ? <img className="evc-logo" src={org.logo} alt="" crossOrigin="anonymous" /> : <Award className="evc-logo-ic" size={54} />}
            <span className="evc-org">{org?.name}</span>
          </div>
          <h1 className="evc-title">{cert?.title || "Certificate of Attendance"}</h1>
          <p className="evc-pre">This certificate is proudly presented to</p>
          <div className="evc-name">{name || "Guest name"}</div>
          <p className="evc-body">{certText(cert?.body, { name: name || "Guest name", event: event?.title, date, venue: event?.venue })}</p>
          {sponsors?.length > 0 && (
            <div className="evc-sponsors">
              {sponsors.slice(0, 8).map((x) => (
                <img key={x.name} src={x.logo} alt={x.name} crossOrigin="anonymous" />
              ))}
            </div>
          )}
          <div className="evc-foot">
            <div className="evc-sign">
              {cert?.signature ? <img className="evc-sig" src={cert.signature} alt="" crossOrigin="anonymous" /> : <span className="evc-sig-space" />}
              <span className="evc-line" />
              <b>{cert?.signer || org?.name}</b>
              {cert?.signer_title && <small>{cert.signer_title}</small>}
            </div>
            <div className="evc-seal">
              <Award size={46} />
            </div>
            <div className="evc-verify">
              {qr ? <img src={qr} alt="" /> : <span className="evc-qr-empty" />}
              <small>{code ? `No. ${code}` : "No. XXXXXXXX"}</small>
              <small>{date}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// /ev/c/:code — a guest's certificate (the QR on it opens this page: proof that it is real)
export default function CertPage() {
  const { code } = useParams();
  const { t, lang, setLang } = useEvPubText();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const sheet = useRef(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    evPublic
      .cert(code)
      .then((r) => {
        setD(r.data);
        document.title = `${r.data.cert.title} · ${r.data.event.title}`;
      })
      .catch((e) => setError(e.message || "error"));
  }, [code]);
  const lang_ = (
    <button type="button" className="evp-lang dark" onClick={() => setLang(lang === "km" ? "en" : "km")}>
      {lang === "km" ? "EN" : "ខ្មែរ"}
    </button>
  );
  if (error)
    return (
      <div className="evp evp-center">
        {lang_}
        <Award size={44} />
        <h1>{t.certNone}</h1>
      </div>
    );
  if (!d)
    return (
      <div className="evp evp-center">
        <Loader2 size={30} className="evp-spin" />
      </div>
    );
  const save = async () => {
    setBusy(true);
    const node = sheet.current;
    const old = node.style.transform;
    node.style.transform = "none";
    try {
      await saveTicketImage(node, `certificate-${d.ticket.code}.png`);
    } finally {
      node.style.transform = old;
      setBusy(false);
    }
  };
  return (
    <div className="evp evp-light evc-page">
      <main className="evc-main">
        <div className="evc-bar">
          {d.valid ? (
            <span className="evc-ok" data-testid="evc-valid">
              <CheckCircle2 size={17} /> {t.certValid}
            </span>
          ) : d.waiting ? (
            <span className="evc-wait">
              <Clock size={17} /> {t.certWaiting}
            </span>
          ) : (
            <span className="evc-bad">
              <XCircle size={17} /> {t.certInvalid}
            </span>
          )}
          {lang_}
        </div>
        {d.valid ? (
          <>
            <CertView cert={d.cert} name={d.ticket.holder} event={d.event} org={d.org} code={d.ticket.code} verifyUrl={window.location.href} sheetRef={sheet} sponsors={d.sponsors} />
            <div className="evc-actions">
              <button type="button" className="evp-btn" onClick={() => window.print()} data-testid="evc-print">
                <Printer size={17} /> {t.certPdf}
              </button>
              <button type="button" className="evp-btn ghost" onClick={save} disabled={busy}>
                {busy ? <Loader2 size={17} className="evp-spin" /> : <Download size={17} />} {t.certImage}
              </button>
            </div>
          </>
        ) : (
          <p className="evp-muted center">{d.event.title}</p>
        )}
        {d.brand && (
          <a className="evp-brand" href="/" target="_blank" rel="noreferrer">
            {t.madeWith}
          </a>
        )}
      </main>
    </div>
  );
}
