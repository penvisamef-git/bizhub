import { useEffect, useState } from "react";
import { Maximize, ShoppingBasket } from "lucide-react";
import { CHANNEL } from "./display";
import "./martdisplay.css";

const money = (v, cur) => (cur === "KHR" ? `${Math.round(Number(v) || 0).toLocaleString("en-US")}៛` : `$${(Number(v) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const riel = (v) => `${Math.round(Number(v) || 0).toLocaleString("en-US")}៛`;
const T = {
  welcome: ["Welcome", "សូមស្វាគមន៍"],
  items: ["items", "មុខ"],
  total: ["Total", "សរុប"],
  scan: ["Scan to pay", "ស្កេនដើម្បីបង់ប្រាក់"],
  thanks: ["Thank you!", "អរគុណ!"],
  change: ["Your change", "លុយអាប់"],
  points: ["points", "ពិន្ទុ"],
  saved: ["You save", "អ្នកសន្សំបាន"],
  waiting: ["Waiting for the POS…", "កំពុងរង់ចាំ POS…"],
};
const both = (k) => (
  <>
    <span>{T[k][0]}</span>
    <small>{T[k][1]}</small>
  </>
);

// /pos/mini-mart/display — the screen facing the customer (opened from the POS on the same computer)
export default function MartDisplay() {
  const [pic, setPic] = useState(null);
  const [fs, setFs] = useState(false);
  useEffect(() => {
    document.title = "BizHub · Customer screen";
    if (typeof BroadcastChannel === "undefined") return undefined;
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (e) => e.data && e.data.mode && setPic(e.data);
    ch.postMessage({ type: "hello" });
    const t = setInterval(() => ch.postMessage({ type: "hello" }), 5000);
    return () => {
      clearInterval(t);
      ch.close();
    };
  }, []);
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const shop = pic?.shop || {};
  const cur = pic?.currency || "USD";
  const style = pic?.color ? { "--md-a": pic.color } : undefined;
  return (
    <div className={`md-screen m-${pic?.mode || "wait"}`} style={style}>
      {!fs && (
        <button type="button" className="md-fs" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} aria-label="Full screen">
          <Maximize size={18} />
        </button>
      )}
      <header className="md-top">
        <span className="md-logo">{shop.logo ? <img src={shop.logo} alt="" /> : <ShoppingBasket size={28} />}</span>
        <b>{shop.name || "BizHub"}</b>
      </header>
      {!pic ? (
        <div className="md-center">
          <p>{both("waiting")}</p>
        </div>
      ) : pic.mode === "idle" ? (
        <div className="md-center">
          <h1>{both("welcome")}</h1>
          {pic.promos?.length > 0 && (
            <div className="md-deals">
              {pic.promos.map((d) => (
                <span key={d}>🏷 {d}</span>
              ))}
            </div>
          )}
        </div>
      ) : pic.mode === "thanks" ? (
        <div className="md-center">
          <h1>{both("thanks")}</h1>
          <div className="md-big">{money(pic.total, cur)}</div>
          {pic.change > 0 && (
            <div className="md-change">
              {both("change")}
              <b>{cur === "USD" ? riel(pic.change_khr) : money(pic.change, cur)}</b>
            </div>
          )}
          {pic.earned > 0 && (
            <div className="md-points">
              🎁 +{pic.earned} {T.points[0]} · {T.points[1]}
            </div>
          )}
        </div>
      ) : (
        <div className="md-body">
          <div className="md-lines">
            {(pic.lines || []).map((l) => (
              <div key={l.key} className="md-line">
                <span className="md-q">{l.qty}×</span>
                <span className="md-n">{l.name}</span>
                <b>{money(l.total, cur)}</b>
              </div>
            ))}
          </div>
          <aside className="md-side">
            {pic.mode === "pay" && pic.qr ? (
              <div className="md-qr">
                <img src={pic.qr} alt="QR" />
                <small>{pic.qr_label}</small>
                <p>{both("scan")}</p>
              </div>
            ) : null}
            <div className="md-sum">
              {(pic.promos_applied || []).map((d) => (
                <div key={d.name} className="md-row promo">
                  <span>🏷 {d.name}</span>
                  <span>−{money(d.amount, cur)}</span>
                </div>
              ))}
              {pic.discount > 0 && (
                <div className="md-row promo">
                  <span>−</span>
                  <span>−{money(pic.discount, cur)}</span>
                </div>
              )}
              {pic.points_value > 0 && (
                <div className="md-row promo">
                  <span>🎁 {pic.points_used}</span>
                  <span>−{money(pic.points_value, cur)}</span>
                </div>
              )}
              <div className="md-row tot">
                <span>
                  {both("total")} · {pic.count} {T.items[0]}
                </span>
              </div>
              <div className="md-big">{money(pic.total, cur)}</div>
              {cur === "USD" && <div className="md-khr">{riel(pic.total_khr)}</div>}
              {pic.member && (
                <div className="md-points">
                  🎁 {pic.member} · {pic.member_points} {T.points[0]}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
