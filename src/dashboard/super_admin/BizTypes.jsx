import { BedDouble, BookOpen, Ticket, Fingerprint, NotebookPen, StickyNote, Stamp, Globe, IdCard, LayoutGrid, QrCode, ScanLine, ShoppingBasket, UtensilsCrossed } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import "./biztypes.css";

// business types (the same keys as the license "category"): one row of big chips to filter a page by type
export const BIZ_TYPES = ["restaurant", "mart", "guest_house", "website", "debt_book", "digital_note", "stamp_card", "event", "menu_qr", "flipbook", "qr_gen", "attendance", "namecard"];
const ICON = { "": LayoutGrid, restaurant: UtensilsCrossed, mart: ShoppingBasket, guest_house: BedDouble, attendance: Fingerprint, namecard: IdCard, menu_qr: QrCode, flipbook: BookOpen, qr_gen: ScanLine, website: Globe, debt_book: NotebookPen, digital_note: StickyNote, stamp_card: Stamp, event: Ticket };
const TEXT = {
  en: {
    "": "All types",
    restaurant: "Restaurant Management System",
    mart: "Mini Mart Management System",
    guest_house: "Guest House Management System",
    attendance: "Attendance Management System",
    namecard: "Name card",
    menu_qr: "Menu QR Code",
    flipbook: "Flip Book PDF",
    qr_gen: "QR Generator",
    website: "Website Builder",
    debt_book: "Debt Book",
    digital_note: "Digital Note",
    stamp_card: "Loyalty Stamp Card",
    event: "Event Tickets",
  },
  km: {
    "": "គ្រប់ប្រភេទ",
    restaurant: "ប្រព័ន្ធគ្រប់គ្រងភោជនីយដ្ឋាន",
    mart: "ប្រព័ន្ធគ្រប់គ្រងម៉ាតតូច",
    guest_house: "ប្រព័ន្ធគ្រប់គ្រងផ្ទះសំណាក់",
    attendance: "ប្រព័ន្ធគ្រប់គ្រងវត្តមាន",
    namecard: "នាមប័ណ្ណ",
    menu_qr: "ម៉ឺនុយកូដ QR",
    flipbook: "សៀវភៅត្រឡប់ PDF",
    qr_gen: "បង្កើតកូដ QR",
    website: "បង្កើតគេហទំព័រ",
    debt_book: "សៀវភៅបំណុល",
    digital_note: "កំណត់ត្រាឌីជីថល",
    stamp_card: "កាតប្រមូលត្រា",
    event: "សំបុត្រកម្មវិធី",
  },
};
export const bizTypeName = (k, lang) => (TEXT[lang] || TEXT.en)[k] || k;

// value = "" | a type · counts = { type: n } (optional, shown on each chip) · total = the "All" count
export function BizTypeChips({ value, onChange, counts, total, types = BIZ_TYPES, small = false }) {
  const { lang } = useI18n();
  return (
    <div className={`bt-row ${small ? "sm" : ""}`} role="tablist">
      {["", ...types].map((k) => {
        const Icon = ICON[k] || LayoutGrid;
        const n = k ? counts?.[k] : total;
        return (
          <button key={k || "all"} type="button" role="tab" aria-selected={value === k} className={`bt-chip t-${k || "all"} ${value === k ? "on" : ""}`} onClick={() => onChange(k)}>
            <span className="bt-ic">
              <Icon size={17} />
            </span>
            <span className="bt-text">
              <b>{bizTypeName(k, lang)}</b>
              {n !== undefined && <small>{new Intl.NumberFormat("en-US").format(n)}</small>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
