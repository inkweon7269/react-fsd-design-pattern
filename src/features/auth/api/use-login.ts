import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { sessionQueryKeys, useAuthStore } from "@/entities/session";
import type { AuthTokens } from "@/shared/types";
import type { LoginDto } from "../model/types";

function login(dto: LoginDto): Promise<AuthTokens> {
  return apiClient<AuthTokens>("/auth/login", {
    method: "POST",
    body: dto,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (tokens) => {
      useAuthStore.getState().login(tokens);
      queryClient.invalidateQueries({ queryKey: sessionQueryKeys.current() });
      queryClient.resetQueries({
        queryKey: sessionQueryKeys.profile(),
        exact: true,
      });
    },
  });
}
