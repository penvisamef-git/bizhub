import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, CloudOff, Copy, Download, ExternalLink, EyeOff, Eye, FileDown, FileText, Folder, Folders, History, LayoutTemplate, ListChecks, Loader2, Lock, MessageSquareText, MoreHorizontal, Palette, Paperclip, Pin, PinOff, RotateCcw, Send, Share2, Table2, Trash2, Upload, Users } from "lucide-react";
import { VoiceRecorder } from "../../../note/voice";
import { AckTab, fieldText, FormFieldsDialog, FormTable, PdfDialog, SaveTemplateDialog, StatsChart } from "./NoteV4";
import { memo } from "../../../lib/memo";
import { BlockEditor, BlockView, FileCard, FileDl, FileDlLabel, newBlock, useNoteDraft } from "../../../note/blocks";
import { paperOf, PAPERS } from "../../../note/style";
import { LookDialog } from "./NoteLook";
import { NoteGroupsPicker } from "./NoteGroupsPicker";
import ShareDialog from "./ShareDialog";
import DrawPad from "../../../note/DrawPad";
import { Avatar, Confirm, LevelBadge, Modal, StorageBar, pickFiles, uploadSigned } from "./NoteParts";
import { ago, COLORS, fmt, fmtTime, SITE } from "./text";

const SUBS = ["note", "entries", "acks", "seen", "files", "history"];
const SUB_ICON = { note: FileText, entries: MessageSquareText, acks: CheckCheck, seen: Users, files: Paperclip, history: History };

// errors that won't go away by trying again
const stopper = (ctx) => (e) => {
  if ([402, 403, 404].includes(e?.status)) {
    e.stop = true;
    ctx.onError(e);
  }
  throw e;
};

// one file → the note (checks the size, then browser → Cloudinary → API)
function useAttach(ctx, nid, onFile) {
  const { m, api } = ctx;
  const [state, setState] = useState(""); // "" | "Uploading 40%"
  const run = async (files) => {
    const limit = ctx.data.book?.file_limit || 20 * 1048576;
    for (const file of files) {
      if (file.size > limit) {
        ctx.notify({ type: "error", text: m.tooBig.replace("{mb}", Math.round(limit / 1048576)) });
        continue;
      }
      setState(m.uploading.replace("{p}", 0));
      try {
        const sign = (await api.uploadSign()).data;
        if (sign.storage_left !== undefined && file.size > sign.storage_left) throw Object.assign(new Error(m.storageFull), { full: true });
        const up = await uploadSigned(sign, file, (p) => setState(m.uploading.replace("{p}", p)));
        const r = await api.addFile(nid, { public_id: up.public_id, resource_type: up.resource_type, name: file.name });
        onFile(r.data);
        ctx.reload();
      } catch (e) {
        if (e.full || e.response?.code === "storage_full") ctx.askBuy("note_storage");
        ctx.notify({ type: "error", text: e.message });
        if (e.status === 402) ctx.onError(e);
      }
    }
    setState("");
  };
  return [state, run];
}

function SaveState({ status, m, onRetry }) {
  if (status === "saving" || status === "dirty")
    return (
      <span className="nt-save">
        <Loader2 size={14} className="md-spin" /> {m.saving}
      </span>
    );
  if (status === "error")
    return (
      <button type="button" className="nt-save bad" onClick={onRetry}>
        <CloudOff size={14} /> {m.notSaved} · {m.retry}
      </button>
    );
  if (status === "toolarge")
    return (
      <span className="nt-save bad">
        <CloudOff size={14} /> {m.tooLarge}
      </span>
    );
  if (status === "saved")
    return (
      <span className="nt-save ok">
        <Check size={14} /> {m.saved}
      </span>
    );
  return null;
}

