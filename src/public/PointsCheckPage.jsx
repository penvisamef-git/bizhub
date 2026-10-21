import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChefHat, Gift, Loader2, Star, Ticket } from "lucide-react";
import { publicGet, publicPost } from "../api/client";
import Logo from "../components/Logo";
import LangSwitch from "../components/LangSwitch";
import { useI18n } from "../i18n/I18nProvider";
import { CardPageSkeleton } from "../components/skeleton/Skeleton";
import "./member.css";

const TEXT = {
  en: {
    title: "Check my points",
    sub: "Type the phone number you gave the cashier.",
    phone: "Phone number",
    check: "Check",
    points: "points",
    coupons: (n) => (n === 1 ? "1 coupon waiting for you" : `${n} coupons waiting for you`),
    notFound: "This number isn't a member yet. Ask the cashier to join — it's free, and you collect points from your next bill.",
    rewards: "What your points can get",
    ready: "Ready",
    more: "{n} more",
    how: "How to earn",
    perStep: "{n} point(s) for every {step} you spend",
    byItem: "Extra points on some items",
    expire: "Points expire after {n} months without a visit",
    closed: "Page not available",
    closedSub: "This shop doesn't have reward points right now.",
    free: "free item",
    gift: "gift",
    coupon: "coupon",
    again: "Check another number",
  },
  km: {
    title: "ពិនិត្យពិន្ទុរបស់ខ្ញុំ",
    sub: "វាយលេខទូរស័ព្ទដែលអ្នកបានប្រាប់អ្នកគិតលុយ។",
    phone: "លេខទូរស័ព្ទ",
    check: "ពិនិត្យ",
    points: "ពិន្ទុ",
    coupons: (n) => `មានគូប៉ុង ${n} កំពុងរង់ចាំអ្នក`,
    notFound: "លេខនេះមិនទាន់ជាសមាជិកទេ។ សូមប្រាប់អ្នកគិតលុយដើម្បីចូលជាសមាជិក — ឥតគិតថ្លៃ ហើយអ្នកសន្សំពិន្ទុចាប់ពីវិក្កយបត្របន្ទាប់។",
    rewards: "ពិន្ទុរបស់អ្នកអាចប្តូរបាន",
    ready: "អាចប្តូរបាន",
    more: "ខ្វះ {n}",
    how: "របៀបសន្សំពិន្ទុ",
    perStep: "{n} ពិន្ទុ រៀងរាល់ការចំណាយ {step}",
    byItem: "ពិន្ទុបន្ថែមលើមុខម្ហូបមួយចំនួន",
    expire: "ពិន្ទុផុតកំណត់ក្រោយ {n} ខែ ដែលមិនបានមក",
    closed: "ទំព័រមិនមាន",
    closedSub: "ហាងនេះមិនមានពិន្ទុរង្វាន់ពេលនេះទេ។",
    free: "ម្ហូបឥតគិតថ្លៃ",
    gift: "កាដូ",
    coupon: "គូប៉ុង",
    again: "ពិនិត្យលេខផ្សេង",
  },
};
const money = (n, c) => (c === "KHR" ? `${new Intl.NumberFormat("en-US").format(Math.round(n))}៛` : `$${(Number(n) || 0).toFixed(2)}`);
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// The shop's "check my points" QR: /public/points/:token — anyone types a phone and sees that member's points
export default function PointsCheckPage() {
  const { token } = useParams();
  const { lang } = useI18n();
  const t = TEXT[lang] || TEXT.en;
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  useEffect(() => {
    publicGet(`/points/${encodeURIComponent(token)}`)
      .then((r) => setData(r.data))
      .catch(() => setMissing(true));
  }, [token]);
  const R = data?.restaurant;
  const shop = R ? (lang === "km" ? R.name_km || R.name_en : R.name_en || R.name_km) : "";
  useEffect(() => {
    if (shop) document.title = `${t.title} · ${shop}`;
  }, [shop, t.title]);

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
  const c = R.currency;
  const rules = data.rules;
  const preview = new URLSearchParams(window.location.search).get("preview");
  const theme = (preview && /^[a-z]{3,12}$/.test(preview) ? preview : data.theme) || "classic";
  const what = (r) => {
    const k = r.kind === "coupon" ? r.coupon_kind : r.kind;
    const v = k === "amount" ? `−${money(r.value, c)}` : k === "percent" ? `−${r.value}%` : k === "free_item" ? t.free : t.gift;
    return r.kind === "coupon" ? `${t.coupon}: ${v}` : v;
  };
  const check = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      setResult((await publicPost(`/points/${encodeURIComponent(token)}`, { phone })).data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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
        {result?.found ? (
          <>
            <div className="mb-pts">
              <Star size={22} />
              <b>{fmt(result.points)}</b>
              <span>{t.points}</span>
            </div>
            <div className="mb-who">
              <b>{result.name || "★"}</b>
              <small>{result.phone}</small>
            </div>
          </>
        ) : (
          <div className="mb-who">
            <span className="mb-title">{t.title}</span>
            <small>{t.sub}</small>
          </div>
        )}
      </header>

      <main className="mb-main">
        {!result?.found && (
          <form className="mb-form" onSubmit={check}>
            <label htmlFor="pc-phone">{t.phone}</label>
            <input id="pc-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 20))} placeholder="012 345 678" autoFocus />
            <button type="submit" disabled={busy || phone.replace(/\D/g, "").length < 8}>
              {busy ? <Loader2 size={18} className="md-spin" /> : t.check}
            </button>
          </form>
        )}
        {error && <div className="mb-note">{error}</div>}
        {result && !result.found && <div className="mb-note">{t.notFound}</div>}
        {result?.found && result.coupons > 0 && (
          <div className="mb-note">
            <Ticket size={15} /> {t.coupons(result.coupons)}
          </div>
        )}

        {data.rewards.length > 0 && (
          <section>
            <h2>{t.rewards}</h2>
            {data.rewards.map((r) => {
              const have = result?.found ? result.points : 0;
              const left = r.points - have;
              return (
                <div key={r._id} className={`mb-reward ${result?.found && left <= 0 ? "ready" : ""}`}>
                  <span className="mb-reward-ic">{r.kind === "gift" || r.kind === "free_item" ? <Gift size={18} /> : <Ticket size={18} />}</span>
                  <span>
                    <b>{r.name}</b>
                    <small>{what(r)}</small>
                    {result?.found && (
                      <i className="mb-bar">
                        <i style={{ width: `${Math.min(100, (have / r.points) * 100)}%` }} />
                      </i>
                    )}
                  </span>
                  <span className="mb-cost">
                    {fmt(r.points)}
                    {result?.found && <small>{left <= 0 ? t.ready : t.more.replace("{n}", fmt(left))}</small>}
                  </span>
                </div>
              );
            })}
          </section>
        )}

        <section>
          <h2>{t.how}</h2>
          <ul className="mb-rules">
            {rules.by_amount && rules.points_per_step > 0 && <li>{t.perStep.replace("{n}", rules.points_per_step).replace("{step}", money(rules.step, c))}</li>}
            {rules.by_item && <li>{t.byItem}</li>}
            {rules.expire_months > 0 && <li>{t.expire.replace("{n}", rules.expire_months)}</li>}
          </ul>
        </section>
        {result && (
          <button
            type="button"
            className="mb-again"
            onClick={() => {
              setResult(null);
              setPhone("");
            }}
          >
            {t.again}
          </button>
        )}
        <footer className="mb-foot">
          <Logo height={18} />
        </footer>
      </main>
    </div>
  );
}
