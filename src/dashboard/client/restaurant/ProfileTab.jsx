import { useState } from "react";
import { restaurantService } from "../../../api/services";
import { COLORS } from "../../../namecard/CardView";
import useSettingsForm from "./useSettingsForm";
import ReceiptPreview from "./ReceiptPreview";
import { Field, ImagePick, SaveBar } from "./parts";

const KEYS = ["name_km", "name_en", "type", "phone", "address", "map_url", "hours", "tin", "color"];

// Profile: name, logo, cover, contact — shown on the POS, receipt and online menu
export default function ProfileTab({ ctx }) {
  const { r, settings, readOnly } = ctx;
  const { form, set, dirty, saving, save, undo } = useSettingsForm(ctx, KEYS);
  const [busy, setBusy] = useState("");

  const pick = async (kind, blob) => {
    setBusy(kind);
    try {
      const res = await restaurantService.uploadImage(ctx.id, kind, blob);
      ctx.setSettings(res.data, res.setup);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const drop = async (kind) => {
    setBusy(kind);
    try {
      const res = await restaurantService.removeImage(ctx.id, kind);
      ctx.setSettings(res.data, res.setup);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const noName = !String(form.name_km).trim() && !String(form.name_en).trim();

  return (
    <div className="rs-grid">
      <div className="rs-form">
        <section className="panel-card">
          <h2>{r.tabs.profile}</h2>
          <p className="rs-muted" style={{ margin: "-6px 0 16px" }}>
            {r.profileSub}
          </p>
          <div className="rs-images">
            <Field label={r.logo} hint={r.logoHint}>
              <ImagePick value={settings.logo?.url} busy={busy === "logo"} onPick={(b) => pick("logo", b)} onRemove={() => drop("logo")} r={r} maxSize={512} disabled={readOnly} />
            </Field>
            <Field label={r.cover} hint={r.coverHint}>
              <ImagePick value={settings.cover?.url} busy={busy === "cover"} onPick={(b) => pick("cover", b)} onRemove={() => drop("cover")} r={r} wide maxSize={1600} disabled={readOnly} />
            </Field>
          </div>
          <div className="md-fields-grid">
            <Field label={r.nameKm} htmlFor="rs-name-km">
              <input id="rs-name-km" maxLength={80} value={form.name_km} onChange={set("name_km")} disabled={readOnly} />
            </Field>
            <Field label={r.nameEn} htmlFor="rs-name-en">
              <input id="rs-name-en" maxLength={80} value={form.name_en} onChange={set("name_en")} disabled={readOnly} />
            </Field>
            <Field label={r.type} htmlFor="rs-type">
              <select id="rs-type" value={form.type} onChange={set("type")} disabled={readOnly}>
                {Object.entries(r.types).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={r.phone} htmlFor="rs-phone">
              <input id="rs-phone" type="tel" maxLength={30} value={form.phone} onChange={set("phone")} placeholder="012 345 678" disabled={readOnly} />
            </Field>
            <Field label={r.address} full htmlFor="rs-address">
              <input id="rs-address" maxLength={200} value={form.address} onChange={set("address")} disabled={readOnly} />
            </Field>
            <Field label={r.mapUrl} htmlFor="rs-map">
              <input id="rs-map" maxLength={300} value={form.map_url} onChange={set("map_url")} placeholder="maps.app.goo.gl/…" disabled={readOnly} />
            </Field>
            <Field label={r.hours} htmlFor="rs-hours">
              <input id="rs-hours" maxLength={120} value={form.hours} onChange={set("hours")} placeholder={r.hoursPh} disabled={readOnly} />
            </Field>
            <Field label={r.tin} htmlFor="rs-tin">
              <input id="rs-tin" maxLength={40} value={form.tin} onChange={set("tin")} placeholder="K001-123456789" disabled={readOnly} />
            </Field>
          </div>
          <h3 className="ne-sub">{r.color}</h3>
          <div className="ne-colors">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`ne-color ${String(form.color).toUpperCase() === c ? "on" : ""}`}
                style={{ background: c }}
                onClick={() => set("color")(c)}
                aria-label={c}
                aria-pressed={String(form.color).toUpperCase() === c}
                disabled={readOnly}
              />
            ))}
            <label className="ne-color-custom">
              <input type="color" value={form.color || "#E0581A"} onChange={(e) => set("color")(e.target.value.toUpperCase())} disabled={readOnly} />
              <span>{r.customColor}</span>
            </label>
          </div>
          {noName && (
            <div className="md-form-error" style={{ marginTop: 14 }}>
              {r.nameNeeded}
            </div>
          )}
        </section>
        <SaveBar dirty={dirty} saving={saving} onSave={save} onUndo={undo} r={r} disabled={readOnly || noName} />
      </div>
      <aside className="rs-side">
        <ReceiptPreview s={{ ...settings, ...form }} r={r} />
      </aside>
    </div>
  );
}
