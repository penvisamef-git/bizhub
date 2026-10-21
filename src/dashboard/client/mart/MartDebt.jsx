import { useCallback, useEffect, useState } from "react";
import { HandCoins, History, Phone, Plus, Search, UserRound, Wallet } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { DeleteButton, Field } from "../restaurant/parts";
import CoinIcon from "../../../components/CoinIcon";
import { fmtDayTime, methodName, money } from "./text";

const debtOn = (ctx) => (ctx.pos ? !!ctx.data.debt : !!ctx.data.addons?.mart_debt?.active);

// Debt book (mart_debt): who owes what, repayments at the counter, history
export function DebtTab({ ctx }) {
  const { m, cur, readOnly, lang } = ctx;
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const load = useCallback(() => {
    if (!debtOn(ctx)) return;
    ctx.api
      .debtors(ctx.id, q)
      .then((r) => setData(r.data))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx, q]);
  useEffect(() => {
    load();
  }, [load]);

  if (!debtOn(ctx)) {
    const a = ctx.data.addons?.mart_debt;
    return (
      <section className="panel-card mt-lock">
        <HandCoins size={34} />
        <h2>{m.addonInfo.mart_debt.name}</h2>
        <p className="rs-muted">{m.debtLocked}</p>
        {!ctx.pos && (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon: "mart_debt" })} disabled={readOnly}>
            <CoinIcon size={16} /> {m.unlock.replace("{coins}", a?.price ?? 50)} {m.perYear}
          </button>
        )}
      </section>
    );
  }
  return (
    <div className="rs-col">
      <section className="panel-card ms-head">
        <div className="ms-head-top">
          <span className="ms-head-ic md-debt">
            <HandCoins size={24} />
          </span>
          <div className="ms-head-text">
            <h2>{m.tabs.debt}</h2>
            <small>{m.debtSub}</small>
          </div>
          <div className="ms-head-btns">
            <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setModal({ edit: {} })} disabled={readOnly || !data}>
              <Plus size={15} /> {m.addDebtor}
            </button>
          </div>
        </div>
        {data && (
          <div className="ms-cards md-two">
            <div className="ms-card c-red">
              <span className="ms-card-ic">
                <Wallet size={18} />
              </span>
              <b>{money(data.totals.owed, cur)}</b>
              <small>{m.totalOwed}</small>
            </div>
            <div className="ms-card c-teal">
              <span className="ms-card-ic">
                <UserRound size={18} />
              </span>
              <b>{data.totals.people}</b>
              <small>{m.debtPeople}</small>
            </div>
          </div>
        )}
      </section>
      <section className="panel-card">
        <label className="mt-search" style={{ marginBottom: 12 }}>
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.debtSearch} aria-label={m.debtSearch} />
        </label>
        {!data ? (
          <p className="rs-muted">…</p>
        ) : !data.rows.length ? (
          <p className="rs-muted">{m.noDebtors}</p>
        ) : (
          data.rows.map((d) => (
            <div key={d._id} className="md-row">
              <span className="ghs-av">
                <UserRound size={18} />
              </span>
              <span className="mt-prod-text" style={{ flex: 1 }}>
                <b>{d.name}</b>
                <small>
                  {d.phone ? (
                    <>
                      <Phone size={11} /> {d.phone}
                    </>
                  ) : (
                    "—"
                  )}
                  {d.note ? ` · ${d.note}` : ""}
                </small>
              </span>
              <span className="md-bal">{d.balance > 0 ? <b className="mt-neg">{money(d.balance, cur)}</b> : <em className="ms-pill">{m.clear2}</em>}</span>
              <span className="ms-acts">
                {d.balance > 0 && !readOnly && (
                  <button type="button" className="ms-act pay" onClick={() => setModal({ pay: d })}>
                    <HandCoins size={15} /> <span>{m.repay}</span>
                  </button>
                )}
                <button type="button" className="ms-act" onClick={() => setModal({ edit: d })} disabled={readOnly}>
                  <UserRound size={15} /> <span>{m.editDebtor}</span>
                </button>
                <button type="button" className="ms-act ic" onClick={() => setModal({ history: d })} aria-label={m.debtHistory} title={m.debtHistory}>
                  <History size={15} />
                </button>
              </span>
            </div>
          ))
        )}
      </section>
      {modal?.edit && <DebtorModal ctx={ctx} row={modal.edit} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.pay && <RepayModal ctx={ctx} d={modal.pay} onClose={() => setModal(null)} onDone={load} />}
      {modal?.history && <DebtHistoryModal ctx={ctx} d={modal.history} onClose={() => setModal(null)} />}
    </div>
  );
}

