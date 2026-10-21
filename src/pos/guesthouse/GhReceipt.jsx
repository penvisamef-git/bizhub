import { createRoot } from "react-dom/client";
import { BedDouble } from "lucide-react";
import "./ghreceipt.css";

// Guest House receipt / bill in 24 templates (the first is free, the others gh_print_theme).
// Prints in black on a receipt printer (58 / 80 mm) or on A4.
export const PRINT_THEMES = [
  "classic",
  "modern",
  "typewriter",
  "bold",
  "compact",
  "elegant",
  "boxed",
  "columns",
  "biglogo",
  "minimal",
  "khmer",
  "ticket",
  "stamp",
  "invoice",
  "folio",
  "postcard",
  "retro",
  "banner",
  "grid",
  "regcard",
  "luxe",
  "large",
  "zigzag",
  "calendar",
];

export const PRINT_NAMES = {
  en: {
    classic: ["Classic", "The standard receipt. Free."],
    modern: ["Modern", "Clean letters, solid lines, a big total."],
    typewriter: ["Typewriter", "Old typewriter letters and double lines."],
    bold: ["Bold", "Black title band and a black total box."],
    compact: ["Compact", "Small and tight — saves paper."],
    elegant: ["Elegant", "Serif letters, centred, double lines."],
    boxed: ["Boxed", "Every part in its own neat box."],
    columns: ["Columns", "Item · qty · amount in clear columns."],
    biglogo: ["Big logo", "A large round logo on top — for strong brands."],
    minimal: ["Minimal", "No lines, lots of space, very light."],
    khmer: ["Khmer first", "Every label in Khmer first, English below."],
    ticket: ["Room ticket", "Like a boarding pass: room and dates up front, tear-off stub."],
    stamp: ["Paid stamp", "A round PAID (or DUE) stamp across the bill."],
    invoice: ["Invoice", "Formal invoice with a 'bill to' box — best on A4."],
    folio: ["Hotel folio", "Every night on its own line, payments as credits, running balance."],
    postcard: ["Thank-you card", "A big thank-you to the guest, then the bill."],
    retro: ["Retro", "All caps, dotted leaders, star lines."],
    banner: ["Banner", "Black bands for the name and the total."],
    grid: ["Fact grid", "Room, nights and dates in a grid of boxes."],
    regcard: ["Registration card", "Guest details with lines to sign — guest and staff."],
    luxe: ["Luxe", "Double frame, serif letters, ornaments."],
    large: ["Large print", "Big letters and numbers — easy to read."],
    zigzag: ["Zigzag", "Zigzag cuts between the parts."],
    calendar: ["Calendar", "The stay drawn as a row of calendar days."],
  },
  km: {
    classic: ["បុរាណ", "វិក្កយបត្រស្តង់ដារ។ ឥតគិតថ្លៃ។"],
    modern: ["ទំនើប", "អក្សរស្អាត បន្ទាត់ពេញ សរុបធំ។"],
    typewriter: ["ម៉ាស៊ីនអង្គុលីលេខ", "អក្សរម៉ាស៊ីនចាស់ បន្ទាត់ពីរជាន់។"],
    bold: ["ដិតខ្លាំង", "ក្បាលខ្មៅ និងប្រអប់សរុបខ្មៅ។"],
    compact: ["តូចសន្សំក្រដាស", "តូច និងតឹង — សន្សំក្រដាស។"],
    elegant: ["ប្រណីត", "អក្សរមានជើង នៅកណ្តាល បន្ទាត់ពីរជាន់។"],
    boxed: ["ប្រអប់", "ផ្នែកនីមួយៗនៅក្នុងប្រអប់ស្អាត។"],
    columns: ["ជួរឈរ", "មុខទំនិញ · ចំនួន · តម្លៃ ជាជួរឈរច្បាស់។"],
    biglogo: ["ឡូហ្គោធំ", "ឡូហ្គោមូលធំខាងលើ — សម្រាប់ម៉ាកល្បី។"],
    minimal: ["សាមញ្ញ", "គ្មានបន្ទាត់ ស្រឡះ ស្រាល។"],
    khmer: ["ខ្មែរមុន", "ពាក្យទាំងអស់ជាខ្មែរមុន អង់គ្លេសខាងក្រោម។"],
    ticket: ["សំបុត្របន្ទប់", "ដូចសំបុត្រយន្តហោះ៖ បន្ទប់ និងថ្ងៃខាងមុខ មានផ្នែកហែក។"],
    stamp: ["ត្រាបង់រួច", "ត្រាមូល «បានបង់» (ឬ «ជំពាក់») លើវិក្កយបត្រ។"],
    invoice: ["វិក្កយបត្រផ្លូវការ", "វិក្កយបត្រផ្លូវការ មានប្រអប់អតិថិជន — ល្អបំផុតលើ A4។"],
    folio: ["បញ្ជីសណ្ឋាគារ", "យប់នីមួយៗមួយជួរ ការបង់ជាឥណទាន សមតុល្យបន្ត។"],
    postcard: ["កាតអរគុណ", "អរគុណភ្ញៀវធំៗ បន្ទាប់មកវិក្កយបត្រ។"],
    retro: ["រ៉េត្រូ", "អក្សរធំ បន្ទាត់ចុចៗ បន្ទាត់ផ្កាយ។"],
    banner: ["បដា", "របារខ្មៅសម្រាប់ឈ្មោះ និងសរុប។"],
    grid: ["ក្រឡាព័ត៌មាន", "បន្ទប់ ចំនួនយប់ និងថ្ងៃ ក្នុងក្រឡាប្រអប់។"],
    regcard: ["កាតចុះឈ្មោះ", "ព័ត៌មានភ្ញៀវ និងកន្លែងចុះហត្ថលេខា — ភ្ញៀវ និងបុគ្គលិក។"],
    luxe: ["ប្រណីតខ្ពស់", "ស៊ុមពីរជាន់ អក្សរមានជើង លំអ។"],
    large: ["អក្សរធំ", "អក្សរ និងលេខធំ — ងាយអាន។"],
    zigzag: ["ក្រញាំ", "កាត់ជាក្រញាំរវាងផ្នែកនីមួយៗ។"],
    calendar: ["ប្រតិទិន", "ការស្នាក់នៅគូរជាជួរថ្ងៃប្រតិទិន។"],
  },
};
export const printName = (k, lang) => ((PRINT_NAMES[lang] || PRINT_NAMES.en)[k] || [k])[0];
export const printDesc = (k, lang) => ((PRINT_NAMES[lang] || PRINT_NAMES.en)[k] || [k, ""])[1];

