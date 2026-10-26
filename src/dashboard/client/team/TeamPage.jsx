import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Link2, RefreshCw, Trash2, UserPlus, Users } from "lucide-react";
import { licenseService, teamService } from "../../../api/services";
import { auth } from "../../../lib/auth";
import { memo } from "../../../lib/memo";
import { useNotice } from "../../super_admin/parts";
import PurchaseModal from "../../../components/purchase/PurchaseModal";
import AddMemberModal from "./AddMemberModal";
import { day, fill, useTeamText } from "./team-text";
import "../../super_admin/super-admin.css";
import "./team.css";

export const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export function Avatar({ person }) {
  return <span className="tm-av">{person?.photo ? <img src={person.photo} alt="" /> : initials(person?.name)}</span>;
}

export function RoleBadge({ role, tt }) {
  return <span className={`tm-badge ${role === "admin" ? "admin" : role === "view" ? "view" : role === "owner" ? "owner" : "wait"}`}>{role === "admin" ? tt.admin : role === "view" ? tt.view : role === "owner" ? tt.owner : tt.waiting}</span>;
}

// /app/business/:id/team — the owner adds people to one business as Admin or View only
export default function TeamPage() {
  const { id } = useParams();
  const { tt, lang } = useTeamText();
  const me = auth.getClientLogin() || {};
  const known = (memo.get("myBusinesses") || []).find((b) => b._id === id);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState(false); // the coin window (asks "Pay 5 coins?" before paying)
  const [notice, setNotice] = useNotice();
  const biz = known || data?.business;

  const load = useCallback(() => {
    teamService
      .get(id)
      .then((r) => {
        setData(r.data);
        setError("");
      })
      .catch((e) => setError(e.message || tt.error));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);

  const run = async (key, fn, ok) => {
    setBusy(key);
    try {
      const r = await fn();
      if (r?.data?.members) setData(r.data);
      if (ok) setNotice({ type: "success", text: ok });
      return r;
    } catch (e) {
      setNotice({ type: "error", text: e.message || tt.error });
      return null;
    } finally {
      setBusy("");
    }
  };

  const buy = () => setPaying(true);

  const lic = data?.license;
  const on = !!lic?.active;
  const members = data?.members || [];

  return (
    <div className="md-page sa-page tm-page">
      {notice}
      {paying && data && (
        <PurchaseModal
          stage={
            <div className="tm-stage">
              <Users size={60} />
              <b>{tt.team}</b>
              <small>{biz?.name || ""}</small>
            </div>
          }
          badge={tt.team}
          title={tt.lockedTitle}
          sub={tt.lockedSub}
          perks={tt.lockedPoints}
          price={data.price}
          buyLabel={fill(tt.payLabel, { price: data.price })}
          buy={() => licenseService.buy(id, "team", data.license?.expires_at ?? null)}
          doneSub={tt.paidSub}
          onDone={() => load()}
          onClose={() => setPaying(false)}
        />
      )}
      <div className="tm-head">
        <Link to={`/app/business/${id}`} className="md-icon-btn" aria-label={tt.back} title={tt.back}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          {biz && <small>{biz.name}</small>}
          <h2>{tt.team}</h2>
        </div>
      </div>
      <p className="tm-sub">{tt.teamSub}</p>
      {error && <div className="md-form-error">{error}</div>}
      {!data && !error && <p className="tm-sub">{tt.loading}</p>}

      {data && !on && (
        <section className="tm-card tm-lock" data-testid="team-locked">
          <Users size={28} />
          <h3>{tt.lockedTitle}</h3>
          <p>{tt.lockedSub}</p>
          <ul>
            {tt.lockedPoints.map((p) => (
              <li key={p}>
                <Check size={16} />
                {p}
              </li>
            ))}
          </ul>
          {lic?.status === "expired" && <div className="tm-status bad">{fill(tt.expired, { date: day(lic.expires_at, lang) })}</div>}
          <div>
            <button type="button" className="md-btn md-btn-primary" onClick={buy} disabled={busy === "buy"} data-testid="team-unlock">
              {busy === "buy" ? <RefreshCw size={15} className="md-spin" /> : <Users size={16} />} {fill(lic?.status === "expired" ? tt.renew : tt.unlock, { price: data.price })}
            </button>
          </div>
          {members.length > 0 && <p className="tm-note">{tt.teamCount(members.length)}</p>}
        </section>
      )}

      {data && on && (
        <>
          <div className="tm-status">
            <Check size={16} /> {lic.forever ? tt.team : fill(tt.ends, { date: day(lic.expires_at, lang) })}
            {lic.status === "expiring" && (
              <button type="button" className="md-btn md-btn-ghost sa-btn-sm" onClick={buy} disabled={busy === "buy"}>
                {fill(tt.renew, { price: data.price })}
              </button>
            )}
          </div>

          <div className="tm-sec">{tt.members}</div>
          <section className="tm-card tm-rows" data-testid="team-members">
            <div className="tm-row">
              <Avatar person={{ name: me.name, photo: me.photo }} />
              <span className="tm-who">
                <b>
                  {me.name} ({tt.you})
                </b>
                {me.bizhub_id && <small>{me.bizhub_id}</small>}
              </span>
              <RoleBadge role="owner" tt={tt} />
            </div>
            {members.map((m) => (
              <div className="tm-row" key={m._id} data-testid="team-member">
                <Avatar person={m.person} />
                <span className="tm-who">
                  <b>{m.person?.name}</b>
                  <small>{[m.person?.bizhub_id, m.status === "invited" ? tt.invited : fill(tt.joined, { date: day(m.joined_at, lang) }), m.status !== "invited" && m.via === "link" && tt.viaLink].filter(Boolean).join(" · ")}</small>
                </span>
                <label className="sr-only" htmlFor={`role-${m._id}`}>
                  {tt.role}
                </label>
                <select id={`role-${m._id}`} value={m.role} disabled={!!busy} onChange={(e) => run(`role-${m._id}`, () => teamService.setRole(id, m._id, e.target.value))}>
                  <option value="admin">{tt.admin}</option>
                  <option value="view">{tt.view}</option>
                </select>
                <button
                  type="button"
                  className="md-icon-btn"
                  aria-label={tt.remove}
                  title={tt.remove}
                  disabled={!!busy}
                  onClick={() => window.confirm(fill(tt.removeAsk, { name: m.person?.name })) && run(`rm-${m._id}`, () => teamService.remove(id, m._id))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {members.length === 0 && <p className="tm-note tm-pad">{tt.none}</p>}
          </section>

          {data.links.length > 0 && (
            <>
              <div className="tm-sec">{tt.openLinks}</div>
              <section className="tm-card tm-rows">
                {data.links.map((l) => (
                  <div className="tm-row" key={l._id}>
                    <span className="tm-av">
                      <Link2 size={18} />
                    </span>
                    <span className="tm-who">
                      <b>{l.role === "admin" ? tt.admin : tt.view}</b>
                      <small>
                        {l.code} · {fill(tt.endsOn, { date: day(l.expires_at, lang) })}
                      </small>
                    </span>
                    <button type="button" className="md-btn md-btn-ghost sa-btn-sm" disabled={!!busy} onClick={() => run(`ln-${l._id}`, () => teamService.cancelLink(id, l._id))}>
                      {tt.cancelLink}
                    </button>
                  </div>
                ))}
              </section>
            </>
          )}

          <p className="tm-note">{tt.ownerOnlyNote}</p>
          <div className="tm-actions">
            <button type="button" className="md-btn md-btn-primary" onClick={() => setAdding(true)} data-testid="team-add">
              <UserPlus size={16} /> {tt.add}
            </button>
          </div>
        </>
      )}

      {adding && (
        <AddMemberModal
          businessId={id}
          onClose={() => setAdding(false)}
          onChanged={(team) => team && setData(team)}
          onInvited={() => {
            setAdding(false);
            setNotice({ type: "success", text: tt.inviteSent });
          }}
        />
      )}
    </div>
  );
}
