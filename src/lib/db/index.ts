import type { MockMatch, MockPrediction, MatchPhase } from "@/mocks/types";
import { useAppStore } from "@/store/app-store";
import {
  isSqliteReady,
  sqliteListMatches,
  sqliteGetMatch,
  sqliteListByPhase,
  sqliteListByGroup,
  sqliteUpsertPrediction,
} from "./sqlite-repo";

/**
 * Camada de acesso "tipo DB". Hoje lê/escreve do Zustand store (mocks + persistência local).
 * Quando trocarmos por SQLite (sql.js) ou Postgres (Lovable Cloud), só esta camada muda.
 * Veja src/lib/db/README.md.
 */
export interface MatchesRepo {
  listMatches(): MockMatch[];
  getMatch(id: string): MockMatch | undefined;
  listByPhase(phase: MatchPhase): MockMatch[];
  listByGroup(group: string): MockMatch[];
}

export interface PredictionsRepo {
  listPredictions(): MockPrediction[];
  getPrediction(matchId: string): MockPrediction | undefined;
  upsertPrediction(matchId: string, patch: Partial<MockPrediction>): void;
}

export const matchesRepo: MatchesRepo = {
  // Lê do SQLite quando disponível; cai pro store enquanto a base inicializa
  // e também para refletir mutações de bracket calculadas em memória.
  listMatches: () =>
    isSqliteReady() && useAppStore.getState().matches.length === 0
      ? sqliteListMatches()
      : useAppStore.getState().matches,
  getMatch: (id) =>
    useAppStore.getState().matches.find((m) => m.id === id) ??
    (isSqliteReady() ? sqliteGetMatch(id) : undefined),
  listByPhase: (phase) =>
    useAppStore.getState().matches.filter((m) => m.phase === phase).length > 0
      ? useAppStore.getState().matches.filter((m) => m.phase === phase)
      : isSqliteReady()
        ? sqliteListByPhase(phase)
        : [],
  listByGroup: (group) =>
    useAppStore.getState().matches.filter((m) => m.group === group).length > 0
      ? useAppStore.getState().matches.filter((m) => m.group === group)
      : isSqliteReady()
        ? sqliteListByGroup(group)
        : [],
};

export const predictionsRepo: PredictionsRepo = {
  listPredictions: () => useAppStore.getState().predictions,
  getPrediction: (matchId) =>
    useAppStore.getState().predictions.find((p) => p.match_id === matchId),
  upsertPrediction: (matchId, patch) => {
    useAppStore.getState().upsertPrediction(matchId, patch);
    if (isSqliteReady()) {
      const updated = useAppStore.getState().predictions.find((p) => p.match_id === matchId);
      if (updated) void sqliteUpsertPrediction(updated);
    }
  },
};

export { getSeedMatches } from "./seed";