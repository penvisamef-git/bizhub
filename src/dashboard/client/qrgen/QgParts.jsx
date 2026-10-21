import { usePayConfirm } from "../../../components/purchase/PayConfirm";
import { themeOf } from "../../../qrgen/themes";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Check, EyeOff, FileText, Globe, Inbox, Layers, Link2, PenLine, Shuffle, Ticket, Loader2, Lock, MapPin, MessageSquare, Minus, Phone, Plus, Send, ShieldCheck, UserRound, Wifi } from "lucide-react";
import { qrgenService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { auth } from "../../../lib/auth";
import { coinsChanged } from "../../../lib/events";
import { payloadOf, qrDesignSvg } from "../../../qrgen/qrDesign";
import { downloadPng } from "../menuqr/qrArt";
import { SITE, fmt } from "./text";

export { Head, Switch } from "../menuqr/parts";
export const TYPE_ICON = { url: Globe, text: FileText, file: FileText, form: Inbox, vcard: UserRound, map: MapPin, wifi: Wifi, phone: Phone, sms: MessageSquare, links: Link2, coupon: Ticket };
export const TYPE_ORDER = ["url", "links", "text", "file", "form", "coupon", "vcard", "map", "wifi", "phone", "sms"];
// types that need an add-on before making one
export const TYPE_NEEDS = { form: "qr_forms", links: "qr_links", coupon: "qr_coupons" };
export const ADDON_ICON = { qr_forms: Inbox, qr_telegram: Send, qr_stats: BarChart3, qr_geo: MapPin, qr_bulk: Layers, qr_rules: ShieldCheck, qr_links: Link2, qr_coupons: Ticket, qr_nobrand: EyeOff, qr_form_pro: PenLine, qr_smart: Shuffle };

// the SVG of one code in its design
export function codeSvg(code, logoUrl, size = 320, scanMe) {
  const d = code.design || {};
  return qrDesignSvg({ text: payloadOf(code, SITE), design: d.key || "plain", color: d.color, bg: d.bg, accent: d.accent, label: d.label, logo: d.logo ? logoUrl : "", size, scanMe });
}
export function QrView({ code, logo, size = 160, scanMe, className = "" }) {
  const svg = useMemo(() => codeSvg(code, logo, size, scanMe), [code, logo, size, scanMe]);
  return <span className={`qg-view ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}
const fileName = (code) => (code.name || "qr").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "qr";
export const downloadCodePng = (code, logo, scanMe) => downloadPng(codeSvg(code, logo, 900, scanMe), `${fileName(code)}.png`, 1.2);
export function downloadCodeSvg(code, logo, scanMe) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([codeSvg(code, logo, 900, scanMe)], { type: "image/svg+xml" }));
  a.download = `${fileName(code)}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// one print page: a grid of codes with their names
export function printCodes(codes, logo, title, scanMe) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  const cells = codes.map((c) => `<figure>${codeSvg(c, logo, 260, scanMe)}<figcaption>${String(c.name).replace(/[<&]/g, "")}</figcaption></figure>`).join("");
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${String(title).replace(/[<&]/g, "")}</title><link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@500;700;800&display=swap" rel="stylesheet"><style>body{margin:0;font-family:'Kantumruy Pro',sans-serif}main{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm;padding:8mm}figure{margin:0;text-align:center;break-inside:avoid}figure>svg{width:100%;height:auto}figcaption{font-weight:700;font-size:12px;margin-top:2mm}@page{margin:6mm}</style></head><body><main>${cells}</main><script>setTimeout(()=>print(),900)<\/script></body></html>`,
  );
  w.document.close();
}

// "this needs an add-on" card
export function Locked({ ctx, addon, children }) {
  const { m, data, readOnly } = ctx;
  const a = data.addons[addon] || {};
  return (
    <section className="panel-card mq-locked">
      <Lock size={22} />
      <b>{m.addonNames[addon]}</b>
      <p className="rs-muted">{m.addonWhat[addon]}</p>
      {children}
      <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon })} disabled={readOnly} data-testid={`qg-unlock-${addon}`}>
        <CoinIcon size={16} /> {m.unlock.replace("{coins}", `${fmt(a.price)} ${m.coins}${a.days ? ` ${m.perYear}` : ""}`)}
      </button>
    </section>
  );
}
export function NeedLine({ ctx, addon }) {
  const { m, data, readOnly } = ctx;
  const a = data.addons[addon] || {};
  return (
    <div className="qg-need">
      <Lock size={15} />
      <span>{m.addonWhat[addon]}</span>
      <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon })} disabled={readOnly}>
        <CoinIcon size={13} /> {m.unlock.replace("{coins}", `${fmt(a.price)}${a.days ? ` ${m.perYear}` : ""}`)}
      </button>
    </div>
  );
}

