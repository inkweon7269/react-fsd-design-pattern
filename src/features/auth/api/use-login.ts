import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { tokenStorage } from "@/shared/lib";
import { sessionQueryKeys } from "@/entities/session";
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
      tokenStorage.setTokens(tokens);
      queryClient.invalidateQueries({ queryKey: sessionQueryKeys.current() });
    },
  });
}
