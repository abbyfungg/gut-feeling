import path from "node:path";

/** Gemini alias that always points at the current Flash release, so a model shutdown doesn't silently break AI features. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

/** Dashboard pastes often carry stray whitespace or quotes, which the API rejects as an invalid key. */
function cleanSecret(v: string | undefined): string {
  return (v ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
}

/** Server-side configuration read from environment variables. Never import this from client components. */
export function getConfig() {
  return {
    dataDir: process.env.DATA_DIR || path.join(process.cwd(), "data"),
    seedDemoData: (process.env.SEED_DEMO_DATA ?? "true").toLowerCase() !== "false",
    timezone: process.env.APP_TIMEZONE || "America/Toronto",
    geminiApiKey: cleanSecret(process.env.GEMINI_API_KEY) || cleanSecret(process.env.GOOGLE_API_KEY),
    geminiModel: process.env.GEMINI_MODEL?.trim().replace(/^models\//, "") || DEFAULT_GEMINI_MODEL,
    isProduction: process.env.NODE_ENV === "production",
    /** Secure cookies need HTTPS. Defaults to on in production; set COOKIE_SECURE=false only for plain-HTTP testing. */
    cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
  };
}

export function isGeminiConfigured(): boolean {
  return getConfig().geminiApiKey.length > 0;
}
