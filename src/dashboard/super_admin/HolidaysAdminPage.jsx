import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, CalendarHeart, CalendarPlus, Plus, Save, Trash2 } from "lucide-react";
import "../admin/master_data/masterdata.css";
import "./super-admin.css";
import { holidayAdminService } from "../../api/services";
import { useI18n } from "../../i18n/I18nProvider";
import { PageSkeleton } from "../../components/skeleton/Skeleton";
import { useNotice } from "./parts";

const TEXT = {
  en: {
    sub: "Cambodia's national holidays for each year. This year's list is free for every company; next year's is sold (Attendance → Holidays, price in Prices). When the government publishes a new sub-decree, type the days here — every company that has that year gets them at once.",
    free: "Free (this year)",
    onSale: "On sale",
    notYet: "Not on sale yet",
    past: "Past",
    days: "{n} days",
    official: "Official",
    draft: "Draft — fixed days only",
    buyers: "{n} bought",
    using: "{n} companies have it",
    date: "Date",
    en: "Name (English)",
    km: "Name (Khmer)",
    addRow: "Add a day",
    fixed: "Add the fixed days",
    fixedHint:
      "New Year, Victory Day, Women's Day, Khmer New Year (14–16 Apr, check it), Labour Day, King's / Queen Mother's birthdays, Constitution, King Father, Coronation, Independence and Peace days. The moon-calendar days (Visak Bochea, Royal Ploughing, Pchum Ben, Water Festival) come with the sub-decree.",
    isOfficial: "This is the official list (from the sub-decree)",
    officialHint: "Before it's official, next year is still on sale with the days known so far; buyers get the rest automatically when you add them.",
    save: "Save and update companies",
    saving: "Saving…",
    saved: "Saved · {n} companies updated.",
    empty: "No days yet. Add the fixed days, then the moon-calendar days when the government announces them.",
    remove: "Remove",
  },
  km: {
    sub: "ថ្ងៃឈប់សម្រាកជាតិកម្ពុជាប្រចាំឆ្នាំ។ បញ្ជីឆ្នាំនេះឥតគិតថ្លៃសម្រាប់គ្រប់ក្រុមហ៊ុន បញ្ជីឆ្នាំក្រោយត្រូវទិញ (វត្តមាន → ថ្ងៃឈប់សម្រាក តម្លៃនៅ តម្លៃ)។ ពេលរដ្ឋាភិបាលចេញអនុក្រឹត្យថ្មី សូមបញ្ចូលថ្ងៃនៅទីនេះ — ក្រុមហ៊ុនដែលមានឆ្នាំនោះ ទទួលបានភ្លាមៗ។",
    free: "ឥតគិតថ្លៃ (ឆ្នាំនេះ)",
    onSale: "កំពុងលក់",
    notYet: "មិនទាន់លក់",
    past: "កន្លងផុត",
    days: "{n} ថ្ងៃ",
    official: "ផ្លូវការ",
    draft: "ព្រាង — តែថ្ងៃថេរ",
    buyers: "ទិញ {n}",
    using: "ក្រុមហ៊ុន {n} មាន",
    date: "កាលបរិច្ឆេទ",
    en: "ឈ្មោះ (អង់គ្លេស)",
    km: "ឈ្មោះ (ខ្មែរ)",
    addRow: "បន្ថែមថ្ងៃ",
    fixed: "បន្ថែមថ្ងៃថេរ",
    fixedHint:
      "ចូលឆ្នាំសកល ៧មករា នារី ចូលឆ្នាំខ្មែរ (១៤–១៦ មេសា ពិនិត្យផង) ពលកម្ម ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម រដ្ឋធម្មនុញ្ញ ព្រះបរមរតនកោដ្ឋ គ្រងរាជ្យ ឯករាជ្យ និងសន្តិភាព។ ថ្ងៃតាមចន្ទគតិ (វិសាខបូជា ច្រត់ព្រះនង្គ័ល ភ្ជុំបិណ្ឌ អុំទូក) មកជាមួយអនុក្រឹត្យ។",
    isOfficial: "នេះជាបញ្ជីផ្លូវការ (ពីអនុក្រឹត្យ)",
    officialHint: "មុនពេលផ្លូវការ ឆ្នាំក្រោយនៅតែលក់ជាមួយថ្ងៃដែលដឹងរួច អ្នកទិញទទួលថ្ងៃផ្សេងទៀតដោយស្វ័យប្រវត្តិ ពេលអ្នកបន្ថែម។",
    save: "រក្សាទុក និងធ្វើបច្ចុប្បន្នភាពក្រុមហ៊ុន",
    saving: "កំពុងរក្សាទុក…",
    saved: "បានរក្សាទុក · ក្រុមហ៊ុន {n} បានធ្វើបច្ចុប្បន្នភាព។",
    empty: "មិនទាន់មានថ្ងៃ។ បន្ថែមថ្ងៃថេរ បន្ទាប់មកថ្ងៃតាមចន្ទគតិ ពេលរដ្ឋាភិបាលប្រកាស។",
    remove: "លុប",
  },
};
// same fixed days as the API (attendance.days.js)
const fixedDays = (y) => [
  [`${y}-01-01`, "International New Year Day", "ទិវាចូលឆ្នាំសកល"],
  [`${y}-01-07`, "Victory over Genocide Day", "ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍"],
  [`${y}-03-08`, "International Women's Day", "ទិវានារីអន្តរជាតិ"],
  [`${y}-04-14`, "Khmer New Year", "បុណ្យចូលឆ្នាំខ្មែរ"],
  [`${y}-04-15`, "Khmer New Year", "បុណ្យចូលឆ្នាំខ្មែរ"],
  [`${y}-04-16`, "Khmer New Year", "បុណ្យចូលឆ្នាំខ្មែរ"],
  [`${y}-05-01`, "International Labour Day", "ទិវាពលកម្មអន្តរជាតិ"],
  [`${y}-05-14`, "King's Birthday", "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះមហាក្សត្រ"],
  [`${y}-06-18`, "Queen Mother's Birthday", "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះវររាជមាតា"],
  [`${y}-09-24`, "Constitution Day", "ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ"],
  [`${y}-10-15`, "King Father Commemoration Day", "ទិវាគោរពព្រះវិញ្ញាណក្ខន្ធ ព្រះបរមរតនកោដ្ឋ"],
  [`${y}-10-29`, "Coronation Day", "ព្រះរាជពិធីគ្រងព្រះបរមរាជសម្បត្តិ"],
  [`${y}-11-09`, "Independence Day", "ពិធីបុណ្យឯករាជ្យជាតិ"],
  [`${y}-12-29`, "Peace Day in Cambodia", "ទិវាសន្តិភាពនៅកម្ពុជា"],
];

