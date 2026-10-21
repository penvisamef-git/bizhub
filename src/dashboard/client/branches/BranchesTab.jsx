import { useCallback, useEffect, useState } from "react";
import { BedDouble, Check, Link2, Loader2, Network, Store, Trophy, Unlink, UtensilsCrossed } from "lucide-react";
import { branchesService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import "./branches.css";

const TEXT = {
  en: {
    title: { restaurant: "Several restaurants", guest_house: "Several guest houses" },
    sub: {
      restaurant: "Own more than one restaurant? Link them into one group and see the sales of every branch — and all together — in one place.",
      guest_house: "Own more than one guest house? Link them into one group and see money, check-ins and occupancy of every place — and all together.",
    },
    perks: {
      restaurant: ["One report for all branches: sales, bills, guests", "Best sellers across every branch", "Each branch keeps its own menu, staff and POS", "Up to 20 branches · paid once, on the main restaurant"],
      guest_house: ["One report for all places: money, check-ins, nights", "Occupancy of each place and all together", "Who is in house, arriving and leaving today — everywhere", "Up to 20 places · paid once, on the main guest house"],
    },
    unlock: "Unlock · {coins} coins / year",
    owned: "Unlocked",
    group: "Your group",
    main: "Main",
    branch: "Branch",
    here: "You are here",
    unlink: "Remove from group",
    unlinkAsk: "Remove {name} from the group? Its own data stays.",
    linkTitle: "Add a branch",
    linkSub: "Your other places of the same type that are not in a group yet.",
    link: "Add to group",
    noCandidates: "No other place to add. Create another one from My businesses, then add it here.",
    isBranchOf: "This place is a branch of {name}. The group is managed from there.",
    needMain: "The main place's add-on has ended — renew it there to see the report.",
    soloHint: "Add at least one branch to see the report for all.",
    report: "Report for all",
    day: "Day",
    month: "Month",
    all: "All together",
    place: "Place",
    sales: { restaurant: "Sales", guest_house: "Money in" },
    bills: { restaurant: "Bills", guest_house: "Payments" },
    avg: "Average bill",
    guests: "Guests",
    voids: "Voided",
    checkins: "Check-ins",
    nights: "Nights sold",
    occupancy: "Occupancy",
    rooms: "Rooms",
    inHouse: "In house now",
    arrivals: "Arriving today",
    departures: "Leaving today",
    best: "Best sellers (all branches)",
    noSales: "Nothing sold in this period.",
    sold: "{n} sold",
    saved: "Saved",
    off: "suspended",
  },
  km: {
    title: { restaurant: "ភោជនីយដ្ឋានច្រើនសាខា", guest_house: "ផ្ទះសំណាក់ច្រើនកន្លែង" },
    sub: {
      restaurant: "មានភោជនីយដ្ឋានច្រើនជាងមួយ? ភ្ជាប់ពួកវាជាក្រុមតែមួយ ហើយមើលការលក់របស់សាខានីមួយៗ និងសរុបទាំងអស់ នៅកន្លែងតែមួយ។",
      guest_house: "មានផ្ទះសំណាក់ច្រើនជាងមួយ? ភ្ជាប់ពួកវាជាក្រុមតែមួយ ហើយមើលចំណូល ការចូលស្នាក់នៅ និងអត្រាបន្ទប់ពេញ របស់កន្លែងនីមួយៗ និងសរុប។",
    },
    perks: {
      restaurant: ["របាយការណ៍តែមួយសម្រាប់គ្រប់សាខា៖ ការលក់ វិក្កយបត្រ ភ្ញៀវ", "មុខម្ហូបលក់ដាច់ជាងគេនៅគ្រប់សាខា", "សាខានីមួយៗរក្សាម៉ឺនុយ បុគ្គលិក និង POS ផ្ទាល់ខ្លួន", "រហូតដល់ 20 សាខា · បង់តែម្តង លើភោជនីយដ្ឋានមេ"],
      guest_house: ["របាយការណ៍តែមួយសម្រាប់គ្រប់កន្លែង៖ ចំណូល ការចូលស្នាក់នៅ យប់", "អត្រាបន្ទប់ពេញ របស់កន្លែងនីមួយៗ និងសរុប", "អ្នកកំពុងស្នាក់នៅ មកដល់ និងចេញថ្ងៃនេះ — គ្រប់កន្លែង", "រហូតដល់ 20 កន្លែង · បង់តែម្តង លើផ្ទះសំណាក់មេ"],
    },
    unlock: "ដោះសោ · {coins} កាក់ / ឆ្នាំ",
    owned: "បានដោះសោ",
    group: "ក្រុមរបស់អ្នក",
    main: "មេ",
    branch: "សាខា",
    here: "អ្នកនៅទីនេះ",
    unlink: "ដកចេញពីក្រុម",
    unlinkAsk: "ដក {name} ចេញពីក្រុម? ទិន្នន័យរបស់វានៅដដែល។",
    linkTitle: "បន្ថែមសាខា",
    linkSub: "កន្លែងផ្សេងទៀតរបស់អ្នកដែលជាប្រភេទដូចគ្នា ហើយមិនទាន់នៅក្នុងក្រុម។",
    link: "បន្ថែមចូលក្រុម",
    noCandidates: "គ្មានកន្លែងផ្សេងដើម្បីបន្ថែមទេ។ បង្កើតមួយទៀតពី អាជីវកម្មរបស់ខ្ញុំ រួចបន្ថែមនៅទីនេះ។",
    isBranchOf: "កន្លែងនេះជាសាខារបស់ {name}។ ក្រុមត្រូវបានគ្រប់គ្រងពីទីនោះ។",
    needMain: "មុខងារនៅកន្លែងមេបានផុតកំណត់ — សូមបន្តនៅទីនោះ ដើម្បីមើលរបាយការណ៍។",
    soloHint: "បន្ថែមសាខាយ៉ាងហោចណាស់មួយ ដើម្បីមើលរបាយការណ៍សរុប។",
    report: "របាយការណ៍សរុប",
    day: "ថ្ងៃ",
    month: "ខែ",
    all: "សរុបទាំងអស់",
    place: "កន្លែង",
    sales: { restaurant: "ការលក់", guest_house: "ចំណូល" },
    bills: { restaurant: "វិក្កយបត្រ", guest_house: "ការបង់ប្រាក់" },
    avg: "វិក្កយបត្រមធ្យម",
    guests: "ភ្ញៀវ",
    voids: "បានលុប",
    checkins: "ចូលស្នាក់នៅ",
    nights: "យប់ដែលលក់",
    occupancy: "អត្រាពេញ",
    rooms: "បន្ទប់",
    inHouse: "កំពុងស្នាក់នៅ",
    arrivals: "មកដល់ថ្ងៃនេះ",
    departures: "ចេញថ្ងៃនេះ",
    best: "លក់ដាច់ជាងគេ (គ្រប់សាខា)",
    noSales: "គ្មានការលក់ក្នុងរយៈពេលនេះ។",
    sold: "លក់ {n}",
    saved: "បានរក្សាទុក",
    off: "ផ្អាក",
  },
};
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const money = (v, cur) => (cur === "KHR" ? `${Math.round(Number(v) || 0).toLocaleString("en-US")}៛` : `$${(Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const localToday = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

// Several places (rest_branches / gh_branches): the group, add / remove branches, one report for all.
//   category "restaurant" | "guest_house" · owned / price of the add-on on THIS place · onBuy opens the buy box
export default function BranchesTab({ id, category, lang, owned, price, readOnly, onBuy, notify }) {
  const x = TEXT[lang] || TEXT.en;
  const [g, setG] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(""); // id being added / removed
  const load = useCallback(
    () =>
      branchesService
        .get(id)
        .then((r) => setG(r.data))
        .catch((e) => setError(e.message)),
    [id],
  );
  useEffect(() => {
    load();
  }, [load, owned]);
  const Icon = category === "restaurant" ? UtensilsCrossed : BedDouble;
  const isBranch = g?.role === "branch";
  const head = (
    <section className="panel-card br-head">
      <span className="br-head-ic">
        <Network size={24} />
      </span>
      <div className="br-head-text">
        <h2>{x.title[category]}</h2>
        <p className="rs-muted">{x.sub[category]}</p>
        {!isBranch && (
          <ul className="br-perks">
            {x.perks[category].map((p) => (
              <li key={p}>
                <Check size={14} /> {p}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!isBranch &&
        (owned ? (
          <span className="rs-pill on br-owned">
            <Check size={13} /> {x.owned}
          </span>
        ) : (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={onBuy} disabled={readOnly} data-testid="br-buy">
            <CoinIcon size={15} /> {x.unlock.replace("{coins}", price ?? "")}
          </button>
        ))}
    </section>
  );
  if (error && !g)
    return (
      <div className="rs-col">
        {head}
        <div className="md-form-error">{error}</div>
      </div>
    );
  if (!g) return <div className="rs-col">{head}</div>;
  const link = async (bid) => {
    if (busy) return;
    setBusy(bid);
    try {
      const r = await branchesService.link(id, bid);
      setG({ ...g, ...r.data, candidates: g.candidates.filter((c) => c._id !== bid) });
      notify?.({ type: "success", text: x.saved });
    } catch (e) {
      notify?.({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const unlink = async (s) => {
    if (busy || !window.confirm(x.unlinkAsk.replace("{name}", s.name))) return;
    setBusy(s._id);
    try {
      await branchesService.unlink(id, s._id);
      await load();
    } catch (e) {
      notify?.({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const showGroup = isBranch || (owned && g.shops.length > 0);
  return (
    <div className="rs-col">
      {head}
      {isBranch && <div className="br-note">{x.isBranchOf.replace("{name}", g.main?.name || "")}</div>}
      {showGroup && (
        <section className="panel-card">
          <h3 className="br-h3">{x.group}</h3>
          <div className="br-shops">
            {g.shops.map((s) => (
              <div key={s._id} className={`br-shop ${s.here ? "here" : ""}`} data-testid="br-shop">
                <span className="br-pic">{s.logo ? <img src={s.logo} alt="" /> : <Icon size={16} />}</span>
                <span className="br-shop-text">
                  <b>{s.name}</b>
                  <small className="rs-muted">
                    {s.is_main ? x.main : x.branch}
                    {!s.status ? ` · ${x.off}` : ""}
                  </small>
                </span>
                {s.here && <em className="rs-pill on">{x.here}</em>}
                {!s.is_main && !isBranch && (
                  <button type="button" className="md-icon-btn" onClick={() => unlink(s)} aria-label={x.unlink} title={x.unlink} disabled={readOnly || !!busy}>
                    {busy === s._id ? <Loader2 size={14} className="md-spin" /> : <Unlink size={14} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {!isBranch && owned && (
        <section className="panel-card">
          <h3 className="br-h3">{x.linkTitle}</h3>
          <p className="rs-muted br-sub">{x.linkSub}</p>
          {!g.candidates.length ? (
            <p className="rs-muted">{x.noCandidates}</p>
          ) : (
            <div className="br-shops">
              {g.candidates.map((c) => (
                <div key={c._id} className="br-shop">
                  <span className="br-pic">
                    <Store size={16} />
                  </span>
                  <span className="br-shop-text">
                    <b>{c.name}</b>
                  </span>
                  <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => link(c._id)} disabled={readOnly || !!busy} data-testid="br-link">
                    {busy === c._id ? <Loader2 size={14} className="md-spin" /> : <Link2 size={14} />} {x.link}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {showGroup && (!g.active ? <div className="br-note">{x.needMain}</div> : g.shops.length < 2 ? <p className="rs-muted">{x.soloHint}</p> : <Report id={id} category={category} x={x} lang={lang} />)}
    </div>
  );
}

function Report({ id, category, x }) {
  const [mode, setMode] = useState("day");
  const [day, setDay] = useState(localToday());
  const [month, setMonth] = useState(localToday().slice(0, 7));
  const [rep, setRep] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setError("");
    branchesService
      .report(id, mode === "day" ? { day } : { month })
      .then((r) => live && setRep(r.data))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [id, mode, day, month]);
  const rest = category === "restaurant";
  const cols = rest
    ? [
        ["sales", x.sales.restaurant, (s, cur) => money(s.sales, s.currency || cur)],
        ["count", x.bills.restaurant, (s) => fmt(s.count)],
        ["avg", x.avg, (s, cur) => money(s.avg, s.currency || cur)],
        ["guests", x.guests, (s) => fmt(s.guests)],
        ["voids", x.voids, (s) => fmt(s.voids)],
      ]
    : [
        ["sales", x.sales.guest_house, (s, cur) => money(s.sales, s.currency || cur)],
        ["checkins", x.checkins, (s) => fmt(s.checkins)],
        ["nights", x.nights, (s) => fmt(s.nights)],
        ["occupancy", x.occupancy, (s) => `${s.occupancy || 0}%`],
        ["in_house", x.inHouse, (s) => fmt(s.in_house)],
        ["arrivals", x.arrivals, (s) => fmt(s.arrivals)],
        ["departures", x.departures, (s) => fmt(s.departures)],
      ];
  const t = rep?.total;
  const kpis = rest
    ? t && [
        [x.sales.restaurant, money(t.sales, rep.currency)],
        [x.bills.restaurant, fmt(t.count)],
        [x.avg, money(t.avg, rep.currency)],
        [x.guests, fmt(t.guests)],
      ]
    : t && [
        [x.sales.guest_house, money(t.sales, rep.currency)],
        [x.checkins, fmt(t.checkins)],
        [x.occupancy, `${t.occupancy}%`],
        [x.inHouse, fmt(t.in_house)],
      ];
  const max = rep ? Math.max(1, ...rep.shops.map((s) => s.sales * (s.currency === rep.currency ? 1 : rep.currency === "USD" ? 1 / (s.khr_rate || 4100) : s.khr_rate || 4100))) : 1;
  return (
    <section className="panel-card">
      <div className="br-rep-head">
        <h3 className="br-h3">{x.report}</h3>
        <div className="br-period">
          <div className="br-seg">
            <button type="button" className={mode === "day" ? "on" : ""} onClick={() => setMode("day")}>
              {x.day}
            </button>
            <button type="button" className={mode === "month" ? "on" : ""} onClick={() => setMode("month")} data-testid="br-month">
              {x.month}
            </button>
          </div>
          {mode === "day" ? (
            <input type="date" value={day} max={localToday()} onChange={(e) => e.target.value && setDay(e.target.value)} />
          ) : (
            <input type="month" value={month} max={localToday().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          )}
        </div>
      </div>
      {error ? (
        <div className="md-form-error">{error}</div>
      ) : !rep ? (
        <p className="rs-muted">…</p>
      ) : (
        <>
          <div className="br-kpis">
            {kpis.map(([k, v]) => (
              <span key={k}>
                <small>{k}</small>
                <b data-testid="br-kpi">{v}</b>
              </span>
            ))}
          </div>
          <div className="br-table-wrap">
            <table className="br-table">
              <thead>
                <tr>
                  <th>{x.place}</th>
                  {cols.map(([k, label]) => (
                    <th key={k}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rep.shops.map((s) => {
                  const v = s.sales * (s.currency === rep.currency ? 1 : rep.currency === "USD" ? 1 / (s.khr_rate || 4100) : s.khr_rate || 4100);
                  return (
                    <tr key={s._id} className={s.here ? "here" : ""} data-testid="br-row">
                      <td>
                        <b>{s.name}</b>
                        <i className="br-bar" style={{ width: `${Math.round((v / max) * 100)}%` }} />
                      </td>
                      {cols.map(([k, , show]) => (
                        <td key={k}>{show(s, rep.currency)}</td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="total">
                  <td>
                    <b>{x.all}</b>
                  </td>
                  {cols.map(([k, , show]) => (
                    <td key={k}>{show({ ...t, currency: rep.currency }, rep.currency)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {rest && (
            <div className="br-best">
              <h4>
                <Trophy size={15} /> {x.best}
              </h4>
              {!rep.best.length ? (
                <p className="rs-muted">{x.noSales}</p>
              ) : (
                <ol>
                  {rep.best.map((b) => (
                    <li key={b.name}>
                      <span>{b.name}</span>
                      <small className="rs-muted">{x.sold.replace("{n}", fmt(b.qty))}</small>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
