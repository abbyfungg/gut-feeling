import type { FlagWithStatus } from "@/lib/records";
import { formatDateTime } from "@/lib/time";
import Link from "next/link";
import { Icon } from "./Icon";

function span(f: FlagWithStatus, tz: string) {
  const fmt = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
  const a = fmt(f.windowStart);
  const b = fmt(f.windowEnd);
  return a === b ? a : `${a} – ${b}`;
}

/** Calm, plain-language versions of the care-team flags, for the person themselves. No jokes here. */
export function PatientFlags({ flags, timeZone, shared, heading = true }: { flags: FlagWithStatus[]; timeZone: string; shared: boolean; heading?: boolean }) {
  if (flags.length === 0) return null;
  return (
    <section aria-labelledby="worth-a-look" className="stack-sm">
      {heading && (
        <div className="section-head">
          <h2 id="worth-a-look">Worth a look</h2>
          <span className="pill">{flags.length}</span>
        </div>
      )}
      {flags.map((f) => {
        const reviewed = Boolean(f.latestReview);
        return (
          <details key={f.key} className="insight">
            <summary>
              <span className={`insight-icon ${reviewed && f.status === "reviewed" ? "ok" : f.severity}`} aria-hidden>
                <Icon name={reviewed && f.status === "reviewed" ? "check" : f.rule === "reported_blood" ? "drop" : "alert"} size={20} />
              </span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="insight-title" style={{ display: "block" }}>
                  {f.patientTitle}
                </span>
                <span className="insight-sub" style={{ display: "block" }}>
                  {span(f, timeZone)} · {f.evidenceIds.length} {f.evidenceIds.length === 1 ? "log" : "logs"}
                  {reviewed ? ` · Seen by ${f.latestReview!.practitionerName}` : ""}
                </span>
              </span>
              <span className="chev" aria-hidden>
                <Icon name="chevron" size={18} />
              </span>
            </summary>
            <div className="insight-body">
              <p style={{ margin: 0, color: "var(--ink)" }}>{f.patientMessage}</p>
              {f.latestReview ? (
                <p style={{ margin: 0, fontWeight: 700, color: "var(--ok-ink)" }}>
                  ✓ {f.latestReview.practitionerName} looked at this on {formatDateTime(f.latestReview.createdAt, timeZone)}
                  {f.status === "new_info" ? " (you've added entries since)" : ""}.
                </p>
              ) : shared ? (
                <p style={{ margin: 0 }}>Your care team can see this too. Not reviewed yet.</p>
              ) : (
                <p style={{ margin: 0 }}>
                  Private: nobody else has been notified. <Link href="/me/sharing" className="link">Sharing</Link>
                </p>
              )}
              <Link href={`/me/diary?highlight=${encodeURIComponent(f.evidenceIds.join(","))}`} className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }}>
                See those entries <Icon name="arrow" size={16} />
              </Link>
            </div>
          </details>
        );
      })}
      <p className="tiny muted" style={{ margin: "2px 4px 0" }}>
        Simple rules about your own logs, not a diagnosis. Feeling very unwell? Contact a healthcare provider, or call 911 in an emergency.
      </p>
    </section>
  );
}
