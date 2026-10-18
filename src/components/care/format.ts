import { bristolInfo, type Entry } from "@/lib/domain";
import { formatTime } from "@/lib/time";

/** "Oct 14" in the configured zone. */
export function shortDate(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone, month: "short", day: "numeric" });
}

/** "Oct 14, 9:24 a.m." */
export function shortDateTime(iso: string, timeZone: string): string {
  return `${shortDate(iso, timeZone)}, ${formatTime(iso, timeZone)}`;
}

/** "Oct 14" for a YYYY-MM-DD day key. */
export function dayShort(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** "Tue" for a YYYY-MM-DD day key. */
export function weekday(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-CA", { weekday: "short", timeZone: "UTC" });
}

/** A window like "Oct 12 – Oct 14" (or a single date). */
export function windowLabel(start: string, end: string, timeZone: string): string {
  const a = shortDate(start, timeZone);
  const b = shortDate(end, timeZone);
  return a === b ? a : `${a} – ${b}`;
}

export function groupOf(type: number | null | undefined): "hard" | "typical" | "loose" | "none" {
  return bristolInfo(type)?.group ?? "none";
}

/** Compact label for evidence chips: "Oct 14 9:24 a.m. · type 6". */
export function entryLabel(e: Entry, timeZone: string): string {
  const what = e.kind === "no_movement" ? "no movement" : e.bristolType != null ? `type ${e.bristolType}` : "untyped";
  return `${shortDate(e.occurredAt, timeZone)} ${formatTime(e.occurredAt, timeZone)} · ${what}`;
}

/** "Oct 14, 2026" */
export function longDate(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone, month: "short", day: "numeric", year: "numeric" });
}
