import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BarChart3, CalendarClock, ChevronDown, Copy, ExternalLink, History, Lock, Monitor, Palette, Puzzle, QrCode, Send, Stamp, Users, X } from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../restaurant/restaurant.css";
import "../menuqr/menuqr.css";
import "../qrgen/qrgen.css";
import "../website/website.css";
import "../debt/debt.css";
import "../../../stamp/stamp.css";
import { licenseService, stampApi } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import MyBusinesses from "../../../components/MyBusinesses";
import CoinIcon from "../../../components/CoinIcon";
import { memo } from "../../../lib/memo";
import { StampTab, ADDON_ICON } from "./ScTabs";
import { themeName } from "../../../stamp/themes";
import { posterName } from "../../../stamp/posters";
import StampCard from "../../../stamp/StampCard";
import TeamNavLink from "../team/TeamNavLink";
import { fmt, fmtDate, shopUrl, useScText } from "./text";

const LOAD = { tabs: () => import("./ScTabs") };
const tab = (name) => lazy(() => LOAD.tabs().then((m) => ({ default: m[name] })));
const CustomersTab = tab("CustomersTab");
const HistoryTab = tab("HistoryTab");
const StatsTab = tab("StatsTab");
const ShopQrTab = tab("ShopQrTab");
const TelegramTab = tab("TelegramTab");
const DesignTab = tab("DesignTab");
const DeskTab = tab("DeskTab");
const AddonsTab = tab("AddonsTab");

const TABS = [
  ["stamp", Stamp, StampTab],
  ["customers", Users, CustomersTab],
  ["history", History, HistoryTab],
  ["stats", BarChart3, StatsTab],
  ["shopqr", QrCode, ShopQrTab],
  ["telegram", Send, TelegramTab],
  ["design", Palette, DesignTab],
  ["desk", Monitor, DeskTab],
  ["addons", Puzzle, AddonsTab],
];
const NEEDS = { telegram: "sc_telegram" };
const GROUPS = [
  ["card", ["stamp", "customers", "history"]],
  ["grow", ["stats", "shopqr", "telegram"]],
  ["setup", ["design", "desk", "addons"]],
];
const GRACE_DAYS = 7;

