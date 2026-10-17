import { beforeEach, describe, expect, it } from "vitest";
import { freshDb } from "./helpers";
freshDb();
import { createSession, createUser, getUserBySessionToken, authenticate, type User } from "@/lib/auth";
import { resetDbForTests } from "@/lib/db";
import {
  AccessError,
  InputError,
  assertCanViewPatient,
  completeFollowUp,
  createEntry,
  createReview,
  deleteAccount,
  deleteEntry,
  getCaseload,
  getPatientOverview,
  listEntries,
  saveAiDraft,
  setSharing,
} from "@/lib/records";
import { entryInputSchema, movementInputSchema } from "@/lib/validation";
import type { StoredAiAnalysis } from "@/lib/domain";

let patient: User, other: User, nurse: User, outsider: User;
const pw = "correct horse battery";

beforeEach(() => {
  resetDbForTests();
  patient = createUser({ email: "p@test.dev", name: "Pat", password: pw, role: "patient" });
  other = createUser({ email: "o@test.dev", name: "Oli", password: pw, role: "patient" });
  nurse = createUser({ email: "n@test.dev", name: "Nia", password: pw, role: "practitioner" });
  outsider = createUser({ email: "x@test.dev", name: "Xan", password: pw, role: "practitioner" });
  setSharing(patient, nurse.id, true);
});

const movement = (over: Record<string, unknown> = {}) =>
  movementInputSchema.parse({ kind: "movement", occurredAt: new Date(Date.now() - 60_000).toISOString(), bristolType: 4, ...over });

describe("auth", () => {
  it("hashes passwords and authenticates", () => {
    expect(authenticate("p@test.dev", pw)?.id).toBe(patient.id);
    expect(authenticate("p@test.dev", "wrong password")).toBeNull();
    expect(authenticate("nobody@test.dev", pw)).toBeNull();
  });
  it("sessions resolve to the user and reject garbage", () => {
    const { token } = createSession(patient.id);
    expect(getUserBySessionToken(token)?.id).toBe(patient.id);
    expect(getUserBySessionToken("nope")).toBeNull();
    expect(getUserBySessionToken(undefined)).toBeNull();
  });
});

describe("validation keeps missing information missing", () => {
  it("skipped optional fields stay null, not negative", () => {
    const v = movement();
    expect(v.symptoms).toBeNull();
    expect(v.context).toBeNull();
    expect(v.bloodReport).toBeNull();
    expect(v.notes).toBeNull();
  });
  it("'felt fine' is an explicit empty list", () => {
    expect(movement({ symptoms: [] }).symptoms).toEqual([]);
  });
  it("rejects out-of-range types, unknown symptoms and extra fields", () => {
    expect(entryInputSchema.safeParse({ kind: "movement", occurredAt: new Date().toISOString(), bristolType: 9 }).success).toBe(false);
    expect(entryInputSchema.safeParse({ kind: "movement", occurredAt: new Date().toISOString(), bristolType: 4, symptoms: ["zombie"] }).success).toBe(false);
    expect(entryInputSchema.safeParse({ kind: "movement", occurredAt: new Date().toISOString(), bristolType: 4, patientId: "someone" }).success).toBe(false);
    expect(entryInputSchema.safeParse({ kind: "movement", occurredAt: "not a date", bristolType: 4 }).success).toBe(false);
  });
  it("allows a movement with no type", () => {
    expect(movement({ bristolType: null }).bristolSource).toBeNull();
  });
});

describe("entries", () => {
  it("saves an entry and it appears in the practitioner's view of that patient", () => {
    const e = createEntry(patient, movement({ notes: "after lunch", symptoms: ["bloating"] }));
    expect(listEntries(patient, patient.id).map((x) => x.id)).toContain(e.id);
    const o = getPatientOverview(nurse, patient.id);
    expect(o.entries.find((x) => x.id === e.id)?.notes).toBe("after lunch");
  });
  it("rejects future times", () => {
    expect(() => createEntry(patient, movement({ occurredAt: new Date(Date.now() + 3_600_000).toISOString() }))).toThrow(InputError);
  });
  it("practitioners cannot create entries", () => {
    expect(() => createEntry(nurse, movement())).toThrow(AccessError);
  });
  it("only the owner can delete an entry", () => {
    const e = createEntry(patient, movement());
    expect(() => deleteEntry(other, e.id)).toThrow(AccessError);
    expect(() => deleteEntry(nurse, e.id)).toThrow(AccessError);
    deleteEntry(patient, e.id);
    expect(listEntries(patient, patient.id)).toHaveLength(0);
  });
});

describe("authorization", () => {
  it("patients can only see themselves", () => {
    expect(() => listEntries(other, patient.id)).toThrow(AccessError);
    expect(() => getPatientOverview(other, patient.id)).toThrow(AccessError);
  });
  it("practitioners only see patients who share with them", () => {
    expect(() => assertCanViewPatient(nurse, patient.id)).not.toThrow();
    expect(() => listEntries(outsider, patient.id)).toThrow(AccessError);
    expect(() => listEntries(nurse, other.id)).toThrow(AccessError);
    expect(getCaseload(nurse).map((c) => c.patient.id)).toEqual([patient.id]);
    expect(getCaseload(outsider)).toEqual([]);
  });
  it("revoking sharing removes access immediately; re-granting restores it", () => {
    setSharing(patient, nurse.id, false);
    expect(() => listEntries(nurse, patient.id)).toThrow(AccessError);
    setSharing(patient, nurse.id, true);
    expect(() => listEntries(nurse, patient.id)).not.toThrow();
  });
  it("a practitioner id passed as a patient id is not readable", () => {
    expect(() => getPatientOverview(nurse, outsider.id)).toThrow(AccessError);
  });
});

