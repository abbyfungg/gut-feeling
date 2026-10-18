import { Icon } from "@/components/Icon";

export interface EffortSummaryData {
  source: "device" | "simulated";
  peakEffort: number;
  avgEffort: number;
  durationMs: number;
  squeezes: number;
  samples: number[];
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${s % 60 ? `${s % 60} s` : ""}`.trim();
}

/** Tiny line chart of effort over a session (0-100). */
export function EffortSpark({ samples, height = 44 }: { samples: number[]; height?: number }) {
  const w = 240;
  const pts = samples.length > 1 ? samples : [0, ...samples, 0];
  const step = w / Math.max(1, pts.length - 1);
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - (v / 100) * (height - 4) - 2).toFixed(1)}`).join(" ");
  return (
    <svg className="effort-spark" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" role="img" aria-label="Squeeze effort over the session">
      <path d={`${d} L${w},${height} L0,${height} Z`} className="effort-spark-fill" />
      <path d={d} className="effort-spark-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function SourceBadge({ source }: { source: "device" | "simulated" }) {
  return source === "device" ? (
    <span className="badge badge-ok">
      <Icon name="activity" /> From the squeeze ball
    </span>
  ) : (
    <span className="badge badge-demo">
      <Icon name="activity" /> Simulated · not device data
    </span>
  );
}

/** Compact read-only summary used on entry pages and the care timeline. */
export function EffortSummary({ s, compact = false }: { s: EffortSummaryData; compact?: boolean }) {
  return (
    <div className="effort-summary stack-2">
      <div className="row wrap" style={{ gap: 6 }}>
        <SourceBadge source={s.source} />
      </div>
      <div className="effort-stats">
        <div>
          <strong>{s.peakEffort}</strong>
          <span>peak effort</span>
        </div>
        <div>
          <strong>{formatDuration(s.durationMs)}</strong>
          <span>session</span>
        </div>
        <div>
          <strong>{s.squeezes}</strong>
          <span>{s.squeezes === 1 ? "squeeze" : "squeezes"}</span>
        </div>
      </div>
      {!compact && s.samples.length > 1 && <EffortSpark samples={s.samples} />}
      <p className="tiny muted">Squeeze effort is how hard the ball was squeezed (0 to 100). It is a personal comfort log, not a medical measure of straining.</p>
    </div>
  );
}
