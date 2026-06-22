import { readFileSync } from "node:fs";

const env: Record<string, string> = {};
for (const l of readFileSync(".env", "utf-8").split("\n")) {
  const t = l.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const BASE = env.VITE_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const h = {
  "Content-Type": "application/json",
  apikey: KEY,
  Authorization: "Bearer " + KEY,
};

async function patch(path: string, body: unknown) {
  const r = await fetch(BASE + "/rest/v1/" + path, {
    method: "PATCH",
    headers: { ...h, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.error("  FAIL", path, r.status, await r.text().catch(() => ""));
  else process.stdout.write(".");
}

// 1. Clear all match results (one by one is safer than WHERE)
const matches: { id: string }[] = await (await fetch(BASE + "/rest/v1/matches?select=id&home_score=not.is.null", { headers: h })).json();
console.log("Matches to clear:", matches.length);
for (const m of matches) {
  await patch("matches?id=eq." + m.id, { home_score: null, away_score: null, status: "scheduled" });
}
console.log("\nMatches done");

// 2. Clear all prediction points for l1
const preds: { id: string }[] = await (await fetch(BASE + "/rest/v1/predictions?select=id&league_id=eq.l1&points_earned=gt.0", { headers: h })).json();
console.log("Predictions to clear:", preds.length);
for (const p of preds) {
  await patch("predictions?id=eq." + p.id, { points_earned: 0, is_zebra: false });
}
console.log("\nPredictions done");

// 3. Clear member totals for l1
const members: { id: string }[] = await (await fetch(BASE + "/rest/v1/members?select=id&league_id=eq.l1&total_points=gt.0", { headers: h })).json();
console.log("Members to clear:", members.length);
for (const m of members) {
  await patch("members?id=eq." + m.id, { total_points: 0 });
}
console.log("\nMembers done");

console.log("\n=== VERIFICANDO ===");
const mc = await (await fetch(BASE + "/rest/v1/matches?select=id&home_score=not.is.null&limit=1", { headers: h })).json();
console.log("Matches with scores:", mc.length);
const pc = await (await fetch(BASE + "/rest/v1/predictions?select=id&league_id=eq.l1&points_earned=gt.0&limit=1", { headers: h })).json();
console.log("Predictions with points:", pc.length);
const mm = await (await fetch(BASE + "/rest/v1/members?select=id&league_id=eq.l1&total_points=gt.0&limit=1", { headers: h })).json();
console.log("Members with points:", mm.length);
