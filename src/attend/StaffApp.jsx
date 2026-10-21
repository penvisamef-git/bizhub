import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Delete,
  Fingerprint,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Moon,
  Palmtree,
  Plus,
  Power,
  Sun,
  SunMedium,
  Wallet,
  X as XIcon,
  FileText,
  UsersRound,
  Megaphone,
} from "lucide-react";
import { API_AUTH_KEY, API_HOST } from "../config";
import { useI18n } from "../i18n/I18nProvider";
import usePageTitle from "../components/usePageTitle";
import { TEXT } from "./text";
import { resizeImage } from "../lib/image";
import HomeView, { Header } from "./HomeView";
import TeamView, { teamTab } from "./TeamView";
import { NewsView, RewardsCard, newsTab } from "./EngageViews";
import { colorVars } from "./looks";
import "./attend.css";
import { useConfirmSignOut } from "../components/ConfirmSignOut";

const BASE = `${API_HOST}/api/att`;
const DEVICE_KEY = "bizhub_att_device";
const MODE_KEY = "bizhub_att_mode"; // auto | light | dark
const tokenKey = (code) => `bizhub_att_token:${code}`;
const store = {
  get: (k) => {
    try {
      return localStorage.getItem(k) || "";
    } catch {
      return "";
    }
  },
  set: (k, v) => {
    try {
      if (v) localStorage.setItem(k, v);
      else localStorage.removeItem(k);
    } catch {
      /* private mode */
    }
  },
};
// one id per phone, kept forever: the first login locks the account to it
const deviceId = () => {
  let id = store.get(DEVICE_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`).slice(0, 40);
    store.set(DEVICE_KEY, id);
  }
  return id;
};

async function call(path, { method = "GET", body, token } = {}) {
  let res;
  try {
    const form = typeof FormData !== "undefined" && body instanceof FormData;
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...(form ? {} : { "Content-Type": "application/json" }), ...(API_AUTH_KEY ? { "x-api-key": API_AUTH_KEY } : {}), ...(token ? { "x-att-token": token } : {}) },
      body: body ? (form ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    const e = new Error("network");
    e.code = "network";
    throw e;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const e = new Error(json.message || `Error ${res.status}`);
    e.status = res.status;
    e.code = json.code || "";
    throw e;
  }
  return json.data;
}

const hhmm = (d) => (d ? new Date(new Date(d).getTime() + 7 * 3600000).toISOString().slice(11, 16) : "—");
const dur = (min) => {
  const m = Math.round(Number(min) || 0);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}m` : ""}`;
};
const monthOf = (d = Date.now()) => new Date(d + 7 * 3600000).toISOString().slice(0, 7);
const shiftMonth = (month, n) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const initial = (n) => Array.from(String(n || "?").trim() || "?")[0].toUpperCase();

// where is the phone? → { lat, lng, accuracy } or null (with the reason)
const locate = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ error: "none" });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      (err) => resolve({ error: err.code === 1 ? "denied" : "failed" }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
const distanceM = (lat1, lng1, lat2, lng2) => {
  const rad = (x) => (x * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(a)));
};

// The staff phone app at /a/<code>: log in once (phone + PIN), then Clock in / Clock out
export default function StaffApp() {
  const { code } = useParams();
  // scanned the door kiosk QR: /a/<code>?k=<branch>.<code> (kept through the log in)
  const [kiosk, setKiosk] = useState(() => new URLSearchParams(window.location.search).get("k") || "");
  const clearKiosk = useCallback(() => {
    setKiosk("");
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const { lang, setLang } = useI18n();
  const x = TEXT[lang] || TEXT.en;
  const [token, setToken] = useState(() => store.get(tokenKey(code)));
  const [me, setMe] = useState(null);
  const [info, setInfo] = useState(null); // { name, logo_url } | { bad: true }
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState("");
  usePageTitle(me?.business?.name || info?.name || x.title);
  // the owner's chosen look (remembered on this phone so it shows at once next time)
  const themeKey = `bizhub_att_theme:${code}`;
  const theme = me?.theme || info?.theme || store.get(themeKey) || "classic";
  useEffect(() => {
    if (me?.theme || info?.theme) store.set(themeKey, me?.theme || info?.theme);
  }, [me?.theme, info?.theme, themeKey]);
  // light / dark: the staff's own choice on this phone, otherwise the phone's setting
  const [mode, setModeState] = useState(() => store.get(MODE_KEY) || "auto");
  const [sysDark, setSysDark] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return undefined;
    const on = (e) => setSysDark(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  const setMode = (m) => {
    store.set(MODE_KEY, m);
    setModeState(m);
  };
  const dark = mode === "dark" || (mode === "auto" && sysDark);
  const cls = `sa-app sa-t-${theme} ${dark ? "sa-dark" : "sa-light"}`;
  const style = colorVars(me?.color || info?.color || store.get(`${themeKey}:c`) || "#4F46E5");
  useEffect(() => {
    if (me?.color || info?.color) store.set(`${themeKey}:c`, me?.color || info?.color);
  }, [me?.color, info?.color, themeKey]);

  const errText = useCallback((e) => (e.code === "network" ? x.network : x.err[e.code] || e.message), [x]);
  const logout = useCallback(() => {
    store.set(tokenKey(code), "");
    setToken("");
    setMe(null);
  }, [code]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setMe(await call("/me", { token }));
      setError("");
    } catch (e) {
      if (e.status === 401) logout();
      else setError(errText(e));
    } finally {
      setLoading(false);
    }
  }, [token, logout, errText]);

  useEffect(() => {
    refresh();
    // pick up changes from the owner (new add-on, new shift times…) without a reload
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 60000);
    return () => clearInterval(t);
  }, [refresh]);
  useEffect(() => {
    if (token) return;
    call(`/info/${code}`)
      .then(setInfo)
      .catch((e) => setInfo(e.status === 404 ? { bad: true } : null));
  }, [code, token]);
  // fresh when the phone comes back to the app
  useEffect(() => {
    const on = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, [refresh]);

  const langBtn = (
    <>
      <button type="button" className="sa-lang" onClick={() => setLang(lang === "km" ? "en" : "km")}>
        {lang === "km" ? "EN" : "ខ្មែរ"}
      </button>
      <button type="button" className="sa-icon" onClick={() => setMode(dark ? "light" : "dark")} aria-label={dark ? x.lightMode : x.darkMode} title={dark ? x.lightMode : x.darkMode}>
        {dark ? <SunMedium size={17} /> : <Moon size={17} />}
      </button>
    </>
  );

  if (loading) {
    return (
      <div className={cls} style={style}>
        <div className="sa-center">
          <Loader2 size={30} className="sa-spin" />
        </div>
      </div>
    );
  }
  if (!token || !me) {
    return (
      <Login
        cls={cls}
        style={style}
        x={x}
        code={code}
        info={info}
        langBtn={langBtn}
        error={error}
        onIn={(data) => {
          store.set(tokenKey(code), data.token);
          setToken(data.token);
          setMe(data.me);
        }}
        errText={errText}
      />
    );
  }
  return <Home cls={cls} style={style} theme={theme} kiosk={kiosk} clearKiosk={clearKiosk} x={x} lang={lang} me={me} setMe={setMe} token={token} langBtn={langBtn} logout={logout} errText={errText} refresh={refresh} />;
}

// ============================ LOGIN ============================
function Login({ cls, style, x, code, info, langBtn, error: outer, onIn, errText }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(outer || "");
  const digits = phone.replace(/\D/g, "");

  const submit = async (p) => {
    setBusy(true);
    setError("");
    try {
      const ua = navigator.userAgent || "";
      onIn(await call("/login", { method: "POST", body: { code, phone, pin: p, device_id: deviceId(), device_label: ua.slice(0, 120) } }));
    } catch (e) {
      setError(errText(e));
      setPin("");
      if (e.code === "bad_link") setStep("phone");
    } finally {
      setBusy(false);
    }
  };
  const press = (d) => {
    if (busy) return;
    if (d === "del") return setPin((v) => v.slice(0, -1));
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) submit(next);
  };

  if (info?.bad) {
    return (
      <div className={cls} style={style}>
        <div className="sa-center sa-card">
          <AlertTriangle size={36} className="sa-bad" />
          <h2>{x.badLinkTitle}</h2>
          <p>{x.err.bad_link}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cls} style={style}>
      <header className="sa-top">
        <span className="sa-brand">
          <Fingerprint size={18} /> BizHub
        </span>
        {langBtn}
      </header>
      <div className="sa-login">
        <span className="sa-biz-logo">{info?.logo_url ? <img src={info.logo_url} alt="" /> : <Fingerprint size={34} />}</span>
        <h1>{info?.name || x.title}</h1>
        <p className="sa-sub">{step === "phone" ? x.loginSub : x.pinSub}</p>

        {step === "phone" ? (
          <form
            className="sa-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (digits.length >= 8) {
                setError("");
                setStep("pin");
              } else setError(x.badPhone);
            }}
          >
            <label className="sa-label" htmlFor="sa-phone">
              {x.phone}
            </label>
            <input id="sa-phone" className="sa-input" type="tel" inputMode="tel" autoComplete="tel" placeholder="012 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
            {error && <div className="sa-error">{error}</div>}
            <button type="submit" className="sa-btn">
              {x.next}
            </button>
          </form>
        ) : (
          <div className="sa-form">
            <button type="button" className="sa-back" onClick={() => (setStep("phone"), setPin(""), setError(""))}>
              <ChevronLeft size={16} /> {phone}
            </button>
            <div className={`sa-dots ${error ? "shake" : ""}`} aria-label={x.pin}>
              {[0, 1, 2, 3].map((i) => (
                <i key={i} className={i < pin.length ? "on" : ""} />
              ))}
            </div>
            {busy && <Loader2 size={22} className="sa-spin sa-mid" />}
            {error && <div className="sa-error">{error}</div>}
            <div className="sa-pad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((d, i) =>
                d === "" ? (
                  <span key={i} />
                ) : (
                  <button key={i} type="button" onClick={() => press(d)} disabled={busy} aria-label={d === "del" ? "Delete" : d}>
                    {d === "del" ? <Delete size={22} /> : d}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
        <p className="sa-note">{x.oneDevice}</p>
      </div>
    </div>
  );
}

// ============================ HOME ============================
function Home({ cls, style, theme, kiosk, clearKiosk, x, lang, me, setMe, token, langBtn, logout, errText, refresh }) {
  const fileRef = useRef(null);
  const [askOut, outDialog] = useConfirmSignOut(logout);
  const [tab, setTab] = useState("today");
  useEffect(() => {
    if ((tab === "pay" && !me.features?.pay) || (tab === "leave" && !me.features?.leave) || (tab === "team" && !me.features?.team) || (tab === "news" && !me.features?.news)) setTab("today");
  }, [tab, me.features?.pay, me.features?.leave, me.features?.team, me.features?.news]);
  const [unread, setUnread] = useState(me.news_unread || 0);
  useEffect(() => setUnread(me.news_unread || 0), [me.news_unread]);
  const [offset] = useState(() => new Date(me.server_time).getTime() - Date.now()); // phone clock may be wrong
  const [now, setNow] = useState(Date.now() + offset);
  const [step, setStep] = useState("idle"); // idle | locating | confirm-nogps | sending | done
  const [pos, setPos] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [sureOut, setSureOut] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(t);
  }, [offset]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const nearest = useMemo(() => {
    if (!pos?.lat) return null;
    const list = me.branches.filter((b) => Number.isFinite(b.lat));
    let best = null;
    for (const b of list) {
      const d = distanceM(pos.lat, pos.lng, b.lat, b.lng);
      if (!best || d - b.radius_m < best.d - best.b.radius_m) best = { b, d };
    }
    return best;
  }, [pos, me.branches]);

  // where: { lat, lng, accuracy } | null   photo: a resized selfie (Blob) or null
  const send = async (where, photo = null) => {
    setStep("sending");
    setError("");
    try {
      const fields = { kind: me.next, ...(where?.lat ? { lat: where.lat, lng: where.lng, accuracy: where.accuracy } : {}), ...(kiosk ? { kiosk } : {}) };
      let body = fields;
      if (photo) {
        body = new FormData();
        Object.entries(fields).forEach(([k, v]) => body.append(k, String(v)));
        body.append("photo", photo, "selfie.jpg");
      }
      const data = await call("/punch", { method: "POST", token, body });
      if (kiosk) clearKiosk();
      setResult(data.punch);
      setMe(data.me);
      setStep("done");
      setSureOut(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setStep("idle"), 12000);
    } catch (e) {
      if (e.status === 401) return logout();
      setError(errText(e));
      setStep("idle");
      if (e.code === "kiosk_old") clearKiosk();
      if (e.code === "already_in" || e.code === "not_in") refresh();
    }
  };
  const photoRef = useRef(null);
  // after the selfie (or straight away): find the phone, then send
  const go = async (photo) => {
    photoRef.current = photo;
    setError("");
    if (kiosk) return send(null, photo); // the door QR proves the place
    setStep("locating");
    const where = await locate();
    if (where.error) {
      setPos(null);
      setStep("confirm-nogps");
      setError(where.error === "denied" ? x.gpsDenied : x.gpsFailed);
      return;
    }
    setPos(where);
    send(where, photo);
  };
  const press = () => {
    // selfie add-on: open the front camera first (must happen right in the tap)
    if (me.features?.selfie) return fileRef.current?.click();
    go(null);
  };
  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let blob = file;
    try {
      blob = await resizeImage(file, 640, 0.8);
    } catch {
      /* send the original */
    }
    go(blob);
  };

  return (
    <div className={cls} style={style}>
      {outDialog}
      {tab === "today" && me.next === "out" && me.today?.end && now > new Date(me.today.end).getTime() + 15 * 60000 && (
        <div className="sa-remind" role="status">
          <Clock size={16} /> {x.remind.replace("{time}", hhmm(me.today.end))}
        </div>
      )}
      {tab === "today" ? (
        <HomeView
          theme={theme}
          x={x}
          lang={lang}
          me={me}
          now={now}
          step={step}
          result={result}
          error={error}
          sureOut={sureOut}
          nearest={nearest}
          langBtn={langBtn}
          onLogout={askOut}
          onPress={press}
          onCancelSure={() => setSureOut(false)}
          onSendAnyway={() => send(null, photoRef.current)}
          kioskReady={!!kiosk}
          onIdle={() => setStep("idle")}
        />
      ) : (
        <Header me={me} x={x} langBtn={langBtn} onLogout={askOut} />
      )}

      {tab === "history" && (
        <History
          x={x}
          lang={lang}
          token={token}
          logout={logout}
          errText={errText}
          shift={me.shift}
          schedule={me.schedule}
          overtime={!!me.features?.overtime}
          top={me.features?.rewards ? <RewardsCard lang={lang} token={token} call={call} logout={logout} /> : null}
        />
      )}
      {tab === "news" && <NewsView lang={lang} token={token} call={call} logout={logout} errText={errText} onRead={setUnread} />}
      {tab === "leave" && <Leave x={x} lang={lang} token={token} logout={logout} errText={errText} />}
      {tab === "team" && (
        <TeamView
          x={x}
          lang={lang}
          token={token}
          call={call}
          logout={logout}
          errText={errText}
          hhmm={hhmm}
          initial={initial}
          day={(d) => new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`))}
        />
      )}
      {tab === "pay" && <MyPay x={x} lang={lang} token={token} logout={logout} errText={errText} me={me} />}
      <input ref={fileRef} type="file" accept="image/*" capture="user" hidden onChange={onPhoto} />

      <nav className="sa-tabs" style={{ gridTemplateColumns: `repeat(${2 + (me.features?.leave ? 1 : 0) + (me.features?.pay ? 1 : 0) + (me.features?.team ? 1 : 0) + (me.features?.news ? 1 : 0)}, 1fr)` }}>
        <button type="button" className={tab === "today" ? "on" : ""} onClick={() => setTab("today")}>
          <Sun size={20} /> {x.today}
        </button>
        {me.features?.leave && (
          <button type="button" className={tab === "leave" ? "on" : ""} onClick={() => setTab("leave")}>
            <Palmtree size={20} /> {x.leave}
          </button>
        )}
        {me.features?.news && (
          <button type="button" className={tab === "news" ? "on" : ""} onClick={() => setTab("news")}>
            <span className="sa-tab-ic">
              <Megaphone size={20} />
              {unread > 0 && <i className="sa-dot">{unread > 9 ? "9+" : unread}</i>}
            </span>
            {newsTab(lang)}
          </button>
        )}
        <button type="button" className={tab === "history" ? "on" : ""} onClick={() => setTab("history")}>
          <CalendarDays size={20} /> {x.history}
        </button>
        {me.features?.pay && (
          <button type="button" className={tab === "pay" ? "on" : ""} onClick={() => setTab("pay")}>
            <Wallet size={20} /> {x.pay.tab}
          </button>
        )}
        {me.features?.team && (
          <button type="button" className={tab === "team" ? "on" : ""} onClick={() => setTab("team")}>
            <UsersRound size={20} /> {teamTab(lang)}
          </button>
        )}
      </nav>
    </div>
  );
}

