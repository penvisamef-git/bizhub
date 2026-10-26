import { useEffect, useState } from "react";
import { Copy, Send } from "lucide-react";
import { teamService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import { day, fill, useTeamText } from "./team-text";

export const joinUrl = (code) => `${window.location.origin}/app/join/${code}`;

// the QR of a link, drawn as SVG (the library loads only when needed)
export function QrSvg({ text, className = "tm-qr" }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    import("qrcode")
      .then((m) => m.default.toString(text, { type: "svg", margin: 0, color: { dark: "#1F1A16", light: "#FFFFFF" } }))
      .then((s) => live && setSvg(s))
      .catch(() => live && setSvg(""));
    return () => {
      live = false;
    };
  }, [text]);
  return <div className={className} role="img" aria-label="QR" dangerouslySetInnerHTML={{ __html: svg }} />;
}

// Add member: pick Admin / View only, then by BizHub ID or by an invite link
export default function AddMemberModal({ businessId, onClose, onChanged, onInvited }) {
  const { tt, lang } = useTeamText();
  const [role, setRole] = useState("view");
  const [mode, setMode] = useState("id");
  const [bhid, setBhid] = useState("");
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // a new link if the role changes after one was made
  useEffect(() => setLink(null), [role]);

  const invite = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await teamService.invite(businessId, bhid, role);
      onChanged?.(r.data);
      onInvited?.(r.message);
    } catch (err) {
      setError(err.message || tt.error);
    } finally {
      setBusy(false);
    }
  };
  const makeLink = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await teamService.makeLink(businessId, role);
      setLink(r.data);
      onChanged?.(r.team);
    } catch (err) {
      setError(err.message || tt.error);
    } finally {
      setBusy(false);
    }
  };
  const url = link ? joinUrl(link.code) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the link stays visible to copy by hand */
    }
  };

  const roles = [
    { key: "admin", name: tt.admin, desc: tt.adminDesc },
    { key: "view", name: tt.view, desc: tt.viewDesc },
  ];

  return (
    <Modal
      title={tt.addTitle}
      onClose={onClose}
      busy={busy}
      footer={
        mode === "id" ? (
          <>
            <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
              {tt.back}
            </button>
            <button type="submit" form="tm-add" className="md-btn md-btn-primary" disabled={busy || bhid.replace(/\D/g, "").length !== 6} data-testid="team-send">
              {tt.sendInvite}
            </button>
          </>
        ) : !link ? (
          <button type="button" className="md-btn md-btn-primary" onClick={makeLink} disabled={busy} data-testid="team-make-link">
            {tt.makeLink}
          </button>
        ) : (
          <button type="button" className="md-btn md-btn-primary" onClick={onClose}>
            OK
          </button>
        )
      }
    >
      <div className="md-fields">
        <div className="tm-sec" style={{ marginTop: 0 }}>
          1 · {tt.whatCan}
        </div>
        <div className="tm-roles" role="radiogroup" aria-label={tt.whatCan}>
          {roles.map((r) => (
            <button key={r.key} type="button" role="radio" aria-checked={role === r.key} className={`tm-role ${role === r.key ? "on" : ""}`} onClick={() => setRole(r.key)} data-testid={`team-role-${r.key}`}>
              <i className="tm-dot" aria-hidden="true" />
              <span>
                <b>{r.name}</b>
                <small>{r.desc}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="tm-sec">2 · {tt.howAdd}</div>
        <div className="tm-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "id"} className={mode === "id" ? "on" : ""} onClick={() => setMode("id")} data-testid="team-tab-id">
            {tt.byId}
          </button>
          <button type="button" role="tab" aria-selected={mode === "link"} className={mode === "link" ? "on" : ""} onClick={() => setMode("link")} data-testid="team-tab-link">
            {tt.byLink}
          </button>
        </div>

        {error && <div className="md-form-error">{error}</div>}

        {mode === "id" ? (
          <form id="tm-add" onSubmit={invite} className="md-field">
            <label htmlFor="tm-bhid">{tt.idLabel}</label>
            <input id="tm-bhid" value={bhid} onChange={(e) => setBhid(e.target.value.toUpperCase())} placeholder={tt.idPh} maxLength={12} autoComplete="off" autoFocus inputMode="text" data-testid="team-bhid" />
            <span className="md-hint">{tt.idHint}</span>
          </form>
        ) : link ? (
          <div data-testid="team-link">
            <div className="tm-linkbox">
              <QrSvg text={url} />
              <div>
                <span className="md-hint">{tt.linkFor}</span>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{link.role === "admin" ? tt.admin : tt.view}</div>
                <span className="md-hint">
                  {tt.linkLife} · {fill(tt.endsOn, { date: day(link.expires_at, lang) })}
                </span>
              </div>
            </div>
            <div className="tm-url">{url}</div>
            <div className="tm-two">
              <button type="button" className="md-btn md-btn-ghost" onClick={copy}>
                <Copy size={15} /> {copied ? tt.copied : tt.copy}
              </button>
              <a className="md-btn md-btn-primary" href={`https://t.me/share/url?url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
                <Send size={15} /> {tt.telegram}
              </a>
            </div>
          </div>
        ) : (
          <p className="md-hint">
            {tt.linkFor} <b>{role === "admin" ? tt.admin : tt.view}</b> · {tt.linkLife}
          </p>
        )}
      </div>
    </Modal>
  );
}
