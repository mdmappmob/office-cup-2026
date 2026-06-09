import { supabase } from "./client";
import { useAuthStore, type AuthUser } from "@/store/auth-store";
import { useAppStore } from "@/store/app-store";
import type { MockMatch, MockPrediction, MatchPhase } from "@/mocks/types";

async function hydrateUser(userId: string, email: string) {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("oc_profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.from("oc_user_roles").select("role").eq("user_id", userId),
  ]);
  const isAdmin = !!roles?.some((r: { role: string }) => r.role === "admin");
  const user: AuthUser = {
    id: userId,
    email,
    full_name: profile?.full_name || email.split("@")[0],
    is_admin: isAdmin,
  };
  useAuthStore.getState().setUser(user);
  useAppStore.getState().setCurrentUser(userId, isAdmin);
}

export async function hydrateAppData() {
  const [{ data: matches }, { data: preds }, { data: standings }] = await Promise.all([
    supabase.from("oc_matches").select("*").order("match_date"),
    supabase.from("oc_predictions").select("*"),
    supabase.from("oc_standings").select("*"),
  ]);
  if (matches) {
    const mapped: MockMatch[] = matches.map((m: Record<string, unknown>) => ({
      id: String(m.id),
      home_team: String(m.home_team),
      away_team: String(m.away_team),
      home_flag: String(m.home_flag ?? ""),
      away_flag: String(m.away_flag ?? ""),
      match_date: String(m.match_date),
      phase: m.phase as MatchPhase,
      group: (m.group_name as string | null) ?? undefined,
      home_score: m.home_score as number | null,
      away_score: m.away_score as number | null,
      status: m.status as MockMatch["status"],
      bracket_slot: (m.bracket_slot as string | null) ?? undefined,
    }));
    useAppStore.setState({ matches: mapped });
  }
  if (preds) {
    const mapped: MockPrediction[] = preds.map((p: Record<string, unknown>) => ({
      id: String(p.id),
      user_id: String(p.user_id),
      league_id: "default",
      match_id: String(p.match_id),
      slot: Number(p.slot ?? 1),
      predicted_home_score: p.predicted_home_score as number | null,
      predicted_away_score: p.predicted_away_score as number | null,
      predicted_home_lineup: [],
      predicted_away_lineup: [],
      predicted_goalscorers: [],
      is_zebra: !!p.is_zebra,
      points_earned: Number(p.points_earned ?? 0),
    }));
    useAppStore.setState({ predictions: mapped });
  }
  if (standings) {
    useAppStore.setState({
      members: standings.map((s: Record<string, unknown>) => ({
        id: String(s.user_id),
        league_id: "default",
        user_id: String(s.user_id),
        has_paid_admin: true,
        total_points: Number(s.total_points ?? 0),
      })),
    });
  }
}

export function initSupabaseAuthSync() {
  if (typeof window === "undefined") return () => {};
  supabase.auth.getSession().then(async ({ data }) => {
    if (data.session?.user) {
      await hydrateUser(data.session.user.id, data.session.user.email ?? "");
      await hydrateAppData();
    }
    useAuthStore.getState().setReady(true);
  });
  const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      await hydrateUser(session.user.id, session.user.email ?? "");
      await hydrateAppData();
    } else if (event === "SIGNED_OUT") {
      useAuthStore.getState().setUser(null);
      useAppStore.setState({ predictions: [], members: [] });
    } else if (event === "USER_UPDATED" && session?.user) {
      await hydrateUser(session.user.id, session.user.email ?? "");
    }
  });
  return () => sub.subscription.unsubscribe();
}