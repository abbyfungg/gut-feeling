import { waterInsightResponse } from "@/lib/ai/waterInsightResponse";
import { withApi } from "@/lib/session";

/** "Ask Gemini about my water": the patient's own water and diary. Nothing is stored. */
export async function POST(req: Request) {
  return withApi(req, { role: "patient" }, (user) => waterInsightResponse(user, user.id));
}
