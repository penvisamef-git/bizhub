import { useState } from "react";
import { Building2, HardDrive, Loader2, StickyNote } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { myBusinessService } from "../../../api/services";
import { memo } from "../../../lib/memo";
import { Field, ImagePick } from "../restaurant/parts";
import { StorageBar } from "./NoteParts";
import { fmt, fmtDate } from "./text";
import { packsOf } from "./NoteAddons";

// Storage meter + the yearly plan + the +5 GB packs (bought on the add-ons page)
export function StorageTab({ ctx }) {
  const { m, data, lang } = ctx;
  const lic = data.license || {};
  const packs = packsOf(data).filter((p) => p.active);
  const mb = Math.round((data.book?.file_limit || 20 * 1048576) / 1048576);
  return (
    <div className="nt-more-page">
      <section className="panel-card nt-tab">
        <div className="nt-tab-head">
          <div>
            <h3>{m.storageTitle}</h3>
            <p className="rs-muted">{m.storageSub}</p>
          </div>
        </div>
        <StorageBar book={data.book} m={m} />
        <p className="rs-muted nt-perfile">{m.perFile.replace("{mb}", mb)}</p>
      </section>

      <section className="panel-card nt-plan">
        <span className="nt-plan-ic">
          <StickyNote size={22} />
        </span>
        <div className="nt-plan-text">
          <b>{m.plan}</b>
          {lic.expires_at && (
            <small className={lic.active ? "ok" : "end"}>
              {(lic.active ? m.planActive : m.planEnded).replace("{date}", fmtDate(lic.expires_at, lang))}
              {lic.active && lic.days_left != null && ` · ${m.planDays.replace("{n}", lic.days_left)}`}
            </small>
          )}
        </div>
        <button type="button" className="md-btn md-btn-primary" onClick={() => ctx.askBuy("digital_note")} disabled={ctx.suspended}>
          <CoinIcon size={15} /> {m.renew.replace("{coins}", fmt(ctx.prices.digital_note))}
        </button>
      </section>

      <section className={`panel-card nt-plan ${packs.length ? "on" : ""}`}>
        <span className="nt-plan-ic storage">
          <HardDrive size={22} />
        </span>
        <div className="nt-plan-text">
          <b>{m.packsTitle}</b>
          <small>{packs.length ? m.packsActive.replace("{n}", packs.length).replace("{gb}", packs.length * 5) : m.moreStorageSub}</small>
        </div>
        <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.go("addons")} disabled={ctx.suspended} data-testid="nt-buy-storage">
          <CoinIcon size={15} /> {m.packsAdd.replace("{gb}", 5).replace("{coins}", fmt(ctx.prices.note_storage))}
        </button>
      </section>
    </div>
  );
}

// the business name + logo (shown on the dashboard, in My businesses and on the shared pages)
export function ProfileTab({ ctx }) {
  const { m, api, data, id } = ctx;
  const biz = data.business || {};
  const [name, setName] = useState(biz.name || ctx.business?.name || "");
  const [busy, setBusy] = useState("");
  const saved = biz.name || ctx.business?.name || "";
  const logoUrl = biz.logo_url || ctx.business?.logo_url || "";
  const remember = (patch) => {
    // the businesses list (cached) shows the new name / logo at once
    const list = memo.get("myBusinesses");
    if (Array.isArray(list)) memo.set("myBusinesses", list.map((b) => (b._id === id ? { ...b, ...patch } : b)));
    ctx.put((d) => ({ business: { ...(d.business || {}), ...patch } }));
  };
  const saveName = async () => {
    const v = name.trim();
    if (v.length < 2 || v.length > 100) return ctx.notify({ type: "error", text: m.nameBad });
    setBusy("name");
    try {
      await myBusinessService.update(id, { name: v });
      remember({ name: v });
      ctx.notify({ type: "success", text: m.profileSaved });
    } catch (e) {
      ctx.onError(e);
    }
    setBusy("");
  };
  const logo = async (file) => {
    setBusy("logo");
    try {
      const r = file ? await api.logo(file) : await api.removeLogo();
      const url = r.data?.logo_url ?? (file ? logoUrl : "");
      remember({ logo_url: url, photo: url });
      ctx.notify({ type: "success", text: m.profileSaved });
    } catch (e) {
      ctx.onError(e);
    }
    setBusy("");
  };
  return (
    <section className="panel-card nt-tab nt-profile">
      <div className="nt-tab-head">
        <div>
          <h3>
            <Building2 size={18} /> {m.profileTitle}
          </h3>
          <p className="rs-muted">{m.profileSub}</p>
        </div>
      </div>
      <div className="nt-profile-preview" aria-hidden="true">
        <span className={`rs-logo nt-logo ${logoUrl ? "has-img" : ""}`}>{logoUrl ? <img src={logoUrl} alt="" /> : <StickyNote size={24} />}</span>
        <b>{name.trim() || saved || m.badge}</b>
      </div>
      <Field label={m.logo} hint={m.logoSub}>
        <ImagePick value={logoUrl} onPick={logo} onRemove={() => logo(null)} busy={busy === "logo"} r={{ uploading: m.uploading.replace("{p}", "…"), change: m.changePicture, upload: m.addPicture, remove: m.removePicture }} disabled={ctx.suspended} maxSize={512} />
      </Field>
      <Field label={m.bizName}>
        <div className="nt-profile-name">
          <input className="md-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={m.bizNamePh} data-testid="nt-biz-name" />
          <button type="button" className="md-btn md-btn-primary" onClick={saveName} disabled={busy === "name" || name.trim() === saved || ctx.suspended}>
            {busy === "name" && <Loader2 size={15} className="md-spin" />} {m.save}
          </button>
        </div>
      </Field>
    </section>
  );
}
