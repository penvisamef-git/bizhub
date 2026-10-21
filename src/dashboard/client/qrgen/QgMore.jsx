import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  FileStack,
  Inbox,
  Layers,
  LayoutTemplate,
  Link2,
  Loader2,
  Mail,
  MailOpen,
  MapPin,
  Phone,
  Search,
  Palette,
  Printer,
  Puzzle,
  Send,
  Smartphone,
  Store,
  Trash2,
  Unplug,
  Upload,
} from "lucide-react";
import { qrgenService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import { Field, ImagePick } from "../restaurant/parts";
import { QR_DESIGNS, DESIGN_KEYS, designName } from "../../../qrgen/designs";
import { THEME_KEYS } from "../../../qrgen/themes";
import { qrDesignSvg } from "../../../qrgen/qrDesign";
import { ADDON_ICON, BuyFiles, Confirm, Head, Locked, NeedLine, QrView, Switch, printCodes } from "./QgParts";
import { SITE, fmt, fmtDate, fmtTime } from "./text";

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const saveCsv = (rows, file) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([`﻿${rows.map((r) => r.map(csvCell).join(",")).join("\n")}`], { type: "text/csv;charset=utf-8" }));
  a.download = file;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
const localTime = (d) => {
  const t = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
};

// ---------------------------------------- inbox ----------------------------------------
const PHONE_RE = /^[+\d\s().-]{6,}$/;
const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /name|ឈ្មោះ|nom/i;
// who sent it: the "name" answer, or the first text answer
const whoOf = (r) => {
  const list = (r.answers || []).filter((a) => a.value && typeof a.value === "string" && !["rating", "photo", "signature", "number", "date", "checkbox", "radio", "select"].includes(a.kind) && !/^\d+$/.test(a.value));
  return (list.find((a) => NAME_RE.test(a.label)) || list.find((a) => !PHONE_RE.test(a.value) && !MAIL_RE.test(a.value)) || list[0])?.value || "—";
};
const valueText = (v) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));
const phoneOf = (r) => (r.answers || []).find((a) => typeof a.value === "string" && PHONE_RE.test(a.value) && a.value.replace(/\D/g, "").length >= 8)?.value || "";
const mailOf = (r) => (r.answers || []).find((a) => typeof a.value === "string" && MAIL_RE.test(a.value))?.value || "";
const COLORS = ["#E0581A", "#0d9488", "#7c3aed", "#db2777", "#2563eb", "#ca8a04", "#16a34a", "#dc2626"];
const colorOf = (txt) => COLORS[[...String(txt)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];

export function InboxTab({ ctx }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const forms = data.codes.filter((c) => c.type === "form");
  const [code, setCode] = useState(ctx.params.get("code") || "");
  const [filter, setFilter] = useState("all"); // all | unread | 1 | 7 | 30 | range
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState("");
  const load = () =>
    qrgenService
      .replies(id, { code, unread: filter === "unread" ? "1" : "", days: ["1", "7", "30"].includes(filter) ? filter : "", from: filter === "range" ? from : "", to: filter === "range" ? to : "", q: q.trim(), page, limit: 25 })
      .then(setRes)
      .catch((e) => notify({ type: "error", text: e.message }));
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [code, filter, q, page, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ctx.on("qr_forms") && !forms.length)
    return (
      <div className="rs-col">
        <Head icon={Inbox} title={m.inboxTitle} sub={m.inboxSub} />
        <Locked ctx={ctx} addon="qr_forms" />
      </div>
    );
  const per = new Map((res?.per_code || []).map((x) => [String(x.code_id), x]));
  const nameOf = (cid) => data.codes.find((c) => c._id === cid)?.name || "—";
  const whoIs = (r) => {
    const w = whoOf(r);
    return w === "—" ? nameOf(r.code_id) : w;
  };
  const rows = res?.data || [];
  const pg = res?.pagination || { page: 1, pages: 1, total: 0 };
  const sum = res?.summary || { total: 0, unread: 0, today: 0, week: 0 };
  const open = rows.find((r) => r._id === openId) || null;
  const idx = open ? rows.indexOf(open) : -1;
  const ago = (d) => {
    const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (min < 1) return m.justNow;
    if (min < 60) return m.minAgo.replace("{n}", min);
    if (min < 60 * 12) return m.hourAgo.replace("{n}", Math.floor(min / 60));
    return fmtTime(d, lang);
  };
  const setRead = async (r, read) => {
    setRes((x) => x && { ...x, data: x.data.map((y) => (y._id === r._id ? { ...y, read } : y)), summary: x.summary && { ...x.summary, unread: Math.max(0, x.summary.unread + (read ? -1 : 1)) } });
    await qrgenService.readReply(id, r._id, read).catch((e) => notify({ type: "error", text: e.message }));
    ctx.reload();
  };
  const pick = (r) => {
    setOpenId(r._id);
    if (window.innerWidth < 860) setTimeout(() => document.querySelector(".qg-ibx")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    if (!r.read && !readOnly) setRead(r, true);
  };
  const excel = async () => {
    setBusy("x");
    try {
      const r = await qrgenService.replies(id, { code, all: "1" });
      const labels = [...new Set(r.data.flatMap((x) => x.answers.map((a) => a.label)))];
      saveCsv([["Date", "QR", ...labels], ...r.data.map((x) => [localTime(x.created_date), nameOf(x.code_id), ...labels.map((l) => valueText(x.answers.find((a) => a.label === l)?.value))])], `inbox-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setBusy("");
    }
  };
  const copyAll = (r) => {
    const txt = [`${nameOf(r.code_id)} · ${fmtTime(r.created_date, lang)}`, ...r.answers.filter((a) => a.value && valueText(a.value)).map((a) => `${a.label}: ${valueText(a.value)}`)].join("\n");
    navigator.clipboard?.writeText(txt).catch(() => {});
    notify({ type: "success", text: m.copied });
  };
  const filters = [
    ["all", m.fAll],
    ["unread", m.fUnread],
    ["1", m.fToday],
    ["7", m.fWeek],
    ["30", m.fMonth],
    ["range", m.fRange],
  ];
  const tiles = [
    [m.sTotal, sum.total, Inbox, "all"],
    [m.sUnread, sum.unread, Mail, "unread"],
    [m.sToday, sum.today, Clock, "1"],
    [m.sWeek, sum.week, CalendarDays, "7"],
  ];
  return (
    <div className="rs-col">
      <Head icon={Inbox} title={m.inboxTitle} sub={m.inboxSub}>
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={excel} disabled={!!busy || !sum.total}>
          {busy ? <Loader2 size={14} className="md-spin" /> : <Download size={14} />} {m.excel}
        </button>
        <button
          type="button"
          className="md-btn md-btn-ghost sa-btn-sm"
          onClick={async () => {
            await qrgenService.readAll(id, code || undefined);
            load();
            ctx.reload();
          }}
          disabled={readOnly || !sum.unread}
        >
          <CheckCheck size={14} /> {m.readAll}
        </button>
      </Head>
      {!ctx.on("qr_forms") && (
        <section className="panel-card">
          <NeedLine ctx={ctx} addon="qr_forms" />
        </section>
      )}
      <div className="qg-ibx-tiles">
        {tiles.map(([label, n, Icon, f]) => (
          <button
            key={f}
            type="button"
            className={`panel-card qg-ibx-tile ${filter === f ? "on" : ""}`}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
          >
            <span className="qg-ibx-tile-ic">
              <Icon size={18} />
            </span>
            <span>
              <small>{label}</small>
              <b data-testid="qg-ibx-n">{fmt(n)}</b>
            </span>
          </button>
        ))}
      </div>
      {forms.length > 1 && (
        <div className="qg-ibx-forms">
          {[{ _id: "", name: m.allForms }, ...forms].map((c) => {
            const x = c._id ? per.get(c._id) : { n: [...per.values()].reduce((a, y) => a + y.n, 0), unread: [...per.values()].reduce((a, y) => a + y.unread, 0) };
            return (
              <button
                key={c._id || "all"}
                type="button"
                className={code === c._id ? "on" : ""}
                onClick={() => {
                  setCode(c._id);
                  setPage(1);
                  setOpenId(null);
                }}
                data-testid="qg-inbox-form"
              >
                {c.name}
                <small>{fmt(x?.n || 0)}</small>
                {x?.unread ? <i>{x.unread}</i> : null}
              </button>
            );
          })}
        </div>
      )}
      <div className={`qg-ibx ${open ? "reading" : ""}`}>
        <section className="panel-card qg-ibx-list">
          <div className="qg-ibx-tools">
            <label className="fb-search-box">
              <Search size={16} />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder={m.searchReplies}
              />
            </label>
            <div className="qg-seg qg-ibx-seg">
              {filters.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={filter === k ? "on" : ""}
                  onClick={() => {
                    setFilter(k);
                    setPage(1);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {filter === "range" && (
              <div className="qg-ibx-range">
                <label>
                  <small>{m.fromDate}</small>
                  <input type="date" value={from} max={to || undefined} onChange={(e) => (setFrom(e.target.value), setPage(1))} data-testid="qg-ibx-from" />
                </label>
                <label>
                  <small>{m.toDate}</small>
                  <input type="date" value={to} min={from || undefined} onChange={(e) => (setTo(e.target.value), setPage(1))} data-testid="qg-ibx-to" />
                </label>
              </div>
            )}
          </div>
          {!res ? (
            <div className="qg-ibx-empty">
              <Loader2 size={22} className="md-spin" />
            </div>
          ) : !rows.length ? (
            <div className="qg-ibx-empty">
              <Inbox size={30} />
              <p>{m.noReplies}</p>
            </div>
          ) : (
            <ul className="qg-ibx-rows">
              {rows.map((r) => {
                const who = whoIs(r);
                const rest = r.answers
                  .filter((a) => a.value && valueText(a.value) !== who)
                  .map((a) => (a.kind === "photo" ? "📷" : a.kind === "signature" ? "✍️" : a.kind === "rating" ? "★".repeat(Number(a.value) || 0) : valueText(a.value)))
                  .join(" · ");
                return (
                  <li key={r._id}>
                    <button type="button" className={`${r.read ? "" : "new"} ${openId === r._id ? "on" : ""}`} onClick={() => pick(r)} data-testid="qg-reply">
                      <span className="qg-ibx-av" style={{ background: colorOf(who) }}>
                        {who.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="qg-ibx-row-main">
                        <span className="qg-ibx-row-top">
                          <b>{who}</b>
                          <time>{ago(r.created_date)}</time>
                        </span>
                        <span className="qg-ibx-row-sub">{rest || "—"}</span>
                        {!code && <em>{nameOf(r.code_id)}</em>}
                      </span>
                      {!r.read && <i className="qg-ibx-dot" aria-label={m.newTag} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {pg.pages > 1 && (
            <div className="fb-pager">
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={pg.page <= 1} onClick={() => setPage(pg.page - 1)}>
                {m.prev}
              </button>
              <span>
                {pg.page} / {pg.pages}
              </span>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={pg.page >= pg.pages} onClick={() => setPage(pg.page + 1)}>
                {m.next}
              </button>
            </div>
          )}
        </section>
        <section className="panel-card qg-ibx-read" data-testid="qg-reply-open">
          {!open ? (
            <div className="qg-ibx-empty">
              <MailOpen size={34} />
              <p>{m.pickReply}</p>
            </div>
          ) : (
            (() => {
              const who = whoIs(open);
              const tel = phoneOf(open);
              const mail = mailOf(open);
              return (
                <>
                  <header className="qg-ibx-read-head">
                    <button type="button" className="md-icon-btn qg-ibx-back" onClick={() => setOpenId(null)} aria-label={m.close}>
                      <ArrowLeft size={18} />
                    </button>
                    <span className="qg-ibx-av big" style={{ background: colorOf(who) }}>
                      {who.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <h3>{who}</h3>
                      <small className="rs-muted">
                        {m.sentFrom} <b>{nameOf(open.code_id)}</b> · {fmtTime(open.created_date, lang)}
                      </small>
                    </div>
                    <span className="qg-ibx-nav">
                      <button type="button" className="md-icon-btn" disabled={idx <= 0} onClick={() => pick(rows[idx - 1])} aria-label={m.newer} title={m.newer}>
                        <ChevronUp size={17} />
                      </button>
                      <button type="button" className="md-icon-btn" disabled={idx < 0 || idx >= rows.length - 1} onClick={() => pick(rows[idx + 1])} aria-label={m.older} title={m.older}>
                        <ChevronDown size={17} />
                      </button>
                    </span>
                  </header>
                  <div className="qg-ibx-acts">
                    {tel && (
                      <a className="md-btn md-btn-primary sa-btn-sm" href={`tel:${tel.replace(/[^+\d]/g, "")}`}>
                        <Phone size={14} /> {m.callNow}
                      </a>
                    )}
                    {mail && (
                      <a className="md-btn md-btn-ghost sa-btn-sm" href={`mailto:${mail}`}>
                        <Mail size={14} /> {m.emailNow}
                      </a>
                    )}
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => copyAll(open)}>
                      <Copy size={14} /> {m.copyAll}
                    </button>
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setRead(open, !open.read)} disabled={readOnly}>
                      <Check size={14} /> {open.read ? m.markUnread : m.markRead}
                    </button>
                    <button type="button" className="md-icon-btn danger" onClick={() => setDel(open)} disabled={readOnly} aria-label={m.delete} title={m.delete}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <dl className="qg-ibx-fields">
                    {open.answers.map((a) => {
                      const v = valueText(a.value);
                      const long = v.length > 60 || v.includes("\n");
                      return (
                        <div key={a.key} className={long ? "wide" : ""}>
                          <dt>{a.label}</dt>
                          <dd className={v ? "" : "none"}>
                            {!v ? (
                              "—"
                            ) : a.kind === "photo" || a.kind === "signature" ? (
                              <a href={v} target="_blank" rel="noreferrer" className={`qg-ibx-pic ${a.kind}`}>
                                <img src={v} alt={a.label} />
                              </a>
                            ) : a.kind === "rating" ? (
                              <span className="qg-ibx-stars" aria-label={`${v} / 5`}>
                                {"★".repeat(Number(v) || 0)}
                                <i>{"★".repeat(5 - (Number(v) || 0))}</i>
                              </span>
                            ) : a.kind === "checkbox" ? (
                              v.split(", ").map((x) => (
                                <span key={x} className="qg-ibx-chip">
                                  {x}
                                </span>
                              ))
                            ) : PHONE_RE.test(v) && v.replace(/\D/g, "").length >= 8 ? (
                              <a href={`tel:${v.replace(/[^+\d]/g, "")}`}>{v}</a>
                            ) : MAIL_RE.test(v) ? (
                              <a href={`mailto:${v}`}>{v}</a>
                            ) : Array.isArray(a.value) ? (
                              a.value.map((x) => (
                                <span key={x} className="qg-ibx-chip">
                                  {x}
                                </span>
                              ))
                            ) : (
                              v
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </>
              );
            })()
          )}
        </section>
      </div>
      {del && (
        <Confirm
          m={m}
          title={m.removeReply}
          sub={whoIs(del)}
          onClose={() => setDel(null)}
          onYes={async () => {
            await qrgenService.removeReply(id, del._id);
            setOpenId(null);
            load();
            ctx.reload();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------- designs ----------------------------------------
const FRAMES = ["all", "mine", "none", "card", "banner", "pill", "circle", "ticket", "phone", "polaroid", "bubble", "corners"];
export function DesignsTab({ ctx }) {
  const { m, lang, data, readOnly } = ctx;
  const [frame, setFrame] = useState("all");
  const owned = data.designs || ["plain"];
  const sample = `${SITE}/x/sample`;
  const svgs = useMemo(() => Object.fromEntries(DESIGN_KEYS.map((k) => [k, qrDesignSvg({ text: sample, design: k, size: 170, scanMe: m.frameLabelPh })])), [sample, m.frameLabelPh]);
  const shown = DESIGN_KEYS.filter((k) => frame === "all" || (frame === "mine" ? owned.includes(k) : QR_DESIGNS[k].frame === frame));
  return (
    <div className="rs-col">
      <Head icon={Palette} title={m.designsTitle} sub={m.designsSub.replace("{n}", DESIGN_KEYS.length - 1)} />
      <section className="panel-card">
        <div className="rs-addon-filter mq-filter fb-filter">
          {FRAMES.map((k) => (
            <button key={k} type="button" className={frame === k ? "on" : ""} onClick={() => setFrame(k)}>
              {m.frames[k]}
              {k === "mine" ? ` (${owned.length})` : ""}
            </button>
          ))}
        </div>
        <div className="qg-designs">
          {shown.map((k) => {
            const mine = owned.includes(k);
            return (
              <div key={k} className={`qg-design ${mine ? "mine" : ""}`} data-testid={`qg-design-${k}`}>
                <span className="qg-design-art" dangerouslySetInnerHTML={{ __html: svgs[k] }} />
                <b>{designName(k, lang)}</b>
                {mine ? (
                  <span className="rs-pill on">
                    <Check size={12} /> {k === "plain" ? m.free : m.yours}
                  </span>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ design: k })} disabled={readOnly} data-testid={`qg-buy-${k}`}>
                    <CoinIcon size={13} /> {fmt(data.prices.qr_design)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------- stats ----------------------------------------
export function StatsTab({ ctx }) {
  const { id, m, lang, data, notify } = ctx;
  const [days, setDays] = useState(30);
  const [code, setCode] = useState("");
  const [st, setSt] = useState(null);
  const [hist, setHist] = useState(null);
  const [page, setPage] = useState(1);
  const on = ctx.on("qr_stats");
  useEffect(() => {
    if (!on) return;
    setSt(null);
    qrgenService
      .stats(id, { days, code })
      .then((r) => setSt(r.data))
      .catch((e) => notify({ type: "error", text: e.message }));
  }, [id, days, code, on]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!on) return;
    qrgenService
      .scans(id, { code, page, limit: 25 })
      .then(setHist)
      .catch(() => {});
  }, [id, code, page, on]);
  if (!on)
    return (
      <div className="rs-col">
        <Head icon={BarChart3} title={m.statsTitle} sub={m.statsSub} />
        <Locked ctx={ctx} addon="qr_stats" />
      </div>
    );
  const nameOf = (cid) => data.codes.find((c) => c._id === cid)?.name || "—";
  const max = st ? Math.max(1, ...st.series.map((x) => x.scans)) : 1;
  const hmax = st ? Math.max(1, ...st.hours) : 1;
  const geo = st?.geo;
  const bars = (title, list, map = (x) => x) => (
    <section className="panel-card">
      <h3 className="mq-h3">{title}</h3>
      {!list?.length ? (
        <p className="rs-muted">{m.noScans}</p>
      ) : (
        <div className="fb-pagebars">
          {list.map((x) => (
            <div key={x.key}>
              <small>{map(x.key)}</small>
              <span>
                <i style={{ width: `${(x.n / Math.max(...list.map((y) => y.n))) * 100}%` }} />
              </span>
              <b>{fmt(x.n)}</b>
            </div>
          ))}
        </div>
      )}
    </section>
  );
  const exportHist = async () => {
    const r = await qrgenService.scans(id, { code, all: "1" });
    saveCsv(
      [["Date", "QR", "Device", "System", "Browser", "City", "Country"], ...r.data.map((x) => [localTime(x.at), nameOf(x.code_id), x.device || "", x.os || "", x.browser || "", x.city || "", x.country || ""])],
      `scans-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };
  return (
    <div className="rs-col">
      <Head icon={BarChart3} title={m.statsTitle} sub={m.statsSub}>
        <select
          className="fb-select"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{m.allCodes}</option>
          {data.codes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="rs-addon-filter mq-filter">
          {[7, 30, 90, 365].map((d) => (
            <button key={d} type="button" className={days === d ? "on" : ""} onClick={() => setDays(d)}>
              {d}
            </button>
          ))}
        </div>
      </Head>
      {!st ? (
        <div className="panel-card">…</div>
      ) : (
        <>
          <div className="mq-kpis">
            {[
              [m.today, st.today],
              [m.total.replace("{n}", st.days), st.total],
              [m.allTime, st.all_time],
            ].map(([k, v]) => (
              <section key={k} className="panel-card">
                <small className="rs-muted">{k}</small>
                <b data-testid="qg-kpi">{fmt(v)}</b>
              </section>
            ))}
          </div>
          <section className="panel-card">
            {!st.total ? (
              <p className="rs-muted">{m.noScans}</p>
            ) : (
              <div className="mq-chart" aria-hidden="true">
                {st.series.map((d) => (
                  <i key={d.day} style={{ height: `${Math.max(2, (d.scans / max) * 100)}%` }} title={`${d.day} · ${d.scans}`} />
                ))}
              </div>
            )}
          </section>
          <div className="mq-two">
            <section className="panel-card">
              <h3 className="mq-h3">{m.byHour}</h3>
              <div className="mq-hours">
                {st.hours.map((n, h) => (
                  <span key={h} title={`${h}:00 · ${n}`}>
                    <i style={{ height: `${Math.max(2, (n / hmax) * 100)}%` }} />
                    <small>{h % 3 === 0 ? h : ""}</small>
                  </span>
                ))}
              </div>
            </section>
            {bars(
              m.topCodes,
              st.top.map((x) => ({ key: x.name, n: x.scans })),
            )}
          </div>
          {geo ? (
            <div className="mq-two">
              {bars(m.cities, st.city)}
              {bars(m.countries, st.country)}
              {bars(m.device, st.device, (k) => m.devices[k] || k)}
              {bars(m.systems, st.os)}
            </div>
          ) : (
            <section className="panel-card">
              <h3 className="mq-h3">
                <MapPin size={16} /> {m.geoTitle}
              </h3>
              <NeedLine ctx={ctx} addon="qr_geo" />
            </section>
          )}
        </>
      )}
      <section className="panel-card">
        <div className="qg-hist-head">
          <h3 className="mq-h3">{m.history}</h3>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={exportHist} disabled={!hist?.pagination?.total}>
            <Download size={14} /> {m.excel}
          </button>
        </div>
        {!hist ? (
          "…"
        ) : !hist.data.length ? (
          <p className="rs-muted">{m.noScans}</p>
        ) : (
          <div className="fb-leads">
            <table>
              <thead>
                <tr>
                  <th>{m.when}</th>
                  <th>QR</th>
                  {hist.geo && <th>{m.device}</th>}
                  {hist.geo && <th>{m.place}</th>}
                </tr>
              </thead>
              <tbody>
                {hist.data.map((x) => (
                  <tr key={x._id} data-testid="qg-scan">
                    <td data-l={m.when}>{fmtTime(x.at, lang)}</td>
                    <td data-l="QR">{nameOf(x.code_id)}</td>
                    {hist.geo && (
                      <td data-l={m.device}>
                        <Smartphone size={12} /> {[m.devices[x.device] || x.device, x.os, x.browser].filter(Boolean).join(" · ")}
                      </td>
                    )}
                    {hist.geo && <td data-l={m.place}>{[x.city, x.country].filter(Boolean).join(", ") || "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {hist.pagination.pages > 1 && (
              <div className="fb-pager">
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {m.prev}
                </button>
                <span>
                  {page} / {hist.pagination.pages}
                </span>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={page >= hist.pagination.pages} onClick={() => setPage(page + 1)}>
                  {m.next}
                </button>
              </div>
            )}
          </div>
        )}
        {!hist?.geo && hist?.data?.length > 0 && <small className="rs-muted">{m.geoLocked}</small>}
      </section>
    </div>
  );
}

// ---------------------------------------- bulk ----------------------------------------
export function BulkTab({ ctx }) {
  const { id, m, data, readOnly, notify } = ctx;
  const [type, setType] = useState("url");
  const [list, setList] = useState("");
  const [folder, setFolder] = useState("");
  const [design, setDesign] = useState("plain");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(null);
  const fileRef = useRef(null);
  if (!ctx.on("qr_bulk"))
    return (
      <div className="rs-col">
        <Head icon={Layers} title={m.bulkTitle} sub={m.bulkSub} />
        <Locked ctx={ctx} addon="qr_bulk" />
      </div>
    );
  const rows = list
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.search(/[,;\t]/);
      return i < 0
        ? { name: l, value: "" }
        : {
            name: l.slice(0, i).trim().replace(/^"|"$/g, ""),
            value: l
              .slice(i + 1)
              .trim()
              .replace(/^"|"$/g, ""),
          };
    })
    .slice(0, 500);
  const logo = data.settings.logo?.url || "";
  return (
    <div className="rs-col">
      <Head icon={Layers} title={m.bulkTitle} sub={m.bulkSub} />
      <section className="panel-card md-fields">
        <div className="qg-grid2">
          <Field label={m.bulkType}>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="url">{m.types.url}</option>
              <option value="text">{m.types.text}</option>
            </select>
          </Field>
          <Field label={m.folder}>
            <select value={folder} onChange={(e) => setFolder(e.target.value)}>
              <option value="">{m.noFolder}</option>
              {data.folders.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={m.sDesign}>
            <select value={design} onChange={(e) => setDesign(e.target.value)}>
              {(data.designs || ["plain"]).map((k) => (
                <option key={k} value={k}>
                  {designName(k, ctx.lang)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={`${m.bulkList} (${rows.length})`}>
          <textarea rows={9} value={list} onChange={(e) => setList(e.target.value)} placeholder={m.bulkPh} data-testid="qg-bulk-list" />
        </Field>
        <div className="qg-bulk-acts">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) setList((await f.text()).replace(/^﻿/, ""));
            }}
          />
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> {m.bulkFile}
          </button>
          <button
            type="button"
            className="md-btn md-btn-primary"
            disabled={readOnly || busy || !rows.length}
            data-testid="qg-bulk-make"
            onClick={async () => {
              setBusy(true);
              try {
                const r = await qrgenService.bulk(id, { type, folder_id: folder || null, rows, design: { key: design } });
                setMade(r);
                ctx.put((d) => ({ codes: [...r.data, ...d.codes] }));
                notify({ type: "success", text: m.bulkDone.replace("{n}", r.data.length) });
              } catch (e) {
                notify({ type: "error", text: e.message });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 size={15} className="md-spin" /> : <Layers size={15} />} {m.bulkMake.replace("{n}", rows.length)}
          </button>
        </div>
      </section>
      {made && (
        <section className="panel-card">
          <div className="qg-hist-head">
            <h3 className="mq-h3">{m.bulkDone.replace("{n}", made.data.length)}</h3>
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => printCodes(made.data, logo, m.bulkTitle, m.frameLabelPh)} data-testid="qg-bulk-print">
              <Printer size={14} /> {m.printSheet}
            </button>
          </div>
          {made.skipped?.length > 0 && <div className="co-warn mq-warn">{m.bulkSkipped.replace("{list}", made.skipped.join(", "))}</div>}
          <div className="qg-bulk-grid">
            {made.data.slice(0, 60).map((c) => (
              <figure key={c._id}>
                <QrView code={c} logo={logo} size={110} scanMe={m.frameLabelPh} />
                <figcaption>{c.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------- telegram ----------------------------------------
export function TelegramTab({ ctx }) {
  const { id, m, data, readOnly, notify } = ctx;
  const [tg, setTg] = useState(data.telegram);
  const [busy, setBusy] = useState("");
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setInterval(() => {
      qrgenService.telegram(id).then((r) => {
        setTg(r.data);
        if (r.data.connected) {
          setWaiting(false);
          ctx.put({ telegram: r.data });
        }
      });
    }, 3000);
    return () => clearInterval(t);
  }, [waiting, id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ctx.on("qr_telegram"))
    return (
      <div className="rs-col">
        <Head icon={Send} title={m.tgTitle} sub={m.tgSub} />
        <Locked ctx={ctx} addon="qr_telegram" />
      </div>
    );
  const link = async (group) => {
    setBusy("link");
    try {
      const r = await qrgenService.telegramLink(id);
      window.open(group ? r.data.group_url : r.data.url, "_blank", "noopener");
      setWaiting(true);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rs-col">
      <Head icon={Send} title={m.tgTitle} sub={m.tgSub} />
      <section className="panel-card qg-tg">
        {!tg.configured ? (
          <p className="rs-muted">{m.tgNotConfigured}</p>
        ) : tg.connected ? (
          <>
            <span className="rs-pill on">
              <Check size={13} /> {m.tgConnected.replace("{name}", tg.chat_name)}
            </span>
            <div className="qg-bulk-acts">
              <button
                type="button"
                className="md-btn md-btn-primary sa-btn-sm"
                disabled={!!busy || readOnly}
                onClick={async () => {
                  setBusy("test");
                  try {
                    const r = await qrgenService.telegramTest(id);
                    notify({ type: "success", text: r.message });
                  } catch (e) {
                    notify({ type: "error", text: e.message });
                  } finally {
                    setBusy("");
                  }
                }}
              >
                {busy === "test" ? <Loader2 size={14} className="md-spin" /> : <Send size={14} />} {m.tgTest}
              </button>
              <button
                type="button"
                className="md-btn md-btn-ghost sa-btn-sm"
                disabled={!!busy || readOnly}
                onClick={async () => {
                  const r = await qrgenService.telegramOff(id);
                  setTg(r.data);
                  ctx.put({ telegram: r.data });
                }}
              >
                <Unplug size={14} /> {m.tgDisconnect}
              </button>
            </div>
            <div className="qg-weekly">
              <Switch
                checked={data.settings.weekly !== false}
                onChange={async (v) => {
                  try {
                    const r = await qrgenService.save(id, { weekly: v });
                    ctx.setSettings(r.data);
                  } catch (e) {
                    notify({ type: "error", text: e.message });
                  }
                }}
                label={m.weekly}
              />
              <small className="rs-muted">{m.weeklySub}</small>
            </div>
          </>
        ) : (
          <div className="qg-bulk-acts">
            <button type="button" className="md-btn md-btn-primary" onClick={() => link(false)} disabled={!!busy || readOnly} data-testid="qg-tg-connect">
              {busy === "link" ? <Loader2 size={15} className="md-spin" /> : <Send size={15} />} {m.tgConnect}
            </button>
            <button type="button" className="md-btn md-btn-ghost" onClick={() => link(true)} disabled={!!busy || readOnly}>
              {m.tgGroup}
            </button>
            {waiting && <small className="rs-muted">{m.tgWaiting}</small>}
          </div>
        )}
        <p className="rs-muted" style={{ margin: 0 }}>
          {m.tgHow}
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------- business info ----------------------------------------
export function ProfileTab({ ctx }) {
  const { id, m, data, readOnly, notify } = ctx;
  const s = data.settings;
  const [busy, setBusy] = useState("");
  const [color, setColor] = useState(s.color || "#E0581A");
  const logo = async (file) => {
    setBusy("logo");
    try {
      const r = file ? await qrgenService.logo(id, file) : await qrgenService.removeLogo(id);
      ctx.setSettings(r.data);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rs-col">
      <Head icon={Store} title={m.profileTitle} sub={m.profileSub} />
      <section className="panel-card md-fields">
        <Field label={m.logo}>
          <ImagePick value={s.logo?.url} onPick={logo} onRemove={() => logo(null)} busy={busy === "logo"} r={{ uploading: "…", change: m.upload, upload: m.upload, remove: m.remove }} round disabled={readOnly} maxSize={600} />
        </Field>
        <Field label={m.defaultColor}>
          <div className="fb-colours">
            <label className="fb-swatch fb-swatch-pick" style={{ background: color }}>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={readOnly} />
            </label>
            <button
              type="button"
              className="md-btn md-btn-primary sa-btn-sm"
              disabled={readOnly || color === s.color || busy === "c"}
              onClick={async () => {
                setBusy("c");
                try {
                  const r = await qrgenService.save(id, { color });
                  ctx.setSettings(r.data);
                  notify({ type: "success", text: m.saved });
                } catch (e) {
                  notify({ type: "error", text: e.message });
                } finally {
                  setBusy("");
                }
              }}
            >
              {m.save}
            </button>
          </div>
        </Field>
      </section>
    </div>
  );
}

// ---------------------------------------- add-ons ----------------------------------------
export function AddonsTab({ ctx }) {
  const { m, lang, data, readOnly } = ctx;
  const [files, setFiles] = useState(false);
  return (
    <div className="rs-col">
      <Head icon={Puzzle} title={m.addonsTitle} sub={m.addonsSub} />
      <div className="rs-addons">
        {Object.entries(data.addons).map(([k, a]) => {
          const Icon = ADDON_ICON[k] || Puzzle;
          return (
            <article key={k} className={`panel-card rs-addon s-${a.active ? "active" : "none"}`} data-testid={`qg-addon-${k}`}>
              <div className="rs-addon-top">
                <span className="rs-addon-ic">
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{m.addonNames[k]}</h3>
                  <span className="rs-addon-price">
                    <CoinIcon size={13} /> {fmt(a.price)} {m.coins} {a.days ? m.perYear : `· ${m.forever}`}
                  </span>
                </div>
              </div>
              <p>{m.addonWhat[k]}</p>
              <small className="rs-muted">{m.addonFree[k]}</small>
              <div className="rs-addon-foot">
                {a.active ? (
                  <span className="rs-pill on">
                    <Check size={13} /> {a.expires_at ? m.ends.replace("{date}", fmtDate(a.expires_at, lang)) : m.unlocked}
                  </span>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly}>
                    <CoinIcon size={14} /> {m.unlock.replace("{coins}", fmt(a.price))}
                  </button>
                )}
                {a.active && a.days && (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly}>
                    {m.renewFor.replace("{coins}", fmt(a.price))}
                  </button>
                )}
              </div>
            </article>
          );
        })}
        <article className="panel-card rs-addon">
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <FileStack size={20} />
            </span>
            <div>
              <h3>{m.filesName}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(data.prices.qr_file_pack)} {m.coins} / +{data.files.pack} · {m.forever}
              </span>
            </div>
          </div>
          <p>
            {m.filesWhat} {m.fileRoom.replace("{n}", data.files.count).replace("{max}", data.files.capacity)}
          </p>
          <div className="rs-addon-foot">
            <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setFiles(true)} disabled={readOnly} data-testid="qg-more-files">
              <CoinIcon size={14} /> {m.buyFiles}
            </button>
          </div>
        </article>
        <article className="panel-card rs-addon">
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <Palette size={20} />
            </span>
            <div>
              <h3>{m.designsName}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(data.prices.qr_design)} {m.coins} · {m.forever}
              </span>
            </div>
          </div>
          <p>{m.designsSub.replace("{n}", DESIGN_KEYS.length - 1)}</p>
          <div className="rs-addon-foot">
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("designs")}>
              {m.tabs.designs} →
            </button>
          </div>
        </article>
        <article className="panel-card rs-addon" data-testid="qg-addon-print">
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <Printer size={20} />
            </span>
            <div>
              <h3>{m.printTitle}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(data.prices.qr_print)} {m.coins} · {m.forever}
              </span>
            </div>
          </div>
          <p>{m.printSub}</p>
          <small className="rs-muted">{m.themesOwned.replace("{n}", (data.prints || []).length)}</small>
          <div className="rs-addon-foot">
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("print")}>
              {m.tabs.print} →
            </button>
          </div>
        </article>
        <article className="panel-card rs-addon" data-testid="qg-addon-slug">
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <Link2 size={20} />
            </span>
            <div>
              <h3>{m.slugTitle}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(data.prices.qr_slug)} {m.coins} · {m.forever}
              </span>
            </div>
          </div>
          <p>{m.slugWhat}</p>
          <small className="rs-muted">{m.themesOwned.replace("{n}", (data.slugs || []).length)}</small>
          <div className="rs-addon-foot">
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("codes")}>
              {m.tabs.codes} →
            </button>
          </div>
        </article>
        <article className="panel-card rs-addon" data-testid="qg-addon-themes">
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <LayoutTemplate size={20} />
            </span>
            <div>
              <h3>{m.themesName}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(data.prices.qr_theme)} {m.coins} · {m.forever}
              </span>
            </div>
          </div>
          <p>{m.themesSub.replace("{n}", THEME_KEYS.length).replace("{coins}", fmt(data.prices.qr_theme))}</p>
          <small className="rs-muted">{m.themesOwned.replace("{n}", (data.themes || []).length)}</small>
          <div className="rs-addon-foot">
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("codes")}>
              {m.tabs.codes} →
            </button>
          </div>
        </article>
      </div>
      {files && <BuyFiles ctx={ctx} onClose={() => setFiles(false)} />}
    </div>
  );
}