function DebtorModal({ ctx, row, onClose, onSaved }) {
  const { m } = ctx;
  const isNew = !row._id;
  const [f, setF] = useState({ name: row.name || "", phone: row.phone || "", note: row.note || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      ctx.notify({ type: "success", text: m.saved });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={isNew ? m.addDebtor : m.editDebtor}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          {!isNew && ctx.role !== "cashier" && (
            <span style={{ marginRight: "auto" }}>
              <DeleteButton onDelete={() => go(() => ctx.api.removeDebtor(ctx.id, row._id))} r={{ confirmDelete: m.sure, remove: m.remove }} disabled={busy} small />
            </span>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="submit" form="mt-debtor" className="md-btn md-btn-primary" disabled={busy || !f.name.trim()}>
            {busy ? m.saving : m.save}
          </button>
        </>
      }
    >
      <form
        id="mt-debtor"
        className="md-fields"
        onSubmit={(e) => {
          e.preventDefault();
          go(() => (isNew ? ctx.api.addDebtor(ctx.id, f) : ctx.api.saveDebtor(ctx.id, row._id, f)));
        }}
      >
        <div className="md-fields-grid">
          <Field label={m.debtorName} htmlFor="md-name">
            <input id="md-name" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
          </Field>
          <Field label={m.phone} htmlFor="md-phone">
            <input id="md-phone" type="tel" maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
        </div>
        <Field label={m.debtNote} htmlFor="md-note">
          <input id="md-note" maxLength={200} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </Field>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

function RepayModal({ ctx, d, onClose, onDone }) {
  const { m, cur } = ctx;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const v = Number(amount);
  const ok = v > 0 && v <= d.balance + 0.005;
  const methods = (ctx.data.settings?.methods?.length ? ctx.data.settings.methods : ["cash"]).filter((k) => k !== "debt");
  const go = async (e) => {
    e.preventDefault();
    if (!ok) return;
    setBusy(true);
    try {
      await ctx.api.debtorPay(ctx.id, d._id, { amount: v, method, note });
      ctx.notify({ type: "success", text: m.saved });
      onDone();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={m.repayTitle.replace("{name}", d.name)}
      onClose={onClose}
      busy={busy}
      footer={
        <button type="submit" form="mt-repay" className="md-btn md-btn-primary" disabled={busy || !ok}>
          {busy ? m.saving : `${m.repay} · ${ok ? money(v, cur) : ""}`}
        </button>
      }
    >
      <form id="mt-repay" className="md-fields" onSubmit={go}>
        <p className="rs-muted" style={{ margin: 0 }}>
          {m.owes}: <b className="mt-neg">{money(d.balance, cur)}</b>
        </p>
        <Field label={m.repayAmount} htmlFor="mr-amt">
          <input id="mr-amt" className="mp-big-input" type="number" min="0" step={cur === "KHR" ? "100" : "0.01"} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <div className="mp-quick mp-quick-row">
          <button type="button" onClick={() => setAmount(String(d.balance))}>
            {m.repayAll} · {money(d.balance, cur)}
          </button>
        </div>
        <Field label={m.colPay}>
          <div className="at-seg">
            {methods.map((k) => (
              <button key={k} type="button" className={method === k ? "on" : ""} onClick={() => setMethod(k)}>
                {methodName(m, k)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={m.debtNote} htmlFor="mr-note">
          <input id="mr-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && <div className="md-form-error">{error}</div>}
      </form>
    </Modal>
  );
}

function DebtHistoryModal({ ctx, d, onClose }) {
  const { m, cur, lang } = ctx;
  const [row, setRow] = useState(null);
  useEffect(() => {
    ctx.api
      .debtor(ctx.id, d._id)
      .then((r) => setRow(r.data))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx, d._id]);
  return (
    <Modal title={`${m.debtHistory} · ${d.name}`} onClose={onClose} size="md-modal-lg">
      {!row ? (
        <p className="rs-muted">…</p>
      ) : (
        <>
          <p className="rs-muted" style={{ marginTop: 0 }}>
            {m.owes}: <b className={row.balance > 0 ? "mt-neg" : "mt-pos"}>{money(row.balance, cur)}</b>
          </p>
          {row.txs.map((x) => (
            <div key={x._id} className="gh-row mt-move">
              <span className={`mt-move-kind k-${x.kind === "payment" ? "in" : x.kind === "sale" ? "sale" : "adjust"}`}>{m.debtKinds[x.kind]}</span>
              <span className="gh-row-text" style={{ flex: 1 }}>
                <b>
                  {x.sale_no || m.debtKinds[x.kind]}
                  {x.method ? ` · ${methodName(m, x.method)}` : ""}
                </b>
                <small>
                  {fmtDayTime(x.created_date, lang)} · {x.by}
                  {x.note ? ` · ${x.note}` : ""}
                </small>
              </span>
              <b className={x.amount > 0 ? "mt-neg" : "mt-pos"}>{x.amount > 0 ? `+${money(x.amount, cur)}` : `−${money(-x.amount, cur)}`}</b>
              <small className="mt-move-after">→ {money(x.balance_after, cur)}</small>
            </div>
          ))}
        </>
      )}
    </Modal>
  );
}
