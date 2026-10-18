import { bristolInfo, contextLabel, symptomLabel, type Entry } from "@/lib/domain";
import { formatTime, localDay } from "@/lib/time";
import { Icon } from "@/components/Icon";
import { SourceBadge } from "./bits";
import { dayShort, groupOf, weekday } from "./format";

function confidenceLabel(c: "low" | "medium" | "high") {
  return `${c} confidence`;
}

/** What the AI suggested versus what the patient chose. Never presented as a finding. */
function AiLine({ e }: { e: Entry }) {
  const ai = e.ai;
  if (!ai) return null;
  const who = ai.simulated ? "Simulated AI (demo seed, not a live model call)" : `AI estimate (${ai.model})`;
  let text: string;
  if (!ai.usable || ai.estimatedType == null) text = `${who} could not estimate a type from the photo. Type chosen by the patient.`;
  else if (e.bristolSource === "ai_corrected") text = `${who} suggested type ${ai.estimatedType}, ${confidenceLabel(ai.confidence)}. Patient changed it to type ${e.bristolType}.`;
  else if (e.bristolSource === "ai_accepted") text = `${who} suggested type ${ai.estimatedType}, ${confidenceLabel(ai.confidence)}. Patient confirmed it.`;
  else text = `${who} suggested type ${ai.estimatedType}, ${confidenceLabel(ai.confidence)}. Patient recorded type ${e.bristolType ?? "none"}.`;
  return (
    <p className="ct-ai">
      <Icon name="sparkle" size={14} />
      <span>{text}</span>
    </p>
  );
}

function colourText(b: Entry["bloodReport"]) {
  if (b === "yes") return <span className="color-flag">Reported red or black colour</span>;
  if (b === "unsure") return <span>Unsure</span>;
  if (b === "no") return <span>None noticed</span>;
  return null;
}

/** One entry. `idPrefix` is for duplicate renderings (e.g. a summary panel) so `#entry-<id>` stays unique on the page. */
export function CareEntry({ e, timeZone, evidence, focus, reviewed, idPrefix }: { e: Entry; timeZone: string; evidence: boolean; focus: boolean; reviewed: boolean; idPrefix?: string }) {
  const b = bristolInfo(e.bristolType);
  const group = e.kind === "no_movement" ? "none" : groupOf(e.bristolType);
  const time = formatTime(e.occurredAt, timeZone);
  const title =
    e.kind === "no_movement" ? "No bowel movement (confirmed by patient)" : b ? `Type ${b.type} · ${b.clinical.replace(/^Type \d: /, "")}` : "Movement, type not recorded";
  const colour = colourText(e.bloodReport);
  return (
    <li id={`${idPrefix ?? ""}entry-${e.id}`} className={`ct-entry${idPrefix ? "" : " list-row"}${evidence ? " is-evidence" : ""}${focus ? " is-focus" : ""}`}>
      <span className="ct-time">{time}</span>
      <span className={`tmark ${group}`} aria-hidden>
        {e.kind === "no_movement" ? "0" : (b?.type ?? "?")}
      </span>
      <div className="ct-body">
        <div className="ct-title">
          <strong>
            <span className="ct-time-inline faint" style={{ fontWeight: 500 }}>
              {time} ·{" "}
            </span>
            {title}
          </strong>
          <span className="ct-badges">
            <SourceBadge kind="patient" />
            {e.ai && <SourceBadge kind={e.ai.simulated ? "ai-demo" : "ai"}>{e.ai.simulated ? "Simulated AI (demo)" : "AI-assisted"}</SourceBadge>}
            {evidence && <SourceBadge kind="rule">Flag evidence</SourceBadge>}
            {reviewed && <SourceBadge kind="clinician">Reviewed</SourceBadge>}
            {e.isSynthetic && <span className="badge badge-demo">Synthetic</span>}
          </span>
        </div>
        <AiLine e={e} />
        {e.kind === "movement" && (
          <div className="ct-facts">
            <span>
              <b>Symptoms</b> {e.symptoms == null ? <span className="faint">Skipped</span> : e.symptoms.length ? e.symptoms.map(symptomLabel).join(", ") : "None"}
            </span>
            {colour && (
              <span>
                <b>Colour</b> {colour}
              </span>
            )}
            {e.context && e.context.length > 0 && (
              <span>
                <b>Context</b> {e.context.map(contextLabel).join(", ")}
              </span>
            )}
          </div>
        )}
        {e.kind === "no_movement" && e.context && e.context.length > 0 && (
          <div className="ct-facts">
            <span>
              <b>Context</b> {e.context.map(contextLabel).join(", ")}
            </span>
          </div>
        )}
        {e.effort && (
          <p className="ct-ai">
            <Icon name="activity" size={14} />
            <span>
              Squeeze effort {e.effort.source === "simulated" ? "(simulated, not device data)" : "(squeeze ball)"}: peak {e.effort.peakEffort}/100 over {Math.round(e.effort.durationMs / 1000)} s,{" "}
              {e.effort.squeezes} {e.effort.squeezes === 1 ? "squeeze" : "squeezes"}. Patient comfort log, not a measure of straining.
            </span>
          </p>
        )}
        {e.notes && <p className="ct-note">&ldquo;{e.notes}&rdquo;</p>}
      </div>
    </li>
  );
}

/** Dated clinical timeline, grouped by local day, newest first. */
export function CareTimeline({
  entries,
  timeZone,
  evidenceIds = [],
  focusIds = [],
  reviewedIds = [],
}: {
  entries: Entry[];
  timeZone: string;
  evidenceIds?: string[];
  focusIds?: string[];
  reviewedIds?: string[];
}) {
  const ev = new Set(evidenceIds);
  const fo = new Set(focusIds);
  const rv = new Set(reviewedIds);
  const days: { day: string; list: Entry[] }[] = [];
  for (const e of entries) {
    const d = localDay(e.occurredAt, timeZone);
    const last = days[days.length - 1];
    if (last && last.day === d) last.list.push(e);
    else days.push({ day: d, list: [e] });
  }
  return (
    <div className="ctl">
      {days.map(({ day, list }) => {
        const mv = list.filter((e) => e.kind === "movement").length;
        return (
          <section key={day} className="ctl-day" aria-label={`${weekday(day)} ${dayShort(day)}`}>
            <div className="ctl-date">
              <strong>
                {weekday(day)}, {dayShort(day)}
              </strong>
              <span>{list.some((e) => e.kind === "no_movement") && mv === 0 ? "None confirmed" : `${mv} ${mv === 1 ? "movement" : "movements"}`}</span>
            </div>
            <ul className="ctl-entries">
              {list.map((e) => (
                <CareEntry key={e.id} e={e} timeZone={timeZone} evidence={ev.has(e.id)} focus={fo.has(e.id)} reviewed={rv.has(e.id)} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
