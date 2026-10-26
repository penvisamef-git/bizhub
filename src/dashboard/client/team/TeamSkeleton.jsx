import { Skel } from "../../../components/skeleton/Skeleton";

// Grey shapes in the same layout as the Team screens while they load.
// Only skeleton classes + inline styles, so the app layout can show them before team.css arrives.
const Wrap = ({ children, style }) => (
  <div className="sk-wrap" role="status" aria-busy="true" aria-label="Loading" style={style}>
    {children}
  </div>
);
const Row = ({ i, end = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: i ? "1px solid var(--line)" : 0 }}>
    <Skel w={42} h={42} r={21} />
    <span className="sk-col" style={{ flex: 1, gap: 7 }}>
      <Skel w={`${46 - (i % 3) * 8}%`} h={14} />
      <Skel w={`${30 + (i % 3) * 6}%`} h={11} />
    </span>
    {end && <Skel w={i ? 98 : 64} h={i ? 36 : 22} r={i ? 10 : 999} />}
  </div>
);
const Head = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
    <Skel w={36} h={36} r={18} />
    <span className="sk-col" style={{ gap: 8 }}>
      <Skel w={110} h={11} />
      <Skel w={90} h={24} />
    </span>
  </div>
);

// the status line + members list (inside the Team page)
export function TeamSkeleton() {
  return (
    <Wrap style={{ maxWidth: 760 }}>
      <Skel w="100%" h={46} r={14} />
      <Skel w={90} h={11} style={{ display: "block", margin: "22px 0 10px" }} />
      <div className="sk-panel" style={{ padding: 0, border: "1px solid var(--line)", borderRadius: 18 }}>
        {[0, 1, 2].map((i) => (
          <Row i={i} key={i} />
        ))}
      </div>
    </Wrap>
  );
}

// the whole Team page while its code downloads
export function TeamRouteSkeleton() {
  return (
    <div className="md-page sa-page">
      <Head />
      <Skel w="52%" h={13} style={{ display: "block", marginBottom: 20 }} />
      <TeamSkeleton />
    </div>
  );
}

// the invite card on /app/join/:code
export function JoinSkeleton() {
  return (
    <Wrap style={{ width: "100%", justifySelf: "stretch" }}>
      <div className="sk-panel" style={{ border: "1px solid var(--line)", borderRadius: 18, display: "grid", gap: 14, justifyItems: "center", padding: "26px 22px" }}>
        <Skel w={72} h={72} r={20} />
        <Skel w="44%" h={11} />
        <Skel w="62%" h={22} />
        <Skel w="38%" h={11} />
        <Skel w="100%" h={96} r={14} />
        <Skel w="46%" h={11} />
        <span style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
          <Skel w="100%" h={42} r={999} />
          <Skel w="100%" h={42} r={999} />
        </span>
      </div>
    </Wrap>
  );
}
export function JoinRouteSkeleton() {
  return (
    <div className="md-page sa-page">
      <div style={{ width: "100%", maxWidth: 460, margin: "24px auto", display: "grid", gap: 16 }}>
        <Skel w={160} h={24} style={{ justifySelf: "center" }} />
        <JoinSkeleton />
      </div>
    </div>
  );
}

// Account → My BizHub ID, before the ID arrives
export function IdSkeleton() {
  return (
    <Wrap style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <Skel w={104} h={104} r={12} />
      <span className="sk-col" style={{ gap: 10, flex: 1, minWidth: 200 }}>
        <Skel w={170} h={28} />
        <Skel w="80%" h={11} />
        <Skel w={110} h={36} r={999} />
      </span>
    </Wrap>
  );
}

// Businesses → Shared with me, while the list loads
export function SharedSkeleton() {
  return (
    <section className="panel-card tm-shared">
      <Wrap>
        <Skel w={150} h={16} />
        <div style={{ marginTop: 14, border: "1px solid var(--line)", borderRadius: 18 }}>
          {[0, 1].map((i) => (
            <Row i={i} key={i} end={false} />
          ))}
        </div>
      </Wrap>
    </section>
  );
}
