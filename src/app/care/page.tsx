import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FollowUpDone } from "@/components/FollowUpDone";
import { Icon } from "@/components/Icon";
import { Mascot } from "@/components/Mascot";
import { getConfig } from "@/lib/config";
import { getCaseload, listOpenFollowUps, type FlagWithStatus } from "@/lib/records";
import { requirePage } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { flagAnchor, relativeTime } from "@/lib/ui";

export const metadata = { title: "Review queue" };

const TITLES: Record<string, string> = {
  queue: "Review queue",
  patients: "Patients",
  followups: "Follow-ups",
  done: "Reviewed",
};

const oneLine = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 } as const;

function SeverityPill({ severity }: { severity: "high" | "medium" }) {
  return (
    <span className={`pill ${severity === "high" ? "pill-high" : "pill-med"}`}>
      <span className="dot" style={{ background: severity === "high" ? "var(--high)" : "var(--med)" }} />
      {severity === "high" ? "High" : "Medium"}
    </span>
  );
}

function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="card pad-lg stack center" style={{ alignItems: "center" }}>
      <Mascot mood="celebrate" size={96} />
      <h2>{title}</h2>
      <p className="muted small">{sub}</p>
    </div>
  );
}

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
  const today = new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "short", day: "numeric", timeZone: tz }).format(now);

  const kpis = [
    { label: "Needs review", value: queue.length, icon: "bell", href: "/care", style: { background: "var(--med-bg)", color: "var(--med)" } },
    { label: "High priority", value: high, icon: "alert", href: "/care", style: { background: "var(--high-bg)", color: "var(--high)" } },
    { label: "Open follow-ups", value: followUps.length, icon: "clipboard", href: "/care?view=followups", style: { background: "var(--lavender)", color: "var(--lavender-strong)" } },
    { label: "Patients sharing", value: caseload.length, icon: "users", href: "/care?view=patients", style: { background: "var(--sky)", color: "var(--sky-strong)" } },
  ];

  return (
    <div className="stack-lg">
      <div className="console-head">
        <div className="stack-sm">
          <span className="eyebrow">
            {today} · Hi {firstName}
          </span>
          <h1>{TITLES[view] ?? "Review queue"}</h1>
        </div>
        <span className="pill pill-synthetic">Fictional patients</span>
      </div>

      <div className="grid-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="card kpi" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="stat-icon" style={k.style}>
              <Icon name={k.icon} size={18} />
            </span>
            <span className="stat">
              <span className="stat-value">{k.value}</span>
              <span className="stat-label">{k.label}</span>
            </span>
          </Link>
        ))}
      </div>

      {view === "queue" &&
        (queue.length === 0 ? (
          <Empty title="All caught up" sub="New items land here when a rule is met." />
        ) : (
          <section aria-labelledby="queue-h">
            <div className="section-head">
              <h2 id="queue-h">Needs review</h2>
              <span className="tiny faint">High first · newest first</span>
            </div>
            <ul className="queue">
              {queue.map((q) => (
                <li key={q.key}>
                  <Link className={`queue-item ${q.severity}`} href={`/care/patients/${q.patientId}#${flagAnchor(q.key)}`}>
                    <Avatar name={q.patientName} />
                    <span style={{ minWidth: 0 }}>
                      <span className="row" style={{ gap: 8, minWidth: 0 }}>
                        <span className="queue-title" style={{ flex: "none" }}>{q.patientName}</span>
                        <span className="small muted" style={oneLine}>
                          {q.title}
                        </span>
                      </span>
                      <span className="queue-what" style={{ display: "block", ...oneLine }}>
                        {q.whatChanged}
                      </span>
                    </span>
                    <span className="queue-side">
                      <span className="row" style={{ gap: 6 }}>
                        {q.status === "new_info" && <span className="pill pill-lav">New entries</span>}
                        <SeverityPill severity={q.severity} />
                      </span>
                      <span className="tiny faint row" style={{ gap: 4 }}>
                        <Icon name="clock" size={12} />
                        {relativeTime(q.windowEnd, now)} · {q.evidenceIds.length} {q.evidenceIds.length === 1 ? "entry" : "entries"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {view === "patients" &&
        (caseload.length === 0 ? (
          <Empty title="No patients yet" sub="Patients appear here once they share with you." />
        ) : (
          <div className="card" style={{ padding: "6px 8px" }}>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">Patient</th>
                    <th scope="col">Status</th>
                    <th scope="col">Last entry</th>
                    <th scope="col">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {caseload.map((c) => {
                    const worst = c.outstanding.some((f) => f.severity === "high") ? "high" : c.outstanding.length ? "medium" : null;
                    const gap = c.notices.find((n) => n.kind === "logging_gap");
                    return (
                      <tr key={c.patient.id}>
                        <td>
                          <Link href={`/care/patients/${c.patient.id}`} className="row" style={{ minWidth: 200 }}>
                            <Avatar name={c.patient.name} size="sm" />
                            <span className="grow">
                              <span className="bold" style={{ display: "block" }}>
                                {c.patient.name}
                              </span>
                              {c.patient.about && (
                                <span className="tiny faint" style={{ display: "block", maxWidth: 280, ...oneLine }}>
                                  {c.patient.about}
                                </span>
                              )}
                            </span>
                          </Link>
                        </td>
                        <td>
                          <div className="row wrap" style={{ gap: 6 }}>
                            {worst ? (
                              <span className={`pill ${worst === "high" ? "pill-high" : "pill-med"}`}>
                                <span className="dot" style={{ background: worst === "high" ? "var(--high)" : "var(--med)" }} />
                                {c.outstanding.length} open
                              </span>
                            ) : (
                              <span className="pill pill-ok">
                                <Icon name="check" size={12} /> Clear
                              </span>
                            )}
                            {c.openFollowUps > 0 && <span className="pill pill-lav">{c.openFollowUps} follow-up</span>}
                          </div>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {c.lastEntryAt ? <span title={formatDateTime(c.lastEntryAt, tz)}>{relativeTime(c.lastEntryAt, now)}</span> : <span className="faint">Never</span>}
                        </td>
                        <td>
                          <div className="row wrap" style={{ gap: 6 }}>
                            {gap ? <span className="pill pill-info">Logging gap</span> : <span className="faint">–</span>}
                            {c.patient.isSynthetic && <span className="pill pill-synthetic">Synthetic</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {view === "followups" &&
        (followUps.length === 0 ? (
          <Empty title="No open follow-ups" sub="Follow-ups you add in a review show up here." />
        ) : (
          <ul className="queue">
            {followUps.map((r) => (
              <li key={r.id} className="card row wrap" style={{ gap: 14 }}>
                <Avatar name={r.patientName} />
                <div className="grow" style={{ minWidth: 220 }}>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <Link href={`/care/patients/${r.patientId}`} className="queue-title" style={{ textDecoration: "none" }}>
                      {r.patientName}
                    </Link>
                    <span className="pill pill-lav">{r.decisionLabel}</span>
                  </div>
                  <p style={{ marginTop: 4, fontWeight: 600 }}>{r.followUp}</p>
                  <p className="tiny faint" style={{ marginTop: 2 }}>
                    {r.flagTitle} · {r.practitionerName} · {formatDateTime(r.createdAt, tz)}
                  </p>
                </div>
                <FollowUpDone reviewId={r.id} />
              </li>
            ))}
          </ul>
        ))}

      {view === "done" &&
        (reviewed.length === 0 ? (
          <Empty title="Nothing reviewed yet" sub="Reviewed items in the current window appear here." />
        ) : (
          <ul className="queue">
            {reviewed.map((q) => (
              <li key={q.key}>
                <Link href={`/care/patients/${q.patientId}#${flagAnchor(q.key)}`} className="queue-item" style={{ gridTemplateColumns: "auto 1fr auto" }}>
                  <Avatar name={q.patientName} />
                  <span style={{ minWidth: 0 }}>
                    <span className="row" style={{ gap: 8, minWidth: 0 }}>
                      <span className="queue-title" style={{ flex: "none" }}>{q.patientName}</span>
                      <span className="small muted" style={oneLine}>
                        {q.title}
                      </span>
                    </span>
                    <span className="queue-what" style={{ display: "block", ...oneLine }}>
                      {q.latestReview?.practitionerName}
                      {q.latestReview ? ` · ${formatDateTime(q.latestReview.createdAt, tz)}` : ""}
                    </span>
                  </span>
                  <span className="queue-side">
                    <span className="pill pill-ok">
                      <Icon name="check" size={12} /> {q.latestReview?.decisionLabel}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
