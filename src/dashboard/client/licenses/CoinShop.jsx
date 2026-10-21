import { useCallback, useEffect, useRef, useState } from "react";
import { CoinShopSkeleton } from "../../../components/skeleton/Skeleton";
import { Check, CheckCircle2, Clock, Copy, Download, ExternalLink, Gift, Maximize2, Minus, Phone, Plus, Send, ShoppingCart, Upload, X, XCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { coinShopService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { useI18n } from "../../../i18n/I18nProvider";
import "./coinshop.css";

const TEXT = {
  en: {
    title: "Buy coins",
    sub: "Pay by bank transfer (ABA, ACLEDA, KHQR…), send the screenshot, and the BizHub team adds your coins after checking.",
    coins: "coins",
    free: "+{n} free",
    off: "{p}% free",
    add: "Add to cart",
    cart: "Cart",
    cartEmpty: "Pick a package to start.",
    youGet: "You get",
    toPay: "To pay",
    checkout: "Checkout",
    payTitle: "Pay {amt}",
    step1: "1 · Choose the bank you pay with",
    qrFixed: "The amount is already in this QR — just scan and pay.",
    payWith: "Pay with {bank} app",
    viewQr: "View the QR full size",
    qrType: "Scan, then type {amt} in your bank app.",
    step2: "2 · Scan the QR and pay exactly {amt}",
    step3: "3 · Upload the transfer screenshot",
    saveQr: "Save QR",
    copy: "Copy",
    copied: "Copied",
    accName: "Account name",
    accNo: "Account no.",
    proof: "Transfer screenshot",
    proofPick: "Tap to choose the screenshot",
    reference: "Transaction ID (optional)",
    note: "Note (optional)",
    send: "Send order",
    sending: "Sending…",
    sentTitle: "Order sent — waiting for confirmation",
    sentSub: "The BizHub team checks the bank and adds {coins} coins to your wallet. You'll see it here and in Chat with BizHub.",
    urgent: "Need it fast? Contact us",
    call: "Call",
    telegram: "Telegram",
    hours: "Hours",
    done: "Done",
    myOrders: "My coin orders",
    noOrders: "No coin orders yet.",
    status: { pending: "Waiting", approved: "Added", rejected: "Rejected", cancelled: "Cancelled" },
    cancel: "Cancel order",
    noBanks: "Online payment is not ready yet. Please contact BizHub.",
    soon: "Visa / Mastercard and instant payment are coming soon.",
    waiting: "{n} waiting",
    remove: "Remove",
  },
  km: {
    title: "ទិញកាក់",
    sub: "បង់តាមការផ្ទេរប្រាក់ (ABA, ACLEDA, KHQR…) ផ្ញើរូបវិក្កយបត្រ ហើយក្រុមការងារ BizHub នឹងបញ្ចូលកាក់បន្ទាប់ពីពិនិត្យ។",
    coins: "កាក់",
    free: "+{n} ឥតគិតថ្លៃ",
    off: "ថែម {p}%",
    add: "ដាក់ចូលកន្ត្រក",
    cart: "កន្ត្រក",
    cartEmpty: "ជ្រើសរើសកញ្ចប់ដើម្បីចាប់ផ្តើម។",
    youGet: "អ្នកទទួលបាន",
    toPay: "ត្រូវបង់",
    checkout: "ទូទាត់",
    payTitle: "បង់ {amt}",
    step1: "1 · ជ្រើសរើសធនាគារដែលអ្នកបង់",
    qrFixed: "ចំនួនទឹកប្រាក់មានក្នុង QR នេះរួចហើយ — គ្រាន់តែស្កេន ហើយបង់។",
    payWith: "បង់តាមកម្មវិធី {bank}",
    viewQr: "មើល QR ទំហំពេញ",
    qrType: "ស្កេន រួចវាយ {amt} ក្នុងកម្មវិធីធនាគាររបស់អ្នក។",
    step2: "2 · ស្កេន QR ហើយបង់ឲ្យត្រូវ {amt}",
    step3: "3 · បញ្ចូលរូបវិក្កយបត្រផ្ទេរប្រាក់",
    saveQr: "រក្សាទុក QR",
    copy: "ចម្លង",
    copied: "បានចម្លង",
    accName: "ឈ្មោះគណនី",
    accNo: "លេខគណនី",
    proof: "រូបវិក្កយបត្រ",
    proofPick: "ចុចដើម្បីជ្រើសរើសរូប",
    reference: "លេខប្រតិបត្តិការ (ស្រេចចិត្ត)",
    note: "កំណត់ចំណាំ (ស្រេចចិត្ត)",
    send: "ផ្ញើការកម្ម៉ង់",
    sending: "កំពុងផ្ញើ…",
    sentTitle: "បានផ្ញើ — កំពុងរង់ចាំការបញ្ជាក់",
    sentSub: "ក្រុមការងារ BizHub ពិនិត្យធនាគារ ហើយបញ្ចូលកាក់ {coins} ទៅកាបូបរបស់អ្នក។ អ្នកនឹងឃើញនៅទីនេះ និងក្នុង “ជជែកជាមួយ BizHub”។",
    urgent: "ត្រូវការលឿន? ទាក់ទងយើង",
    call: "ទូរស័ព្ទ",
    telegram: "Telegram",
    hours: "ម៉ោង",
    done: "រួចរាល់",
    myOrders: "ការកម្ម៉ង់កាក់របស់ខ្ញុំ",
    noOrders: "មិនទាន់មានការកម្ម៉ង់កាក់ទេ។",
    status: { pending: "កំពុងរង់ចាំ", approved: "បានបញ្ចូល", rejected: "បដិសេធ", cancelled: "បោះបង់" },
    cancel: "បោះបង់ការកម្ម៉ង់",
    noBanks: "ការបង់ប្រាក់អនឡាញមិនទាន់រួចរាល់ទេ។ សូមទាក់ទង BizHub។",
    soon: "Visa / Mastercard និងការបង់ភ្លាមៗ នឹងមកដល់ឆាប់ៗ។",
    waiting: "កំពុងរង់ចាំ {n}",
    remove: "លុប",
  },
};
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const usd = (v) => `$${(Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtWhen = (d, lang) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(d));
const CART_KEY = "bizhub_coin_cart";

export function useCoinText() {
  const { lang } = useI18n();
  return { x: TEXT[lang] || TEXT.en, lang };
}

// the hotline card (after an order, in the chat page…)
export function Hotline({ h, x }) {
  if (!h || !(h.phone || h.telegram || h.email)) return null;
  const tg = (h.telegram || "").replace(/^https?:\/\/t\.me\//i, "").replace(/^@/, "");
  return (
    <div className="cs-hotline">
      <b>{x.urgent}</b>
      {h.note && <small className="rs-muted">{h.note}</small>}
      <div className="cs-hot-btns">
        {h.phone && (
          <a className="md-btn md-btn-ghost sa-btn-sm" href={`tel:${h.phone.replace(/[^\d+]/g, "")}`}>
            <Phone size={14} /> {h.phone}
          </a>
        )}
        {tg && (
          <a className="md-btn md-btn-ghost sa-btn-sm" href={`https://t.me/${tg}`} target="_blank" rel="noreferrer">
            <Send size={14} /> @{tg}
          </a>
        )}
        {h.email && (
          <a className="md-btn md-btn-ghost sa-btn-sm" href={`mailto:${h.email}`}>
            {h.email}
          </a>
        )}
      </div>
      {h.hours && (
        <small className="rs-muted">
          {x.hours}: {h.hours}
        </small>
      )}
    </div>
  );
}

