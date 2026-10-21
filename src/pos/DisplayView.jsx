import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChefHat, Maximize2 } from "lucide-react";
import { fmtMoney } from "./util";
import "./display.css";

// The customer display, drawn from a "picture" the POS sends: { mode, restaurant, look, order, change … }.
// Pure, so the dashboard shows exactly the same thing as a preview.
// Each look (theme) is its own layout, not only other colours:
//   clean     split screen: order on the left; small slider + total on the right
//   midnight  "Spotlight": big slider on top, total glowing over it, the order as a strip of cards below (dark)
//   sunset    "Paper receipt": big slider on the left, the order printed on a paper receipt on the right
//   nature    "Item cards": the order as a grid of cards, slider at the side, total bar along the bottom
//   luxe      "Menu board": centred serif list with dotted leaders, framed slider on top, gold total
//   playful   "Bubbles": round bubbles for each dish, total inside a big circle
export function DisplayView({ pic, online = true, showFs = false, poke, embedded }) {
  const R = pic?.restaurant || {};
  const look = pic?.look || {};
  const mode = pic?.mode || "idle";
  const theme = look.theme || "clean";
  const accent = look.color || (theme === "clean" ? R.color : "");
  return (
    <div className={`gd gd-m-${mode} gd-theme-${theme} ${embedded ? "gd-embedded" : ""}`} onMouseMove={poke} onTouchStart={poke} style={accent ? { "--gd-brand": accent, "--gd-on-brand": "#ffffff" } : undefined}>
      {look.header ? <div className="gd-bar">{look.header}</div> : <span />}
      <div className="gd-main">
        {showFs && !document.fullscreenElement && (
          <button type="button" className="gd-fs" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
            <Maximize2 size={16} /> Full screen
          </button>
        )}
        {!online && <span className="gd-dot" title="No internet" />}
        {mode === "locked" && <Locked />}
        {mode === "idle" && (look.banners?.length ? <Welcome look={look} R={R} /> : <Idle R={R} look={look} />)}
        {mode === "order" && <OrderView pic={pic} R={R} look={look} theme={theme} />}
        {mode === "thanks" && <Thanks pic={pic} R={R} look={look} />}
      </div>
      {look.footer ? <div className="gd-bar foot">{look.footer}</div> : <span />}
    </div>
  );
}

function Locked() {
  return (
    <div className="gd-center">
      <h1>
        <span className="km">អេក្រង់សម្រាប់ភ្ញៀវ</span>
        <span>Customer display</span>
      </h1>
      <p style={{ maxWidth: 520, color: "var(--gd-muted)" }}>បើកមុខងារ “អេក្រង់សម្រាប់ភ្ញៀវ” ក្នុងផ្ទាំង BizHub → មុខងារបន្ថែម។ · Turn on the “Customer display” add-on in the BizHub dashboard → Add-ons.</p>
    </div>
  );
}

// pictures that fade one into the next
function Slider({ images, seconds = 6, className = "" }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!images || images.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % images.length), seconds * 1000);
    return () => clearInterval(t);
  }, [images?.length, seconds]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!images?.length) return null;
  return (
    <div className={`gd-slider ${className}`}>
      {images.map((src, k) => (
        <img key={src} src={src} alt="" className={k === i % images.length ? "on" : ""} />
      ))}
      {images.length > 1 && (
        <span className="gd-dots">
          {images.map((src, k) => (
            <i key={src} className={k === i % images.length ? "on" : ""} />
          ))}
        </span>
      )}
    </div>
  );
}

// the pictures beside an order: the small "side" set, else the waiting pictures
const sideImages = (look) => (look.side_banners?.length ? look.side_banners : look.banners || []);

function Brand({ R, big, logo = true }) {
  return (
    <div className={`gd-brand ${big ? "big" : ""}`}>
      {logo && <span className="gd-logo">{R.logo ? <img src={R.logo} alt="" /> : <ChefHat size={big ? 54 : 28} />}</span>}
      <div>
        {R.name_km && <b className="km">{R.name_km}</b>}
        {R.name_en && <span>{R.name_en}</span>}
      </div>
    </div>
  );
}

