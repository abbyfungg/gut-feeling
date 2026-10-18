import { attachSession, getOwnSession } from "@/lib/device";
import { createEntry, InputError, listEntries } from "@/lib/records";
import { json, withApi } from "@/lib/session";
import { entryInputSchema } from "@/lib/validation";

export async function GET(req: Request) {
  return withApi(req, { role: "patient" }, (user) => json({ entries: listEntries(user, user.id) }));
}

export async function POST(req: Request) {
  return withApi(req, { role: "patient" }, async (user) => {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    // Optional squeeze-ball session to attach; kept out of the entry schema itself.
    const { deviceSessionId, ...rest } = raw ?? {};
    if (deviceSessionId != null && (typeof deviceSessionId !== "string" || deviceSessionId.length > 80)) {
      return json({ error: "Some of that didn't look right. Check the form and try again." }, 400);
    }
    const parsed = entryInputSchema.safeParse(rest);
    if (!parsed.success) return json({ error: "Some of that didn't look right. Check the form and try again." }, 400);
    if (deviceSessionId) {
      const s = getOwnSession(user, deviceSessionId);
      if (s.status === "attached" || s.status === "dismissed") throw new InputError("That squeeze session was already logged or discarded.");
    }
    const entry = createEntry(user, parsed.data);
    if (deviceSessionId) attachSession(user, deviceSessionId, entry.id);
    return json({ entry }, 201);
  });
}
