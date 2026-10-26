import { Link } from "react-router-dom";
import { Eye, ShieldCheck, Users } from "lucide-react";
import { fill, useTeamText } from "./team-text";
import "./team.css";

// on top of every business screen: the owner's Team button, or what a team member may do here
export default function TeamBar({ id, shared }) {
  const { tt } = useTeamText();
  if (shared) {
    const view = shared.role === "view";
    return (
      <div className={`tm-banner ${view ? "view" : "admin"}`} role="status" data-testid={view ? "team-view-banner" : "team-admin-banner"}>
        {view ? <Eye size={17} /> : <ShieldCheck size={17} />}
        <span>{view ? tt.viewBanner : fill(tt.adminBanner, { name: shared.owner_name })}</span>
      </div>
    );
  }
  return (
    <div className="tm-ownbar">
      <Link to={`/app/business/${id}/team`} className="md-btn md-btn-ghost sa-btn-sm" data-testid="team-open">
        <Users size={15} /> {tt.teamBtn}
      </Link>
    </div>
  );
}
