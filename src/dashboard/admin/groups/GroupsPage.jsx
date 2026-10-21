import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FolderPlus, Layers, RotateCcw, Trash2 } from "lucide-react";
import "../master_data/masterdata.css";
import "../../client/namecard/namecard-editor.css";
import "../prices/prices.css";
import "./groups.css";
import { useI18n } from "../../../i18n/I18nProvider";
import { homepageService } from "../../../api/services";
import { DEFAULT_HOMEPAGE } from "../../../homepage/defaults";
import { HERO_ICONS, SERVICE_DETAILS, SERVICE_ORDER } from "../../../homepage/content";
import { setHomepageCache } from "../../../homepage/useHomepageData";
import PathIcon from "../../../components/PathIcon";
import { PageSkeleton } from "../../../components/skeleton/Skeleton";

const TEXT = {
  en: {
    sub: "Which group each service is in. Used for the tabs on the website and the list in “Add business” (website + app).",
    preview: "On the website",
    all: "All",
    nameEn: "Name (English)",
    nameKm: "Name (Khmer)",
    services: "{n} services",
    service1: "1 service",
    empty: "No services yet — move one here from another group.",
    moveTo: "Move to",
    noGroup: "No group",
    loose: "Not in a group",
    looseSub: "Shown under “More” at the end.",
    addGroup: "Add group",
    newGroup: "New group",
    up: "Move up",
    down: "Move down",
    remove: "Delete group",
    removeHint: "Its services go to “Not in a group”.",
    save: "Save groups",
    saving: "Saving…",
    saved: "Groups saved.",
    undo: "Undo changes",
    unsaved: "Unsaved changes",
    allSaved: "All saved",
    needName: "Every group needs a name in English and Khmer.",
  },
  km: {
    sub: "សេវាកម្មនីមួយៗនៅក្នុងក្រុមណា។ ប្រើសម្រាប់ផ្ទាំងលើគេហទំព័រ និងបញ្ជីក្នុង “បន្ថែមអាជីវកម្ម” (គេហទំព័រ + កម្មវិធី)។",
    preview: "លើគេហទំព័រ",
    all: "ទាំងអស់",
    nameEn: "ឈ្មោះ (អង់គ្លេស)",
    nameKm: "ឈ្មោះ (ខ្មែរ)",
    services: "សេវាកម្ម {n}",
    service1: "សេវាកម្ម 1",
    empty: "មិនទាន់មានសេវាកម្ម — ផ្លាស់ពីក្រុមផ្សេងមកទីនេះ។",
    moveTo: "ផ្លាស់ទៅ",
    noGroup: "គ្មានក្រុម",
    loose: "មិននៅក្នុងក្រុម",
    looseSub: "បង្ហាញក្រោម “ផ្សេងៗ” នៅខាងចុង។",
    addGroup: "បន្ថែមក្រុម",
    newGroup: "ក្រុមថ្មី",
    up: "ឡើងលើ",
    down: "ចុះក្រោម",
    remove: "លុបក្រុម",
    removeHint: "សេវាកម្មរបស់វាទៅ “មិននៅក្នុងក្រុម”។",
    save: "រក្សាទុកក្រុម",
    saving: "កំពុងរក្សាទុក…",
    saved: "បានរក្សាទុកក្រុម។",
    undo: "បោះបង់ការកែប្រែ",
    unsaved: "មានការកែប្រែមិនទាន់រក្សាទុក",
    allSaved: "បានរក្សាទុកទាំងអស់",
    needName: "ក្រុមនីមួយៗត្រូវការឈ្មោះ អង់គ្លេស និងខ្មែរ។",
  },
};

