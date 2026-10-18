import { getPairing } from "@/lib/device";
import { addHydration, hydrationInputSchema, hydrationSummary } from "@/lib/hydration";
import { json, withApi } from "@/lib/session";

export async function GET(req: Request) {
  return withApi(req, { role: "patient" }, (user) => json({ today: hydrationSummary(user, user.id), pairing: getPairing(user) }));
}

/** A glass the person adds themselves, or a sip from the in-app simulator (recorded as simulated). */
export async function POST(req: Request) {
  return withApi(req, { role: "patient" }, async (user) => {
    const parsed = hydrationInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "That amount didn't look right." }, 400);
    addHydration(user, parsed.data);
    return json({ today: hydrationSummary(user, user.id) }, 201);
  });
}
