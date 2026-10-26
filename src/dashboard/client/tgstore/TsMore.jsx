import { useCallback, useEffect, useState } from "react";
import { Bike, Crosshair, ExternalLink, Loader2, Map as MapIcon, MapPin, Plus, Send, ShoppingCart, Trash2, Truck, Unplug, Users } from "lucide-react";
import { Head, Switch } from "../menuqr/parts";
import { Locked } from "./TsGrow";
import { ago, fill, fmtNum, money } from "./text";

const initial = (s) => (String(s || "?").trim()[0] || "?").toUpperCase();
const num = (v) => String(v ?? "").replace(/[^\d.]/g, "");

// ---------------------------------------------------------------- Delivery: zones + riders
export function DeliveryTab({ ctx }) {
  const { x } = ctx;
  return (
    <div className="rs-col">
      <Head icon={Truck} title={x.tabs.delivery} sub={x.deliverySub} />
      {!ctx.data.store.delivery?.on && <p className="md-notice">{x.deliveryOff}</p>}
      {ctx.on("ts_zones") ? <ZonesCard ctx={ctx} /> : <Locked ctx={ctx} addon="ts_zones" />}
      {ctx.on("ts_riders") ? <RidersCard ctx={ctx} /> : <Locked ctx={ctx} addon="ts_riders" />}
    </div>
  );
}

