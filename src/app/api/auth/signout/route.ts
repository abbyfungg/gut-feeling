import { cookies } from "next/headers";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth";
import { errorResponse, json, sameOrigin } from "@/lib/session";

export async function POST(req: Request) {
  try {
    if (!(await sameOrigin(req))) return json({ error: "Cross-site request blocked" }, 403);
    const store = await cookies();
    deleteSession(store.get(SESSION_COOKIE)?.value);
    store.delete(SESSION_COOKIE);
    return json({ ok: true, redirect: "/" });
  } catch (e) {
    return errorResponse(e);
  }
}
