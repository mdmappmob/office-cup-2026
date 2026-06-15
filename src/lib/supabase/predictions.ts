import { supabase } from "./client";

export interface PredictionRow {
  id: string;
  user_id: string;
  league_id: string;
  match_id: string;
  slot: number;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_goalscorers: string[];
  points_earned: number;
  is_zebra: boolean;
  created_at: string;
}

export async function fetchPredictions(userId: string): Promise<PredictionRow[]> {
  const { data, error } = await supabase.from("predictions").select("*").eq("user_id", userId);

  if (error) throw error;
  return (data ?? []) as PredictionRow[];
}

export async function upsertPrediction(
  userId: string,
  matchId: string,
  slot: number,
  patch: Partial<PredictionRow>,
): Promise<PredictionRow> {
  const { data, error } = await supabase
    .from("predictions")
    .upsert(
      {
        user_id: userId,
        match_id: matchId,
        slot,
        predicted_home_score: patch.predicted_home_score ?? null,
        predicted_away_score: patch.predicted_away_score ?? null,
        predicted_goalscorers: patch.predicted_goalscorers ?? [],
        points_earned: patch.points_earned ?? 0,
        is_zebra: patch.is_zebra ?? false,
      } as never,
      { onConflict: "user_id,match_id,slot" },
    )
    .select()
    .single();

  if (error) throw error;
  return data as PredictionRow;
}

export async function settlePredictions(
  matchId: string,
  pointsMap: Array<{ userId: string; points: number; isZebra: boolean }>,
): Promise<void> {
  for (const { userId, points, isZebra } of pointsMap) {
    const { error } = await supabase
      .from("predictions")
      .update({ points_earned: points, is_zebra: isZebra } as never)
      .eq("user_id", userId)
      .eq("match_id", matchId);

    if (error) console.error("Erro ao atualizar pontos", error);
  }
}
