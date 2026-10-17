import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getConfig } from "./config";
import { SESSION_COOKIE, getUserBySessionToken, type User } from "./auth";
import type { Role } from "./domain";
import { AccessError, InputError } from "./records";
import { ensureSeeded } from "./seed";

export async function currentUser(): Promise<User | null> {
  ensureSeeded();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getUserBySessionToken(token);
}

/** For pages: redirect to sign-in (or to the right home) when the role doesn't match. */
export async function requirePage(role: Role): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (user.role !== role) redirect(user.role === "patient" ? "/me" : "/care");
  return user;
}

export function sessionCookieOptions(expires: Date) {
  return { httpOnly: true, sameSite: "lax" as const, secure: getConfig().isProduction, path: "/", expires };
}

/**
 * Wraps an API route: checks same-origin for state-changing requests, requires a session,
 * and turns access/input errors into JSON responses without leaking details.
 */
export async function withApi(
  req: Request,
  opts: { role?: Role },
  fn: (user: User) => Promise<Response> | Response,
): Promise<Response> {
  try {
    if (req.method !== "GET" && !(await sameOrigin(req))) return json({ error: "Cross-site request blocked" }, 403);
    const user = await currentUser();
    if (!user) return json({ error: "Please sign in" }, 401);
    if (opts.role && user.role !== opts.role) return json({ error: "Not allowed" }, 403);
    return await fn(user);
  } catch (e) {
    return errorResponse(e);
  }
}

export function errorResponse(e: unknown): Response {
  if (e instanceof AccessError) return json({ error: e.status === 404 ? "Not found" : e.message }, e.status);
  if (e instanceof InputError) return json({ error: e.message }, 400);
  console.error("[api] unexpected error:", e instanceof Error ? e.name + ": " + e.message : "unknown");
  return json({ error: "Something went wrong on our side. Please try again." }, 500);
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function sameOrigin(req: Request): Promise<boolean> {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
