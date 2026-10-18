import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import type { User } from "./auth";
import { newId } from "./auth";
import { getDb } from "./db";
import { AccessError } from "./records";

/**
 * Squeeze ball: an Arduino with a pressure sensor sealed in a bag with a stress ball.
 * "Effort" is 0-100 squeeze effort relative to the person's own ball, not a clinical measure of straining.
 */

export type DeviceSource = "device" | "simulated";
export type DeviceSessionStatus = "live" | "ended" | "attached" | "dismissed";

export interface DeviceSession {
  id: string;
  source: DeviceSource;
  status: DeviceSessionStatus;
  startedAt: string;
  lastReadingAt: string;
  endedAt: string | null;
  durationMs: number;
  peakEffort: number;
  avgEffort: number;
  lastEffort: number;
  squeezes: number;
  samples: number[];
  entryId: string | null;
}

/** A live session that hasn't heard from the ball for this long is treated as finished. */
export const SESSION_IDLE_MS = 30_000;
const MAX_SAMPLES = 240;

export const deviceIngestSchema = z
  .object({
    session: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
    readings: z.array(z.number().int().min(0).max(100)).max(60).default([]),
    squeezes: z.number().int().min(0).max(100_000).optional(),
    done: z.boolean().default(false),
  })
  .strict();
export type DeviceIngest = z.infer<typeof deviceIngestSchema>;

type Row = {
  id: string;
  patient_id: string;
  source: DeviceSource;
  device_key: string;
  status: DeviceSessionStatus;
  started_at: string;
  last_reading_at: string;
  ended_at: string | null;
  peak_effort: number;
  effort_sum: number;
  reading_count: number;
  last_effort: number;
  squeezes: number;
  samples: string;
  entry_id: string | null;
};

