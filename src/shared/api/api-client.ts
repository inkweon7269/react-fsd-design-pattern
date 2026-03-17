import { env } from "@/shared/config";
import { tokenStorage } from "@/shared/lib";
import type { AuthTokens } from "@/shared/types";
import { ApiError } from "./api-error";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
};

export function buildUrl(
  path: string,
  params?: RequestOptions["params"],
): string {
  const url = new URL(`${env.API_BASE_URL}${path}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      tokenStorage.clearTokens();
      return false;
    }
    const refreshTokenAtStart = refreshToken;

    try {
      const url = buildUrl("/auth/refresh");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          tokenStorage.clearTokens();
        }
        return false;
      }

      const tokens: AuthTokens = await response.json();
      if (tokenStorage.getRefreshToken() !== refreshTokenAtStart) {
        return false;
      }
      tokenStorage.setTokens(tokens);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function buildHeaders(
  body: unknown,
  headers: Record<string, string> | undefined,
  token: string | null,
): Record<string, string> {
  const h: Record<string, string> = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...headers,
  };
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorMessage = await response.text().catch(() => undefined);
    throw new ApiError(response.status, response.statusText, errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, params, headers } = options;

  const url = buildUrl(path, params);
  const accessToken = tokenStorage.getAccessToken();
  const requestHeaders = buildHeaders(body, headers, accessToken);
  const fetchOptions = {
    method,
    headers: requestHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(url, fetchOptions);

  const hasRefreshToken = Boolean(tokenStorage.getRefreshToken());
  const SKIP_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];
  const isAuthEndpoint = SKIP_REFRESH_PATHS.includes(path);

  if (response.status === 401 && hasRefreshToken && !isAuthEndpoint) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      const newToken = tokenStorage.getAccessToken();
      const retryHeaders = buildHeaders(body, headers, newToken);
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers: retryHeaders,
      });
      return handleResponse<T>(retryResponse);
    }
  }

  return handleResponse<T>(response);
}
