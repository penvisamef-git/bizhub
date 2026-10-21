import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { ExternalLink, KeyRound, MonitorSmartphone, Pencil, RefreshCw, Unplug } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { PUBLIC_SITE_URL } from "../../../config";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { Field } from "./parts";
import { usePosDashText } from "./pos-text";

const fmtMoney = (n, c) => (c === "KHR" ? `${new Intl.NumberFormat("en-US").format(Math.round(n || 0))}៛` : `$${(Number(n) || 0).toFixed(2)}`);

// POS: link devices (6-digit code), how they sync, recent shifts
export default function PosTab({ ctx }) {
  const { r, lang, readOnly } = ctx;
  const p = usePosDashText();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [pair, setPair] = useState(null);
  const [qr, setQr] = useState("");
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState("");
  const [renaming, setRenaming] = useState(null); // { id, name }
  const [sure, setSure] = useState(null);
  const posUrl = `${PUBLIC_SITE_URL}/pos/restaurant`;

  const load = useCallback(
    () =>
      restaurantService.pos.get(ctx.id).then((res) => {
        setData(res.data);
        setForm((f) => f || res.data.settings);
        if (res.data.pair) setPair(res.data.pair);
      }),
    [ctx.id],
  );
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
    QRCode.toDataURL(posUrl, { width: 320, margin: 1 }).then(setQr);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  // while a code is shown: tick the countdown, and refresh the list so the new device appears
  useEffect(() => {
    if (!pair) return undefined;
    const i = setInterval(() => setNow(Date.now()), 1000);
    const j = setInterval(() => load().catch(() => {}), 4000);
    return () => {
      clearInterval(i);
      clearInterval(j);
    };
  }, [pair, load]);
  useEffect(() => {
    if (pair && data && !data.pair) setPair(null); // the code was used
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (key, fn, ok) => {
    setBusy(key);
    try {
      await fn();
      if (ok) ctx.notify({ type: "success", text: ok });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const when = (d) => {
    if (!d) return p.never;
    const m = Math.round((Date.now() - new Date(d)) / 60000);
    if (m < 1) return p.justNow;
    if (m < 60) return p.minAgo.replace("{n}", m);
    if (m < 1440) return p.hourAgo.replace("{n}", Math.round(m / 60));
    return new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short" }).format(new Date(d));
  };

  if (!data || !form) return <ListSkeleton rows={4} />;
  const left = pair ? Math.max(0, Math.ceil((new Date(pair.expires_at) - now) / 1000)) : 0;
  const dirty = JSON.stringify(form) !== JSON.stringify(data.settings);
  const c = data.money?.currency || "USD";

  return (
    <div className="rs-col">
      <section className="panel-card pt-hero">
        <span className="pt-ic">
          <MonitorSmartphone size={26} />
        </span>
        <div>
          <h2>{p.title}</h2>
          <p className="rs-muted">{p.sub}</p>
        </div>
        <a className="md-btn md-btn-primary" href="/pos/restaurant" target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> {p.openPos}
        </a>
      </section>

      <section className="panel-card">
        <h2>{p.linkTitle}</h2>
        <div className="pt-link">
          <div className="pt-link-text">
            <p className="rs-muted" style={{ margin: 0 }}>
              {p.linkSub}
            </p>
            <code className="pt-url">{posUrl}</code>
            {pair && left > 0 ? (
              <>
                <div className="pt-code" aria-live="polite">
                  {pair.code.split("").map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>
                <small className="rs-muted">{p.codeFor.replace("{m}", `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`)}</small>
              </>
            ) : (
              pair && <small className="rs-muted">{p.expired}</small>
            )}
            <button type="button" className="md-btn md-btn-primary" onClick={() => act("code", async () => setPair((await restaurantService.pos.pairCode(ctx.id)).data))} disabled={readOnly || busy === "code"}>
              <KeyRound size={16} /> {pair ? p.newCode : p.getCode}
            </button>
          </div>
          {qr && (
            <figure className="pt-qr">
              <img src={qr} alt="" />
              <figcaption>{p.scan}</figcaption>
            </figure>
          )}
        </div>
      </section>

      <section className="panel-card">
        <div className="pe-list-head">
          <h2 style={{ margin: 0 }}>
            {p.devices} <small className="rs-muted">{data.devices.length}</small>
          </h2>
          <button type="button" className="md-icon-btn" onClick={() => act("reload", load)} aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
        {data.devices.length === 0 && <p className="rs-muted">{p.noDevices}</p>}
        <ul className="pt-devices">
          {data.devices.map((d) => (
            <li key={d._id}>
              <span className="pt-prefix">{d.prefix}</span>
              <div className="pt-dev-text">
                {renaming?.id === d._id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      act("rename", async () => {
                        await restaurantService.pos.renameDevice(ctx.id, d._id, renaming.name);
                        setRenaming(null);
                        await load();
                      });
                    }}
                  >
                    <input className="pt-rename" value={renaming.name} maxLength={40} onChange={(e) => setRenaming({ ...renaming, name: e.target.value })} autoFocus onBlur={() => setTimeout(() => setRenaming(null), 150)} />
                  </form>
                ) : (
                  <b>{d.name}</b>
                )}
                <small className="rs-muted">
                  <span className={`pt-dot ${d.last_seen && Date.now() - new Date(d.last_seen) < 120000 ? "on" : ""}`} /> {p.lastSeen.replace("{t}", when(d.last_seen))}
                  {d.pending > 0 && <span className="pt-wait"> · {p.waiting.replace("{n}", d.pending)}</span>}
                </small>
              </div>
              <button type="button" className="md-icon-btn" onClick={() => setRenaming({ id: d._id, name: d.name })} aria-label={p.rename} disabled={readOnly}>
                <Pencil size={15} />
              </button>
              {sure === d._id ? (
                <button
                  type="button"
                  className="md-btn md-btn-danger sa-btn-sm"
                  onClick={() =>
                    act("unlink", async () => {
                      await restaurantService.pos.removeDevice(ctx.id, d._id);
                      setSure(null);
                      await load();
                    })
                  }
                  onBlur={() => setSure(null)}
                  autoFocus
                >
                  {p.unlinkSure}
                </button>
              ) : (
                <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => setSure(d._id)} aria-label={p.unlink} disabled={readOnly}>
                  <Unplug size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-card">
        <h2>{p.settings}</h2>
        <Field label={p.syncMode}>
          <div className="pt-modes">
            {["instant", "5", "15", "30", "shift"].map((k) => (
              <label key={k} className={`pt-mode ${form.sync_mode === k ? "on" : ""} ${k === "shift" ? "risky" : ""}`}>
                <input type="radio" name="pt-mode" checked={form.sync_mode === k} onChange={() => setForm({ ...form, sync_mode: k })} disabled={readOnly} />
                <span>
                  <b>{p.modes[k][0]}</b>
                  <small>{p.modes[k][1]}</small>
                </span>
              </label>
            ))}
          </div>
        </Field>
        <label className="md-switch" style={{ marginTop: 6 }}>
          <input type="checkbox" checked={form.allow_offline} onChange={(e) => setForm({ ...form, allow_offline: e.target.checked })} disabled={readOnly} />
          <span className="md-switch-track" />
          <span>
            {p.allowOffline}
            <small className="rs-muted" style={{ display: "block" }}>
              {p.allowOfflineHint}
            </small>
          </span>
        </label>
        <div className="md-fields-grid" style={{ marginTop: 12 }}>
          <Field label={p.maxLineDiscount} hint={p.maxLineDiscountHint} htmlFor="pt-maxdisc">
            <select id="pt-maxdisc" value={form.max_line_discount ?? 100} onChange={(e) => setForm({ ...form, max_line_discount: Number(e.target.value) })} disabled={readOnly}>
              {[100, 50, 30, 20, 10, 0].map((v) => (
                <option key={v} value={v}>
                  {v}%
                </option>
              ))}
            </select>
          </Field>
        </div>
        {form.allow_offline && (
          <div className="md-fields-grid" style={{ marginTop: 12 }}>
            <Field label={p.maxOffline} hint={p.maxOfflineHint} htmlFor="pt-max">
              <select id="pt-max" value={form.max_offline_hours} onChange={(e) => setForm({ ...form, max_offline_hours: Number(e.target.value) })} disabled={readOnly}>
                {[4, 12, 24, 72].map((h) => (
                  <option key={h} value={h}>
                    {p.hours[h]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        <div className="tg-save">
          <span />
          <button
            type="button"
            className="md-btn md-btn-primary sa-btn-sm"
            disabled={!dirty || readOnly || busy === "save"}
            onClick={() =>
              act(
                "save",
                async () => {
                  const res = await restaurantService.pos.saveSettings(ctx.id, form);
                  setData((d) => ({ ...d, settings: res.data }));
                  setForm(res.data);
                },
                r.saved,
              )
            }
          >
            {busy === "save" ? r.saving : r.save}
          </button>
        </div>
      </section>

      <section className="panel-card">
        <h2>{p.shifts}</h2>
        {data.shifts.length === 0 ? (
          <p className="rs-muted">{p.noShifts}</p>
        ) : (
          <div className="pt-table-wrap">
            <table className="pt-table">
              <thead>
                <tr>
                  <th>{p.colWhen}</th>
                  <th>{p.colDevice}</th>
                  <th>{p.colStaff}</th>
                  <th className="num">{p.colBills}</th>
                  <th className="num">{p.colSales}</th>
                  <th className="num">{p.colDiff}</th>
                </tr>
              </thead>
              <tbody>
                {data.shifts.map((s) => {
                  const dev = data.devices.find((d) => String(d._id) === String(s.device_id));
                  const du = (s.counted?.usd || 0) - (s.expected?.usd || 0);
                  const dk = (s.counted?.khr || 0) - (s.expected?.khr || 0);
                  return (
                    <tr key={s._id}>
                      <td>{new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(s.opened_at))}</td>
                      <td>{dev ? `${dev.prefix} · ${dev.name}` : "—"}</td>
                      <td>{s.closed_by?.name || s.opened_by?.name}</td>
                      <td className="num">{s.status === "closed" ? (s.totals?.bills ?? 0) : <span className="rs-pill on">{p.open}</span>}</td>
                      <td className="num">{s.status === "closed" ? fmtMoney(s.totals?.sales, c) : "—"}</td>
                      <td className={`num ${du < 0 || dk < 0 ? "neg" : ""}`}>{s.status === "closed" ? `${du >= 0 ? "+" : "−"}${fmtMoney(Math.abs(du), "USD")} · ${dk >= 0 ? "+" : "−"}${fmtMoney(Math.abs(dk), "KHR")}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
