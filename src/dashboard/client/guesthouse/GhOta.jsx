import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BedDouble, CalendarSync, CheckCircle2, Copy, KeyRound, Link2, Loader2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { guestHouseService } from "../../../api/services";
import { ListSkeleton } from "../../../components/skeleton/Skeleton";
import { fmtDate, fmtDay, fmtTime } from "./text";
import { x3 } from "./gh3-text";
import { Hero, Perks } from "./GhExtras";

// Owner: Booking.com / Agoda / Airbnb calendar sync (gh_ical, yearly)
const LOGO = { booking_com: ["B.", "#003580"], agoda: ["a", "#e2382f"], airbnb: ["✿", "#ff5a5f"], expedia: ["E", "#fbcc33"], other: ["⇄", "#64748b"] };

function AddFeed({ ctx, room, sources, onDone, onCancel }) {
  const t = x3(ctx.lang);
  const [f, setF] = useState({ source: "booking_com", url: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await guestHouseService.addIcal(ctx.id, { room_id: room._id, ...f });
      onDone(r);
    } catch (err) {
      if (err.status === 402) ctx.askBuy({ addon: "gh_ical" });
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="ghot-add" onSubmit={save}>
      <div className="ghot-src">
        {sources.map((k) => (
          <button key={k} type="button" className={f.source === k ? "on" : ""} onClick={() => setF({ ...f, source: k })}>
            <i style={{ background: LOGO[k][1] }}>{LOGO[k][0]}</i> {ctx.g.sources[k] || "Other"}
          </button>
        ))}
      </div>
      <div className="ghot-row">
        <input type="url" required value={f.url} placeholder={t.otUrlPh} onChange={(e) => setF({ ...f, url: e.target.value })} autoFocus aria-label={t.otImport} />
        <button type="button" className="md-icon-btn" onClick={onCancel} aria-label="close">
          <X size={16} />
        </button>
        <button type="submit" className="md-btn md-btn-primary sa-btn-sm" disabled={busy || !f.url.trim()}>
          {busy ? <Loader2 size={14} className="md-spin" /> : <Plus size={14} />} {t.otAdd}
        </button>
      </div>
      {error && <div className="md-form-error">{error}</div>}
    </form>
  );
}

export function OtaTab({ ctx }) {
  const { lang, data, readOnly } = ctx;
  const t = x3(lang);
  const a = data.addons?.gh_ical || {};
  const [d, setD] = useState(null);
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState("");
  const [sure, setSure] = useState("");
  const load = useCallback(
    () =>
      guestHouseService
        .ical(ctx.id)
        .then((r) => setD(r.data))
        .catch((e) => ctx.notify({ type: "error", text: e.message })),
    [ctx.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    load();
  }, [load, a.active]);

  const hero = (
    <Hero
      icon={CalendarSync}
      title={t.otTitle}
      sub={a.active ? `${t.otSub}` : t.otOff.replace("{price}", a.price ?? "")}
      addon="gh_ical"
      ctx={ctx}
      yearly
      extra={
        a.active && (
          <button
            type="button"
            className="md-btn md-btn-primary"
            disabled={readOnly || busy === "sync"}
            onClick={async () => {
              setBusy("sync");
              try {
                const r = await guestHouseService.syncIcal(ctx.id);
                ctx.notify({ type: "success", text: t.otSynced.replace("{a}", r.data.added).replace("{u}", r.data.updated).replace("{r}", r.data.removed) });
                load();
              } catch (e) {
                ctx.notify({ type: "error", text: e.message });
              } finally {
                setBusy("");
              }
            }}
          >
            {busy === "sync" ? <Loader2 size={16} className="md-spin" /> : <RefreshCw size={16} />} {busy === "sync" ? t.otSyncing : t.otSyncNow}
          </button>
        )
      }
    />
  );
  if (!d) return <ListSkeleton rows={4} />;
  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      ctx.notify({ type: "success", text: t.otCopied });
    } catch {
      window.prompt(t.otCopy, url);
    }
  };
  return (
    <div className="rs-col">
      {hero}
      {!a.active && <Perks ctx={ctx} addon="gh_ical" />}
      <section className="panel-card ghot-how">
        <h3 style={{ margin: 0 }}>{t.otHow}</h3>
        <ol>
          <li>{t.otStep1}</li>
          <li>{t.otStep2}</li>
          <li>{t.otStep3}</li>
        </ol>
        <small className="rs-muted">🔒 {t.otPrivacy}</small>
      </section>
      {!d.rooms.length && <p className="rs-muted">{t.otNoRooms}</p>}
      {d.rooms.map((r) => (
        <section key={r._id} className="panel-card ghot-room">
          <header>
            <span className="gh-stay-room" style={{ "--c": r.color || "#2563EB" }}>
              <BedDouble size={16} /> {r.name}
            </span>
            <small className="rs-muted">{r.type}</small>
          </header>
          <div className="ghot-export">
            <small>{t.otExport}</small>
            <div className="ghot-row">
              <code className={a.active ? "" : "off"}>{a.active ? r.export_url : r.export_url.replace(/[^/]{6}\.ics$/, "••••••.ics")}</code>
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={!a.active} onClick={() => copy(r.export_url)}>
                <Copy size={14} /> {t.otCopy}
              </button>
            </div>
          </div>
          <div className="ghot-feeds">
            <small>{t.otImport}</small>
            {r.feeds.map((f) => (
              <div key={f._id} className={`ghot-feed ${f.last_error ? "bad" : f.conflicts.length ? "warn" : ""}`}>
                <i className="ghot-logo" style={{ background: LOGO[f.source][1] }}>
                  {LOGO[f.source][0]}
                </i>
                <div className="ghot-feed-main">
                  <b>
                    {f.name} {!f.active && <em className="rs-pill">{t.otPaused}</em>}
                  </b>
                  <small className="ghot-url">{f.url}</small>
                  {f.last_error ? (
                    <small className="ghot-err">
                      <AlertTriangle size={13} /> {t.otError.replace("{err}", f.last_error)}
                    </small>
                  ) : (
                    <small className="rs-muted">
                      {f.last_ok_at ? (
                        <>
                          <CheckCircle2 size={13} className="ghot-ok" /> {t.otLast.replace("{time}", fmtTime(f.last_ok_at, lang)).replace("{n}", f.last_count)}
                        </>
                      ) : (
                        t.otNever
                      )}
                    </small>
                  )}
                  {f.conflicts.map((c) => (
                    <small key={c.uid} className="ghot-conf">
                      <AlertTriangle size={13} /> {t.otConflict.replace("{from}", fmtDay(c.from, lang)).replace("{to}", fmtDay(c.to, lang)).replace("{no}", c.with_no)}
                    </small>
                  ))}
                </div>
                {sure === f._id ? (
                  <button
                    type="button"
                    className="md-btn md-btn-danger sa-btn-sm"
                    autoFocus
                    onBlur={() => setSure("")}
                    onClick={async () => {
                      try {
                        await guestHouseService.removeIcal(ctx.id, f._id);
                        load();
                      } catch (e) {
                        ctx.notify({ type: "error", text: e.message });
                      }
                    }}
                  >
                    {t.otRemoveSure}
                  </button>
                ) : (
                  <button type="button" className="md-icon-btn" onClick={() => setSure(f._id)} aria-label={t.otRemove} disabled={readOnly}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
            {adding === r._id ? (
              <AddFeed
                ctx={ctx}
                room={r}
                sources={d.sources}
                onCancel={() => setAdding("")}
                onDone={(res) => {
                  setAdding("");
                  ctx.notify({
                    type: res.data.last_error ? "error" : "success",
                    text: res.data.last_error ? t.otError.replace("{err}", res.data.last_error) : t.otSynced.replace("{a}", res.result.added).replace("{u}", res.result.updated).replace("{r}", res.result.removed),
                  });
                  load();
                  ctx.reload();
                }}
              />
            ) : (
              <button type="button" className="gh-add" onClick={() => (a.active ? setAdding(r._id) : ctx.askBuy({ addon: "gh_ical" }))} disabled={readOnly}>
                <Link2 size={13} /> {t.otAdd}
              </button>
            )}
          </div>
        </section>
      ))}
      {a.active && d.rooms.length > 0 && (
        <div className="ghot-foot">
          <small className="rs-muted">{a.expires_at ? `${ctx.g.endsOn.replace("{date}", fmtDate(a.expires_at, lang))}` : ""}</small>
          {sure === "token" ? (
            <button
              type="button"
              className="md-btn md-btn-danger sa-btn-sm"
              autoFocus
              onBlur={() => setSure("")}
              onClick={async () => {
                await guestHouseService.icalToken(ctx.id).catch((e) => ctx.notify({ type: "error", text: e.message }));
                setSure("");
                load();
              }}
            >
              {t.otNewLinksSure}
            </button>
          ) : (
            <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={() => setSure("token")} disabled={readOnly}>
              <KeyRound size={14} /> {t.otNewLinks}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
