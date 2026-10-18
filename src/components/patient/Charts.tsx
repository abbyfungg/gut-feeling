import type { DayPoint } from "@/lib/rules/trends";
import { groupOf } from "./meta";

const W = 320;

function shortDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });
}

function tickIndexes(n: number) {
  if (n <= 7) return Array.from({ length: n }, (_, i) => i);
  const step = n <= 30 ? 7 : 30;
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i -= step) out.unshift(i);
  return out;
}

const FILL = { hard: "var(--g-hard)", typical: "var(--g-typical)", loose: "var(--g-loose)", "": "var(--g-none)" } as const;

/** Bathroom trips per day, stacked by stool group. Unlogged days show a short grey tick, confirmed-none days a hollow mark. */
export function DailyChart({ days, label }: { days: DayPoint[]; label: string }) {
  const H = 132;
  const top = 8;
  const bottom = 22;
  const max = Math.max(3, ...days.map((d) => d.movements ?? 0));
  const plotH = H - top - bottom;
  const slot = W / days.length;
  const bw = Math.max(2, Math.min(18, slot * 0.62));
  const unit = plotH / max;
  const ticks = tickIndexes(days.length);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {Array.from({ length: max + 1 }, (_, i) => i).map((v) => (
        <g key={v}>
          <line className={v === 0 ? "axis" : "grid"} x1={0} x2={W} y1={top + plotH - v * unit} y2={top + plotH - v * unit} />
        </g>
      ))}
      {days.map((d, i) => {
        const x = i * slot + (slot - bw) / 2;
        if (d.movements == null) return <rect key={d.day} x={x} y={top + plotH - 2} width={bw} height={2} rx={1} fill="var(--line-strong)" />;
        if (d.movements === 0)
          return <rect key={d.day} x={x + 0.75} y={top + plotH - unit * 0.6} width={bw - 1.5} height={unit * 0.6 - 0.75} rx={2} fill="none" stroke="var(--line-strong)" strokeDasharray="2 2" strokeWidth={1.5} />;
        const segs = Array.from({ length: d.movements }, (_, k) => (d.types[k] != null ? groupOf(d.types[k]) : ""));
        return (
          <g key={d.day}>
            {segs.map((g, k) => (
              <rect key={k} x={x} y={top + plotH - (k + 1) * unit + 1} width={bw} height={unit - 2} rx={Math.min(3, bw / 3)} fill={FILL[g]} />
            ))}
          </g>
        );
      })}
      {ticks.map((i) => (
        <text key={i} x={i * slot + slot / 2} y={H - 6} textAnchor="middle">
          {days.length <= 7 ? new Date(`${days[i].day}T12:00:00Z`).toLocaleDateString("en-CA", { weekday: "short", timeZone: "UTC" }) : shortDay(days[i].day)}
        </text>
      ))}
    </svg>
  );
}

/** Each typed log as a dot on the 1–7 scale, with the typical 3–5 band shaded and the person's own average as a dashed line. */
export function TypeChart({ days, average, label }: { days: DayPoint[]; average: number | null; label: string }) {
  const H = 170;
  const left = 22;
  const top = 8;
  const bottom = 22;
  const plotW = W - left;
  const plotH = H - top - bottom;
  const y = (t: number) => top + plotH - ((t - 1) / 6) * plotH;
  const slot = plotW / days.length;
  const ticks = tickIndexes(days.length);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <rect x={left} y={y(5.5)} width={plotW} height={y(2.5) - y(5.5)} fill="var(--primary-soft)" rx={4} />
      {[1, 4, 7].map((t) => (
        <g key={t}>
          <line className="grid" x1={left} x2={W} y1={y(t)} y2={y(t)} />
          <text x={left - 8} y={y(t) + 4} textAnchor="end">
            {t}
          </text>
        </g>
      ))}
      {average != null && <line x1={left} x2={W} y1={y(average)} y2={y(average)} stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="5 4" />}
      {days.map((d, i) =>
        d.types.map((t, k) => (
          <circle
            key={`${d.day}-${k}`}
            cx={left + i * slot + slot / 2 + (d.types.length > 1 ? (k - (d.types.length - 1) / 2) * Math.min(5, slot / 3) : 0)}
            cy={y(t)}
            r={days.length > 45 ? 3 : 4.5}
            fill={FILL[groupOf(t)]}
            stroke="var(--surface)"
            strokeWidth={1.5}
          />
        )),
      )}
      {ticks.map((i) => (
        <text key={i} x={left + i * slot + slot / 2} y={H - 6} textAnchor="middle">
          {days.length <= 7 ? new Date(`${days[i].day}T12:00:00Z`).toLocaleDateString("en-CA", { weekday: "short", timeZone: "UTC" }) : shortDay(days[i].day)}
        </text>
      ))}
    </svg>
  );
}
