import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Loader2 } from "lucide-react";
import { saveTicketImage } from "./TicketCard";
import { usd } from "./text";

// the KHQR card (red header, merchant, exact amount, QR) — the look Cambodian bank apps expect
export function KhqrCard({ k, no, t }) {
  const [src, setSrc] = useState("");
  const box = useRef(null);
  useEffect(() => {
    QRCode.toDataURL(k.qr, { margin: 1, width: 520, errorCorrectionLevel: "M" })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [k.qr]);
  return (
    <div className="evp-khqr-wrap" data-testid="evp-khqr">
      <div className="evp-khqr" ref={box}>
        <div className="evp-khqr-head">
          <b>KHQR</b>
        </div>
        <div className="evp-khqr-who">
          <small>{k.name}</small>
          <b>
            {usd(k.amount)} <span>USD</span>
          </b>
        </div>
        <div className="evp-khqr-qr">{src ? <img src={src} alt="KHQR" /> : <Loader2 size={26} className="evp-spin" />}</div>
        <small className="evp-khqr-id">{k.bakong_id}</small>
      </div>
      <div className="evp-khqr-wait">
        <Loader2 size={15} className="evp-spin" /> {t.khqrWaiting}
      </div>
      <button type="button" className="evp-mini center" onClick={() => saveTicketImage(box.current, `khqr-${no}.png`)}>
        <Download size={14} /> {t.khqrSave}
      </button>
    </div>
  );
}
export default KhqrCard;
