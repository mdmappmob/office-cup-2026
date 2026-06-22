import { createClient } from "@supabase/supabase-js";

// ── Seeded PRNG (deterministic) ──────────────────────────
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const t2 = Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t2 ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

// ── Config ────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const DEMO_USERS = [
  { id: "demo-u1", email: "admin@demo.com", full_name: "Ana Costa", admin: true },
  { id: "demo-u2", email: "bruno@demo.com", full_name: "Bruno Oliveira", admin: false },
  { id: "demo-u3", email: "carla@demo.com", full_name: "Carla Mendes", admin: false },
  { id: "demo-u4", email: "daniel@demo.com", full_name: "Daniel Rocha", admin: false },
  { id: "demo-u5", email: "eduarda@demo.com", full_name: "Eduarda Lima", admin: false },
  { id: "demo-u6", email: "felipe@demo.com", full_name: "Felipe Santos", admin: false },
  { id: "demo-u7", email: "gabriela@demo.com", full_name: "Gabriela Torres", admin: false },
  { id: "demo-u8", email: "henrique@demo.com", full_name: "Henrique Barbosa", admin: false },
];

const PASSWORD = "demo123";
const LEAGUE_ID = "demo-l1";
const LEAGUE_NAME = "Bolão Corporativo 2026";
const INVITE_CODE = "DEMO2026";

