// Bizi — the BizHub helper (v3.0.0): one drawing, six moods. The app gets the same drawing later.
//   <BiziFace mood="idle|listening|thinking|talking|happy|worried" size={64} />
// It blinks and bobs a little while waiting (bizi.css; still when the person prefers less motion).
import "./bizi.css";

const MOODS = ["idle", "listening", "thinking", "talking", "happy", "worried"];

export default function BiziFace({ mood = "idle", size = 64, title }) {
  const m = MOODS.includes(mood) ? mood : "idle";
  return (
    <svg className={`bizi-face m-${m}`} width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={title || "Bizi"}>
      <defs>
        <linearGradient id="biziBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F08A3C" />
          <stop offset="1" stopColor="#D9521A" />
        </linearGradient>
      </defs>
      <g className="bizi-bob">
        <line x1="100" y1="50" x2="100" y2="30" stroke="#D9521A" strokeWidth="6" strokeLinecap="round" />
        <circle cx="100" cy="21" r="11" fill="#FFF7EF" stroke="#E0581A" strokeWidth="5" />
        <circle cx="100" cy="21" r="3.5" fill="#E0581A" />
        <ellipse cx="32" cy="130" rx="12" ry="17" fill="#D9521A" />
        <ellipse cx="168" cy="130" rx="12" ry="17" fill="#D9521A" />
        <rect x="32" y="48" width="136" height="134" rx="56" fill="url(#biziBody)" />
        <rect x="49" y="76" width="102" height="74" rx="32" fill="#FFF7EF" />
        <circle cx="65" cy="128" r="6" fill="#F4A27A" opacity="0.75" />
        <circle cx="135" cy="128" r="6" fill="#F4A27A" opacity="0.75" />
        {m === "idle" && (
          <g>
            <g className="bizi-eyes">
              <circle cx="80" cy="108" r="8" fill="#16171B" />
              <circle cx="120" cy="108" r="8" fill="#16171B" />
              <circle cx="83" cy="105" r="2.5" fill="#FFFFFF" />
              <circle cx="123" cy="105" r="2.5" fill="#FFFFFF" />
            </g>
            <path d="M88 128 Q100 138 112 128" stroke="#16171B" strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
        )}
        {m === "listening" && (
          <g>
            <g className="bizi-eyes">
              <circle cx="80" cy="107" r="9.5" fill="#16171B" />
              <circle cx="120" cy="107" r="9.5" fill="#16171B" />
              <circle cx="83.5" cy="103.5" r="3" fill="#FFFFFF" />
              <circle cx="123.5" cy="103.5" r="3" fill="#FFFFFF" />
            </g>
            <circle cx="100" cy="132" r="5" fill="#16171B" />
            <path className="bizi-wave" d="M184 96 Q193 116 184 136" stroke="#E0581A" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path className="bizi-wave w2" d="M193 86 Q207 116 193 146" stroke="#E0581A" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.45" />
          </g>
        )}
        {m === "thinking" && (
          <g>
            <circle cx="84" cy="101" r="7.5" fill="#16171B" />
            <circle cx="124" cy="101" r="7.5" fill="#16171B" />
            <path d="M91 131 L109 129" stroke="#16171B" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle className="bizi-dot d1" cx="150" cy="40" r="4.5" fill="#FFFFFF" stroke="#E0581A" strokeWidth="3" />
            <circle className="bizi-dot d2" cx="164" cy="27" r="6.5" fill="#FFFFFF" stroke="#E0581A" strokeWidth="3" />
            <circle className="bizi-dot d3" cx="182" cy="14" r="9" fill="#FFFFFF" stroke="#E0581A" strokeWidth="3" />
          </g>
        )}
        {m === "talking" && (
          <g>
            <circle cx="80" cy="106" r="8" fill="#16171B" />
            <circle cx="120" cy="106" r="8" fill="#16171B" />
            <circle cx="83" cy="103" r="2.5" fill="#FFFFFF" />
            <circle cx="123" cy="103" r="2.5" fill="#FFFFFF" />
            <g className="bizi-mouth">
              <path d="M86 123 Q100 147 114 123 Z" fill="#16171B" />
              <ellipse cx="100" cy="135" rx="6" ry="3.5" fill="#F4A27A" />
            </g>
          </g>
        )}
        {m === "happy" && (
          <g>
            <path d="M71 110 Q80 98 89 110" stroke="#16171B" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M111 110 Q120 98 129 110" stroke="#16171B" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M83 122 Q100 145 117 122 Z" fill="#16171B" />
            <path className="bizi-spark" d="M30 44 L34 54 L44 58 L34 62 L30 72 L26 62 L16 58 L26 54 Z" fill="#E8A21A" />
            <path className="bizi-spark s2" d="M172 56 L175 63 L182 66 L175 69 L172 76 L169 69 L162 66 L169 63 Z" fill="#E8A21A" />
          </g>
        )}
        {m === "worried" && (
          <g>
            <path d="M69 92 L88 98" stroke="#16171B" strokeWidth="4" strokeLinecap="round" />
            <path d="M131 92 L112 98" stroke="#16171B" strokeWidth="4" strokeLinecap="round" />
            <circle cx="80" cy="110" r="7" fill="#16171B" />
            <circle cx="120" cy="110" r="7" fill="#16171B" />
            <path d="M89 132 Q94.5 126 100 132 Q105.5 138 111 132" stroke="#16171B" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M157 60 Q166 74 157 82 Q148 74 157 60 Z" fill="#7DB8EC" />
          </g>
        )}
      </g>
    </svg>
  );
}
