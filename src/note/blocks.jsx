import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  CalendarClock,
  Check,
  Download,
  Eraser,
  File,
  FileText,
  Heading,
  Italic,
  Lightbulb,
  List,
  ListChecks,
  Loader2,
  Lock,
  Mic,
  Paperclip,
  Pilcrow,
  Quote,
  SeparatorHorizontal,
  Signature,
  Smile,
  Sticker,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { bytes, kindOf } from "../dashboard/client/note/text";
import { STICKER_GROUP_NAMES, STICKER_GROUPS, stickerOf, stickersIn } from "./stickers";
import { CALLOUT_ICONS, EMOJI, EMOJI_GROUP_NAMES, EMOJI_GROUPS, EMOJI_TAB, recentEmoji, rememberEmoji } from "./emoji";
import { ALIGNS, cleanStyle, hasStyle, STICKER_SIZES, STYLE_COLORS, styleClass, SWATCH, TEXT_SIZES } from "./style";
import { AudioPlayer } from "./voice";
import { cleanDue, DueLine, DuePop } from "./due";
import "./blocks.css";

// A note = a list of blocks: { id, t, text, done, file_id, style, icon, sticker }
//   t: p | h | bullet | check | quote | file | draw (signature PNG) | callout · divider · sticker (the last three + style = Style pack)
// BlockEditor edits them (keyboard first: Enter = new block, Backspace on empty = remove, "- " "[] " "# " "> " shortcuts)
// BlockView shows them read only. Both are used by the owner dashboard and the public page (/n/<token>).
export const MAX_BLOCKS = 500;
export const MAX_TEXT = 5000;
export const TYPES = ["p", "h", "bullet", "check", "quote"];
const TYPE_ICON = { p: Pilcrow, h: Heading, bullet: List, check: ListChecks, quote: Quote };
export const newId = () => Math.random().toString(36).slice(2, 10);
export const newBlock = (t = "p", text = "") => ({ id: newId(), t, text, done: false, file_id: "" });
// blocks that show a file (no text to type in): a file, a signature / drawing, a voice note
export const isMedia = (b) => b?.t === "file" || b?.t === "draw" || b?.t === "audio";
// a voice note / audio file (plays in the page)
export const isAudio = (f) => !!f && (f.kind === "audio" || f.voice || /^audio\//.test(f.mime || "") || /\.(m4a|mp3|ogg|oga|wav|aac|opus)$/i.test(f.name || "") || /^voice-.*\.webm$/i.test(f.name || ""));
// a checklist item's due date + who (free)
const dueOf = (b) => {
  const o = {};
  const due = cleanDue(b.due);
  const who = String(b.who || "").trim().slice(0, 60);
  if (due) o.due = due;
  if (who) o.who = who;
  return o;
};
// blocks without a text box (a file, a drawing, a line, a sticker)
export const noText = (b) => isMedia(b) || b?.t === "divider" || b?.t === "sticker";
// the server may send blocks without ids (or none at all)
export function cleanBlocks(list) {
  const out = (Array.isArray(list) ? list : []).filter(Boolean).map((b) => {
    const o = { id: b.id || newId(), t: b.t || "p", text: b.text || "", done: !!b.done, file_id: b.file_id || "" };
    const st = cleanStyle(b.style);
    if (Object.keys(st).length) o.style = st;
    if (o.t === "callout") o.icon = b.icon || "💡";
    if (o.t === "sticker") o.sticker = b.sticker || "";
    if (o.t === "check") Object.assign(o, dueOf(b));
    return o;
  });
  return out.length ? out : [newBlock()];
}
// the words of a note without block ids (to tell if two copies say the same thing)
const contentKey = (n) => {
  const list = (Array.isArray(n?.blocks) ? n.blocks : [])
    .filter(Boolean)
    .map((b) => [b.t || "p", b.text || "", b.t === "check" && !!b.done, isMedia(b) ? b.file_id || "" : "", JSON.stringify(cleanStyle(b.style)), b.t === "callout" ? b.icon || "" : "", b.t === "sticker" ? b.sticker || "" : "", b.t === "check" ? JSON.stringify(dueOf(b)) : ""]);
  while (list.length && list[list.length - 1][0] === "p" && !list[list.length - 1][1] && list[list.length - 1][4] === "{}") list.pop();
  return JSON.stringify([n?.title || "", list]);
};
// what goes to the API (empty trailing paragraph is fine)
export const blocksOut = (list) =>
  list.map(({ id, t, text, done, file_id, style, icon, sticker, due, who }) => {
    const o = { id, t, text: noText({ t }) ? "" : text, done: t === "check" ? !!done : false, file_id: isMedia({ t }) ? file_id : "" };
    if (t === "check") Object.assign(o, dueOf({ due, who }));
    const st = cleanStyle(style);
    if (Object.keys(st).length) o.style = st;
    if (t === "callout") o.icon = icon || "💡";
    if (t === "sticker") o.sticker = sticker || "";
    return o;
  });
// short text of a note (list previews, titles)
export const plainOf = (blocks = []) =>
  blocks
    .filter((b) => !noText(b))
    .map((b) => b.text)
    .join(" ")
    .trim();

const SHORTCUTS = [
  [/^#\s/, "h"],
  [/^[-*•]\s/, "bullet"],
  [/^\[\s?\]\s/, "check"],
  [/^\[x\]\s/i, "check", true],
  [/^>\s/, "quote"],
];

function autoSize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

// ---------------------------------------------------------------- downloads
// FileDl = (file) => Promise<url> — a short-lived "download" link from the API (works even when the file host refuses
// to show PDFs / ZIPs directly). The owner dashboard and the public pages provide it; entries wrap their own files.
export const FileDl = createContext(null);
export const FileDlLabel = createContext("Download");
async function startDownload(get, file, inline = false) {
  // open the tab first (a pop-up blocker allows it only straight after the click), then point it at the link
  const tab = inline ? window.open("", "_blank") : null;
  let url = "";
  try {
    url = await get(file, inline);
  } catch (e) {
    tab?.close();
    throw e;
  }
  if (!url) {
    tab?.close();
    throw new Error("no url");
  }
  if (tab) {
    tab.location.href = url;
    return;
  }
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.download = file?.name || "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
export function DownloadBtn({ file, className = "nb-x nb-dl" }) {
  const get = useContext(FileDl);
  const label = useContext(FileDlLabel);
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);
  if (!file) return null;
  const run = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setBad(false);
    try {
      if (get) await startDownload(get, file);
      else await startDownload(async () => file.url, file);
    } catch {
      setBad(true);
    }
    setBusy(false);
  };
  return (
    <button type="button" className={`${className} ${bad ? "bad" : ""}`} onClick={run} aria-label={label} title={label} data-testid="nb-download">
      {busy ? <Loader2 size={14} className="md-spin" /> : <Download size={14} />}
    </button>
  );
}

// a file inside a note (image preview or a file chip); onRemove only when editing
export function FileCard({ file, onRemove, removeLabel, compact }) {
  const get = useContext(FileDl);
  if (!file) return null;
  const kind = kindOf(file);
  // a PDF / document opens through a signed link (the file host refuses PDFs on their plain url); pictures show as they are
  const open = get && kind !== "image" ? (e) => (e.preventDefault(), startDownload(get, file, true).catch(() => window.open(file.url, "_blank", "noopener"))) : undefined;
  const Icon = kind === "pdf" ? FileText : File;
  if (isAudio(file))
    return (
      <AudioPlayer file={file} compact={compact} removeLabel={removeLabel} onRemove={onRemove}>
        <DownloadBtn file={file} />
      </AudioPlayer>
    );
  if (kind === "image" && !compact)
    return (
      <figure className="nb-img">
        <a href={file.url} target="_blank" rel="noreferrer">
          <img src={file.url} alt={file.name || ""} loading="lazy" />
        </a>
        <figcaption>
          <span>{file.name}</span>
          <span className="nb-img-acts">
            <DownloadBtn file={file} />
            {onRemove && (
              <button type="button" className="nb-x" onClick={onRemove} aria-label={removeLabel}>
                <Trash2 size={14} />
              </button>
            )}
          </span>
        </figcaption>
      </figure>
    );
  return (
    <span className={`nb-file k-${kind}`}>
      <a href={file.url} target="_blank" rel="noreferrer" className="nb-file-main" onClick={open}>
        {kind === "image" ? <img src={file.url} alt="" loading="lazy" /> : <Icon size={18} />}
        <span className="nb-file-text">
          <b>{file.name || kind}</b>
          {file.size > 0 && <small>{bytes(file.size)}</small>}
        </span>
      </a>
      <DownloadBtn file={file} />
      {onRemove && (
        <button type="button" className="nb-x" onClick={onRemove} aria-label={removeLabel}>
          <Trash2 size={14} />
        </button>
      )}
    </span>
  );
}

// a signature / drawing inside a note (a PNG on white paper)
export function DrawImage({ file, onRemove, removeLabel }) {
  if (!file) return null;
  return (
    <figure className="nb-draw">
      <img src={file.url} alt={file.name || ""} loading="lazy" />
      {onRemove && (
        <button type="button" className="nb-x" onClick={onRemove} aria-label={removeLabel}>
          <Trash2 size={14} />
        </button>
      )}
    </figure>
  );
}

// one sticker (our own SVG drawings)
export function StickerArt({ name, size = "md", label }) {
  const st = stickerOf(name);
  if (!st) return null;
  // eslint-disable-next-line react/no-danger -- our own constant SVG strings (stickers.js), never user input
  return <span className={`nb-sticker z-${STICKER_SIZES.includes(size) ? size : "md"}`} role="img" aria-label={label || st.en} dangerouslySetInnerHTML={{ __html: st.svg }} />;
}

// read only
export function BlockView({ blocks = [], files = [], empty = "", lang = "en", m }) {
  const byId = Object.fromEntries((files || []).map((f) => [String(f._id), f]));
  const list = (blocks || []).filter((b) => noText(b) || String(b.text || "").trim());
  if (!list.length) return empty ? <p className="nb-empty">{empty}</p> : null;
  // consecutive list items share one <ul>
  const groups = [];
  list.forEach((b) => {
    const last = groups[groups.length - 1];
    if ((b.t === "bullet" || b.t === "check") && last?.list === b.t) last.items.push(b);
    else groups.push(b.t === "bullet" || b.t === "check" ? { list: b.t, items: [b] } : { one: b });
  });
  return (
    <div className="nb-view">
      {groups.map((g, i) => {
        if (g.list)
          return (
            <ul key={g.items[0].id || i} className={g.list === "check" ? "nb-checks" : ""}>
              {g.items.map((b, k) =>
                g.list === "check" ? (
                  <li key={b.id || k} className={`nb-ck ${b.done ? "done" : ""} ${styleClass(b)}`}>
                    <span className="nb-box" aria-hidden="true">
                      {b.done && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="nb-ck-text">
                      {b.text}
                      {m && (cleanDue(b.due) || b.who) && (
                        <span className="nb-due-wrap">
                          <DueLine b={b} m={m} lang={lang} />
                        </span>
                      )}
                    </span>
                  </li>
                ) : (
                  <li key={b.id || k} className={styleClass(b) || undefined}>
                    {b.text}
                  </li>
                ),
              )}
            </ul>
          );
        const b = g.one;
        const key = b.id || i;
        const cls = styleClass(b) || undefined;
        if (b.t === "h") return <h2 key={key} className={cls}>{b.text}</h2>;
        if (b.t === "quote") return <blockquote key={key} className={cls}>{b.text}</blockquote>;
        if (b.t === "callout")
          return (
            <div key={key} className={`nb-callout ${cls || ""} ${cleanStyle(b.style).bg ? "" : "nb-bg-amber"}`}>
              <span className="nb-callout-ic" aria-hidden="true">
                {b.icon || "💡"}
              </span>
              <p>{b.text}</p>
            </div>
          );
        if (b.t === "divider") return <hr key={key} className="nb-divider" />;
        if (b.t === "sticker")
          return (
            <div key={key} className={`nb-sticker-row ${cleanStyle(b.style).align ? `nb-a-${cleanStyle(b.style).align}` : ""}`}>
              <StickerArt name={b.sticker} size={cleanStyle(b.style).size || b.style?.size} label={stickerOf(b.sticker)?.[lang === "km" ? "km" : "en"]} />
            </div>
          );
        if (b.t === "draw") return <DrawImage key={key} file={byId[String(b.file_id)]} />;
        if (b.t === "audio")
          return (
            <div key={key} className="nb-audioblock">
              {byId[String(b.file_id)] && (
                <AudioPlayer file={byId[String(b.file_id)]} m={m}>
                  <DownloadBtn file={byId[String(b.file_id)]} />
                </AudioPlayer>
              )}
            </div>
          );
        if (b.t === "file")
          return (
            <div key={key} className="nb-fileblock">
              <FileCard file={byId[String(b.file_id)]} />
            </div>
          );
        return <p key={key} className={cls}>{b.text}</p>;
      })}
    </div>
  );
}

// ---------------------------------------------------------------- style pack pickers
function ColorRow({ value, onPick, label, none, kind }) {
  return (
    <div className="nb-pop-row">
      <span className="nb-pop-label">{label}</span>
      <div className="nb-swatches">
        <button type="button" className={`nb-sw none ${!value ? "on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(undefined)} title={none} aria-label={none} aria-pressed={!value}>
          <X size={12} />
        </button>
        {STYLE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`nb-sw ${kind} ${value === c ? "on" : ""}`}
            style={{ "--sw": SWATCH[c] }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(c)}
            title={c}
            aria-label={c}
            aria-pressed={value === c}
          >
            {kind === "text" ? "A" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function Seg({ list, value, onPick, labels, icons, label }) {
  return (
    <div className="nb-pop-row">
      <span className="nb-pop-label">{label}</span>
      <div className="nb-seg" role="group" aria-label={label}>
        {list.map((k) => {
          const Icon = icons?.[k];
          return (
            <button key={k} type="button" className={value === k ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(k)} aria-pressed={value === k} title={labels?.[k] || k}>
              {Icon ? <Icon size={15} /> : labels?.[k] || k}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StylePop({ b, m, onStyle, onPatch }) {
  const st = cleanStyle(b?.style);
  if (!b || b.t === "divider" || isMedia(b)) return <p className="nb-pop-note">{m.stPickBlock}</p>;
  const set = (k, v) => onStyle({ ...st, [k]: v });
  if (b.t === "sticker")
    return (
      <>
        <Seg label={m.stSize} list={STICKER_SIZES} value={b.style?.size || "md"} onPick={(v) => set("size", v)} labels={m.stSizes} />
        <Seg label={m.stAlign} list={ALIGNS} value={st.align || "left"} onPick={(v) => set("align", v)} icons={{ left: AlignLeft, center: AlignCenter, right: AlignRight }} labels={m.stAligns} />
      </>
    );
  return (
    <>
      {b.t === "callout" && (
        <div className="nb-pop-row">
          <span className="nb-pop-label">{m.stIcon}</span>
          <div className="nb-emoji-line">
            {CALLOUT_ICONS.map((e) => (
              <button key={e} type="button" className={b.icon === e ? "on" : ""} onMouseDown={(ev) => ev.preventDefault()} onClick={() => onPatch({ icon: e })}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
      <ColorRow label={m.stColor} kind="text" value={st.color} onPick={(v) => set("color", v)} none={m.stNone} />
      <ColorRow label={b.t === "callout" ? m.stBox : m.stHighlight} kind="bg" value={st.bg} onPick={(v) => set("bg", v)} none={m.stNone} />
      <Seg label={m.stSize} list={TEXT_SIZES} value={st.size || "md"} onPick={(v) => set("size", v)} labels={m.stSizes} />
      <div className="nb-pop-row nb-pop-row2">
        <Seg label={m.stAlign} list={ALIGNS} value={st.align || "left"} onPick={(v) => set("align", v)} icons={{ left: AlignLeft, center: AlignCenter, right: AlignRight }} labels={m.stAligns} />
        <div className="nb-seg nb-seg-bi">
          <button type="button" className={st.bold ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => set("bold", !st.bold)} aria-pressed={!!st.bold} title={m.stBold}>
            <Bold size={15} />
          </button>
          <button type="button" className={st.italic ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => set("italic", !st.italic)} aria-pressed={!!st.italic} title={m.stItalic}>
            <Italic size={15} />
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onStyle({})} title={m.stClear}>
            <Eraser size={15} />
          </button>
        </div>
      </div>
    </>
  );
}

export function EmojiGrid({ onPick, lang = "en" }) {
  const [tab, setTab] = useState(() => (recentEmoji().length ? "recent" : "smileys"));
  const [recent, setRecent] = useState(recentEmoji);
  const names = EMOJI_GROUP_NAMES[lang === "km" ? "km" : "en"];
  const list = tab === "recent" ? recent : EMOJI[tab] || [];
  return (
    <div className="nb-emoji">
      <div className="nb-emoji-tabs" role="tablist">
        {["recent", ...EMOJI_GROUPS].map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => setTab(k)} title={names[k]}>
            {EMOJI_TAB[k]}
          </button>
        ))}
      </div>
      <b className="nb-emoji-h">{names[tab]}</b>
      <div className="nb-emoji-grid">
        {list.length === 0 && <span className="nb-pop-note">—</span>}
        {list.map((e, i) => (
          <button
            key={`${e}${i}`}
            type="button"
            onMouseDown={(ev) => ev.preventDefault()}
            onClick={() => {
              rememberEmoji(e);
              setRecent(recentEmoji());
              onPick(e);
            }}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StickerGrid({ onPick, lang = "en" }) {
  const [tab, setTab] = useState(STICKER_GROUPS[0]);
  const names = STICKER_GROUP_NAMES[lang === "km" ? "km" : "en"];
  return (
    <div className="nb-stk">
      <div className="nb-stk-tabs" role="tablist">
        {STICKER_GROUPS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => setTab(k)}>
            {names[k]}
          </button>
        ))}
      </div>
      <div className="nb-stk-grid">
        {stickersIn(tab).map((s) => (
          <button key={s.key} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(s.key)} title={lang === "km" ? s.km : s.en} data-testid={`nb-stk-${s.key}`}>
            <StickerArt name={s.key} size="sm" label={lang === "km" ? s.km : s.en} />
          </button>
        ))}
      </div>
    </div>
  );
}

// the editor. blocks + onChange(list) are owned by the parent; files = the note's files (for file blocks)
// onAttach() (optional) shows the "Attach file" button; m = words (types, placeholders…)
// onDraw(afterId) (optional) shows "Sign / Draw"; drawLocked = it needs unlocking first (the button shows a lock)
// styleOn = the Style pack is unlocked · onLocked() = a locked pack button was pressed (open the unlock window)
// noStyle = hide the pack buttons altogether (e.g. a visitor when the owner has no pack)
export function BlockEditor({ blocks, onChange, files = [], m, onAttach, attaching, onDraw, drawLocked, onVoice, voiceLocked, disabled, autoFocus, styleOn = false, onLocked, noStyle = false, lang = "en", names = [], noDue = false }) {
  const refs = useRef({});
  const focusNext = useRef(null); // { id, pos: number | "end" }
  const caret = useRef(null); // the last text place { id, pos } (pickers insert there)
  const [focus, setFocus] = useState(null);
  const [sel, setSel] = useState(null); // the block the style window changes (text or a sticker)
  const [pop, setPop] = useState(""); // "" | style | emoji | sticker
  const [duePop, setDuePop] = useState(""); // the checklist item whose date / person is being set
  const editorRef = useRef(null);
  const byId = Object.fromEntries((files || []).map((f) => [String(f._id), f]));

  useLayoutEffect(() => {
    Object.values(refs.current).forEach(autoSize);
    const f = focusNext.current;
    if (f) {
      focusNext.current = null;
      const el = refs.current[f.id];
      if (el) {
        el.focus();
        const pos = f.pos === "end" ? el.value.length : f.pos;
        try {
          el.setSelectionRange(pos, pos);
        } catch {
          /* not a text input */
        }
      }
    }
  });
  useEffect(() => {
    if (autoFocus && blocks[0]) focusNext.current = { id: blocks[0].id, pos: "end" };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // the page width changes → textareas grow / shrink
  useEffect(() => {
    const on = () => Object.values(refs.current).forEach(autoSize);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  // a picker closes on a click outside the editor / Escape
  useEffect(() => {
    if (!pop) return undefined;
    const off = (e) => editorRef.current && !editorRef.current.contains(e.target) && setPop("");
    const esc = (e) => e.key === "Escape" && setPop("");
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [pop]);

  const set = useCallback((list) => onChange(list.length ? list.slice(0, MAX_BLOCKS) : [newBlock()]), [onChange]);
  const patch = (id, p) => set(blocks.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const at = (id) => blocks.findIndex((b) => b.id === id);
  const focusOn = (id, pos = "end") => (focusNext.current = { id, pos });
  const remember = (b, el) => {
    caret.current = { id: b.id, pos: el?.selectionStart ?? (b.text || "").length };
    if (sel !== b.id) setSel(b.id);
  };

  const typeText = (b, value) => {
    if (b.t === "p" || b.t === "bullet") {
      for (const [re, t, done] of SHORTCUTS) {
        if (re.test(value) && !(b.t === "bullet" && t === "bullet")) {
          const text = value.replace(re, "");
          focusOn(b.id, 0);
          return patch(b.id, { t, text, done: !!done });
        }
      }
      // "---" = a line (Style pack)
      if (b.t === "p" && value === "---" && styleOn) {
        const i = at(b.id);
        const nb = newBlock();
        const list = [...blocks];
        list.splice(i, 1, { ...newBlock("divider"), id: b.id }, nb);
        focusOn(nb.id, 0);
        return set(list);
      }
    }
    patch(b.id, { text: value.slice(0, MAX_TEXT) });
  };

  const onKey = (e, b) => {
    if (e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    const i = at(b.id);
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (blocks.length >= MAX_BLOCKS) return;
      // an empty list item: leave the list
      if ((b.t === "bullet" || b.t === "check" || b.t === "quote" || b.t === "callout") && !b.text) return patch(b.id, { t: "p" });
      const before = b.text.slice(0, start);
      const after = b.text.slice(end);
      const t = b.t === "bullet" || b.t === "check" ? b.t : "p";
      const nb = newBlock(t, after);
      // a list keeps its colour / size; a heading or a box does not go on
      if (styleOn && (t === "bullet" || t === "check") && b.style) nb.style = { ...b.style };
      const list = [...blocks];
      list[i] = { ...b, text: before };
      list.splice(i + 1, 0, nb);
      focusOn(nb.id, 0);
      return set(list);
    }
    if (e.key === "Backspace" && start === 0 && end === 0) {
      if (b.t !== "p") {
        e.preventDefault();
        return patch(b.id, { t: "p" });
      }
      const prev = blocks[i - 1];
      if (!prev) return;
      e.preventDefault();
      if (noText(prev)) {
        if (!b.text) {
          if (!isMedia(prev)) {
            // a line / sticker above: remove it
            focusOn(b.id, 0);
            return set(blocks.filter((x) => x.id !== prev.id));
          }
          focusOn(prev.id);
          return set(blocks.filter((x) => x.id !== b.id));
        }
        return;
      }
      const list = blocks.filter((x) => x.id !== b.id);
      const j = list.findIndex((x) => x.id === prev.id);
      list[j] = { ...prev, text: (prev.text + b.text).slice(0, MAX_TEXT) };
      focusOn(prev.id, prev.text.length);
      return set(list);
    }
    if (e.key === "ArrowUp" && start === 0 && end === 0 && i > 0) {
      const prev = [...blocks.slice(0, i)].reverse().find((x) => !noText(x));
      if (prev) {
        e.preventDefault();
        refs.current[prev.id]?.focus();
      }
    }
    if (e.key === "ArrowDown" && start === el.value.length && i < blocks.length - 1) {
      const next = blocks.slice(i + 1).find((x) => !noText(x));
      if (next) {
        e.preventDefault();
        const nx = refs.current[next.id];
        nx?.focus();
        nx?.setSelectionRange(0, 0);
      }
    }
  };

  // pasting several lines → one block per line (same kind)
  const onPaste = (e, b) => {
    const text = e.clipboardData?.getData("text/plain") || "";
    if (!text.includes("\n")) return;
    e.preventDefault();
    const el = e.currentTarget;
    const lines = text.replace(/\r/g, "").split("\n");
    const before = b.text.slice(0, el.selectionStart);
    const after = b.text.slice(el.selectionEnd);
    const i = at(b.id);
    const t = b.t === "h" || b.t === "quote" || b.t === "callout" ? "p" : b.t;
    const made = lines.map((line, k) => (k === 0 ? { ...b, text: (before + line).slice(0, MAX_TEXT) } : newBlock(t, line.slice(0, MAX_TEXT))));
    const last = made[made.length - 1];
    const pos = last.text.length;
    last.text = (last.text + after).slice(0, MAX_TEXT);
    const list = [...blocks];
    list.splice(i, 1, ...made);
    focusOn(last.id, pos);
    set(list);
  };

  const move = (id, d) => {
    const i = at(id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    const list = [...blocks];
    [list[i], list[j]] = [list[j], list[i]];
    if (!noText(list[j])) focusOn(id);
    set(list);
  };
  const remove = (id) => {
    const i = at(id);
    const list = blocks.filter((b) => b.id !== id);
    const near = list[Math.max(0, i - 1)];
    if (near && !noText(near)) focusOn(near.id);
    if (sel === id) setSel(null);
    set(list);
  };
  const cur = blocks.find((b) => b.id === focus);
  const target = blocks.find((b) => b.id === sel) || cur || [...blocks].reverse().find((b) => !noText(b));
  const setType = (t) => {
    const b = cur || blocks[blocks.length - 1];
    if (!b || noText(b)) return;
    focusOn(b.id);
    patch(b.id, { t, done: t === "check" ? b.done : false });
  };
  const keep = (e) => e.preventDefault(); // toolbar clicks keep the caret in the text
  // after the block the person is on (or at the end)
  const insertAfter = (made, focusText = true) => {
    const ref = caret.current?.id || sel || cur?.id;
    let i = blocks.findIndex((b) => b.id === ref);
    if (i < 0) i = blocks.length - 1;
    const list = [...blocks];
    // an empty paragraph where the caret is: the new block takes its place
    const here = list[i];
    const replace = here && here.t === "p" && !here.text && !hasStyle(here);
    list.splice(replace ? i : i + 1, replace ? 1 : 0, ...made);
    const after = list[(replace ? i : i + 1) + made.length];
    if (!after || noText(after)) {
      const nb = newBlock();
      list.splice((replace ? i : i + 1) + made.length, 0, nb);
      if (focusText) focusOn(nb.id, 0);
    } else if (focusText) focusOn(after.id, 0);
    set(list);
  };
  const locked = (fn) => () => {
    if (!styleOn) {
      setPop("");
      return onLocked?.();
    }
    fn();
  };
  const toggle = (k) => locked(() => setPop((p) => (p === k ? "" : k)));
  const addEmoji = (e) => {
    const c = caret.current;
    const b = c && blocks.find((x) => x.id === c.id && !noText(x));
    if (!b) {
      const nb = newBlock("p", e);
      focusOn(nb.id, "end");
      set([...blocks.filter((x) => !(x.t === "p" && !x.text && x.id === blocks[blocks.length - 1]?.id)), nb]);
      caret.current = { id: nb.id, pos: e.length };
      return;
    }
    const pos = Math.min(c.pos ?? b.text.length, b.text.length);
    const text = (b.text.slice(0, pos) + e + b.text.slice(pos)).slice(0, MAX_TEXT);
    caret.current = { id: b.id, pos: pos + e.length };
    focusOn(b.id, pos + e.length);
    patch(b.id, { text });
  };
  const addSticker = (key) => {
    const sb = { ...newBlock("sticker"), sticker: key, style: { size: "md" } };
    setSel(sb.id);
    insertAfter([sb]);
    setPop("");
  };
  const makeCallout = () => {
    const b = target;
    if (b && !noText(b) && b.t !== "callout") {
      focusOn(b.id);
      return patch(b.id, { t: "callout", icon: "💡", done: false });
    }
    const nb = { ...newBlock("callout"), icon: "💡" };
    insertAfter([nb], false);
    focusOn(nb.id, 0);
  };
  const addLine = () => insertAfter([newBlock("divider")]);

  const ph = { p: m.blockPh, h: m.headingPh, bullet: m.bulletPh, check: m.checkPh, quote: m.quotePh, callout: m.calloutPh || m.blockPh };
  const onlyOne = blocks.length === 1;
  const lockBadge = !styleOn && (
    <span className="nb-lock-dot" aria-hidden="true">
      <Lock size={9} strokeWidth={3} />
    </span>
  );
  const packBtn = (key, Icon, label, onClick, active) => (
    <button key={key} type="button" className={`nb-pack-btn ${active ? "on" : ""} ${styleOn ? "" : "locked"}`} onMouseDown={keep} onClick={onClick} title={styleOn ? label : `${label} · ${m.stLocked}`} aria-label={label} aria-expanded={active || undefined} data-testid={`nb-${key}`}>
      <Icon size={16} />
      <span>{label}</span>
      {lockBadge}
    </button>
  );

  return (
    <div className={`nb-editor ${disabled ? "off" : ""}`} ref={editorRef}>
      {!disabled && (
        <div className="nb-tools" role="toolbar" aria-label={m.types.p}>
          {TYPES.map((t) => {
            const Icon = TYPE_ICON[t];
            return (
              <button key={t} type="button" onMouseDown={keep} onClick={() => setType(t)} className={cur?.t === t ? "on" : ""} title={m.types[t]} aria-label={m.types[t]} aria-pressed={cur?.t === t}>
                <Icon size={16} />
                <span>{m.types[t]}</span>
              </button>
            );
          })}
          {!noStyle && (
            <span className="nb-pack" role="group" aria-label={m.stPack}>
              {packBtn("style", Type, m.stStyle, toggle("style"), pop === "style")}
              {packBtn("emoji", Smile, m.stEmoji, toggle("emoji"), pop === "emoji")}
              {packBtn("sticker", Sticker, m.stSticker, toggle("sticker"), pop === "sticker")}
              {packBtn("callout", Lightbulb, m.stCallout, locked(makeCallout), false)}
              {packBtn("divider", SeparatorHorizontal, m.stDivider, locked(addLine), false)}
            </span>
          )}
          {onAttach && (
            <button type="button" className="nb-attach" onMouseDown={keep} onClick={() => onAttach(cur?.id || blocks[blocks.length - 1]?.id)} disabled={!!attaching}>
              <Paperclip size={16} />
              <span>{attaching || m.attach}</span>
            </button>
          )}
          {onVoice && (
            <button type="button" className={`nb-attach nb-voice-btn ${voiceLocked ? "locked" : ""}`} onMouseDown={keep} onClick={() => onVoice(cur?.id || blocks[blocks.length - 1]?.id)} data-testid="nb-voice">
              {voiceLocked ? <Lock size={15} /> : <Mic size={16} />}
              <span>{m.voiceBtn}</span>
            </button>
          )}
          {onDraw && (
            <button type="button" className={`nb-attach nb-draw-btn ${drawLocked ? "locked" : ""}`} onMouseDown={keep} onClick={() => onDraw(cur?.id || blocks[blocks.length - 1]?.id)} data-testid="nb-draw">
              {drawLocked ? <Lock size={15} /> : <Signature size={16} />}
              <span>{m.drawBtn}</span>
            </button>
          )}
          {pop && (
            <div className={`nb-pop p-${pop}`} role="dialog" aria-label={pop === "style" ? m.stStyle : pop === "emoji" ? m.stEmoji : m.stSticker} onMouseDown={(e) => e.target.tagName !== "INPUT" && e.preventDefault()} data-testid="nb-pop">
              <div className="nb-pop-head">
                <b>{pop === "style" ? m.stStyle : pop === "emoji" ? m.stEmoji : m.stSticker}</b>
                <button type="button" className="nb-x" onClick={() => setPop("")} aria-label={m.close || "Close"}>
                  <X size={15} />
                </button>
              </div>
              {pop === "style" && (
                <StylePop
                  b={target}
                  m={m}
                  onStyle={(st) => target && patch(target.id, { style: cleanStyle(st) })}
                  onPatch={(p) => target && patch(target.id, p)}
                />
              )}
              {pop === "emoji" && <EmojiGrid onPick={addEmoji} lang={lang} />}
              {pop === "sticker" && <StickerGrid onPick={addSticker} lang={lang} />}
            </div>
          )}
        </div>
      )}
      <div className="nb-blocks">
        {blocks.map((b, i) => {
          const isFocus = focus === b.id;
          if (b.t === "draw")
            return (
              <div key={b.id} className="nb-row t-draw">
                <DrawImage file={byId[String(b.file_id)]} onRemove={disabled ? null : () => remove(b.id)} removeLabel={m.removeBlock} />
              </div>
            );
          if (b.t === "audio")
            return (
              <div key={b.id} className="nb-row t-audio">
                {byId[String(b.file_id)] ? (
                  <AudioPlayer file={byId[String(b.file_id)]} m={m} onRemove={disabled ? null : () => remove(b.id)} removeLabel={m.removeBlock}>
                    <DownloadBtn file={byId[String(b.file_id)]} />
                  </AudioPlayer>
                ) : null}
              </div>
            );
          if (b.t === "file")
            return (
              <div key={b.id} className="nb-row t-file">
                <FileCard file={byId[String(b.file_id)]} onRemove={disabled ? null : () => remove(b.id)} removeLabel={m.removeBlock} />
              </div>
            );
          if (b.t === "divider" || b.t === "sticker") {
            const st = cleanStyle(b.style);
            return (
              <div key={b.id} className={`nb-row t-${b.t} ${sel === b.id ? "picked" : ""} ${st.align ? `nb-a-${st.align}` : ""}`} onClick={() => !disabled && (setSel(b.id), (caret.current = { id: b.id, pos: 0 }))}>
                {b.t === "divider" ? <hr className="nb-divider" /> : <StickerArt name={b.sticker} size={b.style?.size} label={stickerOf(b.sticker)?.[lang === "km" ? "km" : "en"]} />}
                {!disabled && (
                  <span className="nb-row-acts solid">
                    <button type="button" onMouseDown={keep} onClick={(e) => (e.stopPropagation(), move(b.id, -1))} disabled={i === 0} aria-label={m.moveUp} title={m.moveUp}>
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" onMouseDown={keep} onClick={(e) => (e.stopPropagation(), move(b.id, 1))} disabled={i === blocks.length - 1} aria-label={m.moveDown} title={m.moveDown}>
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" onMouseDown={keep} onClick={(e) => (e.stopPropagation(), remove(b.id))} aria-label={m.removeBlock} title={m.removeBlock}>
                      <Trash2 size={14} />
                    </button>
                  </span>
                )}
              </div>
            );
          }
          const numbered = b.t === "bullet";
          const st = cleanStyle(b.style);
          return (
            <div key={b.id} className={`nb-row t-${b.t} ${b.done ? "done" : ""} ${isFocus ? "focus" : ""} ${styleClass(b)} ${b.t === "callout" && !st.bg ? "nb-bg-amber" : ""}`}>
              {b.t === "check" && (
                <button type="button" className="nb-box" onClick={() => patch(b.id, { done: !b.done })} disabled={disabled} aria-pressed={b.done} aria-label={m.types.check}>
                  {b.done && <Check size={12} strokeWidth={3} />}
                </button>
              )}
              {numbered && <span className="nb-dot" aria-hidden="true" />}
              {b.t === "callout" && (
                <span className="nb-callout-ic" aria-hidden="true">
                  {b.icon || "💡"}
                </span>
              )}
              <textarea
                ref={(el) => {
                  if (el) refs.current[b.id] = el;
                  else delete refs.current[b.id];
                }}
                rows={1}
                value={b.text}
                placeholder={b.t === "p" && !(onlyOne || (i === blocks.length - 1 && isFocus)) ? "" : ph[b.t]}
                maxLength={MAX_TEXT}
                disabled={disabled}
                onChange={(e) => {
                  typeText(b, e.target.value);
                  caret.current = { id: b.id, pos: e.target.selectionStart };
                }}
                onKeyDown={(e) => onKey(e, b)}
                onKeyUp={(e) => remember(b, e.currentTarget)}
                onClick={(e) => remember(b, e.currentTarget)}
                onSelect={(e) => (caret.current = { id: b.id, pos: e.currentTarget.selectionStart })}
                onPaste={(e) => onPaste(e, b)}
                onFocus={(e) => (setFocus(b.id), remember(b, e.currentTarget))}
                onBlur={(e) => {
                  caret.current = { id: b.id, pos: e.currentTarget.selectionStart };
                  setFocus((f) => (f === b.id ? null : f));
                }}
                data-testid="nb-text"
              />
              {b.t === "check" && !noDue && (cleanDue(b.due) || b.who) && (
                <span className="nb-due-row">
                  <DueLine b={b} m={m} lang={lang} onClick={disabled ? undefined : () => setDuePop(b.id)} />
                </span>
              )}
              {duePop === b.id && !disabled && (
                <DuePop
                  b={b}
                  m={m}
                  names={[...names, ...blocks.map((x) => x.who)]}
                  onClose={() => setDuePop("")}
                  onSave={(p) => {
                    focusOn(b.id);
                    patch(b.id, p);
                  }}
                />
              )}
              {isFocus && !disabled && (!onlyOne || (b.t === "check" && !noDue)) && (
                <span className="nb-row-acts">
                  {b.t === "check" && !noDue && (
                    <button type="button" onMouseDown={keep} onClick={() => setDuePop(b.id)} aria-label={m.dueTitle} title={m.dueTitle} data-testid="nb-due-btn">
                      <CalendarClock size={14} />
                    </button>
                  )}
                  {!onlyOne && (
                    <>
                      <button type="button" onMouseDown={keep} onClick={() => move(b.id, -1)} disabled={i === 0} aria-label={m.moveUp} title={m.moveUp}>
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" onMouseDown={keep} onClick={() => move(b.id, 1)} disabled={i === blocks.length - 1} aria-label={m.moveDown} title={m.moveDown}>
                        <ArrowDown size={14} />
                      </button>
                      <button type="button" onMouseDown={keep} onClick={() => remove(b.id)} aria-label={m.removeBlock} title={m.removeBlock}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </span>
              )}
            </div>
          );
        })}
        {!disabled && (
          <button
            type="button"
            className="nb-tail"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => {
              const last = blocks[blocks.length - 1];
              if (last && !noText(last) && !last.text) return refs.current[last.id]?.focus();
              const nb = newBlock();
              focusOn(nb.id);
              set([...blocks, nb]);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Typing → saved by itself 1.5 s later. Handles "someone else changed it" (409) and failures.
// save({ title, blocks, base_version }) → the saved note · status: idle | dirty | saving | saved | error | conflict | toolarge (413: the note is too big to send)
export function useNoteDraft(note, save, { delay = 1500 } = {}) {
  const [draft, setDraft] = useState(() => ({ title: note?.title || "", blocks: cleanBlocks(note?.blocks) }));
  const [status, setStatus] = useState("idle");
  const [conflict, setConflict] = useState(null); // the newer note from the server
  const version = useRef(note?.version ?? 0);
  const base = useRef(contentKey(note)); // what the server had at `version` (to know if a newer copy only moved its version)
  const latest = useRef(draft);
  const dirty = useRef(false);
  const busy = useRef(false);
  const timer = useRef(null);
  const held = useRef(false); // a conflict waits for the person to choose
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!dirty.current || busy.current || held.current) return;
    busy.current = true;
    dirty.current = false;
    setStatus("saving");
    const sent = latest.current;
    try {
      const saved = await saveRef.current({ title: sent.title, blocks: blocksOut(sent.blocks), base_version: version.current });
      if (saved && saved.version !== undefined) version.current = saved.version;
      base.current = contentKey(sent);
      busy.current = false;
      if (dirty.current) {
        setStatus("dirty");
        timer.current = setTimeout(flush, 400);
      } else setStatus("saved");
    } catch (e) {
      busy.current = false;
      if (e?.status === 413) {
        // too big to send: trying again won't help — wait until the person makes it shorter
        dirty.current = true;
        setStatus("toolarge");
      } else if (e?.status === 409) {
        dirty.current = true;
        held.current = true;
        setConflict(e.response?.data || e.body?.data || null);
        setStatus("conflict");
      } else {
        dirty.current = true;
        setStatus("error");
        // e.stop: no point trying again by itself (read only, no rights…) — the next edit tries again
        if (!e?.stop) timer.current = setTimeout(flush, 8000);
      }
    }
  }, []);

  const edit = useCallback(
    (p) => {
      setDraft((d) => {
        const next = { ...d, ...(typeof p === "function" ? p(d) : p) };
        latest.current = next;
        return next;
      });
      dirty.current = true;
      setStatus((s) => (s === "conflict" ? s : "dirty"));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (!busy.current) flush();
      }, delay);
    },
    [delay, flush],
  );

  // a newer version from the server (polling, history restore): take it when nothing is waiting to be saved
  const take = useCallback((n, force = false) => {
    if (!n) return;
    if (!force && (dirty.current || busy.current)) {
      // typing in progress: when the newer copy says exactly what this editor started from (only its version
      // moved, e.g. a file was added), keep the typing and save it on top of that version — no false conflict
      if (!busy.current && !held.current && (n.version ?? 0) > version.current && contentKey(n) === base.current) version.current = n.version;
      return;
    }
    if (!force && (n.version ?? 0) <= version.current) return;
    version.current = n.version ?? version.current;
    base.current = contentKey(n);
    held.current = false;
    const next = { title: n.title || "", blocks: cleanBlocks(n.blocks) };
    latest.current = next;
    dirty.current = false;
    setDraft(next);
    setConflict(null);
    setStatus("saved");
  }, []);
  const resolve = useCallback(
    (keepMine) => {
      const n = conflict;
      if (!n) return;
      if (keepMine) {
        version.current = n.version ?? version.current;
        base.current = contentKey(n);
        held.current = false;
        setConflict(null);
        dirty.current = true;
        flush();
      } else take(n, true);
    },
    [conflict, flush, take],
  );

  // leaving the page / the note: save what is waiting
  useEffect(() => {
    const before = (e) => {
      if (dirty.current || busy.current) {
        flush();
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => {
      window.removeEventListener("beforeunload", before);
      clearTimeout(timer.current);
      if (dirty.current && !busy.current) flush();
    };
  }, [flush]);

  return { draft, edit, status, conflict, resolve, take, flush, version };
}
