export type FlagRule =
  | "reported_blood"
  | "loose_stools"
  | "no_movement"
  | "hard_stools"
  | "severe_symptoms"
  | "baseline_shift";

export type FlagSeverity = "high" | "medium";

export interface ContextNote {
  entryId: string;
  occurredAt: string;
  tag: string;
}

export interface Flag {
  /** Stable id: rule + anchoring entry id. Reviews attach to this key. */
  key: string;
  rule: FlagRule;
  severity: FlagSeverity;
  /** Clinical title for the care team */
  title: string;
  /** Short, plain title shown to the person themselves */
  patientTitle: string;
  /** What changed, in one sentence, generated from the data */
  whatChanged: string;
  /** Window the supporting observations cover */
  windowStart: string;
  windowEnd: string;
  /** Entry ids that support the flag (always non-empty, always real entries) */
  evidenceIds: string[];
  /** Context tags noted shortly before or during the window. Timing only, never causal. */
  context: ContextNote[];
  /** Plain-language message for the person themselves */
  patientMessage: string;
  /** Protocol-style suggested follow-up for a practitioner to accept or edit. Not an order. */
  suggestedFollowUp: string;
  /** Short note about what this does not mean */
  caveat: string;
  /** The deterministic rule, in words, so nobody needs to trust a score */
  ruleDescription: string;
}

export interface DataNotice {
  kind: "logging_gap" | "not_enough_data";
  message: string;
  start?: string;
  end?: string;
}

export interface RuleResult {
  flags: Flag[];
  notices: DataNotice[];
}
