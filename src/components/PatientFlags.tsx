import Link from "next/link";
import type { FlagWithStatus } from "@/lib/records";
import { formatDateTime } from "@/lib/time";
import { Icon } from "./Icon";

function span(f: FlagWithStatus, tz: string) {
  const fmt = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, month: "short", day: "numeric" }).format(new Date(iso));
  const a = fmt(f.windowStart);
  const b = fmt(f.windowEnd);
  return a === b ? a : `${a} – ${b}`;
}

/** Plain-language versions of the rule-based flags, for the person themselves. Calm, never alarming, never a diagnosis. */
export function PatientFlags({ flags, timeZone, shared }: { flags: FlagWithStatus[]; timeZone: string; shared: boolean }) {
  if (flags.length === 0) return null;
  return (
    <section aria-labelledby="worth-a-look" className="stack-2">
      <div className="section-head">
        <h2 id="worth-a-look">Worth a look</h2>
        <span className="badge badge-rule">Based on simple rules</span>
      </div>
      <div className="group">
        {flags.map((f) => {
          const seen = f.latestReview && f.status === "reviewed";
          return (
            <details key={f.key} className="flag-item">
              <summary className="item" style={{ cursor: "pointer", listStyle: "none" }}>
                <span className="item-icon" style={{ background: seen ? "var(--ok-bg)" : f.severity === "high" ? "var(--danger-bg)" : "var(--warn-bg)", color: seen ? "var(--ok)" : f.severity === "high" ? "var(--danger)" : "var(--warn)" }}>
                  <Icon name={seen ? "check" : f.rule === "reported_blood" ? "drop" : "flag"} size={18} />
                </span>
                <span className="grow">
                  <span className="item-title" style={{ display: "block" }}>
                    {f.patientTitle}
                  </span>
                  <span className="item-sub" style={{ display: "block" }}>
                    {span(f, timeZone)} · {f.evidenceIds.length} {f.evidenceIds.length === 1 ? "entry" : "entries"}
                    {f.latestReview ? ` · Seen by ${f.latestReview.practitionerName}` : ""}
                  </span>
                </span>
                <Icon name="chevronDown" size={18} className="chev" />
              </summary>
              <div className="stack-3" style={{ padding: "0 16px 16px 64px" }}>
                <p className="small">{f.patientMessage}</p>
                {f.latestReview ? (
                  <p className="small" style={{ color: "var(--src-clinician)", fontWeight: 600 }}>
                    {f.latestReview.practitionerName} reviewed this on {formatDateTime(f.latestReview.createdAt, timeZone)}
                    {f.status === "new_info" ? ". You've added entries since." : "."}
                  </p>
                ) : (
                  <p className="small muted">{shared ? "Your care team can see this. Not reviewed yet." : "Your diary is private, so nobody else was notified."}</p>
                )}
                <Link href={`/me/entries?highlight=${encodeURIComponent(f.evidenceIds.join(","))}`} className="link-btn small">
                  See the entries behind this <Icon name="arrow" size={16} />
                </Link>
              </div>
            </details>
          );
        })}
      </div>
      <p className="tiny faint" style={{ padding: "0 4px" }}>
        Not a diagnosis. If you feel very unwell, contact a healthcare provider, or call 911 in an emergency.
      </p>
    </section>
  );
}