type Fixture = [string, string, string, string]; // group, dateISO, home, away
const GROUP_FIXTURES: Fixture[] = [
  ["A", "2026-06-11T16:00:00-03:00", "México", "África do Sul"],
  ["A", "2026-06-11T23:00:00-03:00", "Coreia do Sul", "República Tcheca"],
  ["A", "2026-06-18T13:00:00-03:00", "República Tcheca", "África do Sul"],
  ["A", "2026-06-18T22:00:00-03:00", "México", "Coreia do Sul"],
  ["A", "2026-06-24T22:00:00-03:00", "República Tcheca", "México"],
  ["A", "2026-06-24T22:00:00-03:00", "África do Sul", "Coreia do Sul"],
  ["B", "2026-06-12T16:00:00-03:00", "Canadá", "Bósnia-Herzegovina"],
  ["B", "2026-06-13T16:00:00-03:00", "Qatar", "Suíça"],
  ["B", "2026-06-18T16:00:00-03:00", "Suíça", "Bósnia-Herzegovina"],
  ["B", "2026-06-18T19:00:00-03:00", "Canadá", "Qatar"],
  ["B", "2026-06-24T16:00:00-03:00", "Suíça", "Canadá"],
  ["B", "2026-06-24T16:00:00-03:00", "Bósnia-Herzegovina", "Qatar"],
  ["C", "2026-06-13T19:00:00-03:00", "Brasil", "Marrocos"],
  ["C", "2026-06-13T22:00:00-03:00", "Haiti", "Escócia"],
  ["C", "2026-06-19T19:00:00-03:00", "Escócia", "Marrocos"],
  ["C", "2026-06-19T21:30:00-03:00", "Brasil", "Haiti"],
  ["C", "2026-06-24T19:00:00-03:00", "Escócia", "Brasil"],
  ["C", "2026-06-24T19:00:00-03:00", "Marrocos", "Haiti"],
  ["D", "2026-06-12T22:00:00-03:00", "Estados Unidos", "Paraguai"],
  ["D", "2026-06-14T01:00:00-03:00", "Austrália", "Turquia"],
  ["D", "2026-06-19T16:00:00-03:00", "Estados Unidos", "Austrália"],
  ["D", "2026-06-20T00:00:00-03:00", "Turquia", "Paraguai"],
  ["D", "2026-06-25T23:00:00-03:00", "Turquia", "Estados Unidos"],
  ["D", "2026-06-25T23:00:00-03:00", "Paraguai", "Austrália"],
  ["E", "2026-06-14T14:00:00-03:00", "Alemanha", "Curaçao"],
  ["E", "2026-06-14T20:00:00-03:00", "Costa do Marfim", "Equador"],
  ["E", "2026-06-20T17:00:00-03:00", "Alemanha", "Costa do Marfim"],
  ["E", "2026-06-20T21:00:00-03:00", "Equador", "Curaçao"],
  ["E", "2026-06-25T17:00:00-03:00", "Equador", "Alemanha"],
  ["E", "2026-06-25T17:00:00-03:00", "Curaçao", "Costa do Marfim"],
  ["F", "2026-06-14T17:00:00-03:00", "Holanda", "Japão"],
  ["F", "2026-06-14T23:00:00-03:00", "Suécia", "Tunísia"],
  ["F", "2026-06-20T14:00:00-03:00", "Holanda", "Suécia"],
  ["F", "2026-06-21T01:00:00-03:00", "Tunísia", "Japão"],
  ["F", "2026-06-25T20:00:00-03:00", "Tunísia", "Holanda"],
  ["F", "2026-06-25T20:00:00-03:00", "Japão", "Suécia"],
  ["G", "2026-06-15T16:00:00-03:00", "Bélgica", "Egito"],
  ["G", "2026-06-15T22:00:00-03:00", "Irã", "Nova Zelândia"],
  ["G", "2026-06-21T16:00:00-03:00", "Bélgica", "Irã"],
  ["G", "2026-06-21T22:00:00-03:00", "Nova Zelândia", "Egito"],
  ["G", "2026-06-27T00:00:00-03:00", "Nova Zelândia", "Bélgica"],
  ["G", "2026-06-27T00:00:00-03:00", "Egito", "Irã"],
  ["H", "2026-06-15T13:00:00-03:00", "Espanha", "Cabo Verde"],
  ["H", "2026-06-15T19:00:00-03:00", "Arábia Saudita", "Uruguai"],
  ["H", "2026-06-21T13:00:00-03:00", "Espanha", "Arábia Saudita"],
  ["H", "2026-06-21T19:00:00-03:00", "Uruguai", "Cabo Verde"],
  ["H", "2026-06-26T21:00:00-03:00", "Uruguai", "Espanha"],
  ["H", "2026-06-26T21:00:00-03:00", "Cabo Verde", "Arábia Saudita"],
  ["I", "2026-06-16T16:00:00-03:00", "França", "Senegal"],
  ["I", "2026-06-16T19:00:00-03:00", "Iraque", "Noruega"],
  ["I", "2026-06-22T18:00:00-03:00", "França", "Iraque"],
  ["I", "2026-06-22T21:00:00-03:00", "Noruega", "Senegal"],
  ["I", "2026-06-26T16:00:00-03:00", "Noruega", "França"],
  ["I", "2026-06-26T16:00:00-03:00", "Senegal", "Iraque"],
  ["J", "2026-06-16T22:00:00-03:00", "Argentina", "Argélia"],
  ["J", "2026-06-17T01:00:00-03:00", "Áustria", "Jordânia"],
  ["J", "2026-06-22T14:00:00-03:00", "Argentina", "Áustria"],
  ["J", "2026-06-23T00:00:00-03:00", "Jordânia", "Argélia"],
  ["J", "2026-06-27T23:00:00-03:00", "Jordânia", "Argentina"],
  ["J", "2026-06-27T23:00:00-03:00", "Argélia", "Áustria"],
  ["K", "2026-06-17T14:00:00-03:00", "Portugal", "RD do Congo"],
  ["K", "2026-06-17T23:00:00-03:00", "Uzbequistão", "Colômbia"],
  ["K", "2026-06-23T14:00:00-03:00", "Portugal", "Uzbequistão"],
  ["K", "2026-06-23T23:00:00-03:00", "Colômbia", "RD do Congo"],
  ["K", "2026-06-27T20:30:00-03:00", "Colômbia", "Portugal"],
  ["K", "2026-06-27T20:30:00-03:00", "RD do Congo", "Uzbequistão"],
  ["L", "2026-06-17T17:00:00-03:00", "Inglaterra", "Croácia"],
  ["L", "2026-06-17T20:00:00-03:00", "Gana", "Panamá"],
  ["L", "2026-06-23T17:00:00-03:00", "Inglaterra", "Gana"],
  ["L", "2026-06-23T20:00:00-03:00", "Panamá", "Croácia"],
  ["L", "2026-06-27T18:00:00-03:00", "Panamá", "Inglaterra"],
  ["L", "2026-06-27T18:00:00-03:00", "Croácia", "Gana"],
];

