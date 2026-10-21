import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Eye, Gift, Loader2, QrCode, Search, Star, Ticket, Undo2, UserPlus, X } from "lucide-react";
import { attachMember, billRewardTaken, createMember, searchMembers, pointsFor, redeemReward, refreshMember, rewardsRules, undoRedemption, useCoupon, usePos } from "../engine";
import { usePosText } from "../text";
import { fmtMoney } from "../util";
import { Sheet } from "./Modals";

const KIND_ICON = { free_item: Gift, amount: Ticket, percent: Ticket, gift: Gift, coupon: Ticket };

// Reward points on a bill: find or add the member by phone, then spend points on rewards or use their coupons.
// ensureOrder() makes the bill first when the ticket is still empty.
export default function MemberSheet({ order, ensureOrder, onClose, siteUrl }) {
  const s = usePos();
  const { t } = usePosText();
  const rules = rewardsRules();
  const c = s.setup?.money?.currency || "USD";
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null); // search results (name or phone)
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null); // member id shown in detail (before adding to the bill)
  const [showInfo, setShowInfo] = useState(false); // details of the member on the bill
  const [form, setForm] = useState({ phone: "", name: "", birthday: "" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");
  const memberId = order?.member?.id || "";
  const info = memberId ? s.members[memberId] : null;

  useEffect(() => {
    if (memberId && s.online) refreshMember(memberId).catch((e) => setError(e.message));
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (key, fn) => {
    setBusy(key);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e.status === 0 ? t.memberOffline : e.message);
    } finally {
      setBusy("");
    }
  };
  const search = (text) => run("find", async () => setResults((await searchMembers(text)).results));
  // search while typing (name or phone)
  useEffect(() => {
    if (memberId || creating) return undefined;
    const text = q.trim();
    if (text.length < 2) {
      setResults(null);
      return undefined;
    }
    const timer = setTimeout(() => search(text), 350);
    return () => clearTimeout(timer);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const phoneOf = (text) => (/^[\d\s+()-]{8,}$/.test(text.trim()) ? text.trim() : "");
  const startCreate = () => {
    const p = phoneOf(q);
    setForm({ phone: p, name: p ? "" : q.trim(), birthday: "" });
    setCreating(true);
  };
  const openDetail = (id) => run("detail", async () => {
    await refreshMember(id);
    setViewing(id);
  });
  const attach = (m) =>
    run("attach", async () => {
      const id = await ensureOrder();
      await attachMember(id, m);
      setViewing(null);
      setResults(null);
      setQ("");
    });
  const create = () =>
    run("create", async () => {
      const data = await createMember({ phone: form.phone.trim(), name: form.name.trim(), birthday: form.birthday });
      const id = await ensureOrder();
      await attachMember(id, data.member);
      setCreating(false);
    });
  const showQr = async () => setQr(qr ? "" : await QRCode.toDataURL(`${siteUrl}/public/member/${info.member.token}`, { width: 360, margin: 1 }));

  if (!rules) return null;
  const earn = pointsFor(order);
  const open = order?.status === "open";
  const used = order?.redemptions || [];

  return (
    <Sheet title={t.member} onClose={onClose} wide>
      <div className="pos-member">
        {!memberId ? (
          viewing ? (
            <MemberDetail id={viewing} info={s.members[viewing]} t={t} c={c} onBack={() => setViewing(null)} onAdd={(m) => attach(m)} busy={busy} />
          ) : creating ? (
            <div className="pos-member-new">
              <input className="pos-input" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t.memberPhone} aria-label={t.memberPhone} autoFocus={!form.phone} />
              <input className="pos-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.memberName} maxLength={60} aria-label={t.memberName} autoFocus={!!form.phone} />
              <input className="pos-input" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} placeholder={t.memberBirthday} maxLength={10} aria-label={t.memberBirthday} />
              <div className="pos-member-actions">
                <button type="button" className="pos-btn" onClick={() => setCreating(false)} disabled={!!busy}>
                  {t.back}
                </button>
                <button type="button" className="pos-btn primary" onClick={create} disabled={!!busy || !form.phone.trim()}>
                  {busy === "create" ? <Loader2 size={17} className="md-spin" /> : <UserPlus size={17} />} {t.memberCreate}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="pos-member-find">
                <Search size={18} />
                <input className="pos-input big" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && q.trim().length >= 2 && search(q)} placeholder={t.memberSearch} aria-label={t.memberSearch} autoFocus />
                {busy === "find" && <Loader2 size={18} className="md-spin" />}
              </div>
              {results && results.length > 0 && (
                <div className="pos-member-results">
                  {results.map((m) => (
                    <div key={m._id} className="pos-member-card">
                      <Star size={18} />
                      <div>
                        <b>{m.name || "—"}</b>
                        <small>
                          {m.phone} · {t.points.replace("{n}", m.points)} · {t.visitsN.replace("{n}", m.visits)}
                        </small>
                      </div>
                      <button type="button" className="pos-btn small" onClick={() => openDetail(m._id)} disabled={!!busy}>
                        <Eye size={15} /> {t.details}
                      </button>
                      <button type="button" className="pos-btn small primary" onClick={() => attach(m)} disabled={!!busy}>
                        {t.addToBill}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {results && results.length === 0 && q.trim().length >= 2 && busy !== "find" && <p className="pos-muted">{t.noMemberFound}</p>}
              <button type="button" className="pos-btn pos-member-add" onClick={() => startCreate()} disabled={!!busy}>
                <UserPlus size={17} /> {phoneOf(q) ? t.memberAddPhone.replace("{p}", q.trim()) : t.memberAddNew}
              </button>
            </>
          )
        ) : (
          <>
            <div className="pos-member-card on">
              <Star size={22} />
              <div>
                <b>{order.member.name || "—"}</b>
                <small>
                  {order.member.phone}
                  {info ? ` · ${t.points.replace("{n}", info.member.points)}` : ""}
                </small>
                {earn > 0 && <small className="pos-member-earn">{t.earnThisBill.replace("{n}", earn)}</small>}
              </div>
              {info && (
                <button type="button" className={`pos-icon ${showInfo ? "on" : ""}`} onClick={() => setShowInfo(!showInfo)} title={t.details} aria-label={t.details}>
                  <Eye size={19} />
                </button>
              )}
              {info?.member?.token && siteUrl && (
                <button type="button" className="pos-icon" onClick={showQr} title={t.memberQr} aria-label={t.memberQr}>
                  <QrCode size={20} />
                </button>
              )}
              {open && used.length === 0 && (
                <button type="button" className="pos-icon" onClick={() => attachMember(order._id, null)} title={t.memberRemove} aria-label={t.memberRemove}>
                  <X size={18} />
                </button>
              )}
            </div>
            {showInfo && info && <MemberStats info={info} t={t} c={c} />}
            {qr && (
              <div className="pos-member-qr">
                <img src={qr} alt="" />
                <small>{t.memberQrHint}</small>
              </div>
            )}
            {used.length > 0 && (
              <div className="pos-member-block">
                <b>{t.usedOnBill}</b>
                {used.map((r) => (
                  <div key={r.id} className="pos-member-row">
                    <span>
                      {r.name}
                      {r.code ? <small> · {r.code}</small> : null}
                    </span>
                    <small>{r.code ? t.coupon : t.points.replace("{n}", `−${r.points}`)}</small>
                    {open && (
                      <button type="button" className="pos-btn small" onClick={() => run(`undo:${r.id}`, () => undoRedemption(order._id, r.id))} disabled={!!busy}>
                        <Undo2 size={14} /> {t.undo}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {open && info?.coupons?.length > 0 && (
              <div className="pos-member-block">
                <b>{t.coupons}</b>
                {info.coupons.map((cp) => {
                  const money = cp.kind === "amount" || cp.kind === "percent";
                  const blocked = money && billRewardTaken(order._id);
                  return (
                    <div key={cp.id} className="pos-member-row">
                      <span>
                        <Ticket size={15} /> {cp.name} <small>· {cp.code}</small>
                      </span>
                      <small>{blocked ? t.oneMoneyOff : ""}</small>
                      <button type="button" className="pos-btn small primary" onClick={() => run(`cp:${cp.id}`, () => useCoupon(order._id, cp.id))} disabled={!!busy || blocked}>
                        {t.use}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {open && info && (
              <div className="pos-member-block">
                <b>{t.rewards}</b>
                {info.rewards.length === 0 && <small className="pos-muted">{t.noRewards}</small>}
                {info.rewards.map((r) => {
                  const Icon = KIND_ICON[r.kind] || Gift;
                  const short = info.member.points < r.points;
                  const money = r.kind === "amount" || r.kind === "percent";
                  const blocked = money && billRewardTaken(order._id);
                  const what = r.kind === "amount" ? `−${fmtMoney(r.value, c)}` : r.kind === "percent" ? `−${r.value}%` : r.kind === "coupon" ? t.couponLater : r.kind === "gift" ? t.gift : t.freeItem;
                  return (
                    <div key={r._id} className={`pos-member-row ${short ? "short" : ""}`}>
                      <span>
                        <Icon size={15} /> {r.name} <small>· {what}</small>
                      </span>
                      <small className="pos-member-cost">{t.points.replace("{n}", r.points)}</small>
                      <button type="button" className="pos-btn small primary" onClick={() => run(`rw:${r._id}`, () => redeemReward(order._id, r._id))} disabled={!!busy || short || blocked} title={blocked ? t.oneMoneyOff : ""}>
                        {busy === `rw:${r._id}` ? <Loader2 size={14} className="md-spin" /> : t.use}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        {!s.online && <p className="pos-note warn">{t.memberOffline}</p>}
        {error && <p className="pos-error">{error}</p>}
      </div>
    </Sheet>
  );
}

// what the cashier may see about a member (read only: points can only be changed by the owner)
function MemberStats({ info, t, c }) {
  const m = info.member;
  const day = (d) => (d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "—");
  return (
    <div className="pos-member-stats">
      <div className="pos-member-grid">
        <span>
          <small>{t.pointsLabel}</small>
          <b>{m.points}</b>
        </span>
        <span>
          <small>{t.visitsLabel}</small>
          <b>{m.visits}</b>
        </span>
        <span>
          <small>{t.spentLabel}</small>
          <b>{fmtMoney(m.total_spent || 0, c)}</b>
        </span>
        <span>
          <small>{t.lastVisit}</small>
          <b>{day(m.last_visit)}</b>
        </span>
        {m.birthday && (
          <span>
            <small>{t.birthdayLabel}</small>
            <b>{m.birthday}</b>
          </span>
        )}
      </div>
      {info.moves?.length > 0 && (
        <div className="pos-member-block">
          <b>{t.history}</b>
          {info.moves.map((x, i) => (
            <div key={i} className="pos-member-move">
              <span>
                {t.moveKinds[x.kind] || x.kind}
                {x.reward_name ? ` · ${x.reward_name}` : ""}
                {x.order_number ? ` · #${x.order_number}` : ""}
                <small> · {day(x.at)}</small>
              </span>
              <b className={x.points > 0 ? "plus" : "minus"}>
                {x.points > 0 ? "+" : ""}
                {x.points}
              </b>
            </div>
          ))}
        </div>
      )}
      <small className="pos-muted">{t.ownerOnly}</small>
    </div>
  );
}

function MemberDetail({ info, t, c, onBack, onAdd, busy }) {
  if (!info) return null;
  return (
    <div className="pos-member-detail">
      <div className="pos-member-card on">
        <Star size={22} />
        <div>
          <b>{info.member.name || "—"}</b>
          <small>{info.member.phone}</small>
        </div>
      </div>
      <MemberStats info={info} t={t} c={c} />
      <div className="pos-member-actions">
        <button type="button" className="pos-btn" onClick={onBack} disabled={!!busy}>
          <ArrowLeft size={16} /> {t.back}
        </button>
        <button type="button" className="pos-btn primary" onClick={() => onAdd(info.member)} disabled={!!busy}>
          {t.addToBill}
        </button>
      </div>
    </div>
  );
}
