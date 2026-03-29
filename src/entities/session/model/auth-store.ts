import { create } from "zustand";
import { tokenStorage } from "@/shared/lib";

interface AuthState {
  isAuthenticated: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: tokenStorage.isAuthenticated(),

  login: (tokens) => {
    tokenStorage.setTokens(tokens);
    set({ isAuthenticated: true });
  },

  logout: () => {
    tokenStorage.clearTokens();
    set({ isAuthenticated: false });
  },

  hydrate: () => {
    set({ isAuthenticated: tokenStorage.isAuthenticated() });
  },
}));
