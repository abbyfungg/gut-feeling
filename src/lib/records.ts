import "server-only";
import { getConfig } from "./config";
import { getDb, transaction } from "./db";
import type { User } from "./auth";
import { newId } from "./auth";
import type { Entry, StoredAiAnalysis } from "./domain";
import { decisionLabel, REVIEW_DECISIONS } from "./domain";
import { evaluateRules } from "./rules/engine";
import type { DataNotice, Flag } from "./rules/types";
import { computeTrends, type TrendSummary } from "./rules/trends";
import type { EntryInput, ReviewInput } from "./validation";
import { checkEntryTime } from "./validation";

/** Thrown when the viewer may not see or change something. Status 404 avoids leaking whether a record exists. */
export class AccessError extends Error {
  constructor(
    message = "Not found",
    public status: 403 | 404 = 404,
  ) {
    super(message);
  }
}
export class InputError extends Error {
  status = 400 as const;
}

// ---------- authorization ----------

export function hasActiveCareLink(practitionerId: string, patientId: string): boolean {
  return !!getDb()
    .prepare("SELECT 1 FROM care_links WHERE practitioner_id = ? AND patient_id = ? AND status = 'active'")
    .get(practitionerId, patientId);
}

/** A patient can see their own record. A practitioner can see a record only while the patient shares it with them. */
export function assertCanViewPatient(viewer: User, patientId: string): void {
  if (viewer.role === "patient" && viewer.id === patientId) return;
  if (viewer.role === "practitioner" && hasActiveCareLink(viewer.id, patientId)) return;
  throw new AccessError();
}

function assertPractitionerFor(viewer: User, patientId: string) {
  if (viewer.role !== "practitioner" || !hasActiveCareLink(viewer.id, patientId)) throw new AccessError();
}

// ---------- entries ----------

type EntryRow = {
  id: string;
  patient_id: string;
  kind: "movement" | "no_movement";
  occurred_at: string;
  bristol_type: number | null;
  bristol_source: string | null;
  symptoms: string | null;
  context: string | null;
  blood_report: string | null;
  notes: string | null;
  ai_analysis: string | null;
  is_synthetic: number;
  created_at: string;
};

function toEntry(r: EntryRow): Entry {
  return {
    id: r.id,
    patientId: r.patient_id,
    kind: r.kind,
    occurredAt: r.occurred_at,
    bristolType: r.bristol_type,
    bristolSource: (r.bristol_source as Entry["bristolSource"]) ?? null,
    symptoms: r.symptoms ? JSON.parse(r.symptoms) : null,
    context: r.context ? JSON.parse(r.context) : null,
    bloodReport: (r.blood_report as Entry["bloodReport"]) ?? null,
    notes: r.notes,
    ai: r.ai_analysis ? JSON.parse(r.ai_analysis) : null,
    isSynthetic: !!r.is_synthetic,
    createdAt: r.created_at,
  };
}

function loadEntries(patientId: string): Entry[] {
  const rows = getDb()
    .prepare("SELECT * FROM entries WHERE patient_id = ? ORDER BY occurred_at DESC")
    .all(patientId) as EntryRow[];
  return rows.map(toEntry);
}

export function listEntries(viewer: User, patientId: string): Entry[] {
  assertCanViewPatient(viewer, patientId);
  return loadEntries(patientId);
}

export function getEntry(viewer: User, entryId: string): Entry {
  const row = getDb().prepare("SELECT * FROM entries WHERE id = ?").get(entryId) as EntryRow | undefined;
  if (!row) throw new AccessError();
  assertCanViewPatient(viewer, row.patient_id);
  return toEntry(row);
}

