import { useQuery } from "@tanstack/react-query";
import { sessionQueryKeys } from "./session-query-keys";
import { getCurrentSession } from "./session-api";

export function useSession() {
  return useQuery({
    queryKey: sessionQueryKeys.current(),
    queryFn: getCurrentSession,
    staleTime: 5 * 60 * 1000,
  });
}
