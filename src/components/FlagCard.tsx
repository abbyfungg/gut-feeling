import { describeContext } from "@/lib/rules/engine";
import type { FlagWithStatus } from "@/lib/records";
import { formatDateTime } from "@/lib/time";
import { flagAnchor } from "@/lib/ui";
import { FlagStatusText, Severity, SourceBadge } from "./care/bits";
import { FollowUpDone } from "./FollowUpDone";
import { Icon } from "./Icon";
import { ReviewForm } from "./ReviewForm";

export type EntryRef = { label: string; group: string };

/**
 * One rule-based flag: what changed, the evidence entries it rests on, context, and the review trail.
 * Evidence chips link to `#entry-<id>` unless `evidenceHref` says otherwise.
 */
export function FlagCard({
  flag,
  patientId,
  timeZone,
  entries,
  evidenceHref = (id) => `#entry-${id}`,
}: {
  flag: FlagWithStatus;
  patientId: string;
  timeZone: string;
  entries: Record<string, EntryRef>;
  evidenceHref?: (entryId: string) => string;
}) {
  const ctx = describeContext(flag.context, timeZone);
  const r = flag.latestReview;
  const anchor = flagAnchor(flag.key);
  const reviewed = flag.status === "reviewed";
  return (
    <article id={anchor} className={`flag-card${reviewed ? " is-reviewed" : ""}`} aria-labelledby={`${anchor}-t`}>
      <div className="flag-main">
        <div className="flag-top">
          <SourceBadge kind="rule">Rule-based prompt</SourceBadge>
          <Severity level={flag.severity} />
          <FlagStatusText status={flag.status} />
        </div>
        <h3 id={`${anchor}-t`}>{flag.title}</h3>
        <p className="flag-what">{flag.whatChanged}</p>
        <dl className="kv">
          <dt>Window</dt>
          <dd className="num">
            {formatDateTime(flag.windowStart, timeZone)}
            {flag.windowEnd !== flag.windowStart && <> – {formatDateTime(flag.windowEnd, timeZone)}</>}
          </dd>
          <dt>
            Evidence <span className="h-count">({flag.evidenceIds.length})</span>
          </dt>
          <dd>
            <div className="evidence-list">
              {flag.evidenceIds.map((id) => (
                <a key={id} href={evidenceHref(id)} className="evidence-chip">
                  <i className={`leg-${entries[id]?.group ?? "none"}`} style={entries[id]?.group === "none" || !entries[id] ? { background: "var(--g-none)" } : undefined} aria-hidden />
                  {entries[id]?.label ?? "Entry"}
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
          <dt>Patient sees</dt>
          <dd className="muted">&ldquo;{flag.patientTitle}&rdquo;</dd>
        </dl>
        <p className="flag-caveat">
          <Icon name="info" size={14} />
          <span>{flag.caveat}</span>
        </p>
      </div>

      <div className="flag-review">
        {r && (
          <div className="review-rec">
            <div className="grow stack-1">
              <div className="row wrap" style={{ gap: 8 }}>
                <SourceBadge kind="clinician">Clinician-reviewed</SourceBadge>
                <strong>{r.decisionLabel}</strong>
                <span className="tiny faint num">
                  {r.practitionerName} · {formatDateTime(r.createdAt, timeZone)}
                </span>
              </div>
              {r.note && <p>{r.note}</p>}
              {r.followUp && (
                <div className="row wrap" style={{ gap: 8 }}>
                  <span>
                    <span className="faint">Follow-up:</span> {r.followUp}
                  </span>
                  <span className={`badge ${r.followUpStatus === "done" ? "badge-ok" : ""}`}>{r.followUpStatus === "done" ? "Done" : "Open"}</span>
                  {r.followUpStatus === "open" && <FollowUpDone reviewId={r.id} />}
                </div>
              )}
            </div>
          </div>
        )}
        {!reviewed && (
          <details open={!r}>
            <summary>
              <Icon name="edit" size={14} />
              {r ? "Review again (new entries since last review)" : "Record a review"}
              <Icon name="chevronDown" size={14} />
            </summary>
            <ReviewForm patientId={patientId} flagKey={flag.key} suggestion={flag.suggestedFollowUp} />
          </details>
        )}
      </div>
    </article>
  );
}
