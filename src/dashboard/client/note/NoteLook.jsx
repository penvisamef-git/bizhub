import { useMemo, useState } from "react";
import { Check, Lock, Loader2, Palette, Pipette, X } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { ACCENTS, cleanTheme, isFreeTheme, NOTE_THEMES, themeLook, themeName } from "../../../note/themes";
import { plainOf, StickerArt } from "../../../note/blocks";
import { Modal } from "./NoteParts";
import { fmt } from "./text";
import "../../../note/notepage.css";

// a small public page in one theme (title, two lines, a checkbox, a reply, a button) — the note's own words when given
export function ThemeMini({ theme, m, title, lines, big = false }) {
  const look = themeLook(theme);
  const t = title || m.sampleTitle;
  const l = (lines && lines.length ? lines : [m.sampleText]).slice(0, 2);
  return (
    <div className={`np-page nt-th-mini ${look.className} ${big ? "big" : ""}`} style={look.style} aria-hidden="true">
      <div className="np-card np-note">
        <h1 className="np-title">{t}</h1>
        <div className="nb-view">
          {l.map((x, i) => (
            <p key={i}>{x}</p>
          ))}
          <ul className="nb-checks">
            <li className="nb-ck done">
              <span className="nb-box">
                <Check size={8} strokeWidth={4} />
              </span>
              <span className="nb-ck-text">{m.sampleCheck}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="np-card np-mini-replies">
        <div className="np-mini-reply">
          <span className="np-av">S</span>
          <span className="np-entry-body">{m.sampleReply || "👍 OK!"}</span>
        </div>
        <span className="np-btn">{m.send}</span>
      </div>
    </div>
  );
}

// the Style pack's picture in the unlock window
export function StylePackStage({ m }) {
  const [a, b, c] = m.stylePreview || ["Big title", "Highlighted line", "A tip in a box"];
  return (
    <div className="nt-style-stage" aria-hidden="true">
      <div className="nt-style-sheet paper-lined">
        <b className="nb-c-indigo nb-s-xl">{a}</b>
        <p className="nb-bg-amber">{b}</p>
        <div className="nb-callout nb-bg-teal">
          <span className="nb-callout-ic">💡</span>
          <p>{c}</p>
        </div>
        <div className="nt-style-stickers">
          <StickerArt name="star" size="sm" />
          <StickerArt name="lotus" size="sm" />
          <StickerArt name="tuktuk" size="sm" />
          <span className="nt-style-emoji">🎉😍✅</span>
        </div>
      </div>
    </div>
  );
}

