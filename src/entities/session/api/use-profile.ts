import { useQuery } from "@tanstack/react-query";
import { tokenStorage } from "@/shared/lib";
import { sessionQueryKeys } from "./session-query-keys";
import { getProfile } from "./profile-api";

export function useProfile() {
  return useQuery({
    queryKey: sessionQueryKeys.profile(),
    queryFn: getProfile,
    staleTime: 5 * 60 * 1000,
    enabled: tokenStorage.isAuthenticated(),
  });
}
