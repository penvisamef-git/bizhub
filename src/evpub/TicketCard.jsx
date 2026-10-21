import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { shortWhen, ticketUrl, timeOf, whenOf } from "./text";
import { themeOf, themeVars } from "./themes";
import "./themes.css";

// the ticket as a picture, in its design (the buttons are left out). Falls back to the plain QR if the browser can't draw it.
export async function saveTicketImage(node, name, fallback) {
  const get = (url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  try {
    const url = await toPng(node, { pixelRatio: 3, cacheBust: true, filter: (n) => !n.classList?.contains("evp-ticket-acts") });
    get(url);
  } catch {
    if (fallback) get(fallback);
  }
}

// one ticket with its QR, in the event's design (ev.theme). preview: no buttons, qrSrc: a ready QR picture (dashboard previews)
export function TicketCard({ tk, ev, t, lang, of, theme, colors, qrSrc, preview }) {
  const key = theme || ev.theme;
  const own = colors !== undefined ? colors : theme ? undefined : ev.theme_colors;
  const th = themeOf(key);
  const [qr, setQr] = useState(qrSrc || "");
  const [saving, setSaving] = useState(false);
  const card = useRef(null);
  const save = async () => {
    setSaving(true);
    await saveTicketImage(card.current, `ticket-${tk.code}.png`, qr);
    setSaving(false);
  };
  useEffect(() => {
    if (qrSrc) return setQr(qrSrc);
    QRCode.toDataURL(ticketUrl(tk.code), { width: 520, margin: 1, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => {});
    return undefined;
  }, [tk.code, qrSrc]);
  return (
    <article ref={card} className={`evp-ticket evt evt-${th.layout} ts-${tk.status}`} style={themeVars(key, own)} data-testid="evp-ticket" data-theme={th.key}>
      <span className="evt-deco" aria-hidden="true">
        <i />
        <i />
      </span>
      <div className="evp-ticket-top">
        <span className="evt-kicker">{t.admit}</span>
        <b>{ev.title}</b>
        <small>
          {whenOf(tk.show_at || ev.starts_at, lang)} · {timeOf(tk.show_at || ev.starts_at, lang)}
        </small>
        {ev.venue && <small>{ev.venue}</small>}
      </div>
      <div className="evp-ticket-cut" />
      <div className="evp-ticket-qr">
        <span className="evt-qr">{qr ? <img src={qr} alt={tk.code} /> : <Loader2 size={24} className="evp-spin" />}</span>
        {tk.status !== "valid" && <span className={`evp-stamp ts-${tk.status}`}>{t.status[tk.status]}</span>}
      </div>
      <div className="evp-ticket-info">
        <span className="evp-ticket-type">{tk.type_name}</span>
        {tk.seat_label && <b className="evt-seat">💺 {tk.seat_label}</b>}
        <b>{tk.holder}</b>
        <small>
          {of ? `${t.ticketOf.replace("{n}", tk.no).replace("{all}", of)} · ` : ""}
          <code>{tk.code}</code>
        </small>
        {tk.status === "used" && <small className="evp-used">{t.ticketUsed.replace("{t}", shortWhen(tk.used_at, lang))}</small>}
        {tk.status === "cancelled" && <small className="evp-bad">{t.ticketCancelled}</small>}
        {tk.status === "valid" && <small className="evp-muted">{t.showAtDoor}</small>}
      </div>
      {!preview && (
        <div className="evp-ticket-acts">
          {qr && (
            <button type="button" className="evp-mini" onClick={save} disabled={saving} data-testid="evp-save-ticket">
              {saving ? <Loader2 size={14} className="evp-spin" /> : <Download size={14} />} {t.saveTicket}
            </button>
          )}
          <a href={ticketUrl(tk.code)} target="_blank" rel="noreferrer" className="evp-mini">
            <ExternalLink size={14} /> {t.openTicket}
          </a>
        </div>
      )}
    </article>
  );
}
export default TicketCard;
