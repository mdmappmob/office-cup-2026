import type { MockMatch, MockPrediction, MatchPhase } from "@/mocks/types";
import { useAppStore } from "@/store/app-store";
import { supabase } from "@/integrations/supabase/client";
import { hydrateAppData } from "@/integrations/supabase/sync";

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

function isLocalId(id: string) {
  return id.startsWith("p-");
}

async function syncPrediction(matchId: string, slot: number) {
  const uid = useAppStore.getState().currentUserId;
  const local = useAppStore
    .getState()
    .predictions.find((p) => p.match_id === matchId && p.user_id === uid && p.slot === slot);
  if (!local) return;
  if (local.predicted_home_score === null || local.predicted_away_score === null) return;

  if (isLocalId(local.id)) {
    const { data, error } = await supabase
      .from("oc_predictions")
      .insert({
        user_id: uid,
        match_id: matchId,
        slot,
        predicted_home_score: local.predicted_home_score,
        predicted_away_score: local.predicted_away_score,
        is_zebra: local.is_zebra,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[supabase] insert prediction", error);
      return;
    }
    // replace local synthetic id with real uuid
    useAppStore.setState({
      predictions: useAppStore
        .getState()
        .predictions.map((p) => (p.id === local.id ? { ...p, id: data.id } : p)),
    });
  } else {
    const { error } = await supabase
      .from("oc_predictions")
      .update({
        predicted_home_score: local.predicted_home_score,
        predicted_away_score: local.predicted_away_score,
        is_zebra: local.is_zebra,
      })
      .eq("id", local.id);
    if (error) console.error("[supabase] update prediction", error);
  }
}

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
    void syncPrediction(matchId, slot);
  },
  removePrediction: (predictionId: string) => {
    useAppStore.getState().removePrediction(predictionId);
    if (!isLocalId(predictionId)) {
      void supabase.from("oc_predictions").delete().eq("id", predictionId);
    }
  },
  settleMatch: (matchId, homeScore, awayScore) => {
    useAppStore.getState().settleMatch(matchId, homeScore, awayScore);
    void (async () => {
      const { error } = await supabase.rpc("oc_settle_match", {
        _match_id: matchId,
        _home: homeScore,
        _away: awayScore,
      });
      if (error) console.error("[supabase] settle_match", error);
      else await hydrateAppData();
    })();
  },
};