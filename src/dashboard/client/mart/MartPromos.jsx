import { useState } from "react";
import { BadgePercent, Clock, Plus, Ticket } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { DeleteButton, Field } from "../restaurant/parts";
import { money } from "./text";
import { useXText } from "./xtext";
import { AddonHead, MultiPick, addonOn, useLoad, useSave } from "./MartGrowKit";

export const promoLine = (p, x, cur) => {
  const what = p.kind === "bxgy" ? x.bxgyLine.replace("{buy}", p.buy_qty).replace("{get}", p.get_qty) : p.kind === "percent" ? x.pctLine.replace("{v}", p.value) : x.amtLine.replace("{v}", money(p.value, cur));
  return p.min_spend > 0 ? `${what} · ${x.over.replace("{amt}", money(p.min_spend, cur))}` : what;
};

// Promotions (mart_promos): automatic deals + coupon codes, on the POS and the website
export function PromosTab({ ctx }) {
  const x = useXText();
  const { cur, readOnly } = ctx;
  const on = addonOn(ctx, "mart_promos");
  const [rows, load] = useLoad(ctx, () => ctx.api.promos(ctx.id), []);
  const [prods] = useLoad(ctx, () => (on ? ctx.api.products(ctx.id) : Promise.resolve({ data: [] })), [on]);
  const [modal, setModal] = useState(null);
  const head = (
    <AddonHead ctx={ctx} addon="mart_promos" icon={BadgePercent} title={x.proTitle} sub={x.proSub} perks={x.proPerks}>
      <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setModal({})} disabled={readOnly} data-testid="pr-new">
        <Plus size={15} /> {x.newPromo}
      </button>
    </AddonHead>
  );
  if (!on) return <div className="rs-col">{head}</div>;
  const toggle = async (p) => {
    try {
      await ctx.api.savePromo(ctx.id, p._id, { active: !p.active });
      load();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const catName = (id) => ctx.data.categories.find((c) => c._id === id)?.name || "";
  const prodName = (id) => (prods || []).find((p) => p._id === id)?.name || "";
  return (
    <div className="rs-col">
      {head}
      <section className="panel-card">
        {!rows ? (
          <p className="rs-muted">…</p>
        ) : !rows.length ? (
          <p className="rs-muted">{x.noPromos}</p>
        ) : (
          <div className="xs-cards">
            {rows.map((p) => (
              <div key={p._id} className={`xs-card ${p.active ? "" : "off"}`} data-testid="pr-card">
                <div className="xs-card-top">
                  <span className="xs-card-ic">{p.code ? <Ticket size={18} /> : <BadgePercent size={18} />}</span>
                  <button type="button" className="xs-card-name" onClick={() => setModal(p)}>
                    <b>{p.name}</b>
                    <small>{promoLine(p, x, cur)}</small>
                  </button>
                  <label className="md-switch" title={p.active ? x.active : x.paused}>
                    <input type="checkbox" checked={p.active} onChange={() => toggle(p)} disabled={readOnly} aria-label={x.active} />
                    <span className="md-switch-track" />
                  </label>
                </div>
                <div className="xs-tags">
                  {p.code && <em className="xs-code">{p.code}</em>}
                  <span>
                    {p.target === "all" ? x.targets.all : p.target === "categories" ? p.category_ids.map(catName).filter(Boolean).join(", ") : p.product_ids.map(prodName).filter(Boolean).slice(0, 4).join(", ") + (p.product_ids.length > 4 ? "…" : "")}
                  </span>
                  <span>{x.wheres[p.where]}</span>
                  {(p.days?.length > 0 || p.time_from) && (
                    <span>
                      <Clock size={12} /> {p.days?.length ? p.days.map((d) => x.dayNames[d]).join(" ") : ""} {p.time_from && p.time_to ? x.hhLine.replace("{from}", p.time_from).replace("{to}", p.time_to) : ""}
                    </span>
                  )}
                  {(p.date_from || p.date_to) && (
                    <span>
                      {p.date_from || "…"} → {p.date_to || "…"}
                    </span>
                  )}
                  <span className="rs-muted">
                    {x.uses.replace("{n}", p.uses || 0)}
                    {p.max_uses ? ` / ${p.max_uses}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {modal && <PromoModal ctx={ctx} row={modal} products={prods || []} onClose={() => setModal(null)} onSaved={load} />}
    </div>
  );
}

function PromoModal({ ctx, row, products, onClose, onSaved }) {
  const x = useXText();
  const { cur } = ctx;
  const isNew = !row._id;
  const [f, setF] = useState({
    name: row.name || "",
    kind: row.kind || "percent",
    value: row.value ?? "",
    buy_qty: row.buy_qty || 2,
    get_qty: row.get_qty || 1,
    target: row.target || "all",
    category_ids: row.category_ids || [],
    product_ids: row.product_ids || [],
    min_spend: row.min_spend || "",
    code: row.code || "",
    where: row.where || "both",
    days: row.days || [],
    time_from: row.time_from || "",
    time_to: row.time_to || "",
    date_from: row.date_from || "",
    date_to: row.date_to || "",
    max_uses: row.max_uses || "",
    active: row.active !== false,
  });
  const { busy, error, go } = useSave(ctx, onSaved, onClose);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ok = f.name.trim() && (f.kind === "bxgy" ? f.buy_qty > 0 && f.get_qty > 0 : Number(f.value) > 0) && (f.target !== "categories" || f.category_ids.length) && (f.target !== "products" || f.product_ids.length);
  const body = () => ({ ...f, value: Number(f.value) || 0, buy_qty: Number(f.buy_qty) || 0, get_qty: Number(f.get_qty) || 0, min_spend: Number(f.min_spend) || 0, max_uses: Number(f.max_uses) || 0 });
  return (
    <Modal
      title={isNew ? x.newPromo : x.editPromo}
      onClose={onClose}
      busy={busy}
      size="md-modal-lg"
      footer={
        <>
          {!isNew && (
            <span style={{ marginRight: "auto" }}>
              <DeleteButton onDelete={() => go(() => ctx.api.removePromo(ctx.id, row._id))} r={{ confirmDelete: x.sure, remove: x.remove }} disabled={busy} small />
            </span>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {x.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" disabled={!ok || busy} onClick={() => go(() => (isNew ? ctx.api.addPromo(ctx.id, body()) : ctx.api.savePromo(ctx.id, row._id, body())))} data-testid="pr-save">
            {busy ? x.saving : x.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <Field label={x.name} htmlFor="pr-name">
          <input id="pr-name" maxLength={60} value={f.name} onChange={set("name")} autoFocus placeholder="Buy 2 get 1 · Happy hour · NEWYEAR" />
        </Field>
        <Field label={x.kind}>
          <div className="at-seg">
            {Object.keys(x.kinds).map((k) => (
              <button key={k} type="button" className={f.kind === k ? "on" : ""} onClick={() => setF({ ...f, kind: k })} data-testid={`pr-kind-${k}`}>
                {x.kinds[k]}
              </button>
            ))}
          </div>
        </Field>
        {f.kind === "bxgy" ? (
          <div className="md-fields-grid">
            <Field label={x.buyQty} htmlFor="pr-buy">
              <input id="pr-buy" type="number" min="1" value={f.buy_qty} onChange={set("buy_qty")} />
            </Field>
            <Field label={x.getQty} htmlFor="pr-get">
              <input id="pr-get" type="number" min="1" value={f.get_qty} onChange={set("get_qty")} />
            </Field>
          </div>
        ) : (
          <Field label={`${x.value} (${f.kind === "percent" ? "%" : cur === "KHR" ? "៛" : "$"})`} htmlFor="pr-val">
            <input id="pr-val" type="number" min="0" step="any" value={f.value} onChange={set("value")} data-testid="pr-value" />
          </Field>
        )}
        <Field label={x.target}>
          <div className="at-seg">
            {Object.keys(x.targets).map((k) => (
              <button key={k} type="button" className={f.target === k ? "on" : ""} onClick={() => setF({ ...f, target: k })}>
                {x.targets[k]}
              </button>
            ))}
          </div>
        </Field>
        {f.target === "categories" && <MultiPick items={ctx.data.categories} value={f.category_ids} onChange={(v) => setF({ ...f, category_ids: v })} />}
        {f.target === "products" && <MultiPick items={products.filter((p) => p.active !== false)} value={f.product_ids} onChange={(v) => setF({ ...f, product_ids: v })} />}
        <div className="md-fields-grid">
          <Field label={x.minSpend} htmlFor="pr-min">
            <input id="pr-min" type="number" min="0" step="any" value={f.min_spend} onChange={set("min_spend")} />
          </Field>
          <Field label={x.code} htmlFor="pr-code" hint={x.codeHint}>
            <input id="pr-code" maxLength={20} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} placeholder="SAVE10" />
          </Field>
        </div>
        <Field label={x.where}>
          <div className="at-seg">
            {Object.keys(x.wheres).map((k) => (
              <button key={k} type="button" className={f.where === k ? "on" : ""} onClick={() => setF({ ...f, where: k })}>
                {x.wheres[k]}
              </button>
            ))}
          </div>
        </Field>
        <Field label={x.days}>
          <div className="mt-chips">
            <button type="button" className={!f.days.length ? "on" : ""} onClick={() => setF({ ...f, days: [] })}>
              {x.everyDay}
            </button>
            {x.dayNames.map((d, i) => (
              <button key={d} type="button" className={f.days.includes(i) ? "on" : ""} onClick={() => setF({ ...f, days: f.days.includes(i) ? f.days.filter((v) => v !== i) : [...f.days, i].sort() })}>
                {d}
              </button>
            ))}
          </div>
        </Field>
        <div className="md-fields-grid">
          <Field label={x.timeFrom} htmlFor="pr-tf">
            <input id="pr-tf" type="time" value={f.time_from} onChange={set("time_from")} />
          </Field>
          <Field label={x.timeTo} htmlFor="pr-tt">
            <input id="pr-tt" type="time" value={f.time_to} onChange={set("time_to")} />
          </Field>
          <Field label={x.dateFrom} htmlFor="pr-df">
            <input id="pr-df" type="date" value={f.date_from} onChange={set("date_from")} />
          </Field>
          <Field label={x.dateTo} htmlFor="pr-dt">
            <input id="pr-dt" type="date" value={f.date_to} onChange={set("date_to")} />
          </Field>
        </div>
        <div className="md-fields-grid">
          <Field label={x.maxUses} htmlFor="pr-max">
            <input id="pr-max" type="number" min="0" value={f.max_uses} onChange={set("max_uses")} />
          </Field>
          <label className="md-switch" style={{ alignSelf: "end" }}>
            <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
            <span className="md-switch-track" />
            <span>{x.active}</span>
          </label>
        </div>
        {error && <div className="md-form-error">{error}</div>}
      </div>
    </Modal>
  );
}
