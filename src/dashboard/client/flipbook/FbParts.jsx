import { usePayConfirm } from "../../../components/purchase/PayConfirm";
import { useMemo, useState } from "react";
import { BarChart3, Users as UsersIcon, MousePointerClick, QrCode as QrCodeIcon, Search as SearchIcon, X as XIcon, Check, Copy, Download, ExternalLink, FolderOpen, Loader2, Lock, Minus, Plus, RefreshCw } from "lucide-react";
import { flipbookService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { auth } from "../../../lib/auth";
import { coinsChanged } from "../../../lib/events";
import { downloadPng, qrCardSvg, qrSvg } from "../menuqr/qrArt";
import { SHELVES } from "../../../fbook/shelves";
import { fmt } from "./text";

export { Head, Switch } from "../menuqr/parts";
export const ADDON_ICON = { fb_categories: FolderOpen, fb_stats: BarChart3, fb_qr_styles: QrCodeIcon, fb_leads: UsersIcon, fb_links: MousePointerClick };

// QR card styles: "classic" free, the other 11 unlock together with "fb_qr_styles" (one time). accent "" = the library colour
const Q = (en, km, style, color, bg, accent = "") => ({ en, km, style, color, bg, accent });
export const QR_CARDS = {
  classic: Q("Classic", "បុរាណ", "classic", "#111111", "#ffffff"),
  dots: Q("Dots", "ចំណុច", "dots", "#1f2937", "#ffffff"),
  rounded: Q("Soft", "ទន់", "rounded", "#0f172a", "#f8fafc"),
  fluid: Q("Fluid violet", "រលូនស្វាយ", "fluid", "#3b0764", "#faf5ff", "#7c3aed"),
  bubble: Q("Bubbles", "ពពុះ", "bubble", "#0c4a6e", "#f0f9ff", "#0284c7"),
  pixel: Q("Pixel", "ភីកសែល", "pixel", "#111111", "#fffbeb", "#f59e0b"),
  twotone: Q("Two colours", "ពីរពណ៌", "twotone", "#111827", "#ffffff"),
  sunset: Q("Sunset", "ថ្ងៃលិច", "sunset", "#c2410c", "#fff7ed", "#ea580c"),
  ocean: Q("Ocean", "សមុទ្រ", "ocean", "#1e3a8a", "#eff6ff", "#0369a1"),
  mint: Q("Mint", "មីន", "mint", "#065f46", "#ecfdf5", "#059669"),
  berry: Q("Berry", "បឺរី", "berry", "#831843", "#fdf2f8", "#be185d"),
  royal: Q("Royal gold", "មាសរាជ", "royal", "#713f12", "#fffbeb", "#b45309"),
};
export const QR_CARD_KEYS = Object.keys(QR_CARDS);
export const qrCardName = (k, lang) => (lang === "km" ? QR_CARDS[k]?.km : QR_CARDS[k]?.en) || k;
const libColour = (data) => data.settings.color || SHELVES[data.settings.shelf_theme]?.accent || "#E0581A";
export const qrThumb = (data, k, text) => {
  const c = QR_CARDS[k] || QR_CARDS.classic;
  return qrSvg({ text, style: c.style, color: c.color, bg: c.bg, accent: c.accent || libColour(data), px: 110 });
};

// "this needs an add-on" card with an unlock button
export function Locked({ ctx, addon }) {
  const { m, data, readOnly } = ctx;
  const a = data.addons[addon] || {};
  return (
    <section className="panel-card mq-locked">
      <Lock size={22} />
      <b>{m.addonNames[addon]}</b>
      <p className="rs-muted">{m.addonWhat[addon]}</p>
      <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon })} disabled={readOnly} data-testid={`fb-unlock-${addon}`}>
        <CoinIcon size={16} /> {m.unlock.replace("{coins}", `${fmt(a.price)} ${m.coins}${a.days ? ` ${m.perYear}` : ""}`)}
      </button>
    </section>
  );
}

// a search box + "n of max" (books, categories, QR codes)
export function SearchBar({ value, onChange, placeholder, n, max, m, testid, children }) {
  return (
    <section className="panel-card fb-search">
      <label className="fb-search-box">
        <SearchIcon size={16} />
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={testid} />
        {value && (
          <button type="button" onClick={() => onChange("")} aria-label={m.close}>
            <XIcon size={15} />
          </button>
        )}
      </label>
      {children}
      <small className="rs-muted">{m.found.replace("{n}", n).replace("{max}", max)}</small>
    </section>
  );
}

