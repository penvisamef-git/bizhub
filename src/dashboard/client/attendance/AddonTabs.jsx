import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, FileText, Loader2, Minus, Pencil, Plus, Printer, RefreshCw, Send, Settings2, Trash2, Unplug, X, Landmark } from "lucide-react";
import { attendanceService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import CoinIcon from "../../../components/CoinIcon";
import { PUBLIC_SITE_URL } from "../../../config";
import { Field } from "../restaurant/parts";
import { ADDON_ICONS, addonText } from "./addon-info";
import { fmtDay, todayKH } from "./text";
import LooksTab from "./LooksTab";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const money = (v, cur) => (cur === "KHR" ? `${fmt(Math.round(v))}៛` : `$${(Math.round((Number(v) || 0) * 100) / 100).toFixed(2)}`);
const shiftMonth = (month, n) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const monthName = (month, lang) => {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
};
const hm = (min) => (min ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}` : "0");

const T = {
  en: {
    lockedSub: "Unlock it to use this page.",
    buy: "Unlock · {coins} coins / year",
    // leave
    leaveSub: "Staff ask for leave on their phone. Approved leave is not counted as absent; unpaid leave comes off the pay.",
    addLeave: "Add leave",
    pending: "Waiting",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
    all: "All",
    types: { annual: "Annual", sick: "Sick", personal: "Personal", unpaid: "Unpaid" },
    days: "{n} day(s)",
    approve: "Approve",
    reject: "Reject",
    notePh: "Answer (optional)",
    noLeave: "No leave here.",
    annualDays: "Annual leave per year",
    daysWord: "days",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    staff: "Staff",
    type: "Type",
    from: "From",
    to: "To",
    reason: "Reason",
    byOwner: "Added by {name}",
    remove: "Remove",
    saved: "Saved.",
    // payroll
    paySub: "Pay = salary − absent days − late time − unpaid leave + overtime + extra days + your lines. Set each salary below.",
    currency: "Currency",
    otRate: "Overtime pays",
    timesHour: "× the hourly rate",
    deductLate: "Take off late time",
    deductAbsent: "Take off absent days",
    payExtra: "Pay days worked on a day off",
    holidayRate: "A worked holiday pays",
    timesDay: "× a day",
    outAlert: "Tell me when someone is still clocked in after the shift",
    fixAlert: "Tell me when someone asks to fix a record",
    monthly: "Send last month's summary on the 1st",
    col: { staff: "Staff", salary: "Salary", days: "Work days", base: "Base", minus: "Deductions", plus: "OT + extra", adj: "+ / −", net: "Net pay" },
    total: "Total",
    exportCsv: "Excel (CSV)",
    bankCsv: "Bank list",
    otApproval: "Only pay overtime that was approved (staff ask from their phone)",
    khTitle: "Cambodia payroll",
    khSub: "Tax on salary, NSSF and seniority indemnity worked out for each staff. Set dependants, contract and resident on each staff.",
    khUnlock: "Unlock · {coins} coins / year",
    khTax: "Tax on salary",
    khNssf: "NSSF (pension, risk, health)",
    khSeniority: "Seniority indemnity (June & December, UDC)",
    khRate: "Tax exchange rate",
    khPerUsd: "KHR per USD",
    khPensionEe: "Pension · staff %",
    khPensionEr: "Pension · employer %",
    khRisk: "Occupational risk %",
    khHealth: "Health care %",
    khNote: "Rates as of 2026 — check them when the law changes.",
    kTax: "Tax",
    kNssfStaff: "NSSF (staff)",
    kNssfEmployer: "NSSF (employer cost)",
    kSeniority: "Seniority",
    kGross: "Gross",
    payslip: "Payslip",
    print: "Print",
    lines: "Bonus / deduction lines",
    label: "Label",
    labelPh: "e.g. Bonus, Advance",
    amount: "Amount",
    amountHint: "Use − for a deduction, e.g. -20",
    add: "Add",
    noSalary: "Set salary",
    payType: "Pay type",
    payTypes: { monthly: "Monthly", daily: "Per day", hourly: "Per hour" },
    per: { monthly: " / month", daily: " / day", hourly: " / hour" },
    rules: "Pay rules",
    addBonus: "Bonus",
    addDeduct: "Deduct",
    bonusTitle: "Add a bonus",
    deductTitle: "Deduct from salary",
    bonusPh: "e.g. Sales bonus",
    deductPh: "e.g. Broke a glass",
    bonusPresets: ["Bonus", "Commission", "Allowance", "Overtime extra"],
    deductPresets: ["Salary advance", "Damage", "Uniform", "Late fine", "Loan repayment"],
    needAmount: "Please type the amount.",
    needReason: "Please write the reason.",
    adjNote: "Added to {month}. The staff sees it with the reason in “My pay”.",
    showStaff: "Staff can see their own pay on their phone (My pay)",
    totalPay: "Total to pay",
    staffCount: "{n} staff",
    noSalaryHint: "{n} staff have no salary yet — tap “Set salary” on their card.",
    noStaffPay: "No staff yet. Add staff first.",
    fWorkDays: "{p} / {d} days",
    fNoShift: "No shift",
    fAbsent: "{n} absent",
    fLate: "{t} late",
    fOt: "{t} overtime",
    fLeave: "{n} leave",
    br: {
      base: "Base salary",
      absent: "Absent ({n} days)",
      late: "Late ({t})",
      unpaid: "Unpaid leave ({n} days)",
      ot: "Overtime ({t})",
      extra: "Extra days ({n})",
      net: "Net pay",
      daily: "Day rate {v} · hour rate {h} · {d} work days",
      paidLeave: "Paid leave: {n} day(s)",
    },
    // telegram
    tgSub: "Get today's attendance in Telegram every evening, and alerts as things happen.",
    notConfigured: "The BizHub Telegram bot isn't set up yet. Please try later.",
    connect: "Connect Telegram",
    connectGroup: "Add to a group",
    waiting: "Press Start in Telegram… waiting",
    connected: "Connected to {name}",
    notConnected: "Not connected yet",
    dailyReport: "Daily report",
    at: "at",
    lateAlert: "Tell me when someone is late",
    reviewAlert: "Tell me when a record needs review",
    leaveAlert: "Tell me when someone asks for leave",
    test: "Send a test",
    sent: "Test sent.",
    disconnect: "Disconnect",
    // kiosk
    kioskAppQr: "Using the BizHub POS app on the tablet? Choose Attendance → Door tablet and scan this QR.",
    kioskSub: "Put a tablet or old phone at the door and open its link. It shows a QR that changes every 20 seconds; staff scan it with their phone camera to clock in — no GPS needed.",
    kioskWarn: "Keep each link on the door tablet only: anyone with it can see the QR.",
    open: "Open",
    copy: "Copy",
    copied: "Copied",
    newLink: "New link",
    off: "off",
  },
  km: {
    lockedSub: "ដោះសោដើម្បីប្រើទំព័រនេះ។",
    buy: "ដោះសោ · {coins} កាក់ / ឆ្នាំ",
    leaveSub: "បុគ្គលិកស្នើច្បាប់លើទូរស័ព្ទ។ ច្បាប់ដែលយល់ព្រម មិនរាប់ជាអវត្តមាន។ ច្បាប់គ្មានប្រាក់ កាត់ពីប្រាក់ខែ។",
    addLeave: "បន្ថែមច្បាប់",
    pending: "រង់ចាំ",
    approved: "យល់ព្រម",
    rejected: "បដិសេធ",
    cancelled: "បោះបង់",
    all: "ទាំងអស់",
    types: { annual: "ប្រចាំឆ្នាំ", sick: "ឈឺ", personal: "ផ្ទាល់ខ្លួន", unpaid: "គ្មានប្រាក់" },
    days: "{n} ថ្ងៃ",
    approve: "យល់ព្រម",
    reject: "បដិសេធ",
    notePh: "ចម្លើយ (មិនចាំបាច់)",
    noLeave: "មិនមានច្បាប់ទេ។",
    annualDays: "ច្បាប់ប្រចាំឆ្នាំ",
    daysWord: "ថ្ងៃ",
    save: "រក្សាទុក",
    saving: "កំពុងរក្សាទុក…",
    cancel: "បោះបង់",
    staff: "បុគ្គលិក",
    type: "ប្រភេទ",
    from: "ពី",
    to: "ដល់",
    reason: "មូលហេតុ",
    byOwner: "បញ្ចូលដោយ {name}",
    remove: "លុប",
    saved: "បានរក្សាទុក។",
    paySub: "ប្រាក់ទទួល = ប្រាក់ខែ − ថ្ងៃអវត្តមាន − ម៉ោងយឺត − ច្បាប់គ្មានប្រាក់ + ថែមម៉ោង + ថ្ងៃបន្ថែម + បន្ទាត់របស់អ្នក។ កំណត់ប្រាក់ខែនីមួយៗខាងក្រោម។",
    currency: "រូបិយប័ណ្ណ",
    otRate: "ថែមម៉ោងបង់",
    timesHour: "× ប្រាក់ម៉ោង",
    deductLate: "កាត់ម៉ោងយឺត",
    deductAbsent: "កាត់ថ្ងៃអវត្តមាន",
    payExtra: "បង់ថ្ងៃធ្វើការលើថ្ងៃឈប់",
    holidayRate: "ធ្វើការថ្ងៃឈប់សម្រាក បង់",
    timesDay: "× មួយថ្ងៃ",
    outAlert: "ប្រាប់ខ្ញុំពេលមានអ្នកមិនទាន់ចុះចេញក្រោយវេន",
    fixAlert: "ប្រាប់ខ្ញុំពេលមានអ្នកស្នើកែកំណត់ត្រា",
    monthly: "ផ្ញើសង្ខេបខែមុននៅថ្ងៃទី 1",
    col: { staff: "បុគ្គលិក", salary: "ប្រាក់ខែ", days: "ថ្ងៃធ្វើការ", base: "មូលដ្ឋាន", minus: "កាត់", plus: "ថែមម៉ោង + ថ្ងៃបន្ថែម", adj: "+ / −", net: "សរុបទទួល" },
    total: "សរុប",
    exportCsv: "Excel (CSV)",
    bankCsv: "បញ្ជីធនាគារ",
    otApproval: "បង់តែថែមម៉ោងដែលបានយល់ព្រម (បុគ្គលិកស្នើពីទូរស័ព្ទ)",
    khTitle: "ប្រាក់ខែកម្ពុជា",
    khSub: "ពន្ធលើប្រាក់បៀវត្សរ៍ ប.ស.ស និងប្រាក់បំណាច់អតីតភាព គណនាសម្រាប់បុគ្គលិកម្នាក់ៗ។ កំណត់អ្នកនៅក្នុងបន្ទុក កិច្ចសន្យា និងនិវាសនជន លើបុគ្គលិកម្នាក់ៗ។",
    khUnlock: "ដោះសោ · {coins} កាក់ / ឆ្នាំ",
    khTax: "ពន្ធលើប្រាក់បៀវត្សរ៍",
    khNssf: "ប.ស.ស (សោធន ហានិភ័យ សុខភាព)",
    khSeniority: "ប្រាក់បំណាច់អតីតភាព (មិថុនា និងធ្នូ, UDC)",
    khRate: "អត្រាប្តូរប្រាក់សម្រាប់ពន្ធ",
    khPerUsd: "រៀល ក្នុង 1 ដុល្លារ",
    khPensionEe: "សោធន · បុគ្គលិក %",
    khPensionEr: "សោធន · និយោជក %",
    khRisk: "ហានិភ័យការងារ %",
    khHealth: "ថែទាំសុខភាព %",
    khNote: "អត្រាឆ្នាំ 2026 — សូមពិនិត្យពេលច្បាប់ប្តូរ។",
    kTax: "ពន្ធ",
    kNssfStaff: "ប.ស.ស (បុគ្គលិក)",
    kNssfEmployer: "ប.ស.ស (ចំណាយនិយោជក)",
    kSeniority: "អតីតភាព",
    kGross: "សរុបមុនកាត់",
    payslip: "បង្កាន់ដៃប្រាក់ខែ",
    print: "បោះពុម្ព",
    lines: "បន្ទាត់ប្រាក់រង្វាន់ / កាត់",
    label: "ឈ្មោះ",
    labelPh: "ឧ. ប្រាក់រង្វាន់ ខ្ចីមុន",
    amount: "ចំនួន",
    amountHint: "ប្រើ − សម្រាប់កាត់ ឧ. -20",
    add: "បន្ថែម",
    noSalary: "កំណត់ប្រាក់ខែ",
    payType: "ប្រភេទប្រាក់ខែ",
    payTypes: { monthly: "ប្រចាំខែ", daily: "ប្រចាំថ្ងៃ", hourly: "ប្រចាំម៉ោង" },
    per: { monthly: " / ខែ", daily: " / ថ្ងៃ", hourly: " / ម៉ោង" },
    rules: "ច្បាប់ប្រាក់ខែ",
    addBonus: "ប្រាក់រង្វាន់",
    addDeduct: "កាត់",
    bonusTitle: "បន្ថែមប្រាក់រង្វាន់",
    deductTitle: "កាត់ប្រាក់ខែ",
    bonusPh: "ឧ. ប្រាក់រង្វាន់លក់",
    deductPh: "ឧ. បំបែកកែវ",
    bonusPresets: ["ប្រាក់រង្វាន់", "កម្រៃជើងសារ", "ប្រាក់ឧបត្ថម្ភ", "ថែមម៉ោងបន្ថែម"],
    deductPresets: ["ខ្ចីប្រាក់មុន", "ខូចខាត", "ឯកសណ្ឋាន", "ពិន័យមកយឺត", "សងប្រាក់កម្ចី"],
    needAmount: "សូមវាយចំនួនទឹកប្រាក់។",
    needReason: "សូមសរសេរមូលហេតុ។",
    adjNote: "បញ្ចូលក្នុង {month}។ បុគ្គលិកឃើញវាជាមួយមូលហេតុ ក្នុង “ប្រាក់ខែរបស់ខ្ញុំ”។",
    showStaff: "បុគ្គលិកអាចមើលប្រាក់ខែខ្លួនឯងលើទូរស័ព្ទ",
    totalPay: "សរុបត្រូវបង់",
    staffCount: "បុគ្គលិក {n} នាក់",
    noSalaryHint: "បុគ្គលិក {n} នាក់ មិនទាន់មានប្រាក់ខែ — ចុច “កំណត់ប្រាក់ខែ” លើកាតរបស់គាត់។",
    noStaffPay: "មិនទាន់មានបុគ្គលិក។ សូមបន្ថែមបុគ្គលិកជាមុន។",
    fWorkDays: "{p} / {d} ថ្ងៃ",
    fNoShift: "គ្មានវេន",
    fAbsent: "អវត្តមាន {n}",
    fLate: "យឺត {t}",
    fOt: "ថែមម៉ោង {t}",
    fLeave: "ច្បាប់ {n}",
    br: {
      base: "ប្រាក់ខែមូលដ្ឋាន",
      absent: "អវត្តមាន ({n} ថ្ងៃ)",
      late: "យឺត ({t})",
      unpaid: "ច្បាប់គ្មានប្រាក់ ({n} ថ្ងៃ)",
      ot: "ថែមម៉ោង ({t})",
      extra: "ថ្ងៃបន្ថែម ({n})",
      net: "សរុបទទួល",
      daily: "ប្រាក់ថ្ងៃ {v} · ប្រាក់ម៉ោង {h} · {d} ថ្ងៃធ្វើការ",
      paidLeave: "ច្បាប់មានប្រាក់៖ {n} ថ្ងៃ",
    },
    tgSub: "ទទួលវត្តមានថ្ងៃនេះតាមតេឡេក្រាមរាល់ល្ងាច និងជូនដំណឹងភ្លាមៗ។",
    notConfigured: "Telegram bot របស់ BizHub មិនទាន់រៀបចំទេ។ សូមព្យាយាមពេលក្រោយ។",
    connect: "ភ្ជាប់តេឡេក្រាម",
    connectGroup: "បន្ថែមទៅក្រុម",
    waiting: "ចុច Start ក្នុងតេឡេក្រាម… កំពុងរង់ចាំ",
    connected: "បានភ្ជាប់ជាមួយ {name}",
    notConnected: "មិនទាន់ភ្ជាប់",
    dailyReport: "របាយការណ៍ប្រចាំថ្ងៃ",
    at: "ម៉ោង",
    lateAlert: "ប្រាប់ខ្ញុំពេលមានអ្នកយឺត",
    reviewAlert: "ប្រាប់ខ្ញុំពេលមានកំណត់ត្រាត្រូវពិនិត្យ",
    leaveAlert: "ប្រាប់ខ្ញុំពេលមានអ្នកស្នើច្បាប់",
    test: "ផ្ញើសាកល្បង",
    sent: "បានផ្ញើសាកល្បង។",
    disconnect: "ផ្តាច់",
    kioskAppQr: "ប្រើកម្មវិធី BizHub POS លើថេប្លេត? ជ្រើស វត្តមាន → ថេប្លេតមាត់ទ្វារ ហើយស្កេន QR នេះ។",
    kioskSub: "ដាក់ថេប្លេត ឬទូរស័ព្ទចាស់នៅមាត់ទ្វារ ហើយបើកតំណរបស់វា។ វាបង្ហាញ QR ដែលប្តូររៀងរាល់ 20 វិនាទី បុគ្គលិកស្កេនដោយកាមេរ៉ាទូរស័ព្ទដើម្បីចុះចូល — មិនត្រូវការ GPS។",
    kioskWarn: "រក្សាតំណនីមួយៗនៅលើថេប្លេតមាត់ទ្វារប៉ុណ្ណោះ៖ អ្នកណាមានតំណ អាចឃើញ QR។",
    open: "បើក",
    copy: "ចម្លង",
    copied: "បានចម្លង",
    newLink: "តំណថ្មី",
    off: "បិទ",
  },
};

// "this page needs an add-on" with a buy button
export function Locked({ ctx, addon }) {
  const t = T[ctx.lang] || T.en;
  const ai = addonText(ctx.lang);
  const Icon = ADDON_ICONS[addon];
  const price = ctx.data.addons?.[addon]?.price;
  return (
    <section className="panel-card at-locked">
      <span className="rs-addon-ic big">
        <Icon size={30} />
      </span>
      <h2>{ai.names[addon]}</h2>
      <p className="rs-muted">{ai.what[addon]}</p>
      <ul className="at-perks">
        {(ai.perks[addon] || []).map((p) => (
          <li key={p}>
            <Check size={15} /> {p}
          </li>
        ))}
      </ul>
      <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon })} disabled={ctx.readOnly}>
        <CoinIcon size={16} /> {t.buy.replace("{coins}", fmt(price))}
      </button>
    </section>
  );
}
const on = (ctx, key) => !!ctx.data.addons?.[key]?.active;

function Switch({ checked, onChange, label, disabled }) {
  return (
    <label className="md-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="md-switch-track" />
      <span>{label}</span>
    </label>
  );
}

// ============================ LEAVE ============================
export function LeaveTab({ ctx }) {
  const { lang, readOnly } = ctx;
  const t = T[lang] || T.en;
  const [show, setShow] = useState("pending");
  const [data, setData] = useState(null);
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState("");
  const [adding, setAdding] = useState(false);
  const [annual, setAnnual] = useState("");
  const load = useCallback(
    () =>
      attendanceService
        .leave(ctx.id, show === "all" ? {} : { status: show })
        .then((r) => {
          setData(r.data);
          setAnnual(String(r.data.annual_days));
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id, show], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const active = on(ctx, "att_leave");
  useEffect(() => {
    if (active) load();
  }, [load, active]);
  if (!active) return <Locked ctx={ctx} addon="att_leave" />;
  if (!data) return <ListSkeleton rows={3} />;

  const decide = async (l, status) => {
    setBusy(l._id);
    try {
      await attendanceService.decideLeave(ctx.id, l._id, status, notes[l._id] || "");
      await load();
      ctx.reload();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const remove = async (l) => {
    setBusy(l._id);
    try {
      await attendanceService.removeLeave(ctx.id, l._id);
      await load();
      ctx.reload();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const saveAnnual = async () => {
    try {
      await attendanceService.leaveSettings(ctx.id, { annual_days: Number(annual) });
      ctx.notify({ type: "success", text: t.saved });
      load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };

  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="pe-list-head">
          <h2 style={{ margin: 0 }}>{ctx.a.tabs.leave}</h2>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setAdding(true)} disabled={readOnly}>
            <Plus size={15} /> {t.addLeave}
          </button>
        </div>
        <p className="rs-muted" style={{ margin: "6px 0 12px" }}>
          {t.leaveSub}
        </p>
        <div className="at-leave-bar">
          <div className="at-seg small">
            {["pending", "approved", "rejected", "all"].map((k) => (
              <button key={k} type="button" className={show === k ? "on" : ""} onClick={() => setShow(k)}>
                {t[k]}
                {k === "pending" && data.pending > 0 ? ` (${data.pending})` : ""}
              </button>
            ))}
          </div>
          <label className="at-annual">
            {t.annualDays}
            <input type="number" min={0} max={60} value={annual} onChange={(e) => setAnnual(e.target.value)} disabled={readOnly} />
            {t.daysWord}
            {String(data.annual_days) !== annual && (
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={saveAnnual}>
                {t.save}
              </button>
            )}
          </label>
        </div>
      </section>
      {data.rows.length === 0 && (
        <section className="panel-card rs-empty">
          <p>{t.noLeave}</p>
        </section>
      )}
      {data.rows.length > 0 && (
        <section className="panel-card">
          <ul className="at-review">
            {data.rows.map((l) => (
              <li key={l._id}>
                <div className="at-review-top">
                  <span className="at-av">{Array.from(l.staff_name || "?")[0]}</span>
                  <span className="at-who">
                    <b>{l.staff_name}</b>
                    <small>
                      {fmtDay(l.from, lang)}
                      {l.to !== l.from ? ` → ${fmtDay(l.to, lang)}` : ""} · {t.days.replace("{n}", l.days)}
                    </small>
                  </span>
                  <span className={`at-tag lt-${l.type}`}>{t.types[l.type]}</span>
                  <span className={`at-tag ls-${l.status}`}>{t[l.status]}</span>
                </div>
                {(l.reason || l.note || (l.by && l.by !== "staff")) && (
                  <div className="at-leave-text">
                    {l.reason && <span>“{l.reason}”</span>}
                    {l.note && <small>↳ {l.note}</small>}
                    {l.by && l.by !== "staff" && <small>{t.byOwner.replace("{name}", l.by)}</small>}
                  </div>
                )}
                {!readOnly &&
                  (l.status === "pending" ? (
                    <div className="at-review-act">
                      <input placeholder={t.notePh} maxLength={300} value={notes[l._id] || ""} onChange={(e) => setNotes({ ...notes, [l._id]: e.target.value })} />
                      <button type="button" className="md-btn md-btn-ghost sa-danger-text sa-btn-sm" onClick={() => decide(l, "rejected")} disabled={busy === l._id}>
                        <X size={15} /> {t.reject}
                      </button>
                      <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => decide(l, "approved")} disabled={busy === l._id}>
                        <Check size={15} /> {t.approve}
                      </button>
                    </div>
                  ) : (
                    <div className="at-review-act end">
                      <button type="button" className="md-btn md-btn-ghost sa-danger-text sa-btn-sm" onClick={() => remove(l)} disabled={busy === l._id}>
                        <Trash2 size={14} /> {t.remove}
                      </button>
                    </div>
                  ))}
              </li>
            ))}
          </ul>
        </section>
      )}
      {adding && <LeaveModal ctx={ctx} t={t} onClose={() => setAdding(false)} onSaved={() => (setAdding(false), load(), ctx.reload())} />}
    </div>
  );
}

function LeaveModal({ ctx, t, onClose, onSaved }) {
  const staff = ctx.data.staff.filter((s) => s.active);
  const [f, setF] = useState({ staff_id: staff[0]?._id || "", type: "annual", from: todayKH(), to: todayKH(), reason: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await attendanceService.addLeave(ctx.id, f);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={t.addLeave}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {t.cancel}
          </button>
          <button type="submit" form="at-leave" className="md-btn md-btn-primary" disabled={busy || !f.staff_id}>
            {busy ? t.saving : t.save}
          </button>
        </>
      }
    >
      <form id="at-leave" className="md-fields" onSubmit={submit}>
        <Field label={t.staff} htmlFor="lv-staff">
          <select id="lv-staff" value={f.staff_id} onChange={(e) => setF({ ...f, staff_id: e.target.value })}>
            {staff.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.type}>
          <div className="at-seg">
            {Object.keys(t.types).map((k) => (
              <button key={k} type="button" className={f.type === k ? "on" : ""} onClick={() => setF({ ...f, type: k })}>
                {t.types[k]}
              </button>
            ))}
          </div>
        </Field>
        <div className="md-fields-grid">
          <Field label={t.from} htmlFor="lv-from">
            <input id="lv-from" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, to: f.to < e.target.value ? e.target.value : f.to })} />
          </Field>
          <Field label={t.to} htmlFor="lv-to">
            <input id="lv-to" type="date" value={f.to} min={f.from} onChange={(e) => setF({ ...f, to: e.target.value })} />
          </Field>
        </div>
        <Field label={t.reason} htmlFor="lv-reason">
          <input id="lv-reason" maxLength={300} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
        </Field>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

// ============================ PAYROLL ============================
export function PayrollTab({ ctx }) {
  const { lang, readOnly } = ctx;
  const t = T[lang] || T.en;
  const [month, setMonth] = useState(todayKH().slice(0, 7));
  const [data, setData] = useState(null);
  const [slip, setSlip] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [editing, setEditing] = useState(null); // staff id whose salary is being typed
  const [adjusting, setAdjusting] = useState(null); // { row, kind: "bonus" | "deduct" }
  const load = useCallback(
    () =>
      attendanceService
        .payroll(ctx.id, month)
        .then((r) => setData(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id, month], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const active = on(ctx, "att_payroll");
  useEffect(() => {
    if (active) load();
  }, [load, active]);
  if (!active) return <Locked ctx={ctx} addon="att_payroll" />;

  const saveSetting = async (patch) => {
    try {
      await attendanceService.payrollSettings(ctx.id, patch);
      load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const saveSalary = async (row, v) => {
    setEditing(null);
    const n = Number(v);
    if (v === "" || !Number.isFinite(n) || n < 0 || n === row.salary) return;
    try {
      await attendanceService.setSalary(ctx.id, row.staff._id, n);
      await load();
      ctx.reload();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const saveType = async (row, pay_type) => {
    try {
      await attendanceService.setSalary(ctx.id, row.staff._id, row.salary || 0, pay_type);
      await load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const removeLine = async (aid) => {
    try {
      await attendanceService.removeAdjust(ctx.id, aid);
      load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const exportCsv = async () => {
    setExporting(true);
    try {
      await attendanceService.payrollCsv(ctx.id, month, lang);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setExporting(false);
    }
  };
  const cur = data?.settings?.currency || "USD";
  const thisMonth = todayKH().slice(0, 7);
  const sum = (fn) => (data ? data.rows.reduce((a, r) => a + fn(r), 0) : 0);
  const totals = data && {
    base: sum((r) => r.base),
    minus: sum((r) => r.absent_ded + r.late_ded + r.unpaid_ded),
    plus: sum((r) => r.ot_pay + r.extra_pay),
    adj: sum((r) => r.adj_total),
  };
  const noSalary = data ? data.rows.filter((r) => !r.salary).length : 0;
  const initial = (n) => Array.from(String(n || "?").trim() || "?")[0].toUpperCase();

  return (
    <div className="rs-col">
      {/* month + totals */}
      <section className="panel-card at-pay-head">
        <div className="at-daynav">
          <button type="button" className="md-icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="-1">
            <ChevronLeft size={18} />
          </button>
          <b className="at-month">{monthName(month, lang)}</b>
          <button type="button" className="md-icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth} aria-label="+1">
            <ChevronRight size={18} />
          </button>
          <span className="at-grow" />
          <button type="button" className={`md-btn md-btn-ghost sa-btn-sm ${rulesOpen ? "on" : ""}`} onClick={() => setRulesOpen((v) => !v)}>
            <Settings2 size={15} /> {t.rules}
          </button>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => attendanceService.bankCsv(ctx.id, month, lang).catch((e) => ctx.notify({ type: "error", text: e.message }))} disabled={!data?.rows.length}>
            <Landmark size={15} /> {t.bankCsv}
          </button>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={exportCsv} disabled={exporting || !data?.rows.length}>
            {exporting ? <Loader2 size={15} className="md-spin" /> : <Download size={15} />} {t.exportCsv}
          </button>
        </div>
        {data && (
          <div className="at-pay-kpis">
            <div className="at-pay-total">
              <small>{t.totalPay}</small>
              <b>{money(data.total, cur)}</b>
              <span>{t.staffCount.replace("{n}", data.rows.length)}</span>
            </div>
            <div>
              <small>{t.col.base}</small>
              <b>{money(totals.base, cur)}</b>
            </div>
            <div className="bad">
              <small>{t.col.minus}</small>
              <b>{totals.minus ? `−${money(totals.minus, cur)}` : "—"}</b>
            </div>
            <div className="good">
              <small>{t.col.plus}</small>
              <b>{totals.plus ? `+${money(totals.plus, cur)}` : "—"}</b>
            </div>
            <div className={totals.adj < 0 ? "bad" : totals.adj > 0 ? "good" : ""}>
              <small>{t.col.adj}</small>
              <b>{totals.adj ? `${totals.adj > 0 ? "+" : "−"}${money(Math.abs(totals.adj), cur)}` : "—"}</b>
            </div>
            {data.kh?.on && (
              <>
                <div className="bad">
                  <small>{t.kTax}</small>
                  <b>{data.kh.tax ? `−${money(data.kh.tax, cur)}` : "—"}</b>
                </div>
                <div className="bad">
                  <small>{t.kNssfStaff}</small>
                  <b>{data.kh.nssf_staff ? `−${money(data.kh.nssf_staff, cur)}` : "—"}</b>
                </div>
                <div>
                  <small>{t.kNssfEmployer}</small>
                  <b>{money(data.kh.nssf_employer, cur)}</b>
                </div>
              </>
            )}
          </div>
        )}
        {rulesOpen && data && (
          <div className="at-pay-rules">
            <p className="rs-muted">{t.paySub}</p>
            <div className="at-pay-set">
              <label>
                {t.currency}
                <select value={cur} onChange={(e) => saveSetting({ currency: e.target.value })} disabled={readOnly}>
                  <option value="USD">USD $</option>
                  <option value="KHR">KHR ៛</option>
                </select>
              </label>
              <label>
                {t.otRate}
                <select value={data.settings.ot_rate} onChange={(e) => saveSetting({ ot_rate: Number(e.target.value) })} disabled={readOnly}>
                  {[1, 1.25, 1.5, 2, 2.5, 3].map((v) => (
                    <option key={v} value={v}>
                      {v}×
                    </option>
                  ))}
                </select>
                {t.timesHour}
              </label>
              <label>
                {t.holidayRate}
                <select value={data.settings.holiday_rate || 2} onChange={(e) => saveSetting({ holiday_rate: Number(e.target.value) })} disabled={readOnly}>
                  {[1, 1.5, 2, 2.5, 3].map((v) => (
                    <option key={v} value={v}>
                      {v}×
                    </option>
                  ))}
                </select>
                {t.timesDay}
              </label>
            </div>
            <div className="at-pay-set">
              <Switch checked={data.settings.show_staff !== false} onChange={(v) => saveSetting({ show_staff: v })} label={t.showStaff} disabled={readOnly} />
              <Switch checked={!!data.settings.ot_approval} onChange={(v) => saveSetting({ ot_approval: v })} label={t.otApproval} disabled={readOnly} />
            </div>
            <div className="at-kh">
              <b>
                <Landmark size={16} /> {t.khTitle}
              </b>
              <p className="rs-muted">{t.khSub}</p>
              {!ctx.data.addons?.att_khpay?.active ? (
                <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "att_khpay" })} disabled={readOnly}>
                  <CoinIcon size={15} /> {t.khUnlock.replace("{coins}", fmt(ctx.data.addons?.att_khpay?.price ?? 80))}
                </button>
              ) : (
                <>
                  <div className="at-pay-set">
                    {["tax", "nssf", "seniority"].map((k) => (
                      <Switch key={k} checked={data.settings.kh?.[k] !== false} onChange={(v) => saveSetting({ kh: { [k]: v } })} label={t[`kh${k[0].toUpperCase()}${k.slice(1)}`]} disabled={readOnly} />
                    ))}
                  </div>
                  <div className="at-pay-set at-kh-rates">
                    {[
                      ["khr_rate", t.khRate, t.khPerUsd, 1],
                      ["pension_ee", t.khPensionEe, "", 0.1],
                      ["pension_er", t.khPensionEr, "", 0.1],
                      ["risk_er", t.khRisk, "", 0.1],
                      ["health_er", t.khHealth, "", 0.1],
                    ].map(([k, label, post, step]) => (
                      <label key={k}>
                        {label}
                        <input
                          type="number"
                          step={step}
                          min={0}
                          defaultValue={data.settings.kh?.[k] ?? { khr_rate: 4100, pension_ee: 2, pension_er: 2, risk_er: 0.8, health_er: 2.6 }[k]}
                          onBlur={(e) => e.target.value !== "" && Number(e.target.value) !== data.settings.kh?.[k] && saveSetting({ kh: { [k]: Number(e.target.value) } })}
                          disabled={readOnly}
                        />
                        {post}
                      </label>
                    ))}
                  </div>
                  <small className="rs-muted">{t.khNote}</small>
                </>
              )}
            </div>
            <div className="at-pay-set">
              <Switch checked={data.settings.deduct_absent !== false} onChange={(v) => saveSetting({ deduct_absent: v })} label={t.deductAbsent} disabled={readOnly} />
              <Switch checked={data.settings.deduct_late !== false} onChange={(v) => saveSetting({ deduct_late: v })} label={t.deductLate} disabled={readOnly} />
              <Switch checked={data.settings.pay_extra_days !== false} onChange={(v) => saveSetting({ pay_extra_days: v })} label={t.payExtra} disabled={readOnly} />
            </div>
          </div>
        )}
      </section>

      {noSalary > 0 && data && <div className="at-pay-hint">{t.noSalaryHint.replace("{n}", noSalary)}</div>}
      {!data && <ListSkeleton rows={4} />}
      {data && data.rows.length === 0 && (
        <section className="panel-card rs-empty">
          <p>{t.noStaffPay}</p>
        </section>
      )}

      {/* one card per staff */}
      {data && data.rows.length > 0 && (
        <div className="at-pay-list">
          {data.rows.map((r) => {
            const minus = r.absent_ded + r.late_ded + r.unpaid_ded;
            const plus = r.ot_pay + r.extra_pay + (r.paid_leave_pay || 0);
            const facts = [
              r.work_days ? t.fWorkDays.replace("{p}", r.present).replace("{d}", r.work_days) : t.fNoShift,
              r.absent_days ? t.fAbsent.replace("{n}", r.absent_days) : "",
              r.late_min ? t.fLate.replace("{t}", hm(r.late_min)) : "",
              r.ot_min ? t.fOt.replace("{t}", hm(r.ot_min)) : "",
              r.paid_leave_days + r.unpaid_days ? t.fLeave.replace("{n}", r.paid_leave_days + r.unpaid_days) : "",
            ].filter(Boolean);
            return (
              <article key={r.staff._id} className={`panel-card at-pay-card ${r.salary ? "" : "empty"}`}>
                <div className="at-pay-who">
                  <span className="at-av big">{initial(r.staff.name)}</span>
                  <span>
                    <b>{r.staff.name}</b>
                    <small>{[r.staff.position, r.shift ? `${r.shift.start}–${r.shift.end}` : ""].filter(Boolean).join(" · ") || "—"}</small>
                  </span>
                </div>
                <div className="at-pay-salary">
                  <small>{t.col.salary}</small>
                  {editing === r.staff._id ? (
                    <input
                      className="at-salary"
                      type="number"
                      min={0}
                      step={cur === "KHR" ? 1000 : 1}
                      defaultValue={r.salary || ""}
                      autoFocus
                      onBlur={(e) => saveSalary(r, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      aria-label={`${t.col.salary} ${r.staff.name}`}
                    />
                  ) : (
                    <button type="button" className={`at-salary-btn ${r.salary ? "" : "set"}`} onClick={() => setEditing(r.staff._id)} disabled={readOnly}>
                      {r.salary ? `${money(r.salary, cur)}${t.per[r.pay_type || "monthly"]}` : t.noSalary}
                      <Pencil size={13} />
                    </button>
                  )}
                  <select className="at-paytype" value={r.pay_type || "monthly"} onChange={(e) => saveType(r, e.target.value)} disabled={readOnly} aria-label={t.payType}>
                    {["monthly", "daily", "hourly"].map((k) => (
                      <option key={k} value={k}>
                        {t.payTypes[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="at-pay-break">
                  <span>
                    <small>{t.col.base}</small>
                    <b>{money(r.base, cur)}</b>
                  </span>
                  <span className={minus ? "bad" : ""}>
                    <small>{t.col.minus}</small>
                    <b>{minus ? `−${money(minus, cur)}` : "—"}</b>
                  </span>
                  <span className={plus ? "good" : ""}>
                    <small>{t.col.plus}</small>
                    <b>{plus ? `+${money(plus, cur)}` : "—"}</b>
                  </span>
                  <span className={r.adj_total < 0 ? "bad" : r.adj_total > 0 ? "good" : ""}>
                    <small>{t.col.adj}</small>
                    <b>{r.adj_total ? `${r.adj_total > 0 ? "+" : "−"}${money(Math.abs(r.adj_total), cur)}` : "—"}</b>
                  </span>
                </div>
                <div className="at-pay-net">
                  <small>{t.col.net}</small>
                  <b>{money(r.net, cur)}</b>
                  {r.kh && (
                    <span className="at-kh-lines">
                      {t.kGross} {money(r.kh.gross, cur)}
                      {r.kh.seniority > 0 && ` · ${t.kSeniority} +${money(r.kh.seniority, cur)}`}
                      {r.kh.pension_ee > 0 && ` · NSSF −${money(r.kh.pension_ee, cur)}`}
                      {r.kh.tax > 0 && ` · ${t.kTax} −${money(r.kh.tax, cur)}`}
                    </span>
                  )}
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setSlip(r.staff._id)}>
                    <FileText size={14} /> {t.payslip}
                  </button>
                </div>
                <div className="at-pay-lines">
                  {r.reward > 0 && (
                    <span className="at-pay-line good">
                      <b>+{money(r.reward, cur)}</b> 🏆 {lang === "km" ? "ខែល្អឥតខ្ចោះ" : "Perfect month"}
                    </span>
                  )}
                  {r.adjustments.map((x) => (
                    <span key={x._id} className={`at-pay-line ${x.amount < 0 ? "bad" : "good"}`}>
                      <b>
                        {x.amount < 0 ? "−" : "+"}
                        {money(Math.abs(x.amount), cur)}
                      </b>{" "}
                      {x.label}
                      {!readOnly && (
                        <button type="button" onClick={() => removeLine(x._id)} aria-label={t.remove} title={t.remove}>
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))}
                  {!readOnly && (
                    <>
                      <button type="button" className="at-pay-add good" onClick={() => setAdjusting({ row: r, kind: "bonus" })}>
                        <Plus size={13} /> {t.addBonus}
                      </button>
                      <button type="button" className="at-pay-add bad" onClick={() => setAdjusting({ row: r, kind: "deduct" })}>
                        <Minus size={13} /> {t.addDeduct}
                      </button>
                    </>
                  )}
                </div>
                <div className="at-pay-facts">
                  {facts.map((f) => (
                    <span key={f}>{f}</span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {slip && data && <Payslip ctx={ctx} t={t} month={month} row={data.rows.find((r) => r.staff._id === slip)} cur={cur} onClose={() => setSlip(null)} onChanged={load} />}
      {adjusting && (
        <AdjustModal
          ctx={ctx}
          t={t}
          month={month}
          cur={cur}
          {...adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={() => {
            setAdjusting(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// add a bonus (+) or a deduction (−) with its reason
function AdjustModal({ ctx, t, month, cur, row, kind, onClose, onSaved }) {
  const deduct = kind === "deduct";
  const [f, setF] = useState({ amount: "", label: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const presets = deduct ? t.deductPresets : t.bonusPresets;
  const submit = async (e) => {
    e.preventDefault();
    const n = Math.abs(Number(f.amount));
    if (!n) return setError(t.needAmount);
    if (!f.label.trim()) return setError(t.needReason);
    setBusy(true);
    setError("");
    try {
      await attendanceService.addAdjust(ctx.id, { staff_id: row.staff._id, month, label: f.label.trim(), amount: deduct ? -n : n });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`${deduct ? t.deductTitle : t.bonusTitle} · ${row.staff.name}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {t.cancel}
          </button>
          <button type="submit" form="at-adj" className={`md-btn ${deduct ? "md-btn-danger" : "md-btn-primary"}`} disabled={busy}>
            {busy ? t.saving : deduct ? t.addDeduct : t.addBonus}
          </button>
        </>
      }
    >
      <form id="at-adj" className="md-fields" onSubmit={submit}>
        <Field label={`${t.amount} (${cur === "KHR" ? "៛" : "$"})`} htmlFor="adj-amount">
          <div className={`at-amount ${deduct ? "bad" : "good"}`}>
            <span>{deduct ? "−" : "+"}</span>
            <input id="adj-amount" type="number" min={0} step="any" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} autoFocus />
          </div>
        </Field>
        <Field label={t.reason} htmlFor="adj-reason">
          <input id="adj-reason" maxLength={60} placeholder={deduct ? t.deductPh : t.bonusPh} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        </Field>
        <div className="at-presets">
          {presets.map((p) => (
            <button key={p} type="button" className={f.label === p ? "on" : ""} onClick={() => setF({ ...f, label: p })}>
              {p}
            </button>
          ))}
        </div>
        <p className="rs-muted" style={{ margin: 0 }}>
          {t.adjNote.replace("{month}", monthName(month, ctx.lang))}
        </p>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

