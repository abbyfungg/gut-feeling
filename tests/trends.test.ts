import { describe, expect, it } from "vitest";
import { computeTrends } from "@/lib/rules/trends";
import { ago, entry } from "./helpers";

const TZ = "America/Toronto";
const now = new Date("2026-10-17T16:00:00Z");

describe("trends", () => {
  it("is honest when there is not enough data", () => {
    const t = computeTrends([entry({ occurredAt: ago(now, 3) })], now, TZ);
    expect(t.comparable).toBe(false);
    expect(t.headline).toMatch(/few more logs/);
  });

  it("empty state does not guilt the user", () => {
    expect(computeTrends([], now, TZ).headline).toMatch(/No pressure/);
  });

  it("distinguishes unknown days (null) from confirmed no-movement days (0)", () => {
    const t = computeTrends([entry({ kind: "no_movement", bristolType: null, occurredAt: ago(now, 26) })], now, TZ);
    const yesterday = t.days[t.days.length - 2];
    const twoDaysAgo = t.days[t.days.length - 3];
    expect(yesterday.movements).toBe(0);
    expect(yesterday.confirmedNone).toBe(true);
    expect(twoDaysAgo.movements).toBeNull();
  });

  it("compares this week with the previous week", () => {
    const prev = [8, 9, 10, 11].map((d) => entry({ occurredAt: ago(now, d * 24), bristolType: 4 }));
    const recent = [1, 2, 3].map((d) => entry({ occurredAt: ago(now, d * 24), bristolType: 6 }));
    const t = computeTrends([...prev, ...recent], now, TZ);
    expect(t.comparable).toBe(true);
    expect(t.recent.avgType).toBe(6);
    expect(t.previous.avgType).toBe(4);
    expect(t.headline).toMatch(/looser/);
    expect(t.recentEntryIds).toHaveLength(3);
  });
});
