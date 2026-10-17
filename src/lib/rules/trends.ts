import type { Entry } from "../domain";
import { addDays, dayRange, localDay } from "../time";

export interface DayPoint {
  day: string;
  /** null = nothing logged that day (unknown), 0 = confirmed no movement */
  movements: number | null;
  types: number[];
  confirmedNone: boolean;
}

export interface TrendSummary {
  days: DayPoint[];
  windowDays: number;
  recent: { movements: number; loggedDays: number; avgType: number | null; mostCommonType: number | null; typicalShare: number | null };
  previous: { movements: number; loggedDays: number; avgType: number | null };
  /** Enough data to compare with the person's own history */
  comparable: boolean;
  /** Plain-language headline for the person */
  headline: string;
  /** Entry ids used for the recent window, so the UI can show what supports the summary */
  recentEntryIds: string[];
}

/** Deterministic trend calculations over the person's own entries. */
export function computeTrends(entries: Entry[], now: Date, timeZone: string, windowDays = 7): TrendSummary {
  const today = localDay(now, timeZone);
  const start = addDays(today, -(windowDays * 3 - 1));
  const recentStart = addDays(today, -(windowDays - 1));
  const prevStart = addDays(recentStart, -windowDays);

  const byDay = new Map<string, DayPoint>();
  for (const d of dayRange(start, today)) byDay.set(d, { day: d, movements: null, types: [], confirmedNone: false });
  for (const e of entries) {
    const d = localDay(e.occurredAt, timeZone);
    const p = byDay.get(d);
    if (!p) continue;
    if (e.kind === "movement") {
      p.movements = (p.movements ?? 0) + 1;
      if (e.bristolType != null) p.types.push(e.bristolType);
    } else {
      p.confirmedNone = true;
      if (p.movements == null) p.movements = 0;
    }
  }
  const days = [...byDay.values()];

  const inRange = (from: string, to: string) =>
    entries.filter((e) => {
      const d = localDay(e.occurredAt, timeZone);
      return d >= from && d <= to;
    });
  const recentEntries = inRange(recentStart, today);
  const prevEntries = inRange(prevStart, addDays(recentStart, -1));

  const stats = (list: Entry[]) => {
    const mv = list.filter((e) => e.kind === "movement");
    const types = mv.map((e) => e.bristolType).filter((t): t is number => t != null);
    return {
      movements: mv.length,
      loggedDays: new Set(list.map((e) => localDay(e.occurredAt, timeZone))).size,
      avgType: types.length ? round1(types.reduce((a, b) => a + b, 0) / types.length) : null,
      types,
    };
  };
  const r = stats(recentEntries);
  const p = stats(prevEntries);
  const counts = new Map<number, number>();
  for (const t of r.types) counts.set(t, (counts.get(t) ?? 0) + 1);
  const mostCommonType = r.types.length ? [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0] : null;
  const typicalShare = r.types.length ? r.types.filter((t) => t >= 3 && t <= 5).length / r.types.length : null;

  const comparable = r.types.length >= 3 && p.types.length >= 3;
  let headline: string;
  if (r.movements === 0 && r.loggedDays === 0) headline = "Nothing logged this week yet. No pressure; log whenever it suits you.";
  else if (r.types.length < 3) headline = "A few more logs and we can start spotting your patterns.";
  else if (!comparable) headline = `Mostly type ${mostCommonType} this week. We'll compare with your usual once there's a bit more history.`;
  else {
    const diff = (r.avgType ?? 0) - (p.avgType ?? 0);
    if (Math.abs(diff) < 1) headline = "Pretty steady compared with your usual. Nice and consistent.";
    else if (diff > 0) headline = "A bit looser than your usual this week.";
    else headline = "A bit firmer than your usual this week.";
  }

  return {
    days,
    windowDays,
    recent: { movements: r.movements, loggedDays: r.loggedDays, avgType: r.avgType, mostCommonType, typicalShare },
    previous: { movements: p.movements, loggedDays: p.loggedDays, avgType: p.avgType },
    comparable,
    headline,
    recentEntryIds: recentEntries.map((e) => e.id),
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
