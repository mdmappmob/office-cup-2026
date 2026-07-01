import { createServerFn } from "@tanstack/react-start";
import { scoreMatch } from "@/lib/scoring";
import { analyzeMatch } from "@/lib/copilot";
import type { MockMatch, MockPrediction } from "@/mocks/types";

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

export const settleAllPredictions = createServerFn({ method: "POST" })
  .validator(
    (d: {
      supabaseUrl?: string;
      matchId: string;
      homeScore: number;
      awayScore: number;
      extraHomeScore: number | null;
      extraAwayScore: number | null;
      homeTeam: string;
      awayTeam: string;
      homeFlag: string;
      awayFlag: string;
      matchDate: string;
      venueTz: string | null;
      phase: string;
      group: string | null;
      status: string;
      bracketSlot: string | null;
      winner: string | null;
      winnerFlag: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabaseUrl = data.supabaseUrl || process.env.VITE_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!supabaseUrl || !serviceKey) {
      return { ok: false, error: "Credenciais não configuradas" };
    }

    const match: MockMatch = {
      id: data.matchId,
      home_team: data.homeTeam,
      away_team: data.awayTeam,
      home_flag: data.homeFlag,
      away_flag: data.awayFlag,
      match_date: data.matchDate,
      venue_tz: data.venueTz ?? "",
      phase: data.phase as MockMatch["phase"],
      group: data.group ?? "",
      home_score: data.homeScore,
      away_score: data.awayScore,
      extra_home_score: data.extraHomeScore,
      extra_away_score: data.extraAwayScore,
      winner: data.winner ?? undefined,
      winner_flag: data.winnerFlag ?? undefined,
      status: "finished",
      bracket_slot: data.bracketSlot ?? "",
    };

    try {
      const res = await supabaseFetch(
        supabaseUrl,
        serviceKey,
        `predictions?match_id=eq.${data.matchId}&select=*`,
      );
      const allPredictions = (await res.json()) as Array<{
        id: string;
        user_id: string;
        predicted_home_score: number | null;
        predicted_away_score: number | null;
        predicted_goalscorers: string[];
      }>;

      const affectedUsers = new Set<string>();

      for (const p of allPredictions) {
        const pred: MockPrediction = {
          id: p.id,
          user_id: p.user_id,
          league_id: "",
          match_id: data.matchId,
          slot: 1,
          predicted_home_score: p.predicted_home_score,
          predicted_away_score: p.predicted_away_score,
          predicted_home_lineup: [],
          predicted_away_lineup: [],
          predicted_goalscorers: p.predicted_goalscorers ?? [],
          is_zebra: false,
          points_earned: 0,
        };
        const points = scoreMatch(match, pred);
        const analysis = analyzeMatch(match, pred);
        await supabaseFetch(supabaseUrl, serviceKey, `predictions?id=eq.${p.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            points_earned: points,
            is_zebra: analysis.isZebra,
          }),
        });
        affectedUsers.add(p.user_id);
      }

      // Upsert match result so other users see it
      await supabaseFetch(supabaseUrl, serviceKey, "matches", {
        method: "POST",
        body: JSON.stringify({
          id: data.matchId,
          home_team: data.homeTeam,
          away_team: data.awayTeam,
          home_flag: data.homeFlag,
          away_flag: data.awayFlag,
          match_date: data.matchDate,
          venue_tz: data.venueTz ?? null,
          phase: data.phase,
          group: data.group ?? null,
          home_score: data.homeScore,
          away_score: data.awayScore,
          extra_home_score: data.extraHomeScore,
          extra_away_score: data.extraAwayScore,
          status: "finished",
          bracket_slot: data.bracketSlot ?? null,
          winner: data.winner,
          winner_flag: data.winnerFlag,
        }),
      });

      // Recalcular total_points de cada usuario afetado
      for (const uid of affectedUsers) {
        const predsRes = await supabaseFetch(
          supabaseUrl,
          serviceKey,
          `predictions?user_id=eq.${uid}&select=points_earned`,
        );
        const userPreds = (await predsRes.json()) as Array<{ points_earned: number }>;
        const total = userPreds.reduce((sum, p) => sum + (p.points_earned ?? 0), 0);
        await supabaseFetch(supabaseUrl, serviceKey, `members?user_id=eq.${uid}&league_id=eq.l1`, {
          method: "PATCH",
          body: JSON.stringify({ total_points: total }),
        });
      }

      return { ok: true, count: allPredictions.length };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });
