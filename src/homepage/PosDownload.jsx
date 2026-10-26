import { useState } from "react";
import { ChevronDown, Download, Info, Laptop, Monitor } from "lucide-react";
import { POS_DOWNLOADS as D } from "./downloads";

// which computer is looking at the page (to put its button first); phones/tablets → null
function thisComputer() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) return null;
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
  return null;
}

// "BizHub POS for your computer": the Windows and Mac apps, with the first-open steps while they are unsigned
export default function PosDownload({ t }) {
  const mine = thisComputer();
  const [open, setOpen] = useState(mine || "");
  const kinds = [
    ["windows", Monitor, "Windows", D.windows, [t.posWin1, t.posWin2, t.posWin3]],
    ["mac", Laptop, "Mac", D.mac, [t.posMac1, t.posMac2, t.posMac3, t.posMac4]],
  ];
  if (mine === "mac") kinds.reverse();

  return (
    <section id="pos" className="hx-section hx-pos">
      <div className="wrap">
        <div className="hx-head">
          <h2>{t.posTitle}</h2>
          <p>{t.posSub}</p>
        </div>
        <div className="hx-pos-grid">
          {kinds.map(([key, Icon, name, f, steps]) => (
            <article key={key} className={`hx-pos-card${mine === key ? " mine" : ""}`} data-testid={`pos-dl-${key}`}>
              <div className="hx-pos-top">
                <span className="hx-pos-ic">
                  <Icon size={26} aria-hidden="true" />
                </span>
                <span className="hx-pos-name">
                  <b>{name}</b>
                  <small>{f.needs}</small>
                </span>
                {mine === key && <span className="hx-pos-badge">{t.posThis}</span>}
              </div>
              <a className="btn hx-btn-main hx-pos-btn" href={f.url} download>
                <Download size={18} aria-hidden="true" />
                <span>
                  {t.posDownload} {name}
                </span>
              </a>
              <small className="hx-pos-meta">
                {t.posVersion} {D.version} · {f.size}
                {D.test ? ` · ${t.posTest}` : ""}
              </small>
              {D.test && (
                <div className={`hx-pos-help${open === key ? " on" : ""}`}>
                  <button type="button" onClick={() => setOpen(open === key ? "" : key)} aria-expanded={open === key}>
                    <Info size={16} aria-hidden="true" />
                    <span>{t.posFirst}</span>
                    <ChevronDown size={16} aria-hidden="true" className="hx-pos-chev" />
                  </button>
                  {open === key && (
                    <ol>
                      {steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
        <p className="hx-pos-foot">{t.posFoot}</p>
      </div>
    </section>
  );
}
