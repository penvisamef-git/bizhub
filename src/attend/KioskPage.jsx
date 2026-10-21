import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, Loader2, Maximize } from "lucide-react";
import { API_AUTH_KEY, API_HOST, PUBLIC_SITE_URL } from "../config";
import { useI18n } from "../i18n/I18nProvider";
import usePageTitle from "../components/usePageTitle";
import KioskView from "./KioskView";

const T = {
  en: {
    scan: "Scan to clock in / out",
    how: "Open your phone camera and point it at the code.",
    recent: "Just now",
    none: "Nobody yet today",
    off: "This door kiosk is not working. Ask the owner for a new link.",
    net: "No internet — trying again…",
    full: "Full screen",
    in: "in",
    out: "out",
  },
  km: {
    scan: "ស្កេនដើម្បីចុះវត្តមាន",
    how: "បើកកាមេរ៉ាទូរស័ព្ទ ហើយតម្រង់មកកូដនេះ។",
    recent: "ទើបតែចុះ",
    none: "មិនទាន់មាននរណាម្នាក់ថ្ងៃនេះ",
    off: "QR មាត់ទ្វារនេះមិនដំណើរការទេ។ សូមសុំតំណថ្មីពីម្ចាស់។",
    net: "គ្មានអ៊ីនធឺណិត — កំពុងព្យាយាមម្តងទៀត…",
    full: "ពេញអេក្រង់",
    in: "ចូល",
    out: "ចេញ",
  },
};

// The door tablet (att_kiosk): a QR that changes every 20 s. Staff scan it with their phone → /a/<code>?k=… → clock in without GPS.
export default function KioskPage() {
  const { token } = useParams();
  const { lang } = useI18n();
  const t = T[lang] || T.en;
  const [d, setD] = useState(null);
  const [err, setErr] = useState(""); // off | net
  const [qr, setQr] = useState("");
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const nextAt = useRef(0);
  usePageTitle(d?.business?.name || "Kiosk");

  useEffect(() => {
    let alive = true;
    let timer;
    const load = async () => {
      try {
        const res = await fetch(`${API_HOST}/api/att/kiosk/${token}`, { headers: API_AUTH_KEY ? { "x-api-key": API_AUTH_KEY } : {} });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          setErr("off");
          timer = setTimeout(load, 30000);
          return;
        }
        const data = json.data;
        offset.current = new Date(data.server_time).getTime() - Date.now();
        nextAt.current = Date.now() + data.seconds_left * 1000;
        setD(data);
        setErr("");
        // refresh right after the code changes, and every 5 s for the "just now" list
        timer = setTimeout(load, Math.min(5000, data.seconds_left * 1000 + 300));
      } catch {
        if (!alive) return;
        setErr("net");
        timer = setTimeout(load, 5000);
      }
    };
    load();
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, [token]);

  const link = d ? `${PUBLIC_SITE_URL}/a/${d.code}?k=${encodeURIComponent(d.k)}` : "";
  useEffect(() => {
    if (!link) return;
    import("qrcode")
      .then((m) => (m.default || m).toDataURL(link, { width: 720, margin: 1, errorCorrectionLevel: "M" }))
      .then(setQr)
      .catch(() => {});
  }, [link]);

  // keep the tablet awake while the page is open
  useEffect(() => {
    let lock;
    navigator.wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => lock?.release?.().catch(() => {});
  }, []);

  if (err === "off" && !d) {
    return (
      <div className="kq kq-off">
        <AlertTriangle size={48} />
        <p>{t.off}</p>
      </div>
    );
  }
  if (!d) {
    return (
      <div className="kq kq-off">
        <Loader2 size={40} className="kq-spin" />
      </div>
    );
  }
  const left = Math.max(0, (nextAt.current - now) / 1000);
  return (
    <KioskView
      theme={d.theme}
      color={d.color}
      d={d}
      qr={qr}
      now={now + offset.current}
      left={left}
      lang={lang}
      net={err === "net" ? t.net : ""}
      extra={
        <button type="button" className="kq-full" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} aria-label={t.full} title={t.full}>
          <Maximize size={18} />
        </button>
      }
    />
  );
}
