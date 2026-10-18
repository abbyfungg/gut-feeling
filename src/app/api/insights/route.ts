import { AiUnavailableError, draftPatientInsight, getGeminiModel, logAiFailure } from "@/lib/ai/gemini";
import { rateLimit } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { listEntries } from "@/lib/records";
import { json, withApi } from "@/lib/session";
import { addDays, localDay } from "@/lib/time";

/** Gemini reads the person's own recent entries and describes patterns in plain language. Nothing is stored. */
export async function POST(req: Request) {
  return withApi(req, { role: "patient" }, async (user) => {
    const model = getGeminiModel();
    if (!model) return json({ status: "unconfigured", message: "Gemini isn't switched on for this server, so there's no AI read. Your charts above are complete on their own." }, 503);
    if (!rateLimit(`insight:${user.id}`, 20, 60 * 60_000)) return json({ error: "That's a lot of AI reads for one hour. Try again a bit later." }, 429);
    const body = (await req.json().catch(() => ({}))) as { days?: number };
    const days = [7, 30, 90].includes(Number(body.days)) ? Number(body.days) : 30;
    const tz = getConfig().timezone;
    const since = addDays(localDay(new Date(), tz), -(days - 1));
    const entries = listEntries(user, user.id).filter((e) => localDay(e.occurredAt, tz) >= since).slice(0, 120);
    if (entries.length < 3) return json({ status: "too_few", message: "Gemini needs at least three entries in this range to say anything useful." }, 200);
    const started = Date.now();
    try {
      const insight = await draftPatientInsight(model, { entries, timeZone: tz, days });
      return json({ status: "ok", insight });
    } catch (e) {
      if (e instanceof AiUnavailableError) {
        logAiFailure("insight", model.name, e, Date.now() - started);
        const message =
          e.kind === "quota"
            ? "Gemini is busy right now. Try again in a minute."
            : e.kind === "timeout"
              ? "Gemini took too long to answer. Try again."
              : e.kind === "auth"
                ? "Gemini rejected this server's API key, so there's no AI read. Your charts above are complete on their own."
                : "Gemini couldn't give a read just now. Your charts above are complete on their own.";
        return json({ status: "failed", reason: e.kind, message }, e.kind === "timeout" ? 504 : e.kind === "quota" ? 429 : 502);
      }
      throw e;
    }
  });
}
