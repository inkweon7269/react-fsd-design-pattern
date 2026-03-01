import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStorage } from "@/shared/lib";

export function useLogout() {
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    tokenStorage.clearTokens();
    queryClient.clear();
  }, [queryClient]);

  return { logout };
}
