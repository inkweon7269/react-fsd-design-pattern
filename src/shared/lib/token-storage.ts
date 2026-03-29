import Cookies from "js-cookie";

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

const COOKIE_OPTIONS: Cookies.CookieAttributes = {
  expires: 7,
  path: "/",
  sameSite: "strict",
  secure: window.location.protocol === "https:",
};

// 토큰 변경 구독자 목록
// clearTokens() 호출 시 등록된 리스너에 알림 → auth-store가 localStorage의 isAuthenticated를 false로 동기화
type Listener = () => void;
const listeners = new Set<Listener>();

export const tokenStorage = {
  getAccessToken(): string | null {
    return Cookies.get(ACCESS_TOKEN_KEY) ?? null;
  },

  getRefreshToken(): string | null {
    return Cookies.get(REFRESH_TOKEN_KEY) ?? null;
  },

  setTokens(tokens: { accessToken: string; refreshToken: string }): void {
    Cookies.set(ACCESS_TOKEN_KEY, tokens.accessToken, COOKIE_OPTIONS);
    Cookies.set(REFRESH_TOKEN_KEY, tokens.refreshToken, COOKIE_OPTIONS);
  },

  clearTokens(): void {
    Cookies.remove(ACCESS_TOKEN_KEY, { path: "/" });
    Cookies.remove(REFRESH_TOKEN_KEY, { path: "/" });
    listeners.forEach((fn) => fn()); // 구독자에게 토큰 삭제 알림
  },

  isAuthenticated(): boolean {
    return !!Cookies.get(ACCESS_TOKEN_KEY);
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
