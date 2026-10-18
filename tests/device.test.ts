import { beforeEach, describe, expect, it } from "vitest";
import { freshDb } from "./helpers";
freshDb();
import { createUser, type User } from "@/lib/auth";
import { resetDbForTests } from "@/lib/db";
import {
  attachSession,
  createDeviceToken,
  currentSession,
  deviceIngestSchema,
  dismissSession,
  getPairing,
  ingestReadings,
  patientForDeviceToken,
  pendingSession,
  revokeDeviceTokens,
  SESSION_IDLE_MS,
} from "@/lib/device";
import { createEntry, getEntry, listEntries, setSharing } from "@/lib/records";
import { movementInputSchema } from "@/lib/validation";

let patient: User, other: User, nurse: User;
const pw = "correct horse battery";
const batch = (o: Record<string, unknown>) => deviceIngestSchema.parse({ session: "b1", ...o });

beforeEach(() => {
  resetDbForTests();
  patient = createUser({ email: "p@test.dev", name: "Pat", password: pw, role: "patient" });
  other = createUser({ email: "o@test.dev", name: "Oli", password: pw, role: "patient" });
  nurse = createUser({ email: "n@test.dev", name: "Nia", password: pw, role: "practitioner" });
});

describe("squeeze ball pairing", () => {
  it("issues a token that maps to the patient, and stores only a hash", () => {
    const token = createDeviceToken(patient);
    expect(token).toMatch(/^gfd_/);
    expect(patientForDeviceToken(token)).toBe(patient.id);
    expect(getPairing(patient).paired).toBe(true);
    expect(getPairing(patient).lastSeenAt).not.toBeNull();
  });

  it("rejects unknown, malformed and revoked tokens", () => {
    const token = createDeviceToken(patient);
    expect(patientForDeviceToken("gfd_" + "x".repeat(32))).toBeNull();
    expect(patientForDeviceToken("not-a-token")).toBeNull();
    expect(patientForDeviceToken(null)).toBeNull();
    revokeDeviceTokens(patient);
    expect(patientForDeviceToken(token)).toBeNull();
    expect(getPairing(patient).paired).toBe(false);
  });

  it("a new token replaces the old one", () => {
    const a = createDeviceToken(patient);
    const b = createDeviceToken(patient);
    expect(patientForDeviceToken(a)).toBeNull();
    expect(patientForDeviceToken(b)).toBe(patient.id);
  });

  it("only patients can pair", () => {
    expect(() => createDeviceToken(nurse)).toThrow();
  });
});

describe("squeeze sessions", () => {
  it("tracks peak, average, squeezes and samples across batches", () => {
    const t0 = new Date();
    ingestReadings(patient.id, "device", batch({ readings: [0, 20, 60], squeezes: 1 }), t0);
    const s = ingestReadings(patient.id, "device", batch({ readings: [80, 10], squeezes: 2 }), new Date(t0.getTime() + 2000));
    expect(s.status).toBe("live");
    expect(s.peakEffort).toBe(80);
    expect(s.avgEffort).toBe(34);
    expect(s.squeezes).toBe(2);
    expect(s.samples).toEqual([0, 20, 60, 80, 10]);
    expect(s.durationMs).toBe(2000);
    expect(s.lastEffort).toBe(10);
  });

  it("done ends the session and leaves it as a draft to log", () => {
    ingestReadings(patient.id, "device", batch({ readings: [50] }));
    const s = ingestReadings(patient.id, "device", batch({ readings: [], done: true }));
    expect(s.status).toBe("ended");
    expect(pendingSession(patient)?.id).toBe(s.id);
  });

  it("closes a session that went quiet", () => {
    const t0 = new Date(Date.now() - SESSION_IDLE_MS - 5000);
    ingestReadings(patient.id, "device", batch({ readings: [40] }), t0);
    expect(currentSession(patient)?.status).toBe("ended");
  });

  it("keeps simulated and device data apart and labelled", () => {
    const sim = ingestReadings(patient.id, "simulated", batch({ readings: [30] }));
    expect(sim.source).toBe("simulated");
    const dev = ingestReadings(patient.id, "device", batch({ readings: [30] }));
    expect(dev.source).toBe("device");
    expect(dev.id).not.toBe(sim.id);
  });

  it("attaches to an entry, which then carries the effort for the patient and their nurse", () => {
    setSharing(patient, nurse.id, true);
    ingestReadings(patient.id, "device", batch({ readings: [10, 70], squeezes: 1 }));
    const s = ingestReadings(patient.id, "device", batch({ done: true }));
    const entry = createEntry(patient, movementInputSchema.parse({ kind: "movement", occurredAt: new Date(Date.now() - 1000).toISOString(), bristolType: 2 }));
    attachSession(patient, s.id, entry.id);
    expect(getEntry(patient, entry.id).effort).toMatchObject({ source: "device", peakEffort: 70, squeezes: 1 });
    expect(listEntries(nurse, patient.id)[0].effort?.peakEffort).toBe(70);
    expect(pendingSession(patient)).toBeNull();
    expect(() => attachSession(patient, s.id, entry.id)).toThrow();
  });

  it("other patients can't attach, dismiss or see a session", () => {
    const s = ingestReadings(patient.id, "device", batch({ readings: [10], done: true }));
    expect(() => dismissSession(other, s.id)).toThrow();
    expect(() => attachSession(other, s.id, "en_x")).toThrow();
    expect(currentSession(other)).toBeNull();
  });

  it("dismissed sessions stop nagging", () => {
    const s = ingestReadings(patient.id, "device", batch({ readings: [10], done: true }));
    dismissSession(patient, s.id);
    expect(pendingSession(patient)).toBeNull();
  });

  it("validates the device payload", () => {
    expect(deviceIngestSchema.safeParse({ session: "b1", readings: [101] }).success).toBe(false);
    expect(deviceIngestSchema.safeParse({ session: "b 1", readings: [1] }).success).toBe(false);
    expect(deviceIngestSchema.safeParse({ session: "b1", readings: Array(61).fill(1) }).success).toBe(false);
    expect(deviceIngestSchema.safeParse({ session: "b1", readings: [1], extra: 1 }).success).toBe(false);
  });
});
