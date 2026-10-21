import { useState } from "react";
import { Banknote, Check, Lock, Pencil, Plus, QrCode, Trash2, Wallet } from "lucide-react";
import { martService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import { DeleteButton, Field, ImagePick } from "../restaurant/parts";
import CoinIcon from "../../../components/CoinIcon";
import { methodName } from "./text";
import { useWText } from "./wtext";

const FREE = ["cash", "aba", "khqr"];
const COLORS = ["#0D9488", "#2563EB", "#7C3AED", "#DB2777", "#DC2626", "#EA580C", "#CA8A04", "#16A34A", "#0891B2", "#475569"];
const ICON = { cash: Banknote, aba: QrCode, khqr: QrCode };

// Payment methods on the POS: Cash, ABA, KHQR are free; with mart_payments the shop makes its own (name, colour, QR picture).
//   methods / setMethods = which ones are on (saved with the Settings "Save" button); the shop's own are saved at once.
export function PayMethods({ ctx, methods, setMethods }) {
  const { m, data, readOnly } = ctx;
  const w = useWText();
  const s = data.settings;
  const on = !!data.addons?.mart_payments?.active;
  const own = s.custom_methods || [];
  const legacy = (s.methods || []).filter((k) => !FREE.includes(k) && !k.startsWith("x_")); // an older shop's built-in ACLEDA / Wing / Card…
  const [edit, setEdit] = useState(null);
  const toggle = (k) => {
    if (methods.includes(k)) {
      if (methods.length > 1) setMethods(methods.filter((x) => x !== k));
    } else setMethods([...methods, k]);
  };
  const chip = (k, color, sub) => {
    const Icon = ICON[k] || Wallet;
    const checked = methods.includes(k);
    return (
      <label key={k} className={`mpm-chip ${checked ? "on" : ""}`}>
        <input type="checkbox" checked={checked} onChange={() => toggle(k)} disabled={readOnly || (checked && methods.length === 1)} />
        <span className="mpm-ic" style={color ? { background: color } : undefined}>
          <Icon size={16} />
        </span>
        <span className="mpm-text">
          <b>{methodName(m, k)}</b>
          {sub && <small className="rs-muted">{sub}</small>}
        </span>
        {checked && <Check size={16} className="mpm-check" />}
      </label>
    );
  };
  return (
    <div className="mpm">
      <small className="ghw-label">{w.pmFree}</small>
      <div className="mpm-grid">
        {FREE.map((k) => chip(k, "", k === "cash" ? w.pmCashSub : w.pmQrSub))}
        {legacy.map((k) => chip(k, "#64748B", w.pmLegacy))}
      </div>
      <div className="mpm-own-head">
        <small className="ghw-label">{w.pmOwn}</small>
        {on && own.length < 20 && (
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setEdit({})} disabled={readOnly} data-testid="mpm-add">
            <Plus size={15} /> {w.pmAdd}
          </button>
        )}
      </div>
      {!on ? (
        <div className="at-mgr-note mpm-lock">
          <Lock size={16} />
          <span>{w.pmLocked}</span>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "mart_payments" })} disabled={readOnly}>
            <CoinIcon size={14} /> {m.unlock.replace("{coins}", data.addons?.mart_payments?.price ?? 55)} · {m.forever}
          </button>
        </div>
      ) : !own.length ? (
        <p className="rs-muted mpm-empty">{w.pmNone}</p>
      ) : (
        <div className="mpm-grid">
          {own.map((x) => (
            <div key={x.key} className="mpm-own">
              {chip(x.key, x.color || "#0D9488", x.qr?.url ? w.pmHasQr : w.pmNoQr)}
              <button type="button" className="md-icon-btn mpm-edit" onClick={() => setEdit(x)} disabled={readOnly} aria-label={w.pmEdit}>
                <Pencil size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      {edit && (
        <MethodModal
          ctx={ctx}
          w={w}
          row={edit}
          onClose={() => setEdit(null)}
          onSaved={(r, removedKey) => {
            if (r?.data?.methods) {
              // keep what is ticked here, plus a new method (on straight away), minus a removed one
              const keys = r.data.methods;
              setMethods([...new Set([...methods.filter((k) => k !== removedKey && (FREE.includes(k) || !k.startsWith("x_") || keys.includes(k))), ...(r.key ? [r.key] : [])])]);
            }
            ctx.reload();
          }}
        />
      )}
    </div>
  );
}

function MethodModal({ ctx, w, row, onClose, onSaved }) {
  const isNew = !row.key;
  const [name, setName] = useState(row.name || "");
  const [color, setColor] = useState(row.color || COLORS[0]);
  const [qr, setQr] = useState(row.qr?.url || "");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const go = async (kind, fn, close = true) => {
    setBusy(kind);
    setError("");
    try {
      const r = await fn();
      onSaved(r, kind === "remove" ? row.key : "");
      if (close) onClose();
      return r;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  const submit = () => go("save", () => (isNew ? martService.addPayMethod(ctx.id, { name, color }) : martService.savePayMethod(ctx.id, row.key, { name, color })));
  return (
    <Modal
      title={isNew ? w.pmAdd : w.pmEdit}
      onClose={onClose}
      busy={!!busy}
      footer={
        <>
          {!isNew && (
            <span style={{ marginRight: "auto" }}>
              <DeleteButton onDelete={() => go("remove", () => martService.removePayMethod(ctx.id, row.key))} r={{ confirmDelete: w.pmSure, remove: w.pmRemove }} disabled={!!busy} small />
            </span>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={!!busy}>
            {ctx.m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={submit} disabled={!!busy || !name.trim()} data-testid="mpm-save">
            {busy === "save" ? ctx.m.saving : ctx.m.save}
          </button>
        </>
      }
    >
      {/* not a <form>: this sits inside the Settings form */}
      <div className="md-fields">
        <Field label={w.pmName} htmlFor="mpm-name" hint={w.pmNameHint}>
          <input
            id="mpm-name"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (name.trim()) submit();
              }
            }}
            placeholder="ACLEDA, Wing, Pi Pay…"
            autoFocus
          />
        </Field>
        <Field label={w.pmColor}>
          <div className="mpm-colors">
            {COLORS.map((c) => (
              <button key={c} type="button" className={color === c ? "on" : ""} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
            ))}
          </div>
        </Field>
        {!isNew ? (
          <Field label={w.pmQr} hint={w.pmQrHint}>
            <ImagePick
              value={qr}
              busy={busy === "qr"}
              r={{ upload: ctx.m.upload, change: ctx.m.change2, uploading: ctx.m.uploading, remove: ctx.m.remove }}
              onPick={async (f) => {
                const r = await go("qr", () => martService.payMethodQr(ctx.id, row.key, f), false);
                const x = r?.data?.custom_methods?.find((y) => y.key === row.key);
                if (x) setQr(x.qr?.url || "");
              }}
              onRemove={async () => {
                if (await go("qr", () => martService.removePayMethodQr(ctx.id, row.key), false)) setQr("");
              }}
            />
          </Field>
        ) : (
          <small className="rs-muted">{w.pmQrLater}</small>
        )}
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}
