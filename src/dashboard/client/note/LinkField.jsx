import { useEffect, useRef, useState } from "react";
import { Check, Link2, Loader2, Lock, X } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { fmt, SITE } from "./text";

// Custom link (note_link, 10 coins once): the owner's own words in the link — /n/<slug> or /n/g/<slug>.
// One name can only be used once on all of BizHub (notes and groups); the API has the last word.
export const normSlug = (v) => {
  const dashed = String(v ?? "").toLowerCase().replace(/[\s_.]+/g, "-");
  const kept = dashed.replace(/[^a-z0-9-]/g, "");
  return { slug: kept.replace(/-+/g, "-").replace(/^-/, "").slice(0, 40), dropped: kept.length !== dashed.length };
};

// value: the slug being typed ("" = none) · saved: the slug the note / group has now · onChange(value)
// onState({ ok }) tells the dialog whether it may save
export default function LinkField({ ctx, kind, target, value, onChange, onState }) {
  const { m, api } = ctx;
  const owned = !!ctx.owns?.link;
  const saved = target?.share?.slug || "";
  const host = SITE.replace(/^https?:\/\//, "");
  const tail = kind === "group" ? "/n/g/" : "/n/";
  // the domain is cut with "…" when there is no room; "/n/" always shows
  const prefix = (
    <span className="nt-clink-pre">
      <span className="nt-clink-host">{host}</span>
      <span>{tail}</span>
    </span>
  );
  const [check, setCheck] = useState(null); // { slug, ok, reason, dropped, suggestions } | "busy"
  const [dropped, setDropped] = useState(false);
  const seq = useRef(0);
  const clean = value.replace(/-$/, "");

  useEffect(() => {
    if (!owned || !clean || clean === saved) {
      setCheck(null);
      onState?.({ ok: true });
      return undefined;
    }
    if (clean.length < 3) {
      setCheck({ slug: clean, ok: false, reason: "short", suggestions: [] });
      onState?.({ ok: false });
      return undefined;
    }
    setCheck("busy");
    onState?.({ ok: false });
    const my = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const r = await api.linkCheck(clean, kind, target?._id);
        if (my !== seq.current) return;
        setCheck(r.data);
        onState?.({ ok: !!r.data.ok, slug: r.data.slug });
      } catch (e) {
        if (my !== seq.current) return;
        setCheck({ slug: clean, ok: false, reason: "error", message: e.message, suggestions: [] });
        onState?.({ ok: false });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, owned, saved, kind, target?._id]);

  const type = (v) => {
    const n = normSlug(v);
    setDropped(n.dropped);
    onChange(n.slug);
  };
  const busy = check === "busy";
  const res = busy ? null : check;
  const words = m.linkReasons || {};

  if (!owned)
    return (
      <div className="nt-clink is-locked" data-testid="nt-clink-locked">
        <div className="nt-clink-head">
          <b>
            <Link2 size={15} /> {m.linkField}
          </b>
          <span className="nt-clink-lock">
            <Lock size={12} /> {m.linkLocked}
          </span>
        </div>
        <button type="button" className="nt-clink-row" onClick={() => ctx.askBuy("note_link")} aria-label={m.linkUnlock.replace("{coins}", fmt(ctx.prices.note_link))} title={`${host}${tail}`}>
          {prefix}
          <span className="nt-clink-ph">{m.linkPh}</span>
        </button>
        <div className="nt-clink-foot">
          <small className="rs-hint">{m.linkWhy}</small>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy("note_link")} data-testid="nt-buy-link">
            <CoinIcon size={14} /> {m.linkUnlock.replace("{coins}", fmt(ctx.prices.note_link))}
          </button>
        </div>
      </div>
    );

  return (
    <div className={`nt-clink ${res ? (res.ok ? "is-ok" : "is-bad") : ""}`} data-testid="nt-clink">
      <div className="nt-clink-head">
        <b>
          <Link2 size={15} /> {m.linkField}
        </b>
        {saved && (
          <button type="button" className="nt-clink-x" onClick={() => onChange("")} disabled={!value} data-testid="nt-clink-remove">
            <X size={13} /> {m.linkRemove}
          </button>
        )}
      </div>
      <label className="nt-clink-row">
        {prefix}
        <input value={value} onChange={(e) => type(e.target.value)} placeholder={m.linkPh} maxLength={40} autoComplete="off" spellCheck={false} aria-label={m.linkField} data-testid="nt-clink-input" />
        <span className="nt-clink-state" aria-live="polite">
          {busy && <Loader2 size={15} className="md-spin" />}
          {res?.ok && <Check size={16} strokeWidth={3} />}
          {res && !res.ok && <X size={16} strokeWidth={3} />}
        </span>
      </label>
      {busy && <small className="rs-hint">{m.linkChecking}</small>}
      {res?.ok && <small className="nt-clink-msg ok">{res.reason === "mine" ? m.linkMine : m.linkFree}</small>}
      {res && !res.ok && <small className="nt-clink-msg bad">{res.reason === "error" ? res.message : words[res.reason] || m.linkTaken}</small>}
      {(dropped || res?.dropped) && <small className="rs-hint">{m.linkDropped}</small>}
      {res && !res.ok && res.suggestions?.length > 0 && (
        <div className="nt-clink-sugg">
          <small>{m.linkTry}</small>
          {res.suggestions.map((s) => (
            <button key={s} type="button" className="nt-chip" onClick={() => onChange(s)} data-testid="nt-clink-sugg">
              {s}
            </button>
          ))}
        </div>
      )}
      {!value && saved && <small className="rs-hint">{m.linkWillRemove}</small>}
      {!saved && !value && <small className="rs-hint">{m.linkRules}</small>}
    </div>
  );
}

// the picture in the unlock window: a browser bar with the owner's own words in the link
export function LinkStage({ m, name }) {
  const slug = normSlug(name).slug.replace(/-$/, "") || "my-shop";
  return (
    <div className="nt-link-stage">
      <div className="nt-ls-bar">
        <i />
        <i />
        <i />
        <span>
          …/n/<b>{slug}-menu</b>
        </span>
      </div>
      <div className="nt-ls-bar alt">
        <i />
        <i />
        <i />
        <span>
          …/n/g/<b>{slug}-team</b>
        </span>
      </div>
      <div className="nt-ls-vs">
        <s>…/n/K6G1xRqruNHPsreMk975U1</s>
      </div>
      <small>{m.linkStageNote}</small>
    </div>
  );
}
