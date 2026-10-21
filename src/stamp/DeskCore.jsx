import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Camera, Eraser, Gift, Loader2, Plus, RotateCcw, Search, UserPlus, UserRound, X } from "lucide-react";
import StampCard from "./StampCard";
import { ago, cardUrl, fmt, levelName, prettyPhone } from "../dashboard/client/stamp/text";

const canScan = typeof window !== "undefined" && "BarcodeDetector" in window;

// Camera QR scanner (Chrome / Android). Others type the card number or phone.
export function Scanner({ x, onCode, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(canScan ? "" : x.scanNoSupport);
  useEffect(() => {
    if (!canScan) return undefined;
    let stream;
    let stop = false;
    (async () => {
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const tick = async () => {
          if (stop) return;
          try {
            const value = (await detector.detect(videoRef.current))[0]?.rawValue;
            if (value) {
              onCode(value);
              return;
            }
          } catch {
            /* frame not ready */
          }
          setTimeout(tick, 200);
        };
        tick();
      } catch {
        setError(x.scanNoSupport);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode, x.scanNoSupport]);
  return (
    <div className="md-modal-backdrop" onMouseDown={onClose}>
      <div className="md-modal md-modal-sm sc-scan" role="dialog" aria-modal="true" aria-label={x.scanTitle} onMouseDown={(e) => e.stopPropagation()}>
        <div className="md-modal-header">
          <h3>{x.scanTitle}</h3>
          <button type="button" className="md-icon-btn" onClick={onClose} aria-label={x.close}>
            <X size={18} />
          </button>
        </div>
        <div className="md-modal-body">
          {error ? (
            <div className="md-form-error">{error}</div>
          ) : (
            <>
              <video ref={videoRef} className="sc-scan-video" playsInline muted />
              <p className="rs-muted">{x.scanHint}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// the customer's card QR, big, for them to scan with their own phone
export function CardQr({ x, member, onClose }) {
  const [src, setSrc] = useState("");
  const url = cardUrl(member.token);
  useEffect(() => {
    QRCode.toDataURL(url, { width: 520, margin: 1, errorCorrectionLevel: "M" }).then(setSrc);
  }, [url]);
  return (
    <div className="md-modal-backdrop" onMouseDown={onClose}>
      <div className="md-modal md-modal-sm" role="dialog" aria-modal="true" aria-label={x.showCard} onMouseDown={(e) => e.stopPropagation()}>
        <div className="md-modal-header">
          <h3>
            {member.name} · #{member.no}
          </h3>
          <button type="button" className="md-icon-btn" onClick={onClose} aria-label={x.close}>
            <X size={18} />
          </button>
        </div>
        <div className="md-modal-body sc-qr-box" data-testid="sc-card-qr">
          {src ? <img src={src} alt="" /> : <Loader2 size={24} className="md-spin" />}
          <p className="rs-muted">{x.showCardSub}</p>
          <code>{url}</code>
        </div>
      </div>
    </div>
  );
}

// Find a card (scan / card no. / phone), add stamps, give rewards, add a new customer.
// Used by the owner's "Stamp" tab and the staff desk page. api = { lookup, addMember, stamp(mid, n, force), reward(mid, at) }
// pick = a customer chosen outside (desk lists) → opened here · onMember(m | null) = the open customer changed
export default function DeskCore({ x, lang, shop, api, owner = false, maxPerVisit = 5, readOnly = false, notify, onChanged, onOpen, pick, onMember, canReset = false }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [found, setFound] = useState(null); // [] after a search
  const [m, setM] = useState(null);
  const [pop, setPop] = useState(-1);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [soon, setSoon] = useState(null); // { n, last }
  const [scan, setScan] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [qr, setQr] = useState(null);
  const [sure, setSure] = useState(false); // reset: tap once more to confirm
  useEffect(() => {
    if (!sure) return undefined;
    const t = setTimeout(() => setSure(false), 4000);
    return () => clearTimeout(t);
  }, [sure]);
  const input = useRef(null);
  useEffect(() => {
    if (!pick) return;
    setFound([pick]);
    setM(pick);
    setMsg(null);
    setPop(-1);
  }, [pick]);
  useEffect(() => {
    onMember?.(m);
  }, [m]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setM(null);
    setFound(null);
    setQ("");
    setMsg(null);
    setSoon(null);
    setPop(-1);
    setTimeout(() => input.current?.focus(), 50);
  };
  const search = useCallback(
    async (code) => {
      const value = String(code ?? "").trim();
      if (!value) return;
      setBusy("find");
      setMsg(null);
      setSoon(null);
      try {
        const r = await api.lookup(value);
        setFound(r.data);
        setM(r.data.length === 1 ? r.data[0] : null);
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      } finally {
        setBusy("");
      }
    },
    [api],
  );
  const stamp = async (n, force = false) => {
    if (!m) return;
    setBusy(`s${n}`);
    setMsg(null);
    setSoon(null);
    try {
      const r = await api.stamp(m._id, n, force);
      const after = r.data.member;
      setPop(Math.min(after.stamps, shop.goal) - 1);
      setM({ ...m, ...after });
      const top = (shop.levels || []).filter((l) => after.ready.includes(l.at)).pop();
      setMsg({ ok: true, text: top ? x.rewardReady.replace("{name}", levelName(top, lang)) : r.data.full && !r.data.added ? x.cardFull : x.stampedOk.replace("{n}", r.data.added).replace("{now}", after.stamps).replace("{goal}", shop.goal) });
      onChanged?.();
    } catch (e) {
      if (e.body?.code === "too_soon") setSoon({ n, last: e.body.last_stamp_at, gap: e.body.gap });
      else setMsg({ ok: false, text: e.message });
    } finally {
      setBusy("");
    }
  };
  const reward = async (at) => {
    setBusy(`r${at}`);
    setMsg(null);
    try {
      const r = await api.reward(m._id, at);
      setM({ ...m, ...r.data.member });
      setPop(-1);
      setMsg({ ok: true, text: `🎁 ${x.rewardOk.replace("{name}", levelName(r.data.reward, lang))}` });
      onChanged?.();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy("");
    }
  };
  const resetCard = async () => {
    if (!sure) return setSure(true);
    setSure(false);
    setBusy("reset");
    setMsg(null);
    try {
      const r = await api.reset(m._id);
      setM({ ...m, ...r.data.member });
      setPop(-1);
      setMsg({ ok: true, text: x.resetDone });
      onChanged?.();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy("");
    }
  };
  const addNew = async (e) => {
    e.preventDefault();
    setBusy("add");
    try {
      const r = await api.addMember({ name: form.name, phone: form.phone });
      setAdding(false);
      setForm({ name: "", phone: "" });
      setFound([r.data]);
      setM(r.data);
      setQr(r.data);
      notify?.({ type: "success", text: x.added });
      onChanged?.();
    } catch (err) {
      notify?.({ type: "error", text: err.message });
      if (err.body?.code === "phone_taken") {
        setAdding(false);
        search(form.phone);
      }
    } finally {
      setBusy("");
    }
  };

  const levels = shop.levels || [];
  const ready = m ? levels.filter((l) => (m.ready || []).includes(l.at)) : [];
  const steps = [2, 3, 5].filter((n) => n <= maxPerVisit || owner);

  return (
    <div className="sc-desk" data-testid="sc-desk">
      <form
        className="sc-find"
        onSubmit={(e) => {
          e.preventDefault();
          search(q);
        }}
      >
        <label className="md-search sc-find-input">
          <Search size={17} />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={x.find} inputMode="search" aria-label={x.find} data-testid="sc-find" autoFocus />
        </label>
        <button type="submit" className="md-btn md-btn-ghost" disabled={!q.trim() || busy === "find"}>
          {busy === "find" ? <Loader2 size={16} className="md-spin" /> : <Search size={16} />} <span className="sc-hide-sm">{x.findBtn}</span>
        </button>
        <button type="button" className="md-btn md-btn-primary" onClick={() => setScan(true)} data-testid="sc-scan">
          <Camera size={16} /> {x.scan}
        </button>
        <button type="button" className="md-btn md-btn-ghost" onClick={() => setAdding(true)} disabled={readOnly} data-testid="sc-add-new">
          <UserPlus size={16} /> <span className="sc-hide-sm">{x.addNew}</span>
        </button>
      </form>

      {found && !found.length && <p className="sc-desk-none rs-muted">{x.noMatch}</p>}
      {found && found.length > 1 && !m && (
        <div className="panel-card sc-pick">
          <b>{x.pickOne}</b>
          {found.map((r) => (
            <button key={r._id} type="button" className="sc-pick-row" onClick={() => setM(r)}>
              <UserRound size={16} />
              <span>
                <b>{r.name}</b> <small>#{r.no}</small>
                <small className="rs-muted">{prettyPhone(r.phone)}</small>
              </span>
              <em>
                {r.stamps}/{shop.goal}
              </em>
            </button>
          ))}
        </div>
      )}

      {m && (
        <div className="sc-member" data-testid="sc-member">
          <StampCard shop={shop} member={m} lang={lang} pop={pop} />
          <div className="sc-member-side">
            <div className="sc-member-info">
              <b>{m.name}</b>
              <small>
                {x.cardNo.replace("{n}", m.no)}
                {m.phone ? ` · ${prettyPhone(m.phone)}` : ""}
              </small>
              <small className="rs-muted">{m.last_visit_at ? x.lastVisit.replace("{ago}", ago(m.last_visit_at, x)) : x.neverVisit}</small>
            </div>
            {msg && (
              <div className={`sc-msg ${msg.ok ? "ok" : "bad"}`} role="status" data-testid="sc-msg">
                {msg.text}
              </div>
            )}
            {soon && (
              <div className="sc-msg warn" role="status">
                {owner
                  ? x.tooSoonAsk.replace("{ago}", ago(soon.last, x))
                  : x.tooSoonStaff.replace("{ago}", ago(soon.last, x)).replace("{n}", Math.max(1, Math.ceil((soon.gap || 30) - (Date.now() - new Date(soon.last).getTime()) / 60000)))}
                {owner && (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => stamp(soon.n, true)}>
                    {x.addAnyway}
                  </button>
                )}
              </div>
            )}
            {ready.map((l) => (
              <button key={l.at} type="button" className="md-btn sc-reward-btn" onClick={() => reward(l.at)} disabled={!!busy || readOnly} data-testid={`sc-reward-${l.at}`}>
                {busy === `r${l.at}` ? <Loader2 size={18} className="md-spin" /> : <Gift size={18} />} {x.giveReward.replace("{name}", levelName(l, lang))}
              </button>
            ))}
            <button type="button" className="md-btn md-btn-primary sc-big" onClick={() => stamp(1)} disabled={!!busy || readOnly} data-testid="sc-plus1">
              {busy === "s1" ? <Loader2 size={20} className="md-spin" /> : <Plus size={22} />} {x.addStamp}
            </button>
            <div className="sc-steps">
              {steps.map((n) => (
                <button key={n} type="button" className="md-btn md-btn-ghost" onClick={() => stamp(n)} disabled={!!busy || readOnly}>
                  {busy === `s${n}` ? <Loader2 size={14} className="md-spin" /> : null} {x.addN.replace("{n}", n)}
                </button>
              ))}
            </div>
            <div className="sc-member-links">
              {m.token && (
                <button type="button" className="sa-link" onClick={() => setQr(m)}>
                  {x.showCard}
                </button>
              )}
              {owner && onOpen && (
                <button type="button" className="sa-link" onClick={() => onOpen(m)}>
                  {x.seeCustomer}
                </button>
              )}
              {canReset && api.reset && (m.stamps > 0 || (m.claimed || []).length > 0) && (
                <button type="button" className={`sa-link sc-reset ${sure ? "sure" : ""}`} onClick={resetCard} disabled={!!busy || readOnly} data-testid="sc-reset">
                  {busy === "reset" ? <Loader2 size={13} className="md-spin" /> : <Eraser size={13} />} {sure ? x.resetSure : x.resetCard}
                </button>
              )}
              <button type="button" className="sa-link" onClick={reset} data-testid="sc-next">
                <RotateCcw size={13} /> {x.newSearch}
              </button>
            </div>
            <small className="rs-muted">
              {fmt(m.total_stamps)} {x.totalStamps.toLowerCase()} · {fmt(m.rewards)} {x.rewardsGot.toLowerCase()}
            </small>
          </div>
        </div>
      )}

      {scan && (
        <Scanner
          x={x}
          onClose={() => setScan(false)}
          onCode={(v) => {
            setScan(false);
            setQ("");
            search(v);
          }}
        />
      )}
      {qr && <CardQr x={x} member={qr} onClose={() => setQr(null)} />}
      {adding && (
        <div className="md-modal-backdrop" onMouseDown={() => setAdding(false)}>
          <form className="md-modal md-modal-sm" onSubmit={addNew} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={x.addNew}>
            <div className="md-modal-header">
              <h3>{x.addNew}</h3>
              <button type="button" className="md-icon-btn" onClick={() => setAdding(false)} aria-label={x.close}>
                <X size={18} />
              </button>
            </div>
            <div className="md-modal-body md-fields">
              <div className="md-field">
                <label htmlFor="sc-new-name">{x.name}</label>
                <input id="sc-new-name" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
              </div>
              <div className="md-field">
                <label htmlFor="sc-new-phone">{x.phone}</label>
                <input id="sc-new-phone" value={form.phone} inputMode="tel" maxLength={20} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="012 345 678" />
              </div>
            </div>
            <div className="md-modal-footer">
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setAdding(false)}>
                {x.cancel}
              </button>
              <button type="submit" className="md-btn md-btn-primary" disabled={!form.name.trim() || busy === "add"} data-testid="sc-new-save">
                {busy === "add" ? <Loader2 size={15} className="md-spin" /> : <UserPlus size={15} />} {x.add}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
