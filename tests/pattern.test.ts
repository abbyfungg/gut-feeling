import { describe, expect, it } from "vitest";
import { freshDb } from "./helpers";
freshDb();
import { authenticate } from "@/lib/auth";
import { resetDbForTests } from "@/lib/db";
import { describePattern, callName } from "@/lib/pattern";
import { getCaseload, listEntries } from "@/lib/records";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, seedDemoData } from "@/lib/seed";
import { getStoryMoment } from "@/lib/story";

describe("Walter, live in Priya's queue before her call", () => {
  resetDbForTests();
  seedDemoData(new Date());
  const m = getStoryMoment()!;

  it("is live: nobody has reviewed him, and there's no recovery yet", () => {
    expect(m).not.toBeNull();
    expect(m.live).toBe(true);
    expect(m.review).toBeNull();
    expect(Math.abs(m.asOf.getTime() - Date.now())).toBeLessThan(60_000);
    expect(m.entries.some((e) => e.notes?.includes("Saw the GP"))).toBe(false);
  });

  it("is on Priya's caseload with open, unreviewed flags", () => {
    const priya = authenticate(DEMO_ACCOUNTS.practitioner, DEMO_PASSWORD)!;
    const row = getCaseload(priya).find((r) => r.patient.name === "Walter Brooks")!;
    expect(row).toBeTruthy();
    expect(row.outstanding.map((f) => f.rule)).toEqual(expect.arrayContaining(["no_movement", "hard_stools"]));
  });

  it("names exactly what changed, citing real entries", () => {
    const kinds = m.pattern.findings.map((f) => f.kind);
    expect(kinds).toEqual(["harder", "gap", "straining", "context"]);
    expect(m.pattern.usualType).toBe(4);
    const ids = new Set(m.entries.map((e) => e.id));
    for (const f of m.pattern.findings) for (const id of f.entryIds) expect(ids.has(id)).toBe(true);
    expect(m.pattern.findings[0].detail).toMatch(/types 2, 2 and 1/);
    expect(m.pattern.findings[1].title).toBe("Nothing for 3 days");
  });

  it("matches the flags waiting in the care team's queue", () => {
    expect(m.flags.map((f) => f.rule)).toEqual(expect.arrayContaining(["no_movement", "hard_stools"]));
    expect(m.careTeam).toContain("Priya Raman");
  });

  it("his own home screen shows the same warning right now", () => {
    const walter = authenticate(DEMO_ACCOUNTS.story, DEMO_PASSWORD)!;
    const now = describePattern(listEntries(walter, walter.id), new Date(), "America/Toronto");
    expect(now.findings.map((f) => f.kind)).toEqual(["harder", "gap", "straining", "context"]);
  });

  it("addresses people by how they'd be called", () => {
    expect(callName("Priya Raman")).toBe("Priya");
    expect(callName("Dr. Sam Okafor")).toBe("Dr. Okafor");
  });
});

describe("old demo databases", () => {
  it("replace an already-reviewed Walter with the live one", async () => {
    const { getDb } = await import("@/lib/db");
    const { ensureSeeded, resetSeedFlagForTests } = await import("@/lib/seed");
    resetDbForTests();
    seedDemoData(new Date());
    const db = getDb();
    const w = db.prepare("SELECT id FROM users WHERE email = ?").get(DEMO_ACCOUNTS.story) as { id: string };
    const p = db.prepare("SELECT id FROM users WHERE email = ?").get(DEMO_ACCOUNTS.practitioner) as { id: string };
    db.prepare(
      "INSERT INTO reviews (id, patient_id, practitioner_id, flag_key, flag_rule, flag_title, evidence_ids, decision, note, follow_up, follow_up_status, suggestion_source, created_at, completed_at) VALUES ('rv_old', ?, ?, 'k', 'no_movement', 't', '[]', 'contact_patient', 'old', '', 'done', 'rule_template', ?, ?)",
    ).run(w.id, p.id, new Date().toISOString(), new Date().toISOString());
    resetSeedFlagForTests();
    process.env.SEED_DEMO_DATA = "true";
    try {
      ensureSeeded();
    } finally {
      process.env.SEED_DEMO_DATA = "false";
    }
    const w2 = db.prepare("SELECT id FROM users WHERE email = ?").get(DEMO_ACCOUNTS.story) as { id: string };
    expect(w2).toBeTruthy();
    expect((db.prepare("SELECT COUNT(*) AS n FROM reviews WHERE patient_id = ?").get(w2.id) as { n: number }).n).toBe(0);
    expect(getStoryMoment()?.live).toBe(true);
  });
});
