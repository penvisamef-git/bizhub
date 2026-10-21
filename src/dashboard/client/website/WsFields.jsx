import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ImagePlus, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { websiteService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import { BLOCKS, CHOICE_NAMES, FIELD_NAMES, fill, tx } from "../../../wsite/blocks";
import { WS_ICONS } from "../../../wsite/SiteBlocks";

export { Head, Switch } from "../menuqr/parts";

// yes / no question
export function Confirm({ title, sub, yes, danger = true, onYes, onClose, m }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={title}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button
            type="button"
            className={`md-btn ${danger ? "md-btn-danger" : "md-btn-primary"}`}
            disabled={busy}
            data-testid="ws-confirm-yes"
            onClick={async () => {
              setBusy(true);
              try {
                await onYes();
                onClose();
              } catch {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 size={15} className="md-spin" />} {yes || m.delete}
          </button>
        </>
      }
    >
      <p className="rs-muted" style={{ margin: 0 }}>
        {sub}
      </p>
    </Modal>
  );
}

// text in two languages: edit the one chosen at the top, see the other one under it
export function TrInput({ value, onChange, elang, long, max = 200, label, m, testid }) {
  const v = value && typeof value === "object" ? value : { en: String(value || ""), km: "" };
  const other = elang === "km" ? v.en : v.km;
  const set = (e) => onChange({ ...v, [elang]: e.target.value });
  return (
    <label className="ws-field">
      <span className="ws-field-label">
        {label} <em className="ws-lang-tag">{elang === "km" ? "ខ្មែរ" : "EN"}</em>
      </span>
      {long ? <textarea value={v[elang] || ""} onChange={set} rows={4} maxLength={max} data-testid={testid} /> : <input value={v[elang] || ""} onChange={set} maxLength={max} data-testid={testid} />}
      {other && <small className="ws-other">{m.otherLang.replace("{text}", other.length > 80 ? `${other.slice(0, 80)}…` : other)}</small>}
    </label>
  );
}

// the site's picture library (upload, pick, delete)
export function MediaPicker({ ctx, onPick, onClose }) {
  const { id, m, notify } = ctx;
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const file = useRef(null);
  const load = () =>
    websiteService
      .media(id)
      .then((r) => setRows(r.data))
      .catch((e) => notify({ type: "error", text: e.message }));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const upload = async (files) => {
    setBusy(true);
    let last = null;
    try {
      for (const f of [...files].slice(0, 12)) {
        const r = await websiteService.upload(id, f);
        last = r.data;
      }
      await load();
      if (last && files.length === 1) onPick(last.url);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={m.mediaTitle} onClose={onClose} size="md-modal-lg">
      <div className="ws-media-top">
        <small className="rs-muted">{m.mediaSub.replace("{n}", rows?.length ?? "…").replace("{max}", ctx.data.limits.media)}</small>
        <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => file.current?.click()} disabled={busy || ctx.readOnly} data-testid="ws-upload">
          {busy ? <Loader2 size={15} className="md-spin" /> : <Upload size={15} />} {busy ? m.uploading : m.upload}
        </button>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => e.target.files?.length && upload(e.target.files)} data-testid="ws-upload-input" />
      </div>
      {rows && !rows.length && <p className="rs-muted ws-media-empty">{m.mediaEmpty}</p>}
      <div className="ws-media-grid">
        {(rows || []).map((r) => (
          <figure key={r._id}>
            <button type="button" onClick={() => onPick(r.url)} data-testid="ws-media-pick">
              <img src={r.url} alt={r.name} loading="lazy" />
            </button>
            {!ctx.readOnly && (
              <button
                type="button"
                className="ws-media-del"
                aria-label={m.deletePic}
                onClick={async () => {
                  try {
                    await websiteService.removeMedia(id, r._id);
                    setRows((x) => x.filter((y) => y._id !== r._id));
                  } catch (e) {
                    notify({ type: "error", text: e.message });
                  }
                }}
              >
                <Trash2 size={13} />
              </button>
            )}
          </figure>
        ))}
      </div>
    </Modal>
  );
}

