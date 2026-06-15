import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mockMatches } from "@/mocks/matches";
import { CURRENT_LEAGUE_ID } from "@/mocks/leagues";
import { supabase } from "@/lib/supabase/client";
import * as predictionsApi from "@/lib/supabase/predictions";
import * as membersApi from "@/lib/supabase/members";
import type { MockMatch, MockPrediction, MockLeagueMember, MatchPhase } from "@/mocks/types";
import { PHASE_ORDER } from "@/mocks/types";
import { scoreMatch } from "@/lib/scoring";
import { settleAllPredictions } from "@/lib/supabase/settle-all.server";
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
  isPhaseExpired: (phase: MatchPhase) => boolean;
  getPhaseFirstMatchDate: (phase: MatchPhase) => string | null;
  isDeadlinePassed: () => boolean;
  loadFromSupabase: () => Promise<void>;
  syncPredictionsToSupabase: () => Promise<void>;
  syncMembersToSupabase: () => Promise<void>;
}

function makeEmptyPrediction(
  matchId: string,
  slot: number = 1,
  userId: string = "",
): MockPrediction {
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
      setCurrentUser: (userId, isAdmin) => {
        set((state) => {
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
        });
        if (userId) get().loadFromSupabase();
      },
      upsertPrediction: (matchId, patch, slot = 1) => {
        const match = get().matches.find((m) => m.id === matchId);
        if (match?.status === "finished") return;
        if (get().isDeadlinePassed()) return;
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
        get().syncPredictionsToSupabase();
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
        const settled = newMatches.find((m) => m.id === matchId)!;
        const newPredictions = get().predictions.map((p) =>
          p.match_id === matchId ? { ...p, points_earned: scoreMatch(settled, p) } : p,
        );
        set({ matches: newMatches, predictions: newPredictions });
        get().recomputeStandings();
        get().syncPredictionsToSupabase();
        get().syncMembersToSupabase();
        // Recalcula pontos de TODOS os usuários no Supabase (não só do admin)
        settleAllPredictions({
          data: {
            matchId,
            homeScore,
            awayScore,
            homeTeam: settled.home_team,
            awayTeam: settled.away_team,
            homeFlag: settled.home_flag,
            awayFlag: settled.away_flag,
            matchDate: settled.match_date,
            venueTz: settled.venue_tz,
            phase: settled.phase,
            group: settled.group ?? null,
            status: "finished",
            bracketSlot: settled.bracket_slot ?? null,
          },
        }).catch((err) => console.warn("Erro ao settle remoto", err));
      },
      loadFromSupabase: async () => {
        const userId = get().currentUserId;
        if (!userId) return;
        try {
          const leagueId = get().currentLeagueId;
          const [remotePredictions, remoteMembers] = await Promise.all([
            predictionsApi.fetchPredictions(userId),
            membersApi.fetchMembers(leagueId),
          ]);
          let merged = [...get().predictions];
          for (const rp of remotePredictions) {
            const idx = merged.findIndex(
              (lp) =>
                lp.match_id === rp.match_id && lp.user_id === rp.user_id && lp.slot === rp.slot,
            );
            const entry = {
              id: rp.id,
              user_id: rp.user_id,
              league_id: idx >= 0 ? merged[idx].league_id : rp.league_id,
              match_id: rp.match_id,
              slot: rp.slot,
              predicted_home_score: rp.predicted_home_score,
              predicted_away_score: rp.predicted_away_score,
              predicted_home_lineup: [],
              predicted_away_lineup: [],
              predicted_goalscorers: rp.predicted_goalscorers,
              is_zebra: rp.is_zebra,
              points_earned: rp.points_earned,
            };
            if (idx >= 0) {
              merged[idx] = entry;
            } else {
              merged.push(entry);
            }
          }
          const mergedMembers = remoteMembers.map((rm) => ({
            id: rm.id,
            league_id: rm.league_id,
            user_id: rm.user_id,
            has_paid_admin: rm.has_paid_admin,
            total_points: rm.total_points,
          }));
          if (remoteMembers.length > 0) {
            set({ predictions: merged, members: mergedMembers });
          } else {
            set({ predictions: merged });
          }
          // Recalcular points_earned para predictions que vieram com 0
          // mas a partida já tem resultado no estado local
          const localMatches = get().matches;
          let needsRecompute = false;
          const recalculated = merged.map((p) => {
            if (p.points_earned !== 0) return p;
            const match = localMatches.find(
              (m) => m.id === p.match_id && m.status === "finished" && m.home_score != null,
            );
            if (!match) return p;
            needsRecompute = true;
            return { ...p, points_earned: scoreMatch(match, p) };
          });
          if (needsRecompute) {
            set({ predictions: recalculated });
            get().recomputeStandings();
            get().syncPredictionsToSupabase();
          }
        } catch (err) {
          console.warn("Erro ao carregar dados do Supabase", err);
        }
      },
      syncPredictionsToSupabase: async () => {
        const userId = get().currentUserId;
        if (!userId) return;
        const filled = get().predictions.filter(
          (p) =>
            p.user_id === userId &&
            (p.predicted_home_score !== null || p.predicted_away_score !== null),
        );
        if (filled.length === 0) return;
        for (const p of filled) {
          try {
            await predictionsApi.upsertPrediction(userId, p.match_id, p.slot, {
              predicted_home_score: p.predicted_home_score,
              predicted_away_score: p.predicted_away_score,
              predicted_goalscorers: p.predicted_goalscorers,
              points_earned: p.points_earned,
              is_zebra: p.is_zebra,
            }, p.league_id);
          } catch (err) {
            console.warn("Erro ao sincronizar palpite", p.match_id, err);
          }
        }
      },
      syncMembersToSupabase: async () => {
        const userId = get().currentUserId;
        if (!userId) return;
        const mine = get().members.find((m) => m.user_id === userId);
        if (!mine) return;
        try {
          await membersApi.upsertMember(mine.user_id, mine.league_id, mine.total_points);
        } catch (err) {
          console.warn("Erro ao sincronizar member", mine.user_id, err);
        }
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
        get().syncMembersToSupabase();
      },
      toggleMemberPaid: (memberId) => {
        set({
          members: get().members.map((m) =>
            m.id === memberId ? { ...m, has_paid_admin: !m.has_paid_admin } : m,
          ),
        });
        get().syncMembersToSupabase();
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
      isPhaseExpired: (phase) => {
        const firstDate = get().getPhaseFirstMatchDate(phase);
        if (!firstDate) return false;
        return Date.now() >= new Date(firstDate).getTime();
      },
      getPhaseFirstMatchDate: (phase) => {
        const phaseMatches = get().matches.filter((m) => m.phase === phase);
        if (phaseMatches.length === 0) return null;
        return phaseMatches.reduce(
          (earliest, m) => (m.match_date < earliest ? m.match_date : earliest),
          phaseMatches[0].match_date,
        );
      },
      isDeadlinePassed: () => {
        const groups = new Map<string, string[]>();
        for (const m of get().matches) {
          if (m.phase !== "grupos" || !m.group) continue;
          if (!groups.has(m.group)) groups.set(m.group, []);
          groups.get(m.group)!.push(m.match_date);
        }
        let latest = "";
        for (const dates of groups.values()) {
          dates.sort();
          const second = dates[1];
          if (second && (!latest || second > latest)) latest = second;
        }
        if (!latest) return false;
        return Date.now() >= new Date(latest).getTime();
      },
      recalculateAllScores: () => {
        const matches = get().matches;
        const predictions = get().predictions.map((p) => {
          const m = matches.find((x) => x.id === p.match_id);
          if (!m || m.home_score === null || m.away_score === null) return p;
          return { ...p, points_earned: scoreMatch(m, p) };
        });
        set({ predictions });
        get().recomputeStandings();
        get().syncPredictionsToSupabase();
        get().syncMembersToSupabase();
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
        matches: s.matches,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.predictions.length > 0) {
            state.regenerateBracket();
          }
          state.recalculateAllScores();
        }
      },
    },
  ),
);
