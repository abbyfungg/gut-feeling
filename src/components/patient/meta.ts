import type { ContextId, SymptomId } from "@/lib/domain";

export const SYMPTOM_ICON: Record<SymptomId, string> = {
  discomfort: "frown",
  bloating: "wind",
  cramping: "zap",
  urgency: "timer",
  straining: "activity",
  incomplete: "minusCircle",
  nausea: "circleDot",
  fever: "thermometer",
  severe_pain: "alert",
};

export const CONTEXT_ICON: Record<ContextId, string> = {
  diet_change: "leaf",
  low_fluids: "water",
  medication_change: "pill",
  recent_illness: "thermometer",
  travel: "plane",
  stress: "brain",
  alcohol: "glass",
  new_food: "sparkle",
};

export function groupOf(t: number | null | undefined): "hard" | "typical" | "loose" | "" {
  if (t == null) return "";
  return t <= 2 ? "hard" : t >= 6 ? "loose" : "typical";
}

export const GROUP_LABEL = { hard: "Hard", typical: "Typical", loose: "Loose" } as const;