function ZonesCard({ ctx }) {
  const { x, api, data, put, readOnly, cur } = ctx;
  const z0 = data.store.zones || {};
  const [z, setZ] = useState(() => ({
    on: !!z0.on,
    kind: z0.kind || "area",
    areas: (z0.areas || []).map((a) => ({ ...a, fee: String(a.fee ?? ""), min_order: a.min_order ? String(a.min_order) : "" })),
    steps: (z0.steps?.length ? z0.steps : [{ upto: 3, fee: 1 }, { upto: 6, fee: 1.5 }, { upto: 10, fee: 2.5 }]).map((s) => ({ upto: String(s.upto), fee: String(s.fee) })),
    pin: z0.lat !== null && z0.lat !== undefined ? `${z0.lat}, ${z0.lng}` : "",
  }));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const sign = cur === "KHR" ? "៛" : "$";
  const set = (k, v) => setZ((o) => ({ ...o, [k]: v }));
  const row = (list, i, k, v) => set(list, z[list].map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const here = () => {
    if (!navigator.geolocation) return setError(x.noLocation);
    setBusy("here");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        set("pin", `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`);
        setBusy("");
      },
      () => {
        setError(x.noLocation);
        setBusy("");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const save = async () => {
    setBusy("save");
    setError("");
    try {
      const body = {
        on: z.on,
        kind: z.kind,
        areas: z.areas.filter((a) => a.name.trim()).map((a) => ({ ...(a._id ? { _id: a._id } : {}), name: a.name.trim(), fee: Number(a.fee) || 0, min_order: Number(a.min_order) || 0, on: a.on !== false })),
        steps: z.steps.filter((s) => Number(s.upto) > 0).map((s) => ({ upto: Number(s.upto), fee: Number(s.fee) || 0 })),
        pin: z.pin.trim() || null,
      };
      const r = await api.save({ zones: body });
      put({ store: r.data.store });
      const s = r.data.store.zones;
      setZ((o) => ({ ...o, areas: s.areas.map((a) => ({ ...a, fee: String(a.fee), min_order: a.min_order ? String(a.min_order) : "" })), pin: s.lat !== null ? `${s.lat}, ${s.lng}` : "" }));
      ctx.notify({ type: "success", text: x.saved });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  const pinOk = /^-?\d{1,2}\.\d+\s*,\s*-?\d{1,3}\.\d+$/.test(z.pin.trim());
  return (
    <section className="panel-card md-fields" data-testid="ts-zones">
      <h3 className="ts-h3">
        <MapIcon size={17} /> {x.addonNames.ts_zones}
      </h3>
      <p className="rs-muted">{x.zonesSub}</p>
      <Switch checked={z.on} onChange={(v) => set("on", v)} label={x.zonesOn} disabled={readOnly} testid="ts-zones-on" />
      <div className="ts-seg" style={{ maxWidth: 420 }}>
        {["area", "distance"].map((k) => (
          <button key={k} type="button" className={z.kind === k ? "on" : ""} onClick={() => set("kind", k)} disabled={readOnly} data-testid={`ts-zones-${k}`}>
            {k === "area" ? <MapPin size={15} /> : <Crosshair size={15} />} {x.zoneKinds[k]}
          </button>
        ))}
      </div>
      <span className="md-hint">{x.zoneKindHint[z.kind]}</span>

      {z.kind === "area" ? (
        <div className="ts-zone-rows">
          <div className="ts-zone-row head">
            <span>{x.areaName}</span>
            <span>{fill(x.feeIn, { sign })}</span>
            <span>{fill(x.minIn, { sign })}</span>
            <span />
          </div>
          {z.areas.map((a, i) => (
            <div key={a._id || `n${i}`} className={`ts-zone-row ${a.on === false ? "is-off" : ""}`}>
              <input value={a.name} maxLength={60} placeholder={x.areaPh} onChange={(e) => row("areas", i, "name", e.target.value)} disabled={readOnly} aria-label={x.areaName} data-testid={`ts-area-name-${i}`} />
              <input value={a.fee} inputMode="decimal" placeholder="0" onChange={(e) => row("areas", i, "fee", num(e.target.value))} disabled={readOnly} aria-label={x.deliveryFee} data-testid={`ts-area-fee-${i}`} />
              <input value={a.min_order} inputMode="decimal" placeholder={x.none} onChange={(e) => row("areas", i, "min_order", num(e.target.value))} disabled={readOnly} aria-label={x.minOrder} />
              <span className="ts-zone-acts">
                <Switch checked={a.on !== false} onChange={(v) => row("areas", i, "on", v)} disabled={readOnly} label="" />
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => set("areas", z.areas.filter((_, j) => j !== i))} disabled={readOnly} aria-label={x.remove}>
                  <Trash2 size={14} />
                </button>
              </span>
            </div>
          ))}
          <div>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => set("areas", [...z.areas, { name: "", fee: "", min_order: "", on: true }])} disabled={readOnly || z.areas.length >= 40} data-testid="ts-area-add">
              <Plus size={14} /> {x.addArea}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="md-field">
            <label htmlFor="ts-pin">{x.shopPin}</label>
            <div className="ts-promo-row">
              <input id="ts-pin" value={z.pin} maxLength={600} placeholder={x.pinPh} onChange={(e) => set("pin", e.target.value)} disabled={readOnly} data-testid="ts-shop-pin" />
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={here} disabled={readOnly || busy === "here"}>
                {busy === "here" ? <Loader2 size={14} className="md-spin" /> : <Crosshair size={14} />} {x.useHere}
              </button>
            </div>
            <span className="md-hint">
              {x.pinHint}
              {pinOk && (
                <>
                  {" · "}
                  <a href={`https://maps.google.com/?q=${z.pin.replace(/\s/g, "")}`} target="_blank" rel="noreferrer" className="sa-link">
                    <ExternalLink size={12} /> {x.openMap}
                  </a>
                </>
              )}
            </span>
          </div>
          <div className="ts-zone-rows">
            <div className="ts-zone-row head two">
              <span>{x.upTo}</span>
              <span>{fill(x.feeIn, { sign })}</span>
              <span />
            </div>
            {z.steps.map((s, i) => (
              <div key={i} className="ts-zone-row two">
                <span className="ts-unit-input">
                  <input value={s.upto} inputMode="decimal" onChange={(e) => row("steps", i, "upto", num(e.target.value))} disabled={readOnly} aria-label={x.upTo} data-testid={`ts-step-km-${i}`} />
                  <small>km</small>
                </span>
                <input value={s.fee} inputMode="decimal" onChange={(e) => row("steps", i, "fee", num(e.target.value))} disabled={readOnly} aria-label={x.deliveryFee} data-testid={`ts-step-fee-${i}`} />
                <span className="ts-zone-acts">
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => set("steps", z.steps.filter((_, j) => j !== i))} disabled={readOnly} aria-label={x.remove}>
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
            ))}
            <div>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => set("steps", [...z.steps, { upto: "", fee: "" }])} disabled={readOnly || z.steps.length >= 12}>
                <Plus size={14} /> {x.addStep}
              </button>
            </div>
            <span className="md-hint">{x.stepsHint}</span>
          </div>
        </>
      )}
      {error && <div className="md-form-error">{error}</div>}
      <div>
        <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={save} disabled={readOnly || busy === "save"} data-testid="ts-zones-save">
          {busy === "save" && <Loader2 size={14} className="md-spin" />} {x.save}
        </button>
      </div>
    </section>
  );
}

