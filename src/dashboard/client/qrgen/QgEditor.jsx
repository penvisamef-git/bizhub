import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Download, ExternalLink, FileText, Image, Loader2, Globe, Lock, Plus, Printer, RotateCcw, Save, Shuffle, Trash2, Unlock, Upload } from "lucide-react";
import { qrgenService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import { Field } from "../restaurant/parts";
import QrPage from "../../../qrgen/QrPage";
import { QR_DESIGNS } from "../../../qrgen/designs";
import { THEME_KEYS, themeOf } from "../../../qrgen/themes";
import { isStatic } from "../../../qrgen/qrDesign";
import { BuyFiles, CouponPanel, Head, NeedLine, QrView, SlugBox, Switch, ThemeThumb, TYPE_ICON, downloadCodePng, downloadCodeSvg, printCodes } from "./QgParts";
import { codeUrl, fmt } from "./text";
import { FORM_TEMPLATES } from "./formTemplates";
import { LINK_ICON, LINK_META } from "../../../qrgen/linkKinds";

const KINDS = ["text", "textarea", "select", "checkbox", "radio", "phone", "email", "number", "date", "photo", "rating", "signature"];
const PRO_KINDS = ["photo", "rating", "signature"];
const LINK_KINDS = ["facebook", "tiktok", "telegram", "instagram", "youtube", "web", "shop", "phone", "email", "map", "whatsapp", "messenger", "line", "linkedin", "x"];
const TEMPLATES = ["card", "banner", "minimal"];
const PAGE_TYPES = ["text", "file", "form", "vcard", "map", "links", "coupon"];
const SWATCHES = ["#E0581A", "#dc2626", "#db2777", "#9333ea", "#4f46e5", "#0284c7", "#0d9488", "#16a34a", "#ca8a04", "#334155"];
const swap = (list, i, j) => {
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};
const blank = (type, color) => ({
  name: "",
  type,
  folder_id: null,
  active: true,
  url: "",
  smart: { ios: "", android: "", times: [] },
  links: [{ kind: "facebook", label: "", url: "" }],
  coupon: { title: "", offer: "", terms: "", ends_at: null, limit: 0, pin: "", has_pin: false, issued: 0, used: 0 },
  text: { title: "", body: "" },
  file: { url: "", name: "", kind: "", bytes: 0 },
  form: { title: "", intro: "", button: "", thanks: "", fields: [{ key: "f1", label: "", kind: "text", options: [], required: true, placeholder: "", show_if: { key: "", value: "" } }] },
  vcard: { name: "", org: "", job: "", phone: "", phone2: "", email: "", website: "", address: "" },
  map: { place: "", link: "", note: "" },
  wifi: { ssid: "", password: "", security: "WPA", hidden: false },
  phone: { number: "", body: "" },
  page: { template: "card", color, header: "", footer: "", rows: [], logo: true },
  design: { key: "plain", color: "", bg: "", accent: "", label: "", logo: false },
  notify_scan: false,
  rules: { expires_at: null, max_scans: 0 },
});
const merge = (b, c) => ({
  ...b,
  ...c,
  text: { ...b.text, ...c.text },
  smart: { ...b.smart, ...c.smart },
  coupon: { ...b.coupon, ...c.coupon, pin: "" },
  file: { ...b.file, ...c.file },
  form: { ...b.form, ...c.form },
  vcard: { ...b.vcard, ...c.vcard },
  map: { ...b.map, ...c.map },
  wifi: { ...b.wifi, ...c.wifi },
  phone: { ...b.phone, ...c.phone },
  page: { ...b.page, ...c.page },
  design: { ...b.design, ...c.design },
  rules: { ...b.rules, ...c.rules },
});

// make / edit one QR code — form on the left, live preview on the right
export default function QgEditor({ ctx, start, onClose, onSaved }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const isNew = !start._id;
  const [f, setF] = useState(() => merge(blank(start.type, data.settings.color || "#E0581A"), isNew ? {} : start));
  const [code, setCode] = useState(isNew ? null : start); // the saved row
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [view, setView] = useState("code");
  const [pw, setPw] = useState("");
  const [files, setFiles] = useState(false);
  const fileRef = useRef(null);
  const logo = data.settings.logo?.url || "";
  const scanMe = m.frameLabelPh;
  const Icon = TYPE_ICON[f.type];
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const part = (k, patch) => setF((o) => ({ ...o, [k]: { ...o[k], ...patch } }));
  const hasPage = PAGE_TYPES.includes(f.type);
  const owned = data.designs || ["plain"];
  const ownedThemes = data.themes || [];
  const draft = { ...f, slug: code?.slug || "preview" };

  const body = () => {
    const b = { name: f.name, folder_id: f.folder_id || null, active: f.active };
    if (isNew && !code) b.type = f.type;
    if (f.type === "url") b.url = f.url;
    if (f.type === "url" && (ctx.on("qr_smart") || code?.smart?.ios || code?.smart?.android || code?.smart?.times?.length)) b.smart = f.smart;
    if (f.type === "links") b.links = f.links.filter((x) => x.url.trim());
    if (f.type === "coupon") b.coupon = { title: f.coupon.title, offer: f.coupon.offer, terms: f.coupon.terms, ends_at: f.coupon.ends_at || null, limit: Number(f.coupon.limit) || 0, ...(f.coupon.pin ? { pin: f.coupon.pin } : {}) };
    if (f.type === "text") b.text = f.text;
    if (f.type === "form") b.form = { ...f.form, fields: f.form.fields.map((x) => ({ ...x, options: x.options.filter(Boolean) })) };
    if (f.type === "vcard") b.vcard = f.vcard;
    if (f.type === "map") b.map = f.map;
    if (f.type === "wifi") b.wifi = f.wifi;
    if (f.type === "phone" || f.type === "sms") b.phone = f.phone;
    if (hasPage) b.page = f.page;
    b.design = f.design;
    if (ctx.on("qr_telegram") || code?.notify_scan) b.notify_scan = f.notify_scan;
    if (ctx.on("qr_rules")) b.rules = { expires_at: f.rules.expires_at || null, max_scans: Number(f.rules.max_scans) || 0 };
    return b;
  };
  const save = async () => {
    setBusy("save");
    setErr("");
    try {
      const r = code ? await qrgenService.saveCode(id, code._id, body()) : await qrgenService.addCode(id, body());
      setCode(r.data);
      setF((o) => merge(o, r.data));
      onSaved(r.data, !code);
      notify({ type: "success", text: code ? m.saved : m.created });
      return r.data;
    } catch (e) {
      if (e.response?.code === "need_addon" && e.response.product) ctx.askBuy({ addon: e.response.product });
      if (e.response?.code === "not_owned") ctx.askBuy(e.response.product === "qr_theme" ? { theme: e.response.item } : { design: e.response.item });
      setErr(e.message);
      return null;
    } finally {
      setBusy("");
    }
  };
  const upload = async (file) => {
    if (!file) return;
    let row = code;
    if (!row) {
      if (!f.name.trim()) return setErr(`${m.name}?`);
      row = await save();
      if (!row) return;
    }
    setBusy("file");
    setErr("");
    try {
      const r = await qrgenService.uploadFile(id, row._id, file);
      setCode(r.data);
      part("file", r.data.file);
      ctx.put({ files: r.files });
      onSaved(r.data, false);
    } catch (e) {
      if (e.response?.code === "files_full") setFiles(true);
      setErr(e.message);
    } finally {
      setBusy("");
    }
  };
  const pass = async (on) => {
    setBusy("pw");
    try {
      const r = on ? await qrgenService.setPassword(id, code._id, pw) : await qrgenService.removePassword(id, code._id);
      setCode(r.data);
      onSaved(r.data, false);
      setPw("");
      notify({ type: "success", text: m.saved });
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const pagePreview = useMemo(() => {
    const p = { name: f.name || m.types[f.type], type: f.type, business: data.business.name, logo: f.page.logo ? logo : "", page: f.page };
    if (f.type === "text") p.text = f.text;
    if (f.type === "file") p.file = f.file.url ? f.file : { url: "", name: "file.pdf", kind: "pdf", bytes: 0 };
    if (f.type === "form") p.form = { ...f.form, fields: f.form.fields.filter((x) => x.label).map((x, i) => ({ ...x, key: x.key || `f${i + 1}` })) };
    if (f.type === "vcard") p.vcard = f.vcard;
    if (f.type === "map") p.map = f.map;
    if (f.type === "links") p.links = f.links.filter((x) => x.url.trim());
    if (f.type === "coupon")
      p.coupon = { title: f.coupon.title, offer: f.coupon.offer, terms: f.coupon.terms, ends_at: f.coupon.ends_at, left: Number(f.coupon.limit) ? Math.max(0, Number(f.coupon.limit) - (code?.coupon?.issued || 0)) : null, ended: false, gone: false };
    p.brand = !ctx.on("qr_nobrand");
    if (f.type === "wifi") p.wifi = f.wifi;
    if (f.type === "phone" || f.type === "sms") p.phone = f.phone;
    return p;
  }, [f, logo, data.business.name, m.types, ctx, code]); // eslint-disable-line react-hooks/exhaustive-deps

  const field = (i, patch) => part("form", { fields: f.form.fields.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const moveField = (i, d) => {
    const list = [...f.form.fields];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    part("form", { fields: list });
  };
  const nextKey = () => {
    let n = f.form.fields.length + 1;
    while (f.form.fields.some((x) => x.key === `f${n}`)) n += 1;
    return `f${n}`;
  };
  const d = QR_DESIGNS[f.design.key] || QR_DESIGNS.plain;

  return (
    <div className="rs-col">
      <Head icon={Icon} title={code ? m.editTitle : m.newTitle.replace("{type}", m.types[f.type])} sub={m.typeWhat[f.type]}>
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={onClose} data-testid="qg-back">
          <ArrowLeft size={14} /> {m.back}
        </button>
        <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={readOnly || !!busy || !f.name.trim()} data-testid="qg-save">
          {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Save size={15} />} {m.save}
        </button>
      </Head>
      {err && <div className="md-notice md-notice-error qg-err">{err}</div>}
      <div className="qg-edit">
        <div className="qg-edit-form">
          <section className="panel-card md-fields">
            <div className="qg-grid2">
              <Field label={m.name}>
                <input value={f.name} maxLength={80} onChange={(e) => set("name", e.target.value)} placeholder={m.namePh} autoFocus={isNew} data-testid="qg-name" />
              </Field>
              <Field label={m.folder}>
                <select value={f.folder_id || ""} onChange={(e) => set("folder_id", e.target.value || null)}>
                  <option value="">{m.noFolder}</option>
                  {data.folders.map((x) => (
                    <option key={x._id} value={x._id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {code && <Switch checked={f.active} onChange={(v) => set("active", v)} label={m.active} />}
            {isStatic(f.type) && <p className="qg-note">{m.staticNote}</p>}
          </section>

          <section className="panel-card md-fields">
            <h3 className="mq-h3">{m.sContent}</h3>
            {f.type === "url" && (
              <Field label={m.url}>
                <input value={f.url} onChange={(e) => set("url", e.target.value)} placeholder={m.urlPh} inputMode="url" data-testid="qg-url" />
              </Field>
            )}
            {f.type === "links" && (
              <>
                <small className="rs-muted">{m.linksSub}</small>
                <div className="qg-links">
                  {f.links.map((x, i) => {
                    const LIcon = LINK_ICON[x.kind] || Globe;
                    return (
                      <div key={i} className="qg-linkrow" data-testid="qg-link">
                        <span className="qg-link-ic" style={{ background: LINK_META[x.kind]?.color || "#334155" }}>
                          <LIcon size={16} />
                        </span>
                        <select
                          value={x.kind}
                          onChange={(e) =>
                            set(
                              "links",
                              f.links.map((y, j) => (j === i ? { ...y, kind: e.target.value } : y)),
                            )
                          }
                          data-testid="qg-link-kind"
                        >
                          {LINK_KINDS.map((k) => (
                            <option key={k} value={k}>
                              {m.linkKinds[k]}
                            </option>
                          ))}
                        </select>
                        <input
                          value={x.url}
                          maxLength={600}
                          onChange={(e) =>
                            set(
                              "links",
                              f.links.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)),
                            )
                          }
                          placeholder={m.linkUrl}
                          data-testid="qg-link-url"
                        />
                        <input
                          value={x.label}
                          maxLength={60}
                          onChange={(e) =>
                            set(
                              "links",
                              f.links.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)),
                            )
                          }
                          placeholder={m.linkLabel}
                        />
                        <span className="qg-linkrow-acts">
                          <button type="button" className="md-icon-btn" disabled={i === 0} onClick={() => set("links", swap(f.links, i, i - 1))} aria-label="Up">
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            className="md-icon-btn danger"
                            onClick={() =>
                              set(
                                "links",
                                f.links.filter((_, j) => j !== i),
                              )
                            }
                            aria-label={m.delete}
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="md-btn md-btn-ghost sa-btn-sm"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => set("links", [...f.links, { kind: "web", label: "", url: "" }])}
                  disabled={f.links.length >= 20}
                  data-testid="qg-add-link"
                >
                  <Plus size={14} /> {m.addLink}
                </button>
              </>
            )}
            {f.type === "coupon" && (
              <>
                <div className="qg-grid2">
                  <Field label={m.cTitle}>
                    <input value={f.coupon.title} maxLength={120} onChange={(e) => part("coupon", { title: e.target.value })} placeholder={m.cTitlePh} data-testid="qg-c-title" />
                  </Field>
                  <Field label={m.cOffer}>
                    <input value={f.coupon.offer} maxLength={60} onChange={(e) => part("coupon", { offer: e.target.value })} placeholder={m.cOfferPh} data-testid="qg-c-offer" />
                  </Field>
                </div>
                <Field label={m.cTerms}>
                  <textarea rows={2} value={f.coupon.terms} maxLength={1000} onChange={(e) => part("coupon", { terms: e.target.value })} />
                </Field>
                <div className="qg-grid2">
                  <Field label={m.cEnds}>
                    <input type="date" value={f.coupon.ends_at ? String(f.coupon.ends_at).slice(0, 10) : ""} onChange={(e) => part("coupon", { ends_at: e.target.value ? `${e.target.value}T16:59:59.000Z` : null })} />
                  </Field>
                  <Field label={m.cLimit}>
                    <input type="number" min={0} value={f.coupon.limit} onChange={(e) => part("coupon", { limit: e.target.value })} data-testid="qg-c-limit" />
                  </Field>
                </div>
                <Field label={f.coupon.has_pin ? `${m.cPin} — ${m.cPinSet}` : m.cPin}>
                  <input value={f.coupon.pin} inputMode="numeric" maxLength={6} onChange={(e) => part("coupon", { pin: e.target.value.replace(/\D/g, "") })} placeholder={f.coupon.has_pin ? "••••" : "1234"} data-testid="qg-c-pin" />
                </Field>
                {!f.coupon.has_pin && !f.coupon.pin && <p className="qg-note">{m.cPinNeed}</p>}
                <p className="qg-note">{m.cHow}</p>
              </>
            )}
            {f.type === "text" && (
              <>
                <Field label={m.textTitle}>
                  <input value={f.text.title} maxLength={160} onChange={(e) => part("text", { title: e.target.value })} data-testid="qg-text-title" />
                </Field>
                <Field label={m.textBody}>
                  <textarea rows={7} value={f.text.body} maxLength={8000} onChange={(e) => part("text", { body: e.target.value })} data-testid="qg-text-body" />
                </Field>
              </>
            )}
            {f.type === "file" && (
              <div className="qg-file">
                <span className="qg-file-ic">{f.file.kind === "image" ? <Image size={24} /> : <FileText size={24} />}</span>
                <div className="qg-file-text">
                  <b>{f.file.name || m.file}</b>
                  <small className="rs-muted">
                    {m.fileSub} · {m.fileRoom.replace("{n}", data.files.count).replace("{max}", data.files.capacity)}
                  </small>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    const x = e.target.files?.[0];
                    e.target.value = "";
                    upload(x);
                  }}
                  data-testid="qg-file"
                />
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => fileRef.current?.click()} disabled={readOnly || !!busy}>
                  {busy === "file" ? <Loader2 size={14} className="md-spin" /> : <Upload size={14} />} {busy === "file" ? m.uploading : f.file.url ? m.replace : m.upload}
                </button>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setFiles(true)} disabled={readOnly}>
                  <CoinIcon size={13} /> {m.moreFiles.replace("{n}", data.files.pack).replace("{coins}", fmt(data.prices.qr_file_pack))}
                </button>
                {!f.file.url && busy !== "file" && <p className="qg-file-miss">{m.fileMissing}</p>}
              </div>
            )}
            {f.type === "form" && (
              <>
                <div className="qg-grid2">
                  <Field label={m.formTitle}>
                    <input value={f.form.title} maxLength={160} onChange={(e) => part("form", { title: e.target.value })} data-testid="qg-form-title" />
                  </Field>
                  <Field label={m.formButton}>
                    <input value={f.form.button} maxLength={40} onChange={(e) => part("form", { button: e.target.value })} placeholder="Send" />
                  </Field>
                </div>
                <Field label={m.formIntro}>
                  <textarea rows={2} value={f.form.intro} maxLength={1000} onChange={(e) => part("form", { intro: e.target.value })} />
                </Field>
                <div className="qg-fields-head">
                  <h4 className="qg-h4">{m.fields}</h4>
                  <select
                    className="fb-select"
                    value=""
                    onChange={(e) => {
                      const t = FORM_TEMPLATES[e.target.value];
                      if (!t) return;
                      const fields = t.fields(lang).filter((x) => ctx.on("qr_form_pro") || (!PRO_KINDS.includes(x.kind) && !x.show_if?.key));
                      part("form", { title: f.form.title || t.title[lang] || t.title.en, fields: fields.map((x, i) => ({ key: `f${i + 1}`, options: [], required: false, placeholder: "", show_if: { key: "", value: "" }, ...x })) });
                    }}
                    title={m.templateHint}
                    data-testid="qg-form-template"
                  >
                    <option value="">{m.templatesBtn}</option>
                    {Object.keys(FORM_TEMPLATES).map((k) => (
                      <option key={k} value={k}>
                        {m.formTemplates[k]}
                      </option>
                    ))}
                  </select>
                </div>
                {!ctx.on("qr_form_pro") && <NeedLine ctx={ctx} addon="qr_form_pro" />}
                <div className="qg-fields">
                  {f.form.fields.map((x, i) => (
                    <div key={x.key || i} className="qg-fieldrow" data-testid="qg-field">
                      <div className="qg-fieldrow-top">
                        <b>{i + 1}</b>
                        <input value={x.label} maxLength={120} onChange={(e) => field(i, { label: e.target.value })} placeholder={m.fieldLabel} data-testid="qg-field-label" />
                        <select value={x.kind} onChange={(e) => field(i, { kind: e.target.value })} data-testid="qg-field-kind">
                          {KINDS.map((k) => (
                            <option key={k} value={k}>
                              {m.kinds[k]}
                              {PRO_KINDS.includes(k) && !ctx.on("qr_form_pro") ? " 🔒" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      {["select", "checkbox", "radio"].includes(x.kind) && (
                        <textarea rows={3} value={x.options.join("\n")} onChange={(e) => field(i, { options: e.target.value.split("\n").slice(0, 20) })} placeholder={m.options} data-testid="qg-field-options" />
                      )}
                      {["text", "textarea", "phone", "email", "number"].includes(x.kind) && <input value={x.placeholder} maxLength={120} onChange={(e) => field(i, { placeholder: e.target.value })} placeholder={m.placeholder} />}
                      {i > 0 && (ctx.on("qr_form_pro") || x.show_if?.key) && (
                        <div className="qg-showif">
                          <small>{m.showIf}</small>
                          <select value={x.show_if?.key || ""} onChange={(e) => field(i, { show_if: { key: e.target.value, value: "" } })} data-testid="qg-showif-key">
                            <option value="">{m.showIfAny}</option>
                            {f.form.fields.slice(0, i).map((y, j) =>
                              y.label ? (
                                <option key={y.key || j} value={y.key}>
                                  {j + 1}. {y.label}
                                </option>
                              ) : null,
                            )}
                          </select>
                          {x.show_if?.key && (
                            <>
                              <small>{m.showIfIs}</small>
                              {(() => {
                                const src = f.form.fields.find((y) => y.key === x.show_if.key);
                                return src && src.options.filter(Boolean).length ? (
                                  <select value={x.show_if.value} onChange={(e) => field(i, { show_if: { ...x.show_if, value: e.target.value } })} data-testid="qg-showif-value">
                                    <option value="">…</option>
                                    {src.options.filter(Boolean).map((o) => (
                                      <option key={o} value={o}>
                                        {o}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input value={x.show_if.value} maxLength={80} onChange={(e) => field(i, { show_if: { ...x.show_if, value: e.target.value } })} />
                                );
                              })()}
                            </>
                          )}
                        </div>
                      )}
                      <div className="qg-fieldrow-acts">
                        <Switch checked={x.required} onChange={(v) => field(i, { required: v })} label={m.requiredQ} />
                        <span>
                          <button type="button" className="md-icon-btn" onClick={() => moveField(i, -1)} disabled={i === 0} aria-label="Up">
                            <ArrowUp size={14} />
                          </button>
                          <button type="button" className="md-icon-btn" onClick={() => moveField(i, 1)} disabled={i === f.form.fields.length - 1} aria-label="Down">
                            <ArrowDown size={14} />
                          </button>
                          <button type="button" className="md-icon-btn danger" onClick={() => part("form", { fields: f.form.fields.filter((_, j) => j !== i) })} aria-label={m.delete}>
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="md-btn md-btn-ghost sa-btn-sm"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => part("form", { fields: [...f.form.fields, { key: nextKey(), label: "", kind: "text", options: [], required: false, placeholder: "", show_if: { key: "", value: "" } }] })}
                  disabled={f.form.fields.length >= 30}
                  data-testid="qg-add-field"
                >
                  <Plus size={14} /> {m.addField}
                </button>
                <Field label={m.formThanks}>
                  <input value={f.form.thanks} maxLength={300} onChange={(e) => part("form", { thanks: e.target.value })} />
                </Field>
              </>
            )}
            {f.type === "vcard" && (
              <div className="qg-grid2">
                {[
                  ["name", m.vName, 80],
                  ["org", m.vOrg, 80],
                  ["job", m.vJob, 80],
                  ["phone", m.vPhone, 40],
                  ["phone2", m.vPhone2, 40],
                  ["email", m.vEmail, 120],
                  ["website", m.vWebsite, 200],
                  ["address", m.vAddress, 300],
                ].map(([k, label, max]) => (
                  <Field key={k} label={label}>
                    <input value={f.vcard[k]} maxLength={max} onChange={(e) => part("vcard", { [k]: e.target.value })} data-testid={`qg-v-${k}`} />
                  </Field>
                ))}
              </div>
            )}
            {f.type === "map" && (
              <>
                <Field label={m.mPlace}>
                  <input value={f.map.place} maxLength={160} onChange={(e) => part("map", { place: e.target.value })} data-testid="qg-map-place" />
                </Field>
                <Field label={m.mLink}>
                  <input value={f.map.link} maxLength={600} onChange={(e) => part("map", { link: e.target.value })} placeholder="https://maps.app.goo.gl/…" />
                </Field>
                <Field label={m.mNote}>
                  <input value={f.map.note} maxLength={300} onChange={(e) => part("map", { note: e.target.value })} />
                </Field>
              </>
            )}
            {f.type === "wifi" && (
              <div className="qg-grid2">
                <Field label={m.wSsid}>
                  <input value={f.wifi.ssid} maxLength={64} onChange={(e) => part("wifi", { ssid: e.target.value })} data-testid="qg-wifi-ssid" />
                </Field>
                <Field label={m.wSecurity}>
                  <select value={f.wifi.security} onChange={(e) => part("wifi", { security: e.target.value })}>
                    <option value="WPA">WPA / WPA2</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">—</option>
                  </select>
                </Field>
                {f.wifi.security !== "nopass" && (
                  <Field label={m.wPassword}>
                    <input value={f.wifi.password} maxLength={64} onChange={(e) => part("wifi", { password: e.target.value })} data-testid="qg-wifi-pw" />
                  </Field>
                )}
                <Switch checked={f.wifi.hidden} onChange={(v) => part("wifi", { hidden: v })} label={m.wHidden} />
              </div>
            )}
            {(f.type === "phone" || f.type === "sms") && (
              <>
                <Field label={m.pNumber}>
                  <input value={f.phone.number} maxLength={40} onChange={(e) => part("phone", { number: e.target.value })} inputMode="tel" data-testid="qg-phone" />
                </Field>
                {f.type === "sms" && (
                  <Field label={m.pBody}>
                    <textarea rows={3} value={f.phone.body} maxLength={300} onChange={(e) => part("phone", { body: e.target.value })} />
                  </Field>
                )}
              </>
            )}
          </section>

          {f.type === "url" && (
            <section className="panel-card md-fields">
              <h3 className="mq-h3">
                <Shuffle size={16} /> {m.sSmart}
              </h3>
              <small className="rs-muted" style={{ marginTop: -8 }}>
                {m.smartSub}
              </small>
              {!ctx.on("qr_smart") && <NeedLine ctx={ctx} addon="qr_smart" />}
              <fieldset className="qg-fs" disabled={!ctx.on("qr_smart")}>
                <div className="qg-grid2">
                  <Field label={m.smartIos}>
                    <input value={f.smart.ios} onChange={(e) => part("smart", { ios: e.target.value })} placeholder="apps.apple.com/…" data-testid="qg-smart-ios" />
                  </Field>
                  <Field label={m.smartAndroid}>
                    <input value={f.smart.android} onChange={(e) => part("smart", { android: e.target.value })} placeholder="play.google.com/…" data-testid="qg-smart-android" />
                  </Field>
                </div>
                <h4 className="qg-h4">{m.smartTimes}</h4>
                {f.smart.times.map((t, i) => (
                  <div key={i} className="qg-timerow">
                    <label>
                      <small>{m.smartFrom}</small>
                      <input type="time" value={t.from} onChange={(e) => part("smart", { times: f.smart.times.map((y, j) => (j === i ? { ...y, from: e.target.value } : y)) })} />
                    </label>
                    <label>
                      <small>{m.smartTo}</small>
                      <input type="time" value={t.to} onChange={(e) => part("smart", { times: f.smart.times.map((y, j) => (j === i ? { ...y, to: e.target.value } : y)) })} />
                    </label>
                    <input value={t.url} onChange={(e) => part("smart", { times: f.smart.times.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)) })} placeholder={m.urlPh} />
                    <button type="button" className="md-icon-btn danger" onClick={() => part("smart", { times: f.smart.times.filter((_, j) => j !== i) })} aria-label={m.delete}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="md-btn md-btn-ghost sa-btn-sm"
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => part("smart", { times: [...f.smart.times, { from: "11:00", to: "14:00", url: "" }] })}
                  disabled={f.smart.times.length >= 6}
                >
                  <Plus size={14} /> {m.smartAddTime}
                </button>
              </fieldset>
            </section>
          )}
          {f.type === "coupon" && code && <CouponPanel ctx={ctx} code={code} />}

          {hasPage && (
            <section className="panel-card md-fields">
              <h3 className="mq-h3">{m.sPage}</h3>
              <div className="qg-tpls" data-testid="qg-tpls">
                {[...TEMPLATES, ...THEME_KEYS].map((k) => {
                  const th = themeOf(k);
                  const locked = th && !ownedThemes.includes(k);
                  const label = th ? (lang === "km" ? th.km : th.en) : m.templates[k];
                  return (
                    <div
                      key={k}
                      role="button"
                      tabIndex={0}
                      className={`qg-tpl ${f.page.template === k ? "on" : ""} ${locked ? "locked" : ""}`}
                      style={{ "--q": f.page.color }}
                      onClick={() => part("page", { template: k })}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && part("page", { template: k })}
                      data-testid={`qg-tpl-${k}`}
                    >
                      <ThemeThumb template={k} color={f.page.color} name={f.page.header || f.name || "Aa"} business={data.business.name} />
                      <small>
                        {label}
                        {!th ? (
                          <em className="free">{m.free}</em>
                        ) : locked ? (
                          <em>
                            <CoinIcon size={10} /> {fmt(data.prices.qr_theme)}
                          </em>
                        ) : (
                          <em className="mine">
                            <Check size={10} />
                          </em>
                        )}
                      </small>
                    </div>
                  );
                })}
              </div>
              <small className="rs-muted">{m.themesHint.replace("{n}", THEME_KEYS.length).replace("{coins}", fmt(data.prices.qr_theme))}</small>
              {themeOf(f.page.template) && !ownedThemes.includes(f.page.template) && (
                <div className="qg-need">
                  <Lock size={15} />
                  <span>{m.themeLocked.replace("{name}", lang === "km" ? themeOf(f.page.template).km : themeOf(f.page.template).en)}</span>
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ theme: f.page.template, color: f.page.color })} disabled={readOnly} data-testid="qg-buy-theme">
                    <CoinIcon size={13} /> {fmt(data.prices.qr_theme)}
                  </button>
                </div>
              )}
              <div className="qg-swatches">
                <span className="rs-muted">{m.pageColor}</span>
                <label className="fb-swatch fb-swatch-pick" style={{ background: f.page.color }}>
                  <input type="color" value={f.page.color} onChange={(e) => part("page", { color: e.target.value })} />
                </label>
                {SWATCHES.map((c) => (
                  <button key={c} type="button" className={`fb-swatch ${f.page.color.toLowerCase() === c.toLowerCase() ? "on" : ""}`} style={{ background: c }} onClick={() => part("page", { color: c })} aria-label={c} />
                ))}
              </div>
              <div className="qg-grid2">
                <Field label={m.header}>
                  <input value={f.page.header} maxLength={120} onChange={(e) => part("page", { header: e.target.value })} placeholder={f.name} data-testid="qg-page-header" />
                </Field>
                <Field label={m.footer}>
                  <input value={f.page.footer} maxLength={200} onChange={(e) => part("page", { footer: e.target.value })} data-testid="qg-page-footer" />
                </Field>
              </div>
              <h4 className="qg-h4">{m.rows}</h4>
              <small className="rs-muted" style={{ marginTop: -6 }}>
                {m.rowsSub}
              </small>
              {f.page.rows.map((r, i) => (
                <div key={i} className="qg-row">
                  <input value={r.label} maxLength={60} onChange={(e) => part("page", { rows: f.page.rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder={m.label} data-testid="qg-row-label" />
                  <input value={r.value} maxLength={300} onChange={(e) => part("page", { rows: f.page.rows.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} placeholder={m.value} data-testid="qg-row-value" />
                  <button type="button" className="md-icon-btn danger" onClick={() => part("page", { rows: f.page.rows.filter((_, j) => j !== i) })} aria-label={m.delete}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="md-btn md-btn-ghost sa-btn-sm"
                style={{ alignSelf: "flex-start" }}
                onClick={() => part("page", { rows: [...f.page.rows, { label: "", value: "" }] })}
                disabled={f.page.rows.length >= 20}
                data-testid="qg-add-row"
              >
                <Plus size={14} /> {m.addRow}
              </button>
              <Switch checked={f.page.logo} onChange={(v) => part("page", { logo: v })} label={m.showLogo} />
            </section>
          )}

          <section className="panel-card md-fields">
            <h3 className="mq-h3">{m.sDesign}</h3>
            <small className="rs-muted" style={{ marginTop: -8 }}>
              {m.designSub}
            </small>
            <div className="qg-owned">
              {owned.map((k) => (
                <button key={k} type="button" className={f.design.key === k ? "on" : ""} onClick={() => part("design", { key: k })} title={(lang === "km" ? QR_DESIGNS[k]?.km : QR_DESIGNS[k]?.en) || k} data-testid={`qg-owned-${k}`}>
                  <QrView code={{ ...draft, design: { key: k } }} size={70} scanMe={scanMe} />
                </button>
              ))}
              <button type="button" className="qg-owned-more" onClick={() => ctx.go("designs")}>
                <Plus size={16} />
                <small>{m.moreDesigns.replace("{n}", Object.keys(QR_DESIGNS).length - 1)}</small>
              </button>
            </div>
            <div className="qg-colors">
              {[
                ["color", m.cCode, d.color],
                ["bg", m.cBg, d.bg],
                ["accent", m.cAccent, d.accent],
              ].map(([k, label, def]) => (
                <label key={k}>
                  <input type="color" value={f.design[k] || def} onChange={(e) => part("design", { [k]: e.target.value })} />
                  <small>{label}</small>
                </label>
              ))}
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => part("design", { color: "", bg: "", accent: "" })}>
                <RotateCcw size={13} /> {m.resetColors}
              </button>
            </div>
            <div className="qg-grid2">
              <Field label={m.frameLabel}>
                <input value={f.design.label} maxLength={40} onChange={(e) => part("design", { label: e.target.value })} placeholder={m.frameLabelPh} />
              </Field>
              {logo && <Switch checked={f.design.logo} onChange={(v) => part("design", { logo: v })} label={m.logoMiddle} />}
            </div>
          </section>

          {!isStatic(f.type) && (
            <section className="panel-card md-fields">
              <h3 className="mq-h3">{m.sOptions}</h3>
              {ctx.on("qr_telegram") ? <Switch checked={f.notify_scan} onChange={(v) => set("notify_scan", v)} label={m.notifyScan} /> : <NeedLine ctx={ctx} addon="qr_telegram" />}
              <h4 className="qg-h4">{m.rules}</h4>
              {ctx.on("qr_rules") ? (
                <>
                  <div className="qg-grid2">
                    <Field label={m.expires}>
                      <input
                        type="date"
                        value={f.rules.expires_at ? new Date(f.rules.expires_at).toISOString().slice(0, 10) : ""}
                        onChange={(e) => part("rules", { expires_at: e.target.value ? new Date(`${e.target.value}T23:59:59+07:00`).toISOString() : null })}
                      />
                    </Field>
                    <Field label={m.maxScans}>
                      <input type="number" min="0" value={f.rules.max_scans || 0} onChange={(e) => part("rules", { max_scans: Math.max(0, Number(e.target.value) || 0) })} />
                    </Field>
                  </div>
                  {code ? (
                    <div className="qg-pw">
                      {code.has_password && (
                        <span className="rs-pill on">
                          <Lock size={12} /> {m.pwOn}
                        </span>
                      )}
                      <input type="text" value={pw} maxLength={40} onChange={(e) => setPw(e.target.value)} placeholder={m.pwNew} autoComplete="off" />
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => pass(true)} disabled={busy === "pw" || pw.length < 4}>
                        <Lock size={13} /> {m.pwSet}
                      </button>
                      {code.has_password && (
                        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => pass(false)} disabled={busy === "pw"}>
                          <Unlock size={13} /> {m.pwRemove}
                        </button>
                      )}
                    </div>
                  ) : (
                    <small className="rs-muted">
                      {m.password}: {m.saveFirst}
                    </small>
                  )}
                </>
              ) : (
                <NeedLine ctx={ctx} addon="qr_rules" />
              )}
            </section>
          )}
        </div>

        <aside className="qg-edit-side">
          <section className="panel-card qg-preview">
            {hasPage && (
              <div className="qg-seg">
                <button type="button" className={view === "code" ? "on" : ""} onClick={() => setView("code")} data-testid="qg-view-code">
                  {m.previewCode}
                </button>
                <button type="button" className={view === "page" ? "on" : ""} onClick={() => setView("page")} data-testid="qg-view-page">
                  {m.previewPage}
                </button>
              </div>
            )}
            {view === "page" && hasPage ? (
              <div className="qg-phone" data-testid="qg-page-preview">
                <div className="qg-phone-screen">
                  <QrPage preview={pagePreview} lang={lang} />
                </div>
              </div>
            ) : (
              <>
                <div className="qg-bigcode" data-testid="qg-code-preview">
                  <QrView code={draft} logo={logo} size={300} scanMe={scanMe} />
                </div>
                {code && !isStatic(f.type) && (
                  <a className="mq-qr-url" href={codeUrl(code.slug)} target="_blank" rel="noreferrer">
                    {codeUrl(code.slug).replace(/^https?:\/\//, "")} <ExternalLink size={12} />
                  </a>
                )}
                {code && !isStatic(f.type) && <SlugBox ctx={ctx} code={code} onDone={(row) => (setCode(row), onSaved(row, false))} />}
                <div className="qg-dl">
                  <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => downloadCodePng(draft, logo, scanMe)} disabled={!code && !isStatic(f.type)} data-testid="qg-dl-png">
                    <Download size={14} /> {m.download}
                  </button>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => downloadCodeSvg(draft, logo, scanMe)} disabled={!code && !isStatic(f.type)}>
                    {m.downloadSvg}
                  </button>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => printCodes([draft], logo, f.name, scanMe)} disabled={!code && !isStatic(f.type)}>
                    <Printer size={14} /> {m.print}
                  </button>
                </div>
                {!code && !isStatic(f.type) && <small className="rs-muted qg-savefirst">{m.saveFirst}</small>}
                {code && (
                  <small className="rs-muted qg-savefirst">
                    <Check size={12} /> {m.scans.replace("{n}", fmt(code.scans))}
                  </small>
                )}
              </>
            )}
          </section>
        </aside>
      </div>
      {files && <BuyFiles ctx={ctx} onClose={() => setFiles(false)} />}
    </div>
  );
}
