import { Check, ExternalLink } from "lucide-react";
import { DownloadBtn, FileDl, FileDlLabel } from "../../../note/blocks";
import { FileThumb, KIND_TONE } from "../../../note/files";
import { bytes, fmtTime } from "./text";

export const fileKey = (r) => `${r.where}:${r.entry_id || r.note_id}:${r._id}`;

// stored files as a list or a grid: Media (selectable, every file) and a group's Files tab (its notes' files).
// dl(row, file, inline) → signed download URL · openNote(row) opens the note it belongs to
export function FileItems({ ctx, rows, view, dl, openNote, selectable = false, picked, toggle, allOn, onPickAll }) {
  const { m, lang } = ctx;
  const where = (r) => (r.where === "entry" ? m.mediaReplyBy.replace("{name}", r.entry_name || m.guest) : m.mediaByOwner);
  const dlFor = (r) => (f, inline) => dl(r, f, inline);
  const head = selectable && (
    <div className="nt-md-head">
      <button type="button" className={`nt-md-check ${allOn ? "on" : ""}`} onClick={onPickAll} aria-pressed={allOn} title={m.mediaSelectAll} disabled={ctx.readOnly}>
        {allOn && <Check size={13} strokeWidth={3} />}
      </button>
      <span>{m.mediaSelectAll}</span>
    </div>
  );
  const noteLink = (r, cls) => (
    <button type="button" className={cls} onClick={() => !r.note_deleted && openNote(r)} disabled={r.note_deleted} title={m.openNote}>
      {m.mediaIn}: <u>{r.note_title || m.untitled}</u> {!r.note_deleted && cls === "nt-md-note" && <ExternalLink size={11} />}
    </button>
  );

  if (view === "grid")
    return (
      <FileDlLabel.Provider value={m.download}>
        {head}
        <div className="fv-grid nt-fv-grid" data-testid="nt-files-grid">
          {rows.map((r) => {
            const on = !!picked?.has(fileKey(r));
            return (
              <article key={fileKey(r)} className={`fv-card ${on ? "on" : ""}`} data-testid="nt-file-card">
                {selectable && (
                  <button type="button" className={`fv-card-check ${on ? "on" : ""}`} onClick={() => toggle(r)} aria-pressed={on} aria-label={r.name} disabled={ctx.readOnly}>
                    {on && <Check size={14} strokeWidth={3} />}
                  </button>
                )}
                <span className="fv-card-dl">
                  <FileDl.Provider value={dlFor(r)}>
                    <DownloadBtn file={{ _id: r._id, name: r.name, url: r.url }} className="fv-dl" />
                  </FileDl.Provider>
                </span>
                <span className={`fv-card-pic ${selectable ? "pick" : ""}`} onClick={selectable ? () => toggle(r) : undefined}>
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
                  {noteLink(r, "fv-card-note")}
                </span>
              </article>
            );
          })}
        </div>
      </FileDlLabel.Provider>
    );

  return (
    <FileDlLabel.Provider value={m.download}>
      {head}
      {rows.map((r) => {
        const on = !!picked?.has(fileKey(r));
        return (
          <div key={fileKey(r)} className={`nt-md-row ${on ? "on" : ""} ${selectable ? "" : "no-check"}`} data-testid="nt-media-row">
            {selectable && (
              <button type="button" className={`nt-md-check ${on ? "on" : ""}`} onClick={() => toggle(r)} aria-pressed={on} aria-label={r.name} disabled={ctx.readOnly}>
                {on && <Check size={13} strokeWidth={3} />}
              </button>
            )}
            <FileThumb r={r} className="nt-md-thumb" />
            <span className="nt-md-name">
              <b title={r.name}>{r.name || m.mediaKinds[r.kind]}</b>
              <small>
                <span className="nt-md-kind" style={{ "--k": KIND_TONE[r.kind] }}>
                  {m.mediaKinds[r.kind] || r.kind}
                </span>
                {where(r)} · {fmtTime(r.at, lang)}
              </small>
              {noteLink(r, "nt-md-note")}
            </span>
            <span className="nt-md-size">{bytes(r.size)}</span>
            <FileDl.Provider value={dlFor(r)}>
              <DownloadBtn file={{ _id: r._id, name: r.name, url: r.url }} className="md-icon-btn nt-md-dl" />
            </FileDl.Provider>
          </div>
        );
      })}
    </FileDlLabel.Provider>
  );
}
