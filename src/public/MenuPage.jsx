import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChefHat, Clock, MapPin, Phone, Wifi, X } from "lucide-react";
import { publicGet } from "../api/client";
import Logo from "../components/Logo";
import LangSwitch from "../components/LangSwitch";
import { useI18n } from "../i18n/I18nProvider";
import { ROUTES } from "../config";
import { CardPageSkeleton } from "../components/skeleton/Skeleton";
import "./menu.css";

const TEXT = {
  en: { table: "Table", soldOut: "Sold out", sizes: "Sizes", required: "required", pick: "pick up to {n}", notFound: "Menu not available", notFoundSub: "This menu doesn't exist or is not open yet.", home: "BizHub", all: "All" },
  km: { table: "តុ", soldOut: "អស់ហើយ", sizes: "ទំហំ", required: "ត្រូវជ្រើស", pick: "ជ្រើសបាន {n}", notFound: "ម៉ឺនុយមិនមាន", notFoundSub: "ម៉ឺនុយនេះមិនមាន ឬមិនទាន់បើក។", home: "BizHub", all: "ទាំងអស់" },
};
const usd = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const khr = (n) => `${new Intl.NumberFormat("en-US").format(Math.round(n))}៛`;

// Public online menu (QR on the table): /public/menu/:token?t=A1&c=<category>&i=<item>
export default function MenuPage() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const { lang } = useI18n();
  const t = TEXT[lang] || TEXT.en;
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState(null); // item shown in the sheet
  const [active, setActive] = useState(params.get("c") || "");
  const refs = useRef({});

  useEffect(() => {
    let alive = true;
    publicGet(`/menu/${encodeURIComponent(token)}`)
      .then((r) => alive && setData(r.data))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [token]);

  const R = data?.restaurant;
  const name = R ? (lang === "km" ? R.name_km || R.name_en : R.name_en || R.name_km) : "";
  const second = R ? (lang === "km" ? R.name_en : R.name_km) : "";
  useEffect(() => {
    if (name) document.title = name;
  }, [name]);

  // deep links: ?c= scrolls to a category, ?i= opens an item
  useEffect(() => {
    if (!data) return;
    const c = params.get("c");
    const i = params.get("i");
    if (i) {
      const item = data.items.find((x) => x._id === i);
      if (item) {
        setOpen(item);
        setTimeout(() => refs.current[item.category_id]?.scrollIntoView({ block: "start" }), 50);
      }
    } else if (c && refs.current[c]) setTimeout(() => refs.current[c]?.scrollIntoView({ block: "start" }), 50);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const price = useMemo(() => {
    if (!R) return () => "";
    return (n) => (R.currency === "KHR" ? khr(n) : usd(n));
  }, [R]);
  const other = (n) => (R.currency === "KHR" ? usd(n / R.khr_rate) : khr(Math.round((n * R.khr_rate) / (R.khr_rounding || 100)) * (R.khr_rounding || 100)));
  const nm = (x) => (lang === "km" ? x.name_km || x.name_en : x.name_en || x.name_km);
  const nm2 = (x) => (lang === "km" ? x.name_en : x.name_km);

  if (missing) {
    return (
      <div className="standalone-page">
        <Logo height={34} />
        <h1>{t.notFound}</h1>
        <p>{t.notFoundSub}</p>
        <Link className="btn btn-primary" to={ROUTES.home || "/"}>
          {t.home}
        </Link>
      </div>
    );
  }
  if (!data) return <CardPageSkeleton />;

  const table = params.get("t");
  const cats = data.categories.filter((c) => data.items.some((i) => String(i.category_id) === c._id));
  const groups = Object.fromEntries(data.addon_groups.map((g) => [g._id, g]));
  const jump = (id) => {
    setActive(id);
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mn" style={{ "--c": R.color }}>
      <header className="mn-hero" style={R.cover ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.65)), url("${R.cover}")` } : undefined}>
        <div className="mn-lang">
          <LangSwitch />
        </div>
        <div className="mn-hero-in">
          <span className="mn-logo">{R.logo ? <img src={R.logo} alt="" /> : <ChefHat size={30} />}</span>
          <h1>{name}</h1>
          {second && <p className="mn-second">{second}</p>}
          <div className="mn-facts">
            {R.hours && (
              <span>
                <Clock size={13} /> {R.hours}
              </span>
            )}
            {R.address &&
              (R.map_url ? (
                <a href={R.map_url} target="_blank" rel="noreferrer">
                  <MapPin size={13} /> {R.address}
                </a>
              ) : (
                <span>
                  <MapPin size={13} /> {R.address}
                </span>
              ))}
            {R.phone && (
              <a href={`tel:${R.phone.replace(/[^\d+]/g, "")}`}>
                <Phone size={13} /> {R.phone}
              </a>
            )}
            {R.wifi_name && (
              <span>
                <Wifi size={13} /> {R.wifi_name}
              </span>
            )}
          </div>
        </div>
      </header>
      {table && (
        <div className="mn-table">
          {t.table} <b>{table}</b>
        </div>
      )}

      <nav className="mn-cats" aria-label="Categories">
        {cats.map((c) => (
          <button key={c._id} type="button" className={active === c._id ? "on" : ""} onClick={() => jump(c._id)}>
            {nm(c)}
          </button>
        ))}
      </nav>

      <main className="mn-main">
        {cats.map((c) => (
          <section key={c._id} ref={(el) => (refs.current[c._id] = el)} className="mn-section">
            <h2>
              <i style={{ background: c.color }} /> {nm(c)}
              {nm2(c) && <small>{nm2(c)}</small>}
            </h2>
            <div className="mn-items">
              {data.items
                .filter((i) => String(i.category_id) === c._id)
                .map((i) => (
                  <button key={i._id} type="button" className={`mn-item ${i.available ? "" : "sold"}`} onClick={() => setOpen(i)}>
                    <span className="mn-item-text">
                      <b>{nm(i)}</b>
                      {nm2(i) && <small>{nm2(i)}</small>}
                      {i.description && <span className="mn-desc">{i.description}</span>}
                      <span className="mn-price">
                        {i.sizes?.length ? `${price(Math.min(i.price, ...i.sizes.map((s) => s.price)))}+` : price(i.price)}
                        <em>{other(i.price)}</em>
                      </span>
                    </span>
                    {i.photo && <img src={i.photo} alt="" loading="lazy" />}
                    {!i.available && <span className="mn-sold">{t.soldOut}</span>}
                  </button>
                ))}
            </div>
          </section>
        ))}
        <footer className="mn-foot">
          <Logo height={20} />
        </footer>
      </main>

      {open && (
        <div className="mn-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="mn-sheet" role="dialog" aria-modal="true" aria-label={nm(open)}>
            <button type="button" className="mn-close" onClick={() => setOpen(null)} aria-label="Close">
              <X size={18} />
            </button>
            {open.photo && <img className="mn-sheet-photo" src={open.photo} alt="" />}
            <div className="mn-sheet-body">
              <h3>{nm(open)}</h3>
              {nm2(open) && <p className="mn-second dark">{nm2(open)}</p>}
              {open.description && <p className="mn-desc">{open.description}</p>}
              <div className="mn-price big">
                {price(open.price)} <em>{other(open.price)}</em>
                {!open.available && <span className="mn-sold inline">{t.soldOut}</span>}
              </div>
              {open.sizes?.length > 0 && (
                <div className="mn-opts">
                  <b>{t.sizes}</b>
                  {open.sizes.map((s) => (
                    <div key={s._id || s.name}>
                      <span>{s.name}</span>
                      <span>{price(s.price)}</span>
                    </div>
                  ))}
                </div>
              )}
              {(open.addon_group_ids || []).map((gid) => groups[gid]).filter(Boolean).map((g) => (
                <div key={g._id} className="mn-opts">
                  <b>
                    {g.name} <small>{g.required ? t.required : t.pick.replace("{n}", g.max)}</small>
                  </b>
                  {g.options.map((o) => (
                    <div key={o._id || o.name}>
                      <span>{o.name}</span>
                      <span>{o.price ? `+${price(o.price)}` : ""}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
