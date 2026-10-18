import type { Entry } from "../domain";

/** Added to every Gemini system prompt: ids belong in the structured fields, never in text people read. */
export const NO_IDS_IN_PROSE = `- Ids and refs (entry ids like en_..., flag keys, water:YYYY-MM-DD) go ONLY in the id/ref fields. Never write them in any sentence. In prose, name things by day and what happened, e.g. "the type 1 stool on Oct 14" or "water on Oct 14".`;

// Our ids are a short prefix plus 12 base64url characters (see newId), e.g. en_ASBdReqJGas3.
const ID_SRC = String.raw`\b[a-z]{2,5}_(?=[A-Za-z0-9_-]{0,11}[A-Z0-9])[A-Za-z0-9_-]{12}(?![A-Za-z0-9_-])`;
const ID = new RegExp(ID_SRC, "g");

function shortDay(day: string) {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}

function entryText(e: Entry, timeZone: string) {
  const d = new Date(e.occurredAt).toLocaleString("en-CA", { timeZone, month: "short", day: "numeric" });
  return e.kind === "no_movement" ? `${d}, no movement` : e.bristolType ? `${d}, type ${e.bristolType}` : d;
}

/**
 * Returns a function that turns any ids or refs Gemini still wrote into words: entry ids become
 * "Oct 14, type 1", water:2026-10-14 and bare dates become "Oct 14", flag keys become the flag title.
 */
export function makeHumanizer(entries: Entry[], timeZone: string, flagTitles: Map<string, string> = new Map()) {
  const byId = new Map(entries.map((e) => [e.id, entryText(e, timeZone)]));
  return (text: string): string => {
    let t = text;
    for (const [key, title] of flagTitles) t = t.split(key).join(`"${title}"`);
    t = t
      .replace(/\bwater:(\d{4}-\d{2}-\d{2})\b/g, (_, d) => shortDay(d))
      .replace(/\b(\d{4}-\d{2}-\d{2})(?:T[\d:.]+Z?)?\b/g, (_, d) => shortDay(d))
      // "entry id en_x", "(ref: en_x)" → just the label
      .replace(new RegExp(String.raw`\b(?:entry\s+(?:ids?\s*:?\s*)?|(?:ids?|refs?)\s*:?\s*)(?=${ID_SRC})`, "gi"), "")
      .replace(ID, (id) => byId.get(id) ?? "an entry")
      .replace(/\[\s*([^\]]*?)\s*\]/g, (m, inner) => (/^(an entry|[A-Z][a-z]{2} \d{1,2}.*)$/.test(inner) ? `(${inner})` : m))
      .replace(/ {2,}/g, " ");
    return t;
  };
}
