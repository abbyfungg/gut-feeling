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

/**
 * What the bottle sends. Preferred: its running totals since it powered on (boot id + total sips + total ml),
 * so a retried or replayed upload adds nothing. Older form: sips since its last send (+ an optional ml estimate).
 */
export const bottleIngestSchema = z
  .object({
    sips: z.number().int().min(0).max(200).optional(),
    ml: z.number().int().min(0).max(10_000).optional(),
    boot: z.string().regex(/^[A-Za-z0-9]{1,16}$/).optional(),
    total: z.number().int().min(0).max(5000).optional(),
    totalMl: z.number().int().min(0).max(300_000).optional(),
  })
  .strict()
  .refine((b) => (b.boot != null) === (b.total != null), { message: "boot and total go together" })
  .refine((b) => b.boot != null || b.sips != null, { message: "send sips, or boot and total" });

export const hydrationInputSchema = z
  .object({
    source: z.enum(["manual", "simulated"]),
    ml: z.number().int().min(10).max(2000),
    sips: z.number().int().min(0).max(100).default(0),
  })
  .strict();

const DEFAULT_ML_PER_SIP = 30;
/** Plausibility caps for bottle data: no sip is more than this, and one upload holds at most this many sips. */
export const MAX_ML_PER_SIP = 60;
export const MAX_SIPS_PER_UPLOAD = 60;

export function recordHydration(patientId: string, source: HydrationSource, sips: number, ml: number, now = new Date()): string | null {
  if (ml <= 0 && sips <= 0) return null;
  const id = newId("hy");
  getDb()
    .prepare("INSERT INTO hydration_events (id, patient_id, source, occurred_at, sips, ml, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, patientId, source, now.toISOString(), sips, ml, now.toISOString());
  return id;
}

/** Caps an upload to plausible values. */
export function plausibleBottle(sips: number, ml: number | undefined) {
  const s = Math.max(0, Math.min(sips, MAX_SIPS_PER_UPLOAD));
  const m = Math.max(0, Math.min(ml ?? s * DEFAULT_ML_PER_SIP, s * MAX_ML_PER_SIP));
  return { sips: s, ml: Math.round(m) };
}

/**
 * From the bottle. With running totals, only what's new since the last upload from the same power-on is
 * recorded, so retries and replays count once. A bare check-in (nothing new) records nothing. Returns what was recorded.
 */
export function recordBottleSips(patientId: string, input: z.infer<typeof bottleIngestSchema>, now = new Date(), tokenId?: string) {
  let sips = input.sips ?? 0;
  let ml = input.ml;
  if (input.boot != null && input.total != null && tokenId) {
    const db = getDb();
    const prev = db.prepare("SELECT boot, total_sips, total_ml FROM device_counters WHERE token_id = ?").get(tokenId) as
      | { boot: string; total_sips: number; total_ml: number }
      | undefined;
    const totalMl = input.totalMl ?? input.total * DEFAULT_ML_PER_SIP;
    const same = !!prev && prev.boot === input.boot;
    if (same && input.total <= prev.total_sips) return { sips: 0, ml: 0 }; // already counted
    sips = input.total - (same ? prev.total_sips : 0);
    ml = Math.max(0, totalMl - (same ? prev.total_ml : 0));
    db.prepare(
      "INSERT INTO device_counters (token_id, boot, total_sips, total_ml, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(token_id) DO UPDATE SET boot = excluded.boot, total_sips = excluded.total_sips, total_ml = excluded.total_ml, updated_at = excluded.updated_at",
    ).run(tokenId, input.boot, input.total, totalMl, now.toISOString());
  }
  const capped = plausibleBottle(sips, ml);
  recordHydration(patientId, "bottle", capped.sips, capped.ml, now);
  return capped;
}

export function addHydration(viewer: User, input: z.infer<typeof hydrationInputSchema>, now = new Date()): string | null {
  if (viewer.role !== "patient") throw new AccessError("Only patients can log water", 403);
  return recordHydration(viewer.id, input.source, input.sips, input.ml, now);
}

/** Undo a glass or simulated sip the person added from the app. Bottle data can't be removed this way. */
export function removeHydration(viewer: User, id: string): boolean {
  if (viewer.role !== "patient") throw new AccessError("Only patients can change water", 403);
  const r = getDb().prepare("DELETE FROM hydration_events WHERE id = ? AND patient_id = ? AND source IN ('manual','simulated')").run(id, viewer.id);
  return Number(r.changes) > 0;
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
