import { supabase } from "./client";

export interface LeagueRow {
  id: string;
  admin_id: string;
  name: string;
  is_active: boolean;
  payment_status: string;
  created_at: string;
}

export async function fetchLeagues(): Promise<LeagueRow[]> {
  const { data, error } = await supabase
    .from("leagues")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as LeagueRow[];
}

export async function fetchLeague(id: string): Promise<LeagueRow | null> {
  const { data, error } = await supabase.from("leagues").select("*").eq("id", id).single();

  if (error) return null;
  return data as LeagueRow;
}

export async function createLeague(id: string, adminId: string, name: string): Promise<LeagueRow> {
  const { data, error } = await supabase
    .from("leagues")
    .insert({
      id,
      admin_id: adminId,
      name,
      is_active: true,
      payment_status: "pending",
    } as never)
    .select()
    .single();

  if (error) throw error;
  return data as LeagueRow;
}
