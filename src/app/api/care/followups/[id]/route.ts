import { completeFollowUp } from "@/lib/records";
import { json, withApi } from "@/lib/session";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withApi(req, { role: "practitioner" }, (user) => json({ review: completeFollowUp(user, id) }));
}
