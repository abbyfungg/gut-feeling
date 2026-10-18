import "server-only";
import type { User } from "./auth";
import { getUserById } from "./auth";
import { getConfig } from "./config";
import { getDb } from "./db";
import type { Entry } from "./domain";
import { describePattern, type PatternSummary } from "./pattern";
import { listEntries, listSharing } from "./records";
import { evaluateRules } from "./rules/engine";
import type { Flag } from "./rules/types";
import { DEMO_ACCOUNTS } from "./seed";

export interface StoryMoment {
  patient: User;
  /** The moment shown: now, while his flags wait unreviewed (or, if a review exists, the evening before it). */
  asOf: Date;
  /** True when nobody has reviewed Walter yet, so this is what both sides see right now. */
  live: boolean;
  entries: Entry[];
  pattern: PatternSummary;
  /** Rule flags as they stood at that moment (the ones the care team saw the next morning). */
  flags: Flag[];
  careTeam: string[];
  review: { practitionerName: string; createdAt: string; note: string; followUp: string } | null;
}

/**
 * The "before the call" moment of the caught-early demo, built from the synthetic data itself. While nobody has
 * reviewed Walter it is simply now. If a review exists, it is 12 h 40 min before it (8:30 p.m. the night before).
 * Entries logged after that moment are left out, so nothing is shown that Walter couldn't have seen then.
 */
export function getStoryMoment(viewer?: User): StoryMoment | null {
  const db = getDb();
  let patient = viewer ?? null;
  if (!patient) {
    const row = db.prepare("SELECT id FROM users WHERE email = ?").get(DEMO_ACCOUNTS.story) as { id: string } | undefined;
    patient = row ? getUserById(row.id) : null;
  }
  if (!patient || patient.email !== DEMO_ACCOUNTS.story) return null;

  const rv = db
    .prepare(
      `SELECT r.created_at, r.note, r.follow_up, u.name AS practitioner FROM reviews r JOIN users u ON u.id = r.practitioner_id
       WHERE r.patient_id = ? AND r.flag_rule = 'no_movement' ORDER BY r.created_at ASC LIMIT 1`,
    )
    .get(patient.id) as { created_at: string; note: string; follow_up: string; practitioner: string } | undefined;
  const tz = getConfig().timezone;
  const asOf = rv ? new Date(new Date(rv.created_at).getTime() - (12 * 60 + 40) * 60_000) : new Date();
  const all = listEntries(patient, patient.id);
  const entries = all.filter((e) => new Date(e.occurredAt).getTime() <= asOf.getTime());
  return {
    patient,
    asOf,
    live: !rv,
    entries,
    pattern: describePattern(entries, asOf, tz),
    flags: evaluateRules(entries, asOf, tz).flags,
    careTeam: listSharing(patient)
      .filter((s) => s.status === "active")
      .map((s) => s.practitioner.name),
    review: rv ? { practitionerName: rv.practitioner, createdAt: rv.created_at, note: rv.note.replace(/\s*\(Synthetic demo record\.\)/, ""), followUp: rv.follow_up } : null,
  };
}