const TEAM_ISO: Record<string, string> = {
  México: "MX",
  "África do Sul": "ZA",
  "Coreia do Sul": "KR",
  "República Tcheca": "CZ",
  Canadá: "CA",
  "Bósnia-Herzegovina": "BA",
  Qatar: "QA",
  Suíça: "CH",
  Brasil: "BR",
  Marrocos: "MA",
  Haiti: "HT",
  Escócia: "GB",
  "Estados Unidos": "US",
  Paraguai: "PY",
  Austrália: "AU",
  Turquia: "TR",
  Alemanha: "DE",
  Curaçao: "CW",
  "Costa do Marfim": "CI",
  Equador: "EC",
  Holanda: "NL",
  Japão: "JP",
  Suécia: "SE",
  Tunísia: "TN",
  Bélgica: "BE",
  Egito: "EG",
  Irã: "IR",
  "Nova Zelândia": "NZ",
  Espanha: "ES",
  "Cabo Verde": "CV",
  "Arábia Saudita": "SA",
  Uruguai: "UY",
  França: "FR",
  Senegal: "SN",
  Iraque: "IQ",
  Noruega: "NO",
  Argentina: "AR",
  Argélia: "DZ",
  Áustria: "AT",
  Jordânia: "JO",
  Portugal: "PT",
  "RD do Congo": "CD",
  Uzbequistão: "UZ",
  Colômbia: "CO",
  Inglaterra: "GB",
  Croácia: "HR",
  Gana: "GH",
  Panamá: "PA",
};

// ── Realistic group results (home_score, away_score) ─────
const GROUP_RESULTS: [number, number][] = [
  // Grupo A
  [2, 0],
  [1, 1],
  [1, 0],
  [3, 1],
  [0, 2],
  [0, 0],
  // Grupo B
  [1, 0],
  [0, 2],
  [1, 1],
  [2, 0],
  [1, 0],
  [1, 2],
  // Grupo C
  [2, 1],
  [0, 3],
  [1, 1],
  [4, 0],
  [1, 2],
  [0, 0],
  // Grupo D
  [1, 0],
  [0, 1],
  [2, 0],
  [2, 0],
  [1, 1],
  [0, 2],
  // Grupo E
  [3, 0],
  [1, 1],
  [2, 0],
  [0, 0],
  [1, 2],
  [0, 1],
  // Grupo F
  [2, 0],
  [1, 0],
  [1, 1],
  [0, 2],
  [0, 1],
  [0, 0],
  // Grupo G
  [1, 0],
  [0, 0],
  [2, 0],
  [1, 0],
  [0, 3],
  [1, 1],
  // Grupo H
  [2, 0],
  [1, 1],
  [4, 0],
  [0, 0],
  [1, 2],
  [0, 1],
  // Grupo I
  [1, 0],
  [1, 2],
  [2, 0],
  [0, 1],
  [0, 0],
  [2, 1],
  // Grupo J
  [2, 1],
  [1, 0],
  [1, 0],
  [0, 0],
  [1, 1],
  [0, 2],
  // Grupo K
  [2, 0],
  [0, 1],
  [3, 0],
  [1, 0],
  [1, 2],
  [0, 0],
  // Grupo L
  [1, 0],
  [2, 0],
  [2, 0],
  [0, 1],
  [0, 3],
  [1, 1],
];

