import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const migrateUserData = createServerFn({ method: "POST" })
  .validator((d: {
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
  }) => d)
  .handler(async ({ data }) => {
    const { userId, predictions, totalPoints } = data;

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return { ok: false, error: "Credenciais Supabase não configuradas no servidor" };
    }

    const admin = createClient(supabaseUrl, serviceKey);

    try {
      if (predictions.length > 0) {
        const rows = predictions.map((p) => ({
          user_id: userId,
          league_id: "default",
          match_id: p.match_id,
          slot: p.slot,
          predicted_home_score: p.predicted_home_score,
          predicted_away_score: p.predicted_away_score,
          predicted_goalscorers: p.predicted_goalscorers,
          points_earned: p.points_earned,
          is_zebra: p.is_zebra,
        }));
        const { error: predErr } = await admin.from("predictions").upsert(rows, {
          onConflict: "user_id,match_id,slot",
        });
        if (predErr) return { ok: false, error: predErr.message };
      }

      const { error: memberErr } = await admin.from("members").upsert(
        {
          user_id: userId,
          league_id: "default",
          has_paid_admin: false,
          total_points: totalPoints,
        },
        { onConflict: "league_id,user_id" },
      );
      if (memberErr) return { ok: false, error: memberErr.message };

      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });
