/**
 * Shared domain vocabulary. Safe to import from client and server code.
 * Keep labels plain and kind; clinical wording lives in the care-team view.
 */

export type Role = "patient" | "practitioner";

export const SYMPTOMS = [
  { id: "discomfort", label: "Discomfort" },
  { id: "bloating", label: "Bloating" },
  { id: "cramping", label: "Cramping" },
  { id: "urgency", label: "Urgency" },
  { id: "straining", label: "Straining" },
  { id: "incomplete", label: "Felt unfinished" },
  { id: "nausea", label: "Nausea" },
  { id: "fever", label: "Fever" },
  { id: "severe_pain", label: "Severe pain" },
] as const;
export type SymptomId = (typeof SYMPTOMS)[number]["id"];
export const SYMPTOM_IDS = SYMPTOMS.map((s) => s.id) as [SymptomId, ...SymptomId[]];

export const CONTEXT_TAGS = [
  { id: "diet_change", label: "Diet change" },
  { id: "low_fluids", label: "Less water than usual" },
  { id: "medication_change", label: "Medication change" },
  { id: "recent_illness", label: "Recently unwell" },
  { id: "travel", label: "Travel" },
  { id: "stress", label: "Stress" },
  { id: "alcohol", label: "Alcohol" },
  { id: "new_food", label: "Tried new food" },
] as const;
export type ContextId = (typeof CONTEXT_TAGS)[number]["id"];
export const CONTEXT_IDS = CONTEXT_TAGS.map((s) => s.id) as [ContextId, ...ContextId[]];

/** Answer to "Did you notice any red or black colour?" null = not answered. */
export type BloodReport = "yes" | "no" | "unsure";

export type BristolSource = "user" | "ai_accepted" | "ai_corrected";

export interface BristolInfo {
  type: number;
  nickname: string;
  description: string;
  clinical: string;
  group: "hard" | "typical" | "loose";
}

export const BRISTOL: BristolInfo[] = [
  { type: 1, nickname: "Little pebbles", description: "Separate hard lumps, hard to pass", clinical: "Type 1: separate hard lumps", group: "hard" },
  { type: 2, nickname: "Lumpy log", description: "Sausage-shaped but lumpy", clinical: "Type 2: lumpy, sausage-shaped", group: "hard" },
  { type: 3, nickname: "Cracked log", description: "Sausage-shaped with cracks on the surface", clinical: "Type 3: sausage with surface cracks", group: "typical" },
  { type: 4, nickname: "Smooth snake", description: "Smooth and soft, like a sausage or snake", clinical: "Type 4: smooth, soft sausage", group: "typical" },
  { type: 5, nickname: "Soft blobs", description: "Soft blobs with clear-cut edges, easy to pass", clinical: "Type 5: soft blobs, clear edges", group: "typical" },
  { type: 6, nickname: "Mushy", description: "Fluffy pieces with ragged edges, mushy", clinical: "Type 6: mushy, ragged edges", group: "loose" },
  { type: 7, nickname: "All liquid", description: "Watery, no solid pieces", clinical: "Type 7: watery, no solid pieces", group: "loose" },
];

export function bristolInfo(type: number | null | undefined): BristolInfo | undefined {
  return BRISTOL.find((b) => b.type === type);
}

export function symptomLabel(id: string): string {
  return SYMPTOMS.find((s) => s.id === id)?.label ?? id;
}
export function contextLabel(id: string): string {
  return CONTEXT_TAGS.find((s) => s.id === id)?.label ?? id;
}

/** Stored AI analysis attached to an entry (validated server-side before saving). */
export interface StoredAiAnalysis {
  /** true when the record is seeded demo output rather than a live model call */
  simulated: boolean;
  model: string;
  analyzedAt: string;
  usable: boolean;
  estimatedType: number | null;
  confidence: "low" | "medium" | "high";
  colorObservation: string;
  observations: string[];
  limitations: string;
}

export interface Entry {
  id: string;
  patientId: string;
  kind: "movement" | "no_movement";
  occurredAt: string;
  bristolType: number | null;
  bristolSource: BristolSource | null;
  /** null = the question was skipped. [] = the person said "none of these". */
  symptoms: SymptomId[] | null;
  context: ContextId[] | null;
  bloodReport: BloodReport | null;
  notes: string | null;
  ai: StoredAiAnalysis | null;
  /** Squeeze-ball session attached by the patient (0-100 squeeze effort, not a clinical measure). */
  effort?: EntryEffort | null;
  isSynthetic: boolean;
  createdAt: string;
}

export interface EntryEffort {
  source: "device" | "simulated";
  peakEffort: number;
  avgEffort: number;
  durationMs: number;
  squeezes: number;
  samples: number[];
}

export const REVIEW_DECISIONS = [
  { id: "no_action", label: "Reviewed, no action needed", followUp: false },
  { id: "keep_monitoring", label: "Keep monitoring", followUp: false },
  { id: "contact_patient", label: "Contact patient", followUp: true },
  { id: "book_appointment", label: "Book an appointment", followUp: true },
  { id: "escalate", label: "Escalate to physician", followUp: true },
] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number]["id"];
export const REVIEW_DECISION_IDS = REVIEW_DECISIONS.map((d) => d.id) as [ReviewDecision, ...ReviewDecision[]];
export function decisionLabel(id: string): string {
  return REVIEW_DECISIONS.find((d) => d.id === id)?.label ?? id;
}
