import { useEffect, useState } from "react";
import { migrateUserData } from "./migrate.server";

const MIGRATED_KEY = "supabase_migrated";

export function useMigrate(userId: string | null) {
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const migratedKey = `${MIGRATED_KEY}_${userId}`;
    if (localStorage.getItem(migratedKey)) return;

    setMigrating(true);
    migrateLocalData(userId)
      .then((ok) => {
        if (ok) localStorage.setItem(migratedKey, "1");
      })
      .catch((err) => console.error("Migration error", err))
      .finally(() => setMigrating(false));
  }, [userId]);

  return { migrating };
}

async function migrateLocalData(newUserId: string): Promise<boolean> {
  const raw = localStorage.getItem("officecup-2026");
  if (!raw) return false;

  const data = JSON.parse(raw);
  const predictions = data?.state?.predictions ?? [];
  const members = data?.state?.members ?? [];
  const totalPoints =
    members.find((m: { user_id: string }) => m.user_id === newUserId)?.total_points ?? 0;

  const result = await migrateUserData({
    data: {
      userId: newUserId,
      predictions: predictions.map((p: Record<string, unknown>) => ({
        match_id: p.match_id as string,
        slot: (p.slot as number) ?? 1,
        predicted_home_score: (p.predicted_home_score as number | null) ?? null,
        predicted_away_score: (p.predicted_away_score as number | null) ?? null,
        predicted_goalscorers: (p.predicted_goalscorers as string[]) ?? [],
        points_earned: (p.points_earned as number) ?? 0,
        is_zebra: (p.is_zebra as boolean) ?? false,
      })),
      totalPoints,
    },
  });

  if (!result.ok) {
    console.error("Migration error", result.error);
    return false;
  }
  return true;
}
