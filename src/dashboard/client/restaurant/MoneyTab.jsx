import { Lock, Plus, ReceiptText, Trash2 } from "lucide-react";
import useSettingsForm from "./useSettingsForm";
import { Receipt, ReceiptPaper } from "../../../pos/receipt";
import { moneyOfSettings, restaurantOfSettings, sampleOrder } from "./ReceiptTab";
import { useReportText } from "./report-text";
import { useExtrasText } from "./extras-text";
import { AddonPrompt, Field, SaveBar } from "./parts";
import CoinIcon from "../../../components/CoinIcon";

// the receipt as it will print, in the look chosen in "Receipt look"
function LiveReceipt({ s }) {
  const R = useReportText();
  const x = useExtrasText();
  return (
    <div className="xt-live">
      <ReceiptPaper size={s.receipt_size === 58 ? 58 : 80}>
        <Receipt order={sampleOrder(x)} t={R.receipt} paidView restaurant={restaurantOfSettings(s)} money={moneyOfSettings(s)} theme={s.receipt_theme || "classic"} />
      </ReceiptPaper>
    </div>
  );
}

const KEYS = ["currency", "khr_rate", "khr_rounding", "vat", "service_charge", "pay_mode", "bill_numbering", "payment_methods", "receipt_size", "receipt_footer", "wifi_name", "wifi_pass", "receipt_printer"];

function Choice({ name, value, options, onChange, disabled }) {
  return (
    <div className="rs-choice" role="radiogroup">
      {options.map(([v, label]) => (
        <label key={v} className={String(value) === String(v) ? "on" : ""}>
          <input type="radio" name={name} checked={String(value) === String(v)} onChange={() => onChange(v)} disabled={disabled} />
          {label}
        </label>
      ))}
    </div>
  );
}

