import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CalendarClock, Check, CheckCheck, Copy, Download, ExternalLink, Folders, KeyRound, Loader2, Lock, RefreshCw, Send, ShieldCheck, X } from "lucide-react";
import { Switch } from "../menuqr/parts";
import { Confirm, LEVEL_ICON, Modal, copyText } from "./NoteParts";
import LinkField from "./LinkField";
import { dayOf, fromDay, GROUP_LEVELS, LEVELS, SITE } from "./text";

// a date + time in the page's own time (datetime-local) ⇄ ISO
const pad2 = (n) => String(n).padStart(2, "0");
const localOf = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const isoOf = (v) => (v ? new Date(v).toISOString() : null);

// Who can do what with the note's link: 5 levels, PIN, end date, options, safety + the link / QR / Telegram.
// group = a group of notes instead (4 levels, one link + PIN for all its notes)
export default function ShareDialog({ ctx, note, group, pinNotes = 0, inGroups = 0, onClose, onSaved }) {
  const { m, api } = ctx;
  const target = group || note;
  const s = target.share || {};
  const levels = group ? GROUP_LEVELS : LEVELS;
  const words = group ? m.groupLevels : m.levels;
  const [level, setLevel] = useState(s.level || "off");
  const [pin, setPin] = useState(""); // a new PIN ("" = keep)
  const [dropPin, setDropPin] = useState(false);
  const [until, setUntil] = useState(dayOf(s.expires_at));
  const [opts, setOpts] = useState({ allow_files: s.allow_files !== false, show_entries: s.show_entries !== false, ask_name: s.ask_name !== false, hide_owner: !!s.hide_owner, no_copy: !!s.no_copy });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);
  const [slug, setSlug] = useState(s.slug || ""); // custom link (note_link)
  const [opens, setOpens] = useState(localOf(s.opens_at)); // "Open from" (free)
  const [ack, setAck] = useState(!!s.ack); // "I've read it" (note_ack)
  const ackOwned = !!ctx.owns?.ack;
  const [slugOk, setSlugOk] = useState(true);
  const url = `${SITE}${s.path || (group ? `/n/g/${s.token}` : `/n/${s.token}`)}`;

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 480, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(""));
  }, [url]);

  const changed =
    level !== (s.level || "off") ||
    !!pin ||
    dropPin ||
    until !== dayOf(s.expires_at) ||
    opts.allow_files !== (s.allow_files !== false) ||
    opts.show_entries !== (s.show_entries !== false) ||
    opts.ask_name !== (s.ask_name !== false) ||
    opts.hide_owner !== !!s.hide_owner ||
    opts.no_copy !== !!s.no_copy ||
    slug.replace(/-$/, "") !== (s.slug || "") ||
    opens !== localOf(s.opens_at) ||
    ack !== !!s.ack;

  const save = async () => {
    if (pin && !/^\d{4,8}$/.test(pin)) return setErr(m.pinBad);
    const wantSlug = slug.replace(/-$/, "");
    if (wantSlug !== (s.slug || "") && wantSlug && !slugOk) return setErr(m.linkFixFirst);
    setErr("");
    setBusy(true);
    try {
      const body = { level, expires_at: until ? fromDay(until) : null, ...opts };
      if (group) {
        delete body.allow_files;
        delete body.show_entries;
      }
      if (pin) body.pin = pin;
      else if (dropPin) body.pin = "";
      if (wantSlug !== (s.slug || "")) body.slug = wantSlug;
      if (opens !== localOf(s.opens_at)) body.opens_at = isoOf(opens);
      if (ack !== !!s.ack) body.ack = ack;
      const r = group ? await api.groupShare(group._id, body) : await api.share(note._id, body);
      onSaved(r.data);
      ctx.notify({ type: "success", text: m.shareSaved });
      setPin("");
      setDropPin(false);
      onClose();
    } catch (e) {
      setErr(e.message);
      if (e.status === 402 || ["need_link", "need_ack"].includes(e.response?.code)) ctx.onError(e);
      // someone took the name a moment ago: show their suggestions
      if (e.response?.code === "slug_taken" && e.response?.suggestions?.length) setErr(`${e.message} ${m.linkTry} ${e.response.suggestions.join(" · ")}`);
    }
    setBusy(false);
  };
  const copy = async () => {
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent((group ? group.name : note.title) || m.badge)}`;
  const off = level === "off";
  const hasPin = s.has_pin && !dropPin;

  return (
    <Modal
      title={group ? m.groupShareTitle : m.shareTitle}
      onClose={onClose}
      size="md-modal-lg"
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || !changed} data-testid="nt-share-save">
            {busy && <Loader2 size={15} className="md-spin" />} {m.save}
          </button>
        </>
      }
    >
      <div className="nt-share">
        <h4>{group ? m.groupLevelTitle : m.levelTitle}</h4>
        {!group && inGroups > 0 && (
          <p className="nt-share-hint" data-testid="nt-ingroup-hint">
            <Folders size={14} /> {m.inGroupHint.replace("{n}", inGroups)}
          </p>
        )}
        <div className="nt-levels" role="radiogroup" aria-label={m.levelTitle}>
          {levels.map((k) => {
            const Icon = LEVEL_ICON[k];
            const [title, sub] = words[k];
            return (
              <button key={k} type="button" role="radio" aria-checked={level === k} className={`nt-lv l-${k} ${level === k ? "on" : ""}`} onClick={() => setLevel(k)} data-testid={`nt-lv-${k}`}>
                <span className="nt-lv-ic">
                  <Icon size={18} />
                </span>
                <span className="nt-lv-text">
                  <b>{title}</b>
                  <small>{sub}</small>
                </span>
                <span className="nt-lv-dot">{level === k && <Check size={13} strokeWidth={3} />}</span>
              </button>
            );
          })}
        </div>

        <div className={`nt-linkbox ${off ? "is-off" : ""}`}>
          <div className="nt-link-left">
            <h4>{m.link}</h4>
            <div className="nt-link-row">
              <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label={m.link} />
              <button type="button" className="md-btn md-btn-primary" onClick={copy}>
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? m.copied : m.copyLink}
              </button>
            </div>
            <div className="nt-link-acts">
              <a className="md-btn md-btn-ghost" href={url} target="_blank" rel="noreferrer">
                <ExternalLink size={15} /> {m.openLink}
              </a>
              <a className="md-btn md-btn-ghost nt-tg" href={tg} target="_blank" rel="noreferrer">
                <Send size={15} /> {m.telegram}
              </a>
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setAsking(true)}>
                <RefreshCw size={15} /> {m.newLink}
              </button>
            </div>
            {off && <p className="rs-muted nt-off-hint">{words.off[1]}</p>}
          </div>
          {qr && (
            <div className="nt-qr">
              <img src={qr} alt="QR" />
              <a className="md-btn md-btn-ghost" href={qr} download={`${((group ? group.name : note.title) || "note").replace(/[\\/:*?"<>|]+/g, "")}-qr.png`}>
                <Download size={15} /> {m.qrDownload}
              </a>
            </div>
          )}
        </div>

        {!off && (
          <>
            <LinkField ctx={ctx} kind={group ? "group" : "note"} target={target} value={slug} onChange={setSlug} onState={(st) => setSlugOk(!!st.ok)} />
          </>
        )}

        <h4>{m.options}</h4>
        <div className="nt-opts">
          <div className="md-field">
            <label htmlFor="nt-pin">
              <KeyRound size={14} /> {m.pinLabel}
            </label>
            <div className="nt-pin-row">
              <input id="nt-pin" className="md-input" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} onChange={(e) => (setPin(e.target.value.replace(/\D/g, "")), setDropPin(false))} placeholder={hasPin ? "••••" : ""} />
              {hasPin && (
                <button type="button" className="md-btn md-btn-ghost" onClick={() => (setDropPin(true), setPin(""))}>
                  <X size={15} /> {m.pinRemove}
                </button>
              )}
            </div>
            {hasPin && <small className="rs-hint">{m.pinOn}</small>}
            {group && <small className="rs-hint">{m.groupPinHint}</small>}
            {group && pinNotes > 0 && !(pin.length >= 4 || (hasPin && !dropPin)) && (
              <small className="rs-hint nt-warn-hint">
                <Lock size={12} /> {m.groupPinNotes.replace("{n}", pinNotes)}
              </small>
            )}
          </div>
          <div className="md-field">
            <label htmlFor="nt-until">{m.expires}</label>
            <div className="nt-pin-row">
              <input id="nt-until" type="date" className="md-input" value={until} min={dayOf(new Date())} onChange={(e) => setUntil(e.target.value)} />
              {until && (
                <button type="button" className="md-btn md-btn-ghost" onClick={() => setUntil("")}>
                  <X size={15} /> {m.noEnd}
                </button>
              )}
            </div>
          </div>
          <div className="md-field">
            <label htmlFor="nt-opens">
              <CalendarClock size={14} /> {m.opensAt}
            </label>
            <div className="nt-pin-row">
              <input id="nt-opens" type="datetime-local" className="md-input" value={opens} onChange={(e) => setOpens(e.target.value)} data-testid="nt-opens" />
              {opens && (
                <button type="button" className="md-btn md-btn-ghost" onClick={() => setOpens("")}>
                  <X size={15} /> {m.opensNow}
                </button>
              )}
            </div>
            <small className="rs-hint">{opens && new Date(opens) > new Date() ? m.opensHintOn : m.opensHint}</small>
          </div>
          <div className={`nt-safe v4-ack-sw ${ack ? "on" : ""}`}>
            <span>
              <b>
                <CheckCheck size={15} /> {m.ackSwitch}
              </b>
              <small>{group ? m.ackSwitchGroup : m.ackSwitchSub}</small>
            </span>
            {ackOwned || ack ? (
              <Switch checked={ack} onChange={setAck} label="" testid="nt-ack" />
            ) : (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy("note_ack")} data-testid="nt-ack-buy">
                <Lock size={13} /> {m.ackUnlockShort.replace("{coins}", ctx.prices?.note_ack ?? 5)}
              </button>
            )}
          </div>
          <div className="mq-switches nt-switches">
            <Switch checked={opts.ask_name} onChange={(v) => setOpts((o) => ({ ...o, ask_name: v }))} label={m.askName} />
            {!group && (level === "reply" || level === "edit" || level === "collect") && <Switch checked={opts.allow_files} onChange={(v) => setOpts((o) => ({ ...o, allow_files: v }))} label={m.allowFiles} />}
            {!group && (level === "reply" || level === "edit" || level === "view") && <Switch checked={opts.show_entries} onChange={(v) => setOpts((o) => ({ ...o, show_entries: v }))} label={m.showEntries} />}
          </div>
        </div>
        <h4 className="nt-safety-h">
          <ShieldCheck size={16} /> {m.safety}
        </h4>
        <div className="nt-safety">
          <div className={`nt-safe ${opts.hide_owner ? "on" : ""}`}>
            <span>
              <b>{m.hideOwner}</b>
              <small>{m.hideOwnerSub}</small>
            </span>
            <Switch checked={opts.hide_owner} onChange={(v) => setOpts((o) => ({ ...o, hide_owner: v }))} label="" testid="nt-hide-owner" />
          </div>
          <div className={`nt-safe ${opts.no_copy ? "on" : ""}`}>
            <span>
              <b>{m.noCopy}</b>
              <small>{m.noCopySub}</small>
            </span>
            <Switch checked={opts.no_copy} onChange={(v) => setOpts((o) => ({ ...o, no_copy: v }))} label="" testid="nt-no-copy" />
          </div>
        </div>
        {err && <div className="md-notice md-notice-error">{err}</div>}
      </div>
      {asking && (
        <Confirm
          m={m}
          title={m.newLinkAsk}
          sub={m.newLinkSub}
          yes={m.newLink}
          onClose={() => setAsking(false)}
          onYes={async () => {
            const r = await (group ? api.groupNewLink(group._id) : api.newLink(note._id)).catch((e) => (ctx.onError(e), Promise.reject(e)));
            onSaved(r.data);
            ctx.notify({ type: "success", text: m.newLinkOk });
          }}
        />
      )}
    </Modal>
  );
}
