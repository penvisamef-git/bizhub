import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, ExternalLink, FolderOpen, FolderPlus, Folders, ImagePlus, Loader2, Lock, Palette, Paperclip, PenLine, Plus, RotateCcw, Search, Share2, StickyNote, Trash2, Users, X } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { memo } from "../../../lib/memo";
import ShareDialog from "./ShareDialog";
import { TemplateChooser } from "./NoteList";
import { Avatar, Confirm, LevelBadge, Modal, copyText, pickFiles } from "./NoteParts";
import { GroupIcon } from "./NoteGroupsPicker";
import { LookDialog } from "./NoteLook";
import { ago, COLORS, fmt, fmtTime, SITE } from "./text";
import { KindChips, useView, ViewSwitch } from "../../../note/files";
import { FileItems } from "./FileViews";
import { StatsChart } from "./NoteV4";

const newKey = () => {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
};

// every note of the business (for the group's note list + the "Add notes" picker), up to 10 pages
async function allNotes(api, q = "") {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const r = await api.notes({ q, filter: "all", sort: "updated", page });
    out.push(...(r.data || []));
    if (page >= (r.pages || 1)) break;
  }
  return out;
}
const idOf = (x) => String(x?._id || x);
const groupUrl = (g) => `${SITE}${g.share?.path || `/n/g/${g.share?.token}`}`;

