import type { Entry } from "@/lib/domain";

let n = 0;
export function entry(over: Partial<Entry> & { occurredAt: string }): Entry {
  n++;
  return {
    id: over.id ?? `e${n}`,
    patientId: "p1",
    kind: "movement",
    bristolType: 4,
    bristolSource: "user",
    symptoms: null,
    context: null,
    bloodReport: null,
    notes: null,
    ai: null,
    isSynthetic: false,
    createdAt: over.createdAt ?? over.occurredAt,
    ...over,
  };
}

/** ISO time `hoursAgo` before `now`. */
export function ago(now: Date, hoursAgo: number): string {
  return new Date(now.getTime() - hoursAgo * 3_600_000).toISOString();
}

export function freshDb() {
  process.env.GUT_DB_FILE = ":memory:";
  process.env.SEED_DEMO_DATA = "false";
}
