import { create } from "zustand";
import { findUserByEmail, findUserById, readSession, writeSession } from "@/lib/db/sqlite-repo";
import { useAppStore } from "@/store/app-store";
import * as supabaseAuth from "@/lib/supabase/auth";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
}

interface AuthState {
  user: AuthUser | null;
  ready: boolean;
  setUser: (u: AuthUser | null) => void;
  setReady: (b: boolean) => void;
  signup: (email: string, password: string, fullName: string) => Promise<AuthUser>;
  login: (email: string, password: string) => Promise<AuthUser>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

function commitUser(set: (s: Partial<AuthState>) => void, user: AuthUser | null) {
  set({ user });
  if (user) {
    writeSession(user.id);
    useAppStore.getState().setCurrentUser(user.id, user.is_admin);
  } else {
    writeSession(null);
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  ready: false,
  setUser: (u) => commitUser(set, u),
  setReady: (b) => set({ ready: b }),
  signup: async (email, password, fullName) => {
    const u = await supabaseAuth.signUp(email, password, fullName);
    commitUser(set, u);
    return u;
  },
  login: async (email, password) => {
    try {
      const u = await supabaseAuth.signIn(email, password);
      commitUser(set, u);
      return u;
    } catch {
      const found = await findUserByEmail(email);
      if (!found) throw new Error("E-mail ou senha inválidos");
      const { verifyPassword } = await import("@/lib/db/sqlite-repo");
      const ok = await verifyPassword(password, found.password_hash);
      if (!ok) throw new Error("E-mail ou senha inválidos");
      commitUser(set, found.user);
      return found.user;
    }
  },
  resetPassword: async (_email, _newPassword) => {
    throw new Error("Redefinição de senha disponível no painel do Supabase");
  },
  logout: async () => {
    await supabaseAuth.signOut();
    commitUser(set, null);
  },
}));

export function isAuthenticated(): boolean {
  return useAuthStore.getState().user !== null;
}

export async function restoreSession(): Promise<void> {
  const supabaseUser = await supabaseAuth.getSessionUser();
  if (supabaseUser) {
    useAuthStore.setState({ user: supabaseUser });
    useAppStore.getState().setCurrentUser(supabaseUser.id, supabaseUser.is_admin);
    return;
  }
  const id = readSession();
  if (!id) return;
  const u = await findUserById(id);
  if (u) {
    useAuthStore.setState({ user: u });
    useAppStore.getState().setCurrentUser(u.id, u.is_admin);
  } else {
    writeSession(null);
  }
}
