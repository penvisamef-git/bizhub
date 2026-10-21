import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { createPortal } from "react-dom";
import { BadgeCheck, Check, ChefHat, Copy, Download, ExternalLink, Gift, Lock, Pencil, Plus, Printer, Search, Star, Ticket, UserPlus } from "lucide-react";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import { POINTS_THEMES, themeDesc, themeName } from "../../../pos/themes";
import "../../../public/member.css";
import { restaurantService } from "../../../api/services";
import { PUBLIC_SITE_URL } from "../../../config";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { Modal } from "../../super_admin/parts";
import { AddonPrompt, DeleteButton, Field } from "./parts";
import { fmtMoney } from "./text";
import { useRwText } from "./rw-text";
import { useExtrasText } from "./extras-text";

const nameOf = (x, lang) => (lang === "km" ? x?.name_km || x?.name_en : x?.name_en || x?.name_km) || "—";
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const day = (d) => (d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "—");
const KIND_ICON = { free_item: Gift, amount: Ticket, percent: Ticket, gift: Gift, coupon: Ticket };

// Reward points (add-on): overview, members, the rewards catalogue and the points rules
export default function RewardsTab({ ctx }) {
  const { settings, readOnly, lang } = ctx;
  const w = useRwText();
  const c = settings.currency || "USD";
  const [data, setData] = useState(null);
  const [view, setView] = useState("overview");
  const load = useCallback(() => restaurantService.rewards.get(ctx.id).then((res) => setData(res.data)), [ctx.id]);
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <ListSkeleton rows={4} />;
  const on = data.active;
  const save = async (patch) => {
    try {
      const res = await restaurantService.rewards.save(ctx.id, patch);
      setData((d) => ({ ...d, settings: res.data }));
      ctx.notify({ type: "success", text: w.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };

  return (
    <div className="rs-col">
      <section className="panel-card pt-hero">
        <span className="pt-ic">
          <Star size={26} />
        </span>
        <div>
          <h2>{w.title}</h2>
          <p className="rs-muted">{w.sub}</p>
        </div>
        {on && (
          <label className="md-switch to-main-switch" title={w.on}>
            <input type="checkbox" checked={data.settings.enabled} onChange={(e) => save({ enabled: e.target.checked })} disabled={readOnly} aria-label={w.on} />
            <span className="md-switch-track" />
          </label>
        )}
      </section>

      {!on ? (
        <>
          <section className="panel-card">
            <AddonPrompt addonKey="rest_rewards" ctx={ctx} />
          </section>
          <How w={w} />
        </>
      ) : (
        <>
          <div className="rp-views to-views" role="tablist">
            {Object.keys(w.views).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>
                {w.views[v]}
              </button>
            ))}
          </div>
          {view === "overview" && <Overview data={data} w={w} c={c} onOpen={() => setView("members")} />}
          {view === "members" && <Members ctx={ctx} w={w} c={c} onChanged={load} />}
          {view === "rewards" && <Rewards ctx={ctx} w={w} c={c} items={data.items} lang={lang} />}
          {view === "rules" && <Rules ctx={ctx} w={w} c={c} data={data} save={save} reload={load} />}
          {view === "page" && <CustomerPage ctx={ctx} w={w} data={data} reload={load} />}
        </>
      )}
    </div>
  );
}

function How({ w }) {
  return (
    <section className="panel-card">
      <h2>{w.howTitle}</h2>
      <ol className="to-how">
        {w.how.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ol>
    </section>
  );
}

function Overview({ data, w, c, onOpen }) {
  const s = data.summary;
  return (
    <>
      <div className="rw-kpis">
        {[
          [w.members, fmt(s.members)],
          [w.new30, fmt(s.new_30d)],
          [w.given30, fmt(s.given_30d)],
          [w.used30, fmt(s.used_30d)],
          [w.balance, fmt(s.balance)],
        ].map(([k, v]) => (
          <div key={k} className="panel-card rw-kpi">
            <small>{k}</small>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <section className="panel-card">
        <h2>{w.top}</h2>
        {data.top.length === 0 ? (
          <p className="rs-muted">{w.noMembers}</p>
        ) : (
          <table className="rw-table">
            <thead>
              <tr>
                <th>{w.colName}</th>
                <th>{w.colPoints}</th>
                <th>{w.colSpent}</th>
                <th>{w.colVisits}</th>
                <th>{w.colLast}</th>
              </tr>
            </thead>
            <tbody>
              {data.top.map((m) => (
                <tr key={m._id} onClick={onOpen}>
                  <td>
                    <b>{m.name || "—"}</b>
                    <small>{m.phone}</small>
                  </td>
                  <td>{fmt(m.points)}</td>
                  <td>{fmtMoney(m.total_spent, c)}</td>
                  <td>{m.visits}</td>
                  <td>{day(m.last_visit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <How w={w} />
    </>
  );
}

function Members({ ctx, w, c, onChanged }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(null);
  const [pages, setPages] = useState(1);
  const [open, setOpen] = useState(null); // member id | "new"
  const load = useCallback(
    () =>
      restaurantService.rewards
        .members(ctx.id, { q, sort, page })
        .then((res) => {
          setRows(res.data);
          setPages(res.pagination?.totalPages || 1);
        })
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id, q, sort, page], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <section className="panel-card">
      <div className="rw-bar">
        <div className="rp-search">
          <Search size={15} />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={w.search}
            aria-label={w.search}
          />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="sort">
          {Object.entries(w.sort).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span style={{ flex: 1 }} />
        <button type="button" className="md-btn md-btn-ghost" onClick={() => restaurantService.rewards.exportCsv(ctx.id).catch((e) => ctx.notify({ type: "error", text: e.message }))}>
          <Download size={16} /> {w.export}
        </button>
        <button type="button" className="md-btn md-btn-primary" onClick={() => setOpen("new")} disabled={ctx.readOnly}>
          <UserPlus size={16} /> {w.addMember}
        </button>
      </div>
      {!rows ? (
        <ListSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <p className="rs-muted">{w.noMembers}</p>
      ) : (
        <table className="rw-table">
          <thead>
            <tr>
              <th>{w.colName}</th>
              <th>{w.colPoints}</th>
              <th>{w.colSpent}</th>
              <th>{w.colVisits}</th>
              <th>{w.colLast}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m._id} onClick={() => setOpen(m._id)} className={m.active ? "" : "off"}>
                <td>
                  <b>{m.name || "—"}</b>
                  <small>{m.phone}</small>
                </td>
                <td>{fmt(m.points)}</td>
                <td>{fmtMoney(m.total_spent, c)}</td>
                <td>{m.visits}</td>
                <td>{day(m.last_visit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pages > 1 && (
        <div className="rw-pages">
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ‹
          </button>
          <span>
            {page} / {pages}
          </span>
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            ›
          </button>
        </div>
      )}
      {open && (
        <MemberModal
          ctx={ctx}
          w={w}
          c={c}
          id={open}
          onClose={() => setOpen(null)}
          onSaved={() => {
            load();
            onChanged();
          }}
        />
      )}
    </section>
  );
}

function MemberModal({ ctx, w, c, id, onClose, onSaved }) {
  const { r } = ctx;
  const isNew = id === "new";
  const [info, setInfo] = useState(null);
  const [f, setF] = useState({ name: "", phone: "", birthday: "", note: "", active: true });
  const [adj, setAdj] = useState({ points: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [sure, setSure] = useState(false);
  const load = useCallback(() => {
    if (isNew) return;
    restaurantService.rewards
      .member(ctx.id, id)
      .then((res) => {
        setInfo(res.data);
        const m = res.data.member;
        setF({ name: m.name, phone: m.phone, birthday: m.birthday || "", note: m.note || "", active: m.active });
      })
      .catch((e) => setError(e.message));
  }, [ctx.id, id, isNew]);
  useEffect(load, [load]);
  const link = info ? `${PUBLIC_SITE_URL}/public/member/${info.member.token}` : "";
  useEffect(() => {
    if (link) QRCode.toDataURL(link, { width: 260, margin: 1 }).then(setQr);
  }, [link]);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      if (isNew) await restaurantService.rewards.addMember(ctx.id, f);
      else await restaurantService.rewards.updateMember(ctx.id, id, f);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    setBusy(true);
    setError("");
    try {
      await restaurantService.rewards.reset(ctx.id, id, adj.note.trim());
      setAdj({ points: "", note: "" });
      setSure(false);
      load();
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const adjust = async () => {
    setBusy(true);
    setError("");
    try {
      await restaurantService.rewards.adjust(ctx.id, id, Number(adj.points), adj.note.trim());
      setAdj({ points: "", note: "" });
      load();
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <Modal
      title={isNew ? w.addMember : f.name || f.phone}
      onClose={onClose}
      busy={busy}
      size="md-modal-lg"
      footer={
        <>
          <span style={{ flex: 1 }} />
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {r.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || !f.phone || ctx.readOnly}>
            {w.save}
          </button>
        </>
      }
    >
      {!isNew && info && (
        <div className="rw-member-top">
          <div className="rw-points">
            <Star size={20} />
            <b>{fmt(info.member.points)}</b>
            <small>
              {w.colPoints} · {info.member.visits} {w.colVisits.toLowerCase()} · {fmtMoney(info.member.total_spent, c)}
            </small>
          </div>
          {qr && (
            <div className="rw-qr">
              <img src={qr} alt="" />
              <div>
                <b>{w.memberPage}</b>
                <small className="rs-muted">{w.memberPageHint}</small>
                <button
                  type="button"
                  className="md-btn md-btn-ghost sa-btn-sm"
                  onClick={() =>
                    navigator.clipboard?.writeText(link).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    })
                  }
                >
                  <Copy size={14} /> {copied ? w.copied : w.copy}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="md-fields-grid">
        <Field label={w.name} htmlFor="rw-name">
          <input id="rw-name" value={f.name} onChange={set("name")} maxLength={60} />
        </Field>
        <Field label={w.phone} htmlFor="rw-phone">
          <input id="rw-phone" type="tel" value={f.phone} onChange={set("phone")} maxLength={20} />
        </Field>
        <Field label={w.birthday} hint={w.birthdayHint} htmlFor="rw-bd">
          <input id="rw-bd" value={f.birthday} onChange={set("birthday")} maxLength={10} placeholder="03-14" />
        </Field>
        <Field label={w.note} htmlFor="rw-note">
          <input id="rw-note" value={f.note} onChange={set("note")} maxLength={200} />
        </Field>
      </div>
      {!isNew && (
        <label className="tg-toggle">
          <span>
            <b>{w.off}</b>
          </span>
          <span className="md-switch">
            <input type="checkbox" checked={!f.active} onChange={(e) => setF({ ...f, active: !e.target.checked })} aria-label={w.off} />
            <span className="md-switch-track" />
          </span>
        </label>
      )}
      {!isNew && info && (
        <>
          <div className="rw-adjust">
            <b>{w.adjust}</b>
            <div className="rw-adjust-row">
              <input type="number" value={adj.points} onChange={(e) => setAdj({ ...adj, points: e.target.value })} placeholder={w.adjustHint} aria-label={w.adjust} />
              <input value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} placeholder={w.reasonPh} aria-label={w.reason} maxLength={120} />
              <button type="button" className="md-btn md-btn-ghost" onClick={adjust} disabled={busy || !Number(adj.points) || !adj.note.trim() || ctx.readOnly}>
                {w.apply}
              </button>
            </div>
            <div className="rw-reset">
              <small className="rs-muted">{w.resetHint}</small>
              {sure ? (
                <button type="button" className="md-btn md-btn-danger sa-btn-sm" onClick={reset} disabled={busy || !adj.note.trim() || ctx.readOnly} onBlur={() => setSure(false)} autoFocus>
                  {w.resetSure.replace("{n}", fmt(info.member.points))}
                </button>
              ) : (
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setSure(true)} disabled={busy || !info.member.points || !adj.note.trim() || ctx.readOnly} title={!adj.note.trim() ? w.needReason : ""}>
                  {w.resetOne}
                </button>
              )}
            </div>
          </div>
          {info.coupons.length > 0 && (
            <div className="rw-list">
              <b>{w.coupons}</b>
              {info.coupons.map((cp) => (
                <div key={cp.id}>
                  <span>
                    <Ticket size={14} /> {cp.name}
                  </span>
                  <code>{cp.code}</code>
                </div>
              ))}
            </div>
          )}
          <div className="rw-list">
            <b>{w.history}</b>
            {info.moves.map((m) => (
              <div key={m._id}>
                <span>
                  {w.moveKinds[m.kind] || m.kind}
                  {m.reward_name ? ` · ${m.reward_name}` : ""}
                  {m.order_number ? ` · #${m.order_number}` : ""}
                  {m.note ? ` · ${m.note}` : ""}
                  <small className="rs-muted"> · {day(m.created_date)}</small>
                </span>
                <b className={m.points > 0 ? "plus" : "minus"}>
                  {m.points > 0 ? "+" : ""}
                  {fmt(m.points)}
                </b>
              </div>
            ))}
          </div>
        </>
      )}
      {error && <p className="md-form-error">{error}</p>}
    </Modal>
  );
}

function Rewards({ ctx, w, c, items, lang }) {
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = useCallback(() => restaurantService.list(ctx.id, "reward-list").then((res) => setRows(res.data)), [ctx.id]);
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  const itemName = (id) =>
    nameOf(
      items.find((i) => i._id === id),
      lang,
    );
  const what = (x) => {
    const k = x.kind === "coupon" ? x.coupon_kind : x.kind;
    const v = k === "amount" ? `−${fmtMoney(x.value, c)}` : k === "percent" ? `−${x.value}%` : k === "free_item" ? itemName(x.item_id) : "";
    return x.kind === "coupon" ? `${w.kinds.coupon}: ${v}` : v || w.kinds[x.kind];
  };
  const idea = (k) =>
    ({
      coffee: { name: w.ideaCoffee.split(" · ")[0], kind: "free_item", points: 50, item_id: items[0]?._id || "" },
      dollar: { name: w.ideaDollar.split(" · ")[0], kind: "amount", points: 30, value: c === "KHR" ? 8000 : 2 },
      pct: { name: w.ideaPct.split(" · ")[0], kind: "percent", points: 80, value: 10 },
      gift: { name: w.ideaGift.split(" · ")[0], kind: "gift", points: 150 },
    })[k];
  if (!rows) return <ListSkeleton rows={3} />;
  return (
    <>
      <section className="panel-card">
        <div className="rw-bar">
          <h2 style={{ margin: 0 }}>{w.views.rewards}</h2>
          <span style={{ flex: 1 }} />
          <button type="button" className="md-btn md-btn-primary" onClick={() => setEdit({ name: "", kind: "free_item", points: 50, item_id: "", value: 0, coupon_kind: "amount", note: "", active: true })} disabled={ctx.readOnly}>
            <Plus size={16} /> {w.addReward}
          </button>
        </div>
        {rows.length === 0 && <p className="rs-muted">{w.noRewards}</p>}
        <div className="pm-ideas" style={{ marginTop: 10 }}>
          {[
            ["coffee", w.ideaCoffee],
            ["dollar", w.ideaDollar],
            ["pct", w.ideaPct],
            ["gift", w.ideaGift],
          ].map(([k, label]) => (
            <button key={k} type="button" className="pm-idea" onClick={() => setEdit({ coupon_kind: "amount", note: "", active: true, value: 0, item_id: "", ...idea(k) })} disabled={ctx.readOnly}>
              <Gift size={16} /> {label}
            </button>
          ))}
        </div>
      </section>
      {rows.length > 0 && (
        <div className="rw-rewards">
          {rows.map((x) => {
            const Icon = KIND_ICON[x.kind] || Gift;
            return (
              <article key={x._id} className={`panel-card rw-reward ${x.active ? "" : "off"}`}>
                <span className="rw-reward-ic">
                  <Icon size={20} />
                </span>
                <div>
                  <b>{x.name}</b>
                  <small className="rs-muted">{what(x)}</small>
                </div>
                <span className="rw-cost">
                  <Star size={13} /> {fmt(x.points)}
                </span>
                <button type="button" className="md-icon-btn" onClick={() => setEdit(x)} aria-label={w.edit} disabled={ctx.readOnly}>
                  <Pencil size={15} />
                </button>
              </article>
            );
          })}
        </div>
      )}
      <p className="rs-muted">{w.oneMoneyOff}</p>
      {edit && <RewardModal ctx={ctx} w={w} c={c} items={items} lang={lang} row={edit} onClose={() => setEdit(null)} onSaved={() => (setEdit(null), load())} />}
    </>
  );
}

function RewardModal({ ctx, w, c, items, lang, row, onClose, onSaved }) {
  const { r } = ctx;
  const [f, setF] = useState(row);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const effect = f.kind === "coupon" ? f.coupon_kind : f.kind;
  const save = async () => {
    setBusy(true);
    setError("");
    const body = {
      name: f.name,
      kind: f.kind,
      points: Number(f.points) || 0,
      item_id: effect === "free_item" ? f.item_id : "",
      value: ["amount", "percent"].includes(effect) ? Number(f.value) || 0 : 0,
      coupon_kind: f.kind === "coupon" ? f.coupon_kind : "",
      note: f.note,
      active: f.active,
    };
    try {
      if (row._id) await restaurantService.update(ctx.id, "reward-list", row._id, body);
      else await restaurantService.create(ctx.id, "reward-list", body);
      onSaved();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await restaurantService.remove(ctx.id, "reward-list", row._id);
      onSaved();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={row._id ? w.edit : w.addReward}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {row._id && <DeleteButton onDelete={remove} r={r} disabled={busy} />}
          <span style={{ flex: 1 }} />
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {r.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || !f.name.trim() || !(Number(f.points) > 0)}>
            {w.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <Field label={w.name} htmlFor="rwd-name">
          <input id="rwd-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} />
        </Field>
        <div className="rp-views pm-kinds rw-kinds">
          {Object.keys(w.kinds).map((k) => (
            <button key={k} type="button" className={f.kind === k ? "on" : ""} onClick={() => setF({ ...f, kind: k })}>
              {w.kinds[k]}
            </button>
          ))}
        </div>
        <small className="rs-muted">{w.kindHint[f.kind]}</small>
        <Field label={w.pointsCost} htmlFor="rwd-pts">
          <input id="rwd-pts" type="number" min="1" value={f.points} onChange={(e) => setF({ ...f, points: e.target.value })} />
        </Field>
        {f.kind === "coupon" && (
          <Field label={w.couponGives} htmlFor="rwd-ck">
            <select id="rwd-ck" value={f.coupon_kind} onChange={(e) => setF({ ...f, coupon_kind: e.target.value })}>
              {["amount", "percent", "free_item"].map((k) => (
                <option key={k} value={k}>
                  {w.kinds[k]}
                </option>
              ))}
            </select>
          </Field>
        )}
        {effect === "free_item" && (
          <Field label={w.item} htmlFor="rwd-item">
            <select id="rwd-item" value={f.item_id} onChange={(e) => setF({ ...f, item_id: e.target.value })}>
              <option value="">{w.pickItem}</option>
              {items.map((i) => (
                <option key={i._id} value={i._id}>
                  {nameOf(i, lang)} · {fmtMoney(i.price, c)}
                </option>
              ))}
            </select>
          </Field>
        )}
        {(effect === "amount" || effect === "percent") && (
          <Field label={effect === "percent" ? w.percentV : `${w.value} (${c === "KHR" ? "៛" : "$"})`} htmlFor="rwd-v">
            <input id="rwd-v" type="number" min="0" step={effect === "percent" ? 1 : c === "KHR" ? 100 : 0.25} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
          </Field>
        )}
        <label className="tg-toggle">
          <span>
            <b>{w.active}</b>
          </span>
          <span className="md-switch">
            <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} aria-label={w.active} />
            <span className="md-switch-track" />
          </span>
        </label>
      </div>
      {error && <p className="md-form-error">{error}</p>}
    </Modal>
  );
}

function Rules({ ctx, w, c, data, save, reload }) {
  const s = data.settings;
  const [f, setF] = useState({ points_per_step: s.points_per_step, min_bill: s.min_bill });
  const [pts, setPts] = useState(() => Object.fromEntries(data.items.map((i) => [i._id, i.reward_points || 0])));
  const [busy, setBusy] = useState(false);
  const stepLabel = c === "KHR" ? fmtMoney(1000, "KHR") : fmtMoney(1, "USD");
  const sample = c === "KHR" ? 52000 : 12.5;
  const examplePts = s.by_amount ? Math.floor((sample / (c === "KHR" ? 1000 : 1)) * (Number(f.points_per_step) || 0)) : 0;
  const changedItems = useMemo(() => data.items.filter((i) => Number(pts[i._id] || 0) !== (i.reward_points || 0)), [pts, data.items]);
  const saveItems = async () => {
    setBusy(true);
    try {
      await restaurantService.rewards.itemPoints(ctx.id, Object.fromEntries(changedItems.map((i) => [i._id, Number(pts[i._id]) || 0])));
      await reload();
      ctx.notify({ type: "success", text: w.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const toggle = (k, label, sub) => (
    <label className="tg-toggle">
      <span>
        <b>{label}</b>
        {sub && <small className="rs-muted">{sub}</small>}
      </span>
      <span className="md-switch">
        <input type="checkbox" checked={!!s[k]} onChange={(e) => save({ [k]: e.target.checked })} disabled={ctx.readOnly} aria-label={label} />
        <span className="md-switch-track" />
      </span>
    </label>
  );
  return (
    <>
      <section className="panel-card">
        {toggle("by_amount", w.byAmount)}
        {s.by_amount && (
          <div className="md-fields-grid">
            <Field label={w.perStep.replace("{step}", stepLabel)} htmlFor="rw-step">
              <input
                id="rw-step"
                type="number"
                min="0"
                step="0.5"
                value={f.points_per_step}
                onChange={(e) => setF({ ...f, points_per_step: e.target.value })}
                onBlur={() => Number(f.points_per_step) !== s.points_per_step && save({ points_per_step: Number(f.points_per_step) || 0 })}
              />
            </Field>
            <Field label={w.minBill} htmlFor="rw-min">
              <input id="rw-min" type="number" min="0" value={f.min_bill} onChange={(e) => setF({ ...f, min_bill: e.target.value })} onBlur={() => Number(f.min_bill) !== s.min_bill && save({ min_bill: Number(f.min_bill) || 0 })} />
            </Field>
          </div>
        )}
        {s.by_amount && <p className="rw-example">{w.example.replace("{bill}", fmtMoney(sample, c)).replace("{pts}", examplePts)}</p>}
        <div className="tg-more">
          <Field label={w.expire} htmlFor="rw-exp">
            <select id="rw-exp" value={s.expire_months} onChange={(e) => save({ expire_months: Number(e.target.value) })} disabled={ctx.readOnly}>
              {[0, 3, 6, 12, 24].map((m) => (
                <option key={m} value={m}>
                  {m ? w.months.replace("{n}", m) : w.expireNever}
                </option>
              ))}
            </select>
          </Field>
          {toggle("mask_phone", w.mask)}
        </div>
        <p className="rs-muted" style={{ marginBottom: 0 }}>
          {w.rulesNote}
        </p>
      </section>
      <ResetAll ctx={ctx} w={w} total={data.summary.balance} reload={reload} />
      <section className="panel-card">
        {toggle("by_item", w.byItem, w.byItemSub)}
        {s.by_item && (
          <>
            <div className="rw-items">
              {data.items.map((i) => (
                <label key={i._id}>
                  <span>{nameOf(i, ctx.lang)}</span>
                  <input type="number" min="0" max="10000" value={pts[i._id]} onChange={(e) => setPts({ ...pts, [i._id]: e.target.value })} aria-label={`${w.itemPoints} ${nameOf(i, ctx.lang)}`} />
                </label>
              ))}
            </div>
            <div className="tg-save">
              <span />
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={saveItems} disabled={busy || !changedItems.length || ctx.readOnly}>
                {w.saveItems}
                {changedItems.length ? ` · ${changedItems.length}` : ""}
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

// a new season: everyone's points to 0, members and their history stay
function ResetAll({ ctx, w, total, reload }) {
  const [note, setNote] = useState("");
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const res = await restaurantService.rewards.resetAll(ctx.id, note.trim());
      ctx.notify({ type: "success", text: w.resetDone.replace("{n}", res.data.reset) });
      setNote("");
      setWord("");
      await reload();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel-card rw-danger">
      <h2>{w.resetAllTitle}</h2>
      <p className="rs-muted">{w.resetAllSub.replace("{n}", fmt(total))}</p>
      <div className="rw-adjust-row">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={w.resetAllReason} aria-label={w.reason} maxLength={120} />
        <input value={word} onChange={(e) => setWord(e.target.value)} placeholder={w.typeReset} aria-label={w.typeReset} />
        <button type="button" className="md-btn md-btn-danger" onClick={run} disabled={busy || !note.trim() || word !== "RESET" || !total || ctx.readOnly}>
          {w.resetAllBtn}
        </button>
      </div>
    </section>
  );
}

// the shop's "check my points" QR + the look of the customer pages
function CustomerPage({ ctx, w, data, reload }) {
  const { settings, lang, r } = ctx;
  const x = useExtrasText();
  const link = `${PUBLIC_SITE_URL}/public/points/${data.check_token}`;
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [buying, setBuying] = useState(null);
  const [busy, setBusy] = useState("");
  const L = data.themes;
  const shop = settings.name_km || settings.name_en;
  useEffect(() => {
    QRCode.toDataURL(link, { width: 720, margin: 1 }).then(setQr);
  }, [link]);
  useEffect(() => {
    if (!printing) return undefined;
    document.body.classList.add("rs-printing");
    const timer = setTimeout(() => window.print(), 300);
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
      document.body.classList.remove("rs-printing");
    };
  }, [printing]);
  const use = async (k) => {
    setBusy(k);
    try {
      await restaurantService.rewards.useTheme(ctx.id, k);
      await reload();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const day = (d) => new Date(d).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <section className="panel-card rw-check">
        {qr && <img src={qr} alt="QR" className="rw-check-qr" />}
        <div>
          <h2>{w.checkTitle}</h2>
          <p className="rs-muted">{w.checkSub}</p>
          <p className="rs-muted">
            <small>{w.checkPrivacy}</small>
          </p>
          <code className="rw-link">{link}</code>
          <div className="to-row">
            <a className="md-btn md-btn-ghost sa-btn-sm" href={link} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> {w.open}
            </a>
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              onClick={() =>
                navigator.clipboard?.writeText(link).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                })
              }
            >
              <Copy size={15} /> {copied ? w.copied : w.copy}
            </button>
            {qr && (
              <a className="md-btn md-btn-ghost sa-btn-sm" href={qr} download="check-my-points-qr.png">
                <Download size={15} /> {w.download}
              </a>
            )}
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setPrinting(true)} disabled={!qr}>
              <Printer size={15} /> {w.poster}
            </button>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <h2>{w.looksTitle}</h2>
        <p className="rs-muted" style={{ marginTop: -6 }}>
          {w.looksSub.replace("{price}", L.price)}
        </p>
        {L.current !== L.live && <p className="to-warn">{w.expired}</p>}
        <div className="to-looks">
          {[...L.free, ...L.paid].map((k) => {
            const on = L.live === k;
            const has = L.free.includes(k) || L.owned.includes(k);
            return (
              <article key={k} className={`to-look ${on ? "on" : ""}`}>
                <div className="to-look-stage rw-look-stage">
                  <PointsMock theme={k} color={settings.color} shop={shop} logo={settings.logo?.url} />
                </div>
                <div className="xt-meta">
                  <b>
                    {themeName(POINTS_THEMES, k, lang)}{" "}
                    {L.free.includes(k) ? (
                      <span className="xt-tag">{x.free}</span>
                    ) : L.owned.includes(k) ? (
                      <span className="xt-tag own">
                        <BadgeCheck size={12} /> {w.until.replace("{d}", day(L.until[k]))}
                      </span>
                    ) : (
                      <span className="xt-tag">{w.yearly}</span>
                    )}
                  </b>
                  <small className="rs-muted">{themeDesc(POINTS_THEMES, k, lang)}</small>
                </div>
                {on ? (
                  <div className="to-row">
                    <span className="xt-state">
                      <Check size={16} /> {x.inUse}
                    </span>
                    {L.owned.includes(k) && (
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setBuying(k)} disabled={ctx.readOnly}>
                        {w.renew}
                      </button>
                    )}
                  </div>
                ) : has ? (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => use(k)} disabled={ctx.readOnly || !!busy}>
                    {x.use}
                  </button>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuying(k)} disabled={ctx.readOnly}>
                    <Lock size={14} /> <CoinIcon size={14} /> {fmt(L.price)} / {w.yearly.toLowerCase()}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {buying && (
        <PurchaseModal
          stage={
            <div className="to-buy-stage">
              <PointsMock theme={buying} color={settings.color} shop={shop} logo={settings.logo?.url} big />
            </div>
          }
          badge={w.looksTitle}
          title={w.buyLook.replace("{name}", themeName(POINTS_THEMES, buying, lang))}
          sub={w.buyLookSub}
          perks={[w.lookPerk, `${w.yearly} · 365`]}
          price={L.price}
          buyLabel={r.buy.replace("{coins}", `${fmt(L.price)} ${r.coins}`)}
          buy={() => restaurantService.rewards.buyTheme(ctx.id, buying)}
          doneSub={w.doneLook.replace("{name}", themeName(POINTS_THEMES, buying, lang))}
          onDone={() => {
            const k = buying;
            reload().then(() => use(k));
          }}
          onClose={() => setBuying(null)}
        />
      )}

      {printing &&
        createPortal(
          <div className="rs-print-root rw-poster-root">
            <div className="rw-poster" style={{ "--c": settings.color }}>
              <div className="rw-poster-top">
                {settings.logo?.url ? <img src={settings.logo.url} alt="" /> : null}
                <b>{shop}</b>
              </div>
              <h1>★ {w.posterTitle}</h1>
              <p className="rw-poster-km">{w.posterKm}</p>
              <img src={qr} alt="" className="rw-poster-qr" />
              <p>{w.posterSub}</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// a small made-up member card in one look
function PointsMock({ theme, color, shop, logo, big }) {
  return (
    <div className={`rw-pmock ${big ? "big" : ""}`} aria-hidden="true">
      <div className={`mb mb-t-${theme}`} style={{ "--c": color, minHeight: 0, padding: 12 }}>
        <div className="mb-card" style={{ gap: 10, padding: 16 }}>
          <div className="mb-shop">
            <span className="mb-logo">{logo ? <img src={logo} alt="" /> : <ChefHat size={18} />}</span>
            <b>{shop}</b>
          </div>
          <div className="mb-pts">
            <Star size={18} />
            <b>128</b>
            <span>pts</span>
          </div>
          <div className="mb-who">
            <b>Lita</b>
            <small>••• 678 · 12 visits</small>
          </div>
        </div>
        <div className="mb-reward ready" style={{ marginTop: 10, marginBottom: 0 }}>
          <span className="mb-reward-ic">
            <Gift size={16} />
          </span>
          <span>
            <b>Free drink</b>
            <i className="mb-bar">
              <i style={{ width: "100%" }} />
            </i>
          </span>
          <span className="mb-cost">100</span>
        </div>
      </div>
    </div>
  );
}
