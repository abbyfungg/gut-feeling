import { describe, expect, it } from "vitest";
import { freshDb } from "./helpers";
freshDb();
import { authenticate, createUser } from "@/lib/auth";
import { resetDbForTests } from "@/lib/db";
import { createDeviceToken, deviceForToken, getPairing, patientForDeviceToken } from "@/lib/device";
import type { Entry } from "@/lib/domain";
import { fluidDays } from "@/lib/fluids";
import { addHydration, bottleIngestSchema, hydrationSummary, MAX_ML_PER_SIP, MAX_SIPS_PER_UPLOAD, recordBottleSips, removeHydration } from "@/lib/hydration";
import { formatWater, pairingState } from "@/lib/water-format";
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
    recordBottleSips(p.id, bottleIngestSchema.parse({ sips: 1, ml: 9000 })); // capped to MAX_ML_PER_SIP
    recordBottleSips(p.id, bottleIngestSchema.parse({ sips: 3 })); // default 30 ml a sip
    addHydration(p, { source: "manual", ml: 250, sips: 0 });
    const s = hydrationSummary(p, p.id);
    expect(s.ml).toBe(60 + MAX_ML_PER_SIP + 90 + 250);
    expect(s.sips).toBe(6);
    expect(s.sources.sort()).toEqual(["bottle", "manual"]);
    expect(fluidDays(p.id, TZ)[0].estimated).toBe(true);
  });

  it("counts a retried or replayed bottle upload only once", () => {
    resetDbForTests();
    const p = createUser({ email: "w3@test.dev", name: "Wren", password: "correct horse battery", role: "patient" });
    const dev = deviceForToken(createDeviceToken(p))!;
    const send = (b: object) => recordBottleSips(p.id, bottleIngestSchema.parse(b), new Date(), dev.tokenId);
    expect(send({ boot: "a1", total: 0, totalMl: 0 })).toEqual({ sips: 0, ml: 0 }); // check-in at power-on
    expect(send({ boot: "a1", total: 2, totalMl: 60 })).toEqual({ sips: 2, ml: 60 });
    // Reply lost, so the board sends the same totals again, and again on its 5-minute check-in: nothing new
    expect(send({ boot: "a1", total: 2, totalMl: 60 })).toEqual({ sips: 0, ml: 0 });
    expect(send({ boot: "a1", total: 2, totalMl: 60 })).toEqual({ sips: 0, ml: 0 });
    // the laptop was offline for 3 sips; they go out together when it reconnects
    expect(send({ boot: "a1", total: 5, totalMl: 150 })).toEqual({ sips: 3, ml: 90 });
    // An older upload arriving late changes nothing
    expect(send({ boot: "a1", total: 4, totalMl: 120 })).toEqual({ sips: 0, ml: 0 });
    // Board restarted: totals start from zero under a new boot id
    expect(send({ boot: "b2", total: 1, totalMl: 30 })).toEqual({ sips: 1, ml: 30 });
    const s = hydrationSummary(p, p.id);
    expect(s.sips).toBe(6);
    expect(s.ml).toBe(180);
  });

  it("caps implausible bottle amounts", () => {
    resetDbForTests();
    const p = createUser({ email: "w4@test.dev", name: "Wren", password: "correct horse battery", role: "patient" });
    const dev = deviceForToken(createDeviceToken(p))!;
    expect(recordBottleSips(p.id, bottleIngestSchema.parse({ boot: "c3", total: 1, totalMl: 900 }), new Date(), dev.tokenId)).toEqual({ sips: 1, ml: MAX_ML_PER_SIP });
    expect(recordBottleSips(p.id, bottleIngestSchema.parse({ sips: 200 })).sips).toBe(MAX_SIPS_PER_UPLOAD);
  });

  it("undo removes a glass or simulated sip, but never bottle data or someone else's", () => {
    resetDbForTests();
    const p = createUser({ email: "w5@test.dev", name: "Wren", password: "correct horse battery", role: "patient" });
    const q = createUser({ email: "w6@test.dev", name: "Quinn", password: "correct horse battery", role: "patient" });
    const glass = addHydration(p, { source: "manual", ml: 250, sips: 0 })!;
    recordBottleSips(p.id, bottleIngestSchema.parse({ sips: 1 }));
    expect(hydrationSummary(p, p.id).ml).toBe(280);
    expect(removeHydration(q, glass)).toBe(false);
    expect(removeHydration(p, glass)).toBe(true);
    expect(removeHydration(p, glass)).toBe(false);
    expect(hydrationSummary(p, p.id).ml).toBe(30);
  });

  it("pairing is 'waiting' until the bottle actually sends something", () => {
    resetDbForTests();
    const p = createUser({ email: "w7@test.dev", name: "Wren", password: "correct horse battery", role: "patient" });
    expect(pairingState(getPairing(p))).toBe("none");
    const t1 = createDeviceToken(p);
    expect(pairingState(getPairing(p))).toBe("waiting");
    const seenAt = new Date();
    patientForDeviceToken(t1, seenAt);
    expect(pairingState(getPairing(p), seenAt.getTime() + 60_000)).toBe("online");
    expect(pairingState(getPairing(p), seenAt.getTime() + 11 * 60_000)).toBe("offline");
    // A new code revokes the old one and starts waiting again
    createDeviceToken(p);
    expect(patientForDeviceToken(t1)).toBeNull();
    expect(pairingState(getPairing(p))).toBe("waiting");
  });

  it("formats water so one sip always changes the number", () => {
    expect(formatWater(200).text).toBe("200 ml");
    expect(formatWater(230).text).toBe("230 ml");
    expect(formatWater(999.6).text).toBe("1000 ml".replace("1000 ml", formatWater(1000).text));
    expect(formatWater(2400).text).toBe("2.40 L");
    expect(formatWater(2430).text).toBe("2.43 L");
    expect(formatWater(-5).text).toBe("0 ml");
  });

  it("rejects bad bottle payloads", () => {
    expect(bottleIngestSchema.safeParse({ boot: "a1" }).success).toBe(false);
    expect(bottleIngestSchema.safeParse({}).success).toBe(false);
    expect(bottleIngestSchema.safeParse({ boot: "no spaces!", total: 1 }).success).toBe(false);
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