// Buy coins: packages → cart → pay by bank (QR) → upload the screenshot → the team confirms
export default function CoinShop({ notify, onWaiting }) {
  const { x, lang } = useCoinText();
  const [shop, setShop] = useState(null);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || {};
    } catch {
      return {};
    }
  });
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(null);
  const load = useCallback(
    () =>
      coinShopService
        .shop()
        .then((r) => {
          setShop(r.data);
          onWaiting?.(r.data.waiting);
        })
        .catch((e) => notify?.({ type: "error", text: e.message })),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* private mode */
    }
  }, [cart]);
  if (!shop) return <CoinShopSkeleton />;
  const lines = shop.packages.filter((p) => cart[p.key] > 0).map((p) => ({ ...p, qty: cart[p.key] }));
  const coins = lines.reduce((a, l) => a + l.coins * l.qty, 0);
  const bonus = lines.reduce((a, l) => a + l.bonus * l.qty, 0);
  const total = Math.round(lines.reduce((a, l) => a + l.usd * l.qty, 0) * 100) / 100;
  const setQty = (k, n) => setCart((c) => ({ ...c, [k]: Math.max(0, Math.min(20, n)) }));
  const best = shop.packages.reduce((a, p) => (p.bonus_pct > (a?.bonus_pct || 0) ? p : a), null);
  return (
    <div className="rs-col">
      <section className="panel-card cs-head">
        <span className="cs-head-ic">
          <CoinIcon size={40} />
        </span>
        <div>
          <h2>{x.title}</h2>
          <p className="rs-muted">{x.sub}</p>
        </div>
      </section>
      <div className="cs-layout">
        <div className="cs-packs">
          {shop.packages.map((p) => {
            const n = cart[p.key] || 0;
            return (
              <article key={p.key} className={`cs-pack ${n ? "on" : ""} ${best?.key === p.key ? "best" : ""}`} data-testid="cs-pack">
                {p.bonus_pct > 0 && <em className="cs-badge">{x.off.replace("{p}", p.bonus_pct)}</em>}
                <CoinIcon size={44} />
                <b className="cs-coins">{fmt(p.coins)}</b>
                <small>{x.coins}</small>
                {p.bonus > 0 ? (
                  <span className="cs-free">
                    <Gift size={13} /> {x.free.replace("{n}", fmt(p.bonus))}
                  </span>
                ) : (
                  <span className="cs-free none">&nbsp;</span>
                )}
                <b className="cs-price">{usd(p.usd)}</b>
                {n ? (
                  <span className="cs-qty">
                    <button type="button" onClick={() => setQty(p.key, n - 1)} aria-label="−">
                      <Minus size={15} />
                    </button>
                    <b>{n}</b>
                    <button type="button" onClick={() => setQty(p.key, n + 1)} aria-label="+">
                      <Plus size={15} />
                    </button>
                  </span>
                ) : (
                  <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setQty(p.key, 1)} data-testid="cs-add">
                    <ShoppingCart size={14} /> {x.add}
                  </button>
                )}
              </article>
            );
          })}
        </div>
        <aside className="panel-card cs-cart">
          <h3>
            <ShoppingCart size={18} /> {x.cart}
          </h3>
          {!lines.length ? (
            <p className="rs-muted">{x.cartEmpty}</p>
          ) : (
            <>
              {lines.map((l) => (
                <div key={l.key} className="cs-line">
                  <span>
                    <b>
                      {l.qty} × {fmt(l.coins)}
                    </b>
                    {l.bonus > 0 && <small className="cs-green"> {x.free.replace("{n}", fmt(l.bonus * l.qty))}</small>}
                  </span>
                  <b>{usd(l.usd * l.qty)}</b>
                  <button type="button" className="md-icon-btn" onClick={() => setQty(l.key, 0)} aria-label={x.remove}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="cs-sum">
                <span>{x.youGet}</span>
                <b>
                  <CoinIcon size={18} /> {fmt(coins + bonus)}
                </b>
              </div>
              <div className="cs-sum total">
                <span>{x.toPay}</span>
                <b data-testid="cs-total">{usd(total)}</b>
              </div>
            </>
          )}
          <button type="button" className="md-btn md-btn-primary cs-go" disabled={!lines.length || !shop.banks.length} onClick={() => setOpen(true)} data-testid="cs-checkout">
            {x.checkout} {lines.length ? `· ${usd(total)}` : ""}
          </button>
          {!shop.banks.length && <small className="rs-muted">{x.noBanks}</small>}
          <small className="rs-muted cs-soon">{x.soon}</small>
        </aside>
      </div>
      <section className="panel-card">
        <h3 style={{ marginTop: 0 }}>{x.myOrders}</h3>
        {!shop.orders.length ? (
          <p className="rs-muted">{x.noOrders}</p>
        ) : (
          <div className="cs-orders">
            {shop.orders.map((o) => (
              <div key={o._id} className={`cs-order s-${o.status}`} data-testid="cs-order">
                <span className="cs-order-ic">{o.status === "approved" ? <CheckCircle2 size={18} /> : o.status === "pending" ? <Clock size={18} /> : <XCircle size={18} />}</span>
                <span className="cs-order-main">
                  <b>
                    {o.no} · {fmt(o.total_coins)} {x.coins}
                  </b>
                  <small className="rs-muted">
                    {fmtWhen(o.created_date, lang)} · {usd(o.usd)} · {o.bank?.name}
                    {o.reference ? ` · ${o.reference}` : ""}
                  </small>
                  {o.status === "rejected" && o.reason && <small className="cs-red">{o.reason}</small>}
                </span>
                <span className={`lc-badge s-${o.status === "approved" ? "active" : o.status === "pending" ? "expiring" : "expired"}`}>{x.status[o.status]}</span>
                {o.status === "pending" && (
                  <button
                    type="button"
                    className="md-btn md-btn-ghost sa-btn-sm sa-danger-text"
                    onClick={() =>
                      coinShopService
                        .cancel(o._id)
                        .then(load)
                        .catch((e) => notify?.({ type: "error", text: e.message }))
                    }
                  >
                    {x.cancel}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      {open && (
        <Checkout
          x={x}
          shop={shop}
          lines={lines}
          total={total}
          coins={coins + bonus}
          onClose={() => setOpen(false)}
          onSent={(order, hotline) => {
            setOpen(false);
            setCart({});
            setSent({ order, hotline });
            load();
          }}
        />
      )}
      {sent && (
        <Modal
          title={x.sentTitle}
          onClose={() => setSent(null)}
          footer={
            <button type="button" className="md-btn md-btn-primary" onClick={() => setSent(null)}>
              {x.done}
            </button>
          }
        >
          <div className="cs-sent">
            <span className="cs-sent-ic">
              <Clock size={30} />
            </span>
            <b>
              {sent.order.no} · {fmt(sent.order.total_coins)} {x.coins} · {usd(sent.order.usd)}
            </b>
            <p className="rs-muted">{x.sentSub.replace("{coins}", fmt(sent.order.total_coins))}</p>
            <Hotline h={sent.hotline} x={x} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function Checkout({ x, shop, lines, total, coins, onClose, onSent }) {
  const [bank, setBank] = useState(shop.banks[0]?.key || "");
  const [proof, setProof] = useState(null);
  const [proofUrl, setProofUrl] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const pick = useRef(null);
  useEffect(() => () => proofUrl && URL.revokeObjectURL(proofUrl), [proofUrl]);
  const b = shop.banks.find((v) => v.key === bank);
  // a QR with exactly this amount in it? then the customer just scans and pays
  const fixed = b?.amount_qrs?.find((q) => Math.round(q.usd * 100) === Math.round(total * 100));
  const qrSrc = fixed ? fixed.qr : b?.qr;
  const payUrl = fixed ? fixed.link : b?.link;
  const [view, setView] = useState(false); // the QR full size
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await coinShopService.order({ items: lines.map((l) => ({ key: l.key, qty: l.qty })), bank, reference, note, proof });
      onSent(r.data, r.hotline);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  const copy = (v) => {
    navigator.clipboard?.writeText(v).catch(() => {});
    setCopied(v);
    setTimeout(() => setCopied(""), 1500);
  };
  return (
    <Modal
      title={x.payTitle.replace("{amt}", usd(total))}
      onClose={onClose}
      busy={busy}
      size="md-modal-lg"
      footer={
        <>
          <span className="cs-foot-get">
            <CoinIcon size={18} /> {fmt(coins)}
          </span>
          <button type="button" className="md-btn md-btn-primary" onClick={send} disabled={busy || !bank || !proof} data-testid="cs-send">
            {busy ? x.sending : x.send}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <b className="cs-step">{x.step1}</b>
        <div className="cs-banks">
          {shop.banks.map((v) => (
            <button key={v.key} type="button" className={`cs-bank ${bank === v.key ? "on" : ""}`} onClick={() => setBank(v.key)} data-testid="cs-bank">
              {bank === v.key && <Check size={14} className="cs-bank-check" />}
              <b>{v.name}</b>
              <small className="rs-muted">{v.account_name}</small>
            </button>
          ))}
        </div>
        {b && (
          <>
            <b className="cs-step">{x.step2.replace("{amt}", usd(total))}</b>
            <div className={`cs-qr ${fixed ? "fixed" : ""}`}>
              <div className="cs-qr-pic">
                <button type="button" className="cs-qr-zoom" onClick={() => setView(true)} title={x.viewQr} aria-label={x.viewQr}>
                  <img src={qrSrc} alt="QR" data-testid="cs-qr-img" />
                  <span className="cs-qr-zoom-ic">
                    <Maximize2 size={15} />
                  </span>
                </button>
                {payUrl && (
                  <a className="md-btn md-btn-primary cs-pay-link" href={payUrl} target="_blank" rel="noreferrer" data-testid="cs-pay-link">
                    <ExternalLink size={15} /> {x.payWith.replace("{bank}", b.name)}
                  </a>
                )}
                <a className="md-btn md-btn-ghost sa-btn-sm" href={qrSrc} download={`${b.name}-${fixed ? total : "qr"}`} target="_blank" rel="noreferrer">
                  <Download size={14} /> {x.saveQr}
                </a>
              </div>
              <div className="cs-qr-info">
                <b className="cs-qr-amt">{usd(total)}</b>
                <small className={`cs-qr-tip ${fixed ? "ok" : ""}`} data-testid="cs-qr-tip">
                  {fixed ? x.qrFixed : x.qrType.replace("{amt}", usd(total))}
                </small>
                {b.account_name && (
                  <span>
                    <small className="rs-muted">{x.accName}</small>
                    <b>{b.account_name}</b>
                  </span>
                )}
                {b.account_no && (
                  <span>
                    <small className="rs-muted">{x.accNo}</small>
                    <b>
                      {b.account_no}{" "}
                      <button type="button" className="sa-link" onClick={() => copy(b.account_no)}>
                        <Copy size={12} /> {copied === b.account_no ? x.copied : x.copy}
                      </button>
                    </b>
                  </span>
                )}
                {b.note && <small className="rs-muted">{b.note}</small>}
              </div>
            </div>
            {/* the QR full size (tap anywhere to close) */}
            {view &&
              createPortal(
                <div className="cs-qr-view" onClick={() => setView(false)} role="dialog" aria-label={x.viewQr} data-testid="cs-qr-view">
                  <img src={qrSrc} alt="QR" />
                  <button type="button" aria-label={x.close || "Close"} onClick={() => setView(false)}>
                    <X size={22} />
                  </button>
                </div>,
                document.body,
              )}
          </>
        )}
        <b className="cs-step">{x.step3}</b>
        <button type="button" className={`cs-proof ${proof ? "has" : ""}`} onClick={() => pick.current?.click()} data-testid="cs-proof">
          {proofUrl ? <img src={proofUrl} alt="" /> : <Upload size={22} />}
          <span>{proof ? proof.name : x.proofPick}</span>
        </button>
        <input
          ref={pick}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          data-testid="cs-proof-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setProof(f);
            setProofUrl(URL.createObjectURL(f));
          }}
        />
        <div className="md-fields-grid">
          <label className="md-field">
            <span>{x.reference}</span>
            <input maxLength={80} value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
          <label className="md-field">
            <span>{x.note}</span>
            <input maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}