function Hello({ look }) {
  return look.welcome ? (
    <span>{look.welcome}</span>
  ) : (
    <>
      <span className="km">សូមស្វាគមន៍</span>
      <span>Welcome</span>
    </>
  );
}

function Idle({ R, look }) {
  return (
    <div className="gd-center">
      <Brand R={R} big logo={look.show_logo !== false} />
      <h1>
        <Hello look={look} />
      </h1>
    </div>
  );
}

// nobody ordering: the shop's pictures, full screen
function Welcome({ look, R }) {
  return (
    <div className="gd-welcome">
      <Slider images={look.banners} seconds={look.slide_seconds} className="gd-s-full" />
      <div className="gd-welcome-text">
        <h1>
          <Hello look={look} />
        </h1>
        <Brand R={R} logo={look.show_logo !== false} />
      </div>
    </div>
  );
}

// ---------------- order ----------------
const nameKm = (l) => l.name_km || l.name_en;
const extras = (l) => [l.size, ...(l.addons || []), l.promo && `🏷 ${l.promo}`].filter(Boolean).join(" · ");

function Totals({ pic, big }) {
  const t = pic.order.totals;
  const c = pic.currency;
  return (
    <>
      <div className="gd-rows">
        <div>
          <span>សរុបរង Subtotal</span>
          <span>{fmtMoney(t.subtotal, c)}</span>
        </div>
        {t.discount > 0 && (
          <div className="gd-disc">
            <span>បញ្ចុះតម្លៃ Discount</span>
            <span>−{fmtMoney(t.discount, c)}</span>
          </div>
        )}
        {t.service > 0 && (
          <div>
            <span>សេវា Service</span>
            <span>{fmtMoney(t.service, c)}</span>
          </div>
        )}
        {t.vat > 0 && (
          <div>
            <span>{t.vat_included ? "រួមអាករ VAT incl." : "អាករ VAT"}</span>
            <span>{fmtMoney(t.vat, c)}</span>
          </div>
        )}
      </div>
      <Grand pic={pic} big={big} />
    </>
  );
}
function Grand({ pic, big, className = "" }) {
  const t = pic.order.totals;
  return (
    <div className={`gd-grand ${big ? "big" : ""} ${className}`}>
      <span>សរុប · Total</span>
      <b>{fmtMoney(t.total, pic.currency)}</b>
      <em>{fmtMoney(t.other, pic.other)}</em>
      {pic.order.member && (
        <small className="gd-member">
          ★ {pic.order.member.name}
          {pic.order.member.earn > 0 ? ` · +${pic.order.member.earn} ពិន្ទុ points` : ""}
        </small>
      )}
    </div>
  );
}
const where = (o) => (o.table ? `តុ Table ${o.table}` : "ខ្ចប់ Takeaway");

function useScrollEnd(dep) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, left: ref.current.scrollWidth, behavior: "smooth" });
  }, [dep]);
  return ref;
}

function OrderView({ pic, R, look, theme }) {
  const props = { pic, R, look };
  if (theme === "midnight") return <Spotlight {...props} />;
  if (theme === "sunset") return <PaperReceipt {...props} />;
  if (theme === "nature") return <ItemCards {...props} />;
  if (theme === "luxe") return <MenuBoard {...props} />;
  if (theme === "playful") return <Bubbles {...props} />;
  return <Split {...props} />;
}

// clean: order list | slider + totals
function Split({ pic, R, look }) {
  const o = pic.order;
  const listRef = useScrollEnd(o.lines.length);
  const imgs = sideImages(look);
  return (
    <div className="gd-order">
      <section className="gd-lines">
        <header>
          <Brand R={R} logo={look.show_logo !== false} />
          <span className="gd-where">{where(o)}</span>
        </header>
        <div className="gd-list" ref={listRef}>
          {o.lines.map((l) => (
            <div key={l.id} className="gd-line">
              <span className="gd-qty">{l.qty}×</span>
              <span className="gd-name">
                <b>{nameKm(l)}</b>
                {l.name_km && l.name_en && <small>{l.name_en}</small>}
                {extras(l) && <small className="gd-extra">{extras(l)}</small>}
              </span>
              <span className="gd-price">{fmtMoney(l.total, pic.currency)}</span>
            </div>
          ))}
        </div>
      </section>
      <section className={`gd-total ${imgs.length ? "with-slider" : ""}`}>
        {imgs.length > 0 && <Slider images={imgs} seconds={look.slide_seconds} className="gd-s-side" />}
        <div className="gd-total-bottom">
          <Totals pic={pic} />
          <small className="gd-rate">1 USD = {fmtMoney(pic.rate, "KHR")}</small>
        </div>
      </section>
    </div>
  );
}

