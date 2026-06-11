import { useEffect } from "react";
import { openDb } from "@/lib/db/sqlite-repo";
import { restoreSession, useAuthStore } from "@/store/auth-store";

export function SqliteBootstrap() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await openDb();
        await restoreSession();
      } catch (err) {
        console.error("[sqlite] boot failed", err);
      } finally {
        if (!cancelled) useAuthStore.getState().setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return null;
}