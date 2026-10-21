import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Repeat,
  Hourglass,
  Timer,
  Megaphone,
  Layers,
  Star,
  Handshake,
  Rocket,
  CopyPlus,
  LayoutGrid,
  List,
  Armchair,
  Award,
  QrCode,
  Wallet,
  Clock,
  ChevronDown,
  BarChart3,
  BellRing,
  CalendarClock,
  MessageSquareText,
  Send,
  Tag,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  DoorOpen,
  Download,
  ExternalLink,
  Gift,
  Image as ImageIcon,
  Loader2,
  Lock,
  MapPin,
  Palette,
  Pencil,
  Plus,
  Puzzle,
  ReceiptText,
  RotateCcw,
  Save,
  Search,
  Smartphone,
  Sparkles,
  Store,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { QuestionsBox, SeatsBox, ShowsBox, extrasBody, extrasOf } from "./EvMore";
import SearchSelect from "./SearchSelect";
import { EventGrowBox, OverviewReport, TypeDeals, dealsBody, dealsOf } from "./EvGrow";
import CoinIcon from "../../../components/CoinIcon";
import { EV_LAYOUTS, EV_THEME_KEYS, layoutName, pageVars, themeDefaults, themeName, themeOf } from "../../../evpub/themes";
import { TicketCard, saveTicketImage } from "../../../evpub/TicketCard";
import { useEvPubText } from "../../../evpub/text";
import { PG_LAYOUTS, PG_LIVE, PG_THEME_KEYS, isLive, pageDefaults, pageLayoutName, pageThemeName, pageThemeOf } from "../../../evpub/pageThemes";
import PagePreview from "../../../evpub/PagePreview";
import { doorUrl, eventUrl, ticketUrl, fmt, fmtTime, fmtWhen, fromLocalInput, orderUrl, prettyPhone, toLocalInput, usd } from "./text";

export const ADDON_ICON = { ev_doors: Smartphone, ev_team: Users, ev_cashier: Store, ev_invites: Gift, ev_export: Download, ev_nobrand: Sparkles, ev_telegram: BellRing, ev_guest_tg: Send, ev_seats: Armchair, ev_shows: CalendarClock, ev_promos: Tag, ev_questions: MessageSquareText, ev_autopay: QrCode, ev_certs: Award, ev_waitlist: Hourglass, ev_pricing: Timer, ev_referrals: Megaphone, ev_bundles: Layers, ev_feedback: Star, ev_sponsors: Handshake };

const copy = (text, ctx) => {
  navigator.clipboard?.writeText(text).catch(() => {});
  ctx.notify({ type: "success", text: ctx.x.copied });
};
function Head({ icon: Icon, title, sub, children }) {
  return (
    <div className="ev-head">
      <span className="ev-head-ic">
        <Icon size={20} />
      </span>
      <div>
        <h3>{title}</h3>
        {sub && <small className="rs-muted">{sub}</small>}
      </div>
      {children && <div className="ev-head-acts">{children}</div>}
    </div>
  );
}
const sum = (ev, k) => (ev.types || []).reduce((a, t) => a + (Number(t[k]) || 0), 0);
const errOf = (e) => e?.response?.message || e?.message || "Error";