// ── Scoring logic (simplified, matches src/lib/scoring.ts) ─
function scoreMatch(hs: number, as: number, phs: number | null, pas: number | null): number {
  if (phs === null || pas === null) return 0;
  if (hs === phs && as === pas) return 10;

  const realWinner = hs > as ? 1 : hs < as ? -1 : 0;
  const predWinner = phs > pas ? 1 : phs < pas ? -1 : 0;

  if (realWinner === predWinner) {
    const realDiff = Math.abs(hs - as);
    const predDiff = Math.abs(phs - pas);
    if (realDiff === predDiff) return 7;
    return 5;
  }

  if (realWinner === 0 && predWinner === 0) return 3;
  if (hs === phs || as === pas) return 2;
  if (hs === pas && as === phs) return 1;
  return 0;
}

// ── Helpers ───────────────────────────────────────────────
async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function supFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "resolution=merge-duplicates",
      ...init?.headers,
    },
  });
}

async function supAuthFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${SUPABASE_URL}/auth/v1/${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...init?.headers,
    },
  });
}

// ── Seed ──────────────────────────────────────────────────
async function seed() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Erro: Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  console.log("=== Seed Demo — Office Cup 2026 ===\n");

  // ── 1. Auth users ──────────────────────────────────────
  console.log("Criando usuários...");
  const authIds: string[] = [];
  for (const u of DEMO_USERS) {
    const res = await supAuthFetch("admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: u.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      }),
    });
    const body = await res.json();
    if (!res.ok && (body as { code?: number })?.code === 422) {
      // user already exists
      const listRes = await supAuthFetch(
        `admin/users?filter%5Bemail%5D=eq.${encodeURIComponent(u.email)}`,
      );
      const listData = (await listRes.json()) as { users?: { id: string }[] };
      const found = listData?.users?.[0];
      if (found) {
        authIds.push(found.id);
        console.log(`  ${u.full_name} (${u.email}) — já existia`);
        continue;
      }
    }
    const user = body as { id: string };
    if (user?.id) {
      authIds.push(user.id);
      console.log(`  ${u.full_name} (${u.email}) — OK`);
    } else {
      console.error(`  Falha ao criar ${u.email}:`, JSON.stringify(body).slice(0, 200));
    }
    await sleep(300);
  }

  // ── 2. Profiles ────────────────────────────────────────
  console.log("\nInserindo profiles...");
  for (let i = 0; i < DEMO_USERS.length; i++) {
    const u = DEMO_USERS[i];
    await supFetch("profiles", {
      method: "POST",
      body: JSON.stringify({
        id: authIds[i],
        full_name: u.full_name,
        email: u.email,
      }),
    });
    console.log(`  ${u.full_name}`);
  }

  // ── 3. League ──────────────────────────────────────────
  console.log("\nCriando liga...");
  await supFetch("leagues", {
    method: "POST",
    body: JSON.stringify({
      id: LEAGUE_ID,
      admin_id: authIds[0],
      name: LEAGUE_NAME,
      is_active: true,
      payment_status: "paid",
      invite_code: INVITE_CODE,
    }),
  });
  console.log(`  ${LEAGUE_NAME} (código: ${INVITE_CODE})`);

  // ── 4. Members ─────────────────────────────────────────
  console.log("\nInserindo membros...");
  const userSkill = [0.85, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]; // skill weights
  for (let i = 0; i < DEMO_USERS.length; i++) {
    await supFetch("members", {
      method: "POST",
      body: JSON.stringify({
        id: `demo-m${i + 1}`,
        league_id: LEAGUE_ID,
        user_id: authIds[i],
        has_paid_admin: DEMO_USERS[i].admin,
        total_points: 0, // will update later
      }),
    });
    console.log(`  ${DEMO_USERS[i].full_name}`);
  }

  // ── 5. Matches (groups with results) ───────────────────
  console.log("\nInserindo resultados das partidas (grupos)...");
  for (let i = 0; i < GROUP_FIXTURES.length; i++) {
    const [g, date, home, away] = GROUP_FIXTURES[i];
    const [hs, as_] = GROUP_RESULTS[i];
    await supFetch("matches", {
      method: "POST",
      body: JSON.stringify({
        id: `g${i}`,
        home_team: home,
        away_team: away,
        home_flag: TEAM_ISO[home] ?? "",
        away_flag: TEAM_ISO[away] ?? "",
        match_date: date,
        venue_tz: "America/New_York",
        phase: "grupos",
        group: g,
        home_score: hs,
        away_score: as_,
        status: "finished",
        bracket_slot: null,
      }),
    });
  }
  console.log(`  ${GROUP_FIXTURES.length} partidas`);

  // ── 6. Predictions + points ────────────────────────────
  console.log("\nGerando palpites...");
  const allPredictions: Array<{
    id: string;
    user_id: string;
    league_id: string;
    match_id: string;
    slot: number;
    predicted_home_score: number | null;
    predicted_away_score: number | null;
    predicted_goalscorers: string[];
    is_zebra: boolean;
    points_earned: number;
  }> = [];

  for (let mi = 0; mi < GROUP_FIXTURES.length; mi++) {
    const [hs, as_] = GROUP_RESULTS[mi];
    for (let ui = 0; ui < DEMO_USERS.length; ui++) {
      const skill = userSkill[ui];
      // Generate prediction that deviates from real result based on skill
      const maxDev = Math.max(1, Math.round((1 - skill) * 3));
      const devH = Math.floor(rand() * (maxDev + 1));
      const devA = Math.floor(rand() * (maxDev + 1));
      const phs = Math.max(0, hs + (rand() > 0.5 ? devH : -devH));
      const pas = Math.max(0, as_ + (rand() > 0.5 ? devA : -devA));
      const pts = scoreMatch(hs, as_, phs, pas);

      allPredictions.push({
        id: `demo-p${mi}-u${ui}`,
        user_id: authIds[ui],
        league_id: LEAGUE_ID,
        match_id: `g${mi}`,
        slot: 1,
        predicted_home_score: phs,
        predicted_away_score: pas,
        predicted_goalscorers: [],
        is_zebra: false,
        points_earned: pts,
      });
    }
  }

  // Batch insert predictions
  const BATCH = 100;
  for (let i = 0; i < allPredictions.length; i += BATCH) {
    const batch = allPredictions.slice(i, i + BATCH);
    await supFetch("predictions", {
      method: "POST",
      body: JSON.stringify(batch),
    });
    const batchEnd = Math.min(i + BATCH, allPredictions.length);
    process.stdout.write(`\r  ${batchEnd}/${allPredictions.length} palpites`);
  }
  console.log("\n");

  // ── 7. Update total_points ─────────────────────────────
  console.log("Calculando pontuação total...");
  const totals = new Map<string, number>();
  for (const p of allPredictions) {
    totals.set(p.user_id, (totals.get(p.user_id) || 0) + p.points_earned);
  }
  for (let i = 0; i < DEMO_USERS.length; i++) {
    const uid = authIds[i];
    const total = totals.get(uid) || 0;
    await supFetch(`members?league_id=eq.${LEAGUE_ID}&user_id=eq.${uid}`, {
      method: "PATCH",
      body: JSON.stringify({ total_points: total }),
    });
    console.log(`  ${DEMO_USERS[i].full_name}: ${total} pts`);
  }

  console.log("\n=== Seed concluído! ===");
  console.log(`Admin: admin@demo.com / ${PASSWORD}`);
  console.log(`Qualquer membro: *@demo.com / ${PASSWORD}`);
  console.log(`Código convite: ${INVITE_CODE}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
