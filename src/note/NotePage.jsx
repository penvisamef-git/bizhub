import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Check, CheckCheck, Clock, CloudOff, KeyRound, Loader2, Lock, MessageSquareText, Mic, Paperclip, PenLine, Printer, Send, Signature, StickyNote, Trash2, X } from "lucide-react";
import { notePublic } from "../api/services";
import { ago, bytes, fmtTime, initialOf, useNoteText } from "../dashboard/client/note/text";
import { BlockEditor, BlockView, FileCard, FileDl, FileDlLabel, isMedia, useNoteDraft } from "./blocks";
import { paperOf } from "./style";
import { themeLook } from "./themes";
import DrawPad from "./DrawPad";
import { AudioPlayer, VoiceRecorder } from "./voice";
import "./notepage.css";

// /n/<token>: a shared note. What the visitor can do depends on the owner's choice:
// view · write below (reply) · edit together · sign-up list (collect, one row each)
const GUEST_KEY = "bh_note_guest";
export const NAME_KEY = "bh_note_name";
let memGuest = "";
export function guestKey() {
  try {
    let k = localStorage.getItem(GUEST_KEY);
    if (!k || !/^[A-Za-z0-9_-]{8,64}$/.test(k)) {
      k = makeKey();
      localStorage.setItem(GUEST_KEY, k);
    }
    return k;
  } catch {
    if (!memGuest) memGuest = makeKey();
    return memGuest;
  }
}
function makeKey() {
  const a = new Uint8Array(16);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return Array.from(a, (b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[b & 63]).join("");
}
export const store = {
  get: (k, s = localStorage) => {
    try {
      return s.getItem(k) || "";
    } catch {
      return "";
    }
  },
  set: (k, v, s = localStorage) => {
    try {
      if (v) s.setItem(k, v);
      else s.removeItem(k);
    } catch {
      /* private mode */
    }
  },
};
export const session = () => {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
};

export default function NotePage() {
  const { token } = useParams();
  const { m, lang, setLang } = useNoteText();
  const guest = useRef(guestKey()).current;
  const pinKey = `bh_note_pin:${token}`;
  const [pin, setPin] = useState(() => (session() ? store.get(pinKey, session()) : ""));
  const [phase, setPhase] = useState("loading"); // loading | pin | off | error | ok | notopen (before the owner's "Open from" time)
  const [notOpen, setNotOpen] = useState(null); // { opens_at, business, title }
  const [pinErr, setPinErr] = useState("");
  const [d, setD] = useState(null);
  const [name, setName] = useState(() => store.get(NAME_KEY));
  const [askName, setAskName] = useState(false);
  const takeRef = useRef(null); // the editor's take() (edit level)
  // what the note's parts call (a note inside a group link uses the same parts with the group's calls)
  const pub = useMemo(
    () => ({
      save: (b, o) => notePublic.save(token, b, o),
      addEntry: (b, o) => notePublic.addEntry(token, b, o),
      saveEntry: (eid, b, o) => notePublic.saveEntry(token, eid, b, o),
      removeEntry: (eid, o) => notePublic.removeEntry(token, eid, o),
      fileUrl: (fid, o, inline) => notePublic.fileUrl(token, fid, o, inline),
      entryFileUrl: (eid, fid, o, inline) => notePublic.entryFileUrl(token, eid, fid, o, inline),
      ack: (name, o) => notePublic.ack(token, name, o),
    }),
    [token],
  );

  const opts = useCallback(() => ({ pin, guest }), [pin, guest]);
  const load = useCallback(
    async (poll = false, tryPin = pin) => {
      try {
        const r = await notePublic.get(token, { pin: tryPin, guest }, poll);
        setD((old) => {
          // keep what the editor shows while typing; it takes the new version itself
          if (poll && old && r.data.share.level === "edit") return { ...r.data, note: { ...old.note, files: r.data.note.files, updated_date: r.data.note.updated_date, updated_by: r.data.note.updated_by } };
          return r.data;
        });
        if (poll && r.data.share.level === "edit") takeRef.current?.(r.data.note);
        if (!poll) {
          const known = r.data.me?.name || "";
          if (known) setName((n) => n || known);
          setAskName(r.data.share.ask_name && !known);
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
  // a new reply / version every 15 s (not counted as a view)
  useEffect(() => {
    if (phase !== "ok") return undefined;
    const t = setInterval(() => !document.hidden && load(true), 15000);
    return () => clearInterval(t);
  }, [phase, load]);
  useEffect(() => {
    if (d?.note) document.title = `${d.note.title || m.untitled} · ${d.business?.name || "BizHub"}`;
  }, [d?.note?.title, d?.business?.name, m.untitled]); // eslint-disable-line react-hooks/exhaustive-deps

  const langBtn = (
    <button type="button" className="np-lang" onClick={() => setLang(lang === "km" ? "en" : "km")}>
      {m.pubLang}
    </button>
  );
  const rememberName = async (n) => {
    const v = n.trim().slice(0, 80);
    if (!v) return;
    setName(v);
    store.set(NAME_KEY, v);
    setAskName(false);
    notePublic.seen(token, v, opts()).catch(() => {});
  };

  if (phase === "loading")
    return (
      <div className="np-page np-center">
        <Loader2 size={28} className="md-spin" />
      </div>
    );
  if (phase === "off" || phase === "error")
    return (
      <div className="np-page np-center">
        <div className="np-card np-off">
          <span className="np-off-ic">{phase === "off" ? <StickyNote size={30} /> : <CloudOff size={30} />}</span>
          <h1>{phase === "off" ? m.pubOff : m.loadFail}</h1>
          <p>{phase === "off" ? m.pubOffSub : ""}</p>
          {phase === "error" && (
            <button type="button" className="np-btn" onClick={() => (setPhase("loading"), load(false))}>
              {m.retry}
            </button>
          )}
          <a className="np-made" href="/">
            {m.pubMade}
          </a>
        </div>
      </div>
    );
  if (phase === "notopen") return <OpensSoon m={m} lang={lang} info={notOpen} langBtn={langBtn} onOpen={() => (setPhase("loading"), load(false))} />;
  if (phase === "pin") return <PinGate m={m} err={pinErr} langBtn={langBtn} onTry={(p) => (setPin(p), load(false, p))} />;

  const s = d.share;
  const look = themeLook(d.theme || d.note.theme);
  return (
    <div className={`np-page c-${d.note.color || "default"} ${look.className} ${s.no_copy ? "np-nocopy" : ""}`} style={look.style} data-testid="np-page">
      <PubTop d={d} m={m} name={askName ? "" : name} onMe={() => setAskName(true)} langBtn={langBtn} />
      <main className="np-main" onCopy={s.no_copy ? (e) => e.target.closest?.("textarea, input") || e.preventDefault() : undefined}>
        {s.paused && <div className="np-banner warn">{m.pubPaused}</div>}
        {!s.paused && s.expired && <div className="np-banner">{m.pubExpired}</div>}
        {askName && <NameCard m={m} initial={name} onSave={rememberName} onSkip={() => setAskName(false)} />}
        <NoteBody pub={pub} d={d} setD={setD} m={m} lang={lang} name={name} setName={rememberName} opts={opts} takeRef={takeRef} needName={() => setAskName(true)} />
        <a className="np-made" href="/" target="_blank" rel="noreferrer">
          {m.pubMade}
        </a>
      </main>
    </div>
  );
}

// before the owner's "Open from" time: a friendly countdown (nothing of the note is sent yet), opens by itself
// how many times the countdown already reached zero for an "Open from" time but the server still said "not yet"
const openTries = new Map();
export function OpensSoon({ m, lang, info, langBtn, onOpen, onBack, backLabel }) {
  const at = info?.opens_at ? new Date(info.opens_at).getTime() : 0;
  // count down on the server's clock (a phone set a few minutes ahead must not ask again and again)
  const skew = useMemo(() => {
    const server = info?.now ? new Date(info.now).getTime() : NaN;
    return Number.isNaN(server) ? 0 : server - Date.now();
  }, [info?.now]);
  const [now, setNow] = useState(() => Date.now() + skew);
  const fired = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + skew), 1000);
    return () => clearInterval(t);
  }, [skew]);
  const left = Math.max(0, at - now);
  useEffect(() => {
    if (at && left <= 0 && !fired.current) {
      fired.current = true;
      // the first time right away; when the server still says "not yet", wait longer each time (2 s, 4 s … 30 s)
      const n = openTries.get(at) || 0;
      openTries.set(at, n + 1);
      setTimeout(onOpen, n ? Math.min(30000, 1000 * 2 ** n) : 800); // not cleared on re-render (onOpen is a new function each time)
    }
  }, [left, at, onOpen]);
  const when = at
    ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(at))
    : "";
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const mi = Math.floor((left % 3600000) / 60000);
  const se = Math.floor((left % 60000) / 1000);
  const p2 = (n) => String(n).padStart(2, "0");
  const biz = info?.business;
  return (
    <div className="np-page np-center">
      <div className="np-card np-off np-opens" data-testid="np-opens">
        <div className="np-pin-lang">{langBtn}</div>
        {onBack && (
          <button type="button" className="np-back np-pin-back" onClick={onBack}>
            <ArrowLeft size={16} /> <span>{backLabel || m.pubGroupBack}</span>
          </button>
        )}
        <span className="np-off-ic">
          <CalendarClock size={30} />
        </span>
        {biz?.name && <small className="np-opens-biz">{biz.name}</small>}
        <h1>{info?.title || m.pubOpensTitle}</h1>
        <p>{m.pubOpensSub.replace("{when}", when)}</p>
        {left > 0 && left < 86400000 ? (
          <div className="np-count" aria-live="polite">
            <span>
              <b>{p2(h)}</b>
              <small>{m.pubHours}</small>
            </span>
            <span>
              <b>{p2(mi)}</b>
              <small>{m.pubMinutes}</small>
            </span>
            <span>
              <b>{p2(se)}</b>
              <small>{m.pubSeconds}</small>
            </span>
          </div>
        ) : left > 0 ? (
          <p className="np-count-days">{m.pubOpensIn.replace("{d}", d).replace("{h}", h)}</p>
        ) : (
          <p className="np-count-days">
            <Loader2 size={16} className="md-spin" /> {m.pubOpening}
          </p>
        )}
        <a className="np-made" href="/">
          {m.pubMade}
        </a>
      </div>
    </div>
  );
}

