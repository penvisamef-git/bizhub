import { useEffect, useState } from "react";
import { BedDouble } from "lucide-react";
import { ghPosApi } from "./ghApi";
import { listen } from "./display";
import { DisplayView } from "./DisplayView";

// /pos/guest-house/display — the screen facing the guest at the desk
const NO_KEY = {
  en: "Open this screen from the desk POS (Guest display → this computer or another tablet).",
  km: "សូមបើកអេក្រង់នេះពី POS (អេក្រង់ភ្ញៀវ → កុំព្យូទ័រនេះ ឬថេប្លេតផ្សេង)។",
};

export default function GhDisplay() {
  const [state, setState] = useState(null);
  const [now, setNow] = useState(Date.now());
  const key = new URLSearchParams(window.location.search).get("key") || "";

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  // same computer: the desk window talks to us directly
  useEffect(() => listen(setState), []);
  // another tablet: read what the desk pushed
  useEffect(() => {
    if (!key) return undefined;
    let live = true;
    const tick = () =>
      ghPosApi
        .readDisplay(key)
        .then((r) => live && r.data.state && setState(r.data.state))
        .catch(() => {});
    tick();
    const t = setInterval(tick, 1500);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [key]);

  const lang = state?.lang === "km" ? "km" : "en";
  const clock = new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Phnom_Penh" }).format(new Date(now));
  if (!state)
    return (
      <div className="ghd t-classic ghd-idle">
        <div className="ghd-center">
          <BedDouble size={64} />
          <p className="ghd-muted">{key ? "…" : NO_KEY[navigator.language?.startsWith("km") ? "km" : "en"]}</p>
        </div>
      </div>
    );
  return <DisplayView state={state} clock={clock} />;
}
