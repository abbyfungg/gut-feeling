import { setSharing } from "@/lib/records";
import { json, withApi } from "@/lib/session";
import { shareInputSchema } from "@/lib/validation";

export async function PUT(req: Request) {
  return withApi(req, { role: "patient" }, async (user) => {
    const parsed = shareInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    setSharing(user, parsed.data.practitionerId, parsed.data.active);
    return json({ ok: true });
  });
}
