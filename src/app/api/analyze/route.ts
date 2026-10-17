import { analyzePhoto, AiUnavailableError, getGeminiModel } from "@/lib/ai/gemini";
import { validateImageUpload } from "@/lib/ai/upload";
import { rateLimit } from "@/lib/auth";
import { saveAiDraft } from "@/lib/records";
import { json, withApi } from "@/lib/session";

/**
 * Photo → structured estimate. The photo is held in memory for the request only and never written
 * to disk or the database. Only the structured result is kept (short-lived) so the entry can cite it.
 */
export async function POST(req: Request) {
  return withApi(req, { role: "patient" }, async (user) => {
    const model = getGeminiModel();
    if (!model) return json({ status: "unconfigured", message: "Photo help isn't switched on here. Pick the type that looks closest; that works just as well." }, 503);
    if (!rateLimit(`analyze:${user.id}`, 30, 60 * 60_000)) return json({ error: "That's a lot of photos for one hour. Try again a bit later." }, 429);

    const form = await req.formData().catch(() => null);
    const file = form?.get("photo");
    if (!file || typeof file === "string") return json({ error: "Attach a photo to analyse." }, 400);
    if (file.size > 6 * 1024 * 1024) return json({ error: "That photo is over 6 MB. Try a smaller one." }, 400);
    const buf = new Uint8Array(await file.arrayBuffer());
    const check = validateImageUpload(buf);
    if (!check.ok) return json({ error: check.error }, 400);

    try {
      const analysis = await analyzePhoto(model, { mime: check.mime, data: buf });
      const analysisId = analysis.status === "ok" || analysis.result.estimatedType != null ? saveAiDraft(user, analysis.result) : null;
      return json({ ...analysis, analysisId });
    } catch (e) {
      if (e instanceof AiUnavailableError) {
        console.warn("[analyze] model call failed");
        return json({ status: "failed", message: "Photo help is having a moment. Pick the type that looks closest instead." }, 502);
      }
      throw e;
    }
  });
}
