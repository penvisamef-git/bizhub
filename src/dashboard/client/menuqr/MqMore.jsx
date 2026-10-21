import { useEffect, useState } from "react";
import { BarChart3, Check, CheckCheck, ImagePlus, Loader2, MessageSquareHeart, Palette, Pencil, Plus, Puzzle, QrCode, Star, Tag, Trash2 } from "lucide-react";
import { menuQrService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import { Field } from "../restaurant/parts";
import CoinIcon from "../../../components/CoinIcon";
import { money } from "../../../qmenu/MenuView";
import { ADDON_ICON, Head, Locked, Switch } from "./parts";
import { MediaPicker } from "./MqMedia";
import { fmt, fmtDate } from "./text";

const nameOf = (o, lang) => (lang === "en" ? o.name_en || o.name_km : o.name_km || o.name_en) || "—";
const today = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

// ============================== Sale & promotions (mq_promos) ==============================
export function PromosTab({ ctx }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const [rows, setRows] = useState(null);
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState("");
  const load = () =>
    Promise.all([menuQrService.promos(id), menuQrService.categories(id), menuQrService.items(id)])
      .then(([p, c, i]) => {
        setRows(p.data);
        setCats(c.data);
        setItems(i.data);
      })
      .catch((e) => notify({ type: "error", text: e.message }));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ctx.on("mq_promos"))
    return (
      <div className="rs-col">
        <Head icon={Tag} title={m.promosTitle} sub={m.promosSub} />
        <Locked ctx={ctx} addon="mq_promos" />
      </div>
    );
  const toggle = async (p) => {
    setBusy(p._id);
    try {
      const r = await menuQrService.savePromo(id, p._id, { active: !p.active });
      setRows((list) => list.map((x) => (x._id === p._id ? r.data : x)));
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const cur = data.settings.currency;
  const live = (p) => p.active && (!p.start_date || p.start_date <= today()) && (!p.end_date || p.end_date >= today());
  return (
    <div className="rs-col">
      <Head icon={Tag} title={m.promosTitle} sub={m.promosSub}>
        <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setEdit({})} disabled={readOnly} data-testid="mq-add-promo">
          <Plus size={15} /> {m.addPromo}
        </button>
      </Head>
      {!rows ? (
        <div className="panel-card">…</div>
      ) : !rows.length ? (
        <section className="panel-card">
          <p className="rs-muted">{m.noPromos}</p>
        </section>
      ) : (
        <div className="mq-promo-list">
          {rows.map((p) => (
            <section key={p._id} className={`panel-card mq-promo ${p.active ? "" : "off"}`} data-testid="mq-promo">
              {p.photo?.url ? <img src={p.photo.url} alt="" className="mq-promo-pic" /> : <span className="mq-promo-pic none">{p.kind === "percent" ? `${p.value}%` : p.kind === "amount" ? money(p.value, cur) : "📣"}</span>}
              <div className="mq-promo-text">
                <b>{lang === "en" ? p.title_en || p.title_km : p.title_km || p.title_en}</b>
                <small className="rs-muted">
                  {m.kinds[p.kind]}
                  {p.kind !== "banner" ? ` · ${p.kind === "percent" ? `${p.value}%` : money(p.value, cur)}` : ""} ·{" "}
                  {p.all_items ? m.allItems : p.category_ids?.length ? `${m.someCats} (${p.category_ids.length})` : p.item_ids?.length ? `${m.someItems} (${p.item_ids.length})` : "—"}
                </small>
                <small className="rs-muted">
                  {p.start_date || p.end_date ? `${p.start_date || "…"} → ${p.end_date || "…"}` : ""}
                  {p.days?.length ? ` · ${p.days.map((d) => m.dayNames[d]).join(" ")}` : ""}
                  {p.from && p.to ? ` · ${p.from}–${p.to}` : ""}
                </small>
                {live(p) && <em className="rs-pill on">{m.running}</em>}
              </div>
              <div className="mq-promo-acts">
                <Switch checked={p.active} onChange={() => toggle(p)} label={busy === p._id ? "…" : p.active ? m.active : m.off} disabled={readOnly || busy === p._id} />
                <button type="button" className="md-icon-btn" onClick={() => setEdit(p)} disabled={readOnly} aria-label={m.edit}>
                  <Pencil size={14} />
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
      {edit && <PromoModal ctx={ctx} promo={edit} cats={cats} items={items} onClose={() => setEdit(null)} onSaved={() => (setEdit(null), load())} />}
    </div>
  );
}

function PromoModal({ ctx, promo, cats, items, onClose, onSaved }) {
  const { id, m, lang, readOnly } = ctx;
  const [f, setF] = useState(() => ({
    title_km: promo.title_km || "",
    title_en: promo.title_en || "",
    note: promo.note || "",
    kind: promo.kind || "percent",
    value: promo.value ?? 10,
    scope: promo.all_items ? "all" : promo.item_ids?.length ? "items" : promo.category_ids?.length ? "cats" : "all",
    category_ids: (promo.category_ids || []).map(String),
    item_ids: (promo.item_ids || []).map(String),
    start_date: promo.start_date || "",
    end_date: promo.end_date || "",
    days: promo.days || [],
    from: promo.from || "",
    to: promo.to || "",
    active: promo.active !== false,
  }));
  const [file, setFile] = useState(null); // a picture chosen in the media library
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const toggleIn = (k, v) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });
  const save = async () => {
    setBusy("save");
    setError("");
    const body = {
      title_km: f.title_km,
      title_en: f.title_en,
      note: f.note,
      kind: f.kind,
      value: Number(f.value) || 0,
      all_items: f.scope === "all",
      category_ids: f.scope === "cats" ? f.category_ids : [],
      item_ids: f.scope === "items" ? f.item_ids : [],
      start_date: f.start_date,
      end_date: f.end_date,
      days: f.days,
      from: f.from && f.to ? f.from : "",
      to: f.from && f.to ? f.to : "",
      active: f.active,
    };
    try {
      const r = promo._id ? await menuQrService.savePromo(id, promo._id, body) : await menuQrService.addPromo(id, body);
      if (file) await menuQrService.usePromoPhoto(id, r.data._id, file._id);
      onSaved();
    } catch (e) {
      setError(e.message);
      setBusy("");
    }
  };
  const remove = async () => {
    if (!window.confirm(m.sure.replace("{name}", f.title_km || f.title_en))) return;
    setBusy("remove");
    try {
      await menuQrService.removePromo(id, promo._id);
      onSaved();
    } catch (e) {
      setError(e.message);
      setBusy("");
    }
  };
  const preview = file ? file.url : promo.photo?.url;
  return (
    <Modal
      title={promo._id ? m.edit : m.addPromo}
      onClose={onClose}
      busy={!!busy}
      size="md-modal-lg"
      footer={
        <>
          {promo._id && (
            <button type="button" className="md-btn md-btn-ghost sa-danger-text" style={{ marginRight: "auto" }} onClick={remove} disabled={!!busy || readOnly}>
              {busy === "remove" ? <Loader2 size={14} className="md-spin" /> : <Trash2 size={14} />} {m.delete}
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={!!busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={!!busy || readOnly || (!f.title_km.trim() && !f.title_en.trim())} data-testid="mq-promo-save">
            {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {m.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <div className="md-fields-grid">
          <Field label={m.titleKm}>
            <input value={f.title_km} maxLength={80} onChange={(e) => setF({ ...f, title_km: e.target.value })} autoFocus data-testid="mq-promo-km" />
          </Field>
          <Field label={m.titleEn}>
            <input value={f.title_en} maxLength={80} onChange={(e) => setF({ ...f, title_en: e.target.value })} />
          </Field>
          <Field label={m.kind}>
            <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              {Object.entries(m.kinds).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          {f.kind !== "banner" && (
            <Field label={`${m.value} ${f.kind === "percent" ? "(%)" : ""}`}>
              <input type="number" min="0" max={f.kind === "percent" ? 100 : undefined} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} data-testid="mq-promo-value" />
            </Field>
          )}
        </div>
        <Field label={m.note}>
          <input value={f.note} maxLength={200} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        {f.kind !== "banner" && (
          <Field label={m.appliesTo}>
            <div className="rs-addon-filter mq-filter">
              {[
                ["all", m.allItems],
                ["cats", m.someCats],
                ["items", m.someItems],
              ].map(([k, v]) => (
                <button key={k} type="button" className={f.scope === k ? "on" : ""} onClick={() => setF({ ...f, scope: k })}>
                  {v}
                </button>
              ))}
            </div>
            {f.scope === "cats" && (
              <div className="mq-tagpick">
                {cats.map((c) => (
                  <button key={c._id} type="button" className={f.category_ids.includes(c._id) ? "on" : ""} onClick={() => toggleIn("category_ids", c._id)}>
                    {c.icon} {nameOf(c, lang)}
                  </button>
                ))}
              </div>
            )}
            {f.scope === "items" && (
              <div className="mq-tagpick mq-scroll">
                {items.map((i) => (
                  <button key={i._id} type="button" className={f.item_ids.includes(i._id) ? "on" : ""} onClick={() => toggleIn("item_ids", i._id)}>
                    {nameOf(i, lang)}
                  </button>
                ))}
              </div>
            )}
          </Field>
        )}
        <div className="md-fields-grid">
          <Field label={m.startDate}>
            <input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
          </Field>
          <Field label={m.endDate}>
            <input type="date" value={f.end_date} min={f.start_date || undefined} onChange={(e) => setF({ ...f, end_date: e.target.value })} />
          </Field>
          <Field label={m.fromTime}>
            <input type="time" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
          </Field>
          <Field label={m.toTime}>
            <input type="time" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
          </Field>
        </div>
        <Field label={m.days} hint={!f.days.length ? m.everyDay : null}>
          <div className="mq-tagpick">
            {m.dayNames.map((d, i) => (
              <button key={d} type="button" className={f.days.includes(i) ? "on" : ""} onClick={() => setF({ ...f, days: f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i].sort() })}>
                {d}
              </button>
            ))}
          </div>
        </Field>
        <Field label={m.banner}>
          <button type="button" className="mq-banner-pick" onClick={() => setPicking(true)} style={preview ? { backgroundImage: `url(${preview})` } : undefined}>
            {!preview && (
              <>
                <ImagePlus size={18} /> {m.addPhoto}
              </>
            )}
          </button>
          {picking && (
            <MediaPicker
              ctx={ctx}
              onClose={() => setPicking(false)}
              onPick={([x]) => {
                setFile(x);
                setPicking(false);
              }}
            />
          )}
        </Field>
        <Switch checked={f.active} onChange={(v) => setF({ ...f, active: v })} label={m.active} />
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

// ============================== Customer feedback (mq_feedback) ==============================
export function FeedbackTab({ ctx }) {
  const { id, m, lang, readOnly, notify } = ctx;
  const [res, setRes] = useState(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const load = (p = page) =>
    menuQrService
      .feedback(id, p)
      .then(setRes)
      .catch((e) => notify({ type: "error", text: e.message }));
  useEffect(() => {
    load(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  const on = ctx.on("mq_feedback");
  const readAll = async () => {
    setBusy("all");
    try {
      await menuQrService.readAllFeedback(id);
      await load();
      ctx.reload();
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const remove = async (f) => {
    if (!window.confirm(m.sure.replace("{name}", `★${f.stars}`))) return;
    setBusy(f._id);
    try {
      await menuQrService.removeFeedback(id, f._id);
      await load();
      ctx.reload();
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const unread = res?.data?.some((f) => !f.read);
  return (
    <div className="rs-col">
      <Head icon={MessageSquareHeart} title={m.fbTitle} sub={m.fbSub}>
        {unread && (
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={readAll} disabled={readOnly || !!busy} data-testid="mq-fb-readall">
            {busy === "all" ? <Loader2 size={14} className="md-spin" /> : <CheckCheck size={14} />} {m.readAll}
          </button>
        )}
      </Head>
      {!on && <Locked ctx={ctx} addon="mq_feedback" />}
      {res && res.total > 0 && (
        <section className="panel-card mq-fb-sum">
          <div className="mq-fb-avg">
            <b>{res.avg}</b>
            <span className="mq-stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={16} className={s <= Math.round(res.avg) ? "on" : ""} />
              ))}
            </span>
            <small className="rs-muted">{m.reviews.replace("{n}", fmt(res.total))}</small>
          </div>
          <div className="mq-fb-bars">
            {[5, 4, 3, 2, 1].map((s) => (
              <div key={s}>
                <small>{s}★</small>
                <i>
                  <i style={{ width: `${res.total ? (res.stars[s - 1] / res.total) * 100 : 0}%` }} />
                </i>
                <small>{res.stars[s - 1]}</small>
              </div>
            ))}
          </div>
        </section>
      )}
      {res && !res.total && on && (
        <section className="panel-card">
          <p className="rs-muted">{m.fbEmpty}</p>
        </section>
      )}
      {res?.data?.length > 0 && (
        <div className="mq-fb-list">
          {res.data.map((f) => (
            <section key={f._id} className={`panel-card mq-fb ${f.read ? "" : "new"}`} data-testid="mq-fb">
              <div className="mq-fb-top">
                <span className="mq-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={15} className={s <= f.stars ? "on" : ""} />
                  ))}
                </span>
                {!f.read && <em className="rs-pill on">{m.new}</em>}
                <small className="rs-muted">{fmtDate(f.created_date, lang)}</small>
                <button type="button" className="md-icon-btn" onClick={() => remove(f)} disabled={readOnly || !!busy} aria-label={m.delete}>
                  {busy === f._id ? <Loader2 size={14} className="md-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
              {f.text && <p>{f.text}</p>}
              {(f.name || f.phone) && (
                <small className="rs-muted">
                  {f.name}
                  {f.name && f.phone ? " · " : ""}
                  {f.phone && <a href={`tel:${f.phone}`}>{f.phone}</a>}
                </small>
              )}
            </section>
          ))}
        </div>
      )}
      {res && res.pages > 1 && (
        <div className="mq-pager">
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ‹
          </button>
          <small>
            {page} / {res.pages}
          </small>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={page >= res.pages} onClick={() => setPage(page + 1)}>
            ›
          </button>
        </div>
      )}
    </div>
  );
}

// ============================== Scan stats (mq_stats) ==============================
export function StatsTab({ ctx }) {
  const { id, m, lang, notify } = ctx;
  const [days, setDays] = useState(30);
  const [st, setSt] = useState(null);
  const on = ctx.on("mq_stats");
  useEffect(() => {
    if (!on) return;
    setSt(null);
    menuQrService
      .stats(id, days)
      .then((r) => setSt(r.data))
      .catch((e) => notify({ type: "error", text: e.message }));
  }, [id, days, on]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!on)
    return (
      <div className="rs-col">
        <Head icon={BarChart3} title={m.statsTitle} sub={m.statsSub} />
        <Locked ctx={ctx} addon="mq_stats" />
      </div>
    );
  const max = st ? Math.max(1, ...st.series.map((x) => x.scans)) : 1;
  const hmax = st ? Math.max(1, ...st.hours) : 1;
  return (
    <div className="rs-col">
      <Head icon={BarChart3} title={m.statsTitle} sub={m.statsSub}>
        <div className="rs-addon-filter mq-filter">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" className={days === d ? "on" : ""} onClick={() => setDays(d)}>
              {d}
            </button>
          ))}
        </div>
      </Head>
      {!st ? (
        <div className="panel-card">…</div>
      ) : (
        <>
          <div className="mq-kpis">
            {[
              [m.today, st.today],
              [m.total.replace("{n}", st.days), st.total],
              [m.perDay, st.avg],
              [m.allTime, st.all_time],
            ].map(([k, v]) => (
              <section key={k} className="panel-card">
                <small className="rs-muted">{k}</small>
                <b data-testid="mq-kpi">{fmt(v)}</b>
              </section>
            ))}
          </div>
          <section className="panel-card">
            {!st.total ? (
              <p className="rs-muted">{m.noStats}</p>
            ) : (
              <div className="mq-chart" aria-hidden="true">
                {st.series.map((d) => (
                  <i key={d.day} style={{ height: `${Math.max(2, (d.scans / max) * 100)}%` }} title={`${d.day} · ${d.scans}`} />
                ))}
              </div>
            )}
          </section>
          <div className="mq-two">
            <section className="panel-card">
              <h3 className="mq-h3">{m.byHour}</h3>
              <div className="mq-hours">
                {st.hours.map((n, h) => (
                  <span key={h} title={`${h}:00 · ${n}`}>
                    <i style={{ height: `${Math.max(2, (n / hmax) * 100)}%` }} />
                    <small>{h % 3 === 0 ? h : ""}</small>
                  </span>
                ))}
              </div>
            </section>
            <section className="panel-card">
              <h3 className="mq-h3">{m.topItems}</h3>
              {!st.top.length ? (
                <p className="rs-muted">{m.noStats}</p>
              ) : (
                <ol className="mq-top">
                  {st.top.map((t) => (
                    <li key={t._id}>
                      <span className="mq-thumb sm">{t.photo ? <img src={t.photo} alt="" /> : "🍽️"}</span>
                      <span>{nameOf(t, lang)}</span>
                      <small className="rs-muted">{m.opened.replace("{n}", fmt(t.opened))}</small>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

// ============================== Add-ons ==============================
export function AddonsTab({ ctx }) {
  const { m, lang, data, readOnly } = ctx;
  return (
    <div className="rs-col">
      <Head icon={Puzzle} title={m.addonsTitle} sub={m.addonsSub} />
      <div className="rs-addons">
        {Object.entries(data.addons).map(([k, a]) => {
          const Icon = ADDON_ICON[k] || Puzzle;
          return (
            <article key={k} className={`panel-card rs-addon s-${a.active ? "active" : "none"}`} data-testid={`mq-addon-${k}`}>
              <div className="rs-addon-top">
                <span className="rs-addon-ic">
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{m.addonNames[k]}</h3>
                  <span className="rs-addon-price">
                    <CoinIcon size={13} /> {fmt(a.price)} {m.coins} {a.days ? m.perYear : `· ${m.forever}`}
                  </span>
                </div>
              </div>
              <p>{m.addonWhat[k]}</p>
              <small className="rs-muted">{m.addonFree[k]}</small>
              <div className="rs-addon-foot">
                {a.active ? (
                  <span className="rs-pill on">
                    <Check size={13} /> {a.expires_at ? m.ends.replace("{date}", fmtDate(a.expires_at, lang)) : m.unlocked}
                  </span>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly}>
                    <CoinIcon size={14} /> {m.unlock.replace("{coins}", fmt(a.price))}
                  </button>
                )}
                {a.active && a.days && (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly}>
                    {m.renewFor.replace("{coins}", fmt(a.price))}
                  </button>
                )}
              </div>
            </article>
          );
        })}
        <article className="panel-card rs-addon">
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <Palette size={20} />
            </span>
            <div>
              <h3>{m.looksTitle}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(data.themes.price.basic)} / {fmt(data.themes.price.pro)} · {m.forever}
              </span>
            </div>
          </div>
          <p>{m.looksSub}</p>
          <div className="rs-addon-foot">
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("looks")}>
              {m.tabs.looks} →
            </button>
          </div>
        </article>
        <article className="panel-card rs-addon">
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <QrCode size={20} />
            </span>
            <div>
              <h3>{m.qrStyles}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(data.qr.price)} · {m.forever}
              </span>
            </div>
          </div>
          <p>{m.qrStylesSub.replace("{coins}", fmt(data.qr.price))}</p>
          <div className="rs-addon-foot">
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("qr")}>
              {m.tabs.qr} →
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
