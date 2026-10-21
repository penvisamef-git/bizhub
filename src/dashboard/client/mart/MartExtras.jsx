import { useCallback, useEffect, useState } from "react";
import {
  BadgePercent,
  CalendarX,
  ClipboardCheck,
  Gift,
  MapPinned,
  Monitor,
  Network,
  Scale,
  TrendingUp,
  BadgeCheck,
  Barcode,
  Check,
  CreditCard,
  Globe,
  Send,
  HandCoins,
  History,
  ShoppingBag,
  Truck,
  Vault,
  Lock,
  Package,
  Printer,
  Users,
} from "lucide-react";
import { martService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import { MART_THEMES, SAMPLE_SALE, martThemeName } from "../../../pos/mart/themes";
import { ReceiptThumb } from "../../../pos/mart/receipt";
import { fmtDate } from "./text";

const ADDON_ICONS = {
  mart_staff: Users,
  mart_payments: CreditCard,
  mart_stock: Package,
  mart_printer: Printer,
  mart_history: History,
  mart_debt: HandCoins,
  mart_shifts: Vault,
  mart_labels: Barcode,
  mart_suppliers: Truck,
  mart_website: Globe,
  mart_shop: ShoppingBag,
  mart_telegram: Send,
  mart_expiry: CalendarX,
  mart_loyalty: Gift,
  mart_promos: BadgePercent,
  mart_profit: TrendingUp,
  mart_purchase: ClipboardCheck,
  mart_display: Monitor,
  mart_scale: Scale,
  mart_delivery: MapPinned,
  mart_branches: Network,
};
export const YEARLY = ["mart_staff", "mart_stock", "mart_history", "mart_debt", "mart_website", "mart_shop", "mart_telegram", "mart_expiry", "mart_loyalty", "mart_promos", "mart_profit", "mart_delivery", "mart_branches"];

// Add-ons: unlimited cashiers, more payment methods, stock control, printing — same cards as the other businesses
export function AddonsTab({ ctx }) {
  const { m, data, readOnly, lang } = ctx;
  return (
    <div className="rs-col">
      <section className="panel-card">
        <h2 style={{ margin: 0 }}>{m.tabs.addons}</h2>
        <p className="rs-muted" style={{ margin: "6px 0 0" }}>
          {m.addonsSub}
        </p>
      </section>
      <div className="gh-addons">
        {Object.keys(ADDON_ICONS).map((k) => {
          const a = data.addons[k] || {};
          const Icon = ADDON_ICONS[k];
          const info = m.addonInfo[k];
          const renew = a.active && YEARLY.includes(k) && a.status === "expiring";
          return (
            <section key={k} className={`panel-card gh-addon ${a.active ? "on" : ""}`}>
              <span className="rs-addon-ic">
                <Icon size={22} />
              </span>
              <b>{info.name}</b>
              <p className="rs-muted">{info.what}</p>
              <ul className="at-perks">
                {[...info.perks, `${a.price ?? ""} ${m.coins} · ${YEARLY.includes(k) ? m.perYear : m.forever}`].map((x) => (
                  <li key={x}>
                    <Check size={14} /> {x}
                  </li>
                ))}
              </ul>
              {a.active && !renew ? (
                <span className="rs-pill ok">
                  <Check size={13} /> {m.owned}
                  {a.expires_at ? ` · ${m.until.replace("{date}", fmtDate(a.expires_at, lang))}` : ""}
                </span>
              ) : (
                <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly}>
                  <CoinIcon size={15} /> {(renew ? m.renewAddon : m.unlock).replace("{coins}", a.price ?? "")}
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

// Printing (mart_printer) + receipt templates (classic free, others mart_print_theme)
export function PrintTab({ ctx }) {
  const { m, data, readOnly, lang } = ctx;
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      martService
        .print(ctx.id)
        .then((r) => setInfo(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx],
  );
  useEffect(() => {
    load();
  }, [load, data]);
  const save = async (body) => {
    setBusy(true);
    try {
      const r = await martService.setPrint(ctx.id, body);
      setInfo(r.data);
      ctx.notify({ type: "success", text: m.saved });
      ctx.reload();
    } catch (e) {
      if (e.status === 402 && e.response?.product) ctx.askBuy({ addon: e.response.product, item: e.response.item });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  if (!info) return <p className="rs-muted">…</p>;
  const b = data.business;
  const shop = { name: b.name, logo_url: b.logo_url, address: b.address, phone: b.phone, receipt_note: data.settings.receipt_note || "" };
  return (
    <div className="rs-col">
      <section className="panel-card">
        <h2 style={{ margin: 0 }}>{m.tabs.print}</h2>
        <p className="rs-muted" style={{ margin: "4px 0 14px" }}>
          {m.printSub}
        </p>
        {!info.on ? (
          <div className="at-mgr-note">
            <Lock size={16} />
            <span>{m.printLocked}</span>
            <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "mart_printer" })} disabled={readOnly}>
              <CoinIcon size={14} /> {m.unlock.replace("{coins}", info.addon_price)} · {m.forever}
            </button>
          </div>
        ) : (
          <div className="md-fields">
            <div className="md-field">
              <label>{m.paper}</label>
              <div className="at-seg">
                {["80", "58"].map((k) => (
                  <button key={k} type="button" className={info.size === k ? "on" : ""} onClick={() => save({ size: k })} disabled={readOnly || busy}>
                    {k} mm
                  </button>
                ))}
              </div>
            </div>
            <label className="md-switch">
              <input type="checkbox" checked={info.auto} onChange={(e) => save({ auto: e.target.checked })} disabled={readOnly || busy} />
              <span className="md-switch-track" />
              <span>{m.autoPrint}</span>
            </label>
          </div>
        )}
      </section>
      <section className="panel-card">
        <h2 style={{ margin: 0 }}>{m.templates}</h2>
        <p className="rs-muted" style={{ margin: "4px 0 14px" }}>
          {m.templatesSub.replace("{coins}", info.price)}
        </p>
        <div className="mt-themes">
          {MART_THEMES.map((t) => {
            const owned = info.owned.includes(t.key);
            const current = info.current === t.key;
            return (
              <div key={t.key} className={`mt-theme ${current ? "on" : ""}`}>
                <ReceiptThumb sale={SAMPLE_SALE} shop={shop} m={m} lang={lang} theme={t.key} />
                <span className="mt-theme-foot">
                  <b>{martThemeName(t.key, lang)}</b>
                  {current ? (
                    <span className="rs-pill on">
                      <BadgeCheck size={12} /> {m.inUse}
                    </span>
                  ) : owned ? (
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => save({ theme: t.key })} disabled={readOnly || busy}>
                      {m.use}
                    </button>
                  ) : (
                    <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "mart_print_theme", item: t.key })} disabled={readOnly}>
                      <CoinIcon size={13} /> {info.price}
                    </button>
                  )}
                </span>
                {t.key === "classic" && <em className="mt-theme-free">{m.free}</em>}
                {owned && t.key !== "classic" && !current && <em className="mt-theme-free own">{m.yours}</em>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