// the bar on top: the owner's business (unless hidden), me, print (unless copying is made harder), language
export function PubTop({ d, m, name, onMe, langBtn, title, children }) {
  const hidden = d.share?.hide_owner || d.business?.hidden;
  return (
    <header className="np-top">
      {children}
      <span className="np-brand">
        {!hidden && d.business?.logo ? <img src={d.business.logo} alt="" /> : <StickyNote size={18} />}
        <b>{hidden ? title || m.pubSharedNote : d.business?.name}</b>
      </span>
      <span className="np-top-acts">
        {name && (
          <button type="button" className="np-me" onClick={onMe} title={m.pubChange}>
            <span className="np-av sm">{initialOf(name)}</span>
            <span className="np-me-name">{name}</span>
          </button>
        )}
        {!d.share?.no_copy && (
          <button type="button" className="np-icon" onClick={() => window.print()} title={m.pubPrint} aria-label={m.pubPrint}>
            <Printer size={18} />
          </button>
        )}
        {langBtn}
      </span>
    </header>
  );
}

// the note itself + what the visitor may do under it (one note link, or a note opened from a group link)
export function NoteBody({ pub, d, setD, m, lang, name, setName, opts, takeRef, needName }) {
  const level = d.share.level;
  const canWrite = level === "reply" || level === "edit";
  const showList = level === "collect" ? false : canWrite || d.entries.length > 0;
  // downloads go through the API (a short-lived link with the file's own name)
  const dl = useCallback((f, inline) => pub.fileUrl?.(f._id, opts(), inline).then((r) => r.data?.url || r.url), [pub, opts]);
  return (
    <FileDl.Provider value={pub.fileUrl ? dl : null}>
      <FileDlLabel.Provider value={m.download}>
      <article className={`np-card np-note paper-${paperOf(d.note)}`}>
        {level === "edit" ? (
          <EditView pub={pub} d={d} m={m} lang={lang} name={name} opts={opts} takeRef={takeRef} needName={needName} />
        ) : (
          <>
            <h1 className="np-title">{d.note.title || m.untitled}</h1>
            <Updated d={d} m={m} lang={lang} />
            <BlockView blocks={d.note.blocks} files={d.note.files} empty={m.emptyText} lang={lang} m={m} />
          </>
        )}
        <LooseFiles note={d.note} m={m} />
      </article>
      {d.ack?.on && <AckCard pub={pub} d={d} setD={setD} m={m} lang={lang} name={name} setName={setName} opts={opts} needName={needName} />}
      {level === "collect" && <Collect pub={pub} d={d} setD={setD} m={m} lang={lang} name={name} setName={setName} opts={opts} />}
      {showList && <Replies pub={pub} d={d} setD={setD} m={m} lang={lang} name={name} setName={setName} opts={opts} canWrite={canWrite} />}
      </FileDlLabel.Provider>
    </FileDl.Provider>
  );
}

