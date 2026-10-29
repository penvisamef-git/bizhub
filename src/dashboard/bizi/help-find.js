// Bizi help (v3.0.0, layer 6 — no AI): "how do I pair a POS?" → the how-to with its steps.
// Matching happens here in the browser, in English and Khmer:
//   • the question words (how, where, can I, ធ្វើម៉េច, របៀប, តើ…) are dropped, the rest must name the topic
//   • Khmer is often written without spaces, so a topic's Khmer words are also looked for inside the whole question
//   • one small typing mistake per word is fine ("prnter")
import { HELP } from "./help";
import { hit } from "./smart";

const STOP = new Set("how do does did i we you to a an the my our can could should where what which when why is are am it its in on at for of with from be get make use using want need please help me there this that any some way".split(" "));
const KM_ASK = ["ដោយរបៀបណា", "យ៉ាងដូចម្តេច", "យ៉ាងម៉េច", "ធ្វើម៉េច", "ធ្វើយ៉ាងណា", "នៅឯណា", "នៅណា", "របៀប", "តើ", "ខ្ញុំ", "ចង់", "អាច", "បានទេ", "ដើម្បី", "យ៉ាងណា", "?", "？"];
const QUESTION = /^(how|where|what|can|could|why|when|which|is|do|does|help)\b|\?\s*$|ធ្វើម៉េច|យ៉ាងម៉េច|របៀប|តើ|ដោយរបៀបណា|យ៉ាងដូចម្តេច|នៅឯណា/i;

// does the text look like a question? (then the answers go first)
export const isQuestion = (q) => QUESTION.test(String(q || "").trim());

const isKm = (w) => /[ក-៿]/.test(w);
const textOf = (a) => `${a.en.q} ${a.km.q} ${a.words}`.toLowerCase();
const kmWords = (a) => `${a.km.q} ${a.words}`.split(/[\s·,/()?]+/).filter((w) => isKm(w) && w.length >= 2 && !KM_ASK.includes(w));

// the how-tos for the words, best first (each with its score)
export function findHelp(raw, max = 3, list = HELP) {
  const q = String(raw || "").toLowerCase().trim();
  if (q.length < 2) return [];
  let rest = q;
  for (const k of KM_ASK) rest = rest.split(k).join(" ");
  const ws = rest
    .replace(/[?!.,:;"“”']/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
  const asked = isQuestion(q);
  const out = [];
  for (const a of list) {
    const text = textOf(a);
    let score = 0;
    let found = 0;
    const km = kmWords(a);
    for (const w of ws) {
      // short words ("id", "qr", "pin") only as a whole word, else "id" would be in "paid"
      const h = w.length <= 3 && !isKm(w) ? (text.split(/[^\p{L}\p{N}]+/u).includes(w) ? 2 : 0) : hit(w, text);
      if (h) {
        found += 1;
        score += h === 2 ? 3 : 2;
      } else if (isKm(w) && km.some((k) => k.length >= 3 && w.includes(k))) {
        found += 1; // Khmer written together: "ភ្ជាប់ម៉ាស៊ីនព្រីន" has "ម៉ាស៊ីនព្រីន" in it
      }
    }
    // the topic's Khmer words inside the whole question ("ធ្វើម៉េចភ្ជាប់POS" still has "ភ្ជាប់")
    for (const k of km) if (q.includes(k)) score += Math.min(6, Math.max(1, Math.floor(k.length / 2))); // longer = surer
    if (!score) continue;
    // most of the words must be about this topic (all of them when it is not a question)
    const need = asked ? Math.ceil(ws.length / 2) : ws.length;
    if (ws.length && found < need && score < 6) continue;
    out.push({ a, score: score + (asked ? 2 : 0) });
  }
  return out.sort((x, y) => y.score - x.score).slice(0, max);
}

// where the how-to's "Open" button goes: the first business of the right type that has the section; else add one
export function targetOf(a, businesses) {
  if (a.href) return { href: a.href };
  if (!a.types) return null;
  const b = businesses.find((x) => a.types.includes(x.category) && !x.shared) || businesses.find((x) => a.types.includes(x.category));
  if (!b) return { href: "/app/businesses", add: true };
  if (a.path) return { href: `/app/business/${b._id}/${a.path}`, business: b.name };
  const tab = typeof a.tab === "object" ? a.tab[b.category] : a.tab;
  return { href: `/app/business/${b._id}${tab ? `?tab=${tab}` : ""}`, business: b.name };
}
