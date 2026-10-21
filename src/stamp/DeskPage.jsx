import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { BarChart3, CalendarCheck, Delete, Gift, History, Loader2, Lock, Search, Stamp, Star, UserRound, Users } from "lucide-react";
import DeskCore from "./DeskCore";
import { HistoryTab, StatsTab } from "../dashboard/client/stamp/ScTabs";
import { stampDesk } from "../api/services";
import { useStampText } from "./text";
import { useScText, fmt, ago, prettyPhone } from "../dashboard/client/stamp/text";
import "../dashboard/admin/master_data/masterdata.css";
import "../dashboard/super_admin/super-admin.css";
import "../dashboard/client/restaurant/restaurant.css";
import "../dashboard/client/menuqr/menuqr.css";
import "./stamp.css";

const key = (slug) => `sc_desk:${slug}`;
const read = (slug) => {
  try {
    return JSON.parse(localStorage.getItem(key(slug)) || "{}");
  } catch {
    return {};
  }
};

// one customer row (lists on the desk)
function Row({ m, goal, x, onPick }) {
  return (
    <button type="button" className="sc-row" onClick={() => onPick(m)} data-testid="sc-desk-row">
      <span className="sc-av">{String(m.name || "?").trim().slice(0, 1).toUpperCase()}</span>
      <span className="sc-row-main">
        <b>
          {m.name} <small className="rs-muted">#{m.no}</small>
        </b>
        <small>
          {m.phone ? `${prettyPhone(m.phone)} · ` : ""}
          {m.last_visit_at ? x.lastVisit.replace("{ago}", ago(m.last_visit_at, x)) : x.neverVisit}
        </small>
      </span>
      <span className="sc-row-side">
        <b>
          {m.stamps}/{goal}
        </b>
        {m.ready?.length > 0 ? (
          <span className="sc-pill-ready">{x.readyNow}</span>
        ) : (
          <span className="sc-bar-mini" aria-hidden="true">
            <i style={{ width: `${Math.min(100, (m.stamps / goal) * 100)}%` }} />
          </span>
        )}
      </span>
    </button>
  );
}

// the staff's customer list: search, filters, sort — tap one to open the card
function DeskCustomers({ api, x, goal, onPick }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(null);
  const [pg, setPg] = useState({ page: 1, pages: 1, total: 0 });
  const [error, setError] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const load = useCallback(
    (page = 1) =>
      api
        .members({ filter, sort, q: query, page })
        .then((r) => {
          setRows((cur) => (page === 1 ? r.data : [...(cur || []), ...r.data]));
          setPg({ page, pages: r.pagination.totalPages || 1, total: r.pagination.total });
        })
        .catch((e) => setError(e.message)),
    [api, filter, sort, query],
  );
  useEffect(() => {
    load(1);
  }, [load]);
  return (
    <section className="panel-card sc-desk-list" data-testid="sc-desk-customers">
      <div className="md-toolbar">
        <label className="md-search" style={{ flex: "1 1 200px" }}>
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={x.search} aria-label={x.search} data-testid="sc-desk-search" />
        </label>
        <select className="sa-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="sort">
          {Object.entries(x.sort).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="lang-switch sa-type-switch sc-chips" role="group">
        {Object.entries(x.filters)
          .filter(([k]) => k !== "deleted" && k !== "recent")
          .map(([k, v]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} data-testid={`sc-desk-filter-${k}`}>
              {v}
            </button>
          ))}
        {rows && <small className="rs-muted sc-count">{fmt(pg.total)}</small>}
      </div>
      {error && <div className="sc-error">{error}</div>}
      <div className="sc-rows">
        {!rows ? <Loader2 size={18} className="md-spin" /> : !rows.length ? <p className="rs-muted">{query || filter !== "all" ? x.noResults : x.noCustomers}</p> : rows.map((m) => <Row key={m._id} m={m} goal={goal} x={x} onPick={onPick} />)}
      </div>
      {rows && pg.page < pg.pages && (
        <button type="button" className="md-btn md-btn-ghost" onClick={() => load(pg.page + 1)}>
          {x.more}
        </button>
      )}
    </section>
  );
}

