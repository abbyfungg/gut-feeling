import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Womby } from "@/components/Womby";
import { callName, FIRMER_TIPS, LOOSER_TIPS, type Finding } from "@/lib/pattern";

const FINDING_ICON: Record<Finding["kind"], string> = { harder: "trend", looser: "trend", gap: "calendar", straining: "activity", context: "pill" };

/**
 * Womby's early warning to the person themselves: what changed, in plain words, from their own entries,
 * a few gentle things that can help, and a nudge to tell their care team. Calm, never a diagnosis.
 */
export function GutNudge({
  firstName,
  findings,
  careTeam,
  replay = false,
  entriesHref,
}: {
  firstName: string;
  findings: Finding[];
  careTeam: string[];
  replay?: boolean;
  entriesHref?: string;
}) {
  const main = findings.filter((f) => f.kind !== "context");
  if (!main.length) return null;
  const firmer = findings.some((f) => f.kind === "harder" || f.kind === "gap" || f.kind === "straining");
  const tips = firmer ? FIRMER_TIPS : findings.some((f) => f.kind === "looser") ? LOOSER_TIPS : [];
  const lead =
    findings.some((f) => f.kind === "gap") && findings.some((f) => f.kind === "harder")
      ? `${firstName}, your gut has slowed down a lot this week. Here's exactly what I noticed in your log.`
      : `${firstName}, something's changed in your log this week. Here's what I noticed.`;

  return (
    <section className="nudge" aria-labelledby="nudge-h">
      <div className="nudge-head">
        <Womby pose="thinking" size={64} />
        <div className="nudge-bubble">
          <span className="eyebrow">Womby noticed a change</span>
          <h2 id="nudge-h">{lead}</h2>
        </div>
      </div>

      <ol className="nudge-findings">
        {findings.map((f) => (
          <li key={f.kind} className={`nudge-finding ${f.kind}`}>
            <span className="item-icon">
              <Icon name={FINDING_ICON[f.kind]} size={18} />
            </span>
            <div>
              <strong>{f.title}</strong>
              <p>{f.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      {tips.length > 0 && (
        <div className="nudge-tips">
          <h3>Things that often help</h3>
          <ul>
            {tips.map((t) => (
              <li key={t.text}>
                <Icon name={t.icon} size={16} /> {t.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="nudge-care">
        <Icon name="users" size={18} />
        <div>
          <strong>{careTeam.length ? `Tell ${callName(careTeam[0])} how you're feeling` : "Let your care team know"}</strong>
          <p>
            {careTeam.length
              ? `${careTeam.join(" and ")} can see these entries${replay ? " and will review them in the morning" : ""}. If this keeps going, or you're worried, call them or your doctor today rather than waiting for your next visit.`
              : "Your diary is private, so nobody else has seen this. If this keeps going, or you're worried, call your doctor or nurse. You can share your log from More > Sharing."}
          </p>
        </div>
      </div>

      <p className="nudge-urgent">
        <Icon name="alert" size={16} /> Get urgent care now for severe belly pain, a swollen belly, vomiting, or blood in your stool.
      </p>
      <div className="row wrap" style={{ gap: 8, justifyContent: "space-between" }}>
        <span className="badge badge-rule">From your own entries · not a diagnosis</span>
        {entriesHref && (
          <Link href={entriesHref} className="link-btn small">
            See these entries <Icon name="arrow" size={14} />
          </Link>
        )}
      </div>
    </section>
  );
}
