import { useEffect, useState } from "react";
import { supabase } from "./client";
import { upsertPrediction } from "./predictions";
import { upsertMember } from "./members";
import { findUserByEmail } from "@/lib/db/sqlite-repo";

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

  const { data: userData } = await supabase.auth.getUser();
  const email = userData?.user?.email;
  if (!email) return;

  const oldUser = await findUserByEmail(email);
  if (!oldUser) {
    console.warn("Migration: nenhum usuário SQLite encontrado com este email");
    return;
  }
  const oldUserId = oldUser.user.id;

  const data = JSON.parse(raw);
  const allPredictions = data?.state?.predictions ?? [];
  const userPredictions = allPredictions.filter(
    (p: { user_id: string }) => p.user_id === oldUserId,
  );

  if (userPredictions.length > 0) {
    for (const p of userPredictions) {
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
  const existing = members.find((m: { user_id: string }) => m.user_id === oldUserId);
  if (existing) {
    await upsertMember(newUserId, "default", existing.total_points ?? 0);
  } else {
    await upsertMember(newUserId);
  }

  await supabase.auth.updateUser({
    data: { full_name: oldUser.user.full_name, is_admin: oldUser.user.is_admin },
  });
}
