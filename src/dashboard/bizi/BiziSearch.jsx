import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, BedDouble, BookOpen, Clock, FileText, Languages, LayoutGrid, Moon, Package, QrCode, ReceiptText, Search, Sparkles, StickyNote, Store, Sun, Ticket, UserRound, X } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { memo } from "../../lib/memo";
import { myBusinessService, searchService, teamService } from "../../api/services";
import { bizTypeName } from "../super_admin/BizTypes";
import BiziFace from "./BiziFace";
import { BIZI_PAGES } from "./pages.gen";
import { GLOBAL_PAGES, SUGGEST, TAB_WORDS, hit, pageName } from "./smart";
import { biziText } from "./text";

// Bizi search (v3.0.0): ⌘K / Ctrl K or the corner bubble.
//   here, without the server: every section of every business I can open (their own EN + KM names, more words
//   for each, small typing mistakes), the BizHub pages (wallet, buy coins…), dark mode / language, my recent picks
//   the server (GET /api/user/search): products, orders, bookings, people, events, notes… in all my businesses,
//   and the smart words ("new", "unpaid orders today", "sold out", "ការកម្ម៉ង់ថ្មី")
const GROUPS = ["smart", "pages", "businesses", "products", "orders", "people", "other"];
const KIND_ICON = { product: Package, order: ReceiptText, stay: BedDouble, person: UserRound, event: Ticket, note: StickyNote, book: BookOpen, qr: QrCode, page: FileText, business: Store, tab: ArrowUpRight, app: LayoutGrid, recent: Clock };
// the words of a status, wherever it comes from (orders, bills, stays, events)
const STATUS = {
  en: { new: "New", accepted: "Making", ready: "Ready", on_way: "On the way", done: "Done", cancelled: "Cancelled", open: "Open", paid: "Paid", void: "Void", booked: "Booked", in: "Staying", out: "Checked out", no_show: "No-show", pending: "Waiting", review: "To check", rejected: "Rejected", expired: "Expired", published: "On sale", draft: "Draft", closed: "Closed" },
  km: { new: "ថ្មី", accepted: "កំពុងធ្វើ", ready: "រួចរាល់", on_way: "កំពុងដឹក", done: "បានបញ្ចប់", cancelled: "បានបោះបង់", open: "បើក", paid: "បានបង់", void: "បានលុប", booked: "បានកក់", in: "កំពុងស្នាក់", out: "បានចេញ", no_show: "មិនមក", pending: "កំពុងរង់ចាំ", review: "ត្រូវពិនិត្យ", rejected: "បានបដិសេធ", expired: "ផុតកំណត់", published: "កំពុងលក់", draft: "ព្រាង", closed: "បានបិទ" },
};
const RECENT_KEY = "bizi_recent";
const money = (v, cur) => (v === undefined || v === null || v === "" ? "" : cur === "KHR" ? `${new Intl.NumberFormat("en-US").format(Math.round(Number(v) || 0))}៛` : `$${(Number(v) || 0).toFixed(2)}`);
const words = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
const linkOf = (it) => {
  if (it.href) return it.href;
  const sp = new URLSearchParams();
  if (it.tab) sp.set("tab", it.tab);
  Object.entries(it.params || {}).forEach(([k, v]) => v && sp.set(k, v));
  const s = sp.toString();
  return `/app/business/${it.business_id}${s ? `?${s}` : ""}`;
};
const readRecent = () => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(v) ? v.slice(0, 6) : [];
  } catch {
    return [];
  }
};
const remember = (it) => {
  if (it.run) return;
  const keep = { kind: it.kind, title: it.title, sub: it.sub, business: it.business, href: linkOf(it), category: it.category, logo: it.logo };
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([keep, ...readRecent().filter((r) => r.href !== keep.href)].slice(0, 6)));
  } catch {
    /* private window */
  }
};

