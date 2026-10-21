import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, Lock, ReceiptText } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import { Receipt, ReceiptPaper } from "../../../pos/receipt";
import { RECEIPT_THEMES, themeDesc, themeName } from "../../../pos/themes";
import { useReportText } from "./report-text";
import { useExtrasText } from "./extras-text";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// a made-up paid bill, printed with the restaurant's real name, logo and money settings
export function sampleOrder(x) {
  const lines = x.sample.map(([en, km, qty, price], i) => ({ id: `s${i}`, item_id: `s${i}`, name_en: en, name_km: km, qty, unit_price: price, addons: i === 0 ? [{ name: "Less sugar", price: 0 }] : [], status: "sent" }));
  const now = new Date().toISOString();
  return {
    number: "A-0042",
    table_name: "A3",
    type: "dine_in",
    status: "paid",
    lines,
    payments: [{ id: "p", method: "Cash", kind: "cash", currency: "USD", amount: 20 }],
    change: { usd: 0, khr: 0 },
    discount: { kind: "", value: 0 },
    opened_at: now,
    paid_at: now,
    closed_by: { name: "Dara" },
  };
}
export const moneyOfSettings = (s) => ({ currency: s.currency || "USD", khr_rate: s.khr_rate || 4100, khr_rounding: s.khr_rounding || 100, vat: s.vat || {}, service_charge: s.service_charge || {} });
export const restaurantOfSettings = (s) => ({ name_km: s.name_km, name_en: s.name_en, logo: s.logo?.url || "", address: s.address, phone: s.phone, tin: s.tin, receipt: { footer: s.receipt_footer, wifi_name: s.wifi_name, wifi_pass: s.wifi_pass } });

// Receipt look: Classic (free) + 10 paid looks, each unlocked once for this restaurant
export default function ReceiptTab({ ctx }) {
  const { r, lang, settings, readOnly } = ctx;
  const x = useExtrasText();
  const R = useReportText();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [buying, setBuying] = useState(null);
  const load = useCallback(() => restaurantService.receiptThemes.get(ctx.id).then((res) => setData(res.data)), [ctx.id]);
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const order = useMemo(() => sampleOrder(x), [x]);
  const money = moneyOfSettings(settings);
  const restaurant = restaurantOfSettings(settings);
  const size = settings.receipt_size === 58 ? 58 : 80;

  const use = async (theme) => {
    setBusy(theme);
    try {
      const res = await restaurantService.receiptThemes.use(ctx.id, theme);
      setData(res.data);
      ctx.setSettings({ ...settings, receipt_theme: theme });
      ctx.notify({ type: "success", text: r.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };

  if (!data) return <ListSkeleton rows={4} />;
  const all = [...data.free, ...data.paid];
  const has = (k) => data.free.includes(k) || data.owned.includes(k);
  return (
    <div className="rs-col">
      <section className="panel-card pt-hero">
        <span className="pt-ic">
          <ReceiptText size={26} />
        </span>
        <div>
          <h2>{x.rtTitle}</h2>
          <p className="rs-muted">{x.rtSub}</p>
        </div>
      </section>
      <div className="xt-grid">
        {all.map((k) => {
          const on = data.current === k;
          return (
            <article key={k} className={`xt-card ${on ? "on" : ""}`}>
              <div className="xt-paper">
                <div className="xt-paper-scale">
                  <ReceiptPaper size={size}>
                    <Receipt order={order} t={R.receipt} paidView restaurant={restaurant} money={money} theme={k} />
                  </ReceiptPaper>
                </div>
              </div>
              <div className="xt-meta">
                <b>
                  {themeName(RECEIPT_THEMES, k, lang)}
                  {data.free.includes(k) ? (
                    <span className="xt-tag">{x.free}</span>
                  ) : data.owned.includes(k) ? (
                    <span className="xt-tag own">
                      <BadgeCheck size={12} /> {x.owned}
                    </span>
                  ) : null}
                </b>
                <small className="rs-muted">{themeDesc(RECEIPT_THEMES, k, lang)}</small>
              </div>
              {on ? (
                <span className="xt-state">
                  <Check size={16} /> {x.inUse}
                </span>
              ) : has(k) ? (
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => use(k)} disabled={readOnly || !!busy}>
                  {x.use}
                </button>
              ) : (
                <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuying(k)} disabled={readOnly}>
                  <Lock size={14} /> {x.unlock.replace("{coins}", "")} <CoinIcon size={14} /> {fmt(data.price)}
                </button>
              )}
            </article>
          );
        })}
      </div>
      <p className="rs-muted xt-note">{x.rtNote}</p>

      {buying && (
        <PurchaseModal
          stage={
            <div className="rs-stage xt-stage">
              <div className="xt-paper-scale small">
                <ReceiptPaper size={size}>
                  <Receipt order={order} t={R.receipt} paidView restaurant={restaurant} money={money} theme={buying} />
                </ReceiptPaper>
              </div>
            </div>
          }
          badge={x.rtTitle}
          title={x.rtBuyTitle.replace("{name}", themeName(RECEIPT_THEMES, buying, lang))}
          sub={x.rtBuySub}
          perks={[x.rtPerk, `${r.oneTime} · ${r.forever}`]}
          price={data.price}
          buyLabel={r.buy.replace("{coins}", `${fmt(data.price)} ${r.coins}`)}
          buy={() => restaurantService.receiptThemes.buy(ctx.id, buying)}
          doneSub={x.rtDone.replace("{name}", themeName(RECEIPT_THEMES, buying, lang))}
          onDone={() => {
            const k = buying;
            load().then(() => use(k));
          }}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}
