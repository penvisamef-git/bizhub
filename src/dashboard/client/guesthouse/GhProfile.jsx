import { useRef, useState } from "react";
import { BedDouble, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { guestHouseService } from "../../../api/services";
import { Field } from "../restaurant/parts";

// one picture with upload / remove (logo, cover, guest-display image…)
export function PicBox({ ctx, kind, url, label, wide = false, round = false, onDone }) {
  const { g, readOnly } = ctx;
  const pick = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(""); // the picked file, shown while it uploads
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      ctx.notify({ type: "success", text: g.saved });
      await (onDone || ctx.reload)();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
      setPreview("");
    }
  };
  const shown = (busy && preview) || url;
  return (
    <div className={`ghp-pic ${wide ? "wide" : ""} ${round ? "round" : ""} ${busy ? "is-busy" : ""}`} aria-busy={busy || undefined}>
      <button type="button" className="ghp-pic-img" onClick={() => pick.current?.click()} disabled={readOnly || busy} aria-label={label}>
        {shown ? <img src={shown} alt="" /> : <ImagePlus size={26} />}
        {busy && (
          <span className="gh-uploading">
            <Loader2 size={26} className="gh-spin" />
          </span>
        )}
      </button>
      <div className="ghp-pic-side">
        <b>{label}</b>
        <span>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => pick.current?.click()} disabled={readOnly || busy}>
            {busy ? <Loader2 size={14} className="gh-spin" /> : <ImagePlus size={14} />} {busy ? g.uploading : url ? g.changeQr : g.upload}
          </button>
          {url && (
            <button type="button" className="md-btn md-btn-ghost sa-danger-text sa-btn-sm" onClick={() => run(() => guestHouseService.removePic(ctx.id, kind))} disabled={readOnly || busy}>
              <Trash2 size={14} />
            </button>
          )}
        </span>
      </div>
      <input
        ref={pick}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setPreview(URL.createObjectURL(file));
          run(() => guestHouseService.upload(ctx.id, kind, file));
        }}
      />
    </div>
  );
}

export function ProfileTab({ ctx }) {
  const { g, data, readOnly } = ctx;
  const b = data.business;
  const s = data.settings;
  const [f, setF] = useState({
    name: b.name || "",
    phone: b.phone || "",
    address: b.address || "",
    email: s.email || "",
    website: s.website || "",
    facebook: s.facebook || "",
    telegram: s.telegram || "",
    map_url: s.map_url || "",
    description: s.description || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await guestHouseService.saveProfile(ctx.id, f);
      await ctx.reload();
      ctx.notify({ type: "success", text: g.saved });
    } catch (err) {
      ctx.notify({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rs-col">
      <section className="panel-card ghp-prof">
        <div className="ghp-cover" style={s.cover?.url ? { backgroundImage: `url(${s.cover.url})` } : undefined}>
          <span className="ghp-cover-logo">{b.logo_url ? <img src={b.logo_url} alt="" /> : <BedDouble size={34} />}</span>
        </div>
        <div className="ghp-prof-head">
          <h2 style={{ margin: 0 }}>{b.name}</h2>
          <small className="rs-muted">{g.profSub}</small>
        </div>
        <div className="ghp-pics">
          <PicBox ctx={ctx} kind="logo" url={b.logo_url} label={g.logo} round />
          <PicBox ctx={ctx} kind="cover" url={s.cover?.url} label={g.cover} wide />
        </div>
      </section>
      <section className="panel-card">
        <h2>{g.profTitle}</h2>
        <form className="md-fields" onSubmit={save}>
          <Field label={g.bizName} htmlFor="gp-name">
            <input id="gp-name" maxLength={100} value={f.name} onChange={set("name")} />
          </Field>
          <div className="md-fields-grid">
            <Field label={g.phone} htmlFor="gp-phone">
              <input id="gp-phone" type="tel" maxLength={30} value={f.phone} onChange={set("phone")} placeholder="012 345 678" />
            </Field>
            <Field label={g.email} htmlFor="gp-email">
              <input id="gp-email" type="email" maxLength={120} value={f.email} onChange={set("email")} />
            </Field>
          </div>
          <Field label={g.address} htmlFor="gp-addr">
            <input id="gp-addr" maxLength={300} value={f.address} onChange={set("address")} />
          </Field>
          <Field label={g.mapUrl} htmlFor="gp-map">
            <input id="gp-map" maxLength={500} value={f.map_url} onChange={set("map_url")} placeholder="https://maps.app.goo.gl/…" />
          </Field>
          <div className="md-fields-grid">
            <Field label={g.facebook} htmlFor="gp-fb">
              <input id="gp-fb" maxLength={200} value={f.facebook} onChange={set("facebook")} placeholder="facebook.com/…" />
            </Field>
            <Field label={g.telegram} htmlFor="gp-tg">
              <input id="gp-tg" maxLength={100} value={f.telegram} onChange={set("telegram")} placeholder="@mekongview" />
            </Field>
          </div>
          <Field label={g.website} htmlFor="gp-web">
            <input id="gp-web" maxLength={200} value={f.website} onChange={set("website")} placeholder="https://" />
          </Field>
          <Field label={g.descriptionBiz} htmlFor="gp-desc">
            <textarea id="gp-desc" rows={3} maxLength={1000} value={f.description} onChange={set("description")} placeholder={g.descriptionBizPh} />
          </Field>
          <div className="at-save-row">
            <button type="submit" className="md-btn md-btn-primary" disabled={busy || readOnly || !f.name.trim()}>
              <Save size={15} /> {busy ? g.saving : g.save}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
