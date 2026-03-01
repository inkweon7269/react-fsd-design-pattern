import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStorage } from "@/shared/lib";
import { sessionQueryKeys } from "@/entities/session";

export function useLogout() {
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    tokenStorage.clearTokens();
    queryClient.invalidateQueries({ queryKey: sessionQueryKeys.current() });
    queryClient.clear();
  }, [queryClient]);

  return { logout };
}
