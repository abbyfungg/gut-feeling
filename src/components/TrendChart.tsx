import type { DayPoint } from "@/lib/rules/trends";
import { formatDayLabel } from "@/lib/time";

/**
 * Stool type per entry (dots) over days, with the typical 3–5 band, plus a count strip.
 * Days with nothing logged are drawn as "unknown", distinct from days confirmed with no movement.
 */
export function TrendChart({ days, title, highlightDays = [] }: { days: DayPoint[]; title: string; highlightDays?: string[] }) {
  const W = 680;
  const H = 230;
  const left = 60;
  const right = 10;
  const top = 12;
  const plotH = 140;
  const stripY = top + plotH + 22;
  const n = days.length;
  const step = (W - left - right) / Math.max(1, n);
  const y = (t: number) => top + ((7 - t) / 6) * plotH;
  const hl = new Set(highlightDays);
  const maxCount = Math.max(3, ...days.map((d) => d.movements ?? 0));
  const desc = days
    .filter((d) => d.movements != null)
    .map((d) => `${formatDayLabel(d.day)}: ${d.confirmedNone && !d.movements ? "confirmed none" : `${d.movements} logged${d.types.length ? `, types ${d.types.join(", ")}` : ""}`}`)
    .join("; ");
  return (
    <figure style={{ margin: 0 }}>
      <div className="chart-scroll">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${desc || "No entries in this period."}`}>
        <rect x={left} y={y(5) - 6} width={W - left - right} height={y(3) - y(5) + 12} rx="8" fill="#e2f3e7" />
        <text x={W - right - 4} y={y(5) + 4} textAnchor="end" style={{ fill: "#22603f", fontWeight: 700 }}>
          typical range
        </text>
        {[1, 4, 7].map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="#efdfcd" strokeDasharray="3 4" />
            <text x={left - 8} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        <text x={4} y={y(1) + 4} style={{ fontWeight: 700 }}>
          firm
        </text>
        <text x={4} y={y(7) + 4} style={{ fontWeight: 700 }}>
          loose
        </text>
        {days.map((d, i) => {
          const cx = left + step * i + step / 2;
          return (
            <g key={d.day}>
              {hl.has(d.day) && <rect x={cx - step / 2 + 1} y={top - 6} width={step - 2} height={plotH + 12} rx="6" fill="#efe7fd" />}
              {d.types.map((t, k) => (
                <circle key={k} cx={cx + (k - (d.types.length - 1) / 2) * Math.min(8, step / Math.max(1, d.types.length))} cy={y(t)} r="5.5" fill={t >= 6 ? "#e08a62" : t <= 2 ? "#8a5a36" : "#b67b4f"} stroke="#fff" strokeWidth="1.5" />
              ))}
              {/* count strip */}
              {d.movements == null ? (
                <text x={cx} y={stripY + 14} textAnchor="middle" style={{ fill: "#c9b6a4" }}>
                  ·
                </text>
              ) : d.movements === 0 ? (
                <g>
                  <rect x={cx - step / 2 + 3} y={stripY} width={step - 6} height={20} rx="5" fill="none" stroke="#cdbfb3" strokeDasharray="2 2" />
                  <text x={cx} y={stripY + 14} textAnchor="middle">
                    0
                  </text>
                </g>
              ) : (
                <g>
                  <rect x={cx - step / 2 + 3} y={stripY} width={step - 6} height={20} rx="5" fill="#ffe9a8" opacity={0.4 + (0.6 * d.movements) / maxCount} />
                  <text x={cx} y={stripY + 14} textAnchor="middle" style={{ fill: "#2d2420", fontWeight: 700 }}>
                    {d.movements}
                  </text>
                </g>
              )}
              {(i === 0 || i === n - 1 || i % 7 === 0) && (
                <text x={cx} y={H - 4} textAnchor="middle">
                  {formatDayLabel(d.day).replace(/^\w+, /, "")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      </div>
      <figcaption className="legend">
        <span>
          <i style={{ background: "#b67b4f" }} />
          each dot = one entry (type 1–7)
        </span>
        <span>
          <i style={{ background: "#ffe9a8" }} />
          movements per day
        </span>
        <span>
          <i style={{ border: "1px dashed #cdbfb3" }} />
          0 = confirmed none
        </span>
        <span>· = nothing logged (unknown)</span>
      </figcaption>
    </figure>
  );
}
