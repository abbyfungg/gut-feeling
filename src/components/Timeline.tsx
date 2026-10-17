import { bristolInfo, contextLabel, symptomLabel, type Entry } from "@/lib/domain";
import { formatDayLabel, formatTime, localDay } from "@/lib/time";
import { BristolArt } from "./BristolArt";
import { DeleteEntryButton } from "./DeleteEntryButton";
import { Icon } from "./Icon";

export function SourceBadge({ entry, audience }: { entry: Entry; audience: "patient" | "care" }) {
  const who = audience === "patient" ? "you" : "patient";
  if (entry.kind === "no_movement") return <span className="pill">Confirmed by {who}</span>;
  if (entry.bristolType == null) return <span className="pill">Type not recorded</span>;
  if (entry.ai?.simulated)
    return (
      <span className="pill pill-synthetic" title="Seeded demo output, not a live model call">
        Simulated AI · {entry.bristolSource === "ai_corrected" ? "corrected" : "confirmed"}
      </span>
    );
  if (entry.bristolSource === "ai_accepted")
    return (
      <span className="pill pill-lav">
        <Icon name="sparkle" size={12} /> AI-assisted · confirmed by {who}
      </span>
    );
  if (entry.bristolSource === "ai_corrected")
    return (
      <span className="pill pill-lav">
        <Icon name="sparkle" size={12} /> AI suggested {entry.ai?.estimatedType ?? "?"} · {who} chose {entry.bristolType}
      </span>
    );
  return <span className="pill">Entered by {who}</span>;
}

export function EntryDetails({ entry, audience }: { entry: Entry; audience: "patient" | "care" }) {
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      <SourceBadge entry={entry} audience={audience} />
      {entry.bloodReport === "yes" && <span className="pill pill-high">Reported red/black colour</span>}
      {entry.bloodReport === "unsure" && <span className="pill pill-med">Unsure about colour</span>}
      {entry.symptoms?.length === 0 && <span className="pill pill-ok">No symptoms</span>}
      {entry.symptoms?.map((s) => (
        <span key={s} className={`pill ${s === "fever" || s === "severe_pain" ? "pill-med" : ""}`}>
          {symptomLabel(s)}
        </span>
      ))}
      {entry.context?.map((c) => (
        <span key={c} className="pill pill-info">
          {contextLabel(c)}
        </span>
      ))}
      {audience === "care" && entry.isSynthetic && <span className="pill pill-synthetic">Synthetic</span>}
    </div>
  );
}

function group(t: number | null) {
  if (t == null) return "";
  return t <= 2 ? "hard" : t >= 6 ? "loose" : "typical";
}

/** Glanceable markers shown on the collapsed row. */
function RowMarkers({ entry }: { entry: Entry }) {
  const n = entry.symptoms?.length ?? 0;
  return (
    <>
      {entry.bloodReport === "yes" && <span className="pill pill-high">Red/black</span>}
      {entry.bloodReport === "unsure" && <span className="pill pill-med">Colour?</span>}
      {entry.symptoms?.some((s) => s === "fever" || s === "severe_pain") && <span className="pill pill-med">Felt unwell</span>}
      {n > 0 && !entry.symptoms?.some((s) => s === "fever" || s === "severe_pain") && (
        <span className="pill">
          {n} symptom{n === 1 ? "" : "s"}
        </span>
      )}
      {entry.symptoms?.length === 0 && <span className="pill pill-ok">Felt fine</span>}
      {(entry.bristolSource === "ai_accepted" || entry.bristolSource === "ai_corrected") && (
        <span className="pill pill-lav">
          <Icon name="sparkle" size={12} /> AI
        </span>
      )}
      {entry.notes && (
        <span className="pill" title="Has a note">
          <Icon name="edit" size={12} /> Note
        </span>
      )}
    </>
  );
}

/** Diary list grouped by day. Highlighted ids are the evidence for a flag. Rows expand for details. */
export function Timeline({
  entries,
  timeZone,
  audience,
  highlight = [],
  limit,
  canDelete = false,
}: {
  entries: Entry[];
  timeZone: string;
  audience: "patient" | "care";
  highlight?: string[];
  limit?: number;
  canDelete?: boolean;
}) {
  const shown = limit ? entries.slice(0, limit) : entries;
  const groups = new Map<string, Entry[]>();
  for (const e of shown) {
    const d = localDay(e.occurredAt, timeZone);
    groups.set(d, [...(groups.get(d) ?? []), e]);
  }
  const hl = new Set(highlight);
  return (
    <div className="timeline">
      {[...groups.entries()].map(([day, list]) => (
        <section key={day} className="day-group" aria-label={formatDayLabel(day)}>
          <h3 className="day-label">{formatDayLabel(day)}</h3>
          <div className="list">
            {list.map((e) => {
              const info = bristolInfo(e.bristolType);
              const none = e.kind === "no_movement";
              const title = none
                ? audience === "patient"
                  ? "No movement today"
                  : "Confirmed: no movement today"
                : info
                  ? audience === "patient"
                    ? info.nickname
                    : `Type ${info.type} · ${info.nickname}`
                  : "Movement";
              const sub = none ? "Quiet day, confirmed" : info ? (audience === "patient" ? `Type ${info.type}` : info.description) : "Type not recorded";
              const isEvidence = hl.has(e.id);
              return (
                <details key={e.id} id={`entry-${e.id}`} className={`list-row${isEvidence ? " evidence" : ""}`} open={isEvidence && audience === "care" ? true : undefined}>
                  <summary>
                    <div className={`row-art ${none ? "none" : group(e.bristolType)}`}>
                      {none ? <Icon name="moon" size={22} /> : e.bristolType ? <BristolArt type={e.bristolType} size={44} /> : <Icon name="info" size={22} />}
                    </div>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row-title">{title}</div>
                      <div className="row-meta">
                        <span className="tiny muted">{sub}</span>
                        <RowMarkers entry={e} />
                        {isEvidence && <span className="pill pill-dark">Evidence</span>}
                      </div>
                    </div>
                    <span className="row-time">{formatTime(e.occurredAt, timeZone)}</span>
                  </summary>
                  <div className="row-detail">
                    <EntryDetails entry={e} audience={audience} />
                    {e.notes && <p className="quote" style={{ margin: 0 }}>&ldquo;{e.notes}&rdquo;</p>}
                    {e.ai && !e.ai.simulated && audience === "care" && (
                      <p className="hint" style={{ margin: 0 }}>
                        AI estimate: type {e.ai.estimatedType ?? "n/a"}, {e.ai.confidence} confidence ({e.ai.model}). {e.ai.limitations}
                      </p>
                    )}
                    {canDelete && <DeleteEntryButton id={e.id} />}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