const TABS = [
  ["stamp", Stamp],
  ["customers", Users],
  ["stats", BarChart3],
  ["history", History],
];

// /stamp/desk/<slug>: the counter phone — PIN once, then scan cards and add stamps (no owner account needed)
export default function DeskPage() {
  const { slug } = useParams();
  const { t, lang, setLang } = useStampText();
  const { x } = useScText();
  const [saved, setSaved] = useState(() => read(slug));
  const [d, setD] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState(false);
  const [tab, setTab] = useState("stamp");
  const [pick, setPick] = useState(null); // a customer tapped in a list → open on the Stamp tab
  const [open, setOpen] = useState(null); // the customer open on the Stamp tab
  const [lists, setLists] = useState({ ready: null, recent: null });
  const [tick, setTick] = useState(0); // reload the lists after a stamp
  const api = useMemo(() => stampDesk(slug, saved.token || "", saved.name || ""), [slug, saved]);
  const store = (v) => {
    try {
      localStorage.setItem(key(slug), JSON.stringify(v));
    } catch {
      /* private mode */
    }
    setSaved(v);
  };
  const load = useCallback(() => {
    if (!saved.token) return;
    api
      .get()
      .then((r) => setD(r.data))
      .catch((e) => {
        if (e.status === 401) store({ name: saved.name || "" });
        else if (e.status === 403 || e.status === 404) setOff(e.message);
      });
  }, [api, saved.token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!saved.token || !d) return;
    Promise.all([api.members({ filter: "ready", sort: "stamps" }), api.members({ sort: "recent" })])
      .then(([r, c]) => setLists({ ready: r.data, recent: c.data.filter((m) => m.last_visit_at).slice(0, 8) }))
      .catch(() => {});
  }, [api, saved.token, !!d, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (m) => {
    setPick({ ...m });
    setTab("stamp");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deskCtx = useMemo(() => ({ x, lang, api, notify: (n) => n?.type === "error" && setError(n.text) }), [x, lang, api]);
  useEffect(() => {
    document.title = `${t.deskTitle}${d ? ` · ${d.shop.name}` : ""}`;
  }, [d, t.deskTitle]);

  const login = async (value) => {
    setBusy(true);
    setError("");
    try {
      const r = await stampDesk(slug).login(value);
      store({ token: r.data.token, name: saved.name || "" });
    } catch (e) {
      setError(e.status === 401 ? t.pinWrong : e.message);
      setPin("");
      if (e.status === 403 || e.status === 404) setOff(e.message);
    } finally {
      setBusy(false);
    }
  };
  const press = (k) => {
    if (busy) return;
    const next = k === "del" ? pin.slice(0, -1) : (pin + k).slice(0, 8);
    setPin(next);
    setError("");
  };
  const langBtn = (
    <button type="button" className="sc-lang" onClick={() => setLang(lang === "km" ? "en" : "km")}>
      {lang === "km" ? "EN" : "ខ្មែរ"}
    </button>
  );

  if (off)
    return (
      <div className="sc-page">
        <div className="sc-sheet sc-off">
          <Stamp size={30} />
          <h1>{t.deskTitle}</h1>
          <p>{off}</p>
        </div>
      </div>
    );
  if (!saved.token)
    return (
      <div className="sc-page sc-desk-page">
        <div className="sc-sheet sc-pin" data-testid="sc-pin">
          <div className="sc-top">{langBtn}</div>
          <Lock size={28} />
          <h1>{t.deskTitle}</h1>
          <p className="sc-sub">{t.pin}</p>
          <div className="sc-pin-dots">
            {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
              <i key={i} className={i < pin.length ? "on" : ""} />
            ))}
          </div>
          {error && <div className="sc-error">{error}</div>}
          <div className="sc-pad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "ok"].map((k) =>
              k === "ok" ? (
                <button key={k} type="button" className="ok" onClick={() => login(pin)} disabled={pin.length < 4 || busy} data-testid="sc-pin-ok">
                  {busy ? <Loader2 size={18} className="md-spin" /> : t.enter}
                </button>
              ) : (
                <button key={k} type="button" onClick={() => press(k)} aria-label={k === "del" ? "⌫" : k} data-testid={`sc-pin-${k}`}>
                  {k === "del" ? <Delete size={20} /> : k}
                </button>
              ),
            )}
          </div>
          <label className="sc-form sc-staff-name">
            <span>{t.yourName}</span>
            <input value={saved.name || ""} maxLength={40} onChange={(e) => setSaved({ ...saved, name: e.target.value })} />
          </label>
        </div>
      </div>
    );
  if (!d)
    return (
      <div className="sc-page">
        <Loader2 size={26} className="md-spin" />
      </div>
    );
  const goal = d.shop.goal;
  const tiles = [
    [CalendarCheck, t.visits, d.today.visits],
    [Star, t.stampsWord, d.today.stamps],
    [Gift, t.rewardsWord, d.today.rewards],
    [UserRound, t.readyTile, lists.ready?.length ?? "…", () => setTab("customers")],
  ];
  return (
    <div className="sc-desk-wrap" style={{ "--sc-accent": d.shop.color || undefined }} data-testid="sc-desk-page">
      <header className="sc-desk-head">
        <span className="sc-card-logo">{d.shop.logo ? <img src={d.shop.logo} alt="" /> : <Stamp size={18} />}</span>
        <div>
          <b>{d.shop.name}</b>
          <small>{saved.name ? t.staffAs.replace("{name}", saved.name) : t.deskTitle}</small>
        </div>
        {langBtn}
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => store({ name: saved.name || "" })} data-testid="sc-desk-lock">
          <Lock size={14} /> <span className="sc-hide-sm">{t.logout}</span>
        </button>
      </header>
      <nav className="sc-desk-tabs" role="tablist">
        {TABS.map(([k, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)} data-testid={`sc-desk-tab-${k}`}>
            <Icon size={19} />
            <span>{t.tabs[k]}</span>
          </button>
        ))}
      </nav>
      <main className="sc-desk-main">
        {error && tab !== "stamp" && <div className="sc-error">{error}</div>}
        <div hidden={tab !== "stamp"}>
          <div className="sc-desk-tiles">
            {tiles.map(([Icon, label, v, go]) => (
              <button key={label} type="button" className={`sc-desk-tile ${go ? "go" : ""}`} onClick={go} disabled={!go}>
                <Icon size={17} />
                <small>{go ? label : `${label} · ${t.today}`}</small>
                <b>{typeof v === "number" ? fmt(v) : v}</b>
              </button>
            ))}
          </div>
          <DeskCore
            x={x}
            lang={lang}
            shop={d.shop}
            api={api}
            maxPerVisit={d.max_per_visit}
            readOnly={d.read_only}
            canReset={!!d.can_reset}
            pick={pick}
            onMember={setOpen}
            onChanged={() => {
              load();
              setTick((n) => n + 1);
            }}
          />
          {!open && (
            <div className="sc-desk-quick">
              {lists.ready?.length > 0 && (
                <section className="panel-card">
                  <h3 className="dk-h3">
                    <Gift size={16} /> {t.readyList} <small className="rs-muted">{fmt(lists.ready.length)}</small>
                  </h3>
                  <div className="sc-rows">
                    {lists.ready.slice(0, 6).map((m) => (
                      <Row key={m._id} m={m} goal={goal} x={x} onPick={choose} />
                    ))}
                  </div>
                </section>
              )}
              {lists.recent?.length > 0 && (
                <section className="panel-card">
                  <h3 className="dk-h3">
                    <History size={16} /> {t.recentList}
                  </h3>
                  <div className="sc-rows">
                    {lists.recent.map((m) => (
                      <Row key={m._id} m={m} goal={goal} x={x} onPick={choose} />
                    ))}
                  </div>
                  <small className="rs-muted">{t.tapToOpen}</small>
                </section>
              )}
            </div>
          )}
        </div>
        {tab === "customers" && <DeskCustomers api={api} x={x} goal={goal} onPick={choose} />}
        {tab === "stats" && <StatsTab ctx={deskCtx} />}
        {tab === "history" && <HistoryTab ctx={deskCtx} />}
      </main>
    </div>
  );
}
