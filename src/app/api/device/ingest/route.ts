import { rateLimit } from "@/lib/auth";
import { deviceIngestSchema, ingestReadings, patientForDeviceToken } from "@/lib/device";
import { ensureSeeded } from "@/lib/seed";
import { errorResponse, json } from "@/lib/session";

/**
 * Readings from the squeeze ball. The Arduino has no browser session, so it authenticates with the
 * device token from pairing (Authorization: Bearer gfd_...). The token only lets it add squeeze readings.
 */
export async function POST(req: Request) {
  try {
    ensureSeeded();
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
    if (!token || !rateLimit(`device:${token.slice(-16)}`, 2000)) return json({ error: "Not allowed" }, token ? 429 : 401);
    const patientId = patientForDeviceToken(token);
    if (!patientId) return json({ error: "Unknown or disconnected device. Pair it again in the app." }, 401);
    const text = await req.text();
    if (text.length > 4000) return json({ error: "Too much data" }, 413);
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {}
    const parsed = deviceIngestSchema.safeParse(body);
    if (!parsed.success) return json({ error: "Bad reading format" }, 400);
    const s = ingestReadings(patientId, "device", parsed.data);
    return json({ ok: true, session: s.id, status: s.status, peak: s.peakEffort });
  } catch (e) {
    return errorResponse(e);
  }
}
