import type { ContextId, Entry, SymptomId } from "./domain";
import { addDays, localDay } from "./time";

/**
 * Plain-words description of how someone's bowel habits changed, computed only from their own entries.
 * Used for the patient's own early warning. Rule-based and deterministic, never a diagnosis.
 */

export interface PatternDay {
  day: string;
  types: number[];
  movements: number;
  /** The person confirmed there was no movement that day */
  confirmedNone: boolean;
  straining: boolean;
  context: ContextId[];
  entryIds: string[];
}

export type FindingKind = "harder" | "looser" | "gap" | "straining" | "context";

export interface Finding {
  kind: FindingKind;
  title: string;
  detail: string;
  entryIds: string[];
}

export interface PatternSummary {
  asOf: string;
  days: PatternDay[];
  usualType: number | null;
  usualPerDay: number | null;
  findings: Finding[];
  /** Hours since the last logged movement, or null if none in the window */
  hoursSinceLast: number | null;
}

const fmtDay = (day: string) => new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
const TYPE_WORD: Record<number, string> = { 1: "hard lumps", 2: "lumpy and hard", 3: "cracked but formed", 4: "smooth and soft", 5: "soft blobs", 6: "mushy", 7: "watery" };

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function listTypes(types: number[]) {
  if (types.length <= 1) return `type ${types[0]}`;
  return `types ${types.slice(0, -1).join(", ")} and ${types[types.length - 1]}`;
}

