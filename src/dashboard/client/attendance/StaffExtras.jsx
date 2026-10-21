import { useCallback, useEffect, useRef, useState } from "react";
import { Cake, FileText, FolderLock, ImagePlus, Loader2, Trash2, UserCog, X } from "lucide-react";
import { attendanceService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import { Field } from "../restaurant/parts";

// Staff profile (free), documents (att_docs), manager note (att_manager) and HR reminders on the Today tab
const T = {
  en: {
    profile: "Profile & HR",
    startDate: "Start date",
    birthday: "Birthday",
    contractEnd: "Contract ends",
    idNumber: "ID card number",
    address: "Address",
    emergency: "Emergency contact",
    emergencyPhone: "Emergency phone",
    notes: "Notes (only you see them)",
    contractHint: "You get a reminder 30 days before.",
    managerOn: "Managers see their team in the staff app and approve leave, forgotten clock-ins, overtime and records to check — for staff in their branches.",
    managerOff: "With “Manager login”, this person can approve requests for their team from their phone.",
    unlock: "Unlock · {coins}",
    docs: "Documents",
    docsSub: "Photos of the contract, ID card, certificates… Only you can see them.",
    docsLocked: "Keep contracts, ID cards and certificates for each staff, with reminders before they run out.",
    add: "Add photo",
    kinds: { contract: "Contract", id_card: "ID card", certificate: "Certificate", other: "Other" },
    name: "Name",
    expires: "Ends on",
    noEnd: "No end date",
    noDocs: "No documents yet.",
    uploading: "Uploading…",
    remove: "Remove",
    sure: "Remove?",
    expired: "Ended",
    hrTitle: "Reminders",
    hrBirthday: "Birthday {when}",
    hrContract: "Contract ends {when}",
    hrContractPast: "Contract ended {ago}",
    hrDoc: "{name} runs out {when}",
    hrDocPast: "{name} ran out {ago}",
    today: "today",
    tomorrow: "tomorrow",
    inDays: "in {n} days",
    daysAgo: "{n} days ago",
    turns: "turns {age}",
  },
  km: {
    profile: "ប្រវត្តិរូប & HR",
    startDate: "ថ្ងៃចូលធ្វើការ",
    birthday: "ថ្ងៃកំណើត",
    contractEnd: "កិច្ចសន្យាផុតកំណត់",
    idNumber: "លេខអត្តសញ្ញាណប័ណ្ណ",
    address: "អាសយដ្ឋាន",
    emergency: "អ្នកទំនាក់ទំនងបន្ទាន់",
    emergencyPhone: "ទូរស័ព្ទបន្ទាន់",
    notes: "កំណត់ចំណាំ (មានតែអ្នកឃើញ)",
    contractHint: "អ្នកទទួលការរំលឹក 30 ថ្ងៃមុន។",
    managerOn: "អ្នកគ្រប់គ្រងឃើញក្រុមរបស់គេក្នុងកម្មវិធីបុគ្គលិក ហើយអនុម័តច្បាប់ឈប់ ភ្លេចស្កេន ម៉ោងបន្ថែម និងកំណត់ត្រាដែលត្រូវពិនិត្យ — សម្រាប់បុគ្គលិកក្នុងសាខារបស់គេ។",
    managerOff: "ជាមួយ “អ្នកគ្រប់គ្រងក្នុងកម្មវិធី” បុគ្គលិកនេះអាចអនុម័តសំណើរបស់ក្រុមពីទូរស័ព្ទ។",
    unlock: "ដោះសោ · {coins}",
    docs: "ឯកសារ",
    docsSub: "រូបថតកិច្ចសន្យា អត្តសញ្ញាណប័ណ្ណ វិញ្ញាបនបត្រ… មានតែអ្នកឃើញ។",
    docsLocked: "រក្សាទុកកិច្ចសន្យា អត្តសញ្ញាណប័ណ្ណ និងវិញ្ញាបនបត្ររបស់បុគ្គលិកម្នាក់ៗ មានការរំលឹកមុនផុតកំណត់។",
    add: "បន្ថែមរូប",
    kinds: { contract: "កិច្ចសន្យា", id_card: "អត្តសញ្ញាណប័ណ្ណ", certificate: "វិញ្ញាបនបត្រ", other: "ផ្សេងៗ" },
    name: "ឈ្មោះ",
    expires: "ផុតកំណត់ថ្ងៃ",
    noEnd: "គ្មានថ្ងៃផុតកំណត់",
    noDocs: "មិនទាន់មានឯកសារ។",
    uploading: "កំពុងផ្ទុក…",
    remove: "លុប",
    sure: "លុបមែន?",
    expired: "ផុតកំណត់",
    hrTitle: "ការរំលឹក",
    hrBirthday: "ខួបកំណើត {when}",
    hrContract: "កិច្ចសន្យាផុតកំណត់ {when}",
    hrContractPast: "កិច្ចសន្យាផុតកំណត់ {ago}",
    hrDoc: "{name} ផុតកំណត់ {when}",
    hrDocPast: "{name} ផុតកំណត់ {ago}",
    today: "ថ្ងៃនេះ",
    tomorrow: "ថ្ងៃស្អែក",
    inDays: "ក្នុង {n} ថ្ងៃទៀត",
    daysAgo: "{n} ថ្ងៃមុន",
    turns: "អាយុ {age}",
  },
};
const tx = (lang) => T[lang] || T.en;
const fmtNum = (n) => Number(n || 0).toLocaleString("en-US");
const todayKH = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const fmtDay = (day, lang) => (day ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`)) : "");

// the profile fields inside the staff form (state lives in the form)
export function ProfileFields({ lang, f, setF }) {
  const t = tx(lang);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="md-fields-grid at-more">
      <Field label={t.startDate} htmlFor="as-start">
        <input id="as-start" type="date" value={f.start_date} onChange={set("start_date")} />
      </Field>
      <Field label={t.birthday} htmlFor="as-bday">
        <input id="as-bday" type="date" value={f.birthday} onChange={set("birthday")} />
      </Field>
      <Field label={t.contractEnd} htmlFor="as-cend" hint={t.contractHint}>
        <input id="as-cend" type="date" value={f.contract_end} onChange={set("contract_end")} />
      </Field>
      <Field label={t.idNumber} htmlFor="as-idn">
        <input id="as-idn" maxLength={40} value={f.id_number} onChange={set("id_number")} />
      </Field>
      <Field label={t.emergency} htmlFor="as-emn">
        <input id="as-emn" maxLength={80} value={f.emergency_name} onChange={set("emergency_name")} />
      </Field>
      <Field label={t.emergencyPhone} htmlFor="as-emp">
        <input id="as-emp" type="tel" maxLength={30} value={f.emergency_phone} onChange={set("emergency_phone")} />
      </Field>
      <Field label={t.address} htmlFor="as-addr">
        <input id="as-addr" maxLength={200} value={f.address} onChange={set("address")} />
      </Field>
      <Field label={t.notes} htmlFor="as-notes">
        <textarea id="as-notes" rows={2} maxLength={500} value={f.notes} onChange={set("notes")} />
      </Field>
    </div>
  );
}
export const PROFILE_KEYS = ["start_date", "birthday", "contract_end", "id_number", "address", "emergency_name", "emergency_phone", "notes"];

// under the role picker: what a manager can do (or unlock it)
export function ManagerNote({ ctx }) {
  const t = tx(ctx.lang);
  const on = !!ctx.data.addons?.att_manager?.active;
  return (
    <div className={`at-mgr-note ${on ? "on" : ""}`}>
      <UserCog size={16} />
      <span>{on ? t.managerOn : t.managerOff}</span>
      {!on && (
        <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "att_manager" })} disabled={ctx.readOnly}>
          <CoinIcon size={14} /> {t.unlock.replace("{coins}", fmtNum(ctx.data.addons?.att_manager?.price ?? 40))}
        </button>
      )}
    </div>
  );
}

// documents of one staff (inside the staff form)
export function StaffDocs({ ctx, staffId }) {
  const t = tx(ctx.lang);
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null); // { file, preview, kind, name, expires }
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(null);
  const [view, setView] = useState(null);
  const pick = useRef(null);
  const load = useCallback(
    () =>
      attendanceService.docs
        .list(ctx.id, staffId)
        .then((r) => setData(r.data))
        .catch(() => setData({ on: false, rows: [] })),
    [ctx.id, staffId],
  );
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => () => draft?.preview && URL.revokeObjectURL(draft.preview), [draft]);
  const on = data?.on;
  const today = todayKH();

  const choose = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setDraft({ file, preview: URL.createObjectURL(file), kind: "contract", name: "", expires: "" });
  };
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "att_docs" });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const upload = () =>
    run(async () => {
      await attendanceService.docs.add(ctx.id, staffId, draft.file, { kind: draft.kind, name: draft.name || t.kinds[draft.kind], expires: draft.expires });
      setDraft(null);
    });

  return (
    <div className="at-docs">
      <div className="at-docs-head">
        <b>
          <FolderLock size={16} /> {t.docs}
        </b>
        {on && !draft && (data?.rows.length || 0) < (data?.max || 20) && (
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => pick.current?.click()} disabled={busy || ctx.readOnly}>
            <ImagePlus size={14} /> {t.add}
          </button>
        )}
        <input ref={pick} type="file" accept="image/*" hidden onChange={choose} />
      </div>
      {!data ? (
        <small className="rs-muted">…</small>
      ) : !on && !data.rows.length ? (
        <div className="at-mgr-note">
          <FileText size={16} />
          <span>{t.docsLocked}</span>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "att_docs" })} disabled={ctx.readOnly}>
            <CoinIcon size={14} /> {t.unlock.replace("{coins}", fmtNum(ctx.data.addons?.att_docs?.price ?? 35))}
          </button>
        </div>
      ) : (
        <>
          <small className="rs-muted">{t.docsSub}</small>
          {draft && (
            <div className="at-doc-draft">
              <img src={draft.preview} alt="" />
              <div className="at-doc-draft-f">
                <div className="at-seg small">
                  {Object.keys(t.kinds).map((k) => (
                    <button key={k} type="button" className={draft.kind === k ? "on" : ""} onClick={() => setDraft({ ...draft, kind: k })}>
                      {t.kinds[k]}
                    </button>
                  ))}
                </div>
                <input maxLength={80} placeholder={`${t.name} · ${t.kinds[draft.kind]}`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label={t.name} />
                <label className="at-doc-exp">
                  <small>{t.expires}</small>
                  <input type="date" value={draft.expires} onChange={(e) => setDraft({ ...draft, expires: e.target.value })} />
                </label>
                <div className="at-doc-actions">
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setDraft(null)} disabled={busy}>
                    <X size={14} />
                  </button>
                  <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={upload} disabled={busy}>
                    {busy ? <Loader2 size={14} className="md-spin" /> : <ImagePlus size={14} />} {busy ? t.uploading : t.add}
                  </button>
                </div>
              </div>
            </div>
          )}
          {!data.rows.length && !draft && <small className="rs-muted">{t.noDocs}</small>}
          <div className="at-doc-list">
            {data.rows.map((d) => {
              const past = d.expires && d.expires < today;
              const soon = d.expires && !past && d.expires <= addDays(today, 30);
              return (
                <div key={d._id} className="at-doc">
                  <button type="button" className="at-doc-thumb" onClick={() => setView(d)} aria-label={d.name}>
                    <img src={d.url} alt="" loading="lazy" />
                  </button>
                  <span className="at-doc-text">
                    <b>{d.name || t.kinds[d.kind]}</b>
                    <small>
                      {t.kinds[d.kind]} · <span className={past ? "bad" : soon ? "warn" : ""}>{d.expires ? `${past ? t.expired : t.expires} ${fmtDay(d.expires, ctx.lang)}` : t.noEnd}</span>
                    </small>
                  </span>
                  {sure === d._id ? (
                    <button type="button" className="md-btn md-btn-danger sa-btn-sm" onClick={() => run(() => attendanceService.docs.remove(ctx.id, staffId, d._id))} onBlur={() => setSure(null)} autoFocus disabled={busy}>
                      {t.sure}
                    </button>
                  ) : (
                    <button type="button" className="md-icon-btn" onClick={() => setSure(d._id)} aria-label={t.remove} disabled={busy || ctx.readOnly}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      {view && (
        <div className="at-doc-view" role="dialog" onClick={() => setView(null)}>
          <img src={view.url} alt={view.name} />
          <span>
            {view.name || t.kinds[view.kind]} <X size={18} />
          </span>
        </div>
      )}
    </div>
  );
}
const addDays = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

// HR reminders card for the Today tab (hidden when empty)
export function HrCard({ ctx }) {
  const t = tx(ctx.lang);
  const [items, setItems] = useState([]);
  useEffect(() => {
    attendanceService
      .hr(ctx.id)
      .then((r) => setItems(r.data.items || []))
      .catch(() => {});
  }, [ctx.id, ctx.data.staff]);
  if (!items.length) return null;
  const when = (n) => (n === 0 ? t.today : n === 1 ? t.tomorrow : t.inDays.replace("{n}", n));
  const ago = (n) => t.daysAgo.replace("{n}", -n);
  return (
    <section className="panel-card at-hr">
      <h3>{t.hrTitle}</h3>
      {items.map((i, k) => {
        const past = i.in_days < 0;
        const label =
          i.type === "birthday"
            ? `${t.hrBirthday.replace("{when}", when(i.in_days))} · ${t.turns.replace("{age}", i.age)}`
            : i.type === "contract"
              ? past
                ? t.hrContractPast.replace("{ago}", ago(i.in_days))
                : t.hrContract.replace("{when}", when(i.in_days))
              : (past ? t.hrDocPast.replace("{ago}", ago(i.in_days)) : t.hrDoc.replace("{when}", when(i.in_days))).replace("{name}", i.name || t.kinds[i.kind]);
        const Icon = i.type === "birthday" ? Cake : FileText;
        return (
          <button key={k} type="button" className={`at-hr-row ${past ? "bad" : i.in_days <= 7 ? "warn" : ""} ${i.type}`} onClick={() => ctx.go("staff")}>
            <Icon size={16} />
            <b>{i.staff_name}</b>
            <span>{label}</span>
            <small>{fmtDay(i.day, ctx.lang)}</small>
          </button>
        );
      })}
    </section>
  );
}
