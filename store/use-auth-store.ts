import type { User } from "@supabase/supabase-js";
import { create } from "zustand";

interface AuthState {
  user: User | null;
  /** False until the first `auth.getUser()` call resolves — guards UI flashes. */
  initialized: boolean;
  setUser: (user: User | null) => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  setUser: (user) => set({ user }),
  setInitialized: () => set({ initialized: true }),
}));
