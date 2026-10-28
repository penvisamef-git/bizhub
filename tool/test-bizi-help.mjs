// Bizi how-tos: do the questions people type find the right answer? (EN + KM, typos, Khmer without spaces)
//   node tool/test-bizi-help.mjs
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = await build({
  stdin: { contents: 'export * from "./src/dashboard/bizi/help-find.js"; export { HELP } from "./src/dashboard/bizi/help.js"; export { BIZI_PAGES } from "./src/dashboard/bizi/pages.gen.js";', resolveDir: path.join(here, ".."), loader: "js" },
  bundle: true,
  format: "esm",
  write: false,
  platform: "neutral",
  logLevel: "silent",
});
const { findHelp, isQuestion, targetOf, HELP, BIZI_PAGES } = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString("base64")}`);

let pass = 0;
let fail = 0;
const ok = (cond, name, got) => {
  if (cond) pass += 1;
  else fail += 1;
  console.log(`  ${cond ? "✓" : "✗"} ${name}${cond ? "" : `  → ${JSON.stringify(got)}`}`);
};
const top = (q) => findHelp(q)[0]?.a.id || null;

console.log("how-tos");
const ids = new Set();
for (const a of HELP) {
  ok(!ids.has(a.id) && a.en?.q && a.km?.q && a.en.steps?.length >= 2 && a.km.steps?.length === a.en.steps.length, `${a.id}: EN + KM, same number of steps`, a.id);
  ids.add(a.id);
  ok(top(a.en.q) === a.id, `${a.id}: its own English question finds it`, findHelp(a.en.q).map((x) => x.a.id));
  ok(top(a.km.q) === a.id, `${a.id}: its own Khmer question finds it`, findHelp(a.km.q).map((x) => x.a.id));
}

console.log("\nthe sections they open exist");
for (const a of HELP.filter((h) => h.tab))
  for (const t of a.types) {
    const tab = typeof a.tab === "object" ? a.tab[t] : a.tab;
    if (!tab) continue;
    ok((BIZI_PAGES[t]?.tabs || []).some(([k]) => k === tab), `${a.id}: ${t} has the “${tab}” section`, (BIZI_PAGES[t]?.tabs || []).map(([k]) => k));
  }

console.log("\nwhat people type");
const cases = [
  ["how do I pair a POS?", "pos_pair"],
  ["how to connect pos", "pos_pair"],
  ["link tablet", "pos_pair"],
  ["ធ្វើម៉េចភ្ជាប់ POS", "pos_pair"],
  ["how to buy coins", "coins_buy"],
  ["top up", "coins_buy"],
  ["ទិញកាក់យ៉ាងម៉េច", "coins_buy"],
  ["how do i add a new business", "business_add"],
  ["renew my licence", "renew"],
  ["how to add staff pin", "staff_pin"],
  ["prnter setup", "printer"],
  ["how do i set up a printer", "printer"],
  ["telegram group orders", "tg_group"],
  ["where is my store link", "tg_share"],
  ["delivery fee how", "tg_delivery"],
  ["how to make a promo code", "tg_promo"],
  ["excel report", "report_excel"],
  ["how to add team member", "team_add"],
  ["change language", "look"],
  ["dark mode how", "look"],
  ["ភ្ជាប់ម៉ាស៊ីនព្រីន", "printer"],
  ["ថ្លៃដឹក", "tg_delivery"],
  ["បន្ថែមបុគ្គលិក", "staff_pin"],
  ["ធ្វើម៉េចបង្កើតកូដបញ្ចុះតម្លៃ", "tg_promo"],
  ["ភ្ញៀវចេញ", "gh_checkin"],
  ["how do I check out a guest", "gh_checkin"],
  ["where is my bizhub id", "my_id"],
  ["how to contact support", "support"],
];
for (const [q, id] of cases) if (ids.has(id)) ok(top(q) === id, `“${q}” → ${id}`, findHelp(q).map((x) => x.a.id));

console.log("\nnot a how-to");
ok(findHelp("coffee").length === 0, "“coffee” (a product) finds no how-to", findHelp("coffee").map((x) => x.a.id));
ok(findHelp("#12").length === 0, "“#12” finds no how-to", findHelp("#12"));
ok(findHelp("how do I fly to the moon?").length === 0, "a question BizHub can't answer → nothing", findHelp("how do I fly to the moon?").map((x) => x.a.id));
ok(isQuestion("how do I pair a POS?") && isQuestion("ធ្វើម៉េចភ្ជាប់ POS") && !isQuestion("coffee"), "questions look like questions");

console.log("\nthe Open button");
const pos = HELP.find((a) => a.id === "pos_pair");
if (pos) {
  ok(targetOf(pos, [{ _id: "b1", name: "Kitchen", category: "restaurant" }]).href.startsWith("/app/business/b1"), "opens my restaurant", targetOf(pos, [{ _id: "b1", name: "Kitchen", category: "restaurant" }]));
  ok(targetOf(pos, [{ _id: "b2", name: "Notes", category: "digital_note" }]).add, "no POS business → add one first", targetOf(pos, []));
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