// a QR card for one link (library, category or book) + download + copy (+ embed code for books)
export function QrCard({ ctx, url, name, header, embed, small, relink, onRelinked }) {
  const { m, data } = ctx;
  const c = QR_CARDS[data.settings.qr_style] || QR_CARDS.classic;
  const color = c.accent || libColour(data);
  const logo = data.settings.logo?.url || "";
  const svg = useMemo(() => qrCardSvg({ text: url, style: c.style, color: c.color, bg: c.bg, accent: color, logo, name, header, footer: url.replace(/^https?:\/\//, ""), width: small ? 300 : 380 }), [url, name, header, color, logo, small, c]);
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const copy = (text, what) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(what);
    setTimeout(() => setCopied(""), 1500);
  };
  const code = `<iframe src="${url}?embed=1" width="100%" height="600" style="border:0;max-width:100%" allow="fullscreen" allowfullscreen></iframe>`;
  const file = (url.split("/").pop() || "qr").replace(/[^a-z0-9-]/gi, "");
  return (
    <div className="fb-qr">
      <div className="fb-qr-art" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="fb-qr-side">
        <a className="mq-qr-url" href={url} target="_blank" rel="noreferrer">
          {url.replace(/^https?:\/\//, "")}
        </a>
        <div className="mq-qr-btns">
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => copy(url, "url")}>
            {copied === "url" ? <Check size={14} /> : <Copy size={14} />} {copied === "url" ? m.copied : m.copyLink}
          </button>
          <a className="md-btn md-btn-ghost sa-btn-sm" href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={14} /> {m.open}
          </a>
          <button
            type="button"
            className="md-btn md-btn-primary sa-btn-sm"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              downloadPng(svg, `${file}-qr.png`, 2.5).finally(() => setBusy(false));
            }}
          >
            {busy ? <Loader2 size={14} className="md-spin" /> : <Download size={14} />} {m.downloadQr}
          </button>
          {relink && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setAsking(true)} disabled={ctx.readOnly} data-testid="fb-new-link">
              <RefreshCw size={14} /> {m.newLink}
            </button>
          )}
        </div>
        {asking && (
          <Confirm
            m={m}
            title={m.newLinkTitle}
            sub={m.newLinkSub}
            yes={m.newLinkYes}
            onClose={() => setAsking(false)}
            onYes={async () => {
              let r;
              try {
                r = await flipbookService.newLink(ctx.id, relink.kind, relink.id);
              } catch (e) {
                ctx.notify({ type: "error", text: e.message });
                throw e;
              }
              const slug = r.data.slug;
              if (relink.kind === "library") ctx.put((d) => ({ settings: { ...d.settings, slug } }));
              if (relink.kind === "book") ctx.put((d) => ({ books: d.books.map((b) => (b._id === relink.id ? { ...b, slug } : b)) }));
              if (relink.kind === "category") ctx.put((d) => ({ categories: d.categories.map((c) => (c._id === relink.id ? { ...c, slug } : c)) }));
              onRelinked?.(slug);
              ctx.notify({ type: "success", text: m.newLinkDone });
            }}
          />
        )}
        {embed && (
          <label className="md-field fb-embed">
            <span>{m.embed}</span>
            <small className="rs-muted">{m.embedSub}</small>
            <textarea readOnly rows={3} value={code} onFocus={(e) => e.target.select()} />
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => copy(code, "code")}>
              {copied === "code" ? <Check size={14} /> : <Copy size={14} />} {copied === "code" ? m.copied : m.copy}
            </button>
          </label>
        )}
      </div>
    </div>
  );
}

// buy more book places (kind "book") or big book places (kind "big")
export function BuySlots({ ctx, kind, onClose, onDone }) {
  const { id, m, data, notify } = ctx;
  const price = kind === "big" ? data.prices.fb_big_slot : data.prices.fb_book_slot;
  const [n, setN] = useState(kind === "big" ? 1 : 5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = n * (price || 0);
  const balance = auth.getClientLogin()?.coin_balance ?? 0;
  const [askPay, payNode] = usePayConfirm();
  const buy = () => askPay(total, kind === "big" ? m.buyTitleBig : m.buyTitleBook, pay);
  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await flipbookService.buySlots(id, kind, n);
      if (r.balance !== undefined) auth.setClientLogin({ ...auth.getClientLogin(), coin_balance: r.balance });
      coinsChanged();
      if (r.room) ctx.put({ room: r.room });
      notify({ type: "success", text: m.bought.replace("{n}", n) });
      onDone?.(r);
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  const L = data.limits;
  return (
    <Modal
      title={kind === "big" ? m.buyTitleBig : m.buyTitleBook}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={buy} disabled={busy || n < 1 || total > balance} data-testid="fb-slots-buy">
            {busy ? <Loader2 size={15} className="md-spin" /> : <CoinIcon size={15} />} {m.buyFor.replace("{n}", n).replace("{coins}", fmt(total))}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <p className="rs-muted" style={{ margin: 0 }}>
          {kind === "big"
            ? m.buySubBig
                .replace("{mb}", L.big_bytes / 1048576)
                .replace("{pages}", L.big_pages)
                .replace("{coins}", fmt(price))
            : m.buySubBook.replace("{coins}", fmt(price))}
        </p>
        <label className="md-field">
          <span>{m.howMany}</span>
          <div className="mq-qty">
            <button type="button" onClick={() => setN(Math.max(1, n - 1))} aria-label="−1">
              <Minus size={15} />
            </button>
            <input type="number" min="1" max="500" value={n} onChange={(e) => setN(Math.max(1, Math.min(500, Math.round(Number(e.target.value) || 1))))} data-testid="fb-slots-n" />
            <button type="button" onClick={() => setN(Math.min(500, n + 1))} aria-label="+1">
              <Plus size={15} />
            </button>
          </div>
        </label>
        <div className="mq-qty-quick">
          {(kind === "big" ? [1, 2, 5, 10] : [5, 10, 20, 50]).map((k) => (
            <button key={k} type="button" className={n === k ? "on" : ""} onClick={() => setN(k)}>
              +{k}
            </button>
          ))}
        </div>
        {total > balance && <div className="md-form-error">{m.notEnough}</div>}
        {error && <div className="md-form-error">{error}</div>}
      </div>
      {payNode}
    </Modal>
  );
}

export function Confirm({ title, sub, onYes, onClose, m, yes }) {
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
            data-testid="fb-confirm-yes"
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
            {busy && <Loader2 size={15} className="md-spin" />} {yes || m.delete}
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
