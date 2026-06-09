import { create } from "zustand";

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
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  ready: false,
  setUser: (u) => set({ user: u }),
  setReady: (b) => set({ ready: b }),
  logout: () => set({ user: null }),
}));

export function isAuthenticated(): boolean {
  return useAuthStore.getState().user !== null;
}