import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Sparkles, Wallet, KeyRound, BedDouble, BellRing, CalendarRange, ClipboardList, CloudOff, Delete, Link2, Lock, LogOut, MonitorUp, Moon, QrCode, RefreshCw, Sun, SunMedium, Wifi, X } from "lucide-react";
import "../../dashboard/layout/layout.css";
import "../../dashboard/admin/master_data/masterdata.css";
import "../../dashboard/super_admin/super-admin.css";
import "../../dashboard/client/restaurant/restaurant.css";
import "../../dashboard/client/attendance/attendance.css";
import "../../dashboard/client/guesthouse/guesthouse.css";
import "./ghpos.css";
import { useI18n } from "../../i18n/I18nProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { useNotice } from "../../dashboard/super_admin/parts";
import { TabSkeleton } from "../../components/skeleton/Skeleton";
import { GH_TEXT } from "../../dashboard/client/guesthouse/text";
import { BookingAlertBar, RequestsSheet, useBookingAlert } from "../../dashboard/client/guesthouse/GhRequests";
import { device, ghPosApi, session } from "./ghApi";
import { openDisplayWindow, pictureOf, remoteKey, showOnDisplay } from "./display";
import { clearAll, dismissFailed, flush, forgetOffline, hasCache, offlineApi, offlineLogin, pull, rememberSession, startSync, subscribe } from "./offline";

// keep the POS opening with no internet: the browser saves its files the first time (same worker as the Restaurant POS)
function registerOffline() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;
  navigator.serviceWorker
    .register("/pos-sw.js", { scope: "/pos" })
    .then(async (reg) => {
      await navigator.serviceWorker.ready;
      const urls = [...new Set([location.pathname, ...performance.getEntriesByType("resource").map((e) => e.name), ...[...document.querySelectorAll("script[src],link[rel=stylesheet]")].map((el) => el.src || el.href)])].filter(
        (u) => !u.includes("/api/"),
      );
      (reg.active || navigator.serviceWorker.controller)?.postMessage({ type: "cache", urls });
    })
    .catch(() => {});
}
const OFFLINE_KEY = "bizhub_gh_offline_staff";

const TodayTab = lazy(() => import("../../dashboard/client/guesthouse/GhDaily").then((m) => ({ default: m.TodayTab })));
const CalendarTab = lazy(() => import("../../dashboard/client/guesthouse/GhDaily").then((m) => ({ default: m.CalendarTab })));
const BookingsTab = lazy(() => import("../../dashboard/client/guesthouse/GhDaily").then((m) => ({ default: m.BookingsTab })));
const ReportTab = lazy(() => import("../../dashboard/client/guesthouse/GhDaily").then((m) => ({ default: m.ReportTab })));
const HousekeepingTab = lazy(() => import("../../dashboard/client/guesthouse/GhOps").then((m) => ({ default: m.HousekeepingTab })));
const LeasesTab = lazy(() => import("../../dashboard/client/guesthouse/GhLease").then((m) => ({ default: m.LeasesTab })));
const ExpensesTab = lazy(() => import("../../dashboard/client/guesthouse/GhOps").then((m) => ({ default: m.ExpensesTab })));
const TABS = [
  ["today", Sun, TodayTab],
  ["calendar", CalendarRange, CalendarTab],
  ["bookings", ClipboardList, BookingsTab],
  ["housekeeping", Sparkles, HousekeepingTab],
  ["longstay", KeyRound, LeasesTab],
  ["report", BarChart3, ReportTab],
  ["expenses", Wallet, ExpensesTab],
];
// which screens this person sees: a housekeeper only cleans rooms; add-ons the guest house doesn't have stay hidden
const tabsOf = (boot) =>
  boot?.staff?.role === "housekeeper" ? TABS.filter(([k]) => k === "housekeeping") : TABS.filter(([k]) => (k === "housekeeping" ? boot?.housekeeping : k === "expenses" ? boot?.expenses : k === "longstay" ? boot?.longstay : true));

