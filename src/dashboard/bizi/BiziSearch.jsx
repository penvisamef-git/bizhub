import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, BedDouble, BookOpen, FileText, Package, QrCode, ReceiptText, Search, StickyNote, Store, Ticket, UserRound, X } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import { memo } from "../../lib/memo";
import { myBusinessService, searchService, teamService } from "../../api/services";
import { bizTypeName } from "../super_admin/BizTypes";
import BiziFace from "./BiziFace";
import { BIZI_PAGES } from "./pages.gen";
import { biziText } from "./text";

// Bizi search (v3.0.0): ⌘K / Ctrl K or the corner bubble.
//   Pages — every section of every business I can open, from the dashboards' own tab names (EN + KM), found here
//           without asking the server ("delivery" → Mekong Coffee Shop › Delivery)
//   the rest — GET /api/user/search: products, orders, bookings, people, events, notes… in all my businesses
const GROUPS = ["pages", "businesses", "products", "orders", "people", "other"];
const KIND_ICON = { product: Package, order: ReceiptText, stay: BedDouble, person: UserRound, event: Ticket, note: StickyNote, book: BookOpen, qr: QrCode, page: FileText, business: Store, tab: ArrowUpRight };
// the words of a status, wherever it comes from (orders, bills, stays, events)
const STATUS = {
  en: { new: "New", accepted: "Making", ready: "Ready", on_way: "On the way", done: "Done", cancelled: "Cancelled", open: "Open", paid: "Paid", void: "Void", booked: "Booked", in: "Staying", out: "Checked out", no_show: "No-show", pending: "Waiting", review: "To check", rejected: "Rejected", expired: "Expired", published: "On sale", draft: "Draft", closed: "Closed" },
  km: { new: "ថ្មី", accepted: "កំពុងធ្វើ", ready: "រួចរាល់", on_way: "កំពុងដឹក", done: "បានបញ្ចប់", cancelled: "បានបោះបង់", open: "បើក", paid: "បានបង់", void: "បានលុប", booked: "បានកក់", in: "កំពុងស្នាក់", out: "បានចេញ", no_show: "មិនមក", pending: "កំពុងរង់ចាំ", review: "ត្រូវពិនិត្យ", rejected: "បានបដិសេធ", expired: "ផុតកំណត់", published: "កំពុងលក់", draft: "ព្រាង", closed: "បានបិទ" },
};
const money = (v, cur) => (v === undefined || v === null || v === "" ? "" : cur === "KHR" ? `${new Intl.NumberFormat("en-US").format(Math.round(Number(v) || 0))}៛` : `$${(Number(v) || 0).toFixed(2)}`);
const words = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
const linkOf = (id, tab, params) => {
  const sp = new URLSearchParams();
  if (tab) sp.set("tab", tab);
  Object.entries(params || {}).forEach(([k, v]) => v && sp.set(k, v));
  const s = sp.toString();
  return `/app/business/${id}${s ? `?${s}` : ""}`;
};

// the businesses I can open (own + shared), from what the dashboard already loaded, else asked once
function useMyBusinesses() {
  const [list, setList] = useState(() => [...(memo.get("myBusinesses") || []), ...(memo.get("sharedBusinesses") || []).filter((b) => b.team_on).map((b) => ({ ...b, shared: true }))]);
  useEffect(() => {
    if (memo.get("myBusinesses")) return;
    let live = true;
    Promise.all([myBusinessService.list().catch(() => ({ data: [] })), teamService.shared().catch(() => ({ data: {} }))]).then(([own, sh]) => {
      if (!live) return;
      memo.set("myBusinesses", own.data || []);
      memo.set("sharedBusinesses", sh.data?.businesses || []);
      setList([...(own.data || []), ...(sh.data?.businesses || []).filter((b) => b.team_on).map((b) => ({ ...b, shared: true }))]);
    });
    return () => {
      live = false;
    };
  }, []);
  return list;
}