// buy n × 10 more files
export function BuyFiles({ ctx, onClose }) {
  const { id, m, data, notify } = ctx;
  const price = data.prices.qr_file_pack;
  const [askPay, payNode] = usePayConfirm();
  const [n, setN] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = n * (price || 0);
  const balance = auth.getClientLogin()?.coin_balance ?? 0;
  return (
    <Modal
      title={m.buyFiles}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button
            type="button"
            className="md-btn md-btn-primary rs-gold-btn"
            disabled={busy || total > balance}
            data-testid="qg-files-buy"
            onClick={() =>
              askPay(total, m.buyFiles, async () => {
                setBusy(true);
                setError("");
                try {
                  const r = await qrgenService.buyFiles(id, n);
                  if (r.balance !== undefined) auth.setClientLogin({ ...auth.getClientLogin(), coin_balance: r.balance });
                  coinsChanged();
                  ctx.put({ files: r.files });
                  notify({ type: "success", text: m.bought.replace("{n}", n * data.files.pack) });
                  onClose();
                } catch (e) {
                  setError(e.message);
                  setBusy(false);
                }
              })
            }
          >
            {busy ? <Loader2 size={15} className="md-spin" /> : <CoinIcon size={15} />} {m.buyFor.replace("{n}", `+${n * data.files.pack}`).replace("{coins}", fmt(total))}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <p className="rs-muted" style={{ margin: 0 }}>
          {m.buyFilesSub.replace("{coins}", fmt(price))}
        </p>
        <label className="md-field">
          <span>{m.packs}</span>
          <div className="mq-qty">
            <button type="button" onClick={() => setN(Math.max(1, n - 1))} aria-label="−1">
              <Minus size={15} />
            </button>
            <input type="number" min="1" max="100" value={n} onChange={(e) => setN(Math.max(1, Math.min(100, Math.round(Number(e.target.value) || 1))))} />
            <button type="button" onClick={() => setN(Math.min(100, n + 1))} aria-label="+1">
              <Plus size={15} />
            </button>
          </div>
        </label>
        {total > balance && <div className="md-form-error">{m.notEnough}</div>}
        {error && <div className="md-form-error">{error}</div>}
      </div>
      {payNode}
    </Modal>
  );
}

export function Confirm({ title, sub, onYes, onClose, m }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={title}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button
            type="button"
            className="md-btn md-btn-danger"
            disabled={busy}
            data-testid="qg-confirm-yes"
            onClick={async () => {
              setBusy(true);
              try {
                await onYes();
                onClose();
              } catch {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 size={15} className="md-spin" />} {m.delete}
          </button>
        </>
      }
    >
      <p className="rs-muted" style={{ margin: 0 }}>
        {sub}
      </p>
    </Modal>
  );
}

