import { AiUnavailableError, draftCareSummary, getGeminiModel, logAiFailure, summaryFailureMessage } from "@/lib/ai/gemini";
import { rateLimit } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getPatientOverview } from "@/lib/records";
import { json, withApi } from "@/lib/session";

/** Gemini drafts an evidence-cited summary of the deterministic flags. It is a draft for the clinician only. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withApi(req, { role: "practitioner" }, async (user) => {
    const overview = getPatientOverview(user, id);
    const model = getGeminiModel();
    if (!model) return json({ status: "unconfigured", message: "Gemini isn't configured on this server, so no AI draft is available. The rule explanations above are complete on their own." }, 503);
    if (!rateLimit(`summary:${user.id}`, 40, 60 * 60_000)) return json({ error: "Too many drafts this hour." }, 429);
    const active = overview.flags.filter((f) => f.status !== "reviewed");
    const started = Date.now();
    try {
      const draft = await draftCareSummary(model, { patientName: overview.patient.name, flags: active.length ? active : overview.flags, entries: overview.entries, timeZone: getConfig().timezone });
      return json({ status: "ok", draft });
    } catch (e) {
      if (e instanceof AiUnavailableError) {
        logAiFailure("summary", model.name, e, Date.now() - started);
        return json({ status: "failed", reason: e.kind, message: summaryFailureMessage(e.kind) }, e.kind === "timeout" ? 504 : e.kind === "quota" ? 429 : 502);
      }
      throw e;
    }
  });
}
