import { readFileSync } from "node:fs";

const env: Record<string, string> = {};
for (const l of readFileSync(".env", "utf-8").split("\n")) {
  const t = l.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const h = {
  "Content-Type": "application/json",
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
};

const r = await fetch(
  env.VITE_SUPABASE_URL + "/rest/v1/matches?select=id,home_team,away_team,home_score,away_score,status,phase&home_score=not.is.null&order=match_date.asc",
  { headers: h },
);
const data = await r.json();
console.log("Partidas com resultado (" + data.length + "):");
for (const m of data) {
  const date = m.id.startsWith("g") ? "" : m.id;
  console.log(`  ${m.id} ${m.home_team}×${m.away_team} ${m.home_score}×${m.away_score} (${m.phase}) ${m.status}`);
}
