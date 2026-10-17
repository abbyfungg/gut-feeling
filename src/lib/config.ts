import path from "node:path";

/** Server-side configuration read from environment variables. Never import this from client components. */
export function getConfig() {
  return {
    dataDir: process.env.DATA_DIR || path.join(process.cwd(), "data"),
    seedDemoData: (process.env.SEED_DEMO_DATA ?? "true").toLowerCase() !== "false",
    timezone: process.env.APP_TIMEZONE || "America/Toronto",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
    isProduction: process.env.NODE_ENV === "production",
    /** Secure cookies need HTTPS. Defaults to on in production; set COOKIE_SECURE=false only for plain-HTTP testing. */
    cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
  };
}

export function isGeminiConfigured(): boolean {
  return getConfig().geminiApiKey.length > 0;
}
