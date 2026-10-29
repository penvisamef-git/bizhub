import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Activity, ArrowLeft, Banknote, CheckCircle2, ChevronRight, CloudOff, Delete, Loader2, LogOut, Minus, Plus, QrCode, ReceiptText, ScanLine, Search, Store, Ticket, Unlink, UsersRound, XCircle } from "lucide-react";
import QrScanner from "../../components/QrScanner";
import { device, evDoor, local, session } from "./evDoorApi";
import { LookButton, LookSheet, useLook } from "./doorLook";
import LiveTab, { remember } from "./LiveTab";
import { useDoorText } from "./doorText";
import "./door.css";
import PoweredBy from "../../components/PoweredBy";

const usd = (n) => `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n) || 0)}`;
const when = (d, lang) => (d ? new Date(d).toLocaleString(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const hhmm = (d, lang) => (d ? new Date(d).toLocaleTimeString(lang === "km" ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
const codeOf = (raw) => {
  const s = String(raw || "").trim();
  const m = s.match(/\/ev\/t\/([A-Za-z0-9]{8,14})/);
  return (m ? m[1] : s).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14);
};
// a short beep: high = ok, low = no
let ac = null;
function beep(ok) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = ok ? 1046 : 220;
    o.type = ok ? "sine" : "square";
    g.gain.setValueAtTime(0.16, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (ok ? 0.18 : 0.45));
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + (ok ? 0.2 : 0.5));
  } catch {
    /* no sound */
  }
}

// "in 3 h" / "now" / "2 days ago" for the event list
function soonText(at, t) {
  const ms = new Date(at).getTime() - Date.now();
  const m = Math.round(Math.abs(ms) / 60000);
  if (m < 30) return t.now;
  const txt = m < 60 ? t.mins.replace("{n}", m) : m < 48 * 60 ? t.hoursOnly.replace("{h}", Math.round(m / 60)) : t.days.replace("{n}", Math.round(m / 1440));
  return ms > 0 ? t.startsIn.replace("{t}", txt) : t.startedAgo.replace("{t}", txt);
}

