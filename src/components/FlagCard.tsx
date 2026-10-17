import { describeContext } from "@/lib/rules/engine";
import type { FlagWithStatus } from "@/lib/records";
import { formatDateTime } from "@/lib/time";
import { flagAnchor } from "@/lib/ui";
import { ReviewForm } from "./ReviewForm";
import { FollowUpDone } from "./FollowUpDone";

export function FlagCard({ flag, patientId, timeZone, entryLabels }: { flag: FlagWithStatus; patientId: string; timeZone: string; entryLabels: Record<string, string> }) {
  const ctx = describeContext(flag.context, timeZone);
  const r = flag.latestReview;
  return (
    <article id={flagAnchor(flag.key)} className={`flag-card ${flag.severity}${flag.status === "reviewed" ? " reviewed" : ""}`} aria-labelledby={`${flagAnchor(flag.key)}-t`}>
      <div className="flag-head">
        <div>
          <h3 id={`${flagAnchor(flag.key)}-t`} style={{ marginBottom: 4 }}>
            {flag.title}
          </h3>
          <div className="row" style={{ gap: 6 }}>
            <span className={`pill ${flag.severity === "high" ? "pill-high" : "pill-med"}`}>{flag.severity === "high" ? "High priority" : "Medium priority"}</span>
            {flag.status === "outstanding" && <span className="pill pill-neutral">Not yet reviewed</span>}
            {flag.status === "new_info" && <span className="pill pill-lav">New entries since last review</span>}
            {flag.status === "reviewed" && <span className="pill pill-ok">✓ Reviewed</span>}
            <span className="pill pill-info">Rule-based</span>
          </div>
        </div>
      </div>
      <div className="flag-body">
        <dl className="why">
          <dt>What changed</dt>
          <dd>{flag.whatChanged}</dd>
          <dt>When</dt>
          <dd>
            {formatDateTime(flag.windowStart, timeZone)}
            {flag.windowEnd !== flag.windowStart && <> to {formatDateTime(flag.windowEnd, timeZone)}</>}
          </dd>
          <dt>Supporting entries</dt>
          <dd>
            <div className="evidence-list">
              {flag.evidenceIds.map((id) => (
                <a key={id} href={`#entry-${id}`} className="evidence-chip">
                  {entryLabels[id] ?? id}
                </a>
              ))}
            </div>
          </dd>
          {ctx && (
            <>
              <dt>Context</dt>
              <dd>{ctx}</dd>
            </>
          )}
          <dt>Rule</dt>
          <dd className="muted">{flag.ruleDescription}</dd>
          <dt>Keep in mind</dt>
          <dd className="muted">{flag.caveat}</dd>
        </dl>
      </div>
      <div className="review-box">
        {r && (
          <div style={{ marginBottom: flag.status === "reviewed" ? 0 : 14 }}>
            <p style={{ margin: 0 }}>
              <strong>{r.decisionLabel}</strong> · {r.practitionerName}, {formatDateTime(r.createdAt, timeZone)}
            </p>
            {r.note && <p style={{ margin: "4px 0 0" }}>{r.note}</p>}
            {r.followUp && (
              <p style={{ margin: "4px 0 0" }} className="row">
                <span>
                  Follow-up: {r.followUp} {r.followUpStatus === "done" ? <span className="pill pill-ok">Done</span> : <span className="pill pill-lav">Open</span>}
                </span>
                {r.followUpStatus === "open" && <FollowUpDone reviewId={r.id} />}
              </p>
            )}
          </div>
        )}
        {flag.status !== "reviewed" && (
          <details open={!r}>
            <summary style={{ cursor: "pointer", fontWeight: 800, marginBottom: 10 }}>{r ? "Review again" : "Record a review"}</summary>
            <ReviewForm patientId={patientId} flagKey={flag.key} suggestion={flag.suggestedFollowUp} />
          </details>
        )}
      </div>
    </article>
  );
}
