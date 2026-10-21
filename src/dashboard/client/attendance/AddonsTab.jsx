import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronRight, Clock3, Palette, Search, X } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { attendanceService } from "../../../api/services";
import { ADDON_ICONS, ADDON_TAB, YEARLY, addonText } from "./addon-info";
import { fmtDate } from "./text";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const norm = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const T = {
  en: {
    title: "Add-ons",
    sub: "Make your attendance do more. Yearly add-ons run 365 days from purchase. Staff app and QR looks are bought once and kept forever; door kiosk looks run one year each.",
    search: "Search add-ons…",
    all: "All",
    mine: "My add-ons",
    notMine: "Not bought",
    none: "No add-on matches “{q}”.",
    noneFilter: "Nothing here yet.",
    clear: "Clear",
    perYear: "/ year",
    each: "each · one time",
    eachYear: "each / year",
    perList: "per year's list · one time",
    yearsOwned: "Unlocked: {list}",
    thisYearFree: "This year: free",
    soon: "Coming soon",
    perPack: "/ 5 staff / year",
    activeUntil: "Active until {date}",
    expired: "Ended {date}",
    unlock: "Unlock · {coins}",
    renew: "Renew · {coins}",
    open: "Open",
    slots: "{n} bought · next ends {date}",
    owned: "{n} of {max} owned",
    noneOwned: "None bought yet",
    add: "Add · {coins}",
    choose: "Choose",
  },
  km: {
    title: "មុខងារបន្ថែម",
    sub: "បន្ថែមមុខងារឱ្យប្រព័ន្ធវត្តមាន។ មុខងារប្រចាំឆ្នាំ ប្រើបាន 365 ថ្ងៃពីថ្ងៃទិញ។ រចនាកម្មវិធីបុគ្គលិក និង QR ទិញម្តង ប្រើជារៀងរហូត។ រចនា QR មាត់ទ្វារ ប្រើបានមួយឆ្នាំ។",
    search: "ស្វែងរកមុខងារបន្ថែម…",
    all: "ទាំងអស់",
    mine: "របស់ខ្ញុំ",
    notMine: "មិនទាន់ទិញ",
    none: "រកមិនឃើញមុខងារ “{q}”។",
    noneFilter: "មិនទាន់មានទេ។",
    clear: "សម្អាត",
    perYear: "/ ឆ្នាំ",
    each: "មួយៗ · បង់ម្តង",
    eachYear: "មួយៗ / ឆ្នាំ",
    perList: "ក្នុងមួយឆ្នាំ · បង់ម្តង",
    yearsOwned: "បានដោះសោ៖ {list}",
    thisYearFree: "ឆ្នាំនេះ៖ ឥតគិតថ្លៃ",
    soon: "នឹងមានឆាប់ៗ",
    perPack: "/ បុគ្គលិក 5 នាក់ / ឆ្នាំ",
    activeUntil: "ប្រើបានដល់ {date}",
    expired: "ផុតកំណត់ {date}",
    unlock: "ដោះសោ · {coins}",
    renew: "បន្ត · {coins}",
    open: "បើក",
    slots: "បានទិញ {n} · ផុតកំណត់បន្ទាប់ {date}",
    owned: "មាន {n} / {max}",
    noneOwned: "មិនទាន់ទិញ",
    add: "បន្ថែម · {coins}",
    choose: "ជ្រើស",
  },
};