// Loyalty Stamp Card: stamps at the counter, customers, rewards, the shop QR, the staff desk
export default function StampDashboard() {
  const { id } = useParams();
  const { x, lang } = useScText();
  const [params, setParams] = useSearchParams();
  const current = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "stamp";
  const [data, setData] = useState(() => memo.get(`stamp:${id}`) || null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(null); // "renew" | { addon } | { theme }
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);
  const api = useMemo(() => stampApi({ id }), [id]);

  const reload = useCallback(
    () =>
      api
        .get()
        .then((r) => {
          memo.set(`stamp:${id}`, r.data);
          setData(r.data);
          setError("");
        })
        .catch((e) => setError(e.message || x.loadFail)),
    [api, id, x.loadFail],
  );
  useEffect(() => {
    reload();
    const t = setTimeout(() => Object.values(LOAD).forEach((l) => l().catch(() => {})), 400);
    return () => clearTimeout(t);
  }, [reload]);

  const go = (key) => {
    setParams(key === "stamp" ? {} : { tab: key }, { replace: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const ctx = useMemo(() => {
    if (!data) return null;
    const put = (patch) =>
      setData((d) => {
        const next = { ...d, ...(typeof patch === "function" ? patch(d) : patch) };
        memo.set(`stamp:${id}`, next);
        return next;
      });
    return {
      id,
      x,
      lang,
      api,
      data,
      put,
      readOnly: !data.business.status || !!data.license.read_only,
      reload,
      notify: setNotice,
      askBuy: setBuying,
      go,
      on: (key) => !!data.addons?.[key]?.active,
    };
  }, [data, id, x, lang, api, reload, setNotice]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const p = data.program;
  const lic = data.license;
  const url = shopUrl(p.slug);
  const graceLeft = lic.expires_at ? Math.max(0, GRACE_DAYS - Math.floor((Date.now() - new Date(lic.expires_at).getTime()) / 86400000)) : 0;
  const [, CurrentIcon, Current] = TABS.find(([k]) => k === current);
  const navList = GROUPS.map(([group, keys]) => (
    <div key={group} className="rs-nav-group">
      <span className="rs-nav-label">{x.groups[group]}</span>
      {keys.map((key) => {
        const Icon = TABS.find(([k]) => k === key)[1];
        const locked = NEEDS[key] && !ctx.on(NEEDS[key]);
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
            data-testid={`sc-tab-${key}`}
          >
            <Icon size={17} />
            <span className="rs-nav-text">{x.tabs[key]}</span>
            {key === "customers" && <small className="rs-nav-count">{fmt(data.totals.customers)}</small>}
            {key === "stamp" && data.totals.ready > 0 && <span className="rs-badge">{data.totals.ready}</span>}
            {locked && <Lock size={13} className="rs-nav-lock" />}
          </button>
        );
      })}
      {keys.includes("addons") && <TeamNavLink id={id} onGo={() => setNavOpen(false)} />}
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
      buy: () => licenseService.buy(id, "stamp_card", lic.expires_at ?? null),
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
  } else if (buying?.poster) {
    const name = x.posterName.replace("{name}", posterName(buying.poster, lang));
    sell = { icon: QrCode, name, title: name, sub: x.posterWhat, perks: [`${x.oneTime} · ${x.forever}`], price: data.posters.price, label: x.buy.replace("{coins}", fmt(data.posters.price)), buy: () => api.buyPoster(buying.poster), done: x.unlockDone.replace("{name}", name) };
  } else if (buying?.theme) {
    const name = x.themeName.replace("{name}", themeName(buying.theme, lang));
    sell = { theme: buying.theme, icon: Palette, name, title: name, sub: x.themeWhat, perks: [`${x.oneTime} · ${x.forever}`], price: data.themes.price, label: x.buy.replace("{coins}", fmt(data.themes.price)), buy: () => api.buyTheme(buying.theme), done: x.unlockDone.replace("{name}", name) };
  }
  const BuyIcon = sell?.icon;

  return (
    <div className="md-page rs-page mq-page qg-page ws-page dk-page sc-page-owner">
      {notice}
      <div className="rs-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="rs-head">
          <span className="rs-logo">{p.logo ? <img src={p.logo} alt="" /> : <Stamp size={26} />}</span>
          <div className="rs-head-text">
            <h2>{p.shop_name || data.business.name}</h2>
            <div className="rs-head-meta">
              <span className="rs-chip">{x.badge}</span>
              {lic.expires_at && (
                <span className={`rs-chip s-${lic.locked ? "expired" : lic.status}`}>
                  <CalendarClock size={13} /> {x.endsOn.replace("{date}", fmtDate(lic.expires_at, lang))}
                </span>
              )}
              <span className="rs-chip">
                <Users size={13} /> {fmt(data.totals.customers)}
              </span>
            </div>
          </div>
          <div className="mq-head-acts">
            <a className="md-btn md-btn-ghost sa-btn-sm" href={url} target="_blank" rel="noreferrer" data-testid="sc-open-shop">
              <ExternalLink size={14} /> {x.openShop}
            </a>
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(url).catch(() => {});
                setNotice({ type: "success", text: x.copied });
              }}
            >
              <Copy size={14} /> {x.copyLink}
            </button>
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
            sell.theme ? (
              <div className="rs-stage sc-buy-stage">
                <StampCard shop={{ name: p.shop_name || data.business.name, logo: p.logo, theme: sell.theme, color: "", icon: p.icon, goal: p.goal, levels: data.levels }} lang={lang} compact />
              </div>
            ) : (
            <div className="rs-stage">
              <BuyIcon size={64} />
              <b>{sell.name}</b>
              <small>{p.shop_name || data.business.name}</small>
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
