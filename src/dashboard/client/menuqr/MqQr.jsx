import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Download, Loader2, Printer, QrCode, RefreshCw, Save } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { menuQrService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import { Field } from "../restaurant/parts";
import { Head, Switch } from "./parts";
import { QR_KEYS, downloadPng, qrCardSvg, qrStyleName, qrSvg } from "./qrArt";
import { fmt, menuUrl } from "./text";

const lum = (hex) => {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// QR code: one card design, 23 code styles, texts on top / below, download + print
export default function MqQr({ ctx }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const s = data.settings;
  const owned = data.qr.owned;
  const [q, setQ] = useState(() => ({ ...s.qr }));
  const [busy, setBusy] = useState("");
  const [ask, setAsk] = useState(false); // "new link?" box
  useEffect(() => setQ((cur) => ({ ...cur, style: s.qr.style })), [s.qr.style]); // a style just bought is in use
  const url = menuUrl(s.slug);
  const logo = q.logo && s.logo?.url ? s.logo.url : "";
  const card = useMemo(() => qrCardSvg({ text: url, style: q.style, color: q.color, bg: q.bg, accent: q.accent, logo, name: data.business.name, header: q.header, footer: q.footer, info: q.info, width: 420 }), [url, q, logo, data.business.name]);
  const thumbs = useMemo(() => Object.fromEntries(QR_KEYS.map((k) => [k, qrSvg({ text: url, style: k, color: q.color, bg: q.bg, accent: q.accent, px: 96 })])), [url, q.color, q.bg, q.accent]);
  const low = contrast(q.color, q.bg) < 3;
  const dirty = ["color", "bg", "accent", "header", "footer", "info", "logo"].some((k) => q[k] !== s.qr[k]);
  const save = async (extra = {}) => {
    setBusy(extra.style ? `use-${extra.style}` : "save");
    try {
      const r = await menuQrService.save(id, { qr: { color: q.color, bg: q.bg, accent: q.accent, header: q.header, footer: q.footer, info: q.info, logo: q.logo, ...extra } });
      ctx.setSettings(r.data);
      setQ({ ...r.data.qr });
      notify({ type: "success", text: m.saved });
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const print = () => {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${data.business.name}</title><link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@500;700;800&display=swap" rel="stylesheet"><style>body{margin:0;display:grid;place-items:center;min-height:100vh}svg{width:90mm;height:auto}@page{margin:10mm}</style></head><body>${card}<script>setTimeout(()=>{print()},700)<\/script></body></html>`,
    );
    w.document.close();
  };
  const file = (s.slug || "menu").replace(/[^a-z0-9-]/g, "");
  return (
    <div className="rs-col">
      <Head icon={QrCode} title={m.qrTitle} sub={m.qrSub} />
      <div className="mq-qr">
        <section className="panel-card mq-qr-card">
          <div className="mq-qr-art" dangerouslySetInnerHTML={{ __html: card }} data-testid="mq-qr-card" />
          <div className="mq-qr-linkrow">
            <a className="mq-qr-url" href={url} target="_blank" rel="noreferrer">
              {url.replace(/^https?:\/\//, "")}
            </a>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setAsk(true)} disabled={readOnly} data-testid="mq-new-link">
              <RefreshCw size={13} /> {m.newLink}
            </button>
          </div>
          <div className="mq-qr-btns">
            <button
              type="button"
              className="md-btn md-btn-primary sa-btn-sm"
              onClick={() => {
                setBusy("dl");
                downloadPng(card, `${file}-qr-card.png`, 2.5).finally(() => setBusy(""));
              }}
              disabled={busy === "dl"}
              data-testid="mq-qr-download"
            >
              {busy === "dl" ? <Loader2 size={14} className="md-spin" /> : <Download size={14} />} {m.download}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => downloadPng(qrSvg({ text: url, style: q.style, color: q.color, bg: q.bg, accent: q.accent, logo, px: 1024 }), `${file}-qr.png`, 1)}>
              <QrCode size={14} /> {m.downloadCode}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={print}>
              <Printer size={14} /> {m.print}
            </button>
          </div>
        </section>
        <section className="panel-card">
          <div className="md-fields">
            <Field label={m.qrHeader}>
              <input value={q.header} maxLength={60} onChange={(e) => setQ({ ...q, header: e.target.value })} placeholder={m.qrHeaderPh} disabled={readOnly} data-testid="mq-qr-header" />
            </Field>
            <Field label={m.qrFooter}>
              <input value={q.footer} maxLength={80} onChange={(e) => setQ({ ...q, footer: e.target.value })} placeholder={m.qrFooterPh} disabled={readOnly} data-testid="mq-qr-footer" />
            </Field>
            <Field label={m.qrInfo}>
              <input value={q.info} maxLength={120} onChange={(e) => setQ({ ...q, info: e.target.value })} placeholder={m.qrInfoPh} disabled={readOnly} />
            </Field>
            <div className="mq-qr-colours">
              {[
                ["color", m.qrColour],
                ["bg", m.qrBg],
                ["accent", m.qrAccent],
              ].map(([k, label]) => (
                <label key={k}>
                  <input type="color" value={q[k]} onChange={(e) => setQ({ ...q, [k]: e.target.value })} disabled={readOnly} />
                  <small>{label}</small>
                </label>
              ))}
            </div>
            {low && (
              <div className="co-warn mq-warn">
                <AlertTriangle size={15} /> {m.lowContrast}
              </div>
            )}
            <Switch checked={q.logo} onChange={(v) => setQ({ ...q, logo: v })} label={m.qrLogo} disabled={readOnly || !s.logo?.url} />
            <button type="button" className="md-btn md-btn-primary" style={{ alignSelf: "flex-end" }} onClick={() => save()} disabled={readOnly || !!busy || !dirty} data-testid="mq-qr-save">
              {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Save size={15} />} {m.save}
            </button>
          </div>
        </section>
      </div>
      <section className="panel-card">
        <h3 className="mq-h3">{m.qrStyles}</h3>
        <p className="rs-muted" style={{ margin: "-4px 0 12px" }}>
          {m.qrStylesSub.replace("{coins}", fmt(data.qr.price))}
        </p>
        <div className="mq-qr-styles">
          {QR_KEYS.map((k) => {
            const mine = owned.includes(k);
            const using = s.qr.style === k;
            return (
              <div key={k} className={`mq-qr-style ${using ? "using" : ""}`} data-testid={`mq-qr-${k}`}>
                <span className="mq-qr-thumb" dangerouslySetInnerHTML={{ __html: thumbs[k] }} />
                <b>{qrStyleName(k, lang)}</b>
                {using ? (
                  <span className="rs-pill on">
                    <Check size={12} /> {m.inUse}
                  </span>
                ) : mine ? (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => save({ style: k })} disabled={readOnly || !!busy}>
                    {busy === `use-${k}` ? <Loader2 size={13} className="md-spin" /> : <Check size={13} />} {m.use}
                  </button>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ qr: k })} disabled={readOnly}>
                    <CoinIcon size={13} /> {fmt(data.qr.price)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
      {ask && (
        <Modal
          title={m.newLink}
          onClose={() => setAsk(false)}
          busy={busy === "link"}
          footer={
            <>
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setAsk(false)} disabled={busy === "link"}>
                {m.cancel}
              </button>
              <button
                type="button"
                className="md-btn md-btn-primary"
                disabled={busy === "link"}
                data-testid="mq-new-link-yes"
                onClick={async () => {
                  setBusy("link");
                  try {
                    const r = await menuQrService.refreshLink(id);
                    ctx.setSettings(r.data);
                    setAsk(false);
                    notify({ type: "success", text: m.newLinkDone });
                  } catch (e) {
                    notify({ type: "error", text: e.message });
                  } finally {
                    setBusy("");
                  }
                }}
              >
                {busy === "link" ? <Loader2 size={15} className="md-spin" /> : <RefreshCw size={15} />} {m.newLink}
              </button>
            </>
          }
        >
          <div className="co-warn mq-warn mq-warn-big">
            <AlertTriangle size={18} />
            <span style={{ whiteSpace: "pre-line" }}>{m.newLinkAsk}</span>
          </div>
          <p className="rs-muted" style={{ wordBreak: "break-all" }}>
            {url}
          </p>
        </Modal>
      )}
    </div>
  );
}
