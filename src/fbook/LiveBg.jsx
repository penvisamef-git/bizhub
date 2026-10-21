import { memo } from "react";

// a stable "random" number 0–1 for particle i (the same on every render, so nothing jumps)
const rnd = (i, seed) => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const range = (i, seed, a, b) => a + rnd(i, seed) * (b - a);
const many = (n, make) => Array.from({ length: n }, (_, i) => make(i));

// the moving background of a live library design: CSS only (transform / opacity), stops when the reader asks for less motion
function LiveBg({ effect, fx, small = false }) {
  const k = small ? 0.45 : 1; // fewer pieces on small previews
  const n = (x) => Math.max(4, Math.round(x * k));
  let body = null;
  if (effect === "snow")
    body = many(n(44), (i) => {
      const d = range(i, 1, 9, 19);
      return (
        <i
          key={i}
          style={{ left: `${range(i, 2, 0, 100)}%`, width: range(i, 3, 2, 6), height: range(i, 3, 2, 6), opacity: range(i, 4, 0.4, 0.95), animationDuration: `${d}s`, animationDelay: `-${range(i, 5, 0, d)}s`, "--dx": `${range(i, 6, -60, 60)}px` }}
        />
      );
    });
  else if (effect === "rain")
    body = many(n(60), (i) => {
      const d = range(i, 1, 0.55, 1.15);
      return <i key={i} style={{ left: `${range(i, 2, -5, 105)}%`, height: range(i, 3, 40, 90), opacity: range(i, 4, 0.25, 0.7), animationDuration: `${d}s`, animationDelay: `-${range(i, 5, 0, d)}s` }} />;
    });
  else if (effect === "stars")
    body = [
      ...many(n(80), (i) => (
        <i key={i} style={{ left: `${range(i, 2, 0, 100)}%`, top: `${range(i, 3, 0, 100)}%`, width: range(i, 4, 1, 3.2), height: range(i, 4, 1, 3.2), animationDuration: `${range(i, 5, 2, 5)}s`, animationDelay: `-${range(i, 6, 0, 5)}s` }} />
      )),
      <b key="s1" className="shoot" style={{ top: "12%", left: "70%" }} />,
      <b key="s2" className="shoot" style={{ top: "30%", left: "35%", animationDelay: "-4.5s" }} />,
    ];
  else if (effect === "fireflies")
    body = many(n(26), (i) => (
      <i
        key={i}
        style={{
          left: `${range(i, 2, 0, 100)}%`,
          top: `${range(i, 3, 10, 100)}%`,
          animationDuration: `${range(i, 4, 7, 15)}s, ${range(i, 5, 1.6, 3.4)}s`,
          animationDelay: `-${range(i, 6, 0, 15)}s, -${range(i, 7, 0, 3)}s`,
          "--dx": `${range(i, 8, -90, 90)}px`,
          "--dy": `${range(i, 9, -90, 60)}px`,
        }}
      />
    ));
  else if (effect === "bubbles")
    body = many(n(26), (i) => {
      const s = range(i, 3, 8, 36);
      const d = range(i, 1, 9, 20);
      return <i key={i} style={{ left: `${range(i, 2, 0, 100)}%`, width: s, height: s, animationDuration: `${d}s`, animationDelay: `-${range(i, 5, 0, d)}s`, "--dx": `${range(i, 6, -40, 40)}px` }} />;
    });
  else if (effect === "aurora") body = [<b key="a" />, <b key="b" />, <b key="c" />];
  else if (effect === "petals" || effect === "leaves")
    body = many(n(effect === "petals" ? 30 : 22), (i) => {
      const d = range(i, 1, 10, 19);
      const s = range(i, 3, effect === "petals" ? 8 : 12, effect === "petals" ? 15 : 22);
      return (
        <i
          key={i}
          style={{
            left: `${range(i, 2, -5, 100)}%`,
            width: s,
            height: s * (effect === "petals" ? 0.7 : 1),
            animationDuration: `${d}s`,
            animationDelay: `-${range(i, 5, 0, d)}s`,
            "--dx": `${range(i, 6, 40, 160)}px`,
            "--r": `${range(i, 7, 240, 720)}deg`,
            filter: effect === "leaves" ? `hue-rotate(${range(i, 8, -35, 25)}deg)` : undefined,
          }}
        />
      );
    });
  else if (effect === "sparkles")
    body = [
      <b key="beam" className="beam" />,
      <b key="beam2" className="beam b2" />,
      ...many(n(42), (i) => {
        const d = range(i, 1, 14, 26);
        return (
          <i
            key={i}
            style={{
              left: `${range(i, 2, 5, 95)}%`,
              width: range(i, 3, 1.5, 3.5),
              height: range(i, 3, 1.5, 3.5),
              animationDuration: `${d}s, ${range(i, 4, 2, 4)}s`,
              animationDelay: `-${range(i, 5, 0, d)}s, -${range(i, 6, 0, 4)}s`,
              "--dx": `${range(i, 7, -50, 50)}px`,
            }}
          />
        );
      }),
    ];
  else if (effect === "clouds")
    body = many(n(7), (i) => {
      const d = range(i, 1, 55, 120);
      return <b key={i} style={{ top: `${range(i, 2, 2, 70)}%`, width: range(i, 3, 200, 460), height: range(i, 3, 200, 460) * 0.42, opacity: range(i, 4, 0.45, 0.9), animationDuration: `${d}s`, animationDelay: `-${range(i, 5, 0, d)}s` }} />;
    });
  else if (effect === "glow")
    body = [
      <b key="v" className="vig" />,
      <b key="v2" className="vig v2" />,
      ...many(n(16), (i) => {
        const d = range(i, 1, 6, 12);
        return <i key={i} style={{ left: `${range(i, 2, 5, 95)}%`, animationDuration: `${d}s`, animationDelay: `-${range(i, 5, 0, d)}s`, "--dx": `${range(i, 6, -60, 60)}px` }} />;
      }),
    ];
  else if (effect === "rays") body = [<b key="r" className="rays" />, <b key="g" className="glowsun" />];
  else if (effect === "lava")
    body = many(7, (i) => {
      const s = range(i, 3, 180, 380);
      return (
        <b
          key={i}
          style={{
            left: `${range(i, 2, -10, 85)}%`,
            top: `${range(i, 4, -10, 80)}%`,
            width: s,
            height: s,
            animationDuration: `${range(i, 1, 16, 30)}s, ${range(i, 5, 9, 15)}s`,
            animationDelay: `-${range(i, 6, 0, 30)}s, -${range(i, 7, 0, 15)}s`,
            "--dx": `${range(i, 8, -160, 160)}px`,
            "--dy": `${range(i, 9, -140, 140)}px`,
          }}
        />
      );
    });
  else if (effect === "pages")
    body = many(n(15), (i) => {
      const d = range(i, 1, 14, 26);
      return <i key={i} style={{ left: `${range(i, 2, -10, 95)}%`, width: range(i, 3, 18, 34), animationDuration: `${d}s`, animationDelay: `-${range(i, 5, 0, d)}s`, "--dx": `${range(i, 6, 80, 260)}px`, "--r": `${range(i, 7, 180, 540)}deg` }} />;
    });
  else if (effect === "synthgrid") body = [<b key="sun" className="sun" />, <b key="grid" className="grid" />];
  if (!body) return null;
  return (
    <div className={`fl-live fx-${effect}`} style={{ "--fx": fx }} aria-hidden="true">
      {body}
    </div>
  );
}
export default memo(LiveBg);
