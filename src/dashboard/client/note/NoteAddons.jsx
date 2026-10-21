import { useState } from "react";
import { BellRing, CalendarClock, Check, CheckCheck, FileDown, FileSpreadsheet, FolderPlus, Folders, HardDrive, ImagePlus, Images, Link2, Mic, Minus, Palette, Plus, Puzzle, Settings, Signature, StickyNote, Type } from "lucide-react";
import { V4Stage } from "./NoteV4";
import { NOTE_THEMES, isFreeTheme } from "../../../note/themes";
import { StylePackStage, ThemeMini, ThemeShop } from "./NoteLook";
import { LinkStage } from "./LinkField";
import CoinIcon from "../../../components/CoinIcon";
import { Head } from "../menuqr/parts";
import DrawPad from "../../../note/DrawPad";
import { StorageBar } from "./NoteParts";
import { bytes, fmt, fmtDate } from "./text";

export const GB5 = 5 * 1073741824;
const V4_CARDS = [
  ["note_telegram", "tg", BellRing],
  ["note_ack", "ack", CheckCheck],
  ["note_form", "fx", FileSpreadsheet],
  ["note_voice", "voice", Mic],
  ["note_pdf", "pdf", FileDown],
];
// the +5 GB packs (yearly slots), newest number last
export const packsOf = (data) =>
  [...(Array.isArray(data?.storage_slots) ? data.storage_slots : [])].sort((a, b) => (Number(String(a.item).split("-")[1]) || 0) - (Number(String(b.item).split("-")[1]) || 0));
export const packNo = (p, i) => Number(String(p?.item || "").split("-")[1]) || i + 1;

// - 1 + stepper
export function Stepper({ value, onChange, min = 1, max = 40, label }) {
  return (
    <div className="nt-step" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="−">
        <Minus size={15} />
      </button>
      <b aria-live="polite">{value}</b>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="+">
        <Plus size={15} />
      </button>
    </div>
  );
}