const T = {
  en: {
    receipt: "RECEIPT",
    bill: "BILL",
    invoice: "INVOICE",
    regTitle: "GUEST REGISTRATION",
    no: "No.",
    date: "Date",
    staff: "Staff",
    room: "Room",
    guest: "Guest",
    phone: "Phone",
    nat: "Nationality",
    id: "ID / Passport",
    people: "Guests",
    peopleV: "{a} adult(s) · {c} child(ren)",
    checkIn: "Check-in",
    checkOut: "Check-out",
    nights: "Nights",
    nightsV: "{n} night(s)",
    roomLine: "Room {room} · {n} night(s) × {rate}",
    night: "Night",
    item: "Item",
    qty: "Qty",
    amount: "Amount",
    discount: "Discount",
    total: "Total",
    paid: "Paid",
    toPay: "To pay",
    change: "Change",
    payments: "Payments",
    payment: "Payment",
    balance: "Balance",
    scan: "Scan to pay",
    billTo: "Bill to",
    stay: "Stay",
    thanks: "Thank you for staying with us!",
    thanksName: "Thank you, {name}!",
    seeYou: "We hope to see you again.",
    signGuest: "Guest signature",
    signStaff: "Staff",
    stampPaid: "PAID",
    stampDue: "DUE",
    printed: "Printed",
  },
  km: {
    receipt: "វិក្កយបត្រ",
    bill: "វិក្កយបត្រត្រូវបង់",
    invoice: "វិក្កយបត្រផ្លូវការ",
    regTitle: "ការចុះឈ្មោះភ្ញៀវ",
    no: "លេខ",
    date: "កាលបរិច្ឆេទ",
    staff: "បុគ្គលិក",
    room: "បន្ទប់",
    guest: "ភ្ញៀវ",
    phone: "ទូរស័ព្ទ",
    nat: "សញ្ជាតិ",
    id: "អត្តសញ្ញាណ / លិខិតឆ្លងដែន",
    people: "ចំនួនភ្ញៀវ",
    peopleV: "មនុស្សធំ {a} · ក្មេង {c}",
    checkIn: "ចូល",
    checkOut: "ចេញ",
    nights: "ចំនួនយប់",
    nightsV: "{n} យប់",
    roomLine: "បន្ទប់ {room} · {n} យប់ × {rate}",
    night: "យប់",
    item: "មុខទំនិញ",
    qty: "ចំនួន",
    amount: "ទឹកប្រាក់",
    discount: "បញ្ចុះតម្លៃ",
    total: "សរុប",
    paid: "បានបង់",
    toPay: "ត្រូវបង់",
    change: "អាប់",
    payments: "ការបង់ប្រាក់",
    payment: "បង់",
    balance: "សមតុល្យ",
    scan: "ស្កេនដើម្បីបង់",
    billTo: "ជូនចំពោះ",
    stay: "ការស្នាក់នៅ",
    thanks: "អរគុណដែលបានស្នាក់នៅជាមួយយើង!",
    thanksName: "អរគុណ {name}!",
    seeYou: "សង្ឃឹមថានឹងជួបគ្នាម្តងទៀត។",
    signGuest: "ហត្ថលេខាភ្ញៀវ",
    signStaff: "បុគ្គលិក",
    stampPaid: "បានបង់",
    stampDue: "ជំពាក់",
    printed: "បោះពុម្ព",
  },
};

