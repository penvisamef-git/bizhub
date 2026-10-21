import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlarmClock, ArrowDownLeft, ArrowUpRight, NotebookPen, CheckCircle2, Loader2, Phone, Send } from "lucide-react";
import "../dashboard/client/debt/debt.css";
import { debtPublic } from "../api/services";
import { dayOf, fmtDate, lineNote, money, owed, owes, totalUsd, useDebtText } from "../dashboard/client/debt/text";

// /d/<token>: a customer's own statement — what they owe, every debt and payment (read only)
export default function StatementPage() {
  const { token } = useParams();
  const { m, lang, setLang } = useDebtText();
  const [d, setD] = useState(null);
  const [off, setOff] = useState(false);
  useEffect(() => {
    debtPublic
      .statement(token)
      .then((r) => setD(r.data))
      .catch(() => setOff(true));
  }, [token]);
  useEffect(() => {
    if (d?.shop?.name) document.title = `${d.customer.name} · ${d.shop.name}`;
  }, [d]);
  const langBtn = (
    <button type="button" className="dk-lang" onClick={() => setLang(lang === "km" ? "en" : "km")}>
      {lang === "km" ? "EN" : "ខ្មែរ"}
    </button>
  );
  if (off)
    return (
      <div className="dk-st-page">
        <div className="dk-st-card dk-st-off">
          <NotebookPen size={30} />
          <h1>{m.stOff}</h1>
          <p>{m.stOffSub}</p>
        </div>
      </div>
    );
  if (!d)
    return (
      <div className="dk-st-page">
        <Loader2 size={26} className="md-spin" />
      </div>
    );
  const c = d.customer;
  const late = c.due_at && owes(c.balance) && dayOf(c.due_at) < dayOf(new Date());
  const tel = String(d.shop.phone || "").replace(/[^\d+]/g, "");
  return (
    <div className="dk-st-page" data-testid="dk-statement">
      <div className="dk-st-card">
        <header className="dk-st-shop">
          <span className="dk-st-logo">{d.shop.logo ? <img src={d.shop.logo} alt="" /> : <NotebookPen size={24} />}</span>
          <div>
            <b>{d.shop.name}</b>
            {d.shop.address && <small>{d.shop.address}</small>}
          </div>
          {langBtn}
        </header>
        <section className={`dk-st-balance ${owes(c.balance) ? (late ? "late" : "owing") : "clear"}`}>
          <small>
            {m.stTitle} · {c.name}
          </small>
          {owes(c.balance) ? (
            <>
              <span>{m.stOwe}</span>
              <b data-testid="dk-st-owed">{owed(c.balance)}</b>
              {c.balance.usd > 0 && c.balance.khr > 0 && <em>{m.total.replace("{v}", money("USD", Math.round(totalUsd(c.balance, d.rate) * 100) / 100))}</em>}
              {c.due_at && (
                <p className="dk-st-due">
                  {late ? <AlarmClock size={15} /> : null}
                  {(late ? m.stLate : m.stDue).replace("{date}", fmtDate(c.due_at, lang))}
                </p>
              )}
            </>
          ) : (
            <p className="dk-st-clear">
              <CheckCircle2 size={22} /> {m.stNothing}
            </p>
          )}
        </section>
        <div className="dk-st-acts">
          {d.telegram &&
            (c.tg_linked ? (
              <span className="dk-st-tg on">
                <Send size={15} /> {m.stTgOn}
              </span>
            ) : (
              <a className="dk-st-tg" href={`https://t.me/${d.telegram.bot}?start=${d.telegram.start}`} target="_blank" rel="noopener noreferrer" data-testid="dk-st-tg">
                <Send size={15} /> {m.stTg}
              </a>
            ))}
          {tel && (
            <a className="dk-st-call" href={`tel:${tel}`}>
              <Phone size={15} /> {m.stCall}
            </a>
          )}
        </div>
        <section className="dk-st-lines">
          <h2>{m.stLines}</h2>
          {!d.entries.length && <p className="dk-st-muted">{m.noLines}</p>}
          <ul>
            {d.entries.map((e) => (
              <li key={e._id} className={`k-${e.kind}`} data-testid="dk-st-line">
                <span className="dk-line-ic">{e.kind === "pay" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</span>
                <div>
                  <b>{lineNote(e, m)}</b>
                  <small>
                    {fmtDate(e.date, lang)}
                    {e.method ? ` · ${e.method}` : ""}
                    {e.no ? ` · #${e.no}` : ""}
                  </small>
                </div>
                <span className="dk-st-amt">
                  {e.kind === "pay" ? "−" : "+"}
                  {money(e.currency, e.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        {d.branding && (
          <a className="dk-st-made" href="/" target="_blank" rel="noopener">
            {m.stMade}
          </a>
        )}
      </div>
    </div>
  );
}
