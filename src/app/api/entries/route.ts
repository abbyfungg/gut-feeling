import { createEntry, listEntries } from "@/lib/records";
import { json, withApi } from "@/lib/session";
import { entryInputSchema } from "@/lib/validation";

export async function GET(req: Request) {
  return withApi(req, { role: "patient" }, (user) => json({ entries: listEntries(user, user.id) }));
}

export async function POST(req: Request) {
  return withApi(req, { role: "patient" }, async (user) => {
    const parsed = entryInputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Some of that didn't look right. Check the form and try again." }, 400);
    const entry = createEntry(user, parsed.data);
    return json({ entry }, 201);
  });
}
