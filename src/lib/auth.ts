import "server-only";
import crypto from "node:crypto";
import type { Role } from "./domain";
import { getDb } from "./db";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  title: string | null;
  organization: string | null;
  about: string | null;
  isSynthetic: boolean;
}

export const SESSION_COOKIE = "gf_session";
export const SESSION_TTL_MS = 7 * 24 * 3_600_000;

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(9).toString("base64url")}`;
}

// scrypt parameters (N=16384, r=8, p=1) with a per-password random salt.
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, "base64url"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  title: string | null;
  organization: string | null;
  about: string | null;
  is_synthetic: number;
  password_hash: string;
};

function toUser(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    title: r.title,
    organization: r.organization,
    about: r.about,
    isSynthetic: !!r.is_synthetic,
  };
}

export function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: Role;
  title?: string | null;
  organization?: string | null;
  about?: string | null;
  isSynthetic?: boolean;
  id?: string;
}): User {
  const id = input.id ?? newId(input.role === "patient" ? "pt" : "pr");
  getDb()
    .prepare(
      `INSERT INTO users (id, email, name, role, title, organization, password_hash, about, is_synthetic, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.email.toLowerCase(),
      input.name,
      input.role,
      input.title ?? null,
      input.organization ?? null,
      hashPassword(input.password),
      input.about ?? null,
      input.isSynthetic ? 1 : 0,
      new Date().toISOString(),
    );
  return getUserById(id)!;
}

export function getUserById(id: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function emailExists(email: string): boolean {
  return !!getDb().prepare("SELECT 1 FROM users WHERE email = ?").get(email.toLowerCase());
}

// Equalise timing between unknown emails and wrong passwords.
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString("hex"));

export function authenticate(email: string, password: string): User | null {
  const row = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as UserRow | undefined;
  if (!row) {
    verifyPassword(password, DUMMY_HASH);
    return null;
  }
  return verifyPassword(password, row.password_hash) ? toUser(row) : null;
}

export function createSession(userId: string): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now.toISOString());
  db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
    hashToken(token),
    userId,
    now.toISOString(),
    expiresAt.toISOString(),
  );
  return { token, expiresAt };
}

export function getUserBySessionToken(token: string | undefined | null): User | null {
  if (!token || token.length > 200) return null;
  const row = getDb()
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), new Date().toISOString()) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function deleteSession(token: string | undefined | null) {
  if (!token) return;
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

// Very small in-memory limiter for login attempts (per key). Good enough for a single instance.
const attempts = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, max = 10, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const cur = attempts.get(key);
  if (!cur || cur.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  cur.count++;
  return cur.count <= max;
}
