import { useState } from "react";
import { ImagePlus, Images, Loader2, Save, Store, Trash2 } from "lucide-react";
import { MediaPicker } from "./MqMedia";
import { menuQrService } from "../../../api/services";
import { Field } from "../restaurant/parts";
import { Head, Switch } from "./parts";
import { menuUrl } from "./text";

// Business info: logo, cover, contact, hours, money, link
export default function MqProfile({ ctx }) {
  const { id, m, data, readOnly, notify } = ctx;
  const s = data.settings;
  const [f, setF] = useState(() => ({
    tagline: s.tagline || "",
    about: s.about || "",
    hours: s.hours || "",
    currency: s.currency,
    khr_rate: s.khr_rate,
    show_both: !!s.show_both,
    lang: s.lang,
    slug: s.slug,
    feedback_on: s.feedback_on !== false,
    contact: { ...s.contact },
  }));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setC = (k) => (e) => setF({ ...f, contact: { ...f.contact, [k]: e.target.value } });
  const save = async () => {
    if (f.slug !== s.slug && !window.confirm(m.linkAsk)) return; // changing the link breaks printed QR codes
    setBusy("save");
    setError("");
    try {
      const r = await menuQrService.save(id, { ...f, khr_rate: Number(f.khr_rate) || 4100 });
      ctx.setSettings(r.data);
      notify({ type: "success", text: m.saved });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rs-col">
      <Head icon={Store} title={m.profileTitle} sub={m.profileSub} />
      <section className="panel-card">
        <div className="mq-pics">
          <Picture ctx={ctx} field="logo" label={m.logo} round busy={busy} setBusy={setBusy} />
          <Picture ctx={ctx} field="cover" label={m.cover} wide busy={busy} setBusy={setBusy} />
        </div>
        <div className="md-fields" style={{ marginTop: 16 }}>
          <Field label={m.tagline}>
            <input value={f.tagline} maxLength={120} onChange={set("tagline")} placeholder={m.taglinePh} disabled={readOnly} />
          </Field>
          <Field label={m.about}>
            <textarea rows={3} maxLength={600} value={f.about} onChange={set("about")} disabled={readOnly} />
          </Field>
          <Field label={m.hours}>
            <input value={f.hours} maxLength={160} onChange={set("hours")} placeholder={m.hoursPh} disabled={readOnly} data-testid="mq-hours" />
          </Field>
        </div>
      </section>
      <section className="panel-card">
        <h3 className="mq-h3">{m.contact}</h3>
        <div className="md-fields-grid">
          {[
            ["phone", m.phone, 30, "012 345 678"],
            ["phone2", m.phone2, 30, ""],
            ["telegram", m.telegram, 120, "@yourname"],
            ["facebook", m.facebook, 200, "facebook.com/…"],
            ["instagram", m.instagram, 200, "instagram.com/…"],
            ["tiktok", m.tiktok, 200, "tiktok.com/@…"],
            ["website", m.website, 200, "www…"],
            ["email", m.email, 120, ""],
            ["wifi_name", m.wifiName, 60, ""],
            ["wifi_pass", m.wifiPass, 60, ""],
          ].map(([k, label, max, ph]) => (
            <Field key={k} label={label}>
              <input value={f.contact[k] || ""} maxLength={max} onChange={setC(k)} placeholder={ph} disabled={readOnly} data-testid={`mq-c-${k}`} />
            </Field>
          ))}
          <Field label={m.address} full>
            <input value={f.contact.address || ""} maxLength={300} onChange={setC("address")} disabled={readOnly} />
          </Field>
          <Field label={m.mapUrl} full>
            <input value={f.contact.map_url || ""} maxLength={400} onChange={setC("map_url")} placeholder="https://maps.app.goo.gl/…" disabled={readOnly} />
          </Field>
        </div>
      </section>
      <section className="panel-card">
        <h3 className="mq-h3">{m.money}</h3>
        <div className="md-fields-grid">
          <Field label={m.currency}>
            <select value={f.currency} onChange={set("currency")} disabled={readOnly}>
              <option value="USD">USD ($)</option>
              <option value="KHR">KHR (៛)</option>
            </select>
          </Field>
          <Field label={m.khrRate}>
            <input type="number" min="1000" max="10000" value={f.khr_rate} onChange={set("khr_rate")} disabled={readOnly} />
          </Field>
          <Field label={m.firstLang}>
            <select value={f.lang} onChange={set("lang")} disabled={readOnly}>
              <option value="km">ខ្មែរ</option>
              <option value="en">English</option>
            </select>
          </Field>
          <div className="mq-switches">
            <Switch checked={f.show_both} onChange={(v) => setF({ ...f, show_both: v })} label={m.showBoth} disabled={readOnly} />
            {ctx.on("mq_feedback") && <Switch checked={f.feedback_on} onChange={(v) => setF({ ...f, feedback_on: v })} label={m.feedbackOn} disabled={readOnly} />}
          </div>
        </div>
      </section>
      <section className="panel-card">
        <h3 className="mq-h3">{m.link}</h3>
        <Field hint={m.linkHint}>
          <div className="mq-slug">
            <span>{menuUrl("").replace(/^https?:\/\//, "")}</span>
            <input value={f.slug} maxLength={40} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} disabled={readOnly} data-testid="mq-slug" />
          </div>
        </Field>
      </section>
      {error && <div className="md-form-error">{error}</div>}
      <div className="mq-savebar">
        <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={readOnly || !!busy} data-testid="mq-profile-save">
          {busy === "save" ? <Loader2 size={16} className="md-spin" /> : <Save size={16} />} {busy === "save" ? m.saving : m.save}
        </button>
      </div>
    </div>
  );
}

function Picture({ ctx, field, label, round, wide, busy, setBusy }) {
  const { id, m, data, readOnly, notify } = ctx;
  const [picking, setPicking] = useState(false);
  const url = data.settings[field]?.url;
  const remove = async () => {
    setBusy(`${field}-x`);
    try {
      ctx.setSettings((await menuQrService.removePicture(id, field)).data);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className={`mq-pic ${round ? "round" : ""} ${wide ? "wide" : ""}`}>
      <small className="rs-muted">{label}</small>
      <button type="button" className="mq-pic-box" onClick={() => setPicking(true)} disabled={readOnly || !!busy} data-testid={`mq-${field}`}>
        {busy === field ? <Loader2 size={22} className="md-spin" /> : url ? <img src={url} alt="" /> : <ImagePlus size={22} />}
      </button>
      <span className="mq-pic-acts">
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setPicking(true)} disabled={readOnly || !!busy}>
          <Images size={13} /> {url ? m.change : m.fromMedia}
        </button>
        {url && (
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={remove} disabled={readOnly || !!busy}>
            {busy === `${field}-x` ? <Loader2 size={13} className="md-spin" /> : <Trash2 size={13} />} {m.remove}
          </button>
        )}
      </span>
      {picking && (
        <MediaPicker
          ctx={ctx}
          title={`${label} · ${m.pickTitle}`}
          onClose={() => setPicking(false)}
          onPick={async ([x]) => {
            setBusy(field);
            try {
              ctx.setSettings((await menuQrService.usePicture(id, field, x._id)).data);
              setPicking(false);
            } catch (e) {
              notify({ type: "error", text: e.message });
            } finally {
              setBusy("");
            }
          }}
        />
      )}
    </div>
  );
}
