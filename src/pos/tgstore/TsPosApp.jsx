import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, Bell, BellOff, CheckCircle2, Delete, Loader2, Lock, MonitorSmartphone, Package, Pause, Play, Printer, ReceiptText, Search, Send, Unlink, WifiOff } from "lucide-react";
import "../../dashboard/admin/master_data/masterdata.css";
import "../../dashboard/super_admin/super-admin.css";
import "../../dashboard/client/tgstore/tgstore.css";
import "./tspos.css";
import { useI18n } from "../../i18n/I18nProvider";
import { OrderCard } from "../../dashboard/client/tgstore/TsOrders";
import { fmtTime, money, useTsText } from "../../dashboard/client/tgstore/text";
import { themeOf } from "../../tgstore/themes";
import { device, pref, session, tsPos } from "./tsPosApi";
import { posText } from "./tsPosText";

const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
const COLS = [
  ["new", ["new"]],
  ["making", ["accepted"]],
  ["ready", ["ready", "on_way"]],
];

// a short two-note chime (no sound file to download)
let audio = null;
function chime() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    const at = audio.currentTime;
    [
      [880, 0],
      [1320, 0.18],
      [880, 0.5],
      [1320, 0.68],
    ].forEach(([f, d]) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at + d);
      g.gain.exponentialRampToValueAtTime(0.35, at + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + d + 0.28);
      o.connect(g).connect(audio.destination);
      o.start(at + d);
      o.stop(at + d + 0.3);
    });
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* no audio */
  }
}
const audioReady = () => !!audio && audio.state === "running";

// a kitchen / counter ticket, 80 mm wide
function printTicket(o, shop, x, t) {
  const cur = o.currency;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const lines = o.items
    .map((l) => `<tr><td class="q">${l.qty}×</td><td>${esc(l.name)}${l.options?.length ? `<small>${esc(l.options.map((c) => c.choice).join(", "))}</small>` : ""}${l.note ? `<small>“${esc(l.note)}”</small>` : ""}</td><td class="r">${money(l.total, cur)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>#${o.no}</title><style>
    @page{size:80mm auto;margin:4mm}body{font:13px/1.35 system-ui,'Kantumruy Pro',sans-serif;margin:0;color:#000;width:72mm}
    h1{font-size:26px;margin:0}h2{font-size:15px;margin:2px 0 8px}table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}
    td.q{width:28px;font-weight:700}td.r{text-align:right;white-space:nowrap}small{display:block;color:#333}hr{border:0;border-top:1px dashed #000;margin:8px 0}
    .tot{display:flex;justify-content:space-between;font-weight:800;font-size:16px}.pay{text-align:center;font-weight:800;border:2px solid #000;padding:4px;margin-top:8px}
  </style></head><body>
    <h1>#${o.no}</h1><h2>${esc(shop.name)} · ${esc(x.modes[o.mode])}${o.table ? ` ${esc(o.table)}` : ""}</h2>
    <div>${fmtTime(o.created_date)} · ${esc(o.customer?.name || "")} ${esc(o.customer?.phone || "")}</div>
    ${o.address ? `<div>📍 ${esc(o.address)}</div>` : ""}${o.note ? `<div>📝 ${esc(o.note)}</div>` : ""}
    <hr><table>${lines}</table><hr>
    ${o.fee ? `<div class="tot" style="font-weight:600;font-size:13px"><span>${esc(x.deliveryFee)}</span><span>${money(o.fee, cur)}</span></div>` : ""}
    <div class="tot"><span>${esc(t.ticketTotal)}</span><span>${money(o.total, cur)}</span></div>
    <div class="pay">${o.pay.status === "paid" ? t.ticketPaid : t.ticketUnpaid}</div>
  </body></html>`;
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
  document.body.appendChild(f);
  f.contentDocument.open();
  f.contentDocument.write(html);
  f.contentDocument.close();
  setTimeout(() => {
    f.contentWindow.focus();
    f.contentWindow.print();
    setTimeout(() => f.remove(), 1500);
  }, 250);
}

// /pos/tg-store — the Telegram Store staff screen: pair → PIN → orders come in with a sound
export default function TsPosApp() {
  const { lang, toggleLang } = useI18n();
  const t = posText(lang);
  const [params] = useSearchParams();
  const [stage, setStage] = useState(() => (!device.get() ? "pair" : !session.get() ? "pin" : "main"));
  useEffect(() => {
    document.title = t.title;
  }, [t.title]);
  const unpair = () => {
    device.set("");
    session.set("");
    setStage("pair");
  };
  const langBtn = (
    <button type="button" className="tsx-lang" onClick={toggleLang}>
      {lang === "km" ? "EN" : "ខ្មែរ"}
    </button>
  );
  if (stage === "pair") return <Pair t={t} langBtn={langBtn} start={params.get("code") || ""} onDone={() => setStage("pin")} />;
  if (stage === "pin") return <Pin t={t} langBtn={langBtn} onDone={() => setStage("main")} onUnpair={unpair} />;
  return (
    <Main
      t={t}
      lang={lang}
      langBtn={langBtn}
      onLock={() => {
        session.set("");
        setStage("pin");
      }}
      onUnpair={unpair}
    />
  );
}

function Pair({ t, langBtn, start, onDone }) {
  const [code, setCode] = useState(start.replace(/\D/g, "").slice(0, 6));
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await tsPos.pair(code, name.trim() || t.screenNamePh);
      device.set(r.data.token);
      if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
      onDone();
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  };
  return (
    <div className="tsx tsx-center">
      <div className="tsx-corner">{langBtn}</div>
      <form className="tsx-box" onSubmit={go}>
        <span className="tsx-box-ic">
          <MonitorSmartphone size={30} />
        </span>
        <h1>{t.pairTitle}</h1>
        <p className="tsx-muted">{t.pairSub}</p>
        <input className="tsx-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" aria-label={t.code} data-testid="tsx-code" />
        <input className="tsx-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t.screenNamePh} aria-label={t.screenName} data-testid="tsx-name" />
        {err && <div className="tsx-err">{err}</div>}
        <button type="submit" className="tsx-btn" disabled={busy || code.length !== 6} data-testid="tsx-pair">
          {busy && <Loader2 size={18} className="md-spin" />} {t.pair}
        </button>
      </form>
    </div>
  );
}

