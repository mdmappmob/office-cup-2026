import { pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = resolve(__dirname, "..", "db");
const DB_PATH = resolve(DB_DIR, "officecup.db");

const PBKDF2_ITER = 120_000;

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITER, 32, "sha256");
  return `pbkdf2$${PBKDF2_ITER}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

// ── Data ──────────────────────────────────────────────

const profiles = [
  { id: "u1", email: "ricardo@firma.com", full_name: "Ricardo Silva", is_admin: 1 },
  { id: "u2", email: "ana@firma.com", full_name: "Ana Martins", is_admin: 0 },
  { id: "u3", email: "bruno@firma.com", full_name: "Bruno Lima", is_admin: 0 },
  { id: "u4", email: "juliana@firma.com", full_name: "Juliana Lopez", is_admin: 0 },
  { id: "u5", email: "marcos@firma.com", full_name: "Marcos Jorge", is_admin: 0 },
  { id: "u6", email: "carla@firma.com", full_name: "Carla Mendes", is_admin: 0 },
  { id: "u7", email: "pedro@firma.com", full_name: "Pedro Antunes", is_admin: 0 },
  { id: "u8", email: "lucia@firma.com", full_name: "Lúcia Ferreira", is_admin: 0 },
];

const leagues = [
  { id: "l1", admin_id: "u1", name: "Bolão da Diretoria 2026", is_active: 1, payment_status: "paid" },
];

const leagueMembers = [
  { id: "m1", league_id: "l1", user_id: "u1", has_paid_admin: 1, total_points: 482 },
  { id: "m2", league_id: "l1", user_id: "u2", has_paid_admin: 1, total_points: 540 },
  { id: "m3", league_id: "l1", user_id: "u3", has_paid_admin: 1, total_points: 525 },
  { id: "m4", league_id: "l1", user_id: "u4", has_paid_admin: 1, total_points: 460 },
  { id: "m5", league_id: "l1", user_id: "u5", has_paid_admin: 1, total_points: 415 },
  { id: "m6", league_id: "l1", user_id: "u6", has_paid_admin: 0, total_points: 0 },
  { id: "m7", league_id: "l1", user_id: "u7", has_paid_admin: 1, total_points: 380 },
  { id: "m8", league_id: "l1", user_id: "u8", has_paid_admin: 0, total_points: 0 },
];

type Fixture = [string, string, string, string];
const GROUP_FIXTURES: Fixture[] = [
  ["A", "2026-06-11T16:00:00Z", "México", "África do Sul"],
  ["A", "2026-06-11T23:00:00Z", "Coreia do Sul", "República Tcheca"],
  ["A", "2026-06-18T13:00:00Z", "República Tcheca", "África do Sul"],
  ["A", "2026-06-18T22:00:00Z", "México", "Coreia do Sul"],
  ["A", "2026-06-24T22:00:00Z", "República Tcheca", "México"],
  ["A", "2026-06-24T22:00:00Z", "África do Sul", "Coreia do Sul"],
  ["B", "2026-06-12T16:00:00Z", "Canadá", "Bósnia-Herzegovina"],
  ["B", "2026-06-13T16:00:00Z", "Qatar", "Suíça"],
  ["B", "2026-06-18T16:00:00Z", "Suíça", "Bósnia-Herzegovina"],
  ["B", "2026-06-18T19:00:00Z", "Canadá", "Qatar"],
  ["B", "2026-06-24T16:00:00Z", "Suíça", "Canadá"],
  ["B", "2026-06-24T16:00:00Z", "Bósnia-Herzegovina", "Qatar"],
  ["C", "2026-06-13T19:00:00Z", "Brasil", "Marrocos"],
  ["C", "2026-06-13T22:00:00Z", "Haiti", "Escócia"],
  ["C", "2026-06-19T19:00:00Z", "Escócia", "Marrocos"],
  ["C", "2026-06-19T21:30:00Z", "Brasil", "Haiti"],
  ["C", "2026-06-24T19:00:00Z", "Escócia", "Brasil"],
  ["C", "2026-06-24T19:00:00Z", "Marrocos", "Haiti"],
  ["D", "2026-06-12T22:00:00Z", "Estados Unidos", "Paraguai"],
  ["D", "2026-06-14T01:00:00Z", "Austrália", "Turquia"],
  ["D", "2026-06-19T16:00:00Z", "Estados Unidos", "Austrália"],
  ["D", "2026-06-20T00:00:00Z", "Turquia", "Paraguai"],
  ["D", "2026-06-25T23:00:00Z", "Turquia", "Estados Unidos"],
  ["D", "2026-06-25T23:00:00Z", "Paraguai", "Austrália"],
  ["E", "2026-06-14T14:00:00Z", "Alemanha", "Curaçao"],
  ["E", "2026-06-14T20:00:00Z", "Costa do Marfim", "Equador"],
  ["E", "2026-06-20T17:00:00Z", "Alemanha", "Costa do Marfim"],
  ["E", "2026-06-20T21:00:00Z", "Equador", "Curaçao"],
  ["E", "2026-06-25T17:00:00Z", "Equador", "Alemanha"],
  ["E", "2026-06-25T17:00:00Z", "Curaçao", "Costa do Marfim"],
  ["F", "2026-06-14T17:00:00Z", "Holanda", "Japão"],
  ["F", "2026-06-14T23:00:00Z", "Suécia", "Tunísia"],
  ["F", "2026-06-20T14:00:00Z", "Holanda", "Suécia"],
  ["F", "2026-06-21T01:00:00Z", "Tunísia", "Japão"],
  ["F", "2026-06-25T20:00:00Z", "Tunísia", "Holanda"],
  ["F", "2026-06-25T20:00:00Z", "Japão", "Suécia"],
  ["G", "2026-06-15T16:00:00Z", "Bélgica", "Egito"],
  ["G", "2026-06-15T22:00:00Z", "Irã", "Nova Zelândia"],
  ["G", "2026-06-21T16:00:00Z", "Bélgica", "Irã"],
  ["G", "2026-06-21T22:00:00Z", "Nova Zelândia", "Egito"],
  ["G", "2026-06-27T00:00:00Z", "Nova Zelândia", "Bélgica"],
  ["G", "2026-06-27T00:00:00Z", "Egito", "Irã"],
  ["H", "2026-06-15T13:00:00Z", "Espanha", "Cabo Verde"],
  ["H", "2026-06-15T19:00:00Z", "Arábia Saudita", "Uruguai"],
  ["H", "2026-06-21T13:00:00Z", "Espanha", "Arábia Saudita"],
  ["H", "2026-06-21T19:00:00Z", "Uruguai", "Cabo Verde"],
  ["H", "2026-06-26T21:00:00Z", "Uruguai", "Espanha"],
  ["H", "2026-06-26T21:00:00Z", "Cabo Verde", "Arábia Saudita"],
  ["I", "2026-06-16T16:00:00Z", "França", "Senegal"],
  ["I", "2026-06-16T19:00:00Z", "Iraque", "Noruega"],
  ["I", "2026-06-22T18:00:00Z", "França", "Iraque"],
  ["I", "2026-06-22T21:00:00Z", "Noruega", "Senegal"],
  ["I", "2026-06-26T16:00:00Z", "Noruega", "França"],
  ["I", "2026-06-26T16:00:00Z", "Senegal", "Iraque"],
  ["J", "2026-06-16T22:00:00Z", "Argentina", "Argélia"],
  ["J", "2026-06-17T01:00:00Z", "Áustria", "Jordânia"],
  ["J", "2026-06-22T14:00:00Z", "Argentina", "Áustria"],
  ["J", "2026-06-23T00:00:00Z", "Jordânia", "Argélia"],
  ["J", "2026-06-27T23:00:00Z", "Jordânia", "Argentina"],
  ["J", "2026-06-27T23:00:00Z", "Argélia", "Áustria"],
  ["K", "2026-06-17T14:00:00Z", "Portugal", "RD do Congo"],
  ["K", "2026-06-17T23:00:00Z", "Uzbequistão", "Colômbia"],
  ["K", "2026-06-23T14:00:00Z", "Portugal", "Uzbequistão"],
  ["K", "2026-06-23T23:00:00Z", "Colômbia", "RD do Congo"],
  ["K", "2026-06-27T20:30:00Z", "Colômbia", "Portugal"],
  ["K", "2026-06-27T20:30:00Z", "RD do Congo", "Uzbequistão"],
  ["L", "2026-06-17T17:00:00Z", "Inglaterra", "Croácia"],
  ["L", "2026-06-17T20:00:00Z", "Gana", "Panamá"],
  ["L", "2026-06-23T17:00:00Z", "Inglaterra", "Gana"],
  ["L", "2026-06-23T20:00:00Z", "Panamá", "Croácia"],
  ["L", "2026-06-27T18:00:00Z", "Panamá", "Inglaterra"],
  ["L", "2026-06-27T18:00:00Z", "Croácia", "Gana"],
];

const TEAM_ISO: Record<string, string> = {
  "México": "MX", "África do Sul": "ZA", "Coreia do Sul": "KR", "República Tcheca": "CZ",
  "Canadá": "CA", "Bósnia-Herzegovina": "BA", "Qatar": "QA", "Suíça": "CH",
  "Brasil": "BR", "Marrocos": "MA", "Haiti": "HT", "Escócia": "GB",
  "Estados Unidos": "US", "Paraguai": "PY", "Austrália": "AU", "Turquia": "TR",
  "Alemanha": "DE", "Curaçao": "CW", "Costa do Marfim": "CI", "Equador": "EC",
  "Holanda": "NL", "Japão": "JP", "Suécia": "SE", "Tunísia": "TN",
  "Bélgica": "BE", "Egito": "EG", "Irã": "IR", "Nova Zelândia": "NZ",
  "Espanha": "ES", "Cabo Verde": "CV", "Arábia Saudita": "SA", "Uruguai": "UY",
  "França": "FR", "Senegal": "SN", "Iraque": "IQ", "Noruega": "NO",
  "Argentina": "AR", "Argélia": "DZ", "Áustria": "AT", "Jordânia": "JO",
  "Portugal": "PT", "RD do Congo": "CD", "Uzbequistão": "UZ", "Colômbia": "CO",
  "Inglaterra": "GB", "Croácia": "HR", "Gana": "GH", "Panamá": "PA",
};

// ── Seed ──────────────────────────────────────────────

async function seed() {
  if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
  if (existsSync(DB_PATH)) {
    console.log(`[seed] DB already exists at ${DB_PATH} — delete it first to re-seed.`);
    process.exit(0);
  }

  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // ── Schema ──────────────────────────────────────────


  db.run(`
    CREATE TABLE oc_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE oc_profiles (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      full_name TEXT NOT NULL,
      avatar_url TEXT NOT NULL DEFAULT ''
    );
  `);

  db.run(`
    CREATE TABLE oc_leagues (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES oc_users(id),
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      payment_status TEXT NOT NULL DEFAULT 'pending'
    );
  `);

  db.run(`
    CREATE TABLE oc_league_members (
      id TEXT PRIMARY KEY,
      league_id TEXT NOT NULL REFERENCES oc_leagues(id),
      user_id TEXT NOT NULL REFERENCES oc_users(id),
      has_paid_admin INTEGER NOT NULL DEFAULT 0,
      total_points INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE oc_matches (
      id TEXT PRIMARY KEY,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_flag TEXT NOT NULL DEFAULT '',
      away_flag TEXT NOT NULL DEFAULT '',
      match_date TEXT NOT NULL,
      phase TEXT NOT NULL,
      group_name TEXT,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT NOT NULL DEFAULT 'scheduled',
      bracket_slot TEXT
    );
  `);

  db.run(`
    CREATE TABLE oc_predictions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      league_id TEXT NOT NULL,
      match_id TEXT NOT NULL,
      slot INTEGER NOT NULL DEFAULT 1,
      predicted_home_score INTEGER,
      predicted_away_score INTEGER,
      predicted_home_lineup TEXT NOT NULL DEFAULT '[]',
      predicted_away_lineup TEXT NOT NULL DEFAULT '[]',
      predicted_goalscorers TEXT NOT NULL DEFAULT '[]',
      is_zebra INTEGER NOT NULL DEFAULT 0,
      points_earned INTEGER NOT NULL DEFAULT 0
    );
  `);

  // ── Insert helpers ──────────────────────────────────

  const now = new Date().toISOString();
  const pw = hashPassword("123456");

  const insert = (sql: string, params: unknown[]) => {
    const stmt = db.prepare(sql);
    stmt.bind(params as never);
    stmt.step();
    stmt.free();
  };

  // ── oc_users ────────────────────────────────────────
  for (const u of profiles) {
    insert(
      "INSERT INTO oc_users VALUES (?, ?, ?, ?, ?, ?)",
      [u.id, u.email, pw, u.full_name, u.is_admin, now],
    );
  }

  // ── oc_profiles ─────────────────────────────────────
  for (const p of profiles) {
    insert(
      "INSERT INTO oc_profiles (id, email, full_name) VALUES (?, ?, ?)",
      [p.id, p.email, p.full_name],
    );
  }

  // ── oc_leagues ──────────────────────────────────────
  for (const l of leagues) {
    insert(
      "INSERT INTO oc_leagues VALUES (?, ?, ?, ?, ?)",
      [l.id, l.admin_id, l.name, l.is_active, l.payment_status],
    );
  }

  // ── oc_league_members ───────────────────────────────
  for (const m of leagueMembers) {
    insert(
      "INSERT INTO oc_league_members VALUES (?, ?, ?, ?, ?)",
      [m.id, m.league_id, m.user_id, m.has_paid_admin, m.total_points],
    );
  }

  // ── oc_matches ──────────────────────────────────────
  const allMatches: Array<{
    id: string; home_team: string; away_team: string; home_flag: string;
    away_flag: string; match_date: string; phase: string; group_name: string | null;
    home_score: number | null; away_score: number | null; status: string; bracket_slot: string | null;
  }> = [];

  // grupos
  GROUP_FIXTURES.forEach(([g, date, home, away], i) => {
    allMatches.push({
      id: `g${i}`, home_team: home, away_team: away,
      home_flag: TEAM_ISO[home] ?? "", away_flag: TEAM_ISO[away] ?? "",
      match_date: date, phase: "grupos", group_name: g,
      home_score: null, away_score: null, status: "scheduled", bracket_slot: null,
    });
  });

  // bracket
  const brackets: Array<{ phase: string; count: number; prefix: string; baseDate: string }> = [
    { phase: "r32", count: 16, prefix: "r", baseDate: "2026-06-30T16:00:00Z" },
    { phase: "oitavas", count: 8, prefix: "o", baseDate: "2026-07-04T16:00:00Z" },
    { phase: "quartas", count: 4, prefix: "q", baseDate: "2026-07-09T16:00:00Z" },
    { phase: "semi", count: 2, prefix: "s", baseDate: "2026-07-14T20:00:00Z" },
    { phase: "final", count: 1, prefix: "f", baseDate: "2026-07-19T16:00:00Z" },
  ];

  for (const b of brackets) {
    for (let i = 0; i < b.count; i++) {
      allMatches.push({
        id: `${b.prefix}${i}`, home_team: "—", away_team: "—",
        home_flag: "", away_flag: "",
        match_date: b.baseDate, phase: b.phase, group_name: null,
        home_score: null, away_score: null, status: "scheduled", bracket_slot: `${b.phase}-${i}`,
      });
    }
  }

  for (const m of allMatches) {
    insert(
      "INSERT INTO oc_matches (id, home_team, away_team, home_flag, away_flag, match_date, phase, group_name, home_score, away_score, status, bracket_slot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [m.id, m.home_team, m.away_team, m.home_flag, m.away_flag, m.match_date, m.phase, m.group_name, m.home_score, m.away_score, m.status, m.bracket_slot],
    );
  }

  // ── Persist ─────────────────────────────────────────
  const data = db.export();
  writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log(`[seed] Database created at ${DB_PATH}`);
  console.log(`[seed] Tables:`);
  console.log(`  oc_users           → ${profiles.length} users (password: "123456")`);
  console.log(`  oc_profiles        → ${profiles.length} profiles`);
  console.log(`  oc_leagues         → ${leagues.length} league`);
  console.log(`  oc_league_members  → ${leagueMembers.length} members`);
  console.log(`  oc_matches         → ${allMatches.length} matches (72 grupos + 31 mata-mata)`);
  console.log(`  oc_predictions     → 0 (empty — no predictions yet)`);
  console.log(`[seed] Admin: Ricardo Silva (ricardo@firma.com)`);
}

seed().catch((err) => { console.error("[seed] Failed:", err); process.exit(1); });