const P = {
  en: {
    title: "Guest House POS",
    pairTitle: "Link this device",
    pairSub: "In BizHub open your guest house → Staff & POS → “Link a device”, then type the 6-digit code here.",
    code: "6-digit code",
    deviceName: "Device name",
    deviceNamePh: "e.g. Front desk",
    link: "Link device",
    linking: "Linking…",
    enterPin: "Type your 4-digit PIN",
    wrongPin: "Wrong PIN",
    lock: "Lock",
    unlink: "Unlink this device",
    unlinkSure: "Unlink? You will need a new code from the owner.",
    display: "Guest display",
    displayHere: "Open on this computer",
    displayHereSub: "Opens a new window — drag it to the screen facing the guest.",
    displayTablet: "Another tablet",
    displayTabletSub: "Scan with the tablet, or open the link there.",
    displayLocked: "The guest display is an add-on. Ask the owner to unlock it (Add-ons → Guest display).",
    close: "Close",
    hello: "Hi, {name}",
    roles: { manager: "Manager", desk: "Desk", housekeeper: "Housekeeper" },
    ended: "This device was unlinked or the license ended.",
    online: "Online",
    offline: "Offline",
    waiting: "{n} waiting",
    syncing: "Syncing…",
    syncNow: "Sync now",
    offlineHint: "No internet — keep working. Everything is saved on this device and sent when the internet is back.",
    noCache: "No internet. This device has not saved the guest house yet — connect once to start.",
    failedTitle: "Some offline changes were refused by the server:",
    dismiss: "OK",
    pinOffline: "Offline login",
  },
  km: {
    title: "POS ផ្ទះសំណាក់",
    pairTitle: "ភ្ជាប់ឧបករណ៍នេះ",
    pairSub: "ក្នុង BizHub បើកផ្ទះសំណាក់ → បុគ្គលិក & POS → “ភ្ជាប់ឧបករណ៍” រួចវាយលេខកូដ 6 ខ្ទង់នៅទីនេះ។",
    code: "លេខកូដ 6 ខ្ទង់",
    deviceName: "ឈ្មោះឧបករណ៍",
    deviceNamePh: "ឧ. តុទទួលភ្ញៀវ",
    link: "ភ្ជាប់ឧបករណ៍",
    linking: "កំពុងភ្ជាប់…",
    enterPin: "វាយ PIN 4 ខ្ទង់របស់អ្នក",
    wrongPin: "PIN មិនត្រឹមត្រូវ",
    lock: "ចាក់សោ",
    unlink: "ផ្តាច់ឧបករណ៍នេះ",
    unlinkSure: "ផ្តាច់? អ្នកត្រូវការលេខកូដថ្មីពីម្ចាស់។",
    display: "អេក្រង់ភ្ញៀវ",
    displayHere: "បើកលើកុំព្យូទ័រនេះ",
    displayHereSub: "បើកផ្ទាំងថ្មី — អូសទៅអេក្រង់ដែលបែរទៅភ្ញៀវ។",
    displayTablet: "ថេប្លេតផ្សេង",
    displayTabletSub: "ស្កេនដោយថេប្លេត ឬបើកតំណនៅទីនោះ។",
    displayLocked: "អេក្រង់ភ្ញៀវជាមុខងារបន្ថែម។ សូមឱ្យម្ចាស់ដោះសោ (មុខងារបន្ថែម → អេក្រង់ភ្ញៀវ)។",
    close: "បិទ",
    hello: "សួស្តី {name}",
    roles: { manager: "អ្នកគ្រប់គ្រង", desk: "តុទទួលភ្ញៀវ", housekeeper: "អ្នកសម្អាត" },
    ended: "ឧបករណ៍នេះត្រូវបានផ្តាច់ ឬអាជ្ញាប័ណ្ណផុតកំណត់។",
    online: "មានអ៊ីនធឺណិត",
    offline: "គ្មានអ៊ីនធឺណិត",
    waiting: "{n} កំពុងរង់ចាំ",
    syncing: "កំពុងផ្ញើ…",
    syncNow: "ផ្ញើឥឡូវ",
    offlineHint: "គ្មានអ៊ីនធឺណិត — បន្តធ្វើការបាន។ ទិន្នន័យរក្សាទុកលើឧបករណ៍នេះ ហើយនឹងផ្ញើពេលមានអ៊ីនធឺណិតវិញ។",
    noCache: "គ្មានអ៊ីនធឺណិត។ ឧបករណ៍នេះមិនទាន់រក្សាទុកទិន្នន័យទេ — សូមភ្ជាប់អ៊ីនធឺណិតម្តងដើម្បីចាប់ផ្តើម។",
    failedTitle: "ការកែប្រែខ្លះពេលគ្មានអ៊ីនធឺណិត ត្រូវបានបដិសេធដោយម៉ាស៊ីនមេ៖",
    dismiss: "យល់ព្រម",
    pinOffline: "ចូលពេលគ្មានអ៊ីនធឺណិត",
  },
};

