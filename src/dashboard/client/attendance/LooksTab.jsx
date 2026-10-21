import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Crown, ImagePlus, Loader2, Moon, Printer, ScanLine, Smartphone, SunMedium, Trash2 } from "lucide-react";
import { attendanceService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import CoinIcon from "../../../components/CoinIcon";
import { resizeImage } from "../../../lib/image";
import AttQrCard from "../../../attend/AttQrCard";
import { APP_COLORS, APP_LOOKS, KIOSK_COLORS, KIOSK_LOOKS, QR_LOOKS, lookDesc, lookName } from "../../../attend/looks";
import KioskPreview from "../../../attend/KioskPreview";
import AppPreview from "../../../attend/AppPreview";
import { fmtDate, staffLink } from "./text";

const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);
const LT = {
  en: {
    logoTitle: "Company logo",
    logoSub: "Shown in the staff app, on the QR sticker and in your business list.",
    upload: "Upload logo",
    change: "Change",
    remove: "Remove",
    uploading: "Uploading…",
    appTitle: "Staff app look",
    appSub: "Each look has its own layout for the Clock in / Clock out screen on your staff's phones. 1 free, others {coins} coins each — buy once, keep forever.",
    qrTitle: "QR sticker style",
    qrSub: "The sticker you print and put at the door. It shows your logo, work hours and the QR. 1 free, others {coins} coins each — buy once, keep forever.",
    inUse: "In use",
    use: "Use",
    free: "Free",
    owned: "Owned",
    buyFor: "{coins} coins",
    note: "Line on the sticker",
    notePh: "e.g. Clock in before 8:00",
    save: "Save",
    saved: "Saved.",
    print: "Print sticker",
    buyTitle: "Unlock “{name}”",
    buyAppSub: "A new look for your staff's attendance app. Yours forever.",
    buyQrSub: "A new style for your printed staff QR sticker. Yours forever.",
    oneTime: "One time · forever",
    buy: "Buy · {coins} coins",
    done: "“{name}” is now in use.",
    badgeApp: "Staff app look",
    badgeQr: "QR sticker style",
    badgeKiosk: "Door kiosk look",
    kioskTitle: "Door kiosk look",
    kioskSub: "How the tablet at your door looks. 23 layouts: 1 free, others {coins} coins per look per year. Buying again adds another year.",
    buyKioskSub: "A new layout for the tablet at your door, for one year.",
    renewKioskSub: "Keep “{name}” on your door tablet for one more year. The year is added to the end date.",
    renewTitle: "Renew “{name}”",
    renew: "Renew",
    yearly: "1 year · renew any time",
    perYear: "{coins} / year",
    until: "Until {date}",
    ended: "Ended — the tablet shows Classic until you renew.",
    kioskNeed: "The door kiosk itself is an add-on (Door QR kiosk). You can choose a look now; it shows once the kiosk is unlocked.",
    colour: "Colour",
    customColour: "Other",
    colourFree: "Free — works with every look.",
    modeTitle: "Preview",
    light: "Light",
    dark: "Dark",
    modeNote: "Every look has a light and a dark mode. Staff switch with the moon button on their phone (it follows the phone's setting until they choose).",
  },
  km: {
    logoTitle: "ឡូហ្គោក្រុមហ៊ុន",
    logoSub: "បង្ហាញក្នុងកម្មវិធីបុគ្គលិក លើស្ទីកឃ័រ QR និងក្នុងបញ្ជីអាជីវកម្ម។",
    upload: "បញ្ចូលឡូហ្គោ",
    change: "ប្តូរ",
    remove: "លុប",
    uploading: "កំពុងបញ្ចូល…",
    appTitle: "រចនាកម្មវិធីបុគ្គលិក",
    appSub: "រចនានីមួយៗមានប្លង់ផ្ទាល់ខ្លួន សម្រាប់អេក្រង់ ចុះចូល / ចុះចេញ លើទូរស័ព្ទបុគ្គលិក។ ឥតគិតថ្លៃ 1 ផ្សេងទៀត {coins} កាក់ក្នុងមួយ — ទិញម្តង ប្រើជារៀងរហូត។",
    qrTitle: "រចនាស្ទីកឃ័រ QR",
    qrSub: "ស្ទីកឃ័រដែលអ្នកបោះពុម្ព ហើយបិទនៅមាត់ទ្វារ។ មានឡូហ្គោ ម៉ោងធ្វើការ និង QR។ ឥតគិតថ្លៃ 1 ផ្សេងទៀត {coins} កាក់ក្នុងមួយ — ទិញម្តង ប្រើជារៀងរហូត។",
    inUse: "កំពុងប្រើ",
    use: "ប្រើ",
    free: "ឥតគិតថ្លៃ",
    owned: "បានទិញ",
    buyFor: "{coins} កាក់",
    note: "អត្ថបទលើស្ទីកឃ័រ",
    notePh: "ឧ. ចុះចូលមុនម៉ោង 8:00",
    save: "រក្សាទុក",
    saved: "បានរក្សាទុក។",
    print: "បោះពុម្ពស្ទីកឃ័រ",
    buyTitle: "ដោះសោ “{name}”",
    buyAppSub: "រូបរាងថ្មីសម្រាប់កម្មវិធីវត្តមានរបស់បុគ្គលិក។ ជារបស់អ្នករៀងរហូត។",
    buyQrSub: "រចនាថ្មីសម្រាប់ស្ទីកឃ័រ QR បុគ្គលិក។ ជារបស់អ្នករៀងរហូត។",
    oneTime: "បង់ម្តង · ជារៀងរហូត",
    buy: "ទិញ · {coins} កាក់",
    done: "“{name}” កំពុងប្រើហើយ។",
    badgeApp: "រចនាកម្មវិធីបុគ្គលិក",
    badgeQr: "រចនាស្ទីកឃ័រ QR",
    badgeKiosk: "រចនា QR មាត់ទ្វារ",
    kioskTitle: "រចនា QR មាត់ទ្វារ",
    kioskSub: "រូបរាងថេប្លេតនៅមាត់ទ្វាររបស់អ្នក។ ប្លង់ 23៖ ឥតគិតថ្លៃ 1 ផ្សេងទៀត {coins} កាក់ក្នុងមួយ ក្នុងមួយឆ្នាំ។ ទិញម្តងទៀត បន្ថែមមួយឆ្នាំទៀត។",
    buyKioskSub: "ប្លង់ថ្មីសម្រាប់ថេប្លេតនៅមាត់ទ្វារ រយៈពេលមួយឆ្នាំ។",
    renewKioskSub: "រក្សា “{name}” លើថេប្លេតមាត់ទ្វារមួយឆ្នាំទៀត។ មួយឆ្នាំបន្ថែមពីថ្ងៃផុតកំណត់។",
    renewTitle: "បន្ត “{name}”",
    renew: "បន្ត",
    yearly: "1 ឆ្នាំ · បន្តពេលណាក៏បាន",
    perYear: "{coins} / ឆ្នាំ",
    until: "ដល់ {date}",
    ended: "ផុតកំណត់ — ថេប្លេតបង្ហាញ បុរាណ រហូតដល់អ្នកបន្ត។",
    kioskNeed: "QR មាត់ទ្វារ ខ្លួនវាជាមុខងារបន្ថែម។ អ្នកអាចជ្រើសរចនាឥឡូវ វានឹងបង្ហាញពេលដោះសោ QR មាត់ទ្វារ។",
    colour: "ពណ៌",
    customColour: "ផ្សេងទៀត",
    colourFree: "ឥតគិតថ្លៃ — ប្រើបានជាមួយរចនាទាំងអស់។",
    modeTitle: "មើលជាមុន",
    light: "ភ្លឺ",
    dark: "ងងឹត",
    modeNote: "រចនានីមួយៗមានពណ៌ភ្លឺ និងពណ៌ងងឹត។ បុគ្គលិកប្តូរដោយប៊ូតុងព្រះច័ន្ទលើទូរស័ព្ទ (តាមការកំណត់ទូរស័ព្ទ រហូតដល់គេជ្រើសរើស)។",
  },
};

