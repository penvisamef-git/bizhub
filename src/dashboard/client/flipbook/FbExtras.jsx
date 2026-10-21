import { useEffect, useRef, useState } from "react";
import { MessageCircle, ChevronLeft, ChevronRight, ClipboardList, Download, Loader2, Lock, MousePointerClick, Save, Trash2, Users } from "lucide-react";
import { flipbookService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { Field } from "../restaurant/parts";
import { Confirm, Head, SearchBar, Switch } from "./FbParts";
import { fmt, fmtDate } from "./text";

const KINDS = ["url", "phone", "telegram", "facebook", "map", "youtube", "email", "page"];

// "unlock first" line inside a box
function NeedAddon({ ctx, addon, onGo }) {
  const { m, data, readOnly } = ctx;
  const a = data.addons[addon] || {};
  return (
    <div className="fb-need">
      <Lock size={16} />
      <span>{m.addonWhat[addon]}</span>
      <button
        type="button"
        className="md-btn md-btn-primary rs-gold-btn sa-btn-sm"
        disabled={readOnly}
        onClick={() => {
          onGo?.();
          ctx.askBuy({ addon });
        }}
        data-testid={`fb-need-${addon}`}
      >
        <CoinIcon size={13} /> {m.unlock.replace("{coins}", `${fmt(a.price)}${a.days ? ` ${m.perYear}` : ""}`)}
      </button>
    </div>
  );
}

// ---------------------------------------- contact form of one book ----------------------------------------
export function LeadFormBox({ ctx, book, onClose, onSaved }) {
  const { id, m, notify } = ctx;
  const on = ctx.on("fb_leads");
  const lf0 = book.lead_form || {};
  const [f, setF] = useState({ mode: lf0.mode || "off", page: lf0.page || 3, ask_email: !!lf0.ask_email, ask_telegram: !!lf0.ask_telegram, ask_note: !!lf0.ask_note, skip: !!lf0.skip, title: lf0.title || "", message: lf0.message || "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const locked = !on && f.mode !== "off";
  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await flipbookService.saveBook(id, book._id, { lead_form: { ...f, page: Math.min(book.file.pages, Math.max(1, Number(f.page) || 1)) } });
      onSaved(r.data);
      notify({ type: "success", text: m.saved });
      onClose();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`${m.leadForm} · ${book.title}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || locked} data-testid="fb-lf-save">
            {busy ? <Loader2 size={15} className="md-spin" /> : <Save size={15} />} {m.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <p className="rs-muted" style={{ margin: 0 }}>
          {m.leadFormSub}
        </p>
        <div className="fb-seg">
          {[
            ["off", m.lfOff],
            ["before", m.lfBefore],
            ["after", m.lfAfter],
          ].map(([k, label]) => (
            <button key={k} type="button" className={f.mode === k ? "on" : ""} onClick={() => setF({ ...f, mode: k })} data-testid={`fb-lf-${k}`}>
              {label}
            </button>
          ))}
        </div>
        {locked && <NeedAddon ctx={ctx} addon="fb_leads" onGo={onClose} />}
        {f.mode !== "off" && (
          <>
            {f.mode === "after" && (
              <Field label={m.lfPage}>
                <input type="number" min="1" max={book.file.pages} value={f.page} onChange={(e) => setF({ ...f, page: e.target.value })} style={{ maxWidth: 120 }} data-testid="fb-lf-page" />
              </Field>
            )}
            <Field label={m.lfAsk}>
              <div className="fb-pick">
                {[
                  ["ask_email", m.lfEmail],
                  ["ask_telegram", m.lfTelegram],
                  ["ask_note", m.lfNote],
                ].map(([k, label]) => (
                  <button key={k} type="button" className={f[k] ? "on" : ""} onClick={() => setF({ ...f, [k]: !f[k] })}>
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={m.lfTitle}>
              <input value={f.title} maxLength={80} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={m.lfTitlePh} />
            </Field>
            <Field label={m.lfMessage}>
              <textarea rows={2} value={f.message} maxLength={300} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder={m.lfMessagePh} />
            </Field>
            <Switch checked={f.skip} onChange={(v) => setF({ ...f, skip: v })} label={m.lfSkip} />
          </>
        )}
        {err && <div className="md-form-error">{err}</div>}
      </div>
    </Modal>
  );
}

// ---------------------------------------- clickable pages of one book ----------------------------------------
export function LinksEditor({ ctx, book, onClose, onSaved }) {
  const { id, m, notify } = ctx;
  const on = ctx.on("fb_links");
  const N = book.file.pages || 1;
  const ratio = book.file.width && book.file.height ? book.file.width / book.file.height : 0.707;
  const [links, setLinks] = useState(() => (book.links || []).map((l, i) => ({ ...l, key: `k${i}` })));
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const stage = useRef(null);
  const start = useRef(null);
  const onPage = links.filter((l) => l.page === page);
  const cur = links.find((l) => l.key === sel);
  const pagesWith = [...new Set(links.map((l) => l.page))].sort((a, b) => a - b);
  const pt = (e) => {
    const r = stage.current.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const rect = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
  const down = (e) => {
    if (!on || e.target.closest(".fbl-box")) return;
    e.preventDefault();
    stage.current.setPointerCapture(e.pointerId);
    start.current = pt(e);
    setDraft({ ...start.current, w: 0, h: 0 });
  };
  const move = (e) => start.current && setDraft(rect(start.current, pt(e)));
  const up = (e) => {
    if (!start.current) return;
    const r = rect(start.current, pt(e));
    start.current = null;
    setDraft(null);
    if (r.w < 0.02 || r.h < 0.015) return;
    const key = `n${Date.now()}`;
    setLinks((list) => [...list, { key, page, ...r, kind: "url", value: "", label: "" }]);
    setSel(key);
  };
  const edit = (patch) => setLinks((list) => list.map((l) => (l.key === sel ? { ...l, ...patch } : l)));
  const go = (p) => {
    setPage(Math.min(N, Math.max(1, p)));
    setSel(null);
  };
  useEffect(() => {
    new Image().src = book.page_url.replace("{page}", Math.min(N, page + 1));
  }, [page, book.page_url, N]);
  const save = async () => {
    const bad = links.find((l) => !String(l.value).trim());
    if (bad) {
      setPage(bad.page);
      setSel(bad.key);
      setErr(m.linkPh[bad.kind] ? `${m.linkKinds[bad.kind]}?` : "?");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await flipbookService.saveLinks(
        id,
        book._id,
        links.map(({ page: p, x, y, w, h, kind, value, label }) => ({ page: p, x, y, w, h, kind, value: String(value).trim(), label })),
      );
      onSaved(r.data);
      notify({ type: "success", text: m.saved });
      onClose();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`${m.links} · ${book.title}`}
      onClose={onClose}
      busy={busy}
      size="md-modal-lg fbl-modal"
      footer={
        <>
          <span className="rs-muted fbl-total">{m.linksN.replace("{n}", links.length)}</span>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || !on} data-testid="fbl-save">
            {busy ? <Loader2 size={15} className="md-spin" /> : <Save size={15} />} {m.save}
          </button>
        </>
      }
    >
      {!on && <NeedAddon ctx={ctx} addon="fb_links" onGo={onClose} />}
      <div className="fbl">
        <div className="fbl-left">
          <div className="fbl-nav">
            <button type="button" className="md-icon-btn" onClick={() => go(page - 1)} disabled={page <= 1} aria-label={m.prev}>
              <ChevronLeft size={18} />
            </button>
            <b>{m.pageOf.replace("{n}", page).replace("{max}", N)}</b>
            <button type="button" className="md-icon-btn" onClick={() => go(page + 1)} disabled={page >= N} aria-label={m.next} data-testid="fbl-next">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className={`fbl-stage ${on ? "" : "off"}`} ref={stage} style={{ aspectRatio: ratio }} onPointerDown={down} onPointerMove={move} onPointerUp={up} data-testid="fbl-stage">
            <img src={book.page_url.replace("{page}", page)} alt="" draggable="false" />
            {onPage.map((l) => (
              <button key={l.key} type="button" className={`fbl-box ${sel === l.key ? "on" : ""}`} style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, width: `${l.w * 100}%`, height: `${l.h * 100}%` }} onClick={() => setSel(l.key)}>
                <span>{l.label || m.linkKinds[l.kind]}</span>
              </button>
            ))}
            {draft && <i className="fbl-draft" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }} />}
          </div>
          {pagesWith.length > 0 && (
            <div className="fbl-pages">
              {pagesWith.map((p) => (
                <button key={p} type="button" className={p === page ? "on" : ""} onClick={() => go(p)}>
                  {p} <small>({links.filter((l) => l.page === p).length})</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="fbl-right">
          <p className="rs-muted fbl-help">
            <MousePointerClick size={15} /> {m.linksSub}
          </p>
          {!onPage.length && <p className="rs-muted">{m.noLinks}</p>}
          <div className="fbl-list">
            {onPage.map((l, i) => (
              <button key={l.key} type="button" className={`fbl-item ${sel === l.key ? "on" : ""}`} onClick={() => setSel(l.key)}>
                <b>{i + 1}</b> <span>{l.label || m.linkKinds[l.kind]}</span> <small>{l.value || "…"}</small>
              </button>
            ))}
          </div>
          {cur && (
            <div className="fbl-form md-fields" data-testid="fbl-form">
              <Field label={m.linkOpens}>
                <select value={cur.kind} onChange={(e) => edit({ kind: e.target.value })} data-testid="fbl-kind">
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {m.linkKinds[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <input
                  value={cur.value}
                  onChange={(e) => edit({ value: e.target.value })}
                  placeholder={m.linkPh[cur.kind]}
                  maxLength={500}
                  inputMode={cur.kind === "page" ? "numeric" : cur.kind === "phone" ? "tel" : undefined}
                  autoFocus
                  data-testid="fbl-value"
                />
              </Field>
              <Field label={m.linkLabel}>
                <input value={cur.label} onChange={(e) => edit({ label: e.target.value })} maxLength={60} />
              </Field>
              <button
                type="button"
                className="md-btn md-btn-ghost sa-btn-sm fbl-del"
                onClick={() => {
                  setLinks((list) => list.filter((x) => x.key !== sel));
                  setSel(null);
                }}
              >
                <Trash2 size={14} /> {m.delete}
              </button>
            </div>
          )}
          {err && <div className="md-form-error">{err}</div>}
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------- contacts (fb_leads) ----------------------------------------
const pad = (n) => String(n).padStart(2, "0");
const localTime = (d) => {
  const t = new Date(d);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
};
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// where the contact form shows: the library "Contact us" button + each book
function FormPlaces({ ctx }) {
  const { id, m, data, readOnly, notify } = ctx;
  const on = ctx.on("fb_leads");
  const lf0 = data.settings.lead_form || {};
  const start = { on: !!lf0.on, ask_email: !!lf0.ask_email, ask_telegram: !!lf0.ask_telegram, ask_note: lf0.ask_note !== false, title: lf0.title || "", message: lf0.message || "" };
  const [f, setF] = useState(start);
  const [busy, setBusy] = useState("");
  const [box, setBox] = useState(null);
  const dirty = JSON.stringify(f) !== JSON.stringify(start);
  const saveLib = async (next = f) => {
    setBusy("lib");
    try {
      const r = await flipbookService.save(id, { lead_form: next });
      ctx.setSettings(r.data);
      notify({ type: "success", text: m.saved });
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const setBook = (row) => ctx.put((d) => ({ books: d.books.map((x) => (x._id === row._id ? row : x)) }));
  const quick = async (b, v) => {
    if (v && !on) return ctx.askBuy({ addon: "fb_leads" });
    setBusy(b._id);
    try {
      const lf = b.lead_form || {};
      const r = await flipbookService.saveBook(id, b._id, { lead_form: { ...lf, mode: v ? (lf.mode && lf.mode !== "off" ? lf.mode : "after") : "off", page: lf.page || 3 } });
      setBook(r.data);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const status = (b) => {
    const lf = b.lead_form || {};
    return !lf.mode || lf.mode === "off" ? m.lfOff : lf.mode === "before" ? m.lfBefore : m.lfAfterN.replace("{n}", lf.page || 3);
  };
  return (
    <section className="panel-card fb-places">
      <h3 className="mq-h3">{m.formWhere}</h3>
      <p className="rs-muted fb-places-sub">{m.formWhereSub}</p>
      <div className={`fb-place ${f.on ? "on" : ""}`}>
        <span className="fb-place-ic">
          <MessageCircle size={18} />
        </span>
        <div className="fb-place-text">
          <b>{m.formLibrary}</b>
          <small className="rs-muted">{m.formLibrarySub}</small>
        </div>
        <Switch
          checked={f.on}
          disabled={readOnly || busy === "lib"}
          testid="fb-lib-form"
          onChange={(v) => {
            if (v && !on) return ctx.askBuy({ addon: "fb_leads" });
            const next = { ...f, on: v };
            setF(next);
            saveLib(next);
          }}
        />
      </div>
      {f.on && (
        <div className="fb-place-more md-fields">
          <div className="fb-pick">
            {[
              ["ask_email", m.lfEmail],
              ["ask_telegram", m.lfTelegram],
              ["ask_note", m.lfNote],
            ].map(([k, label]) => (
              <button key={k} type="button" className={f[k] ? "on" : ""} onClick={() => setF({ ...f, [k]: !f[k] })}>
                {label}
              </button>
            ))}
          </div>
          <div className="fb-grid2">
            <Field label={m.lfTitle}>
              <input value={f.title} maxLength={80} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={m.contactTitlePh} />
            </Field>
            <Field label={m.lfMessage}>
              <input value={f.message} maxLength={300} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder={m.contactMsgPh} />
            </Field>
          </div>
          {dirty && (
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => saveLib()} disabled={readOnly || !!busy} data-testid="fb-lib-form-save">
              {busy === "lib" ? <Loader2 size={14} className="md-spin" /> : <Save size={14} />} {m.save}
            </button>
          )}
        </div>
      )}
      {data.books.length > 0 && <h4 className="fb-places-h">{m.formBooks}</h4>}
      <div className="fb-place-books">
        {data.books.map((b) => {
          const isOn = b.lead_form?.mode && b.lead_form.mode !== "off";
          return (
            <div key={b._id} className={`fb-place-book ${isOn ? "on" : ""}`} data-testid="fb-place-book">
              <img src={b.cover} alt="" />
              <div className="fb-place-text">
                <b>{b.title}</b>
                <small className="rs-muted">
                  {status(b)}
                  {b.leads > 0 ? ` · ${m.contacts.replace("{n}", fmt(b.leads))}` : ""}
                </small>
              </div>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setBox(b)} disabled={readOnly}>
                {m.edit}
              </button>
              <Switch checked={!!isOn} onChange={(v) => quick(b, v)} disabled={readOnly || busy === b._id} />
            </div>
          );
        })}
      </div>
      {box && <LeadFormBox ctx={ctx} book={box} onClose={() => setBox(null)} onSaved={setBook} />}
    </section>
  );
}

export function LeadsTab({ ctx }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const on = ctx.on("fb_leads");
  const [q, setQ] = useState("");
  const [book, setBook] = useState("");
  const [cat, setCat] = useState("");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const titleOf = (bid) => (bid ? data.books.find((b) => b._id === bid)?.title || "—" : m.fromLibrary);
  const catNames = (ids) => (ids || []).map((c) => data.categories.find((x) => x._id === c)?.name).filter(Boolean);
  const load = () =>
    flipbookService
      .leads(id, { q: q.trim(), book, category: cat, page, limit: 30 })
      .then((r) => setRes(r))
      .catch((e) => notify({ type: "error", text: e.message }));
  useEffect(() => {
    const tm = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(tm);
  }, [q, book, cat, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const excel = async () => {
    setBusy(true);
    try {
      const r = await flipbookService.leads(id, { q: q.trim(), book, category: cat, all: "1" });
      const head = [m.colDate, m.colName, m.colPhone, m.colEmail, m.colTelegram, m.colNote, m.colCategory, m.colBook, m.colPage];
      const rows = r.data.map((x) => [localTime(x.created_date), x.name, x.phone, x.email, x.telegram, x.note, catNames(x.category_ids).join(" / ") || m.noCat, titleOf(x.book_id), x.page || ""]);
      const csv = `﻿${[head, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const rows = res?.data || [];
  const pg = res?.pagination || { page: 1, pages: 1, total: 0 };
  return (
    <div className="rs-col">
      <Head icon={Users} title={m.leadsTitle} sub={m.leadsSub}>
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={excel} disabled={busy || !pg.total} data-testid="fb-leads-excel">
          {busy ? <Loader2 size={14} className="md-spin" /> : <Download size={14} />} {m.excel}
        </button>
      </Head>
      {!on && (
        <section className="panel-card">
          <NeedAddon ctx={ctx} addon="fb_leads" />
        </section>
      )}
      <FormPlaces ctx={ctx} />
      {res?.counts?.all > 0 && (
        <div className="fb-cat-index" data-testid="fb-cat-index">
          {[["", m.allCats, res.counts.all], ...data.categories.map((c) => [c._id, c.name, res.counts.categories[c._id] || 0]), ["none", m.noCat, res.counts.none]]
            .filter(([k, , nn]) => !k || nn > 0)
            .map(([k, label, nn]) => (
              <button
                key={k || "all"}
                type="button"
                className={cat === k ? "on" : ""}
                onClick={() => {
                  setCat(k);
                  setPage(1);
                }}
              >
                {label} <small>{fmt(nn)}</small>
              </button>
            ))}
        </div>
      )}
      <SearchBar
        m={m}
        value={q}
        onChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        placeholder={m.leadsSearch}
        n={rows.length}
        max={pg.total}
        testid="fb-leads-search"
      >
        <select
          className="fb-select"
          value={book}
          onChange={(e) => {
            setBook(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{m.allBooks}</option>
          <option value="library">{m.fromLibrary}</option>
          {data.books.map((b) => (
            <option key={b._id} value={b._id}>
              {b.title}
            </option>
          ))}
        </select>
      </SearchBar>
      {!res ? (
        <div className="panel-card">…</div>
      ) : !rows.length ? (
        <section className="panel-card sa-empty-state">
          <ClipboardList size={28} />
          <p>{m.noLeads}</p>
        </section>
      ) : (
        <section className="panel-card fb-leads">
          <table>
            <thead>
              <tr>
                <th>{m.colName}</th>
                <th>{m.colPhone}</th>
                <th>{m.colEmail}</th>
                <th>{m.colNote}</th>
                <th>{m.colCategory}</th>
                <th>{m.colBook}</th>
                <th>{m.colDate}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x._id} data-testid="fb-lead">
                  <td data-l={m.colName}>
                    <b>{x.name}</b>
                    {x.telegram && <small className="rs-muted"> · {x.telegram}</small>}
                  </td>
                  <td data-l={m.colPhone}>
                    <a href={`tel:${x.phone.replace(/[^+\d]/g, "")}`}>{x.phone}</a>
                  </td>
                  <td data-l={m.colEmail}>{x.email || "—"}</td>
                  <td data-l={m.colNote} className="fb-lead-note">
                    {x.note || "—"}
                  </td>
                  <td data-l={m.colCategory}>
                    <span className="fb-lead-cats">{catNames(x.category_ids).length ? catNames(x.category_ids).map((c) => <i key={c}>{c}</i>) : <small className="rs-muted">—</small>}</span>
                  </td>
                  <td data-l={m.colBook}>
                    {titleOf(x.book_id)}
                    {x.page ? <small className="rs-muted"> · p.{x.page}</small> : null}
                  </td>
                  <td data-l={m.colDate}>{fmtDate(x.created_date, lang)}</td>
                  <td>
                    <button type="button" className="md-icon-btn danger" onClick={() => setDel(x)} disabled={readOnly} aria-label={m.delete}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pg.pages > 1 && (
            <div className="fb-pager">
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={pg.page <= 1} onClick={() => setPage(pg.page - 1)}>
                <ChevronLeft size={14} /> {m.prev}
              </button>
              <span>
                {pg.page} / {pg.pages}
              </span>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={pg.page >= pg.pages} onClick={() => setPage(pg.page + 1)}>
                {m.next} <ChevronRight size={14} />
              </button>
            </div>
          )}
        </section>
      )}
      {del && (
        <Confirm
          m={m}
          title={m.removeLead}
          sub={`${del.name} · ${del.phone}`}
          onClose={() => setDel(null)}
          onYes={async () => {
            try {
              await flipbookService.removeLead(id, del._id);
              load();
            } catch (e) {
              notify({ type: "error", text: e.message });
              throw e;
            }
          }}
        />
      )}
    </div>
  );
}
