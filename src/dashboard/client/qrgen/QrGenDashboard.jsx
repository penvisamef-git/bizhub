import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BarChart3, ChevronDown, FileStack, Inbox, Layers, Link2, Lock, Palette, Printer, Puzzle, QrCode, Send, Store, X } from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../restaurant/restaurant.css";
import "../menuqr/menuqr.css";
import "../flipbook/flipbook.css";
import "./qrgen.css";
import { licenseService, qrgenService } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import MyBusinesses from "../../../components/MyBusinesses";
import { memo } from "../../../lib/memo";
import { designName } from "../../../qrgen/designs";
import { qrDesignSvg } from "../../../qrgen/qrDesign";
import { fmt, useQgText } from "./text";
import { ADDON_ICON, ThemeThumb } from "./QgParts";
import { themeOf } from "../../../qrgen/themes";
import { PRINTS } from "../../../qrgen/prints";

const LOAD = {
  codes: () => import("./QgCodes"),
  more: () => import("./QgMore"),
};
const CodesTab = lazy(LOAD.codes);
const InboxTab = lazy(() => LOAD.more().then((x) => ({ default: x.InboxTab })));
const DesignsTab = lazy(() => LOAD.more().then((x) => ({ default: x.DesignsTab })));
const StatsTab = lazy(() => LOAD.more().then((x) => ({ default: x.StatsTab })));
const BulkTab = lazy(() => LOAD.more().then((x) => ({ default: x.BulkTab })));
const TelegramTab = lazy(() => LOAD.more().then((x) => ({ default: x.TelegramTab })));
const ProfileTab = lazy(() => LOAD.more().then((x) => ({ default: x.ProfileTab })));
const AddonsTab = lazy(() => LOAD.more().then((x) => ({ default: x.AddonsTab })));
const PrintTab = lazy(() => import("./QgPrint"));

const TABS = [
  ["codes", QrCode, CodesTab],
  ["designs", Palette, DesignsTab],
  ["bulk", Layers, BulkTab],
  ["print", Printer, PrintTab],
  ["inbox", Inbox, InboxTab],
  ["stats", BarChart3, StatsTab],
  ["telegram", Send, TelegramTab],
  ["profile", Store, ProfileTab],
  ["addons", Puzzle, AddonsTab],
];
const GROUPS = [
  ["make", ["codes", "designs", "bulk", "print"]],
  ["grow", ["inbox", "stats", "telegram"]],
  ["more", ["profile", "addons"]],
];
const NEEDS = { inbox: "qr_forms", stats: "qr_stats", bulk: "qr_bulk", telegram: "qr_telegram" };