export function ImageField({ value, onChange, label, ctx, testid }) {
  const [open, setOpen] = useState(false);
  const { m } = ctx;
  return (
    <div className="ws-field">
      <span className="ws-field-label">{label}</span>
      <div className="ws-img-field">
        {value ? (
          <img src={value} alt="" />
        ) : (
          <span className="ws-img-empty">
            <ImagePlus size={20} />
          </span>
        )}
        <div className="ws-img-acts">
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setOpen(true)} disabled={ctx.readOnly} data-testid={testid}>
            {value ? m.changeImage : m.pickImage}
          </button>
          {value && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={() => onChange("")} disabled={ctx.readOnly}>
              {m.removeImage}
            </button>
          )}
        </div>
      </div>
      {open && (
        <MediaPicker
          ctx={ctx}
          onClose={() => setOpen(false)}
          onPick={(u) => {
            onChange(u);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

// where a button / link goes: one of the pages, or any web / phone / email link
export function LinkField({ value, onChange, label, pages, lang, m }) {
  const v = String(value || "");
  const isPage = v.startsWith("page:");
  const [other, setOther] = useState(!!v && !isPage);
  const bad = other && v && !/^(https?:\/\/|tel:|mailto:|#)/.test(v);
  return (
    <label className="ws-field">
      <span className="ws-field-label">{label}</span>
      <select
        value={other ? "__other" : v}
        onChange={(e) => {
          if (e.target.value === "__other") {
            setOther(true);
            onChange("");
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">{m.linkNone}</option>
        {pages.map((p) => (
          <option key={p.slug} value={`page:${p.slug}`}>
            {m.page}: {tx(p.title, lang) || p.slug}
          </option>
        ))}
        <option value="__other">{m.linkOther}</option>
      </select>
      {other && <input value={v} onChange={(e) => onChange(e.target.value.trim())} placeholder={m.linkPh} inputMode="url" />}
      {bad && <small className="ws-bad">{m.linkBad}</small>}
    </label>
  );
}

function Choice({ value, options, onChange, label, lang }) {
  return (
    <div className="ws-field">
      <span className="ws-field-label">{label}</span>
      <div className="ws-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={value === o} className={value === o ? "on" : ""} onClick={() => onChange(o)}>
            {(CHOICE_NAMES[lang] || CHOICE_NAMES.en)[o] || o}
          </button>
        ))}
      </div>
    </div>
  );
}
function IconPick({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const Icon = WS_ICONS[value] || WS_ICONS.star;
  return (
    <div className="ws-field">
      <span className="ws-field-label">{label}</span>
      <button type="button" className="ws-icon-btn" onClick={() => setOpen((x) => !x)} aria-expanded={open}>
        <Icon size={20} /> <ChevronDown size={14} />
      </button>
      {open && (
        <div className="ws-icon-grid">
          {Object.entries(WS_ICONS).map(([k, I]) => (
            <button
              key={k}
              type="button"
              className={k === value ? "on" : ""}
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              aria-label={k}
            >
              <I size={18} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// rows of a list (gallery pictures, prices, team…)
function ListField({ kind, value, onChange, label, ctx, elang, pages, lang }) {
  const rows = Array.isArray(value) ? value : [];
  const [open, setOpen] = useState(rows.length <= 3 ? 0 : -1);
  const { m } = ctx;
  const set = (i, row) => onChange(rows.map((r, j) => (j === i ? row : r)));
  const move = (i, d) => {
    const n = [...rows];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    onChange(n);
    setOpen(i + d);
  };
  const firstText = (row) => {
    for (const [k, t] of Object.entries(kind.list)) {
      if (t === "t" || t === "tl") {
        const s = tx(row[k], elang);
        if (s) return s;
      }
      if (t === "s" && k !== "icon" && row[k]) return row[k];
    }
    return "";
  };
  return (
    <div className="ws-field">
      <span className="ws-field-label">
        {label} <small className="rs-muted">{m.rowsMax.replace("{n}", rows.length).replace("{max}", kind.max)}</small>
      </span>
      <div className="ws-rows">
        {rows.map((row, i) => (
          <div key={i} className={`ws-row ${open === i ? "open" : ""}`}>
            <div className="ws-row-head">
              <button type="button" className="ws-row-title" onClick={() => setOpen(open === i ? -1 : i)}>
                {row.image || row.photo ? <img src={row.image || row.photo} alt="" /> : <span className="ws-row-n">{i + 1}</span>}
                <span>{firstText(row) || `#${i + 1}`}</span>
              </button>
              <button type="button" className="md-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={m.moveUp}>
                <ChevronUp size={15} />
              </button>
              <button type="button" className="md-icon-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={m.moveDown}>
                <ChevronDown size={15} />
              </button>
              <button type="button" className="md-icon-btn" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={m.removeRow}>
                <X size={15} />
              </button>
            </div>
            {open === i && (
              <div className="ws-row-body">
                <Fields fields={kind.list} data={row} onChange={(r) => set(i, r)} ctx={ctx} elang={elang} pages={pages} lang={lang} />
              </div>
            )}
          </div>
        ))}
      </div>
      {rows.length < kind.max && (
        <button
          type="button"
          className="md-btn md-btn-ghost sa-btn-sm ws-add-row"
          onClick={() => {
            onChange([...rows, fill(kind.list, {})]);
            setOpen(rows.length);
          }}
          data-testid="ws-add-row"
        >
          <Plus size={15} /> {m.addRow}
        </button>
      )}
    </div>
  );
}

// every field of a block (or of one row) from its schema
export function Fields({ fields, data, onChange, ctx, elang, pages, lang }) {
  const names = FIELD_NAMES[lang] || FIELD_NAMES.en;
  const set = (k) => (v) => onChange({ ...data, [k]: v });
  return Object.entries(fields).map(([k, kind]) => {
    const label = names[k] || k;
    if (Array.isArray(kind)) return <Choice key={k} value={data[k]} options={kind} onChange={set(k)} label={label} lang={lang} />;
    if (kind && typeof kind === "object") return <ListField key={k} kind={kind} value={data[k]} onChange={set(k)} label={label} ctx={ctx} elang={elang} pages={pages} lang={lang} />;
    if (kind === "t" || kind === "tl") return <TrInput key={k} value={data[k]} onChange={set(k)} elang={elang} long={kind === "tl"} max={kind === "tl" ? 3000 : 200} label={label} m={ctx.m} testid={`ws-f-${k}`} />;
    if (kind === "img") return <ImageField key={k} value={data[k]} onChange={set(k)} label={label} ctx={ctx} testid={`ws-f-${k}`} />;
    if (kind === "to") return <LinkField key={k} value={data[k]} onChange={set(k)} label={label} pages={pages} lang={lang} m={ctx.m} />;
    if (kind === "bool")
      return (
        <label key={k} className="md-switch ws-switch">
          <input type="checkbox" checked={!!data[k]} onChange={(e) => set(k)(e.target.checked)} />
          <span className="md-switch-track" />
          <span>{label}</span>
        </label>
      );
    if (kind === "date")
      return (
        <label key={k} className="ws-field">
          <span className="ws-field-label">{label}</span>
          <input type="datetime-local" value={data[k] && data[k].length === 10 ? `${data[k]}T00:00` : data[k] || ""} onChange={(e) => set(k)(e.target.value)} />
        </label>
      );
    if (k === "icon") return <IconPick key={k} value={data[k]} onChange={set(k)} label={label} />;
    return (
      <label key={k} className="ws-field">
        <span className="ws-field-label">{label}</span>
        <input value={data[k] || ""} onChange={(e) => set(k)(e.target.value)} maxLength={300} data-testid={`ws-f-${k}`} />
      </label>
    );
  });
}
export const blockFields = (type) => BLOCKS[type] || {};
