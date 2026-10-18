"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";

export interface PatientRow {
  id: string;
  name: string;
  about: string | null;
  isSynthetic: boolean;
  lastEntryAt: string | null;
  lastEntryRel: string | null;
  lastEntryDate: string | null;
  logs7: number;
  loggedDays7: number;
  avg7: number | null;
  avgPrev: number | null;
  openFlags: number;
  highFlags: number;
  followUps: number;
  sharedSinceAt: string | null;
  sharedSince: string | null;
  noRecent: boolean;
}

type SortKey = "name" | "last" | "logs" | "avg" | "flags" | "followups" | "shared";
type Filter = "all" | "review" | "norecent" | "stable";

const FILTERS: { id: Filter; label: string; test: (r: PatientRow) => boolean; hint?: string }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "review", label: "Needs review", test: (r) => r.openFlags > 0 },
  { id: "norecent", label: "No recent logs", test: (r) => r.noRecent, hint: "Nothing logged in the last 3 days" },
  { id: "stable", label: "Stable", test: (r) => r.openFlags === 0 && !r.noRecent, hint: "No open flags and logging recently" },
];

const COLS: { key: SortKey; label: string; right?: boolean; defaultDir: 1 | -1 }[] = [
  { key: "name", label: "Patient", defaultDir: 1 },
  { key: "last", label: "Last entry", defaultDir: -1 },
  { key: "logs", label: "Logs (7d)", right: true, defaultDir: -1 },
  { key: "avg", label: "Avg type (7d)", right: true, defaultDir: -1 },
  { key: "flags", label: "Open flags", right: true, defaultDir: -1 },
  { key: "followups", label: "Follow-ups", right: true, defaultDir: -1 },
  { key: "shared", label: "Sharing since", defaultDir: -1 },
];

function value(r: PatientRow, k: SortKey): string | number {
  switch (k) {
    case "name":
      return r.name.toLowerCase();
    case "last":
      return r.lastEntryAt ?? "";
    case "logs":
      return r.logs7;
    case "avg":
      return r.avg7 ?? -1;
    case "flags":
      return r.highFlags * 100 + r.openFlags;
    case "followups":
      return r.followUps;
    case "shared":
      return r.sharedSinceAt ?? "";
  }
}

function Trend({ r }: { r: PatientRow }) {
  if (r.avg7 == null || r.avgPrev == null) return <span className="trend">no prior week</span>;
  const d = Math.round((r.avg7 - r.avgPrev) * 10) / 10;
  const shift = Math.abs(d) >= 1;
  const word = d === 0 ? "same as" : d > 0 ? "looser than" : "firmer than";
  return (
    <span className={`trend${shift ? " shift" : ""}`} title={`Prior 7 days: ${r.avgPrev}`}>
      {d > 0 ? "+" : ""}
      {d.toFixed(1)} vs prior wk
      <span className="visually-hidden"> ({word} prior week average {r.avgPrev})</span>
    </span>
  );
}

/** Caseload table: client-side sorting and filtering over rows the server already scoped to this clinician. */
export function PatientTable({ rows, q }: { rows: PatientRow[]; q?: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "flags", dir: -1 });

  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    return rows
      .filter(f.test)
      .sort((a, b) => {
        const va = value(a, sort.key);
        const vb = value(b, sort.key);
        if (va < vb) return -1 * sort.dir;
        if (va > vb) return 1 * sort.dir;
        return a.name.localeCompare(b.name);
      });
  }, [rows, filter, sort]);

  return (
    <section className="panel" aria-labelledby="pt-h">
      <div className="panel-head">
        <h2 id="pt-h">
          Caseload <span className="h-count">{rows.length}</span>
        </h2>
        <span className="meta">Patients currently sharing with you</span>
      </div>
      <div className="toolbar">
        <div className="fchips" role="group" aria-label="Filter patients">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className="fchip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} title={f.hint}>
              {f.label}
              <span className="care-count">{rows.filter(f.test).length}</span>
            </button>
          ))}
        </div>
        {q && (
          <span className="small muted row-2" style={{ marginLeft: "auto" }}>
            Name matches &ldquo;{q}&rdquo;
            <Link href="/care?view=patients" className="link-btn small">
              Clear
            </Link>
          </span>
        )}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {shown.length} of {rows.length} patients shown
      </p>
      {shown.length === 0 ? (
        <div className="empty care-empty">
          <h2>No patients match</h2>
          <p>{q ? "Try a different name, or clear the search." : "Try another filter."}</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="ctable" style={{ minWidth: 860 }}>
            <caption className="visually-hidden">Patients sharing with you. Column headers sort the table.</caption>
            <thead>
              <tr>
                {COLS.map((c) => {
                  const active = sort.key === c.key;
                  return (
                    <th key={c.key} scope="col" className={c.right ? "r" : undefined} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                      <button type="button" className="sort-btn" onClick={() => setSort(active ? { key: c.key, dir: sort.dir === 1 ? -1 : 1 } : { key: c.key, dir: c.defaultDir })}>
                        {c.label}
                        <Icon name={active ? (sort.dir === 1 ? "sortUp" : "sortDown") : "sort"} size={14} />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="pt-cell">
                      <Avatar name={r.name} />
                      <div className="grow">
                        <Link href={`/care/patients/${r.id}`} className="pt-link">
                          {r.name}
                        </Link>
                        {r.isSynthetic && (
                          <span className="badge badge-demo" style={{ marginLeft: 8, verticalAlign: "1px" }}>
                            Synthetic
                          </span>
                        )}
                        {r.about && <span className="pt-sub">{r.about}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="n">
                    {r.lastEntryAt ? (
                      <>
                        <span style={{ display: "block" }}>{r.lastEntryRel}</span>
                        <span className="tiny faint">{r.lastEntryDate}</span>
                      </>
                    ) : (
                      <span className="faint">No entries</span>
                    )}
                    {r.noRecent && r.lastEntryAt && <span className="tiny" style={{ display: "block", color: "var(--warn)", fontWeight: 600 }}>No logs in 3 days</span>}
                  </td>
                  <td className="r n">
                    <span style={{ display: "block" }}>{r.logs7}</span>
                    <span className="tiny faint">{r.loggedDays7}/7 days</span>
                  </td>
                  <td className="r n">
                    <span style={{ display: "block" }}>{r.avg7 ?? <span className="faint">–</span>}</span>
                    <Trend r={r} />
                  </td>
                  <td className="r n">
                    {r.openFlags > 0 ? (
                      <span className={`sev ${r.highFlags > 0 ? "sev-high" : "sev-medium"}`} style={{ justifyContent: "flex-end" }}>
                        <span className="dot" aria-hidden />
                        {r.openFlags}
                        {r.highFlags > 0 && <span className="visually-hidden"> including {r.highFlags} high</span>}
                      </span>
                    ) : (
                      <span className="faint">0</span>
                    )}
                  </td>
                  <td className="r n">{r.followUps > 0 ? r.followUps : <span className="faint">0</span>}</td>
                  <td className="n">{r.sharedSince ?? <span className="faint">–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="panel-foot">Avg type uses the Bristol scale (1 hard, 7 watery). &ldquo;vs prior wk&rdquo; compares with the patient&apos;s own previous 7 days. Shifts of 1 or more are highlighted.</div>
    </section>
  );
}
