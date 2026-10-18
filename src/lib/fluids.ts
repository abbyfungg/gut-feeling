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

export interface FluidBlockDay {
  day: string;
  /** ml by part of the day (local time): before noon, noon to 5 pm, after 5 pm */
  morning: number;
  afternoon: number;
  evening: number;
  sips: number;
  simulated: boolean;
  estimated: boolean;
}

/** Fluids per day split into morning / afternoon / evening, oldest first. No access check: callers check first. */
export function fluidBlocks(patientId: string, timeZone: string, now = new Date(), days = 7): FluidBlockDay[] {
  const today = localDay(now, timeZone);
  const start = addDays(today, -(days - 1));
  const hourOf = new Intl.DateTimeFormat("en-CA", { timeZone, hour: "numeric", hourCycle: "h23" });
  const rows = getDb()
    .prepare("SELECT occurred_at, ml, sips, source FROM hydration_events WHERE patient_id = ? AND occurred_at >= ? AND occurred_at <= ? ORDER BY occurred_at")
    .all(patientId, new Date(now.getTime() - (days + 1) * 86_400_000).toISOString(), now.toISOString()) as { occurred_at: string; ml: number; sips: number; source: HydrationSource }[];
  const map = new Map<string, FluidBlockDay>();
  for (const r of rows) {
    const day = localDay(r.occurred_at, timeZone);
    if (day < start) continue;
    const d = map.get(day) ?? { day, morning: 0, afternoon: 0, evening: 0, sips: 0, simulated: false, estimated: false };
    const h = Number(hourOf.format(new Date(r.occurred_at)));
    if (h < 12) d.morning += r.ml;
    else if (h < 17) d.afternoon += r.ml;
    else d.evening += r.ml;
    d.sips += r.sips;
    if (r.source !== "manual") d.estimated = true;
    if (r.source === "simulated") d.simulated = true;
    map.set(day, d);
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}
