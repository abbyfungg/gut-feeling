import { compareFlags } from "@/lib/rules/engine";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { CareEmpty, CareTopbar, FlagStatusText, Severity, SourceBadge } from "@/components/care/bits";
import { longDate, shortDateTime, windowLabel } from "@/components/care/format";
import { PatientTable, type PatientRow } from "@/components/care/PatientTable";
import { FollowUpDone } from "@/components/FollowUpDone";
import { Icon } from "@/components/Icon";
import { getConfig } from "@/lib/config";
import { getCaseload, getPatientOverview, listOpenFollowUps, type FlagWithStatus } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { flagAnchor, relativeTime } from "@/lib/ui";

export const metadata = { title: "Care team" };

const TITLES: Record<string, string> = {
  queue: "Review queue",
  patients: "Patients",
  followups: "Follow-ups",
  done: "Reviewed",
};

const NO_RECENT_MS = 72 * 3_600_000;

type Item = FlagWithStatus & { patientId: string; patientName: string };

export default async function CareHome({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const user = await requirePage("practitioner");
  const sp = await searchParams;
  const view = sp.view && TITLES[sp.view] ? sp.view : "queue";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const tz = getConfig().timezone;
  const now = new Date();
  const caseload = getCaseload(user, now);
  const followUps = listOpenFollowUps(user);

  const queue: Item[] = caseload
    .flatMap((c) => c.outstanding.map((f) => ({ ...f, patientId: c.patient.id, patientName: c.patient.name })))
    .sort(compareFlags);
  const reviewed: Item[] = caseload
    .flatMap((c) => c.allFlags.filter((f) => f.status === "reviewed").map((f) => ({ ...f, patientId: c.patient.id, patientName: c.patient.name })))
    .sort((a, b) => (b.latestReview?.createdAt ?? "").localeCompare(a.latestReview?.createdAt ?? ""));
  const high = queue.filter((x) => x.severity === "high").length;
  const newInfo = queue.filter((x) => x.status === "new_info").length;
  const today = new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: tz }).format(now);

  return (
    <>
      <CareTopbar title={TITLES[view]} eyebrow={today} q={q} />
      <div className="care-content">
        {view === "queue" && (
          <>
            <div className="statstrip">
              <div>
                <span className="stat-k">Needs review</span>
                <span className="stat-v">{queue.length}</span>
                <span className="stat-s">{high} high severity</span>
              </div>
              <div>
                <span className="stat-k">New info since review</span>
                <span className="stat-v">{newInfo}</span>
                <span className="stat-s">entries added after a review</span>
              </div>
              <Link href="/care?view=followups" className="stat-cell">
                <span className="stat-k">Open follow-ups</span>
                <span className="stat-v">{followUps.length}</span>
                <span className="stat-s">from your team&apos;s reviews</span>
              </Link>
              <Link href="/care?view=patients" className="stat-cell">
                <span className="stat-k">Patients sharing</span>
                <span className="stat-v">{caseload.length}</span>
                <span className="stat-s">with you right now</span>
              </Link>
            </div>

            <section className="panel qtable" aria-labelledby="queue-h">
              <div className="panel-head">
                <h2 id="queue-h">
                  Flags needing review <span className="h-count">{queue.length}</span>
                </h2>
                <span className="meta">Most urgent first: high severity, possible blockage at the top</span>
              </div>
              {queue.length === 0 ? (
                <CareEmpty title="All caught up" pose="celebrate">
                  Nothing needs review. New items appear here when a rule is met by a patient&apos;s entries.
                </CareEmpty>
              ) : (
                <>
                  <div className="qhead" aria-hidden>
                    <span>Patient</span>
                    <span>Flag</span>
                    <span className="q-col-evidence">Evidence</span>
                    <span className="q-col-dates">Window</span>
                    <span className="q-col-status">Status</span>
                    <span className="q-col-sev">Severity</span>
                  </div>
                  <ul className="qlist">
                    {queue.map((x) => (
                      <li key={`${x.patientId}-${x.key}`}>
                        <Link className="queue-item" href={`/care/patients/${x.patientId}#${flagAnchor(x.key)}`}>
                          <span className="q-patient">
                            <Avatar name={x.patientName} />
                            <span className="truncate">{x.patientName}</span>
                          </span>
                          <span className="q-flag">
                            <strong>{x.title}</strong>
                            <span>{x.whatChanged}</span>
                          </span>
                          <span className="q-num q-col-evidence">
                            {x.evidenceIds.length} {x.evidenceIds.length === 1 ? "entry" : "entries"}
                          </span>
                          <span className="q-dates q-col-dates">
                            <span className="q-mlabel">Window </span>
                            {windowLabel(x.windowStart, x.windowEnd, tz)}
                            <span className="tiny faint" style={{ display: "block" }}>
                              latest {relativeTime(x.windowEnd, now)}
                            </span>
                          </span>
                          <span className="q-col-status">
                            <FlagStatusText status={x.status} />
                          </span>
                          <span className="q-col-sev">
                            <Severity level={x.severity} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="panel-foot row-2">
                <Icon name="shield" size={14} />
                Flags come from transparent rules applied to patient-reported entries. They are prompts for clinical judgement, not diagnoses.
              </div>
            </section>
          </>
        )}

        {view === "patients" && <PatientsView user={user} q={q} now={now} tz={tz} />}

        {view === "followups" && (
          <section className="panel" aria-labelledby="fu-h">
            <div className="panel-head">
              <h2 id="fu-h">
                Open follow-ups <span className="h-count">{followUps.length}</span>
              </h2>
              <span className="meta">Oldest first</span>
            </div>
            {followUps.length === 0 ? (
              <CareEmpty title="No open follow-ups" pose="happy">
                Follow-ups are created when a review decision needs action, such as contacting the patient.
              </CareEmpty>
            ) : (
              <div className="table-scroll">
                <table className="ctable" style={{ minWidth: 820 }}>
                  <thead>
                    <tr>
                      <th scope="col">Patient</th>
                      <th scope="col">Follow-up</th>
                      <th scope="col">From review</th>
                      <th scope="col">Opened</th>
                      <th scope="col" className="r">
                        <span className="visually-hidden">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {followUps.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="pt-cell" style={{ minWidth: 160 }}>
                            <Avatar name={r.patientName} />
                            <Link href={`/care/patients/${r.patientId}?tab=reviews`} className="pt-link">
                              {r.patientName}
                            </Link>
                          </div>
                        </td>
                        <td style={{ maxWidth: 360 }}>
                          <span className="strong" style={{ display: "block" }}>
                            {r.followUp}
                          </span>
                          {r.note && <span className="tiny faint">Note: {r.note}</span>}
                        </td>
                        <td>
                          <span style={{ display: "block" }}>{r.decisionLabel}</span>
                          <span className="tiny faint">{r.flagTitle}</span>
                        </td>
                        <td className="n">
                          <span style={{ display: "block" }}>{relativeTime(r.createdAt, now)}</span>
                          <span className="tiny faint">
                            {shortDateTime(r.createdAt, tz)} · {r.practitionerName}
                          </span>
                        </td>
                        <td className="r">
                          <FollowUpDone reviewId={r.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {view === "done" && (
          <section className="panel" aria-labelledby="done-h">
            <div className="panel-head">
              <h2 id="done-h">
                Recently reviewed <span className="h-count">{reviewed.length}</span>
              </h2>
              <span className="meta">Flags in the current window with a clinician review</span>
            </div>
            {reviewed.length === 0 ? (
              <CareEmpty title="Nothing reviewed yet" pose="sleepy">
                Reviewed flags appear here. Each patient&apos;s Reviews tab keeps the full history.
              </CareEmpty>
            ) : (
              <div className="table-scroll">
                <table className="ctable" style={{ minWidth: 820 }}>
                  <thead>
                    <tr>
                      <th scope="col">Patient</th>
                      <th scope="col">Flag</th>
                      <th scope="col">Decision</th>
                      <th scope="col">Reviewed</th>
                      <th scope="col">Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewed.map((x) => (
                      <tr key={`${x.patientId}-${x.key}`}>
                        <td>
                          <div className="pt-cell" style={{ minWidth: 160 }}>
                            <Avatar name={x.patientName} />
                            <Link href={`/care/patients/${x.patientId}?tab=reviews`} className="pt-link">
                              {x.patientName}
                            </Link>
                          </div>
                        </td>
                        <td>
                          <Link href={`/care/patients/${x.patientId}#${flagAnchor(x.key)}`} className="pt-link" style={{ fontSize: "var(--fs-13)" }}>
                            {x.title}
                          </Link>
                          <span className="tiny faint" style={{ display: "block" }}>
                            {windowLabel(x.windowStart, x.windowEnd, tz)}
                          </span>
                        </td>
                        <td>
                          <SourceBadge kind="clinician">{x.latestReview?.decisionLabel}</SourceBadge>
                        </td>
                        <td className="n">
                          <span style={{ display: "block" }}>{x.latestReview?.practitionerName}</span>
                          <span className="tiny faint">{x.latestReview ? shortDateTime(x.latestReview.createdAt, tz) : ""}</span>
                        </td>
                        <td>
                          {x.latestReview?.followUpStatus === "open" ? (
                            <span className="status-text">Open</span>
                          ) : x.latestReview?.followUpStatus === "done" ? (
                            <span className="status-text">
                              <Icon name="check" size={14} /> Done
                            </span>
                          ) : (
                            <span className="faint">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}

function PatientsView({ user, q, now, tz }: { user: Awaited<ReturnType<typeof requirePage>>; q: string; now: Date; tz: string }) {
  const caseload = getCaseload(user, now);
  if (caseload.length === 0)
    return (
      <section className="panel">
        <CareEmpty title="No patients yet" pose="curious">
          Patients appear here once they choose to share their diary with you.
        </CareEmpty>
      </section>
    );
  const needle = q.toLowerCase();
  const rows: PatientRow[] = caseload
    .filter((c) => !needle || c.patient.name.toLowerCase().includes(needle))
    .map((c) => {
      const o = getPatientOverview(user, c.patient.id, now);
      const last = c.lastEntryAt;
      return {
        id: c.patient.id,
        name: c.patient.name,
        about: c.patient.about,
        isSynthetic: c.patient.isSynthetic,
        lastEntryAt: last,
        lastEntryRel: last ? relativeTime(last, now) : null,
        lastEntryDate: last ? shortDateTime(last, tz) : null,
        logs7: o.trends.recent.movements,
        loggedDays7: o.trends.recent.loggedDays,
        avg7: o.trends.recent.avgType,
        avgPrev: o.trends.previous.avgType,
        openFlags: c.outstanding.length,
        highFlags: c.outstanding.filter((f) => f.severity === "high").length,
        followUps: c.openFollowUps,
        sharedSinceAt: o.sharedSince,
        sharedSince: o.sharedSince ? longDate(o.sharedSince, tz) : null,
        noRecent: !last || now.getTime() - new Date(last).getTime() > NO_RECENT_MS,
      };
    });
  return <PatientTable rows={rows} q={q || undefined} />;
}
