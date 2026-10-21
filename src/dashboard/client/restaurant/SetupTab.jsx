import { Check, ChevronRight, MonitorSmartphone } from "lucide-react";

const ORDER = ["profile", "money", "tables", "menu", "staff"];

// Setup: the 5 steps before the POS can sell
export default function SetupTab({ ctx }) {
  const { r, overview } = ctx;
  const { steps, done, total, ready } = overview.setup;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="rs-setup">
      <section className="panel-card rs-setup-head">
        <div className="rs-ring" style={{ "--p": pct }} role="img" aria-label={r.stepsDone.replace("{done}", done).replace("{total}", total)}>
          <span>
            <b>{done}</b>/{total}
          </span>
        </div>
        <div>
          <h2>{r.setupTitle}</h2>
          <p className="rs-muted">{r.setupSub}</p>
        </div>
      </section>

      <ol className="rs-steps">
        {ORDER.map((key, i) => (
          <li key={key} className={steps[key] ? "done" : ""}>
            <button type="button" className="panel-card rs-step" onClick={() => ctx.go(key)}>
              <span className="rs-step-n">{steps[key] ? <Check size={16} /> : i + 1}</span>
              <span className="rs-step-text">
                <b>{r.steps[key][0]}</b>
                <small>{r.steps[key][1]}</small>
              </span>
              {steps[key] ? <span className="rs-pill on">{r.doneTag}</span> : <span className="rs-step-open">{r.open}</span>}
              <ChevronRight size={18} className="rs-muted" />
            </button>
          </li>
        ))}
      </ol>

      <section className={`panel-card rs-pos ${ready ? "ready" : ""}`}>
        <MonitorSmartphone size={28} />
        <div>
          <b>{ready ? r.posReady : r.posNotReady}</b>
          {ready && <small>{r.posReadySub}</small>}
        </div>
      </section>
    </div>
  );
}
