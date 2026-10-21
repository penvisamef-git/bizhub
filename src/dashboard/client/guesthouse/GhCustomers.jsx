import { useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble, Check, ExternalLink, Eye, Globe, Lock, Mail, Phone, Save, Search, Users } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { StayModal } from "./GhStay";
import { guestHouseService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { GpThumb } from "../../../gsite/portal/GpView";
import { PORTAL_KEYS, PORTAL_LOOKS } from "../../../gsite/portal/ptext";
import { fmtDate, fmtDay, money } from "./text";
import { cuText } from "./gh2-text";
import { PayTag, RequestsList } from "./GhRequests";

// Owner: Customer accounts (gh_customers, yearly — needs the Website add-on)
export function CustomersTab({ ctx }) {
  const { lang, data, readOnly, cur } = ctx;
  const c = cuText(lang);
  const [info, setInfo] = useState(null);
  const [tab, setTab] = useState("requests");
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      guestHouseService
        .portal(ctx.id)
        .then((r) => setInfo(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load, data]);
  const save = async (patch) => {
    setBusy(true);
    try {
      const r = await guestHouseService.savePortal(ctx.id, patch);
      setInfo(r.data);
      setNote(null);
      ctx.notify({ type: "success", text: ctx.g.saved });
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "gh_portal_theme", item: e.response?.item });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  // what the look previews show: this guest house's real rooms
  const sample = useMemo(
    () => ({
      theme: "classic",
      business: { name: data.business.name, logo: data.business.logo_url || "", phone: data.business.phone || "", address: data.business.address || "" },
      currency: cur,
      check_in: data.settings.check_in,
      check_out: data.settings.check_out,
      cover: info?.site?.cover || data.settings.cover?.url || "",
      types: data.types.slice(0, 3).map((t) => ({ _id: t._id, name: t.name, price: t.price, capacity: t.capacity || 2, beds: t.beds || "", color: t.color })),
      promos: [],
    }),
    [data, cur, info?.site?.cover],
  );
  if (!info) return <ListSkeleton rows={4} />;
  const on = !!info.addon.active;
  const link = info.site.slug ? `${window.location.origin}/g/${info.site.slug}/account` : "";
  return (
    <div className="rs-col">
      <section className="panel-card ghpr-hero">
        <span className="rs-addon-ic">
          <Users size={24} />
        </span>
        <div>
          <h2 style={{ margin: 0 }}>{c.title}</h2>
          <p className="rs-muted" style={{ margin: "4px 0 0" }}>
            {!info.website ? c.needWebsite : on ? c.on.replace("{date}", fmtDate(info.addon.expires_at, lang)) : `${c.sub} ${c.off.replace("{price}", info.addon.price)}`}
          </p>
        </div>
        {!info.website ? (
          <button type="button" className="md-btn md-btn-primary" onClick={() => ctx.go("website")}>
            <Globe size={15} /> {c.goWebsite}
          </button>
        ) : (
          (!on || info.addon.status === "expiring") && (
            <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon: "gh_customers" })} disabled={readOnly}>
              <CoinIcon size={15} /> {on ? c.renew : c.unlock.replace("{coins}", info.addon.price)}
            </button>
          )
        )}
      </section>

      {on && (
        <section className="panel-card ghc-set">
          <div className="ghc-set-row">
            <div className="ghw-pub">
              <button type="button" className={`ghw-switch ${info.portal_on ? "on" : ""}`} role="switch" aria-checked={info.portal_on} onClick={() => save({ portal_on: !info.portal_on })} disabled={readOnly || busy}>
                <i />
              </button>
              <span>
                <b>{info.portal_on ? c.open : c.closed}</b>
                <small className="rs-muted">{info.portal_on ? c.openSub : c.closedSub}</small>
              </span>
            </div>
            {link && info.site.published && (
              <a className="md-btn md-btn-ghost sa-btn-sm" href={link} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> {c.portalLink}
              </a>
            )}
          </div>
          <label className="ghw-in">
            <small className="ghw-label">{c.note}</small>
            <span className="ghc-note">
              <input value={note ?? info.note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={c.notePh} disabled={readOnly} />
              {note !== null && note !== info.note && (
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => save({ note })} disabled={busy}>
                  <Save size={14} /> {c.save}
                </button>
              )}
            </span>
          </label>
        </section>
      )}

      <div className="ghw-tabs" role="tablist">
        {["requests", "customers", "looks"].map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {c.tabs[k]}
            {k === "requests" && info.counts.pending > 0 && <em>{info.counts.pending}</em>}
            {k === "customers" && <small className="ghc-n">{info.counts.customers}</small>}
          </button>
        ))}
      </div>

      {tab === "requests" && (
        <section className="panel-card">
          <RequestsList api={guestHouseService} id={ctx.id} lang={lang} cur={cur} notify={ctx.notify} readOnly={readOnly} onChange={load} />
        </section>
      )}
      {tab === "customers" && <CustomerList ctx={ctx} c={c} />}
      {tab === "looks" && (
        <section className="panel-card">
          <h2 style={{ margin: 0 }}>{c.looksTitle}</h2>
          <p className="rs-muted" style={{ margin: "6px 0 16px" }}>
            {c.looksSub.replace("{price}", info.themes.price)}
          </p>
          <div className="ghw-looks ghc-looks">
            {PORTAL_KEYS.map((k) => {
              const owned = k === "classic" || info.themes.owned.includes(k);
              const current = info.themes.current === k;
              return (
                <article key={k} className={`ghw-look ${current ? "on" : ""}`} data-look={k}>
                  <GpThumb info={sample} theme={k} lang={lang} />
                  {!owned && (
                    <span className="ghl-lock">
                      <Lock size={12} />
                    </span>
                  )}
                  {k === "classic" && <span className="ghl-free">{ctx.g.free}</span>}
                  <div className="ghw-look-meta">
                    <b>{PORTAL_LOOKS[k][lang === "km" ? "km" : "en"]}</b>
                  </div>
                  <div className="ghw-look-act">
                    {current ? (
                      <span className="rs-pill ok">
                        <Check size={12} /> {c.inUse}
                      </span>
                    ) : owned ? (
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => save({ theme: k })} disabled={readOnly || busy}>
                        {c.use}
                      </button>
                    ) : (
                      <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "gh_portal_theme", item: k })} disabled={readOnly}>
                        <CoinIcon size={13} /> {info.themes.price}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function CustomerList({ ctx, c }) {
  const { lang, readOnly } = ctx;
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [open, setOpen] = useState(null); // customer id
  const load = useCallback(
    (p = 1) =>
      guestHouseService
        .customers(ctx.id, { q, page: p })
        .then((r) => {
          setRows((old) => (p === 1 ? r.data : [...(old || []), ...r.data]));
          setPage(p);
          setPages(r.pagination.totalPages);
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id, q], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    const t = setTimeout(() => load(1), 300);
    return () => clearTimeout(t);
  }, [load]);
  const block = async (r) => {
    try {
      await guestHouseService.setCustomer(ctx.id, r._id, { blocked: !r.blocked });
      load(1);
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  return (
    <section className="panel-card">
      <label className="ghc-search">
        <Search size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.search} />
      </label>
      {!rows ? (
        <ListSkeleton rows={3} />
      ) : !rows.length ? (
        <p className="rs-muted ghq-empty">{c.noCustomers}</p>
      ) : (
        <div className="ghc-list">
          {rows.map((r) => (
            <article key={r._id} className={`ghc-row ${r.blocked ? "off" : ""}`}>
              <button type="button" className="ghc-av" onClick={() => setOpen(r._id)} aria-label={c.view}>
                {r.name.slice(0, 1).toUpperCase()}
              </button>
              <div className="ghc-main">
                <b>
                  {r.name} {r.blocked && <span className="ghq-state s-declined">{c.blocked}</span>}
                </b>
                <span className="ghq-line">
                  <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}>
                    <Phone size={13} /> {r.phone}
                  </a>
                  <a href={`mailto:${r.email}`}>
                    <Mail size={13} /> {r.email}
                  </a>
                </span>
                <small className="rs-muted">
                  {c.joined.replace("{date}", fmtDate(r.created_date, lang))} · {c.reqs.replace("{n}", r.requests)}
                </small>
              </div>
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setOpen(r._id)}>
                <Eye size={14} /> {c.view}
              </button>
              <button type="button" className={`md-btn md-btn-ghost sa-btn-sm ${r.blocked ? "" : "sa-danger-text"}`} onClick={() => block(r)} disabled={readOnly}>
                {r.blocked ? c.unblock : c.block}
              </button>
            </article>
          ))}
          {page < pages && (
            <button type="button" className="md-btn md-btn-ghost" onClick={() => load(page + 1)}>
              {c.more}
            </button>
          )}
        </div>
      )}
      {open && (
        <CustomerDetail
          ctx={ctx}
          c={c}
          cid={open}
          onClose={() => setOpen(null)}
          onBlock={async (row) => {
            await block(row);
          }}
        />
      )}
    </section>
  );
}

// one customer: all their details + every booking they asked for
const TONE = { pending: "wait", accepted: "ok", confirmed: "ok", staying: "live", done: "done", declined: "bad", cancelled: "done", no_show: "bad" };
function CustomerDetail({ ctx, c, cid, onClose, onBlock }) {
  const { lang, cur, readOnly } = ctx;
  const [d, setD] = useState(null);
  const [stay, setStay] = useState(null);
  const load = useCallback(
    () =>
      guestHouseService
        .customer(ctx.id, cid)
        .then((r) => setD(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id, cid], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load]);
  const cu = d?.customer;
  return (
    <>
      <Modal
        title={c.details}
        size="lg"
        onClose={onClose}
        footer={
          cu && (
            <button
              type="button"
              className={`md-btn md-btn-ghost ${cu.blocked ? "" : "sa-danger-text"}`}
              onClick={async () => {
                await onBlock(cu);
                load();
              }}
              disabled={readOnly}
            >
              {cu.blocked ? c.unblock : c.block}
            </button>
          )
        }
      >
        {!d ? (
          <ListSkeleton rows={4} />
        ) : (
          <div className="ghcd">
            <div className="ghcd-head">
              <span className="ghc-av big">{cu.name.slice(0, 1).toUpperCase()}</span>
              <div className="ghcd-id">
                <b>
                  {cu.name} {cu.blocked && <span className="ghq-state s-declined">{c.blocked}</span>}
                </b>
                <a href={`tel:${cu.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone size={14} /> {cu.phone}
                </a>
                <a href={`mailto:${cu.email}`}>
                  <Mail size={14} /> {cu.email}
                </a>
                <small className="rs-muted">
                  {c.joined.replace("{date}", fmtDate(cu.created_date, lang))} · {c.lastLogin.replace("{date}", cu.last_login ? fmtDate(cu.last_login, lang) : c.never)}
                </small>
              </div>
            </div>
            <div className="ghcd-stats">
              {[
                ["requests", d.stats.requests],
                ["accepted", d.stats.accepted],
                ["pending", d.stats.pending],
                ["nights", d.stats.nights],
                ["spent", money(d.stats.spent, cur)],
                ["owed", money(d.stats.owed, cur)],
              ].map(([k, v]) => (
                <div key={k} className={`k-${k}`}>
                  <b>{v}</b>
                  <small>{c.stats[k]}</small>
                </div>
              ))}
            </div>
            <h4 className="ghcd-h">{c.allBookings}</h4>
            {!d.bookings.length ? (
              <p className="rs-muted">{c.noBookings}</p>
            ) : (
              <div className="ghcd-list">
                {d.bookings.map((b) => (
                  <article key={b._id} className={`ghcd-bk tone-${TONE[b.state] || "done"}`}>
                    <div className="ghq-when">
                      <b>{fmtDay(b.from, lang)}</b>
                      <span>→ {fmtDay(b.to, lang)}</span>
                      <small>{c.nights.replace("{n}", b.nights)}</small>
                    </div>
                    <div className="ghq-main">
                      <div className="ghq-top">
                        <b>
                          <BedDouble size={15} /> {b.type_name}
                          {b.stay?.room ? ` · ${c.room.replace("{r}", b.stay.room)}` : ""}
                          {b.stay?.no ? ` · ${b.stay.no}` : ""}
                        </b>
                        <span className={`ghcd-chip tone-${TONE[b.state] || "done"}`}>{c.bstates[b.state] || b.state}</span>
                      </div>
                      <span className="rs-muted">
                        {c.guests.replace("{a}", b.adults || 1).replace("{c}", b.children ? c.kids.replace("{n}", b.children) : "")} · {c.asked.replace("{date}", fmtDate(b.created_date, lang))}
                        {b.decided_by ? ` · ${c.by.replace("{name}", b.decided_by)}` : ""}
                      </span>
                      {b.stay ? (
                        <span className="ghcd-bill">
                          {c.total} <b>{money(b.stay.total, cur)}</b> · {c.paid} <b>{money(b.stay.paid, cur)}</b>
                          {b.stay.balance > 0 && (
                            <>
                              {" "}
                              · {c.balance} <b className="owe">{money(b.stay.balance, cur)}</b>
                            </>
                          )}
                        </span>
                      ) : (
                        b.estimate > 0 && <span className="rs-muted">{c.estimate.replace("{v}", money(b.estimate, cur))}</span>
                      )}
                      <PayTag c={c} r={b} cur={cur} />
                      {b.note && <p className="ghq-note">“{b.note}”</p>}
                      {b.reason && <p className="ghq-note">✕ {b.reason}</p>}
                    </div>
                    {b.stay_id && (
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setStay(b.stay_id)}>
                        {c.openBooking}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
      {stay && (
        <StayModal
          ctx={ctx}
          stayId={stay}
          onClose={() => {
            setStay(null);
            load();
          }}
          onChanged={load}
        />
      )}
    </>
  );
}
