import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Building,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  CircleHelp,
  Clock,
  Coffee,
  Columns2,
  Copy,
  Eye,
  EyeOff,
  FilePlus2,
  GraduationCap,
  Handshake,
  Hash,
  House,
  ImageIcon,
  Images,
  LayoutGrid,
  Loader2,
  Lock,
  MailOpen,
  MapPinned,
  Megaphone,
  MessageSquareQuote,
  Monitor,
  MousePointerClick,
  Newspaper,
  PanelTop,
  Pencil,
  Play,
  Plus,
  Scissors,
  SeparatorHorizontal,
  Settings2,
  Share2,
  ShoppingBag,
  Smartphone,
  Stethoscope,
  Ticket,
  Timer,
  Trash2,
  Type,
  UserRound,
  UsersRound,
} from "lucide-react";
import { websiteService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import SiteView from "../../../wsite/SiteView";
import { BLOCK_GROUPS, BLOCK_NAMES, BLOCKS, GROUP_NAMES, newBlock, tx } from "../../../wsite/blocks";
import { WS_THEMES } from "../../../wsite/themes";
import { Confirm, Fields, TrInput } from "./WsFields";
import { fmt } from "./text";

export const BLOCK_ICON = {
  hero: PanelTop,
  text: Type,
  split: Columns2,
  image: ImageIcon,
  gallery: Images,
  video: Play,
  services: LayoutGrid,
  prices: CircleDollarSign,
  team: UsersRound,
  quotes: MessageSquareQuote,
  faq: CircleHelp,
  hours: Clock,
  map: MapPinned,
  contact: MailOpen,
  buttons: MousePointerClick,
  social: Share2,
  countdown: Timer,
  numbers: Hash,
  logos: Building,
  cta: Megaphone,
  spacer: SeparatorHorizontal,
  posts: Newspaper,
};
const TEMPLATE_ICON = { cafe: Coffee, shop: ShoppingBag, salon: Scissors, school: GraduationCap, clinic: Stethoscope, ngo: Handshake, event: Ticket, personal: UserRound };
const THIRD = {
  cafe: ["Menu", "ម៉ឺនុយ"],
  shop: ["Products", "ផលិតផល"],
  salon: ["Services", "សេវាកម្ម"],
  school: ["Courses", "វគ្គសិក្សា"],
  clinic: ["Services", "សេវាកម្ម"],
  ngo: ["Our work", "ការងាររបស់យើង"],
  event: ["Programme", "កម្មវិធី"],
  personal: ["Work", "ស្នាដៃ"],
};

// a block's first text, to name it in the list
function summary(b, lang) {
  const d = b.data || {};
  for (const k of ["title", "caption", "body", "sub"]) {
    const s = tx(d[k], lang);
    if (s) return s.length > 60 ? `${s.slice(0, 60)}…` : s;
  }
  const first = (d.items || d.people || d.images || d.rows || [])[0];
  if (first) return tx(first.title || first.name || first.label || first.q || first.day, lang) || "";
  return "";
}

// ---------------------------------------- starters ----------------------------------------
export function TemplatePicker({ ctx, onDone, replace }) {
  const { id, m, lang, data, notify, readOnly } = ctx;
  const [busy, setBusy] = useState("");
  const [ask, setAsk] = useState(null);
  const use = async (key) => {
    setBusy(key);
    try {
      const r = await websiteService.template(id, key);
      ctx.put(r.data);
      notify({ type: "success", text: m.saved });
      onDone?.();
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="wse-start">
      <div className="wse-start-head">
        <h2>{m.startTitle}</h2>
        <p className="rs-muted">{m.startSub}</p>
      </div>
      <div className="wse-templates">
        {data.templates.map((t) => {
          const Icon = TEMPLATE_ICON[t.key] || LayoutGrid;
          const th = WS_THEMES[t.theme] || WS_THEMES.clean;
          return (
            <article key={t.key} className="panel-card wse-template" style={{ "--tc": th.c, "--tc2": th.c2, "--tbg": th.bg }} data-testid={`ws-tpl-${t.key}`}>
              <div className="wse-template-art" aria-hidden="true">
                <span className="bar" />
                <span className="hero">
                  <Icon size={28} />
                </span>
                <span className="cards">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <b>{lang === "km" ? t.km : t.en}</b>
              <small className="rs-muted">{m.starterPages.replace("{third}", (THIRD[t.key] || THIRD.shop)[lang === "km" ? 1 : 0])}</small>
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" disabled={!!busy || readOnly} onClick={() => (replace ? setAsk(t) : use(t.key))} data-testid={`ws-tpl-use-${t.key}`}>
                {busy === t.key ? <Loader2 size={14} className="md-spin" /> : <Check size={14} />} {m.startUse}
              </button>
            </article>
          );
        })}
      </div>
      {ask && <Confirm m={m} title={m.replaceTitle} sub={m.replaceSub.replace("{name}", lang === "km" ? ask.km : ask.en)} yes={m.replaceYes} onYes={() => use(ask.key)} onClose={() => setAsk(null)} />}
    </div>
  );
}

// ---------------------------------------- page settings ----------------------------------------
function PageModal({ ctx, page, onClose, onSaved }) {
  const { id, m, notify } = ctx;
  const isNew = !page;
  const [title, setTitle] = useState(page?.title || { km: "", en: "" });
  const [slug, setSlug] = useState(page?.slug || "");
  const [menu, setMenu] = useState(page ? page.menu : true);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const r = isNew ? await websiteService.addPage(id, { title }) : await websiteService.savePage(id, page._id, { title, menu, ...(page.home ? {} : { slug }) });
      onSaved(r.data, isNew);
      onClose();
    } catch (e) {
      if (e.status === 402 && e.response?.product) ctx.askBuy({ addon: e.response.product });
      else notify({ type: "error", text: e.message });
      setBusy(false);
    }
  };
  return (
    <Modal
      title={isNew ? m.addPage : m.pageSettings}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || (!title.km.trim() && !title.en.trim())} data-testid="ws-page-save">
            {busy && <Loader2 size={15} className="md-spin" />} {m.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <TrInput value={title} onChange={setTitle} elang="km" label={m.pageTitle} max={60} m={m} testid="ws-page-km" />
        <TrInput value={title} onChange={setTitle} elang="en" label={m.pageTitle} max={60} m={m} testid="ws-page-en" />
        {!isNew && !page.home && (
          <>
            <label className="ws-field">
              <span className="ws-field-label">{m.pageLink}</span>
              <div className="wse-slug">
                <span>/site/{ctx.data.site.slug}/</span>
                <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} maxLength={40} />
              </div>
            </label>
            <label className="md-switch">
              <input type="checkbox" checked={menu} onChange={(e) => setMenu(e.target.checked)} />
              <span className="md-switch-track" />
              <span>{m.inMenu}</span>
            </label>
          </>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------- the editor ----------------------------------------
export default function WsEditor({ ctx }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const pages = data.pages;
  const [pid, setPid] = useState(() => (ctx.params.get("page") && pages.some((p) => p._id === ctx.params.get("page")) ? ctx.params.get("page") : pages.find((p) => p.home)?._id || pages[0]?._id));
  const page = pages.find((p) => p._id === pid) || pages[0];
  const [blocks, setBlocks] = useState(page?.blocks || []);
  const [sel, setSel] = useState(null); // selected block id
  const [panel, setPanel] = useState("list"); // list | block | add
  const [elang, setElang] = useState(data.site.langs?.[0] || "km");
  const [device, setDevice] = useState(() => (typeof window !== "undefined" && window.innerWidth < 1200 ? "phone" : "computer"));
  const [mobileView, setMobileView] = useState("edit");
  const [state, setState] = useState(""); // "" | saving | saved
  const [pageModal, setPageModal] = useState(null); // "new" | page
  const [ask, setAsk] = useState(null);
  const timer = useRef(null);
  const pending = useRef(null);
  const formRef = useRef(null);
  // the computer preview is drawn 1280 px wide and scaled down to fit
  const frameRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setZoom(Math.min(1, e.contentRect.width / (device === "phone" ? 390 : 1280))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [device, pages.length]);

  useEffect(() => {
    setBlocks(page?.blocks || []);
    setSel(null);
    setPanel("list");
  }, [page?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // save the draft a moment after the last change (and before Publish)
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    setState("saving");
    try {
      const r = await websiteService.savePage(id, job.pid, { blocks: job.blocks });
      ctx.put((d) => ({ pages: d.pages.map((p) => (p._id === job.pid ? { ...p, blocks: r.data.blocks } : p)), site: { ...d.site, changed_at: r.changed_at || new Date().toISOString() } }));
      setState("saved");
    } catch (e) {
      setState("");
      notify({ type: "error", text: e.message });
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    ctx.flushRef.current = flush;
    return () => {
      ctx.flushRef.current = null;
      flush();
    };
  }, [flush]); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (next) => {
    setBlocks(next);
    if (readOnly) return;
    pending.current = { pid: page._id, blocks: next };
    setState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  };
  const setBlock = (bid, patch) => change(blocks.map((b) => (b.id === bid ? { ...b, ...patch } : b)));
  const move = (i, d) => {
    const n = [...blocks];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    change(n);
  };
  const addBlock = (type) => {
    const b = newBlock(type);
    const at = sel ? blocks.findIndex((x) => x.id === sel) + 1 : blocks.length;
    const n = [...blocks];
    n.splice(at < 1 ? blocks.length : at, 0, b);
    change(n);
    setSel(b.id);
    setPanel("block");
    setTimeout(() => document.getElementById(b.id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };
  const pick = (bid) => {
    setSel(bid);
    setPanel("block");
    setMobileView("edit");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  // page actions
  const switchPage = async (next) => {
    await flush();
    setPid(next);
    ctx.setParams({ tab: "pages", page: next }, { replace: true });
  };
  const savedPage = (p, isNew) => {
    ctx.put((d) => ({ pages: isNew ? [...d.pages, p] : d.pages.map((x) => (x._id === p._id ? { ...x, ...p, blocks: x._id === page._id ? blocks : p.blocks } : x)), site: { ...d.site, changed_at: new Date().toISOString() } }));
    if (isNew) switchPage(p._id);
  };
  const pageAct = async (fn, after) => {
    try {
      await flush();
      const r = await fn();
      after?.(r);
    } catch (e) {
      if (e.status === 402 && e.response?.product) ctx.askBuy({ addon: e.response.product });
      else notify({ type: "error", text: e.message });
    }
  };

  const reorder = (i, d) => {
    const ids = pages.map((x) => x._id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    pageAct(
      () => websiteService.orderPages(id, ids),
      (r) => ctx.put({ pages: r.data.map((x) => (x._id === page._id ? { ...x, blocks } : x)) }),
    );
  };
  // preview links switch pages inside the editor
  const nav = useCallback(
    (to) => {
      const s = String(to || "");
      const go = (fn) => ({
        href: "#",
        onClick: (e) => {
          e.preventDefault();
          fn();
        },
      });
      if (s.startsWith("page:")) {
        const target = pages.find((p) => p.slug === s.slice(5));
        return go(() => target && switchPage(target._id));
      }
      if (/^https?:\/\//.test(s)) return { href: s, target: "_blank", rel: "noopener noreferrer" };
      return go(() => {});
    },
    [pages], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const previewPages = useMemo(() => pages.map((p) => (p._id === page?._id ? { ...p, blocks } : p)), [pages, page?._id, blocks]);
  const selected = blocks.find((b) => b.id === sel);
  const SelIcon = selected ? BLOCK_ICON[selected.type] : null;

  if (!pages.length) return <TemplatePicker ctx={ctx} />;

  const listPanel = (
    <>
      <div className="wse-pages">
        <div className="wse-pages-head">
          <b>{m.pages}</b>
          <small className="rs-muted">{m.pagesUsed.replace("{n}", pages.length).replace("{max}", data.limits.pages)}</small>
          <button
            type="button"
            className="md-btn md-btn-ghost sa-btn-sm"
            onClick={() => (pages.length >= data.limits.pages && !ctx.on("web_pages") ? ctx.askBuy({ addon: "web_pages" }) : setPageModal("new"))}
            disabled={readOnly}
            data-testid="ws-add-page"
          >
            {pages.length >= data.limits.pages && !ctx.on("web_pages") ? <Lock size={14} /> : <FilePlus2 size={14} />} {m.addPage}
          </button>
        </div>
        <div className="wse-page-list" role="tablist">
          {pages.map((p, i) => (
            <div key={p._id} className={`wse-page ${p._id === page._id ? "on" : ""}`}>
              <button type="button" className="wse-page-name" onClick={() => p._id !== page._id && switchPage(p._id)} role="tab" aria-selected={p._id === page._id} data-testid={`ws-page-${p.slug}`}>
                {p.home ? <House size={14} /> : !p.menu ? <EyeOff size={14} /> : <span className="wse-dot" />}
                <span>{tx(p.title, elang) || p.slug}</span>
              </button>
              {p._id === page._id && (
                <span className="wse-page-acts">
                  <button type="button" className="md-icon-btn" disabled={readOnly || i === 0} onClick={() => reorder(i, -1)} aria-label={m.moveUp}>
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" className="md-icon-btn" disabled={readOnly || i === pages.length - 1} onClick={() => reorder(i, 1)} aria-label={m.moveDown}>
                    <ChevronDown size={14} />
                  </button>
                  <button type="button" className="md-icon-btn" disabled={readOnly} onClick={() => setPageModal(p)} aria-label={m.pageSettings} data-testid="ws-page-settings">
                    <Settings2 size={14} />
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="wse-page-more">
          {!page.home && (
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              disabled={readOnly}
              onClick={() =>
                pageAct(
                  () => websiteService.homePage(id, page._id),
                  (r) => ctx.put({ pages: r.data.map((x) => (x._id === page._id ? { ...x, blocks } : x)) }),
                )
              }
            >
              <House size={14} /> {m.makeHome}
            </button>
          )}
          <button
            type="button"
            className="md-btn md-btn-ghost sa-btn-sm"
            disabled={readOnly}
            onClick={() =>
              pageAct(
                () => websiteService.duplicatePage(id, page._id),
                (r) => savedPage(r.data, true),
              )
            }
          >
            <Copy size={14} /> {m.duplicate}
          </button>
          {!page.home && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" disabled={readOnly} onClick={() => setAsk({ kind: "page" })} data-testid="ws-page-delete">
              <Trash2 size={14} /> {m.deletePage}
            </button>
          )}
        </div>
      </div>

      <div className="wse-blocks">
        <div className="wse-blocks-head">
          <b>{m.blocks}</b>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setPanel("add")} disabled={readOnly} data-testid="ws-add-block">
            <Plus size={15} /> {m.addBlock}
          </button>
        </div>
        {!blocks.length && <p className="rs-muted wse-empty">{m.noBlocks}</p>}
        <ol className="wse-block-list">
          {blocks.map((b, i) => {
            const Icon = BLOCK_ICON[b.type] || LayoutGrid;
            return (
              <li key={b.id} className={`wse-block ${b.hidden ? "hidden" : ""} ${sel === b.id ? "sel" : ""}`}>
                <button type="button" className="wse-block-main" onClick={() => pick(b.id)} data-testid={`ws-block-${b.type}`}>
                  <span className="wse-block-ic">
                    <Icon size={17} />
                  </span>
                  <span className="wse-block-text">
                    <b>{(BLOCK_NAMES[lang] || BLOCK_NAMES.en)[b.type]}</b>
                    <small>{b.hidden ? m.hiddenBlock : summary(b, elang)}</small>
                  </span>
                </button>
                <span className="wse-block-acts">
                  <button type="button" className="md-icon-btn" onClick={() => move(i, -1)} disabled={readOnly || i === 0} aria-label={m.moveUp}>
                    <ChevronUp size={15} />
                  </button>
                  <button type="button" className="md-icon-btn" onClick={() => move(i, 1)} disabled={readOnly || i === blocks.length - 1} aria-label={m.moveDown}>
                    <ChevronDown size={15} />
                  </button>
                  <button type="button" className="md-icon-btn" onClick={() => setBlock(b.id, { hidden: !b.hidden })} disabled={readOnly} aria-label={b.hidden ? m.show : m.hide}>
                    {b.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );

  const addPanel = (
    <div className="wse-add">
      <button type="button" className="sa-link wse-back" onClick={() => setPanel(sel ? "block" : "list")}>
        <ArrowLeft size={14} /> {m.backToBlocks}
      </button>
      <h3>{m.addBlock}</h3>
      {BLOCK_GROUPS.map(([g, types]) => (
        <div key={g} className="wse-add-group">
          <small className="rs-muted">{(GROUP_NAMES[lang] || GROUP_NAMES.en)[g]}</small>
          <div className="wse-add-grid">
            {types.map((t) => {
              const Icon = BLOCK_ICON[t];
              const locked = t === "posts" && !ctx.on("web_blog");
              return (
                <button key={t} type="button" onClick={() => addBlock(t)} data-testid={`ws-add-${t}`} title={locked ? m.needsBlog : undefined}>
                  <Icon size={20} />
                  <span>{(BLOCK_NAMES[lang] || BLOCK_NAMES.en)[t]}</span>
                  {locked && <Lock size={12} className="wse-add-lock" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const blockPanel = selected && (
    <div className="wse-form" ref={formRef}>
      <div className="wse-form-head">
        <button type="button" className="sa-link wse-back" onClick={() => setPanel("list")}>
          <ArrowLeft size={14} /> {m.backToBlocks}
        </button>
        <div className="wse-form-title">
          <span className="wse-block-ic">
            <SelIcon size={17} />
          </span>
          <b>{(BLOCK_NAMES[lang] || BLOCK_NAMES.en)[selected.type]}</b>
          <span className="wse-form-acts">
            <button
              type="button"
              className="md-icon-btn"
              disabled={readOnly}
              onClick={() => {
                const copy = { ...structuredClone(selected), id: Math.random().toString(36).slice(2, 10) };
                const i = blocks.findIndex((b) => b.id === selected.id);
                const n = [...blocks];
                n.splice(i + 1, 0, copy);
                change(n);
                setSel(copy.id);
              }}
              aria-label={m.duplicate}
            >
              <Copy size={15} />
            </button>
            <button type="button" className="md-icon-btn" disabled={readOnly} onClick={() => setBlock(selected.id, { hidden: !selected.hidden })} aria-label={selected.hidden ? m.show : m.hide}>
              {selected.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <button type="button" className="md-icon-btn sa-danger-text" disabled={readOnly} onClick={() => setAsk({ kind: "block" })} aria-label={m.deleteBlock} data-testid="ws-block-delete">
              <Trash2 size={15} />
            </button>
          </span>
        </div>
      </div>
      {selected.type === "posts" && !ctx.on("web_blog") && (
        <div className="qg-need">
          <Lock size={15} />
          <span>{m.needsBlog}</span>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "web_blog" })}>
            <CoinIcon size={13} /> {fmt(data.addons.web_blog.price)}
          </button>
        </div>
      )}
      <fieldset className="wse-fields" disabled={readOnly}>
        <Fields fields={BLOCKS[selected.type]} data={selected.data} onChange={(d) => setBlock(selected.id, { data: d })} ctx={ctx} elang={elang} pages={pages} lang={lang} />
      </fieldset>
    </div>
  );

  return (
    <div className={`wse mv-${mobileView}`}>
      <div className="wse-bar">
        <div className="wse-lang" role="group" aria-label={m.editIn} title={m.editInSub}>
          <span>{m.editIn}</span>
          {["km", "en"].map((l) => (
            <button key={l} type="button" className={elang === l ? "on" : ""} onClick={() => setElang(l)} data-testid={`ws-elang-${l}`}>
              {l === "km" ? "ខ្មែរ" : "English"}
            </button>
          ))}
        </div>
        <span className={`wse-state s-${state || "idle"}`} aria-live="polite">
          {state === "saving" ? (
            <>
              <Loader2 size={13} className="md-spin" /> {m.saving}
            </>
          ) : state === "saved" ? (
            <>
              <Check size={13} /> {m.saved}
            </>
          ) : null}
        </span>
        <div className="wse-device" role="group" aria-label={m.preview}>
          <button type="button" className={device === "phone" ? "on" : ""} onClick={() => setDevice("phone")} aria-label={m.phone} title={m.phone} data-testid="ws-dev-phone">
            <Smartphone size={16} />
          </button>
          <button type="button" className={device === "computer" ? "on" : ""} onClick={() => setDevice("computer")} aria-label={m.computer} title={m.computer} data-testid="ws-dev-computer">
            <Monitor size={16} />
          </button>
        </div>
        <div className="wse-mswitch" role="group">
          <button type="button" className={mobileView === "edit" ? "on" : ""} onClick={() => setMobileView("edit")}>
            <Pencil size={14} /> {m.edit}
          </button>
          <button type="button" className={mobileView === "preview" ? "on" : ""} onClick={() => setMobileView("preview")} data-testid="ws-mobile-preview">
            <Eye size={14} /> {m.preview}
          </button>
        </div>
      </div>
      <div className="wse-body">
        <aside className="wse-side panel-card">{panel === "add" ? addPanel : panel === "block" && selected ? blockPanel : listPanel}</aside>
        <div className={`wse-stage d-${device}`}>
          <div className="wse-frame" ref={frameRef}>
            <div className="wse-scroll">
              <div className="wse-zoom" style={{ width: device === "phone" ? 390 : 1280, zoom }}>
                <SiteView
                  site={data.site}
                  pages={previewPages}
                  view={{ kind: "page", slug: page.slug }}
                  lang={elang}
                  setLang={setElang}
                  blog={ctx.on("web_blog")}
                  posts={ctx.data.postsPreview || []}
                  branding={!ctx.on("web_nobrand")}
                  nav={nav}
                  preview
                  picked={sel}
                  onPick={pick}
                />
              </div>
            </div>
          </div>
          <small className="rs-muted wse-tip">{m.tapToEdit}</small>
        </div>
      </div>
      {pageModal && <PageModal ctx={ctx} page={pageModal === "new" ? null : pageModal} onClose={() => setPageModal(null)} onSaved={savedPage} />}
      {ask?.kind === "page" && (
        <Confirm
          m={m}
          title={m.deletePage}
          sub={m.deletePageSub.replace("{name}", tx(page.title, lang) || page.slug)}
          onYes={async () => {
            await flush();
            await websiteService.removePage(id, page._id);
            const rest = pages.filter((p) => p._id !== page._id);
            ctx.put({ pages: rest });
            setPid(rest.find((p) => p.home)?._id || rest[0]?._id);
          }}
          onClose={() => setAsk(null)}
        />
      )}
      {ask?.kind === "block" && selected && (
        <Confirm
          m={m}
          title={m.deleteBlock}
          sub={m.deleteBlockSub}
          onYes={async () => {
            change(blocks.filter((b) => b.id !== selected.id));
            setSel(null);
            setPanel("list");
          }}
          onClose={() => setAsk(null)}
        />
      )}
    </div>
  );
}