// QR Code Generator: named QR codes, page templates, designs, forms + inbox, stats
export default function QrGenDashboard() {
  const { id } = useParams();
  const { m, lang } = useQgText();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "codes";
  const [data, setData] = useState(() => memo.get(`qg:${id}`) || null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(null); // { addon } | { design }
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);
  const reload = useCallback(
    () =>
      Promise.all([qrgenService.get(id), qrgenService.codes(id)])
        .then(([o, c]) => {
          const next = { ...o.data, codes: c.data };
          memo.set(`qg:${id}`, next);
          setData(next);
          setError("");
          return next;
        })
        .catch((e) => setError(e.message || m.loadFail)),
    [id, m.loadFail],
  );
  useEffect(() => {
    reload();
    const t = setTimeout(() => Object.values(LOAD).forEach((l) => l().catch(() => {})), 400);
    return () => clearTimeout(t);
  }, [reload]);
  const go = (key, extra = {}) => {
    setParams(key === "codes" && !Object.keys(extra).length ? {} : { tab: key, ...extra }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const ctx = useMemo(() => {
    if (!data) return null;
    const put = (patch) =>
      setData((d) => {
        const next = { ...d, ...(typeof patch === "function" ? patch(d) : patch) };
        memo.set(`qg:${id}`, next);
        return next;
      });
    return {
      id,
      m,
      lang,
      data,
      put,
      setSettings: (settings) => put({ settings }),
      readOnly: !data.business.status,
      reload,
      notify: setNotice,
      askBuy: setBuying,
      go,
      params,
      setParams,
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

  const s = data.settings;
  const [, CurrentIcon, Current] = TABS.find(([k]) => k === tab);
  const navList = GROUPS.map(([group, keys], gi) => (
    <div key={gi} className="rs-nav-group">
      {group && <span className="rs-nav-label">{m.groups[group]}</span>}
      {keys.map((key) => {
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
            data-testid={`qg-tab-${key}`}
          >
            <Icon size={17} />
            <span className="rs-nav-text">{m.tabs[key]}</span>
            {key === "codes" && <small className="rs-nav-count">{fmt(data.codes.length)}</small>}
            {key === "inbox" && data.counts.unread > 0 && <span className="rs-badge">{data.counts.unread > 99 ? "99+" : data.counts.unread}</span>}
            {locked && <Lock size={13} className="rs-nav-lock" />}
          </button>
        );
      })}
    </div>
  ));

  let sell = null;
  if (buying?.addon) {
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
  } else if (buying?.design) {
    const price = data.prices.qr_design;
    const name = m.designName.replace("{name}", designName(buying.design, lang));
    sell = {
      icon: Palette,
      art: qrDesignSvg({ text: `${window.location.origin}/x/demo`, design: buying.design, size: 220, scanMe: m.frameLabelPh }),
      name,
      title: name,
      sub: m.designWhat,
      perks: [`${m.oneTime} · ${m.forever}`],
      price,
      label: m.buy.replace("{coins}", fmt(price)),
      buy: () => qrgenService.buyDesign(id, buying.design),
      done: m.unlockDone.replace("{name}", name),
    };
  }
  if (buying?.theme) {
    const price = data.prices.qr_theme;
    const th = themeOf(buying.theme);
    const name = m.themeName.replace("{name}", th ? (lang === "km" ? th.km : th.en) : buying.theme);
    sell = {
      icon: Palette,
      thumb: buying.theme,
      name,
      title: name,
      sub: m.themeWhat,
      perks: [`${m.oneTime} · ${m.forever}`],
      price,
      label: m.buy.replace("{coins}", fmt(price)),
      buy: () => qrgenService.buyTheme(id, buying.theme),
      done: m.unlockDone.replace("{name}", name),
    };
  }
  if (buying?.slug) {
    const price = data.prices.qr_slug;
    const { code, value, done } = buying.slug;
    sell = {
      icon: Link2,
      name: m.slugTitle,
      title: `${m.slugTitle}: /x/${value}`,
      sub: m.slugWhat,
      perks: [`${m.oneTime} · ${m.forever}`, m.slugOld],
      price,
      label: m.buy.replace("{coins}", fmt(price)),
      buy: async () => {
        const r = await qrgenService.setSlug(id, code._id, value);
        done?.(r.data);
        return r;
      },
      done: `/x/${value}`,
    };
  }
  if (buying?.print) {
    const price = data.prices.qr_print;
    const pt = PRINTS.find((x) => x.key === buying.print);
    const name = m.printName.replace("{name}", pt ? (lang === "km" ? pt.km : pt.en) : buying.print);
    sell = {
      icon: Printer,
      name,
      title: name,
      sub: m.printWhat,
      perks: [`${m.oneTime} · ${m.forever}`],
      price,
      label: m.buy.replace("{coins}", fmt(price)),
      buy: () => qrgenService.buyPrint(id, buying.print),
      done: m.unlockDone.replace("{name}", name),
    };
  }
  const BuyIcon = sell?.icon;

  return (
    <div className="md-page rs-page mq-page qg-page">
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
              <span className="rs-chip">QR Code Generator</span>
              <span className="rs-chip">
                <QrCode size={13} /> {fmt(data.codes.length)}
              </span>
              <span className="rs-chip">
                <FileStack size={13} /> {m.fileRoom.replace("{n}", data.files.count).replace("{max}", data.files.capacity)}
              </span>
            </div>
          </div>
        </div>
      </div>
      {!data.business.status && <div className="md-notice md-notice-error">{m.suspended}</div>}
      <div className="rs-body">
        <nav className="rs-nav" aria-label="QR Code Generator">
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
              {sell.thumb ? (
                <span className="qg-stage-thumb">
                  <ThemeThumb template={sell.thumb} color={buying.color || s.color || "#E0581A"} business={data.business.name} name={data.business.name} />
                </span>
              ) : sell.art ? (
                <span className="qg-stage-art" dangerouslySetInnerHTML={{ __html: sell.art }} />
              ) : (
                <BuyIcon size={64} />
              )}
              <b>{sell.name}</b>
              <small>{data.business.name}</small>
            </div>
          }
          badge="QR Code Generator"
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
