import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

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

    const admin = createClient(supabaseUrl, serviceKey);

    try {
      // Garante que a liga padrão existe
      await admin.from("leagues").upsert(
        {
          id: "l1",
          admin_id: userId,
          name: "Bolão da Diretoria 2026",
          is_active: true,
          payment_status: "paid",
        },
        { onConflict: "id" },
      );

      // Garante que os match_ids dos palpites existem na tabela matches
      if (predictions.length > 0) {
        const ids = [...new Set(predictions.map((p) => p.match_id))].filter(Boolean);
        for (const id of ids) {
          const { error } = await admin.from("matches").upsert(
            {
              id,
              home_team: "TBD",
              away_team: "TBD",
              home_flag: "",
              away_flag: "",
              match_date: "2026-06-11T00:00:00.000Z",
              phase: "grupos",
            },
            { onConflict: "id" },
          );
          if (error) return { ok: false, error: `match upsert [${id}]: ${error.message}` };
        }
      }

      if (predictions.length > 0) {
        const rows = predictions.map((p) => ({
          user_id: userId,
          league_id: "l1",
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
          league_id: "l1",
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
