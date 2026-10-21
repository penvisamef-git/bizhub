import { useId } from "react";

// Gold coin icon (used next to coin numbers). Each copy gets its own gradient id,
// so several coins on one page always render (duplicate SVG ids can hide them in some browsers).
export default function CoinIcon({ size = 28 }) {
  const id = `bh-coin-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd25e" />
          <stop offset="1" stopColor="#f0a020" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="17" r="14" fill="#c97a10" />
      <circle cx="16" cy="15" r="14" fill={`url(#${id})`} />
      <circle cx="16" cy="15" r="10.5" fill="none" stroke="#fff3c4" strokeOpacity="0.85" strokeWidth="1.6" />
      <text x="16" y="20" textAnchor="middle" fontSize="13" fontWeight="800" fill="#9a5400" fontFamily="Arial, sans-serif">
        B
      </text>
    </svg>
  );
}
