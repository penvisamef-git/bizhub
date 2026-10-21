import { BarChart3, Briefcase, Camera, Car, Code2, Coffee, Globe, GraduationCap, Hammer, Heart, Home, Leaf, Megaphone, Palette, Plane, Scale, Send, ShieldCheck, ShoppingBag, Star, Stethoscope, Truck, Users, Wrench, Zap } from "lucide-react";

// the icons a service can show (same keys as the API's WEB_ICONS)
export const SERVICE_ICONS = {
  briefcase: Briefcase,
  users: Users,
  truck: Truck,
  wrench: Wrench,
  code: Code2,
  chart: BarChart3,
  shield: ShieldCheck,
  heart: Heart,
  home: Home,
  leaf: Leaf,
  camera: Camera,
  megaphone: Megaphone,
  graduation: GraduationCap,
  scale: Scale,
  stethoscope: Stethoscope,
  car: Car,
  plane: Plane,
  shopping: ShoppingBag,
  palette: Palette,
  coffee: Coffee,
  hammer: Hammer,
  zap: Zap,
  globe: Globe,
  star: Star,
};

const BRAND = {
  facebook: "M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v7h4v-7H16l.5-4h-3V9c0-.6.4-1 1-1z",
  instagram: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.5-1.5h.01",
  tiktok: "M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.6 2.4 4.4 5 4.6",
  linkedin: "M4 9h4v11H4zM6 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10 9h3.8v1.6c.6-1 1.9-1.9 3.7-1.9 3.3 0 4 2.1 4 5V20h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V20h-4z",
  youtube:
    "M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z",
};
export const SOCIALS = ["facebook", "instagram", "tiktok", "telegram", "linkedin", "youtube"];
export function BrandIcon({ name, size = 18 }) {
  if (name === "telegram") return <Send size={size} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={BRAND[name]} />
    </svg>
  );
}
