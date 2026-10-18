import { getPairing } from "@/lib/device";
import { addHydration, hydrationInputSchema, hydrationSummary, removeHydration } from "@/lib/hydration";
import { json, withApi } from "@/lib/session";

export async function GET(req: Request) {
  return withApi(req, { role: "patient" }, (user) => json({ today: hydrationSummary(user, user.id), pairing: getPairing(user) }));
}

/** A glass the person adds themselves, or a sip from the in-app simulator (recorded as simulated). */
export async function POST(req: Request) {
  return withApi(req, { role: "patient" }, async (user) => {
    const parsed = hydrationInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "That amount didn't look right." }, 400);
    const id = addHydration(user, parsed.data);
    return json({ today: hydrationSummary(user, user.id), id }, 201);
  });
}

/** Undo one glass or simulated sip the person added (by id). */
export async function DELETE(req: Request) {
  return withApi(req, { role: "patient" }, (user) => {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!/^hy_[A-Za-z0-9_-]{4,64}$/.test(id) || !removeHydration(user, id)) return json({ error: "That one can't be undone." }, 404);
    return json({ today: hydrationSummary(user, user.id) });
  });
}
