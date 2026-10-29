import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, CalendarX, ClipboardCheck, ClipboardList, HandCoins, Monitor, ShoppingBag, Vault, CloudOff, Delete, Link2, Lock, LogOut, Moon, RefreshCw, ShoppingBasket, ShoppingCart, SunMedium, Wifi, X } from "lucide-react";
import "../../dashboard/layout/layout.css";
import "../../dashboard/admin/master_data/masterdata.css";
import "../../dashboard/super_admin/super-admin.css";
import "../../dashboard/client/restaurant/restaurant.css";
import "../../dashboard/client/attendance/attendance.css";
import "../../dashboard/client/guesthouse/guesthouse.css";
import "../../dashboard/client/mart/mart.css";
import "../guesthouse/ghpos.css";
import "./martpos.css";
import { useI18n } from "../../i18n/I18nProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { useNotice } from "../../dashboard/super_admin/parts";
import { MART_TEXT, setCustomMethods } from "../../dashboard/client/mart/text";
import { device, martPosApi, session } from "./martApi";
import { cachedBoot, clearAll, dismissFailed, flush, forgetOffline, hasCache, offlineApi, offlineLogin, pull, rememberSession, startSync, subscribe } from "./offline";
import { P } from "./ptext";
import SellScreen from "./SellScreen";
// static (not lazy): every POS screen must open with no internet
import { SalesTab } from "../../dashboard/client/mart/MartSales";
import { StockTab } from "../../dashboard/client/mart/MartStock";
import { DebtTab } from "../../dashboard/client/mart/MartDebt";
import { ExpiryTab } from "../../dashboard/client/mart/MartExpiry";
import { PurchaseTab } from "../../dashboard/client/mart/MartPurchase";
import { openDisplayWindow } from "./display";
import { CloseShiftSheet, OpenShiftScreen, ShiftDoneScreen } from "./MartShift";
import { OrderAlertBar, PosOrdersTab, useOrderAlert } from "../../dashboard/client/mart/MartOrders";
import { wText } from "../../dashboard/client/mart/wtext";
import { loadPosFont, posLookClass, posVars } from "./posThemes";
import PoweredBy from "../../components/PoweredBy";

// keep the POS opening with no internet (same worker as the other POS kinds)
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
const OFFLINE_KEY = "bizhub_mart_offline_staff";
const store = {
  get: () => {
    try {
      return localStorage.getItem(OFFLINE_KEY) || "";
    } catch {
      return "";
    }
  },
  set: (v) => {
    try {
      if (v) localStorage.setItem(OFFLINE_KEY, v);
      else localStorage.removeItem(OFFLINE_KEY);
    } catch {
      /* private mode */
    }
  },
};

const TABS = [
  ["sell", ShoppingCart, null],
  ["sales", ClipboardList, SalesTab],
  ["stock", Boxes, StockTab],
  ["debt", HandCoins, DebtTab],
  ["orders", ShoppingBag, PosOrdersTab],
  ["expiry", CalendarX, ExpiryTab],
  ["purchase", ClipboardCheck, PurchaseTab],
];
const SHOW = { stock: (b) => b.stock, debt: (b) => b.debt, orders: (b) => b.shop, expiry: (b) => b.addons_on?.mart_expiry && b.staff.role === "manager", purchase: (b) => b.addons_on?.mart_purchase && b.staff.role === "manager" };

