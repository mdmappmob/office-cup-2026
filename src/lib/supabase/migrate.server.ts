import { createServerFn } from "@tanstack/react-start";

async function supabaseFetch(
  supabaseUrl: string,
  serviceKey: string,
  path: string,
  body: unknown,
  params?: string,
) {
  const url = `${supabaseUrl}/rest/v1/${path}${params ? `?${params}` : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path}: ${res.status} ${text}`);
  }
}

export const migrateUserData = createServerFn({ method: "POST" })
  .validator(
    (d: {
      supabaseUrl?: string;
      userId: string;
      predictions: Array<{
        match_id: string;
        slot: number;
        predicted_home_score: number | null;
        predicted_away_score: number | null;
        predicted_goalscorers: string[];
        points_earned: number;
        is_zebra: boolean;
      }>;
      totalPoints: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { userId, predictions, totalPoints } = data;

    const supabaseUrl =
      data.supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !serviceKey) {
      return { ok: false, error: "Credenciais Supabase não configuradas no servidor" };
    }

    try {
      // Liga
      await supabaseFetch(supabaseUrl, serviceKey, "leagues", [
        {
          id: "l1",
          admin_id: userId,
          name: "Bolão da Diretoria 2026",
          is_active: true,
          payment_status: "paid",
        },
      ], "on_conflict=id");

      // Matches
      if (predictions.length > 0) {
        const ids = [...new Set(predictions.map((p) => p.match_id))].filter(Boolean);
        await supabaseFetch(
          supabaseUrl,
          serviceKey,
          "matches",
          ids.map((id) => ({
            id,
            home_team: "_",
            away_team: "_",
            match_date: "2026-06-11T00:00:00.000Z",
            phase: "_",
          })),
          "on_conflict=id",
        );
      }

      // Predictions
      if (predictions.length > 0) {
        await supabaseFetch(
          supabaseUrl,
          serviceKey,
          "predictions",
          predictions.map((p) => ({
            user_id: userId,
            league_id: "l1",
            match_id: p.match_id,
            slot: p.slot,
            predicted_home_score: p.predicted_home_score,
            predicted_away_score: p.predicted_away_score,
            predicted_goalscorers: p.predicted_goalscorers,
            points_earned: p.points_earned,
            is_zebra: p.is_zebra,
          })),
          "on_conflict=user_id,match_id,slot",
        );
      }

      // Members
      await supabaseFetch(supabaseUrl, serviceKey, "members", [
        {
          user_id: userId,
          league_id: "l1",
          has_paid_admin: false,
          total_points: totalPoints,
        },
      ], "on_conflict=league_id,user_id");

      return { ok: true, predCount: predictions.length };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });
