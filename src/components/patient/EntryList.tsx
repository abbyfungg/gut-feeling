import Link from "next/link";
import { BristolArt } from "@/components/BristolArt";
import { Icon } from "@/components/Icon";
import { bristolInfo, symptomLabel, type Entry } from "@/lib/domain";
import { formatDayLabel, formatTime, localDay } from "@/lib/time";
import { groupOf } from "./meta";

export function entryTitle(e: Entry) {
  if (e.kind === "no_movement") return "No movement";
  const info = bristolInfo(e.bristolType);
  return info ? `Type ${info.type} · ${info.nickname}` : "Bathroom trip";
}

function entrySummary(e: Entry) {
  const parts: string[] = [];
  if (e.kind === "no_movement") parts.push("Quiet day, confirmed by you");
  if (e.bloodReport === "yes") parts.push("Red or black colour");
  else if (e.bloodReport === "unsure") parts.push("Unsure about colour");
  if (e.symptoms?.length === 0) parts.push("Felt fine");
  else if (e.symptoms?.length) parts.push(e.symptoms.map((s) => symptomLabel(s)).join(", "));
  if (e.notes) parts.push("Note");
  return parts.join(" · ");
}

export function EntryArt({ entry, size = 44 }: { entry: Entry; size?: number }) {
  const g = groupOf(entry.bristolType);
  return (
    <span className={`entry-art ${g}`} style={{ width: size, height: size }}>
      {entry.kind === "no_movement" ? (
        <Icon name="moon" size={20} />
      ) : entry.bristolType ? (
        <BristolArt type={entry.bristolType} size={Math.round(size * 0.82)} />
      ) : (
        <Icon name="help" size={20} />
      )}
    </span>
  );
}

/** Entries grouped by day, each row linking to its detail page. */
export function dayName(day: string, today?: string) {
  if (today && day === today) return "Today";
  if (today) {
    const [y, m, d] = today.split("-").map(Number);
    const yest = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
    if (day === yest) return "Yesterday";
  }
  return formatDayLabel(day);
}

export function EntryList({
  entries,
  timeZone,
  today,
  limit,
  highlight = [],
  grouped = true,
}: {
  entries: Entry[];
  timeZone: string;
  today?: string;
  limit?: number;
  highlight?: string[];
  grouped?: boolean;
}) {
  const shown = limit ? entries.slice(0, limit) : entries;
  const hl = new Set(highlight);
  const row = (e: Entry) => {
    const ai = e.bristolSource === "ai_accepted" || e.bristolSource === "ai_corrected";
    const summary = entrySummary(e);
    return (
      <Link key={e.id} id={`entry-${e.id}`} href={`/me/entries/${e.id}`} className={`entry${hl.has(e.id) ? " evidence" : ""}`}>
        <EntryArt entry={e} />
        <span className="grow">
          <span className="entry-title" style={{ display: "block" }}>
            {entryTitle(e)}
          </span>
          <span className="entry-meta truncate" style={{ display: "block" }}>
            {grouped ? formatTime(e.occurredAt, timeZone) : `${dayName(localDay(e.occurredAt, timeZone), today)} · ${formatTime(e.occurredAt, timeZone)}`}
            {summary ? ` · ${summary}` : ""}
          </span>
        </span>
        {ai && (
          <span className="badge badge-ai" title="Photo analysis helped pick the type">
            <Icon name="sparkle" /> AI
          </span>
        )}
        {e.bloodReport === "yes" && <span className="dot" style={{ color: "var(--danger)" }} aria-label="Red or black colour reported" />}
        <Icon name="chevron" size={18} className="chev" />
      </Link>
    );
  };
  if (!grouped) return <div className="group">{shown.map(row)}</div>;
  const groups = new Map<string, Entry[]>();
  for (const e of shown) {
    const d = localDay(e.occurredAt, timeZone);
    groups.set(d, [...(groups.get(d) ?? []), e]);
  }
  return (
    <div className="stack">
      {[...groups.entries()].map(([day, list]) => (
        <section key={day} className="stack-2" aria-label={dayName(day, today)}>
          <h3 className="eyebrow" style={{ fontFamily: "var(--font-body)", padding: "0 4px" }}>
            {dayName(day, today)}
          </h3>
          <div className="group">{list.map(row)}</div>
        </section>
      ))}
    </div>
  );
}
