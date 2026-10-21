import { useEffect, useMemo, useRef, useState } from "react";
import { receiptHtml } from "./themes";

export { receiptHtml };

// a receipt on screen: the same page that is printed, in a frame that grows to its height
export function ReceiptView({ sale, shop, m, lang, theme = "classic", size = "80", width = 320 }) {
  const html = useMemo(() => receiptHtml({ sale, shop, m, lang, theme, size }), [sale, shop, m, lang, theme, size]);
  const ref = useRef(null);
  const [h, setH] = useState(420);
  useEffect(() => {
    const f = ref.current;
    if (!f) return undefined;
    const fit = () => {
      try {
        const b = f.contentDocument?.body;
        if (b) setH(Math.ceil(b.scrollHeight) + 4);
      } catch {
        /* not ready */
      }
    };
    f.addEventListener("load", fit);
    const t = setTimeout(fit, 600); // web fonts arrive a little later
    return () => {
      f.removeEventListener("load", fit);
      clearTimeout(t);
    };
  }, [html]);
  return <iframe ref={ref} className="mr-frame" title={sale.no || "receipt"} srcDoc={html} style={{ width, height: h }} sandbox="allow-same-origin" />;
}

// a small picture of a template (gallery)
export function ReceiptThumb({ sale, shop, m, lang, theme }) {
  const html = useMemo(() => receiptHtml({ sale, shop, m, lang, theme, size: "80" }), [sale, shop, m, lang, theme]);
  return (
    <span className="mr-thumb">
      <iframe title={theme} srcDoc={html} loading="lazy" tabIndex={-1} sandbox="allow-same-origin" />
    </span>
  );
}

// print through a hidden frame (no pop-up window needed)
export function printReceipt(opts) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(receiptHtml(opts));
  doc.close();
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } finally {
      setTimeout(() => frame.remove(), 60000);
    }
  };
  // wait for the logo and the fonts (offline: print anyway after a moment)
  const imgs = [...doc.images].filter((i) => !i.complete).map((i) => new Promise((r) => ((i.onload = r), (i.onerror = r))));
  Promise.race([Promise.all([...imgs, doc.fonts?.ready]), new Promise((r) => setTimeout(r, 1500))]).then(go);
}