describe("reviews and follow-ups", () => {
  function makeFlag() {
    createEntry(patient, movement({ bristolType: 7, occurredAt: new Date(Date.now() - 5 * 3_600_000).toISOString() }));
    createEntry(patient, movement({ bristolType: 7, occurredAt: new Date(Date.now() - 3 * 3_600_000).toISOString() }));
    createEntry(patient, movement({ bristolType: 6, occurredAt: new Date(Date.now() - 1 * 3_600_000).toISOString() }));
    const flag = getPatientOverview(nurse, patient.id).flags.find((f) => f.rule === "loose_stools")!;
    expect(flag.status).toBe("outstanding");
    return flag;
  }

  it("records a review linked to the flag's evidence and marks it reviewed", () => {
    const flag = makeFlag();
    const r = createReview(nurse, patient.id, { flagKey: flag.key, decision: "contact_patient", note: "called", followUp: "Call tomorrow", suggestionSource: "rule_template" });
    expect(r.evidenceIds).toEqual(flag.evidenceIds);
    expect(r.followUpStatus).toBe("open");
    const again = getPatientOverview(nurse, patient.id).flags.find((f) => f.key === flag.key)!;
    expect(again.status).toBe("reviewed");
    expect(completeFollowUp(nurse, r.id).followUpStatus).toBe("done");
  });

  it("new evidence after a review re-opens the item as 'new info'", async () => {
    const flag = makeFlag();
    createReview(nurse, patient.id, { flagKey: flag.key, decision: "keep_monitoring", note: "", followUp: "", suggestionSource: "none" });
    await new Promise((r) => setTimeout(r, 5));
    createEntry(patient, movement({ bristolType: 7, occurredAt: new Date(Date.now() - 30 * 60_000).toISOString() }));
    const f = getPatientOverview(nurse, patient.id).flags.find((x) => x.key === flag.key)!;
    expect(f.status).toBe("new_info");
  });

  it("requires a follow-up for decisions that need one", () => {
    const flag = makeFlag();
    expect(() => createReview(nurse, patient.id, { flagKey: flag.key, decision: "escalate", note: "", followUp: "", suggestionSource: "none" })).toThrow(InputError);
  });

  it("rejects reviews of flags that don't exist and from practitioners without access", () => {
    const flag = makeFlag();
    expect(() => createReview(nurse, patient.id, { flagKey: "loose_stools:fake", decision: "no_action", note: "", followUp: "", suggestionSource: "none" })).toThrow(InputError);
    expect(() => createReview(outsider, patient.id, { flagKey: flag.key, decision: "no_action", note: "", followUp: "", suggestionSource: "none" })).toThrow(AccessError);
    const r = createReview(nurse, patient.id, { flagKey: flag.key, decision: "contact_patient", note: "", followUp: "x", suggestionSource: "none" });
    expect(() => completeFollowUp(outsider, r.id)).toThrow(AccessError);
  });
});

describe("AI drafts", () => {
  const ai: StoredAiAnalysis = { simulated: false, model: "fake", analyzedAt: new Date().toISOString(), usable: true, estimatedType: 4, confidence: "high", colorObservation: "brown", observations: [], limitations: "" };

  it("attaches a saved AI result and records whether the person kept it", () => {
    const id1 = saveAiDraft(patient, ai);
    const kept = createEntry(patient, movement({ bristolType: 4, ai: { analysisId: id1 } }));
    expect(kept.bristolSource).toBe("ai_accepted");
    expect(kept.ai?.estimatedType).toBe(4);
    const id2 = saveAiDraft(patient, ai);
    const changed = createEntry(patient, movement({ bristolType: 5, ai: { analysisId: id2 } }));
    expect(changed.bristolSource).toBe("ai_corrected");
  });

  it("an AI result can't be reused, forged, or used by another patient", () => {
    const id = saveAiDraft(patient, ai);
    expect(() => createEntry(other, movement({ ai: { analysisId: id } }))).toThrow(InputError);
    createEntry(patient, movement({ ai: { analysisId: id } }));
    expect(() => createEntry(patient, movement({ ai: { analysisId: id } }))).toThrow(InputError);
    expect(() => createEntry(patient, movement({ ai: { analysisId: "ai_madeup" } }))).toThrow(InputError);
  });

  it("manual entries have no AI provenance", () => {
    const e = createEntry(patient, movement());
    expect(e.ai).toBeNull();
    expect(e.bristolSource).toBe("user");
  });
});

describe("account deletion", () => {
  it("removes the patient and all their data", () => {
    createEntry(patient, movement());
    deleteAccount(patient);
    expect(() => listEntries(nurse, patient.id)).toThrow(AccessError);
    expect(getCaseload(nurse)).toEqual([]);
  });
  it("is blocked for shared demo accounts", () => {
    const demo = createUser({ email: "d@test.dev", name: "Demo", password: pw, role: "patient", isSynthetic: true });
    expect(() => deleteAccount(demo)).toThrow(InputError);
  });
});
