import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { getSeedMatches } from "./seed";
import type { MockMatch, MockPrediction, MatchPhase } from "@/mocks/types";
import { TEAM_ISO } from "@/lib/teams";
import { mockProfiles } from "@/mocks/profiles";

const DB_NAME_KEY = "officecup-sqlite-name";
const IDB_NAME = "officecup-sqlite";
const IDB_STORE = "databases";

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let currentName: string | null = null;
let initPromise: Promise<void> | null = null;
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

export function onSqliteReady(cb: () => void): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function isSqliteReady(): boolean {
  return db !== null;
}

export function getSqliteName(): string | null {
  return currentName ?? (typeof localStorage !== "undefined" ? localStorage.getItem(DB_NAME_KEY) : null);
}

// ---------- IndexedDB helpers ----------
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<Uint8Array | undefined> {
  const conn = await idb();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as Uint8Array | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: Uint8Array): Promise<void> {
  const conn = await idb();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- Schema ----------
function ensureSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_flag TEXT NOT NULL,
      away_flag TEXT NOT NULL,
      match_date TEXT NOT NULL,
      phase TEXT NOT NULL,
      group_name TEXT,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT NOT NULL,
      bracket_slot TEXT
    );
    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      league_id TEXT NOT NULL,
      match_id TEXT NOT NULL,
      predicted_home_score INTEGER,
      predicted_away_score INTEGER,
      is_zebra INTEGER NOT NULL DEFAULT 0,
      points_earned INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase);
    CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
  // Coluna slot (multi-palpite) — adicionada via ALTER se a base for antiga.
  const cols = database.exec("PRAGMA table_info(predictions)");
  const hasSlot =
    cols[0]?.values.some((row) => String(row[1]) === "slot") ?? false;
  if (!hasSlot) {
    database.run(`ALTER TABLE predictions ADD COLUMN slot INTEGER NOT NULL DEFAULT 1`);
    database.run(`CREATE INDEX IF NOT EXISTS idx_predictions_user_match_slot ON predictions(user_id, match_id, slot)`);
  }
}

