// Lists the Gemini models your GEMINI_API_KEY can use for generateContent, and checks GEMINI_MODEL.
// Usage: GEMINI_API_KEY=... node scripts/check-gemini.mjs   (or put it in .env.local and use `node --env-file=.env.local scripts/check-gemini.mjs`)
import { GoogleGenAI } from "@google/genai";

const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim().replace(/^(["'])(.*)\1$/, "$2");
if (!key) {
  console.error("GEMINI_API_KEY is not set. The app still works; photo help and AI drafts stay off.");
  process.exit(1);
}
const want = process.env.GEMINI_MODEL || "gemini-flash-latest";
const ai = new GoogleGenAI({ apiKey: key });
const names = [];
try {
  const pager = await ai.models.list();
  for await (const m of pager) {
    if (m.supportedActions?.includes("generateContent")) names.push(m.name.replace(/^models\//, ""));
  }
} catch (e) {
  console.error(`Listing models failed (HTTP ${e?.status ?? "?"}). The key was probably rejected: use a Gemini API key from Google AI Studio, with no quotes or spaces.`);
  process.exit(1);
}
console.log("Models supporting generateContent:\n  " + names.filter((n) => n.includes("flash") || n.includes("pro")).join("\n  "));
console.log(`\nGEMINI_MODEL=${want} ${names.includes(want) ? "is available ✓" : "was not in the list (aliases are not always listed; the test call below is the real check)."}`);
try {
  // Same shape the app sends: JSON mode + schema with a nullable integer.
  const res = await ai.models.generateContent({
    model: want,
    contents: 'Return {"ok": true, "n": null}.',
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: { type: "object", properties: { ok: { type: "boolean" }, n: { type: ["integer", "null"], minimum: 1, maximum: 7 } }, required: ["ok", "n"] },
      ...(/^gemini-(1|2)\./.test(want) ? {} : { thinkingConfig: { thinkingLevel: "LOW" } }),
    },
  });
  console.log("Structured test call reply:", JSON.stringify(res.text?.trim()));
} catch (e) {
  console.error(`Test call failed (HTTP ${e?.status ?? "?"}). ${e?.status === 404 ? "Try GEMINI_MODEL=gemini-flash-latest." : e?.status === 400 || e?.status === 403 ? "Check the key is a Gemini API key from Google AI Studio." : ""}`);
  process.exit(1);
}
