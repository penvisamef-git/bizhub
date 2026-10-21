import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChefHat, Gift, Star, Ticket } from "lucide-react";
import { publicGet } from "../api/client";
import Logo from "../components/Logo";
import LangSwitch from "../components/LangSwitch";
import { useI18n } from "../i18n/I18nProvider";
import { CardPageSkeleton } from "../components/skeleton/Skeleton";
import "./member.css";

const TEXT = {
  en: {
    points: "points",
    member: "Member",
    since: "Member since {d}",
    visits: (n) => (n === 1 ? "1 visit" : `${n} visits`),
    rewards: "Swap your points",
    ready: "Ready",
    more: "{n} more",
    coupons: "Your coupons",
    couponHint: "Show this code to the cashier.",
    history: "History",
    none: "Nothing yet.",
    kinds: { earn: "Earned", redeem: "Used", refund: "Given back", adjust: "From the shop", reverse: "Bill cancelled", expire: "Expired" },
    how: "How to earn",
    perStep: "{n} point(s) for every {step} you spend",
    minBill: "on bills from {v}",
    byItem: "Extra points on some items",
    expire: "Points expire after {n} months without a visit",
    showCashier: "At the counter, give the cashier your phone number to collect and use points.",
    closed: "Page not available",
    closedSub: "This member page doesn't exist or the shop has turned points off.",
    free: "free item",
    gift: "gift",
    coupon: "coupon",
  },
  km: {
    points: "ពិន្ទុ",
    member: "សមាជិក",
    since: "សមាជិកតាំងពី {d}",
    visits: (n) => `មក ${n} ដង`,
    rewards: "ប្តូរពិន្ទុរបស់អ្នក",
    ready: "អាចប្តូរបាន",
    more: "ខ្វះ {n}",
    coupons: "គូប៉ុងរបស់អ្នក",
    couponHint: "បង្ហាញលេខកូដនេះដល់អ្នកគិតលុយ។",
    history: "ប្រវត្តិ",
    none: "មិនទាន់មាន។",
    kinds: { earn: "ទទួលបាន", redeem: "បានប្រើ", refund: "ផ្តល់ត្រឡប់", adjust: "ពីហាង", reverse: "វិក្កយបត្របានលុប", expire: "ផុតកំណត់" },
    how: "របៀបសន្សំពិន្ទុ",
    perStep: "{n} ពិន្ទុ រៀងរាល់ការចំណាយ {step}",
    minBill: "សម្រាប់វិក្កយបត្រចាប់ពី {v}",
    byItem: "ពិន្ទុបន្ថែមលើមុខម្ហូបមួយចំនួន",
    expire: "ពិន្ទុផុតកំណត់ក្រោយ {n} ខែ ដែលមិនបានមក",
    showCashier: "នៅតុគិតលុយ ប្រាប់លេខទូរស័ព្ទរបស់អ្នក ដើម្បីសន្សំ និងប្រើពិន្ទុ។",
    closed: "ទំព័រមិនមាន",
    closedSub: "ទំព័រសមាជិកនេះមិនមាន ឬហាងបានបិទពិន្ទុ។",
    free: "ម្ហូបឥតគិតថ្លៃ",
    gift: "កាដូ",
    coupon: "គូប៉ុង",
  },
};
const money = (n, c) => (c === "KHR" ? `${new Intl.NumberFormat("en-US").format(Math.round(n))}៛` : `$${(Number(n) || 0).toFixed(2)}`);
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// A member's own page: /public/member/:token (QR shown on the POS, link from the owner)
export default function MemberPage() {
  const { token } = useParams();
  const { lang } = useI18n();
  const t = TEXT[lang] || TEXT.en;
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    publicGet(`/member/${encodeURIComponent(token)}`)
      .then((r) => setData(r.data))
      .catch(() => setMissing(true));
  }, [token]);
  const R = data?.restaurant;
  const shop = R ? (lang === "km" ? R.name_km || R.name_en : R.name_en || R.name_km) : "";
  useEffect(() => {
    if (shop) document.title = shop;
  }, [shop]);

  if (missing) {
    return (
      <div className="standalone-page">
        <Logo height={34} />
        <h1>{t.closed}</h1>
        <p>{t.closedSub}</p>
      </div>
    );
  }
  if (!data) return <CardPageSkeleton />;
  const m = data.member;
  const preview = new URLSearchParams(window.location.search).get("preview");
  const theme = (preview && /^[a-z]{3,12}$/.test(preview) ? preview : data.theme) || "classic";
  const c = R.currency;
  const rules = data.rules;
  const date = (d) => new Date(d).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  const what = (r) => {
    const k = r.kind === "coupon" ? r.coupon_kind : r.kind;
    const v = k === "amount" ? `−${money(r.value, c)}` : k === "percent" ? `−${r.value}%` : k === "free_item" ? t.free : t.gift;
    return r.kind === "coupon" ? `${t.coupon}: ${v}` : v;
  };

  return (
    <div className={`mb mb-t-${theme}`} style={{ "--c": R.color || "#E0581A" }}>
      <div className="mb-lang">
        <LangSwitch />
      </div>
      <header className="mb-card">
        <div className="mb-shop">
          <span className="mb-logo">{R.logo ? <img src={R.logo} alt="" /> : <ChefHat size={22} />}</span>
          <b>{shop}</b>
        </div>
        <div className="mb-pts">
          <Star size={22} />
          <b>{fmt(m.points)}</b>
          <span>{t.points}</span>
        </div>
        <div className="mb-who">
          <b>{m.name || t.member}</b>
          <small>
            {m.phone} · {t.visits(m.visits)} · {t.since.replace("{d}", date(m.since))}
          </small>
        </div>
      </header>

      <main className="mb-main">
        {data.coupons.length > 0 && (
          <section>
            <h2>{t.coupons}</h2>
            <p className="mb-muted">{t.couponHint}</p>
            {data.coupons.map((cp) => (
              <div key={cp.id} className="mb-coupon">
                <Ticket size={18} />
                <span>
                  <b>{cp.name}</b>
                  <small>{cp.kind === "amount" ? `−${money(cp.value, c)}` : cp.kind === "percent" ? `−${cp.value}%` : t.free}</small>
                </span>
                <code>{cp.code}</code>
              </div>
            ))}
          </section>
        )}

        {data.rewards.length > 0 && (
          <section>
            <h2>{t.rewards}</h2>
            {data.rewards.map((r) => {
              const left = r.points - m.points;
              return (
                <div key={r._id} className={`mb-reward ${left <= 0 ? "ready" : ""}`}>
                  <span className="mb-reward-ic">{r.kind === "gift" || r.kind === "free_item" ? <Gift size={18} /> : <Ticket size={18} />}</span>
                  <span>
                    <b>{r.name}</b>
                    <small>{what(r)}</small>
                    <i className="mb-bar">
                      <i style={{ width: `${Math.min(100, (m.points / r.points) * 100)}%` }} />
                    </i>
                  </span>
                  <span className="mb-cost">
                    {fmt(r.points)}
                    <small>{left <= 0 ? t.ready : t.more.replace("{n}", fmt(left))}</small>
                  </span>
                </div>
              );
            })}
          </section>
        )}

        <section>
          <h2>{t.how}</h2>
          <ul className="mb-rules">
            {rules.by_amount && rules.points_per_step > 0 && (
              <li>
                {t.perStep.replace("{n}", rules.points_per_step).replace("{step}", money(rules.step, c))}
                {rules.min_bill > 0 ? ` · ${t.minBill.replace("{v}", money(rules.min_bill, c))}` : ""}
              </li>
            )}
            {rules.by_item && <li>{t.byItem}</li>}
            {rules.expire_months > 0 && <li>{t.expire.replace("{n}", rules.expire_months)}</li>}
            <li>{t.showCashier}</li>
          </ul>
        </section>

        <section>
          <h2>{t.history}</h2>
          {data.moves.length === 0 && <p className="mb-muted">{t.none}</p>}
          {data.moves.map((x, i) => (
            <div key={i} className="mb-move">
              <span>
                <b>{t.kinds[x.kind] || x.kind}</b>
                <small>
                  {[x.reward_name, x.order_number && `#${x.order_number}`, x.note].filter(Boolean).join(" · ")} {x.reward_name || x.order_number || x.note ? "· " : ""}
                  {date(x.at)}
                </small>
              </span>
              <b className={x.points > 0 ? "plus" : "minus"}>
                {x.points > 0 ? "+" : ""}
                {fmt(x.points)}
              </b>
            </div>
          ))}
        </section>
        <footer className="mb-foot">
          <Logo height={18} />
        </footer>
      </main>
    </div>
  );
}
