import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CoinShop, { useCoinText } from "./CoinShop";
import { BIZ_TYPES, BizTypeChips } from "../../super_admin/BizTypes";
import { webLookName } from "../../../web/themes";
import { restPosName } from "../../../pos/restThemes";
import { Link } from "react-router-dom";
import {
  Bike,
  ShoppingCart,
  CheckCheck,
  FileDown,
  Mic,
  Type,
  Images,
  ImagePlus,
  CalendarX,
  NotebookPen,
  StickyNote,
  HardDrive,
  BellRing,
  UserCog,
  FileSpreadsheet,
  Files,
  Newspaper,
  Paintbrush,
  ClipboardCheck,
  MapPinned,
  Monitor,
  Network,
  Scale,
  TrendingUp,
  ShoppingBasket,
  ShoppingBag,
  Truck,
  HandCoins,
  Banknote,
  Barcode,
  AlertTriangle,
  Building2,
  Gift,
  HandPlatter,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  ChefHat,
  ChevronRight,
  CreditCard,
  EyeOff,
  Fingerprint,
  MapPin,
  History,
  Package,
  Palette,
  QrCode,
  Users,
  UtensilsCrossed,
  Printer,
  Send,
  Globe,
  Smartphone,
  ReceiptText,
  MonitorUp,
  BadgePercent,
  ShieldCheck,
  ConciergeBell,
  Sparkles,
  Wallet,
  CalendarSync,
  KeyRound,
  Star,
  Crown,
  Tag,
  MessageSquareHeart,
  BarChart3,
  BookOpen,
  Link2,
  BookOpenText,
  FolderOpen,
  Lock,
  ScanLine,
  ClipboardList,
  Layers,
  Timer,
  Stamp,
  Search,
  Ticket,
  Store,
  Download,
  Armchair,
  Award,
  Hourglass,
  Megaphone,
  Handshake,
  Rocket,
  Folders,
  Signature,
  Clock,
} from "lucide-react";
import { themeName as evThemeName } from "../../../evpub/themes";
import { themeName as noteThemeName } from "../../../note/themes";
import { pageThemeName as evPageThemeName } from "../../../evpub/pageThemes";
import { certName as evCertName } from "../../../evpub/certThemes";
import { SITE_THEMES } from "../../../site/text";
import { APP_LOOKS, KIOSK_LOOKS, QR_LOOKS, lookName } from "../../../attend/looks";
import { DISPLAY_THEMES, ORDER_THEMES, POINTS_THEMES, QR_THEMES, RECEIPT_THEMES, themeName } from "../../../pos/themes";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "./licenses.css";
import { licenseService, noteApi } from "../../../api/services";
import { memo } from "../../../lib/memo";
import { useCardText } from "../../../namecard/text";
import { CARD_RECIPES } from "../../../namecard/CardView";
import { fmtDay, usePortfolioText } from "../../../namecard/portfolioText";
import CoinIcon from "../../../components/CoinIcon";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import { useNotice } from "../../super_admin/parts";
import { useLicenseText } from "./text";
import { martThemeName } from "../../../pos/mart/themes";
import { mpLookName, msLookName } from "../../../msite/looks";
import { posLookName } from "../../../pos/mart/posThemes";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";