function Pin({ t, langBtn, onDone, onUnpair }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shop, setShop] = useState(null);
  useEffect(() => {
    tsPos
      .shop()
      .then((r) => setShop(r.data.shop))
      .catch((x) => x.code === "no_device" && onUnpair());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const press = async (d) => {
    if (busy) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    setErr("");
    if (next.length < 4) return;
    setBusy(true);
    try {
      // the tap that logs in also lets the browser play the order sound
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      audio.resume?.();
    } catch {
      /* no audio */
    }
    try {
      const r = await tsPos.login(next);
      session.set(r.data.session);
      onDone();
    } catch (x) {
      if (x.code === "no_device") return onUnpair();
      setErr(x.code === "bad_pin" ? t.wrongPin : x.message);
      setPin("");
      setBusy(false);
    }
  };
  useEffect(() => {
    const key = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  return (
    <div className="tsx tsx-center">
      <div className="tsx-corner">{langBtn}</div>
      <div className="tsx-box">
        <span className="tsx-logo">{shop?.logo ? <img src={shop.logo} alt="" /> : <Send size={26} />}</span>
        <h1>{shop?.name || t.pinTitle}</h1>
        <p className="tsx-muted">{t.pinSub}</p>
        <div className={`tsx-dots ${err ? "bad" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={i < pin.length ? "on" : ""} />
          ))}
        </div>
        {err && <div className="tsx-err">{err}</div>}
        <div className="tsx-pad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
            k === "" ? (
              <span key={i} />
            ) : (
              <button key={i} type="button" onClick={() => (k === "del" ? setPin(pin.slice(0, -1)) : press(k))} aria-label={k === "del" ? "Delete" : k} disabled={busy} data-testid={`tsx-key-${k}`}>
                {k === "del" ? <Delete size={22} /> : k}
              </button>
            ),
          )}
        </div>
        {busy && <Loader2 size={22} className="md-spin" />}
        <button type="button" className="tsx-link" onClick={() => window.confirm(t.unpairAsk) && onUnpair()}>
          <Unlink size={14} /> {t.unpair}
        </button>
      </div>
    </div>
  );
}

function Main({ t, lang, langBtn, onLock, onUnpair }) {
  const { x } = useTsText();
  const [boot, setBoot] = useState(null);
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState(null);
  const [counts, setCounts] = useState(null);
  const [open, setOpen] = useState(null); // { open, open_now }
  const [offline, setOffline] = useState(false);
  const [at, setAt] = useState(null);
  const [sound, setSound] = useState(() => pref.get("sound", true));
  const [needTap, setNeedTap] = useState(false);
  const [flash, setFlash] = useState(null); // the newest order, for the banner
  const [busy, setBusy] = useState("");
  const [col, setCol] = useState("new"); // phones: one column at a time
  const seen = useRef(null);
  const fail = useCallback(
    (e) => {
      if (e.code === "login" || e.code === "no_device") return e.code === "no_device" ? onUnpair() : onLock();
      if (e.code === "network") setOffline(true);
    },
    [onLock, onUnpair],
  );
  useEffect(() => {
    tsPos
      .boot()
      .then((r) => {
        setBoot(r.data);
        setCounts(r.data.counts);
        setOpen({ open: r.data.open, open_now: r.data.open_now });
      })
      .catch(fail);
  }, [fail]);

  const load = useCallback(
    () =>
      tsPos
        .orders("open")
        .then((r) => {
          setOffline(false);
          setAt(new Date());
          setOrders(r.data);
          setCounts(r.counts);
          setOpen({ open: r.open, open_now: r.open_now });
          const fresh = r.data.filter((o) => o.status === "new");
          if (seen.current) {
            const arrived = fresh.filter((o) => !seen.current.has(String(o._id)));
            if (arrived.length) setFlash(arrived[arrived.length - 1]);
          }
          seen.current = new Set([...(seen.current || []), ...r.data.map((o) => String(o._id))]);
        })
        .catch(fail),
    [fail],
  );
  useEffect(() => {
    load();
    const i = setInterval(() => load(), document.visibilityState === "visible" ? 5000 : 15000);
    return () => clearInterval(i);
  }, [load]);

  // ring while an order waits for someone to accept it
  const waiting = (orders || []).filter((o) => o.status === "new").length;
  useEffect(() => {
    document.title = waiting ? `(${waiting}) ${t.title}` : t.title;
    if (!waiting || !sound) return undefined;
    if (!audioReady()) setNeedTap(true);
    chime();
    const i = setInterval(chime, 6000);
    return () => clearInterval(i);
  }, [waiting, sound, t.title]);
  useEffect(() => {
    if (!flash) return undefined;
    const tm = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(tm);
  }, [flash]);

  const shop = boot?.shop;
  const readOnly = !!boot?.read_only;
  const ctx = useMemo(() => ({ x, lang, readOnly, on: (k) => k === "ts_riders" && !!shop?.riders, data: { riders: { connected: !!shop?.riders } } }), [x, lang, readOnly, shop]);
  const act = async (o, status, extra = {}) => {
    setBusy(o._id);
    try {
      const r = status === "paid" ? await tsPos.paid(o._id) : status === "riders" ? await tsPos.toRiders(o._id) : await tsPos.move(o._id, status, extra);
      setOrders((list) => (["done", "cancelled"].includes(r.data.status) ? list.filter((y) => y._id !== o._id) : list.map((y) => (y._id === o._id ? r.data : y))));
      load();
    } catch (e) {
      fail(e);
      if (e.message && e.code !== "network") window.alert(e.message);
      load();
    } finally {
      setBusy("");
    }
  };
  const toggleOpen = async () => {
    try {
      const r = await tsPos.setOpen(!open.open);
      setOpen(r.data);
    } catch (e) {
      fail(e);
    }
  };
  const isManager = boot?.staff?.role === "manager";
  const accent = shop ? shop.color || themeOf(shop.theme).palette.accent : "#C4470F";
  const tabs = ["orders", "done", "products", ...(isManager ? ["today"] : [])];
  const TAB_IC = { orders: ReceiptText, done: CheckCircle2, products: Package, today: BarChart3 };
  const state = !open ? null : !open.open ? "paused" : open.open_now?.open === false ? "hours" : "on";

  return (
    <div
      className="tsx tsx-main"
      style={{ "--tsx-accent": accent }}
      onPointerDown={() => {
        if (needTap) {
          try {
            audio = audio || new (window.AudioContext || window.webkitAudioContext)();
            audio.resume();
          } catch {
            /* no audio */
          }
          setNeedTap(false);
        }
      }}
    >
      <header className="tsx-top">
        <span className="tsx-logo sm">{shop?.logo ? <img src={shop.logo} alt="" /> : <Send size={18} />}</span>
        <div className="tsx-top-name">
          <b>{shop?.name || "…"}</b>
          <small>
            {boot?.staff?.name}
            {isManager ? ` · ${t.manager}` : ""} · {boot?.device?.name}
          </small>
        </div>
        {state && (
          <button type="button" className={`tsx-state s-${state}`} onClick={isManager && !readOnly ? toggleOpen : undefined} disabled={!isManager || readOnly} title={isManager ? (open.open ? t.pause : t.resume) : ""} data-testid="tsx-open">
            {state === "on" ? <Play size={14} /> : <Pause size={14} />} {state === "on" ? t.taking : state === "paused" ? t.paused : t.closedHours}
          </button>
        )}
        <div className="tsx-top-acts">
          <button
            type="button"
            className="tsx-icon"
            onClick={() => {
              pref.set("sound", !sound);
              setSound(!sound);
              if (!sound) chime();
            }}
            aria-label={sound ? t.soundOn : t.soundOff}
            title={sound ? t.soundOn : t.soundOff}
            data-testid="tsx-sound"
          >
            {sound ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
          {langBtn}
          <button type="button" className="tsx-icon" onClick={onLock} aria-label={t.logout} title={t.logout} data-testid="tsx-lock">
            <Lock size={18} />
          </button>
        </div>
      </header>
      <nav className="tsx-tabs">
        {tabs.map((k) => {
          const Ic = TAB_IC[k];
          return (
            <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)} data-testid={`tsx-tab-${k}`}>
              <Ic size={17} /> {t.tabs[k]}
              {k === "orders" && waiting > 0 && <span className="tsx-badge">{waiting}</span>}
            </button>
          );
        })}
        {at && <small className="tsx-updated">{offline ? "" : fill(t.updated, { time: fmtTime(at) })}</small>}
      </nav>
      {offline && (
        <div className="tsx-bar bad">
          <WifiOff size={16} /> {t.offline}
        </div>
      )}
      {readOnly && <div className="tsx-bar warn">{t.readOnly}</div>}
      {needTap && sound && waiting > 0 && (
        <div className="tsx-bar warn">
          <Bell size={16} /> {t.tapToHear}
        </div>
      )}
      {flash && (
        <div className="tsx-flash" role="status" data-testid="tsx-flash">
          <Bell size={20} /> {fill(t.newOrder, { n: flash.no })}
        </div>
      )}

      {tab === "orders" && (
        <main className="tsx-board">
          <div className="tsx-colpick">
            {COLS.map(([k, sts]) => {
              const n = (orders || []).filter((o) => sts.includes(o.status)).length;
              return (
                <button key={k} type="button" className={col === k ? "on" : ""} onClick={() => setCol(k)}>
                  {t.cols[k]} <b>{n}</b>
                </button>
              );
            })}
          </div>
          {COLS.map(([k, sts]) => {
            const rows = (orders || []).filter((o) => sts.includes(o.status));
            return (
              <section key={k} className={`tsx-col c-${k} ${col === k ? "is-on" : ""}`} data-testid={`tsx-col-${k}`}>
                <h2>
                  {t.cols[k]} <span>{rows.length}</span>
                </h2>
                {orders === null ? (
                  <div className="panel-card ts-skel" />
                ) : rows.length === 0 ? (
                  <p className="tsx-empty">{t.empty[k]}</p>
                ) : (
                  rows.map((o) => (
                    <div key={o._id} className="tsx-card">
                      <OrderCard ctx={ctx} o={o} busy={busy === o._id} act={act} />
                      <button type="button" className="tsx-print" onClick={() => printTicket(o, shop, x, t)} aria-label={t.print}>
                        <Printer size={15} /> {t.print}
                      </button>
                    </div>
                  ))
                )}
              </section>
            );
          })}
        </main>
      )}
      {tab === "done" && <DoneView t={t} ctx={ctx} act={act} busy={busy} fail={fail} shop={shop} x={x} />}
      {tab === "products" && <ProductsView t={t} lang={lang} cur={shop?.currency} readOnly={readOnly} fail={fail} />}
      {tab === "today" && <TodayView t={t} x={x} fail={fail} counts={counts} />}
    </div>
  );
}

function DoneView({ t, ctx, act, busy, fail, shop, x }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    tsPos
      .orders("done")
      .then((r) => setRows(r.data))
      .catch((e) => (fail(e), setRows([])));
  }, [fail]);
  return (
    <main className="tsx-list">
      {rows === null ? (
        <div className="panel-card ts-skel" />
      ) : rows.length === 0 ? (
        <p className="tsx-empty">{t.noDone}</p>
      ) : (
        rows.map((o) => (
          <div key={o._id} className="tsx-card">
            <OrderCard ctx={ctx} o={o} busy={busy === o._id} act={act} />
            <button type="button" className="tsx-print" onClick={() => printTicket(o, shop, x, t)}>
              <Printer size={15} /> {t.print}
            </button>
          </div>
        ))
      )}
    </main>
  );
}

function ProductsView({ t, lang, cur, readOnly, fail }) {
  const [d, setD] = useState(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    tsPos
      .products()
      .then((r) => setD(r))
      .catch((e) => (fail(e), setD({ data: [], categories: [] })));
  }, [fail]);
  const flip = async (p) => {
    setBusy(p._id);
    try {
      const r = await tsPos.soldOut(p._id, !p.sold_out);
      setD((o) => ({ ...o, data: o.data.map((y) => (y._id === p._id ? r.data : y)) }));
    } catch (e) {
      fail(e);
    } finally {
      setBusy("");
    }
  };
  if (!d) return <div className="tsx-list"><div className="panel-card ts-skel" /></div>;
  const name = (p) => (lang === "km" && p.name_km) || p.name;
  const list = d.data.filter((p) => (!cat || String(p.category_id) === cat) && (!q || name(p).toLowerCase().includes(q.toLowerCase())));
  return (
    <main className="tsx-list">
      <div className="tsx-prod-bar">
        <label className="tsx-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} />
        </label>
        <div className="ts-chips">
          <button type="button" className={!cat ? "on" : ""} onClick={() => setCat("")}>
            {t.all}
          </button>
          {d.categories.map((c) => (
            <button key={c._id} type="button" className={cat === String(c._id) ? "on" : ""} onClick={() => setCat(String(c._id))}>
              {(lang === "km" && c.name_km) || c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="tsx-prods">
        {list.map((p) => (
          <article key={p._id} className={`panel-card tsx-prod ${p.sold_out ? "is-out" : ""}`} data-testid="tsx-prod">
            <span className="tsx-prod-pic">{p.photo ? <img src={p.photo} alt="" loading="lazy" /> : <Package size={22} />}</span>
            <span className="tsx-prod-text">
              <b>{name(p)}</b>
              <small>
                {money(p.price, cur)}
                {p.stock !== null && p.stock !== undefined ? ` · ${fill(t.left, { n: p.stock })}` : ""}
              </small>
            </span>
            <button type="button" className={`tsx-toggle ${p.sold_out ? "out" : "on"}`} onClick={() => flip(p)} disabled={readOnly || busy === p._id} data-testid="tsx-soldout">
              {busy === p._id ? <Loader2 size={14} className="md-spin" /> : null} {p.sold_out ? t.soldOut : t.available}
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}

function TodayView({ t, x, fail, counts }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    tsPos
      .today()
      .then((r) => setD(r.data))
      .catch((e) => (fail(e), setD(false)));
  }, [fail]);
  if (d === null) return <div className="tsx-list"><div className="panel-card ts-skel" /></div>;
  if (!d) return null;
  const cur = d.currency;
  const rows = (obj, label) =>
    Object.entries(obj).map(([k, v]) => (
      <li key={k}>
        <span>{label(k)}</span>
        <b>{money(v, cur)}</b>
      </li>
    ));
  return (
    <main className="tsx-list">
      <div className="ts-kpis">
        {[
          [t.orders, d.orders],
          [t.sales, money(d.total, cur)],
          [t.paid, money(d.paid, cur)],
          [t.unpaid, money(Math.max(0, d.total - d.paid), cur)],
        ].map(([k, v]) => (
          <div key={k} className="panel-card ts-kpi">
            <small>{k}</small>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <div className="tsx-two">
        <section className="panel-card">
          <h3 className="ts-h3">{t.byPay}</h3>
          <ul className="tsx-sums">{rows(d.by_pay, (k) => t.payMethods[k] || k)}</ul>
        </section>
        <section className="panel-card">
          <h3 className="ts-h3">{t.byMode}</h3>
          <ul className="tsx-sums">{rows(d.by_mode, (k) => t.modes[k] || x.modes[k] || k)}</ul>
        </section>
      </div>
      {counts && <small className="tsx-muted">{fill(t.newOrders, { n: counts.new })}</small>}
    </main>
  );
}
