import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Globe,
  Link2,
  NotebookPen,
  StickyNote,
  MessageSquareText,
  Paperclip,
  Palette,
  ScanLine,
  Wallet,
  BedDouble,
  Bell,
  Boxes,
  CalendarDays,
  ChefHat,
  Clock,
  Contact,
  Fingerprint,
  KeyRound,
  MapPin,
  Printer,
  QrCode,
  ScanBarcode,
  Share2,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Truck,
  Utensils,
  Warehouse,
  WifiOff,
  Gift,
  Stamp,
  Ticket,
} from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";

// big icon + 3 small floating icons for each business type (a new type without art gets the shop icon)
const ART = {
  namecard: { Main: Contact, chips: [QrCode, Share2, Star] },
  restaurant: { Main: ChefHat, chips: [Utensils, Printer, WifiOff] },
  mart: { Main: ShoppingCart, chips: [ScanBarcode, Boxes, Bell] },
  guest: { Main: BedDouble, chips: [CalendarDays, KeyRound, Sparkles] },
  warehouse: { Main: Warehouse, chips: [Truck, Boxes, BarChart3] },
  attend: { Main: Fingerprint, chips: [QrCode, MapPin, Clock] },
  website: { Main: Globe, chips: [Palette, Link2, BarChart3] },
  menu_qr: { Main: QrCode, chips: [Utensils, Star, Share2] },
  flipbook: { Main: BookOpen, chips: [Share2, QrCode, BarChart3] },
  qr_gen: { Main: ScanLine, chips: [QrCode, Printer, BarChart3] },
  debt_book: { Main: NotebookPen, chips: [Wallet, Bell, CalendarDays] },
  digital_note: { Main: StickyNote, chips: [Share2, MessageSquareText, Paperclip] },
  stamp_card: { Main: Stamp, chips: [QrCode, Gift, Bell] },
  event: { Main: Ticket, chips: [QrCode, ScanLine, BarChart3] },
};
const FALLBACK = { Main: Store, chips: [Star, BarChart3, Sparkles] };
const SOON = { en: "Coming soon", km: "ឆាប់ៗនេះ" };
const EVERY_MS = 5000;

// Every business type BizHub offers (from Website settings → services, same as the homepage),
// turning by themselves on the left of log in / sign up
export default function AuthSlides({ services = [] }) {
  const { lang } = useI18n();
  const list = services.filter((s) => s.title);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = list.length;
  useEffect(() => {
    if (i >= n) setI(0);
  }, [n, i]);
  useEffect(() => {
    if (paused || n < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), EVERY_MS);
    return () => clearInterval(t);
  }, [paused, n]);
  if (!n) return <div className="as" />;

  return (
    <div className="as" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel">
      <div className="as-stage">
        {list.map((s, k) => {
          const { Main, chips } = ART[s.key] || FALLBACK;
          return (
            <div key={s.key} className={`as-slide ${k === i ? "on" : ""}`} aria-hidden={k !== i}>
              <div className="as-art">
                <span className="as-ring" />
                <span className="as-main">
                  <Main size={44} strokeWidth={1.8} />
                </span>
                {chips.map((C, j) => (
                  <span key={j} className={`as-chip c${j}`}>
                    <C size={18} />
                  </span>
                ))}
              </div>
              <b className="as-title">
                {s.title}
                {s.coming_soon && <em className="as-soon">{SOON[lang] || SOON.en}</em>}
              </b>
              <p className="as-sub">{s.tag}</p>
              {Array.isArray(s.f) && s.f.length > 0 && (
                <ul className="as-feats">
                  {s.f.slice(0, 3).map((f) => (
                    <li key={f[1]}>{f[1]}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      {n > 1 && (
        <div className="as-dots" role="tablist">
          {list.map((s, k) => (
            <button key={s.key} type="button" role="tab" aria-selected={k === i} aria-label={s.title} className={k === i ? "on" : ""} onClick={() => setI(k)}>
              {k === i && !paused && <i key={`${k}-${i}`} style={{ animationDuration: `${EVERY_MS}ms` }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
