import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_HOST } from "../../config";
import Logo from "../../components/Logo";
import LangSwitch from "../../components/LangSwitch";
import { useI18n } from "../../i18n/I18nProvider";
import { GP_TEXT } from "./ptext";
import GpView, { GpAuth } from "./GpView";
import { useConfirmSignOut } from "../../components/ConfirmSignOut";

// The customer's own page on a guest house website: /g/:slug/account (sign up / sign in → dashboard)
const today = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const addDays = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const tokenKey = (slug) => `bizhub_gh_cust_${slug}`;
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

export default function GpPage() {
  const { slug } = useParams();
  const { lang } = useI18n();
  const t = GP_TEXT[lang] || GP_TEXT.en;
  const [info, setInfo] = useState(null);
  const [missing, setMissing] = useState(false);
  const [token, setToken] = useState(() => store.get(tokenKey(slug)));
  const [me, setMe] = useState(null);
  const [mode, setMode] = useState("login");
  const [tab, setTab] = useState("home");
  const [bookings, setBookings] = useState([]);
  const [cal, setCal] = useState(null);
  const [free, setFree] = useState(null);
  const [search, setSearch] = useState({ from: today(), to: addDays(today(), 1), adults: 2, children: 0 });
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const call = useCallback(
    async (method, path, body) => {
      const form = typeof FormData !== "undefined" && body instanceof FormData;
      const res = await fetch(`${API_HOST}/api/public/stay/${encodeURIComponent(slug)}/account${path}`, {
        method,
        headers: { ...(form ? {} : { "Content-Type": "application/json" }), ...(token ? { "x-gh-cust": token } : {}) },
        body: form ? body : body ? JSON.stringify(body) : undefined,
      }).catch(() => null);
      if (!res) throw new Error("network");
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        if (res.status === 401 && path !== "/login") {
          store.set(tokenKey(slug), "");
          setToken("");
          setMe(null);
        }
        const e = new Error(json.message || `Error ${res.status}`);
        e.status = res.status;
        throw e;
      }
      return json;
    },
    [slug, token],
  );

  useEffect(() => {
    call("GET", "")
      .then((r) => {
        setInfo(r.data);
        document.title = `${r.data.business.name} · ${t.signIn}`;
      })
      .catch(() => setMissing(true));
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  // after sign-in: who am I + my bookings
  useEffect(() => {
    if (!token || !info?.open) return;
    call("GET", "/me")
      .then((r) => setMe(r.data))
      .catch(() => {});
    call("GET", "/bookings")
      .then((r) => setBookings(r.data))
      .catch(() => {});
  }, [token, info?.open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === "calendar" && me && !cal)
      call("GET", "/calendar")
        .then((r) => setCal(r.data))
        .catch(() => {});
    setMsg("");
    setError("");
  }, [tab, me]); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (m) => {
    setMsg(m);
    setError("");
    setTimeout(() => setMsg(""), 5000);
  };
  // ask before signing out
  const [askOut, outDialog] = useConfirmSignOut(() => act.logoutNow());
  const act = {
    setTab,
    setSearch,
    findFree: async () => {
      setBusy("free");
      setError("");
      try {
        const r = await call("GET", `/free?from=${search.from}&to=${search.to}`);
        setFree(r.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy("");
      }
    },
    pickDay: (d) => {
      const next = { ...search, from: d, to: addDays(d, 1) };
      setSearch(next);
      setTab("book");
      setFree(null);
      call("GET", `/free?from=${next.from}&to=${next.to}`)
        .then((r) => setFree(r.data))
        .catch(() => {});
    },
    request: async ({ type_id, note, pay_method = "cash", proof = null }) => {
      setBusy("book");
      setError("");
      try {
        const fields = { type_id, from: search.from, to: search.to, adults: String(Number(search.adults) || 1), children: String(Number(search.children) || 0), note: note || "", pay_method };
        let body = fields;
        if (proof) {
          // the transfer screenshot goes with the booking
          body = new FormData();
          Object.entries(fields).forEach(([k, v]) => body.append(k, v));
          body.append("proof", proof, proof.name || "proof.jpg");
        }
        const r = await call("POST", "/bookings", body);
        setBookings(r.data);
        setFree(null);
        setCal(null);
        setTab("bookings");
        flash(t.sent);
        return true;
      } catch (e) {
        setError(e.message);
        return false;
      } finally {
        setBusy("");
      }
    },
    cancel: async (id) => {
      try {
        const r = await call("POST", `/bookings/${id}/cancel`);
        setBookings(r.data);
        setCal(null);
      } catch (e) {
        setError(e.message);
      }
    },
    saveMe: async (data) => {
      try {
        const r = await call("PUT", "/me", data);
        if (r.token) {
          store.set(tokenKey(slug), r.token); // a new email = a new login
          setToken(r.token);
        }
        setMe(r.data);
        flash(t.saved);
        return true;
      } catch (e) {
        setError(e.message);
        return false;
      }
    },
    savePass: async (data) => {
      try {
        const r = await call("POST", "/me/password", data);
        store.set(tokenKey(slug), r.data.token);
        setToken(r.data.token);
        flash(t.saved);
        return true;
      } catch (e) {
        setError(e.message);
        return false;
      }
    },
    logoutNow: () => {
      store.set(tokenKey(slug), "");
      setToken("");
      setMe(null);
      setBookings([]);
      setTab("home");
      setMode("login");
    },
  };
  act.logout = askOut;
  const auth = async (f) => {
    setBusy("auth");
    setError("");
    try {
      const r =
        mode === "register" ? await call("POST", "/register", { name: f.name, phone: f.phone, email: f.email, password: f.password, confirm: f.confirm, website: f.website }) : await call("POST", "/login", { email: f.email, password: f.password });
      store.set(tokenKey(slug), r.data.token);
      setToken(r.data.token);
      setMe(r.data.customer);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const siteHref = `/g/${slug}`;
  if (missing) {
    return (
      <div className="standalone-page">
        <Logo height={34} />
        <h1>{t.closed}</h1>
        <Link className="btn btn-primary" to="/">
          BizHub
        </Link>
      </div>
    );
  }
  if (!info) return <div className="gs-loading" aria-busy="true" />;
  if (!info.open)
    return (
      <div className="standalone-page">
        <h1>{t.closed}</h1>
        <p>{t.closedSub}</p>
        <a className="btn btn-primary" href={siteHref}>
          {t.backSite}
        </a>
      </div>
    );
  if (!token || !me) return <GpAuth info={info} lang={lang} mode={mode} setMode={setMode} onSubmit={auth} busy={busy === "auth"} error={error} langSwitch={<LangSwitch />} siteHref={siteHref} />;
  return (
    <>
      {outDialog}
      <GpView s={{ info, me, tab, bookings, cal, free, search, busy, msg, error }} act={act} lang={lang} langSwitch={<LangSwitch />} siteHref={siteHref} />
    </>
  );
}
