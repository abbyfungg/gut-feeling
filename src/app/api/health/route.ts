import { getConfig, isGeminiConfigured } from "@/lib/config";
import { getDb } from "@/lib/db";

export async function GET() {
  getDb().prepare("SELECT 1").get();
  return Response.json({ ok: true, ai: isGeminiConfigured() ? "configured" : "unconfigured", aiModel: isGeminiConfigured() ? getConfig().geminiModel : null });
}