function Payslip({ ctx, t, month, row, cur, onClose, onChanged }) {
  const { lang, readOnly } = ctx;
  const [f, setF] = useState({ label: "", amount: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(null);
  if (!row) return null;
  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await attendanceService.addAdjust(ctx.id, { staff_id: row.staff._id, month, label: f.label, amount: Number(f.amount) });
      setF({ label: "", amount: "" });
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (aid) => {
    setBusy(true);
    try {
      await attendanceService.removeAdjust(ctx.id, aid);
      await onChanged();
    } finally {
      setBusy(false);
    }
  };
  const print = () => {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${t.payslip}</title><style>body{font-family:system-ui,"Kantumruy Pro",sans-serif;padding:32px;color:#111}table{width:100%;border-collapse:collapse}td{padding:8px 4px;border-bottom:1px solid #ddd}td:last-child{text-align:right}h1{margin:0 0 4px}small{color:#666}.net td{font-weight:800;font-size:18px;border-top:2px solid #111}</style></head><body>${ref.current.innerHTML}</body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };
  const L = (k, n) => t.br[k].replace("{n}", n).replace("{t}", hm(n));
  const lines = [
    [t.br.base, row.base, ""],
    row.absent_ded ? [L("absent", row.absent_days), -row.absent_ded, "bad"] : null,
    row.late_ded ? [L("late", row.late_min), -row.late_ded, "bad"] : null,
    row.unpaid_ded ? [L("unpaid", row.unpaid_days), -row.unpaid_ded, "bad"] : null,
    row.ot_pay ? [L("ot", row.ot_min), row.ot_pay, "blue"] : null,
    row.extra_pay ? [L("extra", row.extra_days), row.extra_pay, "blue"] : null,
    ...row.adjustments.map((x) => [x.label, x.amount, x.amount < 0 ? "bad" : "ok", x._id]),
    row.reward ? [`🏆 ${lang === "km" ? "ប្រាក់រង្វាន់ខែល្អឥតខ្ចោះ" : "Perfect month bonus"}`, row.reward, "ok"] : null,
    row.paid_leave_pay ? [t.br.paidLeave.replace("{n}", row.paid_leave_days), row.paid_leave_pay, "ok"] : null,
    row.kh?.seniority ? [t.kSeniority, row.kh.seniority, "ok"] : null,
    row.kh?.pension_ee ? ["NSSF", -row.kh.pension_ee, "bad"] : null,
    row.kh?.tax ? [t.kTax, -row.kh.tax, "bad"] : null,
  ].filter(Boolean);
  return (
    <Modal
      title={t.payslip}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={print}>
            <Printer size={15} /> {t.print}
          </button>
        </>
      }
    >
      <div ref={ref} className="at-slip">
        <h1>{ctx.data.business.name}</h1>
        <small>
          {t.payslip} · {monthName(month, lang)}
        </small>
        <p>
          <b>{row.staff.name}</b>
          {row.staff.position ? ` · ${row.staff.position}` : ""}
          <br />
          <small>{t.br.daily.replace("{v}", money(row.daily_rate, cur)).replace("{h}", money(row.hourly_rate, cur)).replace("{d}", row.work_days)}</small>
          {row.paid_leave_days > 0 && (
            <>
              <br />
              <small>{t.br.paidLeave.replace("{n}", row.paid_leave_days)}</small>
            </>
          )}
        </p>
        <table>
          <tbody>
            {lines.map(([label, v, cls, aid], i) => (
              <tr key={i} className={cls}>
                <td>{label}</td>
                <td>
                  {v < 0 ? "−" : i ? "+" : ""}
                  {money(Math.abs(v), cur)}
                  {aid && !readOnly && (
                    <button type="button" className="md-icon-btn md-icon-btn-danger at-slip-x" onClick={() => remove(aid)} aria-label={t.remove}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            <tr className="net">
              <td>{t.br.net}</td>
              <td>{money(row.net, cur)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <form className="at-adj" onSubmit={add}>
          <b>{t.lines}</b>
          <div>
            <input placeholder={t.labelPh} maxLength={60} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} aria-label={t.label} />
            <input type="number" step="any" placeholder={t.amount} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} aria-label={t.amount} />
            <button type="submit" className="md-btn md-btn-primary sa-btn-sm" disabled={busy || !f.label.trim() || !Number(f.amount)}>
              <Plus size={14} /> {t.add}
            </button>
          </div>
          <small className="rs-muted">{t.amountHint}</small>
          {error && <div className="md-form-error">{error}</div>}
        </form>
      )}
    </Modal>
  );
}

// ============================ TELEGRAM ============================
export function TelegramTab({ ctx }) {
  const { lang, readOnly } = ctx;
  const t = T[lang] || T.en;
  const [st, setSt] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const poll = useRef(null);
  const load = useCallback(
    () =>
      attendanceService
        .telegram(ctx.id)
        .then((r) => {
          setSt(r.data);
          return r.data;
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const active = on(ctx, "att_telegram");
  useEffect(() => {
    if (active) load();
    return () => clearInterval(poll.current);
  }, [load, active]);
  if (!active) return <Locked ctx={ctx} addon="att_telegram" />;
  if (!st) return <ListSkeleton rows={3} />;

  const connect = async (group) => {
    const w = window.open("", "_blank");
    try {
      const r = await attendanceService.telegramLink(ctx.id);
      if (w) w.location.href = group ? r.data.group_url : r.data.url;
      else window.location.href = group ? r.data.group_url : r.data.url;
      setWaiting(true);
      let n = 0;
      clearInterval(poll.current);
      poll.current = setInterval(async () => {
        n += 1;
        const d = await load();
        if (d?.connected || n > 60) {
          clearInterval(poll.current);
          setWaiting(false);
        }
      }, 3000);
    } catch (e) {
      w?.close();
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const save = async (patch) => {
    setSt((x) => ({ ...x, ...patch }));
    try {
      setSt((await attendanceService.saveTelegram(ctx.id, patch)).data);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
      load();
    }
  };
  const test = async () => {
    setBusy(true);
    try {
      await attendanceService.testTelegram(ctx.id);
      ctx.notify({ type: "success", text: t.sent });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const disconnect = async () => {
    setBusy(true);
    try {
      setSt((await attendanceService.disconnectTelegram(ctx.id)).data);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rs-col">
      <section className="panel-card at-tg">
        <span className={`at-tg-ic ${st.connected ? "on" : ""}`}>
          <Send size={26} />
        </span>
        <div className="at-tg-text">
          <h2>{ctx.a.tabs.telegram}</h2>
          <p className="rs-muted">{t.tgSub}</p>
          {!st.configured && <div className="md-form-error">{t.notConfigured}</div>}
          {st.connected ? (
            <p className="at-tg-on">
              <Check size={16} /> {t.connected.replace("{name}", st.chat_name)}
            </p>
          ) : (
            <p className="rs-muted">{waiting ? t.waiting : t.notConnected}</p>
          )}
          <div className="at-link-btns">
            {!st.connected ? (
              <>
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => connect(false)} disabled={readOnly || !st.configured}>
                  {waiting ? <Loader2 size={15} className="md-spin" /> : <Send size={15} />} {t.connect}
                </button>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => connect(true)} disabled={readOnly || !st.configured}>
                  {t.connectGroup}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={test} disabled={busy}>
                  <Send size={15} /> {t.test}
                </button>
                <button type="button" className="md-btn md-btn-ghost sa-danger-text sa-btn-sm" onClick={disconnect} disabled={busy || readOnly}>
                  <Unplug size={15} /> {t.disconnect}
                </button>
              </>
            )}
          </div>
        </div>
      </section>
      <section className="panel-card at-tg-set">
        <div className="at-tg-row">
          <Switch checked={st.daily_report} onChange={(v) => save({ daily_report: v })} label={t.dailyReport} disabled={readOnly} />
          <label className="at-tg-time">
            {t.at}
            <input type="time" value={st.report_time} onChange={(e) => e.target.value && save({ report_time: e.target.value })} disabled={readOnly || !st.daily_report} />
          </label>
        </div>
        <Switch checked={st.late_alert} onChange={(v) => save({ late_alert: v })} label={t.lateAlert} disabled={readOnly} />
        <Switch checked={st.review_alert} onChange={(v) => save({ review_alert: v })} label={t.reviewAlert} disabled={readOnly} />
        <Switch checked={st.leave_alert} onChange={(v) => save({ leave_alert: v })} label={t.leaveAlert} disabled={readOnly} />
        <Switch checked={st.out_alert} onChange={(v) => save({ out_alert: v })} label={t.outAlert} disabled={readOnly} />
        <Switch checked={st.fix_alert} onChange={(v) => save({ fix_alert: v })} label={t.fixAlert} disabled={readOnly} />
        <Switch checked={st.monthly} onChange={(v) => save({ monthly: v })} label={t.monthly} disabled={readOnly} />
      </section>
    </div>
  );
}

// ============================ DOOR KIOSK ============================
// the kiosk link as a QR: the BizHub POS app on the tablet scans it to link itself
function KioskLinkQr({ link, note }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    import("qrcode")
      .then((m) => (m.default || m).toDataURL(link, { width: 360, margin: 1, errorCorrectionLevel: "M" }))
      .then((u) => alive && setSrc(u))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [link]);
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", margin: "10px 0" }}>
      {src ? <img src={src} alt="QR" width={120} height={120} style={{ borderRadius: 10, background: "#fff", padding: 6, border: "1px solid var(--line, #e5e7eb)" }} /> : <Loader2 size={20} className="spin" />}
      <small className="rs-muted">{note}</small>
    </div>
  );
}

export function KioskTab({ ctx }) {
  const { lang, readOnly } = ctx;
  const t = T[lang] || T.en;
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState("");
  const load = useCallback(
    () =>
      attendanceService
        .kiosk(ctx.id)
        .then((r) => setData(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const active = on(ctx, "att_kiosk");
  useEffect(() => {
    if (active) load();
  }, [load, active]);
  if (!active)
    return (
      <div className="rs-col">
        <Locked ctx={ctx} addon="att_kiosk" />
        <LooksTab ctx={ctx} only="kiosk" />
      </div>
    );
  if (!data) return <ListSkeleton rows={2} />;
  const linkOf = (b) => `${PUBLIC_SITE_URL}/k/${b.token}`;
  const copy = async (b) => {
    try {
      await navigator.clipboard.writeText(linkOf(b));
      setCopied(b._id);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* blocked */
    }
  };
  const reset = async (b) => {
    try {
      await attendanceService.resetKiosk(ctx.id, b._id);
      load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  return (
    <div className="rs-col">
      <section className="panel-card">
        <h2 style={{ margin: 0 }}>{ctx.a.tabs.kiosk}</h2>
        <p className="rs-muted" style={{ margin: "6px 0 8px" }}>
          {t.kioskSub}
        </p>
        <p className="at-warn-line">{t.kioskWarn}</p>
      </section>
      {data.branches.map((b) => (
        <section key={b._id} className={`panel-card at-kiosk ${b.active ? "" : "off"}`}>
          <div className="at-kiosk-head">
            <b>{b.name}</b>
            {!b.active && <span className="rs-pill">{t.off}</span>}
          </div>
          <div className="at-link-box">
            <code>{linkOf(b)}</code>
          </div>
          <KioskLinkQr link={linkOf(b)} note={t.kioskAppQr} />
          <div className="at-link-btns">
            <a className="md-btn md-btn-primary sa-btn-sm" href={linkOf(b)} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> {t.open}
            </a>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => copy(b)}>
              {copied === b._id ? <Check size={15} /> : <Copy size={15} />} {copied === b._id ? t.copied : t.copy}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => reset(b)} disabled={readOnly}>
              <RefreshCw size={15} /> {t.newLink}
            </button>
          </div>
        </section>
      ))}
      <LooksTab ctx={ctx} only="kiosk" />
    </div>
  );
}
