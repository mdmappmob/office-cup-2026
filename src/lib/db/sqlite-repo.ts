import type { Database, SqlJsStatic } from "sql.js";
import { SQLITE_WASM_URL, IDB_NAME, IDB_STORE, IDB_KEY, SESSION_KEY } from "./config";

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadSnapshot(): Promise<Uint8Array | null> {
  const idb = await openIdb();
  return new Promise((resolve) => {
    const tx = idb.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(IDB_KEY);
    tx.onsuccess = () => resolve((tx.result as Uint8Array | undefined) ?? null);
    tx.onerror = () => resolve(null);
  });
}

async function saveSnapshotNow() {
  if (!db) return;
  const data = db.export();
  const idb = await openIdb();
  await new Promise<void>((resolve) => {
    const tx = idb.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(data, IDB_KEY);
    tx.onsuccess = () => resolve();
    tx.onerror = () => resolve();
  });
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void saveSnapshotNow(); }, 300);
}

function migrate(d: Database) {
  d.run(`
    CREATE TABLE IF NOT EXISTS oc_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
}

export async function openDb(): Promise<Database> {
  if (db) return db;
  if (typeof window === "undefined") {
    throw new Error("sqlite-repo: openDb() is browser-only");
  }
  if (!SQL) {
    const mod = await import("sql.js");
    const init = (mod.default ?? mod) as (config?: { locateFile?: (f: string) => string }) => Promise<SqlJsStatic>;
    SQL = await init({ locateFile: () => SQLITE_WASM_URL });
  }
  const snap = await loadSnapshot();
  db = snap ? new SQL.Database(snap) : new SQL.Database();
  migrate(db);
  if (!snap) scheduleSave();
  return db;
}

// ---------- password hashing (PBKDF2 / Web Crypto) ----------

const PBKDF2_ITER = 120_000;

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITER);
  return `pbkdf2$${PBKDF2_ITER}$${bufToB64(salt.buffer)}$${bufToB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterStr, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const iter = parseInt(iterStr, 10);
  const salt = b64ToBuf(saltB64);
  const hash = await pbkdf2(password, salt, iter);
  return bufToB64(hash) === hashB64;
}

// ---------- user repo ----------

export interface DbUser {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
}

function rowToUser(row: Record<string, unknown>): DbUser {
  return {
    id: String(row.id),
    email: String(row.email),
    full_name: String(row.full_name),
    is_admin: Number(row.is_admin) === 1,
  };
}

function queryRows(d: Database, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = d.prepare(sql);
  stmt.bind(params as never);
  const out: Record<string, unknown>[] = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

export async function countUsers(): Promise<number> {
  const d = await openDb();
  const rows = queryRows(d, `SELECT COUNT(*) AS n FROM oc_users`);
  return Number(rows[0]?.n ?? 0);
}

export async function findUserByEmail(email: string): Promise<{ user: DbUser; password_hash: string } | null> {
  const d = await openDb();
  const rows = queryRows(d, `SELECT * FROM oc_users WHERE email = ? LIMIT 1`, [email.trim().toLowerCase()]);
  if (!rows[0]) return null;
  return { user: rowToUser(rows[0]), password_hash: String(rows[0].password_hash) };
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const d = await openDb();
  const rows = queryRows(d, `SELECT * FROM oc_users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function createUser(email: string, password: string, fullName: string): Promise<DbUser> {
  const d = await openDb();
  const e = email.trim().toLowerCase();
  if (await findUserByEmail(e)) throw new Error("E-mail já cadastrado");
  const id = (crypto.randomUUID?.() ?? `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const password_hash = await hashPassword(password);
  const total = await countUsers();
  const isAdmin = total === 0 ? 1 : 0;
  d.run(
    `INSERT INTO oc_users (id, email, password_hash, full_name, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, e, password_hash, fullName.trim() || e.split("@")[0], isAdmin, new Date().toISOString()],
  );
  scheduleSave();
  return { id, email: e, full_name: fullName.trim() || e.split("@")[0], is_admin: isAdmin === 1 };
}

export async function updatePassword(email: string, newPassword: string): Promise<void> {
  const d = await openDb();
  const e = email.trim().toLowerCase();
  const existing = await findUserByEmail(e);
  if (!existing) throw new Error("E-mail não encontrado");
  const hash = await hashPassword(newPassword);
  d.run(`UPDATE oc_users SET password_hash = ? WHERE email = ?`, [hash, e]);
  scheduleSave();
}

export async function listUsersDebug(): Promise<Array<{ id: string; email: string; full_name: string; is_admin: boolean; created_at: string }>> {
  const d = await openDb();
  const rows = queryRows(d, `SELECT id, email, full_name, is_admin, created_at FROM oc_users ORDER BY created_at ASC`);
  return rows.map((r) => ({
    id: String(r.id),
    email: String(r.email),
    full_name: String(r.full_name),
    is_admin: Number(r.is_admin) === 1,
    created_at: String(r.created_at),
  }));
}

// ---------- session (current user id) ----------

export function readSession(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}
export function writeSession(userId: string | null) {
  if (typeof window === "undefined") return;
  if (userId) window.localStorage.setItem(SESSION_KEY, userId);
  else window.localStorage.removeItem(SESSION_KEY);
}