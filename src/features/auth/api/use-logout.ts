import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { apiClient } from "@/shared/api";
import { tokenStorage } from "@/shared/lib";

function logout(): Promise<void> {
  return apiClient<void>("/auth/logout", { method: "POST" });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      tokenStorage.clearTokens();
      queryClient.clear();
      navigate({ to: "/" });
    },
  });
}
