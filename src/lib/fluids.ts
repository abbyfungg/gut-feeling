import "server-only";
import { getDb } from "./db";
import type { FluidDay } from "./rules/types";
import { addDays, localDay } from "./time";

export type HydrationSource = "bottle" | "manual" | "simulated";

/** Daily fluid totals for the last `days` local days, oldest first. No access check: callers check first. */
export function fluidDays(patientId: string, timeZone: string, now = new Date(), days = 30): FluidDay[] {
  const today = localDay(now, timeZone);
  const start = addDays(today, -(days - 1));
  const rows = getDb()
    .prepare("SELECT occurred_at, ml, source FROM hydration_events WHERE patient_id = ? AND occurred_at >= ? AND occurred_at <= ? ORDER BY occurred_at")
    .all(patientId, new Date(now.getTime() - (days + 1) * 86_400_000).toISOString(), now.toISOString()) as { occurred_at: string; ml: number; source: HydrationSource }[];
  const map = new Map<string, FluidDay>();
  for (const r of rows) {
    const day = localDay(r.occurred_at, timeZone);
    if (day < start) continue;
    const d = map.get(day) ?? { day, ml: 0, estimated: false, simulated: false };
    d.ml += r.ml;
    if (r.source !== "manual") d.estimated = true;
    if (r.source === "simulated") d.simulated = true;
    map.set(day, d);
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}
