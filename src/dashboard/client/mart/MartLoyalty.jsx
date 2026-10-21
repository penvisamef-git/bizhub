import { useEffect, useState } from "react";
import { Gift, Phone, Plus, Search, UserRound } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { DeleteButton, Field } from "../restaurant/parts";
import { fmtDate, fmtDayTime, money } from "./text";
import { useXText } from "./xtext";
import { AddonHead, addonOn, useLoad, useSave } from "./MartGrowKit";

// Loyalty points (mart_loyalty): the rules, the members, each member's points
export function LoyaltyTab({ ctx }) {
  const x = useXText();
  const { cur, lang, readOnly } = ctx;
  const on = addonOn(ctx, "mart_loyalty");
  const [info, loadInfo] = useLoad(ctx, () => ctx.api.loyalty(ctx.id), []);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("top");
  const [query, setQuery] = useState({ q: "", sort: "top" });
  useEffect(() => {
    const t = setTimeout(() => setQuery({ q, sort }), 300);
    return () => clearTimeout(t);
  }, [q, sort]);
  const [members, loadMembers] = useLoad(ctx, () => (on ? ctx.api.members(ctx.id, { q: query.q, sort: query.sort }) : Promise.resolve({ data: [] })), [on, query.q, query.sort]);
  const [form, setForm] = useState(null);
  const [modal, setModal] = useState(null);
  useEffect(() => {
    if (info && !form) setForm({ ...info.rules });
  }, [info]); // eslint-disable-line react-hooks/exhaustive-deps
  const head = <AddonHead ctx={ctx} addon="mart_loyalty" icon={Gift} title={x.loyTitle} sub={x.loySub} perks={x.loyPerks} />;
  if (!on) return <div className="rs-col">{head}</div>;
  const reload = () => {
    loadInfo();
    loadMembers();
  };
  const dirty = info && form && ["on", "earn_per", "point_value", "min_redeem", "online"].some((k) => String(form[k]) !== String(info.rules[k]));
  const saveRules = async () => {
    try {
      await ctx.api.saveLoyalty(ctx.id, { on: form.on, online: form.online, earn_per: Number(form.earn_per), point_value: Number(form.point_value), min_redeem: Number(form.min_redeem) });
      ctx.notify({ type: "success", text: x.saved });
      loadInfo();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  return (
    <div className="rs-col">
      {head}
      <div className="xs-two">
        <section className="panel-card">
          <h3 style={{ marginTop: 0 }}>{x.loyRules}</h3>
          {!form ? (
            <p className="rs-muted">…</p>
          ) : (
            <div className="md-fields">
              <label className="md-switch">
                <input type="checkbox" checked={!!form.on} onChange={(e) => setForm({ ...form, on: e.target.checked })} disabled={readOnly} />
                <span className="md-switch-track" />
                <span>{x.loyOn}</span>
              </label>
              <div className="md-fields-grid">
                <Field label={`${x.earnPer} (${cur === "KHR" ? "៛" : "$"})`} htmlFor="ly-per">
                  <input id="ly-per" type="number" min="0.01" step="any" value={form.earn_per} onChange={(e) => setForm({ ...form, earn_per: e.target.value })} disabled={readOnly} />
                </Field>
                <Field label={`${x.pointValue} (${cur === "KHR" ? "៛" : "$"})`} htmlFor="ly-val">
                  <input id="ly-val" type="number" min="0" step="any" value={form.point_value} onChange={(e) => setForm({ ...form, point_value: e.target.value })} disabled={readOnly} />
                </Field>
                <Field label={x.minRedeem} htmlFor="ly-min">
                  <input id="ly-min" type="number" min="1" value={form.min_redeem} onChange={(e) => setForm({ ...form, min_redeem: e.target.value })} disabled={readOnly} />
                </Field>
              </div>
              <label className="md-switch">
                <input type="checkbox" checked={!!form.online} onChange={(e) => setForm({ ...form, online: e.target.checked })} disabled={readOnly} />
                <span className="md-switch-track" />
                <span>{x.loyOnline}</span>
              </label>
              <p className="xs-example">
                {x.loyExample
                  .replace("{spend}", money(form.earn_per, cur))
                  .replace("{n}", form.min_redeem)
                  .replace("{value}", money((Number(form.min_redeem) || 0) * (Number(form.point_value) || 0), cur))}
              </p>
              <div className="tg-save">
                <span />
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" disabled={!dirty || readOnly} onClick={saveRules} data-testid="ly-save">
                  {x.save}
                </button>
              </div>
            </div>
          )}
        </section>
        <section className="panel-card">
          {info && (
            <div className="xs-kpis col">
              <span>
                <b>{info.totals.members}</b>
                <small>{x.members}</small>
              </span>
              <span>
                <b>{Math.round(info.totals.points)}</b>
                <small>{x.pointsOut}</small>
              </span>
              <span>
                <b>{money(info.totals.owed, cur)}</b>
                <small>{x.owed}</small>
              </span>
              <span>
                <b>{Math.round(info.totals.redeemed)}</b>
                <small>{x.redeemed}</small>
              </span>
            </div>
          )}
        </section>
      </div>
      <section className="panel-card">
        <div className="xs-bar">
          <h3 style={{ margin: 0 }}>{x.members}</h3>
          <label className="mt-search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${x.name} / ${x.phone}`} />
          </label>
          <div className="at-seg">
            <button type="button" className={sort === "top" ? "on" : ""} onClick={() => setSort("top")}>
              {x.sortTop}
            </button>
            <button type="button" className={sort === "recent" ? "on" : ""} onClick={() => setSort("recent")}>
              {x.sortRecent}
            </button>
          </div>
          <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setModal({ edit: {} })} disabled={readOnly} data-testid="ly-add">
            <Plus size={15} /> {x.addMember}
          </button>
        </div>
        {!members ? (
          <p className="rs-muted">…</p>
        ) : !members.length ? (
          <p className="rs-muted">{x.noMembers}</p>
        ) : (
          <div className="xs-list">
            {members.map((mb) => (
              <button key={mb._id} type="button" className="xs-row btn" onClick={() => setModal({ view: mb._id })} data-testid="ly-row">
                <span className="xs-pic round">
                  <UserRound size={18} />
                </span>
                <span className="mt-prod-text">
                  <b>{mb.name || mb.phone}</b>
                  <small className="rs-muted">
                    <Phone size={11} /> {mb.phone} · {x.visits} {mb.visits} · {x.spent} {money(mb.spent, cur)}
                    {mb.last_at ? ` · ${fmtDate(mb.last_at, lang)}` : ""}
                  </small>
                </span>
                <b className="xs-points">{Math.round(mb.points)}</b>
              </button>
            ))}
          </div>
        )}
      </section>
      {modal?.edit && <MemberEdit ctx={ctx} row={modal.edit} onClose={() => setModal(null)} onSaved={reload} />}
      {modal?.view && <MemberView ctx={ctx} mid={modal.view} onClose={() => setModal(null)} onChanged={reload} onEdit={(row) => setModal({ edit: row })} />}
    </div>
  );
}

function MemberEdit({ ctx, row, onClose, onSaved }) {
  const x = useXText();
  const isNew = !row._id;
  const [f, setF] = useState({ name: row.name || "", phone: row.phone || "", note: row.note || "" });
  const { busy, error, go } = useSave(ctx, onSaved, onClose);
  return (
    <Modal
      title={isNew ? x.addMember : x.memberEdit}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {!isNew && (
            <span style={{ marginRight: "auto" }}>
              <DeleteButton onDelete={() => go(() => ctx.api.removeMember(ctx.id, row._id))} r={{ confirmDelete: x.sure, remove: x.remove }} disabled={busy} small />
            </span>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {x.cancel}
          </button>
          <button
            type="button"
            className="md-btn md-btn-primary"
            disabled={busy || f.phone.replace(/\D/g, "").length < 8}
            onClick={() => go(() => (isNew ? ctx.api.addMember(ctx.id, f) : ctx.api.saveMember(ctx.id, row._id, f)))}
            data-testid="ly-msave"
          >
            {busy ? x.saving : x.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <Field label={x.phone} htmlFor="mb-phone">
          <input id="mb-phone" inputMode="tel" maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoFocus />
        </Field>
        <Field label={x.name} htmlFor="mb-name">
          <input id="mb-name" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label={x.note} htmlFor="mb-note">
          <input id="mb-note" maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}

function MemberView({ ctx, mid, onClose, onChanged, onEdit }) {
  const x = useXText();
  const { cur, lang, readOnly } = ctx;
  const [data, load] = useLoad(ctx, () => ctx.api.member(ctx.id, mid), [mid]);
  const [pts, setPts] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const adjust = async () => {
    const n = Math.round(Number(pts));
    if (!n) return;
    setBusy(true);
    try {
      await ctx.api.adjustPoints(ctx.id, mid, { points: n, note });
      setPts("");
      setNote("");
      ctx.notify({ type: "success", text: x.saved });
      load();
      onChanged();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const mb = data?.member;
  return (
    <Modal title={mb ? mb.name || mb.phone : x.memberEdit} onClose={onClose} size="md-modal-lg">
      {!data ? (
        <p className="rs-muted">…</p>
      ) : (
        <div className="md-fields">
          <div className="xs-kpis">
            <span className="ok">
              <b>{Math.round(mb.points)}</b>
              <small>{x.points}</small>
            </span>
            <span>
              <b>{Math.round(mb.earned)}</b>
              <small>{x.earned}</small>
            </span>
            <span>
              <b>{Math.round(mb.redeemed)}</b>
              <small>{x.redeemed}</small>
            </span>
            <span>
              <b>{money(mb.spent, cur)}</b>
              <small>{x.spent}</small>
            </span>
            <span>
              <b>{mb.visits}</b>
              <small>{x.visits}</small>
            </span>
          </div>
          <p className="rs-muted" style={{ margin: 0 }}>
            <Phone size={12} /> {mb.phone}
            {mb.note ? ` · ${mb.note}` : ""}{" "}
            <button type="button" className="sa-link" onClick={() => onEdit(mb)}>
              {x.edit}
            </button>
          </p>
          <div className="xs-adjust">
            <input type="number" step="1" value={pts} onChange={(e) => setPts(e.target.value)} placeholder="+50 / −20" aria-label={x.adjust} disabled={readOnly} />
            <input maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder={x.note} disabled={readOnly} />
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={adjust} disabled={busy || readOnly || !Math.round(Number(pts))}>
              {x.adjust}
            </button>
          </div>
          <small className="rs-muted">{x.adjustHint}</small>
          <h4 style={{ margin: "8px 0 0" }}>{x.moves}</h4>
          <div className="xs-moves">
            {data.moves.map((mv) => (
              <div key={mv._id}>
                <span>
                  <b>{x.move[mv.kind]}</b>
                  <small className="rs-muted">
                    {fmtDayTime(mv.created_date, lang)}
                    {mv.sale_no ? ` · ${mv.sale_no}` : ""}
                    {mv.order_no ? ` · ${mv.order_no}` : ""}
                    {mv.note ? ` · ${mv.note}` : ""}
                  </small>
                </span>
                <b className={mv.points > 0 ? "plus" : "minus"}>
                  {mv.points > 0 ? "+" : ""}
                  {mv.points}
                </b>
                <small className="rs-muted">{Math.round(mv.balance_after)}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
