import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { API_HOST } from "../../config";
import Logo from "../../components/Logo";
import LangSwitch from "../../components/LangSwitch";
import { useI18n } from "../../i18n/I18nProvider";
import { MP_TEXT, cartStore } from "../text";
import MpView, { MpAuth } from "./MpView";
import "../msite.css";
import { useConfirmSignOut } from "../../components/ConfirmSignOut";

// The customer's own page on a mini mart website: /m/:slug/account (sign up / sign in → shop, cart, orders)
const tokenKey = (slug) => `bizhub_mart_cust_${slug}`;
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
const OPEN = ["new", "accepted", "ready", "delivering"];
const TABS = ["home", "shop", "cart", "orders", "addresses", "profile"];

export default function MpPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { lang } = useI18n();
  const t = MP_TEXT[lang] || MP_TEXT.en;
  const [info, setInfo] = useState(null);
  const [missing, setMissing] = useState(false);
  const [token, setToken] = useState(() => store.get(tokenKey(slug)));
  const [me, setMe] = useState(null);
  const [mode, setMode] = useState("login");
  const [cart, setCart] = useState(() => cartStore.get(slug));
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "home";
  const setTab = useCallback(
    (k) => {
      setParams(k === "home" ? {} : { tab: k }, { replace: true });
      setError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setParams],
  );

  const call = useCallback(
    async (method, path, body) => {
      const form = typeof FormData !== "undefined" && body instanceof FormData;
      const res = await fetch(`${API_HOST}/api/public/shop/${encodeURIComponent(slug)}/account${path}`, {
        method,
        headers: { ...(form ? {} : { "Content-Type": "application/json" }), ...(token ? { "x-mart-cust": token } : {}) },
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
        e.code = json.code;
        throw e;
      }
      return json;
    },
    [slug, token],
  );

  const loadInfo = useCallback(
    () =>
      call("GET", "")
        .then((r) => {
          setInfo(r.data);
          document.title = `${r.data.business.name} · ${t.tabs.shop}`;
          // items the shop no longer sells leave the cart
          const ids = new Set(r.data.products.filter((p) => !p.soldout).map((p) => p._id));
          setCart((c) => {
            const next = Object.fromEntries(Object.entries(c).filter(([id]) => ids.has(id)));
            if (Object.keys(next).length !== Object.keys(c).length) {
              cartStore.set(slug, next);
              if (r.data.open) setMsg(t.unavailable);
            }
            return next;
          });
        })
        .catch(() => setMissing(true)),
    [call, slug, t],
  );
  useEffect(() => {
    loadInfo();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadOrders = useCallback(
    () =>
      call("GET", "/orders")
        .then((r) => setOrders(r.data))
        .catch(() => {}),
    [call],
  );
  useEffect(() => {
    if (!token || !info?.open) return;
    call("GET", "/me")
      .then((r) => setMe(r.data))
      .catch(() => {});
    loadOrders();
  }, [token, info?.open]); // eslint-disable-line react-hooks/exhaustive-deps
  // while an order is moving, follow it
  const moving = orders.some((o) => OPEN.includes(o.status));
  useEffect(() => {
    if (!me || !moving) return undefined;
    const timer = setInterval(loadOrders, 20000);
    return () => clearInterval(timer);
  }, [me, moving, loadOrders]);

  const flash = (m) => {
    setMsg(m);
    setError("");
    setTimeout(() => setMsg(""), 6000);
  };
  // never more than the shop has (stock control): sold out = 0, low stock = what is left
  const setQty = (id, n) =>
    setCart((c) => {
      const prod = info?.products.find((x) => x._id === id);
      const max = prod?.soldout ? 0 : (prod?.stock ?? 999);
      const next = { ...c, [id]: Math.max(0, Math.min(999, max, n)) };
      if (!next[id]) delete next[id];
      cartStore.set(slug, next);
      return next;
    });
  // ask before signing out
  const [askOut, outDialog] = useConfirmSignOut(() => act.logoutNow());
  const act = {
    setTab,
    setQty,
    place: async ({ proof, items, ...fields }) => {
      setBusy("place");
      setError("");
      try {
        const body = new FormData();
        body.append("items", JSON.stringify(items));
        Object.entries(fields).forEach(([k, v]) => body.append(k, v ?? ""));
        if (proof) body.append("proof", proof, proof.name || "proof.jpg");
        const r = await call("POST", "/orders", body);
        setOrders(r.data);
        setCart({});
        cartStore.set(slug, {});
        call("GET", "/me")
          .then((x) => setMe(x.data))
          .catch(() => {});
        setTab("orders");
        flash(t.sent);
      } catch (e) {
        setError(e.message);
        if (e.code === "gone" || e.code === "stock") loadInfo();
      } finally {
        setBusy("");
      }
    },
    cancel: async (id) => {
      try {
        const r = await call("POST", `/orders/${id}/cancel`);
        setOrders(r.data);
      } catch (e) {
        setError(e.message);
        loadOrders();
      }
    },
    again: (o) => {
      const ids = new Set(info.products.filter((p) => !p.soldout).map((p) => p._id));
      const next = { ...cart };
      for (const x of o.items)
        if (ids.has(String(x.product_id))) {
          const max = info.products.find((p) => p._id === String(x.product_id))?.stock ?? 999;
          next[x.product_id] = Math.min(max, (next[x.product_id] || 0) + x.qty);
        }
      setCart(next);
      cartStore.set(slug, next);
      setTab("cart");
    },
    saveMe: async (data) => {
      try {
        const r = await call("PUT", "/me", data);
        setMe(r.data);
        flash(t.saved);
        return true;
      } catch (e) {
        setError(e.message);
        return false;
      }
    },
    setAvatar: async (file) => {
      try {
        const body = new FormData();
        body.append("photo", file, file.name || "photo.jpg");
        const r = await call("POST", "/me/avatar", body);
        setMe(r.data);
        flash(t.saved);
      } catch (e) {
        setError(e.message);
      }
    },
    removeAvatar: async () => {
      try {
        const r = await call("DELETE", "/me/avatar");
        setMe(r.data);
      } catch (e) {
        setError(e.message);
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
    // the price of the cart (promotions, coupon, delivery zone, points) — nothing is saved
    quote: (body) => call("POST", "/quote", body).then((r) => r.data),
    logoutNow: () => {
      store.set(tokenKey(slug), "");
      setToken("");
      setMe(null);
      setOrders([]);
      setMode("login");
      setTab("home");
    },
  };
  act.logout = askOut;
  const auth = async (f) => {
    setBusy("auth");
    setError("");
    try {
      const r =
        mode === "register" ? await call("POST", "/register", { name: f.name, email: f.email, phone: f.phone, password: f.password, confirm: f.confirm, website: f.website }) : await call("POST", "/login", { login: f.login, password: f.password });
      store.set(tokenKey(slug), r.data.token);
      setToken(r.data.token);
      setMe(r.data.customer);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const siteHref = `/m/${slug}`;
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
  if (!info) return <div className="ms-loading" aria-busy="true" />;
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
  if (!token || !me) return <MpAuth info={info} lang={lang} mode={mode} setMode={setMode} onSubmit={auth} busy={busy === "auth"} error={error} langSwitch={<LangSwitch />} siteHref={siteHref} />;
  return (
    <>
      {outDialog}
      <MpView s={{ info, me, tab, cart, orders, busy, msg, error }} act={act} lang={lang} langSwitch={<LangSwitch />} siteHref={siteHref} />
    </>
  );
}