// what each template adds to the plain receipt
const PARTS = {
  columns: { cols: true },
  invoice: { cols: true, invoice: true },
  grid: { cols: true, facts: true },
  folio: { folio: true },
  calendar: { cal: true },
  regcard: { reg: true, sign: true },
  ticket: { ticket: true },
  stamp: { stamp: true },
  khmer: { bi: true },
  postcard: { hello: true },
  biglogo: { bigLogo: true },
  large: { facts: true },
  luxe: { orn: true },
  elegant: { orn: true },
  retro: { stars: true },
};

const money = (v, cur) => (cur === "KHR" ? `${Math.round(Number(v) || 0).toLocaleString("en-US")}៛` : `$${(Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const dayOf = (d, lang, opts = { day: "numeric", month: "short", year: "numeric" }) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { ...opts, timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
const timeOf = (t, lang) => (t ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Phnom_Penh" }).format(new Date(t)) : "");
const addDays = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

// a made-up stay for the template previews
export const SAMPLE_STAY = (lang = "en") => ({
  _id: "sample",
  no: "B-0042",
  status: "out",
  room_name: "201",
  type_name: lang === "km" ? "គ្រែពីរ" : "Double",
  from: "2026-10-12",
  to: "2026-10-14",
  rate: 25,
  adults: 2,
  children: 1,
  guest: { name: "John Smith", phone: "012 345 678", nationality: "UK", id_type: "passport", id_number: "P1234567" },
  charges: [
    { _id: "c1", label: lang === "km" ? "បោកអ៊ុត" : "Laundry", amount: 3, qty: 2 },
    { _id: "c2", label: lang === "km" ? "ទឹកសុទ្ធ" : "Water", amount: 0.5, qty: 4 },
  ],
  payments: [
    { _id: "p1", method: "cash", amount: 20, at: "2026-10-12T07:30:00Z", by: "Srey" },
    { _id: "p2", method: "aba", amount: 38, at: "2026-10-14T04:10:00Z", by: "Srey" },
  ],
  discount: 0,
  by: "Srey",
  bill: { nights: 2, room: 50, extras: 8, discount: 0, total: 58, paid: 58, balance: 0 },
});

// receipt settings from the owner overview (dashboard) or the desk boot (POS)
export const printCfg = (data) =>
  data?.print || {
    on: !!data?.addons?.gh_printer?.active,
    theme: data?.settings?.print_theme || "classic",
    size: data?.settings?.print_size || "80",
    auto: !!data?.settings?.print_auto,
    qr: data?.settings?.print_qr !== false,
  };

export function GhReceipt({ stay: s, data, lang = "en", theme = "classic", size = "80", qr = true, methods = {}, staff = "" }) {
  const t = T[lang] || T.en;
  const km = T.km;
  const en = T.en;
  const P = PARTS[theme] || {};
  const k = PRINT_THEMES.includes(theme) ? theme : "classic";
  const cur = data?.settings?.currency || "USD";
  const rate = Number(data?.settings?.khr_rate) || 4100;
  const biz = data?.business || {};
  const set = data?.settings || {};
  const b = s.bill || { nights: 0, room: 0, discount: 0, total: 0, paid: 0, balance: 0 };
  const paidUp = b.balance <= 0 && b.total > 0;
  // a label; "Khmer first" prints both languages
  const L = (key) =>
    P.bi ? (
      <span className="ghr-bi">
        <b>{km[key]}</b>
        <small>{en[key]}</small>
      </span>
    ) : (
      t[key]
    );
  const m = (v) => money(v, cur);
  const roomLine = t.roomLine
    .replace("{room}", s.room_name || "")
    .replace("{n}", b.nights)
    .replace("{rate}", m(s.rate));
  const title = P.invoice ? t.invoice : P.reg ? t.regTitle : paidUp ? t.receipt : t.bill;
  const nightsList = Array.from({ length: Math.max(0, b.nights) }, (_, i) => addDays(s.from, i));
  const showQr = qr && b.balance > 0 && set.pay_qr?.url ? set.pay_qr.url : qr && b.balance > 0 && typeof set.pay_qr === "string" && set.pay_qr ? set.pay_qr : "";
  const contact = [biz.phone, set.email, set.website].filter(Boolean);
  const printedAt = timeOf(new Date().toISOString(), lang);

  const Row = ({ a, v, cls = "" }) => (
    <div className={`ghr-row ${cls}`}>
      <span>{a}</span>
      <i className="ghr-dots" />
      <b>{v}</b>
    </div>
  );

  const head = (
    <header className="ghr-head">
      <span className="ghr-logo">{biz.logo_url ? <img src={biz.logo_url} alt="" /> : <BedDouble size={P.bigLogo ? 46 : 26} strokeWidth={1.6} />}</span>
      <div className="ghr-id">
        <b className="ghr-name">{biz.name}</b>
        {biz.address && <small>{biz.address}</small>}
        {contact.length > 0 && <small>{contact.join(" · ")}</small>}
      </div>
    </header>
  );

  const meta = (
    <div className="ghr-meta">
      <Row a={L("no")} v={s.no} />
      <Row a={L("date")} v={printedAt} />
      {(staff || s.by) && <Row a={L("staff")} v={staff || s.by} />}
    </div>
  );

  const guestBlock = P.reg ? (
    <div className="ghr-reg">
      {[
        ["guest", s.guest?.name],
        ["phone", s.guest?.phone],
        ["nat", s.guest?.nationality],
        ["id", s.guest?.id_number],
        ["people", t.peopleV.replace("{a}", s.adults || 1).replace("{c}", s.children || 0)],
      ].map(([key, v]) => (
        <div key={key} className="ghr-field">
          <small>{L(key)}</small>
          <b>{v || " "}</b>
        </div>
      ))}
    </div>
  ) : P.invoice ? (
    <div className="ghr-billto">
      <div>
        <small>{L("billTo")}</small>
        <b>{s.guest?.name}</b>
        {s.guest?.phone && <span>{s.guest.phone}</span>}
        {s.guest?.nationality && <span>{s.guest.nationality}</span>}
      </div>
      <div>
        <small>{L("stay")}</small>
        <b>
          {L("room")} {s.room_name}
        </b>
        <span>
          {dayOf(s.from, lang)} → {dayOf(s.to, lang)}
        </span>
        <span>{t.nightsV.replace("{n}", b.nights)}</span>
      </div>
    </div>
  ) : (
    <div className="ghr-stay">
      <div className="ghr-guest">
        <span className="ghr-roomtag">
          {L("room")} {s.room_name}
        </span>
        <b>{s.guest?.name}</b>
        {s.guest?.phone && <small>{s.guest.phone}</small>}
      </div>
      {!P.facts && !P.ticket && (
        <>
          <Row a={L("checkIn")} v={dayOf(s.from, lang)} />
          <Row a={L("checkOut")} v={dayOf(s.to, lang)} />
          <Row a={L("nights")} v={t.nightsV.replace("{n}", b.nights)} />
        </>
      )}
    </div>
  );

  const facts = (
    <div className="ghr-facts">
      <div>
        <small>{L("room")}</small>
        <b>{s.room_name}</b>
      </div>
      <div>
        <small>{L("nights")}</small>
        <b>{b.nights}</b>
      </div>
      <div>
        <small>{L("checkIn")}</small>
        <b>{dayOf(s.from, lang, { day: "numeric", month: "short" })}</b>
      </div>
      <div>
        <small>{L("checkOut")}</small>
        <b>{dayOf(s.to, lang, { day: "numeric", month: "short" })}</b>
      </div>
    </div>
  );

  const ticket = (
    <div className="ghr-ticket">
      <div className="ghr-tk-room">
        <small>{L("room")}</small>
        <b>{s.room_name}</b>
      </div>
      <div className="ghr-tk-dates">
        <div>
          <small>{L("checkIn")}</small>
          <b>{dayOf(s.from, lang, { day: "numeric", month: "short" })}</b>
          <span>{set.check_in || "14:00"}</span>
        </div>
        <span className="ghr-tk-arrow">→</span>
        <div>
          <small>{L("checkOut")}</small>
          <b>{dayOf(s.to, lang, { day: "numeric", month: "short" })}</b>
          <span>{set.check_out || "12:00"}</span>
        </div>
      </div>
    </div>
  );

  const cal = (
    <div className="ghr-cal">
      {nightsList.slice(0, 14).map((d) => (
        <div key={d}>
          <small>{dayOf(d, lang, { weekday: "short" })}</small>
          <b>{dayOf(d, lang, { day: "numeric" })}</b>
          <span>{m(s.rate)}</span>
        </div>
      ))}
      <div className="out">
        <small>{dayOf(s.to, lang, { weekday: "short" })}</small>
        <b>{dayOf(s.to, lang, { day: "numeric" })}</b>
        <span>{L("checkOut")}</span>
      </div>
    </div>
  );

  const extras = (s.charges || []).map((c) => ({ id: c._id || c.client_id || c.label, label: c.label, qty: c.qty || 1, unit: c.amount, amount: c.amount * (c.qty || 1) }));

  // folio: each night a line, payments as credits, running balance
  let run = 0;
  const folio = (
    <div className="ghr-folio">
      <div className="ghr-fo ghr-fo-h">
        <span>{L("date")}</span>
        <span>{L("item")}</span>
        <span>{L("amount")}</span>
        <span>{L("balance")}</span>
      </div>
      {nightsList.map((d) => {
        run += Number(s.rate) || 0;
        return (
          <div key={d} className="ghr-fo">
            <span>{dayOf(d, "en", { day: "2-digit", month: "2-digit" })}</span>
            <span>
              {L("night")} · {s.room_name}
            </span>
            <span>{m(s.rate)}</span>
            <span>{m(run)}</span>
          </div>
        );
      })}
      {extras.map((c) => {
        run += c.amount;
        return (
          <div key={c.id} className="ghr-fo">
            <span>·</span>
            <span>
              {c.label}
              {c.qty > 1 ? ` × ${c.qty}` : ""}
            </span>
            <span>{m(c.amount)}</span>
            <span>{m(run)}</span>
          </div>
        );
      })}
      {b.discount > 0 &&
        (() => {
          run -= b.discount;
          return (
            <div className="ghr-fo">
              <span>·</span>
              <span>{L("discount")}</span>
              <span>−{m(b.discount)}</span>
              <span>{m(run)}</span>
            </div>
          );
        })()}
      {(s.payments || []).map((p) => {
        run -= p.amount;
        return (
          <div key={p._id || p.client_id || p.at} className="ghr-fo cr">
            <span>{p.at ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(p.at)) : "·"}</span>
            <span>
              {L("payment")} · {methods[p.method] || p.method}
            </span>
            <span>−{m(p.amount)}</span>
            <span>{m(run)}</span>
          </div>
        );
      })}
    </div>
  );

  const lines = P.cols ? (
    <div className="ghr-table">
      <div className="ghr-tr ghr-th">
        <span>{L("item")}</span>
        <span>{L("qty")}</span>
        <span>{L("amount")}</span>
      </div>
      <div className="ghr-tr">
        <span>
          {L("room")} {s.room_name}
          <small>
            {dayOf(s.from, lang, { day: "numeric", month: "short" })} → {dayOf(s.to, lang, { day: "numeric", month: "short" })} · {m(s.rate)}
          </small>
        </span>
        <span>{b.nights}</span>
        <span>{m(b.room)}</span>
      </div>
      {extras.map((c) => (
        <div key={c.id} className="ghr-tr">
          <span>
            {c.label}
            <small>{m(c.unit)}</small>
          </span>
          <span>{c.qty}</span>
          <span>{m(c.amount)}</span>
        </div>
      ))}
      {b.discount > 0 && (
        <div className="ghr-tr">
          <span>{L("discount")}</span>
          <span />
          <span>−{m(b.discount)}</span>
        </div>
      )}
    </div>
  ) : (
    <div className="ghr-lines">
      <Row a={roomLine} v={m(b.room)} />
      {extras.map((c) => (
        <Row key={c.id} a={`${c.label}${c.qty > 1 ? ` × ${c.qty}` : ""}`} v={m(c.amount)} />
      ))}
      {b.discount > 0 && <Row a={L("discount")} v={`−${m(b.discount)}`} />}
    </div>
  );

  const totals = (
    <div className="ghr-totals">
      <Row cls="ghr-grand" a={L("total")} v={m(b.total)} />
      {cur === "USD" && b.total > 0 && <div className="ghr-khr">≈ {money(b.total * rate, "KHR")}</div>}
      {!P.folio && b.paid !== 0 && <Row a={L("paid")} v={m(b.paid)} />}
      <Row cls={`ghr-due ${b.balance > 0 ? "owe" : ""}`} a={b.balance >= 0 ? L("toPay") : L("change")} v={m(Math.abs(b.balance))} />
    </div>
  );

  const pays =
    !P.folio && (s.payments || []).length > 0 ? (
      <div className="ghr-pays">
        <div className="ghr-sec">{L("payments")}</div>
        {s.payments.map((p) => (
          <Row key={p._id || p.client_id || p.at} a={`${methods[p.method] || p.method}${p.at ? ` · ${timeOf(p.at, lang)}` : ""}`} v={m(p.amount)} />
        ))}
      </div>
    ) : null;

  const rule = <div className="ghr-rule" />;
  const orn = P.orn ? <div className="ghr-orn">✦ ❖ ✦</div> : null;
  const stars = P.stars ? <div className="ghr-stars">* * * * * * * * * * * * * * * *</div> : null;

  return (
    <div className={`ghr t-${k} sz-${size} lang-${lang === "km" ? "km" : "en"}`}>
      {P.stamp && <div className={`ghr-stamp ${paidUp ? "" : "due"}`}>{paidUp ? t.stampPaid : t.stampDue}</div>}
      {P.hello && (
        <div className="ghr-hello">
          <b>{t.thanksName.replace("{name}", s.guest?.name || "")}</b>
          <small>{t.seeYou}</small>
          <span>★ ★ ★ ★ ★</span>
        </div>
      )}
      {head}
      {orn}
      {stars}
      <div className="ghr-title">{title}</div>
      {meta}
      {rule}
      {P.ticket && (
        <>
          {ticket}
          <div className="ghr-perf">
            <span>✂</span>
          </div>
        </>
      )}
      {guestBlock}
      {P.facts && facts}
      {P.cal && cal}
      {rule}
      {P.folio ? folio : lines}
      {rule}
      {totals}
      {pays}
      {showQr && (
        <div className="ghr-qr">
          <small>{L("scan")}</small>
          <img src={showQr} alt="QR" />
          <b>{m(b.balance)}</b>
          {set.pay_qr_label && <small>{set.pay_qr_label}</small>}
        </div>
      )}
      {P.sign && (
        <div className="ghr-sign">
          <div>
            <i />
            <small>{L("signGuest")}</small>
          </div>
          <div>
            <i />
            <small>{L("signStaff")}</small>
          </div>
        </div>
      )}
      {stars}
      {orn}
      <footer className="ghr-foot">
        {set.receipt_note && <p>{set.receipt_note}</p>}
        {!P.hello && <b>{t.thanks}</b>}
        {set.telegram && <small>Telegram: {set.telegram}</small>}
      </footer>
    </div>
  );
}

// on screen: the receipt on a strip of paper
export function GhPaper({ size = "80", children }) {
  return <div className={`ghr-paper w${size}`}>{children}</div>;
}

// print: draw the receipt in a hidden spot, open the print window, then clean up
export function printReceipt(node, size = "80") {
  const host = document.createElement("div");
  host.className = `ghr-print w${size}`;
  document.body.appendChild(host);
  const page = document.createElement("style");
  page.textContent = size === "a4" ? "@page{size:A4;margin:12mm}" : `@page{size:${size === "58" ? 58 : 80}mm auto;margin:0}`;
  document.head.appendChild(page);
  const root = createRoot(host);
  root.render(node);
  document.body.classList.add("ghr-printing");
  const done = () => {
    window.removeEventListener("afterprint", done);
    document.body.classList.remove("ghr-printing");
    setTimeout(() => {
      root.unmount();
      host.remove();
      page.remove();
    }, 0);
  };
  window.addEventListener("afterprint", done);
  // wait for the logo / QR picture, then print
  setTimeout(async () => {
    const imgs = [...host.querySelectorAll("img")].filter((i) => !i.complete);
    await Promise.race([Promise.all(imgs.map((i) => new Promise((r) => (i.onload = i.onerror = r)))), new Promise((r) => setTimeout(r, 1500))]);
    window.print();
  }, 60);
}
