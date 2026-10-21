import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCheck, Inbox, Mail, MailOpen, MessageSquare, NotebookPen, Phone, Send, Trash2 } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { AddonPrompt } from "./parts";
import { useInboxText } from "./inbox-text";

const KIND_ICON = { feedback: MessageSquare, request: NotebookPen, booking: CalendarDays, other: Mail };
const isEmail = (s) => /@/.test(s);

// Inbox: messages people send from the restaurant website ("Send us a message")
export default function InboxTab({ ctx }) {
  const { lang, readOnly } = ctx;
  const t = useInboxText();
  const on = ctx.addonOn("rest_website");
  const [list, setList] = useState(null);
  const [page, setPage] = useState({ current: 1, total: 1 });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [open, setOpen] = useState(null); // message id
  const [busy, setBusy] = useState(false);

  const when = (d) => {
    const date = new Date(d);
    const mins = Math.round((Date.now() - date) / 60000);
    if (mins < 1) return t.justNow;
    if (mins < 60) return t.minAgo.replace("{n}", mins);
    if (mins < 60 * 24) return t.hourAgo.replace("{n}", Math.round(mins / 60));
    return new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
  };

  const load = useCallback(
    async (p = 1, append = false) => {
      const res = await restaurantService.site.messages(ctx.id, { page: p, unread: unreadOnly });
      setList((old) => (append && old ? [...old, ...res.data] : res.data));
      setPage({ current: res.pagination.currentPage, total: res.pagination.totalPages });
      ctx.setUnread(res.unread);
    },
    [ctx.id, unreadOnly], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load().catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const toggle = (m) => {
    setOpen(open === m._id ? null : m._id);
    if (!m.read && !readOnly)
      restaurantService.site
        .readMessage(ctx.id, m._id, true)
        .then((res) => {
          setList((l) => l.map((x) => (x._id === m._id ? { ...x, read: true } : x)));
          ctx.setUnread(res.unread);
        })
        .catch(() => {});
  };
  const markUnread = (m) =>
    act(async () => {
      const res = await restaurantService.site.readMessage(ctx.id, m._id, false);
      setList((l) => l.map((x) => (x._id === m._id ? { ...x, read: false } : x)));
      ctx.setUnread(res.unread);
      setOpen(null);
    });
  const remove = (m) =>
    act(async () => {
      const res = await restaurantService.site.removeMessage(ctx.id, m._id);
      setList((l) => l.filter((x) => x._id !== m._id));
      ctx.setUnread(res.unread);
    });
  const readAll = () =>
    act(async () => {
      await restaurantService.site.readAll(ctx.id);
      setList((l) => (unreadOnly ? [] : l.map((x) => ({ ...x, read: true }))));
      ctx.setUnread(0);
    });

  if (!list) return <ListSkeleton rows={4} />;
  const unread = ctx.overview.inbox_unread || 0;

  return (
    <div className="rs-col">
      <section className="panel-card">
        <div className="pe-list-head">
          <div>
            <h2 style={{ margin: 0 }}>{t.title}</h2>
            <small className="rs-muted">{unread ? t.unreadCount.replace("{n}", unread) : t.allRead}</small>
          </div>
          <div className="ib-tools">
            <div className="rs-subtabs">
              <button type="button" className={!unreadOnly ? "on" : ""} onClick={() => setUnreadOnly(false)}>
                {t.all}
              </button>
              <button type="button" className={unreadOnly ? "on" : ""} onClick={() => setUnreadOnly(true)}>
                {t.unread} {unread > 0 && <span className="rs-badge">{unread}</span>}
              </button>
            </div>
            {unread > 0 && (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={readAll} disabled={busy || readOnly}>
                <CheckCheck size={15} /> {t.markAll}
              </button>
            )}
          </div>
        </div>
        <p className="rs-muted" style={{ margin: "10px 0 0" }}>
          {t.sub}
          {ctx.addonOn("rest_telegram") && (
            <>
              {" "}
              <Send size={13} style={{ verticalAlign: -2 }} /> {t.alsoTelegram}
            </>
          )}
        </p>
      </section>

      {!on && <AddonPrompt addonKey="rest_website" ctx={ctx} sub={t.needWebsite} />}

      {list.length === 0 ? (
        <section className="panel-card rs-empty">
          <Inbox size={30} />
          <p>{unreadOnly ? t.noUnread : t.empty}</p>
          {on && !unreadOnly && (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("website")}>
              {t.openWebsite}
            </button>
          )}
        </section>
      ) : (
        <ul className="ib-list">
          {list.map((m) => {
            const Icon = KIND_ICON[m.kind] || Mail;
            const isOpen = open === m._id;
            return (
              <li key={m._id} className={`panel-card ib-item ${m.read ? "" : "new"} ${isOpen ? "open" : ""}`}>
                <button type="button" className="ib-row" onClick={() => toggle(m)} aria-expanded={isOpen}>
                  <span className={`ib-ic k-${m.kind}`}>
                    <Icon size={17} />
                  </span>
                  <span className="ib-main">
                    <span className="ib-top">
                      <b>{m.name}</b>
                      <span className={`ib-kind k-${m.kind}`}>{t.kinds[m.kind]}</span>
                      <small>{when(m.created_date)}</small>
                    </span>
                    <span className="ib-preview">{m.message}</span>
                  </span>
                  {!m.read && <span className="ib-dot" aria-label={t.unread} />}
                </button>
                {isOpen && (
                  <div className="ib-body">
                    <p className="ib-text">{m.message}</p>
                    <div className="ib-actions">
                      <a className="md-btn md-btn-primary sa-btn-sm" href={isEmail(m.contact) ? `mailto:${m.contact}` : `tel:${m.contact.replace(/[^\d+]/g, "")}`}>
                        {isEmail(m.contact) ? <Mail size={15} /> : <Phone size={15} />} {isEmail(m.contact) ? t.replyEmail : t.call} · {m.contact}
                      </a>
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => markUnread(m)} disabled={busy || readOnly}>
                        <MailOpen size={15} /> {t.markUnread}
                      </button>
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm ib-del" onClick={() => remove(m)} disabled={busy || readOnly}>
                        <Trash2 size={15} /> {t.delete}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {page.current < page.total && (
        <div style={{ textAlign: "center" }}>
          <button type="button" className="md-btn md-btn-ghost" onClick={() => act(() => load(page.current + 1, true))} disabled={busy}>
            {t.more}
          </button>
        </div>
      )}
    </div>
  );
}
