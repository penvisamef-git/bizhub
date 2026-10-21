import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Users, ArrowLeft, BarChart3, BookOpen, BookOpenText, ChevronDown, Copy, ExternalLink, FolderOpen, Info, Library, Lock, Palette, Puzzle, QrCode, X } from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../restaurant/restaurant.css";
import "../menuqr/menuqr.css";
import "./flipbook.css";
import { flipbookService, licenseService } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import MyBusinesses from "../../../components/MyBusinesses";
import { memo } from "../../../lib/memo";
import { isLive, shelfName } from "../../../fbook/shelves";
import { readerName } from "../../../fbook/readers";
import { fmt, shelfUrl, useFbText } from "./text";
import { ADDON_ICON } from "./FbParts";

const LOAD = {
  books: () => import("./FbBooks"),
  look: () => import("./FbLook"),
  more: () => import("./FbMore"),
};
const BooksTab = lazy(LOAD.books);
const LibraryTab = lazy(() => LOAD.look().then((x) => ({ default: x.LibraryTab })));
const InfoTab = lazy(() => LOAD.look().then((x) => ({ default: x.InfoTab })));
const ReaderTab = lazy(() => LOAD.look().then((x) => ({ default: x.ReaderTab })));
const CategoriesTab = lazy(() => LOAD.more().then((x) => ({ default: x.CategoriesTab })));
const ShareTab = lazy(() => LOAD.more().then((x) => ({ default: x.ShareTab })));
const StatsTab = lazy(() => LOAD.more().then((x) => ({ default: x.StatsTab })));
const AddonsTab = lazy(() => LOAD.more().then((x) => ({ default: x.AddonsTab })));
const LeadsTab = lazy(() => import("./FbExtras").then((x) => ({ default: x.LeadsTab })));

const TABS = [
  ["books", BookOpen, BooksTab],
  ["categories", FolderOpen, CategoriesTab],
  ["library", Library, LibraryTab],
  ["info", Info, InfoTab],
  ["reader", BookOpenText, ReaderTab],
  ["share", QrCode, ShareTab],
  ["leads", Users, LeadsTab],
  ["stats", BarChart3, StatsTab],
  ["addons", Puzzle, AddonsTab],
];
const GROUPS = [
  ["build", ["books", "categories"]],
  ["look", ["library", "info", "reader"]],
  ["share", ["share"]],
  ["grow", ["leads", "stats"]],
  [null, ["addons"]],
];
const NEEDS = { stats: "fb_stats" };

// Flip Book: upload PDFs, they become flip books on a public library
export default function FlipBookDashboard() {
  const { id } = useParams();
  const { m, lang } = useFbText();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "books";
  const [data, setData] = useState(() => memo.get(`fb:${id}`) || null);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(null); // { addon } | { shelf } | { reader } | { password: book }
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);
  const reload = useCallback(
    () =>
      Promise.all([flipbookService.get(id), flipbookService.books(id), flipbookService.categories(id)])
        .then(([o, b, c]) => {
          const next = { ...o.data, books: b.data, room: b.room || o.data.room, categories: c.data };
          memo.set(`fb:${id}`, next);
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
  const go = (key) => {
    setParams(key === "books" ? {} : { tab: key }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const ctx = useMemo(() => {
    if (!data) return null;
    const put = (patch) =>
      setData((d) => {
        const next = { ...d, ...(typeof patch === "function" ? patch(d) : patch) };
        memo.set(`fb:${id}`, next);
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

  const s = data.settings;
  const url = shelfUrl(s.slug);
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
            data-testid={`fb-tab-${key}`}
          >
            <Icon size={17} />
            <span className="rs-nav-text">{m.tabs[key]}</span>
            {key === "books" && <small className={`rs-nav-count ${data.room.books >= data.room.book_capacity ? "mq-full" : ""}`}>{`${data.room.books}/${data.room.book_capacity}`}</small>}
            {locked && <Lock size={13} className="rs-nav-lock" />}
          </button>
        );
      })}
    </div>
  ));

  // what the purchase box sells
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
  } else if (buying?.shelf) {
    const price = isLive(buying.shelf) ? data.prices.fb_shelf_live : data.prices.fb_shelf_theme;
    const name = m.designName.replace("{name}", shelfName(buying.shelf, lang));
    sell = {
      icon: Palette,
      name,
      title: name,
      sub: m.designWhat,
      perks: [`${m.oneTime} · ${m.forever}`],
      price,
      label: m.buy.replace("{coins}", fmt(price)),
      buy: () => flipbookService.buyShelf(id, buying.shelf),
      done: m.unlockDone.replace("{name}", name),
    };
  } else if (buying?.reader) {
    const price = data.prices.fb_reader_theme;
    const name = m.readerName.replace("{name}", readerName(buying.reader, lang));
    sell = {
      icon: BookOpenText,
      name,
      title: name,
      sub: m.readerWhat,
      perks: [`${m.oneTime} · ${m.forever}`],
      price,
      label: m.buy.replace("{coins}", fmt(price)),
      buy: () => flipbookService.buyReader(id, buying.reader),
      done: m.unlockDone.replace("{name}", name),
    };
  } else if (buying?.password) {
    const price = data.prices.fb_password;
    sell = {
      icon: Lock,
      name: m.pwName,
      title: `${m.pwName} · ${buying.password.title}`,
      sub: m.pwWhat,
      perks: [`${m.oneTime} · ${m.forever}`, m.pwNote],
      price,
      label: m.buy.replace("{coins}", fmt(price)),
      buy: () => flipbookService.unlockPassword(id, buying.password._id),
      done: m.unlockDone.replace("{name}", m.pwName),
    };
  }
  const BuyIcon = sell?.icon;

  return (
    <div className="md-page rs-page mq-page fb-page">
      {notice}
      <div className="rs-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="rs-head">
          <span className="rs-logo">{s.logo?.url ? <img src={s.logo.url} alt="" /> : <BookOpen size={26} />}</span>
          <div className="rs-head-text">
            <h2>{data.business.name}</h2>
            <div className="rs-head-meta">
              <span className="rs-chip">Flip Book PDF</span>
              <span className="rs-chip">
                <BookOpen size={13} /> {m.room.replace("{n}", data.room.books).replace("{max}", data.room.book_capacity)}
              </span>
              <span className="rs-chip">
                <FolderOpen size={13} /> {fmt(data.categories.length)}
              </span>
            </div>
          </div>
          <div className="mq-head-acts">
            <a className="md-btn md-btn-ghost sa-btn-sm" href={url} target="_blank" rel="noreferrer" data-testid="fb-open">
              <ExternalLink size={14} /> {m.openLibrary}
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
          </div>
        </div>
      </div>
      {!data.business.status && <div className="md-notice md-notice-error">{m.suspended}</div>}
      <div className="rs-body">
        <nav className="rs-nav" aria-label="Flip Book">
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
          badge="Flip Book PDF"
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
