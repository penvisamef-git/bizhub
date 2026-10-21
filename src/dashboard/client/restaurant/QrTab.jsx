import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { ChefHat, Copy, Download, ExternalLink, Printer, QrCode } from "lucide-react";
import { restaurantService } from "../../../api/services";
import { PUBLIC_SITE_URL } from "../../../config";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { AddonPrompt, Field } from "./parts";
import QrSticker from "./QrSticker";

const nameOf = (x, lang) => (lang === "km" ? x.name_km || x.name_en : x.name_en || x.name_km) || "—";
const qr = (text, width = 600) => QRCode.toDataURL(text, { width, margin: 1, color: { dark: "#16171b", light: "#ffffff" } });

// QR menu (add-on): online menu link, table stickers to print, QR for a category or an item
export default function QrTab({ ctx }) {
  const { r, lang, settings } = ctx;
  const on = ctx.addonOn("rest_qr_menu");
  const pick = (z, t, c, i) => ({ zones: z, tables: t.filter((x) => x.active), categories: c.filter((x) => x.active), items: i.filter((x) => x.active) });
  const [data, setData] = useState(() => {
    const lists = ["zones", "tables", "categories", "items"].map((k) => restaurantService.cached(ctx.id, k));
    return lists.every(Boolean) ? pick(...lists) : null;
  });
  const [zone, setZone] = useState("");
  const [target, setTarget] = useState("menu"); // menu | c:<id> | i:<id>
  const [qrImg, setQrImg] = useState("");
  const [copied, setCopied] = useState(false);
  const [printing, setPrinting] = useState(null); // [{ name, img }]
  const [picked, setPicked] = useState([]); // table ids to print
  const base = `${PUBLIC_SITE_URL}/public/menu/${settings.menu_token}`;

  useEffect(() => {
    if (!on) return;
    Promise.all(["zones", "tables", "categories", "items"].map((k) => restaurantService.list(ctx.id, k)))
      .then(([z, t, c, i]) => setData(pick(z.data, t.data, c.data, i.data)))
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [on, ctx.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const link = useMemo(() => (target === "menu" ? base : target.startsWith("c:") ? `${base}?c=${target.slice(2)}` : `${base}?i=${target.slice(2)}`), [target, base]);
  useEffect(() => {
    if (on) qr(link).then(setQrImg);
  }, [link, on]);

  // print: render the sheet, then open the print dialog
  useEffect(() => {
    if (!printing) return undefined;
    document.body.classList.add("rs-printing");
    const timer = setTimeout(() => window.print(), 300);
    const done = () => setPrinting(null);
    window.addEventListener("afterprint", done);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
      document.body.classList.remove("rs-printing");
    };
  }, [printing]);

  if (!on) {
    return (
      <div className="rs-col">
        <section className="panel-card rs-qr-promo">
          <div className="rs-qr-mock" aria-hidden="true">
            <span className="rs-qr-sticker">
              <b>A1</b>
              <QrCode size={64} />
              <small>{r.scanToOrder}</small>
            </span>
          </div>
          <div>
            <h2>{r.addonNames.rest_qr_menu}</h2>
            <p className="rs-muted">{r.qrSub}</p>
          </div>
        </section>
        <AddonPrompt addonKey="rest_qr_menu" ctx={ctx} />
      </div>
    );
  }
  if (!data) return <ListSkeleton rows={3} />;

  const tables = data.tables.filter((t) => !zone || String(t.zone_id) === zone);
  // only the tables the owner ticked (in the zone shown)
  const toPrint = tables.filter((t) => picked.includes(t._id));
  const allPicked = tables.length > 0 && toPrint.length === tables.length;
  const togglePick = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const pickAll = () => setPicked((p) => (allPicked ? p.filter((id) => !tables.some((t) => t._id === id)) : [...new Set([...p, ...tables.map((t) => t._id)])]));
  const printStickers = async () => {
    const list = await Promise.all(toPrint.map(async (t) => ({ name: t.name, img: await qr(`${base}?t=${encodeURIComponent(t.name)}`, 480) })));
    setPrinting(list);
  };
  const restName = settings.name_km || settings.name_en;

  return (
    <div className="rs-col">
      <section className="panel-card">
        <h2>{r.menuLink}</h2>
        <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
          {r.qrSub}
        </p>
        <div className="ne-share">
          {qrImg && target === "menu" && <img src={qrImg} alt="QR" className="ne-qr" />}
          <div className="ne-share-actions">
            <code>{base}</code>
            <div>
              <a className="md-btn md-btn-ghost" href={base} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> {r.openMenu}
              </a>
              <button
                type="button"
                className="md-btn md-btn-ghost"
                onClick={() =>
                  navigator.clipboard?.writeText(base).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  })
                }
              >
                <Copy size={16} /> {copied ? r.copied : r.copy}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <h2>{r.tableStickers}</h2>
        <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
          {r.tableStickersHint}
        </p>
        {data.tables.length === 0 ? (
          <p className="rs-muted">{r.noTablesForQr}</p>
        ) : (
          <>
            <div className="rs-sticker-bar">
              <select value={zone} onChange={(e) => setZone(e.target.value)} aria-label={r.zones}>
                <option value="">{r.allZones}</option>
                {data.zones.map((z) => (
                  <option key={z._id} value={z._id}>
                    {z.name}
                  </option>
                ))}
              </select>
              <button type="button" className="md-btn md-btn-ghost" onClick={pickAll} disabled={!tables.length}>
                {allPicked ? r.clearPick : r.pickAll}
              </button>
              <button type="button" className="md-btn md-btn-primary" onClick={printStickers} disabled={!toPrint.length}>
                <Printer size={16} /> {toPrint.length ? r.printN.replace("{n}", toPrint.length) : r.pickFirst}
              </button>
            </div>
            <div className="rs-sticker-pick">
              {tables.map((t) => (
                <label key={t._id} className={picked.includes(t._id) ? "on" : ""}>
                  <input type="checkbox" checked={picked.includes(t._id)} onChange={() => togglePick(t._id)} />
                  <QrCode size={16} />
                  <b>{t.name}</b>
                </label>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel-card">
        <h2>{r.menuQr}</h2>
        <p className="rs-muted" style={{ margin: "-6px 0 12px" }}>
          {r.menuQrHint}
        </p>
        <div className="rs-qr-maker">
          <Field label={r.qrTarget} htmlFor="qr-target">
            <select id="qr-target" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="menu">{r.wholeMenu}</option>
              <optgroup label={r.categories}>
                {data.categories.map((c) => (
                  <option key={c._id} value={`c:${c._id}`}>
                    {nameOf(c, lang)}
                  </option>
                ))}
              </optgroup>
              <optgroup label={r.items}>
                {data.items.map((i) => (
                  <option key={i._id} value={`i:${i._id}`}>
                    {nameOf(i, lang)}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
          {qrImg && (
            <div className="rs-qr-out">
              <img src={qrImg} alt="QR" />
              <code>{link}</code>
              <a className="md-btn md-btn-ghost sa-btn-sm" href={qrImg} download={`menu-qr-${target.replace(":", "-")}.png`}>
                <Download size={15} /> {r.downloadQr}
              </a>
            </div>
          )}
        </div>
      </section>

      {printing &&
        createPortal(
          <div className="rs-print-root">
            {printing.map((p) => (
              <QrSticker key={p.name} theme={settings.qr_theme || "classic"} color={settings.color} logo={settings.logo?.url} shop={restName} table={p.name} qr={p.img} scan="ស្កេនដើម្បីមើលម៉ឺនុយ · Scan to see the menu" />
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