/** Only the patient can log to their own diary. */
export function createEntry(viewer: User, input: EntryInput, now = new Date()): Entry {
  if (viewer.role !== "patient") throw new AccessError("Only patients can log entries", 403);
  const timeProblem = checkEntryTime(input.occurredAt, now);
  if (timeProblem) throw new InputError(timeProblem);

  let ai: StoredAiAnalysis | null = null;
  if (input.kind === "movement" && input.ai) {
    ai = consumeAiDraft(viewer, input.ai.analysisId);
    if (!ai) throw new InputError("That photo analysis has expired. Please analyse the photo again or choose a type yourself.");
  }
  if (input.kind === "movement" && ai && input.bristolType != null) {
    // The person always has the final say; record whether they kept or changed the AI estimate.
    input = { ...input, bristolSource: ai.estimatedType === input.bristolType ? "ai_accepted" : "ai_corrected" };
  }

  const id = newId("en");
  const createdAt = now.toISOString();
  const m = input.kind === "movement" ? input : null;
  getDb()
    .prepare(
      `INSERT INTO entries (id, patient_id, kind, occurred_at, bristol_type, bristol_source, symptoms, context, blood_report, notes, ai_analysis, is_synthetic, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    )
    .run(
      id,
      viewer.id,
      input.kind,
      input.occurredAt,
      m?.bristolType ?? null,
      m?.bristolSource ?? null,
      m?.symptoms ? JSON.stringify(m.symptoms) : null,
      m?.context ? JSON.stringify(m.context) : null,
      m?.bloodReport ?? null,
      input.notes ?? null,
      ai ? JSON.stringify(ai) : null,
      createdAt,
    );
  return getEntry(viewer, id);
}

/** Hard delete. Only the patient who owns the entry can delete it. */
export function deleteEntry(viewer: User, entryId: string): void {
  const row = getDb().prepare("SELECT patient_id FROM entries WHERE id = ?").get(entryId) as { patient_id: string } | undefined;
  if (!row || viewer.role !== "patient" || row.patient_id !== viewer.id) throw new AccessError();
  getDb().prepare("DELETE FROM entries WHERE id = ?").run(entryId);
}

// ---------- AI drafts (structured result only; photos are never stored) ----------

const AI_DRAFT_TTL_MS = 60 * 60_000;

export function saveAiDraft(viewer: User, result: StoredAiAnalysis, now = new Date()): string {
  if (viewer.role !== "patient") throw new AccessError("Only patients can analyse photos", 403);
  const id = newId("ai");
  const db = getDb();
  db.prepare("DELETE FROM ai_drafts WHERE expires_at < ?").run(now.toISOString());
  db.prepare("INSERT INTO ai_drafts (id, patient_id, result, created_at, expires_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    viewer.id,
    JSON.stringify(result),
    now.toISOString(),
    new Date(now.getTime() + AI_DRAFT_TTL_MS).toISOString(),
  );
  return id;
}

function consumeAiDraft(viewer: User, id: string): StoredAiAnalysis | null {
  const db = getDb();
  const row = db
    .prepare("SELECT result FROM ai_drafts WHERE id = ? AND patient_id = ? AND expires_at > ?")
    .get(id, viewer.id, new Date().toISOString()) as { result: string } | undefined;
  if (!row) return null;
  db.prepare("DELETE FROM ai_drafts WHERE id = ?").run(id);
  return JSON.parse(row.result);
}

// ---------- flags, reviews and overview ----------

export type FlagStatus = "outstanding" | "reviewed" | "new_info";

export interface ReviewRecord {
  id: string;
  patientId: string;
  practitionerId: string;
  practitionerName: string;
  flagKey: string;
  flagRule: string;
  flagTitle: string;
  evidenceIds: string[];
  decision: string;
  decisionLabel: string;
  note: string;
  followUp: string;
  followUpStatus: "none" | "open" | "done";
  suggestionSource: string;
  createdAt: string;
  completedAt: string | null;
}

export interface FlagWithStatus extends Flag {
  status: FlagStatus;
  latestReview: ReviewRecord | null;
}

type ReviewRow = {
  id: string;
  patient_id: string;
  practitioner_id: string;
  practitioner_name: string;
  flag_key: string;
  flag_rule: string;
  flag_title: string;
  evidence_ids: string;
  decision: string;
  note: string;
  follow_up: string;
  follow_up_status: "none" | "open" | "done";
  suggestion_source: string;
  created_at: string;
  completed_at: string | null;
};

function toReview(r: ReviewRow): ReviewRecord {
  return {
    id: r.id,
    patientId: r.patient_id,
    practitionerId: r.practitioner_id,
    practitionerName: r.practitioner_name,
    flagKey: r.flag_key,
    flagRule: r.flag_rule,
    flagTitle: r.flag_title,
    evidenceIds: JSON.parse(r.evidence_ids),
    decision: r.decision,
    decisionLabel: decisionLabel(r.decision),
    note: r.note,
    followUp: r.follow_up,
    followUpStatus: r.follow_up_status,
    suggestionSource: r.suggestion_source,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  };
}

const REVIEW_SELECT = `SELECT r.*, u.name AS practitioner_name FROM reviews r JOIN users u ON u.id = r.practitioner_id`;

function loadReviews(patientId: string): ReviewRecord[] {
  return (getDb().prepare(`${REVIEW_SELECT} WHERE r.patient_id = ? ORDER BY r.created_at DESC`).all(patientId) as ReviewRow[]).map(toReview);
}

export function attachStatus(flags: Flag[], entries: Entry[], reviews: ReviewRecord[]): FlagWithStatus[] {
  const createdById = new Map(entries.map((e) => [e.id, e.createdAt]));
  return flags.map((f) => {
    const latest = reviews.find((r) => r.flagKey === f.key) ?? null;
    let status: FlagStatus = "outstanding";
    if (latest) {
      const newer = f.evidenceIds.some((id) => (createdById.get(id) ?? "") > latest.createdAt);
      status = newer ? "new_info" : "reviewed";
    }
    return { ...f, status, latestReview: latest };
  });
}

export interface PatientOverview {
  patient: User;
  entries: Entry[];
  flags: FlagWithStatus[];
  notices: DataNotice[];
  trends: TrendSummary;
  reviews: ReviewRecord[];
  sharedSince: string | null;
}

export function getPatientOverview(viewer: User, patientId: string, now = new Date()): PatientOverview {
  assertCanViewPatient(viewer, patientId);
  const row = getDb().prepare("SELECT id FROM users WHERE id = ? AND role = 'patient'").get(patientId);
  if (!row) throw new AccessError();
  const tz = getConfig().timezone;
  const entries = loadEntries(patientId);
  const { flags, notices } = evaluateRules(entries, now, tz);
  const reviews = loadReviews(patientId);
  const patient = getDb().prepare("SELECT id, email, name, role, title, organization, about, is_synthetic FROM users WHERE id = ?").get(patientId) as {
    id: string; email: string; name: string; role: "patient"; title: string | null; organization: string | null; about: string | null; is_synthetic: number;
  };
  const link =
    viewer.role === "practitioner"
      ? (getDb().prepare("SELECT granted_at FROM care_links WHERE practitioner_id = ? AND patient_id = ? AND status = 'active'").get(viewer.id, patientId) as
          | { granted_at: string }
          | undefined)
      : undefined;
  return {
    patient: { ...patient, isSynthetic: !!patient.is_synthetic },
    entries,
    flags: attachStatus(flags, entries, reviews),
    notices,
    trends: computeTrends(entries, now, tz),
    reviews,
    sharedSince: link?.granted_at ?? null,
  };
}

export interface CaseloadRow {
  patient: { id: string; name: string; about: string | null; isSynthetic: boolean };
  outstanding: FlagWithStatus[];
  allFlags: FlagWithStatus[];
  notices: DataNotice[];
  lastEntryAt: string | null;
  openFollowUps: number;
}

/** All patients currently sharing with this practitioner, with their computed flags. */
export function getCaseload(viewer: User, now = new Date()): CaseloadRow[] {
  if (viewer.role !== "practitioner") throw new AccessError("Care team only", 403);
  const tz = getConfig().timezone;
  const patients = getDb()
    .prepare(
      `SELECT u.id, u.name, u.about, u.is_synthetic FROM care_links c JOIN users u ON u.id = c.patient_id
       WHERE c.practitioner_id = ? AND c.status = 'active' ORDER BY u.name`,
    )
    .all(viewer.id) as { id: string; name: string; about: string | null; is_synthetic: number }[];
  return patients.map((p) => {
    const entries = loadEntries(p.id);
    const { flags, notices } = evaluateRules(entries, now, tz);
    const reviews = loadReviews(p.id);
    const withStatus = attachStatus(flags, entries, reviews);
    return {
      patient: { id: p.id, name: p.name, about: p.about, isSynthetic: !!p.is_synthetic },
      outstanding: withStatus.filter((f) => f.status !== "reviewed"),
      allFlags: withStatus,
      notices,
      lastEntryAt: entries[0]?.occurredAt ?? null,
      openFollowUps: reviews.filter((r) => r.followUpStatus === "open").length,
    };
  });
}

export function createReview(viewer: User, patientId: string, input: ReviewInput, now = new Date()): ReviewRecord {
  assertPractitionerFor(viewer, patientId);
  const entries = loadEntries(patientId);
  const { flags } = evaluateRules(entries, now, getConfig().timezone);
  const flag = flags.find((f) => f.key === input.flagKey);
  if (!flag) throw new InputError("That flag is no longer active for this patient. Refresh to see the latest.");
  const needsFollowUp = REVIEW_DECISIONS.find((d) => d.id === input.decision)?.followUp ?? false;
  if (needsFollowUp && !input.followUp) throw new InputError("Add a short follow-up so the next person knows what to do.");
  const id = newId("rv");
  getDb()
    .prepare(
      `INSERT INTO reviews (id, patient_id, practitioner_id, flag_key, flag_rule, flag_title, evidence_ids, decision, note, follow_up, follow_up_status, suggestion_source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      patientId,
      viewer.id,
      flag.key,
      flag.rule,
      flag.title,
      JSON.stringify(flag.evidenceIds),
      input.decision,
      input.note,
      input.followUp,
      needsFollowUp ? "open" : "none",
      input.suggestionSource,
      now.toISOString(),
    );
  return toReview(getDb().prepare(`${REVIEW_SELECT} WHERE r.id = ?`).get(id) as ReviewRow);
}

export function completeFollowUp(viewer: User, reviewId: string, now = new Date()): ReviewRecord {
  const row = getDb().prepare(`${REVIEW_SELECT} WHERE r.id = ?`).get(reviewId) as ReviewRow | undefined;
  if (!row) throw new AccessError();
  assertPractitionerFor(viewer, row.patient_id);
  if (row.follow_up_status !== "open") throw new InputError("That follow-up isn't open.");
  getDb().prepare("UPDATE reviews SET follow_up_status = 'done', completed_at = ? WHERE id = ?").run(now.toISOString(), reviewId);
  return toReview(getDb().prepare(`${REVIEW_SELECT} WHERE r.id = ?`).get(reviewId) as ReviewRow);
}

export function listOpenFollowUps(viewer: User): (ReviewRecord & { patientName: string })[] {
  if (viewer.role !== "practitioner") throw new AccessError("Care team only", 403);
  const rows = getDb()
    .prepare(
      `SELECT r.*, u.name AS practitioner_name, p.name AS patient_name FROM reviews r
       JOIN users u ON u.id = r.practitioner_id
       JOIN users p ON p.id = r.patient_id
       JOIN care_links c ON c.patient_id = r.patient_id AND c.practitioner_id = ? AND c.status = 'active'
       WHERE r.follow_up_status = 'open' ORDER BY r.created_at ASC`,
    )
    .all(viewer.id) as (ReviewRow & { patient_name: string })[];
  return rows.map((r) => ({ ...toReview(r), patientName: r.patient_name }));
}

/** What a patient sees about reviews of their own record: who looked and when, plus the decision. */
export function listReviewsForPatient(viewer: User): ReviewRecord[] {
  if (viewer.role !== "patient") throw new AccessError();
  return loadReviews(viewer.id);
}

// ---------- sharing (consent) ----------

export interface ShareRow {
  practitioner: { id: string; name: string; title: string | null; organization: string | null; about: string | null };
  status: "active" | "revoked" | "never";
  grantedAt: string | null;
  revokedAt: string | null;
}

export function listSharing(viewer: User): ShareRow[] {
  if (viewer.role !== "patient") throw new AccessError();
  const rows = getDb()
    .prepare(
      `SELECT u.id, u.name, u.title, u.organization, u.about, c.status, c.granted_at, c.revoked_at
       FROM users u LEFT JOIN care_links c ON c.practitioner_id = u.id AND c.patient_id = ?
       WHERE u.role = 'practitioner' ORDER BY u.name`,
    )
    .all(viewer.id) as {
    id: string; name: string; title: string | null; organization: string | null; about: string | null;
    status: "active" | "revoked" | null; granted_at: string | null; revoked_at: string | null;
  }[];
  return rows.map((r) => ({
    practitioner: { id: r.id, name: r.name, title: r.title, organization: r.organization, about: r.about },
    status: r.status ?? "never",
    grantedAt: r.granted_at,
    revokedAt: r.revoked_at,
  }));
}

export function setSharing(viewer: User, practitionerId: string, active: boolean, now = new Date()): void {
  if (viewer.role !== "patient") throw new AccessError();
  const pr = getDb().prepare("SELECT 1 FROM users WHERE id = ? AND role = 'practitioner'").get(practitionerId);
  if (!pr) throw new AccessError();
  transaction(() => {
    const db = getDb();
    const existing = db.prepare("SELECT id FROM care_links WHERE patient_id = ? AND practitioner_id = ?").get(viewer.id, practitionerId) as
      | { id: string }
      | undefined;
    if (active) {
      if (existing)
        db.prepare("UPDATE care_links SET status = 'active', granted_at = ?, revoked_at = NULL WHERE id = ?").run(now.toISOString(), existing.id);
      else
        db.prepare("INSERT INTO care_links (id, patient_id, practitioner_id, status, granted_at) VALUES (?, ?, ?, 'active', ?)").run(
          newId("cl"),
          viewer.id,
          practitionerId,
          now.toISOString(),
        );
    } else if (existing) {
      db.prepare("UPDATE care_links SET status = 'revoked', revoked_at = ? WHERE id = ?").run(now.toISOString(), existing.id);
    }
  });
}

/** Permanently deletes the patient's account and everything attached to it. */
export function deleteAccount(viewer: User): void {
  if (viewer.role !== "patient") throw new AccessError();
  if (viewer.isSynthetic) throw new InputError("Shared demo accounts can't be deleted.");
  getDb().prepare("DELETE FROM users WHERE id = ?").run(viewer.id);
}
