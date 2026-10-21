import { useEffect, useState } from "react";
import { Check, Monitor, Scale } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { money } from "./text";
import { useXText } from "./xtext";
import { parseScale } from "../../../pos/mart/scale";

// Weighing-scale barcodes (mart_scale): the label format the POS reads
export function ScaleCard({ ctx }) {
  const x = useXText();
  const { readOnly, cur } = ctx;
  const a = ctx.data.addons?.mart_scale || {};
  const [s, setS] = useState(null);
  useEffect(() => {
    ctx.api.scale(ctx.id).then(
      (r) => setS(r.data),
      () => {},
    );
  }, [ctx, a.active]);
  if (!s) return null;
  const save = async (patch) => {
    const next = { ...s, ...patch };
    setS(next);
    try {
      const r = await ctx.api.saveScale(ctx.id, { on: next.on, prefix: next.prefix, item_len: Number(next.item_len), mode: next.mode });
      setS({ ...next, ...r.data });
      ctx.notify({ type: "success", text: x.saved });
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "mart_scale" });
      else ctx.notify({ type: "error", text: e.message });
    }
  };
  // an example label for the format chosen
  const valLen = 12 - s.prefix.length - s.item_len;
  const item = "123".padStart(s.item_len, "0");
  const val = s.mode === "weight" ? "1250".padStart(valLen, "0") : (cur === "KHR" ? "5000" : "375").padStart(valLen, "0");
  const d12 = `${s.prefix}${item}${val}`.slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d12[i]) * (i % 2 ? 3 : 1);
  const code = d12 + ((10 - (sum % 10)) % 10);
  const parsed = parseScale(code, s, cur);
  return (
    <section className="panel-card">
      <div className="ms-head-top">
        <span className="ms-head-ic">
          <Scale size={22} />
        </span>
        <div className="ms-head-text">
          <h2>{x.scTitle}</h2>
          <small>{x.scSub}</small>
        </div>
        {!s.active && (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "mart_scale" })} disabled={readOnly}>
            <CoinIcon size={14} /> {x.unlockOnce.replace("{coins}", a.price ?? 50)}
          </button>
        )}
      </div>
      {s.active && (
        <div className="md-fields" style={{ marginTop: 12 }}>
          <label className="md-switch">
            <input type="checkbox" checked={s.on} onChange={(e) => save({ on: e.target.checked })} disabled={readOnly} data-testid="sc-on" />
            <span className="md-switch-track" />
            <span>{x.scOn}</span>
          </label>
          {s.on && (
            <>
              <div className="md-fields-grid">
                <label className="md-field">
                  <span>{x.prefix}</span>
                  <input inputMode="numeric" maxLength={2} value={s.prefix} onChange={(e) => setS({ ...s, prefix: e.target.value.replace(/\D/g, "") })} onBlur={() => /^\d{1,2}$/.test(s.prefix) && save({})} disabled={readOnly} />
                </label>
                <label className="md-field">
                  <span>{x.itemLen}</span>
                  <select value={s.item_len} onChange={(e) => save({ item_len: Number(e.target.value) })} disabled={readOnly}>
                    {[4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="at-seg">
                {["weight", "price"].map((k) => (
                  <button key={k} type="button" className={s.mode === k ? "on" : ""} onClick={() => save({ mode: k })} disabled={readOnly}>
                    {x.modes[k]}
                  </button>
                ))}
              </div>
              {parsed && (
                <p className="xs-example">
                  {x.scExample
                    .replace("{code}", code)
                    .replace("{item}", parsed.plu)
                    .replace("{value}", parsed.weight ? `${parsed.weight} kg` : money(parsed.price, cur))}
                </p>
              )}
              <small className="rs-muted">{x.scProducts.replace("{n}", s.products)}</small>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// Customer screen (mart_display): how to open it on the POS
export function DisplayCard({ ctx }) {
  const x = useXText();
  const a = ctx.data.addons?.mart_display || {};
  return (
    <section className="panel-card">
      <div className="ms-head-top">
        <span className="ms-head-ic">
          <Monitor size={22} />
        </span>
        <div className="ms-head-text">
          <h2>{x.dsTitle}</h2>
          <small>{a.active ? x.dsHow : x.dsSub}</small>
        </div>
        {a.active ? (
          <span className="rs-pill ok">
            <Check size={12} /> {x.activeForever}
          </span>
        ) : (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "mart_display" })} disabled={ctx.readOnly} data-testid="buy-mart_display">
            <CoinIcon size={14} /> {x.unlockOnce.replace("{coins}", a.price ?? 40)}
          </button>
        )}
      </div>
      {!a.active && (
        <ul className="at-perks" style={{ marginTop: 10 }}>
          {x.dsPerks.map((p) => (
            <li key={p}>
              <Check size={14} /> {p}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
