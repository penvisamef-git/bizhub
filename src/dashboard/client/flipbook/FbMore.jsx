import { useEffect, useState } from "react";
import { BarChart3, BookOpen, BookOpenText, Check, FolderOpen, HardDrive, Library, Loader2, Lock, Palette, Pencil, Plus, Puzzle, QrCode, Trash2 } from "lucide-react";
import { flipbookService } from "../../../api/services";
import { Modal } from "../../super_admin/parts";
import CoinIcon from "../../../components/CoinIcon";
import { Field } from "../restaurant/parts";
import { ADDON_ICON, SearchBar, BuySlots, Confirm, Head, Locked, QR_CARD_KEYS, QrCard, Switch, qrCardName, qrThumb } from "./FbParts";
import { catUrl, fmt, fmtDate, shelfUrl } from "./text";

// ---------------------------------------- categories ----------------------------------------
export function CategoriesTab({ ctx }) {
  const { id, m, data, readOnly, notify } = ctx;
  const cats = data.categories;
  const [q, setQ] = useState("");
  const shownCats = cats.filter((c) => !q.trim() || `${c.name} ${c.about || ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  const [edit, setEdit] = useState(null); // {} new | row
  const [qr, setQr] = useState(null);
  const [del, setDel] = useState(null);
  const max = data.limits.categories;
  const unlimited = ctx.on("fb_categories");
  const count = (cid) => data.books.filter((b) => (b.category_ids || []).map(String).includes(String(cid))).length;
  const startNew = () => {
    if (!unlimited && cats.length >= max) return ctx.askBuy({ addon: "fb_categories" });
    setEdit({});
  };
  return (
    <div className="rs-col">
      <Head icon={FolderOpen} title={m.catsTitle} sub={m.catsSub}>
        <button type="button" className="md-btn md-btn-primary sa-btn-sm" onClick={startNew} disabled={readOnly} data-testid="fb-cat-add">
          <Plus size={14} /> {m.addCat}
        </button>
      </Head>
      {!unlimited && (
        <section className="panel-card fb-note">
          <Lock size={16} />
          <span>{m.catLimit}</span>
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "fb_categories" })} disabled={readOnly}>
            <CoinIcon size={13} /> {m.unlock.replace("{coins}", fmt(data.addons.fb_categories.price))}
          </button>
        </section>
      )}
      {!cats.length ? (
        <section className="panel-card sa-empty-state">
          <FolderOpen size={30} />
          <p>{m.noCats}</p>
        </section>
      ) : (
        <>
          {cats.length > 3 && <SearchBar m={m} value={q} onChange={setQ} placeholder={m.searchCats} n={shownCats.length} max={cats.length} testid="fb-cat-search" />}
          {!shownCats.length && (
            <section className="panel-card sa-empty-state">
              <p>{m.noFoundCat}</p>
            </section>
          )}
          <div className="fb-cat-list">
            {shownCats.map((c) => (
              <article key={c._id} className={`panel-card fb-cat ${c.active === false ? "off" : ""}`} data-testid="fb-cat">
                <span className="fb-cat-ic">
                  <FolderOpen size={20} />
                </span>
                <div className="fb-cat-text">
                  <b>{c.name}</b>
                  <small className="rs-muted">
                    {m.booksIn.replace("{n}", count(c._id))}
                    {c.about ? ` · ${c.about}` : ""}
                  </small>
                </div>
                <div className="fb-acts">
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setQr(c)}>
                    <QrCode size={13} /> {m.linkQr}
                  </button>
                  <button type="button" className="md-icon-btn" onClick={() => setEdit(c)} disabled={readOnly} aria-label={m.edit}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="md-icon-btn danger" onClick={() => setDel(c)} disabled={readOnly} aria-label={m.delete}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {edit && <CatBox ctx={ctx} row={edit} onClose={() => setEdit(null)} />}
      {qr && (
        <Modal title={qr.name} onClose={() => setQr(null)} size="md-modal-lg">
          <QrCard ctx={ctx} url={catUrl(qr.slug)} name={qr.name} header={data.settings.title || data.business.name} relink={{ kind: "category", id: qr._id }} onRelinked={(slug) => setQr({ ...qr, slug })} />
        </Modal>
      )}
      {del && (
        <Confirm
          m={m}
          title={m.removeCat}
          sub={`${del.name} — ${m.removeCatSub}`}
          onClose={() => setDel(null)}
          onYes={async () => {
            try {
              await flipbookService.removeCategory(id, del._id);
              ctx.put((d) => ({ categories: d.categories.filter((x) => x._id !== del._id), books: d.books.map((b) => ({ ...b, category_ids: (b.category_ids || []).filter((x) => String(x) !== String(del._id)) })) }));
            } catch (e) {
              notify({ type: "error", text: e.message });
              throw e;
            }
          }}
        />
      )}
    </div>
  );
}

function CatBox({ ctx, row, onClose }) {
  const { id, m, notify } = ctx;
  const [f, setF] = useState({ name: row.name || "", about: row.about || "", active: row.active !== false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      if (row._id) {
        const r = await flipbookService.saveCategory(id, row._id, f);
        ctx.put((d) => ({ categories: d.categories.map((x) => (x._id === row._id ? r.data : x)) }));
      } else {
        const r = await flipbookService.addCategory(id, f);
        ctx.put((d) => ({ categories: [...d.categories, r.data] }));
      }
      notify({ type: "success", text: m.saved });
      onClose();
    } catch (e) {
      if (e.response?.code === "category_limit") {
        onClose();
        ctx.askBuy({ addon: "fb_categories" });
        return;
      }
      setErr(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={row._id ? m.edit : m.addCat}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="md-btn md-btn-ghost" onClick={onClose} disabled={busy}>
            {m.cancel}
          </button>
          <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={busy || !f.name.trim()} data-testid="fb-cat-save">
            {busy && <Loader2 size={15} className="md-spin" />} {m.save}
          </button>
        </>
      }
    >
      <div className="md-fields">
        <Field label={m.catName}>
          <input value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus data-testid="fb-cat-name" />
        </Field>
        <Field label={m.catAbout}>
          <textarea rows={4} value={f.about} maxLength={600} onChange={(e) => setF({ ...f, about: e.target.value })} placeholder={m.catAboutPh} data-testid="fb-cat-about" />
          <small className="rs-muted fb-count">{f.about.length} / 600</small>
        </Field>
        {row._id && <Switch checked={f.active} onChange={(v) => setF({ ...f, active: v })} label={m.active} />}
        {err && <div className="md-form-error">{err}</div>}
      </div>
    </Modal>
  );
}

// ---------------------------------------- share ----------------------------------------
export function ShareTab({ ctx }) {
  const { id, m, lang, data, readOnly, notify } = ctx;
  const name = data.settings.title || data.business.name;
  const unlocked = ctx.on("fb_qr_styles");
  const [busy, setBusy] = useState("");
  const url = shelfUrl(data.settings.slug);
  const [cq, setCq] = useState("");
  const [limit, setLimit] = useState(10);
  const qrCats = data.categories.filter((c) => !cq.trim() || c.name.toLowerCase().includes(cq.trim().toLowerCase()));
  const use = async (k) => {
    if (k !== "classic" && !unlocked) return ctx.askBuy({ addon: "fb_qr_styles" });
    setBusy(k);
    try {
      const r = await flipbookService.save(id, { qr_style: k });
      ctx.setSettings(r.data);
      notify({ type: "success", text: m.saved });
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rs-col">
      <Head icon={QrCode} title={m.shareTitle} sub={m.shareSub} />
      <section className="panel-card">
        <div className="fb-qrs-head">
          <div>
            <h3 className="mq-h3">{m.qrStyles}</h3>
            <p className="rs-muted">{m.qrStylesSub.replace("{n}", QR_CARD_KEYS.length).replace("{coins}", fmt(data.addons.fb_qr_styles?.price))}</p>
          </div>
          {unlocked ? (
            <span className="rs-pill on">
              <Check size={13} /> {m.unlocked}
            </span>
          ) : (
            <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: "fb_qr_styles" })} disabled={readOnly} data-testid="fb-unlock-qr">
              <CoinIcon size={14} /> {m.unlock.replace("{coins}", fmt(data.addons.fb_qr_styles?.price))}
            </button>
          )}
        </div>
        <div className="mq-qr-styles">
          {QR_CARD_KEYS.map((k) => {
            const using = (data.settings.qr_style || "classic") === k;
            const open = k === "classic" || unlocked;
            return (
              <button key={k} type="button" className={`mq-qr-style fb-qrs ${using ? "using" : ""}`} onClick={() => !using && use(k)} disabled={readOnly || !!busy} data-testid={`fb-qrs-${k}`}>
                <span className="mq-qr-thumb" dangerouslySetInnerHTML={{ __html: qrThumb(data, k, url) }} />
                <b>{qrCardName(k, lang)}</b>
                {using ? (
                  <span className="rs-pill on">
                    <Check size={12} /> {m.inUse}
                  </span>
                ) : busy === k ? (
                  <Loader2 size={14} className="md-spin" />
                ) : open ? (
                  <small className="rs-muted">{k === "classic" ? m.free : m.use}</small>
                ) : (
                  <small className="fb-lockline">
                    <Lock size={11} /> {m.locked2}
                  </small>
                )}
              </button>
            );
          })}
        </div>
      </section>
      <section className="panel-card">
        <h3 className="mq-h3">
          <Library size={16} /> {m.libraryQr}
        </h3>
        <QrCard ctx={ctx} url={shelfUrl(data.settings.slug)} name={name} header={m.libraryQr} embed relink={{ kind: "library" }} />
      </section>
      {data.categories.length > 0 && (
        <SearchBar
          m={m}
          value={cq}
          onChange={(v) => {
            setCq(v);
            setLimit(10);
          }}
          placeholder={m.searchCats}
          n={qrCats.length}
          max={data.categories.length}
          testid="fb-share-search"
        />
      )}
      {data.categories.length > 0 && !qrCats.length && (
        <section className="panel-card sa-empty-state">
          <p>{m.noFoundCat}</p>
        </section>
      )}
      {qrCats.slice(0, limit).map((c) => (
        <section key={c._id} className="panel-card">
          <h3 className="mq-h3">
            <FolderOpen size={16} /> {m.catQr}: {c.name}
          </h3>
          <QrCard ctx={ctx} url={catUrl(c.slug)} name={c.name} header={name} small relink={{ kind: "category", id: c._id }} />
        </section>
      ))}
      {qrCats.length > limit && (
        <button type="button" className="md-btn md-btn-ghost" style={{ alignSelf: "center" }} onClick={() => setLimit(limit + 10)}>
          {m.showMore.replace("{n}", qrCats.length - limit)}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------- stats ----------------------------------------
export function StatsTab({ ctx }) {
  const { id, m, data, notify } = ctx;
  const [days, setDays] = useState(30);
  const [book, setBook] = useState("");
  const [st, setSt] = useState(null);
  const on = ctx.on("fb_stats");
  useEffect(() => {
    if (!on) return;
    setSt(null);
    flipbookService
      .stats(id, days, book)
      .then((r) => setSt(r.data))
      .catch((e) => notify({ type: "error", text: e.message }));
  }, [id, days, book, on]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!on)
    return (
      <div className="rs-col">
        <Head icon={BarChart3} title={m.statsTitle} sub={m.statsSub} />
        <Locked ctx={ctx} addon="fb_stats" />
      </div>
    );
  const max = st ? Math.max(1, ...st.series.map((x) => x.views)) : 1;
  const pmax = st ? Math.max(1, ...st.pages.map((x) => x.views)) : 1;
  return (
    <div className="rs-col">
      <Head icon={BarChart3} title={m.statsTitle} sub={m.statsSub}>
        <select className="fb-select" value={book} onChange={(e) => setBook(e.target.value)}>
          <option value="">{m.allBooks}</option>
          {data.books.map((b) => (
            <option key={b._id} value={b._id}>
              {b.title}
            </option>
          ))}
        </select>
        <div className="rs-addon-filter mq-filter">
          {[7, 30, 90].map((d) => (
            <button key={d} type="button" className={days === d ? "on" : ""} onClick={() => setDays(d)}>
              {d}
            </button>
          ))}
        </div>
      </Head>
      {!st ? (
        <div className="panel-card">…</div>
      ) : (
        <>
          <div className="mq-kpis">
            {[
              [m.today, st.today],
              [m.total.replace("{n}", st.days), st.total],
              [m.allTime, st.all_time],
            ].map(([k, v]) => (
              <section key={k} className="panel-card">
                <small className="rs-muted">{k}</small>
                <b data-testid="fb-kpi">{fmt(v)}</b>
              </section>
            ))}
          </div>
          <section className="panel-card">
            {!st.total ? (
              <p className="rs-muted">{m.noStats}</p>
            ) : (
              <div className="mq-chart" aria-hidden="true">
                {st.series.map((d) => (
                  <i key={d.day} style={{ height: `${Math.max(2, (d.views / max) * 100)}%` }} title={`${d.day} · ${d.views}`} />
                ))}
              </div>
            )}
          </section>
          <div className="mq-two">
            <section className="panel-card">
              <h3 className="mq-h3">{m.topBooks}</h3>
              <ol className="mq-top">
                {st.books.slice(0, 10).map((b) => {
                  const cover = data.books.find((x) => x._id === b._id)?.cover;
                  return (
                    <li key={b._id}>
                      <span className="mq-thumb sm fb-thumb">{cover ? <img src={cover} alt="" /> : <BookOpen size={14} />}</span>
                      <span>{b.title}</span>
                      <small className="rs-muted">{m.views.replace("{n}", fmt(b.views))}</small>
                    </li>
                  );
                })}
              </ol>
            </section>
            <section className="panel-card">
              <h3 className="mq-h3">{m.topPages}</h3>
              {!st.pages.length ? (
                <p className="rs-muted">{m.noStats}</p>
              ) : (
                <div className="fb-pagebars">
                  {st.pages.map((p) => (
                    <div key={p.page}>
                      <small>{m.page.replace("{n}", p.page)}</small>
                      <span>
                        <i style={{ width: `${(p.views / pmax) * 100}%` }} />
                      </span>
                      <b>{fmt(p.views)}</b>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------- add-ons ----------------------------------------
export function AddonsTab({ ctx }) {
  const { m, lang, data, readOnly } = ctx;
  const [slots, setSlots] = useState("");
  const L = data.limits;
  const card = (key, Icon, name, price, what, foot) => (
    <article key={key} className="panel-card rs-addon" data-testid={`fb-addon-${key}`}>
      <div className="rs-addon-top">
        <span className="rs-addon-ic">
          <Icon size={20} />
        </span>
        <div>
          <h3>{name}</h3>
          <span className="rs-addon-price">
            <CoinIcon size={13} /> {price}
          </span>
        </div>
      </div>
      <p>{what}</p>
      <div className="rs-addon-foot">{foot}</div>
    </article>
  );
  return (
    <div className="rs-col">
      <Head icon={Puzzle} title={m.addonsTitle} sub={m.addonsSub} />
      <div className="rs-addons">
        {Object.entries(data.addons).map(([k, a]) => {
          const Icon = ADDON_ICON[k] || Puzzle;
          return (
            <article key={k} className={`panel-card rs-addon s-${a.active ? "active" : "none"}`} data-testid={`fb-addon-${k}`}>
              <div className="rs-addon-top">
                <span className="rs-addon-ic">
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{m.addonNames[k]}</h3>
                  <span className="rs-addon-price">
                    <CoinIcon size={13} /> {fmt(a.price)} {m.coins} {a.days ? m.perYear : `· ${m.forever}`}
                  </span>
                </div>
              </div>
              <p>{m.addonWhat[k]}</p>
              <small className="rs-muted">{m.addonFree[k]}</small>
              <div className="rs-addon-foot">
                {a.active ? (
                  <span className="rs-pill on">
                    <Check size={13} /> {a.expires_at ? m.ends.replace("{date}", fmtDate(a.expires_at, lang)) : m.unlocked}
                  </span>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly}>
                    <CoinIcon size={14} /> {m.unlock.replace("{coins}", fmt(a.price))}
                  </button>
                )}
                {a.active && a.days && (
                  <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly}>
                    {m.renewFor.replace("{coins}", fmt(a.price))}
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {card(
          "slots",
          BookOpen,
          m.slotsName,
          `${fmt(data.prices.fb_book_slot)} ${m.coins} · ${m.forever}`,
          `${m.slotsWhat} ${m.room.replace("{n}", data.room.books).replace("{max}", data.room.book_capacity)}`,
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setSlots("book")} disabled={readOnly}>
            <Plus size={14} /> {m.moreBooks}
          </button>,
        )}
        {card(
          "big",
          HardDrive,
          m.bigName,
          `${fmt(data.prices.fb_big_slot)} ${m.coins} · ${m.forever}`,
          `${m.bigWhat
            .replace("{mb}", L.bytes / 1048576)
            .replace("{pages}", L.pages)
            .replace("{bmb}", L.big_bytes / 1048576)
            .replace("{bpages}", L.big_pages)} ${m.bigRoom.replace("{n}", data.room.big).replace("{max}", data.room.big_capacity)}`,
          <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => setSlots("big")} disabled={readOnly}>
            <Plus size={14} /> {m.moreBig}
          </button>,
        )}
        {card(
          "password",
          Lock,
          m.pwName,
          `${fmt(data.prices.fb_password)} ${m.coins} · ${m.forever}`,
          m.pwWhat,
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("books")}>
            {m.tabs.books} →
          </button>,
        )}
        {card(
          "designs",
          Palette,
          m.designs,
          `${fmt(data.prices.fb_shelf_theme)} ${m.coins} · ${m.forever}`,
          m.libSub.replace("{n}", 60).replace("{coins}", fmt(data.prices.fb_shelf_theme)),
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("library")}>
            {m.tabs.library} →
          </button>,
        )}
        {card(
          "readers",
          BookOpenText,
          m.readers,
          `${fmt(data.prices.fb_reader_theme)} ${m.coins} · ${m.forever}`,
          m.readerSub.replace("{coins}", fmt(data.prices.fb_reader_theme)),
          <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.go("reader")}>
            {m.tabs.reader} →
          </button>,
        )}
      </div>
      {slots && <BuySlots ctx={ctx} kind={slots} onClose={() => setSlots("")} />}
    </div>
  );
}