function Updated({ d, m, lang }) {
  if (!d.note.updated_date) return null;
  const by = !d.note.updated_by || d.note.updated_by === "owner" ? m.pubOwner : d.note.updated_by;
  return (
    <p className="np-updated">
      <Clock size={13} /> {m.pubUpdated.replace("{when}", ago(d.note.updated_date, m, lang)).replace("{by}", by)}
    </p>
  );
}

// "I've read it": one tap (with a name when the owner asks for it); after that "You confirmed on …"
function AckCard({ pub, d, setD, m, lang, name, setName, opts, needName }) {
  const mine = d.ack?.mine;
  const [who, setWho] = useState(name || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => setWho((w) => w || name || ""), [name]);
  const needs = d.share.ask_name && !name;
  const go = async () => {
    const nm = (name || who).trim();
    if (d.share.ask_name && !nm) {
      setErr(m.pubNeedName);
      return needName?.();
    }
    setBusy(true);
    setErr("");
    try {
      const r = await pub.ack(nm, opts());
      const row = r.data || r;
      if (!name && nm) setName(nm);
      setD((old) => ({ ...old, ack: { ...old.ack, mine: { name: row.name || nm, at: row.at || new Date().toISOString() } } }));
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };
  if (mine)
    return (
      <section className="np-card np-ack done" data-testid="np-ack-done">
        <span className="np-ack-ic">
          <CheckCheck size={22} />
        </span>
        <div>
          <b>{m.pubAckDone}</b>
          <small>{m.pubAckWhen.replace("{when}", fmtTime(mine.at, lang)).replace("{name}", mine.name || name || "")}</small>
        </div>
      </section>
    );
  return (
    <section className="np-card np-ack" data-testid="np-ack">
      <div className="np-ack-text">
        <b>{m.pubAckAsk}</b>
        <small>{m.pubAckSub}</small>
      </div>
      {needs && <input className="np-who" value={who} onChange={(e) => setWho(e.target.value)} placeholder={m.pubNamePh} maxLength={80} aria-label={m.pubNamePh} />}
      {err && <p className="np-err">{err}</p>}
      <button type="button" className="np-btn np-ack-btn" onClick={go} disabled={busy || (d.share.paused && !mine)} data-testid="np-ack-btn">
        {busy ? <Loader2 size={18} className="md-spin" /> : <CheckCheck size={18} />} {m.ackBtn}
      </button>
    </section>
  );
}

// files of the note that no file block shows
function LooseFiles({ note, m }) {
  const used = new Set((note.blocks || []).filter(isMedia).map((b) => String(b.file_id)));
  const rest = (note.files || []).filter((f) => !used.has(String(f._id)));
  if (!rest.length) return null;
  return (
    <div className="np-loose">
      <h3>
        <Paperclip size={15} /> {m.pubFiles}
      </h3>
      <div className="np-filelist">
        {rest.map((f) => (
          <FileCard key={f._id} file={f} compact />
        ))}
      </div>
    </div>
  );
}

export function PinGate({ m, err, onTry, langBtn, title, onBack, backLabel }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setBusy(false), [err]);
  return (
    <div className="np-page np-center">
      <form
        className="np-card np-pin"
        onSubmit={(e) => {
          e.preventDefault();
          if (v.length < 4) return;
          setBusy(true);
          // every try ends the spinner (the same "wrong PIN" message twice would not)
          Promise.resolve(onTry(v)).finally(() => setBusy(false));
        }}
      >
        <div className="np-pin-lang">{langBtn}</div>
        {onBack && (
          <button type="button" className="np-back np-pin-back" onClick={onBack}>
            <ArrowLeft size={16} /> <span>{backLabel || m.pubGroupBack}</span>
          </button>
        )}
        <span className="np-off-ic">
          <Lock size={28} />
        </span>
        <h1>{title || m.pubPinTitle}</h1>
        <p>{m.pubPinSub}</p>
        <input className="np-pin-in" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))} autoFocus aria-label="PIN" data-testid="np-pin" />
        {err && <p className="np-err">{err}</p>}
        <button type="submit" className="np-btn" disabled={v.length < 4 || busy}>
          {busy ? <Loader2 size={16} className="md-spin" /> : <KeyRound size={16} />} {m.pubOpen}
        </button>
      </form>
    </div>
  );
}