// ============================================================ Events ============================================================
// when an event is: live now / upcoming / draft / past / cancelled (for the filters and groups)
const DAYMS = 86400000;
const endOf = (e) => new Date(e.ends_at || new Date(e.starts_at).getTime() + 4 * 3600000).getTime();
const phaseOf = (e, now) => (e.status === "cancelled" ? "cancelled" : e.status === "draft" ? "draft" : endOf(e) < now ? "past" : new Date(e.starts_at).getTime() <= now ? "live" : "upcoming");
const EV_VIEW_KEY = "ev-events-view";
const PAGE = 24;
function whenChip(e, now, x) {
  const ph = phaseOf(e, now);
  if (ph === "live") return { cls: "live", text: x.evl.liveNow };
  if (ph === "past") return { cls: "past", text: x.evl.ended };
  if (ph !== "upcoming") return null;
  const d = Math.ceil((new Date(e.starts_at).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / DAYMS);
  return { cls: d <= 7 ? "soon" : "", text: d <= 0 ? x.evl.today : d === 1 ? x.evl.tomorrow : x.evl.inDays.replace("{n}", d) };
}
export function EventsTab({ ctx }) {
  const { x, lang, data, readOnly } = ctx;
  const L = x.evl;
  const [edit, setEdit] = useState(null); // null | {} (new) | event
  const [q, setQ] = useState(() => ctx.params?.get("q") || "");
  const [show, setShow] = useState("all");
  const [sort, setSort] = useState("soon");
  const [kind, setKind] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [busyId, setBusyId] = useState("");
  const dup = async (e) => {
    const days = window.prompt(L.dupAsk, "7");
    if (days === null) return;
    setBusyId(e._id);
    try {
      const r = await ctx.api.duplicate(e._id, { days: Number(days) || 0 });
      await ctx.reload();
      ctx.notify({ type: "success", text: L.dupDone });
      setEdit(r.data);
    } catch (err) {
      ctx.notify({ type: "error", text: errOf(err) });
    } finally {
      setBusyId("");
    }
  };
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(EV_VIEW_KEY) || "grid";
    } catch {
      return "grid";
    }
  });
  const pickView = (v) => {
    setView(v);
    try {
      localStorage.setItem(EV_VIEW_KEY, v);
    } catch {
      /* private mode */
    }
  };
  const now = Date.now();
  const all = data.events;
  const counts = useMemo(() => {
    const c = { all: all.length, upcoming: 0, live: 0, draft: 0, past: 0, cancelled: 0 };
    for (const e of all) c[phaseOf(e, now)] += 1;
    c.active = c.upcoming + c.live;
    return c;
  }, [all]); // eslint-disable-line react-hooks/exhaustive-deps
  const totals = useMemo(() => {
    let tickets = 0,
      money = 0,
      used = 0,
      review = 0;
    for (const e of all) {
      tickets += e.counts?.tickets || 0;
      money += e.counts?.money || 0;
      used += e.counts?.used || 0;
      review += e.counts?.review || 0;
    }
    const next = all.filter((e) => ["upcoming", "live"].includes(phaseOf(e, now))).sort((p, r) => new Date(p.starts_at) - new Date(r.starts_at))[0];
    return { tickets, money, used, review, next };
  }, [all]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const rows = all.filter((e) => {
      const ph = phaseOf(e, now);
      if (show === "active" && !["upcoming", "live"].includes(ph)) return false;
      if (!["all", "active"].includes(show) && ph !== show) return false;
      if (show === "review" && !(e.counts?.review > 0)) return false;
      if (kind && e.kind !== kind) return false;
      if (s && ![e.title, e.venue, e.slug, fmtWhen(e.starts_at, lang)].some((v) => String(v || "").toLowerCase().includes(s))) return false;
      return true;
    });
    const t = (e) => new Date(e.starts_at).getTime();
    const order = { live: 0, upcoming: 1, draft: 2, past: 3, cancelled: 4 };
    const by = {
      soon: (p, r) => order[phaseOf(p, now)] - order[phaseOf(r, now)] || (["past", "cancelled"].includes(phaseOf(p, now)) ? t(r) - t(p) : t(p) - t(r)),
      latest: (p, r) => t(r) - t(p),
      oldest: (p, r) => t(p) - t(r),
      sold: (p, r) => (r.counts?.tickets || 0) - (p.counts?.tickets || 0),
      money: (p, r) => (r.counts?.money || 0) - (p.counts?.money || 0),
      az: (p, r) => p.title.localeCompare(r.title),
    }[sort];
    return rows.sort(by);
  }, [all, q, show, sort, kind, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setLimit(PAGE), [q, show, sort, kind]);
  const filters = [
    ["all", L.f.all, counts.all],
    ["active", L.f.active, counts.active],
    ["live", L.f.live, counts.live],
    ["draft", L.f.draft, counts.draft],
    ["past", L.f.past, counts.past],
    ["cancelled", L.f.cancelled, counts.cancelled],
  ].filter(([k, , n]) => k === "all" || k === "active" || n > 0);
  const sorts = [
    { value: "soon", label: L.s.soon },
    { value: "latest", label: L.s.latest },
    { value: "oldest", label: L.s.oldest },
    { value: "sold", label: L.s.sold },
    { value: "money", label: L.s.money },
    { value: "az", label: L.s.az },
  ];
  const shown = list.slice(0, limit);
  const card = (e) => {
    const qty = sum(e, "qty");
    const c = e.counts || {};
    const chip = whenChip(e, now, x);
    const pct = qty ? Math.min(100, (c.tickets / qty) * 100) : 0;
    const acts = (
      <div className="ev-card-acts">
        <button type="button" className="md-icon-btn" onClick={() => ctx.go("orders", { event: e._id })} aria-label={L.orders} title={L.orders}>
          <ReceiptText size={15} />
        </button>
        <button type="button" className="md-icon-btn" onClick={() => ctx.go("guests", { event: e._id })} aria-label={L.guests} title={L.guests}>
          <UsersRound size={15} />
        </button>
        {e.status !== "draft" && (
          <>
            <a className="md-icon-btn" href={eventUrl(e.slug)} target="_blank" rel="noreferrer" aria-label={x.openPage} title={x.openPage} data-testid="ev-open">
              <ExternalLink size={15} />
            </a>
            <button type="button" className="md-icon-btn" onClick={() => copy(eventUrl(e.slug), ctx)} aria-label={x.copyLink} title={x.copyLink}>
              <Copy size={15} />
            </button>
          </>
        )}
        <button type="button" className="md-icon-btn" onClick={() => dup(e)} disabled={readOnly || busyId === e._id} aria-label={L.duplicate} title={L.duplicate} data-testid="ev-dup">
          {busyId === e._id ? <Loader2 size={15} className="md-spin" /> : <CopyPlus size={15} />}
        </button>
        {e.status === "published" && phaseOf(e, now) !== "past" && (
          <button type="button" className={`md-icon-btn ${e.featured_until ? "ev-feat-on" : ""}`} onClick={() => ctx.askBuy({ feature: e._id })} disabled={readOnly} aria-label={L.feature} title={e.featured_until ? L.featuredTill.replace("{d}", fmtWhen(e.featured_until, lang)) : L.feature} data-testid="ev-feature">
            <Rocket size={15} />
          </button>
        )}
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setEdit(e)} data-testid="ev-edit">
          <Pencil size={14} /> {L.edit}
        </button>
      </div>
    );
    const closed = e.status === "published" && (e.sale !== "open" || phaseOf(e, now) === "past");
    const status = <span className={`ev-status st-${e.status} sale-${closed ? "closed" : e.sale}`}>{closed ? x.saleClosed : x.status[e.status]}</span>;
    if (view === "list")
      return (
        <article key={e._id} className={`panel-card ev-row st-${e.status}`} data-testid="ev-card">
          <button type="button" className="ev-row-pic" onClick={() => setEdit(e)} aria-label={x.editEvent}>
            {e.poster ? <img src={e.poster} alt="" /> : <Ticket size={20} />}
          </button>
          <div className="ev-row-main">
            <b className="ev-card-title">
              <Hl text={e.title} q={q} />
            </b>
            <small className="ev-card-meta">
              <CalendarDays size={12} /> {fmtWhen(e.starts_at, lang)}
              {e.venue && (
                <>
                  {" · "}
                  <MapPin size={12} /> <Hl text={e.venue} q={q} />
                </>
              )}
            </small>
          </div>
          <div className="ev-row-tags">
            {status}
            {chip && <span className={`ev-when ${chip.cls}`}>{chip.text}</span>}
            {e.kind === "free" && <span className="ev-chip-mini">{L.freeEv}</span>}
          </div>
          <div className="ev-row-nums">
            <span>
              <b>{fmt(c.tickets)}</b>/{fmt(qty)}
            </span>
            <span className="ev-bar">
              <i style={{ width: `${pct}%` }} />
            </span>
          </div>
          <b className="ev-row-money">{e.kind !== "free" ? usd(c.money) : "—"}</b>
          {c.review > 0 ? (
            <button type="button" className="ev-wait" onClick={() => ctx.go("orders", { status: "review", event: e._id })}>
              <BellRing size={13} /> {c.review}
            </button>
          ) : (
            <span />
          )}
          {acts}
        </article>
      );
    return (
      <article key={e._id} className={`panel-card ev-card st-${e.status}`} data-testid="ev-card">
        <button type="button" className="ev-card-poster" onClick={() => setEdit(e)} aria-label={x.editEvent}>
          {e.poster ? <img src={e.poster} alt="" /> : <Ticket size={34} />}
          {status}
          {chip && <span className={`ev-when on-pic ${chip.cls}`}>{chip.text}</span>}
          {e.featured_until && (
            <span className="ev-feat-chip">
              <Rocket size={11} /> {L.featured}
            </span>
          )}
        </button>
        <div className="ev-card-body">
          <b className="ev-card-title">
            <Hl text={e.title} q={q} />
          </b>
          <small className="ev-card-meta">
            <CalendarDays size={13} /> {fmtWhen(e.starts_at, lang)}
            {e.kind === "free" && <span className="ev-chip-mini">{L.freeEv}</span>}
          </small>
          {e.venue && (
            <small className="ev-card-meta">
              <MapPin size={13} /> <Hl text={e.venue} q={q} />
            </small>
          )}
          <div className="ev-bar">
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="ev-card-nums">
            <span>{(e.kind === "free" ? x.registered : x.sold).replace("{n}", fmt(c.tickets)).replace("{of}", fmt(qty))}</span>
            <span>{x.checkedIn.replace("{n}", fmt(c.used))}</span>
            {e.kind !== "free" && <b>{usd(c.money)}</b>}
          </div>
          {c.review > 0 && (
            <button type="button" className="ev-wait" onClick={() => ctx.go("orders", { status: "review", event: e._id })}>
              <BellRing size={13} /> {x.waitingN.replace("{n}", c.review)}
            </button>
          )}
          {acts}
        </div>
      </article>
    );
  };
  return (
    <div className="rs-col">
      <Head icon={Ticket} title={x.eventsTitle} sub={x.eventsSub}>
        <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setEdit({})} disabled={readOnly} data-testid="ev-new">
          <Plus size={15} /> {x.newEvent}
        </button>
      </Head>
      {!all.length ? (
        <div className="panel-card ev-empty">
          <Ticket size={34} />
          <p>{x.noEvents}</p>
          <button type="button" className="md-btn md-btn-primary" onClick={() => setEdit({})} disabled={readOnly}>
            <Plus size={15} /> {x.newEvent}
          </button>
        </div>
      ) : (
        <>
          {/* ---------- at a glance ---------- */}
          <div className="ev-glance" data-testid="ev-glance">
            <button type="button" className="ev-gl" onClick={() => setShow("active")}>
              <small>{L.g.active}</small>
              <b>{fmt(counts.active)}</b>
              <span>{counts.live ? L.g.liveN.replace("{n}", counts.live) : L.g.ofAll.replace("{n}", fmt(counts.all))}</span>
            </button>
            <div className="ev-gl">
              <small>{L.g.tickets}</small>
              <b>{fmt(totals.tickets)}</b>
              <span>{L.g.came.replace("{n}", fmt(totals.used))}</span>
            </div>
            <div className="ev-gl">
              <small>{L.g.money}</small>
              <b>{usd(totals.money)}</b>
              <span>{L.g.allEvents}</span>
            </div>
            {totals.next ? (
              <button type="button" className="ev-gl next" onClick={() => setEdit(totals.next)}>
                <small>{L.g.next}</small>
                <b className="ev-gl-title">{totals.next.title}</b>
                <span>
                  {fmtWhen(totals.next.starts_at, lang)} · {whenChip(totals.next, now, x)?.text}
                </span>
              </button>
            ) : (
              <div className="ev-gl">
                <small>{L.g.next}</small>
                <b>—</b>
                <span>{L.g.noNext}</span>
              </div>
            )}
            {totals.review > 0 && (
              <button type="button" className="ev-gl warn" onClick={() => ctx.go("orders", { status: "review" })}>
                <small>{L.g.review}</small>
                <b>{fmt(totals.review)}</b>
                <span>{L.g.check}</span>
              </button>
            )}
          </div>

          {/* ---------- search + filters ---------- */}
          <div className="panel-card ev-evbar">
            <label className="ev-search ev-evsearch">
              <Search size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search} data-testid="ev-search" />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label={x.close}>
                  <X size={14} />
                </button>
              )}
            </label>
            <div className="ev-evbar-right">
              <select className="ev-input ev-sel" value={kind} onChange={(e) => setKind(e.target.value)} aria-label={L.kind}>
                <option value="">{L.kinds.all}</option>
                <option value="paid">{L.kinds.paid}</option>
                <option value="free">{L.kinds.free}</option>
              </select>
              <select className="ev-input ev-sel" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={L.sort} data-testid="ev-sort">
                {sorts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <div className="ev-seg" role="tablist" aria-label={L.view}>
                <button type="button" className={view === "grid" ? "on" : ""} onClick={() => pickView("grid")} aria-label={L.grid} title={L.grid}>
                  <LayoutGrid size={15} />
                </button>
                <button type="button" className={view === "list" ? "on" : ""} onClick={() => pickView("list")} aria-label={L.list} title={L.list} data-testid="ev-view-list">
                  <List size={15} />
                </button>
              </div>
            </div>
            <div className="ev-evchips">
              {filters.map(([k, label, n]) => (
                <button key={k} type="button" className={show === k ? "on" : ""} onClick={() => setShow(k)} data-testid={`ev-f-${k}`}>
                  {label} <em>{fmt(n)}</em>
                </button>
              ))}
            </div>
          </div>

          {!list.length ? (
            <div className="panel-card ev-empty">
              <Search size={28} />
              <p>{L.none}</p>
              <button
                type="button"
                className="md-btn md-btn-ghost sa-btn-sm"
                onClick={() => {
                  setQ("");
                  setShow("all");
                  setKind("");
                }}
              >
                {L.clear}
              </button>
            </div>
          ) : (
            <>
              <small className="rs-muted ev-found">{L.found.replace("{n}", fmt(list.length))}</small>
              <div className={view === "list" ? "ev-rows" : "ev-cards"}>{shown.map(card)}</div>
              {list.length > limit && (
                <button type="button" className="md-btn md-btn-ghost ev-more-btn" onClick={() => setLimit(limit + PAGE)} data-testid="ev-more">
                  <ChevronDown size={15} /> {L.more.replace("{n}", fmt(list.length - limit))}
                </button>
              )}
            </>
          )}
        </>
      )}
      {edit && <EventEditor ctx={ctx} ev={edit._id ? edit : null} onClose={() => setEdit(null)} />}
    </div>
  );
}
// highlight what was searched
function Hl({ text, q }) {
  const s = q.trim();
  const i = s ? String(text).toLowerCase().indexOf(s.toLowerCase()) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="ev-hl">{text.slice(i, i + s.length)}</mark>
      {text.slice(i + s.length)}
    </>
  );
}

