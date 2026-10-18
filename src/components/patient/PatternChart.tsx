import type { PatternDay } from "@/lib/pattern";
import { contextLabel } from "@/lib/domain";
import { groupOf } from "./meta";

const W = 340;
const H = 190;
const PAD = { l: 34, r: 8, t: 22, b: 40 };
const GROUP_VAR = { hard: "var(--g-hard)", typical: "var(--g-typical)", loose: "var(--g-loose)", "": "var(--g-none)" } as const;

function dayLabel(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  return { wk: new Intl.DateTimeFormat("en-CA", { weekday: "narrow", timeZone: "UTC" }).format(d), dn: d.getUTCDate() };
}
const fmt = (day: string) => new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

/**
 * Two weeks of stool types against the Bristol scale, one column per day. Hard (1-2) sits at the bottom
 * in its own band, typical (3-5) in the middle. Days the person confirmed "nothing" show as a dashed ring,
 * and logged context (like a medication change) as a marker on top.
 */
export function PatternChart({ days, usualType, highlight = [] }: { days: PatternDay[]; usualType: number | null; highlight?: string[] }) {
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const col = iw / days.length;
  const x = (i: number) => PAD.l + col * i + col / 2;
  const y = (t: number) => PAD.t + ih - ((t - 0.5) / 7) * ih; // type 1 at the bottom, 7 at the top
  const hi = new Set(highlight);
  const summary = days
    .map((d) => `${fmt(d.day)}: ${d.movements ? `type ${d.types.join(", ") || "not recorded"}${d.straining ? ", straining" : ""}` : d.confirmedNone ? "confirmed nothing" : "not logged"}`)
    .join("; ");

  return (
    <figure className="pattern-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Stool type by day. ${summary}`}>
        {/* bands */}
        <rect x={PAD.l} y={y(2.5)} width={iw} height={y(0.5) - y(2.5)} className="pc-band hard" />
        <rect x={PAD.l} y={y(5.5)} width={iw} height={y(2.5) - y(5.5)} className="pc-band typical" />
        <text x={PAD.l - 6} y={y(1.5) + 4} className="pc-axis" textAnchor="end">
          Hard
        </text>
        <text x={PAD.l - 6} y={y(4) + 4} className="pc-axis" textAnchor="end">
          Usual
        </text>
        <text x={PAD.l - 6} y={y(6.5) + 4} className="pc-axis" textAnchor="end">
          Loose
        </text>
        {usualType != null && (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(usualType)} y2={y(usualType)} className="pc-usual" />
            <text x={W - PAD.r - 2} y={y(usualType) - 4} className="pc-axis" textAnchor="end">
              your usual: type {usualType}
            </text>
          </g>
        )}
        {days.map((d, i) => {
          const { wk, dn } = dayLabel(d.day);
          const flagged = d.entryIds.some((id) => hi.has(id));
          return (
            <g key={d.day}>
              <title>{`${fmt(d.day)}: ${d.movements ? `type ${d.types.join(", ") || "not recorded"}${d.straining ? ", straining" : ""}` : d.confirmedNone ? "you confirmed nothing" : "nothing logged"}${d.context.length ? `. Context: ${d.context.map(contextLabel).join(", ")}` : ""}`}</title>
              <rect x={PAD.l + col * i} y={PAD.t} width={col} height={ih + 34} fill="transparent" />
              {flagged && <rect x={PAD.l + col * i + 1} y={PAD.t} width={col - 2} height={ih} rx={4} className="pc-flagcol" />}
              {d.context.length > 0 && (
                <g transform={`translate(${x(i)}, ${PAD.t - 11})`}>
                  <rect x={-6} y={-6} width={12} height={12} rx={6} className="pc-ctx" />
                  <text y={3.5} textAnchor="middle" className="pc-ctx-t">
                    !
                  </text>
                </g>
              )}
              {d.types.map((t, j) => (
                <circle key={j} cx={x(i) + (d.types.length > 1 ? (j - (d.types.length - 1) / 2) * 7 : 0)} cy={y(t)} r={5.5} fill={GROUP_VAR[groupOf(t)]} className="pc-dot" />
              ))}
              {d.straining && (
                <text x={x(i)} y={y(Math.min(...d.types)) + 17} textAnchor="middle" className="pc-strain">
                  S
                </text>
              )}
              {d.confirmedNone && d.movements === 0 && <circle cx={x(i)} cy={y(0.5) + 12} r={5} className="pc-none" />}
              <text x={x(i)} y={H - 14} textAnchor="middle" className="pc-axis">
                {wk}
              </text>
              <text x={x(i)} y={H - 2} textAnchor="middle" className="pc-axis faint">
                {dn}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="pc-legend">
        <span>
          <i style={{ background: "var(--g-typical)" }} /> Usual (3–5)
        </span>
        <span>
          <i style={{ background: "var(--g-hard)" }} /> Hard (1–2)
        </span>
        <span>
          <i style={{ background: "var(--g-loose)" }} /> Loose (6–7)
        </span>
        <span>
          <i className="ring" /> Nothing (you confirmed)
        </span>
        <span>
          <b className="pc-strain-key">S</b> Straining
        </span>
        <span>
          <i className="ctx">!</i> Something logged (e.g. new medicine)
        </span>
      </figcaption>
      <details className="pc-table">
        <summary className="tiny">Show as a list</summary>
        <ul className="tiny">
          {days.map((d) => (
            <li key={d.day}>
              <strong>{fmt(d.day)}</strong>: {d.movements ? `type ${d.types.join(", ") || "not recorded"}${d.straining ? ", straining" : ""}` : d.confirmedNone ? "confirmed nothing" : "not logged"}
              {d.context.length ? ` · ${d.context.map(contextLabel).join(", ")}` : ""}
            </li>
          ))}
        </ul>
      </details>
    </figure>
  );
}
