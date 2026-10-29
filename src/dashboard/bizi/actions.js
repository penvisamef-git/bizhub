// Bizi quick actions (v3.0.0): what can be done right from a search result — always asked first ("Mark #12 paid?").
// The same calls the business screens use (owner routes), so the same checks and Telegram updates happen.
//   actionsOf(result) → [{ key, method, path, body }]
//   verbOf("#12 paid") → { key: "paid", rest: "#12" } — the words that say what to do, and what to look for
// The app has the same rules (bizhub-app lib/features/bizi/bizi_actions.dart).
const VERBS = [
  ["paid", /(^|\s)(paid|pay|បានបង់|បង់)(?=\s|$)/i],
  ["accept", /(^|\s)(accept|ទទួល)(?=\s|$)/i],
  ["done", /(^|\s)(done|finish|finished|complete|បានបញ្ចប់|រួចរាល់)(?=\s|$)/i],
  ["approve", /(^|\s)(approve|អនុម័ត)(?=\s|$)/i],
  ["in_stock", /(^|\s)(back on sale|back in stock|in stock|មានលក់វិញ|មានវិញ)(?=\s|$)/i],
  ["sold_out", /(^|\s)(sold out|soldout|អស់ស្តុក|អស់)(?=\s|$)/i],
];

// the words that say what to do: only together with something to do it to ("sold out" alone is the smart word)
export function verbOf(raw) {
  const q = String(raw || "").trim();
  for (const [key, re] of VERBS) {
    if (!re.test(q)) continue;
    const rest = q.replace(re, " ").replace(/\s+/g, " ").trim();
    if (rest.length >= 2 || /^#?\d+$/.test(rest)) return { key, rest };
  }
  return null;
}

export function actionsOf(it) {
  const bid = it.business_id;
  if (!bid || !it.id) return [];
  if (it.category === "tg_store" && it.kind === "order") {
    const base = `/businesses/${bid}/tgstore/orders/${it.id}`;
    const out = [];
    if (it.status === "new") out.push({ key: "accept", method: "post", path: `${base}/status`, body: { status: "accepted" } });
    if (["accepted", "ready", "on_way"].includes(it.status)) out.push({ key: "done", method: "post", path: `${base}/status`, body: { status: "done" } });
    if (it.flag === "unpaid" && it.status !== "cancelled") out.push({ key: "paid", method: "post", path: `${base}/paid`, body: {} });
    return out;
  }
  if (it.category === "tg_store" && it.kind === "product") {
    const sold = it.flag === "sold_out";
    return [{ key: sold ? "in_stock" : "sold_out", method: "put", path: `/businesses/${bid}/tgstore/products/${it.id}`, body: { sold_out: !sold } }];
  }
  if (it.category === "event" && it.kind === "order" && it.status === "review") return [{ key: "approve", method: "post", path: `/businesses/${bid}/events/orders/${it.id}/approve`, body: {} }];
  return [];
}
