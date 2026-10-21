import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Check, ImagePlus, Loader2, Lock, MonitorUp, Trash2 } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import { resizeImage } from "../../../lib/image";
import { DisplayView } from "../../../pos/DisplayView";
import { calcOrder, lineTotal, otherCurrency } from "../../../pos/calc";
import { DISPLAY_THEMES, themeDesc, themeName } from "../../../pos/themes";
import { AddonPrompt, Field, SaveBar } from "./parts";
import { useExtrasText } from "./extras-text";
import { moneyOfSettings, sampleOrder } from "./ReceiptTab";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const FORM_KEYS = ["theme", "color", "header", "welcome", "thanks", "footer", "show_logo", "slide_seconds", "thanks_blur"];
const pick = (d) => Object.fromEntries(FORM_KEYS.map((k) => [k, d[k]]));

// Customer display (add-on): texts, pictures and look of the screen facing the guest, with a live preview
export default function DisplayTab({ ctx }) {
  const { r, lang, settings, readOnly } = ctx;
  const x = useExtrasText();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(""); // which picture slot is uploading
  const [buying, setBuying] = useState(null);
  const [mode, setMode] = useState("idle");

  const load = useCallback(
    () =>
      restaurantService.display.get(ctx.id).then((res) => {
        setData(res.data);
        setForm((f) => f || pick(res.data.display));
      }),
    [ctx.id],
  );
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const money = moneyOfSettings(settings);
  const sample = useMemo(() => sampleOrder(x), [x]);
  if (!data || !form) return <ListSkeleton rows={4} />;
  const active = data.active;
  const dirty = JSON.stringify(form) !== JSON.stringify(pick(data.display));
  const set = (k) => (e) => setForm({ ...form, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e });
  const ownedTheme = (k) => data.themes.free.includes(k) || data.themes.owned.includes(k);

  // what the guest's screen would show now
  const t = calcOrder(sample, money);
  const pic = {
    v: 1,
    mode,
    restaurant: { name_km: settings.name_km, name_en: settings.name_en, logo: settings.logo?.url || "", color: settings.color || "" },
    look: { ...data.display, ...form, banners: data.display.banners, side_banners: data.display.side_banners, thanks_bg: data.display.thanks_bg },
    currency: money.currency,
    other: money.currency === "USD" ? "KHR" : "USD",
    rate: money.khr_rate,
    order: {
      number: sample.number,
      table: sample.table_name,
      lines: sample.lines.map((l) => ({ id: l.id, qty: l.qty, name_km: l.name_km, name_en: l.name_en, size: "", addons: l.addons.map((a) => a.name), total: lineTotal(l) })),
      totals: { ...t, other: otherCurrency(t.total, money) },
    },
    change: { usd: 0, khr: Math.round(((20 - t.total) * money.khr_rate) / 100) * 100 },
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await restaurantService.display.save(ctx.id, form);
      setData(res.data);
      setForm(pick(res.data.display));
      ctx.notify({ type: "success", text: r.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };
  const upload = async (files, slot = "banner") => {
    setUploading(slot);
    try {
      let res = null;
      for (const f of files) res = await restaurantService.display.uploadImage(ctx.id, await resizeImage(f, 1920), slot);
      if (res) setData(res.data);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setUploading(false);
    }
  };
  const removeImage = async (i, slot = "banner") => {
    try {
      setData((await restaurantService.display.removeImage(ctx.id, i, slot)).data);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };

  return (
    <div className="xd">
      <div className="rs-col">
        <section className="panel-card pt-hero">
          <span className="pt-ic">
            <MonitorUp size={26} />
          </span>
          <div>
            <h2>{x.cdTitle}</h2>
            <p className="rs-muted">{x.cdSub}</p>
          </div>
        </section>

        {!active ? (
          <section className="panel-card">
            <AddonPrompt addonKey="rest_display" ctx={ctx} />
          </section>
        ) : (
          <>
            <section className="panel-card">
              <p className="rs-muted" style={{ marginTop: 0 }}>
                {x.cdHow}
              </p>
              <h2>{x.texts}</h2>
              <div className="md-fields-grid">
                <Field label={x.welcome} htmlFor="xd-welcome">
                  <input id="xd-welcome" maxLength={80} value={form.welcome} onChange={set("welcome")} placeholder={x.welcomePh} disabled={readOnly} onFocus={() => setMode("idle")} />
                </Field>
                <Field label={x.thanks} htmlFor="xd-thanks">
                  <input id="xd-thanks" maxLength={80} value={form.thanks} onChange={set("thanks")} placeholder={x.thanksPh} disabled={readOnly} onFocus={() => setMode("thanks")} />
                </Field>
                <Field label={x.header} htmlFor="xd-header">
                  <input id="xd-header" maxLength={80} value={form.header} onChange={set("header")} placeholder={x.headerPh} disabled={readOnly} />
                </Field>
                <Field label={x.footer} htmlFor="xd-footer">
                  <input id="xd-footer" maxLength={120} value={form.footer} onChange={set("footer")} placeholder={x.footerPh} disabled={readOnly} />
                </Field>
              </div>
              <label className="md-switch" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={form.show_logo} onChange={set("show_logo")} disabled={readOnly} />
                <span className="md-switch-track" />
                {x.showLogo}
              </label>
            </section>

            <section className="panel-card">
              <h2>{x.pictures}</h2>
              <PicGrid list={data.banners} max={data.max_banners} slot="banner" busy={uploading === "banner"} onAdd={upload} onRemove={removeImage} add={x.addPictures} r={r} disabled={readOnly} />
              <small className="rs-hint">{x.picturesHint.replace("{n}", data.max_banners)}</small>
              {data.banners.length + data.side_banners.length > 1 && (
                <div className="md-fields-grid" style={{ marginTop: 10 }}>
                  <Field label={x.slide} htmlFor="xd-slide">
                    <select id="xd-slide" value={form.slide_seconds} onChange={(e) => setForm({ ...form, slide_seconds: Number(e.target.value) })} disabled={readOnly}>
                      {[4, 6, 10, 15].map((n) => (
                        <option key={n} value={n}>
                          {x.seconds.replace("{n}", n)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </section>

            <section className="panel-card">
              <h2>{x.sidePictures}</h2>
              <PicGrid list={data.side_banners} max={data.max_side} slot="side" busy={uploading === "side"} onAdd={upload} onRemove={removeImage} add={x.addPictures} r={r} disabled={readOnly} onFocus={() => setMode("order")} />
              <small className="rs-hint">{x.sideHint.replace("{n}", data.max_side)}</small>
            </section>

            <section className="panel-card">
              <h2>{x.thanksPicture}</h2>
              <div className="xd-thanks-pic">
                <PicGrid
                  list={data.display.thanks_bg ? [{ url: data.display.thanks_bg }] : []}
                  max={1}
                  slot="thanks"
                  busy={uploading === "thanks"}
                  onAdd={upload}
                  onRemove={removeImage}
                  add={x.addPicture}
                  r={r}
                  disabled={readOnly}
                  onFocus={() => setMode("thanks")}
                />
                <label className="xd-blur" onMouseDown={() => setMode("thanks")}>
                  <span>
                    {x.blur} <b>{form.thanks_blur}%</b>
                  </span>
                  <input type="range" min="0" max="100" step="5" value={form.thanks_blur} onChange={(e) => setForm({ ...form, thanks_blur: Number(e.target.value) })} disabled={readOnly || !data.display.thanks_bg} />
                </label>
              </div>
              <small className="rs-hint">{x.thanksPictureHint}</small>
            </section>

            <section className="panel-card">
              <h2>{x.looks}</h2>
              <p className="rs-muted" style={{ marginTop: 0 }}>
                {x.looksSub}
              </p>
              <div className="xd-looks">
                {[...data.themes.free, ...data.themes.paid].map((k) => {
                  const on = form.theme === k;
                  const have = ownedTheme(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`xd-look ${on ? "on" : ""} ${have ? "" : "locked"}`}
                      onClick={() => {
                        setMode("order");
                        if (have) setForm({ ...form, theme: k });
                        else setBuying(k);
                      }}
                      disabled={readOnly}
                    >
                      <ScaledScreen mini>
                        <DisplayView pic={{ ...pic, mode: "order", look: { ...pic.look, theme: k } }} embedded />
                      </ScaledScreen>
                      <span className="xd-look-text">
                        <b>
                          {themeName(DISPLAY_THEMES, k, lang)} {on && <Check size={14} />}
                        </b>
                        <small>{themeDesc(DISPLAY_THEMES, k, lang)}</small>
                      </span>
                      <span className="xd-look-state">
                        {data.themes.free.includes(k) ? (
                          x.free
                        ) : have ? (
                          <>
                            <BadgeCheck size={13} /> {x.owned}
                          </>
                        ) : (
                          <>
                            <Lock size={13} /> <CoinIcon size={13} /> {fmt(data.themes.price)}
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <h3 className="xd-sub">{x.colour}</h3>
              <div className="xd-colors" role="radiogroup" aria-label={x.colour}>
                <button type="button" className={`xd-color auto ${!form.color ? "on" : ""}`} onClick={() => setForm({ ...form, color: "" })} disabled={readOnly} title={x.colourAuto}>
                  {x.colourAuto}
                </button>
                {data.colors.map((c) => (
                  <button key={c} type="button" className={`xd-color ${form.color === c ? "on" : ""}`} style={{ background: c }} onClick={() => setForm({ ...form, color: c })} disabled={readOnly} aria-label={c} title={c}>
                    {form.color === c && <Check size={16} />}
                  </button>
                ))}
              </div>
            </section>
            <SaveBar dirty={dirty} saving={saving} onSave={save} onUndo={() => setForm(pick(data.display))} r={r} disabled={readOnly} />
          </>
        )}
      </div>

      <aside className="xd-side">
        <div className="xd-preview-head">
          <b>{x.preview}</b>
          <div className="rp-views small">
            {[
              ["idle", x.pvIdle],
              ["order", x.pvOrder],
              ["thanks", x.pvThanks],
            ].map(([k, label]) => (
              <button key={k} type="button" className={mode === k ? "on" : ""} onClick={() => setMode(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <ScaledScreen>
          <DisplayView pic={pic} embedded />
        </ScaledScreen>
      </aside>

      {buying && (
        <PurchaseModal
          stage={
            <div className="rs-stage">
              <div className="xd-stage-screen">
                <ScaledScreen mini>
                  <DisplayView pic={{ ...pic, mode: "order", look: { ...pic.look, theme: buying } }} embedded />
                </ScaledScreen>
              </div>
              <b>{themeName(DISPLAY_THEMES, buying, lang)}</b>
            </div>
          }
          badge={x.cdTitle}
          title={x.lookBuyTitle.replace("{name}", themeName(DISPLAY_THEMES, buying, lang))}
          sub={x.lookBuySub}
          perks={[x.lookPerk, `${r.oneTime} · ${r.forever}`]}
          price={data.themes.price}
          buyLabel={r.buy.replace("{coins}", `${fmt(data.themes.price)} ${r.coins}`)}
          buy={() => restaurantService.display.buyTheme(ctx.id, buying)}
          doneSub={x.lookDone.replace("{name}", themeName(DISPLAY_THEMES, buying, lang))}
          onDone={() => {
            setForm((f) => ({ ...f, theme: buying }));
            load();
          }}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}

// pictures of one slot (waiting / beside the order / thank-you) with add + remove
function PicGrid({ list, max, slot, busy, onAdd, onRemove, add, r, disabled, onFocus }) {
  const ref = useRef(null);
  return (
    <div className="ws-gallery xd-gallery" onMouseEnter={onFocus}>
      {list.map((b, i) => (
        <span key={b.url} className="ws-shot xd-shot">
          <img src={b.url} alt="" />
          <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => onRemove(i, slot)} aria-label={r.remove} disabled={disabled || busy}>
            <Trash2 size={14} />
          </button>
        </span>
      ))}
      {list.length < max && (
        <button type="button" className="ws-shot xd-shot add" onClick={() => ref.current?.click()} disabled={disabled || busy}>
          {busy ? <Loader2 size={20} className="md-spin" /> : <ImagePlus size={20} />}
          <small>{add}</small>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={max > 1}
        hidden
        onChange={(e) => {
          const files = [...(e.target.files || [])].slice(0, max - list.length);
          e.target.value = "";
          if (files.length) onAdd(files, slot);
        }}
      />
    </div>
  );
}

// a 1280×720 screen shrunk to fit its box
function ScaledScreen({ children, mini }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setScale(el.clientWidth / 1280);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className={`xd-screen ${mini ? "mini" : ""}`} ref={box} style={{ height: 720 * scale }}>
      <div className="xd-screen-inner" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
