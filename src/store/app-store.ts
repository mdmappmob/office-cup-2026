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
import { computeBracket as computeOfficialBracket, computeBracketFromResults } from "@/lib/bracket";

export const MAX_EXTRA_SLOTS = 0;
export const LOCK_TIME_MINUTES = 10;

interface AppState {
  currentUserId: string;
  currentLeagueId: string;
  isAdmin: boolean;
  matches: MockMatch[];
  predictions: MockPrediction[];
  members: MockLeagueMember[];
  profiles: Record<string, string>;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
  setAdmin: (v: boolean) => void;
  setCurrentUser: (userId: string, isAdmin: boolean) => void;
  upsertPrediction: (matchId: string, patch: Partial<MockPrediction>, slot?: number) => void;
  addPredictionSlot: (matchId: string) => MockPrediction | null;
  removePrediction: (predictionId: string) => void;
  predictionsForMatch: (matchId: string, userId?: string) => MockPrediction[];
  settleMatch: (
    matchId: string,
    homeScore: number,
    awayScore: number,
  ) => Promise<{ ok: boolean; count?: number; error?: string }>;
  toggleMemberPaid: (memberId: string) => void;
  unlockedPhases: () => MatchPhase[];
  matchesByPhase: (phase: MatchPhase) => MockMatch[];
  predictionFor: (matchId: string) => MockPrediction | undefined;
  phaseProgress: (phase: MatchPhase) => { filled: number; total: number };
  phaseSettleProgress: (phase: MatchPhase) => { settled: number; total: number };
  isPhaseFullySettled: (phase: MatchPhase) => boolean;
  regenerateBracket: () => void;
  onPhaseCompleted: (completedPhase: MatchPhase) => void;
  clearFuturePhasePredictions: (completedPhase: MatchPhase) => void;
  recomputeStandings: () => void;
  recalculateAllScores: () => void;
  isPhaseExpired: (phase: MatchPhase) => boolean;
  getPhaseFirstMatchDate: (phase: MatchPhase) => string | null;
  isMatchTimeLocked: (match: MockMatch) => boolean;
  loadFromSupabase: () => Promise<void>;
  loadProfiles: () => Promise<void>;
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

function computeBracketFromMatches(matches: MockMatch[]): MockMatch[] {
  return computeBracketFromResults(matches);
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
      profiles: {},
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
        if (match && get().isMatchTimeLocked(match)) return;
        const userId = get().currentUserId;
        const existing = get().predictions.find(
          (p) => p.match_id === matchId && p.user_id === userId && p.slot === slot,
        );
        const merged: MockPrediction = existing
          ? { ...existing, ...patch }
          : { ...makeEmptyPrediction(matchId, slot, userId), ...patch };
        const others = get().predictions.filter((p) => p.id !== merged.id);
        const newPredictions = [...others, merged];
        set({ predictions: newPredictions });
        get().syncPredictionsToSupabase();
      },
      addPredictionSlot: () => null,
      removePrediction: (predictionId) => {
        set({ predictions: get().predictions.filter((p) => p.id !== predictionId) });
      },
      predictionsForMatch: (matchId, userId) => {
        const uid = userId ?? get().currentUserId;
        return get()
          .predictions.filter((p) => p.match_id === matchId && p.user_id === uid)
          .sort((a, b) => a.slot - b.slot);
      },
      settleMatch: async (matchId, homeScore, awayScore) => {
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
        get().regenerateBracket();
        get().syncPredictionsToSupabase();
        const result = await settleAllPredictions({
          data: {
            matchId,
            homeScore,
            awayScore,
            homeTeam: settled.home_team,
            awayTeam: settled.away_team,
            homeFlag: settled.home_flag,
            awayFlag: settled.away_flag,
            matchDate: settled.match_date,
            venueTz: settled.venue_tz ?? null,
            phase: settled.phase,
            group: settled.group ?? null,
            status: "finished",
            bracketSlot: settled.bracket_slot ?? null,
          },
        });
        if (!result.ok) {
          console.warn("Erro ao settle remoto:", result.error);
        }
        // Check if the entire phase is now settled
        if (get().isPhaseFullySettled(settled.phase)) {
          get().onPhaseCompleted(settled.phase);
        }
        return result;
      },
      loadFromSupabase: async () => {
        const userId = get().currentUserId;
        if (!userId) return;
        try {
          const leagueId = get().currentLeagueId;
          const [remotePredictions, remoteMembers, remoteMatches] = await Promise.all([
            predictionsApi.fetchPredictions(userId),
            membersApi.fetchMembers(leagueId),
            supabase
              .from("matches")
              .select("id, home_score, away_score, status")
              .neq("status", "scheduled"),
          ]);

          // Merge remote match results into local matches
          if (remoteMatches.data && remoteMatches.data.length > 0) {
            const mergedMatches = get().matches.map((m) => {
              const remote = remoteMatches.data.find((r) => r.id === m.id);
              if (
                remote &&
                remote.status === "finished" &&
                remote.home_score != null &&
                remote.away_score != null
              ) {
                return {
                  ...m,
                  home_score: remote.home_score,
                  away_score: remote.away_score,
                  status: "finished" as const,
                };
              }
              return m;
            });
            set({ matches: mergedMatches });
            get().regenerateBracket();
          }

          const merged = [...get().predictions];

          // Merge current user's predictions (anon key)
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
            set({ members: mergedMembers });
          }

          // Fetch ALL members' predictions via server fn (service role)
          // so phase ranking shows correct points for every user
          if (remoteMembers.length > 0) {
            const memberIds = remoteMembers.map((m) => m.user_id);
            try {
              const { fetchAllLeaguePredictions } =
                await import("@/lib/supabase/fetch-all-predictions.server");
              const allRemote = await fetchAllLeaguePredictions({
                data: { memberUserIds: memberIds },
              });
              for (const rp of allRemote) {
                const idx = merged.findIndex(
                  (lp) =>
                    lp.match_id === rp.match_id && lp.user_id === rp.user_id && lp.slot === rp.slot,
                );
                const entry = {
                  id: rp.id,
                  user_id: rp.user_id,
                  league_id: rp.league_id,
                  match_id: rp.match_id,
                  slot: rp.slot,
                  predicted_home_score: rp.predicted_home_score,
                  predicted_away_score: rp.predicted_away_score,
                  predicted_home_lineup: [],
                  predicted_away_lineup: [],
                  predicted_goalscorers: rp.predicted_goalscorers ?? [],
                  is_zebra: rp.is_zebra,
                  points_earned: rp.points_earned,
                };
                if (idx >= 0) {
                  merged[idx] = entry;
                } else {
                  merged.push(entry);
                }
              }
            } catch (err) {
              console.warn("Erro ao buscar predictions de todos os membros", err);
            }
          }

          // (filtro removido — todas as fases estão liberadas)

          set({ predictions: merged });
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
          get().loadProfiles();

          // Backfill match results to Supabase (admin only, one-time)
          if (get().isAdmin) {
            const finishedMatches = get().matches.filter(
              (m) => m.home_score != null && m.away_score != null && m.status === "finished",
            );
            if (finishedMatches.length > 0) {
              const { backfillMatchResults } =
                await import("@/lib/supabase/backfill-matches.server");
              backfillMatchResults({
                data: {
                  matches: finishedMatches.map((m) => ({
                    id: m.id,
                    home_team: m.home_team,
                    away_team: m.away_team,
                    home_flag: m.home_flag,
                    away_flag: m.away_flag,
                    match_date: m.match_date,
                    venue_tz: m.venue_tz ?? null,
                    phase: m.phase,
                    group: m.group ?? null,
                    home_score: m.home_score!,
                    away_score: m.away_score!,
                    status: "finished",
                    bracket_slot: m.bracket_slot ?? null,
                  })),
                },
              }).catch(console.warn);
            }
          }
        } catch (err) {
          console.warn("Erro ao carregar dados do Supabase", err);
        }
      },
      loadProfiles: async () => {
        try {
          const uids = [
            ...new Set(
              get()
                .members.map((m) => m.user_id)
                .filter(Boolean),
            ),
          ];
          if (uids.length === 0) return;
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const res = await fetch(
            `${supabaseUrl}/rest/v1/profiles?select=id,full_name,email&id=in.(${uids.map((id) => `"${id}"`).join(",")})`,
            { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
          );
          if (!res.ok) return;
          const data: Array<{ id: string; full_name: string | null; email?: string | null }> =
            await res.json();
          const map: Record<string, string> = {};
          for (const p of data ?? []) {
            map[p.id] = p.full_name ?? p.email ?? p.id.slice(0, 8);
          }
          // Ensure every member has at least a placeholder
          for (const uid of uids) {
            if (!map[uid]) map[uid] = uid.slice(0, 8);
          }
          set({ profiles: map });
        } catch {
          /* ignore */
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
            await predictionsApi.upsertPrediction(
              userId,
              p.match_id,
              p.slot,
              {
                predicted_home_score: p.predicted_home_score,
                predicted_away_score: p.predicted_away_score,
                predicted_goalscorers: p.predicted_goalscorers,
                points_earned: p.points_earned,
                is_zebra: p.is_zebra,
              },
              p.league_id,
            );
          } catch (err) {
            console.warn("Erro ao sincronizar palpite", p.match_id, err);
          }
        }
      },
      syncMembersToSupabase: async () => {
        const all = get().members;
        if (all.length === 0) return;
        // Sync ALL members (incl. has_paid_admin) via service role
        const { syncAllMembers } = await import("@/lib/supabase/sync-members.server");
        await syncAllMembers({
          data: {
            members: all.map((m) => ({
              user_id: m.user_id,
              league_id: m.league_id,
              has_paid_admin: m.has_paid_admin,
              total_points: m.total_points,
            })),
          },
        }).catch(console.warn);
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
      clearFuturePhasePredictions: (completedPhase) => {
        const completedIdx = PHASE_ORDER.indexOf(completedPhase);
        if (completedIdx === -1) return;
        const futurePhases = new Set(PHASE_ORDER.slice(completedIdx + 1));
        const futureMatchIds = new Set(
          get()
            .matches.filter((m) => futurePhases.has(m.phase))
            .map((m) => m.id),
        );
        set({ predictions: get().predictions.filter((p) => !futureMatchIds.has(p.match_id)) });
        // Also clear from Supabase
        get().syncPredictionsToSupabase();
      },
      onPhaseCompleted: (completedPhase) => {
        // 1. Clear predictions for future phases
        get().clearFuturePhasePredictions(completedPhase);
        // 2. Recalculate bracket from actual results
        get().regenerateBracket();
        // 3. Reset teams for R32 if completing grupos (they'll be populated by regenerateBracket)
      },
      regenerateBracket: () => {
        set({ matches: computeBracketFromMatches(get().matches) });
      },
      matchesByPhase: (phase) => get().matches.filter((m) => m.phase === phase),
      predictionFor: (matchId) => get().predictions.find((p) => p.match_id === matchId),
      phaseSettleProgress: (phase) => {
        const phaseMatches = get().matchesByPhase(phase);
        const settled = phaseMatches.filter((m) => m.status === "finished").length;
        return { settled, total: phaseMatches.length };
      },
      isPhaseFullySettled: (phase) => {
        const { settled, total } = get().phaseSettleProgress(phase);
        return total > 0 && settled === total;
      },
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
      isMatchTimeLocked: (match) => {
        if (match.status === "finished") return true;
        const matchStart = new Date(match.match_date).getTime();
        const lockTime = matchStart + LOCK_TIME_MINUTES * 60 * 1000;
        return Date.now() >= lockTime;
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
      },
      unlockedPhases: () => {
        const unlocked: MatchPhase[] = [];
        for (const phase of PHASE_ORDER) {
          unlocked.push(phase);
          if (!get().isPhaseFullySettled(phase)) break;
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
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Record<string, unknown>),
        matches: current.matches,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.regenerateBracket();
          state.recalculateAllScores();
        }
      },
    },
  ),
);
