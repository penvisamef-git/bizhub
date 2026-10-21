import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Lock, Printer } from "lucide-react";
import { guestHouseService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { GhPaper, GhReceipt, PRINT_THEMES, printDesc, printName, printReceipt, SAMPLE_STAY } from "../../../pos/guesthouse/GhReceipt";

const PAPER_W = { 80: 300, 58: 220, a4: 560 };

// Owner: Printing add-on (gh_printer) — paper, options and the 24 receipt templates (Classic free)
export function PrintTab({ ctx }) {
  const { g, lang, data, readOnly } = ctx;
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(
    () =>
      guestHouseService
        .print(ctx.id)
        .then((r) => setInfo(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load, data.settings.print_theme, data.addons?.gh_printer?.active]);

  const save = async (patch, key) => {
    setBusy(key);
    try {
      const r = await guestHouseService.setPrint(ctx.id, patch);
      setInfo(r.data);
      await ctx.reload();
      ctx.notify({ type: "success", text: g.saved });
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "gh_print_theme", item: patch.theme });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };

  const sample = useMemo(() => SAMPLE_STAY(lang), [lang]);
  if (!info) return <ListSkeleton rows={4} />;
  const on = info.on;
  const size = info.size;
  const test = () => printReceipt(<GhReceipt stay={sample} data={data} lang={lang} theme={info.current} size={size} qr={info.qr} methods={g.methods} />, size);

  return (
    <div className="rs-col">
      <section className="panel-card ghpr-hero">
        <span className="rs-addon-ic">
          <Printer size={24} />
        </span>
        <div>
          <h2 style={{ margin: 0 }}>{g.printTitle}</h2>
          <p className="rs-muted" style={{ margin: "4px 0 0" }}>
            {on ? g.printOn : g.printOff}
          </p>
        </div>
        {on ? (
          <button type="button" className="md-btn md-btn-ghost" onClick={test}>
            <Printer size={15} /> {g.testPrint}
          </button>
        ) : (
          <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon: "gh_printer" })} disabled={readOnly}>
            <CoinIcon size={15} /> {g.unlock.replace("{coins}", info.addon_price)}
          </button>
        )}
      </section>

      <section className="panel-card ghpr-opts">
        <div className="ghpr-opt">
          <b>{g.paper}</b>
          <div className="ghpr-seg">
            {["80", "58", "a4"].map((k) => (
              <button key={k} type="button" className={size === k ? "on" : ""} onClick={() => save({ size: k }, `size-${k}`)} disabled={readOnly || !!busy}>
                {g.papers[k]}
              </button>
            ))}
          </div>
        </div>
        <label className="ghpr-check">
          <input type="checkbox" checked={info.auto} onChange={(e) => save({ auto: e.target.checked }, "auto")} disabled={readOnly || !!busy} />
          <span>{g.printAuto}</span>
        </label>
        <label className="ghpr-check">
          <input type="checkbox" checked={info.qr} onChange={(e) => save({ qr: e.target.checked }, "qr")} disabled={readOnly || !!busy} />
          <span>{g.printQr}</span>
        </label>
      </section>

      <section className="panel-card">
        <h2 style={{ margin: 0 }}>{g.templatesTitle}</h2>
        <p className="rs-muted" style={{ margin: "6px 0 14px" }}>
          {g.templatesSub.replace("{price}", info.price)}
        </p>
        <div className="ghpr-grid">
          {PRINT_THEMES.map((k) => {
            const owned = info.owned.includes(k);
            const current = info.current === k;
            return (
              <article key={k} className={`ghpr-card ${current ? "on" : ""}`} data-theme-key={k}>
                <div className="ghpr-thumb">
                  <div className="ghpr-scale" style={{ width: PAPER_W[size], transform: `scale(${210 / PAPER_W[size]})` }}>
                    <GhPaper size={size}>
                      <GhReceipt stay={sample} data={data} lang={lang} theme={k} size={size} qr={info.qr} methods={g.methods} />
                    </GhPaper>
                  </div>
                  {!owned && (
                    <span className="ghl-lock">
                      <Lock size={12} />
                    </span>
                  )}
                  {k === "classic" && <span className="ghl-free">{g.free}</span>}
                </div>
                <div className="ghpr-meta">
                  <b>{printName(k, lang)}</b>
                  <small className="rs-muted">{printDesc(k, lang)}</small>
                </div>
                <div className="ghpr-act">
                  {current ? (
                    <span className="rs-pill ok">
                      <Check size={12} /> {g.inUse}
                    </span>
                  ) : owned ? (
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => save({ theme: k }, k)} disabled={readOnly || !!busy}>
                      {g.useLook}
                    </button>
                  ) : (
                    <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "gh_print_theme", item: k })} disabled={readOnly}>
                      <CoinIcon size={13} /> {info.price}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
