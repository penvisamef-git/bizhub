import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Award, Hourglass, Megaphone as MegaphoneIc, Repeat, Rocket, Star, BarChart3, CalendarClock, ChevronDown, CreditCard, Lock, Megaphone, Palette, Puzzle, ReceiptText, Send, Tag, Ticket, Users, UsersRound, X } from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../restaurant/restaurant.css";
import "../menuqr/menuqr.css";
import "../../../evpub/evpub.css";
import "./event.css";
import { eventApi, licenseService } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import MyBusinesses from "../../../components/MyBusinesses";
import CoinIcon from "../../../components/CoinIcon";
import { memo } from "../../../lib/memo";
import { EventsTab, ADDON_ICON } from "./EvTabs";
import { fmt, fmtDate, useEvText } from "./text";
import { themeName } from "../../../evpub/themes";
import { certName } from "../../../evpub/certThemes";
import { CertView } from "../../../evpub/Certificate";
import { pageThemeName } from "../../../evpub/pageThemes";
import PagePreview from "../../../evpub/PagePreview";
import { TicketCard } from "../../../evpub/TicketCard";
import TeamNavLink from "../team/TeamNavLink";
import { useEvPubText } from "../../../evpub/text";

const LOAD = { tabs: () => import("./EvTabs") };
const tab = (name) => lazy(() => LOAD.tabs().then((m) => ({ default: m[name] })));
const OrdersTab = tab("OrdersTab");
const GuestsTab = tab("GuestsTab");
const ReportTab = tab("ReportTab");
const TeamTab = tab("TeamTab");
const PaymentTab = tab("PaymentTab");
const AddonsTab = tab("AddonsTab");
const DesignTab = tab("DesignTab");
const MORE = { more: () => import("./EvMore") };
const more = (name) => lazy(() => MORE.more().then((m) => ({ default: m[name] })));
const TelegramTab = more("TelegramTab");
const PromosTab = more("PromosTab");
const GROW = () => Promise.all([import("./EvGrow"), LOAD.tabs()]);
const grow = (name) => lazy(() => GROW().then(([m, t]) => ({ default: (p) => { const C = m[name]; return <C {...p} firstEvent={t.firstEvent} EventPick={t.EventPick} />; } })));
const WaitlistTab = grow("WaitlistTab");
const PromotersTab = grow("PromotersTab");
const FeedbackTab = grow("FeedbackTab");
const RequestsTab = grow("RequestsTab");
const CertsTab = lazy(() => Promise.all([import("./EvCerts"), LOAD.tabs()]).then(([m, t]) => ({ default: (p) => <m.CertsTab {...p} firstEvent={t.firstEvent} EventPick={t.EventPick} /> })));
const UpdatesTab = lazy(() => Promise.all([MORE.more(), LOAD.tabs()]).then(([m, t]) => ({ default: (p) => <m.UpdatesTab {...p} firstEvent={t.firstEvent} EventPick={t.EventPick} /> })));

const TABS = [
  ["events", Ticket, EventsTab],
  ["orders", ReceiptText, OrdersTab],
  ["guests", UsersRound, GuestsTab],
  ["report", BarChart3, ReportTab],
  ["team", Users, TeamTab],
  ["promos", Tag, PromosTab],
  ["promoters", MegaphoneIc, PromotersTab],
  ["waitlist", Hourglass, WaitlistTab],
  ["requests", Repeat, RequestsTab],
  ["feedback", Star, FeedbackTab],
  ["updates", Megaphone, UpdatesTab],
  ["certs", Award, CertsTab],
  ["telegram", Send, TelegramTab],
  ["design", Palette, DesignTab],
  ["payment", CreditCard, PaymentTab],
  ["addons", Puzzle, AddonsTab],
];
const GROUPS = [
  ["sell", ["events", "orders", "guests", "requests", "promos", "promoters", "waitlist"]],
  ["door", ["team", "report", "certs", "feedback", "updates", "telegram"]],
  ["setup", ["design", "payment", "addons"]],
];
const GRACE_DAYS = 7;

