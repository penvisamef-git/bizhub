import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, ClipboardList, MousePointerClick, Users, Search, X, Download, ExternalLink, EyeOff, Loader2, Lock, Pencil, QrCode, RefreshCw, Trash2, Unlock, UploadCloud } from "lucide-react";
import { flipbookService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { Field } from "../restaurant/parts";
import { READER_KEYS, readerName } from "../../../fbook/readers";
import { BuySlots, Confirm, Head, QrCard, Switch } from "./FbParts";
import { bookUrl, fmt, mb } from "./text";
import { LeadFormBox, LinksEditor } from "./FbExtras";

// PDF → Cloudinary straight from the browser (signed by our API), with progress
async function sendPdf(id, file, onProgress) {
  const sign = (await flipbookService.uploadSign(id)).data;
  const fd = new FormData();
  fd.append("file", file);
  for (const k of ["api_key", "timestamp", "signature", "folder"]) if (sign[k] !== undefined) fd.append(k, sign[k]);
  return new Promise((ok, bad) => {
    const x = new XMLHttpRequest();
    x.open("POST", sign.upload_url);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    x.onload = () => {
      let r = null;
      try {
        r = JSON.parse(x.responseText);
      } catch {
        /* not json */
      }
      if (x.status >= 200 && x.status < 300 && r?.public_id) ok(r);
      else bad(new Error(r?.error?.message || `Upload failed (${x.status})`));
    };
    x.onerror = () => bad(new Error("Network error"));
    x.send(fd);
  });
}

function usePdfUpload(ctx) {
  const { id, m, data } = ctx;
  const [state, setState] = useState(null); // { p } | { checking }
  const check = (file) => {
    if (!file) return null;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return m.notPdf;
    if (file.size > data.limits.big_bytes) return m.tooBigLocal.replace("{mb}", data.limits.big_bytes / 1048576);
    return null;
  };
  const run = async (file, then) => {
    setState({ p: 0 });
    try {
      const up = await sendPdf(id, file, (p) => setState({ p }));
      setState({ checking: true });
      return await then(up);
    } finally {
      setState(null);
    }
  };
  return { state, check, run };
}

export default function FbBooks({ ctx }) {
  const { id, m, data, readOnly, notify } = ctx;
  const books = data.books;
  const room = data.room;
  const L = data.limits;
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [slots, setSlots] = useState(""); // "book" | "big"
  const [edit, setEdit] = useState(null);
  const [qr, setQr] = useState(null);
  const [pw, setPw] = useState(null);
  const [del, setDel] = useState(null);
  const [q, setQ] = useState("");
  const [fcat, setFcat] = useState("");
  const words = q.trim().toLowerCase();
  const filtering = !!(words || fcat);
  const shown = books.filter(
    (b) => (!words || `${b.title} ${b.about || ""} ${b.slug} ${b.file?.name || ""}`.toLowerCase().includes(words)) && (!fcat || (fcat === "none" ? !(b.category_ids || []).length : (b.category_ids || []).map(String).includes(fcat))),
  );
  const [replacing, setReplacing] = useState(null);
  const [leadBox, setLeadBox] = useState(null);
  const [linksBox, setLinksBox] = useState(null);
  const up = usePdfUpload(ctx);
  const full = room.books >= room.book_capacity;
  const setBooks = (fn, r) => ctx.put((d) => ({ books: fn(d.books), ...(r ? { room: r } : {}) }));
  const fail = (e) => {
    const code = e.response?.code;
    if (code === "book_full") setSlots("book");
    else if (code === "need_big") setSlots("big");
    notify({ type: "error", text: e.message });
  };
  const add = async (file) => {
    if (!file || readOnly) return;
    const bad = up.check(file);
    if (bad) return notify({ type: "error", text: bad });
    if (full) {
      setSlots("book");
      return notify({ type: "error", text: m.full });
    }
    if (file.size > L.bytes && room.big >= room.big_capacity) {
      setSlots("big");
      return notify({ type: "error", text: m.needBig });
    }
    try {
      const r = await up.run(file, (u) => flipbookService.addBook(id, { public_id: u.public_id, name: file.name }));
      setBooks((list) => [r.data, ...list], r.room);
      notify({ type: "success", text: m.added });
    } catch (e) {
      fail(e);
    }
  };
  const replace = async (book, file) => {
    const bad = up.check(file);
    if (bad) return notify({ type: "error", text: bad });
    setReplacing(book._id);
    try {
      const r = await up.run(file, (u) => flipbookService.replaceBook(id, book._id, { public_id: u.public_id, name: file.name }));
      setBooks((list) => list.map((b) => (b._id === book._id ? r.data : b)), r.room);
      notify({ type: "success", text: m.replaced });
    } catch (e) {
      fail(e);
    } finally {
      setReplacing(null);
    }
  };
  const move = async (i, d) => {
    const list = [...books];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setBooks(() => list);
    flipbookService
      .orderBooks(
        id,
        list.map((b) => b._id),
      )
      .catch((e) => notify({ type: "error", text: e.message }));
  };
  const catName = (cid) => data.categories.find((c) => c._id === cid)?.name;

  return (
    <div className="rs-col">
      <Head icon={BookOpen} title={m.booksTitle} sub={m.booksSub}>
        <span className={`rs-chip ${full ? "s-expired" : ""}`} data-testid="fb-room">
          {m.room.replace("{n}", room.books).replace("{max}", room.book_capacity)}
        </span>
        <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setSlots("book")} disabled={readOnly} data-testid="fb-more-books">
          <CoinIcon size={14} /> {m.moreBooks}
        </button>
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setSlots("big")} disabled={readOnly}>
          {m.bigRoom.replace("{n}", room.big).replace("{max}", room.big_capacity)}
        </button>
      </Head>

      <section
        className={`panel-card fb-drop ${drag ? "on" : ""} ${up.state ? "busy" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!up.state) add(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !up.state && !readOnly && fileRef.current?.click()}
        role="button"
        tabIndex={0}
        data-testid="fb-drop"
      >
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (replacing) return;
            add(f);
          }}
          data-testid="fb-file"
        />
        {up.state && !replacing ? (
          <>
            <Loader2 size={34} className="md-spin" />
            <b>{up.state.checking ? m.checking : m.uploading.replace("{p}", up.state.p)}</b>
            <span className="fb-bar">
              <i style={{ width: `${up.state.checking ? 100 : up.state.p}%` }} />
            </span>
          </>
        ) : (
          <>
            <span className="fb-drop-ic">
              <UploadCloud size={30} />
            </span>
            <b>{m.drop}</b>
            <small className="rs-muted">
              {m.dropSub
                .replace("{mb}", L.bytes / 1048576)
                .replace("{pages}", L.pages)
                .replace("{bmb}", L.big_bytes / 1048576)
                .replace("{bpages}", L.big_pages)}
            </small>
          </>
        )}
      </section>

      {!books.length ? (
        <section className="panel-card sa-empty-state">
          <BookOpen size={30} />
          <p>{m.noBooks}</p>
        </section>
      ) : (
        <>
          <section className="panel-card fb-search">
            <label className="fb-search-box">
              <Search size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.searchBooks} data-testid="fb-search" />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label={m.close}>
                  <X size={15} />
                </button>
              )}
            </label>
            <select className="fb-select" value={fcat} onChange={(e) => setFcat(e.target.value)} data-testid="fb-search-cat">
              <option value="">{m.allCats}</option>
              {data.categories.map((c) => (
                <option key={c._id} value={String(c._id)}>
                  {c.name}
                </option>
              ))}
              <option value="none">{m.noCat}</option>
            </select>
            <small className="rs-muted">{m.found.replace("{n}", shown.length).replace("{max}", books.length)}</small>
          </section>
          {!shown.length && (
            <section className="panel-card sa-empty-state">
              <Search size={26} />
              <p>{m.noFound}</p>
            </section>
          )}
          <div className="fb-books">
            {shown.map((b) => {
              const i = books.indexOf(b);
              return (
                <article key={b._id} className={`panel-card fb-bookcard ${b.published ? "" : "off"}`} data-testid="fb-book">
                  <a className="fb-cover" href={bookUrl(b.slug)} target="_blank" rel="noreferrer">
                    <img src={b.cover} alt="" loading="lazy" />
                    {replacing === b._id && (
                      <span className="fb-cover-busy">
                        <Loader2 size={22} className="md-spin" />
                        {up.state && !up.state.checking ? `${up.state.p}%` : ""}
                      </span>
                    )}
                  </a>
                  <div className="fb-bookinfo">
                    <h3>{b.title}</h3>
                    <div className="fb-tags">
                      <span>{m.pages.replace("{n}", b.file.pages)}</span>
                      <span>{mb(b.file.bytes)}</span>
                      <span>{m.views.replace("{n}", fmt(b.views))}</span>
                      {b.edition > 1 && <span>{m.edition.replace("{n}", b.edition)}</span>}
                      {b.big && <span className="gold">{m.big}</span>}
                      {b.has_password && (
                        <span className="warn">
                          <Lock size={11} /> {m.locked}
                        </span>
                      )}
                      {b.download && (
                        <span>
                          <Download size={11} />
                        </span>
                      )}
                      {b.lead_form?.mode && b.lead_form.mode !== "off" && (
                        <span className="ok">
                          <ClipboardList size={11} /> {m.formOn}
                        </span>
                      )}
                      {b.leads > 0 && (
                        <span className="ok">
                          <Users size={11} /> {m.contacts.replace("{n}", fmt(b.leads))}
                        </span>
                      )}
                      {b.links?.length > 0 && (
                        <span className="ok">
                          <MousePointerClick size={11} /> {m.linksN.replace("{n}", b.links.length)}
                        </span>
                      )}
                      {!b.published && (
                        <span className="warn">
                          <EyeOff size={11} /> {m.hidden}
                        </span>
                      )}
                    </div>
                    {b.category_ids?.length > 0 && <div className="fb-cats">{b.category_ids.map((c) => catName(c) && <span key={c}>{catName(c)}</span>)}</div>}
                    <div className="fb-acts">
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setEdit(b)} disabled={readOnly} data-testid="fb-edit">
                        <Pencil size={13} /> {m.edit}
                      </button>
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setQr(b)} data-testid="fb-qr">
                        <QrCode size={13} /> {m.linkQr}
                      </button>
                      <label className={`md-btn md-btn-ghost sa-btn-sm ${readOnly || up.state ? "disabled" : ""}`} title={m.replaceSub}>
                        <RefreshCw size={13} /> {m.replace}
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          hidden
                          disabled={readOnly || !!up.state}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) replace(b, f);
                          }}
                        />
                      </label>
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setPw(b)} disabled={readOnly} data-testid="fb-pw">
                        {b.has_password ? <Lock size={13} /> : <Unlock size={13} />} {m.password}
                      </button>
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setLeadBox(b)} disabled={readOnly} data-testid="fb-leadform">
                        <ClipboardList size={13} /> {m.leadForm}
                      </button>
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setLinksBox(b)} disabled={readOnly} data-testid="fb-links">
                        <MousePointerClick size={13} /> {m.links}
                      </button>
                      <a className="md-icon-btn" href={bookUrl(b.slug)} target="_blank" rel="noreferrer" aria-label={m.open}>
                        <ExternalLink size={15} />
                      </a>
                      <button type="button" className="md-icon-btn" onClick={() => move(i, -1)} disabled={readOnly || filtering || i === 0} aria-label="Up">
                        <ArrowUp size={15} />
                      </button>
                      <button type="button" className="md-icon-btn" onClick={() => move(i, 1)} disabled={readOnly || filtering || i === books.length - 1} aria-label="Down">
                        <ArrowDown size={15} />
                      </button>
                      <button type="button" className="md-icon-btn danger" onClick={() => setDel(b)} disabled={readOnly} aria-label={m.delete}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {slots && <BuySlots ctx={ctx} kind={slots} onClose={() => setSlots("")} />}
      {edit && <EditBook ctx={ctx} book={edit} onClose={() => setEdit(null)} onSaved={(row) => setBooks((list) => list.map((x) => (x._id === row._id ? row : x)))} />}
      {qr && (
        <Modal title={qr.title} onClose={() => setQr(null)} size="md-modal-lg">
          <QrCard ctx={ctx} url={bookUrl(qr.slug)} name={qr.title} header={data.settings.title || data.business.name} embed relink={{ kind: "book", id: qr._id }} onRelinked={(slug) => setQr({ ...qr, slug })} />
        </Modal>
      )}
      {leadBox && <LeadFormBox ctx={ctx} book={leadBox} onClose={() => setLeadBox(null)} onSaved={(row) => setBooks((list) => list.map((x) => (x._id === row._id ? row : x)))} />}
      {linksBox && <LinksEditor ctx={ctx} book={linksBox} onClose={() => setLinksBox(null)} onSaved={(row) => setBooks((list) => list.map((x) => (x._id === row._id ? row : x)))} />}
      {pw && <PasswordBox ctx={ctx} book={books.find((x) => x._id === pw._id) || pw} onClose={() => setPw(null)} onSaved={(row) => setBooks((list) => list.map((x) => (x._id === row._id ? row : x)))} />}
      {del && (
        <Confirm
          m={m}
          title={m.removeBook}
          sub={`${del.title} — ${m.removeBookSub}`}
          onClose={() => setDel(null)}
          onYes={async () => {
            try {
              const r = await flipbookService.removeBook(id, del._id);
              setBooks((list) => list.filter((x) => x._id !== del._id), r.room);
              notify({ type: "success", text: r.message });
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

function EditBook({ ctx, book, onClose, onSaved }) {
  const { id, m, lang, data, notify } = ctx;
  const [f, setF] = useState({ title: book.title, about: book.about || "", category_ids: (book.category_ids || []).map(String), published: book.published, download: book.download, reader_theme: book.reader_theme || "", slug: book.slug });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await flipbookService.saveBook(id, book._id, f);
      onSaved(r.data);
      notify({ type: "success", text: m.saved });
      onClose();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };
  const owned = data.reader_themes || ["classic"];
  return (
    <Modal
      title={m.edit}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || !f.title.trim()} data-testid="fb-edit-save">
            {busy && <Loader2 size={15} className="md-spin" />} {m.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <Field label={m.bookTitle}>
          <input value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="fb-edit-title" />
        </Field>
        <Field label={m.bookAbout}>
          <textarea rows={3} value={f.about} maxLength={600} onChange={(e) => setF({ ...f, about: e.target.value })} />
        </Field>
        <Field label={m.bookCats}>
          {!data.categories.length ? (
            <small className="rs-muted">{m.noCats}</small>
          ) : (
            <div className="fb-pick">
              {data.categories.map((c) => {
                const on = f.category_ids.includes(String(c._id));
                return (
                  <button key={c._id} type="button" className={on ? "on" : ""} onClick={() => setF({ ...f, category_ids: on ? f.category_ids.filter((x) => x !== String(c._id)) : [...f.category_ids, String(c._id)] })}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
        </Field>
        <Field label={m.readerLook}>
          <select value={f.reader_theme} onChange={(e) => setF({ ...f, reader_theme: e.target.value })}>
            <option value="">{m.readerDefault}</option>
            {READER_KEYS.filter((k) => owned.includes(k)).map((k) => (
              <option key={k} value={k}>
                {readerName(k, lang)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={m.bookLink} hint={m.slugHint}>
          <div className="fb-slug">
            <span>/b/</span>
            <input value={f.slug} maxLength={60} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
          </div>
        </Field>
        <Switch checked={f.published} onChange={(v) => setF({ ...f, published: v })} label={m.published} />
        <Switch checked={f.download} onChange={(v) => setF({ ...f, download: v })} label={m.allowDownload} />
        {err && <div className="md-form-error">{err}</div>}
      </div>
    </Modal>
  );
}

function PasswordBox({ ctx, book, onClose, onSaved }) {
  const { id, m, data, notify, readOnly } = ctx;
  const owned = (data.passwords || []).includes(String(book._id));
  const [p, setP] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const act = async (what) => {
    setBusy(what);
    setErr("");
    try {
      const r = what === "set" ? await flipbookService.setPassword(id, book._id, p) : await flipbookService.removePassword(id, book._id);
      onSaved(r.data);
      notify({ type: "success", text: m.saved });
      onClose();
    } catch (e) {
      setErr(e.message);
      setBusy("");
    }
  };
  return (
    <Modal title={m.pwTitle} onClose={onClose} busy={!!busy}>
      <div className="md-fields">
        <p className="rs-muted" style={{ margin: 0 }}>
          <b>{book.title}</b> — {m.pwSub}
        </p>
        {!owned ? (
          <>
            <p className="rs-muted" style={{ margin: 0 }}>
              {m.pwWhat}
            </p>
            <button
              type="button"
              className="md-btn md-btn-primary rs-gold-btn"
              disabled={readOnly}
              onClick={() => {
                onClose();
                ctx.askBuy({ password: book });
              }}
              data-testid="fb-pw-unlock"
            >
              <CoinIcon size={15} /> {m.pwUnlock.replace("{coins}", fmt(data.prices.fb_password))}
            </button>
          </>
        ) : (
          <>
            {book.has_password && (
              <div className="rs-pill on" style={{ alignSelf: "flex-start" }}>
                <Lock size={12} /> {m.pwOn}
              </div>
            )}
            <Field label={m.pwNew}>
              <input type="text" value={p} maxLength={40} onChange={(e) => setP(e.target.value)} autoComplete="off" data-testid="fb-pw-input" />
            </Field>
            <div className="fb-acts">
              <button type="button" className="md-btn md-btn-primary" disabled={!!busy || p.length < 4} onClick={() => act("set")} data-testid="fb-pw-set">
                {busy === "set" ? <Loader2 size={15} className="md-spin" /> : <Lock size={15} />} {m.pwSet}
              </button>
              {book.has_password && (
                <button type="button" className="md-btn md-btn-ghost" disabled={!!busy} onClick={() => act("remove")}>
                  {busy === "remove" ? <Loader2 size={15} className="md-spin" /> : <Unlock size={15} />} {m.pwRemove}
                </button>
              )}
            </div>
          </>
        )}
        <small className="rs-muted">{m.pwNote}</small>
        {err && <div className="md-form-error">{err}</div>}
      </div>
    </Modal>
  );
}