// the sections of my businesses whose name has the words (best first)
function findPages(list, q, lang) {
  const ws = words(q);
  if (!ws.length) return [];
  const out = [];
  for (const b of list) {
    const type = b.category;
    const typeName = bizTypeName(type, lang).toLowerCase();
    const tabs = BIZI_PAGES[type]?.tabs || [];
    for (const [key, en, km] of tabs) {
      const label = `${en} ${km}`.toLowerCase();
      const hay = `${label} ${b.name.toLowerCase()} ${typeName}`;
      if (!ws.every((w) => hay.includes(w))) continue;
      if (!ws.some((w) => label.includes(w))) continue; // the words must name the section, not only the business
      const score = ws.reduce((s, w) => s + (en.toLowerCase().startsWith(w) || km.startsWith(w) ? 3 : label.includes(w) ? 2 : 1), 0);
      out.push({ group: "pages", kind: "tab", id: `${b._id}:${key}`, business_id: b._id, business: b.name, category: type, title: lang === "km" ? km : en, sub: lang === "km" ? en : km, tab: key, score });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 8);
}

export default function BiziSearch({ onClose }) {
  const { lang } = useI18n();
  const x = biziText(lang);
  const st = STATUS[lang] || STATUS.en;
  const navigate = useNavigate();
  const list = useMyBusinesses();
  const [q, setQ] = useState("");
  const [api, setApi] = useState({ q: "", results: [] });
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const ask = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ask the server a moment after the typing stops; an older answer never replaces a newer one
  useEffect(() => {
    const term = q.trim();
    setActive(0);
    if (term.length < 2 && !/^#?\d+$/.test(term)) {
      setApi({ q: term, results: [] });
      setBusy(false);
      setTyping(false);
      return undefined;
    }
    setTyping(true);
    const n = ++ask.current;
    const t = setTimeout(() => {
      setTyping(false);
      setBusy(true);
      searchService
        .find(term)
        .then((r) => {
          if (n !== ask.current) return;
          setOffline(false);
          setApi({ q: term, results: (r.data?.results || []).filter((it) => it.group !== "businesses") });
        })
        .catch(() => n === ask.current && setOffline(true))
        .finally(() => n === ask.current && setBusy(false));
    }, 260);
    return () => clearTimeout(t);
  }, [q]);

  const term = q.trim();
  const ws = words(term);
  const businesses = useMemo(() => (ws.length ? list.filter((b) => ws.every((w) => `${b.name} ${bizTypeName(b.category, lang)}`.toLowerCase().includes(w))).slice(0, 6) : []), [list, term, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const pages = useMemo(() => findPages(list, term, lang), [list, term, lang]);
  const rows = useMemo(() => {
    if (!term) return list.slice(0, 8).map((b) => ({ group: "businesses", kind: "business", id: b._id, business_id: b._id, business: b.name, category: b.category, title: b.name, sub: bizTypeName(b.category, lang), shared: b.shared, logo: b.photo || b.logo_url }));
    const fromApi = api.q === term ? api.results : [];
    const all = [...pages, ...businesses.map((b) => ({ group: "businesses", kind: "business", id: b._id, business_id: b._id, business: b.name, category: b.category, title: b.name, sub: bizTypeName(b.category, lang), shared: b.shared, logo: b.photo || b.logo_url })), ...fromApi];
    return GROUPS.flatMap((g) => all.filter((it) => it.group === g));
  }, [term, pages, businesses, api, list, lang]);

  const go = (it) => {
    onClose();
    navigate(linkOf(it.business_id, it.tab, it.params));
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && rows[active]) {
      e.preventDefault();
      go(rows[active]);
    }
  };
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const waiting = typing || busy;
  const mood = !term ? "idle" : waiting ? "thinking" : rows.length ? "happy" : "worried";
  let lastGroup = "";

  return (
    <div className="bizi-layer" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bizi-box" role="dialog" aria-modal="true" aria-label={x.label}>
        <div className="bizi-top">
          <span className="bizi-top-face" aria-hidden="true">
            <BiziFace mood={typing ? "listening" : mood} size={40} />
          </span>
          <label className="bizi-field">
            <Search size={18} aria-hidden="true" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder={x.ph}
              aria-label={x.label}
              role="combobox"
              aria-expanded="true"
              aria-controls="bizi-list"
              aria-activedescendant={rows[active] ? `bizi-o-${active}` : undefined}
              autoComplete="off"
              spellCheck="false"
              data-testid="bizi-input"
            />
          </label>
          <button type="button" className="bizi-x" onClick={onClose} aria-label={x.close}>
            <X size={18} />
          </button>
        </div>

        <div className="bizi-list" id="bizi-list" role="listbox" ref={listRef} aria-label={x.label}>
          {!term && (
            <p className="bizi-note">{x.start}</p>
          )}
          {rows.map((it, i) => {
            const head = it.group !== lastGroup ? (term ? x.groups[it.group] : x.quick) : null;
            lastGroup = it.group;
            const Ic = KIND_ICON[it.kind] || ArrowUpRight;
            const flag = it.flag ? x[it.flag] : "";
            const right = it.status ? st[it.status] || it.status : "";
            return (
              <div key={`${it.group}:${it.id}:${i}`}>
                {head && <div className="bizi-head">{head}</div>}
                <Link
                  to={linkOf(it.business_id, it.tab, it.params)}
                  id={`bizi-o-${i}`}
                  role="option"
                  aria-selected={i === active}
                  data-i={i}
                  className={`bizi-row${i === active ? " on" : ""}`}
                  onMouseMove={() => i !== active && setActive(i)}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey) return; // a new tab: leave it to the browser
                    e.preventDefault();
                    go(it);
                  }}
                  data-testid="bizi-row"
                >
                  <span className={`bizi-ic k-${it.kind}`}>{it.logo ? <img src={it.logo} alt="" /> : <Ic size={17} aria-hidden="true" />}</span>
                  <span className="bizi-txt">
                    <b>{it.title}</b>
                    <small>{[it.kind === "business" ? "" : it.business, it.sub, it.shared ? x.shared : ""].filter(Boolean).join(" · ")}</small>
                  </span>
                  {flag && <span className="bizi-chip warn">{flag}</span>}
                  {right && <span className="bizi-chip">{right}</span>}
                  {money(it.money, it.cur) && <span className="bizi-money">{money(it.money, it.cur)}</span>}
                  {i === active && (
                    <kbd className="bizi-kbd" aria-hidden="true">
                      ↵
                    </kbd>
                  )}
                </Link>
              </div>
            );
          })}
          {term && waiting && <p className="bizi-note busy">{x.busy}</p>}
          {term && !waiting && offline && <p className="bizi-note">{x.offline}</p>}
          {term && !waiting && !offline && rows.length === 0 && (
            <div className="bizi-none">
              <b>{x.empty.replace("{q}", term)}</b>
              <span>{x.emptySub}</span>
            </div>
          )}
        </div>

        <div className="bizi-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {x.hints.move}
          </span>
          <span>
            <kbd>↵</kbd> {x.hints.open}
          </span>
          <span>
            <kbd>Esc</kbd> {x.hints.close}
          </span>
          <span>
            <kbd>{x.keys}</kbd> {x.hints.anywhere}
          </span>
          <span className="bizi-soon">{x.soon}</span>
        </div>
      </div>
    </div>
  );
}