export function describePattern(all: Entry[], asOf: Date, timeZone: string, windowDays = 14): PatternSummary {
  const cutoff = asOf.getTime();
  const entries = all.filter((e) => new Date(e.occurredAt).getTime() <= cutoff).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const today = localDay(asOf, timeZone);
  const start = addDays(today, -(windowDays - 1));

  const days: PatternDay[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) days.push({ day: d, types: [], movements: 0, confirmedNone: false, straining: false, context: [], entryIds: [] });
  const byDay = new Map(days.map((d) => [d.day, d]));
  for (const e of entries) {
    const d = byDay.get(localDay(e.occurredAt, timeZone));
    if (!d) continue;
    d.entryIds.push(e.id);
    if (e.kind === "no_movement") d.confirmedNone = true;
    else {
      d.movements++;
      if (e.bristolType != null) d.types.push(e.bristolType);
      if (e.symptoms?.includes("straining" as SymptomId)) d.straining = true;
    }
    for (const c of e.context ?? []) if (!d.context.includes(c)) d.context.push(c);
  }

  // "Usual" = the person's own earlier entries (the 3 weeks before the last 7 days).
  const recentStart = addDays(today, -6);
  const earlier = entries.filter((e) => {
    const d = localDay(e.occurredAt, timeZone);
    return d < recentStart && d >= addDays(recentStart, -21);
  });
  const earlierMoves = earlier.filter((e) => e.kind === "movement");
  const usualType = median(earlierMoves.map((e) => e.bristolType).filter((t): t is number => t != null));
  const earlierDays = new Set(earlier.map((e) => localDay(e.occurredAt, timeZone))).size;
  const usualPerDay = earlierDays ? Math.round((earlierMoves.length / earlierDays) * 10) / 10 : null;

  const recent = entries.filter((e) => localDay(e.occurredAt, timeZone) >= recentStart);
  const recentMoves = recent.filter((e) => e.kind === "movement");
  const findings: Finding[] = [];

  const hard = recentMoves.filter((e) => e.bristolType != null && e.bristolType <= 2);
  if (hard.length >= 2 && (usualType == null || usualType >= 3)) {
    findings.push({
      kind: "harder",
      title: "Your stools got harder",
      detail: `${usualType ? `Your usual is type ${usualType} (${TYPE_WORD[usualType]}). ` : ""}Since ${fmtDay(localDay(hard[0].occurredAt, timeZone))} you've logged ${listTypes(hard.map((e) => e.bristolType as number))} (${TYPE_WORD[Math.min(...hard.map((e) => e.bristolType as number))]}).`,
      entryIds: hard.map((e) => e.id),
    });
  }
  const loose = recentMoves.filter((e) => e.bristolType != null && e.bristolType >= 6);
  if (loose.length >= 3 && (usualType == null || usualType <= 5)) {
    findings.push({
      kind: "looser",
      title: "Your stools got looser",
      detail: `${usualType ? `Your usual is type ${usualType}. ` : ""}You've logged ${loose.length} loose stools since ${fmtDay(localDay(loose[0].occurredAt, timeZone))}.`,
      entryIds: loose.map((e) => e.id),
    });
  }

  const lastMove = [...entries].reverse().find((e) => e.kind === "movement");
  const hoursSinceLast = lastMove ? Math.round((cutoff - new Date(lastMove.occurredAt).getTime()) / 3_600_000) : null;
  const noneDays = days.filter((d) => d.confirmedNone && d.movements === 0 && (!lastMove || d.day > localDay(lastMove.occurredAt, timeZone)));
  if (noneDays.length >= 2) {
    findings.push({
      kind: "gap",
      title: `Nothing for ${noneDays.length} days`,
      detail: `${usualPerDay ? `You usually go about ${usualPerDay >= 1 ? `${Math.round(usualPerDay)} time${Math.round(usualPerDay) === 1 ? "" : "s"} a day` : "every other day"}. ` : ""}Your last movement was ${lastMove ? fmtDay(localDay(lastMove.occurredAt, timeZone)) : "a while ago"}, and you confirmed nothing on ${noneDays.map((d) => fmtDay(d.day)).join(", ")}.`,
      entryIds: entries.filter((e) => noneDays.some((d) => d.entryIds.includes(e.id))).map((e) => e.id),
    });
  }

  const strained = recentMoves.filter((e) => e.symptoms?.includes("straining" as SymptomId));
  if (strained.length >= 2) {
    findings.push({
      kind: "straining",
      title: "Straining most times",
      detail: `You noted straining on ${strained.length} of your last ${recentMoves.length} trips${strained.some((e) => e.symptoms?.includes("bloating" as SymptomId) || e.symptoms?.includes("discomfort" as SymptomId)) ? ", along with discomfort or bloating" : ""}.`,
      entryIds: strained.map((e) => e.id),
    });
  }

  if (findings.length) {
    const windowStart = addDays(today, -13);
    const ctx = entries.filter((e) => localDay(e.occurredAt, timeZone) >= windowStart && (e.context ?? []).some((c) => c === "medication_change" || c === "low_fluids" || c === "diet_change"));
    if (ctx.length) {
      const words = ctx.map((e) => {
        const c = (e.context ?? []).filter((x) => x === "medication_change" || x === "low_fluids" || x === "diet_change");
        const what = c.map((x) => (x === "medication_change" ? "a medication change" : x === "low_fluids" ? "less water than usual" : "a diet change")).join(" and ");
        return `${what} on ${fmtDay(localDay(e.occurredAt, timeZone))}`;
      });
      findings.push({
        kind: "context",
        title: "Around the same time",
        detail: `You logged ${words.join(", and ")}. That's timing only, not proof of a cause, but it's worth mentioning.`,
        entryIds: ctx.map((e) => e.id),
      });
    }
  }

  return { asOf: asOf.toISOString(), days, usualType, usualPerDay, findings, hoursSinceLast };
}

/** Gentle self-care ideas for a constipation-type pattern. General guidance, not treatment. */
export const FIRMER_TIPS = [
  { icon: "water", text: "Sip water through the day, unless you've been told to limit fluids." },
  { icon: "activity", text: "A short, gentle walk can help get things moving." },
  { icon: "clock", text: "Try the toilet at the same time each day, often after breakfast, without rushing." },
  { icon: "leaf", text: "Fruit, vegetables, oats or prunes add fibre, if they're part of your usual diet." },
  { icon: "pill", text: "Don't stop or change a medicine on your own. Ask your nurse or pharmacist first." },
];

/** Gentle ideas for a looser pattern. General guidance, not treatment. */
export const LOOSER_TIPS = [
  { icon: "water", text: "Keep drinking small sips often so you don't get dehydrated." },
  { icon: "leaf", text: "Plain, easy foods can be gentler for a day or two." },
  { icon: "note", text: "Note anything new you ate, drank or took, so it's easy to tell your care team." },
  { icon: "pill", text: "Check with a pharmacist before taking anything to stop diarrhoea." },
];

/** "Priya" for most people, "Dr. Okafor" when the name carries a title. */
export function callName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return /^(dr|dr\.)$/i.test(parts[0]) ? `Dr. ${parts[parts.length - 1]}` : parts[0];
}