export default function GhPosApp() {
  const { lang, toggleLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const g = GH_TEXT[lang] || GH_TEXT.en;
  const p = P[lang] || P.en;
  const offStaff = () => {
    try {
      return localStorage.getItem(OFFLINE_KEY) || "";
    } catch {
      return "";
    }
  };
  const setOffStaff = (v) => {
    try {
      if (v) localStorage.setItem(OFFLINE_KEY, v);
      else localStorage.removeItem(OFFLINE_KEY);
    } catch {
      /* private mode */
    }
  };
  const [stage, setStage] = useState(() => (!device.get() ? "pair" : session.get() || offStaff() ? "boot" : "pin"));
  const [net, setNet] = useState(null);
  const [bootError, setBootError] = useState("");
  useEffect(() => subscribe(setNet), []);
  useEffect(() => {
    registerOffline();
  }, []);
  const [boot, setBoot] = useState(null);
  const [tab, setTab] = useState("today");
  const [notice, setNotice] = useNotice();
  const [displayOpen, setDisplayOpen] = useState(false);
  // online bookings from customer accounts: ring until someone accepts or declines
  const alert = useBookingAlert(ghPosApi, "pos", stage === "main" && !!session.get() && boot?.staff?.role !== "housekeeper");
  const tabs = tabsOf(boot);
  useEffect(() => {
    if (boot && !tabs.some(([k]) => k === tab)) setTab(tabs[0][0]);
  }, [boot]); // eslint-disable-line react-hooks/exhaustive-deps
  const [reqOpen, setReqOpen] = useState(false);

  // a 401 anywhere: no device → pair again; no session → PIN
  useEffect(() => {
    const on = (e) => {
      if (e.detail === "no_device") {
        device.set("");
        session.set("");
        setOffStaff("");
        clearAll();
        setStage("pair");
        setNotice({ type: "error", text: p.ended });
      } else {
        session.set("");
        setOffStaff("");
        forgetOffline();
        setStage("pin");
      }
    };
    window.addEventListener("gh-pos-401", on);
    return () => window.removeEventListener("gh-pos-401", on);
  }, [p.ended, setNotice]);

  const load = useCallback(
    () =>
      offlineApi
        .boot()
        .then((r) => {
          setBootError("");
          setBoot(r.data);
          setStage("main");
          startSync();
          return r.data;
        })
        .catch((e) => {
          if (e.code === "network") setBootError("nocache");
        }),
    [],
  );
  useEffect(() => {
    if (stage === "boot") load();
  }, [stage, load]);
  // idle picture on the guest display
  useEffect(() => {
    if (boot) showOnDisplay(pictureOf(boot, null, lang));
  }, [boot, lang]);

  const ctx = useMemo(() => {
    if (!boot) return null;
    return {
      id: "pos",
      g,
      lang,
      data: boot,
      cur: boot.settings.currency,
      readOnly: !boot.business.status || !!boot.license.locked,
      role: boot.staff.role,
      api: offlineApi,
      pos: true,
      reload: load,
      notify: setNotice,
      askBuy: (x) => setNotice({ type: "error", text: x?.addon === "gh_printer" ? g.printLocked : p.displayLocked }),
      go: (k) => tabsOf(boot).some(([x]) => x === k) && setTab(k),
      onBill: (stay) => showOnDisplay(pictureOf(boot, stay, lang)),
    };
  }, [boot, g, lang, load, setNotice, p.displayLocked]);

  const lock = () => {
    session.set("");
    setOffStaff("");
    forgetOffline();
    showOnDisplay(boot ? pictureOf(boot, null, lang) : null);
    setStage("pin");
  };

  if (stage === "pair") return <Pair p={p} lang={lang} toggleLang={toggleLang} notice={notice} onDone={() => setStage("pin")} />;
  if (stage === "pin")
    return (
      <Pin
        p={p}
        lang={lang}
        toggleLang={toggleLang}
        notice={notice}
        business={boot?.business}
        onDone={(staffId) => {
          setOffStaff(staffId ? `offline:${staffId}` : "");
          setStage("boot");
        }}
        onUnlink={() => {
          device.set("");
          setOffStaff("");
          clearAll();
          setStage("pair");
        }}
      />
    );
  if (!ctx)
    return (
      <div className="ghp-center">
        {bootError ? (
          <div className="ghp-card">
            <span className="ghp-icon">
              <CloudOff size={26} />
            </span>
            <p className="ghp-muted">{p.noCache}</p>
            <button type="button" className="md-btn md-btn-primary ghp-big" onClick={load}>
              <RefreshCw size={16} /> {p.syncNow}
            </button>
          </div>
        ) : (
          "…"
        )}
      </div>
    );

  const Current = (tabs.find(([k]) => k === tab) || tabs[0])[2];
  return (
    <div className="ghp md-page at-page gh-page">
      {notice}
      <BookingAlertBar lang={lang} alert={alert} onOpen={() => setReqOpen(true)} />
      {reqOpen && (
        <RequestsSheet
          api={ghPosApi}
          id="pos"
          lang={lang}
          cur={boot.settings.currency}
          notify={setNotice}
          onClose={() => setReqOpen(false)}
          onChange={() => {
            alert.refresh();
            pull().catch(() => {});
          }}
        />
      )}
      <header className="ghp-top">
        <span className="ghp-brand">
          {boot.business.logo_url ? <img src={boot.business.logo_url} alt="" /> : <BedDouble size={22} />}
          <b>{boot.business.name}</b>
        </span>
        <nav className="ghp-tabs">
          {tabs.map(([k, Icon]) => (
            <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              <Icon size={17} /> <span>{g.tabs[k]}</span>
            </button>
          ))}
        </nav>
        <span className="ghp-right">
          <NetPill p={p} net={net} />
          {alert.on && (
            <button type="button" className={`md-btn md-btn-ghost sa-btn-sm ghp-sq ghp-bell ${alert.count ? "ring" : ""}`} onClick={() => setReqOpen(true)} aria-label="online bookings">
              <BellRing size={18} />
              {alert.count > 0 && <em>{alert.count}</em>}
            </button>
          )}
          {boot.staff.role !== "housekeeper" && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setDisplayOpen(true)} title={p.display}>
              <MonitorUp size={16} /> <span className="ghp-hide-sm">{p.display}</span>
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm ghp-sq" onClick={toggleTheme} aria-label="theme" title={theme === "dark" ? "Light" : "Dark"}>
            {theme === "dark" ? <SunMedium size={18} /> : <Moon size={18} />}
          </button>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm ghp-sq" onClick={toggleLang}>
            {lang === "km" ? "EN" : "ខ្មែរ"}
          </button>
          <span className="ghp-who">
            <b>{boot.staff.name}</b>
            <small>{p.roles[boot.staff.role]}</small>
          </span>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={lock}>
            <Lock size={15} /> {p.lock}
          </button>
        </span>
      </header>
      {net && !net.online && <div className="ghp-offline">{p.offlineHint}</div>}
      {net?.failed?.length > 0 && (
        <div className="ghp-failed">
          <b>{p.failedTitle}</b>
          <ul>
            {net.failed.map((f, i) => (
              <li key={i}>
                {f.guest ? `${f.guest} · ` : ""}
                {f.message}
              </li>
            ))}
          </ul>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={dismissFailed}>
            {p.dismiss}
          </button>
        </div>
      )}
      <main className="ghp-main">
        <Suspense fallback={<TabSkeleton />}>
          <Current ctx={ctx} key={tab} />
        </Suspense>
      </main>
      {displayOpen && <DisplaySheet p={p} on={boot.display.on} onClose={() => setDisplayOpen(false)} />}
    </div>
  );
}

function NetPill({ p, net }) {
  if (!net) return null;
  const busy = net.syncing;
  const cls = !net.online ? "off" : net.pending ? "wait" : "on";
  const label = busy ? p.syncing : !net.online ? p.offline : p.online;
  return (
    <button type="button" className={`ghp-net ${cls}`} onClick={() => (net.pending ? flush() : pull()).catch(() => {})} title={p.syncNow} data-testid="gh-net">
      {busy ? <RefreshCw size={15} className="spin" /> : net.online ? <Wifi size={15} /> : <CloudOff size={15} />}
      <span className="ghp-hide-sm">{label}</span>
      {net.pending > 0 && <em>{p.waiting.replace("{n}", net.pending)}</em>}
    </button>
  );
}

function LangBtn({ lang, toggleLang }) {
  return (
    <button type="button" className="ghp-lang" onClick={toggleLang}>
      {lang === "km" ? "EN" : "ខ្មែរ"}
    </button>
  );
}

function Pair({ p, lang, toggleLang, notice, onDone }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await ghPosApi.pair(code, name);
      device.set(r.data.token);
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <div className="ghp-center">
      {notice}
      <form className="ghp-card" onSubmit={submit}>
        <div className="ghp-card-top">
          <span className="ghp-icon">
            <Link2 size={26} />
          </span>
          <LangBtn lang={lang} toggleLang={toggleLang} />
        </div>
        <small className="ghp-kicker">{p.title}</small>
        <h1>{p.pairTitle}</h1>
        <p className="ghp-muted">{p.pairSub}</p>
        <input className="ghp-code" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} aria-label={p.code} autoFocus />
        <input className="ghp-input" maxLength={60} placeholder={p.deviceNamePh} value={name} onChange={(e) => setName(e.target.value)} aria-label={p.deviceName} />
        {error && <div className="md-form-error">{error}</div>}
        <button type="submit" className="md-btn md-btn-primary ghp-big" disabled={busy || code.length !== 6}>
          {busy ? p.linking : p.link}
        </button>
      </form>
    </div>
  );
}

