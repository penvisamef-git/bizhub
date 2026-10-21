import { useEffect, useMemo, useState } from "react";
import { Check, Lock, Printer } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { Field } from "../restaurant/parts";
import { PRINTS, printHtml } from "../../../qrgen/prints";
import { codeSvg, Head } from "./QgParts";
import { fmt } from "./text";

const SWATCHES = ["#E0581A", "#dc2626", "#db2777", "#9333ea", "#4f46e5", "#0284c7", "#0d9488", "#16a34a", "#ca8a04", "#111827"];

// print templates: pick one, pick a QR code, write the texts, print (5 coins each, one-time)
export default function QgPrint({ ctx }) {
  const { m, lang, data, readOnly } = ctx;
  const owned = data.prints || [];
  const codes = data.codes;
  const [key, setKey] = useState(PRINTS[0].key);
  const [cid, setCid] = useState(codes[0]?._id || "");
  const [t1, setT1] = useState(lang === "km" ? "ស្កេនមើលម៉ឺនុយ" : "Scan for our menu");
  const [t2, setT2] = useState(data.business.name);
  const [t3, setT3] = useState("");
  const [color, setColor] = useState(data.settings.color || "#E0581A");
  useEffect(() => {
    if (!cid && codes[0]) setCid(codes[0]._id);
  }, [codes, cid]);
  const code = codes.find((c) => c._id === cid);
  const logo = data.settings.logo?.url || "";
  const html = useMemo(() => {
    const svg = code ? codeSvg(code, logo, 600, m.frameLabelPh) : "";
    return printHtml(key, { svg, logo, t1, t2, t3, color, business: data.business.name });
  }, [key, code, logo, t1, t2, t3, color, data.business.name, m.frameLabelPh]);
  const tpl = PRINTS.find((x) => x.key === key);
  const mine = owned.includes(key);
  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html.replace("</body>", "<script>setTimeout(()=>print(),900)<\/script></body>"));
    w.document.close();
  };
  return (
    <div className="rs-col">
      <Head icon={Printer} title={m.printTitle} sub={m.printSub} />
      <div className="qg-print">
        <div className="qg-print-left">
          <section className="panel-card">
            <div className="qg-print-tpls">
              {PRINTS.map((x) => (
                <button key={x.key} type="button" className={`qg-print-tpl ${key === x.key ? "on" : ""}`} onClick={() => setKey(x.key)} data-testid={`qg-print-${x.key}`}>
                  <PrintThumb k={x.key} color={color} />
                  <small>
                    {lang === "km" ? x.km : x.en}
                    {owned.includes(x.key) ? (
                      <em className="mine">
                        <Check size={10} />
                      </em>
                    ) : (
                      <em>
                        <CoinIcon size={10} /> {fmt(data.prices.qr_print)}
                      </em>
                    )}
                  </small>
                </button>
              ))}
            </div>
          </section>
          <section className="panel-card md-fields">
            {!codes.length ? (
              <p className="rs-muted">{m.printNoCodes}</p>
            ) : (
              <Field label={m.printPick}>
                <select value={cid} onChange={(e) => setCid(e.target.value)} data-testid="qg-print-code">
                  {codes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={m.printText1}>
              <input value={t1} maxLength={60} onChange={(e) => setT1(e.target.value)} data-testid="qg-print-t1" />
            </Field>
            <Field label={m.printText2}>
              <input value={t2} maxLength={80} onChange={(e) => setT2(e.target.value)} />
            </Field>
            <Field label={m.printText3}>
              <input value={t3} maxLength={100} onChange={(e) => setT3(e.target.value)} />
            </Field>
            <div className="qg-swatches">
              <span className="rs-muted">{m.printColor}</span>
              <label className="fb-swatch fb-swatch-pick" style={{ background: color }}>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              </label>
              {SWATCHES.map((c) => (
                <button key={c} type="button" className={`fb-swatch ${color.toLowerCase() === c.toLowerCase() ? "on" : ""}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
              ))}
            </div>
          </section>
        </div>
        <aside className="qg-print-side">
          <section className="panel-card qg-print-preview">
            <div className={`qg-paper ${tpl?.landscape ? "land" : ""}`}>
              <iframe title="print preview" srcDoc={html} sandbox="allow-same-origin" tabIndex={-1} />
            </div>
            {mine ? (
              <button type="button" className="md-btn md-btn-primary" onClick={print} disabled={!code} data-testid="qg-print-go">
                <Printer size={16} /> {m.printGo}
              </button>
            ) : (
              <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ print: key })} disabled={readOnly} data-testid="qg-print-buy">
                <Lock size={14} /> {m.printBuy.replace("{coins}", `${fmt(data.prices.qr_print)} ${m.coins}`)}
              </button>
            )}
            <small className="rs-muted">{m.printTip}</small>
          </section>
        </aside>
      </div>
    </div>
  );
}

// a small drawing of each template
function PrintThumb({ k, color }) {
  const q = <i className="q" />;
  const parts = {
    tent: (
      <>
        <span className="half flip" style={{ borderTopColor: color }}>
          {q}
        </span>
        <span className="half" style={{ borderTopColor: color }}>
          {q}
        </span>
      </>
    ),
    poster: (
      <>
        <span className="h" style={{ background: color }} />
        {q}
        <span className="foot" style={{ background: color }} />
      </>
    ),
    poster_bold: (
      <span className="full" style={{ background: color }}>
        <span className="h w" />
        {q}
      </span>
    ),
    a5_card: (
      <>
        <span className="half" style={{ borderTopColor: color }}>
          {q}
        </span>
        <span className="half" style={{ borderTopColor: color }}>
          {q}
        </span>
      </>
    ),
    stickers: (
      <span className="g g12">
        {Array.from({ length: 12 }, (_, i) => (
          <b key={i} style={{ borderColor: color }} />
        ))}
      </span>
    ),
    round_stickers: (
      <span className="g g20">
        {Array.from({ length: 20 }, (_, i) => (
          <b key={i} className="r" style={{ borderColor: color }} />
        ))}
      </span>
    ),
    wifi_card: (
      <span className="g g8">
        {Array.from({ length: 8 }, (_, i) => (
          <b key={i} style={{ borderLeftColor: color }} />
        ))}
      </span>
    ),
    badge: (
      <span className="g g4">
        {Array.from({ length: 4 }, (_, i) => (
          <b key={i} className="bd" style={{ borderTopColor: color }} />
        ))}
      </span>
    ),
  };
  return <span className={`qg-pthumb t-${k}`}>{parts[k]}</span>;
}
