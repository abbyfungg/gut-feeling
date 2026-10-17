import { deleteEntry } from "@/lib/records";
import { json, withApi } from "@/lib/session";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withApi(req, { role: "patient" }, (user) => {
    deleteEntry(user, id);
    return json({ ok: true });
  });
}
