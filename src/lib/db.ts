import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getConfig } from "./config";

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient','practitioner')),
  title TEXT,
  organization TEXT,
  password_hash TEXT NOT NULL,
  about TEXT,
  is_synthetic INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Consent record: a patient shares their log with a practitioner. Revocation is kept for audit.
CREATE TABLE IF NOT EXISTS care_links (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active','revoked')),
  granted_at TEXT NOT NULL,
  revoked_at TEXT,
  UNIQUE (patient_id, practitioner_id)
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('movement','no_movement')),
  occurred_at TEXT NOT NULL,
  bristol_type INTEGER CHECK (bristol_type BETWEEN 1 AND 7),
  bristol_source TEXT,
  symptoms TEXT,
  context TEXT,
  blood_report TEXT CHECK (blood_report IN ('yes','no','unsure')),
  notes TEXT,
  ai_analysis TEXT,
  is_synthetic INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS entries_patient_time ON entries(patient_id, occurred_at);

-- Short-lived AI results. The photo itself is never stored; only the structured result, until it is
-- attached to an entry or expires.
CREATE TABLE IF NOT EXISTS ai_drafts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  practitioner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  flag_rule TEXT NOT NULL,
  flag_title TEXT NOT NULL,
  evidence_ids TEXT NOT NULL,
  decision TEXT NOT NULL,
  note TEXT NOT NULL,
  follow_up TEXT NOT NULL,
  follow_up_status TEXT NOT NULL CHECK (follow_up_status IN ('none','open','done')),
  suggestion_source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS reviews_patient ON reviews(patient_id, flag_key);
`;

type G = typeof globalThis & { __gutDb?: DatabaseSync; __gutDbFile?: string };

function dbFile(): string {
  if (process.env.GUT_DB_FILE) return process.env.GUT_DB_FILE;
  const dir = getConfig().dataDir;
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "gut-feeling.db");
}

export function getDb(): DatabaseSync {
  const g = globalThis as G;
  const file = dbFile();
  if (g.__gutDb && g.__gutDbFile === file) return g.__gutDb;
  const db = new DatabaseSync(file);
  if (file !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  g.__gutDb = db;
  g.__gutDbFile = file;
  return db;
}

/** For tests: drop the cached connection so the next getDb() opens a fresh database. */
export function resetDbForTests() {
  const g = globalThis as G;
  g.__gutDb?.close();
  g.__gutDb = undefined;
  g.__gutDbFile = undefined;
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