// midnight: big slider on top with the total over it, the order as a strip of cards
function Spotlight({ pic, R, look }) {
  const o = pic.order;
  const stripRef = useScrollEnd(o.lines.length);
  const imgs = sideImages(look);
  return (
    <div className="gd-spot">
      <div className="gd-spot-top">
        {imgs.length > 0 ? <Slider images={imgs} seconds={look.slide_seconds} className="gd-s-full" /> : <div className="gd-spot-glow" />}
        <div className="gd-spot-head">
          <Brand R={R} logo={look.show_logo !== false} />
          <span className="gd-where">{where(o)}</span>
        </div>
        <Grand pic={pic} big className="gd-spot-total" />
      </div>
      <div className="gd-spot-strip" ref={stripRef}>
        {o.lines.map((l) => (
          <div key={l.id} className="gd-spot-card">
            <span className="gd-qty">{l.qty}×</span>
            <b>{nameKm(l)}</b>
            {l.name_km && l.name_en && <small>{l.name_en}</small>}
            <span className="gd-price">{fmtMoney(l.total, pic.currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// sunset: slider on the left, a paper receipt on the right
function PaperReceipt({ pic, R, look }) {
  const o = pic.order;
  const listRef = useScrollEnd(o.lines.length);
  const imgs = sideImages(look);
  return (
    <div className={`gd-paperview ${imgs.length ? "" : "no-pic"}`}>
      {imgs.length > 0 && <Slider images={imgs} seconds={look.slide_seconds} className="gd-s-full gd-s-round" />}
      <div className="gd-paper">
        <Brand R={R} logo={look.show_logo !== false} />
        <div className="gd-paper-meta">
          <span>#{o.number}</span>
          <span>{where(o)}</span>
        </div>
        <div className="gd-paper-list" ref={listRef}>
          {o.lines.map((l) => (
            <div key={l.id} className="gd-paper-line">
              <span>
                {l.qty} × {nameKm(l)}
                {extras(l) && <small>{extras(l)}</small>}
              </span>
              <b>{fmtMoney(l.total, pic.currency)}</b>
            </div>
          ))}
        </div>
        <Totals pic={pic} />
      </div>
    </div>
  );
}

// nature: grid of item cards, slider at the side, total bar at the bottom
function ItemCards({ pic, R, look }) {
  const o = pic.order;
  const gridRef = useScrollEnd(o.lines.length);
  const imgs = sideImages(look);
  return (
    <div className="gd-cards">
      <div className="gd-cards-main">
        <header>
          <Brand R={R} logo={look.show_logo !== false} />
          <span className="gd-where">{where(o)}</span>
        </header>
        <div className="gd-cards-grid" ref={gridRef}>
          {o.lines.map((l) => (
            <div key={l.id} className="gd-card">
              <span className="gd-card-qty">{l.qty}</span>
              <b>{nameKm(l)}</b>
              {l.name_km && l.name_en && <small>{l.name_en}</small>}
              {extras(l) && <small className="gd-extra">{extras(l)}</small>}
              <span className="gd-price">{fmtMoney(l.total, pic.currency)}</span>
            </div>
          ))}
        </div>
      </div>
      {imgs.length > 0 && <Slider images={imgs} seconds={look.slide_seconds} className="gd-s-side gd-s-tall" />}
      <div className="gd-cards-bar">
        <span>
          {o.totals.items} មុខ · items
        </span>
        {o.totals.discount > 0 && <span className="gd-disc">−{fmtMoney(o.totals.discount, pic.currency)}</span>}
        <span className="gd-cards-total">
          សរុប Total <b>{fmtMoney(o.totals.total, pic.currency)}</b> <em>{fmtMoney(o.totals.other, pic.other)}</em>
        </span>
      </div>
    </div>
  );
}

// luxe: framed slider on top, centred menu-board list, gold total
function MenuBoard({ pic, R, look }) {
  const o = pic.order;
  const listRef = useScrollEnd(o.lines.length);
  const imgs = sideImages(look);
  return (
    <div className="gd-board">
      <div className="gd-board-top">
        <Brand R={R} logo={look.show_logo !== false} />
        {imgs.length > 0 && <Slider images={imgs} seconds={look.slide_seconds} className="gd-s-framed" />}
      </div>
      <div className="gd-board-list" ref={listRef}>
        {o.lines.map((l) => (
          <div key={l.id} className="gd-board-line">
            <span className="gd-board-name">
              {l.qty > 1 && <em>{l.qty} × </em>}
              {nameKm(l)}
              {l.name_km && l.name_en && <small> · {l.name_en}</small>}
            </span>
            <i />
            <b>{fmtMoney(l.total, pic.currency)}</b>
          </div>
        ))}
      </div>
      <div className="gd-board-total">
        <span>{where(o)}</span>
        <Grand pic={pic} />
      </div>
    </div>
  );
}

// playful: bubbles for each dish, total in a big circle
function Bubbles({ pic, R, look }) {
  const o = pic.order;
  const ref = useScrollEnd(o.lines.length);
  const imgs = sideImages(look);
  return (
    <div className="gd-bubbles">
      <div className="gd-bubbles-main">
        <header>
          <Brand R={R} logo={look.show_logo !== false} />
          <span className="gd-where">{where(o)}</span>
        </header>
        <div className="gd-bubble-list" ref={ref}>
          {o.lines.map((l, i) => (
            <div key={l.id} className={`gd-bubble c${i % 4}`}>
              <span className="gd-bubble-qty">{l.qty}</span>
              <span>
                <b>{nameKm(l)}</b>
                {l.name_km && l.name_en && <small>{l.name_en}</small>}
              </span>
              <span className="gd-price">{fmtMoney(l.total, pic.currency)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="gd-bubbles-side">
        {imgs.length > 0 && <Slider images={imgs} seconds={look.slide_seconds} className="gd-s-blob" />}
        <div className="gd-circle">
          <span>សរុប · Total</span>
          <b>{fmtMoney(o.totals.total, pic.currency)}</b>
          <em>{fmtMoney(o.totals.other, pic.other)}</em>
        </div>
      </div>
    </div>
  );
}

// ---------------- thank you ----------------
function Thanks({ pic, R, look }) {
  const o = pic.order;
  const c = pic.currency;
  const ch = pic.change || {};
  const hasChange = ch.usd > 0 || ch.khr > 0;
  const bg = look.thanks_bg;
  const blur = Math.round(((look.thanks_blur ?? 30) / 100) * 24);
  return (
    <div className={`gd-thanks ${bg ? "has-bg" : ""}`}>
      {bg && (
        <>
          <img className="gd-thanks-bg" src={bg} alt="" style={{ filter: blur ? `blur(${blur}px)` : undefined, transform: blur ? "scale(1.08)" : undefined }} />
          <span className="gd-thanks-shade" />
        </>
      )}
      <div className="gd-center">
        <CheckCircle2 size={96} className="gd-check" />
        <h1>
          {look.thanks ? (
            <span>{look.thanks}</span>
          ) : (
            <>
              <span className="km">សូមអរគុណ!</span>
              <span>Thank you!</span>
            </>
          )}
        </h1>
        <div className="gd-paid">
          <span>បានបង់ · Paid</span>
          <b>{fmtMoney(o.totals.total, c)}</b>
        </div>
        {hasChange && (
          <div className="gd-change">
            <span>លុយអាប់ · Your change</span>
            <b>{[ch.usd > 0 && fmtMoney(ch.usd, "USD"), ch.khr > 0 && fmtMoney(ch.khr, "KHR")].filter(Boolean).join(" + ")}</b>
          </div>
        )}
        <Brand R={R} logo={look.show_logo !== false} />
      </div>
    </div>
  );
}
