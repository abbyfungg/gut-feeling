import { describe, expect, it } from "vitest";
import { freshDb } from "./helpers";
freshDb();
import { authenticate, createUser } from "@/lib/auth";
import { resetDbForTests } from "@/lib/db";
import { createDeviceToken, patientForDeviceToken } from "@/lib/device";
import type { Entry } from "@/lib/domain";
import { fluidDays } from "@/lib/fluids";
import { addHydration, bottleIngestSchema, hydrationSummary, recordBottleSips } from "@/lib/hydration";
import { describePattern } from "@/lib/pattern";
import { createReview, getCaseload, getPatientOverview } from "@/lib/records";
import { evaluateRules } from "@/lib/rules/engine";
import type { FluidDay } from "@/lib/rules/types";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, seedDemoData } from "@/lib/seed";
import { addDays, localDay } from "@/lib/time";

const TZ = "America/Toronto";
const now = new Date("2026-10-18T16:00:00Z");
const today = localDay(now, TZ);
let n = 0;
const entry = (daysAgo: number, type: number): Entry => ({
  id: `e${n++}`, patientId: "p", kind: "movement", occurredAt: new Date(now.getTime() - daysAgo * 86_400_000 - 3_600_000).toISOString(),
  bristolType: type, bristolSource: "user", symptoms: [], context: null, bloodReport: null, notes: null, ai: null, isSynthetic: true, createdAt: now.toISOString(),
});
const fluids = (ml: number, days = 8, extra: Partial<FluidDay> = {}): FluidDay[] =>
  Array.from({ length: days }, (_, i) => ({ day: addDays(today, -i), ml, estimated: true, simulated: false, ...extra }));
const rule = (entries: Entry[], f: FluidDay[]) => evaluateRules(entries, now, TZ, undefined, f).flags.find((x) => x.rule === "hard_despite_fluids");

describe("hard stools despite good fluids rule", () => {
  const hardWeek = [entry(6, 2), entry(4, 1), entry(3, 2), entry(1, 2)];

  it("fires when hard stools happen on 3+ days while drinking 1.5 L+", () => {
    const f = rule(hardWeek, fluids(2000));
    expect(f).toBeDefined();
    expect(f!.evidenceIds).toHaveLength(4);
    expect(f!.whatChanged).toMatch(/4 days .* 2\.0 L\/day .*water-bottle estimate/);
    expect(f!.caveat).toMatch(/estimated from sip counts/);
  });

  it("doesn't fire when fluids are low (that's the ordinary hard-stools rule's job)", () => {
    expect(rule(hardWeek, fluids(900))).toBeUndefined();
  });

  it("doesn't fire without any fluid data", () => {
    expect(rule(hardWeek, [])).toBeUndefined();
  });

  it("doesn't fire for only two hard days", () => {
    expect(rule([entry(4, 1), entry(1, 2), entry(2, 4)], fluids(2200))).toBeUndefined();
  });

  it("labels simulated fluids as simulated", () => {
    const f = rule(hardWeek, fluids(2000, 8, { simulated: true }));
    expect(f!.whatChanged).toMatch(/simulated bottle data/);
    expect(f!.caveat).toMatch(/simulated/);
  });

  it("the patient's own summary says water may not be the reason", () => {
    const p = describePattern(hardWeek, now, TZ, 14, fluids(2000, 20));
    const fl = p.findings.find((x) => x.kind === "fluids");
    expect(fl?.title).toBe("Drinking well, but still hard");
  });
});

describe("water logging and the bottle", () => {
  it("caps bottle estimates and adds them up for the day", () => {
    resetDbForTests();
    const p = createUser({ email: "w@test.dev", name: "Wren", password: "correct horse battery", role: "patient" });
    recordBottleSips(p.id, bottleIngestSchema.parse({ sips: 2, ml: 60 }));
    recordBottleSips(p.id, bottleIngestSchema.parse({ sips: 1, ml: 9000 })); // capped to 250
    recordBottleSips(p.id, bottleIngestSchema.parse({ sips: 3 })); // default 30 ml a sip
    addHydration(p, { source: "manual", ml: 250, sips: 0 });
    const s = hydrationSummary(p, p.id);
    expect(s.ml).toBe(60 + 250 + 90 + 250);
    expect(s.sips).toBe(6);
    expect(s.sources.sort()).toEqual(["bottle", "manual"]);
    expect(fluidDays(p.id, TZ)[0].estimated).toBe(true);
  });

  it("rejects bad bottle payloads", () => {
    expect(bottleIngestSchema.safeParse({ sips: -1 }).success).toBe(false);
    expect(bottleIngestSchema.safeParse({ sips: 1, extra: true }).success).toBe(false);
    expect(bottleIngestSchema.safeParse({ sips: 1000 }).success).toBe(false);
  });

  it("pairing tokens map to the patient", () => {
    resetDbForTests();
    const p = createUser({ email: "w2@test.dev", name: "Wren", password: "correct horse battery", role: "patient" });
    const token = createDeviceToken(p);
    expect(patientForDeviceToken(token)).toBe(p.id);
    expect(patientForDeviceToken("gfd_" + "q".repeat(32))).toBeNull();
  });
});

describe("Nora demo patient", () => {
  it("shows the new flag to Priya, labelled simulated, and can be reviewed", () => {
    resetDbForTests();
    seedDemoData(new Date());
    const priya = authenticate(DEMO_ACCOUNTS.practitioner, DEMO_PASSWORD)!;
    const row = getCaseload(priya).find((c) => c.patient.name === "Nora Lindqvist")!;
    const flag = row.outstanding.find((f) => f.rule === "hard_despite_fluids")!;
    expect(flag).toBeDefined();
    expect(flag.whatChanged).toMatch(/simulated bottle data/);
    expect(flag.context.some((c) => c.tag === "medication_change")).toBe(true);
    const review = createReview(priya, row.patient.id, { flagKey: flag.key, decision: "contact_patient", note: "Asked about the iron tablets.", followUp: "Check in on Friday.", suggestionSource: "none" });
    expect(review.flagRule).toBe("hard_despite_fluids");
    expect(getPatientOverview(priya, row.patient.id).flags.find((f) => f.key === flag.key)?.status).toBe("reviewed");
  });
});
