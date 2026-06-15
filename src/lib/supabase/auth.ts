import { supabase } from "./client";
import type { AuthUser } from "@/store/auth-store";
import { ADMIN_EMAIL } from "@/lib/db/config";

function isAdmin(email: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

export async function signUp(email: string, password: string, fullName: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Erro ao criar conta");

  return {
    id: data.user.id,
    email: data.user.email ?? email,
    full_name: fullName,
    is_admin: isAdmin(email),
  };
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error("E-mail ou senha inválidos");

  const meta = data.user?.user_metadata;
  return {
    id: data.user!.id,
    email: data.user!.email ?? email,
    full_name: (meta?.full_name as string) ?? email.split("@")[0],
    is_admin: isAdmin(email),
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
  return {
    id: data.session.user.id,
    email,
    full_name: (meta?.full_name as string) ?? email.split("@")[0] ?? "",
    is_admin: isAdmin(email),
  };
}