// Event Tickets: events + ticket types, orders (KHQR + screenshot), guests at the door, team + door phones
export default function EventDashboard() {
  const { id } = useParams();
  const { x, lang } = useEvText();
  const { t: pt } = useEvPubText();
  const [params, setParams] = useSearchParams();
  const current = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "events";
  const [data, setData] = useState(() => memo.get(`event:${id}`) || null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(null); // "renew" | { addon } | { theme, event }
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);
  const api = useMemo(() => eventApi({ id }), [id]);

  const reload = useCallback(
    () =>
      api
        .get()
        .then((r) => {
          memo.set(`event:${id}`, r.data);
          setData(r.data);
          setError("");
        })
        .catch((e) => setError(e.message || x.loadFail)),
    [api, id, x.loadFail],
  );
  useEffect(() => {
    reload();
    const t = setTimeout(() => [...Object.values(LOAD), ...Object.values(MORE)].forEach((l) => l().catch(() => {})), 400);
    return () => clearTimeout(t);
  }, [reload]);

  const go = (key, extra = {}) => {
    setParams(key === "events" && !Object.keys(extra).length ? {} : { tab: key, ...extra }, { replace: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const ctx = useMemo(() => {
    if (!data) return null;
    const put = (patch) =>
      setData((d) => {
        const next = { ...d, ...(typeof patch === "function" ? patch(d) : patch) };
        memo.set(`event:${id}`, next);
        return next;
      });
    return {
      id,
      x,
      lang,
      api,
      data,
      put,
      params,
      readOnly: !data.business.status || !!data.license.read_only,
      reload,
      notify: setNotice,
      askBuy: setBuying,
      go,
      on: (key) => !!data.addons?.[key]?.active,
    };
  }, [data, id, x, lang, api, reload, setNotice, params]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !data)
    return (
      <div className="panel-card sa-empty-state">
        <p>{error}</p>
        <button type="button" className="md-btn md-btn-primary" onClick={reload}>
          {x.retry}
        </button>
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
      </div>
    );
  if (!ctx) return <BusinessSkeleton />;

  const lic = data.license;
  const graceLeft = lic.expires_at ? Math.max(0, GRACE_DAYS - Math.floor((Date.now() - new Date(lic.expires_at).getTime()) / 86400000)) : 0;
  const [, CurrentIcon, Current] = TABS.find(([k]) => k === current);
  const live = data.events.filter((e) => e.sale === "open").length;
  const navList = GROUPS.map(([group, keys]) => (
    <div key={group} className="rs-nav-group">
      <span className="rs-nav-label">{x.groups[group]}</span>
      {keys.flatMap((key) => (key === "addons" ? ["team", key] : [key])).map((key) => {
        if (key === "team") return <TeamNavLink key="team" id={id} onGo={() => setNavOpen(false)} />; // Team, just above Add-ons
        const Icon = TABS.find(([k]) => k === key)[1];
        return (
          <button
            key={key}
            type="button"
            className={current === key ? "on" : ""}
            onClick={() => {
              setNavOpen(false);
              go(key);
            }}
            aria-current={current === key ? "page" : undefined}
            data-testid={`ev-tab-${key}`}
          >
            <Icon size={17} />
            <span className="rs-nav-text">{x.tabs[key]}</span>
            {key === "events" && <small className="rs-nav-count">{fmt(data.events.length)}</small>}
            {key === "orders" && data.waiting > 0 && <span className="rs-badge">{data.waiting}</span>}
          </button>
        );
      })}
    </div>
  ));

  let sell = null;
  if (buying === "renew")
    sell = {
      icon: CalendarClock,
      name: x.renewTitle,
      title: x.renewTitle,
      sub: x.renewSub,
      perks: [`${fmt(lic.price)} ${x.coins} ${x.perYear}`],
      price: lic.price,
      label: x.renewFor.replace("{coins}", fmt(lic.price)),
      buy: () => licenseService.buy(id, "event", lic.expires_at ?? null),
    };
  else if (buying?.addon && data.addons[buying.addon]) {
    const a = data.addons[buying.addon];
    sell = {
      icon: ADDON_ICON[buying.addon] || Puzzle,
      name: x.addonNames[buying.addon],
      title: x.unlockTitle.replace("{name}", x.addonNames[buying.addon]),
      sub: x.addonWhat[buying.addon],
      perks: [...(x.perks[buying.addon] || []), a.days ? `${fmt(a.price)} ${x.coins} ${x.perYear}` : `${x.oneTime} · ${x.forever}`],
      price: a.price,
      label: x.buy.replace("{coins}", fmt(a.price)),
      buy: () => licenseService.buy(id, buying.addon, a.days ? (a.expires_at ?? null) : null),
      done: x.unlockDone.replace("{name}", x.addonNames[buying.addon]),
    };
  } else if (buying?.feature) {
    const ev = data.events.find((e) => e._id === buying.feature);
    const price = data.feature?.price;
    const g = x.grow;
    sell = { icon: Rocket, name: g.featName.replace("{name}", ev?.title || ""), title: g.featTitle, sub: g.featWhat, perks: [g.featPerk1, g.featPerk2, ev?.featured_until ? g.featUntil.replace("{d}", fmtDate(ev.featured_until, lang)) : g.feat7], price, label: x.buy.replace("{coins}", fmt(price)), buy: () => api.feature(buying.feature), done: g.featDone };
  } else if (buying?.theme && buying.kind === "cert") {
    const nice = certName(buying.theme, lang);
    const ev = data.events.find((e) => e._id === buying.event) || data.events[0];
    const price = data.cert_themes?.price;
    const name = x.certs.buyName.replace("{name}", nice);
    sell = { cert: buying.theme, ev, icon: Award, name, title: name, sub: x.certs.buyWhat, perks: [`${x.oneTime} · ${x.forever}`], price, label: x.buy.replace("{coins}", fmt(price)), buy: () => api.buyCertTheme(buying.theme, buying.event), done: x.design.done.replace("{name}", nice) };
  } else if (buying?.theme) {
    const page = buying.kind === "page";
    const nice = (page ? pageThemeName : themeName)(buying.theme, lang);
    const name = (page ? x.design.pageName : x.design.name).replace("{name}", nice);
    const ev = data.events.find((e) => e._id === buying.event) || data.events[0];
    const price = (page ? data.page_themes : data.themes).price;
    sell = {
      theme: buying.theme,
      page,
      ev,
      icon: Palette,
      name,
      title: name,
      sub: page ? x.design.pageWhat : x.design.what,
      perks: [`${x.oneTime} · ${x.forever}`],
      price,
      label: x.buy.replace("{coins}", fmt(price)),
      buy: () => (page ? api.buyPageTheme : api.buyTheme)(buying.theme, buying.event),
      done: x.design.done.replace("{name}", nice),
    };
  }
  const BuyIcon = sell?.icon;

  return (
    <div className="md-page rs-page mq-page ev-page">
      {notice}
      <div className="rs-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="rs-head">
          <span className="rs-logo">{data.org.logo ? <img src={data.org.logo} alt="" /> : <Ticket size={26} />}</span>
          <div className="rs-head-text">
            <h2>{data.org.name || data.business.name}</h2>
            <div className="rs-head-meta">
              <span className="rs-chip">{x.badge}</span>
              {lic.expires_at && (
                <span className={`rs-chip s-${lic.locked ? "expired" : lic.status}`}>
                  <CalendarClock size={13} /> {x.endsOn.replace("{date}", fmtDate(lic.expires_at, lang))}
                </span>
              )}
              <span className="rs-chip">
                <Ticket size={13} /> {fmt(live)} {x.saleOpen.toLowerCase()}
              </span>
            </div>
          </div>
          <div className="mq-head-acts">
            {(lic.status === "expiring" || lic.in_grace || lic.locked) && (
              <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuying("renew")} disabled={!data.business.status}>
                <CoinIcon size={15} /> {x.renewFor.replace("{coins}", fmt(lic.price))}
              </button>
            )}
          </div>
        </div>
      </div>
      {!data.business.status && <div className="md-notice md-notice-error">{x.suspended}</div>}
      {lic.in_grace && (
        <div className="rs-banner warn">
          <AlertTriangle size={18} />
          <span>
            <b>{x.graceTitle}</b> {x.graceSub.replace("{n}", graceLeft)}
          </span>
        </div>
      )}
      {lic.locked && (
        <div className="rs-banner bad">
          <Lock size={18} />
          <span>
            <b>{x.lockedTitle}</b> {x.lockedSub}
          </span>
        </div>
      )}
      <div className="rs-body">
        <nav className="rs-nav" aria-label={x.badge}>
          {navList}
        </nav>
        <button type="button" className="rs-nav-btn" onClick={() => setNavOpen(true)} aria-haspopup="dialog">
          <CurrentIcon size={17} /> <b>{x.tabs[current]}</b>
          <span className="rs-nav-btn-all">
            {x.allSections} <ChevronDown size={16} />
          </span>
        </button>
        <main className="rs-main">
          <Suspense fallback={<TabSkeleton />}>
            <Current ctx={ctx} key={current} />
          </Suspense>
        </main>
      </div>
      {navOpen && (
        <div className="rs-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && setNavOpen(false)}>
          <div className="rs-sheet" role="dialog" aria-modal="true" aria-label={x.allSections}>
            <div className="rs-sheet-head">
              <b>{x.allSections}</b>
              <button type="button" className="md-icon-btn" onClick={() => setNavOpen(false)} aria-label={x.close}>
                <X size={18} />
              </button>
            </div>
            <nav className="rs-nav in-sheet">{navList}</nav>
          </div>
        </div>
      )}
      {sell && (
        <PurchaseModal
          stage={
            sell.cert ? (
              <div className="rs-stage ev-buy-stage">
                <div style={{ width: "100%" }}>
                  <CertView cert={{ ...(sell.ev?.cert || {}), design: sell.cert, signature: sell.ev?.cert?.signature || "" }} name={lang === "km" ? "សុខ ដារា" : "Sok Dara"} event={sell.ev || { title: data.org.name, starts_at: new Date() }} org={data.org} code="AB12CD34" thumb />
                </div>
              </div>
            ) : sell.page ? (
              <div className="rs-stage ev-buy-stage">
                <div className="ev-pg-buy">
                  <PagePreview ev={sell.ev || { title: data.org.name || data.business.name, starts_at: new Date() }} org={data.org} theme={sell.theme} ticketTheme={sell.ev?.theme} t={pt} lang={lang} />
                </div>
              </div>
            ) : sell.theme ? (
              <div className="rs-stage ev-buy-stage evp ev-th-scope">
                <TicketCard tk={{ code: "K7QX2MPA9D", no: 1, type_name: sell.ev?.types?.[0]?.name || "Standard", holder: lang === "km" ? "សុខ ដារ" : "Sok Dara", status: "valid" }} ev={sell.ev || { title: data.org.name || data.business.name, starts_at: new Date() }} theme={sell.theme} t={pt} lang={lang} preview />
              </div>
            ) : (
              <div className="rs-stage">
                <BuyIcon size={64} />
                <b>{sell.name}</b>
                <small>{data.org.name || data.business.name}</small>
              </div>
            )
          }
          badge={x.badge}
          title={sell.title}
          sub={sell.sub}
          perks={sell.perks}
          price={sell.price}
          buyLabel={sell.label}
          buy={sell.buy}
          doneSub={sell.done || null}
          onDone={(res) => {
            reload();
            if (buying === "renew" && res?.data) setNotice({ type: "success", text: x.renewDone.replace("{date}", fmtDate(res.data.expires_at, lang)) });
          }}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}
