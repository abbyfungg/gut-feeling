import { listEntries } from "@/lib/records";
import { json, withApi } from "@/lib/session";

/** Read a patient's entries. Allowed for the patient themselves or a practitioner they share with. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withApi(req, {}, (user) => json({ entries: listEntries(user, id) }));
}
