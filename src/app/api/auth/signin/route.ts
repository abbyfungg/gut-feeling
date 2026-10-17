import { cookies } from "next/headers";
import { authenticate, createSession, rateLimit, SESSION_COOKIE } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { errorResponse, json, sameOrigin, sessionCookieOptions } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    if (!(await sameOrigin(req))) return json({ error: "Cross-site request blocked" }, 403);
    ensureSeeded();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!rateLimit(`signin:${ip}`, 20)) return json({ error: "Too many attempts. Take a breather and try again in a few minutes." }, 429);
    const parsed = loginSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Enter your email and password." }, 400);
    const user = authenticate(parsed.data.email, parsed.data.password);
    if (!user) return json({ error: "That email and password don't match." }, 401);
    const { token, expiresAt } = createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return json({ ok: true, role: user.role, redirect: user.role === "patient" ? "/me" : "/care" });
  } catch (e) {
    return errorResponse(e);
  }
}
