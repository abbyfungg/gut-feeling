import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleGenAI } from "@google/genai";
import { freshDb, entry, ago } from "./helpers";
freshDb();
import { analyzePhoto, AiUnavailableError, classifyAiError, createGeminiModel, getGeminiModel, interpretPhotoResponse, photoFailureMessage, summaryFailureMessage, validateSummary, draftCareSummary, type JsonModel } from "@/lib/ai/gemini";
import { photoResponseJsonSchema } from "@/lib/ai/schemas";
import { getConfig } from "@/lib/config";
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
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_MODEL;
  });
  it("returns no model when GEMINI_API_KEY is unset", () => {
    delete process.env.GEMINI_API_KEY;
    expect(getGeminiModel()).toBeNull();
  });
  it("cleans pasted keys and accepts GOOGLE_API_KEY as an alias", () => {
    process.env.GEMINI_API_KEY = '  "abc123"\n';
    expect(getConfig().geminiApiKey).toBe("abc123");
    delete process.env.GEMINI_API_KEY;
    process.env.GOOGLE_API_KEY = "xyz";
    expect(getConfig().geminiApiKey).toBe("xyz");
    process.env.GOOGLE_API_KEY = "   ";
    expect(getConfig().geminiApiKey).toBe("");
  });
  it("defaults to a current model alias and strips a models/ prefix", () => {
    expect(getConfig().geminiModel).toBe("gemini-flash-latest");
    process.env.GEMINI_MODEL = "models/gemini-3.8-flash ";
    expect(getConfig().geminiModel).toBe("gemini-3.8-flash");
  });
});

/**
 * These run the real @google/genai SDK with fetch stubbed, so they check the exact request we send and how
 * realistic Gemini responses and errors are handled.
 */
