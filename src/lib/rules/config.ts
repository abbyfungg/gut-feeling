/**
 * Review-rule thresholds.
 *
 * These are PROTOTYPE DEFAULTS chosen to make patterns visible in a demo. They have not been
 * validated against clinical guidance and must be reviewed by a clinician before any real use.
 * Every rule produces a "worth a look" signal for a person, never a diagnosis.
 */
export interface RuleConfig {
  lookbackDays: number;
  looseStools: { enabled: boolean; minCount: number; windowHours: number; minType: number };
  hardStools: { enabled: boolean; minCount: number; windowDays: number; maxType: number };
  /** A run escalates to high when any of `escalateSymptoms` was reported during it or in the `escalateLeadDays` before it. */
  noMovement: { enabled: boolean; minConsecutiveDays: number; escalateSymptoms: string[]; escalateLeadDays: number };
  reportedBlood: { enabled: boolean };
  severeSymptoms: { enabled: boolean; symptoms: string[] };
  baselineShift: {
    enabled: boolean;
    recentDays: number;
    baselineDays: number;
    minBaselineEntries: number;
    minRecentEntries: number;
    minMeanDifference: number;
  };
  /** Hard stools on several days even though logged fluids looked adequate. */
  hardDespiteFluids: { enabled: boolean; windowDays: number; minHardDays: number; maxType: number; minMlPerDay: number };
  loggingGap: { minDays: number };
  /** Days before a flag in which context tags (e.g. medication change) are mentioned as timing context. */
  contextLookbackDays: number;
}

export const DEFAULT_RULE_CONFIG: RuleConfig = {
  lookbackDays: 30,
  looseStools: { enabled: true, minCount: 3, windowHours: 24, minType: 6 },
  hardStools: { enabled: true, minCount: 3, windowDays: 7, maxType: 2 },
  noMovement: { enabled: true, minConsecutiveDays: 3, escalateSymptoms: ["nausea", "severe_pain"], escalateLeadDays: 4 },
  reportedBlood: { enabled: true },
  severeSymptoms: { enabled: true, symptoms: ["severe_pain", "fever"] },
  baselineShift: {
    enabled: true,
    recentDays: 4,
    baselineDays: 14,
    minBaselineEntries: 6,
    minRecentEntries: 3,
    minMeanDifference: 2,
  },
  hardDespiteFluids: { enabled: true, windowDays: 7, minHardDays: 3, maxType: 2, minMlPerDay: 1500 },
  loggingGap: { minDays: 3 },
  contextLookbackDays: 7,
};
