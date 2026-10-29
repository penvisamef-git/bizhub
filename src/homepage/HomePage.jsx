import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleDollarSign, Globe, Grid2x2, Mail, MapPin, Menu, Phone, Send, ThumbsUp, WifiOff, X } from "lucide-react";
import "./home.css";
import "./homex.css";
import Logo from "../components/Logo";
import LangSwitch from "../components/LangSwitch";
import ThemeToggle from "../components/ThemeToggle";
import PathIcon from "../components/PathIcon";
import usePageTitle from "../components/usePageTitle";
import { auth } from "../lib/auth";
import { ROUTES } from "../config";
import useHomepageData from "./useHomepageData";
import { useI18n } from "../i18n/I18nProvider";
import { HERO_ICONS } from "./content";
import HeroBanner from "./HeroBanner";
import ServiceSheet from "./ServiceSheet";
import AppShowcase from "./AppShowcase";
import PosDownload from "./PosDownload";
import PriceTag from "./PriceTag";
import FollowUs, { FootSocials } from "./FollowUs";
import MeetBizi from "./MeetBizi";
import BiziGuide from "./BiziGuide";
import PoweredBy from "../components/PoweredBy";

// Card title + bullet keys for each service (text lives in content.js)
const CARD_KEYS = {
  namecard: { title: "cCard", bullets: ["n0", "n1", "n2", "n3"] },
  restaurant: { title: "cRestaurant", bullets: ["r1", "r2", "r3"] },
  mart: { title: "cMart", bullets: ["m1", "m2", "m3"] },
  guest: { title: "cGuest", bullets: ["g1", "g2", "g3"] },
  warehouse: { title: "cWarehouse", bullets: ["w1", "w2", "w3"] },
  attend: { title: "cAttend", bullets: ["a1", "a2", "a3"] },
  website: { title: "cWeb", bullets: ["wb1", "wb2", "wb3"] },
  menu_qr: { title: "cMenuQr", bullets: ["qm1", "qm2", "qm3"] },
  flipbook: { title: "cFlip", bullets: ["fb1", "fb2", "fb3"] },
  qr_gen: { title: "cQr", bullets: ["qg1", "qg2", "qg3"] },
  debt_book: { title: "cDebt", bullets: ["db1", "db2", "db3"] },
  digital_note: { title: "cNote", bullets: ["dn1", "dn2", "dn3"] },
  stamp_card: { title: "cStamp", bullets: ["sc1", "sc2", "sc3"] },
  event: { title: "cEvent", bullets: ["ev1", "ev2", "ev3"] },
  tg_store: { title: "cTgStore", bullets: ["ts1", "ts2", "ts3"] },
};

