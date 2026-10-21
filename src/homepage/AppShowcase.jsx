import { useEffect, useState } from "react";
import { Mail, Phone, Play, Smartphone } from "lucide-react";

const BARS = [40, 62, 48, 75, 100];

// "Your business in your pocket": a phone showing a digital name card + an open foldable.
export default function AppShowcase({ t, settings }) {
  const [qr, setQr] = useState("");
  const live = settings.app?.status === "live";

  useEffect(() => {
    const url = `${window.location.origin}/public/card/demo`;
    // the QR library loads on its own (not in the first download every page waits for)
    import("qrcode")
      .then((m) => m.default.toString(url, { type: "svg", margin: 0, color: { dark: "#1A1714", light: "#FFFFFF" } }))
      .then(setQr)
      .catch(() => setQr(""));
  }, []);

  const store = (href, Icon, name) => (
    <a className="store-btn" href={live && href ? href : "#app"} target={live && href ? "_blank" : undefined} rel="noreferrer">
      <Icon size={22} aria-hidden="true" />
      <span>
        <small>{live ? t.getOn : t.soonOn}</small>
        <b>{name}</b>
      </span>
    </a>
  );

  return (
    <section id="app" className="section" style={{ paddingTop: 0 }}>
      <div className="wrap app-band split">
        <div className="blob b1" style={{ width: 360, height: 360, right: -80, bottom: -120 }} />
        <div className="text" style={{ position: "relative", flex: "1 1 420px" }}>
          <span className="eyebrow">{t.navApp}</span>
          <h2 className="sec-title" style={{ fontSize: "clamp(28px, 3.6vw, 40px)" }}>{t.appTitle}</h2>
          <p className="sec-sub">{t.appSub}</p>
          <div className="cta-row" style={{ marginTop: 8 }}>
            {store(settings.app?.android_url, Play, "Google Play")}
            {store(settings.app?.ios_url, Smartphone, "App Store")}
          </div>
        </div>

        <div className="devices" aria-hidden="true">
          <div className="fold float2">
            <div className="fold-screen">
              <div className="fold-half">
                <img src="/bizhub-logo.svg" alt="" style={{ height: 18, width: "auto", alignSelf: "flex-start" }} />
                <div className="mini-coin">
                  <small>{t.dashCoins}</small>
                  <b>1,250</b>
                </div>
                <div className="mini-row"><span>{t.cRestaurant}</span><span>$412</span></div>
                <div className="mini-row"><span>{t.cMart}</span><span>$286</span></div>
                <div className="mini-row"><span>{t.cGuest}</span><span>$180</span></div>
              </div>
              <div className="fold-half">
                <strong style={{ fontSize: 13 }}>{t.dashTitle}</strong>
                <div className="bars" style={{ flex: 1, height: "auto", gap: 6 }}>
                  {BARS.map((h, i) => (
                    <span key={i} className={i === BARS.length - 1 ? "top" : ""} style={{ height: `${h}%`, borderRadius: "5px 5px 0 0" }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="phone float">
            <div className="phone-inner">
              <div className="phone-screen">
                <div className="island" />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
                  <div className="nc-avatar"><span>SC</span></div>
                  <strong style={{ fontSize: 18 }}>Sokha Chan</strong>
                  <span style={{ fontSize: 12, color: "#CFC7BD" }}>{t.ncRole}</span>
                </div>
                <div className="nc-qr" dangerouslySetInnerHTML={{ __html: qr }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="nc-line"><Phone size={14} color="#F49056" /> 012 345 678</div>
                  <div className="nc-line"><Mail size={14} color="#F49056" /> sokha@company.com</div>
                </div>
                <div className="nc-btns">
                  <span className="main">{t.ncSave}</span>
                  <span>{t.ncShare}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