// Money: currency, exchange rate, VAT / service, how guests pay, payment methods, receipt
export default function MoneyTab({ ctx }) {
  const { r, settings, readOnly, overview } = ctx;
  const { form, setForm, set, dirty, saving, save, undo } = useSettingsForm(ctx, KEYS, { extra: { mark_money_saved: true } });
  // first save always counts as "money step done", even with the defaults
  const needsFirstSave = !settings.money_saved;
  const limit = overview.limits.payments;
  const methods = form.payment_methods || [];
  const printer = { type: "none", address: "", ...(form.receipt_printer || {}) };
  const setMethod = (i, patch) => setForm((f) => ({ ...f, payment_methods: f.payment_methods.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));
  const addMethod = () => {
    if (limit && methods.length >= limit) return ctx.askBuy("rest_payments");
    setForm((f) => ({ ...f, payment_methods: [...f.payment_methods, { name: "", kind: "bank", active: true }] }));
    return undefined;
  };
  const setNested = (key, patch) => setForm((f) => ({ ...f, [key]: { ...f[key], ...patch } }));

  return (
    <div className="rs-grid">
      <div className="rs-form">
        <section className="panel-card">
          <h2>{r.tabs.money}</h2>
          <p className="rs-muted" style={{ margin: "-6px 0 16px" }}>
            {r.moneySub}
          </p>
          <div className="md-fields-grid">
            <Field label={r.currency} hint={r.currencyHint} full>
              <Choice
                name="currency"
                value={form.currency}
                options={[
                  ["USD", "USD ($)"],
                  ["KHR", "KHR (៛)"],
                ]}
                onChange={set("currency")}
                disabled={readOnly}
              />
            </Field>
            <Field label={r.rate} hint={r.rateHint} htmlFor="rs-rate">
              <div className="rs-affix">
                <span>1 USD =</span>
                <input id="rs-rate" type="number" min="1000" max="10000" step="1" value={form.khr_rate} onChange={set("khr_rate")} disabled={readOnly} />
                <span>៛</span>
              </div>
            </Field>
            <Field label={r.rounding} htmlFor="rs-round">
              <select id="rs-round" value={form.khr_rounding} onChange={set("khr_rounding")} disabled={readOnly}>
                {[1, 100, 500, 1000].map((n) => (
                  <option key={n} value={n}>
                    {new Intl.NumberFormat("en-US").format(n)} ៛
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <h3 className="ne-sub">{r.payMode}</h3>
          <Choice
            name="pay_mode"
            value={form.pay_mode}
            options={[
              ["after", r.payAfter],
              ["before", r.payBefore],
            ]}
            onChange={set("pay_mode")}
            disabled={readOnly}
          />

          <h3 className="ne-sub">
            {r.vat} · {r.service.split(" (")[0]}
          </h3>
          <div className="rs-tax">
            <label className="md-switch">
              <input type="checkbox" checked={!!form.vat?.enabled} onChange={(e) => setNested("vat", { enabled: e.target.checked })} disabled={readOnly} />
              <span className="md-switch-track" />
              <span>{r.vat}</span>
            </label>
            {form.vat?.enabled && (
              <div className="rs-tax-row">
                <div className="rs-affix small">
                  <input type="number" min="0" max="30" step="0.5" value={form.vat.rate} onChange={(e) => setNested("vat", { rate: e.target.value })} aria-label={`${r.vat} %`} disabled={readOnly} />
                  <span>%</span>
                </div>
                <Choice
                  name="vat_inc"
                  value={form.vat.included ? "in" : "top"}
                  options={[
                    ["top", r.vatOnTop],
                    ["in", r.vatIncluded],
                  ]}
                  onChange={(v) => setNested("vat", { included: v === "in" })}
                  disabled={readOnly}
                />
              </div>
            )}
            <label className="md-switch">
              <input type="checkbox" checked={!!form.service_charge?.enabled} onChange={(e) => setNested("service_charge", { enabled: e.target.checked })} disabled={readOnly} />
              <span className="md-switch-track" />
              <span>{r.service}</span>
            </label>
            {form.service_charge?.enabled && (
              <div className="rs-tax-row">
                <div className="rs-affix small">
                  <input type="number" min="0" max="30" step="0.5" value={form.service_charge.rate} onChange={(e) => setNested("service_charge", { rate: e.target.value })} aria-label={`${r.service} %`} disabled={readOnly} />
                  <span>%</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="panel-card">
          <div className="pe-list-head">
            <h2 style={{ margin: 0 }}>{r.payments}</h2>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={addMethod} disabled={readOnly}>
              {limit && methods.length >= limit ? <Lock size={14} /> : <Plus size={15} />} {r.addPayment}
            </button>
          </div>
          <p className="rs-muted" style={{ margin: "6px 0 12px" }}>
            {limit ? r.paymentsHint.replace("{n}", methods.length).replace("{max}", limit) : r.paymentsUnlimited}
          </p>
          <ul className="rs-methods">
            {methods.map((m, i) => (
              <li key={m._id || `new-${i}`}>
                <input value={m.name} maxLength={40} placeholder={r.paymentName} onChange={(e) => setMethod(i, { name: e.target.value })} aria-label={r.paymentName} disabled={readOnly} />
                <select value={m.kind} onChange={(e) => setMethod(i, { kind: e.target.value })} aria-label="Kind" disabled={readOnly}>
                  {Object.entries(r.kinds).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <label className="md-switch" title={r.active}>
                  <input type="checkbox" checked={m.active !== false} onChange={(e) => setMethod(i, { active: e.target.checked })} disabled={readOnly} />
                  <span className="md-switch-track" />
                </label>
                <button
                  type="button"
                  className="md-icon-btn md-icon-btn-danger"
                  onClick={() => setForm((f) => ({ ...f, payment_methods: f.payment_methods.filter((_, j) => j !== i) }))}
                  aria-label={r.remove}
                  disabled={readOnly || methods.length <= 1}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
          {limit && methods.length >= limit && (
            <button type="button" className="rs-upsell" onClick={() => ctx.askBuy("rest_payments")} disabled={readOnly}>
              <CoinIcon size={16} /> {r.addonNames.rest_payments} · {r.addonWhat.rest_payments}
            </button>
          )}
        </section>

        <section className="panel-card">
          <h2>{r.receipt}</h2>
          <div className="md-fields-grid">
            <Field label={r.receiptSize}>
              <Choice
                name="receipt_size"
                value={form.receipt_size}
                options={[
                  [80, "80 mm"],
                  [58, "58 mm"],
                ]}
                onChange={(v) => set("receipt_size")(Number(v))}
                disabled={readOnly}
              />
            </Field>
            <Field label={r.billNumbers}>
              <Choice
                name="bill_numbering"
                value={form.bill_numbering}
                options={[
                  ["daily", r.billDaily],
                  ["running", r.billRunning],
                ]}
                onChange={set("bill_numbering")}
                disabled={readOnly}
              />
            </Field>
            <Field label={r.footer} full htmlFor="rs-footer">
              <input id="rs-footer" maxLength={200} value={form.receipt_footer} onChange={set("receipt_footer")} placeholder={r.footerPh} disabled={readOnly} />
            </Field>
            <Field label={r.wifiName} htmlFor="rs-wifi">
              <input id="rs-wifi" maxLength={40} value={form.wifi_name} onChange={set("wifi_name")} disabled={readOnly} />
            </Field>
            <Field label={r.wifiPass} htmlFor="rs-wifi-pass">
              <input id="rs-wifi-pass" maxLength={40} value={form.wifi_pass} onChange={set("wifi_pass")} disabled={readOnly} />
            </Field>
          </div>
        </section>

        <section className="panel-card">
          <h2>{r.printers}</h2>
          {ctx.addonOn("rest_printer") ? (
            <>
              <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
                {r.printersSub}
              </p>
              <div className="md-fields-grid">
                <Field label={r.receiptPrinter} htmlFor="rs-rp-type">
                  <select id="rs-rp-type" value={printer.type} onChange={(e) => set("receipt_printer")({ ...printer, type: e.target.value })} disabled={readOnly}>
                    {Object.entries(r.printerTypes).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                {printer.type !== "none" && (
                  <Field label={r.printerAddress} htmlFor="rs-rp-addr">
                    <input
                      id="rs-rp-addr"
                      maxLength={100}
                      value={printer.address}
                      onChange={(e) => set("receipt_printer")({ ...printer, address: e.target.value })}
                      placeholder={printer.type === "network" ? "192.168.1.50" : "USB001"}
                      disabled={readOnly}
                    />
                  </Field>
                )}
              </div>
              <small className="rs-muted">{r.kitchenPrintersHint}</small>
            </>
          ) : (
            <AddonPrompt addonKey="rest_printer" ctx={ctx} sub={r.printerLockedSub} />
          )}
        </section>
        <SaveBar dirty={dirty || needsFirstSave} saving={saving} onSave={save} onUndo={undo} r={r} disabled={readOnly || methods.some((m) => !String(m.name).trim())} />
      </div>
      <aside className="rs-side">
        <LiveReceipt s={{ ...settings, ...form }} />
        <button type="button" className="md-btn md-btn-ghost sa-btn-sm xt-change-look" onClick={() => ctx.go("receipt")}>
          <ReceiptText size={15} /> {r.tabs.receipt}
        </button>
      </aside>
    </div>
  );
}
