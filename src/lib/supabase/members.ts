import { supabase } from "./client";

export interface MemberRow {
  id: string;
  league_id: string;
  user_id: string;
  has_paid_admin: boolean;
  total_points: number;
}

export async function fetchMembers(leagueId: string = "default"): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("league_id", leagueId)
    .order("total_points", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MemberRow[];
}

export async function upsertMember(
  userId: string,
  leagueId: string = "default",
  totalPoints: number = 0,
): Promise<MemberRow> {
  const { data, error } = await supabase
    .from("members")
    .upsert(
      {
        user_id: userId,
        league_id: leagueId,
        has_paid_admin: false,
        total_points: totalPoints,
      } as never,
      { onConflict: "league_id,user_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data as MemberRow;
}

export async function updateMemberPoints(
  userId: string,
  totalPoints: number,
  leagueId: string = "default",
): Promise<void> {
  const { error } = await supabase
    .from("members")
    .update({ total_points: totalPoints } as never)
    .eq("user_id", userId)
    .eq("league_id", leagueId);

  if (error) throw error;
}
