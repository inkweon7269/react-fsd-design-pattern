import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../model/auth-store";
import { sessionQueryKeys } from "./session-query-keys";
import { getProfile } from "./profile-api";

export function useProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: sessionQueryKeys.profile(),
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });
}