// ============================ HISTORY ============================
function History({ x, lang, token, logout, errText, shift, schedule, overtime, top = null }) {
  const [month, setMonth] = useState(monthOf());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [fixes, setFixes] = useState([]);
  const [fixing, setFixing] = useState(null); // { day, kind, time, reason }
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [ots, setOts] = useState([]);
  const [otForm, setOtForm] = useState(null); // { day, until, reason }
  const loadOts = useCallback(
    () =>
      overtime
        ? call("/overtime", { token })
            .then(setOts)
            .catch(() => {})
        : Promise.resolve(),
    [token, overtime],
  );
  useEffect(() => {
    loadOts();
  }, [loadOts]);
  const sendOt = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await call("/overtime", { method: "POST", token, body: otForm });
      setOtForm(null);
      setNote(x.ot.sent);
      loadOts();
    } catch (err) {
      if (err.status === 401) return logout();
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };
  const loadFixes = useCallback(
    () =>
      call("/fixes", { token })
        .then(setFixes)
        .catch(() => {}),
    [token],
  );
  useEffect(() => {
    loadFixes();
  }, [loadFixes]);
  const openFix = (d) => {
    const kind = d.first_in && (d.status === "missing_out" || !d.last_out) ? "out" : "in";
    setNote("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setFixing({ day: d.day, kind, time: (kind === "in" ? shift?.start : shift?.end) || (kind === "in" ? "08:00" : "17:00"), reason: "" });
  };
  const sendFix = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await call("/fixes", { method: "POST", token, body: fixing });
      setFixing(null);
      setNote(x.fix.sent);
      loadFixes();
    } catch (err) {
      if (err.status === 401) return logout();
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };
  const cancelFix = async (f) => {
    try {
      await call(`/fixes/${f._id}`, { method: "DELETE", token });
      loadFixes();
    } catch (err) {
      setError(errText(err));
    }
  };
  useEffect(() => {
    let alive = true;
    setData(null);
    call(`/history?month=${month}`, { token })
      .then((d) => alive && setData(d))
      .catch((e) => (e.status === 401 ? logout() : setError(errText(e))));
    return () => {
      alive = false;
    };
  }, [month, token, logout, errText]);
  const title = (() => {
    const [y, m] = month.split("-").map(Number);
    return new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  })();
  const dayLabel = (day) => {
    const [y, m, d] = day.split("-").map(Number);
    return new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  };
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

  return (
    <main className="sa-main">
      {top}
      <div className="sa-month">
        <button type="button" className="sa-icon" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="-1">
          <ChevronLeft size={20} />
        </button>
        <b>{title}</b>
        <button type="button" className="sa-icon" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthOf()} aria-label="+1">
          <ChevronRight size={20} />
        </button>
      </div>
      {error && <div className="sa-error">{error}</div>}
      {!data && !error && <Loader2 size={26} className="sa-spin sa-mid" />}
      {data && (
        <>
          <div className="sa-sum">
            <span>
              <b>{data.totals.present}</b>
              <small>{x.sum.present}</small>
            </span>
            <span className="warn">
              <b>{data.totals.late}</b>
              <small>{x.sum.late}</small>
            </span>
            <span className="bad">
              <b>{data.totals.absent}</b>
              <small>{x.sum.absent}</small>
            </span>
            <span>
              <b>{dur(data.totals.worked_min)}</b>
              <small>{x.sum.worked}</small>
            </span>
          </div>
          {schedule && month === monthOf() && (
            <div className="sa-sched">
              <small>{x.sched.title}</small>
              <ul>
                {schedule.map((d) => (
                  <li key={d.day} className={d.off ? "off" : ""} style={d.color ? { "--c": d.color } : undefined}>
                    <span className="sa-sched-day">
                      <b>{d.day === today ? x.sched.today : dayLabel(d.day)}</b>
                    </span>
                    <span className="sa-sched-shift">{d.off ? x.sched.off : `${d.name} · ${d.start}–${d.end}`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {note && <div className="sa-ok">{note}</div>}
          {fixing && (
            <form className="sa-leave-form sa-fix-form" onSubmit={sendFix}>
              <b>{x.fix.title.replace("{day}", dayLabel(fixing.day))}</b>
              <small className="sa-note" style={{ margin: 0, textAlign: "left" }}>
                {x.fix.sub}
              </small>
              <div className="sa-seg">
                {["in", "out"].map((k) => (
                  <button key={k} type="button" className={fixing.kind === k ? "on" : ""} onClick={() => setFixing({ ...fixing, kind: k, time: (k === "in" ? shift?.start : shift?.end) || fixing.time })}>
                    {k === "in" ? x.fix.kindIn : x.fix.kindOut}
                  </button>
                ))}
              </div>
              <label>
                <small>{x.fix.time}</small>
                <input className="sa-input" type="time" required value={fixing.time} onChange={(e) => setFixing({ ...fixing, time: e.target.value })} />
              </label>
              <label>
                <small>{x.fix.reason}</small>
                <input className="sa-input" required maxLength={300} placeholder={x.fix.reasonPh} value={fixing.reason} onChange={(e) => setFixing({ ...fixing, reason: e.target.value })} />
              </label>
              <div className="sa-two">
                <button type="button" className="sa-btn ghost" onClick={() => setFixing(null)} disabled={busy}>
                  {x.cancel}
                </button>
                <button type="submit" className="sa-btn" disabled={busy}>
                  {busy ? <Loader2 size={18} className="sa-spin" /> : x.fix.send}
                </button>
              </div>
            </form>
          )}
          {fixes.filter((f) => f.status !== "cancelled").length > 0 && (
            <div className="sa-fixes">
              <small>{x.fix.mine}</small>
              <ul className="sa-days sa-leaves">
                {fixes
                  .filter((f) => f.status !== "cancelled")
                  .slice(0, 6)
                  .map((f) => (
                    <li key={f._id}>
                      <span className="sa-day">{dayLabel(f.day)}</span>
                      <span className="sa-day-times">
                        {f.kind === "in" ? x.fix.kindIn : x.fix.kindOut} · {f.time}
                        {f.note ? <em> ↳ {f.note}</em> : null}
                      </span>
                      <span className={`sa-st ls-${f.status}`}>{x.fix.status[f.status]}</span>
                      {f.status === "pending" && (
                        <button type="button" className="sa-icon" onClick={() => cancelFix(f)} aria-label={x.fix.cancel} title={x.fix.cancel}>
                          <XIcon size={15} />
                        </button>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {overtime && !otForm && (
            <button
              type="button"
              className="sa-btn ghost small sa-ot-btn"
              onClick={() => (setNote(""), setOtForm({ day: today, until: shift?.end ? `${String((Number(shift.end.slice(0, 2)) + 2) % 24).padStart(2, "0")}:${shift.end.slice(3)}` : "19:00", reason: "" }))}
            >
              <Clock size={16} /> {x.ot.ask}
            </button>
          )}
          {otForm && (
            <form className="sa-leave-form sa-fix-form" onSubmit={sendOt}>
              <b>{x.ot.title}</b>
              <small className="sa-note" style={{ margin: 0, textAlign: "left" }}>
                {x.ot.sub}
              </small>
              <div className="sa-two">
                <label>
                  <small>{x.ot.day}</small>
                  <input className="sa-input" type="date" required value={otForm.day} onChange={(e) => setOtForm({ ...otForm, day: e.target.value })} />
                </label>
                <label>
                  <small>{x.ot.until}</small>
                  <input className="sa-input" type="time" required value={otForm.until} onChange={(e) => setOtForm({ ...otForm, until: e.target.value })} />
                </label>
              </div>
              <label>
                <small>{x.fix.reason}</small>
                <input className="sa-input" required maxLength={300} placeholder={x.ot.reasonPh} value={otForm.reason} onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })} />
              </label>
              <div className="sa-two">
                <button type="button" className="sa-btn ghost" onClick={() => setOtForm(null)} disabled={busy}>
                  {x.cancel}
                </button>
                <button type="submit" className="sa-btn" disabled={busy}>
                  {busy ? <Loader2 size={18} className="sa-spin" /> : x.fix.send}
                </button>
              </div>
            </form>
          )}
          {ots.filter((o) => o.status !== "cancelled").length > 0 && (
            <div className="sa-fixes">
              <small>{x.ot.mine}</small>
              <ul className="sa-days sa-leaves">
                {ots
                  .filter((o) => o.status !== "cancelled")
                  .slice(0, 5)
                  .map((o) => (
                    <li key={o._id}>
                      <span className="sa-day">{dayLabel(o.day)}</span>
                      <span className="sa-day-times">
                        {x.ot.untilT.replace("{t}", o.until)}
                        {o.note ? <em> ↳ {o.note}</em> : null}
                      </span>
                      <span className={`sa-st ls-${o.status}`}>{x.lstatus[o.status]}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <small className="sa-hint-tap">{x.fix.tap}</small>
          <ul className="sa-days">
            {data.days
              .filter((d) => d.day <= today && d.status !== "upcoming" && d.status !== "before")
              .reverse()
              .map((d) => (
                <li key={d.day} className={`${d.status === "off" || d.status === "holiday" ? "off" : ""} tap`} onClick={() => openFix(d)} role="button" tabIndex={0}>
                  <span className="sa-day">{dayLabel(d.day)}</span>
                  <span className="sa-day-times">{d.first_in ? `${hhmm(d.first_in)} – ${d.status === "missing_out" ? "?" : hhmm(d.last_out)}` : d.status === "holiday" ? d.holiday : ""}</span>
                  <span className={`sa-st st-${d.status}`}>{x.status[d.status]}</span>
                  {d.late_min > 0 && <span className="sa-tag warn">{x.late.replace("{m}", dur(d.late_min))}</span>}
                </li>
              ))}
          </ul>
        </>
      )}
    </main>
  );
}

// ============================ MY PAY ============================
function MyPay({ x, lang, token, logout, errText, me }) {
  const p = x.pay;
  const [month, setMonth] = useState(monthOf());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    const load = () =>
      call(`/pay?month=${month}`, { token })
        .then((d) => alive && (setData(d), setError("")))
        .catch((e) => alive && (e.status === 401 ? logout() : setError(e.code === "pay_hidden" ? p.hidden : errText(e))));
    load();
    // live: the numbers move as you clock in and out
    const t = setInterval(() => document.visibilityState === "visible" && load(), 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [month, token, logout, errText, p.hidden]);
  const title = (() => {
    const [y, m] = month.split("-").map(Number);
    return new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  })();
  const money = (n) => {
    const cur = data?.currency || "USD";
    const v = Math.abs(Number(n) || 0);
    return cur === "KHR" ? `${new Intl.NumberFormat("en-US").format(Math.round(v))} ៛` : `$${v.toFixed(2)}`;
  };
  const isNow = month === monthOf();
  const lines = data
    ? [
        data.pay_type === "hourly"
          ? { k: "base", label: p.hours.replace("{t}", dur(data.worked_min)), sub: p.perHour.replace("{r}", money(data.salary)), amt: data.base, sign: 0 }
          : data.pay_type === "daily"
            ? { k: "base", label: p.daysWorked.replace("{n}", data.present - (data.holiday_worked || 0)), sub: p.perDay.replace("{r}", money(data.salary)), amt: data.base, sign: 0 }
            : { k: "base", label: p.base, sub: data.base !== data.salary ? p.ofSalary.replace("{s}", money(data.salary)) : "", amt: data.base, sign: 0 },
        data.paid_leave_pay > 0 && { k: "pl", label: p.paidLeavePay.replace("{n}", data.paid_leave_days), amt: data.paid_leave_pay, sign: 1 },
        data.absent_ded > 0 && { k: "abs", label: p.absent.replace("{n}", data.absent_days), amt: data.absent_ded, sign: -1 },
        data.late_ded > 0 && { k: "late", label: p.late.replace("{t}", dur(data.late_min)), amt: data.late_ded, sign: -1 },
        data.unpaid_ded > 0 && { k: "unp", label: p.unpaid.replace("{n}", data.unpaid_days), amt: data.unpaid_ded, sign: -1 },
        data.ot_pay > 0 && { k: "ot", label: p.ot.replace("{t}", dur(data.ot_min)), sub: p.otRate.replace("{r}", data.ot_rate), amt: data.ot_pay, sign: 1 },
        data.extra_pay > 0 && { k: "ext", label: p.extra.replace("{n}", data.extra_days), amt: data.extra_pay, sign: 1 },
        ...(data.adjustments || []).map((a) => ({ k: a._id, label: a.label || (a.amount < 0 ? p.deduct : p.bonus), sub: a.amount < 0 ? p.deduct : p.bonus, amt: Math.abs(a.amount), sign: a.amount < 0 ? -1 : 1, adj: true })),
        data.reward > 0 && { k: "rw", label: lang === "km" ? "🏆 ប្រាក់រង្វាន់ខែល្អឥតខ្ចោះ" : "🏆 Perfect month bonus", amt: data.reward, sign: 1 },
        data.kh?.seniority > 0 && { k: "sen", label: p.seniority, sub: p.seniorityNote, amt: data.kh.seniority, sign: 1 },
        data.kh?.pension_ee > 0 && { k: "nssf", label: p.nssf, sub: p.nssfNote, amt: data.kh.pension_ee, sign: -1 },
        data.kh?.tax > 0 && { k: "tax", label: p.tax, sub: data.kh.dependents ? p.taxDeps.replace("{n}", data.kh.dependents) : p.taxNote, amt: data.kh.tax, sign: -1 },
      ].filter(Boolean)
    : [];
  const minus = lines.filter((l) => l.sign < 0).reduce((a, l) => a + l.amt, 0);
  const plus = lines.filter((l) => l.sign > 0).reduce((a, l) => a + l.amt, 0);

  return (
    <main className="sa-main">
      <div className="sa-month">
        <button type="button" className="sa-icon" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="-1">
          <ChevronLeft size={20} />
        </button>
        <b>{title}</b>
        <button type="button" className="sa-icon" onClick={() => setMonth(shiftMonth(month, 1))} disabled={isNow} aria-label="+1">
          <ChevronRight size={20} />
        </button>
      </div>
      {error && <div className="sa-error">{error}</div>}
      {!data && !error && <Loader2 size={26} className="sa-spin sa-mid" />}
      {data && (
        <>
          <div className="sa-pay-hero">
            <small>{isNow ? p.soFar : p.net}</small>
            <b>{money(data.net)}</b>
            {isNow && (
              <span className="sa-pay-live">
                <i /> {p.live}
              </span>
            )}
            <div className="sa-pay-mini">
              <span>
                <small>{p.salary}</small>
                <b>{money(data.salary)}</b>
              </span>
              <span className="bad">
                <small>{p.minus}</small>
                <b>−{money(minus)}</b>
              </span>
              <span className="good">
                <small>{p.plus}</small>
                <b>+{money(plus)}</b>
              </span>
            </div>
          </div>
          {!data.salary && <p className="sa-note">{p.noSalary}</p>}
          <ul className="sa-pay-lines">
            {lines.map((l) => (
              <li key={l.k} className={l.sign < 0 ? "bad" : l.sign > 0 ? "good" : ""}>
                <span>
                  {l.label}
                  {l.sub && <small>{l.sub}</small>}
                </span>
                <b>
                  {l.sign < 0 ? "−" : l.sign > 0 ? "+" : ""}
                  {money(l.amt)}
                </b>
              </li>
            ))}
            <li className="total">
              <span>{p.net}</span>
              <b>{money(data.net)}</b>
            </li>
          </ul>
          <div className="sa-pay-facts">
            <span>{p.days.replace("{n}", data.present).replace("{m}", data.work_days)}</span>
            {data.paid_leave_days > 0 && <span>{p.paidLeave.replace("{n}", data.paid_leave_days)}</span>}
            <span>{p.rate.replace("{d}", money(data.daily_rate)).replace("{h}", money(data.hourly_rate))}</span>
          </div>
          <p className="sa-note">{isNow ? p.noteNow : p.noteDone}</p>
          <button type="button" className="sa-btn ghost sa-slip-btn" onClick={() => printSlip({ x, title, data, lines, money, me })}>
            <FileText size={16} /> {p.slip}
          </button>
        </>
      )}
    </main>
  );
}

// the payslip as a page to print / save as PDF
function printSlip({ x, title, data, lines, money, me }) {
  const p = x.pay;
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rows = lines.map((l) => `<tr class="${l.sign < 0 ? "bad" : ""}"><td>${esc(l.label)}${l.sub ? `<br><small>${esc(l.sub)}</small>` : ""}</td><td>${l.sign < 0 ? "−" : l.sign > 0 ? "+" : ""}${esc(money(l.amt))}</td></tr>`).join("");
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.slip)} · ${esc(title)}</title><style>body{font-family:system-ui,"Kantumruy Pro",sans-serif;padding:32px;color:#111;max-width:640px;margin:auto}h1{margin:0}small{color:#666}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:9px 4px;border-bottom:1px solid #e5e5e5;vertical-align:top}td:last-child{text-align:right;white-space:nowrap}.bad td:last-child{color:#b91c1c}.net td{font-weight:800;font-size:18px;border-top:2px solid #111;border-bottom:0}</style></head><body><h1>${esc(me?.business?.name || "")}</h1><small>${esc(p.slip)} · ${esc(title)}</small><p><b>${esc(me?.staff?.name || "")}</b>${me?.staff?.position ? ` · ${esc(me.staff.position)}` : ""}</p><table><tbody>${rows}<tr class="net"><td>${esc(p.net)}</td><td>${esc(money(data.net))}</td></tr></tbody></table></body></html>`,
  );
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

// ============================ LEAVE ============================
const todayKH = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
function Leave({ x, lang, token, logout, errText }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null); // null | { type, from, to, reason }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const load = useCallback(
    () =>
      call("/leave", { token })
        .then(setData)
        .catch((e) => (e.status === 401 ? logout() : setError(errText(e)))),
    [token, logout, errText],
  );
  useEffect(() => {
    load();
  }, [load]);
  const day = (d) => {
    const [y, m, dd] = d.split("-").map(Number);
    return new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, dd)));
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await call("/leave", { method: "POST", token, body: form });
      setForm(null);
      setNote(x.leaveSent);
      load();
    } catch (err) {
      if (err.status === 401) return logout();
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };
  const cancel = async (l) => {
    try {
      await call(`/leave/${l._id}`, { method: "DELETE", token });
      load();
    } catch (err) {
      setError(errText(err));
    }
  };
  return (
    <main className="sa-main">
      <div className="sa-month">
        <b>{x.leaveTitle}</b>
        {!form && (
          <button type="button" className="sa-btn small" onClick={() => (setNote(""), setForm({ type: "annual", from: todayKH(), to: todayKH(), reason: "" }))}>
            <Plus size={16} /> {x.askLeave}
          </button>
        )}
      </div>
      {data && (
        <div className="sa-balance">
          <small>{x.leaveLeft}</small>
          <b>{data.balance.left}</b>
          <small>{x.leaveOf.replace("{left}", data.balance.left).replace("{allowed}", data.balance.allowed).replace("{year}", data.balance.year)}</small>
        </div>
      )}
      {note && <div className="sa-ok">{note}</div>}
      {error && <div className="sa-error">{error}</div>}
      {form && (
        <form className="sa-leave-form" onSubmit={submit}>
          <div className="sa-seg">
            {Object.keys(x.types).map((k) => (
              <button key={k} type="button" className={form.type === k ? "on" : ""} onClick={() => setForm({ ...form, type: k })}>
                {x.types[k]}
              </button>
            ))}
          </div>
          <div className="sa-two">
            <label>
              <small>{x.from}</small>
              <input className="sa-input" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value, to: form.to < e.target.value ? e.target.value : form.to })} />
            </label>
            <label>
              <small>{x.to}</small>
              <input className="sa-input" type="date" value={form.to} min={form.from} onChange={(e) => setForm({ ...form, to: e.target.value })} />
            </label>
          </div>
          <label>
            <small>{x.reason}</small>
            <input className="sa-input" maxLength={300} placeholder={x.reasonPh} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </label>
          <div className="sa-two">
            <button type="button" className="sa-btn ghost" onClick={() => setForm(null)} disabled={busy}>
              {x.cancel}
            </button>
            <button type="submit" className="sa-btn" disabled={busy}>
              {busy ? <Loader2 size={18} className="sa-spin" /> : x.send}
            </button>
          </div>
        </form>
      )}
      {data && data.rows.length === 0 && !form && <p className="sa-note">{x.noLeaveYet}</p>}
      {data && data.rows.length > 0 && (
        <ul className="sa-days sa-leaves">
          {data.rows.map((l) => (
            <li key={l._id}>
              <span className="sa-day">
                {day(l.from)}
                {l.to !== l.from ? ` → ${day(l.to)}` : ""}
              </span>
              <span className="sa-day-times">
                {x.types[l.type]} · {x.days.replace("{n}", l.days)}
                {l.reason ? ` · “${l.reason}”` : ""}
                {l.note ? <em> ↳ {l.note}</em> : null}
              </span>
              <span className={`sa-st ls-${l.status}`}>{x.lstatus[l.status]}</span>
              {l.status === "pending" && (
                <button type="button" className="sa-icon" onClick={() => cancel(l)} aria-label={x.cancelReq} title={x.cancelReq}>
                  <XIcon size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
