import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzePhoto, AiUnavailableError, getGeminiModel, logAiFailure, photoFailureMessage } from "@/lib/ai/gemini";
import { validateImageUpload } from "@/lib/ai/upload";
import { rateLimit } from "@/lib/auth";
import { saveAiDraft } from "@/lib/records";
import { json, withApi } from "@/lib/session";

const SAMPLES = new Set(["type-1", "type-2", "type-3", "type-4", "type-5", "type-6", "type-7"]);

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
    // Demo: a named sample illustration from /public/samples is read on the server, so nothing is uploaded.
    const sample = form?.get("sample");
    let buf: Uint8Array;
    if (typeof sample === "string" && sample) {
      if (!SAMPLES.has(sample)) return json({ error: "Unknown sample." }, 400);
      buf = new Uint8Array(await readFile(path.join(process.cwd(), "public", "samples", `${sample}.jpg`)));
    } else {
      const file = form?.get("photo");
      if (!file || typeof file === "string") return json({ error: "Attach a photo to analyse." }, 400);
      if (file.size > 6 * 1024 * 1024) return json({ error: "That photo is over 6 MB. Try a smaller one." }, 400);
      buf = new Uint8Array(await file.arrayBuffer());
    }
    const check = validateImageUpload(buf);
    if (!check.ok) return json({ error: check.error }, 400);

    const started = Date.now();
    try {
      const analysis = await analyzePhoto(model, { mime: check.mime, data: buf }, new Date(), { sampleIllustration: typeof sample === "string" && !!sample });
      const analysisId = analysis.status === "ok" || analysis.result.estimatedType != null ? saveAiDraft(user, analysis.result) : null;
      return json({ ...analysis, analysisId });
    } catch (e) {
      if (e instanceof AiUnavailableError) {
        logAiFailure("photo", model.name, e, Date.now() - started);
        return json({ status: "failed", reason: e.kind, message: photoFailureMessage(e.kind) }, e.kind === "timeout" ? 504 : e.kind === "quota" ? 429 : 502);
      }
      throw e;
    }
  });
}