// the words of the search, in bold where they are found
function Marked({ text, ws }) {
  const s = String(text || "");
  if (!ws.length || !s) return s;
  const re = new RegExp(`(${ws.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return s.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

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

// the sections of my businesses + BizHub pages whose name (or more words) has the words — best first
function findPages(list, q, lang) {
  const ws = words(q);
  if (!ws.length) return [];
  const out = [];
  for (const b of list) {
    const type = b.category;
    const typeName = `${bizTypeName(type, "en")} ${bizTypeName(type, "km")}`.toLowerCase();
    for (const [key, en, km] of BIZI_PAGES[type]?.tabs || []) {
      const label = `${en} ${km}`.toLowerCase();
      const more = (TAB_WORDS[key] || "").toLowerCase();
      const name = b.name.toLowerCase();
      let score = 0;
      let named = false;
      for (const w of ws) {
        const inLabel = hit(w, label);
        const inMore = inLabel ? 0 : hit(w, more);
        const inName = inLabel || inMore ? 0 : hit(w, `${name} ${typeName}`);
        if (!inLabel && !inMore && !inName) {
          score = -1;
          break;
        }
        if (inLabel || inMore) named = true;
        score += inLabel ? (en.toLowerCase().startsWith(w) || km.startsWith(w) ? 6 : 4) + inLabel : inMore ? 2 : 1;
      }
      if (score < 0 || !named) continue; // the words must name the section, not only the business
      out.push({ group: "pages", kind: "tab", id: `${b._id}:${key}`, business_id: b._id, business: b.name, category: type, title: lang === "km" ? km : en, sub: lang === "km" ? en : km, tab: key, score });
    }
  }
  for (const [href, key, more] of GLOBAL_PAGES) {
    const label = `${pageName(key, "en")} ${pageName(key, "km")}`.toLowerCase();
    let score = 0;
    for (const w of ws) {
      const a = hit(w, label);
      const m = a ? 0 : hit(w, more.toLowerCase());
      if (!a && !m) {
        score = -1;
        break;
      }
      score += a ? 5 : 2;
    }
    if (score > 0) out.push({ group: "pages", kind: "app", id: `app:${key}`, href, title: pageName(key, lang), sub: "BizHub", score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 8);
}

export default function BiziSearch({ onClose }) {
  const { lang, toggleLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const x = biziText(lang);
  const st = STATUS[lang] || STATUS.en;
  const navigate = useNavigate();
  const list = useMyBusinesses();
  const [q, setQ] = useState("");
  const [api, setApi] = useState({ q: "", results: [], smart: [], fuzzy: false });
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(0);
  const [recent] = useState(readRecent);
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
      setApi({ q: term, results: [], smart: [], fuzzy: false });
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
          const d = r.data || {};
          setApi({ q: term, smart: d.smart || [], fuzzy: !!d.fuzzy, results: (d.results || []).filter((it) => it.group !== "businesses").map((it) => (it.smart ? { ...it, group: "smart" } : it)) });
        })
        .catch(() => n === ask.current && setOffline(true))
        .finally(() => n === ask.current && setBusy(false));
    }, 240);
    return () => clearTimeout(t);
  }, [q]);

  const term = q.trim();
  const ws = words(term);
  const asBiz = (b) => ({ group: "businesses", kind: "business", id: b._id, business_id: b._id, business: b.name, category: b.category, title: b.name, sub: bizTypeName(b.category, lang), shared: b.shared, logo: b.photo || b.logo_url });
  const businesses = useMemo(() => (ws.length ? list.filter((b) => ws.every((w) => hit(w, `${b.name} ${bizTypeName(b.category, "en")} ${bizTypeName(b.category, "km")}`.toLowerCase()))).slice(0, 6) : []), [list, term]); // eslint-disable-line react-hooks/exhaustive-deps
  const pages = useMemo(() => findPages(list, term, lang), [list, term, lang]);
  // two actions anyone may want from the box
  const actions = useMemo(() => {
    if (!ws.length) return [];
    const acts = [
      { kind: "action", id: "theme", icon: theme === "dark" ? Sun : Moon, title: theme === "dark" ? x.light : x.dark, words: "dark light mode night theme colour color ងងឹត ភ្លឺ ពណ៌", run: toggleTheme },
      { kind: "action", id: "lang", icon: Languages, title: lang === "km" ? "English" : "ភាសាខ្មែរ", words: "language khmer english lang ភាសា ខ្មែរ អង់គ្លេស", run: toggleLang },
    ];
    return acts.filter((a) => ws.every((w) => hit(w, `${a.title} ${a.words}`.toLowerCase()))).map((a) => ({ ...a, group: "pages", sub: x.action }));
  }, [term, theme, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    if (!term) return [...recent.map((r, i) => ({ ...r, group: "recent", id: `r${i}` })), ...list.slice(0, 8).map(asBiz)];
    const fromApi = api.q === term ? api.results : [];
    const all = [...pages, ...actions, ...businesses.map(asBiz), ...fromApi];
    return GROUPS.flatMap((g) => all.filter((it) => it.group === g));
  }, [term, pages, actions, businesses, api, list, lang, recent]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (it) => {
    if (it.run) {
      it.run();
      return;
    }
    remember(it);
    onClose();
    navigate(linkOf(it));
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
  const smartHead = `${x.groups.smart} · ${(api.q === term ? api.smart : []).map((k) => x.smart[k] || k).join(" · ")}`;
  const headOf = (g) => (g === "smart" ? smartHead : g === "recent" ? x.recent : !term ? x.quick : x.groups[g]);
  const markWs = ws.filter((w) => w.length > 1);
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
            <div className="bizi-start">
              <p className="bizi-note">{x.start}</p>
              <div className="bizi-sugg" role="group" aria-label={x.try}>
                <span>
                  <Sparkles size={14} aria-hidden="true" /> {x.try}
                </span>
                {(SUGGEST[lang] || SUGGEST.en).map(([v, label]) => (
                  <button key={v} type="button" onClick={() => setQ(v)} data-testid="bizi-sugg">
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {term && !waiting && api.fuzzy && api.q === term && <p className="bizi-note fuzzy">{x.fuzzy.replace("{q}", term)}</p>}
          {rows.map((it, i) => {
            const head = it.group !== lastGroup ? headOf(it.group) : null;
            lastGroup = it.group;
            const Ic = it.icon || KIND_ICON[it.group === "recent" ? "recent" : it.kind] || ArrowUpRight;
            const flag = it.flag ? x[it.flag] : "";
            const right = it.status ? st[it.status] || it.status : "";
            const sub = [it.kind === "business" || it.kind === "app" || it.kind === "action" ? "" : it.business, it.sub, it.shared ? x.shared : ""].filter(Boolean).join(" · ");
            return (
              <div key={`${it.group}:${it.id}:${i}`}>
                {head && <div className={`bizi-head${it.group === "smart" ? " smart" : ""}`}>{head}</div>}
                <Link
                  to={it.run ? "#" : linkOf(it)}
                  id={`bizi-o-${i}`}
                  role="option"
                  aria-selected={i === active}
                  data-i={i}
                  className={`bizi-row${i === active ? " on" : ""}`}
                  onMouseMove={() => i !== active && setActive(i)}
                  onClick={(e) => {
                    if (!it.run && (e.metaKey || e.ctrlKey)) return; // a new tab: leave it to the browser
                    e.preventDefault();
                    go(it);
                  }}
                  data-testid="bizi-row"
                >
                  <span className={`bizi-ic k-${it.kind}`}>{it.logo ? <img src={it.logo} alt="" /> : <Ic size={17} aria-hidden="true" />}</span>
                  <span className="bizi-txt">
                    <b>
                      <Marked text={it.title} ws={markWs} />
                    </b>
                    <small>
                      <Marked text={sub} ws={markWs} />
                    </small>
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