export function NameCard({ m, initial, onSave, onSkip }) {
  const [v, setV] = useState(initial || "");
  return (
    <form
      className="np-card np-name"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(v);
      }}
    >
      <div>
        <b>{m.pubWho}</b>
        <small>{m.pubWhoSub}</small>
      </div>
      <div className="np-name-row">
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder={m.pubNamePh} maxLength={80} autoFocus aria-label={m.pubNamePh} data-testid="np-name" />
        <button type="submit" className="np-btn" disabled={!v.trim()}>
          <Check size={16} /> {m.save}
        </button>
        <button type="button" className="np-ghost" onClick={onSkip}>
          {m.pubSkip}
        </button>
      </div>
    </form>
  );
}

// edit level: the same block editor as the owner, saved by itself
function EditView({ pub, d, m, lang, name, opts, takeRef, needName }) {
  const save = useCallback(
    (body) =>
      pub.save({ ...body, name: name || "" }, opts()).then(
        (r) => r.data,
        (e) => {
          if (e.response?.code === "need_name") {
            e.stop = true;
            needName();
          }
          if (e.status === 403 || e.status === 404) e.stop = true;
          throw e;
        },
      ),
    [pub, name, opts, needName],
  );
  const dr = useNoteDraft(d.note, save);
  useEffect(() => {
    takeRef.current = dr.take;
    return () => {
      takeRef.current = null;
    };
  }, [dr.take, takeRef]);
  return (
    <>
      <div className="np-editing">
        <span>
          <PenLine size={14} /> {m.pubEditing}
        </span>
        <span className={`np-save s-${dr.status}`}>
          {(dr.status === "saving" || dr.status === "dirty") && (
            <>
              <Loader2 size={13} className="md-spin" /> {m.saving}
            </>
          )}
          {dr.status === "saved" && (
            <>
              <Check size={13} /> {m.saved}
            </>
          )}
          {dr.status === "error" && (
            <button type="button" onClick={dr.flush}>
              <CloudOff size={13} /> {m.pubSaveFail}
            </button>
          )}
          {dr.status === "toolarge" && (
            <span>
              <CloudOff size={13} /> {m.tooLarge}
            </span>
          )}
        </span>
      </div>
      {dr.status === "conflict" && (
        <div className="np-banner warn np-conflict">
          <span>{m.pubConflict}</span>
          <span>
            <button type="button" className="np-ghost" onClick={() => dr.resolve(false)}>
              {m.pubReload}
            </button>
            <button type="button" className="np-btn sm" onClick={() => dr.resolve(true)}>
              {m.pubKeep}
            </button>
          </span>
        </div>
      )}
      <textarea
        className="np-title np-title-in"
        rows={1}
        value={dr.draft.title}
        placeholder={m.titlePh}
        maxLength={200}
        onChange={(e) => dr.edit({ title: e.target.value.replace(/\n/g, " ") })}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        ref={(el) => {
          if (el) {
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }
        }}
      />
      <Updated d={d} m={m} lang={lang} />
      <BlockEditor blocks={dr.draft.blocks} onChange={(blocks) => dr.edit({ blocks })} files={d.note.files} m={m} lang={lang} styleOn={!!d.features?.style} noStyle={!d.features?.style} />
    </>
  );
}

