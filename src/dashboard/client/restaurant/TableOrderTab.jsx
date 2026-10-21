import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { BadgeCheck, Check, Copy, ExternalLink, HandPlatter, Loader2, LocateFixed, Lock, Music, Play, Printer, RefreshCw, Trash2, Upload } from "lucide-react";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import { ORDER_THEMES, QR_THEMES, themeDesc, themeName } from "../../../pos/themes";
import { useExtrasText } from "./extras-text";
import QrSticker from "./QrSticker";
import OrderThemeMock from "./OrderThemeMock";
import { restaurantService } from "../../../api/services";
import { PUBLIC_SITE_URL } from "../../../config";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { AddonPrompt, Field } from "./parts";
import { fmtMoney } from "./text";
import { useToText } from "./to-text";

const qr = (text, width = 480) => QRCode.toDataURL(text, { width, margin: 1, color: { dark: "#16171b", light: "#ffffff" } });
const RADII = [50, 100, 200, 500, 0];
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// the same chime the POS plays when no sound is uploaded
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ctx.currentTime;
    [
      [880, 0],
      [1175, 0.18],
      [1568, 0.36],
      [880, 0.9],
      [1175, 1.08],
      [1568, 1.26],
    ].forEach(([f, at]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.32);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + at);
      o.stop(t0 + at + 0.35);
    });
  } catch {
    // no sound here
  }
}

