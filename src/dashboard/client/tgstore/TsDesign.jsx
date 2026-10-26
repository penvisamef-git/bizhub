import { useMemo, useState } from "react";
import { Check, ExternalLink, Lock, Palette } from "lucide-react";
import { Head } from "../menuqr/parts";
import CoinIcon from "../../../components/CoinIcon";
import { LAYOUTS, THEMES, themeName, themeVars, themeOf } from "../../../tgstore/themes";
import { fill, fmtNum } from "./text";

const SWATCHES = ["#C4470F", "#E11D48", "#F97316", "#F59E0B", "#65A30D", "#10A37F", "#0E7490", "#229ED9", "#2563EB", "#7C3AED", "#DB2777", "#1F1A16"];

// a small picture of a design: its colours + how it is laid out
export function MiniStore({ themeKey, color, name, logo }) {
  const t = themeOf(themeKey);
  const tiles = t.layout.key === "compact" ? 6 : t.layout.key === "big" ? 2 : t.layout.key === "magazine" ? 3 : 4;
  return (
    <div className={`tsm tsm-${t.layout.key} ${t.palette.dark ? "is-dark" : ""}`} style={themeVars(themeKey, color)} aria-hidden="true">
      <div className="tsm-head">
        <span className="tsm-logo">{logo ? <img src={logo} alt="" /> : null}</span>
        <span className="tsm-title">{name}</span>
      </div>
      <div className="tsm-chips">
        <i className="on" />
        <i />
        <i />
      </div>
      <div className="tsm-items">
        {Array.from({ length: tiles }, (_, i) => (
          <span key={i} className="tsm-item">
            <span className="tsm-pic" />
            <span className="tsm-lines">
              <b />
              <em />
            </span>
            <span className="tsm-plus" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function DesignTab({ ctx }) {
  const { x, lang, api, data, put, readOnly } = ctx;
  const s = data.store;
  const owned = useMemo(() => new Set(data.themes.owned), [data.themes.owned]);
  const [layout, setLayout] = useState("");
  const [only, setOnly] = useState(""); // "" | "mine"
  const [busy, setBusy] = useState("");
  const [color, setColor] = useState(s.color || "");
  const list = THEMES.filter((t) => (!layout || t.layout.key === layout) && (!only || owned.has(t.key)));
  const preview = (key) => `${data.links.web}?theme=${key}`;
  const saveColor = async (value) => {
    setColor(value);
    setBusy("color");
    try {
      const r = await api.save({ color: value });
      put({ store: r.data.store });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const use = async (key) => {
    setBusy(key);
    try {
      const r = await api.useTheme(key);
      put((d) => ({ store: { ...d.store, theme: r.data.theme }, themes: { ...d.themes, owned: r.data.owned } }));
      ctx.notify({ type: "success", text: x.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rs-col">
      <Head icon={Palette} title={x.tabs.design} sub={x.designSub}>
        <a className="md-btn md-btn-ghost sa-btn-sm" href={data.links.web} target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> {x.openStore}
        </a>
      </Head>
      <section className="panel-card ts-design-top">
        <MiniStore themeKey={s.theme} color={s.color} name={s.shop_name} logo={s.logo} />
        <div className="md-fields" style={{ flex: 1 }}>
          <div>
            <small className="rs-muted">{x.using}</small>
            <h3 className="ts-design-name">{themeName(s.theme, lang)}</h3>
          </div>
          <div className="md-field">
            <label>{x.colour}</label>
            <div className="ts-seg" style={{ maxWidth: 360 }}>
              <button type="button" className={!color ? "on" : ""} onClick={() => saveColor("")} disabled={readOnly}>
                {x.themeColour}
              </button>
              <button type="button" className={color ? "on" : ""} onClick={() => saveColor(color || themeOf(s.theme).palette.accent)} disabled={readOnly}>
                {x.ownColour}
              </button>
            </div>
          </div>
          {color && (
            <div className="ts-swatches">
              {SWATCHES.map((c) => (
                <button key={c} type="button" className={`ts-swatch ${c === color ? "on" : ""}`} style={{ background: c }} onClick={() => saveColor(c)} aria-label={c} disabled={readOnly}>
                  {c === color && <Check size={14} />}
                </button>
              ))}
              <label className="ts-swatch ts-swatch-pick" title={x.colour}>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} onBlur={(e) => saveColor(e.target.value.toUpperCase())} disabled={readOnly} data-testid="ts-colour" />
              </label>
              {busy === "color" && <small className="rs-muted">…</small>}
            </div>
          )}
        </div>
      </section>
      <section className="panel-card">
        <div className="ts-design-bar">
          <b>{fill(x.designsN, { n: list.length })}</b>
          <div className="ts-chips">
            <button type="button" className={!layout ? "on" : ""} onClick={() => setLayout("")}>
              {x.allLayouts}
            </button>
            {LAYOUTS.map((l) => (
              <button key={l.key} type="button" className={layout === l.key ? "on" : ""} onClick={() => setLayout(l.key)}>
                {l[lang] || l.en}
              </button>
            ))}
            <button type="button" className={only ? "on" : ""} onClick={() => setOnly(only ? "" : "mine")}>
              <Check size={13} /> {x.owned}
            </button>
          </div>
        </div>
        <div className="ts-designs">
          {list.map((t) => {
            const mine = owned.has(t.key);
            const using = s.theme === t.key;
            const free = data.themes.free.includes(t.key);
            return (
              <article key={t.key} className={`ts-design ${using ? "is-using" : ""}`} data-testid={`ts-design-${t.key}`}>
                <MiniStore themeKey={t.key} color={s.color} name={s.shop_name} logo={s.logo} />
                <div className="ts-design-foot">
                  <span className="ts-design-label">
                    <b>{themeName(t.key, lang)}</b>
                    <small className={using ? "is-on" : ""}>
                      {using ? (
                        <>
                          <Check size={12} /> {x.using}
                        </>
                      ) : free ? (
                        x.free
                      ) : mine ? (
                        x.owned
                      ) : (
                        <>
                          <Lock size={11} /> <CoinIcon size={12} /> {fmtNum(data.themes.price)}
                        </>
                      )}
                    </small>
                  </span>
                  <span className="ts-design-acts">
                    <a className="md-icon-btn" href={preview(t.key)} target="_blank" rel="noreferrer" aria-label={x.tryIt} title={x.tryIt}>
                      <ExternalLink size={15} />
                    </a>
                    {!using &&
                      (mine ? (
                        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => use(t.key)} disabled={readOnly || !!busy} data-testid={`ts-use-${t.key}`}>
                          {x.use}
                        </button>
                      ) : (
                        <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ theme: t.key })} disabled={readOnly} data-testid={`ts-buy-${t.key}`}>
                          <CoinIcon size={13} /> {fmtNum(data.themes.price)}
                        </button>
                      ))}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
