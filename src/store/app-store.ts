import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mockMatches } from "@/mocks/matches";
import { CURRENT_LEAGUE_ID } from "@/mocks/leagues";
import type {
  MockMatch,
  MockPrediction,
  MockLeagueMember,
  MatchPhase,
} from "@/mocks/types";
import { PHASE_ORDER } from "@/mocks/types";
import { scoreMatch } from "@/lib/scoring";
import { computeBracket as computeOfficialBracket } from "@/lib/bracket";

interface AppState {
  currentUserId: string;
  currentLeagueId: string;
  isAdmin: boolean;
  matches: MockMatch[];
  predictions: MockPrediction[];
  members: MockLeagueMember[];
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
  setAdmin: (v: boolean) => void;
  setCurrentUser: (userId: string, isAdmin: boolean) => void;
  upsertPrediction: (matchId: string, patch: Partial<MockPrediction>, slot?: number) => void;
  addPredictionSlot: (matchId: string) => MockPrediction;
  removePrediction: (predictionId: string) => void;
  predictionsForMatch: (matchId: string, userId?: string) => MockPrediction[];
  settleMatch: (matchId: string, homeScore: number, awayScore: number) => void;
  toggleMemberPaid: (memberId: string) => void;
  unlockedPhases: () => MatchPhase[];
  matchesByPhase: (phase: MatchPhase) => MockMatch[];
  predictionFor: (matchId: string) => MockPrediction | undefined;
  phaseProgress: (phase: MatchPhase) => { filled: number; total: number };
  regenerateBracket: () => void;
  recomputeStandings: () => void;
}

function makeEmptyPrediction(matchId: string, slot: number = 1, userId: string = ""): MockPrediction {
  return {
    id: `p-${matchId}-${userId}-s${slot}`,
    user_id: userId,
    league_id: CURRENT_LEAGUE_ID,
    match_id: matchId,
    slot,
    predicted_home_score: null,
    predicted_away_score: null,
    predicted_home_lineup: [],
    predicted_away_lineup: [],
    predicted_goalscorers: [],
    is_zebra: false,
    points_earned: 0,
  };
}

function computeBracket(matches: MockMatch[], predictions: MockPrediction[]): MockMatch[] {
  return computeOfficialBracket(matches, predictions);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUserId: "",
      currentLeagueId: CURRENT_LEAGUE_ID,
      isAdmin: false,
      matches: mockMatches,
      predictions: [],
      members: [],
      theme: "light",
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
      setAdmin: (v) => set({ isAdmin: v }),
      setCurrentUser: (userId, isAdmin) => set((state) => {
        const exists = state.members.some((member) => member.user_id === userId);
        return {
          currentUserId: userId,
          isAdmin,
          members: exists
            ? state.members
            : [
                ...state.members,
                {
                  id: `m-${userId}`,
                  league_id: state.currentLeagueId,
                  user_id: userId,
                  has_paid_admin: isAdmin,
                  total_points: 0,
                },
              ],
        };
      }),
      upsertPrediction: (matchId, patch, slot = 1) => {
        const userId = get().currentUserId;
        const existing = get().predictions.find(
          (p) => p.match_id === matchId && p.user_id === userId && p.slot === slot,
        );
        const merged: MockPrediction = existing
          ? { ...existing, ...patch }
          : { ...makeEmptyPrediction(matchId, slot, userId), ...patch };
        const others = get().predictions.filter((p) => p.id !== merged.id);
        const newPredictions = [...others, merged];
        const newMatches = computeBracket(get().matches, newPredictions);
        set({ predictions: newPredictions, matches: newMatches });
      },
      addPredictionSlot: (matchId) => {
        const userId = get().currentUserId;
        const slots = get()
          .predictions.filter((p) => p.match_id === matchId && p.user_id === userId)
          .map((p) => p.slot);
        const nextSlot = (slots.length === 0 ? 0 : Math.max(...slots)) + 1;
        const empty = makeEmptyPrediction(matchId, nextSlot, userId);
        set({ predictions: [...get().predictions, empty] });
        return empty;
      },
      removePrediction: (predictionId) => {
        set({ predictions: get().predictions.filter((p) => p.id !== predictionId) });
      },
      predictionsForMatch: (matchId, userId) => {
        const uid = userId ?? get().currentUserId;
        return get()
          .predictions.filter((p) => p.match_id === matchId && p.user_id === uid)
          .sort((a, b) => a.slot - b.slot);
      },
      settleMatch: (matchId, homeScore, awayScore) => {
        const newMatches = get().matches.map((m) =>
          m.id === matchId
            ? { ...m, home_score: homeScore, away_score: awayScore, status: "finished" as const }
            : m,
        );
        // Recalcula pontos das predições (mantém a melhor pontuação por user+match na vista)
        const settled = newMatches.find((m) => m.id === matchId)!;
        const newPredictions = get().predictions.map((p) =>
          p.match_id === matchId ? { ...p, points_earned: scoreMatch(settled, p) } : p,
        );
        set({ matches: newMatches, predictions: newPredictions });
        get().recomputeStandings();
      },
      recomputeStandings: () => {
        const preds = get().predictions;
        // Por (user, match) usar o MELHOR slot.
        const bestByUserMatch = new Map<string, number>();
        for (const p of preds) {
          const key = `${p.user_id}|${p.match_id}`;
          const cur = bestByUserMatch.get(key) ?? 0;
          if (p.points_earned > cur) bestByUserMatch.set(key, p.points_earned);
        }
        const totals = new Map<string, number>();
        for (const [key, pts] of bestByUserMatch) {
          const uid = key.split("|")[0];
          totals.set(uid, (totals.get(uid) ?? 0) + pts);
        }
        set({
          members: get().members.map((m) => ({
            ...m,
            total_points: totals.get(m.user_id) ?? m.total_points,
          })),
        });
      },
      toggleMemberPaid: (memberId) => {
        set({
          members: get().members.map((m) =>
            m.id === memberId ? { ...m, has_paid_admin: !m.has_paid_admin } : m,
          ),
        });
      },
      regenerateBracket: () => {
        set({ matches: computeBracket(get().matches, get().predictions) });
      },
      matchesByPhase: (phase) => get().matches.filter((m) => m.phase === phase),
      predictionFor: (matchId) => get().predictions.find((p) => p.match_id === matchId),
      phaseProgress: (phase) => {
        const matches = get().matchesByPhase(phase);
        const filled = matches.filter((m) => {
          const p = get().predictionFor(m.id);
          return p && p.predicted_home_score !== null && p.predicted_away_score !== null;
        }).length;
        return { filled, total: matches.length };
      },
      unlockedPhases: () => {
        const unlocked: MatchPhase[] = ["grupos"];
        for (let i = 1; i < PHASE_ORDER.length; i++) {
          const prev = PHASE_ORDER[i - 1];
          const { filled, total } = get().phaseProgress(prev);
          if (total > 0 && filled === total) unlocked.push(PHASE_ORDER[i]);
          else break;
        }
        return unlocked;
      },
    }),
    {
      name: "officecup-2026",
      partialize: (s) => ({
        predictions: s.predictions,
        members: s.members,
        theme: s.theme,
        isAdmin: s.isAdmin,
      }),
    },
  ),
);