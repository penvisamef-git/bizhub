import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Check, Coffee, CupSoda, IceCreamCone, Lock, MonitorSmartphone, Pizza, Salad, Soup } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import { REST_POS_KEYS, loadRestPosFont, restPosDesc, restPosLookOf, restPosName, restPosVars } from "../../../pos/restThemes";
import { useExtrasText } from "./extras-text";
import "./poslook.css";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const DISHES = [
  [Soup, "Noodle soup", "គុយទាវ", "2.50", "#f59e0b"],
  [Coffee, "Iced coffee", "កាហ្វេទឹកកក", "1.50", "#92400e"],
  [Salad, "Mango salad", "ញាំស្វាយ", "3.00", "#16a34a"],
  [Pizza, "Fried rice", "បាយឆា", "2.75", "#dc2626"],
  [CupSoda, "Lemon tea", "តែក្រូចឆ្មា", "1.25", "#0ea5e9"],
  [IceCreamCone, "Ice cream", "ការ៉េម", "1.75", "#db2777"],
];

// a small live picture of the POS in one look
export function PosMock({ k, name, lang }) {
  const d = restPosLookOf(k);
  useEffect(() => loadRestPosFont(k), [k]);
  return (
    <div className={`rpm h-${d.head} t-${d.tile} k-${d.ticket} ${d.dark ? "dark" : ""}`} style={restPosVars(k)} aria-hidden="true">
      <div className="rpm-top">
        <span className="rpm-logo">{(name || "B").slice(0, 1)}</span>
        <b>{name}</b>
        <span className="rpm-staff">Dara</span>
      </div>
      <div className="rpm-body">
        <div className="rpm-left">
          <div className="rpm-chips">
            <span className="on">{lang === "km" ? "ទាំងអស់" : "All"}</span>
            <span>{lang === "km" ? "ម្ហូប" : "Food"}</span>
            <span>{lang === "km" ? "ភេសជ្ជៈ" : "Drinks"}</span>
          </div>
          <div className="rpm-items">
            {DISHES.map(([Icon, en, km, price, c]) => (
              <span key={en} className="rpm-item">
                <span className="rpm-img" style={{ "--c": c }}>
                  <Icon size={22} />
                </span>
                <b>{lang === "km" ? km : en}</b>
                <em>${price}</em>
              </span>
            ))}
          </div>
        </div>
        <div className="rpm-ticket">
          <b>{lang === "km" ? "តុ A3" : "Table A3"}</b>
          <span>
            <i>2 × {lang === "km" ? "គុយទាវ" : "Noodle soup"}</i>
            <i>$5.00</i>
          </span>
          <span>
            <i>1 × {lang === "km" ? "កាហ្វេទឹកកក" : "Iced coffee"}</i>
            <i>$1.50</i>
          </span>
          <span className="rpm-total">
            <i>{lang === "km" ? "សរុប" : "Total"}</i>
            <i>$6.50</i>
          </span>
          <span className="rpm-pay">{lang === "km" ? "គិតលុយ" : "Pay"}</span>
        </div>
      </div>
    </div>
  );
}

// POS look: Classic (free) + 12 looks, each unlocked once (rest_pos_theme)
export default function PosLookTab({ ctx }) {
  const { r, lang, settings, readOnly } = ctx;
  const x = useExtrasText();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [buying, setBuying] = useState(null);
  const name = settings.name_en || settings.name_km || "BizHub";
  const load = useCallback(() => restaurantService.posThemes.get(ctx.id).then((res) => setData(res.data)), [ctx.id]);
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  const use = async (theme) => {
    setBusy(theme);
    try {
      const res = await restaurantService.posThemes.use(ctx.id, theme);
      setData(res.data);
      ctx.setSettings({ ...settings, pos_theme: theme });
      ctx.notify({ type: "success", text: r.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  if (!data) return <ListSkeleton rows={4} />;
  const has = (k) => data.free.includes(k) || data.owned.includes(k);
  return (
    <div className="rs-col">
      <section className="panel-card pt-hero">
        <span className="pt-ic">
          <MonitorSmartphone size={26} />
        </span>
        <div>
          <h2>{x.plTitle}</h2>
          <p className="rs-muted">{x.plSub.replace("{coins}", fmt(data.price))}</p>
        </div>
      </section>
      <div className="pl-grid">
        {REST_POS_KEYS.filter((k) => [...data.free, ...data.paid].includes(k)).map((k) => {
          const on = data.current === k;
          return (
            <article key={k} className={`pl-card ${on ? "on" : ""}`} data-testid={`pl-${k}`}>
              <PosMock k={k} name={name} lang={lang} />
              <div className="pl-meta">
                <b>
                  {restPosName(k, lang)}
                  {data.free.includes(k) ? (
                    <span className="xt-tag">{x.free}</span>
                  ) : data.owned.includes(k) ? (
                    <span className="xt-tag own">
                      <BadgeCheck size={12} /> {x.owned}
                    </span>
                  ) : null}
                </b>
                <small className="rs-muted">{restPosDesc(k, lang)}</small>
              </div>
              {on ? (
                <span className="xt-state">
                  <Check size={16} /> {x.inUse}
                </span>
              ) : has(k) ? (
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => use(k)} disabled={readOnly || !!busy} data-testid={`pl-use-${k}`}>
                  {x.use}
                </button>
              ) : (
                <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuying(k)} disabled={readOnly} data-testid={`pl-buy-${k}`}>
                  <Lock size={14} /> <CoinIcon size={14} /> {fmt(data.price)}
                </button>
              )}
            </article>
          );
        })}
      </div>
      <p className="rs-muted xt-note">{x.plNote}</p>
      {buying && (
        <PurchaseModal
          stage={
            <div className="rs-stage pl-stage">
              <PosMock k={buying} name={name} lang={lang} />
            </div>
          }
          badge={x.plTitle}
          title={x.plBuyTitle.replace("{name}", restPosName(buying, lang))}
          sub={x.plBuySub}
          perks={[x.plPerk, `${r.oneTime} · ${r.forever}`]}
          price={data.price}
          buyLabel={r.buy.replace("{coins}", `${fmt(data.price)} ${r.coins}`)}
          buy={() => restaurantService.posThemes.buy(ctx.id, buying)}
          doneSub={x.plDone.replace("{name}", restPosName(buying, lang))}
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
