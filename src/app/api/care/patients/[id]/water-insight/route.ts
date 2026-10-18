import { waterInsightResponse } from "@/lib/ai/waterInsightResponse";
import { withApi } from "@/lib/session";

/** Gemini relates a patient's water to their stool pattern, for the care team. Draft only; nothing is stored. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withApi(req, { role: "practitioner" }, (user) => waterInsightResponse(user, id));
}