// Super admin: Cambodia's national holiday list of each year (this year free, next year sold)
export default function HolidaysAdminPage() {
  const { lang } = useI18n();
  const t = TEXT[lang] || TEXT.en;
  const [notice, setNotice] = useNotice();
  const [years, setYears] = useState(null);
  const [thisYear, setThisYear] = useState(null);
  const [year, setYear] = useState(null);
  const [form, setForm] = useState(null); // { days: [{day,name,km}], official }
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    () =>
      holidayAdminService.years().then((r) => {
        setYears(r.data);
        setThisYear(r.this_year);
        return r;
      }),
    [],
  );
  useEffect(() => {
    load()
      .then((r) => setYear((y) => y ?? r.this_year + 1))
      .catch((e) => setNotice({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!years || year === null) return;
    const y = years.find((x) => x.year === year);
    if (y) setForm({ days: y.days.map((d) => ({ ...d })), official: y.official });
  }, [year, years]);

  if (!years || !form) return <PageSkeleton />;
  const info = years.find((x) => x.year === year);
  const status = (y) => (y.free ? (y.year === thisYear ? "free" : "past") : y.sellable ? "onSale" : "notYet");
  const setDay = (i, patch) => setForm((f) => ({ ...f, days: f.days.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));
  const addFixed = () =>
    setForm((f) => {
      const have = new Set(f.days.map((d) => d.day));
      const add = fixedDays(year)
        .filter(([d]) => !have.has(d))
        .map(([day, name, km]) => ({ day, name, km }));
      return { ...f, days: [...f.days, ...add].sort((a, b) => (a.day < b.day ? -1 : 1)) };
    });
  const save = async () => {
    setSaving(true);
    try {
      const r = await holidayAdminService.save(year, { days: form.days.filter((d) => d.day || d.name), official: form.official });
      setNotice({ type: "success", text: t.saved.replace("{n}", r.synced) });
      await load();
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="md-page sa-page">
      {notice}
      <p className="md-hint" style={{ margin: 0 }}>
        {t.sub}
      </p>
      <div className="ah-years">
        {years.map((y) => (
          <button key={y.year} type="button" className={`ah-year ${y.year === year ? "on" : ""} s-${status(y)}`} onClick={() => setYear(y.year)}>
            <b>{y.year}</b>
            <span className="ah-status">{t[status(y)]}</span>
            <small>
              {t.days.replace("{n}", y.days.length)} · {y.official ? t.official : t.draft}
            </small>
            {!y.free && <small>{t.buyers.replace("{n}", y.buyers)}</small>}
          </button>
        ))}
      </div>

      <div className="md-card ah-card">
        <div className="ah-head">
          <h2>
            <CalendarHeart size={20} /> {year}
          </h2>
          <span className={`rs-pill ${info?.official ? "on" : ""}`}>
            {info?.official && <BadgeCheck size={12} />} {info?.official ? t.official : t.draft}
          </span>
          <span className="md-hint">{t.using.replace("{n}", info?.using || 0)}</span>
        </div>
        {form.days.length === 0 && <p className="md-hint">{t.empty}</p>}
        {form.days.length > 0 && (
          <div className="md-table-scroll">
            <table className="md-table ah-table">
              <thead>
                <tr>
                  <th>{t.date}</th>
                  <th>{t.en}</th>
                  <th>{t.km}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {form.days.map((d, i) => (
                  <tr key={i}>
                    <td>
                      <input type="date" value={d.day} min={`${year}-01-01`} max={`${year}-12-31`} onChange={(e) => setDay(i, { day: e.target.value })} />
                    </td>
                    <td>
                      <input value={d.name} maxLength={80} onChange={(e) => setDay(i, { name: e.target.value })} />
                    </td>
                    <td>
                      <input value={d.km} maxLength={120} onChange={(e) => setDay(i, { km: e.target.value })} />
                    </td>
                    <td>
                      <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => setForm((f) => ({ ...f, days: f.days.filter((_, j) => j !== i) }))} aria-label={t.remove} title={t.remove}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="ah-tools">
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setForm((f) => ({ ...f, days: [...f.days, { day: "", name: "", km: "" }] }))}>
            <Plus size={15} /> {t.addRow}
          </button>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={addFixed} title={t.fixedHint}>
            <CalendarPlus size={15} /> {t.fixed}
          </button>
        </div>
        <p className="md-hint" style={{ margin: "4px 0 0" }}>
          {t.fixedHint}
        </p>
        <label className="md-switch" style={{ marginTop: 14 }}>
          <input type="checkbox" checked={form.official} onChange={(e) => setForm((f) => ({ ...f, official: e.target.checked }))} />
          <span className="md-switch-track" />
          <span>
            <b>{t.isOfficial}</b>
            <small className="md-hint" style={{ display: "block" }}>
              {t.officialHint}
            </small>
          </span>
        </label>
        <div className="ah-save">
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={saving}>
            <Save size={16} /> {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
