import { describe, expect, it } from "vitest";
import { freshDb, entry, ago } from "./helpers";
freshDb();
import { analyzePhoto, AiUnavailableError, getGeminiModel, interpretPhotoResponse, validateSummary, draftCareSummary, type JsonModel } from "@/lib/ai/gemini";
import { sniffImageType, validateImageUpload } from "@/lib/ai/upload";
import { evaluateRules } from "@/lib/rules/engine";

const ok = { subject: "stool", image_usable: true, unusable_reason: "", estimated_bristol_type: 4, confidence: "high", color_observation: "brown", observations: ["smooth surface"], limitations: "Lighting varies." };

describe("photo response interpretation", () => {
  it("accepts a valid, confident response", () => {
    const r = interpretPhotoResponse(JSON.stringify(ok), "m");
    expect(r.status).toBe("ok");
    expect(r.result.estimatedType).toBe(4);
    expect(r.result.simulated).toBe(false);
  });
  it("treats malformed JSON as unclassifiable instead of crashing", () => {
    const r = interpretPhotoResponse("{not json", "m");
    expect(r.status).toBe("unclassifiable");
    expect(r.result.estimatedType).toBeNull();
  });
  it("treats schema violations as unclassifiable", () => {
    expect(interpretPhotoResponse(JSON.stringify({ ...ok, estimated_bristol_type: 12 }), "m").status).toBe("unclassifiable");
    expect(interpretPhotoResponse(JSON.stringify({ ...ok, confidence: "certain" }), "m").status).toBe("unclassifiable");
  });
  it("low confidence never auto-selects a type", () => {
    const r = interpretPhotoResponse(JSON.stringify({ ...ok, confidence: "low" }), "m");
    expect(r.status).toBe("unclassifiable");
    expect(r.result.usable).toBe(false);
  });
  it("non-stool photos are rejected politely", () => {
    const r = interpretPhotoResponse(JSON.stringify({ ...ok, subject: "not_stool" }), "m");
    expect(r.status).toBe("unclassifiable");
    expect(r.result.estimatedType).toBeNull();
  });
  it("concerning colours only prompt the person to answer; they never create a flag", () => {
    const r = interpretPhotoResponse(JSON.stringify({ ...ok, color_observation: "reddish" }), "m");
    expect(r.colorAttention).toBe(true);
  });
  it("model failures surface as AiUnavailableError", async () => {
    const broken: JsonModel = { name: "x", generateJson: async () => { throw new Error("network down"); } };
    await expect(analyzePhoto(broken, { mime: "image/png", data: new Uint8Array(2000) })).rejects.toBeInstanceOf(AiUnavailableError);
  });
  it("sends the image inline with a schema", async () => {
    let seen: Parameters<JsonModel["generateJson"]>[0] | null = null;
    const fake: JsonModel = { name: "fake", generateJson: async (a) => { seen = a; return JSON.stringify(ok); } };
    const r = await analyzePhoto(fake, { mime: "image/jpeg", data: new Uint8Array([0xff, 0xd8, 0xff, 1, 2]) });
    expect(r.status).toBe("ok");
    expect(seen!.schema).toBeTruthy();
    expect(JSON.stringify(seen!.parts)).toContain("image/jpeg");
  });
});

describe("AI unavailable fallback", () => {
  it("returns no model when GEMINI_API_KEY is unset", () => {
    delete process.env.GEMINI_API_KEY;
    expect(getGeminiModel()).toBeNull();
  });
});

describe("summary validation", () => {
  const now = new Date("2026-10-17T16:00:00Z");
  const es = [entry({ id: "a", occurredAt: ago(now, 5), bristolType: 7 }), entry({ id: "b", occurredAt: ago(now, 3), bristolType: 7 }), entry({ id: "c", occurredAt: ago(now, 1), bristolType: 7 })];
  const flags = evaluateRules(es, now, "America/Toronto").flags;
  const key = flags[0].key;

  it("keeps items that cite real entries and flags", () => {
    const d = validateSummary(JSON.stringify({ overview: "o", flags: [{ flag_key: key, explanation: "e", cited_entry_ids: ["a", "b"], suggested_follow_up: "s" }], questions_to_ask: [] }), "m", flags, es);
    expect(d.flags).toHaveLength(1);
    expect(d.rejected).toBe(0);
  });
  it("drops items citing invented entries or flags", () => {
    const d = validateSummary(
      JSON.stringify({
        overview: "o",
        flags: [
          { flag_key: key, explanation: "e", cited_entry_ids: ["a", "zzz"], suggested_follow_up: "s" },
          { flag_key: "made_up:1", explanation: "e", cited_entry_ids: ["a"], suggested_follow_up: "s" },
          { flag_key: key, explanation: "e", cited_entry_ids: [], suggested_follow_up: "s" },
        ],
        questions_to_ask: [],
      }),
      "m",
      flags,
      es,
    );
    expect(d.flags).toHaveLength(0);
    expect(d.rejected).toBe(3);
  });
  it("throws on invalid JSON so the route can fall back to rule text", () => {
    expect(() => validateSummary("nope", "m", flags, es)).toThrow(AiUnavailableError);
  });
  it("the prompt contains only real entry ids and the deterministic flags", async () => {
    let prompt = "";
    const fake: JsonModel = { name: "f", generateJson: async (a) => { prompt = JSON.stringify(a.parts); return JSON.stringify({ overview: "o", flags: [], questions_to_ask: [] }); } };
    await draftCareSummary(fake, { patientName: "P", flags, entries: es, timeZone: "America/Toronto" }, now);
    expect(prompt).toContain(key);
    for (const id of ["a", "b", "c"]) expect(prompt).toContain(id);
  });
});

describe("upload validation", () => {
  const pad = (head: number[]) => new Uint8Array([...head, ...new Array(2000).fill(0)]);
  it("recognises real image signatures", () => {
    expect(sniffImageType(pad([0xff, 0xd8, 0xff]))).toBe("image/jpeg");
    expect(sniffImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffImageType(pad([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]))).toBe("image/webp");
    expect(sniffImageType(pad([0, 0, 0, 0x18, ...Buffer.from("ftypheic")]))).toBe("image/heic");
  });
  it("rejects non-images, tiny files and huge files", () => {
    expect(validateImageUpload(pad([...Buffer.from("<html>")])).ok).toBe(false);
    expect(validateImageUpload(new Uint8Array([0xff, 0xd8, 0xff])).ok).toBe(false);
    const big = new Uint8Array(7 * 1024 * 1024);
    big.set([0xff, 0xd8, 0xff]);
    expect(validateImageUpload(big).ok).toBe(false);
  });
});
