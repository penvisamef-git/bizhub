import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BedDouble, BookOpen, CalendarClock, Camera, Check, Fingerprint, Globe, IdCard, Infinity as Forever, NotebookPen, Plus, StickyNote, QrCode, ScanLine, Search, Send, ShoppingBasket, Stamp, Ticket, Trash2, UtensilsCrossed, X } from "lucide-react";
import { myBusinessService, stampApi } from "../../api/services";
import { useI18n } from "../../i18n/I18nProvider";
import { CATEGORY_KEYS, useSaText } from "../super_admin/text";

import { Modal } from "../super_admin/parts";
import CoinIcon from "../../components/CoinIcon";
import { auth } from "../../lib/auth";
import { coinsChanged } from "../../lib/events";
import { BIZ_GROUP_MORE, BIZ_INFO, BIZ_INFO_WORDS } from "./bizTypeInfo";
import useHomepageData from "../../homepage/useHomepageData";
import { typeOf } from "../../homepage/content";
import BizTypeScene from "./BizTypeScene";
import "./client.css";
import { usePayConfirm } from "../../components/purchase/PayConfirm";

const TYPE_ICONS = { namecard: IdCard, menu_qr: QrCode, flipbook: BookOpen, qr_gen: ScanLine, website: Globe, debt_book: NotebookPen, digital_note: StickyNote, stamp_card: Stamp, event: Ticket, restaurant: UtensilsCrossed, attendance: Fingerprint, guest_house: BedDouble, mart: ShoppingBasket, tg_store: Send };
const fmt = (n) => new Intl.NumberFormat("en-US").format(Number(n) || 0);

