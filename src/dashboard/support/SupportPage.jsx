import "../admin/master_data/masterdata.css";
import "../super_admin/super-admin.css";
import { useCallback, useEffect, useState } from "react";
import { supportService } from "../../api/services";
import { Bubbles, Composer, usePoll } from "./ChatParts";
import { useSpText } from "./text";
import { Hotline, useCoinText } from "../client/licenses/CoinShop";
import { ChatSkeleton } from "../../components/skeleton/Skeleton";

// Chat with BizHub (customers): one conversation with the BizHub team — text, photos, files
export default function SupportPage() {
  const { x } = useSpText();
  const { x: cx } = useCoinText();
  const [msgs, setMsgs] = useState(null);
  const [more, setMore] = useState(false);
  const [hotline, setHotline] = useState(null);
  const [error, setError] = useState("");
  const [seenAt, setSeenAt] = useState(null);
  const load = useCallback(
    () =>
      supportService
        .get()
        .then((r) => {
          setMsgs((cur) => {
            // keep older pages already loaded
            const fresh = r.data.messages;
            if (!cur || !cur.length) return fresh;
            const ids = new Set(fresh.map((m) => m._id));
            return [...cur.filter((m) => !ids.has(m._id) && new Date(m.created_date) < new Date(fresh[0]?.created_date || 0)), ...fresh];
          });
          setMore((m) => m || r.data.more);
          setHotline(r.data.hotline);
          setSeenAt(r.data.seen_at || null);
          window.dispatchEvent(new Event("bizhub-badges"));
        })
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  usePoll(load, 8000, [load]);
  const older = async () => {
    const r = await supportService.get({ before: msgs[0]?.created_date });
    setMsgs((cur) => [...r.data.messages, ...cur]);
    setMore(r.data.more);
  };
  return (
    <div className="md-page sa-page ch-page">
      <section className="panel-card ch-head">
        <span className="ch-head-ic ch-head-logo">
          <img src="/bizhub-icon.svg" alt="" />
          <i className="ch-online" />
        </span>
        <div>
          <h2>{x.support}</h2>
          <small className="rs-muted">{x.chatSub}</small>
        </div>
      </section>
      <div className="ch-layout">
        <section className="panel-card ch-box">
          {error && !msgs ? (
            <div className="md-form-error">{error}</div>
          ) : !msgs ? (
            <ChatSkeleton />
          ) : (
            <Bubbles messages={msgs} mine="customer" more={more} onOlder={older} emptyHello={x.hello} them={{ name: x.support, photo: "/bizhub-icon.svg" }} seenAt={seenAt} />
          )}
          <Composer
            disabled={!msgs}
            onSend={async (text, files) => {
              const r = await supportService.send(text, files);
              setMsgs((cur) => [...(cur || []), r.data]);
            }}
          />
          <small className="rs-muted ch-hint">{x.online}</small>
        </section>
        {hotline && (hotline.phone || hotline.telegram || hotline.email) && (
          <aside className="ch-side">
            <b>{x.contact}</b>
            <Hotline h={{ ...hotline, note: "" }} x={{ ...cx, urgent: "" }} />
          </aside>
        )}
      </div>
    </div>
  );
}
