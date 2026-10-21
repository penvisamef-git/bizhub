import { useState } from "react";
import { File, FileArchive, FileAudio, FileSpreadsheet, FileText, FileType, FileVideo, Image as ImageIcon, LayoutGrid, List, Presentation, Signature } from "lucide-react";
import "./files.css";

// Shared by the owner dashboard (Media, the group's Files, Notes, Groups) and the public group page ("All files").
// File types: the API works them out from the mime type + the name.
export const FILE_KINDS = ["all", "image", "video", "audio", "pdf", "word", "excel", "slides", "text", "zip", "sign", "other"];
export const KIND_ICON = { all: LayoutGrid, image: ImageIcon, video: FileVideo, audio: FileAudio, pdf: FileText, word: FileType, excel: FileSpreadsheet, slides: Presentation, text: FileText, zip: FileArchive, sign: Signature, other: File };
export const KIND_TONE = { image: "#2563eb", video: "#7c3aed", audio: "#db2777", pdf: "#d93025", word: "#1d4ed8", excel: "#15803d", slides: "#ea580c", text: "#475569", zip: "#a16207", sign: "#0f766e", other: "#6b7280" };

// a small picture for a stored file (Cloudinary makes it on the fly): photos + signatures, a video's first second,
// a PDF's first page. "" = no picture (show the type icon).
export function thumbOf(r, w = 360) {
  const url = String(r?.url || "");
  const h = Math.round(w * 0.75);
  const cloud = /res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\//.test(url);
  if (r?.kind === "image") return cloud ? url.replace("/image/upload/", `/image/upload/c_fill,w_${w},h_${h},q_auto,f_auto/`) : url;
  if (r?.kind === "sign") return cloud ? url.replace("/image/upload/", `/image/upload/c_pad,b_white,w_${w},h_${h},q_auto,f_auto/`) : url;
  if (!cloud) return "";
  if (r?.kind === "video" && url.includes("/video/upload/")) return url.replace("/video/upload/", `/video/upload/so_1,c_fill,w_${w},h_${h},q_auto/`).replace(/\.[a-z0-9]+(\?.*)?$/i, ".jpg");
  if (r?.kind === "pdf" && url.includes("/image/upload/")) return url.replace("/image/upload/", `/image/upload/pg_1,c_fill,g_north,w_${w},h_${h},q_auto/`).replace(/\.pdf(\?.*)?$/i, ".jpg");
  return "";
}

// the picture, or a coloured type icon (also when the picture fails to load)
export function FileThumb({ r, big = false, className = "" }) {
  const [bad, setBad] = useState(false);
  const src = bad ? "" : thumbOf(r, big ? 480 : 120);
  const Icon = KIND_ICON[r?.kind] || File;
  if (src) return <img className={`fv-thumb ${big ? "big" : ""} ${className}`} src={src} alt="" loading="lazy" onError={() => setBad(true)} />;
  return (
    <span className={`fv-thumb ic ${big ? "big" : ""} ${className}`} style={{ "--k": KIND_TONE[r?.kind] || "#6b7280" }}>
      <Icon size={big ? 34 : 20} />
    </span>
  );
}

// list / grid, remembered per screen in this browser
export function useView(key, def = "list") {
  const name = `bh_note_view:${key}`;
  const [view, setView] = useState(() => {
    try {
      const v = window.localStorage.getItem(name);
      return v === "grid" || v === "list" ? v : def;
    } catch {
      return def;
    }
  });
  const set = (v) => {
    setView(v);
    try {
      window.localStorage.setItem(name, v);
    } catch {
      /* private window: just not remembered */
    }
  };
  return [view, set];
}

// the List | Grid switch (same look on every screen)
export function ViewSwitch({ view, onChange, listLabel = "List", gridLabel = "Grid", testid = "view" }) {
  return (
    <div className="fv-switch" role="radiogroup" aria-label={`${listLabel} / ${gridLabel}`} data-testid={`${testid}-switch`}>
      <button type="button" role="radio" aria-checked={view === "list"} className={view === "list" ? "on" : ""} onClick={() => onChange("list")} title={listLabel} aria-label={listLabel} data-testid={`${testid}-list`}>
        <List size={16} />
      </button>
      <button type="button" role="radio" aria-checked={view === "grid"} className={view === "grid" ? "on" : ""} onClick={() => onChange("grid")} title={gridLabel} aria-label={gridLabel} data-testid={`${testid}-grid`}>
        <LayoutGrid size={16} />
      </button>
    </div>
  );
}

// type filter chips with counts (only types that have files, plus the chosen one)
export function KindChips({ kinds = {}, kind, onChange, total, names = {}, className = "", fmt = (n) => n }) {
  return (
    <div className={`fv-kinds ${className}`} role="tablist">
      {FILE_KINDS.filter((k) => k === "all" || k === kind || kinds[k]?.count > 0).map((k) => {
        const Icon = KIND_ICON[k];
        const n = k === "all" ? total : kinds[k]?.count;
        return (
          <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? "on" : ""} onClick={() => onChange(k)} style={k !== "all" ? { "--k": KIND_TONE[k] } : undefined} data-testid={`fv-kind-${k}`}>
            <Icon size={14} /> {names[k] || k}
            {n > 0 && <small>{fmt(n)}</small>}
          </button>
        );
      })}
    </div>
  );
}
