import { currentSession, getPairing } from "@/lib/device";
import { json, withApi } from "@/lib/session";

export async function GET(req: Request) {
  return withApi(req, { role: "patient" }, (user) => json({ pairing: getPairing(user), session: currentSession(user) }));
}
