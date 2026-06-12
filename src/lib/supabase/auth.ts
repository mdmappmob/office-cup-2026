import { supabase } from "./client";
import type { AuthUser } from "@/store/auth-store";

export async function signUp(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Erro ao criar conta");

  const firstUser = await isFirstUser();
  const isAdmin = firstUser;

  return {
    id: data.user.id,
    email: data.user.email ?? email,
    full_name: fullName,
    is_admin: isAdmin,
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
    is_admin: !!(meta?.is_admin ?? false),
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
  return {
    id: data.session.user.id,
    email: data.session.user.email ?? "",
    full_name: (meta?.full_name as string) ?? data.session.user.email?.split("@")[0] ?? "",
    is_admin: !!(meta?.is_admin ?? false),
  };
}

async function isFirstUser(): Promise<boolean> {
  const { count, error } = await supabase
    .from("members")
    .select("*", { count: "exact", head: true });

  if (error) return false;
  return count === 0;
}
