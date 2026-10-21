import "./qr-stickers.css";

// One table sticker (printed, or shown small as a preview). theme: a key of QR_THEMES (pos/themes.js).
// "tent" prints the face twice, one upside down, so the paper folds into a stand with a QR on each side.
export default function QrSticker({ theme = "classic", color = "#E0581A", logo = "", shop = "", table = "", qr = "", scan = "ស្កេនដើម្បីកុម្ម៉ង់ · Scan to order", tableWord = "តុ · Table" }) {
  const face = (flip) => (
    <div className={`qs-face ${flip ? "qs-flip" : ""}`}>
      <span className="qs-deco" aria-hidden="true" />
      <div className="qs-top">
        {logo ? <img src={logo} alt="" /> : null}
        <span>{shop}</span>
      </div>
      <small className="qs-word">{tableWord}</small>
      <b className="qs-table">{table}</b>
      <div className="qs-qr">{qr ? <img src={qr} alt="" /> : <span className="qs-qr-ph" />}</div>
      <span className="qs-scan">{scan}</span>
    </div>
  );
  return (
    <div className={`qs qs-${theme}`} style={{ "--c": color }}>
      {theme === "tent" && face(true)}
      {face(false)}
    </div>
  );
}
