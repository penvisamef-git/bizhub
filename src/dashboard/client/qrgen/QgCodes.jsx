import { useEffect, useState } from "react";
import { BarChart3, Copy, CopyPlus, Download, ExternalLink, FolderPlus, Inbox, Lock, Pencil, Plus, QrCode, RotateCcw, Search, Trash2, X } from "lucide-react";
import { qrgenService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { Field } from "../restaurant/parts";
import { isStatic } from "../../../qrgen/qrDesign";
import { Confirm, Head, QrView, TYPE_ICON, TYPE_NEEDS, TYPE_ORDER, downloadCodePng } from "./QgParts";
import QgEditor from "./QgEditor";
import { codeUrl, fmt, fmtDate } from "./text";

export default function QgCodes({ ctx }) {
  const { id, m, data, readOnly, notify } = ctx;
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [folder, setFolder] = useState("");
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(null); // code | { type }
  const [del, setDel] = useState(null);
  const [folderBox, setFolderBox] = useState(null); // {} new | folder
  const [delFolder, setDelFolder] = useState(null);
  const [trash, setTrash] = useState(false);
  const copy = async (c) => {
    try {
      const r = await qrgenService.copyCode(id, c._id);
      setCodes((list) => [r.data, ...list]);
      notify({ type: "success", text: m.duplicated });
    } catch (e) {
      notify({ type: "error", text: e.message });
    }
  };
  const logo = data.settings.logo?.url || "";
  const scanMe = m.frameLabelPh;
  const codes = data.codes;
  const words = q.trim().toLowerCase();
  const shown = codes.filter((c) => (!words || c.name.toLowerCase().includes(words)) && (!type || c.type === type) && (!folder || (folder === "none" ? !c.folder_id : c.folder_id === folder)));
  const setCodes = (fn) => ctx.put((d) => ({ codes: fn(d.codes) }));
  if (editing)
    return (
      <QgEditor
        ctx={ctx}
        start={editing}
        onClose={() => setEditing(null)}
        onSaved={(row, isNew) => {
          setCodes((list) => (isNew ? [row, ...list] : list.map((x) => (x._id === row._id ? row : x))));
          if (isNew) setEditing(row);
        }}
      />
    );
  const nameOfFolder = (fid) => data.folders.find((f) => f._id === fid)?.name;
  return (
    <div className="rs-col">
      <Head icon={QrCode} title={m.codesTitle} sub={m.codesSub}>
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setTrash(true)} data-testid="qg-trash">
          <Trash2 size={14} /> {m.trash}
          {data.counts?.trash ? <small className="rs-nav-count">{data.counts.trash}</small> : null}
        </button>
        <button type="button" className="md-btn md-btn-primary" onClick={() => setPicking(true)} disabled={readOnly} data-testid="qg-new">
          <Plus size={16} /> {m.newCode}
        </button>
      </Head>
      <section className="panel-card qg-toolbar">
        <label className="fb-search-box qg-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.search} data-testid="qg-search" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label={m.close}>
              <X size={15} />
            </button>
          )}
        </label>
        <select className="fb-select" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">{m.allTypes}</option>
          {TYPE_ORDER.map((k) => (
            <option key={k} value={k}>
              {m.types[k]}
            </option>
          ))}
        </select>
        <div className="qg-folders">
          {[["", m.allFolders, codes.length], ...data.folders.map((f) => [f._id, f.name, codes.filter((c) => c.folder_id === f._id).length]), ["none", m.noFolder, codes.filter((c) => !c.folder_id).length]].map(([k, label, n]) => (
            <span key={k || "all"} className={`qg-folder ${folder === k ? "on" : ""}`}>
              <button type="button" onClick={() => setFolder(k)} data-testid="qg-folder">
                {label} <small>{n}</small>
              </button>
              {k && k !== "none" && folder === k && !readOnly && (
                <>
                  <button type="button" className="qg-folder-act" onClick={() => setFolderBox(data.folders.find((f) => f._id === k))} aria-label={m.edit}>
                    <Pencil size={12} />
                  </button>
                  <button type="button" className="qg-folder-act" onClick={() => setDelFolder(data.folders.find((f) => f._id === k))} aria-label={m.delete}>
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </span>
          ))}
          <button type="button" className="qg-folder-new" onClick={() => setFolderBox({})} disabled={readOnly} data-testid="qg-folder-new">
            <FolderPlus size={14} /> {m.newFolder}
          </button>
        </div>
      </section>
      {!codes.length ? (
        <section className="panel-card sa-empty-state">
          <QrCode size={32} />
          <p>{m.noCodes}</p>
          <button type="button" className="md-btn md-btn-primary" onClick={() => setPicking(true)} disabled={readOnly}>
            <Plus size={16} /> {m.newCode}
          </button>
        </section>
      ) : (
        <div className="qg-grid">
          {shown.map((c) => {
            const Icon = TYPE_ICON[c.type] || QrCode;
            return (
              <article key={c._id} className={`panel-card qg-card ${c.active ? "" : "off"}`} data-testid="qg-card">
                <button type="button" className="qg-card-art" onClick={() => setEditing(c)} title={m.edit}>
                  <QrView code={c} logo={logo} size={150} scanMe={scanMe} />
                </button>
                <div className="qg-card-info">
                  <b title={c.name}>{c.name}</b>
                  <div className="qg-tags">
                    <span>
                      <Icon size={11} /> {m.types[c.type]}
                    </span>
                    {!isStatic(c.type) && (
                      <span>
                        <BarChart3 size={11} /> {m.scans.replace("{n}", fmt(c.scans))}
                      </span>
                    )}
                    {c.type === "form" && (
                      <span className={c.unread ? "qg-t-hot" : ""}>
                        <Inbox size={11} /> {m.replies.replace("{n}", fmt(c.replies))}
                        {c.unread ? ` · ${c.unread}` : ""}
                      </span>
                    )}
                    {c.has_password && (
                      <span>
                        <Lock size={11} />
                      </span>
                    )}
                    {!c.active && <span className="qg-t-warn">{m.paused}</span>}
                    {c.folder_id && nameOfFolder(c.folder_id) && <span className="qg-t-fold">{nameOfFolder(c.folder_id)}</span>}
                  </div>
                  <div className="qg-card-acts">
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setEditing(c)} data-testid="qg-edit">
                      <Pencil size={13} /> {m.edit}
                    </button>
                    <button type="button" className="md-icon-btn" onClick={() => copy(c)} disabled={readOnly} aria-label={m.duplicate} title={m.duplicate} data-testid="qg-copy">
                      <CopyPlus size={15} />
                    </button>
                    <button type="button" className="md-icon-btn" onClick={() => downloadCodePng(c, logo, scanMe)} aria-label={m.download} title={m.download}>
                      <Download size={15} />
                    </button>
                    {!isStatic(c.type) && (
                      <>
                        <button
                          type="button"
                          className="md-icon-btn"
                          onClick={() => {
                            navigator.clipboard?.writeText(codeUrl(c.slug)).catch(() => {});
                            notify({ type: "success", text: m.copied });
                          }}
                          aria-label={m.copyLink}
                          title={m.copyLink}
                        >
                          <Copy size={15} />
                        </button>
                        <a className="md-icon-btn" href={codeUrl(c.slug)} target="_blank" rel="noreferrer" aria-label={m.open} title={m.open}>
                          <ExternalLink size={15} />
                        </a>
                      </>
                    )}
                    <button type="button" className="md-icon-btn danger" onClick={() => setDel(c)} disabled={readOnly} aria-label={m.delete}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {picking && (
        <Modal title={m.pickType} onClose={() => setPicking(false)} size="md-modal-lg">
          <div className="qg-types">
            {TYPE_ORDER.map((k) => {
              const Icon = TYPE_ICON[k];
              const need = TYPE_NEEDS[k];
              const locked = need && !ctx.on(need);
              return (
                <button
                  key={k}
                  type="button"
                  className={`qg-type ${locked ? "locked" : ""}`}
                  data-testid={`qg-type-${k}`}
                  onClick={() => {
                    setPicking(false);
                    if (locked) ctx.askBuy({ addon: need });
                    else setEditing({ type: k });
                  }}
                >
                  <span className="qg-type-ic">
                    <Icon size={22} />
                  </span>
                  <b>
                    {m.types[k]}
                    {locked && (
                      <em>
                        <CoinIcon size={11} /> {fmt(data.addons[need].price)}
                      </em>
                    )}
                  </b>
                  <small>{m.typeWhat[k]}</small>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
      {trash && <TrashBox ctx={ctx} onClose={() => setTrash(false)} />}
      {folderBox && <FolderBox ctx={ctx} row={folderBox} onClose={() => setFolderBox(null)} />}
      {delFolder && (
        <Confirm
          m={m}
          title={m.removeFolder}
          sub={`${delFolder.name} — ${m.removeFolderSub}`}
          onClose={() => setDelFolder(null)}
          onYes={async () => {
            await qrgenService.removeFolder(id, delFolder._id);
            ctx.put((d) => ({ folders: d.folders.filter((f) => f._id !== delFolder._id), codes: d.codes.map((c) => (c.folder_id === delFolder._id ? { ...c, folder_id: null } : c)) }));
            setFolder("");
          }}
        />
      )}
      {del && (
        <Confirm
          m={m}
          title={m.removeCode}
          sub={`${del.name} — ${m.removeCodeSub}`}
          onClose={() => setDel(null)}
          onYes={async () => {
            try {
              const r = await qrgenService.removeCode(id, del._id);
              ctx.put((d) => ({ codes: d.codes.filter((x) => x._id !== del._id), files: r.files || d.files, counts: { ...d.counts, trash: (d.counts?.trash || 0) + 1 } }));
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

function FolderBox({ ctx, row, onClose }) {
  const { id, m, notify } = ctx;
  const [name, setName] = useState(row.name || "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      if (row._id) {
        const r = await qrgenService.saveFolder(id, row._id, name);
        ctx.put((d) => ({ folders: d.folders.map((f) => (f._id === row._id ? r.data : f)) }));
      } else {
        const r = await qrgenService.addFolder(id, name);
        ctx.put((d) => ({ folders: [...d.folders, r.data] }));
      }
      onClose();
    } catch (e) {
      notify({ type: "error", text: e.message });
      setBusy(false);
    }
  };
  return (
    <Modal
      title={row._id ? m.edit : m.newFolder}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || !name.trim()} data-testid="qg-folder-save">
            {m.save}
          </button>
        </>
      }
    >
      <Field label={m.folderName}>
        <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoFocus data-testid="qg-folder-name" onKeyDown={(e) => e.key === "Enter" && name.trim() && save()} />
      </Field>
    </Modal>
  );
}

// deleted QR codes (30 days): restore or delete for good
function TrashBox({ ctx, onClose }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState("");
  const [sure, setSure] = useState(null); // row | "all"
  const logo = data.settings.logo?.url || "";
  const load = () =>
    qrgenService
      .trash(id)
      .then(setRes)
      .catch((e) => notify({ type: "error", text: e.message }));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = res?.data || [];
  const sync = (n) => ctx.put((d) => ({ counts: { ...d.counts, trash: n } }));
  const restore = async (c) => {
    setBusy(c._id);
    try {
      const r = await qrgenService.restore(id, c._id);
      ctx.put((d) => ({ codes: [r.data, ...d.codes] }));
      setRes((x) => ({ ...x, data: x.data.filter((y) => y._id !== c._id) }));
      sync(rows.length - 1);
      notify({ type: "success", text: m.restored });
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <Modal title={m.trashTitle} onClose={onClose} size="md-modal-lg">
      <p className="rs-muted" style={{ marginTop: 0 }}>
        {m.trashSub.replace("{days}", res?.days || 30)}
      </p>
      {!res ? (
        <div className="qg-ibx-empty">…</div>
      ) : !rows.length ? (
        <div className="qg-ibx-empty">
          <Trash2 size={28} />
          <p>{m.trashEmpty}</p>
        </div>
      ) : (
        <>
          <ul className="qg-trash">
            {rows.map((c) => (
              <li key={c._id} data-testid="qg-trash-row">
                <QrView code={c} logo={logo} size={56} />
                <div>
                  <b>{c.name}</b>
                  <small className="rs-muted">
                    {m.types[c.type]} · {m.deletedAgo.replace("{date}", fmtDate(c.deleted_at, lang))}
                  </small>
                </div>
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => restore(c)} disabled={readOnly || !!busy} data-testid="qg-restore">
                  <RotateCcw size={13} /> {m.restore}
                </button>
                <button type="button" className="md-icon-btn danger" onClick={() => setSure(c)} disabled={readOnly || !!busy} aria-label={m.deleteForever} title={m.deleteForever}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm danger" onClick={() => setSure("all")} disabled={readOnly}>
            <Trash2 size={13} /> {m.emptyTrash}
          </button>
        </>
      )}
      {sure && (
        <Confirm
          m={m}
          title={sure === "all" ? m.emptyTrash : m.deleteForever}
          sub={sure === "all" ? m.emptyTrashSub : `${sure.name} — ${m.emptyTrashSub}`}
          onClose={() => setSure(null)}
          onYes={async () => {
            const r = sure === "all" ? await qrgenService.emptyTrash(id) : await qrgenService.purge(id, sure._id);
            const left = sure === "all" ? [] : rows.filter((y) => y._id !== sure._id);
            setRes((x) => ({ ...x, data: left }));
            ctx.put((d) => ({ files: r.files || d.files, counts: { ...d.counts, trash: left.length } }));
          }}
        />
      )}
    </Modal>
  );
}
