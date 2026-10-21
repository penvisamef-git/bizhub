import { useEffect, useRef, useState } from "react";
import { CheckCheck, Check, FileText, Loader2, Mic, Paperclip, Send, Smile, Trash2, X } from "lucide-react";
import { fmtDayOnly, fmtTime, useSpText } from "./text";
import "./support.css";

const KB = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const localDay = (d) => new Date(new Date(d).getTime() + 7 * 3600000).toISOString().slice(0, 10);

// the messages of one conversation; mine = "customer" (customer page) or "admin" (inbox)
// them = { name, photo } of the other side (customers see "BizHub Support" + logo); seenAt = when they last opened the chat
export function Bubbles({ messages, mine, onOlder, more, emptyHello, them, seenAt }) {
  const { x, lang } = useSpText();
  const end = useRef(null);
  const box = useRef(null);
  const count = messages.length;
  const last = messages[count - 1]?._id;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [last]);
  let day = "";
  // the last message I sent: "Seen" / "Sent" under it
  const lastMine = [...messages].reverse().find((m) => m.from === mine && !m.kind);
  const seen = lastMine && seenAt && new Date(seenAt) >= new Date(lastMine.created_date);
  return (
    <div className="ch-list" ref={box}>
      {more && (
        <button type="button" className="ch-older" onClick={onOlder}>
          {x.older}
        </button>
      )}
      {!count && emptyHello && (
        <div className="ch-row them">
          <div className="ch-bubble">
            <p>{emptyHello}</p>
          </div>
        </div>
      )}
      {messages.map((m) => {
        const d = localDay(m.created_date);
        const head = d !== day;
        day = d;
        const own = m.from === mine;
        const prev = messages[messages.indexOf(m) - 1];
        const firstOfGroup = !prev || prev.from !== m.from || localDay(prev.created_date) !== d;
        return (
          <div key={m._id}>
            {head && <div className="ch-day">{d === localDay(new Date()) ? x.today : fmtDayOnly(m.created_date, lang)}</div>}
            <div className={`ch-row ${own ? "me" : "them"} ${m.kind ? "sys" : ""} ${them && !own ? "with-av" : ""}`} data-testid="ch-msg">
              {them && !own && (firstOfGroup ? <Avatar name={them.name} photo={them.photo} /> : <span className="ch-av-gap" />)}
              <div className="ch-bubble">
                {!own && firstOfGroup && (them?.name || m.by_name) && <small className="ch-who">{them?.name || m.by_name}</small>}
                {m.files?.length > 0 && (
                  <div className="ch-files">
                    {m.files.map((f) =>
                      f.type?.startsWith("audio/") ? (
                        <div key={f.url} className="ch-voice" data-testid="ch-voice">
                          <Mic size={15} />
                          <audio src={f.url} controls preload="none" />
                        </div>
                      ) : f.type?.startsWith("image/") ? (
                        <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="ch-img">
                          <img src={f.url} alt={f.name} loading="lazy" />
                        </a>
                      ) : (
                        <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="ch-file">
                          <FileText size={18} />
                          <span>
                            <b>{f.name}</b>
                            <small>{KB(f.size || 0)}</small>
                          </span>
                        </a>
                      ),
                    )}
                  </div>
                )}
                {m.text && <p>{m.text}</p>}
                <small className="ch-time">
                  {fmtTime(m.created_date, lang)}
                  {own && m === lastMine && (seen ? <CheckCheck size={13} className="ch-seen" /> : <Check size={13} />)}
                </small>
              </div>
            </div>
            {own && m === lastMine && (
              <div className={`ch-status ${seen ? "seen" : ""}`} data-testid="ch-status">
                {seen ? x.seen : x.sent}
              </div>
            )}
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}

export function Avatar({ name, photo, size = 32 }) {
  return (
    <span className="ch-av" style={{ width: size, height: size }}>
      {photo ? (
        <img src={photo} alt="" />
      ) : (
        String(name || "?")
          .trim()
          .slice(0, 1)
          .toUpperCase()
      )}
    </span>
  );
}

const EMOJI = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "🥰",
  "😘",
  "😎",
  "🤩",
  "🤔",
  "😅",
  "😢",
  "😭",
  "😡",
  "😴",
  "🙏",
  "👍",
  "👎",
  "👌",
  "👏",
  "🙌",
  "💪",
  "🤝",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🔥",
  "✨",
  "🎉",
  "🎁",
  "✅",
  "❌",
  "⚠️",
  "❓",
  "💰",
  "🪙",
  "📱",
  "💻",
  "🧾",
  "📦",
  "🚚",
  "☕",
  "🍜",
  "⏰",
];

// write + attach + emoji + voice + send (Enter sends, Shift+Enter = new line)
export function Composer({ onSend, disabled }) {
  const { x } = useSpText();
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = useRef(null);
  const area = useRef(null);
  const [emoji, setEmoji] = useState(false);
  const caret = useRef(null); // where the cursor was (emoji go there)
  const [rec, setRec] = useState(null); // { started, secs }
  const recRef = useRef(null);
  const addEmoji = (e) => {
    const el = area.current;
    const at = caret.current !== null && caret.current <= text.length ? caret.current : text.length;
    const next = text.slice(0, at) + e + text.slice(at);
    setText(next.slice(0, 4000));
    caret.current = at + e.length;
    setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(at + e.length, at + e.length);
    }, 0);
  };
  // voice: record with the microphone, send as an audio file (up to 2 minutes)
  const startRec = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setError(x.micDenied);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
      const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const started = Date.now();
      const timer = setInterval(() => {
        const secs = Math.round((Date.now() - started) / 1000);
        setRec({ started, secs });
        if (secs >= 120) stopRec(true);
      }, 500);
      recRef.current = { mr, stream, chunks, timer, send: false };
      mr.onstop = async () => {
        clearInterval(timer);
        stream.getTracks().forEach((t) => t.stop());
        const r = recRef.current;
        recRef.current = null;
        setRec(null);
        if (!r?.send || !chunks.length) return;
        const base = (mr.mimeType || type || "audio/webm").split(";")[0];
        const ext = base.includes("mp4") ? "m4a" : base.includes("ogg") ? "ogg" : "webm";
        const file = new File(chunks, `voice-${Date.now()}.${ext}`, { type: base });
        setBusy(true);
        try {
          await onSend("", [file]);
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      };
      mr.start(250);
      setRec({ started, secs: 0 });
    } catch {
      setError(x.micDenied);
    }
  };
  const stopRec = (send) => {
    const r = recRef.current;
    if (!r) return;
    r.send = send;
    if (r.mr.state !== "inactive") r.mr.stop();
  };
  useEffect(() => () => recRef.current && stopRec(false), []); // eslint-disable-line react-hooks/exhaustive-deps
  const go = async () => {
    if (busy || (!text.trim() && !files.length)) return;
    setBusy(true);
    setError("");
    try {
      await onSend(text.trim(), files);
      setText("");
      setFiles([]);
      setEmoji(false);
      caret.current = null;
      area.current?.focus();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ch-compose">
      {files.length > 0 && (
        <div className="ch-picked">
          {files.map((f, i) => (
            <span key={i}>
              {f.type.startsWith("image/") ? <img src={URL.createObjectURL(f)} alt="" /> : <FileText size={16} />}
              <small>{f.name}</small>
              <button type="button" onClick={() => setFiles(files.filter((_, k) => k !== i))} aria-label="×">
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <div className="md-form-error">{error}</div>}
      {emoji && (
        <div className="ch-emoji" data-testid="ch-emoji-box">
          {EMOJI.map((e) => (
            <button key={e} type="button" onClick={() => addEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
      )}
      {rec ? (
        <div className="ch-bar ch-rec" data-testid="ch-rec">
          <button type="button" className="ch-attach" onClick={() => stopRec(false)} aria-label={x.cancel} title={x.cancel}>
            <Trash2 size={18} />
          </button>
          <span className="ch-rec-dot" />
          <span className="ch-rec-time">
            {x.recording} {Math.floor(rec.secs / 60)}:{String(rec.secs % 60).padStart(2, "0")}
          </span>
          <button type="button" className="ch-send" onClick={() => stopRec(true)} aria-label={x.stopSend} title={x.stopSend} data-testid="ch-rec-send">
            <Send size={18} />
          </button>
        </div>
      ) : (
        <div className="ch-bar">
          <button type="button" className={`ch-attach ${emoji ? "on" : ""}`} onClick={() => setEmoji(!emoji)} disabled={disabled} aria-label={x.emoji} title={x.emoji} data-testid="ch-emoji">
            <Smile size={19} />
          </button>
          <button type="button" className="ch-attach" onClick={() => pick.current?.click()} disabled={disabled || busy || files.length >= 5} aria-label={x.attach} title={`${x.attach} · ${x.hint}`}>
            <Paperclip size={19} />
          </button>
          <input
            ref={pick}
            type="file"
            multiple
            hidden
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
            data-testid="ch-file"
            onChange={(e) => {
              const list = [...(e.target.files || [])].filter((f) => f.size <= 10 * 1024 * 1024);
              e.target.value = "";
              setFiles((cur) => [...cur, ...list].slice(0, 5));
            }}
          />
          <textarea
            ref={area}
            rows={1}
            value={text}
            maxLength={4000}
            onChange={(e) => {
              setText(e.target.value);
              caret.current = e.target.selectionStart;
            }}
            onSelect={(e) => (caret.current = e.target.selectionStart)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                go();
              }
            }}
            placeholder={x.placeholder}
            disabled={disabled}
            aria-label={x.placeholder}
            data-testid="ch-text"
          />
          {!text.trim() && !files.length ? (
            <button type="button" className="ch-send ch-mic" onClick={startRec} disabled={disabled || busy} aria-label={x.record} title={x.record} data-testid="ch-mic">
              {busy ? <Loader2 size={18} className="md-spin" /> : <Mic size={18} />}
            </button>
          ) : (
            <button type="button" className="ch-send" onClick={go} disabled={disabled || busy} aria-label={x.send} data-testid="ch-send">
              {busy ? <Loader2 size={18} className="md-spin" /> : <Send size={18} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ask again every few seconds while the page is open and visible
export function usePoll(fn, ms, deps) {
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && fn(), ms);
    return () => clearInterval(t);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