export default function MartPosApp() {
  const { lang, toggleLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const m = MART_TEXT[lang] || MART_TEXT.en;
  const p = P[lang] || P.en;
  const [stage, setStage] = useState(() => (!device.get() ? "pair" : session.get() || store.get() ? "boot" : "pin"));
  const [net, setNet] = useState(null);
  const [bootError, setBootError] = useState("");
  const [boot, setBoot] = useState(null);
  const [tab, setTab] = useState("sell");
  // shifts add-on (like the Restaurant POS): count the drawer before selling, count again to close
  const [skipShift, setSkipShift] = useState(false);
  const [closing, setClosing] = useState(false);
  const [shiftDone, setShiftDone] = useState(null);
  const [notice, setNotice] = useNotice();
  // online orders (mart_shop): the POS rings while new orders wait
  const orderAlert = useOrderAlert(offlineApi, "pos", stage === "main" && !!boot?.shop);
  useEffect(() => subscribe(setNet), []);
  // the POS look (mart_pos_theme): colours + font on the whole page (also the PIN + shift screens)
  const look = boot?.pos_theme || (hasCache() ? cachedBoot()?.pos_theme : "") || "classic";
  const lookColor = (boot ? boot.pos_color : hasCache() ? cachedBoot()?.pos_color : "") || "";
  useEffect(() => {
    loadPosFont(look);
    const vars = posVars(look, theme === "dark", lookColor);
    const el = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
    return () => Object.keys(vars).forEach((k) => el.style.removeProperty(k));
  }, [look, theme, lookColor]);
  useEffect(() => {
    registerOffline();
  }, []);

  // a 401 anywhere: no device → pair again; no session → PIN
  useEffect(() => {
    const on = (e) => {
      if (e.detail === "no_device") {
        device.set("");
        session.set("");
        store.set("");
        clearAll();
        setStage("pair");
        setNotice({ type: "error", text: p.ended });
      } else {
        session.set("");
        store.set("");
        forgetOffline();
        setStage("pin");
      }
    };
    window.addEventListener("mart-pos-401", on);
    return () => window.removeEventListener("mart-pos-401", on);
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
  // products changed on the server (owner added some): show them
  useEffect(() => {
    if (stage === "main" && boot && cachedBoot() && cachedBoot() !== boot) setBoot(cachedBoot());
  }, [net]); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx = useMemo(() => {
    if (!boot) return null;
    setCustomMethods(boot.settings.custom_methods);
    const b = boot.business;
    return {
      id: "pos",
      m,
      lang,
      data: boot,
      cur: boot.settings.currency,
      readOnly: !b.status || !!boot.license.locked,
      role: boot.staff.role,
      api: offlineApi,
      pos: true,
      shop: { name: b.name, logo_url: b.logo_url, address: b.address, phone: b.phone, receipt_note: boot.settings.receipt_note },
      reload: load,
      notify: setNotice,
      go: (k) => setTab(k),
      onOrders: () => orderAlert.refresh(),
    };
  }, [boot, m, lang, load, setNotice]); // eslint-disable-line react-hooks/exhaustive-deps

  const lock = () => {
    setSkipShift(false);
    setShiftDone(null);
    setClosing(false);
    session.set("");
    store.set("");
    forgetOffline();
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
          store.set(staffId ? `offline:${staffId}` : "");
          setStage("boot");
        }}
        onUnlink={() => {
          device.set("");
          store.set("");
          clearAll();
          setStage("pair");
        }}
      />
    );
  if (!ctx)
    return (
      <div className="ghp-center mp-center">
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

  if (shiftDone) return <ShiftDoneScreen p={p} m={m} boot={boot} shift={shiftDone} canPrint={!!boot.print?.on} onDone={lock} />;
  if (boot.shifts && !boot.shift && !skipShift) return <OpenShiftScreen p={p} boot={boot} online={net?.online !== false} onOpened={load} onLock={lock} onSkip={() => setSkipShift(true)} />;
  const Current = (TABS.find(([k]) => k === tab) || TABS[0])[2];
  return (
    <div className={`ghp mp md-page at-page gh-page mt-page ${posLookClass(look)} ${tab === "sell" ? "mp-on-sell" : ""}`}>
      {notice}
      <header className="ghp-top mp-top">
        <span className="ghp-brand mp-brand">
          {boot.business.logo_url ? <img src={boot.business.logo_url} alt="" /> : <ShoppingBasket size={22} />}
          <b>{boot.business.name}</b>
        </span>
        <nav className="ghp-tabs">
          {TABS.filter(([k]) => !SHOW[k] || SHOW[k](boot)).map(([k, Icon]) => (
            <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              <Icon size={17} /> <span>{m.tabs[k]}</span>
              {k === "orders" && orderAlert.count > 0 && <em className="mp-badge">{orderAlert.count}</em>}
            </button>
          ))}
        </nav>
        <span className="ghp-right">
          <NetPill p={p} net={net} />
          {boot.display && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm ghp-sq" onClick={openDisplayWindow} aria-label="customer screen" title={lang === "km" ? "អេក្រង់អតិថិជន" : "Customer screen"} data-testid="mp-display">
              <Monitor size={18} />
            </button>
          )}
          {boot.shifts && boot.shift && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setClosing(true)} data-testid="mp-close-shift">
              <Vault size={15} /> <span className="ghp-hide-sm">{p.closeShift}</span>
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm ghp-sq" onClick={toggleTheme} aria-label="theme">
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
            <Lock size={15} /> <span className="ghp-hide-sm">{p.lock}</span>
          </button>
        </span>
      </header>
      {tab !== "orders" && <OrderAlertBar w={wText(lang)} alert={orderAlert} onOpen={() => setTab("orders")} />}
      {net && !net.online && <div className="ghp-offline">{p.offlineHint}</div>}
      {net?.failed?.length > 0 && (
        <div className="ghp-failed">
          <b>{net.held ? p.heldTitle : p.failedTitle}</b>
          <ul>
            {net.failed.map((f, i) => (
              <li key={i}>
                {f.label ? `${f.label} · ` : ""}
                {f.message}
              </li>
            ))}
          </ul>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={dismissFailed}>
            {p.dismiss}
          </button>
        </div>
      )}
      {closing && (
        <CloseShiftSheet
          p={p}
          m={m}
          boot={boot}
          onClose={() => setClosing(false)}
          onClosed={(sh) => {
            setClosing(false);
            setShiftDone(sh);
            load();
          }}
        />
      )}
      <main className={tab === "sell" ? "mp-main" : "ghp-main"}>{tab === "sell" ? <SellScreen ctx={ctx} p={p} /> : <Current ctx={ctx} key={tab} />}</main>
    </div>
  );
}

function NetPill({ p, net }) {
  if (!net) return null;
  const cls = !net.online ? "off" : net.pending ? "wait" : "on";
  const label = net.syncing ? p.syncing : !net.online ? p.offline : p.online;
  return (
    <button type="button" className={`ghp-net ${cls}`} onClick={() => (net.pending ? flush() : pull()).catch(() => {})} title={p.syncNow} data-testid="mp-net">
      {net.syncing ? <RefreshCw size={15} className="spin" /> : net.online ? <Wifi size={15} /> : <CloudOff size={15} />}
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
      const r = await martPosApi.pair(code, name);
      device.set(r.data.token);
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <div className="ghp-center mp-center">
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
    martPosApi
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
    <div className="ghp-center mp-center">
      {notice}
      <div className="ghp-card ghp-pin">
        <div className="ghp-card-top">
          <span className="ghp-icon">{business?.logo_url ? <img src={business.logo_url} alt="" /> : <ShoppingBasket size={26} />}</span>
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
        <PoweredBy className="pos-powered" />
      </div>
    </div>
  );
}