// a tiny live picture of a page theme (the real page CSS, scaled down)
export function ThemeThumb({ template, color, name = "Aa", business = "BizHub" }) {
  const th = themeOf(template);
  const base = th ? th.base : template;
  return (
    <div className="qg-thumb" aria-hidden="true">
      <div className={`qp qp-${base} qp-preview ${th ? `th-${th.key}${th.dark ? " qp-dark" : ""}` : ""} qg-thumb-in`} style={{ "--q": color }}>
        <div className="qp-sheet">
          <header className="qp-head">
            <span className="qp-logo qp-logo-x">{business.slice(0, 1)}</span>
            <div className="qp-head-text">
              <small>{business}</small>
              <h1>{name}</h1>
            </div>
          </header>
          <div className="qp-main">
            <dl className="qp-rows">
              <div>
                <dt>Tel</dt>
                <dd>012 345 678</dd>
              </div>
              <div>
                <dt>Open</dt>
                <dd>7:00–21:00</dd>
              </div>
            </dl>
            <span className="qp-btn">Open</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// custom link name for one QR code (qr_slug: one-time per QR, then free to change)
export function SlugBox({ ctx, code, onDone }) {
  const { id, m, data, readOnly, notify } = ctx;
  const owned = (data.slugs || []).includes(String(code._id));
  const [v, setV] = useState(owned ? code.slug : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const clean = v.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const ok = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(clean) && !clean.includes("--");
  const host = SITE.replace(/^https?:\/\//, "");
  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await qrgenService.setSlug(id, code._id, clean);
      onDone(r.data);
      notify({ type: "success", text: m.saved });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="qg-slug" data-testid="qg-slug">
      <b>{m.sSlug}</b>
      <small className="rs-muted">{m.slugSub.replace("{site}", host)}</small>
      <label className="qg-slug-in">
        <span>/x/</span>
        <input value={v} maxLength={30} onChange={(e) => setV(e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="lucky-menu" disabled={readOnly} data-testid="qg-slug-input" />
      </label>
      {err && <small className="qg-slug-err">{err}</small>}
      {owned ? (
        <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={save} disabled={readOnly || busy || !ok || clean === code.slug} data-testid="qg-slug-save">
          {busy ? <Loader2 size={13} className="md-spin" /> : null} {m.slugSave}
        </button>
      ) : (
        <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ slug: { code, value: clean, done: onDone } })} disabled={readOnly || !ok} data-testid="qg-slug-buy">
          <CoinIcon size={13} /> {m.slugBuy.replace("{coins}", fmt(data.prices.qr_slug))}
        </button>
      )}
      <small className="rs-muted">{owned ? `${m.slugOwned} ${m.slugOld}` : m.slugOld}</small>
    </div>
  );
}

// coupons given from a Coupon QR: numbers, mark one used, the list
export function CouponPanel({ ctx, code }) {
  const { id, m, lang, readOnly, notify } = ctx;
  const [res, setRes] = useState(null);
  const [used, setUsed] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () =>
    qrgenService
      .coupons(id, code._id, { used })
      .then(setRes)
      .catch(() => {});
  useEffect(() => {
    load();
  }, [used, code._id]); // eslint-disable-line react-hooks/exhaustive-deps
  const redeem = async () => {
    setBusy(true);
    try {
      const r = await qrgenService.redeemCoupon(id, code._id, q);
      notify({ type: "success", text: m.cRedeemed.replace("{code}", r.data.code) });
      setQ("");
      load();
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const c = res?.counts || { issued: code.coupon?.issued || 0, used: code.coupon?.used || 0, limit: code.coupon?.limit || 0 };
  const when = (d) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "");
  return (
    <section className="panel-card md-fields" data-testid="qg-coupons">
      <h3 className="mq-h3">
        <Ticket size={16} /> {m.cList}
      </h3>
      <div className="qg-cstats">
        <div>
          <small>{m.cGiven}</small>
          <b data-testid="qg-c-given">{fmt(c.issued)}</b>
        </div>
        <div>
          <small>{m.cUsed}</small>
          <b>{fmt(c.used)}</b>
        </div>
        <div>
          <small>{m.cLeft}</small>
          <b>{c.limit ? fmt(Math.max(0, c.limit - c.issued)) : "∞"}</b>
        </div>
      </div>
      <div className="qg-credeem">
        <input value={q} maxLength={8} onChange={(e) => setQ(e.target.value.toUpperCase())} placeholder={m.cRedeemPh} onKeyDown={(e) => e.key === "Enter" && q && redeem()} data-testid="qg-c-redeem" />
        <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={redeem} disabled={readOnly || busy || q.replace(/[^A-Z0-9]/g, "").length !== 6}>
          <Check size={14} /> {m.cRedeemBtn}
        </button>
      </div>
      <div className="qg-seg">
        {[
          ["", m.cAll],
          ["0", m.cOnlyNew],
          ["1", m.cOnlyUsed],
        ].map(([k, label]) => (
          <button key={k || "all"} type="button" className={used === k ? "on" : ""} onClick={() => setUsed(k)}>
            {label}
          </button>
        ))}
      </div>
      {!res?.data?.length ? (
        <p className="rs-muted">{m.cNone}</p>
      ) : (
        <ul className="qg-clist">
          {res.data.map((x) => (
            <li key={x._id} className={x.used_at ? "used" : ""}>
              <code>{x.code}</code>
              <small>{when(x.created_date)}</small>
              {x.used_at ? (
                <span className="rs-pill on">
                  <Check size={11} /> {when(x.used_at)}
                </span>
              ) : (
                <span className="rs-pill">{m.cOnlyNew}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
