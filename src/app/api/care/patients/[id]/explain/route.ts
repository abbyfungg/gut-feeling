import { AiUnavailableError, explainFlag, getGeminiModel, logAiFailure } from "@/lib/ai/gemini";
import { rateLimit } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { getPatientOverview } from "@/lib/records";
import { json, withApi } from "@/lib/session";

/** Gemini explains, for the clinician, why one rule-based flag fired. Draft only; nothing is stored. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withApi(req, { role: "practitioner" }, async (user) => {
    const overview = getPatientOverview(user, id);
    const body = (await req.json().catch(() => ({}))) as { flagKey?: string };
    const flag = overview.flags.find((f) => f.key === body.flagKey);
    if (!flag) return json({ error: "That flag isn't on this patient's record." }, 404);
    const model = getGeminiModel();
    if (!model) return json({ status: "unconfigured", message: "Gemini isn't configured on this server. The rule, evidence and baseline above explain the flag on their own." }, 503);
    if (!rateLimit(`explain:${user.id}`, 60, 60 * 60_000)) return json({ error: "Too many explanations this hour." }, 429);
    const started = Date.now();
    try {
      const explanation = await explainFlag(model, { flag, entries: overview.entries, timeZone: getConfig().timezone });
      return json({ status: "ok", explanation });
    } catch (e) {
      if (e instanceof AiUnavailableError) {
        logAiFailure("explain", model.name, e, Date.now() - started);
        const message =
          e.kind === "auth"
            ? "Gemini rejected this server's API key, so there's no explanation. The rule and evidence above stand on their own."
            : e.kind === "quota"
              ? "Gemini's rate limit was reached. Try again in a minute."
              : e.kind === "timeout"
                ? "Gemini took too long to answer. Try again."
                : "Gemini couldn't explain this one just now. The rule and evidence above stand on their own.";
        return json({ status: "failed", reason: e.kind, message }, e.kind === "timeout" ? 504 : e.kind === "quota" ? 429 : 502);
      }
      throw e;
    }
  });
}
