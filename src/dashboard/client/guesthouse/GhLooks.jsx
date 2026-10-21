import { useCallback, useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { guestHouseService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import { DisplayPreview, DISPLAY_THEMES, SAMPLE, THEME_NAMES } from "../../../pos/guesthouse/DisplayView";

// Owner: pick the guest display look (12; the first is free)
export function DisplayLooks({ ctx }) {
  const { g, lang, data, readOnly } = ctx;
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(
    () =>
      guestHouseService
        .displayThemes(ctx.id)
        .then((r) => setInfo(r.data))
        .catch(() => {}),
    [ctx.id],
  );
  useEffect(() => {
    load();
  }, [load, data.settings.display_theme]);
  const use = async (theme) => {
    setBusy(theme);
    try {
      await guestHouseService.setTheme(ctx.id, theme);
      await ctx.reload();
      ctx.notify({ type: "success", text: g.saved });
    } catch (e) {
      if (e.status === 402) ctx.askBuy({ addon: "gh_display_theme", item: theme });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const names = THEME_NAMES[lang] || THEME_NAMES.en;
  const image = data.settings.display_image?.url || data.settings.cover?.url || "";
  return (
    <section className="panel-card">
      <h2 style={{ margin: 0 }}>{g.looksTitle}</h2>
      <p className="rs-muted" style={{ margin: "6px 0 14px" }}>
        {g.looksSub.replace("{price}", info?.price ?? 75)}
      </p>
      <div className="ghl-grid">
        {DISPLAY_THEMES.map((k) => {
          const owned = info?.owned?.includes(k);
          const current = (info?.current || data.settings.display_theme || "classic") === k;
          return (
            <div key={k} className={`ghl-card ${current ? "on" : ""}`}>
              <DisplayPreview state={{ ...SAMPLE(data.business.name, lang, k, image), business: { name: data.business.name, logo: data.business.logo_url } }} />
              <div className="ghl-foot">
                <b>{names[k]}</b>
                {current ? (
                  <span className="rs-pill ok">
                    <Check size={12} /> {g.inUse}
                  </span>
                ) : owned ? (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => use(k)} disabled={readOnly || !!busy}>
                    {g.useLook}
                  </button>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "gh_display_theme", item: k })} disabled={readOnly}>
                    <CoinIcon size={13} /> {info?.price ?? 75}
                  </button>
                )}
              </div>
              {!owned && !current && (
                <span className="ghl-lock">
                  <Lock size={12} />
                </span>
              )}
              {k === "classic" && <span className="ghl-free">{g.free}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
