import { bristolInfo, contextLabel, symptomLabel, type Entry } from "@/lib/domain";
import { formatDayLabel, formatTime, localDay } from "@/lib/time";
import { BristolArt } from "./BristolArt";
import { DeleteEntryButton } from "./DeleteEntryButton";

export function SourceBadge({ entry, audience }: { entry: Entry; audience: "patient" | "care" }) {
  if (entry.kind === "no_movement") return <span className="pill pill-neutral">Confirmed by {audience === "patient" ? "you" : "patient"}</span>;
  if (entry.bristolType == null) return <span className="pill pill-neutral">Type not recorded</span>;
  if (entry.ai?.simulated) return <span className="pill pill-synthetic" title="Seeded demo output, not a live model call">Simulated AI · {entry.bristolSource === "ai_corrected" ? "corrected" : "confirmed"}</span>;
  if (entry.bristolSource === "ai_accepted") return <span className="pill pill-lav">AI-assisted · confirmed by {audience === "patient" ? "you" : "patient"}</span>;
  if (entry.bristolSource === "ai_corrected") return <span className="pill pill-lav">AI suggested {entry.ai?.estimatedType ?? "?"} · {audience === "patient" ? "you" : "patient"} chose {entry.bristolType}</span>;
  return <span className="pill pill-neutral">Entered by {audience === "patient" ? "you" : "patient"}</span>;
}

export function EntryDetails({ entry, audience }: { entry: Entry; audience: "patient" | "care" }) {
  return (
    <div className="tl-meta">
      <SourceBadge entry={entry} audience={audience} />
      {entry.bloodReport === "yes" && <span className="pill pill-high">Reported red/black colour</span>}
      {entry.bloodReport === "unsure" && <span className="pill pill-med">Unsure about colour</span>}
      {entry.symptoms?.length === 0 && <span className="pill pill-ok">No symptoms</span>}
      {entry.symptoms?.map((s) => (
        <span key={s} className={`pill ${s === "fever" || s === "severe_pain" ? "pill-med" : "pill-neutral"}`}>
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

/** Diary-style timeline grouped by day. Highlighted ids are the evidence for a flag. */
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
    <ol className="timeline">
      {[...groups.entries()].map(([day, list]) => (
        <li key={day} className="tl-day">
          <div className="tl-day-label">{formatDayLabel(day)}</div>
          <ol className="tl-items">
            {list.map((e) => {
              const info = bristolInfo(e.bristolType);
              const title =
                e.kind === "no_movement"
                  ? audience === "patient"
                    ? "No movement today"
                    : "Confirmed: no movement today"
                  : info
                    ? audience === "patient"
                      ? `${info.nickname} · type ${info.type}`
                      : `Type ${info.type} · ${info.nickname}`
                    : "Movement (type not recorded)";
              return (
                <li key={e.id} id={`entry-${e.id}`} className={`tl-item${e.kind === "no_movement" ? " none" : ""}${hl.has(e.id) ? " evidence" : ""}`}>
                  <div className="tl-icon">{e.kind === "no_movement" ? <span aria-hidden style={{ fontSize: 22 }}>∅</span> : <BristolArt type={e.bristolType ?? 0} size={46} />}</div>
                  <div className="tl-body">
                    <div className="tl-head">
                      <span className="tl-title">{title}</span>
                      <span className="tl-time">{formatTime(e.occurredAt, timeZone)}</span>
                      {hl.has(e.id) && <span className="pill pill-lav">Evidence</span>}
                    </div>
                    <EntryDetails entry={e} audience={audience} />
                    {e.notes && <p className="tl-note">&ldquo;{e.notes}&rdquo;</p>}
                    {e.ai && !e.ai.simulated && audience === "care" && (
                      <p className="hint" style={{ margin: "6px 0 0" }}>
                        AI estimate: type {e.ai.estimatedType ?? "n/a"}, {e.ai.confidence} confidence ({e.ai.model}). {e.ai.limitations}
                      </p>
                    )}
                  </div>
                  {canDelete && <DeleteEntryButton id={e.id} />}
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );
}