function toSession(r: Row): DeviceSession {
  const end = r.ended_at ?? r.last_reading_at;
  return {
    id: r.id,
    source: r.source,
    status: r.status,
    startedAt: r.started_at,
    lastReadingAt: r.last_reading_at,
    endedAt: r.ended_at,
    durationMs: Math.max(0, new Date(end).getTime() - new Date(r.started_at).getTime()),
    peakEffort: r.peak_effort,
    avgEffort: r.reading_count ? Math.round(r.effort_sum / r.reading_count) : 0,
    lastEffort: r.status === "live" ? r.last_effort : 0,
    squeezes: r.squeezes,
    samples: JSON.parse(r.samples),
    entryId: r.entry_id,
  };
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function assertPatient(viewer: User) {
  if (viewer.role !== "patient") throw new AccessError("Only patients can use the squeeze ball", 403);
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
  if (!token || !/^gfd_[A-Za-z0-9_-]{20,60}$/.test(token)) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT id, patient_id FROM device_tokens WHERE token_hash = ? AND revoked_at IS NULL")
    .get(hashToken(token)) as { id: string; patient_id: string } | undefined;
  if (!row) return null;
  db.prepare("UPDATE device_tokens SET last_seen_at = ? WHERE id = ?").run(now.toISOString(), row.id);
  return row.patient_id;
}

// ---------- sessions ----------

/** Live sessions that went quiet are closed so they show up as a draft to log. */
function closeIdle(patientId: string, now: Date) {
  getDb()
    .prepare("UPDATE device_sessions SET status = 'ended', ended_at = last_reading_at WHERE patient_id = ? AND status = 'live' AND last_reading_at < ?")
    .run(patientId, new Date(now.getTime() - SESSION_IDLE_MS).toISOString());
}

/** Records a batch of readings from the ball (or the simulator) and returns the updated session. */
export function ingestReadings(patientId: string, source: DeviceSource, input: DeviceIngest, now = new Date()): DeviceSession {
  const db = getDb();
  closeIdle(patientId, now);
  const iso = now.toISOString();
  let row = db
    .prepare("SELECT * FROM device_sessions WHERE patient_id = ? AND source = ? AND device_key = ? AND status = 'live'")
    .get(patientId, source, input.session) as Row | undefined;
  if (!row) {
    if (input.readings.length === 0 && input.done) {
      throw new AccessError("No live session to finish", 404);
    }
    // A new session from the same source ends any other live one.
    db.prepare("UPDATE device_sessions SET status = 'ended', ended_at = last_reading_at WHERE patient_id = ? AND status = 'live'").run(patientId);
    const id = newId("ds");
    db.prepare(
      "INSERT INTO device_sessions (id, patient_id, source, device_key, status, started_at, last_reading_at) VALUES (?, ?, ?, ?, 'live', ?, ?)",
    ).run(id, patientId, source, input.session, iso, iso);
    row = db.prepare("SELECT * FROM device_sessions WHERE id = ?").get(id) as Row;
  }

  const samples: number[] = JSON.parse(row.samples).concat(input.readings).slice(-MAX_SAMPLES);
  const peak = Math.max(row.peak_effort, ...input.readings, 0);
  const sum = row.effort_sum + input.readings.reduce((a, b) => a + b, 0);
  const count = row.reading_count + input.readings.length;
  const last = input.readings.length ? input.readings[input.readings.length - 1] : row.last_effort;
  db.prepare(
    `UPDATE device_sessions SET last_reading_at = ?, peak_effort = ?, effort_sum = ?, reading_count = ?, last_effort = ?,
       squeezes = ?, samples = ?, status = ?, ended_at = ? WHERE id = ?`,
  ).run(
    iso,
    peak,
    sum,
    count,
    last,
    input.squeezes ?? row.squeezes,
    JSON.stringify(samples),
    input.done ? "ended" : "live",
    input.done ? iso : null,
    row.id,
  );
  return toSession(db.prepare("SELECT * FROM device_sessions WHERE id = ?").get(row.id) as Row);
}

/** The session to show right now: a live one, else the newest finished draft waiting to be logged. */
export function currentSession(viewer: User, now = new Date()): DeviceSession | null {
  assertPatient(viewer);
  closeIdle(viewer.id, now);
  const row = getDb()
    .prepare(
      "SELECT * FROM device_sessions WHERE patient_id = ? AND status IN ('live','ended') ORDER BY CASE status WHEN 'live' THEN 0 ELSE 1 END, last_reading_at DESC LIMIT 1",
    )
    .get(viewer.id) as Row | undefined;
  return row ? toSession(row) : null;
}

/** A finished session waiting to be logged (only from the last day, so old drafts don't nag). */
export function pendingSession(viewer: User, now = new Date()): DeviceSession | null {
  const s = currentSession(viewer, now);
  if (!s || s.status !== "ended") return null;
  if (now.getTime() - new Date(s.lastReadingAt).getTime() > 24 * 3_600_000) return null;
  return s;
}

export function getOwnSession(viewer: User, id: string): DeviceSession {
  assertPatient(viewer);
  const row = getDb().prepare("SELECT * FROM device_sessions WHERE id = ? AND patient_id = ?").get(id, viewer.id) as Row | undefined;
  if (!row) throw new AccessError();
  return toSession(row);
}

export function dismissSession(viewer: User, id: string) {
  const s = getOwnSession(viewer, id);
  if (s.status === "attached") throw new AccessError("Already logged", 403);
  getDb().prepare("UPDATE device_sessions SET status = 'dismissed', ended_at = COALESCE(ended_at, last_reading_at) WHERE id = ?").run(id);
}

/** Attaches a finished (or live) session to an entry the patient just saved. */
export function attachSession(viewer: User, sessionId: string, entryId: string) {
  const s = getOwnSession(viewer, sessionId);
  if (s.status === "attached" || s.status === "dismissed") throw new AccessError("That squeeze session was already used or discarded", 403);
  getDb()
    .prepare("UPDATE device_sessions SET status = 'attached', entry_id = ?, ended_at = COALESCE(ended_at, last_reading_at) WHERE id = ?")
    .run(entryId, sessionId);
}
