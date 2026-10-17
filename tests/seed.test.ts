import { describe, expect, it } from "vitest";
import { freshDb } from "./helpers";
freshDb();
import { authenticate } from "@/lib/auth";
import { resetDbForTests } from "@/lib/db";
import { getCaseload, listEntries } from "@/lib/records";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, seedDemoData } from "@/lib/seed";

describe("synthetic demo data", () => {
  resetDbForTests();
  seedDemoData(new Date());
  const priya = authenticate(DEMO_ACCOUNTS.practitioner, DEMO_PASSWORD)!;
  const caseload = getCaseload(priya);
  const byName = (n: string) => caseload.find((c) => c.patient.name.startsWith(n))!;

  it("all records are marked synthetic", () => {
    for (const c of caseload) expect(c.patient.isSynthetic).toBe(true);
    const maya = authenticate(DEMO_ACCOUNTS.patient, DEMO_PASSWORD)!;
    expect(listEntries(maya, maya.id).every((e) => e.isSynthetic)).toBe(true);
  });

  it("covers the four required scenarios", () => {
    const rules = (n: string) => byName(n).outstanding.map((f) => f.rule);
    expect(rules("Margaret")).toEqual(expect.arrayContaining(["no_movement", "hard_stools"])); // possible constipation pattern
    expect(rules("Daniel")).toContain("loose_stools"); // repeated loose stools
    expect(rules("Maya")).toContain("reported_blood"); // user-reported concerning observation
    const ruth = byName("Ruth");
    expect(ruth.allFlags).toHaveLength(0); // logging gap is not a symptom
    expect(ruth.notices.some((n) => n.kind === "logging_gap")).toBe(true);
  });

  it("a steady patient has nothing flagged", () => {
    expect(byName("Tom").allFlags).toHaveLength(0);
  });

  it("unshared and revoked patients are not in the nurse's caseload", () => {
    const names = caseload.map((c) => c.patient.name);
    expect(names).not.toContain("Linh Tran");
    expect(names).not.toContain("Omar Haddad");
  });

  it("includes a completed review for the history view", () => {
    expect(byName("Daniel").allFlags.some((f) => f.status === "reviewed")).toBe(true);
  });
});
