import { AtSign, BriefcaseBusiness, Camera, Globe, Mail, MapPin, MessageCircle, MessageSquare, MessagesSquare, Music2, Phone, Play, Send, ShoppingBag, ThumbsUp } from "lucide-react";

// link page buttons: an icon + a colour for each kind of link
export const LINK_META = {
  web: { icon: Globe, color: "#334155", en: "Website", km: "គេហទំព័រ" },
  facebook: { icon: ThumbsUp, color: "#1877f2", en: "Facebook", km: "Facebook" },
  tiktok: { icon: Music2, color: "#111111", en: "TikTok", km: "TikTok" },
  telegram: { icon: Send, color: "#229ed9", en: "Telegram", km: "Telegram" },
  instagram: { icon: Camera, color: "#d62976", en: "Instagram", km: "Instagram" },
  youtube: { icon: Play, color: "#e62117", en: "YouTube", km: "YouTube" },
  x: { icon: AtSign, color: "#111111", en: "X", km: "X" },
  whatsapp: { icon: MessageCircle, color: "#25d366", en: "WhatsApp", km: "WhatsApp" },
  messenger: { icon: MessagesSquare, color: "#0084ff", en: "Messenger", km: "Messenger" },
  line: { icon: MessageSquare, color: "#06c755", en: "LINE", km: "LINE" },
  linkedin: { icon: BriefcaseBusiness, color: "#0a66c2", en: "LinkedIn", km: "LinkedIn" },
  phone: { icon: Phone, color: "#16a34a", en: "Call", km: "ហៅទូរស័ព្ទ" },
  email: { icon: Mail, color: "#ea580c", en: "Email", km: "អ៊ីមែល" },
  map: { icon: MapPin, color: "#dc2626", en: "Map", km: "ផែនទី" },
  shop: { icon: ShoppingBag, color: "#7c3aed", en: "Shop", km: "ហាង" },
};
export const LINK_ICON = Object.fromEntries(Object.entries(LINK_META).map(([k, v]) => [k, v.icon]));
// the address a link button opens
export const linkHref = (l) => (l.kind === "phone" ? `tel:${l.url}` : l.kind === "email" ? `mailto:${l.url}` : l.url);
