import { createReview } from "@/lib/records";
import { json, withApi } from "@/lib/session";
import { reviewInputSchema } from "@/lib/validation";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withApi(req, { role: "practitioner" }, async (user) => {
    const parsed = reviewInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Choose a decision before saving." }, 400);
    return json({ review: createReview(user, id, parsed.data) }, 201);
  });
}
