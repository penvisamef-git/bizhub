import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpenCheck, ClipboardList, Eye, EyeOff, Loader2, Lock, MessageSquareText, PenLine } from "lucide-react";
import { Modal as BaseModal } from "../../super_admin/parts";
import { bytes, initialOf } from "./text";

export const LEVEL_ICON = { off: EyeOff, view: Eye, reply: MessageSquareText, edit: PenLine, collect: ClipboardList };
export const LEVEL_TONE = { off: "off", view: "view", reply: "reply", edit: "edit", collect: "collect" };
export { BookOpenCheck };

// "Write below" · "🔒" chip for a note's sharing
export function LevelBadge({ share, m, small }) {
  const level = share?.level || "off";
  const Icon = LEVEL_ICON[level] || EyeOff;
  return (
    <span className={`nt-level l-${level} ${small ? "sm" : ""}`}>
      <Icon size={small ? 12 : 14} />
      {m.levelShort[level]}
      {share?.has_pin && <Lock size={small ? 11 : 12} />}
    </span>
  );
}

export function Avatar({ name, owner }) {
  return <span className={`nt-av ${owner ? "owner" : ""}`}>{initialOf(name)}</span>;
}

// A dialog drawn on top of the page (a portal), never inside the card / row that opened it: a card that moves on
// hover (transform) would otherwise become the "fixed" backdrop's box — the dialog then sits clipped inside the card
// and jumps with the mouse (the "confirm shows twice and the screen freezes" bug).
export function Layer({ children }) {
  if (typeof document === "undefined") return children;
  return createPortal(<div className="nt-layer md-page nt-page rs-page">{children}</div>, document.querySelector(".app") || document.body);
}

// every Digital Note dialog goes on top of the page (see Layer)
export function Modal(props) {
  return (
    <Layer>
      <BaseModal {...props} />
    </Layer>
  );
}

// yes / no dialog (the yes button runs the async onYes, then closes) — one at a time, and Yes runs only once
export function Confirm({ title, sub, onYes, onClose, m, yes, danger = true }) {
  const [busy, setBusy] = useState(false);
  const running = useRef(false); // a double click can't run onYes twice
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
            onClick={async () => {
              if (running.current) return;
              running.current = true;
              setBusy(true);
              try {
                await onYes();
                onClose();
              } catch {
                running.current = false;
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 size={15} className="md-spin" />} {yes || m.yes}
          </button>
        </>
      }
    >
      {sub && <p className="rs-muted nt-confirm">{sub}</p>}
    </Modal>
  );
}

// browser → Cloudinary (signed by our API), with progress. Any file type (the API signs …/auto/upload).
export async function uploadSigned(sign, file, onProgress) {
  const fd = new FormData();
  fd.append("file", file);
  for (const k of ["api_key", "timestamp", "signature", "folder"]) if (sign[k] !== undefined) fd.append(k, sign[k]);
  const url = String(sign.upload_url || "").replace("/image/upload", "/auto/upload");
  return new Promise((ok, bad) => {
    const x = new XMLHttpRequest();
    x.open("POST", url);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    x.onload = () => {
      let r = null;
      try {
        r = JSON.parse(x.responseText);
      } catch {
        /* not json */
      }
      if (x.status >= 200 && x.status < 300 && r?.public_id) ok(r);
      else bad(new Error(r?.error?.message || `Upload failed (${x.status})`));
    };
    x.onerror = () => bad(Object.assign(new Error("Network error"), { step: "upload" }));
    x.onabort = () => bad(Object.assign(new Error("Upload stopped"), { step: "upload" }));
    // no answer for 2 minutes (a blocked or very slow connection) → stop instead of spinning forever
    x.timeout = 120000;
    x.ontimeout = () => bad(Object.assign(new Error("Upload timed out"), { step: "upload", timeout: true }));
    x.send(fd);
  });
}

// a file input that opens on click() (returns the picked files)
export function pickFiles({ multiple = false, accept = "" } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    if (accept) input.accept = accept;
    input.onchange = () => resolve(Array.from(input.files || []));
    input.click();
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

// used / limit bar (files + photos)
export function StorageBar({ book, m }) {
  const used = book?.storage_used || 0;
  const limit = book?.storage_limit || 1;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className={`nt-meter ${pct >= 90 ? "full" : pct >= 70 ? "warn" : ""}`}>
      <div className="nt-meter-top">
        <span>{m.used.replace("{used}", bytes(used)).replace("{limit}", bytes(limit))}</span>
        <b>{pct}%</b>
      </div>
      <span className="nt-meter-bar">
        <i style={{ width: `${Math.max(pct, used ? 2 : 0)}%` }} />
      </span>
    </div>
  );
}
