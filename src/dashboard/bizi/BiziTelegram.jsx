import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { searchService } from "../../api/services";
import { Switch } from "./BiziSettings";

// Bizi on Telegram, inside Bizi settings: connect the owner's own chat with the BizHub bot (a t.me link → Start),
// then choose the morning summary / alerts / Monday report, send a test, or disconnect.
export default function BiziTelegram({ x, lang, prefs, save, setPrefs }) {
  const tg = prefs.tg || {};
  const [waiting, setWaiting] = useState(false);
  const [msg, setMsg] = useState("");
  const poll = useRef(null);

  useEffect(() => () => clearInterval(poll.current), []);
  // connected (seen while waiting) → stop asking
  useEffect(() => {
    if (tg.connected && waiting) {
      setWaiting(false);
      clearInterval(poll.current);
    }
  }, [tg.connected, waiting]);

  const connect = async () => {
    setMsg("");
    // the window opens now (a popup opened after an await is blocked), the address comes a moment later
    const w = window.open("", "_blank");
    try {
      const r = await searchService.tgLink(lang);
      if (w) w.location.href = r.data.url;
      else window.location.href = r.data.url;
      setWaiting(true);
      const until = Date.now() + 15 * 60e3;
      clearInterval(poll.current);
      poll.current = setInterval(() => {
        if (Date.now() > until) {
          clearInterval(poll.current);
          setWaiting(false);
          return;
        }
        searchService
          .prefs()
          .then((p) => p.data?.tg?.connected && setPrefs(p.data))
          .catch(() => {});
      }, 3000);
    } catch (e) {
      w?.close();
      setMsg(e.message || "Error");
    }
  };
  const test = () =>
    searchService
      .tgTest()
      .then(() => setMsg(x.tgSent))
      .catch((e) => setMsg(e.message || "Error"));
  const off = () =>
    searchService
      .tgOff()
      .then(() => searchService.prefs())
      .then((p) => setPrefs(p.data))
      .catch((e) => setMsg(e.message || "Error"));

  return (
    <div className="bizi-tg" data-testid="bizi-tg">
      <div className="bizi-head">{x.tgHead}</div>
      {!tg.configured ? (
        <p className="bizi-note small">{x.tgNotReady}</p>
      ) : !tg.connected ? (
        <div className="bizi-tg-box">
          <p>{x.tgSub}</p>
          <button type="button" className="bizi-help-go" onClick={connect} data-testid="bizi-tg-connect">
            <Send size={15} aria-hidden="true" /> {x.tgConnect}
          </button>
          {waiting && (
            <p className="bizi-note small" role="status">
              {x.tgWaiting}
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="bizi-tg-on" data-testid="bizi-tg-on">
            <Send size={15} aria-hidden="true" /> {x.tgConnected.replace("{name}", tg.chat_name || "Telegram")}
          </p>
          <Switch on={tg.morning} label={x.tgMorning} onChange={() => save({ tg: { morning: !tg.morning } })} id="bizi-tg-morning" />
          <Switch on={tg.alerts} label={x.tgAlerts} onChange={() => save({ tg: { alerts: !tg.alerts } })} id="bizi-tg-alerts" />
          <Switch on={tg.weekly} label={x.tgWeekly} onChange={() => save({ tg: { weekly: !tg.weekly } })} id="bizi-tg-weekly" />
          <div className="bizi-help-acts bizi-tg-acts">
            <button type="button" className="bizi-set-back" onClick={test} data-testid="bizi-tg-test">
              {x.tgTest}
            </button>
            <button type="button" className="bizi-help-ask" onClick={off}>
              {x.tgOff}
            </button>
          </div>
        </>
      )}
      {msg && (
        <p className="bizi-note small" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
