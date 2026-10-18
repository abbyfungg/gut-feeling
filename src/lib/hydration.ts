import "server-only";
import { z } from "zod";
import type { User } from "./auth";
import { newId } from "./auth";
import { getConfig } from "./config";
import { getDb } from "./db";
import { fluidDays, type HydrationSource } from "./fluids";
import { AccessError, assertCanViewPatient } from "./records";
import type { FluidDay } from "./rules/types";
import { localDay } from "./time";

/** What the bottle sends: sips since its last successful send, and its ml estimate for them. */
export const bottleIngestSchema = z
  .object({
    sips: z.number().int().min(0).max(200),
    ml: z.number().int().min(0).max(10_000).optional(),
  })
  .strict();

export const hydrationInputSchema = z
  .object({
    source: z.enum(["manual", "simulated"]),
    ml: z.number().int().min(10).max(2000),
    sips: z.number().int().min(0).max(100).default(0),
  })
  .strict();

const DEFAULT_ML_PER_SIP = 30;

export function recordHydration(patientId: string, source: HydrationSource, sips: number, ml: number, now = new Date()) {
  if (ml <= 0 && sips <= 0) return;
  getDb()
    .prepare("INSERT INTO hydration_events (id, patient_id, source, occurred_at, sips, ml, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(newId("hy"), patientId, source, now.toISOString(), sips, ml, now.toISOString());
}

/** From the bottle. If it didn't send an ml estimate, use the default ml per sip. Caps silly values. */
export function recordBottleSips(patientId: string, input: z.infer<typeof bottleIngestSchema>, now = new Date()) {
  const ml = Math.min(input.ml ?? input.sips * DEFAULT_ML_PER_SIP, input.sips * 250);
  recordHydration(patientId, "bottle", input.sips, ml, now);
}

export function addHydration(viewer: User, input: z.infer<typeof hydrationInputSchema>, now = new Date()) {
  if (viewer.role !== "patient") throw new AccessError("Only patients can log water", 403);
  recordHydration(viewer.id, input.source, input.sips, input.ml, now);
}

export interface HydrationToday {
  ml: number;
  sips: number;
  lastAt: string | null;
  sources: HydrationSource[];
  week: FluidDay[];
}

export function hydrationSummary(viewer: User, patientId: string, now = new Date()): HydrationToday {
  assertCanViewPatient(viewer, patientId);
  const tz = getConfig().timezone;
  const today = localDay(now, tz);
  const rows = getDb()
    .prepare("SELECT occurred_at, ml, sips, source FROM hydration_events WHERE patient_id = ? AND occurred_at >= ? ORDER BY occurred_at")
    .all(patientId, new Date(now.getTime() - 2 * 86_400_000).toISOString()) as { occurred_at: string; ml: number; sips: number; source: HydrationSource }[];
  const todays = rows.filter((r) => localDay(r.occurred_at, tz) === today);
  return {
    ml: todays.reduce((a, r) => a + r.ml, 0),
    sips: todays.reduce((a, r) => a + r.sips, 0),
    lastAt: todays.length ? todays[todays.length - 1].occurred_at : null,
    sources: [...new Set(todays.map((r) => r.source))],
    week: fluidDays(patientId, tz, now, 7),
  };
}