// one note: write it (blocks, autosave), share it, see replies, who saw it, files, history
export default function NoteEditor({ ctx, nid }) {
  const { m, api } = ctx;
  const cacheKey = `note:n:${nid}`;
  const [note, setNoteState] = useState(() => memo.get(cacheKey) || null);
  const [error, setError] = useState("");
  const [sub, setSub] = useState(() => (SUBS.includes(new URLSearchParams(window.location.search).get("nt")) ? new URLSearchParams(window.location.search).get("nt") : "note"));
  const [sharing, setSharing] = useState(false);
  const setNote = useCallback(
    (n) =>
      setNoteState((old) => {
        const next = typeof n === "function" ? n(old) : n;
        if (next) memo.set(cacheKey, next);
        return next;
      }),
    [cacheKey],
  );
  useEffect(() => {
    api
      .note(nid)
      .then((r) => {
        setNote({ ...r.data.note, group_ids: r.data.group_ids || r.data.note.group_ids || [] });
        setError("");
      })
      .catch((e) => setError(e.message || m.loadFail));
  }, [api, nid, setNote, m.loadFail]);

  const pick = (k) => {
    setSub(k);
    const p = new URLSearchParams(window.location.search);
    if (k === "note") p.delete("nt");
    else p.set("nt", k);
    window.history.replaceState(null, "", `${window.location.pathname}?${p}`);
  };

  if (error && !note)
    return (
      <div className="panel-card sa-empty-state">
        <p>{error}</p>
        <button type="button" className="md-btn md-btn-ghost" onClick={() => ctx.go("notes")}>
          <ArrowLeft size={15} /> {m.back}
        </button>
      </div>
    );
  if (!note)
    return (
      <div className="panel-card nt-loading">
        <Loader2 size={24} className="md-spin" />
      </div>
    );
  const collect = note.share?.level === "collect";
  // downloads go through the API (a signed link; the file host refuses PDFs on their plain url)
  const dl = (f, inline) => api.fileUrl(note._id, f._id, inline).then((r) => r.data?.url);
  return (
    <div className={`nt-editor c-${note.color || "default"}`}>
      <FileDl.Provider value={dl}>
        <FileDlLabel.Provider value={m.download}>
          <Body ctx={ctx} note={note} setNote={setNote} sub={sub} pick={pick} collect={collect} onShare={() => setSharing(true)} />
        </FileDlLabel.Provider>
      </FileDl.Provider>
      {sharing && (
        <ShareDialog
          ctx={ctx}
          inGroups={(note.group_ids || []).length}
          note={note}
          onClose={() => setSharing(false)}
          onSaved={(n) => {
            setNote((old) => ({ ...old, ...n }));
            ctx.reload();
          }}
        />
      )}
    </div>
  );
}