function seedIfEmpty(database: Database) {
  const res = database.exec("SELECT COUNT(*) AS c FROM matches");
  const count = res[0] ? Number(res[0].values[0][0]) : 0;
  if (count > 0) return false;
  const stmt = database.prepare(
    `INSERT INTO matches (id, home_team, away_team, home_flag, away_flag, match_date, phase, group_name, home_score, away_score, status, bracket_slot)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  for (const m of getSeedMatches()) {
    stmt.run([
      m.id,
      m.home_team,
      m.away_team,
      m.home_flag,
      m.away_flag,
      m.match_date,
      m.phase,
      m.group ?? null,
      m.home_score,
      m.away_score,
      m.status,
      m.bracket_slot ?? null,
    ]);
  }
  stmt.free();
  return true;
}

/**
 * Garante que matches.home_flag/away_flag estejam armazenados como ISO-2
 * (ex.: "BR", "MX"). O render no front usa <Flag /> (SVG), independente de SO.
 * Idempotente — só atualiza linhas onde o valor atual não é o ISO esperado.
 */
function migrateFlagsToIso(database: Database): boolean {
  let changed = false;
  const stmt = database.prepare(
    `SELECT id, home_team, away_team, home_flag, away_flag FROM matches`,
  );
  const rows: Array<{ id: string; ht: string; at: string; hf: string; af: string }> = [];
  while (stmt.step()) {
    const r = stmt.getAsObject() as Record<string, unknown>;
    rows.push({
      id: String(r.id),
      ht: String(r.home_team),
      at: String(r.away_team),
      hf: String(r.home_flag ?? ""),
      af: String(r.away_flag ?? ""),
    });
  }
  stmt.free();
  const upd = database.prepare(`UPDATE matches SET home_flag = ?, away_flag = ? WHERE id = ?`);
  for (const r of rows) {
    const newHf = TEAM_ISO[r.ht] ?? (r.ht === "—" ? "" : r.hf);
    const newAf = TEAM_ISO[r.at] ?? (r.at === "—" ? "" : r.af);
    if (newHf !== r.hf || newAf !== r.af) {
      upd.run([newHf, newAf, r.id]);
      changed = true;
    }
  }
  upd.free();
  return changed;
}

function seedUsersIfEmpty(database: Database): boolean {
  const res = database.exec("SELECT COUNT(*) AS c FROM users");
  const count = res[0] ? Number(res[0].values[0][0]) : 0;
  if (count > 0) return false;
  const stmt = database.prepare(
    `INSERT INTO users (id, email, full_name, password, is_admin) VALUES (?,?,?,?,?)`,
  );
  for (const p of mockProfiles) {
    stmt.run([p.id, p.email, p.full_name, "demo", p.id === "u1" ? 1 : 0]);
  }
  stmt.free();
  return true;
}

async function persist() {
  if (!db || !currentName) return;
  await idbPut(currentName, db.export());
}

// ---------- Public API ----------
export async function initSqliteRepo(name: string): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!SQL) SQL = await initSqlJs({ locateFile: () => wasmUrl });
    const existing = await idbGet(name);
    let isFresh = false;
    if (existing) {
      db = new SQL.Database(existing);
    } else {
      db = new SQL.Database();
      isFresh = true;
    }
    ensureSchema(db);
    const seeded = seedIfEmpty(db);
    const migrated = migrateFlagsToIso(db);
    const seededUsers = seedUsersIfEmpty(db);
    currentName = name;
    if (typeof localStorage !== "undefined") localStorage.setItem(DB_NAME_KEY, name);
    if (isFresh || seeded || migrated || seededUsers) await persist();
    console.info(
      `[sqlite] DB "${name}" pronto (${existing ? "carregado do IndexedDB" : "novo"}${seeded ? ", matches seedados" : ""}${seededUsers ? ", users seedados" : ""}${migrated ? ", flags→ISO" : ""}).`,
    );
    notify();
  })();
  return initPromise;
}

function rowToMatch(row: unknown[], cols: string[]): MockMatch {
  const obj: Record<string, unknown> = {};
  cols.forEach((c, i) => (obj[c] = row[i]));
  return {
    id: String(obj.id),
    home_team: String(obj.home_team),
    away_team: String(obj.away_team),
    home_flag: String(obj.home_flag),
    away_flag: String(obj.away_flag),
    match_date: String(obj.match_date),
    phase: obj.phase as MatchPhase,
    group: (obj.group_name as string | null) ?? undefined,
    home_score: obj.home_score as number | null,
    away_score: obj.away_score as number | null,
    status: obj.status as MockMatch["status"],
    bracket_slot: (obj.bracket_slot as string | null) ?? undefined,
  };
}

function query(sql: string, params: unknown[] = []): MockMatch[] {
  if (!db) return [];
  const stmt = db.prepare(sql);
  stmt.bind(params as never);
  const out: MockMatch[] = [];
  while (stmt.step()) {
    const cols = stmt.getColumnNames();
    out.push(rowToMatch(stmt.get() as unknown[], cols));
  }
  stmt.free();
  return out;
}

export function sqliteListMatches(): MockMatch[] {
  return query("SELECT * FROM matches");
}
export function sqliteGetMatch(id: string): MockMatch | undefined {
  return query("SELECT * FROM matches WHERE id = ?", [id])[0];
}
export function sqliteListByPhase(phase: MatchPhase): MockMatch[] {
  return query("SELECT * FROM matches WHERE phase = ?", [phase]);
}
export function sqliteListByGroup(group: string): MockMatch[] {
  return query("SELECT * FROM matches WHERE group_name = ?", [group]);
}

export async function sqliteUpsertPrediction(p: MockPrediction): Promise<void> {
  if (!db) return;
  db.run(
    `INSERT INTO predictions (id, user_id, league_id, match_id, slot, predicted_home_score, predicted_away_score, is_zebra, points_earned)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       slot = excluded.slot,
       predicted_home_score = excluded.predicted_home_score,
       predicted_away_score = excluded.predicted_away_score,
       is_zebra = excluded.is_zebra,
       points_earned = excluded.points_earned`,
    [
      p.id,
      p.user_id,
      p.league_id,
      p.match_id,
      p.slot,
      p.predicted_home_score,
      p.predicted_away_score,
      p.is_zebra ? 1 : 0,
      p.points_earned,
    ],
  );
  await persist();
}

export async function sqliteDeletePrediction(id: string): Promise<void> {
  if (!db) return;
  db.run(`DELETE FROM predictions WHERE id = ?`, [id]);
  await persist();
}

export async function sqliteUpdateMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  if (!db) return;
  db.run(
    `UPDATE matches SET home_score = ?, away_score = ?, status = 'finished' WHERE id = ?`,
    [homeScore, awayScore, matchId],
  );
  await persist();
}

export interface SqliteUser {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
}

export function sqliteLogin(email: string, password: string): SqliteUser | null {
  if (!db) return null;
  const stmt = db.prepare(
    `SELECT id, email, full_name, is_admin FROM users WHERE email = ? AND password = ?`,
  );
  stmt.bind([email, password]);
  if (!stmt.step()) {
    stmt.free();
    return null;
  }
  const r = stmt.getAsObject() as Record<string, unknown>;
  stmt.free();
  return {
    id: String(r.id),
    email: String(r.email),
    full_name: String(r.full_name),
    is_admin: Number(r.is_admin) === 1,
  };
}