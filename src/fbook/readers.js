// Flip Book reader looks: 1 free ("classic") + 7 at 10 coins each. bg = the desk behind the book, bar = top/bottom bars.
const R = (en, km, bg, bar, ink, muted, dark) => ({ en, km, bg, bar, ink, muted, dark: !!dark });
export const READERS = {
  classic: R("Classic", "បុរាណ", "radial-gradient(ellipse at 50% 40%,#f4f4f6 0%,#d9dbe0 100%)", "rgba(255,255,255,.92)", "#1d1f24", "#6b7080", 0),
  dark: R("Dark", "ងងឹត", "radial-gradient(ellipse at 50% 40%,#2a2c33 0%,#0c0d10 100%)", "rgba(16,17,21,.92)", "#f3f4f6", "#9ca3af", 1),
  wood: R("Wood desk", "តុឈើ", "repeating-linear-gradient(92deg,rgba(0,0,0,.05) 0 3px,transparent 3px 11px),linear-gradient(160deg,#8a5a34,#5b3a20 60%,#3f2814)", "rgba(43,28,16,.9)", "#f6ebdd", "#d1b79b", 1),
  paper: R("Paper", "ក្រដាស", "radial-gradient(circle at 20% 10%,rgba(255,255,255,.7),transparent 40%),linear-gradient(#f6f0e2,#e9dfc8)", "rgba(250,246,236,.94)", "#2c2518", "#7c705a", 0),
  ocean: R("Ocean", "សមុទ្រ", "radial-gradient(ellipse at 50% 0%,#1e6fa8 0%,#0b3b63 55%,#061f36 100%)", "rgba(6,31,54,.88)", "#eaf6ff", "#9cc3df", 1),
  sunset: R("Sunset", "ថ្ងៃលិច", "linear-gradient(160deg,#ff9a62 0%,#f15a6b 45%,#5b2a86 100%)", "rgba(60,20,70,.78)", "#fff3ec", "#f6c9c0", 1),
  linen: R("Linen", "ក្រណាត់", "repeating-linear-gradient(0deg,rgba(0,0,0,.025) 0 1px,transparent 1px 3px),repeating-linear-gradient(90deg,rgba(0,0,0,.025) 0 1px,transparent 1px 3px),#ece6da", "rgba(245,241,233,.94)", "#2e2a24", "#7a7367", 0),
  spotlight: R("Spotlight", "ពន្លឺឆាក", "radial-gradient(ellipse 60% 55% at 50% 45%,#3a3a40 0%,#111114 70%,#050506 100%)", "rgba(5,5,6,.9)", "#fafafa", "#a1a1aa", 1),
};
export const READER_KEYS = Object.keys(READERS);
export const readerName = (k, lang) => (lang === "km" ? READERS[k]?.km : READERS[k]?.en) || k;