function Body({ ctx, note, setNote, sub, pick, collect, onShare }) {
  const [urlParams] = useSearchParams();
  const fromGroup = urlParams.get("from") || ""; // opened from a group → Back returns there
  const { m, api, lang } = ctx;
  const nid = note._id;
  const ro = ctx.readOnly;
  const save = useCallback(
    (body) =>
      api
        .save(nid, body)
        .then((r) => {
          setNote((old) => ({ ...old, ...r.data }));
          return r.data;
        })
        .catch(stopper(ctx)),
    [api, nid, setNote, ctx],
  );
  const d = useNoteDraft(note, save);
  // the editor may have started from a cached copy: the fresh one (from the server) replaces it — or, while typing,
  // only moves the version when the text is the same (otherwise saving shows the conflict banner)
  useEffect(() => {
    d.take(note);
  }, [note.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const [menu, setMenu] = useState(false);
  const [ask, setAsk] = useState("");
  const [looking, setLooking] = useState(false);
  const [grouping, setGrouping] = useState(false);
  const [dialog, setDialog] = useState(""); // "" | template | pdf | form
  const [names, setNames] = useState([]); // for "who does it" on checklist items
  useEffect(() => {
    api
      .people()
      .then((r) => setNames(r.data || []))
      .catch(() => {});
  }, [api]);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menu) return undefined;
    const off = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [menu]);

  // people may edit the note too (edit level): look for a newer version every 20 s
  useEffect(() => {
    const t = setInterval(() => {
      if (document.hidden) return;
      api
        .note(nid)
        .then((r) => {
          const n = r.data.note;
          setNote((old) => ({ ...old, files: n.files, share: n.share, entry_count: n.entry_count, views: n.views, updated_by: n.updated_by, updated_date: n.updated_date, group_ids: r.data.group_ids || old.group_ids }));
          d.take(n);
        })
        .catch(() => {});
    }, 20000);
    return () => clearInterval(t);
  }, [api, nid]); // eslint-disable-line react-hooks/exhaustive-deps

  const attachAt = useRef(null);
  const [attaching, attach] = useAttach(ctx, nid, (file) => {
    setNote((old) => ({ ...old, files: [...(old.files || []).filter((f) => f._id !== file._id), file] }));
    d.edit((dr) => {
      const list = [...dr.blocks];
      let i = list.findIndex((b) => b.id === attachAt.current);
      if (i < 0) i = list.length - 1;
      const fb = { ...newBlock("file"), file_id: file._id };
      // an empty last paragraph: the file goes before it, so typing goes on below
      list.splice(i + 1, 0, fb);
      if (list[list.length - 1].t === "file") list.push(newBlock());
      return { blocks: list };
    });
  });
  // Signature & pen: a PNG from the pad → the note's files → a "draw" block after the caret
  const drawAt = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const signOwned = !!ctx.data.addons?.note_sign?.active;
  const onDraw = (afterId) => {
    if (!signOwned) return ctx.askBuy("note_sign");
    drawAt.current = afterId;
    setDrawing(true);
  };
  const saveDrawing = async (file, { onStep } = {}) => {
    // a step that does not answer in time stops with a clear message (never an endless spinner)
    const limit = (promise, ms, step) =>
      Promise.race([promise, new Promise((_, bad) => setTimeout(() => bad(Object.assign(new Error(m.padTimeout), { step, timeout: true })), ms))]);
    try {
      onStep?.(m.padStepPrepare);
      const sign = (await limit(api.uploadSign(), 30000, "sign")).data;
      if (sign.storage_left !== undefined && file.size > sign.storage_left) throw Object.assign(new Error(m.storageFull), { full: true });
      onStep?.(m.padStepUpload.replace("{p}", "0"));
      const up = await uploadSigned(sign, file, (pc) => onStep?.(m.padStepUpload.replace("{p}", pc)));
      onStep?.(m.padStepAttach);
      const r = await limit(api.addSign(nid, { public_id: up.public_id, resource_type: up.resource_type, name: file.name }), 45000, "attach");
      const f = r.data;
      setNote((old) => ({ ...old, files: [...(old.files || []).filter((x) => x._id !== f._id), f] }));
      d.edit((dr) => {
        const list = [...dr.blocks];
        let i = list.findIndex((b) => b.id === drawAt.current);
        if (i < 0) i = list.length - 1;
        list.splice(i + 1, 0, { ...newBlock("draw"), file_id: f._id });
        if (list[list.length - 1].t === "draw") list.push(newBlock());
        return { blocks: list };
      });
      ctx.notify({ type: "success", text: m.signAdded });
      ctx.reload();
    } catch (e) {
      const code = e.response?.code;
      if (code === "need_sign") {
        setDrawing(false);
        ctx.askBuy("note_sign");
      }
      if (e.full || code === "storage_full") ctx.askBuy("note_storage");
      if (e.status === 402) ctx.onError(e);
      // say which step failed, so a stuck upload is easy to report
      if (e.timeout) throw Object.assign(new Error(m.padTimeout), { step: e.step });
      if (e.step === "upload") throw Object.assign(new Error(`${m.padUploadFail} (${e.message})`), { step: e.step });
      throw e;
    }
  };
  // Voice notes: a clip from the recorder → the note's files → an "audio" block after the caret
  const voiceAt = useRef(null);
  const [recording, setRecording] = useState(false);
  const voiceOwned = !!ctx.owns?.voice;
  const onVoice = (afterId) => {
    if (!voiceOwned) return ctx.askBuy("note_voice");
    voiceAt.current = afterId;
    setRecording(true);
  };
  const saveVoice = async (file, { onStep } = {}) => {
    try {
      onStep?.(m.padStepPrepare);
      const sign = (await api.uploadSign()).data;
      if (sign.storage_left !== undefined && file.size > sign.storage_left) throw Object.assign(new Error(m.storageFull), { full: true });
      const up = await uploadSigned(sign, file, (pc) => onStep?.(m.padStepUpload.replace("{p}", pc)));
      onStep?.(m.padStepAttach);
      const r = await api.addVoice(nid, { public_id: up.public_id, resource_type: up.resource_type, name: file.name });
      const f = r.data;
      setNote((old) => ({ ...old, files: [...(old.files || []).filter((x) => x._id !== f._id), f] }));
      d.edit((dr) => {
        const list = [...dr.blocks];
        let i = list.findIndex((b) => b.id === voiceAt.current);
        if (i < 0) i = list.length - 1;
        list.splice(i + 1, 0, { ...newBlock("audio"), file_id: f._id });
        if (list[list.length - 1].t === "audio") list.push(newBlock());
        return { blocks: list };
      });
      ctx.notify({ type: "success", text: m.vcAdded });
      ctx.reload();
    } catch (e) {
      const code = e.response?.code;
      if (code === "need_voice") {
        setRecording(false);
        ctx.askBuy("note_voice");
      }
      if (e.full || code === "storage_full") ctx.askBuy("note_storage");
      throw e;
    }
  };
  const onAttach = async (afterId) => {
    attachAt.current = afterId;
    const files = await pickFiles({ multiple: true });
    if (files.length) attach(files);
  };

  const quick = async (body, okText) => {
    try {
      const r = await api.save(nid, body);
      setNote((old) => ({ ...old, ...r.data }));
      if (okText) ctx.notify({ type: "success", text: okText });
      ctx.reload();
    } catch (e) {
      ctx.onError(e);
    }
  };
  const [tags, setTags] = useState((note.tags || []).join(", "));
  const saveTags = () => {
    const list = [
      ...new Set(
        tags
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean),
      ),
    ].slice(0, 10);
    if (list.join(",") !== (note.tags || []).join(",")) quick({ tags: list });
  };
  const goBack = () => (fromGroup ? ctx.go("groups", { group: fromGroup }) : ctx.go("notes"));
  const url = `${SITE}${note.share?.path || `/n/${note.share?.token}`}`;
  const shared = note.share?.level && note.share.level !== "off";
  const counts = { entries: note.entry_count, files: note.files?.length };

  return (
    <>
      <div className="nt-ed-head">
        <button type="button" className="md-btn md-btn-ghost nt-back" onClick={goBack} data-testid="nt-back">
          <ArrowLeft size={16} /> <span>{fromGroup ? m.backToGroup : m.back}</span>
        </button>
        <SaveState status={d.status} m={m} onRetry={d.flush} />
        <div className="nt-ed-acts">
          {shared && (
            <a className="md-btn md-btn-ghost nt-open" href={url} target="_blank" rel="noreferrer" title={m.open}>
              <ExternalLink size={16} /> <span>{m.open}</span>
            </a>
          )}
          <button type="button" className="md-btn md-btn-ghost nt-groups-btn" onClick={() => setGrouping(true)} disabled={ro} title={m.groupsBtn} data-testid="nt-groups">
            <Folders size={16} /> <span>{m.groupsBtn}</span>
            {(note.group_ids || []).length > 0 && <small className="nt-count">{fmt(note.group_ids.length)}</small>}
          </button>
          <button type="button" className="md-btn md-btn-ghost nt-look-btn" onClick={() => setLooking(true)} disabled={ro} title={m.lookBtn} data-testid="nt-look">
            <Palette size={16} /> <span>{m.lookBtn}</span>
          </button>
          <button type="button" className="md-btn md-btn-primary nt-share-btn" onClick={onShare} data-testid="nt-share">
            <Share2 size={16} /> {m.share}
          </button>
          <div className="nt-card-menu" ref={menuRef}>
            <button type="button" className="md-icon-btn" onClick={() => setMenu((v) => !v)} aria-label="Menu" aria-expanded={menu}>
              <MoreHorizontal size={18} />
            </button>
            {menu && (
              <div className="nt-pop right" role="menu">
                <button type="button" onClick={() => (setMenu(false), quick({ pinned: !note.pinned }))}>
                  {note.pinned ? <PinOff size={15} /> : <Pin size={15} />} {note.pinned ? m.unpin : m.pin}
                </button>
                <div className="nt-pop-colors" aria-label={m.colour}>
                  {COLORS.map((c) => (
                    <button key={c} type="button" className={`nt-sw c-${c} ${(note.color || "default") === c ? "on" : ""}`} title={m.colours[c]} aria-label={m.colours[c]} onClick={() => quick({ color: c })} />
                  ))}
                </div>
                <span className="nt-pop-label">
                  {m.paperTitle}
                  {!ctx.owns?.style && <Lock size={11} />}
                </span>
                <div className="nt-pop-papers" aria-label={m.paperTitle}>
                  {PAPERS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`nt-paper-sw paper-${p} ${paperOf(note) === p ? "on" : ""}`}
                      title={m.papers[p]}
                      aria-label={m.papers[p]}
                      disabled={ro}
                      onClick={() => {
                        if (p !== "plain" && !ctx.owns?.style && paperOf(note) !== p) {
                          setMenu(false);
                          return ctx.askBuy("note_style");
                        }
                        quick({ paper: p });
                      }}
                      data-testid={`nt-paper-${p}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={ro}
                  onClick={async () => {
                    setMenu(false);
                    await d.flush();
                    try {
                      const r = await api.duplicate(nid);
                      ctx.notify({ type: "success", text: m.copiedOk });
                      ctx.reload();
                      ctx.go("notes", { note: r.data._id, ...(fromGroup ? { from: fromGroup } : {}) });
                    } catch (e) {
                      ctx.onError(e);
                    }
                  }}
                >
                  <Copy size={15} /> {m.duplicate}
                </button>
                <button type="button" disabled={ro} onClick={async () => (setMenu(false), await d.flush(), setDialog("template"))} data-testid="nt-menu-template">
                  <LayoutTemplate size={15} /> {m.tplSaveTitle}
                </button>
                <button type="button" onClick={async () => (setMenu(false), await d.flush(), ctx.owns?.pdf ? setDialog("pdf") : ctx.askBuy("note_pdf"))} data-testid="nt-menu-pdf">
                  <FileDown size={15} /> {m.pdfTitle}
                  {!ctx.owns?.pdf && <Lock size={12} className="nt-pop-lock" />}
                </button>
                <button type="button" className="danger" onClick={() => (setMenu(false), setAsk("delete"))}>
                  <Trash2 size={15} /> {m.delete}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {ask === "delete" && (
        <Confirm
          m={m}
          title={m.deleteAsk}
          sub={m.deleteAskSub}
          yes={m.delete}
          onClose={() => setAsk("")}
          onYes={async () => {
            await api.remove(nid).catch((e) => (ctx.onError(e), Promise.reject(e)));
            ctx.notify({ type: "success", text: m.deletedOk });
            ctx.reload();
            goBack();
          }}
        />
      )}

      <div className="nt-subs" role="tablist">
        {SUBS.filter((k) => k !== "acks" || note.share?.ack || ctx.owns?.ack).map((k) => {
          const Icon = SUB_ICON[k];
          const label = k === "entries" && collect ? m.collectTab : k === "acks" ? m.ackTab : m.noteTabs[k];
          return (
            <button key={k} type="button" role="tab" aria-selected={sub === k} className={sub === k ? "on" : ""} onClick={() => pick(k)} data-testid={`nt-sub-${k}`}>
              <Icon size={15} /> <span>{label}</span>
              {counts[k] > 0 && <small>{fmt(counts[k])}</small>}
            </button>
          );
        })}
        <span className="nt-subs-share">
          <LevelBadge share={note.share} m={m} />
        </span>
      </div>

      {sub === "note" && (
        <section className={`panel-card nt-paper paper-${paperOf(note)}`}>
          {d.status === "conflict" && (
            <div className="nt-conflict" role="alert">
              <span>{m.conflict}</span>
              <span className="nt-conflict-acts">
                <button type="button" className="md-btn md-btn-ghost" onClick={() => d.resolve(false)}>
                  {m.conflictReload}
                </button>
                <button type="button" className="md-btn md-btn-primary" onClick={() => d.resolve(true)}>
                  {m.conflictKeep}
                </button>
              </span>
            </div>
          )}
          <textarea
            className="nt-title"
            rows={1}
            value={d.draft.title}
            placeholder={m.titlePh}
            maxLength={200}
            disabled={ro}
            onChange={(e) => d.edit({ title: e.target.value.replace(/\n/g, " ") })}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            data-testid="nt-title"
          />
          <div className="nt-under-title">
            <span>{note.updated_by && note.updated_by !== "owner" ? `${ago(note.updated_date, m, lang)} · ${note.updated_by}` : ago(note.updated_date, m, lang)}</span>
            {(note.group_ids || []).length > 0 && (
              <button type="button" className="nt-in-groups" onClick={() => setGrouping(true)} disabled={ro}>
                <Folder size={13} /> {(note.group_ids.length === 1 ? m.groupsInOne : m.groupsIn).replace("{n}", fmt(note.group_ids.length))}
              </button>
            )}
            <input className="nt-tags-in" value={tags} onChange={(e) => setTags(e.target.value)} onBlur={saveTags} placeholder={m.tagsPh} aria-label={m.tagsPh} />
          </div>
          {ro ? (
            <BlockView blocks={d.draft.blocks} files={note.files} empty={m.emptyText} lang={lang} m={m} />
          ) : (
            <BlockEditor
              blocks={d.draft.blocks}
              onChange={(blocks) => d.edit({ blocks })}
              files={note.files}
              m={m}
              lang={lang}
              onAttach={onAttach}
              attaching={attaching}
              onDraw={onDraw}
              drawLocked={!signOwned}
              onVoice={onVoice}
              voiceLocked={!voiceOwned}
              names={names}
              styleOn={!!ctx.owns?.style}
              onLocked={() => ctx.askBuy("note_style")}
              autoFocus={!d.draft.title && d.draft.blocks.length <= 1 && !d.draft.blocks[0]?.text}
            />
          )}
        </section>
      )}
      {looking && <LookDialog ctx={ctx} target={{ ...note, title: d.draft.title, blocks: d.draft.blocks }} onClose={() => setLooking(false)} onSaved={(n) => setNote((old) => ({ ...old, theme: n.theme || old.theme }))} />}
      {grouping && <NoteGroupsPicker ctx={ctx} note={note} onClose={() => setGrouping(false)} onChanged={(ids) => setNote((old) => ({ ...old, group_ids: ids }))} />}
      {drawing && <DrawPad m={m} name={ctx.business?.name || ""} onClose={() => setDrawing(false)} onSave={saveDrawing} />}
      {recording && <VoiceRecorder m={m} onClose={() => setRecording(false)} onSave={saveVoice} saveLabel={m.vcAddToNote} />}
      {dialog === "template" && <SaveTemplateDialog ctx={ctx} note={{ ...note, title: d.draft.title }} onClose={() => setDialog("")} />}
      {dialog === "pdf" && <PdfDialog ctx={ctx} note={note} title={d.draft.title} blocks={d.draft.blocks} onClose={() => setDialog("")} />}
      {dialog === "form" && <FormFieldsDialog ctx={ctx} note={note} onClose={() => setDialog("")} onSaved={(n) => setNote((old) => ({ ...old, ...n }))} />}
      {sub === "entries" && <EntriesTab ctx={ctx} note={note} setNote={setNote} collect={collect} onFields={() => setDialog("form")} />}
      {sub === "acks" && <AckTab ctx={ctx} note={note} onShare={onShare} />}
      {sub === "seen" && <SeenTab ctx={ctx} note={note} />}
      {sub === "files" && <FilesTab ctx={ctx} note={note} setNote={setNote} draft={d} attaching={attaching} attach={attach} />}
      {sub === "history" && <HistoryTab ctx={ctx} note={note} setNote={setNote} draft={d} />}
    </>
  );
}

// ---------------------------------------------------------------- replies / responses

function EntriesTab({ ctx, note, setNote, collect, onFields }) {
  const { m, api, lang } = ctx;
  const fields = note.form?.fields || [];
  const [asTable, setAsTable] = useState(() => collect && fields.length > 0);
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(null);
  const load = useCallback(
    (p = 1) =>
      api
        .entries(note._id, p)
        .then((r) => {
          setRows((old) => (p === 1 ? r.data : [...(old || []), ...r.data]));
          setPage(p);
          setPages(r.pages || 1);
          setTotal(r.total ?? (r.data || []).length);
          if (p === 1) ctx.reload();
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [api, note._id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load(1);
  }, [load]);
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await api.reply(note._id, text.trim());
      setRows((old) => [r.data, ...(old || [])]);
      setTotal((t) => t + 1);
      setText("");
      setNote((old) => ({ ...old, entry_count: (old.entry_count || 0) + 1 }));
    } catch (e) {
      ctx.onError(e);
    }
    setBusy(false);
  };
  const toggle = async (e) => {
    try {
      const r = await api.setEntry(e._id, { hidden: !e.hidden });
      setRows((old) => old.map((x) => (x._id === e._id ? { ...x, ...r.data } : x)));
    } catch (er) {
      ctx.onError(er);
    }
  };
  // every row from the server (not only the pages loaded here)
  const download = () => api.exportCsv(note._id, `${(note.title || "note").replace(/[\\/:*?"<>|]+/g, "").trim() || "note"}.csv`).catch((er) => ctx.notify({ type: "error", text: er.message }));
  return (
    <section className="panel-card nt-tab">
      <div className="nt-tab-head">
        <div>
          <h3>{collect ? m.collectTitle : m.entriesTitle}</h3>
          {total > 0 && <p className="rs-muted">{collect ? m.people.replace("{n}", fmt(total)) : m.replies.replace("{n}", fmt(total))}</p>}
        </div>
        <div className="v4-entries-acts">
          {collect && (
            <button type="button" className="md-btn md-btn-ghost" onClick={onFields} disabled={ctx.readOnly} data-testid="nt-form-fields">
              <ListChecks size={15} /> {fields.length ? m.fxEdit.replace("{n}", fmt(fields.length)) : m.fxAdd}
              {!ctx.owns?.form && <Lock size={12} />}
            </button>
          )}
          {collect && fields.length > 0 && rows?.length > 0 && (
            <button type="button" className={`md-btn ${asTable ? "md-btn-primary" : "md-btn-ghost"}`} onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} data-testid="nt-as-table">
              <Table2 size={15} /> {m.fxTable}
            </button>
          )}
          {rows?.length > 0 && !(collect && fields.length > 0 && asTable) && (
            <button type="button" className="md-btn md-btn-ghost" onClick={download}>
              <Download size={15} /> {m.csv}
            </button>
          )}
        </div>
      </div>
      {collect && fields.length > 0 && asTable && rows && <FormTable ctx={ctx} note={note} rows={rows} />}
      {!collect && !ctx.readOnly && (
        <div className="nt-compose">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={m.replyPh} rows={2} maxLength={3000} />
          <button type="button" className="md-btn md-btn-primary" onClick={send} disabled={busy || !text.trim()}>
            {busy ? <Loader2 size={15} className="md-spin" /> : <Send size={15} />} {m.send}
          </button>
        </div>
      )}
      {!rows && (
        <div className="nt-loading">
          <Loader2 size={22} className="md-spin" />
        </div>
      )}
      {rows && !rows.length && <p className="nt-none">{collect ? m.noResponses : m.noEntries}</p>}
      {rows?.length > 0 && !(collect && fields.length > 0 && asTable) && (
        <ul className="nt-entries">
          {rows.map((e) => (
            <li key={e._id} className={`nt-entry ${e.hidden ? "is-hidden" : ""} ${e.by_owner ? "by-owner" : ""}`}>
              <Avatar name={e.name || (e.by_owner ? "★" : m.guest)} owner={e.by_owner} />
              <div className="nt-entry-body">
                <div className="nt-entry-top">
                  <b>{e.by_owner ? m.ownerTag : e.name || m.guest}</b>
                  {e.new && <em className="nt-tag new">{m.newTag}</em>}
                  {e.hidden && <em className="nt-tag">{m.hiddenTag}</em>}
                  <span className="nt-when" title={fmtTime(e.created_date, lang)}>
                    {ago(e.created_date, m, lang)}
                  </span>
                </div>
                {fields.length > 0 && e.fields && (
                  <dl className="v4-answers">
                    {fields
                      .filter((f) => fieldText(f, e.fields[f.id], m) !== "")
                      .map((f) => (
                        <div key={f.id}>
                          <dt>{f.label}</dt>
                          <dd>{fieldText(f, e.fields[f.id], m)}</dd>
                        </div>
                      ))}
                  </dl>
                )}
                {e.text && <p>{e.text}</p>}
                {e.files?.length > 0 && (
                  <FileDl.Provider value={(f, inline) => api.entryFileUrl(e._id, f._id, inline).then((r) => r.data?.url)}>
                    <div className="nt-entry-files">
                      {e.files.map((f) => (
                        <FileCard key={f._id} file={f} compact />
                      ))}
                    </div>
                  </FileDl.Provider>
                )}
              </div>
              <div className="nt-entry-acts">
                {!e.by_owner && (
                  <button type="button" className="md-icon-btn" onClick={() => toggle(e)} title={e.hidden ? m.unhide : m.hide} aria-label={e.hidden ? m.unhide : m.hide}>
                    {e.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                )}
                <button type="button" className="md-icon-btn" onClick={() => setAsk(e)} title={m.delete} aria-label={m.delete}>
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {rows && page < pages && (
        <div className="nt-more">
          <button type="button" className="md-btn md-btn-ghost" onClick={() => load(page + 1)}>
            {m.loadMore}
          </button>
        </div>
      )}
      {ask && (
        <Confirm
          m={m}
          title={m.entryDeleteAsk}
          sub={ask.files?.length ? m.entryDeleteSub : ""}
          yes={m.delete}
          onClose={() => setAsk(null)}
          onYes={async () => {
            await api.removeEntry(ask._id).catch((e) => (ctx.onError(e), Promise.reject(e)));
            setRows((old) => old.filter((x) => x._id !== ask._id));
            setTotal((t) => Math.max(0, t - 1));
            setNote((old) => ({ ...old, entry_count: Math.max(0, (old.entry_count || 1) - 1) }));
            ctx.reload();
          }}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------- seen by
function SeenTab({ ctx, note }) {
  const { m, api, lang } = ctx;
  const [rows, setRows] = useState(null);
  const loadStats = useCallback(() => api.stats(note._id, 30), [api, note._id]);
  useEffect(() => {
    api
      .seen(note._id)
      .then((r) => setRows(r.data || []))
      .catch((e) => (setRows([]), ctx.notify({ type: "error", text: e.message })));
  }, [api, note._id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
    <StatsChart ctx={ctx} load={loadStats} />
    <section className="panel-card nt-tab">
      <div className="nt-tab-head">
        <div>
          <h3>{m.seenTitle}</h3>
          <p className="rs-muted">
            {m.seenSub}
            {note.views > 0 && ` · ${m.viewsN.replace("{n}", fmt(note.views))}`}
          </p>
        </div>
      </div>
      {!rows && (
        <div className="nt-loading">
          <Loader2 size={22} className="md-spin" />
        </div>
      )}
      {rows && !rows.length && <p className="nt-none">{m.noSeen}</p>}
      {rows?.length > 0 && (
        <ul className="nt-seen">
          {rows.map((r, i) => (
            <li key={i}>
              <Avatar name={r.name || m.guest} />
              <span className="nt-seen-name">
                <b>{r.name || m.guest}</b>
                <small>
                  {m.firstSeen}: {fmtTime(r.first_at, lang)}
                </small>
              </span>
              <span className="nt-seen-last">
                <b>{ago(r.last_at, m, lang)}</b>
                <small>{m.times.replace("{n}", fmt(r.count))}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
    </>
  );
}

// ---------------------------------------------------------------- files

function FilesTab({ ctx, note, setNote, draft, attaching, attach }) {
  const { m, api, lang } = ctx;
  const [ask, setAsk] = useState(null);
  const files = note.files || [];
  return (
    <section className="panel-card nt-tab">
      <div className="nt-tab-head">
        <div>
          <h3>{m.filesTitle}</h3>
          <p className="rs-muted">{m.filesSub}</p>
        </div>
        {!ctx.readOnly && (
          <button
            type="button"
            className="md-btn md-btn-primary"
            disabled={!!attaching}
            onClick={async () => {
              const list = await pickFiles({ multiple: true });
              if (list.length) attach(list);
            }}
          >
            {attaching ? <Loader2 size={15} className="md-spin" /> : <Upload size={15} />} {attaching || m.upload}
          </button>
        )}
      </div>
      <StorageBar book={ctx.data.book} m={m} />
      {!files.length && <p className="nt-none">{m.noFiles}</p>}
      {files.length > 0 && (
        <ul className="nt-files">
          {files.map((f) => (
            <li key={f._id}>
              <FileCard file={f} compact />
              <span className="nt-file-meta">
                {f.by && f.by !== "owner" ? `${f.by} · ` : ""}
                {fmtTime(f.at, lang)}
              </span>
              <button type="button" className="md-icon-btn" onClick={() => setAsk(f)} aria-label={m.delete} title={m.delete}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {ask && (
        <Confirm
          m={m}
          title={m.fileDeleteAsk}
          sub={m.fileDeleteSub}
          yes={m.delete}
          onClose={() => setAsk(null)}
          onYes={async () => {
            await draft.flush();
            const r = await api.removeFile(note._id, ask._id).catch((e) => (ctx.onError(e), Promise.reject(e)));
            if (r?.data?._id) {
              setNote((old) => ({ ...old, ...r.data }));
              draft.take(r.data, true);
            } else setNote((old) => ({ ...old, files: old.files.filter((x) => x._id !== ask._id) }));
            ctx.reload();
          }}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------- history
function HistoryTab({ ctx, note, setNote, draft }) {
  const { m, api, lang } = ctx;
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null); // { row, full }
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      api
        .history(note._id)
        .then((r) => setRows(r.data || []))
        .catch((e) => (setRows([]), ctx.notify({ type: "error", text: e.message }))),
    [api, note._id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load]);
  const preview = async (row) => {
    setOpen({ row, full: null });
    try {
      const r = await api.historyOne(note._id, row._id);
      setOpen({ row, full: r.data });
    } catch (e) {
      setOpen(null);
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const restore = async () => {
    setBusy(true);
    try {
      await draft.flush();
      const r = await api.restoreVersion(note._id, open.row._id);
      setNote((old) => ({ ...old, ...r.data }));
      draft.take(r.data, true);
      ctx.notify({ type: "success", text: m.restoredVersion });
      setOpen(null);
      load();
    } catch (e) {
      ctx.onError(e);
    }
    setBusy(false);
  };
  const filesById = useMemo(() => note.files || [], [note.files]);
  return (
    <section className="panel-card nt-tab">
      <div className="nt-tab-head">
        <div>
          <h3>{m.historyTitle}</h3>
          <p className="rs-muted">{m.historySub}</p>
        </div>
      </div>
      {!rows && (
        <div className="nt-loading">
          <Loader2 size={22} className="md-spin" />
        </div>
      )}
      {rows && !rows.length && <p className="nt-none">{m.noHistory}</p>}
      {rows?.length > 0 && (
        <ul className="nt-hist">
          {rows.map((r, i) => (
            <li key={r._id}>
              <button type="button" onClick={() => preview(r)}>
                <span className="nt-hist-v">{m.version.replace("{n}", r.version)}</span>
                <span className="nt-hist-main">
                  <b>{r.title || m.untitled}</b>
                  <small>
                    {fmtTime(r.at, lang)} · {r.by === "owner" ? m.byOwner : r.by}
                  </small>
                </span>
                {i === 0 && r.version === note.version && <em className="nt-tag">✓</em>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Modal
          title={m.version.replace("{n}", open.row.version)}
          onClose={() => !busy && setOpen(null)}
          size="md-modal-lg"
          busy={busy}
          footer={
            <>
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setOpen(null)} disabled={busy}>
                {m.close}
              </button>
              <button type="button" className="md-btn md-btn-primary" onClick={restore} disabled={busy || !open.full || ctx.readOnly}>
                {busy ? <Loader2 size={15} className="md-spin" /> : <RotateCcw size={15} />} {m.restore}
              </button>
            </>
          }
        >
          <p className="rs-muted">{m.restoreSub}</p>
          <div className="nt-hist-preview">
            {!open.full ? (
              <Loader2 size={22} className="md-spin" />
            ) : (
              <>
                <h2>{open.full.title || m.untitled}</h2>
                <BlockView blocks={open.full.blocks} files={filesById} empty={m.emptyText} />
              </>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
