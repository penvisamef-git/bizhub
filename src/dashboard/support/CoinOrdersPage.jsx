import "../admin/master_data/masterdata.css";
import { OrderCardsSkeleton, SettingsSkeleton } from "../../components/skeleton/Skeleton";
import "../super_admin/super-admin.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BellRing, CheckCircle2, Image as ImageIcon, Link2, Loader2, MessageCircle, Plus, ReceiptText, Save, Search, Send, Trash2, Unplug, Users, X, XCircle } from "lucide-react";
import QRCode from "qrcode";
import { readKhqr } from "../../lib/readKhqr";
import { platformAdminService } from "../../api/services";
import { Modal, useNotice } from "../super_admin/parts";
import CoinIcon from "../../components/CoinIcon";
import { coinsChanged } from "../../lib/events";
import { fmt, fmtWhen, usd, useSpText } from "./text";
import "./support.css";
import "../client/licenses/coinshop.css";

const STATUSES = ["pending", "approved", "rejected", "cancelled", "all"];

// Super admin: coin orders (bank transfer + screenshot) → approve / reject; bank QR codes, hotline, packages; Telegram alerts
export default function CoinOrdersPage() {
  const { x } = useSpText();
  const [params, setParams] = useSearchParams();
  const tab = ["setup", "telegram"].includes(params.get("tab")) ? params.get("tab") : "orders";
  const [notice, setNotice] = useNotice();
  return (
    <div className="md-page sa-page">
      {notice}
      <section className="panel-card ch-head">
        <span className="ch-head-ic">
          <ReceiptText size={24} />
        </span>
        <div>
          <h2>{x.orders}</h2>
          <small className="rs-muted">{x.ordersSub}</small>
        </div>
      </section>
      <div className="lc-tabs co-tabs">
        {[
          ["orders", x.orders],
          ["setup", x.setup],
          ["telegram", x.tgTab],
        ].map(([k, label]) => (
          <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setParams(k === "orders" ? {} : { tab: k }, { replace: true })} data-testid={`co-tab-${k}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "orders" ? <Orders notify={setNotice} initial={params.get("status")} /> : tab === "setup" ? <Setup notify={setNotice} /> : <Telegram notify={setNotice} />}
    </div>
  );
}

function Orders({ notify, initial }) {
  const { x, lang } = useSpText();
  const navigate = useNavigate();
  const [status, setStatus] = useState(STATUSES.includes(initial) ? initial : "pending");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [proof, setProof] = useState("");
  const [rejecting, setRejecting] = useState(null);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const load = useCallback(
    () =>
      platformAdminService
        .orders({ status, q: query })
        .then((r) => setData(r))
        .catch((e) => notify({ type: "error", text: e.message })),
    [status, query], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load]);
  const approve = async (o) => {
    setBusy(o._id);
    try {
      await platformAdminService.approve(o._id);
      notify({ type: "success", text: x.approvedOk.replace("{coins}", fmt(o.total_coins)) });
      coinsChanged();
      window.dispatchEvent(new Event("bizhub-badges"));
      load();
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const counts = data?.counts || {};
  return (
    <>
      <section className="panel-card">
        <div className="co-bar">
          <div className="lc-kind">
            {STATUSES.map((k) => (
              <button key={k} type="button" className={status === k ? "on" : ""} onClick={() => setStatus(k)}>
                {k === "all" ? x.all : x.status[k]} {k !== "all" && <small>{counts[k]?.n || 0}</small>}
              </button>
            ))}
          </div>
          <label className="ib-search">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={x.search} />
          </label>
        </div>
        {counts.pending?.n > 0 && <p className="co-sum">{x.waitingSum.replace("{n}", counts.pending.n).replace("{usd}", usd(counts.pending.usd))}</p>}
        {!data ? (
          <OrderCardsSkeleton />
        ) : !data.data.length ? (
          <p className="rs-muted">{x.noOrders}</p>
        ) : (
          <div className="co-list">
            {data.data.map((o) => (
              <article key={o._id} className={`co-card s-${o.status}`} data-testid="co-card">
                <button type="button" className="co-proof" onClick={() => setProof(o.proof)} aria-label={x.proof}>
                  {o.proof ? <img src={o.proof} alt="" /> : <ImageIcon size={22} />}
                </button>
                <div className="co-main">
                  <div className="co-top">
                    <b>{o.no}</b>
                    <span className={`co-st s-${o.status}`}>{x.status[o.status]}</span>
                    <small className="rs-muted">{fmtWhen(o.created_date, lang)}</small>
                  </div>
                  <b className="co-who">{o.customer_id?.name || "—"}</b>
                  <small className="rs-muted">{[o.customer_id?.email, o.customer_id?.phone].filter(Boolean).join(" · ")}</small>
                  <div className="co-items">
                    {o.items.map((i) => (
                      <span key={i.key}>
                        {i.qty} × {fmt(i.coins)}
                        {i.bonus_pct ? ` +${i.bonus_pct}%` : ""}
                      </span>
                    ))}
                  </div>
                  <small>
                    {o.bank?.name}
                    {o.reference ? ` · ${x.ref} ${o.reference}` : ""}
                    {o.note ? ` · “${o.note}”` : ""}
                  </small>
                  {o.status === "rejected" && <small className="cs-red">{o.reason}</small>}
                  {o.done_by && (
                    <small className="rs-muted">
                      {[o.done_by.firstname, o.done_by.lastname].filter(Boolean).join(" ") || o.done_by.email} · {fmtWhen(o.done_at, lang)}
                    </small>
                  )}
                </div>
                <div className="co-side">
                  <b className="co-usd">{usd(o.usd)}</b>
                  <span className="co-coins">
                    <CoinIcon size={16} /> {fmt(o.total_coins)}
                  </span>
                  {o.bonus > 0 && <small className="cs-green">+{fmt(o.bonus)}</small>}
                  {o.status === "pending" && (
                    <>
                      <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => approve(o)} disabled={!!busy} data-testid="co-approve">
                        {busy === o._id ? <Loader2 size={14} className="md-spin" /> : <CheckCircle2 size={14} />} {x.approve}
                      </button>
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={() => setRejecting(o)} disabled={!!busy}>
                        <XCircle size={14} /> {x.reject}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="md-btn md-btn-ghost sa-btn-sm"
                    onClick={() =>
                      platformAdminService
                        .startChat(o.customer_id?._id)
                        .then((r) => navigate(`/app/super-admin/inbox?t=${r.data._id}`))
                        .catch((e) => notify({ type: "error", text: e.message }))
                    }
                  >
                    <MessageCircle size={14} /> {x.chat}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {proof && (
        <div className="co-viewer" onClick={() => setProof("")} role="dialog" aria-label={x.proof}>
          <img src={proof} alt="" />
          <button type="button" aria-label="×">
            <X size={20} />
          </button>
        </div>
      )}
      {rejecting && (
        <RejectModal
          x={x}
          o={rejecting}
          onClose={() => setRejecting(null)}
          onDone={() => {
            setRejecting(null);
            notify({ type: "success", text: x.rejectedOk });
            window.dispatchEvent(new Event("bizhub-badges"));
            load();
          }}
        />
      )}
    </>
  );
}

function RejectModal({ x, o, onClose, onDone }) {
  const [reason, setReason] = useState(x.rejectReasons[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={`${x.reject} · ${o.no}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose}>
            {x.cancel}
          </button>
          <button
            type="button"
            className="md-btn md-btn-danger"
            disabled={busy || !reason.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await platformAdminService.reject(o._id, reason.trim());
                onDone();
              } catch (e) {
                setError(e.message);
                setBusy(false);
              }
            }}
          >
            {x.reject}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <div className="lc-kind">
          {x.rejectReasons.map((r) => (
            <button key={r} type="button" className={reason === r ? "on" : ""} onClick={() => setReason(r)}>
              {r}
            </button>
          ))}
        </div>
        <label className="md-field">
          <span>{x.rejectWhy}</span>
          <input maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

function Setup({ notify }) {
  const { x } = useSpText();
  const [data, setData] = useState(null);
  const [hot, setHot] = useState(null);
  const [packs, setPacks] = useState(null);
  const [bank, setBank] = useState(null);
  const [saving, setSaving] = useState(""); // "hot" | "packs" while saving
  const [qrBank, setQrBank] = useState(""); // packages: whose QR pictures are shown
  const [packQr, setPackQr] = useState(null); // { usd } — the QR window of one package
  const load = useCallback(
    () =>
      platformAdminService
        .get()
        .then((r) => {
          setData(r.data);
          setHot({ ...r.data.hotline });
          setPacks(r.data.packages.map((p) => ({ ...p })));
        })
        .catch((e) => notify({ type: "error", text: e.message })),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load]);
  if (!data) return <SettingsSkeleton panels={3} />;
  const qb = data.banks.find((v) => v.key === qrBank) || data.banks[0];
  const qrOf = (usd) => qb?.amount_qrs?.find((q) => Math.round(q.usd * 100) === Math.round(Number(usd) * 100));
  const save = async (which, body) => {
    if (saving) return;
    setSaving(which);
    try {
      await platformAdminService.save(body);
      notify({ type: "success", text: x.saved });
      await load();
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setSaving("");
    }
  };
  return (
    <>
      <section className="panel-card">
        <div className="co-bar">
          <div>
            <h3 style={{ margin: 0 }}>{x.banks}</h3>
            <small className="rs-muted">{x.banksSub}</small>
          </div>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setBank({})} data-testid="co-add-bank">
            <Plus size={15} /> {x.addBank}
          </button>
        </div>
        <div className="co-banks">
          {data.banks.map((b) => (
            <button key={b.key} type="button" className={`co-bank ${b.active ? "" : "off"}`} onClick={() => setBank(b)}>
              {b.qr ? <img src={b.qr} alt="" /> : <ImageIcon size={30} />}
              <b>{b.name}</b>
              <small className="rs-muted">
                {b.account_name}
                {b.account_no ? ` · ${b.account_no}` : ""}
              </small>
              {b.amount_qrs?.length > 0 && <em className="co-bank-amts">{b.amount_qrs.map((q) => `$${q.usd}`).join(" · ")}</em>}
            </button>
          ))}
        </div>
        <small className="rs-muted">{x.visaSoon}</small>
      </section>
      <div className="xs-two-co">
        <section className="panel-card">
          <h3 style={{ marginTop: 0 }}>{x.hotline}</h3>
          <div className="md-fields">
            {[
              ["phone", x.phone, 40],
              ["telegram", x.telegram, 80],
              ["email", x.email, 120],
              ["hours", x.hours, 120],
              ["note", x.hotNote, 300],
            ].map(([k, label, max]) => (
              <label key={k} className="md-field">
                <span>{label}</span>
                <input maxLength={max} value={hot[k] || ""} onChange={(e) => setHot({ ...hot, [k]: e.target.value })} placeholder={k === "telegram" ? "@bizhub_support" : k === "hours" ? "Mon–Sat 8:00–20:00" : ""} />
              </label>
            ))}
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => save("hot", { hotline: hot })} disabled={!!saving} data-testid="co-save-hot">
              {saving === "hot" ? <Loader2 size={14} className="md-spin" /> : <Save size={14} />} {x.save}
            </button>
          </div>
        </section>
        <section className="panel-card">
          <h3 style={{ marginTop: 0 }}>{x.packages}</h3>
          <small className="rs-muted">{x.packagesSub}</small>
          <div className="co-packs">
            {data.banks.length > 1 && (
              <label className="co-qrbank">
                <span>{x.qrFor}</span>
                <select value={qb?.key || ""} onChange={(e) => setQrBank(e.target.value)}>
                  {data.banks.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="co-pack head">
              <span>{x.pCoins}</span>
              <span>{x.pUsd}</span>
              <span>{x.pBonus}</span>
              <span>QR</span>
              <span />
            </div>
            {packs.map((p, i) => (
              <div key={i} className="co-pack">
                <input type="number" min="1" value={p.coins} onChange={(e) => setPacks(packs.map((v, k) => (k === i ? { ...v, coins: e.target.value } : v)))} aria-label={x.pCoins} />
                <input type="number" min="0" step="0.01" value={p.usd} onChange={(e) => setPacks(packs.map((v, k) => (k === i ? { ...v, usd: e.target.value } : v)))} aria-label={x.pUsd} />
                <input type="number" min="0" max="100" value={p.bonus_pct} onChange={(e) => setPacks(packs.map((v, k) => (k === i ? { ...v, bonus_pct: e.target.value } : v)))} aria-label={x.pBonus} />
                {(() => {
                  const q = qrOf(p.usd);
                  return (
                    <button
                      type="button"
                      className={`co-pack-qr ${q ? "has" : ""}`}
                      onClick={() => (qb ? setPackQr({ usd: Number(p.usd) }) : notify({ type: "error", text: x.qrNeedBank }))}
                      disabled={!(Number(p.usd) > 0)}
                      title={q ? x.qrChange : x.qrAdd}
                      aria-label={q ? x.qrChange : x.qrAdd}
                      data-testid="co-pack-qr"
                    >
                      {q ? <img src={q.qr} alt="" /> : <Plus size={15} />}
                      {q?.link && (
                        <i>
                          <Link2 size={10} />
                        </i>
                      )}
                    </button>
                  );
                })()}
                <button type="button" className="md-icon-btn" onClick={() => setPacks(packs.filter((_, k) => k !== i))} aria-label={x.remove}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="co-save">
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setPacks([...packs, { coins: 100, usd: 10, bonus_pct: 0 }])} disabled={packs.length >= 12}>
              <Plus size={14} /> {x.addPackage}
            </button>
            <button
              type="button"
              className="md-btn md-btn-primary sa-btn-sm"
              onClick={() => save("packs", { packages: packs.map((p) => ({ key: p.key, coins: Number(p.coins), usd: Number(p.usd), bonus_pct: Number(p.bonus_pct) || 0, active: true })) })}
              disabled={!!saving}
              data-testid="co-save-packs"
            >
              {saving === "packs" ? <Loader2 size={14} className="md-spin" /> : <Save size={14} />} {x.save}
            </button>
          </div>
        </section>
      </div>
      {bank && <BankModal x={x} bank={bank} onClose={() => setBank(null)} onSaved={load} notify={notify} />}
      {packQr && qb && <PackQrModal x={x} bank={qb} usd={packQr.usd} cur={qrOf(packQr.usd)} onClose={() => setPackQr(null)} onSaved={load} notify={notify} />}
    </>
  );
}

// the QR picture + pay link of one coin package (stored as the bank's "QR with the amount" for that price)
function PackQrModal({ x, bank, usd, cur, onClose, onSaved, notify }) {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState(cur?.qr || "");
  const [link, setLink] = useState(cur?.link || "");
  const [warn, setWarn] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const pick = useRef(null);
  const money = `$${usd.toLocaleString("en-US")}`;
  const choose = async (f) => {
    setFile(f);
    setUrl(URL.createObjectURL(f));
    setWarn("");
    try {
      const r = await readKhqr(f);
      if (r.currency === "KHR") setWarn(x.amtRiel);
      else if (r.amount && Math.round(r.amount * 100) !== Math.round(usd * 100)) setWarn(x.qrOther.replace("{qr}", `$${r.amount}`).replace("{amt}", money));
      else if (!r.found) setWarn(x.qrUnread);
    } catch {
      /* the picture is still used */
    }
  };
  const go = async (which, fn) => {
    setBusy(which);
    setError("");
    try {
      await fn();
      notify({ type: "success", text: x.saved });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy("");
    }
  };
  return (
    <Modal
      title={x.qrTitle.replace("{amt}", money)}
      onClose={onClose}
      busy={!!busy}
      footer={
        <>
          {cur && (
            <button type="button" className="md-btn md-btn-ghost sa-danger-text" style={{ marginRight: "auto" }} onClick={() => window.confirm(x.sure) && go("remove", () => platformAdminService.removeAmountQr(bank.key, usd))} disabled={!!busy}>
              {busy === "remove" ? <Loader2 size={14} className="md-spin" /> : <Trash2 size={14} />} {x.remove}
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={!!busy}>
            {x.cancel}
          </button>
          <button
            type="button"
            className="md-btn md-btn-primary"
            disabled={!!busy || (!file && !cur) || (!file && (link || "") === (cur?.link || ""))}
            onClick={() => go("save", () => (file ? platformAdminService.addAmountQr(bank.key, usd, file, link) : platformAdminService.setAmountQrLink(bank.key, usd, link)))}
            data-testid="co-packqr-save"
          >
            {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Save size={15} />} {x.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <small className="rs-muted">{x.qrSub.replace("{amt}", money).replace("{bank}", bank.name)}</small>
        <button type="button" className={`co-packqr-pic ${url ? "has" : ""}`} onClick={() => pick.current?.click()} data-testid="co-packqr-pick">
          {url ? <img src={url} alt="" /> : <ImageIcon size={28} />}
          <span>{url ? x.qrReplace : x.qrPickOne}</span>
        </button>
        <input
          ref={pick}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          data-testid="co-packqr-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) choose(f);
          }}
        />
        {warn && <div className="co-amt-warn co-packqr-warn">{warn}</div>}
        <label className="md-field">
          <span>{x.payLink}</span>
          <input value={link} onChange={(e) => setLink(linkOf(e.target.value))} placeholder="https://link.payway.com.kh/…" data-testid="co-packqr-link" />
          <small className="rs-muted">{x.payLinkSub}</small>
        </label>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

// paste the whole ABA message ("Hi, … tapping the ABA PayWay link below: 🔗 https://…") → only the link is kept
const linkOf = (v) => {
  const m = String(v).match(/https:\/\/\S+/);
  return m ? m[0].replace(/[),.]+$/, "") : String(v);
};

function BankModal({ x, bank, onClose, onSaved, notify }) {
  const isNew = !bank.key;
  const [f, setF] = useState({ name: bank.name || "", account_name: bank.account_name || "", account_no: bank.account_no || "", note: bank.note || "", link: bank.link || "", active: bank.active !== false });
  const [qr, setQr] = useState(null);
  const [qrUrl, setQrUrl] = useState(bank.qr || "");
  const [busy, setBusy] = useState(""); // "save" | "remove"
  const [error, setError] = useState("");
  const pick = useRef(null);
  // QR pictures with the amount in them: saved ones + new ones picked now (amount read from the QR)
  const [amts, setAmts] = useState(() => (bank.amount_qrs || []).map((a) => ({ id: `s${a.usd}`, usd: String(a.usd), url: a.qr, saved: a.usd, link: a.link || "", link0: a.link || "" })));
  const [gone, setGone] = useState([]); // saved amounts removed in this window
  const pickAmt = useRef(null);
  const addAmtFiles = async (files) => {
    for (const file of files) {
      const id = `n${Math.random().toString(36).slice(2)}`;
      setAmts((cur) => [...cur, { id, file, url: URL.createObjectURL(file), usd: "", reading: true }]);
      let r = { found: false, amount: null, currency: "" };
      try {
        r = await readKhqr(file);
      } catch {
        /* unreadable picture: the amount is typed */
      }
      const warn = r.currency === "KHR" ? x.amtRiel : !r.amount ? x.amtNoRead : "";
      setAmts((cur) => cur.map((a) => (a.id === id ? { ...a, reading: false, usd: r.amount && r.currency !== "KHR" ? String(r.amount) : "", warn } : a)));
    }
  };
  const amtBad = amts.some((a) => !a.saved && !(Number(a.usd) > 0));
  const saveAmts = async (key) => {
    for (const usd of gone) await platformAdminService.removeAmountQr(key, usd);
    for (const a of amts) {
      if (!a.saved) await platformAdminService.addAmountQr(key, Number(a.usd), a.file, a.link || "");
      else if ((a.link || "") !== (a.link0 || "")) await platformAdminService.setAmountQrLink(key, a.saved, a.link || "");
    }
  };
  const go = async (which, fn) => {
    setBusy(which);
    setError("");
    try {
      await fn();
      notify({ type: "success", text: x.saved });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy("");
    }
  };
  return (
    <Modal
      title={isNew ? x.addBank : bank.name}
      onClose={onClose}
      busy={!!busy}
      footer={
        <>
          {!isNew && (
            <button type="button" className="md-btn md-btn-ghost sa-danger-text" style={{ marginRight: "auto" }} onClick={() => window.confirm(x.sure) && go("remove", () => platformAdminService.removeBank(bank.key))} disabled={!!busy}>
              {busy === "remove" ? <Loader2 size={14} className="md-spin" /> : <Trash2 size={14} />} {x.remove}
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={!!busy}>
            {x.cancel}
          </button>
          <button
            type="button"
            className="md-btn md-btn-primary"
            disabled={!!busy || !f.name.trim() || (isNew && !qr) || amtBad || amts.some((a) => a.reading)}
            onClick={() =>
              go("save", async () => {
                const body = { ...f, active: String(f.active) };
                let key = bank.key;
                if (isNew) {
                  const r = await platformAdminService.addBank(body, qr);
                  key = r.data[r.data.length - 1]?.key;
                } else await platformAdminService.saveBank(key, body, qr);
                await saveAmts(key);
              })
            }
            data-testid="co-bank-save"
          >
            {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Save size={15} />} {x.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <button type="button" className={`cs-proof ${qrUrl ? "has" : ""}`} onClick={() => pick.current?.click()}>
          {qrUrl ? <img src={qrUrl} alt="" /> : <ImageIcon size={22} />}
          <span>{qr ? qr.name : x.qrPick}</span>
        </button>
        <input
          ref={pick}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          data-testid="co-qr-file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setQr(file);
            setQrUrl(URL.createObjectURL(file));
          }}
        />
        {[
          ["name", x.bankName, 60],
          ["account_name", x.accName, 80],
          ["account_no", x.accNo, 60],
          ["note", x.note, 200],
        ].map(([k, label, max]) => (
          <label key={k} className="md-field">
            <span>{label}</span>
            <input maxLength={max} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} data-testid={`co-bank-${k}`} />
          </label>
        ))}
        <label className="md-field">
          <span>{x.payLink}</span>
          <input value={f.link} onChange={(e) => setF({ ...f, link: linkOf(e.target.value) })} placeholder="https://link.payway.com.kh/…" data-testid="co-bank-link" />
          <small className="rs-muted">{x.payLinkSub}</small>
        </label>
        <label className="md-switch">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          <span className="md-switch-track" />
          <span>{x.active}</span>
        </label>
        {/* QR pictures with the amount already in them */}
        <div className="co-amts" data-testid="co-amts">
          <div className="co-amts-head">
            <div>
              <b>{x.amtQrs}</b>
              <small className="rs-muted">{x.amtQrsSub}</small>
            </div>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => pickAmt.current?.click()} data-testid="co-amt-add">
              <Plus size={14} /> {x.amtAdd}
            </button>
          </div>
          <input
            ref={pickAmt}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            data-testid="co-amt-file"
            onChange={(e) => {
              const files = [...(e.target.files || [])];
              e.target.value = "";
              addAmtFiles(files);
            }}
          />
          {amts.length > 0 && (
            <div className="co-amt-grid">
              {[...amts]
                .sort((a, b) => (Number(a.usd) || 1e9) - (Number(b.usd) || 1e9))
                .map((a) => (
                  <div key={a.id} className={`co-amt ${a.warn ? "warn" : ""}`} data-testid="co-amt">
                    <img src={a.url} alt="" />
                    <button
                      type="button"
                      className="co-amt-x"
                      aria-label={x.remove}
                      onClick={() => {
                        if (a.saved) setGone((g) => [...g, a.saved]);
                        setAmts((cur) => cur.filter((v) => v.id !== a.id));
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                    {a.reading ? (
                      <span className="co-amt-usd">
                        <Loader2 size={13} className="md-spin" />
                      </span>
                    ) : a.saved ? (
                      <b className="co-amt-usd">${Number(a.usd).toLocaleString("en-US")}</b>
                    ) : (
                      <label className="co-amt-in">
                        $
                        <input
                          inputMode="decimal"
                          value={a.usd}
                          placeholder={x.amtAmount}
                          onChange={(e) => setAmts((cur) => cur.map((v) => (v.id === a.id ? { ...v, usd: e.target.value.replace(/[^\d.]/g, "").slice(0, 9) } : v)))}
                          data-testid="co-amt-usd"
                        />
                      </label>
                    )}
                    {a.warn && <small className="co-amt-warn">{a.warn}</small>}
                    <input
                      className="co-amt-link"
                      value={a.link || ""}
                      placeholder={x.payLinkShort}
                      title={x.payLink}
                      onChange={(e) => setAmts((cur) => cur.map((v) => (v.id === a.id ? { ...v, link: linkOf(e.target.value) } : v)))}
                      data-testid="co-amt-link"
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

function Telegram({ notify }) {
  const { x } = useSpText();
  const [s, setS] = useState(null);
  const [link, setLink] = useState(null);
  const [working, setWorking] = useState(""); // which button is busy
  const timer = useRef(null);
  const load = useCallback(() => platformAdminService.get().then((r) => (setS(r.data.tg), r.data.tg)), []);
  useEffect(() => {
    load().catch((e) => notify({ type: "error", text: e.message }));
    return () => clearInterval(timer.current);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return <SettingsSkeleton panels={1} />;
  const connect = async () => {
    setWorking("connect");
    try {
      const r = await platformAdminService.tgLink();
      setLink({ ...r.data, qr: await QRCode.toDataURL(r.data.url, { width: 320, margin: 1 }) });
      clearInterval(timer.current);
      timer.current = setInterval(async () => {
        const t = await load().catch(() => null);
        if (t?.connected) {
          clearInterval(timer.current);
          setLink(null);
        }
      }, 2500);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setWorking("");
    }
  };
  const run = (which, fn) => {
    if (working) return;
    setWorking(which);
    fn()
      .then(() => load())
      .then(() => notify({ type: "success", text: x.saved }))
      .catch((e) => notify({ type: "error", text: e.message }))
      .finally(() => setWorking(""));
  };
  return (
    <section className="panel-card">
      <h3 style={{ marginTop: 0 }}>{x.tgTitle}</h3>
      <p className="rs-muted">{x.tgSub}</p>
      {!s.configured && <div className="co-warn">{x.tgNotReady}</div>}
      {s.connected ? (
        <div className="co-tg">
          <CheckCircle2 size={24} className="cs-green" />
          <b>{x.tgConnected.replace("{name}", s.chat_name)}</b>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => run("test", platformAdminService.tgTest)} disabled={!!working}>
            {working === "test" ? <Loader2 size={14} className="md-spin" /> : <BellRing size={14} />} {x.tgTest}
          </button>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm sa-danger-text" onClick={() => run("off", platformAdminService.tgOff)} disabled={!!working}>
            {working === "off" ? <Loader2 size={14} className="md-spin" /> : <Unplug size={14} />} {x.tgOff}
          </button>
        </div>
      ) : link ? (
        <div className="co-tglink">
          <img src={link.qr} alt="" />
          <div>
            <a className="md-btn md-btn-primary co-tgbtn" href={link.url} target="_blank" rel="noreferrer">
              <Send size={16} /> {x.tgConnect}
            </a>
            <a className="md-btn md-btn-ghost sa-btn-sm" href={link.group_url} target="_blank" rel="noreferrer">
              <Users size={14} /> {x.tgGroup}
            </a>
            <p className="co-tgwait">
              <Loader2 size={14} className="md-spin" /> {x.tgWaiting}
            </p>
          </div>
        </div>
      ) : (
        <button type="button" className="md-btn md-btn-primary co-tgbtn" onClick={connect} disabled={!s.configured || !!working} data-testid="co-tg-connect">
          {working === "connect" ? <Loader2 size={16} className="md-spin" /> : <Send size={16} />} {x.tgConnect}
        </button>
      )}
      <div className="co-tgmore" style={{ marginTop: 14 }}>
        {[
          ["coin_orders", x.tgOrders],
          ["chat", x.tgChat],
        ].map(([k, label]) => (
          <label key={k} className="co-tgrow">
            <span>
              <b>{label}</b>
            </span>
            <span className="md-switch">
              <input type="checkbox" checked={!!s[k]} onChange={(e) => run(k, () => platformAdminService.save({ tg: { [k]: e.target.checked } }))} disabled={!!working} aria-label={label} />
              <span className="md-switch-track" />
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
