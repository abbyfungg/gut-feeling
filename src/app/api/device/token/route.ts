import { headers } from "next/headers";
import { createDeviceToken, revokeDeviceTokens } from "@/lib/device";
import { json, withApi } from "@/lib/session";

/** Pair a water bottle: returns the token once, plus the address the Arduino should send to. */
export async function POST(req: Request) {
  return withApi(req, { role: "patient" }, async (user) => {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return json({ token: createDeviceToken(user), host, secure: proto === "https", path: "/api/device/ingest" }, 201);
  });
}

export async function DELETE(req: Request) {
  return withApi(req, { role: "patient" }, (user) => {
    revokeDeviceTokens(user);
    return json({ ok: true });
  });
}
