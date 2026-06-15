import type { MockMatch, MockPrediction, MatchPhase } from "@/mocks/types";
import { useAppStore } from "@/store/app-store";

// Local-only repos backed by the zustand app-store (persisted via localStorage).
// User accounts live in SQLite (see sqlite-repo.ts). Matches/predictions stay
// in the store to keep the bracket recomputation logic untouched.

export interface MatchesRepo {
  listMatches(): MockMatch[];
  getMatch(id: string): MockMatch | undefined;
  listByPhase(phase: MatchPhase): MockMatch[];
  listByGroup(group: string): MockMatch[];
}

export interface PredictionsRepo {
  listPredictions(): MockPrediction[];
  getPrediction(matchId: string): MockPrediction | undefined;
  upsertPrediction(matchId: string, patch: Partial<MockPrediction>, slot?: number): void;
  removePrediction(predictionId: string): void;
  settleMatch(matchId: string, homeScore: number, awayScore: number): void;
}

export const matchesRepo: MatchesRepo = {
  listMatches: () => useAppStore.getState().matches,
  getMatch: (id) => useAppStore.getState().matches.find((m) => m.id === id),
  listByPhase: (phase) => useAppStore.getState().matches.filter((m) => m.phase === phase),
  listByGroup: (group) => useAppStore.getState().matches.filter((m) => m.group === group),
};

export const predictionsRepo: PredictionsRepo = {
  listPredictions: () => useAppStore.getState().predictions,
  getPrediction: (matchId) =>
    useAppStore
      .getState()
      .predictions.find(
        (p) =>
          p.match_id === matchId &&
          p.user_id === useAppStore.getState().currentUserId &&
          p.slot === 1,
      ),
  upsertPrediction: (matchId, patch, slot = 1) => {
    useAppStore.getState().upsertPrediction(matchId, patch, slot);
  },
  removePrediction: (predictionId: string) => {
    useAppStore.getState().removePrediction(predictionId);
  },
  settleMatch: (matchId, homeScore, awayScore) => {
    useAppStore.getState().settleMatch(matchId, homeScore, awayScore);
  },
};
