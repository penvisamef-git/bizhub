import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, ChevronRight, CloudOff, FolderOpen, Loader2, Lock, Paperclip, Search, StickyNote, X } from "lucide-react";
import { noteGroupPublic } from "../api/services";
import { ago, bytes, fmtTime, useNoteText } from "../dashboard/client/note/text";
import { guestKey, NAME_KEY, NameCard, NoteBody, OpensSoon, PinGate, PubTop, session, store } from "./NotePage";
import { themeLook } from "./themes";
import { DownloadBtn, FileDl, FileDlLabel } from "./blocks";
import { FileThumb, KIND_TONE, KindChips, useView, ViewSwitch } from "./files";
import "./notepage.css";

// /n/g/<token>: a group of notes sent with one link. The group's PIN, level, end date and safety options cover every note.
export default function GroupPage() {
  const { token } = useParams();
  const [params, setParams] = useSearchParams();
  const nid = params.get("n") || "";
  const filesView = !nid && params.get("files") === "1"; // the "All files" tab
  const { m, lang, setLang } = useNoteText();
  const guest = useRef(guestKey()).current;
  const pinKey = `bh_note_gpin:${token}`;
  const [pin, setPin] = useState(() => (session() ? store.get(pinKey, session()) : ""));
  const [phase, setPhase] = useState("loading"); // loading | pin | off | error | ok | notopen
  const [notOpen, setNotOpen] = useState(null); // the group (or the open note) is not open yet: { opens_at, business, title }
  const [pinErr, setPinErr] = useState("");
  const [g, setG] = useState(null); // the group + its notes
  const [d, setD] = useState(null); // the open note
  const [noteState, setNoteState] = useState(""); // "" | loading | off | error | pin (a note with its own PIN, in a group without one)
  const [notePinErr, setNotePinErr] = useState("");
  // PINs of single notes (only asked when the group itself has no PIN), kept for this browser tab
  const notePinKey = (id) => `bh_note_gnpin:${token}:${id}`;
  const notePinOf = (id) => (id && session() ? store.get(notePinKey(id), session()) : "") || "";
  const [notePin, setNotePin] = useState(() => notePinOf(nid));
  useEffect(() => {
    setNotePin(notePinOf(nid));
    setNotePinErr("");
  }, [nid]); // eslint-disable-line react-hooks/exhaustive-deps
  const [name, setName] = useState(() => store.get(NAME_KEY));
  const [askName, setAskName] = useState(false);
  const takeRef = useRef(null);
  // the group PIN covers its notes; without one, a note's own PIN goes in the same header
  const opts = useCallback(() => ({ pin: pin || notePin, guest }), [pin, notePin, guest]);

  const load = useCallback(
    async (poll = false, tryPin = pin) => {
      try {
        const r = await noteGroupPublic.get(token, { pin: tryPin, guest }, poll);
        setG(r.data);
        if (!poll) {
          const known = r.data.me?.name || "";
          if (known) setName((n) => n || known);
          setAskName(!!r.data.share?.ask_name && !known && !store.get(NAME_KEY));
        }
        setPhase("ok");
        setPinErr("");
        if (tryPin && session()) store.set(pinKey, tryPin, session());
      } catch (e) {
        if (poll) return;
        if (e.code === "not_open") {
          setNotOpen({ opens_at: e.response?.opens_at, now: e.response?.now, business: e.response?.business, title: e.response?.title || "" });
          return setPhase("notopen");
        }
        if (e.code === "pin") {
          setPhase("pin");
          if (tryPin) setPinErr(e.response?.wrong ? m.pubPinBad : "");
          if (session()) store.set(pinKey, "", session());
        } else if (e.code === "pin_wait" || e.status === 429) {
          setPhase("pin");
          setPinErr(e.message);
        } else if (e.status === 404) setPhase("off");
        else setPhase("error");
      }
    },
    [token, guest, pin, pinKey, m.pubPinBad],
  );
  useEffect(() => {
    load(false);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // the open note (?n=<id>)
  const loadNote = useCallback(
    async (poll = false, tryNotePin = notePin || notePinOf(nid)) => {
      if (!nid) return;
      if (!poll) setNoteState("loading");
      try {
        const r = await noteGroupPublic.note(token, nid, { pin: pin || tryNotePin, guest }, poll);
        setD((old) => {
          if (poll && old && r.data.share.level === "edit") return { ...r.data, note: { ...old.note, files: r.data.note.files, updated_date: r.data.note.updated_date, updated_by: r.data.note.updated_by } };
          return r.data;
        });
        if (poll && r.data.share.level === "edit") takeRef.current?.(r.data.note);
        setNoteState("");
        setNotePinErr("");
        if (!pin && tryNotePin && session()) store.set(notePinKey(nid), tryNotePin, session());
      } catch (e) {
        if (poll) return;
        if (e.code === "not_open") {
          setNotOpen({ opens_at: e.response?.opens_at, now: e.response?.now, business: e.response?.business, title: e.response?.title || "" });
          setD(null);
          return setNoteState("notopen");
        }
        if (e.code === "pin" || e.code === "pin_wait" || e.status === 429) {
          // the group has a PIN: its gate (the saved one stopped working) · no group PIN: this note's own PIN
          if (pin) return setPhase("pin");
          setNoteState("pin");
          setD(null);
          if (e.code === "pin_wait" || e.status === 429) setNotePinErr(e.message);
          else setNotePinErr(tryNotePin && e.response?.wrong ? m.pubPinBad : "");
          if (tryNotePin && session()) store.set(notePinKey(nid), "", session());
          return;
        }
        setNoteState(e.status === 404 ? "off" : "error");
      }
    },
    [token, nid, pin, notePin, guest, m.pubPinBad], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    setD(null);
    if (phase === "ok" && nid) loadNote(false);
  }, [nid, phase === "ok"]); // eslint-disable-line react-hooks/exhaustive-deps
  // new replies / versions every 15 s (not counted as views)
  useEffect(() => {
    if (phase !== "ok") return undefined;
    const t = setInterval(() => {
      if (document.hidden) return;
      if (nid) loadNote(true);
      else load(true);
    }, 15000);
    return () => clearInterval(t);
  }, [phase, nid, load, loadNote]);
  useEffect(() => {
    const title = d?.note?.title || g?.group?.name;
    if (title) document.title = `${title} · ${g?.share?.hide_owner || g?.business?.hidden ? m.pubShared : g?.business?.name || "BizHub"}`;
  }, [d?.note?.title, g?.group?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const pub = useMemo(
    () => ({
      save: (b, o) => noteGroupPublic.save(token, nid, b, o),
      addEntry: (b, o) => noteGroupPublic.addEntry(token, nid, b, o),
      saveEntry: (eid, b, o) => noteGroupPublic.saveEntry(token, nid, eid, b, o),
      removeEntry: (eid, o) => noteGroupPublic.removeEntry(token, nid, eid, o),
      fileUrl: (fid, o, inline) => noteGroupPublic.fileUrl(token, nid, fid, o, inline),
      entryFileUrl: (eid, fid, o, inline) => noteGroupPublic.entryFileUrl(token, nid, eid, fid, o, inline),
      ack: (name, o) => noteGroupPublic.ack(token, nid, name, o),
    }),
    [token, nid],
  );
  const openNote = (id) => {
    setParams(id ? { n: id } : {}, { replace: false });
    window.scrollTo({ top: 0 });
  };
  const showFiles = (on) => setParams(on ? { files: "1" } : {}, { replace: true });
  const rememberName = async (n) => {
    const v = n.trim().slice(0, 80);
    if (!v) return;
    setName(v);
    store.set(NAME_KEY, v);
    setAskName(false);
    noteGroupPublic.seen(token, v, opts()).catch(() => {});
    if (nid) noteGroupPublic.noteSeen(token, nid, v, opts()).catch(() => {});
  };
  const langBtn = (
    <button type="button" className="np-lang" onClick={() => setLang(lang === "km" ? "en" : "km")}>
      {m.pubLang}
    </button>
  );

  if (phase === "loading")
    return (
      <div className="np-page np-center">
        <Loader2 size={28} className="md-spin" />
      </div>
    );
  if (phase === "off" || phase === "error") return <Off m={m} off={phase === "off"} title={m.pubGroupOff} onRetry={() => (setPhase("loading"), load(false))} />;
  if (phase === "notopen") return <OpensSoon m={m} lang={lang} info={notOpen} langBtn={langBtn} onOpen={() => (setPhase("loading"), load(false))} />;
  if (phase === "pin") return <PinGate m={m} err={pinErr} langBtn={langBtn} title={m.pubGroupPin} onTry={(p) => (setPin(p), load(false, p))} />;
  if (nid && noteState === "notopen") return <OpensSoon m={m} lang={lang} info={notOpen} langBtn={langBtn} onBack={() => openNote("")} backLabel={g?.group?.name} onOpen={() => loadNote(false)} />;
  if (nid && noteState === "pin")
    return <PinGate m={m} err={notePinErr} langBtn={langBtn} onBack={() => openNote("")} backLabel={g?.group?.name} onTry={(p) => (setNotePin(p), loadNote(false, p))} />;

  const s = g.share || {};
  const notes = g.notes || [];
  // the bar + safety come from the group (the open note may add its own)
  const top = d && nid ? d : g;
  const noCopy = s.no_copy || (nid && d?.share?.no_copy);
  // the group's look covers every note opened through its link
  const look = themeLook(g.theme || g.group?.theme);
  const pic = (typeof g.group?.icon_image === "string" ? g.group.icon_image : g.group?.icon_image?.url) || "";
  return (
    <div className={`np-page np-group c-${(nid && d?.note?.color) || g.group?.color || "default"} ${look.className} ${noCopy ? "np-nocopy" : ""}`} style={look.style} data-testid="np-group">
      <PubTop d={{ ...top, share: { ...(top.share || {}), hide_owner: s.hide_owner || top.share?.hide_owner, no_copy: noCopy } }} m={m} name={askName ? "" : name} onMe={() => setAskName(true)} langBtn={langBtn} title={g.group?.name} />
      <main className="np-main" onCopy={noCopy ? (e) => e.target.closest?.("textarea, input") || e.preventDefault() : undefined}>
        {s.paused && <div className="np-banner warn">{m.pubPaused}</div>}
        {!s.paused && s.expired && <div className="np-banner">{m.pubExpired}</div>}
        {askName && <NameCard m={m} initial={name} onSave={rememberName} onSkip={() => setAskName(false)} />}

        {nid ? (
          <>
            <button type="button" className="np-back" onClick={() => openNote("")} data-testid="np-group-back">
              <ArrowLeft size={16} /> <span>{m.pubGroupBack}</span>
              <small>{g.group?.name}</small>
            </button>
            {noteState === "loading" && !d && (
              <div className="np-card np-center-card">
                <Loader2 size={24} className="md-spin" />
              </div>
            )}
            {(noteState === "off" || noteState === "error") && (
              <div className="np-card np-off">
                <span className="np-off-ic">{noteState === "off" ? <StickyNote size={30} /> : <CloudOff size={30} />}</span>
                <h1>{noteState === "off" ? m.pubOff : m.loadFail}</h1>
                {noteState === "error" && (
                  <button type="button" className="np-btn" onClick={() => loadNote(false)}>
                    {m.retry}
                  </button>
                )}
              </div>
            )}
            {d && <NoteBody key={nid} pub={pub} d={d} setD={setD} m={m} lang={lang} name={name} setName={rememberName} opts={opts} takeRef={takeRef} needName={() => setAskName(true)} />}
            <Neighbours notes={notes} nid={nid} m={m} onOpen={openNote} />
          </>
        ) : (
          <>
            <section className={`np-card np-ghero c-${g.group?.color || "default"}`}>
              <span className={`np-ghero-ic ${pic ? "has-pic" : ""}`}>{pic ? <img src={pic} alt="" /> : <FolderOpen size={26} />}</span>
              <div>
                <h1>{g.group?.name}</h1>
                <p>{(notes.length === 1 ? m.groupNote : m.pubGroupNotes).replace("{n}", notes.length)}</p>
              </div>
            </section>
            {g.files_count > 0 && (
              <div className="np-gtabs" role="tablist" data-testid="np-group-tabs">
                <button type="button" role="tab" aria-selected={!filesView} className={!filesView ? "on" : ""} onClick={() => showFiles(false)}>
                  <StickyNote size={15} /> {m.pubTabNotes} <small>{notes.length}</small>
                </button>
                <button type="button" role="tab" aria-selected={filesView} className={filesView ? "on" : ""} onClick={() => showFiles(true)} data-testid="np-tab-files">
                  <Paperclip size={15} /> {m.pubTabFiles} <small>{g.files_count}</small>
                </button>
              </div>
            )}
            {filesView && g.files_count > 0 ? (
              <PubFiles token={token} m={m} lang={lang} opts={opts} onOpen={openNote} />
            ) : (
              <>
            {notes.length === 0 && <p className="np-none np-card">{m.pubGroupEmpty}</p>}
            {notes.length > 0 && (
              <ul className="np-glist">
                {notes.map((n, i) => (
                  <li key={n._id}>
                    <button type="button" className={`np-gnote c-${n.color || "default"}`} onClick={() => openNote(n._id)} data-testid="np-gnote">
                      <span className="np-gnum">{i + 1}</span>
                      <span className="np-gnote-text">
                        <b>{n.title || m.untitled}</b>
                        {n.locked_until ? (
                          <small className="np-glock">
                            <CalendarClock size={12} /> {m.pubOpensShort.replace("{when}", fmtTime(n.locked_until, lang))}
                          </small>
                        ) : n.locked ? (
                          <small className="np-glock">
                            <Lock size={12} /> {m.pubPinTitle}
                          </small>
                        ) : (
                          n.preview && <small>{n.preview}</small>
                        )}
                        {n.updated_date && <em>{ago(n.updated_date, m, lang)}</em>}
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
              </>
            )}
          </>
        )}
        <a className="np-made" href="/" target="_blank" rel="noreferrer">
          {m.pubMade}
        </a>
      </main>
    </div>
  );
}

// "All files": every file in the group's notes — search, type chips, list / grid, download, open the note it is in
function PubFiles({ token, m, lang, opts, onOpen }) {
  const [view, setView] = useView("pub-group-files", "grid");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState("date");
  const [rows, setRows] = useState(null);
  const [totals, setTotals] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState("");
  const seq = useRef(0);
  const load = useCallback(
    (p = 1) => {
      const mine = ++seq.current;
      return noteGroupPublic
        .files(token, { q: q.trim(), kind, sort, page: p }, opts())
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
    [token, q, kind, sort, opts, m.loadFail],
  );
  useEffect(() => {
    const t = setTimeout(() => load(1), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  const dlFor = (r) => (f, inline) => noteGroupPublic.fileUrl(token, r.note_id, f._id, opts(), inline).then((x) => x.data?.url);

  return (
    <section className="np-card np-files" data-testid="np-group-files">
      <p className="np-files-sub">{m.pubFilesSub}</p>
      <div className="np-files-bar">
        <label className="np-files-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.pubFilesSearch} aria-label={m.pubFilesSearch} />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label={m.close}>
              <X size={14} />
            </button>
          )}
        </label>
        <select className="np-files-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={m.pubFilesSort.date}>
          {Object.keys(m.pubFilesSort).map((k) => (
            <option key={k} value={k}>
              {m.pubFilesSort[k]}
            </option>
          ))}
        </select>
        <ViewSwitch view={view} onChange={setView} listLabel={m.viewList} gridLabel={m.viewGrid} testid="np-files-view" />
      </div>
      {totals && <KindChips kinds={totals.kinds} kind={kind} onChange={setKind} total={totals.count} names={m.mediaKinds} />}
      {error && !rows && (
        <div className="np-files-msg">
          <p>{error}</p>
          <button type="button" className="np-btn" onClick={() => load(1)}>
            {m.retry}
          </button>
        </div>
      )}
      {!rows && !error && (
        <div className="np-files-msg">
          <Loader2 size={22} className="md-spin" />
        </div>
      )}
      {rows && !rows.length && <p className="np-files-msg">{q || kind !== "all" ? m.pubFilesNoMatch : m.pubFilesNone}</p>}
      {rows && rows.length > 0 && (
        <FileDlLabel.Provider value={m.download}>
          {view === "grid" ? (
            <div className="fv-grid np-files-grid">
              {rows.map((r) => (
                <article key={r._id} className="fv-card" data-testid="np-file-card">
                  <span className="fv-card-dl">
                    <FileDl.Provider value={dlFor(r)}>
                      <DownloadBtn file={{ _id: r._id, name: r.name, url: r.url }} className="fv-dl" />
                    </FileDl.Provider>
                  </span>
                  <span className="fv-card-pic">
                    <FileThumb r={r} big />
                    <span className="fv-card-type" style={{ background: `color-mix(in srgb, ${KIND_TONE[r.kind] || "#6b7280"} 85%, #000)` }}>
                      {m.mediaKinds[r.kind] || r.kind}
                    </span>
                  </span>
                  <span className="fv-card-body">
                    <b title={r.name}>{r.name || m.mediaKinds[r.kind]}</b>
                    <small>
                      {bytes(r.size)} · {fmtTime(r.at, lang)}
                    </small>
                    <button type="button" className="fv-card-note" onClick={() => onOpen(r.note_id)}>
                      {r.note_title || m.untitled}
                    </button>
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <ul className="np-files-list">
              {rows.map((r) => (
                <li key={r._id} data-testid="np-file-row">
                  <FileThumb r={r} />
                  <span className="np-files-name">
                    <b title={r.name}>{r.name || m.mediaKinds[r.kind]}</b>
                    <small>
                      <span className="np-files-kind" style={{ "--k": KIND_TONE[r.kind] }}>
                        {m.mediaKinds[r.kind] || r.kind}
                      </span>
                      {bytes(r.size)} · {fmtTime(r.at, lang)}
                    </small>
                    <button type="button" className="np-files-note" onClick={() => onOpen(r.note_id)}>
                      {r.note_title || m.untitled} <ChevronRight size={12} />
                    </button>
                  </span>
                  <FileDl.Provider value={dlFor(r)}>
                    <DownloadBtn file={{ _id: r._id, name: r.name, url: r.url }} className="np-files-dl" />
                  </FileDl.Provider>
                </li>
              ))}
            </ul>
          )}
        </FileDlLabel.Provider>
      )}
      {rows && page < pages && (
        <div className="np-files-more">
          <button type="button" className="np-ghost" onClick={() => load(page + 1)}>
            {m.loadMore}
          </button>
        </div>
      )}
    </section>
  );
}

// "previous / next note" under an open note
function Neighbours({ notes, nid, m, onOpen }) {
  const i = notes.findIndex((n) => n._id === nid);
  if (i < 0 || notes.length < 2) return null;
  const prev = notes[i - 1];
  const next = notes[i + 1];
  return (
    <nav className="np-neigh">
      {prev ? (
        <button type="button" onClick={() => onOpen(prev._id)}>
          <ArrowLeft size={15} /> <span>{prev.title || m.untitled}</span>
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button type="button" className="next" onClick={() => onOpen(next._id)}>
          <span>{next.title || m.untitled}</span> <ChevronRight size={15} />
        </button>
      )}
    </nav>
  );
}

function Off({ m, off, title, onRetry }) {
  return (
    <div className="np-page np-center">
      <div className="np-card np-off">
        <span className="np-off-ic">{off ? <FolderOpen size={30} /> : <CloudOff size={30} />}</span>
        <h1>{off ? title : m.loadFail}</h1>
        <p>{off ? m.pubOffSub : ""}</p>
        {!off && (
          <button type="button" className="np-btn" onClick={onRetry}>
            {m.retry}
          </button>
        )}
        <a className="np-made" href="/">
          {m.pubMade}
        </a>
      </div>
    </div>
  );
}
