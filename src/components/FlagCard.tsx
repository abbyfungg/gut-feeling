import { describeContext } from "@/lib/rules/engine";
import type { FlagWithStatus } from "@/lib/records";
import { formatDateTime } from "@/lib/time";
import { flagAnchor } from "@/lib/ui";
import { Avatar } from "./Avatar";
import { FollowUpDone } from "./FollowUpDone";
import { Icon } from "./Icon";
import { ReviewForm } from "./ReviewForm";

export function FlagCard({ flag, patientId, timeZone, entryLabels }: { flag: FlagWithStatus; patientId: string; timeZone: string; entryLabels: Record<string, string> }) {
  const ctx = describeContext(flag.context, timeZone);
  const r = flag.latestReview;
  const anchor = flagAnchor(flag.key);
  const reviewed = flag.status === "reviewed";
  return (
    <article id={anchor} className={`flag-card ${flag.severity}${reviewed ? " reviewed" : ""}`} aria-labelledby={`${anchor}-t`}>
      <div className="flag-head">
        <span className={`insight-icon ${reviewed ? "ok" : flag.severity}`} aria-hidden>
          <Icon name={reviewed ? "check" : "alert"} size={20} />
        </span>
        <div className="grow stack-sm">
          <h3 id={`${anchor}-t`}>{flag.title}</h3>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className={`pill ${flag.severity === "high" ? "pill-high" : "pill-med"}`}>
              <span className="dot" style={{ background: flag.severity === "high" ? "var(--high)" : "var(--med)" }} />
              {flag.severity === "high" ? "High" : "Medium"}
            </span>
            {flag.status === "outstanding" && <span className="pill">Not reviewed</span>}
            {flag.status === "new_info" && <span className="pill pill-lav">New entries since review</span>}
            {reviewed && (
              <span className="pill pill-ok">
                <Icon name="check" size={12} /> Reviewed
              </span>
            )}
            <span className="pill pill-info">
              <Icon name="shield" size={12} /> Rule-based
            </span>
          </div>
        </div>
      </div>

      <div className="flag-body stack">
        <p style={{ fontWeight: 600, fontSize: "var(--t-lg)", lineHeight: 1.35 }}>{flag.whatChanged}</p>
        <dl className="facts">
          <dt>When</dt>
          <dd>
            {formatDateTime(flag.windowStart, timeZone)}
            {flag.windowEnd !== flag.windowStart && <> → {formatDateTime(flag.windowEnd, timeZone)}</>}
          </dd>
          <dt>Evidence</dt>
          <dd>
            <div className="evidence-list">
              {flag.evidenceIds.map((id) => (
                <a key={id} href={`#entry-${id}`} className="evidence-chip">
                  <Icon name="book" size={12} />
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
          <dt>Patient sees</dt>
          <dd className="muted">&ldquo;{flag.patientTitle}&rdquo;</dd>
        </dl>
        <p className="notice notice-info" style={{ padding: "10px 12px" }}>
          <Icon name="info" size={16} />
          <span>{flag.caveat}</span>
        </p>
      </div>

      <div className="review-box stack">
        {r && (
          <div className="row top" style={{ gap: 12 }}>
            <Avatar name={r.practitionerName} size="sm" />
            <div className="grow stack-sm">
              <div className="row wrap" style={{ gap: 8 }}>
                <strong className="small">{r.decisionLabel}</strong>
                <span className="tiny faint">
                  {r.practitionerName} · {formatDateTime(r.createdAt, timeZone)}
                </span>
              </div>
              {r.note && <p className="small">{r.note}</p>}
              {r.followUp && (
                <div className="row wrap" style={{ gap: 8 }}>
                  <span className="small">
                    <span className="faint">Follow-up:</span> {r.followUp}
                  </span>
                  {r.followUpStatus === "done" ? <span className="pill pill-ok">Done</span> : <span className="pill pill-lav">Open</span>}
                  {r.followUpStatus === "open" && <FollowUpDone reviewId={r.id} />}
                </div>
              )}
            </div>
          </div>
        )}
        {!reviewed && (
          <details open={!r}>
            <summary style={{ marginBottom: 12 }}>
              <span className="row" style={{ display: "inline-flex", gap: 6 }}>
                <Icon name="edit" size={16} />
                {r ? "Review again" : "Record a review"}
              </span>
            </summary>
            <ReviewForm patientId={patientId} flagKey={flag.key} suggestion={flag.suggestedFollowUp} />
          </details>
        )}
      </div>
    </article>
  );
}
