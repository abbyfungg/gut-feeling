import type { DayPoint } from "@/lib/rules/trends";
import { formatDayLabel } from "@/lib/time";

const C = { hard: "#8a5a36", typical: "#3c9a68", loose: "#f08a4b", hardBg: "#f5ece2", typBg: "#e3f4e9", looseBg: "#ffeadb", bar: "#ffd667", line: "#e4d8cb" };
const colorFor = (t: number) => (t <= 2 ? C.hard : t >= 6 ? C.loose : C.typical);

/**
 * Stool type per entry (dots) over days on Firm / Typical / Loose bands, plus a bar per day for the count.
 * Days with nothing logged are drawn as "unknown", distinct from days confirmed with no movement.
 */
export function TrendChart({ days, title, highlightDays = [], compact = false }: { days: DayPoint[]; title: string; highlightDays?: string[]; compact?: boolean }) {
  const W = 360;
  const left = 52;
  const right = 6;
  const top = 6;
  const plotH = compact ? 110 : 140;
  const barTop = top + plotH + 12;
  const barH = 30;
  const H = barTop + barH + 20;
  const n = days.length;
  const step = (W - left - right) / Math.max(1, n);
  const y = (t: number) => top + ((t - 1) / 6) * plotH; // 1 at top (firm), 7 at bottom (loose)
  const band = (from: number, to: number) => ({ y: y(from - 0.5 < 1 ? 1 : from - 0.5), h: y(to + 0.5 > 7 ? 7 : to + 0.5) - y(from - 0.5 < 1 ? 1 : from - 0.5) });
  const hl = new Set(highlightDays);
  const maxCount = Math.max(3, ...days.map((d) => d.movements ?? 0));
  const desc = days
    .filter((d) => d.movements != null)
    .map((d) => `${formatDayLabel(d.day)}: ${d.confirmedNone && !d.movements ? "confirmed none" : `${d.movements} logged${d.types.length ? `, types ${d.types.join(", ")}` : ""}`}`)
    .join("; ");
  const bands = [
    { label: "Firm", ...band(1, 2), fill: C.hardBg, color: C.hard },
    { label: "Typical", ...band(3, 5), fill: C.typBg, color: C.typical },
    { label: "Loose", ...band(6, 7), fill: C.looseBg, color: C.loose },
  ];
  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${desc || "No entries in this period."}`}>
        {bands.map((b, i) => (
          <g key={b.label}>
            <rect x={left} y={b.y} width={W - left - right} height={b.h} rx={i === 1 ? 0 : 10} fill={b.fill} />
            <text x={0} y={b.y + b.h / 2 + 4} style={{ fill: b.color, fontWeight: 800 }}>
              {b.label}
            </text>
          </g>
        ))}
        <text x={0} y={barTop + barH / 2 + 4} style={{ fontWeight: 800 }}>
          Logs
        </text>
        {days.map((d, i) => {
          const cx = left + step * i + step / 2;
          const bw = Math.max(3, Math.min(14, step - 4));
          const isToday = i === n - 1;
          return (
            <g key={d.day}>
              {hl.has(d.day) && <rect x={cx - step / 2} y={top} width={step} height={plotH} fill="#6a4fc4" opacity="0.12" />}
              {d.types.map((t, k) => (
                <circle
                  key={k}
                  cx={cx + (k - (d.types.length - 1) / 2) * Math.min(6, step / Math.max(1, d.types.length))}
                  cy={y(t)}
                  r={compact ? 4.5 : 5.5}
                  fill={colorFor(t)}
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              ))}
              {d.movements == null ? (
                <circle cx={cx} cy={barTop + barH - 3} r="1.8" fill="#cdbfb3" />
              ) : d.movements === 0 ? (
                <circle cx={cx} cy={barTop + barH - 5} r="4" fill="none" stroke="#a8998c" strokeWidth="1.5" />
              ) : (
                <rect x={cx - bw / 2} y={barTop + barH - (barH * d.movements) / maxCount} width={bw} height={(barH * d.movements) / maxCount} rx={Math.min(4, bw / 2)} fill={C.bar} />
              )}
              {(isToday || (n - 1 - i) % 7 === 0) && (
                <text x={cx} y={H - 3} textAnchor={isToday ? "end" : "middle"} style={isToday ? { fill: "#1d1714", fontWeight: 800 } : undefined}>
                  {isToday ? "Today" : formatDayLabel(d.day).replace(/^\w+, /, "")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="legend">
        <span>
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="5" fill={C.typical} />
          </svg>
          one log
        </span>
        <span>
          <svg width="10" height="12" aria-hidden>
            <rect width="10" height="12" rx="3" fill={C.bar} />
          </svg>
          logs per day
        </span>
        <span>
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="3.8" fill="none" stroke="#a8998c" strokeWidth="1.5" />
          </svg>
          confirmed none
        </span>
        <span>
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="1.8" fill="#cdbfb3" />
          </svg>
          not logged
        </span>
      </figcaption>
    </figure>
  );
}
