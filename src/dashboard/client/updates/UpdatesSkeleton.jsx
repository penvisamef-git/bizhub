import { Skel } from "../../../components/skeleton/Skeleton";

// System activity while it loads: title, then two version cards on a line
export function UpdatesSkeleton() {
  return (
    <div className="md-page sa-page" style={{ maxWidth: 860 }} role="status" aria-busy="true" aria-label="Loading">
      <Skel w="55%" h={13} />
      {[0, 1].map((v) => (
        <div key={v} style={{ display: "flex", gap: 16, marginTop: 22 }}>
          <Skel w={36} h={36} r={18} style={{ flex: "none", marginTop: 18 }} />
          <div className="sk-panel sk-col" style={{ flex: 1, gap: 12, border: "1px solid var(--line)", borderRadius: 20 }}>
            <div className="sk-row">
              <Skel w={64} h={26} r={999} />
              <Skel w={120} h={26} r={999} />
            </div>
            <Skel w="40%" h={20} />
            <Skel w="75%" h={12} />
            {Array.from({ length: v ? 3 : 5 }, (_, i) => (
              <div key={i} style={{ display: "flex", gap: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                <Skel w={70} h={22} r={999} />
                <Skel w={`${70 - (i % 3) * 12}%`} h={13} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
