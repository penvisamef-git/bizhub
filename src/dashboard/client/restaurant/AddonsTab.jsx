import { useMemo, useState } from "react";
import { CalendarClock, Check, Clock3, Infinity as InfinityIcon, Search, X } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { ADDON_ICONS, fmtDate } from "./parts";
import { restTextFor } from "./text";

const FIND = {
  en: { search: "Search add-ons…", all: "All", mine: "My add-ons", notMine: "Not bought", none: "No add-on matches “{q}”.", noneFilter: "Nothing here yet.", clear: "Clear" },
  km: { search: "ស្វែងរកមុខងារបន្ថែម…", all: "ទាំងអស់", mine: "របស់ខ្ញុំ", notMine: "មិនទាន់ទិញ", none: "រកមិនឃើញមុខងារ “{q}”។", noneFilter: "មិនទាន់មានទេ។", clear: "សម្អាត" },
};
// lower-case, no extra spaces — so "table order" finds "Table ordering"
const norm = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Add-ons: unlock more features for this restaurant (yearly ones run 365 days from purchase)
export default function AddonsTab({ ctx }) {
  const { r, lang, overview, readOnly } = ctx;
  const f = FIND[lang] || FIND.en;
  const other = restTextFor(lang === "km" ? "en" : "km"); // search both languages
  const [q, setQ] = useState("");
  const [show, setShow] = useState("all"); // all | mine | notMine
  const owned = (a) => !a.soon && (a.status === "active" || a.status === "expiring" || a.status === "forever");
  const counts = useMemo(() => {
    const mine = overview.addons.filter(owned).length;
    return { all: overview.addons.length, mine, notMine: overview.addons.length - mine };
  }, [overview.addons]);
  const list = useMemo(() => {
    const words = norm(q).split(" ").filter(Boolean);
    return overview.addons.filter((a) => {
      if (show === "mine" && !owned(a)) return false;
      if (show === "notMine" && owned(a)) return false;
      if (!words.length) return true;
      const hay = norm([r.addonNames[a.key], r.addonWhat[a.key], r.addonFree[a.key], other.addonNames?.[a.key], other.addonWhat?.[a.key], a.key.replace(/_/g, " ")].join(" "));
      return words.every((w) => hay.includes(w));
    });
  }, [overview.addons, q, show, r, other]);
  return (
    <div className="rs-col">
      <section className="panel-card">
        <h2>{r.tabs.addons}</h2>
        <p className="rs-muted" style={{ margin: "-6px 0 0" }}>
          {r.addonsSub}
        </p>
        <div className="rs-addon-find">
          <div className="rp-search">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.search} aria-label={f.search} />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label={f.clear}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="rs-addon-filter" role="tablist">
            {["all", "mine", "notMine"].map((k) => (
              <button key={k} type="button" role="tab" aria-selected={show === k} className={show === k ? "on" : ""} onClick={() => setShow(k)}>
                {f[k]} <b>{counts[k]}</b>
              </button>
            ))}
          </div>
        </div>
      </section>
      {list.length === 0 && (
        <section className="panel-card rs-addon-empty">
          <p className="rs-muted">{q ? f.none.replace("{q}", q.trim()) : f.noneFilter}</p>
          {(q || show !== "all") && (
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              onClick={() => {
                setQ("");
                setShow("all");
              }}
            >
              {f.clear}
            </button>
          )}
        </section>
      )}
      <div className="rs-addons">
        {list.map((a) => {
          const Icon = ADDON_ICONS[a.key];
          const status = a.soon ? "soon" : a.status; // none | active | expiring | expired | forever | soon
          return (
            <article key={a.key} className={`panel-card rs-addon s-${status}`}>
              <div className="rs-addon-top">
                <span className="rs-addon-ic">
                  <Icon size={22} />
                </span>
                <div>
                  <h3>{r.addonNames[a.key]}</h3>
                  <span className="rs-addon-price">
                    <CoinIcon size={14} /> {a.price} {r.coins} {a.days ? r.perYear : `· ${r.oneTime}`}
                  </span>
                </div>
              </div>
              <p>{r.addonWhat[a.key]}</p>
              <small className="rs-muted">{r.addonFree[a.key]}</small>
              <div className="rs-addon-foot">
                {status === "soon" && (
                  <span className="rs-pill">
                    <Clock3 size={12} /> {a.key === "rest_app" ? r.comingSoon : r.soon}
                  </span>
                )}
                {status === "forever" && (
                  <span className="rs-pill on">
                    <InfinityIcon size={12} /> {r.forever}
                  </span>
                )}
                {(status === "active" || status === "expiring") && (
                  <span className={`rs-pill ${status === "active" ? "on" : "warn"}`}>
                    <CalendarClock size={12} /> {r.activeUntil.replace("{date}", fmtDate(a.expires_at, lang))}
                  </span>
                )}
                {status === "expired" && <span className="rs-pill bad">{r.expired.replace("{date}", fmtDate(a.expires_at, lang))}</span>}
                {status !== "soon" && status !== "forever" && (
                  <button type="button" className={`md-btn ${status === "active" ? "md-btn-ghost" : "md-btn-primary rs-gold-btn"} sa-btn-sm`} onClick={() => ctx.askBuy(a.key)} disabled={readOnly}>
                    {status === "none" ? (
                      <>
                        <CoinIcon size={15} /> {r.buy.replace("{coins}", a.price)}
                      </>
                    ) : (
                      <>
                        <Check size={15} /> {r.renewAddon}
                      </>
                    )}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