// /pos/event — a door phone: pair → PIN → choose the event → scan (works offline), guests, sell at the gate, orders
export default function EvDoorApp() {
  const { t, lang, setLang } = useDoorText();
  const [stage, setStage] = useState(() => (!device.get() ? "pair" : !session.get() ? "pin" : "boot"));
  const [boot, setBoot] = useState(null);
  const [event, setEvent] = useState(null); // { _id, title… }
  const [err, setErr] = useState("");
  const look = useLook();
  const [lookOpen, setLookOpen] = useState(false);
  const lookBtn = <LookButton t={t} onClick={() => setLookOpen(true)} />;
  const sheet = lookOpen && <LookSheet t={t} look={look} onClose={() => setLookOpen(false)} />;
  useEffect(() => {
    document.title = t.title;
    document.body.classList.add("evd-body");
    return () => document.body.classList.remove("evd-body");
  }, [t.title]);
  const loadBoot = useCallback(async () => {
    try {
      const r = await evDoor.boot();
      setBoot(r.data);
      local.set("ev_boot", r.data);
      setStage("main");
    } catch (e) {
      if (e.code === "no_device") {
        device.set("");
        session.set("");
        setStage("pair");
      } else if (e.status === 401) {
        session.set("");
        setStage("pin");
      } else if (e.code === "network" && local.get("ev_boot", null)) {
        setBoot(local.get("ev_boot", null));
        setStage("main");
      } else setErr(e.message);
    }
  }, []);
  useEffect(() => {
    if (stage === "boot") loadBoot();
  }, [stage, loadBoot]);
  const logout = () => {
    session.set("");
    setEvent(null);
    setBoot(null);
    setStage("pin");
  };
  const unpair = () => {
    if (!window.confirm(t.unpairSure)) return;
    device.set("");
    session.set("");
    setEvent(null);
    setStage("pair");
  };
  const langBtn = (
    <button type="button" className="evd-lang" onClick={() => setLang(lang === "km" ? "en" : "km")}>
      {lang === "km" ? "EN" : "ខ្មែរ"}
    </button>
  );

  const corner = (
    <>
      {lookBtn}
      {langBtn}
    </>
  );
  if (stage === "pair")
    return (
      <>
        <Pair t={t} langBtn={corner} onDone={() => setStage("pin")} />
        {sheet}
      </>
    );
  if (stage === "pin")
    return (
      <>
        <Pin t={t} langBtn={corner} onDone={() => setStage("boot")} onUnpair={unpair} />
        {sheet}
      </>
    );
  if (!boot)
    return (
      <div className="evd evd-center">
        {err ? <p>{err}</p> : <Loader2 size={30} className="evd-spin" />}
      </div>
    );
  if (!event)
    return (
      <div className="evd">
        <header className="evd-top">
          {boot.org.logo ? <img src={boot.org.logo} alt="" className="evd-logo" /> : <span className="evd-logo"><Ticket size={20} /></span>}
          <div className="evd-top-text">
            <b>{boot.org.name}</b>
            <small>
              {boot.member.name} · {t.roles[boot.member.role]}
            </small>
          </div>
          {lookBtn}
          {langBtn}
          <button type="button" className="evd-icon" onClick={logout} aria-label={t.logout} title={t.logout}>
            <LogOut size={18} />
          </button>
        </header>
        {sheet}
        <main className="evd-main">
          <div className="evd-hello">
            <b>{t.hello.replace("{name}", boot.member.name)}</b>
            <small>
              {boot.device?.name} · {t.roles[boot.member.role]}
              {boot.read_only ? ` · ${t.readOnly}` : ""}
            </small>
          </div>
          <h2>{t.events}</h2>
          {!boot.events.length && <p className="evd-muted">{t.noEvents}</p>}
          <div className="evd-events">
            {boot.events.map((e) => (
              <button key={e._id} type="button" className="evd-event" onClick={() => setEvent(e)} data-testid="evd-event">
                {e.poster ? <img src={e.poster} alt="" /> : <span className="evd-event-ic"><Ticket size={22} /></span>}
                <div className="evd-event-main">
                  <b>{e.title}</b>
                  <small>
                    {when(e.starts_at, lang)} · {soonText(e.starts_at, t)}
                    {e.shows?.length > 1 ? ` · ${t.showsN.replace("{n}", e.shows.length)}` : ""}
                  </small>
                  <span className="evd-event-bar">
                    <i style={{ width: `${e.tickets ? (e.used / e.tickets) * 100 : 0}%` }} />
                  </span>
                  <small>
                    {e.used} / {e.tickets} {t.inside}
                    {e.review ? <em className="evd-badge">{t.toCheck.replace("{n}", e.review)}</em> : null}
                  </small>
                </div>
                <ChevronRight size={20} />
              </button>
            ))}
          </div>
          <button type="button" className="evd-link" onClick={unpair}>
            <Unlink size={14} /> {t.unpair}
          </button>
          <PoweredBy className="pos-powered" />
        </main>
      </div>
    );
  return (
    <>
      <EventScreen t={t} lang={lang} boot={boot} ev={event} onBack={() => (setEvent(null), loadBoot())} onLogout={logout} langBtn={corner} />
      {sheet}
    </>
  );
}

function Pair({ t, langBtn, onDone }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await evDoor.pair(code, name || t.phoneNamePh);
      device.set(r.data.token);
      onDone();
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  };
  return (
    <div className="evd evd-center">
      <div className="evd-corner">{langBtn}</div>
      <form className="evd-box" onSubmit={go}>
        <span className="evd-box-ic">
          <ScanLine size={30} />
        </span>
        <h1>{t.pairTitle}</h1>
        <p className="evd-muted">{t.pairSub}</p>
        <input className="evd-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" aria-label={t.code} data-testid="evd-code" />
        <input className="evd-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={t.phoneNamePh} aria-label={t.phoneName} data-testid="evd-name" />
        {err && <div className="evd-err">{err}</div>}
        <button type="submit" className="evd-btn" disabled={busy || code.length !== 6} data-testid="evd-pair">
          {busy ? <Loader2 size={18} className="evd-spin" /> : null} {t.pair}
        </button>
      </form>
    </div>
  );
}