const newType = (name = "Standard", price = 10, qty = 100) => ({ key: "", name, price, qty, note: "", active: true });
function EventEditor({ ctx, ev, onClose }) {
  const { x, api, data } = ctx;
  const isNew = !ev;
  const [f, setF] = useState(() => ({
    title: ev?.title || "",
    kind: ev?.kind || "paid",
    starts_at: toLocalInput(ev?.starts_at) || "",
    ends_at: toLocalInput(ev?.ends_at),
    venue: ev?.venue || "",
    map_url: ev?.map_url || "",
    about: ev?.about || "",
    max_per_order: ev?.max_per_order || 10,
    sale_ends_at: toLocalInput(ev?.sale_ends_at),
    terms: ev?.terms || "",
    status: ev?.status || "draft",
    types: ev?.types?.map((t) => ({ key: t.key, name: t.name, price: t.price, qty: t.qty, note: t.note || "", active: t.active !== false, taken: t.taken || 0, ...dealsOf(t) })) || [newType("Standard", 10, 100), newType("VIP", 25, 30)],
    category: ev?.category || "",
    city: ev?.city || "",
    feedback: { on: !!ev?.feedback?.on, question: ev?.feedback?.question || "" },
    ...extrasOf(ev),
    pay_methods: ev?.pay_methods || [],
  }));
  const [poster, setPoster] = useState(ev?.poster || "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const pick = useRef(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setType = (i, patch) => setF((p) => ({ ...p, types: p.types.map((t, k) => (k === i ? { ...t, ...patch } : t)) }));
  const readyMethods = (data.pay_methods || []).filter((p) => p.active && (p.qr || p.link));
  const payMissing = f.kind === "paid" && !(f.pay_methods.length ? readyMethods.filter((p) => f.pay_methods.includes(p.key)) : readyMethods).length;
  const save = async () => {
    if (f.status === "cancelled" && ev?.status !== "cancelled" && !window.confirm(x.evCancelSure)) return;
    setBusy("save");
    setError("");
    try {
      const { shows, seating, questions, ask_names, ...plain } = f; // eslint-disable-line no-unused-vars
      const body = { ...plain, starts_at: fromLocalInput(f.starts_at), ends_at: fromLocalInput(f.ends_at), sale_ends_at: fromLocalInput(f.sale_ends_at), types: f.types.map(({ taken, ...t }) => ({ ...t, price: Number(t.price) || 0, qty: Number(t.qty) || 1, ...dealsBody(ctx, t) })), ...extrasBody(ctx, f) };
      if (!ctx.on("ev_feedback") && !ev?.feedback?.on) delete body.feedback;
      if (isNew) await api.addEvent(body);
      else await api.saveEvent(ev._id, body);
      ctx.notify({ type: "success", text: x.saved });
      await ctx.reload();
      onClose();
    } catch (e) {
      setError(errOf(e));
      setBusy("");
    }
  };
  const remove = async () => {
    if (!window.confirm(x.evDeleteSure)) return;
    setBusy("remove");
    try {
      await api.removeEvent(ev._id);
      await ctx.reload();
      onClose();
    } catch (e) {
      setError(errOf(e));
      setBusy("");
    }
  };
  const upPoster = async (file) => {
    setBusy("poster");
    try {
      const r = await api.poster(ev._id, file);
      setPoster(r.data.poster);
      ctx.reload();
    } catch (e) {
      setError(errOf(e));
    } finally {
      setBusy("");
    }
  };
  return (
    <Modal
      title={isNew ? x.newEvent : x.editEvent}
      onClose={onClose}
      busy={!!busy}
      size="md-modal-lg"
      footer={
        <>
          {!isNew && (
            <button type="button" className="md-btn md-btn-ghost sa-danger-text" style={{ marginRight: "auto" }} onClick={remove} disabled={!!busy}>
              {busy === "remove" ? <Loader2 size={14} className="md-spin" /> : <Trash2 size={14} />} {x.evDelete}
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={!!busy}>
            {x.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={!!busy || !f.title.trim() || !f.starts_at || (f.status === "published" && payMissing)} data-testid="ev-save">
            {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Save size={15} />} {x.save}
          </button>
        </>
      }
    >
      <div className="md-fields ev-editor">
        <label className="md-field">
          <span>{x.evTitle}</span>
          <input value={f.title} maxLength={120} onChange={(e) => set("title", e.target.value)} placeholder={x.evTitlePh} data-testid="ev-title" />
        </label>
        <div className="ev-kinds">
          {["paid", "free"].map((k) => (
            <button key={k} type="button" className={`ev-kind ${f.kind === k ? "on" : ""}`} onClick={() => set("kind", k)} data-testid={`ev-kind-${k}`}>
              {k === "paid" ? <CreditCard size={18} /> : <UserPlus size={18} />}
              <b>{k === "paid" ? x.kindPaid : x.kindFree}</b>
              <small>{k === "paid" ? x.evKindPaidSub : x.evKindFreeSub}</small>
            </button>
          ))}
        </div>
        <div className="ev-two">
          <label className="md-field">
            <span>{x.evStarts}</span>
            <input type="datetime-local" value={f.starts_at} onChange={(e) => set("starts_at", e.target.value)} data-testid="ev-starts" />
          </label>
          <label className="md-field">
            <span>{x.evEnds}</span>
            <input type="datetime-local" value={f.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
          </label>
        </div>
        <div className="ev-two">
          <label className="md-field">
            <span>{x.evVenue}</span>
            <input value={f.venue} maxLength={160} onChange={(e) => set("venue", e.target.value)} placeholder={x.evVenuePh} data-testid="ev-venue" />
          </label>
          <label className="md-field">
            <span>{x.evMap}</span>
            <input value={f.map_url} onChange={(e) => set("map_url", e.target.value)} placeholder="https://maps.app.goo.gl/…" />
          </label>
        </div>
        {/* ticket types */}
        <div className="ev-types">
          <div>
            <b>{x.evTypes}</b>
            <small className="rs-muted">{x.evTypesSub}</small>
          </div>
          <div className={`ev-type head ${f.kind === "free" ? "free" : ""}`}>
            <span>{x.evTypeName}</span>
            {f.kind !== "free" && <span>{x.evTypePrice}</span>}
            <span>{x.evTypeQty}</span>
            <span>{x.evTypeOn}</span>
            <span />
          </div>
          {f.types.map((t, i) => (
            <div key={t.key || i} className="ev-type-wrap">
              <div className={`ev-type ${f.kind === "free" ? "free" : ""}`} data-testid="ev-type">
                <input value={t.name} maxLength={60} onChange={(e) => setType(i, { name: e.target.value })} aria-label={x.evTypeName} />
                {f.kind !== "free" && <input type="number" min="0" step="0.5" value={t.price} onChange={(e) => setType(i, { price: e.target.value })} aria-label={x.evTypePrice} />}
                <input type="number" min={Math.max(1, t.taken || 0)} value={t.qty} onChange={(e) => setType(i, { qty: e.target.value })} aria-label={x.evTypeQty} />
                <label className="md-switch ev-type-on">
                  <input type="checkbox" checked={t.active} onChange={(e) => setType(i, { active: e.target.checked })} />
                  <span className="md-switch-track" />
                </label>
                <button type="button" className="md-icon-btn" onClick={() => setF((p) => ({ ...p, types: p.types.filter((_, k) => k !== i) }))} disabled={(t.taken || 0) > 0 || f.types.length < 2} aria-label={x.remove}>
                  <Trash2 size={14} />
                </button>
              </div>
              <input className="ev-type-note" value={t.note} maxLength={120} onChange={(e) => setType(i, { note: e.target.value })} placeholder={x.evTypeNotePh} aria-label={x.evTypeNote} />
              {f.kind !== "free" && <TypeDeals ctx={ctx} t={t} onChange={(patch) => setType(i, patch)} />}
            </div>
          ))}
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setF((p) => ({ ...p, types: [...p.types, newType("", f.kind === "free" ? 0 : 10, 50)] }))} disabled={f.types.length >= 20} data-testid="ev-add-type">
            <Plus size={14} /> {x.evAddType}
          </button>
        </div>
        {f.kind === "paid" && (data.pay_methods || []).length > 0 && (
          <div className="md-field" data-testid="ev-pick-pay">
            <span>{x.pm.forEvent}</span>
            <div className="ev-pm-picks">
              {data.pay_methods.map((p) => {
                const on = !f.pay_methods.length || f.pay_methods.includes(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    className={`ev-pm-pick ${on ? "on" : ""} ${p.active && (p.qr || p.link) ? "" : "off"}`}
                    onClick={() => {
                      const all = data.pay_methods.map((q) => q.key);
                      const cur = f.pay_methods.length ? f.pay_methods : all;
                      const next = cur.includes(p.key) ? cur.filter((k) => k !== p.key) : [...cur, p.key];
                      set("pay_methods", next.length === all.length ? [] : next);
                    }}
                    data-testid={`ev-pm-pick-${p.key}`}
                  >
                    {p.qr ? <img src={p.qr} alt="" /> : <CreditCard size={16} />}
                    <span>
                      <b>{p.bank || x.pm.unnamed}</b>
                      <small>{p.account_no || (p.qr || p.link ? x.pm.ready : x.pm.notReady)}</small>
                    </span>
                    {on && <Check size={15} />}
                  </button>
                );
              })}
            </div>
            <small className="rs-muted">{f.pay_methods.length ? x.pm.someSub : x.pm.allSub}</small>
          </div>
        )}
        <ShowsBox ctx={ctx} f={f} setF={setF} />
        <SeatsBox ctx={ctx} f={f} setF={setF} ev={ev} />
        <QuestionsBox ctx={ctx} f={f} setF={setF} />
        <EventGrowBox ctx={ctx} f={f} setF={setF} ev={ev} />
        <label className="md-field">
          <span>{x.evAbout}</span>
          <textarea rows={4} value={f.about} maxLength={4000} onChange={(e) => set("about", e.target.value)} placeholder={x.evAboutPh} />
        </label>
        <div className="md-field">
          <span>{x.evPoster}</span>
          {isNew ? (
            <small className="rs-muted">{x.evPosterAfter}</small>
          ) : (
            <>
              <button type="button" className={`ev-poster-pick ${poster ? "has" : ""}`} onClick={() => pick.current?.click()} disabled={!!busy}>
                {busy === "poster" ? <Loader2 size={20} className="md-spin" /> : poster ? <img src={poster} alt="" /> : <ImageIcon size={24} />}
                <span>{x.evPosterPick}</span>
              </button>
              <input
                ref={pick}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) upPoster(file);
                }}
              />
            </>
          )}
        </div>
        <div className="ev-two">
          <label className="md-field">
            <span>{x.evMaxPer}</span>
            <input type="number" min="1" max="50" value={f.max_per_order} onChange={(e) => set("max_per_order", e.target.value)} />
          </label>
          <label className="md-field">
            <span>{x.evSaleEnds}</span>
            <input type="datetime-local" value={f.sale_ends_at} onChange={(e) => set("sale_ends_at", e.target.value)} />
            <small className="rs-muted">{x.evSaleEndsSub}</small>
          </label>
        </div>
        <label className="md-field">
          <span>{x.evTerms}</span>
          <textarea rows={2} value={f.terms} maxLength={1000} onChange={(e) => set("terms", e.target.value)} placeholder={x.evTermsPh} />
        </label>
        <div className="md-field">
          <span>{x.evStatus}</span>
          <div className="ev-statuses">
            {["draft", "published", "closed", "cancelled"].map((s) => (
              <button key={s} type="button" className={`ev-st st-${s} ${f.status === s ? "on" : ""}`} onClick={() => set("status", s)} data-testid={`ev-status-${s}`}>
                <b>{x.status[s]}</b>
                <small>{x.evStatusSub[s]}</small>
              </button>
            ))}
          </div>
        </div>
        {f.status === "published" && payMissing && (
          <div className="ev-warn">
            {x.needPayFirst}{" "}
            <button type="button" className="sa-link" onClick={() => (onClose(), ctx.go("payment"))}>
              {x.goPayment}
            </button>
          </div>
        )}
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

// a small picker of the owner's events
export function EventPick({ ctx, value, onChange, all, className }) {
  const { x, lang, data } = ctx;
  const options = useMemo(
    () => [
      ...(all ? [{ value: "", label: x.allEvents }] : []),
      ...[...data.events].sort((p, q) => new Date(q.starts_at) - new Date(p.starts_at)).map((e) => ({ value: e._id, label: e.title, sub: `${fmtWhen(e.starts_at, lang)}${e.status !== "published" ? ` · ${x.status[e.status]}` : ""}` })),
    ],
    [data.events, all, x, lang],
  );
  return <SearchSelect value={value} onChange={onChange} options={options} placeholder={x.pickEvent} searchPh={x.searchEvent} noMatch={x.noMatch} testid="ev-pick" className={`ev-pick ${className || ""}`} />;
}
// the event to show first: the one asked for, else the next one coming, else the newest
export const firstEvent = (ctx) => {
  const want = ctx.params.get("event");
  if (want && ctx.data.events.some((e) => e._id === want)) return want;
  const soon = [...ctx.data.events].filter((e) => e.status !== "draft" && new Date(e.ends_at || e.starts_at) > new Date(Date.now() - 86400000)).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];
  return (soon || ctx.data.events[0])?._id || "";
};

// the start of an order's showtime
const showAt = (ctx, o) => ctx.data.events.find((e) => e._id === String(o.event_id))?.shows?.find((s) => s.key === o.show)?.starts_at;

// ============================================================ Orders ============================================================
const OSTATUS = ["review", "pending", "paid", "rejected", "expired", "cancelled", ""];
const ago = (d, lang) => {
  const s = Math.round((new Date(d).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang === "km" ? "km" : "en", { numeric: "auto" });
  const a = Math.abs(s);
  return a < 60 ? rtf.format(s, "second") : a < 3600 ? rtf.format(Math.round(s / 60), "minute") : a < 86400 ? rtf.format(Math.round(s / 3600), "hour") : rtf.format(Math.round(s / 86400), "day");
};
export function OrdersTab({ ctx }) {
  const { x, lang, api, readOnly, data } = ctx;
  const o_ = x.ord;
  const [status, setStatus] = useState(() => (OSTATUS.includes(ctx.params.get("status")) ? ctx.params.get("status") : ctx.data.waiting ? "review" : ""));
  const [event, setEvent] = useState(() => ctx.params.get("event") || "");
  const [show, setShow] = useState("");
  const [pay, setPay] = useState("");
  const [via, setVia] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState({ n: 1, pages: 1, total: 0 });
  const [busy, setBusy] = useState("");
  const [view, setView] = useState("");
  const [open, setOpen] = useState({});
  const ev = data.events.find((e) => e._id === event);
  const params = { status, event, show, pay, via, q };
  const load = useCallback(
    (n = 1) =>
      api
        .orders({ ...params, page: n })
        .then((r) => {
          setRows((old) => (n > 1 ? [...(old || []), ...r.data] : r.data));
          setSummary(r.summary || null);
          setPage({ n, pages: r.pagination?.totalPages || 1, total: r.pagination?.total || 0 });
        })
        .catch((e) => ctx.notify({ type: "error", text: errOf(e) })),
    [api, status, event, show, pay, via, q], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    const t = setTimeout(() => load(1), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  // new screenshots come in by themselves
  useEffect(() => {
    if (status !== "review" && status !== "") return undefined;
    const h = setInterval(() => load(1), 30000);
    return () => clearInterval(h);
  }, [load, status]);
  useEffect(() => setShow(""), [event]);
  const act = async (o, kind) => {
    let reason = "";
    if (kind === "reject") {
      reason = window.prompt(x.rejectWhy, x.rejectPh);
      if (reason === null) return;
    }
    if (kind === "cancel" && !window.confirm(x.cancelWhy)) return;
    setBusy(`${o._id}:${kind}`);
    try {
      const r = kind === "approve" ? await api.approve(o._id) : kind === "reject" ? await api.reject(o._id, reason) : await api.cancelOrder(o._id, x.cancelOrder);
      ctx.notify({ type: "success", text: kind === "approve" ? x.approved.replace("{n}", r.data.tickets.length) : x.saved });
      await load(1);
      ctx.reload();
    } catch (e) {
      ctx.notify({ type: "error", text: errOf(e) });
    } finally {
      setBusy("");
    }
  };
  const showOptions = useMemo(() => [{ value: "", label: o_.allShows }, ...(ev?.shows || []).map((s) => ({ value: s.key, label: fmtWhen(s.starts_at, lang), sub: s.label }))], [ev, lang, o_]);
  const payOptions = useMemo(() => [{ value: "", label: x.pm.allMethods }, ...(data.pay_methods || []).map((p) => ({ value: p.key, label: p.bank || x.pm.unnamed, sub: p.account_no }))], [data.pay_methods, x]);
  const viaOptions = [
    { value: "", label: o_.allVia },
    { value: "online", label: x.viaOnline },
    { value: "gate", label: x.viaGate },
    { value: "invite", label: x.viaInvite },
  ];
  const sm = summary || {};
  const stat = (k, icon, label, val, sub, cls) => {
    const Icon = icon;
    return (
      <button type="button" className={`panel-card ev-ostat ${cls || ""} ${status === k ? "on" : ""}`} onClick={() => setStatus(status === k ? "" : k)} data-testid={`ev-ostat-${k}`}>
        <span className="ev-ostat-ic">
          <Icon size={18} />
        </span>
        <span>
          <small>{label}</small>
          <b>{val}</b>
          {sub && <em>{sub}</em>}
        </span>
      </button>
    );
  };
  const showAtOf = (o) => (o.event?.shows || []).find((s) => s.key === o.show)?.starts_at;
  return (
    <div className="rs-col">
      <Head icon={ReceiptText} title={x.ordersTitle} sub={x.ordersSub}>
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => load(1)} aria-label={o_.refresh} title={o_.refresh}>
          <RotateCcw size={14} /> {o_.refresh}
        </button>
      </Head>
      <div className="ev-ostats">
        {stat("review", BellRing, x.ostatus.review, fmt(sm.review?.n || 0), sm.review?.n ? usd(sm.review.money) : "", "warn")}
        {stat("pending", Clock, x.ostatus.pending, fmt(sm.pending?.n || 0), sm.pending?.n ? usd(sm.pending.money) : "")}
        {stat("paid", CheckCircle2, x.ostatus.paid, fmt(sm.paid?.n || 0), o_.tickets.replace("{n}", fmt(sm.paid?.tickets || 0)), "good")}
        {stat("money", Wallet, o_.money, usd(sm.paid?.money || 0), o_.paidOnly, "money")}
      </div>
      <div className="panel-card ev-ofilters">
        <div className="ev-ofilter-row">
          <EventPick ctx={ctx} value={event} onChange={setEvent} all className="grow" />
          {ev?.shows?.length > 0 && <SearchSelect value={show} onChange={setShow} options={showOptions} placeholder={o_.allShows} searchPh={o_.searchShow} noMatch={x.noMatch} testid="ev-of-show" />}
          {(data.pay_methods || []).length > 1 && <SearchSelect value={pay} onChange={setPay} options={payOptions} placeholder={x.pm.allMethods} searchPh={o_.searchPay} noMatch={x.noMatch} testid="ev-of-pay" />}
          <SearchSelect value={via} onChange={setVia} options={viaOptions} placeholder={o_.allVia} searchPh={o_.searchPay} noMatch={x.noMatch} testid="ev-of-via" />
        </div>
        <div className="ev-ofilter-row">
          <label className="ev-search grow">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={x.search} data-testid="ev-of-q" />
            {q && (
              <button type="button" className="md-icon-btn" onClick={() => setQ("")} aria-label={x.close}>
                <X size={14} />
              </button>
            )}
          </label>
        </div>
        <div className="ev-chips">
          {OSTATUS.map((s) => (
            <button key={s || "all"} type="button" className={status === s ? "on" : ""} onClick={() => setStatus(s)} data-testid={`ev-os-${s || "all"}`}>
              {s ? x.ostatus[s] : x.all}
              {s && sm[s]?.n > 0 && <i className={s === "review" ? "hot" : ""}>{fmt(sm[s].n)}</i>}
            </button>
          ))}
        </div>
      </div>
      {!rows ? (
        <div className="panel-card ev-empty">
          <Loader2 size={22} className="md-spin" />
        </div>
      ) : !rows.length ? (
        <div className="panel-card ev-empty">
          <ReceiptText size={30} />
          <p>{x.noOrders}</p>
        </div>
      ) : (
        <div className="ev-orders">
          <small className="rs-muted">{o_.showing.replace("{n}", fmt(rows.length)).replace("{all}", fmt(page.total))}</small>
          {rows.map((o) => {
            const more = !!open[o._id];
            const at = showAtOf(o);
            return (
              <article key={o._id} className={`panel-card ev-order2 os-${o.status}`} data-testid="ev-order">
                <div className="ev-order2-row">
                  {o.proof ? (
                    <button type="button" className="ev-proof big" onClick={() => setView(o.proof)} aria-label={x.proof}>
                      <img src={o.proof} alt="" />
                    </button>
                  ) : (
                    <span className="ev-proof big none">{o.via === "gate" ? <Store size={22} /> : o.via === "invite" ? <Gift size={22} /> : <ReceiptText size={22} />}</span>
                  )}
                  <div className="ev-order-main">
                    <div className="ev-order-top">
                      <b>#{o.no}</b>
                      <span className={`ev-ostatus os-${o.status}`}>{x.ostatus[o.status]}</span>
                      {o.via !== "online" && <span className="ev-via">{o.via === "gate" ? x.viaGate : x.viaInvite}</span>}
                      {o.pay_label && (
                        <span className="ev-chip-mini">
                          <CreditCard size={11} /> {o.pay_label}
                        </span>
                      )}
                      <small className="rs-muted" title={fmtTime(o.created_date, lang)}>
                        {ago(o.created_date, lang)}
                      </small>
                    </div>
                    <div className="ev-order-who">
                      <b>{o.buyer?.name}</b>
                      {o.buyer?.phone && (
                        <a href={`tel:${o.buyer.phone}`} className="ev-phone">
                          {prettyPhone(o.buyer.phone)}
                        </a>
                      )}
                    </div>
                    <div className="ev-order-what">
                      <span className="ev-order-ev">
                        <CalendarDays size={12} /> {o.event?.title}
                        {at && ` · ${fmtWhen(at, lang)}`}
                      </span>
                      {o.lines.map((l) => (
                        <span key={l.key} className="ev-chip-mini">
                          {l.qty} × {l.name}
                        </span>
                      ))}
                      {o.seats?.length > 0 && (
                        <span className="ev-chip-mini">
                          <Armchair size={11} /> {o.seats.map((sid) => sid.split(":")[1]).join(", ")}
                        </span>
                      )}
                      {o.promo && (
                        <span className="ev-chip-mini">
                          <Tag size={11} /> {o.promo.code}
                        </span>
                      )}
                      {o.tg_linked && (
                        <span className="ev-chip-mini">
                          <Send size={11} /> {x.more.tgLinked}
                        </span>
                      )}
                    </div>
                    {o.status === "pending" && o.hold_until && <small className="ev-order-hold">{x.holdLeft.replace("{t}", fmtTime(o.hold_until, lang))}</small>}
                    {o.reason && <small className="rs-muted">· {o.reason}</small>}
                  </div>
                  <div className="ev-order-side">
                    <b className="ev-order-total">{usd(o.total)}</b>
                    {o.promo && <s className="rs-muted">{usd(o.subtotal)}</s>}
                    <div className="ev-order-acts">
                      {["review", "pending", "expired"].includes(o.status) && (
                        <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => act(o, "approve")} disabled={readOnly || !!busy} data-testid="ev-approve">
                          {busy === `${o._id}:approve` ? <Loader2 size={14} className="md-spin" /> : <CheckCircle2 size={14} />} {x.approve}
                        </button>
                      )}
                      {["review", "pending"].includes(o.status) && (
                        <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={() => act(o, "reject")} disabled={readOnly || !!busy} data-testid="ev-reject">
                          <XCircle size={14} /> {x.reject}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <button type="button" className="ev-order-more" onClick={() => setOpen((p) => ({ ...p, [o._id]: !more }))} aria-expanded={more} data-testid="ev-order-more">
                  {more ? o_.less : o_.details} <ChevronDown size={14} style={{ rotate: more ? "180deg" : "0deg" }} />
                </button>
                {more && (
                  <div className="ev-order-details">
                    <dl>
                      {o.reference && (
                        <>
                          <dt>{x.ref}</dt>
                          <dd>{o.reference}</dd>
                        </>
                      )}
                      {o.promo && (
                        <>
                          <dt>{x.more.promo}</dt>
                          <dd>
                            {o.promo.code} · −{usd(o.promo.off)} ({usd(o.subtotal)} → {usd(o.total)})
                          </dd>
                        </>
                      )}
                      {o.seats?.length > 0 && (
                        <>
                          <dt>{x.more.seat}</dt>
                          <dd>{o.seats.join(", ").replace(/[a-z0-9_]+:/g, "")}</dd>
                        </>
                      )}
                      {o.names?.some(Boolean) && (
                        <>
                          <dt>{o_.names}</dt>
                          <dd>{o.names.filter(Boolean).join(", ")}</dd>
                        </>
                      )}
                      {(o.answers || []).map((a) => (
                        <Fragment key={a.key}>
                          <dt>{a.label}</dt>
                          <dd>{a.value}</dd>
                        </Fragment>
                      ))}
                      {o.note && (
                        <>
                          <dt>{o_.note}</dt>
                          <dd>{o.note}</dd>
                        </>
                      )}
                      <dt>{o_.created}</dt>
                      <dd>{fmtTime(o.created_date, lang)}</dd>
                      {o.decided_at && (
                        <>
                          <dt>{o_.decided}</dt>
                          <dd>
                            {fmtTime(o.decided_at, lang)} · {o.decided_by}
                          </dd>
                        </>
                      )}
                    </dl>
                    <div className="ev-btn-row">
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => copy(orderUrl(o.token), ctx)}>
                        <Copy size={14} /> {x.buyerLink}
                      </button>
                      <a className="md-btn md-btn-ghost sa-btn-sm" href={orderUrl(o.token)} target="_blank" rel="noreferrer">
                        <ExternalLink size={14} /> {o_.openOrder}
                      </a>
                      {o.status === "paid" && (
                        <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={() => act(o, "cancel")} disabled={readOnly || !!busy}>
                          <XCircle size={14} /> {x.cancelOrder}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {page.n < page.pages && (
            <button type="button" className="md-btn md-btn-ghost" onClick={() => load(page.n + 1)} data-testid="ev-orders-more">
              {o_.loadMore}
            </button>
          )}
        </div>
      )}
      {view && (
        <div className="ev-viewer" onClick={() => setView("")} role="dialog" aria-label={x.proof}>
          <img src={view} alt="" />
          <button type="button" aria-label={x.close}>
            <X size={22} />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================ Guests ============================================================
export function GuestsTab({ ctx }) {
  const { x, lang, api, readOnly, data } = ctx;
  const [event, setEvent] = useState(() => firstEvent(ctx));
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState(null);
  const [busy, setBusy] = useState("");
  const [invite, setInvite] = useState(false);
  const ev = data.events.find((e) => e._id === event);
  const load = useCallback(() => {
    if (!event) return Promise.resolve(setRows([]));
    return Promise.all([api.tickets(event, { status, q }), api.event(event)])
      .then(([t, e]) => {
        setRows(t.data);
        setCounts(e.data.counts);
      })
      .catch((e) => ctx.notify({ type: "error", text: errOf(e) }));
  }, [api, event, status, q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  const act = async (t, kind) => {
    if (kind === "cancel" && !window.confirm(x.cancelTicketSure)) return;
    setBusy(`${t._id}:${kind}`);
    try {
      if (kind === "in") await api.checkin(t._id);
      else if (kind === "undo") await api.undo(t._id);
      else if (kind === "give") {
        const name = window.prompt(x.grow.giveName, "");
        if (!name?.trim()) return;
        const phone = window.prompt(x.grow.givePhone, "") || "";
        await api.transfer(t._id, { name, phone });
        ctx.notify({ type: "success", text: x.grow.giveDone });
      } else await api.cancelTicket(t._id);
      await load();
    } catch (e) {
      ctx.notify({ type: "error", text: errOf(e) });
    } finally {
      setBusy("");
    }
  };
  const lockedBtn = (key, Icon, label, onClick, testid) =>
    ctx.on(key) ? (
      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={onClick} disabled={readOnly || !event} data-testid={testid}>
        <Icon size={14} /> {label}
      </button>
    ) : (
      <button type="button" className="md-btn md-btn-ghost sa-btn-sm ev-locked" onClick={() => ctx.askBuy({ addon: key })} title={x.locked.replace("{name}", x.addonNames[key])}>
        <Lock size={13} /> {label}
      </button>
    );
  return (
    <div className="rs-col">
      <Head icon={UsersRound} title={x.guestsTitle} sub={x.guestsSub}>
        {lockedBtn("ev_invites", Gift, x.invite, () => setInvite(true), "ev-invite")}
        {lockedBtn("ev_export", Download, x.exportCsv, () => api.exportCsv(event, ev?.slug).catch((e) => ctx.notify({ type: "error", text: errOf(e) })), "ev-export")}
      </Head>
      <div className="ev-filters">
        <div className="ev-filter-row">
          <EventPick ctx={ctx} value={event} onChange={setEvent} />
          <label className="ev-search">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={x.search} />
          </label>
        </div>
        <div className="ev-chips">
          {["", "valid", "used", "cancelled"].map((s) => (
            <button key={s || "all"} type="button" className={status === s ? "on" : ""} onClick={() => setStatus(s)}>
              {s ? x.tstatus[s] : x.all}
            </button>
          ))}
        </div>
      </div>
      {counts && ev && (
        <div className="ev-stats">
          <div className="panel-card ev-stat">
            <small>{x.ticketsSold}</small>
            <b>
              {fmt(counts.tickets)} <em>/ {fmt(sum(ev, "qty"))}</em>
            </b>
          </div>
          <div className="panel-card ev-stat good">
            <small>{x.inside}</small>
            <b>
              {fmt(counts.used)} <em>/ {fmt(counts.tickets)}</em>
            </b>
            <div className="ev-bar">
              <i style={{ width: `${counts.tickets ? (counts.used / counts.tickets) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      )}
      {!rows ? (
        <div className="panel-card ev-empty">
          <Loader2 size={22} className="md-spin" />
        </div>
      ) : !rows.length ? (
        <div className="panel-card ev-empty">
          <UsersRound size={30} />
          <p>{x.noGuests}</p>
        </div>
      ) : (
        <div className="panel-card ev-guests">
          {rows.map((t) => (
            <div key={t._id} className={`ev-guest ts-${t.status}`} data-testid="ev-guest">
              <span className="ev-guest-dot" />
              <div className="ev-guest-main">
                <b>{t.holder || "—"}</b>
                <small className="rs-muted">
                  {t.type_name}
                  {t.seat_label && ` · ${t.seat_label}`}
                  {t.show_at && ` · ${fmtWhen(t.show_at, lang)}`} · #{t.order_no}-{t.no} {t.phone && `· ${prettyPhone(t.phone)}`} · <code>{t.code}</code>
                </small>
                {t.status === "used" && (
                  <small className="ev-guest-in">
                    <Check size={12} /> {fmtTime(t.used_at, lang)} {t.used_by && x.by.replace("{name}", t.used_by)}
                  </small>
                )}
              </div>
              <span className={`ev-tstatus ts-${t.status}`}>{x.tstatus[t.status]}</span>
              <div className="ev-guest-acts">
                {t.status === "valid" && (
                  <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => act(t, "in")} disabled={readOnly || !!busy} data-testid="ev-checkin">
                    {busy === `${t._id}:in` ? <Loader2 size={13} className="md-spin" /> : <DoorOpen size={13} />} {x.checkin}
                  </button>
                )}
                {t.status === "used" && (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => act(t, "undo")} disabled={readOnly || !!busy}>
                    <RotateCcw size={13} /> {x.undo}
                  </button>
                )}
                {t.status === "valid" && (
                  <button type="button" className="md-icon-btn" onClick={() => act(t, "give")} disabled={readOnly || !!busy} aria-label={x.grow.give} title={x.grow.give} data-testid="ev-give">
                    <Repeat size={15} />
                  </button>
                )}
                {t.status !== "cancelled" && (
                  <button type="button" className="md-icon-btn" onClick={() => act(t, "cancel")} disabled={readOnly || !!busy} aria-label={x.cancelTicket} title={x.cancelTicket}>
                    <XCircle size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {invite && ev && <InviteModal ctx={ctx} ev={ev} onClose={() => setInvite(false)} onDone={load} />}
    </div>
  );
}

function InviteModal({ ctx, ev, onClose, onDone }) {
  const { x, api } = ctx;
  const [f, setF] = useState({ name: "", phone: "", key: ev.types[0]?.key || "", qty: 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await api.invite(ev._id, f);
      setDone(r.data.order);
      onDone();
    } catch (e) {
      setError(errOf(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={x.inviteTitle}
      onClose={onClose}
      busy={busy}
      footer={
        done ? (
          <button type="button" className="md-btn md-btn-primary" onClick={onClose}>
            {x.close}
          </button>
        ) : (
          <>
            <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
              {x.cancel}
            </button>
            <button type="button" className="md-btn md-btn-primary" onClick={send} disabled={busy || !f.name.trim()} data-testid="ev-invite-send">
              {busy ? <Loader2 size={15} className="md-spin" /> : <Gift size={15} />} {x.invite}
            </button>
          </>
        )
      }
    >
      {done ? (
        <div className="md-fields">
          <div className="ev-done">
            <CheckCircle2 size={28} />
            <b>{x.inviteDone}</b>
          </div>
          <div className="ev-linkbox">
            <code>{orderUrl(done.token)}</code>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => copy(orderUrl(done.token), ctx)}>
              <Copy size={14} /> {x.copyLink}
            </button>
          </div>
        </div>
      ) : (
        <div className="md-fields">
          <label className="md-field">
            <span>{x.inviteName}</span>
            <input value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="ev-invite-name" />
          </label>
          <label className="md-field">
            <span>{x.invitePhone}</span>
            <input value={f.phone} inputMode="tel" onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </label>
          <div className="ev-two">
            <label className="md-field">
              <span>{x.inviteType}</span>
              <select value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })}>
                {ev.types.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name} ({fmt(t.left)})
                  </option>
                ))}
              </select>
            </label>
            <label className="md-field">
              <span>{x.inviteQty}</span>
              <input type="number" min="1" max="50" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
            </label>
          </div>
          {error && <div className="md-form-error">{error}</div>}
        </div>
      )}
    </Modal>
  );
}

// ============================================================ Report ============================================================
export function ReportTab({ ctx }) {
  const [mode, setMode] = useState(() => (ctx.params.get("event") ? "event" : "all"));
  const g = ctx.x.grow;
  return (
    <div className="rs-col">
      <Head icon={BarChart3} title={ctx.x.reportTitle} sub={ctx.x.reportSub}>
        <div className="ev-seg" role="tablist">
          <button type="button" className={mode === "all" ? "on" : ""} onClick={() => setMode("all")} data-testid="ev-rep-all">
            {g.ovAll}
          </button>
          <button type="button" className={mode === "event" ? "on" : ""} onClick={() => setMode("event")} data-testid="ev-rep-one">
            {g.ovOne}
          </button>
        </div>
      </Head>
      {mode === "all" ? <OverviewReport ctx={ctx} /> : <OneReport ctx={ctx} />}
    </div>
  );
}
function OneReport({ ctx }) {
  const { x, lang, api } = ctx;
  const [event, setEvent] = useState(() => firstEvent(ctx));
  const [r, setR] = useState(null);
  useEffect(() => {
    setR(null);
    if (event) api.report(event).then((res) => setR(res.data)).catch((e) => ctx.notify({ type: "error", text: errOf(e) }));
  }, [api, event]); // eslint-disable-line react-hooks/exhaustive-deps
  const maxDay = Math.max(1, ...(r?.per_day || []).map((d) => d.tickets));
  const maxHour = Math.max(1, ...(r?.checkins || []).map((d) => d.n));
  return (
    <div className="rs-col">
      <div className="ev-filter-row">
        <EventPick ctx={ctx} value={event} onChange={setEvent} />
      </div>
      {!event ? (
        <div className="panel-card ev-empty">
          <BarChart3 size={30} />
          <p>{x.noEvents}</p>
        </div>
      ) : !r ? (
        <div className="panel-card ev-empty">
          <Loader2 size={22} className="md-spin" />
        </div>
      ) : (
        <>
          <div className="ev-stats four">
            <div className="panel-card ev-stat">
              <small>{x.rSold}</small>
              <b>
                {fmt(r.totals.sold)} <em>/ {fmt(r.totals.qty)}</em>
              </b>
            </div>
            <div className="panel-card ev-stat good">
              <small>{x.rIn}</small>
              <b>{fmt(r.totals.used)}</b>
            </div>
            <div className="panel-card ev-stat money">
              <small>{x.rMoney}</small>
              <b>{usd(r.totals.money)}</b>
            </div>
            <div className="panel-card ev-stat">
              <small>{x.rWaiting}</small>
              <b>{fmt(r.totals.waiting)}</b>
            </div>
            {r.totals.discount > 0 && (
              <div className="panel-card ev-stat">
                <small>{x.more.discount}</small>
                <b>−{usd(r.totals.discount)}</b>
              </div>
            )}
          </div>
          {r.shows?.length > 0 && (
            <div className="panel-card">
              <b>{x.more.perShow}</b>
              <div className="ev-bars">
                {r.shows.map((sh) => (
                  <div key={sh.key} className="ev-bars-row">
                    <span>{fmtWhen(sh.starts_at, lang)}</span>
                    <i style={{ width: `${sh.qty ? Math.min(100, (sh.sold / sh.qty) * 100) : 0}%` }} />
                    <b>
                      {fmt(sh.sold)} / {fmt(sh.qty)}
                    </b>
                  </div>
                ))}
              </div>
            </div>
          )}
          {r.promos?.length > 0 && (
            <div className="panel-card ev-via-list">
              <b>{x.more.promo}</b>
              {r.promos.map((p) => (
                <span key={p.code}>
                  <code>{p.code}</code> · {fmt(p.orders)} · <b>−{usd(p.off)}</b>
                </span>
              ))}
            </div>
          )}
          <div className="panel-card">
            <table className="ev-table">
              <thead>
                <tr>
                  <th>{x.rType}</th>
                  <th>{x.rPrice}</th>
                  <th>{x.rSold}</th>
                  <th>{x.rLeft}</th>
                  <th>{x.rIn}</th>
                  <th>{x.rMoney}</th>
                </tr>
              </thead>
              <tbody>
                {r.types.map((t) => (
                  <tr key={t.key}>
                    <td>
                      <b>{t.name}</b>
                    </td>
                    <td>{usd(t.price)}</td>
                    <td>
                      {fmt(t.sold)} / {fmt(t.qty)}
                    </td>
                    <td>{fmt(Math.max(0, t.qty - t.sold - t.waiting))}</td>
                    <td>{fmt(t.used)}</td>
                    <td>
                      <b>{usd(t.money)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ev-two-cards">
            <div className="panel-card">
              <b>{x.perDay}</b>
              {!r.per_day.length ? (
                <p className="rs-muted">{x.noData}</p>
              ) : (
                <div className="ev-bars">
                  {r.per_day.map((d) => (
                    <div key={d.day} className="ev-bars-row">
                      <span>{d.day.slice(5)}</span>
                      <i style={{ width: `${(d.tickets / maxDay) * 100}%` }} />
                      <b>{fmt(d.tickets)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="panel-card">
              <b>{x.perHour}</b>
              {!r.checkins.length ? (
                <p className="rs-muted">{x.noData}</p>
              ) : (
                <div className="ev-bars good">
                  {r.checkins.map((d) => (
                    <div key={d.hour} className="ev-bars-row">
                      <span>{d.hour.slice(5).replace("T", " ")}</span>
                      <i style={{ width: `${(d.n / maxHour) * 100}%` }} />
                      <b>{fmt(d.n)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {r.via.length > 0 && (
            <div className="panel-card ev-via-list">
              <b>{x.viaTitle}</b>
              {r.via.map((v) => (
                <span key={v.via}>
                  {v.via === "gate" ? x.viaGate : v.via === "invite" ? x.viaInvite : x.viaOnline} · {fmt(v.tickets)} · <b>{usd(v.money)}</b>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================ Team + door phones ============================================================
export function TeamTab({ ctx }) {
  const { x, lang, api, readOnly } = ctx;
  const [t, setT] = useState(null);
  const [edit, setEdit] = useState(null);
  const [pair, setPair] = useState(null);
  const load = useCallback(() => api.team().then((r) => setT(r.data)).catch((e) => ctx.notify({ type: "error", text: errOf(e) })), [api]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);
  const newCode = async () => {
    try {
      const r = await api.pairCode();
      setPair({ ...r.data, qr: await QRCode.toDataURL(doorUrl(), { width: 240, margin: 1 }) });
    } catch (e) {
      ctx.notify({ type: "error", text: errOf(e) });
    }
  };
  const removeDevice = async (d) => {
    if (!window.confirm(x.removeDeviceSure)) return;
    await api.removeDevice(d._id).catch((e) => ctx.notify({ type: "error", text: errOf(e) }));
    load();
  };
  if (!t)
    return (
      <div className="panel-card ev-empty">
        <Loader2 size={22} className="md-spin" />
      </div>
    );
  const active = t.members.filter((m) => m.active).length;
  return (
    <div className="rs-col">
      <Head icon={Users} title={x.teamTitle} sub={x.teamSub}>
        <a className="md-btn md-btn-ghost sa-btn-sm" href={doorUrl()} target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> {x.scannerLink}
        </a>
      </Head>
      <div className="panel-card">
        <div className="ev-sec-head">
          <b>{x.teamCount.replace("{n}", active).replace("{max}", t.limits.team)}</b>
          {active >= t.limits.team && !ctx.on("ev_team") ? (
            <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "ev_team" })}>
              <Lock size={13} /> {x.addonNames.ev_team}
            </button>
          ) : (
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setEdit({})} disabled={readOnly} data-testid="ev-add-member">
              <Plus size={14} /> {x.addMember}
            </button>
          )}
        </div>
        <div className="ev-members">
          {t.members.map((m) => (
            <button key={m._id} type="button" className={`ev-member ${m.active ? "" : "off"}`} onClick={() => setEdit(m)} data-testid="ev-member">
              <span className={`ev-role r-${m.role}`}>{x.roles[m.role]}</span>
              <b>{m.name}</b>
              <small className="rs-muted">{m.active ? x.roleWhat[m.role] : x.memberOff}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="panel-card">
        <div className="ev-sec-head">
          <b>{x.devicesCount.replace("{n}", t.devices.length).replace("{max}", t.limits.devices)}</b>
          {t.devices.length >= t.limits.devices && !ctx.on("ev_doors") ? (
            <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "ev_doors" })}>
              <Lock size={13} /> {x.addonNames.ev_doors}
            </button>
          ) : (
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={newCode} disabled={readOnly} data-testid="ev-pair">
              <Smartphone size={14} /> {x.pairPhone}
            </button>
          )}
        </div>
        <div className="ev-devices">
          {t.devices.map((d) => (
            <div key={d._id} className="ev-device">
              <Smartphone size={18} />
              <div>
                <b>{d.name}</b>
                <small className="rs-muted">{d.last_seen ? x.lastSeen.replace("{t}", fmtTime(d.last_seen, lang)) : x.neverSeen}</small>
              </div>
              <button type="button" className="md-icon-btn" onClick={() => removeDevice(d)} disabled={readOnly} aria-label={x.removeDevice} title={x.removeDevice}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
      {edit && <MemberModal ctx={ctx} m={edit._id ? edit : null} cashier={t.cashier} onClose={() => setEdit(null)} onSaved={load} />}
      {pair && (
        <Modal title={x.pairTitle} onClose={() => (setPair(null), load())}>
          <div className="ev-pair">
            <p>{x.pairSteps}</p>
            <div className="ev-linkbox">
              <code>{doorUrl()}</code>
            </div>
            <img src={pair.qr} alt="" />
            <b className="ev-pair-code" data-testid="ev-pair-code">
              {pair.code.replace(/(\d{3})(\d{3})/, "$1 $2")}
            </b>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MemberModal({ ctx, m, cashier, onClose, onSaved }) {
  const { x, api } = ctx;
  const [f, setF] = useState({ name: m?.name || "", role: m?.role || "door", pin: "", active: m ? m.active : true });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const go = async (which, fn) => {
    setBusy(which);
    setError("");
    try {
      await fn();
      ctx.notify({ type: "success", text: x.saved });
      onSaved();
      onClose();
    } catch (e) {
      setError(errOf(e));
      setBusy("");
    }
  };
  return (
    <Modal
      title={m ? m.name : x.addMember}
      onClose={onClose}
      busy={!!busy}
      footer={
        <>
          {m && (
            <button type="button" className="md-btn md-btn-ghost sa-danger-text" style={{ marginRight: "auto" }} onClick={() => window.confirm(x.removeMemberSure) && go("remove", () => api.removeMember(m._id))} disabled={!!busy}>
              <Trash2 size={14} /> {x.remove}
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={!!busy}>
            {x.cancel}
          </button>
          <button
            type="button"
            className="md-btn md-btn-primary"
            disabled={!!busy || !f.name.trim() || (!m && !/^\d{4}$/.test(f.pin)) || (f.pin && !/^\d{4}$/.test(f.pin))}
            onClick={() => go("save", () => (m ? api.saveMember(m._id, { name: f.name, role: f.role, active: f.active, ...(f.pin ? { pin: f.pin } : {}) }) : api.addMember(f)))}
            data-testid="ev-member-save"
          >
            {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Save size={15} />} {x.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <label className="md-field">
          <span>{x.memberName}</span>
          <input value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="ev-member-name" />
        </label>
        <div className="md-field">
          <span>{x.memberRole}</span>
          <div className="ev-roles">
            {["door", "crew", "cashier", "manager"].map((r) => {
              const locked = r === "cashier" && !cashier;
              return (
                <button key={r} type="button" className={`ev-role-pick ${f.role === r ? "on" : ""}`} onClick={() => (locked ? ctx.askBuy({ addon: "ev_cashier" }) : setF({ ...f, role: r }))} data-testid={`ev-role-${r}`}>
                  <b>
                    {locked && <Lock size={12} />} {x.roles[r]}
                  </b>
                  <small>{x.roleWhat[r]}</small>
                </button>
              );
            })}
          </div>
        </div>
        <label className="md-field">
          <span>{m ? x.memberPinKeep : x.memberPin}</span>
          <input value={f.pin} inputMode="numeric" maxLength={4} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="••••" data-testid="ev-member-pin" />
        </label>
        {m && (
          <label className="md-switch">
            <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
            <span className="md-switch-track" />
            <span>{f.active ? x.roles[f.role] : x.memberOff}</span>
          </label>
        )}
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

// ============================================================ Payment + organiser ============================================================
const linkOf = (v) => {
  const m = String(v).match(/https:\/\/\S+/);
  return m ? m[0].replace(/[),.]+$/, "") : String(v);
};
export function PaymentTab({ ctx }) {
  const { x, api, data, readOnly } = ctx;
  const m = x.pm;
  const [f, setF] = useState(() => ({ org_name: data.org.name, phone: data.org.phone, telegram: data.org.telegram, hold_minutes: data.hold_minutes }));
  const [busy, setBusy] = useState("");
  const logoPick = useRef(null);
  const methods = data.pay_methods || [];
  const run = async (k, fn, ok = x.saved) => {
    setBusy(k);
    try {
      const r = await fn();
      if (r?.data) ctx.put(r.data);
      ctx.notify({ type: "success", text: ok });
      return r;
    } catch (e) {
      ctx.notify({ type: "error", text: errOf(e) });
      return null;
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rs-col">
      <Head icon={CreditCard} title={x.payTitle} sub={m.sub}>
        <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => run("add", () => api.addPayMethod({ bank: "" }))} disabled={readOnly || !!busy || methods.length >= 10} data-testid="ev-pm-add">
          {busy === "add" ? <Loader2 size={15} className="md-spin" /> : <Plus size={15} />} {m.add}
        </button>
      </Head>
      <AutoPayBanner ctx={ctx} methods={methods} />
      <div className="panel-card ev-auto ev-auto-on" data-testid="ev-listing">
        <Megaphone size={22} />
        <div>
          <b>{x.grow.listTitle}</b>
          <p>
            {x.grow.listSub}{" "}
            <a href="/events" target="_blank" rel="noreferrer">
              {x.grow.listSee}
            </a>
          </p>
        </div>
        <label className="md-switch">
          <input type="checkbox" checked={!!data.listed} onChange={(e) => run("list", () => api.listing(e.target.checked).then(() => ctx.put({ listed: e.target.checked })))} disabled={readOnly} data-testid="ev-listing-on" />
          <span className="md-switch-track" />
        </label>
      </div>
      {!methods.length && (
        <div className="panel-card ev-empty">
          <CreditCard size={30} />
          <p>{m.none}</p>
        </div>
      )}
      <div className="ev-pms">
        {methods.map((pm, i) => (
          <PayMethodCard key={pm.key} ctx={ctx} pm={pm} first={i === 0} busy={busy} run={run} />
        ))}
      </div>
      <div className="panel-card md-fields">
        <b>{x.orgTitle}</b>
        <button type="button" className={`ev-logo-pick ${data.org.logo ? "has" : ""}`} onClick={() => logoPick.current?.click()} disabled={readOnly || !!busy}>
          {busy === "logo" ? <Loader2 size={18} className="md-spin" /> : data.org.logo ? <img src={data.org.logo} alt="" /> : <ImageIcon size={22} />}
          <span>{x.orgLogo}</span>
        </button>
        <input
          ref={logoPick}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          data-testid="ev-file-logo"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) run("logo", () => api.logo(file));
          }}
        />
        <div className="ev-two">
          {[
            ["org_name", x.orgName, 80],
            ["phone", x.orgPhone, 40],
            ["telegram", x.orgTelegram, 80],
          ].map(([k, label, max]) => (
            <label key={k} className="md-field">
              <span>{label}</span>
              <input value={f[k]} maxLength={max} onChange={(e) => setF({ ...f, [k]: e.target.value })} disabled={readOnly} data-testid={`ev-org-${k}`} />
            </label>
          ))}
          <label className="md-field">
            <span>{x.hold}</span>
            <select value={f.hold_minutes} onChange={(e) => setF({ ...f, hold_minutes: Number(e.target.value) })} disabled={readOnly}>
              {[15, 30, 60, 120, 240, 720, 1440].map((n) => (
                <option key={n} value={n}>
                  {x.minutes.replace("{n}", n)}
                </option>
              ))}
            </select>
            <small className="rs-muted">{x.holdSub}</small>
          </label>
        </div>
        <div className="ev-save-row">
          <button type="button" className="md-btn md-btn-primary" onClick={() => run("save", () => api.save(f))} disabled={readOnly || !!busy} data-testid="ev-pay-save">
            {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Save size={15} />} {x.save}
          </button>
        </div>
      </div>
    </div>
  );
}
// automatic KHQR (ev_autopay): on / waiting for the Bakong token / needs a Bakong ID / locked
function AutoPayBanner({ ctx, methods }) {
  const m = ctx.x.pm;
  const has = ctx.on("ev_autopay");
  const ids = methods.some((p) => p.active && p.bakong_id);
  const state = !has ? "locked" : !ctx.data.khqr_ready ? "token" : !ids ? "id" : "on";
  return (
    <div className={`panel-card ev-auto ev-auto-${state}`} data-testid="ev-autopay">
      <QrCode size={22} />
      <div>
        <b>{m.autoTitle}</b>
        <p>{{ locked: m.autoLocked, token: m.autoNoToken, id: m.autoNoId, on: m.autoOn }[state]}</p>
      </div>
      {state === "locked" && (
        <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "ev_autopay" })} disabled={ctx.readOnly}>
          <CoinIcon size={14} /> {ctx.x.unlock.replace("{coins}", fmt(ctx.data.addons.ev_autopay?.price))}
        </button>
      )}
    </div>
  );
}
const BANKS = ["ABA", "ACLEDA", "Wing", "KHQR (Bakong)", "Canadia", "Prince Bank", "Sathapana", "Chip Mong", "TrueMoney", "Pi Pay", "Cash at the gate"];
function PayMethodCard({ ctx, pm, first, busy, run }) {
  const { x, api, readOnly } = ctx;
  const m = x.pm;
  const [f, setF] = useState(() => ({ bank: pm.bank, account_name: pm.account_name, account_no: pm.account_no, link: pm.link, note: pm.note, bakong_id: pm.bakong_id || "" }));
  const pick = useRef(null);
  const dirty = ["bank", "account_name", "account_no", "link", "note", "bakong_id"].some((k) => (f[k] || "") !== (pm[k] || ""));
  const auto = ctx.on("ev_autopay") && ctx.data.khqr_ready && !!pm.bakong_id;
  const ready = !!(pm.qr || pm.link || auto);
  const used = pm.active && ready ? ctx.data.events.filter((e) => e.kind !== "free" && (!e.pay_methods?.length || e.pay_methods.includes(pm.key))).length : 0;
  return (
    <article className={`panel-card ev-pm ${pm.active ? "" : "off"}`} data-testid="ev-pm">
      <button type="button" className={`ev-qr-pick ${pm.qr ? "has" : ""}`} onClick={() => pick.current?.click()} disabled={readOnly || !!busy}>
        {busy === `qr:${pm.key}` ? <Loader2 size={20} className="md-spin" /> : pm.qr ? <img src={pm.qr} alt="" /> : <ImageIcon size={26} />}
        <span>{x.payQrPick}</span>
      </button>
      <input
        ref={pick}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) run(`qr:${pm.key}`, () => api.payMethodQr(pm.key, file));
        }}
      />
      <div className="ev-pm-main md-fields">
        <div className="ev-pm-top">
          <b>{pm.bank || m.unnamed}</b>
          {first && <span className="ev-chip-mini">{m.first}</span>}
          <span className={`ev-chip-mini ${ready ? "ok" : "warn"}`}>{ready ? m.ready : m.notReady}</span>
          {auto && (
            <span className="ev-chip-mini ok">
              <QrCode size={11} /> {m.autoChip}
            </span>
          )}
          <small className="rs-muted">{m.usedBy.replace("{n}", used)}</small>
          <label className="md-switch" title={m.on} style={{ marginLeft: "auto" }}>
            <input type="checkbox" checked={pm.active} onChange={(e) => run("on", () => api.savePayMethod(pm.key, { active: e.target.checked }))} disabled={readOnly} />
            <span className="md-switch-track" />
          </label>
        </div>
        <div className="ev-two">
          <label className="md-field">
            <span>{x.payBank}</span>
            <input list="ev-banks" value={f.bank} maxLength={60} placeholder="ABA" onChange={(e) => setF({ ...f, bank: e.target.value })} disabled={readOnly} data-testid="ev-pm-bank" />
          </label>
          <label className="md-field">
            <span>{x.payAccName}</span>
            <input value={f.account_name} maxLength={80} onChange={(e) => setF({ ...f, account_name: e.target.value })} disabled={readOnly} />
          </label>
          <label className="md-field">
            <span>{x.payAccNo}</span>
            <input value={f.account_no} maxLength={60} onChange={(e) => setF({ ...f, account_no: e.target.value })} disabled={readOnly} />
          </label>
          <label className="md-field">
            <span>{x.payLink}</span>
            <input value={f.link} onChange={(e) => setF({ ...f, link: linkOf(e.target.value) })} placeholder="https://link.payway.com.kh/…" disabled={readOnly} data-testid="ev-pm-link" />
          </label>
        </div>
        <label className="md-field">
          <span>{x.payNote}</span>
          <input value={f.note} maxLength={200} onChange={(e) => setF({ ...f, note: e.target.value })} disabled={readOnly} />
        </label>
        {ctx.on("ev_autopay") && (
          <label className="md-field">
            <span>
              <QrCode size={13} /> {m.bakong}
            </span>
            <input value={f.bakong_id} maxLength={60} placeholder="yourname@aba" onChange={(e) => setF({ ...f, bakong_id: e.target.value.trim().toLowerCase() })} disabled={readOnly} data-testid="ev-pm-bakong" />
            <small className="rs-muted">{m.bakongHint}</small>
          </label>
        )}
        <div className="ev-btn-row">
          {dirty && (
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => run(`s:${pm.key}`, () => api.savePayMethod(pm.key, f))} disabled={readOnly || !!busy} data-testid="ev-pm-save">
              {busy === `s:${pm.key}` ? <Loader2 size={14} className="md-spin" /> : <Save size={14} />} {x.save}
            </button>
          )}
          {pm.qr && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => run("rq", () => api.removePayMethodQr(pm.key))} disabled={readOnly || !!busy}>
              {m.removeQr}
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" style={{ marginLeft: "auto" }} onClick={() => window.confirm(m.delSure) && run("del", () => api.removePayMethod(pm.key))} disabled={readOnly || !!busy}>
            <Trash2 size={14} /> {x.remove}
          </button>
        </div>
      </div>
      <datalist id="ev-banks">
        {BANKS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
    </article>
  );
}

// ============================================================ Add-ons ============================================================
export function AddonsTab({ ctx }) {
  const { x, lang, data, readOnly } = ctx;
  const lic = data.license;
  const date = (d) => (d ? new Date(d).toLocaleDateString(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
  const order = useMemo(() => ["ev_autopay", "ev_certs", "ev_waitlist", "ev_pricing", "ev_referrals", "ev_bundles", "ev_feedback", "ev_sponsors", "ev_telegram", "ev_guest_tg", "ev_seats", "ev_shows", "ev_promos", "ev_questions", "ev_cashier", "ev_invites", "ev_doors", "ev_team", "ev_export", "ev_nobrand"].filter((k) => data.addons[k]), [data.addons]);
  return (
    <div className="rs-col">
      <Head icon={Puzzle} title={x.addonsTitle} sub={x.addonsSub} />
      <div className="rs-addons">
        <article className="panel-card rs-addon s-active">
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <Ticket size={20} />
            </span>
            <div>
              <h3>{x.renewTitle}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(lic.price)} {x.coins} {x.perYear}
              </span>
            </div>
          </div>
          <p>{x.baseWhat}</p>
          <div className="rs-addon-foot">
            <span className={`rs-pill ${lic.active ? "on" : ""}`}>
              <Check size={13} /> {lic.expires_at ? x.endsOn.replace("{date}", date(lic.expires_at)) : x.unlocked}
            </span>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy("renew")} disabled={!data.business.status}>
              {x.renewFor.replace("{coins}", fmt(lic.price))}
            </button>
          </div>
        </article>
        {order.map((k) => {
          const a = data.addons[k];
          const Icon = ADDON_ICON[k] || Puzzle;
          return (
            <article key={k} className={`panel-card rs-addon s-${a.active ? "active" : "none"}`} data-testid={`ev-addon-${k}`}>
              <div className="rs-addon-top">
                <span className="rs-addon-ic">
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{x.addonNames[k]}</h3>
                  <span className="rs-addon-price">
                    <CoinIcon size={13} /> {fmt(a.price)} {x.coins} {a.days ? x.perYear : `· ${x.forever}`}
                  </span>
                </div>
              </div>
              <p>{x.addonWhat[k]}</p>
              <div className="rs-addon-foot">
                {a.active ? (
                  <>
                    <span className="rs-pill on">
                      <Check size={13} /> {a.expires_at ? x.endsOn.replace("{date}", date(a.expires_at)) : x.unlocked}
                    </span>
                    {a.days && (
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly}>
                        {x.renewFor.replace("{coins}", fmt(a.price))}
                      </button>
                    )}
                  </>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly} data-testid={`ev-buy-${k}`}>
                    <CoinIcon size={14} /> {x.unlock.replace("{coins}", fmt(a.price))}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================ Designs ============================================================
// two kinds, same screen: ticket designs (120 · 15 coins) and event page themes (60 · 25 coins), bought once, used on any event.
// left: every design (filter by style / mine) · right: the preview, then Use / Buy
const SAMPLE_CODE = "K7QX2MPA9D";
const KINDS = {
  ticket: { keys: EV_THEME_KEYS, layouts: ["classic", ...EV_LAYOUTS], of: themeOf, name: themeName, layout: layoutName, field: "theme", colors: "theme_colors", defaults: themeDefaults, data: "themes" },
  page: { keys: PG_THEME_KEYS, layouts: ["live", "standard", ...PG_LAYOUTS], of: pageThemeOf, name: pageThemeName, layout: pageLayoutName, field: "page_theme", colors: "page_colors", defaults: pageDefaults, data: "page_themes" },
};
export function DesignTab({ ctx }) {
  const { x, lang, data, api, readOnly, notify } = ctx;
  const d = x.design;
  const { t: pt } = useEvPubText();
  const [kind, setKind] = useState(() => (ctx.params.get("kind") === "page" ? "page" : "ticket"));
  const K = KINDS[kind];
  const [eid, setEid] = useState(() => firstEvent(ctx));
  const ev = data.events.find((e) => e._id === eid) || null;
  const owned = data[K.data]?.owned || [];
  const price = data[K.data]?.price || 0;
  const has = (k) => K.of(k).tier === "free" || owned.includes(k);
  const current = ev ? ev[K.field] || K.keys[0] : K.keys[0];
  const [pick, setPick] = useState(current);
  const savedColors = (k) => (ev && k === current ? { ...(ev[K.colors] || {}) } : {});
  const [colors, setColors] = useState(() => savedColors(current));
  const def = K.defaults(pick);
  const colorsDirty = ["a", "b", "c"].some((c) => (colors[c] || "") !== ((pick === current && ev?.[K.colors]?.[c]) || ""));
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL(ticketUrl(SAMPLE_CODE), { width: 320, margin: 1 }).then(setQr).catch(() => {});
  }, []);
  useEffect(() => {
    setPick(current);
    setColors(savedColors(current));
    setFilter("all");
  }, [eid, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (k) => {
    setPick(k);
    setColors(savedColors(k));
  };
  const sub = (kind === "ticket" ? d.sub : d.pageSub).replace("{n}", K.keys.length - 1).replace("{coins}", fmt(price));
  const switcher = (
    <div className="lang-switch sa-type-switch ev-th-kinds" role="group">
      {["ticket", "page"].map((k) => (
        <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} data-testid={`ev-th-kind-${k}`}>
          {k === "ticket" ? <Ticket size={14} /> : <Palette size={14} />} {d.kinds[k].replace("{n}", KINDS[k].keys.length - 1)}
        </button>
      ))}
    </div>
  );
  if (!ev)
    return (
      <div className="rs-col">
        <Head icon={Palette} title={d.title} sub={sub} />
        <div className="panel-card ev-empty">
          <p>{d.needEvent}</p>
          <button type="button" className="md-btn md-btn-primary" onClick={() => ctx.go("events")}>
            <Plus size={15} /> {x.tabs.events}
          </button>
        </div>
      </div>
    );
  const sample = () => ({ code: SAMPLE_CODE, no: 1, type_name: ev.types?.[0]?.name || "Standard", holder: lang === "km" ? "សុខ ដារ" : "Sok Dara", status: "valid" });
  const shown = K.keys.filter((k) => filter === "all" || (filter === "mine" ? has(k) : filter === "live" ? isLive(k) : K.of(k).layout === filter));
  const view = (k, big) =>
    kind === "ticket" ? (
      <TicketCard tk={sample()} ev={ev} theme={k} colors={big ? colors : undefined} t={pt} lang={lang} qrSrc={qr || undefined} preview />
    ) : (
      <PagePreview ev={ev} org={data.org} theme={k} ticketTheme={ev.theme} colors={big ? colors : undefined} t={pt} lang={lang} />
    );
  const use = async () => {
    setBusy(true);
    try {
      await api.saveEvent(ev._id, { [K.field]: pick, [K.colors]: { a: colors.a || "", b: colors.b || "", c: colors.c || "" } });
      await ctx.reload();
      notify({ type: "success", text: d.used });
    } catch (e) {
      if (e.body?.product) ctx.askBuy({ theme: pick, event: ev._id, kind });
      else notify({ type: "error", text: errOf(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rs-col">
      <Head icon={Palette} title={d.title} sub={sub}>
        <label className="ev-th-for">
          <span>{d.event}</span>
          <EventPick ctx={ctx} value={eid} onChange={setEid} />
        </label>
      </Head>
      {switcher}
      <div className="ev-th-layout">
        <section className="panel-card">
          <div className="lang-switch sa-type-switch ev-th-filters" role="group">
            {["all", "mine", ...K.layouts].map((k) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} data-testid={`ev-th-f-${k}`}>
                {k === "all" ? d.all : k === "mine" ? d.mine : k === "live" ? `● ${d.live}` : K.layout(k, lang)}
              </button>
            ))}
          </div>
          <div className={`ev-th-grid ${kind === "page" ? "pages" : ""} evp ev-th-scope`} data-testid="ev-themes">
            {shown.map((k) => (
              <button key={k} type="button" className={`ev-th-pick ${pick === k ? "on" : ""}`} onClick={() => choose(k)} data-testid={`ev-th-${k}`} title={K.name(k, lang)}>
                <span className="ev-th-thumb">
                  {kind === "page" && isLive(k) && <i className="ev-th-live">● {d.live}</i>}
                  <span className="ev-th-mini">{view(k)}</span>
                </span>
                <span className="ev-th-meta">
                  <span>{K.name(k, lang)}</span>
                  {current === k ? (
                    <Check size={14} />
                  ) : has(k) ? (
                    <small>{K.of(k).tier === "free" ? d.free : d.owned}</small>
                  ) : (
                    <small>
                      <CoinIcon size={11} /> {fmt(price)}
                    </small>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>
        <aside className="ev-th-preview">
          <b>
            {d.preview} · {K.name(pick, lang)}
          </b>
          {kind === "ticket" ? (
            <div className="evp ev-th-scope ev-th-big" style={pageVars(pick, colors)}>
              {view(pick, true)}
              <div className="ev-th-page">
                <small>{d.page}</small>
                <span className="evp-btn">{pt.buy}</span>
              </div>
            </div>
          ) : (
            <div className="ev-th-big ev-pg-big">{view(pick, true)}</div>
          )}
          <div className="ev-th-colors" data-testid="ev-th-colors">
            <small>{d.colors}</small>
            <div>
              {["a", "b", "c"].map((c) => (
                <label key={c} title={d.colorNames[c]}>
                  <input type="color" value={colors[c] || def[c]} onChange={(e) => setColors((o) => ({ ...o, [c]: e.target.value }))} data-testid={`ev-th-color-${c}`} />
                  <span>{d.colorNames[c]}</span>
                </label>
              ))}
              {(colors.a || colors.b || colors.c) && (
                <button type="button" className="sa-link" onClick={() => setColors({})} data-testid="ev-th-color-reset">
                  <RotateCcw size={13} /> {d.colorReset}
                </button>
              )}
            </div>
          </div>
          {current === pick && colorsDirty ? (
            <button type="button" className="md-btn md-btn-primary" onClick={use} disabled={readOnly || busy} data-testid="ev-th-save-colors">
              {busy ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {d.saveColors}
            </button>
          ) : current === pick ? (
            <div className="ev-th-inuse">
              <CheckCircle2 size={16} /> {d.inUse}
            </div>
          ) : has(pick) ? (
            <button type="button" className="md-btn md-btn-primary" onClick={use} disabled={readOnly || busy} data-testid="ev-th-use">
              {busy ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {d.use}
            </button>
          ) : (
            <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ theme: pick, event: ev._id, kind })} disabled={readOnly} data-testid="ev-th-buy">
              <CoinIcon size={15} /> {d.buy.replace("{coins}", fmt(price))}
            </button>
          )}
          {kind === "ticket" && has(pick) && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => saveTicketImage(document.querySelector(".ev-th-big .evp-ticket"), `ticket-${pick}.png`)} data-testid="ev-th-save">
              <Download size={14} /> {d.save}
            </button>
          )}
          {ev.status !== "draft" && (
            <a className="md-btn md-btn-ghost sa-btn-sm" href={eventUrl(ev.slug)} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> {d.open}
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
