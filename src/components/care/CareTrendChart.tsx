import type { DayPoint } from "@/lib/rules/trends";
import { dayShort, groupOf, weekday } from "./format";

const W = 760;
const PAD_L = 44;
const PAD_R = 12;
const TOP = 14;
const TYPE_H = 180; // type 7 at TOP, type 1 at TOP + TYPE_H
const BARS_TOP = TOP + TYPE_H + 30;
const BARS_H = 54;
const AXIS_Y = BARS_TOP + BARS_H;
const H = AXIS_Y + 26;

/**
 * Three-week chart: one dot per logged movement on the Bristol 1–7 axis, typical range shaded,
 * dashed personal baseline, and logs per day underneath. Unlogged days stay empty (unknown, not zero).
 */
export function CareTrendChart({ days, baseline, evidenceDays = [], label }: { days: DayPoint[]; baseline: number | null; evidenceDays?: string[]; label: string }) {
  const n = days.length;
  const colW = (W - PAD_L - PAD_R) / n;
  const cx = (i: number) => PAD_L + colW * (i + 0.5);
  const ty = (t: number) => TOP + ((7 - t) / 6) * TYPE_H;
  const maxCount = Math.max(3, ...days.map((d) => d.movements ?? 0));
  const by = (c: number) => AXIS_Y - (c / maxCount) * BARS_H;
  const ev = new Set(evidenceDays);
  const lastIdx = n - 1;
  const labelEvery = n > 14 ? 3 : n > 7 ? 2 : 1;
  const typed = days.flatMap((d) => d.types);
  const logged = days.filter((d) => d.movements != null).length;

  return (
    <figure className="stack-3" style={{ margin: 0 }}>
      <svg className="cchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}. ${typed.length} typed movements across ${logged} of ${n} days logged.${baseline != null ? ` Baseline average type ${baseline}.` : ""}`}>
        {/* evidence days */}
        {days.map((d, i) =>
          ev.has(d.day) ? <rect key={`ev-${d.day}`} className="evday" x={cx(i) - colW / 2} y={TOP - 6} width={colW} height={AXIS_Y - TOP + 6} rx={3} /> : null,
        )}
        {/* typical band 3–5 */}
        <rect className="band" x={PAD_L} y={ty(5)} width={W - PAD_L - PAD_R} height={ty(3) - ty(5)} />
        {/* type grid */}
        {[1, 2, 3, 4, 5, 6, 7].map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD_L} x2={W - PAD_R} y1={ty(t)} y2={ty(t)} />
            <text x={PAD_L - 10} y={ty(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        <text transform="rotate(-90)" x={-ty(4)} y={11} textAnchor="middle" className="lbl-strong">
          Bristol type
        </text>
        {/* baseline */}
        {baseline != null && (
          <g>
            <line className="base" x1={PAD_L} x2={W - PAD_R} y1={ty(baseline)} y2={ty(baseline)} />
            <text x={W - PAD_R - 4} y={ty(baseline) - 6} textAnchor="end" className="lbl-strong">
              Baseline {baseline}
            </text>
          </g>
        )}
        {/* points */}
        {days.map((d, i) => {
          const k = d.types.length;
          const step = Math.min(9, (colW - 6) / Math.max(1, k));
          return d.types.map((t, j) => (
            <circle key={`${d.day}-${j}`} className={`pt ${groupOf(t)}`} cx={cx(i) + (j - (k - 1) / 2) * step} cy={ty(t)} r={4.5}>
              <title>{`${weekday(d.day)} ${dayShort(d.day)}: type ${t}`}</title>
            </circle>
          ));
        })}
        {/* logs per day */}
        <text transform="rotate(-90)" x={-(BARS_TOP + BARS_H / 2)} y={11} textAnchor="middle" className="lbl-strong">
          Logs
        </text>
        <line className="axis" x1={PAD_L} x2={W - PAD_R} y1={AXIS_Y} y2={AXIS_Y} />
        {days.map((d, i) => {
          const bw = Math.min(16, colW * 0.55);
          if (d.movements == null) return <line key={`b-${d.day}`} className="nodata" x1={cx(i)} x2={cx(i)} y1={AXIS_Y - 14} y2={AXIS_Y - 2} />;
          if (d.movements === 0)
            return (
              <g key={`b-${d.day}`}>
                <line className="none-mark" x1={cx(i) - bw / 2} x2={cx(i) + bw / 2} y1={AXIS_Y - 2} y2={AXIS_Y - 2} />
                <text x={cx(i)} y={AXIS_Y - 6} textAnchor="middle">
                  0
                </text>
              </g>
            );
          return (
            <g key={`b-${d.day}`}>
              <rect className="bar" x={cx(i) - bw / 2} y={by(d.movements)} width={bw} height={AXIS_Y - by(d.movements)} rx={2} />
              <text x={cx(i)} y={by(d.movements) - 4} textAnchor="middle">
                {d.movements}
              </text>
            </g>
          );
        })}
        {/* x labels */}
        {days.map((d, i) =>
          (lastIdx - i) % labelEvery === 0 ? (
            <text key={`x-${d.day}`} x={cx(i)} y={AXIS_Y + 17} textAnchor="middle" className={i === lastIdx ? "lbl-strong" : undefined}>
              {i === lastIdx ? "Today" : dayShort(d.day)}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="cleg">
        <span>
          <i className="leg-hard" /> Hard (1–2)
        </span>
        <span>
          <i className="leg-typical" /> Typical (3–5)
        </span>
        <span>
          <i className="leg-loose" /> Loose (6–7)
        </span>
        <span>
          <i className="sq leg-band" /> Typical range
        </span>
        {baseline != null && (
          <span>
            <i className="leg-base" /> Personal baseline
          </span>
        )}
        <span>
          <i className="sq leg-bar" /> Logs per day
        </span>
        {evidenceDays.length > 0 && (
          <span>
            <i className="sq leg-ev" /> Days with open-flag evidence
          </span>
        )}
        <span className="faint">Dotted tick = nothing logged (unknown)</span>
      </figcaption>
      <details className="data-details">
        <summary>Show data table</summary>
        <div className="table-scroll" style={{ marginTop: 8 }}>
          <table className="ctable">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col" className="r">
                  Logs
                </th>
                <th scope="col">Bristol types</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.day}>
                  <td className="n">
                    {weekday(d.day)} {dayShort(d.day)}
                  </td>
                  <td className="r n">{d.movements == null ? <span className="faint">Not logged</span> : d.movements}</td>
                  <td className="n">{d.types.length ? d.types.join(", ") : d.confirmedNone ? "None (confirmed)" : <span className="faint">–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
