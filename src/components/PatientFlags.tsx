import type { FlagWithStatus } from "@/lib/records";
import { formatDateTime } from "@/lib/time";
import Link from "next/link";

/** Calm, plain-language versions of the care-team flags, for the person themselves. No jokes here. */
export function PatientFlags({ flags, timeZone, shared }: { flags: FlagWithStatus[]; timeZone: string; shared: boolean }) {
  if (flags.length === 0) return null;
  return (
    <section aria-labelledby="worth-a-look" className="stack">
      <h2 id="worth-a-look" style={{ marginBottom: 0 }}>
        Worth a look
      </h2>
      {flags.map((f) => (
        <div key={f.key} className={`notice ${f.severity === "high" ? "notice-high" : "notice-med"}`}>
          <span className="notice-icon" aria-hidden>
            !
          </span>
          <div>
            <p style={{ marginBottom: 6 }}>{f.patientMessage}</p>
            <p className="hint" style={{ marginBottom: 6, color: "inherit", opacity: 0.85 }}>
              Based on {f.evidenceIds.length} {f.evidenceIds.length === 1 ? "entry" : "entries"} from {formatDateTime(f.windowStart, timeZone)}
              {f.windowEnd !== f.windowStart ? ` to ${formatDateTime(f.windowEnd, timeZone)}` : ""} ·{" "}
              <Link href={`/me/diary?highlight=${encodeURIComponent(f.evidenceIds.join(","))}`} style={{ color: "inherit" }}>
                See those entries
              </Link>
            </p>
            {f.latestReview ? (
              <p style={{ margin: 0, fontWeight: 700 }}>
                ✓ {f.latestReview.practitionerName} looked at this on {formatDateTime(f.latestReview.createdAt, timeZone)}
                {f.status === "new_info" ? " (you've added entries since)" : ""}.
              </p>
            ) : shared ? (
              <p style={{ margin: 0 }} className="hint">
                Your care team can see this too. It hasn&apos;t been reviewed yet.
              </p>
            ) : (
              <p style={{ margin: 0 }} className="hint">
                Your diary is private, so nobody else has been notified. <Link href="/me/sharing" style={{ color: "inherit" }}>Sharing settings</Link>
              </p>
            )}
          </div>
        </div>
      ))}
      <p className="hint" style={{ margin: 0 }}>
        These notes come from simple rules about your own entries, not a diagnosis. If you feel very unwell, contact a healthcare provider, or call 911 in an emergency.
      </p>
    </section>
  );
}