const copy = (v) => JSON.parse(JSON.stringify(v));
const move = (list, i, d) => {
  const next = [...list];
  const j = i + d;
  if (j < 0 || j >= next.length) return next;
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};
// the saved groups, without unknown services, each service in one group only
function clean(groups) {
  const used = new Set();
  return (groups || []).map((g) => ({ key: g.key, en: g.en || "", km: g.km || "", types: (g.types || []).filter((k) => SERVICE_ORDER.includes(k) && !used.has(k) && used.add(k)) }));
}

// Super admin → Business groups: services by group (website tabs + "Add business" list)
export default function GroupsPage() {
  const { lang } = useI18n();
  const p = TEXT[lang] || TEXT.en;
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [state, setState] = useState({ saving: false, error: "", ok: "" });

  useEffect(() => {
    homepageService
      .get()
      .then((res) => {
        const g = clean(res.data?.groups?.length ? res.data.groups : DEFAULT_HOMEPAGE.groups);
        setSaved(g);
        setForm(copy(g));
      })
      .catch((e) => setState({ saving: false, error: e.message, ok: "" }));
  }, []);

  const dirty = useMemo(() => !!form && JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  if (!form) return state.error ? <div className="md-notice md-notice-error">{state.error}</div> : <PageSkeleton />;

  const name = (k) => SERVICE_DETAILS[lang]?.[k]?.title || SERVICE_DETAILS.en[k]?.title || k;
  const used = new Set(form.flatMap((g) => g.types));
  const loose = SERVICE_ORDER.filter((k) => !used.has(k));
  const setGroup = (i, patch) => setForm(form.map((g, x) => (x === i ? { ...g, ...patch } : g)));
  // put a service in group `to` (-1 = no group), at the end
  const moveTo = (k, to) => setForm(form.map((g, x) => ({ ...g, types: x === to ? [...g.types.filter((t) => t !== k), k] : g.types.filter((t) => t !== k) })));
  const addGroup = () => {
    let n = form.length + 1;
    while (form.some((g) => g.key === `group_${n}`)) n += 1;
    setForm([...form, { key: `group_${n}`, en: TEXT.en.newGroup, km: TEXT.km.newGroup, types: [] }]);
  };

  const save = async () => {
    if (form.some((g) => !g.en.trim() || !g.km.trim())) return setState({ saving: false, error: p.needName, ok: "" });
    setState({ saving: true, error: "", ok: "" });
    try {
      const groups = form.map((g) => ({ ...g, en: g.en.trim(), km: g.km.trim() }));
      await homepageService.update({ groups });
      setHomepageCache({ groups }); // the website + "Add business" use them at once
      setSaved(copy(groups));
      setForm(copy(groups));
      setState({ saving: false, error: "", ok: p.saved });
    } catch (e) {
      setState({ saving: false, error: e.message, ok: "" });
    }
  };

  const row = (k, gi, ti, count) => (
    <div key={k} className="bg-row" data-testid={`bg-svc-${k}`}>
      <span className={`bg-ic g-${k}`}>
        <PathIcon d={HERO_ICONS[k]} size={18} />
      </span>
      <b className="bg-name">{name(k)}</b>
      {gi >= 0 && (
        <span className="bg-arrows">
          <button type="button" className="md-icon-btn" onClick={() => setGroup(gi, { types: move(form[gi].types, ti, -1) })} disabled={ti === 0} aria-label={p.up} title={p.up}>
            <ArrowUp size={15} />
          </button>
          <button type="button" className="md-icon-btn" onClick={() => setGroup(gi, { types: move(form[gi].types, ti, 1) })} disabled={ti === count - 1} aria-label={p.down} title={p.down}>
            <ArrowDown size={15} />
          </button>
        </span>
      )}
      <select className="bg-move" value={gi} onChange={(e) => moveTo(k, Number(e.target.value))} aria-label={`${p.moveTo}: ${name(k)}`} data-testid={`bg-move-${k}`}>
        {form.map((g, x) => (
          <option key={g.key} value={x}>
            {(lang === "km" ? g.km : g.en) || g.key}
          </option>
        ))}
        <option value={-1}>{p.noGroup}</option>
      </select>
    </div>
  );

  return (
    <div className="md-page pr-page bg-page">
      <div className="pr-head">
        <p className="pr-muted pr-sub">{p.sub}</p>
        <button type="button" className="md-btn md-btn-ghost" onClick={addGroup} data-testid="bg-add">
          <FolderPlus size={16} /> {p.addGroup}
        </button>
      </div>
      {state.error && <div className="md-notice md-notice-error">{state.error}</div>}
      {state.ok && !dirty && <div className="md-notice md-notice-success">{state.ok}</div>}

      <div className="bg-preview" aria-label={p.preview}>
        <small>{p.preview}</small>
        <div className="bg-tabs">
          <span className="on">
            {p.all} <em>{SERVICE_ORDER.length}</em>
          </span>
          {form
            .filter((g) => g.types.length)
            .map((g) => (
              <span key={g.key}>
                {(lang === "km" ? g.km : g.en) || "—"} <em>{g.types.length}</em>
              </span>
            ))}
          {loose.length > 0 && (
            <span>
              {lang === "km" ? "ផ្សេងៗ" : "More"} <em>{loose.length}</em>
            </span>
          )}
        </div>
      </div>

      {form.map((g, gi) => (
        <section key={g.key} className="panel-card pr-group bg-group" data-testid={`bg-group-${g.key}`}>
          <div className="bg-group-head">
            <span className="pr-ic">
              <Layers size={18} />
            </span>
            <label className="bg-field">
              <span>{p.nameEn}</span>
              <input value={g.en} maxLength={40} onChange={(e) => setGroup(gi, { en: e.target.value })} />
            </label>
            <label className="bg-field">
              <span>{p.nameKm}</span>
              <input value={g.km} maxLength={40} onChange={(e) => setGroup(gi, { km: e.target.value })} />
            </label>
            <span className="bg-arrows">
              <button type="button" className="md-icon-btn" onClick={() => setForm(move(form, gi, -1))} disabled={gi === 0} aria-label={p.up} title={p.up}>
                <ArrowUp size={15} />
              </button>
              <button type="button" className="md-icon-btn" onClick={() => setForm(move(form, gi, 1))} disabled={gi === form.length - 1} aria-label={p.down} title={p.down}>
                <ArrowDown size={15} />
              </button>
              <button type="button" className="md-icon-btn sa-danger-text" onClick={() => setForm(form.filter((_, x) => x !== gi))} aria-label={p.remove} title={`${p.remove} · ${p.removeHint}`}>
                <Trash2 size={15} />
              </button>
            </span>
          </div>
          <small className="pr-muted">{g.types.length === 1 ? p.service1 : p.services.replace("{n}", g.types.length)}</small>
          <div className="bg-rows">{g.types.length ? g.types.map((k, ti) => row(k, gi, ti, g.types.length)) : <p className="pr-muted bg-empty">{p.empty}</p>}</div>
        </section>
      ))}

      {loose.length > 0 && (
        <section className="panel-card pr-group bg-group bg-loose" data-testid="bg-loose">
          <h2>
            {p.loose} <small>{p.looseSub}</small>
          </h2>
          <div className="bg-rows">{loose.map((k) => row(k, -1, 0, 0))}</div>
        </section>
      )}

      <div className={`ne-savebar ${dirty ? "is-dirty" : ""}`} role="region" aria-live="polite">
        <span className="ne-savebar-text">{dirty ? p.unsaved : p.allSaved}</span>
        {dirty && (
          <button type="button" className="md-btn md-btn-ghost" onClick={() => setForm(copy(saved))} disabled={state.saving} aria-label={p.undo} title={p.undo}>
            <RotateCcw size={16} />
          </button>
        )}
        <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={!dirty || state.saving} data-testid="bg-save">
          {state.saving ? p.saving : p.save}
        </button>
      </div>
    </div>
  );
}
