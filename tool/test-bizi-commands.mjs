// Bizi commands: does what people type turn into the right action, for every business type? (EN + KM)
//   node tool/test-bizi-commands.mjs
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = await build({
  stdin: { contents: 'export * from "./src/dashboard/bizi/actions.js"; export { biziText } from "./src/dashboard/bizi/text.js";', resolveDir: path.join(here, ".."), loader: "js" },
  bundle: true,
  format: "esm",
  write: false,
  platform: "neutral",
  logLevel: "silent",
});
const { commandOf, actionsOf, bizActionsOf, matches, biziText } = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);

const TEXT = { en: biziText("en"), km: biziText("km") };
let pass = 0;
let fail = 0;
const ok = (cond, name, got) => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${got !== undefined ? ` — got ${JSON.stringify(got)}` : ""}`);
  }
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log("what people type → the command");
const C = [
  ["#12 paid", { key: "paid", rest: "#12" }],
  ["accept #12", { key: "accept", rest: "#12" }],
  ["cancel #12", { key: "cancel", rest: "#12" }],
  ["sold out iced coffee", { key: "sold_out", rest: "iced coffee" }],
  ["iced coffee back on sale", { key: "in_stock", rest: "iced coffee" }],
  ["price coke 1.5", { key: "price", rest: "coke", value: 1.5 }],
  ["price of coke to 1,5$", { key: "price", rest: "coke", value: 1.5, cur: "USD" }],
  ["price rice 10,000", { key: "price", rest: "rice", value: 10000 }],
  ["coke +24", { key: "plus", rest: "coke", value: 24 }],
  ["restock coke 24", { key: "restock", rest: "coke", value: 24 }],
  ["stock coke 30", { key: "stock", rest: "coke", value: 30 }],
  ["hide coke", { key: "hide", rest: "coke" }],
  ["unhide coke", { key: "unhide", rest: "coke" }],
  ["check in Dara", { key: "check_in", rest: "Dara" }],
  ["checkout Dara", { key: "check_out", rest: "Dara" }],
  ["Dara no show", { key: "no_show", rest: "Dara" }],
  ["mark room 101 as clean", { key: "clean", rest: "101" }],
  ["room 102 dirty", { key: "dirty", rest: "102" }],
  ["approve leave Sophea", { key: "approve", rest: "Sophea" }],
  ["reject Sophea", { key: "reject", rest: "Sophea" }],
  ["Dara owes 10$", { key: "owes", rest: "Dara", value: 10, cur: "USD" }],
  ["Dara paid 5000 riel", { key: "paid", rest: "Dara", value: 5000, cur: "KHR" }],
  ["Dara paid 5", { key: "paid", rest: "Dara", value: 5 }],
  ["012 345 678 owes 10", { key: "owes", rest: "012 345 678", value: 10 }],
  ["stamp Dara", { key: "stamp", rest: "Dara" }],
  ["stamp Dara 2", { key: "stamp", rest: "Dara", value: 2 }],
  ["stamp 012 345 678", { key: "stamp", rest: "012 345 678" }],
  ["Dara +2", { key: "plus", rest: "Dara", value: 2 }],
  ["close", { key: "store_close", rest: "" }],
  ["open store", { key: "store_open", rest: "store" }],
  ["publish", { key: "publish", rest: "" }],
  ["unpublish my site", { key: "unpublish", rest: "my site" }],
  ["coke sold out everywhere", { key: "sold_out", rest: "coke", all: true }],
  // Khmer (written together too, Khmer digits)
  ["កូកាអស់ស្តុក", { key: "sold_out", rest: "កូកា" }],
  ["កូកា អស់ស្តុក ទាំងអស់", { key: "sold_out", rest: "កូកា", all: true }],
  ["តម្លៃ កូកា ១.៥", { key: "price", rest: "កូកា", value: 1.5 }],
  ["ដារ៉ា ជំពាក់ ១០០០០៛", { key: "owes", rest: "ដារ៉ា", value: 10000, cur: "KHR" }],
  ["ដារ៉ា បានបង់ 5$", { key: "paid", rest: "ដារ៉ា", value: 5, cur: "USD" }],
  ["ឆែកអៅ ដារ៉ា", { key: "check_out", rest: "ដារ៉ា" }],
  ["បន្ទប់ 101 ស្អាត", { key: "clean", rest: "101" }],
  ["បន្ទប់ 101 មិនស្អាត", { key: "dirty", rest: "101" }],
  ["អនុម័តច្បាប់ សុភា", { key: "approve", rest: "សុភា" }],
  ["ត្រា ដារ៉ា", { key: "stamp", rest: "ដារ៉ា" }],
  ["បិទហាង", { key: "store_close", rest: "" }],
  ["#12 បានបង់", { key: "paid", rest: "#12" }],
];
for (const [q, want] of C) ok(same(commandOf(q), want), `“${q}”`, commandOf(q));
// not commands: plain searches stay plain
for (const q of ["low stock", "what price", "iced coffee", "Dara", "012 345 678", "price", "sold out"]) ok(commandOf(q) === null || (q === "sold out" && commandOf(q) === null), `“${q}” is just a search`, commandOf(q));

console.log("each business type → its actions");
const B = "b1";
const keys = (it, q) => actionsOf({ business_id: B, id: "r1", role: "owner", ...it }, q === undefined ? null : commandOf(q)).map((a) => a.key);
const first = (it, q) => {
  const cmd = commandOf(q);
  return actionsOf({ business_id: B, id: "r1", role: "owner", ...it }, cmd).find((a) => matches(a, cmd));
};
// Telegram Store
ok(same(keys({ kind: "order", category: "tg_store", status: "new", flag: "unpaid" }), ["accept", "paid"]), "Telegram order new + unpaid: Accept, Paid");
ok(same(keys({ kind: "order", category: "tg_store", status: "new", flag: "unpaid" }, "cancel #12"), ["accept", "paid", "cancel"]), "“cancel #12” adds Cancel");
ok(first({ kind: "order", category: "tg_store", status: "accepted" }, "cancel #12")?.body?.status === "cancelled", "cancel → status cancelled");
ok(same(keys({ kind: "order", category: "tg_store", status: "done" }, "cancel #12"), []), "a done order can't be cancelled");
// products
const p = (category, extra = {}) => ({ kind: "product", category, flag: "", stock: null, ...extra });
let a = first(p("restaurant"), "price coke 2.5");
ok(a?.path === "/businesses/b1/restaurant/items/r1" && a.method === "put" && same(a.body, { price: 2.5 }), "restaurant price → PUT items/:id { price }", a);
a = first(p("restaurant"), "sold out coke");
ok(same(a?.body, { available: false }), "restaurant sold out → available false", a);
a = first(p("menu_qr", { flag: "sold_out" }), "coke back on sale");
ok(a?.path === "/businesses/b1/menuqr/items/r1" && same(a.body, { available: true }), "menu QR back on sale → available true", a);
a = first(p("tg_store"), "hide coke");
ok(same(a?.body, { hidden: true }), "Telegram product hide → hidden true", a);
a = first(p("mart", { flag: "hidden" }), "unhide coke");
ok(a?.path === "/businesses/b1/mart/products/r1" && same(a.body, { active: true }), "mart unhide → active true", a);
ok(!keys(p("mart")).includes("sold_out"), "mart: no sold-out switch (its stock says it)");
a = first(p("mart", { stock: 3 }), "coke +24");
ok(a?.path === "/businesses/b1/mart/stock/in" && same(a.body, { items: [{ product_id: "r1", qty: 24 }] }), "mart +24 → stock in", a);
a = first(p("mart", { stock: 3 }), "stock coke 30");
ok(a?.path === "/businesses/b1/mart/stock/count" && same(a.body, { product_id: "r1", count: 30 }), "mart stock 30 → count", a);
a = first(p("restaurant", { stock: 0 }), "restock coke 12");
ok(a?.path === "/businesses/b1/restaurant/stock/r1" && same(a.body, { kind: "in", qty: 12 }), "restaurant restock 12 → stock in", a);
ok(first(p("mart"), "coke +24") === undefined, "no stock actions for a product that doesn't count its stock");
ok(first(p("mart", { stock: 3 }), "coke +2.5") === undefined, "stock is whole numbers");
// event
ok(same(keys({ kind: "order", category: "event", status: "review" }), ["approve"]), "event order in review: Approve");
ok(same(keys({ kind: "order", category: "event", status: "review" }, "reject #0042"), ["approve", "reject"]), "“reject #0042” adds Reject");
// guest house
ok(same(keys({ kind: "stay", category: "guest_house", status: "booked" }), ["check_in"]), "booked stay: Check in");
ok(same(keys({ kind: "stay", category: "guest_house", status: "in" }), ["check_out"]), "staying: Check out");
a = first({ kind: "stay", category: "guest_house", status: "in" }, "check out Dara");
ok(a?.path === "/businesses/b1/guesthouse/stays/r1/check-out", "check out → stays/:id/check-out", a);
ok(same(keys({ kind: "stay", category: "guest_house", status: "booked" }, "Dara no show"), ["check_in", "no_show"]), "“no show” adds No show");
a = first({ kind: "room", category: "guest_house", flag: "dirty" }, "room 101 clean");
ok(a?.path === "/businesses/b1/guesthouse/rooms/r1/hk" && same(a.body, { state: "ready" }), "room clean → hk ready", a);
ok(same(keys({ kind: "room", category: "guest_house", flag: "" }), []), "a clean room has nothing waiting");
ok(first({ kind: "room", category: "guest_house", flag: "" }, "room 101 dirty")?.body?.state === "dirty", "room dirty → hk dirty");
// attendance
const staff = { kind: "person", category: "attendance", leave: { id: "L1", from: "2026-11-02", to: "2026-11-03" } };
ok(same(keys(staff), ["approve_leave", "reject_leave"]), "staff with a leave request: Approve / Reject leave");
a = first(staff, "approve leave Sophea");
ok(a?.path === "/businesses/b1/attendance/leave/L1/decide" && same(a.body, { status: "approved" }), "approve leave → decide approved", a);
ok(first(staff, "reject Sophea")?.body?.status === "rejected", "reject → decide rejected");
ok(same(keys({ kind: "person", category: "attendance" }), []), "staff without a request: nothing");
// debt book
const debt = { kind: "person", category: "debt_book" };
a = first(debt, "Dara owes 10$");
ok(a?.path === "/businesses/b1/debt/customers/r1/entries" && same(a.body, { kind: "debt", amount: 10, currency: "USD" }), "owes 10$ → debt entry USD", a);
a = first(debt, "Dara paid 5000៛");
ok(a?.key === "pay_debt" && same(a.body, { kind: "pay", amount: 5000, currency: "KHR" }), "paid 5000៛ → pay entry KHR", a);
a = first(debt, "Dara paid 5");
ok(same(a?.body, { kind: "pay", amount: 5 }), "no currency → the book's own", a);
ok(first(debt, "Dara +3$")?.key === "owes", "+3$ → owes");
ok(same(keys(debt), []), "a debt customer without an amount: nothing");
// stamps
const sc = { kind: "person", category: "stamp_card" };
ok(same(first(sc, "stamp Dara")?.body, { n: 1 }), "stamp → 1");
ok(same(first(sc, "Dara +2")?.body, { n: 2 }), "+2 → 2 stamps");
ok(first(sc, "stamp Dara")?.path === "/businesses/b1/stamps/members/r1/stamp", "stamp path");
// team: View only can't change anything
ok(actionsOf({ business_id: B, id: "r1", role: "view", kind: "order", category: "tg_store", status: "new" }, commandOf("accept #1")).length === 0, "View only member: no buttons");
// whole business
ok(same(bizActionsOf({ business_id: B, category: "tg_store", role: "owner" }, commandOf("close")), [{ key: "store_close", method: "put", path: "/businesses/b1/tgstore/settings", body: { open: false } }]), "close → the Telegram store closes");
ok(bizActionsOf({ business_id: B, category: "website", role: "owner" }, commandOf("publish"))[0]?.path === "/businesses/b1/website/publish", "publish → website publish");
ok(bizActionsOf({ business_id: B, category: "website", role: "admin" }, null).length === 0, "nothing typed: no business buttons");
ok(bizActionsOf({ business_id: B, category: "website", role: "view" }, commandOf("publish")).length === 0, "View only: can't publish");

console.log("every action has its words (EN + KM)");
const all = new Set();
const probe = [
  [{ kind: "order", category: "tg_store", status: "new", flag: "unpaid" }, "cancel #1"],
  [{ kind: "order", category: "tg_store", status: "accepted" }, null],
  [{ kind: "order", category: "event", status: "review" }, "reject #1"],
  [{ kind: "order", category: "event", status: "review" }, "cancel #1"],
  [p("restaurant", { stock: 1 }), "price ab 1"],
  [p("restaurant", { stock: 1 }), "hide ab"],
  [p("tg_store", { flag: "sold_out" }), null],
  [p("mart", { flag: "hidden", stock: 1 }), "unhide ab"],
  [p("mart", { stock: 1 }), "ab +2"],
  [p("mart", { stock: 1 }), "stock ab 2"],
  [{ kind: "stay", category: "guest_house", status: "booked" }, "ab no show"],
  [{ kind: "stay", category: "guest_house", status: "in" }, null],
  [{ kind: "room", category: "guest_house", flag: "dirty" }, null],
  [{ kind: "room", category: "guest_house" }, "101 dirty"],
  [staff, null],
  [debt, "ab owes 1"],
  [debt, "ab paid 1"],
  [sc, null],
];
for (const [it, q] of probe) for (const k of keys(it, q ?? undefined)) all.add(k);
for (const q of ["open", "close", "publish", "unpublish"]) for (const cat of ["tg_store", "website"]) for (const a2 of bizActionsOf({ business_id: B, category: cat, role: "owner" }, commandOf(q))) all.add(a2.key);
ok(all.size === 27, `27 different actions (${all.size})`, [...all]);
for (const lang of ["en", "km"]) for (const k of all) ok(TEXT[lang].act[k] && TEXT[lang].actAsk[k] && TEXT[lang].actOk[k], `${lang}: ${k}`);
for (const lang of ["en", "km"]) for (const f of ["dirty", "cleaning", "leave", "actAll", "actAllAsk", "actAllOk", "actAllSome", "actNone"]) ok(TEXT[lang][f], `${lang}: ${f}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
