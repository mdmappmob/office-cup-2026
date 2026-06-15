import { useEffect } from "react";
import { openDb, listUsersDebug } from "@/lib/db/sqlite-repo";
import { IDB_NAME, IDB_STORE, IDB_RECORD_ID, SESSION_ID } from "@/lib/db/config";
import { restoreSession, useAuthStore } from "@/store/auth-store";

export function SqliteBootstrap() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await openDb();
        await restoreSession();
        if (import.meta.env.DEV) {
          const users = await listUsersDebug();

          console.info(
            `[sqlite] base local pronta · IndexedDB="${IDB_NAME}" store="${IDB_STORE}" key="${IDB_RECORD_ID}" · session id (localStorage)="${SESSION_ID}" · usuários=${users.length}`,
            users,
          );
        }
      } catch (err) {
        console.error("[sqlite] boot failed", err);
      } finally {
        if (!cancelled) useAuthStore.getState().setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
