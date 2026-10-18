/**
 * A small pixel-art landscape (sky bands, clouds, rolling hills, trees, flowers).
 * Colours come from CSS variables, so it follows the active theme and dark mode.
 * Deterministic: the same `seed` always draws the same scene.
 */
const W = 96;

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

type Rect = { x: number; y: number; w: number; h: number; c: string };

function build(h: number, seed: number, flowers: boolean): Rect[] {
  const r = rng(seed);
  const out: Rect[] = [];
  // sky in three stepped bands
  out.push({ x: 0, y: 0, w: W, h: Math.round(h * 0.34), c: "sc-sky1" });
  out.push({ x: 0, y: Math.round(h * 0.34), w: W, h: Math.round(h * 0.24), c: "sc-sky2" });
  out.push({ x: 0, y: Math.round(h * 0.58), w: W, h: h - Math.round(h * 0.58), c: "sc-sky3" });
  // stars (only visible in dark mode)
  for (let i = 0; i < 14; i++) out.push({ x: Math.floor(r() * W), y: Math.floor(r() * h * 0.45), w: 1, h: 1, c: "sc-star" });
  // clouds
  for (let i = 0; i < 3; i++) {
    const cx = Math.floor(8 + r() * (W - 24));
    const cy = Math.floor(3 + r() * h * 0.25);
    const len = 8 + Math.floor(r() * 6);
    out.push({ x: cx, y: cy, w: len, h: 2, c: "sc-cloud" });
    out.push({ x: cx + 2, y: cy - 1, w: len - 5, h: 1, c: "sc-cloud" });
    out.push({ x: cx + 3, y: cy - 2, w: 3, h: 1, c: "sc-cloud" });
  }
  // hills: three layers of stepped sine curves
  const layers: [string, number, number, number][] = [
    ["sc-hill1", 0.55, 0.12, 0.11],
    ["sc-hill2", 0.68, 0.09, 0.17],
    ["sc-hill3", 0.82, 0.06, 0.23],
  ];
  layers.forEach(([c, base, amp, freq], li) => {
    const phase = r() * 6;
    for (let x = 0; x < W; x++) {
      const top = Math.round(h * base - h * amp * Math.sin(x * freq * 0.5 + phase) - h * amp * 0.5 * Math.sin(x * freq * 1.3 + phase * 2));
      out.push({ x, y: top, w: 1, h: h - top, c });
    }
    // trees on the middle layer
    if (li === 1) {
      for (let t = 0; t < 5; t++) {
        const tx = Math.floor(4 + r() * (W - 8));
        const top = Math.round(h * base - h * amp * Math.sin(tx * freq * 0.5 + phase) - h * amp * 0.5 * Math.sin(tx * freq * 1.3 + phase * 2));
        out.push({ x: tx, y: top - 2, w: 1, h: 2, c: "sc-trunk" });
        out.push({ x: tx - 1, y: top - 5, w: 3, h: 3, c: "sc-tree" });
        out.push({ x: tx, y: top - 6, w: 1, h: 1, c: "sc-tree" });
        out.push({ x: tx + 1, y: top - 4, w: 1, h: 2, c: "sc-tree2" });
      }
    }
  });
  if (flowers) for (let i = 0; i < 10; i++) out.push({ x: Math.floor(r() * W), y: Math.floor(h * 0.86 + r() * h * 0.12), w: 1, h: 1, c: "sc-flower" });
  return out;
}

export function PixelScene({ height = 40, seed = 7, flowers = true, className }: { height?: number; seed?: number; flowers?: boolean; className?: string }) {
  const rects = build(height, seed, flowers);
  return (
    <svg className={`scene pixel${className ? ` ${className}` : ""}`} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true">
      {rects.map((q, i) => (
        <rect key={i} x={q.x} y={q.y} width={q.w} height={q.h} className={q.c} />
      ))}
    </svg>
  );
}
