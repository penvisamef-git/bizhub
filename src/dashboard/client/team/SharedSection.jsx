import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, LogOut } from "lucide-react";
import { teamService } from "../../../api/services";
import { memo } from "../../../lib/memo";
import { bizTypeName } from "../../super_admin/BizTypes";
import { fill, useTeamText } from "./team-text";
import { RoleBadge } from "./TeamPage";
import { SharedSkeleton } from "./TeamSkeleton";
import "./team.css";

// the shared list, kept for BusinessPage (which screen to open, the banner)
export const loadShared = () =>
  teamService.shared().then((r) => {
    memo.set("sharedBusinesses", r.data?.businesses || []);
    return r.data || { businesses: [], invites: [] };
  });

function Logo({ b }) {
  return <span className="tm-av">{b.logo_url ? <img src={b.logo_url} alt="" /> : (b.name || "?").slice(0, 1).toUpperCase()}</span>;
}

// "Shared with me" under My businesses: businesses other owners added me to + invites to accept
export default function SharedSection() {
  const { tt, lang } = useTeamText();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => {
    loadShared()
      .then(setData)
      .catch(() => setData({ businesses: [], invites: [] }));
  }, []);
  useEffect(load, [load]);

  const act = async (key, fn, then) => {
    setBusy(key);
    setError("");
    try {
      const r = await fn();
      await loadShared().then(setData);
      then?.(r);
    } catch (e) {
      setError(e.message || tt.error);
    } finally {
      setBusy("");
    }
  };

  // the skeleton only when this person had shared businesses last time (most people have none: show nothing)
  if (!data) return (memo.get("sharedBusinesses") || []).length ? <SharedSkeleton /> : null;
  if (!data.businesses.length && !data.invites.length) return null;
  return (
    <section className="panel-card tm-shared" data-testid="team-shared">
      <div className="db-sec-head">
        <h3>{tt.shared}</h3>
      </div>
      {error && <div className="md-form-error">{error}</div>}
      {data.invites.length > 0 && (
        <>
          <div className="tm-sec" style={{ marginTop: 4 }}>
            {tt.invites}
          </div>
          <div className="tm-card tm-rows">
            {data.invites.map((b) => (
              <div className="tm-row" key={b.member_id} data-testid="team-invite">
                <Logo b={b} />
                <span className="tm-who">
                  <b>{b.name}</b>
                  <small>
                    {bizTypeName(b.category, lang)} · {fill(tt.sharedBy, { name: b.owner_name })}
                  </small>
                </span>
                <RoleBadge role={b.role} tt={tt} />
                <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={!!busy} onClick={() => act(`no-${b.member_id}`, () => teamService.answer(b.member_id, false))}>
                  {tt.decline}
                </button>
                <button
                  type="button"
                  className="md-btn md-btn-primary sa-btn-sm"
                  disabled={!!busy}
                  onClick={() => act(`yes-${b.member_id}`, () => teamService.answer(b.member_id, true), () => navigate(`/app/business/${b._id}`))}
                  data-testid="team-accept"
                >
                  {tt.accept}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {data.businesses.length > 0 && (
        <div className="tm-card tm-rows" style={{ marginTop: data.invites.length ? 12 : 0 }}>
          {data.businesses.map((b) => (
            <div className={`tm-row ${b.team_on ? "link" : ""}`} key={b._id} onClick={() => b.team_on && navigate(`/app/business/${b._id}`)} data-testid="team-shared-biz">
              <Logo b={b} />
              <span className="tm-who">
                <b>{b.name}</b>
                <small className={b.team_on ? "" : "tm-paused"}>{b.team_on ? `${bizTypeName(b.category, lang)} · ${fill(tt.sharedBy, { name: b.owner_name })}` : tt.paused}</small>
              </span>
              <RoleBadge role={b.role} tt={tt} />
              <button
                type="button"
                className="md-icon-btn"
                aria-label={tt.leave}
                title={tt.leave}
                disabled={!!busy}
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(fill(tt.leaveAsk, { name: b.name }))) act(`lv-${b._id}`, () => teamService.leave(b._id));
                }}
              >
                <LogOut size={16} />
              </button>
              {b.team_on && <ChevronRight size={18} aria-hidden="true" />}
            </div>
          ))}
        </div>
      )}
      <p className="tm-note">{tt.sharedNote}</p>
    </section>
  );
}