function RidersCard({ ctx }) {
  const { x, api, data, put, readOnly, cur } = ctx;
  const [d, setD] = useState(null);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(() => api.riders().then((r) => setD(r.data)).catch(() => setD({ connected: false, riders: [], waiting: 0, send_on: "accepted" })), [api]);
  useEffect(() => {
    load();
  }, [load]);
  const run = async (key, fn, ok) => {
    setBusy(key);
    try {
      const r = await fn();
      if (ok) ctx.notify({ type: "success", text: r?.message || ok });
      return r;
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
      return null;
    } finally {
      setBusy("");
    }
  };
  const sendOn = async (v) => {
    const r = await run("send", () => api.save({ riders: { send_on: v } }), x.saved);
    if (r) {
      put((dd) => ({ store: r.data.store, riders: { ...dd.riders, send_on: v } }));
      setD((o) => ({ ...o, send_on: v }));
    }
  };
  const refresh = async () => {
    await ctx.reload();
    load();
    setLink(null);
  };
  return (
    <>
      <section className="panel-card md-fields" data-testid="ts-riders">
        <h3 className="ts-h3">
          <Bike size={17} /> {x.addonNames.ts_riders}
        </h3>
        <p className="rs-muted">{x.ridersSub}</p>
        <ol className="ts-how">
          {x.ridersHow.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {!data.telegram.configured ? (
          <p className="md-notice">{x.tgNotReady}</p>
        ) : d === null ? (
          <div className="ts-skel" style={{ minHeight: 44 }} />
        ) : d.connected ? (
          <>
            <div className="ts-order-acts">
              <span className="ts-pill pay-paid" data-testid="ts-riders-connected">
                {fill(x.connected, { name: d.chat_name || "Telegram" })}
              </span>
              {d.waiting > 0 && <span className="ts-pill st-new">{fill(x.ridersWaitingN, { n: d.waiting })}</span>}
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={!!busy || readOnly} onClick={() => run("test", api.ridersTest, x.saved)}>
                <Send size={14} /> {x.test}
              </button>
              <button
                type="button"
                className="md-btn md-btn-ghost sa-btn-sm"
                disabled={!!busy || readOnly}
                onClick={() =>
                  run("off", api.ridersOff).then((r) => {
                    if (!r) return;
                    put((dd) => ({ riders: { ...dd.riders, connected: false, chat_name: "" } }));
                    setD((o) => ({ ...o, connected: false, chat_name: "" }));
                  })
                }
              >
                <Unplug size={14} /> {x.disconnect}
              </button>
            </div>
            <div className="md-field">
              <label>{x.sendWhen}</label>
              <div className="ts-seg" style={{ maxWidth: 480 }}>
                {["accepted", "ready", "manual"].map((k) => (
                  <button key={k} type="button" className={d.send_on === k ? "on" : ""} onClick={() => sendOn(k)} disabled={readOnly || !!busy} data-testid={`ts-send-${k}`}>
                    {x.sendOn[k]}
                  </button>
                ))}
              </div>
              <span className="md-hint">{x.sendOnHint[d.send_on]}</span>
            </div>
          </>
        ) : (
          <>
            <span className="rs-muted">{x.ridersNot}</span>
            {!link ? (
              <div>
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" disabled={!!busy || readOnly} onClick={() => run("link", api.ridersLink).then((r) => r && setLink(r.data))} data-testid="ts-riders-connect">
                  <Users size={14} /> {x.ridersConnect}
                </button>
              </div>
            ) : (
              <div className="ts-sub md-fields">
                <span className="md-hint">{x.ridersConnectHint}</span>
                <div className="ts-order-acts">
                  <a className="md-btn md-btn-primary sa-btn-sm" href={link.group_url} target="_blank" rel="noreferrer" data-testid="ts-riders-group">
                    <Users size={14} /> {x.connectGroup}
                  </a>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={refresh}>
                    {x.refresh}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      {d?.connected !== undefined && (
        <section className="panel-card ts-table-card">
          <h3 className="ts-h3 ts-card-title">
            {x.ridersTable}
          </h3>
          {!d.riders.length ? (
            <div className="ts-empty">
              <Bike size={28} />
              <p>{x.noRiders}</p>
            </div>
          ) : (
            <div className="ts-table-wrap">
              <table className="ts-table">
                <thead>
                  <tr>
                    <th>{x.rider}</th>
                    <th className="num">{x.delivered}</th>
                    <th className="num">{x.fees}</th>
                    <th className="num">{x.avgTime}</th>
                    <th>{x.lastRun}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.riders.map((r) => (
                    <tr key={r.tg_id} data-testid="ts-rider-row">
                      <td>
                        <span className="ts-who-cell">
                          <span className="ts-av">{initial(r.name)}</span>
                          <span>
                            <span className="ts-td-main">{r.name}</span>
                            {r.username && <small>@{r.username}</small>}
                          </span>
                        </span>
                      </td>
                      <td className="num">
                        <b>{fmtNum(r.delivered)}</b>
                        {r.taken > r.delivered && <small>/ {fmtNum(r.taken)}</small>}
                      </td>
                      <td className="num">{money(r.fees, cur)}</td>
                      <td className="num">{r.minutes === null ? "—" : fill(x.minN, { n: r.minutes })}</td>
                      <td>{r.last ? ago(r.last, x) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Cart reminder + Order again
const AFTER = [30, 60, 120, 180];
export function RemindTab({ ctx }) {
  const { x, api, readOnly, put, cur } = ctx;
  const on = ctx.on("ts_remind");
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      api
        .carts()
        .then((r) => {
          setD(r.data);
          setF((o) => o || r.data.settings);
        })
        .catch(() => setD({ rows: [], stats: { sent: 0, back: 0, back_total: 0 }, settings: { on: true, after_min: 60, text: "" } })),
    [api],
  );
  useEffect(() => {
    if (on) load();
  }, [on, load]);
  const save = async () => {
    setBusy(true);
    try {
      const r = await api.save({ remind: f });
      put({ store: r.data.store });
      ctx.notify({ type: "success", text: x.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const shop = ctx.data.store.shop_name;
  const preview = f?.text ? fill(f.text, { name: "Dara", shop, n: 2 }) : x.remindDefault;
  return (
    <div className="rs-col">
      <Head icon={ShoppingCart} title={x.tabs.remind} sub={x.remindSub} />
      {!on && <Locked ctx={ctx} addon="ts_remind" />}
      {on && !d && <div className="panel-card ts-skel" />}
      {on && d && f && (
        <>
          <div className="ts-kpis">
            {[
              [x.remindStats.sent, fmtNum(d.stats.sent)],
              [x.remindStats.back, fmtNum(d.stats.back)],
              [x.remindStats.rate, d.stats.sent ? `${Math.round((d.stats.back / d.stats.sent) * 100)}%` : "—"],
              [x.remindStats.total, money(d.stats.back_total, cur)],
            ].map(([k, v]) => (
              <div key={k} className="panel-card ts-kpi">
                <small>{k}</small>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <section className="panel-card ts-remind">
            <div className="md-fields" style={{ flex: 1 }}>
              <Switch checked={f.on} onChange={(v) => setF({ ...f, on: v })} label={x.remindOn} disabled={readOnly} testid="ts-remind-on" />
              <div className="md-field">
                <label>{x.remindAfter}</label>
                <div className="ts-seg" style={{ maxWidth: 420 }}>
                  {AFTER.map((m) => (
                    <button key={m} type="button" className={f.after_min === m ? "on" : ""} onClick={() => setF({ ...f, after_min: m })} disabled={readOnly} data-testid={`ts-after-${m}`}>
                      {m < 60 ? fill(x.minN, { n: m }) : fill(x.hourN, { n: m / 60 })}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md-field">
                <label htmlFor="ts-remind-text">{x.remindText}</label>
                <textarea id="ts-remind-text" rows={3} maxLength={300} value={f.text} placeholder={x.remindDefault} onChange={(e) => setF({ ...f, text: e.target.value })} disabled={readOnly} data-testid="ts-remind-text" />
                <span className="md-hint">{x.remindTextHint}</span>
              </div>
              <div>
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={save} disabled={readOnly || busy} data-testid="ts-remind-save">
                  {busy && <Loader2 size={14} className="md-spin" />} {x.save}
                </button>
              </div>
            </div>
            <div className="ts-tg-preview" aria-label={x.preview}>
              <small>{x.preview}</small>
              <div className="ts-tg-bubble">
                <b>🛒 {shop}</b>
                <p>{preview}</p>
                <span className="ts-tg-btn">🛒 {x.finishOrder}</span>
              </div>
              <p className="md-hint">{x.againHint}</p>
            </div>
          </section>
          <section className="panel-card ts-table-card">
            <h3 className="ts-h3 ts-card-title">
              {x.leftCarts}
            </h3>
            {d.rows.length === 0 ? (
              <div className="ts-empty">
                <ShoppingCart size={28} />
                <p>{x.noCarts}</p>
              </div>
            ) : (
              <div className="ts-table-wrap">
                <table className="ts-table">
                  <thead>
                    <tr>
                      <th>{x.custCols.who}</th>
                      <th className="num">{x.itemsN}</th>
                      <th className="num">{x.total}</th>
                      <th>{x.when}</th>
                      <th>{x.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.rows.map((c) => (
                      <tr key={c._id} data-testid="ts-cart-row">
                        <td>
                          <span className="ts-who-cell">
                            <span className="ts-av">{initial(c.name)}</span>
                            <span>
                              <span className="ts-td-main">{c.name || "Telegram"}</span>
                              {c.username && <small>@{c.username}</small>}
                            </span>
                          </span>
                        </td>
                        <td className="num">{fmtNum(c.n)}</td>
                        <td className="num">
                          <b>{money(c.total, cur)}</b>
                        </td>
                        <td>{ago(c.at, x)}</td>
                        <td>
                          <span className={`ts-pill ${c.reminded ? "pay-paid" : c.can_message ? "st-new" : ""}`}>{c.reminded ? x.cartReminded : c.can_message ? x.cartWaiting : x.cartNoMsg}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
