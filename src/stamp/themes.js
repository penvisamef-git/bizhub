import { Cake, Car, Coffee, Crown, CupSoda, Droplets, Flower2, Gift, Heart, PawPrint, Scissors, Shirt, Star, UtensilsCrossed } from "lucide-react";

import { SC_THEMES_DATA } from "./designs";

// Loyalty Stamp Card designs (designs.js): 3 free + 54 premium. Keys + tiers must match bizhub-api/src/biz/stamp/stamp.themes.js
//   bg: card background · ink: text · muted: small text · accent: the stamps · slot: an empty stamp · dark: light text · pat: a light pattern
export const SC_THEMES = SC_THEMES_DATA;
export const SC_THEME_KEYS = Object.keys(SC_THEMES);
export const themeOf = (key) => SC_THEMES[key] || SC_THEMES.classic;
export const themeName = (key, lang) => (lang === "km" ? themeOf(key).km : themeOf(key).en);

export const SC_ICONS = { coffee: Coffee, cup: CupSoda, star: Star, heart: Heart, scissors: Scissors, car: Car, shirt: Shirt, utensils: UtensilsCrossed, gift: Gift, paw: PawPrint, drop: Droplets, cake: Cake, flower: Flower2, crown: Crown };
export const iconOf = (key) => SC_ICONS[key] || Coffee;
