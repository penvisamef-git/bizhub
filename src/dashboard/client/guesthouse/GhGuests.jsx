import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Gift, Link2, Loader2, MessageCircle, Search, Send, Star, Trash2, Undo2, UserRound, X } from "lucide-react";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { Modal } from "../../super_admin/parts";
import { fmtDay, fmtTime, money } from "./text";
import { x3 } from "./gh3-text";
import { Hero, Perks } from "./GhExtras";
import { guestHouseService } from "../../../api/services";

// Guest reviews (gh_reviews) + loyalty points (gh_loyalty): owner tabs, and the boxes inside a stay (dashboard + desk POS)
const api = (ctx) => ctx.api || guestHouseService;
const on = (ctx, key) => !!(ctx.data.addons?.[`gh_${key}`]?.active || ctx.data[key]);
const Stars = ({ n, size = 15 }) => (
  <span className="ghrv-stars" aria-label={`${n}/5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} size={size} className={i <= n ? "on" : ""} />
    ))}
  </span>
);

// ============================ REVIEW LINK (inside a stay) ============================
export function ReviewShare({ ctx, stay, onClose }) {
  const t = x3(ctx.lang);
  const [d, setD] = useState(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api(ctx)
      .stayReview(ctx.id, stay._id)
      .then(async (r) => {
        const url = `${window.location.origin}${r.data.path}`;
        setD({ ...r.data, url });
        setQr(await QRCode.toDataURL(url, { width: 320, margin: 1 }));
      })
      .catch((e) => setError(e.message));
  }, [stay._id]); // eslint-disable-line react-hooks/exhaustive-deps
  const msg = d ? t.rvMsg.replace("{biz}", ctx.data.business.name).replace("{url}", d.url) : "";
  const phone = (stay.guest?.phone || "").replace(/[^\d+]/g, "").replace(/^0/, "855");
  return (
    <Modal title={t.rvShareTitle.replace("{name}", stay.guest?.name || "")} onClose={onClose}>
      {error ? (
        <div className="md-form-error">{error}</div>
      ) : !d ? (
        <p className="rs-muted">…</p>
      ) : (
        <div className="ghrv-share">
          {d.rating > 0 && (
            <div className="rs-banner ok">
              <Stars n={d.rating} /> {t.rvGot.replace("{n}", d.rating)}
            </div>
          )}
          <p className="rs-muted">{t.rvShareSub}</p>
          {qr && <img src={qr} alt="" />}
          <code>{d.url}</code>
          <div className="ghrv-share-btns">
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(d.url);
                  ctx.notify({ type: "success", text: t.otCopied });
                } catch {
                  window.prompt(t.rvCopy, d.url);
                }
              }}
            >
              <Copy size={14} /> {t.rvCopy}
            </button>
            <a className="md-btn md-btn-ghost sa-btn-sm" href={`https://wa.me/${phone.replace("+", "")}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
              <MessageCircle size={14} /> {t.rvWhatsapp}
            </a>
            <a className="md-btn md-btn-ghost sa-btn-sm" href={`https://t.me/share/url?url=${encodeURIComponent(d.url)}&text=${encodeURIComponent(msg.replace(d.url, ""))}`} target="_blank" rel="noreferrer">
              <Send size={14} /> {t.rvTelegram}
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ============================ MEMBER BOX (inside a stay) ============================
export function MemberBox({ ctx, stay, onStay, busy }) {
  const t = x3(ctx.lang);
  const { cur, readOnly } = ctx;
  const [m, setM] = useState(null); // { member, rules, used, value, given }
  const [find, setFind] = useState(null); // "" while searching
  const [hits, setHits] = useState([]);
  const [use, setUse] = useState("");
  const [working, setWorking] = useState(false);
  const live = ["booked", "in"].includes(stay.status);
  const load = useCallback(
    () =>
      api(ctx)
        .stayMember(ctx.id, stay._id)
        .then((r) => setM(r.data))
        .catch(() => setM(null)),
    [ctx.id, stay._id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load, stay.customer_id, stay.points_used, stay.status]);
  useEffect(() => {
    if (find === null || find.trim().length < 2) return setHits([]);
    const timer = setTimeout(() => {
      api(ctx)
        .members(ctx.id, find)
        .then((r) => setHits(r.data || []))
        .catch(() => setHits([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [find]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m?.on) return null;
  const run = async (fn) => {
    setWorking(true);
    try {
      const r = await fn();
      if (r?.data) onStay(r.data);
      await load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setWorking(false);
      setFind(null);
      setUse("");
    }
  };
  const R = m.rules;
  const worth = (p) => (cur === "KHR" ? Math.round((p / R.redeem_points) * R.redeem_value) : Math.round((p / R.redeem_points) * R.redeem_value * 100) / 100);
  const maxUse = m.member ? Math.min(m.member.points, Math.ceil((Math.max(0, stay.bill.balance) / (R.redeem_value || 1)) * R.redeem_points)) : 0;
  const n = Math.min(Number(use) || 0, maxUse);
  return (
    <div className="ghly-box">
      <span className="ghly-ic">
        <Gift size={16} />
      </span>
      {m.member ? (
        <div className="ghly-main">
          <div className="ghly-who">
            <b>{m.member.name}</b>
            <span className="rs-pill ok">{t.lyPoints.replace("{n}", m.member.points)}</span>
            {live && !m.used && !readOnly && (
              <button type="button" className="md-icon-btn" onClick={() => run(() => api(ctx).linkMember(ctx.id, stay._id, null))} aria-label={t.lyUnlink} disabled={working || busy}>
                <X size={14} />
              </button>
            )}
          </div>
          {m.used > 0 && (
            <small className="ghly-used">
              {t.lyUsed2.replace("{p}", m.used).replace("{v}", money(m.value, cur))}
              {live && ctx.role !== "desk" && !readOnly && (
                <button type="button" className="sa-link" onClick={() => run(() => api(ctx).undoPoints(ctx.id, stay._id))} disabled={working}>
                  <Undo2 size={12} /> {t.lyUndo}
                </button>
              )}
            </small>
          )}
          {m.given > 0 && <small className="rs-muted">{t.lyGiven.replace("{p}", m.given)}</small>}
          {live && !m.given && stay.bill.total > 0 && <small className="rs-muted">{t.lyWillEarn.replace("{p}", Math.floor((stay.bill.total / R.unit) * R.earn))}</small>}
          {live && !readOnly && maxUse > 0 && (
            <div className="ghly-use">
              <input type="number" min={1} max={maxUse} step={1} placeholder={String(maxUse)} value={use} onChange={(e) => setUse(e.target.value)} aria-label={t.lyUse} />
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" disabled={working || busy || !n} onClick={() => run(() => api(ctx).usePoints(ctx.id, stay._id, n))}>
                {working ? <Loader2 size={14} className="md-spin" /> : null} {n ? t.lyUseBtn.replace("{p}", n).replace("{v}", money(worth(n), cur)) : t.lyUse}
              </button>
            </div>
          )}
        </div>
      ) : find !== null ? (
        <div className="ghly-main">
          <div className="ghly-find">
            <Search size={14} />
            <input autoFocus value={find} placeholder={t.lyFind} onChange={(e) => setFind(e.target.value)} />
            <button type="button" className="md-icon-btn" onClick={() => setFind(null)} aria-label="close">
              <X size={14} />
            </button>
          </div>
          {hits.map((h) => (
            <button key={h._id} type="button" className="ghly-hit" onClick={() => run(() => api(ctx).linkMember(ctx.id, stay._id, h._id))} disabled={working}>
              <UserRound size={14} /> <b>{h.name}</b> <small className="rs-muted">{[h.phone, h.email].filter(Boolean).join(" · ")}</small> <span className="rs-pill">{t.lyPoints.replace("{n}", h.points || 0)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="ghly-main">
          <span className="rs-muted">{t.lyMember}</span>
          {live && !readOnly && (
            <button type="button" className="gh-add" onClick={() => setFind(stay.guest?.phone || "")}>
              <Link2 size={13} /> {t.lyLink}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================ REVIEWS TAB (owner) ============================
export function ReviewsTab({ ctx }) {
  const { lang, readOnly } = ctx;
  const t = x3(lang);
  const active = on(ctx, "reviews");
  const [d, setD] = useState(null);
  const [replying, setReplying] = useState(null); // { id, text }
  const load = useCallback(
    () =>
      guestHouseService
        .reviews(ctx.id)
        .then((r) => setD(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load, active]);
  const save = async (rid, body) => {
    try {
      await guestHouseService.saveReview(ctx.id, rid, body);
      load();
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "gh_reviews" });
      else ctx.notify({ type: "error", text: e.message });
    }
  };
  const hero = <Hero icon={Star} title={t.rvTitle} sub={active ? t.rvSub : t.rvOff.replace("{price}", ctx.data.addons?.gh_reviews?.price ?? "")} addon="gh_reviews" ctx={ctx} yearly />;
  if (!active)
    return (
      <div className="rs-col">
        {hero}
        <Perks ctx={ctx} addon="gh_reviews" />
      </div>
    );
  if (!d) return <ListSkeleton rows={4} />;
  return (
    <div className="rs-col">
      {hero}
      <section className="panel-card ghrv-top">
        <div className="ghrv-avg">
          <b>{d.count ? d.avg.toFixed(1) : "—"}</b>
          <Stars n={Math.round(d.avg)} size={20} />
          <small className="rs-muted">{t.rvCount.replace("{n}", d.count)}</small>
        </div>
        <div className="ghrv-bars">
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n}>
              <span>{n}★</span>
              <i>
                <em style={{ width: `${d.count ? (d.stars[n] / d.count) * 100 : 0}%` }} />
              </i>
              <small>{d.stars[n]}</small>
            </div>
          ))}
        </div>
        <label className="md-switch ghrv-auto">
          <input type="checkbox" checked={d.auto} disabled={readOnly} onChange={async (e) => (await guestHouseService.reviewSettings(ctx.id, { reviews_auto: e.target.checked }).catch(() => null), load())} />
          <span className="md-switch-track" />
          <span>{t.rvAuto}</span>
        </label>
      </section>
      {!d.items.length ? (
        <section className="panel-card ghpm-empty">
          <Star size={40} />
          <p className="rs-muted">{t.rvNone}</p>
        </section>
      ) : (
        <div className="ghrv-list">
          {d.items.map((r) => (
            <article key={r._id} className={`panel-card ghrv ${r.shown ? "shown" : ""}`}>
              <header>
                <Stars n={r.rating} />
                <b>{r.guest_name || "—"}</b>
                <small className="rs-muted">
                  {r.room_name} · {fmtDay(r.from, lang)} → {fmtDay(r.to, lang)} · {fmtTime(r.submitted_at, lang)}
                </small>
                <span className={`ghrv-tag ${r.shown ? "on" : ""}`}>{r.shown ? t.rvShown : t.rvHidden}</span>
              </header>
              {r.text && <p>“{r.text}”</p>}
              {replying?.id === r._id ? (
                <div className="ghrv-reply-edit">
                  <textarea rows={2} maxLength={500} value={replying.text} placeholder={t.rvReplyPh} onChange={(e) => setReplying({ ...replying, text: e.target.value })} autoFocus />
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setReplying(null)}>
                    <X size={14} />
                  </button>
                  <button
                    type="button"
                    className="md-btn md-btn-primary sa-btn-sm"
                    onClick={async () => {
                      await save(r._id, { reply: replying.text });
                      setReplying(null);
                    }}
                  >
                    {t.save}
                  </button>
                </div>
              ) : (
                r.reply && (
                  <blockquote>
                    <b>{t.rvReply}:</b> {r.reply}
                  </blockquote>
                )
              )}
              <div className="ghrv-actions">
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => save(r._id, { shown: !r.shown })} disabled={readOnly}>
                  {r.shown ? t.rvHide : t.rvShow}
                </button>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setReplying({ id: r._id, text: r.reply || "" })} disabled={readOnly}>
                  <MessageCircle size={14} /> {t.rvReply}
                </button>
                <button
                  type="button"
                  className="md-icon-btn"
                  aria-label={t.rvDel}
                  disabled={readOnly}
                  onClick={async () => {
                    await guestHouseService.removeReview(ctx.id, r._id).catch(() => null);
                    load();
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {d.waiting.length > 0 && (
        <section className="panel-card gh-list">
          <h3>
            {t.rvWaiting} ({d.waiting.length})
          </h3>
          {d.waiting.map((w) => (
            <div key={w._id} className="gh-line">
              <span>
                <b>{w.guest_name}</b>{" "}
                <small className="rs-muted">
                  {w.room_name} · {fmtDay(w.from, lang)} → {fmtDay(w.to, lang)}
                </small>
              </span>
              <button
                type="button"
                className="md-btn md-btn-ghost sa-btn-sm"
                onClick={async () => {
                  const url = `${window.location.origin}/r/${w.token}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    ctx.notify({ type: "success", text: t.otCopied });
                  } catch {
                    window.prompt(t.rvCopy, url);
                  }
                }}
              >
                <Copy size={14} /> {t.rvCopy}
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ============================ LOYALTY TAB (owner) ============================
export function LoyaltyTab({ ctx }) {
  const { lang, readOnly, cur } = ctx;
  const t = x3(lang);
  const active = on(ctx, "loyalty");
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const [adj, setAdj] = useState(null); // { member, points, note }
  const load = useCallback(
    () =>
      guestHouseService
        .loyalty(ctx.id)
        .then((r) => {
          setD(r.data);
          setF({ earn: String(r.data.rules.earn), redeem_points: String(r.data.rules.redeem_points), redeem_value: String(r.data.rules.redeem_value) });
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load, active]);
  const hero = <Hero icon={Gift} title={t.lyTitle} sub={active ? t.lySub : t.lyOff.replace("{price}", ctx.data.addons?.gh_loyalty?.price ?? "")} addon="gh_loyalty" ctx={ctx} yearly />;
  if (!active)
    return (
      <div className="rs-col">
        {hero}
        <Perks ctx={ctx} addon="gh_loyalty" />
      </div>
    );
  if (!d || !f) return <ListSkeleton rows={4} />;
  const unit = cur === "KHR" ? "4,000៛" : "$1";
  const ex = cur === "KHR" ? 200000 : 50;
  const dirty = ["earn", "redeem_points", "redeem_value"].some((k) => Number(f[k]) !== d.rules[k]);
  return (
    <div className="rs-col">
      {hero}
      <div className="at-tiles gh-kpis ghex-kpis">
        <div className="at-tile t-blue">
          <b>{d.totals.earned}</b>
          <small>{t.lyEarned}</small>
        </div>
        <div className="at-tile">
          <b>{d.totals.used}</b>
          <small>{t.lyUsed}</small>
        </div>
        <div className="at-tile t-ok">
          <b>{d.totals.open}</b>
          <small>{t.lyOpen}</small>
        </div>
      </div>
      <section className="panel-card">
        <h3 style={{ marginTop: 0 }}>{t.lyRules}</h3>
        <div className="ghly-rules">
          <label className="ghb-field">
            <span>{t.lyEarn.replace("{unit}", unit)}</span>
            <input type="number" min={0} step="any" value={f.earn} onChange={(e) => setF({ ...f, earn: e.target.value })} disabled={readOnly} />
          </label>
          <label className="ghb-field">
            <span>{t.lyRedeem.replace("{p}", f.redeem_points || "…")}</span>
            <div className="ghly-pair">
              <input type="number" min={1} step={1} value={f.redeem_points} onChange={(e) => setF({ ...f, redeem_points: e.target.value })} disabled={readOnly} aria-label="points" />
              <span>=</span>
              <input type="number" min={0} step="any" value={f.redeem_value} onChange={(e) => setF({ ...f, redeem_value: e.target.value })} disabled={readOnly} aria-label="value" />
            </div>
          </label>
          <button
            type="button"
            className="md-btn md-btn-primary sa-btn-sm"
            disabled={readOnly || !dirty}
            onClick={async () => {
              try {
                await guestHouseService.saveLoyalty(ctx.id, { earn: Number(f.earn), redeem_points: Number(f.redeem_points), redeem_value: Number(f.redeem_value) });
                ctx.notify({ type: "success", text: t.saved });
                load();
              } catch (e) {
                ctx.notify({ type: "error", text: e.message });
              }
            }}
          >
            {t.save}
          </button>
        </div>
        <small className="rs-muted">
          {t.lyExample
            .replace("{amt}", money(ex, cur))
            .replace("{p}", Math.floor((ex / (cur === "KHR" ? 4000 : 1)) * (Number(f.earn) || 0)))
            .replace("{rp}", f.redeem_points)
            .replace("{rv}", money(Number(f.redeem_value) || 0, cur))}
        </small>
      </section>
      <div className="gh-cols">
        <section className="panel-card gh-list">
          <h3>{t.lyMembers}</h3>
          {!d.members.length && <p className="rs-muted">{t.lyNone}</p>}
          {d.members.map((m) => (
            <div key={m._id} className="gh-line">
              <span>
                <b>{m.name}</b> <small className="rs-muted">{m.phone}</small>
              </span>
              <span className="ghly-pts">
                <span className="rs-pill ok">{t.lyPoints.replace("{n}", m.points || 0)}</span>
                <button type="button" className="md-icon-btn" onClick={() => setAdj({ member: m, points: "", note: "" })} aria-label={t.lyAdjust} disabled={readOnly}>
                  ±
                </button>
              </span>
            </div>
          ))}
        </section>
        <section className="panel-card gh-list">
          <h3>{t.lyHistory}</h3>
          {!d.recent.length && <p className="rs-muted">—</p>}
          {d.recent.map((x) => (
            <div key={x._id} className="gh-line">
              <span>
                <b>{x.name}</b>{" "}
                <small className="rs-muted">
                  {t.lyKinds[x.kind]} · {x.note} · {fmtTime(x.created_date, lang)}
                </small>
              </span>
              <b className={x.points < 0 ? "ghly-neg" : "ghly-pos"}>
                {x.points > 0 ? "+" : ""}
                {x.points}
              </b>
            </div>
          ))}
        </section>
      </div>
      {adj && (
        <Modal
          title={`${t.lyAdjust} · ${adj.member.name}`}
          onClose={() => setAdj(null)}
          footer={
            <button
              type="button"
              className="md-btn md-btn-primary"
              disabled={!Number(adj.points)}
              onClick={async () => {
                try {
                  await guestHouseService.addPoints(ctx.id, adj.member._id, { points: Math.round(Number(adj.points)), note: adj.note });
                  setAdj(null);
                  load();
                } catch (e) {
                  ctx.notify({ type: "error", text: e.message });
                }
              }}
            >
              {t.save}
            </button>
          }
        >
          <div className="ghex-form">
            <p className="rs-muted" style={{ margin: 0 }}>
              {t.lyPoints.replace("{n}", adj.member.points || 0)}
            </p>
            <label className="ghb-field">
              <span>± {t.lyPoints.replace("{n}", "")}</span>
              <input type="number" step={1} value={adj.points} placeholder="+100 / -50" onChange={(e) => setAdj({ ...adj, points: e.target.value })} autoFocus />
            </label>
            <label className="ghb-field">
              <span>{t.lyAdjustNote}</span>
              <input maxLength={200} value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} />
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
