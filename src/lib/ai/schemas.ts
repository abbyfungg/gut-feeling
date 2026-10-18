import { z } from "zod";

export const COLOR_OBSERVATIONS = [
  "brown",
  "light_brown",
  "dark_brown",
  "yellow",
  "green",
  "pale_or_clay",
  "black_or_very_dark",
  "reddish",
  "unclear",
] as const;

/** JSON schema sent to Gemini for photo analysis. */
export const photoResponseJsonSchema = {
  type: "object",
  properties: {
    subject: { type: "string", enum: ["stool", "not_stool", "unclear"], description: "What the photo mainly shows." },
    image_usable: { type: "boolean", description: "False if too dark, blurry, cropped or not a stool photo." },
    unusable_reason: { type: "string", description: "Short reason when image_usable is false, else empty." },
    // Nullable via a type array: the form Gemini's structured-output docs specify (anyOf is not in its supported subset).
    estimated_bristol_type: {
      type: ["integer", "null"],
      minimum: 1,
      maximum: 7,
      description: "Closest Bristol Stool Form Scale type, or null if it cannot be estimated.",
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    color_observation: { type: "string", enum: [...COLOR_OBSERVATIONS] },
    observations: {
      type: "array",
      items: { type: "string" },
      maxItems: 4,
      description: "Up to 4 short, neutral visual observations about form and texture. No diagnoses.",
    },
    limitations: { type: "string", description: "One sentence on what limits this estimate (lighting, angle, water, etc.)." },
  },
  required: ["subject", "image_usable", "unusable_reason", "estimated_bristol_type", "confidence", "color_observation", "observations", "limitations"],
} as const;

export const photoResponseSchema = z.object({
  subject: z.enum(["stool", "not_stool", "unclear"]),
  image_usable: z.boolean(),
  unusable_reason: z.string().max(300).default(""),
  estimated_bristol_type: z.number().int().min(1).max(7).nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  color_observation: z.enum(COLOR_OBSERVATIONS),
  observations: z.array(z.string().max(200)).max(6).default([]),
  limitations: z.string().max(400).default(""),
});
export type PhotoResponse = z.infer<typeof photoResponseSchema>;

/** JSON schema for the care-team summary draft. */
export const summaryResponseJsonSchema = {
  type: "object",
  properties: {
    overview: { type: "string", description: "2-3 sentence neutral clinical summary for the care team. No diagnosis." },
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          flag_key: { type: "string" },
          explanation: { type: "string", description: "1-2 sentences citing what the entries show." },
          cited_entry_ids: { type: "array", items: { type: "string" } },
          suggested_follow_up: { type: "string", description: "Protocol-style next step for a clinician to consider. Not an order." },
        },
        required: ["flag_key", "explanation", "cited_entry_ids", "suggested_follow_up"],
      },
    },
    questions_to_ask: { type: "array", items: { type: "string" }, maxItems: 4 },
  },
  required: ["overview", "flags", "questions_to_ask"],
} as const;

export const summaryResponseSchema = z.object({
  overview: z.string().min(1).max(1200),
  flags: z
    .array(
      z.object({
        flag_key: z.string(),
        explanation: z.string().min(1).max(600),
        cited_entry_ids: z.array(z.string()).max(30),
        suggested_follow_up: z.string().max(400),
      }),
    )
    .max(20),
  questions_to_ask: z.array(z.string().max(200)).max(6).default([]),
});
export type SummaryResponse = z.infer<typeof summaryResponseSchema>;

/** JSON schema for the patient's own "why is it trending like this, and what can I try" read. */
export const insightResponseJsonSchema = {
  type: "object",
  properties: {
    headline: { type: "string", description: "One warm, plain-language sentence about the overall trend. No diagnosis." },
    why: {
      type: "array",
      maxItems: 3,
      items: {
        type: "string",
        description: "A possible reason for the trend, grounded in what the entries show (timing, context tags, symptoms, notes). Use tentative words like 'may' or 'around the same time'.",
      },
    },
    try_this: {
      type: "array",
      maxItems: 4,
      items: { type: "string", description: "One practical, everyday habit that supports regular, comfortable bowel movements (fibre, fluids, movement, routine, unhurried toilet time). General wellbeing, not treatment." },
    },
    talk_to_someone: { type: "string", description: "One sentence on when it would be sensible to check in with a healthcare provider, based on these entries. Calm, not alarming." },
  },
  required: ["headline", "why", "try_this", "talk_to_someone"],
} as const;

export const insightResponseSchema = z.object({
  headline: z.string().min(1).max(300),
  why: z.array(z.string().min(1).max(320)).max(4),
  try_this: z.array(z.string().min(1).max(260)).max(5),
  talk_to_someone: z.string().max(320).default(""),
});

/** JSON schema for Gemini explaining one rule-based flag to the care team. */
export const flagExplainJsonSchema = {
  type: "object",
  properties: {
    explanation: { type: "string", description: "2-3 plain sentences: why this rule fired for this patient, in terms of what changed versus their own usual. No diagnosis or cause." },
    signals: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          entry_id: { type: "string", description: "An entry id exactly as given." },
          why_it_matters: { type: "string", description: "One short clause on what this entry contributes to the flag." },
        },
        required: ["entry_id", "why_it_matters"],
      },
    },
    worth_checking: { type: "string", description: "One neutral thing the clinician may want to ask or check. Not an order." },
  },
  required: ["explanation", "signals", "worth_checking"],
} as const;

export const flagExplainSchema = z.object({
  explanation: z.string().min(1).max(900),
  signals: z.array(z.object({ entry_id: z.string(), why_it_matters: z.string().min(1).max(240) })).max(10),
  worth_checking: z.string().max(300).default(""),
});
