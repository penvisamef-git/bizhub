import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BadgePercent, BedDouble, CalendarDays, CalendarRange, Check, Clock, Home, KeyRound, LogOut, Mail, Menu as MenuIcon, Banknote, QrCode, Upload, Phone, Search, User, Users, X } from "lucide-react";
import { GP_TEXT, PORTAL_LOOKS } from "./ptext";
import "./gportal.css";

// The customer dashboard (pure: state in → screens out). Used by the real page and by the owner's look previews.
//   s   = { info, me, tab, bookings, cal, free, search, busy, msg, error }
//   act = { setTab, setSearch, findFree, request, cancel, saveMe, savePass, logout, pickDay }
const money = (v, cur) => (cur === "KHR" ? `${Math.round(Number(v) || 0).toLocaleString("en-US")}៛` : `$${(Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: Number(v) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`);
const dayOf = (d, lang, opts = { weekday: "short", day: "numeric", month: "short" }) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { ...opts, timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`)) : "");
const today = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const addDays = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const TAB_ICON = { home: Home, book: Search, calendar: CalendarDays, bookings: CalendarRange, profile: User };
const STATE_TONE = { pending: "wait", accepted: "ok", confirmed: "ok", staying: "live", done: "done", declined: "bad", cancelled: "done", no_show: "bad" };

export function GpAuth({ info, lang, mode, setMode, onSubmit, busy, error, langSwitch, siteHref }) {
  const t = GP_TEXT[lang] || GP_TEXT.en;
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "", confirm: "", website: "" });
  const [mismatch, setMismatch] = useState(false);
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const join = mode === "register";
  return (
    <div className={`gp gp-auth t-${info.theme}`}>
      <div className="gp-auth-art" style={info.cover ? { backgroundImage: `url("${info.cover}")` } : undefined}>
        <div className="gp-auth-art-in">
          <span className="gp-logo">{info.business.logo ? <img src={info.business.logo} alt="" /> : <BedDouble size={26} />}</span>
          <b>{info.business.name}</b>
          <small>{t.times.replace("{in}", info.check_in).replace("{out}", info.check_out)}</small>
        </div>
      </div>
      <div className="gp-auth-side">
        <div className="gp-auth-top">
          {siteHref && (
            <a className="gp-link" href={siteHref}>
              <ArrowLeft size={16} /> {t.backSite}
            </a>
          )}
          {langSwitch}
        </div>
        <form
          className="gp-auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (join && f.password !== f.confirm) return setMismatch(true);
            setMismatch(false);
            onSubmit(f);
          }}
        >
          <h1>{join ? t.join : t.welcomeBack}</h1>
          <p className="gp-muted">{join ? t.joinSub : t.loginSub}</p>
          {join && (
            <>
              <label className="gp-f">
                <span>{t.fullName}</span>
                <input required maxLength={80} value={f.name} onChange={up("name")} autoComplete="name" />
              </label>
              <label className="gp-f">
                <span>{t.phone}</span>
                <input required maxLength={30} value={f.phone} onChange={up("phone")} autoComplete="tel" inputMode="tel" />
              </label>
            </>
          )}
          <label className="gp-f">
            <span>{t.email}</span>
            <input required type="email" maxLength={120} value={f.email} onChange={up("email")} autoComplete="email" />
          </label>
          <label className="gp-f">
            <span>{t.password}</span>
            <input required type="password" minLength={join ? 6 : 1} maxLength={100} value={f.password} onChange={up("password")} autoComplete={join ? "new-password" : "current-password"} />
            {join && <small className="gp-muted">{t.passwordHint}</small>}
          </label>
          {join && (
            <label className="gp-f">
              <span>{t.confirmPassword}</span>
              <input
                required
                type="password"
                minLength={6}
                maxLength={100}
                value={f.confirm}
                onChange={(e) => {
                  setF({ ...f, confirm: e.target.value });
                  setMismatch(false);
                }}
                autoComplete="new-password"
                className={f.confirm && f.confirm !== f.password ? "bad" : f.confirm ? "good" : ""}
              />
              {f.confirm && f.confirm !== f.password && <small className="gp-err-sm">{t.noMatch}</small>}
            </label>
          )}
          <input className="gp-hp" tabIndex={-1} autoComplete="off" value={f.website} onChange={up("website")} aria-hidden="true" />
          {mismatch && <p className="gp-err">{t.noMatch}</p>}
          {error && <p className="gp-err">{error}</p>}
          <button type="submit" className="gp-btn gp-btn-big" disabled={busy || (join && f.confirm !== f.password)}>
            {busy ? t.working : join ? t.signUp : t.signIn}
          </button>
          <p className="gp-switch">
            {join ? t.haveAccount : t.noAccount}{" "}
            <button type="button" onClick={() => setMode(join ? "login" : "register")}>
              {join ? t.signIn : t.signUp}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function GpView({ s, act, lang = "en", langSwitch = null, siteHref = "", preview = false }) {
  const t = GP_TEXT[lang] || GP_TEXT.en;
  const { info, me } = s;
  const cur = info.currency;
  const layout = PORTAL_LOOKS[info.theme]?.layout || "side";
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(null); // a room type from the free list
  const [note, setNote] = useState("");
  const [pay, setPay] = useState("cash");
  const [proof, setProof] = useState(null); // { file, url }
  const closeConfirm = () => {
    setConfirm(null);
    setNote("");
    setPay("cash");
    setProof(null);
  };
  const methods = info.pay?.methods || ["cash"];
  const khr = (v) => Math.round(((Number(v) || 0) * (info.pay?.khr_rate || 4100)) / 100) * 100;
  const [sure, setSure] = useState("");
  const [pf, setPf] = useState(null);
  const [pw, setPw] = useState({ old: "", password: "", confirm: "" });
  const tabs = ["home", "book", "calendar", "bookings", "profile"];
  const waiting = (s.bookings || []).filter((b) => b.state === "pending").length;
  const upcoming = (s.bookings || []).filter((b) => ["pending", "accepted", "confirmed", "staying"].includes(b.state) && b.to >= today()).sort((a, b) => (a.from < b.from ? -1 : 1));
  const go = (k) => {
    setMenu(false);
    act.setTab(k);
  };
  const search = s.search;
  const nights = search.from && search.to ? Math.round((Date.parse(search.to) - Date.parse(search.from)) / 86400000) : 0;

  const bookingCard = (b) => {
    const canCancel = b.state === "pending" || (b.state === "confirmed" && b.from > today());
    return (
      <article key={b._id} className={`gp-bk tone-${STATE_TONE[b.state] || "done"}`}>
        <div className="gp-bk-date">
          <b>{dayOf(b.from, lang, { day: "numeric" })}</b>
          <small>{dayOf(b.from, lang, { month: "short" })}</small>
        </div>
        <div className="gp-bk-main">
          <div className="gp-bk-top">
            <b>{b.type_name}</b>
            <span className={`gp-chip tone-${STATE_TONE[b.state] || "done"}`}>{t.states[b.state]}</span>
          </div>
          <span className="gp-muted">
            {dayOf(b.from, lang)} → {dayOf(b.to, lang)} · {t.nights.replace("{n}", b.nights)} · {t.guests.replace("{n}", (b.adults || 1) + (b.children || 0))}
          </span>
          {b.stay ? (
            <div className="gp-bk-bill">
              {b.stay.room && <span className="gp-room">{t.room.replace("{r}", b.stay.room)}</span>}
              <span>
                {t.total} <b>{money(b.stay.total, cur)}</b>
              </span>
              {b.stay.paid > 0 && (
                <span>
                  {t.paid} <b>{money(b.stay.paid, cur)}</b>
                </span>
              )}
              {b.stay.balance > 0 && b.state !== "cancelled" && (
                <span>
                  {t.balance} <b>{money(b.stay.balance, cur)}</b>
                </span>
              )}
            </div>
          ) : (
            b.estimate > 0 && <span className="gp-muted">{t.estimate.replace("{v}", money(b.estimate, cur))}</span>
          )}
          <span className={`gp-paytag ${b.pay_method === "qr" ? "qr" : ""}`}>{b.pay_method === "qr" ? t.paidQr : t.payAtGh}</span>
          {b.reason && <p className="gp-reason">“{b.reason}”</p>}
          {canCancel &&
            (sure === b._id ? (
              <button type="button" className="gp-btn gp-btn-danger gp-btn-sm" onClick={() => act.cancel(b._id).then(() => setSure(""))}>
                {t.cancelSure}
              </button>
            ) : (
              <button type="button" className="gp-btn gp-btn-ghost gp-btn-sm" onClick={() => setSure(b._id)}>
                <X size={14} /> {t.cancel}
              </button>
            ))}
        </div>
      </article>
    );
  };

  const typeCard = (r) => (
    <article key={r._id} className={`gp-type ${r.free === 0 ? "full" : ""}`}>
      <div className="gp-type-img" style={r.image ? { backgroundImage: `url("${r.image}")` } : { "--tc": r.color || "var(--gp-accent)" }}>
        {!r.image && <BedDouble size={40} strokeWidth={1.4} />}
        {r.deal && <span className="gp-deal">{r.deal.badge || <BadgePercent size={14} />}</span>}
        {r.free !== undefined && <span className={`gp-free ${r.free ? "" : "none"}`}>{r.free ? t.freeN.replace("{n}", r.free) : t.full}</span>}
      </div>
      <div className="gp-type-body">
        <div className="gp-type-top">
          <b>{r.name}</b>
          <span className="gp-price">
            {r.total !== undefined && r.saved > 0 && <s>{money(r.base / Math.max(1, nights), cur)}</s>}
            {r.total === undefined && r.deal && <s>{money(r.price, cur)}</s>}
            <b>{money(r.total !== undefined ? r.rate : r.deal ? r.deal.price : r.price, cur)}</b>
            <small>{t.perNight}</small>
          </span>
        </div>
        <span className="gp-muted">
          <Users size={14} /> {t.upTo.replace("{n}", r.capacity)}
          {r.beds ? ` · ${r.beds}` : ""}
        </span>
        {r.total !== undefined && (
          <span className="gp-total">
            {t.totalFor.replace("{total}", money(r.total, cur)).replace("{n}", nights)}
            {r.saved > 0 && <em>{t.youSave.replace("{v}", money(r.saved, cur))}</em>}
          </span>
        )}
        {r.total !== undefined && (
          <button type="button" className="gp-btn" disabled={!r.free} onClick={() => setConfirm(r)}>
            {t.request}
          </button>
        )}
      </div>
    </article>
  );

  const screens = {
    home: (
      <div className="gp-col">
        <section className="gp-hero" style={info.cover ? { "--cover": `url("${info.cover}")` } : undefined}>
          <div>
            <h2>{t.hello.replace("{name}", (me?.name || "").split(" ")[0])}</h2>
            <p>{t.helloSub}</p>
            {me?.points !== undefined && (
              <p className="gp-points">
                🎁 <b>{t.points.replace("{n}", me.points)}</b> · {t.pointsRule.replace("{p}", me.loyalty.redeem_points).replace("{v}", money(me.loyalty.redeem_value, cur))}
              </p>
            )}
            <button type="button" className="gp-btn gp-btn-light" onClick={() => go("book")}>
              <Search size={16} /> {t.bookNow}
            </button>
          </div>
        </section>
        <div className="gp-grid2">
          <section className="gp-card">
            <h3>{t.nextStay}</h3>
            {upcoming[0] ? bookingCard(upcoming[0]) : <p className="gp-muted">{t.noNext}</p>}
            {waiting > 0 && (
              <button type="button" className="gp-link" onClick={() => go("bookings")}>
                <Clock size={14} /> {t.waitingN.replace("{n}", waiting)}
              </button>
            )}
          </section>
          <section className="gp-card gp-info">
            <h3>{info.business.name}</h3>
            <span className="gp-muted">
              <Clock size={14} /> {t.times.replace("{in}", info.check_in).replace("{out}", info.check_out)}
            </span>
            {info.business.address && <span className="gp-muted">{info.business.address}</span>}
            {info.business.phone && (
              <a className="gp-btn gp-btn-ghost gp-btn-sm" href={`tel:${info.business.phone.replace(/[^\d+]/g, "")}`} onClick={preview ? (e) => e.preventDefault() : undefined}>
                <Phone size={14} /> {t.call} {info.business.phone}
              </a>
            )}
          </section>
        </div>
        {info.promos?.length > 0 && (
          <section className="gp-card">
            <h3>
              <BadgePercent size={18} /> {t.deals}
            </h3>
            <div className="gp-deals">
              {info.promos.map((p) => (
                <div key={p._id} className="gp-dealcard">
                  <b>{p.badge || p.name}</b>
                  <span>{p.name}</span>
                  <small>{t.until.replace("{date}", dayOf(p.to, lang, { day: "numeric", month: "short" }))}</small>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="gp-card">
          <h3>{t.tabs.book}</h3>
          <div className="gp-types">{info.types.map(typeCard)}</div>
        </section>
      </div>
    ),
    book: (
      <div className="gp-col">
        <form
          className="gp-card gp-search"
          onSubmit={(e) => {
            e.preventDefault();
            act.findFree();
          }}
        >
          <label className="gp-f">
            <span>{t.checkIn}</span>
            <input type="date" min={today()} value={search.from} onChange={(e) => act.setSearch({ ...search, from: e.target.value, to: search.to <= e.target.value ? addDays(e.target.value, 1) : search.to })} />
          </label>
          <label className="gp-f">
            <span>{t.checkOut}</span>
            <input type="date" min={search.from ? addDays(search.from, 1) : today()} value={search.to} onChange={(e) => act.setSearch({ ...search, to: e.target.value })} />
          </label>
          <label className="gp-f gp-f-n">
            <span>{t.adults}</span>
            <input type="number" min={1} max={20} value={search.adults} onChange={(e) => act.setSearch({ ...search, adults: e.target.value })} />
          </label>
          <label className="gp-f gp-f-n">
            <span>{t.children}</span>
            <input type="number" min={0} max={20} value={search.children} onChange={(e) => act.setSearch({ ...search, children: e.target.value })} />
          </label>
          <button type="submit" className="gp-btn" disabled={s.busy === "free"}>
            <Search size={16} /> {t.find}
          </button>
        </form>
        {s.msg && <p className="gp-ok">{s.msg}</p>}
        {s.error && <p className="gp-err">{s.error}</p>}
        {s.free ? <div className="gp-types">{s.free.types.map(typeCard)}</div> : <p className="gp-muted gp-empty">{t.pickDates}</p>}
      </div>
    ),
    calendar: (
      <section className="gp-card">
        <h3>{t.calTitle}</h3>
        <p className="gp-muted">{t.calSub}</p>
        {s.cal && (
          <div className="gp-cal-wrap">
            <table className="gp-cal">
              <thead>
                <tr>
                  <th />
                  {s.cal.days.map((d) => (
                    <th key={d}>
                      <small>{dayOf(d, lang, { weekday: "short" })}</small>
                      <b>{dayOf(d, lang, { day: "numeric" })}</b>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.cal.types.map((r) => (
                  <tr key={r._id}>
                    <th>
                      <i style={{ background: r.color || "var(--gp-accent)" }} /> {r.name}
                    </th>
                    {r.free.map((n, i) => (
                      <td key={i}>
                        <button type="button" className={`gp-cell ${n === 0 ? "none" : n < r.rooms / 2 ? "few" : "ok"}`} disabled={!n} onClick={() => act.pickDay(s.cal.days[i])}>
                          <b>{n}</b>
                          <small>{money(r.prices[i], cur)}</small>
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    ),
    bookings: (
      <div className="gp-col">
        {s.msg && <p className="gp-ok">{s.msg}</p>}
        {(s.bookings || []).length ? <div className="gp-bks">{s.bookings.map(bookingCard)}</div> : <p className="gp-muted gp-empty">{t.noBookings}</p>}
      </div>
    ),
    profile: (() => {
      const f = pf || { name: me.name, phone: me.phone, email: me.email, password: "" };
      const emailChanged = f.email.trim().toLowerCase() !== me.email;
      const stayed = (s.bookings || []).filter((x) => ["staying", "done"].includes(x.state)).reduce((a, x) => a + x.nights, 0);
      const longDate = (d) => (d ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d)) : "");
      return (
        <div className="gp-col">
          <section className="gp-card gp-profile">
            <span className="gp-avatar gp-avatar-big">{(me.name || "?").slice(0, 1).toUpperCase()}</span>
            <div className="gp-profile-id">
              <h2>{me.name}</h2>
              <span className="gp-muted">
                <Mail size={14} /> {me.email}
              </span>
              <span className="gp-muted">
                <Phone size={14} /> {me.phone}
              </span>
              <small className="gp-muted">
                {t.memberSince.replace("{date}", longDate(me.created_date))}
                {me.last_login ? ` · ${t.lastLogin.replace("{date}", longDate(me.last_login))}` : ""}
              </small>
            </div>
            <div className="gp-stats">
              <div>
                <b>{(s.bookings || []).length}</b>
                <small>{t.statBookings}</small>
              </div>
              <div>
                <b>{stayed}</b>
                <small>{t.statNights}</small>
              </div>
              <div>
                <b>{waiting}</b>
                <small>{t.statWaiting}</small>
              </div>
              {me.points !== undefined && (
                <div>
                  <b>{me.points}</b>
                  <small>{t.statPoints}</small>
                </div>
              )}
            </div>
          </section>
          {(s.msg || s.error) && <p className={s.error ? "gp-err" : "gp-ok"}>{s.error || s.msg}</p>}
          <div className="gp-grid2">
            <form
              className="gp-card gp-form"
              onSubmit={(e) => {
                e.preventDefault();
                const body = { name: f.name, phone: f.phone };
                if (emailChanged) Object.assign(body, { email: f.email, password: f.password });
                act.saveMe(body).then((ok) => ok && setPf(null));
              }}
            >
              <h3>
                <User size={18} /> {t.editDetails}
              </h3>
              <label className="gp-f">
                <span>{t.fullName}</span>
                <input required value={f.name} maxLength={80} onChange={(e) => setPf({ ...f, name: e.target.value })} autoComplete="name" />
              </label>
              <label className="gp-f">
                <span>{t.phone}</span>
                <input required value={f.phone} maxLength={30} onChange={(e) => setPf({ ...f, phone: e.target.value })} autoComplete="tel" inputMode="tel" />
              </label>
              <label className="gp-f">
                <span>{t.email}</span>
                <input required type="email" value={f.email} maxLength={120} onChange={(e) => setPf({ ...f, email: e.target.value })} autoComplete="email" />
              </label>
              {emailChanged && (
                <label className="gp-f">
                  <span>{t.emailPass}</span>
                  <input required type="password" value={f.password} onChange={(e) => setPf({ ...f, password: e.target.value })} autoComplete="current-password" />
                </label>
              )}
              <button type="submit" className="gp-btn" disabled={!pf}>
                <Check size={16} /> {t.save}
              </button>
            </form>
            <form
              className="gp-card gp-form"
              onSubmit={(e) => {
                e.preventDefault();
                act.savePass(pw).then((ok) => ok && setPw({ old: "", password: "", confirm: "" }));
              }}
            >
              <h3>
                <KeyRound size={18} /> {t.changePass}
              </h3>
              <label className="gp-f">
                <span>{t.oldPass}</span>
                <input type="password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} autoComplete="current-password" />
              </label>
              <label className="gp-f">
                <span>{t.newPass}</span>
                <input type="password" minLength={6} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} autoComplete="new-password" />
              </label>
              <label className="gp-f">
                <span>{t.confirmPassword}</span>
                <input type="password" minLength={6} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" className={pw.confirm && pw.confirm !== pw.password ? "bad" : pw.confirm ? "good" : ""} />
                {pw.confirm && pw.confirm !== pw.password && <small className="gp-err-sm">{t.noMatch}</small>}
              </label>
              <button type="submit" className="gp-btn gp-btn-ghost" disabled={!pw.old || pw.password.length < 6 || pw.password !== pw.confirm}>
                {t.save}
              </button>
            </form>
          </div>
          <button type="button" className="gp-btn gp-btn-danger gp-btn-ghost gp-logout" onClick={act.logout}>
            <LogOut size={16} /> {t.logout}
          </button>
        </div>
      );
    })(),
  };

  return (
    <div className={`gp t-${info.theme} l-${layout} ${preview ? "is-preview" : ""}`} style={info.site_color && info.theme === "classic" ? { "--gp-accent": info.site_color } : undefined}>
      <aside className={`gp-nav ${menu ? "open" : ""}`}>
        <div className="gp-brand">
          <span className="gp-logo">{info.business.logo ? <img src={info.business.logo} alt="" /> : <BedDouble size={20} />}</span>
          <b>{info.business.name}</b>
          <button type="button" className="gp-menu" onClick={() => setMenu((m) => !m)} aria-label="menu">
            {menu ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
        <nav className="gp-tabs">
          {tabs.map((k) => {
            const I = TAB_ICON[k];
            return (
              <button key={k} type="button" className={s.tab === k ? "on" : ""} onClick={() => go(k)}>
                <I size={18} /> <span>{t.tabs[k]}</span>
                {k === "bookings" && waiting > 0 && <em>{waiting}</em>}
              </button>
            );
          })}
        </nav>
        <div className="gp-nav-foot">
          {langSwitch}
          {siteHref && (
            <a className="gp-link" href={siteHref}>
              <ArrowLeft size={14} /> {t.backSite}
            </a>
          )}
        </div>
      </aside>
      <main className="gp-main">
        <header className="gp-head">
          <h1>{t.tabs[s.tab]}</h1>
          <span className="gp-me">
            <span className="gp-avatar">{(me?.name || "?").slice(0, 1).toUpperCase()}</span>
            <span className="gp-me-name">{me?.name}</span>
          </span>
        </header>
        {screens[s.tab]}
      </main>
      {confirm && (
        <div className="gp-modal-back" onMouseDown={(e) => e.target === e.currentTarget && closeConfirm()}>
          <div className="gp-modal" role="dialog" aria-modal="true">
            <h3>{t.confirmTitle}</h3>
            <div className="gp-sum">
              <b>{confirm.name}</b>
              <span>
                {dayOf(search.from, lang)} → {dayOf(search.to, lang)} · {t.nights.replace("{n}", nights)}
              </span>
              <span>
                {t.adults} {search.adults} · {t.children} {search.children}
              </span>
              <b className="gp-sum-total">{money(confirm.total, cur)}</b>
              {confirm.saved > 0 && <em>{t.youSave.replace("{v}", money(confirm.saved, cur))}</em>}
            </div>
            <label className="gp-f">
              <span>{t.note}</span>
              <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePh} />
            </label>
            {methods.length > 1 && (
              <div className="gp-pay">
                <span className="gp-pay-h">{t.payHow}</span>
                <div className="gp-pay-opts">
                  <button type="button" className={pay === "cash" ? "on" : ""} onClick={() => setPay("cash")}>
                    <Banknote size={22} />
                    <b>{t.payCash}</b>
                    <small>{t.payCashSub}</small>
                  </button>
                  <button type="button" className={pay === "qr" ? "on" : ""} onClick={() => setPay("qr")}>
                    <QrCode size={22} />
                    <b>{t.payQr}</b>
                    <small>{t.payQrSub}</small>
                  </button>
                </div>
              </div>
            )}
            {pay === "qr" && (
              <div className="gp-qrpay">
                <div className="gp-qr-box">
                  <img src={info.pay.qr} alt="KHQR" />
                  {info.pay.label && <small>{info.pay.label}</small>}
                </div>
                <div className="gp-qr-side">
                  <span className="gp-muted">{t.scanPay}</span>
                  <span className="gp-qr-amt">
                    <small>{t.amount}</small>
                    <b>{khr(confirm.total).toLocaleString("en-US")}៛</b>
                    {cur !== "KHR" && <em>≈ {money(confirm.total, cur)}</em>}
                  </span>
                  <label className={`gp-proof ${proof ? "has" : ""}`}>
                    {proof ? <img src={proof.url} alt="" /> : <Upload size={22} />}
                    <span>{proof ? t.changeProof : t.uploadProof}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) setProof({ file, url: URL.createObjectURL(file) });
                      }}
                    />
                  </label>
                  <small className="gp-muted">{t.proofHint}</small>
                </div>
              </div>
            )}
            {pay === "cash" && <p className="gp-muted gp-paynote">{info.note || t.payNote}</p>}
            {s.error && <p className="gp-err">{s.error}</p>}
            <div className="gp-modal-btns">
              <button type="button" className="gp-btn gp-btn-ghost" onClick={closeConfirm}>
                <X size={16} />
              </button>
              <button
                type="button"
                className="gp-btn"
                disabled={s.busy === "book" || (pay === "qr" && !proof)}
                title={pay === "qr" && !proof ? t.needProof : undefined}
                onClick={() =>
                  act.request({ type_id: confirm._id, note, pay_method: pay, proof: pay === "qr" ? proof?.file : null }).then((ok) => {
                    if (ok) closeConfirm();
                  })
                }
              >
                <Check size={16} /> {s.busy === "book" ? t.working : t.send}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// a small live picture of a look (owner's look picker), with made-up bookings
export function GpThumb({ info, theme, lang = "en" }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.2);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => setScale(el.clientWidth / 1200);
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const d0 = today();
  const s = {
    info: { ...info, theme },
    me: { name: "Sophea Chan", phone: "012 345 678", email: "sophea@example.com" },
    tab: "home",
    bookings: [
      { _id: "b1", type_name: info.types?.[0]?.name || "Double", from: addDays(d0, 5), to: addDays(d0, 7), nights: 2, adults: 2, children: 0, state: "confirmed", stay: { room: "201", total: 50, paid: 0, balance: 50 } },
      { _id: "b2", type_name: info.types?.[1]?.name || "Family", from: addDays(d0, 20), to: addDays(d0, 21), nights: 1, adults: 2, children: 1, state: "pending", estimate: 40 },
    ],
    cal: null,
    free: null,
    search: { from: d0, to: addDays(d0, 1), adults: 2, children: 0 },
    busy: "",
    msg: "",
    error: "",
  };
  const noop = () => Promise.resolve(false);
  return (
    <div className="gp-thumb" ref={ref}>
      <div className="gp-thumb-in" style={{ transform: `scale(${scale})` }} inert="">
        <GpView s={s} act={{ setTab: noop, setSearch: noop, findFree: noop, request: noop, cancel: noop, saveMe: noop, savePass: noop, logout: noop, pickDay: noop }} lang={lang} preview />
      </div>
    </div>
  );
}
