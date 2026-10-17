import { cookies } from "next/headers";
import { createSession, createUser, emailExists, rateLimit, SESSION_COOKIE } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { errorResponse, json, sameOrigin, sessionCookieOptions } from "@/lib/session";
import { signupSchema } from "@/lib/validation";

/** Self sign-up creates patient accounts only. Care-team accounts are provisioned, not self-registered. */
export async function POST(req: Request) {
  try {
    if (!(await sameOrigin(req))) return json({ error: "Cross-site request blocked" }, 403);
    ensureSeeded();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!rateLimit(`signup:${ip}`, 10)) return json({ error: "Too many sign-ups from here. Try again later." }, 429);
    const parsed = signupSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Check the form and try again." }, 400);
    if (emailExists(parsed.data.email)) return json({ error: "There's already an account with that email." }, 409);
    const user = createUser({ ...parsed.data, role: "patient" });
    const { token, expiresAt } = createSession(user.id);
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return json({ ok: true, redirect: "/me?welcome=1" });
  } catch (e) {
    return errorResponse(e);
  }
}
