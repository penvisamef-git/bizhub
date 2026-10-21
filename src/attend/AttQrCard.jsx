import "./att-qr.css";

// The printed staff QR sticker (100 mm wide). theme: a key of QR_LOOKS (looks.js).
// hours: ["Day 08:00–17:00", …]  note: one free line from the owner, e.g. "Clock in before 8:00"
export default function AttQrCard({ theme = "classic", logo = "", name = "", qr = "", hours = [], note = "" }) {
  const initial = Array.from(String(name || "B").trim() || "B")[0].toUpperCase();
  return (
    <div className={`aq aq-${theme}`}>
      <span className="aq-deco" aria-hidden="true" />
      {theme === "badge" && <span className="aq-hole" aria-hidden="true" />}
      <div className="aq-head">
        <span className="aq-logo">{logo ? <img src={logo} alt="" /> : <b>{initial}</b>}</span>
        <span className="aq-name">{name}</span>
      </div>
      <small className="aq-title">វត្តមានបុគ្គលិក · Staff attendance</small>
      <div className="aq-qr">{qr ? <img src={qr} alt="QR" /> : <span className="aq-qr-ph" />}</div>
      <b className="aq-scan">ស្កេនដើម្បីចុះវត្តមាន</b>
      <span className="aq-scan-en">Scan to clock in / out</span>
      {hours.length > 0 && (
        <div className="aq-hours">
          {hours.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
      )}
      {note && <p className="aq-note">{note}</p>}
      <span className="aq-foot">BizHub · Attendance</span>
    </div>
  );
}
