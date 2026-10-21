import { useEffect, useState } from "react";
import { ArrowRightLeft, Copy, Link2, Network, Search, Store, Unlink, X } from "lucide-react";
import { Field } from "../restaurant/parts";
import { fmtDayTime, money } from "./text";
import { useXText } from "./xtext";
import { AddonHead, PeriodBar, ProductPick, useLoad, usePeriod } from "./MartGrowKit";

// Several shops (mart_branches): the group, one report for all, stock everywhere, transfers, copy products
export function BranchesTab({ ctx }) {
  const x = useXText();
  const { readOnly } = ctx;
  const [g, loadG, , setG] = useLoad(ctx, () => ctx.api.branches(ctx.id), []);
  const own = !!ctx.data.addons?.mart_branches?.active;
  const head = <AddonHead ctx={ctx} addon="mart_branches" icon={Network} title={x.brTitle} sub={x.brSub} perks={x.brPerks} />;
  if (!g) return <div className="rs-col">{head}</div>;
  // a branch: everything comes from the main shop's add-on
  if (g.role === "branch")
    return (
      <div className="rs-col">
        <section className="panel-card ms-head">
          <div className="ms-head-top">
            <span className="ms-head-ic">
              <Network size={24} />
            </span>
            <div className="ms-head-text">
              <h2>{x.brTitle}</h2>
              <small>{x.isBranchOf.replace("{name}", g.main?.name || "")}</small>
            </div>
          </div>
        </section>
        <Group ctx={ctx} g={g} />
        {g.active && <BranchTools ctx={ctx} g={g} />}
      </div>
    );
  if (!own) return <div className="rs-col">{head}</div>;
  const link = async (bid) => {
    try {
      const r = await ctx.api.linkBranch(ctx.id, bid);
      setG({ ...g, ...r.data, candidates: g.candidates.filter((c) => c._id !== bid) });
      loadG();
      ctx.notify({ type: "success", text: x.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  const unlink = async (bid) => {
    if (!window.confirm(`${x.unlink}?`)) return;
    try {
      await ctx.api.unlinkBranch(ctx.id, bid);
      loadG();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    }
  };
  return (
    <div className="rs-col">
      {head}
      <Group ctx={ctx} g={g} onUnlink={unlink} />
      <section className="panel-card">
        <h3 style={{ marginTop: 0 }}>{x.linkPick}</h3>
        {!g.candidates.length ? (
          <p className="rs-muted">{x.noCandidates}</p>
        ) : (
          <div className="xs-list">
            {g.candidates.map((c) => (
              <div key={c._id} className="xs-row thin">
                <span className="xs-pic round">
                  <Store size={16} />
                </span>
                <span className="mt-prod-text">
                  <b>{c.name}</b>
                </span>
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => link(c._id)} disabled={readOnly} data-testid="br-link">
                  <Link2 size={14} /> {x.link}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      {g.shops.length > 1 && <BranchTools ctx={ctx} g={g} />}
    </div>
  );
}

function Group({ ctx, g, onUnlink }) {
  const x = useXText();
  return (
    <section className="panel-card">
      <h3 style={{ marginTop: 0 }}>{x.group}</h3>
      <div className="xs-shops">
        {g.shops.map((s) => (
          <div key={s._id} className={`xs-shop ${s.here ? "here" : ""}`}>
            <span className="xs-pic round">{s.logo ? <img src={s.logo} alt="" /> : <Store size={16} />}</span>
            <b>{s.name}</b>
            <small className="rs-muted">{s.is_main ? x.mainShop : x.branch}</small>
            {s.here && <em className="rs-pill ok">{x.here}</em>}
            {!s.is_main && onUnlink && (
              <button type="button" className="md-icon-btn" onClick={() => onUnlink(s._id)} aria-label={x.unlink} title={x.unlink}>
                <Unlink size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function BranchTools({ ctx, g }) {
  const x = useXText();
  const { lang, readOnly } = ctx;
  const p = usePeriod();
  const [rep] = useLoad(ctx, () => ctx.api.branchReport(ctx.id, p.params), [p.key, p.mode]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  useEffect(() => {
    if (q.trim().length < 2) return setFound([]);
    const t = setTimeout(
      () =>
        ctx.api.branchStock(ctx.id, q.trim()).then(
          (r) => setFound(r.data),
          () => {},
        ),
      300,
    );
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const [prods] = useLoad(ctx, () => ctx.api.products(ctx.id), []);
  const others = g.shops.filter((s) => !s.here);
  const [to, setTo] = useState(others[0]?._id || "");
  const [lines, setLines] = useState([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [trs, loadTrs] = useLoad(ctx, () => ctx.api.transfers(ctx.id), []);
  const [copyTo, setCopyTo] = useState(others[0]?._id || "");
  const [prices, setPrices] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await ctx.api.transfer(ctx.id, { to, note, items: lines.filter((l) => Number(l.qty) > 0).map((l) => ({ product_id: l.product_id, qty: Number(l.qty) })) });
      ctx.notify({ type: "success", text: x.transferDone });
      setLines([]);
      setNote("");
      loadTrs();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    setBusy(true);
    try {
      const r = await ctx.api.copyProducts(ctx.id, { to: copyTo, prices });
      ctx.notify({ type: "success", text: x.copyDone.replace("{added}", r.data.added).replace("{updated}", r.data.updated).replace("{same}", r.data.same) });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <section className="panel-card">
        <div className="st-head">
          <h3 style={{ margin: 0 }}>{x.report}</h3>
          <PeriodBar p={p} />
        </div>
        {!rep ? (
          <p className="rs-muted">…</p>
        ) : (
          <div className="st-wrap">
            <table className="st-table">
              <thead>
                <tr>
                  <th />
                  <th className="num">{x.sales}</th>
                  <th className="num">{x.receipts}</th>
                  <th className="num">{x.stockValue}</th>
                  <th className="num">{x.lowOut}</th>
                </tr>
              </thead>
              <tbody>
                {rep.shops.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <b>{s.name}</b> {s.is_main && <small className="rs-muted">· {x.mainShop}</small>}
                    </td>
                    <td className="num">{money(s.sales, s.currency)}</td>
                    <td className="num">{s.count}</td>
                    <td className="num">{money(s.stock_value, s.currency)}</td>
                    <td className="num">
                      {s.low} / {s.out}
                    </td>
                  </tr>
                ))}
                <tr className="xs-sum">
                  <td>
                    <b>{x.allShops}</b>
                  </td>
                  <td className="num">
                    <b data-testid="br-total">{money(rep.total.sales, rep.currency)}</b>
                  </td>
                  <td className="num">{rep.total.count}</td>
                  <td className="num">{money(rep.total.stock_value, rep.currency)}</td>
                  <td className="num">
                    {rep.total.low} / {rep.total.out}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel-card">
        <h3 style={{ marginTop: 0 }}>{x.stockAll}</h3>
        <label className="mt-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={x.stockSearch} data-testid="br-stock-q" />
        </label>
        <div className="xs-list" style={{ marginTop: 10 }}>
          {found.map((f) => (
            <div key={f.barcode || f.name} className="xs-stockrow">
              <b>{f.name}</b>
              <div className="xs-tags">
                {f.shops.map((s) => (
                  <span key={s.product_id} className={s.stock !== null && s.stock <= 0 ? "bad" : s.stock !== null && s.stock <= s.low ? "warn" : ""}>
                    {s.shop}: <b>{s.stock ?? "—"}</b>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="xs-two">
        <section className="panel-card">
          <h3 style={{ marginTop: 0 }}>
            <ArrowRightLeft size={16} /> {x.transfer}
          </h3>
          <div className="md-fields">
            <Field label={x.transferTo} htmlFor="br-to">
              <select id="br-to" value={to} onChange={(e) => setTo(e.target.value)}>
                {others.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="xs-lines">
              {lines.map((l, n) => (
                <div key={l.product_id} className="xs-line">
                  <b>{l.name}</b>
                  <label>
                    <small>{x.qty}</small>
                    <input type="number" min="0" step="any" value={l.qty} onChange={(e) => setLines(lines.map((y, k) => (k === n ? { ...y, qty: e.target.value } : y)))} />
                  </label>
                  <button type="button" className="md-icon-btn" onClick={() => setLines(lines.filter((_, k) => k !== n))} aria-label={x.remove}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            <ProductPick products={prods || []} value="" exclude={lines.map((l) => l.product_id)} onPick={(pp) => pp && setLines([...lines, { product_id: pp._id, name: pp.name, qty: 1 }])} />
            <input className="xs-input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder={x.note} aria-label={x.note} />
            <button type="button" className="md-btn md-btn-primary" onClick={send} disabled={busy || readOnly || !to || !lines.some((l) => Number(l.qty) > 0)} data-testid="br-send">
              <ArrowRightLeft size={15} /> {x.transfer}
            </button>
          </div>
        </section>
        <section className="panel-card">
          <h3 style={{ marginTop: 0 }}>
            <Copy size={16} /> {x.copyProducts}
          </h3>
          <div className="md-fields">
            <Field label={x.copyTo} htmlFor="br-copy">
              <select id="br-copy" value={copyTo} onChange={(e) => setCopyTo(e.target.value)}>
                {others.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="md-switch">
              <input type="checkbox" checked={prices} onChange={(e) => setPrices(e.target.checked)} />
              <span className="md-switch-track" />
              <span>{x.copyPrices}</span>
            </label>
            <button type="button" className="md-btn md-btn-ghost" onClick={copy} disabled={busy || readOnly || !copyTo}>
              <Copy size={15} /> {x.copyProducts}
            </button>
          </div>
        </section>
      </div>
      <section className="panel-card">
        <h3 style={{ marginTop: 0 }}>{x.transfers}</h3>
        {!trs?.length ? (
          <p className="rs-muted">—</p>
        ) : (
          <div className="xs-moves">
            {trs.map((t) => (
              <div key={t._id}>
                <span>
                  <b>
                    {t.from_name} → {t.to_name}
                  </b>
                  <small className="rs-muted">
                    {fmtDayTime(t.created_date, lang)} · {t.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                    {t.note ? ` · ${t.note}` : ""} · {t.by}
                  </small>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