// "Look": pick the public page theme + accent colour for a note or a group. Owned themes apply at once,
// a locked one opens the unlock window (big preview) and is applied after paying.
export function LookDialog({ ctx, target, kind = "note", onClose, onSaved }) {
  const { m, api, lang } = ctx;
  const start = cleanTheme(target.theme);
  const [key, setKey] = useState(start.key);
  const [color, setColor] = useState(start.color);
  const [busy, setBusy] = useState(false);
  const owned = ctx.owns?.themes || new Set();
  const has = (k) => isFreeTheme(k) || owned.has(k) || k === start.key;
  const title = kind === "group" ? target.name : target.title || m.untitled;
  const lines = useMemo(() => {
    if (kind === "group") return [m.lookGroupSub];
    const words = (target.blocks || []).filter((b) => b && b.text && !["file", "draw", "divider", "sticker"].includes(b.t)).map((b) => b.text);
    return words.length ? words.slice(0, 2) : [plainOf(target.blocks || []) || m.sampleText];
  }, [kind, target, m]);
  const save = async (next) => {
    setBusy(true);
    try {
      const body = { theme: next };
      const r = kind === "group" ? await api.saveGroup(target._id, body) : await api.save(target._id, body);
      onSaved({ ...(r.data || {}), theme: r.data?.theme || next });
      ctx.notify({ type: "success", text: m.themeApplied });
      onClose();
    } catch (e) {
      ctx.onError(e);
    }
    setBusy(false);
  };
  const pick = (k) => {
    if (has(k)) return setKey(k);
    // a locked theme: the unlock window shows it big, then it is saved straight away
    ctx.askBuy({
      kind: "theme",
      key: k,
      color,
      preview: <ThemeMini theme={{ key: k, color }} m={m} title={title} lines={lines} big />,
      onDone: () => {
        setKey(k);
        save({ key: k, color });
      },
    });
  };
  const changed = key !== start.key || color !== start.color;
  return (
    <Modal
      title={m.lookTitle}
      onClose={() => !busy && onClose()}
      size="md-modal-lg nt-look-modal"
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={() => save({ key, color })} disabled={busy || !changed || !has(key)} data-testid="nt-look-save">
            {busy && <Loader2 size={15} className="md-spin" />} {m.themeUse}
          </button>
        </>
      }
    >
      <p className="rs-muted nt-look-sub">{(kind === "group" ? m.lookGroupSub : m.lookSub).replace("{coins}", fmt(ctx.prices.note_theme))}</p>
      <div className="nt-look-colors" role="radiogroup" aria-label={m.themeColor}>
        <span className="nt-look-label">
          <Palette size={14} /> {m.themeColor}
        </span>
        <button type="button" className={`nt-acc auto ${!color ? "on" : ""}`} onClick={() => setColor("")} title={m.themeColorAuto} aria-pressed={!color}>
          <X size={12} />
        </button>
        {ACCENTS.map((c) => (
          <button key={c} type="button" className={`nt-acc ${color.toLowerCase() === c ? "on" : ""}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} aria-pressed={color.toLowerCase() === c} />
        ))}
        <label className={`nt-acc custom ${color && !ACCENTS.includes(color.toLowerCase()) ? "on" : ""}`} title={m.themeCustom} style={color && !ACCENTS.includes(color.toLowerCase()) ? { background: color } : undefined}>
          <Pipette size={13} />
          <input type="color" value={color || "#e0581a"} onChange={(e) => setColor(e.target.value)} aria-label={m.themeCustom} />
        </label>
      </div>
      <div className="nt-looks" data-testid="nt-looks">
        {NOTE_THEMES.map((t) => {
          const on = key === t.key;
          const own = has(t.key);
          return (
            <button key={t.key} type="button" className={`nt-look ${on ? "on" : ""} ${own ? "" : "locked"}`} onClick={() => pick(t.key)} aria-pressed={on} data-testid={`nt-look-${t.key}`}>
              <span className="nt-look-art">
                <ThemeMini theme={{ key: t.key, color }} m={m} title={title} lines={lines} />
              </span>
              <span className="nt-look-name">
                <b>{themeName(t.key, lang)}</b>
                {on ? (
                  <em className="on">
                    <Check size={12} /> {start.key === t.key ? m.themeIn : ""}
                  </em>
                ) : isFreeTheme(t.key) ? (
                  <em>{m.themeFree}</em>
                ) : own ? (
                  <em>{m.themeOwned}</em>
                ) : (
                  <em className="price">
                    <Lock size={11} /> <CoinIcon size={12} /> {fmt(ctx.prices.note_theme)}
                  </em>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// Add-ons → Page themes: every theme with a preview; buy the ones you like (they are then free to use anywhere)
export function ThemeShop({ ctx, onClose }) {
  const { m, lang } = ctx;
  const owned = ctx.owns?.themes || new Set();
  const paid = NOTE_THEMES.filter((t) => !isFreeTheme(t.key));
  return (
    <Modal
      title={m.themesCard}
      onClose={onClose}
      size="md-modal-lg nt-look-modal"
      footer={
        <button type="button" className="md-btn md-btn-primary" onClick={onClose}>
          {m.close}
        </button>
      }
    >
      <p className="rs-muted nt-look-sub">{m.themesWhat}</p>
      <div className="nt-looks">
        {paid.map((t) => {
          const own = owned.has(t.key);
          return (
            <button
              key={t.key}
              type="button"
              className={`nt-look ${own ? "on owned" : "locked"}`}
              onClick={() => !own && ctx.askBuy({ kind: "theme", key: t.key, preview: <ThemeMini theme={{ key: t.key }} m={m} big />, onDone: () => ctx.reload() })}
              data-testid={`nt-shop-${t.key}`}
            >
              <span className="nt-look-art">
                <ThemeMini theme={{ key: t.key }} m={m} />
              </span>
              <span className="nt-look-name">
                <b>{themeName(t.key, lang)}</b>
                {own ? (
                  <em className="on">
                    <Check size={12} /> {m.themeOwned}
                  </em>
                ) : (
                  <em className="price">
                    <Lock size={11} /> <CoinIcon size={12} /> {fmt(ctx.prices.note_theme)}
                  </em>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