function Pin({ t, langBtn, onDone, onUnpair }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const press = async (d) => {
    if (busy) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    setErr("");
    if (next.length < 4) return;
    setBusy(true);
    try {
      const r = await evDoor.login(next);
      session.set(r.data.session);
      onDone();
    } catch (x) {
      if (x.code === "no_device") return onUnpair();
      setErr(x.code === "bad_pin" ? t.wrongPin : x.message);
      setPin("");
      setBusy(false);
    }
  };
  return (
    <div className="evd evd-center">
      <div className="evd-corner">{langBtn}</div>
      <div className="evd-box">
        <h1>{t.pinTitle}</h1>
        <p className="evd-muted">{t.pinSub}</p>
        <div className={`evd-dots ${err ? "bad" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={i < pin.length ? "on" : ""} />
          ))}
        </div>
        {err && <div className="evd-err">{err}</div>}
        <div className="evd-pad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
            k === "" ? (
              <span key={i} />
            ) : (
              <button key={i} type="button" onClick={() => (k === "del" ? setPin(pin.slice(0, -1)) : press(k))} aria-label={k} disabled={busy}>
                {k === "del" ? <Delete size={22} /> : k}
              </button>
            ),
          )}
        </div>
        {busy && <Loader2 size={22} className="evd-spin" />}
      </div>
    </div>
  );
}

function EventScreen({ t, lang, boot, ev, onBack, onLogout, langBtn }) {
  const role = boot.member.role;
  const tabs = ["scan", "live", ...(["crew", "cashier", "manager"].includes(role) ? ["guests"] : []), ...(["cashier", "manager"].includes(role) && boot.cashier ? ["sell"] : []), ...(role === "manager" ? ["orders"] : [])];
  const [tab, setTab] = useState("scan");
  const [info, setInfo] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  // events with showtimes: which one the door is letting in (the next one, or the one going on)
  const shows = ev.shows || [];
  const [show, setShow] = useState(() => {
    if (!shows.length) return "";
    const now = Date.now();
    return (shows.find((s) => new Date(s.starts_at).getTime() > now - 3 * 3600000) || shows[shows.length - 1]).key;
  });
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const codesKey = `ev_codes_${ev._id}`;
  const queueKey = `ev_queue_${ev._id}`;
  const [queue, setQueue] = useState(() => local.get(queueKey, []));
  const codes = useRef(local.get(codesKey, {}));
  const refresh = useCallback(async () => {
    try {
      const r = await evDoor.event(ev._id, true);
      const map = {};
      for (const [code, status, type, holder, usedAt, usedBy, sh, seat] of r.data.codes || []) map[code] = { status, type, holder, used_at: usedAt, used_by: usedBy, show: sh || "", seat_label: seat || "" };
      // scans still waiting to be sent stay "used" here
      for (const q of local.get(queueKey, [])) if (map[q.code]?.status === "valid") map[q.code] = { ...map[q.code], status: "used", used_at: q.at, used_by: boot.member.name };
      codes.current = map;
      local.set(codesKey, map);
      setInfo(r.data);
      setOnline(true);
      setLastSync(Date.now());
    } catch (e) {
      if (e.code === "network") setOnline(false);
      else if (e.status === 401) onLogout();
    }
  }, [ev._id, codesKey, queueKey, boot.member.name, onLogout]);
  const syncQueue = useCallback(async () => {
    const q = local.get(queueKey, []);
    if (!q.length) return;
    try {
      await evDoor.sync(ev._id, q, show);
      // keep scans made while this was sending
      const sent = new Set(q.map((x) => `${x.code}|${x.at}`));
      const rest = local.get(queueKey, []).filter((x) => !sent.has(`${x.code}|${x.at}`));
      local.set(queueKey, rest);
      setQueue(rest);
      setOnline(true);
      refresh();
    } catch (e) {
      if (e.code === "network") setOnline(false);
    }
  }, [ev._id, queueKey, refresh]);
  useEffect(() => {
    refresh();
    const a = setInterval(() => (local.get(queueKey, []).length ? syncQueue() : refresh()), 20000);
    const on = () => (setOnline(true), syncQueue());
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      clearInterval(a);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [refresh, syncQueue, queueKey]);

  const used = info?.counts?.used ?? Object.values(codes.current).filter((c) => c.status === "used").length;
  const total = info?.counts?.tickets ?? Object.values(codes.current).filter((c) => c.status !== "cancelled").length;
  return (
    <div className="evd">
      <header className="evd-top">
        <button type="button" className="evd-icon" onClick={onBack} aria-label={t.back}>
          <ArrowLeft size={20} />
        </button>
        <div className="evd-top-text">
          <b>{ev.title}</b>
          <small>
            {boot.member.name} · {t.roles[role]}
          </small>
        </div>
        {langBtn}
      </header>
      {shows.length > 0 && (
        <div className="evd-shows">
          {shows.map((s) => (
            <button key={s.key} type="button" className={show === s.key ? "on" : ""} onClick={() => setShow(s.key)} data-testid="evd-show">
              {when(s.starts_at, lang)}
              {s.label ? ` · ${s.label}` : ""}
            </button>
          ))}
        </div>
      )}
      <div className="evd-counter" data-testid="evd-counter">
        <b>{used}</b>
        <span>
          / {total} {t.inside}
        </span>
        <div className="evd-counter-bar">
          <i style={{ width: `${total ? (used / total) * 100 : 0}%` }} />
        </div>
        {(!online || queue.length > 0) && (
          <small className="evd-off">
            <CloudOff size={13} /> {!online ? t.offline : ""} {queue.length ? `· ${t.queued.replace("{n}", queue.length)}` : ""}
          </small>
        )}
      </div>
      <main className="evd-main tight">
        {tab === "scan" && <ScanTab t={t} lang={lang} ev={ev} doorShow={show} me={boot.member} codes={codes} queueKey={queueKey} setQueue={setQueue} setOnline={setOnline} onCount={(n) => setInfo((i) => (i ? { ...i, counts: { ...i.counts, used: n } } : i))} />}
        {tab === "live" && <LiveTab t={t} lang={lang} ev={ev} info={info} codes={codes} queue={queue} online={online} lastSync={lastSync} role={role} show={show} onGo={setTab} device={boot.device?.name} me={boot.member.name} />}
        {tab === "guests" && <GuestsTab t={t} lang={lang} ev={ev} />}
        {tab === "sell" && <SellTab t={t} ev={ev} show={show} info={info} readOnly={boot.read_only} onSold={refresh} />}
        {tab === "orders" && <OrdersTab t={t} lang={lang} ev={ev} onDone={refresh} />}
      </main>
      {tabs.length > 1 && (
        <nav className="evd-tabs">
          {tabs.map((k) => {
            const Icon = { scan: ScanLine, live: Activity, guests: UsersRound, sell: Store, orders: ReceiptText }[k];
            return (
              <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)} data-testid={`evd-tab-${k}`}>
                <Icon size={20} />
                <span>{t.tabs[k]}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function ScanTab({ t, lang, ev, doorShow, me, codes, queueKey, setQueue, setOnline, onCount }) {
  const [res, setRes] = useState(null); // { kind: ok|used|cancelled|other_event|not_found, ticket, offline }
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const hide = useRef(0);
  const show = (r) => {
    remember(ev._id, r);
    setRes(r);
    beep(r.kind === "ok");
    clearTimeout(hide.current);
    hide.current = setTimeout(() => setRes(null), r.kind === "ok" ? 2200 : 4000);
  };
  // no internet: the phone checks the codes it downloaded and keeps the scans to send later
  const offlineCheck = (code) => {
    const c = codes.current[code];
    if (!c) return show({ kind: "not_found", offline: true, code });
    if (c.status === "cancelled") return show({ kind: "cancelled", ticket: { ...c, code }, offline: true });
    if (c.status === "used") return show({ kind: "used", ticket: { ...c, code }, offline: true });
    if (doorShow && c.show && c.show !== doorShow) return show({ kind: "other_show", ticket: { ...c, code }, offline: true });
    const at = new Date().toISOString();
    codes.current[code] = { ...c, status: "used", used_at: at, used_by: me.name };
    local.set(`ev_codes_${ev._id}`, codes.current);
    const q = [...local.get(queueKey, []), { code, at, show: doorShow }];
    local.set(queueKey, q);
    setQueue(q);
    show({ kind: "ok", ticket: { ...c, code }, offline: true });
  };
  const check = async (raw) => {
    const code = codeOf(raw);
    if (!code || busy) return;
    setBusy(true);
    try {
      const r = await evDoor.scan(ev._id, code, doorShow);
      const d = r.data;
      // only this event's tickets go in the offline list (a ticket for another event must not pass later offline)
      if (d.ticket && ["ok", "used", "cancelled", "other_show"].includes(d.result)) codes.current[d.ticket.code] = { status: d.ticket.status, type: d.ticket.type_name, holder: d.ticket.holder, used_at: d.ticket.used_at, used_by: d.ticket.used_by, show: d.ticket.show || "", seat_label: d.ticket.seat_label || "" };
      onCount(d.used);
      setOnline(true);
      show({ kind: d.result, ticket: d.ticket ? { ...d.ticket, type: d.ticket.type_name } : null, other: d.other, code });
    } catch (e) {
      if (e.code === "network") {
        setOnline(false);
        offlineCheck(code);
      } else show({ kind: "error", msg: e.message });
    } finally {
      setBusy(false);
    }
  };
  const good = res?.kind === "ok";
  const title = res ? { ok: t.ok, used: t.used, cancelled: t.cancelled, other_event: t.otherEvent, other_show: t.otherShow, not_found: t.notFound, error: res.msg }[res.kind] : "";
  return (
    <div className="evd-scan">
      <QrScanner onCode={check} paused={!!res} className="evd-cam" texts={{ denied: t.camDenied, none: t.camNone }} />
      <form
        className="evd-typed"
        onSubmit={(e) => {
          e.preventDefault();
          check(typed);
          setTyped("");
        }}
      >
        <input value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} placeholder={t.typeCode} autoCapitalize="characters" data-testid="evd-typed" />
        <button type="submit" className="evd-btn small" disabled={!typed.trim() || busy}>
          {t.check}
        </button>
      </form>
      {res && (
        <button type="button" className={`evd-result ${good ? "ok" : res.kind === "used" ? "warn" : "bad"}`} onClick={() => (clearTimeout(hide.current), setRes(null))} data-testid="evd-result" data-kind={res.kind}>
          {good ? <CheckCircle2 size={84} /> : <XCircle size={84} />}
          <b>{title}</b>
          {res.ticket && (
            <span className="evd-result-who">
              <strong>{res.ticket.holder}</strong>
              <em>{res.ticket.type || res.ticket.type_name}</em>
            </span>
          )}
          {res.kind === "used" && res.ticket?.used_at && <small>{t.usedAt.replace("{t}", hhmm(res.ticket.used_at, lang)).replace("{name}", res.ticket.used_by || "—")}</small>}
          {res.kind === "other_event" && res.other && <small>{res.other.title}</small>}
          {res.ticket?.seat_label && <small className="evd-result-seat">💺 {res.ticket.seat_label}</small>}
          {res.kind === "other_show" && res.ticket?.show_at && <small>{t.forShow.replace("{t}", when(res.ticket.show_at, lang))}</small>}
          {res.offline && (
            <small className="evd-result-off">
              <CloudOff size={13} /> {t.offline}
            </small>
          )}
          <small className="evd-result-tap">{t.tapNext}</small>
        </button>
      )}
    </div>
  );
}

function GuestsTab({ t, lang, ev }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  useEffect(() => {
    const h = setTimeout(
      () =>
        evDoor
          .guests(ev._id, { q })
          .then((r) => setRows(r.data))
          .catch(() => setRows([])),
      q ? 300 : 0,
    );
    return () => clearTimeout(h);
  }, [ev._id, q]);
  return (
    <div className="evd-col">
      <label className="evd-search">
        <Search size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} data-testid="evd-search" />
      </label>
      {!rows ? (
        <Loader2 size={22} className="evd-spin" />
      ) : !rows.length ? (
        <p className="evd-muted">{t.noGuests}</p>
      ) : (
        <div className="evd-guests">
          {rows.map((g) => (
            <div key={g._id} className={`evd-guest ts-${g.status}`} data-testid="evd-guest">
              <i />
              <div>
                <b>{g.holder || "—"}</b>
                <small>
                  {g.type_name} · {g.code}
                  {g.phone ? ` · ${g.phone}` : ""}
                </small>
              </div>
              <span>{g.status === "used" ? hhmm(g.used_at, lang) : t.tstatus[g.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SellTab({ t, ev, show, info, readOnly, onSold }) {
  const types = (info?.event?.types || []).filter((x) => x.active !== false);
  const [qty, setQty] = useState({});
  const [name, setName] = useState("");
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  const lines = types.filter((x) => qty[x.key] > 0).map((x) => ({ key: x.key, qty: qty[x.key], price: x.now ?? x.price ?? 0 }));
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const total = lines.reduce((a, l) => a + l.qty * l.price, 0);
  const sell = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await evDoor.sell(ev._id, { lines: lines.map(({ key, qty: n }) => ({ key, qty: n })), name, method, show: show || undefined });
      const qrs = await Promise.all(r.data.tickets.map((tk) => QRCode.toDataURL(tk.code, { width: 160, margin: 1 })));
      setDone({ ...r.data, qrs });
      setQty({});
      setName("");
      onSold();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (done)
    return (
      <div className="evd-col evd-sold">
        <CheckCircle2 size={56} />
        <b>{t.sold}</b>
        <span className="evd-big">{usd(done.order.total)}</span>
        <div className="evd-sold-qrs">
          {done.qrs.map((src, i) => (
            <img key={i} src={src} alt={done.tickets[i].code} />
          ))}
        </div>
        <button type="button" className="evd-btn" onClick={() => setDone(null)}>
          {t.soldMore}
        </button>
      </div>
    );
  return (
    <div className="evd-col">
      <h2>{t.sellTitle}</h2>
      {readOnly && <div className="evd-err">{t.readOnly}</div>}
      {types.map((x) => (
        <div key={x.key} className="evd-sell-row">
          <div>
            <b>{x.name}</b>
            <small>
              {usd(x.now ?? x.price)} · {x.left}
            </small>
          </div>
          <div className="evd-stepper">
            <button type="button" onClick={() => setQty({ ...qty, [x.key]: Math.max(0, (qty[x.key] || 0) - 1) })} disabled={!qty[x.key]}>
              <Minus size={16} />
            </button>
            <b>{qty[x.key] || 0}</b>
            <button type="button" onClick={() => setQty({ ...qty, [x.key]: Math.min(x.left, (qty[x.key] || 0) + 1) })} disabled={(qty[x.key] || 0) >= x.left} data-testid="evd-sell-plus">
              <Plus size={16} />
            </button>
          </div>
        </div>
      ))}
      <input className="evd-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.sellName} maxLength={80} />
      <div className="evd-methods">
        {[
          ["cash", Banknote, t.cash],
          ["qr", QrCode, t.qr],
        ].map(([k, Icon, label]) => (
          <button key={k} type="button" className={method === k ? "on" : ""} onClick={() => setMethod(k)}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>
      {err && <div className="evd-err">{err}</div>}
      <button type="button" className="evd-btn" onClick={sell} disabled={!count || busy || readOnly} data-testid="evd-sell">
        {busy ? <Loader2 size={18} className="evd-spin" /> : <Store size={18} />} {t.sellBtn.replace("{n}", count).replace("{amt}", usd(total))}
      </button>
    </div>
  );
}

function OrdersTab({ t, lang, ev, onDone }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [view, setView] = useState("");
  const load = useCallback(
    () =>
      evDoor
        .orders({ event: ev._id, status: "review" })
        .then((r) => setRows(r.data))
        .catch(() => setRows([])),
    [ev._id],
  );
  useEffect(() => {
    load();
  }, [load]);
  const act = async (o, ok) => {
    let reason = "";
    if (!ok) {
      reason = window.prompt(t.rejectWhy, "");
      if (reason === null) return;
    }
    setBusy(o._id);
    setErr("");
    try {
      if (ok) await evDoor.approve(o._id);
      else await evDoor.reject(o._id, reason);
      await load();
      onDone();
    } catch (e) {
      setErr(e.message);
      load();
    } finally {
      setBusy("");
    }
  };
  const list = useMemo(() => rows || [], [rows]);
  return (
    <div className="evd-col">
      <h2>{t.ordersTitle}</h2>
      {err && <div className="evd-err">{err}</div>}
      {!rows ? (
        <Loader2 size={22} className="evd-spin" />
      ) : !list.length ? (
        <p className="evd-muted">{t.noOrders}</p>
      ) : (
        list.map((o) => (
          <div key={o._id} className="evd-order">
            {o.proof && (
              <button type="button" className="evd-proof" onClick={() => setView(o.proof)}>
                <img src={o.proof} alt="" />
              </button>
            )}
            <div>
              <b>
                #{o.no} · {usd(o.total)}
              </b>
              <small>
                {o.buyer?.name} · {o.buyer?.phone}
              </small>
              <small>
                {o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")} · {when(o.created_date, lang)}
              </small>
              <div className="evd-order-acts">
                <button type="button" className="evd-btn small" onClick={() => act(o, true)} disabled={!!busy}>
                  {busy === o._id ? <Loader2 size={15} className="evd-spin" /> : <CheckCircle2 size={15} />} {t.approve}
                </button>
                <button type="button" className="evd-btn small ghost" onClick={() => act(o, false)} disabled={!!busy}>
                  <XCircle size={15} /> {t.reject}
                </button>
              </div>
            </div>
          </div>
        ))
      )}
      {view && (
        <button type="button" className="evd-viewer" onClick={() => setView("")}>
          <img src={view} alt="" />
        </button>
      )}
    </div>
  );
}