describe("Gemini over the real SDK (fetch stubbed)", () => {
  const jpeg = { mime: "image/jpeg" as const, data: new Uint8Array([0xff, 0xd8, 0xff, ...new Array(2000).fill(7)]) };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const candidate = (text: string, finishReason = "STOP") => ({ candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason }] });
  const apiError = (code: number, status: string, message: string, reason?: string) => ({ error: { code, status, message, details: reason ? [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason }] : [] } });
  type Call = { url: string; body: Record<string, any>; key: string | null };

  function sdkModel(configured: string, respond: (call: Call, n: number) => Response | Promise<Response>) {
    const calls: Call[] = [];
    const fetchStub = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const call = { url: String(url), body: JSON.parse(String(init?.body)), key: new Headers(init?.headers).get("x-goog-api-key") };
      calls.push(call);
      return respond(call, calls.length);
    });
    vi.stubGlobal("fetch", fetchStub);
    const client = new GoogleGenAI({ apiKey: "test-key-not-real" });
    return { calls, model: createGeminiModel(configured, (req) => client.models.generateContent(req)) };
  }
  afterEach(() => vi.unstubAllGlobals());

  it("sends the photo inline with a JSON schema to generateContent and parses the answer", async () => {
    const { calls, model } = sdkModel("gemini-flash-latest", () => reply(200, candidate(JSON.stringify(ok))));
    const r = await analyzePhoto(model, jpeg);
    expect(r.status).toBe("ok");
    expect(r.result.estimatedType).toBe(4);
    expect(r.result.model).toBe("gemini-flash-latest");
    expect(calls).toHaveLength(1);
    const { url, body, key } = calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent");
    expect(key).toBe("test-key-not-real");
    expect(body.contents[0].parts[0].inlineData).toEqual({ mimeType: "image/jpeg", data: Buffer.from(jpeg.data).toString("base64") });
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema).toEqual(photoResponseJsonSchema);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "LOW" });
    expect(body.systemInstruction.parts[0].text).toMatch(/Bristol/);
  });

  it("uses only documented schema features (no anyOf/$ref) for structured output", () => {
    const text = JSON.stringify(photoResponseJsonSchema);
    expect(text).not.toMatch(/anyOf|oneOf|\$ref/);
  });

  it("ignores thought parts and reads only the answer text", async () => {
    const { model } = sdkModel("gemini-flash-latest", () =>
      reply(200, { candidates: [{ content: { role: "model", parts: [{ text: "hmm", thought: true }, { text: JSON.stringify(ok) }] }, finishReason: "STOP" }] }),
    );
    expect((await analyzePhoto(model, jpeg)).status).toBe("ok");
  });

  it("falls back to the next model on 404 and remembers it", async () => {
    const { calls, model } = sdkModel("gemini-2.0-flash", (c) =>
      c.url.includes("gemini-2.0-flash") ? reply(404, apiError(404, "NOT_FOUND", "models/gemini-2.0-flash is not found for API version v1beta")) : reply(200, candidate(JSON.stringify(ok))),
    );
    const r = await analyzePhoto(model, jpeg);
    expect(r.status).toBe("ok");
    expect(r.result.model).toBe("gemini-flash-latest");
    expect(calls.map((c) => c.url.split("/models/")[1])).toEqual(["gemini-2.0-flash:generateContent", "gemini-flash-latest:generateContent"]);
    await analyzePhoto(model, jpeg);
    expect(calls).toHaveLength(3);
    expect(calls[2].url).toContain("gemini-flash-latest");
  });

  it("legacy 2.x models get temperature instead of a thinking level", async () => {
    const { calls, model } = sdkModel("gemini-2.5-flash", () => reply(200, candidate(JSON.stringify(ok))));
    await analyzePhoto(model, jpeg);
    expect(calls[0].body.generationConfig.thinkingConfig).toBeUndefined();
    expect(calls[0].body.generationConfig.temperature).toBe(0.2);
  });

  it("retries once without thinking settings if the model rejects them", async () => {
    const { calls, model } = sdkModel("gemini-x-flash", (c) =>
      c.body.generationConfig.thinkingConfig ? reply(400, apiError(400, "INVALID_ARGUMENT", "Thinking level is not supported for this model.")) : reply(200, candidate(JSON.stringify(ok))),
    );
    expect((await analyzePhoto(model, jpeg)).status).toBe("ok");
    expect(calls).toHaveLength(2);
  });

  const failures: [string, () => Response | Promise<Response>, string][] = [
    ["invalid key", () => reply(400, apiError(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.", "API_KEY_INVALID")), "auth"],
    ["permission denied", () => reply(403, apiError(403, "PERMISSION_DENIED", "Generative Language API has not been used in project")), "auth"],
    ["quota", () => reply(429, apiError(429, "RESOURCE_EXHAUSTED", "Resource has been exhausted (e.g. check quota).")), "quota"],
    ["server error", () => reply(503, apiError(503, "UNAVAILABLE", "The model is overloaded.")), "server"],
    ["schema rejected", () => reply(400, apiError(400, "INVALID_ARGUMENT", "Invalid JSON payload received.")), "bad_request"],
    ["safety block", () => reply(200, { promptFeedback: { blockReason: "SAFETY" } }), "blocked"],
    ["empty candidates", () => reply(200, { candidates: [] }), "invalid_response"],
    ["network down", () => Promise.reject(new TypeError("fetch failed")), "network"],
  ];
  for (const [label, respond, kind] of failures) {
    it(`maps ${label} to a typed, content-free failure (${kind})`, async () => {
      const { model } = sdkModel("gemini-flash-latest", respond);
      const err = await analyzePhoto(model, jpeg).catch((e) => e);
      expect(err).toBeInstanceOf(AiUnavailableError);
      expect(err.kind).toBe(kind);
      expect(err.message).not.toMatch(/test-key|API key not valid/);
      expect(photoFailureMessage(err.kind)).toMatch(/pick the type/i);
      expect(summaryFailureMessage(err.kind)).toMatch(/rule explanations/);
    });
  }

  it("all models 404 surfaces as model_unavailable after trying the fallbacks", async () => {
    const { calls, model } = sdkModel("gemini-old", () => reply(404, apiError(404, "NOT_FOUND", "not found")));
    const err = await analyzePhoto(model, jpeg).catch((e) => e);
    expect(err.kind).toBe("model_unavailable");
    expect(calls.length).toBeGreaterThan(1);
  });

  it("times out instead of hanging", async () => {
    const { model } = sdkModel("gemini-flash-latest", () => new Promise<Response>(() => {}));
    const fake: JsonModel = { name: model.name, generateJson: (a) => model.generateJson({ ...a, timeoutMs: 50 }) };
    const stub = vi.mocked(globalThis.fetch);
    stub.mockImplementation((_u, init) => new Promise((_, rej) => init?.signal?.addEventListener("abort", () => rej(init.signal!.reason))));
    const err = await analyzePhoto(fake, jpeg).catch((e) => e);
    expect(err).toBeInstanceOf(AiUnavailableError);
    expect(err.kind).toBe("timeout");
  });

  it("malformed JSON from the model becomes 'pick it yourself', not a crash or a fake estimate", async () => {
    const { model } = sdkModel("gemini-flash-latest", () => reply(200, candidate("{\"subject\": \"stool\", ")));
    const r = await analyzePhoto(model, jpeg);
    expect(r.status).toBe("unclassifiable");
    expect(r.result.estimatedType).toBeNull();
    expect(r.result.simulated).toBe(false);
  });

  it("care summary goes through the same path and validates citations", async () => {
    const now = new Date("2026-10-17T16:00:00Z");
    const es = [entry({ id: "a", occurredAt: ago(now, 5), bristolType: 7 }), entry({ id: "b", occurredAt: ago(now, 3), bristolType: 7 }), entry({ id: "c", occurredAt: ago(now, 1), bristolType: 7 })];
    const flags = evaluateRules(es, now, "America/Toronto").flags;
    const answer = { overview: "Three loose entries today.", flags: [{ flag_key: flags[0].key, explanation: "Entries a and b.", cited_entry_ids: ["a", "b"], suggested_follow_up: "Check hydration." }], questions_to_ask: ["Any fever?"] };
    const { calls, model } = sdkModel("gemini-flash-latest", () => reply(200, candidate(JSON.stringify(answer))));
    const d = await draftCareSummary(model, { patientName: "P", flags, entries: es, timeZone: "America/Toronto" }, now);
    expect(d.flags).toHaveLength(1);
    expect(d.model).toBe("gemini-flash-latest");
    expect(calls[0].body.contents[0].parts[0].text).toContain(flags[0].key);
  });

  it("classifies abort and unknown errors", () => {
    expect(classifyAiError(new DOMException("aborted", "AbortError")).kind).toBe("timeout");
    expect(classifyAiError(new Error("weird")).kind).toBe("server");
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
