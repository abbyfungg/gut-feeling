import Link from "next/link";
import { FollowUpDone } from "@/components/FollowUpDone";
import { Mascot } from "@/components/Mascot";
import { getConfig } from "@/lib/config";
import { getCaseload, listOpenFollowUps, type FlagWithStatus } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { flagAnchor, relativeTime } from "@/lib/ui";

export const metadata = { title: "Review queue" };

const VIEWS = [
  { id: "queue", label: "Needs review" },
  { id: "patients", label: "All patients" },
  { id: "followups", label: "Follow-ups" },
  { id: "done", label: "Reviewed" },
] as const;

export default async function CareHome({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requirePage("practitioner");
  const view = (await searchParams).view ?? "queue";
  const tz = getConfig().timezone;
  const now = new Date();
  const caseload = getCaseload(user, now);
  const followUps = listOpenFollowUps(user);
  type Item = FlagWithStatus & { patientId: string; patientName: string };
  const queue: Item[] = caseload
    .flatMap((c) => c.outstanding.map((f) => ({ ...f, patientId: c.patient.id, patientName: c.patient.name })))
    .sort((a, b) => (a.severity === b.severity ? b.windowEnd.localeCompare(a.windowEnd) : a.severity === "high" ? -1 : 1));
  const reviewed: Item[] = caseload
    .flatMap((c) => c.allFlags.filter((f) => f.status === "reviewed").map((f) => ({ ...f, patientId: c.patient.id, patientName: c.patient.name })))
    .sort((a, b) => (b.latestReview?.createdAt ?? "").localeCompare(a.latestReview?.createdAt ?? ""));
  const high = queue.filter((q) => q.severity === "high").length;
  const firstName = user.name.replace(/^Dr\. /, "").split(" ")[0];

  return (
    <main id="main">
      <div className="container stack-lg">
        <div className="row between">
          <div className="row" style={{ gap: 16 }}>
            <Mascot mood={queue.length ? "calm" : "happy"} size={72} bob={false} />
            <div>
              <h1 style={{ marginBottom: 2 }}>Hi {firstName}.</h1>
              <p className="muted" style={{ margin: 0 }}>
                {queue.length === 0
                  ? "Nothing waiting for review. Your patients' logs look settled."
                  : `${queue.length} ${queue.length === 1 ? "item needs" : "items need"} review across ${new Set(queue.map((q) => q.patientId)).size} patients${high ? `, ${high} marked high` : ""}.`}
              </p>
            </div>
          </div>
          <span className="pill pill-synthetic">All patients are fictional</span>
        </div>

        <div className="grid-3">
          <div className="card tight stat">
            <span className="stat-value">{queue.length}</span>
            <span className="stat-label">open review items</span>
          </div>
          <div className="card tight stat">
            <span className="stat-value">{followUps.length}</span>
            <span className="stat-label">follow-ups to do</span>
          </div>
          <div className="card tight stat">
            <span className="stat-value">{caseload.length}</span>
            <span className="stat-label">patients sharing with you</span>
          </div>
        </div>

        <div>
          <nav className="tabs" aria-label="Views">
            {VIEWS.map((v) => (
              <Link key={v.id} href={v.id === "queue" ? "/care" : `/care?view=${v.id}`} aria-current={view === v.id ? "page" : undefined}>
                {v.label}
                {v.id === "queue" && queue.length ? ` (${queue.length})` : ""}
                {v.id === "followups" && followUps.length ? ` (${followUps.length})` : ""}
              </Link>
            ))}
          </nav>

          {view === "queue" &&
            (queue.length === 0 ? (
              <div className="card" style={{ textAlign: "center" }}>
                <Mascot mood="celebrate" size={100} />
                <h2>All caught up</h2>
                <p className="muted">New items appear here when a rule is met in a patient&apos;s shared log.</p>
              </div>
            ) : (
              <>
                <p className="hint">Sorted by priority (high first), then most recent. Every item opens to the entries that triggered it.</p>
                <ul className="queue">
                  {queue.map((q) => (
                    <li key={q.key}>
                      <Link className={`queue-item ${q.severity}`} href={`/care/patients/${q.patientId}#${flagAnchor(q.key)}`}>
                        <span className="bar" aria-hidden />
                        <span>
                          <span className="who">{q.patientName}</span> · <span style={{ fontWeight: 700 }}>{q.title}</span>
                          <br />
                          <span className="what">{q.whatChanged}</span>
                        </span>
                        <span className="queue-side">
                          <span className={`pill ${q.severity === "high" ? "pill-high" : "pill-med"}`}>{q.severity === "high" ? "High" : "Medium"}</span>
                          {q.status === "new_info" && <span className="pill pill-lav">New entries since review</span>}
                          <span className="hint">
                            {q.evidenceIds.length} {q.evidenceIds.length === 1 ? "entry" : "entries"} · {relativeTime(q.windowEnd, now)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ))}

          {view === "patients" && (
            <div className="card table-scroll">
              <table className="caseload">
                <thead>
                  <tr>
                    <th scope="col">Patient</th>
                    <th scope="col">Open items</th>
                    <th scope="col">Last entry</th>
                    <th scope="col">Data notes</th>
                  </tr>
                </thead>
                <tbody>
                  {caseload.map((c) => {
                    const worst = c.outstanding.some((f) => f.severity === "high") ? "high" : c.outstanding.length ? "medium" : null;
                    const gap = c.notices.find((n) => n.kind === "logging_gap");
                    return (
                      <tr key={c.patient.id}>
                        <td>
                          <Link href={`/care/patients/${c.patient.id}`} style={{ fontWeight: 800 }}>
                            {c.patient.name}
                          </Link>
                          <div className="hint">{c.patient.about}</div>
                        </td>
                        <td>
                          {worst ? (
                            <span className={`pill ${worst === "high" ? "pill-high" : "pill-med"}`}>
                              {c.outstanding.length} open{worst === "high" ? " · high" : ""}
                            </span>
                          ) : (
                            <span className="pill pill-ok">Nothing open</span>
                          )}
                          {c.openFollowUps > 0 && (
                            <div style={{ marginTop: 4 }}>
                              <span className="pill pill-lav">{c.openFollowUps} follow-up</span>
                            </div>
                          )}
                        </td>
                        <td>{c.lastEntryAt ? <span title={formatDateTime(c.lastEntryAt, tz)}>{relativeTime(c.lastEntryAt, now)}</span> : <span className="muted">Never</span>}</td>
                        <td>{gap ? <span className="pill pill-info">Logging gap</span> : <span className="muted">–</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {caseload.length === 0 && <p className="muted">No patients are sharing with you right now.</p>}
            </div>
          )}

          {view === "followups" &&
            (followUps.length === 0 ? (
              <p className="card muted">No open follow-ups.</p>
            ) : (
              <ul className="queue">
                {followUps.map((r) => (
                  <li key={r.id} className="card tight row between">
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <Link href={`/care/patients/${r.patientId}`} style={{ fontWeight: 800 }}>
                        {r.patientName}
                      </Link>{" "}
                      · {r.decisionLabel}
                      <div>{r.followUp}</div>
                      <div className="hint">
                        From review of &ldquo;{r.flagTitle}&rdquo; by {r.practitionerName}, {formatDateTime(r.createdAt, tz)}
                      </div>
                    </div>
                    <FollowUpDone reviewId={r.id} />
                  </li>
                ))}
              </ul>
            ))}

          {view === "done" &&
            (reviewed.length === 0 ? (
              <p className="card muted">No reviewed items in the current window.</p>
            ) : (
              <ul className="queue">
                {reviewed.map((q) => (
                  <li key={q.key} className="card tight">
                    <Link href={`/care/patients/${q.patientId}#${flagAnchor(q.key)}`} style={{ fontWeight: 800 }}>
                      {q.patientName}
                    </Link>{" "}
                    · {q.title}
                    <div>
                      <span className="pill pill-ok">✓ {q.latestReview?.decisionLabel}</span>{" "}
                      <span className="hint">
                        by {q.latestReview?.practitionerName}, {q.latestReview ? formatDateTime(q.latestReview.createdAt, tz) : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </div>
    </main>
  );
}
