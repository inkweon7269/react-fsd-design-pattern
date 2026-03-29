import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { apiClient } from "@/shared/api";
import { useAuthStore } from "@/entities/session";

function logout(): Promise<void> {
  return apiClient<void>("/auth/logout", { method: "POST" });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      useAuthStore.getState().logout();
      queryClient.clear();
      navigate({ to: "/" });
    },
  });
}
