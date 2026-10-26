import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BarChart3, ChevronDown, ExternalLink, Globe, Inbox, Layers, Loader2, Lock, Newspaper, Palette, Puzzle, Rocket, Send, Settings, Store, X } from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../restaurant/restaurant.css";
import "../menuqr/menuqr.css";
import "../qrgen/qrgen.css";
import "./website.css";
import { licenseService, websiteService } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import MyBusinesses from "../../../components/MyBusinesses";
import { memo } from "../../../lib/memo";
import { tx } from "../../../wsite/blocks";
import { wsThemeName } from "../../../wsite/themes";
import TeamNavLink from "../team/TeamNavLink";
import { fmt, fmtDate, SITE, useWsText } from "./text";

const LOAD = { editor: () => import("./WsEditor"), more: () => import("./WsMore") };
const EditorTab = lazy(LOAD.editor);
const tab = (name) => lazy(() => LOAD.more().then((x) => ({ default: x[name] })));
const StyleTab = tab("StyleTab");
const SettingsTab = tab("SettingsTab");
const ProfileTab = tab("ProfileTab");
const InboxTab = tab("InboxTab");
const BlogTab = tab("BlogTab");
const StatsTab = tab("StatsTab");
const TelegramTab = tab("TelegramTab");
const AddonsTab = tab("AddonsTab");

const TABS = [
  ["pages", Layers, EditorTab],
  ["style", Palette, StyleTab],
  ["profile", Store, ProfileTab],
  ["settings", Settings, SettingsTab],
  ["inbox", Inbox, InboxTab],
  ["blog", Newspaper, BlogTab],
  ["stats", BarChart3, StatsTab],
  ["telegram", Send, TelegramTab],
  ["addons", Puzzle, AddonsTab],
];
const GROUPS = [
  ["build", ["pages", "style", "profile", "settings"]],
  ["grow", ["inbox", "blog", "stats", "telegram"]],
  ["more", ["addons"]],
];
const NEEDS = { blog: "web_blog", telegram: "web_telegram" };
const ADDON_ICON = { web_telegram: Send, web_brand: Palette, web_pages: Layers, web_blog: Newspaper, web_nobrand: Globe, web_slug: Globe, web_stats: BarChart3 };