// work hours shown on the sticker (active shifts, up to 3)
export const hoursOf = (shifts) =>
  (shifts || [])
    .filter((s) => s.active)
    .slice(0, 3)
    .map((s) => `${s.name} ${s.start}–${s.end}`);

export const qrImage = (text, width = 600) => import("qrcode").then((m) => (m.default || m).toDataURL(text, { width, margin: 1, errorCorrectionLevel: "M" }));

// the sticker drawn small: scaled with CSS, height measured so the card around it fits
export function StickerPreview({ scale = 0.5, ...props }) {
  const ref = useRef(null);
  const [h, setH] = useState(150 * 3.78 * scale);
  useLayoutEffect(() => {
    const el = ref.current?.firstChild;
    if (el) setH(el.offsetHeight * scale);
  });
  return (
    <div className="at-qr-mini" style={{ height: h, width: `calc(100mm * ${scale})` }}>
      <div ref={ref} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: "100mm" }}>
        <AttQrCard {...props} />
      </div>
    </div>
  );
}

// print just the sticker (the rest of the page is hidden while printing)
export function PrintSticker({ props, onDone }) {
  useEffect(() => {
    document.body.classList.add("at-printing");
    const done = () => onDone();
    const t = setTimeout(() => window.print(), 400);
    window.addEventListener("afterprint", done);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", done);
      document.body.classList.remove("at-printing");
    };
  }, [onDone]);
  return createPortal(
    <div className="at-print-root">
      <AttQrCard {...props} />
    </div>,
    document.body,
  );
}

