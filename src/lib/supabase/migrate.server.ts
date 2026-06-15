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
      matches: Array<{
        id: string;
        home_team: string;
        away_team: string;
        home_flag: string;
        away_flag: string;
        match_date: string;
        phase: string;
        group?: string;
      }>;
      totalPoints: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { userId, predictions, matches, totalPoints } = data;

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

      if (matches.length > 0) {
        const { error: matchErr } = await admin.from("matches").upsert(
          matches.map((m) => ({
            id: m.id,
            home_team: m.home_team,
            away_team: m.away_team,
            home_flag: m.home_flag,
            away_flag: m.away_flag,
            match_date: m.match_date,
            phase: m.phase,
            group: m.group ?? null,
          })),
          { onConflict: "id" },
        );
        if (matchErr) return { ok: false, error: matchErr.message };
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