// one answer of the sign-up form
function FormField({ f, value, onChange, bad, m }) {
  const id = `np-f-${f.id}`;
  const req = f.required ? <em className="np-req">*</em> : null;
  if (f.type === "checkbox")
    return (
      <label className={`np-field np-field-check ${bad ? "bad" : ""}`} htmlFor={id}>
        <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        <span>
          {f.label}
          {req}
        </span>
      </label>
    );
  return (
    <label className={`np-field ${bad ? "bad" : ""}`} htmlFor={id}>
      <span className="np-field-label">
        {f.label}
        {req}
      </span>
      {f.type === "choice" ? (
        (f.options || []).length <= 4 ? (
          <span className="np-choices" role="radiogroup" aria-label={f.label}>
            {(f.options || []).map((o) => (
              <button key={o} type="button" role="radio" aria-checked={value === o} className={value === o ? "on" : ""} onClick={() => onChange(value === o ? "" : o)}>
                {value === o && <Check size={13} />} {o}
              </button>
            ))}
          </span>
        ) : (
          <select id={id} value={value || ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">{m.pubChoose}</option>
            {(f.options || []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )
      ) : (
        <input
          id={id}
          type={f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "date" ? "date" : f.type === "phone" ? "tel" : "text"}
          inputMode={f.type === "phone" ? "tel" : f.type === "number" ? "decimal" : undefined}
          value={value ?? ""}
          maxLength={f.type === "text" ? f.max || 200 : 120}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`np-field-${f.type}`}
        />
      )}
    </label>
  );
}

// the write box: name (when asked), the sign-up form's fields, text, up to 5 files, a signature, a voice clip
function Composer({ m, d, name, setName, onSend, initial = "", sendLabel, onCancel, compact, used = 0, fields = [], initialFields }) {
  const [text, setText] = useState(initial);
  const [answers, setAnswers] = useState(() => ({ ...(initialFields || {}) }));
  const [badField, setBadField] = useState("");
  const [voice, setVoice] = useState(null); // one clip from the recorder (needs the owner's "Voice notes")
  const [recording, setRecording] = useState(false);
  const voiceUrl = useMemo(() => (voice ? URL.createObjectURL(voice) : ""), [voice]);
  useEffect(() => () => voiceUrl && URL.revokeObjectURL(voiceUrl), [voiceUrl]);
  const canVoice = !!d.features?.voice;
  const [who, setWho] = useState(name || "");
  const [files, setFiles] = useState([]);
  const [signs, setSigns] = useState([]); // a signature PNG from the pad (needs the owner's "Signature & pen")
  const [signing, setSigning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const input = useRef(null);
  const canSign = !!d.features?.sign;
  // collect: files already on my row count too
  const max = Math.max(0, (d.limits?.files_per_entry || 5) - used - signs.length - (voice ? 1 : 0));
  const limit = d.limits?.file_limit || 20 * 1048576;
  const sendMax = d.limits?.send_max || 0; // the host takes this much in one send (0 = no limit)
  const needName = d.share.ask_name && !name;
  useEffect(() => setWho((w) => w || name || ""), [name]);
  const add = (list) => {
    const ok = [];
    let total = [...files, ...signs].reduce((a, f) => a + f.size, 0) + (voice?.size || 0); // the voice clip goes in the same send
    for (const f of list) {
      if (f.size > limit) {
        setErr(m.tooBig.replace("{mb}", Math.round(limit / 1048576)));
        continue;
      }
      if (sendMax && total + f.size > sendMax) {
        setErr(m.pubSendMax.replace("{mb}", (sendMax / 1048576).toFixed(0)));
        continue;
      }
      total += f.size;
      ok.push(f);
    }
    setFiles((old) => {
      const next = [...old, ...ok];
      if (next.length > max) setErr(m.pubTooMany.replace("{n}", max));
      return next.slice(0, max);
    });
  };
  const send = async () => {
    setErr("");
    setBadField("");
    const nm = (name || who).trim();
    if (d.share.ask_name && !nm) return setErr(m.pubNeedName);
    const missing = fields.find((f) => f.required && (answers[f.id] === undefined || answers[f.id] === "" || answers[f.id] === false));
    if (missing) {
      setBadField(missing.id);
      return setErr(m.pubFieldNeed.replace("{label}", missing.label));
    }
    const hasAnswers = fields.some((f) => answers[f.id] !== undefined && answers[f.id] !== "");
    if (!text.trim() && !files.length && !signs.length && !voice && !hasAnswers) return setErr(m.pubNeedText);
    if (sendMax && [...files, ...signs].reduce((a, f) => a + f.size, 0) + (voice?.size || 0) > sendMax) return setErr(m.pubSendMax.replace("{mb}", (sendMax / 1048576).toFixed(0)));
    setBusy(true);
    try {
      if (!name && nm) setName(nm);
      const sendFields = fields.length ? Object.fromEntries(fields.filter((f) => answers[f.id] !== undefined && answers[f.id] !== "").map((f) => [f.id, answers[f.id]])) : undefined;
      await onSend({ text: text.trim(), name: nm, files, signs, fields: sendFields, voice });
      setText("");
      setFiles([]);
      setSigns([]);
      setVoice(null);
      setDone(true);
      setTimeout(() => setDone(false), 2200);
    } catch (e) {
      const code = e.code || e.response?.code;
      if (code === "field_required" || code === "field_bad") {
        setBadField(e.response?.field || "");
        setErr(e.message);
      } else if (code === "need_voice" || code === "bad_voice") setErr(code === "need_voice" ? m.vcOff : e.message);
      else if (code === "too_many_files") setErr(m.pubTooMany.replace("{n}", max));
      else if (code === "need_sign" || code === "bad_sign") setErr(code === "need_sign" ? m.needSign : e.message);
      else if (e.status === 413 && (code === "too_large" || !code)) setErr(m.pubSendMax.replace("{mb}", ((sendMax || 4 * 1048576) / 1048576).toFixed(0)));
      else setErr(e.message);
    }
    setBusy(false);
  };
  return (
    <div className={`np-compose ${compact ? "compact" : ""}`}>
      {needName && <input className="np-who" value={who} onChange={(e) => setWho(e.target.value)} placeholder={m.pubNamePh} maxLength={80} aria-label={m.pubNamePh} />}
      {fields.length > 0 && (
        <div className="np-form" data-testid="np-form">
          {fields.map((f) => (
            <FormField key={f.id} f={f} m={m} value={answers[f.id]} bad={badField === f.id} onChange={(v) => (setAnswers((a) => ({ ...a, [f.id]: v })), badField === f.id && setBadField(""))} />
          ))}
        </div>
      )}
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={fields.length ? m.pubNotePh : m.pubReplyPh} rows={fields.length ? 2 : 3} maxLength={3000} data-testid="np-text" />
      {voice && (
        <div className="np-voice-picked">
          <AudioPlayer src={voiceUrl} m={m} compact onRemove={() => setVoice(null)} removeLabel={m.removeBlock} />
        </div>
      )}
      {files.length > 0 && (
        <div className="np-picked">
          {files.map((f, i) => (
            <span key={i} className="np-chip">
              <Paperclip size={13} /> <span>{f.name}</span> <small>{bytes(f.size)}</small>
              <button type="button" onClick={() => setFiles((old) => old.filter((_, k) => k !== i))} aria-label={m.removeBlock}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      {signs.length > 0 && (
        <div className="np-picked">
          {signs.map((f, i) => (
            <span key={i} className="np-chip np-sig-chip">
              <SigThumb file={f} /> <span>{m.pubSigned}</span>
              <button type="button" onClick={() => setSigns((old) => old.filter((_, k) => k !== i))} aria-label={m.removeBlock}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      {err && <p className="np-err">{err}</p>}
      <div className="np-compose-bar">
        {canVoice && (
          <button type="button" className="np-ghost np-voice-btn" onClick={() => setRecording(true)} disabled={!!voice || max <= 0} data-testid="np-voice">
            <Mic size={16} /> {m.pubVoice}
          </button>
        )}
        {canSign && (
          <button type="button" className="np-ghost np-sign-btn" onClick={() => setSigning(true)} disabled={signs.length > 0 || max <= 0} data-testid="np-sign">
            <Signature size={16} /> {m.pubSign}
          </button>
        )}
        {d.share.allow_files && (
          <>
            <button type="button" className="np-ghost" onClick={() => input.current?.click()} disabled={files.length >= max} title={files.length >= max ? m.pubTooMany.replace("{n}", max) : undefined}>
              <Paperclip size={16} /> {m.pubAttach}
            </button>
            <input
              ref={input}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                add(Array.from(e.target.files || []));
                e.target.value = "";
              }}
            />
            <small className="np-hint">{m.pubMax.replace("{mb}", Math.round(limit / 1048576))}</small>
          </>
        )}
        <span className="np-grow" />
        {onCancel && (
          <button type="button" className="np-ghost" onClick={onCancel}>
            {m.cancel}
          </button>
        )}
        <button type="button" className="np-btn" onClick={send} disabled={busy} data-testid="np-send">
          {busy ? <Loader2 size={16} className="md-spin" /> : done ? <Check size={16} /> : <Send size={16} />} {done ? m.pubSent : sendLabel || m.pubSend}
        </button>
      </div>
      {recording && (
        <VoiceRecorder
          m={m}
          saveLabel={m.vcUse}
          onClose={() => setRecording(false)}
          onSave={async (file) => {
            const cap = d.limits?.voice_max || 15 * 1048576;
            if (file.size > cap) throw new Error(m.tooBig.replace("{mb}", Math.round(cap / 1048576)));
            setErr("");
            setVoice(file);
          }}
        />
      )}
      {signing && (
        <DrawPad
          m={m}
          modes={["sign"]}
          name={(name || who).trim()}
          askName={d.share.ask_name}
          saveLabel={m.padSaveGuest}
          onClose={() => setSigning(false)}
          onSave={async (file, x) => {
            const cap = d.limits?.sign_max || 2 * 1048576;
            if (file.size > cap) throw new Error(m.tooBig.replace("{mb}", Math.round(cap / 1048576)));
            if (!name && !who.trim() && x?.name) setWho(x.name);
            setErr("");
            setSigns([file]);
          }}
        />
      )}
    </div>
  );
}

// a picked signature (before sending)
function SigThumb({ file }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? <img className="np-sig-thumb" src={url} alt="" /> : null;
}

function Entry({ e, m, lang, pub, opts, onChanged, onGone, canWrite, fields = [] }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(e.text || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async (body) => {
    setBusy(true);
    setErr("");
    try {
      const r = await pub.saveEntry(e._id, body, opts());
      onChanged(r.data);
      setEditing(false);
    } catch (er) {
      setErr(er.message);
    }
    setBusy(false);
  };
  const dl = useCallback((f, inline) => pub.entryFileUrl?.(e._id, f._id, opts(), inline).then((r) => r.data?.url || r.url), [pub, e._id, opts]);
  const remove = async () => {
    if (!window.confirm(m.pubDeleteAsk)) return;
    try {
      await pub.removeEntry(e._id, opts());
      onGone(e._id);
    } catch (er) {
      setErr(er.message);
    }
  };
  return (
    <li className={`np-entry ${e.by_owner ? "owner" : ""} ${e.mine ? "mine" : ""}`}>
      <span className={`np-av ${e.by_owner ? "owner" : ""}`}>{e.by_owner ? <StickyNote size={15} /> : initialOf(e.name)}</span>
      <div className="np-entry-body">
        <div className="np-entry-top">
          <b>{e.by_owner ? m.pubOwnerName : e.name}</b>
          <span title={fmtTime(e.created_date, lang)}>{ago(e.created_date, m, lang)}</span>
          {e.updated_date && e.created_date && new Date(e.updated_date) - new Date(e.created_date) > 60000 && <em>· {m.pubEdited}</em>}
        </div>
        {editing ? (
          <div className="np-entry-edit">
            <textarea value={text} onChange={(ev) => setText(ev.target.value)} rows={3} maxLength={3000} />
            <div className="np-compose-bar">
              <span className="np-grow" />
              <button type="button" className="np-ghost" onClick={() => (setEditing(false), setText(e.text || ""))}>
                {m.cancel}
              </button>
              <button type="button" className="np-btn sm" onClick={() => save({ text })} disabled={busy}>
                {busy ? <Loader2 size={14} className="md-spin" /> : <Check size={14} />} {m.save}
              </button>
            </div>
          </div>
        ) : (
          <>
            {fields.length > 0 && e.fields && (
              <dl className="np-answers">
                {fields
                  .filter((f) => e.fields[f.id] !== undefined && e.fields[f.id] !== "")
                  .map((f) => (
                    <div key={f.id}>
                      <dt>{f.label}</dt>
                      <dd>{f.type === "checkbox" ? (e.fields[f.id] === true || e.fields[f.id] === "true" ? m.yes : m.no) : String(e.fields[f.id])}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {e.text && <p>{e.text}</p>}
          </>
        )}
        {e.files?.length > 0 && (
          <FileDl.Provider value={pub.entryFileUrl ? dl : null}>
          <div className="np-entry-files">
            {e.files.map((f) => (
              <span key={f._id} className={`np-entry-file ${f.sign ? "is-sign" : ""}`}>
                {f.sign ? (
                  <a className="np-sig" href={f.url} target="_blank" rel="noreferrer">
                    <img src={f.url} alt={f.name || ""} loading="lazy" />
                  </a>
                ) : (
                  <FileCard file={f} compact />
                )}
                {e.mine && canWrite && editing && (
                  <button type="button" className="np-x" onClick={() => save({ remove_files: [f._id] })} aria-label={m.removeBlock}>
                    <X size={13} />
                  </button>
                )}
              </span>
            ))}
          </div>
          </FileDl.Provider>
        )}
        {err && <p className="np-err">{err}</p>}
      </div>
      {e.mine && canWrite && !editing && (
        <span className="np-entry-acts">
          <button type="button" onClick={() => setEditing(true)} aria-label={m.pubEditYours} title={m.pubEditYours}>
            <PenLine size={15} />
          </button>
          <button type="button" onClick={remove} aria-label={m.pubDeleteYours} title={m.pubDeleteYours}>
            <Trash2 size={15} />
          </button>
        </span>
      )}
    </li>
  );
}

function Replies({ pub, d, setD, m, lang, name, setName, opts, canWrite }) {
  const endRef = useRef(null);
  const put = (fn) => setD((old) => ({ ...old, entries: fn(old.entries) }));
  return (
    <section className="np-card np-replies">
      <h2>
        <MessageSquareText size={18} /> {m.pubReplies}
        {d.entries.length > 0 && <small>{d.entries.length}</small>}
      </h2>
      {d.entries.length === 0 && canWrite && <p className="np-none">{m.pubNoReplies}</p>}
      {d.entries.length > 0 && (
        <ul className="np-entries">
          {d.entries.map((e) => (
            <Entry key={e._id} e={e} m={m} lang={lang} pub={pub} opts={opts} canWrite={canWrite} onChanged={(x) => put((l) => l.map((y) => (y._id === x._id ? x : y)))} onGone={(id) => put((l) => l.filter((y) => y._id !== id))} />
          ))}
        </ul>
      )}
      <span ref={endRef} />
      {canWrite && (
        <Composer
          m={m}
          d={d}
          name={name}
          setName={setName}
          onSend={async (body) => {
            const r = await pub.addEntry(body, opts());
            put((l) => [...l.filter((y) => y._id !== r.data._id), r.data]);
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
          }}
        />
      )}
    </section>
  );
}

// sign-up list: my one row (send / change / delete); only the owner sees everyone
function Collect({ pub, d, setD, m, lang, name, setName, opts }) {
  const mine = d.entries.find((e) => e.mine);
  const fields = d.note.form?.fields || [];
  const [changing, setChanging] = useState(false);
  const put = (fn) => setD((old) => ({ ...old, entries: fn(old.entries) }));
  const send = async (body) => {
    const r = await pub.addEntry(body, opts());
    put((l) => [...l.filter((y) => y._id !== r.data._id), r.data]);
    setChanging(false);
  };
  return (
    <section className="np-card np-replies np-collect">
      <h2>
        <MessageSquareText size={18} /> {m.pubYours}
      </h2>
      <p className="np-sub">{m.pubYoursSub}</p>
      {mine && !changing ? (
        <>
          <ul className="np-entries">
            <Entry e={mine} m={m} lang={lang} pub={pub} opts={opts} canWrite fields={fields} onChanged={(x) => put((l) => l.map((y) => (y._id === x._id ? x : y)))} onGone={(id) => put((l) => l.filter((y) => y._id !== id))} />
          </ul>
          <button type="button" className="np-ghost np-add-more" onClick={() => setChanging(true)}>
            <PenLine size={15} /> {m.pubEditYours}
          </button>
        </>
      ) : (
        <Composer m={m} d={d} name={name} setName={setName} onSend={send} initial={mine?.text || ""} onCancel={mine ? () => setChanging(false) : null} used={mine?.files?.length || 0} fields={fields} initialFields={mine?.fields} sendLabel={fields.length && !mine ? m.pubFormSend : undefined} />
      )}
    </section>
  );
}