function Pin({ p, lang, toggleLang, notice, business, onDone, onUnlink }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  useEffect(() => {
    if (pin.length !== 4) return;
    setBusy(true);
    ghPosApi
      .login(pin)
      .then((r) => {
        session.set(r.data.session);
        if (r.data.staff?._id) rememberSession(r.data.staff._id, r.data.session);
        pull().catch(() => {});
        onDone();
      })
      .catch(async (err) => {
        // no internet: check the PIN against the copy saved on this device
        if (err.code === "network" && hasCache()) {
          const st = await offlineLogin(pin);
          if (st) {
            session.set("");
            onDone(st._id);
            return;
          }
        }
        setError(true);
        setTimeout(() => {
          setError(false);
          setPin("");
        }, 600);
      })
      .finally(() => setBusy(false));
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) setPin((x) => (x.length < 4 ? x + e.key : x));
      if (e.key === "Backspace") setPin((x) => x.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="ghp-center">
      {notice}
      <div className="ghp-card ghp-pin">
        <div className="ghp-card-top">
          <span className="ghp-icon">{business?.logo_url ? <img src={business.logo_url} alt="" /> : <BedDouble size={26} />}</span>
          <LangBtn lang={lang} toggleLang={toggleLang} />
        </div>
        <small className="ghp-kicker">{p.title}</small>
        <h1>{business?.name || p.title}</h1>
        <p className={`ghp-muted ${error ? "bad" : ""}`}>
          <Lock size={14} /> {error ? p.wrongPin : p.enterPin}
        </p>
        <div className={`ghp-dots ${error ? "shake" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={i < pin.length ? "on" : ""} />
          ))}
        </div>
        <div className="ghp-pad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k) =>
            k === "" ? (
              <span key="sp" />
            ) : (
              <button key={k} type="button" disabled={busy} onClick={() => setPin((x) => (k === "del" ? x.slice(0, -1) : x.length < 4 ? x + k : x))} aria-label={k}>
                {k === "del" ? <Delete size={22} /> : k}
              </button>
            ),
          )}
        </div>
        {sure ? (
          <div className="ghp-unlink">
            <small>{p.unlinkSure}</small>
            <button type="button" className="md-btn md-btn-danger sa-btn-sm" onClick={onUnlink}>
              <LogOut size={14} /> {p.unlink}
            </button>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setSure(false)}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <button type="button" className="ghp-link-btn" onClick={() => setSure(true)}>
            <LogOut size={14} /> {p.unlink}
          </button>
        )}
      </div>
    </div>
  );
}

function DisplaySheet({ p, on, onClose }) {
  const [key, setKey] = useState("");
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const link = key ? `${window.location.origin}/pos/guest-house/display?key=${key}` : "";
  const tablet = async () => {
    setError("");
    try {
      const k = await remoteKey();
      setKey(k);
      const QR = await import("qrcode");
      setQr(await (QR.default || QR).toDataURL(`${window.location.origin}/pos/guest-house/display?key=${k}`, { width: 360, margin: 1 }));
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="md-modal-backdrop" onMouseDown={onClose}>
      <div className="md-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="md-modal-header">
          <h3>{p.display}</h3>
          <button type="button" className="md-icon-btn" onClick={onClose} aria-label={p.close}>
            <X size={18} />
          </button>
        </div>
        <div className="md-modal-body">
          {!on ? (
            <p className="rs-muted">{p.displayLocked}</p>
          ) : (
            <div className="ghp-disp">
              <button type="button" className="ghp-disp-opt" onClick={openDisplayWindow}>
                <MonitorUp size={26} />
                <b>{p.displayHere}</b>
                <small>{p.displayHereSub}</small>
              </button>
              <button type="button" className="ghp-disp-opt" onClick={tablet}>
                <QrCode size={26} />
                <b>{p.displayTablet}</b>
                <small>{p.displayTabletSub}</small>
              </button>
              {qr && (
                <div className="ghp-disp-qr">
                  <img src={qr} alt="QR" />
                  <a href={link} target="_blank" rel="noreferrer">
                    {link}
                  </a>
                </div>
              )}
              {error && <div className="md-form-error">{error}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
