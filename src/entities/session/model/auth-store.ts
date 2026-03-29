import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tokenStorage } from "@/shared/lib";

interface AuthState {
  isAuthenticated: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,

      login: (tokens) => {
        tokenStorage.setTokens(tokens);
        set({ isAuthenticated: true });
      },

      logout: () => {
        tokenStorage.clearTokens();
        set({ isAuthenticated: false });
      },
    }),
    { name: "auth-storage" },
  ),
);

// api-client의 토큰 리프레시 실패 시 tokenStorage.clearTokens()가 호출되면
// 이 구독을 통해 isAuthenticated 상태가 자동으로 false로 동기화됨
tokenStorage.subscribe(() => {
  useAuthStore.setState({ isAuthenticated: false });
});
