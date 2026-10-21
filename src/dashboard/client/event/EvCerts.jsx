import { useEffect, useMemo, useState } from "react";
import { Award, Check, CheckCircle2, Download, ExternalLink, Loader2, Lock, PenLine, Save, Search, Send, Trash2, UserCheck, UserX } from "lucide-react";
import { CertView } from "../../../evpub/Certificate";
import { CERT_ALL, CERT_LAYOUTS, certName, isFreeCert } from "../../../evpub/certThemes";
import CoinIcon from "../../../components/CoinIcon";
import SignDialog from "./SignDialog";
import "../../../evpub/cert.css";
import { LockedBox } from "./EvMore";
import { fmt, fmtTime, fmtWhen } from "./text";

const errOf = (e) => e?.response?.message || e?.message || "Error";
const DEF = { on: false, who: "checked_in", title: "Certificate of Attendance", body: "This is to certify that {name} attended {event} on {date}.", signer: "", signer_title: "", design: "classic" };
const csvCell = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
const site = () => window.location.origin;

// Certificates & attendance (ev_certs): who came, and a certificate for each of them
export function CertsTab({ ctx, firstEvent, EventPick }) {
  const { x, lang, api, data, readOnly, notify } = ctx;
  const c = x.certs;
  const [eid, setEid] = useState(() => firstEvent(ctx));
  const ev = data.events.find((e) => e._id === eid);
  const [f, setF] = useState(DEF);
  const [busy, setBusy] = useState("");
  const [att, setAtt] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [signing, setSigning] = useState(false);
  const [look, setLook] = useState("");
  const [style, setStyle] = useState("all");
  const owned = data.cert_themes?.owned || ["classic", "modern", "royal"];
  const has = (k) => isFreeCert(k) || owned.includes(k);
  useEffect(() => {
    setF({ ...DEF, ...(ev?.cert || {}) });
    setLook(ev?.cert?.design || "classic");
  }, [ev?._id, ev?.cert]); // eslint-disable-line react-hooks/exhaustive-deps
  const designs = useMemo(() => CERT_ALL.filter((k) => style === "all" || (style === "free" ? isFreeCert(k) : style === "mine" ? has(k) : k.startsWith(`${style}-`))), [style, owned]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (k) => {
    setLook(k);
    if (has(k)) setF((v) => ({ ...v, design: k }));
  };
  const saveSign = async (file) => !!(await run("sign", () => api.certSignature(ev._id, file)));
  const loadAtt = () => {
    if (!eid) return;
    setAtt(null);
    api
      .attendance(eid)
      .then((r) => setAtt(r.data))
      .catch((e) => notify({ type: "error", text: errOf(e) }));
  };
  useEffect(loadAtt, [eid]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (k, fn, ok) => {
    setBusy(k);
    try {
      const r = await fn();
      await ctx.reload();
      notify({ type: "success", text: ok ? ok(r) : x.saved });
      return r;
    } catch (e) {
      notify({ type: "error", text: errOf(e) });
      return null;
    } finally {
      setBusy("");
    }
  };
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (att?.rows || []).filter((r) => (filter === "all" || (filter === "in" ? r.status === "used" : r.status !== "used")) && (!s || [r.holder, r.code, r.order_no, r.phone, r.type_name].some((v) => String(v || "").toLowerCase().includes(s))));
  }, [att, filter, q]);
  const csv = () => {
    const head = ["Name", "Ticket", "Type", "Seat", "Order", "Phone", "Checked in", "Time", "By", "Certificate"];
    const lines = (att?.rows || []).map((r) => [r.holder, r.code, r.type_name, r.seat_label, r.order_no, r.phone, r.status === "used" ? "yes" : "no", r.used_at ? `${fmtWhen(r.used_at, "en")} ${fmtTime(r.used_at, "en")}` : "", r.used_by, f.on && (f.who === "all" || r.status === "used") ? `${site()}/ev/c/${r.code}` : ""].map(csvCell).join(","));
    const blob = new Blob(["﻿" + [head.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${ev?.slug || "event"}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const dirty = JSON.stringify({ ...DEF, ...(ev?.cert || {}) }) !== JSON.stringify(f);
  const shown = { ...f, design: look || f.design };
  const sample = att?.rows?.find((r) => r.status === "used") || att?.rows?.[0];
  const pct = att?.total ? Math.round((att.used / att.total) * 100) : 0;
  const tg = (att?.rows || []).filter((r) => r.tg).length;
  return (
    <div className="rs-col">
      <div className="ev-head">
        <span className="ev-head-ic">
          <Award size={20} />
        </span>
        <div>
          <h3>{c.title}</h3>
          <small className="rs-muted">{c.sub}</small>
        </div>
        <div className="ev-upd-for" style={{ marginLeft: "auto", minWidth: 260 }}>
          <EventPick ctx={ctx} value={eid} onChange={setEid} />
        </div>
      </div>
      {!ev ? (
        <div className="panel-card ev-empty">
          <Award size={30} />
          <p>{c.noEvent}</p>
        </div>
      ) : (
        <>
          {/* ---------- attendance ---------- */}
          <section className="panel-card" data-testid="ev-att">
            <div className="ev-att-stats">
              <div>
                <small>{c.guests}</small>
                <b>{att ? att.total : "…"}</b>
              </div>
              <div className="ok">
                <small>{c.came}</small>
                <b>{att ? att.used : "…"}</b>
              </div>
              <div className="warn">
                <small>{c.notCame}</small>
                <b>{att ? att.total - att.used : "…"}</b>
              </div>
              <div>
                <small>{c.rate}</small>
                <b>{pct}%</b>
                <span className="ev-att-bar">
                  <i style={{ width: `${pct}%` }} />
                </span>
              </div>
            </div>
            <div className="ev-att-tools">
              <div className="ev-seg" role="tablist">
                {["all", "in", "out"].map((k) => (
                  <button key={k} type="button" className={filter === k ? "on" : ""} onClick={() => setFilter(k)} data-testid={`ev-att-${k}`}>
                    {c.f[k]}
                  </button>
                ))}
              </div>
              <label className="ev-search">
                <Search size={15} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.search} />
              </label>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={csv} disabled={!att?.rows?.length}>
                <Download size={14} /> CSV
              </button>
            </div>
            {!att ? (
              <div className="ev-empty">
                <Loader2 size={22} className="md-spin" />
              </div>
            ) : !rows.length ? (
              <p className="rs-muted center">{c.empty}</p>
            ) : (
              <div className="ev-att-list">
                {rows.slice(0, 300).map((r) => (
                  <div key={r._id} className={`ev-att-row ${r.status === "used" ? "in" : ""}`}>
                    {r.status === "used" ? <UserCheck size={17} /> : <UserX size={17} />}
                    <div>
                      <b>{r.holder || c.noName}</b>
                      <small className="rs-muted">
                        {r.type_name} · #{r.order_no}
                        {r.seat_label ? ` · ${r.seat_label}` : ""}
                        {r.phone ? ` · ${r.phone}` : ""}
                      </small>
                    </div>
                    <small className="ev-att-when">{r.status === "used" ? `${fmtTime(r.used_at, lang)}${r.used_by ? ` · ${r.used_by}` : ""}` : c.notYet}</small>
                    {f.on && ev.cert?.on && (f.who === "all" || r.status === "used") && (
                      <a className="md-btn md-btn-ghost sa-btn-sm" href={`/ev/c/${r.code}`} target="_blank" rel="noreferrer" title={c.open}>
                        <Award size={14} />
                      </a>
                    )}
                  </div>
                ))}
                {rows.length > 300 && <p className="rs-muted center">{c.more.replace("{n}", rows.length - 300)}</p>}
              </div>
            )}
          </section>

          {/* ---------- certificates ---------- */}
          <LockedBox ctx={ctx} addon="ev_certs">
            <div className="ev-cert-grid">
              <section className="panel-card md-fields" data-testid="ev-cert-form">
                <div className="ev-pm-top">
                  <b>{c.certs}</b>
                  <label className="md-switch" style={{ marginLeft: "auto" }}>
                    <input type="checkbox" checked={f.on} onChange={(e) => setF({ ...f, on: e.target.checked })} disabled={readOnly} data-testid="ev-cert-on" />
                    <span className="md-switch-track" />
                  </label>
                </div>
                <div className="ev-seg" role="tablist">
                  {["checked_in", "all"].map((k) => (
                    <button key={k} type="button" className={f.who === k ? "on" : ""} onClick={() => setF({ ...f, who: k })} disabled={readOnly}>
                      {c.who[k]}
                    </button>
                  ))}
                </div>
                <label className="md-field">
                  <span>{c.ctitle}</span>
                  <input value={f.title} maxLength={80} onChange={(e) => setF({ ...f, title: e.target.value })} disabled={readOnly} />
                </label>
                <label className="md-field">
                  <span>{c.body}</span>
                  <textarea className="ev-input" rows={3} value={f.body} maxLength={400} onChange={(e) => setF({ ...f, body: e.target.value })} disabled={readOnly} />
                  <small className="rs-muted">{c.bodyHint}</small>
                </label>
                <div className="ev-two">
                  <label className="md-field">
                    <span>{c.signer}</span>
                    <input value={f.signer} maxLength={60} onChange={(e) => setF({ ...f, signer: e.target.value })} disabled={readOnly} />
                  </label>
                  <label className="md-field">
                    <span>{c.signerTitle}</span>
                    <input value={f.signer_title} maxLength={60} placeholder="Director" onChange={(e) => setF({ ...f, signer_title: e.target.value })} disabled={readOnly} />
                  </label>
                </div>
                <div className="ev-sig-box" data-testid="ev-sig">
                  {ev.cert?.signature ? <img src={ev.cert.signature} alt="" /> : <PenLine size={20} />}
                  <span>{ev.cert?.signature ? c.signHas : c.signNone}</span>
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setSigning(true)} disabled={readOnly || !!busy} data-testid="ev-sig-open">
                    <PenLine size={14} /> {ev.cert?.signature ? c.signChange : c.signAdd}
                  </button>
                  {ev.cert?.signature && (
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={() => run("unsign", () => api.removeCertSignature(ev._id))} disabled={readOnly || !!busy} aria-label={x.remove}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <small className="rs-muted">
                  {c.design}: <b>{certName(f.design, lang)}</b>
                </small>
                <div className="ev-btn-row">
                  <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => run("save", () => api.saveEvent(ev._id, { cert: f }))} disabled={readOnly || !dirty || !!busy} data-testid="ev-cert-save">
                    {busy === "save" ? <Loader2 size={14} className="md-spin" /> : <Save size={14} />} {x.save}
                  </button>
                  {ev.cert?.on && (
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => window.confirm(c.sendSure.replace("{n}", tg)) && run("send", () => api.sendCerts(ev._id), (r) => c.sent.replace("{n}", r.sent ?? 0))} disabled={readOnly || !!busy || dirty} data-testid="ev-cert-send">
                      {busy === "send" ? <Loader2 size={14} className="md-spin" /> : <Send size={14} />} {c.send}
                    </button>
                  )}
                </div>
                <small className="rs-muted">
                  {ev.cert?.on ? <CheckCircle2 size={12} /> : null} {c.auto}
                </small>
              </section>
              <section className="panel-card ev-cert-prev">
                <b>
                  {x.design?.preview || "Preview"} · {certName(shown.design, lang)}
                </b>
                <CertView cert={{ ...shown, signature: ev.cert?.signature || "" }} name={sample?.holder || c.sampleName} event={ev} org={data.org} code={sample?.code || "AB12CD34"} verifyUrl={`${site()}/ev/c/${sample?.code || "AB12CD34"}`} />
                {has(look) ? (
                  look === f.design ? (
                    <div className="ev-th-inuse">
                      <CheckCircle2 size={16} /> {dirty && look !== ev.cert?.design ? c.pickedSave : c.inUse}
                    </div>
                  ) : null
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ theme: look, event: ev._id, kind: "cert" })} disabled={readOnly} data-testid="ev-cert-buy">
                    <CoinIcon size={15} /> {c.buyDesign.replace("{coins}", fmt(data.cert_themes?.price))}
                  </button>
                )}
                {sample && ev.cert?.on && (
                  <a className="md-btn md-btn-ghost sa-btn-sm" href={`/ev/c/${sample.code}`} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} /> {c.open}
                  </a>
                )}
              </section>
            </div>
            <section className="panel-card ev-cg" data-testid="ev-cert-gallery">
              <div className="ev-cg-head">
                <b>{c.gallery.replace("{n}", CERT_ALL.length)}</b>
                <small className="rs-muted">{c.gallerySub.replace("{coins}", fmt(data.cert_themes?.price))}</small>
              </div>
              <div className="ev-cg-chips">
                {[["all", c.all], ["free", c.free], ["mine", c.mine], ...CERT_LAYOUTS.map((l) => [l.key, l[lang === "km" ? "km" : "en"]])].map(([k, label]) => (
                  <button key={k} type="button" className={style === k ? "on" : ""} onClick={() => setStyle(k)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="ev-cg-grid">
                {designs.map((k) => (
                  <button key={k} type="button" className={`ev-cg-item ${look === k ? "on" : ""}`} onClick={() => choose(k)} data-testid="ev-cg-item">
                    <CertView thumb cert={{ ...f, design: k, signature: ev.cert?.signature || "" }} name={sample?.holder || c.sampleName} event={ev} org={data.org} code="AB12CD34" />
                    <span>
                      <b>{certName(k, lang)}</b>
                      {f.design === k ? (
                        <small className="own">
                          <Check size={11} />
                        </small>
                      ) : has(k) ? (
                        <small className="own">{isFreeCert(k) ? c.free : c.owned}</small>
                      ) : (
                        <small>
                          <Lock size={10} /> <CoinIcon size={10} /> {fmt(data.cert_themes?.price)}
                        </small>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            {signing && <SignDialog t={{ ...c, cancel: x.cancel || "Cancel" }} onClose={() => setSigning(false)} onSave={saveSign} />}
          </LockedBox>
        </>
      )}
    </div>
  );
}
export default CertsTab;
