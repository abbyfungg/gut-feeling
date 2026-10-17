import { z } from "zod";
import { CONTEXT_IDS, REVIEW_DECISION_IDS, SYMPTOM_IDS } from "./domain";

const isoDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date")
  .transform((s) => new Date(s).toISOString());

const aiDraftSchema = z.object({
  analysisId: z.string().min(1).max(80),
});

/** Payload for creating a movement entry. Optional fields stay null when skipped. */
export const movementInputSchema = z
  .object({
    kind: z.literal("movement"),
    occurredAt: isoDate,
    bristolType: z.number().int().min(1).max(7).nullable(),
    bristolSource: z.enum(["user", "ai_accepted", "ai_corrected"]).nullable().default(null),
    symptoms: z.array(z.enum(SYMPTOM_IDS)).max(SYMPTOM_IDS.length).nullable().default(null),
    context: z.array(z.enum(CONTEXT_IDS)).max(CONTEXT_IDS.length).nullable().default(null),
    bloodReport: z.enum(["yes", "no", "unsure"]).nullable().default(null),
    notes: z.string().trim().max(1000).nullable().default(null),
    ai: aiDraftSchema.nullable().default(null),
  })
  .strict()
  .transform((v) => ({
    ...v,
    notes: v.notes && v.notes.length > 0 ? v.notes : null,
    symptoms: v.symptoms ? Array.from(new Set(v.symptoms)) : null,
    context: v.context ? Array.from(new Set(v.context)) : null,
    bristolSource: v.bristolType == null ? null : (v.bristolSource ?? "user"),
  }));

export const noMovementInputSchema = z
  .object({
    kind: z.literal("no_movement"),
    occurredAt: isoDate,
    notes: z.string().trim().max(1000).nullable().default(null),
  })
  .strict();

export const entryInputSchema = z.union([movementInputSchema, noMovementInputSchema]);
export type EntryInput = z.infer<typeof entryInputSchema>;

/** Entries cannot be in the future (5 minute tolerance for clock skew) or more than a year old. */
export function checkEntryTime(iso: string, now = new Date()): string | null {
  const t = new Date(iso).getTime();
  if (t > now.getTime() + 5 * 60_000) return "That time is in the future.";
  if (t < now.getTime() - 366 * 24 * 3_600_000) return "That's more than a year ago.";
  return null;
}

export const reviewInputSchema = z
  .object({
    flagKey: z.string().min(3).max(200),
    decision: z.enum(REVIEW_DECISION_IDS),
    note: z.string().trim().max(2000).default(""),
    followUp: z.string().trim().max(500).default(""),
    suggestionSource: z.enum(["rule_template", "gemini_draft", "none"]).default("none"),
  })
  .strict();
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Tell us what to call you").max(60),
  email: z.string().trim().toLowerCase().email("That email doesn't look right").max(200),
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export const shareInputSchema = z.object({
  practitionerId: z.string().min(1).max(80),
  active: z.boolean(),
});
