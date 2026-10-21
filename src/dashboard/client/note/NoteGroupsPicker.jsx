import { useEffect, useMemo, useState } from "react";
import { Check, FolderOpen, FolderPlus, Loader2, Search } from "lucide-react";
import { memo } from "../../../lib/memo";
import { Modal } from "./NoteParts";
import { fmt } from "./text";

// a group's icon: its own picture (Group pictures add-on) or the folder
export function GroupIcon({ g, size = 18 }) {
  const pic = typeof g?.icon_image === "string" ? g.icon_image : g?.icon_image?.url || "";
  return pic ? <img className="nt-gpic" src={pic} alt="" /> : <FolderOpen size={size} />;
}

// "Groups" in the note editor: which groups this note is in (tick / untick, saved at once)
export function NoteGroupsPicker({ ctx, note, onClose, onChanged }) {
  const { m, api, id } = ctx;
  const [groups, setGroups] = useState(() => memo.get(`note:groups:${id}`) || null);
  const [ids, setIds] = useState(() => new Set((note.group_ids || []).map(String)));
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    api
      .groups()
      .then((r) => {
        const list = (r.data || []).filter((g) => !g.deleted);
        memo.set(`note:groups:${id}`, list);
        setGroups(list);
      })
      .catch((e) => (setGroups((g) => g || []), ctx.notify({ type: "error", text: e.message })));
  }, [api, id]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = groups || [];
    return s ? list.filter((g) => String(g.name || "").toLowerCase().includes(s)) : list;
  }, [groups, q]);
  const toggle = async (g) => {
    const gid = String(g._id);
    if (busy) return;
    setBusy(gid);
    const on = ids.has(gid);
    try {
      if (on) await api.groupDrop(gid, note._id);
      else await api.groupAdd(gid, note._id);
      const next = new Set(ids);
      if (on) next.delete(gid);
      else next.add(gid);
      setIds(next);
      memo.set(`note:groups:${id}`, null);
      onChanged([...next]);
    } catch (e) {
      ctx.onError(e);
    }
    setBusy("");
  };
  return (
    <Modal
      title={m.groupsPickTitle}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={() => (onClose(), ctx.go("groups", { new: "1" }))}>
            <FolderPlus size={15} /> {m.newGroupLink}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={onClose}>
            {m.close}
          </button>
        </>
      }
    >
      <p className="rs-muted nt-gpick-sub">{m.groupsPickSub}</p>
      <label className="nt-search nt-gpick-search">
        <Search size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.groupsSearch} aria-label={m.groupsSearch} autoFocus data-testid="nt-gpick-q" />
      </label>
      {!groups && (
        <div className="nt-loading">
          <Loader2 size={22} className="md-spin" />
        </div>
      )}
      {groups && !groups.length && <p className="nt-none">{m.groupsNoneYet}</p>}
      {groups && groups.length > 0 && !shown.length && <p className="nt-none">{m.groupsNoMatch}</p>}
      <ul className="nt-gpick" data-testid="nt-gpick">
        {shown.map((g) => {
          const on = ids.has(String(g._id));
          const count = g.notes_count ?? (g.note_ids || []).length;
          return (
            <li key={g._id}>
              <button type="button" className={`nt-gpick-row c-${g.color || "default"} ${on ? "on" : ""}`} onClick={() => toggle(g)} aria-pressed={on} disabled={!!busy}>
                <span className="nt-gpick-ic">
                  <GroupIcon g={g} />
                </span>
                <span className="nt-gpick-text">
                  <b>{g.name}</b>
                  <small>{(count === 1 ? m.groupNote : m.groupNotes).replace("{n}", fmt(count))}</small>
                </span>
                <span className={`nt-gpick-box ${on ? "on" : ""}`}>{busy === String(g._id) ? <Loader2 size={13} className="md-spin" /> : on && <Check size={13} strokeWidth={3} />}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
