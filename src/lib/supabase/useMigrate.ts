import { useEffect, useState } from "react";
import { upsertPrediction } from "./predictions";
import { upsertMember } from "./members";

const MIGRATED_KEY = "supabase_migrated";

export function useMigrate(userId: string | null) {
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const migratedKey = `${MIGRATED_KEY}_${userId}`;
    if (localStorage.getItem(migratedKey)) return;

    setMigrating(true);
    migrateLocalData(userId)
      .then(() => localStorage.setItem(migratedKey, "1"))
      .catch((err) => console.error("Migration error", err))
      .finally(() => setMigrating(false));
  }, [userId]);

  return { migrating };
}

async function migrateLocalData(newUserId: string) {
  const raw = localStorage.getItem("officecup-2026");
  if (!raw) return;

  const data = JSON.parse(raw);
  const predictions = data?.state?.predictions ?? [];

  if (predictions.length > 0) {
    for (const p of predictions) {
      try {
        await upsertPrediction(newUserId, p.match_id, p.slot ?? 1, {
          predicted_home_score: p.predicted_home_score,
          predicted_away_score: p.predicted_away_score,
          predicted_goalscorers: p.predicted_goalscorers ?? [],
          points_earned: p.points_earned ?? 0,
          is_zebra: p.is_zebra ?? false,
        });
      } catch (err) {
        console.warn("Erro ao migrar palpite", p.match_id, err);
      }
    }
  }

  const members = data?.state?.members ?? [];
  const existing = members.find((m: { user_id: string }) => m.user_id === newUserId);
  if (existing) {
    await upsertMember(newUserId, "default", existing.total_points ?? 0);
  } else {
    await upsertMember(newUserId);
  }
}
