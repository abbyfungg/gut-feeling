import { describe, expect, it } from "vitest";
import { freshDb } from "./helpers";
freshDb();
import type { JsonModel } from "@/lib/ai/gemini";
import { AiUnavailableError } from "@/lib/ai/gemini";
import { buildWaterPrompt, draftWaterInsight } from "@/lib/ai/water";
import { createUser } from "@/lib/auth";
import { resetDbForTests } from "@/lib/db";
import type { Entry } from "@/lib/domain";
import { fluidBlocks, type FluidBlockDay } from "@/lib/fluids";
import { recordHydration } from "@/lib/hydration";

const TZ = "America/Toronto";
const now = new Date("2026-10-18T16:00:00Z");
const entry = (id: string, iso: string, type: number, extra: Partial<Entry> = {}): Entry => ({
  id, patientId: "p", kind: "movement", occurredAt: iso, bristolType: type, bristolSource: "user", symptoms: ["straining"], context: null,
  bloodReport: null, notes: null, ai: null, isSynthetic: true, createdAt: iso, ...extra,
});
const entries = [
  entry("e_a", "2026-10-16T14:00:00Z", 2, { context: ["medication_change"], notes: "Started iron tablets" }),
  entry("e_b", "2026-10-17T13:00:00Z", 1),
];
const fluids: FluidBlockDay[] = [
  { day: "2026-10-16", morning: 900, afternoon: 200, evening: 600, sips: 57, simulated: true, estimated: true },
  { day: "2026-10-17", morning: 1000, afternoon: 100, evening: 500, sips: 53, simulated: true, estimated: true },
];
const fake = (answer: unknown): JsonModel & { last?: string } => {
  const m: JsonModel & { last?: string } = {
    name: "gemini-test",
    async generateJson({ parts }) {
      m.last = (parts[0] as { text: string }).text;
      return typeof answer === "string" ? answer : JSON.stringify(answer);
    },
  };
  return m;
};
const good = {
  headline: "You drank well in the mornings, less after lunch, and stools stayed hard.",
  explanation: "Most water came before noon. Hard stools came after afternoons with little water, though the total was still high.",
  data_points: [
    { ref: "water:2026-10-17", observation: "Only 100 ml in the afternoon." },
    { ref: "e_b", observation: "Type 1 with straining the same day." },
    { ref: "e_made_up", observation: "Not real." },
  ],
  suggestions: ["Spread drinks through the afternoon.", "Ask your pharmacist whether iron tablets could play a part.", "A short walk after lunch."],
  contact_clinician: "Contact your nurse if you go three days without a movement or have belly pain.",
};

describe("Gemini water insight", () => {
  it("sends the water timeline, stool log, days since last movement and medicines", () => {
    const p = buildWaterPrompt({ fluids, entries, timeZone: TZ, now });
    expect(p).toContain("water:2026-10-17");
    expect(p).toContain("afternoon 100");
    expect(p).toContain("simulated demo data");
    expect(p).toContain("e_b");
    expect(p).toContain("Bristol type 1");
    expect(p).toContain("Days since last movement: 1");
    expect(p).toContain("Started iron tablets");
  });

  it("keeps only citations of data that was sent, and labels simulated data", async () => {
    const model = fake(good);
    const r = await draftWaterInsight(model, { fluids, entries, timeZone: TZ }, now);
    expect(r.dataPoints.map((d) => d.ref)).toEqual(["water:2026-10-17", "e_b"]);
    expect(r.dataPoints[0].label).toMatch(/^Water, /);
    expect(r.simulated).toBe(true);
    expect(r.suggestions).toHaveLength(3);
    expect(r.model).toBe("gemini-test");
  });

  it("rejects answers that don't match the schema", async () => {
    await expect(draftWaterInsight(fake("not json"), { fluids, entries, timeZone: TZ }, now)).rejects.toBeInstanceOf(AiUnavailableError);
    await expect(draftWaterInsight(fake({ headline: "x" }), { fluids, entries, timeZone: TZ }, now)).rejects.toMatchObject({ kind: "invalid_response" });
  });

  it("splits water into morning, afternoon and evening in local time", () => {
    resetDbForTests();
    const u = createUser({ email: "wi@test.dev", name: "Wren", password: "correct horse battery", role: "patient" });
    recordHydration(u.id, "bottle", 3, 90, new Date("2026-10-18T13:00:00Z")); // 9 am Toronto
    recordHydration(u.id, "simulated", 2, 60, new Date("2026-10-18T18:30:00Z")); // 2:30 pm
    recordHydration(u.id, "manual", 0, 250, new Date("2026-10-18T22:00:00Z")); // 6 pm
    const [d] = fluidBlocks(u.id, TZ, new Date("2026-10-18T23:00:00Z"), 7);
    expect(d).toMatchObject({ day: "2026-10-18", morning: 90, afternoon: 60, evening: 250, sips: 5, simulated: true, estimated: true });
  });
});
