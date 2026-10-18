import { describe, expect, it } from "vitest";
import { freshDb } from "./helpers";
freshDb();
import { authenticate } from "@/lib/auth";
import { resetDbForTests } from "@/lib/db";
import { describePattern, callName } from "@/lib/pattern";
import { listEntries } from "@/lib/records";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, seedDemoData } from "@/lib/seed";
import { getStoryMoment } from "@/lib/story";

describe("Walter's before-the-flag moment", () => {
  resetDbForTests();
  seedDemoData(new Date());
  const m = getStoryMoment()!;

  it("is the evening before the nurse's review, with nothing from afterwards", () => {
    expect(m).not.toBeNull();
    expect(new Date(m.review!.createdAt).getTime() - m.asOf.getTime()).toBe((12 * 60 + 40) * 60_000);
    expect(m.entries.every((e) => new Date(e.occurredAt) <= m.asOf)).toBe(true);
    expect(m.entries.some((e) => e.notes?.includes("Saw the GP"))).toBe(false);
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

  it("matches the flags the care team saw next morning", () => {
    expect(m.flags.map((f) => f.rule)).toEqual(expect.arrayContaining(["no_movement", "hard_stools"]));
    expect(m.careTeam).toContain("Priya Raman");
  });

  it("shows no warning for Walter today, once he's back to normal", () => {
    const walter = authenticate(DEMO_ACCOUNTS.story, DEMO_PASSWORD)!;
    const now = describePattern(listEntries(walter, walter.id), new Date(), "America/Toronto");
    expect(now.findings.filter((f) => f.kind !== "context")).toHaveLength(0);
  });

  it("addresses people by how they'd be called", () => {
    expect(callName("Priya Raman")).toBe("Priya");
    expect(callName("Dr. Sam Okafor")).toBe("Dr. Okafor");
  });
});