// Add-ons for an attendance business (same page as the restaurant's)
export default function AddonsTab({ ctx }) {
  const { lang, data, readOnly } = ctx;
  const t = T[lang] || T.en;
  const ai = addonText(lang);
  const other = addonText(lang === "km" ? "en" : "km");
  const [looks, setLooks] = useState(null);
  const [q, setQ] = useState("");
  const [show, setShow] = useState("all");

  useEffect(() => {
    attendanceService
      .looks(ctx.id)
      .then((r) => setLooks(r.data))
      .catch(() => {});
  }, [ctx.id]);

  const items = useMemo(() => {
    const slotInfo = (list) => {
      const act = (list || []).filter((s) => s.active);
      return { count: act.length, next: act.map((s) => s.expires_at).sort()[0] };
    };
    const paid = (k) => (looks ? looks[k].owned.length : 0);
    return [
      ...YEARLY.map((key) => ({ key, kind: "yearly", price: data.addons?.[key]?.price, st: data.addons?.[key] || {}, mine: !!data.addons?.[key]?.active })),
      { key: "att_staff", kind: "slot", price: data.addons?.att_staff?.price, ...slotInfo(data.staff_slots), mine: slotInfo(data.staff_slots).count > 0 },
      { key: "att_branch", kind: "slot", price: data.slot_price, ...slotInfo(data.slots), mine: slotInfo(data.slots).count > 0 },
      { key: "att_app_theme", kind: "look", price: looks?.app.price ?? 55, count: paid("app"), max: looks ? looks.app.list.length - 1 : 11, mine: paid("app") > 0 },
      { key: "att_qr_theme", kind: "look", price: looks?.qr.price ?? 35, count: paid("qr"), max: looks ? looks.qr.list.length - 1 : 11, mine: paid("qr") > 0 },
      { key: "att_kiosk_theme", kind: "look", yearly: true, price: looks?.kiosk.price ?? 85, count: paid("kiosk"), max: looks ? looks.kiosk.list.length - 1 : 22, mine: paid("kiosk") > 0 },
      { key: "att_web_theme", kind: "look", price: data.addons?.att_web_theme?.price ?? 35, count: data.addons?.att_web_theme?.owned || 0, max: data.addons?.att_web_theme?.max || 23, mine: (data.addons?.att_web_theme?.owned || 0) > 0 },
      { key: "att_holidays", kind: "year", price: data.addons?.att_holidays?.price ?? 45, years: data.addons?.att_holidays?.years || [], mine: (data.addons?.att_holidays?.years || []).length > 0 },
      { key: "att_app", kind: "soon", price: data.addons?.att_app?.price ?? 150, mine: false },
    ];
  }, [data, looks]);

  const counts = { all: items.length, mine: items.filter((i) => i.mine).length, notMine: items.filter((i) => !i.mine).length };
  const words = norm(q).split(" ").filter(Boolean);
  const list = items.filter((i) => {
    if (show === "mine" && !i.mine) return false;
    if (show === "notMine" && i.mine) return false;
    if (!words.length) return true;
    const hay = norm([ai.names[i.key], ai.what[i.key], other.names[i.key], other.what[i.key]].join(" "));
    return words.every((w) => hay.includes(w));
  });

  return (
    <div className="rs-col">
      <section className="panel-card">
        <h2>{t.title}</h2>
        <p className="rs-muted" style={{ margin: "-6px 0 0" }}>
          {t.sub}
        </p>
        <div className="rs-addon-find">
          <div className="rp-search">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label={t.clear}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="rs-addon-filter" role="tablist">
            {["all", "mine", "notMine"].map((k) => (
              <button key={k} type="button" role="tab" aria-selected={show === k} className={show === k ? "on" : ""} onClick={() => setShow(k)}>
                {t[k]} <b>{counts[k]}</b>
              </button>
            ))}
          </div>
        </div>
      </section>

      {list.length === 0 && (
        <section className="panel-card rs-addon-empty">
          <p className="rs-muted">{q ? t.none.replace("{q}", q.trim()) : t.noneFilter}</p>
          <button
            type="button"
            className="md-btn md-btn-ghost sa-btn-sm"
            onClick={() => {
              setQ("");
              setShow("all");
            }}
          >
            {t.clear}
          </button>
        </section>
      )}

      <div className="rs-addons">
        {list.map((i) => {
          const Icon = ADDON_ICONS[i.key];
          const status = i.kind === "soon" ? "soon" : i.kind === "yearly" ? i.st.status || "none" : i.mine ? "active" : "none";
          const priceLine = i.kind === "look" ? (i.yearly ? t.eachYear : t.each) : i.kind === "year" ? t.perList : i.key === "att_staff" ? t.perPack : t.perYear;
          return (
            <article key={i.key} className={`panel-card rs-addon s-${status}`}>
              <div className="rs-addon-top">
                <span className="rs-addon-ic">
                  <Icon size={22} />
                </span>
                <div>
                  <h3>{ai.names[i.key]}</h3>
                  <span className="rs-addon-price">
                    <CoinIcon size={14} /> {fmt(i.price)} {priceLine}
                  </span>
                </div>
              </div>
              <p>{ai.what[i.key]}</p>
              {ai.free[i.key] && <small className="rs-muted">{ai.free[i.key]}</small>}
              <div className="rs-addon-foot">
                {i.kind === "yearly" && (
                  <>
                    {(status === "active" || status === "expiring") && (
                      <span className={`rs-pill ${status === "active" ? "on" : "warn"}`}>
                        <CalendarClock size={12} /> {t.activeUntil.replace("{date}", fmtDate(i.st.expires_at, lang))}
                      </span>
                    )}
                    {status === "expired" && <span className="rs-pill bad">{t.expired.replace("{date}", fmtDate(i.st.expires_at, lang))}</span>}
                    {i.mine && (
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go(ADDON_TAB[i.key])}>
                        {t.open} <ChevronRight size={14} />
                      </button>
                    )}
                    <button type="button" className={`md-btn ${status === "active" ? "md-btn-ghost" : "md-btn-primary rs-gold-btn"} sa-btn-sm`} onClick={() => ctx.askBuy({ addon: i.key })} disabled={readOnly}>
                      <CoinIcon size={15} /> {(status === "none" ? t.unlock : t.renew).replace("{coins}", fmt(i.price))}
                    </button>
                  </>
                )}
                {i.kind === "slot" && (
                  <>
                    {i.count > 0 && (
                      <span className="rs-pill on">
                        <CalendarClock size={12} /> {t.slots.replace("{n}", i.count).replace("{date}", fmtDate(i.next, lang))}
                      </span>
                    )}
                    <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy(i.key === "att_staff" ? { kind: "staff" } : {})} disabled={readOnly}>
                      <CoinIcon size={15} /> {t.add.replace("{coins}", fmt(i.price))}
                    </button>
                  </>
                )}
                {i.kind === "year" && (
                  <>
                    <span className={`rs-pill ${i.years.length ? "on" : ""}`}>
                      <CalendarClock size={12} /> {i.years.length ? t.yearsOwned.replace("{list}", i.years.join(", ")) : t.thisYearFree}
                    </span>
                    <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.go("holidays")}>
                      {t.choose} <ChevronRight size={14} />
                    </button>
                  </>
                )}
                {i.kind === "soon" && (
                  <span className="rs-pill">
                    <Clock3 size={12} /> {t.soon}
                  </span>
                )}
                {i.kind === "look" && (
                  <>
                    <span className={`rs-pill ${i.count ? "on" : ""}`}>
                      <Palette size={12} /> {i.count ? t.owned.replace("{n}", i.count).replace("{max}", i.max) : t.noneOwned}
                    </span>
                    <button type="button" className={`md-btn ${i.count ? "md-btn-ghost" : "md-btn-primary rs-gold-btn"} sa-btn-sm`} onClick={() => ctx.go(ADDON_TAB[i.key])}>
                      {t.choose} <ChevronRight size={14} />
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
