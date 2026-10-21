import { useEffect, useState } from "react";
import { Banknote, CalendarDays, Mail, MapPin, Phone, QrCode, ShoppingBag, Store, Truck, UserRound } from "lucide-react";
import { Modal } from "../../super_admin/parts";
import { fmtDate, fmtDayTime, money } from "./text";
import { useWText } from "./wtext";

const initials = (s) =>
  String(s || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
const TONE = { new: "warn", accepted: "info", ready: "ok", delivering: "info", done: "", declined: "bad", cancelled: "" };

// one online customer: who they are, how to reach them, where they live, what they buy, every order
export function CustomerModal({ ctx, cid, onClose }) {
  const { lang } = ctx;
  const w = useWText();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    ctx.api
      .customer(ctx.id, cid)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, [ctx, cid]);
  const c = data?.customer;
  const st = data?.stats;
  const cur = data?.currency || ctx.cur;
  return (
    <Modal title={c ? c.name : w.customer} onClose={onClose} size="md-modal-lg">
      {error ? (
        <div className="md-form-error">{error}</div>
      ) : !data ? (
        <p className="rs-muted">…</p>
      ) : (
        <div className="cu">
          <div className="cu-head">
            <span className="cu-ava">{c.avatar ? <img src={c.avatar} alt="" /> : initials(c.name)}</span>
            <span className="cu-who">
              <b>
                {c.name} {c.blocked && <em className="rs-pill bad">{w.blocked}</em>}
              </b>
              <span className="cu-links">
                <a href={`tel:${c.phone}`}>
                  <Phone size={13} /> {c.phone}
                </a>
                {c.email && (
                  <a href={`mailto:${c.email}`}>
                    <Mail size={13} /> {c.email}
                  </a>
                )}
              </span>
              <small className="rs-muted">
                <UserRound size={12} /> {w.since.replace("{date}", fmtDate(c.created_date, lang))}
                {c.last_login ? ` · ${w.lastSeen.replace("{date}", fmtDayTime(c.last_login, lang))}` : ""}
              </small>
            </span>
          </div>

          <div className="cu-stats">
            <span>
              <b>{st.orders}</b>
              <small>{w.orders}</small>
            </span>
            <span>
              <b>{st.done}</b>
              <small>{w.status.done}</small>
            </span>
            <span>
              <b>{money(st.spent, cur)}</b>
              <small>{w.spent}</small>
            </span>
            <span>
              <b>{money(st.avg, cur)}</b>
              <small>{w.avgOrder}</small>
            </span>
            <span>
              <b>{st.open}</b>
              <small>{w.inProgress}</small>
            </span>
            <span>
              <b>{st.cancelled}</b>
              <small>{w.cancelledShort}</small>
            </span>
          </div>

          <div className="cu-grid">
            <section className="cu-box">
              <h4>{w.howTheyBuy}</h4>
              <ul className="cu-facts">
                <li>
                  <Truck size={14} /> {w.delivery} · <b>{st.delivery}</b>
                </li>
                <li>
                  <Store size={14} /> {w.pickup} · <b>{st.pickup}</b>
                </li>
                <li>
                  <Banknote size={14} /> {w.cash} · <b>{st.cash}</b>
                </li>
                <li>
                  <QrCode size={14} /> {w.qr} · <b>{st.qr}</b>
                </li>
                {st.first_order && (
                  <li>
                    <CalendarDays size={14} /> {w.firstOrder} · <b>{fmtDate(st.first_order, lang)}</b>
                  </li>
                )}
              </ul>
            </section>
            <section className="cu-box">
              <h4>{w.addressesTitle}</h4>
              {!c.addresses.length ? (
                <p className="rs-muted">—</p>
              ) : (
                c.addresses.map((a, i) => (
                  <div key={i} className="cu-addr">
                    <MapPin size={14} />
                    <span>
                      {a.label && <b>{a.label} · </b>}
                      {a.address}
                      {a.note && <small className="rs-muted"> · {a.note}</small>}
                    </span>
                    {a.map && (
                      <a href={/^https?:\/\//i.test(a.map) ? a.map : `https://maps.google.com/?q=${encodeURIComponent(a.map)}`} target="_blank" rel="noreferrer">
                        {w.map}
                      </a>
                    )}
                  </div>
                ))
              )}
            </section>
          </div>

          {data.favourites.length > 0 && (
            <section className="cu-box">
              <h4>{w.favourites}</h4>
              <div className="cu-favs">
                {data.favourites.map((x) => (
                  <span key={x.name} className="cu-fav">
                    <span className="cu-fav-pic">{x.photo ? <img src={x.photo} alt="" /> : initials(x.name)}</span>
                    <span>
                      <b>{x.name}</b>
                      <small className="rs-muted">
                        {x.qty}× · {money(x.total, cur)}
                      </small>
                    </span>
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="cu-box">
            <h4>
              <ShoppingBag size={15} /> {w.allOrders} ({data.orders.length})
            </h4>
            {!data.orders.length ? (
              <p className="rs-muted">{w.noOrders}</p>
            ) : (
              <div className="cu-orders">
                {data.orders.map((o) => (
                  <div key={o._id} className="cu-order">
                    <span className="cu-order-main">
                      <b>{o.no}</b>
                      <small className="rs-muted">
                        {fmtDayTime(o.created_date, lang)} · {o.fulfil === "delivery" ? w.delivery : w.pickup} · {o.pay_method === "qr" ? w.paidQr : w.cash}
                      </small>
                      <small>{o.items.map((x) => `${x.qty}× ${x.name}`).join(" · ")}</small>
                    </span>
                    <span className={`rs-pill ${TONE[o.status]}`}>{w.status[o.status]}</span>
                    <b className="cu-order-total">{money(o.total, o.currency || cur)}</b>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
