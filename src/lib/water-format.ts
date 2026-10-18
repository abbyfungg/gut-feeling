/** "230 ml" under a litre, "1.25 L" from a litre up, so a single 30 ml sip always changes the number. */
export function formatWater(ml: number): { value: string; unit: "ml" | "L"; text: string } {
  const n = Math.max(0, Math.round(ml));
  if (n < 1000) return { value: String(n), unit: "ml", text: `${n} ml` };
  const l = (n / 1000).toFixed(2);
  return { value: l, unit: "L", text: `${l} L` };
}

export type PairingState = "none" | "waiting" | "online" | "offline";

/** Online = the bottle talked to the app in the last 10 minutes (it checks in every 5). */
export const ONLINE_MS = 10 * 60_000;

export function pairingState(p: { paired: boolean; lastSeenAt: string | null }, now = Date.now()): PairingState {
  if (!p.paired) return "none";
  if (!p.lastSeenAt) return "waiting";
  return now - new Date(p.lastSeenAt).getTime() < ONLINE_MS ? "online" : "offline";
}
