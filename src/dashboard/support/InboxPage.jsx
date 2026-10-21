import "../admin/master_data/masterdata.css";
import "../super_admin/super-admin.css";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Inbox, Mail, Phone, Search } from "lucide-react";
import { platformAdminService } from "../../api/services";
import { Bubbles, Composer, usePoll } from "./ChatParts";
import { fmt, fmtWhen, usd, useSpText } from "./text";
import { bizTypeName } from "../super_admin/BizTypes";
import CoinIcon from "../../components/CoinIcon";
import { ChatListSkeleton, ChatSkeleton } from "../../components/skeleton/Skeleton";

const initials = (s) =>
  String(s || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

// Super admin: every "Chat with BizHub" conversation, newest first; open one to answer
export default function InboxPage() {
  const { x, lang } = useSpText();
  const [params, setParams] = useSearchParams();
  const tid = params.get("t") || "";
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const loadList = useCallback(
    () =>
      platformAdminService
        .threads({ q: query, unread: unread ? "1" : "" })
        .then((r) => setRows(r.data))
        .catch(() => setRows((v) => v || [])),
    [query, unread],
  );
  useEffect(() => {
    loadList();
  }, [loadList]);
  usePoll(loadList, 10000, [loadList]);
  const open = (id) => setParams(id ? { t: id } : {}, { replace: true });
  return (
    <div className="md-page sa-page ch-page">
      <section className="panel-card ch-head">
        <span className="ch-head-ic">
          <Inbox size={24} />
        </span>
        <div>
          <h2>{x.inbox}</h2>
          <small className="rs-muted">{x.inboxSub}</small>
        </div>
      </section>
      <div className={`ib-layout ${tid ? "open" : ""}`}>
        <section className="panel-card ib-list">
          <label className="ib-search">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={x.search} />
          </label>
          <div className="ib-filter">
            <button type="button" className={!unread ? "on" : ""} onClick={() => setUnread(false)}>
              {x.all}
            </button>
            <button type="button" className={unread ? "on" : ""} onClick={() => setUnread(true)}>
              {x.unreadOnly}
            </button>
          </div>
          {!rows ? (
            <ChatListSkeleton />
          ) : !rows.length ? (
            <p className="rs-muted">{x.noChats}</p>
          ) : (
            rows.map((t) => (
              <button key={t._id} type="button" className={`ib-row ${t._id === tid ? "on" : ""} ${t.unread_admin ? "new" : ""}`} onClick={() => open(t._id)} data-testid="ib-row">
                <span className="ib-av">{t.customer_id?.photo?.url ? <img src={t.customer_id.photo.url} alt="" /> : initials(t.customer_id?.name || t.customer_id?.email)}</span>
                <span className="ib-main">
                  <b>{t.customer_id?.name || t.customer_id?.email || "—"}</b>
                  <small>
                    {t.last_from === "admin" ? "↩ " : ""}
                    {t.last_text || "…"}
                  </small>
                </span>
                <span className="ib-meta">
                  <small>{fmtWhen(t.last_at, lang)}</small>
                  {t.unread_admin > 0 && <em>{t.unread_admin}</em>}
                </span>
              </button>
            ))
          )}
        </section>
        {tid ? <Thread key={tid} tid={tid} onBack={() => open("")} onRead={loadList} /> : <section className="panel-card ib-empty rs-muted">{x.pick}</section>}
      </div>
    </div>
  );
}

function Thread({ tid, onBack, onRead }) {
  const { x, lang } = useSpText();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      platformAdminService
        .thread(tid)
        .then((r) => {
          setData((cur) => {
            if (!cur) return r.data;
            const fresh = r.data.messages;
            const ids = new Set(fresh.map((m) => m._id));
            return { ...r.data, more: cur.more, messages: [...cur.messages.filter((m) => !ids.has(m._id) && new Date(m.created_date) < new Date(fresh[0]?.created_date || 0)), ...fresh] };
          });
          window.dispatchEvent(new Event("bizhub-badges"));
        })
        .catch((e) => setError(e.message)),
    [tid],
  );
  useEffect(() => {
    load().then(onRead);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  usePoll(load, 8000, [load]);
  if (error && !data) return <section className="panel-card md-form-error">{error}</section>;
  if (!data)
    return (
      <section className="panel-card ib-thread">
        <ChatSkeleton />
      </section>
    );
  const c = data.thread.customer_id || {};
  const older = async () => {
    const r = await platformAdminService.thread(tid, { before: data.messages[0]?.created_date });
    setData((cur) => ({ ...cur, more: r.data.more, messages: [...r.data.messages, ...cur.messages] }));
  };
  return (
    <>
      <section className="panel-card ib-thread">
        <div className="ib-thread-head">
          <button type="button" className="md-icon-btn ib-back" onClick={onBack} aria-label={x.back}>
            <ArrowLeft size={18} />
          </button>
          <span className="ib-av">{c.photo?.url ? <img src={c.photo.url} alt="" /> : initials(c.name || c.email)}</span>
          <span className="ib-main">
            <b>{c.name || c.email}</b>
            <small className="rs-muted">{[c.email, c.phone].filter(Boolean).join(" · ")}</small>
          </span>
        </div>
        <Bubbles messages={data.messages} mine="admin" more={data.more} onOlder={older} them={{ name: c.name || c.email, photo: c.photo?.url || "" }} seenAt={data.seen_at} />
        <Composer
          onSend={async (text, files) => {
            const r = await platformAdminService.reply(tid, text, files);
            setData((cur) => ({ ...cur, messages: [...cur.messages, r.data] }));
            onRead();
          }}
        />
      </section>
      <aside className="panel-card ib-info">
        <b>{x.customer}</b>
        <small className="rs-muted">{x.since.replace("{date}", fmtWhen(c.created_date || data.thread.created_date, lang))}</small>
        {c.phone && (
          <a href={`tel:${c.phone}`}>
            <Phone size={13} /> {c.phone}
          </a>
        )}
        {c.email && (
          <a href={`mailto:${c.email}`}>
            <Mail size={13} /> {c.email}
          </a>
        )}
        <div className="ib-coins">
          <CoinIcon size={18} /> <b>{fmt(data.customer.coins)}</b> <small className="rs-muted">{x.coins}</small>
        </div>
        <b>
          {x.businesses} ({data.customer.businesses.length})
        </b>
        {data.customer.businesses.map((bz) => (
          <a key={bz._id} href={`/app/super-admin/businesses?open=${bz._id}`} className="ib-biz">
            {bz.name} <small className="rs-muted">· {bizTypeName(bz.category, lang)}</small>
          </a>
        ))}
        {data.customer.orders.length > 0 && <b>{x.lastOrders}</b>}
        {data.customer.orders.map((o) => (
          <a key={o._id} href={`/app/super-admin/coin-orders?status=${o.status}`} className="ib-biz">
            {o.no} · {fmt(o.total_coins)} · {usd(o.usd)} <small className={`ib-st s-${o.status}`}>{x.status[o.status]}</small>
          </a>
        ))}
      </aside>
    </>
  );
}
