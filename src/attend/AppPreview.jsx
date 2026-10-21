import HomeView from "./HomeView";
import { TEXT } from "./text";
import { colorVars } from "./looks";

// A real (scaled down) staff "Today" screen with sample data, for choosing a look in the dashboard.
const W = 390;
const H = 780;
export default function AppPreview({ theme = "classic", color = "#4F46E5", lang = "en", business = {}, scale = 0.4, dark = false }) {
  const x = TEXT[lang] || TEXT.en;
  const day = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const at = (hm) => new Date(Date.parse(`${day}T${hm}:00Z`) - 7 * 3600000).toISOString();
  const me = {
    staff: { name: "Sok Dara", position: lang === "km" ? "អ្នកគិតលុយ" : "Cashier" },
    business: { name: business.name || "My Company", logo_url: business.logo_url || "" },
    shift: { name: lang === "km" ? "ព្រឹក" : "Day", start: "08:00", end: "17:00" },
    branches: [{}],
    next: "out",
    stopped: false,
    today: { status: "working", first_in: at("08:04"), last_out: null, worked_min: 0, late_min: 0, early_min: 0, ot_min: 0, pending: 0, start: at("08:00"), end: at("17:00"), punches: [{ _id: "p1", kind: "in", at: at("08:04"), review: "ok" }] },
  };
  const fake = Date.parse(`${day}T11:30:00Z`) - 7 * 3600000; // always shown at 11:30
  return (
    <div className="sa-preview" style={{ width: W * scale, height: H * scale }}>
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <div className={`sa-app sa-t-${theme} ${dark ? "sa-dark" : "sa-light"}`} style={colorVars(color)}>
          <HomeView theme={theme} x={x} lang={lang} me={me} now={fake} langBtn={<span className="sa-lang">{lang === "km" ? "EN" : "ខ្មែរ"}</span>} onLogout={() => {}} onPress={() => {}} />
        </div>
      </div>
    </div>
  );
}
