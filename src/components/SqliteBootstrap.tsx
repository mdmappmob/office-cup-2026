import { useEffect } from "react";
import { openDb, listUsersDebug } from "@/lib/db/sqlite-repo";
import { IDB_NAME, IDB_STORE, IDB_KEY, SESSION_KEY } from "@/lib/db/config";
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
          // eslint-disable-next-line no-console
          console.info(
            `[sqlite] base local pronta · IndexedDB="${IDB_NAME}" store="${IDB_STORE}" key="${IDB_KEY}" · session key (localStorage)="${SESSION_KEY}" · usuários=${users.length}`,
            users,
          );
        }
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