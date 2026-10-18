import "server-only";
import crypto from "node:crypto";
import type { User } from "./auth";
import { newId } from "./auth";
import { getDb } from "./db";
import { AccessError } from "./records";

/** Device pairing for the water bottle: an Arduino that counts sips and posts them with its own token. */

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function assertPatient(viewer: User) {
  if (viewer.role !== "patient") throw new AccessError("Only patients can pair a device", 403);
}

// ---------- pairing ----------

/** Creates a new device token (replacing any earlier one). The plain token is returned once and never stored. */
export function createDeviceToken(viewer: User, now = new Date()): string {
  assertPatient(viewer);
  const token = `gfd_${crypto.randomBytes(24).toString("base64url")}`;
  const db = getDb();
  db.prepare("UPDATE device_tokens SET revoked_at = ? WHERE patient_id = ? AND revoked_at IS NULL").run(now.toISOString(), viewer.id);
  db.prepare("INSERT INTO device_tokens (id, patient_id, token_hash, created_at) VALUES (?, ?, ?, ?)").run(
    newId("dt"),
    viewer.id,
    hashToken(token),
    now.toISOString(),
  );
  return token;
}

export function revokeDeviceTokens(viewer: User, now = new Date()) {
  assertPatient(viewer);
  getDb().prepare("UPDATE device_tokens SET revoked_at = ? WHERE patient_id = ? AND revoked_at IS NULL").run(now.toISOString(), viewer.id);
}

export function getPairing(viewer: User): { paired: boolean; pairedAt: string | null; lastSeenAt: string | null } {
  const row = getDb()
    .prepare("SELECT created_at, last_seen_at FROM device_tokens WHERE patient_id = ? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1")
    .get(viewer.id) as { created_at: string; last_seen_at: string | null } | undefined;
  return { paired: !!row, pairedAt: row?.created_at ?? null, lastSeenAt: row?.last_seen_at ?? null };
}

/** Looks up the patient for a device token. Returns null for unknown or revoked tokens. */
export function patientForDeviceToken(token: string | null | undefined, now = new Date()): string | null {
  return deviceForToken(token, now)?.patientId ?? null;
}

/** The paired device (its token row id and patient) for a token, or null. Marks it as seen. */
export function deviceForToken(token: string | null | undefined, now = new Date()): { tokenId: string; patientId: string } | null {
  if (!token || !/^gfd_[A-Za-z0-9_-]{20,60}$/.test(token)) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT id, patient_id FROM device_tokens WHERE token_hash = ? AND revoked_at IS NULL")
    .get(hashToken(token)) as { id: string; patient_id: string } | undefined;
  if (!row) return null;
  db.prepare("UPDATE device_tokens SET last_seen_at = ? WHERE id = ?").run(now.toISOString(), row.id);
  return { tokenId: row.id, patientId: row.patient_id };
}
