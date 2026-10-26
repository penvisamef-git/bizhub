import { createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { useTeamText } from "./team-text";

// BusinessPage tells the dashboards whether this is the owner (null) or a team member ({ role, owner_name })
export const TeamShared = createContext(null);

// "Team" in the left menu of every business, right under Add-ons (owners only)
export default function TeamNavLink({ id, onGo }) {
  const shared = useContext(TeamShared);
  const navigate = useNavigate();
  const { tt } = useTeamText();
  if (shared) return null;
  return (
    <button
      type="button"
      onClick={() => {
        onGo?.();
        navigate(`/app/business/${id}/team`);
      }}
      data-testid="team-open"
    >
      <Users size={17} />
      <span className="rs-nav-text">{tt.teamBtn}</span>
    </button>
  );
}
