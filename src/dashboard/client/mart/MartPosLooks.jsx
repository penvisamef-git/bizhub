import { useCallback, useEffect, useState } from "react";
import { Check, Lock, Palette, Plus } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { POS_LOOK_KEYS, loadPosFont, posLookName, posLookOf } from "../../../pos/mart/posThemes";
import { useWText } from "./wtext";

const SAMPLE = [
  ["Coca", "#dc2626"],
  ["Bread", "#b45309"],
  ["Water", "#2563eb"],
  ["Chips", "#ca8a04"],
  ["Eggs", "#64748b"],
  ["Oil", "#16a34a"],
];

const PRESETS = ["#0F766E", "#0369A1", "#2563EB", "#4F46E5", "#7C3AED", "#BE185D", "#E11D48", "#DC2626", "#EA580C", "#D97706", "#65A30D", "#16A34A", "#334155", "#18181B"];

// a small picture of the POS in one look: top bar, product cards, the cart
export function PosThumb({ k, name, color = "" }) {
  const d0 = posLookOf(k);
  const d = color ? { ...d0, a: color, a2: `color-mix(in srgb, ${color} 62%, #ffffff)`, bg: `color-mix(in srgb, ${color} 6%, #f4f6f9)` } : d0;
  useEffect(() => loadPosFont(k), [k]);
  return (
    <div className={`pth pt-head-${d.head} pt-card-${d.card}`} style={{ "--a": d.a, "--a2": d.a2, "--bg": d.bg, "--r": `${Math.min(d.r, 18) * 0.6}px`, fontFamily: `'${d.font}', 'Kantumruy Pro', sans-serif` }} aria-hidden="true">
      <div className="pth-top">
        <b>{name}</b>
        <i />
        <i className="on" />
        <i />
      </div>
      <div className="pth-body">
        <div className="pth-grid">
          {SAMPLE.map(([n, c]) => (
            <span key={n} className="pth-p">
              <em style={{ background: c }}>{n.slice(0, 2)}</em>
              <small>{n}</small>
              <b>$1.25</b>
            </span>
          ))}
        </div>
        <div className="pth-cart">
          <span />
          <span />
          <span />
          <b className="pth-pay">$4.10</b>
        </div>
      </div>
    </div>
  );
}

// POS looks (mart_pos_theme): pick the look every POS device shows
export function PosLooks({ ctx }) {
  const { readOnly, lang } = ctx;
  const w = useWText();
  const [info, setInfo] = useState(null);
  const [pending, setPending] = useState("");
  const load = useCallback(
    () =>
      ctx.api
        .posThemes(ctx.id)
        .then((r) => setInfo(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx],
  );
  useEffect(() => {
    load();
  }, [load]);
  if (!info) return null;
  const setColor = async (c) => {
    setPending("");
    try {
      const r = await ctx.api.setPosColor(ctx.id, c);
      setInfo(r.data);
      ctx.notify({ type: "success", text: w.posLookSaved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const use = async (k) => {
    try {
      const r = await ctx.api.setPosTheme(ctx.id, k);
      setInfo(r.data);
      ctx.notify({ type: "success", text: w.posLookSaved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  return (
    <section className="panel-card">
      <div className="ms-head-top">
        <span className="ms-head-ic">
          <Palette size={22} />
        </span>
        <div className="ms-head-text">
          <h2>{w.posLooks}</h2>
          <small>{w.posLooksSub.replace("{price}", info.price)}</small>
        </div>
      </div>
      <div className="pth-colors">
        <small className="ghw-label">{w.posColor}</small>
        <div className="ws-color">
          <button type="button" className={`ws-swatch ${!info.color ? "on" : ""}`} onClick={() => setColor("")} style={{ background: posLookOf(info.current).a }} disabled={readOnly} title={w.colorLook}>
            {!info.color && <Check size={14} />}
          </button>
          <span className="rs-muted pth-or">{w.colorLookShort}</span>
          {PRESETS.map((c) => (
            <button key={c} type="button" className={`ws-swatch ${info.color === c ? "on" : ""}`} onClick={() => setColor(c)} style={{ background: c }} disabled={readOnly} aria-label={c}>
              {info.color === c && <Check size={14} />}
            </button>
          ))}
          <label className={`ws-swatch custom ${info.color && !PRESETS.includes(info.color) ? "on" : ""}`} style={info.color && !PRESETS.includes(info.color) ? { background: info.color } : undefined} title={w.colorCustom}>
            <input type="color" value={info.color || posLookOf(info.current).a} onChange={(e) => setPending(e.target.value.toUpperCase())} onBlur={() => pending && setColor(pending)} disabled={readOnly} />
            {info.color && !PRESETS.includes(info.color) ? <Check size={14} /> : <Plus size={14} />}
          </label>
        </div>
      </div>
      <div className="ghw-looks pth-looks">
        {POS_LOOK_KEYS.map((k) => {
          const owned = info.owned.includes(k);
          const current = info.current === k;
          return (
            <article key={k} className={`ghw-look ${current ? "on" : ""}`} data-look={k}>
              <PosThumb k={k} name={ctx.data.business.name} color={current ? info.color : ""} />
              {!owned && (
                <span className="ghl-lock">
                  <Lock size={12} />
                </span>
              )}
              {k === "classic" && <span className="ghl-free">{w.free}</span>}
              <div className="ghw-look-meta">
                <b>{posLookName(k, lang)}</b>
              </div>
              <div className="ghw-look-act">
                {current ? (
                  <span className="rs-pill ok">
                    <Check size={12} /> {w.inUse}
                  </span>
                ) : owned ? (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={readOnly} onClick={() => use(k)}>
                    {w.use}
                  </button>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "mart_pos_theme", item: k, onDone: load })} disabled={readOnly}>
                    <CoinIcon size={13} /> {info.price}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