// Website Builder: pages made of blocks, a draft + Publish, looks, inbox, blog, visits
export default function WebsiteDashboard() {
  const { id } = useParams();
  const { m, lang } = useWsText();
  const [params, setParams] = useSearchParams();
  const current = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "pages";
  const [data, setData] = useState(() => memo.get(`ws:${id}`) || null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(null); // { addon } | { theme } | { renew }
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const flushRef = useRef(null);

  const reload = useCallback(
    () =>
      websiteService
        .get(id)
        .then((r) => {
          setData((old) => {
            const next = { ...r.data, postsPreview: old?.postsPreview };
            memo.set(`ws:${id}`, next);
            return next;
          });
          setError("");
        })
        .catch((e) => setError(e.message || m.loadFail)),
    [id, m.loadFail],
  );
  useEffect(() => {
    reload();
    const t = setTimeout(() => Object.values(LOAD).forEach((l) => l().catch(() => {})), 400);
    return () => clearTimeout(t);
  }, [reload]);
  // blog posts for the "Latest posts" block in the preview
  useEffect(() => {
    if (data?.addons?.web_blog?.active && !data.postsPreview)
      websiteService
        .posts(id)
        .then((r) => setData((d) => ({ ...d, postsPreview: r.data.filter((p) => p.published).slice(0, 6) })))
        .catch(() => {});
  }, [data?.addons?.web_blog?.active]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (key, extra = {}) => {
    setParams(key === "pages" && !Object.keys(extra).length ? {} : { tab: key, ...extra }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const ctx = useMemo(() => {
    if (!data) return null;
    const put = (patch) =>
      setData((d) => {
        const next = { ...d, ...(typeof patch === "function" ? patch(d) : patch) };
        memo.set(`ws:${id}`, next);
        return next;
      });
    return {
      id,
      m,
      lang,
      data,
      put,
      readOnly: !data.business.status || data.license.locked,
      reload,
      notify: setNotice,
      askBuy: setBuying,
      go,
      params,
      setParams,
      flushRef,
      on: (key) => !!data.addons?.[key]?.active,
    };
  }, [data, id, m, lang, reload, setNotice, params]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const s = data.site;
  const link = `${SITE}/site/${s.slug}`;
  const status = !s.published ? "draft" : s.changed_at ? "changes" : "live";
  const publish = async () => {
    setPublishing(true);
    try {
      await flushRef.current?.();
      const r = await websiteService.publish(id);
      ctx.put((d) => ({ site: { ...d.site, ...r.data } }));
      setNotice({ type: "success", text: m.publishedOk });
    } catch (e) {
      if (e.status === 402) setBuying({ renew: true });
      setNotice({ type: "error", text: e.message });
    } finally {
      setPublishing(false);
    }
  };
  const [, CurrentIcon, Current] = TABS.find(([k]) => k === current);
  const navList = GROUPS.map(([group, keys]) => (
    <div key={group} className="rs-nav-group">
      <span className="rs-nav-label">{m.groups[group]}</span>
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
            data-testid={`ws-tab-${key}`}
          >
            <Icon size={17} />
            <span className="rs-nav-text">{m.tabs[key]}</span>
            {key === "pages" && <small className="rs-nav-count">{fmt(data.pages.length)}</small>}
            {key === "inbox" && data.counts.unread > 0 && <span className="rs-badge">{data.counts.unread > 99 ? "99+" : data.counts.unread}</span>}
            {locked && <Lock size={13} className="rs-nav-lock" />}
          </button>
        );
      })}
      {keys.includes("addons") && <TeamNavLink id={id} onGo={() => setNavOpen(false)} />}
    </div>
  ));

  let sell = null;
  if (buying?.addon && data.addons[buying.addon]) {
    const a = data.addons[buying.addon];
    sell = {
      icon: ADDON_ICON[buying.addon] || Puzzle,
      name: m.addonNames[buying.addon],
      title: m.unlockTitle.replace("{name}", m.addonNames[buying.addon]),
      sub: m.addonWhat[buying.addon],
      perks: [a.days ? `${fmt(a.price)} ${m.coins} ${m.perYear}` : `${m.oneTime} · ${m.forever}`],
      price: a.price,
      label: m.buy.replace("{coins}", fmt(a.price)),
      buy: () => licenseService.buy(id, buying.addon, a.days ? (a.expires_at ?? null) : null),
      done: m.unlockDone.replace("{name}", m.addonNames[buying.addon]),
    };
  } else if (buying?.theme) {
    const name = m.themeName.replace("{name}", wsThemeName(buying.theme, lang));
    sell = {
      icon: Palette,
      name,
      title: name,
      sub: m.themeWhat,
      perks: [`${m.oneTime} · ${m.forever}`],
      price: data.themes.price,
      label: m.buy.replace("{coins}", fmt(data.themes.price)),
      buy: () => websiteService.buyTheme(id, buying.theme),
      done: m.unlockDone.replace("{name}", name),
    };
  } else if (buying?.renew) {
    sell = {
      icon: Globe,
      name: m.renewTitle,
      title: m.renewTitle,
      sub: m.renewSub,
      perks: [`${fmt(data.renew_price)} ${m.coins} ${m.perYear}`],
      price: data.renew_price,
      label: m.buy.replace("{coins}", fmt(data.renew_price)),
      buy: () => licenseService.buy(id, "website", data.license.expires_at ?? null),
      done: m.renewTitle,
    };
  }
  const BuyIcon = sell?.icon;

  return (
    <div className="md-page rs-page mq-page qg-page ws-page">
      {notice}
      <div className="rs-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="rs-head ws-headrow">
          <span className="rs-logo">{s.logo ? <img src={s.logo} alt="" /> : <Globe size={26} />}</span>
          <div className="rs-head-text">
            <h2>{tx(s.name, lang) || data.business.name}</h2>
            <div className="rs-head-meta">
              <span className="rs-chip">{m.badge}</span>
              <span className="rs-chip">
                <Palette size={13} /> {wsThemeName(s.theme, lang)}
              </span>
              <a className="rs-chip ws-linkchip" href={link} target="_blank" rel="noopener noreferrer" data-testid="ws-open-link">
                /site/{s.slug} <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <div className="ws-publish">
            <span className={`ws-status s-${status}`} data-testid="ws-status">
              <i /> {m[status === "changes" ? "changes" : status === "live" ? "upToDate" : "draft"]}
            </span>
            {s.published && (
              <a className="md-btn md-btn-ghost sa-btn-sm" href={link} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> {m.viewSite}
              </a>
            )}
            <button type="button" className="md-btn md-btn-primary" onClick={publish} disabled={publishing || ctx.readOnly || !data.pages.length || status === "live"} data-testid="ws-publish">
              {publishing ? <Loader2 size={15} className="md-spin" /> : <Rocket size={15} />} {publishing ? m.publishing : m.publish}
            </button>
          </div>
        </div>
      </div>
      {!data.business.status && <div className="md-notice md-notice-error">{m.suspended}</div>}
      {data.license.locked && (
        <div className="md-notice md-notice-error ws-renew">
          <span>
            <b>{m.lockedTitle}</b> {m.lockedSub}
          </span>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuying({ renew: true })} data-testid="ws-renew">
            {m.renew.replace("{coins}", fmt(data.renew_price))}
          </button>
        </div>
      )}
      {data.license.in_grace && (
        <div className="md-notice ws-renew">
          <span>{m.graceSub.replace("{date}", fmtDate(data.license.grace_until, lang))}</span>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuying({ renew: true })}>
            {m.renew.replace("{coins}", fmt(data.renew_price))}
          </button>
        </div>
      )}
      <div className={`rs-body ${["pages", "style"].includes(current) ? "ws-wide" : ""}`}>
        <nav className="rs-nav" aria-label={m.badge}>
          {navList}
        </nav>
        <button type="button" className="rs-nav-btn" onClick={() => setNavOpen(true)} aria-haspopup="dialog">
          <CurrentIcon size={17} /> <b>{m.tabs[current]}</b>
          <span className="rs-nav-btn-all">
            {m.allSections} <ChevronDown size={16} />
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
              <small>{tx(s.name, lang) || data.business.name}</small>
            </div>
          }
          badge={m.badge}
          title={sell.title}
          sub={sell.sub}
          perks={sell.perks}
          price={sell.price}
          buyLabel={sell.label}
          buy={sell.buy}
          doneSub={sell.done || null}
          onDone={() => reload()}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}
