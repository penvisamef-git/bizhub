import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Lock, Palette, RotateCcw } from "lucide-react";
import { menuQrService } from "../../../api/services";
import CoinIcon from "../../../components/CoinIcon";
import MenuView from "../../../qmenu/MenuView";
import { MQ_THEMES, MQ_THEME_KEYS, loadThemeFonts, themeClass, themeDesc, themeLabel, themeVars } from "../../../qmenu/themes";
import { Head } from "./parts";
import { fmt } from "./text";

// a food picture made of an emoji (demo menus need no internet)
const pic = (emoji, a, b) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="160" height="120" fill="url(#g)"/><text x="80" y="78" font-size="54" text-anchor="middle">${emoji}</text></svg>`)}`;
export const DEMO = {
  categories: [
    { _id: "c1", name_km: "ភេសជ្ជៈ", name_en: "Drinks", icon: "☕" },
    { _id: "c2", name_km: "អាហារ", name_en: "Food", icon: "🍜" },
  ],
  items: [
    {
      _id: "i1",
      category_id: "c1",
      name_km: "កាហ្វេទឹកដោះគោ",
      name_en: "Iced milk coffee",
      desc_km: "កាហ្វេខ្មែរ ទឹកដោះគោខាប់",
      desc_en: "Khmer coffee, condensed milk",
      price: 1.5,
      price_now: null,
      photos: [{ url: pic("🧋", "#f3d9b1", "#c08552") }],
      tags: ["best"],
    },
    { _id: "i2", category_id: "c1", name_km: "តែក្រូចឆ្មា", name_en: "Lemon tea", desc_km: "", desc_en: "", price: 1.25, price_now: 1, photos: [{ url: pic("🍹", "#fde68a", "#f59e0b") }], tags: ["new"] },
    {
      _id: "i3",
      category_id: "c2",
      name_km: "គុយទាវសាច់គោ",
      name_en: "Beef noodle soup",
      desc_km: "ស៊ុបឆ្អឹងគោ ៨ ម៉ោង",
      desc_en: "8-hour beef bone broth",
      price: 3.5,
      price_now: null,
      photos: [{ url: pic("🍜", "#fecaca", "#dc2626") }],
      tags: ["hot", "spicy"],
    },
    { _id: "i4", category_id: "c2", name_km: "សាឡាដស្វាយ", name_en: "Green mango salad", desc_km: "", desc_en: "Fresh herbs, peanuts", price: 2.75, price_now: null, photos: [{ url: pic("🥗", "#bbf7d0", "#16a34a") }], tags: ["veg"] },
  ],
};

