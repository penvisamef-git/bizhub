import { usePayConfirm } from "../../../components/purchase/PayConfirm";
import { useEffect, useRef, useState } from "react";
import { Check, Images, Loader2, Minus, Plus, Trash2, Upload } from "lucide-react";
import { menuQrService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { auth } from "../../../lib/auth";
import { coinsChanged } from "../../../lib/events";
import { Head } from "./parts";
import { fmt } from "./text";

// load + upload + room, shared by the Media tab and the picker
function useMedia(ctx) {
  const { id, m, notify } = ctx;
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState("");
  const load = () =>
    menuQrService
      .media(id)
      .then(setRes)
      .catch((e) => notify({ type: "error", text: e.message }));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const upload = async (files, onFull) => {
    if (!files.length) return [];
    setBusy("upload");
    let added = [];
    try {
      for (let i = 0; i < files.length; i += 10) {
        const r = await menuQrService.uploadMedia(id, files.slice(i, i + 10));
        added = [...added, ...r.data];
        if (r.skipped) {
          notify({ type: "error", text: m.skipped.replace("{n}", files.length - added.length) });
          onFull?.();
          break;
        }
      }
    } catch (e) {
      if (e.response?.code === "media_full") onFull?.();
      notify({ type: "error", text: e.response?.code === "media_full" ? m.full : e.message });
    } finally {
      setBusy("");
      await load();
      ctx.reload();
    }
    return added;
  };
  return { res, load, busy, setBusy, upload };
}

function Room({ ctx, res, onBuy }) {
  const { m, readOnly } = ctx;
  const pct = Math.min(100, (res.count / Math.max(1, res.capacity)) * 100);
  return (
    <div className={`mq-room ${res.count >= res.capacity ? "full" : ""}`}>
      <div className="mq-room-top">
        <b>{m.room.replace("{n}", fmt(res.count)).replace("{max}", fmt(res.capacity))}</b>
        <small className="rs-muted">{m.roomHint.replace("{free}", res.free).replace("{slots}", fmt(res.slots))}</small>
        <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={onBuy} disabled={readOnly} data-testid="mq-media-buy">
          <CoinIcon size={14} /> {m.addPlaces}
        </button>
      </div>
      <i className="mq-room-bar">
        <i style={{ width: `${pct}%` }} />
      </i>
    </div>
  );
}

function UploadBtn({ ctx, busy, onFiles, small }) {
  const { m, readOnly } = ctx;
  const pick = useRef(null);
  return (
    <>
      <button type="button" className={`md-btn md-btn-primary ${small ? "sa-btn-sm" : ""}`} onClick={() => pick.current?.click()} disabled={readOnly || !!busy} data-testid="mq-media-upload">
        {busy === "upload" ? <Loader2 size={15} className="md-spin" /> : <Upload size={15} />} {m.upload}
      </button>
      <input
        ref={pick}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        data-testid="mq-media-file"
        onChange={(e) => {
          const list = [...(e.target.files || [])].filter((f) => f.size <= 4 * 1024 * 1024);
          e.target.value = "";
          onFiles(list);
        }}
      />
    </>
  );
}

// ============================== Media tab ==============================
export default function MqMedia({ ctx }) {
  const { id, m, readOnly, notify } = ctx;
  const { res, load, busy, setBusy, upload } = useMedia(ctx);
  const [buying, setBuying] = useState(false);
  const remove = async (x) => {
    if (!window.confirm(x.used.length ? m.deleteUsed.replace("{n}", x.used.length) : m.sure.replace("{name}", x.name || "📷"))) return;
    setBusy(x._id);
    try {
      await menuQrService.removeMedia(id, x._id);
      await load();
      ctx.reload();
      notify({ type: "success", text: m.saved });
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rs-col">
      <Head icon={Images} title={m.mediaTitle} sub={m.mediaSub}>
        <UploadBtn ctx={ctx} busy={busy} onFiles={(f) => upload(f, () => setBuying(true))} small />
      </Head>
      {!res ? (
        <div className="panel-card">…</div>
      ) : (
        <>
          <section className="panel-card">
            <Room ctx={ctx} res={res} onBuy={() => setBuying(true)} />
            <small className="rs-muted">{m.uploadHint}</small>
          </section>
          {!res.data.length ? (
            <section className="panel-card">
              <p className="rs-muted">{m.emptyMedia}</p>
            </section>
          ) : (
            <section className="panel-card">
              <div className="mq-media-grid">
                {res.data.map((x) => (
                  <div key={x._id} className="mq-media" data-testid="mq-media">
                    <img src={x.url} alt="" loading="lazy" />
                    <span className={`mq-media-use ${x.used.length ? "on" : ""}`} title={x.used.map((u) => `${m.kindNames[u.kind]}${u.name ? `: ${u.name}` : ""}`).join("\n")}>
                      {x.used.length ? m.usedCount.replace("{n}", x.used.length) : m.notUsed}
                    </span>
                    <button type="button" className="mq-media-del" onClick={() => remove(x)} disabled={readOnly || !!busy} aria-label={m.delete}>
                      {busy === x._id ? <Loader2 size={14} className="md-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {buying && res && <BuySlots ctx={ctx} price={res.slot_price} onClose={() => setBuying(false)} onDone={() => (setBuying(false), load(), ctx.reload())} />}
    </div>
  );
}

// ============================== buy places ==============================
export function BuySlots({ ctx, price, onClose, onDone }) {
  const { id, m, notify } = ctx;
  const [n, setN] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = n * (price || 0);
  const balance = auth.getClientLogin()?.coin_balance ?? 0;
  const [askPay, payNode] = usePayConfirm();
  const buy = () => askPay(total, m.buyTitle, pay);
  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await menuQrService.buySlots(id, n);
      if (r.balance !== undefined) auth.setClientLogin({ ...auth.getClientLogin(), coin_balance: r.balance });
      coinsChanged();
      notify({ type: "success", text: m.bought.replace("{n}", n) });
      onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={m.buyTitle}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={buy} disabled={busy || n < 1 || total > balance} data-testid="mq-slots-buy">
            {busy ? <Loader2 size={15} className="md-spin" /> : <CoinIcon size={15} />} {m.buyFor.replace("{n}", n).replace("{coins}", fmt(total))}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <p className="rs-muted" style={{ margin: 0 }}>
          {m.buySub.replace("{coins}", fmt(price))}
        </p>
        <label className="md-field">
          <span>{m.howMany}</span>
          <div className="mq-qty">
            <button type="button" onClick={() => setN(Math.max(1, n - 5))} aria-label="−5">
              <Minus size={15} />
            </button>
            <input type="number" min="1" max="500" value={n} onChange={(e) => setN(Math.max(1, Math.min(500, Math.round(Number(e.target.value) || 1))))} data-testid="mq-slots-n" />
            <button type="button" onClick={() => setN(Math.min(500, n + 5))} aria-label="+5">
              <Plus size={15} />
            </button>
          </div>
        </label>
        <div className="mq-qty-quick">
          {[5, 10, 20, 50, 100].map((k) => (
            <button key={k} type="button" className={n === k ? "on" : ""} onClick={() => setN(k)}>
              +{k}
            </button>
          ))}
        </div>
        {total > balance && <div className="md-form-error">{m.notEnough}</div>}
        {error && <div className="md-form-error">{error}</div>}
      </div>
      {payNode}
    </Modal>
  );
}

// ============================== picker (logo, cover, item photos, banners) ==============================
// max = how many can be chosen; onPick(list of media rows)
export function MediaPicker({ ctx, max = 1, onPick, onClose, title }) {
  const { m } = ctx;
  const { res, load, busy, upload } = useMedia(ctx);
  const [sel, setSel] = useState([]);
  const [buying, setBuying] = useState(false);
  const [using, setUsing] = useState(false);
  const toggle = (x) => setSel((cur) => (cur.some((y) => y._id === x._id) ? cur.filter((y) => y._id !== x._id) : max === 1 ? [x] : cur.length >= max ? cur : [...cur, x]));
  const go = async () => {
    setUsing(true);
    try {
      await onPick(sel);
    } finally {
      setUsing(false);
    }
  };
  return (
    <Modal
      title={title || m.pickTitle}
      onClose={onClose}
      busy={using}
      size="md-modal-lg"
      footer={
        <>
          <span className="rs-muted mq-pick-hint">{m.pickHint}</span>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={using}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={go} disabled={!sel.length || using} data-testid="mq-pick-use">
            {using ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {m.useN.replace("{n}", sel.length || "")}
          </button>
        </>
      }
    >
      {!res ? (
        <p className="rs-muted">…</p>
      ) : (
        <div className="md-fields">
          <div className="mq-pick-top">
            <Room ctx={ctx} res={res} onBuy={() => setBuying(true)} />
            <UploadBtn
              ctx={ctx}
              busy={busy}
              small
              onFiles={async (files) => {
                const added = await upload(files, () => setBuying(true));
                // just uploaded = chosen
                if (added.length) setSel((cur) => (max === 1 ? [added[0]] : [...cur, ...added].slice(0, max)));
              }}
            />
          </div>
          {!res.data.length ? (
            <p className="rs-muted">{m.emptyMedia}</p>
          ) : (
            <div className="mq-media-grid pick">
              {res.data.map((x) => {
                const k = sel.findIndex((y) => y._id === x._id);
                return (
                  <button key={x._id} type="button" className={`mq-media ${k >= 0 ? "sel" : ""}`} onClick={() => toggle(x)} data-testid="mq-pick">
                    <img src={x.url} alt="" loading="lazy" />
                    {k >= 0 && <em className="mq-media-n">{max === 1 ? <Check size={14} /> : k + 1}</em>}
                    {x.used.length > 0 && <span className="mq-media-use on">{m.usedCount.replace("{n}", x.used.length)}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {buying && res && <BuySlots ctx={ctx} price={res.slot_price} onClose={() => setBuying(false)} onDone={() => (setBuying(false), load(), ctx.reload())} />}
    </Modal>
  );
}
