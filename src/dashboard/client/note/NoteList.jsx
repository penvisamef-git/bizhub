import { useCallback, useEffect, useRef, useState } from "react";
import {
  BedDouble,
  CalendarClock,
  Check,
  CheckSquare,
  ClipboardList,
  Copy,
  FileText,
  Folder,
  LayoutTemplate,
  GraduationCap,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Pin,
  PinOff,
  Plane,
  Plus,
  RotateCcw,
  Search,
  StickyNote,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import { memo } from "../../../lib/memo";
import { useView, ViewSwitch } from "../../../note/files";
import { GroupIcon } from "./NoteGroupsPicker";
import { Confirm, LEVEL_ICON, LevelBadge, Modal } from "./NoteParts";
import { ago, fmt, LEVELS, TEMPLATES } from "./text";

const FILTERS = ["all", "pinned", "shared", "due", "deleted"];
// open checklist items: overdue · today · this week (from the list rows)
function DueBadge({ due, m }) {
  if (!due || !(due.overdue || due.today || due.week)) return null;
  const tone = due.overdue ? "late" : due.today ? "today" : "soon";
  const words = [due.overdue && m.dueOverdueN.replace("{n}", fmt(due.overdue)), due.today && m.dueTodayN.replace("{n}", fmt(due.today)), !due.overdue && !due.today && due.week && m.dueWeekN.replace("{n}", fmt(due.week))].filter(Boolean).join(" · ");
  return (
    <span className={`nt-meta v4-duebadge s-${tone}`} title={words}>
      <CalendarClock size={12} /> {words}
    </span>
  );
}
const SORTS = ["updated", "created", "title"];
const TPL_ICON = { blank: FileText, meeting: Users, homework: GraduationCap, checklist: CheckSquare, room_rent: BedDouble, repair_job: Wrench, trip: Plane, signup: ClipboardList };

// "New note": pick a template (the API fills the text in the owner's language), and optionally the groups it goes in
export function TemplateChooser({ ctx, onClose, onMade, preGroups = [] }) {
  const { m, api, lang, id } = ctx;
  const [busy, setBusy] = useState("");
  const [groups, setGroups] = useState(() => memo.get(`note:groups:${id}`) || null);
  const [picked, setPicked] = useState(() => new Set(preGroups.map(String)));
  const [gq, setGq] = useState(""); // search in the group list
  const [mine, setMine] = useState(null); // my own templates
  const [tplMenu, setTplMenu] = useState(""); // a template being renamed / deleted
  const [renaming, setRenaming] = useState(null); // { _id, name }
  useEffect(() => {
    api
      .templates()
      .then((r) => setMine(r.data || []))
      .catch(() => setMine([]));
  }, [api]);
  const [level, setLevel] = useState(""); // "" = the template's own (sign-up / homework → sign-up list, others → closed)
  useEffect(() => {
    api
      .groups()
      .then((r) => setGroups((r.data || []).filter((g) => !g.deleted)))
      .catch(() => setGroups((g) => g || []));
  }, [api]);
  const toggle = (gid) =>
    setPicked((old) => {
      const next = new Set(old);
      if (next.has(gid)) next.delete(gid);
      else next.add(gid);
      return next;
    });
  // ticked groups always stay in view; the rest are filtered by the search
  const needle = gq.trim().toLowerCase();
  const shownGroups = (groups || []).filter((g) => picked.has(String(g._id)) || !needle || String(g.name || "").toLowerCase().includes(needle));
  const list = ctx.data.templates?.length ? TEMPLATES.filter((k) => ctx.data.templates.includes(k)) : TEMPLATES;
  const make = async (template, own) => {
    setBusy(own ? `my:${own}` : template);
    try {
      const r = await api.create({ ...(own ? { my_template: own } : { template }), lang, ...(level ? { share_level: level } : {}) });
      // then put it in each chosen group (a failed one is reported, the note is still opened)
      const gids = [...picked];
      const failed = [];
      for (const gid of gids) await api.groupAdd(gid, r.data._id).catch(() => failed.push(gid));
      if (gids.length) memo.set(`note:groups:${id}`, null);
      if (failed.length) ctx.notify({ type: "error", text: m.groupAddFail });
      onMade(r.data, gids.filter((g) => !failed.includes(g)));
    } catch (e) {
      setBusy("");
      ctx.onError(e);
    }
  };
  return (
    <Modal title={m.chooseTitle} onClose={onClose} size="md-modal-lg" busy={!!busy}>
      <p className="rs-muted nt-choose-sub">{m.chooseSub}</p>
      {groups?.length > 0 && (
        <div className="nt-tpl-groups" data-testid="nt-tpl-groups">
          <span className="nt-tpl-groups-label">{m.chooseGroups}</span>
          <label className="nt-search nt-gpick-search nt-tpl-gsearch">
            <Search size={16} />
            <input value={gq} onChange={(e) => setGq(e.target.value)} placeholder={m.groupsSearch} aria-label={m.groupsSearch} data-testid="nt-tpl-gq" />
          </label>
          <div className="nt-tpl-groups-list">
            {shownGroups.length === 0 && <span className="rs-muted nt-tpl-gnone">{m.noGroupMatch}</span>}
            {shownGroups.map((g) => {
              const on = picked.has(String(g._id));
              return (
                <button key={g._id} type="button" className={`nt-gchip c-${g.color || "default"} ${on ? "on" : ""}`} onClick={() => toggle(String(g._id))} aria-pressed={on} disabled={!!busy}>
                  {on ? <Check size={14} /> : <Folder size={14} />} {g.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="nt-tpl-share" data-testid="nt-tpl-share">
        <span className="nt-tpl-groups-label">{m.shareAs}</span>
        <div className="nt-tpl-levels" role="radiogroup" aria-label={m.shareAs}>
          {LEVELS.map((k) => {
            const Icon = LEVEL_ICON[k];
            const on = level === k;
            return (
              <button key={k} type="button" role="radio" aria-checked={on} className={`nt-lvchip l-${k} ${on ? "on" : ""}`} onClick={() => setLevel(on ? "" : k)} disabled={!!busy} title={m.levels[k][1]}>
                <Icon size={14} /> {m.levels[k][0]}
              </button>
            );
          })}
        </div>
        <small className="rs-muted">{m.shareAsSub}</small>
      </div>
      {mine?.length > 0 && (
        <div className="v4-mytpls" data-testid="nt-my-templates">
          <span className="nt-tpl-groups-label">
            <LayoutTemplate size={14} /> {m.tplMine}
          </span>
          <div className="nt-tpls v4-mytpl-grid">
            {mine.map((t) => (
              <div key={t._id} className={`nt-tpl v4-mytpl c-${t.color || "default"}`}>
                <button type="button" className="v4-mytpl-main" onClick={() => make(null, t._id)} disabled={!!busy} data-testid="nt-my-tpl">
                  <span className="nt-tpl-ic">{busy === `my:${t._id}` ? <Loader2 size={20} className="md-spin" /> : <LayoutTemplate size={20} />}</span>
                  <b>{t.name}</b>
                  <small>{t.title || m.tplBlocks.replace("{n}", fmt(t.blocks_count || 0))}</small>
                </button>
                <span className="v4-mytpl-acts">
                  <button type="button" className="md-icon-btn" onClick={() => setRenaming({ _id: t._id, name: t.name })} aria-label={m.rename} title={m.rename}>
                    <PenLine size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (tplMenu !== t._id) return setTplMenu(t._id);
                      setTplMenu("");
                      try {
                        await api.removeTemplate(t._id);
                        setMine((l) => l.filter((x) => x._id !== t._id));
                      } catch (e) {
                        ctx.onError(e);
                      }
                    }}
                    aria-label={tplMenu === t._id ? m.tplDeleteSure : m.delete}
                    title={tplMenu === t._id ? m.tplDeleteSure : m.delete}
                    className={`md-icon-btn ${tplMenu === t._id ? "danger-on" : ""}`}
                  >
                    {tplMenu === t._id ? <Check size={14} /> : <Trash2 size={14} />}
                  </button>
                </span>
              </div>
            ))}
          </div>
          <span className="nt-tpl-groups-label v4-builtin-h">{m.tplBuiltIn}</span>
        </div>
      )}
      {renaming && (
        <div className="v4-rename-row">
          <input className="md-input" value={renaming.name} onChange={(e) => setRenaming((r) => ({ ...r, name: e.target.value.slice(0, 60) }))} autoFocus aria-label={m.rename} onKeyDown={(e) => e.key === "Escape" && setRenaming(null)} />
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setRenaming(null)}>
            {m.cancel}
          </button>
          <button
            type="button"
            className="md-btn md-btn-primary sa-btn-sm"
            disabled={!renaming.name.trim()}
            onClick={async () => {
              try {
                await api.renameTemplate(renaming._id, renaming.name.trim());
                setMine((l) => l.map((x) => (x._id === renaming._id ? { ...x, name: renaming.name.trim() } : x)));
                setRenaming(null);
              } catch (e) {
                ctx.onError(e);
              }
            }}
          >
            {m.save}
          </button>
        </div>
      )}
      <div className="nt-tpls">
        {list.map((k) => {
          const Icon = TPL_ICON[k] || FileText;
          const [title, sub] = m.tpl[k] || [k, ""];
          return (
            <button key={k} type="button" className={`nt-tpl t-${k}`} onClick={() => make(k)} disabled={!!busy} data-testid={`nt-tpl-${k}`}>
              <span className="nt-tpl-ic">{busy === k ? <Loader2 size={20} className="md-spin" /> : <Icon size={20} />}</span>
              <b>{title}</b>
              <small>{sub}</small>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function NoteCard({ n, ctx, onOpen, onChanged, row = false, groupsById }) {
  const { m, lang, api } = ctx;
  const [menu, setMenu] = useState(false);
  const [ask, setAsk] = useState(""); // delete | forever
  const ref = useRef(null);
  useEffect(() => {
    if (!menu) return undefined;
    const off = (e) => ref.current && !ref.current.contains(e.target) && setMenu(false);
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [menu]);
  const run = async (fn, okText) => {
    setMenu(false);
    try {
      await fn();
      if (okText) ctx.notify({ type: "success", text: okText });
      onChanged();
    } catch (e) {
      ctx.onError(e);
      throw e;
    }
  };
  const title = n.title || m.untitled;
  const inGroups = (n.group_ids || []).map((gid) => groupsById?.[gid]).filter(Boolean);
  return (
    <article className={`${row ? "nt-row nt-nrow" : "nt-card"} c-${n.color || "default"} ${n.deleted ? "is-deleted" : ""}`} data-testid={row ? "nt-note-row" : "nt-card"}>
      {row ? (
        <button type="button" className="nt-row-btn" onClick={() => !n.deleted && onOpen(n._id)} disabled={n.deleted}>
          <span className="nt-nrow-dot" aria-hidden="true" />
          <span className="nt-row-main">
            <b>
              {n.pinned && <Pin size={13} className="nt-pin" />} {title}
            </b>
            <small className="nt-nrow-preview">{n.preview || m.emptyText}</small>
            {inGroups.length > 0 && (
              <span className="nt-nrow-groups" aria-label={m.noteGroupsLabel}>
                {inGroups.slice(0, 3).map((g) => (
                  <em key={g._id} className={`c-${g.color || "default"}`}>
                    <GroupIcon g={g} size={11} /> {g.name}
                  </em>
                ))}
                {inGroups.length > 3 && <em className="more">+{inGroups.length - 3}</em>}
              </span>
            )}
          </span>
          <span className="nt-row-side">
            <LevelBadge share={n.share} m={m} small />
            <span className="nt-row-meta">
              {n.entry_count > 0 && (
                <span className="nt-meta">
                  <MessageSquareText size={12} /> {fmt(n.entry_count)}
                </span>
              )}
              {n.files_count > 0 && (
                <span className="nt-meta">
                  <Paperclip size={12} /> {fmt(n.files_count)}
                </span>
              )}
              <DueBadge due={n.due} m={m} />
              <em>{ago(n.updated_date, m, lang)}</em>
            </span>
          </span>
        </button>
      ) : (
      <button type="button" className="nt-card-main" onClick={() => !n.deleted && onOpen(n._id)} disabled={n.deleted}>
        <span className="nt-card-top">
          <b>{title}</b>
          {n.pinned && <Pin size={14} className="nt-pin" />}
        </span>
        <span className="nt-card-text">{n.preview || m.emptyText}</span>
        {n.tags?.length > 0 && (
          <span className="nt-tags">
            {n.tags.slice(0, 3).map((t) => (
              <em key={t}>#{t}</em>
            ))}
          </span>
        )}
        <span className="nt-card-foot">
          <LevelBadge share={n.share} m={m} small />
          {n.entry_count > 0 && (
            <span className="nt-meta">
              <MessageSquareText size={12} /> {fmt(n.entry_count)}
            </span>
          )}
          {n.files_count > 0 && (
            <span className="nt-meta">
              <Paperclip size={12} /> {fmt(n.files_count)}
            </span>
          )}
          <DueBadge due={n.due} m={m} />
          <span className="nt-when">{ago(n.updated_date, m, lang)}</span>
        </span>
      </button>
      )}
      <div className="nt-card-menu" ref={ref}>
        <button type="button" className="md-icon-btn" onClick={() => setMenu((v) => !v)} aria-label="Menu" aria-expanded={menu}>
          <MoreHorizontal size={17} />
        </button>
        {menu && (
          <div className="nt-pop" role="menu">
            {n.deleted ? (
              <>
                <button type="button" onClick={() => run(() => api.restore(n._id), m.restoredOk).catch(() => {})}>
                  <RotateCcw size={15} /> {m.restore}
                </button>
                <button type="button" className="danger" onClick={() => (setMenu(false), setAsk("forever"))}>
                  <Trash2 size={15} /> {m.deleteForever}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => run(() => api.save(n._id, { pinned: !n.pinned })).catch(() => {})}>
                  {n.pinned ? <PinOff size={15} /> : <Pin size={15} />} {n.pinned ? m.unpin : m.pin}
                </button>
                <button type="button" onClick={() => run(() => api.duplicate(n._id), m.copiedOk).catch(() => {})} disabled={ctx.readOnly}>
                  <Copy size={15} /> {m.duplicate}
                </button>
                <button type="button" className="danger" onClick={() => (setMenu(false), setAsk("delete"))}>
                  <Trash2 size={15} /> {m.delete}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {ask === "delete" && <Confirm m={m} title={m.deleteAsk} sub={m.deleteAskSub} yes={m.delete} onClose={() => setAsk("")} onYes={() => run(() => api.remove(n._id), m.deletedOk)} />}
      {ask === "forever" && <Confirm m={m} title={m.forever} sub={m.foreverSub} yes={m.deleteForever} onClose={() => setAsk("")} onYes={() => run(() => api.forever(n._id), m.goneOk)} />}
    </article>
  );
}

// the notes list: search, filters, sort, pinned first, colour cards
export function NotesTab({ ctx }) {
  const { m, api, id } = ctx;
  const key = `note:list:${id}`;
  const saved = memo.get(key);
  const [q, setQ] = useState(saved?.q || "");
  const [filter, setFilter] = useState(saved?.filter || "all");
  const [sort, setSort] = useState(saved?.sort || "updated");
  const [rows, setRows] = useState(saved?.rows || null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(saved?.pages || 1);
  const [loading, setLoading] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useView("notes", "grid");
  // group names for the chips in the list view (the groups tab keeps the same cache)
  const gKey = `note:groups:${id}`;
  const [groups, setGroups] = useState(() => memo.get(gKey) || null);
  useEffect(() => {
    let live = true;
    api
      .groups()
      .then((r) => {
        if (!live) return;
        const list = (r.data || []).filter((g) => !g.deleted);
        memo.set(gKey, list);
        setGroups(list);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [api, gKey]);
  const groupsById = Object.fromEntries((groups || []).map((g) => [String(g._id), g]));
  const seq = useRef(0);

  const load = useCallback(
    (p = 1) => {
      const mine = ++seq.current;
      setLoading(true);
      return api
        .notes({ q: q.trim(), filter, sort, page: p })
        .then((r) => {
          if (mine !== seq.current) return;
          const list = r.data || [];
          setRows((old) => {
            const next = p === 1 ? list : [...(old || []), ...list];
            memo.set(key, { q, filter, sort, rows: next, pages: r.pages || 1 });
            return next;
          });
          setPage(p);
          setPages(r.pages || 1);
          setError("");
        })
        .catch((e) => mine === seq.current && setError(e.message || m.loadFail))
        .finally(() => mine === seq.current && setLoading(false));
    },
    [api, q, filter, sort, key, m.loadFail],
  );
  useEffect(() => {
    const t = setTimeout(() => load(1), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (nid) => ctx.go("notes", { note: nid });
  const changed = () => {
    load(1);
    ctx.reload();
  };
  // pinned first (the API sorts too, this keeps it right after a quick pin) — not for "Due": that list stays in the
  // server's order (most overdue first)
  const shown = (rows || []).slice().sort((a, b) => (filter === "deleted" || filter === "due" ? 0 : Number(b.pinned) - Number(a.pinned)));
  const empty = rows && !rows.length && !loading;

  return (
    <div className="nt-list">
      <section className="panel-card nt-hero">
        <span className="nt-hero-ic">
          <StickyNote size={24} />
        </span>
        <div className="nt-hero-text">
          <h2>{m.notesTitle}</h2>
          <p className="rs-muted">{m.notesSub}</p>
        </div>
        <button type="button" className="md-btn md-btn-primary nt-new" onClick={() => setChoosing(true)} disabled={ctx.readOnly} data-testid="nt-new">
          <Plus size={17} /> {m.newNote}
        </button>
      </section>

      <div className="nt-bar">
        <label className="nt-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.search} aria-label={m.search} />
        </label>
        <select className="md-input nt-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={m.sorts.updated}>
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {m.sorts[s]}
            </option>
          ))}
        </select>
        <ViewSwitch view={view} onChange={setView} listLabel={m.viewList} gridLabel={m.viewGrid} testid="nt-notes-view" />
      </div>
      <div className="nt-chips" role="tablist">
        {FILTERS.map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
            {m.filters[f]}
            {f === "all" && ctx.data.counts?.notes > 0 && <small>{fmt(ctx.data.counts.notes)}</small>}
            {f === "shared" && ctx.data.counts?.shared > 0 && <small>{fmt(ctx.data.counts.shared)}</small>}
            {f === "due" && (ctx.data.counts?.due?.overdue || ctx.data.counts?.due?.today) > 0 && <small className="v4-due-count">{fmt((ctx.data.counts.due.overdue || 0) + (ctx.data.counts.due.today || 0))}</small>}
          </button>
        ))}
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
        <div className={view === "grid" ? "nt-grid" : "nt-rows"}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={view === "grid" ? "nt-card nt-skel" : "nt-row nt-skel"} />
          ))}
        </div>
      )}
      {empty && (
        <div className="panel-card nt-empty">
          <span className="nt-empty-art">
            <StickyNote size={34} />
          </span>
          <h3>{filter === "deleted" ? m.noDeleted : filter === "due" && !q ? m.dueNone : q || filter !== "all" ? m.noMatch : m.noNotes}</h3>
          {!q && filter === "all" && <p className="rs-muted">{m.noNotesSub}</p>}
          {!q && filter === "all" && (
            <button type="button" className="md-btn md-btn-primary" onClick={() => setChoosing(true)} disabled={ctx.readOnly}>
              <Plus size={17} /> {m.newNote}
            </button>
          )}
        </div>
      )}
      {rows && rows.length > 0 && (
        <div className={view === "grid" ? "nt-grid" : "nt-rows"} data-testid={`nt-notes-${view}`}>
          {shown.map((n) => (
            <NoteCard key={n._id} n={n} ctx={ctx} onOpen={open} onChanged={changed} row={view === "list"} groupsById={groupsById} />
          ))}
        </div>
      )}
      {rows && page < pages && (
        <div className="nt-more">
          <button type="button" className="md-btn md-btn-ghost" onClick={() => load(page + 1)} disabled={loading}>
            {loading && <Loader2 size={15} className="md-spin" />} {m.loadMore}
          </button>
        </div>
      )}
      {choosing && (
        <TemplateChooser
          ctx={ctx}
          onClose={() => setChoosing(false)}
          onMade={(note) => {
            setChoosing(false);
            memo.set(`note:n:${note._id}`, note);
            ctx.reload();
            open(note._id);
          }}
        />
      )}
    </div>
  );
}
