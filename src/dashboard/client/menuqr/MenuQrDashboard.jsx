import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, Images, ArrowLeft, BarChart3, CalendarClock, ChevronDown, Copy, ExternalLink, Lock, MessageSquareHeart, Palette, Puzzle, QrCode, Store, Tag, UtensilsCrossed, X } from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../restaurant/restaurant.css";
import "./menuqr.css";
import { licenseService, menuQrService } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import MyBusinesses from "../../../components/MyBusinesses";
import { memo } from "../../../lib/memo";
import { fmt, fmtDate, menuUrl, useMqText } from "./text";
import { themeLabel } from "../../../qmenu/themes";
import { qrStyleName } from "./qrArt";
import TeamNavLink from "../team/TeamNavLink";
import { ADDON_ICON } from "./parts";

const LOAD = {
  menu: () => import("./MqMenu"),
  profile: () => import("./MqProfile"),
  looks: () => import("./MqLooks"),
  qr: () => import("./MqQr"),
  more: () => import("./MqMore"),
  media: () => import("./MqMedia"),
};
const MenuTab = lazy(LOAD.menu);
const ProfileTab = lazy(LOAD.profile);
const LooksTab = lazy(LOAD.looks);
const MediaTab = lazy(LOAD.media);
const QrTab = lazy(LOAD.qr);
const PromosTab = lazy(() => LOAD.more().then((x) => ({ default: x.PromosTab })));
const FeedbackTab = lazy(() => LOAD.more().then((x) => ({ default: x.FeedbackTab })));
const StatsTab = lazy(() => LOAD.more().then((x) => ({ default: x.StatsTab })));
const AddonsTab = lazy(() => LOAD.more().then((x) => ({ default: x.AddonsTab })));

const TABS = [
  ["menu", UtensilsCrossed, MenuTab],
  ["media", Images, MediaTab],
  ["profile", Store, ProfileTab],
  ["looks", Palette, LooksTab],
  ["promos", Tag, PromosTab],
  ["qr", QrCode, QrTab],
  ["feedback", MessageSquareHeart, FeedbackTab],
  ["stats", BarChart3, StatsTab],
  ["addons", Puzzle, AddonsTab],
];
const GROUPS = [
  ["build", ["menu", "media", "profile", "looks", "promos"]],
  ["share", ["qr"]],
  ["grow", ["feedback", "stats"]],
  [null, ["addons"]],
];
const NEEDS = { promos: "mq_promos", feedback: "mq_feedback", stats: "mq_stats" };

