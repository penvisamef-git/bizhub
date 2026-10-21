import { useCallback, useEffect, useState } from "react";
import { Copy, Download, Eye, Plus, Printer, RefreshCw, Search, Share2, Trash2 } from "lucide-react";
import { coinAdminService } from "../../api/services";
import { coinsChanged } from "../../lib/events";
import { downloadDataUrl, drawCardImage, formatCode, printCards, shareCardImage } from "../../lib/topupCard";
import CoinIcon from "../../components/CoinIcon";
import { fmt, fmtDate, useSaText } from "./text";
import { Modal, Pager } from "./parts";
import { TableSkeletonRows } from "../../components/skeleton/Skeleton";

const isExpired = (c) => c.status === "active" && c.expires_at && new Date(c.expires_at) <= new Date();
const statusOf = (c) => (isExpired(c) ? "expired" : c.status);

// One card picture with download / share / copy
function CardPreview({ card, s }) {
  const [src, setSrc] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    drawCardImage(card).then((url) => alive && setSrc(url));
    return () => {
      alive = false;
    };
  }, [card]);
  const name = `bizhub-card-${card.amount}-${card.code.slice(-4)}.png`;
  return (
    <div className="cd-preview">
      {src ? <img src={src} alt={`${fmt(card.amount)} · ${formatCode(card.code)}`} /> : <div className="cd-preview-empty" aria-busy="true" />}
      <div className="cd-preview-actions">
        <button type="button" className="md-btn md-btn-primary" disabled={!src} onClick={() => downloadDataUrl(src, name)}>
          <Download size={16} /> {s.download}
        </button>
        <button type="button" className="md-btn md-btn-ghost" disabled={!src} onClick={async () => (await shareCardImage(src, card)) || downloadDataUrl(src, name)}>
          <Share2 size={16} /> {s.share}
        </button>
        <button
          type="button"
          className="md-btn md-btn-ghost"
          onClick={() => {
            navigator.clipboard?.writeText(card.code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          <Copy size={16} /> {copied ? s.copied : s.copyCode}
        </button>
      </div>
    </div>
  );
}

function CreateCardsModal({ s, treasury, onClose, onCreated }) {
  const [amount, setAmount] = useState("100");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [expiry, setExpiry] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const total = (Number(amount) || 0) * (Number(quantity) || 0);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await coinAdminService.createCards({
        amount: Number(amount),
        quantity: Number(quantity),
        note,
        expires_at: expiry ? `${expiry}T23:59:59+07:00` : undefined,
      });
      coinsChanged();
      onCreated(r.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={s.createCards}
      onClose={onClose}
      busy={busy}
      size="md-modal-sm"
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {s.cancel}
          </button>
          <button type="submit" form="cd-create" className="md-btn md-btn-primary" disabled={busy || total < 1}>
            {busy ? s.saving : s.createCards}
          </button>
        </>
      }
    >
      <form id="cd-create" className="md-fields" onSubmit={submit}>
        <p className="md-hint" style={{ margin: 0 }}>
          {s.cardHint}
        </p>
        <div className="cd-amounts" role="group" aria-label={s.cardAmount}>
          {[50, 100, 200, 500, 1000].map((v) => (
            <button key={v} type="button" aria-pressed={Number(amount) === v} onClick={() => setAmount(String(v))}>
              {fmt(v)}
            </button>
          ))}
        </div>
        <div className="md-fields-grid">
          <div className="md-field">
            <label htmlFor="cd-amount">
              {s.cardAmount}
              <span className="md-required">*</span>
            </label>
            <input id="cd-amount" type="number" min="1" max="100000" step="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="md-field">
            <label htmlFor="cd-qty">
              {s.cardQuantity}
              <span className="md-required">*</span>
            </label>
            <input id="cd-qty" type="number" min="1" max="100" step="1" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="md-field">
            <label htmlFor="cd-exp">{s.cardExpiry}</label>
            <input id="cd-exp" type="date" min={tomorrow} value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
          <div className="md-field">
            <label htmlFor="cd-note">{s.note}</label>
            <input id="cd-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div className={`cd-total ${treasury !== undefined && total > treasury ? "over" : ""}`}>
          <span>{s.cardTotal}</span>
          <b>{fmt(total)}</b>
          {treasury !== undefined && (
            <small>
              {s.treasury}: {fmt(treasury)}
            </small>
          )}
        </div>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

// "Top-up cards" tab on the Coins page
export default function CardsPanel({ treasury, onChanged, notify }) {
  const { s } = useSaText();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null); // cards just made
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    coinAdminService
      .cards({ status, q, page, limit: 20 })
      .then((r) => {
        setRows(r.data || []);
        setSummary(r.summary);
        setPagination(r.pagination);
      })
      .catch((e) => setError(e.message || s.loadFail))
      .finally(() => setLoading(false));
  }, [status, q, page, s.loadFail]);

  useEffect(() => {
    const timer = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, q]);

  const remove = async () => {
    setBusy(true);
    try {
      await coinAdminService.deleteCard(deleting._id);
      coinsChanged();
      notify({ type: "success", text: s.cardDeleted });
      setDeleting(null);
      load();
      onChanged();
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const printList = async (cards) => {
    setPrinting(true);
    const images = [];
    for (const c of cards) images.push(await drawCardImage(c));
    printCards(images);
    setPrinting(false);
  };

  const filters = [
    ["", s.all],
    ["active", s.cardStatus.active],
    ["redeemed", s.cardStatus.redeemed],
    ["cancelled", s.cardStatus.cancelled],
    ["expired", s.cardStatus.expired],
  ];

  return (
    <>
      {summary && (
        <div className="cd-chips">
          <span className="cd-chip active">
            {s.cardStatus.active}: <b>{fmt(summary.active.count)}</b> · {fmt(summary.active.coins)} <CoinIcon size={16} />
          </span>
          <span className="cd-chip">
            {s.cardStatus.redeemed}: <b>{fmt(summary.redeemed.count)}</b> · {fmt(summary.redeemed.coins)} <CoinIcon size={16} />
          </span>
          <span className="cd-chip">
            {s.cardStatus.cancelled}: <b>{fmt(summary.cancelled.count)}</b>
          </span>
        </div>
      )}

      <div className="md-toolbar">
        <div className="sa-filters">
          <div className="md-search">
            <Search size={16} />
            <input
              value={q}
              inputMode="numeric"
              placeholder={s.searchCode}
              aria-label={s.searchCode}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="lang-switch sa-type-switch" role="group" aria-label={s.status}>
            {filters.map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={status === v}
                onClick={() => {
                  setStatus(v);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="sa-head-actions">
          <button type="button" className="md-btn md-btn-ghost" onClick={load} disabled={loading} aria-label={s.refresh}>
            <RefreshCw size={16} className={loading ? "md-spin" : ""} />
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> {s.createCards}
          </button>
        </div>
      </div>

      <div className="md-card">
        <div className="md-table-scroll">
          <table className="md-table sa-table">
            <thead>
              <tr>
                <th>{s.cardCode}</th>
                <th className="num">{s.amount}</th>
                <th>{s.status}</th>
                <th>{s.note}</th>
                <th>{s.created}</th>
                <th>{s.usedBy}</th>
                <th className="md-col-actions">{s.actions}</th>
              </tr>
            </thead>
            <tbody>
              {error && (
                <tr>
                  <td colSpan={7} className="md-empty md-empty-error">
                    {error}
                  </td>
                </tr>
              )}
              {loading && !error && rows.length === 0 && <TableSkeletonRows cols={7} />}
              {!error && !loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="md-empty">
                    {s.nothingYet}
                  </td>
                </tr>
              )}
              {rows.map((c) => {
                const st = statusOf(c);
                return (
                  <tr key={c._id}>
                    <td>
                      <span className="cd-code">{formatCode(c.code)}</span>
                    </td>
                    <td className="num">
                      <b>{fmt(c.amount)}</b>
                    </td>
                    <td>
                      <span className={`cd-status s-${st}`}>{s.cardStatus[st]}</span>
                      {c.expires_at && <small className="sa-block">≤ {fmtDate(c.expires_at)}</small>}
                    </td>
                    <td className="sa-note-cell">
                      {c.note || "-"}
                      <small className="sa-block">{c.batch_id}</small>
                    </td>
                    <td className="sa-nowrap">{fmtDate(c.created_date, true)}</td>
                    <td>
                      {c.redeemed_by ? (
                        <>
                          {c.redeemed_by.name}
                          <small className="sa-block">{fmtDate(c.redeemed_date, true)}</small>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="md-col-actions">
                      {c.status === "active" && (
                        <>
                          <button type="button" className="md-icon-btn" onClick={() => setViewing(c)} title={s.view} aria-label={s.view}>
                            <Eye size={16} />
                          </button>
                          <button type="button" className="md-icon-btn md-icon-btn-danger" onClick={() => setDeleting(c)} title={s.deleteCard} aria-label={s.deleteCard}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager pagination={pagination} onPage={setPage} />
      </div>

      {creating && (
        <CreateCardsModal
          s={s}
          treasury={treasury}
          onClose={() => setCreating(false)}
          onCreated={(cards) => {
            setCreating(false);
            setCreated(cards);
            notify({ type: "success", text: s.cardsCreated });
            setStatus("");
            setPage(1);
            load();
            onChanged();
          }}
        />
      )}

      {created && (
        <Modal
          title={`${s.newCards} · ${created.length}`}
          onClose={() => setCreated(null)}
          size="md-modal-wide"
          footer={
            <>
              <button type="button" className="md-btn md-btn-ghost" onClick={() => printList(created)} disabled={printing}>
                <Printer size={16} /> {printing ? s.saving : s.printAll}
              </button>
              <button type="button" className="md-btn md-btn-primary" onClick={() => setCreated(null)}>
                {s.done}
              </button>
            </>
          }
        >
          <div className="cd-grid">
            {created.map((c) => (
              <CardPreview key={c._id} card={c} s={s} />
            ))}
          </div>
        </Modal>
      )}

      {viewing && (
        <Modal
          title={`${fmt(viewing.amount)} · ${formatCode(viewing.code)}`}
          onClose={() => setViewing(null)}
          size="md-modal-sm"
          footer={
            <button type="button" className="md-btn md-btn-ghost" onClick={() => printList([viewing])} disabled={printing}>
              <Printer size={16} /> {s.print}
            </button>
          }
        >
          <CardPreview card={viewing} s={s} />
        </Modal>
      )}

      {deleting && (
        <Modal
          title={s.deleteCard}
          size="md-modal-sm"
          busy={busy}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button type="button" className="md-btn md-btn-ghost" onClick={() => setDeleting(null)} disabled={busy}>
                {s.cancel}
              </button>
              <button type="button" className="md-btn md-btn-danger" onClick={remove} disabled={busy}>
                <Trash2 size={16} /> {busy ? s.saving : s.deleteCard}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            <span className="cd-code">{formatCode(deleting.code)}</span> · <b>{fmt(deleting.amount)}</b>
          </p>
          <p className="md-hint" style={{ margin: 0 }}>
            {s.deleteCardConfirm}
          </p>
        </Modal>
      )}
    </>
  );
}
