import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Images, Loader2, Lock, Search, Trash2, X } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { FILE_KINDS, KIND_ICON, KIND_TONE, KindChips, useView, ViewSwitch } from "../../../note/files";
import { Confirm } from "./NoteParts";
import { FileItems, fileKey as keyOf } from "./FileViews";
import { bytes, fmt } from "./text";

// file types (the API works them out from the mime type + the name) — kept here for older imports
export const MEDIA_KINDS = FILE_KINDS;
export { KIND_ICON };

const itemOf = (r) => ({ where: r.where, note_id: r.note_id, ...(r.entry_id ? { entry_id: r.entry_id } : {}), file_id: r._id });

// Media manager (note_media): every stored file — biggest first, which note it is in, delete many at once
export function MediaTab({ ctx }) {
  const { m, api } = ctx;
  const [view, setView] = useView("media", "list");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState("size");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [totals, setTotals] = useState(null);
  const [locked, setLocked] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState(() => new Map()); // key → row
  const [asking, setAsking] = useState(false);
  const seq = useRef(0);

  const load = useCallback(
    (p = 1) => {
      const mine = ++seq.current;
      return api
        .media({ kind, sort, q: q.trim(), page: p })
        .then((r) => {
          if (mine !== seq.current) return;
          setLocked(!!r.locked);
          setTotals(r.totals || null);
          setRows((old) => (p === 1 ? r.data || [] : [...(old || []), ...(r.data || [])]));
          setPage(p);
          setPages(r.pages || 1);
          setError("");
        })
        .catch((e) => mine === seq.current && setError(e.message || m.loadFail));
    },
    [api, kind, sort, q, m.loadFail],
  );
  useEffect(() => {
    const t = setTimeout(() => load(1), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const selBytes = useMemo(() => [...picked.values()].reduce((s, r) => s + (r.size || 0), 0), [picked]);
  const toggle = (r) =>
    setPicked((old) => {
      const next = new Map(old);
      const k = keyOf(r);
      if (next.has(k)) next.delete(k);
      else if (next.size < 100) next.set(k, r);
      return next;
    });
  const allOn = rows?.length > 0 && rows.every((r) => picked.has(keyOf(r)));
  const pickAll = () =>
    setPicked((old) => {
      const next = new Map(old);
      if (allOn) rows.forEach((r) => next.delete(keyOf(r)));
      else rows.forEach((r) => next.size < 100 && next.set(keyOf(r), r));
      return next;
    });
  const used = totals?.used ?? ctx.data.book?.storage_used ?? 0;
  const limit = totals?.limit ?? ctx.data.book?.storage_limit ?? 0;
  const kinds = totals?.kinds || {};
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const unlock = () => ctx.askBuy("note_media");
  // the bar split by type (only types that have bytes)
  const parts = FILE_KINDS.filter((k) => k !== "all" && kinds[k]?.bytes > 0);

  return (
    <div className="nt-list nt-media">
      <section className="panel-card nt-hero">
        <span className="nt-hero-ic nt-ic-media">
          <Images size={24} />
        </span>
        <div className="nt-hero-text">
          <h2>{m.mediaHead}</h2>
          <p className="rs-muted">{m.mediaHeadSub}</p>
        </div>
      </section>

      <section className="panel-card nt-md-meter">
        <div className="nt-md-meter-top">
          <b>{m.mediaUsed.replace("{used}", bytes(used)).replace("{limit}", bytes(limit))}</b>
          {totals?.count != null && <span className="rs-muted">{m.mediaFiles.replace("{n}", fmt(totals.count))}</span>}
        </div>
        <div className="nt-md-bar" role="img" aria-label={`${Math.round(pct)}%`}>
          {parts.length ? (
            parts.map((k) => <span key={k} style={{ width: `${limit ? (kinds[k].bytes / limit) * 100 : 0}%`, background: KIND_TONE[k] }} title={`${m.mediaKinds[k]} · ${bytes(kinds[k].bytes)}`} />)
          ) : (
            <span style={{ width: `${pct}%` }} />
          )}
        </div>
        {parts.length > 0 && (
          <ul className="nt-md-legend">
            {parts.map((k) => (
              <li key={k}>
                <i style={{ background: KIND_TONE[k] }} /> {m.mediaKinds[k]} <b>{bytes(kinds[k].bytes)}</b>
              </li>
            ))}
          </ul>
        )}
      </section>

      {locked ? (
        <section className="panel-card nt-md-locked" data-testid="nt-media-locked">
          <div className="nt-md-ghost" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="nt-md-row ghost">
                <span className="nt-md-thumb ic" />
                <span className="nt-md-name">
                  <b />
                  <small />
                </span>
                <span className="nt-md-size" />
              </div>
            ))}
          </div>
          <div className="nt-md-lock-card">
            <span className="nt-md-lock-ic">
              <Lock size={22} />
            </span>
            <h3>{m.mediaLockedTitle}</h3>
            <p className="rs-muted">{m.mediaLockedSub}</p>
            <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={unlock} disabled={ctx.readOnly} data-testid="nt-media-unlock">
              <CoinIcon size={15} /> {m.mediaUnlock.replace("{coins}", fmt(ctx.prices.note_media))}
            </button>
          </div>
        </section>
      ) : (
        <>
          {totals?.top_notes?.length > 0 && (
            <section className="panel-card nt-md-top">
              <h3>{m.mediaBiggest}</h3>
              <ol>
                {totals.top_notes.slice(0, 5).map((n) => (
                  <li key={n.note_id}>
                    <button type="button" onClick={() => !n.note_deleted && ctx.go("notes", { note: n.note_id })} disabled={n.note_deleted}>
                      <b>{n.note_title || m.untitled}</b>
                      <small>{m.mediaFiles.replace("{n}", fmt(n.count))}</small>
                    </button>
                    <span className="nt-md-top-bar">
                      <i style={{ width: `${Math.max(3, (n.bytes / Math.max(1, totals.top_notes[0].bytes)) * 100)}%` }} />
                    </span>
                    <em>{bytes(n.bytes)}</em>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="nt-bar">
            <label className="nt-search">
              <Search size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.mediaSearch} aria-label={m.mediaSearch} data-testid="nt-media-q" />
            </label>
            <select className="md-input nt-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={m.mediaSort.size}>
              {Object.keys(m.mediaSort).map((k) => (
                <option key={k} value={k}>
                  {m.mediaSort[k]}
                </option>
              ))}
            </select>
            <ViewSwitch view={view} onChange={setView} listLabel={m.viewList} gridLabel={m.viewGrid} testid="nt-media-view" />
          </div>
          <div data-testid="nt-media-kinds">
            <KindChips kinds={kinds} kind={kind} onChange={setKind} total={totals?.count} names={m.mediaKinds} fmt={fmt} className="nt-md-kinds" />
          </div>

          {error && !rows && (
            <div className="panel-card sa-empty-state">
              <p>{error}</p>
              <button type="button" className="md-btn md-btn-primary" onClick={() => load(1)}>
                {m.retry}
              </button>
            </div>
          )}
          {!rows && !error && (
            <div className="panel-card nt-loading">
              <Loader2 size={24} className="md-spin" />
            </div>
          )}
          {rows && !rows.length && <p className="nt-none panel-card">{q || kind !== "all" ? m.mediaNoMatch : m.mediaNone}</p>}
          {rows && rows.length > 0 && (
            <section className={`panel-card nt-md-list ${view === "grid" ? "is-grid" : ""}`}>
              <FileItems
                ctx={ctx}
                rows={rows}
                view={view}
                selectable
                picked={picked}
                toggle={toggle}
                allOn={allOn}
                onPickAll={pickAll}
                dl={(r, f, inline) => (r.where === "entry" ? api.entryFileUrl(r.entry_id, f._id, inline) : api.fileUrl(r.note_id, f._id, inline)).then((x) => x.data?.url)}
                openNote={(r) => ctx.go("notes", { note: r.note_id, ...(r.where === "entry" ? { nt: "entries" } : {}) })}
              />
              {page < pages && (
                <div className="nt-more">
                  <button type="button" className="md-btn md-btn-ghost" onClick={() => load(page + 1)}>
                    {m.loadMore}
                  </button>
                </div>
              )}
            </section>
          )}
          {picked.size > 0 && (
            <div className="nt-md-bulk" role="region" aria-label={m.mediaSelected} data-testid="nt-media-bulk">
              <b>{m.mediaSelected.replace("{n}", fmt(picked.size)).replace("{size}", bytes(selBytes))}</b>
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setPicked(new Map())}>
                <X size={15} /> {m.mediaClear}
              </button>
              <button type="button" className="md-btn md-btn-danger" onClick={() => setAsking(true)} data-testid="nt-media-delete">
                <Trash2 size={15} /> {m.mediaDelete.replace("{n}", fmt(picked.size))}
              </button>
            </div>
          )}
        </>
      )}
      {asking && (
        <Confirm
          m={m}
          title={m.mediaDeleteAsk.replace("{n}", fmt(picked.size))}
          sub={m.mediaDeleteSub.replace("{size}", bytes(selBytes))}
          yes={m.mediaDelete.replace("{n}", fmt(picked.size))}
          onClose={() => setAsking(false)}
          onYes={async () => {
            const items = [...picked.values()].map(itemOf);
            const r = await api.removeMedia(items).catch((e) => (ctx.onError(e), Promise.reject(e)));
            const out = r.data && !Array.isArray(r.data) ? r.data : r;
            const n = out.removed?.length ?? items.length;
            ctx.notify({ type: "success", text: m.mediaDeleted.replace("{n}", fmt(n)).replace("{size}", bytes(out.freed ?? selBytes)) });
            setPicked(new Map());
            ctx.reload();
            load(1);
          }}
        />
      )}
    </div>
  );
}
