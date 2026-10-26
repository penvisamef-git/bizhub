import { useEffect, useRef, useState } from "react";
import { Copy, CreditCard, ImagePlus, Link2, Lock, Pencil, Plus, QrCode, RotateCcw, Send, Trash2, X } from "lucide-react";
import { Switch } from "../menuqr/parts";
import CoinIcon from "../../../components/CoinIcon";
import { fill, fmtNum } from "./text";

const copy = (ctx, text) => {
  navigator.clipboard?.writeText(text).catch(() => {});
  ctx.notify({ type: "success", text: ctx.x.copied });
};
const unlockBtn = (ctx, addon) => (
  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon })} disabled={ctx.readOnly} data-testid={`ts-unlock-${addon}`}>
    <CoinIcon size={14} /> {ctx.x.addonNames[addon]} · {fmtNum(ctx.data.addons[addon]?.price)}
  </button>
);

// ---------------------------------------------------------------- the owner's own ways to pay
export function PayMethods({ ctx }) {
  const { x, api, data, put, readOnly } = ctx;
  const list = data.store.pay.custom || [];
  const more = ctx.on("ts_pay");
  const [edit, setEdit] = useState(null); // {} new | method
  const [busy, setBusy] = useState("");
  const pick = useRef(null);
  const [imgFor, setImgFor] = useState("");
  const used = (data.store.pay.khqr.on ? 1 : 0) + (data.store.pay.cash.on ? 1 : 0) + list.length;
  const canAdd = more || (list.length < 1 && used < data.pay_free);
  const done = (r) => put((d) => ({ store: { ...d.store, pay: { ...d.store.pay, custom: r.data } } }));
  const run = async (key, fn) => {
    setBusy(key);
    try {
      done(await fn());
      return true;
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
      return false;
    } finally {
      setBusy("");
    }
  };
  const save = async (e) => {
    e.preventDefault();
    if (!edit.name?.trim()) return;
    const body = { name: edit.name, info: edit.info };
    if (await run("save", () => (edit._id ? api.savePay(edit._id, body) : api.addPay(body)))) setEdit(null);
  };
  return (
    <section className="panel-card md-fields">
      <h3 className="ts-h3">
        <CreditCard size={17} /> {x.ownPay}
      </h3>
      <span className="md-hint">{x.ownPaySub}</span>
      {list.length > 0 && (
        <ul className="ts-paylist">
          {list.map((m) => (
            <li key={m._id} className={m.on ? "" : "is-off"} data-testid={`ts-pay-${m.name}`}>
              <span className="ts-pay-img">{m.image ? <img src={m.image} alt="" /> : <QrCode size={20} />}</span>
              <span className="ts-pay-text">
                <b>{m.name}</b>
                {m.info && <small>{m.info}</small>}
              </span>
              <Switch checked={m.on} onChange={(v) => run(m._id, () => api.savePay(m._id, { on: v }))} label="" disabled={readOnly || busy === m._id} />
              {more ? (
                <button
                  type="button"
                  className="md-icon-btn"
                  aria-label={m.image ? x.removeQr : x.addQr}
                  title={m.image ? x.removeQr : x.addQr}
                  disabled={readOnly}
                  onClick={() => {
                    if (m.image) run(m._id, () => api.removePayImage(m._id));
                    else {
                      setImgFor(m._id);
                      pick.current?.click();
                    }
                  }}
                >
                  {m.image ? <X size={15} /> : <ImagePlus size={15} />}
                </button>
              ) : (
                <span className="md-icon-btn ts-lock-ic" title={x.addonWhat.ts_pay}>
                  <Lock size={14} />
                </span>
              )}
              <button type="button" className="md-icon-btn" aria-label={x.edit} onClick={() => setEdit({ ...m })} disabled={readOnly}>
                <Pencil size={15} />
              </button>
              <button type="button" className="md-icon-btn" aria-label={x.delete} onClick={() => window.confirm(fill(x.removePayAsk, { name: m.name })) && run(m._id, () => api.removePay(m._id))} disabled={readOnly}>
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={pick}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file && imgFor) run(imgFor, () => api.payImage(imgFor, file));
        }}
      />
      {edit ? (
        <div className="ts-sub md-fields" onKeyDown={(e) => e.key === "Enter" && e.target.tagName === "INPUT" && save(e)}>
          <div className="ts-two">
            <div className="md-field">
              <label htmlFor="tp-pname">{x.payName}</label>
              <input id="tp-pname" value={edit.name || ""} maxLength={40} placeholder={x.payNamePh} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus required data-testid="ts-pay-name" />
            </div>
            <div className="md-field">
              <label htmlFor="tp-pinfo">{x.payInfo}</label>
              <input id="tp-pinfo" value={edit.info || ""} maxLength={300} placeholder={x.payInfoPh} onChange={(e) => setEdit({ ...edit, info: e.target.value })} data-testid="ts-pay-info" />
            </div>
          </div>
          <div className="ts-order-acts">
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={save} disabled={busy === "save" || !edit.name?.trim()} data-testid="ts-pay-save">
              {x.save}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setEdit(null)}>
              {x.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="ts-order-acts">
          {canAdd ? (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setEdit({ name: "", info: "" })} disabled={readOnly} data-testid="ts-add-pay">
              <Plus size={14} /> {x.addPay}
            </button>
          ) : null}
          {!more && (
            <div className="ts-locked-row">
              <Lock size={15} />
              <span>
                {x.freePay} {x.addonWhat.ts_pay}
              </span>
              {unlockBtn(ctx, "ts_pay")}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- a QR in the owner's colours, logo in the middle
export function StyledQr({ text, style, logo, size = 168 }) {
  const [svg, setSvg] = useState("");
  const fg = style?.fg || "#1F1A16";
  const bg = style?.bg || "#FFFFFF";
  const withLogo = !!(style?.logo && logo);
  useEffect(() => {
    let on = true;
    import("qrcode")
      .then((m) => m.default.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: withLogo ? "H" : "M", color: { dark: fg, light: bg } }))
      .then((s) => on && setSvg(s))
      .catch(() => on && setSvg(""));
    return () => {
      on = false;
    };
  }, [text, fg, bg, withLogo]);
  return (
    <div className="ts-qr ts-qr-styled" style={{ width: size, height: size, background: bg }} role="img" aria-label="QR">
      <div className="ts-qr-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      {withLogo && (
        <span className="ts-qr-logo">
          <img src={logo} alt="" />
        </span>
      )}
    </div>
  );
}
export async function downloadStyledQr(text, style, logo, name) {
  const m = await import("qrcode");
  const fg = style?.fg || "#000000";
  const bg = style?.bg || "#FFFFFF";
  const withLogo = !!(style?.logo && logo);
  const size = 1024;
  const canvas = document.createElement("canvas");
  await m.default.toCanvas(canvas, text, { width: size, margin: 2, errorCorrectionLevel: withLogo ? "H" : "M", color: { dark: fg, light: bg } });
  if (withLogo) {
    const img = await new Promise((resolve) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = logo;
    });
    if (img) {
      const c = canvas.getContext("2d");
      const box = size * 0.22;
      const x = (canvas.width - box) / 2;
      c.fillStyle = bg;
      c.beginPath();
      c.roundRect?.(x - 12, x - 12, box + 24, box + 24, 28);
      c.fill();
      try {
        c.save();
        c.beginPath();
        c.roundRect?.(x, x, box, box, 22);
        c.clip();
        c.drawImage(img, x, x, box, box);
        c.restore();
      } catch {
        /* a picture from another site without permission: keep the plain QR */
      }
    }
  }
  const a = document.createElement("a");
  try {
    a.href = canvas.toDataURL("image/png");
  } catch {
    a.href = await m.default.toDataURL(text, { width: size, margin: 2, color: { dark: fg, light: bg } });
  }
  a.download = name;
  a.click();
}

// ---------------------------------------------------------------- the post for the owner's channel (their own words)
export function ChannelCard({ ctx, link }) {
  const { x, api, data, put, readOnly } = ctx;
  const s = data.store;
  const [text, setText] = useState(s.channel_text || x.channelText);
  const [busy, setBusy] = useState(false);
  const out = fill(text, { name: s.shop_name, link });
  const save = async (value) => {
    setBusy(true);
    try {
      const r = await api.save({ channel_text: value === x.channelText ? "" : value });
      put({ store: r.data.store });
      ctx.notify({ type: "success", text: x.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel-card md-fields">
      <h3 className="ts-h3">
        <Send size={17} /> {x.channel}
      </h3>
      <p className="rs-muted">{x.channelSub}</p>
      <div className="md-field">
        <textarea rows={4} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} disabled={readOnly} aria-label={x.channel} data-testid="ts-channel-text" />
        <span className="md-hint">{x.channelEdit}</span>
      </div>
      <pre className="ts-channel">{out}</pre>
      <div className="ts-order-acts">
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => copy(ctx, out)}>
          <Copy size={14} /> {x.copyText}
        </button>
        <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => save(text)} disabled={readOnly || busy || text === (s.channel_text || x.channelText)} data-testid="ts-channel-save">
          {x.save}
        </button>
        {s.channel_text && (
          <button
            type="button"
            className="md-btn md-btn-ghost sa-btn-sm"
            onClick={() => {
              setText(x.channelText);
              save(x.channelText);
            }}
            disabled={readOnly || busy}
          >
            <RotateCcw size={14} /> {x.reset}
          </button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- own link name + QR style (ts_link)
export function LinkCard({ ctx }) {
  const { x, api, data, put, readOnly } = ctx;
  const s = data.store;
  const on = ctx.on("ts_link");
  const [slug, setSlug] = useState(s.slug);
  const [qr, setQr] = useState(() => ({ fg: s.qr?.fg || "#1F1A16", bg: s.qr?.bg || "#FFFFFF", logo: !!s.qr?.logo }));
  const [busy, setBusy] = useState("");
  const saveLink = async () => {
    setBusy("link");
    try {
      const r = await api.setLink(slug);
      put((d) => ({ store: { ...d.store, slug: r.data.slug }, links: r.data.links }));
      ctx.notify({ type: "success", text: x.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const saveQr = async (next) => {
    setQr(next);
    setBusy("qr");
    try {
      const r = await api.save({ qr: next });
      put({ store: r.data.store });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="panel-card md-fields">
      <h3 className="ts-h3">
        <Link2 size={17} /> {x.ownLink}
      </h3>
      <p className="rs-muted">{x.ownLinkSub}</p>
      {!on ? (
        <div className="ts-locked-row">
          <Lock size={15} />
          <span>{x.addonWhat.ts_link}</span>
          {unlockBtn(ctx, "ts_link")}
        </div>
      ) : (
        <div className="ts-link-edit">
          <div className="md-fields" style={{ flex: 1 }}>
            <div className="md-field">
              <label htmlFor="ts-slug">{x.linkName}</label>
              <div className="ts-promo-row">
                <span className="ts-slug-pre">/t/</span>
                <input id="ts-slug" value={slug} maxLength={30} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} disabled={readOnly} data-testid="ts-slug" />
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={saveLink} disabled={readOnly || busy === "link" || slug === s.slug || slug.length < 3} data-testid="ts-slug-save">
                  {x.saveLink}
                </button>
              </div>
              <span className="md-hint">{x.linkHint}</span>
            </div>
            <div className="ts-two">
              <div className="md-field">
                <label htmlFor="ts-qrfg">{x.qrColour}</label>
                <input id="ts-qrfg" type="color" className="ts-color" value={qr.fg} onChange={(e) => setQr({ ...qr, fg: e.target.value.toUpperCase() })} onBlur={() => saveQr(qr)} disabled={readOnly} />
              </div>
              <div className="md-field">
                <label htmlFor="ts-qrbg">{x.qrBg}</label>
                <input id="ts-qrbg" type="color" className="ts-color" value={qr.bg} onChange={(e) => setQr({ ...qr, bg: e.target.value.toUpperCase() })} onBlur={() => saveQr(qr)} disabled={readOnly} />
              </div>
            </div>
            <Switch checked={qr.logo} onChange={(v) => saveQr({ ...qr, logo: v })} label={x.qrLogo} disabled={readOnly || !s.logo} testid="ts-qr-logo" />
          </div>
          <StyledQr text={data.links.telegram || data.links.web} style={qr} logo={s.logo} size={150} />
        </div>
      )}
    </section>
  );
}
