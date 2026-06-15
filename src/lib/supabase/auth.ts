import { supabase } from "./client";
import type { AuthUser } from "@/store/auth-store";
import { ADMIN_EMAIL } from "@/lib/db/config";

function isAdmin(email: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

async function checkLeagueAdmin(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("leagues")
      .select("id")
      .eq("admin_id", userId)
      .limit(1)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export async function signUp(email: string, password: string, fullName: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Erro ao criar conta");

  const userId = data.user.id;
  const leagueAdmin = await checkLeagueAdmin(userId);

  return {
    id: userId,
    email: data.user.email ?? email,
    full_name: fullName,
    is_admin: isAdmin(email) || leagueAdmin,
  };
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error("E-mail ou senha inválidos");

  const user = data.user!;
  const meta = user?.user_metadata;
  const userId = user.id;
  const leagueAdmin = await checkLeagueAdmin(userId);

  return {
    id: userId,
    email: user.email ?? email,
    full_name: (meta?.full_name as string) ?? email.split("@")[0],
    is_admin: isAdmin(email) || leagueAdmin,
  };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Erro ao sair", error);
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;

  const meta = data.session.user.user_metadata;
  const email = data.session.user.email ?? "";
  const userId = data.session.user.id;
  const leagueAdmin = await checkLeagueAdmin(userId);

  return {
    id: userId,
    email,
    full_name: (meta?.full_name as string) ?? email.split("@")[0] ?? "",
    is_admin: isAdmin(email) || leagueAdmin,
  };
}
