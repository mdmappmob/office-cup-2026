import { useEffect, useState } from "react";
import { upsertPrediction } from "./predictions";
import { upsertMember } from "./members";

const MIGRATED_KEY = "supabase_migrated";

export function useMigrate(userId: string | null) {
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (localStorage.getItem(MIGRATED_KEY)) return;

    setMigrating(true);
    migrateLocalData(userId)
      .then(() => localStorage.setItem(MIGRATED_KEY, "1"))
      .catch((err) => console.error("Migration error", err))
      .finally(() => setMigrating(false));
  }, [userId]);

  return { migrating };
}

async function migrateLocalData(userId: string) {
  const raw = localStorage.getItem("officecup-2026");
  if (!raw) return;

  const data = JSON.parse(raw);
  const predictions = data?.state?.predictions ?? [];

  if (predictions.length > 0) {
    for (const p of predictions) {
      try {
        await upsertPrediction(userId, p.match_id, p.slot ?? 1, p);
      } catch (err) {
        console.warn("Erro ao migrar palpite", p.match_id, err);
      }
    }
  }

  const members = data?.state?.members ?? [];
  if (members.length > 0) {
    const existing = members.find((m: { user_id: string }) => m.user_id === userId);
    if (existing) {
      await upsertMember(userId, "default", existing.total_points ?? 0);
    } else {
      await upsertMember(userId);
    }
  }
}
