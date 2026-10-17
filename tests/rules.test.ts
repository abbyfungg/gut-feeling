import { describe, expect, it } from "vitest";
import { evaluateRules, windowClusters } from "@/lib/rules/engine";
import { DEFAULT_RULE_CONFIG } from "@/lib/rules/config";
import { ago, entry } from "./helpers";

const TZ = "America/Toronto";
const now = new Date("2026-10-17T16:00:00Z"); // noon in Toronto

describe("loose stools rule", () => {
  it("flags 3 loose stools within 24h and cites exactly those entries", () => {
    const es = [entry({ id: "a", occurredAt: ago(now, 20), bristolType: 6 }), entry({ id: "b", occurredAt: ago(now, 10), bristolType: 7 }), entry({ id: "c", occurredAt: ago(now, 2), bristolType: 7 }), entry({ id: "d", occurredAt: ago(now, 1), bristolType: 4 })];
    const { flags } = evaluateRules(es, now, TZ);
    const f = flags.find((x) => x.rule === "loose_stools")!;
    expect(f).toBeDefined();
    expect(f.evidenceIds).toEqual(["a", "b", "c"]);
    expect(f.severity).toBe("high");
    expect(f.key).toBe("loose_stools:a");
    expect(f.whatChanged).toMatch(/3 entries/);
  });

  it("does not flag 3 loose stools spread over more than 24h", () => {
    const es = [entry({ occurredAt: ago(now, 60), bristolType: 6 }), entry({ occurredAt: ago(now, 30), bristolType: 7 }), entry({ occurredAt: ago(now, 2), bristolType: 7 })];
    expect(evaluateRules(es, now, TZ).flags.filter((f) => f.rule === "loose_stools")).toHaveLength(0);
  });

  it("ignores entries with no type recorded", () => {
    const es = [0, 1, 2].map((h) => entry({ occurredAt: ago(now, h + 1), bristolType: null }));
    expect(evaluateRules(es, now, TZ).flags).toHaveLength(0);
  });
});

describe("no-movement rule and missing data", () => {
  const day = (daysAgo: number, hour = 20) => new Date(Date.UTC(2026, 9, 17 - daysAgo, hour + 4)).toISOString();

  it("flags 3 consecutive days explicitly confirmed with no movement", () => {
    const es = [entry({ occurredAt: day(5, 9), bristolType: 4 }), entry({ id: "n1", kind: "no_movement", bristolType: null, occurredAt: day(3) }), entry({ id: "n2", kind: "no_movement", bristolType: null, occurredAt: day(2) }), entry({ id: "n3", kind: "no_movement", bristolType: null, occurredAt: day(1) })];
    const f = evaluateRules(es, now, TZ).flags.find((x) => x.rule === "no_movement")!;
    expect(f.evidenceIds).toEqual(["n1", "n2", "n3"]);
    expect(f.whatChanged).toMatch(/Last logged movement/);
  });

  it("does NOT treat days without any log as no movement", () => {
    const es = [entry({ occurredAt: day(8, 9) }), entry({ occurredAt: day(7, 9) }), entry({ occurredAt: day(6, 9) })];
    const { flags, notices } = evaluateRules(es, now, TZ);
    expect(flags.find((f) => f.rule === "no_movement")).toBeUndefined();
    const gap = notices.find((n) => n.kind === "logging_gap")!;
    expect(gap).toBeDefined();
    expect(gap.message).toMatch(/missing data/);
  });

  it("breaks the streak when a day is missing between check-ins", () => {
    const es = [entry({ kind: "no_movement", bristolType: null, occurredAt: day(4) }), entry({ kind: "no_movement", bristolType: null, occurredAt: day(3) }), entry({ kind: "no_movement", bristolType: null, occurredAt: day(1) })];
    expect(evaluateRules(es, now, TZ).flags.find((f) => f.rule === "no_movement")).toBeUndefined();
  });

  it("a day with a movement and a check-in does not count toward the streak", () => {
    const es = [entry({ kind: "no_movement", bristolType: null, occurredAt: day(3) }), entry({ kind: "no_movement", bristolType: null, occurredAt: day(2) }), entry({ occurredAt: day(2, 9) }), entry({ kind: "no_movement", bristolType: null, occurredAt: day(1) })];
    expect(evaluateRules(es, now, TZ).flags.find((f) => f.rule === "no_movement")).toBeUndefined();
  });
});