// Create or edit one of my businesses
export default function BusinessModal({ business, onClose, onSaved }) {
  const { t, lang } = useI18n();
  const info = BIZ_INFO[lang] || BIZ_INFO.en;
  const w = BIZ_INFO_WORDS[lang] || BIZ_INFO_WORDS.en;
  const { s } = useSaText(); // category + service names
  const editing = !!business;
  const [form, setForm] = useState({
    name: business?.name || "",
    category: CATEGORY_KEYS.includes(business?.category) ? business.category : "namecard",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState(""); // the name, typed again to delete for good
  const [prices, setPrices] = useState(null);
  const [days, setDays] = useState({}); // { restaurant: 365 } = paid per year
  const [noCoins, setNoCoins] = useState(false);
  const [logo, setLogo] = useState(null); // stamp card: { file, url } (shown on the card + the dashboard)
  const withLogo = form.category === "stamp_card";
  const logoText = lang === "km" ? { title: "ឡូហ្គោហាង", hint: "បង្ហាញលើកាត និងផ្ទាំងគ្រប់គ្រង", pick: "ជ្រើសរូប", change: "ប្តូរ", big: "រូបធំពេក (អតិបរមា 5MB)" } : { title: "Shop logo", hint: "Shown on the card and on your dashboard", pick: "Choose picture", change: "Change", big: "Picture is too big (max 5MB)" };
  const pickLogo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError(logoText.big);
    setError("");
    setLogo({ file, url: URL.createObjectURL(file) });
  };
  const balance = auth.getClientLogin()?.coin_balance ?? 0;
  const price = prices?.[form.category] ?? 0;
  const short = !editing && prices && price > balance;

  useEffect(() => {
    if (editing) return;
    myBusinessService
      .prices()
      .then((r) => {
        setPrices(r.data);
        setDays(r.days || {});
      })
      .catch(() => {});
  }, [editing]);

  // phones: the picked type stays in view in the sliding row
  const list = useRef(null);
  const [tq, setTq] = useState(""); // find a type (many types later)
  const qq = tq.trim().toLowerCase();
  const matches = (k) => {
    if (!qq) return true;
    const i = info[k] || {};
    const other = (lang === "km" ? BIZ_INFO.en : BIZ_INFO.km)?.[k] || {};
    return [s.categoryNames[k], k, i.tagline, i.best, ...(i.included || []), other.tagline, other.best].join(" ").toLowerCase().includes(qq);
  };
  // groups from Super admin → Business groups (homepage service keys → business types)
  const BIZ_GROUPS = useHomepageData()
    .groups.filter((g) => g.key !== "more")
    .map((g) => ({ key: g.key, en: g.label, km: g.label, types: g.keys.map(typeOf) }));
  const grouped = new Set(BIZ_GROUPS.flatMap((g) => g.types));
  const groups = [...BIZ_GROUPS, { ...BIZ_GROUP_MORE, types: CATEGORY_KEYS.filter((k) => !grouped.has(k)) }].map((g) => ({ ...g, types: g.types.filter((k) => CATEGORY_KEYS.includes(k) && matches(k)) })).filter((g) => g.types.length);
  const firstMatch = groups[0]?.types[0];
  const hidden = !!qq && !!firstMatch && !groups.some((g) => g.types.includes(form.category));
  useEffect(() => {
    if (hidden) setForm((f) => ({ ...f, category: firstMatch })); // the search hid the picked type → show the first match
  }, [hidden, firstMatch]);
  useEffect(() => {
    list.current?.querySelector(".cl-add-type.on")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [form.category]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const [askPay, payNode] = usePayConfirm();
  const submit = (e) => {
    e.preventDefault();
    setError("");
    setNoCoins(false);
    if (form.name.trim().length < 2) return setError(t.bizNameShort);
    if (editing) return send();
    askPay(price, `${s.categoryNames[form.category] || form.category} · ${form.name.trim()}`, send);
  };
  const send = async () => {
    setBusy(true);
    try {
      const data = { category: form.category, name: form.name.trim() };
      if (editing) {
        const { category, ...rest } = data; // the type can't change after paying
        await myBusinessService.update(business._id, rest);
        if (withLogo) {
          const sc = stampApi({ id: business._id });
          await sc.save({ shop_name: rest.name }).catch(() => {});
          if (logo?.file) await sc.logo(logo.file);
        }
        onSaved(t.saved2);
      } else {
        const r = await myBusinessService.create(data);
        if (r.balance !== undefined) auth.setClientLogin({ ...auth.getClientLogin(), coin_balance: r.balance });
        if (r.charged) coinsChanged();
        if (withLogo && logo?.file && r.data?._id) {
          const up = await stampApi({ id: r.data._id })
            .logo(logo.file)
            .catch(() => null);
          if (up?.data?.logo) r.data.photo = up.data.logo;
        }
        onSaved(r.charged ? t.bizCreatedPaid.replace("{coins}", fmt(r.charged)) : t.bizCreated, r.data);
      }
      onClose();
    } catch (err) {
      if (err.status === 402) setNoCoins(true);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await myBusinessService.remove(business._id);
      onSaved(t.bizDeleted);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={editing ? t.editBusiness : t.addBusiness}
      onClose={onClose}
      busy={busy}
      size={editing ? "" : "md-modal-lg cl-add-modal"}
      footer={
        <>
          {editing && (
            <button
              type="button"
              className="md-btn md-btn-ghost sa-danger-text"
              style={{ marginRight: "auto" }}
              onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
              disabled={busy || (confirmDelete && typed.trim() !== (business?.name || "").trim())}
              data-testid="biz-delete"
            >
              <Trash2 size={15} /> {confirmDelete ? t.confirmDelete : t.remove}
            </button>
          )}
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {s.cancel}
          </button>
          <button type="submit" form="biz-form" className="md-btn md-btn-primary" disabled={busy || short}>
            {busy ? s.saving : editing || !price ? s.save : `${t.payAndCreate} · ${fmt(price)}`}
          </button>
        </>
      }
    >
      <form id="biz-form" onSubmit={submit} className="md-fields">
        {business && !business.status && <div className="md-form-error">{t.bizSuspended}</div>}
        {confirmDelete && (
          <div className="md-form-error cl-delete-warn">
            <b>{t.deleteForever}</b>
            <span>{t.typeNameToDelete.replace("{name}", business?.name || "")}</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={business?.name} autoFocus aria-label={t.typeNameToDelete} data-testid="biz-delete-name" />
          </div>
        )}
        {editing ? (
          <fieldset className="cl-types">
            <legend>{t.bizType}</legend>
            {CATEGORY_KEYS.map((k) => {
              const Icon = TYPE_ICONS[k];
              return (
                <label key={k} className={`cl-type ${form.category === k ? "on" : ""} ${editing && form.category !== k ? "off" : ""}`}>
                  <input
                    type="radio"
                    name="biz-type"
                    value={k}
                    checked={form.category === k}
                    disabled={editing}
                    onChange={() => {
                      setForm((f) => ({ ...f, category: k }));
                      setNoCoins(false);
                    }}
                  />
                  <span className="cl-type-icon">{Icon && <Icon size={22} />}</span>
                  <span className="cl-type-text">
                    <b>{s.categoryNames[k]}</b>
                    {!editing && prices && (
                      <small>
                        {prices[k] ? (
                          <>
                            <CoinIcon size={14} /> {fmt(prices[k])} {t.coinsWord} {days[k] ? t.perYearShort : `· ${t.oneTime}`}
                          </>
                        ) : (
                          t.free
                        )}
                      </small>
                    )}
                  </span>
                </label>
              );
            })}
          </fieldset>
        ) : (
          <div className="cl-add">
            <div className="cl-add-side">
              <label className="cl-add-find">
                <Search size={15} />
                <input value={tq} onChange={(e) => setTq(e.target.value)} placeholder={w.find} aria-label={w.find} data-testid="biz-type-q" />
                {tq && (
                  <button type="button" onClick={() => setTq("")} aria-label={s.close}>
                    <X size={14} />
                  </button>
                )}
              </label>
              <div className="cl-add-list" ref={list} role="radiogroup" aria-label={w.pick}>
                {groups.map((g) => (
                  <div key={g.key} className="cl-add-group" role="presentation">
                    <small className="cl-add-label">{g[lang === "km" ? "km" : "en"]}</small>
                    {g.types.map((k) => {
                      const Icon = TYPE_ICONS[k] || Plus;
                      return (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={form.category === k}
                          className={`cl-add-type t-${k} ${form.category === k ? "on" : ""}`}
                          onClick={() => {
                            setForm((f) => ({ ...f, category: k }));
                            setNoCoins(false);
                          }}
                          data-testid={`biz-type-${k}`}
                        >
                          <span className="cl-type-icon">
                            <Icon size={18} />
                          </span>
                          <span className="cl-type-text">
                            <b>{s.categoryNames[k]}</b>
                            <small>
                              {prices ? (
                                prices[k] ? (
                                  <>
                                    <CoinIcon size={12} /> {fmt(prices[k])} {days[k] ? t.perYearShort : `· ${t.oneTime}`}
                                  </>
                                ) : (
                                  t.free
                                )
                              ) : (
                                "…"
                              )}
                            </small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
                {!groups.length && <p className="cl-add-none">{w.none}</p>}
              </div>
            </div>
            <div className="cl-add-detail" data-testid="biz-type-detail">
              <div className="cl-add-head">
                <span className={`cl-add-ic t-${form.category}`}>
                  {(() => {
                    const Icon = TYPE_ICONS[form.category];
                    return Icon ? <Icon size={26} /> : null;
                  })()}
                </span>
                <div>
                  <h4>{s.categoryNames[form.category]}</h4>
                  <p>{info[form.category]?.tagline}</p>
                </div>
              </div>
              <BizTypeScene type={form.category} lang={lang} />
              <div className="cl-add-price">
                <b>
                  <CoinIcon size={18} /> {prices ? (price ? fmt(price) : t.free) : "…"}
                  {price > 0 && <small> {t.coinsWord}</small>}
                </b>
                <span>
                  {days[form.category] ? <CalendarClock size={14} /> : <Forever size={14} />} {days[form.category] ? w.renewYear : w.oneTime}
                </span>
              </div>
              <small className="cl-add-best">
                {w.best}: {info[form.category]?.best}
              </small>
              <div className="cl-add-cols">
                <div>
                  <h5>{w.included}</h5>
                  <ul className="cl-add-ul">
                    {(info[form.category]?.included || []).map((x) => (
                      <li key={x}>
                        <Check size={14} /> {x}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5>{w.later}</h5>
                  <ul className="cl-add-ul later">
                    {(info[form.category]?.later || []).map((x) => (
                      <li key={x}>
                        <Plus size={14} /> {x}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="md-field">
          <label htmlFor="biz-name">
            {t.bizName}
            <span className="md-required">*</span>
          </label>
          <input id="biz-name" maxLength={100} value={form.name} onChange={set("name")} placeholder={t.bizNamePh} autoFocus />
        </div>
        {withLogo && (
          <div className="md-field">
            <label>{logoText.title}</label>
            <div className="cl-logo-pick">
              <span className="cl-logo-prev">{logo?.url || business?.photo ? <img src={logo?.url || business.photo} alt="" /> : <Stamp size={22} />}</span>
              <label className="md-btn md-btn-ghost sa-btn-sm">
                <Camera size={14} /> {logo?.url || business?.photo ? logoText.change : logoText.pick}
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickLogo} data-testid="biz-logo" />
              </label>
              <small className="md-hint">{logoText.hint}</small>
            </div>
          </div>
        )}
        {!editing && prices && (
          <div className={`cl-pay ${short || noCoins ? "short" : ""}`}>
            <span>
              {t.youPay} <b>{price ? `${fmt(price)} ${t.coinsWord}${days[form.category] ? ` ${t.perYearShort}` : ""}` : t.free}</b>
            </span>
            <small>
              {t.coinBalance}: {fmt(balance)}
            </small>
          </div>
        )}
        {!editing && prices && days[form.category] && price > 0 && (
          <p className="md-hint" style={{ margin: 0 }}>
            {t.firstYear}
          </p>
        )}
        {(short || noCoins) && (
          <div className="md-form-error">
            {t.notEnoughCoins} <Link to="/app/wallet">{t.topUp} →</Link>
          </div>
        )}
        {editing && (
          <p className="md-hint" style={{ margin: 0 }}>
            {t.typeLocked}
          </p>
        )}
        {error && <div className="md-form-error">{error}</div>}
      </form>
      {payNode}
    </Modal>
  );
}
