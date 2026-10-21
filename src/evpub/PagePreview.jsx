import { CalendarDays, Clock, MapPin, Minus, Plus, Ticket } from "lucide-react";
import { timeOf, usd, whenOf } from "./text";
import { pageClass, pageStyle } from "./pageThemes";
import "./evpub.css";
import "./pagethemes.css";

// a small phone-sized copy of the event page in one page theme (dashboard previews). Same classes as EventPage.
export default function PagePreview({ ev, org, theme, ticketTheme, colors, t, lang }) {
  const types = (ev.types?.length ? ev.types : [{ key: "a", name: "Standard", price: 10, left: 80 }, { key: "b", name: "VIP", price: 25, left: 6 }]).slice(0, 2);
  const free = ev.kind === "free";
  const n0 = 2;
  return (
    <div className={`evp ev-pg-phone ${pageClass(theme)}`} style={pageStyle(theme, ticketTheme, colors, ev.theme_colors)} aria-hidden="true">
      <header className="evp-hero">
        {ev.poster && <div className="evp-hero-bg" style={{ backgroundImage: `url(${ev.poster})` }} />}
        <div className="evp-hero-in">
          <span className="evp-lang">{lang === "km" ? "EN" : "ខ្មែរ"}</span>
          {ev.poster ? (
            <img className="evp-poster" src={ev.poster} alt="" />
          ) : (
            <div className="evp-poster none">
              <Ticket size={40} />
            </div>
          )}
          <div className="evp-hero-text">
            <h1>{ev.title}</h1>
            <div className="evp-facts">
              <span>
                <CalendarDays size={15} /> {whenOf(ev.starts_at, lang)}
              </span>
              <span>
                <Clock size={15} /> {timeOf(ev.starts_at, lang)}
              </span>
              {ev.venue && (
                <span>
                  <MapPin size={15} /> {ev.venue}
                </span>
              )}
            </div>
            {org?.name && (
              <div className="evp-org">
                {org.logo && <img src={org.logo} alt="" />}
                <span>{t.by.replace("{name}", org.name)}</span>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="evp-main">
        <section className="evp-card">
          <h2>{free ? t.register : t.pick}</h2>
          <div className="evp-types">
            {types.map((x, i) => (
              <div key={x.key || i} className={`evp-type ${i === 0 ? "on" : ""}`}>
                <div className="evp-type-info">
                  <b>{x.name}</b>
                  <span className="evp-type-left">{t.left.replace("{n}", x.left ?? Math.max(0, (x.qty || 100) - (x.taken || 0)))}</span>
                </div>
                <div className="evp-type-side">
                  <b className="evp-price">{free || !x.price ? t.free : usd(x.price)}</b>
                  <div className="evp-stepper">
                    <button type="button" tabIndex={-1}>
                      <Minus size={14} />
                    </button>
                    <b>{i === 0 ? n0 : 0}</b>
                    <button type="button" tabIndex={-1}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <div className="evp-bar">
        <div>
          <small>{t.ticketsN.replace("{n}", n0)}</small>
          <b>{free || !types[0].price ? t.free : usd(types[0].price * n0)}</b>
        </div>
        <span className="evp-btn">{t.continue}</span>
      </div>
    </div>
  );
}
