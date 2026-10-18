import { deviceIngestSchema, ingestReadings } from "@/lib/device";
import { json, withApi } from "@/lib/session";

/** The in-app simulator: same pipeline as the real ball, but recorded as "simulated". */
export async function POST(req: Request) {
  return withApi(req, { role: "patient" }, async (user) => {
    const parsed = deviceIngestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Bad reading format" }, 400);
    return json({ session: ingestReadings(user.id, "simulated", parsed.data) });
  });
}
