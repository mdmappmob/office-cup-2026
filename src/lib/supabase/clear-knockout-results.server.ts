import { createServerFn } from "@tanstack/react-start";

async function supabaseFetch(
  supabaseUrl: string,
  serviceKey: string,
  path: string,
  init?: RequestInit,
) {
  const url = `${supabaseUrl}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "resolution=merge-duplicates",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path}: ${res.status} ${text}`);
  }
  return res;
}

export const clearKnockoutResults = createServerFn({ method: "POST" })
  .validator((d: { leagueId: string }) => d)
  .handler(async ({ data }) => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!supabaseUrl || !serviceKey) {
      return { ok: false, error: "Credenciais não configuradas" };
    }
    try {
      // 1. Zerar scores de todas as partidas em matches
      await supabaseFetch(supabaseUrl, serviceKey, "matches", {
        method: "PATCH",
        body: JSON.stringify({
          home_score: null,
          away_score: null,
          status: "scheduled",
        }),
        headers: {
          Prefer: "resolution=merge-duplicates",
        },
      } as RequestInit);

      // 2. Deletar predictions das fases mata-mata (r32+)
      const knockoutPrefixes = ["r", "o", "q", "s", "f"];
      let deletedPredictions = 0;
      for (const prefix of knockoutPrefixes) {
        const res = await supabaseFetch(
          supabaseUrl,
          serviceKey,
          `predictions?match_id=like.${prefix}*&league_id=eq.${data.leagueId}&select=id`,
        );
        const existing = (await res.json()) as Array<{ id: string }>;
        for (const row of existing) {
          await supabaseFetch(supabaseUrl, serviceKey, `predictions?id=eq.${row.id}`, {
            method: "DELETE",
            body: undefined,
          });
          deletedPredictions++;
        }
      }

      // 3. Recalcular total_points de cada membro apenas com predictions de grupos
      const membersRes = await supabaseFetch(
        supabaseUrl,
        serviceKey,
        `members?league_id=eq.${data.leagueId}&select=user_id`,
      );
      const members = (await membersRes.json()) as Array<{ user_id: string }>;
      for (const m of members) {
        const predsRes = await supabaseFetch(
          supabaseUrl,
          serviceKey,
          `predictions?user_id=eq.${m.user_id}&select=points_earned`,
        );
        const userPreds = (await predsRes.json()) as Array<{ points_earned: number }>;
        const total = userPreds.reduce((sum, p) => sum + (p.points_earned ?? 0), 0);
        await supabaseFetch(
          supabaseUrl,
          serviceKey,
          `members?user_id=eq.${m.user_id}&league_id=eq.${data.leagueId}`,
          { method: "PATCH", body: JSON.stringify({ total_points: total }) },
        );
      }

      return { ok: true, deletedPredictions, recalculated: members.length };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });
