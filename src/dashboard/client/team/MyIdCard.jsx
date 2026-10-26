import { useEffect, useState } from "react";
import { Copy, IdCard } from "lucide-react";
import { teamService } from "../../../api/services";
import { auth } from "../../../lib/auth";
import { QrSvg } from "./AddMemberModal";
import { useTeamText } from "./team-text";
import { IdSkeleton } from "./TeamSkeleton";
import "./team.css";

// Account → My BizHub ID: what a business owner types to add me to their team
export default function MyIdCard() {
  const { tt } = useTeamText();
  const [id, setId] = useState(() => auth.getClientLogin()?.bizhub_id || "");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    teamService
      .myId()
      .then((r) => {
        const v = r.data?.bizhub_id || "";
        setId(v);
        const login = auth.getClientLogin();
        if (login && v && login.bizhub_id !== v) auth.setClientLogin({ ...login, bizhub_id: v });
      })
      .catch(() => {});
  }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* visible to copy by hand */
    }
  };
  return (
    <section className="ac-card" data-testid="team-my-id">
      <header className="ac-card-head">
        <span className="ac-card-icon">
          <IdCard size={18} />
        </span>
        <div>
          <h3>{tt.myId}</h3>
        </div>
      </header>
      {!id ? (
        <IdSkeleton />
      ) : (
      <div className="tm-id">
        <QrSvg text={id} />
        <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 200 }}>
          <span className="tm-id-num">{id}</span>
          <span className="md-hint">{tt.myIdSub}</span>
          <div>
            <button type="button" className="ac-btn ac-btn-ghost" onClick={copy} disabled={!id}>
              <Copy size={15} /> {copied ? tt.copied : tt.copyId}
            </button>
          </div>
        </div>
      </div>
      )}
    </section>
  );
}