// Menu QR: build a menu, pick a look, print the QR code
export default function MenuQrDashboard() {
  const { id } = useParams();
  const { m, lang } = useMqText();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "menu";
  const [data, setData] = useState(() => memo.get(`mq:${id}`) || null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(null); // "renew" | { addon } | { theme } | { qr }
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);
  const reload = useCallback(
    () =>
      menuQrService
        .get(id)
        .then((r) => {
          memo.set(`mq:${id}`, r.data);
          setData(r.data);
          setError("");
          return r.data;
        })
        .catch((e) => setError(e.message || m.loadFail)),
    [id, m.loadFail],
  );
  useEffect(() => {
    reload();
    const t = setTimeout(() => Object.values(LOAD).forEach((l) => l().catch(() => {})), 400);
    return () => clearTimeout(t);
  }, [reload]);
  const go = (key) => {
    setParams(key === "menu" ? {} : { tab: key }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const ctx = useMemo(() => {
    if (!data) return null;
    return {
      id,
      m,
      lang,
      data,
      setData: (next) => {
        memo.set(`mq:${id}`, next);
        setData(next);
      },
      setSettings: (settings) =>
        setData((d) => {
          const next = { ...d, settings };
          memo.set(`mq:${id}`, next);
          return next;
        }),
      readOnly: !data.business.status || !!data.license.locked,
      reload,
      notify: setNotice,
      askBuy: setBuying,
      go,
      on: (key) => !!data.addons?.[key]?.active,
    };
  }, [data, id, m, lang, reload, setNotice]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !data)
    return (
      <div className="panel-card sa-empty-state">
        <p>{error}</p>
        <button type="button" className="md-btn md-btn-primary" onClick={reload}>
          {m.retry}
        </button>
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
      </div>
    );
  if (!ctx) return <BusinessSkeleton />;

  const lic = data.license;
  const s = data.settings;
  const url = menuUrl(s.slug);
  const graceLeft = lic.grace_until ? Math.max(0, Math.ceil((new Date(lic.grace_until) - Date.now()) / 86400000)) : 0;
  const [, CurrentIcon, Current] = TABS.find(([k]) => k === tab);
  const navList = GROUPS.map(([group, keys], gi) => (
    <div key={gi} className="rs-nav-group">
      {group && <span className="rs-nav-label">{m.groups[group]}</span>}
      {keys.flatMap((key) => (key === "addons" ? ["team", key] : [key])).map((key) => {
        if (key === "team") return <TeamNavLink key="team" id={id} onGo={() => setNavOpen(false)} />; // Team, just above Add-ons
        const Icon = TABS.find(([k]) => k === key)[1];
        const locked = NEEDS[key] && !ctx.on(NEEDS[key]);
        return (
          <button
            key={key}
            type="button"
            className={tab === key ? "on" : ""}
            onClick={() => {
              setNavOpen(false);
              go(key);
            }}
            aria-current={tab === key ? "page" : undefined}
            data-testid={`mq-tab-${key}`}
          >
            <Icon size={17} />
            <span className="rs-nav-text">{m.tabs[key]}</span>
            {key === "media" && data.media && <small className={`rs-nav-count ${data.media.count >= data.media.capacity ? "mq-full" : ""}`}>{`${data.media.count}/${data.media.capacity}`}</small>}
            {key === "feedback" && data.counts.feedback_unread > 0 && <span className="rs-badge">{data.counts.feedback_unread > 99 ? "99+" : data.counts.feedback_unread}</span>}
            {locked && <Lock size={13} className="rs-nav-lock" />}
          </button>
        );
      })}
    </div>
  ));

  // what the purchase box sells
  let sell = null;
  if (buying === "renew")
    sell = {
      icon: CalendarClock,
      name: m.renewTitle,
      title: m.renewTitle,
      sub: m.renewSub,
      perks: [],
      price: data.renew_price,
      label: m.renewFor.replace("{coins}", fmt(data.renew_price)),
      buy: () => licenseService.buy(id, "menu_qr", lic.expires_at ?? null),
    };
  else if (buying?.addon) {
    const a = data.addons[buying.addon];
    sell = {
      icon: ADDON_ICON[buying.addon] || Puzzle,
      name: m.addonNames[buying.addon],
      title: m.unlockTitle.replace("{name}", m.addonNames[buying.addon]),
      sub: m.addonWhat[buying.addon],
      perks: [m.addonFree[buying.addon], a.days ? `${fmt(a.price)} ${m.coins} ${m.perYear}` : `${m.oneTime} · ${m.forever}`],
      price: a.price,
      label: m.buy.replace("{coins}", fmt(a.price)),
      buy: () => licenseService.buy(id, buying.addon, a.expires_at ?? null),
      done: m.unlockDone.replace("{name}", m.addonNames[buying.addon]),
    };
  } else if (buying?.theme) {
    const price = data.themes.price[buying.tier] || 0;
    const name = m.themeName.replace("{name}", themeLabel(buying.theme, lang));
    sell = {
      icon: Palette,
      name,
      title: name,
      sub: m.themeWhat,
      perks: [`${m.oneTime} · ${m.forever}`],
      price,
      label: m.buy.replace("{coins}", fmt(price)),
      buy: () => menuQrService.buyTheme(id, buying.theme),
      done: m.unlockDone.replace("{name}", name),
    };
  } else if (buying?.qr) {
    const price = data.qr.price;
    const name = m.qrName.replace("{name}", qrStyleName(buying.qr, lang));
    sell = { icon: QrCode, name, title: name, sub: m.qrWhat, perks: [`${m.oneTime} · ${m.forever}`], price, label: m.buy.replace("{coins}", fmt(price)), buy: () => menuQrService.buyQr(id, buying.qr), done: m.unlockDone.replace("{name}", name) };
  }
  const BuyIcon = sell?.icon;

  return (
    <div className="md-page rs-page mq-page">
      {notice}
      <div className="rs-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="rs-head">
          <span className="rs-logo">{s.logo?.url ? <img src={s.logo.url} alt="" /> : <QrCode size={26} />}</span>
          <div className="rs-head-text">
            <h2>{data.business.name}</h2>
            <div className="rs-head-meta">
              <span className="rs-chip">Menu QR Code</span>
              {lic.expires_at && (
                <span className={`rs-chip s-${lic.locked ? "expired" : lic.status}`}>
                  <CalendarClock size={13} /> {m.endsOn.replace("{date}", fmtDate(lic.expires_at, lang))}
                </span>
              )}
              <span className="rs-chip">
                <UtensilsCrossed size={13} /> {fmt(data.counts.items)}
              </span>
            </div>
          </div>
          <div className="mq-head-acts">
            <a className="md-btn md-btn-ghost sa-btn-sm" href={url} target="_blank" rel="noreferrer" data-testid="mq-open">
              <ExternalLink size={14} /> {m.openMenu}
            </a>
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(url).catch(() => {});
                setNotice({ type: "success", text: m.copied });
              }}
            >
              <Copy size={14} /> {m.copyLink}
            </button>
            {(lic.status === "expiring" || lic.in_grace || lic.locked) && (
              <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuying("renew")} disabled={!data.business.status}>
                <CoinIcon size={15} /> {m.renewFor.replace("{coins}", fmt(data.renew_price))}
              </button>
            )}
          </div>
        </div>
      </div>
      {!data.business.status && <div className="md-notice md-notice-error">{m.suspended}</div>}
      {lic.in_grace && (
        <div className="rs-banner warn">
          <AlertTriangle size={18} />
          <span>
            <b>{m.graceTitle}</b> {m.graceSub.replace("{n}", graceLeft)}
          </span>
        </div>
      )}
      {lic.locked && (
        <div className="rs-banner bad">
          <Lock size={18} />
          <span>
            <b>{m.lockedTitle}</b> {m.lockedSub}
          </span>
        </div>
      )}
      <div className="rs-body">
        <nav className="rs-nav" aria-label="Menu QR">
          {navList}
        </nav>
        <button type="button" className="rs-nav-btn" onClick={() => setNavOpen(true)} aria-haspopup="dialog">
          <CurrentIcon size={17} /> <b>{m.tabs[tab]}</b>
          <span className="rs-nav-btn-all">
            {m.allSections} <ChevronDown size={16} />
          </span>
        </button>
        <main className="rs-main">
          <Suspense fallback={<TabSkeleton />}>
            <Current ctx={ctx} key={tab} />
          </Suspense>
        </main>
      </div>
      {navOpen && (
        <div className="rs-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && setNavOpen(false)}>
          <div className="rs-sheet" role="dialog" aria-modal="true" aria-label={m.allSections}>
            <div className="rs-sheet-head">
              <b>{m.allSections}</b>
              <button type="button" className="md-icon-btn" onClick={() => setNavOpen(false)} aria-label={m.close}>
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
            <div className="rs-stage">
              <BuyIcon size={64} />
              <b>{sell.name}</b>
              <small>{data.business.name}</small>
            </div>
          }
          badge={buying === "renew" ? "Menu QR Code" : m.tabs.addons}
          title={sell.title}
          sub={sell.sub}
          perks={sell.perks}
          price={sell.price}
          buyLabel={sell.label}
          buy={sell.buy}
          doneSub={sell.done || null}
          onDone={(res) => {
            reload();
            if (buying === "renew" && res?.data) setNotice({ type: "success", text: m.renewDone.replace("{date}", fmtDate(res.data.expires_at, lang)) });
          }}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}
