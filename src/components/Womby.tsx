import { WOMBY_H, WOMBY_W, wombyRuns, type WombyPose } from "@/lib/womby";

const LABELS: Record<WombyPose, string> = {
  happy: "Womby the wombat, smiling",
  curious: "Womby the wombat, curious",
  thinking: "Womby the wombat, thinking",
  sleepy: "Womby the wombat, sleepy",
  encouraging: "Womby the wombat, cheering you on",
  celebrate: "Womby the wombat, celebrating",
  wave: "Womby the wombat, waving",
};

/**
 * Womby, drawn as crisp pixel art. Decorative by default; pass `label` when it carries meaning.
 * `size` is the rendered width in px (keep it a multiple of 28 for perfectly square pixels).
 */
export function Womby({ pose = "happy", size = 84, label, bob = false, className }: { pose?: WombyPose; size?: number; label?: string | true; bob?: boolean; className?: string }) {
  const name = label === true ? LABELS[pose] : label;
  return (
    <svg
      className={`womby pixel${bob ? " bob" : ""}${className ? ` ${className}` : ""}`}
      width={size}
      height={Math.round((size * WOMBY_H) / WOMBY_W)}
      viewBox={`0 0 ${WOMBY_W} ${WOMBY_H}`}
      shapeRendering="crispEdges"
      role={name ? "img" : undefined}
      aria-label={name}
      aria-hidden={name ? undefined : true}
    >
      {wombyRuns(pose).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