// Add-ons: +5 GB storage packs · note groups · Signature & pen · the yearly plan
export function AddonsTab({ ctx }) {
  const { m, lang, data } = ctx;
  const [n, setN] = useState(1);
  const [trying, setTrying] = useState(false);
  const [shop, setShop] = useState(false);
  const style = !!data.addons?.note_style?.active;
  const media = !!data.addons?.note_media?.active;
  const link = !!ctx.owns?.link;
  const icons = (data.addons?.note_group_icon?.items || []).length;
  const paidThemes = NOTE_THEMES.filter((t) => !isFreeTheme(t.key));
  const ownedThemes = (data.themes?.owned || []).filter((k) => !isFreeTheme(k)).length;
  const lic = data.license || {};
  const packs = packsOf(data);
  const active = packs.filter((p) => p.active);
  const sign = !!data.addons?.note_sign?.active;
  const groups = data.counts?.groups ?? data.addons?.note_group?.owned ?? 0;
  const off = ctx.readOnly;
  const P = ctx.prices;

  return (
    <div className="rs-col nt-addons-page">
      <Head icon={Puzzle} title={m.addonsTitle} sub={m.addonsSub} />
      <div className="rs-addons nt-addons">
        {/* ---------- storage packs ---------- */}
        <article className={`panel-card rs-addon nt-addon-wide s-${active.length ? "active" : "none"}`} data-testid="nt-addon-storage">
          <div className="rs-addon-top">
            <span className="rs-addon-ic nt-ic-storage">
              <HardDrive size={20} />
            </span>
            <div>
              <h3>{m.packsTitle}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(P.note_storage)} {m.coins} {m.perPack}
              </span>
            </div>
          </div>
          <p>{m.packsWhat}</p>
          <StorageBar book={data.book} m={m} />
          <small className="rs-muted">{m.included}</small>
          <div className="nt-packs-buy">
            <span className="nt-packs-label">{m.packs}</span>
            <Stepper value={n} onChange={setN} max={20} label={m.packs} />
            <span className="nt-packs-gb">+{n * 5} GB</span>
            <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ kind: "packs", n })} disabled={off} data-testid="nt-buy-packs">
              <CoinIcon size={15} /> {m.packsAdd.replace("{gb}", n * 5).replace("{coins}", fmt(n * P.note_storage))}
            </button>
          </div>
          <div className="nt-packs">
            <b className="nt-packs-h">{m.packsOwned}</b>
            {packs.length === 0 && <p className="rs-muted nt-packs-none">{m.packsNone}</p>}
            {packs.map((p, i) => (
              <div key={p.item || i} className={`nt-pack ${p.active ? "on" : "end"}`}>
                <span className="nt-pack-ic">
                  <HardDrive size={15} />
                </span>
                <span className="nt-pack-text">
                  <b>{m.packLine.replace("{n}", packNo(p, i))}</b>
                  <small>
                    <CalendarClock size={12} /> {(p.active ? m.packUntil : m.packEnded).replace("{date}", fmtDate(p.expires_at, lang))}
                  </small>
                </span>
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ kind: "pack", item: p.item, no: packNo(p, i), expires_at: p.expires_at })} disabled={off}>
                  {m.packRenew.replace("{coins}", fmt(P.note_storage))}
                </button>
              </div>
            ))}
          </div>
        </article>

        {/* ---------- groups ---------- */}
        <article className={`panel-card rs-addon s-${groups ? "active" : "none"}`} data-testid="nt-addon-groups">
          <div className="rs-addon-top">
            <span className="rs-addon-ic nt-ic-group">
              <Folders size={20} />
            </span>
            <div>
              <h3>{m.groupsCard}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(P.note_group)} {m.coins} {m.perGroup}
              </span>
            </div>
          </div>
          <p>{m.groupsWhat}</p>
          <div className="rs-addon-foot">
            <span className={`rs-pill ${groups ? "on" : ""}`}>{groups ? m.groupsOwned.replace("{n}", fmt(groups)) : m.groupsNone}</span>
            <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.go("groups", { new: "1" })} disabled={off}>
              <FolderPlus size={15} /> {m.createGroup}
            </button>
          </div>
        </article>

        {/* ---------- signature & pen ---------- */}
        <article className={`panel-card rs-addon s-${sign ? "forever" : "none"}`} data-testid="nt-addon-sign">
          <div className="rs-addon-top">
            <span className="rs-addon-ic nt-ic-sign">
              <Signature size={20} />
            </span>
            <div>
              <h3>{m.signCard}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(P.note_sign)} {m.coins} · {m.oneTimeForever}
              </span>
            </div>
          </div>
          <p>{m.signWhat}</p>
          <button type="button" className="nt-sign-preview" onClick={() => setTrying(true)} aria-label={m.signTry}>
            <svg viewBox="0 0 300 70" aria-hidden="true">
              <path d="M18 48c14-26 26-34 30-24 4 12-14 30-8 32 8 2 20-30 30-28 8 2 0 24 8 24 10 0 16-22 26-22 8 0 4 18 12 18 12 0 18-14 30-14 10 0 6 12 16 12 14 0 22-10 40-12" />
              <line x1="14" y1="60" x2="286" y2="60" />
            </svg>
            <span>{m.signTry}</span>
          </button>
          <div className="rs-addon-foot">
            {sign ? (
              <span className="rs-pill on">
                <Check size={13} /> {m.unlocked}
              </span>
            ) : (
              <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy("note_sign")} disabled={off} data-testid="nt-buy-sign">
                <CoinIcon size={14} /> {m.signUnlock.replace("{coins}", fmt(P.note_sign))}
              </button>
            )}
          </div>
        </article>

        {/* ---------- style pack ---------- */}
        <article className={`panel-card rs-addon s-${style ? "forever" : "none"}`} data-testid="nt-addon-style">
          <div className="rs-addon-top">
            <span className="rs-addon-ic nt-ic-style">
              <Type size={20} />
            </span>
            <div>
              <h3>{m.styleCard}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(P.note_style)} {m.coins} · {m.oneTimeForever}
              </span>
            </div>
          </div>
          <p>{m.styleWhat}</p>
          <div className="nt-addon-art">
            <StylePackStage m={m} />
          </div>
          <div className="rs-addon-foot">
            {style ? (
              <span className="rs-pill on">
                <Check size={13} /> {m.unlocked}
              </span>
            ) : (
              <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy("note_style")} disabled={off} data-testid="nt-buy-style">
                <CoinIcon size={14} /> {m.styleUnlock.replace("{coins}", fmt(P.note_style))}
              </button>
            )}
          </div>
        </article>

        {/* ---------- page themes ---------- */}
        <article className={`panel-card rs-addon nt-addon-wide s-${ownedThemes ? "active" : "none"}`} data-testid="nt-addon-themes">
          <div className="rs-addon-top">
            <span className="rs-addon-ic nt-ic-theme">
              <Palette size={20} />
            </span>
            <div>
              <h3>{m.themesCard}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(P.note_theme)} {m.coins} {m.themesPrice}
              </span>
            </div>
          </div>
          <p>{m.themesWhat}</p>
          <button type="button" className="nt-themes-strip" onClick={() => setShop(true)} aria-label={m.themesOpen}>
            {["chalk", "temple", "neon", "wedding", "sunset", "blueprint"].map((k) => (
              <span key={k} className="nt-themes-strip-item">
                <ThemeMini theme={{ key: k }} m={m} />
              </span>
            ))}
          </button>
          <div className="rs-addon-foot">
            <span className={`rs-pill ${ownedThemes ? "on" : ""}`}>{m.themesOwned.replace("{n}", fmt(ownedThemes)).replace("{total}", fmt(paidThemes.length))}</span>
            <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setShop(true)} data-testid="nt-open-themes">
              <Palette size={14} /> {m.themesOpen}
            </button>
          </div>
        </article>

        {/* ---------- media manager ---------- */}
        <article className={`panel-card rs-addon s-${media ? "forever" : "none"}`} data-testid="nt-addon-media">
          <div className="rs-addon-top">
            <span className="rs-addon-ic nt-ic-media">
              <Images size={20} />
            </span>
            <div>
              <h3>{m.mediaCard}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(P.note_media)} {m.coins} · {m.oneTimeForever}
              </span>
            </div>
          </div>
          <p>{m.mediaWhat}</p>
          <div className="rs-addon-foot">
            {media ? (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("media")}>
                <Check size={13} /> {m.tabs.media}
              </button>
            ) : (
              <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy("note_media")} disabled={off} data-testid="nt-buy-media">
                <CoinIcon size={14} /> {m.mediaUnlock.replace("{coins}", fmt(P.note_media))}
              </button>
            )}
          </div>
        </article>

        {/* ---------- v4: Telegram alerts (yearly) · I've read it · sign-up form + Excel · voice notes · PDF ---------- */}
        {V4_CARDS.map(([key, k, Icon]) => {
          const a = data.addons?.[key] || {};
          const on = !!a.active;
          const yearly = key === "note_telegram";
          return (
            <article key={key} className={`panel-card rs-addon s-${on ? (yearly ? "active" : "forever") : "none"}`} data-testid={`nt-addon-${k}`}>
              <div className="rs-addon-top">
                <span className={`rs-addon-ic nt-ic-${k}`}>
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{m[`${k}Card`]}</h3>
                  <span className="rs-addon-price">
                    <CoinIcon size={13} /> {fmt(P[key])} {m.coins} {yearly ? m.perYearPlan : `· ${m.oneTimeForever}`}
                  </span>
                </div>
              </div>
              <p>{m[`${k}What`]}</p>
              <div className="nt-addon-art v4-addon-art">
                <V4Stage kind={key} m={m} />
              </div>
              <div className="rs-addon-foot">
                {on ? (
                  <>
                    <span className="rs-pill on">
                      {yearly && a.expires_at ? (
                        <>
                          <CalendarClock size={12} /> {m.planActive.replace("{date}", fmtDate(a.expires_at, lang))}
                        </>
                      ) : (
                        <>
                          <Check size={13} /> {m.unlocked}
                        </>
                      )}
                    </span>
                    {yearly && (
                      <>
                        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("alerts")}>
                          <Settings size={14} /> {m.tgSettings}
                        </button>
                        <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy(key)} disabled={off}>
                          {m.renew.replace("{coins}", fmt(P[key]))}
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy(key)} disabled={off} data-testid={`nt-buy-${k}`}>
                    <CoinIcon size={14} /> {m.v4Unlock.replace("{coins}", fmt(P[key]))}
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {/* ---------- custom links ---------- */}
        <article className={`panel-card rs-addon s-${link ? "forever" : "none"}`} data-testid="nt-addon-link">
          <div className="rs-addon-top">
            <span className="rs-addon-ic nt-ic-link">
              <Link2 size={20} />
            </span>
            <div>
              <h3>{m.linkCard}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(P.note_link)} {m.coins} · {m.oneTimeForever}
              </span>
            </div>
          </div>
          <p>{m.linkWhat}</p>
          <div className="nt-addon-art">
            <LinkStage m={m} name={data.business?.name || ""} />
          </div>
          <div className="rs-addon-foot">
            {link ? (
              <>
                <span className="rs-pill on">
                  <Check size={13} /> {m.linkOwnedPill}
                </span>
                <small className="rs-hint">{m.linkOpen}</small>
              </>
            ) : (
              <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy("note_link")} disabled={off} data-testid="nt-buy-link-card">
                <CoinIcon size={14} /> {m.linkUnlock.replace("{coins}", fmt(P.note_link))}
              </button>
            )}
          </div>
        </article>

        {/* ---------- group pictures ---------- */}
        <article className={`panel-card rs-addon s-${icons ? "active" : "none"}`} data-testid="nt-addon-groupicon">
          <div className="rs-addon-top">
            <span className="rs-addon-ic nt-ic-group">
              <ImagePlus size={20} />
            </span>
            <div>
              <h3>{m.groupIconCard}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(P.note_group_icon)} {m.coins} {m.groupIconPrice}
              </span>
            </div>
          </div>
          <p>{m.groupIconWhat}</p>
          <div className="rs-addon-foot">
            <span className={`rs-pill ${icons ? "on" : ""}`}>{icons ? m.groupsOwned.replace("{n}", fmt(icons)) : m.groupsNone}</span>
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("groups")}>
              <Folders size={14} /> {m.tabs.groups}
            </button>
          </div>
        </article>

        {/* ---------- the plan ---------- */}
        <article className={`panel-card rs-addon s-${lic.active ? "active" : "none"}`}>
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <StickyNote size={20} />
            </span>
            <div>
              <h3>{m.planCard}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(P.digital_note)} {m.coins} {m.perYearPlan}
              </span>
            </div>
          </div>
          <p>{m.planWhat}</p>
          <div className="rs-addon-foot">
            {lic.expires_at && (
              <span className={`rs-pill ${lic.active ? "on" : "bad"}`}>
                <CalendarClock size={12} /> {(lic.active ? m.planActive : m.planEnded).replace("{date}", fmtDate(lic.expires_at, lang))}
              </span>
            )}
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy("digital_note")} disabled={ctx.suspended}>
              {m.renew.replace("{coins}", fmt(P.digital_note))}
            </button>
          </div>
        </article>
      </div>
      {trying && <DrawPad m={m} onClose={() => setTrying(false)} />}
      {shop && <ThemeShop ctx={ctx} onClose={() => setShop(false)} />}
    </div>
  );
}

// the limit after buying n more packs (for the buy dialog)
export const limitAfter = (book, n) => bytes((book?.storage_limit || GB5) + n * GB5);
