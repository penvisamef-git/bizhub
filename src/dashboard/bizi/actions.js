// Bizi commands (v3.0.0): Bizi does things in every business, from what is typed (or said) in the box — always asked
// first ("Change the price of “Coke” to 1.5?"), and only the businesses the person may change (not "View only").
// The same calls the business screens use (owner routes), so the same checks, add-ons and Telegram updates happen.
//
//   commandOf("price coke 1.5") → { key: "price", rest: "coke", value: 1.5 }
//   commandOf("Dara paid 5$")   → { key: "paid", rest: "Dara", value: 5, cur: "USD" }
//   commandOf("coke +24")       → { key: "plus", rest: "coke", value: 24 }
//   actionsOf(result, cmd)      → [{ key, verbs, method, path, body, v }]  the buttons of a search result: what can
//                                 always be done (accept a new order, check a guest in…) + what the command asks for
//   bizActionsOf(business, cmd) → the same for a whole business (open / close the Telegram store, publish the website)
//
// What Bizi understands (English / Khmer):
//   orders     accept · done · paid · cancel · approve · reject            "#12 paid", "accept #12", "approve #0042"
//   products   sold out · back on sale · hide · unhide · price N           "sold out iced coffee", "price coke 1.5"
//              restock N / +N · stock N (counted on the shelf)             "coke +24", "stock coke 30"
//   guests     check in · check out · cancel · no show                     "check out Dara"
//   rooms      clean · dirty                                               "room 101 clean"
//   staff      approve / reject a leave request                            "approve leave Sophea"
//   debt book  owes N · paid N                                             "Dara owes 10$", "Dara paid 5000៛"
//   stamps     stamp (+N)                                                  "stamp 012 345 678", "Dara +2"
//   business   open · close (Telegram store) · publish · unpublish (website)
// The app has the same rules (bizhub-app lib/features/bizi/bizi_actions.dart).

// English words need spaces around them; Khmer is written together, so Khmer words count anywhere
const verb = (en, km = "") => new RegExp(`(?:(?:^|\\s)(?:${en})(?=\\s|$)${km ? `|${km}` : ""})`, "i");
// [key, words, what number it takes]   need = a number must be there · money / count = a number may be there
// (the order matters: the longer / more exact words first)
const VERBS = [
  ["unpublish", verb("unpublish|take down|take offline", "បិទការផ្សាយ|ឈប់ផ្សាយ")],
  ["publish", verb("publish|go live|put online", "បោះពុម្ពផ្សាយ|ផ្សាយ")],
  ["check_in", verb("check ?in", "ចូលស្នាក់|ឆែកអ៊ីន")],
  ["check_out", verb("check ?out", "ចាកចេញ|ឆែកអៅ|ឆែកអោ")],
  ["no_show", verb("no ?show", "មិនមកដល់")],
  ["in_stock", verb("back on sale|back in stock|in stock|on sale again", "មានលក់វិញ|មានវិញ")],
  ["sold_out", verb("sold ?out|out of stock", "អស់ស្តុក|លក់អស់|អស់")],
  ["restock", verb("restock|stock in|add stock", "ចូលស្តុក|បន្ថែមស្តុក"), "need"],
  ["stock", verb("stock|count", "រាប់ស្តុក|ស្តុក"), "need"],
  ["price", verb("price|new price", "តម្លៃ|ថ្លៃ"), "need"],
  ["owes", verb("owes?|borrowed|borrows?|on credit", "ជំពាក់|ខ្ចី"), "need"],
  ["paid", verb("paid|pay|pays", "បានបង់|បង់"), "money"],
  ["accept", verb("accept", "ទទួល")],
  ["done", verb("done|finish|finished|complete", "បានបញ្ចប់|រួចរាល់")],
  ["approve", verb("approve", "អនុម័ត")],
  ["reject", verb("reject|decline|refuse", "បដិសេធ")],
  ["cancel", verb("cancel", "បោះបង់|លុបចោល")],
  ["unhide", verb("unhide|show again", "បង្ហាញវិញ|ឈប់លាក់")],
  ["hide", verb("hide", "លាក់")],
  ["dirty", verb("dirty|needs cleaning", "មិនស្អាត|កខ្វក់")],
  ["clean", verb("clean|cleaned", "ស្អាត")],
  ["stamp", verb("stamps?|give stamps?", "បោះត្រា|ផ្តល់ត្រា|ត្រា"), "count"],
  ["store_close", verb("close", "បិទហាង")],
  ["store_open", verb("open", "បើកហាង")],
];
// commands about a whole business: nothing else has to be typed ("publish" = my website)
const BIZ_VERBS = ["publish", "unpublish", "store_open", "store_close"];
// little words that only say how ("mark the room 101 as clean", "approve leave Sophea", "price of coke to 1.5")
const FILLER = /(?:^|\s)(?:the|mark|set|as|to|of|for|please|pls|leave|room|ច្បាប់|បន្ទប់|សូម)(?=\s|$)/gi;
const ALL = /(?:^|\s)(?:all|everywhere|every shop)(?=\s|$)|ទាំងអស់|គ្រប់ហាង/gi;
const KM_DIGITS = "០១២៣៤៥៦៧៨៩";