function SiteHeader({ t }) {
  const { t: m } = useI18n();
  const loggedIn = !!auth.getClientLogin();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const links = [
    ["#services", t.navServices],
    ["#coins", t.navPricing],
    ["#app", t.navApp],
    ["#pos", t.navPos],
    ["#bizi", t.navBizi],
    ["#why", t.navAbout],
    ["#talk", t.navContact],
  ];
  return (
    <header className={`hx-header${scrolled ? " scrolled" : ""}${open ? " open" : ""}`}>
      <nav className="hx-nav" aria-label="Main">
        <Link to="/" aria-label="BizHub home" className="site-logo">
          <Logo height={32} />
          <img className="site-logo-mark" src="/bizhub-icon.svg" alt="" width="34" height="34" />
        </Link>
        <div className="hx-links">
          {links.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </div>
        <div className="hx-actions">
          <LangSwitch />
          <ThemeToggle />
          {loggedIn ? (
            <Link className="btn btn-primary hx-sm-hide" to={ROUTES.app}>
              {m.navDashboard}
            </Link>
          ) : (
            <>
              <Link className="hx-login hx-sm-hide" to={ROUTES.login}>
                {t.login}
              </Link>
              <Link className="btn btn-primary hx-sm-hide" to={ROUTES.signUp}>
                {t.signup}
              </Link>
            </>
          )}
          <button type="button" className="hx-burger" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={t.menu} data-testid="hx-burger">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>
      <div className="hx-drawer" onClick={(e) => e.target.closest("a") && setOpen(false)}>
        {links.map(([href, label]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
        <div className="hx-drawer-acts">
          {loggedIn ? (
            <Link className="btn btn-primary" to={ROUTES.app}>
              {m.navDashboard}
            </Link>
          ) : (
            <>
              <Link className="btn btn-secondary" to={ROUTES.login}>
                {t.login}
              </Link>
              <Link className="btn btn-primary" to={ROUTES.signUp}>
                {t.signup}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// all services passing by (pauses under the mouse)
function Ticker({ t, services, onOpen }) {
  const row = (copy) => (
    <div className="hx-ticker-row" aria-hidden={copy || undefined}>
      {services.map((s) => (
        <button key={s.key} type="button" className="hx-chip" onClick={() => onOpen(s.key)} tabIndex={copy ? -1 : 0}>
          <span className={`hx-chip-ic g-${s.key}`}>
            <PathIcon d={HERO_ICONS[s.key]} size={16} />
          </span>
          {t[CARD_KEYS[s.key].title]}
        </button>
      ))}
    </div>
  );
  return (
    <div className="hx-ticker">
      <div className="hx-ticker-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

function Services({ t, services, groups, onOpen, lang }) {
  const [grp, setGrp] = useState("");
  const tabs = [["", t.allSvc, services.length], ...groups.map((g) => [g.key, g.label, services.filter((s) => g.keys.includes(s.key)).length])].filter(([, , n]) => n);
  const keys = groups.find((g) => g.key === grp)?.keys;
  const shown = keys ? services.filter((s) => keys.includes(s.key)).sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key)) : services; // a group: in the group's order
  return (
    <section id="services" className="hx-section">
      <div className="wrap">
        <div className="hx-head">
          <h2>{t.servTitle}</h2>
          <p>{t.servSub}</p>
        </div>
        <div className="hx-filter" role="tablist">
          {tabs.map(([k, label, count]) => (
            <button key={k || "all"} type="button" role="tab" aria-selected={grp === k} className={grp === k ? "on" : ""} onClick={() => setGrp(k)} data-testid={`hx-grp-${k || "all"}`}>
              {label} <small>{count}</small>
            </button>
          ))}
        </div>
        <div className="hx-svc-grid" key={grp}>
          {shown.map((s, i) => {
            const keys = CARD_KEYS[s.key];
            return (
              <button key={s.key} type="button" className="hx-svc" onClick={() => onOpen(s.key)} style={{ "--i": i }} data-testid={`home-svc-${s.key}`}>
                <span className={`hx-svc-ic g-${s.key}`}>
                  <PathIcon d={HERO_ICONS[s.key]} size={24} />
                </span>
                <span className="hx-svc-name">{t[keys.title]}</span>
                <span className="hx-svc-text">
                  {keys.bullets
                    .slice(0, 2)
                    .map((b) => t[b])
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="hx-svc-foot">
                  <PriceTag t={t} price={s.price} lang={lang} />
                  {s.coming_soon ? <span className="pill">{t.soon}</span> : <span className="hx-svc-more">{t.more}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Coins({ t, settings }) {
  const steps = [
    [t.k1, t.k1d],
    [t.k2, t.k2d],
    [t.k3, t.k3d],
  ];
  return (
    <section id="coins" className="hx-section hx-coins">
      <div className="wrap hx-coins-in">
        <div className="hx-head">
          <h2>{t.coinTitle}</h2>
          <p>{t.coinSub}</p>
          <div className="hx-pack">
            <span className="hx-coin">B</span>
            <span>
              <b>{t.coinPrice}</b>
              <small>{t.freeCoins}</small>
            </span>
          </div>
          <div className="hx-pays">
            {settings.payment_methods.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
        <ol className="hx-steps">
          {steps.map(([title, desc], i) => (
            <li key={title}>
              <span className="hx-step-no">{i + 1}</span>
              <span>
                <b>{title}</b>
                <small>{desc}</small>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Why({ t }) {
  const items = [
    [Grid2x2, t.y1, t.y1d],
    [WifiOff, t.y2, t.y2d],
    [CircleDollarSign, t.y3, t.y3d],
    [Globe, t.y4, t.y4d],
  ];
  return (
    <section id="why" className="hx-section">
      <div className="wrap hx-why">
        <h2>{t.whyTitle}</h2>
        <ul>
          {items.map(([Icon, title, desc]) => (
            <li key={title}>
              <Icon size={22} aria-hidden="true" />
              <b>{title}</b>
              <span>{desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// start + talk to us, in one band
function Talk({ t, settings }) {
  const c = settings.contact;
  const tel = (p) =>
    `tel:+855${String(p || "")
      .replace(/\D/g, "")
      .replace(/^0/, "")}`;
  const items = [
    ...(c.phones || []).filter(Boolean).map((p) => [Phone, t.cCall, p, tel(p)]),
    c.telegram && [Send, t.cTelegram, c.telegram, c.telegram_url || `https://t.me/+855${String(c.telegram).replace(/\D/g, "").replace(/^0/, "")}`],
    c.email && [Mail, t.cEmail, c.email, `mailto:${c.email}`],
    c.facebook_url && [ThumbsUp, t.cFacebook, "Facebook", c.facebook_url],
    c.address && [MapPin, t.cAddress, c.address, c.map_url || ""],
  ].filter(Boolean);
  return (
    <section id="talk" className="hx-section hx-talk-wrap">
      <div className="wrap hx-talk">
        <div className="hx-glow g1" />
        <div className="hx-talk-text">
          <h2>{t.ctaBandTitle}</h2>
          <p>{t.ctaBandSub}</p>
          <Link className="btn hx-btn-main" to={ROUTES.signUp}>
            {t.ctaStart}
          </Link>
        </div>
        <div className="hx-contacts">
          {items.map(([Icon, label, value, href], i) => {
            const body = (
              <>
                <Icon size={18} />
                <span>
                  <small>{label}</small>
                  <b>{value}</b>
                </span>
              </>
            );
            return href ? (
              <a key={i} className="hx-contact" href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {body}
              </a>
            ) : (
              <div key={i} className="hx-contact">
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SiteFooter({ t, settings }) {
  const { t: tt } = useI18n(); // app texts (Terms of Service link)
  return (
    <footer className="hx-footer">
      <div className="wrap hx-footer-in">
        <span className="hx-footer-brand">
          <Logo height={28} />
          <small>{t.tagline}</small>
        </span>
        <nav aria-label="Footer">
          <a href="#services">{t.navServices}</a>
          <a href="#coins">{t.navPricing}</a>
          <Link to={ROUTES.terms}>{tt.terms}</Link>
          <Link to={ROUTES.privacy}>{tt.privacy}</Link>
          <Link to={ROUTES.deleteAccount}>{tt.deleteAccountLink}</Link>
          <Link to={ROUTES.login}>{t.login}</Link>
        </nav>
        <FootSocials t={t} settings={settings} />
        <small className="hx-copy">
          {t.copy}
          <PoweredBy as="span" value={settings.powered_by} className="hx-powered" />
        </small>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const data = useHomepageData();
  const { t, settings, services, steps, vars, lang } = data;
  const [openKey, setOpenKey] = useState(null);
  const [guide, setGuide] = useState(false); // Bizi for visitors
  usePageTitle(null);
  const names = Object.fromEntries(services.map((s) => [s.key, t[CARD_KEYS[s.key]?.title] || s.key]));

  return (
    <div className="home hx" lang={lang === "km" ? "km" : "en"}>
      <SiteHeader t={t} />
      <main>
        <HeroBanner t={t} methods={settings.payment_methods} bonus={vars.bonus} />
        <Ticker t={t} services={services} onOpen={setOpenKey} />
        <Services t={t} services={services} groups={data.groups} onOpen={setOpenKey} lang={lang} />
        <Coins t={t} settings={settings} />
        <Why t={t} />
        <MeetBizi t={t} lang={lang} onAsk={() => setGuide(true)} />
        <AppShowcase t={t} settings={settings} />
        <PosDownload t={t} />
        <Talk t={t} settings={settings} />
        <FollowUs t={t} settings={settings} />
      </main>
      <SiteFooter t={t} settings={settings} />
      <BiziGuide t={t} lang={lang} settings={settings} services={services} vars={vars} names={names} open={guide} setOpen={setGuide} onService={(k) => setOpenKey(k)} />
      {openKey && <ServiceSheet t={t} lang={lang} services={services} steps={steps} openKey={openKey} onChange={setOpenKey} onClose={() => setOpenKey(null)} />}
    </div>
  );
}
