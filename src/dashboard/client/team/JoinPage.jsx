import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Store, X } from "lucide-react";
import { teamService } from "../../../api/services";
import { auth } from "../../../lib/auth";
import { bizTypeName } from "../../super_admin/BizTypes";
import { loadShared } from "./SharedSection";
import { fill, useTeamText } from "./team-text";
import { RoleBadge } from "./TeamPage";
import { JoinSkeleton } from "./TeamSkeleton";
import "./team.css";

// /app/join/:code — someone opened an invite link (logged in first; RequireAuth brings them back here)
export default function JoinPage() {
  const { code } = useParams();
  const { tt, lang } = useTeamText();
  const navigate = useNavigate();
  const me = auth.getClientLogin() || {};
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    teamService
      .joinInfo(code)
      .then((r) => setInfo(r.data))
      .catch((e) => setError(e.response?.code === "link_gone" || e.status === 410 ? tt.gone : e.message || tt.error));
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const join = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await teamService.join(code);
      await loadShared().catch(() => {});
      navigate(`/app/business/${r.data.business_id}`, { replace: true });
    } catch (e) {
      setError(e.response?.code === "link_gone" ? tt.gone : e.message || tt.error);
      setBusy(false);
    }
  };

  const view = info?.role === "view";
  return (
    <div className="md-page sa-page">
      <div className="tm-join">
        <h2>{tt.joinTitle}</h2>
        {error && <div className="md-form-error">{error}</div>}
        {!info && !error && <JoinSkeleton />}
        {info && (
          <div className="tm-card" data-testid="team-join">
            <span className="tm-logo">{info.business.logo_url ? <img src={info.business.logo_url} alt="" /> : <Store size={34} />}</span>
            <span className="md-hint">{fill(tt.joinInvites, { name: info.owner_name })}</span>
            <b style={{ fontSize: 22 }}>{info.business.name}</b>
            <span className="md-hint">{bizTypeName(info.business.category, lang)}</span>
            <div className="tm-list">
              <div>
                {tt.joinAs} <RoleBadge role={info.role} tt={tt} />
              </div>
              <div>
                <Check size={16} className="yes" /> {view ? tt.canSee : tt.canAll}
              </div>
              <div>
                <X size={16} className="no" /> {view ? tt.cantChange : tt.cantBuy}
              </div>
            </div>
            <span className="md-hint">{fill(tt.signedAs, { name: me.name || "", id: me.bizhub_id || "" }).replace(/ · $/, "")}</span>
            {info.is_owner ? (
              <p className="tm-sub">{tt.isOwner}</p>
            ) : info.already === "active" ? (
              <Link className="md-btn md-btn-primary" to={`/app/business/${info.business._id}`}>
                {tt.already} {tt.open}
              </Link>
            ) : (
              <div className="tm-two" style={{ justifySelf: "stretch" }}>
                <Link className="md-btn md-btn-ghost" to="/app/businesses">
                  {tt.decline}
                </Link>
                <button type="button" className="md-btn md-btn-primary" onClick={join} disabled={busy} data-testid="team-join-accept">
                  {tt.acceptOpen}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
