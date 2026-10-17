import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { deleteAccount } from "@/lib/records";
import { json, withApi } from "@/lib/session";

/** Permanently deletes the signed-in patient's account, entries, sharing and reviews. */
export async function DELETE(req: Request) {
  return withApi(req, { role: "patient" }, async (user) => {
    const body = (await req.json().catch(() => null)) as { confirm?: string } | null;
    if (body?.confirm !== "DELETE") return json({ error: 'Type DELETE to confirm.' }, 400);
    deleteAccount(user);
    (await cookies()).delete(SESSION_COOKIE);
    return json({ ok: true, redirect: "/" });
  });
}
