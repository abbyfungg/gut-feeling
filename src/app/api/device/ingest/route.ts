import { rateLimit } from "@/lib/auth";
import { patientForDeviceToken } from "@/lib/device";
import { bottleIngestSchema, recordBottleSips } from "@/lib/hydration";
import { ensureSeeded } from "@/lib/seed";
import { errorResponse, json } from "@/lib/session";

/**
 * Sips from the water bottle. The Arduino has no browser session, so it authenticates with the
 * device token from pairing (Authorization: Bearer gfd_...). The token can only add water to the diary.
 */
export async function POST(req: Request) {
  try {
    ensureSeeded();
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
    if (!token) return json({ error: "Not allowed" }, 401);
    if (!rateLimit(`device:${token.slice(-16)}`, 600)) return json({ error: "Too many requests" }, 429);
    const patientId = patientForDeviceToken(token);
    if (!patientId) return json({ error: "Unknown or unpaired device. Pair it again in the app." }, 401);
    const text = await req.text();
    if (text.length > 1000) return json({ error: "Too much data" }, 413);
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {}
    const parsed = bottleIngestSchema.safeParse(body);
    if (!parsed.success) return json({ error: "Bad format" }, 400);
    recordBottleSips(patientId, parsed.data);
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
