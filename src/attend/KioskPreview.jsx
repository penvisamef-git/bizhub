import KioskView from "./KioskView";

// A door-kiosk screen with sample data, drawn at tablet size and scaled down (for choosing a look)
const W = 1280;
const H = 800;
export default function KioskPreview({ theme = "classic", color = "#0F766E", lang = "en", business = {}, qr = "", scale = 0.2 }) {
  const day = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const at = (hm) => new Date(Date.parse(`${day}T${hm}:00Z`) - 7 * 3600000).toISOString();
  const d = {
    business: { name: business.name || "My Company", logo_url: business.logo_url || "" },
    branch: { name: lang === "km" ? "ការិយាល័យកណ្តាល" : "Head office" },
    seconds: 20,
    today_in: 12,
    staff_total: 15,
    recent: [
      { name: "Dara", kind: "in", at: at("08:04") },
      { name: "Sreyneang", kind: "in", at: at("08:01") },
      { name: "Rithy", kind: "in", at: at("07:58") },
      { name: "Bopha", kind: "out", at: at("07:55") },
    ],
  };
  const now = Date.parse(`${day}T08:05:12Z`) - 7 * 3600000;
  return (
    <div className="kq-preview" style={{ width: W * scale, height: H * scale }}>
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <KioskView theme={theme} color={color} d={d} qr={qr} now={now} left={13} lang={lang} />
      </div>
    </div>
  );
}
