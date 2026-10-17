// Lists the Gemini models your GEMINI_API_KEY can use for generateContent, and checks GEMINI_MODEL.
// Usage: GEMINI_API_KEY=... node scripts/check-gemini.mjs   (or put it in .env.local and use `node --env-file=.env.local scripts/check-gemini.mjs`)
import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY is not set. The app still works; photo help and AI drafts stay off.");
  process.exit(1);
}
const want = process.env.GEMINI_MODEL || "gemini-flash-latest";
const ai = new GoogleGenAI({ apiKey: key });
const names = [];
const pager = await ai.models.list();
for await (const m of pager) {
  if (m.supportedActions?.includes("generateContent")) names.push(m.name.replace(/^models\//, ""));
}
console.log("Models supporting generateContent:\n  " + names.filter((n) => n.includes("flash") || n.includes("pro")).join("\n  "));
console.log(`\nGEMINI_MODEL=${want} ${names.includes(want) ? "is available ✓" : "was not in the list (aliases are not always listed; the test call below is the real check)."}`);
const res = await ai.models.generateContent({ model: want, contents: "Reply with the single word: ok" });
console.log("Test call reply:", JSON.stringify(res.text?.trim()));