// Menu looks: 53 designs, buy once, switch any time
export default function MqLooks({ ctx }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const s = data.settings;
  const owned = data.themes.owned;
  const [show, setShow] = useState("all");
  const [sel, setSel] = useState(s.theme);
  const [busy, setBusy] = useState("");
  const [color, setColor] = useState(s.color || "");
  const [real, setReal] = useState(null);
  useEffect(() => {
    Promise.all([menuQrService.categories(id), menuQrService.items(id)])
      .then(([c, i]) => setReal({ categories: c.data.filter((x) => x.active), items: i.data.filter((x) => x.active).map((x) => ({ ...x, price_now: x.sale_price ?? null })) }))
      .catch(() => setReal({ categories: [], items: [] }));
  }, [id]);
  // previews show the owner's own menu when it has photos, else the demo
  const menu = real && real.items.length >= 2 ? real : DEMO;
  const preview = useMemo(
    () => ({
      name: data.business.name,
      tagline: s.tagline,
      logo: s.logo?.url || "",
      cover: s.cover?.url || "",
      contact: s.contact,
      hours: s.hours,
      currency: s.currency,
      khr_rate: s.khr_rate,
      show_both: s.show_both,
      lang: s.lang,
      color,
      promos: [],
      feedback: false,
      ...menu,
    }),
    [data.business.name, s, color, menu],
  );
  const ONE_ROW = ["rows", "list", "board", "banner", "split", "ticket", "line"];
  const list = MQ_THEME_KEYS.filter((k) => show === "all" || (show === "mine" ? owned.includes(k) : show === "row" ? ONE_ROW.includes(MQ_THEMES[k].layout) : MQ_THEMES[k].t === show));
  useEffect(() => loadThemeFonts(list.map((k) => MQ_THEMES[k].hf)), [show]); // eslint-disable-line react-hooks/exhaustive-deps
  const use = async (k) => {
    setBusy(k);
    try {
      const r = await menuQrService.save(id, { theme: k });
      ctx.setSettings(r.data);
      notify({ type: "success", text: m.saved });
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const saveColor = async (c) => {
    setBusy("color");
    try {
      const r = await menuQrService.save(id, { color: c });
      ctx.setSettings(r.data);
      setColor(c);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const t = MQ_THEMES[sel];
  return (
    <div className="rs-col">
      <Head icon={Palette} title={m.looksTitle} sub={m.looksSub} />
      <div className="mq-looks">
        <div className="mq-looks-grid-wrap">
          <div className="rs-addon-filter mq-filter" role="tablist">
            {["all", "mine", "row", "free", "basic", "pro"].map((k) => (
              <button key={k} type="button" role="tab" aria-selected={show === k} className={show === k ? "on" : ""} onClick={() => setShow(k)}>
                {m[k]} {k === "mine" ? `(${owned.length})` : ""}
              </button>
            ))}
          </div>
          <div className="mq-looks-grid">
            {list.map((k) => {
              const th = MQ_THEMES[k];
              const mine = owned.includes(k);
              return (
                <button key={k} type="button" className={`mq-look ${sel === k ? "sel" : ""} ${s.theme === k ? "using" : ""}`} onClick={() => setSel(k)} data-testid={`mq-look-${k}`}>
                  <Mock k={k} color={s.theme === k ? color : ""} name={data.business.name} locked={!mine} />
                  <span className="mq-look-foot">
                    <b>{themeLabel(k, lang)}</b>
                    <small>
                      {s.theme === k ? (
                        <em className="mq-using">{m.inUse}</em>
                      ) : mine ? (
                        m.owned
                      ) : th.t === "free" ? (
                        m.free
                      ) : (
                        <>
                          <CoinIcon size={12} /> {fmt(data.themes.price[th.t])}
                        </>
                      )}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <aside className="panel-card mq-looks-side">
          <div className="mq-phone">
            <div className="mq-phone-screen">
              <MenuView data={preview} theme={sel} preview lang={lang} key={sel} />
            </div>
          </div>
          <div className="mq-looks-info">
            <b>{themeLabel(sel, lang)}</b>
            <small className="rs-muted">
              {themeDesc(sel, lang)} · {m[t.t]}
            </small>
            {s.theme === sel ? (
              <span className="rs-pill on">
                <Check size={13} /> {m.inUse}
              </span>
            ) : owned.includes(sel) ? (
              <button type="button" className="md-btn md-btn-primary" onClick={() => use(sel)} disabled={readOnly || !!busy} data-testid="mq-look-use">
                {busy === sel ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {m.use}
              </button>
            ) : (
              <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ theme: sel, tier: t.t })} disabled={readOnly} data-testid="mq-look-buy">
                <CoinIcon size={15} /> {m.buy.replace("{coins}", fmt(data.themes.price[t.t]))}
              </button>
            )}
            <div className="mq-colour">
              <small className="rs-muted">{m.yourColour}</small>
              <input type="color" value={color || t.accent} onChange={(e) => setColor(e.target.value)} onBlur={(e) => e.target.value !== (s.color || "") && saveColor(e.target.value)} disabled={readOnly} aria-label={m.yourColour} />
              {color && (
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => saveColor("")} disabled={readOnly || busy === "color"}>
                  {busy === "color" ? <Loader2 size={13} className="md-spin" /> : <RotateCcw size={13} />} {m.themeColour}
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// small picture of a look (same classes as the real page)
function Mock({ k, color, name, locked }) {
  const th = MQ_THEMES[k];
  const photo = th.layout !== "compact" && th.layout !== "board";
  return (
    <span className={`qm qm-preview mq-mock ${themeClass(k)}`} style={themeVars(k, color)} aria-hidden="true">
      <span className="mq-mock-head">
        <i className="mq-mock-logo" />
        <b>{name}</b>
      </span>
      <span className="mq-mock-tabs">
        <i className="on" />
        <i />
        <i />
      </span>
      <span className={`mq-mock-items l-${th.layout}`}>
        {[0, 1, 2, 3].map((n) => (
          <span key={n} className="mq-mock-item">
            {photo && <i className="mq-mock-pic" style={{ background: ["#f3d9b1", "#fecaca", "#bbf7d0", "#fde68a"][n] }} />}
            <span className="mq-mock-lines">
              <i />
              <em />
            </span>
          </span>
        ))}
      </span>
      {locked && <Lock size={11} className="mq-mock-lock" />}
    </span>
  );
}