// numbers: "1.5", "1,5", "10,000", "5$", "$5", "5000៛", "5000 riel"
const NUM = /(^|\s)(\+?)(\$?)(\d+(?:[.,]\d+)?)\s?(\$|usd|dollars?|៛|riels?|khr|រៀល|ដុល្លារ)?(?=\s|$)/gi;
const numOf = (s) => (/^\d{1,3}(,\d{3})+$/.test(s) ? Number(s.replace(/,/g, "")) : Number(s.replace(",", ".")));
const curOf = (pre, post) => (pre || /^(\$|usd|dollars?|ដុល្លារ)$/i.test(post || "") ? "USD" : /^(៛|riels?|khr|រៀល)$/i.test(post || "") ? "KHR" : "");
const clean = (s) => s.replace(FILLER, " ").replace(/\s+/g, " ").trim();
const enough = (rest) => rest.length >= 2 || /^#?\d+$/.test(rest);

export function commandOf(raw) {
  let q = String(raw || "")
    .replace(/[០-៩]/g, (d) => KM_DIGITS.indexOf(d))
    .trim();
  const all = new RegExp(ALL.source, "i").test(q);
  q = q.replace(ALL, " ").replace(/\s+/g, " ").trim();
  for (const [key, re, takes] of VERBS) {
    if (!re.test(q)) continue;
    let rest = q.replace(re, " ").replace(/\s+/g, " ").trim();
    let value;
    let cur = "";
    if (takes) {
      // the last number that isn't the thing itself ("#12", or the only thing left: "stamp 12" = card 12)
      const nums = [...rest.matchAll(NUM)].filter((m) => !/#\s*$/.test(rest.slice(0, m.index + m[1].length)));
      for (const m of nums.reverse()) {
        const left = clean(rest.slice(0, m.index) + " " + rest.slice(m.index + m[0].length));
        if (!enough(left)) continue;
        // a stamp count is small and said with a name ("stamp Dara 2"), never a piece of a phone number
        if (takes === "count" && (numOf(m[4]) > 20 || m[3] || m[5] || !/[^\d\s#+]/.test(left))) continue;
        value = numOf(m[4]);
        cur = curOf(m[3], m[5]);
        rest = left;
        break;
      }
      if (takes === "need" && value === undefined) continue; // "low stock", "what price" — not a command
    }
    rest = clean(rest);
    if (enough(rest) || BIZ_VERBS.includes(key)) return { key, rest, ...(value !== undefined ? { value } : {}), ...(cur ? { cur } : {}), ...(all ? { all } : {}) };
  }
  // "+24 coke", "Dara +2": more of it (stock in, stamps, what they owe)
  const plus = /(^|\s)\+(\d+(?:[.,]\d+)?)\s?(\$|usd|៛|riels?|khr|រៀល)?(?=\s|$)/i.exec(q);
  if (plus) {
    const rest = clean(q.slice(0, plus.index) + " " + q.slice(plus.index + plus[0].length));
    const cur = curOf("", plus[3]);
    if (enough(rest)) return { key: "plus", rest, value: numOf(plus[2]), ...(cur ? { cur } : {}), ...(all ? { all } : {}) };
  }
  return null;
}
// older name (the box still asks it)
export const verbOf = commandOf;

// what a command matches: an action's own key, or one of its other words
export const matches = (a, cmd) => !!cmd && (a.verbs || [a.key]).includes(cmd.key);
const num = (v) => (Number.isFinite(v) ? v : null);

export function actionsOf(it, cmd = null) {
  const bid = it.business_id;
  if (!bid || !it.id || it.role === "view") return [];
  const out = [];
  // always shown: what this thing is waiting for · typed: only when the command asks for it
  const add = (a, typed = false) => {
    if (!typed || matches(a, cmd)) out.push(a);
  };
  const value = num(cmd?.value);
  const B = `/businesses/${bid}`;
  const id = it.id;

  if (it.kind === "order" && it.category === "tg_store") {
    const base = `${B}/tgstore/orders/${id}`;
    if (it.status === "new") add({ key: "accept", method: "post", path: `${base}/status`, body: { status: "accepted" } });
    if (["accepted", "ready", "on_way"].includes(it.status)) add({ key: "done", method: "post", path: `${base}/status`, body: { status: "done" } });
    if (it.flag === "unpaid" && it.status !== "cancelled") add({ key: "paid", method: "post", path: `${base}/paid`, body: {} });
    if (!["done", "cancelled"].includes(it.status)) add({ key: "cancel", method: "post", path: `${base}/status`, body: { status: "cancelled", reason: "" } }, true);
  }
  if (it.kind === "order" && it.category === "event") {
    const base = `${B}/events/orders/${id}`;
    if (it.status === "review") add({ key: "approve", method: "post", path: `${base}/approve`, body: {} });
    if (it.status === "review") add({ key: "reject", method: "post", path: `${base}/reject`, body: { reason: "" } }, true);
    if (["pending", "review"].includes(it.status)) add({ key: "cancel", method: "post", path: `${base}/cancel`, body: { reason: "" } }, true);
  }

  if (it.kind === "product") {
    const sold = it.flag === "sold_out";
    const hidden = it.flag === "hidden";
    // [the product's own address, its "on sale" field, its "shown" field (false = hidden)]
    const at = {
      tg_store: [`${B}/tgstore/products/${id}`, (on) => ({ sold_out: !on }), (shown) => ({ hidden: !shown })],
      restaurant: [`${B}/restaurant/items/${id}`, (on) => ({ available: on }), (shown) => ({ active: shown })],
      menu_qr: [`${B}/menuqr/items/${id}`, (on) => ({ available: on }), (shown) => ({ active: shown })],
      mart: [`${B}/mart/products/${id}`, null, (shown) => ({ active: shown })],
    }[it.category];
    if (at) {
      const [path, onSale, shown] = at;
      if (onSale) add({ key: sold ? "in_stock" : "sold_out", method: "put", path, body: onSale(sold) });
      add(hidden ? { key: "unhide", method: "put", path, body: shown(true) } : { key: "hide", method: "put", path, body: shown(false) }, true);
      if (value !== null && value >= 0 && matches({ key: "price" }, cmd)) add({ key: "price", method: "put", path, body: { price: value }, v: value });
      // stock: only for what counts its stock
      const tracked = it.stock !== null && it.stock !== undefined;
      if (tracked && value !== null && value > 0 && value <= 100000 && Number.isInteger(value)) {
        const inn = it.category === "mart" ? { method: "post", path: `${B}/mart/stock/in`, body: { items: [{ product_id: id, qty: value }] } } : { method: "post", path: `${B}/restaurant/stock/${id}`, body: { kind: "in", qty: value } };
        add({ key: "restock", verbs: ["restock", "plus"], ...inn, v: value }, true);
      }
      if (tracked && value !== null && value >= 0 && value <= 100000 && Number.isInteger(value) && ["mart", "restaurant"].includes(it.category)) {
        const set = it.category === "mart" ? { method: "post", path: `${B}/mart/stock/count`, body: { product_id: id, count: value } } : { method: "post", path: `${B}/restaurant/stock/${id}`, body: { kind: "count", qty: value } };
        add({ key: "stock", ...set, v: value }, true);
      }
    }
  }

  if (it.kind === "stay" && it.category === "guest_house") {
    const base = `${B}/guesthouse/stays/${id}`;
    if (it.status === "booked") add({ key: "check_in", method: "post", path: `${base}/check-in`, body: {} });
    if (it.status === "in") add({ key: "check_out", method: "post", path: `${base}/check-out`, body: {} });
    if (it.status === "booked") add({ key: "cancel", method: "post", path: `${base}/cancel`, body: {} }, true);
    if (it.status === "booked") add({ key: "no_show", method: "post", path: `${base}/no-show`, body: {} }, true);
  }
  if (it.kind === "room" && it.category === "guest_house") {
    const path = `${B}/guesthouse/rooms/${id}/hk`;
    if (it.flag === "dirty" || it.flag === "cleaning") add({ key: "clean", method: "put", path, body: { state: "ready" } });
    else add({ key: "dirty", method: "put", path, body: { state: "dirty" } }, true);
  }

  if (it.kind === "person" && it.category === "attendance" && it.leave?.id) {
    const path = `${B}/attendance/leave/${it.leave.id}/decide`;
    add({ key: "approve_leave", verbs: ["approve", "approve_leave"], method: "post", path, body: { status: "approved" } });
    add({ key: "reject_leave", verbs: ["reject", "reject_leave"], method: "post", path, body: { status: "rejected" } });
  }
  if (it.kind === "person" && it.category === "debt_book" && value !== null && value > 0) {
    const path = `${B}/debt/customers/${id}/entries`;
    const body = (kind) => ({ kind, amount: value, ...(cmd?.cur ? { currency: cmd.cur } : {}) });
    add({ key: "owes", verbs: ["owes", "plus"], method: "post", path, body: body("debt"), v: value, cur: cmd?.cur || "" }, true);
    add({ key: "pay_debt", verbs: ["paid"], method: "post", path, body: body("pay"), v: value, cur: cmd?.cur || "" }, true);
  }
  if (it.kind === "person" && it.category === "stamp_card") {
    const n = value !== null && Number.isInteger(value) && value >= 1 && value <= 20 ? value : 1;
    add({ key: "stamp", verbs: ["stamp", "plus"], method: "post", path: `${B}/stamps/members/${id}/stamp`, body: { n }, v: n });
  }
  return out;
}

// a whole business: only when asked ("close", "publish")
export function bizActionsOf(b, cmd) {
  const bid = b.business_id || b.id || b._id;
  if (!cmd || !bid || b.role === "view") return [];
  const all = [];
  if (b.category === "tg_store") {
    all.push({ key: "store_open", method: "put", path: `/businesses/${bid}/tgstore/settings`, body: { open: true } });
    all.push({ key: "store_close", method: "put", path: `/businesses/${bid}/tgstore/settings`, body: { open: false } });
  }
  if (b.category === "website") {
    all.push({ key: "publish", method: "post", path: `/businesses/${bid}/website/publish`, body: {} });
    all.push({ key: "unpublish", method: "post", path: `/businesses/${bid}/website/unpublish`, body: {} });
  }
  return all.filter((a) => matches(a, cmd));
}
// the businesses a business-wide command can be for
export const BIZ_KINDS = { store_open: ["tg_store"], store_close: ["tg_store"], publish: ["website"], unpublish: ["website"] };
