import "server-only";
import type { User } from "../auth";
import { rateLimit } from "../auth";
import { getConfig } from "../config";
import { fluidBlocks } from "../fluids";
import { listEntries } from "../records";
import { json } from "../session";
import { addDays, localDay } from "../time";
import { AiUnavailableError, getGeminiModel, logAiFailure } from "./gemini";
import { draftWaterInsight } from "./water";

/** Shared by the patient's Water screen and the care profile. Checks access, sends the last week of water and two weeks of entries. */
export async function waterInsightResponse(viewer: User, patientId: string) {
  const tz = getConfig().timezone;
  const now = new Date();
  const entries = listEntries(viewer, patientId); // access check
  const model = getGeminiModel();
  if (!model) return json({ status: "unconfigured", message: "Gemini isn't switched on for this server, so there's no AI read. The water chart is complete on its own." }, 503);
  if (!rateLimit(`water-insight:${viewer.id}`, 30, 60 * 60_000)) return json({ error: "That's a lot of AI reads for one hour. Try again a bit later." }, 429);
  const fluids = fluidBlocks(patientId, tz, now, 7);
  const since = addDays(localDay(now, tz), -13);
  const recent = entries.filter((e) => localDay(e.occurredAt, tz) >= since && new Date(e.occurredAt) <= now).slice(0, 80);
  if (!fluids.length) return json({ status: "too_few", message: "There's no water logged this week yet. Add a glass or take a few sips first." }, 200);
  if (recent.length < 2) return json({ status: "too_few", message: "Gemini needs at least two diary entries from the last two weeks to compare with your water." }, 200);
  const started = Date.now();
  try {
    const insight = await draftWaterInsight(model, { fluids, entries: recent, timeZone: tz }, now);
    return json({ status: "ok", insight });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      logAiFailure("water", model.name, e, Date.now() - started);
      const message =
        e.kind === "quota"
          ? "Gemini is busy right now. Try again in a minute."
          : e.kind === "timeout"
            ? "Gemini took too long to answer. Try again."
            : e.kind === "auth"
              ? "Gemini rejected this server's API key, so there's no AI read. The water chart is complete on its own."
              : "Gemini couldn't give a read just now. The water chart is complete on its own.";
      return json({ status: "failed", reason: e.kind, message }, e.kind === "timeout" ? 504 : e.kind === "quota" ? 429 : 502);
    }
    throw e;
  }
}