// Groups: folders of notes sent with one link (each group is paid once, 1 coin by default)
export function GroupsTab({ ctx }) {
  const { m, api, id } = ctx;
  const [params, setParams] = useSearchParams();
  const key = `note:groups:${id}`;
  const [groups, setGroups] = useState(() => memo.get(key) || null);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState("");
  const [making, setMaking] = useState(params.get("new") === "1");
  const [q, setQ] = useState("");
  const [view, setView] = useView("groups", "grid");
  const open = params.get("group") || "";
  // search by name (client side: hundreds of groups are still quick)
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? (groups || []).filter((g) => String(g.name || "").toLowerCase().includes(s)) : groups || [];
  }, [groups, q]);

  const load = useCallback(
    () =>
      api
        .groups(deleted ? { deleted: 1 } : undefined)
        .then((r) => {
          const list = (r.data || []).filter((g) => !!g.deleted === deleted);
          if (!deleted) memo.set(key, list);
          setGroups(list);
          setError("");
        })
        .catch((e) => setError(e.message || m.loadFail)),
    [api, deleted, key, m.loadFail],
  );
  useEffect(() => {
    load();
  }, [load]);
  // "Create a group" from the add-ons page opens the dialog once (not again on reload)
  useEffect(() => {
    if (params.get("new") !== "1") return;
    const p = new URLSearchParams(params);
    p.delete("new");
    setParams(p, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const put = (g) => setGroups((l) => (l || []).map((x) => (x._id === g._id ? { ...x, ...g } : x)));
  const goGroup = (gid) => ctx.go("groups", gid ? { group: gid } : {});

  if (open) {
    const g = (groups || []).find((x) => x._id === open);
    if (!g && !groups) return <Loading />;
    if (!g)
      return (
        <div className="panel-card sa-empty-state">
          <p>{error || m.loadFail}</p>
          <button type="button" className="md-btn md-btn-ghost" onClick={() => goGroup("")}>
            <ArrowLeft size={15} /> {m.allGroups}
          </button>
        </div>
      );
    return <GroupDetail ctx={ctx} g={g} put={put} back={() => goGroup("")} onGone={() => (load(), ctx.reload(), goGroup(""))} />;
  }

  return (
    <div className="nt-list nt-groups">
      <section className="panel-card nt-hero">
        <span className="nt-hero-ic nt-ic-group">
          <Folders size={24} />
        </span>
        <div className="nt-hero-text">
          <h2>{m.groupsTitle}</h2>
          <p className="rs-muted">{m.groupsSub}</p>
        </div>
        {!deleted && (
          <button type="button" className="md-btn md-btn-primary nt-new" onClick={() => setMaking(true)} disabled={ctx.readOnly} data-testid="nt-new-group">
            <FolderPlus size={17} /> {m.newGroup}
          </button>
        )}
      </section>
      <div className="nt-bar">
        <label className="nt-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.groupsSearch} aria-label={m.groupsSearch} data-testid="nt-groups-q" />
          {q && (
            <button type="button" className="nt-search-x" onClick={() => setQ("")} aria-label={m.mediaClear}>
              <X size={14} />
            </button>
          )}
        </label>
        <ViewSwitch view={view} onChange={setView} listLabel={m.viewList} gridLabel={m.viewGrid} testid="nt-groups-view" />
      </div>
      <div className="nt-chips">
        <button type="button" className={!deleted ? "on" : ""} onClick={() => setDeleted(false)}>
          {m.groupsTitle}
          {ctx.data.counts?.groups > 0 && <small>{fmt(ctx.data.counts.groups)}</small>}
        </button>
        <button type="button" className={deleted ? "on" : ""} onClick={() => setDeleted(true)}>
          {m.showDeleted}
        </button>
        <span className="nt-chip-note">
          <CoinIcon size={13} /> {m.newGroupPrice.replace("{coins}", fmt(ctx.prices.note_group))}
        </span>
      </div>
      {error && !groups && (
        <div className="panel-card sa-empty-state">
          <p>{error}</p>
          <button type="button" className="md-btn md-btn-primary" onClick={load}>
            {m.retry}
          </button>
        </div>
      )}
      {!groups && !error && (
        <div className="nt-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="nt-card nt-skel" />
          ))}
        </div>
      )}
      {groups && !groups.length && (
        <div className="panel-card nt-empty">
          <span className="nt-empty-art nt-ic-group">
            <Folders size={34} />
          </span>
          <h3>{deleted ? m.noDeleted : m.noGroups}</h3>
          {!deleted && <p className="rs-muted">{m.noGroupsSub}</p>}
          {!deleted && (
            <button type="button" className="md-btn md-btn-primary" onClick={() => setMaking(true)} disabled={ctx.readOnly}>
              <FolderPlus size={17} /> {m.newGroup}
            </button>
          )}
        </div>
      )}
      {groups && groups.length > 0 && !shown.length && <p className="nt-none">{m.groupsNoMatch}</p>}
      {groups && groups.length > 0 && shown.length > 0 && (
        <div className={view === "grid" ? "nt-grid" : "nt-rows"} data-testid={`nt-groups-${view}`}>
          {shown.map((g) => (
            <GroupCard
              row={view === "list"}
              key={g._id}
              g={g}
              m={m}
              lang={ctx.lang}
              onOpen={() => !deleted && goGroup(g._id)}
              onRestore={
                deleted
                  ? async () => {
                      try {
                        await api.restoreGroup(g._id);
                        ctx.notify({ type: "success", text: m.groupRestored });
                        ctx.reload();
                        load();
                      } catch (e) {
                        ctx.onError(e);
                      }
                    }
                  : null
              }
            />
          ))}
        </div>
      )}
      {making && (
        <GroupMaker
          ctx={ctx}
          onClose={() => setMaking(false)}
          onMade={(g) => {
            setMaking(false);
            load();
            ctx.reload();
            if (g?._id) goGroup(g._id);
          }}
        />
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="panel-card nt-loading">
      <Loader2 size={24} className="md-spin" />
    </div>
  );
}

function GroupCard({ g, m, lang, onOpen, onRestore, row = false }) {
  const count = g.notes_count ?? (g.note_ids || []).length;
  const files = g.files_count || 0;
  const restoreBtn = onRestore && (
    <button
      type="button"
      className="md-btn md-btn-ghost sa-btn-sm nt-gcard-restore"
      onClick={(e) => {
        e.stopPropagation();
        onRestore();
      }}
    >
      <RotateCcw size={14} /> {m.restoreGroup}
    </button>
  );
  // the compact row (list view)
  if (row)
    return (
      <article className={`nt-row nt-grow c-${g.color || "default"} ${onRestore ? "is-deleted" : ""}`} onClick={onOpen} role={onRestore ? undefined : "button"} tabIndex={onRestore ? -1 : 0} onKeyDown={(e) => e.key === "Enter" && onOpen()} data-testid="nt-group-row">
        <span className={`nt-gcard-ic ${g.icon_image ? "has-pic" : ""}`}>
          <GroupIcon g={g} size={20} />
        </span>
        <span className="nt-row-main">
          <b>{g.name}</b>
          <small>
            <StickyNote size={12} /> {(count === 1 ? m.groupNote : m.groupNotes).replace("{n}", fmt(count))}
            {files > 0 && (
              <>
                {" "}
                · <Paperclip size={12} /> {(files === 1 ? m.fileCount : m.filesCount).replace("{n}", fmt(files))}
              </>
            )}
          </small>
        </span>
        <span className="nt-row-side">
          <LevelBadge share={g.share} m={m} small />
          <em>{ago(g.updated_date, m, lang)}</em>
        </span>
        {restoreBtn}
      </article>
    );
  return (
    <article className={`nt-card nt-gcard c-${g.color || "default"} ${onRestore ? "is-deleted" : ""}`} onClick={onOpen} role={onRestore ? undefined : "button"} tabIndex={onRestore ? -1 : 0} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
      <span className="nt-gcard-tab" aria-hidden="true" />
      <div className="nt-gcard-top">
        <span className={`nt-gcard-ic ${g.icon_image ? "has-pic" : ""}`}>
          <GroupIcon g={g} size={22} />
        </span>
        <LevelBadge share={g.share} m={m} small />
      </div>
      <h3>{g.name}</h3>
      <div className="nt-card-foot">
        <span>
          <StickyNote size={13} /> {(count === 1 ? m.groupNote : m.groupNotes).replace("{n}", fmt(count))}
        </span>
        {files > 0 && (
          <span>
            <Paperclip size={13} /> {fmt(files)}
          </span>
        )}
        <span>{ago(g.updated_date, m, lang)}</span>
      </div>
      {restoreBtn}
    </article>
  );
}

// name + colour, then the coin window (each group is paid once)
function GroupMaker({ ctx, onClose, onMade }) {
  const { m } = ctx;
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const next = () => {
    const v = name.trim().slice(0, 80);
    if (!v) return;
    // one random key per create attempt: a double click or a retry can never pay twice for the same group
    ctx.askBuy({ kind: "group", name: v, color, onMade, key: newKey() });
    onClose();
  };
  return (
    <Modal
      title={m.newGroup}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={next} disabled={!name.trim()} data-testid="nt-group-next">
            <CoinIcon size={15} /> {m.groupNext.replace("{coins}", fmt(ctx.prices.note_group))}
          </button>
        </>
      }
    >
      <form
        className="nt-gmake"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <div className={`nt-gmake-art c-${color}`} aria-hidden="true">
          <FolderOpen size={40} />
          <b>{name.trim() || m.groupNamePh}</b>
        </div>
        <div className="md-field">
          <label htmlFor="nt-gname">{m.groupName}</label>
          <input id="nt-gname" className="md-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={m.groupNamePh} autoFocus data-testid="nt-group-name" />
        </div>
        <div className="md-field">
          <label>{m.groupColour}</label>
          <div className="nt-pop-colors nt-gmake-colors">
            {COLORS.map((c) => (
              <button key={c} type="button" className={`nt-sw c-${c} ${color === c ? "on" : ""}`} title={m.colours[c]} aria-label={m.colours[c]} aria-pressed={color === c} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <p className="rs-muted nt-gmake-sub">{m.groupBuySub}</p>
      </form>
    </Modal>
  );
}

// one group: its notes (order, add, remove), the link, who opened it
function GroupDetail({ ctx, g, put, back, onGone }) {
  const loadStats = useCallback(() => ctx.api.groupStats(g._id, 30), [ctx.api, g._id]);
  const { m, api, lang } = ctx;
  const [notes, setNotes] = useState(null); // every note of the business
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false); // "New note" made straight into this group
  const [sharing, setSharing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [asking, setAsking] = useState(false);
  const [seen, setSeen] = useState(null);
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState(false);
  const [looking, setLooking] = useState(false);
  const [pic, setPic] = useState(""); // "" | uploading | removing
  const [part, setPart] = useState("notes"); // notes | files
  const [nq, setNq] = useState(""); // search in the group's notes
  const ids = (g.note_ids || (g.notes || []).map(idOf)).map(String);
  const iconOwned = !!ctx.owns?.groupIcons?.has(String(g._id)) || !!g.icon_unlocked;
  // a picture for the group: unlock it once (2 coins), then upload / change for free
  const upload = async () => {
    const [file] = await pickFiles({ accept: "image/png,image/jpeg,image/webp" });
    if (!file) return;
    if (file.size > 2 * 1048576 || !/^image\/(png|jpe?g|webp)$/.test(file.type)) return ctx.notify({ type: "error", text: m.pictureBad });
    setPic("uploading");
    try {
      const r = await api.groupIcon(g._id, file);
      put({ icon_image: r.data?.icon_image ?? r.data?.url ?? "", ...(r.data && typeof r.data === "object" && r.data._id ? r.data : {}) });
      ctx.reload();
    } catch (e) {
      if (e.response?.code === "need_group_icon") ctx.askBuy({ kind: "groupIcon", gid: g._id, name: g.name, onDone: () => ctx.reload() });
      else ctx.onError(e);
    }
    setPic("");
  };
  const onPicture = () => {
    if (iconOwned) return upload();
    // after paying the person taps the button again (a file window can only open straight from a click)
    ctx.askBuy({ kind: "groupIcon", gid: g._id, name: g.name, onDone: () => ctx.reload() });
  };
  const dropPicture = async () => {
    setPic("removing");
    try {
      await api.removeGroupIcon(g._id);
      put({ icon_image: "" });
      ctx.reload();
    } catch (e) {
      ctx.onError(e);
    }
    setPic("");
  };
  const ro = ctx.readOnly;

  useEffect(() => {
    allNotes(api)
      .then(setNotes)
      .catch(() => setNotes([]));
    api
      .groupSeen(g._id)
      .then((r) => setSeen(r.data || []))
      .catch(() => setSeen([]));
  }, [api, g._id]);
  const byId = useMemo(() => {
    const map = Object.fromEntries((notes || []).map((n) => [String(n._id), n]));
    for (const n of g.notes || []) if (n && n._id && !map[n._id]) map[n._id] = n;
    return map;
  }, [notes, g.notes]);
  const list = ids.map((nid) => byId[nid]).filter(Boolean);
  // search the group's notes by title + preview (client side)
  const shownNotes = useMemo(() => {
    const t = nq.trim().toLowerCase();
    return t ? list.filter((n) => `${n.title || ""} ${n.preview || ""}`.toLowerCase().includes(t)) : list;
  }, [list, nq]);
  const filesCount = g.files_count ?? null;

  const save = async (body, okText) => {
    try {
      const r = await api.saveGroup(g._id, body);
      put({ ...body, ...(r.data || {}) });
      if (okText) ctx.notify({ type: "success", text: okText });
      return true;
    } catch (e) {
      ctx.onError(e);
      return false;
    }
  };
  const move = (nid, d) => {
    const i = ids.indexOf(nid);
    const j = i + d;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    put({ note_ids: next });
    save({ note_ids: next });
  };
  const drop = async (nid) => {
    setBusy(nid);
    try {
      const r = await api.groupDrop(g._id, nid);
      put({ note_ids: ids.filter((x) => x !== nid), ...(r.data || {}) });
    } catch (e) {
      ctx.onError(e);
    }
    setBusy("");
  };
  const add = async (nid) => {
    try {
      const r = await api.groupAdd(g._id, nid);
      put({ note_ids: [...ids.filter((x) => x !== nid), nid], ...(r.data || {}) });
    } catch (e) {
      ctx.onError(e);
    }
  };
  const shared = g.share?.level && g.share.level !== "off";
  const url = groupUrl(g);

  return (
    <div className={`nt-gdetail c-${g.color || "default"}`}>
      <div className="nt-ed-head">
        <button type="button" className="md-btn md-btn-ghost nt-back" onClick={back}>
          <ArrowLeft size={16} /> <span>{m.allGroups}</span>
        </button>
        <div className="nt-ed-acts">
          {shared && (
            <a className="md-btn md-btn-ghost nt-open" href={url} target="_blank" rel="noreferrer" title={m.open}>
              <ExternalLink size={16} /> <span>{m.open}</span>
            </a>
          )}
          <button type="button" className="md-btn md-btn-ghost nt-look-btn" onClick={() => setLooking(true)} disabled={ro} data-testid="nt-group-look">
            <Palette size={16} /> <span>{m.lookBtn}</span>
          </button>
          <button type="button" className="md-btn md-btn-primary nt-share-btn" onClick={() => setSharing(true)} data-testid="nt-group-share">
            <Share2 size={16} /> {m.shareGroup}
          </button>
        </div>
      </div>

      <section className="panel-card nt-ghead">
        <span className="nt-gpic-wrap">
          <button type="button" className={`nt-gcard-ic big ${g.icon_image ? "has-pic" : ""}`} onClick={onPicture} disabled={ro || !!pic} title={g.icon_image ? m.changePicture : m.addPicture} data-testid="nt-group-pic">
            {pic === "uploading" ? <Loader2 size={24} className="md-spin" /> : <GroupIcon g={g} size={28} />}
            <span className="nt-gpic-badge">{iconOwned ? <ImagePlus size={12} /> : <Lock size={11} />}</span>
          </button>
        </span>
        <div className="nt-ghead-text">
          <h2>{g.name}</h2>
          <div className="nt-ghead-meta">
            <LevelBadge share={g.share} m={m} />
            <span className="rs-muted">{(ids.length === 1 ? m.groupNote : m.groupNotes).replace("{n}", fmt(ids.length))}</span>
          </div>
        </div>
        <div className="nt-ghead-acts">
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setRenaming(true)} disabled={ro}>
            <PenLine size={14} /> {m.rename}
          </button>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={onPicture} disabled={ro || !!pic} data-testid="nt-group-pic-btn">
            {iconOwned ? <ImagePlus size={14} /> : <Lock size={13} />} {g.icon_image ? m.changePicture : iconOwned ? m.addPicture : m.addPictureFor.replace("{coins}", fmt(ctx.prices.note_group_icon))}
          </button>
          {g.icon_image && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={dropPicture} disabled={ro || !!pic}>
              {pic === "removing" ? <Loader2 size={14} className="md-spin" /> : <X size={14} />} {m.removePicture}
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm nt-danger" onClick={() => setAsking(true)}>
            <Trash2 size={14} /> {m.deleteGroup}
          </button>
        </div>
        {shared && (
          <div className="nt-glink">
            <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label={m.link} />
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              onClick={async () => {
                if (await copyText(url)) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? m.copied : m.copyLink}
            </button>
          </div>
        )}
      </section>

      <section className="panel-card nt-tab nt-gparts">
        <div className="nt-tab-head">
          <div className="nt-gtabs" role="tablist" aria-label={m.groupInside}>
            <button type="button" role="tab" aria-selected={part === "notes"} className={part === "notes" ? "on" : ""} onClick={() => setPart("notes")} data-testid="nt-gtab-notes">
              <StickyNote size={16} /> {m.groupTabNotes}
              <small>{fmt(ids.length)}</small>
            </button>
            <button type="button" role="tab" aria-selected={part === "files"} className={part === "files" ? "on" : ""} onClick={() => setPart("files")} data-testid="nt-gtab-files">
              <Paperclip size={16} /> {m.groupTabFiles}
              {filesCount > 0 && <small>{fmt(filesCount)}</small>}
            </button>
          </div>
          {part === "notes" && (
            <div className="nt-tab-btns">
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setCreating(true)} disabled={ro} data-testid="nt-group-new-note">
                <PenLine size={15} /> {m.newNoteHere}
              </button>
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setAdding(true)} disabled={ro} data-testid="nt-group-add">
                <Plus size={15} /> {m.addNotes}
              </button>
            </div>
          )}
        </div>
        {part === "notes" ? (
          <>
            {ids.length > 0 && (
              <label className="nt-search nt-gsearch">
                <Search size={16} />
                <input value={nq} onChange={(e) => setNq(e.target.value)} placeholder={m.groupNotesSearch} aria-label={m.groupNotesSearch} data-testid="nt-gnotes-q" />
                {nq && (
                  <button type="button" className="nt-search-x" onClick={() => setNq("")} aria-label={m.mediaClear}>
                    <X size={14} />
                  </button>
                )}
              </label>
            )}
            {!notes && ids.length > 0 && <Loading />}
            {notes && !list.length && <p className="rs-muted nt-gnone">{m.groupNoNotes}</p>}
            {list.length > 0 && !shownNotes.length && <p className="rs-muted nt-gnone">{m.groupNotesNoMatch}</p>}
            {shownNotes.length > 0 && (
              <ol className="nt-gnotes">
                {shownNotes.map((n) => {
                  const i = list.indexOf(n);
                  const searching = !!nq.trim();
                  return (
                    <li key={n._id} className={`c-${n.color || "default"}`}>
                      <span className="nt-gnum">{i + 1}</span>
                      <button type="button" className="nt-gnote" onClick={() => ctx.go("notes", { note: n._id, from: g._id })}>
                        <b>{n.title || m.untitled}</b>
                        {n.preview && <small>{n.preview}</small>}
                      </button>
                      <span className="nt-gnote-acts">
                        {!searching && (
                          <>
                            <button type="button" className="md-icon-btn" onClick={() => move(String(n._id), -1)} disabled={i === 0 || ro} aria-label={m.moveUp} title={m.moveUp}>
                              <ArrowUp size={15} />
                            </button>
                            <button type="button" className="md-icon-btn" onClick={() => move(String(n._id), 1)} disabled={i === list.length - 1 || ro} aria-label={m.moveDown} title={m.moveDown}>
                              <ArrowDown size={15} />
                            </button>
                          </>
                        )}
                        <button type="button" className="md-icon-btn" onClick={() => drop(String(n._id))} disabled={busy === String(n._id) || ro} aria-label={m.removeFromGroup} title={m.removeFromGroup}>
                          {busy === String(n._id) ? <Loader2 size={15} className="md-spin" /> : <X size={15} />}
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        ) : (
          <GroupFiles ctx={ctx} g={g} noteCount={ids.length} />
        )}
      </section>

      <StatsChart ctx={ctx} load={loadStats} title={m.statsGroupTitle} />
      <section className="panel-card nt-tab">
        <div className="nt-tab-head">
          <div>
            <h3>
              <Users size={18} /> {m.groupSeenTitle}
            </h3>
          </div>
        </div>
        {!seen && <Loading />}
        {seen && !seen.length && <p className="nt-none">{m.groupSeenNone}</p>}
        {seen && seen.length > 0 && (
          <ul className="nt-seen">
            {seen.map((s, i) => (
              <li key={i}>
                <Avatar name={s.name || m.guest} />
                <span className="nt-seen-name">
                  <b>{s.name || m.guest}</b>
                  <small>
                    {m.firstSeen}: {fmtTime(s.first_at, lang)}
                  </small>
                </span>
                <span className="nt-seen-last">
                  <b>{ago(s.last_at, m, lang)}</b>
                  <small>{m.times.replace("{n}", fmt(s.count))}</small>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {adding && <AddNotes ctx={ctx} g={g} ids={ids} onAdd={add} onDrop={drop} onClose={() => setAdding(false)} />}
      {creating && (
        <TemplateChooser
          ctx={ctx}
          preGroups={[g._id]}
          onClose={() => setCreating(false)}
          onMade={(note) => {
            setCreating(false);
            memo.set(`note:n:${note._id}`, note);
            ctx.reload();
            ctx.go("notes", { note: note._id, from: g._id });
          }}
        />
      )}
      {sharing && (
        <ShareDialog
          ctx={ctx}
          group={g}
          pinNotes={list.filter((n) => n.share?.has_pin).length}
          onClose={() => setSharing(false)}
          onSaved={(x) => {
            put(x?.share ? x : { share: { ...(g.share || {}), ...(x || {}) } });
            ctx.reload();
          }}
        />
      )}
      {looking && <LookDialog ctx={ctx} kind="group" target={g} onClose={() => setLooking(false)} onSaved={(r) => put({ theme: r.theme })} />}
      {renaming && <Rename m={m} initial={g.name} onClose={() => setRenaming(false)} onSave={(name) => save({ name }, m.groupSaved)} />}
      {asking && (
        <Confirm
          m={m}
          title={m.deleteGroupAsk}
          sub={m.deleteGroupSub}
          yes={m.deleteGroup}
          onClose={() => setAsking(false)}
          onYes={async () => {
            await api.removeGroup(g._id).catch((e) => (ctx.onError(e), Promise.reject(e)));
            ctx.notify({ type: "success", text: m.groupDeleted });
            onGone();
          }}
        />
      )}
    </div>
  );
}

// every file in the group's notes (free): search, type chips, list / grid, download, open the note (back = the group)
function GroupFiles({ ctx, g, noteCount }) {
  const { m, api } = ctx;
  const [view, setView] = useView("group-files", "grid");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [rows, setRows] = useState(null);
  const [totals, setTotals] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState("");
  const seq = useRef(0);
  const load = useCallback(
    (p = 1) => {
      const mine = ++seq.current;
      return api
        .groupFiles(g._id, { q: q.trim(), kind, page: p })
        .then((r) => {
          if (mine !== seq.current) return;
          setTotals(r.totals || null);
          setRows((old) => (p === 1 ? r.data || [] : [...(old || []), ...(r.data || [])]));
          setPage(p);
          setPages(r.pages || 1);
          setError("");
        })
        .catch((e) => mine === seq.current && setError(e.message || m.loadFail));
    },
    [api, g._id, q, kind, m.loadFail],
  );
  useEffect(() => {
    const t = setTimeout(() => load(1), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, noteCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const empty = totals && !totals.count;

  return (
    <div className="nt-gfiles" data-testid="nt-group-files">
      <p className="rs-muted nt-gfiles-sub">{m.groupFilesSub}</p>
      {!empty && (
        <>
          <div className="nt-bar">
            <label className="nt-search">
              <Search size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.groupFilesSearch} aria-label={m.groupFilesSearch} data-testid="nt-gfiles-q" />
              {q && (
                <button type="button" className="nt-search-x" onClick={() => setQ("")} aria-label={m.mediaClear}>
                  <X size={14} />
                </button>
              )}
            </label>
            <ViewSwitch view={view} onChange={setView} listLabel={m.viewList} gridLabel={m.viewGrid} testid="nt-gfiles-view" />
          </div>
          {totals && <KindChips kinds={totals.kinds} kind={kind} onChange={setKind} total={totals.count} names={m.mediaKinds} fmt={fmt} />}
        </>
      )}
      {error && !rows && (
        <div className="sa-empty-state">
          <p>{error}</p>
          <button type="button" className="md-btn md-btn-primary" onClick={() => load(1)}>
            {m.retry}
          </button>
        </div>
      )}
      {!rows && !error && <Loading />}
      {empty && <p className="rs-muted nt-gnone">{m.groupFilesNone}</p>}
      {rows && !rows.length && !empty && <p className="rs-muted nt-gnone">{m.groupFilesNoMatch}</p>}
      {rows && rows.length > 0 && (
        <div className={`nt-gfiles-list ${view === "grid" ? "is-grid" : ""}`}>
          <FileItems
            ctx={ctx}
            rows={rows}
            view={view}
            dl={(r, f, inline) => api.fileUrl(r.note_id, f._id, inline).then((x) => x.data?.url)}
            openNote={(r) => ctx.go("notes", { note: r.note_id, from: g._id })}
          />
        </div>
      )}
      {rows && page < pages && (
        <div className="nt-more">
          <button type="button" className="md-btn md-btn-ghost" onClick={() => load(page + 1)}>
            {m.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}

function Rename({ m, initial, onClose, onSave }) {
  const [v, setV] = useState(initial || "");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!v.trim()) return;
    setBusy(true);
    if (await onSave(v.trim().slice(0, 80))) onClose();
    else setBusy(false);
  };
  return (
    <Modal
      title={m.renameTitle}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={go} disabled={busy || !v.trim()}>
            {busy && <Loader2 size={15} className="md-spin" />} {m.save}
          </button>
        </>
      }
    >
      <input className="md-input" value={v} onChange={(e) => setV(e.target.value)} maxLength={80} autoFocus onKeyDown={(e) => e.key === "Enter" && go()} aria-label={m.groupName} />
    </Modal>
  );
}

// pick notes for the group (search, add / remove at once)
function AddNotes({ ctx, g, ids, onAdd, onDrop, onClose }) {
  const { m, api } = ctx;
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    let live = true;
    const t = setTimeout(
      () =>
        allNotes(api, q.trim())
          .then((r) => live && setRows(r))
          .catch(() => live && setRows([])),
      q ? 300 : 0,
    );
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [api, q]);
  const toggle = async (nid, inside) => {
    setBusy(nid);
    await (inside ? onDrop(nid) : onAdd(nid));
    setBusy("");
  };
  return (
    <Modal
      title={m.addNotesTitle.replace("{name}", g.name)}
      onClose={onClose}
      size="md-modal-lg"
      footer={
        <button type="button" className="md-btn md-btn-primary" onClick={onClose}>
          <Check size={15} /> {m.close}
        </button>
      }
    >
      <label className="nt-search nt-pick-search">
        <Search size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.addNotesSearch} aria-label={m.addNotesSearch} autoFocus />
      </label>
      {!rows && <Loading />}
      {rows && !rows.length && <p className="rs-muted nt-gnone">{m.addNotesNone}</p>}
      {rows && rows.length > 0 && (
        <ul className="nt-pick">
          {rows.map((n) => {
            const nid = String(n._id);
            const inside = ids.includes(nid);
            return (
              <li key={nid} className={`c-${n.color || "default"} ${inside ? "on" : ""}`}>
                <span className="nt-pick-dot" aria-hidden="true" />
                <span className="nt-pick-text">
                  <b>{n.title || m.untitled}</b>
                  {n.preview && <small>{n.preview}</small>}
                </span>
                <button type="button" className={`md-btn sa-btn-sm ${inside ? "md-btn-ghost" : "md-btn-primary"}`} onClick={() => toggle(nid, inside)} disabled={busy === nid} data-testid="nt-pick-toggle">
                  {busy === nid ? <Loader2 size={14} className="md-spin" /> : inside ? <Check size={14} /> : <Plus size={14} />} {inside ? m.inGroup : m.addThis}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
