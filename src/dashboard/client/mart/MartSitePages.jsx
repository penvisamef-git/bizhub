import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CheckCheck, ExternalLink, Eye, EyeOff, FileText, Image as ImageIcon, Inbox, Mail, MailOpen, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { DeleteButton, Field, ImagePick } from "../restaurant/parts";
import { fmtDayTime } from "./text";

const MAX = 8;

// Extra website pages (delivery info, promotions, FAQ…): shown in the website menu at /m/<slug>?p=<key>
export function PagesPanel({ ctx, w, site, setInfo }) {
  const { readOnly } = ctx;
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const pages = site.pages || [];
  const run = async (fn) => {
    setBusy(true);
    try {
      const r = await fn();
      setInfo(r.data);
      return r;
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
      return null;
    } finally {
      setBusy(false);
    }
  };
  const move = (i, d) => {
    const ids = pages.map((x) => x._id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    run(() => ctx.api.orderPages(ctx.id, ids));
  };
  const url = (k) => (site.slug && site.published ? `${window.location.origin}/m/${site.slug}?p=${k}` : "");
  return (
    <section className="panel-card">
      <div className="ms-head-top">
        <span className="ms-head-ic">
          <FileText size={22} />
        </span>
        <div className="ms-head-text">
          <h2>{w.pagesTitle}</h2>
          <small>{w.pagesSub.replace("{n}", MAX)}</small>
        </div>
        {pages.length < MAX && (
          <div className="ms-head-btns">
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setEdit({ title: "", body: "", visible: true })} disabled={readOnly} data-testid="pg-add">
              <Plus size={15} /> {w.pageAdd}
            </button>
          </div>
        )}
      </div>
      {pages.length < MAX && (
        <div className="pg-ideas">
          <small className="ghw-label">{w.pageIdeas}</small>
          <div className="ghw-chips">
            {w.pageTemplates.map((x) => (
              <button key={x.title} type="button" onClick={() => setEdit({ title: x.title, body: x.body, visible: true })} disabled={readOnly}>
                <Plus size={13} /> {x.title}
              </button>
            ))}
          </div>
        </div>
      )}
      {!pages.length ? (
        <p className="rs-muted pg-empty">{w.pagesNone}</p>
      ) : (
        <div className="pg-list">
          {pages.map((x, i) => (
            <div key={x._id} className={`pg-row ${x.visible === false ? "off" : ""}`}>
              <span className="pg-move">
                <button type="button" className="md-icon-btn" onClick={() => move(i, -1)} disabled={readOnly || busy || i === 0} aria-label="up">
                  <ArrowUp size={14} />
                </button>
                <button type="button" className="md-icon-btn" onClick={() => move(i, 1)} disabled={readOnly || busy || i === pages.length - 1} aria-label="down">
                  <ArrowDown size={14} />
                </button>
              </span>
              <span className="pg-pic">{x.image?.url ? <img src={x.image.url} alt="" /> : <FileText size={18} />}</span>
              <span className="pg-text">
                <b>{x.title}</b>
                <small className="rs-muted">{(x.body || "").slice(0, 110) || "—"}</small>
              </span>
              <span className={`rs-pill ${x.visible === false ? "" : "ok"}`}>
                {x.visible === false ? <EyeOff size={12} /> : <Eye size={12} />} {x.visible === false ? w.pageHidden : w.pageShown}
              </span>
              {url(x.key) && x.visible !== false && (
                <a className="md-icon-btn" href={url(x.key)} target="_blank" rel="noreferrer" aria-label={w.open}>
                  <ExternalLink size={15} />
                </a>
              )}
              <button type="button" className="md-icon-btn" onClick={() => setEdit(x)} disabled={readOnly} aria-label={w.pageEdit}>
                <Pencil size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      {edit && <PageModal ctx={ctx} w={w} row={edit} run={run} onClose={() => setEdit(null)} />}
    </section>
  );
}

function PageModal({ ctx, w, row, run, onClose }) {
  const [f, setF] = useState({ title: row.title || "", body: row.body || "", visible: row.visible !== false });
  const [id, setId] = useState(row._id || null);
  const [img, setImg] = useState(row.image?.url || "");
  const [busy, setBusy] = useState("");
  const save = async () => {
    setBusy("save");
    const r = await run(() => (id ? ctx.api.savePage(ctx.id, id, f) : ctx.api.addPage(ctx.id, f)));
    setBusy("");
    if (!r) return;
    if (id) return onClose();
    // a new page: stay open so a picture can be added
    const made = r.data.site.pages[r.data.site.pages.length - 1];
    setId(made._id);
    ctx.notify({ type: "success", text: w.saved });
  };
  return (
    <Modal
      title={id ? w.pageEdit : w.pageAdd}
      onClose={onClose}
      size="md-modal-lg"
      busy={!!busy}
      footer={
        <>
          {id && (
            <span style={{ marginRight: "auto" }}>
              <DeleteButton
                onDelete={async () => {
                  if (await run(() => ctx.api.removePage(ctx.id, id))) onClose();
                }}
                r={{ confirmDelete: w.pageSure, remove: w.pmRemove }}
                small
              />
            </span>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose}>
            {ctx.m.close}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={!!busy || !f.title.trim()} data-testid="pg-save">
            {busy === "save" ? w.saving : w.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <Field label={w.pageTitle} htmlFor="pg-title">
          <input id="pg-title" maxLength={60} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus />
        </Field>
        <Field label={w.pageBody} htmlFor="pg-body" hint={w.pageBodyHint}>
          <textarea id="pg-body" rows={10} maxLength={6000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        </Field>
        <label className={`mw-toggle ${f.visible ? "on" : ""}`}>
          <input type="checkbox" checked={f.visible} onChange={(e) => setF({ ...f, visible: e.target.checked })} />
          <span>
            <b>{w.pageShowMenu}</b>
            <small className="rs-muted">{w.pageShowMenuSub}</small>
          </span>
        </label>
        {id ? (
          <Field label={w.pagePic}>
            <ImagePick
              value={img}
              busy={busy === "img"}
              r={{ upload: ctx.m.upload, change: ctx.m.change2, uploading: ctx.m.uploading, remove: ctx.m.remove }}
              onPick={async (file) => {
                setBusy("img");
                const r = await run(() => ctx.api.pageImage(ctx.id, id, file));
                setBusy("");
                const x = r?.data.site.pages.find((p) => p._id === id);
                if (x) setImg(x.image?.url || "");
              }}
              onRemove={async () => {
                setBusy("img");
                if (await run(() => ctx.api.removePageImage(ctx.id, id))) setImg("");
                setBusy("");
              }}
            />
          </Field>
        ) : (
          <small className="rs-muted">
            <ImageIcon size={13} /> {w.pagePicLater}
          </small>
        )}
      </div>
    </Modal>
  );
}

// "Contact us" messages from the website
export function InboxPanel({ ctx, w, onUnread }) {
  const { lang, readOnly } = ctx;
  const [rows, setRows] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [open, setOpen] = useState(null);
  const load = useCallback(
    () =>
      ctx.api
        .messages(ctx.id, unreadOnly ? { unread: "true" } : {})
        .then((r) => {
          setRows(r.data);
          onUnread?.(r.unread);
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx, unreadOnly], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);
  const act = async (fn) => {
    try {
      const r = await fn();
      if (r?.unread !== undefined) onUnread?.(r.unread);
      load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const toggle = (m) => {
    setOpen(open === m._id ? null : m._id);
    if (!m.read && !readOnly) {
      setRows((l) => l.map((x) => (x._id === m._id ? { ...x, read: true } : x)));
      ctx.api
        .readMessage(ctx.id, m._id, true)
        .then((r) => onUnread?.(r.unread))
        .catch(() => {});
    }
  };
  const isMail = (s) => /@/.test(s || "");
  return (
    <section className="panel-card">
      <div className="ms-head-top">
        <span className="ms-head-ic">
          <Inbox size={22} />
        </span>
        <div className="ms-head-text">
          <h2>{w.inboxTitle}</h2>
          <small>{w.inboxSub}</small>
        </div>
        <div className="ms-head-btns">
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => act(() => ctx.api.readAllMessages(ctx.id))} disabled={readOnly}>
            <CheckCheck size={15} /> {w.inboxAllRead}
          </button>
        </div>
      </div>
      <div className="mo-filters" style={{ marginTop: 14 }}>
        <button type="button" className={!unreadOnly ? "on" : ""} onClick={() => setUnreadOnly(false)}>
          {w.inboxAll}
        </button>
        <button type="button" className={unreadOnly ? "on" : ""} onClick={() => setUnreadOnly(true)}>
          {w.inboxUnread}
        </button>
      </div>
      {!rows ? (
        <p className="rs-muted">…</p>
      ) : !rows.length ? (
        <div className="mo-empty">
          <Inbox size={30} />
          <p className="rs-muted">{w.inboxNone}</p>
        </div>
      ) : (
        <div className="mi-list">
          {rows.map((m) => (
            <article key={m._id} className={`mi-row ${m.read ? "" : "new"} ${open === m._id ? "open" : ""}`}>
              <button type="button" className="mi-head" onClick={() => toggle(m)}>
                <span className="mi-ic">{m.read ? <MailOpen size={17} /> : <Mail size={17} />}</span>
                <span className="mi-text">
                  <b>{m.name}</b>
                  <small className="rs-muted">{open === m._id ? m.contact || "—" : m.message.slice(0, 90)}</small>
                </span>
                <small className="rs-muted mi-time">{fmtDayTime(m.created_date, lang)}</small>
              </button>
              {open === m._id && (
                <div className="mi-body">
                  <p>{m.message}</p>
                  <div className="mi-act">
                    {m.contact && (
                      <a className="md-btn md-btn-primary sa-btn-sm" href={isMail(m.contact) ? `mailto:${m.contact}` : `tel:${m.contact.replace(/[^\d+]/g, "")}`}>
                        {isMail(m.contact) ? <Mail size={14} /> : <Phone size={14} />} {isMail(m.contact) ? w.inboxEmail : w.inboxCall}
                      </a>
                    )}
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => act(() => ctx.api.readMessage(ctx.id, m._id, false))} disabled={readOnly}>
                      <Mail size={14} /> {w.inboxMarkUnread}
                    </button>
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm tg-danger" onClick={() => act(() => ctx.api.removeMessage(ctx.id, m._id))} disabled={readOnly}>
                      <Trash2 size={14} /> {w.pmRemove}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
