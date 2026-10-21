import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BellRing, Building2, CheckCheck, ChevronDown, FileDown, FileSpreadsheet, Folders, HardDrive, Images, Link2, Mic, Palette, Puzzle, Signature, StickyNote, Type, X } from "lucide-react";
import "../../admin/master_data/masterdata.css";
import "../../super_admin/super-admin.css";
import "../restaurant/restaurant.css";
import "../menuqr/menuqr.css";
import "../qrgen/qrgen.css";
import "../website/website.css";
import "./note.css";
import { licenseService, myBusinessService, noteApi } from "../../../api/services";
import { useNotice } from "../../super_admin/parts";
import { BusinessSkeleton, TabSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import MyBusinesses from "../../../components/MyBusinesses";
import { memo } from "../../../lib/memo";
import { NotesTab } from "./NoteList";
import { bytes, fmt, fmtDate, useNoteText } from "./text";
import { StylePackStage, ThemeMini } from "./NoteLook";
import { LinkStage } from "./LinkField";
import { themeName } from "../../../note/themes";
import { V4Stage } from "./NoteV4";

const LOAD = { editor: () => import("./NoteEditor"), more: () => import("./NoteMore"), addons: () => import("./NoteAddons"), groups: () => import("./NoteGroups"), media: () => import("./NoteMedia"), v4: () => import("./NoteV4") };
const NoteEditor = lazy(LOAD.editor);
const StorageTab = lazy(() => LOAD.more().then((x) => ({ default: x.StorageTab })));
const ProfileTab = lazy(() => LOAD.more().then((x) => ({ default: x.ProfileTab })));
const MediaTab = lazy(() => LOAD.media().then((x) => ({ default: x.MediaTab })));
const AddonsTab = lazy(() => LOAD.addons().then((x) => ({ default: x.AddonsTab })));
const GroupsTab = lazy(() => LOAD.groups().then((x) => ({ default: x.GroupsTab })));
const AlertsTab = lazy(() => LOAD.v4().then((x) => ({ default: x.AlertsTab })));
// the v4 add-ons: unlock-window picture + words (keys of the text) + the icon
const V4_SELL = { note_telegram: ["tg", BellRing], note_ack: ["ack", CheckCheck], note_form: ["fx", FileSpreadsheet], note_voice: ["voice", Mic], note_pdf: ["pdf", FileDown] };
const GB5 = 5 * 1073741824;

const TABS = [
  ["notes", StickyNote, NotesTab],
  ["groups", Folders, GroupsTab],
  ["storage", HardDrive, StorageTab],
  ["media", Images, MediaTab],
  ["alerts", BellRing, AlertsTab],
  ["profile", Building2, ProfileTab],
  ["addons", Puzzle, AddonsTab],
];
// Add-ons last, on its own at the bottom of the menu (like every other business)
const GROUPS = [
  ["notes", ["notes", "groups"]],
  ["more", ["storage", "media", "alerts", "profile"]],
  [null, ["addons"]],
];

// Digital Note: notes that can be shared by link / QR (view, write below, edit together, sign-up list)
export default function NoteDashboard() {
  const { id } = useParams();
  const { m, lang } = useNoteText();
  const [params, setParams] = useSearchParams();
  const current = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "notes";
  const openNote = current === "notes" ? params.get("note") || "" : "";
  const [data, setData] = useState(() => memo.get(`note:${id}`) || null);
  const [business, setBusiness] = useState(() => (memo.get("myBusinesses") || []).find((b) => b._id === id) || null);
  const [prices, setPrices] = useState(() => memo.get("bizPrices") || null);
  const [error, setError] = useState("");
  // what the coin window sells: "digital_note" | "note_sign" | "note_storage" (1 pack) | { kind: "packs", n } | { kind: "pack", item, no, expires_at } (renew) | { kind: "group", name, color, onMade, key }
  const [buying, setBuying] = useState(null);
  // one random key per purchase dialog: a double click or a retry of the same "buy N packs" never pays twice
  const buyKey = useMemo(() => {
    try {
      return crypto.randomUUID().replace(/-/g, "");
    } catch {
      return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    }
  }, [buying]);
  const [notice, setNotice] = useNotice();
  const [navOpen, setNavOpen] = useState(false);
  const api = useMemo(() => noteApi({ id }), [id]);

  const reload = useCallback(
    () =>
      api
        .get()
        .then((r) => {
          memo.set(`note:${id}`, r.data);
          setData(r.data);
          setError("");
        })
        .catch((e) => setError(e.message || m.loadFail)),
    [api, id, m.loadFail],
  );
  useEffect(() => {
    reload();
    const t = setTimeout(() => Object.values(LOAD).forEach((l) => l().catch(() => {})), 400);
    return () => clearTimeout(t);
  }, [reload]);
  // the business name + status, and the yearly price (for "Renew")
  useEffect(() => {
    if (!business)
      myBusinessService
        .list()
        .then((r) => {
          memo.set("myBusinesses", r.data || []);
          setBusiness((r.data || []).find((b) => b._id === id) || null);
        })
        .catch(() => {});
    if (!prices)
      myBusinessService
        .prices()
        .then((r) => {
          memo.set("bizPrices", r.data || {});
          setPrices(r.data || {});
        })
        .catch(() => {});
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = useCallback(
    (key, extra = {}) => {
      const next = { ...(key === "notes" ? {} : { tab: key }), ...extra };
      setParams(next, { replace: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setParams],
  );
  const ctx = useMemo(() => {
    if (!data) return null;
    const put = (patch) =>
      setData((d) => {
        const next = { ...d, ...(typeof patch === "function" ? patch(d) : patch) };
        memo.set(`note:${id}`, next);
        return next;
      });
    const lic = data.license || {};
    return {
      id,
      m,
      lang,
      api,
      data,
      put,
      reload,
      notify: setNotice,
      askBuy: (x) => setBuying(x === "note_storage" ? { kind: "packs", n: 1 } : x),
      // the add-ons this business owns (Style pack, Media manager, page themes, group pictures)
      owns: {
        style: !!data.addons?.note_style?.active,
        media: !!data.addons?.note_media?.active,
        sign: !!data.addons?.note_sign?.active,
        link: !!(data.link?.owned || data.addons?.note_link?.active),
        themes: new Set(data.themes?.owned || []),
        telegram: !!data.addons?.note_telegram?.active,
        ack: !!data.addons?.note_ack?.active,
        form: !!data.addons?.note_form?.active,
        voice: !!data.addons?.note_voice?.active,
        pdf: !!data.addons?.note_pdf?.active,
        groupIcons: new Set((data.addons?.note_group_icon?.items || []).map(String)),
      },
      go,
      business,
      suspended: business ? business.status === false : false,
      readOnly: !!lic.read_only || (business ? business.status === false : false),
      // a write refused because the year ended → show the renew dialog
      onError: (e) => {
        const code = e?.response?.code;
        // a locked add-on: open its unlock window instead of only showing the message
        if (code === "need_style") return setBuying("note_style");
        if (code === "need_media") return setBuying("note_media");
        if (code === "need_link") return setBuying("note_link");
        if (code === "need_sign") return setBuying("note_sign");
        if (code === "need_telegram") return setBuying("note_telegram");
        if (code === "need_ack") return setBuying("note_ack");
        if (code === "need_form") return setBuying("note_form");
        if (code === "need_voice") return setBuying("note_voice");
        if (code === "need_pdf") return setBuying("note_pdf");
        if (code === "need_theme" && e.response?.item) return setBuying({ kind: "theme", key: e.response.item });
        if ((e?.status === 402 && code !== "coins") || code === "locked") {
          reload();
          setBuying("digital_note");
        }
        setNotice({ type: "error", text: e?.message || m.loadFail });
      },
      prices: {
        digital_note: data.prices?.digital_note ?? prices?.digital_note ?? 10,
        note_storage: data.prices?.note_storage ?? prices?.note_storage ?? 15,
        note_group: data.prices?.note_group ?? prices?.note_group ?? 1,
        note_sign: data.prices?.note_sign ?? prices?.note_sign ?? 5,
        note_style: data.prices?.note_style ?? prices?.note_style ?? 5,
        note_media: data.prices?.note_media ?? prices?.note_media ?? 8,
        note_group_icon: data.prices?.note_group_icon ?? prices?.note_group_icon ?? 2,
        note_theme: data.themes?.price ?? data.prices?.note_theme ?? prices?.note_theme ?? 3,
        note_link: data.link?.price ?? data.prices?.note_link ?? prices?.note_link ?? 10,
        note_telegram: data.prices?.note_telegram ?? prices?.note_telegram ?? 10,
        note_ack: data.prices?.note_ack ?? prices?.note_ack ?? 5,
        note_form: data.prices?.note_form ?? prices?.note_form ?? 5,
        note_voice: data.prices?.note_voice ?? prices?.note_voice ?? 5,
        note_pdf: data.prices?.note_pdf ?? prices?.note_pdf ?? 5,
      },
    };
  }, [data, id, m, lang, api, reload, setNotice, go, business, prices]);

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

  const [, CurrentIcon, Current] = TABS.find(([k]) => k === current);
  const lic = data.license || {};
  const navList = GROUPS.map(([group, keys], gi) => (
    <div key={gi} className="rs-nav-group">
      {group && <span className="rs-nav-label">{m.groups[group]}</span>}
      {keys.map((key) => {
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
            data-testid={`nt-tab-${key}`}
          >
            <Icon size={17} />
            <span className="rs-nav-text">{m.tabs[key]}</span>
            {key === "notes" && <small className="rs-nav-count">{fmt(data.counts?.notes)}</small>}
            {key === "notes" && data.counts?.entries_new > 0 && <span className="rs-badge">{data.counts.entries_new}</span>}
          </button>
        );
      })}
    </div>
  ));

  let sell = null;
  if (buying) {
    const P = ctx.prices;
    // a few packs may go through before the coins run out: show them, then let the window say "not enough"
    const partly = (e) => {
      if (e?.status === 402 && e.response?.data?.bought?.length) reload();
      throw e;
    };
    if (buying === "digital_note")
      sell = {
        icon: StickyNote,
        name: m.plan,
        title: m.unlockTitle.replace("{name}", m.plan),
        sub: m.notesSub,
        perks: [...m.planPerks, `${fmt(P.digital_note)} ${m.coins} ${m.perYear}`],
        price: P.digital_note,
        buy: () => licenseService.buy(id, "digital_note", lic.expires_at ?? null),
      };
    else if (buying === "note_sign")
      sell = {
        icon: Signature,
        name: m.signCard,
        title: m.signTitle,
        sub: m.signSub,
        perks: m.signPerks,
        price: P.note_sign,
        buy: () => licenseService.buy(id, "note_sign", null),
      };
    else if (typeof buying === "string" && V4_SELL[buying]) {
      const [k, Icon] = V4_SELL[buying];
      const yearly = buying === "note_telegram";
      sell = {
        icon: Icon,
        name: m[`${k}Card`],
        title: m[`${k}BuyTitle`],
        sub: m[`${k}BuySub`],
        perks: [...m[`${k}Perks`], yearly ? `${fmt(P[buying])} ${m.coins} ${m.perYear}` : m.oneTimeForever],
        price: P[buying],
        stage: <V4Stage kind={buying} m={m} />,
        buy: () => licenseService.buy(id, buying, yearly ? (data.addons?.note_telegram?.expires_at ?? null) : null),
      };
    } else if (buying.kind === "packs") {
      const n = Math.max(1, Math.min(20, buying.n || 1));
      const name = `+${n * 5} GB`;
      sell = {
        icon: HardDrive,
        name,
        title: m.packsBuyTitle.replace("{gb}", n * 5),
        sub: m.packsBuySub.replace("{n}", n).replace("{total}", bytes((data.book?.storage_limit || GB5) + n * GB5)),
        perks: m.packsBuyPerks,
        price: n * P.note_storage,
        buy: () => api.buyStorage(n, buyKey).catch(partly),
      };
    } else if (buying.kind === "pack") {
      const name = m.packLine.replace("{n}", buying.no);
      sell = {
        icon: HardDrive,
        name,
        title: m.packRenewTitle.replace("{n}", buying.no),
        sub: m.moreStorageSub,
        perks: m.storagePerks,
        price: P.note_storage,
        buy: () => api.renewStorage(buying.item, buying.expires_at ?? null),
      };
    } else if (buying === "note_style")
      sell = {
        icon: Type,
        name: m.styleCard,
        title: m.styleTitle,
        sub: m.styleSub,
        perks: m.stylePerks,
        price: P.note_style,
        stage: <StylePackStage m={m} />,
        buy: () => licenseService.buy(id, "note_style", null),
      };
    else if (buying === "note_media")
      sell = {
        icon: Images,
        name: m.mediaCard,
        title: m.mediaTitle,
        sub: m.mediaSub,
        perks: m.mediaPerks,
        price: P.note_media,
        buy: () => licenseService.buy(id, "note_media", null),
      };
    else if (buying === "note_link")
      sell = {
        icon: Link2,
        name: m.linkCard,
        title: m.linkTitle,
        sub: m.linkSub,
        perks: m.linkPerks,
        price: P.note_link,
        stage: <LinkStage m={m} name={data.business?.name || business?.name || ""} />,
        buy: () => api.unlockLink(),
      };
    else if (buying.kind === "groupIcon")
      sell = {
        icon: Folders,
        name: buying.name,
        title: m.groupIconTitle.replace("{name}", buying.name),
        sub: m.groupIconSub,
        perks: m.groupIconPerks,
        price: P.note_group_icon,
        buy: () => api.unlockGroupIcon(buying.gid),
        after: (r) => buying.onDone?.(r),
      };
    else if (buying.kind === "theme")
      sell = {
        icon: Palette,
        name: themeName(buying.key, lang),
        title: m.themeUnlockTitle.replace("{name}", themeName(buying.key, lang)),
        sub: m.themeUnlockSub,
        perks: m.themePerks,
        price: P.note_theme,
        stage: buying.preview || <ThemeMini theme={{ key: buying.key, color: buying.color || "" }} m={m} big />,
        buy: () => api.unlockTheme(buying.key),
        after: (r) => buying.onDone?.(r),
      };
    else if (buying.kind === "group")
      sell = {
        icon: Folders,
        name: buying.name,
        title: m.groupBuyTitle.replace("{name}", buying.name),
        sub: m.groupBuySub,
        perks: m.groupPerks,
        price: P.note_group,
        buy: () => api.createGroup({ name: buying.name, color: buying.color, key: buying.key }),
        after: (r) => buying.onMade?.(r?.data || null),
      };
    if (sell) {
      sell.label = m.buy.replace("{coins}", fmt(sell.price));
      sell.done = m.unlockDone.replace("{name}", sell.name);
    }
  }
  const BuyIcon = sell?.icon;
  const name = data.business?.name || business?.name || m.badge;
  const logoUrl = data.business?.logo_url || business?.logo_url || "";

  return (
    <div className="md-page rs-page mq-page qg-page ws-page nt-page">
      {notice}
      <div className="rs-top">
        <Link to="/app/businesses" className="sa-link">
          <ArrowLeft size={14} /> <MyBusinesses />
        </Link>
        <div className="rs-head">
          <span className={`rs-logo nt-logo ${logoUrl ? "has-img" : ""}`}>{logoUrl ? <img src={logoUrl} alt="" /> : <StickyNote size={26} />}</span>
          <div className="rs-head-text">
            <h2>{name}</h2>
            <div className="rs-head-meta">
              <span className="rs-chip">{m.badge}</span>
              {lic.expires_at && <span className={`rs-chip nt-chip-${lic.active ? "ok" : "end"}`}>{(lic.active ? m.planActive : m.planEnded).replace("{date}", fmtDate(lic.expires_at, lang))}</span>}
            </div>
          </div>
        </div>
      </div>
      {ctx.suspended && <div className="md-notice md-notice-error">{m.suspended}</div>}
      {!ctx.suspended && (lic.read_only || lic.in_grace) && (
        <div className={`md-notice ${lic.read_only ? "md-notice-error" : "nt-notice-warn"} nt-lockbar`}>
          <span>{m.locked}</span>
          <button type="button" className="md-btn md-btn-primary" onClick={() => setBuying("digital_note")}>
            {m.renewNow.replace("{coins}", fmt(ctx.prices.digital_note))}
          </button>
        </div>
      )}
      <div className={`rs-body ${openNote ? "nt-wide" : ""}`}>
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
          <Suspense fallback={<TabSkeleton />}>{openNote ? <NoteEditor ctx={ctx} nid={openNote} key={openNote} /> : <Current ctx={ctx} key={current} />}</Suspense>
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
            sell.stage || (
              <div className="rs-stage">
                <BuyIcon size={64} />
                <b>{sell.name}</b>
                <small>{name}</small>
              </div>
            )
          }
          badge={m.badge}
          title={sell.title}
          sub={sell.sub}
          perks={sell.perks}
          price={sell.price}
          buyLabel={sell.label}
          buy={sell.buy}
          doneSub={sell.done}
          onDone={(r) => {
            reload();
            sell.after?.(r);
          }}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}
