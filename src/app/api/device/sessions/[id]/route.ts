import { dismissSession } from "@/lib/device";
import { json, withApi } from "@/lib/session";

/** Discard a squeeze session instead of logging it. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withApi(req, { role: "patient" }, (user) => {
    dismissSession(user, id);
    return json({ ok: true });
  });
}