export default function LooksTab({ ctx, only = "" }) {
  const { lang, data, readOnly } = ctx;
  const x = LT[lang] || LT.en;
  const [looks, setLooks] = useState(null);
  const [qr, setQr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [buying, setBuying] = useState(null); // { kind, theme }
  const [printing, setPrinting] = useState(false);
  const [darkPreview, setDarkPreview] = useState(false);
  const fileRef = useRef(null);
  const logo = data.business.logo_url;

  useEffect(() => {
    attendanceService
      .looks(ctx.id)
      .then((r) => {
        setLooks(r.data);
        setNote(r.data.qr_note || "");
      })
      .catch((e) => ctx.notify({ type: "error", text: e.message }));
  }, [ctx.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    qrImage(staffLink(data.code))
      .then(setQr)
      .catch(() => {});
  }, [data.code]);

  const use = async (kind, theme) => {
    setBusy(`${kind}:${theme}`);
    try {
      const r = await attendanceService.saveLooks(ctx.id, { [kind]: theme });
      setLooks(r.data);
      ctx.reload();
    } catch (e) {
      if (e.status === 402) setBuying({ kind, theme });
      else ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  // colour: free; shown at once, saved a moment later (the picker fires many changes while dragging)
  const colorTimer = useRef(null);
  const setColor = (c, slow, key = "app_color") => {
    setLooks((l) => ({ ...l, [key]: c }));
    clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(
      () =>
        attendanceService
          .saveLooks(ctx.id, { [key]: c })
          .then(() => ctx.reload())
          .catch((e) => ctx.notify({ type: "error", text: e.message })),
      slow ? 600 : 0,
    );
  };
  const saveNote = async () => {
    setBusy("note");
    try {
      const r = await attendanceService.saveLooks(ctx.id, { qr_note: note });
      setLooks(r.data);
      ctx.reload();
      ctx.notify({ type: "success", text: x.saved });
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const pickLogo = async (file) => {
    setBusy("logo");
    try {
      await attendanceService.uploadLogo(ctx.id, await resizeImage(file, 600));
      await ctx.reload();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const removeLogo = async () => {
    setBusy("logo");
    try {
      await attendanceService.removeLogo(ctx.id);
      await ctx.reload();
    } catch (e) {
      ctx.notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };

  if (!looks) return <ListSkeleton rows={4} />;
  const sticker = { logo, name: data.business.name, qr, hours: hoursOf(data.shifts), note: looks.qr_note };

  const grid = (kind) => {
    const info = looks[kind];
    const list = kind === "app" ? APP_LOOKS : kind === "kiosk" ? KIOSK_LOOKS : QR_LOOKS;
    return (
      <div className={`at-looks ${kind}`}>
        {info.list.map((key) => {
          const current = info.current === key;
          const own = key === info.free || info.owned.includes(key);
          const until = info.yearly && key !== info.free ? info.until?.[key] : null;
          const ended = current && !own; // a yearly look that ran out
          const b = busy === `${kind}:${key}`;
          return (
            <div key={key} className={`at-look ${current ? "on" : ""}`}>
              <button type="button" className="at-look-pic" onClick={() => (own ? !current && use(kind, key) : setBuying({ kind, theme: key }))} disabled={readOnly || b} aria-label={lookName(list, key, lang)}>
                {kind === "app" ? (
                  <AppPreview theme={key} color={looks.app_color} lang={lang} business={data.business} scale={0.4} dark={darkPreview} />
                ) : kind === "kiosk" ? (
                  <KioskPreview theme={key} color={looks.kiosk_color} lang={lang} business={data.business} qr={qr} scale={0.19} />
                ) : (
                  <StickerPreview scale={0.42} theme={key} {...sticker} />
                )}
                {current && (
                  <span className="at-look-check">
                    <Check size={14} />
                  </span>
                )}
              </button>
              <div className="at-look-text">
                <b>
                  {lookName(list, key, lang)}
                  {key !== info.free && !own && <Crown size={13} className="at-crown" />}
                </b>
                <small>{lookDesc(list, key, lang)}</small>
              </div>
              <div className="at-look-act">
                {ended ? (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuying({ kind, theme: key, renew: true })} disabled={readOnly}>
                    <CoinIcon size={14} /> {x.renew} · {fmt(info.price)}
                  </button>
                ) : current ? (
                  <span className="at-look-tag on">
                    <Check size={13} /> {x.inUse}
                  </span>
                ) : own ? (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => use(kind, key)} disabled={readOnly || b}>
                    {b ? <Loader2 size={14} className="md-spin" /> : null} {x.use}
                  </button>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setBuying({ kind, theme: key })} disabled={readOnly}>
                    <CoinIcon size={14} /> {info.yearly ? x.perYear.replace("{coins}", fmt(info.price)) : x.buyFor.replace("{coins}", fmt(info.price))}
                  </button>
                )}
                {!current && own && !until && <small className="at-look-own">{key === info.free ? x.free : x.owned}</small>}
                {until && (
                  <small className="at-look-own">
                    {x.until.replace("{date}", fmtDate(until, lang))} ·{" "}
                    <button type="button" className="at-link" onClick={() => setBuying({ kind, theme: key, renew: true })} disabled={readOnly}>
                      {x.renew}
                    </button>
                  </small>
                )}
                {ended && <small className="at-look-ended">{x.ended}</small>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const buyList = buying?.kind === "app" ? APP_LOOKS : buying?.kind === "kiosk" ? KIOSK_LOOKS : QR_LOOKS;
  const buyName = buying ? lookName(buyList, buying.theme, lang) : "";
  const buyPrice = buying ? looks[buying.kind].price : 0;

  return (
    <div className="rs-col">
      {only !== "kiosk" && (
        <>
          <section className="panel-card at-logo-card">
            <span className="at-logo-thumb">{logo ? <img src={logo} alt="" /> : <ImagePlus size={24} />}</span>
            <div className="at-logo-text">
              <h2>{x.logoTitle}</h2>
              <small className="rs-muted">{x.logoSub}</small>
              <div className="at-logo-btns">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) pickLogo(f);
                  }}
                />
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => fileRef.current?.click()} disabled={readOnly || busy === "logo"}>
                  {busy === "logo" ? <Loader2 size={15} className="md-spin" /> : <ImagePlus size={15} />} {busy === "logo" ? x.uploading : logo ? x.change : x.upload}
                </button>
                {logo && (
                  <button type="button" className="md-btn md-btn-ghost sa-danger-text sa-btn-sm" onClick={removeLogo} disabled={readOnly || busy === "logo"}>
                    <Trash2 size={15} /> {x.remove}
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="panel-card">
            <h2 className="at-h2">
              <Smartphone size={19} /> {x.appTitle}
            </h2>
            <p className="rs-muted" style={{ margin: "4px 0 14px" }}>
              {x.appSub.replace("{coins}", fmt(looks.app.price))}
            </p>
            <div className="at-colors-row">
              <b>{x.colour}</b>
              <div className="at-colors">
                {APP_COLORS.map((c) => (
                  <button key={c} type="button" className={looks.app_color === c ? "on" : ""} style={{ background: c }} onClick={() => setColor(c)} disabled={readOnly} aria-label={c}>
                    {looks.app_color === c && <Check size={14} />}
                  </button>
                ))}
                <label className="at-color-custom">
                  <input type="color" value={looks.app_color} onChange={(e) => setColor(e.target.value.toUpperCase(), true)} disabled={readOnly} />
                  <span>{x.customColour}</span>
                </label>
              </div>
              <small className="rs-muted">{x.colourFree}</small>
              <span className="at-grow" />
              <div className="at-seg small" role="group" aria-label={x.modeTitle}>
                <button type="button" className={!darkPreview ? "on" : ""} onClick={() => setDarkPreview(false)}>
                  <SunMedium size={14} /> {x.light}
                </button>
                <button type="button" className={darkPreview ? "on" : ""} onClick={() => setDarkPreview(true)}>
                  <Moon size={14} /> {x.dark}
                </button>
              </div>
            </div>
            <p className="rs-muted at-mode-note">{x.modeNote}</p>
            {grid("app")}
          </section>

          <section className="panel-card">
            <div className="pe-list-head">
              <div>
                <h2 className="at-h2">
                  <Printer size={19} /> {x.qrTitle}
                </h2>
              </div>
              <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={() => setPrinting(true)} disabled={!qr}>
                <Printer size={15} /> {x.print}
              </button>
            </div>
            <p className="rs-muted" style={{ margin: "4px 0 12px" }}>
              {x.qrSub.replace("{coins}", fmt(looks.qr.price))}
            </p>
            <div className="at-note-row">
              <label htmlFor="aq-note">{x.note}</label>
              <input id="aq-note" maxLength={80} placeholder={x.notePh} value={note} onChange={(e) => setNote(e.target.value)} disabled={readOnly} />
              {note !== (looks.qr_note || "") && (
                <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={saveNote} disabled={busy === "note"}>
                  {x.save}
                </button>
              )}
            </div>
            {grid("qr")}
          </section>
        </>
      )}
      {only === "kiosk" && (
        <section className="panel-card">
          <h2 className="at-h2">
            <ScanLine size={19} /> {x.kioskTitle}
          </h2>
          <p className="rs-muted" style={{ margin: "4px 0 14px" }}>
            {x.kioskSub.replace("{coins}", fmt(looks.kiosk.price))}
          </p>
          <div className="at-colors-row">
            <b>{x.colour}</b>
            <div className="at-colors">
              {KIOSK_COLORS.map((c) => (
                <button key={c} type="button" className={looks.kiosk_color === c ? "on" : ""} style={{ background: c }} onClick={() => setColor(c, false, "kiosk_color")} disabled={readOnly} aria-label={c}>
                  {looks.kiosk_color === c && <Check size={14} />}
                </button>
              ))}
              <label className="at-color-custom">
                <input type="color" value={looks.kiosk_color} onChange={(e) => setColor(e.target.value.toUpperCase(), true, "kiosk_color")} disabled={readOnly} />
                <span>{x.customColour}</span>
              </label>
            </div>
            <small className="rs-muted">{x.colourFree}</small>
          </div>
          {!data.addons?.att_kiosk?.active && <p className="at-warn-line">{x.kioskNeed}</p>}
          {grid("kiosk")}
        </section>
      )}
      {printing && <PrintSticker props={{ ...sticker, theme: looks.qr.current }} onDone={() => setPrinting(false)} />}

      {buying && (
        <PurchaseModal
          stage={
            <div className="rs-stage at-buy-stage">
              {buying.kind === "app" ? (
                <AppPreview theme={buying.theme} color={looks.app_color} lang={lang} business={data.business} scale={0.36} dark={darkPreview} />
              ) : buying.kind === "kiosk" ? (
                <KioskPreview theme={buying.theme} color={looks.kiosk_color} lang={lang} business={data.business} qr={qr} scale={0.2} />
              ) : (
                <StickerPreview scale={0.36} theme={buying.theme} {...sticker} />
              )}
              <b>{buyName}</b>
            </div>
          }
          badge={buying.kind === "app" ? x.badgeApp : buying.kind === "kiosk" ? x.badgeKiosk : x.badgeQr}
          title={(buying.renew ? x.renewTitle : x.buyTitle).replace("{name}", buyName)}
          sub={buying.renew ? x.renewKioskSub.replace("{name}", buyName) : buying.kind === "app" ? x.buyAppSub : buying.kind === "kiosk" ? x.buyKioskSub : x.buyQrSub}
          perks={[lookDesc(buyList, buying.theme, lang), looks[buying.kind].yearly ? x.yearly : x.oneTime]}
          price={buyPrice}
          buyLabel={buying.renew ? `${x.renew} · ${x.buyFor.replace("{coins}", fmt(buyPrice))}` : x.buy.replace("{coins}", fmt(buyPrice))}
          buy={async () => {
            const r = await attendanceService.buyLook(ctx.id, buying.kind, buying.theme);
            setLooks(r.data);
            return r;
          }}
          doneSub={x.done.replace("{name}", buyName)}
          onDone={(r) => {
            if (!r)
              attendanceService
                .saveLooks(ctx.id, { [buying.kind]: buying.theme })
                .then((res) => setLooks(res.data))
                .catch(() => {});
            ctx.reload();
          }}
          onClose={() => setBuying(null)}
        />
      )}
    </div>
  );
}