const ICONS = {
  portfolio: BriefcaseBusiness,
  no_branding: EyeOff,
  theme: Palette,
  portfolio_theme: Palette,
  restaurant: UtensilsCrossed,
  attendance: Fingerprint,
  att_branch: MapPin,
  att_app_theme: Palette,
  att_qr_theme: Palette,
  att_staff: Users,
  att_telegram: Send,
  att_leave: History,
  att_selfie: Palette,
  att_kiosk: QrCode,
  att_payroll: CreditCard,
  att_kiosk_theme: Palette,
  att_website: Globe,
  att_web_theme: Palette,
  att_holidays: CalendarClock,
  att_roster: CalendarClock,
  att_khpay: CreditCard,
  att_manager: Users,
  att_docs: History,
  att_news: Send,
  att_rewards: Gift,
  att_gps_guard: MapPin,
  guest_house: Building2,
  mart: ShoppingBasket,
  mart_staff: Users,
  mart_payments: CreditCard,
  mart_stock: Package,
  mart_printer: Printer,
  mart_history: History,
  mart_debt: HandCoins,
  mart_shifts: Banknote,
  mart_labels: Barcode,
  mart_suppliers: Truck,
  mart_website: Globe,
  mart_site_theme: Palette,
  mart_shop: ShoppingBag,
  mart_portal_theme: Palette,
  mart_pos_theme: Palette,
  mart_telegram: Send,
  mart_expiry: CalendarX,
  mart_loyalty: Gift,
  mart_promos: BadgePercent,
  mart_profit: TrendingUp,
  mart_purchase: ClipboardCheck,
  mart_display: Monitor,
  mart_scale: Scale,
  mart_delivery: MapPinned,
  mart_branches: Network,
  mart_print_theme: Palette,
  gh_rooms: Building2,
  gh_types: Building2,
  gh_payments: CreditCard,
  gh_staff: Users,
  gh_display: Building2,
  gh_display_theme: Palette,
  gh_printer: ReceiptText,
  gh_print_theme: ReceiptText,
  gh_website: Globe,
  gh_site_theme: Palette,
  gh_promos: Palette,
  gh_customers: Users,
  gh_portal_theme: Palette,
  gh_telegram: Send,
  gh_police: ShieldCheck,
  gh_services: ConciergeBell,
  gh_branch: Building2,
  gh_pro: Crown,
  gh_reviews: Star,
  gh_loyalty: Gift,
  gh_longstay: KeyRound,
  gh_ical: CalendarSync,
  gh_housekeeping: Sparkles,
  gh_expenses: Wallet,
  menu_qr: QrCode,
  flipbook: BookOpen,
  fb_categories: FolderOpen,
  fb_stats: BarChart3,
  fb_password: Lock,
  fb_shelf_theme: Palette,
  fb_reader_theme: BookOpenText,
  fb_qr_styles: QrCode,
  fb_shelf_live: Sparkles,
  fb_leads: Users,
  fb_links: Link2,
  qr_gen: ScanLine,
  qr_forms: ClipboardList,
  qr_telegram: Send,
  qr_stats: BarChart3,
  qr_geo: MapPin,
  qr_bulk: Layers,
  qr_rules: Timer,
  qr_design: Palette,
  qr_theme: Palette,
  qr_links: Link2,
  qr_coupons: Gift,
  qr_nobrand: EyeOff,
  qr_form_pro: ClipboardList,
  qr_smart: Network,
  qr_slug: Link2,
  qr_print: Printer,
  website: Globe,
  web_telegram: Send,
  web_brand: Paintbrush,
  web_pages: Files,
  web_blog: Newspaper,
  web_nobrand: EyeOff,
  web_slug: Link2,
  web_stats: BarChart3,
  web_theme: Palette,
  debt_book: NotebookPen,
  debt_remind: BellRing,
  debt_more: Users,
  debt_excel: FileSpreadsheet,
  debt_nobrand: EyeOff,
  digital_note: StickyNote,
  tg_store: Send,
  ts_promos: Tag,
  ts_broadcast: Megaphone,
  ts_reports: BarChart3,
  ts_hours: Clock,
  ts_nobrand: EyeOff,
  ts_history: History,
  ts_pay: CreditCard,
  ts_link: Link2,
  ts_remind: ShoppingCart,
  ts_zones: MapPinned,
  ts_riders: Bike,
  ts_theme: Palette,
  note_storage: HardDrive,
  note_group: Folders,
  note_sign: Signature,
  note_style: Type,
  note_media: Images,
  note_link: Link2,
  note_group_icon: ImagePlus,
  note_theme: Palette,
  note_telegram: BellRing,
  note_ack: CheckCheck,
  note_form: FileSpreadsheet,
  note_voice: Mic,
  note_pdf: FileDown,
  stamp_card: Stamp,
  event: Ticket,
  ev_doors: Smartphone,
  ev_team: Users,
  ev_cashier: Store,
  ev_invites: Gift,
  ev_export: Download,
  ev_nobrand: EyeOff,
  ev_theme: Palette,
  ev_telegram: BellRing,
  ev_guest_tg: Send,
  ev_seats: Armchair,
  ev_shows: CalendarClock,
  ev_promos: Tag,
  ev_questions: ClipboardList,
  ev_autopay: QrCode,
  ev_certs: Award,
  ev_page_theme: Palette,
  ev_cert_theme: Award,
  ev_waitlist: Hourglass,
  ev_pricing: Timer,
  ev_referrals: Megaphone,
  ev_bundles: Layers,
  ev_feedback: Star,
  ev_sponsors: Handshake,
  ev_feature: Rocket,
  sc_check: Search,
  sc_telegram: BellRing,
  sc_more: Users,
  sc_levels: Gift,
  sc_expiry: History,
  sc_theme: Palette,
  mq_categories: UtensilsCrossed,
  mq_items: UtensilsCrossed,
  mq_promos: Tag,
  mq_feedback: MessageSquareHeart,
  mq_stats: BarChart3,
  mq_theme: Palette,
  mq_theme_pro: Palette,
  mq_qr_style: QrCode,
  gh_branches: Network,
  rest_branches: Network,
  att_app: Smartphone,
  rest_kitchen: ChefHat,
  rest_history: History,
  rest_payments: CreditCard,
  rest_staff: Users,
  rest_stock: Package,
  rest_qr_menu: QrCode,
  rest_printer: Printer,
  rest_telegram: Send,
  rest_website: Globe,
  rest_site_theme: Palette,
  rest_app: Smartphone,
  rest_receipt_theme: ReceiptText,
  rest_pos_theme: Palette,
  rest_display: MonitorUp,
  rest_display_theme: Palette,
  rest_promos: BadgePercent,
  rest_table_order: HandPlatter,
  rest_qr_theme: Palette,
  rest_order_theme: Palette,
  rest_rewards: Gift,
  rest_points_theme: Palette,
};
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// Customer: everything bought for my businesses + renew
export default function LicensesPage() {
  const { l, lang } = useLicenseText();
  const c = useCardText();
  const pt = usePortfolioText();
  const [rows, setRows] = useState(() => memo.get("myLicenses")?.rows || null);
  const [summary, setSummary] = useState(() => memo.get("myLicenses")?.summary || null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [btype, setBtype] = useState(""); // business type
  const [kind, setKind] = useState(""); // "" | yearly (renew) | forever (bought once)
  const [params, setParams] = useSearchParams();
  const page = params.get("tab") === "coins" ? "coins" : "licenses";
  const [waiting, setWaiting] = useState(0);
  const { x: cx } = useCoinText();
  const [renewing, setRenewing] = useState(null);
  const [notice, setNotice] = useNotice();

  const load = useCallback(() => {
    licenseService
      .mine()
      .then((r) => {
        setRows(r.data || []);
        setSummary(r.summary);
        memo.set("myLicenses", { rows: r.data || [], summary: r.summary });
      })
      .catch((e) => setError(e.message || l.loadFail));
  }, [l.loadFail]);
  useEffect(load, [load]);
  // a bought note group is shown by its name (the license only keeps the group's id)
  const [groupNames, setGroupNames] = useState({});
  useEffect(() => {
    const ids = [...new Set((rows || []).filter((r) => (r.product === "note_group" || r.product === "note_group_icon") && r.business?._id).map((r) => String(r.business._id)))];
    if (!ids.length) return undefined;
    let live = true;
    // live groups + deleted ones (a deleted group's license still shows, with its name)
    const none = () => ({ data: [] });
    Promise.all(ids.flatMap((bid) => [noteApi({ id: bid }).groups().catch(none), noteApi({ id: bid }).groups({ deleted: 1 }).catch(none)]))
      .then((all) => {
        if (!live) return;
        const map = {};
        for (const r of all) for (const g of r.data || []) map[String(g._id)] = g.deleted ? `${g.name} (${l.deletedTag || "deleted"})` : g.name;
        map.__deleted = new Set(all.flatMap((r) => (r.data || []).filter((g) => g.deleted).map((g) => String(g._id))));
        setGroupNames(map);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [rows]);

  const nameOf = (r) =>
    r.product === "theme"
      ? `${l.products.theme} · ${c.themeNames[r.item] || CARD_RECIPES[r.item]?.[c.lang === "km" ? "km" : "en"] || r.item}`
      : r.product === "portfolio_theme"
        ? `${l.products.portfolio_theme} · ${pt.themeNames[r.item] || r.item}`
        : r.product === "rest_site_theme"
          ? `${l.products.rest_site_theme} · ${SITE_THEMES[r.item]?.name || r.item} · ${r.business?.name || ""}`
          : r.product === "rest_receipt_theme"
            ? `${l.products.rest_receipt_theme} · ${themeName(RECEIPT_THEMES, r.item, lang)} · ${r.business?.name || ""}`
            : r.product === "rest_pos_theme"
              ? `${l.products.rest_pos_theme} · ${restPosName(r.item, lang)} · ${r.business?.name || ""}`
              : r.product === "rest_display_theme"
                ? `${l.products.rest_display_theme} · ${themeName(DISPLAY_THEMES, r.item, lang)} · ${r.business?.name || ""}`
                : r.product === "rest_qr_theme"
                  ? `${l.products.rest_qr_theme} · ${themeName(QR_THEMES, r.item, lang)} · ${r.business?.name || ""}`
                  : r.product === "rest_points_theme"
                    ? `${l.products.rest_points_theme} · ${themeName(POINTS_THEMES, r.item, lang)} · ${r.business?.name || ""}`
                    : r.product === "rest_order_theme"
                      ? `${l.products.rest_order_theme} · ${themeName(ORDER_THEMES, r.item, lang)} · ${r.business?.name || ""}`
                      : r.product === "att_app_theme" || r.product === "att_qr_theme" || r.product === "att_kiosk_theme"
                        ? `${l.products[r.product]} · ${lookName(r.product === "att_app_theme" ? APP_LOOKS : r.product === "att_kiosk_theme" ? KIOSK_LOOKS : QR_LOOKS, r.item, lang)} · ${r.business?.name || ""}`
                        : r.product === "att_holidays"
                          ? `${l.products.att_holidays} · ${r.item} · ${r.business?.name || ""}`
                          : r.product === "att_web_theme"
                            ? `${l.products.att_web_theme} · ${webLookName(r.item, lang)} · ${r.business?.name || ""}`
                            : r.product === "note_storage"
                              ? `${l.products.note_storage} · ${String(r.item || "").replace("slot-", "#")} · ${r.business?.name || ""}`
                              : r.product === "note_group" || r.product === "note_group_icon"
                                ? `${l.products[r.product]} · ${groupNames[r.item] || "…"} · ${r.business?.name || ""}`
                              : r.product === "note_theme"
                                ? `${l.products.note_theme} · ${noteThemeName(r.item, lang)} · ${r.business?.name || ""}`
                            : r.product === "att_staff"
                              ? `${l.products.att_staff} · ${String(r.item || "").replace("slot-", "#")} · ${r.business?.name || ""}`
                              : r.product === "mart_print_theme"
                                ? `${l.products.mart_print_theme} · ${martThemeName(r.item, lang)} · ${r.business?.name || ""}`
                                : r.product === "mart_pos_theme"
                                  ? `${l.products.mart_pos_theme} · ${posLookName(r.item, lang)} · ${r.business?.name || ""}`
                                  : r.product === "ev_theme" || r.product === "ev_page_theme" || r.product === "ev_cert_theme"
                                    ? `${l.products[r.product]} · ${(r.product === "ev_theme" ? evThemeName : r.product === "ev_cert_theme" ? evCertName : evPageThemeName)(r.item, lang)} · ${r.business?.name || ""}`
                                  : r.product === "mart_site_theme" || r.product === "mart_portal_theme"
                                    ? `${l.products[r.product]} · ${(r.product === "mart_site_theme" ? msLookName : mpLookName)(r.item, lang)} · ${r.business?.name || ""}`
                                    : r.product === "fb_shelf_theme" || r.product === "fb_shelf_live" || r.product === "fb_reader_theme"
                                      ? `${l.products[r.product]} · ${r.item} · ${r.business?.name || ""}`
                                      : r.product.startsWith("fb_")
                                        ? `${l.products[r.product] || r.product} · ${r.business?.name || ""}`
                                        : r.product === "website" || r.product.startsWith("web_")
                                          ? `${l.products[r.product] || r.product}${r.item ? ` · ${r.item}` : ""} · ${r.business?.name || ""}`
                                          : r.product === "mq_theme" || r.product === "mq_theme_pro" || r.product === "mq_qr_style"
                                            ? `${l.products[r.product]} · ${r.item} · ${r.business?.name || ""}`
                                            : r.product.startsWith("mq_")
                                              ? `${l.products[r.product] || r.product} · ${r.business?.name || ""}`
                                              : r.product === "att_branch"
                                                ? `${l.products.att_branch} · ${String(r.item || "").replace("slot-", "#")} · ${r.business?.name || ""}`
                                                : r.product === "restaurant" ||
                                                    r.product === "attendance" ||
                                                    r.product === "guest_house" ||
                                                    r.product === "mart" ||
                                                    r.product === "menu_qr" ||
                                                    r.product.startsWith("mart_") ||
                                                    r.product.startsWith("gh_") ||
                                                    r.product.startsWith("rest_") ||
                                                    r.product.startsWith("att_")
                                                  ? `${l.products[r.product] || r.product} · ${r.business?.name || ""}`
                                                  : l.products[r.product] || r.product;
  const linkOf = (r) =>
    r.business?.category === "attendance"
      ? `/app/business/${r.business._id}${{ att_branch: "?tab=branches", att_staff: "?tab=staff", att_telegram: "?tab=telegram", att_leave: "?tab=leave", att_selfie: "?tab=settings", att_kiosk: "?tab=kiosk", att_payroll: "?tab=payroll", att_app_theme: "?tab=looks", att_qr_theme: "?tab=looks", att_kiosk_theme: "?tab=kiosk", att_website: "?tab=website", att_web_theme: "?tab=website", att_holidays: "?tab=holidays", att_roster: "?tab=roster", att_khpay: "?tab=payroll", att_manager: "?tab=staff", att_docs: "?tab=staff", att_news: "?tab=news", att_rewards: "?tab=rewards", att_gps_guard: "?tab=settings" }[r.product] || ""}`
      : r.business?.category === "guest_house"
        ? `/app/business/${r.business._id}${r.product === "gh_printer" || r.product === "gh_print_theme" ? "?tab=print" : r.product === "gh_website" || r.product === "gh_site_theme" ? "?tab=website" : r.product === "gh_promos" ? "?tab=promos" : r.product === "gh_telegram" ? "?tab=telegram" : r.product === "gh_police" ? "?tab=police" : r.product === "gh_services" ? "?tab=services" : r.product === "gh_branch" || r.product === "gh_branches" ? "?tab=branches" : r.product === "gh_pro" ? "?tab=addons" : r.product === "gh_loyalty" ? "?tab=loyalty" : r.product === "gh_reviews" ? "?tab=reviews" : r.product === "gh_longstay" ? "?tab=longstay" : r.product === "gh_ical" ? "?tab=ota" : r.product === "gh_expenses" ? "?tab=expenses" : r.product === "gh_housekeeping" ? "?tab=housekeeping" : r.product === "gh_customers" || r.product === "gh_portal_theme" ? "?tab=customers" : r.product.startsWith("gh_") ? "?tab=addons" : ""}`
        : r.business?.category === "mart"
          ? `/app/business/${r.business._id}${{ mart_staff: "?tab=pos", mart_payments: "?tab=settings", mart_stock: "?tab=stock", mart_printer: "?tab=print", mart_history: "?tab=sales", mart_debt: "?tab=debt", mart_shifts: "?tab=pos", mart_labels: "?tab=products", mart_suppliers: "?tab=suppliers", mart_website: "?tab=website", mart_site_theme: "?tab=website", mart_shop: "?tab=orders", mart_portal_theme: "?tab=orders", mart_pos_theme: "?tab=pos", mart_telegram: "?tab=telegram", mart_expiry: "?tab=expiry", mart_loyalty: "?tab=loyalty", mart_promos: "?tab=promos", mart_profit: "?tab=profit", mart_purchase: "?tab=purchase", mart_display: "?tab=pos", mart_scale: "?tab=settings", mart_delivery: "?tab=delivery", mart_branches: "?tab=branches", mart_print_theme: "?tab=print" }[r.product] || (r.product.startsWith("mart_") ? "?tab=addons" : "")}`
          : r.business?.category === "menu_qr"
            ? `/app/business/${r.business._id}${{ mq_categories: "", mq_items: "", mq_promos: "?tab=promos", mq_feedback: "?tab=feedback", mq_stats: "?tab=stats", mq_theme: "?tab=looks", mq_theme_pro: "?tab=looks", mq_qr_style: "?tab=qr" }[r.product] || ""}`
            : r.business?.category === "flipbook"
              ? `/app/business/${r.business._id}${{ fb_categories: "?tab=categories", fb_stats: "?tab=stats", fb_shelf_theme: "?tab=library", fb_shelf_live: "?tab=library", fb_reader_theme: "?tab=reader", fb_qr_styles: "?tab=share", fb_leads: "?tab=leads", fb_links: "" }[r.product] || ""}`
              : r.business?.category === "website"
                ? `/app/business/${r.business._id}${{ web_telegram: "?tab=telegram", web_brand: "?tab=style", web_pages: "", web_blog: "?tab=blog", web_nobrand: "?tab=addons", web_slug: "?tab=settings", web_theme: "?tab=style", web_stats: "?tab=stats" }[r.product] || ""}`
                : r.business?.category === "stamp_card"
                  ? `/app/business/${r.business._id}${{ sc_check: "?tab=shopqr", sc_telegram: "?tab=telegram", sc_more: "?tab=customers", sc_levels: "?tab=design", sc_expiry: "?tab=design", sc_theme: "?tab=design" }[r.product] || ""}`
                : r.business?.category === "event"
                  ? `/app/business/${r.business._id}${{ ev_doors: "?tab=team", ev_team: "?tab=team", ev_cashier: "?tab=team", ev_invites: "?tab=guests", ev_export: "?tab=guests", ev_nobrand: "?tab=addons", ev_theme: "?tab=design", ev_page_theme: "?tab=design&kind=page", ev_telegram: "?tab=telegram", ev_guest_tg: "?tab=telegram", ev_seats: "", ev_shows: "", ev_promos: "?tab=promos", ev_questions: "", ev_autopay: "?tab=payment", ev_certs: "?tab=certs", ev_cert_theme: "?tab=certs", ev_waitlist: "?tab=waitlist", ev_pricing: "?tab=events", ev_referrals: "?tab=promoters", ev_bundles: "?tab=events", ev_feedback: "?tab=feedback", ev_sponsors: "?tab=events", ev_feature: "?tab=events" }[r.product] || ""}`
                : r.business?.category === "tg_store"
                  ? `/app/business/${r.business._id}${{ ts_promos: "?tab=promos", ts_broadcast: "?tab=messages", ts_reports: "?tab=report", ts_hours: "?tab=store", ts_nobrand: "?tab=addons", ts_history: "?tab=orders", ts_pay: "?tab=store", ts_link: "?tab=share", ts_remind: "?tab=remind", ts_zones: "?tab=delivery", ts_riders: "?tab=delivery", ts_theme: "?tab=design" }[r.product] || ""}`
                : r.business?.category === "digital_note"
                  ? `/app/business/${r.business._id}${{ note_storage: "?tab=addons", note_sign: "?tab=addons", note_style: "?tab=addons", note_media: "?tab=media", note_link: "?tab=addons", note_theme: "?tab=addons", note_telegram: "?tab=alerts", note_ack: "?tab=addons", note_form: "?tab=addons", note_voice: "?tab=addons", note_pdf: "?tab=addons", note_group_icon: r.item ? `?tab=groups&group=${r.item}` : "?tab=groups", note_group: groupNames.__deleted?.has(String(r.item)) ? "?tab=groups" : `?tab=groups&group=${r.item}` }[r.product] || ""}`
                : r.business?.category === "debt_book"
                  ? `/app/business/${r.business._id}${{ debt_remind: "?tab=reminders", debt_excel: "?tab=excel", debt_more: "?tab=addons", debt_nobrand: "?tab=addons" }[r.product] || ""}`
                  : r.business?.category === "qr_gen"
                    ? `/app/business/${r.business._id}${{ qr_forms: "?tab=inbox", qr_telegram: "?tab=telegram", qr_stats: "?tab=stats", qr_geo: "?tab=stats", qr_bulk: "?tab=bulk", qr_rules: "?tab=addons", qr_design: "?tab=designs", qr_theme: "", qr_print: "?tab=print", qr_links: "", qr_coupons: "", qr_nobrand: "?tab=addons", qr_form_pro: "", qr_smart: "", qr_slug: "" }[r.product] || ""}`
                    : r.business?.category === "restaurant"
                      ? `/app/business/${r.business._id}${r.product === "rest_site_theme" ? "?tab=website" : r.product === "rest_receipt_theme" ? "?tab=receipt" : r.product === "rest_pos_theme" ? "?tab=poslook" : r.product === "rest_display_theme" || r.product === "rest_display" ? "?tab=display" : r.product === "rest_promos" ? "?tab=promos" : ["rest_table_order", "rest_qr_theme", "rest_order_theme"].includes(r.product) ? "?tab=tableorder" : r.product === "rest_rewards" || r.product === "rest_points_theme" ? "?tab=rewards" : r.product === "rest_stock" ? "?tab=stock" : r.product === "rest_branches" ? "?tab=branches" : r.product.startsWith("rest_") ? "?tab=addons" : ""}`
                      : r.business?.category === "namecard"
                        ? `/app/business/${r.business._id}${r.product.startsWith("portfolio") ? "?tab=portfolio" : ""}`
                        : null;
  // the business type of a license: its business, or the product family (name card themes…)
  const typeOf = (r) =>
    r.business?.category ||
    (r.product.startsWith("rest_")
      ? "restaurant"
      : r.product.startsWith("mart")
        ? "mart"
        : r.product.startsWith("gh_")
          ? "guest_house"
          : r.product.startsWith("att_")
            ? "attendance"
            : r.product === "menu_qr" || r.product.startsWith("mq_")
              ? "menu_qr"
              : r.product.startsWith("fb_")
                ? "flipbook"
                : r.product.startsWith("qr_")
                  ? "qr_gen"
                  : r.product === "website" || r.product.startsWith("web_")
                    ? "website"
                    : "namecard");
  const kindOf = (r) => (r.expires_at ? "yearly" : "forever");
  const byType = (rows || []).filter((r) => !btype || typeOf(r) === btype);
  const shown = byType.filter((r) => (!filter || (filter === "active" ? ["active", "forever"].includes(r.status) : r.status === filter)) && (!kind || kindOf(r) === kind));
  const typeCounts = (rows || []).reduce((a, r) => ({ ...a, [typeOf(r)]: (a[typeOf(r)] || 0) + 1 }), {});
  const types = BIZ_TYPES.filter((k) => typeCounts[k]);
  const kindCount = (k) => byType.filter((r) => !k || kindOf(r) === k).length;
  const tiles = [
    ["", l.all, summary?.total],
    ["active", l.active, summary?.active],
    ["expiring", l.expiring, summary?.expiring],
    ["expired", l.expired, summary?.expired],
  ];

  return (
    <div className="md-page sa-page">
      {notice}
      <div className="page-head" style={{ marginBottom: 0 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{page === "coins" ? cx.title : l.title}</h2>
        <p>{page === "coins" ? "" : l.sub}</p>
      </div>
      <div className="lc-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={page === "licenses"} className={page === "licenses" ? "on" : ""} onClick={() => setParams({}, { replace: true })}>
          <BadgeCheck size={16} /> {l.title}
        </button>
        <button type="button" role="tab" aria-selected={page === "coins"} className={page === "coins" ? "on" : ""} onClick={() => setParams({ tab: "coins" }, { replace: true })} data-testid="lc-coins">
          <CoinIcon size={18} /> {cx.title}
          {waiting > 0 && <em title={cx.waiting.replace("{n}", waiting)}>{waiting}</em>}
        </button>
      </div>
      {page === "coins" ? (
        <CoinShop notify={setNotice} onWaiting={setWaiting} />
      ) : (
        <>
          {summary?.expiring > 0 && (
            <div className="lc-alert">
              <AlertTriangle size={18} /> {l.alertExpiring.replace("{n}", summary.expiring)}
            </div>
          )}

          {types.length > 1 && <BizTypeChips small value={btype} onChange={setBtype} types={types} counts={typeCounts} total={rows?.length || 0} />}
          <div className="lc-tiles" role="tablist">
            {tiles.map(([key, label, n]) => (
              <button key={key || "all"} type="button" role="tab" aria-selected={filter === key} className={`lc-tile t-${key || "all"} ${filter === key ? "on" : ""}`} onClick={() => setFilter(key)}>
                <span>{label}</span>
                <b>{n ?? "—"}</b>
              </button>
            ))}
          </div>

          {rows?.length > 0 && (
            <div className="lc-kind" role="tablist">
              {[
                ["", l.kindAll],
                ["yearly", l.kindYearly],
                ["forever", l.kindForever],
              ].map(([k, label]) => (
                <button key={k || "all"} type="button" role="tab" aria-selected={kind === k} className={kind === k ? "on" : ""} onClick={() => setKind(k)} data-testid={`lc-kind-${k || "all"}`}>
                  {k === "yearly" ? <CalendarClock size={14} /> : k === "forever" ? <BadgeCheck size={14} /> : null} {label} <small>{kindCount(k)}</small>
                </button>
              ))}
            </div>
          )}
          {error && <div className="md-form-error">{error}</div>}
          {!rows && !error && (
            <div className="panel-card">
              <ListSkeleton rows={3} />
            </div>
          )}
          {rows && rows.length === 0 && (
            <div className="panel-card lc-empty">
              <BadgeCheck size={36} />
              <b>{l.empty}</b>
              <p>{l.emptySub}</p>
              <Link to="/app/dashboard" className="md-btn md-btn-primary">
                {l.goDashboard}
              </Link>
            </div>
          )}

          <ul className="lc-list">
            {shown.map((r) => {
              const Icon = ICONS[r.product] || BadgeCheck;
              const to = linkOf(r);
              const pct = r.days ? Math.max(3, Math.min(100, Math.round(((r.days_left || 0) / r.days) * 100))) : 100;
              return (
                <li key={r._id} className={`panel-card lc-item s-${r.status}`}>
                  <span className={`lc-ic p-${r.product}`}>
                    <Icon size={22} />
                  </span>
                  <div className="lc-main">
                    <div className="lc-top">
                      <b>{nameOf(r)}</b>
                      <span className={`lc-badge s-${r.status}`}>{l[r.status] || r.status}</span>
                    </div>
                    <small className="lc-biz">
                      {r.business?.name} · {l.productSub[r.product]}
                    </small>
                    {r.expires_at ? (
                      <>
                        <div className="lc-when">
                          <CalendarClock size={14} />
                          {(r.status === "expired" ? l.ended : l.ends).replace("{date}", fmtDay(r.expires_at, lang))}
                          {r.status !== "expired" && <em>{l.daysLeft.replace("{n}", r.days_left)}</em>}
                        </div>
                        <div className="lc-meter">
                          <span style={{ width: `${r.status === "expired" ? 0 : pct}%` }} />
                        </div>
                      </>
                    ) : (
                      <div className="lc-when">
                        <BadgeCheck size={14} /> {l.neverEnds}
                      </div>
                    )}
                  </div>
                  <div className="lc-actions">
                    {r.renew_price != null && (
                      <button type="button" className="md-btn md-btn-primary lc-renew" onClick={() => setRenewing(r)} disabled={r.business && !r.business.status}>
                        <CoinIcon size={16} /> {l.renewFor.replace("{coins}", fmt(r.renew_price))}
                      </button>
                    )}
                    {to && (
                      <Link to={to} className="md-icon-btn" aria-label={l.open} title={l.open}>
                        <ChevronRight size={18} />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {rows?.length > 0 && !shown.length && <p className="rs-muted">{l.noMatch}</p>}
        </>
      )}

      {renewing && (
        <PurchaseModal
          stage={
            <div className="lc-stage">
              {(() => {
                const Icon = ICONS[renewing.product] || BadgeCheck;
                return <Icon size={64} />;
              })()}
              <b>{nameOf(renewing)}</b>
              <small>{renewing.business?.name}</small>
            </div>
          }
          badge={l.products[renewing.product]}
          title={l.renewTitle.replace("{name}", nameOf(renewing))}
          sub={l.renewSub.replace("{days}", renewing.days).replace("{when}", renewing.status === "expired" ? l.renewSubExpired : l.renewSubActive.replace("{date}", fmtDay(renewing.expires_at, lang)))}
          price={renewing.renew_price}
          buyLabel={l.renewFor.replace("{coins}", `${fmt(renewing.renew_price)} ${l.coins}`)}
          buy={() => licenseService.buy(renewing.business._id, renewing.product, renewing.expires_at ?? null, renewing.item || "")}
          doneSub={null}
          onDone={(r) => {
            if (r?.data) setNotice({ type: "success", text: l.renewed.replace("{date}", fmtDay(r.data.expires_at, lang)) });
            load();
          }}
          onClose={() => setRenewing(null)}
        />
      )}
    </div>
  );
}