// Table ordering (add-on): guests order from the QR on their table
export default function TableOrderTab({ ctx }) {
  const { settings, readOnly, r, lang } = ctx;
  const t = useToText();
  const x = useExtrasText();
  const [view, setView] = useState("setup"); // setup | stickers | page
  const [picked, setPicked] = useState([]); // table ids to print
  const [buying, setBuying] = useState(null); // { kind, theme }
  const on = ctx.addonOn("rest_table_order");
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState("");
  const [zone, setZone] = useState("");
  const [copied, setCopied] = useState("");
  const [renewing, setRenewing] = useState(null);
  const [qrs, setQrs] = useState({});
  const [printing, setPrinting] = useState(null);
  const fileRef = useRef(null);
  const link = (tok) => `${PUBLIC_SITE_URL}/public/order/${tok}`;

  const load = useCallback(
    () =>
      restaurantService.tableOrder
        .get(ctx.id)
        .then((res) => {
          setData(res.data);
          setForm({ ...res.data.settings, lat: res.data.settings.lat ?? "", lng: res.data.settings.lng ?? "" });
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load]);
  // small QR per table
  useEffect(() => {
    if (!data) return;
    Promise.all(data.tables.map(async (x) => [x._id, await qr(link(x.token), 240)])).then((list) => setQrs(Object.fromEntries(list)));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!printing) return undefined;
    document.body.classList.add("rs-printing");
    const timer = setTimeout(() => window.print(), 300);
    const done = () => setPrinting(null);
    window.addEventListener("afterprint", done);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
      document.body.classList.remove("rs-printing");
    };
  }, [printing]);

  if (!data || !form) return <ListSkeleton rows={4} />;
  const s = data.settings;

  const save = async (patch) => {
    const next = { ...form, ...patch };
    setForm(next);
    setBusy("save");
    try {
      const body = { enabled: next.enabled, require_open: next.require_open, radius: Number(next.radius), lat: next.lat === "" ? null : Number(next.lat), lng: next.lng === "" ? null : Number(next.lng) };
      const res = await restaurantService.tableOrder.save(ctx.id, body);
      setData((d) => ({ ...d, settings: res.data }));
      setForm({ ...res.data, lat: res.data.lat ?? "", lng: res.data.lng ?? "" });
      ctx.notify({ type: "success", text: t.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
      setForm({ ...s, lat: s.lat ?? "", lng: s.lng ?? "" });
    } finally {
      setBusy("");
    }
  };
  const useHere = () => {
    if (!navigator.geolocation) return;
    setBusy("locate");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBusy("");
        setForm((f) => ({ ...f, lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) }));
      },
      (e) => {
        setBusy("");
        ctx.notify({ type: "error", text: e.message });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  // "11.5564, 104.9282" pasted into one box fills both
  const setLat = (v) => {
    const m = String(v).match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) setForm((f) => ({ ...f, lat: m[1], lng: m[2] }));
    else setForm((f) => ({ ...f, lat: v }));
  };
  const placeChanged = String(form.lat) !== String(s.lat ?? "") || String(form.lng) !== String(s.lng ?? "");
  const hasPlace = form.lat !== "" && form.lng !== "" && Number.isFinite(Number(form.lat)) && Number.isFinite(Number(form.lng));
  const d = 0.0025;
  const mapSrc = hasPlace ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(form.lng) - d},${Number(form.lat) - d},${Number(form.lng) + d},${Number(form.lat) + d}&layer=mapnik&marker=${form.lat},${form.lng}` : "";

  const uploadSound = async (file) => {
    if (!file) return;
    setBusy("sound");
    try {
      const res = await restaurantService.tableOrder.uploadSound(ctx.id, file);
      setData((x) => ({ ...x, settings: res.data }));
      ctx.notify({ type: "success", text: t.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const removeSound = async () => {
    setBusy("sound");
    try {
      const res = await restaurantService.tableOrder.removeSound(ctx.id);
      setData((x) => ({ ...x, settings: res.data }));
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const playSound = () => (s.sound.url ? new Audio(s.sound.url).play().catch(chime) : chime());
  const renew = async (tb) => {
    setRenewing(null);
    try {
      const res = await restaurantService.tableOrder.renew(ctx.id, tb._id);
      setData((x) => ({ ...x, tables: x.tables.map((y) => (y._id === tb._id ? res.data : y)) }));
      ctx.notify({ type: "success", text: t.renewed.replace("{t}", tb.name) });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const copy = (tb) =>
    navigator.clipboard?.writeText(link(tb.token)).then(() => {
      setCopied(tb._id);
      setTimeout(() => setCopied(""), 1500);
    });
  const tables = data.tables.filter((x) => !zone || String(x.zone_id) === zone);
  // only the tables the owner ticked (in the zone shown)
  const toPrint = tables.filter((tb) => picked.includes(tb._id));
  const allPicked = tables.length > 0 && toPrint.length === tables.length;
  const pick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const pickAll = () => setPicked((p) => (allPicked ? p.filter((id) => !tables.some((tb) => tb._id === id)) : [...new Set([...p, ...tables.map((tb) => tb._id)])]));
  const printStickers = async () => setPrinting(await Promise.all(toPrint.map(async (tb) => ({ name: tb.name, img: await qr(link(tb.token), 600) }))));
  const looks = data.themes;
  const useLook = async (kind, theme) => {
    setBusy(`look:${theme}`);
    try {
      const res = await restaurantService.tableOrder.useTheme(ctx.id, kind, theme);
      setData((d) => ({ ...d, themes: { ...d.themes, [kind]: res.data } }));
      if (kind === "qr") ctx.reload(); // the QR menu tab prints with the same look
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const sample = data.tables[0];
  const lookCard = (kind, k) => {
    const L = looks[kind];
    const list = kind === "qr" ? QR_THEMES : ORDER_THEMES;
    const on = L.current === k;
    const has = L.free.includes(k) || L.owned.includes(k);
    return (
      <article key={k} className={`to-look ${on ? "on" : ""}`}>
        <div className="to-look-stage">
          {kind === "qr" ? (
            <div className="qs-preview">
              <QrSticker theme={k} color={settings.color} logo={settings.logo?.url} shop={restName} table={sample?.name || "A1"} qr={sample ? qrs[sample._id] : ""} scan={t.scan} tableWord={t.tableWord} />
            </div>
          ) : (
            <OrderThemeMock theme={k} color={settings.color} name={restName} logo={settings.logo?.url} lang={lang} />
          )}
        </div>
        <div className="xt-meta">
          <b>
            {themeName(list, k, lang)}{" "}
            {L.free.includes(k) ? (
              <span className="xt-tag">{x.free}</span>
            ) : L.owned.includes(k) ? (
              <span className="xt-tag own">
                <BadgeCheck size={12} /> {x.owned}
              </span>
            ) : null}
          </b>
          <small className="rs-muted">{themeDesc(list, k, lang)}</small>
        </div>
        {on ? (
          <span className="xt-state">
            <Check size={16} /> {x.inUse}
          </span>
        ) : has ? (
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => useLook(kind, k)} disabled={readOnly || !!busy}>
            {x.use}
          </button>
        ) : (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuying({ kind, theme: k })} disabled={readOnly}>
            <Lock size={14} /> {x.unlock.replace("{coins}", "")} <CoinIcon size={14} /> {fmt(L.price)}
          </button>
        )}
      </article>
    );
  };
  const restName = settings.name_km || settings.name_en;

  return (
    <div className="rs-col">
      <section className="panel-card pt-hero">
        <span className="pt-ic">
          <HandPlatter size={26} />
        </span>
        <div>
          <h2>{t.title}</h2>
          <p className="rs-muted">{t.sub}</p>
        </div>
        {on && (
          <label className="md-switch to-main-switch" title={t.on}>
            <input type="checkbox" checked={!!form.enabled} onChange={(e) => save({ enabled: e.target.checked })} disabled={readOnly || busy === "save"} aria-label={t.on} />
            <span className="md-switch-track" />
          </label>
        )}
      </section>

      <div className="rp-views to-views" role="tablist">
        {["setup", "stickers", "page"].map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
            {t.views[v]}
          </button>
        ))}
      </div>

      {view === "stickers" ? (
        <section className="panel-card">
          <p className="rs-muted" style={{ marginTop: 0 }}>
            {t.stickersSub}
          </p>
          <div className="to-looks">{[...looks.qr.free, ...looks.qr.paid].map((k) => lookCard("qr", k))}</div>
        </section>
      ) : view === "page" ? (
        <section className="panel-card">
          <p className="rs-muted" style={{ marginTop: 0 }}>
            {t.pageSub}
          </p>
          <div className="to-looks">{[...looks.order.free, ...looks.order.paid].map((k) => lookCard("order", k))}</div>
        </section>
      ) : !on ? (
        <>
          <section className="panel-card">
            <AddonPrompt addonKey="rest_table_order" ctx={ctx} />
          </section>
          <HowItWorks t={t} />
        </>
      ) : (
        <>
          <section className={`panel-card to-state ${s.enabled ? "on" : ""}`}>
            <b>{t.on}</b>
            <span className="rs-muted">{s.enabled ? t.posNote : t.onSub}</span>
          </section>

          <section className="panel-card">
            <h2>{t.place}</h2>
            <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
              {t.placeSub}
            </p>
            <div className="to-place">
              <div className="to-place-form">
                <div className="md-fields-grid">
                  <Field label={t.lat} htmlFor="to-lat">
                    <input id="to-lat" inputMode="decimal" value={form.lat} onChange={(e) => setLat(e.target.value)} placeholder="11.5564" disabled={readOnly} />
                  </Field>
                  <Field label={t.lng} htmlFor="to-lng">
                    <input id="to-lng" inputMode="decimal" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="104.9282" disabled={readOnly} />
                  </Field>
                </div>
                <small className="rs-hint">{t.pasteHint}</small>
                <div className="to-row">
                  <button type="button" className="md-btn md-btn-ghost" onClick={useHere} disabled={readOnly || busy === "locate"}>
                    {busy === "locate" ? <Loader2 size={16} className="md-spin" /> : <LocateFixed size={16} />} {busy === "locate" ? t.locating : t.useHere}
                  </button>
                  {placeChanged && (
                    <button type="button" className="md-btn md-btn-primary" onClick={() => save({})} disabled={readOnly || busy === "save"}>
                      {t.save}
                    </button>
                  )}
                </div>
                <Field label={t.radius} htmlFor="to-radius">
                  <select id="to-radius" value={form.radius} onChange={(e) => save({ radius: Number(e.target.value) })} disabled={readOnly}>
                    {RADII.map((m) => (
                      <option key={m} value={m}>
                        {m ? `${m} m` : t.radiusOff}
                      </option>
                    ))}
                  </select>
                </Field>
                {Number(form.radius) === 0 && <div className="to-warn">{t.radiusWarn}</div>}
              </div>
              <div className="to-map">{mapSrc ? <iframe title={t.place} src={mapSrc} loading="lazy" /> : <span className="rs-muted">{t.noPlace}</span>}</div>
            </div>
          </section>

          <section className="panel-card">
            <h2>{t.rules}</h2>
            <label className="to-toggle">
              <span>
                <b>{t.requireOpen}</b>
                <small className="rs-muted">{t.requireOpenSub}</small>
              </span>
              <span className="md-switch">
                <input type="checkbox" checked={!!form.require_open} onChange={(e) => save({ require_open: e.target.checked })} disabled={readOnly} aria-label={t.requireOpen} />
                <span className="md-switch-track" />
              </span>
            </label>
          </section>

          <section className="panel-card">
            <h2>{t.sound}</h2>
            <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
              {t.soundSub}
            </p>
            <div className="to-sound">
              <span className="to-sound-ic">
                <Music size={18} />
              </span>
              <b>{s.sound.url ? s.sound.name || "sound.mp3" : t.builtIn}</b>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={playSound}>
                <Play size={15} /> {t.play}
              </button>
              <input ref={fileRef} type="file" accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg" hidden onChange={(e) => uploadSound(e.target.files?.[0])} />
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => fileRef.current?.click()} disabled={readOnly || busy === "sound"}>
                {busy === "sound" ? <Loader2 size={15} className="md-spin" /> : <Upload size={15} />} {s.sound.url ? t.change : t.upload}
              </button>
              {s.sound.url && (
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={removeSound} disabled={readOnly || busy === "sound"}>
                  <Trash2 size={15} /> {t.remove}
                </button>
              )}
            </div>
          </section>

          <section className="panel-card">
            <div className="to-head">
              <div>
                <h2>{t.tables}</h2>
                <p className="rs-muted">{t.tablesSub}</p>
              </div>
              <div className="to-row">
                {data.zones.length > 0 && (
                  <select value={zone} onChange={(e) => setZone(e.target.value)} aria-label={t.allZones}>
                    <option value="">{t.allZones}</option>
                    {data.zones.map((z) => (
                      <option key={z._id} value={z._id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                )}
                <button type="button" className="md-btn md-btn-ghost" onClick={pickAll} disabled={!tables.length}>
                  {allPicked ? t.clearPick : t.pickAll}
                </button>
                <button type="button" className="md-btn md-btn-primary" onClick={printStickers} disabled={!toPrint.length}>
                  <Printer size={16} /> {toPrint.length ? t.printN.replace("{n}", toPrint.length) : t.pickFirst}
                </button>
              </div>
            </div>
            {data.tables.length === 0 ? (
              <p className="rs-muted">{t.noTables}</p>
            ) : (
              <div className="to-tables">
                {tables.map((tb) => (
                  <div key={tb._id} className={`to-table ${picked.includes(tb._id) ? "picked" : ""}`}>
                    <label className="to-pick" title={t.pickOne}>
                      <input type="checkbox" checked={picked.includes(tb._id)} onChange={() => pick(tb._id)} aria-label={`${t.pickOne} ${tb.name}`} />
                    </label>
                    <button type="button" className="to-table-qr" onClick={() => pick(tb._id)} aria-label={`${t.pickOne} ${tb.name}`}>
                      {qrs[tb._id] ? <img src={qrs[tb._id]} alt="" /> : <span className="to-qr-ph" />}
                    </button>
                    <b>{tb.name}</b>
                    {renewing === tb._id ? (
                      <div className="to-renew">
                        <small>{t.renewAsk.replace("{t}", tb.name)}</small>
                        <div className="to-row">
                          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setRenewing(null)}>
                            ✕
                          </button>
                          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => renew(tb)}>
                            {t.renew}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="to-table-actions">
                        <button type="button" className="md-icon-btn" onClick={() => copy(tb)} title={t.copy} aria-label={t.copy}>
                          <Copy size={15} />
                        </button>
                        <a className="md-icon-btn" href={link(tb.token)} target="_blank" rel="noreferrer" title={t.open} aria-label={t.open}>
                          <ExternalLink size={15} />
                        </a>
                        <button type="button" className="md-icon-btn" onClick={() => setRenewing(tb._id)} title={t.renew} aria-label={t.renew} disabled={readOnly}>
                          <RefreshCw size={15} />
                        </button>
                      </div>
                    )}
                    {copied === tb._id && <small className="to-copied">{t.copied}</small>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel-card">
            <h2>{t.recent}</h2>
            {data.recent.length === 0 ? (
              <p className="rs-muted">{t.recentEmpty}</p>
            ) : (
              <div className="to-recent">
                {data.recent.map((g) => (
                  <div key={g._id} className="to-recent-row">
                    <b>{g.table_name}</b>
                    <span>
                      {t.items(g.lines.reduce((a, l) => a + l.qty, 0))}
                      {g.guest_name ? ` · ${g.guest_name}` : ""}
                      <small className="rs-muted">{g.lines.map((l) => `${l.qty}× ${l.name_en || l.name_km}`).join(", ")}</small>
                    </span>
                    <span>{fmtMoney(g.total, settings.currency)}</span>
                    <span className={`to-st s-${g.status}`}>
                      {t.st[g.status] || g.status}
                      {g.order_number ? ` · #${g.order_number}` : ""}
                    </span>
                    <small className="rs-muted">{new Date(g.created_date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
                  </div>
                ))}
              </div>
            )}
          </section>
          <HowItWorks t={t} />
        </>
      )}

      {buying && (
        <PurchaseModal
          stage={
            <div className="to-buy-stage">
              {buying.kind === "qr" ? (
                <div className="qs-preview">
                  <QrSticker theme={buying.theme} color={settings.color} logo={settings.logo?.url} shop={restName} table={sample?.name || "A1"} qr={sample ? qrs[sample._id] : ""} scan={t.scan} tableWord={t.tableWord} />
                </div>
              ) : (
                <OrderThemeMock theme={buying.theme} color={settings.color} name={restName} logo={settings.logo?.url} lang={lang} />
              )}
            </div>
          }
          badge={t.views[buying.kind === "qr" ? "stickers" : "page"]}
          title={(buying.kind === "qr" ? t.buyStickerTitle : t.buyPageTitle).replace("{name}", themeName(buying.kind === "qr" ? QR_THEMES : ORDER_THEMES, buying.theme, lang))}
          sub={buying.kind === "qr" ? t.buyStickerSub : t.buyPageSub}
          perks={[buying.kind === "qr" ? t.perkSticker : t.perkPage, `${r.oneTime} · ${r.forever}`]}
          price={looks[buying.kind].price}
          buyLabel={r.buy.replace("{coins}", `${fmt(looks[buying.kind].price)} ${r.coins}`)}
          buy={() => restaurantService.tableOrder.buyTheme(ctx.id, buying.kind, buying.theme)}
          doneSub={(buying.kind === "qr" ? t.doneSticker : t.donePage).replace("{name}", themeName(buying.kind === "qr" ? QR_THEMES : ORDER_THEMES, buying.theme, lang))}
          onDone={() => {
            const b = buying;
            load().then(() => useLook(b.kind, b.theme));
          }}
          onClose={() => setBuying(null)}
        />
      )}

      {printing &&
        createPortal(
          <div className="rs-print-root">
            {printing.map((p) => (
              <QrSticker key={p.name} theme={looks.qr.current} color={settings.color} logo={settings.logo?.url} shop={restName} table={p.name} qr={p.img} scan={t.scan} tableWord={t.tableWord} />
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

function HowItWorks({ t }) {
  return (
    <section className="panel-card">
      <h2>{t.howTitle}</h2>
      <ol className="to-how">
        {t.how.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ol>
    </section>
  );
}
