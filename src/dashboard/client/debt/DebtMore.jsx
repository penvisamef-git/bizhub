import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, BellRing, BookOpen, NotebookPen, Check, Download, EyeOff, FileSpreadsheet, History, Loader2, Lock, Puzzle, Send, Settings, Trash2, Unplug, Upload, Users } from "lucide-react";
import CoinIcon from "../../../components/CoinIcon";
import { Head, Switch } from "../menuqr/parts";
import { SITE, dayOf, fmt, fmtDate, fmtTime, money, lineNote, nDays } from "./text";

export const ADDON_ICON = { debt_remind: BellRing, debt_more: Users, debt_excel: FileSpreadsheet, debt_nobrand: EyeOff };

export function Locked({ ctx, addon }) {
  const { m, data, readOnly } = ctx;
  const a = data.addons[addon] || {};
  const Icon = ADDON_ICON[addon] || Lock;
  return (
    <section className="panel-card mq-locked">
      <Icon size={24} />
      <b>{m.addonNames[addon]}</b>
      <p className="rs-muted">{m.addonWhat[addon]}</p>
      {m.perks[addon] && (
        <ul className="wsv-perks">
          {m.perks[addon].map((p) => (
            <li key={p}>
              <Check size={14} /> {p}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="md-btn md-btn-primary rs-gold-btn" onClick={() => ctx.askBuy({ addon })} disabled={readOnly} data-testid={`dk-unlock-${addon}`}>
        <CoinIcon size={16} /> {m.unlock.replace("{coins}", `${fmt(a.price)} ${m.coins}${a.days ? ` ${m.perYear}` : ""}`)}
      </button>
    </section>
  );
}

// ---------------------------------------- history ----------------------------------------
export function HistoryTab({ ctx }) {
  const { m, lang, api, notify } = ctx;
  const [by, setBy] = useState("");
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const load = async (p = 1) => {
    try {
      const r = await api.history({ by, page: p });
      setRows((old) => (p === 1 ? r.data : [...(old || []), ...r.data]));
      setPage(p);
      setPages(r.pagination.totalPages || 1);
    } catch (e) {
      notify({ type: "error", text: e.message });
    }
  };
  useEffect(() => {
    load(1);
  }, [by]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="rs-col">
      <Head icon={History} title={m.historyTitle} sub={m.historySub} />
      <section className="panel-card dk-lines">
        <div className="wst-chips">
          {[
            ["", m.allLines],
            ["void", m.voidLines],
          ].map(([k, l]) => (
            <button key={k} type="button" className={by === k ? "on" : ""} onClick={() => setBy(k)} data-testid={`dk-hist-${k || "all"}`}>
              {l}
            </button>
          ))}
        </div>
        {rows === null ? (
          <Loader2 size={20} className="md-spin" />
        ) : !rows.length ? (
          <p className="rs-muted">{m.noLines}</p>
        ) : (
          <ul>
            {rows.map((e) => (
              <li key={e._id} className={`k-${e.kind} ${e.void ? "void" : ""}`} data-testid="dk-hist-line">
                <span className="dk-line-ic">{e.kind === "pay" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span>
                <div className="dk-line-main">
                  <b>
                    <button type="button" className="dk-linkish" onClick={() => ctx.go("customers", { c: e.customer_id })}>
                      {e.customer_name || "—"}
                    </button>
                    {e.note ? ` · ${lineNote(e, m)}` : ""}
                  </b>
                  <small className="rs-muted">
                    {fmtTime(e.date, lang)}
                    {e.method ? ` · ${e.method}` : ""}
                    {e.void ? ` · ${m.voided}${e.void_reason ? ` (${e.void_reason})` : ""}` : ""}
                  </small>
                </div>
                <span className="dk-line-amt">
                  {e.kind === "pay" ? "−" : "+"}
                  {money(e.currency, e.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {page < pages && (
          <button type="button" className="md-btn md-btn-ghost dk-more" onClick={() => load(page + 1)}>
            {m.more}
          </button>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------- reminders + Telegram ----------------------------------------
export function RemindersTab({ ctx }) {
  const { m, api, data, readOnly, notify } = ctx;
  const r0 = data.book.remind || {};
  const [f, setF] = useState({ on: r0.on !== false, before: r0.before ?? 1, every: r0.every ?? 7, time: r0.time || "09:00", text_km: r0.text_km || "", text_en: r0.text_en || "" });
  const [busy, setBusy] = useState("");
  const [tg, setTg] = useState(data.telegram);
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setInterval(() => {
      api.get().then((r) => {
        if (r.data.telegram?.connected) {
          setTg(r.data.telegram);
          setWaiting(false);
          ctx.put({ telegram: r.data.telegram });
        }
      });
    }, 3000);
    return () => clearInterval(t);
  }, [waiting]); // eslint-disable-line react-hooks/exhaustive-deps
  const sample = useMemo(() => {
    const words = f.text_km || "សួស្តី {name} នេះជាការរំលឹកពី {shop}៖ ប្រាក់ជំពាក់ {amount} (ដល់ថ្ងៃ {due})។ សូមអរគុណ!";
    return words
      .replace(/\{name\}/g, "សុខា")
      .replace(/\{amount\}/g, "$25 + 10,000៛")
      .replace(/\{due\}/g, "20/10/2026")
      .replace(/\{shop\}/g, data.book.shop_name || "")
      .replace(/\{phone\}/g, data.book.phone || "")
      .replace(/\{link\}/g, `${SITE}/d/…`);
  }, [f.text_km, data.book]);
  if (!ctx.on("debt_remind"))
    return (
      <div className="rs-col">
        <Head icon={BellRing} title={m.remindersTitle} sub={m.remindersSub} />
        <Locked ctx={ctx} addon="debt_remind" />
        <section className="panel-card">
          <h3 className="dk-h3">{m.howItWorks}</h3>
          <p className="rs-muted">{m.howItWorksSub}</p>
        </section>
      </div>
    );
  const save = async () => {
    setBusy("save");
    try {
      const r = await api.save({ remind: f });
      ctx.put((d) => ({ book: { ...d.book, ...r.data } }));
      notify({ type: "success", text: m.saved });
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  const link = async (group) => {
    setBusy("link");
    try {
      const r = await api.telegramLink();
      window.open(group ? r.data.group_url : r.data.url, "_blank", "noopener");
      setWaiting(true);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rs-col">
      <Head icon={BellRing} title={m.remindersTitle} sub={m.remindersSub} />
      <section className="panel-card dk-settings">
        <Switch checked={f.on} onChange={(v) => setF({ ...f, on: v })} label={m.autoOn} disabled={readOnly} testid="dk-remind-on" />
        <div className="dk-form">
          <label>
            <span>{m.before}</span>
            <select value={f.before} onChange={(e) => setF({ ...f, before: Number(e.target.value) })} disabled={readOnly} data-testid="dk-remind-before">
              <option value={0}>{m.beforeOnDay}</option>
              {[1, 2, 3, 5, 7].map((n) => (
                <option key={n} value={n}>
                  {nDays(m, n)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{m.every}</span>
            <select value={f.every} onChange={(e) => setF({ ...f, every: Number(e.target.value) })} disabled={readOnly}>
              <option value={0}>{m.everyOnce}</option>
              {[1, 2, 3, 5, 7, 14, 30].map((n) => (
                <option key={n} value={n}>
                  {m.everyDays.replace("{n}", n)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{m.sendAt}</span>
            <input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value || "09:00" })} disabled={readOnly} />
          </label>
          <label className="wide">
            <span>{m.words} · ខ្មែរ</span>
            <textarea rows={3} value={f.text_km} onChange={(e) => setF({ ...f, text_km: e.target.value })} maxLength={500} disabled={readOnly} data-testid="dk-remind-words" />
          </label>
          <label className="wide">
            <span>{m.words} · English</span>
            <textarea rows={3} value={f.text_en} onChange={(e) => setF({ ...f, text_en: e.target.value })} maxLength={500} disabled={readOnly} />
          </label>
          <small className="rs-muted wide">{m.wordsHelp}</small>
          <div className="dk-preview wide">
            <small>{m.preview}</small>
            <p>{sample}</p>
          </div>
        </div>
        <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={readOnly || !!busy} data-testid="dk-remind-save">
          {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {m.save}
        </button>
      </section>

      <section className="panel-card qg-tg">
        <h3 className="dk-h3">{m.ownerChat}</h3>
        <p className="rs-muted">{m.ownerChatSub}</p>
        {!tg.configured ? (
          <p className="rs-muted">{m.tgNotConfigured}</p>
        ) : tg.connected ? (
          <>
            <span className="rs-pill on">
              <Check size={13} /> {m.tgConnected.replace("{name}", tg.chat_name)}
            </span>
            <Switch
              checked={tg.daily}
              disabled={readOnly}
              label={m.daily}
              onChange={async (v) => {
                const r = await api.telegramSave({ daily: v }).catch((e) => notify({ type: "error", text: e.message }));
                if (r) setTg(r.data);
              }}
            />
            <div className="qg-bulk-acts">
              <button
                type="button"
                className="md-btn md-btn-primary sa-btn-sm"
                disabled={!!busy || readOnly}
                onClick={async () => {
                  setBusy("test");
                  try {
                    await api.telegramTest();
                    notify({ type: "success", text: m.tgSentOk });
                  } catch (e) {
                    notify({ type: "error", text: e.message });
                  } finally {
                    setBusy("");
                  }
                }}
              >
                {busy === "test" ? <Loader2 size={14} className="md-spin" /> : <Send size={14} />} {m.tgTest}
              </button>
              <button
                type="button"
                className="md-btn md-btn-ghost sa-btn-sm"
                disabled={!!busy || readOnly}
                onClick={async () => {
                  const r = await api.telegramOff();
                  setTg(r.data);
                  ctx.put({ telegram: r.data });
                }}
              >
                <Unplug size={14} /> {m.tgDisconnect}
              </button>
            </div>
          </>
        ) : (
          <div className="qg-bulk-acts">
            <button type="button" className="md-btn md-btn-primary" onClick={() => link(false)} disabled={!!busy || readOnly} data-testid="dk-tg-connect">
              {busy === "link" ? <Loader2 size={15} className="md-spin" /> : <Send size={15} />} {m.tgConnect}
            </button>
            <button type="button" className="md-btn md-btn-ghost" onClick={() => link(true)} disabled={!!busy || readOnly}>
              {m.tgGroup}
            </button>
            {waiting && <small className="rs-muted">{m.tgWaiting}</small>}
          </div>
        )}
      </section>
      <section className="panel-card">
        <h3 className="dk-h3">{m.howItWorks}</h3>
        <p className="rs-muted">{m.howItWorksSub}</p>
      </section>
    </div>
  );
}

// ---------------------------------------- import / export ----------------------------------------
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function downloadCsv(name, rows) {
  const text = `﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
const EXAMPLE = "name,phone,telegram,address,note,usd,khr,what,due\r\nSokha,012345678,@sokha,Phnom Penh,,12.5,20000,Rice + water,2026-11-01\r\nDara,098765432,,,,,15000,Old notebook,\r\n";
// CSV / pasted Excel rows → arrays of cells (quotes, commas, tabs or semicolons)
function csvRows(textIn) {
  const src = String(textIn || "").replace(/^\ufeff/, "");
  const first = src.split(/\r?\n/)[0] || "";
  const sep = first.includes("\t") ? "\t" : first.split(";").length > first.split(",").length ? ";" : ",";
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
}
const COLS = ["name", "phone", "telegram", "address", "note", "usd", "khr", "what", "due"];
export function ExcelTab({ ctx }) {
  const { m, api, data, readOnly, notify } = ctx;
  const [busy, setBusy] = useState("");
  const [rows, setRows] = useState([]);
  const [paste, setPaste] = useState("");
  const [result, setResult] = useState(null);
  if (!ctx.on("debt_excel"))
    return (
      <div className="rs-col">
        <Head icon={FileSpreadsheet} title={m.excelTitle} sub={m.excelSub} />
        <Locked ctx={ctx} addon="debt_excel" />
      </div>
    );
  const read = (text) => {
    setResult(null);
    const all = csvRows(text);
    // first row = headers when it has "name"
    const head = (all[0] || []).map((h) => String(h).trim().toLowerCase());
    const hasHead = head.includes("name");
    const keys = hasHead ? head : COLS;
    const list = (hasHead ? all.slice(1) : all).map((r) => Object.fromEntries(keys.map((k, i) => [k, String(r[i] ?? "").trim()]))).filter((r) => r.name);
    setRows(list);
  };
  const exp = async (what) => {
    setBusy(what);
    try {
      const r = await api.exportAll();
      const day = dayOf(new Date());
      if (what === "customers")
        downloadCsv(`debt-customers-${day}.csv`, [
          ["name", "phone", "telegram", "address", "note", "owes_usd", "owes_khr", "due", "limit_usd", "limit_khr"],
          ...r.data.customers.map((c) => [c.name, c.phone, c.telegram, c.address, c.note, c.balance.usd, c.balance.khr, dayOf(c.due_at), c.limit.usd || "", c.limit.khr || ""]),
        ]);
      else
        downloadCsv(`debt-lines-${day}.csv`, [
          ["date", "customer", "kind", "currency", "amount", "note", "method", "due", "no", "by"],
          ...r.data.entries.map((e) => [dayOf(e.date), e.customer_name, e.kind, e.currency, e.amount, e.note, e.method, dayOf(e.due_at), e.no, e.by?.name || e.by?.kind]),
        ]);
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rs-col">
      <Head icon={FileSpreadsheet} title={m.excelTitle} sub={m.excelSub} />
      <section className="panel-card dk-export">
        <button type="button" className="md-btn md-btn-ghost" onClick={() => exp("customers")} disabled={!!busy} data-testid="dk-export-customers">
          {busy === "customers" ? <Loader2 size={15} className="md-spin" /> : <Download size={15} />} {m.exportCustomers}
        </button>
        <button type="button" className="md-btn md-btn-ghost" onClick={() => exp("lines")} disabled={!!busy} data-testid="dk-export-lines">
          {busy === "lines" ? <Loader2 size={15} className="md-spin" /> : <Download size={15} />} {m.exportLines}
        </button>
      </section>
      <section className="panel-card dk-import">
        <h3 className="dk-h3">{m.importTitle}</h3>
        <p className="rs-muted">{m.importSub}</p>
        <div className="qg-bulk-acts">
          <label className="md-btn md-btn-ghost">
            <Upload size={15} /> {m.chooseFile}
            <input
              type="file"
              accept=".csv,text/csv,.txt"
              hidden
              data-testid="dk-import-file"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) read(await f.text());
              }}
            />
          </label>
          <button
            type="button"
            className="md-btn md-btn-ghost"
            onClick={() =>
              downloadCsv(
                "debt-example.csv",
                EXAMPLE.trim()
                  .split("\r\n")
                  .map((l) => l.split(",")),
              )
            }
          >
            <Download size={15} /> {m.example}
          </button>
        </div>
        <textarea rows={4} value={paste} placeholder={m.pasteHere} onChange={(e) => (setPaste(e.target.value), read(e.target.value))} data-testid="dk-import-paste" />
        {rows.length > 0 && (
          <>
            <p className="rs-muted">{m.rowsFound.replace("{n}", rows.length)}</p>
            <div className="dk-import-table">
              <table>
                <thead>
                  <tr>
                    <th>{m.name}</th>
                    <th>{m.phone}</th>
                    <th>$</th>
                    <th>៛</th>
                    <th>{m.what}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>{r.phone}</td>
                      <td>{r.usd}</td>
                      <td>{r.khr}</td>
                      <td>{r.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="md-btn md-btn-primary"
              disabled={readOnly || busy === "import"}
              data-testid="dk-import-go"
              onClick={async () => {
                setBusy("import");
                try {
                  const r = await api.importRows(rows);
                  setResult(r.data);
                  setRows([]);
                  setPaste("");
                  ctx.reload();
                } catch (e) {
                  notify({ type: "error", text: e.message });
                } finally {
                  setBusy("");
                }
              }}
            >
              {busy === "import" ? <Loader2 size={15} className="md-spin" /> : <Upload size={15} />} {m.importGo.replace("{n}", rows.length)}
            </button>
          </>
        )}
        {result && (
          <p className="dk-ok" data-testid="dk-import-result">
            <Check size={15} /> {m.importDone.replace("{added}", result.added).replace("{updated}", result.updated).replace("{skipped}", result.skipped)}
            {result.full ? ` ${m.importFull}` : ""}
          </p>
        )}
      </section>
      <small className="rs-muted">
        {fmt(data.totals.customers)} / {fmt(data.limits.customers)}
      </small>
    </div>
  );
}

// ---------------------------------------- settings ----------------------------------------
export function SettingsTab({ ctx }) {
  const { m, api, data, readOnly, notify } = ctx;
  const b = data.book;
  const [f, setF] = useState({ shop_name: b.shop_name || "", phone: b.phone || "", address: b.address || "", main: b.main || "USD", rate: b.rate || 4100 });
  const [busy, setBusy] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    setBusy("save");
    try {
      const r = await api.save({ ...f, rate: Number(f.rate) });
      ctx.put((d) => ({ book: { ...d.book, ...r.data } }));
      notify({ type: "success", text: m.saved });
    } catch (e) {
      notify({ type: "error", text: e.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="rs-col">
      <Head icon={Settings} title={m.settingsTitle} sub={m.settingsSub} />
      <section className="panel-card dk-settings">
        <div className="dk-logo-row">
          <span className="rs-logo">{b.logo ? <img src={b.logo} alt="" /> : <NotebookPen size={26} />}</span>
          <label className="md-btn md-btn-ghost sa-btn-sm">
            {busy === "logo" ? <Loader2 size={14} className="md-spin" /> : <Upload size={14} />} {m.upload}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              disabled={readOnly}
              data-testid="dk-logo-input"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setBusy("logo");
                try {
                  const r = await api.logo(file);
                  ctx.put((d) => ({ book: { ...d.book, ...r.data } }));
                } catch (er) {
                  notify({ type: "error", text: er.message });
                } finally {
                  setBusy("");
                }
              }}
            />
          </label>
          {b.logo && (
            <button
              type="button"
              className="md-btn md-btn-ghost sa-btn-sm"
              disabled={readOnly}
              onClick={async () => {
                const r = await api.removeLogo().catch((e) => notify({ type: "error", text: e.message }));
                if (r) ctx.put((d) => ({ book: { ...d.book, ...r.data } }));
              }}
            >
              <Trash2 size={14} /> {m.remove}
            </button>
          )}
        </div>
        <div className="dk-form">
          <label className="wide">
            <span>{m.shopName}</span>
            <input value={f.shop_name} onChange={set("shop_name")} maxLength={80} disabled={readOnly} data-testid="dk-shop-name" />
          </label>
          <label>
            <span>{m.shopPhone}</span>
            <input value={f.phone} onChange={set("phone")} maxLength={40} disabled={readOnly} />
          </label>
          <label>
            <span>{m.shopAddress}</span>
            <input value={f.address} onChange={set("address")} maxLength={200} disabled={readOnly} />
          </label>
          <label>
            <span>{m.mainCur}</span>
            <select value={f.main} onChange={set("main")} disabled={readOnly}>
              <option value="USD">$ USD</option>
              <option value="KHR">៛ KHR</option>
            </select>
          </label>
          <label>
            <span>{m.rate}</span>
            <input type="number" min="1000" max="10000" value={f.rate} onChange={set("rate")} disabled={readOnly} data-testid="dk-rate" />
          </label>
          <small className="rs-muted wide">{m.rateHint}</small>
        </div>
        <button type="button" className="md-btn md-btn-primary" onClick={save} disabled={readOnly || !!busy} data-testid="dk-settings-save">
          {busy === "save" ? <Loader2 size={15} className="md-spin" /> : <Check size={15} />} {m.save}
        </button>
      </section>
    </div>
  );
}

// ---------------------------------------- add-ons ----------------------------------------
export function AddonsTab({ ctx }) {
  const { m, lang, data, readOnly } = ctx;
  return (
    <div className="rs-col">
      <Head icon={Puzzle} title={m.addonsTitle} sub={m.addonsSub} />
      <div className="rs-addons">
        <article className="panel-card rs-addon s-active">
          <div className="rs-addon-top">
            <span className="rs-addon-ic">
              <BookOpen size={20} />
            </span>
            <div>
              <h3>{m.renewTitle}</h3>
              <span className="rs-addon-price">
                <CoinIcon size={13} /> {fmt(data.base_price)} {m.coins} · {m.oneTime}
              </span>
            </div>
          </div>
          <p>{m.renewSub}</p>
          <div className="rs-addon-foot">
            <span className="rs-pill on">
              <Check size={13} /> {m.unlocked}
            </span>
          </div>
        </article>
        {Object.entries(data.addons).map(([k, a]) => {
          const Icon = ADDON_ICON[k] || Puzzle;
          return (
            <article key={k} className={`panel-card rs-addon s-${a.active ? "active" : "none"}`} data-testid={`dk-addon-${k}`}>
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
              <div className="rs-addon-foot">
                {a.active ? (
                  <>
                    <span className="rs-pill on">
                      <Check size={13} /> {a.expires_at ? m.ends.replace("{date}", fmtDate(a.expires_at, lang)) : m.unlocked}
                    </span>
                    {a.days && (
                      <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly}>
                        {m.renew.replace("{coins}", fmt(a.price))}
                      </button>
                    )}
                  </>
                ) : (
                  <button type="button" className="md-btn md-btn-primary rs-gold-btn sa-btn-sm" onClick={() => ctx.askBuy({ addon: k })} disabled={readOnly} data-testid={`dk-buy-${k}`}>
                    <CoinIcon size={14} /> {m.unlock.replace("{coins}", fmt(a.price))}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