describe("reported blood and symptoms", () => {
  it("flags only user-reported answers, high for yes and medium for unsure", () => {
    const es = [entry({ id: "y", occurredAt: ago(now, 5), bloodReport: "yes" }), entry({ id: "u", occurredAt: ago(now, 4), bloodReport: "unsure" }), entry({ id: "no", occurredAt: ago(now, 3), bloodReport: "no" }), entry({ id: "skip", occurredAt: ago(now, 2), bloodReport: null })];
    const flags = evaluateRules(es, now, TZ).flags.filter((f) => f.rule === "reported_blood");
    expect(flags.map((f) => [f.evidenceIds[0], f.severity])).toEqual([
      ["y", "high"],
      ["u", "medium"],
    ]);
  });

  it("never flags blood from an AI colour observation alone", () => {
    const es = [
      entry({
        occurredAt: ago(now, 2),
        ai: { simulated: false, model: "m", analyzedAt: ago(now, 2), usable: true, estimatedType: 4, confidence: "high", colorObservation: "reddish", observations: [], limitations: "" },
      }),
    ];
    expect(evaluateRules(es, now, TZ).flags).toHaveLength(0);
  });

  it("flags severe pain or fever", () => {
    const es = [entry({ id: "s", occurredAt: ago(now, 2), symptoms: ["fever", "bloating"] })];
    const f = evaluateRules(es, now, TZ).flags[0];
    expect(f.rule).toBe("severe_symptoms");
    expect(f.title).toMatch(/fever/);
  });

  it("skipped symptoms (null) are not the same as no symptoms ([])", () => {
    const es = [entry({ occurredAt: ago(now, 2), symptoms: null }), entry({ occurredAt: ago(now, 3), symptoms: [] })];
    expect(evaluateRules(es, now, TZ).flags).toHaveLength(0);
  });
});

describe("hard stools and baseline shift", () => {
  it("flags 3 hard stools within 7 days and mentions straining", () => {
    const es = [1, 3, 5].map((d) => entry({ occurredAt: ago(now, d * 24), bristolType: 2, symptoms: ["straining"] }));
    const f = evaluateRules(es, now, TZ).flags.find((x) => x.rule === "hard_stools")!;
    expect(f.whatChanged).toMatch(/straining reported in 3/);
  });

  it("flags a sustained shift from personal baseline when enough data exists", () => {
    const baseline = Array.from({ length: 10 }, (_, i) => entry({ occurredAt: ago(now, (6 + i) * 24), bristolType: 4 }));
    const recent = [0.5, 1, 2, 3].map((d, i) => entry({ id: `r${i}`, occurredAt: ago(now, d * 24), bristolType: 6 }));
    const f = evaluateRules([...baseline, ...recent], now, TZ).flags.find((x) => x.rule === "baseline_shift")!;
    expect(f.title).toMatch(/looser/);
    expect(f.evidenceIds.sort()).toEqual(["r0", "r1", "r2", "r3"].sort());
  });

  it("does not compare with baseline when there is too little history", () => {
    const es = [entry({ occurredAt: ago(now, 8 * 24), bristolType: 4 }), ...[1, 2, 3].map((d) => entry({ occurredAt: ago(now, d * 24), bristolType: 7 }))];
    const r = evaluateRules(es, now, TZ);
    expect(r.flags.find((x) => x.rule === "baseline_shift")).toBeUndefined();
    expect(r.notices.find((n) => n.kind === "not_enough_data")).toBeDefined();
  });

  it("respects disabled rules in config", () => {
    const es = [entry({ occurredAt: ago(now, 2), bloodReport: "yes" })];
    const cfg = { ...DEFAULT_RULE_CONFIG, reportedBlood: { enabled: false } };
    expect(evaluateRules(es, now, TZ, cfg).flags).toHaveLength(0);
  });
});

describe("evidence integrity", () => {
  it("every flag cites only real entries and includes timing-only context wording", () => {
    const es = [
      entry({ id: "m", occurredAt: ago(now, 48), context: ["medication_change"] }),
      entry({ id: "a", occurredAt: ago(now, 6), bristolType: 7 }),
      entry({ id: "b", occurredAt: ago(now, 4), bristolType: 7 }),
      entry({ id: "c", occurredAt: ago(now, 2), bristolType: 7 }),
    ];
    const { flags } = evaluateRules(es, now, TZ);
    const ids = new Set(es.map((e) => e.id));
    for (const f of flags) {
      expect(f.evidenceIds.length).toBeGreaterThan(0);
      for (const id of f.evidenceIds) expect(ids.has(id)).toBe(true);
    }
    const loose = flags.find((f) => f.rule === "loose_stools")!;
    expect(loose.context.map((c) => c.tag)).toContain("medication_change");
  });

  it("windowClusters merges overlapping windows into one cluster", () => {
    const es = [0, 5, 10, 15, 20].map((h) => entry({ occurredAt: ago(now, 40 - h) }));
    expect(windowClusters(es, 12 * 3_600_000, 3)).toHaveLength(1);
  });

  it("ignores future and very old entries", () => {
    const es = [entry({ occurredAt: ago(now, -48), bloodReport: "yes" }), entry({ occurredAt: ago(now, 24 * 40), bloodReport: "yes" })];
    expect(evaluateRules(es, now, TZ).flags).toHaveLength(0);
  });
});
